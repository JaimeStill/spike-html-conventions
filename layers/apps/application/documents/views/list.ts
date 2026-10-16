// The documents app's list view: one directory into the app, so it reaches its own model with
// `../` and the layers with four.

import { html, LitElement, type PropertyDeclarations } from "lit";

import "../../../../components/status-badge.js";
import { define } from "../../../../foundation/dom.js";
import { SessionController } from "../../../../sdk/session.js";
import type { DocumentSummary } from "../model.js";

/** Lists documents, each with a status badge. */
export class DocumentsList extends LitElement {
  static properties = {
    documents: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The documents listed. */
  declare documents: DocumentSummary[];

  session = new SessionController(this);

  constructor() {
    super();
    this.documents = [];
  }

  render() {
    return html`<ul>
      ${this.documents.map((doc) => html`<li>${doc.title} <sl-status-badge label="Draft"></sl-status-badge></li>`)}
    </ul>`;
  }
}

/** The tag the view defines. */
export const listTag = "documents-list";

define(listTag, DocumentsList);
