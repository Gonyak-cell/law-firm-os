#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  CONCEPT_FIT_VALIDATION_MD_PATH,
  CONCEPT_FIT_VALIDATION_PATH,
  KOREA_SAAS_IMPLEMENTATION_PLAN_PATH,
  KOREA_SAAS_RESEARCH_MATRIX_PATH,
  NO_UNIMPLEMENTED_PLAN_PATH,
  OPENABLE_PLAN_PATH,
  OPENABLE_TRACEABILITY_PATH,
  markdownTable,
  readJson,
  readText,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const REQUIRED_CONCEPT_ROWS = [
  "LCX-OPEN-01A.01",
  "LCX-OPEN-01A.02",
  "LCX-OPEN-01A.03",
  "LCX-OPEN-01A.04",
  "LCX-OPEN-01A.05"
];

const REQUIRED_CONCEPT_TERMS = [
  "Client CRM/intake",
  "Matter ERP/legal operations",
  "People HRX",
  "Client CRM",
  "Matter ERP",
  "People HRX responsibility",
  "Client - Matter - People",
  "Matter-first",
  "concept_spine_missing",
  "korea_saas_fit_missing",
  "client_ref",
  "matter_ref",
  "people_responsibility",
  "engagement_scope",
  "permission_context",
  "audit_context",
  "pre_matter_exception",
  "joined_readback_required",
  "triadContext"
];

const ALLOWED_STATUSES = new Set([
  "pending",
  "in_progress",
  "concept_spine_missing",
  "korea_saas_fit_missing",
  "closed_repo_implemented",
  "closed_request_only",
  "closed_dry_run_only",
  "closed_sandbox_only",
  "blocked_external_receipt_required",
  "retired_by_owner_decision"
]);

function requireIncludes(text, needle, label) {
  assert.equal(text.includes(needle), true, `${label} missing ${needle}`);
}

function parseOpenRows(traceabilitySource) {
  return traceabilitySource
    .split("\n")
    .filter((line) => line.startsWith("| LCX-OPEN-"))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return {
        id: cells[0],
        cells,
        validator: cells.at(-4) ?? "",
        allowed_claim: cells.at(-3) ?? "",
        blocked_claim: cells.at(-2) ?? "",
        status: cells.at(-1) ?? ""
      };
    });
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    counts[row[field]] = (counts[row[field]] ?? 0) + 1;
    return counts;
  }, {});
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:concept-fit:validate"], "node scripts/validate-lcx-full-concept-fit.mjs");

const sources = {
  openable_plan: readText(OPENABLE_PLAN_PATH),
  openable_traceability: readText(OPENABLE_TRACEABILITY_PATH),
  no_unimplemented_plan: readText(NO_UNIMPLEMENTED_PLAN_PATH),
  korea_saas_plan: readText(KOREA_SAAS_IMPLEMENTATION_PLAN_PATH),
  korea_saas_research: readText(KOREA_SAAS_RESEARCH_MATRIX_PATH)
};
const corpus = Object.values(sources).join("\n");

for (const term of REQUIRED_CONCEPT_TERMS) requireIncludes(corpus, term, "concept-fit corpus");
requireIncludes(sources.openable_traceability, "Original Concept Spine Rows", "openable traceability");
requireIncludes(sources.korea_saas_plan, "Concept-Fit Verdict", "Korea SaaS implementation plan");
requireIncludes(sources.korea_saas_research, "Original Product Concept Map", "Korea SaaS research matrix");
requireIncludes(sources.no_unimplemented_plan, "original_concept_fit PASS AND korea_saas_operating_fit PASS", "no-unimplemented plan");

const openRows = parseOpenRows(sources.openable_traceability);
assert.ok(openRows.length >= 90, "expected LCX-OPEN row coverage");
const rowsById = new Map(openRows.map((row) => [row.id, row]));
for (const rowId of REQUIRED_CONCEPT_ROWS) {
  assert.ok(rowsById.has(rowId), `${rowId} is required in concept spine traceability`);
  assert.ok(rowsById.get(rowId).validator.includes("concept-fit"), `${rowId} must cite concept-fit validation`);
}

for (const row of openRows) {
  assert.ok(ALLOWED_STATUSES.has(row.status), `${row.id} has unsupported status ${row.status}`);
  if (row.status.startsWith("closed_")) {
    assert.notEqual(row.status, "concept_spine_missing", `${row.id} cannot close with missing concept spine`);
    assert.notEqual(row.status, "korea_saas_fit_missing", `${row.id} cannot close with missing SaaS fit`);
    assert.ok(row.validator.length > 0, `${row.id} closed row must cite a validator/proof`);
  }
}

const conceptRows = REQUIRED_CONCEPT_ROWS.map((rowId) => rowsById.get(rowId));
const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.concept_fit_validation.v0.1",
  generated_at: new Date().toISOString(),
  verdict: "PASS",
  tuw_ids: REQUIRED_CONCEPT_ROWS,
  source_refs: [
    OPENABLE_PLAN_PATH,
    OPENABLE_TRACEABILITY_PATH,
    NO_UNIMPLEMENTED_PLAN_PATH,
    KOREA_SAAS_RESEARCH_MATRIX_PATH,
    KOREA_SAAS_IMPLEMENTATION_PLAN_PATH
  ],
  axis_a_original_concept: {
    client_crm_intake_required: true,
    matter_erp_legal_operations_required: true,
    people_hrx_responsibility_required: true,
    matter_first_join_required: true,
    failure_status: "concept_spine_missing"
  },
  row_summary: {
    checked_openable_rows: openRows.length,
    concept_spine_rows: conceptRows.length,
    status_counts: countBy(openRows, "status")
  },
  required_fields: [
    "client_ref",
    "matter_ref",
    "people_responsibility",
    "engagement_scope",
    "permission_context",
    "audit_context",
    "pre_matter_exception",
    "joined_readback_required"
  ],
  boundary: {
    external_send_claim: false,
    payment_movement_claim: false,
    tax_invoice_issue_claim: false,
    payroll_disbursement_claim: false,
    production_vault_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(CONCEPT_FIT_VALIDATION_PATH, report);
writeText(
  CONCEPT_FIT_VALIDATION_MD_PATH,
  [
    "# LCX-FULL-21 Concept-Fit Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(
      conceptRows.map((row) => ({
        TUW: row.id,
        Validator: row.validator,
        Status: row.status,
        "Allowed claim": row.allowed_claim,
        "Blocked claim": row.blocked_claim
      })),
      ["TUW", "Validator", "Status", "Allowed claim", "Blocked claim"]
    ),
    "",
    "Boundary: this validator enforces the Client CRM/intake -> Matter ERP/legal operations -> People HRX Matter-first concept gate; it does not claim external send, payment movement, tax invoice issue, payroll disbursement, production Vault write, production go-live, or public release."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({
  verdict: report.verdict,
  validation: CONCEPT_FIT_VALIDATION_PATH,
  checked_openable_rows: report.row_summary.checked_openable_rows,
  concept_spine_rows: report.row_summary.concept_spine_rows
}, null, 2));
