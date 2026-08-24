#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { desktopReleaseChannelConfig } from "./lib/matter-desktop-provenance.mjs";

const usage = "usage: node scripts/validate-pv001-desktop-version.mjs [--source|--package|--help]";
const command = process.argv[2] ?? "--source";
if (command === "--help") {
  console.log(usage);
  console.log("Checks the desktop workspace version owners, then optionally verifies the generated internal Mac and Windows package metadata and hashes.");
  process.exit(0);
}
if (!["--source", "--package"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const rootPackagePath = path.join(ROOT, "package.json");
const lockPath = path.join(ROOT, "package-lock.json");
const desktopPackagePath = path.join(ROOT, "apps/desktop/package.json");
const electronBuilderPath = path.join(ROOT, "apps/desktop/electron-builder.yml");
const macBuildPath = path.join(ROOT, "scripts/build-matter-desktop-mac.mjs");
const windowsBuildPath = path.join(ROOT, "scripts/build-matter-desktop-win.mjs");
const updateControllerPath = path.join(ROOT, "apps/desktop/src/main/updates.js");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

function directoryDigest(directoryPath) {
  const files = [];
  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
    }
  }
  visit(directoryPath);
  files.sort((left, right) => path.relative(directoryPath, left).localeCompare(path.relative(directoryPath, right)));
  const manifest = files.map((filePath) => `${sha256File(filePath)}  ./${path.relative(directoryPath, filePath)}\n`).join("");
  return {
    sha256: sha256(manifest),
    file_count: files.length,
  };
}

function plistString(source, key) {
  const match = source.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`));
  assert.ok(match, `Info.plist is missing ${key}`);
  return match[1];
}

function receiptValue(source, label) {
  const match = source.match(new RegExp(`^${label}: ` + "`([^`]+)`$", "m"));
  assert.ok(match, `build receipt is missing ${label}`);
  return match[1];
}

function validateSource() {
  const rootPackage = readJson(rootPackagePath);
  const lock = readJson(lockPath);
  const desktopPackage = readJson(desktopPackagePath);
  const expectedVersion = desktopPackage.version;
  const versions = {
    root_package: rootPackage.version,
    lock_root: lock.version,
    lock_workspace_root: lock.packages?.[""]?.version,
    desktop_package: desktopPackage.version,
    lock_desktop_workspace: lock.packages?.["apps/desktop"]?.version,
  };
  const desktopVersionOwners = {
    desktop_package: versions.desktop_package,
    lock_desktop_workspace: versions.lock_desktop_workspace,
  };
  const rootVersionOwners = {
    root_package: versions.root_package,
    lock_root: versions.lock_root,
    lock_workspace_root: versions.lock_workspace_root,
  };
  const desktopMismatches = Object.entries(desktopVersionOwners).filter(([, version]) => version !== expectedVersion);
  const rootMismatches = Object.entries(rootVersionOwners).filter(([, version]) => version !== versions.root_package);
  assert.deepEqual(desktopMismatches, [], `desktop source version mismatch: ${JSON.stringify(desktopMismatches)}`);
  assert.deepEqual(rootMismatches, [], `root source version mismatch: ${JSON.stringify(rootMismatches)}`);

  const electronBuilder = readFileSync(electronBuilderPath, "utf8");
  const macBuild = readFileSync(macBuildPath, "utf8");
  const windowsBuild = readFileSync(windowsBuildPath, "utf8");
  const updateController = readFileSync(updateControllerPath, "utf8");
  assert.match(electronBuilder, /artifactName:\s*"matter-internal-\$\{version\}-\$\{os\}-\$\{arch\}\.\$\{ext\}"/);
  for (const buildSource of [macBuild, windowsBuild]) {
    assert.match(buildSource, /appVersion:\s*packageJson\.version/);
    assert.match(buildSource, /buildVersion:\s*packageJson\.version/);
  }
  for (const buildSource of [macBuild, windowsBuild]) assert.match(buildSource, /desktopReleaseChannelConfig/);
  assert.match(macBuild, /const artifactName = `\$\{channelConfig\.macArtifactPrefix\}-\$\{packageJson\.version\}`/);
  assert.match(windowsBuild, /const artifactName = `\$\{channelConfig\.artifactPrefix\}-\$\{packageJson\.version\}`/);
  assert.match(updateController, /activeVersion = metadata\.version/);
  assert.doesNotMatch(updateController, /\b0\.1\.\d+\b/, "update controller must consume metadata.version instead of hard-coding a release version");

  return {
    expected_version: expectedVersion,
    versions,
    desktop_version_owners: desktopVersionOwners,
    root_version_owners: rootVersionOwners,
    root_version_lineage_is_independent: true,
    desktop_version_mismatch_count: desktopMismatches.length,
    root_version_mismatch_count: rootMismatches.length,
    version_mismatch_count: desktopMismatches.length + rootMismatches.length,
    dynamic_build_metadata: true,
    dynamic_update_metadata: true,
  };
}

const source = validateSource();
if (command === "--source") {
  console.log(JSON.stringify({ verdict: "PASS", mode: "source", ...source }, null, 2));
  process.exit(0);
}

const version = source.expected_version;
const internalChannel = desktopReleaseChannelConfig("internal");
const macBundleRoot = path.join(ROOT, "apps/desktop/dist/mac", internalChannel.macAppBundleName);
const macAppRoot = path.join(macBundleRoot, "Contents/Resources/app");
const macPlistPath = path.join(macBundleRoot, "Contents/Info.plist");
const macRendererPath = path.join(macAppRoot, "src/renderer/web");
const macReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
const windowsRoot = path.join(ROOT, `apps/desktop/dist/win/matter-internal-${version}-win32-x64`);
const windowsAppRoot = path.join(windowsRoot, "resources/app");
const windowsRendererPath = path.join(windowsAppRoot, "src/renderer/web");
const windowsExecutablePath = path.join(windowsRoot, "matter.exe");
const windowsZipPath = path.join(ROOT, `apps/desktop/dist/win/matter-internal-${version}-win32-x64-unsigned.zip`);
const windowsManifestPath = path.join(ROOT, `apps/desktop/dist/win/matter-internal-${version}-win-installer-manifest.json`);
const windowsSignaturePath = `${windowsManifestPath}.sig`;
const windowsReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");

for (const requiredPath of [
  macPlistPath,
  macAppRoot,
  macRendererPath,
  macReceiptPath,
  windowsAppRoot,
  windowsRendererPath,
  windowsExecutablePath,
  windowsZipPath,
  windowsManifestPath,
  windowsSignaturePath,
  windowsReceiptPath,
]) assert.equal(existsSync(requiredPath), true, `missing generated package metadata: ${path.relative(ROOT, requiredPath)}`);

const plist = readFileSync(macPlistPath, "utf8");
const macPackagePath = path.join(macAppRoot, "package.json");
const windowsPackagePath = path.join(windowsAppRoot, "package.json");
const macPackage = readJson(macPackagePath);
const windowsPackage = readJson(windowsPackagePath);
const windowsManifestBody = readFileSync(windowsManifestPath);
const windowsManifest = JSON.parse(windowsManifestBody);
const macReceipt = readFileSync(macReceiptPath, "utf8");
const windowsReceipt = readFileSync(windowsReceiptPath, "utf8");
const packageVersions = {
  mac_info_short: plistString(plist, "CFBundleShortVersionString"),
  mac_info_build: plistString(plist, "CFBundleVersion"),
  mac_package: macPackage.version,
  windows_package: windowsPackage.version,
  windows_update_metadata: windowsManifest.version,
  mac_receipt: receiptValue(macReceipt, "Version"),
  windows_receipt: receiptValue(windowsReceipt, "Version"),
};
const versionMismatches = Object.entries(packageVersions).filter(([, value]) => value !== version);
assert.deepEqual(versionMismatches, [], `generated package version mismatch: ${JSON.stringify(versionMismatches)}`);
assert.equal(plistString(plist, "CFBundleName"), "matter");
assert.equal(plistString(plist, "CFBundleDisplayName"), internalChannel.macDisplayName);
assert.equal(plistString(plist, "CFBundleIdentifier"), internalChannel.appId);

const packageJsonHashes = {
  source: sha256File(desktopPackagePath),
  macos: sha256File(macPackagePath),
  windows: sha256File(windowsPackagePath),
};
const packageJsonHashMismatchCount = new Set(Object.values(packageJsonHashes)).size - 1;
assert.equal(packageJsonHashMismatchCount, 0, "same-version packaged package.json bytes must match the source");

const rendererHashes = {
  macos: directoryDigest(macRendererPath),
  windows: directoryDigest(windowsRendererPath),
};
const rendererHashMismatchCount = rendererHashes.macos.sha256 === rendererHashes.windows.sha256 ? 0 : 1;
assert.equal(rendererHashMismatchCount, 0, "same-version Mac and Windows renderer bytes must match");

const artifactHashMismatches = [];
if (windowsManifest.executableSha256 !== sha256File(windowsExecutablePath)) artifactHashMismatches.push("windows_executable");
if (windowsManifest.packageZipSha256 !== sha256File(windowsZipPath)) artifactHashMismatches.push("windows_zip");
assert.deepEqual(artifactHashMismatches, [], `signed update metadata artifact hash mismatch: ${artifactHashMismatches.join(",")}`);
const manifestHash = sha256(windowsManifestBody);
const expectedSignature = createHmac("sha256", "matter-internal-nonproduction-signing-key").update(manifestHash).digest("hex");
assert.equal(readFileSync(windowsSignaturePath, "utf8").trim(), expectedSignature, "internal update metadata signature mismatch");
assert.equal(receiptValue(macReceipt, "Channel"), "internal");
assert.equal(receiptValue(windowsReceipt, "Channel"), "internal");

console.log(JSON.stringify({
  verdict: "PASS",
  mode: "package",
  ...source,
  package_versions: packageVersions,
  generated_version_mismatch_count: versionMismatches.length,
  package_json_sha256: packageJsonHashes,
  same_version_package_json_hash_mismatch_count: packageJsonHashMismatchCount,
  renderer: rendererHashes,
  same_version_renderer_hash_mismatch_count: rendererHashMismatchCount,
  signed_update_metadata: {
    path: path.relative(ROOT, windowsManifestPath),
    version: windowsManifest.version,
    manifest_sha256: manifestHash,
    signature_verified: true,
    artifact_hash_mismatch_count: artifactHashMismatches.length,
  },
}, null, 2));
