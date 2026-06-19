#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const DECISION_REGISTER_VALIDATION_PATH = "docs/launch/launch-decision-register-validation.json";
const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const PHASE_EXIT_AUDIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const ACCEPTANCE_MATRIX_PATH = "docs/launch/launch-evidence-acceptance-matrix.json";
const OWNER_ACTION_PACKAGE_PATH = "docs/launch/owner-action-deferral-request.json";
const CLOSURE_DEPENDENCY_GRAPH_PATH = "docs/launch/launch-closure-dependency-graph.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-coverage-audit.md";

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

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function coverageFor(row, validDeferredIds) {
  const coveringDecisionId = row.accepted_decision_ids.find((id) => validDeferredIds.has(id)) ?? null;
  return {
    ...row,
    coverage_status: coveringDecisionId ? "covered_by_owner_deferral" : "missing_owner_deferral",
    covering_decision_id: coveringDecisionId
  };
}

function coverageSummary(rows) {
  return {
    total: rows.length,
    covered: rows.filter((row) => row.coverage_status === "covered_by_owner_deferral").length,
    missing: rows.filter((row) => row.coverage_status !== "covered_by_owner_deferral").length
  };
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function targetSummary(row) {
  if (row.domain === "go_live_gate_evidence") {
    return `${row.gate_id}/${row.evidence_id}`;
  }
  if (row.domain === "l9_stabilization_closure") {
    return row.closure_criterion;
  }
  if (row.domain === "blocked_work_package") {
    return `${row.wp_id} (${row.phase})`;
  }
  if (row.domain === "phase_exit") {
    return `${row.phase}/${row.exit_gate}`;
  }
  return row.coverage_id;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Coverage Audit");
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
  lines.push("## Coverage Domains");
  lines.push("");
  lines.push("| Domain | Total | Covered | Missing | Complete |");
  lines.push("| --- | ---: | ---: | ---: | --- |");
  for (const domain of report.coverage_domains) {
    lines.push(`| ${domain.domain} | ${domain.total} | ${domain.covered} | ${domain.missing} | ${domain.complete} |`);
  }
  lines.push("");
  lines.push("## Accepted Decision ID Patterns");
  lines.push("");
  lines.push("- Gate evidence row: exact `ACC-GL-<gate>-<evidence>` or `COVERAGE-GATE-<gate>` or `COVERAGE-ALL-GO-LIVE`.");
  lines.push("- L9 closure row: exact `ACC-L9-C##` or `COVERAGE-L9-STABILIZATION`.");
  lines.push("- Blocked work package: exact `WP-<wp_id>` or `COVERAGE-PHASE-<phase>` or `COVERAGE-ALL-BLOCKED-WP`.");
  lines.push("- Phase exit: exact `PHASE-<phase>` or `PHASE-<exit_gate>` or `COVERAGE-ALL-PHASE-EXITS`.");
  lines.push("");
  lines.push("## Missing Deferral Targets");
  lines.push("");
  const missingRows = Object.values(report.coverage_rows)
    .flat()
    .filter((row) => row.coverage_status !== "covered_by_owner_deferral");
  if (missingRows.length === 0) {
    lines.push("No missing deferral targets.");
  } else {
    lines.push("| Domain | Coverage ID | Target | Accepted decision IDs |");
    lines.push("| --- | --- | --- | --- |");
    for (const row of missingRows) {
      lines.push(`| ${markdownCell(row.domain)} | ${markdownCell(row.coverage_id)} | ${markdownCell(targetSummary(row))} | ${markdownCell(row.accepted_decision_ids.join(", "))} |`);
    }
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
  lines.push("- This audit validates deferral coverage only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not create or approve owner deferrals.");
  lines.push("- A valid deferral must already exist in the launch decision register.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const decisionRegisterValidation = readJson(DECISION_REGISTER_VALIDATION_PATH);
const launchAudit = readJson(LAUNCH_AUDIT_PATH);
const phaseExitAudit = readJson(PHASE_EXIT_AUDIT_PATH);
const acceptanceMatrix = readJson(ACCEPTANCE_MATRIX_PATH);
const ownerActionPackage = readJson(OWNER_ACTION_PACKAGE_PATH);
const closureDependencyGraph = readJson(CLOSURE_DEPENDENCY_GRAPH_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (decisionRegisterValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "DECISION_REGISTER_VALIDATION_NOT_PASS", "Decision register validation is not PASS.", {
    actual: decisionRegisterValidation.verdict
  });
}

const validDeferredIds = new Set(decisionSummary.valid_deferred_decision_ids ?? []);
const validCoverageDeferredIds = new Set(decisionSummary.valid_coverage_deferred_decision_ids ?? []);

const goLiveRows = (acceptanceMatrix.gate_acceptance_rows ?? []).map((row) =>
  coverageFor({
    coverage_id: row.acceptance_id,
    domain: "go_live_gate_evidence",
    gate_id: row.gate_id,
    evidence_id: row.evidence_id,
    accepted_decision_ids: [
      row.acceptance_id,
      `COVERAGE-GATE-${row.gate_id}`,
      "COVERAGE-ALL-GO-LIVE"
    ]
  }, validCoverageDeferredIds)
);

const l9Rows = (acceptanceMatrix.l9_acceptance_rows ?? []).map((row) =>
  coverageFor({
    coverage_id: row.acceptance_id,
    domain: "l9_stabilization_closure",
    intake_id: row.intake_id,
    closure_criterion: row.closure_criterion,
    accepted_decision_ids: [
      row.acceptance_id,
      "COVERAGE-L9-STABILIZATION"
    ]
  }, validCoverageDeferredIds)
);

const blockedWpRows = (ownerActionPackage.blocked_work_package_actions ?? []).map((wp) =>
  coverageFor({
    coverage_id: `WP-${wp.wp_id}`,
    domain: "blocked_work_package",
    wp_id: wp.wp_id,
    phase: wp.phase,
    command_status: wp.command_status,
    accepted_decision_ids: [
      `WP-${wp.wp_id}`,
      `COVERAGE-PHASE-${wp.phase}`,
      "COVERAGE-ALL-BLOCKED-WP"
    ]
  }, validCoverageDeferredIds)
);

const phaseExitRows = (phaseExitAudit.phases ?? []).map((phase) =>
  coverageFor({
    coverage_id: `PHASE-${phase.phase}`,
    domain: "phase_exit",
    phase: phase.phase,
    exit_gate: phase.exit_gate,
    status: phase.status,
    accepted_decision_ids: [
      `PHASE-${phase.phase}`,
      `PHASE-${phase.exit_gate}`,
      "COVERAGE-ALL-PHASE-EXITS"
    ]
  }, validCoverageDeferredIds)
);

const graphBlockedWpIds = closureDependencyGraph.blocked_wp_nodes?.map((wp) => wp.wp_id) ?? [];
const packageBlockedWpIds = ownerActionPackage.blocked_work_package_actions?.map((wp) => wp.wp_id) ?? [];
if (!sameSet(graphBlockedWpIds, packageBlockedWpIds)) {
  addFinding(findings, "P0", "GRAPH_PACKAGE_BLOCKED_WP_MISMATCH", "Closure graph blocked WP ids do not match owner action package.", {
    graph_count: graphBlockedWpIds.length,
    package_count: packageBlockedWpIds.length,
    missing_from_graph: packageBlockedWpIds.filter((id) => !graphBlockedWpIds.includes(id)),
    unexpected_in_graph: graphBlockedWpIds.filter((id) => !packageBlockedWpIds.includes(id))
  });
}

const blockedAuditWpIds = launchAudit.work_packages
  .filter((wp) => wp.evidence.classification === "standard_five_blocked")
  .map((wp) => wp.wp_id);
if (!sameSet(blockedAuditWpIds, packageBlockedWpIds)) {
  addFinding(findings, "P0", "AUDIT_PACKAGE_BLOCKED_WP_MISMATCH", "Launch audit blocked WP ids do not match owner action package.", {
    audit_count: blockedAuditWpIds.length,
    package_count: packageBlockedWpIds.length
  });
}

const goLiveSummary = coverageSummary(goLiveRows);
const l9Summary = coverageSummary(l9Rows);
const blockedWpSummary = coverageSummary(blockedWpRows);
const phaseExitSummary = coverageSummary(phaseExitRows);
const coverageDomains = [
  { domain: "go_live_gate_evidence", ...goLiveSummary, complete: goLiveSummary.total > 0 && goLiveSummary.missing === 0 },
  { domain: "l9_stabilization_closure", ...l9Summary, complete: l9Summary.total > 0 && l9Summary.missing === 0 },
  { domain: "blocked_work_package", ...blockedWpSummary, complete: blockedWpSummary.total > 0 && blockedWpSummary.missing === 0 },
  { domain: "phase_exit", ...phaseExitSummary, complete: phaseExitSummary.total > 0 && phaseExitSummary.missing === 0 }
];
const allRequiredDeferralsCovered = coverageDomains.every((domain) => domain.complete);
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-coverage-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DECISION_REGISTER_PATH,
    DECISION_REGISTER_VALIDATION_PATH,
    LAUNCH_AUDIT_PATH,
    PHASE_EXIT_AUDIT_PATH,
    ACCEPTANCE_MATRIX_PATH,
    OWNER_ACTION_PACKAGE_PATH,
    CLOSURE_DEPENDENCY_GRAPH_PATH
  ],
  verdict,
  boundary: {
    validates_deferral_coverage_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_created_or_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    valid_deferred_decision_count: validDeferredIds.size,
    coverage_eligible_valid_deferred_decision_count: validCoverageDeferredIds.size,
    non_coverage_valid_deferred_decision_count: decisionSummary.valid_non_coverage_deferred_decision_ids?.length ?? 0,
    all_required_deferrals_covered: allRequiredDeferralsCovered,
    go_live_deferral_coverage_complete: goLiveSummary.total > 0 && goLiveSummary.missing === 0,
    l9_deferral_coverage_complete: l9Summary.total > 0 && l9Summary.missing === 0,
    blocked_wp_deferral_coverage_complete: blockedWpSummary.total > 0 && blockedWpSummary.missing === 0,
    phase_exit_deferral_coverage_complete: phaseExitSummary.total > 0 && phaseExitSummary.missing === 0,
    go_live_missing_deferral_count: goLiveSummary.missing,
    l9_missing_deferral_count: l9Summary.missing,
    blocked_wp_missing_deferral_count: blockedWpSummary.missing,
    phase_exit_missing_deferral_count: phaseExitSummary.missing,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  coverage_domains: coverageDomains,
  coverage_rows: {
    go_live_gate_evidence: goLiveRows,
    l9_stabilization_closure: l9Rows,
    blocked_work_package: blockedWpRows,
    phase_exit: phaseExitRows
  },
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  valid_deferred_decision_count: report.summary.valid_deferred_decision_count,
  coverage_eligible_valid_deferred_decision_count: report.summary.coverage_eligible_valid_deferred_decision_count,
  non_coverage_valid_deferred_decision_count: report.summary.non_coverage_valid_deferred_decision_count,
  all_required_deferrals_covered: report.summary.all_required_deferrals_covered,
  go_live_missing_deferral_count: report.summary.go_live_missing_deferral_count,
  l9_missing_deferral_count: report.summary.l9_missing_deferral_count,
  blocked_wp_missing_deferral_count: report.summary.blocked_wp_missing_deferral_count,
  phase_exit_missing_deferral_count: report.summary.phase_exit_missing_deferral_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
