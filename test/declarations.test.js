// The SDK and the foundation's formatters are declarations alone: their signatures, checked by
// tsc, with no runtime code, until spike-html-apps implements them. The guard is tsc's own: a
// .d.ts file is an ambient context, where a statement, a function or method body, or an
// unexported initialized binding is an error (TS1036, TS1183, TS1046, TS1039), and tsconfig.json
// keeps skipLibCheck off so tsc checks every .d.ts at all; with it on, tsc skips them whole, the
// signatures and these errors with them. So the SDK's files are held to .d.ts here, and the
// repository's tsconfig is held to refusing runtime code in one, run against a scratch tree.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

const root = join(import.meta.dirname, "..");
const tsc = join(root, "node_modules", ".bin", "tsc");

/** The files tsc reports errors in, each with an error code, sorted, when it checks `files`, a map of paths
 * under a scratch layers/ to sources, under the repository's tsconfig.json. */
function check(files) {
  const scratch = mkdtempSync(join(tmpdir(), "declarations-"));
  try {
    for (const [path, source] of Object.entries(files)) {
      mkdirSync(join(scratch, "layers", path, ".."), { recursive: true });
      writeFileSync(join(scratch, "layers", path), `${source}\n`);
    }
    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.json"), include: ["layers"] }),
    );
    const run = spawnSync(tsc, ["--noEmit", "-p", "."], { cwd: scratch, encoding: "utf8" });
    assert.equal(run.error, undefined, `tsc didn't run: ${run.error}`);
    return [...run.stdout.matchAll(/^layers\/(\S+)\(\d+,\d+\): error (TS\d+)/gm)]
      .map(([, path, code]) => `${path} ${code}`)
      .sort();
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const runtime = {
  "sdk/statement.d.ts": `export interface A {}\nconsole.log("runs");`,
  "sdk/body.d.ts": `export declare function f(): number;\nexport function g(): number { return 1; }`,
  "sdk/binding.d.ts": `let count = 0;`,
  "sdk/method.d.ts": `export declare class C { m(): void { } }`,
  "foundation/format.d.ts": `export declare function formatBytes(bytes: number): string;\nformatBytes(1);`,
};

describe("SDK and formatter declarations", () => {
  test("every file in the SDK is a declaration file", () => {
    const files = readdirSync(join(root, "layers", "sdk"), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
    assert.ok(files.length > 0);
    assert.deepEqual(
      files.filter((name) => !name.endsWith(".d.ts")),
      [],
    );
  });

  test("the foundation's formatters are a declaration file", () => {
    const foundation = readdirSync(join(root, "layers", "foundation"));
    assert.ok(foundation.includes("format.d.ts"));
    assert.ok(!foundation.includes("format.ts"));
  });

  test("tsc, under tsconfig.json, refuses runtime code in a declaration file", () => {
    assert.deepEqual(check(runtime), [
      "foundation/format.d.ts TS1036",
      "sdk/binding.d.ts TS1039",
      "sdk/binding.d.ts TS1046",
      "sdk/body.d.ts TS1183",
      "sdk/method.d.ts TS1183",
      "sdk/statement.d.ts TS1036",
    ]);
  });

  test("tsc, under tsconfig.json, checks a declaration file's types", () => {
    assert.deepEqual(check({ "sdk/types.d.ts": `export type A = Missing;` }), [
      "sdk/types.d.ts TS2304",
    ]);
  });

  test("tsc accepts declarations alone", () => {
    assert.deepEqual(
      check({
        "sdk/ok.d.ts": [
          `export interface A { token(): Promise<string | undefined> }`,
          `export type B<T> = { ok: true; data: T } | { ok: false };`,
          `export declare const a: A;`,
          `export declare function f(x: number): string;`,
        ].join("\n"),
      }),
      [],
    );
  });
});
