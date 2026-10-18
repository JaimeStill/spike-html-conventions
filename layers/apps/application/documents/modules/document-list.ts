// The documents app's list feature, a module: it asks the root for the context (the service, the
// router, the formatters; see ../domains/context.ts), reads a page of documents through the
// service, and renders it in the pagination component around the app's own table element. The
// page number lives in the URL's query, which it reads from the router's current match and sets
// through router.query, so the view stays mounted while it pages.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import "../../../../components/pagination-lit-shadow.js";
import type { PageChangeDetail } from "../../../../components/pagination-lit-shadow.js";
import { define, emit } from "../../../../foundation/dom.js";
import type { Page, Result } from "../../../../sdk/api.js";
import { contextRequest, type ContextRequest, type DocumentsContext } from "../domains/context.js";
import type { Document } from "../domains/document.js";
import "../elements/document-table.js";
import type { DocumentOpenDetail } from "../elements/document-table.js";

/** The tag the module defines. */
export const tagName = "documents-list";

/** Lists a folder's documents a page at a time; `document-open` from the table sets the `open`
 * query parameter to the document's id. */
export class DocumentList extends LitElement {
  static properties = {
    folder: { type: String },
    result: { state: true },
  } satisfies PropertyDeclarations;

  /** The folder listed; every folder when empty. */
  declare folder: string;
  /** The last read's outcome; undefined until it resolves. */
  declare result: Result<Page<Document>> | undefined;

  #context: DocumentsContext | undefined;
  #read: AbortController | undefined;

  constructor() {
    super();
    this.folder = "";
    this.result = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    emit<ContextRequest>(this, contextRequest, {
      provide: (context) => {
        this.#context = context;
      },
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#read?.abort();
  }

  updated(changed: PropertyValues<this>) {
    if (changed.has("folder")) void this.#load(this.#queryPage());
  }

  render() {
    const result = this.result;
    if (result === undefined) return nothing;
    if (!result.ok) return html`<p role="alert">${result.problem.title}</p>`;
    const { items, page, size, total, more } = result.data;
    return html`<sl-pagination-lit-shadow
      .page=${page ?? null}
      .size=${size}
      .total=${total ?? null}
      .more=${more}
      @page-change=${this.#pageChange}
    >
      <documents-table
        .rows=${items}
        .format=${this.#context?.format ?? null}
        @document-open=${this.#open}
      ></documents-table>
    </sl-pagination-lit-shadow>`;
  }

  /** The query's page, 1 when it is absent or not a positive integer. */
  #queryPage(): number {
    const page = Number(this.#context?.router.current?.query.get("page"));
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  // Reads `page`, aborting the read before it; an aborted read's problem is dropped, since a newer
  // read, or none once disconnected, owns the result.
  async #load(page: number) {
    const context = this.#context;
    if (context === undefined) return;
    this.#read?.abort();
    const read = new AbortController();
    this.#read = read;
    const result = await context.documents.list(
      { folder: this.folder || undefined, page },
      { signal: read.signal },
    );
    if (!read.signal.aborted) this.result = result;
  }

  // The service reads by page number alone, so a page is never continued by cursor and the
  // pagination's null page (Next on a cursor page) doesn't arise.
  #pageChange(event: CustomEvent<PageChangeDetail>) {
    const page = event.detail.page;
    if (page === null) return;
    this.#context?.router.query({ page: String(page) });
    void this.#load(page);
  }

  #open(event: CustomEvent<DocumentOpenDetail>) {
    this.#context?.router.query({ open: event.detail.id });
  }
}

define(tagName, DocumentList);
