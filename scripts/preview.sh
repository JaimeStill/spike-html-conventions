#!/usr/bin/env bash
# Serves the components layer's four versions side by side, each wired to the fixture as a host
# application would wire it (demo/preview.ts), under Vite's dev server with scripts/css-sheets.js,
# for a person to see and use in a browser, outside the check. Prints the URL and runs until
# Ctrl-C. Reads no network and writes nothing to the working tree.
#
# Everything the run writes is one scratch directory, removed on exit: the page, Vite's config and
# its cache (cacheDir, node_modules/.vite by default), and spike-html-design v0.7.0's baseline,
# extracted from its tag as scripts/demo.sh extracts it, from $SPIKE_HTML_DESIGN or by default the
# sibling ../spike-html-design. The scratch directory is Vite's root; the page loads
# demo/preview.ts from the working tree itself through Vite's /@fs/ prefix, which server.fs.allow
# opens to the repository, so an edit to a component or its stylesheet reaches the open page.
#
# The page links the baseline in every column, the light versions' control styles and the tokens
# every version reads, so the columns compare on one page. It sets no TZ or language: the entries
# format times and sizes in the browser's own.
#
# PORT picks the port (default: a free one); the server listens on 127.0.0.1 alone.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)

if [[ ! -d "$root/node_modules/lit" ]]; then
  echo "preview: lit isn't installed; run mise run install first" >&2
  exit 1
fi
design=${SPIKE_HTML_DESIGN:-$root/../spike-html-design}
design_tag=v0.7.0
if ! git -C "$design" rev-parse --verify --quiet "$design_tag^{commit}" >/dev/null; then
  echo "preview: no $design_tag in $design; set SPIKE_HTML_DESIGN to a spike-html-design checkout" >&2
  exit 1
fi

scratch=$(mktemp -d "${TMPDIR:-/tmp}/spike-html-conventions-preview.XXXXXX")
server=""
# The cleanup ignores further signals: mise run answers a Ctrl-C with a TERM of its own, which
# would otherwise cut the cleanup short and leave the scratch directory behind.
cleanup() {
  trap '' INT TERM
  if [[ -n "$server" ]]; then
    kill "$server" 2>/dev/null || true
    wait "$server" 2>/dev/null || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT
# Ctrl-C is how the preview ends, so it ends the run cleanly, as a TERM does.
trap 'exit 0' INT TERM

mkdir -p "$scratch/spike-html-design"
git -C "$design" archive "$design_tag" baseline.css layers | tar -x -C "$scratch/spike-html-design"

port=${PORT:-$(node -e '
  const server = require("node:net").createServer();
  server.listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); });')}
origin="http://127.0.0.1:$port"

# The page: the grid of columns, one per version, that demo/preview.ts fills; its layout reads the
# baseline's tokens, in a layer after the baseline's.
cat >"$scratch/index.html" <<EOF
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Components preview</title>
<link rel="stylesheet" href="/spike-html-design/baseline.css">
<style>
  @layer preview {
    body { margin: 0; padding: var(--space-m); }
    main {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
      gap: var(--space-l);
    }
    section > h2 { margin-block: 0 var(--space-xs); font-size: var(--text-l); }
    section > p { display: flex; gap: var(--space-s); font-size: var(--text-s); }
    section > [role="status"] { color: var(--fg-2); overflow-wrap: anywhere; }
  }
</style>
</head><body>
<h1>Components preview</h1>
<main></main>
<script type="module" src="/@fs$root/demo/preview.ts"></script>
</body></html>
EOF

cat >"$scratch/vite.config.mjs" <<EOF
import { cssSheets } from "$root/scripts/css-sheets.js";
export default {
  root: "$scratch",
  cacheDir: "$scratch/vite-cache",
  plugins: [cssSheets()],
  publicDir: false,
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: $port,
    strictPort: true,
    fs: { allow: ["$scratch", "$root"] },
  },
};
EOF

# Loaded natively, so Vite writes no bundled config beside it.
vite --configLoader native --config "$scratch/vite.config.mjs" &
server=$!
for ((i = 0; i < 300; i++)); do
  curl -fs -o /dev/null "$origin/" && break
  kill -0 "$server" 2>/dev/null || exit 1
  sleep 0.1
done
curl -fs -o /dev/null "$origin/" || {
  echo "preview: Vite's dev server didn't answer at $origin" >&2
  exit 1
}
echo "preview: $origin/ (Ctrl-C to stop)"
wait "$server"
