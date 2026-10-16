// A consumer's runtime use of the route matcher, from the installed package by its exports.
// The check runs it with node after the offline npm install. Node runs the JSDoc and plain .js
// forms; it won't strip types under node_modules, so the .ts form is the Bun column's.

import assert from "node:assert/strict";

const routes = {
  "documents/:id": { component: "hd-document-view", title: "Document" },
  "*": { component: "hd-not-found-view", title: "Not Found" },
};

for (const form of ["jsdoc", "js"]) {
  const { resolveRoute } = await import(`spike-html-conventions/${form}/router`);
  const match = resolveRoute(routes, "/app/documents/7?tab=pages", "/app");
  assert.deepEqual(match.params, { id: "7" }, form);
  assert.deepEqual(match.query, { tab: "pages" }, form);
  console.log(`consumer-npm: imported spike-html-conventions/${form}/router`);
}
