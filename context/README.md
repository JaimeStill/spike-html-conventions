# spike-html-conventions

spike-html-conventions settles the toolchain and code conventions for the whole native web
stack, as rigorous about web infrastructure as the Go standards are about Go: the platform
toolchain, the TypeScript form, code structure, module and directory organization, the
dependency direction between layers, testing, linting, and the layouts per app type, with
minimal external dependencies and a small maintenance and context surface per layer. Herald and
agent-lab showed the cost of not having them. Its answer is evidence for standards-lab's
experiment.html intake; the spike decides nothing itself.

The spike is the sub-goal `experiment.html.spike-html-conventions` in the coordinator's roadmap,
`standards-lab/context/roadmap.toml`, where its tasks live. Its question is framed in
`standards-lab/context/html-artifacts.md`, under "Experiment: spike-html-conventions".

## The question

Which toolchain and conventions should every layer of the native web stack (foundation,
components, and apps) be built on, over the spike-html-design v0.7.0 baseline?

## Hypotheses

- **Toolchain:** Node 26 LTS + pnpm for packages; Bun 1.4 only for bundling, the dev server, and
  CSS.
- **Components:** vanilla for the foundation and the static branch; Lit from components up.
- **Stack:** foundation (native only: the design system plus JS/TS modules; its tools split into
  utilities, structure/layout, and meta components/variants, with layouts folded into
  structure); components (the element tier: props and attributes in, events out, internal UI
  state allowed, no services, data fetching, or app state; an app's internal element is promoted
  once a second app needs it); apps (a static branch, and an application branch, standalone or
  embedded, whose modules and views stay inside the app).

## The evidence

1. Node 26 + pnpm against Bun 1.4, measured on git-tag install, TS, build, watch, test, lint,
   and jsDelivr, with a pick.
2. The three-way TS form comparison on the same element and module: `.ts` with type stripping,
   JS with JSDoc and a type check, and plain JS, with the spike's own conclusion. DHH/Turbo and
   Svelte/JSDoc are positions to weigh, not answers.
3. The directory, module, and layer layout and the import direction per stack layer, as
   STANDARDS.md judgement calls plus a check that enforces the direction.
4. One element-tier component, built in vanilla and in Lit, compared on lines, brotli bytes, and
   hand-built features.
5. Unit and browser test tiers inside the one check.
6. A lint/format tool in the check.
7. A fixture that consumes spike-html-design v0.7.0 by tag, both installed and from `file://`
   through jsDelivr. A fixture package released by this repository, installed by tag under each
   toolchain.
8. Layout specs for the static and application branches, plus the application SDK spec: the
   router, an API client, an auth hook, formatting, the domain-service pattern, the modules and
   views tiers, the build config, and a Go serving half proposed for go-web-sdk.
   spike-html-apps builds it.

## Capabilities

- **Toolchain:** the runtime and package manager, their install, build, watch, and test paths.
- **Language:** the TypeScript form and its type check.
- **Structure:** the directory and module layout, and the enforced import direction.
- **Components:** the element-tier convention, vanilla and Lit.
- **Testing:** the unit and browser tiers in the check.
- **Consumption:** installing and loading tagged releases, from git and jsDelivr.
- **Branches:** the static and application layouts and the application SDK spec.

## Path

The tasks, in the order they run; each cites the evidence it proves.

1. `toolchain`: the head-to-head comparison, the TS form, and the consumption fixtures
   (evidence 1, 2, 7).
2. `structure`: the layout, the import direction and its check, the lint/format tool
   (evidence 3, 6).
3. `components`: the element in vanilla and in Lit (evidence 4).
4. `testing`: the unit and browser tiers (evidence 5).
5. `branches`: the branch layouts, the SDK spec, and the answer (evidence 8).

## Releases

Minimal: one repo-wide annotated `vX.Y.Z` tag, cut only on a green check, with no gate. A tag is
never changed or re-cut. Per-package tags, release builds, and package splitting belong to
spike-html-packages.

## References

The spike reads these repositories and never writes to them. Each is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`:

- `spike-html-design`, at v0.7.0: the baseline the fixtures consume.
- `herald`: its app client (TS, Lit 3, bun build) and its elements.

## The answer

Pending: the `branches` task writes it.
