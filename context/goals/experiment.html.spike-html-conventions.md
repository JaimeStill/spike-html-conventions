# goal · experiment.html.spike-html-conventions

- **State:** building
- **Task:** structure
- **Branch:** structure

## Tasks

1. [x] toolchain
2. [ ] structure
3. [ ] components
4. [ ] testing
5. [ ] branches

## Task brief · structure

```
Problem       The native web stack has a toolchain but no layout: nothing
              says where foundation, component, SDK, and app code live, or
              which way imports may run between them, and nothing fails
              when an import runs upward (herald's elements import domain
              code, unenforced). The lint/format tool, Biome, entered the
              check by default and was never compared against the industry
              standard. Components, branches, and spike-html-packages build
              on this layout. Evidence 3 and 6, plus the fixture's v0.1.0
              rows deferred from toolchain (evidence 7).

Behaviors
  1. `mise run measure` records the fixture package's own v0.1.0 rows:
     its GitHub install under npm, pnpm, and bun; jsDelivr serving each
     of its nine source files (the three .ts files as unloadable); and
     the file:// page loading each JS form of the element from jsDelivr
     at v0.1.0. Each row passes only on its expected value. README
     Results 7 records them, dated, and its Pending line is gone.
  2. README Results 1 records the pnpm pin as following what mise
     resolves natively (12.11.2, aqua:pnpm/pnpm) and why, with the npm
     registry's latest dist-tag (12.14.0) as a fact. Pin and currency
     unchanged.
  3. A stack-layer tree, apart from the frozen per-form tree, holds a
     small .ts occupant per layer that type-checks: foundation (native
     only), components (element tier), the application SDK, one
     static-branch app, and at least two application-branch apps — just
     enough to show each layer's allowed imports.
  4. The check enforces the direction with the lint tool's
     restricted-imports rule, per layer directory:
       foundation    → no other layer, no Lit
       components    → foundation, Lit; never SDK or any app
       SDK           → foundation (and Lit); never components or any app
       static app    → foundation, Lit, components; never SDK, an
                       application-branch app, or another app
       application   → foundation, components, SDK, Lit; never another app
     The rules cover static imports, `export … from`, type-only imports,
     and dynamic `import()`, under relative paths, any alias, and the
     package's own name.
  5. A test runs the lint tool against a scratch tree outside the working
     tree, with one violating import per rule; it passes only when each
     violation draws that rule's own diagnostic. The real tree passes.
  6. `mise run measure` compares Biome, ESLint + Prettier
     (typescript-eslint), and oxlint + oxfmt on the same tree, each from
     a mise npm: pin used only by measure (no devDependency, nothing in
     the check). Rows per setup: footprint; lint and format-check time
     (hyperfine); configurability (reproduces this repo's formatter
     options — space indent, width 2, line width 100, and the defaults
     its output relies on — passing only on byte-identical code);
     content scope (file types its formatter touches by default here,
     Markdown included, and whether it can be limited to code); and
     direction (its restricted-imports rule fails the item 5 tree on
     every rule). Measure writes nothing to the working tree.
  7. The currency command covers the new pins and stays silent while
     they are at their latest.
  8. The README's survey gains a lint/format section, each claim cited:
     SoJS 2025 usage, the npm counts for the survey week, what the 13
     web-component libraries use, oxlint/oxfmt as facts.
  9. README Results 3 records the layout, the direction table, the
     mechanism and what it can't see (import text, not resolved files),
     dependency-cruiser and tsc project references as rejected with
     reasons, and hands spike-html-packages the package-boundary facts
     and herald's elements importing domain code.
 10. README Results 6 argues the lint/format pick in the toolchain
     order: industry standard and maintainability first (configurability
     and content scope count here), footprint second, speed only on an
     order-of-magnitude gap; each figure cites its dated measure run.
 11. STANDARDS.md gains the judgement calls the check can't enforce:
     what belongs in each layer, promotion of an element once a second
     app needs it, and the static branch's use of Lit as undecided. It
     doesn't restate the enforced rules.

Test seams    `mise run check`: layer tree lint and type check, the
              violation-tree test (3–5, 7). `mise run measure` (1, 6).
              The README's cited sources (2, 8–10).

Slices
  1. v0.1.0 rows: one measure run records the released rows in Results
     7; the pnpm pin's reason goes in Results 1.
     Demo: measure prints the v0.1.0 GitHub, jsDelivr, and file:// rows
     passing; Results 7 has no pending line.
  2. Layer tree and direction: occupants, per-layer restricted-imports
     rules in Biome, the violation-tree test, STANDARDS.md's layout calls.
     Demo: the check passes; an upward import fails it with the rule's
     diagnostic.
  3. Lint/format comparison: the three setups' pins and measure rows.
     Demo: measure prints all three setups' rows.
  4. Evidence: the survey section, then Results 3 and 6 argued from one
     fresh measure run.
     Demo: the survey section and Results 3 and 6.

Out of scope  App-internal tiers and whether static pages use Lit
              (branches). Import cycles and private-export visibility.
              Vanilla against Lit (components). Packages, release builds,
              and package boundaries (spike-html-packages). Moving or
              rewriting the per-form tree, its exports, or its rows.
              Linting CSS or Markdown beyond the content-scope rows.
              Changing the pnpm pin or currency's sources. Switching the
              check's lint tool: if Results 6 picks another setup, BUILD
              escalates first.
Door          two-way: no tag, nothing published.
```

## Progress

slices 4/4 committed · standards — · spec — · editor —

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
- structure: the lint/format comparison is three-way, Biome against ESLint + Prettier (typescript-eslint) against oxlint + oxfmt, measured on the same tree from mise npm: pins used only by measure, argued in the toolchain order.
- structure: the comparison adds configurability (reproducing this repo's formatter options, byte-identical) and content scope (file types each formatter touches by default, Markdown included, and whether it can be limited to code); the architect finds Prettier inflexible and heavy-handed on content, Markdown included, but open to its result.
- structure: import direction is enforced by the lint tool's restricted-imports rule per layer directory, listing aliases and the package's own name; rejected: dependency-cruiser (an extra pin) and tsc project references (`tsc -b` writes files even on failure).
- structure: the layers are directories in one package; packaging stays with spike-html-packages, which gets the package-boundary facts.
- structure: the toolchain's per-form tree stays frozen as evidence; the layers get their own tree.
- structure: the application SDK is a sibling of components: both import only the foundation (the SDK may import Lit); applications import both.
- structure: the static branch may import the foundation, Lit, and components; never the SDK, an application-branch app, or another app. The branches task decides whether static pages use Lit.
- structure: an app's internal tiers are left to the branches task; this task covers the stack layers and the rule against importing from another app.
- structure: if Results 6 picks a lint tool other than Biome, BUILD escalates before the check switches.

## Pending edits

- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": record the toolchain task's interim results, pending the intake's decision. The hypothesis's split by role (Node + pnpm for packages, Bun for bundling) is ruled out. Across Node + npm, Node + pnpm, and Bun, argued industry standard and maintainability first, footprint second, and speed only on an order-of-magnitude gap, the runtime is Node, settled, and the manager is pnpm provisionally. If spike-html-packages releases the layers through a registry, the choice between npm and pnpm reopens: spike-html-packages weighs npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps, with its hosting and repository-layout decisions. Every layer is written in `.ts` and released through a build that ships `.js` and `.d.ts`. tsc emit builds libraries and Vite builds apps; esbuild doesn't earn its place.
- coordinator · roadmap, spike-html-packages: decide the hosting and repository layout, on which spike-html-conventions' manager pick depends (a repository release keeps pnpm; a registry release reopens the choice between npm and pnpm, which this task weighs with those decisions: npm's standard by use and stewardship against pnpm's multi-package practice and npm's monorepo gaps), weighing registry-based options (npm registry publish, release-asset tarballs installed by URL, plain URL imports through an import map) and spike-html-conventions' evidence (Results 1, 2, and 7, and the Ecosystem survey's Release hosting). Prefixed tags: pnpm installs a subdirectory with `#fixture/v0.1.0&path:/fixture`; bun can't resolve the spec; npm ignores `&path:` as an unknown key, and its own `::path:` resolves the tag to its commit, then fails with ENOENT on the clone's package.json. Git-tag dependencies: npm 12 defaults to allow-git=none and refuses any; allow-git=root admits a consumer's own but refuses a git-tag package's own git-tag dependency, which allow-git=all installs; pnpm 12's `blockExoticSubdeps` default refuses only that nested one; bun has no guard. A git dependency's `prepare`: npm runs it at pack time while warning that it was blocked, and only `--ignore-scripts` skips it; pnpm refuses the install until `allowBuilds` names the resolved spec with its commit; bun installs without running it and reports it until `trustedDependencies` names it. The release build: each `.ts` module ships as an unbundled, unminified `.js` ES module with its `.d.ts` (`tsc -p tsconfig.build.json` emits that); the built files sit in the tag or a release asset; `exports` points at the built `.js` with its types; `files` names the built output (bun ignores `files`). Hosting facts: jsDelivr `/gh/` caches an exact tag for good, serves `.ts` as `text/plain` with `nosniff`, and returns 404 for `/+esm`; GitHub Packages needs a token for every install, public packages included, and takes only scoped packages; JSR emits JS and `.d.ts` from `.ts` and installs natively in pnpm 10.9+ and Yarn 4.9+, while npm needs `.npmrc` setup and Bun's support isn't documented; Verdaccio is a server you run; all 13 surveyed web-component libraries publish to the npm registry, which stays ruled out unless no workable alternative exists, so a registry release means GitHub Packages, JSR, or a self-hosted registry. npm's monorepo gaps: workspace runs follow the `workspaces` array's order, not the dependency graph (npm/rfcs#707); npm has no `workspace:` protocol (npm/cli#8845) and no catalogs (npm/rfcs#872); five linked-layout bugs are open, two on workspaces (npm/cli#10082, #9982). npm's linked install strategy (`--install-strategy=linked`) refuses phantom dependencies, the strictest layout measured, but it is opt-in, stable only since 11.18.0 and 12.0.0, and still copies each package into a per-project `node_modules/.store`.
- coordinator · roadmap, this spike's `structure` task: its first step runs and records the fixture package's v0.1.0 GitHub and jsDelivr rows; its currency step decides whether the pnpm pin follows pnpm's GitHub-marked latest (12.11.2) or npm's `latest` dist-tag (12.14.0 on 2026-10-16).
- coordinator · roadmap, spike-html-apps: the real router fixes two herald quirks this spike's port kept (a second `?` in the query is dropped; a `#fragment` reaches the route path) and strips the base path only at a segment boundary.
