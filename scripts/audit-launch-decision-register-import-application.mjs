#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const IMPORT_CANDIDATES_PATH = "docs/launch/launch-decision-register-import-candidates.json";
const IMPORT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-decision-register-import-candidates-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-decision-register-import-application-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-decision-register-import-application-audit.md";

const REGISTER_ROW_FIELDS = [
  "decision_id",
  "title",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature",
  "status"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Decision Register Import Application Audit");
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
  lines.push("## Candidate Application Rows");
  lines.push("");
  if (report.application_rows.length === 0) {
    lines.push("No import candidates to apply.");
  } else {
    lines.push("| Decision ID | Application state | Field mismatches |");
    lines.push("| --- | --- | ---: |");
    for (const row of report.application_rows) {
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.application_state)} | ${row.field_mismatch_count} |`);
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
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit checks decision-register import candidate application only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Pending import application does not count as owner approval.");
  lines.push("- Empty import-candidate state is valid but does not count as owner approval.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const importCandidates = readJson(IMPORT_CANDIDATES_PATH);
const importCandidatesValidation = readJson(IMPORT_CANDIDATES_VALIDATION_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (importCandidatesValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "IMPORT_CANDIDATES_VALIDATION_NOT_PASS", "Import candidates validation must pass before candidate application can be audited.", {
    actual: importCandidatesValidation.verdict
  });
}

const rowsByDecisionId = new Map();
for (const row of decisionSummary.rows ?? []) {
  const rows = rowsByDecisionId.get(row.decision_id) ?? [];
  rows.push(row);
  rowsByDecisionId.set(row.decision_id, rows);
}

const applicationRows = (importCandidates.import_candidates ?? []).map((candidate) => {
  const rows = rowsByDecisionId.get(candidate.decision_id) ?? [];
  const row = rows[0] ?? null;
  const mismatches = [];
  let applicationState = "pending_manual_application";

  if (rows.length > 1) {
    applicationState = "duplicate_register_rows";
  } else if (row) {
    for (const field of REGISTER_ROW_FIELDS) {
      const expected = candidate.register_row?.[field] ?? "";
      const actual = row[field] ?? "";
      if (actual !== expected) {
        mismatches.push({
          field,
          expected,
          actual
        });
      }
    }
    applicationState = mismatches.length === 0 && row.valid ? "applied" : "mismatched_register_row";
  }

  return {
    decision_id: candidate.decision_id,
    application_state: applicationState,
    line_numbers: rows.map((item) => item.line_number),
    field_mismatch_count: mismatches.length,
    mismatches
  };
});

for (const row of applicationRows) {
  if (row.application_state === "duplicate_register_rows") {
    addFinding(findings, "P1", "IMPORT_CANDIDATE_DUPLICATE_REGISTER_ROWS", "Import candidate maps to duplicate launch decision register rows.", {
      decision_id: row.decision_id,
      line_numbers: row.line_numbers
    });
  }
  if (row.application_state === "mismatched_register_row") {
    addFinding(findings, "P1", "IMPORT_CANDIDATE_REGISTER_ROW_MISMATCH", "Import candidate does not match the current launch decision register row and is not merely pending manual application.", {
      decision_id: row.decision_id,
      line_numbers: row.line_numbers,
      mismatches: row.mismatches
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-decision-register-import-application-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DECISION_REGISTER_PATH,
    IMPORT_CANDIDATES_PATH,
    IMPORT_CANDIDATES_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    audits_import_candidate_application_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    pending_import_application_counts_as_owner_approval: false,
    empty_import_candidate_state_counts_as_owner_approval: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    import_candidate_count: importCandidates.summary.import_candidate_count,
    applied_candidate_count: applicationRows.filter((row) => row.application_state === "applied").length,
    pending_application_count: applicationRows.filter((row) => row.application_state === "pending_manual_application").length,
    mismatched_application_count: applicationRows.filter((row) => row.application_state === "mismatched_register_row").length,
    duplicate_register_row_count: applicationRows.filter((row) => row.application_state === "duplicate_register_rows").length,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  application_rows: applicationRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  import_candidate_count: report.summary.import_candidate_count,
  applied_candidate_count: report.summary.applied_candidate_count,
  pending_application_count: report.summary.pending_application_count,
  mismatched_application_count: report.summary.mismatched_application_count,
  duplicate_register_row_count: report.summary.duplicate_register_row_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
