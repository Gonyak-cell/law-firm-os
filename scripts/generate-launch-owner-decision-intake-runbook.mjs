#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MINIMUM_PACKET_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const INTAKE_BATCHES_PATH = "docs/launch/launch-deferral-intake-batches.json";
const OWNER_EVIDENCE_AUDIT_PATH = "docs/launch/launch-decision-register-owner-evidence-audit.json";
const MINIMUM_APPLICATION_AUDIT_PATH = "docs/launch/launch-minimum-deferral-application-audit.json";
const RUNBOOK_JSON_PATH = "docs/launch/launch-owner-decision-intake-runbook.json";
const RUNBOOK_MD_PATH = "docs/launch/launch-owner-decision-intake-runbook.md";

const REQUIRED_REGISTER_FIELDS = [
  "decision_id",
  "title",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature",
  "status"
];

const VALIDATION_COMMANDS = [
  "node scripts/validate-launch-decision-register.mjs",
  "node scripts/audit-launch-decision-register-owner-evidence.mjs",
  "node scripts/audit-launch-minimum-deferral-application.mjs",
  "node scripts/audit-launch-deferral-coverage.mjs",
  "node scripts/audit-launch-goal-completion.mjs",
  "node scripts/audit-launch-no-go-claim-policy.mjs"
];

const SIGNATURE_REF_FORMATS = [
  {
    format: "docs/<local-evidence-path>",
    rule: "Local signature or approval reference must resolve in the repository."
  },
  {
    format: "external:<system-and-record-id>",
    rule: "External approval reference must identify the source system and record."
  },
  {
    format: "signature:<signature-record-id>",
    rule: "Signature reference must identify the signed record."
  },
  {
    format: "approval:<approval-record-id>",
    rule: "Approval reference must identify the approval record."
  },
  {
    format: "email:<message-id-or-thread-ref>",
    rule: "Email reference must identify the approving message or thread."
  },
  {
    format: "ticket:<ticket-id>",
    rule: "Ticket reference must identify the approval ticket."
  },
  {
    format: "meeting:<meeting-id-or-minutes-ref>",
    rule: "Meeting reference must identify the minutes or decision record."
  }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Decision Intake Runbook");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This runbook is an intake guide only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- It cannot count placeholder rows as owner evidence.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Current State");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Required Register Fields");
  lines.push("");
  lines.push(report.required_register_fields.map((field) => `\`${field}\``).join(", "));
  lines.push("");
  lines.push("## Minimum Owner Rows");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets | Required owner basis | Register status after real owner evidence |");
  lines.push("| --- | --- | ---: | --- | --- |");
  for (const row of report.minimum_owner_rows) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} | ${markdownCell(row.required_owner_basis)} | ${markdownCell(row.status_to_record_after_real_owner_evidence)} |`);
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
  lines.push("## Intake Batches");
  lines.push("");
  lines.push("| Batch | Lane | Targets | Required action |");
  lines.push("| --- | --- | ---: | --- |");
  for (const batch of report.intake_batches) {
    lines.push(`| ${markdownCell(batch.batch_id)} | ${markdownCell(batch.primary_resolution_lane)} | ${batch.target_count} | ${markdownCell(batch.required_action)} |`);
  }
  lines.push("");
  lines.push("## Validation Sequence");
  lines.push("");
  lines.push("| Step | Command |");
  lines.push("| ---: | --- |");
  report.validation_commands.forEach((command, index) => {
    lines.push(`| ${index + 1} | \`${command}\` |`);
  });
  lines.push("");
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("Copy a minimum row into the launch decision register only after the owner, decision, basis, date or revisit gate, and approval signature fields contain real evidence. This runbook is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const minimumPacket = readJson(MINIMUM_PACKET_PATH);
const intakeBatches = readJson(INTAKE_BATCHES_PATH);
const ownerEvidenceAudit = readJson(OWNER_EVIDENCE_AUDIT_PATH);
const minimumApplicationAudit = readJson(MINIMUM_APPLICATION_AUDIT_PATH);
const existingRunbook = existsSync(RUNBOOK_JSON_PATH) ? readJson(RUNBOOK_JSON_PATH) : null;

const minimumOwnerRows = (minimumPacket.placeholder_decision_rows ?? []).map((row) => ({
  decision_id: row.decision_id,
  title: row.title,
  coverage_domain: row.coverage_domain,
  covered_target_count: row.covered_target_count,
  required_owner_basis: row.required_owner_basis,
  status_to_record_after_real_owner_evidence: row.status_to_use_after_approval,
  source_packet_row_is_placeholder_only: row.template_only_not_approved === true,
  owner_input_required: row.owner_input_required === true,
  real_owner_row_required: row.real_owner_row_required === true
}));

const batches = (intakeBatches.batches ?? []).map((batch) => ({
  batch_id: batch.batch_id,
  title: batch.title,
  primary_resolution_lane: batch.primary_resolution_lane,
  target_count: batch.target_count,
  required_action: batch.required_action
}));

const report = {
  schema_version: "law-firm-os.launch-owner-decision-intake-runbook.v0.1",
  generated_at: existingRunbook?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MINIMUM_PACKET_PATH,
    INTAKE_BATCHES_PATH,
    OWNER_EVIDENCE_AUDIT_PATH,
    MINIMUM_APPLICATION_AUDIT_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    runbook_only: true,
    go_live_approved_by_this_runbook: false,
    owner_deferrals_approved_by_this_runbook: false,
    launch_decision_register_modified_by_this_runbook: false,
    placeholders_count_as_owner_evidence: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    decision_register_total_rows: ownerEvidenceAudit.summary.decision_register_total_rows,
    owner_evidence_quality_pass_count: ownerEvidenceAudit.summary.owner_evidence_quality_pass_count,
    minimum_owner_row_count: minimumOwnerRows.length,
    target_count_if_minimum_owner_rows_are_completed: minimumPacket.summary.covered_target_count_if_owner_rows_are_completed,
    valid_applied_minimum_decision_row_count: minimumApplicationAudit.summary.valid_applied_minimum_decision_row_count,
    remaining_target_count_after_valid_applied_rows: minimumApplicationAudit.summary.remaining_target_count_after_valid_applied_rows,
    intake_batch_count: intakeBatches.summary.batch_count,
    owner_input_required_count: intakeBatches.summary.owner_input_required_count
  },
  required_register_fields: REQUIRED_REGISTER_FIELDS,
  allowed_deferral_status: "deferred(시한 명기)",
  signature_ref_formats: SIGNATURE_REF_FORMATS,
  minimum_owner_rows: minimumOwnerRows,
  intake_batches: batches,
  validation_commands: VALIDATION_COMMANDS
};

mkdirSync(dirname(RUNBOOK_JSON_PATH), { recursive: true });
writeFileSync(RUNBOOK_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(RUNBOOK_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: RUNBOOK_JSON_PATH,
  report_markdown: RUNBOOK_MD_PATH,
  minimum_owner_row_count: report.summary.minimum_owner_row_count,
  target_count_if_minimum_owner_rows_are_completed: report.summary.target_count_if_minimum_owner_rows_are_completed,
  valid_applied_minimum_decision_row_count: report.summary.valid_applied_minimum_decision_row_count,
  remaining_target_count_after_valid_applied_rows: report.summary.remaining_target_count_after_valid_applied_rows,
  intake_batch_count: report.summary.intake_batch_count
}, null, 2));
