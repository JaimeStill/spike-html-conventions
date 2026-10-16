// The layer tree's import direction: biome.json's noRestrictedImports overrides, run by the
// pinned Biome against scratch trees outside the working tree that mirror layers/. One tree holds
// one violating import per file, a file per forbidden edge and per import form, and passes only
// when each of its files draws the rule's diagnostic; the other holds only allowed imports and
// passes only when it draws none, so a rule that refuses everything or nothing fails here.
// Biome matches specifier text, never resolved files, so the imported files needn't exist.
//
// The text decides how the overrides are written. The foundation, components, and SDK refuse a
// layer by its directory name, at any depth. An app can't: a sibling app is `../<name>`, which
// names no layer, so each app override refuses every specifier that climbs out of the app and
// re-allows only the permitted layers named from layers/, which takes one override per file
// depth. The deepest one, three directories into an app, also covers every file below it and
// refuses their outward imports, so a deeper file fails closed. No alias exists, and every
// layer refuses the package's own name.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";

const root = join(import.meta.dirname, "..");
const self = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).name;
const rule = "lint/style/noRestrictedImports";

// Each file holds one import. The violating files are named for the edge they cross.
const violations = {
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
};

// The same layout, every import one the layer may make, in each form.
const allowed = {
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
};

/** Writes `files` to a scratch tree with the repo's biome.json and returns the files Biome
 * flagged with the rule, after checking that it linted every one of them. */
function flagged(files) {
  const scratch = mkdtempSync(join(tmpdir(), "layers-"));
  try {
    copyFileSync(join(root, "biome.json"), join(scratch, "biome.json"));
    for (const [path, source] of Object.entries(files)) {
      mkdirSync(dirname(join(scratch, path)), { recursive: true });
      writeFileSync(join(scratch, path), `${source}\n`);
    }
    // The scratch tree isn't a git repository, so the config's VCS integration is off for it.
    const run = spawnSync(
      "biome",
      ["lint", "--vcs-enabled=false", "--reporter=json", "--max-diagnostics=none", "layers"],
      { cwd: scratch, encoding: "utf8" },
    );
    assert.equal(run.error, undefined, `biome didn't run: ${run.error}`);
    const report = JSON.parse(run.stdout);
    assert.equal(report.summary.unchanged + report.summary.changed, Object.keys(files).length);
    return new Set(
      report.diagnostics.filter((d) => d.category === rule).map((d) => d.location.path),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe("layer import direction", () => {
  test("the biome on PATH is the one mise.toml pins", () => {
    const pin = readFileSync(join(root, "mise.toml"), "utf8").match(/^biome = "(.+)"$/m)[1];
    const run = spawnSync("biome", ["--version"], { encoding: "utf8" });
    assert.equal(run.stdout.trim(), `Version: ${pin}`);
  });

  test("every forbidden import draws the rule's diagnostic at its file", () => {
    assert.deepEqual([...flagged(violations)].sort(), Object.keys(violations).sort());
  });

  test("a tree of allowed imports draws none", () => {
    assert.deepEqual([...flagged(allowed)], []);
  });
});
