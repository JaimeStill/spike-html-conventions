// Pagination element, vanilla and TypeScript form: a plain custom element with only erasable
// syntax. Ported from herald's app/client/ui/elements/pagination-controls (a Lit element),
// with the same properties, attributes, events, and markup, and herald's shared button and
// input styles folded into the element's own.

/** The tag this variant defines; each of the six variants defines its own. */
export const tagName = "hd-pagination-vanilla-ts";

/** Each event the element dispatches, mapped to its `detail`. */
export interface PaginationEventDetail {
  "page-change": { page: number };
  "page-size-change": { size: number };
}

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
  #sizeOptions: number[] = [12, 24, 48, 96];

  // The shadow tree's controls, found once in the constructor.
  readonly #select: HTMLSelectElement;
  readonly #prev: HTMLButtonElement;
  readonly #next: HTMLButtonElement;
  readonly #input: HTMLInputElement;
  readonly #total: HTMLSpanElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [styles];
    root.append(template.content.cloneNode(true));

    // The template above guarantees each of these, so the casts hold.
    this.#select = root.querySelector("select") as HTMLSelectElement;
    this.#prev = root.querySelector(".prev") as HTMLButtonElement;
    this.#next = root.querySelector(".next") as HTMLButtonElement;
    this.#input = root.querySelector(".page-input") as HTMLInputElement;
    this.#total = root.querySelector(".total") as HTMLSpanElement;

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
  get page(): number {
    return this.#page;
  }
  set page(value: number) {
    this.#page = value;
    this.#render();
  }

  /** The number of pages; the page input clamps to it. */
  get totalPages(): number {
    return this.#totalPages;
  }
  set totalPages(value: number) {
    this.#totalPages = value;
    this.#render();
  }

  /** The current page size, selected among `sizeOptions`. */
  get size(): number {
    return this.#size;
  }
  set size(value: number) {
    this.#size = value;
    this.#render();
  }

  /** The page sizes offered. */
  get sizeOptions(): number[] {
    return this.#sizeOptions;
  }
  set sizeOptions(value: number[]) {
    this.#sizeOptions = value;
    this.#render();
  }

  // Attributes set the properties, as Lit's `type: Number` and `type: Array` converters do:
  // a number, or a JSON array.
  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === "page") this.page = Number(value);
    else if (name === "total-pages") this.totalPages = Number(value);
    else if (name === "size") this.size = Number(value);
    else if (name === "size-options") this.sizeOptions = value === null ? [] : JSON.parse(value);
  }

  /** Dispatches one of the element's events; the detail's type follows the event's name. */
  #emit<K extends keyof PaginationEventDetail>(type: K, detail: PaginationEventDetail[K]): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  // Clamps the typed page number to 1..totalPages. A non-number, or a number that clamps to
  // the current page, restores the input and dispatches nothing.
  #handlePageInput(): void {
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

  // Brings the shadow tree in line with the properties. Called on every property change, so it
  // stays cheap: the options are rebuilt, everything else is set in place.
  #render(): void {
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

// Typed lookups for the tag and the events: `document.createElement(tagName)` and
// `querySelector` return the class, and listeners receive the typed `CustomEvent`.
declare global {
  interface HTMLElementTagNameMap {
    "hd-pagination-vanilla-ts": PaginationVanilla;
  }
  interface HTMLElementEventMap {
    "page-change": CustomEvent<{ page: number }>;
    "page-size-change": CustomEvent<{ size: number }>;
  }
}
