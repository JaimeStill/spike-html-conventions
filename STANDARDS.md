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

- The toolchain is Node with pnpm, never Bun beside it: tsc emit builds libraries and Vite builds
  apps. The Bun column and the esbuild pin are the comparison's evidence only; nothing shipped
  depends on a Bun-only API.
- Every tool comes from a pin in `mise.toml`. The system Chromium is the one exception, by the
  architect's decision; `mise run measure` records its version.
- Lit is the only package dependency, and no package manifest has a devDependency.
- Anything that reads the network runs in `measure`, `currency`, or `install`, never in the check.

## Code

- Every layer is written in `.ts`, erasable syntax only, and released through a build that ships
  `.js` and `.d.ts`; a release never asks a consumer to load `.ts`. The JSDoc and plain JS forms in
  `src/` are the comparison's evidence only, never the convention for new code.
- Lit elements declare reactive properties with `static properties`, never decorators.
- In the JSDoc form, an object typedef with quoted keys stays on one line: over several lines,
  tsc 7.0.2's declaration emit copies each line's leading `*` into the `.d.ts`, which then fails
  to parse.

## Evidence

- A check, demo, or measure row passes only when the value it reports is the expected one, not
  when the step merely runs.
- Each figure in the evidence cites the dated `mise run measure` run it comes from.
