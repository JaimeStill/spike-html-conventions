#!/usr/bin/env bash
# Renders every build of the frozen pagination element, and the components layer's composition
# in each of its versions, in the system Chromium, outside the check.
#
# For each build output it writes a page to dist/demo/, loads it with
# `chromium --headless --dump-dom file://...`, and prints the page's one-line report: whether
# the element is defined, its rendered shadow text, and the pages its input clamps 99 and -4
# to (with page 3 of 7, those are 7 and 1). The full dumped DOM, with the shadow root's HTML,
# is kept next to each page as <name>.dom.html. Exits nonzero if any page fails or reports
# other values than those.
#
# Two ways to load a module from file:// are used:
#   esbuild, bun   the bundle is inlined into the page, which needs no flag;
#   tsc, src       the module stays a file, with `lit` mapped by an import map onto
#                  node_modules. Chromium treats file:// as an opaque origin and blocks the
#                  module request, so these pages need --allow-file-access-from-files.
# `src` loads the JSDoc and plain .js forms as written, with no build at all.
#
# The composition, pagination holding entries from demo/documents.ts, runs demo/probe.ts in one
# page per version; it passes only when every version's probe holds and all their reports match.
# Then demo/restyle.ts runs in one page per version: one edit to the source of the version's
# button styles must repaint both elements' buttons. Every composition page links spike-html-design
# v0.7.0's baseline, which the light-DOM versions take their control styles from, from the tag's
# own files: extracted into dist/demo/ from its checkout, $SPIKE_HTML_DESIGN or by default the
# sibling ../spike-html-design, as scripts/consumers.sh reads it, so the demo reads no network.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/dist/demo"

if [[ ! -d "$root/node_modules/lit" ]]; then
  echo "demo: lit isn't installed; run mise run install first" >&2
  exit 1
fi

rm -rf "$out"
mkdir -p "$out"
profile=$(mktemp -d)
trap 'rm -rf "$profile"' EXIT

# Lit's packages sit beside lit itself: under pnpm in lit's .pnpm directory, under a hoisted
# layout in node_modules. The import map points each bare specifier there.
deps=$(dirname "$(realpath "$root/node_modules/lit")")
importmap=$(
  cat <<EOF
<script type="importmap">
{
  "imports": {
    "lit": "file://$deps/lit/index.js",
    "lit/": "file://$deps/lit/",
    "lit-html": "file://$deps/lit-html/lit-html.js",
    "lit-html/": "file://$deps/lit-html/",
    "lit-element/": "file://$deps/lit-element/",
    "@lit/reactive-element": "file://$deps/@lit/reactive-element/reactive-element.js",
    "@lit/reactive-element/": "file://$deps/@lit/reactive-element/"
  }
}
</script>
EOF
)

# The report runs after the element's module, as module scripts run in document order. It
# types two out-of-range pages into the shadow input and records the clamped page-change.
probe() {
  cat <<EOF
<script type="module">
  const tag = "$1";
  const report = document.getElementById("report");
  const el = document.querySelector(tag);
  if (!customElements.get(tag) || !el.shadowRoot) {
    report.textContent = "FAIL: " + tag + " not defined";
  } else {
    await el.updateComplete;
    const shadow = el.shadowRoot;
    document.getElementById("shadow").textContent = shadow.innerHTML
      .replace(/<!--[^>]*-->/g, "")
      .replace(/\\s+/g, " ");
    const input = shadow.querySelector("input");
    const shown = input.value;
    const pages = [];
    el.addEventListener("page-change", (e) => pages.push(e.detail.page));
    for (const value of ["99", "-4"]) {
      input.value = value;
      input.dispatchEvent(new Event("change"));
    }
    const sizes = [...shadow.querySelectorAll("option")].map((o) => o.textContent.trim());
    const total = [...shadow.querySelectorAll("span")].at(-1).textContent.trim();
    // Page 3 of 7 with the default sizes, and the two typed pages clamped to 7 and 1.
    const ok = sizes.join("/") === "12/24/48/96" && shown === "3" && total === "/ 7" &&
      pages.join() === "7,1";
    report.textContent =
      (ok ? "ok" : "FAIL") + ": defined; renders sizes " + sizes.join("/") + ", page " + shown +
      " \"" + total + "\"; clamps 99 to " + pages[0] + ", -4 to " + pages[1];
  }
</script>
EOF
}

# page NAME TAG SCRIPT_HTML [HEAD_HTML [CHROMIUM_FLAG]]: writes the page, loads it, and prints
# its report.
failed=0
page() {
  local name=$1 tag=$2 script=$3 head=${4:-} flag=${5:-}
  local html="$out/$name.html"
  {
    echo "<!doctype html>"
    echo "<html><head><meta charset=\"utf-8\"><title>$name</title>"
    echo "$head"
    echo "</head><body>"
    echo "<$tag page=\"3\" total-pages=\"7\"></$tag>"
    echo "<pre id=\"report\">FAIL: the report didn't run</pre>"
    echo "<pre id=\"shadow\"></pre>"
    echo "$script"
    probe "$tag"
    echo "</body></html>"
  } >"$html"

  # shellcheck disable=SC2086 # $flag is empty or one flag, and must vanish when empty.
  chromium --headless --user-data-dir="$profile" $flag \
    --dump-dom "file://$html" 2>/dev/null >"$out/$name.dom.html"
  local report
  report=$(sed -n 's|.*<pre id="report">\(.*\)</pre>.*|\1|p' "$out/$name.dom.html" | sed 's/&quot;/"/g')
  printf '%-28s %s\n' "$name" "${report:-FAIL: no report in the dumped DOM}"
  [[ "$report" == ok:* ]] || failed=1
}

# Bundles: inline, with no flag.
for tool in esbuild bun; do
  for form in ts jsdoc js; do
    for base in lit vanilla; do
      bundle="$root/dist/$tool/$form/pagination-$base.js"
      if [[ ! -f "$bundle" ]]; then
        printf '%-28s %s\n' "$tool-$form-$base" "FAIL: no bundle; run mise run build"
        failed=1
        continue
      fi
      page "$tool-$form-$base" "hd-pagination-$base-$form" \
        "<script type=\"module\">$(cat "$bundle")</script>"
    done
  done
done

# Unbundled modules: tsc's emit of the typed forms, and the JS forms as written.
for form in ts jsdoc; do
  for base in lit vanilla; do
    page "tsc-$form-$base" "hd-pagination-$base-$form" \
      "<script type=\"module\" src=\"file://$root/dist/tsc/$form/pagination-$base.js\"></script>" \
      "$importmap" --allow-file-access-from-files
  done
done
for form in jsdoc js; do
  for base in lit vanilla; do
    page "src-$form-$base" "hd-pagination-$base-$form" \
      "<script type=\"module\" src=\"file://$root/src/$form/pagination-$base.js\"></script>" \
      "$importmap" --allow-file-access-from-files
  done
done

# The composition: pagination holding one entry per fixture item (demo/documents.ts), in each
# version of the components. esbuild bundles the probe with every version, each version's
# modules run only when its page loads it, and the bundle is inlined into each page, which runs
# the probe for one version. Each page writes a verdict and one line per case; every verdict must
# be ok, and every version's report the same text as the first's. TZ and --lang fix the
# formatted times and sizes, so a report reads the same on any machine.
versions=(lit-shadow vanilla-shadow lit-light vanilla-light)
design=${SPIKE_HTML_DESIGN:-$root/../spike-html-design}
design_tag=v0.7.0
if ! git -C "$design" rev-parse --verify --quiet "$design_tag^{commit}" >/dev/null; then
  echo "demo: no $design_tag in $design; set SPIKE_HTML_DESIGN to a spike-html-design checkout" >&2
  exit 1
fi
mkdir -p "$out/spike-html-design"
git -C "$design" archive "$design_tag" baseline.css layers | tar -x -C "$out/spike-html-design"
baseline='<link rel="stylesheet" href="spike-html-design/baseline.css">'
esbuild "$root/demo/probe.ts" --bundle --format=iife --global-name=composition \
  --log-level=warning --outfile="$out/composition.js"
# Each verdict and report is read back from the dumped DOM, its entities unescaped.
unescape='s/&quot;/"/g; s/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g'
first=""
for version in "${versions[@]}"; do
  name="composition-$version"
  {
    echo "<!doctype html>"
    echo "<html><head><meta charset=\"utf-8\"><title>$name</title>$baseline</head><body>"
    echo "<main></main>"
    echo "<pre id=\"verdict\">FAIL: the probe didn't run</pre>"
    echo "<pre id=\"report\"></pre>"
    echo "<script>$(cat "$out/composition.js")</script>"
    echo "<script type=\"module\">await composition.run(\"$version\");</script>"
    echo "</body></html>"
  } >"$out/$name.html"
  TZ=UTC chromium --headless --user-data-dir="$profile" --lang=en-US \
    --dump-dom "file://$out/$name.html" 2>/dev/null >"$out/$name.dom.html"
  verdict=$(sed -n 's|.*<pre id="verdict">\(.*\)</pre>.*|\1|p' "$out/$name.dom.html" | sed "$unescape")
  awk '/<pre id="report">/ { on = 1; sub(/.*<pre id="report">/, "") }
    on && /<\/pre>/ { sub(/<\/pre>.*/, ""); print; exit }
    on { print }' "$out/$name.dom.html" | sed "$unescape" >"$out/$name.report.txt"
  printf '%-28s %s\n' "$name" "${verdict:-FAIL: no verdict in the dumped DOM}"
  [[ "$verdict" == ok:* ]] || failed=1
  if [[ -z "$first" ]]; then
    first=$name
  elif ! diff -u "$out/$first.report.txt" "$out/$name.report.txt" >&2; then
    printf '%-28s %s\n' "$name" "FAIL: its report differs from $first's"
    failed=1
  fi
done

# The button styles' single source, in each version: each page writes one verdict.
esbuild "$root/demo/restyle.ts" --bundle --format=iife --global-name=restyle \
  --log-level=warning --outfile="$out/restyle.js"
for version in "${versions[@]}"; do
  name="restyle-$version"
  {
    echo "<!doctype html>"
    echo "<html><head><meta charset=\"utf-8\"><title>$name</title>$baseline</head><body>"
    echo "<main></main>"
    echo "<pre id=\"verdict\">FAIL: the check didn't run</pre>"
    echo "<script>$(cat "$out/restyle.js")</script>"
    echo "<script type=\"module\">await restyle.run(\"$version\");</script>"
    echo "</body></html>"
  } >"$out/$name.html"
  chromium --headless --user-data-dir="$profile" \
    --dump-dom "file://$out/$name.html" 2>/dev/null >"$out/$name.dom.html"
  verdict=$(sed -n 's|.*<pre id="verdict">\(.*\)</pre>.*|\1|p' "$out/$name.dom.html" | sed "$unescape")
  printf '%-28s %s\n' "$name" "${verdict:-FAIL: no verdict in the dumped DOM}"
  [[ "$verdict" == ok:* ]] || failed=1
done

echo
echo "The composition's report ($first):"
cat "$out/$first.report.txt"

exit "$failed"
