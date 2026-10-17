// Pagination, Lit in light DOM: the same container as the shadow version, rendered into the
// element itself (`createRenderRoot` returns the element), its controls around the host's own
// children.
//
// Light DOM costs it the slots. The host's children are placed by hand: once the first render is
// in, and on every change to its children, a MutationObserver moves each entry into the entries
// region, between the summary and the controls, in the order the host added it, and each
// `slot="label"` child into the label, in place of "Page Size". Lit never sees these moves: the
// region and the label hold no binding, so no render touches what they hold. A host that
// replaces the element's children replaces its entries and label, and the element puts its own
// parts back; Lit updates them by reference, wherever they are. An entry is moved, so a host
// inserts before an entry by the entry's own parent. The summary stays in place, hidden while
// empty, so the parts are always three.
//
// Light DOM costs it encapsulation too, and Lit's `static styles`, which Lit adopts into a shadow
// root alone. It imports its sheet, pagination-lit-light.css, as a CSS module script and adopts it
// into the document instead, once, in the cascade layer spike-html-conventions.pagination, every
// rule nested under its tag. The controls are bare: the page's spike-html-design baseline styles
// them, buttons included, so the sheet gives them layout alone and reads only that baseline's
// tokens.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { createRef, ref } from "lit/directives/ref.js";

import { define, emit } from "../foundation/dom.js";
import sheet from "./pagination-lit-light.css" with { type: "css" };

/** The tag this version defines. */
export const tagName = "sl-pagination-lit-light";

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

/** The label's text while the host gives none. */
const defaultLabel = "Page Size";

/** Whether a child the host added is the label's, which a shadow version's `label` slot takes. */
const isLabel = (node: Node): node is Element => node instanceof Element && node.slot === "label";

/**
 * Pages through a listing. The host's children, its entries, sit between a "Showing X–Y of N"
 * summary and the controls: a page size selector, labelled by the host's `slot="label"` child
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to
 * the page count. The properties are the envelope's fields; the element never changes its own
 * page, it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export class PaginationLitLight extends LitElement {
  // Lit reads the reactive properties from this static map, in place of decorators. Each field is
  // `declare`d, so the class emits no field to shadow Lit's accessor, and given its default in
  // the constructor. Lit's converters give the attribute contract: a removed number attribute is
  // null, and page-sizes is parsed as JSON, null when it isn't valid.
  static properties = {
    page: { type: Number },
    size: { type: Number },
    total: { type: Number },
    more: { type: Boolean },
    pageSizes: { type: Array, attribute: "page-sizes" },
    disabled: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The page's number, from 1; null on a page continued by cursor, which disables the input. */
  declare page: number | null;
  /** The page size, selected among `pageSizes`. */
  declare size: number | null;
  /** The listing's row count; null when the read didn't count, and Next then follows `more`. */
  declare total: number | null;
  /** Whether a further page exists. */
  declare more: boolean;
  /** The page sizes offered. */
  declare pageSizes: number[] | null;
  /** Disables every control; reflected to the `disabled` attribute. */
  declare disabled: boolean;

  // The rendered parts the host's children are placed among, and the label they may replace.
  readonly #summary = createRef<HTMLElement>();
  readonly #entries = createRef<HTMLElement>();
  readonly #controls = createRef<HTMLElement>();
  readonly #label = createRef<HTMLElement>();

  // Places the host's children whenever they change, and the label's when the host takes its
  // label out again.
  readonly #observer = new MutationObserver(() => this.#place());

  constructor() {
    super();
    this.page = 1;
    this.size = 12;
    this.total = null;
    this.more = false;
    this.pageSizes = [12, 24, 48, 96];
    this.disabled = false;
  }

  /** Renders into the element itself, in light DOM. */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    adopt();
    if (this.hasUpdated) this.#watch();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  protected firstUpdated(): void {
    this.#watch();
  }

  /** The number of pages, from the total and the size; null when either is unknown. */
  get pageCount(): number | null {
    if (this.total === null || !this.size) return null;
    return Math.max(1, Math.ceil(this.total / this.size));
  }

  get #hasPrev(): boolean {
    return this.page !== null && this.page > 1;
  }

  get #hasNext(): boolean {
    const count = this.pageCount;
    if (count === null) return this.more;
    return this.page !== null && this.page < count;
  }

  #handlePrev(): void {
    if (this.page !== null && this.#hasPrev) {
      emit<PageChangeDetail>(this, "page-change", { page: this.page - 1 });
    }
  }

  #handleNext(): void {
    if (this.#hasNext) {
      emit<PageChangeDetail>(this, "page-change", {
        page: this.page === null ? null : this.page + 1,
      });
    }
  }

  #handleSizeChange(e: Event): void {
    const size = Number((e.target as HTMLSelectElement).value);
    emit<PageSizeChangeDetail>(this, "page-size-change", { size });
  }

  // Clamps the typed number to 1..pageCount (no upper bound while the count is unknown) and asks
  // for that page if it differs. The input goes back to the current page either way: it shows
  // `page` until the host sets another.
  #handlePageInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const typed = input.valueAsNumber;
    if (this.page === null) return;
    input.value = String(this.page);
    if (!Number.isFinite(typed)) return;

    const clamped = Math.min(Math.max(Math.trunc(typed), 1), this.pageCount ?? Infinity);
    if (clamped !== this.page) {
      emit<PageChangeDetail>(this, "page-change", { page: clamped });
    }
  }

  #handlePageFocus(e: FocusEvent): void {
    (e.target as HTMLInputElement).select();
  }

  /** Observes the host's children and the label's, and places what the host holds now. */
  #watch(): void {
    this.#observer.observe(this, { childList: true });
    this.#observer.observe(this.#label.value as HTMLElement, { childList: true });
    this.#place();
  }

  // Brings the host's children into the rendered parts, as the shadow version's slots would show
  // them. If the parts aren't the host's children, after the host replaced the element's
  // children, they are put back first, empty of the entries and label it replaced. Then each
  // label child goes into the label and every other child, in order, into the entries; Lit's
  // markers, the whitespace, and comments stay. The moves are this method's own records, taken so
  // the observer doesn't call it again for them.
  #place(): void {
    const entries = this.#entries.value as HTMLElement;
    const label = this.#label.value as HTMLElement;
    const parts: Node[] = [this.#summary, this.#entries, this.#controls].map(
      (part) => part.value as HTMLElement,
    );
    if (parts.some((part) => part.parentNode !== this)) {
      entries.replaceChildren();
      label.replaceChildren(defaultLabel);
      this.prepend(...parts);
    }

    const labels: Element[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (parts.includes(node)) continue;
      if (isLabel(node)) {
        labels.push(node);
      } else if (node instanceof Element || (node instanceof Text && node.data.trim())) {
        entries.append(node);
      }
    }

    const kept = Array.from(label.children).filter(isLabel);
    if (labels.length > 0) {
      label.replaceChildren(...kept, ...labels);
    } else if (kept.length === 0 && label.textContent !== defaultLabel) {
      label.replaceChildren(defaultLabel);
    }
    this.#observer.takeRecords();
  }

  #summaryText(): string {
    const { page, size, total } = this;
    if (total === null || total <= 0 || page === null || !size) return "";
    const first = Math.min((page - 1) * size + 1, total);
    const last = Math.min(page * size, total);
    return `Showing ${first}–${last} of ${total}`;
  }

  render() {
    const count = this.pageCount;
    const summary = this.#summaryText();
    return html`
      <p class="summary" ?hidden=${!summary} ${ref(this.#summary)}>${summary}</p>
      <div class="entries" ${ref(this.#entries)}></div>
      <div class="pagination" ${ref(this.#controls)}>
        <label class="page-size">
          <span class="page-size-label" ${ref(this.#label)}>Page Size</span>
          <select ?disabled=${this.disabled} @change=${this.#handleSizeChange}>
            ${(this.pageSizes ?? []).map(
              (n) => html`<option value=${n} ?selected=${n === this.size}>${n}</option>`,
            )}
          </select>
        </label>
        <div class="page-controls">
          <button
            type="button"
            class="page-step"
            aria-label="Previous page"
            ?disabled=${this.disabled || !this.#hasPrev}
            @click=${this.#handlePrev}
          >
            ‹
          </button>
          <span class="page-indicator">
            <input
              class="page-input"
              type="number"
              min="1"
              max=${count ?? nothing}
              step="1"
              .value=${this.page === null ? "" : String(this.page)}
              ?disabled=${this.disabled || this.page === null || count === 1}
              aria-label="Page number"
              @change=${this.#handlePageInput}
              @focus=${this.#handlePageFocus}
            />
            ${count === null ? nothing : html`<span aria-hidden="true">/ ${count}</span>`}
          </span>
          <button
            type="button"
            class="page-step"
            aria-label="Next page"
            ?disabled=${this.disabled || !this.#hasNext}
            @click=${this.#handleNext}
          >
            ›
          </button>
        </div>
      </div>
    `;
  }
}

define(tagName, PaginationLitLight);

declare global {
  interface HTMLElementTagNameMap {
    "sl-pagination-lit-light": PaginationLitLight;
  }
}
