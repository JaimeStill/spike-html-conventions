// A consumer's runtime use of the route matcher, from the installed package by its exports.
// The check runs it with bun after the offline bun install. Bun runs all three forms, the .ts
// form included, from node_modules.

import assert from "node:assert/strict";

const routes = {
  "documents/:id": { component: "hd-document-view", title: "Document" },
  "*": { component: "hd-not-found-view", title: "Not Found" },
};

for (const form of ["ts", "jsdoc", "js"]) {
  const { resolveRoute } = await import(`spike-html-conventions/${form}/router`);
  const match = resolveRoute(routes, "/app/documents/7?tab=pages", "/app");
  assert.deepEqual(match.params, { id: "7" }, form);
  assert.deepEqual(match.query, { tab: "pages" }, form);
  console.log(`consumer-bun: imported spike-html-conventions/${form}/router`);
}
