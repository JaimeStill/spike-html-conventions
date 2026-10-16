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
# Before the timings, two sections read only the local disk:
#
#   footprint       each mise tool's installed size, from mise where and du -sb, with the column
#                   it belongs to and each column's total: Node with npm and Node with pnpm, each
#                   alone and with each of its bundlers, esbuild or Vite; and Bun. npm is its own
#                   pin; the npm node bundles is counted in node's size and recorded beside it.
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
  "github:microsoft/typescript-go|both (tsc)" "biome|both"
  "shellcheck|the check only" "aqua:sharkdp/hyperfine|the measure task only"
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
echo "Tools each column adds: Node + npm, $(column npm); Node + pnpm, $(column pnpm); Bun, bun = $(mb "${footprint_bytes[bun]}"). Vite runs on node; tsc and biome are in both. node's size includes the npm $(node -p 'require(process.argv[1]).version' "$node_npm/package.json") it bundles, $(mb "$(du -sb "$node_npm" | cut -f1)"), which the npm column doesn't run: npm 12 is its own pin."
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

# timing TITLE NOTE HYPERFINE_ARGS...: one hyperfine run, its markdown table under a heading.
# hyperfine 2 runs each command without a shell, so commands set variables with env and prepare
# with a single rm.
timing() {
  local title=$1 note=$2
  shift 2
  echo "measure: timing $title" >&2
  hyperfine --style basic --export-markdown "$scratch/timing.md" "$@" >&2
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
