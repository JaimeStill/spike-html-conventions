// The versions of the composition the probe compares: each names its pair of tags and loads the
// modules that define them. The probe loads a version only after building its composition, so
// every property it sets is set before the elements are defined. Each import() runs only when
// called, so a page that loads tsc's emit of the probe defines its own version alone.

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
