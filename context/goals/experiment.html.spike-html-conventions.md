# goal · experiment.html.spike-html-conventions

- **State:** brief ready
- **Task:** components
- **Branch:** components

## Tasks

1. [x] toolchain
2. [x] structure
3. [ ] components
4. [ ] testing
5. [ ] branches

## Task brief · components

```
Problem       The component convention (vanilla for the foundation and
              static pages, Lit from components up) has never been tested.
              The only vanilla/Lit pair is the frozen per-form pagination
              port, which lives outside the layers, uses no foundation, and
              diverges from Lit's contract in ways no one has listed.
              Herald's shadow roots made it re-import shared styles into
              every element, and no one has tried light DOM against
              spike-html-design's class-free baseline. Nor has anyone
              checked whether a build can remove Lit's runtime. Evidence 4.
              The architect judges readability, maintainability, and
              scalability by reading the final components, not by metrics,
              so the task builds them, measures what each serves in
              development and production, and records that judgement.
              currency at planning: pnpm 12.11.2 -> 12.14.0 (what mise now
              resolves natively).

Behaviors
  1. The pinned tools are current. pnpm is pinned at what mise resolves
     natively (12.14.0), and every other pin currency reports when BUILD
     starts is raised too (eslint 10.13.0 once it clears pnpm's
     release-age gate). `mise run install` succeeds from the frozen
     lockfile and `mise run check` passes. README Results 1 states the
     current pnpm pin; its measured figures keep the run they cite.
  2. Two element-tier components live in the components layer, each in
     four versions: Lit and vanilla, each with a shadow root and in light
     DOM. That is 8 versions, each with its own tag. Every version imports
     only the foundation and Lit (vanilla: the platform plus the
     foundation's define, emit, and required, with no base class), and
     the check's lint, layer rule, and type check pass. The frozen
     per-form tree, its exports, and its rows are unchanged.
  3. The pagination element is a container whose controls sit around
     the entries the host places inside it.
     Its properties come from go-web-sdk's Page envelope:
     - page, size, total, and more, plus the offered page sizes;
     - the page count is worked out from total and size;
     - when total is absent, Next is enabled by more;
     - when page is absent, the page input is disabled.
     It sends page-change {page} and page-size-change {size}; it never
     changes its own page.
     Its final form also has:
     - a boolean disabled property that reflects to the attribute and
       disables every control;
     - a "Showing X–Y of N" summary, rendered only when total is present
       and above zero;
     - author content that replaces the default "Page Size" label: a named
       slot under a shadow root, children placed by hand in light DOM.
  4. The entry element shows one directory or one file of a document
     hierarchy:
     - kind, name, and status;
     - for a file, its size and content type, with no size for a pending
       file whose size is null;
     - the updated time.
     Size and time are formatted with Intl. It types its properties with
     its own interface holding only those fields, so go-web-service's
     Directory and File objects fit it with no import. Opening it sends
     open {id, kind}.
  5. Each render root takes all its button styling from one source, so a
     single edit reaches both elements: a shared sheet adopted into both
     elements' shadow roots for the shadow versions, and
     spike-html-design v0.7.0's baseline for the light-DOM versions.
     Shadow versions keep herald's folded control styles. Light-DOM
     versions drop them and take the baseline's elements layer. Each
     light-DOM component adopts one constructed sheet into the document
     once, in a named cascade layer above the baseline. The sheet reads
     only tokens, with its rules nested under the element's tag.
  6. Every vanilla version matches its Lit counterpart's observable
     contract, built by hand:
     - removing a number attribute yields null;
     - invalid JSON in an array attribute yields null;
     - a property set before the element is defined is kept.
     Batched updates and binding-level template updates are forgone and
     listed as such.
  7. A static fixture, written by hand in go-web-service's wire shape at
     15e0bc3, feeds every page. It holds a directories page and a files
     page in the Page envelope ({items, page, size, total, more, next}),
     a pending file with a null size, and a page continued by cursor that
     has no page or total. Nothing fetches.
  8. `mise run demo` renders the composition (pagination with entries
     from the fixture) in each of the four versions in headless Chromium
     with --dump-dom and no driver. One shared probe passes only when all
     four report the same:
     - rendered text;
     - the same events for prev, next, the two clamps, a size change,
       and an entry's open;
     - the contract cases of behavior 6;
     - disabled reflected in both directions;
     - the summary present and absent;
     - the cursor page's disabled input;
     - the slotted label shown.
     The frozen pagination demo still passes.
  9. `mise run measure` records what each version serves, for a page
     with the pagination element alone and for the composition page:
     - development: Vite 8.3.4's dev server on a scratch copy, the total
       bytes of every response the page fetches, uncompressed, with Lit's
       development builds;
     - production: `vite build` of the same page, every emitted file raw
       and brotli q11 (node:zlib), with Lit's share split out.
     Each row passes only on its expected shape: a Lit page in
     development loads Lit's development build and a vanilla page loads
     no Lit; no production output holds a development build. Each
     version's source lines and source brotli are recorded as context.
     Measure writes nothing to the working tree.
 10. Review stop: once 1–9 hold, BUILD pauses. The architect reads the
     final files of all 8 versions, and the judgement on readability,
     maintainability, and scalability is logged as a goal-record
     Decision before any evidence is written.
 11. README Results 4 records:
     - the architect's judgement, in the architect's words;
     - the features table: reactive properties, batched updates,
       attribute conversion, reflection, templates with binding updates,
       event binding, shadow root and adopted styles, pre-upgrade
       properties, lifecycle, controllers, keyed lists, slots, form
       association, and SSR, each row marked as Lit provides, vanilla
       builds by hand, vanilla forgoes, or not exercised; form
       association and SSR are given as sourced facts;
     - the sourced facts:
       - no build removes Lit's runtime: @lit-labs/compiler prepares
         templates that lit-html still renders;
       - Svelte, Stencil, and solid-element each ship a runtime of their
         own instead;
       - what light DOM loses (static styles, slots, encapsulation) and
         how it lets the baseline reach the controls herald had to
         restyle;
     - the served-bytes figures, each citing its dated measure run, and
       the source sizes as context.
     There is no rubric score. The goal record gains the pending edit for
     html-artifacts.md's interim components result.

Test seams    `mise run check`: the layer rule, the type check, and the
              lint over the 8 versions (1, 2, 4, 5). `mise run demo`: the
              shared probe over the four versions of the composition
              (3–8). `mise run measure` (9). The review stop (10). The
              README's cited sources (11).

Slices
  1. Upgrade (only when currency reports a pin when BUILD starts; at
     planning: pnpm 12.14.0, and eslint 10.13.0 once past the gate).
     Demo: currency prints nothing; install and check pass; Results 1
     states the new pin.
  2. Fixture and the Lit shadow-root pair: pagination container and
     entry with every behavior 3–4 requirement, the shared button sheet,
     and the probe over this one version.
     Demo: the demo renders the composition from the fixture and the
     probe passes.
  3. Vanilla shadow-root pair, with the contract cases built by hand;
     the probe now compares two versions.
     Demo: both shadow versions pass the probe with identical reports.
  4. Light-DOM pair, Lit and vanilla: children placed by hand, one
     constructed sheet per component in its cascade layer, controls
     styled by the baseline; the probe compares all four.
     Demo: all four versions pass the probe; one button-style edit
     visibly reaches both elements in each render root.
  5. Served bytes: the development and production rows for both pages
     per version, and the source-size context rows.
     Demo: measure prints every row passing.
  -- Review stop: BUILD pauses for the architect to read the 8 final
     versions; the judgement is logged as a Decision. --
  6. Evidence: Results 4 from the logged judgement, one fresh measure
     run, and the sourced facts; the pending edit for html-artifacts.md.
     Demo: Results 4.

Out of scope  The frozen per-form tree and its rows. Per-scenario commits
              or diffs as evidence: the scenarios are requirements of the
              final form, judged by reading the files. A scored rubric.
              A compile-to-custom-element column (Svelte, Stencil, Solid):
              facts only. A breadcrumb or any element beyond the two.
              Fetching, the SDK, app modules, and cursor-following logic.
              The browser test tier in the check (testing). Whether static
              pages use Lit (branches). Component rules in STANDARDS.md
              beyond what the review's judgement settles. Release builds
              and packaging (spike-html-packages). @scope (recorded as
              the alternative to nesting). Re-running Results 1's figures.
Door          two-way: no tag, nothing published; the pin upgrade is
              reverted by restoring the pin and lockfile.
```

Amendment (escalation at the review stop): component styles live in native .css files.

Behaviors (new and revised)
 12. (new) Every component's own CSS lives in a .css file beside its
     module, imported as a CSS module script
     (`import sheet from "./x.css" with { type: "css" }`) and typed by one
     ambient declaration; no CSS is written in .ts. This covers all 8
     versions and status-badge. Lit shadow versions put the sheet in
     `static styles`; vanilla shadow versions adopt it into their root;
     light versions adopt it into the document once, their cascade layer
     written inside the .css. The shared button styles are one .css file
     adopted by reference into every shadow version, so one edit still
     reaches both elements.
 13. (new) A local Vite plugin of herald's shape, about 30 lines, no new
     package, turns each `type: "css"` import into a module that builds
     and default-exports a constructed sheet, in `vite` dev and
     `vite build`. Measure's pages use it. If the plugin can't see the
     attribute before Vite strips it, BUILD escalates.
 14. (new) `mise run build:tsc` copies each .css beside its emitted .js.
     `mise run demo` loads the components from tsc's emit natively in
     Chromium from file://, with no bundling of the components; the
     probe and restyle checks still pass across all four versions with
     identical reports.
 15. (new) The check refuses a .css import without
     `with { type: "css" }` (core ESLint no-restricted-syntax).
  9. (rev) The served-bytes and source-size rows re-run on the .css form.
 11. (rev) Results 4 also records: the architect's judgement (Lit with a
     shadow root as the default; styles in native .css files); CSS module
     scripts' support (Chrome/Edge 123+, Firefox 147+, no Safari release;
     WebKit landed it 2026-10-06) and the Safari gap for unbundled
     loading, which apps close by building through Vite; that Bun 1.4.3
     doesn't load the form either and herald's native CSS was a bundler
     plugin, so Results 1's pick stands.
 16. (new) STANDARDS.md records: components are Lit with a shadow root by
     default; a component's CSS lives in its own .css file, imported as a
     CSS module script, and CSS is never written in .ts.

Slices (inserted after the review stop, before the evidence slice)
  5b. Style files: the .css files, the ambient declaration, the Vite
      plugin, build:tsc's copy, the demo on tsc's emit, the lint rule.
      Demo: check, demo, and measure pass on the .css form.
  5c. Preview (architect, during BUILD): `mise run preview`, outside the
      check, starts Vite's dev server with the local CSS plugin on one
      page showing all four versions side by side, each wired to the
      fixture as a host would wire it (paging, page size, cursor page,
      opening an entry), the light versions with the baseline linked.
      Writes nothing to the working tree.
      Demo: the page serves and each version pages through the fixture.
  6.  (rev) Evidence: Results 4 and STANDARDS.md from one fresh measure
      run; pending edits for html-artifacts.md, spike-html-packages
      (ship each .css beside its .js), and the spike-html-design note.

Amendment 2 (redirect at BRIEF): the shadow versions take the baseline from a port of
spike-html-design v0.7.0 in the foundation.

Shadow roots can't see the page's baseline: its reset and elements layers use element
selectors, which stop at a shadow boundary; only custom and inherited properties cross. No
platform mechanism lets a shadow root inherit page styles (survey 2026-10-17:
csswg-drafts#10176, open-stylable/adoptStyles, unresolved; whatwg/html#11687, Declarative CSS
Modules, open and experimental in Chromium only; the MSEdgeExplainers ShadowDOM explainer). The
conventional answer for a layered design system: the shadow root adopts the lower layers by
reference as constructed sheets, then its own layout-only sheet. spike-html-design v0.7.0
doesn't fit: its one entry builds the layers with `@import ... layer()`, which constructed
sheets and CSS module scripts don't load, and it exports no layer file. The architect: port
it into this repo in the correct format rather than change it.

Behaviors (new and revised)
 17. (new) The foundation owns a port of spike-html-design v0.7.0's tokens (the color, space,
     and type facets with baseline.css's defaults: flexoki, regular, mono), reset, and
     elements layers: one plain .css file per upstream file, no @import, each wrapped in its
     own `@layer foundation.<layer>` block and headed by its provenance (tag v0.7.0, commit
     fe75220, upstream path). Each loads as a CSS module script and can be linked by a page.
     The port is this repo's own code from here on: Prettier formats it, and no test holds it
     to upstream. The tools layer and the other profiles aren't ported.
 18. (new) The foundation holds a page entry: the layer order statement, then plain @imports
     of the ported files. Every page links it (demo, preview, measure; shadow and light
     alike, since shadow roots read its tokens by inheritance). No page reads the baseline
     from the spike-html-design checkout any more.
 19. (new) The shadow versions, Lit and vanilla, take their control look only from the port:
     a foundation module exports the reset and elements sheets in that order, and each
     shadow version adopts them before its own sheet. Their buttons, select, and input are
     bare, as in the light versions; the shadow sheets keep layout only, mirroring the light
     sheets. buttons.css is deleted; no component sheet gives a control its look.
 20. (new) A long content type wraps inside its entry in all four versions; no entry
     overflows its box.
 21. (new) The probe gains two cases (27 in all), each reporting the same across the four
     versions: the painted look of the Next button, the page-size select, the page input,
     and the entry's button (background, color, border, padding, font family and size); and
     no overflow on the entry with the fixture's longest content type.
  5. (rev) Every render root takes its control styles from the ported elements layer, so one
     edit reaches both elements: in the shadow versions an edit to the adopted elements
     sheet; in the light versions a rule added to the page's `foundation.elements` layer.
     Light components still adopt one layout sheet into the document once, in a named layer
     above the baseline.
 12. (rev) Shared styles stay one .css file adopted by reference; in the shadow versions that
     file is the foundation's elements layer.
  9. (rev) Served bytes re-run with the port counted as the baseline share (development: the
     entry and the adopted sheet modules; production: the entry's CSS and its own chunk for
     the adopted sheets). The rows record that a shadow page loads reset and elements twice,
     linked and adopted.
 11. (rev) Results 4 also records: the shadow-root default adopts the baseline's reset and
     elements by reference through the foundation, component sheets layout only; the survey
     with its three sources; why @import is excluded; the port and its provenance. From one
     fresh measure run.
 16. (rev) STANDARDS.md also records, under Components: a shadow-root component adopts the
     foundation's baseline sheets, then a layout-only sheet of its own, and never styles a
     control's look itself; under Layers: the foundation holds the design-system port, as
     native CSS without @import except in the page entry.

Slices (after 5c, before the evidence slice)
  5d. Foundation port: the ported files, the page entry; every page links the entry.
      Demo: check passes; the preview's light columns look as before.
  5e. Shadow versions on the foundation: the baseline module, layout-only shadow sheets,
      buttons.css deleted, the overflow fix in all four versions, restyle rewritten, the
      probe's two cases.
      Demo: demo passes 27 cases and restyle across four versions; the preview's four
      columns look alike.
  6.  (rev) Evidence: Results 4 and STANDARDS.md from one fresh measure run; the pending edit
      for spike-html-design rewritten (ship each layer as a self-layered, @import-free,
      exported sheet; the port is the interim and the reference).

Out of scope  The tools layer, the non-default profiles, any change to spike-html-design;
              ::part hooks recorded, not built.
Door          two-way: no tag, nothing published.

## Progress

slices 11/11 committed · review stop done · escalation answered · redirect at BRIEF: amendment 2 approved · standards done · spec done · editor done

## Decisions

- setup: the evidence is the eight items in `context/README.md`, "The evidence".
- setup: Node 26 + pnpm against Bun 1.4.3, head to head as the first task; hypothesis Node +
  pnpm for packages, Bun only for bundling, the dev server, and CSS. Deno ruled out (patches
  only after its acquisition).
- setup: a three-way TS form comparison (`.ts` stripped, JSDoc + type check, plain JS); the
  spike reaches its own conclusion.
- setup: vanilla for the foundation and the static branch; Lit from components up. Components
  are the element tier only.
- setup: the application SDK is specced here and built in spike-html-apps.
- setup: web standards stay in this spike's STANDARDS.md and context/ until the intake.
- setup: kind code; `mise run check` = biome ci + shellcheck, extended by the toolchain task.
  No currency command until the toolchain is picked. No gate, no `[remote] ci`.
- setup: releases are one repo-wide annotated `vX.Y.Z` tag on a green check; per-package tags
  and release builds belong to spike-html-packages.
- setup: references are keys in the coordinator's catalog: spike-html-design (v0.7.0) and
  herald, read-only. The spike keeps no references files.
- toolchain: measured by a scripted, read-only measure task (hyperfine 2.0.0 via aqua) that prints a dated table; it stays out of the check.
- toolchain (superseded by the redirect): the pick argues footprint first, then whether each added tool is the standard for its purpose and worth keeping long term; speed decides only on an order-of-magnitude gap.
- toolchain: the pick is Node with pnpm or Bun, never both; the hypothesis's split by role is ruled out.
- toolchain: the Node column measures both tsc emit and esbuild 0.28.2, and the task concludes whether esbuild earns its place, weighing its per-platform binaries and offline installs.
- toolchain: the TypeScript-form element is herald's pagination element, in Lit with static properties (no decorators) and in vanilla, each in all three forms.
- toolchain: the TypeScript-form module is herald's route matcher.
- toolchain: the released fixture package is the repository root, tagged v0.1.0. A subdirectory with a prefixed tag was rejected because bun can't install a subdirectory; the architect accepted this as a limitation of repository-based releases.
- toolchain: the fixture package carries no dependency on spike-html-design; pnpm's ERR_PNPM_EXOTIC_SUBDEP refusal is recorded as a measured row.
- toolchain: the fixture package carries the module and the elements in all three TypeScript forms.
- toolchain: file:// through jsDelivr is exercised with the system Chromium's `--headless --dump-dom`; no browser-driver dependency.
- toolchain: release v0.1.0, the repository-wide annotated tag, cut on a green check.
- toolchain: the check gains `tsc --noEmit` and the offline fixture tests under both toolchains.
- toolchain: this task adds the currency command, with its own github: tag comparison, because neither `pnpm outdated` nor `bun outdated` reports github: tag dependencies.
- toolchain: the prefixed-tag rows are measured from a local, unpushed tag and handed to spike-html-packages.
- toolchain: tsc comes from mise as `github:microsoft/typescript-go` 7.0.2, the native binary; `npm:typescript` was rejected because its tsc needs Node to launch.
- toolchain: test files are outside the type check, and no package manifest has a devDependency.
- toolchain: v0.1.0 releases at SHIP; GitHub/jsDelivr rows run against spike-html-design v0.7.0 in BUILD, and the fixture's own v0.1.0 rows run after the release, recorded by the structure task's first step.
- toolchain: architect: fix herald's `normalizePath` quirk in the port; the base path strips only at a segment boundary (base `/app`: `/application` stays).
- toolchain: the sources sit in one directory per form, `src/ts/`, `src/jsdoc/`, and `src/js/`; the package exports each module as `./<form>/<module>`, plus `./jsdoc/globals` for types, and ships only `src`.
- toolchain: each element variant has its own tag, `hd-pagination-{lit,vanilla}-{ts,jsdoc,js}`, because one shared tag would make the typed forms' `HTMLElementTagNameMap` declarations conflict in the one type-checked program.
- toolchain: the JSDoc form's tag and event maps live in `src/jsdoc/globals.d.ts`, because JSDoc can't write `declare global`.
- toolchain (superseded by the redirect): pnpm installs Lit for development (`mise run install`, frozen lockfile) until the pick is applied; moving to bun swaps the lockfile.
- toolchain: pnpm keeps installing Lit for development, matching the provisional pick; if spike-html-packages releases through a registry and its reopened choice lands on npm, npm's lockfile replaces pnpm's.
- toolchain: `bun build` runs with `NODE_ENV=production`, so it resolves Lit's production export (24 kB, not 57 kB); `--production` was rejected because it also minifies, unlike the esbuild build.
- toolchain: the route matcher's `RouteTable` requires a `"*"` entry, so the fallback match is always a route config.
- toolchain: the router keeps two herald quirks as a faithful port, for whichever task builds the real router: `resolveRoute` splits the target on `?` and keeps two parts, so a second `?` and everything after it are dropped; and it doesn't strip a `#fragment`, so the fragment reaches the route path.
- toolchain: `mise run currency` reports a pin as trailing only when a strictly higher plain `vX.Y.Z` exists; a repository with no `vX.Y.Z` tag, or a pin ahead of its highest tag, is unreleased, not trailing; a dependency in any other form is reported as one it can't compare.
- toolchain: the check's offline installs take this package from a scratch repository of the working tree, tagged v0.1.0 there; the check never tags this repository.
- toolchain: brotli bytes are measured at quality 11 through bun's `node:zlib`, because mise's registry has no brotli CLI.
- toolchain (superseded by the redirect): result, evidence 1: the pick is Bun, on footprint (89.0 MB against node and pnpm's 283.3 MB); Node and pnpm's stronger stewardship doesn't overturn it, because the exit to Node stays measured in the check.
- toolchain: result, evidence 1: esbuild doesn't earn its place in the Node column; tsc emit builds with no order-of-magnitude gap and adds no binary.
- toolchain (superseded by the redirect): result, evidence 2: the TypeScript form is JSDoc checked by tsc, for the foundation and the components; plain JS remains the fallback for a module with no public contract.
- toolchain: the ecosystem survey is a slice of this task, the evidence for the industry-standard criterion.
- toolchain: the pick is argued industry standard and maintainability first, footprint second, speed only on an order-of-magnitude gap (replaces footprint first).
- toolchain: architect: .ts with a release build for components and above; builds are cheap in a release, so the zero-build argument doesn't hold there.
- toolchain: architect: .ts for the foundation too; one form and one check across the stack.
- toolchain: Vite 8 is measured in the Node column, through mise's npm: backend.
- toolchain: the survey records release hosting as facts; the decision stays with spike-html-packages; npm is ruled out unless no workable alternative exists.
- toolchain: this task records the toolchain pick after the survey.
- Supersedes: the earlier result lines "pick Bun, on footprint" and "TS form JSDoc checked by tsc".
- toolchain: escalation: npm is evaluated beside pnpm, in the measure task and as a third offline consumer fixture in the check.
- toolchain: escalation (corrected): npm is pinned in mise as 12.2.1 (node 26.12.0 bundles 11.20.0; npm 12 defaults to allow-git=none); the consumer-npm fixture opts in with `.npmrc` allow-git=root, and the default refusal and root vs all on a nested git tag are measured rows. Rejected: node's bundled npm 11.20.0, which predates npm's change on git dependencies.
- toolchain: escalation: the pick is re-argued across Node + npm, Node + pnpm, and Bun.
- toolchain: Vite's library build keeps its default for several entries, one shared Lit chunk that each Lit entry imports, where esbuild and `bun build` without `--splitting` inline Lit into each entry; measure checks each bundle's shape after the timing.
- toolchain: measure writes Vite's config into scratch, never the working tree, as a plain object with no import of vite, and loads it with `--configLoader native`, so Vite writes no bundled config beside it.
- toolchain: Vite's watch row times `vite build --watch`, not the dev server, which serves modules on request and writes no output to poll.
- toolchain: the check and measure run npm as `mise --cd <root> which npm`, so neither node's bundled npm 11.20.0 nor a global npm on PATH runs; the check fails unless that npm's version equals the pin read from `mise ls --local --json npm`.
- toolchain: the check's npm install reads a scratch cache seeded from npm's global one, the index (`index-v5`) copied and the content (`content-v2`) a tree of symlinks, so what npm packs from git and the index entries it writes stay in scratch; a cold cache fails on ENOTCACHED.
- toolchain: measure records a git dependency's `prepare` under npm, pnpm, and bun, each row passing only on that manager's specific outcome: npm's run-while-warning, pnpm's refusal, bun's skip.
- toolchain: result, evidence 1: the runtime is Node, the industry standard, settled; the manager is pnpm provisionally, on the multi-package practice and the repository-release facts; if spike-html-packages releases the layers through a registry, the choice between npm and pnpm reopens, and spike-html-packages weighs it with its hosting and repository-layout decisions, counting npm's monorepo gaps; never Bun beside it. Footprint (Bun 89.0 MB, Node + npm 236.8 MB, Node + pnpm 283.3 MB) and speed (order-of-magnitude gaps only under a second) don't overturn it.
- toolchain: result, evidence 1: tsc emit builds the foundation and components, and Vite builds apps; `bun build` leaves with Bun.
- toolchain: result, evidence 2: every layer is written in `.ts` and released through a build that ships `.js` and `.d.ts`; JSDoc lost on readability and maintainability, plain JS on type safety.
- toolchain: architect: amendment 13 includes Bun as a third column for every concern; its manager results don't reopen the runtime pick.
- toolchain: result, amendment 13: npm has closed nested paths (since npm 3) and nondeterminism (since npm 5); it has partly closed phantom dependencies (its linked install strategy, stable since 11.18.0 and 12.0.0, is the strictest layout measured but opt-in) and monorepo support (no graph-ordered workspace runs, `workspace:` protocol, or catalogs); it hasn't closed disk duplication or speed. The provisional pnpm pick stands.
- toolchain: result, amendment 13: Bun's isolated linker refuses phantom dependencies as pnpm does, but its default for a project without workspaces is hoisted, which resolves them.
- toolchain: result, amendment 13: cold installs are too loose to compare (a re-run moved every manager's mean, with σ up to 416.3 ms), so no cold ratio is drawn; the warm figures carry the speed comparison.
- toolchain: the pnpm pin, 12.11.2, follows the release pnpm marks latest on GitHub, which mise resolves through `aqua:pnpm/pnpm`; the npm registry's `latest` dist-tag is 12.14.0. The next task's currency and upgrade step decides whether to follow the dist-tag.
- structure: the pnpm pin follows what mise resolves natively (`mise latest pnpm`: 12.11.2 through aqua:pnpm/pnpm); the npm registry's latest dist-tag (12.14.0 on 2026-10-16) is recorded as a fact; the pin and currency are unchanged. Rejected: following the dist-tag.
- structure: architect: the static app branch may come to use Lit for its own internal reusable components; undecided, never a hard condition.
- structure (superseded by the redirect): the lint/format comparison is three-way, Biome against ESLint + Prettier (typescript-eslint) against oxlint + oxfmt, measured on the same tree from mise npm: pins used only by measure, argued in the toolchain order.
- structure: the comparison adds configurability (reproducing this repo's formatter options, byte-identical) and content scope (file types each formatter touches by default, Markdown included, and whether it can be limited to code); the architect finds Prettier inflexible and heavy-handed on content, Markdown included, but open to its result.
- structure (superseded by the redirect): import direction is enforced by the lint tool's restricted-imports rule per layer directory, listing aliases and the package's own name; rejected: dependency-cruiser (an extra pin) and tsc project references (`tsc -b` writes files even on failure).
- structure: the layers are directories in one package; packaging stays with spike-html-packages, which gets the package-boundary facts.
- structure: the toolchain's per-form tree stays frozen as evidence; the layers get their own tree.
- structure: the application SDK is a sibling of components: both import only the foundation (the SDK may import Lit); applications import both.
- structure: the static branch may import the foundation, Lit, and components; never the SDK, an application-branch app, or another app. The branches task decides whether static pages use Lit.
- structure: an app's internal tiers are left to the branches task; this task covers the stack layers and the rule against importing from another app.
- structure (superseded by the redirect): if Results 6 picks a lint tool other than Biome, BUILD escalates before the check switches.
- structure: the layer tree is `layers/`, a name that says what it holds and stays clear of `src/`'s frozen per-form tree; `layers/` isn't in package.json's `exports`.
- structure: tsconfig.json includes `layers/`, and tsconfig.build.json pins its own include to `src/ts` and `src/jsdoc`, because it inherits the include and its `rootDir` is `src`; the tsc build emits the same twelve files as before.
- structure: the foundation refuses every bare specifier, so every package, not only Lit.
- structure: the occupants import `.js` paths, which bundler resolution maps to `.ts` with no compiler option; the release's import extension stays with spike-html-packages.
- structure: the direction trees live in `test/layers-tree.js`, which `test/layers.test.js` and measure both import.
- structure: ESLint's config translates each of `biome.json`'s pattern groups into one regex with Biome's meaning, because ESLint reads a group as gitignore lines, where a `!` line can't re-include a `./` or `../` path; copied as written, the groups flag all 14 allowed files.
- structure: oxlint's config merges each override's groups into one, the `!` group first, because oxlint lets one group's `!` pattern re-allow what another group refuses and runs no lookaround regex; copied as written, the groups flag 54 of the 62 violations.
- structure (superseded by the redirect): typescript-eslint, @eslint/js, globals, and typescript install into measure's scratch at the versions in measure.sh's `eslint_packages`, and `mise run currency` reports each one that trails.
- structure: held typescript at 6.0.3, the highest typescript-eslint 8.71.2's peer range accepts; currency compares it against that range, not TypeScript's latest, 7.0.2.
- structure (superseded by the redirect): measure installs the ESLint setup's packages with `--legacy-peer-deps`, so npm installs no second ESLint beside the mise pin.
- structure (superseded by the redirect): every layer's override holds a normalization convention: a relative specifier starts with `./` or its run of `../`, and no later segment is `.`, `..`, empty, or percent-encoded; absolute specifiers are refused, and each app override also refuses the bare climb out of the app (`..`, `../`, `../..`, and so on). A segment starting with a non-ASCII character stays uncovered.
- structure (superseded by the redirect): an override for the files at `layers/*`, `layers/apps/*`, and `layers/apps/*/*`, which a bare climb reaches, refuses every relative and absolute specifier and the package's own name, so a file there fails closed.
- structure (superseded by the redirect): the foundation may import its own index: it re-allows `.`, `./`, `..`, and `../`, which `./**` and `../**` don't match.
- structure: Biome's direction groups cost about 30 ms per run, lint and format alike, because the cost is in loading the configuration (`biome lint` 62.5 ms against 32.3 ms without them, `biome format` 59.1 ms against 28.8 ms).
- structure (superseded by the redirect): result, evidence 3: the layers are the directories of `layers/` in one package, with the direction enforced by Biome's `noRestrictedImports`, one override per layer directory; the layer test flags 62 of 62 violation files and 0 of 14 allowed ones. The rule matches import text, never the resolved file. Rejected: ESLint's `no-restricted-imports`, which never checks `import()`.
- structure (superseded by the redirect): result, evidence 6: Biome stays in the check, argued on the first criterion. ESLint + Prettier is the standard by use, but ESLint's rule can't enforce the direction on `import()`, the setup adds Node and four packages to the check, and Prettier rewrites Markdown and the lockfile by default. oxlint + oxfmt matches Biome on direction but isn't the standard, and oxfmt is 0.x. Footprint (Biome 66.7 MB, ESLint + Prettier 51.8 MB, oxlint + oxfmt 35.6 MB) and speed (121.3, 863.9, and 94.2 ms, all under a second) don't overturn it.
- structure: redirect at BRIEF: Biome isn't a decided winner; the architect cites its stewardship (a community fork of the defunct Rome Tools, a small team funded by donations) and is hesitant about Prettier.
- structure: the comparison measures four setups: Biome, ESLint + Prettier, oxlint + oxfmt, and ESLint + ESLint Stylistic with eslint-plugin-jsonc for JSON; all four stay in contention, and the outcome picks provisionally (architect: Biome may still be optimal for its simplicity and minimal surface friction).
- structure: both resolved-file direction plugins are measured, eslint-plugin-boundaries (with eslint-import-resolver-typescript) and eslint-plugin-import-x's no-restricted-paths, each with its no-unresolved rule, on trees whose imports name real files; eslint-plugin-import is out (no release accepts ESLint 10).
- structure: stewardship (organization or foundation, maintainers, funding, sourced) and surface (binaries, configs, packages to keep current) are weighed inside maintainability, in the toolchain order.
- structure: Prettier against ESLint Stylistic follows the toolchain order.
- structure: the formatting rows split into "leaves unchanged" and "restores" (from a copy with disturbed line breaks and indentation), for code and for JSON.
- structure: architect: the check switches to the provisional pick in this task (rejected: a separate task).
- structure: if an ESLint setup wins, its packages become devDependencies installed by `mise run install`, and STANDARDS.md's rule becomes "Lit is the only runtime dependency; lint tooling is the only devDependencies"; Biome leaves the check for a measure-only pin, the direction lives in the passing plugin alone with no-unresolved, and the normalization convention goes. If neither plugin passes the trees under ESLint 10 while an ESLint setup would win, BUILD escalates.
- structure: Results 3 and 6 are rewritten as provisional, titled for the outcome.
- structure: escalation: architect: eslint's devDependency pin is 10.12.0, keeping pnpm's one-day minimumReleaseAge gate intact; rejected: 10.13.0 (published 2026-10-16T14:24Z) with a minimumReleaseAgeExclude entry. currency raises 10.13.0 once the gate passes.
- structure: eslint-plugin-boundaries' `dependencies` rule runs beside eslint-plugin-import-x's `no-unresolved`, so a specifier that resolves to no file, such as the package's own name or an absolute path, fails instead of passing unjudged.
- structure: the direction trees in `test/layers-tree.js` write a real file for every relative or absolute specifier they import, resolved as a browser resolves it, by URL against the importing file, then a `.js` file to its `.ts` source and a directory to its `index.ts`.
- structure: the layer test passes only when `boundaries/dependencies` itself flags each violation file; a file flagged by `no-unresolved` alone doesn't count.
- structure: the two non-normalized paths that reach a file their layer may import (`layers/components/unnormalized.ts`, `layers/apps/application/documents/name-parent.ts`) moved from the violation tree to the allowed tree, since they cross no layer once the direction is judged by resolved file.
- structure: `biome.json` keeps only the formatter settings; its layer overrides moved to `scripts/biome-layers.json`, which only measure reads, as the text rules' baseline for Biome, oxlint, and core `no-restricted-imports`.
- structure: the check runs ESLint and Prettier through `pnpm exec`. Measure links `eslint` and `prettier` into a scratch bin directory on PATH instead of putting `node_modules/.bin` there, because that directory also holds typescript 6.0.3's tsc, which would shadow the pinned tsc 7.0.2.
- structure: `pnpm-workspace.yaml` sets `allowBuilds: unrs-resolver: false`, since pnpm installs the optional dependency holding unrs-resolver's native binding and its postinstall needn't run.
- structure: `scripts/consumers.sh` fails if any consumer, under pnpm, npm, or bun, installs one of this package's devDependencies.
- structure: `eslint.config.js` exports the layer table, and `scripts/lint-compare.js` imports it to build import-x's zones, so measure and the check read one table.
- structure: currency reports devDependencies through `pnpm outdated --dev`, which honors pnpm's one-day minimumReleaseAge, so a release younger than a day isn't reported as trailing until it passes the gate.
- structure: each "restores" row passes only when the formatter exits 0, so a crash that leaves the recorded misses unchanged fails the row.
- structure: result, evidence 3: the layers are the directories of `layers/` in one package, with the direction enforced, provisionally, on the file each import resolves to, by eslint-plugin-boundaries' `dependencies` rule over the layer table in `eslint.config.js`, beside import-x's `no-unresolved`. The layer test flags 60 of 60 violation files, all by `boundaries/dependencies`, and 0 of 16 allowed ones (m 2026-10-16T21:11:09Z). Rejected: Biome's `noRestrictedImports`, which matches import text and flags the two non-normalized allowed paths; import-x's `no-restricted-paths`, which flags 2 allowed files in directories whose names start with dots; ESLint's core `no-restricted-imports`, which never checks `import()` (55 of 60); dependency-cruiser and tsc project references, as before.
- structure: result, evidence 6: ESLint + Prettier is the lint and format setup, provisionally, argued in the toolchain order. On the first criterion it is the standard by a wide margin (9,697 and 9,295 SoJS 2025 respondents against Biome's 1,762; ESLint in 10 and Prettier in 11 of the 13 web-component libraries), its two tools are better stewarded (ESLint under the OpenJS Foundation), and its direction rule judges the resolved file; that outweighs Biome's smaller surface, one binary and one config file against B's 9 pins, four config files, and 140 installed packages. ESLint Stylistic loses to Prettier because it can't restore a disturbed tree (19 of 21 code files and 8 of 13 JSON files differ); oxlint + oxfmt isn't the standard, moves a key in `package.json`, and judges direction by text. Footprint (A 66.7 MB, B 62.1 MB, C 35.6 MB, D 55.2 MB) doesn't overturn it, nor do speed's two order-of-magnitude gaps (B's lint and format at 950.0 ms, 10.3 times C's 92.5 ms; ESLint's lint 11.0 times `biome lint`'s) (m 2026-10-16T21:11:09Z). It reopens if spike-html-packages makes the layers packages, whose declared dependencies would enforce the direction at install and shrink the plugin's role, or if ESLint's or Prettier's foundation or funding changes.
- components: currency at planning (2026-10-17T13:35Z) reported pnpm 12.11.2 -> 12.14.0, which mise now resolves natively (`aqua:pnpm/pnpm`, GitHub's Latest), so under the structure Decision the pin follows it in an upgrade slice; eslint 10.13.0 joins if currency reports it once past pnpm's release-age gate (2026-10-17T14:24Z).
- components: the element is herald's pagination, rewritten as a new set in the components layer on the foundation; the frozen src/ pair stays untouched.
- components: the vanilla versions build on the platform and the foundation's define, emit, and required only, with no base class.
- components: architect: the vanilla versions match Lit's observable contract by hand (attribute removal and invalid JSON give null, a pre-upgrade property is kept) and forgo batched and binding-level updates, to expose the pain of building without Lit so the tradeoffs can be weighed.
- components: the features table is one fixed list, each row marked Lit provides, vanilla builds by hand, vanilla forgoes, or not exercised; form association and SSR are sourced facts.
- components: a shared probe in `mise run demo` (outside the check, Chromium --dump-dom, no driver) passes only when every version reports the same text, events, and contract cases; the check's browser tier stays with testing.
- components: architect: size is compared as what is served in development and in production after the build.
- components: architect: line count is a poor metric; source lines and source brotli are context only.
- components: architect: readability, maintainability, and scalability are the architect's judgement from reading the files, not metrics. Rejected: metrics drawn from scenario diffs; a scored rubric.
- components: the four change scenarios (reflected `disabled`, conditional "Showing X–Y of N" summary, author content in place of the "Page Size" label, one shared button-style source across both elements) are requirements of the final components.
- components: compile-to-custom-element alternatives are sourced facts, no column. No build removes Lit's runtime: @lit-labs/compiler 1.1.2 (Labs) prepares templates that lit-html still renders; Svelte, Stencil, and solid-element ship their own runtimes.
- components: architect: both render roots are explored; the full two-by-two (vanilla and Lit, shadow and light DOM) per element.
- components: light-DOM component styles are one constructed sheet per component, adopted into document.adoptedStyleSheets once, in a named cascade layer above the baseline, tokens only (spike-html-design's theme-menu convention).
- components: light-DOM selectors nest under the element's tag; @scope (Baseline newly available 2026-03-24) is the recorded alternative.
- components (superseded by amendment 2): light-DOM versions drop herald's folded control styles and take spike-html-design v0.7.0's elements layer; shadow versions keep them.
- components: measure records served bytes per version for a pagination-only page and the composition page: development (Vite 8.3.4 dev server on a scratch copy, every response uncompressed, Lit's development builds) and production (`vite build`, every emitted file raw and brotli q11 via node:zlib, Lit's share split out).
- components: architect: the second element renders within pagination; pagination becomes a container, entries slotted under a shadow root or placed by hand in light DOM. Rejected: confirm-dialog; a list element rendering pagination; herald's siblings.
- components: the blobfs-shaped element is one entry element for a directory or a file (kind, name, size and content type for files, status, updated time via Intl), sending open {id, kind}. Rejected: separate row elements; a breadcrumb.
- components: pagination takes go-web-sdk's Page envelope fields (page, size, total, more); page count derived, Next follows more when total is absent, page input disabled when page is absent. Rejected: herald's page, total-pages, size.
- components: the entry element types its properties with its own interface of the fields it renders; go-web-service's objects fit structurally; no cross-layer import.
- components: a static fixture in go-web-service's wire shape at 15e0bc3 feeds demo, probe, and measure, including a pending null-size file and a cursor page with no page or total.
- components: architect: the analysis rests on the components' final form, read in nvim. Rejected: per-scenario commits, directories, or patches.
- components: BUILD pauses for an architect review once all 8 versions exist and before Results 4; the judgement is logged as a Decision.
- components: Results 4 records the judgement, the sourced facts, served bytes, and source sizes as context; no rubric.
- components: architect, at the review stop: Lit with a shadow root is the default for components; light DOM's hand-placed composition costs more than it gives. The one complaint: styles written as strings in .ts rather than natively in .css files.
- components: escalation: component styles are standard CSS module scripts (`with { type: "css" }`) with one ambient declaration. Rejected: fetch plus replace() (a request per sheet, not the standard form); a <link> per shadow root (unstyled flash, no shared sheet, advised against by Lit); Vite's `?inline` (Vite-only, breaks tsc library emit).
- components: escalation: a local ~30-line Vite plugin of herald's shape resolves the form in dev and build. Rejected: @arcmantle/vite-plugin-import-css-sheet (niche, a non-lint devDependency); es-module-shims at runtime (about 20 kB brotli, one maintainer).
- components: escalation: Safari, which no release yet supports CSS module scripts in (WebKit landed it 2026-10-06), is a recorded gap for unbundled loading; apps build through Vite, so production pages don't depend on it. No shim ships.
- components: escalation: the demo loads the components from tsc's emit natively in Chromium, not through esbuild IIFE pages or an esbuild plugin; build:tsc copies each .css beside its .js, and spike-html-packages is handed the release consequence.
- components: escalation: all 8 versions, status-badge, and the shared button sheet move to .css; the button sheet is one .css file adopted by reference into every shadow version. (Amendment 2 deleted the button sheet; the shared file is the foundation's elements layer.)
- components: escalation: the check refuses a .css import without `with { type: "css" }` (core no-restricted-syntax), since the ambient declaration alone accepts a bare import no browser loads as a sheet.
- components: escalation: Results 1's toolchain pick doesn't reopen. Bun 1.4.3 loads a CSS module script as `{}`; herald's native CSS was a 30-line BunPlugin, which a Vite plugin reproduces.
- components: escalation: STANDARDS.md records Lit with a shadow root as the component default and the .css convention.
- components (superseded by amendment 2): escalation: spike-html-design's elements layer as an adoptable sheet, and its theme-menu's string-built sheet, go to the session as a note, not into this task.
- components: architect, during BUILD: a `mise run preview` task serves the four versions side by side through Vite's dev server, interactive against the fixture, so the components can be seen in a browser before Results 4.
- components: the layer holds one file per element and version (`pagination-<base>-<root>.ts`, `entry-<base>-<root>.ts`), each with its own `.css` beside it, and declares no `HTMLElementEventMap` augmentation, because the frozen `src/ts` port declares `page-change` as `{page: number}` and a second declaration must match; the event detail types are exported interfaces instead.
- components: Next on a page continued by cursor sends `page-change {page: null}` and the host follows the envelope's `next`; Prev is disabled there, and with no total the page input clamps only below.
- components: the page input returns to the current page after a change, so it shows `page` until the host sets another. Rejected: herald's, which left the typed value.
- components: the entry's sizes step by 1000, matching `Intl`'s SI unit names. Rejected: herald's 1024.
- components: the Lit and vanilla shadow versions of an element share one sheet (`pagination-shadow.css`, `entry-shadow.css`), since their CSS was identical; each light version keeps its own sheet, its rules nested under its own tag.
- components (superseded by amendment 2): the shadow sheets and `buttons.css` read spike-html-design v0.7.0's token names, the light versions' vocabulary, keeping herald's rules and each fallback; each file's header records the mapping. Herald's names, most of which the baseline doesn't define, painted themed backgrounds under system-colour text.
- components: `scripts/css-sheets.js` reads the import attribute in a pre transform that parses each importer (`this.parse`), because Vite 8.3.4 passes no import attributes to `resolveId` or `load`; it rewrites each `type: "css"` import to a virtual module that builds the sheet, and leaves any other `.css` import to Vite. The ~30-line plugin of the escalation holds, so BUILD didn't escalate.
- components: the check refuses any `import()` of a `.css` file, with the attribute or without, a template specifier included, because a component imports its sheet statically and `scripts/css-sheets.js` handles only the static forms. Static imports and export-froms still need `with { type: "css" }`.
- components: each demo page holds its own load event with a hidden iframe whose document stays open until the run returns or its module script fails to load, with a 60 s timeout behind it, because `--dump-dom` raced the run's dynamic imports and `--virtual-time-budget` missed the verdict in about one dump in three.
- components: the probe reads the pre-definition case from what renders (the page input, the entry's rendered name), because a property an element never took in still reads back from its own field and so couldn't fail the case.
- components: the pagination contract and the page sizes are exported once from `demo/versions.ts`, which the probe, the preview, and `scripts/components.js` import; measure's pages came out byte for byte the same.
- components: measure's development figures are the 2xx bodies Chromium's NetLog records (`--net-log-capture-mode=Everything`), with Vite's client as its own share. Rejected: crawling the module graph with fetch, which reproduces Vite's rewriting but not the browser's requests. Production splits Lit into its own chunk with an `output.codeSplitting` group over lit, lit-html, lit-element, and `@lit/*`.
- components: `.prettierignore` lets `*.css` back in, so the check format-checks the component stylesheets, and measure's scope rows limit each setup to that scope, code, JSON, and CSS; the row records that D's ESLint Stylistic formats no CSS rather than failing on it. The lint comparison's code rows stay `.js` and `.ts`.
- components: `mise run preview` serves from a scratch Vite root (the page, the config, Vite's cacheDir, and the baseline by `git archive`) and loads `demo/preview.ts` from the working tree through `/@fs/` (`server.fs.allow` names the repository), so edits to the components reach the open page and nothing is written to the tree. Every column links the baseline, so the page is one design. (Amendment 2: the baseline is the foundation's page entry, loaded from the working tree through `/@fs/`, not extracted by `git archive`.)
- components: redirect at BRIEF (architect): the shadow versions couldn't see the page's baseline, so they kept herald's look. Shadow roots adopt the foundation's reset and elements sheets by reference; buttons.css goes. Survey 2026-10-17: no shipped mechanism lets a shadow root inherit page styles.
- components: spike-html-design doesn't fit the layout (its entry is @import-built, no layer is exported), so it is ported into the foundation rather than depended on or changed (architect). Layers renamed `foundation.*`; the port is owned here, formatted by Prettier, with provenance headers and no parity test (architect, questions 1 and 3). Rejected: a git-tag dependency (no exported layer files; a package.json `imports` target into node_modules throws ERR_INVALID_PACKAGE_TARGET in node 26.12.0).
- components: the port is tokens (flexoki, regular, mono), reset, and elements; tools and other profiles stay out, as nothing uses them (architect). Shadow pages link the page entry too, for tokens; measure counts the adopted sheets in the baseline share (architect).
- components: amendment 2's evidence cites measure run 2026-10-17T23:45:28Z (121/121); every production row fails if a comment survives outside Lit's chunk. The local CSS plugin minifies every sheet in `vite build` through Vite's own `?inline` CSS import (Lightning CSS, no new package); rejected: importing Lightning CSS directly (inside mise's Vite install, unreachable from the scratch project) and `preprocessCSS` (doesn't minify). Production splits the adopted foundation sheets into a `foundation/` chunk counted as baseline; a shadow page loads reset and elements twice, linked and adopted, and the rows say so.
- components: two lines of the port are respelled so Prettier, Biome, and oxfmt agree (elements.css nests the block-after-block selector under `:where()`; baseline.css states the layer order in two statements); meaning unchanged, recorded in each header. Rejected: recording the disagreement as an expected fact in measure's format rows. The entry button takes `text-align: start` in all four entry sheets so the wrapped type doesn't center; the probe's overflow case narrows the cursor composition to 22rem, the preview's narrowest column, so it can fail.
- components: standards review of amendment 2: the probe's look case compares each control with a bare control of the same tag and type that the page's baseline paints, not with values copied from the port; production rows require every emitted file outside Lit's chunk comment-free, so a broken minify path fails measure (mutation-tested).
- components: the shadow versions drop herald's `btn`, `btn-page`, and `input` classes and take the light versions' class names (`page-step`, `page-input`, `entry`), which only the layout sheets select.

## Pending edits

- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the toolchain task's interim results, pending the intake's decision. The hypothesis's split by role (Node + pnpm for packages, Bun for bundling) is ruled out. Across Node + npm, Node + pnpm, and Bun, argued industry standard and maintainability first, footprint second, and speed only on an order-of-magnitude gap, the runtime is Node, settled, and the manager is pnpm provisionally. If spike-html-packages releases the layers through a registry, the choice between npm and pnpm reopens: spike-html-packages weighs npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps, with its hosting and repository-layout decisions. Every layer is written in `.ts` and released through a build that ships `.js` and `.d.ts`. tsc emit builds libraries and Vite builds apps; esbuild doesn't earn its place.
- coordinator · roadmap, spike-html-packages: decide the hosting and repository layout, on which spike-html-conventions' manager pick depends (a repository release keeps pnpm; a registry release reopens the choice between npm and pnpm, which this task weighs with those decisions: npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps), weighing registry-based options (npm registry publish, release-asset tarballs installed by URL, plain URL imports through an import map) and spike-html-conventions' evidence (Results 1, 2, and 7, and the Ecosystem survey's Release hosting). Prefixed tags: pnpm installs a subdirectory with `#fixture/v0.1.0&path:/fixture`; bun can't resolve the spec; npm ignores `&path:` as an unknown key, and its own `::path:` resolves the tag to its commit, then fails with ENOENT on the clone's package.json. Git-tag dependencies: npm 12 defaults to allow-git=none and refuses any; allow-git=root admits a consumer's own but refuses a git-tag package's own git-tag dependency, which allow-git=all installs; pnpm 12's `blockExoticSubdeps` default refuses only that nested one; bun has no guard. A git dependency's `prepare`: npm runs it at pack time while warning that it was blocked, and only `--ignore-scripts` skips it; pnpm refuses the install until `allowBuilds` names the resolved spec with its commit; bun installs without running it and reports it until `trustedDependencies` names it. The release build: each `.ts` module ships as an unbundled, unminified `.js` ES module with its `.d.ts` (`tsc -p tsconfig.build.json` emits that); the built files sit in the tag or a release asset; `exports` points at the built `.js` with its types; `files` names the built output (bun ignores `files`). Hosting facts: jsDelivr `/gh/` caches an exact tag for good, serves `.ts` as `text/plain` with `nosniff`, and returns 404 for `/+esm`; GitHub Packages needs a token for every install, public packages included, and takes only scoped packages; JSR emits JS and `.d.ts` from `.ts` and installs natively in pnpm 10.9+ and Yarn 4.9+, while npm needs `.npmrc` setup and Bun's support isn't documented; Verdaccio is a server you run; all 13 surveyed web-component libraries publish to the npm registry, which stays ruled out unless no workable alternative exists, so a registry release means GitHub Packages, JSR, or a self-hosted registry. npm's monorepo gaps: workspace runs follow the `workspaces` array's order, not the dependency graph (npm/rfcs#707); npm has no `workspace:` protocol (npm/cli#8845) and no catalogs (npm/rfcs#872); five linked-layout bugs are open, two on workspaces (npm/cli#10082, #9982). npm's linked install strategy (`--install-strategy=linked`) refuses phantom dependencies, the strictest layout measured, but it is opt-in, stable only since 11.18.0 and 12.0.0, and still copies each package into a per-project `node_modules/.store`.
- coordinator · roadmap, spike-html-apps: the real router fixes two herald quirks this spike's port kept (a second `?` in the query is dropped; a `#fragment` reaches the route path) and strips the base path only at a segment boundary.
- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the structure task's interim results, pending the intake's decision. The layers are directories of `layers/` in one package: the foundation (native only, no package), components (the element tier) and the application SDK as siblings on the foundation, a static branch that may import the foundation, components, and Lit, and an application branch that may import all three plus the SDK; no app imports another. eslint-plugin-boundaries' `dependencies` rule, over the layer table in `eslint.config.js` with import-x's `no-unresolved` beside it, enforces that direction in the check by the file each import resolves to, so relative specifiers need no normalization convention. The lint and format setup is ESLint + Prettier, provisionally, argued industry standard and maintainability first: the standard by a wide margin, the better-stewarded tools, and a direction rule by resolved file outweigh Biome's smaller surface (one binary and one config file against nine pins and four config files); ESLint Stylistic can't restore a disturbed tree, and oxlint + oxfmt isn't the standard and judges direction by text. Footprint and speed don't overturn it. The pick reopens if spike-html-packages makes the layers packages, or if ESLint's or Prettier's foundation or funding changes.
- coordinator · roadmap, spike-html-packages: decide whether the layers become packages, and the import extension the releases use (this spike's occupants import `.js` paths, which bundler resolution maps to `.ts`). The package-boundary facts (spike-html-conventions' Results 3): pnpm refuses an import of an undeclared package by default, and a lint rule can refuse one too (import-x's `no-extraneous-dependencies`, not measured), so as packages each layer's declared dependencies would enforce the direction at install as well as in the lint. Making the layers packages reopens the provisional ESLint + Prettier pick (Results 6): the direction plugin's role shrinks to the files inside a package, so direction weighs less against Biome's smaller surface. The lint tooling is the root package's devDependencies, under STANDARDS.md's rule "Lit is the only runtime dependency; lint tooling is the only devDependencies".
- coordinator · roadmap, spike-html-apps: four of herald's element files in `app/client/ui/elements` import from `@domains` (herald 6fc22b3): `classify-progress.ts` the `WORKFLOW_STAGES` constant and the `WorkflowStage` type, `document-card.ts` the `WorkflowStage` and `Document` types, `prompt-card.ts` the `Prompt` type, and `blob-viewer.ts` the `findFormat` lookup. Under spike-html-conventions' layout a component may not import domain code: the types become the element's own properties, and the constant and lookup move up to the app or down into the element.
- coordinator · roadmap, this spike's `branches` task: add the app-internal tiers (modules and views) and whether static pages use Lit, both handed on by Results 3; STANDARDS.md records the second as undecided.
- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the components task's interim result, pending the intake's decision. Components are Lit with a shadow root by default, the architect's judgement after reading all 8 final versions (two elements, a pagination container on go-web-sdk's Page envelope and the entry it holds, each in Lit and vanilla, shadow and light DOM): light DOM's hand-placed composition (MutationObserver placement in place of slots, a cascade layer ordered by adoption, page styles leaking in) costs more than it gives, though it lets the page's baseline style the controls directly. Vanilla matches Lit's observable contract only by hand-writing attributes, conversion, reflection, accessors and pre-upgrade properties, and forgoes batched and binding-level updates. No build removes Lit's runtime (5,031 B brotli in production, shared by every Lit element on a page); Svelte, Stencil and solid-element each ship their own runtime. A shadow root can't see the page's baseline: its element selectors stop at the boundary and only tokens cross, and no shipped mechanism lets a shadow root inherit page styles (csswg-drafts#10176 and whatwg/html#11687 are open). So a shadow-root component adopts the foundation's reset and elements sheets by reference, then a layout-only sheet of its own, and no component styles a control's look. The foundation holds a port of spike-html-design v0.7.0 (its tokens with the Flexoki, regular, and mono profiles, reset, and elements) as `.css` files that each wrap their rules in a `@layer foundation.<layer>` block and import nothing, because neither a constructed sheet nor a CSS module script loads `@import`; a page entry states the layer order and imports them, and every page links it, so a shadow page loads the reset and elements layers twice, linked and adopted. A component's CSS lives in its own `.css` file, imported as a standard CSS module script and never written in `.ts`. CSS module scripts run in Chrome/Edge 123+ and Firefox 147+, with no Safari release yet (WebKit landed it 2026-10-06), and are not Baseline. Apps build through Vite with a ~30-line local plugin, so their production pages don't depend on Safari; a page that loads the modules unbundled fails there until a Safari release ships the form. Native CSS doesn't reopen the toolchain pick: Bun loads the form as `{}`, and herald's native CSS was a bundler plugin.
- coordinator · roadmap, spike-html-packages: a release of the components ships each component's `.css` beside its emitted `.js`, and the foundation's sheets beside its own (the port in `layers/foundation/baseline/`, which the shadow components import as CSS module scripts, and the page entry `layers/foundation/baseline.css`, which pages link), with `exports` and `files` naming the `.css` files too, because tsc's emit copies no `.css` (spike-html-conventions' `build:tsc` copies every `.css` in `layers/` by hand). A CSS module script (`with { type: "css" }`) loads only when the file is served as `text/css`; jsDelivr serves `.css` as `text/css`. Consumers that load the modules unbundled in Safari fail until a Safari release ships WebKit's CSS module scripts (bug 227967, landed 2026-10-06, 322887@main). Bundled consumers go through Vite with a local plugin (spike-html-conventions' `scripts/css-sheets.js`). Neither Node 26 (`ERR_UNKNOWN_FILE_EXTENSION`) nor Bun 1.4.3 (`{}`) loads the form, so a test run outside a browser needs the same treatment. Source: spike-html-conventions Results 4.
- coordinator · roadmap, the web client intake (finding for spike-html-design): ship each layer (tokens with each facet and profile, reset, elements) as a self-layered, `@import`-free, exported sheet: each file wraps its rules in its own `@layer spike-html-design.<layer>` block, imports nothing, and is named in package.json's `exports`, so a component's shadow root can adopt the reset and elements layers by reference as CSS module scripts (`with { type: "css" }`); the one entry may keep the layer order statement and plain `@import`s for pages. Today's entry builds the layers with `@import ... layer()`, which neither a constructed sheet (`replace`/`replaceSync` drop `@import`, WPT css/cssom/CSSStyleSheet-constructable-disallow-import) nor a CSS module script loads, and no layer file is exported, so spike-html-conventions ported v0.7.0 (fe75220) into `layers/foundation/baseline/` as `foundation.*` layers with provenance headers: the interim and the reference for the shape (its shadow components adopt `[reset, elements]` before a layout-only sheet; no component styles a control's look). Also: the theme-menu builds its constructed sheet from a string (`modules/theme-menu.js:46-47` at v0.7.0), against the convention of CSS in `.css` files imported as CSS module scripts. Same support caveats: no Safari release ships CSS module scripts (WebKit landed them 2026-10-06); bundlers need a plugin. Source: spike-html-conventions Results 4.
- coordinator · roadmap, spike-html-apps: herald's pagination takes `total_pages` (`pkg/pagination` `PageResult`, the element's `total-pages` attribute, 6fc22b3); go-web-sdk's Page envelope carries `items`, `page`, `size`, `total`, `more`, `next` and omits `page` and `total` under a cursor (`total` also when the read didn't count). spike-html-conventions' pagination derives the page count from total and size, follows `more` for Next when total is absent, disables the page input when page is absent, and sends `page-change {page: null}` on cursor Next so the host follows `next`. The real app wires these fields and treats a null page as a cursor follow.
