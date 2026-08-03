import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDesktopBuildManifest,
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  directoryDigest,
} from "../lib/matter-desktop-provenance.mjs";
import {
  APPROVED_DESKTOP_ASSET_HASHES,
  FORBIDDEN_LEGACY_ASSET_HASHES,
  RETIRED_UI_PATHS,
  inspectPackagedRenderer,
  scanLegacyAssetReferences,
} from "../lib/matter-desktop-legacy-assets.mjs";

const SOURCE_SHA = "a".repeat(40);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function withFixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "matter-pv006-"));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relativePath, body) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, body);
  return target;
}

test("PV-006 policy fixes the retired paths and known legacy asset hashes", () => {
  assert.ok(RETIRED_UI_PATHS.includes("docs/ui-reference"));
  assert.ok(RETIRED_UI_PATHS.includes("apps/web/src/assets/parnas-tower-login.jpg"));
  assert.ok(RETIRED_UI_PATHS.includes("apps/desktop/build/amic-petra-main.svg"));
  assert.ok(RETIRED_UI_PATHS.includes("apps/desktop/src/renderer/offline.matter.html"));
  assert.ok(FORBIDDEN_LEGACY_ASSET_HASHES.has("bbcfb3c37d84e78be05dfbed517579dbdf50c69ac669e11b2033bbde9bda9cd3"));
  assert.ok(FORBIDDEN_LEGACY_ASSET_HASHES.has("ba260a37a453bc97f5b00cd3e1c529e87bf17a47ff0cc0b6c73d22ac5c4d7424"));
  assert.equal(APPROVED_DESKTOP_ASSET_HASHES.brochure_cover, "5ff1776144df2fff44977494ea3eecdcf1f2d5c96dfc30deba3411bf320ee3bf");
});

test("PV-006 active-tree scan catches renamed legacy bytes and stale branding references", () => withFixture((root) => {
  const legacyBytes = Buffer.from("legacy-image");
  const legacyHash = sha256(legacyBytes);
  const forbiddenHashes = new Set([...FORBIDDEN_LEGACY_ASSET_HASHES, legacyHash]);
  write(root, "active/assets/renamed.jpg", legacyBytes);
  write(root, "active/main.js", "const image = 'petrabridge-brochure.jpg';\n");
  write(root, "archive/history.md", "apps/web/src/assets/parnas-tower-login.jpg\n");

  const result = scanLegacyAssetReferences({
    root,
    relativeRoots: ["active"],
    forbiddenHashes,
  });

  assert.equal(result.files_scanned, 2);
  assert.deepEqual(result.violations.map(({ kind }) => kind).sort(), ["content_reference", "legacy_hash"]);
  assert.equal(result.violations.some(({ path: relativePath }) => relativePath.startsWith("archive/")), false);
}));

test("PV-006 packaged renderer accepts only current web entry and approved assets", () => withFixture((root) => {
  const resourcesRoot = path.join(root, "resources");
  const appRoot = path.join(resourcesRoot, "app");
  const renderer = Buffer.from("current-renderer");
  const brochure = Buffer.from("current-brochure");
  const icon = Buffer.from("current-icon");
  const logo = Buffer.from("current-logo");
  write(appRoot, "src/renderer/web/index.html", "<!doctype html><div id=\"root\"></div>");
  write(appRoot, "src/renderer/web/assets/index.js", renderer);
  write(appRoot, "src/renderer/web/assets/brochure-cover-current.jpg", brochure);
  write(appRoot, "src/renderer/web/amic-law-icon.png", icon);
  write(appRoot, "build/amic-law-logo-accent.svg", logo);
  const rendererDigest = directoryDigest(path.join(appRoot, "src/renderer/web"));
  write(resourcesRoot, "matter-build-manifest.json", `${JSON.stringify(createDesktopBuildManifest({
    version: "0.1.17",
    sourceSha: SOURCE_SHA,
    sourceTree: "b".repeat(40),
    sourceDirty: false,
    renderer: { ...rendererDigest, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
  }))}\n`);

  const result = inspectPackagedRenderer({
    resourcesRoot,
    expectedSourceSha: SOURCE_SHA,
    expectedRendererSha256: rendererDigest.sha256,
    approvedBrochureHash: sha256(brochure),
    approvedIconHash: sha256(icon),
    approvedBuildAssetHashes: { "amic-law-logo-accent.svg": sha256(logo) },
  });

  assert.equal(result.verdict, "PASS");
  assert.equal(result.offline_entry_files, 0);
  assert.equal(result.legacy_violations.length, 0);
}));

test("PV-006 packaged renderer fails closed on offline entry, old mark, or wrong SHA", () => withFixture((root) => {
  const resourcesRoot = path.join(root, "resources");
  const appRoot = path.join(resourcesRoot, "app");
  write(appRoot, "src/renderer/web/index.html", "<!doctype html>");
  write(appRoot, "src/renderer/offline.html", "old login");
  write(appRoot, "build/matter-mark.svg", "old mark");
  write(resourcesRoot, "matter-build-manifest.json", `${JSON.stringify(createDesktopBuildManifest({
    version: "0.1.17",
    sourceSha: "b".repeat(40),
    sourceTree: "c".repeat(40),
    sourceDirty: false,
    renderer: { sha256: "c".repeat(64), file_count: 1, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
  }))}\n`);

  assert.throws(() => inspectPackagedRenderer({
    resourcesRoot,
    expectedSourceSha: SOURCE_SHA,
    expectedRendererSha256: "c".repeat(64),
    approvedBrochureHash: "d".repeat(64),
    approvedIconHash: "e".repeat(64),
  }), /source SHA|offline|legacy|approved/i);
}));
