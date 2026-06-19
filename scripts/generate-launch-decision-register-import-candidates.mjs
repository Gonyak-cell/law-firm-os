#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const IMPORT_CANDIDATES_JSON_PATH = "docs/launch/launch-decision-register-import-candidates.json";
const IMPORT_CANDIDATES_MD_PATH = "docs/launch/launch-decision-register-import-candidates.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function registerRowFromSlot(slot) {
  return {
    decision_id: slot.decision_id,
    title: slot.title,
    owner: slot.owner,
    decision: slot.decision,
    basis: slot.basis,
    date_or_revisit_gate: slot.date_or_revisit_gate,
    approval_signature: slot.approval_signature_ref,
    status: slot.allowed_register_status_after_real_receipt
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Decision Register Import Candidates");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This file is an import-candidate preview only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Pending owner receipt slots are excluded from import candidates.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Candidate Rows");
  lines.push("");
  if (report.import_candidates.length === 0) {
    lines.push("No import candidates. Owner approval receipt slots are still pending.");
  } else {
    lines.push("| Decision ID | Owner | Decision | Date/revisit gate | Signature ref | Status |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const candidate of report.import_candidates) {
      const row = candidate.register_row;
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.owner)} | ${markdownCell(row.decision)} | ${markdownCell(row.date_or_revisit_gate)} | ${markdownCell(row.approval_signature)} | ${markdownCell(row.status)} |`);
    }
  }
  lines.push("");
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("A candidate row may be manually copied into the launch decision register only after this candidate file and the owner evidence audit both validate. This preview is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const existingCandidates = existsSync(IMPORT_CANDIDATES_JSON_PATH) ? readJson(IMPORT_CANDIDATES_JSON_PATH) : null;

const importCandidates = (receiptLedger.receipt_slots ?? [])
  .filter((slot) => slot.receipt_status === "real_owner_evidence_received" && slot.copy_to_launch_decision_register_allowed === true)
  .map((slot) => ({
    decision_id: slot.decision_id,
    coverage_domain: slot.coverage_domain,
    covered_target_count: slot.covered_target_count,
    source_receipt_status: slot.receipt_status,
    source_copy_allowed: slot.copy_to_launch_decision_register_allowed,
    source_approval_signature_ref: slot.approval_signature_ref,
    register_row: registerRowFromSlot(slot),
    target_ids: slot.target_ids
  }));

const report = {
  schema_version: "law-firm-os.launch-decision-register-import-candidates.v0.1",
  generated_at: existingCandidates?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    import_candidate_preview_only: true,
    go_live_approved_by_this_file: false,
    owner_deferrals_approved_by_this_file: false,
    launch_decision_register_modified_by_this_file: false,
    pending_receipts_excluded_from_candidates: true,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    receipt_ledger_verdict: receiptLedgerValidation.verdict,
    receipt_slot_count: receiptLedger.summary.receipt_slot_count,
    pending_receipt_slot_count: receiptLedger.summary.pending_receipt_slot_count,
    real_owner_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    import_candidate_count: importCandidates.length,
    covered_target_count_by_candidates: [...new Set(importCandidates.flatMap((candidate) => candidate.target_ids ?? []))].length
  },
  import_candidates: importCandidates
};

mkdirSync(dirname(IMPORT_CANDIDATES_JSON_PATH), { recursive: true });
writeFileSync(IMPORT_CANDIDATES_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(IMPORT_CANDIDATES_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: IMPORT_CANDIDATES_JSON_PATH,
  report_markdown: IMPORT_CANDIDATES_MD_PATH,
  import_candidate_count: report.summary.import_candidate_count,
  covered_target_count_by_candidates: report.summary.covered_target_count_by_candidates,
  real_owner_receipt_count: report.summary.real_owner_receipt_count,
  pending_receipt_slot_count: report.summary.pending_receipt_slot_count
}, null, 2));
