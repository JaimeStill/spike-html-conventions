// A static-branch app: a page of content on the foundation, components, and lit, without the SDK.

import { html, render } from "lit";

import "../../../components/status-badge.js";
import { required } from "../../../foundation/dom.js";

render(html`<sl-status-badge label="Published"></sl-status-badge>`, required(document, "main"));
