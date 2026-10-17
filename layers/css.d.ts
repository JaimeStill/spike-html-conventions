// A CSS module script: `import sheet from "./x.css" with { type: "css" }` gives the file as one
// constructed CSSStyleSheet, the module's default export, shared by every importer in a document.
// Chromium loads it natively; scripts/css-sheets.js gives Vite the same module. The check refuses
// a .css import without the attribute (eslint.config.js), so every .css import is this one.

declare module "*.css" {
  const sheet: CSSStyleSheet;
  export default sheet;
}
