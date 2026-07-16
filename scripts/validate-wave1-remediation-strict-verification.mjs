#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PATHS = Object.freeze({
  workbook: "workbook/wave1-remediation-plan-2026-07-03.md",
  remediation: "artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.md",
  remediationJson: "artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.json",
  matrix: "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md",
  externalReadiness: "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json",
  c09External: "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json",
  b13Popbill: "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json",
  e10Hygiene: "artifacts/manual-qa/upl-e10-wave1-hygiene-proof.json",
});

const REQUIRED_LOCAL_ITEMS = Object.freeze([
  "FIX-A02",
  "FIX-A11/A10",
  "FIX-E04",
  "FIX-D12/D14",
  "FIX-D03",
  "FIX-D04/D06",
  "FIX-D10",
  "FIX-D11",
  "FIX-D13",
  "FIX-C05",
  "FIX-E01/FIX-E02",
  "FIX-E03",
  "FIX-E05",
  "FIX-E06",
  "FIX-E07",
  "FIX-C09",
  "FIX-A06",
  "FIX-V",
]);
const EXPECTED_MATRIX_OPEN_ROWS = Object.freeze({
  "UPL-B-13": "PARTIAL",
  "UPL-C-09": "BLOCKED",
  "UPL-C-10": "PARTIAL",
  "UPL-C-11": "PARTIAL",
  "UPL-C-12": "PARTIAL",
  "UPL-E-04": "PARTIAL",
});
const REQUIRED_ARTIFACT_REFS = Object.freeze([
  "artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.json",
  "artifacts/manual-qa/upl-a11-vault-upload-browser-proof.json",
  "artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json",
  "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json",
  "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json",
  "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json",
]);

function read(path) {
  const absolute = resolve(ROOT, path);
  assert.equal(existsSync(absolute), true, `missing ${path}`);
  return readFileSync(absolute, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function parseMatrixRows(matrix) {
  return matrix
    .split("\n")
    .filter((line) => /^\\| UPL-/.test(line))
    .map((line) => {
      const [, row_id, strict_status, evidence] = line.split("|").map((cell) => cell.trim());
      return { row_id, strict_status, evidence };
    });
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.strict_status] = (acc[row.strict_status] ?? 0) + 1;
    return acc;
  }, {});
}

function assertContains(text, needle, label) {
  assert.ok(text.includes(needle), `${label} missing ${needle}`);
}

const workbook = read(PATHS.workbook);
const remediation = read(PATHS.remediation);
const remediationJson = readJson(PATHS.remediationJson);
const matrix = read(PATHS.matrix);
const externalReadiness = readJson(PATHS.externalReadiness);
const c09External = readJson(PATHS.c09External);
const b13PopbillText = read(PATHS.b13Popbill);
const b13Popbill = JSON.parse(b13PopbillText);
const e10Hygiene = readJson(PATHS.e10Hygiene);

assert.match(remediation, /^Verdict: PARTIAL\./m);
assert.equal(remediationJson.schema_version, "lawos.wave1.remediation-strict-verification.v1");
assert.equal(remediationJson.verdict, "PARTIAL_EXTERNAL_BLOCKED");
assert.equal(remediationJson.strict_completion_claim, false);
assert.equal(remediationJson.production_ready_claim, false);
assert.equal(remediationJson.public_release_claim, false);
assertContains(remediation, "does not claim Wave-1 70/70 PASS", PATHS.remediation);
assertContains(remediation, "No public release, go-live, or 70/70 strict PASS claim", PATHS.remediation);
assertContains(workbook, "Wave-1 70/70 PASS 또는 전체 remediation 완료로 주장하지 않는다", PATHS.workbook);
assertContains(workbook, "public release/go-live receipt는 이 실행에서 생성하지 않았다", PATHS.workbook);

for (const item of REQUIRED_LOCAL_ITEMS) {
  assertContains(remediation, item, PATHS.remediation);
  assertContains(workbook, item, PATHS.workbook);
}
for (const artifactRef of REQUIRED_ARTIFACT_REFS) {
  assert.equal(existsSync(resolve(ROOT, artifactRef)), true, `missing referenced artifact ${artifactRef}`);
  assertContains(remediation, artifactRef, PATHS.remediation);
}

const rows = parseMatrixRows(matrix);
const counts = statusCounts(rows);
assert.equal(rows.length, 70, "strict matrix must preserve 70 rows");
assert.equal(counts.PASS, 64);
assert.equal(counts.PARTIAL, 5);
assert.equal(counts.BLOCKED, 1);
assert.equal(counts.FAIL ?? 0, 0);
assert.equal(remediationJson.matrix_snapshot.total, 70);
assert.deepEqual(remediationJson.matrix_snapshot.counts, { PASS: 64, PARTIAL: 5, BLOCKED: 1 });
assert.deepEqual(remediationJson.matrix_snapshot.open_rows, EXPECTED_MATRIX_OPEN_ROWS);
for (const [rowId, status] of Object.entries(EXPECTED_MATRIX_OPEN_ROWS)) {
  assert.equal(rows.find((row) => row.row_id === rowId)?.strict_status, status, `${rowId} strict status mismatch`);
}
assert.equal(
  rows.filter((row) => row.strict_status !== "PASS").length,
  Object.keys(EXPECTED_MATRIX_OPEN_ROWS).length,
  "unexpected open rows in matrix",
);

assert.equal(externalReadiness.schema_version, "lawos.wave1.external-receipt-readiness.v1");
assert.equal(externalReadiness.status, "PASS_EXTERNAL_RECEIPT_READINESS_LEDGER");
assert.equal(externalReadiness.strict_completion_claim, false);
assert.equal(externalReadiness.production_ready_claim, false);
assert.deepEqual(externalReadiness.inherited_partial_rows, ["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]);
const readinessRows = Object.fromEntries(externalReadiness.external_blocker_rows.map((row) => [row.row_id, row]));
assert.equal(readinessRows["UPL-C-09"].external_receipt_present, false);
assert.equal(readinessRows["UPL-C-09"].strict_pass_claim, false);
assert.equal(readinessRows["UPL-B-13"].external_receipt_present, false);
assert.equal(readinessRows["UPL-B-13"].strict_pass_claim, false);
assert.equal(remediationJson.external_blockers.find((row) => row.row_id === "UPL-C-09")?.strict_pass_claim, false);
assert.equal(remediationJson.external_blockers.find((row) => row.row_id === "UPL-B-13")?.strict_pass_claim, false);

assert.equal(c09External.status, "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT");
assert.equal(c09External.external_receipt_present, false);
assert.equal(c09External.strict_pass_claim, false);
assert.equal(c09External.external_runtime.provider_runtime_executed, false);
assert.equal(c09External.safety.token_or_secret_material_written, false);
assert.equal(c09External.safety.body_or_attachment_material_written, false);

assert.equal(b13Popbill.status, "READY_NEEDS_SANDBOX_ISSUE_APPROVAL");
assert.equal(b13Popbill.strict_boundary.external_vendor_sandbox_roundtrip, false);
assert.equal(b13Popbill.strict_boundary.strict_pass_claim, false);
assert.equal(b13Popbill.strict_boundary.production_tax_invoice_issued, false);
assert.equal(Object.hasOwn(b13Popbill, "popbill_probe_results"), false);
assert.equal(b13Popbill.blocker && Object.hasOwn(b13Popbill.blocker, "issue_error"), false);
assert.equal(/Bearer\\s+[A-Za-z0-9._~+/-]{12,}|sk-(?:ant|proj|live|test)?-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}/i.test(b13PopbillText), false);

assert.equal(e10Hygiene?.sloplint?.strong_findings ?? 0, 0);
assert.equal(e10Hygiene?.sloplint?.no_verify_findings ?? 0, 0);
assert.equal(remediationJson.hygiene.sloplint_strong_findings, 0);
assert.equal(remediationJson.hygiene.sloplint_no_verify_findings, 0);
assert.ok(remediationJson.checks.every((check) => check.passed === true), "all remediation JSON checks must pass");

for (const forbidden of [
  "70/70 PASS까지 닫았다",
  "70/70 완료",
  "public release 완료",
  "go-live 완료",
  "production tax invoice issued",
]) {
  assert.equal(workbook.includes(forbidden), false, `workbook has forbidden completion claim: ${forbidden}`);
  assert.equal(remediation.includes(forbidden), false, `remediation has forbidden completion claim: ${forbidden}`);
}

console.log("Wave-1 remediation strict verification validator PASS");
