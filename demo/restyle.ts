// The button styles' single source, shown in one version: a pagination holding one entry renders,
// then one edit to the source the version's render root takes its button styles from repaints
// both elements' buttons. Every source is the foundation's elements layer, the port of
// spike-html-design v0.7.0's, whose button rule reads --bg-2 and which no version's own sheet
// overrides for a button. A shadow root's source is the elements sheet the foundation's baseline
// module (layers/foundation/baseline.ts) exports, one CSSStyleSheet per document as a CSS module
// script, adopted into every shadow version's root, and the edit inserts a button rule at the end
// of its foundation.elements block, on the very sheet this module imports. Light DOM's source is
// the same layer on the page, which links the foundation's entry, and the edit is one rule added
// to that layer. Either rule follows the baseline's own in its layer, with the same zero
// specificity, so it wins.
//
// scripts/browser.test.js runs one page per version; each passes when both buttons painted from the
// source before the edit, an opaque color, so the tokens loaded, and both take the edit after it.

import type { EntryItem } from "../layers/components/entry-lit-shadow.js";
import { elements } from "../layers/foundation/baseline.js";
import { directories } from "./documents.js";
import { versions, type Version } from "./versions.js";

/** The background the edit gives every button: a color no source sets. */
const edited = "rgb(1, 2, 3)";

/** The background the baseline's button rule gives, as its elements layer writes it. */
const baselineBackground = "var(--bg-2)";

/** The rule each edit adds to the foundation.elements layer, after the baseline's button rule. */
const editRule = `:where(button) { background-color: ${edited}; }`;

/** One render root's source of button styles: its name, and the edit to it. */
interface Source {
  name: string;
  /** Applies the one edit. */
  edit(): void;
}

const shadowSource: Source = {
  name: "adopted foundation.elements :where(button)",
  edit() {
    const layer = Array.from(elements.cssRules).find(
      (r): r is CSSLayerBlockRule =>
        r instanceof CSSLayerBlockRule && r.name === "foundation.elements",
    );
    if (layer === undefined) throw new Error("the elements sheet has no foundation.elements block");
    layer.insertRule(editRule, layer.cssRules.length);
  },
};

const lightSource: Source = {
  name: "page foundation.elements :where(button)",
  edit() {
    const style = document.createElement("style");
    style.textContent = `@layer foundation.elements { ${editRule} }`;
    document.head.append(style);
  },
};

/**
 * Whether a computed background is an opaque color. A computed color with an alpha of 1 serializes
 * as rgb(), any other as rgba(), and a var() the page has no token for computes to transparent,
 * rgba(0, 0, 0, 0): so a page whose tokens didn't load, its baseline unlinked, fails here rather
 * than matching a transparent expected value with transparent buttons.
 */
const opaque = (background: string): boolean => background.startsWith("rgb(");

/** A background as the page computes it, so a source's value compares with a button's. */
function computed(background: string): string {
  const swatch = document.createElement("div");
  swatch.style.setProperty("background", background);
  document.body.append(swatch);
  const value = getComputedStyle(swatch).backgroundColor;
  swatch.remove();
  return value;
}

/** The pagination's Next button and the entry's button, as each version renders them. */
function buttons(pagination: Element, entry: Element): HTMLButtonElement[] {
  const root = (element: Element): ParentNode => element.shadowRoot ?? element;
  const next = "Next page";
  const found = [
    root(pagination).querySelector<HTMLButtonElement>(`[aria-label="${next}"]`),
    root(entry).querySelector<HTMLButtonElement>("button"),
  ];
  if (found.some((button) => button === null)) throw new Error("a button didn't render");
  return found as HTMLButtonElement[];
}

/** Renders the version, edits its source, and says how both buttons' backgrounds went. */
async function restyle(
  version: Version,
  host: HTMLElement,
): Promise<{ ok: boolean; line: string }> {
  const pagination = document.createElement(version.pagination);
  const entry = document.createElement(version.entry) as HTMLElement & { item: EntryItem };
  Object.assign(pagination, { page: 2, size: 3, total: 8 });
  entry.item = directories.items[0];
  pagination.append(entry);
  host.append(pagination);
  await version.load();
  await Promise.resolve();

  const pair = buttons(pagination, entry);
  // Any transition a button's background runs is finished before the read: what is read is where
  // the edit lands, not a transition's first frame.
  const background = () =>
    pair.map((button) => {
      for (const animation of button.getAnimations()) animation.finish();
      return getComputedStyle(button).backgroundColor;
    });
  const source = pagination.shadowRoot ? shadowSource : lightSource;
  const expected = computed(baselineBackground);
  const before = background();
  source.edit();
  const after = background();

  const ok =
    before.every((value) => value === expected && opaque(value) && value !== edited) &&
    after.every((value) => value === edited);
  const line = `${source.name}: pagination ${before[0]} -> ${after[0]}, entry ${before[1]} -> ${after[1]}`;
  return { ok, line };
}

/** Runs the check against the named version in this page and writes its verdict in #verdict. */
export async function run(name: string): Promise<void> {
  const verdict = document.getElementById("verdict");
  const host = document.querySelector("main");
  if (verdict === null || host === null) throw new Error("the page needs a <main> and a #verdict");
  try {
    const version = versions[name];
    if (version === undefined) throw new Error(`no version ${name}`);
    const { ok, line } = await restyle(version, host);
    verdict.textContent = `${ok ? "ok" : "FAIL"}: ${line}`;
  } catch (error) {
    verdict.textContent = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
  }
}
