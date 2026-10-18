// The browser cases (scripts/browser-cases.js) under node:test, on one driver: demo/probe.ts's
// cases in each version, every version's report against the first's, and demo/restyle.ts's check
// in each version, on pages Vite's dev server serves from scratch. measure runs it with
// node --test; it sits outside test/, so the check's runners never pick it up.
//
//   BROWSER_DRIVER    the driver, scripts/browser-<name>.js (default: pipe, the raw pipe)
//   BROWSER_SCRATCH   the directory Vite's root, config, cache, and the pages go in (default: a
//                     new one in TMPDIR, removed after)
//   BROWSER_RESULTS   a file to write every page's verdict and report to, as JSON, with the
//                     driver's name and the browser's version, for measure's rows

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { run, serve, settings, versions } from "./browser-cases.js";

const driver = process.env.BROWSER_DRIVER ?? "pipe";
const { launch } = await import(`./browser-${driver}.js`);
const owned = process.env.BROWSER_SCRATCH === undefined;
const scratch =
  process.env.BROWSER_SCRATCH ?? mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "browser."));
mkdirSync(scratch, { recursive: true });

/**
 * Every page's outcome, by module and version, as the results file records them, and the error
 * that kept the server or the browser from starting, if one did.
 */
const results = { driver, browser: null, error: null, probe: {}, restyle: {} };

describe(`browser cases, ${driver} driver`, () => {
  let server;
  let browser;
  before(async () => {
    try {
      server = await serve(scratch);
      browser = await launch(settings);
      results.browser = browser.version;
    } catch (error) {
      results.error = error.message;
      throw error;
    }
  });
  after(async () => {
    await browser?.close();
    await server?.stop();
    if (process.env.BROWSER_RESULTS) {
      writeFileSync(process.env.BROWSER_RESULTS, JSON.stringify(results, null, 2));
    }
    if (owned) rmSync(scratch, { recursive: true, force: true });
  });

  for (const version of versions) {
    test(`probe, ${version}: every case holds`, async () => {
      const outcome = await run(browser, server.origin, "probe", version);
      results.probe[version] = outcome;
      assert.match(outcome.verdict, /^ok: /, outcome.report);
    });
  }

  test(`probe: every version's report is ${versions[0]}'s`, () => {
    const [first, ...rest] = versions;
    for (const version of rest) {
      assert.equal(results.probe[version]?.report, results.probe[first]?.report, version);
    }
  });

  for (const version of versions) {
    test(`restyle, ${version}: one edit repaints both buttons`, async () => {
      const outcome = await run(browser, server.origin, "restyle", version);
      results.restyle[version] = outcome;
      assert.match(outcome.verdict, /^ok: /);
    });
  }
});
