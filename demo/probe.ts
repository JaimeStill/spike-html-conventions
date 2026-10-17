// The shared probe: renders the composition, pagination holding one entry per fixture item, in
// one version, drives it, and reports every case as a line of text. It reaches the elements only
// through what every version shares (tags, properties, attributes, events, the controls' labels,
// and the text a reader sees, through a shadow root or not), so two versions that keep the same
// contract write the same report, and scripts/demo.sh compares the reports line for line.

import type { EntryItem } from "../layers/components/entry-lit-shadow.js";
import { continued, directories, files, type Page } from "./documents.js";
import { versions, type Version } from "./versions.js";

/** The contract every pagination version keeps. */
interface PaginationElement extends HTMLElement {
  page: number | null;
  size: number | null;
  total: number | null;
  more: boolean;
  pageSizes: number[] | null;
  disabled: boolean;
}

/** The contract every entry version keeps. The fixture's Directory and File fit its `item`. */
interface EntryElement extends HTMLElement {
  item: EntryItem | null;
}

/** One case of the report: what the version did, and whether that holds. */
interface Case {
  name: string;
  actual: string;
  ok: boolean;
}

/** The three compositions every case reads, one per page of the fixture. */
interface Compositions {
  /** The directories, page 2 of 3, with the default label. */
  listing: PaginationElement;
  /** The files, with a pending one, and author content in the label slot. */
  filed: PaginationElement;
  /** The files continued by cursor: no page, no total. */
  cursor: PaginationElement;
}

/** A control `disabled` reaches. */
type FormControl = HTMLButtonElement | HTMLInputElement | HTMLSelectElement;

/** The page sizes every composition offers, set as a property before the version loads. */
const pageSizes = [3, 6, 12];

/** The events the probe hears, as they bubble out of the composition to the document. */
const eventTypes = ["page-change", "page-size-change", "open"];

/**
 * Lets pending updates land. Lit renders in a microtask queued when a property changes, so one
 * microtask queued after it runs once the render is done. The probe never waits on a timer or a
 * fetch: --dump-dom takes the page once it has loaded, and only microtasks finish before that.
 */
const settle = () => Promise.resolve();

/** The root a version renders into: its shadow root, or the element itself in light DOM. */
const renderRoot = (element: Element): ParentNode => element.shadowRoot ?? element;

/**
 * The text a reader sees: text nodes in rendered order, through shadow roots and into each slot's
 * assigned nodes (or its fallback), with whitespace collapsed. Elements are spaced apart; text
 * nodes, which Lit splits at each binding, are joined as they render.
 */
function renderedText(node: Node): string {
  const text = (n: Node): string => {
    if (n instanceof Text) return n.data;
    if (!(n instanceof Element) || n instanceof HTMLStyleElement) return "";
    const assigned = n instanceof HTMLSlotElement ? n.assignedNodes() : [];
    const children = assigned.length ? assigned : (n.shadowRoot ?? n).childNodes;
    return ` ${Array.from(children, text).join("")} `;
  };
  return text(node).replace(/\s+/g, " ").trim();
}

/** The pagination's own controls and entries, found the same way in every version. */
class Parts {
  readonly #entryTag: string;

  constructor(entryTag: string) {
    this.#entryTag = entryTag;
  }

  /** Every form control the pagination renders itself, never one inside an entry. */
  controls(pagination: Element): FormControl[] {
    return Array.from(
      renderRoot(pagination).querySelectorAll<FormControl>("button, select, input"),
    ).filter((element) => !element.closest(this.#entryTag));
  }

  prev = (pagination: Element) => this.#one<HTMLButtonElement>(pagination, "Previous page");
  next = (pagination: Element) => this.#one<HTMLButtonElement>(pagination, "Next page");
  pageInput = (pagination: Element) => this.#one<HTMLInputElement>(pagination, "Page number");

  sizeSelect(pagination: Element): HTMLSelectElement {
    return this.#found(renderRoot(pagination).querySelector("select"), "the page size select");
  }

  /** The label around the page size select, as a reader sees it, without the options. */
  sizeLabel(pagination: Element): string {
    const label = this.#found(this.sizeSelect(pagination).closest("label"), "the size label");
    return renderedText(label)
      .replace(renderedText(this.sizeSelect(pagination)), "")
      .trim();
  }

  entries(pagination: Element): EntryElement[] {
    return Array.from(pagination.querySelectorAll<EntryElement>(this.#entryTag));
  }

  /** The control that opens an entry. */
  opener(entry: EntryElement): HTMLButtonElement {
    return this.#found(renderRoot(entry).querySelector("button"), "the entry's button");
  }

  #one<T extends HTMLElement>(pagination: Element, label: string): T {
    const selector = `[aria-label="${label}"]`;
    return this.#found(renderRoot(pagination).querySelector<T>(selector), selector);
  }

  #found<T>(element: T | null, what: string): T {
    if (element === null) throw new Error(`no ${what} rendered`);
    return element;
  }
}

/** Builds a composition from a page of the fixture, setting every property while undefined. */
function compose(version: Version, page: Page<EntryItem>, label?: string): PaginationElement {
  const pagination = document.createElement(version.pagination) as PaginationElement;
  pagination.page = page.page ?? null;
  pagination.size = page.size;
  pagination.total = page.total ?? null;
  pagination.more = page.more;
  pagination.pageSizes = pageSizes;
  if (label !== undefined) {
    const slotted = document.createElement("span");
    slotted.slot = "label";
    slotted.textContent = label;
    pagination.append(slotted);
  }
  for (const item of page.items) {
    const entry = document.createElement(version.entry) as EntryElement;
    entry.item = item;
    pagination.append(entry);
  }
  return pagination;
}

/** Collects the cases, each compared with what it must be. */
class Report {
  readonly cases: Case[] = [];

  /** A case whose actual value must equal `expected`. */
  equal(name: string, actual: string, expected: string): void {
    this.cases.push({ name, actual, ok: actual === expected });
  }

  /** A case on rendered text, which must hold every one of `has` and none of `lacks`. */
  text(name: string, element: Element, has: string[], lacks: string[] = []): void {
    const actual = renderedText(element);
    const ok = has.every((s) => actual.includes(s)) && !lacks.some((s) => actual.includes(s));
    this.cases.push({ name, actual, ok });
  }

  /** A case on the events an action sends, as they reach the document, or "none". */
  async events(name: string, expected: string, act: () => void): Promise<void> {
    const heard: string[] = [];
    const hear = (e: Event) =>
      heard.push(`${e.type} ${JSON.stringify((e as CustomEvent<unknown>).detail)}`);
    for (const type of eventTypes) document.addEventListener(type, hear);
    act();
    await settle();
    for (const type of eventTypes) document.removeEventListener(type, hear);
    this.equal(`event ${name}`, heard.join("; ") || "none", expected);
  }
}

/** Sets a control's value as a reader would, and sends the change it makes. */
function change(control: HTMLInputElement | HTMLSelectElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

/** What each composition renders: the entries, the summary, the page count, and the label. */
function renderCases(report: Report, parts: Parts, { listing, filed, cursor }: Compositions) {
  report.text("text directories", listing, [
    "Showing 4–6 of 8",
    "directory designs active",
    "directory invoices active",
    "directory legal active",
    "Page Size 3 6 12",
    "/ 3",
  ]);
  report.text("text files", filed, [
    "Showing 1–3 of 5",
    "file brand-guide.pdf available 2.4 MB application/pdf",
    "file notes.md available 18.4 kB text/markdown",
    "file storefront.png pending image/png",
    "Files per page 3 6 12",
  ]);
  report.text(
    "text cursor",
    cursor,
    ["file nda-2026.pdf available 96.4 kB", "file retainer.docx", "file terms.md"],
    ["Showing", "/ "],
  );
  const pending = parts.entries(filed)[2];
  report.text("text pending file", pending, ["storefront.png pending"], ["byte", "kB", "MB"]);
  report.equal(
    "summary with a total",
    /Showing \S+ of \d+/.exec(renderedText(listing))?.[0] ?? "absent",
    "Showing 4–6 of 8",
  );
  report.equal(
    "summary without a total",
    /Showing/.test(renderedText(cursor)) ? "present" : "absent",
    "absent",
  );
  report.equal("label default", parts.sizeLabel(listing), "Page Size");
  report.equal("label slotted", parts.sizeLabel(filed), "Files per page");
}

/** An event as the report writes it: its type and its detail as JSON, as the probe hears it. */
const heard = (type: string, detail: unknown) => `${type} ${JSON.stringify(detail)}`;

/** The events each control sends; the element never changes its own page. */
async function eventCases(report: Report, parts: Parts, { listing, filed, cursor }: Compositions) {
  await report.events("prev", heard("page-change", { page: 1 }), () => parts.prev(listing).click());
  await report.events("next", heard("page-change", { page: 3 }), () => parts.next(listing).click());
  await report.events("clamp 99", heard("page-change", { page: 3 }), () =>
    change(parts.pageInput(listing), "99"),
  );
  await report.events("clamp -4", heard("page-change", { page: 1 }), () =>
    change(parts.pageInput(listing), "-4"),
  );
  await report.events("size change", heard("page-size-change", { size: 6 }), () =>
    change(parts.sizeSelect(listing), "6"),
  );
  const [directory] = parts.entries(listing);
  await report.events(
    "open directory",
    `open {"id":"${directories.items[0].id}","kind":"directory"}`,
    () => parts.opener(directory).click(),
  );
  const pending = parts.entries(filed)[2];
  await report.events("open file", `open {"id":"${files.items[2].id}","kind":"file"}`, () =>
    parts.opener(pending).click(),
  );
  await report.events("cursor next", heard("page-change", { page: null }), () =>
    parts.next(cursor).click(),
  );
  report.equal("page kept after the events", String(listing.page), "2");
}

/** Lit's attribute conversion, and the properties `compose` set before the definition. */
function contractCases(report: Report, parts: Parts, version: Version, { listing }: Compositions) {
  const fresh = document.createElement(version.pagination) as PaginationElement;
  fresh.setAttribute("total", "8");
  const counted = fresh.total;
  fresh.removeAttribute("total");
  report.equal("contract number attribute removed", `${counted} -> ${fresh.total}`, "8 -> null");

  fresh.setAttribute("page-sizes", "[5, 10]");
  const parsed = JSON.stringify(fresh.pageSizes);
  fresh.setAttribute("page-sizes", "[5, 10");
  report.equal(
    "contract invalid page-sizes JSON",
    `${parsed} -> ${JSON.stringify(fresh.pageSizes)}`,
    "[5,10] -> null",
  );

  const sizes = Array.from(parts.sizeSelect(listing).options, (option) => option.value);
  const [first] = parts.entries(listing);
  report.equal(
    "contract properties set before definition",
    `page ${listing.page}, sizes ${sizes.join("/")}, first entry ${first.item?.name}`,
    "page 2, sizes 3/6/12, first entry designs",
  );
}

/** `disabled` reflected both ways, every control following it, and the cursor page's controls. */
async function stateCases(report: Report, parts: Parts, { listing, cursor }: Compositions) {
  const state = (pagination: PaginationElement) => {
    const controls = parts.controls(pagination);
    const off = controls.filter((control) => control.disabled).length;
    const attribute = pagination.hasAttribute("disabled");
    return `property ${pagination.disabled}, attribute ${attribute}, ${off} of ${controls.length} controls disabled`;
  };
  const allOff = "property true, attribute true, 4 of 4 controls disabled";

  listing.disabled = true;
  await settle();
  report.equal("disabled property to attribute", state(listing), allOff);
  await report.events("disabled next", "none", () => parts.next(listing).click());
  listing.removeAttribute("disabled");
  await settle();
  report.equal(
    "disabled attribute removed to property",
    state(listing),
    "property false, attribute false, 0 of 4 controls disabled",
  );
  listing.setAttribute("disabled", "");
  await settle();
  report.equal("disabled attribute to property", state(listing), allOff);
  listing.disabled = false;
  await settle();

  const shown = (control: FormControl) => (control.disabled ? "disabled" : "enabled");
  report.equal(
    "cursor page controls",
    `input ${shown(parts.pageInput(cursor))}, prev ${shown(parts.prev(cursor))}, next ${shown(parts.next(cursor))}`,
    "input disabled, prev disabled, next enabled",
  );
}

/** Runs every case against one version, rendered into `host`. */
async function probe(version: Version, host: HTMLElement): Promise<Case[]> {
  // The compositions are built and placed before the version defines its elements.
  if (customElements.get(version.pagination) || customElements.get(version.entry)) {
    throw new Error("the version's elements are defined before its compositions are built");
  }
  const compositions: Compositions = {
    listing: compose(version, directories),
    filed: compose(version, files, "Files per page"),
    cursor: compose(version, continued),
  };
  host.append(compositions.listing, compositions.filed, compositions.cursor);
  await version.load();
  await settle();

  const report = new Report();
  const parts = new Parts(version.entry);
  renderCases(report, parts, compositions);
  await eventCases(report, parts, compositions);
  contractCases(report, parts, version, compositions);
  await stateCases(report, parts, compositions);
  return report.cases;
}

/**
 * Probes the named version in this page and writes the outcome: a verdict line in #verdict, and
 * one line per case in #report, which the demo compares across versions.
 */
export async function run(name: string): Promise<void> {
  const verdict = document.getElementById("verdict");
  const report = document.getElementById("report");
  const host = document.querySelector("main");
  if (verdict === null || report === null || host === null) {
    throw new Error("the page needs a <main>, a #verdict, and a #report");
  }
  try {
    const version = versions[name];
    if (version === undefined) throw new Error(`no version ${name}`);
    const cases = await probe(version, host);
    report.textContent = cases
      .map(({ name, actual, ok }) => `${ok ? "ok  " : "FAIL"} ${name}: ${actual}`)
      .join("\n");
    const failed = cases.filter((c) => !c.ok).map((c) => c.name);
    verdict.textContent = failed.length
      ? `FAIL: ${failed.join(", ")}`
      : `ok: all ${cases.length} cases hold`;
  } catch (error) {
    verdict.textContent = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
  }
}
