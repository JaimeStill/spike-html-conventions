// A static-branch app: a page of content on the foundation, components, and lit, without the SDK.
// Its entry renders the page from its own elements.

import { html, render } from "lit";

import { required } from "../../../foundation/dom.js";
import "./elements/site-header.js";

render(
  html`<site-header heading="Standards Lab" status="Published"></site-header>`,
  required(document, "main"),
);
