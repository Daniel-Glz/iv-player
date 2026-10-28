import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "tsdown";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// Runtime dependency growth must be a deliberate decision, not a transitive surprise.
for (const name of ["core", "player"]) {
  const pkg = await readJson(join(root, `packages/${name}/package.json`));
  const dependencies = Object.keys({
    ...pkg.dependencies,
    ...pkg.optionalDependencies,
    ...pkg.peerDependencies,
  }).sort();
  assert.deepEqual(
    dependencies,
    name === "core" ? [] : ["@ivkit/core"],
    `${name}: unexpected runtime dependencies`,
  );
}

// Always measure fresh production output, including the standalone browser build.
for (const name of ["core", "player"]) {
  await build({ cwd: join(root, `packages/${name}`), logLevel: "error" });
}

const temporary = await mkdtemp(join(tmpdir(), "ivkit-size-"));
try {
  // Measure named imports from the published entry, not the original source files.
  for (const [name, symbol] of [
    ["engine", "StoryEngine"],
    ["validation", "validateStory"],
  ]) {
    const entry = join(temporary, `${name}.js`);
    await writeFile(
      entry,
      `export { ${symbol} } from ${JSON.stringify(join(root, "packages/core/dist/index.js"))};\n`,
    );
    await build({
      config: false,
      tsconfig: false,
      entry: [entry],
      outDir: join(temporary, "dist"),
      clean: false,
      format: "esm",
      platform: "browser",
      target: "es2022",
      minify: true,
      sourcemap: false,
      dts: false,
      logLevel: "error",
    });
  }

  const checks = [
    [
      "Standalone player (includes core + CSS)",
      join(root, "packages/player/dist/ivkit-player.min.js"),
      27 * 1024,
      9 * 1024,
    ],
    ["Full core (all exports)", join(root, "packages/core/dist/index.js"), 16 * 1024, 5.5 * 1024],
    ["StoryEngine only", join(temporary, "dist/engine.js"), 5 * 1024, 1.75 * 1024],
    ["validateStory only", join(temporary, "dist/validation.js"), 7 * 1024, 2.5 * 1024],
  ];
  let failed = false;
  for (const [label, path, rawLimit, gzipLimit] of checks) {
    const bytes = await readFile(path);
    const gzipBytes = gzipSync(bytes, { level: 9 }).length;
    const passes = bytes.length <= rawLimit && gzipBytes <= gzipLimit;
    console.log(
      `${passes ? "PASS" : "FAIL"} ${label}: ${bytes.length} B raw / ${gzipBytes} B gzip (limits: ${rawLimit} / ${gzipLimit} B)`,
    );
    failed ||= !passes;
  }
  // Check that validation stays optional when importing playback functionality.
  for (const path of [
    join(root, "packages/player/dist/ivkit-player.min.js"),
    join(temporary, "dist/engine.js"),
  ]) {
    const code = await readFile(path, "utf8");
    assert(!code.includes("missing_geometry"), `Validation unexpectedly included in ${path}`);
  }
  if (failed) process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
