#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const PHASE_EXIT_AUDIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const MANUAL_INTAKE_VALIDATION_PATH = "docs/launch/launch-manual-evidence-intake-validation.json";
const OWNER_ACTION_PACKAGE_PATH = "docs/launch/owner-action-deferral-request.json";
const OWNER_ACTION_VALIDATION_PATH = "docs/launch/owner-action-deferral-request-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-blocker-surface-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-blocker-surface-audit.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function failedGateEvidenceKeys(audit) {
  const keys = [];
  for (const gateId of audit.go_live_readiness.failed_gate_ids ?? []) {
    for (const evidenceId of audit.go_live_readiness.gates?.[gateId]?.failed_evidence ?? []) {
      keys.push(`${gateId}:${evidenceId}`);
    }
  }
  return keys;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Blocker Surface Audit");
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
  lines.push("## Phase Blockers");
  lines.push("");
  lines.push("| Phase | Status | Blocked WP | Recorded WP | Missing evidence |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  for (const phase of report.phase_blockers) {
    lines.push(`| ${phase.phase} | ${phase.status} | ${phase.blocked_work_package_count} | ${phase.recorded_work_package_count} | ${phase.missing_evidence_count} |`);
  }
  lines.push("");
  lines.push("## Failed Gate Surface");
  lines.push("");
  lines.push("| Gate | Status | Failed evidence slots | Manual intake rows | Related blocked WP |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  for (const gate of report.gate_blockers) {
    lines.push(`| ${gate.gate_id} | ${gate.status} | ${gate.failed_evidence_slot_count} | ${gate.manual_intake_row_count} | ${gate.related_blocked_work_package_count} |`);
  }
  lines.push("");
  lines.push("## Manual Intake Resolution State");
  lines.push("");
  lines.push(`- Pending manual intake rows: ${report.summary.pending_manual_intake_row_count}`);
  lines.push(`- Evidence-satisfied manual intake rows: ${report.summary.evidence_satisfied_manual_intake_row_count}`);
  lines.push(`- Owner-deferred manual intake rows: ${report.summary.owner_deferred_manual_intake_row_count}`);
  lines.push(`- Coverage-eligible valid deferred rows: ${report.summary.coverage_eligible_valid_deferred_rows}`);
  lines.push("");
  lines.push("## Blocker Categories");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("| --- | ---: |");
  for (const category of report.blocker_category_counts) {
    lines.push(`| ${category.value} | ${category.count} |`);
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
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit summarizes the current blocker surface only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not replace real runtime, security, M365, legal, pilot, UAT, or hypercare evidence.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const launchAudit = readJson(LAUNCH_AUDIT_PATH);
const phaseExitAudit = readJson(PHASE_EXIT_AUDIT_PATH);
const manualIntake = readJson(MANUAL_INTAKE_PATH);
const manualIntakeValidation = readJson(MANUAL_INTAKE_VALIDATION_PATH);
const ownerActionPackage = readJson(OWNER_ACTION_PACKAGE_PATH);
const ownerActionValidation = readJson(OWNER_ACTION_VALIDATION_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

const blockedWps = launchAudit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_blocked");
const recordedWps = launchAudit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_recorded");
const blockedWpIds = blockedWps.map((wp) => wp.wp_id);
const recordedWpIds = recordedWps.map((wp) => wp.wp_id);
const ownerBlockedWpIds = (ownerActionPackage.blocked_work_package_actions ?? []).map((wp) => wp.wp_id);
const ownerRecordedWpIds = (ownerActionPackage.recorded_work_packages ?? []).map((wp) => wp.wp_id);
const phaseBlockedWpIds = (phaseExitAudit.phases ?? []).flatMap((phase) => phase.blocked_wp_ids ?? []);
const expectedGateEvidenceKeys = failedGateEvidenceKeys(launchAudit);
const actualGateEvidenceKeys = (manualIntake.gate_intake ?? []).map((row) => `${row.gate_id}:${row.evidence_id}`);

if (manualIntakeValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "MANUAL_INTAKE_VALIDATION_NOT_PASS", "Manual evidence intake validation is not PASS.", {
    actual: manualIntakeValidation.verdict
  });
}

if (ownerActionValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "OWNER_ACTION_VALIDATION_NOT_PASS", "Owner action package validation is not PASS.", {
    actual: ownerActionValidation.verdict
  });
}

if (!sameSet(blockedWpIds, ownerBlockedWpIds)) {
  addFinding(findings, "P0", "OWNER_BLOCKED_QUEUE_MISMATCH", "Owner action blocked WP queue does not match launch audit.", {
    expected_count: blockedWpIds.length,
    actual_count: ownerBlockedWpIds.length,
    missing: blockedWpIds.filter((id) => !ownerBlockedWpIds.includes(id)),
    unexpected: ownerBlockedWpIds.filter((id) => !blockedWpIds.includes(id))
  });
}

if (!sameSet(recordedWpIds, ownerRecordedWpIds)) {
  addFinding(findings, "P1", "OWNER_RECORDED_QUEUE_MISMATCH", "Owner action recorded WP list does not match launch audit.", {
    expected_count: recordedWpIds.length,
    actual_count: ownerRecordedWpIds.length,
    missing: recordedWpIds.filter((id) => !ownerRecordedWpIds.includes(id)),
    unexpected: ownerRecordedWpIds.filter((id) => !recordedWpIds.includes(id))
  });
}

if (!sameSet(blockedWpIds, phaseBlockedWpIds)) {
  addFinding(findings, "P0", "PHASE_BLOCKED_QUEUE_MISMATCH", "Phase-exit blocked WP list does not match launch audit.", {
    expected_count: blockedWpIds.length,
    actual_count: phaseBlockedWpIds.length,
    missing: blockedWpIds.filter((id) => !phaseBlockedWpIds.includes(id)),
    unexpected: phaseBlockedWpIds.filter((id) => !blockedWpIds.includes(id))
  });
}

if (!sameSet(expectedGateEvidenceKeys, actualGateEvidenceKeys)) {
  addFinding(findings, "P0", "MANUAL_GATE_INTAKE_MISMATCH", "Manual intake gate rows do not match failed go-live evidence slots.", {
    expected_count: expectedGateEvidenceKeys.length,
    actual_count: actualGateEvidenceKeys.length,
    missing: expectedGateEvidenceKeys.filter((key) => !actualGateEvidenceKeys.includes(key)),
    unexpected: actualGateEvidenceKeys.filter((key) => !expectedGateEvidenceKeys.includes(key))
  });
}

if (phaseExitAudit.summary.total_blocked_work_package_count !== blockedWps.length) {
  addFinding(findings, "P1", "PHASE_BLOCKED_COUNT_MISMATCH", "Phase-exit blocked count does not match launch audit blocked WP count.", {
    expected: blockedWps.length,
    actual: phaseExitAudit.summary.total_blocked_work_package_count
  });
}

if (manualIntake.summary.owner_deferred_count > 0 && !launchAudit.launch_decisions.owner_approved_deferrals_present) {
  addFinding(findings, "P1", "OWNER_DEFERRED_INTAKE_WITHOUT_OWNER_DEFERRAL", "Manual intake contains owner-deferred rows while no valid owner-approved deferral is present.", {
    owner_deferred_count: manualIntake.summary.owner_deferred_count,
    coverage_eligible_valid_deferred_rows: launchAudit.launch_decisions.coverage_eligible_valid_deferred_rows
  });
}

const phaseBlockers = (phaseExitAudit.phases ?? []).map((phase) => ({
  phase: phase.phase,
  status: phase.status,
  blocked_work_package_count: phase.blocked_count,
  recorded_work_package_count: phase.recorded_count,
  missing_evidence_count: phase.missing_evidence_count
}));

const gateBlockers = (launchAudit.go_live_readiness.failed_gate_ids ?? []).map((gateId) => {
  const gate = launchAudit.go_live_readiness.gates[gateId];
  return {
    gate_id: gateId,
    status: gate.status,
    failed_evidence_slot_count: gate.failed_evidence.length,
    manual_intake_row_count: (manualIntake.gate_intake ?? []).filter((row) => row.gate_id === gateId).length,
    related_blocked_work_package_count: blockedWps.filter((wp) => (wp.gate_binding ?? []).includes(gateId)).length
  };
});

const blockerCategoryCounts = countBy(
  (ownerActionPackage.blocked_work_package_actions ?? []).flatMap((wp) => wp.blocker_categories ?? [])
);

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-blocker-surface-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LAUNCH_AUDIT_PATH,
    PHASE_EXIT_AUDIT_PATH,
    MANUAL_INTAKE_PATH,
    MANUAL_INTAKE_VALIDATION_PATH,
    OWNER_ACTION_PACKAGE_PATH,
    OWNER_ACTION_VALIDATION_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  verdict,
  boundary: {
    summarizes_blockers_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    blocked_work_package_count: blockedWps.length,
    recorded_work_package_count: recordedWps.length,
    failed_gate_count: launchAudit.go_live_readiness.failed_gate_ids.length,
    failed_gate_evidence_slot_count: expectedGateEvidenceKeys.length,
    l9_stabilization_closure_slot_count: (manualIntake.l9_stabilization_intake ?? []).length,
    total_manual_intake_row_count: manualIntake.summary.total_intake_row_count,
    pending_manual_intake_row_count: manualIntake.summary.pending_intake_count,
    evidence_satisfied_manual_intake_row_count: manualIntake.summary.evidence_satisfied_count,
    owner_deferred_manual_intake_row_count: manualIntake.summary.owner_deferred_count,
    phase_count: phaseExitAudit.summary.phase_count,
    blocked_phase_count: phaseExitAudit.summary.blocked_phase_count,
    all_phase_exits_closed_or_owner_deferred: phaseExitAudit.summary.all_phase_exits_closed_or_owner_deferred,
    owner_approved_deferrals_present: launchAudit.launch_decisions.owner_approved_deferrals_present,
    coverage_eligible_valid_deferred_rows: launchAudit.launch_decisions.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: launchAudit.launch_decisions.non_coverage_valid_deferred_rows,
    manual_intake_validation_pass: manualIntakeValidation.verdict === "PASS",
    owner_action_validation_pass: ownerActionValidation.verdict === "PASS",
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  phase_blockers: phaseBlockers,
  gate_blockers: gateBlockers,
  blocker_category_counts: blockerCategoryCounts,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  blocked_work_package_count: report.summary.blocked_work_package_count,
  failed_gate_evidence_slot_count: report.summary.failed_gate_evidence_slot_count,
  total_manual_intake_row_count: report.summary.total_manual_intake_row_count,
  pending_manual_intake_row_count: report.summary.pending_manual_intake_row_count,
  evidence_satisfied_manual_intake_row_count: report.summary.evidence_satisfied_manual_intake_row_count,
  owner_deferred_manual_intake_row_count: report.summary.owner_deferred_manual_intake_row_count,
  blocked_phase_count: report.summary.blocked_phase_count,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
