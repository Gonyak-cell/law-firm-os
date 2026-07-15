#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  desktopReleaseChannelConfig,
  readDesktopBuildSourceIdentity,
  validateDesktopBuildManifest,
} from "./lib/matter-desktop-provenance.mjs";
import {
  DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  desktopReleaseArtifactRelativeRoot,
  desktopReleaseArtifactRoot,
  validateDesktopReleaseArtifactIndex,
} from "./lib/matter-desktop-release-paths.mjs";

const usage = "usage: node scripts/stage-matter-desktop-release-artifacts.mjs [--help]";
if (process.argv[2] === "--help") {
  console.log(usage);
  console.log("Promotes verified generic build outputs into dist/releases/<version>/<full-sha>/<channel>/.");
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
assert.equal(path.resolve(process.cwd()), path.resolve(ROOT), "run from repository root");
const desktopRoot = path.join(ROOT, "apps/desktop");
const desktopPackage = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
const version = desktopPackage.version;
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceDirty, false, "release artifact staging requires a clean product source");
const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA ?? sourceIdentity.sourceSha;
assert.match(expectedSourceSha, /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA");
assert.equal(sourceIdentity.sourceSha, expectedSourceSha, "release artifact staging source SHA mismatch");

const channelConfig = desktopReleaseChannelConfig(process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal");
const channel = channelConfig.channel;
const artifactName = channelConfig.artifactPrefix + "-" + version;
const releaseRelativeRoot = desktopReleaseArtifactRelativeRoot({
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel,
});
const releaseRoot = desktopReleaseArtifactRoot({
  repoRoot: ROOT,
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel,
});

function receiptValue(source, label) {
  const match = source.match(new RegExp("^" + label + ": \\x60([^\\x60]+)\\x60$", "m"));
  assert.ok(match, "build receipt is missing " + label);
  return match[1];
}

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

const generic = {
  mac: {
    buildManifest: path.join(desktopRoot, "dist/mac", artifactName + "-macos-build-manifest.json"),
    packagedManifest: path.join(desktopRoot, "dist/mac/matter.app/Contents/Resources/matter-build-manifest.json"),
    zip: path.join(desktopRoot, "dist/mac", artifactName + "-macos.zip"),
    dmg: path.join(desktopRoot, "dist/mac", artifactName + "-macos.dmg"),
    receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"),
  },
  windows: {
    buildManifest: path.join(desktopRoot, "dist/win", artifactName + "-win-build-manifest.json"),
    packagedManifest: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64/resources/matter-build-manifest.json"),
    installerManifest: path.join(desktopRoot, "dist/win", artifactName + "-win-installer-manifest.json"),
    installerManifestSignature: path.join(desktopRoot, "dist/win", artifactName + "-win-installer-manifest.json.sig"),
    zip: path.join(desktopRoot, "dist/win", artifactName + "-win32-x64-unsigned.zip"),
    installer: path.join(desktopRoot, "dist", artifactName + "-win-x64.exe"),
    installerBlockmap: path.join(desktopRoot, "dist", artifactName + "-win-x64.exe.blockmap"),
    receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"),
  },
};

for (const filePath of [
  generic.mac.buildManifest,
  generic.mac.packagedManifest,
  generic.mac.zip,
  generic.mac.dmg,
  generic.mac.receipt,
  generic.windows.buildManifest,
  generic.windows.packagedManifest,
  generic.windows.installerManifest,
  generic.windows.installerManifestSignature,
  generic.windows.zip,
  generic.windows.receipt,
]) {
  assert.equal(existsSync(filePath), true, "missing verified build output: " + path.relative(ROOT, filePath));
}

const [macManifestBody, packagedMacManifestBody, windowsManifestBody, packagedWindowsManifestBody] = await Promise.all([
  readFile(generic.mac.buildManifest),
  readFile(generic.mac.packagedManifest),
  readFile(generic.windows.buildManifest),
  readFile(generic.windows.packagedManifest),
]);
assert.deepEqual(packagedMacManifestBody, macManifestBody, "Mac packaged/external build manifest mismatch");
assert.deepEqual(packagedWindowsManifestBody, windowsManifestBody, "Windows packaged/external build manifest mismatch");
const macManifest = validateDesktopBuildManifest(JSON.parse(macManifestBody));
const windowsManifest = validateDesktopBuildManifest(JSON.parse(windowsManifestBody));
for (const manifest of [macManifest, windowsManifest]) {
  assert.equal(manifest.version, version);
  assert.equal(manifest.source_sha, sourceIdentity.sourceSha);
  assert.equal(manifest.source_tree, sourceIdentity.sourceTree);
  assert.equal(manifest.source_dirty, false);
  assert.equal(manifest.channel, channel);
  assert.equal(manifest.app_id, channelConfig.appId);
}
assert.deepEqual(macManifest.renderer, windowsManifest.renderer, "Mac/Windows renderer mismatch");

const [macReceipt, windowsReceipt] = await Promise.all([
  readFile(generic.mac.receipt, "utf8"),
  readFile(generic.windows.receipt, "utf8"),
]);
for (const [platform, receipt] of [["macOS", macReceipt], ["Windows", windowsReceipt]]) {
  assert.equal(receiptValue(receipt, "Version"), version, platform + " receipt version mismatch");
  assert.equal(receiptValue(receipt, "Channel"), channel, platform + " receipt channel mismatch");
  assert.equal(receiptValue(receipt, "App ID"), channelConfig.appId, platform + " receipt app ID mismatch");
  assert.equal(receiptValue(receipt, "Source SHA"), sourceIdentity.sourceSha, platform + " receipt source SHA mismatch");
  assert.equal(receiptValue(receipt, "Source tree"), sourceIdentity.sourceTree, platform + " receipt source tree mismatch");
  assert.equal(receiptValue(receipt, "Source dirty"), "false", platform + " receipt source dirtiness mismatch");
}

const stagedSpecs = [
  ["macos_zip_archive", generic.mac.zip, "mac/" + path.basename(generic.mac.zip), "darwin", "zip_archive"],
  ["macos_dmg_image", generic.mac.dmg, "mac/" + path.basename(generic.mac.dmg), "darwin", "dmg_image"],
  ["macos_build_manifest", generic.mac.buildManifest, "mac/" + path.basename(generic.mac.buildManifest), "darwin", "build_manifest"],
  ["windows_package_zip", generic.windows.zip, "win/" + path.basename(generic.windows.zip), "win32", "unsigned_package_zip"],
  ["windows_installer_manifest", generic.windows.installerManifest, "win/" + path.basename(generic.windows.installerManifest), "win32", "installer_manifest"],
  ["windows_manifest_signature", generic.windows.installerManifestSignature, "win/" + path.basename(generic.windows.installerManifestSignature), "win32", "detached_receipt_signature"],
  ["windows_build_manifest", generic.windows.buildManifest, "win/" + path.basename(generic.windows.buildManifest), "win32", "build_manifest"],
  ["macos_build_receipt", generic.mac.receipt, "receipts/macos-build.md", "darwin", "receipt"],
  ["windows_build_receipt", generic.windows.receipt, "receipts/windows-build.md", "win32", "receipt"],
];
if (existsSync(generic.windows.installer) || existsSync(generic.windows.installerBlockmap)) {
  assert.equal(existsSync(generic.windows.installer), true, "Windows installer/blockmap must be staged as a pair");
  assert.equal(existsSync(generic.windows.installerBlockmap), true, "Windows installer/blockmap must be staged as a pair");
  stagedSpecs.push(
    ["windows_installer", generic.windows.installer, "win/" + path.basename(generic.windows.installer), "win32", "nsis_installer"],
    ["windows_installer_blockmap", generic.windows.installerBlockmap, "win/" + path.basename(generic.windows.installerBlockmap), "win32", "installer_blockmap"],
  );
}

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
for (const [, sourcePath, targetSuffix] of stagedSpecs) {
  const targetPath = path.join(releaseRoot, targetSuffix);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath);
}

const artifacts = [];
for (const [id, , targetSuffix, platform, kind] of stagedSpecs) {
  const targetPath = path.join(releaseRoot, targetSuffix);
  const body = await readFile(targetPath);
  const fileStat = await stat(targetPath);
  artifacts.push({
    id,
    path: path.posix.join(releaseRelativeRoot, targetSuffix.replaceAll(path.sep, "/")),
    platform,
    kind,
    bytes: fileStat.size,
    sha256: sha256(body),
  });
}

const index = validateDesktopReleaseArtifactIndex({
  schema_version: DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  source_dirty: false,
  channel,
  app_id: channelConfig.appId,
  artifact_root: releaseRelativeRoot,
  renderer: macManifest.renderer,
  generated_at: new Date().toISOString(),
  generic_build_paths_are_release_truth: false,
  public_release_claim: false,
  production_go_live_claim: false,
  artifacts,
});
await writeFile(path.join(releaseRoot, "artifact-index.json"), JSON.stringify(index, null, 2) + "\n");
await writeFile(
  path.join(releaseRoot, "checksums.sha256"),
  artifacts.map((artifact) => artifact.sha256 + "  " + artifact.path).join("\n") + "\n",
);

console.log(JSON.stringify({
  verdict: "PASS",
  artifact_root: releaseRelativeRoot,
  artifact_index: path.posix.join(releaseRelativeRoot, "artifact-index.json"),
  checksums: path.posix.join(releaseRelativeRoot, "checksums.sha256"),
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  channel,
  app_id: channelConfig.appId,
  renderer_sha256: index.renderer.sha256,
  renderer_files: index.renderer.file_count,
  artifact_count: artifacts.length,
  generic_build_paths_are_release_truth: false,
  public_release_claim: false,
  production_go_live_claim: false,
}, null, 2));
