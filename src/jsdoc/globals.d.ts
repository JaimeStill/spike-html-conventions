// Typed lookups for the JSDoc form's tags and events. JSDoc has no `declare global`, so the
// global augmentations the .ts form writes inline live here, in the one declaration file the
// JSDoc form needs: `document.createElement(tagName)` and `querySelector` return the class, and
// listeners receive the typed `CustomEvent`.

import type { PaginationLit } from "./pagination-lit.js";
import type { PaginationVanilla } from "./pagination-vanilla.js";

declare global {
  interface HTMLElementTagNameMap {
    "hd-pagination-lit-jsdoc": PaginationLit;
    "hd-pagination-vanilla-jsdoc": PaginationVanilla;
  }
  interface HTMLElementEventMap {
    "page-change": CustomEvent<{ page: number }>;
    "page-size-change": CustomEvent<{ size: number }>;
  }
}
