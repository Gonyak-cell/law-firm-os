#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const REQUEST_PACKET_JSON_PATH = "docs/launch/launch-owner-approval-request-packet.json";
const REQUEST_PACKET_MD_PATH = "docs/launch/launch-owner-approval-request-packet.md";

const REQUIRED_OWNER_RESPONSE_FIELDS = [
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

function unique(values) {
  return [...new Set(values)].sort();
}

function responseTemplate() {
  return Object.fromEntries(REQUIRED_OWNER_RESPONSE_FIELDS.map((field) => [field, ""]));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Approval Request Packet");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This packet is an owner approval request packet only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Pending request cards do not count as owner evidence.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Owner Response Fields");
  lines.push("");
  lines.push(report.required_owner_response_fields.map((field) => `\`${field}\``).join(", "));
  lines.push("");
  lines.push("## Request Cards");
  lines.push("");
  if (report.request_cards.length === 0) {
    lines.push("No pending owner request cards.");
  } else {
    lines.push("| Decision ID | Domain | Targets | Request status | Required owner basis |");
    lines.push("| --- | --- | ---: | --- | --- |");
    for (const card of report.request_cards) {
      lines.push(`| ${markdownCell(card.decision_id)} | ${markdownCell(card.coverage_domain)} | ${card.covered_target_count} | ${markdownCell(card.request_status)} | ${markdownCell(card.required_owner_basis)} |`);
    }
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
  lines.push("A request card may produce a launch decision register row only after the corresponding receipt ledger slot contains real owner evidence and the import-candidate validation passes. This request packet is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const existingPacket = existsSync(REQUEST_PACKET_JSON_PATH) ? readJson(REQUEST_PACKET_JSON_PATH) : null;

const requestCards = (receiptLedger.receipt_slots ?? [])
  .filter((slot) => slot.receipt_status === "pending_owner_evidence")
  .map((slot) => ({
    decision_id: slot.decision_id,
    title: slot.title,
    coverage_domain: slot.coverage_domain,
    covered_target_count: slot.covered_target_count,
    required_owner_basis: slot.required_owner_basis,
    target_detail_state: slot.target_detail_state,
    target_ids: slot.target_ids ?? [],
    target_sample: (slot.target_ids ?? []).slice(0, 10),
    receipt_status: slot.receipt_status,
    request_status: "pending_owner_response",
    owner_action_required: true,
    pending_request_not_approval: true,
    copy_to_launch_decision_register_allowed: false,
    allowed_register_status_after_real_receipt: slot.allowed_register_status_after_real_receipt,
    owner_response_template: responseTemplate()
  }));

const report = {
  schema_version: "law-firm-os.launch-owner-approval-request-packet.v0.1",
  generated_at: existingPacket?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    owner_approval_request_packet_only: true,
    go_live_approved_by_this_packet: false,
    owner_deferrals_approved_by_this_packet: false,
    launch_decision_register_modified_by_this_packet: false,
    pending_requests_count_as_owner_evidence: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    receipt_ledger_verdict: receiptLedgerValidation.verdict,
    receipt_slot_count: receiptLedger.summary.receipt_slot_count,
    pending_receipt_slot_count: receiptLedger.summary.pending_receipt_slot_count,
    real_owner_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    request_card_count: requestCards.length,
    target_count_by_pending_requests: unique(requestCards.flatMap((card) => card.target_ids)).length,
    copy_allowed_count: receiptLedger.summary.copy_allowed_count
  },
  required_owner_response_fields: REQUIRED_OWNER_RESPONSE_FIELDS,
  signature_ref_formats: receiptLedger.signature_ref_formats,
  request_cards: requestCards
};

mkdirSync(dirname(REQUEST_PACKET_JSON_PATH), { recursive: true });
writeFileSync(REQUEST_PACKET_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REQUEST_PACKET_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REQUEST_PACKET_JSON_PATH,
  report_markdown: REQUEST_PACKET_MD_PATH,
  request_card_count: report.summary.request_card_count,
  pending_receipt_slot_count: report.summary.pending_receipt_slot_count,
  target_count_by_pending_requests: report.summary.target_count_by_pending_requests,
  real_owner_receipt_count: report.summary.real_owner_receipt_count,
  copy_allowed_count: report.summary.copy_allowed_count
}, null, 2));
