#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const STABILIZATION_CLOSURE_PATH = "docs/launch/stabilization-closure.md";
const REPORT_JSON_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const REPORT_MD_PATH = "docs/launch/launch-manual-evidence-intake-register.md";
const MANUAL_INTAKE_STATE_FIELDS = [
  "intake_status",
  "evidence_ref",
  "evidence_recorded_at",
  "verifier",
  "decision_register_id",
  "owner_role_name",
  "deferral_basis",
  "target_date_or_revisit_gate",
  "approval_signature_ref"
];

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
        required_state: evidence.required_state
      };
    }
  }
  return lookup;
}

function existingIntakeState(existingRow) {
  return Object.fromEntries(
    MANUAL_INTAKE_STATE_FIELDS.map((field) => {
      if (field === "intake_status") {
        return [field, existingRow?.[field] ?? "pending_evidence_or_owner_deferral"];
      }
      return [field, existingRow?.[field] ?? ""];
    })
  );
}

function stabilizationRows(existingRowByIntakeId) {
  if (!existsSync(STABILIZATION_CLOSURE_PATH)) return [];
  return readText(STABILIZATION_CLOSURE_PATH)
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Closure criterion"))
    .map((line, index) => {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      const intakeId = `L9-C${String(index + 1).padStart(2, "0")}`;
      return {
        intake_id: intakeId,
        intake_type: "l9_stabilization_closure_evidence",
        closure_criterion: cells[0] ?? "",
        current_status: cells[1] ?? "",
        ...existingIntakeState(existingRowByIntakeId.get(intakeId))
      };
    });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Manual Evidence Intake Register");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This register does not approve go-live.");
  lines.push("- This register does not approve owner deferrals.");
  lines.push("- Rows remain pending until real evidence or an owner-approved deferral is recorded.");
  lines.push("- Existing manual intake evidence and deferral fields are preserved by intake ID during regeneration.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("- Synthetic data boundaries remain active until policy gates allow otherwise.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Failed Gate Intake");
  lines.push("");
  lines.push("| Intake | Gate | Evidence | Slot | Required state | Status |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const row of report.gate_intake) {
    lines.push(`| ${row.intake_id} | ${row.gate_id} | ${row.evidence_id} | ${row.slot} | ${row.required_state} | ${row.intake_status} |`);
  }
  lines.push("");
  lines.push("## L9 Stabilization Intake");
  lines.push("");
  lines.push("| Intake | Closure criterion | Current status | Status |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of report.l9_stabilization_intake) {
    lines.push(`| ${row.intake_id} | ${row.closure_criterion} | ${row.current_status} | ${row.intake_status} |`);
  }
  lines.push("");
  lines.push("## Intake Rule");
  lines.push("");
  lines.push("A row may move from `pending_evidence_or_owner_deferral` only when real evidence is linked or a structurally valid owner-approved deferral exists in the launch decision register.");
  return `${lines.join("\n")}\n`;
}

const audit = readJson(AUDIT_PATH);
const contract = readJson(CONTRACT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();
const evidenceLookup = gateEvidenceLookup(contract);
const existingRowByIntakeId = new Map([
  ...(existingReport?.gate_intake ?? []),
  ...(existingReport?.l9_stabilization_intake ?? [])
].map((row) => [row.intake_id, row]));

const gateIntake = [];
for (const gateId of audit.go_live_readiness.failed_gate_ids ?? []) {
  const failedIds = audit.go_live_readiness.gates?.[gateId]?.failed_evidence ?? [];
  for (const evidenceId of failedIds) {
    const evidence = evidenceLookup[evidenceId] ?? {};
    const intakeId = `GL-${gateId}-${evidenceId}`;
    gateIntake.push({
      intake_id: intakeId,
      intake_type: "go_live_gate_evidence",
      gate_id: gateId,
      dimension: evidence.dimension ?? "UNKNOWN",
      evidence_id: evidenceId,
      slot: evidence.slot ?? "UNKNOWN",
      required_state: evidence.required_state ?? "UNKNOWN",
      current_status: "failed",
      ...existingIntakeState(existingRowByIntakeId.get(intakeId))
    });
  }
}

const l9Intake = stabilizationRows(existingRowByIntakeId);
const allIntakeRows = [...gateIntake, ...l9Intake];
const report = {
  schema_version: "law-firm-os.launch-manual-evidence-intake-register.v0.1",
  generated_at: generatedAt,
  source_refs: [
    AUDIT_PATH,
    CONTRACT_PATH,
    STABILIZATION_CLOSURE_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    go_live_approved_by_this_register: false,
    owner_deferrals_approved_by_this_register: false,
    regeneration_preserves_existing_intake_fields: true,
    closed_cp_evidence_is_read_only: true,
    synthetic_data_only_until_policy_gates_allow: true,
    review_waiver_counts_as_valid_review_evidence: false
  },
  summary: {
    failed_gate_count: audit.go_live_readiness.failed_gate_ids.length,
    failed_gate_evidence_slot_count: gateIntake.length,
    l9_stabilization_closure_slot_count: l9Intake.length,
    total_intake_row_count: allIntakeRows.length,
    pending_intake_count: allIntakeRows.filter((row) => row.intake_status === "pending_evidence_or_owner_deferral").length,
    evidence_satisfied_count: allIntakeRows.filter((row) => row.intake_status === "evidence_satisfied").length,
    owner_deferred_count: allIntakeRows.filter((row) => row.intake_status === "owner_deferred").length,
    go_live_all_pass: audit.go_live_readiness.all_pass,
    owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
    coverage_eligible_valid_deferred_rows: audit.launch_decisions.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: audit.launch_decisions.non_coverage_valid_deferred_rows
  },
  gate_intake: gateIntake,
  l9_stabilization_intake: l9Intake
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  failed_gate_evidence_slot_count: gateIntake.length,
  l9_stabilization_closure_slot_count: l9Intake.length,
  total_intake_row_count: report.summary.total_intake_row_count,
  owner_approved_deferrals_present: report.summary.owner_approved_deferrals_present,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows
}, null, 2));
