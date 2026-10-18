// The foundation's baseline for shadow roots: the ported reset and elements layers (baseline/,
// the port of spike-html-design v0.7.0), each imported as a CSS module script, so each is one
// CSSStyleSheet per document, shared by reference by every root that adopts it. A shadow root sees
// none of the page's baseline but its inherited properties: the tokens cross its boundary, the
// reset's and the elements layer's element selectors don't. So a shadow-root component adopts
// these sheets, then a layout-only sheet of its own, and its controls take their look from the
// same rules a light-DOM control takes from the page's entry (baseline.css). One edit to either
// sheet reaches every root that adopted it.
//
// Each ported file wraps its rules in its own `@layer foundation.<layer>` block, so adopted in
// this order the layers stand in a shadow root as they do on the page, reset under elements, and
// the component's own unlayered sheet, adopted after them, sits above both.

import elements from "./baseline/elements.css" with { type: "css" };
import reset from "./baseline/reset.css" with { type: "css" };

export { elements, reset };

/** The sheets a shadow root adopts before its own, in cascade order: the reset, then elements. */
export const baseline: readonly CSSStyleSheet[] = [reset, elements];
