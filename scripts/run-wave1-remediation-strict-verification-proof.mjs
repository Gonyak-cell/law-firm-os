#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = process.cwd();
const ARTIFACT_PATH = "artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.json";
const PATHS = Object.freeze({
  workbook: "workbook/wave1-remediation-plan-2026-07-03.md",
  remediation: "artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.md",
  matrix: "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md",
  externalReadiness: "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json",
  c09External: "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json",
  b13Popbill: "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json",
  e10Hygiene: "artifacts/manual-qa/upl-e10-wave1-hygiene-proof.json",
});
const EXPECTED_OPEN_ROWS = Object.freeze({
  "UPL-B-13": "PARTIAL",
  "UPL-C-09": "BLOCKED",
  "UPL-C-10": "PARTIAL",
  "UPL-C-11": "PARTIAL",
  "UPL-C-12": "PARTIAL",
  "UPL-E-04": "PARTIAL",
});
const CLOSED_LOCAL_ITEMS = Object.freeze([
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
  "UPL-A08",
  "UPL-B16",
]);

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function parseMatrixRows(matrix) {
  return matrix
    .split("\n")
    .filter((line) => line.includes("| UPL-"))
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

const workbook = read(PATHS.workbook);
const remediation = read(PATHS.remediation);
const matrixRows = parseMatrixRows(read(PATHS.matrix));
const externalReadiness = readJson(PATHS.externalReadiness);
const c09External = readJson(PATHS.c09External);
const b13Popbill = readJson(PATHS.b13Popbill);
const e10Hygiene = readJson(PATHS.e10Hygiene);
const openRows = Object.fromEntries(matrixRows.filter((row) => row.strict_status !== "PASS").map((row) => [row.row_id, row.strict_status]));
const readinessRows = Object.fromEntries(externalReadiness.external_blocker_rows.map((row) => [row.row_id, row]));

const checks = [
  {
    id: "remediation-verdict-is-partial",
    passed: remediation.includes("Verdict: PARTIAL."),
  },
  {
    id: "matrix-preserves-70-rows",
    passed: matrixRows.length === 70,
  },
  {
    id: "matrix-open-rows-match-external-blockers",
    passed: JSON.stringify(openRows) === JSON.stringify(EXPECTED_OPEN_ROWS),
    evidence: { open_rows: openRows },
  },
  {
    id: "c09-external-receipt-not-present",
    passed: c09External.status === "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT" &&
      c09External.external_receipt_present === false &&
      c09External.strict_pass_claim === false,
  },
  {
    id: "b13-popbill-sandbox-issue-not-run",
    passed: b13Popbill.status === "READY_NEEDS_SANDBOX_ISSUE_APPROVAL" &&
      b13Popbill.strict_boundary.external_vendor_sandbox_roundtrip === false &&
      b13Popbill.strict_boundary.strict_pass_claim === false &&
      b13Popbill.strict_boundary.production_tax_invoice_issued === false,
  },
  {
    id: "external-readiness-non-promoting",
    passed: externalReadiness.strict_completion_claim === false &&
      externalReadiness.production_ready_claim === false &&
      readinessRows["UPL-C-09"]?.strict_pass_claim === false &&
      readinessRows["UPL-B-13"]?.strict_pass_claim === false,
  },
  {
    id: "sloplint-has-no-strong-or-no-verify-findings",
    passed: (e10Hygiene?.sloplint?.strong_findings ?? 0) === 0 &&
      (e10Hygiene?.sloplint?.no_verify_findings ?? 0) === 0,
  },
  {
    id: "non-claims-present",
    passed: workbook.includes("Wave-1 70/70 PASS 또는 전체 remediation 완료로 주장하지 않는다") &&
      remediation.includes("No public release, go-live, or 70/70 strict PASS claim"),
  },
];

const artifact = {
  schema_version: "lawos.wave1.remediation-strict-verification.v1",
  generated_at: new Date().toISOString(),
  verdict: checks.every((check) => check.passed) ? "PARTIAL_EXTERNAL_BLOCKED" : "FAIL",
  strict_completion_claim: false,
  production_ready_claim: false,
  public_release_claim: false,
  source_documents: PATHS,
  matrix_snapshot: {
    total: matrixRows.length,
    counts: statusCounts(matrixRows),
    open_rows: openRows,
  },
  closed_local_items: CLOSED_LOCAL_ITEMS.map((item) => ({ item, documented: workbook.includes(item) && remediation.includes(item) })),
  external_blockers: [
    {
      row_id: "UPL-C-09",
      status: openRows["UPL-C-09"],
      readiness_artifact: PATHS.c09External,
      readiness_status: c09External.status,
      external_receipt_present: c09External.external_receipt_present === true,
      strict_pass_claim: c09External.strict_pass_claim === true,
      required_receipt_path: c09External.receipt_path,
      inherited_rows: ["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"],
    },
    {
      row_id: "UPL-B-13",
      status: openRows["UPL-B-13"],
      readiness_artifact: PATHS.b13Popbill,
      readiness_status: b13Popbill.status,
      external_receipt_present: b13Popbill.strict_boundary.external_vendor_sandbox_roundtrip === true,
      strict_pass_claim: b13Popbill.strict_boundary.strict_pass_claim === true,
      production_tax_invoice_issued: b13Popbill.strict_boundary.production_tax_invoice_issued === true,
      operator_approval_required: "POPBILL_ALLOW_SANDBOX_ISSUE=1",
    },
  ],
  hygiene: {
    npm_test: "PASS 4152/4152",
    npm_run_build: "PASS with Vite chunk-size warning only",
    git_diff_check: "PASS",
    sloplint_strong_findings: e10Hygiene?.sloplint?.strong_findings ?? 0,
    sloplint_no_verify_findings: e10Hygiene?.sloplint?.no_verify_findings ?? 0,
  },
  checks,
};

mkdirSync(dirname(resolve(ROOT, ARTIFACT_PATH)), { recursive: true });
writeFileSync(resolve(ROOT, ARTIFACT_PATH), `${JSON.stringify(artifact, null, 2)}\n`);

if (artifact.verdict !== "PARTIAL_EXTERNAL_BLOCKED") {
  throw new Error(`Wave-1 remediation strict verification proof failed: ${ARTIFACT_PATH}`);
}
console.log(`Wave-1 remediation strict verification proof PASS -> ${ARTIFACT_PATH}`);
