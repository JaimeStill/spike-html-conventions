# Standards

The judgement calls the check can't enforce, one line each, for the standards-reviewer. What
`mise run check` enforces is never restated here. The tasks write the web conventions here; they
stay in this spike until experiment.html's intake.

The architecture pages that apply, in the architecture repository:

- `principles/minimal-footprint.md`
- `principles/rolling-currency.md`
- `principles/independent-releases.md`
- `principles/validation-first.md`

## Releases

- One repo-wide annotated `vX.Y.Z` tag, cut only on a green check. A published tag is never
  changed or re-cut.

## Tools and dependencies

- The toolchain is Node with one package manager, pnpm provisionally (the choice between npm and
  pnpm reopens if spike-html-packages releases the layers through a registry), and never Bun
  beside it. tsc emit builds libraries and Vite builds apps; esbuild builds nothing. The Bun
  column, the manager not picked, and the esbuild pin are the comparison's evidence only; nothing
  shipped depends on a Bun-only API.
- Every tool comes from a pin in `mise.toml`, except the check's lint tooling, pinned exactly in
  `package.json`'s devDependencies and run from `node_modules`.
- Every browser the check runs is a `mise.toml` pin: Chrome for Testing's chrome-headless-shell,
  through mise's `http:` backend, with a sha256 and size taken by hand at each bump, since Chrome
  for Testing publishes no checksums. Three browsers stay outside `mise.toml`, and the check runs
  none of them. The system Chromium, by the architect's decision, runs only the demo's frozen
  `--dump-dom` pages and measure's `file://` and components pages; `mise run measure` records its
  version. Playwright's own Chromium Headless Shell and Firefox run only in measure's comparison
  column, which downloads them into its scratch.
- Lit is the only runtime dependency; the lint tooling is the only devDependencies.
  playwright-core is measure's comparison column alone, installed into measure's scratch.
- Anything that reads the network runs in `measure`, `currency`, or `install`, never in the check.

## Code

- Every layer is written in `.ts` and released through a build that ships `.js` and `.d.ts`; a
  release never asks a consumer to load `.ts`. The JSDoc and plain JS forms in `src/` are the
  comparison's evidence only, never the convention for new code.
- This spike's own package exports `.ts` as the comparison's evidence and is exempt from that
  release rule; the release build belongs to spike-html-packages.
- Lit elements declare reactive properties with `static properties`, never decorators.
- In the JSDoc form, an object typedef with quoted keys stays on one line: over several lines,
  tsc 7.0.2's declaration emit copies each line's leading `*` into the `.d.ts`, which then fails
  to parse.

## Layers

- The stack's layers are the directories of `layers/`, beside the frozen per-form tree in `src/`;
  the layer table in `eslint.config.js` enforces the import direction between them.
- The foundation holds native platform code only, the code every other layer may build on.
  Formatting is the foundation's, so components and apps share one set: Intl formatters for
  bytes (SI, base 1000), dates, relative times, and durations, with no library and no Temporal,
  which isn't Baseline.
- The foundation's CSS is the design-system port (`layers/foundation/baseline/`, from
  spike-html-design v0.7.0), which this repository owns: each file wraps its rules in its own
  `@layer foundation.<layer>` block and imports nothing, so it loads as a CSS module script.
  `@import` is written only in the page entry, `layers/foundation/baseline.css`, which only a page
  links.
- Components are the element tier: an element takes properties in and sends events out, and
  holds no services, data, or app state.
- The SDK holds what application-branch apps share: the router, the API client, the auth hook,
  and the domain-service pattern (Results 8). It is specified here, not built: `layers/sdk/` and
  the foundation's formatters are type-only declarations, and spike-html-apps writes their
  implementations.
- The router rests on URLPattern and the Navigation API, never a hand-written matcher. The API
  client returns a `Result` whose failure is go-web-sdk's RFC 9457 problem, and it never throws.
  The auth hook is a token-provider interface, and the SDK chooses no OIDC library.
- Apps split into two branches: the static branch holds pages of content, and the application
  branch holds interactive clients built on the SDK.
- An app-internal element is promoted to `components/` once a second app needs it.
- A static app is an entry plus its own reusable elements. Those elements are Lit with a shadow
  root, under the component rules.
- Both branches build through Vite with the local CSS plugin, to hashed filenames and a build
  manifest. A page that loads components unbundled fails in Safari, so no page ships unbuilt.
- An application app holds its entry and route table at its root, plus four tiers:
  - views are route-level: they take route params and load data;
  - modules are features: they call domain services and the router's query;
  - app-internal elements are presentational, under the component rules;
  - domains hold the app's types and its stateless domain services, one per resource, each
    method mapping one route to a `Result`.
- The browser floor is Safari 26.2, Firefox 147, and current Chromium, the Navigation API's
  Baseline (Results 8).

## Components

- A component is Lit with a shadow root by default (the architect's judgement, Results 4): light
  DOM's hand-placed composition costs more than it gives. A vanilla or light-DOM component is an
  exception its file argues. The vanilla-shadow, lit-light, and vanilla-light versions of the
  pagination and the entry in `layers/components/` are this spike's comparison evidence only, not
  exceptions to argue.
- A component's CSS lives in its own `.css` file beside its module, imported as a CSS module
  script; CSS is never written in `.ts`, as a string, a `css` template, or a `replaceSync`
  argument. Styles several components share are one `.css` file each adopts by reference; in a
  shadow root, that file is the foundation's elements layer. The check enforces only that form: a
  static import's `with { type: "css" }`, and no `import()` of a `.css` file.
- A shadow-root component adopts the foundation's baseline sheets (`baseline` from
  `layers/foundation/baseline.ts`: reset, then elements), then a layout-only sheet of its own, and
  never styles a control's look itself: no background, border, color, padding, or font on a
  control. The page's baseline can't reach inside a shadow root; only its tokens cross.

## Tests

- The unit tier is DOM-free code under node --test, with no DOM shim: happy-dom and jsdom load
  no CSS module script and compute no layout or style, so a test that passes under one proves
  nothing about a component.
- Logic that needs no DOM moves into DOM-free modules, tested in the unit tier.
- Anything that touches the DOM is the browser tier (Results 5): it serves the components through
  Vite's dev server with the local CSS plugin (`scripts/css-sheets.js`), never from `file://`,
  and drives Chromium alone, the pinned chrome-headless-shell, over the raw DevTools pipe
  (`scripts/browser-pipe.js`, no package) from node:test.
- The browser tier holds only what a browser alone can prove, each component's contract, events,
  rendering, and styling, as a fixed set of cases run in every version. It adds no test runner
  beyond node:test, and no screenshot diffing or tracing, without a recorded need; Playwright stays in measure
  as the comparison column.
- Firefox and WebKit are gaps the check doesn't cover: a failure only Firefox or Safari shows goes
  unseen.
- The check launches Chromium with `--no-sandbox`, everywhere: Ubuntu 23.10 and later, CI's
  runners among them, let AppArmor refuse a downloaded Chrome's sandbox, and the browser loads
  only the repository's own pages from the loopback address, every other host refused.
- A CI job runs the same `mise install` (for example through jdx/mise-action) and the same
  `mise run check`, so the browser is the same pin there as here; never the runner's own
  browsers, which no pin fixes.

## Evidence

- A check, demo, or measure row passes only when the value it reports is the expected one, not
  when the step merely runs.
- Each figure in the evidence cites the dated `mise run measure` run it comes from.
