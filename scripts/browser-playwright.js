// The Playwright driver: playwright-core, the library alone, driving one engine. It is the
// repository's one devDependency that isn't lint tooling, pinned exactly in package.json, and the
// check's browser tier runs on it (mise.toml's check task) on the system Chromium and on
// Playwright's Firefox; measure runs it on Chromium Headless Shell too. scripts/browser-cases.js
// names the interface every driver keeps: launch, open a page by URL, evaluate an expression in
// it, close.
//
//   PLAYWRIGHT_BROWSERS_PATH  where Playwright's browsers are (required, so Playwright never
//                             reads or fills its default, ~/.cache/ms-playwright): mise.toml's
//                             [env] names the repository's own, which mise run install fills;
//                             measure names its scratch
//   BROWSER_ENGINE            the browser: chromium-system, the system Chromium through
//                             executablePath; chromium-headless-shell, Playwright's Chromium
//                             Headless Shell; or firefox (default: chromium-system)

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

import { chromium, firefox } from "playwright-core";

/** The system Chromium, which no install downloads. */
const systemChromium = "/usr/bin/chromium";

/**
 * Each engine's browser type in playwright-core, its launch options, the executable a launch
 * needs, checked first so a missing browser fails with what to do about it rather than
 * Playwright's advice to run npx, and, for the system Chromium, shortTmp: the browser gets a
 * TMPDIR of its own in the system's temporary directory, as the raw pipe's Chromium does,
 * removed on close. Chromium makes its singleton socket's directory there, and aborts when that
 * socket's path is longer than a socket address holds, as it is under a run's TMPDIR in
 * measure's scratch. Playwright's own profile and artifacts directories stay in the driver's
 * TMPDIR. The Headless Shell keeps no singleton.
 */
const engines = {
  "chromium-system": {
    type: chromium,
    options: { executablePath: systemChromium },
    executable: () => systemChromium,
    missing: "the system Chromium isn't installed; install the host's chromium package",
    shortTmp: true,
  },
  // Headless Chromium launches the Headless Shell unless a channel is named; only measure
  // downloads it, so Playwright's own error stands when it's missing.
  "chromium-headless-shell": { type: chromium, options: {} },
  firefox: {
    type: firefox,
    options: {},
    executable: () => firefox.executablePath(),
    missing: "Playwright's Firefox isn't downloaded; run mise run install",
  },
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
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsers) throw new Error("the Playwright driver needs PLAYWRIGHT_BROWSERS_PATH");
  const executable = engine.executable?.();
  if (executable !== undefined && !existsSync(executable)) {
    throw new Error(`${name}: ${engine.missing} (no ${executable})`);
  }
  const tmp = engine.shortTmp ? mkdtempSync(join("/tmp", "browser-playwright.")) : undefined;
  const removeTmp = () => tmp && rmSync(tmp, { recursive: true, force: true });
  const env = tmp ? { env: { ...process.env, TMPDIR: tmp } } : {};
  let browser;
  try {
    browser = await engine.type.launch({ headless: true, ...engine.options, ...env });
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
    version: `${engine.type.name()} ${browser.version()} (${name})`,
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
