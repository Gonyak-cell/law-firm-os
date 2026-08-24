#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  desktopReleaseChannelConfig,
  directoryDigest,
  validateDesktopBuildManifest,
} from "./lib/matter-desktop-provenance.mjs";

const usage = "usage: node scripts/validate-pv002-build-manifest.mjs [--source|--package|--help]";
const command = process.argv[2] ?? "--source";
if (command === "--help") {
  console.log(usage);
  console.log("Checks the PV-002 build manifest schema, then optionally proves packaged/internal/external manifest and receipt parity.");
  process.exit(0);
}
if (!["--source", "--package"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const desktopPackage = readJson(path.join(ROOT, "apps/desktop/package.json"));
const version = desktopPackage.version;
const artifactName = `matter-internal-${version}`;
const internalChannel = desktopReleaseChannelConfig("internal");
const macArtifactName = `${internalChannel.macArtifactPrefix}-${version}`;
const macBuildPath = path.join(ROOT, "scripts/build-matter-desktop-mac.mjs");
const windowsBuildPath = path.join(ROOT, "scripts/build-matter-desktop-win.mjs");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function receiptValue(source, label) {
  const match = source.match(new RegExp(`^${label}: ` + "`([^`]+)`$", "m"));
  assert.ok(match, `build receipt is missing ${label}`);
  return match[1];
}

function validateSource() {
  const buildSources = [macBuildPath, windowsBuildPath].map((filePath) => readFileSync(filePath, "utf8"));
  for (const source of buildSources) {
    assert.match(source, /readDesktopBuildSourceIdentity\(repoRoot\)/);
    assert.match(source, /createDesktopBuildManifest\(\{/);
    assert.match(source, /directoryDigest\(/);
    assert.match(source, /writeDesktopBuildManifest\(\{/);
    assert.match(source, /Build manifest SHA-256:/);
    assert.match(source, /Source SHA:/);
    assert.match(source, /Renderer SHA-256:/);
    assert.match(source, /Built at:/);
  }
  return {
    version,
    build_paths: [
      path.relative(ROOT, macBuildPath),
      path.relative(ROOT, windowsBuildPath),
    ],
    source_contract_count: buildSources.length,
  };
}

const source = validateSource();
if (command === "--source") {
  console.log(JSON.stringify({ verdict: "PASS", mode: "source", ...source }, null, 2));
  process.exit(0);
}

const mac = {
  external: path.join(ROOT, `apps/desktop/dist/mac/${macArtifactName}-macos-build-manifest.json`),
  internal: path.join(ROOT, "apps/desktop/dist/mac", internalChannel.macAppBundleName, "Contents/Resources/matter-build-manifest.json"),
  renderer: path.join(ROOT, "apps/desktop/dist/mac", internalChannel.macAppBundleName, "Contents/Resources/app/src/renderer/web"),
  receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"),
};
const windows = {
  external: path.join(ROOT, `apps/desktop/dist/win/${artifactName}-win-build-manifest.json`),
  internal: path.join(ROOT, `apps/desktop/dist/win/${artifactName}-win32-x64/resources/matter-build-manifest.json`),
  renderer: path.join(ROOT, `apps/desktop/dist/win/${artifactName}-win32-x64/resources/app/src/renderer/web`),
  receipt: path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"),
  installerManifest: path.join(ROOT, `apps/desktop/dist/win/${artifactName}-win-installer-manifest.json`),
};

for (const requiredPath of [...Object.values(mac), ...Object.values(windows)]) {
  assert.equal(existsSync(requiredPath), true, `missing PV-002 package artifact: ${path.relative(ROOT, requiredPath)}`);
}

function packageRecord(platformPaths) {
  const externalBody = readFileSync(platformPaths.external, "utf8");
  const internalBody = readFileSync(platformPaths.internal, "utf8");
  assert.equal(internalBody, externalBody, "packaged and external build manifest bytes must match");
  const manifest = validateDesktopBuildManifest(JSON.parse(externalBody));
  assert.equal(manifest.version, version);
  assert.equal(manifest.source_dirty, false, "PV-002 package evidence must come from a clean product tree");
  const renderer = directoryDigest(platformPaths.renderer);
  assert.deepEqual(manifest.renderer, renderer, "packaged renderer bytes must match the build manifest");
  const receipt = readFileSync(platformPaths.receipt, "utf8");
  const manifestHash = sha256(externalBody);
  assert.equal(receiptValue(receipt, "Build manifest"), path.relative(ROOT, platformPaths.external));
  assert.equal(receiptValue(receipt, "Packaged build manifest"), path.relative(ROOT, platformPaths.internal));
  assert.equal(receiptValue(receipt, "Build manifest SHA-256"), manifestHash);
  assert.equal(receiptValue(receipt, "Source SHA"), manifest.source_sha);
  assert.equal(receiptValue(receipt, "Source tree"), manifest.source_tree);
  assert.equal(receiptValue(receipt, "Source dirty"), String(manifest.source_dirty));
  assert.equal(receiptValue(receipt, "Renderer SHA-256"), manifest.renderer.sha256);
  assert.equal(receiptValue(receipt, "Renderer files"), String(manifest.renderer.file_count));
  assert.equal(receiptValue(receipt, "Built at"), manifest.built_at);
  return {
    manifest,
    manifest_sha256: manifestHash,
    packaged_external_bytes_equal: true,
    renderer_recomputed: renderer,
  };
}

const macRecord = packageRecord(mac);
const windowsRecord = packageRecord(windows);
assert.equal(macRecord.manifest.platform, "darwin");
assert.ok(["arm64", "x64"].includes(macRecord.manifest.arch));
assert.equal(windowsRecord.manifest.platform, "win32");
assert.equal(windowsRecord.manifest.arch, "x64");

const sharedFields = [
  "schema_version",
  "product_name",
  "package_name",
  "version",
  "source_sha",
  "source_tree",
  "source_dirty",
  "renderer",
  "channel",
  "app_id",
  "public_release_claim",
  "production_go_live_claim",
];
const sharedFieldMismatches = sharedFields.filter((key) => (
  JSON.stringify(macRecord.manifest[key]) !== JSON.stringify(windowsRecord.manifest[key])
));
assert.deepEqual(sharedFieldMismatches, [], `Mac/Windows build manifest mismatch: ${sharedFieldMismatches.join(",")}`);

const productSha = macRecord.manifest.source_sha;
execFileSync("git", ["cat-file", "-e", `${productSha}^{commit}`], { cwd: ROOT });
const productTree = execFileSync("git", ["rev-parse", `${productSha}^{tree}`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(productTree, macRecord.manifest.source_tree, "build manifest source tree must belong to source_sha");

const windowsInstallerManifest = readJson(windows.installerManifest);
assert.equal(windowsInstallerManifest.buildManifest, path.relative(ROOT, windows.external));
assert.equal(windowsInstallerManifest.buildManifestSha256, windowsRecord.manifest_sha256);
assert.equal(windowsInstallerManifest.sourceSha, windowsRecord.manifest.source_sha);
assert.equal(windowsInstallerManifest.sourceTree, windowsRecord.manifest.source_tree);
assert.equal(windowsInstallerManifest.sourceDirty, false);
assert.equal(windowsInstallerManifest.rendererSha256, windowsRecord.manifest.renderer.sha256);
assert.equal(windowsInstallerManifest.rendererFiles, windowsRecord.manifest.renderer.file_count);
assert.equal(windowsInstallerManifest.builtAt, windowsRecord.manifest.built_at);

console.log(JSON.stringify({
  verdict: "PASS",
  mode: "package",
  ...source,
  product_sha: productSha,
  product_tree: productTree,
  channel: macRecord.manifest.channel,
  version: macRecord.manifest.version,
  shared_field_mismatch_count: sharedFieldMismatches.length,
  renderer: macRecord.manifest.renderer,
  macos: {
    built_at: macRecord.manifest.built_at,
    manifest_sha256: macRecord.manifest_sha256,
    packaged_external_bytes_equal: macRecord.packaged_external_bytes_equal,
  },
  windows: {
    built_at: windowsRecord.manifest.built_at,
    manifest_sha256: windowsRecord.manifest_sha256,
    packaged_external_bytes_equal: windowsRecord.packaged_external_bytes_equal,
    installer_manifest_linked: true,
  },
  package_receipt_mismatch_count: 0,
}, null, 2));
