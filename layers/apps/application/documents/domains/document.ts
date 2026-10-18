// The documents app's model, its domains tier: the shape the API returns, imported from inside
// the app only.

/** One document, as the API returns it. */
export interface Document {
  id: string;
  title: string;
  /** The document's size in bytes. */
  bytes: number;
  /** When the document last changed, an ISO 8601 date and time. */
  modified: string;
}
