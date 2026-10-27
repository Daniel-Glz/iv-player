// Checks what each runtime gets from the player's published entries: browsers and
// Node get the real element, edge runtimes and React Server Components the server
// build. Resolves through package.json exports like consumers do, so run it after
// `pnpm build`.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const player = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "packages/player");

/** Imports `specifier` in a fresh Node process with `conditions`, from inside the package. */
function load(specifier, conditions) {
  const script = `
    const url = import.meta.resolve(${JSON.stringify(specifier)});
    const module = await import(url);
    console.log(JSON.stringify({ file: url.split("/").pop(), exports: Object.keys(module).sort() }));
  `;
  const flags = conditions.map((condition) => `--conditions=${condition}`);
  // The package resolves its own name (self-reference) from its directory.
  const output = execFileSync(process.execPath, [...flags, "--input-type=module", "-e", script], { cwd: player });
  return JSON.parse(output);
}

const cases = [
  ["@ivkit/player", [], "index.js"],
  ["@ivkit/player/element", [], "element.js"],
  ...["react-server", "workerd", "edge-light"].flatMap((condition) => [
    ["@ivkit/player", [condition], "server.js"],
    ["@ivkit/player/element", [condition], "server.js"],
  ]),
];

for (const [specifier, conditions, file] of cases) {
  const result = load(specifier, conditions);
  const label = `${specifier} [${conditions.join(", ") || "node"}]`;
  assert.equal(result.file, file, `${label}: resolved to ${result.file}`);
  assert.deepEqual(result.exports, ["IvkitPlayer", "defineIvkitPlayer"], `${label}: unexpected exports`);
  console.log(`PASS ${label} → ${file}`);
}
