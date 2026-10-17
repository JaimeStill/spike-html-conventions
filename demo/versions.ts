// The versions of the composition the probe compares: each names its pair of tags and loads the
// modules that define them. The probe loads a version only after building its composition, so
// every property it sets is set before the elements are defined. Each import() runs only when
// called, so a page that loads tsc's emit of the probe defines its own version alone. Beside them,
// what every page that composes them shares: the pagination's contract and the page sizes, which
// the probe, the preview, and measure's pages (scripts/components.js) all set.

/** The contract every pagination version keeps, as the probe and the preview reach it. */
export interface PaginationElement extends HTMLElement {
  page: number | null;
  size: number | null;
  total: number | null;
  more: boolean;
  pageSizes: number[] | null;
  disabled: boolean;
}

/** The page sizes every composition offers, the first the preview's default. */
export const pageSizes = [3, 6, 12];

/** One version of the composition: a pagination element and the entry element it holds. */
export interface Version {
  pagination: string;
  entry: string;
  load(): Promise<unknown>;
}

export const versions: Record<string, Version> = {
  "lit-shadow": {
    pagination: "sl-pagination-lit-shadow",
    entry: "sl-entry-lit-shadow",
    load: () =>
      Promise.all([
        import("../layers/components/pagination-lit-shadow.js"),
        import("../layers/components/entry-lit-shadow.js"),
      ]),
  },
  "vanilla-shadow": {
    pagination: "sl-pagination-vanilla-shadow",
    entry: "sl-entry-vanilla-shadow",
    load: () =>
      Promise.all([
        import("../layers/components/pagination-vanilla-shadow.js"),
        import("../layers/components/entry-vanilla-shadow.js"),
      ]),
  },
  "lit-light": {
    pagination: "sl-pagination-lit-light",
    entry: "sl-entry-lit-light",
    load: () =>
      Promise.all([
        import("../layers/components/pagination-lit-light.js"),
        import("../layers/components/entry-lit-light.js"),
      ]),
  },
  "vanilla-light": {
    pagination: "sl-pagination-vanilla-light",
    entry: "sl-entry-vanilla-light",
    load: () =>
      Promise.all([
        import("../layers/components/pagination-vanilla-light.js"),
        import("../layers/components/entry-vanilla-light.js"),
      ]),
  },
};
