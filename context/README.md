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
  CSS. Results 1 rules out the split by role: the pick is one toolchain, Node with pnpm or Bun,
  never both.
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

## Ecosystem survey

How the web ecosystem builds, tests, and releases component libraries and apps, judged on
performance, maintainability, and scalability. It is the evidence for the industry-standard
criterion, and it decides nothing. Every source was read 2026-10-16 (UTC), and each repository is
cited at the commit read. State of JS (SoJS) figures are Devographics' usage ratio and retention
(the share who would use the tool again), from each results page's chart data. npm counts are for
the week 2026-10-06 to 2026-10-12. Every package grew 5 to 10 times in a year, so the counts
compare tools within a week and are not adoption over time.

Conflict of interest: this survey was drafted by an Anthropic model, and Anthropic owns Bun.

### Runtime and package manager

| measure | Node / npm | pnpm | Yarn | Bun | Deno |
| --- | ---: | ---: | ---: | ---: | ---: |
| SoJS 2025 runtime use ([s1][sj25-other]) | 90.3% | | | 20.8% | 11.2% |
| SoJS 2024 runtime use ([s2][sj24-other]) | 90.8% | | | 16.4% | 11.8% |
| Stack Overflow 2025 runtime use, all respondents ([s3][so25]) | 48.7% | | | 5.5% | 4.0% |
| Stack Overflow 2025 package manager use ([s3][so25]) | 56.8% | 13.4% | 21.1% | | |
| SoJS 2025 monorepo tool use ([s1][sj25-other]) | 20.8% (workspaces) | 38.4% | 13.1% | 11.0% | |
| npm downloads, the manager's own package ([s4][npm-pm]) | | 223.2M | 9.4M | 4.0M | |
| the 13 web-component rows below | 10 | 0 | 3 | 0 | 0 |

- SoJS 2025 asks no package-manager question; the monorepo question is its nearest proxy
  ([s1][sj25-other]).
- In a year, Bun's npm package grew 9.8x (406,541 to 3,990,852) and pnpm's 6.8x ([s5][npm-yoy]).
  npm counts only installs made through the registry, so Bun's count is a lower bound.

### TypeScript form

- SoJS 2025: 39.9% write only TypeScript, up from 34.4% in 2024. 6.0% write none, down from 8.0%
  ([s6][sj25-usage], [s7][sj24-usage]).
- TypeScript became GitHub's most-used language by monthly contributors in August 2025
  ([s8][octoverse]).
- 12 of the 13 web-component rows below write `.ts` and ship compiled JS with `.d.ts`. Vaadin
  writes JS with hand-written `.d.ts` and ships it unbuilt ([s20][vaadin]).
- Node strips types by default and calls it stable since v25.2.0 and v24.12.0. It refuses `.ts`
  under node_modules "to discourage package authors from publishing packages written in
  TypeScript" ([s9][node-ts]), so a `.ts` library ships built.
- The holdouts: Svelte moved its source to JSDoc for Svelte 4 and keeps it there, with 368 `.js`
  files in `packages/svelte/src` ([s10][svelte-src]). Turbo 8 removed TypeScript
  ([s11][turbo-pr], 2023-09-06). Rich Harris's rationale was that the tooling isn't worth it for a
  library ([s12][jsparty]). No reversal was found.

### Build tool

| SoJS 2025 ([s13][sj25-build]) | webpack | Vite | esbuild | tsc | Rollup | Bun | tsup | Rolldown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| usage | 87% | 84% | 54% | 53% | 47% | 25% | 12% | 10% |
| retention | 26% | 98% | 88% | 74% | 84% | 91% | 85% | 94% |

- npm downloads: esbuild 303.5M, vite 195.3M, rollup 126.1M, rolldown 111.2M (1.5M a year
  earlier), webpack 56.2M, tsup 9.5M, tsdown 4.3M ([s14][npm-build]). These include transitive
  installs, so they overstate direct use.
- Vite 8 (2026-03-12) "ships with Rolldown as its single, unified, Rust-based bundler"
  ([s15][vite8-blog]). Its library mode (`build.lib`) builds libraries, and it points to tsdown for
  advanced library builds ([s16][vite-build]).
- Lit's guidance: publish ES modules with `.d.ts`, unbundled and unminified, because "bundling and
  other optimizations are application concerns" ([s17][lit-pub]). For an app's production build,
  "we recommend Rollup" ([s18][lit-prod]).
- The web-component libraries below: Lit, Material, FAST, and Fluent emit with tsc and add a
  Rollup bundle, and Catalyst emits with tsc alone. 4 build with esbuild plus tsc for
  `.d.ts` (Shoelace, Web Awesome, Spectrum 1st-gen, relative-time-element). Spectrum's gen2 builds
  with Vite. Stencil and Ionic use Stencil's compiler, and Vaadin has no build step. None use
  `bun build`.

### Test runner

| SoJS 2025 ([s19][sj25-test]) | Jest | Vitest | Playwright | node:test | bun test |
| --- | ---: | ---: | ---: | ---: | ---: |
| usage | 75% | 54% | 50% | 12% | 10% |
| retention | 65% | 97% | 94% | 84% | 93% |

- SoJS lists no Web Test Runner. On npm it draws 0.17M a week ([s54][npm-wtr]), against
  vitest's 125.3M and jest's 46.8M ([s14][npm-build]) and `@playwright/test`'s 76.2M
  ([s55][npm-pw]).
- Vitest's browser mode went stable in Vitest 4.0 (2025-10-22; [s21][vitest4]), and Vitest 5.0
  shipped 2026-09-03 ([s22][vitest5]).
- Lit says to test "in a browser environment", and calls Web Test Runner "specifically designed to
  test modern web libraries like Lit" ([s23][lit-test]).
- The web-component libraries below: Web Test Runner in 8 of 13 rows, Playwright alone in FAST and
  Fluent, Jest in Stencil and Ionic, and Vitest in Spectrum's gen2.

### What the web-component libraries use

Read from each repository's default branch: the root manifest, the lockfile, the build and test
scripts, and the release workflow.

| library | commit | package manager | TS form | build | test | release |
| --- | --- | --- | --- | --- | --- | --- |
| Lit ([s24][r-lit]) | 01dbc66 | npm | .ts | tsc, Rollup (wireit) | Web Test Runner | npm `lit`, `@lit/*`, provenance |
| Shoelace ([s25][r-shoelace]) | 25bd8ec | npm | .ts | esbuild, tsc | Web Test Runner | npm `@shoelace-style/shoelace`, plus a CDN build |
| Web Awesome ([s26][r-wa]) | fbe82ff | npm | .ts | esbuild, tsc | Web Test Runner | npm `@awesome.me/webawesome`, plus a CDN build |
| Material Web ([s27][r-mwc]) | 5a95667 | npm | .ts | tsc, Rollup (wireit) | Web Test Runner | npm `@material/web` |
| Spectrum WC ([s28][r-swc]) | fe50b90 | Yarn 4 | .ts | 1st-gen tsc, esbuild; gen2 Vite | 1st-gen Web Test Runner; gen2 Vitest | npm `@spectrum-web-components/*`, `@adobe/spectrum-wc*` |
| FAST ([s29][r-fast]) | 8f42cb3 | npm | .ts | tsc, Rollup | Playwright | npm `@microsoft/fast-element` |
| Fluent UI WC ([s30][r-fluent]) | 84abdb5 | Yarn 4 (Nx) | .ts | tsc, Rollup | Playwright | npm `@fluentui/web-components` |
| Catalyst ([s31][r-catalyst]) | 9d6f120 | npm | .ts | tsc | Web Test Runner | npm `@github/catalyst`, provenance |
| relative-time-element ([s32][r-rte]) | 971a52a | npm | .ts | tsc, esbuild | Web Test Runner | npm `@github/relative-time-element`, provenance; GitHub Packages |
| Primer ViewComponents ([s33][r-primer]) | 1e47782 | npm (and Bundler) | .ts | Rollup | Ruby suites, Playwright (details unconfirmed) | RubyGem plus npm `@primer/view-components` |
| Ionic ([s34][r-ionic]) | 5f3f5fc | npm | .tsx/.ts | Stencil | Jest (Stencil spec), Playwright | npm `@ionic/core` |
| Stencil ([s35][r-stencil]) | 8681415 | npm | .ts | tsc, esbuild, Rollup | Jest | npm `@stencil/core`, provenance |
| Vaadin ([s20][vaadin]) | 029f599 | Yarn 1 | JS + .d.ts | none | Web Test Runner | npm `@vaadin/*` |

### Release hosting

| option | how a consumer installs | facts | trade-offs |
| --- | --- | --- | --- |
| git tag + jsDelivr `/gh/` | a package manager installs the git tag; browsers load `/gh/user/repo@tag/file` | an exact tag is cached for good and can't be purged or changed; 20 MB per file, 150 MB per package; `.ts` is served `text/plain` with `nosniff`, so the tag must carry built JS ([s36][jsd]); `/+esm` returned 404 on `/gh/` (probe of `jquery@3.7.1`) | perf: a global CDN with immutable caching. maint: no infrastructure, but built JS must be committed or tagged, and a bad tag is permanent. scale: no semver range resolution or dedupe in package managers |
| GitHub release assets | `npm install <tarball URL>`, `pnpm add <URL>`, `bun add <URL>` ([s37][npm-install], [s38][pnpm-add], [s39][bun-add]) | bun saves any credentials in the URL into package.json and the lockfile ([s39][bun-add]) | perf: a direct download. maint: built output decoupled from the source tree, but every upgrade edits a URL. scale: no ranges, so it gets harder with each package and consumer |
| GitHub Packages (npm) | npm registry at `npm.pkg.github.com` | "You need an access token to publish, install, and delete private, internal, and public packages", a classic PAT with `read:packages`; "only supports scoped npm packages" ([s40][ghp]) | perf: a registry. maint: integrated with Actions. scale: every consumer, even of a public package, needs a token |
| JSR | `jsr:` specs natively in pnpm 10.9+ and Yarn 4.9+; npm through `@jsr` on `npm.jsr.io` in `.npmrc` ([s41][jsr-npm]); Bun's native support isn't documented | the Deno company pays for hosting; MIT ([s42][jsr-faq]); publish `.ts` and JSR emits JS and `.d.ts` for npm ([s41][jsr-npm]); automatic provenance from Actions ([s43][jsr-trust]) | perf: a CDN-backed registry. maint: no release build to write. scale: semver ranges, but it rests on one company's funding, and npm and Bun consumers need setup |
| self-hosted (Verdaccio) | registry URL in `.npmrc` | a Node proxy registry, MIT, active (v6.10.5, 2026-10-03; [s44][verdaccio]); uplinks proxy npm ([s45][verdaccio-up]) | perf: a local cache. maint: you run, back up, and secure a server. scale: limited by your own operations; public consumers can't reach it |
| npm | the default registry | public scoped packages need `--access public` ([s46][npm-scoped]); OIDC trusted publishing went GA 2025-07-31 ([s47][npm-oidc]) and adds provenance from public repositories ([s48][npm-trusted]); classic tokens were revoked 2025-12-09 and publishing takes a 2FA session ([s49][npm-tokens]) | perf: the widest CDN and tool support (jsDelivr `+esm`). maint: no stored token with OIDC. scale: the highest reach. Anything published is permanent in practice |

The norms for publishing experiments to npm, the architect's worry:

- npm 11 refuses a prerelease without an explicit `--tag`, so `latest` stays on the stable line
  ([s50][npm-cl]).
- A `0.y.z` version means "anything MAY change at any time" ([s51][semver]).
- `npm deprecate` marks versions without removing them ([s52][npm-dep]).
- Unpublishing is allowed within 72 hours if nothing depends on the package. After that, all three
  must hold: no dependents, fewer than 300 downloads last week, and a single owner
  ([s53][npm-unpub]).

All 13 rows publish to npm. relative-time-element also publishes to GitHub Packages, and Shoelace
and Web Awesome also ship CDN builds. No library surveyed releases through git tags, release
assets, JSR, or a self-hosted registry alone.

### The consensus

| dimension | majority practice | trend | consensus? |
| --- | --- | --- | --- |
| runtime | Node (about 90% in SoJS) | Bun, 16.4% to 20.8% in a year | yes: Node |
| package manager | npm by use; pnpm leads for monorepos; npm in 10 of 13 web-component rows | pnpm; Bun install at 11% | none among managers; npm by default |
| TS form | `.ts` source, shipped as JS with `.d.ts` | the TypeScript-only share rising | yes: `.ts` with a build; JSDoc is a minority (Svelte, Turbo, Vaadin's JS) |
| library build | tsc emit to unbundled ESM, with an optional CDN bundle | esbuild and Vite for libraries | broad: unbundled ESM with `.d.ts` (Lit's guidance), not one tool |
| app build | webpack by use, Vite close behind | Vite (98% retention), now on Rolldown | trend: Vite |
| test runner | Jest overall; Web Test Runner for web-component libraries | Vitest, with browser mode stable | none for web-component libraries: Web Test Runner incumbent, Vitest rising |
| release hosting | public npm, scoped, increasingly with provenance | trusted publishing (OIDC) | yes: npm; no surveyed alternative has adoption among these libraries |

Not established: Stack Overflow 2026's runtime and package-manager figures; whether Bun installs
`jsr:` specs natively; whether npm and pnpm lock a tarball URL's integrity, and whether a
re-uploaded release asset changes under the same tag; how Shoelace, Web Awesome, and Vaadin
publish (no publish step in their workflows); the cause of npm's registry-wide download growth.
SoJS lists neither Web Test Runner nor a 2025 package-manager question.

[sj25-other]: https://2025.stateofjs.com/en-US/other-tools/
[sj24-other]: https://2024.stateofjs.com/en-US/other-tools/
[so25]: https://survey.stackoverflow.co/2025/technology
[npm-pm]: https://api.npmjs.org/downloads/point/last-week/pnpm,yarn,bun
[npm-yoy]: https://api.npmjs.org/downloads/point/2025-10-06:2025-10-12/pnpm,bun
[sj25-usage]: https://2025.stateofjs.com/en-US/usage/
[sj24-usage]: https://2024.stateofjs.com/en-US/usage/
[octoverse]: https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
[node-ts]: https://nodejs.org/api/typescript.html
[svelte-src]: https://github.com/sveltejs/svelte/tree/main/packages/svelte/src
[turbo-pr]: https://github.com/hotwired/turbo/pull/971
[jsparty]: https://changelog.com/jsparty/292
[sj25-build]: https://2025.stateofjs.com/en-US/libraries/build-tools/
[npm-build]: https://api.npmjs.org/downloads/point/last-week/esbuild,vite,rollup,rolldown,webpack,tsup,tsdown,vitest,jest
[vite8-blog]: https://vite.dev/blog/announcing-vite8
[vite-build]: https://vite.dev/guide/build.html
[lit-pub]: https://lit.dev/docs/tools/publishing/
[lit-prod]: https://lit.dev/docs/tools/production/
[sj25-test]: https://2025.stateofjs.com/en-US/libraries/testing/
[vaadin]: https://github.com/vaadin/web-components/tree/029f599773ce/packages/button/src
[vitest4]: https://vitest.dev/blog/vitest-4
[vitest5]: https://github.com/vitest-dev/vitest/releases/tag/v5.0.0
[lit-test]: https://lit.dev/docs/tools/testing/
[r-lit]: https://github.com/lit/lit/blob/01dbc6673cdc/package.json
[r-shoelace]: https://github.com/shoelace-style/shoelace/blob/25bd8ec77660/scripts/build.js
[r-wa]: https://github.com/shoelace-style/webawesome/blob/fbe82ff0dd9c/packages/webawesome/package.json
[r-mwc]: https://github.com/material-components/material-web/blob/5a95667bb70c/package.json
[r-swc]: https://github.com/adobe/spectrum-web-components/blob/fe50b906a18c/package.json
[r-fast]: https://github.com/microsoft/fast/blob/8f42cb3a66e5/packages/fast-element/package.json
[r-fluent]: https://github.com/microsoft/fluentui/blob/84abdb5fd25a/packages/web-components/package.json
[r-catalyst]: https://github.com/github/catalyst/blob/9d6f120c259a/package.json
[r-rte]: https://github.com/github/relative-time-element/blob/971a52af3179/package.json
[r-primer]: https://github.com/primer/view_components/blob/1e47782e3944/package.json
[r-ionic]: https://github.com/ionic-team/ionic-framework/blob/5f3f5fcae2bc/core/package.json
[r-stencil]: https://github.com/ionic-team/stencil/blob/8681415df18c/package.json
[jsd]: https://github.com/jsdelivr/jsdelivr
[npm-install]: https://docs.npmjs.com/cli/v11/commands/npm-install
[pnpm-add]: https://pnpm.io/cli/add
[bun-add]: https://bun.com/docs/cli/add
[ghp]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
[jsr-npm]: https://jsr.io/docs/npm-compatibility
[jsr-faq]: https://jsr.io/docs/faq
[jsr-trust]: https://jsr.io/docs/trust
[verdaccio]: https://github.com/verdaccio/verdaccio/releases
[verdaccio-up]: https://verdaccio.org/docs/uplinks/
[npm-scoped]: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
[npm-oidc]: https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
[npm-trusted]: https://docs.npmjs.com/trusted-publishers
[npm-tokens]: https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/
[npm-cl]: https://github.com/npm/cli/blob/latest/CHANGELOG.md
[semver]: https://semver.org/
[npm-dep]: https://docs.npmjs.com/cli/v11/commands/npm-deprecate
[npm-unpub]: https://docs.npmjs.com/policies/unpublish
[npm-wtr]: https://api.npmjs.org/downloads/point/last-week/@web/test-runner
[npm-pw]: https://api.npmjs.org/downloads/point/last-week/@playwright/test

## Results

Every figure below is from one run of `mise run measure`, dated **2026-10-16T00:25:08Z (UTC)**,
cited as *(m 2026-10-16)*: the timings and rows, each mise tool's installed size (its Footprint
section, `mise where` and `du -sb`), and the lines and brotli bytes of `src/` (its Forms section).
It prints every tool's version, all as pinned in `mise.toml`. File counts from the offline
installs are from `mise run check` the same day. Facts from outside the spike carry their own
source and date.

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
| installed size, Linux x86_64 *(m 2026-10-16)* | 224.4 MB + 58.9 MB (+ 11.6 MB) | 89.0 MB |

The Bun column's footprint is the toolchain a layer needs, not yet this repository's own: its
scripts still call `node` (`currency.sh` and `measure.sh` read JSON with it, `consumers.sh warm`
reads Lit's version with it), and mise's `npm:esbuild` backend needs node. The spike runs both
columns head to head, so it keeps node regardless; a layer on Bun alone would make those JSON
reads with `bun -e`, the same one-liners.

**Timings** *(m 2026-10-16)*, hyperfine means; the ratio is how many times faster Bun is.

| step | Node | Bun | ratio |
| --- | ---: | ---: | ---: |
| install, cold | 752.4 ms | 642.5 ms | 1.2x |
| install, warm | 174.0 ms | 13.8 ms | 12.6x |
| type check (shared tsc) | 83.7 ms | 83.7 ms | 1x |
| build (bundler to bundler) | esbuild 36.8 ms | 5.6 ms | 6.6x |
| watch rebuild | tsc 68.6 ms, esbuild 107.8 ms | 14.3 ms | 4.8x, 7.5x |
| test | 119.3 ms | 18.2 ms | 6.6x |

tsc emit (85.0 ms) isn't in the build ratio: it transpiles each file and bundles nothing, so
against `bun build` it isn't like for like.

**Stewardship**, as of 2026-10-16:

- Node: an [OpenJS Foundation project][openjs]. Node 26 is LTS from 2026-10-28, in maintenance
  from 2027-10-20, and supported to 2029-04-30 ([nodejs/Release schedule.json][node-sched]).
  From 27, one major a year, each one LTS ([Evolving the Node.js Release Schedule][node-blog]).
- pnpm: MIT, independent, funded through Open Collective ([opencollective.com/pnpm][pnpm-oc]);
  it maintains three lines (10, 11, 12) with releases several times a week
  ([releases][pnpm-rel]). Its lead maintainer wrote 64 of its 100 most recent commits, from
  2026-10-10 to 2026-10-15 ([commits API][pnpm-commits]). 223M npm downloads in the week to
  2026-10-12 ([npm API][npm-dl]).
- Bun: Oven, acquired by Anthropic in December 2025 ([heise][bun-heise]). Still MIT
  ([LICENSE.md][bun-lic]) and developed in the open on GitHub; the 1.4.0 notes thank outside
  contributors ([v1.4.0][bun-140]). Releases ([GitHub][bun-rel]): 35 in the 12 months before
  the acquisition, 15 in the 10.5 months since, with no release from 2026-05-13 to 2026-08-20.
  That gap ended with 1.4.0, a feature release: new built-in APIs, parallel `bun test`, new
  package-management commands, and a rewrite from Zig to Rust ([bun.com/1.4][bun-14]). Two core
  engineers wrote 72 of the 100 most recent commits, from 2026-10-02 to 2026-10-16, and its bot
  20 more ([commits API][bun-commits]). No foundation and no published support window.

Each commit count is the author logins of a repository's 100 most recent commits on its default
branch, read 2026-10-16 with `gh api 'repos/<owner>/<repo>/commits?per_page=100' --jq
'.[].author.login'`.

The setup ruled Deno out for "patches only after its acquisition". Applied to Bun on the
evidence, the test doesn't rule it out: a feature minor shipped nine months after its
acquisition, under the same license, in the open. Its cadence has halved since.

**The pick: Bun, and never Node and pnpm beside it.** Footprint decides first, and Bun covers
install, build, watch, and test as one pinned binary, 89.0 MB against node and pnpm's 283.3 MB
(294.9 MB with esbuild to bundle) *(m 2026-10-16)*, more than three times the size. On standard
status and long-term worth, Node and pnpm are the standards and the stronger stewardship: a
foundation and a published LTS window against one company and none. That weighs against Bun but
doesn't overturn the footprint, because the exit is cheap and the check measures it: the same
suite runs under `node --test`, the same `package.json` installs under pnpm, and nothing
Bun-specific ships (the JSDoc form, below). Speed counts only on an order-of-magnitude gap, and
only warm install clears it (12.6x); bundler to bundler, `bun build` is 6.6x esbuild, and every
other step is under 8x *(m 2026-10-16)*. At this size every step is under a second.

Consumption counts for neither column. The two rows where the managers differ are both
spike-html-packages' questions, and each is a gap on one side *(m 2026-10-16)*. pnpm 12 refuses
a git-tag package that itself depends on a git tag (`ERR_PNPM_EXOTIC_SUBDEP`) by default, and one
consumer-side setting, `blockExoticSubdeps: false` in `pnpm-workspace.yaml`, lifts it; bun
installs it as is. pnpm installs a package from a subdirectory at a prefixed tag with `path:`, and
bun can't. Whether the layers carry git-tag dependencies or prefixed tags is spike-html-packages'
to settle.

**What would reverse it.** Bun failing the Deno test: releases going patch-only, a license other
than MIT, or development leaving the open. spike-html-packages choosing per-package prefixed tags
while bun still can't install a subdirectory from one. A consumer that requires a published
support window.

**esbuild doesn't earn its place in the Node column.** Its build is 2.3x tsc emit's (36.8 ms
against 85.0 ms) and its watch rebuild is slower (107.8 ms against 68.6 ms) *(m 2026-10-16)*: no
order-of-magnitude gap. It adds a second native binary to mirror for offline installs: esbuild
0.28.2 on npm is a stub with a `postinstall` and 26 per-platform optional packages
(`@esbuild/linux-x64` and the rest; [registry][esb-npm]), and mise's npm backend installs it from
the registry. The native tsc has the same per-platform shape, but every column needs it already,
so tsc emit adds nothing; bun build is inside the bun binary. Its standard status is eroding:
Vite 8 bundles with Rolldown and minifies with Oxc, and lists esbuild only as optional ([Vite
migration guide][vite8]), though it still draws 303M npm downloads a week ([npm API][npm-dl]).
It is 0.x, and one maintainer wrote 93 of its 100 most recent commits, from 2026-02-05 to
2026-08-09 ([commits API][esb-commits], read 2026-10-16). The file:// rows load Lit unbundled
through an import map, so the Node column needs no bundler here; bundling an application is the
branches task's question.

### 2. The TypeScript form: JSDoc with tsc

Lines in `src/`, and brotli bytes (quality 11, unminified, as jsDelivr serves source)
*(m 2026-10-16, Forms)*:

| form | router | Lit element | vanilla element | globals.d.ts | lines | brotli |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `.ts`, strippable | 103 | 176 | 210 | — | 489 | 5,017 B |
| JSDoc + tsc | 119 | 185 | 225 | 18 | 547 | 5,168 B |
| plain JS | 83 | 156 | 200 | — | 439 | 4,318 B |

JSDoc costs 58 lines (12%) over `.ts` and 108 (25%) over plain JS, and 151 brotli bytes (3%)
over `.ts`; its brotli bytes exclude `globals.d.ts`, which no browser loads. The Lit element's
reactive properties:

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

JSDoc can't write `declare global`, so its tag and event maps sit in `globals.d.ts`. And tsc
7.0.2's declaration emit breaks on one shape of typedef: an object type with quoted, hyphenated
keys, such as `{ "page-change": … }`, spread over several lines, has each line's leading `*`
copied into the `.d.ts`, which then fails to parse; a multi-line object typedef with plain keys
emits correctly. Reproduced 2026-10-16 by emitting declarations (`tsc` with `declaration` and
`allowJs`) for two scratch files, one typedef of each shape. The event-detail typedefs stay on
one line.

What each form needs to run as shipped *(m 2026-10-16, except as noted)*:

- `.ts`: nothing loads it but Bun. Node refuses to strip types under node_modules
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`); bun imports it from node_modules. jsDelivr
  serves a `.ts` as `text/plain` with `nosniff`, which no browser runs, as observed on another
  repository's `.ts`: Lit's [`packages/lit/src/index.ts` at `lit@3.3.3`][lit-ts]. This package's
  own `.ts` rows are pending v0.1.0. Every other consumer needs a build first.
- JSDoc: runs as written under node and bun, from node_modules, and in Chromium from file://,
  loaded from this working tree until v0.1.0 is released; `tsc --noEmit` checks it, and a wrongly
  typed property or argument fails the check.
- Plain JS: runs as written everywhere; nothing checks a type.

**Conclusion: JSDoc checked by tsc**, for the foundation and the components. It is the only
form that both ships with no build to every consumer the spike measured and keeps a checked
contract at the element boundary: its properties and the detail of its events. Turbo's position
(DHH, [Turbo 8 is dropping TypeScript][turbo]) is to drop the type layer to drop the build step
and its friction; JSDoc drops the build too, and keeps the check, at 12% more lines than `.ts`.
Svelte converted its library source from TypeScript to JSDoc for Svelte 4 ([fd9d61a][svelte-jsdoc],
"chore: TS to JSDoc Conversion (#8569)", 2023-05-19; 4.0.0 was released 2023-06-22), and keeps it
there: `packages/svelte/src` on main is 368 `.js` files and 36 `.d.ts`, with `.ts` only in 12
test files ([sveltejs/svelte][svelte], commit 40bb084, read 2026-10-16), the same split as
`src/jsdoc/` and its `globals.d.ts`. That is this conclusion for libraries. Plain JS stays the
fallback for a module with no public contract to check.

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
  forms in Lit and vanilla, from this working tree until v0.1.0 is released; each element is
  defined and renders page 3 of 7.
- **Refusals** *(m 2026-10-16)*: node won't strip `.ts` under node_modules, and bun imports it;
  pnpm refuses a git-tag package with a git-tag dependency (`ERR_PNPM_EXOTIC_SUBDEP`) by default,
  installs it with `blockExoticSubdeps: false` in the consumer's `pnpm-workspace.yaml`, and bun
  installs it as is. Handed to spike-html-packages.
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
[pnpm-commits]: https://api.github.com/repos/pnpm/pnpm/commits?per_page=100
[npm-dl]: https://api.npmjs.org/downloads/point/last-week/esbuild,pnpm
[bun-heise]: https://heise.de/-11102416
[bun-lic]: https://github.com/oven-sh/bun/blob/main/LICENSE.md
[bun-140]: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
[bun-rel]: https://github.com/oven-sh/bun/releases
[bun-14]: https://bun.com/1.4
[bun-commits]: https://api.github.com/repos/oven-sh/bun/commits?per_page=100
[esb-npm]: https://registry.npmjs.org/esbuild/0.28.2
[vite8]: https://vite.dev/guide/migration
[esb-commits]: https://api.github.com/repos/evanw/esbuild/commits?per_page=100
[turbo]: https://world.hey.com/dhh/turbo-8-is-dropping-typescript-70165c01
[svelte]: https://github.com/sveltejs/svelte/tree/main/packages/svelte/src
[svelte-jsdoc]: https://github.com/sveltejs/svelte/commit/fd9d61a7b747c05958002b7dcb64cb3199378ad8
[lit-ts]: https://cdn.jsdelivr.net/gh/lit/lit@lit@3.3.3/packages/lit/src/index.ts
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
