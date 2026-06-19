#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const OWNER_RUNBOOK_PATH = "docs/launch/launch-owner-decision-intake-runbook.json";
const TARGET_ANNEX_PATH = "docs/launch/launch-minimum-deferral-target-annex.json";
const RECEIPT_LEDGER_JSON_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_MD_PATH = "docs/launch/launch-owner-approval-receipt-ledger.md";

const REQUIRED_RECEIPT_FIELDS = [
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function existingReceiptState(existingSlot) {
  return {
    receipt_status: existingSlot?.receipt_status ?? "pending_owner_evidence",
    owner: existingSlot?.owner ?? "",
    decision: existingSlot?.decision ?? "",
    basis: existingSlot?.basis ?? "",
    date_or_revisit_gate: existingSlot?.date_or_revisit_gate ?? "",
    approval_signature_ref: existingSlot?.approval_signature_ref ?? "",
    received_at: existingSlot?.received_at ?? "",
    recorded_by_human: existingSlot?.recorded_by_human ?? "",
    pending_slot_not_approval: existingSlot?.pending_slot_not_approval ?? true,
    copy_to_launch_decision_register_allowed: existingSlot?.copy_to_launch_decision_register_allowed ?? false
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Approval Receipt Ledger");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This ledger is a receipt intake template only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Pending receipt slots do not count as owner evidence.");
  lines.push("- Existing receipt fields are preserved by decision ID during regeneration.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Required Receipt Fields");
  lines.push("");
  lines.push(report.required_receipt_fields.map((field) => `\`${field}\``).join(", "));
  lines.push("");
  lines.push("## Receipt Slots");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets | Receipt status | Target detail state |");
  lines.push("| --- | --- | ---: | --- | --- |");
  for (const slot of report.receipt_slots) {
    lines.push(`| ${markdownCell(slot.decision_id)} | ${markdownCell(slot.coverage_domain)} | ${slot.covered_target_count} | ${markdownCell(slot.receipt_status)} | ${markdownCell(slot.target_detail_state)} |`);
  }
  lines.push("");
  lines.push("## Signature Reference Formats");
  lines.push("");
  lines.push("| Format | Rule |");
  lines.push("| --- | --- |");
  for (const item of report.signature_ref_formats) {
    lines.push(`| ${markdownCell(item.format)} | ${markdownCell(item.rule)} |`);
  }
  lines.push("");
  lines.push("## Register Copy Rule");
  lines.push("");
  lines.push("Only after a receipt slot is replaced with real owner evidence may the matching decision row be copied into the launch decision register. This receipt ledger is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const ownerRunbook = readJson(OWNER_RUNBOOK_PATH);
const targetAnnex = readJson(TARGET_ANNEX_PATH);
const existingLedger = existsSync(RECEIPT_LEDGER_JSON_PATH) ? readJson(RECEIPT_LEDGER_JSON_PATH) : null;
const annexByDecisionId = new Map((targetAnnex.minimum_decision_rows ?? []).map((row) => [row.decision_id, row]));
const existingSlotByDecisionId = new Map((existingLedger?.receipt_slots ?? []).map((slot) => [slot.decision_id, slot]));

const receiptSlots = (ownerRunbook.minimum_owner_rows ?? []).map((row) => {
  const annexRow = annexByDecisionId.get(row.decision_id);
  const preservedReceiptState = existingReceiptState(existingSlotByDecisionId.get(row.decision_id));
  return {
    decision_id: row.decision_id,
    title: row.title,
    coverage_domain: row.coverage_domain,
    covered_target_count: row.covered_target_count,
    required_owner_basis: row.required_owner_basis,
    target_detail_state: annexRow?.target_detail_state ?? "missing_target_annex_row",
    target_ids: annexRow?.target_ids ?? [],
    allowed_register_status_after_real_receipt: row.status_to_record_after_real_owner_evidence,
    ...preservedReceiptState
  };
});

const report = {
  schema_version: "law-firm-os.launch-owner-approval-receipt-ledger.v0.1",
  generated_at: existingLedger?.generated_at ?? new Date().toISOString(),
  source_refs: [
    OWNER_RUNBOOK_PATH,
    TARGET_ANNEX_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    receipt_intake_template_only: true,
    go_live_approved_by_this_ledger: false,
    owner_deferrals_approved_by_this_ledger: false,
    launch_decision_register_modified_by_this_ledger: false,
    pending_slots_count_as_owner_evidence: false,
    regeneration_preserves_existing_receipt_fields: true,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    receipt_slot_count: receiptSlots.length,
    pending_receipt_slot_count: receiptSlots.filter((slot) => slot.receipt_status === "pending_owner_evidence").length,
    real_owner_receipt_count: receiptSlots.filter((slot) => slot.receipt_status === "real_owner_evidence_received").length,
    copy_allowed_count: receiptSlots.filter((slot) => slot.copy_to_launch_decision_register_allowed === true).length,
    target_count_if_all_receipts_are_completed: [...new Set(receiptSlots.flatMap((slot) => slot.target_ids))].length
  },
  required_receipt_fields: REQUIRED_RECEIPT_FIELDS,
  allowed_receipt_status_values: [
    "pending_owner_evidence",
    "real_owner_evidence_received"
  ],
  signature_ref_formats: ownerRunbook.signature_ref_formats,
  receipt_slots: receiptSlots
};

mkdirSync(dirname(RECEIPT_LEDGER_JSON_PATH), { recursive: true });
writeFileSync(RECEIPT_LEDGER_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(RECEIPT_LEDGER_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: RECEIPT_LEDGER_JSON_PATH,
  report_markdown: RECEIPT_LEDGER_MD_PATH,
  receipt_slot_count: report.summary.receipt_slot_count,
  pending_receipt_slot_count: report.summary.pending_receipt_slot_count,
  real_owner_receipt_count: report.summary.real_owner_receipt_count,
  copy_allowed_count: report.summary.copy_allowed_count,
  target_count_if_all_receipts_are_completed: report.summary.target_count_if_all_receipts_are_completed
}, null, 2));
