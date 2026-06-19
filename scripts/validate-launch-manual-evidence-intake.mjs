#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const STABILIZATION_CLOSURE_PATH = "docs/launch/stabilization-closure.md";
const REGISTER_JSON_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-manual-evidence-intake-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-manual-evidence-intake-validation.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const ALLOWED_STATUSES = new Set([
  "pending_evidence_or_owner_deferral",
  "evidence_satisfied",
  "owner_deferred"
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
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

function stabilizationCriteria() {
  if (!existsSync(STABILIZATION_CLOSURE_PATH)) return [];
  return readText(STABILIZATION_CLOSURE_PATH)
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Closure criterion"))
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean)[0])
    .filter(Boolean);
}

function requiredGateRows(audit) {
  const rows = [];
  for (const gateId of audit.go_live_readiness.failed_gate_ids ?? []) {
    for (const evidenceId of audit.go_live_readiness.gates?.[gateId]?.failed_evidence ?? []) {
      rows.push(`${gateId}:${evidenceId}`);
    }
  }
  return rows;
}

function nonempty(value) {
  return String(value ?? "").trim().length > 0;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Manual Evidence Intake Validation");
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
  lines.push("- This validation checks intake structure only.");
  lines.push("- It does not approve go-live or owner deferrals.");
  lines.push("- Evidence-satisfied rows require linked evidence, timestamp, and verifier.");
  lines.push("- Owner-deferred rows require decision-register and approval signature fields.");
  lines.push("- It requires intake regeneration to preserve existing evidence and deferral fields by intake ID.");
  return `${lines.join("\n")}\n`;
}

const audit = readJson(AUDIT_PATH);
const contract = readJson(CONTRACT_PATH);
const register = readJson(REGISTER_JSON_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const validDeferredIds = new Set(decisionSummary.valid_deferred_decision_ids ?? []);
const validCoverageDeferredIds = new Set(decisionSummary.valid_coverage_deferred_decision_ids ?? []);
const evidenceLookup = gateEvidenceLookup(contract);
const findings = [];

if (register.schema_version !== "law-firm-os.launch-manual-evidence-intake-register.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected manual evidence intake register schema version.", {
    actual: register.schema_version
  });
}

const expectedBoundary = {
  go_live_approved_by_this_register: false,
  owner_deferrals_approved_by_this_register: false,
  regeneration_preserves_existing_intake_fields: true,
  closed_cp_evidence_is_read_only: true,
  synthetic_data_only_until_policy_gates_allow: true,
  review_waiver_counts_as_valid_review_evidence: false
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (register.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Boundary field ${key} drifted.`, {
      expected,
      actual: register.boundary?.[key]
    });
  }
}

const expectedGateKeys = requiredGateRows(audit);
const actualGateKeys = (register.gate_intake ?? []).map((row) => `${row.gate_id}:${row.evidence_id}`);
if (!sameSet(expectedGateKeys, actualGateKeys)) {
  addFinding(findings, "P0", "GATE_INTAKE_MISMATCH", "Gate intake rows do not match current failed go-live evidence slots.", {
    expected_count: expectedGateKeys.length,
    actual_count: actualGateKeys.length,
    missing: expectedGateKeys.filter((key) => !actualGateKeys.includes(key)),
    unexpected: actualGateKeys.filter((key) => !expectedGateKeys.includes(key))
  });
}

for (const row of register.gate_intake ?? []) {
  const expected = evidenceLookup[row.evidence_id];
  if (!expected) {
    addFinding(findings, "P0", "UNKNOWN_GATE_EVIDENCE", "Gate intake row references unknown evidence id.", {
      intake_id: row.intake_id,
      evidence_id: row.evidence_id
    });
    continue;
  }
  for (const key of ["gate_id", "dimension", "slot", "required_state"]) {
    if (row[key] !== expected[key]) {
      addFinding(findings, "P1", "GATE_EVIDENCE_FIELD_MISMATCH", `Gate intake row field ${key} does not match contract.`, {
        intake_id: row.intake_id,
        expected: expected[key],
        actual: row[key]
      });
    }
  }
}

const expectedL9Criteria = stabilizationCriteria();
const actualL9Criteria = (register.l9_stabilization_intake ?? []).map((row) => row.closure_criterion);
if (!sameSet(expectedL9Criteria, actualL9Criteria)) {
  addFinding(findings, "P1", "L9_INTAKE_MISMATCH", "L9 stabilization intake rows do not match current closure criteria.", {
    expected_count: expectedL9Criteria.length,
    actual_count: actualL9Criteria.length,
    missing: expectedL9Criteria.filter((criterion) => !actualL9Criteria.includes(criterion)),
    unexpected: actualL9Criteria.filter((criterion) => !expectedL9Criteria.includes(criterion))
  });
}

const allRows = [
  ...(register.gate_intake ?? []),
  ...(register.l9_stabilization_intake ?? [])
];

for (const row of allRows) {
  if (!ALLOWED_STATUSES.has(row.intake_status)) {
    addFinding(findings, "P1", "INVALID_INTAKE_STATUS", "Intake row has an unsupported status.", {
      intake_id: row.intake_id,
      actual: row.intake_status
    });
  }
  if (row.intake_status === "evidence_satisfied") {
    const missing = ["evidence_ref", "evidence_recorded_at", "verifier"].filter((field) => !nonempty(row[field]));
    if (missing.length > 0) {
      addFinding(findings, "P1", "SATISFIED_INTAKE_MISSING_EVIDENCE_FIELDS", "Evidence-satisfied row is missing required evidence fields.", {
        intake_id: row.intake_id,
        missing
      });
    }
  }
  if (row.intake_status === "owner_deferred") {
    const missing = [
      "decision_register_id",
      "owner_role_name",
      "deferral_basis",
      "target_date_or_revisit_gate",
      "approval_signature_ref"
    ].filter((field) => !nonempty(row[field]));
    if (missing.length > 0) {
      addFinding(findings, "P1", "OWNER_DEFERRED_INTAKE_MISSING_FIELDS", "Owner-deferred row is missing required approval fields.", {
        intake_id: row.intake_id,
        missing
      });
    }
    if (!decisionSummary.owner_approved_deferrals_present) {
      addFinding(findings, "P1", "OWNER_DEFERRED_WITHOUT_VALID_REGISTER_DEFERRAL", "Owner-deferred row exists but the launch decision register has no valid owner-approved deferral.", {
        intake_id: row.intake_id
      });
    }
    if (!validDeferredIds.has(row.decision_register_id)) {
      addFinding(findings, "P1", "OWNER_DEFERRED_UNKNOWN_DECISION_ID", "Owner-deferred row references a decision id that is not a valid deferred launch decision.", {
        intake_id: row.intake_id,
        decision_register_id: row.decision_register_id
      });
    } else if (!validCoverageDeferredIds.has(row.decision_register_id)) {
      addFinding(findings, "P1", "OWNER_DEFERRED_NON_COVERAGE_DECISION_ID", "Owner-deferred row references a valid deferred decision id that is not coverage-eligible for launch blockers.", {
        intake_id: row.intake_id,
        decision_register_id: row.decision_register_id
      });
    }
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-manual-evidence-intake.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    REGISTER_JSON_PATH,
    AUDIT_PATH,
    CONTRACT_PATH,
    STABILIZATION_CLOSURE_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    gate_intake_count: (register.gate_intake ?? []).length,
    l9_stabilization_intake_count: (register.l9_stabilization_intake ?? []).length,
    total_intake_row_count: allRows.length,
    pending_intake_count: allRows.filter((row) => row.intake_status === "pending_evidence_or_owner_deferral").length,
    evidence_satisfied_count: allRows.filter((row) => row.intake_status === "evidence_satisfied").length,
    owner_deferred_count: allRows.filter((row) => row.intake_status === "owner_deferred").length,
    valid_decision_register_deferred_rows: decisionSummary.valid_deferred_rows,
    coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_intake_structure_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    intake_regeneration_preservation_required_by_validation: true,
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
  total_intake_row_count: report.summary.total_intake_row_count,
  pending_intake_count: report.summary.pending_intake_count,
  coverage_eligible_valid_deferred_rows: report.summary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: report.summary.non_coverage_valid_deferred_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
