#!/usr/bin/env bash
# Builds the pagination element with one tool into dist/<tool>/, outside the check.
#
#   scripts/build.sh tsc       unbundled ESM by tsc emit, with declarations, from the .ts and
#                              JSDoc forms (tsconfig.build.json); `lit` stays a bare import.
#   scripts/build.sh esbuild   one ESM bundle, Lit included, per element in each form
#   scripts/build.sh bun       the same bundles by `bun build`
#
# Each bundle is dist/<tool>/<form>/pagination-<base>.js, for form ts, jsdoc, or js and base
# lit or vanilla. Lit must be installed first (mise run install).
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
tool=${1:?usage: build.sh tsc|esbuild|bun}
out="$root/dist/$tool"

if [[ ! -d "$root/node_modules/lit" ]]; then
  echo "build: lit isn't installed; run mise run install first" >&2
  exit 1
fi

rm -rf "$out"

if [[ "$tool" == tsc ]]; then
  tsc -p "$root/tsconfig.build.json"
  exit 0
fi

declare -A ext=([ts]=ts [jsdoc]=js [js]=js)
for form in ts jsdoc js; do
  for base in lit vanilla; do
    entry="$root/src/$form/pagination-$base.${ext[$form]}"
    outfile="$out/$form/pagination-$base.js"
    case "$tool" in
      esbuild) esbuild "$entry" --bundle --format=esm --log-level=warning --outfile="$outfile" ;;
      # bun build resolves Lit's `development` export condition unless NODE_ENV is production;
      # `--production` would also minify, so only the variable is set, matching esbuild.
      bun) NODE_ENV=production bun build "$entry" --target=browser --format=esm \
        --outfile="$outfile" >/dev/null ;;
      *)
        echo "build: unknown tool $tool; expected tsc, esbuild, or bun" >&2
        exit 1
        ;;
    esac
  done
done
