# goal · experiment.html.spike-html-conventions

- **State:** building
- **Task:** testing
- **Branch:** testing

## Tasks

1. [x] toolchain
2. [x] structure
3. [x] components
4. [ ] testing
5. [ ] branches

## Task brief · testing

```
Problem       The check has a unit tier (the router suite and the layer
              test, under node --test and bun test) but no browser tier.
              The components' 27 contract cases and the 4 restyle checks
              run only in the demo, through --dump-dom, which needs a
              hidden-iframe load hold, a 60 s timeout, an import map, and
              file:// flags. Evidence 5 asks for both tiers in the one
              check. The architect asks whether Playwright's overhead buys
              enough, by testing every engine (Chromium, Firefox, WebKit),
              over a no-package driver on the system Chromium alone, and
              for the browser tier to serve the components through Vite
              rather than from file://.
              currency at planning: eslint 10.12.0 -> 10.13.0 (minor,
              nothing to adapt).

Behaviors
  1. The pinned tools are current: eslint is 10.13.0, mise run install
     succeeds from the frozen lockfile, mise run check passes, and
     currency prints nothing.
  2. mise run measure runs the probe's 27 cases in each of the four
     component versions, and the 4 restyle checks, through two drivers
     against pages Vite's dev server serves with the local CSS plugin:
     - the raw Chromium debugging pipe, no package, on the system
       Chromium;
     - playwright-core 1.64.1 called from node:test, on the system
       Chromium through executablePath, on Playwright's Chromium Headless
       Shell 156, on its Firefox 157, and on its WebKit r2370.
     Every Vite row passes only when every case holds in every version
     and all four versions' reports match.
  3. Measure also runs the unbundled form (tsc emit with native CSS
     module scripts, over plain http) in Chromium, Firefox, and WebKit:
     Chromium and Firefox rows pass only when every case holds; the
     WebKit row passes only when the components fail to load, the
     Safari gap.
  4. Measure records Playwright's overhead against the raw pipe, weighed
     against the cross-engine coverage it buys:
     - footprint: playwright-core's installed bytes, and each browser's
       download bytes and time;
     - the pins and devDependencies a Playwright pick would add;
     - each driver's harness lines;
     - cold and warm hyperfine times of the same cases on the system
       Chromium;
     - a repeat row: 20 runs per driver, failures counted, expected 0.
     @playwright/test, Web Test Runner, and Vitest browser mode are
     sourced facts, not columns. Measure keeps Playwright's browsers in
     its own scratch (PLAYWRIGHT_BROWSERS_PATH), reads the network only
     there, and writes nothing to the working tree.
  5. Review stop: once 1-4 hold, BUILD pauses. The architect reads the
     drafted Results 5 rows and decides the check's driver and its
     engines; the pick is logged as a Decision. The default, if
     Playwright doesn't earn its place, is the raw pipe on the system
     Chromium alone.
  6. The check's browser tier, under node --test only (never bun test),
     runs the 27 cases in each of the four versions and the 4 restyle
     checks on the engines the Decision names. Pages are served by the
     mise-pinned Vite binary with the local CSS plugin, which the test
     spawns in scratch and stops. The check reads no network, writes
     nothing to the working tree, and fails when a named engine is
     missing. A deliberately broken case fails the check.
  7. mise run demo renders only the frozen pagination builds; the
     composition and restyle pages, and their load hold, are gone. The
     preview is unchanged.
  8. STANDARDS.md records: the unit tier is DOM-free code under node
     --test with no DOM shim; anything touching the DOM is the browser
     tier, which serves components through Vite in the engines the
     Decision names; and, if Playwright is picked, the revised
     devDependency rule and browser exception.
  9. README Results 5 records the comparison table and each overhead
     row from one dated measure run, the pick and why, the Safari gap
     row, and the facts for the runners not measured. The goal record
     gains the pending edit for html-artifacts.md's interim testing
     result.

Test seams    mise run check: the browser tier and the unit tier (1, 6).
              mise run measure: the driver, engine, unbundled, and
              overhead rows (2-4). The review stop (5). mise run demo
              (7). STANDARDS.md and README Results 5 with their cited
              run (8, 9).

Slices
  1. Upgrade: eslint 10.13.0.
     Demo: currency prints nothing; install and check pass.
  2. Raw pipe over Vite in measure: Vite started in scratch with the
     plugin, the cases and restyle checks in all four versions on the
     system Chromium.
     Demo: measure's raw-pipe rows pass with matching reports.
  3. Playwright column: system Chromium, Headless Shell 156, Firefox
     157, WebKit r2370 over Vite, browsers downloaded into scratch; the
     unbundled rows per engine.
     Demo: every Vite row passes; the unbundled WebKit row records the
     expected load failure.
  4. Overhead rows: footprint, download times, pins added, harness
     lines, cold and warm timings, the 20-run repeat row.
     Demo: measure prints every row passing.
  -- Review stop: the architect decides the check's driver and engines
     from the drafted Results 5; logged as a Decision. --
  5. Browser tier in the check, on the picked driver and engines, over
     Vite, under node --test.
     Demo: check passes; a broken case fails it.
  6. Demo trimmed to the frozen pagination pages.
     Demo: demo passes its frozen pages alone.
  7. Evidence: STANDARDS.md's tier rules, Results 5 from one fresh
     measure run, the html-artifacts.md pending edit.
     Demo: Results 5 and STANDARDS.md.

Out of scope  Web Test Runner and Vitest browser mode as measured columns
              (facts only). A DOM shim; unit tests over the components'
              private helpers. The browser tier under bun test. The
              frozen pagination pages and their builds. A fix or shim for
              Safari's CSS module scripts. Release builds and packaging
              (spike-html-packages). CI.
Door          two-way: no tag, nothing published; the eslint pin and any
              Playwright devDependency revert by restoring the pin and
              lockfile.
```

Redirect 2 at BRIEF (architect): native node tests, the browser tier over the raw CDP pipe on a
pinned Chrome for Testing headless shell; no Playwright in the check. Supersedes redirect 1.

Microsoft supports Playwright on Linux only for Ubuntu and Debian, and the architect won't rely
on unofficial support on Arch. Google names no Arch either, but Chrome for Testing's
chrome-headless-shell is one generic linux64 zip that runs here, and one pin makes the check the
same locally and in CI (round 4, 2026-10-18).

  6. (rev) The check's browser tier runs `scripts/browser.test.js` under node --test with the
     raw CDP pipe (no package) on Chrome for Testing's chrome-headless-shell, pinned in mise.toml
     through mise's http: backend (version 155.0.8059.84, linux-x64 URL, a sha256 and size we
     record), launched by path with --no-sandbox; Chromium alone. It fails by name when the pin
     isn't installed. The system Chromium and Firefox leave the check.
  4. (rev) Measure keeps Playwright as the comparison column, playwright-core installed into
     measure's scratch (a scratch pin currency lists), its browsers in measure's scratch.
  8. (rev) STANDARDS.md: the devDependency rule reverts to lint tooling only; every browser the
     check runs is the mise pin; the browser tier is Chromium alone (Firefox and WebKit are gaps
     the check doesn't cover); the strategy lines of redirect 1 stay, with the raw pipe as the
     check's driver and a CI job running the same `mise install` (e.g. jdx/mise-action).
  9. (rev) Results 5 records the revised pick, the support facts (Microsoft: Ubuntu and Debian;
     Google: Ubuntu, Debian, openSUSE, Fedora; Playwright's Chromium is itself a CfT build), the
     check's timing on the pin, CfT's lack of checksums, the CI facts (the runner's unpinned
     browsers; AppArmor and --no-sandbox), and Firefox over BiDi only (puppeteer-core) as the
     rejected way to keep it.


Redirect at BRIEF (architect): the check's browsers are all Playwright's, so it runs the same in CI.

The system Chromium isn't pinned by the repository (it moved from 152 to 154 during BUILD) and
doesn't exist on a CI runner. Playwright's Chromium Headless Shell 156 passed every measure row.

  6. (rev) The check's browser tier runs Playwright on its Chromium Headless Shell and its
     Firefox, both fixed by playwright-core's pin; `mise run install` downloads both into
     `~/.cache/spike-html-conventions/playwright`. The system Chromium leaves the check and stays
     in measure (the raw pipe's browser and Playwright's like-for-like timing row).
  8. (rev) STANDARDS.md drops the system-Chromium exception from the check (every browser the
     check runs is fixed by one pin) and records the testing strategy: logic that needs no DOM
     moves into DOM-free modules tested under node --test; the browser tier holds only what a
     browser alone can prove (each component's contract, events, rendering, and styling), a fixed
     set of cases run in every version and engine; no @playwright/test runner, screenshot diffing,
     or tracing without a recorded need; the raw pipe stays in measure as the no-package fallback.
     A CI job installs the same browsers with `playwright-core install --with-deps`.
  9. (rev) Results 5 records the revised pick, the check's timing on Headless Shell, and, as notes
     for the intake: revisit Firefox if it never catches what Chromium misses; WebKit is cheap to
     add in CI on an Ubuntu runner.


Amendment (escalation at slice 3): WebKit is excluded.

Playwright's WebKit r2370 is an ubuntu-24.04 build that won't launch on this Arch host (missing
libicu*.so.74, libxml2.so.2, libflite). The architect: exclude WebKit entirely rather than run it
in a container or install libraries on the host.

  2. (rev) Playwright runs on the system Chromium, Headless Shell 156, and Firefox 157; no
     WebKit rows.
  3. (rev) The unbundled rows run in Chromium and Firefox only. The Safari gap is a sourced
     fact (no Safari release ships CSS module scripts; WebKit landed them 2026-10-06), with the
     launch failure on a non-Ubuntu host recorded as a fact.
  4. (rev) Footprint covers playwright-core, Headless Shell, and Firefox; measure downloads no
     WebKit. The cross-engine coverage weighed is Chromium and Firefox against Chromium alone.


## Progress

- slice 1 committed (c12c783): eslint 10.13.0; check passes, currency prints nothing.
- slice 2 committed (02c63b0): raw Chromium pipe over Vite in measure (`scripts/browser-cases.js`, `browser-pipe.js`, `browser.test.js`); 6 rows pass, measure 127/127. Decisions in the commit message: Vite started from JS, verdict promise awaited after load, 1280x720 viewport, Chromium profile in /tmp. Measure hit EDQUOT on /tmp; rerun with TMPDIR outside /tmp.
- slice 3 committed (80a88fe): Playwright column (system Chromium, Headless Shell 156, Firefox 157 pass) and unbundled rows (Chromium, Firefox pass); measure 147/154, the 7 WebKit rows fail: Playwright WebKit r2370 won't launch on Arch (missing libicu*.so.74, libxml2.so.2, libflite). Escalation answered: WebKit excluded (amendment). Fixes owed: leftover WebKit profile dirs in TMPDIR; both drivers emulate the light scheme.
- slice 4 committed (9a9f0fd): WebKit out, light scheme in both drivers, overhead rows; measure 2026-10-18T18:43:26Z 156/156. Review stop answered: Playwright on the system Chromium and Firefox.
- slice 5 committed (9a1d80a): browser tier in the check (Playwright on system Chromium and Firefox over Vite, node --test only, ~6 s of a ~17 s check); a broken case fails it; measure 2026-10-18T19:09:47Z 156/156. 
- slice 6 committed (e3d9958): demo trimmed to the 20 frozen pagination pages (esbuild, bun, tsc, src). 
- slice 7 committed (93da1e6): build:tsc's demo emit dropped; Results 5, STANDARDS.md Tests and dependency rules, the html-artifacts.md pending edit; measure 2026-10-18T19:20:43Z 156/156. 
- standards review committed (9b90c44); its follow-ups committed (997a494): exactly 27 cases, opaque restyle baseline, the pipe's missing-Chromium error; evidence re-cited to measure 2026-10-18T19:38:34Z 156/156. Next: spec review.
- redirect 2 committed (8f485da, 4bb25b9): the check drives the pinned CfT chrome-headless-shell 155.0.8059.84 (mise http:) over the raw pipe, with a version guard; playwright-core back in measure's scratch; STANDARDS.md, Results 5, the pending edit; check ~12 s (browser tier 0.89 s); measure 2026-10-18T20:47:44Z 156/156. Next: set `task.run_auto_install = false` (below), verify the three unread source URLs in Results 5 (Playwright system requirements, the Puppeteer AppArmor anchor, runner-images #11489), then standards review, spec review, editor, brief.

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
- components (superseded by testing): a shared probe in `mise run demo` (outside the check, Chromium --dump-dom, no driver) passes only when every version reports the same text, events, and contract cases; the check's browser tier stays with testing.
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
- components (superseded by testing): escalation: the demo loads the components from tsc's emit natively in Chromium, not through esbuild IIFE pages or an esbuild plugin; build:tsc copies each .css beside its .js, and spike-html-packages is handed the release consequence.
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
- components (superseded by testing): each demo page holds its own load event with a hidden iframe whose document stays open until the run returns or its module script fails to load, with a 60 s timeout behind it, because `--dump-dom` raced the run's dynamic imports and `--virtual-time-budget` missed the verdict in about one dump in three.
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
- testing (superseded by the review stop): the browser tier runs on the system Chromium unless the comparison earns more.
- testing: Playwright is measured against the raw Chromium debugging pipe (architect: "evaluate the overhead of Playwright against raw Chromium").
- testing: the driver is chosen from a measured comparison in `mise run measure`, argued in the toolchain order.
- testing: the 27-case composition probe and the 4 restyle checks move into the check, and the demo drops their pages; the 20 frozen pagination pages (12 esbuild and bun, 4 tsc emit, 4 src forms) stay in `mise run demo`, where planning counted 16, the bundled ones only. The preview is unchanged.
- testing: the unit tier is DOM-free code under node --test with no DOM shim; anything touching the DOM is the browser tier. Rejected: happy-dom or jsdom, which load no CSS module script and compute no layout or style.
- testing: Web Test Runner and Vitest browser mode are sourced facts, not measured columns (Vitest's browser mode drives Playwright; Web Test Runner brings mocha and an esbuild plugin).
- testing: Playwright is measured as the playwright-core library called from node:test; @playwright/test is a sourced footprint row.
- testing: measure runs Playwright on the system Chromium through executablePath and on its bundled Headless Shell 156.
- testing: measure runs the cases on Playwright's Firefox too, as the measured answer to coverage. (WebKit beside it: superseded by the slice 3 escalation.)
- testing: Playwright's overhead is footprint, download bytes and time, pins added, harness lines, cold and warm timings, and a 20-run repeat row, weighed against cross-engine coverage over Chromium alone (architect).
- testing: a review stop after the measure slices: the architect picks the check's driver and engines from the drafted Results 5; the default is the raw pipe on the system Chromium alone.
- testing: the browser tier runs under node --test only, never bun test.
- testing: the browser tier serves the components through Vite's dev server with the local CSS plugin, not file:// (architect: "so that we aren't limited by the restrictions of file-based rendering"). Rejected: tsc emit from file://, which needs a file-access flag, an import map into pnpm's store, a copied .css per module, and hides stylesheet rules.
- testing: measure keeps one unbundled row per engine (tsc emit with native CSS module scripts over plain http), so the form the library ships stays measured. (The WebKit row, which would have recorded the Safari gap by its expected failure, and its "fails" mode: superseded by the slice 3 escalation.)
- testing: the check spawns the mise-pinned vite binary with a scratch config, as `mise run preview` does. Rejected: vite as a devDependency, which breaks the devDependency rule and duplicates the pin.
- testing: measure downloads Playwright's browsers into each run's scratch (PLAYWRIGHT_BROWSERS_PATH), never ~/.cache/ms-playwright; the download is part of the overhead.
- testing: escalation at slice 3 (architect): WebKit is excluded entirely; "setting up a container image just to test WebKit feels like overkill". Rejected: Playwright's v1.64.1 Docker image for WebKit; host libraries (libxml2-legacy, flite, icu74 from the AUR). The Safari gap is a sourced fact.
- testing: both drivers emulate the light color scheme, so their reports render the same; the raw pipe took the system's dark scheme, Playwright defaults to light.
- testing: each measure browser run takes its own TMPDIR inside scratch, removed after, so no Playwright profile or artifact is left behind. The system Chromium takes a short TMPDIR of its own under /tmp in both drivers, removed when it closes, because a scratch-length TMPDIR overflows its singleton socket path (SIGABRT).
- testing: engines differ by rounding in one report line (input font size 14.2224px in Chromium, 14.2188px in Firefox); no row compares across engines, and Results 5 records it as a fact.
- testing: the system Chromium moved from 152.0.7977.82 to 154.0.8037.97 between slices 3 and 4 (a host update); the evidence cites the run's version.
- testing: review stop (architect): the check's browser tier runs Playwright (playwright-core 1.64.1, a devDependency) on the system Chromium and on Playwright's Firefox 157. Argued in the toolchain order: the standard browser driver and less than half the harness code come first; a second engine for its footprint comes second; 1.5x slower, no order-of-magnitude gap. Rejected: the raw pipe on the system Chromium alone (the default), and Playwright on Chromium alone. STANDARDS.md's devDependency rule and browser exception are revised. (Its figures from m 2026-10-18T18:43:26Z, 57 harness lines against 131 and 13.7 MB plus Firefox's 324.5 MB: superseded by the evidence run below.)
- testing: review stop (architect): `mise run install` downloads Firefox into a repo-specific PLAYWRIGHT_BROWSERS_PATH outside the tree, `~/.cache/spike-html-conventions/playwright`, so the check stays offline. Rejected: the shared `~/.cache/ms-playwright`, which holds another project's browsers.
- testing: PLAYWRIGHT_BROWSERS_PATH is set once in mise.toml's `[env]`; measure exports its own scratch path over it. The browser test stays in `scripts/`, so `bun test ./test/` never runs it.
- testing: the evidence cites m 2026-10-18T19:38:34Z (156/156): 63 Playwright harness lines against the raw pipe's 136, and 13.5 MB for playwright-core. The review stop read 57, 131, and 13.7 MB: since then both drivers check for their browser's executable, and measure reads playwright-core from the repository's install instead of a scratch npm install. The argument is unchanged.
- testing: standards review follow-ups: the browser tier and measure pass only on exactly 27 cases (one count, `probeCases` in `scripts/browser-cases.js`); restyle requires an opaque baseline colour, so unloaded tokens fail it; the raw pipe fails by name when the system Chromium is missing.
- testing: redirect at BRIEF (architect): the check runs Playwright's Chromium Headless Shell and Firefox, both fixed by playwright-core's pin, so it runs the same locally and in CI; the system Chromium leaves the check and stays in measure. Rejected: the system Chromium in the check (unpinned: 152 to 154 during BUILD; absent on CI runners).
- testing: redirect at BRIEF (architect): STANDARDS.md records the strategy: DOM-free logic in node --test modules, the browser tier narrow (contract, events, rendering, styling), no @playwright/test, screenshot diffing, or tracing without a recorded need, the raw pipe as the no-package fallback; revisit Firefox with evidence, WebKit in CI later.
- testing (superseded by redirect 2): redirect 1's pick of Playwright's own Chromium and Firefox in the check.
- testing: redirect 2 (architect, round 4): the check drives Chromium over the raw CDP pipe, no package. Rejected: puppeteer-core 25.14.0 (Firefox over BiDi, a package with five dependencies); Playwright (Linux support only for Ubuntu and Debian).
- testing: round 4: the check's Chromium is Chrome for Testing's chrome-headless-shell pinned at Stable 155.0.8059.84 everywhere. Rejected: the system Chromium locally with a separate CI install (unpinned: 152 to 154 during BUILD; the runner's snapshot changes per image).
- testing: round 4: the pin is a mise http: tool (URL, sha256, size we record; CfT publishes no checksums, so each bump takes a fresh sha256 by hand); currency's mise scan reports new Stables. Rejected: @puppeteer/browsers at install.
- testing: round 4: the check launches Chromium with --no-sandbox everywhere (the repository's own pages on loopback, every other host refused), since Ubuntu 23.10+ AppArmor blocks a downloaded Chrome's sandbox. Rejected: lifting the AppArmor restriction in CI.
- testing: round 4: Playwright stays in measure as the comparison column, playwright-core back in measure's scratch; it leaves package.json, and the devDependency rule reverts to lint tooling only.
- testing: round 4: the stopped redirect-1 slice is discarded, and the repository's 588 MB Playwright cache outside the tree removed.
- testing: measure's raw-pipe rows and Playwright's like-for-like row run on the pinned headless shell, so the comparison measures the check's own browser; the demo's frozen --dump-dom pages stay on the system Chromium (outside the task).
- testing: the check guards the pin's version (`--version` must end in the pinned version), because mise's download cache, keyed by checksum, installed the cached 155 build under a lowered 154 pin without error.
- testing: the pin is linux-x64 only, as the brief names; another platform gets no URL until it needs one.
- testing: mise.toml sets `task.run_auto_install = false`, so `mise run check` never installs a missing tool from the network and fails by name instead; `mise run install` is the step that downloads.

## Pending edits

- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the toolchain task's interim results, pending the intake's decision. The hypothesis's split by role (Node + pnpm for packages, Bun for bundling) is ruled out. Across Node + npm, Node + pnpm, and Bun, argued industry standard and maintainability first, footprint second, and speed only on an order-of-magnitude gap, the runtime is Node, settled, and the manager is pnpm provisionally. If spike-html-packages releases the layers through a registry, the choice between npm and pnpm reopens: spike-html-packages weighs npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps, with its hosting and repository-layout decisions. Every layer is written in `.ts` and released through a build that ships `.js` and `.d.ts`. tsc emit builds libraries and Vite builds apps; esbuild doesn't earn its place.
- coordinator · roadmap, spike-html-packages: decide the hosting and repository layout, on which spike-html-conventions' manager pick depends (a repository release keeps pnpm; a registry release reopens the choice between npm and pnpm, which this task weighs with those decisions: npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps), weighing registry-based options (npm registry publish, release-asset tarballs installed by URL, plain URL imports through an import map) and spike-html-conventions' evidence (Results 1, 2, and 7, and the Ecosystem survey's Release hosting). Prefixed tags: pnpm installs a subdirectory with `#fixture/v0.1.0&path:/fixture`; bun can't resolve the spec; npm ignores `&path:` as an unknown key, and its own `::path:` resolves the tag to its commit, then fails with ENOENT on the clone's package.json. Git-tag dependencies: npm 12 defaults to allow-git=none and refuses any; allow-git=root admits a consumer's own but refuses a git-tag package's own git-tag dependency, which allow-git=all installs; pnpm 12's `blockExoticSubdeps` default refuses only that nested one; bun has no guard. A git dependency's `prepare`: npm runs it at pack time while warning that it was blocked, and only `--ignore-scripts` skips it; pnpm refuses the install until `allowBuilds` names the resolved spec with its commit; bun installs without running it and reports it until `trustedDependencies` names it. The release build: each `.ts` module ships as an unbundled, unminified `.js` ES module with its `.d.ts` (`tsc -p tsconfig.build.json` emits that); the built files sit in the tag or a release asset; `exports` points at the built `.js` with its types; `files` names the built output (bun ignores `files`). Hosting facts: jsDelivr `/gh/` caches an exact tag for good, serves `.ts` as `text/plain` with `nosniff`, and returns 404 for `/+esm`; GitHub Packages needs a token for every install, public packages included, and takes only scoped packages; JSR emits JS and `.d.ts` from `.ts` and installs natively in pnpm 10.9+ and Yarn 4.9+, while npm needs `.npmrc` setup and Bun's support isn't documented; Verdaccio is a server you run; all 13 surveyed web-component libraries publish to the npm registry, which stays ruled out unless no workable alternative exists, so a registry release means GitHub Packages, JSR, or a self-hosted registry. npm's monorepo gaps: workspace runs follow the `workspaces` array's order, not the dependency graph (npm/rfcs#707); npm has no `workspace:` protocol (npm/cli#8845) and no catalogs (npm/rfcs#872); five linked-layout bugs are open, two on workspaces (npm/cli#10082, #9982). npm's linked install strategy (`--install-strategy=linked`) refuses phantom dependencies, the strictest layout measured, but it is opt-in, stable only since 11.18.0 and 12.0.0, and still copies each package into a per-project `node_modules/.store`.
- coordinator · roadmap, spike-html-apps: the real router fixes two herald quirks this spike's port kept (a second `?` in the query is dropped; a `#fragment` reaches the route path) and strips the base path only at a segment boundary.
- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the structure task's interim results, pending the intake's decision. The layers are directories of `layers/` in one package: the foundation (native only, no package), components (the element tier) and the application SDK as siblings on the foundation, a static branch that may import the foundation, components, and Lit, and an application branch that may import all three plus the SDK; no app imports another. eslint-plugin-boundaries' `dependencies` rule, over the layer table in `eslint.config.js` with import-x's `no-unresolved` beside it, enforces that direction in the check by the file each import resolves to, so relative specifiers need no normalization convention. The lint and format setup is ESLint + Prettier, provisionally, argued industry standard and maintainability first: the standard by a wide margin, the better-stewarded tools, and a direction rule by resolved file outweigh Biome's smaller surface (one binary and one config file against nine pins and four config files); ESLint Stylistic can't restore a disturbed tree, and oxlint + oxfmt isn't the standard and judges direction by text. Footprint and speed don't overturn it. The pick reopens if spike-html-packages makes the layers packages, or if ESLint's or Prettier's foundation or funding changes.
- coordinator · roadmap, spike-html-packages: decide whether the layers become packages, and the import extension the releases use (this spike's occupants import `.js` paths, which bundler resolution maps to `.ts`). The package-boundary facts (spike-html-conventions' Results 3): pnpm refuses an import of an undeclared package by default, and a lint rule can refuse one too (import-x's `no-extraneous-dependencies`, not measured), so as packages each layer's declared dependencies would enforce the direction at install as well as in the lint. Making the layers packages reopens the provisional ESLint + Prettier pick (Results 6): the direction plugin's role shrinks to the files inside a package, so direction weighs less against Biome's smaller surface. The lint tooling is the root package's devDependencies, under STANDARDS.md's rule "Lit is the only runtime dependency; lint tooling is the only devDependencies".
- coordinator · roadmap, spike-html-apps: four of herald's element files in `app/client/ui/elements` import from `@domains` (herald 6fc22b3): `classify-progress.ts` the `WORKFLOW_STAGES` constant and the `WorkflowStage` type, `document-card.ts` the `WorkflowStage` and `Document` types, `prompt-card.ts` the `Prompt` type, and `blob-viewer.ts` the `findFormat` lookup. Under spike-html-conventions' layout a component may not import domain code: the types become the element's own properties, and the constant and lookup move up to the app or down into the element.
- coordinator · roadmap, this spike's `branches` task: add the app-internal tiers (modules and views) and whether static pages use Lit, both handed on by Results 3; STANDARDS.md records the second as undecided.
- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the components task's interim result, pending the intake's decision. Components are Lit with a shadow root by default, the architect's judgement after reading all 8 final versions (two elements, a pagination container on go-web-sdk's Page envelope and the entry it holds, each in Lit and vanilla, shadow and light DOM): light DOM's hand-placed composition (MutationObserver placement in place of slots, a cascade layer ordered by adoption, page styles leaking in) costs more than it gives, though it lets the page's baseline style the controls directly. Vanilla matches Lit's observable contract only by hand-writing attributes, conversion, reflection, accessors and pre-upgrade properties, and forgoes batched and binding-level updates. No build removes Lit's runtime (5,031 B brotli in production, shared by every Lit element on a page); Svelte, Stencil and solid-element each ship their own runtime. A shadow root can't see the page's baseline: its element selectors stop at the boundary and only tokens cross, and no shipped mechanism lets a shadow root inherit page styles (csswg-drafts#10176 and whatwg/html#11687 are open). So a shadow-root component adopts the foundation's reset and elements sheets by reference, then a layout-only sheet of its own, and no component styles a control's look. The foundation holds a port of spike-html-design v0.7.0 (its tokens with the Flexoki, regular, and mono profiles, reset, and elements) as `.css` files that each wrap their rules in a `@layer foundation.<layer>` block and import nothing, because neither a constructed sheet nor a CSS module script loads `@import`; a page entry states the layer order and imports them, and every page links it, so a shadow page loads the reset and elements layers twice, linked and adopted. A component's CSS lives in its own `.css` file, imported as a standard CSS module script and never written in `.ts`. CSS module scripts run in Chrome/Edge 123+ and Firefox 147+, with no Safari release yet (WebKit landed it 2026-10-06), and are not Baseline. Apps build through Vite with a ~30-line local plugin, so their production pages don't depend on Safari; a page that loads the modules unbundled fails there until a Safari release ships the form. Native CSS doesn't reopen the toolchain pick: Bun loads the form as `{}`, and herald's native CSS was a bundler plugin.
- coordinator · roadmap, spike-html-packages: a release of the components ships each component's `.css` beside its emitted `.js`, and the foundation's sheets beside its own (the port in `layers/foundation/baseline/`, which the shadow components import as CSS module scripts, and the page entry `layers/foundation/baseline.css`, which pages link), with `exports` and `files` naming the `.css` files too, because tsc's emit copies no `.css` (spike-html-conventions' measure copies every `.css` in `layers/` beside tsc's emit by hand, in `scripts/browser-cases.js`). A CSS module script (`with { type: "css" }`) loads only when the file is served as `text/css`; jsDelivr serves `.css` as `text/css`. Consumers that load the modules unbundled in Safari fail until a Safari release ships WebKit's CSS module scripts (bug 227967, landed 2026-10-06, 322887@main). Bundled consumers go through Vite with a local plugin (spike-html-conventions' `scripts/css-sheets.js`). Neither Node 26 (`ERR_UNKNOWN_FILE_EXTENSION`) nor Bun 1.4.3 (`{}`) loads the form, so a test run outside a browser needs the same treatment. Source: spike-html-conventions Results 4.
- coordinator · roadmap, the web client intake (finding for spike-html-design): ship each layer (tokens with each facet and profile, reset, elements) as a self-layered, `@import`-free, exported sheet: each file wraps its rules in its own `@layer spike-html-design.<layer>` block, imports nothing, and is named in package.json's `exports`, so a component's shadow root can adopt the reset and elements layers by reference as CSS module scripts (`with { type: "css" }`); the one entry may keep the layer order statement and plain `@import`s for pages. Today's entry builds the layers with `@import ... layer()`, which neither a constructed sheet (`replace`/`replaceSync` drop `@import`, WPT css/cssom/CSSStyleSheet-constructable-disallow-import) nor a CSS module script loads, and no layer file is exported, so spike-html-conventions ported v0.7.0 (fe75220) into `layers/foundation/baseline/` as `foundation.*` layers with provenance headers: the interim and the reference for the shape (its shadow components adopt `[reset, elements]` before a layout-only sheet; no component styles a control's look). Also: the theme-menu builds its constructed sheet from a string (`modules/theme-menu.js:46-47` at v0.7.0), against the convention of CSS in `.css` files imported as CSS module scripts. Same support caveats: no Safari release ships CSS module scripts (WebKit landed them 2026-10-06); bundlers need a plugin. Source: spike-html-conventions Results 4.
- coordinator · roadmap, spike-html-apps: herald's pagination takes `total_pages` (`pkg/pagination` `PageResult`, the element's `total-pages` attribute, 6fc22b3); go-web-sdk's Page envelope carries `items`, `page`, `size`, `total`, `more`, `next` and omits `page` and `total` under a cursor (`total` also when the read didn't count). spike-html-conventions' pagination derives the page count from total and size, follows `more` for Next when total is absent, disables the page input when page is absent, and sends `page-change {page: null}` on cursor Next so the host follows `next`. The real app wires these fields and treats a null page as a cursor follow.
- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the testing task's interim result, pending the intake's decision. The check has two tiers. The unit tier is DOM-free code under node --test, with no DOM shim, since happy-dom and jsdom load no CSS module script and compute no layout or style; logic that needs no DOM moves into DOM-free modules. Anything that touches the DOM is the browser tier, which serves the components through Vite's dev server with the ~30-line local CSS plugin, not from `file://` (which needs a file-access flag, an import map into the package store, a copied `.css` per module, and hides stylesheet rules), and runs the components' 27 contract cases in each of four versions and 4 restyle checks under node --test. Its driver is the raw Chromium DevTools pipe, no package, on Chrome for Testing's chrome-headless-shell 155.0.8059.84, pinned in `mise.toml` through mise's `http:` backend with a sha256 and size taken by hand (Chrome for Testing publishes no checksums, chrome-for-testing#70), launched with `--no-sandbox` (Ubuntu 23.10+ AppArmor refuses a downloaded Chrome's sandbox; the browser loads only the repository's own pages on loopback); Chromium alone, 0.9 s of a 12 s check. The architect first picked Playwright (playwright-core) on the system Chromium and Firefox, then Playwright's own browsers so CI would match, and finally the pin: Microsoft supports Playwright on Linux only on Ubuntu and Debian, Google names Ubuntu, Debian, openSUSE, and Fedora for Chrome, but the headless shell is one generic linux64 zip that runs on Arch and on CI's runners, whose own browsers (ubuntu-24.04 image 20261012: Chrome 155.0.8059.39, a Chromium 155.0.8059.0 snapshot, Firefox 157) no repository pins; Playwright's Chromium is itself a Chrome for Testing build. A CI job runs the same `mise install`. Playwright stays the measured comparison: on the pin it is 1.25 times the raw pipe cold and 1.26 warm, 59 harness lines against 143, 13.7 MB, 0 failures in 20 runs each. Firefox and WebKit are gaps: Firefox removed CDP in 141, so keeping it means WebDriver BiDi through a package (puppeteer-core), rejected; Playwright's WebKit r2370 is an Ubuntu 24.04 build that doesn't launch on a non-Ubuntu host, and no Safari release ships CSS module scripts (WebKit landed them 2026-10-06), so a page loading the components unbundled fails in Safari until a release ships them. @playwright/test, Web Test Runner, and Vitest's browser mode are sourced facts, not measured. Source: spike-html-conventions Results 5 (m 2026-10-18T20:47:44Z).
