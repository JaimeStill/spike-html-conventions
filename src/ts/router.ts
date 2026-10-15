// Route matcher, TypeScript form: only erasable syntax, so Node and Bun run it by stripping
// types. Ported from herald's app/client/core/router, keeping the pure core (path
// normalization, query parsing, pattern matching) and leaving out the DOM-bound Router class.

/** Maps a route pattern to the component that handles it. */
export interface RouteConfig {
  component: string;
  title: string;
}

/**
 * The route table: patterns such as `"documents/:id"` mapped to their config. The `"*"` entry
 * is the fallback for a path no pattern matches, so every lookup resolves.
 */
export type RouteTable = Record<string, RouteConfig> & { "*": RouteConfig };

/** Result of matching a URL path against the route table. */
export interface RouteMatch {
  config: RouteConfig;
  params: Record<string, string>;
  query: Record<string, string>;
}

/** Parses a query string, without its `?`, into a flat map of decoded key/value pairs. */
export function parseQuery(queryString?: string): Record<string, string> {
  if (!queryString) return {};

  const result: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(queryString)) result[key] = value;
  return result;
}

/**
 * Strips the leading slash and the base path from a path, giving the form the route table's
 * patterns use. `basePath` carries no trailing slash, as in `"/app"`.
 */
export function normalizePath(path: string, basePath: string): string {
  let normalized = path.replace(/^\//, "");
  const baseWithoutSlash = basePath.replace(/^\//, "");

  if (normalized.startsWith(baseWithoutSlash))
    normalized = normalized.slice(baseWithoutSlash.length).replace(/^\//, "");

  return normalized;
}

/**
 * Matches a normalized path against the route table. An exact pattern wins first; then the
 * first pattern, in table order, whose segments match, with each `:name` segment captured as a
 * param. With no match, the `"*"` route is returned with the path as its `path` param.
 */
export function matchRoute(
  routes: RouteTable,
  path: string,
  query: Record<string, string> = {},
): RouteMatch {
  const exact = routes[path];
  if (exact) return { config: exact, params: {}, query };

  const segments = path.split("/").filter(Boolean);

  for (const [pattern, config] of Object.entries(routes)) {
    if (pattern === "*") continue;

    const patternSegments = pattern.split("/").filter(Boolean);
    if (patternSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < patternSegments.length; i++) {
      const pat = patternSegments[i];
      const seg = segments[i];

      if (pat.startsWith(":")) {
        params[pat.slice(1)] = seg;
      } else if (pat !== seg) {
        matched = false;
        break;
      }
    }

    if (matched) return { config, params, query };
  }

  return { config: routes["*"], params: { path }, query };
}

/**
 * Resolves a navigation target, a path with an optional query string, against the route
 * table: the pure part of herald's `Router.navigate`.
 */
export function resolveRoute(routes: RouteTable, target: string, basePath: string): RouteMatch {
  const [pathPart, queryPart] = target.split("?");
  return matchRoute(routes, normalizePath(pathPart, basePath), parseQuery(queryPart));
}
