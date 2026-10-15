// Route matcher, JSDoc form: plain JavaScript that runs as written, with its types in JSDoc
// comments that tsc checks. Ported from herald's app/client/core/router, keeping the pure core
// (path normalization, query parsing, pattern matching) and leaving out the DOM-bound Router
// class.

/**
 * Maps a route pattern to the component that handles it.
 * @typedef {object} RouteConfig
 * @property {string} component
 * @property {string} title
 */

/**
 * The route table: patterns such as `"documents/:id"` mapped to their config. The `"*"` entry
 * is the fallback for a path no pattern matches, so every lookup resolves.
 * @typedef {Record<string, RouteConfig> & { "*": RouteConfig }} RouteTable
 */

/**
 * Result of matching a URL path against the route table.
 * @typedef {object} RouteMatch
 * @property {RouteConfig} config
 * @property {Record<string, string>} params
 * @property {Record<string, string>} query
 */

/**
 * Parses a query string, without its `?`, into a flat map of decoded key/value pairs.
 * @param {string} [queryString]
 * @returns {Record<string, string>}
 */
export function parseQuery(queryString) {
  if (!queryString) return {};

  /** @type {Record<string, string>} */
  const result = {};
  for (const [key, value] of new URLSearchParams(queryString)) result[key] = value;
  return result;
}

/**
 * Strips the leading slash and the base path from a path, giving the form the route table's
 * patterns use. `basePath` carries no trailing slash, as in `"/app"`.
 * @param {string} path
 * @param {string} basePath
 * @returns {string}
 */
export function normalizePath(path, basePath) {
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
 * @param {RouteTable} routes
 * @param {string} path
 * @param {Record<string, string>} [query]
 * @returns {RouteMatch}
 */
export function matchRoute(routes, path, query = {}) {
  const exact = routes[path];
  if (exact) return { config: exact, params: {}, query };

  const segments = path.split("/").filter(Boolean);

  for (const [pattern, config] of Object.entries(routes)) {
    if (pattern === "*") continue;

    const patternSegments = pattern.split("/").filter(Boolean);
    if (patternSegments.length !== segments.length) continue;

    /** @type {Record<string, string>} */
    const params = {};
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
 * @param {RouteTable} routes
 * @param {string} target
 * @param {string} basePath
 * @returns {RouteMatch}
 */
export function resolveRoute(routes, target, basePath) {
  const [pathPart, queryPart] = target.split("?");
  return matchRoute(routes, normalizePath(pathPart, basePath), parseQuery(queryPart));
}
