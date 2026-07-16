#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  CONCEPT_FIT_VALIDATION_PATH,
  KOREA_SAAS_FIT_VALIDATION_PATH,
  OPENABLE_TRACEABILITY_PATH,
  OPERATING_FIT_FINAL_VALIDATION_MD_PATH,
  OPERATING_FIT_FINAL_VALIDATION_PATH,
  RELEASE_PREFLIGHT_PATH,
  fileExists,
  markdownTable,
  readJson,
  readText,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const INCOMPLETE_STATUSES = new Set([
  "pending",
  "in_progress",
  "concept_spine_missing",
  "korea_saas_fit_missing"
]);

function parseOpenRows(traceabilitySource) {
  return traceabilitySource
    .split("\n")
    .filter((line) => line.startsWith("| LCX-OPEN-"))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return {
        id: cells[0],
        status: cells.at(-1) ?? "",
        allowed_claim: cells.at(-3) ?? "",
        blocked_claim: cells.at(-2) ?? "",
        validator: cells.at(-4) ?? ""
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
assert.equal(packageJson.scripts?.["lcx:full:operating-fit-actions:validate"], "npm run lcx:full:concept-fit:validate && npm run lcx:full:korea-saas-fit:validate");
assert.equal(packageJson.scripts?.["lcx:full:operating-fit-final:validate"], "npm run lcx:full:operating-fit-actions:validate && node scripts/validate-lcx-full-operating-fit-final.mjs");

const conceptFit = readJson(CONCEPT_FIT_VALIDATION_PATH);
const koreaSaasFit = readJson(KOREA_SAAS_FIT_VALIDATION_PATH);
assert.equal(conceptFit.verdict, "PASS", "concept-fit validation must pass");
assert.equal(koreaSaasFit.verdict, "PASS", "Korea SaaS fit validation must pass");
assert.equal(conceptFit.axis_a_original_concept.failure_status, "concept_spine_missing");
assert.equal(koreaSaasFit.axis_b_korea_saas_operating_fit.failure_status, "korea_saas_fit_missing");

const openRows = parseOpenRows(readText(OPENABLE_TRACEABILITY_PATH));
assert.ok(openRows.length >= 90, "expected LCX-OPEN row coverage");
const incompleteRows = openRows.filter((row) => INCOMPLETE_STATUSES.has(row.status));
const closedRowsMissingProof = openRows.filter((row) => row.status.startsWith("closed_") && row.validator.length === 0);
assert.deepEqual(incompleteRows, [], "all LCX-OPEN rows must be closed or explicitly externally blocked before final operating-fit claim");
assert.deepEqual(closedRowsMissingProof, [], "closed LCX-OPEN rows must cite validator/proof");

let releasePreflight = null;
if (fileExists(RELEASE_PREFLIGHT_PATH)) {
  releasePreflight = readJson(RELEASE_PREFLIGHT_PATH);
  if (releasePreflight.boundary) {
    assert.equal(releasePreflight.boundary.public_release_claim, false);
    assert.equal(releasePreflight.boundary.production_go_live_claim, false);
    assert.equal(releasePreflight.boundary.provider_production_write_claim_by_this_preflight, false);
  }
}
const releasePreflightGates = releasePreflight?.gates ?? [];
const blockedReleaseGates = releasePreflightGates
  .filter((entry) => entry.claim_status === "BLOCKED")
  .map((entry) => entry.tuw_id);
const failedReleaseGates = releasePreflightGates
  .filter((entry) => entry.claim_status === "FAIL")
  .map((entry) => entry.tuw_id);

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.operating_fit_final_validation.v0.1",
  generated_at: new Date().toISOString(),
  verdict: "PASS",
  source_refs: [
    CONCEPT_FIT_VALIDATION_PATH,
    KOREA_SAAS_FIT_VALIDATION_PATH,
    OPENABLE_TRACEABILITY_PATH,
    RELEASE_PREFLIGHT_PATH
  ],
  checked_openable_rows: openRows.length,
  status_counts: countBy(openRows, "status"),
  dual_axis: {
    original_concept_fit: conceptFit.verdict,
    korea_saas_operating_fit: koreaSaasFit.verdict
  },
  release_preflight: releasePreflight
    ? {
        verdict: releasePreflight.verdict,
        status: releasePreflight.status,
        blocked_gates: blockedReleaseGates,
        failed_gates: failedReleaseGates
      }
    : null,
  boundary: {
    external_non_claims_preserved: true,
    public_release_claim: false,
    production_go_live_claim: false,
    provider_production_write_claim: false,
    external_send_claim: false,
    payment_movement_claim: false,
    tax_invoice_issue_claim: false,
    payroll_disbursement_claim: false
  }
};

writeJson(OPERATING_FIT_FINAL_VALIDATION_PATH, report);
writeText(
  OPERATING_FIT_FINAL_VALIDATION_MD_PATH,
  [
    "# LCX-FULL-21 Operating-Fit Final Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(
      Object.entries(report.status_counts).map(([Status, Count]) => ({ Status, Count: String(Count) })),
      ["Status", "Count"]
    ),
    "",
    "## Dual Axis",
    "",
    markdownTable(
      [
        { Axis: "original concept fit", Verdict: report.dual_axis.original_concept_fit },
        { Axis: "Korea SaaS operating fit", Verdict: report.dual_axis.korea_saas_operating_fit }
      ],
      ["Axis", "Verdict"]
    ),
    "",
    "Boundary: this final validation requires all openable rows to leave pending/missing statuses and preserves external non-claims for public release, production go-live, provider production writes, external send, payment movement, tax invoice issue, and payroll disbursement."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({
  verdict: report.verdict,
  validation: OPERATING_FIT_FINAL_VALIDATION_PATH,
  checked_openable_rows: report.checked_openable_rows,
  status_counts: report.status_counts,
  release_preflight: report.release_preflight
}, null, 2));
