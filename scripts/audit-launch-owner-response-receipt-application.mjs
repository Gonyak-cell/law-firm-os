#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const RECEIPT_CANDIDATES_PATH = "docs/launch/launch-owner-response-receipt-candidates.json";
const RECEIPT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-owner-response-receipt-candidates-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-owner-response-receipt-application-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-owner-response-receipt-application-audit.md";

const RECEIPT_SLOT_FIELDS = [
  "decision_id",
  "title",
  "coverage_domain",
  "covered_target_count",
  "required_owner_basis",
  "target_detail_state",
  "target_ids",
  "allowed_register_status_after_real_receipt",
  "receipt_status",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human",
  "pending_slot_not_approval",
  "copy_to_launch_decision_register_allowed"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function receiptSlotProjection(slot) {
  return Object.fromEntries(RECEIPT_SLOT_FIELDS.map((field) => [field, slot?.[field]]));
}

function slotIsPendingBlank(slot) {
  return (
    slot?.receipt_status === "pending_owner_evidence" &&
    slot?.pending_slot_not_approval === true &&
    slot?.copy_to_launch_decision_register_allowed === false &&
    ["owner", "decision", "basis", "date_or_revisit_gate", "approval_signature_ref", "received_at", "recorded_by_human"].every(
      (field) => !String(slot?.[field] ?? "").trim()
    )
  );
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Receipt Application Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Candidate Application Rows");
  lines.push("");
  if (report.application_rows.length === 0) {
    lines.push("No receipt-update candidates to apply.");
  } else {
    lines.push("| Decision ID | Application state | Field mismatches |");
    lines.push("| --- | --- | ---: |");
    for (const row of report.application_rows) {
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.application_state)} | ${row.field_mismatch_count} |`);
    }
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit checks receipt-update candidate application only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the owner approval receipt ledger.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Pending candidate application does not count as owner approval.");
  lines.push("- Empty candidate state is valid but does not count as owner approval.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const receiptCandidates = readJson(RECEIPT_CANDIDATES_PATH);
const receiptCandidatesValidation = readJson(RECEIPT_CANDIDATES_VALIDATION_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (receiptLedgerValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_LEDGER_VALIDATION_NOT_PASS", "Receipt ledger validation must pass before candidate application can be audited.", {
    actual: receiptLedgerValidation.verdict
  });
}

if (receiptCandidatesValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_CANDIDATES_VALIDATION_NOT_PASS", "Receipt-update candidates validation must pass before candidate application can be audited.", {
    actual: receiptCandidatesValidation.verdict
  });
}

const slotByDecisionId = new Map((receiptLedger.receipt_slots ?? []).map((slot) => [slot.decision_id, slot]));
const applicationRows = (receiptCandidates.receipt_update_candidates ?? []).map((candidate) => {
  const slot = slotByDecisionId.get(candidate.decision_id);
  const expected = candidate.receipt_slot_update ?? {};
  const actual = receiptSlotProjection(slot);
  const mismatches = [];
  let applicationState = "missing_receipt_slot";

  if (slot) {
    if (sameJson(actual, expected)) {
      applicationState = "applied";
    } else if (slotIsPendingBlank(slot)) {
      applicationState = "pending_manual_application";
    } else {
      applicationState = "mismatched_receipt_slot";
      for (const field of RECEIPT_SLOT_FIELDS) {
        if (!sameJson(actual[field], expected[field])) {
          mismatches.push({
            field,
            expected: expected[field],
            actual: actual[field]
          });
        }
      }
    }
  }

  return {
    decision_id: candidate.decision_id,
    application_state: applicationState,
    field_mismatch_count: mismatches.length,
    mismatches
  };
});

for (const row of applicationRows) {
  if (row.application_state === "missing_receipt_slot") {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_SLOT_MISSING", "Receipt-update candidate has no matching receipt ledger slot.", {
      decision_id: row.decision_id
    });
  }
  if (row.application_state === "mismatched_receipt_slot") {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_SLOT_MISMATCH", "Receipt-update candidate does not match the current receipt ledger slot and is not merely pending manual application.", {
      decision_id: row.decision_id,
      mismatches: row.mismatches
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-response-receipt-application-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH,
    RECEIPT_CANDIDATES_PATH,
    RECEIPT_CANDIDATES_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    audits_receipt_update_candidate_application_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    receipt_ledger_modified_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    pending_candidate_application_counts_as_owner_approval: false,
    empty_candidate_state_counts_as_owner_approval: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    receipt_update_candidate_count: receiptCandidates.summary.receipt_update_candidate_count,
    applied_candidate_count: applicationRows.filter((row) => row.application_state === "applied").length,
    pending_application_count: applicationRows.filter((row) => row.application_state === "pending_manual_application").length,
    mismatched_application_count: applicationRows.filter((row) => row.application_state === "mismatched_receipt_slot").length,
    missing_receipt_slot_count: applicationRows.filter((row) => row.application_state === "missing_receipt_slot").length,
    receipt_ledger_current_real_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    receipt_ledger_current_copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  application_rows: applicationRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  receipt_update_candidate_count: report.summary.receipt_update_candidate_count,
  applied_candidate_count: report.summary.applied_candidate_count,
  pending_application_count: report.summary.pending_application_count,
  mismatched_application_count: report.summary.mismatched_application_count,
  missing_receipt_slot_count: report.summary.missing_receipt_slot_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
