// The lint the check runs (eslint .): @eslint/js's and typescript-eslint's recommended rules over
// the code, and the layer direction in layers/, by the file each import resolves to.
//
// The direction is eslint-plugin-boundaries' dependencies rule over the layer table below, with
// eslint-plugin-import-x's no-unresolved beside it. eslint-import-resolver-typescript resolves
// each specifier to the file it names, a .js specifier to its .ts source and a directory to its
// index.ts, and the rule judges the layer that file is in, never the specifier's text, so a path
// that climbs out and back in (./x/../../foundation/dom.js from a component) is the file it
// reaches. A package resolves into node_modules, so the only package a layer may name is one a
// policy names, lit. A specifier that resolves to nothing, the package's own name or an absolute
// path, fails no-unresolved, so no import passes by naming no file.
//
// test/layers.test.js runs this config over test/layers-tree.js's trees, and scripts/measure.sh
// runs it as setup B; scripts/lint-compare.js reads the layer table for import-x's zones.
//
// A .css import is a CSS module script, `with { type: "css" }`, everywhere: core
// no-restricted-syntax refuses one without that attribute, in an import, an export-from, or an
// import() with a literal specifier, so no .css import leans on a bundler's own CSS handling.

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const code = ["**/*.js", "**/*.ts"];

// The attribute a CSS module script carries, by its key's name or its quoted key, among a
// declaration's attributes or the properties of import()'s options, under the options object's
// own `with` key (`.options` anchors it there), matched the same two ways.
const cssType = (node) =>
  `:matches(${node}[key.name='type'], ${node}[key.value='type'])[value.value='css']`;
const cssSource = "[source.value=/\\.css$/]";
const cssImports = [
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].map((type) => ({
    selector: `${type}${cssSource}:not(:has(${cssType("ImportAttribute")}))`,
    message: "A .css import is a CSS module script: add with { type: 'css' }.",
  })),
  {
    selector: `ImportExpression${cssSource}:not(:has(ObjectExpression.options > :matches(Property[key.name='with'], Property[key.value='with']) > ObjectExpression > ${cssType("Property")}))`,
    message: "A .css import() is a CSS module script: pass { with: { type: 'css' } }.",
  },
];

// The layer table: each layer's directory and the layers it may import, "own" an app's own
// directory and "lit" the one package. No app imports another, and a file directly in layers/,
// layers/apps/, or a branch directory imports nothing.
export const layers = [
  { name: "foundation", path: "layers/foundation", may: ["foundation"] },
  { name: "components", path: "layers/components", may: ["foundation", "components", "lit"] },
  { name: "sdk", path: "layers/sdk", may: ["foundation", "sdk", "lit"] },
  { name: "static", path: "layers/apps/static/*", may: ["foundation", "components", "own", "lit"] },
  {
    name: "application",
    path: "layers/apps/application/*",
    may: ["foundation", "components", "sdk", "own", "lit"],
  },
];

// Each layer is an element by its directory, matched from the root (partialMatch false), with a
// second pattern for a file in a directory whose name starts with a dot, which micromatch's **
// never enters, so ./.well-known/ and ./..x/ stay in their layer; an app captures its directory's
// name, which its own policy names. A file directly in layers/, layers/apps/, or a branch
// directory is a "loose" element with no policy.
const elements = [
  ...layers.map(({ name, path }) => ({
    type: name,
    pattern: [path, `${path}/**/.*`],
    partialMatch: false,
    ...(path.endsWith("*") ? { capture: ["app"] } : {}),
  })),
  { type: "loose", pattern: ["layers", "layers/apps", "layers/apps/*"], partialMatch: false },
];

// The rule's default is disallow, and it checks every origin (lit is external) and local files no
// element holds: an import passes only when a policy names its target.
const policies = layers.map(({ name, may }) => ({
  from: { element: { type: name } },
  allow: {
    to: may.map((target) => {
      if (target === "lit") return { module: { origin: "external", source: "lit" } };
      if (target === "own") {
        return { element: { type: name, captured: { app: "{{from.element.captured.app}}" } } };
      }
      return { element: { type: target } };
    }),
  },
}));

export default defineConfig([
  // Build output; ESLint ignores node_modules/ at any depth itself, the fixtures' installs too.
  globalIgnores(["dist/"]),
  { files: code, extends: [js.configs.recommended, tseslint.configs.recommended] },
  { files: code, languageOptions: { globals: globals.browser } },
  { files: code, rules: { "no-restricted-syntax": ["error", ...cssImports] } },
  // The suite, the scripts, and the consumer fixtures run on node or bun.
  { files: ["test/**", "scripts/**", "fixtures/**"], languageOptions: { globals: globals.node } },
  {
    files: ["layers/**"],
    plugins: { boundaries, "import-x": importX },
    settings: {
      "import/resolver": { typescript: true },
      "import-x/resolver": { typescript: true },
      "boundaries/elements": elements,
    },
    rules: {
      "import-x/no-unresolved": "error",
      "boundaries/dependencies": [
        "error",
        { default: "disallow", checkAllOrigins: true, checkUnknownLocals: true, policies },
      ],
    },
  },
]);
