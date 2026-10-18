// The documents app's list view: the element the route table mounts at "/" and
// "/folders/:folder". The router sets each path param on it as an attribute of the same name, so
// `folder` is a reactive property with an attribute; the view composes the list module with it.

import { html, LitElement, type PropertyDeclarations } from "lit";

import { define } from "../../../../foundation/dom.js";
import "../modules/document-list.js";

/** The tag the view defines, which the route table's loader resolves to. */
export const tagName = "documents-list-view";

/** A folder's documents; every folder's when `folder` is empty. */
export class DocumentsListView extends LitElement {
  static properties = {
    folder: { type: String },
  } satisfies PropertyDeclarations;

  /** The route's `folder` param; empty on "/". */
  declare folder: string;

  constructor() {
    super();
    this.folder = "";
  }

  render() {
    return html`<h1>${this.folder || "All documents"}</h1>
      <documents-list .folder=${this.folder}></documents-list>`;
  }
}

define(tagName, DocumentsListView);
