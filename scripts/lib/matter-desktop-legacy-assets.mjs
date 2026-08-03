import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { directoryDigest, validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";

export const RETIRED_UI_PATHS = Object.freeze([
  "docs/ui-reference",
  "apps/web/src/assets/matter-mark.svg",
  "apps/web/public/matter-mark.svg",
  "apps/web/src/assets/matter-logo.svg",
  "apps/web/src/assets/parnas-tower-login.jpg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple.svg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple_White.svg",
  "apps/web/src/context/SkinContext.jsx",
  "apps/desktop/build/icon-source-mark.png",
  "apps/desktop/build/icon.svg",
  "apps/desktop/build/amic-petra-main.svg",
  "apps/desktop/src/renderer/offline.matter.html",
  "scripts/generate-matter-desktop-icon.mjs",
  "scripts/generate-amplitude-ui-reference.mjs",
  "scripts/extract-amplitude-visual-tokens.mjs",
  "scripts/generate-matter-amplitude-screenshot-state-registry.mjs",
  "scripts/verify-matter-amplitude-screenshot-states.mjs",
  "scripts/generate-matter-amplitude-coverage-ledger.mjs",
  "scripts/capture-matter-amplitude-parity.mjs",
  "scripts/audit-matter-amplitude-pixel-parity.mjs",
  "scripts/test/ui-tooling-smoke.test.mjs",
]);

export const FORBIDDEN_LEGACY_REFERENCE_TOKENS = Object.freeze([
  "docs/ui-reference",
  "parnas",
  "parnas-tower-login",
  "petrabridge",
  "petra-bridge",
  "AMIC_n_PETRA_Main_Simple",
  "amic-petra-main",
  "matter-mark.svg",
  "matter-logo.svg",
  "icon-source-mark",
  "offline.matter.html",
  "generate-amplitude-ui-reference",
  "amplitude-feb-2025",
  "data-login-screen=\"current-auth\"",
]);

export const FORBIDDEN_LEGACY_ASSET_HASHES = new Set([
  "bbcfb3c37d84e78be05dfbed517579dbdf50c69ac669e11b2033bbde9bda9cd3",
  "ba260a37a453bc97f5b00cd3e1c529e87bf17a47ff0cc0b6c73d22ac5c4d7424",
  "61a812d6ee2ff052837ddac0bbb0d2bb13dfdae6666a27d16533127141f97323",
  "09b30f39c4b248e2e1110ca3cb2f454a8b1126cfac129a464cdeee1ea3cdd84c",
  "9953e25bdf6fd28367603b22d5cd65c06481f427f00dce894bbe71d62bd62598",
  "47dc35959a19533be130ac29924418fb1c2ff84175a39c9bf8db7430bbf83ec0",
  "bfb1560b0ed063564edd690acb9dfbab60f4064b97914cc9577d183eb193bf7e",
]);

export const APPROVED_DESKTOP_ASSET_HASHES = Object.freeze({
  brochure_cover: "5ff1776144df2fff44977494ea3eecdcf1f2d5c96dfc30deba3411bf320ee3bf",
  icon_png: "19722c977aa783616b75769a87f4186416d64f2969c4669e9e15303606dd3916",
  icon_icns: "8fff8b262560a05b723bbaed39d56f6c277cae9cea312772cdff20b17ea1ef96",
  icon_ico: "70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075",
  amic_law_logo_accent: "88dfdf3149f0e26ce2d70418bfd24129a2ce47aedfa8756454bf4b7a17452d94",
});

const DEFAULT_PACKAGED_BUILD_ASSETS = Object.freeze({
  "icon.png": APPROVED_DESKTOP_ASSET_HASHES.icon_png,
  "icon.icns": APPROVED_DESKTOP_ASSET_HASHES.icon_icns,
  "icon.ico": APPROVED_DESKTOP_ASSET_HASHES.icon_ico,
  "amic-law-logo-accent.svg": APPROVED_DESKTOP_ASSET_HASHES.amic_law_logo_accent,
});

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function listFiles(targetPath) {
  if (!existsSync(targetPath)) return [];
  if (statSync(targetPath).isFile()) return [targetPath];
  return readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) return listFiles(childPath);
    return entry.isFile() ? [childPath] : [];
  });
}

export function scanLegacyAssetReferences({
  root,
  relativeRoots,
  forbiddenReferences = FORBIDDEN_LEGACY_REFERENCE_TOKENS,
  forbiddenHashes = FORBIDDEN_LEGACY_ASSET_HASHES,
} = {}) {
  if (typeof root !== "string" || !root) throw new Error("scan root is required");
  if (!Array.isArray(relativeRoots) || relativeRoots.length === 0) throw new Error("one or more scan roots are required");
  const files = [...new Set(relativeRoots.flatMap((relativeRoot) => listFiles(path.join(root, relativeRoot))))]
    .sort((left, right) => left.localeCompare(right));
  const violations = [];
  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, "/");
    const bytes = readFileSync(filePath);
    const lowerPath = relativePath.toLowerCase();
    const pathToken = forbiddenReferences.find((token) => lowerPath.includes(token.toLowerCase()));
    if (pathToken) violations.push({ kind: "path_reference", path: relativePath, match: pathToken });
    const content = bytes.toString("utf8").toLowerCase();
    const contentToken = forbiddenReferences.find((token) => content.includes(token.toLowerCase()));
    if (contentToken) violations.push({ kind: "content_reference", path: relativePath, match: contentToken });
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (forbiddenHashes.has(digest)) violations.push({ kind: "legacy_hash", path: relativePath, match: digest });
  }
  return {
    files_scanned: files.length,
    violations,
  };
}

function oneFileByName(files, pattern, label) {
  const matches = files.filter((filePath) => pattern.test(path.basename(filePath)));
  if (matches.length !== 1) throw new Error(`PV-006 bundle rejected: expected one ${label}, found ${matches.length}`);
  return matches[0];
}

export function inspectPackagedRenderer({
  resourcesRoot,
  expectedSourceSha,
  expectedRendererSha256,
  approvedBrochureHash = APPROVED_DESKTOP_ASSET_HASHES.brochure_cover,
  approvedIconHash = APPROVED_DESKTOP_ASSET_HASHES.icon_png,
  approvedBuildAssetHashes = DEFAULT_PACKAGED_BUILD_ASSETS,
} = {}) {
  if (!/^[0-9a-f]{40}$/.test(expectedSourceSha ?? "")) throw new Error("PV-006 bundle rejected: expected source SHA must be full length");
  if (!/^[0-9a-f]{64}$/.test(expectedRendererSha256 ?? "")) throw new Error("PV-006 bundle rejected: expected renderer SHA-256 is required");
  const appRoot = path.join(resourcesRoot, "app");
  const rendererRoot = path.join(appRoot, "src/renderer/web");
  const rendererEntry = path.join(rendererRoot, "index.html");
  const manifestPath = path.join(resourcesRoot, "matter-build-manifest.json");
  if (!existsSync(rendererEntry)) throw new Error("PV-006 bundle rejected: current web renderer entry is missing");
  if (!existsSync(manifestPath)) throw new Error("PV-006 bundle rejected: build manifest is missing");
  let manifest;
  try {
    manifest = validateDesktopBuildManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
  } catch {
    throw new Error("PV-006 bundle rejected: build manifest failed canonical v2 validation");
  }
  if (manifest.source_sha !== expectedSourceSha) throw new Error(`PV-006 bundle rejected: source SHA mismatch (${manifest.source_sha})`);
  if (manifest.source_dirty !== false) throw new Error("PV-006 bundle rejected: source is dirty");
  const rendererDigest = directoryDigest(rendererRoot);
  if (rendererDigest.sha256 !== expectedRendererSha256) throw new Error("PV-006 bundle rejected: renderer SHA mismatch");
  if (manifest.renderer?.sha256 !== rendererDigest.sha256 || manifest.renderer?.file_count !== rendererDigest.file_count) {
    throw new Error("PV-006 bundle rejected: renderer manifest mismatch");
  }

  const rendererFiles = listFiles(path.join(appRoot, "src/renderer"));
  const offlineEntries = rendererFiles.filter((filePath) => /^offline(?:\.matter)?\.html$/i.test(path.basename(filePath)));
  if (offlineEntries.length > 0) throw new Error(`PV-006 bundle rejected: offline entry remains (${offlineEntries.length})`);
  const legacy = scanLegacyAssetReferences({
    root: appRoot,
    relativeRoots: ["src/renderer", "build"],
  });
  if (legacy.violations.length > 0) throw new Error(`PV-006 bundle rejected: legacy asset/reference remains (${legacy.violations.length})`);

  const brochurePath = oneFileByName(rendererFiles, /^brochure-cover-.*\.jpg$/i, "approved brochure cover");
  if (sha256File(brochurePath) !== approvedBrochureHash) throw new Error("PV-006 bundle rejected: approved brochure cover hash mismatch");
  const iconPath = path.join(rendererRoot, "amic-law-icon.png");
  if (!existsSync(iconPath) || sha256File(iconPath) !== approvedIconHash) throw new Error("PV-006 bundle rejected: approved AMIC icon hash mismatch");
  for (const [relativePath, expectedHash] of Object.entries(approvedBuildAssetHashes)) {
    const filePath = path.join(appRoot, "build", relativePath);
    if (!existsSync(filePath) || sha256File(filePath) !== expectedHash) {
      throw new Error(`PV-006 bundle rejected: approved packaged asset mismatch (${relativePath})`);
    }
  }

  return {
    verdict: "PASS",
    source_sha: manifest.source_sha,
    renderer_sha256: rendererDigest.sha256,
    renderer_files: rendererDigest.file_count,
    files_scanned: legacy.files_scanned,
    offline_entry_files: offlineEntries.length,
    legacy_violations: legacy.violations,
    brochure_cover_sha256: approvedBrochureHash,
    icon_sha256: approvedIconHash,
  };
}
