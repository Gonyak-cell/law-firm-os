#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const configuredRosterPath = String(process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH ?? "").trim();
const rosterPath = path.resolve(
  ROOT,
  configuredRosterPath || "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
);
const rendererRoots = [
  path.join(ROOT, "apps/web/dist"),
  path.join(ROOT, "apps/desktop/src/renderer/web"),
].filter(existsSync);
const scannedExtensions = new Set([".css", ".html", ".js", ".json", ".map"]);
const configuredPhotoSourcePath = String(process.env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH ?? "").trim();
const photoSourcePath = path.resolve(ROOT, configuredPhotoSourcePath || "apps/api/src/hrx-member-photos");

assert(existsSync(rosterPath), "HRX roster source is required for value-based public-renderer PII validation");
assert(rendererRoots.length > 0, "At least one built renderer is required for PII validation");
assert(existsSync(photoSourcePath), "HRX member photo source is required for public-renderer PII validation");

const roster = JSON.parse(readFileSync(rosterPath, "utf8"));
const members = Array.isArray(roster.members) ? roster.members : [];
const protectedKeys = ["display_name", "legal_name", "work_email", "employee_id", "user_id", "manager_employee_id"];
const protectedValues = [...new Set(
  members.flatMap((member) => protectedKeys.map((key) => String(member?.[key] ?? "").trim())).filter((value) => value.length >= 4),
)];
assert(protectedValues.length > 0, "HRX roster PII validator requires at least one protected value");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(absolutePath);
    return entry.isFile() ? [absolutePath] : [];
  });
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const protectedPhotoHashes = new Set(
  filesUnder(photoSourcePath)
    .filter((filePath) => path.extname(filePath).toLowerCase() === ".png")
    .map(sha256),
);
assert(protectedPhotoHashes.size > 0, "HRX member photo validator requires at least one protected image");

const findings = [];
let scannedFiles = 0;
for (const rendererRoot of rendererRoots) {
  for (const filePath of filesUnder(rendererRoot)) {
    scannedFiles += 1;
    if (scannedExtensions.has(path.extname(filePath).toLowerCase())) {
      const source = readFileSync(filePath, "utf8");
      const matchCount = protectedValues.reduce((count, value) => count + (source.includes(value) ? 1 : 0), 0);
      if (matchCount > 0) findings.push({ file: path.relative(ROOT, filePath), protected_value_match_count: matchCount });
    }
    if (protectedPhotoHashes.has(sha256(filePath))) {
      findings.push({ file: path.relative(ROOT, filePath), protected_photo_match_count: 1 });
    }
  }
}

assert.deepEqual(findings, [], `HRX roster PII detected in public renderer files: ${JSON.stringify(findings)}`);
console.log(JSON.stringify({ verdict: "PASS", renderer_root_count: rendererRoots.length, scanned_files: scannedFiles, protected_value_count: protectedValues.length, protected_photo_count: protectedPhotoHashes.size, protected_values_printed: false }, null, 2));
