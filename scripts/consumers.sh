#!/usr/bin/env bash
# Installs each consumer fixture offline and checks what it installed, or warms the caches those
# installs read.
#
#   scripts/consumers.sh         the check's step: installs fixtures/consumer-pnpm with pnpm and
#                                fixtures/consumer-bun with bun, offline, and checks each
#   scripts/consumers.sh warm    mise run install's step: installs lit with pnpm and with bun,
#                                from the network, into their global store and cache
#
# Each fixture depends on spike-html-design and on this package by git tag, as a consumer writes
# it: github:<owner>/<repo>#<tag>. A github: source is fetched from GitHub, so the check copies
# the fixture into a scratch directory and rewrites each source to a local repository, the tag
# kept, git+file://<repository>#<tag>:
#
#   spike-html-design        its checkout, $SPIKE_HTML_DESIGN or by default the sibling
#                            ../spike-html-design, at its own v0.7.0 tag
#   spike-html-conventions   a scratch repository holding this working tree's files, tracked and
#                            untracked but not ignored, in one commit tagged v0.1.0, so the check
#                            installs what the next commit would release. This repository is
#                            never tagged here; v0.1.0 is cut at release.
#
# Lit, the package's one dependency, comes from each manager's warm cache: pnpm installs with
# --offline from its store and metadata cache; bun installs with --prefer-offline, reading the
# global cache through a scratch cache of symlinks to it, so the git sources bun clones land in
# scratch rather than in the global cache. Both run behind proxies pointed at a closed port, so a
# cold cache fails the check with a message instead of reaching the network. pnpm adds the
# package's files to its content-addressed store, outside the working tree.
#
# After each install the check asserts that every installed file of both packages equals its tag's
# file byte for byte; that this package installs exactly package.json and src/ under pnpm, which
# packs a git dependency by its `files`, and its whole tag tree under bun, which doesn't; that
# every exports target is installed; that tsc type-checks the fixture's elements.ts against the
# installed elements; and that the column's runtime imports the route matcher by its exports.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
mode=${1:-check}
design=${SPIKE_HTML_DESIGN:-$root/../spike-html-design}
# The tags the fixtures pin; the check fails if a fixture's manifest names another.
design_tag=v0.7.0
own_tag=v0.1.0
closed=http://127.0.0.1:9

scratch=$(mktemp -d "${TMPDIR:-/tmp}/spike-html-conventions-consumers.XXXXXX")
trap 'rm -rf "$scratch"' EXIT

fail() {
  echo "consumers: $*" >&2
  exit 1
}

# pnpm's store, given by its parent, as --store-dir takes it. The scratch directory may sit on
# another filesystem than the store, where pnpm can't hard link and would silently fall back to a
# cold store beside the scratch directory, so every install names the store and copies from it.
store=$(dirname "$(pnpm store path)")
pnpm_flags=(--store-dir "$store" --package-import-method copy --reporter append-only)

if [[ "$mode" == warm ]]; then
  lit=$(node -p 'require(process.argv[1]).dependencies.lit' "$root/package.json")
  for manager in pnpm bun; do
    mkdir -p "$scratch/$manager"
    printf '{ "name": "warm", "private": true, "dependencies": { "lit": "%s" } }\n' "$lit" \
      >"$scratch/$manager/package.json"
  done
  pnpm --dir "$scratch/pnpm" install "${pnpm_flags[@]}"
  bun install --cwd "$scratch/bun"
  echo "consumers: pnpm's store and bun's cache hold lit $lit"
  exit 0
fi
[[ "$mode" == check ]] || fail "unknown mode $mode; expected check or warm"

git -C "$design" rev-parse --verify --quiet "$design_tag^{commit}" >/dev/null ||
  fail "no $design_tag in $design; set SPIKE_HTML_DESIGN to a spike-html-design checkout"
design=$(cd "$design" && pwd)

# The scratch repository: the working tree's files, committed and tagged with a fixed identity
# and date, and no user or system git config, so no hook or signing runs and the same tree gives
# the same commit.
own="$scratch/spike-html-conventions"
mkdir -p "$own"
(
  cd "$root"
  git ls-files -z --cached --others --exclude-standard |
    while IFS= read -r -d '' path; do
      # A tracked file deleted from the working tree is left out, as the next commit leaves it.
      if [[ -e "$path" ]]; then cp --parents -p "$path" "$own/"; fi
    done
)
(
  cd "$own"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
  export GIT_AUTHOR_NAME=check GIT_AUTHOR_EMAIL=check@localhost GIT_COMMITTER_NAME=check
  export GIT_COMMITTER_EMAIL=check@localhost
  export GIT_AUTHOR_DATE=2000-01-01T00:00:00Z GIT_COMMITTER_DATE=2000-01-01T00:00:00Z
  git init -q -b main
  git add -A
  git commit -q -m "$own_tag"
  git tag -a "$own_tag" -m "$own_tag"
)

# Each tag's tree, extracted, for the byte-for-byte comparison.
for pair in "spike-html-design:$design:$design_tag" "spike-html-conventions:$own:$own_tag"; do
  IFS=: read -r name repo tag <<<"$pair"
  mkdir -p "$scratch/tags/$name"
  git -C "$repo" archive "$tag" | tar -x -C "$scratch/tags/$name"
done

# files lists a directory's files, relative and sorted, leaving out bun's .bun-tag marker.
files() {
  (cd "$1" && find . -type f ! -name .bun-tag | sed 's|^\./||' | LC_ALL=C sort)
}

# same fails unless every file installed in dir equals the file at the same path in the tag's
# tree, byte for byte.
same() {
  local dir=$1 tree=$2 path
  while IFS= read -r path; do
    [[ -f "$tree/$path" ]] || fail "$dir/$path isn't in the tag"
    cmp -s "$tree/$path" "$dir/$path" || fail "$dir/$path differs from the tag's"
  done < <(files "$dir")
}

# Bun's scratch cache: a symlink to each entry of the global cache.
bun_cache="$scratch/bun-cache"
mkdir -p "$bun_cache"
global_cache=$(bun pm cache)
if [[ -d "$global_cache" ]]; then
  # Its .tmp is left out, so bun stages its extractions in scratch too.
  find "$global_cache" -mindepth 1 -maxdepth 1 ! -name .tmp -exec ln -s -t "$bun_cache" {} +
fi

for manager in pnpm bun; do
  project="$scratch/consumer-$manager"
  cp -r "$root/fixtures/consumer-$manager" "$project"
  if [[ "$manager" == pnpm ]]; then runtime=node; else runtime=bun; fi

  # The rewrite: each github: source to its local repository, the tag kept.
  "$runtime" "$root/scripts/consumers.js" rewrite "$project/package.json" \
    "spike-html-design|github:JaimeStill/spike-html-design#$design_tag|git+file://$design#$design_tag" \
    "spike-html-conventions|github:JaimeStill/spike-html-conventions#$own_tag|git+file://$own#$own_tag"

  log="$scratch/$manager.log"
  export HTTP_PROXY=$closed HTTPS_PROXY=$closed http_proxy=$closed https_proxy=$closed
  if [[ "$manager" == pnpm ]]; then
    status=0
    pnpm --dir "$project" install --offline "${pnpm_flags[@]}" >"$log" 2>&1 || status=$?
    if ((status != 0)) && grep -q ERR_PNPM_NO_OFFLINE "$log"; then
      cat "$log" >&2
      fail "pnpm's store or metadata cache lacks lit; run mise run install to warm it"
    fi
  else
    status=0
    # The variable as well as the flag: bun clones git sources into the variable's cache.
    BUN_INSTALL_CACHE_DIR=$bun_cache bun install --cwd "$project" --prefer-offline \
      --cache-dir "$bun_cache" >"$log" 2>&1 || status=$?
    if ((status != 0)) && grep -q -E 'downloading (package manifest|tarball)' "$log"; then
      cat "$log" >&2
      fail "bun's cache lacks lit; run mise run install to warm it"
    fi
  fi
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
  if ((status != 0)); then
    cat "$log" >&2
    fail "$manager install of consumer-$manager failed"
  fi

  # Both packages: every installed file is the tag's, and every exports target is installed.
  for name in spike-html-design spike-html-conventions; do
    installed="$project/node_modules/$name"
    [[ -d "$installed" ]] || fail "$manager didn't install $name"
    same "$installed" "$scratch/tags/$name"
    "$runtime" "$root/scripts/consumers.js" exports "$installed"
  done

  # This package's installed set: package.json and src/ by `files` under pnpm, the whole tree
  # under bun.
  if [[ "$manager" == pnpm ]]; then
    expected=$(files "$scratch/tags/spike-html-conventions" | grep -E '^(package\.json|src/)')
  else
    expected=$(files "$scratch/tags/spike-html-conventions")
  fi
  diff <(echo "$expected") <(files "$project/node_modules/spike-html-conventions") >&2 ||
    fail "$manager installed other files of spike-html-conventions than expected (diff above)"

  tsc -p "$project"
  (cd "$project" && "$runtime" router.js)
  echo "consumers: consumer-$manager installed offline;" \
    "spike-html-conventions $(files "$project/node_modules/spike-html-conventions" | wc -l) files," \
    "spike-html-design $(files "$project/node_modules/spike-html-design" | wc -l) files," \
    "each the tag's byte for byte"
done
