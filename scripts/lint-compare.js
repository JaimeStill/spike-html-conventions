// The configuration steps of scripts/measure.sh's lint and format comparison, under node. Each
// config is derived from biome.json, so ESLint, oxlint, Prettier, and oxfmt run the rules and
// options the repository already holds, never a second copy of them:
//
//   lint-compare.js tree <dir> <violations|allowed>
//       writes one of test/layers-tree.js's direction trees under dir
//   lint-compare.js dynamic
//       prints the violation files whose one import is an import() expression
//   lint-compare.js eslint-config <biome.json> <out> <regex|globs>
//       writes an ESLint flat config: @eslint/js's and typescript-eslint's recommended rules,
//       browser globals (node's too under test/), and biome.json's layer overrides as
//       no-restricted-imports, each override's includes as the block's files; with regex each
//       pattern group becomes one regex with Biome's meaning, with globs the groups are copied
//   lint-compare.js oxlint-config <biome.json> <out> <merged|globs>
//       writes an .oxlintrc.json with biome.json's layer overrides as no-restricted-imports; with
//       merged each override's groups become one group with Biome's meaning, with globs the groups
//       are copied
//   lint-compare.js format-options <biome.json> <out>
//       writes the Prettier options, which oxfmt reads too, matching Biome's formatter as
//       biome.json sets it and Biome's defaults leave it, and prints each option set, one line
//   lint-compare.js flagged <biome|eslint|oxlint> <json report> <base>
//       prints the files the report flags with the restricted-imports rule, relative to base,
//       sorted, one per line
//   lint-compare.js linted <biome|eslint|oxlint> <json report>
//       prints how many files the report says the linter linted

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
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

if (command === "tree") {
  const [dir, which] = args;
  writeTree(dir, which === "violations" ? violations : allowed);
} else if (command === "dynamic") {
  for (const [path, source] of Object.entries(violations)) {
    if (source.includes("import(")) console.log(path);
  }
} else if (command === "eslint-config") {
  const [biomeJson, out, form] = args;
  const blocks = layerOverrides(biomeJson).map(({ files, patterns }) => {
    const options = patterns.map(({ group, message }) =>
      form === "regex"
        ? { regex: groupRegex(group), caseSensitive: true, message }
        : { group, message },
    );
    return { files, rules: { "no-restricted-imports": ["error", { patterns: options }] } };
  });
  writeFileSync(
    out,
    `import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.browser } },
  { files: ["test/**"], languageOptions: { globals: globals.node } },
${blocks.map((block) => `  ${JSON.stringify(block)},`).join("\n")}
];
`,
  );
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
} else if (command === "flagged") {
  const [tool, report, base] = args;
  const json = JSON.parse(readFileSync(report, "utf8"));
  let paths;
  if (tool === "biome") {
    paths = json.diagnostics
      .filter((d) => d.category === "lint/style/noRestrictedImports")
      .map((d) => d.location.path);
  } else if (tool === "eslint") {
    paths = json
      .filter((file) => file.messages.some((m) => m.ruleId === "no-restricted-imports"))
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
    `unknown command ${command}; expected tree, dynamic, eslint-config, oxlint-config, format-options, flagged, or linted`,
  );
}
