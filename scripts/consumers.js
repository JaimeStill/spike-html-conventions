// The manifest steps of scripts/consumers.sh, run under the column's runtime, node or bun:
//
//   consumers.js rewrite <package.json> <name>|<github source>|<local source> ...
//       points each named dependency at its local source, after checking it is the github:
//       source the fixture declares
//   consumers.js exports <installed package directory>
//       fails unless every target of the installed package's exports map is installed

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [command, path, ...rest] = process.argv.slice(2);

if (command === "rewrite") {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  for (const rewrite of rest) {
    const [name, github, local] = rewrite.split("|");
    if (manifest.dependencies[name] !== github) {
      throw new Error(`${name} is ${manifest.dependencies[name]}, expected ${github}`);
    }
    manifest.dependencies[name] = local;
  }
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
} else if (command === "exports") {
  const { exports } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  const missing = Object.values(exports).filter((target) => !existsSync(join(path, target)));
  if (missing.length > 0) {
    throw new Error(`${path}: exports targets not installed: ${missing.join(", ")}`);
  }
} else {
  throw new Error(`unknown command ${command}; expected rewrite or exports`);
}
