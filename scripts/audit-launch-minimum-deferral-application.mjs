#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const MINIMUM_PACKET_VALIDATION_PATH = "docs/launch/launch-minimum-deferral-decision-packet-validation.json";
const MINIMUM_PACKET_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const REPORT_JSON_PATH = "docs/launch/launch-minimum-deferral-application-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-minimum-deferral-application-audit.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Minimum Deferral Application Audit");
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
  lines.push("## Decision Row Application");
  lines.push("");
  lines.push("| Decision ID | Domain | Covered targets | Register row state |");
  lines.push("| --- | --- | ---: | --- |");
  for (const row of report.decision_rows) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} | ${markdownCell(row.register_row_state)} |`);
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
  lines.push("- This audit checks whether the placeholder-only minimum decision packet has been applied with real owner rows.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Missing rows are expected until real owner evidence is supplied.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const minimumPacketValidation = readJson(MINIMUM_PACKET_VALIDATION_PATH);
const minimumPacket = readJson(MINIMUM_PACKET_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];

if (minimumPacketValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "MINIMUM_PACKET_VALIDATION_NOT_PASS", "Minimum deferral decision packet validation must pass before application can be trusted.", {
    actual: minimumPacketValidation.verdict
  });
}

const registerRowsByDecisionId = new Map((decisionSummary.rows ?? []).map((row) => [row.decision_id, row]));
const packetRows = minimumPacket.placeholder_decision_rows ?? [];
const decisionRows = packetRows.map((packetRow) => {
  const registerRow = registerRowsByDecisionId.get(packetRow.decision_id);
  const rowState = !registerRow
    ? "missing_from_register"
    : registerRow.valid && registerRow.status_kind === "deferred"
      ? "valid_owner_deferred_row_present"
      : "present_but_not_valid_owner_deferred_row";
  return {
    decision_id: packetRow.decision_id,
    coverage_domain: packetRow.coverage_domain,
    covered_target_count: packetRow.covered_target_count,
    covered_target_ids: packetRow.covered_target_ids,
    register_row_state: rowState,
    register_line_number: registerRow?.line_number ?? null,
    register_status: registerRow?.status ?? null,
    register_missing_fields: registerRow?.missing_fields ?? [],
    register_errors: registerRow?.errors ?? []
  };
});

for (const row of decisionRows) {
  if (row.register_row_state === "present_but_not_valid_owner_deferred_row") {
    addFinding(findings, "P1", "MINIMUM_DECISION_ROW_INVALID", "Minimum packet decision ID is present in the register but is not a valid owner-deferred row.", {
      decision_id: row.decision_id,
      line_number: row.register_line_number,
      status: row.register_status,
      missing_fields: row.register_missing_fields,
      errors: row.register_errors
    });
  }
}

const validAppliedRows = decisionRows.filter((row) => row.register_row_state === "valid_owner_deferred_row_present");
const coveredTargetIdsByValidRows = unique(validAppliedRows.flatMap((row) => row.covered_target_ids ?? []));
const targetCountIfFullyApplied = minimumPacketValidation.summary.covered_target_count_if_owner_rows_are_completed;
const missingDecisionIds = decisionRows
  .filter((row) => row.register_row_state === "missing_from_register")
  .map((row) => row.decision_id);
const invalidDecisionIds = decisionRows
  .filter((row) => row.register_row_state === "present_but_not_valid_owner_deferred_row")
  .map((row) => row.decision_id);
const applicationCoverageReady =
  decisionRows.length > 0 &&
  validAppliedRows.length === decisionRows.length &&
  coveredTargetIdsByValidRows.length === targetCountIfFullyApplied;

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-minimum-deferral-application-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MINIMUM_PACKET_VALIDATION_PATH,
    MINIMUM_PACKET_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  boundary: {
    validates_minimum_packet_application_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    minimum_packet_decision_row_count: decisionRows.length,
    valid_applied_minimum_decision_row_count: validAppliedRows.length,
    missing_minimum_decision_row_count: missingDecisionIds.length,
    invalid_minimum_decision_row_count: invalidDecisionIds.length,
    application_coverage_ready: applicationCoverageReady,
    target_count_if_fully_applied: targetCountIfFullyApplied,
    covered_target_count_by_valid_applied_rows: coveredTargetIdsByValidRows.length,
    remaining_target_count_after_valid_applied_rows: targetCountIfFullyApplied - coveredTargetIdsByValidRows.length,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  missing_decision_ids: missingDecisionIds,
  invalid_decision_ids: invalidDecisionIds,
  decision_rows: decisionRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  application_coverage_ready: report.summary.application_coverage_ready,
  minimum_packet_decision_row_count: report.summary.minimum_packet_decision_row_count,
  valid_applied_minimum_decision_row_count: report.summary.valid_applied_minimum_decision_row_count,
  missing_minimum_decision_row_count: report.summary.missing_minimum_decision_row_count,
  covered_target_count_by_valid_applied_rows: report.summary.covered_target_count_by_valid_applied_rows,
  remaining_target_count_after_valid_applied_rows: report.summary.remaining_target_count_after_valid_applied_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
