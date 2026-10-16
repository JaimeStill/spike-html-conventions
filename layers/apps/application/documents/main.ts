// An application-branch app: an interactive client on the foundation, components, the SDK, and lit.

import { html, render } from "lit";

import { required } from "../../../foundation/dom.js";
import "./views/list.js";

render(html`<documents-list></documents-list>`, required(document, "main"));
