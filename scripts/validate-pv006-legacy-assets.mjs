#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  APPROVED_DESKTOP_ASSET_HASHES,
  RETIRED_UI_PATHS,
  inspectPackagedRenderer,
  scanLegacyAssetReferences,
  sha256File,
} from "./lib/matter-desktop-legacy-assets.mjs";
import {
  desktopReleaseChannelConfig,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";

const usage = "usage: node scripts/validate-pv006-legacy-assets.mjs --source|--bundle|--help";
const mode = process.argv[2];
if (mode === "--help") {
  console.log(usage);
  console.log("Scans active product sources or exact macOS/Windows bundles for retired login, Parnas/Petra, old mark, and stale renderer entries.");
  process.exit(0);
}
if (!["--source", "--bundle"].includes(mode) || process.argv.length !== 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = process.cwd();
const source = (relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8");

if (mode === "--source") {
  const retainedPaths = RETIRED_UI_PATHS.filter((relativePath) => existsSync(path.join(ROOT, relativePath)));
  assert.deepEqual(retainedPaths, [], `retired UI paths must stay deleted: ${retainedPaths.join(", ")}`);
  const scan = scanLegacyAssetReferences({
    root: ROOT,
    relativeRoots: [
      "apps/web/src",
      "apps/web/public",
      "apps/desktop/src",
      "apps/desktop/build",
      "apps/desktop/electron-builder.yml",
    ],
  });
  assert.deepEqual(scan.violations, [], `legacy product references must be zero: ${JSON.stringify(scan.violations)}`);

  const approvedSourceAssets = {
    "apps/web/src/assets/brochure-cover.jpg": APPROVED_DESKTOP_ASSET_HASHES.brochure_cover,
    "apps/web/public/amic-law-icon.png": APPROVED_DESKTOP_ASSET_HASHES.icon_png,
    "apps/desktop/build/icon.png": APPROVED_DESKTOP_ASSET_HASHES.icon_png,
    "apps/desktop/build/icon.icns": APPROVED_DESKTOP_ASSET_HASHES.icon_icns,
    "apps/desktop/build/icon.ico": APPROVED_DESKTOP_ASSET_HASHES.icon_ico,
    "apps/desktop/build/amic-law-logo-accent.svg": APPROVED_DESKTOP_ASSET_HASHES.amic_law_logo_accent,
  };
  for (const [relativePath, expectedHash] of Object.entries(approvedSourceAssets)) {
    assert.equal(sha256File(path.join(ROOT, relativePath)), expectedHash, `approved source asset drifted: ${relativePath}`);
  }

  const main = source("apps/desktop/src/main/main.js");
  const appProtocol = source("apps/desktop/src/main/app-protocol.js");
  const macBuild = source("scripts/build-matter-desktop-mac.mjs");
  const winBuild = source("scripts/build-matter-desktop-win.mjs");
  const packageJson = JSON.parse(source("package.json"));
  assert.match(
    main,
    /import \{ installMatterAppProtocol, matterAppRendererUrl, registerMatterAppScheme \} from "\.\/app-protocol\.js";/,
    "desktop main must use the hardened matter-app protocol",
  );
  assert.match(
    main,
    /export function packagedRendererUrl\(\) \{\s*return matterAppRendererUrl\(\);\s*\}/,
    "packaged renderer must resolve through the matter-app protocol",
  );
  assert.match(appProtocol, /export const MATTER_APP_ORIGIN = `\$\{MATTER_APP_SCHEME\}:\/\/app`;/, "matter-app origin must be fixed");
  assert.match(appProtocol, /export const MATTER_APP_WEB_ROOT = join\(moduleDir, "\.\.\/renderer\/web"\);/, "matter-app must serve the current web entry");
  assert.match(appProtocol, /const url = new URL\(`\$\{MATTER_APP_ORIGIN\}\/index\.html`\);/, "matter-app renderer must use the current web entry");
  assert.match(appProtocol, /url\.searchParams\.set\("desktop", "1"\);/, "packaged renderer must enter desktop mode");
  assert.match(main, /offline\(\?:\\\.matter\)\?\\\.html\$\/i\.test\(pathname\)\) return packagedRendererUrl\(\)/, "stale offline URL must fail over to the current web entry");
  for (const [relativePath, buildSource] of [
    ["scripts/build-matter-desktop-mac.mjs", macBuild],
    ["scripts/build-matter-desktop-win.mjs", winBuild],
  ]) {
    assert.match(buildSource, /src\\\/renderer\\\/offline\(\?:\\\.matter\)\?\\\.html\$\//, `${relativePath} must exclude offline renderer entries`);
  }

  const scripts = packageJson.scripts ?? {};
  assert.equal(scripts["matter-desktop:legacy-assets:validate"], "node scripts/validate-pv006-legacy-assets.mjs --source");
  const formalRelease = scripts["matter-desktop:formal-release"] ?? "";
  const formalPv006Index = formalRelease.indexOf("npm run matter-desktop:legacy-assets:validate");
  const formalAwsSmokeIndex = formalRelease.indexOf("npm run matter-desktop:aws-runtime:smoke");
  const formalMacBuildIndex = formalRelease.indexOf("npm --workspace apps/desktop run build:mac");
  assert.ok(formalPv006Index >= 0, "formal-release must run the source PV-006 gate");
  assert.ok(formalPv006Index < formalAwsSmokeIndex, "formal-release must run PV-006 before provider smoke");
  assert.ok(formalPv006Index < formalMacBuildIndex, "formal-release must run PV-006 before build/notary");
  for (const releaseScript of ["matter-desktop:temporary-release", "matter-desktop:formal-release"]) {
    assert.match(scripts[releaseScript] ?? "", /validate-pv006-legacy-assets\.mjs --bundle/, `${releaseScript} must scan both built bundles`);
  }

  console.log(JSON.stringify({
    verdict: "PASS",
    mode: "source",
    retired_paths_checked: RETIRED_UI_PATHS.length,
    active_files_scanned: scan.files_scanned,
    forbidden_references: scan.violations.length,
    approved_asset_hashes: approvedSourceAssets,
    packaged_entry: "matter-app://app/index.html?desktop=1",
    offline_entry_packaged: false,
    archived_evidence_scanned: false,
  }, null, 2));
  process.exit(0);
}

const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceDirty, false, `bundle scan requires clean product source: ${sourceIdentity.sourceDirtyPaths.join(", ")}`);
const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA ?? sourceIdentity.sourceSha;
assert.match(expectedSourceSha, /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA");
assert.equal(sourceIdentity.sourceSha, expectedSourceSha, "bundle scan HEAD must match expected source SHA");
const desktopPackage = JSON.parse(source("apps/desktop/package.json"));
const channel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
const channelConfig = desktopReleaseChannelConfig(channel);
const windowsArtifactName = `${channelConfig.windowsArtifactPrefix}-${desktopPackage.version}`;
const macResourcesRoot = process.env.MATTER_DESKTOP_MAC_RESOURCES_ROOT
  ?? path.join(ROOT, "apps/desktop/dist/mac", channelConfig.macAppBundleName, "Contents/Resources");
const winResourcesRoot = process.env.MATTER_DESKTOP_WIN_RESOURCES_ROOT
  ?? path.join(ROOT, `apps/desktop/dist/win/${windowsArtifactName}-win32-x64/resources`);
const manifests = [macResourcesRoot, winResourcesRoot].map((resourcesRoot) => (
  JSON.parse(readFileSync(path.join(resourcesRoot, "matter-build-manifest.json"), "utf8"))
));
for (const manifest of manifests) {
  assert.equal(manifest.channel, channel, "bundle channel mismatch");
  assert.equal(manifest.app_id, channelConfig.appId, "bundle app ID mismatch");
}
assert.equal(manifests[0].source_sha, manifests[1].source_sha, "Mac/Windows source SHA mismatch");
assert.equal(manifests[0].renderer.sha256, manifests[1].renderer.sha256, "Mac/Windows renderer hash mismatch");
assert.equal(manifests[0].renderer.file_count, manifests[1].renderer.file_count, "Mac/Windows renderer file count mismatch");
const expectedRendererSha256 = manifests[0].renderer.sha256;
const [mac, windows] = [macResourcesRoot, winResourcesRoot].map((resourcesRoot) => inspectPackagedRenderer({
  resourcesRoot,
  expectedSourceSha,
  expectedRendererSha256,
}));

console.log(JSON.stringify({
  verdict: "PASS",
  mode: "bundle",
  version: desktopPackage.version,
  channel,
  app_id: channelConfig.appId,
  source_sha: expectedSourceSha,
  renderer_sha256: expectedRendererSha256,
  renderer_files: mac.renderer_files,
  macos: mac,
  windows,
  forbidden_references: mac.legacy_violations.length + windows.legacy_violations.length,
  offline_entry_files: mac.offline_entry_files + windows.offline_entry_files,
  public_release_claim: false,
  production_go_live_claim: false,
}, null, 2));
