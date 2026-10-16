// The layer tree's import direction: eslint.config.js's layer rules (eslint-plugin-boundaries'
// dependencies rule with import-x's no-unresolved), run by the ESLint package.json pins against
// scratch trees outside the working tree that mirror layers/. One tree holds one violating import
// per file, a file per forbidden edge and per import form, and passes only when the files flagged
// are exactly its files; the other holds only allowed imports and passes only when it draws
// nothing, so a rule that refuses everything or nothing fails here. Each tree holds the files its
// imports name, so the rules judge the file an import resolves to, as they do in layers/.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { allowed, violations, writeTree } from "./layers-tree.js";

const root = join(import.meta.dirname, "..");
const eslint = join(root, "node_modules", ".bin", "eslint");
const rules = ["boundaries/dependencies", "import-x/no-unresolved"];

/** Writes `files` to a scratch tree, with lit linked into its node_modules so the resolver finds
 * it, and returns the files ESLint flagged with a layer rule, after checking that it linted every
 * file written under layers/. -c takes the repo's config, whose patterns then match from the
 * working directory, the scratch tree, and whose plugins load from the repo's node_modules. */
function flagged(files) {
  const scratch = mkdtempSync(join(tmpdir(), "layers-"));
  try {
    const written = writeTree(scratch, files);
    mkdirSync(join(scratch, "node_modules"));
    symlinkSync(join(root, "node_modules", "lit"), join(scratch, "node_modules", "lit"));
    const run = spawnSync(eslint, ["-c", join(root, "eslint.config.js"), "-f", "json", "layers"], {
      cwd: scratch,
      encoding: "utf8",
    });
    assert.equal(run.error, undefined, `eslint didn't run: ${run.error}`);
    assert.ok(run.status === 0 || run.status === 1, `eslint exited ${run.status}: ${run.stderr}`);
    const report = JSON.parse(run.stdout);
    assert.equal(report.length, written.filter((path) => path.startsWith("layers/")).length);
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

  test("every forbidden import draws a layer rule's diagnostic at its file", () => {
    assert.deepEqual([...flagged(violations)].sort(), Object.keys(violations).sort());
  });

  test("a tree of allowed imports draws none", () => {
    assert.deepEqual([...flagged(allowed)], []);
  });
});
