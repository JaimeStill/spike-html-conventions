// The static site's header, its own element: Lit with a shadow root whose `static styles` adopts
// the foundation's baseline sheets, then site-header.css, its layout alone, each a CSS module
// script, as a component's are. A static-branch app's element imports the foundation, the
// components, and lit, never the SDK.

import { html, LitElement, type PropertyDeclarations } from "lit";

import "../../../../components/status-badge.js";
import { baseline } from "../../../../foundation/baseline.js";
import { define } from "../../../../foundation/dom.js";
import styles from "./site-header.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "site-header";

/** The page's heading, with a badge for its status. */
export class SiteHeader extends LitElement {
  static styles = [...baseline, styles];

  static properties = {
    heading: { type: String },
    status: { type: String },
  } satisfies PropertyDeclarations;

  /** The heading's text. */
  declare heading: string;
  /** The status badge's label. */
  declare status: string;

  constructor() {
    super();
    this.heading = "";
    this.status = "Published";
  }

  render() {
    return html`<header>
      <h1>${this.heading}</h1>
      <sl-status-badge label=${this.status}></sl-status-badge>
    </header>`;
  }
}

define(tagName, SiteHeader);
