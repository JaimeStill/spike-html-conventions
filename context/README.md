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
  CSS. The toolchain task ruled out the split by role: the pick is one toolchain, Node with pnpm
  or Bun, never both (Results, 1).
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

## Results

Every timing and row below is from one run of `mise run measure`, dated **2026-10-16T00:07:12Z
(UTC)**, cited as *(m 2026-10-16)*; it prints every tool's version, all as pinned in `mise.toml`.
File counts from the offline installs are from `mise run check` the same day. Line and byte
counts are of `src/` at this commit, and installed sizes of mise's installs, the same day.

Conflict of interest: this evidence was drafted by an Anthropic model, and Anthropic owns Bun.
The pick rests on the measured rows and the cited facts; weigh it with that in mind.

### 1. The toolchain: Bun

**Footprint.** The tools each column adds; tsc (the native 7.0.2 binary) and biome are shared.

| role | Node column | Bun column |
| --- | --- | --- |
| install from a git tag | pnpm | bun |
| TypeScript | tsc; node strips `.ts`, but not under node_modules | tsc; bun runs any `.ts` |
| build | tsc emit, or esbuild to bundle | bun build |
| watch | tsc --watch, or esbuild --watch | bun build --watch |
| test | node --test | bun test |
| lint/format | biome | biome |
| jsDelivr | nothing: a pushed tag | nothing: a pushed tag |
| tools added | node, pnpm (and esbuild to bundle) | bun |
| installed size, linux-x64 | 225 MB + 58 MB (+ 12 MB) | 85 MB |

**Timings** *(m 2026-10-16)*, hyperfine means; the ratio is how many times faster Bun is.

| step | Node | Bun | ratio |
| --- | ---: | ---: | ---: |
| install, cold | 794.1 ms | 632.3 ms | 1.3x |
| install, warm | 170.4 ms | 14.1 ms | 12.1x |
| type check (shared tsc) | 72.5 ms | 72.5 ms | 1x |
| build | tsc emit 77.0 ms, esbuild 36.9 ms | 5.8 ms | 13.3x, 6.4x |
| watch rebuild | tsc 68.9 ms, esbuild 106.7 ms | 14.5 ms | 4.8x, 7.4x |
| test | 121.2 ms | 17.3 ms | 7.0x |

**Stewardship**, as of 2026-10-15:

- Node: an [OpenJS Foundation project][openjs]. Node 26 is LTS from 2026-10-28, in maintenance
  from 2027-10-20, and supported to 2029-04-30 ([nodejs/Release schedule.json][node-sched]).
  From 27, one major a year, each one LTS ([Evolving the Node.js Release Schedule][node-blog]).
- pnpm: MIT, independent, funded through Open Collective ([opencollective.com/pnpm][pnpm-oc]);
  it maintains three lines (10, 11, 12) with releases several times a week, and its lead
  maintainer wrote 64 of its 100 most recent commits ([releases][pnpm-rel]). 223M npm downloads
  in the week to 2026-10-12 ([npm API][npm-dl]).
- Bun: Oven, acquired by Anthropic in December 2025 ([heise][bun-heise]). Still MIT
  ([LICENSE.md][bun-lic]) and developed in the open on GitHub; the 1.4.0 notes thank outside
  contributors ([v1.4.0][bun-140]). Releases ([GitHub][bun-rel]): 35 in the 12 months before
  the acquisition, 15 in the 10.5 months since, with no release from 2026-05-13 to 2026-08-20.
  That gap ended with 1.4.0, a feature release: new built-in APIs, parallel `bun test`, new
  package-management commands, and a rewrite from Zig to Rust ([bun.com/1.4][bun-14]). Two core
  engineers wrote 72 of the 100 most recent commits. No foundation and no published support
  window.

The setup ruled Deno out for "patches only after its acquisition". Applied to Bun on the
evidence, the test doesn't rule it out: a feature minor shipped nine months after its
acquisition, under the same license, in the open. Its cadence has halved since.

**The pick: Bun, and never Node and pnpm beside it.** Footprint decides first, and Bun covers
install, build, watch, and test as one pinned binary, against node and pnpm (and esbuild to
bundle) at more than three times the size. On standard status and long-term worth, Node and
pnpm are the standards and the stronger stewardship: a foundation and a published LTS window
against one company and none. That weighs against Bun but doesn't overturn the footprint,
because the exit is cheap and the check measures it: the same suite runs under `node --test`,
the same `package.json` installs under pnpm, and nothing Bun-specific ships (the JSDoc form,
below). Speed counts on two order-of-magnitude gaps, warm install (12.1x) and build (13.3x over
tsc emit) *(m 2026-10-16)*, though every step is under a second at this size. Consumption counts
for Bun too: it installs a git-tag package that itself depends on a git tag, which pnpm 12
refuses by default (`ERR_PNPM_EXOTIC_SUBDEP`, *m 2026-10-16*), and that is the shape of every
layer above spike-html-design.

**What would reverse it.** Bun failing the Deno test: releases going patch-only, a license other
than MIT, or development leaving the open. spike-html-packages choosing per-package prefixed tags,
which pnpm installs as subdirectories and bun can't *(m 2026-10-16)*. A consumer that requires a
published support window.

**esbuild doesn't earn its place in the Node column.** Its build is 2.1x tsc emit's (36.9 ms
against 77.0 ms) and its watch rebuild is slower (106.7 ms against 68.9 ms) *(m 2026-10-16)*: no
order-of-magnitude gap. It adds a second native binary to mirror for offline installs: esbuild
0.28.2 on npm is a stub with a `postinstall` and 26 per-platform optional packages
(`@esbuild/linux-x64` and the rest; [registry][esb-npm]), and mise's npm backend installs it from
the registry. The native tsc has the same per-platform shape, but every column needs it already,
so tsc emit adds nothing; bun build is inside the bun binary. Its standard status is eroding:
Vite 8 bundles with Rolldown and minifies with Oxc, and lists esbuild only as optional ([Vite
migration guide][vite8]), though it still draws 303M npm downloads a week ([npm API][npm-dl]).
It is 0.x, and one maintainer wrote 93 of its 100 most recent commits ([evanw/esbuild][esb-gh]).
The file:// rows load Lit unbundled through an import map, so the Node column needs no bundler
here; bundling an application is the branches task's question.

### 2. The TypeScript form: JSDoc with tsc

Lines in `src/`, and brotli bytes (`brotli -q 11`, unminified, as jsDelivr serves source):

| form | router | Lit element | vanilla element | globals.d.ts | lines | brotli |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `.ts`, strippable | 103 | 176 | 210 | — | 489 | 5,018 B |
| JSDoc + tsc | 119 | 185 | 225 | 18 | 547 | 5,151 B |
| plain JS | 83 | 156 | 200 | — | 439 | 4,319 B |

JSDoc costs 58 lines (12%) over `.ts` and 108 (25%) over plain JS; its brotli bytes exclude
`globals.d.ts`, which no browser loads. The Lit element's reactive properties:

```ts
// .ts: declared fields, defaults in the constructor
static properties = { page: { type: Number }, /* … */ } satisfies PropertyDeclarations;
declare page: number;
constructor() { super(); this.page = 1; }

// JSDoc: the same, in comments
/** @satisfies {PropertyDeclarations} */
static properties = { page: { type: Number }, /* … */ };
constructor() { super(); /** The current page, from 1. @type {number} */ this.page = 1; }

// plain JS
static properties = { page: { type: Number }, /* … */ };
constructor() { super(); this.page = 1; }
```

The vanilla element's shadow-tree controls:

```ts
readonly #select: HTMLSelectElement;                                           // .ts
this.#select = root.querySelector("select") as HTMLSelectElement;

/** @readonly @type {HTMLSelectElement} */ #select;                            // JSDoc
this.#select = /** @type {HTMLSelectElement} */ (root.querySelector("select"));

#select;                                                                       // plain JS
this.#select = root.querySelector("select");
```

JSDoc can't write `declare global`, so its tag and event maps sit in `globals.d.ts`; and tsc
7.0.2's declaration emit breaks on a typedef spread over several lines, so those stay on one.

What each form needs to run as shipped *(m 2026-10-16, except as noted)*:

- `.ts`: nothing loads it but Bun. Node refuses to strip types under node_modules
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`); bun imports it from node_modules. jsDelivr
  serves `.ts` as `text/plain` with `nosniff`, which no browser runs: the v0.1.0 rows that record
  it are pending. Every other consumer needs a build first.
- JSDoc: runs as written under node and bun, from node_modules, and in Chromium from file://;
  `tsc --noEmit` checks it, and a wrongly typed property or argument fails the check.
- Plain JS: runs as written everywhere; nothing checks a type.

**Conclusion: JSDoc checked by tsc**, for the foundation and the components. It is the only
form that both ships with no build to every consumer the spike measured and keeps a checked
contract at the element boundary: its properties and the detail of its events. Turbo's position
(DHH, [Turbo 8 is dropping TypeScript][turbo]) is to drop the type layer to drop the build step
and its friction; JSDoc drops the build too, and keeps the check, at 12% more lines than `.ts`.
Svelte's position moved its library source to JSDoc in Svelte 4 so the shipped files are the
source: `packages/svelte/src` on main is 368 `.js` files and 36 `.d.ts`, with `.ts` only in tests
([sveltejs/svelte][svelte], 2026-10-15), the same split as `src/jsdoc/` and its `globals.d.ts`.
That is this conclusion for libraries. Plain JS stays the fallback
for a module with no public contract to check.

With the toolchain: JSDoc makes the runtime's TypeScript support moot for anything shipped, so
it neither favors Bun nor locks into it. A `.ts` package could be imported from node_modules
only under Bun, which would turn the toolchain pick into lock-in; JSDoc keeps the exit to Node
open.

### 7. Consumption

- **Installed by git tag, offline** (the check, 2026-10-16): pnpm installs this package's
  `files` (package.json and `src/`, 11 files) and 114 of spike-html-design v0.7.0's 115, leaving
  out `.gitignore`; bun installs the tag's whole tree (38 and 115 files), ignoring `files`. Every
  file equals the tag's byte for byte.
- **Installed from GitHub by tag** *(m 2026-10-16)*: spike-html-design v0.7.0 (commit fe75220)
  under pnpm (114 of 115 files) and bun (115 of 115), each the tag's byte for byte and the same
  set as the offline install.
- **jsDelivr** *(m 2026-10-16)*: spike-html-design v0.7.0's two modules and its stylesheet, each
  with its JavaScript or CSS content type, `max-age=31536000, immutable`, CORS open to any
  origin, and bytes equal to the tag's.
- **file://** *(m 2026-10-16)*: four pages in headless Chromium load spike-html-design v0.7.0
  and Lit 3.3.3 from jsDelivr, Lit through an import map, and the element's JSDoc and plain JS
  forms in Lit and vanilla; each element is defined and renders page 3 of 7.
- **Refusals** *(m 2026-10-16)*: node won't strip `.ts` under node_modules, and bun imports it;
  pnpm refuses a git-tag package with a git-tag dependency (`ERR_PNPM_EXOTIC_SUBDEP`), and bun
  installs it.
- **Prefixed tags** *(m 2026-10-16)*, from a local, unpushed `fixture/v0.1.0`: pnpm installs the
  subdirectory with `#fixture/v0.1.0&path:/fixture` (11 files); bun can't resolve the spec.
  Handed to spike-html-packages.
- **Pending:** this package's v0.1.0 rows, *not yet released* at *m 2026-10-16*: its GitHub
  install under each manager, jsDelivr serving each of its nine source files (the three `.ts`
  as unloadable), and the file:// page loading its JS forms from jsDelivr. The structure task
  runs them after the release.

[node-sched]: https://github.com/nodejs/Release/blob/main/schedule.json
[node-blog]: https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
[pnpm-oc]: https://opencollective.com/pnpm
[pnpm-rel]: https://github.com/pnpm/pnpm/releases
[npm-dl]: https://api.npmjs.org/downloads/point/last-week/esbuild,pnpm
[bun-heise]: https://heise.de/-11102416
[bun-lic]: https://github.com/oven-sh/bun/blob/main/LICENSE.md
[bun-140]: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
[bun-rel]: https://github.com/oven-sh/bun/releases
[bun-14]: https://bun.com/1.4
[esb-npm]: https://registry.npmjs.org/esbuild/0.28.2
[vite8]: https://vite.dev/guide/migration
[esb-gh]: https://github.com/evanw/esbuild
[turbo]: https://world.hey.com/dhh/turbo-8-is-dropping-typescript-70165c01
[svelte]: https://github.com/sveltejs/svelte/tree/main/packages/svelte/src
[openjs]: https://openjsf.org/projects

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
