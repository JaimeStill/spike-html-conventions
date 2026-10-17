#!/usr/bin/env bash
# The measure task, outside the check: times each toolchain with hyperfine and records the rows
# that need no pushed tag, printing one dated markdown report to stdout for the README's evidence.
# It reads the network and writes nothing to the working tree: every install, build, watcher, and
# page runs in a scratch directory, removed on exit. Progress goes to stderr. It exits nonzero
# if any row fails, after printing every row.
#
#   scripts/measure.sh                         the report
#   scripts/measure.sh rebuild SRC OUT COUNT   one watch-rebuild sample, the command hyperfine
#                                              times (see "Watch rebuild" below)
#
# Timings, each hyperfine's mean of several runs, Node (node 26 with pnpm, and with npm in its
# default hoisted layout and in its linked one, --install-strategy=linked) against Bun:
#
#   install, cold   a consumer fixture installs spike-html-design v0.7.0 and this package by git
#                   tag, each source pointed at a local repository (git+file://, tag kept) so
#                   the git half isn't network-bound: spike-html-design's checkout and the
#                   scratch repository scripts/consumers.sh makes, tagged v0.1.0. Lit comes from
#                   the registry into an empty store or cache, emptied before every run. npm
#                   reads the fixture's .npmrc, allow-git=root, its opt-in to git dependencies.
#   install, warm   the same with the store or cache kept, and node_modules and the lockfile
#                   removed before every run.
#                   npm's linked layout installs the same fixture into a project and a cache of
#                   its own.
#   type check      tsc --noEmit over the .ts and JSDoc forms: one tool, the same in both columns.
#   build           Node: tsc emit, an esbuild bundle, and a Vite library build; Bun: bun build.
#                   Each bundler takes all six element entries in one invocation, Lit bundled and
#                   nothing minified, with Lit's production build, into scratch; each bundle's
#                   shape is checked after the timing.
#   watch rebuild   see below.
#   test            node --test against bun test, over the shared suite.
#   lint and format four setups over one scratch copy of the code, src/, layers/, and test/ (the
#                   sources and the suite; scripts/ and the fixtures are left out): A, Biome; B,
#                   the check's own, ESLint with typescript-eslint and eslint-plugin-boundaries,
#                   and Prettier; C, oxlint and oxfmt; D, B's ESLint with ESLint Stylistic, and
#                   eslint-plugin-jsonc for JSON. Each lints, format-checks, and does both in one
#                   bash -c, D's both in one eslint run. See "Lint and format" below.
#
# Vite: its config is written into scratch (see vite_config below), never the working tree, and
# loaded natively (--configLoader native), so Vite writes no bundled config beside it. Vite's
# library build splits the six entries' shared Lit into one chunk, its default for several
# entries, where esbuild and bun build without --splitting inline Lit into each entry. The watch
# row times vite build --watch, not Vite's dev server: the dev server serves modules unbundled on
# request and pushes changes over HMR, writing no output to poll, so it isn't like for like with
# the other watchers.
#
# Watch rebuild: each watcher (tsc --watch, esbuild --watch, vite build --watch, bun build
# --watch) runs over a scratch copy of the sources, never the working tree. One sample rewrites
# the copy's src/ts/pagination-lit.ts with a new `export const stamp = N;` line and polls the
# output until it holds `stamp = N`, so hyperfine's time is from the source change to the rebuilt
# output, plus this script's startup and the poll's granularity of a few milliseconds.
#
# Lint and format: B's lint is the repository's eslint.config.js, run by the project's ESLint and
# Prettier, its devDependencies, from node_modules (mise run install). Every other configuration
# is derived by scripts/lint-compare.js and written into scratch, never the working tree:
# Biome's, biome.json with scripts/biome-layers.json's layer overrides, the text rules biome.json
# held while Biome was the check's linter; ESLint's flat configs (@eslint/js's and
# typescript-eslint's recommended rules, the globals package's browser globals, and the layer
# rules: those overrides as no-restricted-imports, each pattern group translated to one regex
# with Biome's meaning, or eslint.config.js's layer table in eslint-plugin-import-x's
# no-restricted-paths with its no-unresolved; and for D, ESLint Stylistic's rules matching Biome's
# formatter and eslint-plugin-jsonc's matching the tracked JSON), oxlint's .oxlintrc.json (each
# override's groups merged into one group with Biome's meaning, since oxlint lets one group's !
# pattern re-allow what another group refuses and runs no lookaround regex), and the Prettier
# options oxfmt also reads, matching Biome's formatter, which the repository's .prettierrc.json
# must hold too. Biome, oxlint, and oxfmt are mise tools. D installs from the registry into
# scratch on its own: the devDependencies but Prettier, at package.json's versions, and
# stylistic_packages, below, with --legacy-peer-deps as before. ESLint 10 takes each flat config
# by -c, its patterns then matching from the working directory, or finds one by looking up from
# the linted files.
#
# Before the timings, two sections read only the local disk:
#
#   footprint       each mise tool's installed size, from mise where and du -sb, with the column
#                   it belongs to and each column's total: Node with npm and Node with pnpm, each
#                   alone and with each of its bundlers, esbuild or Vite; and Bun. npm is its own
#                   pin; the npm node bundles is counted in node's size and recorded beside it.
#                   The lint comparison's mise tools, Biome, oxlint, and oxfmt, are in a column of
#                   their own; ESLint and Prettier are devDependencies, sized in the lint rows.
#   forms           lines and brotli bytes (quality 11, through bun's node:zlib; no brotli CLI is
#                   pinned) of each file in src/{ts,jsdoc,js}, and each form's totals.
#
# Rows, each pass or FAIL with the observed fact; a row passes when the observation is the one
# the spike expects, a refusal included:
#
#   refusals        node won't strip types under node_modules; pnpm refuses a git-tag package
#                   that carries a git-tag dependency (ERR_PNPM_EXOTIC_SUBDEP), and bun installs it;
#                   pnpm installs it too with blockExoticSubdeps: false in the consumer's
#                   pnpm-workspace.yaml, so the refusal is a default one setting lifts.
#   npm             npm 12 refuses any git dependency with no allow-git opt-in (EALLOWGIT);
#                   with allow-git=root it refuses the git-tag package's own git-tag dependency,
#                   and with allow-git=all it installs both; it runs a git dependency's prepare
#                   script when it packs the clone, though it reports the script blocked by
#                   allowScripts, and --ignore-scripts skips it.
#   prepare         the same throwaway git-tag package with a prepare script under pnpm and
#                   bun: pnpm refuses the install (ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED) unless
#                   allowBuilds names the package's resolved spec, which runs prepare, and
#                   --ignore-scripts installs it without; bun installs it without running prepare,
#                   reporting it blocked, and runs it once the package is in trustedDependencies.
#   layout          how each layout answers the concerns pnpm was made for, in projects of its own
#                   with a cache or store of its own: npm hoisted (its default), npm linked, pnpm
#                   isolated (its default), pnpm hoisted (nodeLinker: hoisted), bun install's
#                   default (hoisted, for a project with no workspaces), and bun's isolated
#                   linker (--linker isolated); disk and determinism leave out pnpm hoisted and
#                   bun isolated.
#                   Phantom dependency: local packages a, b, and c, each a tarball, a depending
#                   on b and b on c, and a consumer declaring only a. The consumer imports a,
#                   then b (its own phantom), then a/reach.js, which imports c (a dependency's
#                   phantom); a row passes when a gives its own default export and the phantom
#                   gives the fixture's export, or node's ERR_MODULE_NOT_FOUND naming that very
#                   package, as the row's name says. Determinism: a consumer of lit installs,
#                   then two fresh copies install from its lockfile (npm ci, --frozen-lockfile
#                   otherwise); a row passes when the three trees, every path, link target, and
#                   file's bytes, are the same and not empty. Disk: two consumers of lit install
#                   in turn against one cache or store; a row records the bytes the second adds
#                   (du -sb over the cache or store and both node_modules, which counts each
#                   inode once) and how many of its package files are hard links to a file in
#                   the cache or store, passing on the sharing the name says: none under npm,
#                   every file under pnpm and bun.
#   prefixed tag    from a local, unpushed fixture/v0.1.0 tag with the package in fixture/,
#                   pnpm installs the subdirectory with #fixture/v0.1.0&path:/fixture, each file
#                   the fixture's byte for byte; bun can't, reading the whole fragment as the ref;
#                   npm can't either, ignoring "fixture/v0.1.0&path" as an unknown key and
#                   reading package.json at the repository's root. npm's own subdirectory syntax,
#                   #fixture/v0.1.0::path:fixture, resolves the subdirectory's manifest but fails
#                   to install it: the resolved spec, a bare commit, drops the path.
#   GitHub          a scratch consumer installs the package from github:<owner>/<repo>#<tag> under
#                   pnpm, npm (allow-git=root), and bun, each with a store or cache of its own in
#                   scratch; it
#                   passes when every installed file equals the tag's byte for byte and every
#                   exports target is installed. The tag's tree comes from a fresh shallow fetch
#                   from GitHub, archived as GitHub's tarball is. The row records the file count
#                   and whether the set is the one the git+file:// install of the timings got.
#   jsDelivr        one file from cdn.jsdelivr.net/gh/<owner>/<repo>@<tag>: content type (a
#                   module as JavaScript, a style as CSS, a .ts as text/plain with nosniff, which
#                   a browser won't run), immutable caching, CORS open to any origin, and bytes
#                   equal to the tag's; x-jsd-version-type is recorded. Until this package's .ts
#                   rows run, the .ts shape is observed on Lit's packages/lit/src/index.ts at
#                   the tag of the Lit version this package depends on.
#   file://         pages opened in the system Chromium's --headless --dump-dom load
#                   spike-html-design v0.7.0 from jsDelivr, Lit through an import map to jsDelivr,
#                   and the JS forms of the element; each page reports the design's registry and
#                   a token, and the element defined and rendering page 3 of 7.
#   components      what each version of the components layer serves, for two pages per version
#                   (the pagination alone, and the composition with the fixture's entries), from
#                   a scratch copy of the project: under Vite's dev server, every response
#                   headless Chromium's NetLog records, passing when a Lit version's bytes hold
#                   Lit's dev-mode warning (its development build) and a vanilla version's hold
#                   no Lit, and each stylesheet arrives as scripts/css-sheets.js's sheet module,
#                   none injected into the document; and from vite build, every emitted file raw
#                   and brotli, Lit in a chunk of its own, passing when the build succeeds, no
#                   file holds the dev-mode warning, and Lit is all in its chunk or, for vanilla,
#                   nowhere. The section prints its figures under its own heading, the element
#                   sources' lines and brotli bytes beside them as context, and reads no network.
#                   See "Components" below.
#   lint and format per setup: footprint, each tool's installed size, B's devDependencies and D's
#                   scratch packages included, passing when every tool and package is at its pin;
#                   time, the timings' means, passing when the lint, the format check, and both pass
#                   on the tree; leaves unchanged, each formatter configured to biome.json's options
#                   and Biome's defaults (D: Stylistic's and jsonc's rules), written over a copy of
#                   the tree and over a copy of the tracked JSON files, passing when every file
#                   comes out byte for byte the original, from a copy padded as below so a file the
#                   formatter skips fails it; restores, the same over copies whose line breaks and
#                   indentation lint-compare.js disturb rewrote (calls and arrays split and joined,
#                   some joins past the 100-column width, closing braces raised, every line
#                   re-indented to 0 or 4 spaces), code and JSON apart; both pass when the formatter
#                   exits 0 and the files that differ are the ones recorded below, a formatter that
#                   can't being a fact; scope, each formatter over a copy of the repository's
#                   tracked files, every file padded with three trailing newlines, which a formatter
#                   strips from any file it formats, so the files that change are the files it
#                   touched: the default scope recorded, JSON counted, and the row passing when the
#                   scope its configuration limits it to (Biome's files.includes, a .prettierignore
#                   that Prettier and oxfmt both read, the files globs of D's config) is the
#                   check's own, the code, JSON, and CSS files, exactly, less the CSS recorded
#                   below for D, whose formatter formats no CSS; rewrites, the same unpadded,
#                   recording each file the default run rewrites and its changed lines, every
#                   Markdown file named, passing
#                   when no code file changes and the padded default run reached every code file;
#                   direction, the layer rules over test/layers-tree.js's trees, which hold the
#                   files their imports name, passing when the flagged files are the violation files
#                   less the edges the rule can't express or the misses recorded below, and the
#                   allowed tree draws none but those recorded: Biome's and oxlint's rules, ESLint's
#                   no-restricted-imports, and the two resolved-file plugins under ESLint; surface,
#                   each setup's binaries on PATH, config files, and packages to keep current, with
#                   the installed packages under them. B's .prettierrc.json holds the options the
#                   formatters are matched with.
#                   Per tool, whether it runs as a native binary or on Node, as expected below.
#
# The GitHub and jsDelivr rows run against spike-html-design v0.7.0 always, and against this
# package's v0.1.0 once that tag is on GitHub (git ls-remote); until then each of the latter
# reports "not yet released", neither pass nor fail. Likewise the file:// pages load the
# element's JS forms from this working tree until v0.1.0 is released, and from jsDelivr at
# v0.1.0 after.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)

# rebuild SRC OUT COUNT: one watch-rebuild sample, as above. COUNT is the file holding the last
# stamp; SRC.orig is the source as copied.
if [[ "${1:-}" == rebuild ]]; then
  src=$2 out=$3 count=$4
  n=$(($(<"$count") + 1))
  echo "$n" >"$count"
  { cat "$src.orig"; echo "export const stamp = $n;"; } >"$src"
  for ((i = 0; i < 6000; i++)); do
    if grep -q "stamp = $n;" "$out" 2>/dev/null; then exit 0; fi
    sleep 0.005
  done
  echo "measure: no rebuild of $out after 30s" >&2
  exit 1
fi

design=${SPIKE_HTML_DESIGN:-$root/../spike-html-design}
design_tag=v0.7.0
own_tag=v0.1.0
design_slug=JaimeStill/spike-html-design
own_slug=JaimeStill/spike-html-conventions
jsdelivr=https://cdn.jsdelivr.net/gh/$design_slug@$design_tag
# B's packages: package.json's devDependencies, each NAME@VERSION, installed in node_modules by
# mise run install. ESLint and Prettier run from there (see lint_bin below).
mapfile -t dev_packages < <(node -e '
  const { devDependencies = {} } = require(process.argv[1]);
  for (const [name, version] of Object.entries(devDependencies)) console.log(name + "@" + version);
' "$root/package.json")
# The fourth setup's formatting packages: ESLint Stylistic for the code and eslint-plugin-jsonc
# for the JSON, installed into scratch. scripts/currency.sh reads this line.
stylistic_packages=(@stylistic/eslint-plugin@5.10.0 eslint-plugin-jsonc@3.4.2)
lit=$(node -p 'require(process.argv[1]).dependencies.lit' "$root/package.json")
# npm, mise's pin for this project, by its path, so neither node's bundled npm nor a global npm
# earlier on PATH runs instead.
npm=$(mise --cd "$root" which npm)
npm_flags=(--no-audit --no-fund --no-update-notifier)
# The npm node bundles, in node's install, which this script never runs.
node_npm="$(mise --cd "$root" where node)/lib/node_modules/npm"

fail() {
  echo "measure: $*" >&2
  exit 1
}
[[ -d "$root/node_modules/lit" ]] || fail "lit isn't installed; run mise run install first"
[[ -x "$root/node_modules/.bin/eslint" && -x "$root/node_modules/.bin/prettier" ]] ||
  fail "the devDependencies aren't installed; run mise run install first"
git -C "$design" rev-parse --verify --quiet "$design_tag^{commit}" >/dev/null ||
  fail "no $design_tag in $design; set SPIKE_HTML_DESIGN to a spike-html-design checkout"
design=$(cd "$design" && pwd)

scratch=$(mktemp -d "${TMPDIR:-/tmp}/spike-html-conventions-measure.XXXXXX")
watchers=()
work=""
# shellcheck disable=SC2329 # invoked by the trap below.
cleanup() {
  if ((${#watchers[@]} > 0)); then kill "${watchers[@]}" 2>/dev/null || true; fi
  rm -rf "$scratch" ${work:+"$work"}
}
trap cleanup EXIT
# Every step runs from scratch, so a tool that writes beside its working directory (pnpm store
# path creates and removes a file there) never touches the working tree.
cd "$scratch"

# The project's ESLint and Prettier, its devDependencies, on PATH ahead of everything else as
# eslint and prettier, each a link to the package's own bin script, so node runs it with no shim
# between. node_modules/.bin itself isn't put on PATH: it also holds typescript 6.0.3's tsc, which
# would shadow the pinned tsc.
lint_bin="$scratch/bin"
mkdir -p "$lint_bin"
ln -s "$root/node_modules/eslint/bin/eslint.js" "$lint_bin/eslint"
ln -s "$root/node_modules/prettier/bin/prettier.cjs" "$lint_bin/prettier"
export PATH="$lint_bin:$PATH"

# Every git command in scratch repositories runs with a fixed identity and no user config.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=measure GIT_AUTHOR_EMAIL=measure@localhost
export GIT_COMMITTER_NAME=measure GIT_COMMITTER_EMAIL=measure@localhost

# ---- The report's head: the date and every tool's version.

echo "## Measure, $(date -u +%Y-%m-%dT%H:%M:%SZ) (UTC)"
echo
echo "| tool | version |"
echo "| --- | --- |"
version() { printf '| %s | %s |\n' "$1" "$2"; }
version node "$(node --version)"
version pnpm "$(pnpm --version)"
version npm "$("$npm" --version --no-update-notifier) (mise pin, $npm; node bundles $(node -p 'require(process.argv[1]).version' "$node_npm/package.json"), unused)"
version bun "$(bun --version)"
version tsc "$(tsc --version)"
version esbuild "$(esbuild --version)"
version vite "$(vite --version | cut -d' ' -f1 | cut -d/ -f2)"
version hyperfine "$(hyperfine --version)"
version biome "$(biome --version)"
version eslint "$(eslint --version) (devDependency, from node_modules)"
version prettier "$(prettier --version) (devDependency, from node_modules)"
version oxlint "$(oxlint --version)"
version oxfmt "$(oxfmt --version)"
for spec in "${dev_packages[@]}"; do
  if [[ "${spec%@*}" == eslint || "${spec%@*}" == prettier ]]; then continue; fi
  version "${spec%@*}" "${spec##*@} (devDependency, for B; installed into scratch for D, Prettier aside)"
done
for spec in "${stylistic_packages[@]}"; do
  version "${spec%@*}" "${spec##*@} (installed into scratch for ESLint Stylistic, D; stylistic_packages in measure.sh)"
done
version shellcheck "$(shellcheck --version | sed -n 's/^version: //p')"
version chromium "$(chromium --version)"
version git "$(git --version)"
version lit "$lit (package dependency)"
echo

# ---- Footprint: each mise tool's install, from mise where, at its apparent size (du -sb, which
# counts a hard link once, as pnpm's three hard-linked binaries are). MB are 10^6 bytes.

echo "measure: footprint" >&2
echo "## Footprint"
echo
echo "Each mise tool's installed size on this platform, $(uname -sm), from \`mise where\` and \`du -sb\`."
echo
echo "| tool | column | installed size |"
echo "| --- | --- | ---: |"
# tool|column, every pin in mise.toml.
footprint_tools=(
  "node|Node" "npm|Node + npm" "pnpm|Node + pnpm" "npm:esbuild|Node, to bundle" "npm:vite|Node, to bundle" "bun|Bun"
  "github:microsoft/typescript-go|both (tsc)" "biome|lint comparison, A"
  "shellcheck|the check only" "aqua:sharkdp/hyperfine|the measure task only"
  "npm:oxlint|lint comparison, C" "npm:oxfmt|lint comparison, C"
)
# mb BYTES...: their sum in MB, to one decimal.
mb() { printf '%s\n' "$@" | awk '{ s += $1 } END { printf "%.1f MB", s / 1e6 }'; }
declare -A footprint_bytes
for entry in "${footprint_tools[@]}"; do
  tool=${entry%%|*}
  # From the project root, so each tool resolves to its mise.toml pin.
  bytes=$(du -sb "$(mise --cd "$root" where "$tool")" | cut -f1)
  footprint_bytes[$tool]=$bytes
  printf '| %s | %s | %s |\n' "$tool" "${entry#*|}" "$(mb "$bytes")"
done
echo
# column MANAGER: the Node column with MANAGER, alone, with esbuild, and with Vite.
column() {
  local node=${footprint_bytes[node]} manager=${footprint_bytes[$1]}
  echo "node + $1 = $(mb "$node" "$manager"), $(mb "$node" "$manager" "${footprint_bytes[npm:esbuild]}") with esbuild, $(mb "$node" "$manager" "${footprint_bytes[npm:vite]}") with Vite"
}
echo "Tools each column adds: Node + npm, $(column npm); Node + pnpm, $(column pnpm); Bun, bun = $(mb "${footprint_bytes[bun]}"). Vite runs on node; tsc is in both, and the check's ESLint and Prettier are devDependencies, not mise tools (the lint and format rows). node's size includes the npm $(node -p 'require(process.argv[1]).version' "$node_npm/package.json") it bundles, $(mb "$(du -sb "$node_npm" | cut -f1)"), which the npm column doesn't run: npm 12 is its own pin."
echo

# ---- Forms: lines and brotli bytes per file and per form of src/. Brotli is quality 11 with
# the brotli CLI's default 24-bit window, through bun's node:zlib (no brotli CLI is pinned), over
# the unminified source as jsDelivr serves it. A form's brotli total leaves out globals.d.ts,
# which no browser loads; its line total keeps it.

echo "measure: forms" >&2
echo "## Forms"
echo
echo "Lines (\`wc -l\`) and brotli bytes (quality 11, bun's node:zlib) of each file in src/."
echo
echo "| file | lines | brotli |"
echo "| --- | ---: | ---: |"
form_files=()
for form in ts jsdoc js; do
  for path in "$root"/src/"$form"/*; do form_files+=("${path#"$root/"}"); done
done
declare -A form_lines form_brotli form_count
while IFS=$'\t' read -r path bytes; do
  lines=$(wc -l <"$root/$path")
  printf '| %s | %s | %s B |\n' "$path" "$lines" "$bytes"
  form=${path#src/}
  form=${form%%/*}
  form_lines[$form]=$((${form_lines[$form]:-0} + lines))
  form_count[$form]=$((${form_count[$form]:-0} + 1))
  if [[ "$path" != *.d.ts ]]; then form_brotli[$form]=$((${form_brotli[$form]:-0} + bytes)); fi
done < <(cd "$root" && bun -e '
  const zlib = require("node:zlib");
  const fs = require("node:fs");
  const { BROTLI_PARAM_QUALITY, BROTLI_PARAM_LGWIN, BROTLI_PARAM_SIZE_HINT } = zlib.constants;
  for (const path of process.argv.slice(1)) {
    const data = fs.readFileSync(path);
    const params = { [BROTLI_PARAM_QUALITY]: 11, [BROTLI_PARAM_LGWIN]: 24, [BROTLI_PARAM_SIZE_HINT]: data.length };
    console.log(path + "\t" + zlib.brotliCompressSync(data, { params }).length);
  }' "${form_files[@]}")
echo
echo "| form | files | lines | brotli, without .d.ts |"
echo "| --- | ---: | ---: | ---: |"
for form in ts jsdoc js; do
  printf '| %s | %s | %s | %s B |\n' "src/$form" "${form_count[$form]}" "${form_lines[$form]}" "${form_brotli[$form]}"
done
echo

# ---- Fixtures: the scratch repository, and one consumer project per manager and install mode.

echo "measure: preparing fixtures in $scratch" >&2
own="$scratch/spike-html-conventions"
"$root/scripts/consumers.sh" repo "$own" >&2

# consumer DIR MANAGER: a copy of the manager's consumer fixture, each github: source rewritten
# to its local repository, the tag kept.
consumer() {
  local dir=$1 manager=$2
  cp -r "$root/fixtures/consumer-$manager" "$dir"
  node "$root/scripts/consumers.js" rewrite "$dir/package.json" \
    "spike-html-design|github:JaimeStill/spike-html-design#$design_tag|git+file://$design#$design_tag" \
    "spike-html-conventions|github:JaimeStill/spike-html-conventions#$own_tag|git+file://$own#$own_tag"
}
for mode in cold warm; do
  mkdir -p "$scratch/$mode"
  consumer "$scratch/$mode/pnpm" pnpm
  consumer "$scratch/$mode/npm" npm
  consumer "$scratch/$mode/npm-linked" npm
  consumer "$scratch/$mode/bun" bun
done

# Each manager's store or cache and its metadata cache are scratch, per mode: pnpm's store by
# --store-dir, its metadata cache and state under XDG_CACHE_HOME and XDG_STATE_HOME; npm's cache,
# the packages it packs from git included, by --cache; bun's cache, git clones included, by
# BUN_INSTALL_CACHE_DIR.
# pnpm_install, npm_install, and bun_install MODE print the command hyperfine times; pnpm_warm,
# npm_warm, and bun_warm PROJECT run the same install of another project against the warm store
# or cache.
pnpm_install() {
  local mode=$1
  echo "env XDG_CACHE_HOME=$scratch/$mode/pnpm-xdg/cache XDG_STATE_HOME=$scratch/$mode/pnpm-xdg/state" \
    "pnpm --dir $scratch/$mode/pnpm install --store-dir $scratch/$mode/pnpm-store"
}
# npm_install MODE [linked]: npm's default hoisted layout, or with linked its linked one, in a
# project and cache of its own.
npm_install() {
  local mode=$1
  if [[ "${2:-}" == linked ]]; then
    echo "$npm install --prefix $scratch/$mode/npm-linked --cache $scratch/$mode/npm-linked-cache ${npm_flags[*]} --install-strategy=linked"
  else
    echo "$npm install --prefix $scratch/$mode/npm --cache $scratch/$mode/npm-cache ${npm_flags[*]}"
  fi
}
bun_install() {
  local mode=$1
  echo "env BUN_INSTALL_CACHE_DIR=$scratch/$mode/bun-cache bun install --cwd $scratch/$mode/bun"
}
pnpm_warm() {
  local project=$1
  shift
  XDG_CACHE_HOME=$scratch/warm/pnpm-xdg/cache XDG_STATE_HOME=$scratch/warm/pnpm-xdg/state \
    pnpm --dir "$project" install --store-dir "$scratch/warm/pnpm-store" "$@"
}
npm_warm() {
  local project=$1
  shift
  "$npm" install --prefix "$project" --cache "$scratch/warm/npm-cache" "${npm_flags[@]}" "$@"
}
bun_warm() {
  BUN_INSTALL_CACHE_DIR=$scratch/warm/bun-cache bun install --cwd "$1"
}
clean_project() {
  echo "rm -rf $1/node_modules $1/pnpm-lock.yaml $1/package-lock.json $1/bun.lock $1/bun.lockb"
}

# The watchers' scratch copy of the sources, with Lit through a link to the installed one. It
# sits under the user's cache directory, on a disk filesystem as a working tree does, removed on
# exit: the native tsc watches with fanotify, which fails on a tmpfs /tmp (invalid cross-device
# link) and leaves tsc --watch never rebuilding.
work=$(mktemp -d "${XDG_CACHE_HOME:-$HOME/.cache}/spike-html-conventions-watch.XXXXXX")
cp -r "$root/src" "$root/package.json" "$root/tsconfig.json" "$root/tsconfig.build.json" "$work/"
ln -s "$root/node_modules" "$work/node_modules"
cp "$work/src/ts/pagination-lit.ts" "$work/src/ts/pagination-lit.ts.orig"

# The six element entries, as scripts/build.sh builds them.
entries() {
  local base=$1 form base_name
  for form in ts jsdoc js; do
    for base_name in lit vanilla; do
      if [[ "$form" == ts ]]; then echo "$base/src/$form/pagination-$base_name.ts"; else
        echo "$base/src/$form/pagination-$base_name.js"
      fi
    done
  done
}
mapfile -t root_entries < <(entries "$root")
mapfile -t work_entries < <(entries "$work")

# vite_config BASE OUT DIR: a Vite config, DIR/vite.config.mjs, building BASE's six element
# entries as an ES library into OUT, each output named for its entry under src
# (ts/pagination-lit.js, as the other bundlers name it). Lit is bundled (a library build externalizes nothing unasked), nothing is
# minified, and mode production resolves Lit's production export. Vite's root and cache are DIR,
# in scratch; the config is a plain object, with no import of vite, so it loads natively.
vite_config() {
  local base=$1 out=$2 dir=$3 entry name list=""
  while IFS= read -r entry; do
    name=${entry#"$base/src/"}
    list+="      \"${name%.*}\": \"$entry\",
"
  done < <(entries "$base")
  mkdir -p "$dir"
  cat >"$dir/vite.config.mjs" <<EOF
export default {
  root: "$dir",
  cacheDir: "$dir/vite-cache",
  publicDir: false,
  logLevel: "warn",
  mode: "production",
  build: {
    outDir: "$out",
    emptyOutDir: false,
    minify: false,
    reportCompressedSize: false,
    lib: {
      formats: ["es"],
      // .js, and the shared chunk below, whatever the nearest package.json's type, which would
      // otherwise pick .mjs or .js.
      fileName: (_format, name) => name + ".js",
      entry: {
$list      },
    },
    rolldownOptions: { output: { chunkFileNames: "[name]-[hash].js" } },
  },
};
EOF
}
vite_config "$root" "$scratch/build/vite" "$scratch/vite-build"
vite_config "$work" "$work/out/vite" "$scratch/vite-watch"

# ---- Timings.

# timing TITLE NOTE HYPERFINE_ARGS...: one hyperfine run, its markdown table under a heading,
# and its results as JSON in $scratch/timing.json until the next run.
# hyperfine 2 runs each command without a shell, so commands set variables with env and prepare
# with a single rm.
timing() {
  local title=$1 note=$2
  shift 2
  echo "measure: timing $title" >&2
  hyperfine --style basic --export-markdown "$scratch/timing.md" --export-json "$scratch/timing.json" \
    "$@" >&2
  echo "### $title"
  echo
  echo "$note"
  echo
  cat "$scratch/timing.md"
  echo
}

echo "## Timings (hyperfine)"
echo

timing "Install from a git tag, cold" \
  "spike-html-design $design_tag and this package $own_tag by git+file:// tag, Lit $lit from the registry into an empty store or cache, emptied before each run." \
  --runs 5 \
  --prepare "$(clean_project "$scratch/cold/pnpm") $scratch/cold/pnpm-store $scratch/cold/pnpm-xdg" \
  -n "Node: pnpm install" "$(pnpm_install cold)" \
  --prepare "$(clean_project "$scratch/cold/npm") $scratch/cold/npm-cache" \
  -n "Node: npm install" "$(npm_install cold)" \
  --prepare "$(clean_project "$scratch/cold/npm-linked") $scratch/cold/npm-linked-cache" \
  -n "Node: npm install --install-strategy=linked" "$(npm_install cold linked)" \
  --prepare "$(clean_project "$scratch/cold/bun") $scratch/cold/bun-cache" \
  -n "Bun: bun install" "$(bun_install cold)"

timing "Install from a git tag, warm" \
  "The same installs with the store or cache kept from a warmup run; node_modules and the lockfile removed before each run." \
  --runs 10 --warmup 1 \
  --prepare "$(clean_project "$scratch/warm/pnpm")" \
  -n "Node: pnpm install" "$(pnpm_install warm)" \
  --prepare "$(clean_project "$scratch/warm/npm")" \
  -n "Node: npm install" "$(npm_install warm)" \
  --prepare "$(clean_project "$scratch/warm/npm-linked")" \
  -n "Node: npm install --install-strategy=linked" "$(npm_install warm linked)" \
  --prepare "$(clean_project "$scratch/warm/bun")" \
  -n "Bun: bun install" "$(bun_install warm)"

# The npm columns time the layouts they name, or the timings compare something else: linked links
# each direct dependency from its node_modules/.store, and hoisted has no .store.
for mode in cold warm; do
  modules="$scratch/$mode/npm-linked/node_modules"
  [[ -d "$modules/.store" && -L "$modules/spike-html-conventions" ]] ||
    fail "npm's linked $mode install didn't link from node_modules/.store: $(find "$modules/" -mindepth 1 -maxdepth 1 -printf "%f ")"
  modules="$scratch/$mode/npm/node_modules"
  [[ ! -e "$modules/.store" && -d "$modules/spike-html-conventions" && ! -L "$modules/spike-html-conventions" ]] ||
    fail "npm's hoisted $mode install isn't hoisted: $(find "$modules/" -mindepth 1 -maxdepth 1 -printf "%f ")"
done
echo "Each npm column's layout, checked: linked links each direct dependency from node_modules/.store; hoisted has no .store."
echo

timing "Type check" \
  "tsc --noEmit over the .ts and JSDoc forms. The native tsc is one tool for both columns." \
  --runs 10 --warmup 1 \
  -n "Both: tsc --noEmit" "tsc --noEmit -p $root"

timing "Build" \
  "Node: tsc emit of the .ts and JSDoc forms, esbuild bundling all six element entries, Lit included, in one invocation, and a Vite library build of the same six (Lit in one shared chunk); Bun: bun build of the same six. None minified; output in scratch." \
  --runs 10 --warmup 1 \
  -n "Node: tsc emit" "tsc -p $root/tsconfig.build.json --outDir $scratch/build/tsc" \
  -n "Node: esbuild" "esbuild ${root_entries[*]} --bundle --format=esm --log-level=warning --outbase=$root/src --outdir=$scratch/build/esbuild" \
  -n "Node: vite build" "vite build --configLoader native --config $scratch/vite-build/vite.config.mjs" \
  -n "Bun: bun build" "env NODE_ENV=production bun build ${root_entries[*]} --target=browser --format=esm --root=$root/src --outdir=$scratch/build/bun"

# The bundles are what the Build note says, or the timings compare something else: each of the
# six entries is written; esbuild and bun build inline Lit, so no entry imports anything; Vite
# writes one shared chunk beside them, which each Lit entry imports and no vanilla one does; and
# no output carries Lit's development build, whose lit-html warns "Lit is in dev mode".
shapes=()
for tool in esbuild vite bun; do
  out="$scratch/build/$tool"
  mapfile -t chunks < <(find "$out" -maxdepth 1 -type f -name '*.js' -printf '%f\n')
  if [[ "$tool" == vite ]]; then want=1; else want=0; fi
  ((${#chunks[@]} == want)) || fail "$tool wrote ${#chunks[@]} shared chunks, not $want: ${chunks[*]}"
  for entry in "${root_entries[@]}"; do
    name=${entry#"$root/src/"}
    file="$out/${name%.*}.js"
    [[ -f "$file" ]] || fail "$tool wrote no ${name%.*}.js"
    imports=$(grep -c '^import ' "$file" || true)
    if [[ "$tool" == vite && "$name" == *-lit.* ]]; then
      grep -q "^import .* from \"\.\./${chunks[0]}\";\$" "$file" ||
        fail "vite's ${name%.*}.js doesn't import the shared chunk ${chunks[0]}"
    elif ((imports != 0)); then
      fail "$tool's ${name%.*}.js imports $imports modules, where Lit should be inlined"
    fi
  done
  ! grep -rqF "Lit is in dev mode" "$out" || fail "$tool bundled Lit's development build"
  if [[ "$tool" == vite ]]; then
    shapes+=("vite: six entries and one shared chunk, ${chunks[0]}, $(wc -c <"$out/${chunks[0]}") bytes, imported by each Lit entry")
  else
    shapes+=("$tool: six self-contained entries, Lit inlined in each Lit entry")
  fi
done
printf -v shape '%s; ' "${shapes[@]}"
echo "Each bundle's shape, checked: ${shape%; }. None carries Lit's development build."
echo

# The watchers, each over the scratch copy, into its own output directory.
echo "measure: starting watchers" >&2
tsc -p "$work/tsconfig.build.json" --outDir "$work/out/tsc" --watch --preserveWatchOutput \
  >"$scratch/watch-tsc.log" 2>&1 &
watchers+=($!)
# --watch=forever: a background job's stdin is closed, which ends a plain --watch.
esbuild "${work_entries[@]}" --bundle --format=esm --log-level=warning --outbase="$work/src" \
  --outdir="$work/out/esbuild" --watch=forever >"$scratch/watch-esbuild.log" 2>&1 &
watchers+=($!)
# Vite's watcher runs from its scratch config directory, its root.
(cd "$scratch/vite-watch" && exec vite build --configLoader native --config vite.config.mjs --watch) \
  >"$scratch/watch-vite.log" 2>&1 &
watchers+=($!)
NODE_ENV=production bun build "${work_entries[@]}" --target=browser --format=esm \
  --root="$work/src" --outdir="$work/out/bun" --watch --no-clear-screen \
  >"$scratch/watch-bun.log" 2>&1 &
watchers+=($!)
for tool in tsc esbuild vite bun; do
  for ((i = 0; i < 600; i++)); do
    [[ -f "$work/out/$tool/ts/pagination-lit.js" ]] && break
    sleep 0.1
  done
  [[ -f "$work/out/$tool/ts/pagination-lit.js" ]] ||
    fail "the $tool watcher built nothing; its log: $(cat "$scratch/watch-$tool.log")"
done
sleep 1
for tool in tsc esbuild vite bun; do echo 0 >"$scratch/count-$tool"; done

rebuild() {
  echo "$root/scripts/measure.sh rebuild $work/src/ts/pagination-lit.ts $work/out/$1/ts/pagination-lit.js $scratch/count-$1"
}
timing "Watch rebuild" \
  "From a change to src/ts/pagination-lit.ts in a scratch copy to the watcher's rebuilt output holding the change, polled every 5 ms; each sample includes a bash startup." \
  --runs 10 --warmup 2 \
  -n "Node: tsc --watch" "$(rebuild tsc)" \
  -n "Node: esbuild --watch" "$(rebuild esbuild)" \
  -n "Node: vite build --watch" "$(rebuild vite)" \
  -n "Bun: bun build --watch" "$(rebuild bun)"
kill "${watchers[@]}" 2>/dev/null || true
watchers=()

timing "Test" \
  "The shared route-matcher suite over all three forms." \
  --runs 10 --warmup 1 \
  -n "Node: node --test" "node --test $root/test/" \
  -n "Bun: bun test" "bun test $root/test/"

# ---- Lint and format: the four setups' tools, configs, and tree, all under $lint.

echo "measure: lint and format setups" >&2
lint="$scratch/lint"
mkdir -p "$lint"
# D's packages, installed into scratch at $lint, where every generated config under $lint imports
# them from: B's devDependencies but Prettier, and stylistic_packages, so D's footprint is an
# install of its own, as a repository holding D would have. --legacy-peer-deps keeps npm from
# installing peers beside them that D wouldn't pin. B's packages are the project's node_modules.
d_packages=()
for spec in "${dev_packages[@]}"; do
  if [[ "${spec%@*}" != prettier ]]; then d_packages+=("$spec"); fi
done
d_packages+=("${stylistic_packages[@]}")
status=0
"$npm" install --prefix "$lint" --cache "$lint/npm-cache" "${npm_flags[@]}" --legacy-peer-deps \
  --save-exact "${d_packages[@]}" >"$lint/install.log" 2>&1 || status=$?
((status == 0)) || fail "npm couldn't install ${d_packages[*]} into scratch: $(tail -n1 "$lint/install.log")"
# B's installed packages: the devDependencies' closure in the project's node_modules, each a
# directory in pnpm's virtual store, the project's own root left out, and so are the optional
# dependencies pnpm lists but didn't install for this platform (unrs-resolver's other bindings).
b_dirs=()
while IFS= read -r dir; do
  if [[ "$dir" != "$root" && -f "$dir/package.json" ]]; then b_dirs+=("$dir"); fi
done < <(cd "$root" && pnpm list --dev --parseable --depth Infinity)
((${#b_dirs[@]} > 0)) || fail "pnpm lists no devDependencies in $root/node_modules"
lint_compare() { node "$root/scripts/lint-compare.js" "$@"; }
# The tree: the code each setup lints and formats, with each linter's config at its root. Every
# copy and tree sits under $lint, so the ESLint configs import the packages installed there. Lit is
# copied into the tree's node_modules, so the resolved-file rules resolve it.
tree="$lint/tree"
mkdir -p "$tree/node_modules"
cp -r "$root/src" "$root/layers" "$root/test" "$tree/"
cp -rL "$root/node_modules/lit" "$tree/node_modules/"
lint_compare biome-config "$root/biome.json" "$tree/biome.json"
# B's and D's lint config is the repository's eslint.config.js, by -c; D's format config is
# Stylistic's and jsonc's rules alone, and its lint and format config both in one, importing the
# repository's.
lint_compare eslint-config "$root/biome.json" "$tree/format-d.config.mjs" stylistic
lint_compare eslint-config "$root/biome.json" "$tree/lint-format-d.config.mjs" repo+stylistic
lint_compare oxlint-config "$tree/.oxlintrc.json" merged
# The Prettier options both Prettier and oxfmt read, and the same with embedded formatting at its
# default, auto, to show what that one option changes.
format_options=$(lint_compare format-options "$root/biome.json" "$lint/format.json")
stylistic_options=$(lint_compare stylistic-options "$root/biome.json")
node -e '
  const fs = require("node:fs");
  const options = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  fs.writeFileSync(process.argv[2], JSON.stringify({ ...options, embeddedLanguageFormatting: "auto" }));
' "$lint/format.json" "$lint/format-embedded.json"
# Each setup's lint and format check over the tree, as hyperfine runs them, from the tree's root:
# Biome reads the biome.json there, and refuses one nested below its working directory as a
# second root; ESLint takes its config by -c, the repository's for the lint;
# oxlint and the formatters are pointed at theirs. Biome's VCS integration is off, the tree
# being no repository. B and D lint with the same config, so D's lint row is B's; D's lint +
# format is one ESLint run with both configs' rules, as D would run them.
tree_paths="src layers test"
setups=(A B C D)
declare -A setup_name=([A]="Biome" [B]="ESLint + Prettier" [C]="oxlint + oxfmt"
  [D]="ESLint + ESLint Stylistic")
declare -A lint_label=([A]="A: biome lint" [B]="B: eslint" [C]="C: oxlint" [D]="D: eslint")
declare -A format_label=([A]="A: biome format" [B]="B: prettier --check" [C]="C: oxfmt --check"
  [D]="D: eslint, Stylistic and jsonc rules")
declare -A lint_cmd=(
  [A]="biome lint --vcs-enabled=false $tree_paths"
  [B]="eslint -c $root/eslint.config.js $tree_paths"
  [C]="oxlint -c .oxlintrc.json $tree_paths"
  [D]="eslint -c $root/eslint.config.js $tree_paths"
)
declare -A format_cmd=(
  [A]="biome format --vcs-enabled=false $tree_paths"
  [B]="prettier --check --config $root/.prettierrc.json $tree_paths"
  [C]="oxfmt --check -c $lint/format.json $tree_paths"
  [D]="eslint -c format-d.config.mjs $tree_paths"
)
declare -A both_cmd=(
  [A]="bash -c '${lint_cmd[A]}; ${format_cmd[A]}'"
  [B]="bash -c '${lint_cmd[B]}; ${format_cmd[B]}'"
  [C]="bash -c '${lint_cmd[C]}; ${format_cmd[C]}'"
  [D]="eslint -c lint-format-d.config.mjs $tree_paths"
)
# Each command once, its exit status kept for the time rows: a lint or a check that fails on the
# tree fails its row, where the timings run on regardless (-i).
declare -A lint_status format_status both_status
cd "$tree"
for setup in "${setups[@]}"; do
  status=0
  bash -c "${lint_cmd[$setup]}" >"$lint/lint-$setup.log" 2>&1 || status=$?
  lint_status[$setup]=$status
  status=0
  bash -c "${format_cmd[$setup]}" >"$lint/format-$setup.log" 2>&1 || status=$?
  format_status[$setup]=$status
  status=0
  bash -c "${both_cmd[$setup]}" >"$lint/both-$setup.log" 2>&1 || status=$?
  both_status[$setup]=$status
done

timing "Lint and format" \
  "Each setup over one copy of src/, layers/, and test/ ($(find src layers test -type f | wc -l) files): A, Biome with biome.json and the superseded layer overrides (scripts/biome-layers.json); B, the check's ESLint config, eslint.config.js (@eslint/js's and typescript-eslint's recommended rules and the layer table in eslint-plugin-boundaries), and Prettier, from the project's devDependencies; C, oxlint's default rules and the layer rules, and oxfmt; D, B's ESLint config, and ESLint Stylistic's rules. The formatters check against biome.json's options, which B's .prettierrc.json holds. lint + format is both in one bash -c, a bash startup included, except D's, one eslint run with both configs' rules." \
  --runs 10 --warmup 1 -i \
  -n "${lint_label[A]}" "${lint_cmd[A]}" \
  -n "${format_label[A]}" "${format_cmd[A]}" \
  -n "A: lint + format" "${both_cmd[A]}" \
  -n "${lint_label[B]}" "${lint_cmd[B]}" \
  -n "${format_label[B]}" "${format_cmd[B]}" \
  -n "B: lint + format" "${both_cmd[B]}" \
  -n "${lint_label[C]}" "${lint_cmd[C]}" \
  -n "${format_label[C]}" "${format_cmd[C]}" \
  -n "C: lint + format" "${both_cmd[C]}" \
  -n "${format_label[D]}" "${format_cmd[D]}" \
  -n "D: lint + format" "${both_cmd[D]}"
cd "$scratch"
# Each timing's mean wall time and its standard deviation in ms, by its name.
declare -A lint_ms
while IFS=$'\t' read -r name ms; do lint_ms[$name]=$ms; done < <(node -e '
  for (const { name, summary } of JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).results) {
    const { mean, stddev } = summary.time_wall_clock;
    console.log(name + "\t" + (mean * 1000).toFixed(1) + " ms ± " + (stddev * 1000).toFixed(1));
  }' "$scratch/timing.json")

# ---- Rows.

failed=0
rows=()
# row NAME OK OBSERVED: one row, pass when OK is 1. The observed fact is one line, with any pipe
# escaped for the table.
row() {
  local name=$1 ok=$2 observed
  observed=$(tr '\n' ' ' <<<"$3" | sed -e 's/  */ /g' -e 's/ *$//' -e 's/|/\\|/g')
  if [[ "$ok" == 1 ]]; then rows+=("| $name | pass | $observed |"); else
    rows+=("| $name | FAIL | $observed |")
    failed=1
  fi
}

# unreleased NAME: a row that waits for this package's release, neither pass nor fail.
unreleased() {
  rows+=("| $1 | not yet released | no $own_tag tag on github.com/$own_slug (git ls-remote) |")
}

# names DIR: the names in DIR, sorted, on one line.
names() {
  find "$1/" -mindepth 1 -maxdepth 1 -printf '%f\n' 2>/dev/null | LC_ALL=C sort | tr '\n' ' '
}

# files DIR: DIR's files, relative and sorted, leaving out bun's .bun-tag marker.
files() {
  (cd "$1" && find . -type f ! -name .bun-tag | sed 's|^\./||' | LC_ALL=C sort)
}

# differing DIR TREE: the files in DIR that aren't TREE's byte for byte, on one line.
differing() {
  local path
  while IFS= read -r path; do
    cmp -s "$2/$path" "$1/$path" || printf '%s ' "$path"
  done < <(files "$1")
}

# first_line PATTERN FILE: the first line of FILE matching PATTERN, trimmed of box drawing.
first_line() {
  grep -m1 -E "$1" "$2" | sed -e 's/^[[:space:]│×╰─▶]*//' || true
}

echo "measure: refusal rows" >&2
# Node: the warm pnpm consumer holds the installed package; import its .ts form by its export.
status=0
(cd "$scratch/warm/pnpm" && node -e 'await import("spike-html-conventions/ts/router")') \
  >"$scratch/strip.log" 2>&1 || status=$?
# The error's own line, up to the installed file's path.
code=$(first_line '\[ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING\]' "$scratch/strip.log" |
  sed 's/, for "file:.*//')
ok=0
if ((status != 0)) && [[ -n "$code" ]]; then ok=1; fi
row "Node won't strip types under node_modules (import spike-html-conventions/ts/router from the pnpm consumer)" \
  "$ok" "exit $status; ${code:-$(tail -n1 "$scratch/strip.log")}"

status=0
(cd "$scratch/warm/bun" && bun -e 'const m = await import("spike-html-conventions/ts/router"); console.log(Object.keys(m).join(", "))') \
  >"$scratch/strip-bun.log" 2>&1 || status=$?
ok=0
if ((status == 0)); then ok=1; fi
row "Bun imports the .ts form under node_modules (the same import from the bun consumer)" \
  "$ok" "exit $status; exports $(tail -n1 "$scratch/strip-bun.log")"

# A throwaway package whose one dependency is spike-html-design by git tag, itself tagged.
exotic="$scratch/exotic"
mkdir -p "$exotic"
printf '{ "name": "exotic", "version": "0.0.1", "dependencies": { "spike-html-design": "git+file://%s#%s" } }\n' \
  "$design" "$design_tag" >"$exotic/package.json"
(cd "$exotic" && git init -q -b main && git add -A && git commit -q -m v0.0.1 && git tag -a v0.0.1 -m v0.0.1)
for manager in pnpm bun; do
  mkdir -p "$scratch/exotic-$manager"
  printf '{ "name": "exotic-%s", "private": true, "dependencies": { "exotic": "git+file://%s#v0.0.1" } }\n' \
    "$manager" "$exotic" >"$scratch/exotic-$manager/package.json"
done
status=0
# The ndjson reporter gives the error's code and message unwrapped.
pnpm_warm "$scratch/exotic-pnpm" --reporter ndjson >"$scratch/exotic-pnpm.log" 2>&1 || status=$?
reason=$(grep -m1 '"code":"ERR_PNPM_EXOTIC_SUBDEP"' "$scratch/exotic-pnpm.log" |
  node -e 'const e = JSON.parse(require("fs").readFileSync(0, "utf8")); console.log(e.code + ": " + e.message)' \
    2>/dev/null || true)
ok=0
if ((status != 0)) && [[ -n "$reason" ]]; then ok=1; fi
row "pnpm refuses a git-tag package that carries a git-tag dependency" "$ok" \
  "exit $status; ${reason:-no ERR_PNPM_EXOTIC_SUBDEP; $(tail -n1 "$scratch/exotic-pnpm.log")}"

# The refusal is a default: the same consumer with blockExoticSubdeps: false in its
# pnpm-workspace.yaml installs the package and its git-tag dependency.
lifted="$scratch/exotic-pnpm-lifted"
mkdir -p "$lifted"
cp "$scratch/exotic-pnpm/package.json" "$lifted/"
echo "blockExoticSubdeps: false" >"$lifted/pnpm-workspace.yaml"
status=0
pnpm_warm "$lifted" --reporter append-only >"$scratch/exotic-pnpm-lifted.log" 2>&1 || status=$?
ok=0
# pnpm links the dependency beside the package in its virtual store; .. resolves from the link's
# target.
if ((status == 0)) && [[ -f "$lifted/node_modules/exotic/../spike-html-design/package.json" ]]; then
  ok=1
fi
row "pnpm installs the same package with blockExoticSubdeps: false in the consumer's pnpm-workspace.yaml" \
  "$ok" "exit $status; exotic's virtual-store node_modules holds $(names "$lifted/node_modules/exotic/..")"

status=0
bun_warm "$scratch/exotic-bun" >"$scratch/exotic-bun.log" 2>&1 || status=$?
ok=0
if ((status == 0)) && [[ -f "$scratch/exotic-bun/node_modules/spike-html-design/package.json" ]]; then
  ok=1
fi
row "Bun installs the same package and its git-tag dependency" "$ok" \
  "exit $status; node_modules holds $(names "$scratch/exotic-bun/node_modules")"

# npm_project DIR ALLOW NAME SPEC: a consumer with the one dependency NAME at SPEC, and
# allow-git=ALLOW in its .npmrc, or no .npmrc when ALLOW is empty.
npm_project() {
  mkdir -p "$1"
  printf '{ "name": "%s", "private": true, "dependencies": { "%s": "%s" } }\n' "${1##*/}" "$3" "$4" \
    >"$1/package.json"
  if [[ -n "$2" ]]; then echo "allow-git=$2" >"$1/.npmrc"; fi
}
# npm_lines LEVEL LOG: npm's LEVEL (error or warn) lines in LOG, but the debug log's path, joined.
npm_lines() {
  sed -n "s/^npm $1 //p" "$2" | grep -v 'complete log of this run' | paste -s -d ';' - |
    sed 's/;/; /g' || true
}

echo "measure: npm rows" >&2
# npm 12 with no opt-in: a consumer of spike-html-design by git tag, and no .npmrc.
npm_project "$scratch/npm-default" "" spike-html-design "git+file://$design#$design_tag"
status=0
npm_warm "$scratch/npm-default" >"$scratch/npm-default.log" 2>&1 || status=$?
# EALLOWGIT, refusing spike-html-design itself, by the default that disables every git
# dependency, not the non-root one allow-git=root sets.
ok=0
if ((status != 0)) && grep -qx 'npm error code EALLOWGIT' "$scratch/npm-default.log" &&
  grep -qx 'npm error Fetching packages of type "git" have been disabled' "$scratch/npm-default.log" &&
  grep -qF 'npm error Refusing to fetch "spike-html-design@' "$scratch/npm-default.log" &&
  [[ ! -e "$scratch/npm-default/node_modules/spike-html-design" ]]; then
  ok=1
fi
row "npm refuses a git-tag dependency with no allow-git opt-in (npm 12's default, allow-git=none)" \
  "$ok" "exit $status; $(npm_lines error "$scratch/npm-default.log")"

# The throwaway git-tag package above, with its own git-tag dependency, under each opt-in.
for allow in root all; do
  npm_project "$scratch/exotic-npm-$allow" "$allow" exotic "git+file://$exotic#v0.0.1"
  status=0
  npm_warm "$scratch/exotic-npm-$allow" >"$scratch/exotic-npm-$allow.log" 2>&1 || status=$?
  nested="$scratch/exotic-npm-$allow/node_modules/spike-html-design/package.json"
  ok=0
  if [[ "$allow" == root ]]; then
    # root admits the consumer's own git dependency and refuses exotic's: the refusal is the
    # non-root one, and names spike-html-design, which npm reads only from exotic's manifest.
    if ((status != 0)) && grep -qx 'npm error code EALLOWGIT' "$scratch/exotic-npm-$allow.log" &&
      grep -qx 'npm error Fetching non-root packages of type "git" have been disabled' \
        "$scratch/exotic-npm-$allow.log" &&
      grep -qF 'npm error Refusing to fetch "spike-html-design@' "$scratch/exotic-npm-$allow.log" &&
      [[ ! -f "$nested" ]]; then
      ok=1
    fi
    row "npm with allow-git=root refuses a git-tag package's own git-tag dependency" "$ok" \
      "exit $status; $(npm_lines error "$scratch/exotic-npm-$allow.log")"
  else
    if ((status == 0)) && [[ -f "$nested" ]]; then ok=1; fi
    row "npm with allow-git=all installs the same package and its git-tag dependency" "$ok" \
      "exit $status; node_modules holds $(names "$scratch/exotic-npm-$allow/node_modules")"
  fi
done

# A throwaway git-tag package whose prepare script writes prepared.txt, installed with
# allow-git=root and no allowScripts entry, then again with --ignore-scripts.
prep="$scratch/prep"
mkdir -p "$prep"
cat >"$prep/package.json" <<'EOF'
{ "name": "prep", "version": "0.0.1", "scripts": { "prepare": "node -e \"require('fs').writeFileSync('prepared.txt', 'yes')\"" } }
EOF
(cd "$prep" && git init -q -b main && git add -A && git commit -q -m v0.0.1 && git tag -a v0.0.1 -m v0.0.1)
prep_sha=$(git -C "$prep" rev-parse HEAD)
# prep_outcome PROJECT STATUS: sets outcome, one of ran (prep installed with prepare's output),
# skipped (installed without it), or failed (not installed), and result, the same in words.
prep_outcome() {
  local installed="$1/node_modules/prep"
  if (($2 != 0)) || [[ ! -f "$installed/package.json" ]]; then
    outcome=failed result="prep not installed"
  elif [[ -f "$installed/prepared.txt" ]]; then
    outcome=ran result="prepare ran (prepared.txt installed)"
  else
    outcome=skipped result="installed, no prepared.txt"
  fi
}
observed=()
ran=()
for variant in default ignore-scripts; do
  npm_project "$scratch/prep-$variant" root prep "git+file://$prep#v0.0.1"
  status=0
  if [[ "$variant" == default ]]; then
    npm_warm "$scratch/prep-$variant" >"$scratch/prep-$variant.log" 2>&1 || status=$?
  else
    npm_warm "$scratch/prep-$variant" --ignore-scripts >"$scratch/prep-$variant.log" 2>&1 ||
      status=$?
  fi
  prep_outcome "$scratch/prep-$variant" "$status"
  ran+=("$outcome")
  warned=$(grep -m1 '^npm warn install-scripts .*blocked' "$scratch/prep-$variant.log" |
    sed -e 's/^npm warn install-scripts //' -e 's/:$//' || true)
  observed+=("$variant: exit $status, $result${warned:+, npm warned: $warned}")
done
# The default installs prepare's output while warning that prep's prepare was blocked;
# --ignore-scripts installs prep without it.
ok=0
if [[ "${ran[*]}" == "ran skipped" ]] &&
  grep -qE '^npm warn install-scripts +prep@0\.0\.1 \(prepare: ' "$scratch/prep-default.log"; then
  ok=1
fi
printf -v result '%s; ' "${observed[@]}"
row "npm runs a git dependency's prepare when it packs the clone, though allowScripts reports it blocked; --ignore-scripts skips it" \
  "$ok" "${result%; }"

# The same package under pnpm: by default, with its resolved spec in allowBuilds, and with
# --ignore-scripts. allowBuilds takes the spec pnpm names in its refusal, the commit included;
# the bare name "prep" doesn't admit a git-hosted package.
observed=()
ran=()
for variant in default allowBuilds ignore-scripts; do
  project="$scratch/prep-pnpm-$variant"
  mkdir -p "$project"
  printf '{ "name": "prep-pnpm-%s", "private": true, "dependencies": { "prep": "git+file://%s#v0.0.1" } }\n' \
    "$variant" "$prep" >"$project/package.json"
  flags=(--reporter ndjson)
  case $variant in
    allowBuilds)
      printf 'allowBuilds:\n  "prep@git+file://%s#%s": true\n' "$prep" "$prep_sha" \
        >"$project/pnpm-workspace.yaml"
      ;;
    ignore-scripts) flags+=(--ignore-scripts) ;;
  esac
  status=0
  pnpm_warm "$project" "${flags[@]}" >"$scratch/prep-pnpm-$variant.log" 2>&1 || status=$?
  prep_outcome "$project" "$status"
  ran+=("$outcome")
  # The ndjson reporter gives the refusal's code unwrapped.
  refused=$(grep -m1 '"code":"ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED"' "$scratch/prep-pnpm-$variant.log" |
    node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf8")).code)' 2>/dev/null || true)
  observed+=("$variant: exit $status, $result${refused:+, pnpm refused: $refused}")
done
# The default refuses the install with ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED; allowBuilds runs
# prepare; --ignore-scripts installs prep without it.
ok=0
if [[ "${ran[*]}" == "failed ran skipped" ]] &&
  grep -q '"code":"ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED"' "$scratch/prep-pnpm-default.log"; then
  ok=1
fi
printf -v result '%s; ' "${observed[@]}"
row "pnpm refuses a git dependency whose prepare isn't in allowBuilds (ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED); allowBuilds runs it; --ignore-scripts skips it" \
  "$ok" "${result%; }"

# The same package under bun: by default, and with prep in trustedDependencies.
observed=()
ran=()
for variant in default trustedDependencies; do
  project="$scratch/prep-bun-$variant"
  mkdir -p "$project"
  trusted=""
  if [[ "$variant" == trustedDependencies ]]; then trusted=', "trustedDependencies": ["prep"]'; fi
  printf '{ "name": "prep-bun-%s", "private": true, "dependencies": { "prep": "git+file://%s#v0.0.1" }%s }\n' \
    "$variant" "$prep" "$trusted" >"$project/package.json"
  status=0
  bun_warm "$project" >"$scratch/prep-bun-$variant.log" 2>&1 || status=$?
  prep_outcome "$project" "$status"
  ran+=("$outcome")
  blocked=$(grep -m1 -E '^Blocked [0-9]+ ' "$scratch/prep-bun-$variant.log" || true)
  # bun pm untrusted names each blocked script by its lifecycle event.
  listed=$( (cd "$project" && BUN_INSTALL_CACHE_DIR=$scratch/warm/bun-cache bun pm untrusted) 2>&1 |
    grep -m1 -o '\[prepare\]' || true)
  observed+=("$variant: exit $status, $result${blocked:+, bun printed: $blocked}${listed:+, bun pm untrusted lists $listed}")
done
# The default installs prep without running prepare and reports it blocked, in the install's
# output and in bun pm untrusted; trustedDependencies runs it.
ok=0
if [[ "${ran[*]}" == "skipped ran" ]] &&
  grep -qE '^Blocked 1 ' "$scratch/prep-bun-default.log" &&
  [[ "${observed[0]}" == *"bun pm untrusted lists [prepare]"* ]]; then
  ok=1
fi
printf -v result '%s; ' "${observed[@]}"
row "Bun installs a git dependency without running its prepare and reports it blocked; trustedDependencies runs it" \
  "$ok" "${result%; }"

echo "measure: layout rows" >&2
# Each layout installs into projects of its own, against a cache or store of its own under
# $layout: npm-hoisted is npm's default, npm-linked is --install-strategy=linked, pnpm is pnpm's
# default isolated layout, pnpm-hoisted is nodeLinker: hoisted in the project's
# pnpm-workspace.yaml, bun is bun install's default, and bun-isolated is --linker isolated.
layout="$scratch/layout"
mkdir -p "$layout"
declare -A layout_label=(
  [npm-hoisted]="npm hoisted (default)" [npm-linked]="npm --install-strategy=linked"
  [pnpm]="pnpm isolated (default)" [pnpm-hoisted]="pnpm nodeLinker: hoisted"
  [bun]="bun install (default; hoisted for a project with no workspaces)"
  [bun-isolated]="bun install --linker isolated"
)
# layout_project LAYOUT DIR DEPENDENCIES: a project with the dependencies object DEPENDENCIES, and
# under pnpm-hoisted its pnpm-workspace.yaml.
layout_project() {
  mkdir -p "$2"
  printf '{ "name": "%s", "private": true, "dependencies": %s }\n' "${2##*/}" "$3" >"$2/package.json"
  if [[ "$1" == pnpm-hoisted ]]; then echo "nodeLinker: hoisted" >"$2/pnpm-workspace.yaml"; fi
}
# layout_install LAYOUT DIR [frozen]: installs DIR in LAYOUT against the layout's cache or store;
# with frozen, from its lockfile only (npm ci, pnpm install --frozen-lockfile, bun install
# --frozen-lockfile).
layout_install() {
  local cache="$layout/$1-cache" verb=install
  case $1 in
    npm-*)
      if [[ "${3:-}" == frozen ]]; then verb=ci; fi
      local flags=("${npm_flags[@]}")
      if [[ "$1" == npm-linked ]]; then flags+=(--install-strategy=linked); fi
      "$npm" "$verb" --prefix "$2" --cache "$cache" "${flags[@]}"
      ;;
    pnpm*)
      local flags=(--store-dir "$cache" --reporter append-only)
      if [[ "${3:-}" == frozen ]]; then flags+=(--frozen-lockfile); fi
      XDG_CACHE_HOME=$cache-xdg/cache XDG_STATE_HOME=$cache-xdg/state \
        pnpm --dir "$2" install "${flags[@]}"
      ;;
    bun*)
      local flags=()
      if [[ "$1" == bun-isolated ]]; then flags+=(--linker isolated); fi
      if [[ "${3:-}" == frozen ]]; then flags+=(--frozen-lockfile); fi
      BUN_INSTALL_CACHE_DIR=$cache bun install --cwd "$2" "${flags[@]}"
      ;;
  esac
}
# The files each manager writes into node_modules about the install rather than a package's.
layout_meta=(! -name .package-lock.json ! -name .modules.yaml ! -name '.pnpm-workspace-state*'
  ! -path '*/.pnpm/lock.yaml' ! -name .bun-tag)

# Phantom dependency: three local packages as tarballs, a depending on b and b on c, and a
# consumer declaring only a. a's second module, a/reach.js, imports c, which a doesn't declare:
# a dependency's own phantom, where the consumer's import of b is the consumer's.
phantom="$layout/phantom"
for each in c: b:c a:b; do
  name=${each%%:*} dependency=${each#*:} dependencies='{}'
  if [[ -n "$dependency" ]]; then dependencies="{ \"$dependency\": \"file:$phantom/$dependency.tgz\" }"; fi
  mkdir -p "$phantom/$name/package"
  printf '{ "name": "%s", "version": "1.0.0", "type": "module", "main": "index.js", "dependencies": %s }\n' \
    "$name" "$dependencies" >"$phantom/$name/package/package.json"
  if [[ -n "$dependency" ]]; then
    echo "import d from \"$dependency\"; export default \"$name, with \" + d;" >"$phantom/$name/package/index.js"
  else
    echo "export default \"$name\";" >"$phantom/$name/package/index.js"
  fi
  if [[ "$name" == a ]]; then echo 'import c from "c"; export default c;' >"$phantom/a/package/reach.js"; fi
  tar -czf "$phantom/$name.tgz" -C "$phantom/$name" package
done
# imported PROJECT SPECIFIER: what importing SPECIFIER from PROJECT gives, its default export
# quoted, or node's error code with the package it couldn't find.
imported() {
  local out missing
  if out=$(cd "$1" && node --input-type=module -e "console.log((await import(\"$2\")).default)" 2>&1); then
    echo "\"$out\""
  else
    missing=$(grep -m1 -o "Cannot find package '[^']*'" <<<"$out" | cut -d"'" -f2)
    if [[ -n "$missing" ]]; then echo "ERR_MODULE_NOT_FOUND for $missing"; else echo "fails: $(tail -n1 <<<"$out")"; fi
  fi
}
# Each layout with whether the consumer's import of b, then a/reach.js's of c, resolves (yes) or
# doesn't (no). Resolving is the fixture's own default export, so a package found elsewhere fails
# the row; not resolving is node naming the very package missing, not merely any missing module.
# pnpm's and bun's isolated layouts hoist every package into a hidden node_modules inside their
# store (pnpm's hoistPattern ['*'], bun's install.hoist), which a dependency resolves from and the
# consumer doesn't; npm's linked layout has none.
for each in npm-hoisted:yes:yes npm-linked:no:no pnpm:no:yes pnpm-hoisted:yes:yes bun:yes:yes \
  bun-isolated:no:yes; do
  IFS=: read -r name want_b want_c <<<"$each"
  project="$layout/phantom-$name"
  layout_project "$name" "$project" "{ \"a\": \"file:$phantom/a.tgz\" }"
  status=0
  layout_install "$name" "$project" >"$project.log" 2>&1 || status=$?
  got_a=$(imported "$project" a)
  for case in b c; do
    if [[ "$case" == b ]]; then
      specifier=b want=$want_b value='"b, with c"'
      what="a consumer's import of b, undeclared and a's dependency,"
    else
      specifier=a/reach.js want=$want_c value='"c"'
      what="a dependency's import of c (a/reach.js), undeclared by a and b's dependency,"
    fi
    got=$(imported "$project" "$specifier")
    if [[ "$want" == yes ]]; then expect="resolves"; else expect="doesn't resolve" value="ERR_MODULE_NOT_FOUND for $case"; fi
    ok=0
    if ((status == 0)) && [[ "$got_a" == '"a, with b, with c"' && "$got" == "$value" ]]; then ok=1; fi
    row "${layout_label[$name]}: $what $expect" "$ok" \
      "exit $status; import a: $got_a; import $specifier: $got;
       node_modules holds $(names "$project/node_modules")"
  done
done

# tree_digest DIR: a digest of DIR/node_modules, every path, link target, and file's bytes, the
# managers' own metadata files left out, with the count of entries.
tree_digest() {
  local kind path target count
  count=$(cd "$1/node_modules" && find . \( -type f -o -type l \) "${layout_meta[@]}" | wc -l)
  (cd "$1/node_modules" && find . \( -type f -o -type l \) "${layout_meta[@]}" -printf '%y\t%p\t%l\n' |
    LC_ALL=C sort | while IFS=$'\t' read -r kind path target; do
      if [[ "$kind" == f ]]; then printf 'f %s %s\n' "$path" "$(sha256sum <"$path" | cut -d' ' -f1)"; else
        printf 'l %s %s\n' "$path" "$target"
      fi
    done) | sha256sum | cut -c1-16 | tr '\n' ' '
  echo "(${count:-0} entries)"
}
# package_files DIR: how many files DIR/node_modules holds, the managers' own metadata left out.
package_files() {
  find "$1/node_modules" -type f "${layout_meta[@]}" | wc -l
}
# from_cache DIR CACHE: how many of DIR/node_modules' package files share an inode with a file in
# CACHE, the hard links into the cache or store.
from_cache() {
  awk 'NR == FNR { cached[$1]; next } $1 in cached' \
    <(find "$2" -type f -printf '%i\n') \
    <(find "$1/node_modules" -type f "${layout_meta[@]}" -printf '%i\n') | wc -l
}
# bytes PATH...: du -sb's total over PATH..., which counts a file hard-linked among them once.
bytes() { du -sbc "$@" | tail -n1 | cut -f1; }
fs=$(stat -f -c %T "$layout")

for name in npm-hoisted npm-linked pnpm bun; do
  # Disk: two consumers of lit, one after the other, against the layout's cache or store.
  status=0
  for n in 1 2; do
    layout_project "$name" "$layout/lit-$name-$n" "{ \"lit\": \"$lit\" }"
    layout_install "$name" "$layout/lit-$name-$n" >>"$layout/lit-$name.log" 2>&1 || status=$?
  done
  first="$layout/lit-$name-1" second="$layout/lit-$name-2" cache="$layout/$name-cache"
  total=$(package_files "$second")
  linked=$(from_cache "$second" "$cache")
  added=$(($(bytes "$cache" "$first/node_modules" "$second/node_modules") - $(bytes "$cache" "$first/node_modules")))
  ok=0
  case $name in
    npm-*)
      expect="copies every package file from its cache, hard-linking none"
      if ((status == 0 && total > 0 && linked == 0)); then ok=1; fi
      ;;
    pnpm | bun)
      expect="hard-links every package file from its store or cache"
      if ((status == 0 && total > 0 && linked == total)); then ok=1; fi
      ;;
  esac
  row "${layout_label[$name]}: a second project of lit $lit $expect" "$ok" \
    "exit $status; on $fs, $linked of the second project's $total package files are hard links into the cache or store;
     the second project adds $added bytes (du -sb over the cache or store and both node_modules);
     its node_modules $(du -sb "$second/node_modules" | cut -f1) bytes apparent;
     the cache or store $(du -sb "$cache" | cut -f1) bytes"

  # Determinism: two fresh copies of the first consumer install from its lockfile, which the copy
  # fails without.
  case $name in
    npm-*) lockfile=package-lock.json ;;
    pnpm) lockfile=pnpm-lock.yaml ;;
    bun) lockfile=bun.lock ;;
  esac
  digests=("$(tree_digest "$first")")
  status=0
  for copy in a b; do
    project="$layout/lit-$name-$copy"
    mkdir -p "$project"
    cp "$first/package.json" "$project/"
    cp "$first/$lockfile" "$project/" || status=$?
    layout_install "$name" "$project" frozen >>"$layout/lit-$name.log" 2>&1 || status=$?
    digests+=("$(tree_digest "$project")")
  done
  ok=0
  if ((status == 0)) && [[ "${digests[0]}" != *"(0 entries)" &&
    "${digests[0]}" == "${digests[1]}" && "${digests[0]}" == "${digests[2]}" ]]; then
    ok=1
  fi
  case $name in
    npm-*) frozen="npm ci" ;;
    *) frozen="$name install --frozen-lockfile" ;;
  esac
  row "${layout_label[$name]}: two installs from one lockfile ($frozen) give the first install's tree" \
    "$ok" "exit $status; trees: first ${digests[0]}, copies ${digests[1]}, ${digests[2]}"
done

echo "measure: prefixed-tag rows" >&2
# A throwaway repository with this package's tag tree in fixture/, tagged fixture/v0.1.0, never
# pushed.
prefixed="$scratch/prefixed"
mkdir -p "$prefixed/fixture"
git -C "$own" archive "$own_tag" | tar -x -C "$prefixed/fixture"
(cd "$prefixed" && git init -q -b main && git add -A && git commit -q -m "fixture/$own_tag" &&
  git tag -a "fixture/$own_tag" -m "fixture/$own_tag")
spec="git+file://$prefixed#fixture/$own_tag&path:/fixture"
for manager in pnpm bun; do
  mkdir -p "$scratch/prefixed-$manager"
  printf '{ "name": "prefixed-%s", "private": true, "dependencies": { "spike-html-conventions": "%s" } }\n' \
    "$manager" "$spec" >"$scratch/prefixed-$manager/package.json"
done
npm_project "$scratch/prefixed-npm" root spike-html-conventions "$spec"
# npm's own subdirectory syntax: ::-separated keys in the fragment, path: among them.
npm_spec="git+file://$prefixed#fixture/$own_tag::path:fixture"
npm_project "$scratch/prefixed-npm-path" root spike-html-conventions "$npm_spec"
status=0
pnpm_warm "$scratch/prefixed-pnpm" --reporter append-only >"$scratch/prefixed-pnpm.log" 2>&1 || status=$?
installed="$scratch/prefixed-pnpm/node_modules/spike-html-conventions"
ok=0
# Passes when every installed file is the fixture tree's, byte for byte.
if ((status == 0)) && [[ -f "$installed/package.json" ]] &&
  [[ -z "$(differing "$installed" "$prefixed/fixture")" ]]; then
  ok=1
fi
row "pnpm installs a subdirectory from a prefixed tag (#fixture/$own_tag&path:/fixture)" "$ok" \
  "exit $status; installed $(cd "$installed" 2>/dev/null && find . -type f | wc -l) files: $(names "$installed")"

status=0
bun_warm "$scratch/prefixed-bun" >"$scratch/prefixed-bun.log" 2>&1 || status=$?
# Every error line bun prints, git's included, joined.
reason=$(grep -E '^(error|fatal):' "$scratch/prefixed-bun.log" | paste -s -d ';' - | sed 's/;/; /g' || true)
# The refusal is bun reading the whole fragment, &path: included, as the ref; any other failure
# fails the row.
ok=0
if ((status != 0)) && grep -qF "no commit matching \"fixture/$own_tag&path:/fixture\"" \
  "$scratch/prefixed-bun.log"; then
  ok=1
fi
row "Bun can't install a subdirectory from a prefixed tag (the same spec)" "$ok" \
  "exit $status; ${reason:-$(tail -n1 "$scratch/prefixed-bun.log")}"

# npm_enoent LOG: npm's error code and its Could not read line, of the many it prints for ENOENT.
npm_enoent() {
  echo "$(grep -m1 '^npm error code' "$1" | sed 's/^npm error //');" \
    "$(grep -m1 '^npm error enoent Could not read' "$1" | sed 's/^npm error enoent //')"
}

status=0
npm_warm "$scratch/prefixed-npm" >"$scratch/prefixed-npm.log" 2>&1 || status=$?
# npm splits the fragment on ::, reads each part with a colon as key:value, and ignores the
# unknown key "fixture/v0.1.0&path", so it clones the default branch and finds no package.json at
# its root; any other outcome fails the row.
ok=0
if ((status != 0)) && grep -qF "ignoring unknown key \"fixture/$own_tag&path\"" "$scratch/prefixed-npm.log" &&
  grep -q '^npm error enoent Could not read package.json' "$scratch/prefixed-npm.log" &&
  [[ ! -e "$scratch/prefixed-npm/node_modules/spike-html-conventions" ]]; then
  ok=1
fi
row "npm can't install a subdirectory from a prefixed tag (the same spec)" "$ok" \
  "exit $status; warn: $(grep -m1 'ignoring unknown key' "$scratch/prefixed-npm.log" | sed 's/^npm warn //');
   $(npm_enoent "$scratch/prefixed-npm.log")"

status=0
npm_warm "$scratch/prefixed-npm-path" >"$scratch/prefixed-npm-path.log" 2>&1 || status=$?
# npm resolves the subdirectory's manifest, then reifies from the resolved spec, a bare commit
# with the path dropped, and finds no package.json at the clone's root. The row asks for each
# step: no key ignored, the tarball spec a bare commit, and the ENOENT. An install fails the row,
# as a change to record.
ok=0
if ((status != 0)) && ! grep -q 'ignoring unknown key' "$scratch/prefixed-npm-path.log" &&
  grep -qE "^npm warn tarball tarball data for spike-html-conventions@git\+file://$prefixed#[0-9a-f]{40} " \
    "$scratch/prefixed-npm-path.log" &&
  grep -q '^npm error enoent Could not read package.json' "$scratch/prefixed-npm-path.log" &&
  [[ ! -e "$scratch/prefixed-npm-path/node_modules/spike-html-conventions" ]]; then
  ok=1
fi
row "npm can't install a subdirectory from a prefixed tag with its own syntax (#fixture/$own_tag::path:fixture)" \
  "$ok" "exit $status; warn: $(grep -m1 '^npm warn tarball' "$scratch/prefixed-npm-path.log" | sed 's/^npm warn tarball //');
   $(npm_enoent "$scratch/prefixed-npm-path.log")"

echo "measure: GitHub and jsDelivr rows" >&2
# released SLUG TAG: whether TAG is on github.com/SLUG. Any git failure but a missing ref ends the
# run, so a network fault is never reported as an unreleased tag.
released() {
  local status=0
  GIT_TERMINAL_PROMPT=0 git ls-remote --tags --exit-code "https://github.com/$1" "refs/tags/$2" \
    >/dev/null || status=$?
  case $status in
    0) return 0 ;;
    2) return 1 ;;
    *) fail "git ls-remote of github.com/$1 failed (exit $status)" ;;
  esac
}
own_released=0
if released "$own_slug" "$own_tag"; then own_released=1; fi

# tag_tree SLUG TAG: the tag's tree from a fresh shallow fetch from GitHub, extracted to
# $scratch/tag-<repo>; git archive honours export-ignore as GitHub's tarball does.
tag_tree() {
  local repo="$scratch/fetch-${1##*/}"
  git init -q --bare "$repo"
  git -C "$repo" fetch -q --depth 1 "https://github.com/$1" "refs/tags/$2:refs/tags/$2"
  mkdir -p "$scratch/tag-${1##*/}"
  git -C "$repo" archive "$2" | tar -x -C "$scratch/tag-${1##*/}"
}

# github_rows NAME SLUG TAG: one row per manager, each installing NAME from github:SLUG#TAG into a
# fresh scratch consumer with a store or cache of its own, compared with the tag's tree and with
# the timings' git+file:// install of the same package.
github_rows() {
  local name=$1 slug=$2 tag=$3 manager project installed status ok bad count local_install left_out
  local tree="$scratch/tag-${2##*/}" commit
  commit=$(git -C "$scratch/fetch-${2##*/}" rev-parse --short "$tag^{commit}")
  for manager in pnpm npm bun; do
    project="$scratch/github-$name-$manager"
    mkdir -p "$project"
    printf '{ "name": "github-%s", "private": true, "dependencies": { "%s": "github:%s#%s" } }\n' \
      "$manager" "$name" "$slug" "$tag" >"$project/package.json"
    status=0
    if [[ "$manager" == pnpm ]]; then
      XDG_CACHE_HOME=$project-xdg/cache XDG_STATE_HOME=$project-xdg/state \
        pnpm --dir "$project" install --store-dir "$project-store" --reporter append-only \
        >"$project.log" 2>&1 || status=$?
    elif [[ "$manager" == npm ]]; then
      # The consumer's opt-in, as consumer-npm's .npmrc.
      echo "allow-git=root" >"$project/.npmrc"
      "$npm" install --prefix "$project" --cache "$project-cache" "${npm_flags[@]}" \
        >"$project.log" 2>&1 || status=$?
    else
      BUN_INSTALL_CACHE_DIR=$project-cache bun install --cwd "$project" >"$project.log" 2>&1 ||
        status=$?
    fi
    installed="$project/node_modules/$name"
    ok=0
    if ((status != 0)) || [[ ! -f "$installed/package.json" ]]; then
      row "$manager installs $name from github:$slug#$tag" 0 \
        "exit $status; $(tail -n1 "$project.log")"
      continue
    fi
    bad=$(differing "$installed" "$tree")
    count=$(files "$installed" | wc -l)
    if [[ -z "$bad" ]] && node "$root/scripts/consumers.js" exports "$installed" \
      >>"$project.log" 2>&1; then
      ok=1
    fi
    # The timings' consumers installed the same package by git+file:// at the same tag name.
    local_install="$scratch/warm/$manager/node_modules/$name"
    if [[ "$(files "$installed")" == "$(files "$local_install")" ]]; then
      local_install="the same file set as the git+file:// install"
    else
      local_install="the git+file:// install has $(files "$local_install" | wc -l) files"
    fi
    if [[ -n "$bad" ]]; then bad="not the tag's: $bad"; else bad="each the tag's byte for byte"; fi
    # The tag's files the manager left out, as `files` or its packing defaults leave them.
    left_out=$(LC_ALL=C comm -23 <(files "$tree") <(files "$installed") | paste -s -d ' ' -)
    row "$manager installs $name from github:$slug#$tag" "$ok" \
      "exit $status; $count of the tag's $(files "$tree" | wc -l) files (commit $commit), $bad;
       ${left_out:+left out: $left_out;} $local_install"
  done
}

# jsdelivr_row SLUG TAG PATH KIND: one file from jsDelivr, its headers recorded, compared with
# the tag's tree. KIND is module (served as JavaScript), style (CSS), or unloadable (text/plain
# with nosniff, which a browser won't run as a module).
jsdelivr_row() {
  local slug=$1 tag=$2 path=$3 kind=$4 url body ok=0 served code type cache cors sniff version bytes
  url="https://cdn.jsdelivr.net/gh/$slug@$tag/$path"
  body="$scratch/jsdelivr-body"
  # A cold tag can answer 503 briefly, so the fetch is retried with backoff; curl retries a
  # transient HTTP status without -f, and the headers written are the final response's.
  if ! served=$(curl -sS --retry 5 --retry-all-errors --retry-delay 2 -o "$body" \
    -w '%{http_code}|%header{content-type}|%header{cache-control}|%header{access-control-allow-origin}|%header{x-content-type-options}|%header{x-jsd-version-type}' \
    "$url" 2>&1); then
    row "jsDelivr serves $path at $slug@$tag ($kind)" 0 "$url: $served"
    return
  fi
  IFS='|' read -r code type cache cors sniff version <<<"$served"
  if [[ "$code" != 200 ]]; then
    row "jsDelivr serves $path at $slug@$tag ($kind)" 0 "$url: HTTP $code"
    return
  fi
  case $kind in
    module) [[ "$type" =~ ^(application|text)/javascript ]] && ok=1 ;;
    style) [[ "$type" == text/css* ]] && ok=1 ;;
    unloadable) [[ "$type" == text/plain* && "$sniff" == nosniff ]] && ok=1 ;;
  esac
  [[ "$cache" == *immutable* && "$cors" == '*' ]] || ok=0
  if cmp -s "$body" "$scratch/tag-${slug##*/}/$path"; then bytes="equal to the tag's"; else
    bytes="NOT equal to the tag's"
    ok=0
  fi
  row "jsDelivr serves $path at $slug@$tag ($kind)" "$ok" \
    "content-type $type; cache-control $cache; access-control-allow-origin ${cors:-none};
     x-content-type-options ${sniff:-none}; x-jsd-version-type ${version:-none};
     $(wc -c <"$body") bytes, $bytes"
}

tag_tree "$design_slug" "$design_tag"
github_rows spike-html-design "$design_slug" "$design_tag"
# A representative set: the module and stylesheet the file:// pages load, and the registry they
# import. spike-html-design has no .ts; the unloadable .ts row is Lit's below, and this
# package's once v0.1.0 is released.
jsdelivr_row "$design_slug" "$design_tag" modules/register-full.js module
jsdelivr_row "$design_slug" "$design_tag" modules/registry.js module
jsdelivr_row "$design_slug" "$design_tag" full.css style
# Until this package's .ts rows run, the unloadable shape is observed on another repository's .ts
# at a tag: Lit's source entry, at the Lit version this package depends on.
tag_tree lit/lit "lit@$lit"
jsdelivr_row lit/lit "lit@$lit" packages/lit/src/index.ts unloadable

# This package's rows, at v0.1.0: every module of every form its exports map names.
mapfile -t own_modules < <(node -e '
  const { exports } = require(process.argv[1]);
  for (const target of Object.values(exports)) {
    if (!target.endsWith(".d.ts")) console.log(target.replace(/^\.\//, ""));
  }' "$root/package.json")
if ((own_released)); then
  tag_tree "$own_slug" "$own_tag"
  github_rows spike-html-conventions "$own_slug" "$own_tag"
  for path in "${own_modules[@]}"; do
    if [[ "$path" == *.ts ]]; then kind=unloadable; else kind=module; fi
    jsdelivr_row "$own_slug" "$own_tag" "$path" "$kind"
  done
else
  for manager in pnpm npm bun; do
    unreleased "$manager installs spike-html-conventions from github:$own_slug#$own_tag"
  done
  for path in "${own_modules[@]}"; do
    if [[ "$path" == *.ts ]]; then kind=unloadable; else kind=module; fi
    unreleased "jsDelivr serves $path at $own_slug@$own_tag ($kind)"
  done
fi

echo "measure: file:// rows" >&2
# The element's JS forms: from jsDelivr once this package's tag is released, and from the working
# tree until then.
if ((own_released)); then
  element=https://cdn.jsdelivr.net/gh/$own_slug@$own_tag/src
  element_from="spike-html-design $design_tag, Lit $lit, and this package at $own_tag, all from jsDelivr:"
else
  element=file://$root/src
  element_from="spike-html-design $design_tag and Lit $lit from jsDelivr, local"
fi
# Warm jsDelivr first: a cold tag can answer 503 briefly, so each URL is retried with backoff.
warm=("$jsdelivr/full.css" "$jsdelivr/modules/register-full.js" "$jsdelivr/modules/registry.js"
  "https://cdn.jsdelivr.net/npm/lit@$lit/+esm")
if ((own_released)); then
  for form in jsdoc js; do
    warm+=("$element/$form/pagination-lit.js" "$element/$form/pagination-vanilla.js")
  done
fi
for url in "${warm[@]}"; do
  curl -fsS -o /dev/null --retry 5 --retry-all-errors --retry-delay 2 "$url" ||
    echo "measure: jsDelivr didn't serve $url" >&2
done

profile="$scratch/chromium"
# page FORM BASE: a file:// page with spike-html-design from jsDelivr and the element from
# $element, and its report from the dumped DOM.
page() {
  local form=$1 base=$2 tag="hd-pagination-$2-$1" html="$scratch/page-$1-$2.html"
  cat >"$html" <<EOF
<!doctype html>
<html><head><meta charset="utf-8"><title>$tag</title>
<link rel="stylesheet" href="$jsdelivr/full.css">
<script type="importmap">{ "imports": { "lit": "https://cdn.jsdelivr.net/npm/lit@$lit/+esm" } }</script>
<script type="module" src="$jsdelivr/modules/register-full.js"></script>
<script type="module" src="$element/$form/pagination-$base.js"></script>
</head><body>
<$tag page="3" total-pages="7"></$tag>
<pre id="report">FAIL: the report didn't run</pre>
<script type="module">
  import { profiles } from "$jsdelivr/modules/registry.js";
  const report = document.getElementById("report");
  const el = document.querySelector("$tag");
  const color = profiles("color").join("/");
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!customElements.get("$tag") || !el.shadowRoot) {
    report.textContent = "FAIL: design color profiles " + color + "; $tag not defined";
  } else {
    await el.updateComplete;
    const shadow = el.shadowRoot;
    const total = [...shadow.querySelectorAll("span")].at(-1)?.textContent.trim();
    const page = shadow.querySelector("input")?.value;
    // The element rendered its attributes: page 3 of 7.
    const rendered = page === "3" && total === "/ 7";
    report.textContent = (color && bg && rendered ? "ok" : "FAIL") + ": design color profiles " + color +
      ", --bg " + bg + "; $tag defined, renders page " + page + " \"" + total + "\"";
  }
</script>
</body></html>
EOF
  chromium --headless --user-data-dir="$profile" --allow-file-access-from-files \
    --dump-dom "file://$html" 2>/dev/null |
    sed -n 's|.*<pre id="report">\(.*\)</pre>.*|\1|p' | sed 's/&quot;/"/g'
}
for form in jsdoc js; do
  for base in lit vanilla; do
    report=""
    for delay in 0 2 4 8; do
      sleep "$delay"
      report=$(page "$form" "$base")
      [[ "$report" == ok:* ]] && break
      echo "measure: page $form-$base: ${report:-no report}; retrying" >&2
    done
    ok=0
    if [[ "$report" == ok:* ]]; then ok=1; fi
    row "file:// page: $element_from $form/pagination-$base.js" \
      "$ok" "${report:-no report in the dumped DOM}"
  done
done
if ((!own_released)); then
  unreleased "file:// page: spike-html-design $design_tag, Lit $lit, and each JS form of the element from jsDelivr at $own_tag"
fi

# ---- Components: what each version of the components layer serves, under Vite's dev server and
# from vite build, for two pages per version (scripts/components.js pages): the pagination element
# alone, and the composition, the pagination holding one entry per item of the fixture's
# directories page. Both run on a scratch copy of the project, layers/ and demo/, with Lit's
# packages copied into its own node_modules (pnpm list's closure of the dependencies), so Vite's
# cache, node_modules/.vite by default, is scratch too, and spike-html-design's baseline extracted
# from its tag as scripts/demo.sh extracts it. The section reads no network: Chromium's host
# resolver maps every name but the dev server's address to nothing. Both list scripts/css-sheets.js,
# which gives each component's CSS module script (`with { type: "css" }`) the module a browser
# gives it, one constructed sheet as its default export, where Vite would inject the CSS into the
# document in dev and fail the build on the missing export.
#
# Development: one dev server over the copy, each page loaded once to let Vite pre-bundle Lit, then
# again in headless Chromium with a fresh profile and its NetLog capturing every byte; a page's
# figures are the bodies of every 2xx response from the dev server the browser read, as Vite sends
# them, uncompressed (scripts/components.js responses). The dev server resolves Lit's development
# builds, its development export condition, which the rows check for in the very bytes the browser
# read: Lit's dev-mode warning.
#
# Production: one vite build per page, minified as Vite builds by default, into scratch, every
# emitted file raw and brotli; Lit's share is the chunk the config's codeSplitting group puts every
# lit, lit-html, lit-element, and @lit/* module in, under lit/, and the baseline's is the CSS Vite
# emits for the linked stylesheet.
echo "measure: components" >&2
components="$scratch/components"
project="$components/project"
mkdir -p "$project/node_modules" "$project/spike-html-design"
cp -r "$root/layers" "$root/demo" "$root/package.json" "$root/tsconfig.json" "$project/"
while IFS= read -r dir; do
  if [[ "$dir" == "$root" ]]; then continue; fi
  name=${dir##*/node_modules/}
  mkdir -p "$project/node_modules/$(dirname "$name")"
  cp -rL "$dir" "$project/node_modules/$name"
done < <(cd "$root" && pnpm list --prod --parseable --depth Infinity)
git -C "$design" archive "$design_tag" baseline.css layers | tar -x -C "$project/spike-html-design"
mapfile -t component_pages < <(node "$root/scripts/components.js" pages "$project")
((${#component_pages[@]} == 8)) || fail "components.js wrote ${#component_pages[@]} pages, not 8"
# component_page PAGE: the version, its entry tag, and whether it is a composition,
# from the page's name, as components.js names it: pagination-<version> or composition-<version>.
component_page() {
  page_version=${1#*-}
  page_kind=${1%%-*}
  page_entry=sl-entry-$page_version
}

# The dev server, on a free port of the loopback address.
port=$(node -e '
  const server = require("node:net").createServer();
  server.listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); });')
origin="http://127.0.0.1:$port"
cat >"$components/dev.config.mjs" <<EOF
import { cssSheets } from "$root/scripts/css-sheets.js";
export default {
  root: "$project",
  plugins: [cssSheets()],
  publicDir: false,
  logLevel: "warn",
  clearScreen: false,
  server: { host: "127.0.0.1", port: $port, strictPort: true },
};
EOF
vite --configLoader native --config "$components/dev.config.mjs" >"$components/dev.log" 2>&1 &
dev_server=$!
watchers+=("$dev_server")
for ((i = 0; i < 300; i++)); do
  curl -fs -o /dev/null "$origin/${component_pages[0]}.html" && break
  sleep 0.1
done
curl -fs -o /dev/null "$origin/${component_pages[0]}.html" ||
  fail "Vite's dev server didn't answer at $origin: $(tail -n3 "$components/dev.log")"
# component_chromium PROFILE ARGS...: headless Chromium with a profile of its own and no name
# resolved but the dev server's address, so its background requests never leave the machine.
component_chromium() {
  local profile=$1
  shift
  chromium --headless --user-data-dir="$profile" --no-first-run --disable-background-networking \
    --disable-component-update --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE 127.0.0.1" \
    "$@" 2>/dev/null
}
for page in "${component_pages[@]}"; do
  component_chromium "$components/warm-profile" --dump-dom "$origin/$page.html" >/dev/null
done
for page in "${component_pages[@]}"; do
  component_chromium "$components/profile-$page" --log-net-log="$components/$page.netlog.json" \
    --net-log-capture-mode=Everything --dump-dom "$origin/$page.html" >"$components/$page.dom.html"
  node "$root/scripts/components.js" responses "$components/$page.netlog.json" "$origin" \
    >"$components/$page.responses.tsv"
done
kill "$dev_server" 2>/dev/null || true

# share_sum TSV SHARE COLUMN: the sum of COLUMN over TSV's lines of SHARE, or every line's with all.
share_sum() {
  awk -F'\t' -v share="$2" -v col="$3" 'share == "all" || $1 == share { s += $col } END { print s + 0 }' "$1"
}
# marked TSV COLUMN: the paths of TSV's lines whose COLUMN is 1, on one line.
marked() {
  awk -F'\t' -v col="$2" '$col == 1 { printf "%s%s", sep, $NF; sep = " " }' "$1"
}

echo "## Components"
echo
echo "What each version of the components layer serves, for two pages per version: the pagination element alone (pagination-*), and the composition, the pagination holding the fixture's three directories (composition-*). The light versions' pages link spike-html-design $design_tag's baseline, its own share, so the element and runtime figures compare across versions."
echo
echo "### Development (Vite dev server)"
echo
echo "Every 2xx response from Vite's dev server headless Chromium read for the page, from its NetLog (--net-log-capture-mode=Everything), with a fresh profile after a warm-up load that let Vite pre-bundle Lit; bytes as the dev server sends them, uncompressed. Vite's client is the HMR client the dev server injects into every page."
echo
echo "| page | responses | total | Lit | baseline CSS | Vite client | page and elements |"
echo "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
for page in "${component_pages[@]}"; do
  tsv="$components/$page.responses.tsv"
  printf '| %s | %s | %s B | %s B | %s B | %s B | %s B |\n' "$page" "$(wc -l <"$tsv")" \
    "$(share_sum "$tsv" all 2)" "$(share_sum "$tsv" lit 2)" "$(share_sum "$tsv" baseline 2)" \
    "$(share_sum "$tsv" client 2)" "$(share_sum "$tsv" page 2)"
done
echo
for page in "${component_pages[@]}"; do
  component_page "$page"
  tsv="$components/$page.responses.tsv"
  component_modules=("/layers/components/pagination-$page_version.ts")
  # Each stylesheet the version imports, as the virtual sheet module scripts/css-sheets.js serves.
  sheet="/@id/__x00__css-sheet:$project/layers/components"
  if [[ "$page_version" == *-shadow ]]; then
    component_modules+=("$sheet/buttons.css.js" "$sheet/pagination-shadow.css.js")
  else
    component_modules+=("$sheet/pagination-$page_version.css.js")
  fi
  if [[ "$page_kind" == composition ]]; then
    component_modules+=("/layers/components/entry-$page_version.ts" /demo/documents.ts)
    if [[ "$page_version" == *-shadow ]]; then
      component_modules+=("$sheet/entry-shadow.css.js")
    else
      component_modules+=("$sheet/entry-$page_version.css.js")
    fi
  fi
  missing=()
  for path in "${component_modules[@]}"; do
    awk -F'\t' -v path="$path" '$NF == path { found = 1 } END { exit !found }' "$tsv" || missing+=("$path")
  done
  fact="$(wc -l <"$tsv") responses, $(share_sum "$tsv" all 2) B: Lit $(share_sum "$tsv" lit 2) B, baseline $(share_sum "$tsv" baseline 2) B, Vite client $(share_sum "$tsv" client 2) B, page and elements $(share_sum "$tsv" page 2) B"
  ok=1
  if ((${#missing[@]} > 0)); then
    ok=0
    fact+="; never fetched: ${missing[*]}"
  fi
  # Vite's own CSS handling would inject a stylesheet it took into a <style> in the document.
  injected=$({ grep -o '<style[^>]*data-vite-dev-id' "$components/$page.dom.html" || true; } | wc -l)
  fact+="; the dumped DOM holds $injected style Vite injected"
  if ((injected != 0)); then ok=0; fi
  # The composition's script appends the pagination with its entries, which the dumped DOM holds.
  if [[ "$page_kind" == composition ]]; then
    entries=$(grep -o "<${page_entry}[ >]" "$components/$page.dom.html" | wc -l)
    fact+="; the dumped DOM holds $entries $page_entry"
    if ((entries != 3)); then ok=0; fi
  fi
  dev=$(marked "$tsv" 3) any=$(marked "$tsv" 4)
  if [[ "$page_version" == lit-* ]]; then
    name="Components, development: $page loads Lit's development build"
    if [[ -n "$dev" ]]; then fact+="; Lit's dev-mode warning in $dev"; else
      ok=0
      fact+="; no response holds Lit's dev-mode warning${any:+, though Lit is in $any}"
    fi
  else
    name="Components, development: $page loads no Lit"
    if [[ -n "$any" || "$(share_sum "$tsv" lit 2)" != 0 ]]; then
      ok=0
      fact+="; Lit in ${any:-the pre-bundled dependencies}"
    else
      fact+="; no response holds Lit"
    fi
  fi
  row "$name" "$ok" "$fact"
done

echo "### Production (vite build)"
echo
echo "One vite build per page, as Vite builds by default (minified, Lit's production build), every emitted file raw and brotli (quality 11, node's node:zlib). Lit's share is the chunk a codeSplitting group puts every lit, lit-html, lit-element, and @lit/* module in; the baseline's is the CSS Vite emits for the linked stylesheet."
echo
echo "| page | files | total | total, brotli | Lit | Lit, brotli | baseline CSS | baseline CSS, brotli | page and elements | page and elements, brotli |"
echo "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
for page in "${component_pages[@]}"; do
  cat >"$components/build-$page.config.mjs" <<EOF
import { cssSheets } from "$root/scripts/css-sheets.js";
export default {
  root: "$project",
  plugins: [cssSheets()],
  publicDir: false,
  logLevel: "warn",
  build: {
    outDir: "$components/build/$page",
    emptyOutDir: true,
    reportCompressedSize: false,
    rolldownOptions: {
      input: "$project/$page.html",
      output: {
        codeSplitting: {
          groups: [{ name: "lit", test: /[\\\\/]node_modules[\\\\/](lit|lit-html|lit-element|@lit)[\\\\/]/ }],
        },
        chunkFileNames: (chunk) =>
          chunk.name === "lit" ? "lit/[name]-[hash].js" : "assets/[name]-[hash].js",
      },
    },
  },
};
EOF
  status=0
  vite build --configLoader native --config "$components/build-$page.config.mjs" \
    >"$components/build-$page.log" 2>&1 || status=$?
  tsv="$components/$page.emitted.tsv"
  if ((status == 0)); then
    node "$root/scripts/components.js" emitted "$components/build/$page" >"$tsv"
  else
    : >"$tsv"
  fi
  printf '| %s | %s | %s B | %s B | %s B | %s B | %s B | %s B | %s B | %s B |\n' "$page" "$(wc -l <"$tsv")" \
    "$(share_sum "$tsv" all 2)" "$(share_sum "$tsv" all 3)" "$(share_sum "$tsv" lit 2)" \
    "$(share_sum "$tsv" lit 3)" "$(share_sum "$tsv" baseline 2)" "$(share_sum "$tsv" baseline 3)" \
    "$(share_sum "$tsv" page 2)" "$(share_sum "$tsv" page 3)"

  component_page "$page"
  fact="exit $status"
  ok=1
  if ((status != 0)); then
    ok=0
    fact+=": $(tail -n3 "$components/build-$page.log")"
  else
    fact+="; $(wc -l <"$tsv") files: $(awk -F'\t' '{ printf "%s%s", sep, $NF; sep = " " }' "$tsv"); $(share_sum "$tsv" all 2) B, $(share_sum "$tsv" all 3) B brotli"
  fi
  dev=$(marked "$tsv" 4) any=$(marked "$tsv" 5)
  lit_files=$(awk -F'\t' '$1 == "lit" { printf "%s%s", sep, $NF; sep = " " }' "$tsv")
  # Lit wholly in its chunk: no other file holds Lit's version registries.
  outside=$(awk -F'\t' '$1 != "lit" && $5 == 1 { printf "%s%s", sep, $NF; sep = " " }' "$tsv")
  if [[ -n "$dev" ]]; then
    ok=0
    fact+="; Lit's dev-mode warning in $dev"
  else
    fact+="; no file holds Lit's dev-mode warning"
  fi
  if [[ "$page_version" == lit-* ]]; then
    name="Components, production: $page builds, with Lit's production build in a chunk of its own"
    if [[ -n "$lit_files" && -z "$outside" ]]; then
      fact+="; Lit $(share_sum "$tsv" lit 2) B, $(share_sum "$tsv" lit 3) B brotli, all in $lit_files"
    else
      ok=0
      fact+="; Lit's chunk: ${lit_files:-none}; Lit outside it: ${outside:-none}"
    fi
  else
    name="Components, production: $page builds, with no Lit"
    if [[ -n "$any" || -n "$lit_files" ]]; then
      ok=0
      fact+="; Lit in ${any:-$lit_files}"
    else
      fact+="; no file holds Lit"
    fi
  fi
  row "$name" "$ok" "$fact"
done
echo
echo "### Context: the element sources"
echo
echo "Each version's source as written, for context: lines (\`wc -l\`) and brotli bytes (quality 11, node's node:zlib): its module, and its stylesheet, a CSS module script. The Lit and vanilla shadow versions share one stylesheet per element (pagination-shadow.css, entry-shadow.css), and buttons.css is every shadow version's shared button styles."
echo
echo "| file | lines | brotli |"
echo "| --- | ---: | ---: |"
component_sources=()
for version in lit-shadow vanilla-shadow lit-light vanilla-light; do
  component_sources+=("layers/components/pagination-$version.ts" "layers/components/entry-$version.ts")
  if [[ "$version" == *-light ]]; then
    component_sources+=("layers/components/pagination-$version.css" "layers/components/entry-$version.css")
  fi
done
component_sources+=(layers/components/pagination-shadow.css layers/components/entry-shadow.css)
component_sources+=(layers/components/buttons.css)
while IFS=$'\t' read -r path bytes; do
  printf '| %s | %s | %s B |\n' "$path" "$(wc -l <"$root/$path")" "$bytes"
done < <(cd "$root" && node scripts/components.js brotli "${component_sources[@]}")
echo

echo "measure: lint and format rows" >&2
# pin TOOL: TOOL's version in mise.toml.
pin() { sed -nE "s/^\"?$1\"? = \"([^\"]+)\"$/\1/p" "$root/mise.toml"; }
# tool_version COMMAND: the first version number COMMAND --version prints.
tool_version() { "$1" --version | grep -m1 -oE '[0-9]+\.[0-9]+\.[0-9]+' || true; }
# mise_tool COMMAND: the mise tool that provides COMMAND.
mise_tool() { if [[ "$1" == biome ]]; then echo biome; else echo "npm:$1"; fi; }
# The mise tools each setup runs: A's and C's; B's and D's tools are packages (below).
declare -A setup_tools=([A]="biome" [B]="" [C]="oxlint oxfmt" [D]="")
declare -A setup_formatter=([A]=biome [B]=prettier [C]=oxfmt [D]=stylistic)
declare -A setup_formatter_label=([A]="biome format" [B]=prettier [C]=oxfmt
  [D]="eslint --fix with Stylistic's and jsonc's rules")
declare -A setup_linter=([A]=biome [B]=eslint [C]=oxlint [D]=eslint)
# Each ESLint setup's packages: B's the devDependencies in the project's node_modules, D's in
# scratch.
declare -A setup_packages=([A]="" [B]="${dev_packages[*]}" [C]="" [D]="${d_packages[*]}")

# Native or Node: a native binary is an ELF executable; any other is a script, which needs Node
# when it runs node. The oxc tools' scripts load a native addon (.node) on node, so the expected
# value tells the addon apart from plain JavaScript.
declare -A runs_expected=([biome]=native [eslint]=node [prettier]=node [oxlint]="node, native addon"
  [oxfmt]="node, native addon")
declare -A runs_as
for tool in biome eslint prettier oxlint oxfmt; do
  # ESLint and Prettier are devDependencies, run from node_modules; the rest are mise tools.
  if [[ "$tool" == eslint || "$tool" == prettier ]]; then
    exe=$(readlink -f "$(command -v "$tool")") install=$(readlink -f "$root/node_modules/$tool")
  else
    exe=$(mise --cd "$root" which "$tool") install=$(mise --cd "$root" where "$(mise_tool "$tool")")
  fi
  mapfile -t addons < <(find "$install" -type f -name '*.node')
  if [[ "$(head -c 4 "$exe")" == $'\x7fELF' ]]; then
    runs_as[$tool]=native
    fact="a native binary (ELF): $exe"
  elif grep -qw node "$exe"; then
    if ((${#addons[@]} > 0)); then runs_as[$tool]="node, native addon"; else runs_as[$tool]=node; fi
    fact="needs Node: $exe is a script that runs the tool's JavaScript entry on node; native addons in its install: ${#addons[@]}"
    if ((${#addons[@]} > 0)); then
      fact+=" ($(for addon in "${addons[@]}"; do printf '%s %s; ' "${addon##*/}" "$(mb "$(du -sb "$addon" | cut -f1)")"; done | sed 's/; $//'))"
    fi
  else
    runs_as[$tool]=unknown
    fact="neither an ELF binary nor a script that runs node: $exe"
  fi
  ok=0
  if [[ "${runs_as[$tool]}" == "${runs_expected[$tool]}" ]]; then ok=1; fi
  row "Lint and format: $tool runs as ${runs_expected[$tool]}" "$ok" "$fact"
done

# B's formatter options are the repository's .prettierrc.json, which the check's prettier reads;
# the row passes when it holds exactly the options matched to biome.json's formatter, the ones C's
# oxfmt takes.
ok=0
if node -e '
  const { deepStrictEqual } = require("node:assert");
  deepStrictEqual(require(process.argv[1]), require(process.argv[2]));
' "$root/.prettierrc.json" "$lint/format.json" 2>/dev/null; then ok=1; fi
row "Lint and format, B (ESLint + Prettier): .prettierrc.json holds the options matched to biome.json's formatter" \
  "$ok" "$(node -p 'Object.keys(require(process.argv[1])).length' "$root/.prettierrc.json") options; matched: $format_options"

mapfile -t tracked < <(git -C "$root" ls-files)
mapfile -t json_files < <(printf '%s\n' "${tracked[@]}" | grep -E '\.json$')

# format_with SETUP DIR VARIANT PATH...: SETUP's formatter writing PATH..., relative to DIR, from
# DIR, with the matched options, or for Prettier and oxfmt with embedded formatting at its
# default when VARIANT is embedded. Prettier's matched options are the repository's
# .prettierrc.json; D's config is taken by -c.
format_with() {
  local setup=$1 dir=$2 config="$lint/format.json"
  if [[ "${setup_formatter[$setup]}" == prettier ]]; then config="$root/.prettierrc.json"; fi
  if [[ "$3" == embedded ]]; then config="$lint/format-embedded.json"; fi
  shift 3
  case ${setup_formatter[$setup]} in
    biome) (cd "$dir" && biome format --write --vcs-enabled=false --config-path="$tree/biome.json" "$@") ;;
    prettier) (cd "$dir" && prettier --write --config "$config" "$@") ;;
    oxfmt) (cd "$dir" && oxfmt --write -c "$config" "$@") ;;
    stylistic) (cd "$dir" && eslint -c "$tree/format-d.config.mjs" --fix "$@") ;;
  esac
}
# copy_json DIR: the tracked JSON files, copied to DIR at their paths.
copy_json() {
  mkdir -p "$1"
  (cd "$root" && printf '%s\0' "${json_files[@]}" | xargs -0 cp --parents -t "$1")
}
# strip_css DIR: DIR's copy of src/, layers/, and test/ without the components' stylesheets. The
# comparison's code is the .js and .ts files, as code_files counts them, so the stylesheets are no
# setup's code here, though the check's Prettier formats them too (.prettierignore); the scope rows
# below, over every tracked file, show what each formatter does with them.
strip_css() { find "$1" -name '*.css' -delete; }
# pad DIR: three trailing newlines on every file in DIR, which a formatter strips from any file it
# formats, so a file it skips differs from the original and fails the row.
pad() {
  local path
  while IFS= read -r path; do printf '\n\n\n' >>"$1/$path"; done < <(files "$1")
}

# The files each formatter, configured to match, leaves different from the original: over the
# formatted JSON (leaves unchanged), and after formatting the disturbed copies (restores;
# lint-compare.js disturb: calls and arrays split and joined, closing braces raised, every line
# re-indented to 0 or 4 spaces). A formatter that can't is a fact, recorded here once a run showed
# it; the row passes when the files that differ are these, sorted. oxfmt puts package.json's
# one-element files array on one line, where Biome and Prettier expand every array in a
# package.json. ESLint Stylistic and jsonc only adjust whitespace in place, consistently with what
# they find, so a split call stays split and a joined line stays joined.
declare -A changed_json=([C]="package.json")
declare -A unrestored=(
  [C json]="package.json"
  [D code]="layers/apps/application/documents/main.ts layers/apps/application/documents/views/list.ts layers/apps/application/prompts/main.ts layers/apps/static/site/main.ts layers/components/entry-lit-light.ts layers/components/entry-lit-shadow.ts layers/components/entry-vanilla-light.ts layers/components/entry-vanilla-shadow.ts layers/components/pagination-lit-light.ts layers/components/pagination-lit-shadow.ts layers/components/pagination-vanilla-light.ts layers/components/pagination-vanilla-shadow.ts layers/components/status-badge.ts layers/foundation/dom.ts layers/sdk/session.ts src/js/pagination-lit.js src/js/pagination-vanilla.js src/js/router.js src/jsdoc/pagination-lit.js src/jsdoc/pagination-vanilla.js src/jsdoc/router.js src/ts/pagination-lit.ts src/ts/pagination-vanilla.ts src/ts/router.ts test/layers-tree.js test/layers.test.js test/router.test.js"
  [D json]=".claude/settings.json fixtures/consumer-bun/tsconfig.json fixtures/consumer-npm/tsconfig.json fixtures/consumer-pnpm/tsconfig.json package.json scripts/biome-layers.json tsconfig.build.json tsconfig.demo.json tsconfig.json"
)

for setup in "${setups[@]}"; do
  prefix="Lint and format, $setup (${setup_name[$setup]})"
  formatter=${setup_formatter[$setup]}
  label=${setup_formatter_label[$setup]}

  # Footprint: each mise tool's install, and an ESLint setup's packages, at their pins: B's the
  # devDependencies' directories in pnpm's virtual store, D's its scratch node_modules.
  ok=1 parts=() sizes=()
  for tool in ${setup_tools[$setup]}; do
    want=$(pin "$(mise_tool "$tool")") got=$(tool_version "$tool")
    if [[ -z "$want" || "$got" != "$want" ]]; then ok=0; fi
    parts+=("$tool $got (pin $want) $(mb "${footprint_bytes[$(mise_tool "$tool")]}")")
    sizes+=("${footprint_bytes[$(mise_tool "$tool")]}")
  done
  if [[ -n "${setup_packages[$setup]}" ]]; then
    installed=()
    if [[ "$setup" == B ]]; then modules="$root/node_modules"; else modules="$lint/node_modules"; fi
    for spec in ${setup_packages[$setup]}; do
      name=${spec%@*} want=${spec##*@}
      got=$(node -p 'require(process.argv[1]).version' "$modules/$name/package.json" 2>/dev/null || echo none)
      if [[ "$got" != "$want" ]]; then ok=0; fi
      installed+=("$name $got")
    done
    if [[ "$setup" == B ]]; then
      packages=$(lint_compare packages-at "${b_dirs[@]}")
      plugins=$(du -sbc "${b_dirs[@]}" | tail -n1 | cut -f1)
      where_="devDependencies in node_modules (pnpm)"
    else
      packages=$(lint_compare packages "$modules")
      plugins=$(du -sb "$modules" | cut -f1)
      where_="scratch node_modules (npm)"
    fi
    sizes+=("$plugins")
    printf -v list '%s, ' "${installed[@]}"
    parts+=("$where_, ${list%, } and their dependencies, $packages packages: $(mb "$plugins")")
  fi
  if [[ "$setup" == A ]]; then runtime="no runtime"; else
    runtime="plus node, $(mb "${footprint_bytes[node]}"), which runs them and the Node column counts"
  fi
  printf -v list '%s; ' "${parts[@]}"
  row "$prefix: footprint, every tool and package at its pin" "$ok" "${list}total $(mb "${sizes[@]}"), $runtime"

  # Time: the timings' means, with each command's exit status on the tree. D lints with B's
  # command and config, so its lint mean is B's.
  timed=$setup shared=""
  if [[ "$setup" == D ]]; then timed=B shared=", B's command and config"; fi
  ok=0
  if ((lint_status[$setup] == 0 && format_status[$setup] == 0 && both_status[$setup] == 0)); then ok=1; fi
  fact="lint ${lint_ms[${lint_label[$timed]}]} (exit ${lint_status[$setup]}$shared);"
  fact+=" format check ${lint_ms[${format_label[$setup]}]} (exit ${format_status[$setup]});"
  fact+=" lint + format ${lint_ms[$setup: lint + format]} (exit ${both_status[$setup]})"
  if ((ok == 0)); then
    fact+="; lint: $(tail -n3 "$lint/lint-$setup.log"); format: $(tail -n3 "$lint/format-$setup.log"); both: $(tail -n3 "$lint/both-$setup.log")"
  fi
  row "$prefix: lint, format check, and both on the tree, each passing" "$ok" "$fact"

  # Leaves unchanged, code: the formatter, configured to match, writing over a padded copy of the
  # tree; and, for Prettier and oxfmt, the same with embedded formatting at its default.
  variants=(matched)
  if [[ "$setup" == B || "$setup" == C ]]; then variants+=(embedded); fi
  declare -A format_diff=() format_exit=()
  for variant in "${variants[@]}"; do
    dir="$lint/format-$setup-$variant"
    mkdir -p "$dir"
    cp -r "$root/src" "$root/layers" "$root/test" "$dir/"
    strip_css "$dir"
    pad "$dir"
    status=0
    format_with "$setup" "$dir" "$variant" src layers test >"$dir.log" 2>&1 || status=$?
    format_exit[$variant]=$status
    format_diff[$variant]=$(differing "$dir" "$root")
  done
  case $setup in
    A) options="biome.json's $(node -p 'Object.entries(require(process.argv[1]).formatter).map((e) => e.join(" ")).join(", ")' "$root/biome.json"), and Biome's defaults for the rest" ;;
    D) options="Stylistic's customize with $stylistic_options, and the rules Biome's output needs beside it (format-d.config.mjs); max-len at the width, which reports and never fixes" ;;
    *) options=$format_options ;;
  esac
  code_files=$(files "$tree" | grep -cE '^(src|layers|test)/.*\.(js|ts)$')
  diff=${format_diff[matched]% }
  ok=0
  if ((format_exit[matched] == 0)) && [[ -z "$diff" ]]; then ok=1; fi
  fact="options: $options; exit ${format_exit[matched]}; ${diff:+differ from the tree: $diff}"
  if [[ -z "$diff" ]]; then fact+="all $code_files files of src/, layers/, and test/ come out byte for byte the tree's"; fi
  if [[ "$setup" == B || "$setup" == C ]]; then
    diff=${format_diff[embedded]% }
    if [[ -n "$diff" ]]; then diff="differ: $diff"; else diff="none differ"; fi
    fact+="; with embeddedLanguageFormatting auto, its default, exit ${format_exit[embedded]}, $diff"
  fi
  row "$prefix: $label leaves the formatted code unchanged, byte for byte" "$ok" "$fact"

  # Leaves unchanged, JSON: the same over a padded copy of the tracked JSON files.
  dir="$lint/json-$setup"
  copy_json "$dir"
  pad "$dir"
  status=0
  format_with "$setup" "$dir" matched "${json_files[@]}" >"$dir.log" 2>&1 || status=$?
  diff=$(differing "$dir" "$root")
  diff=${diff% }
  want=${changed_json[$setup]:-}
  ok=0
  if ((status == 0)) && [[ "$diff" == "$want" ]]; then ok=1; fi
  fact="exit $status; "
  if [[ -n "$diff" ]]; then fact+="differ from the repository's: $diff"; else
    fact+="all ${#json_files[@]} tracked JSON files come out byte for byte the repository's"
  fi
  if [[ -n "$want" ]]; then fact+="; recorded as a fact: the expected changes are these files"; fi
  if [[ "$diff" != "$want" ]]; then fact+="; recorded: ${want:-none}"; fi
  if [[ "$setup" == D ]]; then fact+="; jsonc's rules: format-d.config.mjs"; fi
  row "$prefix: $label leaves the JSON unchanged, byte for byte" "$ok" "$fact"

  # Restores: the formatter over a disturbed copy, code and JSON, against the recorded misses.
  for kind in code json; do
    dir="$lint/restore-$setup-$kind"
    if [[ "$kind" == code ]]; then
      mkdir -p "$dir"
      cp -r "$root/src" "$root/layers" "$root/test" "$dir/"
      strip_css "$dir"
      paths=(src layers test)
      what="the $code_files code files" kind_label=code
    else
      copy_json "$dir"
      paths=("${json_files[@]}")
      what="the ${#json_files[@]} JSON files" kind_label=JSON
    fi
    mapfile -t disturbed < <(files "$dir")
    done_=$(lint_compare disturb "$lint" "$dir" "${disturbed[@]}")
    status=0
    format_with "$setup" "$dir" matched "${paths[@]}" >"$dir.log" 2>&1 || status=$?
    diff=$(differing "$dir" "$root")
    diff=${diff% }
    want=${unrestored[$setup $kind]:-}
    # The formatter must have run and exited 0, so a crash that leaves the recorded misses as they
    # were disturbed fails the row.
    ok=0
    if ((status == 0)) && [[ "$diff" == "$want" ]]; then ok=1; fi
    fact="$what disturbed ($done_; wide: joined lines past 100 columns, which only a reflow breaks again); exit $status; "
    if [[ -z "$diff" ]]; then fact+="every file comes out byte for byte the original"; else
      fact+="$(wc -w <<<"$diff") files differ: $diff"
    fi
    if [[ -n "$want" ]]; then fact+="; recorded as a fact: the expected misses are these files"; fi
    if [[ "$setup" == D ]]; then
      # The lines past the width, in the result and in the original: a joined line max-len skips
      # (it ignores a line holding a string, a template literal, a regex, or a URL) stays past the
      # width with eslint exiting 0, since max-len reports nothing there.
      past=$(cd "$dir" && cat -- "${disturbed[@]}" | awk 'length > 100' | wc -l)
      past_original=$(cd "$root" && cat -- "${disturbed[@]}" | awk 'length > 100' | wc -l)
      fact+="; Stylistic has no line-width reflow and max-len no fixer, so a split call stays split; lines past 100 columns: $past, against $past_original in the original"
      if ((status == 0 && past > past_original)); then
        fact+=", so max-len, with its ignore options, reports none of the $((past - past_original)) more"
      fi
    fi
    if [[ "$diff" != "$want" ]]; then fact+="; recorded: ${want:-none}"; fi
    if ((status != 0)); then fact+="; the formatter failed: $(tail -n3 "$dir.log")"; fi
    row "$prefix: $label restores the $kind_label from a copy with disturbed line breaks and indentation" "$ok" "$fact"
  done
done

# Scope: every tracked file of the repository, copied; the padded copy is the one the scope runs
# start from and are compared with.
# copy_repo DIR: the repository's tracked files, copied to DIR.
copy_repo() {
  mkdir -p "$1"
  (cd "$root" && printf '%s\0' "${tracked[@]}" | xargs -0 cp --parents -t "$1")
}
# extensions FILE...: how many of FILE... have each extension (a dotfile's name counts as its
# extension), as "ext count, ..." on one line.
extensions() {
  printf '%s\n' "$@" | sed -E 's#.*/##; s/^\.//; s/.*\.//' | LC_ALL=C sort | uniq -c |
    awk '{ printf "%s%s %s", sep, $2, $1; sep = ", " }'
}
# touched DIR ORIGINAL: the tracked files in DIR that aren't ORIGINAL's byte for byte, one per line.
touched() {
  local path
  for path in "${tracked[@]}"; do cmp -s "$1/$path" "$2/$path" || echo "$path"; done
}
padded="$lint/scope-padded"
copy_repo "$padded"
for path in "${tracked[@]}"; do printf '\n\n\n' >>"$padded/$path"; done
mapfile -t code < <(printf '%s\n' "${tracked[@]}" | grep -E '\.(js|ts)$')
# The scope a setup formats: the check's, the code, the JSON, and the components' stylesheets.
mapfile -t scoped < <(printf '%s\n' "${tracked[@]}" | grep -E '\.(js|ts|json|css)$')
# The files of that scope a formatter can't reach, a fact recorded here once a run showed it, as an
# extension: ESLint Stylistic's rules are JavaScript's, so D formats no CSS.
declare -A unreached=([stylistic]=css)
# Biome's limit: biome.json with files.includes naming the code, JSON, and CSS files.
mkdir -p "$lint/biome-code"
node -e '
  const fs = require("node:fs");
  const config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  config.files = { includes: ["**/*.js", "**/*.ts", "**/*.json", "**/*.css"] };
  fs.writeFileSync(process.argv[2], JSON.stringify(config, null, 2));
' "$root/biome.json" "$lint/biome-code/biome.json"
declare -A limit_how=(
  [biome]='files.includes ["**/*.js", "**/*.ts", "**/*.json", "**/*.css"] in biome.json'
  [prettier]="the repository's .prettierignore: *, !*/, !*.js, !*.ts, !*.json, !*.css"
  [oxfmt]="the same .prettierignore, which oxfmt reads too"
  [stylistic]="its config's own files globs, the code and **/*.json, the same run as its default"
)
# format_repo FORMATTER DIR MODE: FORMATTER's default run over DIR, with the matched options, the
# copied .prettierignore moved out of DIR for the run, since Prettier and oxfmt both read it; with
# limited, as its configuration limits it to the scope above, Prettier and oxfmt by the
# repository's .prettierignore, copied with the tracked files. ESLint, D's formatter, runs its
# config over the files the config names in both modes.
format_repo() {
  local config=$tree/biome.json status=0
  if [[ "$3" == limited ]]; then config=$lint/biome-code/biome.json; else mv "$2/.prettierignore" "$2.prettierignore"; fi
  case $1 in
    biome) (cd "$2" && biome format --write --vcs-enabled=false --config-path="$config" .) ;;
    prettier) (cd "$2" && prettier --write --config "$root/.prettierrc.json" .) ;;
    oxfmt) (cd "$2" && oxfmt --write -c "$lint/format.json" .) ;;
    stylistic) (cd "$2" && eslint -c "$tree/format-d.config.mjs" --fix .) ;;
  esac || status=$?
  if [[ "$3" != limited ]]; then mv "$2.prettierignore" "$2/.prettierignore"; fi
  return "$status"
}
for setup in "${setups[@]}"; do
  prefix="Lint and format, $setup (${setup_name[$setup]})"
  formatter=${setup_formatter[$setup]}
  label=${setup_formatter_label[$setup]}
  declare -A scope_exit=() scope_files=()
  for mode in default limited; do
    dir="$lint/scope-$formatter-$mode"
    cp -r "$padded" "$dir"
    status=0
    format_repo "$formatter" "$dir" "$mode" >"$dir.log" 2>&1 || status=$?
    scope_exit[$mode]=$status
    scope_files[$mode]=$(touched "$dir" "$padded")
  done
  mapfile -t default_files <<<"${scope_files[default]}"
  mapfile -t limited_files <<<"${scope_files[limited]}"
  default_json=$(grep -c '\.json$' <<<"${scope_files[default]}" || true)
  limited_json=$(grep -c '\.json$' <<<"${scope_files[limited]}" || true)
  # The scope less the extension the formatter can't reach, if one is recorded.
  expected=$(printf '%s\n' "${scoped[@]}")
  if [[ -n "${unreached[$formatter]:-}" ]]; then
    expected=$(grep -v -E "\\.${unreached[$formatter]}\$" <<<"$expected" || true)
  fi
  ok=0
  if ((scope_exit[limited] == 0)) && [[ "${scope_files[limited]}" == "$expected" ]]; then ok=1; fi
  fact="the repository's ${#tracked[@]} tracked files: $(extensions "${tracked[@]}");
    by default $label touches $(extensions "${default_files[@]}") (exit ${scope_exit[default]}), JSON $default_json of ${#json_files[@]};
    limited by ${limit_how[$formatter]}, $(extensions "${limited_files[@]}") (exit ${scope_exit[limited]}), JSON $limited_json of ${#json_files[@]}"
  if [[ -n "${unreached[$formatter]:-}" ]]; then
    fact+="; recorded: it formats no ${unreached[$formatter]}"
  fi
  if ((ok == 0)); then
    fact+="; touched beside the scope: $(LC_ALL=C comm -23 <(LC_ALL=C sort <<<"${scope_files[limited]}") <(LC_ALL=C sort <<<"$expected") | paste -s -d ' ' -);
      in the scope, untouched: $(LC_ALL=C comm -13 <(LC_ALL=C sort <<<"${scope_files[limited]}") <(LC_ALL=C sort <<<"$expected") | paste -s -d ' ' -)"
  fi
  row "$prefix: $label, its configuration limiting it to the code, JSON, and CSS files" "$ok" "$fact"

  # Rewrites: the default run over an unpadded copy, each file it changes with its lines removed
  # and added, every Markdown file named.
  dir="$lint/rewrite-$formatter"
  copy_repo "$dir"
  status=0
  format_repo "$formatter" "$dir" default >"$dir.log" 2>&1 || status=$?
  changes=() code_changed=0
  for path in "${tracked[@]}"; do
    if cmp -s "$dir/$path" "$root/$path"; then
      if [[ "$path" == *.md ]]; then changes+=("$path unchanged"); fi
      continue
    fi
    if [[ "$path" =~ \.(js|ts)$ ]]; then code_changed=1; fi
    changes+=("$path -$(diff "$root/$path" "$dir/$path" | grep -c '^<') +$(diff "$root/$path" "$dir/$path" | grep -c '^>') of $(wc -l <"$root/$path") lines")
  done
  # The padded default run above shows the formatter reached every code file, so an unchanged
  # code file is one it formatted and left as it was, not one it skipped.
  skipped=$(LC_ALL=C comm -23 <(printf '%s\n' "${code[@]}" | LC_ALL=C sort) <(LC_ALL=C sort <<<"${scope_files[default]}") | paste -s -d ' ' -)
  ok=0
  if ((status == 0 && code_changed == 0)) && [[ -z "$skipped" ]]; then ok=1; fi
  printf -v list '%s; ' "${changes[@]}"
  row "$prefix: $label over the repository by default, with the matched options, rewrites no code file" \
    "$ok" "exit $status; ${list%; }${skipped:+; code files the default run never reached: $skipped}"
done

# Direction: the layer rules over the violation and allowed trees, each tree with the files its
# imports name and a copy of lit in its node_modules, so the resolved-file plugins resolve what
# the cases name. ESLint's and oxlint's copies of biome-layers.json's groups run too, in trees of
# their own, as a fact beside their translated forms; so do the two resolved-file plugins, the
# check's boundaries by the repository's eslint.config.js.
for kind in violations allowed; do
  for base in "$lint" "$lint/globs" "$lint/boundaries" "$lint/import-x"; do
    mkdir -p "$base/$kind/node_modules"
    lint_compare tree "$base/$kind" "$kind"
    cp -rL "$root/node_modules/lit" "$base/$kind/node_modules/"
  done
  lint_compare biome-config "$root/biome.json" "$lint/$kind/biome.json"
  lint_compare eslint-config "$root/biome.json" "$lint/$kind/eslint.config.mjs" regex
  lint_compare eslint-config "$root/biome.json" "$lint/globs/$kind/eslint.config.mjs" globs
  lint_compare eslint-config "$root/biome.json" "$lint/import-x/$kind/eslint.config.mjs" import-x
  lint_compare oxlint-config "$lint/$kind/.oxlintrc.json" merged
  lint_compare oxlint-config "$lint/globs/$kind/.oxlintrc.json" globs
done
# direction LINTER DIR [RULES]: the files LINTER flags with its restricted-imports rule, or for
# ESLint with any of RULES, in DIR/layers, one per line, after checking that it linted every file
# there; a short run fails the row. ESLint takes the config in DIR, or for the boundaries trees the
# repository's by -c.
direction() {
  local linter=$1 dir=$2 rules=${3:-no-restricted-imports} count config=()
  if [[ "$dir" == "$lint/boundaries/"* ]]; then config=(-c "$root/eslint.config.js"); fi
  case $linter in
    biome) (cd "$dir" && biome lint --vcs-enabled=false --reporter=json --max-diagnostics=none layers) ;;
    eslint) (cd "$dir" && eslint "${config[@]}" -f json layers) ;;
    oxlint) (cd "$dir" && oxlint -c .oxlintrc.json -f json layers) ;;
  esac >"$dir/$linter-report.json" 2>"$dir/$linter.log" || true
  count=$(lint_compare linted "$linter" "$dir/$linter-report.json" 2>/dev/null || echo 0)
  if [[ "$count" != "$(find "$dir/layers" -type f | wc -l)" ]]; then
    echo "linted $count files: $(tail -n2 "$dir/$linter.log")"
    return
  fi
  lint_compare flagged "$linter" "$dir/$linter-report.json" "$dir" "$rules"
}
mapfile -t violation_files < <(lint_compare cases violations | LC_ALL=C sort)
allowed_count=$(lint_compare cases allowed | wc -l)
# ESLint's no-restricted-imports checks import and export declarations, never an import()
# expression, so the violation files whose import is dynamic are the edges it can't express.
mapfile -t dynamic < <(lint_compare dynamic | LC_ALL=C sort)
# The text rules' normalization convention refuses a relative specifier that isn't normalized, by
# its text, so they flag the allowed files whose path isn't normalized but reaches a file the layer
# may import: recorded as a fact, the files those rules draw on the allowed tree.
text_drawn="layers/apps/application/documents/name-parent.ts
layers/components/unnormalized.ts"
for setup in A B C; do
  prefix="Lint and format, $setup (${setup_name[$setup]})"
  linter=${setup_linter[$setup]}
  missed=()
  if [[ "$linter" == eslint ]]; then
    missed=("${dynamic[@]}")
    prefix="Lint and format, B and D (ESLint)"
  fi
  want=$(LC_ALL=C comm -23 <(printf '%s\n' "${violation_files[@]}") <(printf '%s\n' "${missed[@]}" | sed '/^$/d'))
  flagged=$(direction "$linter" "$lint/violations")
  drawn=$(direction "$linter" "$lint/allowed")
  ok=0
  if [[ "$flagged" == "$want" && "$drawn" == "$text_drawn" ]]; then ok=1; fi
  fact="flags $(grep -c . <<<"$flagged" || true) of ${#violation_files[@]} violation files and $(grep -c . <<<"$drawn" || true) of $allowed_count allowed files"
  extra=$(LC_ALL=C comm -13 <(echo "$want") <(echo "$flagged") | paste -s -d ' ' -)
  short=$(LC_ALL=C comm -23 <(echo "$want") <(echo "$flagged") | paste -s -d ' ' -)
  fact+="${short:+; misses: $short}${extra:+; flags beyond the violations: $extra}${drawn:+; allowed files flagged: $(paste -s -d ' ' - <<<"$drawn")}"
  if ((${#missed[@]} > 0)); then
    printf -v list '%s ' "${missed[@]}"
    fact+="; not expressible: no-restricted-imports never checks an import() expression, so it misses the dynamic edges in ${list% }"
  else
    fact+="; every edge expressible"
  fi
  if [[ "$linter" == eslint ]]; then
    globs_flagged=$(direction eslint "$lint/globs/violations")
    globs_drawn=$(direction eslint "$lint/globs/allowed")
    fact+="; with the groups copied as ESLint groups rather than translated, it flags $(grep -c . <<<"$globs_flagged" || true) violation files and $(grep -c . <<<"$globs_drawn" || true) of $allowed_count allowed files: ESLint reads a group as gitignore lines, where ** excludes ./ and ../ themselves and a ! line can't re-include a path under an excluded parent"
  fi
  if [[ "$linter" == oxlint ]]; then
    globs_flagged=$(direction oxlint "$lint/globs/violations")
    globs_drawn=$(direction oxlint "$lint/globs/allowed")
    globs_short=$(LC_ALL=C comm -23 <(echo "$want") <(echo "$globs_flagged") | paste -s -d ' ' -)
    fact+="; with the groups copied rather than merged, it flags $(grep -c . <<<"$globs_flagged" || true) violation files and $(grep -c . <<<"$globs_drawn" || true) of $allowed_count allowed files${globs_short:+, missing $globs_short}: oxlint reads the globs' braces, but a ! pattern that matches in one group re-allows what another group refuses"
  fi
  fact+="; recorded as a fact: the allowed files the normalization convention refuses, $(paste -s -d ' ' - <<<"$text_drawn")"
  row "$prefix: ${linter}'s restricted-imports rule, configured as the superseded layer overrides (scripts/biome-layers.json), flags the violation tree and of the allowed one only the non-normalized paths" \
    "$ok" "$fact"
done

# The resolved-file plugins, each with its no-unresolved rule (import-x's for both), configured as
# eslint.config.js's layer table, run under the project's ESLint over the same trees: boundaries
# by the repository's config itself, import-x by lint-compare.js's. Each passes only when the
# files it flags, by either rule, are the violation files less the misses recorded here once a
# run showed them, and the allowed files it flags are the ones recorded. Both resolve a specifier
# to the file it names, so a specifier that isn't normalized but reaches a file its layer may
# import is no crossing to them, and the allowed tree holds two (test/layers-tree.js).
declare -A plugin_rules=(
  [boundaries]="boundaries/dependencies,import-x/no-unresolved"
  [import-x]="import-x/no-restricted-paths,import-x/no-unresolved"
)
declare -A plugin_label=(
  [boundaries]="eslint-plugin-boundaries' dependencies rule (eslint-import-resolver-typescript), the plugin whose rule alone passes both trees, with import-x's no-unresolved"
  [import-x]="eslint-plugin-import-x's no-restricted-paths (its built-in resolver, .js to .ts by extensionAlias) with its no-unresolved"
)
# import-x's no-restricted-paths reads an import as outside a zone's directory when its path
# relative to the directory starts with "..", so a directory inside the layer named ..x or ...
# is outside it: the allowed tree's dotted files draw it.
declare -A plugin_missed=([boundaries]="" [import-x]="")
# A plugin named here passes only when its own rule, without no-unresolved, flags every file it
# should: boundaries' row label says its rule alone passes both trees.
declare -A plugin_alone=([boundaries]=1 [import-x]=0)
declare -A plugin_drawn=([boundaries]="" [import-x]="layers/apps/static/site/dotted.ts layers/components/dotted.ts")
for plugin in boundaries import-x; do
  rules=${plugin_rules[$plugin]}
  rule=${rules%%,*}
  plugin_misses=${plugin_missed[$plugin]}
  want=$(LC_ALL=C comm -23 <(printf '%s\n' "${violation_files[@]}") <(tr ' ' '\n' <<<"$plugin_misses" | sed '/^$/d' | LC_ALL=C sort))
  flagged=$(direction eslint "$lint/$plugin/violations" "$rules")
  drawn=$(direction eslint "$lint/$plugin/allowed" "$rules")
  by_rule=$(lint_compare flagged eslint "$lint/$plugin/violations/eslint-report.json" "$lint/$plugin/violations" "$rule" | grep -c . || true)
  unresolved=$(LC_ALL=C comm -23 <(lint_compare flagged eslint "$lint/$plugin/violations/eslint-report.json" "$lint/$plugin/violations" import-x/no-unresolved) <(lint_compare flagged eslint "$lint/$plugin/violations/eslint-report.json" "$lint/$plugin/violations" "$rule") | paste -s -d ' ' -)
  ok=0
  if [[ "$flagged" == "$want" && "$(paste -s -d ' ' - <<<"$drawn")" == "${plugin_drawn[$plugin]}" ]]; then ok=1; fi
  if ((plugin_alone[$plugin])) && [[ "$by_rule" != "$(grep -c . <<<"$want" || true)" ]]; then ok=0; fi
  fact="under eslint $(tool_version eslint), flags $(grep -c . <<<"$flagged" || true) of ${#violation_files[@]} violation files ($by_rule by ${rule}${unresolved:+, the rest by no-unresolved alone: $unresolved}) and $(grep -c . <<<"$drawn" || true) of $allowed_count allowed files"
  short=$(LC_ALL=C comm -23 <(printf '%s\n' "${violation_files[@]}") <(echo "$flagged") | paste -s -d ' ' -)
  extra=$(LC_ALL=C comm -13 <(printf '%s\n' "${violation_files[@]}") <(echo "$flagged") | paste -s -d ' ' -)
  fact+="${short:+; misses: $short}${extra:+; flags beyond the violations: $extra}${drawn:+; allowed files flagged: $(paste -s -d ' ' - <<<"$drawn")}"
  if [[ -n "$plugin_misses${plugin_drawn[$plugin]}" ]]; then
    fact+="; recorded as facts: misses ${plugin_misses:-none}, allowed files flagged ${plugin_drawn[$plugin]:-none}"
  fi
  row "Lint and format, B and D (ESLint): ${plugin_label[$plugin]}, configured as the layer table, flags the violation tree and not the allowed one" \
    "$ok" "$fact"
done

# Surface: what a repository holding each setup keeps: the binaries it runs from PATH, its config
# files, and the packages it pins and keeps current, directly, with every package installed under
# them as a second figure (the mise tools' installs, B's devDependencies' closure, and D's scratch
# packages).
declare -A surface_binaries=([A]="biome" [B]="eslint prettier node" [C]="oxlint oxfmt node" [D]="eslint node")
declare -A surface_configs=(
  [A]="biome.json, the linter's and the formatter's options and the layer rules in one"
  [B]="eslint.config.js, the lint rules and the layer table; .prettierrc.json, the formatter's options; .prettierignore, to limit Prettier to the code, JSON, and CSS; pnpm-workspace.yaml, the pnpm settings the devDependencies' install needs (allowBuilds)"
  [C]=".oxlintrc.json, the lint rules and the layer rules; .oxfmtrc.json, the formatter's options; .prettierignore, which oxfmt reads too, to limit it to the code, JSON, and CSS"
  [D]="eslint.config.js, the lint rules, the layer table, and Stylistic's and jsonc's formatting rules in one"
)
for setup in "${setups[@]}"; do
  ok=1 found=() direct=() dirs=()
  for binary in ${surface_binaries[$setup]}; do
    if path=$(command -v "$binary"); then found+=("$binary"); else ok=0; found+=("$binary missing"); fi
  done
  for tool in ${setup_tools[$setup]}; do
    direct+=("$tool $(pin "$(mise_tool "$tool")") (mise)")
    if [[ "$tool" != biome ]]; then dirs+=("$(mise --cd "$root" where "$(mise_tool "$tool")")"); fi
  done
  for spec in ${setup_packages[$setup]}; do direct+=("$spec"); done
  if [[ "$setup" == D ]]; then dirs+=("$lint/node_modules"); fi
  if [[ "$setup" == B ]]; then transitive=$(lint_compare packages-at "${b_dirs[@]}")
  elif ((${#dirs[@]} > 0)); then transitive=$(lint_compare packages "${dirs[@]}"); else transitive=0; fi
  printf -v list '%s, ' "${direct[@]}"
  fact="binaries on PATH: ${found[*]}; config files: ${surface_configs[$setup]}; packages to keep current: ${#direct[@]} (${list%, }); installed packages under them: $transitive"
  if [[ "$setup" == A ]]; then fact+=", biome being one native binary"; fi
  row "Lint and format, $setup (${setup_name[$setup]}): surface, binaries, config files, and packages to keep current" "$ok" "$fact"
done

echo "## Rows"
echo
if ((!own_released)); then
  echo "This package's $own_tag isn't on GitHub yet: its GitHub and jsDelivr rows report not yet released, and the file:// pages load the element from the working tree."
  echo
fi
echo "| row | result | observed |"
echo "| --- | --- | --- |"
printf '%s\n' "${rows[@]}"

exit "$failed"
