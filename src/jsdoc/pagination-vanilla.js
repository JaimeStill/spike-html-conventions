// Pagination element, vanilla and JSDoc form: a plain custom element that runs as written,
// with its types in JSDoc comments that tsc checks. Ported from herald's
// app/client/ui/elements/pagination-controls (a Lit element), with the same properties,
// attributes, events, and markup, and herald's shared button and input styles folded into the
// element's own. The tag and event maps, which JSDoc can't declare, are in globals.d.ts.

/** The tag this variant defines; each of the six variants defines its own. */
export const tagName = "hd-pagination-vanilla-jsdoc";

// The typedef's type stays on one line: tsc 7.0.2's declaration emit copies the leading `*` of
// a type spread over several lines into the .d.ts, which then fails to parse.
/**
 * Each event the element dispatches, mapped to its `detail`.
 * @typedef {{ "page-change": { page: number }, "page-size-change": { size: number } }}
 *   PaginationEventDetail
 */

const styles = new CSSStyleSheet();
styles.replaceSync(`
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
`);

const template = document.createElement("template");
template.innerHTML = `
  <div class="pagination">
    <label class="page-size">
      <span class="page-size-label">Page Size</span>
      <select></select>
    </label>
    <div class="page-controls">
      <button class="prev" aria-label="Previous page">‹</button>
      <span class="page-indicator">
        <input class="page-input" type="number" min="1" step="1" aria-label="Page number" />
        <span class="total" aria-hidden="true"></span>
      </span>
      <button class="next" aria-label="Next page">›</button>
    </div>
  </div>
`;

/**
 * Renders a list view's footer: a page size selector, previous and next buttons, and an
 * editable page number clamped to the valid range. The element never changes its own page;
 * it dispatches `page-change` and `page-size-change`, and the host sets `page` and `size` in
 * response.
 */
export class PaginationVanilla extends HTMLElement {
  static observedAttributes = ["page", "total-pages", "size", "size-options"];

  #page = 1;
  #totalPages = 1;
  #size = 12;
  /** @type {number[]} */
  #sizeOptions = [12, 24, 48, 96];

  // The shadow tree's controls, found once in the constructor.
  /** @readonly @type {HTMLSelectElement} */
  #select;
  /** @readonly @type {HTMLButtonElement} */
  #prev;
  /** @readonly @type {HTMLButtonElement} */
  #next;
  /** @readonly @type {HTMLInputElement} */
  #input;
  /** @readonly @type {HTMLSpanElement} */
  #total;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [styles];
    root.append(template.content.cloneNode(true));

    // The template above guarantees each of these, so the casts hold.
    this.#select = /** @type {HTMLSelectElement} */ (root.querySelector("select"));
    this.#prev = /** @type {HTMLButtonElement} */ (root.querySelector(".prev"));
    this.#next = /** @type {HTMLButtonElement} */ (root.querySelector(".next"));
    this.#input = /** @type {HTMLInputElement} */ (root.querySelector(".page-input"));
    this.#total = /** @type {HTMLSpanElement} */ (root.querySelector(".total"));

    this.#select.addEventListener("change", () =>
      this.#emit("page-size-change", { size: Number(this.#select.value) }),
    );
    this.#prev.addEventListener("click", () => {
      if (this.#page > 1) this.#emit("page-change", { page: this.#page - 1 });
    });
    this.#next.addEventListener("click", () => {
      if (this.#page < this.#totalPages) this.#emit("page-change", { page: this.#page + 1 });
    });
    this.#input.addEventListener("change", () => this.#handlePageInput());
    this.#input.addEventListener("focus", () => this.#input.select());

    this.#render();
  }

  /** The current page, from 1. */
  get page() {
    return this.#page;
  }
  set page(value) {
    this.#page = value;
    this.#render();
  }

  /** The number of pages; the page input clamps to it. */
  get totalPages() {
    return this.#totalPages;
  }
  set totalPages(value) {
    this.#totalPages = value;
    this.#render();
  }

  /** The current page size, selected among `sizeOptions`. */
  get size() {
    return this.#size;
  }
  set size(value) {
    this.#size = value;
    this.#render();
  }

  /** The page sizes offered. */
  get sizeOptions() {
    return this.#sizeOptions;
  }
  set sizeOptions(value) {
    this.#sizeOptions = value;
    this.#render();
  }

  /**
   * Attributes set the properties, as Lit's `type: Number` and `type: Array` converters do: a
   * number, or a JSON array.
   * @param {string} name
   * @param {string | null} _old
   * @param {string | null} value
   * @returns {void}
   */
  attributeChangedCallback(name, _old, value) {
    if (name === "page") this.page = Number(value);
    else if (name === "total-pages") this.totalPages = Number(value);
    else if (name === "size") this.size = Number(value);
    else if (name === "size-options") this.sizeOptions = value === null ? [] : JSON.parse(value);
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

  /**
   * Clamps the typed page number to 1..totalPages. A non-number, or a number that clamps to
   * the current page, restores the input and dispatches nothing.
   * @returns {void}
   */
  #handlePageInput() {
    const raw = this.#input.valueAsNumber;

    if (!Number.isFinite(raw)) {
      this.#input.value = String(this.#page);
      return;
    }

    const clamped = Math.min(Math.max(Math.trunc(raw), 1), this.#totalPages);

    if (clamped === this.#page) {
      this.#input.value = String(this.#page);
      return;
    }

    this.#emit("page-change", { page: clamped });
  }

  /**
   * Brings the shadow tree in line with the properties. Called on every property change, so
   * it stays cheap: the options are rebuilt, everything else is set in place.
   * @returns {void}
   */
  #render() {
    this.#select.replaceChildren(
      ...this.#sizeOptions.map((n) => {
        const option = document.createElement("option");
        option.value = String(n);
        option.textContent = String(n);
        option.selected = n === this.#size;
        return option;
      }),
    );
    this.#prev.disabled = this.#page <= 1;
    this.#next.disabled = this.#page >= this.#totalPages;
    this.#input.max = String(this.#totalPages);
    this.#input.value = String(this.#page);
    this.#input.disabled = this.#totalPages <= 1;
    this.#total.textContent = `/ ${this.#totalPages}`;
  }
}

customElements.define(tagName, PaginationVanilla);
