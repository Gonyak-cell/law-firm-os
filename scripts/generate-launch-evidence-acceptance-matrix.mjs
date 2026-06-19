#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const STABILIZATION_CLOSURE_PATH = "docs/launch/stabilization-closure.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const REPORT_JSON_PATH = "docs/launch/launch-evidence-acceptance-matrix.json";
const REPORT_MD_PATH = "docs/launch/launch-evidence-acceptance-matrix.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function gateEvidenceLookup(contract) {
  const lookup = {};
  for (const [gateId, gate] of Object.entries(contract.gates ?? {})) {
    for (const evidence of gate.evidence ?? []) {
      lookup[evidence.id] = {
        gate_id: gateId,
        dimension: gate.dimension,
        slot: evidence.slot,
        required_state: evidence.required_state,
        gate_criteria: gate.criteria ?? []
      };
    }
  }
  return lookup;
}

function stabilizationRows() {
  if (!existsSync(STABILIZATION_CLOSURE_PATH)) return [];
  return readText(STABILIZATION_CLOSURE_PATH)
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Closure criterion"))
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 2)
    .map(([closureCriterion, currentStatus], index) => ({
      intake_id: `L9-C${String(index + 1).padStart(2, "0")}`,
      closure_criterion: closureCriterion,
      current_status: currentStatus
    }));
}

function resolutionContract() {
  return {
    evidence_satisfied_required_fields: [
      "evidence_ref",
      "evidence_recorded_at",
      "verifier"
    ],
    owner_deferred_required_fields: [
      "decision_register_id",
      "owner_role_name",
      "deferral_basis",
      "target_date_or_revisit_gate",
      "approval_signature_ref"
    ],
    decision_register_status_required: "deferred(시한 명기)",
    prohibited_resolution_claims: [
      "local waiver without owner approval",
      "full Claude review waiver as valid review evidence",
      "partial pass carryover",
      "synthetic or template evidence as production/runtime evidence",
      "closed CP evidence rewrite"
    ]
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Evidence Acceptance Matrix");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This matrix defines accepted future evidence fields only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not convert pending intake rows into satisfied evidence.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Partial pass carryover is forbidden.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Gate Evidence Acceptance");
  lines.push("");
  lines.push("| Acceptance | Gate | Evidence | Slot | Required state | Intake | Related blocked WP |");
  lines.push("| --- | --- | --- | --- | --- | --- | ---: |");
  for (const row of report.gate_acceptance_rows) {
    lines.push(`| ${row.acceptance_id} | ${row.gate_id} | ${row.evidence_id} | ${row.slot} | ${row.required_state} | ${row.intake_id} | ${row.related_blocked_work_package_ids.length} |`);
  }
  lines.push("");
  lines.push("## L9 Stabilization Acceptance");
  lines.push("");
  lines.push("| Acceptance | Intake | Closure criterion | Current status |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of report.l9_acceptance_rows) {
    lines.push(`| ${row.acceptance_id} | ${row.intake_id} | ${row.closure_criterion} | ${row.current_status} |`);
  }
  lines.push("");
  lines.push("## Resolution Rule");
  lines.push("");
  lines.push("Each row may be resolved only by real linked evidence with timestamp and verifier, or by a structurally valid owner-approved deferral in the launch decision register. The matrix itself is not evidence of satisfaction.");
  return `${lines.join("\n")}\n`;
}

const contract = readJson(CONTRACT_PATH);
const audit = readJson(LAUNCH_AUDIT_PATH);
const manualIntake = readJson(MANUAL_INTAKE_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const evidenceLookup = gateEvidenceLookup(contract);
const gateIntakeByKey = new Map((manualIntake.gate_intake ?? []).map((row) => [`${row.gate_id}:${row.evidence_id}`, row]));
const l9IntakeByCriterion = new Map((manualIntake.l9_stabilization_intake ?? []).map((row) => [row.closure_criterion, row]));
const resolution = resolutionContract();

const blockedWps = audit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_blocked");
const gateAcceptanceRows = [];

for (const gateId of audit.go_live_readiness.failed_gate_ids ?? []) {
  for (const evidenceId of audit.go_live_readiness.gates?.[gateId]?.failed_evidence ?? []) {
    const evidence = evidenceLookup[evidenceId] ?? {};
    const intake = gateIntakeByKey.get(`${gateId}:${evidenceId}`);
    gateAcceptanceRows.push({
      acceptance_id: `ACC-GL-${gateId}-${evidenceId}`,
      acceptance_type: "go_live_gate_evidence",
      intake_id: intake?.intake_id ?? "",
      gate_id: gateId,
      dimension: evidence.dimension ?? "UNKNOWN",
      evidence_id: evidenceId,
      slot: evidence.slot ?? "UNKNOWN",
      required_state: evidence.required_state ?? "UNKNOWN",
      gate_criteria: evidence.gate_criteria ?? [],
      current_gate_status: audit.go_live_readiness.gates?.[gateId]?.status ?? "unknown",
      current_evidence_status: "failed",
      current_intake_status: intake?.intake_status ?? "missing_intake",
      related_blocked_work_package_ids: blockedWps
        .filter((wp) => (wp.gate_binding ?? []).includes(gateId))
        .map((wp) => wp.wp_id),
      acceptable_resolution: resolution
    });
  }
}

const l9AcceptanceRows = stabilizationRows().map((row) => {
  const intake = l9IntakeByCriterion.get(row.closure_criterion);
  return {
    acceptance_id: `ACC-${row.intake_id}`,
    acceptance_type: "l9_stabilization_closure_evidence",
    intake_id: row.intake_id,
    closure_criterion: row.closure_criterion,
    current_status: row.current_status,
    current_intake_status: intake?.intake_status ?? "missing_intake",
    acceptable_resolution: resolution
  };
});
const allAcceptanceRows = [...gateAcceptanceRows, ...l9AcceptanceRows];

const report = {
  schema_version: "law-firm-os.launch-evidence-acceptance-matrix.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    CONTRACT_PATH,
    LAUNCH_AUDIT_PATH,
    MANUAL_INTAKE_PATH,
    STABILIZATION_CLOSURE_PATH,
    DECISION_REGISTER_PATH
  ],
  boundary: {
    defines_future_acceptance_only: true,
    go_live_approved_by_this_matrix: false,
    owner_deferrals_approved_by_this_matrix: false,
    intake_rows_satisfied_by_this_matrix: false,
    review_waiver_counts_as_valid_review_evidence: false,
    partial_pass_carryover_allowed: false,
    closed_cp_evidence_is_read_only: true
  },
  no_go_policy: contract.no_go_policy,
  summary: {
    failed_gate_count: audit.go_live_readiness.failed_gate_ids.length,
    gate_acceptance_row_count: gateAcceptanceRows.length,
    l9_acceptance_row_count: l9AcceptanceRows.length,
    total_acceptance_row_count: allAcceptanceRows.length,
    pending_acceptance_row_count: allAcceptanceRows.filter((row) => row.current_intake_status === "pending_evidence_or_owner_deferral").length,
    evidence_satisfied_acceptance_row_count: allAcceptanceRows.filter((row) => row.current_intake_status === "evidence_satisfied").length,
    owner_deferred_acceptance_row_count: allAcceptanceRows.filter((row) => row.current_intake_status === "owner_deferred").length,
    missing_intake_acceptance_row_count: allAcceptanceRows.filter((row) => row.current_intake_status === "missing_intake").length,
    gate_pending_acceptance_row_count: gateAcceptanceRows.filter((row) => row.current_intake_status === "pending_evidence_or_owner_deferral").length,
    gate_evidence_satisfied_acceptance_row_count: gateAcceptanceRows.filter((row) => row.current_intake_status === "evidence_satisfied").length,
    gate_owner_deferred_acceptance_row_count: gateAcceptanceRows.filter((row) => row.current_intake_status === "owner_deferred").length,
    l9_pending_acceptance_row_count: l9AcceptanceRows.filter((row) => row.current_intake_status === "pending_evidence_or_owner_deferral").length,
    l9_evidence_satisfied_acceptance_row_count: l9AcceptanceRows.filter((row) => row.current_intake_status === "evidence_satisfied").length,
    l9_owner_deferred_acceptance_row_count: l9AcceptanceRows.filter((row) => row.current_intake_status === "owner_deferred").length,
    owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
    coverage_eligible_valid_deferred_rows: audit.launch_decisions.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: audit.launch_decisions.non_coverage_valid_deferred_rows,
    go_live_all_pass: audit.go_live_readiness.all_pass
  },
  gate_acceptance_rows: gateAcceptanceRows,
  l9_acceptance_rows: l9AcceptanceRows
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  gate_acceptance_row_count: report.summary.gate_acceptance_row_count,
  l9_acceptance_row_count: report.summary.l9_acceptance_row_count,
  total_acceptance_row_count: report.summary.total_acceptance_row_count,
  pending_acceptance_row_count: report.summary.pending_acceptance_row_count,
  evidence_satisfied_acceptance_row_count: report.summary.evidence_satisfied_acceptance_row_count,
  owner_deferred_acceptance_row_count: report.summary.owner_deferred_acceptance_row_count,
  missing_intake_acceptance_row_count: report.summary.missing_intake_acceptance_row_count,
  gate_evidence_satisfied_acceptance_row_count: report.summary.gate_evidence_satisfied_acceptance_row_count,
  l9_evidence_satisfied_acceptance_row_count: report.summary.l9_evidence_satisfied_acceptance_row_count,
  owner_approved_deferrals_present: report.summary.owner_approved_deferrals_present,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows
}, null, 2));
