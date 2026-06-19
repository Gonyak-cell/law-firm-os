#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const REQUEST_PACKET_PATH = "docs/launch/launch-owner-approval-request-packet.json";
const REQUEST_PACKET_VALIDATION_PATH = "docs/launch/launch-owner-approval-request-packet-validation.json";
const RESPONSE_INTAKE_JSON_PATH = "docs/launch/launch-owner-response-intake.json";
const RESPONSE_INTAKE_MD_PATH = "docs/launch/launch-owner-response-intake.md";

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

function responseFieldsFrom(existingEntry) {
  return Object.fromEntries(
    REQUIRED_OWNER_RESPONSE_FIELDS.map((field) => [field, String(existingEntry?.[field] ?? "")])
  );
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Intake");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This file is an owner response intake template only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-owner-approval-receipt-ledger.json`.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Pending response entries do not count as owner evidence.");
  lines.push("- Existing response fields are preserved by decision ID during regeneration.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Required Owner Response Fields");
  lines.push("");
  lines.push(report.required_owner_response_fields.map((field) => `\`${field}\``).join(", "));
  lines.push("");
  lines.push("## Response Entries");
  lines.push("");
  if (report.response_entries.length === 0) {
    lines.push("No owner response entries.");
  } else {
    lines.push("| Decision ID | Domain | Targets | Response status | Copy to receipt ledger allowed |");
    lines.push("| --- | --- | ---: | --- | --- |");
    for (const entry of report.response_entries) {
      lines.push(`| ${markdownCell(entry.decision_id)} | ${markdownCell(entry.coverage_domain)} | ${entry.covered_target_count} | ${markdownCell(entry.response_status)} | ${entry.copy_to_receipt_ledger_allowed} |`);
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
  lines.push("## Receipt Copy Rule");
  lines.push("");
  lines.push("A response entry may be copied into the owner approval receipt ledger only after all required owner response fields are real evidence and this intake validates. This response intake is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const requestPacket = readJson(REQUEST_PACKET_PATH);
const requestPacketValidation = readJson(REQUEST_PACKET_VALIDATION_PATH);
const existingIntake = existsSync(RESPONSE_INTAKE_JSON_PATH) ? readJson(RESPONSE_INTAKE_JSON_PATH) : null;
const existingEntryByDecisionId = new Map((existingIntake?.response_entries ?? []).map((entry) => [entry.decision_id, entry]));

const responseEntries = (requestPacket.request_cards ?? []).map((card) => {
  const existingEntry = existingEntryByDecisionId.get(card.decision_id);
  const responseStatus = existingEntry?.response_status ?? "pending_owner_response";
  const responseFields = responseFieldsFrom(existingEntry);
  return {
    decision_id: card.decision_id,
    title: card.title,
    coverage_domain: card.coverage_domain,
    covered_target_count: card.covered_target_count,
    required_owner_basis: card.required_owner_basis,
    target_detail_state: card.target_detail_state,
    target_ids: card.target_ids ?? [],
    target_sample: (card.target_ids ?? []).slice(0, 10),
    allowed_register_status_after_real_receipt: card.allowed_register_status_after_real_receipt,
    request_status: card.request_status,
    response_status: responseStatus,
    ...responseFields,
    pending_response_not_approval: responseStatus === "pending_owner_response",
    copy_to_receipt_ledger_allowed: existingEntry?.copy_to_receipt_ledger_allowed === true
  };
});

const report = {
  schema_version: "law-firm-os.launch-owner-response-intake.v0.1",
  generated_at: existingIntake?.generated_at ?? new Date().toISOString(),
  source_refs: [
    REQUEST_PACKET_PATH,
    REQUEST_PACKET_VALIDATION_PATH,
    "docs/launch/launch-owner-approval-receipt-ledger.json",
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    owner_response_intake_template_only: true,
    go_live_approved_by_this_file: false,
    owner_deferrals_approved_by_this_file: false,
    receipt_ledger_modified_by_this_file: false,
    launch_decision_register_modified_by_this_file: false,
    pending_responses_count_as_owner_evidence: false,
    regeneration_preserves_existing_response_fields: true,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    request_packet_verdict: requestPacketValidation.verdict,
    request_card_count: requestPacket.summary.request_card_count,
    response_entry_count: responseEntries.length,
    pending_response_count: responseEntries.filter((entry) => entry.response_status === "pending_owner_response").length,
    real_owner_response_count: responseEntries.filter((entry) => entry.response_status === "real_owner_response_received").length,
    copy_allowed_count: responseEntries.filter((entry) => entry.copy_to_receipt_ledger_allowed === true).length,
    target_count_if_all_responses_received: unique(responseEntries.flatMap((entry) => entry.target_ids)).length,
    target_count_by_real_responses: unique(
      responseEntries
        .filter((entry) => entry.response_status === "real_owner_response_received")
        .flatMap((entry) => entry.target_ids)
    ).length
  },
  required_owner_response_fields: REQUIRED_OWNER_RESPONSE_FIELDS,
  allowed_response_status_values: [
    "pending_owner_response",
    "real_owner_response_received"
  ],
  signature_ref_formats: requestPacket.signature_ref_formats,
  response_entries: responseEntries
};

mkdirSync(dirname(RESPONSE_INTAKE_JSON_PATH), { recursive: true });
writeFileSync(RESPONSE_INTAKE_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(RESPONSE_INTAKE_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: RESPONSE_INTAKE_JSON_PATH,
  report_markdown: RESPONSE_INTAKE_MD_PATH,
  response_entry_count: report.summary.response_entry_count,
  pending_response_count: report.summary.pending_response_count,
  real_owner_response_count: report.summary.real_owner_response_count,
  copy_allowed_count: report.summary.copy_allowed_count,
  target_count_if_all_responses_received: report.summary.target_count_if_all_responses_received
}, null, 2));
