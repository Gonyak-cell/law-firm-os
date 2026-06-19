#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const PHASE_EXIT_AUDIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const ACCEPTANCE_MATRIX_PATH = "docs/launch/launch-evidence-acceptance-matrix.json";
const ACCEPTANCE_MATRIX_VALIDATION_PATH = "docs/launch/launch-evidence-acceptance-matrix-validation.json";
const OWNER_ACTION_PACKAGE_PATH = "docs/launch/owner-action-deferral-request.json";
const OWNER_ACTION_VALIDATION_PATH = "docs/launch/owner-action-deferral-request-validation.json";
const MANUAL_INTAKE_VALIDATION_PATH = "docs/launch/launch-manual-evidence-intake-validation.json";
const DECISION_REGISTER_VALIDATION_PATH = "docs/launch/launch-decision-register-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-closure-dependency-graph.json";
const REPORT_MD_PATH = "docs/launch/launch-closure-dependency-graph.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(left, right) {
  const a = sorted(left ?? []);
  const b = sorted(right ?? []);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function phaseFromWpId(wpId) {
  if (wpId.startsWith("LT-PRE-")) return "PRE";
  const match = wpId.match(/^LT-(L\d+)-/);
  return match ? match[1] : "UNKNOWN";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Closure Dependency Graph");
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
  lines.push("## Phase Exit Nodes");
  lines.push("");
  lines.push("| Phase | Exit gate | Status | Blocked WP | Gate blockers |");
  lines.push("| --- | --- | --- | ---: | --- |");
  for (const phase of report.phase_nodes) {
    lines.push(`| ${phase.phase} | ${phase.exit_gate} | ${phase.status} | ${phase.blocked_wp_ids.length} | ${phase.related_failed_gate_ids.join(", ") || "none"} |`);
  }
  lines.push("");
  lines.push("## Failed Gate Nodes");
  lines.push("");
  lines.push("| Gate | Status | Acceptance rows | Related blocked WP | Related phases |");
  lines.push("| --- | --- | ---: | ---: | --- |");
  for (const gate of report.gate_nodes) {
    lines.push(`| ${gate.gate_id} | ${gate.status} | ${gate.acceptance_ids.length} | ${gate.related_blocked_wp_ids.length} | ${gate.related_phase_ids.join(", ") || "none"} |`);
  }
  lines.push("");
  lines.push("## L9 Closure Nodes");
  lines.push("");
  lines.push("| Acceptance | Criterion | Status | Intake |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of report.l9_closure_nodes) {
    lines.push(`| ${row.acceptance_id} | ${row.closure_criterion} | ${row.current_status} | ${row.intake_id} |`);
  }
  lines.push("");
  lines.push("## Acceptance Resolution State");
  lines.push("");
  lines.push(`- Pending acceptance nodes: ${report.summary.pending_acceptance_node_count}`);
  lines.push(`- Evidence-satisfied acceptance nodes: ${report.summary.evidence_satisfied_acceptance_node_count}`);
  lines.push(`- Owner-deferred acceptance nodes: ${report.summary.owner_deferred_acceptance_node_count}`);
  lines.push(`- Missing-intake acceptance nodes: ${report.summary.missing_intake_acceptance_node_count}`);
  lines.push(`- Coverage-eligible valid deferred rows: ${report.summary.coverage_eligible_valid_deferred_rows}`);
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
  lines.push("- This graph records dependency topology only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not convert pending intake rows into satisfied evidence.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const launchAudit = readJson(LAUNCH_AUDIT_PATH);
const phaseExitAudit = readJson(PHASE_EXIT_AUDIT_PATH);
const acceptanceMatrix = readJson(ACCEPTANCE_MATRIX_PATH);
const acceptanceMatrixValidation = readJson(ACCEPTANCE_MATRIX_VALIDATION_PATH);
const ownerActionPackage = readJson(OWNER_ACTION_PACKAGE_PATH);
const ownerActionValidation = readJson(OWNER_ACTION_VALIDATION_PATH);
const manualIntakeValidation = readJson(MANUAL_INTAKE_VALIDATION_PATH);
const decisionRegisterValidation = readJson(DECISION_REGISTER_VALIDATION_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

const blockedWps = launchAudit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_blocked");
const blockedWpIds = blockedWps.map((wp) => wp.wp_id);
const ownerBlockedWpIds = (ownerActionPackage.blocked_work_package_actions ?? []).map((wp) => wp.wp_id);
const phaseBlockedWpIds = (phaseExitAudit.phases ?? []).flatMap((phase) => phase.blocked_wp_ids ?? []);
const gateAcceptanceRows = acceptanceMatrix.gate_acceptance_rows ?? [];
const l9AcceptanceRows = acceptanceMatrix.l9_acceptance_rows ?? [];
const gateAcceptanceByGate = new Map();
for (const row of gateAcceptanceRows) {
  if (!gateAcceptanceByGate.has(row.gate_id)) gateAcceptanceByGate.set(row.gate_id, []);
  gateAcceptanceByGate.get(row.gate_id).push(row);
}

for (const [path, validation] of [
  [ACCEPTANCE_MATRIX_VALIDATION_PATH, acceptanceMatrixValidation],
  [OWNER_ACTION_VALIDATION_PATH, ownerActionValidation],
  [MANUAL_INTAKE_VALIDATION_PATH, manualIntakeValidation],
  [DECISION_REGISTER_VALIDATION_PATH, decisionRegisterValidation]
]) {
  if (validation.verdict !== "PASS") {
    addFinding(findings, "P1", "UPSTREAM_VALIDATION_NOT_PASS", "Required upstream validation is not PASS.", {
      path,
      actual: validation.verdict
    });
  }
}

if (!sameSet(blockedWpIds, ownerBlockedWpIds)) {
  addFinding(findings, "P0", "OWNER_ACTION_BLOCKED_WP_MISMATCH", "Owner action blocked WP ids do not match launch audit.", {
    expected_count: blockedWpIds.length,
    actual_count: ownerBlockedWpIds.length,
    missing: blockedWpIds.filter((id) => !ownerBlockedWpIds.includes(id)),
    unexpected: ownerBlockedWpIds.filter((id) => !blockedWpIds.includes(id))
  });
}

if (!sameSet(blockedWpIds, phaseBlockedWpIds)) {
  addFinding(findings, "P0", "PHASE_BLOCKED_WP_MISMATCH", "Phase-exit blocked WP ids do not match launch audit.", {
    expected_count: blockedWpIds.length,
    actual_count: phaseBlockedWpIds.length,
    missing: blockedWpIds.filter((id) => !phaseBlockedWpIds.includes(id)),
    unexpected: phaseBlockedWpIds.filter((id) => !blockedWpIds.includes(id))
  });
}

for (const gateId of launchAudit.go_live_readiness.failed_gate_ids ?? []) {
  const failedEvidenceCount = launchAudit.go_live_readiness.gates?.[gateId]?.failed_evidence?.length ?? 0;
  const acceptanceCount = (gateAcceptanceByGate.get(gateId) ?? []).length;
  if (failedEvidenceCount !== acceptanceCount) {
    addFinding(findings, "P0", "FAILED_GATE_ACCEPTANCE_COUNT_MISMATCH", "Failed gate evidence count does not match acceptance row count.", {
      gate_id: gateId,
      failed_evidence_count: failedEvidenceCount,
      acceptance_count: acceptanceCount
    });
  }
}

for (const row of [...gateAcceptanceRows, ...l9AcceptanceRows]) {
  if (row.current_intake_status === "missing_intake") {
    addFinding(findings, "P0", "ACCEPTANCE_MISSING_INTAKE", "Acceptance row has no matching manual intake row.", {
      acceptance_id: row.acceptance_id
    });
  }
  if (row.current_intake_status === "owner_deferred" && launchAudit.launch_decisions.coverage_eligible_valid_deferred_rows === 0) {
    addFinding(findings, "P1", "OWNER_DEFERRED_ACCEPTANCE_WITHOUT_COVERAGE_DEFERRAL", "Owner-deferred acceptance row exists while no coverage-eligible owner-approved deferral is present.", {
      acceptance_id: row.acceptance_id,
      coverage_eligible_valid_deferred_rows: launchAudit.launch_decisions.coverage_eligible_valid_deferred_rows
    });
  }
}

const phaseNodes = (phaseExitAudit.phases ?? []).map((phase) => {
  const phaseBlockedWps = blockedWps.filter((wp) => wp.phase === phase.phase);
  const relatedFailedGateIds = unique(
    phaseBlockedWps
      .flatMap((wp) => wp.gate_binding ?? [])
      .filter((gateId) => (launchAudit.go_live_readiness.failed_gate_ids ?? []).includes(gateId))
  );
  const relatedAcceptanceIds = unique(
    gateAcceptanceRows
      .filter((row) => relatedFailedGateIds.includes(row.gate_id))
      .map((row) => row.acceptance_id)
  );
  return {
    phase: phase.phase,
    exit_gate: phase.exit_gate,
    status: phase.status,
    blocked_wp_ids: phase.blocked_wp_ids ?? [],
    recorded_wp_ids: phase.recorded_wp_ids ?? [],
    related_failed_gate_ids: relatedFailedGateIds,
    related_acceptance_ids: relatedAcceptanceIds
  };
});

const gateNodes = (launchAudit.go_live_readiness.failed_gate_ids ?? []).map((gateId) => {
  const acceptanceRows = gateAcceptanceByGate.get(gateId) ?? [];
  const relatedBlockedWpIds = unique(acceptanceRows.flatMap((row) => row.related_blocked_work_package_ids ?? []));
  return {
    gate_id: gateId,
    status: launchAudit.go_live_readiness.gates?.[gateId]?.status ?? "unknown",
    failed_evidence_ids: launchAudit.go_live_readiness.gates?.[gateId]?.failed_evidence ?? [],
    acceptance_ids: acceptanceRows.map((row) => row.acceptance_id),
    related_blocked_wp_ids: relatedBlockedWpIds,
    related_phase_ids: unique(relatedBlockedWpIds.map(phaseFromWpId))
  };
});

const blockedWpNodes = (ownerActionPackage.blocked_work_package_actions ?? []).map((wp) => {
  const relatedAcceptanceIds = unique(
    gateAcceptanceRows
      .filter((row) => (wp.gate_binding ?? []).includes(row.gate_id))
      .map((row) => row.acceptance_id)
  );
  return {
    wp_id: wp.wp_id,
    phase: wp.phase,
    gate_binding: wp.gate_binding ?? [],
    blocker_categories: wp.blocker_categories ?? [],
    command_status: wp.command_status,
    evidence_base: wp.evidence_base,
    terminal_tuw: wp.terminal_tuw,
    related_acceptance_ids: relatedAcceptanceIds,
    next_required_action: wp.next_required_action ?? null
  };
});

const l9ClosureNodes = l9AcceptanceRows.map((row) => ({
  acceptance_id: row.acceptance_id,
  intake_id: row.intake_id,
  closure_criterion: row.closure_criterion,
  current_status: row.current_status,
  current_intake_status: row.current_intake_status
}));
const allAcceptanceRows = [...gateAcceptanceRows, ...l9AcceptanceRows];

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-closure-dependency-graph.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LAUNCH_AUDIT_PATH,
    PHASE_EXIT_AUDIT_PATH,
    ACCEPTANCE_MATRIX_PATH,
    ACCEPTANCE_MATRIX_VALIDATION_PATH,
    OWNER_ACTION_PACKAGE_PATH,
    OWNER_ACTION_VALIDATION_PATH,
    MANUAL_INTAKE_VALIDATION_PATH,
    DECISION_REGISTER_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    records_dependency_topology_only: true,
    go_live_approved_by_this_graph: false,
    owner_deferrals_approved_by_this_graph: false,
    intake_rows_satisfied_by_this_graph: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    phase_node_count: phaseNodes.length,
    blocked_phase_node_count: phaseNodes.filter((phase) => phase.status === "blocked_missing_owner_approved_deferrals").length,
    failed_gate_node_count: gateNodes.length,
    gate_acceptance_node_count: gateAcceptanceRows.length,
    l9_closure_node_count: l9ClosureNodes.length,
    pending_acceptance_node_count: allAcceptanceRows.filter((row) => row.current_intake_status === "pending_evidence_or_owner_deferral").length,
    evidence_satisfied_acceptance_node_count: allAcceptanceRows.filter((row) => row.current_intake_status === "evidence_satisfied").length,
    owner_deferred_acceptance_node_count: allAcceptanceRows.filter((row) => row.current_intake_status === "owner_deferred").length,
    missing_intake_acceptance_node_count: allAcceptanceRows.filter((row) => row.current_intake_status === "missing_intake").length,
    blocked_wp_node_count: blockedWpNodes.length,
    owner_approved_deferrals_present: launchAudit.launch_decisions.owner_approved_deferrals_present,
    coverage_eligible_valid_deferred_rows: launchAudit.launch_decisions.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: launchAudit.launch_decisions.non_coverage_valid_deferred_rows,
    go_live_all_pass: launchAudit.go_live_readiness.all_pass,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  phase_nodes: phaseNodes,
  gate_nodes: gateNodes,
  blocked_wp_nodes: blockedWpNodes,
  l9_closure_nodes: l9ClosureNodes,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  phase_node_count: report.summary.phase_node_count,
  failed_gate_node_count: report.summary.failed_gate_node_count,
  gate_acceptance_node_count: report.summary.gate_acceptance_node_count,
  l9_closure_node_count: report.summary.l9_closure_node_count,
  pending_acceptance_node_count: report.summary.pending_acceptance_node_count,
  evidence_satisfied_acceptance_node_count: report.summary.evidence_satisfied_acceptance_node_count,
  owner_deferred_acceptance_node_count: report.summary.owner_deferred_acceptance_node_count,
  missing_intake_acceptance_node_count: report.summary.missing_intake_acceptance_node_count,
  blocked_wp_node_count: report.summary.blocked_wp_node_count,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
