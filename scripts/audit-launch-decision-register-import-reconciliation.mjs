#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const IMPORT_CANDIDATES_PATH = "docs/launch/launch-decision-register-import-candidates.json";
const IMPORT_CANDIDATES_VALIDATION_PATH = "docs/launch/launch-decision-register-import-candidates-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-decision-register-import-reconciliation-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-decision-register-import-reconciliation-audit.md";

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
  lines.push("# Launch Decision Register Import Reconciliation Audit");
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
  lines.push("## Reconciled Rows");
  lines.push("");
  if (report.reconciled_rows.length === 0) {
    lines.push("No launch decision register rows recorded.");
  } else {
    lines.push("| Decision ID | Status | Import candidate match | Field mismatches |");
    lines.push("| --- | --- | --- | ---: |");
    for (const row of report.reconciled_rows) {
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.status)} | ${row.import_candidate_match} | ${row.field_mismatch_count} |`);
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
  lines.push("- This audit reconciles launch decision register rows to validated import candidates.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Empty register state is valid but does not count as owner approval.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const importCandidates = readJson(IMPORT_CANDIDATES_PATH);
const importCandidatesValidation = readJson(IMPORT_CANDIDATES_VALIDATION_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const candidateByDecisionId = new Map((importCandidates.import_candidates ?? []).map((candidate) => [candidate.decision_id, candidate]));
const findings = [];

if (importCandidatesValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "IMPORT_CANDIDATES_VALIDATION_NOT_PASS", "Import candidates validation must pass before decision-register rows can be reconciled.", {
    actual: importCandidatesValidation.verdict
  });
}

const reconciledRows = (decisionSummary.rows ?? []).map((row) => {
  const candidate = candidateByDecisionId.get(row.decision_id);
  const mismatches = [];
  if (candidate) {
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
  }
  return {
    decision_id: row.decision_id,
    line_number: row.line_number,
    status: row.status,
    valid_register_row: row.valid,
    import_candidate_match: Boolean(candidate),
    field_mismatch_count: mismatches.length,
    mismatches
  };
});

for (const row of reconciledRows) {
  if (!row.valid_register_row) {
    addFinding(findings, "P1", "DECISION_REGISTER_ROW_INVALID", "Launch decision register row is structurally invalid.", {
      decision_id: row.decision_id,
      line_number: row.line_number
    });
  }
  if (!row.import_candidate_match) {
    addFinding(findings, "P1", "DECISION_REGISTER_ROW_WITHOUT_IMPORT_CANDIDATE", "Launch decision register row has no matching validated import candidate.", {
      decision_id: row.decision_id,
      line_number: row.line_number
    });
  }
  if (row.field_mismatch_count > 0) {
    addFinding(findings, "P1", "DECISION_REGISTER_ROW_IMPORT_MISMATCH", "Launch decision register row fields do not match its validated import candidate.", {
      decision_id: row.decision_id,
      line_number: row.line_number,
      mismatches: row.mismatches
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-decision-register-import-reconciliation-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DECISION_REGISTER_PATH,
    IMPORT_CANDIDATES_PATH,
    IMPORT_CANDIDATES_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    reconciles_import_candidates_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    empty_register_counts_as_owner_approval: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    decision_register_total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    import_candidate_count: importCandidates.summary.import_candidate_count,
    reconciled_row_count: reconciledRows.filter((row) => row.import_candidate_match && row.field_mismatch_count === 0).length,
    unreconciled_row_count: reconciledRows.filter((row) => !row.import_candidate_match || row.field_mismatch_count > 0).length,
    field_mismatch_count: reconciledRows.reduce((sum, row) => sum + row.field_mismatch_count, 0),
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  reconciled_rows: reconciledRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  import_candidate_count: report.summary.import_candidate_count,
  reconciled_row_count: report.summary.reconciled_row_count,
  unreconciled_row_count: report.summary.unreconciled_row_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
