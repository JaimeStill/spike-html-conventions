// Pagination element, Lit and plain JavaScript form: no types and outside the type check, with
// static properties in place of decorators. Ported from herald's
// app/client/ui/elements/pagination-controls, with herald's shared button and input styles
// folded into the element's own.
//
// The element dispatches `page-change` with { page } and `page-size-change` with { size }.

import { css, html, LitElement } from "lit";

/** The tag this variant defines; each of the six variants defines its own. */
export const tagName = "hd-pagination-lit-js";

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
  static properties = {
    page: { type: Number },
    totalPages: { type: Number, attribute: "total-pages" },
    size: { type: Number },
    sizeOptions: { type: Array, attribute: "size-options" },
  };

  constructor() {
    super();
    /** The current page, from 1. */
    this.page = 1;
    /** The number of pages; the page input clamps to it. */
    this.totalPages = 1;
    /** The current page size, selected among `sizeOptions`. */
    this.size = 12;
    /** The page sizes offered. */
    this.sizeOptions = [12, 24, 48, 96];
  }

  /** Dispatches one of the element's events. */
  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #handlePrev() {
    if (this.page > 1) this.#emit("page-change", { page: this.page - 1 });
  }

  #handleNext() {
    if (this.page < this.totalPages) this.#emit("page-change", { page: this.page + 1 });
  }

  #handleSizeChange(e) {
    this.#emit("page-size-change", { size: Number(e.target.value) });
  }

  /**
   * Clamps the typed page number to 1..totalPages. A non-number, or a number that clamps to
   * the current page, restores the input and dispatches nothing.
   */
  #handlePageInput(e) {
    const target = e.target;
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

  #handlePageFocus(e) {
    e.target.select();
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
