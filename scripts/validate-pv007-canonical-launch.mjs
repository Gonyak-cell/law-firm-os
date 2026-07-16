#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertCanonicalLaunchProcessState,
  darwinProcessExecutable,
  inspectCanonicalMacBundle,
  parseMatterProcessTable,
} from "./lib/matter-desktop-canonical-launch.mjs";

const usage = "usage: node scripts/validate-pv007-canonical-launch.mjs --source|--package|--help";
const mode = process.argv[2];
if (mode === "--help") {
  console.log(usage);
  process.exit(0);
}
if (!["--source", "--package"].includes(mode) || process.argv.length !== 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const launcherPath = path.join(ROOT, "scripts/launch-matter-desktop-canonical.mjs");
const helperPath = path.join(ROOT, "scripts/lib/matter-desktop-canonical-launch.mjs");
const launcher = readFileSync(launcherPath, "utf8");
const helper = readFileSync(helperPath, "utf8");

assert.equal(
  packageJson.scripts["matter-desktop:launch"],
  "node scripts/launch-matter-desktop-canonical.mjs",
  "package.json must expose one canonical desktop launcher",
);
assert.match(launcher, /--expected-sha is required/);
assert.match(launcher, /canonical matter\.app launcher requires macOS/);
assert.match(launcher, /assertCanonicalLaunchProcessState/);
assert.match(launcher, /signal\(pid, "SIGTERM"\)/);
assert.match(launcher, /spawn\(inspection\.executable/);
assert.doesNotMatch(launcher, /open\s+-a|\/Applications\/matter\.app|\bpkill\b|\bkillall\b/);
assert.match(helper, /readDesktopReleaseArtifactStage/);
assert.match(helper, /validateDesktopBuildManifest/);
assert.match(helper, /different matter bundle already running/);

if (mode === "--source") {
  console.log(JSON.stringify({
    verdict: "PASS",
    mode: "source",
    canonical_launcher: "scripts/launch-matter-desktop-canonical.mjs",
    expected_sha_required: true,
    exact_path_spawn: true,
    broad_process_kill: false,
    different_bundle_fail_closed: true,
    package_script_count: 1,
  }, null, 2));
  process.exit(0);
}

const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
assert.match(expectedSourceSha ?? "", /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full Git SHA");
const appBundlePath = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const inspection = inspectCanonicalMacBundle({
  repoRoot: ROOT,
  appBundlePath,
  expectedSourceSha,
  expectedChannel: process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal",
});
const processes = parseMatterProcessTable(
  execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" }),
  { resolveExecutable: darwinProcessExecutable },
);
const processState = assertCanonicalLaunchProcessState({ processes, targetExecutable: inspection.executable });
console.log(JSON.stringify({
  verdict: "PASS",
  mode: "package",
  source_sha: inspection.source_sha,
  app_bundle: inspection.app_bundle,
  executable: inspection.executable,
  artifact_index: inspection.artifact_index,
  renderer_sha256: inspection.renderer.sha256,
  renderer_files: inspection.renderer.file_count,
  exact_path_duplicate_count: processState.duplicate_pids.length,
  conflicting_bundle_count: processState.conflicting_pids.length,
  mutation_performed: false,
}, null, 2));
