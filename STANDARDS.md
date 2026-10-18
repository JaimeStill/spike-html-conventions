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
- Every tool comes from a pin in `mise.toml`, except the check's lint tooling and playwright-core,
  pinned exactly in `package.json`'s devDependencies and run from `node_modules`. The browsers are
  the other exceptions, by the architect's decision: the system Chromium, whose version
  `mise run measure` records, and Playwright's Firefox, fixed by playwright-core's pin and
  downloaded by `mise run install` into `~/.cache/spike-html-conventions/playwright`, never the
  shared `~/.cache/ms-playwright`.
- Lit is the only runtime dependency; the lint tooling and playwright-core are the only
  devDependencies.
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
- The foundation's CSS is the design-system port (`layers/foundation/baseline/`, from
  spike-html-design v0.7.0), which this repository owns: each file wraps its rules in its own
  `@layer foundation.<layer>` block and imports nothing, so it loads as a CSS module script.
  `@import` is written only in the page entry, `layers/foundation/baseline.css`, which only a page
  links.
- Components are the element tier: an element takes properties in and sends events out, and
  holds no services, data, or app state.
- The SDK holds what application-branch apps share: the router, the API client, the auth hook,
  formatting, and the domain-service pattern.
- Apps split into two branches: the static branch holds pages of content, and the application
  branch holds interactive clients built on the SDK.
- An app-internal element is promoted to `components/` once a second app needs it.
- Whether the static branch uses Lit is undecided, not a rule; the branches task decides it.

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
- Anything that touches the DOM is the browser tier (Results 5): it serves the components through
  Vite's dev server with the local CSS plugin (`scripts/css-sheets.js`), never from `file://`,
  and runs Playwright, playwright-core called from node:test, on the system Chromium and on
  Playwright's Firefox. WebKit is out of the check, so a Safari-only failure is a gap the check
  doesn't cover.

## Evidence

- A check, demo, or measure row passes only when the value it reports is the expected one, not
  when the step merely runs.
- Each figure in the evidence cites the dated `mise run measure` run it comes from.
