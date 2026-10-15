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

## Task brief · toolchain

```
Problem       The native web stack has no toolchain, TypeScript form, or
              tested way to consume tagged releases. Every later task
              (structure, components, testing, branches) and
              spike-html-packages builds on these. Evidence 1, 2, and 7 come
              from this task.

Behaviors
  1. Tooling comes only from mise pins: node 26.12.0, pnpm 12.11.2,
     bun 1.4.3, biome 2.5.15, shellcheck 0.11.0, the native tsc 7.0.2
     (from microsoft/typescript-go's release archives, no Node needed),
     esbuild 0.28.2 (Node column only), and hyperfine 2.0.0 (aqua).
     Chromium is the system install. No package manifest has a
     devDependency; lit 3.3.3 is the only package dependency.
  2. The route matcher module (from herald's router) exists in three
     forms: .ts limited to strippable syntax, .js checked through JSDoc,
     and plain .js. One shared node:test suite gives the same results
     for all three forms under `node --test` and under `bun test`.
  3. The pagination element (from herald: page, total pages, and page
     size in; page-change and page-size-change events out; clamps its
     page input) exists in Lit with static properties (no decorators)
     and in vanilla, each in the same three forms, and each defines and
     renders the same element.
  4. The check runs `tsc --noEmit` (strict, strippable syntax only) over
     the .ts and JSDoc forms, and a wrongly typed property or argument
     in either typed form fails it. Plain .js and the test files are
     outside the type check.
  5. The repository root is the fixture package. It exports the module
     and both elements in all three forms and has no dependency on
     spike-html-design.
  6. There is one consumer fixture per toolchain, pnpm and bun. Each
     depends on spike-html-design v0.7.0 and on the fixture package by
     git tag. In the check, each installs offline (its git source
     pointed at the local repository, tag kept), and the installed
     files match the tag's files byte for byte.
  7. `mise run check` = biome ci + shellcheck + tsc --noEmit + the
     module tests under both runners + both offline fixture installs.
     It reads no network and writes nothing to the working tree.
  8. A read-only measure task, outside the check, reads the network and
     prints a dated table with every tool's version:
     a. hyperfine timings for each toolchain: install from a git tag
        (cold and warm), type check, build, watch rebuild, and test. The
        Node column times both tsc emit and an esbuild bundle; the Bun
        column times `bun build`.
     b. Install from GitHub by tag: spike-html-design v0.7.0 and the
        fixture package v0.1.0, under pnpm and under bun.
     c. jsDelivr serves each form of the fixture package at v0.1.0:
        content type, immutable caching, and bytes equal to the tag's.
        The .ts form is recorded as unloadable (text/plain with
        nosniff).
     d. Refusal rows: Node won't strip types under node_modules; pnpm
        refuses a package that carries a git-tag dependency
        (ERR_PNPM_EXOTIC_SUBDEP) while bun accepts it.
     e. Prefixed-tag rows from a local, unpushed tag: pnpm installs a
        subdirectory with path:, bun can't.
     f. file:// pages loaded with `chromium --headless --dump-dom` load
        spike-html-design v0.7.0 and the fixture package's JS forms from
        jsDelivr, with Lit through an import map, and the element is
        defined and rendered.
  9. `mise run currency`, declared as the project's currency command,
     prints one line per item that trails: a mise tool, a direct package
     dependency, or a github: tag dependency compared with its
     repository's latest tag. It exits 0 with no output when everything
     is current, and nonzero with lines when something trails. It writes
     nothing.
 10. The spike README's evidence records:
     1: the pick, Node with pnpm or Bun, never both, argued footprint
        first, then whether each added tool is the standard for its
        purpose and worth keeping long term; speed counts only on an
        order-of-magnitude gap. Includes whether esbuild earns its place
        in the Node column, weighing its per-platform binary shape
        (shared with tsc through npm) and offline installs.
     2: the TypeScript-form conclusion, showing what each form looks
        like in Lit and in vanilla, with Turbo's and Svelte's positions
        weighed.
     7: the consumption results, with the fixture's v0.1.0 rows marked
        pending until the structure task runs them after the release.
     Each figure is cited with its date from the measure task.

Test seams    `mise run check` (offline: behaviors 2–7);
              `mise run measure` (network: behavior 8)

Slices
  1. Module and type check: tsc and the route matcher in three forms,
     with the shared suite under both runners and tsc in the check.
     Demo: the check passes; a planted type error fails it.
  2. Element: pagination in Lit and vanilla, three forms each,
     type-checked, built by tsc emit, esbuild, and bun build.
     Demo: each build renders in `chromium --dump-dom`.
  3. Fixture package and consumers: the root package's exports, and the
     pnpm and bun consumer fixtures installing offline in the check.
     Demo: the check passes with both installs.
  4. Measure task: the timings and every row that needs no pushed tag
     (spike-html-design v0.7.0, refusals, local prefixed tag, file://).
     Demo: `mise run measure` prints the dated table.
  5. Currency: the command, including the github: tag comparison.
     Demo: `mise run currency` exits 0, and a pin set behind its latest
     is reported.
  6. Pushed-tag rows: GitHub install by tag and jsDelivr serving,
     measured against spike-html-design v0.7.0 under both toolchains;
     the fixture v0.1.0 rows (8b, 8c) are in the measure task, ready to
     run once SHIP releases the tag.
     Demo: `mise run measure` shows every v0.7.0 row passing, and the
     v0.1.0 rows report "not yet released".
  7. Evidence: README evidence 1, 2, and 7 with the pick, the esbuild
     conclusion, and the TypeScript-form conclusion.
     Demo: the README's evidence, with each figure cited from a dated
     measure run.

Out of scope  The layout, import direction, and lint/format tool
              (structure). Vanilla against Lit on lines, brotli bytes,
              and features (components; this task holds each base fixed
              and compares only forms). The browser test tier and typed
              tests (testing). Decorators. A dev server. Release builds,
              per-package tags, tag naming, and package splitting
              (spike-html-packages, which also gets the prefixed-tag and
              exotic-subdependency rows). Release options beyond git tags
              (publishing to the npm registry, release-asset tarballs
              installed by URL, plain URL imports through an import map)
              are spike-html-packages' question. The application SDK
              spec (branches).
Door          two-way, except the v0.1.0 tag: a pushed tag reaches
              GitHub and jsDelivr consumers, jsDelivr caches it as
              immutable, and it is never changed or re-cut.
Release       v0.1.0
```

## Progress

slices 1/7 committed · standards — · spec — · editor —

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

## Pending edits

- coordinator · `context/html-artifacts.md`, "Experiment: spike-html-conventions": the toolchain hypothesis's split by role (Node + pnpm for packages, Bun for bundling) is ruled out; the pick is Node or Bun, never both.
- coordinator · roadmap, spike-html-packages: weigh registry-based release options (npm registry publish, release-asset tarballs installed by URL, plain URL imports through an import map), this spike's prefixed-tag rows (pnpm installs a subdirectory at a tag with `&path:`, bun can't), and pnpm 12's `blockExoticSubdeps` default.
- coordinator · roadmap, this spike's `structure` task: its first step runs and records the fixture package's v0.1.0 GitHub and jsDelivr rows.
