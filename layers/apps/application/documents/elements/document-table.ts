// The documents app's table, an app-internal element: presentational, props in and events out,
// like a component, but the app's own. It imports no other tier and not the SDK, so it declares
// the row it shows (a domains Document satisfies it) and takes the formatters as a property: they
// are declarations (layers/foundation/format.d.ts), imported for their types alone.

import { html, LitElement, type PropertyDeclarations } from "lit";

import { define, emit } from "../../../../foundation/dom.js";
import type { formatBytes, formatDate } from "../../../../foundation/format.js";
import styles from "./document-table.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "documents-table";

/** One row: a document's id, title, size in bytes, and ISO 8601 modification time. */
export interface DocumentRow {
  id: string;
  title: string;
  bytes: number;
  modified: string;
}

/** The formatters the cells use. */
export interface TableFormat {
  bytes: typeof formatBytes;
  date: typeof formatDate;
}

/** `document-open`'s detail: the row chosen. */
export interface DocumentOpenDetail {
  id: string;
}

/** Shows the rows, each title a button that dispatches `document-open` with the row's id. Until
 * `format` is set, the size and date cells show the raw values. */
export class DocumentTable extends LitElement {
  static styles = styles;

  static properties = {
    rows: { attribute: false },
    format: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The rows shown. */
  declare rows: DocumentRow[];
  /** The formatters for the size and date cells. */
  declare format: TableFormat | null;

  constructor() {
    super();
    this.rows = [];
    this.format = null;
  }

  render() {
    return html`<table>
      <thead>
        <tr><th>Title</th><th>Size</th><th>Modified</th></tr>
      </thead>
      <tbody>
        ${this.rows.map((row) => this.#row(row))}
      </tbody>
    </table>`;
  }

  #row(row: DocumentRow) {
    const size = this.format?.bytes(row.bytes) ?? String(row.bytes);
    const modified = this.format?.date(Date.parse(row.modified)) ?? row.modified;
    return html`<tr>
      <td><button type="button" @click=${() => this.#open(row.id)}>${row.title}</button></td>
      <td>${size}</td>
      <td><time datetime=${row.modified}>${modified}</time></td>
    </tr>`;
  }

  #open(id: string) {
    emit<DocumentOpenDetail>(this, "document-open", { id });
  }
}

define(tagName, DocumentTable);
