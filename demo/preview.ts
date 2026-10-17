// The preview's host: every version of the composition side by side, each wired to the fixture as
// an application would wire it. This is app-tier demo code, not a component: the host owns the
// state, hears `page-change`, `page-size-change`, and `open`, and answers each change by setting
// the next page's envelope fields on the pagination and replacing its entries. scripts/preview.sh
// serves it under Vite's dev server, on a page whose <main> it fills with one column per version.
//
// The fixture is static, so the host reads in memory: one listing of every item the fixture holds,
// its directories, its files, and the files it continues by cursor, sliced by page and size as
// go-web-service would read it. Each column reads by number (a counted read: `page` and `total`)
// or, toggled, by cursor (neither: `more`, and `next` to continue from).

import type { EntryItem, OpenDetail } from "../layers/components/entry-lit-shadow.js";
import type {
  PageChangeDetail,
  PageSizeChangeDetail,
} from "../layers/components/pagination-lit-shadow.js";
import { continued, directories, files, type Page } from "./documents.js";
import { versions, type Version } from "./versions.js";

/** The contract every pagination version keeps, as demo/probe.ts reaches it. */
interface PaginationElement extends HTMLElement {
  page: number | null;
  size: number | null;
  total: number | null;
  more: boolean;
  pageSizes: number[] | null;
  disabled: boolean;
}

/** Every item the fixture holds, in one listing the columns page through. */
const listing: EntryItem[] = [...directories.items, ...files.items, ...continued.items];

/** The page sizes every column offers, as demo/probe.ts sets them; the first is the default. */
const pageSizes = [3, 6, 12];

// A cursor names the last item read, as the fixture's own do ({"name":"legal"}, base64 without
// padding). It is opaque to the element, which only asks for the page after this one.
const cursorAfter = (item: EntryItem) =>
  btoa(JSON.stringify({ name: item.name })).replace(/=+$/, "");
const cursorStart = (cursor: string) => {
  const { name } = JSON.parse(atob(cursor)) as { name: string };
  return listing.findIndex((item) => item.name === name) + 1;
};

/**
 * One page of the listing, in go-web-sdk's envelope: a counted read by `page` numbers it and
 * totals it; a read by cursor (`cursor` given, or neither, its start) does neither.
 */
function read(size: number, at: { page: number } | { cursor: string | null }): Page<EntryItem> {
  const start = "page" in at ? (at.page - 1) * size : at.cursor ? cursorStart(at.cursor) : 0;
  const items = listing.slice(start, start + size);
  const more = start + size < listing.length;
  const next = more ? { next: cursorAfter(items[items.length - 1]) } : {};
  if ("page" in at) return { items, page: at.page, size, total: listing.length, more, ...next };
  return { items, size, more, ...next };
}

/** A labelled checkbox, the column's toggles. */
function toggle(text: string, onChange: (checked: boolean) => void): HTMLLabelElement {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => onChange(input.checked));
  label.append(input, ` ${text}`);
  return label;
}

/** One column: a version's composition, its toggles, and a status line, wired to the listing. */
function column(name: string, version: Version): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = name;
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = "Nothing opened yet";
  const pagination = document.createElement(version.pagination) as PaginationElement;
  pagination.pageSizes = pageSizes;

  // The host's state: how it reads, the page size, and where the shown page sits.
  let byCursor = false;
  let size = pageSizes[0];
  let shown = read(size, { page: 1 });

  /** Sets the envelope's fields and replaces the entries with the page's items. */
  const show = (page: Page<EntryItem>) => {
    shown = page;
    pagination.page = page.page ?? null;
    pagination.size = page.size;
    pagination.total = page.total ?? null;
    pagination.more = page.more;
    for (const entry of pagination.querySelectorAll(version.entry)) entry.remove();
    pagination.append(
      ...page.items.map((item) => Object.assign(document.createElement(version.entry), { item })),
    );
  };
  const first = () => show(read(size, byCursor ? { cursor: null } : { page: 1 }));

  pagination.addEventListener("page-change", (event) => {
    const { page } = (event as CustomEvent<PageChangeDetail>).detail;
    // Next on a page continued by cursor asks for no number: the host follows `next`.
    show(read(size, page === null ? { cursor: shown.next ?? null } : { page }));
  });
  pagination.addEventListener("page-size-change", (event) => {
    size = (event as CustomEvent<PageSizeChangeDetail>).detail.size;
    first();
  });
  pagination.addEventListener("open", (event) => {
    const { id, kind } = (event as CustomEvent<OpenDetail>).detail;
    const item = listing.find((entry) => entry.id === id);
    status.textContent = `Opened ${kind} ${item?.name ?? "?"} (${id})`;
  });

  const toggles = document.createElement("p");
  toggles.append(
    toggle("By cursor", (checked) => {
      byCursor = checked;
      first();
    }),
    toggle("Disabled", (checked) => {
      pagination.disabled = checked;
    }),
  );
  section.append(heading, toggles, pagination, status);
  first();
  return section;
}

// Each column is built, its properties set, before its version defines the elements, as the probe
// builds its compositions; each version loads on its own, so one that fails leaves the rest.
const main = document.querySelector("main");
if (main === null) throw new Error("the preview's page needs a <main>");
for (const [name, version] of Object.entries(versions)) {
  main.append(column(name, version));
  version.load().catch((error: unknown) => {
    console.error(`preview: ${name} didn't load`, error);
  });
}
