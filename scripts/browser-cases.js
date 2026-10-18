// The browser cases and the servers their pages come from, shared by every driver
// (scripts/browser.test.js runs them): demo/probe.ts's cases in each version of the components
// layer, and demo/restyle.ts's check in each, one page per run, on pages Vite's dev server serves;
// and the probe alone on pages a plain http server serves from tsc's emit, unbundled.
//
// The server is the mise-pinned vite, started as scripts/preview.sh starts it: scratch is its root
// and holds its config and cache (cacheDir, node_modules/.vite by default), the config loaded
// natively, so Vite writes no bundled config beside it, and scripts/css-sheets.js gives each
// component's CSS module script its sheet. Each page loads its module and the foundation's
// baseline from the working tree itself through Vite's /@fs/ prefix, which server.fs.allow opens
// to the repository, so no tsc emit, import map, or file:// flag is needed. The pages are written
// before the server starts, so Vite's dependency scan finds Lit through them and pre-bundles it
// before the first request, and no page reloads mid-run.
//
// The unbundled server (serveUnbundled) is the form a page loads with no tool between: tsc's emit
// of the components layer and the demo's modules (tsconfig.demo.json) into scratch, with each
// .css in layers/ copied beside its module, served by node:http with each .css as text/css, so
// each component's import of it is a native CSS module script, and Lit mapped by the page's
// import map onto the installed packages, which the server serves too.
// Only the probe runs there: the restyle check's module imports the foundation's sheets itself,
// so in a browser without CSS module scripts it never loads at all.
//
// A driver keeps one interface: launch(settings) resolves to a browser with its version, an
// open(url) that resolves to a page once its load event fires, and a close(); a page has
// evaluate(expression), the expression's value awaited when it is a promise, and close().
//
// Run as a script, it prints measure's rows from a results file scripts/browser.test.js wrote:
//
//   browser-cases.js rows <results.json>
//       one row per line, its name, 1 or 0, and its observed fact, tab-separated: one per
//       version's probe, passing when all probeCases cases hold, no fewer and no more; one for
//       the reports, passing when every version's is the first's line for line; and one for the
//       restyle check, passing when it holds in every version
//   browser-cases.js unbundled <results.json>
//       one row, the same way, from the unbundled server's results, passing when every version's
//       probe holds all probeCases cases

import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, extname, join, normalize } from "node:path";

/** The root of the repository, whose demo/ and layers/ every page loads. */
const root = join(import.meta.dirname, "..");

/** Every version the probe and the restyle check run in, the first the one the others match. */
export const versions = ["lit-shadow", "vanilla-shadow", "lit-light", "vanilla-light"];

/**
 * How many cases demo/probe.ts holds in each version, as the brief promises, and the verdict a
 * probe passes on: every case holding, and exactly that many, so a probe that lost or gained a case
 * fails here and in measure's rows rather than passing on whatever number it held.
 */
export const probeCases = 27;
export const probeHolds = `ok: all ${probeCases} cases hold`;

/**
 * What every browser runs with, so a report reads the same on any machine and in any driver: the
 * language and time zone the entries format times and sizes in, and the viewport every page has,
 * which the foundation's fluid tokens read (Playwright's default viewport).
 */
export const settings = { lang: "en-US", tz: "UTC", width: 1280, height: 720 };

/** How long a page's verdict may take, once the page has loaded. */
const timeout = 60_000;

/**
 * A page that runs a demo module's run(version), the version from its query, the module and the
 * foundation's baseline under the base path given, with the head's extra markup (the unbundled
 * pages' import map). The classic script makes window.verdict, a promise settled once the run
 * returns or once the module fails to load (its error event), so a driver awaits the verdict
 * itself, never the page's load: the run's top-level await doesn't hold the load event.
 */
const page = (module, { base, ext, head = "" }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${module}</title>
<link rel="stylesheet" href="${base}/layers/foundation/baseline.css">${head}
</head><body>
<main></main>
<pre id="verdict">FAIL: the ${module} didn't run</pre>
<pre id="report"></pre>
<script>
  let settle;
  window.verdict = new Promise((resolve) => (settle = resolve));
</script>
<script type="module" onerror="settle()">
  import { run } from "${base}/demo/${module}.${ext}";
  try {
    await run(new URLSearchParams(location.search).get("version"));
  } finally {
    settle();
  }
</script>
</body></html>
`;

/** The expression a driver evaluates in a page: its verdict and report, once the run is done. */
const read = `window.verdict.then(() => ({
  verdict: document.getElementById("verdict").textContent,
  report: document.getElementById("report").textContent,
}))`;

/** A free port of the loopback address. */
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

/**
 * Writes the pages and Vite's config into scratch, starts Vite's dev server on it, and resolves
 * once it answers, to its origin and a stop() that ends it.
 */
export async function serve(scratch) {
  for (const module of ["probe", "restyle"]) {
    writeFileSync(
      join(scratch, `${module}.html`),
      page(module, { base: `/@fs${root}`, ext: "ts" }),
    );
  }
  const port = await freePort();
  const config = join(scratch, "vite.config.mjs");
  writeFileSync(
    config,
    `import { cssSheets } from ${JSON.stringify(join(root, "scripts/css-sheets.js"))};
export default {
  root: ${JSON.stringify(scratch)},
  cacheDir: ${JSON.stringify(join(scratch, "vite-cache"))},
  plugins: [cssSheets()],
  publicDir: false,
  logLevel: "warn",
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: ${port},
    strictPort: true,
    fs: { allow: [${JSON.stringify(scratch)}, ${JSON.stringify(root)}] },
  },
};
`,
  );
  const server = spawn("vite", ["--configLoader", "native", "--config", config], {
    cwd: scratch,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Vite's output, the browser's console it forwards included, kept to say why it didn't answer.
  let log = "";
  for (const stream of [server.stdout, server.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => (log = (log + chunk).slice(-2000)));
  }
  const exited = new Promise((resolve) => server.once("exit", resolve));
  // A run that ends without stopping the server, a crash or an uncaught error, still ends it.
  const orphan = () => server.kill();
  process.once("exit", orphan);
  const origin = `http://127.0.0.1:${port}`;
  const stop = async () => {
    process.off("exit", orphan);
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await exited;
    }
  };
  for (let i = 0; i < 300; i++) {
    if (server.exitCode !== null) break;
    const answered = await fetch(`${origin}/probe.html`).then(
      (response) => response.ok,
      () => false,
    );
    if (answered) return { origin, stop };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await stop();
  throw new Error(`Vite's dev server didn't answer at ${origin}: ${log.trim()}`);
}

/** Each type the unbundled server serves, by extension; any other file isn't served. */
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

/**
 * Emits the components layer and the demo's modules with tsc into scratch, copies each .css in
 * layers/ beside them, writes the probe's page with an import map for Lit, and serves scratch
 * over plain http on the loopback address, with Lit's installed packages under /deps/. Resolves
 * to its origin and a stop() that ends it.
 */
export async function serveUnbundled(scratch) {
  const out = join(scratch, "tsc");
  const emit = spawnSync("tsc", ["-p", join(root, "tsconfig.demo.json"), "--outDir", out], {
    encoding: "utf8",
  });
  if (emit.status !== 0) {
    throw new Error(
      `tsc couldn't emit: ${(emit.error?.message ?? emit.stdout + emit.stderr).trim()}`,
    );
  }
  for (const entry of readdirSync(join(root, "layers"), { recursive: true })) {
    if (!entry.endsWith(".css")) continue;
    mkdirSync(join(out, "layers", dirname(entry)), { recursive: true });
    copyFileSync(join(root, "layers", entry), join(out, "layers", entry));
  }
  // Lit's packages sit beside lit itself, in lit's .pnpm directory, as scripts/demo.sh maps them.
  const deps = dirname(realpathSync(join(root, "node_modules/lit")));
  const imports = {
    lit: "/deps/lit/index.js",
    "lit/": "/deps/lit/",
    "lit-html": "/deps/lit-html/lit-html.js",
    "lit-html/": "/deps/lit-html/",
    "lit-element/": "/deps/lit-element/",
    "@lit/reactive-element": "/deps/@lit/reactive-element/reactive-element.js",
    "@lit/reactive-element/": "/deps/@lit/reactive-element/",
  };
  const head = `\n<script type="importmap">${JSON.stringify({ imports })}</script>`;
  writeFileSync(join(scratch, "probe.html"), page("probe", { base: "/tsc", ext: "js", head }));

  const server = createHttpServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://host").pathname));
    const file = path.startsWith("/deps/")
      ? join(deps, path.slice("/deps/".length))
      : join(scratch, path);
    const type = types[extname(file)];
    let body;
    try {
      if (type !== undefined) body = readFileSync(file);
    } catch {
      // A missing file is a 404, as is a type the server doesn't serve.
    }
    if (body === undefined) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": type }).end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Runs one demo module's page in the version, in the browser: resolves to the page's verdict and
 * report, the report empty for the restyle check, which writes a verdict alone.
 */
export async function run(browser, origin, module, version) {
  const tab = await browser.open(`${origin}/${module}.html?version=${version}`);
  let timer;
  try {
    return await Promise.race([
      tab.evaluate(read),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no verdict after ${timeout} ms`)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await tab.close();
  }
}

/** measure's rows from a results file, as the header says. */
function rows({ browser, error, probe, restyle }) {
  const ok = (outcome) => (outcome?.verdict.startsWith("ok: ") ? 1 : 0);
  const held = (outcome) => (outcome?.verdict === probeHolds ? 1 : 0);
  const verdict = (outcome) => outcome?.verdict ?? `no verdict${error ? `: ${error}` : ""}`;
  const lines = (version) => probe[version]?.report.split("\n") ?? [];
  const [first, ...rest] = versions;
  const diffs = rest.flatMap((version) => {
    const at = lines(version).findIndex((line, i) => line !== lines(first)[i]);
    const longer = lines(first).length > lines(version).length;
    if (at < 0 && !longer) return [];
    const line = at < 0 ? lines(version).length : at;
    return [`${version} differs at line ${line + 1}: ${lines(version)[line] ?? "(none)"}`];
  });
  return [
    ...versions.map((version) => [
      `probe in ${version}, all ${probeCases} cases hold`,
      held(probe[version]),
      `${browser ?? "no browser"}: ${verdict(probe[version])}`,
    ]),
    [
      `every version's probe report is ${first}'s`,
      probe[first]?.report && diffs.length === 0 ? 1 : 0,
      `${lines(first).length} lines each; ${diffs.length ? diffs.join("; ") : "none differs"}`,
    ],
    [
      "restyle in every version, one edit repaints both buttons",
      versions.every((version) => ok(restyle[version])) ? 1 : 0,
      versions.map((version) => `${version}: ${verdict(restyle[version])}`).join("; "),
    ],
  ];
}

/** measure's row from the unbundled server's results. */
function unbundled({ browser, error, probe }) {
  const verdict = (version) => probe[version]?.verdict ?? `no verdict${error ? `: ${error}` : ""}`;
  const held = versions.every((version) => verdict(version) === probeHolds);
  const fact = held
    ? `${verdict(versions[0])} in each of ${versions.length} versions`
    : versions.map((version) => `${version}: ${verdict(version)}`).join("; ");
  return [
    [
      `the probe in every version, all ${probeCases} cases hold`,
      held ? 1 : 0,
      `${browser ?? "no browser"}: ${fact}`,
    ],
  ];
}

if (import.meta.main) {
  const [command, path] = process.argv.slice(2);
  const usage = "usage: browser-cases.js rows <results.json> | unbundled <results.json>";
  if (path === undefined) throw new Error(usage);
  const results = JSON.parse(readFileSync(path, "utf8"));
  let printed;
  if (command === "rows") printed = rows(results);
  else if (command === "unbundled") printed = unbundled(results);
  else throw new Error(usage);
  for (const row of printed) {
    console.log(row.map((cell) => String(cell).replace(/[\t\n]/g, " ")).join("\t"));
  }
}
