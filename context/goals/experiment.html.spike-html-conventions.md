# goal · experiment.html.spike-html-conventions

- **State:** building
- **Task:** toolchain
- **Branch:** toolchain

## Tasks

1. [ ] toolchain
2. [ ] structure
3. [ ] components
4. [ ] testing
5. [ ] branches

## Task brief · toolchain (revised after the redirect)

```
Problem       The native web stack has no toolchain, TypeScript form, or
              tested way to consume tagged releases, and the first pick
              (Bun, on footprint) didn't weigh the industry standard or the
              readability of the source. Every later task and
              spike-html-packages builds on these. Evidence 1, 2, and 7.

Behaviors
  1. (rev) Tooling comes only from mise pins, as before, plus Vite 8 via
     mise's npm: backend for the Node column. Chromium is the system
     install. No devDependency; lit 3.3.3 is the only package dependency.
  2–7.  Unchanged (forms, element, type check, fixture package,
        consumers, offline check).
  8. (rev) The measure task also times Vite 8 in the Node column (build
     of the element entries, and its dev-server/watch rebuild where
     comparable), and adds Vite to the footprint section.
  9.  Unchanged (currency), covering the Vite pin.
 10. (rev) The spike README's evidence records:
     1: the pick, Node with pnpm or Bun, never both, argued in this
        order: industry standard and maintainability (readable,
        type-safe source; the survey's consensus) first, footprint
        second, speed only on an order-of-magnitude gap. Includes the
        build tool for the picked column (tsc emit, Vite, esbuild, or
        bun build) and whether esbuild earns its place.
     2: the TypeScript form: .ts with a release build, for the
        foundation and every layer above it, with the Lit and vanilla
        excerpts, JSDoc and plain JS recorded as considered and why
        they lost, and what a release build must produce for tag and
        jsDelivr consumers (handed to spike-html-packages).
     7: consumption results, with the fixture's v0.1.0 rows pending
        until the structure task runs them after the release.
     Each measured figure cites its measure date; each survey claim
     cites its source.
 11. (new) An ecosystem survey section in the README: how the web
     ecosystem builds, tests, and releases component libraries and
     apps — runtime and package manager, TS form, build tool, test
     runner, and release hosting (git tags + jsDelivr /gh/, GitHub
     release assets, GitHub Packages, JSR, self-hosted registries such
     as Verdaccio, npm) — judged on performance, maintainability, and
     scalability, from sourced evidence (surveys such as State of JS,
     download and adoption data, and what major web-component
     libraries use). Hosting is recorded as facts; the decision stays
     with spike-html-packages, npm ruled out unless no workable
     alternative exists.

Test seams    `mise run check` (offline: 2–7); `mise run measure`
              (network: 8); the README's cited sources (11)

Slices (1–7 committed)
  8. Vite in the Node column: the pin, its build and watch timings,
     and its footprint in `mise run measure`.
     Demo: measure prints the Vite rows.
  9. Ecosystem survey: the README section with sources.
     Demo: the section, each claim cited.
 10. Evidence rewrite: Results 1 and 2 re-argued under the new order
     and the .ts decision, figures re-cited from one fresh measure run;
     hypotheses and STANDARDS.md updated for .ts and the pick.
     Demo: the README's Results.

Out of scope  As before: layout and lint tool (structure); vanilla
              against Lit (components); browser test tier (testing);
              decorators; a dev server as a deliverable; release builds,
              per-package tags, tag naming, package splitting, and the
              hosting decision (spike-html-packages); the SDK spec
              (branches). Rewriting the committed forms: the JSDoc and
              plain JS forms stay as the comparison's evidence.
Door          two-way, except the v0.1.0 tag (pushed, immutable on
              jsDelivr, never re-cut).
Release       v0.1.0
Amendment (escalation, after slice 10): npm joins as a third column.
 11. npm in the measure task: cold and warm install from a git tag,
     `files` honoured, a subdirectory at a prefixed tag, a git-tag
     package's own git-tag dependency, GitHub install of
     spike-html-design v0.7.0, footprint (npm 12.2.1 pinned in mise); plus
     fixtures/consumer-npm installed offline in the check.
     Demo: the check passes with three consumers; measure prints npm rows.
 12. Evidence re-argued across Node + npm, Node + pnpm, and Bun, in the
     same order, figures re-cited from one fresh measure run.
     Demo: the README's Results.
```

## Progress

slices 11/12 committed · standards — · spec — · editor —

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
- toolchain: the pick argues footprint first, then whether each added tool is the standard for its purpose and worth keeping long term; speed decides only on an order-of-magnitude gap.
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
- toolchain: pnpm installs Lit for development (`mise run install`, frozen lockfile) until the pick is applied; moving to bun swaps the lockfile.
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

## Pending edits

- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": the toolchain hypothesis's split by role (Node + pnpm for packages, Bun for bundling) is ruled out; the pick is Node or Bun, never both. Record the spike's interim results, pending the intake's decision (rewritten by the toolchain task's redirect; the editor updates this line).
- coordinator · roadmap, spike-html-packages: weigh registry-based release options (npm registry publish, release-asset tarballs installed by URL, plain URL imports through an import map), this spike's prefixed-tag rows (pnpm installs a subdirectory at a tag with `&path:`, bun can't), and pnpm 12's `blockExoticSubdeps` default.
- coordinator · roadmap, this spike's `structure` task: its first step runs and records the fixture package's v0.1.0 GitHub and jsDelivr rows.
- coordinator · roadmap, spike-html-apps: the real router fixes two herald quirks this spike's port kept (a second `?` in the query is dropped; a `#fragment` reaches the route path) and strips the base path only at a segment boundary.
