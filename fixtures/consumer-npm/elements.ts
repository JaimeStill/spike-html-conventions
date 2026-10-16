// A consumer's typed use of both elements, from the installed package by its exports: the .ts
// form's types come from its source, and the JSDoc form's from its comments, which tsc reads in
// node_modules because tsconfig.json sets maxNodeModuleJsDepth, with the tag map from the
// package's globals.d.ts. The check type-checks this file after each offline install; the plain
// .js form has no types to check.

import type {} from "spike-html-conventions/jsdoc/globals";
import type { PaginationLit as JsdocLit } from "spike-html-conventions/jsdoc/pagination-lit";
import type { PaginationVanilla as JsdocVanilla } from "spike-html-conventions/jsdoc/pagination-vanilla";
import type { PaginationLit as TsLit } from "spike-html-conventions/ts/pagination-lit";
import type { PaginationVanilla as TsVanilla } from "spike-html-conventions/ts/pagination-vanilla";
import type { RouteTable } from "spike-html-conventions/ts/router";

const elements: { page: number; size: number }[] = [
  document.createElement("hd-pagination-lit-ts") satisfies TsLit,
  document.createElement("hd-pagination-vanilla-ts") satisfies TsVanilla,
  document.createElement("hd-pagination-lit-jsdoc") satisfies JsdocLit,
  document.createElement("hd-pagination-vanilla-jsdoc") satisfies JsdocVanilla,
];

const routes: RouteTable = { "*": { component: "hd-not-found-view", title: "Not Found" } };

export { elements, routes };
