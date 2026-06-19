#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const REPORT_JSON_PATH = "docs/launch/launch-goal-completion-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-goal-completion-audit.md";
const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const EVIDENCE_INTEGRITY_AUDIT_PATH = "docs/launch/launch-evidence-integrity-audit.json";
const TUW_EVIDENCE_COVERAGE_AUDIT_PATH = "docs/launch/launch-tuw-evidence-coverage-audit.json";
const PHASE_EXIT_AUDIT_PATH = "docs/launch/launch-phase-exit-readiness-audit.json";
const BLOCKER_SURFACE_AUDIT_PATH = "docs/launch/launch-blocker-surface-audit.json";
const CLOSURE_DEPENDENCY_GRAPH_PATH = "docs/launch/launch-closure-dependency-graph.json";
const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const DEFERRAL_DECISION_ID_CONTRACT_AUDIT_PATH = "docs/launch/launch-deferral-decision-id-contract-audit.json";
const DEFERRAL_ACTION_CROSSWALK_AUDIT_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.json";
const DEFERRAL_RESOLUTION_LANES_AUDIT_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const DEFERRAL_DECISION_REGISTER_TEMPLATE_VALIDATION_PATH = "docs/launch/launch-deferral-decision-register-template-validation.json";
const DEFERRAL_INTAKE_BATCHES_VALIDATION_PATH = "docs/launch/launch-deferral-intake-batches-validation.json";
const DEFERRAL_COVERAGE_OPTIONS_VALIDATION_PATH = "docs/launch/launch-deferral-coverage-options-validation.json";
const MINIMUM_DEFERRAL_DECISION_PACKET_VALIDATION_PATH = "docs/launch/launch-minimum-deferral-decision-packet-validation.json";
const MINIMUM_DEFERRAL_TARGET_ANNEX_PATH = "docs/launch/launch-minimum-deferral-target-annex.json";
const MINIMUM_DEFERRAL_TARGET_ANNEX_VALIDATION_PATH = "docs/launch/launch-minimum-deferral-target-annex-validation.json";
const MINIMUM_DEFERRAL_APPLICATION_AUDIT_PATH = "docs/launch/launch-minimum-deferral-application-audit.json";
const OWNER_DECISION_INTAKE_RUNBOOK_PATH = "docs/launch/launch-owner-decision-intake-runbook.json";
const OWNER_DECISION_INTAKE_RUNBOOK_VALIDATION_PATH = "docs/launch/launch-owner-decision-intake-runbook-validation.json";
const OWNER_APPROVAL_RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const OWNER_APPROVAL_RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const OWNER_APPROVAL_REQUEST_PACKET_VALIDATION_PATH = "docs/launch/launch-owner-approval-request-packet-validation.json";
const OWNER_RESPONSE_INTAKE_VALIDATION_PATH = "docs/launch/launch-owner-response-intake-validation.json";
const OWNER_RESPONSE_RECEIPT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-owner-response-receipt-candidates-validation.json";
const OWNER_RESPONSE_RECEIPT_APPLICATION_AUDIT_PATH = "docs/launch/launch-owner-response-receipt-application-audit.json";
const OWNER_RESPONSE_RECEIPT_RECONCILIATION_AUDIT_PATH = "docs/launch/launch-owner-response-receipt-reconciliation-audit.json";
const DECISION_REGISTER_IMPORT_CANDIDATES_PATH = "docs/launch/launch-decision-register-import-candidates.json";
const DECISION_REGISTER_IMPORT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-decision-register-import-candidates-validation.json";
const DECISION_REGISTER_IMPORT_APPLICATION_AUDIT_PATH = "docs/launch/launch-decision-register-import-application-audit.json";
const DECISION_REGISTER_IMPORT_RECONCILIATION_AUDIT_PATH = "docs/launch/launch-decision-register-import-reconciliation-audit.json";
const DEFERRAL_SOURCE_EXTRACTION_AUDIT_PATH = "docs/launch/launch-deferral-source-extraction-audit.json";
const NO_GO_CLAIM_POLICY_AUDIT_PATH = "docs/launch/launch-no-go-claim-policy-audit.json";
const AUTHORITY_TRACEABILITY_AUDIT_PATH = "docs/launch/launch-authority-traceability-audit.json";
const BOUNDARY_AUDIT_PATH = "docs/launch/launch-boundary-policy-audit.json";
const REVIEW_WAIVER_AUDIT_PATH = "docs/launch/launch-review-waiver-policy-audit.json";
const DECISION_REGISTER_VALIDATION_PATH = "docs/launch/launch-decision-register-validation.json";
const DECISION_REGISTER_OWNER_EVIDENCE_AUDIT_PATH = "docs/launch/launch-decision-register-owner-evidence-audit.json";
const MANUAL_EVIDENCE_INTAKE_VALIDATION_PATH = "docs/launch/launch-manual-evidence-intake-validation.json";
const EVIDENCE_ACCEPTANCE_MATRIX_VALIDATION_PATH = "docs/launch/launch-evidence-acceptance-matrix-validation.json";
const MANUAL_EVIDENCE_COMPLETION_PATH_AUDIT_PATH = "docs/launch/launch-manual-evidence-completion-path-audit.json";
const OWNER_ACTION_VALIDATION_PATH = "docs/launch/owner-action-deferral-request-validation.json";
const STABILIZATION_CLOSURE_PATH = "docs/launch/stabilization-closure.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function runNodeScript(scriptPath, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return {
      command: `node ${[scriptPath, ...args].join(" ")}`,
      exit_code: 0,
      stdout: stdout.trim()
    };
  } catch (error) {
    return {
      command: `node ${[scriptPath, ...args].join(" ")}`,
      exit_code: error.status ?? 1,
      stdout: String(error.stdout ?? "").trim(),
      stderr: String(error.stderr ?? error.message ?? "").trim()
    };
  }
}

function maybeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function commandPassed(commandResult) {
  return commandResult.exit_code === 0;
}

function l9Status(audit) {
  return audit.work_packages
    .filter((wp) => wp.phase === "L9")
    .map((wp) => ({
      wp_id: wp.wp_id,
      title: wp.title,
      classification: wp.evidence.classification,
      command_status: wp.evidence.command_status,
      evidence_base: wp.evidence.base
    }));
}

function stabilizationClosureSummary() {
  if (!existsSync(STABILIZATION_CLOSURE_PATH)) {
    return {
      exists: false,
      status: "missing",
      blocked_criteria: []
    };
  }
  const text = readText(STABILIZATION_CLOSURE_PATH);
  const blockedCriteria = [];
  const tableRows = text
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Closure criterion"));
  for (const row of tableRows) {
    const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length >= 2) {
      blockedCriteria.push({
        criterion: cells[0],
        current_status: cells[1]
      });
    }
  }
  const statusLine = text.split("\n").find((line) => line.startsWith("Status:")) ?? "Status: unknown";
  return {
    exists: true,
    status: statusLine.replace(/^Status:\s*/, ""),
    blocked_criteria: blockedCriteria
  };
}

function requirement(status, evidence_refs, notes = []) {
  return { status, evidence_refs, notes };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Goal Completion Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit does not approve go-live.");
  lines.push("- This audit does not approve deferrals.");
  lines.push("- Full Claude review waiver remains non-review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Requirement Status");
  lines.push("");
  lines.push("| Requirement | Status | Evidence |");
  lines.push("| --- | --- | --- |");
  for (const [key, value] of Object.entries(report.requirements)) {
    lines.push(`| ${key} | ${value.status} | ${value.evidence_refs.join("<br>")} |`);
  }
  lines.push("");
  lines.push("## Launch Readiness");
  lines.push("");
  lines.push(`- G1-G10 all pass: ${report.launch_readiness.go_live_all_pass}`);
  lines.push(`- Failed gates: ${report.launch_readiness.failed_gate_ids.join(", ") || "none"}`);
  lines.push(`- Owner-approved deferrals present: ${report.launch_readiness.owner_approved_deferrals_present}`);
  lines.push(`- Blocked or pending work packages: ${report.launch_readiness.blocked_or_pending_count}`);
  lines.push(`- Missing standard evidence: ${report.launch_readiness.missing_evidence_count}`);
  lines.push("");
  lines.push("## Phase Exit Readiness");
  lines.push("");
  lines.push(`- PRE-L9 exits closed or owner-deferred: ${report.phase_exit_readiness.all_phase_exits_closed_or_owner_deferred}`);
  lines.push(`- Blocked phases: ${report.phase_exit_readiness.blocked_phase_count}`);
  lines.push(`- Blocked work packages across phases: ${report.phase_exit_readiness.total_blocked_work_package_count}`);
  lines.push("");
  lines.push("## Manual Evidence Intake");
  lines.push("");
  lines.push(`- Total intake rows: ${report.manual_evidence_intake.total_intake_row_count}`);
  lines.push(`- Pending intake rows: ${report.manual_evidence_intake.pending_intake_count}`);
  lines.push(`- Evidence-satisfied rows: ${report.manual_evidence_intake.evidence_satisfied_count}`);
  lines.push(`- Owner-deferred rows: ${report.manual_evidence_intake.owner_deferred_count}`);
  lines.push(`- Coverage-eligible valid deferred rows: ${report.manual_evidence_intake.coverage_eligible_valid_deferred_rows}`);
  lines.push(`- Manual intake findings: ${report.manual_evidence_intake.finding_count}`);
  lines.push("");
  lines.push("## Evidence Acceptance Matrix");
  lines.push("");
  lines.push(`- Total acceptance rows: ${report.evidence_acceptance_matrix.total_acceptance_row_count}`);
  lines.push(`- Pending acceptance rows: ${report.evidence_acceptance_matrix.pending_acceptance_row_count}`);
  lines.push(`- Evidence-satisfied acceptance rows: ${report.evidence_acceptance_matrix.evidence_satisfied_acceptance_row_count}`);
  lines.push(`- Owner-deferred acceptance rows: ${report.evidence_acceptance_matrix.owner_deferred_acceptance_row_count}`);
  lines.push(`- Missing-intake acceptance rows: ${report.evidence_acceptance_matrix.missing_intake_acceptance_row_count}`);
  lines.push(`- Gate evidence-satisfied rows: ${report.evidence_acceptance_matrix.gate_evidence_satisfied_acceptance_row_count}`);
  lines.push(`- L9 evidence-satisfied rows: ${report.evidence_acceptance_matrix.l9_evidence_satisfied_acceptance_row_count}`);
  lines.push(`- Acceptance matrix findings: ${report.evidence_acceptance_matrix.finding_count}`);
  lines.push("");
  lines.push("## Manual Evidence Completion Path");
  lines.push("");
  lines.push(`- Status mirror findings: ${report.manual_evidence_completion_path.finding_count}`);
  lines.push(`- Go-live evidence path ready: ${report.manual_evidence_completion_path.go_live_evidence_completion_path_ready}`);
  lines.push(`- L9 evidence path ready: ${report.manual_evidence_completion_path.l9_evidence_completion_path_ready}`);
  lines.push(`- All evidence paths ready: ${report.manual_evidence_completion_path.all_evidence_completion_paths_ready}`);
  lines.push(`- Evidence-satisfied manual rows: ${report.manual_evidence_completion_path.evidence_satisfied_manual_intake_row_count}`);
  lines.push(`- Evidence-satisfied acceptance rows: ${report.manual_evidence_completion_path.evidence_satisfied_acceptance_row_count}`);
  lines.push("");
  lines.push("## Decision Register Owner Evidence");
  lines.push("");
  lines.push(`- Owner evidence rows: ${report.decision_register_owner_evidence.owner_evidence_row_count}`);
  lines.push(`- Owner evidence quality pass: ${report.decision_register_owner_evidence.owner_evidence_quality_pass_count}`);
  lines.push(`- Weak owner evidence rows: ${report.decision_register_owner_evidence.weak_owner_evidence_row_count}`);
  lines.push(`- Agent-inferred owner evidence rows: ${report.decision_register_owner_evidence.agent_inferred_owner_evidence_row_count}`);
  lines.push(`- Owner evidence findings: ${report.decision_register_owner_evidence.finding_count}`);
  lines.push("");
  lines.push("## Deferral Coverage");
  lines.push("");
  lines.push(`- Valid deferred decisions: ${report.deferral_coverage.valid_deferred_decision_count}`);
  lines.push(`- Coverage-eligible valid deferred decisions: ${report.deferral_coverage.coverage_eligible_valid_deferred_decision_count}`);
  lines.push(`- Non-coverage valid deferred decisions: ${report.deferral_coverage.non_coverage_valid_deferred_decision_count}`);
  lines.push(`- All required deferrals covered: ${report.deferral_coverage.all_required_deferrals_covered}`);
  lines.push(`- Missing go-live deferrals: ${report.deferral_coverage.go_live_missing_deferral_count}`);
  lines.push(`- Missing L9 deferrals: ${report.deferral_coverage.l9_missing_deferral_count}`);
  lines.push(`- Missing blocked-WP deferrals: ${report.deferral_coverage.blocked_wp_missing_deferral_count}`);
  lines.push(`- Missing phase-exit deferrals: ${report.deferral_coverage.phase_exit_missing_deferral_count}`);
  lines.push("");
  lines.push("## Decision ID Contract");
  lines.push("");
  lines.push(`- Accepted decision ID mentions checked: ${report.deferral_decision_id_contract.accepted_decision_id_mention_count}`);
  lines.push(`- Unique accepted decision IDs checked: ${report.deferral_decision_id_contract.unique_accepted_decision_id_count}`);
  lines.push(`- Unclassified decision IDs: ${report.deferral_decision_id_contract.unclassified_decision_id_count}`);
  lines.push(`- Domain mismatches: ${report.deferral_decision_id_contract.domain_mismatch_count}`);
  lines.push(`- Cross-domain decision IDs: ${report.deferral_decision_id_contract.cross_domain_decision_id_count}`);
  lines.push("");
  lines.push("## Deferral Action Crosswalk");
  lines.push("");
  lines.push(`- Missing deferral targets: ${report.deferral_action_crosswalk.missing_deferral_target_count}`);
  lines.push(`- Action-linked targets: ${report.deferral_action_crosswalk.action_linked_count}`);
  lines.push(`- Missing action sources: ${report.deferral_action_crosswalk.missing_action_source_count}`);
  lines.push(`- Gate manual-intake links: ${report.deferral_action_crosswalk.gate_manual_intake_link_count}`);
  lines.push(`- L9 manual-intake links: ${report.deferral_action_crosswalk.l9_manual_intake_link_count}`);
  lines.push(`- Blocked-WP owner-action links: ${report.deferral_action_crosswalk.blocked_wp_owner_action_link_count}`);
  lines.push(`- Phase-exit links: ${report.deferral_action_crosswalk.phase_exit_link_count}`);
  lines.push("");
  lines.push("## Deferral Resolution Lanes");
  lines.push("");
  lines.push(`- Classified targets: ${report.deferral_resolution_lanes.classified_target_count}`);
  lines.push(`- Primary lanes: ${report.deferral_resolution_lanes.primary_lane_count}`);
  lines.push(`- Unclassified targets: ${report.deferral_resolution_lanes.unclassified_target_count}`);
  lines.push(`- Lane findings: ${report.deferral_resolution_lanes.finding_count}`);
  lines.push("");
  lines.push("## Decision Register Template");
  lines.push("");
  lines.push(`- Template rows: ${report.deferral_decision_register_template.template_row_count}`);
  lines.push(`- Placeholder rows: ${report.deferral_decision_register_template.placeholder_row_count}`);
  lines.push(`- Decision register current rows: ${report.deferral_decision_register_template.decision_register_total_rows}`);
  lines.push(`- Template validation findings: ${report.deferral_decision_register_template.finding_count}`);
  lines.push("");
  lines.push("## Deferral Intake Batches");
  lines.push("");
  lines.push(`- Intake targets: ${report.deferral_intake_batches.intake_target_count}`);
  lines.push(`- Batches: ${report.deferral_intake_batches.batch_count}`);
  lines.push(`- Non-empty batches: ${report.deferral_intake_batches.non_empty_batch_count}`);
  lines.push(`- Decision register current rows: ${report.deferral_intake_batches.decision_register_total_rows}`);
  lines.push(`- Intake validation findings: ${report.deferral_intake_batches.finding_count}`);
  lines.push("");
  lines.push("## Deferral Coverage Options");
  lines.push("");
  lines.push(`- Minimum bundle decision IDs: ${report.deferral_coverage_options.minimum_bundle_decision_id_count}`);
  lines.push(`- Minimum bundle covered targets: ${report.deferral_coverage_options.minimum_bundle_covered_target_count}`);
  lines.push(`- Minimum bundle uncovered targets: ${report.deferral_coverage_options.minimum_bundle_uncovered_target_count}`);
  lines.push(`- Decision register current rows: ${report.deferral_coverage_options.decision_register_total_rows}`);
  lines.push(`- Options validation findings: ${report.deferral_coverage_options.finding_count}`);
  lines.push("");
  lines.push("## Minimum Deferral Decision Packet");
  lines.push("");
  lines.push(`- Placeholder decision rows: ${report.minimum_deferral_decision_packet.placeholder_decision_row_count}`);
  lines.push(`- Covered targets if owner rows are completed: ${report.minimum_deferral_decision_packet.covered_target_count_if_owner_rows_are_completed}`);
  lines.push(`- Uncovered targets if owner rows are completed: ${report.minimum_deferral_decision_packet.uncovered_target_count_if_owner_rows_are_completed}`);
  lines.push(`- Decision register current rows: ${report.minimum_deferral_decision_packet.decision_register_total_rows}`);
  lines.push(`- Packet validation findings: ${report.minimum_deferral_decision_packet.finding_count}`);
  lines.push("");
  lines.push("## Minimum Deferral Target Annex");
  lines.push("");
  lines.push(`- Minimum decision rows: ${report.minimum_deferral_target_annex.minimum_decision_row_count}`);
  lines.push(`- Unique target IDs: ${report.minimum_deferral_target_annex.unique_target_id_count}`);
  lines.push(`- Unmatched targets: ${report.minimum_deferral_target_annex.unmatched_target_count}`);
  lines.push(`- Aggregate-not-accepted targets: ${report.minimum_deferral_target_annex.aggregate_not_accepted_target_count}`);
  lines.push(`- Annex validation findings: ${report.minimum_deferral_target_annex.finding_count}`);
  lines.push("");
  lines.push("## Owner Decision Intake Runbook");
  lines.push("");
  lines.push(`- Minimum owner rows: ${report.owner_decision_intake_runbook.minimum_owner_row_count}`);
  lines.push(`- Targets if minimum owner rows are completed: ${report.owner_decision_intake_runbook.target_count_if_minimum_owner_rows_are_completed}`);
  lines.push(`- Decision register current rows: ${report.owner_decision_intake_runbook.decision_register_total_rows}`);
  lines.push(`- Valid applied minimum decision rows: ${report.owner_decision_intake_runbook.valid_applied_minimum_decision_row_count}`);
  lines.push(`- Remaining targets after valid applied rows: ${report.owner_decision_intake_runbook.remaining_target_count_after_valid_applied_rows}`);
  lines.push(`- Runbook validation findings: ${report.owner_decision_intake_runbook.finding_count}`);
  lines.push("");
  lines.push("## Owner Approval Receipt Ledger");
  lines.push("");
  lines.push(`- Receipt slots: ${report.owner_approval_receipt_ledger.receipt_slot_count}`);
  lines.push(`- Pending receipt slots: ${report.owner_approval_receipt_ledger.pending_receipt_slot_count}`);
  lines.push(`- Real owner receipts: ${report.owner_approval_receipt_ledger.real_owner_receipt_count}`);
  lines.push(`- Copy-allowed slots: ${report.owner_approval_receipt_ledger.copy_allowed_count}`);
  lines.push(`- Receipt ledger findings: ${report.owner_approval_receipt_ledger.finding_count}`);
  lines.push("");
  lines.push("## Owner Approval Request Packet");
  lines.push("");
  lines.push(`- Request cards: ${report.owner_approval_request_packet.request_card_count}`);
  lines.push(`- Pending receipt slots: ${report.owner_approval_request_packet.pending_receipt_slot_count}`);
  lines.push(`- Targets by pending requests: ${report.owner_approval_request_packet.target_count_by_pending_requests}`);
  lines.push(`- Request packet findings: ${report.owner_approval_request_packet.finding_count}`);
  lines.push("");
  lines.push("## Owner Response Intake");
  lines.push("");
  lines.push(`- Response entries: ${report.owner_response_intake.response_entry_count}`);
  lines.push(`- Pending responses: ${report.owner_response_intake.pending_response_count}`);
  lines.push(`- Real owner responses: ${report.owner_response_intake.real_owner_response_count}`);
  lines.push(`- Copy-allowed responses: ${report.owner_response_intake.copy_allowed_count}`);
  lines.push(`- Response intake findings: ${report.owner_response_intake.finding_count}`);
  lines.push("");
  lines.push("## Owner Response Receipt Candidates");
  lines.push("");
  lines.push(`- Receipt-update candidates: ${report.owner_response_receipt_candidates.receipt_update_candidate_count}`);
  lines.push(`- Expected receipt-update candidates: ${report.owner_response_receipt_candidates.expected_receipt_update_candidate_count}`);
  lines.push(`- Real owner responses: ${report.owner_response_receipt_candidates.real_owner_response_count}`);
  lines.push(`- Candidate findings: ${report.owner_response_receipt_candidates.finding_count}`);
  lines.push("");
  lines.push("## Owner Response Receipt Application");
  lines.push("");
  lines.push(`- Receipt-update candidates: ${report.owner_response_receipt_application.receipt_update_candidate_count}`);
  lines.push(`- Applied candidates: ${report.owner_response_receipt_application.applied_candidate_count}`);
  lines.push(`- Pending candidate applications: ${report.owner_response_receipt_application.pending_application_count}`);
  lines.push(`- Application findings: ${report.owner_response_receipt_application.finding_count}`);
  lines.push("");
  lines.push("## Owner Response Receipt Reconciliation");
  lines.push("");
  lines.push(`- Real owner receipts: ${report.owner_response_receipt_reconciliation.real_owner_receipt_count}`);
  lines.push(`- Receipt-update candidates: ${report.owner_response_receipt_reconciliation.receipt_update_candidate_count}`);
  lines.push(`- Reconciled real receipts: ${report.owner_response_receipt_reconciliation.reconciled_real_receipt_count}`);
  lines.push(`- Unreconciled real receipts: ${report.owner_response_receipt_reconciliation.unreconciled_real_receipt_count}`);
  lines.push(`- Reconciliation findings: ${report.owner_response_receipt_reconciliation.finding_count}`);
  lines.push("");
  lines.push("## Decision Register Import Candidates");
  lines.push("");
  lines.push(`- Import candidates: ${report.decision_register_import_candidates.import_candidate_count}`);
  lines.push(`- Expected import candidates: ${report.decision_register_import_candidates.expected_import_candidate_count}`);
  lines.push(`- Covered targets by candidates: ${report.decision_register_import_candidates.covered_target_count_by_candidates}`);
  lines.push(`- Decision register current rows: ${report.decision_register_import_candidates.decision_register_total_rows}`);
  lines.push(`- Import candidate findings: ${report.decision_register_import_candidates.finding_count}`);
  lines.push("");
  lines.push("## Decision Register Import Application");
  lines.push("");
  lines.push(`- Import candidates: ${report.decision_register_import_application.import_candidate_count}`);
  lines.push(`- Applied candidates: ${report.decision_register_import_application.applied_candidate_count}`);
  lines.push(`- Pending candidate applications: ${report.decision_register_import_application.pending_application_count}`);
  lines.push(`- Application findings: ${report.decision_register_import_application.finding_count}`);
  lines.push("");
  lines.push("## Decision Register Import Reconciliation");
  lines.push("");
  lines.push(`- Decision register rows: ${report.decision_register_import_reconciliation.decision_register_total_rows}`);
  lines.push(`- Import candidates: ${report.decision_register_import_reconciliation.import_candidate_count}`);
  lines.push(`- Reconciled rows: ${report.decision_register_import_reconciliation.reconciled_row_count}`);
  lines.push(`- Unreconciled rows: ${report.decision_register_import_reconciliation.unreconciled_row_count}`);
  lines.push(`- Reconciliation findings: ${report.decision_register_import_reconciliation.finding_count}`);
  lines.push("");
  lines.push("## Minimum Deferral Application");
  lines.push("");
  lines.push(`- Application coverage ready: ${report.minimum_deferral_application.application_coverage_ready}`);
  lines.push(`- Valid applied minimum decision rows: ${report.minimum_deferral_application.valid_applied_minimum_decision_row_count}`);
  lines.push(`- Missing minimum decision rows: ${report.minimum_deferral_application.missing_minimum_decision_row_count}`);
  lines.push(`- Remaining targets after valid applied rows: ${report.minimum_deferral_application.remaining_target_count_after_valid_applied_rows}`);
  lines.push(`- Application findings: ${report.minimum_deferral_application.finding_count}`);
  lines.push("");
  lines.push("## No-Go Guard");
  lines.push("");
  lines.push(`- No-Go active: ${report.no_go_claim_policy.no_go_active}`);
  lines.push(`- Forbidden true claims: ${report.no_go_claim_policy.forbidden_true_claim_count}`);
  lines.push(`- No-Go findings: ${report.no_go_claim_policy.finding_count}`);
  lines.push("");
  lines.push("## L9 Stabilization");
  lines.push("");
  lines.push(`- Closure status: ${report.l9_stabilization.closure.status}`);
  lines.push("");
  lines.push("| WP | Classification | Status |");
  lines.push("| --- | --- | --- |");
  for (const wp of report.l9_stabilization.work_packages) {
    lines.push(`| ${wp.wp_id} | ${wp.classification} | ${wp.command_status} |`);
  }
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  lines.push("| Command | Exit |");
  lines.push("| --- | ---: |");
  for (const command of report.commands) {
    lines.push(`| ${command.command} | ${command.exit_code} |`);
  }
  lines.push("");
  lines.push("## Completion Boundary");
  lines.push("");
  lines.push("The launch goal remains active because G1-G10 are not all pass, valid owner-approved deferrals do not cover every required blocker, and L9 stabilization is blocked pending four-week hypercare evidence or covered owner deferrals.");
  return `${lines.join("\n")}\n`;
}

const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();

const commands = [
  runNodeScript("scripts/validate-final-product-completion-gate.mjs"),
  runNodeScript("scripts/validate-implementation-layer-ledger.mjs"),
  runNodeScript("workbook/launch-tuw/validate-launch-tuw-ledger.mjs"),
  runNodeScript("scripts/audit-launch-authority-traceability.mjs"),
  runNodeScript("scripts/audit-launch-tuw-status.mjs"),
  runNodeScript("scripts/audit-launch-evidence-integrity.mjs"),
  runNodeScript("scripts/audit-launch-phase-exit-readiness.mjs"),
  runNodeScript("scripts/audit-launch-boundary-policy.mjs"),
  runNodeScript("scripts/audit-launch-review-waiver-policy.mjs"),
  runNodeScript("scripts/validate-launch-decision-register.mjs"),
  runNodeScript("scripts/audit-launch-decision-register-owner-evidence.mjs"),
  runNodeScript("scripts/generate-launch-manual-evidence-intake.mjs"),
  runNodeScript("scripts/validate-launch-manual-evidence-intake.mjs"),
  runNodeScript("scripts/generate-launch-evidence-acceptance-matrix.mjs"),
  runNodeScript("scripts/validate-launch-evidence-acceptance-matrix.mjs"),
  runNodeScript("scripts/generate-launch-owner-action-package.mjs"),
  runNodeScript("scripts/validate-launch-owner-action-package.mjs"),
  runNodeScript("scripts/audit-launch-blocker-surface.mjs"),
  runNodeScript("scripts/audit-launch-closure-dependency-graph.mjs"),
  runNodeScript("scripts/audit-launch-deferral-coverage.mjs"),
  runNodeScript("scripts/audit-launch-deferral-decision-id-contract.mjs"),
  runNodeScript("scripts/audit-launch-deferral-action-crosswalk.mjs"),
  runNodeScript("scripts/audit-launch-deferral-resolution-lanes.mjs"),
  runNodeScript("scripts/generate-launch-deferral-decision-register-template.mjs"),
  runNodeScript("scripts/validate-launch-deferral-decision-register-template.mjs"),
  runNodeScript("scripts/generate-launch-deferral-intake-batches.mjs"),
  runNodeScript("scripts/validate-launch-deferral-intake-batches.mjs"),
  runNodeScript("scripts/generate-launch-deferral-coverage-options.mjs"),
  runNodeScript("scripts/validate-launch-deferral-coverage-options.mjs"),
  runNodeScript("scripts/generate-launch-minimum-deferral-decision-packet.mjs"),
  runNodeScript("scripts/validate-launch-minimum-deferral-decision-packet.mjs"),
  runNodeScript("scripts/generate-launch-minimum-deferral-target-annex.mjs"),
  runNodeScript("scripts/validate-launch-minimum-deferral-target-annex.mjs"),
  runNodeScript("scripts/audit-launch-minimum-deferral-application.mjs"),
  runNodeScript("scripts/generate-launch-owner-decision-intake-runbook.mjs"),
  runNodeScript("scripts/validate-launch-owner-decision-intake-runbook.mjs"),
  runNodeScript("scripts/generate-launch-owner-approval-receipt-ledger.mjs"),
  runNodeScript("scripts/validate-launch-owner-approval-receipt-ledger.mjs"),
  runNodeScript("scripts/generate-launch-owner-approval-request-packet.mjs"),
  runNodeScript("scripts/validate-launch-owner-approval-request-packet.mjs"),
  runNodeScript("scripts/generate-launch-owner-response-intake.mjs"),
  runNodeScript("scripts/validate-launch-owner-response-intake.mjs"),
  runNodeScript("scripts/generate-launch-owner-response-receipt-candidates.mjs"),
  runNodeScript("scripts/validate-launch-owner-response-receipt-candidates.mjs"),
  runNodeScript("scripts/audit-launch-owner-response-receipt-application.mjs"),
  runNodeScript("scripts/audit-launch-owner-response-receipt-reconciliation.mjs"),
  runNodeScript("scripts/generate-launch-decision-register-import-candidates.mjs"),
  runNodeScript("scripts/validate-launch-decision-register-import-candidates.mjs"),
  runNodeScript("scripts/audit-launch-decision-register-import-application.mjs"),
  runNodeScript("scripts/audit-launch-decision-register-import-reconciliation.mjs"),
  runNodeScript("scripts/audit-launch-deferral-source-extraction.mjs"),
  runNodeScript("scripts/audit-launch-no-go-claim-policy.mjs"),
  runNodeScript("scripts/audit-launch-tuw-evidence-coverage.mjs"),
  runNodeScript("scripts/audit-launch-manual-evidence-completion-path.mjs")
];

const finalProductOutput = maybeParseJson(commands[0].stdout);
const authorityTraceabilityAudit = readJson(AUTHORITY_TRACEABILITY_AUDIT_PATH);
const launchAudit = readJson(LAUNCH_AUDIT_PATH);
const evidenceIntegrityAudit = readJson(EVIDENCE_INTEGRITY_AUDIT_PATH);
const tuwEvidenceCoverageAudit = readJson(TUW_EVIDENCE_COVERAGE_AUDIT_PATH);
const phaseExitAudit = readJson(PHASE_EXIT_AUDIT_PATH);
const blockerSurfaceAudit = readJson(BLOCKER_SURFACE_AUDIT_PATH);
const closureDependencyGraph = readJson(CLOSURE_DEPENDENCY_GRAPH_PATH);
const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const deferralDecisionIdContractAudit = readJson(DEFERRAL_DECISION_ID_CONTRACT_AUDIT_PATH);
const deferralActionCrosswalkAudit = readJson(DEFERRAL_ACTION_CROSSWALK_AUDIT_PATH);
const deferralResolutionLanesAudit = readJson(DEFERRAL_RESOLUTION_LANES_AUDIT_PATH);
const deferralDecisionRegisterTemplateValidation = readJson(DEFERRAL_DECISION_REGISTER_TEMPLATE_VALIDATION_PATH);
const deferralIntakeBatchesValidation = readJson(DEFERRAL_INTAKE_BATCHES_VALIDATION_PATH);
const deferralCoverageOptionsValidation = readJson(DEFERRAL_COVERAGE_OPTIONS_VALIDATION_PATH);
const minimumDeferralDecisionPacketValidation = readJson(MINIMUM_DEFERRAL_DECISION_PACKET_VALIDATION_PATH);
const minimumDeferralTargetAnnexValidation = readJson(MINIMUM_DEFERRAL_TARGET_ANNEX_VALIDATION_PATH);
const minimumDeferralApplicationAudit = readJson(MINIMUM_DEFERRAL_APPLICATION_AUDIT_PATH);
const ownerDecisionIntakeRunbookValidation = readJson(OWNER_DECISION_INTAKE_RUNBOOK_VALIDATION_PATH);
const ownerApprovalReceiptLedgerValidation = readJson(OWNER_APPROVAL_RECEIPT_LEDGER_VALIDATION_PATH);
const ownerApprovalRequestPacketValidation = readJson(OWNER_APPROVAL_REQUEST_PACKET_VALIDATION_PATH);
const ownerResponseIntakeValidation = readJson(OWNER_RESPONSE_INTAKE_VALIDATION_PATH);
const ownerResponseReceiptCandidatesValidation = readJson(OWNER_RESPONSE_RECEIPT_CANDIDATES_VALIDATION_PATH);
const ownerResponseReceiptApplicationAudit = readJson(OWNER_RESPONSE_RECEIPT_APPLICATION_AUDIT_PATH);
const ownerResponseReceiptReconciliationAudit = readJson(OWNER_RESPONSE_RECEIPT_RECONCILIATION_AUDIT_PATH);
const decisionRegisterImportCandidatesValidation = readJson(DECISION_REGISTER_IMPORT_CANDIDATES_VALIDATION_PATH);
const decisionRegisterImportApplicationAudit = readJson(DECISION_REGISTER_IMPORT_APPLICATION_AUDIT_PATH);
const decisionRegisterImportReconciliationAudit = readJson(DECISION_REGISTER_IMPORT_RECONCILIATION_AUDIT_PATH);
const deferralSourceExtractionAudit = readJson(DEFERRAL_SOURCE_EXTRACTION_AUDIT_PATH);
const noGoClaimPolicyAudit = readJson(NO_GO_CLAIM_POLICY_AUDIT_PATH);
const boundaryAudit = readJson(BOUNDARY_AUDIT_PATH);
const reviewWaiverAudit = readJson(REVIEW_WAIVER_AUDIT_PATH);
const decisionRegisterValidation = readJson(DECISION_REGISTER_VALIDATION_PATH);
const decisionRegisterOwnerEvidenceAudit = readJson(DECISION_REGISTER_OWNER_EVIDENCE_AUDIT_PATH);
const manualEvidenceIntakeValidation = readJson(MANUAL_EVIDENCE_INTAKE_VALIDATION_PATH);
const evidenceAcceptanceMatrixValidation = readJson(EVIDENCE_ACCEPTANCE_MATRIX_VALIDATION_PATH);
const manualEvidenceCompletionPathAudit = readJson(MANUAL_EVIDENCE_COMPLETION_PATH_AUDIT_PATH);
const ownerActionValidation = readJson(OWNER_ACTION_VALIDATION_PATH);
const l9WorkPackages = l9Status(launchAudit);
const stabilizationClosure = stabilizationClosureSummary();

const cpCloseoutPass = commandPassed(commands[0]) && finalProductOutput?.verdict === "PASS";
const implementationLedgerPass = commandPassed(commands[1]);
const launchLedgerPass = commandPassed(commands[2]);
const authorityTraceabilityValid = commandPassed(commands[3]) && authorityTraceabilityAudit.verdict === "PASS";
const launchEvidenceStandardized =
  commandPassed(commands[4]) &&
  launchAudit.summary.standard_five_present_count === launchAudit.summary.work_package_count &&
  launchAudit.summary.command_evidence_present_count === launchAudit.summary.work_package_count &&
  launchAudit.summary.missing_evidence_count === 0;
const evidenceIntegrityValid = commandPassed(commands[5]) && evidenceIntegrityAudit.verdict === "PASS";
const phaseExitReadinessValid = commandPassed(commands[6]) && phaseExitAudit.verdict === "PASS";
const launchBoundaryPolicyValid = commandPassed(commands[7]) && boundaryAudit.verdict === "PASS";
const launchReviewWaiverPolicyValid = commandPassed(commands[8]) && reviewWaiverAudit.verdict === "PASS";
const launchDecisionRegisterValid = commandPassed(commands[9]) && decisionRegisterValidation.verdict === "PASS";
const launchDecisionRegisterOwnerEvidenceValid = commandPassed(commands[10]) && decisionRegisterOwnerEvidenceAudit.verdict === "PASS";
const manualEvidenceIntakeValid = commandPassed(commands[12]) && manualEvidenceIntakeValidation.verdict === "PASS";
const evidenceAcceptanceMatrixValid = commandPassed(commands[14]) && evidenceAcceptanceMatrixValidation.verdict === "PASS";
const manualEvidenceCompletionPathAuditValid = commandPassed(commands[53]) && manualEvidenceCompletionPathAudit.verdict === "PASS";
const ownerActionPackageValid = commandPassed(commands[16]) && ownerActionValidation.verdict === "PASS";
const blockerSurfaceAuditValid = commandPassed(commands[17]) && blockerSurfaceAudit.verdict === "PASS";
const closureDependencyGraphValid = commandPassed(commands[18]) && closureDependencyGraph.verdict === "PASS";
const deferralCoverageAuditValid = commandPassed(commands[19]) && deferralCoverageAudit.verdict === "PASS";
const deferralDecisionIdContractAuditValid = commandPassed(commands[20]) && deferralDecisionIdContractAudit.verdict === "PASS";
const deferralActionCrosswalkAuditValid = commandPassed(commands[21]) && deferralActionCrosswalkAudit.verdict === "PASS";
const deferralResolutionLanesAuditValid = commandPassed(commands[22]) && deferralResolutionLanesAudit.verdict === "PASS";
const deferralDecisionRegisterTemplateValid =
  commandPassed(commands[23]) &&
  commandPassed(commands[24]) &&
  deferralDecisionRegisterTemplateValidation.verdict === "PASS";
const deferralIntakeBatchesValid =
  commandPassed(commands[25]) &&
  commandPassed(commands[26]) &&
  deferralIntakeBatchesValidation.verdict === "PASS";
const deferralCoverageOptionsValid =
  commandPassed(commands[27]) &&
  commandPassed(commands[28]) &&
  deferralCoverageOptionsValidation.verdict === "PASS";
const minimumDeferralDecisionPacketValid =
  commandPassed(commands[29]) &&
  commandPassed(commands[30]) &&
  minimumDeferralDecisionPacketValidation.verdict === "PASS";
const minimumDeferralTargetAnnexValid =
  commandPassed(commands[31]) &&
  commandPassed(commands[32]) &&
  minimumDeferralTargetAnnexValidation.verdict === "PASS";
const minimumDeferralApplicationAuditValid = commandPassed(commands[33]) && minimumDeferralApplicationAudit.verdict === "PASS";
const ownerDecisionIntakeRunbookValid =
  commandPassed(commands[34]) &&
  commandPassed(commands[35]) &&
  ownerDecisionIntakeRunbookValidation.verdict === "PASS";
const ownerApprovalReceiptLedgerValid =
  commandPassed(commands[36]) &&
  commandPassed(commands[37]) &&
  ownerApprovalReceiptLedgerValidation.verdict === "PASS";
const ownerApprovalRequestPacketValid =
  commandPassed(commands[38]) &&
  commandPassed(commands[39]) &&
  ownerApprovalRequestPacketValidation.verdict === "PASS";
const ownerResponseIntakeValid =
  commandPassed(commands[40]) &&
  commandPassed(commands[41]) &&
  ownerResponseIntakeValidation.verdict === "PASS";
const ownerResponseReceiptCandidatesValid =
  commandPassed(commands[42]) &&
  commandPassed(commands[43]) &&
  ownerResponseReceiptCandidatesValidation.verdict === "PASS";
const ownerResponseReceiptApplicationValid =
  commandPassed(commands[44]) &&
  ownerResponseReceiptApplicationAudit.verdict === "PASS";
const ownerResponseReceiptReconciliationValid =
  commandPassed(commands[45]) &&
  ownerResponseReceiptReconciliationAudit.verdict === "PASS";
const decisionRegisterImportCandidatesValid =
  commandPassed(commands[46]) &&
  commandPassed(commands[47]) &&
  decisionRegisterImportCandidatesValidation.verdict === "PASS";
const decisionRegisterImportApplicationValid =
  commandPassed(commands[48]) &&
  decisionRegisterImportApplicationAudit.verdict === "PASS";
const decisionRegisterImportReconciliationValid =
  commandPassed(commands[49]) &&
  decisionRegisterImportReconciliationAudit.verdict === "PASS";
const deferralSourceExtractionAuditValid = commandPassed(commands[50]) && deferralSourceExtractionAudit.verdict === "PASS";
const noGoClaimPolicyAuditValid = commandPassed(commands[51]) && noGoClaimPolicyAudit.verdict === "PASS";
const tuwEvidenceCoverageAuditValid = commandPassed(commands[52]) && tuwEvidenceCoverageAudit.verdict === "PASS";
const allLedgerTuwsEvidenceCovered = tuwEvidenceCoverageAudit.summary.all_ledger_tuws_evidence_covered;
const goLiveGateAcceptanceEvidenceSatisfied =
  evidenceAcceptanceMatrixValidation.summary.gate_acceptance_row_count > 0 &&
  evidenceAcceptanceMatrixValidation.summary.gate_evidence_satisfied_acceptance_row_count ===
    evidenceAcceptanceMatrixValidation.summary.gate_acceptance_row_count &&
  evidenceAcceptanceMatrixValidation.summary.gate_pending_acceptance_row_count === 0;
const l9AcceptanceEvidenceSatisfied =
  evidenceAcceptanceMatrixValidation.summary.l9_acceptance_row_count > 0 &&
  evidenceAcceptanceMatrixValidation.summary.l9_evidence_satisfied_acceptance_row_count ===
    evidenceAcceptanceMatrixValidation.summary.l9_acceptance_row_count &&
  evidenceAcceptanceMatrixValidation.summary.l9_pending_acceptance_row_count === 0;
const goLiveComplete =
  launchAudit.go_live_readiness.all_pass === true ||
  goLiveGateAcceptanceEvidenceSatisfied ||
  deferralCoverageAudit.summary.go_live_deferral_coverage_complete === true;
const l9ClosedOrApprovedDeferred =
  l9WorkPackages.every((wp) => wp.classification === "standard_five_recorded") ||
  l9AcceptanceEvidenceSatisfied ||
  deferralCoverageAudit.summary.l9_deferral_coverage_complete === true;

const requirements = {
  cp_closeout_completed_before_launch: requirement(cpCloseoutPass ? "satisfied" : "failed", [
    "scripts/validate-final-product-completion-gate.mjs",
    "docs/closeout-pack-plan/closeout-pack-plan.json"
  ]),
  launch_tuw_ledger_valid_72_wp_344_tuw: requirement(launchLedgerPass ? "satisfied" : "failed", [
    "workbook/launch-tuw/launch-tuw-ledger.json",
    "workbook/launch-tuw/validate-launch-tuw-ledger.mjs"
  ]),
  launch_planning_authority_traceable: requirement(authorityTraceabilityValid ? "satisfied" : "failed", [
    "/Users/jws/Downloads/LAUNCH_TUW_PACKAGE_PART1_COMBINED.md",
    "workbook/launch-tuw",
    "docs/launch/launch-authority-traceability-audit.json"
  ], [
    "Combined package and expanded workbook ledger remain traceable planning authority."
  ]),
  implementation_layer_ledger_valid: requirement(implementationLedgerPass ? "satisfied" : "failed", [
    "docs/closeout-pack-plan/implementation-layer-ledger.json",
    "scripts/validate-implementation-layer-ledger.mjs"
  ]),
  all_launch_wp_have_standard_five_evidence: requirement(launchEvidenceStandardized ? "satisfied" : "failed", [
    "docs/launch/launch-tuw-status-audit.json",
    "docs/goal-closeout/*"
  ]),
  launch_evidence_integrity_valid: requirement(evidenceIntegrityValid ? "satisfied" : "failed", [
    "docs/launch/launch-evidence-integrity-audit.json",
    "scripts/audit-launch-evidence-integrity.mjs"
  ], [
    "Launch standard evidence metadata matches the 72-WP ledger and preserves review waiver and no-go boundaries."
  ]),
  launch_tuw_evidence_coverage_audit_valid: requirement(tuwEvidenceCoverageAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-tuw-evidence-coverage-audit.json",
    "scripts/audit-launch-tuw-evidence-coverage.mjs"
  ], [
    "Each ledger TUW is checked for direct command/manual evidence coverage."
  ]),
  all_launch_tuws_have_evidence_coverage: requirement(
    allLedgerTuwsEvidenceCovered
      ? "satisfied"
      : "blocked_missing_tuw_evidence_coverage",
    [
      "docs/launch/launch-tuw-evidence-coverage-audit.json",
      "workbook/launch-tuw/launch-tuw-ledger.json",
      "docs/goal-closeout/<launch-goal-id>/command-evidence.json"
    ],
    allLedgerTuwsEvidenceCovered
      ? [
          "Every ledger TUW is represented by command/manual evidence coverage; blocked coverage rows remain non-completion evidence."
        ]
      : [
          "One or more ledger TUWs are not yet represented by command/manual evidence coverage."
        ]
  ),
  pre_l9_phase_exit_readiness_recorded: requirement(phaseExitReadinessValid ? "satisfied" : "failed", [
    "docs/launch/launch-phase-exit-readiness-audit.json",
    "scripts/audit-launch-phase-exit-readiness.mjs"
  ], [
    "PRE through L9 phase exits are recorded as closed, owner-deferred, or blocked."
  ]),
  pre_l9_phase_exits_closed_or_owner_deferred: requirement(
    phaseExitAudit.summary.all_phase_exits_closed_or_owner_deferred
      ? "satisfied"
      : "blocked_missing_owner_approved_deferrals",
    [
      "docs/launch/launch-phase-exit-readiness-audit.json",
      "docs/launch/launch-decision-register.md"
    ],
    [
      "One or more PRE-L9 phase exits remain blocked and the launch decision register has no valid owner-approved deferrals."
    ]
  ),
  no_cp_evidence_rewrite_boundary_preserved: requirement("satisfied", [
    "docs/launch/owner-action-deferral-request.json",
    "contracts/go-live-gate-contract.json"
  ], [
    "Current generated packages state closed CP evidence is read-only."
  ]),
  launch_boundary_policy_valid: requirement(launchBoundaryPolicyValid ? "satisfied" : "failed", [
    "docs/launch/launch-boundary-policy-audit.json",
    "scripts/audit-launch-boundary-policy.mjs"
  ], [
    "Launch command evidence is synthetic-data-only, no product-write, and closed CP evidence remains read-only."
  ]),
  synthetic_only_until_policy_gates_allow_otherwise: requirement("satisfied", [
    "docs/launch/launch-tuw-status-audit.json",
    "docs/launch/owner-action-deferral-request.json"
  ], [
    "Runtime, pilot, production, M365, and real-data tasks are blocked rather than claimed."
  ]),
  launch_review_waiver_policy_valid: requirement(launchReviewWaiverPolicyValid ? "satisfied" : "failed", [
    "docs/launch/launch-review-waiver-policy-audit.json",
    "scripts/audit-launch-review-waiver-policy.mjs"
  ], [
    "Full Claude review is waived and the waiver is not valid review evidence."
  ]),
  launch_decision_register_structurally_valid: requirement(launchDecisionRegisterValid ? "satisfied" : "failed", [
    "docs/launch/launch-decision-register.md",
    "docs/launch/launch-decision-register-validation.json"
  ]),
  launch_decision_register_owner_evidence_valid: requirement(launchDecisionRegisterOwnerEvidenceValid ? "satisfied" : "failed", [
    "docs/launch/launch-decision-register-owner-evidence-audit.json",
    "scripts/audit-launch-decision-register-owner-evidence.mjs",
    "docs/launch/launch-decision-register.md"
  ], [
    "Owner decision rows are checked for placeholder-free owner/basis/date/signature evidence; an empty register remains non-approval."
  ]),
  manual_evidence_intake_register_valid: requirement(manualEvidenceIntakeValid ? "satisfied" : "failed", [
    "docs/launch/launch-manual-evidence-intake-register.json",
    "docs/launch/launch-manual-evidence-intake-validation.json",
    "scripts/validate-launch-manual-evidence-intake.mjs"
  ], [
    "Current failed G1-G10 evidence slots and L9 closure criteria are represented as pending intake rows."
  ]),
  launch_evidence_acceptance_matrix_valid: requirement(evidenceAcceptanceMatrixValid ? "satisfied" : "failed", [
    "docs/launch/launch-evidence-acceptance-matrix.json",
    "docs/launch/launch-evidence-acceptance-matrix-validation.json",
    "scripts/validate-launch-evidence-acceptance-matrix.mjs"
  ], [
    "Failed G1-G10 evidence slots and L9 closure criteria have explicit future evidence/owner-deferral acceptance requirements."
  ]),
  launch_manual_evidence_completion_path_audit_valid: requirement(manualEvidenceCompletionPathAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-manual-evidence-completion-path-audit.json",
    "scripts/audit-launch-manual-evidence-completion-path.mjs"
  ], [
    "Manual intake row states are mirrored into acceptance rows so evidence-satisfied completion paths cannot drift from the goal audit inputs."
  ]),
  owner_action_package_valid: requirement(ownerActionPackageValid ? "satisfied" : "failed", [
    "docs/launch/owner-action-deferral-request-validation.json",
    "scripts/validate-launch-owner-action-package.mjs"
  ]),
  launch_blocker_surface_audit_valid: requirement(blockerSurfaceAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-blocker-surface-audit.json",
    "scripts/audit-launch-blocker-surface.mjs"
  ], [
    "Blocked work packages, failed gate evidence slots, manual intake rows, and phase-exit blockers are cross-checked."
  ]),
  launch_closure_dependency_graph_valid: requirement(closureDependencyGraphValid ? "satisfied" : "failed", [
    "docs/launch/launch-closure-dependency-graph.json",
    "scripts/audit-launch-closure-dependency-graph.mjs"
  ], [
    "Phase exits, failed gates, acceptance rows, L9 closure rows, and blocked work packages are linked without orphan blockers."
  ]),
  launch_deferral_coverage_audit_valid: requirement(deferralCoverageAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-coverage-audit.json",
    "scripts/audit-launch-deferral-coverage.mjs"
  ], [
    "Owner-approved deferral coverage is evaluated by target scope rather than by mere presence of one deferral row."
  ]),
  launch_deferral_decision_id_contract_valid: requirement(deferralDecisionIdContractAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-decision-id-contract-audit.json",
    "scripts/audit-launch-deferral-decision-id-contract.mjs",
    "scripts/lib/launch-decision-register.mjs"
  ], [
    "Accepted owner-deferral decision IDs are classified into the same coverage domains that the deferral coverage audit expects."
  ]),
  launch_deferral_action_crosswalk_valid: requirement(deferralActionCrosswalkAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-action-crosswalk-audit.json",
    "scripts/audit-launch-deferral-action-crosswalk.mjs"
  ], [
    "Every missing deferral target is linked to an actionable owner, manual-intake, or phase-exit source."
  ]),
  launch_deferral_resolution_lanes_valid: requirement(deferralResolutionLanesAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-resolution-lanes-audit.json",
    "scripts/audit-launch-deferral-resolution-lanes.mjs"
  ], [
    "Missing deferral targets are grouped into owner, external, runtime, policy, evidence, go-live, L9, and phase-exit resolution lanes."
  ]),
  launch_deferral_decision_register_template_valid: requirement(deferralDecisionRegisterTemplateValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-decision-register-template.json",
    "docs/launch/launch-deferral-decision-register-template-validation.json",
    "scripts/generate-launch-deferral-decision-register-template.mjs",
    "scripts/validate-launch-deferral-decision-register-template.mjs"
  ], [
    "Missing deferral targets have placeholder-only decision-register template rows, while the real launch decision register remains unmodified."
  ]),
  launch_deferral_intake_batches_valid: requirement(deferralIntakeBatchesValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-intake-batches.json",
    "docs/launch/launch-deferral-intake-batches-validation.json",
    "scripts/generate-launch-deferral-intake-batches.mjs",
    "scripts/validate-launch-deferral-intake-batches.mjs"
  ], [
    "Missing deferral targets are ordered into owner-action intake batches and matched to placeholder-only decision-register template rows."
  ]),
  launch_deferral_coverage_options_valid: requirement(deferralCoverageOptionsValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-coverage-options.json",
    "docs/launch/launch-deferral-coverage-options-validation.json",
    "scripts/generate-launch-deferral-coverage-options.mjs",
    "scripts/validate-launch-deferral-coverage-options.mjs"
  ], [
    "Coverage-eligible aggregate decision IDs are checked as routing options only; the minimum all-target bundle still requires real owner rows."
  ]),
  launch_minimum_deferral_decision_packet_valid: requirement(minimumDeferralDecisionPacketValid ? "satisfied" : "failed", [
    "docs/launch/launch-minimum-deferral-decision-packet.json",
    "docs/launch/launch-minimum-deferral-decision-packet-validation.json",
    "scripts/generate-launch-minimum-deferral-decision-packet.mjs",
    "scripts/validate-launch-minimum-deferral-decision-packet.mjs"
  ], [
    "The four aggregate deferral options are rendered as placeholder-only decision-register rows; real owner evidence is still required before coverage can close."
  ]),
  launch_minimum_deferral_target_annex_valid: requirement(minimumDeferralTargetAnnexValid ? "satisfied" : "failed", [
    "docs/launch/launch-minimum-deferral-target-annex.json",
    "docs/launch/launch-minimum-deferral-target-annex-validation.json",
    "scripts/generate-launch-minimum-deferral-target-annex.mjs",
    "scripts/validate-launch-minimum-deferral-target-annex.mjs"
  ], [
    "The target annex enumerates all 117 targets covered by the four placeholder-only aggregate deferral rows and verifies each aggregate decision ID is accepted for its target set."
  ]),
  launch_owner_decision_intake_runbook_valid: requirement(ownerDecisionIntakeRunbookValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-decision-intake-runbook.json",
    "docs/launch/launch-owner-decision-intake-runbook-validation.json",
    "scripts/generate-launch-owner-decision-intake-runbook.mjs",
    "scripts/validate-launch-owner-decision-intake-runbook.mjs"
  ], [
    "The owner intake runbook summarizes the four minimum rows, signature-reference formats, and validation sequence without modifying the decision register or treating placeholders as approval evidence."
  ]),
  launch_owner_approval_receipt_ledger_valid: requirement(ownerApprovalReceiptLedgerValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-approval-receipt-ledger.json",
    "docs/launch/launch-owner-approval-receipt-ledger-validation.json",
    "scripts/generate-launch-owner-approval-receipt-ledger.mjs",
    "scripts/validate-launch-owner-approval-receipt-ledger.mjs"
  ], [
    "The receipt ledger provides four pending owner-approval evidence slots and verifies pending slots cannot be counted as deferral approval or copied into the launch decision register."
  ]),
  launch_owner_approval_request_packet_valid: requirement(ownerApprovalRequestPacketValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-approval-request-packet.json",
    "docs/launch/launch-owner-approval-request-packet-validation.json",
    "scripts/generate-launch-owner-approval-request-packet.mjs",
    "scripts/validate-launch-owner-approval-request-packet.mjs"
  ], [
    "The owner approval request packet renders pending receipt slots into request cards without counting those cards as owner evidence or decision-register copy permission."
  ]),
  launch_owner_response_intake_valid: requirement(ownerResponseIntakeValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-response-intake.json",
    "docs/launch/launch-owner-response-intake-validation.json",
    "scripts/generate-launch-owner-response-intake.mjs",
    "scripts/validate-launch-owner-response-intake.mjs"
  ], [
    "The owner response intake preserves future human response fields while pending entries remain non-approval and cannot be copied into the receipt ledger."
  ]),
  launch_owner_response_receipt_candidates_valid: requirement(ownerResponseReceiptCandidatesValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-response-receipt-candidates.json",
    "docs/launch/launch-owner-response-receipt-candidates-validation.json",
    "scripts/generate-launch-owner-response-receipt-candidates.mjs",
    "scripts/validate-launch-owner-response-receipt-candidates.mjs"
  ], [
    "Only real copy-ready owner responses can produce receipt-update candidates; pending responses produce no owner-evidence receipt updates."
  ]),
  launch_owner_response_receipt_application_valid: requirement(ownerResponseReceiptApplicationValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-response-receipt-application-audit.json",
    "scripts/audit-launch-owner-response-receipt-application.mjs",
    "docs/launch/launch-owner-approval-receipt-ledger.json",
    "docs/launch/launch-owner-response-receipt-candidates.json"
  ], [
    "Validated receipt-update candidates are audited as applied, pending manual application, or mismatched without modifying the receipt ledger or counting pending application as approval."
  ]),
  launch_owner_response_receipt_reconciliation_valid: requirement(ownerResponseReceiptReconciliationValid ? "satisfied" : "failed", [
    "docs/launch/launch-owner-response-receipt-reconciliation-audit.json",
    "scripts/audit-launch-owner-response-receipt-reconciliation.mjs",
    "docs/launch/launch-owner-approval-receipt-ledger.json",
    "docs/launch/launch-owner-response-receipt-candidates.json"
  ], [
    "Real receipt ledger slots must reconcile to validated receipt-update candidates; empty real-receipt state remains non-approval."
  ]),
  launch_decision_register_import_candidates_valid: requirement(decisionRegisterImportCandidatesValid ? "satisfied" : "failed", [
    "docs/launch/launch-decision-register-import-candidates.json",
    "docs/launch/launch-decision-register-import-candidates-validation.json",
    "scripts/generate-launch-decision-register-import-candidates.mjs",
    "scripts/validate-launch-decision-register-import-candidates.mjs"
  ], [
    "Import candidates are generated only from real copy-allowed owner receipt slots; pending receipt slots produce no decision-register rows."
  ]),
  launch_decision_register_import_application_valid: requirement(decisionRegisterImportApplicationValid ? "satisfied" : "failed", [
    "docs/launch/launch-decision-register-import-application-audit.json",
    "scripts/audit-launch-decision-register-import-application.mjs",
    "docs/launch/launch-decision-register.md",
    "docs/launch/launch-decision-register-import-candidates.json"
  ], [
    "Validated decision-register import candidates are audited as applied, pending manual application, or mismatched without modifying the register or counting pending application as approval."
  ]),
  launch_decision_register_import_reconciliation_valid: requirement(decisionRegisterImportReconciliationValid ? "satisfied" : "failed", [
    "docs/launch/launch-decision-register-import-reconciliation-audit.json",
    "scripts/audit-launch-decision-register-import-reconciliation.mjs",
    "docs/launch/launch-decision-register.md",
    "docs/launch/launch-decision-register-import-candidates.json"
  ], [
    "Decision-register rows must reconcile to validated import candidates; empty register remains non-approval."
  ]),
  launch_minimum_deferral_application_audit_valid: requirement(minimumDeferralApplicationAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-minimum-deferral-application-audit.json",
    "scripts/audit-launch-minimum-deferral-application.mjs",
    "docs/launch/launch-decision-register.md"
  ], [
    "The minimum decision packet application is monitored against the real launch decision register without treating missing owner rows as approval evidence."
  ]),
  launch_deferral_source_extraction_audit_valid: requirement(deferralSourceExtractionAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-deferral-source-extraction-audit.json",
    "scripts/audit-launch-deferral-source-extraction.mjs",
    "docs/launch/deferral-review-register.md"
  ], [
    "LT-L0-W03 source markers are classified so broad P2/overlay tokens are not mistaken for unresolved owner-approved deferrals."
  ]),
  launch_deferral_coverage_complete: requirement(
    deferralCoverageAudit.summary.all_required_deferrals_covered
      ? "satisfied"
      : "blocked_missing_owner_approved_deferrals",
    [
      "docs/launch/launch-deferral-coverage-audit.json",
      "docs/launch/launch-decision-register.md"
    ],
    [
      "Required gate, L9, blocked-WP, and phase-exit deferral targets are not fully covered by valid owner-approved deferral rows."
    ]
  ),
  launch_no_go_claim_policy_valid: requirement(noGoClaimPolicyAuditValid ? "satisfied" : "failed", [
    "docs/launch/launch-no-go-claim-policy-audit.json",
    "scripts/audit-launch-no-go-claim-policy.mjs"
  ], [
    "Launch markdown and JSON artifacts are guarded against approval, execution, production-ready, and go-live claims while No-Go remains active."
  ]),
  g1_g10_go_live_closed_or_owner_deferred: requirement(goLiveComplete ? "satisfied" : "blocked_missing_owner_approved_deferrals", [
    "docs/launch/launch-tuw-status-audit.json",
    "contracts/go-live-gate-contract.json",
    "docs/launch/launch-evidence-acceptance-matrix-validation.json",
    "docs/launch/launch-deferral-coverage-audit.json"
  ], [
    "G1-G10 all pass is false, failed gate evidence slots are not all evidence-satisfied, and valid owner-approved deferrals do not cover every failed go-live evidence slot."
  ]),
  l9_stabilization_closed_or_owner_deferred: requirement(l9ClosedOrApprovedDeferred ? "satisfied" : "blocked_missing_four_week_hypercare_and_owner_deferral", [
    "docs/launch/stabilization-closure.md",
    "docs/launch/launch-evidence-acceptance-matrix-validation.json",
    "docs/launch/launch-deferral-coverage-audit.json"
  ], [
    "L9 work packages are standard-five blocked, L9 acceptance rows are not all evidence-satisfied, and valid owner-approved deferrals do not cover every L9 stabilization closure criterion."
  ])
};

const verdict =
  goLiveComplete && l9ClosedOrApprovedDeferred && Object.values(requirements).every((item) => item.status === "satisfied")
    ? "COMPLETE"
    : "NOT_COMPLETE";

const report = {
  schema_version: "law-firm-os.launch-goal-completion-audit.v0.1",
  generated_at: generatedAt,
  source_refs: [
    AUTHORITY_TRACEABILITY_AUDIT_PATH,
    LAUNCH_AUDIT_PATH,
    EVIDENCE_INTEGRITY_AUDIT_PATH,
    TUW_EVIDENCE_COVERAGE_AUDIT_PATH,
    PHASE_EXIT_AUDIT_PATH,
    BLOCKER_SURFACE_AUDIT_PATH,
    CLOSURE_DEPENDENCY_GRAPH_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH,
    DEFERRAL_DECISION_ID_CONTRACT_AUDIT_PATH,
    DEFERRAL_ACTION_CROSSWALK_AUDIT_PATH,
    DEFERRAL_RESOLUTION_LANES_AUDIT_PATH,
    DEFERRAL_DECISION_REGISTER_TEMPLATE_VALIDATION_PATH,
    DEFERRAL_INTAKE_BATCHES_VALIDATION_PATH,
    DEFERRAL_COVERAGE_OPTIONS_VALIDATION_PATH,
    MINIMUM_DEFERRAL_DECISION_PACKET_VALIDATION_PATH,
    MINIMUM_DEFERRAL_TARGET_ANNEX_PATH,
    MINIMUM_DEFERRAL_TARGET_ANNEX_VALIDATION_PATH,
    MINIMUM_DEFERRAL_APPLICATION_AUDIT_PATH,
    OWNER_DECISION_INTAKE_RUNBOOK_PATH,
    OWNER_DECISION_INTAKE_RUNBOOK_VALIDATION_PATH,
    OWNER_APPROVAL_RECEIPT_LEDGER_PATH,
    OWNER_APPROVAL_RECEIPT_LEDGER_VALIDATION_PATH,
    OWNER_APPROVAL_REQUEST_PACKET_VALIDATION_PATH,
    OWNER_RESPONSE_INTAKE_VALIDATION_PATH,
    OWNER_RESPONSE_RECEIPT_CANDIDATES_VALIDATION_PATH,
    OWNER_RESPONSE_RECEIPT_APPLICATION_AUDIT_PATH,
    OWNER_RESPONSE_RECEIPT_RECONCILIATION_AUDIT_PATH,
    DECISION_REGISTER_IMPORT_CANDIDATES_PATH,
    DECISION_REGISTER_IMPORT_CANDIDATES_VALIDATION_PATH,
    DECISION_REGISTER_IMPORT_APPLICATION_AUDIT_PATH,
    DECISION_REGISTER_IMPORT_RECONCILIATION_AUDIT_PATH,
    DEFERRAL_SOURCE_EXTRACTION_AUDIT_PATH,
    NO_GO_CLAIM_POLICY_AUDIT_PATH,
    BOUNDARY_AUDIT_PATH,
    REVIEW_WAIVER_AUDIT_PATH,
    DECISION_REGISTER_VALIDATION_PATH,
    DECISION_REGISTER_OWNER_EVIDENCE_AUDIT_PATH,
    MANUAL_EVIDENCE_INTAKE_VALIDATION_PATH,
    EVIDENCE_ACCEPTANCE_MATRIX_VALIDATION_PATH,
    MANUAL_EVIDENCE_COMPLETION_PATH_AUDIT_PATH,
    OWNER_ACTION_VALIDATION_PATH,
    STABILIZATION_CLOSURE_PATH,
    "contracts/go-live-gate-contract.json",
    "docs/launch/launch-decision-register.md"
  ],
  verdict,
  boundary: {
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  requirements,
  launch_readiness: {
    go_live_all_pass: launchAudit.go_live_readiness.all_pass,
    failed_gate_ids: launchAudit.go_live_readiness.failed_gate_ids,
    owner_approved_deferrals_present: launchAudit.launch_decisions.owner_approved_deferrals_present,
    blocked_or_pending_count: launchAudit.summary.blocked_or_pending_count,
    standard_five_present_count: launchAudit.summary.standard_five_present_count,
    command_evidence_present_count: launchAudit.summary.command_evidence_present_count,
    missing_evidence_count: launchAudit.summary.missing_evidence_count
  },
  phase_exit_readiness: {
    all_phase_exits_closed_or_owner_deferred: phaseExitAudit.summary.all_phase_exits_closed_or_owner_deferred,
    blocked_phase_count: phaseExitAudit.summary.blocked_phase_count,
    total_blocked_work_package_count: phaseExitAudit.summary.total_blocked_work_package_count
  },
  decision_register_owner_evidence: {
    decision_register_total_rows: decisionRegisterOwnerEvidenceAudit.summary.decision_register_total_rows,
    owner_evidence_row_count: decisionRegisterOwnerEvidenceAudit.summary.owner_evidence_row_count,
    owner_evidence_quality_pass_count: decisionRegisterOwnerEvidenceAudit.summary.owner_evidence_quality_pass_count,
    owner_evidence_quality_blocked_count: decisionRegisterOwnerEvidenceAudit.summary.owner_evidence_quality_blocked_count,
    weak_owner_evidence_row_count: decisionRegisterOwnerEvidenceAudit.summary.weak_owner_evidence_row_count,
    agent_inferred_owner_evidence_row_count: decisionRegisterOwnerEvidenceAudit.summary.agent_inferred_owner_evidence_row_count,
    finding_count: decisionRegisterOwnerEvidenceAudit.summary.finding_count
  },
  evidence_integrity: {
    integrity_pass_count: evidenceIntegrityAudit.summary.integrity_pass_count,
    integrity_failed_count: evidenceIntegrityAudit.summary.integrity_failed_count,
    finding_count: evidenceIntegrityAudit.summary.finding_count
  },
  tuw_evidence_coverage: {
    ledger_tuw_count: tuwEvidenceCoverageAudit.summary.ledger_tuw_count,
    covered_ledger_tuw_count: tuwEvidenceCoverageAudit.summary.covered_ledger_tuw_count,
    missing_ledger_tuw_count: tuwEvidenceCoverageAudit.summary.missing_ledger_tuw_count,
    terminal_tuw_missing_evidence_count: tuwEvidenceCoverageAudit.summary.terminal_tuw_missing_evidence_count,
    wp_with_missing_tuw_evidence_count: tuwEvidenceCoverageAudit.summary.wp_with_missing_tuw_evidence_count
  },
  blocker_surface: {
    blocked_work_package_count: blockerSurfaceAudit.summary.blocked_work_package_count,
    failed_gate_evidence_slot_count: blockerSurfaceAudit.summary.failed_gate_evidence_slot_count,
    total_manual_intake_row_count: blockerSurfaceAudit.summary.total_manual_intake_row_count,
    pending_manual_intake_row_count: blockerSurfaceAudit.summary.pending_manual_intake_row_count,
    evidence_satisfied_manual_intake_row_count: blockerSurfaceAudit.summary.evidence_satisfied_manual_intake_row_count,
    owner_deferred_manual_intake_row_count: blockerSurfaceAudit.summary.owner_deferred_manual_intake_row_count,
    blocked_phase_count: blockerSurfaceAudit.summary.blocked_phase_count
  },
  manual_evidence_intake: {
    gate_intake_count: manualEvidenceIntakeValidation.summary.gate_intake_count,
    l9_stabilization_intake_count: manualEvidenceIntakeValidation.summary.l9_stabilization_intake_count,
    total_intake_row_count: manualEvidenceIntakeValidation.summary.total_intake_row_count,
    pending_intake_count: manualEvidenceIntakeValidation.summary.pending_intake_count,
    evidence_satisfied_count: manualEvidenceIntakeValidation.summary.evidence_satisfied_count,
    owner_deferred_count: manualEvidenceIntakeValidation.summary.owner_deferred_count,
    valid_decision_register_deferred_rows: manualEvidenceIntakeValidation.summary.valid_decision_register_deferred_rows,
    coverage_eligible_valid_deferred_rows: manualEvidenceIntakeValidation.summary.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: manualEvidenceIntakeValidation.summary.non_coverage_valid_deferred_rows,
    finding_count: manualEvidenceIntakeValidation.summary.finding_count
  },
  evidence_acceptance_matrix: {
    gate_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.gate_acceptance_row_count,
    l9_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.l9_acceptance_row_count,
    total_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.total_acceptance_row_count,
    pending_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.pending_acceptance_row_count,
    evidence_satisfied_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.evidence_satisfied_acceptance_row_count,
    owner_deferred_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.owner_deferred_acceptance_row_count,
    missing_intake_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.missing_intake_acceptance_row_count,
    gate_pending_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.gate_pending_acceptance_row_count,
    gate_evidence_satisfied_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.gate_evidence_satisfied_acceptance_row_count,
    gate_owner_deferred_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.gate_owner_deferred_acceptance_row_count,
    l9_pending_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.l9_pending_acceptance_row_count,
    l9_evidence_satisfied_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.l9_evidence_satisfied_acceptance_row_count,
    l9_owner_deferred_acceptance_row_count: evidenceAcceptanceMatrixValidation.summary.l9_owner_deferred_acceptance_row_count,
    finding_count: evidenceAcceptanceMatrixValidation.summary.finding_count
  },
  manual_evidence_completion_path: {
    total_manual_intake_row_count: manualEvidenceCompletionPathAudit.summary.total_manual_intake_row_count,
    total_acceptance_row_count: manualEvidenceCompletionPathAudit.summary.total_acceptance_row_count,
    pending_manual_intake_row_count: manualEvidenceCompletionPathAudit.summary.pending_manual_intake_row_count,
    pending_acceptance_row_count: manualEvidenceCompletionPathAudit.summary.pending_acceptance_row_count,
    evidence_satisfied_manual_intake_row_count: manualEvidenceCompletionPathAudit.summary.evidence_satisfied_manual_intake_row_count,
    evidence_satisfied_acceptance_row_count: manualEvidenceCompletionPathAudit.summary.evidence_satisfied_acceptance_row_count,
    owner_deferred_manual_intake_row_count: manualEvidenceCompletionPathAudit.summary.owner_deferred_manual_intake_row_count,
    owner_deferred_acceptance_row_count: manualEvidenceCompletionPathAudit.summary.owner_deferred_acceptance_row_count,
    missing_intake_acceptance_row_count: manualEvidenceCompletionPathAudit.summary.missing_intake_acceptance_row_count,
    go_live_evidence_completion_path_ready: manualEvidenceCompletionPathAudit.path_projection.go_live_evidence_completion_path_ready,
    l9_evidence_completion_path_ready: manualEvidenceCompletionPathAudit.path_projection.l9_evidence_completion_path_ready,
    all_evidence_completion_paths_ready: manualEvidenceCompletionPathAudit.path_projection.all_evidence_completion_paths_ready,
    owner_deferred_rows_require_coverage: manualEvidenceCompletionPathAudit.path_projection.owner_deferred_rows_require_coverage,
    finding_count: manualEvidenceCompletionPathAudit.summary.finding_count
  },
  closure_dependency_graph: {
    phase_node_count: closureDependencyGraph.summary.phase_node_count,
    failed_gate_node_count: closureDependencyGraph.summary.failed_gate_node_count,
    gate_acceptance_node_count: closureDependencyGraph.summary.gate_acceptance_node_count,
    l9_closure_node_count: closureDependencyGraph.summary.l9_closure_node_count,
    pending_acceptance_node_count: closureDependencyGraph.summary.pending_acceptance_node_count,
    evidence_satisfied_acceptance_node_count: closureDependencyGraph.summary.evidence_satisfied_acceptance_node_count,
    owner_deferred_acceptance_node_count: closureDependencyGraph.summary.owner_deferred_acceptance_node_count,
    missing_intake_acceptance_node_count: closureDependencyGraph.summary.missing_intake_acceptance_node_count,
    blocked_wp_node_count: closureDependencyGraph.summary.blocked_wp_node_count,
    finding_count: closureDependencyGraph.summary.finding_count
  },
  deferral_coverage: {
    valid_deferred_decision_count: deferralCoverageAudit.summary.valid_deferred_decision_count,
    coverage_eligible_valid_deferred_decision_count: deferralCoverageAudit.summary.coverage_eligible_valid_deferred_decision_count,
    non_coverage_valid_deferred_decision_count: deferralCoverageAudit.summary.non_coverage_valid_deferred_decision_count,
    all_required_deferrals_covered: deferralCoverageAudit.summary.all_required_deferrals_covered,
    go_live_missing_deferral_count: deferralCoverageAudit.summary.go_live_missing_deferral_count,
    l9_missing_deferral_count: deferralCoverageAudit.summary.l9_missing_deferral_count,
    blocked_wp_missing_deferral_count: deferralCoverageAudit.summary.blocked_wp_missing_deferral_count,
    phase_exit_missing_deferral_count: deferralCoverageAudit.summary.phase_exit_missing_deferral_count
  },
  deferral_decision_id_contract: {
    accepted_decision_id_mention_count: deferralDecisionIdContractAudit.summary.accepted_decision_id_mention_count,
    unique_accepted_decision_id_count: deferralDecisionIdContractAudit.summary.unique_accepted_decision_id_count,
    unclassified_decision_id_count: deferralDecisionIdContractAudit.summary.unclassified_decision_id_count,
    domain_mismatch_count: deferralDecisionIdContractAudit.summary.domain_mismatch_count,
    cross_domain_decision_id_count: deferralDecisionIdContractAudit.summary.cross_domain_decision_id_count,
    finding_count: deferralDecisionIdContractAudit.summary.finding_count
  },
  deferral_action_crosswalk: {
    missing_deferral_target_count: deferralActionCrosswalkAudit.summary.missing_deferral_target_count,
    crosswalk_row_count: deferralActionCrosswalkAudit.summary.crosswalk_row_count,
    action_linked_count: deferralActionCrosswalkAudit.summary.action_linked_count,
    missing_action_source_count: deferralActionCrosswalkAudit.summary.missing_action_source_count,
    gate_manual_intake_link_count: deferralActionCrosswalkAudit.summary.gate_manual_intake_link_count,
    l9_manual_intake_link_count: deferralActionCrosswalkAudit.summary.l9_manual_intake_link_count,
    blocked_wp_owner_action_link_count: deferralActionCrosswalkAudit.summary.blocked_wp_owner_action_link_count,
    phase_exit_link_count: deferralActionCrosswalkAudit.summary.phase_exit_link_count,
    finding_count: deferralActionCrosswalkAudit.summary.finding_count
  },
  deferral_resolution_lanes: {
    missing_deferral_target_count: deferralResolutionLanesAudit.summary.missing_deferral_target_count,
    classified_target_count: deferralResolutionLanesAudit.summary.classified_target_count,
    primary_lane_count: deferralResolutionLanesAudit.summary.primary_lane_count,
    lane_mention_count: deferralResolutionLanesAudit.summary.lane_mention_count,
    unclassified_target_count: deferralResolutionLanesAudit.summary.unclassified_target_count,
    finding_count: deferralResolutionLanesAudit.summary.finding_count,
    primary_lane_counts: deferralResolutionLanesAudit.primary_lane_counts
  },
  deferral_decision_register_template: {
    template_row_count: deferralDecisionRegisterTemplateValidation.summary.template_row_count,
    source_missing_deferral_target_count: deferralDecisionRegisterTemplateValidation.summary.source_missing_deferral_target_count,
    decision_register_total_rows: deferralDecisionRegisterTemplateValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: deferralDecisionRegisterTemplateValidation.summary.decision_register_valid_deferred_rows,
    placeholder_row_count: deferralDecisionRegisterTemplateValidation.summary.placeholder_row_count,
    finding_count: deferralDecisionRegisterTemplateValidation.summary.finding_count
  },
  deferral_intake_batches: {
    intake_target_count: deferralIntakeBatchesValidation.summary.intake_target_count,
    source_missing_deferral_target_count: deferralIntakeBatchesValidation.summary.source_missing_deferral_target_count,
    template_row_count: deferralIntakeBatchesValidation.summary.template_row_count,
    batch_count: deferralIntakeBatchesValidation.summary.batch_count,
    non_empty_batch_count: deferralIntakeBatchesValidation.summary.non_empty_batch_count,
    decision_register_total_rows: deferralIntakeBatchesValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: deferralIntakeBatchesValidation.summary.decision_register_valid_deferred_rows,
    not_approved_target_count: deferralIntakeBatchesValidation.summary.not_approved_target_count,
    template_matched_target_count: deferralIntakeBatchesValidation.summary.template_matched_target_count,
    finding_count: deferralIntakeBatchesValidation.summary.finding_count
  },
  deferral_coverage_options: {
    missing_deferral_target_count: deferralCoverageOptionsValidation.summary.missing_deferral_target_count,
    minimum_bundle_decision_id_count: deferralCoverageOptionsValidation.summary.minimum_bundle_decision_id_count,
    minimum_bundle_covered_target_count: deferralCoverageOptionsValidation.summary.minimum_bundle_covered_target_count,
    minimum_bundle_uncovered_target_count: deferralCoverageOptionsValidation.summary.minimum_bundle_uncovered_target_count,
    option_count: deferralCoverageOptionsValidation.summary.option_count,
    decision_register_total_rows: deferralCoverageOptionsValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: deferralCoverageOptionsValidation.summary.decision_register_valid_deferred_rows,
    finding_count: deferralCoverageOptionsValidation.summary.finding_count
  },
  minimum_deferral_decision_packet: {
    placeholder_decision_row_count: minimumDeferralDecisionPacketValidation.summary.placeholder_decision_row_count,
    minimum_bundle_decision_id_count: minimumDeferralDecisionPacketValidation.summary.minimum_bundle_decision_id_count,
    covered_target_count_if_owner_rows_are_completed: minimumDeferralDecisionPacketValidation.summary.covered_target_count_if_owner_rows_are_completed,
    minimum_bundle_covered_target_count: minimumDeferralDecisionPacketValidation.summary.minimum_bundle_covered_target_count,
    uncovered_target_count_if_owner_rows_are_completed: minimumDeferralDecisionPacketValidation.summary.uncovered_target_count_if_owner_rows_are_completed,
    decision_register_total_rows: minimumDeferralDecisionPacketValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: minimumDeferralDecisionPacketValidation.summary.decision_register_valid_deferred_rows,
    placeholder_row_count: minimumDeferralDecisionPacketValidation.summary.placeholder_row_count,
    finding_count: minimumDeferralDecisionPacketValidation.summary.finding_count
  },
  minimum_deferral_target_annex: {
    minimum_decision_row_count: minimumDeferralTargetAnnexValidation.summary.minimum_decision_row_count,
    unique_target_id_count: minimumDeferralTargetAnnexValidation.summary.unique_target_id_count,
    expected_unique_target_id_count: minimumDeferralTargetAnnexValidation.summary.expected_unique_target_id_count,
    unmatched_target_count: minimumDeferralTargetAnnexValidation.summary.unmatched_target_count,
    aggregate_not_accepted_target_count: minimumDeferralTargetAnnexValidation.summary.aggregate_not_accepted_target_count,
    source_missing_deferral_target_count: minimumDeferralTargetAnnexValidation.summary.source_missing_deferral_target_count,
    finding_count: minimumDeferralTargetAnnexValidation.summary.finding_count
  },
  owner_decision_intake_runbook: {
    minimum_owner_row_count: ownerDecisionIntakeRunbookValidation.summary.minimum_owner_row_count,
    target_count_if_minimum_owner_rows_are_completed: ownerDecisionIntakeRunbookValidation.summary.target_count_if_minimum_owner_rows_are_completed,
    decision_register_total_rows: ownerDecisionIntakeRunbookValidation.summary.decision_register_total_rows,
    valid_applied_minimum_decision_row_count: ownerDecisionIntakeRunbookValidation.summary.valid_applied_minimum_decision_row_count,
    remaining_target_count_after_valid_applied_rows: ownerDecisionIntakeRunbookValidation.summary.remaining_target_count_after_valid_applied_rows,
    validation_command_count: ownerDecisionIntakeRunbookValidation.summary.validation_command_count,
    signature_ref_format_count: ownerDecisionIntakeRunbookValidation.summary.signature_ref_format_count,
    finding_count: ownerDecisionIntakeRunbookValidation.summary.finding_count
  },
  owner_approval_receipt_ledger: {
    receipt_slot_count: ownerApprovalReceiptLedgerValidation.summary.receipt_slot_count,
    pending_receipt_slot_count: ownerApprovalReceiptLedgerValidation.summary.pending_receipt_slot_count,
    real_owner_receipt_count: ownerApprovalReceiptLedgerValidation.summary.real_owner_receipt_count,
    copy_allowed_count: ownerApprovalReceiptLedgerValidation.summary.copy_allowed_count,
    decision_register_total_rows: ownerApprovalReceiptLedgerValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: ownerApprovalReceiptLedgerValidation.summary.decision_register_valid_deferred_rows,
    target_count_if_all_receipts_are_completed: ownerApprovalReceiptLedgerValidation.summary.target_count_if_all_receipts_are_completed,
    finding_count: ownerApprovalReceiptLedgerValidation.summary.finding_count
  },
  owner_approval_request_packet: {
    request_card_count: ownerApprovalRequestPacketValidation.summary.request_card_count,
    pending_receipt_slot_count: ownerApprovalRequestPacketValidation.summary.pending_receipt_slot_count,
    real_owner_receipt_count: ownerApprovalRequestPacketValidation.summary.real_owner_receipt_count,
    copy_allowed_count: ownerApprovalRequestPacketValidation.summary.copy_allowed_count,
    target_count_by_pending_requests: ownerApprovalRequestPacketValidation.summary.target_count_by_pending_requests,
    response_field_count: ownerApprovalRequestPacketValidation.summary.response_field_count,
    finding_count: ownerApprovalRequestPacketValidation.summary.finding_count
  },
  owner_response_intake: {
    response_entry_count: ownerResponseIntakeValidation.summary.response_entry_count,
    request_card_count: ownerResponseIntakeValidation.summary.request_card_count,
    pending_response_count: ownerResponseIntakeValidation.summary.pending_response_count,
    real_owner_response_count: ownerResponseIntakeValidation.summary.real_owner_response_count,
    copy_allowed_count: ownerResponseIntakeValidation.summary.copy_allowed_count,
    target_count_if_all_responses_received: ownerResponseIntakeValidation.summary.target_count_if_all_responses_received,
    target_count_by_real_responses: ownerResponseIntakeValidation.summary.target_count_by_real_responses,
    finding_count: ownerResponseIntakeValidation.summary.finding_count
  },
  owner_response_receipt_candidates: {
    receipt_update_candidate_count: ownerResponseReceiptCandidatesValidation.summary.receipt_update_candidate_count,
    expected_receipt_update_candidate_count: ownerResponseReceiptCandidatesValidation.summary.expected_receipt_update_candidate_count,
    response_entry_count: ownerResponseReceiptCandidatesValidation.summary.response_entry_count,
    real_owner_response_count: ownerResponseReceiptCandidatesValidation.summary.real_owner_response_count,
    copy_allowed_response_count: ownerResponseReceiptCandidatesValidation.summary.copy_allowed_response_count,
    target_count_by_candidates: ownerResponseReceiptCandidatesValidation.summary.target_count_by_candidates,
    receipt_ledger_current_real_receipt_count: ownerResponseReceiptCandidatesValidation.summary.receipt_ledger_current_real_receipt_count,
    receipt_ledger_current_copy_allowed_count: ownerResponseReceiptCandidatesValidation.summary.receipt_ledger_current_copy_allowed_count,
    finding_count: ownerResponseReceiptCandidatesValidation.summary.finding_count
  },
  owner_response_receipt_application: {
    receipt_update_candidate_count: ownerResponseReceiptApplicationAudit.summary.receipt_update_candidate_count,
    applied_candidate_count: ownerResponseReceiptApplicationAudit.summary.applied_candidate_count,
    pending_application_count: ownerResponseReceiptApplicationAudit.summary.pending_application_count,
    mismatched_application_count: ownerResponseReceiptApplicationAudit.summary.mismatched_application_count,
    missing_receipt_slot_count: ownerResponseReceiptApplicationAudit.summary.missing_receipt_slot_count,
    receipt_ledger_current_real_receipt_count: ownerResponseReceiptApplicationAudit.summary.receipt_ledger_current_real_receipt_count,
    receipt_ledger_current_copy_allowed_count: ownerResponseReceiptApplicationAudit.summary.receipt_ledger_current_copy_allowed_count,
    finding_count: ownerResponseReceiptApplicationAudit.summary.finding_count
  },
  owner_response_receipt_reconciliation: {
    receipt_slot_count: ownerResponseReceiptReconciliationAudit.summary.receipt_slot_count,
    pending_receipt_slot_count: ownerResponseReceiptReconciliationAudit.summary.pending_receipt_slot_count,
    real_owner_receipt_count: ownerResponseReceiptReconciliationAudit.summary.real_owner_receipt_count,
    copy_allowed_count: ownerResponseReceiptReconciliationAudit.summary.copy_allowed_count,
    receipt_update_candidate_count: ownerResponseReceiptReconciliationAudit.summary.receipt_update_candidate_count,
    reconciled_real_receipt_count: ownerResponseReceiptReconciliationAudit.summary.reconciled_real_receipt_count,
    unreconciled_real_receipt_count: ownerResponseReceiptReconciliationAudit.summary.unreconciled_real_receipt_count,
    field_mismatch_count: ownerResponseReceiptReconciliationAudit.summary.field_mismatch_count,
    finding_count: ownerResponseReceiptReconciliationAudit.summary.finding_count
  },
  decision_register_import_candidates: {
    import_candidate_count: decisionRegisterImportCandidatesValidation.summary.import_candidate_count,
    expected_import_candidate_count: decisionRegisterImportCandidatesValidation.summary.expected_import_candidate_count,
    covered_target_count_by_candidates: decisionRegisterImportCandidatesValidation.summary.covered_target_count_by_candidates,
    real_owner_receipt_count: decisionRegisterImportCandidatesValidation.summary.real_owner_receipt_count,
    pending_receipt_slot_count: decisionRegisterImportCandidatesValidation.summary.pending_receipt_slot_count,
    copy_allowed_count: decisionRegisterImportCandidatesValidation.summary.copy_allowed_count,
    decision_register_total_rows: decisionRegisterImportCandidatesValidation.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: decisionRegisterImportCandidatesValidation.summary.decision_register_valid_deferred_rows,
    finding_count: decisionRegisterImportCandidatesValidation.summary.finding_count
  },
  decision_register_import_application: {
    import_candidate_count: decisionRegisterImportApplicationAudit.summary.import_candidate_count,
    applied_candidate_count: decisionRegisterImportApplicationAudit.summary.applied_candidate_count,
    pending_application_count: decisionRegisterImportApplicationAudit.summary.pending_application_count,
    mismatched_application_count: decisionRegisterImportApplicationAudit.summary.mismatched_application_count,
    duplicate_register_row_count: decisionRegisterImportApplicationAudit.summary.duplicate_register_row_count,
    decision_register_total_rows: decisionRegisterImportApplicationAudit.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: decisionRegisterImportApplicationAudit.summary.decision_register_valid_deferred_rows,
    finding_count: decisionRegisterImportApplicationAudit.summary.finding_count
  },
  decision_register_import_reconciliation: {
    decision_register_total_rows: decisionRegisterImportReconciliationAudit.summary.decision_register_total_rows,
    valid_deferred_rows: decisionRegisterImportReconciliationAudit.summary.valid_deferred_rows,
    import_candidate_count: decisionRegisterImportReconciliationAudit.summary.import_candidate_count,
    reconciled_row_count: decisionRegisterImportReconciliationAudit.summary.reconciled_row_count,
    unreconciled_row_count: decisionRegisterImportReconciliationAudit.summary.unreconciled_row_count,
    field_mismatch_count: decisionRegisterImportReconciliationAudit.summary.field_mismatch_count,
    finding_count: decisionRegisterImportReconciliationAudit.summary.finding_count
  },
  minimum_deferral_application: {
    minimum_packet_decision_row_count: minimumDeferralApplicationAudit.summary.minimum_packet_decision_row_count,
    valid_applied_minimum_decision_row_count: minimumDeferralApplicationAudit.summary.valid_applied_minimum_decision_row_count,
    missing_minimum_decision_row_count: minimumDeferralApplicationAudit.summary.missing_minimum_decision_row_count,
    invalid_minimum_decision_row_count: minimumDeferralApplicationAudit.summary.invalid_minimum_decision_row_count,
    application_coverage_ready: minimumDeferralApplicationAudit.summary.application_coverage_ready,
    target_count_if_fully_applied: minimumDeferralApplicationAudit.summary.target_count_if_fully_applied,
    covered_target_count_by_valid_applied_rows: minimumDeferralApplicationAudit.summary.covered_target_count_by_valid_applied_rows,
    remaining_target_count_after_valid_applied_rows: minimumDeferralApplicationAudit.summary.remaining_target_count_after_valid_applied_rows,
    decision_register_total_rows: minimumDeferralApplicationAudit.summary.decision_register_total_rows,
    decision_register_valid_deferred_rows: minimumDeferralApplicationAudit.summary.decision_register_valid_deferred_rows,
    finding_count: minimumDeferralApplicationAudit.summary.finding_count
  },
  deferral_source_extraction: {
    p2_broad_marker_source_file_count: deferralSourceExtractionAudit.p2.broad_marker_source_file_count,
    p2_positive_count_statement_file_count: deferralSourceExtractionAudit.p2.positive_count_statement_file_count,
    p2_positive_count_statement_sum: deferralSourceExtractionAudit.p2.positive_count_statement_sum,
    p2_explicit_item_line_count: deferralSourceExtractionAudit.p2.explicit_p2_item_line_count,
    p2_unresolved_item_line_count: deferralSourceExtractionAudit.p2.unresolved_p2_line_count,
    ldip_actual_defer_decision_count: deferralSourceExtractionAudit.ldip.actual_decision_count,
    hrx_actual_defer_decision_count: deferralSourceExtractionAudit.hrx.actual_decision_count,
    mat_dec_mention_line_count: deferralSourceExtractionAudit.mat_dec.mention_line_count,
    finding_count: deferralSourceExtractionAudit.findings.length
  },
  no_go_claim_policy: {
    scanned_file_count: noGoClaimPolicyAudit.summary.scanned_file_count,
    no_go_active: noGoClaimPolicyAudit.summary.no_go_active,
    forbidden_true_claim_count: noGoClaimPolicyAudit.summary.forbidden_true_claim_count,
    finding_count: noGoClaimPolicyAudit.summary.finding_count
  },
  l9_stabilization: {
    closure: stabilizationClosure,
    work_packages: l9WorkPackages
  },
  commands
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  go_live_all_pass: launchAudit.go_live_readiness.all_pass,
  owner_approved_deferrals_present: launchAudit.launch_decisions.owner_approved_deferrals_present,
  manual_intake_pending_count: manualEvidenceIntakeValidation.summary.pending_intake_count,
  manual_intake_evidence_satisfied_count: manualEvidenceIntakeValidation.summary.evidence_satisfied_count,
  manual_intake_owner_deferred_count: manualEvidenceIntakeValidation.summary.owner_deferred_count,
  acceptance_pending_count: evidenceAcceptanceMatrixValidation.summary.pending_acceptance_row_count,
  acceptance_evidence_satisfied_count: evidenceAcceptanceMatrixValidation.summary.evidence_satisfied_acceptance_row_count,
  acceptance_owner_deferred_count: evidenceAcceptanceMatrixValidation.summary.owner_deferred_acceptance_row_count,
  l9_work_package_count: l9WorkPackages.length
}, null, 2));

if (verdict === "COMPLETE") {
  process.exit(0);
}
