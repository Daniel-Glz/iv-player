// Publishes both packages to npm, core first since the player depends on it.
// The release workflow runs it for each GitHub release. Run it after `pnpm build`.
//
// Usage: node scripts/publish.mjs [--tag v1.2.3] [--dry-run]
//
// pnpm packs each package, replacing `workspace:*` with the real version, and
// the npm CLI publishes the tarball, since it handles trusted publishing and
// provenance. A version that's already on npm is skipped, so a failed release
// can be run again.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({
  options: { tag: { type: "string" }, "dry-run": { type: "boolean", default: false } },
});
const dryRun = values["dry-run"];

const packages = [];
for (const name of ["core", "player"]) {
  const dir = join(root, "packages", name);
  packages.push({ dir, ...JSON.parse(await readFile(join(dir, "package.json"), "utf8")) });
}

// Both packages are versioned together, and a release's tag must name that version.
const version = packages[0].version;
for (const pkg of packages)
  assert.equal(pkg.version, version, `${pkg.name} is at ${pkg.version}, not ${version}`);
if (values.tag)
  assert.equal(
    values.tag,
    `v${version}`,
    `Release tag ${values.tag} doesn't match the packages' version ${version}`,
  );

// Prereleases such as 1.0.0-beta.1 go to the "next" dist-tag so they're never installed by default.
const distTag = version.includes("-") ? "next" : "latest";

function isPublished(name) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

const temporary = await mkdtemp(join(tmpdir(), "ivkit-publish-"));
try {
  for (const pkg of packages) {
    if (isPublished(pkg.name)) {
      console.log(`SKIP ${pkg.name}@${version} is already on npm`);
      continue;
    }
    const out = join(temporary, pkg.name.replace("/", "-"));
    execFileSync("pnpm", ["pack", "--pack-destination", out], {
      cwd: pkg.dir,
      stdio: ["ignore", "ignore", "inherit"],
    });
    const [tarball] = await readdir(out);
    const args = ["publish", join(out, tarball), "--access", "public", "--tag", distTag];
    // Provenance needs the CI's identity, which a local dry run doesn't have.
    if (process.env.GITHUB_ACTIONS) args.push("--provenance");
    if (dryRun) args.push("--dry-run");
    execFileSync("npm", args, { stdio: "inherit" });
    console.log(`${dryRun ? "DRY RUN" : "PUBLISHED"} ${pkg.name}@${version} (${distTag})`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
