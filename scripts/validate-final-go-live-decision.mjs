#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const DECISION_PATH = "docs/launch/final-go-live-decision.json";
const DECISION_MD_PATH = "docs/launch/final-go-live-decision.md";
const EXTERNAL_RECEIPT_LEDGER_PATH = "docs/launch/launch-external-receipt-ledger.json";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const RUNTIME_LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const RUNTIME_EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const GO_NO_GO_DECISION_PATH = "docs/launch/go-no-go-decision.md";
const CUTOVER_RUNBOOK_PATH = "docs/launch/cutover-runbook.md";
const REPORT_JSON_PATH = "docs/launch/final-go-live-decision-validation.json";
const REPORT_MD_PATH = "docs/launch/final-go-live-decision-validation.md";
const REQUIRED_DECISION_FIELDS = [
  "decision_id",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human"
];
const EXPECTED_DECISION_ID = "FINAL-GO-LIVE-DECISION-2026-06-21";
const PLACEHOLDER_PATTERN = /<[^>]*>|REQUIRED|TBD|TODO|placeholder|pending owner|pending approval|\[[^\]]*\]/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SIGNATURE_REF_PATTERN = /^(external|signature|approval|email|ticket|meeting):[A-Za-z0-9][A-Za-z0-9 _./:@#-]{7,}$/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Final Go-Live Decision Validation");
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
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This validation checks that final go-live approval is recorded from owner evidence.");
  lines.push("- It does not execute production cutover.");
  lines.push("- It does not execute company-wide rollout.");
  lines.push("- It does not close LT terminal packets.");
  lines.push("- `actual_launch_go_live_claim` remains false until cutover/live completion evidence exists.");
  return `${lines.join("\n")}\n`;
}

const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();
const findings = [];

for (const path of [
  DECISION_PATH,
  DECISION_MD_PATH,
  EXTERNAL_RECEIPT_LEDGER_PATH,
  DECISION_REGISTER_PATH,
  RUNTIME_LEDGER_PATH,
  RUNTIME_EVIDENCE_INDEX_PATH,
  GO_NO_GO_DECISION_PATH,
  CUTOVER_RUNBOOK_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required final go-live source reference is missing.", { path });
}

const decisionRecord = existsSync(DECISION_PATH) ? readJson(DECISION_PATH) : {};
const decisionText = existsSync(DECISION_MD_PATH) ? readText(DECISION_MD_PATH) : "";
const externalReceiptLedger = existsSync(EXTERNAL_RECEIPT_LEDGER_PATH) ? readJson(EXTERNAL_RECEIPT_LEDGER_PATH) : {};
const runtimeLedger = existsSync(RUNTIME_LEDGER_PATH) ? readJson(RUNTIME_LEDGER_PATH) : {};
const runtimeEvidenceIndex = existsSync(RUNTIME_EVIDENCE_INDEX_PATH) ? readJson(RUNTIME_EVIDENCE_INDEX_PATH) : {};
const goNoGoDecisionText = existsSync(GO_NO_GO_DECISION_PATH) ? readText(GO_NO_GO_DECISION_PATH) : "";
const cutoverRunbookText = existsSync(CUTOVER_RUNBOOK_PATH) ? readText(CUTOVER_RUNBOOK_PATH) : "";
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const decision = decisionRecord.decision ?? {};

if (decisionRecord.schema_version !== "law-firm-os.final-go-live-decision.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected final go-live decision schema version.", {
    actual: decisionRecord.schema_version
  });
}

if (decisionRecord.status !== "final_go_live_approval_recorded_pending_cutover_execution") {
  addFinding(findings, "P1", "DECISION_STATUS", "Final go-live decision status must preserve cutover-pending boundary.", {
    actual: decisionRecord.status
  });
}

const weakDecisionFields = REQUIRED_DECISION_FIELDS.filter((field) => {
  const value = String(decision[field] ?? "").trim();
  return !value || PLACEHOLDER_PATTERN.test(value);
});
if (weakDecisionFields.length > 0) {
  addFinding(findings, "P1", "WEAK_DECISION_FIELDS", "Final go-live decision has missing or placeholder fields.", {
    weak_fields: weakDecisionFields
  });
}

const agentInferredFields = REQUIRED_DECISION_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(decision[field] ?? "")));
if (agentInferredFields.length > 0) {
  addFinding(findings, "P0", "AGENT_INFERRED_DECISION", "Final go-live decision appears to rely on agent-inferred approval evidence.", {
    fields: agentInferredFields
  });
}

if (decision.decision_id !== EXPECTED_DECISION_ID) {
  addFinding(findings, "P1", "DECISION_ID", "Final go-live decision id mismatch.", {
    expected: EXPECTED_DECISION_ID,
    actual: decision.decision_id
  });
}
if (decision.decision !== "approved") {
  addFinding(findings, "P1", "DECISION_NOT_APPROVED", "Final go-live decision must be approved.", {
    actual: decision.decision
  });
}
if (!DATE_PATTERN.test(String(decision.date_or_revisit_gate ?? ""))) {
  addFinding(findings, "P1", "DECISION_DATE", "Final go-live decision date must be YYYY-MM-DD.", {
    actual: decision.date_or_revisit_gate
  });
}
if (!RECEIVED_AT_PATTERN.test(String(decision.received_at ?? ""))) {
  addFinding(findings, "P1", "DECISION_RECEIVED_AT", "Final go-live decision received_at must be UTC Zulu time.", {
    actual: decision.received_at
  });
}
if (!SIGNATURE_REF_PATTERN.test(String(decision.approval_signature_ref ?? ""))) {
  addFinding(findings, "P1", "DECISION_SIGNATURE_REF", "Final go-live decision signature reference is missing or unsupported.", {
    actual: decision.approval_signature_ref
  });
}

const expectedBoundary = {
  final_go_live_approval_recorded: true,
  actual_launch_go_live_claim: false,
  production_cutover_executed_by_this_decision: false,
  company_wide_rollout_executed_by_this_decision: false,
  lt_terminal_closeout_approved_by_this_decision: false,
  post_launch_hypercare_obligations_remain: true,
  closed_cp_evidence_is_read_only: true
};
for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (decisionRecord.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Final go-live boundary field ${key} drifted.`, {
      expected,
      actual: decisionRecord.boundary?.[key]
    });
  }
}

if (externalReceiptLedger.summary?.real_external_receipt_count !== 8 || externalReceiptLedger.summary?.pending_external_receipt_count !== 0 || externalReceiptLedger.summary?.all_external_receipts_received !== true) {
  addFinding(findings, "P1", "EXTERNAL_RECEIPTS_NOT_COMPLETE", "External receipt ledger must show 8 real receipts, 0 pending, and all receipts received.", {
    summary: externalReceiptLedger.summary
  });
}

const finalDecisionRows = (decisionSummary.rows ?? []).filter((row) => row.decision_id === EXPECTED_DECISION_ID);
if (finalDecisionRows.length !== 1 || finalDecisionRows[0]?.status !== "decided" || finalDecisionRows[0]?.decision !== "approved" || !finalDecisionRows[0]?.valid) {
  addFinding(findings, "P1", "DECISION_REGISTER_ROW", "Launch decision register must contain one valid decided final go-live row.", {
    matching_rows: finalDecisionRows
  });
}

if (runtimeLedger.final_go_live_approval_recorded !== true || runtimeLedger.final_go_live_decision_ref !== DECISION_PATH || runtimeLedger.actual_launch_go_live_claim !== false) {
  addFinding(findings, "P1", "RUNTIME_LEDGER_BOUNDARY", "Runtime spine ledger must record final approval while keeping actual launch/go-live false.", {
    final_go_live_approval_recorded: runtimeLedger.final_go_live_approval_recorded,
    final_go_live_decision_ref: runtimeLedger.final_go_live_decision_ref,
    actual_launch_go_live_claim: runtimeLedger.actual_launch_go_live_claim
  });
}

if (runtimeEvidenceIndex.final_go_live_approval_recorded !== true || runtimeEvidenceIndex.final_go_live_decision_ref !== DECISION_PATH || runtimeEvidenceIndex.actual_launch_go_live_claim !== false) {
  addFinding(findings, "P1", "RUNTIME_EVIDENCE_BOUNDARY", "Runtime evidence index must record final approval while keeping actual launch/go-live false.", {
    final_go_live_approval_recorded: runtimeEvidenceIndex.final_go_live_approval_recorded,
    final_go_live_decision_ref: runtimeEvidenceIndex.final_go_live_decision_ref,
    actual_launch_go_live_claim: runtimeEvidenceIndex.actual_launch_go_live_claim
  });
}

for (const [path, text, required] of [
  [DECISION_MD_PATH, decisionText, "Final go-live approval is recorded."],
  [GO_NO_GO_DECISION_PATH, goNoGoDecisionText, "Final go-live approval is recorded"],
  [CUTOVER_RUNBOOK_PATH, cutoverRunbookText, "Final go-live approval is recorded"]
]) {
  if (!text.includes(required)) {
    addFinding(findings, "P1", "MARKDOWN_DECISION_LINK_MISSING", "Markdown launch surface does not reference final go-live approval.", {
      path,
      required
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.final-go-live-decision.validation.v0.1",
  generated_at: generatedAt,
  source_refs: [
    DECISION_PATH,
    DECISION_MD_PATH,
    EXTERNAL_RECEIPT_LEDGER_PATH,
    DECISION_REGISTER_PATH,
    RUNTIME_LEDGER_PATH,
    RUNTIME_EVIDENCE_INDEX_PATH,
    GO_NO_GO_DECISION_PATH,
    CUTOVER_RUNBOOK_PATH
  ],
  verdict,
  summary: {
    final_go_live_approval_recorded: decisionRecord.boundary?.final_go_live_approval_recorded === true,
    actual_launch_go_live_claim: runtimeLedger.actual_launch_go_live_claim === true,
    production_cutover_executed_by_this_decision: decisionRecord.boundary?.production_cutover_executed_by_this_decision === true,
    external_receipt_lane_count: externalReceiptLedger.summary?.external_receipt_lane_count ?? null,
    real_external_receipt_count: externalReceiptLedger.summary?.real_external_receipt_count ?? null,
    pending_external_receipt_count: externalReceiptLedger.summary?.pending_external_receipt_count ?? null,
    decision_register_final_row_count: finalDecisionRows.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_final_go_live_approval_only: true,
    production_cutover_executed_by_validation: false,
    company_wide_rollout_executed_by_validation: false,
    lt_terminal_closeout_approved_by_validation: false,
    actual_launch_go_live_claim_by_validation: false
  },
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  final_go_live_approval_recorded: report.summary.final_go_live_approval_recorded,
  actual_launch_go_live_claim: report.summary.actual_launch_go_live_claim,
  real_external_receipt_count: report.summary.real_external_receipt_count,
  pending_external_receipt_count: report.summary.pending_external_receipt_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
