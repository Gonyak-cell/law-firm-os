#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const LAUNCH_STATUS_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const REPORT_JSON_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-phase-exit-readiness-audit.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function phaseExitGate(phase) {
  return phase === "PRE" ? "PRE-EXIT" : `${phase}-EXIT`;
}

function phaseExitAcceptedDecisionIds(phase, exitGate) {
  return [
    `PHASE-${phase}`,
    `PHASE-${exitGate}`,
    "COVERAGE-ALL-PHASE-EXITS"
  ];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Phase Exit Readiness Audit");
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
  lines.push("## Phase Exit Status");
  lines.push("");
  lines.push("| Phase | Exit gate | WP | Recorded | Blocked | Missing | Status |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | --- |");
  for (const phase of report.phases) {
    lines.push(`| ${phase.phase} | ${phase.exit_gate} | ${phase.work_package_count} | ${phase.recorded_count} | ${phase.blocked_count} | ${phase.missing_evidence_count} | ${phase.status} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit records PRE through L9 phase-exit readiness.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- A blocked phase may count as owner-deferred only when the launch decision register has structurally valid owner-approved deferrals.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const launchAudit = readJson(LAUNCH_STATUS_AUDIT_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const validCoverageDeferredIds = new Set(decisionSummary.valid_coverage_deferred_decision_ids ?? []);
const ownerApprovedDeferralsPresent = decisionSummary.owner_approved_deferrals_present === true;
const phases = [];
const phaseOrder = ledger.meta.phase_order ?? ["PRE", "L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"];

for (const phase of phaseOrder) {
  const exitGate = phaseExitGate(phase);
  const acceptedDeferralDecisionIds = phaseExitAcceptedDecisionIds(phase, exitGate);
  const coveringDecisionId = acceptedDeferralDecisionIds.find((decisionId) => validCoverageDeferredIds.has(decisionId)) ?? null;
  const workPackages = launchAudit.work_packages.filter((wp) => wp.phase === phase);
  const missingEvidence = workPackages.filter((wp) => wp.evidence.classification === "missing_evidence");
  const recorded = workPackages.filter((wp) => wp.evidence.classification === "standard_five_recorded");
  const blocked = workPackages.filter((wp) =>
    wp.evidence.classification.includes("blocked") ||
    String(wp.evidence.command_status ?? "").toLowerCase().includes("pending")
  );
  const exitGateBoundCount = workPackages.filter((wp) => (wp.gate_binding ?? []).includes(exitGate)).length;
  const phaseExitDeferralCoverageStatus =
    blocked.length === 0
      ? "not_required"
      : coveringDecisionId
        ? "covered_by_owner_deferral"
        : "missing_owner_deferral";
  const status =
    missingEvidence.length > 0
      ? "failed_missing_evidence"
      : blocked.length === 0
        ? "closed"
        : coveringDecisionId
          ? "owner_deferred"
          : "blocked_missing_owner_approved_deferrals";

  phases.push({
    phase,
    exit_gate: exitGate,
    work_package_count: workPackages.length,
    exit_gate_bound_count: exitGateBoundCount,
    recorded_count: recorded.length,
    blocked_count: blocked.length,
    missing_evidence_count: missingEvidence.length,
    status,
    recorded_wp_ids: recorded.map((wp) => wp.wp_id),
    blocked_wp_ids: blocked.map((wp) => wp.wp_id),
    missing_evidence_wp_ids: missingEvidence.map((wp) => wp.wp_id),
    accepted_deferral_decision_ids: acceptedDeferralDecisionIds,
    covering_decision_id: coveringDecisionId,
    phase_exit_deferral_coverage_status: phaseExitDeferralCoverageStatus
  });
}

const phaseCoverageComplete = phases.every((phase) => phase.work_package_count > 0 && phase.exit_gate_bound_count === phase.work_package_count);
const allPhaseExitsClosedOrDeferred = phases.every((phase) => phase.status === "closed" || phase.status === "owner_deferred");
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const report = {
  schema_version: "law-firm-os.launch-phase-exit-readiness-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LEDGER_PATH,
    LAUNCH_STATUS_AUDIT_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict: phaseCoverageComplete ? "PASS" : "FAIL",
  boundary: {
    records_phase_exit_readiness_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    phase_count: phases.length,
    phase_coverage_complete: phaseCoverageComplete,
    all_phase_exits_closed_or_owner_deferred: allPhaseExitsClosedOrDeferred,
    closed_phase_count: phases.filter((phase) => phase.status === "closed").length,
    owner_deferred_phase_count: phases.filter((phase) => phase.status === "owner_deferred").length,
    blocked_phase_count: phases.filter((phase) => phase.status === "blocked_missing_owner_approved_deferrals").length,
    missing_evidence_phase_count: phases.filter((phase) => phase.status === "failed_missing_evidence").length,
    total_work_package_count: phases.reduce((sum, phase) => sum + phase.work_package_count, 0),
    total_blocked_work_package_count: phases.reduce((sum, phase) => sum + phase.blocked_count, 0),
    owner_approved_deferrals_present: ownerApprovedDeferralsPresent,
    coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows,
    phase_exit_deferred_count: phases.filter((phase) => phase.status === "owner_deferred").length,
    phase_exit_missing_owner_deferral_count: phases.filter((phase) => phase.status === "blocked_missing_owner_approved_deferrals").length
  },
  phases
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  phase_count: report.summary.phase_count,
  all_phase_exits_closed_or_owner_deferred: report.summary.all_phase_exits_closed_or_owner_deferred,
  blocked_phase_count: report.summary.blocked_phase_count,
  total_blocked_work_package_count: report.summary.total_blocked_work_package_count,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows,
  phase_exit_missing_owner_deferral_count: report.summary.phase_exit_missing_owner_deferral_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
