#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/validate-rc005-port-crosswalk.mjs");
  console.log("Validates all 31 RC-004 PORT_REQUIRED paths against current Forest implementation and test anchors.");
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(`Unknown argument: ${process.argv[2]}`);
  process.exit(2);
}

const root = process.cwd();
const groupPath = "workbook/forest-v0.1.17-integration-evidence/RC-004/port-groups.json";
const groups = JSON.parse(readFileSync(resolve(root, groupPath), "utf8"));

const replacements = Object.freeze({
  "packages/hrx/src/migrations/011_hrx_payroll_items.sql": [
    "packages/hrx/src/migrations/026_hrx_payroll_catalog_assignments.sql",
  ],
  "packages/hrx/src/migrations/012_hrx_payroll_profiles.sql": [
    "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
    "packages/hrx/src/migrations/023_hrx_payroll_profile_units.sql",
    "packages/hrx/src/migrations/026_hrx_payroll_catalog_assignments.sql",
  ],
  "packages/hrx/src/migrations/013_hrx_payroll_time_inputs.sql": [
    "packages/hrx/src/migrations/027_hrx_attendance_approval_receipts.sql",
    "packages/hrx/src/payroll/input-snapshot-service.js",
  ],
  "packages/hrx/src/migrations/015_hrx_leave_accrual_rule_versions.sql": [
    "packages/hrx/src/migrations/028_hrx_leave_accrual_rule_versions.sql",
    "packages/hrx/src/migrations/029_hrx_leave_accrual_rule_version_index.sql",
  ],
  "packages/hrx/src/leave/manual-adjustment-file.js": [
    "packages/hrx/src/leave/accrual-service.js",
    "packages/hrx/src/leave/occurrence-upload-batch-service.js",
    "packages/hrx/src/leave/xlsx-export.js",
  ],
});

const probes = Object.freeze({
  RUNTIME_AUTHZ_UNION: [
    ["apps/api/src/routes/hrx/route-policy-map.js", /hrx\.payroll\.items\.read/],
    ["apps/api/src/routes/hrx/route-policy-map.js", /hrx\.payroll\.profiles\.write/],
    ["apps/api/src/routes/hrx/route-policy-map.js", /hrx\.payroll\.attendance\.approve/],
    ["apps/api/src/hrx-payroll-runtime.js", /itemCatalog, profileService, timeInputService/],
    ["apps/api/src/hrx-role-scope-matrix.js", /hrx\.payroll\.profiles\.read/],
    ["packages/authz/src/hrx-sensitive-scopes.js", /hrx\.payroll\.profiles\.write/],
  ],
  LEAVE_RULE_LEDGER: [
    ["packages/hrx/src/leave/accrual-service.js", /function updateRule/],
    ["packages/hrx/src/leave/accrual-service.js", /function deactivateRule/],
    ["packages/hrx/src/leave/accrual-service.js", /tenure_steps must be ordered, non-overlapping ranges through 120 months/],
    ["packages/hrx/src/migrations/028_hrx_leave_accrual_rule_versions.sql", /supersedes_rule_id/],
    ["packages/hrx/src/migrations/029_hrx_leave_accrual_rule_version_index.sql", /logical_rule_code, version/],
  ],
  LEAVE_FILE_IMPORT: [
    ["packages/hrx/src/leave/accrual-service.js", /parseLeaveManualAdjustmentXlsx/],
    ["packages/hrx/src/leave/occurrence-upload-batch-service.js", /xlsx_content_base64/],
    ["packages/hrx/src/leave/xlsx-export.js", /XLSX formula cells are not allowed/],
    ["packages/hrx/src/leave/xlsx-export.js", /MAX_XLSX_COMPRESSION_RATIO/],
    ["apps/web/src/people/leave/LeaveAccrualManualPage.tsx", /XLSX 양식/],
  ],
  LEAVE_COMPACT_ACTIONS: [
    ["apps/web/test/ui-regression.test.mjs", /현재 Matter의 연결 상태를 확인합니다[\s\S]*meta=\"이중 승인\"/],
    ["apps/web/src/people/leave/LeaveApprovalQueue.tsx", /className=\"leave-approval-row\"/],
    ["apps/web/src/people/leave/LeaveTerminationPage.tsx", /className=\"leave-termination-controls\"/],
  ],
  PROFILE_HARDENING: [
    ["apps/web/src/people/memberPhotos.js", /imageSignatureMatches/],
    ["apps/web/src/people/memberPhotos.js", /PROFILE_PHOTO_DATA_URL/],
    ["scripts/build-matter-desktop-mac.mjs", /private_hrx_roster_source_excluded/],
    ["scripts/validate-public-renderer-no-hrx-roster-pii.mjs", /protected_values_printed/],
  ],
  PAYROLL_CATALOG_ASSIGNMENT_TIME: [
    ["packages/hrx/src/migrations/026_hrx_payroll_catalog_assignments.sql", /hrx_payroll_item_assignments is append-only/],
    ["packages/hrx/src/migrations/027_hrx_attendance_approval_receipts.sql", /hrx_attendance_approval_receipts is append-only/],
    ["packages/hrx/src/payroll/input-snapshot-service.js", /hrx_attendance_approval_receipts/],
    ["apps/api/src/routes/hrx/payroll-runtime.js", /runtime\.itemCatalog\.create/],
    ["apps/api/src/routes/hrx/payroll-runtime.js", /runtime\.profileService\.createAssignment/],
  ],
});

const forbidden = Object.freeze([
  ["apps/web/src/people/leave/LeaveApprovalQueue.tsx", /meta=\"이중 승인\"/],
  ["apps/web/src/people/leave/LeaveTerminationPage.tsx", /meta=\"이중 승인\"/],
  ["packages/hrx/src/migrations/index.js", /011_hrx_payroll_items|012_hrx_payroll_profiles|013_hrx_payroll_time_inputs|015_hrx_leave_accrual_rule_versions/],
]);

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function requirePath(relativePath, errors) {
  if (!existsSync(resolve(root, relativePath))) errors.push(`${relativePath}: missing`);
}

const errors = [];
const seen = new Set();
const rows = [];

if (groups.length !== 6) errors.push(`expected 6 port groups, found ${groups.length}`);
for (const group of groups) {
  if (!probes[group.id]) errors.push(`${group.id}: missing implementation probes`);
  for (const anchor of [...group.destination_anchors, ...group.test_anchors]) requirePath(anchor, errors);
  for (const sourcePath of group.selected_sources) {
    if (seen.has(sourcePath)) errors.push(`${sourcePath}: assigned to multiple groups`);
    seen.add(sourcePath);
    const sourcePresent = existsSync(resolve(root, sourcePath));
    const implementationAnchors = sourcePresent ? [sourcePath] : replacements[sourcePath];
    if (!implementationAnchors) errors.push(`${sourcePath}: absent without an approved canonical replacement`);
    for (const anchor of implementationAnchors ?? []) requirePath(anchor, errors);
    rows.push({
      source_path: sourcePath,
      group_id: group.id,
      treatment: sourcePresent ? "SELECTIVE_PORT_IN_PLACE" : "CANONICAL_REPLACEMENT",
      implementation_anchors: implementationAnchors ?? [],
      destination_anchors: group.destination_anchors,
      test_anchors: group.test_anchors,
    });
  }
  for (const [relativePath, pattern] of probes[group.id] ?? []) {
    requirePath(relativePath, errors);
    if (existsSync(resolve(root, relativePath)) && !pattern.test(read(relativePath))) {
      errors.push(`${group.id}: ${relativePath} does not satisfy ${pattern}`);
    }
  }
}

for (const [relativePath, pattern] of forbidden) {
  requirePath(relativePath, errors);
  if (existsSync(resolve(root, relativePath)) && pattern.test(read(relativePath))) {
    errors.push(`${relativePath}: forbidden regression ${pattern}`);
  }
}

if (seen.size !== 31) errors.push(`expected 31 unique PORT_REQUIRED paths, found ${seen.size}`);
const canonicalReplacementCount = rows.filter((row) => row.treatment === "CANONICAL_REPLACEMENT").length;
if (canonicalReplacementCount !== 5) errors.push(`expected 5 canonical replacements, found ${canonicalReplacementCount}`);

const canonical = JSON.stringify(rows);
const receipt = {
  tuw: "RC-005-G",
  verdict: errors.length === 0 ? "PASS" : "FAIL",
  entry_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  port_group_count: groups.length,
  port_required_count: rows.length,
  unique_source_count: seen.size,
  selective_port_in_place_count: rows.length - canonicalReplacementCount,
  canonical_replacement_count: canonicalReplacementCount,
  unimplemented_count: errors.length,
  crosswalk_sha256: createHash("sha256").update(canonical).digest("hex"),
  rows,
  errors,
};

console.log(JSON.stringify(receipt, null, 2));
if (errors.length) process.exit(1);
