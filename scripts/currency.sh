#!/usr/bin/env bash
# The currency command, outside the check: reports every pin that trails its latest release, one
# line each, and exits nonzero when it reports any; with everything current it prints nothing and
# exits 0. It reads the network and writes nothing. Run it through `mise run currency`.
#
# Three kinds of pin, each line naming the file that holds it, as `FILE: NAME PIN -> LATEST`:
#
#   mise tools        mise.toml's [tools], against `mise outdated --bump --local`.
#   registry deps     a package.json dependency pinned to a version (lit in the root package),
#                     against the registry's latest dist-tag through `pnpm view`.
#   github: tag deps  a dependency written github:<owner>/<repo>#vX.Y.Z (the consumer fixtures'
#                     spike-html-design and spike-html-conventions), against the highest vX.Y.Z
#                     tag in `git ls-remote --tags`. Neither `pnpm outdated` nor `bun outdated`
#                     reports these, so the comparison is here.
#
# A pin trails only when its latest is strictly higher. A repository with no vX.Y.Z tag, or whose
# highest tag is below the pin, has an unreleased pin rather than a trailing one: this repository's
# own v0.1.0 is cut at release, after the fixtures already depend on it, so it isn't reported.
# Only plain vX.Y.Z tags count; ^{} peel lines and any other tag names are ignored. A dependency
# in a form this script can't compare is reported as such, so no pin is silently skipped.
#
# Each scan captures its command's output in a variable before reading it, so under set -e a
# lookup that fails fails currency instead of reporting nothing.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

stale=0
report() {
  echo "$1"
  stale=1
}

# behind A B: whether version A sorts strictly below version B, by version sort.
behind() {
  [[ "$1" != "$2" && "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n 1)" == "$1" ]]
}

# mise tools pinned below their latest version. JSON is read with node, a mise pin, not jq.
# Errors only: mise warns on every run that npm's GitHub release has no assets as it falls back to
# another source for npm's latest, which would break the silence of a current tree.
outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json)
lines=$(node -e '
  const out = JSON.parse(process.argv[1]);
  for (const [tool, v] of Object.entries(out)) console.log(tool + " " + v.requested + " -> " + v.bump);
' "$outdated")
while read -r line; do
  [[ -n "$line" ]] && report "mise.toml: $line"
done <<<"$lines"

# latest_tag OWNER/REPO: sets latest to the repository's highest vX.Y.Z tag, or to nothing if it
# has none. Each repository is listed once, however many fixtures depend on it; latest_tag sets a
# variable rather than echoing, because a $(...) subshell would drop the cache.
declare -A latest_tags=()
latest_tag() {
  local repo=$1 refs
  if [[ -z "${latest_tags[$repo]+set}" ]]; then
    refs=$(git ls-remote --tags --refs "https://github.com/$repo.git")
    latest_tags[$repo]=$(sed -nE 's#^[0-9a-f]+\trefs/tags/(v[0-9]+\.[0-9]+\.[0-9]+)$#\1#p' <<<"$refs" \
      | sort -V | tail -n 1)
  fi
  latest=${latest_tags[$repo]}
}

# Every dependency of the root package and the consumer fixtures, one `NAME<tab>SPEC` per line.
for manifest in package.json fixtures/*/package.json; do
  deps=$(node -e '
    const { dependencies = {} } = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
    for (const [name, spec] of Object.entries(dependencies)) console.log(name + "\t" + spec);
  ' "$manifest")
  while IFS=$'\t' read -r name spec; do
    [[ -n "$name" ]] || continue
    if [[ "$spec" =~ ^github:([^#]+)#(v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
      repo=${BASH_REMATCH[1]} pin=${BASH_REMATCH[2]}
      latest_tag "$repo"
      if [[ -n "$latest" ]] && behind "$pin" "$latest"; then
        report "$manifest: $name $pin -> $latest"
      fi
    elif [[ "$spec" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      latest=$(pnpm view "$name" version)
      if behind "$spec" "$latest"; then
        report "$manifest: $name $spec -> $latest"
      fi
    else
      report "$manifest: $name $spec -> can't compare this form of pin"
    fi
  done <<<"$deps"
done

exit "$stale"
