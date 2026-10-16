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
// refuses their outward imports, so a deeper file fails closed. A re-allowed prefix would let
// `../../../foundation/../sdk/x.js` through, so every layer also refuses a relative specifier
// that isn't normalized: one with a ., .., or empty segment after its leading ./ or ../ run. With
// no character classes in Biome's globs, a name segment is one that starts with an enumerated
// character, in brace alternation. No alias exists, and every layer refuses an absolute path and
// the package's own name.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { allowed, violations, writeTree } from "./layers-tree.js";

const root = join(import.meta.dirname, "..");
const rule = "lint/style/noRestrictedImports";

/** Writes `files` to a scratch tree with the repo's biome.json and returns the files Biome
 * flagged with the rule, after checking that it linted every one of them. */
function flagged(files) {
  const scratch = mkdtempSync(join(tmpdir(), "layers-"));
  try {
    copyFileSync(join(root, "biome.json"), join(scratch, "biome.json"));
    writeTree(scratch, files);
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
