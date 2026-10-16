// The foundation layer: the platform alone, no package and no other layer. Every other layer may
// import it. eslint.config.js's layer table holds the import rules for this tree; STANDARDS.md
// says what belongs in each layer.

/** Defines a custom element once, so a second import of its module is harmless. */
export function define(tag: string, element: CustomElementConstructor): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, element);
  }
}

/** Dispatches a bubbling, composed `CustomEvent`, the way an element reports out. */
export function emit<T>(target: EventTarget, type: string, detail: T): boolean {
  return target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** The first element matching `selector`, or an error naming it. */
export function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`no element matches ${selector}`);
  }
  return element;
}
