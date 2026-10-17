// Entry, vanilla in light DOM: the same entry as the other versions, on the platform alone,
// rendered into the element itself. By hand it keeps what the shadow version builds by hand: the
// `item` accessor, an item set before the definition, and rendering: one button built once,
// filled in place on every change and taken out while there is no item. It declares its own item
// types, as every version does, so each file reads alone.
//
// Light DOM costs it the button's placement: the button is built in the constructor but placed
// only while connected, since an element gains no children while it is constructed, and the
// connection renders it. It costs encapsulation too: its styles sit in the document, so it
// adopts one sheet there, once, in the cascade layer spike-html-conventions.entry, every rule
// nested under its tag. The button is bare: the page's spike-html-design baseline styles it, so
// the sheet gives it layout alone, and its parts their type, reading only that baseline's tokens.

import { define, emit, required } from "../foundation/dom.js";

/** The tag this version defines. */
export const tagName = "sl-entry-vanilla-light";

/** The fields of a directory the entry renders; a go-web-service Directory fits it. */
export interface DirectoryItem {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

/**
 * The fields of a file the entry renders; a go-web-service File fits it. `size` is null until
 * the file's write completes.
 */
export interface FileItem extends DirectoryItem {
  size: number | null;
  content_type: string;
}

/** What the entry shows: a directory, or a file, told apart by its `content_type`. */
export type EntryItem = DirectoryItem | FileItem;

/** `open`'s detail: the entry's id and kind. */
export interface OpenDetail {
  id: string;
  kind: "directory" | "file";
}

// One formatter per unit, built once: sizes step by 1000, as the SI units Intl names do.
const sizeUnits = ["byte", "kilobyte", "megabyte", "gigabyte"].map(
  (unit) =>
    new Intl.NumberFormat(undefined, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: 1,
    }),
);

const updatedTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Whether the item is a directory or a file: only a file has a content type. */
function kindOf(item: EntryItem): OpenDetail["kind"] {
  return "content_type" in item ? "file" : "directory";
}

/** A byte count in the largest unit that keeps it at 1 or more. */
function formatSize(bytes: number): string {
  const step = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), sizeUnits.length - 1);
  return sizeUnits[step].format(bytes / 1000 ** step);
}

// The element's layout, adopted into the document by the first instance to connect. Its layer
// comes after the baseline's, as the sheet is adopted after the page links it.
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  @layer spike-html-conventions.entry {
    sl-entry-vanilla-light {
      display: block;

      & > .entry {
        display: grid;
        grid-template-columns: 8ch 1fr auto;
        align-items: baseline;
        justify-items: start;
        gap: var(--space-3xs) var(--space-xs);
        inline-size: 100%;
        margin-block: var(--space-3xs);
      }
      & :is(.kind, .meta) {
        color: var(--fg-2);
      }
      & .name {
        font-size: var(--text-s);
        font-weight: 600;
      }
      & .meta {
        grid-column: 2 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-xs);
      }
    }
  }
`);

/** Adds the sheet to the document's adopted sheets, once however many instances connect. */
function adopt(): void {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
}

// The button, cloned once per element; a directory's render leaves out the size and the type.
const template = document.createElement("template");
template.innerHTML = `
  <button type="button" class="entry">
    <span class="kind"></span>
    <span class="name"></span>
    <span class="status"></span>
    <span class="meta">
      <span class="size"></span>
      <span class="type"></span>
      <time></time>
    </span>
  </button>
`;

/**
 * Shows one entry: its kind, name, and status; a file's size, absent while it is pending, and
 * content type; and when it was last updated. Activating it sends `open` with its id and kind.
 */
export class EntryVanillaLight extends HTMLElement {
  #item: EntryItem | null = null;

  readonly #button: HTMLButtonElement;
  readonly #kind: HTMLElement;
  readonly #name: HTMLElement;
  readonly #status: HTMLElement;
  readonly #meta: HTMLElement;
  readonly #size: HTMLElement;
  readonly #type: HTMLElement;
  readonly #time: HTMLTimeElement;

  constructor() {
    super();
    const button = template.content.cloneNode(true) as DocumentFragment;
    this.#button = required(button, "button");
    this.#kind = required(button, ".kind");
    this.#name = required(button, ".name");
    this.#status = required(button, ".status");
    this.#meta = required(button, ".meta");
    this.#size = required(button, ".size");
    this.#type = required(button, ".type");
    this.#time = required(button, "time");
    this.#button.addEventListener("click", () => this.#open());

    // An item set before the definition is an own field on the instance, which hides the
    // accessor below; it is taken off and set again through the setter, as Lit does.
    if (Object.hasOwn(this, "item")) {
      const item: unknown = Reflect.get(this, "item");
      Reflect.deleteProperty(this, "item");
      Reflect.set(this, "item", item);
    }
    this.#render();
  }

  connectedCallback(): void {
    adopt();
    this.#render();
  }

  /** The directory or file shown; nothing renders while it is null. */
  get item(): EntryItem | null {
    return this.#item;
  }
  set item(value: EntryItem | null) {
    if (value === this.#item) return;
    this.#item = value;
    this.#render();
  }

  #open(): void {
    if (this.#item !== null) {
      emit<OpenDetail>(this, "open", { id: this.#item.id, kind: kindOf(this.#item) });
    }
  }

  // Fills the button from the item, keeping only the meta parts it has, and places it while the
  // element is connected; or takes it out.
  #render(): void {
    const item = this.#item;
    if (item === null) {
      this.#button.remove();
      return;
    }
    const file = "content_type" in item ? item : null;
    this.#kind.textContent = kindOf(item);
    this.#name.textContent = item.name;
    this.#status.textContent = item.status;
    this.#time.dateTime = item.updated_at;
    this.#time.textContent = updatedTime.format(new Date(item.updated_at));

    const meta: HTMLElement[] = [];
    if (file && file.size !== null) {
      this.#size.textContent = formatSize(file.size);
      meta.push(this.#size);
    }
    if (file) {
      this.#type.textContent = file.content_type;
      meta.push(this.#type);
    }
    this.#meta.replaceChildren(...meta, this.#time);
    if (this.isConnected && this.#button.parentNode !== this) this.append(this.#button);
  }
}

define(tagName, EntryVanillaLight);

declare global {
  interface HTMLElementTagNameMap {
    "sl-entry-vanilla-light": EntryVanillaLight;
  }
}
