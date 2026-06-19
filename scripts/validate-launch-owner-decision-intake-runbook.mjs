#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RUNBOOK_JSON_PATH = "docs/launch/launch-owner-decision-intake-runbook.json";
const RUNBOOK_MD_PATH = "docs/launch/launch-owner-decision-intake-runbook.md";
const MINIMUM_PACKET_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const INTAKE_BATCHES_PATH = "docs/launch/launch-deferral-intake-batches.json";
const OWNER_EVIDENCE_AUDIT_PATH = "docs/launch/launch-decision-register-owner-evidence-audit.json";
const MINIMUM_APPLICATION_AUDIT_PATH = "docs/launch/launch-minimum-deferral-application-audit.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-owner-decision-intake-runbook-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-owner-decision-intake-runbook-validation.md";

const REQUIRED_FIELDS = [
  "decision_id",
  "title",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature",
  "status"
];

const REQUIRED_COMMANDS = [
  "node scripts/validate-launch-decision-register.mjs",
  "node scripts/audit-launch-decision-register-owner-evidence.mjs",
  "node scripts/audit-launch-minimum-deferral-application.mjs",
  "node scripts/audit-launch-deferral-coverage.mjs",
  "node scripts/audit-launch-goal-completion.mjs",
  "node scripts/audit-launch-no-go-claim-policy.mjs"
];

const REQUIRED_SIGNATURE_FORMATS = [
  "docs/<local-evidence-path>",
  "external:<system-and-record-id>",
  "signature:<signature-record-id>",
  "approval:<approval-record-id>",
  "email:<message-id-or-thread-ref>",
  "ticket:<ticket-id>",
  "meeting:<meeting-id-or-minutes-ref>"
];

const REQUIRED_MARKDOWN_PHRASES = [
  "intake guide only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Full Claude review remains waived"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function sameSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Decision Intake Runbook Validation");
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
  lines.push("- This validation checks the owner decision intake runbook only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const runbook = readJson(RUNBOOK_JSON_PATH);
const runbookMarkdown = readText(RUNBOOK_MD_PATH);
const minimumPacket = readJson(MINIMUM_PACKET_PATH);
const intakeBatches = readJson(INTAKE_BATCHES_PATH);
const ownerEvidenceAudit = readJson(OWNER_EVIDENCE_AUDIT_PATH);
const minimumApplicationAudit = readJson(MINIMUM_APPLICATION_AUDIT_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (runbook.schema_version !== "law-firm-os.launch-owner-decision-intake-runbook.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner decision intake runbook schema version.", {
    actual: runbook.schema_version
  });
}

const expectedBoundary = {
  runbook_only: true,
  go_live_approved_by_this_runbook: false,
  owner_deferrals_approved_by_this_runbook: false,
  launch_decision_register_modified_by_this_runbook: false,
  placeholders_count_as_owner_evidence: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (runbook.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Owner decision intake runbook boundary field ${key} drifted.`, {
      expected,
      actual: runbook.boundary?.[key]
    });
  }
}

const rows = runbook.minimum_owner_rows ?? [];
const packetRows = minimumPacket.placeholder_decision_rows ?? [];
const rowIds = rows.map((row) => row.decision_id);
const packetRowIds = packetRows.map((row) => row.decision_id);

if (!sameSet(rowIds, packetRowIds)) {
  addFinding(findings, "P1", "MINIMUM_ROW_IDS_MISMATCH", "Runbook minimum owner rows do not match the minimum deferral decision packet.", {
    expected: packetRowIds,
    actual: rowIds
  });
}

if (rows.length !== minimumPacket.summary.placeholder_decision_row_count) {
  addFinding(findings, "P1", "MINIMUM_ROW_COUNT_MISMATCH", "Runbook minimum owner row count does not match the minimum packet.", {
    expected: minimumPacket.summary.placeholder_decision_row_count,
    actual: rows.length
  });
}

for (const row of rows) {
  if (row.status_to_record_after_real_owner_evidence !== "deferred(시한 명기)") {
    addFinding(findings, "P1", "RUNBOOK_ROW_STATUS_INVALID", "Runbook minimum row has an invalid deferral status.", {
      decision_id: row.decision_id,
      actual: row.status_to_record_after_real_owner_evidence
    });
  }
  if (row.source_packet_row_is_placeholder_only !== true || row.owner_input_required !== true || row.real_owner_row_required !== true) {
    addFinding(findings, "P0", "RUNBOOK_ROW_BOUNDARY_MISSING", "Runbook minimum row is not explicitly tied to placeholder-only source rows and real owner input.", {
      decision_id: row.decision_id
    });
  }
}

if (runbook.summary?.decision_register_total_rows !== ownerEvidenceAudit.summary.decision_register_total_rows) {
  addFinding(findings, "P1", "DECISION_REGISTER_ROW_COUNT_DRIFT", "Runbook decision register row count does not match owner-evidence audit.", {
    expected: ownerEvidenceAudit.summary.decision_register_total_rows,
    actual: runbook.summary?.decision_register_total_rows
  });
}

if (runbook.summary?.valid_applied_minimum_decision_row_count !== minimumApplicationAudit.summary.valid_applied_minimum_decision_row_count) {
  addFinding(findings, "P1", "VALID_APPLIED_MINIMUM_ROWS_DRIFT", "Runbook valid applied minimum row count does not match minimum application audit.", {
    expected: minimumApplicationAudit.summary.valid_applied_minimum_decision_row_count,
    actual: runbook.summary?.valid_applied_minimum_decision_row_count
  });
}

if (runbook.summary?.remaining_target_count_after_valid_applied_rows !== minimumApplicationAudit.summary.remaining_target_count_after_valid_applied_rows) {
  addFinding(findings, "P1", "REMAINING_TARGET_COUNT_DRIFT", "Runbook remaining target count does not match minimum application audit.", {
    expected: minimumApplicationAudit.summary.remaining_target_count_after_valid_applied_rows,
    actual: runbook.summary?.remaining_target_count_after_valid_applied_rows
  });
}

if (runbook.summary?.target_count_if_minimum_owner_rows_are_completed !== minimumPacket.summary.covered_target_count_if_owner_rows_are_completed) {
  addFinding(findings, "P1", "MINIMUM_TARGET_COUNT_DRIFT", "Runbook potential minimum coverage count does not match the minimum packet.", {
    expected: minimumPacket.summary.covered_target_count_if_owner_rows_are_completed,
    actual: runbook.summary?.target_count_if_minimum_owner_rows_are_completed
  });
}

if (runbook.summary?.intake_batch_count !== intakeBatches.summary.batch_count) {
  addFinding(findings, "P1", "INTAKE_BATCH_COUNT_DRIFT", "Runbook intake batch count does not match intake batches.", {
    expected: intakeBatches.summary.batch_count,
    actual: runbook.summary?.intake_batch_count
  });
}

if (!sameSet(runbook.required_register_fields ?? [], REQUIRED_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_FIELDS_MISMATCH", "Runbook required register fields drifted.", {
    expected: REQUIRED_FIELDS,
    actual: runbook.required_register_fields
  });
}

if (JSON.stringify(runbook.validation_commands ?? []) !== JSON.stringify(REQUIRED_COMMANDS)) {
  addFinding(findings, "P1", "VALIDATION_COMMAND_SEQUENCE_MISMATCH", "Runbook validation command sequence drifted.", {
    expected: REQUIRED_COMMANDS,
    actual: runbook.validation_commands
  });
}

const signatureFormats = (runbook.signature_ref_formats ?? []).map((item) => item.format);
if (!sameSet(signatureFormats, REQUIRED_SIGNATURE_FORMATS)) {
  addFinding(findings, "P1", "SIGNATURE_FORMATS_MISMATCH", "Runbook signature reference formats drifted.", {
    expected: REQUIRED_SIGNATURE_FORMATS,
    actual: signatureFormats
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!runbookMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Runbook markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-decision-intake-runbook.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RUNBOOK_JSON_PATH,
    RUNBOOK_MD_PATH,
    MINIMUM_PACKET_PATH,
    INTAKE_BATCHES_PATH,
    OWNER_EVIDENCE_AUDIT_PATH,
    MINIMUM_APPLICATION_AUDIT_PATH
  ],
  verdict,
  summary: {
    minimum_owner_row_count: rows.length,
    expected_minimum_owner_row_count: minimumPacket.summary.placeholder_decision_row_count,
    target_count_if_minimum_owner_rows_are_completed: runbook.summary?.target_count_if_minimum_owner_rows_are_completed ?? null,
    decision_register_total_rows: runbook.summary?.decision_register_total_rows ?? null,
    valid_applied_minimum_decision_row_count: runbook.summary?.valid_applied_minimum_decision_row_count ?? null,
    remaining_target_count_after_valid_applied_rows: runbook.summary?.remaining_target_count_after_valid_applied_rows ?? null,
    intake_batch_count: runbook.summary?.intake_batch_count ?? null,
    validation_command_count: (runbook.validation_commands ?? []).length,
    signature_ref_format_count: signatureFormats.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_runbook_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    closed_cp_evidence_is_read_only: true
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: VALIDATION_JSON_PATH,
  report_markdown: VALIDATION_MD_PATH,
  verdict,
  minimum_owner_row_count: report.summary.minimum_owner_row_count,
  target_count_if_minimum_owner_rows_are_completed: report.summary.target_count_if_minimum_owner_rows_are_completed,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  valid_applied_minimum_decision_row_count: report.summary.valid_applied_minimum_decision_row_count,
  remaining_target_count_after_valid_applied_rows: report.summary.remaining_target_count_after_valid_applied_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
