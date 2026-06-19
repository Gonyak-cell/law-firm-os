#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const BLOCKER_SURFACE_PATH = "docs/launch/launch-blocker-surface-audit.json";
const PHASE_EXIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const COMPLETION_PATH = "docs/launch/launch-manual-evidence-completion-path-audit.json";
const OWNER_ACTION_PATH = "docs/launch/owner-action-deferral-request.json";
const OUTPUT_JSON_PATH = "docs/launch/normal-go-live-remediation-queue-2026-06-19.json";
const OUTPUT_MD_PATH = "docs/launch/normal-go-live-remediation-queue-2026-06-19.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function gateLane(row) {
  const gate = row.gate_id;
  const slot = row.slot ?? "";
  if (gate === "G1") return "completion_governance";
  if (gate === "G2") return "runtime_execution";
  if (gate === "G3") return "security_verification";
  if (gate === "G4") return "infrastructure_dr_performance";
  if (gate === "G5") return "m365_tenant";
  if (gate === "G6") return "operations_readiness";
  if (gate === "G7") return "compliance_policy";
  if (gate === "G8") return "data_migration_cutover";
  if (gate === "G9") return slot === "goal_closeout_chain_links" ? "repo_governance_rollup" : "g1_g8_rollup";
  if (gate === "G10") return "human_final_signoff";
  return "unclassified";
}

function contextFor(row) {
  if (row.intake_type === "l9_stabilization_closure_evidence") {
    return row.closure_criterion === "Owner signoff" ? "human_signoff_required" : "post_launch_elapsed_time_required";
  }
  const gate = row.gate_id;
  const slot = row.slot ?? "";
  if (gate === "G1" || (gate === "G9" && slot === "goal_closeout_chain_links")) return "repo_local_evidence_possible";
  if (gate === "G10") return "human_signoff_required";
  if (gate === "G5") return "m365_tenant_access_required";
  if (gate === "G3") return slot === "penetration_test_adjudication" ? "external_security_review_required" : "tenant_security_test_required";
  if (gate === "G4") return "tenant_infrastructure_execution_required";
  if (gate === "G6") return "operations_tabletop_or_monitoring_required";
  if (gate === "G8") return "tenant_data_migration_execution_required";
  if (gate === "G2" || gate === "G7" || gate === "G9") return "tenant_or_runtime_evidence_required";
  return "evidence_execution_required";
}

function actionFor(row) {
  if (row.intake_type === "l9_stabilization_closure_evidence") {
    if (row.closure_criterion === "Owner signoff") {
      return "Record owner signoff after the four-week stabilization evidence is complete.";
    }
    return "Measure and attach post-launch operating evidence for the stated stabilization window.";
  }

  const actionBySlot = {
    deferred_item_rejudgment_register: "Produce a zero-blocking deferred item rejudgment register.",
    hardening_coverage_matrix: "Produce a hardening coverage matrix with every missing cell closed or adjudicated.",
    wave1_runtime_ready_matrix: "Produce the approved Wave 1 runtime-ready matrix.",
    runtime_integration_test_output: "Run runtime integration tests in the target environment and attach timestamped PASS output.",
    rtg_001_005_attestation_links: "Attach RTG-001 through RTG-005 attestation links and verify they resolve.",
    verification_gate_production_rerun: "Rerun the seven-item verification gate against the production candidate.",
    ethical_wall_blocking_results: "Run the five ethical-wall blocking paths and attach audit evidence.",
    penetration_test_adjudication: "Attach penetration test adjudication showing open P0/P1 equals zero.",
    bypass_mapping_results: "Attach bypass mapping results with every row green.",
    backup_restore_rehearsal: "Run backup/restore rehearsal and attach RPO/RTO evidence.",
    worm_chain_operation: "Verify WORM hash, mutation block, and hold purge block.",
    deployment_rollback_roundtrip: "Run deployment rollback roundtrip and attach start/end timestamp pairs.",
    performance_acceptance_report: "Attach performance acceptance report with all metrics inside approved thresholds.",
    admin_consent_scope_reconciliation: "Run M365 admin consent scope reconciliation and show mismatch count zero.",
    addin_release_gate_production_results: "Run Outlook add-in production release gate and attach six-of-six PASS.",
    permission_sync_checker_log: "Run permission sync checker and prove injected mismatch detection.",
    slo_dashboard_and_alert_fire: "Capture SLO dashboard and alert-fire timestamp pair.",
    runbook_tabletop_records: "Record incident, break-glass, and rollback tabletop exercises.",
    break_glass_effective_record: "Attach break-glass record with approved approver and time limit.",
    support_channel_roundtrip: "Send and resolve a test support request through the launch support channel.",
    pipa_retention_policy_setting_reconciliation: "Reconcile ratified PIPA retention policy against system settings.",
    ai_disabled_state_or_wave2_gate: "Prove all Wave 1 AI is off, or attach a passing Wave 2 AI gate.",
    hr_sensitive_store_count: "Prove HR sensitive store real-data record count equals zero.",
    backfill_reconciliation_report: "Attach approved backfill reconciliation with unexplained diff zero.",
    delta_sync_latest_log: "Attach latest delta sync run log with timestamp and counts.",
    rollback_ready_attestation: "Attach current rollback-ready owner/date attestation.",
    goal_closeout_chain_links: "Verify all goal closeout chain links resolve.",
    g1_through_g8_readiness_report: "Produce a G1-G8 readiness report showing all eight gates pass.",
    joint_signoff_artifact: "Attach joint Managing Partner/System Admin signoff artifact.",
    g1_through_g9_decision_table: "Attach nine-row G1-G9 decision table with decision date.",
    launch_decision_register_entry: "Link the resolvable launch decision register entry."
  };
  return actionBySlot[row.slot] ?? "Attach real evidence satisfying the required state.";
}

function sortEvidenceRows(rows) {
  return [...rows].sort((a, b) => {
    const left = `${a.gate_id ?? "Z"}:${a.intake_id}`;
    const right = `${b.gate_id ?? "Z"}:${b.intake_id}`;
    return left.localeCompare(right);
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Normal Go-Live Remediation Queue");
  lines.push("");
  lines.push(`Generated on: ${report.generated_on}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This queue follows the normal evidence route.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals or override any failed gate.");
  lines.push("- Rows move to `evidence_satisfied` only after real evidence refs, timestamps, and verifiers are recorded.");
  lines.push("- L9 stabilization evidence cannot be completed before the required post-launch operating window exists.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Execution Order");
  lines.push("");
  for (const item of report.execution_order) {
    lines.push(`${item.order}. ${item.title}: ${item.exit_condition}`);
  }
  lines.push("");
  lines.push("## Gate Evidence Queue");
  lines.push("");
  lines.push("| Intake | Lane | Context | Required state | Required action | Status |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const row of report.gate_evidence_queue) {
    lines.push(`| ${row.intake_id} | ${row.lane} | ${row.execution_context} | ${markdownCell(row.required_state)} | ${markdownCell(row.required_action)} | ${row.current_status} |`);
  }
  lines.push("");
  lines.push("## L9 Stabilization Queue");
  lines.push("");
  lines.push("| Intake | Context | Criterion | Required action | Status |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of report.l9_stabilization_queue) {
    lines.push(`| ${row.intake_id} | ${row.execution_context} | ${markdownCell(row.closure_criterion)} | ${markdownCell(row.required_action)} | ${row.current_status} |`);
  }
  lines.push("");
  lines.push("## Phase Exit Impact");
  lines.push("");
  lines.push("| Phase | Blocked WP | Recorded WP | Exit status |");
  lines.push("| --- | ---: | ---: | --- |");
  for (const phase of report.phase_exit_impact) {
    lines.push(`| ${phase.phase} | ${phase.blocked_count} | ${phase.recorded_count} | ${phase.status} |`);
  }
  lines.push("");
  lines.push("## Next Concrete Work");
  lines.push("");
  lines.push("1. Start with G1 completion governance, because later gates depend on a clean completion baseline.");
  lines.push("2. Produce real runtime/security/infra/M365/ops/compliance/data evidence for G2-G8 in the target environment.");
  lines.push("3. Generate the G1-G8 readiness report, then complete G10 human signoff.");
  lines.push("4. After launch, collect the L9 four-week stabilization evidence and owner signoff.");
  return `${lines.join("\n")}\n`;
}

const manualIntake = readJson(MANUAL_INTAKE_PATH);
const blockerSurface = readJson(BLOCKER_SURFACE_PATH);
const phaseExit = readJson(PHASE_EXIT_PATH);
const completionPath = readJson(COMPLETION_PATH);
const ownerAction = readJson(OWNER_ACTION_PATH);

const gateEvidenceQueue = sortEvidenceRows(manualIntake.gate_intake ?? []).map((row) => ({
  intake_id: row.intake_id,
  gate_id: row.gate_id,
  evidence_id: row.evidence_id,
  lane: gateLane(row),
  execution_context: contextFor(row),
  slot: row.slot,
  required_state: row.required_state,
  required_action: actionFor(row),
  current_status: row.intake_status,
  evidence_ref: row.evidence_ref,
  verifier: row.verifier
}));

const l9StabilizationQueue = (manualIntake.l9_stabilization_intake ?? []).map((row) => ({
  intake_id: row.intake_id,
  execution_context: contextFor(row),
  closure_criterion: row.closure_criterion,
  current_status: row.intake_status,
  required_action: actionFor(row),
  evidence_ref: row.evidence_ref,
  verifier: row.verifier
}));

const report = {
  schema_version: "law-firm-os.normal-go-live-remediation-queue.v0.1",
  generated_on: "2026-06-19",
  source_refs: [
    MANUAL_INTAKE_PATH,
    BLOCKER_SURFACE_PATH,
    PHASE_EXIT_PATH,
    COMPLETION_PATH,
    OWNER_ACTION_PATH
  ],
  boundary: {
    follows_normal_evidence_route: true,
    go_live_approved_by_this_queue: false,
    owner_deferrals_approved_by_this_queue: false,
    override_go_live_approval: false,
    evidence_satisfied_requires_real_ref_timestamp_and_verifier: true,
    l9_requires_post_launch_operating_window: true
  },
  summary: {
    failed_gate_count: ownerAction.summary.failed_gate_ids.length,
    failed_gate_evidence_slot_count: manualIntake.summary.failed_gate_evidence_slot_count,
    l9_stabilization_closure_slot_count: manualIntake.summary.l9_stabilization_closure_slot_count,
    total_manual_intake_row_count: manualIntake.summary.total_intake_row_count,
    pending_manual_intake_row_count: completionPath.summary.pending_manual_intake_row_count,
    evidence_satisfied_manual_intake_row_count: completionPath.summary.evidence_satisfied_manual_intake_row_count,
    blocked_work_package_count: ownerAction.summary.blocked_work_package_count,
    blocked_phase_count: phaseExit.summary.blocked_phase_count,
    gate_blocker_count: blockerSurface.gate_blockers.length,
    phase_blocker_count: blockerSurface.phase_blockers.length,
    owner_approved_deferrals_present: ownerAction.summary.owner_approved_deferrals_present
  },
  execution_order: [
    {
      order: 1,
      title: "G1 completion governance",
      exit_condition: "G1-E02 and G1-E03 are evidence_satisfied."
    },
    {
      order: 2,
      title: "G2-G8 target-environment evidence",
      exit_condition: "Runtime, security, infrastructure, M365, operations, compliance, and data evidence rows are evidence_satisfied."
    },
    {
      order: 3,
      title: "G9 governance rollup",
      exit_condition: "All closeout links resolve and the G1-G8 readiness report shows all eight gates pass."
    },
    {
      order: 4,
      title: "G10 human final signoff",
      exit_condition: "Joint signoff artifact, G1-G9 decision table, and launch decision register entry are linked."
    },
    {
      order: 5,
      title: "L9 stabilization",
      exit_condition: "Four-week post-launch stabilization criteria and owner signoff are evidence_satisfied."
    }
  ],
  gate_blockers: blockerSurface.gate_blockers,
  phase_exit_impact: phaseExit.phases,
  gate_evidence_queue: gateEvidenceQueue,
  l9_stabilization_queue: l9StabilizationQueue
};

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true });
writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(OUTPUT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: OUTPUT_JSON_PATH,
  report_markdown: OUTPUT_MD_PATH,
  failed_gate_evidence_slot_count: report.summary.failed_gate_evidence_slot_count,
  l9_stabilization_closure_slot_count: report.summary.l9_stabilization_closure_slot_count,
  blocked_work_package_count: report.summary.blocked_work_package_count,
  blocked_phase_count: report.summary.blocked_phase_count
}, null, 2));
