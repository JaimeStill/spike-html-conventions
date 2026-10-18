// The documents app's route table, at its root: each pattern to the loader that imports its view,
// so a view's code loads on its route's first visit. Typed by `satisfies Routes`, the SDK's
// declaration, imported for its type alone.

import type { Routes } from "../../../sdk/router.js";

/** Imports the list view and resolves to its tag. */
const listView = () => import("./views/list.js").then((view) => view.tagName);

/** The app's routes, the first match winning. */
export const routes = {
  "/": listView,
  "/folders/:folder": listView,
} satisfies Routes;
