// Entry, Lit with a shadow root: one directory or one file of a document hierarchy, as a button
// that opens it. Its button takes its styles from the shared sheet.

import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";

import { define, emit } from "../foundation/dom.js";
import { buttonSheet } from "./button-sheet.js";

/** The tag this version defines. */
export const tagName = "sl-entry-lit-shadow";

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

/**
 * Shows one entry: its kind, name, and status; a file's size, absent while it is pending, and
 * content type; and when it was last updated. Activating it sends `open` with its id and kind.
 */
export class EntryLitShadow extends LitElement {
  static styles = [
    buttonSheet,
    css`
      :host {
        display: block;
      }
      .entry {
        display: grid;
        grid-template-columns: 8ch 1fr auto;
        align-items: baseline;
        gap: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
        width: 100%;
        margin-block: var(--space-1, 0.25rem);
        text-align: start;
      }
      .kind,
      .meta {
        color: var(--color-2, GrayText);
      }
      .name {
        font-size: var(--text-sm, 0.875rem);
        font-weight: 600;
      }
      .meta {
        grid-column: 2 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3, 0.75rem);
      }
    `,
  ];

  static properties = {
    item: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The directory or file shown; nothing renders while it is null. */
  declare item: EntryItem | null;

  constructor() {
    super();
    this.item = null;
  }

  #open(): void {
    if (this.item !== null) {
      emit<OpenDetail>(this, "open", { id: this.item.id, kind: kindOf(this.item) });
    }
  }

  render() {
    const item = this.item;
    if (item === null) return nothing;
    const file = "content_type" in item ? item : null;
    return html`
      <button type="button" class="btn entry" @click=${this.#open}>
        <span class="kind">${kindOf(item)}</span>
        <span class="name">${item.name}</span>
        <span class="status">${item.status}</span>
        <span class="meta">
          ${
            file && file.size !== null
              ? html`<span class="size">${formatSize(file.size)}</span>`
              : nothing
          }
          ${file ? html`<span class="type">${file.content_type}</span>` : nothing}
          <time datetime=${item.updated_at}>${updatedTime.format(new Date(item.updated_at))}</time>
        </span>
      </button>
    `;
  }
}

define(tagName, EntryLitShadow);

declare global {
  interface HTMLElementTagNameMap {
    "sl-entry-lit-shadow": EntryLitShadow;
  }
}
