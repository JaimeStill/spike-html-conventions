// The components layer: the element tier, here a minimal Lit element on the foundation. Props in,
// events out; it holds no service, data, or app state.

import { css, html, LitElement, type PropertyDeclarations } from "lit";

import { define, emit } from "../foundation/dom.js";

/** The tag the element defines. */
export const tagName = "sl-status-badge";

/** Shows a label; a click dispatches `badge-select` with that label. */
export class StatusBadge extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  static properties: PropertyDeclarations = {
    label: { type: String },
  };

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
