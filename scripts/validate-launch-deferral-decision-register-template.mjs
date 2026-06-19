#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const RESOLUTION_LANES_AUDIT_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const TEMPLATE_JSON_PATH = "docs/launch/launch-deferral-decision-register-template.json";
const TEMPLATE_MD_PATH = "docs/launch/launch-deferral-decision-register-template.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-deferral-decision-register-template-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-deferral-decision-register-template-validation.md";
const REQUIRED_PLACEHOLDERS = [
  "owner_required_placeholder",
  "decision_required_placeholder",
  "basis_required_placeholder",
  "date_or_revisit_gate_required_placeholder",
  "approval_signature_required_placeholder"
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

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Decision Register Template Validation");
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
  lines.push("- This validation checks template structure only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It confirms the launch decision register remains unmodified by the template.");
  return `${lines.join("\n")}\n`;
}

const resolutionLanesAudit = readJson(RESOLUTION_LANES_AUDIT_PATH);
const template = readJson(TEMPLATE_JSON_PATH);
const templateMarkdown = readText(TEMPLATE_MD_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];

if (template.schema_version !== "law-firm-os.launch-deferral-decision-register-template.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected deferral decision register template schema version.", {
    actual: template.schema_version
  });
}

const expectedBoundary = {
  template_only: true,
  go_live_approved_by_this_template: false,
  owner_deferrals_approved_by_this_template: false,
  launch_decision_register_modified_by_this_template: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (template.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Template boundary field ${key} drifted.`, {
      expected,
      actual: template.boundary?.[key]
    });
  }
}

const templateRows = template.template_rows ?? [];
if (templateRows.length !== resolutionLanesAudit.summary.missing_deferral_target_count) {
  addFinding(findings, "P1", "TEMPLATE_ROW_COUNT_MISMATCH", "Template row count does not match missing deferral target count.", {
    expected: resolutionLanesAudit.summary.missing_deferral_target_count,
    actual: templateRows.length
  });
}

for (const row of templateRows) {
  if (!row.recommended_decision_id) {
    addFinding(findings, "P1", "MISSING_RECOMMENDED_DECISION_ID", "Template row is missing the recommended decision id.", {
      coverage_id: row.coverage_id
    });
  }
  if (row.template_only_not_approved !== true) {
    addFinding(findings, "P0", "TEMPLATE_ROW_NOT_MARKED_UNAPPROVED", "Template row is not explicitly marked as not approved.", {
      coverage_id: row.coverage_id
    });
  }
  if (row.status_to_use_after_approval !== "deferred(시한 명기)") {
    addFinding(findings, "P1", "INVALID_STATUS_TO_USE_AFTER_APPROVAL", "Template row does not point to the required approved-deferral status.", {
      coverage_id: row.coverage_id,
      actual: row.status_to_use_after_approval
    });
  }
  const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter((field) => !String(row[field] ?? "").includes("REQUIRED"));
  if (missingPlaceholders.length > 0) {
    addFinding(findings, "P1", "TEMPLATE_PLACEHOLDER_MISSING", "Template row has non-placeholder owner approval fields.", {
      coverage_id: row.coverage_id,
      missing_placeholders: missingPlaceholders
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0 || decisionSummary.valid_decided_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_MODIFIED_BY_TEMPLATE", "Launch decision register contains decision rows while this package is template-only.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    valid_decided_rows: decisionSummary.valid_decided_rows
  });
}

for (const phrase of [
  "template-only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`"
]) {
  if (!templateMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Template markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-decision-register-template.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    TEMPLATE_JSON_PATH,
    TEMPLATE_MD_PATH,
    RESOLUTION_LANES_AUDIT_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    template_row_count: templateRows.length,
    source_missing_deferral_target_count: resolutionLanesAudit.summary.missing_deferral_target_count,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    placeholder_row_count: templateRows.filter((row) => row.template_only_not_approved === true).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_template_structure_only: true,
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
  template_row_count: report.summary.template_row_count,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  decision_register_valid_deferred_rows: report.summary.decision_register_valid_deferred_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
