#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RESPONSE_INTAKE_PATH = "docs/launch/launch-owner-response-intake.json";
const RESPONSE_INTAKE_VALIDATION_PATH = "docs/launch/launch-owner-response-intake-validation.json";
const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const CANDIDATES_JSON_PATH = "docs/launch/launch-owner-response-receipt-candidates.json";
const CANDIDATES_MD_PATH = "docs/launch/launch-owner-response-receipt-candidates.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function receiptSlotUpdateFromResponse(entry) {
  return {
    decision_id: entry.decision_id,
    title: entry.title,
    coverage_domain: entry.coverage_domain,
    covered_target_count: entry.covered_target_count,
    required_owner_basis: entry.required_owner_basis,
    target_detail_state: entry.target_detail_state,
    target_ids: entry.target_ids ?? [],
    allowed_register_status_after_real_receipt: entry.allowed_register_status_after_real_receipt,
    receipt_status: "real_owner_evidence_received",
    owner: entry.owner,
    decision: entry.decision,
    basis: entry.basis,
    date_or_revisit_gate: entry.date_or_revisit_gate,
    approval_signature_ref: entry.approval_signature_ref,
    received_at: entry.received_at,
    recorded_by_human: entry.recorded_by_human,
    pending_slot_not_approval: false,
    copy_to_launch_decision_register_allowed: true
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Receipt Candidates");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This file is a receipt-update candidate preview only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-owner-approval-receipt-ledger.json`.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Pending owner responses are excluded from receipt-update candidates.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Candidate Receipt Updates");
  lines.push("");
  if (report.receipt_update_candidates.length === 0) {
    lines.push("No receipt-update candidates. Owner response entries are still pending or not copy-ready.");
  } else {
    lines.push("| Decision ID | Domain | Targets | Source response status | Copy-ready source | Receipt status after copy |");
    lines.push("| --- | --- | ---: | --- | --- | --- |");
    for (const candidate of report.receipt_update_candidates) {
      lines.push(`| ${markdownCell(candidate.decision_id)} | ${markdownCell(candidate.coverage_domain)} | ${candidate.covered_target_count} | ${markdownCell(candidate.source_response_status)} | ${candidate.source_copy_allowed} | ${markdownCell(candidate.receipt_slot_update.receipt_status)} |`);
    }
  }
  lines.push("");
  lines.push("## Receipt Copy Rule");
  lines.push("");
  lines.push("A candidate receipt update may be manually copied into the owner approval receipt ledger only after this candidate file, the owner response intake, and the receipt ledger validation pass. This candidate file is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const responseIntake = readJson(RESPONSE_INTAKE_PATH);
const responseIntakeValidation = readJson(RESPONSE_INTAKE_VALIDATION_PATH);
const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const existingCandidates = existsSync(CANDIDATES_JSON_PATH) ? readJson(CANDIDATES_JSON_PATH) : null;

const receiptUpdateCandidates = (responseIntake.response_entries ?? [])
  .filter((entry) => entry.response_status === "real_owner_response_received" && entry.copy_to_receipt_ledger_allowed === true)
  .map((entry) => ({
    decision_id: entry.decision_id,
    title: entry.title,
    coverage_domain: entry.coverage_domain,
    covered_target_count: entry.covered_target_count,
    source_response_status: entry.response_status,
    source_copy_allowed: entry.copy_to_receipt_ledger_allowed,
    source_approval_signature_ref: entry.approval_signature_ref,
    receipt_slot_update: receiptSlotUpdateFromResponse(entry),
    target_ids: entry.target_ids ?? []
  }));

const report = {
  schema_version: "law-firm-os.launch-owner-response-receipt-candidates.v0.1",
  generated_at: existingCandidates?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RESPONSE_INTAKE_PATH,
    RESPONSE_INTAKE_VALIDATION_PATH,
    RECEIPT_LEDGER_PATH
  ],
  boundary: {
    receipt_update_candidate_preview_only: true,
    go_live_approved_by_this_file: false,
    owner_deferrals_approved_by_this_file: false,
    receipt_ledger_modified_by_this_file: false,
    launch_decision_register_modified_by_this_file: false,
    pending_responses_excluded_from_candidates: true,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    response_intake_verdict: responseIntakeValidation.verdict,
    response_entry_count: responseIntake.summary.response_entry_count,
    pending_response_count: responseIntake.summary.pending_response_count,
    real_owner_response_count: responseIntake.summary.real_owner_response_count,
    copy_allowed_response_count: responseIntake.summary.copy_allowed_count,
    receipt_update_candidate_count: receiptUpdateCandidates.length,
    target_count_by_candidates: unique(receiptUpdateCandidates.flatMap((candidate) => candidate.target_ids)).length,
    receipt_ledger_current_real_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    receipt_ledger_current_copy_allowed_count: receiptLedger.summary.copy_allowed_count
  },
  receipt_update_candidates: receiptUpdateCandidates
};

mkdirSync(dirname(CANDIDATES_JSON_PATH), { recursive: true });
writeFileSync(CANDIDATES_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(CANDIDATES_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: CANDIDATES_JSON_PATH,
  report_markdown: CANDIDATES_MD_PATH,
  receipt_update_candidate_count: report.summary.receipt_update_candidate_count,
  real_owner_response_count: report.summary.real_owner_response_count,
  copy_allowed_response_count: report.summary.copy_allowed_response_count,
  target_count_by_candidates: report.summary.target_count_by_candidates,
  receipt_ledger_current_real_receipt_count: report.summary.receipt_ledger_current_real_receipt_count
}, null, 2));
