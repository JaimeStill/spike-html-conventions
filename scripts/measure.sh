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
# Timings, each hyperfine's mean of several runs, Node (node 26 + pnpm) against Bun:
#
#   install, cold   a consumer fixture installs spike-html-design v0.7.0 and this package by git
#                   tag, each source pointed at a local repository (git+file://, tag kept) so
#                   the git half isn't network-bound: spike-html-design's checkout and the
#                   scratch repository scripts/consumers.sh makes, tagged v0.1.0. Lit comes from
#                   the registry into an empty store or cache, emptied before every run.
#   install, warm   the same with the store or cache kept, and node_modules and the lockfile
#                   removed before every run.
#   type check      tsc --noEmit over the .ts and JSDoc forms: one tool, the same in both columns.
#   build           Node: tsc emit and an esbuild bundle; Bun: bun build. Each bundler takes all
#                   six element entries in one invocation, into scratch.
#   watch rebuild   see below.
#   test            node --test against bun test, over the shared suite.
#
# Watch rebuild: each watcher (tsc --watch, esbuild --watch, bun build --watch) runs over a
# scratch copy of the sources, never the working tree. One sample rewrites the copy's
# src/ts/pagination-lit.ts with a new `export const stamp = N;` line and polls the output until
# it holds `stamp = N`, so hyperfine's time is from the source change to the rebuilt output, plus
# this script's startup and the poll's granularity of a few milliseconds.
#
# Before the timings, two sections read only the local disk:
#
#   footprint       each mise tool's installed size, from mise where and du -sb, with the column
#                   it belongs to and each column's total.
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
#   prefixed tag    from a local, unpushed fixture/v0.1.0 tag with the package in fixture/,
#                   pnpm installs the subdirectory with #fixture/v0.1.0&path:/fixture, each file
#                   the fixture's byte for byte; bun can't, reading the whole fragment as the ref.
#   GitHub          a scratch consumer installs the package from github:<owner>/<repo>#<tag> under
#                   pnpm and under bun, each with a store or cache of its own in scratch; it
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
version bun "$(bun --version)"
version tsc "$(tsc --version)"
version esbuild "$(esbuild --version)"
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
  "node|Node" "pnpm|Node" "npm:esbuild|Node, to bundle" "bun|Bun"
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
node_column=$(mb "${footprint_bytes[node]}" "${footprint_bytes[pnpm]}")
node_bundler=$(mb "${footprint_bytes[node]}" "${footprint_bytes[pnpm]}" "${footprint_bytes[npm:esbuild]}")
bun_column=$(mb "${footprint_bytes[bun]}")
echo "Tools each column adds: Node, node + pnpm = $node_column ($node_bundler with esbuild); Bun, bun = $bun_column. tsc and biome are in both."
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
  consumer "$scratch/$mode/bun" bun
done

# Each manager's store or cache and its metadata cache are scratch, per mode: pnpm's store by
# --store-dir, its metadata cache and state under XDG_CACHE_HOME and XDG_STATE_HOME; bun's
# cache, git clones included, by BUN_INSTALL_CACHE_DIR.
# pnpm_install MODE and bun_install MODE print the command hyperfine times; pnpm_warm and
# bun_warm PROJECT run the same install of another project against the warm store or cache.
pnpm_install() {
  local mode=$1
  echo "env XDG_CACHE_HOME=$scratch/$mode/pnpm-xdg/cache XDG_STATE_HOME=$scratch/$mode/pnpm-xdg/state" \
    "pnpm --dir $scratch/$mode/pnpm install --store-dir $scratch/$mode/pnpm-store"
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
bun_warm() {
  BUN_INSTALL_CACHE_DIR=$scratch/warm/bun-cache bun install --cwd "$1"
}
clean_project() {
  echo "rm -rf $1/node_modules $1/pnpm-lock.yaml $1/bun.lock $1/bun.lockb"
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
  --prepare "$(clean_project "$scratch/cold/bun") $scratch/cold/bun-cache" \
  -n "Bun: bun install" "$(bun_install cold)"

timing "Install from a git tag, warm" \
  "The same installs with the store or cache kept from a warmup run; node_modules and the lockfile removed before each run." \
  --runs 10 --warmup 1 \
  --prepare "$(clean_project "$scratch/warm/pnpm")" \
  -n "Node: pnpm install" "$(pnpm_install warm)" \
  --prepare "$(clean_project "$scratch/warm/bun")" \
  -n "Bun: bun install" "$(bun_install warm)"

timing "Type check" \
  "tsc --noEmit over the .ts and JSDoc forms. The native tsc is one tool for both columns." \
  --runs 10 --warmup 1 \
  -n "Both: tsc --noEmit" "tsc --noEmit -p $root"

timing "Build" \
  "Node: tsc emit of the .ts and JSDoc forms, and esbuild bundling all six element entries, Lit included, in one invocation; Bun: bun build of the same six. Output in scratch." \
  --runs 10 --warmup 1 \
  -n "Node: tsc emit" "tsc -p $root/tsconfig.build.json --outDir $scratch/build/tsc" \
  -n "Node: esbuild" "esbuild ${root_entries[*]} --bundle --format=esm --log-level=warning --outbase=$root/src --outdir=$scratch/build/esbuild" \
  -n "Bun: bun build" "env NODE_ENV=production bun build ${root_entries[*]} --target=browser --format=esm --root=$root/src --outdir=$scratch/build/bun"

# The watchers, each over the scratch copy, into its own output directory.
echo "measure: starting watchers" >&2
tsc -p "$work/tsconfig.build.json" --outDir "$work/out/tsc" --watch --preserveWatchOutput \
  >"$scratch/watch-tsc.log" 2>&1 &
watchers+=($!)
# --watch=forever: a background job's stdin is closed, which ends a plain --watch.
esbuild "${work_entries[@]}" --bundle --format=esm --log-level=warning --outbase="$work/src" \
  --outdir="$work/out/esbuild" --watch=forever >"$scratch/watch-esbuild.log" 2>&1 &
watchers+=($!)
NODE_ENV=production bun build "${work_entries[@]}" --target=browser --format=esm \
  --root="$work/src" --outdir="$work/out/bun" --watch --no-clear-screen \
  >"$scratch/watch-bun.log" 2>&1 &
watchers+=($!)
for tool in tsc esbuild bun; do
  for ((i = 0; i < 600; i++)); do
    [[ -f "$work/out/$tool/ts/pagination-lit.js" ]] && break
    sleep 0.1
  done
  [[ -f "$work/out/$tool/ts/pagination-lit.js" ]] ||
    fail "the $tool watcher built nothing; its log: $(cat "$scratch/watch-$tool.log")"
done
sleep 1
for tool in tsc esbuild bun; do echo 0 >"$scratch/count-$tool"; done

rebuild() {
  echo "$root/scripts/measure.sh rebuild $work/src/ts/pagination-lit.ts $work/out/$1/ts/pagination-lit.js $scratch/count-$1"
}
timing "Watch rebuild" \
  "From a change to src/ts/pagination-lit.ts in a scratch copy to the watcher's rebuilt output holding the change, polled every 5 ms; each sample includes a bash startup." \
  --runs 10 --warmup 2 \
  -n "Node: tsc --watch" "$(rebuild tsc)" \
  -n "Node: esbuild --watch" "$(rebuild esbuild)" \
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
  for manager in pnpm bun; do
    project="$scratch/github-$name-$manager"
    mkdir -p "$project"
    printf '{ "name": "github-%s", "private": true, "dependencies": { "%s": "github:%s#%s" } }\n' \
      "$manager" "$name" "$slug" "$tag" >"$project/package.json"
    status=0
    if [[ "$manager" == pnpm ]]; then
      XDG_CACHE_HOME=$project-xdg/cache XDG_STATE_HOME=$project-xdg/state \
        pnpm --dir "$project" install --store-dir "$project-store" --reporter append-only \
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
  for manager in pnpm bun; do
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
