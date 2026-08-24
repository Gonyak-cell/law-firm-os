#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./lib/matter-desktop-release-paths.mjs";

const usage = "usage: node scripts/validate-pv005-release-artifact-paths.mjs --source|--package|--help";
const mode = process.argv[2];
if (mode === "--help") {
  console.log(usage);
  console.log("Validates that desktop release truth is version/full-SHA/channel scoped.");
  process.exit(0);
}
if (!["--source", "--package"].includes(mode) || process.argv.length !== 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = process.cwd();
const protectedConsumers = [
  "scripts/release-matter-desktop-formal.mjs",
  "scripts/release-matter-desktop-temporary.mjs",
  "scripts/validate-matter-desktop-formal-release-bundle.mjs",
  "scripts/validate-matter-desktop-temporary-release-bundle.mjs",
  "scripts/validate-matter-desktop-release-boundary.mjs",
];

function source(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

if (mode === "--source") {
  const helper = source("scripts/lib/matter-desktop-release-paths.mjs");
  const stage = source("scripts/stage-matter-desktop-release-artifacts.mjs");
  const packageJson = JSON.parse(source("package.json"));

  assert(helper.includes("apps/desktop/dist/releases"), "release helper must define the SHA-scoped release root");
  assert(helper.includes("sourceSha must be a full 40-character Git SHA"), "release helper must reject abbreviated SHAs");
  const provenance = source("scripts/lib/matter-desktop-provenance.mjs");
  for (const generatedReceipt of [
    "docs/desktop/matter-desktop-formal-release-receipt.md",
    "docs/desktop/matter-desktop-temporary-release-receipt.md",
  ]) {
    assert(provenance.includes(generatedReceipt), `generated release receipt must not dirty package validation: ${generatedReceipt}`);
  }
  assert(stage.includes("desktopReleaseArtifactRoot"), "stage command must write through the release path helper");
  assert(stage.includes("validateDesktopReleaseArtifactIndex"), "stage command must validate its artifact index");
  assert(stage.includes("generic_build_paths_are_release_truth: false"), "stage command must reject generic release truth");

  const genericRoots = [
    "apps/desktop/dist/mac",
    "apps/desktop/dist/win",
    "apps/desktop/dist/release/",
  ];
  for (const relativePath of protectedConsumers) {
    const body = source(relativePath);
    assert(body.includes("readDesktopReleaseArtifactStage"), `${relativePath} must consume the SHA-scoped artifact stage`);
    for (const genericRoot of genericRoots) {
      assert.equal(body.includes(genericRoot), false, `${relativePath} must not consume generic release root ${genericRoot}`);
    }
  }

  const scripts = packageJson.scripts ?? {};
  assert.equal(
    scripts["matter-desktop:release-artifacts:stage"],
    "node scripts/stage-matter-desktop-release-artifacts.mjs",
  );
  assert.equal(
    scripts["matter-desktop:release-paths:validate"],
    "node scripts/validate-pv005-release-artifact-paths.mjs --source",
  );
  for (const [name, channel] of [
    ["matter-desktop:temporary-release", "internal"],
    ["matter-desktop:formal-release", "formal"],
  ]) {
    const command = scripts[name] ?? "";
    const stageCommand = `MATTER_DESKTOP_RELEASE_CHANNEL=${channel} node scripts/stage-matter-desktop-release-artifacts.mjs`;
    const packageValidation = `MATTER_DESKTOP_RELEASE_CHANNEL=${channel} node scripts/validate-pv005-release-artifact-paths.mjs --package`;
    assert(command.includes(stageCommand), `${name} must stage ${channel} artifacts`);
    assert(command.includes(packageValidation), `${name} must validate ${channel} staged artifacts`);
    assert(command.indexOf(stageCommand) < command.indexOf("release-matter-desktop-"), `${name} must stage before release assembly`);
    assert(command.indexOf(packageValidation) < command.indexOf("release-matter-desktop-"), `${name} must validate before release assembly`);
  }

  console.log(JSON.stringify({
    verdict: "PASS",
    mode: "source",
    protected_release_consumers: protectedConsumers.length,
    generic_release_truth_references: 0,
    sha_scoped_pipelines: 2,
  }, null, 2));
  process.exit(0);
}

const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceDirty, false, "package validation requires a clean product source");
const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA ?? sourceIdentity.sourceSha;
assert.match(expectedSourceSha, /^[0-9a-f]{40}$/, "expected source SHA must be a full 40-character Git SHA");
assert.equal(sourceIdentity.sourceSha, expectedSourceSha, "package validation source SHA mismatch");
const desktopPackage = JSON.parse(source("apps/desktop/package.json"));
const channel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
const stagePlatforms = process.env.MATTER_DESKTOP_STAGE_PLATFORMS ?? "all";
assert.ok(["all", "macos"].includes(stagePlatforms), "MATTER_DESKTOP_STAGE_PLATFORMS must be all or macos");
const releaseStage = readDesktopReleaseArtifactStage({
  repoRoot: ROOT,
  version: desktopPackage.version,
  sourceSha: sourceIdentity.sourceSha,
  channel,
});
assert.equal(releaseStage.index.source_tree, sourceIdentity.sourceTree, "package source tree mismatch");
assert.equal(releaseStage.index.generic_build_paths_are_release_truth, false);
const requiredArtifactIds = [
  "macos_zip_archive",
  "macos_dmg_image",
  "macos_build_manifest",
  "macos_build_receipt",
];
if (stagePlatforms === "all") requiredArtifactIds.push(
  "windows_package_zip",
  "windows_installer_manifest",
  "windows_manifest_signature",
  "windows_build_manifest",
  "windows_build_receipt",
);
for (const id of requiredArtifactIds) {
  requireDesktopReleaseArtifact(releaseStage.index, id);
}
if (channel === "formal" && stagePlatforms === "all") {
  requireDesktopReleaseArtifact(releaseStage.index, "windows_installer");
  requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_blockmap");
}

console.log(JSON.stringify({
  verdict: "PASS",
  mode: "package",
  version: desktopPackage.version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  channel,
  stage_platforms: stagePlatforms,
  artifact_root: releaseStage.relativeRoot,
  artifact_count: releaseStage.index.artifacts.length,
  renderer_sha256: releaseStage.index.renderer.sha256,
  renderer_files: releaseStage.index.renderer.file_count,
  generic_build_artifact_dependencies: 0,
  public_release_claim: false,
  production_go_live_claim: false,
}, null, 2));
