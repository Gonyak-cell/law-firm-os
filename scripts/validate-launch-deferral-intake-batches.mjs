#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const ACTION_CROSSWALK_AUDIT_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.json";
const RESOLUTION_LANES_AUDIT_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const DECISION_REGISTER_TEMPLATE_PATH = "docs/launch/launch-deferral-decision-register-template.json";
const INTAKE_BATCHES_JSON_PATH = "docs/launch/launch-deferral-intake-batches.json";
const INTAKE_BATCHES_MD_PATH = "docs/launch/launch-deferral-intake-batches.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-deferral-intake-batches-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-deferral-intake-batches-validation.md";

const EXPECTED_BATCH_LANES = [
  "external_dependency",
  "owner_decision_signature",
  "policy_scope_decision",
  "runtime_operational_evidence",
  "evidence_completion",
  "go_live_gate_evidence",
  "phase_exit_closure_or_deferral",
  "l9_stabilization_measurement"
];

const REQUIRED_MARKDOWN_PHRASES = [
  "intake routing package only",
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

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Intake Batches Validation");
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
  lines.push("- This validation checks intake routing only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It confirms the launch decision register remains unmodified by the intake package.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const actionCrosswalkAudit = readJson(ACTION_CROSSWALK_AUDIT_PATH);
const resolutionLanesAudit = readJson(RESOLUTION_LANES_AUDIT_PATH);
const decisionRegisterTemplate = readJson(DECISION_REGISTER_TEMPLATE_PATH);
const intakeBatches = readJson(INTAKE_BATCHES_JSON_PATH);
const intakeMarkdown = readText(INTAKE_BATCHES_MD_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];

if (actionCrosswalkAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "ACTION_CROSSWALK_NOT_PASS", "Deferral action crosswalk audit must pass before intake batches are valid.", {
    actual: actionCrosswalkAudit.verdict
  });
}

if (resolutionLanesAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "RESOLUTION_LANES_NOT_PASS", "Deferral resolution lanes audit must pass before intake batches are valid.", {
    actual: resolutionLanesAudit.verdict
  });
}

if (intakeBatches.schema_version !== "law-firm-os.launch-deferral-intake-batches.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected launch deferral intake batches schema version.", {
    actual: intakeBatches.schema_version
  });
}

const expectedBoundary = {
  intake_routing_only: true,
  go_live_approved_by_this_package: false,
  owner_deferrals_approved_by_this_package: false,
  launch_decision_register_modified_by_this_package: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (intakeBatches.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Intake package boundary field ${key} drifted.`, {
      expected,
      actual: intakeBatches.boundary?.[key]
    });
  }
}

const targetRows = intakeBatches.targets ?? [];
const batchRows = intakeBatches.batches ?? [];
const laneRows = resolutionLanesAudit.lane_rows ?? [];
const templateRows = decisionRegisterTemplate.template_rows ?? [];
const targetIds = targetRows.map((row) => row.coverage_id);
const laneIds = laneRows.map((row) => row.coverage_id);
const templateIds = templateRows.map((row) => row.coverage_id);
const targetIdSet = new Set(targetIds);
const laneIdSet = new Set(laneIds);
const templateIdSet = new Set(templateIds);
const templateByCoverageId = new Map(templateRows.map((row) => [row.coverage_id, row]));

if (targetRows.length !== resolutionLanesAudit.summary.missing_deferral_target_count) {
  addFinding(findings, "P1", "TARGET_COUNT_MISMATCH", "Intake target count does not match missing deferral target count.", {
    expected: resolutionLanesAudit.summary.missing_deferral_target_count,
    actual: targetRows.length
  });
}

if (targetRows.length !== templateRows.length) {
  addFinding(findings, "P1", "TEMPLATE_TARGET_COUNT_MISMATCH", "Intake target count does not match decision-register template row count.", {
    template_rows: templateRows.length,
    intake_targets: targetRows.length
  });
}

const duplicateTargetIds = duplicateValues(targetIds);
if (duplicateTargetIds.length > 0) {
  addFinding(findings, "P1", "DUPLICATE_TARGET_COVERAGE_ID", "Intake targets include duplicate coverage IDs.", {
    duplicate_coverage_ids: duplicateTargetIds
  });
}

const missingFromIntake = laneIds.filter((coverageId) => !targetIdSet.has(coverageId));
if (missingFromIntake.length > 0) {
  addFinding(findings, "P1", "MISSING_LANE_TARGET", "Resolution lane targets are missing from intake batches.", {
    missing_coverage_ids: missingFromIntake
  });
}

const unknownTargets = targetIds.filter((coverageId) => !laneIdSet.has(coverageId));
if (unknownTargets.length > 0) {
  addFinding(findings, "P1", "UNKNOWN_INTAKE_TARGET", "Intake batch targets are not present in resolution lanes.", {
    unknown_coverage_ids: unknownTargets
  });
}

const missingTemplateTargets = targetIds.filter((coverageId) => !templateIdSet.has(coverageId));
if (missingTemplateTargets.length > 0) {
  addFinding(findings, "P1", "MISSING_TEMPLATE_TARGET", "Intake batch targets are missing decision-register template rows.", {
    missing_coverage_ids: missingTemplateTargets
  });
}

const batchLaneIds = batchRows.map((batch) => batch.primary_resolution_lane);
for (const expectedLane of EXPECTED_BATCH_LANES) {
  if (!batchLaneIds.includes(expectedLane)) {
    addFinding(findings, "P1", "MISSING_EXPECTED_BATCH_LANE", "Expected intake batch lane is missing.", {
      lane: expectedLane
    });
  }
}

for (const lane of batchLaneIds) {
  if (!EXPECTED_BATCH_LANES.includes(lane)) {
    addFinding(findings, "P1", "UNEXPECTED_BATCH_LANE", "Unexpected intake batch lane is present.", {
      lane
    });
  }
}

const targetRowsByBatchId = new Map();
for (const target of targetRows) {
  const batch = batchRows.find((candidate) => candidate.primary_resolution_lane === target.primary_resolution_lane);
  if (!batch) {
    addFinding(findings, "P1", "TARGET_WITHOUT_BATCH", "Intake target has no matching batch.", {
      coverage_id: target.coverage_id,
      lane: target.primary_resolution_lane
    });
    continue;
  }
  const rows = targetRowsByBatchId.get(batch.batch_id) ?? [];
  rows.push(target);
  targetRowsByBatchId.set(batch.batch_id, rows);
}

for (const batch of batchRows) {
  const flatRows = targetRowsByBatchId.get(batch.batch_id) ?? [];
  if (batch.target_count !== flatRows.length || (batch.targets ?? []).length !== flatRows.length) {
    addFinding(findings, "P1", "BATCH_TARGET_COUNT_MISMATCH", "Batch target count does not match flattened intake rows.", {
      batch_id: batch.batch_id,
      target_count: batch.target_count,
      embedded_target_count: (batch.targets ?? []).length,
      flat_target_count: flatRows.length
    });
  }
}

for (const target of targetRows) {
  const template = templateByCoverageId.get(target.coverage_id);
  if (target.approval_state !== "not_approved_template_only") {
    addFinding(findings, "P0", "TARGET_APPROVAL_STATE_NOT_SAFE", "Intake target is not explicitly marked as not approved.", {
      coverage_id: target.coverage_id,
      actual: target.approval_state
    });
  }
  if (target.owner_input_required !== true || target.real_evidence_or_owner_deferral_required !== true) {
    addFinding(findings, "P1", "TARGET_REQUIRED_ACTION_FLAGS_MISSING", "Intake target does not require owner input and real evidence or owner deferral.", {
      coverage_id: target.coverage_id
    });
  }
  if (!target.recommended_decision_id) {
    addFinding(findings, "P1", "TARGET_RECOMMENDED_DECISION_ID_MISSING", "Intake target is missing a recommended decision ID.", {
      coverage_id: target.coverage_id
    });
  }
  if (template && target.recommended_decision_id !== template.recommended_decision_id) {
    addFinding(findings, "P1", "TARGET_TEMPLATE_DECISION_ID_MISMATCH", "Intake target recommended decision ID does not match its template row.", {
      coverage_id: target.coverage_id,
      expected: template.recommended_decision_id,
      actual: target.recommended_decision_id
    });
  }
  if (!Array.isArray(target.owner_decision_fields_required) || target.owner_decision_fields_required.length < 5) {
    addFinding(findings, "P1", "TARGET_OWNER_FIELDS_INCOMPLETE", "Intake target does not list all required owner decision fields.", {
      coverage_id: target.coverage_id
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0 || decisionSummary.valid_decided_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_MODIFIED_BY_INTAKE_PACKAGE", "Launch decision register contains decision rows while intake batches are routing-only.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    valid_decided_rows: decisionSummary.valid_decided_rows
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!intakeMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Intake markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-intake-batches.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    INTAKE_BATCHES_JSON_PATH,
    INTAKE_BATCHES_MD_PATH,
    ACTION_CROSSWALK_AUDIT_PATH,
    RESOLUTION_LANES_AUDIT_PATH,
    DECISION_REGISTER_TEMPLATE_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    intake_target_count: targetRows.length,
    source_missing_deferral_target_count: resolutionLanesAudit.summary.missing_deferral_target_count,
    template_row_count: templateRows.length,
    batch_count: batchRows.length,
    non_empty_batch_count: batchRows.filter((batch) => batch.target_count > 0).length,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    not_approved_target_count: targetRows.filter((target) => target.approval_state === "not_approved_template_only").length,
    template_matched_target_count: targetRows.filter((target) => templateIdSet.has(target.coverage_id)).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_intake_routing_only: true,
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
  intake_target_count: report.summary.intake_target_count,
  batch_count: report.summary.batch_count,
  non_empty_batch_count: report.summary.non_empty_batch_count,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
