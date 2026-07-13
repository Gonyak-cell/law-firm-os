#!/usr/bin/env node
import assert from "node:assert/strict";
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

assert(existsSync(rosterPath), "HRX roster source is required for value-based public-renderer PII validation");
assert(rendererRoots.length > 0, "At least one built renderer is required for PII validation");

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
    return entry.isFile() && scannedExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

const findings = [];
let scannedFiles = 0;
for (const rendererRoot of rendererRoots) {
  for (const filePath of filesUnder(rendererRoot)) {
    scannedFiles += 1;
    const source = readFileSync(filePath, "utf8");
    const matchCount = protectedValues.reduce((count, value) => count + (source.includes(value) ? 1 : 0), 0);
    if (matchCount > 0) findings.push({ file: path.relative(ROOT, filePath), protected_value_match_count: matchCount });
  }
}

assert.deepEqual(findings, [], `HRX roster PII detected in public renderer files: ${JSON.stringify(findings)}`);
console.log(JSON.stringify({ verdict: "PASS", renderer_root_count: rendererRoots.length, scanned_files: scannedFiles, protected_value_count: protectedValues.length, protected_values_printed: false }, null, 2));
