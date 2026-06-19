#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const COVERAGE_OPTIONS_PATH = "docs/launch/launch-deferral-coverage-options.json";
const REPORT_JSON_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const REPORT_MD_PATH = "docs/launch/launch-minimum-deferral-decision-packet.md";

const OWNER_PLACEHOLDER = "<OWNER_ROLE_AND_NAME_REQUIRED>";
const DECISION_PLACEHOLDER = "<OWNER_DEFERRAL_DECISION_REQUIRED>";
const BASIS_PLACEHOLDER = "<OWNER_DEFERRAL_BASIS_REQUIRED>";
const DATE_PLACEHOLDER = "<TARGET_DATE_OR_REVISIT_GATE_REQUIRED>";
const SIGNATURE_PLACEHOLDER = "<APPROVAL_SIGNATURE_REFERENCE_REQUIRED>";
const STATUS_AFTER_APPROVAL = "deferred(시한 명기)";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function titleFor(row) {
  if (row.decision_id === "COVERAGE-ALL-GO-LIVE") return "Owner deferral for all failed G1-G10 gate evidence";
  if (row.decision_id === "COVERAGE-L9-STABILIZATION") return "Owner deferral for all L9 stabilization criteria";
  if (row.decision_id === "COVERAGE-ALL-BLOCKED-WP") return "Owner deferral for all blocked launch work packages";
  if (row.decision_id === "COVERAGE-ALL-PHASE-EXITS") return "Owner deferral for all PRE-L9 phase exits";
  return `Owner deferral for ${row.decision_id}`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Minimum Deferral Decision Packet");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This is a placeholder-only decision packet.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- It cannot be counted as owner approval until every placeholder is replaced with real owner evidence.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Placeholder Register Rows");
  lines.push("");
  lines.push("| Decision ID | Title | Owner | Decision | Basis | Date/revisit gate | Approval signature | Status to use only after approval | Targets |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | ---: |");
  for (const row of report.placeholder_decision_rows) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.title)} | ${markdownCell(row.owner_required_placeholder)} | ${markdownCell(row.decision_required_placeholder)} | ${markdownCell(row.basis_required_placeholder)} | ${markdownCell(row.date_or_revisit_gate_required_placeholder)} | ${markdownCell(row.approval_signature_required_placeholder)} | ${markdownCell(row.status_to_use_after_approval)} | ${row.covered_target_count} |`);
  }
  lines.push("");
  lines.push("## Register Copy Rule");
  lines.push("");
  lines.push("Copy no row into the launch decision register until the owner, decision, basis, date or revisit gate, and approval signature fields are real evidence. This packet is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const coverageOptions = readJson(COVERAGE_OPTIONS_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const minimumRows = coverageOptions.minimum_all_target_routing_bundle?.decision_rows ?? [];
const placeholderRows = minimumRows.map((row) => ({
  decision_id: row.decision_id,
  title: titleFor(row),
  owner_required_placeholder: OWNER_PLACEHOLDER,
  decision_required_placeholder: DECISION_PLACEHOLDER,
  basis_required_placeholder: BASIS_PLACEHOLDER,
  date_or_revisit_gate_required_placeholder: DATE_PLACEHOLDER,
  approval_signature_required_placeholder: SIGNATURE_PLACEHOLDER,
  status_to_use_after_approval: STATUS_AFTER_APPROVAL,
  coverage_domain: row.coverage_domain,
  covered_target_count: row.covered_target_count,
  covered_target_ids: row.covered_target_ids,
  required_owner_basis: row.required_owner_basis,
  source_decision_option_type: row.option_type,
  template_only_not_approved: true,
  owner_input_required: true,
  real_owner_row_required: true
}));

const coveredTargetIds = [...new Set(placeholderRows.flatMap((row) => row.covered_target_ids ?? []))].sort();
const report = {
  schema_version: "law-firm-os.launch-minimum-deferral-decision-packet.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    COVERAGE_OPTIONS_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    placeholder_only: true,
    go_live_approved_by_this_packet: false,
    owner_deferrals_approved_by_this_packet: false,
    launch_decision_register_modified_by_this_packet: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    source_missing_deferral_target_count: coverageOptions.summary.missing_deferral_target_count,
    source_minimum_bundle_decision_id_count: coverageOptions.summary.minimum_bundle_decision_id_count,
    placeholder_decision_row_count: placeholderRows.length,
    covered_target_count_if_owner_rows_are_completed: coveredTargetIds.length,
    uncovered_target_count_if_owner_rows_are_completed: coverageOptions.summary.missing_deferral_target_count - coveredTargetIds.length,
    placeholder_row_count: placeholderRows.filter((row) => row.template_only_not_approved).length
  },
  placeholder_decision_rows: placeholderRows
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  placeholder_decision_row_count: report.summary.placeholder_decision_row_count,
  covered_target_count_if_owner_rows_are_completed: report.summary.covered_target_count_if_owner_rows_are_completed,
  uncovered_target_count_if_owner_rows_are_completed: report.summary.uncovered_target_count_if_owner_rows_are_completed,
  placeholder_row_count: report.summary.placeholder_row_count
}, null, 2));
