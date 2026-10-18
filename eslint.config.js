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
// A .css import is a static CSS module script, `with { type: "css" }`, everywhere: core
// no-restricted-syntax refuses an import or an export-from without that attribute, so no .css
// import leans on a bundler's own CSS handling, and refuses an import() of a .css file outright,
// attribute or not: a component imports its sheet statically, and scripts/css-sheets.js handles
// only the static forms.

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const code = ["**/*.js", "**/*.ts"];

// The attribute a CSS module script carries among a declaration's attributes, by its key's name
// or its quoted key.
const cssType = `:matches(ImportAttribute[key.name='type'], ImportAttribute[key.value='type'])[value.value='css']`;
const cssSource = "[source.value=/\\.css$/]";
// An import() whose specifier ends in .css: a string, or a template whose last part does, matched
// at that part.
const cssDynamic = [
  `ImportExpression${cssSource}`,
  "ImportExpression > TemplateLiteral.source > TemplateElement[tail=true][value.cooked=/\\.css$/]",
];
const cssImports = [
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].map((type) => ({
    selector: `${type}${cssSource}:not(:has(${cssType}))`,
    message: "A .css import is a CSS module script: add with { type: 'css' }.",
  })),
  ...cssDynamic.map((selector) => ({
    selector,
    message:
      "A .css file is imported statically, as a CSS module script with { type: 'css' }, never by " +
      "import(): scripts/css-sheets.js handles only the static forms.",
  })),
];

// The layer table: each layer's directory and the layers it may import, "lit" the one package.
// A row whose path holds a * is one app's, the * its directory: an application-branch app's four
// tiers, a static-branch app's elements, and each branch's app root, which holds the entry, the
// route table, and every other file of the app no tier holds. An import into an app's row passes
// only from the same app, so no app imports another, and a file directly in layers/, layers/apps/,
// or a branch directory imports nothing. Inside an application-branch app the tiers run views,
// modules, elements: a view may import modules, elements, and domains; a module elements and
// domains; an element no other tier, nor the SDK, as a component imports; and domains, the app's
// types and domain services, no UI tier, the SDK and the foundation only. A static-branch app is
// an entry and its own elements, which follow the same element rules. A tier row comes before its
// app's root row: an element is the first row whose directory holds the file.
export const layers = [
  { name: "foundation", path: "layers/foundation", may: ["foundation"] },
  { name: "components", path: "layers/components", may: ["foundation", "components", "lit"] },
  { name: "sdk", path: "layers/sdk", may: ["foundation", "sdk", "lit"] },
  {
    name: "static-elements",
    path: "layers/apps/static/*/elements",
    may: ["foundation", "components", "static-elements", "lit"],
  },
  {
    name: "static",
    path: "layers/apps/static/*",
    may: ["foundation", "components", "static", "static-elements", "lit"],
  },
  {
    name: "views",
    path: "layers/apps/application/*/views",
    may: ["foundation", "components", "sdk", "views", "modules", "elements", "domains", "lit"],
  },
  {
    name: "modules",
    path: "layers/apps/application/*/modules",
    may: ["foundation", "components", "sdk", "modules", "elements", "domains", "lit"],
  },
  {
    name: "elements",
    path: "layers/apps/application/*/elements",
    may: ["foundation", "components", "elements", "lit"],
  },
  {
    name: "domains",
    path: "layers/apps/application/*/domains",
    may: ["foundation", "sdk", "domains"],
  },
  {
    name: "application",
    path: "layers/apps/application/*",
    may: [
      "foundation",
      "components",
      "sdk",
      "application",
      "views",
      "modules",
      "elements",
      "domains",
      "lit",
    ],
  },
];

// Each layer is an element by its directory, matched from the root (partialMatch false), with a
// second pattern for a file in a directory whose name starts with a dot, which micromatch's **
// never enters, so ./.well-known/ and ./..x/ stay in their layer; an app's row captures its
// directory's name, which a policy into an app's row names. A file directly in layers/,
// layers/apps/, or a branch directory is a "loose" element with no policy.
const appRow = (path) => path.includes("*");
const elements = [
  ...layers.map(({ name, path }) => ({
    type: name,
    pattern: [path, `${path}/**/.*`],
    partialMatch: false,
    ...(appRow(path) ? { capture: ["app"] } : {}),
  })),
  { type: "loose", pattern: ["layers", "layers/apps", "layers/apps/*"], partialMatch: false },
];

// The rule's default is disallow, and it checks every origin (lit is external) and local files no
// element holds: an import passes only when a policy names its target, and into an app's row only
// from the app that captured the same directory.
const policies = layers.map(({ name, may }) => ({
  from: { element: { type: name } },
  allow: {
    to: may.map((target) => {
      if (target === "lit") return { module: { origin: "external", source: "lit" } };
      if (appRow(layers.find((layer) => layer.name === target).path)) {
        return { element: { type: target, captured: { app: "{{from.element.captured.app}}" } } };
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
