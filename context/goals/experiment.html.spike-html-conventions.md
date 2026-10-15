# goal · experiment.html.spike-html-conventions

- **State:** idle
- **Task:** none
- **Branch:** none

## Tasks

1. [ ] toolchain
2. [ ] structure
3. [ ] components
4. [ ] testing
5. [ ] branches

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

## Pending edits

(none)
