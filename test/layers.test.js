// The layer tree's import direction: eslint.config.js's layer rules (eslint-plugin-boundaries'
// dependencies rule with import-x's no-unresolved), run by the ESLint package.json pins against
// scratch trees outside the working tree that mirror layers/. One tree holds one violating import
// per file, a file per forbidden edge and per import form, and passes only when the files the
// dependencies rule flags are exactly its files; the other holds only allowed imports and passes
// only when neither rule flags any, so a rule that refuses everything or nothing fails here. Each
// tree holds the files its imports name, so the rules judge the file an import resolves to, as
// they do in layers/; the violations are held to the dependencies rule itself, so no case passes
// on no-unresolved because its target went unwritten. A case that doesn't parse fails both tests.
//
// The same runs hold eslint.config.js's other import rule, that a .css import is a static CSS
// module script: a tree of components importing a stylesheet in each form, static and dynamic,
// with and without `with { type: "css" }`, passes only when no-restricted-syntax flags exactly the
// static files without it and every import(), with it or not.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { allowed, violations, writeTree } from "./layers-tree.js";

const root = join(import.meta.dirname, "..");
const eslint = join(root, "node_modules", ".bin", "eslint");
const dependencies = "boundaries/dependencies";
const unresolved = "import-x/no-unresolved";

/** Writes `files` to a scratch tree by `write`, with lit linked into its node_modules so the
 * resolver finds it, and returns the files ESLint flagged with any of `rules`, after checking that
 * it linted every code file written under layers/ and parsed each. -c takes the repo's config,
 * whose patterns then match from the working directory, the scratch tree, and whose plugins load
 * from the repo's node_modules. */
function flagged(files, rules, write = writeTree) {
  const scratch = mkdtempSync(join(tmpdir(), "layers-"));
  try {
    const written = write(scratch, files);
    mkdirSync(join(scratch, "node_modules"));
    symlinkSync(join(root, "node_modules", "lit"), join(scratch, "node_modules", "lit"));
    const run = spawnSync(eslint, ["-c", join(root, "eslint.config.js"), "-f", "json", "layers"], {
      cwd: scratch,
      encoding: "utf8",
    });
    assert.equal(run.error, undefined, `eslint didn't run: ${run.error}`);
    assert.ok(run.status === 0 || run.status === 1, `eslint exited ${run.status}: ${run.stderr}`);
    const report = JSON.parse(run.stdout);
    const code = written.filter((path) => path.startsWith("layers/") && /\.(js|ts)$/.test(path));
    assert.equal(report.length, code.length);
    const fatal = report.filter((file) => file.messages.some((m) => m.fatal));
    assert.deepEqual(
      fatal.map((file) => file.filePath),
      [],
      "every file parses, so each import is judged",
    );
    return new Set(
      report
        .filter((file) => file.messages.some((m) => rules.includes(m.ruleId)))
        .map((file) => file.filePath.slice(scratch.length + 1)),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe("layer import direction", () => {
  test("the eslint installed is the one package.json pins", () => {
    const pin = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).devDependencies.eslint;
    const run = spawnSync(eslint, ["--version"], { encoding: "utf8" });
    assert.equal(run.stdout.trim(), `v${pin}`);
  });

  test("every forbidden import draws the dependencies rule's diagnostic at its file", () => {
    assert.deepEqual(
      [...flagged(violations, [dependencies])].sort(),
      Object.keys(violations).sort(),
    );
  });

  test("a tree of allowed imports draws none", () => {
    assert.deepEqual([...flagged(allowed, [dependencies, unresolved])], []);
  });
});

// Each file imports the stylesheet beside it in one form; layers-tree.js's targets() reads a .css
// specifier as a directory, so this tree is written as it stands, the stylesheet with it.
const sheet = "layers/components/x.css";
const refusedCss = {
  "layers/components/side-effect.ts": `import "./x.css";`,
  "layers/components/default.ts": `import sheet from "./x.css";`,
  "layers/components/json.ts": `import sheet from "./x.css" with { type: "json" };`,
  "layers/components/export.ts": `export { default } from "./x.css";`,
  "layers/components/export-all.ts": `export * from "./x.css";`,
  "layers/components/dynamic.ts": `await import("./x.css");`,
  "layers/components/dynamic-json.ts": `await import("./x.css", { with: { type: "json" } });`,
  "layers/components/dynamic-module.ts": `await import("./x.css", { with: { type: "css" } });`,
  "layers/components/dynamic-quoted.ts": `await import("./x.css", { "with": { "type": "css" } });`,
  "layers/components/dynamic-template.ts": "await import(`./x.css`, { with: { type: 'css' } });",
  "layers/components/dynamic-computed.ts": "const name = 'x'; await import(`./${name}.css`);",
};
const cssModules = {
  "layers/components/module.ts": `import sheet from "./x.css" with { type: "css" };`,
  "layers/components/quoted.ts": `import sheet from "./x.css" with { "type": "css" };`,
  "layers/components/export-module.ts": `export { default } from "./x.css" with { type: "css" };`,
};

/** Writes `files` under `dir` as they stand, with the stylesheet they import; returns the paths. */
function writeSheets(dir, files) {
  const written = { ...files, [sheet]: ".x {}" };
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  return Object.keys(written);
}

describe("a .css import is a static CSS module script", () => {
  test("each import() of a .css file, and each static .css import without the css type, draws no-restricted-syntax, and only those", () => {
    const files = { ...refusedCss, ...cssModules };
    assert.deepEqual(
      [...flagged(files, ["no-restricted-syntax"], writeSheets)].sort(),
      Object.keys(refusedCss).sort(),
    );
  });
});

// A declaration file has no runtime, so an import that resolves to one passes only as a type
// import: eslint.config.js's last dependencies policy. Each refused file imports a declaration in
// one value form, an inline `type` specifier among them, since verbatimModuleSyntax keeps that
// import; the allowed files import the same declarations for their types alone, from an app and
// from within the declaration's own layer.
const declarationFiles = {
  "layers/sdk/api.d.ts": "export declare const x: number;\nexport interface X {}",
  "layers/foundation/format.d.ts": "export declare function formatBytes(bytes: number): string;",
};
const valueDeclarations = {
  "layers/apps/application/documents/value.ts": `import { x } from "../../../sdk/api.js";`,
  "layers/apps/application/documents/side-effect.ts": `import "../../../sdk/api.js";`,
  "layers/apps/application/documents/inline-type.ts": `import { type X } from "../../../sdk/api.js";`,
  "layers/apps/application/documents/export.ts": `export { x } from "../../../sdk/api.js";`,
  "layers/apps/application/documents/export-all.ts": `export * from "../../../sdk/api.js";`,
  "layers/apps/application/documents/dynamic.ts": `await import("../../../sdk/api.js");`,
  "layers/apps/application/documents/domains/format.ts": `import { formatBytes } from "../../../../foundation/format.js";`,
  "layers/foundation/internal.ts": `import { formatBytes } from "./format.js";`,
};
const typeDeclarations = {
  "layers/apps/application/documents/type.ts": `import type { X, x } from "../../../sdk/api.js";`,
  "layers/apps/application/documents/export-type.ts": `export type { X } from "../../../sdk/api.js";`,
  "layers/apps/application/documents/elements/typeof.ts": `import type { formatBytes } from "../../../../foundation/format.js";\nexport type Format = typeof formatBytes;`,
  "layers/foundation/internal-type.ts": `import type { formatBytes } from "./format.js";`,
};

/** Writes `files` under `dir` as they stand, with the declarations they import; returns the
 * paths. */
function writeDeclarations(dir, files) {
  const written = { ...files, ...declarationFiles };
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  return Object.keys(written);
}

// The refused files are held to the dependencies rule alone, and the whole tree to no-unresolved
// drawing nothing, so no case passes because its declaration went unresolved.
describe("a declaration file is imported for its types alone", () => {
  const files = { ...valueDeclarations, ...typeDeclarations };

  test("each value import of a .d.ts file draws the dependencies rule, and no type import does", () => {
    assert.deepEqual(
      [...flagged(files, [dependencies], writeDeclarations)].sort(),
      Object.keys(valueDeclarations).sort(),
    );
  });

  test("every import of a .d.ts file resolves", () => {
    assert.deepEqual([...flagged(files, [unresolved], writeDeclarations)], []);
  });
});
