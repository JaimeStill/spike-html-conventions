// The button styles' single source, shown in one version: a pagination holding one entry renders,
// then one edit to the source the version's render root takes its button styles from repaints
// both elements' buttons. A shadow root's source is button-sheet.ts, adopted into every shadow
// version's root, and the edit rewrites the background its `.btn` rule declares. Light DOM's source is the
// page's spike-html-design baseline, its elements layer, which no light version's sheet
// overrides for a button, and the edit is one rule added to that layer. scripts/demo.sh runs one
// page per version; each passes when both buttons painted from the source before the edit and
// both take the edit after it.

import { buttonSheet } from "../layers/components/button-sheet.js";
import type { EntryItem } from "../layers/components/entry-lit-shadow.js";
import { directories } from "./documents.js";
import { versions, type Version } from "./versions.js";

/** The background the edit gives every button: a color no source sets. */
const edited = "rgb(1, 2, 3)";

/** One render root's source of button styles: what it paints with, and the edit to it. */
interface Source {
  name: string;
  /** The `background` the source gives a button, as the source writes it. */
  background: string;
  /** Applies the one edit. */
  edit(): void;
}

const shadowSource: Source = {
  name: "button-sheet.ts .btn",
  get background() {
    return buttonRule().style.getPropertyValue("background");
  },
  edit() {
    buttonRule().style.setProperty("background", edited);
  },
};

// The baseline's button rule reads --bg-2 (spike-html-design v0.7.0, layers/elements.css). The
// edit adds a rule to the same layer, after the baseline's own and of the same zero specificity.
const lightSource: Source = {
  name: "spike-html-design.elements button",
  background: "var(--bg-2)",
  edit() {
    const style = document.createElement("style");
    style.textContent = `@layer spike-html-design.elements {
      :where(button) { background-color: ${edited}; }
    }`;
    document.head.append(style);
  },
};

/** The shared sheet's `.btn` rule. */
function buttonRule(): CSSStyleRule {
  const rule = Array.from(buttonSheet.cssRules).find(
    (r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText === ".btn",
  );
  if (rule === undefined) throw new Error("button-sheet.ts has no .btn rule");
  return rule;
}

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
  const found = [
    root(pagination).querySelector<HTMLButtonElement>('[aria-label="Next page"]'),
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
  // The shared sheet's buttons transition their background, so each is finished before the
  // read: what is read is where the edit lands, not the transition's first frame.
  const background = () =>
    pair.map((button) => {
      for (const animation of button.getAnimations()) animation.finish();
      return getComputedStyle(button).backgroundColor;
    });
  const source = pagination.shadowRoot ? shadowSource : lightSource;
  const expected = computed(source.background);
  const before = background();
  source.edit();
  const after = background();

  const ok =
    before.every((value) => value === expected && value !== edited) &&
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
