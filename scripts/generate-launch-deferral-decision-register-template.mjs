#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RESOLUTION_LANES_AUDIT_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-decision-register-template.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-decision-register-template.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function titleFor(row) {
  if (row.domain === "go_live_gate_evidence") return `Owner deferral template for ${row.coverage_id}`;
  if (row.domain === "l9_stabilization_closure") return `Owner deferral template for ${row.coverage_id}`;
  if (row.domain === "blocked_work_package") return `Owner deferral template for ${row.coverage_id}`;
  if (row.domain === "phase_exit") return `Owner deferral template for ${row.coverage_id}`;
  return `Owner deferral template for ${row.coverage_id}`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Decision Register Template");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This is a template-only package.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- A row may be copied into the launch decision register only after real owner role/name, deferral basis, target date or revisit gate, and approval signature reference are supplied.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Template Rows");
  lines.push("");
  lines.push("| Recommended decision ID | Coverage | Lane | Owner | Decision | Basis | Date/revisit gate | Approval signature | Status to use only after approval | Alternatives |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of report.template_rows) {
    lines.push(`| ${markdownCell(row.recommended_decision_id)} | ${markdownCell(row.coverage_id)} | ${markdownCell(row.primary_resolution_lane)} | ${markdownCell(row.owner_required_placeholder)} | ${markdownCell(row.decision_required_placeholder)} | ${markdownCell(row.basis_required_placeholder)} | ${markdownCell(row.date_or_revisit_gate_required_placeholder)} | ${markdownCell(row.approval_signature_required_placeholder)} | ${markdownCell(row.status_to_use_after_approval)} | ${row.alternative_decision_ids.map(markdownCell).join("<br>")} |`);
  }
  lines.push("");
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("Do not copy any row into the launch decision register until all placeholder fields are replaced with real owner evidence. The template is not evidence of approval or deferral.");
  return `${lines.join("\n")}\n`;
}

const resolutionLanesAudit = readJson(RESOLUTION_LANES_AUDIT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const templateRows = (resolutionLanesAudit.lane_rows ?? []).map((row) => {
  const [recommendedDecisionId = "", ...alternativeDecisionIds] = row.accepted_decision_ids ?? [];
  return {
    coverage_id: row.coverage_id,
    domain: row.domain,
    primary_resolution_lane: row.primary_resolution_lane,
    action_source: row.action_source,
    action_ref: row.action_ref,
    recommended_decision_id: recommendedDecisionId,
    alternative_decision_ids: alternativeDecisionIds,
    title: titleFor(row),
    owner_required_placeholder: "<OWNER_ROLE_AND_NAME_REQUIRED>",
    decision_required_placeholder: "<OWNER_DEFERRAL_DECISION_REQUIRED>",
    basis_required_placeholder: "<OWNER_DEFERRAL_BASIS_REQUIRED>",
    date_or_revisit_gate_required_placeholder: "<TARGET_DATE_OR_REVISIT_GATE_REQUIRED>",
    approval_signature_required_placeholder: "<APPROVAL_SIGNATURE_REFERENCE_REQUIRED>",
    status_to_use_after_approval: "deferred(시한 명기)",
    template_only_not_approved: true,
    next_required_action: row.next_required_action
  };
});

const report = {
  schema_version: "law-firm-os.launch-deferral-decision-register-template.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RESOLUTION_LANES_AUDIT_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    template_only: true,
    go_live_approved_by_this_template: false,
    owner_deferrals_approved_by_this_template: false,
    launch_decision_register_modified_by_this_template: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    source_missing_deferral_target_count: resolutionLanesAudit.summary.missing_deferral_target_count,
    template_row_count: templateRows.length,
    recommended_decision_id_count: templateRows.filter((row) => row.recommended_decision_id).length,
    placeholder_row_count: templateRows.filter((row) => row.template_only_not_approved).length,
    primary_lane_count: resolutionLanesAudit.summary.primary_lane_count,
    unclassified_target_count: resolutionLanesAudit.summary.unclassified_target_count
  },
  template_rows: templateRows
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  template_row_count: report.summary.template_row_count,
  recommended_decision_id_count: report.summary.recommended_decision_id_count,
  placeholder_row_count: report.summary.placeholder_row_count,
  unclassified_target_count: report.summary.unclassified_target_count
}, null, 2));
