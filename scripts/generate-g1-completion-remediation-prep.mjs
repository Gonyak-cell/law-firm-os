#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DEFERRAL_SOURCE_AUDIT_PATH = "docs/launch/launch-deferral-source-extraction-audit.json";
const CRITICAL_HARDENING_CONTRACT_PATH = "contracts/critical-rp-saas-hardening-contract.json";
const DEFERRAL_REVIEW_REGISTER_PATH = "docs/launch/deferral-review-register.md";
const HARDENING_COVERAGE_MATRIX_PATH = "docs/launch/hardening-coverage-matrix.md";
const G1_INDEX_PATH = "docs/launch/g1-completion-evidence-index.md";
const MAT_DEC_REGISTER_PATH = "workbook/absorption-package/06_오픈_결정_레지스터.md";
const OUTPUT_JSON_PATH = "docs/launch/g1-completion-remediation-prep-2026-06-19.json";
const OUTPUT_MD_PATH = "docs/launch/g1-completion-remediation-prep-2026-06-19.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function buildHardeningCells(contract) {
  const cells = [];
  for (const rp_id of contract.critical_rp_ids ?? []) {
    for (const control_id of contract.universal_saas_controls ?? []) {
      cells.push({
        cell_id: `${rp_id}:${control_id}`,
        rp_id,
        control_id,
        status: "pending_evidence_extraction",
        evidence_ref: "",
        evidence_command: "",
        unmet_disposition: "",
        approval_record: ""
      });
    }
  }
  return cells;
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function normalizeDecisionStatus(value) {
  if (value.includes("✅")) return "decided";
  if (value.includes("⏸")) return "deferred";
  if (/pending/i.test(value)) return "pending";
  return "unknown";
}

function expandMatDecIds(idCell) {
  if (idCell.includes("MAT-DEC-08·09")) return ["MAT-DEC-08", "MAT-DEC-09"];
  const matches = idCell.match(/MAT-DEC-\d{2}/g);
  return matches ?? [];
}

function parseMatDecStatusRows(path) {
  return readText(path)
    .split("\n")
    .filter((line) => line.startsWith("| MAT-DEC-") || line.startsWith("| **MAT-DEC-"))
    .flatMap((line) => {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length < 3) return [];
      const ids = expandMatDecIds(cells[0]);
      if (ids.length === 0) return [];
      const status = normalizeDecisionStatus(cells[1]);
      return ids.map((id) => ({
        decision_id: id,
        status,
        status_text: cells[1],
        decision_text: cells[2],
        source_ref: `${path}`
      }));
    });
}

function classifyMatDecLaunchEffect(row) {
  if (row.status === "decided") {
    return {
      launch_g1_effect: "owner_linkage_present",
      g1_blocking: false,
      launch_basis: "Decision status is recorded as decided in the absorption decision register."
    };
  }
  if (
    row.decision_id === "MAT-DEC-09" &&
    row.decision_text.includes("기본값") &&
    row.decision_text.includes("승인 불요")
  ) {
    return {
      launch_g1_effect: "non_blocking_default_owner_no_approval_required",
      g1_blocking: false,
      launch_basis: "Register text states the default owner path requires no approval when used."
    };
  }
  return {
    launch_g1_effect: "requires_owner_linkage_before_g1_e02",
    g1_blocking: true,
    launch_basis: "No decided owner-linked row or non-blocking register basis is present."
  };
}

function allZero(values) {
  return values.every((value) => value === 0);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# G1 Completion Remediation Prep");
  lines.push("");
  lines.push(`Generated on: ${report.generated_on}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This prep package does not close G1.");
  lines.push("- It does not mark `G1-E02` or `G1-E03` as evidence-satisfied.");
  lines.push("- It separates already-normalized deferral sources from owner-linkage and hardening-cell work still required.");
  lines.push(`- G1 can close only after the remaining owner linkage and ${report.summary.hardening_pending_cell_count} hardening cells have real evidence or valid dispositions.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## G1-E02 Deferred Item Rejudgment Prep");
  lines.push("");
  lines.push("| Source family | Count | Current meaning | G1 effect |");
  lines.push("| --- | ---: | --- | --- |");
  for (const row of report.g1_e02_deferred_item_rejudgment.source_families) {
    lines.push(`| ${markdownCell(row.source_family)} | ${row.count} | ${markdownCell(row.current_meaning)} | ${markdownCell(row.g1_effect)} |`);
  }
  lines.push("");
  lines.push("Remaining G1-E02 action:");
  lines.push("");
  lines.push(report.g1_e02_deferred_item_rejudgment.remaining_action);
  lines.push("");
  lines.push("### MAT-DEC Linkage State");
  lines.push("");
  lines.push("| Decision | Status | G1 blocker | Launch effect | Basis |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of report.g1_e02_deferred_item_rejudgment.mat_dec_linkage_rows) {
    lines.push(`| ${row.decision_id} | ${row.status} | ${row.g1_blocking ? "yes" : "no"} | ${markdownCell(row.launch_g1_effect)} | ${markdownCell(row.launch_basis)} |`);
  }
  lines.push("");
  lines.push("## G1-E03 Hardening Coverage Prep");
  lines.push("");
  lines.push("| Item | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Critical RP IDs | ${report.g1_e03_hardening_coverage.critical_rp_count} |`);
  lines.push(`| Universal SaaS controls | ${report.g1_e03_hardening_coverage.universal_control_count} |`);
  lines.push(`| Required cells | ${report.g1_e03_hardening_coverage.required_cell_count} |`);
  lines.push(`| Cells with evidence | ${report.g1_e03_hardening_coverage.evidence_satisfied_cell_count} |`);
  lines.push(`| Pending cells | ${report.g1_e03_hardening_coverage.pending_cell_count} |`);
  lines.push("");
  lines.push("First 24 hardening cells to populate:");
  lines.push("");
  lines.push("| Cell | RP | Control | Status |");
  lines.push("| --- | --- | --- | --- |");
  for (const cell of report.g1_e03_hardening_coverage.cells.slice(0, 24)) {
    lines.push(`| ${cell.cell_id} | ${cell.rp_id} | ${cell.control_id} | ${cell.status} |`);
  }
  lines.push("");
  lines.push("Full 272-cell scaffold is in the JSON artifact.");
  lines.push("");
  lines.push("## Next Required Work");
  lines.push("");
  for (const item of report.next_required_work) {
    lines.push(`${item.order}. ${item.action}`);
  }
  return `${lines.join("\n")}\n`;
}

const deferralAudit = readJson(DEFERRAL_SOURCE_AUDIT_PATH);
const hardeningContract = readJson(CRITICAL_HARDENING_CONTRACT_PATH);
const hardeningCells = buildHardeningCells(hardeningContract);
const uniqueMatDecIds = deferralAudit.mat_dec?.unique_decision_ids ?? [];
const matDecRows = parseMatDecStatusRows(MAT_DEC_REGISTER_PATH)
  .filter((row, index, rows) => rows.findIndex((candidate) => candidate.decision_id === row.decision_id) === index)
  .map((row) => ({
    ...row,
    ...classifyMatDecLaunchEffect(row)
  }));
const matDecBlockingRows = matDecRows.filter((row) => row.g1_blocking);
const g1E02CloseableNow = allZero([
  deferralAudit.p2?.unresolved_p2_line_count ?? 0,
  deferralAudit.ldip?.actual_decision_count ?? 0,
  deferralAudit.hrx?.actual_decision_count ?? 0,
  matDecBlockingRows.length
]);

const g1E02 = {
  evidence_id: "G1-E02",
  required_state: "blocking_remaining_count_zero",
  current_status: g1E02CloseableNow ? "closeable_pending_manual_evidence_intake" : "not_satisfied",
  closeable_now: g1E02CloseableNow,
  source_families: [
    {
      source_family: "P2 explicit item lines",
      count: deferralAudit.p2?.explicit_p2_item_line_count ?? 0,
      current_meaning: `Explicit historical P2 rows found; unresolved count is ${deferralAudit.p2?.unresolved_p2_line_count ?? "unknown"}.`,
      g1_effect: (deferralAudit.p2?.unresolved_p2_line_count ?? 0) === 0 ? "normalized_not_blocking" : "blocking_until_resolved"
    },
    {
      source_family: "LDIP actual defer decisions",
      count: deferralAudit.ldip?.actual_decision_count ?? 0,
      current_meaning: "Object-level traversal count of actual defer decisions.",
      g1_effect: (deferralAudit.ldip?.actual_decision_count ?? 0) === 0 ? "normalized_not_blocking" : "requires_owner_rejudgment"
    },
    {
      source_family: "HRX actual defer decisions",
      count: deferralAudit.hrx?.actual_decision_count ?? 0,
      current_meaning: "Object-level traversal count of actual defer decisions.",
      g1_effect: (deferralAudit.hrx?.actual_decision_count ?? 0) === 0 ? "normalized_not_blocking" : "requires_owner_rejudgment"
    },
    {
      source_family: "MAT-DEC launch decision mentions",
      count: uniqueMatDecIds.length,
      current_meaning: `Unique decision IDs present: ${uniqueMatDecIds.join(", ") || "none"}.`,
      g1_effect: matDecBlockingRows.length === 0 ? "owner_linkage_present_not_blocking" : "requires_launch_owner_linkage"
    }
  ],
  remaining_action: g1E02CloseableNow
    ? "MAT-DEC owner linkage is present or non-blocking. Move G1-E02 into manual evidence intake only after verifier records timestamped evidence satisfaction."
    : "Create owner-linked MAT-DEC decision rows or prove each MAT-DEC mention is non-blocking for launch G1. Only then can G1-E02 claim blocking_remaining_count_zero.",
  mat_dec_linkage_rows: matDecRows,
  mat_dec_blocking_rows: matDecBlockingRows,
  source_refs: [
    DEFERRAL_SOURCE_AUDIT_PATH,
    DEFERRAL_REVIEW_REGISTER_PATH,
    MAT_DEC_REGISTER_PATH
  ]
};

const g1E03 = {
  evidence_id: "G1-E03",
  required_state: "all_missing_cells_adjudicated_or_zero",
  current_status: "not_satisfied",
  closeable_now: false,
  critical_rp_count: hardeningContract.critical_rp_ids?.length ?? 0,
  universal_control_count: hardeningContract.universal_saas_controls?.length ?? 0,
  required_cell_count: hardeningCells.length,
  evidence_satisfied_cell_count: hardeningCells.filter((cell) => cell.status === "satisfied").length,
  pending_cell_count: hardeningCells.filter((cell) => cell.status === "pending_evidence_extraction").length,
  cells: hardeningCells,
  source_refs: [
    CRITICAL_HARDENING_CONTRACT_PATH,
    HARDENING_COVERAGE_MATRIX_PATH
  ]
};

const report = {
  schema_version: "law-firm-os.g1-completion-remediation-prep.v0.1",
  generated_on: "2026-06-19",
  source_refs: [
    DEFERRAL_SOURCE_AUDIT_PATH,
    CRITICAL_HARDENING_CONTRACT_PATH,
    DEFERRAL_REVIEW_REGISTER_PATH,
    HARDENING_COVERAGE_MATRIX_PATH,
    MAT_DEC_REGISTER_PATH,
    G1_INDEX_PATH
  ],
  boundary: {
    closes_g1: false,
    marks_g1_e02_evidence_satisfied: false,
    marks_g1_e03_evidence_satisfied: false,
    go_live_approved_by_this_prep: false,
    owner_deferrals_approved_by_this_prep: false,
    review_waiver_counts_as_valid_review_evidence: false
  },
  summary: {
    g1_e02_closeable_now: g1E02.closeable_now,
    g1_e03_closeable_now: g1E03.closeable_now,
    unresolved_p2_line_count: deferralAudit.p2?.unresolved_p2_line_count ?? null,
    ldip_actual_defer_decision_count: deferralAudit.ldip?.actual_decision_count ?? null,
    hrx_actual_defer_decision_count: deferralAudit.hrx?.actual_decision_count ?? null,
    mat_dec_unique_decision_id_count: uniqueMatDecIds.length,
    mat_dec_linked_decision_count: matDecRows.filter((row) => row.status === "decided").length,
    mat_dec_non_blocking_default_count: matDecRows.filter((row) => row.launch_g1_effect === "non_blocking_default_owner_no_approval_required").length,
    mat_dec_remaining_owner_linkage_count: matDecBlockingRows.length,
    hardening_required_cell_count: g1E03.required_cell_count,
    hardening_pending_cell_count: g1E03.pending_cell_count
  },
  g1_e02_deferred_item_rejudgment: g1E02,
  g1_e03_hardening_coverage: g1E03,
  next_required_work: [
    {
      order: 1,
      action: "For G1-E02, resolve MAT-DEC owner linkage and prove every remaining item is non-blocking or assigned to a valid launch phase."
    },
    {
      order: 2,
      action: "For G1-E03, populate each of the 272 RP/control cells with real evidence, `n/a` rationale, or owner-approved disposition for unmet cells."
    },
    {
      order: 3,
      action: "After G1-E02 and G1-E03 have real evidence refs, update the manual evidence intake rows to `evidence_satisfied` with timestamp and verifier."
    }
  ]
};

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true });
writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(OUTPUT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: OUTPUT_JSON_PATH,
  report_markdown: OUTPUT_MD_PATH,
  g1_e02_closeable_now: report.summary.g1_e02_closeable_now,
  g1_e03_closeable_now: report.summary.g1_e03_closeable_now,
  hardening_required_cell_count: report.summary.hardening_required_cell_count,
  hardening_pending_cell_count: report.summary.hardening_pending_cell_count
}, null, 2));
