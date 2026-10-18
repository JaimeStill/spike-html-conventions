// What the app's root provides its modules: the service, the router, and the formatters, made at
// the entry from the SDK and foundation values it is given. The router mounts each route's element
// by tag, so no property reaches a module from the root; a module asks for the context with a
// bubbling, composed `documents-context` event, which the root answers synchronously on the
// router's outlet. Nothing here holds state: the context lives in the entry.

import type { formatBytes, formatDate } from "../../../../foundation/format.js";
import type { Router } from "../../../../sdk/router.js";
import type { DocumentsService } from "./documents.js";

/** The context a module asks the root for. */
export interface DocumentsContext {
  documents: DocumentsService;
  router: Router;
  format: { bytes: typeof formatBytes; date: typeof formatDate };
}

/** The request event's detail: the callback the root answers with the context. */
export interface ContextRequest {
  provide(context: DocumentsContext): void;
}

/** The request event's type. */
export const contextRequest = "documents-context";
