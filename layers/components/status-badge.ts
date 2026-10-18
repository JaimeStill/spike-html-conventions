// The components layer: the element tier, here a minimal Lit element on the foundation. Props in,
// events out; it holds no service, data, or app state. Its styles are status-badge.css, a CSS
// module script, in `static styles`.

import { html, LitElement, type PropertyDeclarations } from "lit";

import { define, emit } from "../foundation/dom.js";
import styles from "./status-badge.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-status-badge";

/** Shows a label; a click dispatches `badge-select` with that label. */
export class StatusBadge extends LitElement {
  static styles = styles;

  static properties = {
    label: { type: String },
  } satisfies PropertyDeclarations;

  declare label: string;

  constructor() {
    super();
    this.label = "";
  }

  render() {
    return html`<button type="button" @click=${this.#select}>${this.label}</button>`;
  }

  #select() {
    emit(this, "badge-select", { label: this.label });
  }
}

define(tagName, StatusBadge);
