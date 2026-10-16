// The layer tree's direction cases, as files: one tree of violations, one import per file and a
// file per forbidden edge and per import form, and one of allowed imports in the same layout.
// test/layers.test.js runs biome.json's rules over them, and scripts/measure.sh runs the same rules
// as ESLint's and oxlint's over them, so both read the cases from here. Each maps a path under the
// repository root to its source, one line or several, without the trailing newline.
//
// The linters match specifier text, never resolved files, so the imported files needn't exist.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** This package's own name, which every layer refuses. */
export const self = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
).name;

// Each file holds one import. The violating files are named for the edge they cross.
export const violations = {
  // foundation: native only, no layer and no package
  "layers/foundation/lit.ts": `import { html } from "lit";`,
  "layers/foundation/components.ts": `import "../components/badge.js";`,
  "layers/foundation/sdk-export.ts": `export { SessionController } from "../sdk/session.js";`,
  "layers/foundation/app-type.ts": `import type { Model } from "../apps/application/documents/model.js";`,
  "layers/foundation/static-dynamic.ts": `await import("../apps/static/site/main.js");`,
  "layers/foundation/self.ts": `import { define } from "${self}/layers/foundation/dom.js";`,
  // components: never the SDK or an app
  "layers/components/sdk.ts": `import { SessionController } from "../sdk/session.js";`,
  "layers/components/sdk-dynamic.ts": `const sdk = await import("../sdk/session.js");`,
  "layers/components/sdk-dir.ts": `import "../sdk";`,
  "layers/components/app-export.ts": `export * from "../apps/application/documents/main.js";`,
  "layers/components/static-type.ts": `import type { Page } from "../apps/static/site/main.js";`,
  "layers/components/nested/sdk.ts": `import "../../sdk/session.js";`,
  "layers/components/self.ts": `import "${self}";`,
  "layers/components/unnormalized.ts": `import "./x/../../foundation/dom.js";`,
  // SDK: never components or an app
  "layers/sdk/components.ts": `import { StatusBadge } from "../components/status-badge.js";`,
  "layers/sdk/components-type.ts": `import type { StatusBadge } from "../components/status-badge.js";`,
  "layers/sdk/app-dynamic.ts": `import("../apps/application/prompts/main.js").then((m) => m);`,
  "layers/sdk/static-export.ts": `export { x } from "../apps/static/site/main.js";`,
  "layers/sdk/self.ts": `import "${self}/layers/components/status-badge.js";`,
  // static-branch app: never the SDK, an application-branch app, or another app
  "layers/apps/static/site/sdk.ts": `import "../../../sdk/session.js";`,
  "layers/apps/static/site/sdk-type.ts": `import type { SessionController } from "../../../sdk/session.js";`,
  "layers/apps/static/site/application.ts": `import "../../application/documents/main.js";`,
  "layers/apps/static/site/sibling-export.ts": `export * from "../blog/main.js";`,
  "layers/apps/static/site/sibling-dynamic.ts": `await import("../blog/main.js");`,
  "layers/apps/static/site/reentry.ts": `import "../../../apps/static/blog/main.js";`,
  "layers/apps/static/site/escape.ts": `import "../../../../src/ts/router.ts";`,
  "layers/apps/static/site/pages/sibling.ts": `import "../../blog/main.js";`,
  "layers/apps/static/site/pages/sdk.ts": `import "../../../../sdk/session.js";`,
  "layers/apps/static/site/a/b/c/sibling.ts": `import "../../../../blog/main.js";`,
  "layers/apps/static/site/a/b/c/d/sdk.ts": `import "../../../../../../../sdk/session.js";`,
  "layers/apps/static/site/self.ts": `import "${self}/layers/sdk/session.js";`,
  "layers/apps/static/site/absolute.ts": `import "/layers/sdk/session.js";`,
  // the same edges by a path that isn't normalized, climbing back through a name, a . or ..
  // segment, or an empty one, which a re-allowed layer prefix would otherwise let through
  "layers/apps/static/site/dot-climb.ts": `import "./../../../sdk/session.js";`,
  "layers/apps/static/site/descend-climb.ts": `import "./x/../../../../sdk/session.js";`,
  "layers/apps/static/site/foundation-climb.ts": `import "../../../foundation/../sdk/session.js";`,
  "layers/apps/static/site/components-climb.ts": `import "../../../components/../sdk/session.js";`,
  "layers/apps/static/site/dot-segment.ts": `import "../../../foundation/./../sdk/session.js";`,
  "layers/apps/static/site/empty-segment.ts": `import "../../../foundation//../sdk/session.js";`,
  "layers/apps/static/site/percent.ts": `import "../../../foundation/%2e%2e/sdk/session.js";`,
  // ...or by the bare climb, which resolves to the branch directory's index
  "layers/apps/static/site/bare-parent.ts": `export * from "..";`,
  // application-branch app: never another app
  "layers/apps/application/documents/sibling.ts": `import { x } from "../prompts/main.js";`,
  "layers/apps/application/documents/sibling-export.ts": `export { x } from "../prompts/main.js";`,
  "layers/apps/application/documents/sibling-type.ts": `import type { X } from "../prompts/main.js";`,
  "layers/apps/application/documents/sibling-dynamic.ts": `await import("../prompts/main.js");`,
  "layers/apps/application/documents/static.ts": `import "../../static/site/main.js";`,
  "layers/apps/application/documents/reentry.ts": `import "../../../apps/application/prompts/main.js";`,
  "layers/apps/application/documents/views/sibling.ts": `import "../../prompts/main.js";`,
  "layers/apps/application/documents/a/b/sibling.ts": `import "../../../prompts/main.js";`,
  "layers/apps/application/documents/a/b/c/sibling.ts": `import "../../../../prompts/main.js";`,
  "layers/apps/application/documents/self.ts": `import "${self}/layers/apps/application/prompts/main.js";`,
  "layers/apps/application/documents/dot-climb.ts": `import "./../prompts/main.js";`,
  "layers/apps/application/documents/descend-climb.ts": `import "./x/../../../../apps/static/site/main.js";`,
  "layers/apps/application/documents/sdk-climb.ts": `import "../../../sdk/../apps/application/prompts/main.js";`,
  "layers/apps/application/documents/dots-climb.ts": `import "../../../sdk/.../../../apps/application/prompts/main.js";`,
  "layers/apps/application/documents/bare-parent.ts": `import "../";`,
  "layers/apps/application/documents/views/bare-parent.ts": `import "../..";`,
  // outside a layer directory or an app: a file there could re-export any layer
  "layers/index.ts": `export * from "./sdk/session.js";`,
  "layers/apps/static/index.ts": `export * from "../../sdk/session.js";`,
  "layers/apps/application/index.ts": `export * from "${self}/layers/apps/static/site/main.js";`,
};

// The same layout, every import one the layer may make, in each form, and normalized specifiers
// whose names hold dots, which the normalization rule must tell from . and .. segments.
export const allowed = {
  "layers/foundation/dom.ts": `export { x } from "./events.js";`,
  "layers/foundation/nested/own.ts": `import type { X } from "../dom.js";\nawait import("../../foundation/dom.js");`,
  "layers/components/badge.ts": [
    `import { html, LitElement } from "lit";`,
    `import { define } from "../foundation/dom.js";`,
    `export { x } from "./other.js";`,
  ].join("\n"),
  "layers/sdk/session.ts": [
    `import type { ReactiveController } from "lit";`,
    `import { emit } from "../foundation/dom.js";`,
    `await import("./api.js");`,
  ].join("\n"),
  "layers/apps/static/site/main.ts": [
    `import { html } from "lit";`,
    `import "../../../components/badge.js";`,
    `export { emit } from "../../../foundation/dom.js";`,
    `import type { Page } from "./pages/page.js";`,
    `await import("./pages/page.js");`,
  ].join("\n"),
  "layers/apps/static/site/pages/page.ts": `import "../main.js";\nimport "../../../../components/badge.js";`,
  "layers/apps/application/documents/main.ts": [
    `import { html } from "lit";`,
    `import "../../../components/badge.js";`,
    `import { emit } from "../../../foundation/dom.js";`,
    `import type { SessionController } from "../../../sdk/session.js";`,
    `export * from "../../../sdk";`,
    `await import("./views/list.js");`,
  ].join("\n"),
  "layers/apps/application/documents/views/list.ts": [
    `import type { Model } from "../model.js";`,
    `import "../../../../sdk/session.js";`,
    `import "../../../../components/badge.js";`,
  ].join("\n"),
  "layers/apps/application/documents/a/b/deep.ts": `import "../../main.js";\nimport "../../../../../sdk/session.js";`,
  "layers/apps/application/documents/a/b/c/deeper.ts": `import "../../../main.js";\nimport "../../../../../../foundation/dom.js";`,
  "layers/apps/application/prompts/main.ts": `import "./shell.js";\nimport "../../../sdk/session.js";`,
  "layers/components/dotted.ts": `import "./..x/y.js";\nimport "../foundation/x..y/z.js";`,
  "layers/apps/static/site/dotted.ts": [
    `import "./..x/y.js";`,
    `import "./.well-known/a.js";`,
    `import "../../../components/x..y/z.js";`,
    `import "../../../foundation/.../a.js";`,
  ].join("\n"),
};

/** Writes `files`, one of the trees above, under `dir`, each source with a trailing newline. */
export function writeTree(dir, files) {
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
}
