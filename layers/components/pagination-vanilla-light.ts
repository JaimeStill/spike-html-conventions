// Pagination, vanilla in light DOM: the same container as the other versions, on the platform
// alone, rendered into the element itself. By hand it keeps what the shadow version builds by
// hand: the observed attributes and their conversion, the accessors, `disabled`'s reflection,
// properties set before the definition, and rendering, every change at once and in place.
//
// Light DOM costs it the slots. The host's children are placed by hand: on connection and on
// every change to its children, a MutationObserver moves each entry into the entries region,
// between the summary and the controls, in the order the host added it, and each `slot="label"`
// child into the label, in place of "Page Size". A host that replaces the element's children
// replaces its entries and label, and the element puts its own parts back. An entry is moved, so
// a host inserts before an entry by the entry's own parent, and its parts are built in the
// constructor but placed only once connected, since an element gains no children while it is
// constructed. The summary stays in place, hidden while empty, so the parts are always three.
//
// Light DOM costs it encapsulation too: its styles sit in the document, so it imports its sheet,
// pagination-vanilla-light.css, as a CSS module script and adopts it there, once, in the cascade
// layer spike-html-conventions.pagination, every rule nested under its tag. The controls are bare:
// the page's spike-html-design baseline styles them, buttons included, so the sheet gives them
// layout alone and reads only that baseline's tokens.

import { define, emit, required } from "../foundation/dom.js";
import sheet from "./pagination-vanilla-light.css" with { type: "css" };

/** The tag this version defines. */
export const tagName = "sl-pagination-vanilla-light";

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

/** Adds the sheet to the document's adopted sheets, once however many instances connect. */
function adopt(): void {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
}

// The element's own parts, cloned once per element: the summary, the region the entries are
// moved into, and the controls. The page count comes and goes, so it is built apart.
const template = document.createElement("template");
template.innerHTML = `
  <p class="summary" hidden></p>
  <div class="entries"></div>
  <div class="pagination">
    <label class="page-size">
      <span class="page-size-label">Page Size</span>
      <select></select>
    </label>
    <div class="page-controls">
      <button type="button" class="page-step prev" aria-label="Previous page">‹</button>
      <span class="page-indicator">
        <input class="page-input" type="number" min="1" step="1" aria-label="Page number" />
      </span>
      <button type="button" class="page-step next" aria-label="Next page">›</button>
    </div>
  </div>
`;

/** The label's text while the host gives none. */
const defaultLabel = "Page Size";

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

/** Whether a child the host added is the label's, which a shadow version's `label` slot takes. */
const isLabel = (node: Node): node is Element => node instanceof Element && node.slot === "label";

/**
 * Pages through a listing. The host's children, its entries, sit between a "Showing X–Y of N"
 * summary and the controls: a page size selector, labelled by the host's `slot="label"` child
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to
 * the page count. The properties are the envelope's fields; the element never changes its own
 * page, it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export class PaginationVanillaLight extends HTMLElement {
  static observedAttributes = ["page", "size", "total", "more", "page-sizes", "disabled"];

  #page: number | null = 1;
  #size: number | null = 12;
  #total: number | null = null;
  #more = false;
  #pageSizes: number[] | null = [12, 24, 48, 96];
  #disabled = false;

  readonly #summary: HTMLElement;
  readonly #entries: HTMLElement;
  readonly #controls: HTMLElement;
  readonly #label: HTMLElement;
  readonly #count = document.createElement("span");
  readonly #select: HTMLSelectElement;
  readonly #prev: HTMLButtonElement;
  readonly #next: HTMLButtonElement;
  readonly #input: HTMLInputElement;

  // Places the host's children whenever they change, and the label's when the host takes its
  // label out again.
  readonly #observer = new MutationObserver(() => this.#place());

  constructor() {
    super();
    const parts = template.content.cloneNode(true) as DocumentFragment;
    this.#summary = required(parts, ".summary");
    this.#entries = required(parts, ".entries");
    this.#controls = required(parts, ".pagination");
    this.#label = required(parts, ".page-size-label");
    this.#select = required(parts, "select");
    this.#prev = required(parts, ".prev");
    this.#next = required(parts, ".next");
    this.#input = required(parts, ".page-input");
    this.#count.setAttribute("aria-hidden", "true");

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

  connectedCallback(): void {
    adopt();
    this.#observer.observe(this, { childList: true });
    this.#observer.observe(this.#label, { childList: true });
    this.#place();
  }

  disconnectedCallback(): void {
    this.#observer.disconnect();
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

  // Brings the host's children into the element's parts, as the shadow versions' slots would
  // show them. If the parts aren't the host's children, on the first connection or after the host
  // replaced the element's children, they are put back first, empty of the entries and label it
  // replaced. Then each label child goes into the label and every
  // other child, in order, into the entries; the whitespace and comments between them stay. The
  // moves are this method's own records, taken so the observer doesn't call it again for them.
  #place(): void {
    const parts: Node[] = [this.#summary, this.#entries, this.#controls];
    if (parts.some((part) => part.parentNode !== this)) {
      this.#entries.replaceChildren();
      this.#label.replaceChildren(defaultLabel);
      this.prepend(...parts);
    }

    const labels: Element[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (parts.includes(node)) continue;
      if (isLabel(node)) {
        labels.push(node);
      } else if (node instanceof Element || (node instanceof Text && node.data.trim())) {
        this.#entries.append(node);
      }
    }

    const kept = Array.from(this.#label.children).filter(isLabel);
    if (labels.length > 0) {
      this.#label.replaceChildren(...kept, ...labels);
    } else if (kept.length === 0 && this.#label.textContent !== defaultLabel) {
      this.#label.replaceChildren(defaultLabel);
    }
    this.#observer.takeRecords();
  }

  // Shows the summary while there is a total to summarize, and hides it, empty, while not.
  #renderSummary(): void {
    const page = this.#page;
    const size = this.#size;
    const total = this.#total;
    const shown = total !== null && total > 0 && page !== null && !!size;
    this.#summary.hidden = !shown;
    if (!shown) {
      this.#summary.textContent = "";
      return;
    }
    const first = Math.min((page - 1) * size + 1, total);
    const last = Math.min(page * size, total);
    this.#summary.textContent = `Showing ${first}–${last} of ${total}`;
  }

  // Brings the parts in line with every property but the page input's value. Only the count is
  // placed or removed; nothing focusable is ever moved, so focus stays put.
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

define(tagName, PaginationVanillaLight);

declare global {
  interface HTMLElementTagNameMap {
    "sl-pagination-vanilla-light": PaginationVanillaLight;
  }
}
