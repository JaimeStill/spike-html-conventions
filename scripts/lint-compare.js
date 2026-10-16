// The configuration steps of scripts/measure.sh's lint and format comparison, under node. Each
// config is derived from biome.json, so ESLint, oxlint, Prettier, oxfmt, and ESLint Stylistic run
// the rules and options the repository already holds, never a second copy of them; the
// resolved-file direction plugins take the layer table below, which biome.json holds only as
// specifier patterns:
//
//   lint-compare.js tree <dir> <violations|allowed>
//       writes one of test/layers-tree.js's direction trees under dir, with the files its imports
//       name
//   lint-compare.js cases <violations|allowed>
//       prints the tree's case files, one per line
//   lint-compare.js dynamic
//       prints the violation files whose one import is an import() expression
//   lint-compare.js disturb <prefix> <dir> <path>...
//       rewrites each file's line breaks and indentation for the restores rows (see below), with
//       the typescript installed under prefix parsing the code, and prints what it did
//   lint-compare.js eslint-config <biome.json> <out> <part[+part]>
//       writes an ESLint flat config of the parts: regex or globs, @eslint/js's and
//       typescript-eslint's recommended rules, browser globals (node's too under test/), and
//       biome.json's layer overrides as no-restricted-imports, each override's includes as the
//       block's files, with regex each pattern group becoming one regex with Biome's meaning,
//       with globs the groups copied; boundaries or import-x, the same recommended rules with the
//       layer table in that plugin and import-x's no-unresolved; stylistic, ESLint Stylistic's
//       rules matching Biome's formatter for the code and eslint-plugin-jsonc's for the JSON
//   lint-compare.js oxlint-config <biome.json> <out> <merged|globs>
//       writes an .oxlintrc.json with biome.json's layer overrides as no-restricted-imports; with
//       merged each override's groups become one group with Biome's meaning, with globs the groups
//       are copied
//   lint-compare.js format-options <biome.json> <out>
//       writes the Prettier options, which oxfmt reads too, matching Biome's formatter as
//       biome.json sets it and Biome's defaults leave it, and prints each option set, one line
//   lint-compare.js stylistic-options <biome.json>
//       prints the options the stylistic part passes to Stylistic's customize, one line
//   lint-compare.js packages <dir>...
//       prints how many distinct packages, by name and version, are installed under the dirs
//   lint-compare.js flagged <biome|eslint|oxlint> <json report> <base> [rule,...]
//       prints the files the report flags with the restricted-imports rule, or for ESLint with any
//       of the rules, relative to base, sorted, one per line
//   lint-compare.js linted <biome|eslint|oxlint> <json report>
//       prints how many files the report says the linter linted

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative } from "node:path";
import { allowed, violations, writeTree } from "../test/layers-tree.js";

const [command, ...args] = process.argv.slice(2);

/** biome.json's layer overrides, each as its includes and its noRestrictedImports patterns. */
function layerOverrides(biomeJson) {
  return JSON.parse(readFileSync(biomeJson, "utf8")).overrides.map((override) => ({
    files: override.includes,
    patterns: override.linter.rules.style.noRestrictedImports.options.patterns,
  }));
}

/** A regex source for one of Biome's glob patterns over a whole specifier: `**` as a segment is
 * any number of segments, `*` any run within one, and `{a,b}` either alternative. */
function globSource(glob) {
  const literal = (text) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const parts = glob.split("/");
  return parts
    .map((part, i) => {
      const last = i === parts.length - 1;
      if (part === "**") return last ? ".*" : "(?:.*/)?";
      const source = part
        .split(/(\{[^{}]*\}|\*)/)
        .map((piece) => {
          if (piece === "*") return "[^/]*";
          if (piece.startsWith("{") && piece.endsWith("}")) {
            return `(?:${piece.slice(1, -1).split(",").map(literal).join("|")})`;
          }
          return literal(piece);
        })
        .join("");
      return last ? source : `${source}/`;
    })
    .join("");
}

/** One regex with a pattern group's meaning: a specifier is refused when a pattern matches it
 * and no `!` pattern after that one does, the last match deciding, as Biome reads a group.
 * ESLint reads a group as gitignore lines, where `**` excludes `./` and `../` themselves and a
 * `!` line can't re-include a path under an excluded parent, so a copied group refuses every
 * relative import it means to allow. */
function groupRegex(group) {
  const refused = [];
  group.forEach((pattern, i) => {
    if (pattern.startsWith("!")) return;
    const allowedAfter = group
      .slice(i + 1)
      .filter((later) => later.startsWith("!"))
      .map((later) => globSource(later.slice(1)));
    const unless = allowedAfter.length > 0 ? `(?!(?:${allowedAfter.join("|")})$)` : "";
    refused.push(`(?=(?:${globSource(pattern)})$)${unless}`);
  });
  return `^(?:${refused.join("|")})`;
}

/** One group with the meaning of an override's groups, for oxlint. Biome refuses a specifier
 * when any group refuses it; oxlint lets a `!` pattern that matches in one group re-allow what
 * another group refuses, and doesn't run a lookaround regex, so groupRegex's form flags nothing.
 * Within one group oxlint reads the last match, as Biome does, so the group holding `!` patterns
 * goes first and the groups without come after it, each of their matches then deciding. With more
 * than one group holding `!` patterns no such order exists. */
function mergedGroup(patterns) {
  const negating = patterns.filter(({ group }) => group.some((p) => p.startsWith("!")));
  if (negating.length > 1) throw new Error("more than one group holds ! patterns");
  const ordered = [...negating, ...patterns.filter((pattern) => !negating.includes(pattern))];
  return {
    group: ordered.flatMap(({ group }) => group),
    message: ordered.map(({ message }) => message).join(" "),
  };
}

// Biome's formatter options, as Prettier names them, oxfmt sharing the names. Each entry is
// Biome's option, its default, where it lives in biome.json, and its Prettier equivalent for
// each value; a value with no equivalent is reported unmatched.
const formatterMap = [
  ["indentStyle", "tab", "formatter", "useTabs", { space: false, tab: true }],
  ["indentWidth", 2, "formatter", "tabWidth", null],
  ["lineWidth", 80, "formatter", "printWidth", null],
  ["lineEnding", "lf", "formatter", "endOfLine", { lf: "lf", crlf: "crlf", cr: "cr" }],
  ["bracketSpacing", true, "formatter", "bracketSpacing", null],
  ["bracketSameLine", false, "formatter", "bracketSameLine", null],
  // auto keeps an object expanded when its first property starts a new line, as preserve does.
  ["expand", "auto", "formatter", "objectWrap", { auto: "preserve", never: "collapse" }],
  ["quoteStyle", "double", "javascript", "singleQuote", { double: false, single: true }],
  ["jsxQuoteStyle", "double", "javascript", "jsxSingleQuote", { double: false, single: true }],
  [
    "quoteProperties",
    "asNeeded",
    "javascript",
    "quoteProps",
    { asNeeded: "as-needed", preserve: "preserve" },
  ],
  [
    "trailingCommas",
    "all",
    "javascript",
    "trailingComma",
    { all: "all", es5: "es5", none: "none" },
  ],
  ["semicolons", "always", "javascript", "semi", { always: true, asNeeded: false }],
  [
    "arrowParentheses",
    "always",
    "javascript",
    "arrowParens",
    { always: "always", asNeeded: "avoid" },
  ],
  ["operatorLinebreak", "after", "javascript", "experimentalOperatorPosition", { after: "end" }],
];

// The layer table, as the resolved-file direction plugins take it: each layer's directory and the
// layers it may import, "own" an app's own directory and "lit" the one package. No app imports
// another, and a file directly in layers/, layers/apps/, or a branch directory imports nothing.
// biome.json's overrides hold the same table as specifier patterns; these plugins classify the
// file an import resolves to instead, so a package's own name and an absolute path, which resolve
// to no file, are left to each plugin's no-unresolved rule.
const layers = [
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

/** eslint-plugin-boundaries' settings and rule for the layer table. Each layer is an element by
 * its directory, matched from the root (partialMatch false), with a second pattern for a file in a
 * directory whose name starts with a dot, which micromatch's ** never enters, so `./.well-known/`
 * and `./..x/` stay in their layer; an app captures its directory's name, which its own policy
 * names. A file directly in layers/, layers/apps/, or a branch directory is a "loose" element with
 * no policy. The dependencies rule's default is disallow, and it checks every origin (lit is
 * external) and local files no element holds (src/), which it skips by default. The resolver is
 * eslint-import-resolver-typescript, which resolves a .js specifier to its .ts source. */
function boundariesBlock() {
  const elements = layers.map(({ name, path }) => ({
    type: name,
    pattern: [path, `${path}/**/.*`],
    partialMatch: false,
    ...(path.endsWith("*") ? { capture: ["app"] } : {}),
  }));
  elements.push({
    type: "loose",
    pattern: ["layers", "layers/apps", "layers/apps/*"],
    partialMatch: false,
  });
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
  return `{
    plugins: { boundaries, "import-x": importX },
    settings: {
      "import/resolver": { typescript: true },
      "import-x/resolver": { typescript: true },
      "boundaries/elements": ${JSON.stringify(elements)},
    },
    rules: {
      "import-x/no-unresolved": "error",
      "boundaries/dependencies": ["error", ${JSON.stringify({
        default: "disallow",
        checkAllOrigins: true,
        checkUnknownLocals: true,
        policies,
      })}],
    },
  }`;
}

/** eslint-plugin-import-x's no-restricted-paths and no-unresolved for the layer table, with its
 * built-in resolver (unrs-resolver) taking a .js specifier to its .ts source and a directory to
 * its index.ts. A zone has no captures, so the config lists each app's directory when it loads,
 * one zone each, refusing every path outside the layers it may import and its own directory. */
function importXBlock() {
  return `{
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [
        createNodeResolver({ extensions: [".ts", ".js"], extensionAlias: { ".js": [".ts", ".js"] } }),
      ],
    },
    rules: {
      "import-x/no-unresolved": "error",
      "import-x/no-restricted-paths": ["error", { zones: zones(${JSON.stringify(layers)}) }],
    },
  }`;
}

/** The zones function an import-x config holds: from the root, so a package under node_modules is
 * refused unless lit, and each app's directory listed from the tree as the config loads. */
const zonesSource = `function zones(layers) {
  const root = import.meta.dirname;
  const dirs = (path) => {
    if (!path.endsWith("/*")) return [path];
    const parent = path.slice(0, -2);
    if (!existsSync(join(root, parent))) return [];
    return readdirSync(join(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => \`\${parent}/\${entry.name}\`);
  };
  const where = (target) => (target === "lit" ? ["node_modules/lit"] : []);
  const list = layers.flatMap(({ name, path, may }) =>
    dirs(path).map((dir) => ({
      target: dir,
      from: ".",
      except: may.flatMap((target) => {
        if (target === "own") return [dir];
        if (target === "lit") return where(target);
        return dirs(layers.find((layer) => layer.name === target).path);
      }),
    })),
  );
  list.push({ target: ["layers/*.*", "layers/apps/*.*", "layers/apps/*/*.*"], from: "." });
  return list.map((zone) => ({
    ...zone,
    target: [zone.target].flat().map((target) => join(root, target)),
    from: join(root, zone.from),
    except: (zone.except ?? []).map((except) => join(root, except)),
  }));
}`;

// Biome's formatter as ESLint Stylistic's rules, from biome.json and Biome's defaults, for the
// code; eslint-plugin-jsonc's rules, matching the tracked JSON files, for the JSON. Stylistic
// adjusts whitespace and punctuation in place: it has no line-width reflow, and max-len, which
// reports a line past the width, has no fixer.
function stylisticBlocks(biomeJson) {
  const biome = JSON.parse(readFileSync(biomeJson, "utf8"));
  const value = (name) => {
    const entry = formatterMap.find(([option]) => option === name);
    const scope = entry[2] === "formatter" ? biome.formatter : biome.javascript?.formatter;
    return scope?.[name] ?? entry[1];
  };
  const indent = value("indentStyle") === "tab" ? "tab" : value("indentWidth");
  const customize = {
    indent,
    quotes: value("quoteStyle"),
    semi: value("semicolons") === "always",
    commaDangle: { all: "always-multiline", es5: "only-multiline", none: "never" }[
      value("trailingCommas")
    ],
    arrowParens: value("arrowParentheses") === "always",
    braceStyle: "1tbs",
    blockSpacing: true,
    quoteProps: value("quoteProperties") === "asNeeded" ? "as-needed" : "preserve",
    jsx: false,
  };
  // The rules customize leaves out or sets otherwise than Biome's output: Biome keeps the blank
  // lines between class members as written; breaks after a binary operator but before a ternary's
  // ? and :; indents a binary chain's continuation lines evenly, where indent-binary-ops indents
  // those after a parenthesized operand further, so it's off; and decides a call's breaks by the
  // width, so the newline rules only ask for consistency, and function-paren-newline, which no
  // option makes agree with a broken last-argument arrow, is off.
  const rules = {
    "@stylistic/lines-between-class-members": "off",
    "@stylistic/operator-linebreak": [
      "error",
      value("operatorLinebreak") === "after" ? "after" : "before",
      { overrides: { "?": "before", ":": "before" } },
    ],
    "@stylistic/indent-binary-ops": "off",
    "@stylistic/arrow-parens": [
      "error",
      value("arrowParentheses") === "always" ? "always" : "as-needed",
    ],
    "@stylistic/object-curly-spacing": ["error", value("bracketSpacing") ? "always" : "never"],
    "@stylistic/function-paren-newline": "off",
    "@stylistic/function-call-argument-newline": ["error", "consistent"],
    "@stylistic/array-bracket-newline": ["error", "consistent"],
    "@stylistic/array-element-newline": ["error", "consistent"],
    "@stylistic/object-curly-newline": ["error", { consistent: true }],
    "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
    "@stylistic/linebreak-style": ["error", value("lineEnding") === "crlf" ? "windows" : "unix"],
    // Biome leaves a string, a template literal, or a regex past the width as it is.
    "@stylistic/max-len": [
      "error",
      {
        code: value("lineWidth"),
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreUrls: true,
      },
    ],
  };
  // Every tracked JSON object is expanded, one member per line; an array is on one line or one
  // element per line, as Biome fills it to the width, which jsonc can only ask to be consistent.
  const json = {
    "jsonc/indent": ["error", indent],
    "jsonc/key-spacing": ["error", { beforeColon: false, afterColon: true }],
    "jsonc/comma-dangle": ["error", "never"],
    "jsonc/comma-style": ["error", "last"],
    "jsonc/array-bracket-spacing": ["error", "never"],
    "jsonc/object-curly-spacing": ["error", "always"],
    "jsonc/array-bracket-newline": ["error", "consistent"],
    "jsonc/array-element-newline": ["error", "consistent"],
    "jsonc/object-curly-newline": ["error", "always"],
    "jsonc/object-property-newline": "error",
    "@stylistic/eol-last": "error",
    "@stylistic/no-trailing-spaces": "error",
    "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],
  };
  return {
    customize,
    source: `{ files: code, ...stylistic.configs.customize(${JSON.stringify(customize)}) },
  { files: code, rules: ${JSON.stringify(rules)} },
  ...jsonc.configs["flat/base"],
  { files: ["**/*.json"], plugins: { "@stylistic": stylistic }, rules: ${JSON.stringify(json)} },`,
  };
}

/** An ESLint flat config of `parts`: regex or globs, @eslint/js's and typescript-eslint's
 * recommended rules with biome.json's layer overrides as no-restricted-imports (see the head of
 * this file); boundaries or import-x, the same recommended rules with that plugin's direction
 * rules; stylistic, the formatting rules. The lint rules apply to the code only. */
function eslintConfig(biomeJson, parts) {
  const imports = [];
  const blocks = [];
  if (parts.some((part) => part !== "stylistic")) {
    imports.push(
      `import js from "@eslint/js";`,
      `import globals from "globals";`,
      `import tseslint from "typescript-eslint";`,
    );
    blocks.push(
      `...[js.configs.recommended, ...tseslint.configs.recommended].map((block) => ({ files: code, ...block })),`,
      `{ files: code, languageOptions: { globals: globals.browser } },`,
      `{ files: ["test/**"], languageOptions: { globals: globals.node } },`,
    );
  } else {
    imports.push(`import tseslint from "typescript-eslint";`);
    blocks.push(`{ files: ["**/*.ts"], languageOptions: { parser: tseslint.parser } },`);
  }
  for (const part of parts) {
    if (part === "regex" || part === "globs") {
      for (const { files, patterns } of layerOverrides(biomeJson)) {
        const options = patterns.map(({ group, message }) =>
          part === "regex"
            ? { regex: groupRegex(group), caseSensitive: true, message }
            : { group, message },
        );
        const block = {
          files,
          rules: { "no-restricted-imports": ["error", { patterns: options }] },
        };
        blocks.push(`${JSON.stringify(block)},`);
      }
    } else if (part === "boundaries") {
      imports.push(
        `import boundaries from "eslint-plugin-boundaries";`,
        `import importX from "eslint-plugin-import-x";`,
      );
      blocks.push(`${boundariesBlock()},`);
    } else if (part === "import-x") {
      imports.push(
        `import { existsSync, readdirSync } from "node:fs";`,
        `import { join } from "node:path";`,
        `import importX, { createNodeResolver } from "eslint-plugin-import-x";`,
      );
      blocks.push(`${importXBlock()},`);
    } else if (part === "stylistic") {
      imports.push(
        `import stylistic from "@stylistic/eslint-plugin";`,
        `import jsonc from "eslint-plugin-jsonc";`,
      );
      blocks.push(stylisticBlocks(biomeJson).source);
    } else {
      throw new Error(`unknown eslint-config part ${part}`);
    }
  }
  return `${imports.join("\n")}

const code = ["**/*.js", "**/*.ts"];
${parts.includes("import-x") ? `\n${zonesSource}\n` : ""}
export default [
  ${blocks.join("\n  ")}
];
`;
}

// The restores rows' disturbance: each file's line breaks and indentation rewritten, the tokens
// kept, in the ways a formatter configured to match undoes and a formatter that only adjusts
// whitespace in place can't. A width-decided construct is joined onto one line when the formatted
// file broke it, so the formatter must break it again at the line width, and split when the file
// held it on one line, so the formatter must join it again; then every line is re-indented, to 0
// spaces on an even line and 4 on an odd one. Only constructs whose layout the formatter decides
// from the width alone are joined or split: an object literal keeps its expansion (Biome's expand
// auto and Prettier's objectWrap preserve read it from the source), and a template literal's or
// a block comment's continuation lines are text, kept as written.

/** The column-0 re-indentation: every line not in `kept` (a set of 0-based line numbers) loses
 * its indentation and gets 0 spaces on an even line, 4 on an odd one. */
function reindent(text, kept) {
  return text
    .split("\n")
    .map((line, i) => {
      if (kept.has(i) || line.trim() === "") return line;
      return `${i % 2 === 0 ? "" : "    "}${line.trimStart()}`;
    })
    .join("\n");
}

/** How many lines of `after`, as it stands before the re-indentation, run past 100 columns and
 * aren't lines of `before`: the joins the formatter must break again at the line width. */
function wider(before, after) {
  const lines = new Set(before.split("\n"));
  return after.split("\n").filter((line) => line.length > 100 && !lines.has(line)).length;
}

/** The 0-based line of each offset in `text`. */
function lineOf(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}

/** A JS or TS file disturbed, with what was done: each call expression on one line with two or
 * more arguments split after its ( and each comma; each call spanning lines whose arguments are
 * all simple (identifiers, literals, one-line template literals, member accesses, binary
 * expressions, expression-bodied arrow functions, and calls, of simple parts), and each array
 * literal spanning lines whose elements are all simple, with no comment inside, joined onto one
 * line; then the re-indentation, leaving a template literal's and a block comment's
 * continuation lines as written. TypeScript's parser finds the constructs. */
function disturbCode(ts, path, text) {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const line = lineOf(text);
  const kept = new Set();
  const comments = [];
  const edits = [];
  const counts = { split: 0, joined: 0 };
  const keepSpan = (start, end) => {
    for (let l = line(start) + 1; l <= line(end); l++) kept.add(l);
  };
  const simple = (node) =>
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.ThisKeyword ||
    (ts.isNoSubstitutionTemplateLiteral(node) && !node.text.includes("\n")) ||
    (ts.isPropertyAccessExpression(node) && simple(node.expression)) ||
    (ts.isElementAccessExpression(node) &&
      simple(node.expression) &&
      simple(node.argumentExpression)) ||
    (ts.isBinaryExpression(node) && simple(node.left) && simple(node.right)) ||
    (ts.isArrowFunction(node) && !ts.isBlock(node.body) && simple(node.body)) ||
    ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      simple(node.expression) &&
      (node.arguments ?? []).every(simple));
  const inTemplate = (node) => {
    for (let up = node.parent; up; up = up.parent) {
      if (ts.isTemplateExpression(up) || ts.isTaggedTemplateExpression(up)) return true;
    }
    return false;
  };
  const visit = (node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
    ]) {
      comments.push(range);
      if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) keepSpan(range.pos, range.end);
    }
    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      keepSpan(node.getStart(file), node.end);
    }
    if (ts.isCallExpression(node) && !inTemplate(node)) {
      const args = node.arguments;
      const open = args.pos;
      const close = args.end;
      const oneLine = line(node.getStart(file)) === line(node.end);
      if (oneLine && args.length >= 2) {
        edits.push({ kind: "split", at: args.map((arg) => arg.getStart(file)) });
      } else if (!oneLine && args.length >= 1 && args.every(simple)) {
        edits.push({ kind: "join", open, close, call: node });
      }
    }
    if (ts.isArrayLiteralExpression(node) && !inTemplate(node)) {
      const start = node.getStart(file);
      if (line(start) !== line(node.end) && node.elements.every(simple)) {
        edits.push({ kind: "join", open: start, close: node.end, call: node });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  // Calls holding a comment aren't joined, which a // comment would swallow.
  const holdsComment = (start, end) => comments.some((c) => c.pos >= start && c.end <= end);
  // Apply the edits from the end of the file, so each offset still holds; a join inside a joined
  // or split span is left out.
  const spans = [];
  const ops = [];
  for (const edit of edits) {
    if (edit.kind === "join") {
      if (holdsComment(edit.open, edit.close)) continue;
      spans.push([edit.open, edit.close]);
      ops.push(edit);
    }
  }
  for (const edit of edits) {
    if (edit.kind === "split") {
      if (spans.some(([s, e]) => edit.at[0] >= s && edit.at[0] <= e)) continue;
      ops.push(edit);
    }
  }
  const replacements = [];
  for (const op of ops) {
    if (op.kind === "split") {
      counts.split++;
      for (const at of op.at) {
        let start = at;
        while (start > 0 && text[start - 1] === " ") start--;
        replacements.push([start, at, "\n"]);
      }
    } else {
      counts.joined++;
      const end = op.call.end;
      let span = text.slice(op.open, end);
      span = span.replace(/([([])\s*\n\s*/g, "$1").replace(/,?\s*\n\s*([)\]])/g, "$1");
      span = span.replace(/\s*\n\s*/g, " ");
      replacements.push([op.open, end, span]);
    }
  }
  replacements.sort((a, b) => b[0] - a[0]);
  let out = text;
  let last = Infinity;
  for (const [start, end, value] of replacements) {
    if (end > last) continue;
    out = out.slice(0, start) + value + out.slice(end);
    last = start;
  }
  // The kept lines are found again in the edited text, since the edits move lines.
  const edited = ts.createSourceFile(path, out, ts.ScriptTarget.Latest, true);
  const editedLine = lineOf(out);
  const keptAfter = new Set();
  const keepAfter = (start, end) => {
    for (let l = editedLine(start) + 1; l <= editedLine(end); l++) keptAfter.add(l);
  };
  const revisit = (node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(out, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(out, node.end) ?? []),
    ]) {
      if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) keepAfter(range.pos, range.end);
    }
    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      keepAfter(node.getStart(edited), node.end);
    }
    ts.forEachChild(node, revisit);
  };
  revisit(edited);
  return { text: reindent(out, keptAfter), counts: { ...counts, wide: wider(text, out) } };
}

/** A JSON file disturbed, with what was done: each array of scalars spanning lines joined onto
 * one line, each array of two or more scalars on one line split after its [ and each comma, each
 * closing } that starts a line moved onto the line before it; then the re-indentation. */
function disturbJson(text) {
  // Tokens, each with the whitespace before it: strings, punctuation, and other scalars.
  const tokens = [];
  const pattern = /(\s*)("(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:"]+)/gy;
  let match = pattern.exec(text);
  let end = 0;
  while (match) {
    tokens.push({ ws: match[1], value: match[2] });
    end = pattern.lastIndex;
    match = pattern.exec(text);
  }
  const tail = text.slice(end);
  const counts = { split: 0, joined: 0, closed: 0 };
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const { value } = tokens[i];
    if (value === "[" || value === "{") stack.push({ open: i, scalars: true });
    else if (value === "]" || value === "}") {
      const frame = stack.pop();
      if (stack.length > 0) stack.at(-1).scalars = false;
      if (value === "}") continue;
      const inner = tokens.slice(frame.open + 1, i);
      if (!frame.scalars || inner.length === 0) continue;
      const multiLine = [...inner, tokens[i]].some((t) => t.ws.includes("\n"));
      const elements = inner.filter((t) => t.value !== ",").length;
      if (multiLine) {
        counts.joined++;
        for (let j = frame.open + 1; j <= i; j++) {
          tokens[j].ws = j === frame.open + 1 || tokens[j].value === "," || j === i ? "" : " ";
        }
        if (tokens[i - 1].value === ",") tokens[i - 1].value = "";
      } else if (elements >= 2) {
        counts.split++;
        for (let j = frame.open + 1; j < i; j++) {
          if (tokens[j].value !== ",") tokens[j].ws = "\n";
        }
      }
    }
  }
  for (const token of tokens) {
    if (token.value === "}" && token.ws.includes("\n")) {
      token.ws = " ";
      counts.closed++;
    }
  }
  const out = tokens.map((t) => t.ws + t.value).join("") + tail;
  return { text: reindent(out, new Set()), counts: { ...counts, wide: wider(text, out) } };
}

if (command === "tree") {
  const [dir, which] = args;
  writeTree(dir, which === "violations" ? violations : allowed);
} else if (command === "disturb") {
  const [modules, dir, ...paths] = args;
  const ts = createRequire(join(modules, "package.json"))("typescript");
  const totals = {};
  for (const path of paths) {
    const text = readFileSync(join(dir, path), "utf8");
    const { text: disturbed, counts } = path.endsWith(".json")
      ? disturbJson(text)
      : disturbCode(ts, path, text);
    writeFileSync(join(dir, path), disturbed);
    for (const [name, count] of Object.entries(counts)) totals[name] = (totals[name] ?? 0) + count;
  }
  console.log(
    Object.entries(totals)
      .map(([name, count]) => `${name} ${count}`)
      .join(", "),
  );
} else if (command === "cases") {
  const [which] = args;
  for (const path of Object.keys(which === "violations" ? violations : allowed)) console.log(path);
} else if (command === "dynamic") {
  for (const [path, source] of Object.entries(violations)) {
    if (source.includes("import(")) console.log(path);
  }
} else if (command === "eslint-config") {
  const [biomeJson, out, form] = args;
  writeFileSync(out, eslintConfig(biomeJson, form.split("+")));
} else if (command === "oxlint-config") {
  const [biomeJson, out, form] = args;
  const overrides = layerOverrides(biomeJson).map(({ files, patterns }) => ({
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: form === "merged" ? [mergedGroup(patterns)] : patterns },
      ],
    },
  }));
  writeFileSync(out, `${JSON.stringify({ overrides }, null, 2)}\n`);
} else if (command === "format-options") {
  const [biomeJson, out] = args;
  const biome = JSON.parse(readFileSync(biomeJson, "utf8"));
  const options = {};
  const unmatched = [];
  for (const [name, fallback, section, prettier, values] of formatterMap) {
    const scope = section === "formatter" ? biome.formatter : biome.javascript?.formatter;
    const value = scope?.[name] ?? fallback;
    if (values === null) options[prettier] = value;
    else if (value in values) options[prettier] = values[value];
    else unmatched.push(`${name} ${value}`);
  }
  // Biome leaves a template literal's contents as written, Lit's html`` included; Prettier and
  // oxfmt format embedded HTML and CSS unless told not to.
  options.embeddedLanguageFormatting = "off";
  writeFileSync(out, `${JSON.stringify(options, null, 2)}\n`);
  console.log(
    Object.entries(options)
      .map(([name, value]) => `${name} ${value}`)
      .join(", ") + (unmatched.length > 0 ? `; no equivalent for ${unmatched.join(", ")}` : ""),
  );
} else if (command === "stylistic-options") {
  const [biomeJson] = args;
  console.log(
    Object.entries(stylisticBlocks(biomeJson).customize)
      .map(([name, value]) => `${name} ${value}`)
      .join(", "),
  );
} else if (command === "packages") {
  // Each distinct name@version installed under the directories, as a package directory's
  // package.json directly in a node_modules or a scope in one; symlinks aren't followed, so a
  // linked package counts where it's installed.
  const found = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = join(dir, entry.name);
      const parent = basename(dir);
      const inModules =
        parent === "node_modules" ||
        (parent.startsWith("@") && basename(dirname(dir)) === "node_modules");
      if (inModules && !entry.name.startsWith("@") && existsSync(join(path, "package.json"))) {
        const { name, version } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
        if (name && version) found.add(`${name}@${version}`);
      }
      walk(path);
    }
  };
  for (const dir of args) walk(dir);
  console.log(found.size);
} else if (command === "flagged") {
  const [tool, report, base, rules = "no-restricted-imports"] = args;
  const ruleIds = rules.split(",");
  const json = JSON.parse(readFileSync(report, "utf8"));
  let paths;
  if (tool === "biome") {
    paths = json.diagnostics
      .filter((d) => d.category === "lint/style/noRestrictedImports")
      .map((d) => d.location.path);
  } else if (tool === "eslint") {
    paths = json
      .filter((file) => file.messages.some((m) => ruleIds.includes(m.ruleId)))
      .map((file) => relative(base, file.filePath));
  } else {
    paths = json.diagnostics
      .filter((d) => d.code === "eslint(no-restricted-imports)")
      .map((d) => d.filename);
  }
  for (const path of [...new Set(paths)].sort()) console.log(path);
} else if (command === "linted") {
  const [tool, report] = args;
  const json = JSON.parse(readFileSync(report, "utf8"));
  if (tool === "biome") console.log(json.summary.unchanged + json.summary.changed);
  else if (tool === "eslint") console.log(json.length);
  else console.log(json.number_of_files);
} else {
  throw new Error(
    `unknown command ${command}; expected tree, dynamic, disturb, eslint-config, oxlint-config, format-options, stylistic-options, packages, flagged, or linted`,
  );
}
