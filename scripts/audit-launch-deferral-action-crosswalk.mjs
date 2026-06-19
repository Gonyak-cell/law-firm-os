#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const OWNER_ACTION_PACKAGE_PATH = "docs/launch/owner-action-deferral-request.json";
const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const PHASE_EXIT_AUDIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const CLOSURE_DEPENDENCY_GRAPH_PATH = "docs/launch/launch-closure-dependency-graph.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = row[field] ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function evidenceActionSummary(action) {
  if (!action) return "";
  return action.decision_needed ?? action.action_needed ?? "";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Action Crosswalk Audit");
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
  lines.push("## Domain Summary");
  lines.push("");
  lines.push("| Domain | Count |");
  lines.push("| --- | ---: |");
  for (const row of report.domain_counts) {
    lines.push(`| ${markdownCell(row.value)} | ${row.count} |`);
  }
  lines.push("");
  lines.push("## Missing Deferral Crosswalk");
  lines.push("");
  lines.push("| Domain | Coverage | Action source | Action ref | Accepted decision IDs |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of report.crosswalk_rows) {
    lines.push(`| ${markdownCell(row.domain)} | ${markdownCell(row.coverage_id)} | ${markdownCell(row.action_source)} | ${markdownCell(row.action_ref)} | ${row.accepted_decision_ids.map(markdownCell).join("<br>")} |`);
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
  lines.push("- This audit links missing deferral targets to existing owner/intake/phase action records.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not create or modify launch decision register rows.");
  lines.push("- It does not replace real runtime, security, M365, legal, pilot, UAT, or hypercare evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const ownerActionPackage = readJson(OWNER_ACTION_PACKAGE_PATH);
const manualIntake = readJson(MANUAL_INTAKE_PATH);
const phaseExitAudit = readJson(PHASE_EXIT_AUDIT_PATH);
const closureDependencyGraph = readJson(CLOSURE_DEPENDENCY_GRAPH_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

const ownerActionByWpId = new Map((ownerActionPackage.blocked_work_package_actions ?? []).map((row) => [row.wp_id, row]));
const failedGateActionByGateId = new Map((ownerActionPackage.failed_gate_actions ?? []).map((row) => [row.gate_id, row]));
const manualGateIntakeByKey = new Map((manualIntake.gate_intake ?? []).map((row) => [`${row.gate_id}:${row.evidence_id}`, row]));
const manualL9IntakeById = new Map((manualIntake.l9_stabilization_intake ?? []).map((row) => [row.intake_id, row]));
const phaseById = new Map((phaseExitAudit.phases ?? []).map((row) => [row.phase, row]));
const gateNodeById = new Map((closureDependencyGraph.gate_nodes ?? []).map((row) => [row.gate_id, row]));

if (deferralCoverageAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "DEFERRAL_COVERAGE_AUDIT_NOT_PASS", "Deferral coverage audit must pass before the action crosswalk can be trusted.", {
    actual: deferralCoverageAudit.verdict
  });
}

const missingRows = Object.values(deferralCoverageAudit.coverage_rows ?? {})
  .flatMap((rows) => rows ?? [])
  .filter((row) => row.coverage_status === "missing_owner_deferral");

const crosswalkRows = missingRows.map((row) => {
  if (row.domain === "go_live_gate_evidence") {
    const manualRow = manualGateIntakeByKey.get(`${row.gate_id}:${row.evidence_id}`);
    const gateAction = failedGateActionByGateId.get(row.gate_id);
    const gateNode = gateNodeById.get(row.gate_id);
    return {
      coverage_id: row.coverage_id,
      domain: row.domain,
      coverage_status: row.coverage_status,
      accepted_decision_ids: row.accepted_decision_ids ?? [],
      action_source: manualRow && gateAction ? "manual_intake_and_failed_gate_action" : manualRow ? "manual_intake_only" : gateAction ? "failed_gate_action_only" : "missing_action_source",
      action_ref: manualRow?.intake_id ?? row.evidence_id,
      gate_id: row.gate_id,
      evidence_id: row.evidence_id,
      required_state: manualRow?.required_state ?? null,
      related_blocked_work_package_ids: gateNode?.related_blocked_wp_ids ?? [],
      next_required_action: "Provide required gate evidence, or record an owner-approved deferral using one accepted decision ID."
    };
  }
  if (row.domain === "l9_stabilization_closure") {
    const manualRow = manualL9IntakeById.get(row.intake_id);
    return {
      coverage_id: row.coverage_id,
      domain: row.domain,
      coverage_status: row.coverage_status,
      accepted_decision_ids: row.accepted_decision_ids ?? [],
      action_source: manualRow ? "l9_manual_intake" : "missing_action_source",
      action_ref: manualRow?.intake_id ?? row.intake_id,
      intake_id: row.intake_id,
      closure_criterion: row.closure_criterion,
      current_status: manualRow?.current_status ?? null,
      next_required_action: "Provide measured L9 stabilization evidence, or record an owner-approved deferral using one accepted decision ID."
    };
  }
  if (row.domain === "blocked_work_package") {
    const ownerAction = ownerActionByWpId.get(row.wp_id);
    return {
      coverage_id: row.coverage_id,
      domain: row.domain,
      coverage_status: row.coverage_status,
      accepted_decision_ids: row.accepted_decision_ids ?? [],
      action_source: ownerAction ? "owner_action_package" : "missing_action_source",
      action_ref: ownerAction?.evidence_base ?? row.wp_id,
      wp_id: row.wp_id,
      phase: row.phase,
      blocker_categories: ownerAction?.blocker_categories ?? [],
      command_status: row.command_status,
      next_required_action: evidenceActionSummary(ownerAction?.next_required_action) || "Provide real completion evidence, or record an owner-approved deferral using one accepted decision ID."
    };
  }
  if (row.domain === "phase_exit") {
    const phase = phaseById.get(row.phase);
    return {
      coverage_id: row.coverage_id,
      domain: row.domain,
      coverage_status: row.coverage_status,
      accepted_decision_ids: row.accepted_decision_ids ?? [],
      action_source: phase ? "phase_exit_readiness_audit" : "missing_action_source",
      action_ref: phase?.exit_gate ?? row.exit_gate,
      phase: row.phase,
      exit_gate: row.exit_gate,
      blocked_wp_ids: phase?.blocked_wp_ids ?? [],
      next_required_action: "Close the phase through real WP evidence, or record a phase-exit owner-approved deferral using one accepted decision ID."
    };
  }
  return {
    coverage_id: row.coverage_id,
    domain: row.domain,
    coverage_status: row.coverage_status,
    accepted_decision_ids: row.accepted_decision_ids ?? [],
    action_source: "unknown_domain",
    action_ref: row.coverage_id,
    next_required_action: "Investigate unknown deferral coverage domain."
  };
});

for (const row of crosswalkRows) {
  if (row.action_source === "missing_action_source" || row.action_source === "unknown_domain") {
    addFinding(findings, "P1", "MISSING_ACTION_SOURCE", "Missing deferral target is not linked to an actionable owner/intake/phase source.", {
      coverage_id: row.coverage_id,
      domain: row.domain,
      action_source: row.action_source
    });
  }
  if ((row.accepted_decision_ids ?? []).length === 0) {
    addFinding(findings, "P1", "MISSING_ACCEPTED_DECISION_IDS", "Missing deferral target has no accepted decision IDs.", {
      coverage_id: row.coverage_id,
      domain: row.domain
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-action-crosswalk-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DEFERRAL_COVERAGE_AUDIT_PATH,
    OWNER_ACTION_PACKAGE_PATH,
    MANUAL_INTAKE_PATH,
    PHASE_EXIT_AUDIT_PATH,
    CLOSURE_DEPENDENCY_GRAPH_PATH
  ],
  verdict,
  boundary: {
    validates_missing_deferral_action_links_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    missing_deferral_target_count: missingRows.length,
    crosswalk_row_count: crosswalkRows.length,
    action_linked_count: crosswalkRows.filter((row) => row.action_source !== "missing_action_source" && row.action_source !== "unknown_domain").length,
    missing_action_source_count: crosswalkRows.filter((row) => row.action_source === "missing_action_source" || row.action_source === "unknown_domain").length,
    gate_manual_intake_link_count: crosswalkRows.filter((row) => row.domain === "go_live_gate_evidence" && row.action_source.includes("manual_intake")).length,
    l9_manual_intake_link_count: crosswalkRows.filter((row) => row.domain === "l9_stabilization_closure" && row.action_source === "l9_manual_intake").length,
    blocked_wp_owner_action_link_count: crosswalkRows.filter((row) => row.domain === "blocked_work_package" && row.action_source === "owner_action_package").length,
    phase_exit_link_count: crosswalkRows.filter((row) => row.domain === "phase_exit" && row.action_source === "phase_exit_readiness_audit").length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  domain_counts: countBy(crosswalkRows, "domain"),
  action_source_counts: countBy(crosswalkRows, "action_source"),
  crosswalk_rows: crosswalkRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  missing_deferral_target_count: report.summary.missing_deferral_target_count,
  action_linked_count: report.summary.action_linked_count,
  missing_action_source_count: report.summary.missing_action_source_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
