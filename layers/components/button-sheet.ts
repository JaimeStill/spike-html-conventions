// The button styles every shadow-root version shares, folded from herald's shared buttons module:
// one constructed sheet, adopted by reference into each element's shadow root, so a single edit
// here reaches every button the shadow versions render. It reads the design tokens, each with a
// fallback for a page that defines none. It is a platform CSSStyleSheet, not a Lit CSSResult, so
// Lit's `static styles` and a vanilla element's `adoptedStyleSheets` take the same object.

/** The `.btn` class: a bordered, monospace button that dims while disabled. */
export const buttonSheet = new CSSStyleSheet();

buttonSheet.replaceSync(`
  .btn {
    padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
    border: 1px solid var(--divider, GrayText);
    border-radius: var(--radius-sm, 0.25rem);
    background: var(--bg, Canvas);
    color: var(--color, CanvasText);
    font-size: var(--text-xs, 0.75rem);
    font-family: var(--font-mono, monospace);
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: var(--bg-2, color-mix(in srgb, CanvasText 8%, Canvas));
    }

    &:focus-visible {
      outline: 2px solid var(--blue, AccentColor);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
`);
