// The route matcher's shared suite: the same cases over all three forms, so each form is held
// to identical behavior. Plain JavaScript on node:test and node:assert, so it runs unchanged
// under `node --test` and `bun test`, and stays outside the type check.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import * as js from "../src/js/router.js";
import * as jsdoc from "../src/jsdoc/router.js";
import * as ts from "../src/ts/router.ts";

const forms = { ts, jsdoc, js };

const routes = {
  "": { component: "hd-documents-view", title: "Documents" },
  prompts: { component: "hd-prompts-view", title: "Prompts" },
  "documents/new": { component: "hd-document-new", title: "New document" },
  "documents/:id": { component: "hd-document-view", title: "Document" },
  "documents/:id/pages/:page": { component: "hd-page-view", title: "Page" },
  "*": { component: "hd-not-found-view", title: "Not Found" },
};

for (const [form, router] of Object.entries(forms)) {
  describe(`route matcher, ${form} form`, () => {
    describe("parseQuery", () => {
      test("returns an empty map for a missing or empty query", () => {
        assert.deepEqual(router.parseQuery(), {});
        assert.deepEqual(router.parseQuery(""), {});
      });

      test("decodes keys and values, the last repeat winning", () => {
        assert.deepEqual(router.parseQuery("q=a%20b&tag=x&tag=y&empty="), {
          q: "a b",
          tag: "y",
          empty: "",
        });
      });
    });

    describe("normalizePath", () => {
      const cases = [
        ["/app/documents/7", "documents/7"],
        ["app/documents/7", "documents/7"],
        ["/app", ""],
        ["/app/", ""],
        ["/prompts", "prompts"],
        ["", ""],
        // The base is stripped only at a segment boundary, never as a bare string prefix.
        ["/application", "application"],
        ["/application/x", "application/x"],
        ["/apps/x", "apps/x"],
        ["/app?q=1", "?q=1"],
        ["/app#top", "#top"],
      ];
      for (const [path, want] of cases) {
        test(`"${path}" under "/app" is "${want}"`, () => {
          assert.equal(router.normalizePath(path, "/app"), want);
        });
      }

      test("a root base path strips only the leading slash", () => {
        assert.equal(router.normalizePath("/documents/7", ""), "documents/7");
      });
    });

    describe("matchRoute", () => {
      test("an exact pattern matches with no params", () => {
        const match = router.matchRoute(routes, "prompts");
        assert.deepEqual(match, { config: routes.prompts, params: {}, query: {} });
      });

      test("the empty path matches the root route", () => {
        assert.equal(router.matchRoute(routes, "").config, routes[""]);
      });

      test("an exact pattern wins over a param pattern", () => {
        const match = router.matchRoute(routes, "documents/new");
        assert.equal(match.config, routes["documents/new"]);
        assert.deepEqual(match.params, {});
      });

      test("param segments are captured by name", () => {
        const match = router.matchRoute(routes, "documents/42/pages/3");
        assert.equal(match.config, routes["documents/:id/pages/:page"]);
        assert.deepEqual(match.params, { id: "42", page: "3" });
      });

      test("the query passes through to the match", () => {
        const query = { page: "2" };
        assert.deepEqual(router.matchRoute(routes, "documents/42", query).query, query);
      });

      test("a segment count no pattern has falls back to the * route", () => {
        const match = router.matchRoute(routes, "documents/42/pages");
        assert.deepEqual(match, {
          config: routes["*"],
          params: { path: "documents/42/pages" },
          query: {},
        });
      });

      test("a literal segment that differs falls back to the * route", () => {
        assert.equal(router.matchRoute(routes, "reviews/42").config, routes["*"]);
      });
    });

    describe("resolveRoute", () => {
      test("normalizes the path, parses the query, and matches", () => {
        const match = router.resolveRoute(routes, "/app/documents/42?tab=pages&q=x%2Fy", "/app");
        assert.deepEqual(match, {
          config: routes["documents/:id"],
          params: { id: "42" },
          query: { tab: "pages", q: "x/y" },
        });
      });

      test("a target with no query has an empty query", () => {
        assert.deepEqual(router.resolveRoute(routes, "prompts", "/app").query, {});
      });

      test("an unknown target resolves to the * route with its normalized path", () => {
        const match = router.resolveRoute(routes, "/app/nowhere?x=1", "/app");
        assert.equal(match.config, routes["*"]);
        assert.deepEqual(match.params, { path: "nowhere" });
        assert.deepEqual(match.query, { x: "1" });
      });
    });
  });
}
