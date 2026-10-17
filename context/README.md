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
  Results 3 keeps the foundation free of every package and lets a static-branch app import Lit;
  whether static pages use it is the `branches` task's call. Results 4 makes Lit with a shadow
  root the default for components, each component's styles in its own `.css` file.
- **Stack:** foundation (native only, no framework: the design system plus `.ts` modules shipped
  through a release build, per Results 2; its tools split into utilities, structure/layout, and
  meta components/variants, with layouts folded into structure); components (the element tier:
  props and attributes in, events out, internal UI state allowed, no services, data fetching, or
  app state; an app's internal element is promoted once a second app needs it); apps (a static
  branch, and an application branch, standalone or embedded, whose modules and views stay inside
  the app). Results 3 lays these out as the directories of `layers/`, adds the application SDK
  as a sibling of components, and enforces the import direction between them in the check.

## The evidence

1. Node 26 with npm or pnpm against Bun 1.4, measured on git-tag install, TS, build, watch,
   test, lint, and jsDelivr, with a pick.
2. The three-way TS form comparison on the same element and module: `.ts` with type stripping,
   JS with JSDoc and a type check, and plain JS, with the spike's own conclusion. DHH/Turbo and
   Svelte/JSDoc are positions to weigh, not answers.
3. The directory, module, and layer layout and the import direction per stack layer, as
   STANDARDS.md judgement calls plus a check that enforces the direction.
4. Two element-tier components, a pagination container and the entry it holds, each built in
   vanilla and in Lit, with a shadow root and in light DOM, compared on the features vanilla
   builds by hand, what each serves in development and production, and the architect's reading
   of the files, with source lines and brotli bytes as context.
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
  ESLint in 10 and Prettier in 11. Catalyst and relative-time-element take Prettier through
  `@github/prettier-config` and `eslint-plugin-github`, which runs it as an ESLint rule and
  depends on `prettier`
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
  8.9 MB; *m 2026-10-16T21:11:09Z*, Results). Biome is one native binary.

The ESLint plugins the comparison measures, and the one it leaves out (npm, the same week;
[s67][npm-stylistic], [s68][npm-plugins], and each package's registry document):

| package | latest | npm downloads | accepts ESLint 10 | what it does here |
| --- | --- | ---: | --- | --- |
| `@stylistic/eslint-plugin` ([s70][reg-stylistic]) | 5.10.0 | 6.16M | yes, `^9.0.0 \|\| ^10.0.0` | formatting as lint rules, for code |
| `eslint-plugin-jsonc` ([s71][reg-jsonc]) | 3.4.2 | 1.50M | yes, `>=9.38.0` | lint and formatting rules for JSON |
| `eslint-plugin-boundaries` ([s72][reg-boundaries]) | 7.2.0 | 1.93M | yes, `>=6.0.0` | the layer direction, by resolved file |
| `eslint-plugin-import-x` ([s73][reg-importx]) | 4.17.1 | 6.76M | yes, `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | the layer direction (`no-restricted-paths`) and `no-unresolved`, by resolved file |
| `eslint-plugin-import` ([s74][reg-import]) | 2.32.0 | 62.54M | no: every release's range ends at `^9`; 2.32.0 is from 2025-06-20 | left out |
| `typescript-eslint` ([s77][reg-tse]) | 8.71.2 | 89.73M | yes, `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | TypeScript parsing and rules, in both ESLint setups |

- ESLint Stylistic began when ESLint and typescript-eslint deprecated their formatting rules
  "due to the maintenance cost", and it ports and maintains those rules ([s69][stylistic-readme]).
  ESLint's announcement (2023-10-26, ESLint v8.53.0) recommends a formatter first: "We recommend
  using a source code formatter instead of ESLint for formatting your code", naming Prettier and
  dprint. Only "if the idea of using a dedicated source code formatter doesn't appeal to you" does
  it point to the Stylistic packages ([s66][eslint-dep]).
- Stylistic's rules fix what each rule sees and have no line-width reflow, and `max-len` has no
  fixer, so a call split across lines stays split. A joined line can stay past the width
  unreported: `max-len` with `ignoreStrings` skips a line that holds a string, and from the
  disturbed code the restore exits 0 with 6 more lines past 100 columns than the original
  (*m 2026-10-16T21:11:09Z*, Results 6).
- `eslint-plugin-import-x` is the un-ts organization's fork of `eslint-plugin-import`, which has no
  release accepting ESLint 10; its `next` dist-tag is `2.0.0-beta.1` ([s74][reg-import]).
  `eslint-plugin-boundaries` uses import-x's `no-unresolved` beside its own rule here, so both
  ESLint setups install import-x either way.

Stewardship, read 2026-10-16. Funding is each Open Collective's JSON (`yearlyIncome`, in cents,
and `backersCount`, at `opencollective.com/<slug>.json`); maintainers are npm's `maintainers` for
the package, the publishers, and the team page where one exists; organization members are the
public members of each GitHub organization (`gh api orgs/<org>/members`).

| tool | organization or foundation | maintainers | funding |
| --- | --- | --- | --- |
| ESLint | an OpenJS Foundation project, in its At-Large category ([s90][openjs]) | a Technical Steering Committee of 3, 2 reviewers, and 5 committers ([s88][eslint-team]); reviewers and committers may invoice their hours, at $80 and $50 an hour ([s89][eslint-gov]); npm publishers `openjsfoundation` and `eslintbot` ([s75][reg-eslint]) | Open Collective $146,977 a year, 546 backers ([s80][oc-eslint]) |
| Prettier | none: not in OpenJS's project list ([s90][openjs]); its own GitHub organization, copyright "James Long and contributors" | 11 npm publishers, one a bot (`prettier-bot`) ([s76][reg-prettier]); 27 public organization members | Open Collective $58,056 a year, 351 backers ([s81][oc-prettier]) |
| ESLint Stylistic | its own GitHub organization, `eslint-stylistic`, begun 2023 ([s69][stylistic-readme]) | 8 public organization members, Anthony Fu among them; its one npm publisher is `eslint-stylistic-bot` ([s70][reg-stylistic]) | Open Collective $1,165 a year, 4 backers ([s82][oc-stylistic]) |
| typescript-eslint | "an independent open source project. Its members are volunteer open source developers" ([s91][tse-team]) | 4 maintainers and 5 committers ([s91][tse-team]); npm publishers `jameshenry` and `bradzacher` ([s77][reg-tse]) | Open Collective $31,255 a year, 135 backers ([s83][oc-tse]) |
| eslint-plugin-boundaries | none: a user's repository, `javierbrea/eslint-plugin-boundaries` | one: `javierbrea`, its only npm maintainer ([s72][reg-boundaries]) | GitHub Sponsors, `javierbrea` ([s99][boundaries-funding]); no Open Collective, and no `funding` field |
| eslint-plugin-import-x | the un-ts GitHub organization, 4 public members | one npm maintainer, `jounqin` ([s73][reg-importx]) | the organization's Open Collective, `unts` ([s100][unts-funding]), $126 a year, 4 backers ([s86][oc-unts]); the collective its package's `funding` names, `eslint-plugin-import-x`, $0, 0 backers ([s87][oc-importx]) |
| eslint-import-resolver-typescript, under boundaries' rule | the import-js GitHub organization, which holds eslint-plugin-import, 2 public members; authored by Alex Gorbatchev, and most commits are JounQin's, 141 of the repository's ([s102][resolver-repo]) | npm maintainers `jounqin`, `alexgorbatchev`, and `bradzacher` ([s101][reg-resolver]); 4.4.5 (2026-06-01) is its first release since 4.4.4 (2025-06-25) | the collective its package's `funding` names, `eslint-import-resolver-typescript`, $0 a year, 2 backers ([s103][oc-resolver]); its `FUNDING.yml` names the `unts` collective, $126 a year, 4 backers ([s86][oc-unts]), and JounQin's GitHub Sponsors ([s104][resolver-funding]) |
| eslint-plugin-jsonc | none: a user's repository, `ota-meshi/eslint-plugin-jsonc` | npm maintainers `ota-meshi` and `jounqin` ([s71][reg-jsonc]) | GitHub Sponsors, `ota-meshi`, its `funding` field ([s71][reg-jsonc]) |
| Biome | none: its own GitHub organization, the community fork of Rome, announced 2023-08-29 after Rome Tools Inc. laid off its employees; "led and maintained by the same people that maintained Rome so far" ([s93][biome-ann]) | 8 core contributors and 6 maintainers ([s94][biome-people]), under a lead / core contributor / maintainer model ([s92][biome-gov]); 5 npm publishers ([s78][reg-biome]) | Open Collective $30,433 a year, 38 backers ([s84][oc-biome]), and GitHub Sponsors; funds are paid only through Open Collective ([s92][biome-gov]); Depot, its "exclusive platinum sponsor" since 2025-12-01, provides its CI runners ([s95][biome-depot]) |
| Oxc (oxlint, oxfmt) | VoidZero Inc., which "holds the copyrights, funds the development, and controls the direction" of Oxc ([s96][vz-seed]); VoidZero joined Cloudflare, announced 2026-06-04, with Oxc to "remain open-source and MIT-licensed" and its team leading it ([s98][vz-cf]) | one npm publisher, `boshen` ([s79][reg-oxlint]); 11 public organization members | VoidZero's $4.6M seed (2024-10-01, [s96][vz-seed]) and $12.5M Series A (2025-10-30, [s97][vz-a]), before the Cloudflare acquisition; Open Collective $43,039 a year, 26 backers ([s85][oc-oxc]) |

- Open Collective's figures are what each collective received through it in the last year; they
  don't count GitHub Sponsors, employers' time, or a sponsor's services, such as Depot's runners
  for Biome.
- Three of the ESLint plugins rest on one or two people: boundaries on one maintainer, in a
  user's repository; import-x on one npm maintainer, in a four-member organization; and jsonc on
  two npm maintainers, in a user's repository. The resolver boundaries' rule needs,
  eslint-import-resolver-typescript, has three npm maintainers, import-x's `jounqin` and
  typescript-eslint's `bradzacher` among them, draws nothing through its own collective, and its
  last two releases are eleven months apart. Of the ten, ESLint and Prettier draw the most through
  Open Collective; Oxc's backing is a company's venture funding, now Cloudflare's.

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
[eslint-dep]: https://eslint.org/blog/2023/10/deprecating-formatting-rules/
[npm-stylistic]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/@stylistic/eslint-plugin
[npm-plugins]: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/eslint-plugin-jsonc,eslint-plugin-boundaries,eslint-plugin-import-x,eslint-plugin-import,typescript-eslint
[stylistic-readme]: https://github.com/eslint-stylistic/eslint-stylistic/blob/7736997ad57c/README.md
[reg-stylistic]: https://registry.npmjs.org/@stylistic/eslint-plugin
[reg-jsonc]: https://registry.npmjs.org/eslint-plugin-jsonc
[reg-boundaries]: https://registry.npmjs.org/eslint-plugin-boundaries
[reg-importx]: https://registry.npmjs.org/eslint-plugin-import-x
[reg-import]: https://registry.npmjs.org/eslint-plugin-import
[reg-eslint]: https://registry.npmjs.org/eslint
[reg-prettier]: https://registry.npmjs.org/prettier
[reg-tse]: https://registry.npmjs.org/typescript-eslint
[reg-biome]: https://registry.npmjs.org/@biomejs/biome
[reg-oxlint]: https://registry.npmjs.org/oxlint
[oc-eslint]: https://opencollective.com/eslint.json
[oc-prettier]: https://opencollective.com/prettier.json
[oc-stylistic]: https://opencollective.com/eslint-stylistic.json
[oc-tse]: https://opencollective.com/typescript-eslint.json
[oc-biome]: https://opencollective.com/biome.json
[oc-oxc]: https://opencollective.com/oxc.json
[oc-unts]: https://opencollective.com/unts.json
[oc-importx]: https://opencollective.com/eslint-plugin-import-x.json
[eslint-team]: https://eslint.org/team/
[eslint-gov]: https://github.com/eslint/eslint/blob/4637f9827a1b/docs/src/contribute/governance.md
[tse-team]: https://typescript-eslint.io/maintenance/team
[biome-gov]: https://github.com/biomejs/biome/blob/fd19c59592a5/GOVERNANCE.md
[biome-ann]: https://biomejs.dev/blog/announcing-biome/
[biome-people]: https://biomejs.dev/internals/people-and-credits/
[biome-depot]: https://biomejs.dev/blog/depot-exclusive-sponsor/
[vz-seed]: https://voidzero.dev/posts/announcing-voidzero-inc
[vz-a]: https://voidzero.dev/posts/announcing-series-a
[vz-cf]: https://voidzero.dev/posts/voidzero-cloudflare
[boundaries-funding]: https://github.com/javierbrea/eslint-plugin-boundaries/blob/50f2d3193ec5/.github/FUNDING.yml
[unts-funding]: https://github.com/un-ts/.github/blob/aed33c928b71/FUNDING.yml
[reg-resolver]: https://registry.npmjs.org/eslint-import-resolver-typescript
[resolver-repo]: https://github.com/import-js/eslint-import-resolver-typescript
[oc-resolver]: https://opencollective.com/eslint-import-resolver-typescript.json
[resolver-funding]: https://github.com/import-js/eslint-import-resolver-typescript/blob/724c47d8c08f/.github/FUNDING.yml

## Results

Every measured figure below is from a dated run of `mise run measure`. Results 1, 2, and 7 cite
the run of **2026-10-16T14:03:02Z (UTC)** as *(m 2026-10-16)*, unless a citation names another
run. That covers the timings and rows, each mise tool's installed size (its Footprint section,
`mise where` and `du -sb`), and the lines and brotli bytes of `src/` (its Forms section), with
every tool's version as pinned in `mise.toml`. Results 3 and 6, and the Lint and format survey
where it cites a run, cite the run of **2026-10-16T21:11:09Z (UTC)** as
*(m 2026-10-16T21:11:09Z)*, for the layer rules and the four setups' lint and format rows; it ran
after the check moved to ESLint + Prettier, with eslint pinned at 10.12.0, and after measure
gained ESLint Stylistic, the resolved-file direction plugins on trees whose imports name real
files, the split formatting rows, and the surface rows, and all 105 of its rows passed.
Results 4 cites the run of **2026-10-17T23:45:28Z (UTC)** as *(m 2026-10-17T23:45:28Z)*, for
the components' served bytes and source sizes, with pnpm at 12.14.0, after the shadow versions
moved onto the foundation's port, measure gave its adopted sheets their own chunk,
`scripts/css-sheets.js` minified the sheets it builds in production, and each production row
required that no file outside Lit's chunk hold a comment; all 121 of its rows passed. Results 6's
later CSS-scope figures keep the run of 2026-10-17T20:35:52Z they cite.
File counts from the offline installs are from `mise run check` the same day. Survey figures cite
the Ecosystem survey's sources, and other facts from outside the spike carry their own source and
date.

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
  12.14.0 pin is what mise resolves natively: `mise latest pnpm` answers 12.14.0, since mise
  resolves pnpm through `aqua:pnpm/pnpm` (`mise registry pnpm`), which reads the release pnpm
  marks latest on GitHub (v12.14.0, released 2026-10-15; [latest release][pnpm-gh-latest], read
  2026-10-17). The pin follows the tool manager's own resolution, so `mise use pnpm` and
  `mise run currency` agree on it, and currency reports it current. The registry agrees: npm's
  `latest` dist-tag is also 12.14.0 ([dist-tags][pnpm-tags], read 2026-10-17). The measurements
  below ran on the earlier pin, 12.11.2, and keep it. pnpm's lead maintainer wrote 65 of its 100 most recent commits
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

**Native CSS doesn't reopen it** (Results 4, 2026-10-17). Herald's "native CSS" under Bun was a
33-line `BunPlugin` turning a `.module.css` import into a constructed sheet, and Bun 1.4.3 itself
imports a standard CSS module script (`with { type: "css" }`) as `{}`. The components' `.css`
files load through a local Vite plugin of about 30 lines for apps and natively in the browser
from tsc's emit, so Bun's CSS gives it no edge the pick missed.

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

### 3. Layout and direction: `layers/`, enforced by resolved file, provisionally

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

**The mechanism, provisional with Results 6's pick.** The check runs ESLint + Prettier, and it
enforces the direction with eslint-plugin-boundaries 7.2.0's `dependencies` rule
([s72][reg-boundaries]) at error level, with eslint-plugin-import-x's `no-unresolved` beside it,
in `eslint.config.js`. eslint-import-resolver-typescript resolves each specifier to the file it
names, a `.js` specifier to its `.ts` source, and the rule judges the layer that file is in, never
the specifier's text. The layer table is the configuration:

- Each layer is an element, matched by its directory from the repository root, with a second
  pattern for files under a directory whose name starts with a dot (`./.well-known/`, `./..x/`),
  which a glob's `**` never enters, so those files stay in their layer.
- Each app captures its directory's name, and its policy allows its own captured directory, so an
  app may import itself and not a sibling, with one policy per branch.
- A file directly in `layers/`, `layers/apps/`, or a branch directory is an element with no
  policy, so it can import nothing and re-export no layer.
- The rule's default is disallow, and it checks every origin: an import passes only when a policy
  names its target, a layer's element or the external `lit`. A specifier that resolves to no file
  fails `no-unresolved`, so an import can't pass by naming nothing.

There is no override per file depth, and no convention on how a relative specifier is written:
`./x/../../foundation/dom.js` from a component is the foundation's `dom.ts`, which a component
may import, however the path climbs. That retires the normalization convention Biome's text rules
needed (below).

In the check, `test/layers.test.js` runs the pinned ESLint over two scratch trees built from
`test/layers-tree.js`, whose imports name real files, so a resolved-file rule is tested fairly,
and it passes only on an exact match of the files flagged to the violation files, so a rule that
refuses everything or nothing fails it. The violation tree holds 60 files with one import each: 6
in the foundation, 7 in components, 5 in the SDK, 23 in the static app, 16 in the application
app, and 3 outside any layer or app, in `layers/` and in each branch directory. They cover every
forbidden edge, the four import forms (`import`, `export … from`, `import type`, and `import()`),
the package's own name, an absolute path, thirteen paths that aren't normalized, and three bare
climbs (`..` from the static app, `../` and `../..` from the application app). The allowed tree
holds 16 files of permitted imports in the same forms, with names that hold dots (`./..x/y.js`,
`./.well-known/a.js`, `x..y`, `...`), a nested foundation index importing `..` and `./`, and two
paths that aren't normalized but reach a file their layer may import.

Measured *(m 2026-10-16T21:11:09Z)*: the plugin flags all 60 violation files, all 60 by
`boundaries/dependencies` alone, and 0 of the 16 allowed files. The allowed tree's two
non-normalized paths are `layers/components/unnormalized.ts` (`./x/../../foundation/dom.js`) and
`layers/apps/application/documents/name-parent.ts` (`./views/..`, the app's own index). Each
resolves to a file its layer may import, so each breaks only the superseded text rules'
normalization convention (`scripts/biome-layers.json`), not the layer direction: they were
violations of the text rule, not of the table, and with the convention gone they are no crossing
at all. All five `import()` edges are flagged.

**What it can't see.** The rule judges the file the TypeScript resolver finds, so a mapping the
resolver doesn't read, such as an import map or a server rewrite at run time, is outside it, as
it is outside any lint rule. A package import resolves into `node_modules`, so the only package a
layer may name is the one a policy names, `lit`.

**Superseded: Biome's `noRestrictedImports`, by text.** The check ran Biome's
`noRestrictedImports` ([rule][biome-nri]) before it moved to ESLint. Its layer overrides, one per
layer directory, are now `scripts/biome-layers.json`, which only measure reads, as setup A's layer
rules, and they flag all 60 violation files and, of the 16 allowed files, the two non-normalized
paths *(m 2026-10-16T21:11:09Z)*. The rule matches the import's text, never the resolved file,
which takes:

- one override per file depth, 0 to 3 directories into an app, the deepest failing closed, since
  an app can refuse a sibling only by refusing every climb out of itself and re-allowing the
  permitted layers by name;
- the bare forms of each climb (`..`, `../`) named beside `../**`, which doesn't match them, and
  one more override for the files outside any layer;
- the normalization convention, since a re-allowed prefix lets a path climb back out of it
  (`../../../foundation/../sdk/session.js` from the static app): a relative specifier starts with
  `./` or its run of `../`, and no later segment is `.`, `..`, or empty, enforced by groups that
  know a name segment only by its first characters, enumerated in ASCII. A segment that starts
  with a non-ASCII character, followed by `..`, isn't refused:
  `../../../foundation/é/../../sdk/session.js` from the static app passes (reproduced 2026-10-16
  against these overrides, then in `biome.json`).

The groups add about 30 ms to every Biome run, format included, since the cost lies in loading
the configuration: over the 21-file tree `biome lint` took 62.5 ms with them against 32.3 ms
without, and `biome format` 59.1 ms against 28.8 ms (hyperfine, 30 runs, 2026-10-16). If Results
6's pick returns to Biome, this mechanism is the one that stays.

**Rejected:**

- **eslint-plugin-import-x's `no-restricted-paths`** ([s73][reg-importx]), the other resolved-file
  rule measured: it flags all 60 violation files, but only 52 by its own rule and 8 by
  `no-unresolved` alone, and it flags 2 of the 16 allowed files, `layers/components/dotted.ts`
  and `layers/apps/static/site/dotted.ts` *(m 2026-10-16T21:11:09Z)*. It reads an import as
  outside a zone's directory when its path relative to that directory starts with `..`, so a
  directory inside the layer named `..x` or `...` is outside it: a false positive on a legal name,
  which an exact-match test can't accept. Its zones also take no captures, so the configuration
  lists each app's directory when it loads, one zone each. Its `no-unresolved` stays, beside
  boundaries' rule.
- **dependency-cruiser** ([repo][depcruise]): it checks the resolved module graph, as the plugin
  does, but as a separate tool and pin beside the linter, where the plugin runs inside the linter
  the check already runs.
- **tsc project references** ([handbook][ts-refs]): one project per layer, each referencing only
  what it may import. `tsc -b` writes output even when the build fails, and the check writes
  nothing. Reproduced with tsc 7.0.2, 2026-10-16: two projects, the second with a type error,
  exited 2 and wrote both projects' `.js`, `.d.ts`, and `.tsbuildinfo`; `tsc -b --noEmit` is
  refused (TS6310, a referenced project may not disable emit) and still writes both
  `.tsbuildinfo` files.
- **ESLint's `no-restricted-imports`** ([rule][eslint-nri]): it never checks an `import()`
  expression, so it flags 55 of the 60 violation files, missing the five dynamic edges, and it
  needs `scripts/biome-layers.json`'s groups translated to regular expressions: ESLint reads a
  group as gitignore lines, where a `!` line can't re-include a `./` or `../` path, so the groups
  copied as written also flag all 16 allowed files *(m 2026-10-16T21:11:09Z)*.

**Handed on.**

- To spike-html-packages: the package-boundary facts. pnpm refuses an import of an undeclared
  package, a phantom dependency, by default (Results 1, amendment 13), and a lint rule can refuse
  one too, import-x's `no-extraneous-dependencies` ([rule][ix-ned]) or Biome's
  `noUndeclaredDependencies` ([rule][biome-nud]), neither measured. So if the layers become
  packages, each package's declared dependencies enforce the direction between them, by resolved
  file at install as well as in the lint; whether they do is spike-html-packages' call. So is
  the import extension the releases use: the occupants import `.js` paths, which bundler
  resolution maps to `.ts` with no compiler option.
- To components or spike-html-apps: herald's elements import domain code. Four files in
  `app/client/ui/elements` import from `@domains` ([herald][herald-elements], 6fc22b3, read
  2026-10-16): `classify-progress.ts` the `WORKFLOW_STAGES` constant and the `WorkflowStage`
  type, `document-card.ts` the `WorkflowStage` and `Document` types, `prompt-card.ts` the `Prompt`
  type, and `blob-viewer.ts` the `findFormat` lookup. Under this layout a component may not: the
  types become the element's own props, and the constant and lookup move up to the app or down
  into the element.
- To branches: the app-internal tiers (modules and views), and whether static pages use Lit.
  STANDARDS.md records the second as undecided.

### 4. Components: Lit with a shadow root, styles in `.css` files

**The architect's judgement** (logged at the review stop, after reading the final files of all 8
versions, before this section was written): Lit with a shadow root is the default for
components, and light DOM's hand-placed composition costs more than it gives. The one complaint
was the styles, written as strings in `.ts` rather than natively in `.css` files. An amendment
to the task answered it: every component's CSS lives in a `.css` file beside its module, imported
as a CSS module script. Readability, maintainability, and scalability are that reading
of the files, not a metric; there is no rubric score, and the figures below are context for it.

**What was built.** Two element-tier components in `layers/components/`, each in four versions,
Lit and vanilla, each with a shadow root and in light DOM: 8 files, each with its own tag,
`sl-{pagination,entry}-{lit,vanilla}-{shadow,light}`. Each imports only its stylesheets, the
foundation's `define`, `emit`, and `required`, and, for Lit, `lit`; no vanilla version has a base
class. The shadow versions also import the foundation's `baseline` module, the reset and
elements sheets they adopt (below).

- **The pagination** is a container: its controls sit around the entries the host places inside
  it. Its properties are go-web-sdk's Page envelope (`response.go`: `items`, `page`, `size`,
  `total`, `more`, `next`), not herald's `total-pages`: page, size, total, and more, plus the page
  sizes offered. It works out the page count from total and size; without a total, Next follows
  `more`; without a page, the page input is disabled. It sends `page-change {page}`, with page
  null for Next on a page continued by cursor, and `page-size-change {size}`, and never changes
  its own page. It also has a `disabled` property reflected to the attribute, a "Showing X–Y of
  N" summary only while a total above zero is known, and author content in place of the "Page
  Size" label.
- **The entry** shows one directory or one file of a document hierarchy: kind, name, status, a
  file's size and content type (no size for a pending file whose size is null), and the updated
  time, with size and time formatted by `Intl`. It types its `item` with its own interface of
  those fields, so go-web-service's Directory and File fit it with no import, and opening it
  sends `open {id, kind}`.
- **The fixture**, `demo/documents.ts`, is written by hand in go-web-service's wire shape at
  15e0bc3: a directories page and a files page in the envelope, a pending file with a null size,
  and a page continued by cursor with no page or total. Nothing fetches.
- **The probe**, `demo/probe.ts`, which `mise run demo` runs in headless Chromium with
  `--dump-dom` and no driver, renders the composition in each version from tsc's emit, loaded
  natively from `file://`, and drives it: rendered text, the events for prev, next, both clamps, a
  size change, and an entry's open, the contract cases (a removed number attribute is null,
  invalid JSON in `page-sizes` is null, a property set before the definition is kept), `disabled`
  in both directions, the summary present and absent, the cursor page's disabled input, and the
  slotted label, then two cases on the look: the Next button, the page-size select, the page
  input, and the entry's button paint as the baseline paints a bare control in the document
  (background, color, border, padding, font family and size), and the entry holding the
  fixture's longest content type, narrowed to 22rem, doesn't overflow its box. All four versions
  hold all 27 cases, with reports identical line for line (`mise run demo`, 2026-10-17).
- **The restyle check**, `demo/restyle.ts`, makes one edit to the source a render root takes its
  button styles from and passes only when both elements' buttons paint from it before and take
  the edit after. Every source is the foundation's elements layer: for the shadow versions a
  button rule inserted at the end of the `foundation.elements` block of the adopted elements
  sheet, the very `CSSStyleSheet` every shadow root holds; for the light ones one rule added to
  the page's `foundation.elements` layer. All four pass (the same run).
- **`mise run preview`** serves the four versions side by side under Vite's dev server, each wired
  to the fixture as a host would wire it (paging, page size, the cursor page, opening an entry),
  so the components can be seen and used in a browser. It sits outside the check and writes
  nothing to the tree.

**The features, Lit against vanilla**, read from the files:

| feature | mark | how |
| --- | --- | --- |
| reactive properties | Lit provides; vanilla builds by hand | Lit: `static properties` with `declare`d fields (`pagination-lit-shadow.ts`). Vanilla: a private field and a get/set accessor per property, each setter guarded by equality in place of `hasChanged` (`pagination-vanilla-shadow.ts`, `entry-vanilla-shadow.ts`) |
| batched updates | Lit provides; vanilla forgoes | Lit commits one update per microtask, however many properties change. Every vanilla setter re-renders at once |
| attribute conversion | Lit provides; vanilla builds by hand | Lit: `type: Number`, `Boolean`, and `Array`. Vanilla: `observedAttributes`, `attributeChangedCallback`, and its own `toNumber` and `toArray`, giving null for a removed number attribute and for invalid JSON, as Lit's converters do |
| reflection | Lit provides; vanilla builds by hand | Lit: `reflect: true` on `disabled`. Vanilla: `toggleAttribute` in the setter, whose echo through the attribute callback stops at the equality guard |
| templates with binding-level updates | Lit provides; vanilla forgoes | Lit's `html` updates only the bindings that changed. Vanilla clones a `<template>` once per element and its `#render` rewrites every part on every change, in place: the select's options are rebuilt each time, the parts that come and go (the summary, the "/ N" count, a file's size and type) are placed or removed, and nothing focusable is moved, so focus survives. Only the `page` setter writes the input's value, as Lit's `.value` binding commits only when `page` changes, so typing survives other changes |
| event binding | Lit provides; vanilla builds by hand | Lit: `@click` and `@change` in the template. Vanilla: `addEventListener` per control in the constructor. Both send their events through the foundation's `emit` |
| shadow root and adopted styles | Lit provides; vanilla builds by hand | Lit: `static styles = [...baseline, styles]`, the foundation's reset and elements sheets then the element's layout sheet, adopted into the root it attaches. Vanilla: `attachShadow` and `root.adoptedStyleSheets = [...baseline, styles]`, two lines. In light DOM neither has it: both versions adopt their sheet into the document by hand (`adopt()` in each `-light.ts`), since Lit adopts `static styles` into a shadow root alone |
| pre-upgrade properties | Lit provides; vanilla builds by hand | Vanilla: in the constructor, each property found as an own field is taken off the instance and set again through its setter (`Object.hasOwn`, `Reflect`), as Lit does |
| lifecycle hooks | Lit provides; vanilla builds by hand | Lit light: `firstUpdated` starts the child placement, and `connectedCallback` and `disconnectedCallback`, calling `super`, adopt the sheet and start and stop the observer (`pagination-lit-light.ts`). Vanilla light: the platform's `connectedCallback` and `disconnectedCallback` (`pagination-vanilla-light.ts`); with no update cycle there is nothing for `willUpdate` or `updated` to hook |
| reactive controllers | not exercised | no component uses one; the SDK's `session.ts` (Results 3) is the repository's one controller |
| keyed lists | not exercised | the entries are the host's children, and the size options are mapped without `repeat` |
| slots | not exercised | the platform's `<slot>`, under a shadow root in both: both shadow versions use `<slot>` and `<slot name="label">`, in Lit's template and in vanilla's `<template>` alike. Light DOM has no slots, Lit or vanilla: both light versions place the host's children by hand with a `MutationObserver` (`#place` in each `pagination-*-light.ts`) |
| form association | not exercised; neither provides it | `ElementInternals` is a platform API: an element sets `static formAssociated = true` and calls `attachInternals()` ([MDN][mdn-internals]). Lit 3.3.3 adds nothing for it: none of `lit`, `lit-element`, `lit-html`, or `@lit/reactive-element` names `formAssociated` or `attachInternals`, only the server DOM shim `@lit-labs/ssr-dom-shim` (installed tree, read 2026-10-17). Either version writes it by hand |
| SSR | not exercised | Lit's server rendering is `@lit-labs/ssr` (4.1.0, a Labs package, [overview][lit-ssr], [registry][reg-lit-ssr], read 2026-10-17), not a dependency here; a vanilla element has no counterpart beyond declarative shadow DOM written by hand |

**What each render root costs and gives.**

- **Light DOM** loses the slots. Each light pagination places the host's children by hand: on
  connection (Lit: after the first render) and on every change to its children, a
  `MutationObserver` moves each entry into the entries region and each `slot="label"` child into
  the label, and puts its own parts back when a host replaces the element's children. Because an
  entry is moved, a host can't `insertBefore` an entry on the element; it inserts by the entry's
  own parent, a limit written into each header. It loses `static styles` and encapsulation: each
  light version adopts its sheet into `document.adoptedStyleSheets` once, in a named cascade
  layer (`spike-html-conventions.pagination`, `.entry`) with every rule nested under its tag,
  and that layer ranks above the baseline only because the sheet is adopted after the page links
  the baseline; a page that declares its own layers must name `spike-html-conventions` first.
  Nesting under the tag is the scoping chosen. `@scope` with a lower boundary at author content
  is the recorded alternative, and would matter for author content placed inside the element; it
  is Baseline newly available since 2026-03-24, in Chrome and Edge 143, Firefox 146, and Safari
  26.4 (web-features 3.43.0, feature `scope` [web-features][reg-web-features], read 2026-10-17). Page
  styles reach the controls, the wanted ones and any other. What it gives is the baseline itself:
  the page's elements layer styles the bare controls with nothing adopted for them, so the light
  sheets give layout alone and drop herald's folded control styles, and one rule in the baseline
  restyles both elements' buttons (the restyle check).
- **A shadow root** gives the slots, encapsulation, and `static styles`, and takes the same
  baseline by adopting it. The page's reset and elements layers style by element selector, and
  an element selector doesn't cross a shadow boundary; only custom properties and inherited
  properties do, so the page's tokens reach inside and its control rules don't. Herald's shadow
  roots answered that by folding control styles into shared modules every element re-imported
  (`pagination-controls.ts` imports `buttons.module.css` and `inputs.module.css`,
  `document-card.ts` four, [herald][herald-elements], 6fc22b3). Here the shadow-root default
  adopts the foundation's reset and elements sheets by reference, then a layout-only sheet of its
  own: `layers/foundation/baseline.ts` imports the two ported files as CSS module scripts, each
  one `CSSStyleSheet` per document, and exports them as `baseline`, which every shadow version,
  Lit and vanilla, adopts before its own sheet. No component styles a control's look, so the
  shadow versions' buttons, select, and input are as bare as the light versions', take their look
  from the same rules, and one edit to the adopted elements sheet reaches every shadow root (the
  restyle check). Each element's layout sheet is shared by its Lit and vanilla versions
  (`pagination-shadow.css`, `entry-shadow.css`) and mirrors the light sheets. A page with shadow
  components still links the foundation's entry, for the tokens a shadow root inherits, so it
  loads the reset and elements layers twice: linked in the entry and adopted as modules (the
  served bytes below). `::part` hooks, which would let a page style named parts from outside, are
  recorded, not built.

The architect's verdict weighs these: the shadow root's slots and encapsulation over light DOM's
hand placement, layer ordering, and leaks. The cost the verdict accepted, a shared sheet each
shadow element imports, is now the foundation's own baseline, adopted by reference.

**No shipped mechanism lets a shadow root inherit page styles** (survey, 2026-10-17). Open-stylable
shadow roots, an `adoptStyles` capability for a root to take the page's styles, have been asked
for since 2020 (WICG webcomponents #909) and are an open CSSWG issue since 2024-04-04 with no
resolution ([csswg-drafts#10176][csswg-10176]). Declarative CSS Modules, a declarative way to share one stylesheet into shadow roots, are an open pull request
against HTML ([whatwg/html#11687][whatwg-11687]), experimental in Chromium behind a flag and an
origin trial only; its explainer ([MSEdgeExplainers][edge-shadow-css]) shares one `CSSStyleSheet`
by module specifier, the same model as adopting a CSS module script, so this convention carries
over to it unchanged if it ships. The conventional answer for a layered design system is the one
built here: the root adopts the system's lower layers by reference as constructed sheets, then its
own.

**Why no `@import` outside the page entry.** A constructed sheet loads no `@import`:
`replace()` and `replaceSync()` drop it, as WPT's `css/cssom/CSSStyleSheet-constructable-disallow-import`
tests. CSS module scripts shipped with the same limit, because the Web Components group didn't
settle whether an imported sheet becomes a module of its own ([minutes, 2020-10-29][wc-2020-10-29];
[web.dev][webdev-css-modules]), and the declarative proposal keeps it. So every ported file layers
itself and imports nothing, and the one `@import` is in `layers/foundation/baseline.css`, the page
entry, which only a page links.

**The foundation's port of spike-html-design.** spike-html-design v0.7.0 (commit fe75220) didn't
fit this convention: its one entry builds the layers with `@import ... layer()`, which neither a
constructed sheet nor a CSS module script loads, and it exports no layer file a shadow root could
adopt. So the foundation owns a port of it, by the architect's decision, rather than depending on
it or changing it: in `layers/foundation/baseline/`, one plain `.css` per upstream file of the
tokens (the color, space, and type facets, with the Flexoki, regular, and mono profiles upstream's
`baseline.css` picks), the reset, and the elements layer, each wrapped in its own
`@layer foundation.<layer>` block (upstream's `spike-html-design.*` names renamed `foundation.*`)
and headed by its provenance: the tag, the commit, and the upstream path. The page entry,
`layers/foundation/baseline.css`, states the layer order and imports the files, and every page
links it: the demo, the preview, and measure's pages, shadow and light alike. The port is this
repository's own code from here on: Prettier formats it, and no test holds it to upstream. Two
spellings differ from upstream beyond the renaming, each saying the same thing: the rule for a
block after a block nests `& + &` under the blocks' `:where()` (zero specificity still), and the
entry states the layer order in two statements, because Prettier, Biome, and oxfmt each broke
upstream's over-long lines their own way and measure's comparison checks the tree with all
three. The tools layer and the other profiles aren't ported, since nothing uses them.

**The platform gaps the foundation absorbs**, each with the work that would retire it:

- No shared page styles in a shadow root: every shadow component adopts the baseline sheets
  itself, and a page loads the reset and elements layers twice. Retired by open-stylable shadow
  roots ([csswg-drafts#10176][csswg-10176]) resolving and shipping, or by Declarative CSS Modules
  ([whatwg/html#11687][whatwg-11687]) shipping, which would share the same sheets by specifier
  with no change to the files.
- No `@import` in a constructed sheet or a CSS module script: each ported file layers itself, and
  the entry alone composes them. Retired by the CSS module scripts specification defining how an
  imported sheet loads, which the 2020 discussion left open.
- No CSS module scripts in any Safari release: an unbundled page fails there, and apps build
  through Vite with `scripts/css-sheets.js`. Retired by a Safari release shipping WebKit's
  322887@main ([bug][webkit-css-modules]).
- Upstream ships no adoptable layer file: the port stands in for it. Retired by spike-html-design
  shipping each layer as a self-layered, `@import`-free, exported sheet, for which the port is the
  reference (handed on below).

**No build removes Lit's runtime.** `@lit-labs/compiler` 1.1.2, a Labs package, is a TypeScript
transformer that optimizes away lit-html's prepare phase; the templates it emits are still
rendered by lit-html, a dependency it declares ([README][lit-compiler],
[registry][reg-lit-compiler], read 2026-10-17). The compile-to-custom-element alternatives each ship a runtime of their own:
Svelte 5.57.2's `customElement` option compiles a component that imports Svelte's client runtime
([custom elements][svelte-ce]); Stencil 4.45.2 compiles to elements that load Stencil's runtime
([output targets][stencil-ot]); solid-element 1.9.2 wraps a Solid component and depends on
`component-register` with `solid-js` as its peer ([registry][reg-solid-element]) (versions from
each registry's `latest`, read 2026-10-17). None is measured here: facts only, no column.

**CSS module scripts.** `import sheet from "./x.css" with { type: "css" }` gives the file as one
constructed `CSSStyleSheet`, its default export, shared by every importer in a document.

- Support: Chrome and Edge 123+, Firefox 147+, and no Safari release; WebKit implemented it in
  bug 227967, landed 2026-10-06 as 322887@main ([bug][webkit-css-modules]). It isn't Baseline:
  web-features 3.43.0 marks `css-modules` `baseline: false`, from MDN's browser-compat-data 8.1.6
  (`javascript.statements.import.import_attributes.type_css`) ([web-features][reg-web-features],
  read 2026-10-17).
- Tools: tsc emits the import unchanged, and `mise run build:tsc` copies each `.css` beside its
  emitted `.js`, so the demo loads the components natively from `file://` in Chromium. Vite
  8.3.4's dev server strips the attribute and injects the CSS into the document, and `vite build`
  fails on the missing default export; esbuild 0.28.2 refuses it ("Importing with a type
  attribute of "css" is not supported"); Node 26.12.0 refuses the `.css` extension
  (`ERR_UNKNOWN_FILE_EXTENSION`); Bun 1.4.3 imports it as `{}` (reproduced 2026-10-17).
- `scripts/css-sheets.js`, a local Vite plugin of about 30 lines of code and no package, closes
  the gap for apps: a pre transform reads the attribute from each importer's syntax tree, since
  Vite passes import attributes to no `resolveId` or `load` hook, and rewrites the import to a
  virtual module that builds and default-exports the sheet, in dev and build; in a build it
  takes the sheet's text from Vite's own `?inline` import of the file, so the sheet is minified
  as linked CSS is. Measure's pages and
  `mise run preview` use it, and measure's development rows pass only when every stylesheet
  arrives as that module and no style is injected.
- Herald's "native CSS" was the same thing in Bun's bundler: a 33-line `BunPlugin` that turns a
  `.module.css` import into a constructed sheet ([herald `app/plugins/css-modules.ts`][herald-css],
  6fc22b3). Bun loads no CSS module script itself, so native CSS gives Bun no edge, and Results 1's
  pick stands.
- The gap that remains is Safari for unbundled loading: a page that loads the emitted modules
  without a build fails there until a Safari release ships WebKit's change. Apps build through
  Vite, so their production pages don't depend on it; no shim ships. The release consequence (each
  `.css` beside its `.js`, served as `text/css`) is spike-html-packages'.

**Served bytes** *(m 2026-10-17T23:45:28Z)*, for each version's pagination alone and its
composition (the pagination holding the fixture's three directories). Every page links the
foundation's baseline entry, given as its own share so the rest compares across versions. The
baseline share also holds the reset and elements sheets a shadow version adopts: a shadow page
loads those two layers twice, linked in the entry and adopted as modules, and the rows record
both.

Development, Vite 8.3.4's dev server on a scratch copy: every 2xx response headless Chromium read,
uncompressed, with Lit's development builds. Vite's client is the HMR client the dev server
injects into every page:

| page | responses | total | Lit | baseline | Vite client | page and elements |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pagination, Lit shadow | 12 | 716,703 B | 290,750 B | 165,414 B | 226,061 B | 34,478 B |
| pagination, vanilla shadow | 10 | 437,130 B | — | 165,414 B | 226,061 B | 45,655 B |
| pagination, Lit light | 10 | 650,594 B | 339,770 B | 40,965 B | 226,061 B | 43,798 B |
| pagination, vanilla light | 7 | 319,657 B | — | 40,965 B | 226,061 B | 52,631 B |
| composition, Lit shadow | 16 | 748,850 B | 290,750 B | 165,414 B | 226,061 B | 66,625 B |
| composition, vanilla shadow | 14 | 475,216 B | — | 165,414 B | 226,061 B | 83,741 B |
| composition, Lit light | 14 | 684,398 B | 339,770 B | 40,965 B | 226,061 B | 77,602 B |
| composition, vanilla light | 11 | 359,465 B | — | 40,965 B | 226,061 B | 92,439 B |

Production, `vite build` of the same pages, minified as Vite builds by default, every emitted
file raw and brotli (quality 11, `node:zlib`), Lit in a chunk of its own and the foundation's
adopted sheets in another, counted in the baseline share beside the entry's CSS. In a build,
`scripts/css-sheets.js` takes each sheet's text from Vite's own `?inline` import of the file, so
every adopted sheet, the foundation's and each component's, is minified as Vite minifies the
linked CSS (`build.cssMinify`, Lightning CSS by default in Vite 8), with no package added; the
dev server still serves each file as written:

| page | total | Lit | baseline | page and elements |
| --- | ---: | ---: | ---: | ---: |
| pagination, Lit shadow | 36,320 B; 10,334 B br | 14,550 B; 5,031 B br | 16,720 B; 3,582 B br | 5,050 B; 1,721 B br |
| pagination, vanilla shadow | 22,907 B; 5,683 B br | — | 16,720 B; 3,582 B br | 6,187 B; 2,101 B br |
| pagination, Lit light | 33,046 B; 10,041 B br | 16,708 B; 5,742 B br | 10,124 B; 2,200 B br | 6,214 B; 2,099 B br |
| pagination, vanilla light | 17,249 B; 4,526 B br | — | 10,124 B; 2,200 B br | 7,125 B; 2,326 B br |
| composition, Lit shadow | 38,731 B; 11,199 B br | 14,550 B; 5,031 B br | 16,720 B; 3,582 B br | 7,461 B; 2,586 B br |
| composition, vanilla shadow | 26,062 B; 6,700 B br | — | 16,720 B; 3,582 B br | 9,342 B; 3,118 B br |
| composition, Lit light | 35,768 B; 10,927 B br | 16,708 B; 5,742 B br | 10,124 B; 2,200 B br | 8,936 B; 2,985 B br |
| composition, vanilla light | 20,626 B; 5,550 B br | — | 10,124 B; 2,200 B br | 10,502 B; 3,350 B br |

Every row passed on its expected shape: each Lit page in development loads Lit's development
build and each vanilla page no Lit, every stylesheet arrives as the plugin's sheet module, each
composition's dumped DOM holds its three entries, no production file holds Lit's development
build, and each shadow page loads the reset and elements layers both linked and adopted, from
`foundation/` in production, while no light page has that chunk, and no production file outside
Lit's chunk holds a comment, so every sheet, adopted or linked, is minified; all 121 of the run's
rows passed.

The adopted sheets' chunk adds 6,596 B, 1,382 B brotli, to a shadow page's baseline share, beside
the entry's CSS, the same 10,124 B, 2,200 B brotli, on every page. The chunk holds both the
`@layer foundation.reset` and `foundation.elements` blocks, minified (Lightning CSS writes the
port's nested `& + &` back as upstream's `:where(...) + :where(...)`), and is smaller than the
linked entry because it leaves out the tokens, which a shadow root inherits. In development the
shadow pages' baseline share is 165,414 B against the light pages' 40,965 B, the adopted sheets
served as source, comments included. The double load is the price of the gap the foundation
absorbs (the platform gaps, above), not of either base: the shadow composition's own elements
are 2,586 B brotli in Lit and 3,118 B in vanilla.

Lit's share is the same for every page of a render root, since every Lit element on a page shares
one runtime; the light versions' is larger, 339,770 B against 290,750 B in development and 5,742 B
against 5,031 B brotli in production, because they also load Lit's `ref` directive to find the
parts they place children among. In production, the vanilla elements are larger than the Lit ones
and the Lit runtime outweighs the difference: the shadow composition's elements are 3,118 B brotli
in vanilla against 2,586 B in Lit, and the whole page 6,700 B against 11,199 B. In development,
Vite's client is the largest single share of every vanilla page.

**Source sizes, as context only** *(the same run)*: lines (`wc -l`) and brotli bytes (quality 11)
of each file as written. Line count is a poor metric (the architect's decision), and these figures
argue nothing:

| version | pagination `.ts` | entry `.ts` | its own `.css` |
| --- | --- | --- | --- |
| Lit shadow | 199 lines, 2,142 B | 120, 1,392 B | shared with vanilla shadow |
| vanilla shadow | 311, 2,942 B | 174, 1,897 B | `pagination-shadow.css` 52, 506 B; `entry-shadow.css` 40, 501 B |
| Lit light | 299, 3,371 B | 137, 1,606 B | 50, 456 B; 39, 444 B |
| vanilla light | 382, 3,895 B | 188, 2,143 B | 50, 459 B; 39, 459 B |

`layers/foundation/baseline.ts`, the module every shadow version adopts the reset and elements
sheets through, is 20 lines and 531 B. No component sheet gives a control its look; the shadow
sheets hold layout alone and mirror the light ones.

**Handed on.**

- To STANDARDS.md (this task): components are Lit with a shadow root by default; a
  component's CSS lives in its own `.css` file, imported as a CSS module script, never written in
  `.ts`; a shadow-root component adopts the foundation's baseline sheets, then a layout-only sheet
  of its own, and never styles a control's look; and the foundation holds the design-system port
  as native CSS, with no `@import` but in the page entry.
- To spike-html-packages: a release ships each component's `.css` beside its emitted `.js`, with
  `exports` and `files` naming them, since tsc's emit copies no `.css`; a CSS module script loads
  only when served as `text/css`; and Safari's gap for consumers that load the modules unbundled.
- To spike-html-design: ship each layer as a self-layered, `@import`-free, exported sheet, so a
  shadow root can adopt it as a CSS module script; this repository's port in
  `layers/foundation/baseline/` is the interim and the reference. Its theme-menu also builds its
  sheet from a string.
- To spike-html-apps: herald's pagination took `total_pages`, while go-web-sdk's envelope carries
  total and size and omits page and total under a cursor; this pagination is built on the
  envelope, and sends page null for Next on a cursor page.

### 6. Lint and format: ESLint + Prettier, provisionally

Measure runs four setups over one copy of `src/`, `layers/`, and `test/` (21 files), and over the
repository's 13 tracked JSON files *(m 2026-10-16T21:11:09Z)*: A's and C's tools from the mise
pins the measure task uses, B's from the devDependencies the check runs, and only D's packages
installed into scratch. Both ESLint setups run typescript-eslint's and `@eslint/js`'s
recommended rules, with the layer table in eslint-plugin-boundaries. "Restores" formats a scratch
copy whose line breaks and indentation are disturbed (131 lines split, 14 joined, 6 joined past
the 100-column width for the code; 23 split, 21 joined, 145 closed, and 66 past the width for the
JSON) and compares the result with the original, byte for byte.

| fact | A: Biome 2.5.15 | B: ESLint 10.12.0 + Prettier 3.9.10 | C: oxlint 1.88.0 + oxfmt 0.73.0 | D: ESLint 10.12.0 + Stylistic 5.10.0 + jsonc 3.4.2 |
| --- | --- | --- | --- | --- |
| binaries on PATH | biome | eslint, prettier, node | oxlint, oxfmt, node | eslint, node |
| config files | 1: `biome.json` | 4: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `pnpm-workspace.yaml` (the pnpm settings the devDependencies' install needs, `allowBuilds`) | 3: `.oxlintrc.json`, `.oxfmtrc.json`, `.prettierignore` | 1: `eslint.config.js` |
| packages to keep current | 1 | 9 devDependencies, 0 mise pins | 2 | 10 packages, 0 mise pins |
| packages installed under them | 0, one native binary | 140 | 5 | 150 |
| footprint | 66.7 MB, no runtime | 62.1 MB, plus node | 35.6 MB, plus node | 55.2 MB, plus node |
| matches the tree's formatting with | `biome.json`'s 3 options | 15 options, `embeddedLanguageFormatting` off among them | Prettier's 15 | Stylistic's `customize` with 9 options, plus the rules Biome's output needs |
| Lit's templates, at the formatter's default | left as written | reformatted in the three `pagination-lit` files | the same as Prettier | not measured |
| code, leaves unchanged (21 files) | yes | yes | yes | yes |
| code, restores (21 files) | yes | yes | yes | no: 19 of 21 differ |
| JSON, leaves unchanged (13 files) | yes | yes | no: `package.json` differs, one key moved | yes |
| JSON, restores (13 files) | yes | yes | no: `package.json` differs | no: 8 of 13 differ |
| file types its default run touches, of the 59 tracked files in 10 types | js, json, ts | js, json, md, ts, yaml | js, json, md, toml, ts, yaml (1 of 2) | js, json, ts |
| what its default run rewrites beside code and JSON | nothing | `context/README.md`, 174 of 1,173 lines; `pnpm-lock.yaml`, 565 of 1,615 lines into 1,081 | `context/README.md`, 173 of 1,173 lines | nothing |
| limited to code and JSON by | `files.includes` | a `.prettierignore` | the same `.prettierignore` | its config's own `files` globs |
| direction, violation tree (60) | 60, by text | 60, by resolved file (boundaries); 55 with core's `no-restricted-imports`, no `import()` | 60, by text, groups merged | B's: 60 |
| direction, allowed tree (16) | 2, the non-normalized paths | 0 (boundaries) | 2, the non-normalized paths | B's: 0 |
| lint + format, hyperfine mean | 120.9 ms | 950.0 ms | 92.5 ms | 871.7 ms |

The direction rows are Results 3's. The two allowed files the text rules flag each import a file
their layer may import through a non-normalized path, so each breaks only the normalization
convention of the superseded text rules (`scripts/biome-layers.json`), which a resolved-file rule
makes moot. eslint-plugin-import-x's `no-restricted-paths` flags the same 60, 8 of them by
`no-unresolved` alone, and 2 of the allowed files, a false positive on directory names that start
with dots (Results 3).

The check's Prettier also formats the components' stylesheets, so measure's scope rows limit
each setup to the code, JSON, and CSS, the check's own scope: `.prettierignore` lets `*.css` back
in, Biome's `files.includes` adds `**/*.css`, and the row records that D's Stylistic formats no
CSS. The code rows still compare the `.js` and `.ts` files alone, and the table above keeps the
run it cites. In the later run
*(m 2026-10-17T20:35:52Z)*, over 85 tracked files in 11 types, A, B, and C each limit to the 8
stylesheets, 17 `.js`, 29 `.ts`, and 14 JSON files, and D to the same less the CSS; by default
Prettier rewrites `context/README.md` (226 of 1,438 lines), the goal record (47 of 423), and
`pnpm-lock.yaml` as before, oxfmt the same two Markdown files and `package.json`'s one key, and
Biome and D nothing beside the code. The argument below doesn't turn on the CSS.

**The order.** As in Results 1: first, industry standard and maintainability, where
maintainability holds stewardship and surface (binaries, config files, and packages to keep
current), configurability, the formatting rows for code and JSON, content scope, and direction
coverage; second, footprint; third, speed, only on an order-of-magnitude gap.

**Prettier against ESLint Stylistic**, in the same order. Stylistic leaves the formatted tree as
it is, code and JSON, but it can't restore one: from the disturbed copy, 19 of the 21 code files
and 8 of the 13 JSON files come out different. It fixes what each rule sees and has no line-width
reflow, and `max-len` has no fixer, so a split call stays split. A joined line can also stay past
the width unreported: from the disturbed code, D's restore exits 0 with 6 more lines past 100
columns than the original, 21 against 15, because `max-len` with `ignoreStrings` doesn't report a
line that holds a string *(m 2026-10-16T21:11:09Z)*. So Stylistic is a checker of a format, not
a formatter: it keeps a tree as it is and can't bring one back. ESLint's own deprecation post
recommends a formatter first, Prettier or dprint, and Stylistic only for those who don't want one
([s66][eslint-dep]). Stylistic's stewardship is thin, 8 organization members and $1,165 a year
from 4 backers against Prettier's $58,056 from 351, and its leads over B, one config file and a
default limited to code and JSON, don't make up for a formatter that can't restore a tree. Prettier wins it on the first criterion, and D drops out.

**First: industry standard and maintainability.**

- **The standard.** ESLint + Prettier, by a wide margin: 9,697 and 9,295 SoJS 2025 respondents
  against Biome's 1,762 and oxlint's 123 write-ins ([s1][sj25-other]); 158.7M and 139.1M weekly
  npm downloads against Biome's 17.9M and oxlint's and oxfmt's 26.8M and 17.1M ([s57][npm-lint],
  [s58][npm-biome]); and ESLint in 10 and Prettier in 11 of the 13 web-component libraries, where
  Biome is in one (FAST) and Oxc in none. The direction plugin is a smaller standard:
  eslint-plugin-boundaries draws 1.93M a week ([s68][npm-plugins]).
- **Stewardship** (Ecosystem survey, Lint and format). ESLint is the only tool here under a
  foundation, an OpenJS project with a three-member Technical Steering Committee, paid hourly
  reviewers and committers, and $146,977 a year from 546 backers. Prettier has no foundation
  but 10 npm publishers beside a bot, and $58,056 a year from 351. Biome is a community fork of
  Rome, 8 core contributors and 6 maintainers, with $30,433 a year from 38 backers and Depot's CI
  runners. Oxc is VoidZero's, venture-funded and now Cloudflare's. B's two tools are better
  stewarded than Biome by funding and foundation. B's plugins aren't: typescript-eslint is
  volunteer-run at about Biome's funding ($31,255 a year), and the direction rule rests on
  eslint-plugin-boundaries, one maintainer's repository funded by GitHub Sponsors, and on the
  resolver it needs, eslint-import-resolver-typescript, whose own collective draws $0 a year.
  The difference is what a failure costs. A plugin is one config block: if boundaries stalls, or
  the resolver it depends on for the direction rule does, import-x is the measured fallback, with
  its built-in resolver and its false positive to fix, and core's rule still catches 55 of 60.
  Biome is one project for lint, format, and direction, so if it stalls, all three are replaced
  at once.
- **Surface.** Biome's, clearly: one binary, one config file, and one pin with nothing beneath
  it, against B's three binaries, four config files, and 9 packages to keep current with 140
  installed under them *(m 2026-10-16T21:11:09Z)*. The fourth config file is
  `pnpm-workspace.yaml`, which holds the pnpm settings the devDependencies need (`allowBuilds`,
  so unrs-resolver's postinstall isn't run). That is B's real cost: more pins for currency to
  track, more upgrades that can break the check, and a lockfile that grew from 59 lines to 1,615
  when the devDependencies came in (d2307d6). The architect's case for Biome, "its simplicity and
  minimal surface friction", is this row, and it holds.
- **Configurability.** A tie. Prettier matched every option on this tree, 15 set, as Biome did
  with 3; both need Lit's templates left alone, which Biome does by default and Prettier with
  `embeddedLanguageFormatting` off.
- **Formatting.** A tie: A and B leave and restore all 21 code files and all 13 JSON files. C
  moves a key in `package.json`, and D can't restore.
- **Content scope.** Biome's by default: it touches only js, json, and ts, where Prettier also
  formats Markdown and YAML, and rewrites 174 of this README's 1,173 lines and 565 of the pnpm
  lockfile's 1,615. A `.prettierignore` of five lines limited it to code and JSON (six with the CSS
  let back in), so the cost is a default to undo, not a limit.
- **Direction.** B's now. The gap that decided the superseded pick, ESLint's rule never
  checking `import()`, is closed: boundaries flags all five dynamic edges. It judges the resolved
  file, so the layer table is its whole configuration: no override per file depth, no
  normalization convention, and none of the convention's gaps (a non-ASCII segment followed by
  `..`) or its 30 ms a run. Biome flags all 60 violation files, but by text, with the limits
  Results 3 records, and it flags the allowed tree's two non-normalized paths, which break the
  convention, not the direction.

Weighed together, the standard, the stewardship of the tools, and the direction mechanism are
B's; surface and content scope are Biome's; configurability and formatting are even. Biome's
lead is real and it is one row: one binary and one config file against nine pins and four config
files. It doesn't outweigh the standard by use, the better-stewarded tools, and a direction rule
that judges the file rather than the text, now that B can enforce every edge. The first criterion
picks ESLint + Prettier. oxlint + oxfmt is neither the standard nor, at 0.x, a formatter that
leaves the JSON as it is, and its direction is by text, as Biome's is.

**Second: footprint.** Node is already the toolchain's runtime (Results 1), so each setup adds
its own installs: A 66.7 MB, B 62.1 MB, C 35.6 MB, D 55.2 MB *(m 2026-10-16T21:11:09Z)*. B and
Biome are within 4.6 MB of each other; C is about half either, 1.7 times smaller than B, not an
order of magnitude. It doesn't overturn the first.

**Third: speed**, only on an order-of-magnitude gap, and the run shows two
*(m 2026-10-16T21:11:09Z)*. Lint and format together take 950.0 ms under ESLint + Prettier
against 92.5 ms under oxlint + oxfmt, 10.3 times slower, about an order of magnitude. ESLint's
lint alone, with the resolver behind boundaries, takes 693.5 ms against `biome lint`'s 62.9 ms,
11.0 times. Against Biome's lint and format together, 120.9 ms, B is 7.9 times slower, and oxlint
+ oxfmt is 1.3 times faster than Biome. Neither gap overturns the first criterion: C loses there
on the standard and on JSON formatting, and Biome on direction and stewardship. At this size B's
lint and format take just under a second, in a check that runs once, not in an edit loop. Lint at
application scale isn't measured here; the branches task's tree is the first that could show a
wait. Speed doesn't decide it.

**The pick: ESLint + Prettier, with eslint-plugin-boundaries for the direction, provisionally**,
as Results 1 picks pnpm. The industry standard and maintainability decide it: the standard by a
wide margin, the better-stewarded tools, and a direction rule by resolved file, against Biome's
smaller surface, which is the cost B carries: 9 pins and 140 installed packages. On footprint, A
and B are even and C is 1.7 times smaller than B, not an order of magnitude. Speed shows two
order-of-magnitude gaps, B's lint and format 10.3 times C's and ESLint's lint 11.0 times
`biome lint`'s, and neither overturns the first criterion: C loses on the standard and on JSON
formatting, and Biome on direction and stewardship. ESLint Stylistic loses to Prettier on the
first criterion, since it can't restore a tree. The check runs this setup, ESLint and Prettier
from the devDependencies, with boundaries enforcing the direction in `eslint.config.js`; Biome's
earlier pick is superseded.

**What would reverse it.** Toward Biome: a Biome rule that restricts imports by resolved file
(Biome 2 has a module graph, but no such rule); eslint-plugin-boundaries, or
eslint-import-resolver-typescript under its rule, going unmaintained with import-x's false
positive unfixed, leaving B no direction rule that passes the trees; the standard moving, the
libraries or SoJS taking up Biome; or the surface cost showing in practice, upgrades to the nine
pins breaking the check more often than the direction rule is worth. Toward
oxlint + oxfmt: oxfmt reaching 1.0 and leaving the JSON as it is, a resolved-file direction rule,
and the libraries or SoJS taking up Oxc. Toward ESLint Stylistic: a reflow, so that it restores
both trees.

**What reopens it.** spike-html-packages making the layers packages: pnpm then refuses an import
of an undeclared package (Results 1), so the declared dependencies enforce the direction between
packages by resolved file at install, the plugin's role shrinks to the files inside a package, and
direction weighs less for B. That leaves the standard and the stewardship against Biome's
surface, weighed again with that decision. A change in ESLint's foundation or funding, or in
Prettier's, reopens it too.

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
  forms in Lit and vanilla, from this working tree, since v0.1.0 wasn't yet released at that run;
  each element is defined and renders page 3 of 7. The `.ts` form loads only once built (Results 2).
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
[ix-ned]: https://github.com/un-ts/eslint-plugin-import-x/blob/aa1071d6eff5/docs/rules/no-extraneous-dependencies.md
[depcruise]: https://github.com/sverweij/dependency-cruiser
[ts-refs]: https://www.typescriptlang.org/docs/handbook/project-references.html
[eslint-nri]: https://eslint.org/docs/latest/rules/no-restricted-imports
[herald-elements]: https://github.com/JaimeStill/herald/tree/6fc22b3cb492/app/client/ui/elements
[herald-css]: https://github.com/JaimeStill/herald/blob/6fc22b3cb492/app/plugins/css-modules.ts
[mdn-internals]: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals
[lit-ssr]: https://lit.dev/docs/ssr/overview/
[reg-lit-ssr]: https://registry.npmjs.org/@lit-labs/ssr/4.1.0
[lit-compiler]: https://github.com/lit/lit/tree/main/packages/labs/compiler
[reg-lit-compiler]: https://registry.npmjs.org/@lit-labs/compiler/1.1.2
[svelte-ce]: https://svelte.dev/docs/svelte/custom-elements
[stencil-ot]: https://stenciljs.com/docs/output-targets
[reg-solid-element]: https://registry.npmjs.org/solid-element/1.9.2
[webkit-css-modules]: https://bugs.webkit.org/show_bug.cgi?id=227967
[reg-web-features]: https://registry.npmjs.org/web-features/3.43.0
[csswg-10176]: https://github.com/w3c/csswg-drafts/issues/10176
[whatwg-11687]: https://github.com/whatwg/html/pull/11687
[edge-shadow-css]: https://microsoftedge.github.io/MSEdgeExplainers/ShadowDOM/explainer.html
[wc-2020-10-29]: https://www.w3.org/2020/10/29-components-minutes.html
[webdev-css-modules]: https://web.dev/css-module-scripts/

## Capabilities

- **Toolchain:** the runtime and package manager, their install, build, watch, and test paths.
- **Language:** the TypeScript form and its type check.
- **Structure:** the layer tree in `layers/`, and its import direction, which the layer table in
  `eslint.config.js` (eslint-plugin-boundaries, by resolved file) enforces in the check and
  `test/layers.test.js` proves against a tree of violations and a tree of allowed imports.
- **Lint and format:** ESLint + Prettier in the check, provisionally, from the devDependencies,
  compared in `mise run measure` against Biome, oxlint + oxfmt, and ESLint + ESLint Stylistic.
- **Components:** the element-tier convention: Lit with a shadow root by default, adopting the
  foundation's baseline sheets before a layout-only sheet of its own, each component's CSS a
  `.css` file imported as a CSS module script, compared in four versions
  (Lit and vanilla, shadow and light DOM), with `mise run preview` to see them side by side.
- **Testing:** the unit and browser tiers in the check.
- **Consumption:** installing and loading tagged releases, from git and jsDelivr.
- **Branches:** the static and application layouts and the application SDK spec.

## Path

The tasks, in the order they run; each cites the evidence it proves.

1. `toolchain`: the head-to-head comparison, the TS form, and the consumption fixtures
   (evidence 1, 2, 7).
2. `structure`: the layout, the import direction and its check, the lint/format tool
   (evidence 3, 6).
3. `components`: the two elements in vanilla and in Lit, shadow and light DOM (evidence 4).
4. `testing`: the unit and browser tiers (evidence 5).
5. `branches`: the branch layouts, the SDK spec, and the answer (evidence 8).

## Releases

Minimal: one repo-wide annotated `vX.Y.Z` tag, cut only on a green check, with no gate. A tag is
never changed or re-cut. Per-package tags, release builds, and package splitting belong to
spike-html-packages.

## References

The spike reads these repositories and never writes to them. Each is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`:

- `spike-html-design`, at v0.7.0: the baseline the fixtures consume, and the source of the
  foundation's port (`layers/foundation/baseline/`), which no page reads from the checkout.
- `herald`: its app client (TS, Lit 3, bun build) and its elements.

## The answer

Pending: the `branches` task writes it.
