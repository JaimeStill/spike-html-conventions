// A second application-branch app, so the rule against importing a sibling app has a sibling.

import { html, LitElement, render } from "lit";

import "../../../components/status-badge.js";
import { define, required } from "../../../foundation/dom.js";

/** The prompts app's shell. */
class PromptsApp extends LitElement {
  render() {
    return html`<sl-status-badge label="Signed out"></sl-status-badge>`;
  }
}

define("prompts-app", PromptsApp);
render(html`<prompts-app></prompts-app>`, required(document, "main"));
