// Pagination element, Lit and JSDoc form: plain JavaScript that runs as written, with its
// types in JSDoc comments that tsc checks, and static properties in place of decorators.
// Ported from herald's app/client/ui/elements/pagination-controls, with herald's shared button
// and input styles folded into the element's own. The tag and event maps, which JSDoc can't
// declare, are in globals.d.ts.

/** @import { PropertyDeclarations } from "lit" */

import { css, html, LitElement } from "lit";

/** The tag this variant defines; each of the six variants defines its own. */
export const tagName = "hd-pagination-lit-jsdoc";

// One line: tsc 7.0.2's declaration emit copies each leading `*` of a multi-line object type with
// quoted keys ("page-change") into the .d.ts, which then fails to parse; plain keys emit fine.
/**
 * Each event the element dispatches, mapped to its `detail`.
 * @typedef {{ "page-change": { page: number }, "page-size-change": { size: number } }}
 *   PaginationEventDetail
 */

/**
 * Renders a list view's footer: a page size selector, previous and next buttons, and an
 * editable page number clamped to the valid range. The element never changes its own page;
 * it dispatches `page-change` and `page-size-change`, and the host sets `page` and `size` in
 * response.
 */
export class PaginationLit extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 0.75rem);
    }
    .page-size,
    .page-controls,
    .page-indicator {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
    }
    .page-input {
      width: 4ch;
      text-align: center;
      appearance: textfield;
    }
  `;

  // Without decorators, Lit reads the reactive properties from this static map. The properties
  // are assigned in the constructor, not as class fields, so no field shadows Lit's accessor.
  /** @satisfies {PropertyDeclarations} */
  static properties = {
    page: { type: Number },
    totalPages: { type: Number, attribute: "total-pages" },
    size: { type: Number },
    sizeOptions: { type: Array, attribute: "size-options" },
  };

  constructor() {
    super();
    /** The current page, from 1. @type {number} */
    this.page = 1;
    /** The number of pages; the page input clamps to it. @type {number} */
    this.totalPages = 1;
    /** The current page size, selected among `sizeOptions`. @type {number} */
    this.size = 12;
    /** The page sizes offered. @type {number[]} */
    this.sizeOptions = [12, 24, 48, 96];
  }

  /**
   * Dispatches one of the element's events; the detail's type follows the event's name.
   * @template {keyof PaginationEventDetail} K
   * @param {K} type
   * @param {PaginationEventDetail[K]} detail
   * @returns {void}
   */
  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** @returns {void} */
  #handlePrev() {
    if (this.page > 1) this.#emit("page-change", { page: this.page - 1 });
  }

  /** @returns {void} */
  #handleNext() {
    if (this.page < this.totalPages) this.#emit("page-change", { page: this.page + 1 });
  }

  /**
   * @param {Event} e
   * @returns {void}
   */
  #handleSizeChange(e) {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    this.#emit("page-size-change", { size: Number(target.value) });
  }

  /**
   * Clamps the typed page number to 1..totalPages. A non-number, or a number that clamps to
   * the current page, restores the input and dispatches nothing.
   * @param {Event} e
   * @returns {void}
   */
  #handlePageInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const raw = target.valueAsNumber;

    if (!Number.isFinite(raw)) {
      target.value = String(this.page);
      return;
    }

    const clamped = Math.min(Math.max(Math.trunc(raw), 1), this.totalPages);

    if (clamped === this.page) {
      target.value = String(this.page);
      return;
    }

    this.#emit("page-change", { page: clamped });
  }

  /**
   * @param {FocusEvent} e
   * @returns {void}
   */
  #handlePageFocus(e) {
    /** @type {HTMLInputElement} */ (e.target).select();
  }

  render() {
    return html`
      <div class="pagination">
        <label class="page-size">
          <span class="page-size-label">Page Size</span>
          <select @change=${this.#handleSizeChange}>
            ${this.sizeOptions.map(
              (n) => html`<option value=${n} ?selected=${n === this.size}>${n}</option>`,
            )}
          </select>
        </label>
        <div class="page-controls">
          <button
            aria-label="Previous page"
            ?disabled=${this.page <= 1}
            @click=${this.#handlePrev}
          >
            ‹
          </button>
          <span class="page-indicator">
            <input
              class="page-input"
              type="number"
              min="1"
              max=${this.totalPages}
              step="1"
              .value=${String(this.page)}
              ?disabled=${this.totalPages <= 1}
              aria-label="Page number"
              @change=${this.#handlePageInput}
              @focus=${this.#handlePageFocus}
            />
            <span aria-hidden="true">/ ${this.totalPages}</span>
          </span>
          <button
            aria-label="Next page"
            ?disabled=${this.page >= this.totalPages}
            @click=${this.#handleNext}
          >
            ›
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define(tagName, PaginationLit);
