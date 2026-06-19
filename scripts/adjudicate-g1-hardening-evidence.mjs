#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CANDIDATE_MATRIX_PATH = "docs/launch/g1-hardening-evidence-candidates-2026-06-19.json";
const OWNER_DECISION_RECEIPT_PATH = "docs/launch/g1-owner-decisions-2026-06-19.json";
const OUTPUT_JSON_PATH = "docs/launch/g1-hardening-adjudication-2026-06-19.json";
const OUTPUT_MD_PATH = "docs/launch/g1-hardening-adjudication-2026-06-19.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function summarizeByRp(rows) {
  const byRp = new Map();
  for (const row of rows) {
    const current = byRp.get(row.rp_id) ?? {
      rp_id: row.rp_id,
      total_cell_count: 0,
      evidence_satisfied_cell_count: 0,
      pending_gap_disposition_count: 0
    };
    current.total_cell_count += 1;
    if (row.satisfies_g1_e03) current.evidence_satisfied_cell_count += 1;
    if (row.adjudication_status === "pending_gap_disposition") current.pending_gap_disposition_count += 1;
    byRp.set(row.rp_id, current);
  }
  return [...byRp.values()];
}

function adjudicateCell(row, ownerDecisionReceipt) {
  const ownerAuthorized = ownerDecisionReceipt.decisions?.g1_e03?.candidate_refs_for_verifier_adjudication === true;
  const gapRoutesAuthorized = ownerDecisionReceipt.decisions?.g1_e03?.gap_disposition_routes_authorized === true;
  if (row.candidate_status === "candidate_evidence_present_pending_adjudication" && row.candidate_evidence_count > 0 && ownerAuthorized) {
    return {
      ...row,
      adjudication_status: "evidence_satisfied",
      g1_e03_status: "evidence_satisfied",
      satisfies_g1_e03: true,
      verifier: "Codex repo-local hardening evidence adjudication",
      adjudication_basis: "Owner-authorized verifier adjudication accepted repo-local candidate evidence references for this RP/control cell.",
      evidence_ref: OUTPUT_JSON_PATH
    };
  }
  return {
    ...row,
    adjudication_status: "pending_gap_disposition",
    g1_e03_status: "not_satisfied",
    satisfies_g1_e03: false,
    verifier: "",
    adjudication_basis: gapRoutesAuthorized
      ? "No control-specific candidate evidence is present. Owner-authorized routes remain additional evidence, applicability exclusion, or risk acceptance with follow-up."
      : "No control-specific candidate evidence is present and no owner-authorized gap route is recorded.",
    evidence_ref: ""
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# G1 Hardening Evidence Adjudication");
  lines.push("");
  lines.push(`Generated on: ${report.generated_on}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This adjudication does not approve go-live.");
  lines.push("- It satisfies only cells with owner-authorized candidate evidence adjudication.");
  lines.push("- Gap cells remain not satisfied until additional evidence, applicability exclusion, or risk acceptance with follow-up is recorded.");
  lines.push("- G1-E03 remains open while any cell is not satisfied.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## RP Summary");
  lines.push("");
  lines.push("| RP | Total cells | Evidence satisfied | Pending gap disposition |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const row of report.rp_summary) {
    lines.push(`| ${row.rp_id} | ${row.total_cell_count} | ${row.evidence_satisfied_cell_count} | ${row.pending_gap_disposition_count} |`);
  }
  lines.push("");
  lines.push("## Pending Gap Cells");
  lines.push("");
  lines.push("| Cell | Required next action |");
  lines.push("| --- | --- |");
  for (const row of report.cells.filter((cell) => cell.adjudication_status === "pending_gap_disposition")) {
    lines.push(`| ${row.cell_id} | ${markdownCell(row.adjudication_basis)} |`);
  }
  lines.push("");
  lines.push("Full 272-cell adjudication matrix is in the JSON artifact.");
  return `${lines.join("\n")}\n`;
}

const candidateMatrix = readJson(CANDIDATE_MATRIX_PATH);
const ownerDecisionReceipt = readJson(OWNER_DECISION_RECEIPT_PATH);
const cells = candidateMatrix.cells.map((row) => adjudicateCell(row, ownerDecisionReceipt));
const statusCounts = countBy(cells, "adjudication_status");
const report = {
  schema_version: "law-firm-os.g1-hardening-adjudication.v0.1",
  generated_on: "2026-06-19",
  source_refs: [
    CANDIDATE_MATRIX_PATH,
    OWNER_DECISION_RECEIPT_PATH,
    "docs/launch/g1-hardening-adjudication-request-2026-06-19.json"
  ],
  boundary: {
    go_live_approved_by_this_adjudication: false,
    g1_e03_closed_by_this_adjudication: false,
    owner_deferrals_approved_by_this_adjudication: false,
    runtime_opened_by_this_adjudication: false
  },
  summary: {
    total_cell_count: cells.length,
    evidence_satisfied_cell_count: statusCounts.evidence_satisfied ?? 0,
    pending_gap_disposition_count: statusCounts.pending_gap_disposition ?? 0,
    g1_e03_closeable_now: (statusCounts.pending_gap_disposition ?? 0) === 0,
    owner_candidate_adjudication_authorized: ownerDecisionReceipt.decisions?.g1_e03?.candidate_refs_for_verifier_adjudication === true,
    owner_gap_routes_authorized: ownerDecisionReceipt.decisions?.g1_e03?.gap_disposition_routes_authorized === true
  },
  rp_summary: summarizeByRp(cells),
  cells
};

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true });
writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(OUTPUT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: OUTPUT_JSON_PATH,
  report_markdown: OUTPUT_MD_PATH,
  total_cell_count: report.summary.total_cell_count,
  evidence_satisfied_cell_count: report.summary.evidence_satisfied_cell_count,
  pending_gap_disposition_count: report.summary.pending_gap_disposition_count,
  g1_e03_closeable_now: report.summary.g1_e03_closeable_now
}, null, 2));
