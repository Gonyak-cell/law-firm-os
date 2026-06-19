#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const RECEIPT_CANDIDATES_PATH = "docs/launch/launch-owner-response-receipt-candidates.json";
const RECEIPT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-owner-response-receipt-candidates-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-owner-response-receipt-reconciliation-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-owner-response-receipt-reconciliation-audit.md";

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

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Receipt Reconciliation Audit");
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
  lines.push("## Reconciled Receipt Slots");
  lines.push("");
  if (report.reconciled_receipt_slots.length === 0) {
    lines.push("No real owner receipt slots recorded.");
  } else {
    lines.push("| Decision ID | Receipt status | Candidate match | Field mismatches |");
    lines.push("| --- | --- | --- | ---: |");
    for (const row of report.reconciled_receipt_slots) {
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.receipt_status)} | ${row.receipt_candidate_match} | ${row.field_mismatch_count} |`);
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
  lines.push("- This audit reconciles real receipt ledger slots to validated receipt-update candidates.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the owner approval receipt ledger.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Empty real-receipt state is valid but does not count as owner approval.");
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
  addFinding(findings, "P1", "RECEIPT_LEDGER_VALIDATION_NOT_PASS", "Receipt ledger validation must pass before real receipt slots can be reconciled.", {
    actual: receiptLedgerValidation.verdict
  });
}

if (receiptCandidatesValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_CANDIDATES_VALIDATION_NOT_PASS", "Receipt-update candidates validation must pass before real receipt slots can be reconciled.", {
    actual: receiptCandidatesValidation.verdict
  });
}

const candidateByDecisionId = new Map(
  (receiptCandidates.receipt_update_candidates ?? []).map((candidate) => [candidate.decision_id, candidate])
);
const realReceiptSlots = (receiptLedger.receipt_slots ?? []).filter(
  (slot) => slot.receipt_status === "real_owner_evidence_received" || slot.copy_to_launch_decision_register_allowed === true
);

const reconciledReceiptSlots = realReceiptSlots.map((slot) => {
  const candidate = candidateByDecisionId.get(slot.decision_id);
  const mismatches = [];
  if (candidate) {
    const expected = candidate.receipt_slot_update ?? {};
    const actual = Object.fromEntries(RECEIPT_SLOT_FIELDS.map((field) => [field, slot[field]]));
    if (!sameJson(actual, expected)) {
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
    decision_id: slot.decision_id,
    receipt_status: slot.receipt_status,
    copy_to_launch_decision_register_allowed: slot.copy_to_launch_decision_register_allowed,
    receipt_candidate_match: Boolean(candidate),
    field_mismatch_count: mismatches.length,
    mismatches
  };
});

for (const row of reconciledReceiptSlots) {
  if (!row.receipt_candidate_match) {
    addFinding(findings, "P1", "REAL_RECEIPT_WITHOUT_CANDIDATE", "Real receipt ledger slot has no matching validated receipt-update candidate.", {
      decision_id: row.decision_id,
      receipt_status: row.receipt_status
    });
  }
  if (row.field_mismatch_count > 0) {
    addFinding(findings, "P1", "REAL_RECEIPT_CANDIDATE_MISMATCH", "Real receipt ledger slot fields do not match the validated receipt-update candidate.", {
      decision_id: row.decision_id,
      mismatches: row.mismatches
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-response-receipt-reconciliation-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH,
    RECEIPT_CANDIDATES_PATH,
    RECEIPT_CANDIDATES_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    reconciles_real_receipts_to_candidates_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    receipt_ledger_modified_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    empty_real_receipt_state_counts_as_owner_approval: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    receipt_slot_count: receiptLedger.summary.receipt_slot_count,
    pending_receipt_slot_count: receiptLedger.summary.pending_receipt_slot_count,
    real_owner_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    receipt_update_candidate_count: receiptCandidates.summary.receipt_update_candidate_count,
    reconciled_real_receipt_count: reconciledReceiptSlots.filter((slot) => slot.receipt_candidate_match && slot.field_mismatch_count === 0).length,
    unreconciled_real_receipt_count: reconciledReceiptSlots.filter((slot) => !slot.receipt_candidate_match || slot.field_mismatch_count > 0).length,
    field_mismatch_count: reconciledReceiptSlots.reduce((sum, slot) => sum + slot.field_mismatch_count, 0),
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  reconciled_receipt_slots: reconciledReceiptSlots,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  real_owner_receipt_count: report.summary.real_owner_receipt_count,
  receipt_update_candidate_count: report.summary.receipt_update_candidate_count,
  reconciled_real_receipt_count: report.summary.reconciled_real_receipt_count,
  unreconciled_real_receipt_count: report.summary.unreconciled_real_receipt_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
