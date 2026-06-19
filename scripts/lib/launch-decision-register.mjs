import { existsSync, readFileSync } from "node:fs";

const DEFAULT_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const STATUS_DECIDED = "decided";
const STATUS_DEFERRED = "deferred(시한 명기)";
const REQUIRED_FIELDS = [
  "decision_id",
  "title",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature",
  "status"
];

export function coverageDomainForDecisionId(decisionId) {
  if (/^ACC-GL-G\d+-G\d+-E\d+$/.test(decisionId) || /^COVERAGE-GATE-G\d+$/.test(decisionId) || decisionId === "COVERAGE-ALL-GO-LIVE") {
    return "go_live_gate_evidence";
  }
  if (/^ACC-L9-C\d{2}$/.test(decisionId) || decisionId === "COVERAGE-L9-STABILIZATION") {
    return "l9_stabilization_closure";
  }
  if (/^WP-LT-(PRE|L\d+)-W\d{2}$/.test(decisionId) || /^COVERAGE-PHASE-(PRE|L\d+)$/.test(decisionId) || decisionId === "COVERAGE-ALL-BLOCKED-WP") {
    return "blocked_work_package";
  }
  if (/^PHASE-(PRE|L\d+)$/.test(decisionId) || /^PHASE-(PRE|L\d+)-EXIT$/.test(decisionId) || decisionId === "COVERAGE-ALL-PHASE-EXITS") {
    return "phase_exit";
  }
  return null;
}

function isRegisterDataRow(line) {
  return line.startsWith("|") && !line.includes("---") && !line.includes("결정ID");
}

function rowCells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function parseRows(text) {
  const registerSection = text.split("## Status Legend")[0] ?? text;
  return registerSection
    .split("\n")
    .map((line, index) => ({ line, line_number: index + 1 }))
    .filter(({ line }) => isRegisterDataRow(line))
    .map(({ line, line_number }) => {
      const [
        decision_id = "",
        title = "",
        owner = "",
        decision = "",
        basis = "",
        date_or_revisit_gate = "",
        approval_signature = "",
        status = ""
      ] = rowCells(line);

      return {
        line_number,
        decision_id,
        title,
        owner,
        decision,
        basis,
        date_or_revisit_gate,
        approval_signature,
        status
      };
    });
}

function validateRow(row) {
  const missingFields = REQUIRED_FIELDS.filter((field) => !String(row[field] ?? "").trim());
  const errors = [];

  if (row.status !== STATUS_DECIDED && row.status !== STATUS_DEFERRED) {
    errors.push("status_must_be_decided_or_deferred_with_target");
  }

  return {
    ...row,
    status_kind: row.status === STATUS_DEFERRED ? "deferred" : row.status === STATUS_DECIDED ? "decided" : "invalid",
    deferral_coverage_domain: coverageDomainForDecisionId(row.decision_id),
    missing_fields: missingFields,
    errors,
    valid: missingFields.length === 0 && errors.length === 0
  };
}

export function summarizeLaunchDecisionRegister(path = DEFAULT_REGISTER_PATH) {
  if (!existsSync(path)) {
    return {
      path,
      exists: false,
      total_rows: 0,
      decided_rows: 0,
      deferred_rows: 0,
      valid_decided_rows: 0,
      valid_deferred_rows: 0,
      invalid_decision_rows: 0,
      rows: [],
      valid_decided_decision_ids: [],
      valid_deferred_decision_ids: [],
      valid_coverage_deferred_decision_ids: [],
      valid_non_coverage_deferred_decision_ids: [],
      coverage_eligible_valid_deferred_rows: 0,
      non_coverage_valid_deferred_rows: 0,
      invalid_rows: [],
      owner_approved_deferrals_present: false
    };
  }

  const rows = parseRows(readFileSync(path, "utf8")).map(validateRow);
  const decidedRows = rows.filter((row) => row.status === STATUS_DECIDED);
  const deferredRows = rows.filter((row) => row.status === STATUS_DEFERRED);
  const validDecidedRows = decidedRows.filter((row) => row.valid);
  const validDeferredRows = deferredRows.filter((row) => row.valid);
  const coverageEligibleValidDeferredRows = validDeferredRows.filter((row) => row.deferral_coverage_domain);
  const nonCoverageValidDeferredRows = validDeferredRows.filter((row) => !row.deferral_coverage_domain);
  const invalidRows = rows.filter((row) => !row.valid);

  return {
    path,
    exists: true,
    total_rows: rows.length,
    decided_rows: decidedRows.length,
    deferred_rows: deferredRows.length,
    valid_decided_rows: validDecidedRows.length,
    valid_deferred_rows: validDeferredRows.length,
    invalid_decision_rows: invalidRows.length,
    rows,
    valid_decided_decision_ids: validDecidedRows.map((row) => row.decision_id),
    valid_deferred_decision_ids: validDeferredRows.map((row) => row.decision_id),
    valid_coverage_deferred_decision_ids: coverageEligibleValidDeferredRows.map((row) => row.decision_id),
    valid_non_coverage_deferred_decision_ids: nonCoverageValidDeferredRows.map((row) => row.decision_id),
    coverage_eligible_valid_deferred_rows: coverageEligibleValidDeferredRows.length,
    non_coverage_valid_deferred_rows: nonCoverageValidDeferredRows.length,
    invalid_rows: invalidRows.map((row) => ({
      line_number: row.line_number,
      decision_id: row.decision_id,
      status: row.status,
      missing_fields: row.missing_fields,
      errors: row.errors
    })),
    owner_approved_deferrals_present: validDeferredRows.length > 0
  };
}
