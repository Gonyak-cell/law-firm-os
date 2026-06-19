#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const LAUNCH_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const MATRIX_PATH = "docs/launch/launch-evidence-acceptance-matrix.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-evidence-acceptance-matrix-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-evidence-acceptance-matrix-validation.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const REQUIRED_EVIDENCE_FIELDS = ["evidence_ref", "evidence_recorded_at", "verifier"];
const REQUIRED_DEFERRAL_FIELDS = [
  "decision_register_id",
  "owner_role_name",
  "deferral_basis",
  "target_date_or_revisit_gate",
  "approval_signature_ref"
];

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

function expectedGateKeys(audit) {
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
  lines.push("# Launch Evidence Acceptance Matrix Validation");
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
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This validation checks matrix structure and coverage only.");
  lines.push("- It does not approve go-live or owner deferrals.");
  lines.push("- Acceptance rows remain pending until real evidence or a valid owner-approved deferral is recorded.");
  return `${lines.join("\n")}\n`;
}

const contract = readJson(CONTRACT_PATH);
const audit = readJson(LAUNCH_AUDIT_PATH);
const manualIntake = readJson(MANUAL_INTAKE_PATH);
const matrix = readJson(MATRIX_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const evidenceLookup = gateEvidenceLookup(contract);
const findings = [];

if (matrix.schema_version !== "law-firm-os.launch-evidence-acceptance-matrix.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected launch evidence acceptance matrix schema version.", {
    actual: matrix.schema_version
  });
}

const expectedBoundary = {
  defines_future_acceptance_only: true,
  go_live_approved_by_this_matrix: false,
  owner_deferrals_approved_by_this_matrix: false,
  intake_rows_satisfied_by_this_matrix: false,
  review_waiver_counts_as_valid_review_evidence: false,
  partial_pass_carryover_allowed: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (matrix.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Boundary field ${key} drifted.`, {
      expected,
      actual: matrix.boundary?.[key]
    });
  }
}

if (matrix.no_go_policy?.partial_pass_carryover !== "forbidden") {
  addFinding(findings, "P0", "PARTIAL_PASS_CARRYOVER", "Matrix does not preserve no-go partial pass carryover prohibition.", {
    actual: matrix.no_go_policy?.partial_pass_carryover
  });
}

if (matrix.no_go_policy?.review_waiver_counts_as_valid_review_evidence !== false) {
  addFinding(findings, "P0", "REVIEW_WAIVER_POLICY", "Matrix does not preserve review-waiver non-evidence rule.", {
    actual: matrix.no_go_policy?.review_waiver_counts_as_valid_review_evidence
  });
}

const expectedGateEvidenceKeys = expectedGateKeys(audit);
const matrixGateKeys = (matrix.gate_acceptance_rows ?? []).map((row) => `${row.gate_id}:${row.evidence_id}`);
if (!sameSet(expectedGateEvidenceKeys, matrixGateKeys)) {
  addFinding(findings, "P0", "GATE_ACCEPTANCE_MISMATCH", "Gate acceptance rows do not match current failed go-live evidence slots.", {
    expected_count: expectedGateEvidenceKeys.length,
    actual_count: matrixGateKeys.length,
    missing: expectedGateEvidenceKeys.filter((key) => !matrixGateKeys.includes(key)),
    unexpected: matrixGateKeys.filter((key) => !expectedGateEvidenceKeys.includes(key))
  });
}

const manualGateKeys = (manualIntake.gate_intake ?? []).map((row) => `${row.gate_id}:${row.evidence_id}`);
if (!sameSet(manualGateKeys, matrixGateKeys)) {
  addFinding(findings, "P0", "MANUAL_GATE_ACCEPTANCE_MISMATCH", "Gate acceptance rows do not match manual intake gate rows.", {
    expected_count: manualGateKeys.length,
    actual_count: matrixGateKeys.length,
    missing: manualGateKeys.filter((key) => !matrixGateKeys.includes(key)),
    unexpected: matrixGateKeys.filter((key) => !manualGateKeys.includes(key))
  });
}

const manualL9Criteria = (manualIntake.l9_stabilization_intake ?? []).map((row) => row.closure_criterion);
const matrixL9Criteria = (matrix.l9_acceptance_rows ?? []).map((row) => row.closure_criterion);
if (!sameSet(manualL9Criteria, matrixL9Criteria)) {
  addFinding(findings, "P1", "L9_ACCEPTANCE_MISMATCH", "L9 acceptance rows do not match manual intake closure rows.", {
    expected_count: manualL9Criteria.length,
    actual_count: matrixL9Criteria.length,
    missing: manualL9Criteria.filter((criterion) => !matrixL9Criteria.includes(criterion)),
    unexpected: matrixL9Criteria.filter((criterion) => !manualL9Criteria.includes(criterion))
  });
}

for (const row of matrix.gate_acceptance_rows ?? []) {
  const expected = evidenceLookup[row.evidence_id];
  if (!expected) {
    addFinding(findings, "P0", "UNKNOWN_GATE_EVIDENCE", "Matrix row references unknown gate evidence id.", {
      acceptance_id: row.acceptance_id,
      evidence_id: row.evidence_id
    });
    continue;
  }
  for (const key of ["gate_id", "dimension", "slot", "required_state"]) {
    if (row[key] !== expected[key]) {
      addFinding(findings, "P1", "GATE_FIELD_MISMATCH", `Matrix gate row field ${key} does not match contract.`, {
        acceptance_id: row.acceptance_id,
        expected: expected[key],
        actual: row[key]
      });
    }
  }
  const resolution = row.acceptable_resolution ?? {};
  if (!sameSet(resolution.evidence_satisfied_required_fields ?? [], REQUIRED_EVIDENCE_FIELDS)) {
    addFinding(findings, "P1", "EVIDENCE_REQUIRED_FIELDS", "Gate row evidence-satisfied fields are incomplete.", {
      acceptance_id: row.acceptance_id,
      actual: resolution.evidence_satisfied_required_fields
    });
  }
  if (!sameSet(resolution.owner_deferred_required_fields ?? [], REQUIRED_DEFERRAL_FIELDS)) {
    addFinding(findings, "P1", "DEFERRAL_REQUIRED_FIELDS", "Gate row owner-deferred fields are incomplete.", {
      acceptance_id: row.acceptance_id,
      actual: resolution.owner_deferred_required_fields
    });
  }
}

for (const row of matrix.l9_acceptance_rows ?? []) {
  const resolution = row.acceptable_resolution ?? {};
  if (!sameSet(resolution.evidence_satisfied_required_fields ?? [], REQUIRED_EVIDENCE_FIELDS)) {
    addFinding(findings, "P1", "L9_EVIDENCE_REQUIRED_FIELDS", "L9 row evidence-satisfied fields are incomplete.", {
      acceptance_id: row.acceptance_id,
      actual: resolution.evidence_satisfied_required_fields
    });
  }
  if (!sameSet(resolution.owner_deferred_required_fields ?? [], REQUIRED_DEFERRAL_FIELDS)) {
    addFinding(findings, "P1", "L9_DEFERRAL_REQUIRED_FIELDS", "L9 row owner-deferred fields are incomplete.", {
      acceptance_id: row.acceptance_id,
      actual: resolution.owner_deferred_required_fields
    });
  }
}

const ownerDeferredRows = [
  ...(matrix.gate_acceptance_rows ?? []),
  ...(matrix.l9_acceptance_rows ?? [])
].filter((row) => row.current_intake_status === "owner_deferred");

if (ownerDeferredRows.length > 0 && decisionSummary.coverage_eligible_valid_deferred_rows === 0) {
  addFinding(findings, "P1", "OWNER_DEFERRED_WITHOUT_COVERAGE_ELIGIBLE_DEFERRAL", "Matrix contains owner-deferred rows while no coverage-eligible owner-approved deferral exists.", {
    owner_deferred_count: ownerDeferredRows.length,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows
  });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const totalRows = (matrix.gate_acceptance_rows ?? []).length + (matrix.l9_acceptance_rows ?? []).length;
const allAcceptanceRows = [
  ...(matrix.gate_acceptance_rows ?? []),
  ...(matrix.l9_acceptance_rows ?? [])
];
const gateAcceptanceRows = matrix.gate_acceptance_rows ?? [];
const l9AcceptanceRows = matrix.l9_acceptance_rows ?? [];
const report = {
  schema_version: "law-firm-os.launch-evidence-acceptance-matrix.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MATRIX_PATH,
    CONTRACT_PATH,
    LAUNCH_AUDIT_PATH,
    MANUAL_INTAKE_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    gate_acceptance_row_count: gateAcceptanceRows.length,
    l9_acceptance_row_count: l9AcceptanceRows.length,
    total_acceptance_row_count: totalRows,
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
    valid_decision_register_deferred_rows: decisionSummary.valid_deferred_rows,
    coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_acceptance_structure_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
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
  total_acceptance_row_count: report.summary.total_acceptance_row_count,
  pending_acceptance_row_count: report.summary.pending_acceptance_row_count,
  evidence_satisfied_acceptance_row_count: report.summary.evidence_satisfied_acceptance_row_count,
  owner_deferred_acceptance_row_count: report.summary.owner_deferred_acceptance_row_count,
  missing_intake_acceptance_row_count: report.summary.missing_intake_acceptance_row_count,
  gate_evidence_satisfied_acceptance_row_count: report.summary.gate_evidence_satisfied_acceptance_row_count,
  l9_evidence_satisfied_acceptance_row_count: report.summary.l9_evidence_satisfied_acceptance_row_count,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
