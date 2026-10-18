// An application-branch app's entry, its root: it makes the client, the service, and the router,
// and answers the modules' context requests on the router's outlet. The SDK and the foundation's
// formatters are declarations with no runtime until spike-html-apps implements them, so the entry
// imports their types alone and takes the values as start()'s runtime, which whatever loads the
// app with an implementation passes; a value import of either would fail in the browser, and the
// check refuses one (eslint.config.js).

import type { formatBytes, formatDate } from "../../../foundation/format.js";
import { required } from "../../../foundation/dom.js";
import type { createClient } from "../../../sdk/api.js";
import type { TokenProvider } from "../../../sdk/auth.js";
import type { createRouter, Router } from "../../../sdk/router.js";
import { contextRequest, type ContextRequest, type DocumentsContext } from "./domains/context.js";
import { documentsService } from "./domains/documents.js";
import { routes } from "./routes.js";

/** The implementations the app runs on, typed by their declarations. */
export interface Runtime {
  createClient: typeof createClient;
  createRouter: typeof createRouter;
  /** The token provider each call asks; the SDK's `anonymous` for an app without sign-in. */
  auth: TokenProvider;
  formatBytes: typeof formatBytes;
  formatDate: typeof formatDate;
}

/** Starts the app in `outlet`, the page's <main> by default, and returns its router. */
export function start(runtime: Runtime, outlet: Element = required(document, "main")): Router {
  const client = runtime.createClient({ base: "/api", auth: runtime.auth });
  const router = runtime.createRouter(routes, { outlet });
  const context: DocumentsContext = {
    documents: documentsService(client),
    router,
    format: { bytes: runtime.formatBytes, date: runtime.formatDate },
  };
  outlet.addEventListener(contextRequest, (event) => {
    event.stopPropagation();
    (event as CustomEvent<ContextRequest>).detail.provide(context);
  });
  router.start();
  return router;
}
