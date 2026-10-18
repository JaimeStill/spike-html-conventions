// The layer tree's direction cases, as files: one tree of violations, one import per file and a
// file per forbidden edge and per import form, and one of allowed imports in the same layout.
// test/layers.test.js runs eslint.config.js's layer rules over them, and scripts/measure.sh runs
// those and each compared setup's rules over them, so both read the cases from here. Each maps a
// path under the repository root to its source, one line or several, without the trailing newline.
//
// The check's rule (eslint-plugin-boundaries) and measure's other resolved-file rule
// (eslint-plugin-import-x) classify the file an import resolves to, and a specifier that resolves
// to nothing fails no-unresolved, so each tree is written with the files its imports name: see
// targets below. measure's text rules (Biome, oxlint, and ESLint's no-restricted-imports) match
// the specifier's text instead.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** This package's own name, which every layer refuses. */
export const self = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
).name;

/** An edge in each of the four import forms, one file per form, each named for the edge and its
 * form: a side-effect import, a type import, a re-export, and an import(). */
function forms(base, specifier) {
  return {
    [`${base}.ts`]: `import "${specifier}";`,
    [`${base}-type.ts`]: `import type { X } from "${specifier}";`,
    [`${base}-export.ts`]: `export * from "${specifier}";`,
    [`${base}-dynamic.ts`]: `await import("${specifier}");`,
  };
}

/** An edge in the same four forms, as the lines of one file. */
function inForms(specifier) {
  return Object.values(forms("", specifier)).join("\n");
}

// The application-branch app and the static-branch app the tier cases sit in.
const app = "layers/apps/application/documents";
const site = "layers/apps/static/site";
// An application-branch app named as the static-branch app is.
const namesake = "layers/apps/application/site";

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
  "layers/apps/static/site/dot-parent.ts": `import "./..";`,
  "layers/apps/static/site/foundation-parent.ts": `import "../../../foundation/..";`,
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
  // an application-branch app's tiers, each forbidden edge in each form: no tier imports the
  // app's root or another app's tier; a view imports no root, a module no view, an element no
  // other tier and not the SDK, and domains no UI tier, no component, and not lit
  ...forms(`${app}/views/root`, "../main.js"),
  ...forms(`${app}/views/a/b/root`, "../../../main.js"),
  ...forms(`${app}/views/other-app`, "../../prompts/views/list.js"),
  ...forms(`${app}/views/other-app-modules`, "../../prompts/modules/feed.js"),
  ...forms(`${app}/modules/views`, "../views/list.js"),
  ...forms(`${app}/modules/root`, "../main.js"),
  ...forms(`${app}/modules/other-app`, "../../prompts/modules/feed.js"),
  ...forms(`${app}/modules/other-app-elements`, "../../prompts/elements/card.js"),
  ...forms(`${app}/elements/views`, "../views/list.js"),
  ...forms(`${app}/elements/modules`, "../modules/feed.js"),
  ...forms(`${app}/elements/domains`, "../domains/model.js"),
  ...forms(`${app}/elements/root`, "../main.js"),
  ...forms(`${app}/elements/sdk`, "../../../../sdk/session.js"),
  ...forms(`${app}/elements/a/sdk`, "../../../../../sdk/session.js"),
  ...forms(`${app}/elements/other-app`, "../../prompts/elements/card.js"),
  ...forms(`${app}/elements/static`, "../../../static/site/elements/hero.js"),
  ...forms(`${app}/domains/views`, "../views/list.js"),
  ...forms(`${app}/domains/modules`, "../modules/feed.js"),
  ...forms(`${app}/domains/elements`, "../elements/card.js"),
  ...forms(`${app}/domains/root`, "../main.js"),
  ...forms(`${app}/domains/components`, "../../../../components/badge.js"),
  ...forms(`${app}/domains/lit`, "lit"),
  ...forms(`${app}/domains/other-app`, "../../prompts/domains/model.js"),
  ...forms(`${app}/other-app-views`, "../prompts/views/list.js"),
  // a static-branch app's elements follow the element rules: never the app's entry, the SDK, or
  // another app's elements; and its entry imports no other app's elements
  ...forms(`${site}/elements/root`, "../main.js"),
  ...forms(`${site}/elements/sdk`, "../../../../sdk/session.js"),
  ...forms(`${site}/elements/other-app`, "../../blog/elements/hero.js"),
  ...forms(`${site}/elements/application`, "../../../application/documents/elements/card.js"),
  ...forms(`${site}/other-app-elements`, "../blog/elements/hero.js"),
  // nor does an app import another branch's app of the same name, though the two capture the same
  // directory name: an application-branch site and the static-branch site, each row of each
  ...forms(`${namesake}/static-root`, "../../static/site/main.js"),
  ...forms(`${namesake}/static-elements`, "../../static/site/elements/hero.js"),
  ...Object.assign(
    {},
    ...["views", "modules", "elements", "domains"].flatMap((tier) => [
      forms(`${namesake}/${tier}/static-root`, "../../../static/site/main.js"),
      forms(`${namesake}/${tier}/static-elements`, "../../../static/site/elements/hero.js"),
      forms(`${site}/application-${tier}`, `../../application/site/${tier}/x.js`),
      forms(`${site}/elements/application-${tier}`, `../../../application/site/${tier}/x.js`),
    ]),
  ),
  ...forms(`${site}/application-root`, "../../application/site/main.js"),
  ...forms(`${site}/elements/application-root`, "../../../application/site/main.js"),
  // outside a layer directory or an app: a file there could re-export any layer
  "layers/index.ts": `export * from "./sdk/session.js";`,
  "layers/apps/static/index.ts": `export * from "../../sdk/session.js";`,
  "layers/apps/application/index.ts": `export * from "${self}/layers/apps/static/site/main.js";`,
};

// The same layout, every import one the layer may make, in each form, with names that hold dots,
// which a rule must tell from . and .. segments.
export const allowed = {
  "layers/foundation/dom.ts": `export { x } from "./events.js";`,
  "layers/foundation/nested/own.ts": `import type { X } from "../dom.js";\nawait import("../../foundation/dom.js");`,
  "layers/foundation/nested/index.ts": `import "..";\nexport * from "./";`,
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
    `import type { Model } from "../domains/model.js";`,
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
  // An application-branch app's tiers, each permitted edge in each form, one file per edge: the
  // root imports every tier; a view its own tier, modules, elements, and domains; a module its
  // own tier, elements, and domains; an element its own tier; domains their own tier; and each
  // the layers its row names.
  [`${app}/routes.ts`]: inForms("./views/list.js"),
  [`${app}/root-modules.ts`]: inForms("./modules/feed.js"),
  [`${app}/root-elements.ts`]: inForms("./elements/card.js"),
  [`${app}/root-domains.ts`]: inForms("./domains/model.js"),
  [`${app}/views/own.ts`]: inForms("./list.js"),
  [`${app}/views/modules.ts`]: inForms("../modules/feed.js"),
  [`${app}/views/elements.ts`]: inForms("../elements/card.js"),
  [`${app}/views/domains.ts`]: inForms("../domains/model.js"),
  [`${app}/views/a/b/domains.ts`]: inForms("../../../domains/model.js"),
  [`${app}/views/sdk.ts`]: inForms("../../../../sdk/session.js"),
  [`${app}/views/components.ts`]: inForms("../../../../components/badge.js"),
  [`${app}/views/foundation.ts`]: inForms("../../../../foundation/dom.js"),
  [`${app}/views/lit.ts`]: inForms("lit"),
  [`${app}/modules/own.ts`]: inForms("./feed.js"),
  [`${app}/modules/elements.ts`]: inForms("../elements/card.js"),
  [`${app}/modules/domains.ts`]: inForms("../domains/model.js"),
  [`${app}/modules/sdk.ts`]: inForms("../../../../sdk/session.js"),
  [`${app}/modules/components.ts`]: inForms("../../../../components/badge.js"),
  [`${app}/modules/foundation.ts`]: inForms("../../../../foundation/dom.js"),
  [`${app}/modules/lit.ts`]: inForms("lit"),
  [`${app}/elements/own.ts`]: inForms("./card.js"),
  [`${app}/elements/components.ts`]: inForms("../../../../components/badge.js"),
  [`${app}/elements/foundation.ts`]: inForms("../../../../foundation/dom.js"),
  [`${app}/elements/lit.ts`]: inForms("lit"),
  [`${app}/domains/own.ts`]: inForms("./model.js"),
  [`${app}/domains/sdk.ts`]: inForms("../../../../sdk/session.js"),
  [`${app}/domains/foundation.ts`]: inForms("../../../../foundation/dom.js"),
  // A static-branch app's entry imports its elements, which import their own tier, components,
  // the foundation, and lit.
  [`${site}/elements.ts`]: inForms("./elements/hero.js"),
  [`${site}/elements/own.ts`]: inForms("./hero.js"),
  [`${site}/elements/components.ts`]: inForms("../../../../components/badge.js"),
  [`${site}/elements/foundation.ts`]: inForms("../../../../foundation/dom.js"),
  [`${site}/elements/lit.ts`]: inForms("lit"),
  // Paths that aren't normalized but reach a file the layer may import: the foundation's dom.ts,
  // and the app's own index.ts. Biome's text rules refused them by a normalization convention;
  // the direction is judged by the file an import resolves to, so they cross no layer (Results 3).
  "layers/components/unnormalized.ts": `import "./x/../../foundation/dom.js";`,
  "layers/apps/application/documents/name-parent.ts": `import "./views/..";`,
};

/** The files the relative and absolute specifiers in `files` name and `files` doesn't hold,
 * sorted, each a path under the repository root. A specifier resolves as a browser resolves it,
 * by URL against the importing file, so `%2e%2e` is a `..` segment, an empty segment is one
 * segment, and a climb past the root stops there; then a `.js` file is its `.ts` source, as
 * TypeScript maps it, and a specifier with no file extension (`..`, `./`, `../sdk`) names a
 * directory, whose `index.ts` the resolvers take. A package name (`lit`, this package's own)
 * names no file in the tree. */
export function targets(files) {
  const found = new Set();
  for (const [path, source] of Object.entries(files)) {
    for (const [, specifier] of source.matchAll(/(?:from |import |import\()"([^"]*)"/g)) {
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) continue;
      let target = decodeURI(new URL(specifier, `file:///${path}`).pathname.slice(1));
      const name = target.slice(target.lastIndexOf("/") + 1);
      if (!/\.(js|ts)$/.test(name)) target = `${target.replace(/\/$/, "")}/index.ts`;
      target = target.replace(/^\//, "").replace(/\.js$/, ".ts");
      if (!(target in files)) found.add(target);
    }
  }
  return [...found].sort();
}

/** Writes `files`, one of the trees above, under `dir`, each source with a trailing newline, and
 * each of its targets as an empty module; returns every path written. */
export function writeTree(dir, files) {
  const written = { ...files };
  for (const target of targets(files)) written[target] = "export {};";
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  return Object.keys(written);
}
