// Pagination, vanilla with a shadow root: the same container as the Lit version, on the platform
// alone. By hand it keeps what Lit's reactive properties give: the observed attributes and their
// conversion, the accessors, `disabled`'s reflection, properties set before the definition, and
// rendering. It forgoes batching and binding-level updates: every property change re-renders at
// once, in place, except the page input's value, which only `page` writes, so typing survives
// other changes. Its control styles mirror the Lit version's, as a sheet of its own.

import { define, emit, required } from "../foundation/dom.js";
import { buttonSheet } from "./button-sheet.js";

/** The tag this version defines. */
export const tagName = "sl-pagination-vanilla-shadow";

/**
 * `page-change`'s detail: the page asked for. It is null when Next is pressed on a page continued
 * by cursor, whose number the element doesn't know; the host follows the envelope's `next`.
 */
export interface PageChangeDetail {
  page: number | null;
}

/** `page-size-change`'s detail: the page size chosen. */
export interface PageSizeChangeDetail {
  size: number;
}

const styles = new CSSStyleSheet();
styles.replaceSync(`
  :host {
    display: block;
  }
  .summary {
    margin: 0 0 var(--space-2, 0.5rem);
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-1, GrayText);
  }
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3, 0.75rem);
    margin-top: var(--space-3, 0.75rem);
    padding-top: var(--space-3, 0.75rem);
    border-top: 1px solid var(--divider, GrayText);
  }
  .page-size,
  .page-controls,
  .page-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
  }
  .page-size-label,
  .page-indicator {
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-1, GrayText);
  }
  .input {
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border: 1px solid var(--divider, GrayText);
    border-radius: var(--radius-sm, 0.25rem);
    background: var(--bg-1, Field);
    color: var(--color, FieldText);
    font-size: var(--text-sm, 0.875rem);
    font-family: var(--font-mono, monospace);

    &:focus-visible {
      outline: 2px solid var(--blue, AccentColor);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
  .page-input {
    width: 4ch;
    padding: var(--space-2, 0.5rem) var(--space-1, 0.25rem);
    text-align: center;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      appearance: none;
      margin: 0;
    }
  }
  .btn-page {
    align-self: stretch;
    padding: 0 var(--space-3, 0.75rem);
    font-size: var(--text-xl, 1.25rem);
    line-height: 1;
  }
`);

// The parts that are always there, cloned once per element. The summary and the page count come
// and go, so they are built apart and placed by the render.
const template = document.createElement("template");
template.innerHTML = `
  <slot></slot>
  <div class="pagination">
    <label class="page-size">
      <span class="page-size-label"><slot name="label">Page Size</slot></span>
      <select class="input"></select>
    </label>
    <div class="page-controls">
      <button type="button" class="btn btn-page prev" aria-label="Previous page">‹</button>
      <span class="page-indicator">
        <input
          class="input page-input"
          type="number"
          min="1"
          step="1"
          aria-label="Page number"
        />
      </span>
      <button type="button" class="btn btn-page next" aria-label="Next page">›</button>
    </div>
  </div>
`;

// The attribute converters, as Lit's defaults for `type: Number` and `type: Array` read them: a
// removed attribute is null, and so is JSON that doesn't parse.
const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));

function toArray(value: string | null): number[] | null {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** The properties a script may set before the definition, upgraded in the constructor. */
const properties = ["page", "size", "total", "more", "pageSizes", "disabled"] as const;

/**
 * Pages through a listing. The host's children, its entries, sit in the default slot between a
 * "Showing X–Y of N" summary and the controls: a page size selector, labelled by the `label` slot
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to the
 * page count. The properties are the envelope's fields; the element never changes its own page,
 * it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export class PaginationVanillaShadow extends HTMLElement {
  static observedAttributes = ["page", "size", "total", "more", "page-sizes", "disabled"];

  #page: number | null = 1;
  #size: number | null = 12;
  #total: number | null = null;
  #more = false;
  #pageSizes: number[] | null = [12, 24, 48, 96];
  #disabled = false;

  readonly #summary = document.createElement("p");
  readonly #count = document.createElement("span");
  readonly #select: HTMLSelectElement;
  readonly #prev: HTMLButtonElement;
  readonly #next: HTMLButtonElement;
  readonly #input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [buttonSheet, styles];
    root.append(template.content.cloneNode(true));
    this.#summary.className = "summary";
    this.#count.setAttribute("aria-hidden", "true");

    this.#select = required(root, "select");
    this.#prev = required(root, ".prev");
    this.#next = required(root, ".next");
    this.#input = required(root, ".page-input");

    this.#select.addEventListener("change", () => this.#handleSizeChange());
    this.#prev.addEventListener("click", () => this.#handlePrev());
    this.#next.addEventListener("click", () => this.#handleNext());
    this.#input.addEventListener("change", () => this.#handlePageInput());
    this.#input.addEventListener("focus", () => this.#input.select());

    // A property set before the definition is an own field on the instance, which hides the
    // accessor below; it is taken off and set again through the setter, as Lit does.
    for (const name of properties) {
      if (Object.hasOwn(this, name)) {
        const value: unknown = Reflect.get(this, name);
        Reflect.deleteProperty(this, name);
        Reflect.set(this, name, value);
      }
    }
    this.#input.value = this.#page === null ? "" : String(this.#page);
    this.#render();
  }

  /** The page's number, from 1; null on a page continued by cursor, which disables the input. */
  get page(): number | null {
    return this.#page;
  }
  set page(value: number | null) {
    if (value === this.#page) return;
    this.#page = value;
    this.#input.value = value === null ? "" : String(value);
    this.#render();
  }

  /** The page size, selected among `pageSizes`. */
  get size(): number | null {
    return this.#size;
  }
  set size(value: number | null) {
    if (value === this.#size) return;
    this.#size = value;
    this.#render();
  }

  /** The listing's row count; null when the read didn't count, and Next then follows `more`. */
  get total(): number | null {
    return this.#total;
  }
  set total(value: number | null) {
    if (value === this.#total) return;
    this.#total = value;
    this.#render();
  }

  /** Whether a further page exists. */
  get more(): boolean {
    return this.#more;
  }
  set more(value: boolean) {
    if (value === this.#more) return;
    this.#more = value;
    this.#render();
  }

  /** The page sizes offered. */
  get pageSizes(): number[] | null {
    return this.#pageSizes;
  }
  set pageSizes(value: number[] | null) {
    if (value === this.#pageSizes) return;
    this.#pageSizes = value;
    this.#render();
  }

  /** Disables every control; reflected to the `disabled` attribute. */
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    if (value === this.#disabled) return;
    this.#disabled = value;
    // The attribute's callback sets the property back to the same value, which stops there.
    this.toggleAttribute("disabled", value);
    this.#render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case "page":
        this.page = toNumber(value);
        break;
      case "size":
        this.size = toNumber(value);
        break;
      case "total":
        this.total = toNumber(value);
        break;
      case "more":
        this.more = value !== null;
        break;
      case "page-sizes":
        this.pageSizes = toArray(value);
        break;
      case "disabled":
        this.disabled = value !== null;
        break;
    }
  }

  /** The number of pages, from the total and the size; null when either is unknown. */
  get pageCount(): number | null {
    if (this.#total === null || !this.#size) return null;
    return Math.max(1, Math.ceil(this.#total / this.#size));
  }

  get #hasPrev(): boolean {
    return this.#page !== null && this.#page > 1;
  }

  get #hasNext(): boolean {
    const count = this.pageCount;
    if (count === null) return this.#more;
    return this.#page !== null && this.#page < count;
  }

  #handlePrev(): void {
    if (this.#page !== null && this.#hasPrev) {
      emit<PageChangeDetail>(this, "page-change", { page: this.#page - 1 });
    }
  }

  #handleNext(): void {
    if (this.#hasNext) {
      emit<PageChangeDetail>(this, "page-change", {
        page: this.#page === null ? null : this.#page + 1,
      });
    }
  }

  #handleSizeChange(): void {
    emit<PageSizeChangeDetail>(this, "page-size-change", { size: Number(this.#select.value) });
  }

  // Clamps the typed number to 1..pageCount (no upper bound while the count is unknown) and asks
  // for that page if it differs. The input goes back to the current page either way: it shows
  // `page` until the host sets another.
  #handlePageInput(): void {
    const typed = this.#input.valueAsNumber;
    if (this.#page === null) return;
    this.#input.value = String(this.#page);
    if (!Number.isFinite(typed)) return;

    const clamped = Math.min(Math.max(Math.trunc(typed), 1), this.pageCount ?? Infinity);
    if (clamped !== this.#page) {
      emit<PageChangeDetail>(this, "page-change", { page: clamped });
    }
  }

  #renderSummary(): void {
    const page = this.#page;
    const size = this.#size;
    const total = this.#total;
    if (total === null || total <= 0 || page === null || !size) {
      this.#summary.remove();
      return;
    }
    const first = Math.min((page - 1) * size + 1, total);
    const last = Math.min(page * size, total);
    this.#summary.textContent = `Showing ${first}–${last} of ${total}`;
    this.shadowRoot?.prepend(this.#summary);
  }

  // Brings the shadow tree in line with every property but the page input's value. The summary
  // and the count are placed or removed; nothing focusable is ever moved, so focus stays put.
  #render(): void {
    const count = this.pageCount;
    this.#renderSummary();

    this.#select.replaceChildren(
      ...(this.#pageSizes ?? []).map((n) => {
        const selected = n === this.#size;
        return new Option(String(n), String(n), selected, selected);
      }),
    );
    this.#select.disabled = this.#disabled;
    this.#prev.disabled = this.#disabled || !this.#hasPrev;
    this.#next.disabled = this.#disabled || !this.#hasNext;

    this.#input.disabled = this.#disabled || this.#page === null || count === 1;
    if (count === null) {
      this.#input.removeAttribute("max");
      this.#count.remove();
    } else {
      this.#input.max = String(count);
      this.#count.textContent = `/ ${count}`;
      this.#input.after(this.#count);
    }
  }
}

define(tagName, PaginationVanillaShadow);

declare global {
  interface HTMLElementTagNameMap {
    "sl-pagination-vanilla-shadow": PaginationVanillaShadow;
  }
}
