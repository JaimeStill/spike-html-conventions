# spike-html-conventions

A spike for the Standards Lab reference architecture. It settles the toolchain and code
conventions for the whole native web stack: Node with npm or pnpm against Bun, the TypeScript
form, the directory, module, and layer layout, the element-tier component convention, the test
tiers, and the layout specs for static pages and applications, with the application SDK's spec.
The repository is managed with the marathon workflow; start from `context/README.md`.

- **Standards:** `STANDARDS.md`, with pointers into the architecture repository.
- **Check:** `mise run check`: ESLint (`eslint.config.js`, which also enforces the import
  direction in `layers/`) and Prettier, run from the devDependencies by `pnpm exec`; shellcheck;
  `tsc --noEmit`; the tests in `test/`, the router suite and the layer test, under `node --test`
  and `bun test`; and the three consumer fixtures (pnpm, npm, and bun) installed offline, failing
  unless the npm that runs is the version `mise.toml` pins. Run `mise run install` once first.
- **Tasks:** `mise run install`, `build`, `demo`, `preview`, `measure` (the evidence's dated
  figures, including the four-way lint and format comparison; reads the network), and
  `currency`. Each task's description in `mise.toml` says what it does.
- **Goals:** this spike's tasks live in the coordinator's roadmap,
  `standards-lab/context/roadmap.toml`, under `experiment.html.spike-html-conventions`. Its goal
  record is `context/goals/experiment.html.spike-html-conventions.md`.
- **Dependencies:** Lit 3.3.3 is the only runtime dependency, and the check's lint tooling
  (ESLint, Prettier, and their plugins) is the only devDependencies, both pinned exactly in
  `package.json`. Every other tool is pinned in `mise.toml`, Biome, oxlint, and oxfmt for measure
  only.
- **References:** the repositories this spike reads are keys in the coordinator's
  `references.toml` and `references.local.toml`. The spike reads them and never writes to them.
