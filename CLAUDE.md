# spike-html-conventions

A spike for the Standards Lab reference architecture. It settles the toolchain and code
conventions for the whole native web stack: Node + pnpm against Bun, the TypeScript form, the
directory, module, and layer layout, the element-tier component convention, the test tiers, and
the layout specs for static pages and applications, with the application SDK's spec. The
repository is managed with the marathon workflow; start from `context/README.md`.

- **Standards:** `STANDARDS.md`, with pointers into the architecture repository.
- **Check:** `mise run check`: biome ci, shellcheck, `tsc --noEmit`, the shared suite in
  `test/` under `node --test` and `bun test`, and the pnpm, npm, and bun consumer fixtures
  installed offline. Run `mise run install` once first.
- **Tasks:** `mise run install` (Lit, and the managers' caches for the offline installs),
  `build`, `demo`, `measure` (the evidence's dated figures; reads the network), and `currency`.
  Each task's description in `mise.toml` says what it does.
- **Goals:** this spike's tasks live in the coordinator's roadmap,
  `standards-lab/context/roadmap.toml`, under `experiment.html.spike-html-conventions`. Its goal
  record is `context/goals/experiment.html.spike-html-conventions.md`.
- **Dependencies:** Lit 3.3.3 is the only package dependency; tools are pinned in `mise.toml`.
- **References:** the repositories this spike reads are keys in the coordinator's
  `references.toml` and `references.local.toml`. The spike reads them and never writes to them.
