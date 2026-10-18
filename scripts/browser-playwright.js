// The Playwright driver: playwright-core, the library alone, driving one engine. The package is
// never a dependency of this repository: measure installs it into its own scratch and names it
// here, and its browsers download there too. Measure runs it against the raw pipe, the check's
// driver, on the check's own browser and on Playwright's. scripts/browser-cases.js names the
// interface every driver keeps: launch, open a page by URL, evaluate an expression in it, close.
//
//   PLAYWRIGHT_CORE           the installed playwright-core package's directory (required)
//   PLAYWRIGHT_BROWSERS_PATH  where its browsers are (required, so Playwright never reads or
//                             fills its default, ~/.cache/ms-playwright)
//   BROWSER_ENGINE            the browser: chromium-pin, the check's pinned chrome-headless-shell
//                             through executablePath, at the path BROWSER_EXECUTABLE names;
//                             chromium-headless-shell, Playwright's own Chromium Headless Shell; or
//                             firefox (default: chromium-pin)

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** An environment variable the driver can't run without. */
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`the Playwright driver needs ${name}`);
  return value;
};

/**
 * Each engine's browser type in playwright-core and its launch options. The pin's executable is
 * checked first, so a missing one fails with what to do about it rather than as a failed launch;
 * Playwright's own browsers, which only measure downloads, keep Playwright's own error.
 */
const engines = {
  "chromium-pin": {
    type: "chromium",
    options: () => {
      const executablePath = required("BROWSER_EXECUTABLE");
      if (!existsSync(executablePath)) {
        throw new Error(
          `chrome-headless-shell (mise.toml's pin) isn't installed; run mise run install (no ${executablePath})`,
        );
      }
      return { executablePath };
    },
  },
  // Headless Chromium launches the Headless Shell unless a channel is named.
  "chromium-headless-shell": { type: "chromium", options: () => ({}) },
  firefox: { type: "firefox", options: () => ({}) },
};

/**
 * Launches the engine headless, with one context whose viewport, locale, and time zone are the
 * settings', and whose color scheme is light, named rather than left to Playwright's default, so
 * every page reads them as the raw pipe's pages do. Resolves to the browser.
 */
export async function launch({ lang, tz, width, height }) {
  const name = process.env.BROWSER_ENGINE ?? "chromium-pin";
  const engine = engines[name];
  if (engine === undefined) throw new Error(`no engine ${name}`);
  required("PLAYWRIGHT_BROWSERS_PATH");
  const core = required("PLAYWRIGHT_CORE");
  const options = engine.options();
  const playwright = await import(pathToFileURL(join(core, "index.mjs")).href);
  const type = playwright[engine.type];
  let browser;
  try {
    browser = await type.launch({ headless: true, ...options });
  } catch (error) {
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
    version: `${type.name()} ${browser.version()} (${name})`,
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
    /** Closes the browser, and with it the context and its profile. */
    close: () => browser.close(),
  };
}
