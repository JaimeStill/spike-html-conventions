// The documents service, the domains tier's domain service: the SDK's Service pattern, a stateless
// object over the client with one method per route, each resolving to the route's Result. The SDK
// is declarations alone (layers/sdk/*.d.ts), so every import from it is `import type`; the client
// arrives as the factory's argument.

import type { Page, RequestOptions, Result } from "../../../../sdk/api.js";
import type { Service, ServiceFactory } from "../../../../sdk/service.js";
import type { Document } from "./document.js";

/** A list read's query: the folder, every folder when it is absent, and the 1-based page. */
export interface DocumentQuery {
  folder?: string;
  page: number;
}

/** The documents API's routes, one method each. */
export interface DocumentsService extends Service {
  /** GET /documents: a page of documents. */
  list(query: DocumentQuery, options?: RequestOptions): Promise<Result<Page<Document>>>;
  /** GET /documents/{id}: one document. */
  get(id: string, options?: RequestOptions): Promise<Result<Document>>;
}

/** Makes the service over `client`, holding nothing between calls. */
export const documentsService: ServiceFactory<DocumentsService> = (client) => ({
  list({ folder, page }, options) {
    const params = new URLSearchParams({ page: String(page) });
    if (folder) params.set("folder", folder);
    return client.get(`/documents?${params}`, options);
  },
  get(id, options) {
    return client.get(`/documents/${encodeURIComponent(id)}`, options);
  },
});
