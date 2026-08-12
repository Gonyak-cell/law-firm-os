#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const AUDITED_DESKTOP_SOURCE_ROOTS = [
  "apps/desktop/src/main",
  "apps/desktop/src/preload",
  "apps/desktop/src/shared",
];
const AUDITED_DESKTOP_SOURCE_MANIFEST_SHA256 = "b25287c1ae520d5b93b149b3c59d841877d21bef8c46b63ca1bef29453e9162e";

function listFiles(dir) {
  const directoryStat = lstatSync(dir);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error(`desktop execution source root must be a real directory: ${dir}`);
  }
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(filePath));
    } else if (entry.isFile()) {
      files.push(filePath);
    } else {
      throw new Error(`desktop execution source must be a regular file: ${filePath}`);
    }
  }
  return files.sort();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceFindings(filePath, source) {
  const findings = [];
  const checks = [
    ["directory_watch", /\b(?:fs\.)?(?:watch|watchFile)\s*\(|chokidar|createWatcher/],
    ["recursive_scan", /\b(?:(?:fs\.)?(?:readdir|readdirSync|opendir|opendirSync)|glob)\s*\(|fast-glob/],
    ["renderer_file_bytes", /\b(?:request|payload|params|input)\.(?:bytes|fileBytes|documentBytes|content|blob|arrayBuffer)\b/],
    ["path_retention", /\b(?:localStorage|sessionStorage|indexedDB|JSON\.stringify|writeFile|writeFileSync|appendFile|appendFileSync)\b.*(?:\bpath\b|filePath|absolutePath)/i],
    ["path_retention", /selectedHandles\.set\([^\n]*(?:\bpath\b|filePath|absolutePath)/],
  ];
  for (const [lineNumber, line] of source.split("\n").entries()) {
    for (const [code, pattern] of checks.slice(0, 4)) {
      if (pattern.test(line)) findings.push(`${filePath}:${lineNumber + 1}:${code}`);
    }
  }
  for (const [code, pattern] of checks.slice(4)) {
    if (pattern.test(source)) findings.push(`${filePath}:source:${code}`);
  }
  return findings;
}

const desktopSources = AUDITED_DESKTOP_SOURCE_ROOTS.flatMap(listFiles)
  .sort()
  .map((filePath) => {
    const bytes = readFileSync(filePath);
    return { filePath, bytes, source: bytes.toString("utf8") };
  });
assert.ok(desktopSources.some(({ filePath }) => filePath === "apps/desktop/src/preload/session.cjs"), "active CommonJS preload was not scanned");
const findings = [];

for (const { filePath, source } of desktopSources) {
  findings.push(...sourceFindings(filePath, source));
}
const sourceManifest = desktopSources.map(({ filePath, bytes }) => `${sha256(bytes)}  ${filePath}\n`).join("");
assert.equal(
  sha256(sourceManifest),
  AUDITED_DESKTOP_SOURCE_MANIFEST_SHA256,
  "desktop main/preload/shared source manifest changed; explicit filesystem-boundary review required",
);

const probes = {
  directory_watch: sourceFindings("probe-directory-watch.js", "fs.watch('/Users/example', () => {})"),
  recursive_scan: sourceFindings("probe-recursive-scan.js", "readdirSync('/Users/example')\nopendir('/Users/example')\nglob('**/*')"),
  renderer_file_bytes: sourceFindings("probe-renderer-file-bytes.js", "writer.write({ bytes: request.bytes })"),
  path_retention: sourceFindings("probe-path-retention.js", "localStorage.setItem('lastPath', filePath); selectedHandles.set(id, { filePath })"),
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
  policy: "any new, removed, renamed, or changed main/preload/shared source requires explicit filesystem-boundary review",
  probes: Object.fromEntries(Object.keys(probes).map((code) => [code, "detected"])),
}, null, 2));
