// The Components section of scripts/measure.sh, its page and byte steps, under node. The pages
// come from the demo's own inputs: the versions from demo/versions.ts and the fixture from
// demo/documents.ts, each imported as it is, node stripping their types. Nothing here writes
// beside the repository: measure passes a scratch directory to every command that writes.
//
//   components.js pages <dir>
//       writes two pages per version into dir, the root of a scratch copy of the project, and
//       prints each page's name, one per line: pagination-<version>.html, the pagination element
//       alone, its state in attributes from the directories page of the fixture and its module the
//       page's one script; and composition-<version>.html, the pagination holding one entry per
//       item of that page, built by composition-<version>.ts as demo/probe.ts builds it, every
//       property set before the modules define the elements. A light version's pages link
//       spike-html-design's baseline from /spike-html-design/, which the light versions take their
//       control styles from; a shadow version's pages link nothing.
//   components.js responses <netlog.json> <origin>
//       prints each response from origin with a 2xx status that Chromium's NetLog recorded, from
//       the bytes it logged (--net-log-capture-mode=Everything), one per line: its share, its body
//       bytes as the browser read them, whether they hold Lit's dev-mode warning, whether they hold
//       Lit at all, and its path
//   components.js emitted <dir>
//       prints each file under dir, a vite build's output, one per line: its share, its bytes,
//       brotli bytes, the same two markers, and its path relative to dir
//   components.js brotli <path>...
//       prints each file's path and brotli bytes, one per line
//
// Brotli is quality 11 with a 24-bit window, the brotli CLI's defaults, as measure's Forms
// section computes it; node's node:zlib and bun's give the same bytes.
//
// The shares: lit, Lit's own code (under Vite's dev server, its pre-bundled dependencies in
// /node_modules/.vite/deps/; in a build, the chunk measure's config puts every lit, lit-html,
// lit-element, and @lit/* module in, under lit/); baseline, spike-html-design's baseline CSS (the
// stylesheet the light pages link; in a build, the CSS asset Vite emits for it); client, the Vite
// dev server's client, which it injects into every page it serves (/@vite/client and the env
// module it imports); and page, the rest: the page's HTML, its script, the elements' and the
// fixture's modules, and the elements' stylesheets, as the sheet modules scripts/css-sheets.js
// makes of them.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { constants, brotliCompressSync } from "node:zlib";
import { directories } from "../demo/documents.ts";
import { versions } from "../demo/versions.ts";

const [command, ...args] = process.argv.slice(2);

/** The root of the repository, whose layers/components/ holds every version's modules. */
const root = join(import.meta.dirname, "..");

/** The page sizes every composition offers, as demo/probe.ts sets them. */
const pageSizes = [3, 6, 12];

/** Lit's dev-mode warning, which only its development builds hold. */
const devMode = "Lit is in dev mode";

/**
 * The version registries each of Lit's packages pushes onto, in its development and production
 * builds alike.
 */
const litMarker = /\b(litHtmlVersions|reactiveElementVersions|litElementVersions)\b/;

/** The brotli bytes of data: quality 11, a 24-bit window. */
function brotli(data) {
  const { BROTLI_PARAM_QUALITY, BROTLI_PARAM_LGWIN, BROTLI_PARAM_SIZE_HINT } = constants;
  const params = {
    [BROTLI_PARAM_QUALITY]: 11,
    [BROTLI_PARAM_LGWIN]: 24,
    [BROTLI_PARAM_SIZE_HINT]: data.length,
  };
  return brotliCompressSync(data, { params }).length;
}

/** The two markers of data, 1 or 0 each: Lit's dev-mode warning, and Lit at all. */
function markers(data) {
  const text = data.toString("latin1");
  return [text.includes(devMode) ? 1 : 0, litMarker.test(text) ? 1 : 0];
}

/** The module that defines tag, by the components layer's naming: sl-<name> in <name>.ts. */
function module(tag) {
  const path = `layers/components/${tag.replace(/^sl-/, "")}.ts`;
  if (!existsSync(join(root, path))) throw new Error(`no module ${path} defines ${tag}`);
  return path;
}

/** Every file under dir, recursively, as paths relative to it, sorted. */
function walk(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .sort();
}

/** Where a light version's pages link spike-html-design's baseline from. */
const baseline = "/spike-html-design/baseline.css";

/** A page's HTML: its title, the baseline link for a light version, and the body given. */
function html(name, light, body) {
  const link = light ? `\n<link rel="stylesheet" href="${baseline}">` : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${name}</title>${link}
</head><body>
${body}
</body></html>
`;
}

if (command === "pages") {
  const [dir] = args;
  for (const [name, version] of Object.entries(versions)) {
    const light = name.endsWith("-light");
    const pagination = module(version.pagination);
    const entry = module(version.entry);
    const attributes = [
      `page="${directories.page}"`,
      `size="${directories.size}"`,
      `total="${directories.total}"`,
      ...(directories.more ? ["more"] : []),
      `page-sizes="${JSON.stringify(pageSizes)}"`,
    ].join(" ");
    const alone = `pagination-${name}`;
    writeFileSync(
      join(dir, `${alone}.html`),
      html(
        alone,
        light,
        `<${version.pagination} ${attributes}></${version.pagination}>
<script type="module" src="/${pagination}"></script>`,
      ),
    );
    console.log(alone);
    const composition = `composition-${name}`;
    writeFileSync(
      join(dir, `${composition}.html`),
      html(composition, light, `<script type="module" src="/${composition}.ts"></script>`),
    );
    writeFileSync(
      join(dir, `${composition}.ts`),
      `// The composition in ${name}: the pagination holding one entry per item of the fixture's
// directories page, every property set before the modules below define the elements.
import { directories } from "./demo/documents.ts";
import "./${pagination}";
import "./${entry}";

const pagination = Object.assign(document.createElement("${version.pagination}"), {
  page: directories.page ?? null,
  size: directories.size,
  total: directories.total ?? null,
  more: directories.more,
  pageSizes: ${JSON.stringify(pageSizes)},
});
for (const item of directories.items) {
  pagination.append(Object.assign(document.createElement("${version.entry}"), { item }));
}
document.body.append(pagination);
`,
    );
    console.log(composition);
  }
} else if (command === "responses") {
  const [path, origin] = args;
  const log = JSON.parse(readFileSync(path, "utf8"));
  const types = Object.fromEntries(
    Object.entries(log.constants.logEventTypes).map(([name, id]) => [id, name]),
  );
  // Each request is one NetLog source: its URL from the job's start, its status line from the
  // response headers, and its body as the filtered bytes, decoded, as the page read them.
  const requests = new Map();
  for (const event of log.events) {
    const type = types[event.type];
    const id = event.source.id;
    if (!requests.has(id)) requests.set(id, { url: "", status: "", body: [] });
    const request = requests.get(id);
    if (type === "URL_REQUEST_START_JOB" && event.params?.url) request.url = event.params.url;
    if (type === "HTTP_TRANSACTION_READ_RESPONSE_HEADERS") request.status = event.params.headers[0];
    if (type === "URL_REQUEST_JOB_FILTERED_BYTES_READ" && event.params?.bytes) {
      request.body.push(Buffer.from(event.params.bytes, "base64"));
    }
  }
  for (const { url, status, body } of requests.values()) {
    if (!url.startsWith(`${origin}/`) || !/^HTTP\/[\d.]+ 2\d\d\b/.test(status)) continue;
    const data = Buffer.concat(body);
    const { pathname } = new URL(url);
    let share = "page";
    if (pathname.startsWith("/node_modules/")) share = "lit";
    else if (pathname.startsWith("/@vite/") || pathname.includes("/vite/dist/client/")) {
      share = "client";
    } else if (pathname.startsWith("/spike-html-design/")) share = "baseline";
    console.log([share, data.length, ...markers(data), pathname].join("\t"));
  }
} else if (command === "emitted") {
  const [dir] = args;
  for (const path of walk(dir)) {
    const data = readFileSync(join(dir, path));
    let share = "page";
    if (path.startsWith("lit/")) share = "lit";
    else if (path.endsWith(".css")) share = "baseline";
    console.log([share, data.length, brotli(data), ...markers(data), path].join("\t"));
  }
} else if (command === "brotli") {
  for (const path of args) console.log(`${path}\t${brotli(readFileSync(path))}`);
} else {
  throw new Error(`unknown command ${command}; expected pages, responses, emitted, or brotli`);
}
