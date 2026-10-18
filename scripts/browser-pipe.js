// The raw pipe driver: the system Chromium, headless, driven over its DevTools protocol on a pipe
// (--remote-debugging-pipe), with no package between. Chromium reads commands on its fd 3 and
// writes replies and events on its fd 4, each message one JSON object ended by a NUL. Every page
// is a target of its own, attached with flatten, so its commands carry its session id on the one
// pipe. scripts/browser-cases.js names the interface every driver keeps: launch, open a page by
// URL, evaluate an expression in it, close.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

/** The system Chromium, as the demo and measure's other pages run it. */
const chromium = "/usr/bin/chromium";

/**
 * Launches Chromium on a profile of its own with the language and time zone given, and no name
 * resolved but the loopback address, so its background requests never leave the machine.
 * Resolves to the browser once the protocol answers. The profile is in the system's temporary
 * directory, never TMPDIR, and is Chromium's TMPDIR too, where it makes its singleton socket's
 * directory and its other temporary files, so closing removes them with it: Chromium aborts when
 * that socket's path is longer than a socket address holds, as it is under a run's TMPDIR in
 * measure's scratch.
 */
export async function launch({ lang, tz, width, height }) {
  const profile = mkdtempSync(join("/tmp", "browser-pipe."));
  const child = spawn(
    chromium,
    [
      "--headless",
      "--remote-debugging-pipe",
      `--user-data-dir=${profile}`,
      `--lang=${lang}`,
      "--no-first-run",
      "--disable-background-networking",
      "--disable-component-update",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
      "about:blank",
    ],
    {
      stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
      env: { ...process.env, TZ: tz, TMPDIR: profile },
    },
  );
  const [, , errors, commands, replies] = child.stdio;
  // Chromium's own log, kept to say why it exited, if it does.
  let log = "";
  errors.setEncoding("utf8");
  errors.on("data", (chunk) => (log = (log + chunk).slice(-2000)));

  let next = 0;
  const waiting = new Map();
  // Each event's listeners, by session id and method.
  const listeners = new Map();
  const exited = new Promise((resolve) => child.once("exit", resolve));
  // A pipe closes when Chromium exits; every command still waiting fails with its log.
  let gone = false;
  const fail = () => {
    gone = true;
    const last = log.trim().split("\n").at(-1);
    for (const { reject } of waiting.values()) reject(new Error(`Chromium exited: ${last}`));
    waiting.clear();
  };
  exited.then(fail);
  commands.on("error", fail);
  replies.on("error", fail);
  let buffer = "";
  replies.setEncoding("utf8");
  replies.on("data", (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf("\0"); end >= 0; end = buffer.indexOf("\0")) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id !== undefined) {
        const pending = waiting.get(message.id);
        waiting.delete(message.id);
        if (message.error) pending?.reject(new Error(`${message.error.message} (CDP)`));
        else pending?.resolve(message.result);
      } else {
        listeners.get(`${message.sessionId}:${message.method}`)?.(message.params);
      }
    }
  });

  /** Sends one command, resolving to its result, or rejecting with its error. */
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      waiting.set(id, { resolve, reject });
      if (gone) return fail();
      commands.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
    });

  /** The next event of the method in the session. */
  const once = (sessionId, method) =>
    new Promise((resolve) => {
      const key = `${sessionId}:${method}`;
      listeners.set(key, (params) => {
        listeners.delete(key);
        resolve(params);
      });
    });

  // A run that ends without closing the browser, a crash or an uncaught error, still ends it.
  const orphan = () => child.kill();
  process.once("exit", orphan);
  /** Ends Chromium, by Browser.close or after 5 s by a signal, and removes its profile. */
  const close = async () => {
    process.off("exit", orphan);
    if (!gone) {
      send("Browser.close").catch(() => {});
      const timer = setTimeout(() => child.kill(), 5000);
      await exited;
      clearTimeout(timer);
    }
    rmSync(profile, { recursive: true, force: true });
  };

  let product;
  try {
    ({ product } = await send("Browser.getVersion"));
  } catch (error) {
    await close();
    throw error;
  }
  return {
    version: product,
    /**
     * Opens the URL in a new page at the viewport given, in the light color scheme, resolving once
     * its load event fires. A page Target.createTarget opens in headless Chromium has no size of
     * its own until it is emulated: its window can be 0 by 0.
     */
    async open(url) {
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      await send("Page.enable", {}, sessionId);
      await send(
        "Emulation.setDeviceMetricsOverride",
        { width, height, deviceScaleFactor: 1, mobile: false },
        sessionId,
      );
      // The light color scheme, as Playwright's context emulates it, so a report reads the same
      // in both drivers whatever the system's scheme is.
      await send(
        "Emulation.setEmulatedMedia",
        { features: [{ name: "prefers-color-scheme", value: "light" }] },
        sessionId,
      );
      const loaded = once(sessionId, "Page.loadEventFired");
      const { errorText } = await send("Page.navigate", { url }, sessionId);
      if (errorText) throw new Error(`${url}: ${errorText}`);
      await loaded;
      return {
        /** The expression's value, awaited when it is a promise, as JSON. */
        async evaluate(expression) {
          const { result, exceptionDetails } = await send(
            "Runtime.evaluate",
            { expression, awaitPromise: true, returnByValue: true },
            sessionId,
          );
          if (exceptionDetails) {
            throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
          }
          return result.value;
        },
        close: () => send("Target.closeTarget", { targetId }),
      };
    },
    /** Closes the browser and removes its profile. */
    close,
  };
}
