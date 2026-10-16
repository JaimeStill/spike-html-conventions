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
  CSS. Results 1 rules out the split by role and, across Node + npm, Node + pnpm, and Bun, picks
  Node, never Bun beside it, with one manager: pnpm provisionally, until spike-html-packages
  decides how the layers release (a registry release reopens the choice between npm and pnpm).
  Libraries build with tsc emit and apps with Vite; esbuild doesn't earn its place.
- **Components:** vanilla for the foundation and the static branch; Lit from components up.
- **Stack:** foundation (native only, no framework: the design system plus `.ts` modules shipped
  through a release build, per Results 2; its tools split into utilities, structure/layout, and
  meta components/variants, with layouts folded into structure); components (the element tier:
  props and attributes in, events out, internal UI state allowed, no services, data fetching, or
  app state; an app's internal element is promoted once a second app needs it); apps (a static
  branch, and an application branch, standalone or embedded, whose modules and views stay inside
  the app).

## The evidence

1. Node 26 with npm or pnpm against Bun 1.4, measured on git-tag install, TS, build, watch,
   test, lint, and jsDelivr, with a pick.
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
the week 2026-10-06 to 2026-10-12, from the npm downloads API's point range for that week. Growth
over a year varies widely by package: against the same week of 2025 (2025-10-06 to 2025-10-12),
webpack grew 1.7x, esbuild 4.6x, vite 5.4x, pnpm 6.8x, bun 9.8x, and rolldown 72x
([s4][npm-pm], [s14][npm-build], [s5][npm-yoy], [s56][npm-yoy-build]). So the counts compare
tools within one week only, and are not adoption over time.

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
- In a year, Bun's npm package grew 9.8x (406,541 to 3,990,852) and pnpm's 6.8x (32,794,521 to
  223,195,967) ([s4][npm-pm], [s5][npm-yoy]).
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
  earlier, [s56][npm-yoy-build]), webpack 56.2M, tsup 9.5M, tsdown 4.3M ([s14][npm-build]). These
  include transitive installs, so they overstate direct use.
- Vite 8 (2026-03-12) "ships with Rolldown as its single, unified, Rust-based bundler"
  ([s15][vite8-blog]). Its library mode (`build.lib`) builds libraries, and it points to tsdown for
  advanced library builds ([s16][vite-build]).
- Lit's guidance: publish ES modules with `.d.ts`, unbundled and unminified, because "bundling and
  other optimizations are application concerns" ([s17][lit-pub]). For an app's production build,
  "we recommend Rollup" ([s18][lit-prod]).
- The 13 web-component libraries below: 4 emit with tsc and add a Rollup bundle (Lit, Material,
  FAST, Fluent), and Catalyst emits with tsc alone. 4 build with esbuild plus tsc for `.d.ts`
  (Shoelace, Web Awesome, Spectrum 1st-gen, relative-time-element); Spectrum's gen2 builds with
  Vite. Stencil builds its own compiler with tsc, esbuild, and Rollup, and Ionic builds with that
  compiler. Primer ViewComponents bundles with Rollup, and Vaadin has no build step. None use
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

### Lint and format

| measure | ESLint | Prettier | Biome | oxlint | oxfmt |
| --- | ---: | ---: | ---: | ---: | ---: |
| SoJS 2025 utilities, respondents ([s1][sj25-other]) | 9,697 | 9,295 | 1,762 | 123 (write-in) | |
| npm downloads ([s57][npm-lint], [s58][npm-biome]) | 158.7M | 139.1M | 17.9M | 26.8M | 17.1M |
| the 13 web-component rows below | 10 | 11 | 1 | 0 | 0 |

- SoJS 2025's utilities question lists ESLint, Prettier, and Biome as answers. oxlint's 123 are
  write-ins, and oxfmt draws none. The figures are respondents, not shares, and the section opens
  "Every self-respecting JavaScript developer these days seems to be using ESLint and Prettier"
  ([s1][sj25-other]).
- npm counts `@biomejs/biome` on its own, since the downloads API takes no scoped package in a
  bulk query ([s58][npm-biome]). Like the build tools', the counts include installs by other
  packages.
- The web-component libraries, read from each root manifest at the commit in the table below
  (for Ionic, `core/package.json`, since its root manifest declares only Lerna and semver):
  ESLint in 10 and Prettier in 11. Catalyst and relative-time-element take Prettier through `@github/prettier-config` and
  `eslint-plugin-github`, which runs it as an ESLint rule and depends on `prettier`
  ([s59][eslint-gh]). Web Awesome runs Prettier alone ([s60][m-wa]), FAST runs Biome alone
  (`@biomejs/biome` 2.4.8, [s61][m-fast]), and Material Web names neither, in its manifest or a
  root config file ([s27][r-mwc]). Shoelace and Spectrum add `eslint-plugin-lit` and
  `eslint-plugin-wc` ([s62][m-shoelace], [s28][r-swc]). Lit's root ESLint config uses neither,
  though Lit keeps an unpublished `eslint-plugin-lit` of its own in `packages/labs`
  ([s63][lit-eslint]). None uses oxlint or oxfmt.
- oxlint and oxfmt are the linter and formatter of Oxc, which VoidZero calls "the foundation of our
  unified toolchain", beside Vite, Vitest, and Rolldown ([s64][voidzero]). Both are MIT, from
  `oxc-project/oxc`; oxlint is at 1.88.0 and oxfmt at 0.73.0, still 0.x ([s65][oxc-npm]). Each npm
  package is a bin script with 19 per-platform binding packages, and each runs as a Node script
  that loads a native addon (`oxlint.linux-x64-gnu.node`, 15.2 MB; `oxfmt.linux-x64-gnu.node`,
  8.9 MB; *m 2026-10-16T18:23:55Z*, Results). Biome is one native binary.

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
| git tag + jsDelivr `/gh/` | a package manager installs the git tag; browsers load `/gh/user/repo@tag/file` | an exact tag is cached for good and can't be purged or changed; 20 MB per file, 150 MB per package; `.ts` is served `text/plain` with `nosniff`, so the tag must carry built JS ([s36][jsd]); `/+esm` returns 404 on `/gh/`: `curl -s -o /dev/null -w '%{http_code}' https://cdn.jsdelivr.net/gh/jquery/jquery@3.7.1/+esm` printed 404, as did `…/gh/jquery/jquery@3.7.1/dist/jquery.js/+esm` and `…/gh/JaimeStill/spike-html-design@v0.7.0/+esm`, against 200 for `…/npm/jquery@3.7.1/+esm` (probed 2026-10-16T12:04:23Z) | perf: a global CDN with immutable caching. maint: no infrastructure, but built JS must be committed or tagged, and a bad tag is permanent. scale: no semver range resolution or dedupe in package managers |
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

The hosting decision belongs to spike-html-packages, not this survey. The architect's standing
decision rules npm out unless no workable alternative exists, so these rows are its facts, and
npm's adoption among the libraries doesn't decide it.

### The consensus

| dimension | majority practice | trend | consensus? |
| --- | --- | --- | --- |
| runtime | Node (about 90% in SoJS) | Bun, 16.4% to 20.8% in a year | yes: Node |
| package manager | npm by use; pnpm leads for monorepos; npm in 10 of 13 web-component rows | pnpm; Bun 11.0% of SoJS monorepo-tool use (not a package-manager question) | none among managers; npm by default |
| TS form | `.ts` source, shipped as JS with `.d.ts` | the TypeScript-only share rising | yes: `.ts` with a build; JSDoc is a minority (Svelte, Turbo, Vaadin's JS) |
| library build | tsc emit to unbundled ESM, with an optional CDN bundle | esbuild and Vite for libraries | broad: unbundled ESM with `.d.ts` (Lit's guidance), not one tool |
| app build | webpack by use, Vite close behind | Vite (98% retention), now on Rolldown | trend: Vite |
| test runner | Jest overall; Web Test Runner for web-component libraries | Vitest, with browser mode stable | none for web-component libraries: Web Test Runner incumbent, Vitest rising |
| lint and format | ESLint and Prettier, by SoJS, npm, and 10 and 11 of 13 web-component rows | Biome (FAST) and Oxc's tools, a minority in SoJS; no year-on-year figure read | yes: ESLint + Prettier |
| release hosting | public npm, scoped, increasingly with provenance; relative-time-element also on GitHub Packages, Shoelace and Web Awesome also as CDN builds | trusted publishing (OIDC) | yes among the libraries: npm; none releases through an alternative alone. The decision is spike-html-packages', with npm ruled out unless no workable alternative exists |

Not established: Stack Overflow 2026's runtime and package-manager figures; whether Bun installs
`jsr:` specs natively; whether npm and pnpm lock a tarball URL's integrity, and whether a
re-uploaded release asset changes under the same tag; how Shoelace, Web Awesome, and Vaadin
publish (no publish step in their workflows); the cause of npm's registry-wide download growth;
a published support window for the npm CLI's release lines (its README defers to Node's
supported versions, [README][npm-readme]).
SoJS lists neither Web Test Runner nor a 2025 package-manager question.

[sj25-other]: https://2025.stateofjs.com/en-US/other-tools/
[sj24-other]: https://2024.stateofjs.com/en-US/other-tools/
[so25]: https://survey.stackoverflow.co/2025/technology
[npm-pm]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/pnpm,yarn,bun
[npm-yoy]: https://api.npmjs.org/downloads/point/2025-10-06:2025-10-12/pnpm,bun
[sj25-usage]: https://2025.stateofjs.com/en-US/usage/
[sj24-usage]: https://2024.stateofjs.com/en-US/usage/
[octoverse]: https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
[node-ts]: https://nodejs.org/api/typescript.html
[svelte-src]: https://github.com/sveltejs/svelte/tree/main/packages/svelte/src
[turbo-pr]: https://github.com/hotwired/turbo/pull/971
[jsparty]: https://changelog.com/jsparty/292
[sj25-build]: https://2025.stateofjs.com/en-US/libraries/build-tools/
[npm-build]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/esbuild,vite,rollup,rolldown,webpack,tsup,tsdown,vitest,jest
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
[npm-wtr]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/@web/test-runner
[npm-pw]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/@playwright/test
[npm-yoy-build]: https://api.npmjs.org/downloads/point/2025-10-06:2025-10-12/webpack,esbuild,vite,rolldown
[npm-readme]: https://github.com/npm/cli/blob/latest/README.md
[npm-lint]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/eslint,prettier,oxlint,oxfmt
[npm-biome]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/@biomejs/biome
[voidzero]: https://voidzero.dev/
[oxc-npm]: https://registry.npmjs.org/oxlint/1.88.0
[m-wa]: https://github.com/shoelace-style/webawesome/blob/fbe82ff0dd9c/package.json
[m-fast]: https://github.com/microsoft/fast/blob/8f42cb3a66e5/package.json
[m-shoelace]: https://github.com/shoelace-style/shoelace/blob/25bd8ec77660/package.json
[lit-eslint]: https://github.com/lit/lit/blob/01dbc6673cdc/packages/labs/eslint-plugin/package.json
[eslint-gh]: https://registry.npmjs.org/eslint-plugin-github/4.7.0

## Results

Every measured figure below is from a dated run of `mise run measure`. Results 1, 2, and 7 cite
the run of **2026-10-16T14:03:02Z (UTC)** as *(m 2026-10-16)*, unless a citation names another
run. That covers the timings and rows, each mise tool's installed size (its Footprint section,
`mise where` and `du -sb`), and the lines and brotli bytes of `src/` (its Forms section), with
every tool's version as pinned in `mise.toml`. Results 3 and 6, and the Lint and format survey
where it cites a run, cite the run of **2026-10-16T18:23:55Z (UTC)** as
*(m 2026-10-16T18:23:55Z)*, for the layer rules and the lint and format rows; it ran after the
layer rules gained Results 3's normalization groups. File counts from the offline installs are
from `mise run check` the same day. Survey figures cite the Ecosystem survey's sources, and other
facts from outside the spike carry their own source and date.

Conflict of interest: this evidence was drafted by an Anthropic model, and Anthropic owns Bun.
The pick rests on the measured rows and the cited facts; weigh it with that in mind.

### 1. The toolchain: Node, with pnpm provisionally

Three columns, with tsc (the native 7.0.2 binary) and biome shared:

| role | Node + npm | Node + pnpm | Bun |
| --- | --- | --- | --- |
| install from a git tag | npm 12.2.1 | pnpm | bun |
| TypeScript | tsc; node strips `.ts`, but not under node_modules | the same | tsc; bun runs any `.ts` |
| library build | tsc emit | tsc emit | bun build |
| app build | Vite (or esbuild) | Vite (or esbuild) | bun build |
| test | node --test | node --test | bun test |
| tools added | node, npm (+ Vite for an app) | node, pnpm (+ Vite for an app) | bun |

npm is its own pin: node 26.12.0 bundles npm 11.20.0, from before npm 12 refused git dependencies
by default *(m 2026-10-16)*.

**First: industry standard and maintainability.** Readable, type-safe source doesn't separate the
columns: all three write the same `.ts` (Results 2), checked by the same tsc, and a release build
ships JS, so bun's `.ts` support under node_modules buys a consumer nothing. The standard does:

- Runtime: Node is the consensus, 90.3% use against Bun's 20.8% in SoJS 2025
  ([s1][sj25-other]), and 48.7% against 5.5% of all Stack Overflow 2025 respondents
  ([s3][so25]). Bun is growing (16.4% in 2024, [s2][sj24-other]), from a minority.
- Package manager: no consensus. npm is the default and the majority by use, 56.8% against pnpm's
  13.4% in Stack Overflow 2025 ([s3][so25]), and 10 of the 13 web-component libraries use it (3
  use Yarn, none pnpm or bun). pnpm leads multi-package repositories, 38.4% of SoJS 2025 monorepo
  use against npm workspaces' 20.8% and Bun's 11.0% ([s1][sj25-other]), and this stack is
  several layers released from one repository. That 11.0% is Bun's only count, and a
  monorepo-tool figure, not package-manager use; the Stack Overflow figures above list no Bun.
- Build: library builds are tsc emit to unbundled ESM with `.d.ts` (Lit, Material, FAST, Fluent,
  and Catalyst emit with tsc), apps trend to Vite (84% use, 98% retention, [s13][sj25-build]), and
  none of the 13 libraries uses `bun build`. Both Node columns' builds are the standards; the Bun
  column's is neither.
- Stewardship, as of 2026-10-16. Node is an [OpenJS Foundation project][openjs]; Node 26 is LTS
  from 2026-10-28 and supported to 2029-04-30 ([schedule.json][node-sched]), and from 27 every
  major is LTS ([release schedule][node-blog]). pnpm is MIT and independent, funded through
  [Open Collective][pnpm-oc] ($308,861 received in all, a $87,654 yearly budget, 136 backers)
  and 43 GitHub sponsors, with OpenAI, Notion, Discord, and Vite among the sponsors its README
  names ([README][pnpm-readme]). It keeps three lines, with 122 stable releases in the 12 months
  to 2026-10-16 (30 on 12, 55 on 11, 37 on 10), and 56 prereleases beside them, counted as npm's
  are below ([releases][pnpm-rel], `gh api --paginate`, read 2026-10-16). This repository's
  12.11.2 pin is what mise resolves natively: `mise latest pnpm` answers 12.11.2, since mise
  resolves pnpm through `aqua:pnpm/pnpm` (`mise registry pnpm`), which reads the release pnpm
  marks latest on GitHub (v12.11.2, 2026-10-09; [latest release][pnpm-gh-latest]). The pin
  follows the tool manager's own resolution, so `mise use pnpm` and `mise run currency` agree on
  it, and currency reports it current. The registry is ahead: pnpm hasn't marked any 12.12 or
  later release latest on GitHub, while npm's `latest` dist-tag was 12.14.0 on 2026-10-16,
  released 2026-10-15 ([dist-tags][pnpm-tags]). Its lead maintainer wrote 65 of its 100 most recent commits
  ([commits][pnpm-commits]), and 2,716 of the 4,201 on its main branch in the year to 2026-10-16
  (`gh api`). vuejs/core, vitejs/vite, and nuxt/nuxt each declare `pnpm@12.11.2` in their
  `packageManager` field, vercel/next.js `pnpm@12.9.1`, withastro/astro `pnpm@11.28.4`, and
  sveltejs/svelte `pnpm@10.33.4` (each default branch's package.json, read 2026-10-16), where
  facebook/react declares `yarn@1.22.22`. npm is GitHub's, which bought npm, Inc. in 2020
  ([GitHub blog][npm-github]), and GitHub is Microsoft's ([Microsoft][ms-github]). The CLI is
  under the Artistic License 2.0 ([LICENSE][npm-lic]), and it keeps release lines in parallel,
  34 releases in the 12 months to 2026-10-16 (6 on 12, 23 on 11, 5 on 10), with 12.2.1 and
  11.21.1 the same day, 2026-10-15 ([releases][npm-rel]); 12.2.1, this repository's pin, is on
  the registry's `next-12` dist-tag, and `latest` is still 12.2.0 ([dist-tags][npm-tags]); its
  two most frequent authors wrote 46 of its 100 most recent commits ([commits][npm-commits]). It publishes no support window of its
  own; its README defers to Node's supported versions ([README][npm-readme]), and node bundles
  it, 11.20.0 in node 26.12.0. npm also runs the registry, under terms npm "may change … in the
  future" ([open-source terms][npm-terms], legal notices to GitHub), and it sets registry and
  client policy unilaterally: npm 12 made git dependencies and dependency lifecycle scripts opt-in
  ([v12.0.0][npm-12]), and classic tokens were revoked 2025-12-09 ([s49][npm-tokens]). Bun is
  Oven's, acquired by Anthropic in December 2025 ([heise][bun-heise]), still MIT
  ([LICENSE.md][bun-lic]) and developed in the open; it released 35 times in the 12 months
  before the acquisition and 15 in the 10.5 since, with a gap from 2026-05-13 to 2026-08-20 that
  ended with 1.4.0, a feature release ([releases][bun-rel], [bun.com/1.4][bun-14]). Two core
  engineers wrote 74 of its 100 most recent commits ([commits][bun-commits]). It has no foundation and no published support window. So the setup's
  Deno test ("patches only after its acquisition") doesn't rule Bun out, but a foundation and an
  LTS window outweigh one company and none. Between the managers, npm's stewardship is the
  stronger: a corporate owner, release lines kept in parallel, and authorship spread wider,
  against pnpm's donations and one maintainer's 65 of 100 commits; neither has a
  foundation or a published support window. Its cost is the same owner's hand on the client, the
  registry, and their defaults. Commit counts are the author logins of each default branch's 100
  most recent commits, read 2026-10-16 with `gh api`.
- Repository releases, measured *(m 2026-10-16)* and in the check, weighed across all three:

  | fact | npm 12.2.1 | pnpm | bun |
  | --- | --- | --- | --- |
  | honours `files` | yes, 11 files | yes, 11 files | no, the tag's whole tree, 43 files |
  | a subdirectory at a prefixed tag | no | yes, `#fixture/v0.1.0&path:/fixture`, 11 files | no, can't resolve the spec |
  | a git-tag dependency | refused by default (`EALLOWGIT`, allow-git=none); allow-git=root admits it | installed | installed |
  | that package's own git-tag dependency | refused under allow-git=root; allow-git=all installs it | refused (`ERR_PNPM_EXOTIC_SUBDEP`); `blockExoticSubdeps: false` installs it | installed, no setting |
  | a git dependency's `prepare` | runs at pack time, while npm warns that the package's install scripts were blocked; only `--ignore-scripts` skips it | refused by default (`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`), nothing installed; the package's resolved spec in `allowBuilds` runs it; `--ignore-scripts` installs without it | installed without running it, reported (`Blocked 1 postinstall`, and `bun pm untrusted` lists `[prepare]`); `trustedDependencies` runs it |

  npm ignores `&path:` as an unknown key, and its own `#fixture/v0.1.0::path:fixture` resolves the
  tag to its commit and then fails to install it (`ENOENT` on the clone's package.json). npm and
  pnpm guard git dependencies by default, npm at the root and pnpm only below it; bun has no guard.
  On a git dependency's `prepare`, all three ask for an opt-in, but only npm runs the script
  anyway: its warning says the opposite of what it does, a cost to anyone auditing a git
  dependency. pnpm refuses until the script is allowed, bun skips it and says so; pnpm's
  `allowBuilds` takes the resolved spec with its commit, not the bare name. Whether the layers use
  prefixed tags or git-tag dependencies is spike-html-packages' to settle. Ruling out npm's registry
  doesn't settle it: GitHub Packages, JSR, Verdaccio, and release-asset tarballs remain (Ecosystem
  survey, Release hosting). These facts weigh on the pick only if the layers release from their
  repositories.

**npm, pnpm, and bun today, against the concerns pnpm was made for.** pnpm has been in production
use since 2016 ([README][pnpm-readme]). It answered npm's node_modules: nested and deep under npm
2, then flat from npm 3, a layout Yarn copied ([Kochan, 2017-03-19][pnpm-why]). Its case for its
own layout is [Flat node_modules is not the only way][pnpm-flat] (2020-05-27). Each layout below
installed into scratch projects on tmpfs, each against its own cache or store *(m 2026-10-16)*.
The phantom fixture is three local packages: a depends on b, b depends on c, and the consumer
declares only a. bun is bun install 1.4.3, run under node.

| concern | npm 12.2.1 | pnpm 12.11.2 | bun 1.4.3 | evidence |
| --- | --- | --- | --- | --- |
| nested node_modules (npm 2's deep paths and duplication) | mitigated: hoisted since npm 3; `--install-strategy=linked` keeps every package in one flat `node_modules/.store`, linked in place | mitigated: one flat virtual store, `node_modules/.pnpm`, symlinked | mitigated: hoisted; `--linker isolated` keeps one flat `node_modules/.bun` | the layout rows' listings *(m)*; [Kochan][pnpm-why] |
| phantom dependency: the consumer imports b | partly: the default hoisted layout resolves it. linked refuses it (`ERR_MODULE_NOT_FOUND`); linked is opt-in, and stable since 11.18.0 and 12.0.0 (2026-06-29 and 2026-07-08), experimental from 9.4.0 until then. npm now recommends it to package authors | mitigated by default: refused | partly: resolved for a project with no workspaces, where hoisted is the default. `--linker isolated` refuses it, and it is the default for new workspace projects since 1.3.2 | rows *(m)*; [npm#9674][npm-linked-stable], [developers][npm-phantom], [bun isolated installs][bun-isolated] |
| phantom dependency: a dependency, a, imports c | linked refuses it too: the strictest layout measured | resolves by default: every package is hoisted into a hidden `node_modules/.pnpm/node_modules` (`hoist: true`, `hoistPattern: ['*']`) on purpose, for packages that have phantoms ([settings][pnpm-hoist]) | resolves under `--linker isolated` too, through `node_modules/.bun/node_modules`, unless `install.hoist = false` ([bun isolated installs][bun-isolated]) | rows *(m)* |
| nondeterminism and order-dependent trees | mitigated: npm 3's tree depended on install order ([npm3 non-determinism][npm3-nondet], "install order matters"). package-lock.json came in npm 5 (2017) and `npm ci` in 5.7.0 (2018); hoisted and linked each give the same tree from one lockfile | mitigated: the same tree from `pnpm-lock.yaml` | mitigated: the same tree from the text `bun.lock` (the default since 1.2, 2025-01-22) with `--frozen-lockfile`, which bun doesn't turn on in CI by itself ([bun install][bun-install]) | rows *(m)*; [package-lock.json][npm-lock] |
| per-project disk duplication | not mitigated: each project extracts its own copy from npm's cacache cache of compressed tarballs ([npm cache][npm-cache]). A second project of lit 3.3.3 adds 2,955,179 bytes hoisted and 2,958,801 linked, with 0 of its 1,004 files hard-linked; linked's `.store` is per project | mitigated: a content-addressable store, hard-linked (cloned first on macOS and Windows; [motivation][pnpm-motivation], [packageImportMethod][pnpm-hoist]). The second project adds 4,212 bytes, with 1,004 of 1,004 files hard links | mitigated: its global cache, hard-linked on Linux and Windows and `clonefile`d on macOS ([global cache][bun-cache]). The second project adds 0 bytes, with 1,004 of 1,004 files hard links | rows *(m)*, du -sb over the cache or store and both projects |
| install speed | not mitigated: 3.9x slower than pnpm warm, with linked within 2% of hoisted; cold timings too loose to rank | the baseline | the fastest warm: 12.0x faster than pnpm; cold timings too loose to rank | the timings above *(m)* |
| monorepo support | partly: workspaces, selected with `-w` and `--workspaces` and run in the `workspaces` array's order, not the dependency graph ([npm/rfcs#707][npm-topo] open). No `workspace:` protocol (`EUNSUPPORTEDPROTOCOL`, [npm/cli#8845][npm-ws-proto] open). No catalogs ([npm/rfcs#872][npm-catalog] open since 2026-05-27). Five open linked-layout bugs, two on workspaces ([npm/cli#10082][npm-10082], [#9982][npm-9982]) | full: `--filter` selects dependencies, dependents, and changes since a commit ([filtering][pnpm-filter]); recursive runs go in topological order; `workspace:` refuses anything but a local package ([workspaces][pnpm-ws]); catalogs since 9.5.0, 2024-07-07 ([catalogs][pnpm-catalogs]) | mostly: `--filter` with `foo...` and `...foo`, run in dependency order ([filter][bun-filter]); `workspace:` ([workspaces][bun-ws]); catalogs in package.json since 1.2.14, 2025-05-21 ([catalogs][bun-catalogs]); no changed-since selector | sources, read 2026-10-16 |
| obtaining the manager | node bundles npm (11.20.0 in 26.12.0); this repository pins 12 in mise | Corepack left Node in v25.0.0 ([TSC vote][corepack-vote], 2025-03-19; [nodejs/node#59835][corepack-pr]), and v26 has no Corepack page ([v26 docs][corepack-26], 404). pnpm installs by script, `npx get-pnpm`, or `pnpm self-update`. pnpm 12 is a native executable that needs no Node ([installation][pnpm-install]); here it is a mise pin | one binary, a mise pin here | sources, read 2026-10-16 |

npm has closed two of the concerns: nested paths, since npm 3, and nondeterminism, since npm 5. It
has partly closed phantom dependencies, with a linked layout stricter than pnpm's or bun's isolated
ones, but opt-in, newly stable, and carrying open workspace bugs. It has only partly closed monorepo
support: no graph-aware runs, no `workspace:` protocol, and no catalogs. It hasn't closed disk
duplication or speed. So npm hasn't mitigated enough to change the provisional pick. pnpm leads on
the multi-package practice this stack is, and that is where npm's gaps remain. bun's isolated linker
matches pnpm's on phantoms, though its default for a project with no workspaces is hoisted and
doesn't. Its workspaces lack only a changed-since selector, and it is the fastest of the three warm
and shares the disk as pnpm does. Those are a manager's concerns, though, and the first
criterion's runtime question doesn't turn on them, so they don't reopen the pick of Node. No npm
document says that npm copies rather than links. That reading comes from its code (pacote
22.0.0 untars each install into place), and the disk rows measure it.

The first criterion picks Node, clearly: the consensus runtime, both standard builds, and the
stronger stewardship. Between its managers it picks pnpm, narrowly. npm has the standard by use
(the default, and the web-component libraries' majority) and the stronger stewardship. pnpm has
the multi-package practice this stack is, the multi-package tooling npm still lacks (`workspace:`,
graph-aware runs, catalogs; the concerns table above), and the repository-release facts: it is
the only manager measured that installs a subdirectory at a prefixed tag; of the two that guard git dependencies, it takes a consumer's own
without a setting; and it never runs a git dependency's `prepare` while saying it didn't. Those
facts count only if spike-html-packages releases the layers from their repositories, the path
where npm is weakest. If it releases through a registry (GitHub Packages, JSR, or a self-hosted
one), they drop out and the call between the managers reopens: npm's standard and stewardship
against pnpm's multi-package practice and npm's monorepo gaps (no `workspace:`, no graph-ordered
runs, no catalogs, and open linked-layout bugs on workspaces). This stack is several layers
released from one repository, so those gaps still weigh on that path, and nothing here shows the
standard and stewardship outweigh them. spike-html-packages weighs that call with its hosting and
repository-layout decisions.

**Second: footprint.** Bun is smallest: 89.0 MB for one binary, against Node + npm's 236.8 MB
(271.1 MB with Vite for an app) and Node + pnpm's 283.3 MB (317.6 MB with Vite)
*(m 2026-10-16)*, 2.7 to 3.6 times the size. npm is 46.5 MB smaller than pnpm, node + npm 1.2
times smaller than node + pnpm. Neither gap is an order of magnitude, on the second criterion; they
don't overturn the first.

**Third: speed**, which counts only on an order-of-magnitude gap, bundler to bundler, like for like
*(m 2026-10-16, hyperfine means; each ratio is how many times faster Bun is than the Node step)*:

| step | Node + npm | Node + pnpm | Bun | ratio, npm; pnpm |
| --- | ---: | ---: | ---: | ---: |
| install, cold (loose) | 931.8 ms (linked 964.2 ms); re-run 1185.7 ± 60.0 ms (linked 1135.9 ± 180.8 ms) | 612.9 ± 356.9 ms; re-run 719.2 ± 373.7 ms | 297.3 ms; re-run 599.2 ± 416.3 ms | none: too loose |
| install, warm | 675.3 ms (linked 663.8 ms) | 173.5 ms | 14.5 ms | 46.6x; 12.0x |
| type check (shared tsc) | 73.7 ms | 73.7 ms | 73.7 ms | 1x |
| library build | tsc emit 77.9 ms | the same | bun build 6.1 ms | not like for like |
| app bundle | vite build 130.6 ms; esbuild 37.4 ms | the same | bun build 6.1 ms | 21.4x; 6.1x |
| watch rebuild | vite 19.7 ms; tsc 67.7 ms; esbuild 107.9 ms | the same | 15.6 ms | 1.3x; 4.3x; 6.9x |
| test | node --test 123.7 ms | the same | bun test 18.6 ms | 6.7x |

Only the installs differ between the Node columns: pnpm installs 3.9 times faster than npm warm,
under an order of magnitude, and npm's linked layout is within 2% of its hoisted one warm. The
cold figures are loose for all three managers: a re-run *(m 2026-10-16T14:11:31Z, hyperfine mean
± σ)* moved every cold mean, npm's by +254 ms and bun's to double, with σ up to 416.3 ms against
means of 599.2 to 1185.7 ms, and it put npm's linked layout ahead of its hoisted one. So no cold
ratio is drawn, and the cold row ranks nothing; the warm figures hold and carry the speed rows.
tsc emit transpiles each file and bundles nothing, so it isn't compared with `bun build`. The
table's measure run checked each bundle's shape: Vite wrote six entries and one shared Lit
chunk (20,567 bytes) that each Lit entry imports, esbuild and `bun
build` each wrote six self-contained entries with Lit inlined, and none holds Lit's development
build. Vite's 130.6 ms includes starting node and loading its config. Three gaps clear 10x: a
warm install against npm (46.6x) and against pnpm (12.0x), and a one-shot Vite bundle (21.4x). All
are under 700 ms per run at this size, and the edit loop, a Vite watch rebuild, is within 1.3x of
Bun's. Speed is the last criterion and these gaps don't reach a scale anyone waits on, so they
don't overturn the first either.

**The pick: Node 26 with one manager, pnpm provisionally, and never Bun beside it.** The industry
standard and maintainability decide it: Node over Bun clearly, and pnpm over npm narrowly, on the
multi-package practice and the repository-release facts, against npm's standard by use and its
stronger stewardship. The runtime is settled; pnpm holds until spike-html-packages decides how
the layers release, and a registry release reopens the choice between npm and pnpm. Footprint is
Bun's real advantage at about a third the size, and npm's at 46.5 MB; speed gaps of an order of
magnitude exist only where the absolute times are under a second.

**The build tool: tsc emit for the foundation and components, Vite for apps.** A library build is
tsc emit to unbundled ESM with `.d.ts`, the survey's library practice and Lit's guidance, which
leaves bundling to the app ([s17][lit-pub]): the same tsc that type-checks, so it adds no tool
(`mise run build:tsc`, 77.9 ms *(m 2026-10-16)*). An app's bundle is Vite, the survey's trend
([s13][sj25-build], [s15][vite8-blog]), adding 34.3 MB *(m 2026-10-16)* only where an app needs
it; the branches task confirms it at application scale. `bun build` leaves with Bun.

**esbuild doesn't earn its place.** Its build is 2.1x faster than tsc emit (37.4 ms against
77.9 ms) and 3.5x faster than Vite, and its watch rebuild is the slowest of the three (107.9 ms)
*(m 2026-10-16)*: no order-of-magnitude gap over the tools the column keeps. It adds a second
native binary to mirror for offline installs: esbuild 0.28.2 on npm is a stub with a `postinstall`
and 26 per-platform optional packages ([registry][esb-npm]). Vite 8 bundles with Rolldown and
lists esbuild only as optional ([migration guide][vite8]), so an app doesn't need it either; its
303.5M weekly downloads ([s14][npm-build]) are mostly transitive. It is 0.x, and one maintainer
wrote 93 of its 100 most recent commits ([commits][esb-commits], read 2026-10-16). Its pin stays
in `mise.toml` only for the measure task's comparison.

**What would reverse it.** Toward npm: npm installing a subdirectory with `::path:`, or npm
closing its multi-package gaps, with the `workspace:` protocol, graph-ordered workspace runs, and
catalogs ([npm/rfcs#765][npm-ws-rfc], [#707][npm-topo], and [#872][npm-catalog], all open, read
2026-10-16). Reopening it: spike-html-packages releasing through a registry rather than git tags,
which leaves no prefixed tags or git-tag dependencies to weigh, so npm's majority among the
libraries and its stronger stewardship, with its smaller footprint behind them, stand against
pnpm's multi-package practice and npm's monorepo gaps; spike-html-packages weighs that call with
its hosting and repository-layout decisions. Toward Bun: the survey's consensus moving, Bun's
runtime use nearing Node's or the web-component libraries adopting bun install or `bun build`;
Node losing its foundation or its LTS windows; an application-scale bundle where Vite against `bun build` is seconds against tenths, in
the edit loop rather than a one-shot build (the branches task measures it); or a hard footprint
limit, such as an offline mirror, that the extra 194.3 MB breaks.

### 2. The TypeScript form: `.ts` with a release build

**`.ts` with a release build, for the foundation and every layer above it** (the architect's
decision): one form and one check across the stack. Builds are cheap in a release, so the
zero-build argument for shipping source doesn't hold there.

Lines in `src/`, and brotli bytes (quality 11, unminified, as jsDelivr serves source)
*(m 2026-10-16, Forms)*:

| form | router | Lit element | vanilla element | globals.d.ts | lines | brotli |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `.ts`, strippable | 103 | 176 | 210 | — | 489 | 5,017 B |
| JSDoc + tsc | 119 | 185 | 225 | 18 | 547 | 5,168 B |
| plain JS | 83 | 156 | 200 | — | 439 | 4,318 B |

The Lit element's reactive properties:

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

Considered, and why they lost:

- **JSDoc checked by tsc** ran as written under node, bun, and Chromium from file://, with the
  same checked contract, and its one advantage was shipping with no build. It lost on readability
  and maintainability: types in comments, 58 more lines than `.ts` (12%) and 151 more brotli bytes
  (3%) *(m 2026-10-16)*, a separate `globals.d.ts` because JSDoc can't write `declare global`, and
  a tsc 7.0.2 declaration-emit fault on one typedef shape (a multi-line object typedef with quoted
  keys copies each line's `*` into the `.d.ts`, which then fails to parse; reproduced 2026-10-16).
  It is the survey's minority: 12 of the 13 web-component libraries write `.ts`, and the 13th,
  Vaadin, writes JS with hand-written `.d.ts`, not JSDoc ([s20][vaadin]). Outside the table,
  Svelte and Turbo are the known holdouts ([s10][svelte-src], [s11][turbo-pr]).
- **Plain JS** is the shortest, 50 lines and 699 brotli bytes under `.ts` *(m 2026-10-16)*, and
  runs everywhere as written, but nothing checks a type, so the element's contract (its
  properties and its events' detail) is unchecked. It lost on type safety.
- **`.ts`** matches the survey's majority: `.ts` source shipped as JS with `.d.ts`, and 39.9% of
  SoJS 2025 respondents write only TypeScript ([s6][sj25-usage]).

**What a release build must produce**, handed to spike-html-packages. As written, `.ts` loads
nowhere but Bun *(m 2026-10-16)*: node refuses to strip types under node_modules
(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), and jsDelivr serves a `.ts` as `text/plain` with
`nosniff`, which no browser runs (Lit's [`packages/lit/src/index.ts` at `lit@3.3.3`][lit-ts]). So
a release needs, for each `.ts` module:

- a `.js` ES module, unbundled and unminified with Lit a bare import, and its `.d.ts`; `tsc -p
  tsconfig.build.json` (`mise run build:tsc`) emits exactly that to `dist/tsc`;
- the built files in the tag (committed on the tagged commit) or in a release asset, because
  jsDelivr `/gh/` and a git-tag install serve only what the tag holds;
- `exports` pointing at the built `.js`, with its types, so no consumer resolves a `.ts`, and
  `files` naming the built output (npm and pnpm honour it; bun installs the whole tree
  regardless).

Not exercised: a relative import between `.ts` modules (the sources have none), which tsc emits
as written unless `rewriteRelativeImportExtensions` rewrites `./x.ts` to `./x.js`.

The JSDoc and plain JS forms stay in `src/` as this comparison's evidence, not as conventions.

### 3. Layout and direction: `layers/`, enforced by Biome

**The layout.** The layers are directories in one package, in `layers/`, beside `src/`, whose
per-form tree stays frozen as Results 2's evidence. `layers/` isn't in package.json's `exports`.
It holds five kinds of occupant, each a small `.ts` module:

```
layers/
  foundation/dom.ts                 the platform alone: define, emit, required
  components/status-badge.ts        a minimal Lit element on the foundation
  sdk/session.ts                    a Lit reactive controller, standing in for the auth hook
  apps/static/site/main.ts          a static-branch app
  apps/application/documents/       an application-branch app: main.ts, model.ts, views/list.ts
  apps/application/prompts/main.ts  a second application-branch app, the sibling the rules refuse
```

**The direction.** Every layer imports its own files, and none imports the package by its own
name, bare or with a subpath:

| layer | may import | never |
| --- | --- | --- |
| foundation | nothing else: no package, Lit included | any other layer |
| components | the foundation, Lit | the SDK, any app |
| SDK, a sibling of components | the foundation, Lit | components, any app |
| static-branch app | the foundation, components, Lit | the SDK, any other app |
| application-branch app | the foundation, components, the SDK, Lit | any other app |

STANDARDS.md holds the calls the check can't make: what belongs in each layer, and promoting an
app's element once a second app needs it.

**The mechanism.** Biome's `noRestrictedImports` ([rule][biome-nri]), at error level, in one
`biome.json` override per layer directory. The foundation, components, and SDK refuse a layer by
its directory name, at any depth, and the foundation refuses every bare specifier. An app can't
refuse a sibling by name, since a sibling is `../<name>`, so each app override refuses every
specifier that climbs out of the app and re-allows the permitted layers named from `layers/`.
That takes one override per file depth, 0 to 3 directories into an app; the deepest also covers
everything below it and fails closed. Biome's `../**` doesn't match a bare `..`, which resolves
to the parent directory's index, so each app override also names the bare form of its climb,
`..` and `../` in a file at the app's root, `../..` and `../../` one directory down, and so on. A
bare climb from an app, or from a components or SDK file, lands on a file directly in `layers/`,
`layers/apps/`, or a branch directory, which belongs to no layer: one more override covers those
and refuses every relative and absolute specifier and the package's own name there, so such a
file fails closed and can re-export no layer.

A re-allowed prefix would let a path climb back out of it, `../../../foundation/../sdk/session.js`
from the static app, so every override, in every layer, also holds the normalization convention:
a relative specifier starts with `./` or with its run of `../`, and no later segment is `.`,
`..`, or empty. Biome 2.5.15's globs have no character classes but do take brace alternation
(`{a,b}`), so the group names a segment that isn't `.` or `..` by its first characters: an
enumerated ASCII character (`a`–`z`, `A`–`Z`, `0`–`9`, `_ - @ $ ~ +`), `.` followed by one, or
`..` followed by one or by `.`. Each such segment followed by `..`, as the last segment or before
more, is refused, as are `./` followed by `..`, a `.` segment after the leading run, last or not,
an empty segment, and any segment holding `%`, since the URL parser reads `%2e%2e` as `..`. The
foundation, which refuses every specifier but its own relative paths, re-allows its own index,
`.` and `..` bare, beside `./**` and `../**`, which don't match them. A second group refuses an
absolute specifier, `/layers/sdk/session.js`, which resolves against the origin and so escapes
every layer rule. Normalized names that hold dots stay allowed: `./..x/y.js`,
`./.well-known/a.js`, `x..y`, `...`.

`test/layers.test.js` runs the pinned Biome over two scratch trees built from
`test/layers-tree.js` in the check. The violation tree is 62 files, one import each, covering
every forbidden edge, the four import forms (`import`, `export … from`, `import type`, and
`import()`), the package's own name, an absolute path, fifteen paths that aren't normalized, and
three bare climbs: 6 in the foundation, 8 in components, 5 in the SDK, 23 in the static app, 17
in the application app, and 3 outside any layer or app, in `layers/` and in each branch
directory. The non-normalized ones are `./../`, a descend-then-climb path, and a
layer-name-then-`..` path in each app branch, a `.`, an empty, a `...`, and a `%2e%2e` segment,
the trailing `./..`, `../../../foundation/..`, and `./views/..`, and one in components; the bare
climbs are `..` from the static app and `../` and `../..` from
the application app. Each non-normalized path, the bare `..`s, and the three files outside a
layer passed `biome.json` before these rules. The allowed tree is 14 files of permitted imports in
the same forms, with the dotted names above and a nested foundation index importing `..` and
`./`. The test passes only when the rule flags exactly the 62 and none of the 14, so a rule that
refuses everything or nothing fails it. Measured: 62 of 62 and 0 of 14 *(m 2026-10-16T18:23:55Z)*.

**What it can't see.** The rule matches the import's text, never the resolved file, so a
symlink or a server mapping the text doesn't show is outside it. The app overrides go one per
file depth, and a file more than three directories into an app fails closed, its outward imports
refused, permitted ones included. And the normalization groups know a name segment only by its
first characters, so a segment that starts with a non-ASCII character, followed by `..`, isn't
refused: `../../../foundation/é/../../sdk/session.js` from the static app passes (reproduced
2026-10-16 against this `biome.json`; the `%` patterns refuse `%7Ex/..` and `%2e%2e`).

The groups cost Biome time on every run, format included, so the cost is in loading the
configuration rather than in linting: over the 21-file tree `biome lint` took 62.5 ms with them
against 32.3 ms without, and `biome format` 59.1 ms against 28.8 ms (hyperfine, 30 runs,
2026-10-16). Results 6's timings include them.

**Rejected:**

- **dependency-cruiser** ([repo][depcruise]): it checks the resolved module graph, so it would
  close the remaining text-against-file gap above, which text matching can't. It is an extra pin,
  a Node package beside the linter the check already runs, for one rule the linter covers on
  every specifier the normalization convention admits.
- **tsc project references** ([handbook][ts-refs]): one project per layer, each referencing only
  what it may import. `tsc -b` writes output even when the build fails, and the check writes
  nothing. Reproduced with tsc 7.0.2, 2026-10-16: two projects, the second with a type error,
  exited 2 and wrote both projects' `.js`, `.d.ts`, and `.tsbuildinfo`; `tsc -b --noEmit` is
  refused (TS6310, a referenced project may not disable emit) and still writes both
  `.tsbuildinfo` files.
- **ESLint's `no-restricted-imports`** ([rule][eslint-nri]): it never checks an `import()`
  expression, so it flags 57 of the 62 violation files, missing the five dynamic edges, and it
  needs `biome.json`'s groups translated to regular expressions: ESLint reads a group as
  gitignore lines, where a `!` line can't re-include a `./` or `../` path, so the groups copied
  as written also flag all 14 allowed files *(m 2026-10-16T18:23:55Z)*. Results 6 weighs it
  as a setup.

**Handed on.**

- To spike-html-packages: the package-boundary facts. pnpm refuses an import of an undeclared
  package, a phantom dependency, by default (Results 1, amendment 13), and Biome's
  `noUndeclaredDependencies` ([rule][biome-nud]) refuses one in the lint. So if the layers become
  packages, each package's declared dependencies enforce the direction between them, by resolved
  file rather than by text; whether they do is spike-html-packages' call. So is the import
  extension the releases use: the occupants import `.js` paths, which bundler resolution maps to
  `.ts` with no compiler option.
- To components or spike-html-apps: herald's elements import domain code. Four files in
  `app/client/ui/elements` import from `@domains` ([herald][herald-elements], 6fc22b3, read
  2026-10-16): `classify-progress.ts` the `WORKFLOW_STAGES` constant and the `WorkflowStage`
  type, `document-card.ts` the `WorkflowStage` and `Document` types, `prompt-card.ts` the `Prompt`
  type, and `blob-viewer.ts` the `findFormat` lookup. Under this layout a component may not: the
  types become the element's own props, and the constant and lookup move up to the app or down
  into the element.
- To branches: the app-internal tiers (modules and views), and whether static pages use Lit.
  STANDARDS.md records the second as undecided.

### 6. Lint and format: Biome

Three setups over one copy of `src/`, `layers/`, and `test/` (21 files), each from mise pins that
only the measure task uses, plus Biome, the check's tool *(m 2026-10-16T18:23:55Z)*:

| fact | A: Biome 2.5.15 | B: ESLint 10.13.0 + Prettier 3.9.10 | C: oxlint 1.88.0 + oxfmt 0.73.0 |
| --- | --- | --- | --- |
| runs as | one native binary | Node scripts; ESLint also needs typescript-eslint 8.71.2, @eslint/js 10.0.1, globals 17.13.0, and typescript 6.0.3 installed beside it | Node scripts, each loading a native addon |
| footprint | 66.7 MB, no runtime | 51.8 MB (ESLint 11.2 MB, Prettier 10.0 MB, the four packages and their dependencies, 30 in all, 30.6 MB), plus node | 35.6 MB, plus node |
| reproduces the tree's formatting, byte for byte | yes, from `biome.json`'s three options | yes, with 15 options set, `embeddedLanguageFormatting` off among them | yes, with Prettier's options |
| Lit's templates, at the default | left as written | reformatted in the three `pagination-lit` files | the same as Prettier |
| file types its default run touches, of the repository's 54 tracked files in 9 types | js, json, ts | js, json, md, ts, yaml | js, json, md, toml, ts |
| limited to code | `files.includes` | a `.prettierignore` | the same `.prettierignore` |
| what its default run rewrites, beside code | nothing | `context/README.md`, 144 of 980 lines; `pnpm-lock.yaml`, 23 of 59 lines into 38 | `context/README.md`, 143 of 980 lines; `package.json`, one key moved |
| direction rule, violation tree | 62 of 62 | 57 of 62: no `import()` | 62 of 62, merged; 54 of 62 with the groups as written |
| direction rule, allowed tree | 0 of 14 | 0 of 14, as regular expressions; 14 of 14 with the groups as written | 0 of 14 |
| the groups from `biome.json` | as written | translated to regular expressions | merged into one group per override: a `!` pattern matching in one group re-allows what another refuses, and a lookaround regex flags nothing |
| lint + format, hyperfine mean | 121.3 ms | 863.9 ms | 94.2 ms |

Prettier rewrites the README by padding every table's cells to the column's width, rewriting
`*emphasis*` as `_emphasis_`, and adding a blank line before a table in a list; oxfmt does about
the same, and moves package.json's `"type"` key (reproduced 2026-10-16 on copies).

**First: industry standard and maintainability.** ESLint + Prettier is the industry standard,
clearly: 9,697 and 9,295 SoJS 2025 respondents against Biome's 1,762 and oxlint's 123 write-ins
([s1][sj25-other]); 158.7M and 139.1M npm downloads against Biome's 17.9M and oxlint's and oxfmt's
26.8M and 17.1M ([s57][npm-lint], [s58][npm-biome]); and ESLint in 10 and Prettier in 11 of the
13 web-component libraries, where Biome is in one (FAST) and Oxc in none (Ecosystem survey, Lint
and format). Oxc's tools have neither the use nor the libraries, and oxfmt is still 0.x. Against
the standard, B's measured gaps:

- **Direction.** ESLint's rule can't enforce the layer direction on `import()`, the form an app
  uses to load a view lazily: 5 of the 62 violation files have no expression in it at all. The
  evidence 3 check needs every edge, and Biome and oxlint flag all 62. Closing it in ESLint takes
  another plugin, a fifth package, which wasn't measured. Its working config is also a regex
  translation of glob groups, where Biome reads the groups as written; oxlint reads them too, but
  only with each override's groups merged into one.
- **What it adds to the check.** Two tools on Node, plus four packages installed for ESLint,
  where the check today runs one binary with no package install; six versions to keep current
  against one.
- **Configurability.** The architect's view is that Prettier is inflexible. On this tree it
  matched every option: with 15 set it reproduces all 21 files byte for byte, as oxfmt does. So
  the configurability concern didn't hold here. Both need `embeddedLanguageFormatting` off,
  though, or they reformat Lit's templates, which Biome leaves alone by default.
- **Content scope.** The architect's view is that Prettier is heavy-handed on content, Markdown
  included, and that held. By default Prettier formats Markdown and YAML, rewrites 144 of the
  README's 980 lines (the README as it stood at that run) and the pnpm lockfile, and oxfmt does
  about the same and reorders package.json. Biome's default touches only js, json, and ts. Each
  can be limited to code, Biome by `files.includes` and the other two by a `.prettierignore`, so
  the cost is a default to undo, not a limit.

The standard is B's; maintainability is A's, and the gap that decides it isn't taste: ESLint can't
express the check this task adds. A tool that leaves the lazy `import()` edges unenforced doesn't
carry the standard's weight for this check, so the first criterion picks Biome, against the
standard by use, as Results 1 picked pnpm against npm's. oxlint matches Biome on direction once
its groups are merged, but it is not the standard either, and it brings Node, an addon, and a 0.x
formatter that reorders package.json.

**Second: footprint.** Node is already the toolchain's runtime (Results 1), so the setups add
their own installs: B 51.8 MB and C 35.6 MB against Biome's 66.7 MB *(m 2026-10-16T18:23:55Z)*.
Biome is the largest by 14.9 MB over B and 31.1 MB over C, 1.3 and 1.9 times the size, not an
order of magnitude, so it doesn't overturn the first. B's 30.6 MB of packages is also an install
the check doesn't have today.

**Third: speed**, only on an order-of-magnitude gap. Lint and format together take 94.2 ms under
oxlint + oxfmt, 121.3 ms under Biome, and 863.9 ms under ESLint + Prettier
*(m 2026-10-16T18:23:55Z)*: ESLint + Prettier is 7.1 times slower, under an order of magnitude,
and ESLint alone 10.1 times (614.3 ms against 60.9 ms), but all of it is under a second at this
size. oxlint + oxfmt is 1.3 times faster than Biome, whose every run carries the normalization
groups' cost (Results 3). Speed doesn't decide it.

**The pick: Biome stays in the check**, for lint, format, and the layer direction, with
`biome.json` as it is. ESLint + Prettier is the clear standard, and the evidence weighs against it
on maintainability: it can't enforce the direction on `import()`, it needs Node and four packages
in the check, and its formatter rewrites Markdown and the lockfile unless limited. Its
configurability matched Biome's on this tree. Footprint slightly favours the other two, and speed
doesn't decide it: ESLint + Prettier is 7.1 times slower together, under an order of magnitude
and under a second, and oxlint + oxfmt is 1.3 times faster than Biome, a gap of 27 ms.

**What would reverse it.** Toward ESLint + Prettier: ESLint's rule checking `import()`, or a
measured plugin closing the gap at one more pin; or spike-html-packages making the layers
packages, where declared dependencies enforce the direction (Results 3) and the lint rule's gap
stops deciding, leaving the standard. Toward oxlint + oxfmt: oxfmt reaching 1.0 and the libraries
or SoJS taking up Oxc's tools.

### 7. Consumption

- **Installed by git tag, offline** (the check, 2026-10-16): npm and pnpm install this package's
  `files` (package.json and `src/`, 11 files) and 114 of spike-html-design v0.7.0's 115, leaving
  out `.gitignore`; npm only with allow-git=root in the consumer's `.npmrc`. bun installs the tag's
  whole tree (43 and 115 files), ignoring `files`. Every file equals the tag's byte for byte.
- **Installed from GitHub by tag** *(m 2026-10-16)*: spike-html-design v0.7.0 (commit fe75220)
  under npm and pnpm (114 of 115 files each) and bun (115 of 115), each the tag's byte for byte
  and the same set as the offline install.
- **jsDelivr** *(m 2026-10-16)*: spike-html-design v0.7.0's two modules and its stylesheet, each
  with its JavaScript or CSS content type, `max-age=31536000, immutable`, CORS open to any
  origin, and bytes equal to the tag's.
- **file://** *(m 2026-10-16)*: four pages in headless Chromium load spike-html-design v0.7.0
  and Lit 3.3.3 from jsDelivr, Lit through an import map, and the element's JSDoc and plain JS
  forms in Lit and vanilla, from this working tree until v0.1.0 is released; each element is
  defined and renders page 3 of 7. The `.ts` form loads only once built (Results 2).
- **Refusals** *(m 2026-10-16)*: node won't strip `.ts` under node_modules, and bun imports it.
  npm 12 refuses any git-tag dependency by default (`EALLOWGIT`, allow-git=none); with
  allow-git=root it refuses a git-tag package's own git-tag dependency, and allow-git=all installs
  it. pnpm refuses that nested dependency (`ERR_PNPM_EXOTIC_SUBDEP`) by default and installs it
  with `blockExoticSubdeps: false` in the consumer's `pnpm-workspace.yaml`; bun installs it as is.
  npm runs a git dependency's `prepare` when it packs the clone while warning that its install
  scripts were blocked; `--ignore-scripts` skips it. pnpm refuses that dependency
  (`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`) until `allowBuilds` names its resolved spec, and bun
  installs it without running `prepare`, reporting it blocked, until `trustedDependencies` names
  it. Handed to spike-html-packages.
- **Prefixed tags** *(m 2026-10-16)*, from a local, unpushed `fixture/v0.1.0`: pnpm installs the
  subdirectory with `#fixture/v0.1.0&path:/fixture` (11 files); bun can't resolve the spec; npm
  ignores `&path:` as an unknown key, and its own `#fixture/v0.1.0::path:fixture` resolves the tag
  to its commit, then fails to install it. Handed to spike-html-packages.
- **This package from GitHub by tag** *(m 2026-10-16T17:15:39Z, a run after its v0.1.0 tag was
  pushed)*: v0.1.0 (commit 3b68fb8) under npm and pnpm (its `files`, 11 of the tag's 43) and bun
  (43 of 43), each the tag's byte for byte, its exports map resolving, and the same set as the
  offline install. v0.1.0 ships source only; the release build is spike-html-packages'.
- **This package on jsDelivr** *(the same run)*: each of its nine source files at v0.1.0, with
  `max-age=31536000, immutable`, CORS open to any origin, and bytes equal to the tag's. The six
  `.js` files in `src/jsdoc/` and `src/js/` come as `application/javascript`, and the three in
  `src/ts/` as `text/plain` with `nosniff`, so a browser won't run them as modules.
- **file://, released** *(the same run)*: the four pages load spike-html-design v0.7.0, Lit
  3.3.3, and the element's JSDoc and plain JS forms in Lit and vanilla, all from jsDelivr at their
  tags; each element is defined and renders page 3 of 7.

[node-sched]: https://github.com/nodejs/Release/blob/main/schedule.json
[node-blog]: https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
[pnpm-oc]: https://opencollective.com/pnpm
[pnpm-rel]: https://github.com/pnpm/pnpm/releases
[pnpm-gh-latest]: https://api.github.com/repos/pnpm/pnpm/releases/latest
[pnpm-tags]: https://registry.npmjs.org/-/package/pnpm/dist-tags
[pnpm-commits]: https://api.github.com/repos/pnpm/pnpm/commits?per_page=100
[bun-heise]: https://heise.de/-11102416
[bun-lic]: https://github.com/oven-sh/bun/blob/main/LICENSE.md
[bun-rel]: https://github.com/oven-sh/bun/releases
[bun-14]: https://bun.com/1.4
[bun-commits]: https://api.github.com/repos/oven-sh/bun/commits?per_page=100
[esb-npm]: https://registry.npmjs.org/esbuild/0.28.2
[vite8]: https://vite.dev/guide/migration
[esb-commits]: https://api.github.com/repos/evanw/esbuild/commits?per_page=100
[lit-ts]: https://cdn.jsdelivr.net/gh/lit/lit@lit@3.3.3/packages/lit/src/index.ts
[openjs]: https://openjsf.org/projects
[npm-github]: https://github.blog/news-insights/company-news/npm-is-joining-github/
[ms-github]: https://news.microsoft.com/2018/06/04/microsoft-to-acquire-github-for-7-5-billion/
[npm-lic]: https://github.com/npm/cli/blob/latest/LICENSE
[npm-rel]: https://github.com/npm/cli/releases
[npm-commits]: https://api.github.com/repos/npm/cli/commits?per_page=100
[npm-terms]: https://docs.npmjs.com/policies/open-source-terms
[npm-12]: https://github.com/npm/cli/releases/tag/v12.0.0
[npm-tags]: https://registry.npmjs.org/-/package/npm/dist-tags
[pnpm-readme]: https://github.com/pnpm/pnpm/blob/04cfce2e34f614a5351a7a46f78249c47fac8170/README.md
[pnpm-why]: https://www.kochan.io/nodejs/why-should-we-use-pnpm.html
[pnpm-flat]: https://pnpm.io/blog/2020/05/27/flat-node-modules-is-not-the-only-way
[npm-linked-stable]: https://github.com/npm/cli/pull/9674
[npm-phantom]: https://github.com/npm/cli/blob/v12.2.1/docs/lib/content/using-npm/developers.md
[bun-isolated]: https://bun.com/docs/pm/isolated-installs
[pnpm-hoist]: https://pnpm.io/settings/node-modules
[npm3-nondet]: http://web.archive.org/web/20160304015820/https://docs.npmjs.com/how-npm-works/npm3-nondet
[npm-lock]: https://github.com/npm/cli/blob/v12.2.1/docs/lib/content/configuring-npm/package-lock-json.md
[bun-install]: https://bun.com/docs/pm/cli/install
[npm-cache]: https://docs.npmjs.com/cli/v12/commands/npm-cache
[pnpm-motivation]: https://pnpm.io/motivation
[bun-cache]: https://bun.com/docs/pm/global-cache
[npm-topo]: https://github.com/npm/rfcs/issues/707
[npm-ws-proto]: https://github.com/npm/cli/issues/8845
[npm-catalog]: https://github.com/npm/rfcs/issues/872
[npm-ws-rfc]: https://github.com/npm/rfcs/issues/765
[npm-10082]: https://github.com/npm/cli/issues/10082
[npm-9982]: https://github.com/npm/cli/issues/9982
[pnpm-filter]: https://pnpm.io/filtering
[pnpm-ws]: https://pnpm.io/workspaces
[pnpm-catalogs]: https://pnpm.io/catalogs
[bun-filter]: https://bun.com/docs/pm/filter
[bun-ws]: https://bun.com/docs/pm/workspaces
[bun-catalogs]: https://bun.com/docs/pm/catalogs
[corepack-vote]: https://github.com/nodejs/TSC/pull/1697
[corepack-pr]: https://github.com/nodejs/node/pull/59835
[corepack-26]: https://nodejs.org/docs/latest-v26.x/api/corepack.html
[pnpm-install]: https://pnpm.io/installation
[biome-nri]: https://biomejs.dev/linter/rules/no-restricted-imports/
[biome-nud]: https://biomejs.dev/linter/rules/no-undeclared-dependencies/
[depcruise]: https://github.com/sverweij/dependency-cruiser
[ts-refs]: https://www.typescriptlang.org/docs/handbook/project-references.html
[eslint-nri]: https://eslint.org/docs/latest/rules/no-restricted-imports
[herald-elements]: https://github.com/JaimeStill/herald/tree/6fc22b3cb492/app/client/ui/elements

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
