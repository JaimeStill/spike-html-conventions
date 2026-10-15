// Pagination element, Lit and TypeScript form: only erasable syntax, and static properties in
// place of decorators. Ported from herald's app/client/ui/elements/pagination-controls, with
// herald's shared button and input styles folded into the element's own.

import { css, html, LitElement, type PropertyDeclarations } from "lit";

/** The tag this variant defines; each of the six variants defines its own. */
export const tagName = "hd-pagination-lit-ts";

/** Each event the element dispatches, mapped to its `detail`. */
export interface PaginationEventDetail {
  "page-change": { page: number };
  "page-size-change": { size: number };
}

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

  // Without decorators, Lit reads the reactive properties from this static map. Each field is
  // `declare`d so the class emits no field of its own to shadow Lit's accessor, and its
  // default is set in the constructor.
  static properties = {
    page: { type: Number },
    totalPages: { type: Number, attribute: "total-pages" },
    size: { type: Number },
    sizeOptions: { type: Array, attribute: "size-options" },
  } satisfies PropertyDeclarations;

  /** The current page, from 1. */
  declare page: number;
  /** The number of pages; the page input clamps to it. */
  declare totalPages: number;
  /** The current page size, selected among `sizeOptions`. */
  declare size: number;
  /** The page sizes offered. */
  declare sizeOptions: number[];

  constructor() {
    super();
    this.page = 1;
    this.totalPages = 1;
    this.size = 12;
    this.sizeOptions = [12, 24, 48, 96];
  }

  /** Dispatches one of the element's events; the detail's type follows the event's name. */
  #emit<K extends keyof PaginationEventDetail>(type: K, detail: PaginationEventDetail[K]): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #handlePrev(): void {
    if (this.page > 1) this.#emit("page-change", { page: this.page - 1 });
  }

  #handleNext(): void {
    if (this.page < this.totalPages) this.#emit("page-change", { page: this.page + 1 });
  }

  #handleSizeChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.#emit("page-size-change", { size: Number(target.value) });
  }

  // Clamps the typed page number to 1..totalPages. A non-number, or a number that clamps to
  // the current page, restores the input and dispatches nothing.
  #handlePageInput(e: Event): void {
    const target = e.target as HTMLInputElement;
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

  #handlePageFocus(e: FocusEvent): void {
    (e.target as HTMLInputElement).select();
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

// Typed lookups for the tag and the events: `document.createElement(tagName)` and
// `querySelector` return the class, and listeners receive the typed `CustomEvent`.
declare global {
  interface HTMLElementTagNameMap {
    "hd-pagination-lit-ts": PaginationLit;
  }
  interface HTMLElementEventMap {
    "page-change": CustomEvent<{ page: number }>;
    "page-size-change": CustomEvent<{ size: number }>;
  }
}
