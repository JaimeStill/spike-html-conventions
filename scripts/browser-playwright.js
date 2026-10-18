// The Playwright driver: playwright-core, the library alone, driving one engine. The package is
// never a dependency of this repository: measure installs it into its own scratch and names it
// here, and its browsers download there too. scripts/browser-cases.js names the interface every
// driver keeps: launch, open a page by URL, evaluate an expression in it, close.
//
//   PLAYWRIGHT_CORE           the installed playwright-core package's directory (required)
//   PLAYWRIGHT_BROWSERS_PATH  where its browsers are (required, so Playwright never reads or
//                             fills its default, ~/.cache/ms-playwright)
//   BROWSER_ENGINE            the browser: chromium-system, the system Chromium through
//                             executablePath; chromium-headless-shell, Playwright's Chromium
//                             Headless Shell; or firefox (default: chromium-system)

import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Each engine's browser type in playwright-core, its launch options, and, for the system
 * Chromium, shortTmp: the browser gets a TMPDIR of its own in the system's temporary directory,
 * as the raw pipe's Chromium does, removed on close. Chromium makes its singleton socket's
 * directory there, and aborts when that socket's path is longer than a socket address holds, as
 * it is under a run's TMPDIR in measure's scratch. Playwright's own profile and artifacts
 * directories stay in the driver's TMPDIR. The Headless Shell keeps no singleton.
 */
const engines = {
  "chromium-system": {
    type: "chromium",
    options: { executablePath: "/usr/bin/chromium" },
    shortTmp: true,
  },
  // Headless Chromium launches the Headless Shell unless a channel is named.
  "chromium-headless-shell": { type: "chromium", options: {} },
  firefox: { type: "firefox", options: {} },
};

/** An environment variable the driver can't run without. */
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`the Playwright driver needs ${name}`);
  return value;
};

/**
 * Launches the engine headless, with one context whose viewport, locale, and time zone are the
 * settings', and whose color scheme is light, named rather than left to Playwright's default, so
 * every page reads them as the raw pipe's pages do. Resolves to the browser.
 */
export async function launch({ lang, tz, width, height }) {
  const name = process.env.BROWSER_ENGINE ?? "chromium-system";
  const engine = engines[name];
  if (engine === undefined) throw new Error(`no engine ${name}`);
  required("PLAYWRIGHT_BROWSERS_PATH");
  const core = required("PLAYWRIGHT_CORE");
  const playwright = await import(pathToFileURL(join(core, "index.mjs")).href);
  const tmp = engine.shortTmp ? mkdtempSync(join("/tmp", "browser-playwright.")) : undefined;
  const removeTmp = () => tmp && rmSync(tmp, { recursive: true, force: true });
  const env = tmp ? { env: { ...process.env, TMPDIR: tmp } } : {};
  let browser;
  try {
    browser = await playwright[engine.type].launch({ headless: true, ...engine.options, ...env });
  } catch (error) {
    removeTmp();
    // Playwright boxes a host's missing libraries in line drawing; a row reads it as one line.
    const text = error.message.replace(/[╔╗╚╝═║]/g, " ").replace(/\s+/g, " ");
    throw new Error(`${name} didn't launch: ${text.trim()}`, { cause: error });
  }
  const context = await browser.newContext({
    viewport: { width, height },
    locale: lang,
    timezoneId: tz,
    colorScheme: "light",
  });
  return {
    version: `${engine.type} ${browser.version()} (${name})`,
    /** Opens the URL in a new page, resolving once its load event fires. */
    async open(url) {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "load" });
      return {
        /** The expression's value, awaited when it is a promise, as JSON. */
        evaluate: (expression) => page.evaluate(expression),
        close: () => page.close(),
      };
    },
    /** Closes the browser, and with it the context and its profile, and removes its TMPDIR. */
    async close() {
      await browser.close();
      removeTmp();
    },
  };
}
