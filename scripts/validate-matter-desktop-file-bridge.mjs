#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

const AUDITED_DESKTOP_SOURCE_ROOTS = [
  "apps/desktop/src/main",
  "apps/desktop/src/preload",
  "apps/desktop/src/shared"
];
const AUDITED_DESKTOP_SOURCE_MANIFEST_SHA256 = "36703aba9090eea7bfa3d116797b5a92c8a5c0ee241ab0cabc27fd5d84508268";

function listFiles(dir) {
  const directoryStat = lstatSync(dir);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error(`desktop execution source root must be a real directory: ${dir}`);
  }
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
    else throw new Error(`desktop execution source must be a regular file: ${filePath}`);
  }
  return files.sort();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceFindings(filePath, source) {
  const findings = [];
  const lineChecks = [
    ["directory_watch", /\b(?:fs\.)?(?:watch|watchFile)\s*\(|chokidar|createWatcher/],
    ["recursive_scan", /\b(?:(?:fs\.)?(?:readdir|readdirSync|opendir|opendirSync)|glob)\s*\(|fast-glob/],
    ["renderer_file_bytes", /\b(?:request|payload|params|input)\.(?:bytes|fileBytes|documentBytes|content|blob|arrayBuffer)\b/],
    ["persistent_path_storage", /\b(?:localStorage|sessionStorage|indexedDB|writeFile|writeFileSync|appendFile|appendFileSync)\b.*(?:\bpath\b|filePath|absolutePath)/i],
    ["path_logging", /\bconsole\.(?:log|info|warn|error|debug)\b.*(?:filePath|absolutePath)/i],
    ["renderer_raw_path", /pathVisibleToRenderer\s*:\s*true/]
  ];
  for (const [lineNumber, line] of source.split("\n").entries()) {
    for (const [code, pattern] of lineChecks) {
      if (pattern.test(line)) findings.push(`${filePath}:${lineNumber + 1}:${code}`);
    }
  }
  return findings;
}

const desktopSources = AUDITED_DESKTOP_SOURCE_ROOTS.flatMap((sourceRoot) => listFiles(join(REPO_ROOT, sourceRoot)))
  .sort()
  .map((absolutePath) => {
    const filePath = relative(REPO_ROOT, absolutePath).split(sep).join("/");
    const bytes = readFileSync(absolutePath);
    return { filePath, bytes, source: bytes.toString("utf8") };
  });
const sourceByPath = new Map(desktopSources.map((entry) => [entry.filePath, entry.source]));
const activePreload = sourceByPath.get("apps/desktop/src/preload/session.cjs") ?? "";
const bridgePreload = sourceByPath.get("apps/desktop/src/preload/fileBridge.js") ?? "";
const bridgeMain = sourceByPath.get("apps/desktop/src/main/fileBridge.js") ?? "";
const desktopMain = sourceByPath.get("apps/desktop/src/main/main.js") ?? "";
const authMain = sourceByPath.get("apps/desktop/src/main/auth.js") ?? "";
const tempPreviewMain = sourceByPath.get("apps/desktop/src/main/tempPreview.js") ?? "";

assert.ok(activePreload, "active CommonJS preload was not scanned");
assert.match(activePreload, /contextBridge\.exposeInMainWorld\("amicFileBridge"/);
assert.match(activePreload, /navigator\?\.userActivation\?\.isActive !== true/);
assert.match(activePreload, /openDocumentPreview: "fileBridge:open-document-preview"/);
assert.match(activePreload, /resumePendingUploads: "fileBridge:resume-pending-uploads"/);
assert.doesNotMatch(activePreload, /materFileBridge/);
assert.match(bridgePreload, /contextBridge\.exposeInMainWorld\("amicFileBridge"/);
assert.match(bridgePreload, /openDocumentPreview/);
assert.match(bridgePreload, /resumePendingUploads/);
assert.doesNotMatch(bridgePreload, /tenantId|actorId|idempotencyKey|filePath|absolutePath/);
assert.match(desktopMain, /registerFileBridgeIpcHandlers/);
assert.match(desktopMain, /fileBridgeExposed: true/);
assert.match(desktopMain, /createFileSystemTempPreviewStorage\(\{ basePath: app\.getPath\("temp"\) \}\)/);
assert.match(desktopMain, /cacheStores: \[tempPreviewManager, internalUpdateRuntime\]/);
assert.match(bridgeMain, /FILE_BRIDGE_HANDLE_TTL_MS = 5 \* 60 \* 1000/);
assert.match(bridgeMain, /const selectedHandles = new Map\(\)/);
assert.match(bridgeMain, /setExpiringEntry\(selectedHandles/);
assert.match(bridgeMain, /clearMapEntry\(selectedHandles/);
assert.match(bridgeMain, /ownerForIpcEvent/);
assert.match(bridgeMain, /isTrustedSender/);
assert.match(bridgeMain, /openedFile\.stat\(\)/);
assert.match(bridgeMain, /openDocumentPreview/);
assert.match(bridgeMain, /resumePendingUploads/);
assert.match(bridgeMain, /DOCUMENT_PROVIDER_HASH_MISMATCH/);
assert.match(bridgeMain, /dispose\(\)/);
assert.doesNotMatch(bridgeMain, /Math\.random/);
assert.match(tempPreviewMain, /TEMP_PREVIEW_DIRECTORY = "amic-os-vault-preview-cache"/);
assert.match(tempPreviewMain, /DEFAULT_TEMP_PREVIEW_TTL_MS = 5 \* 60 \* 1000/);
assert.match(tempPreviewMain, /openImpl\(nativePath, "wx", 0o600\)/);
assert.match(tempPreviewMain, /mkdirImpl\(rootPath, \{ recursive: false, mode: 0o700 \}\)/);
assert.match(tempPreviewMain, /pathVisibleToRenderer: false/);
assert.match(tempPreviewMain, /handleLogout\(\)/);
assert.match(tempPreviewMain, /handleTenantSwitch\(\)/);
assert.match(tempPreviewMain, /handleAppQuit\(\)/);
assert.match(authMain, /local_session_cleanup_failed/);
assert.match(authMain, /law-firm-os\.desktop-vault-upload-pending\.v1/);
assert.match(authMain, /raw_path_included: false/);
assert.match(authMain, /raw_bytes_included: false/);
assert.match(authMain, /filename_included: false/);

const findings = desktopSources.flatMap(({ filePath, source }) => sourceFindings(filePath, source));
const sourceManifest = desktopSources.map(({ filePath, bytes }) => `${sha256(bytes)}  ${filePath}\n`).join("");
assert.equal(
  sha256(sourceManifest),
  AUDITED_DESKTOP_SOURCE_MANIFEST_SHA256,
  "desktop main/preload/shared source manifest changed; explicit filesystem-boundary review required"
);

const probes = {
  directory_watch: sourceFindings("probe-directory-watch.js", "fs.watch('/Users/example', () => {})"),
  recursive_scan: sourceFindings("probe-recursive-scan.js", "readdirSync('/Users/example')\nopendir('/Users/example')\nglob('**/*')"),
  renderer_file_bytes: sourceFindings("probe-renderer-file-bytes.js", "writer.write({ bytes: request.bytes })"),
  persistent_path_storage: sourceFindings("probe-path-retention.js", "localStorage.setItem('lastPath', filePath)"),
  path_logging: sourceFindings("probe-path-logging.js", "console.log(filePath)"),
  renderer_raw_path: sourceFindings("probe-renderer-path.js", "return { pathVisibleToRenderer: true }")
};
for (const [code, probeFindings] of Object.entries(probes)) {
  assert.ok(probeFindings.some((finding) => finding.endsWith(`:${code}`)), `${code} probe was not detected`);
}
assert.deepEqual(findings, [], "desktop file bridge forbidden filesystem findings present");

console.log(JSON.stringify({
  verdict: "PASS",
  checked_files: desktopSources.length,
  audited_desktop_sources: desktopSources.length,
  audited_source_manifest_sha256: AUDITED_DESKTOP_SOURCE_MANIFEST_SHA256,
  findings,
  path_policy: "bounded-main-process-memory-plus-protected-temp",
  active_preload_api: "amicFileBridge",
  policy: "any new, removed, renamed, or changed main/preload/shared source requires explicit filesystem-boundary review",
  probes: Object.fromEntries(Object.keys(probes).map((code) => [code, "detected"]))
}, null, 2));
