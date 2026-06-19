#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const DECISION_REGISTER_VALIDATION_PATH = "docs/launch/launch-decision-register-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-decision-register-owner-evidence-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-decision-register-owner-evidence-audit.md";

const REQUIRED_EVIDENCE_FIELDS = [
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature"
];
const PLACEHOLDER_PATTERN = /<[^>]*>|REQUIRED|TBD|TODO|placeholder|pending owner|pending approval/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const DATE_OR_REVISIT_GATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$|^REVISIT-[A-Z0-9][A-Z0-9-]*$|^GATE-[A-Z0-9][A-Z0-9-]*$|^(PRE|L\d)-EXIT$/;
const EXTERNAL_SIGNATURE_REF_PATTERN =
  /^(external|signature|approval|email|ticket|meeting):[A-Za-z0-9][A-Za-z0-9 _./:@#-]{7,}$/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function signatureRefState(value) {
  const signature = String(value ?? "").trim();
  if (!signature || PLACEHOLDER_PATTERN.test(signature)) return "missing_or_placeholder";
  if (signature.startsWith("docs/")) return existsSync(signature) ? "local_ref_resolves" : "local_ref_missing";
  if (EXTERNAL_SIGNATURE_REF_PATTERN.test(signature)) return "external_ref_declared";
  return "unclassified_ref";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Decision Register Owner Evidence Audit");
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
  lines.push("## Owner Evidence Rows");
  lines.push("");
  if (report.owner_evidence_rows.length === 0) {
    lines.push("No owner decision rows recorded.");
  } else {
    lines.push("| Decision ID | Status | Evidence state | Signature state |");
    lines.push("| --- | --- | --- | --- |");
    for (const row of report.owner_evidence_rows) {
      lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.status)} | ${markdownCell(row.evidence_state)} | ${markdownCell(row.signature_ref_state)} |`);
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
  lines.push("- This audit checks owner-evidence quality for rows already present in the launch decision register.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not create or modify launch decision register rows.");
  lines.push("- Empty register state is valid but does not count as owner approval.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const decisionRegisterValidation = readJson(DECISION_REGISTER_VALIDATION_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];

if (decisionRegisterValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "DECISION_REGISTER_VALIDATION_NOT_PASS", "Decision register validation must pass before owner evidence quality can be trusted.", {
    actual: decisionRegisterValidation.verdict
  });
}

const ownerEvidenceRows = (decisionSummary.rows ?? []).map((row) => {
  const weakFields = [];
  const agentInferredFields = [];
  for (const field of REQUIRED_EVIDENCE_FIELDS) {
    const value = String(row[field] ?? "").trim();
    if (!value || PLACEHOLDER_PATTERN.test(value)) weakFields.push(field);
    if (AGENT_INFERENCE_PATTERN.test(value)) agentInferredFields.push(field);
  }

  if (row.date_or_revisit_gate && !DATE_OR_REVISIT_GATE_PATTERN.test(row.date_or_revisit_gate)) {
    weakFields.push("date_or_revisit_gate_format");
  }

  const currentSignatureRefState = signatureRefState(row.approval_signature);
  if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
    weakFields.push("approval_signature_ref");
  }

  const evidenceState = row.valid && weakFields.length === 0 && agentInferredFields.length === 0
    ? "owner_evidence_quality_pass"
    : "owner_evidence_quality_blocked";

  return {
    decision_id: row.decision_id,
    line_number: row.line_number,
    status: row.status,
    status_kind: row.status_kind,
    deferral_coverage_domain: row.deferral_coverage_domain,
    valid_register_row: row.valid,
    evidence_state: evidenceState,
    signature_ref_state: currentSignatureRefState,
    weak_fields: [...new Set(weakFields)].sort(),
    agent_inferred_fields: agentInferredFields
  };
});

for (const row of ownerEvidenceRows) {
  if (!row.valid_register_row) {
    addFinding(findings, "P1", "OWNER_EVIDENCE_ROW_REGISTER_INVALID", "Owner decision row is not structurally valid.", {
      decision_id: row.decision_id,
      line_number: row.line_number
    });
  }
  if (row.weak_fields.length > 0) {
    addFinding(findings, "P1", "OWNER_EVIDENCE_WEAK_FIELDS", "Owner decision row has weak, placeholder, unresolved, or unclassified evidence fields.", {
      decision_id: row.decision_id,
      line_number: row.line_number,
      weak_fields: row.weak_fields
    });
  }
  if (row.agent_inferred_fields.length > 0) {
    addFinding(findings, "P0", "OWNER_EVIDENCE_AGENT_INFERRED", "Owner decision row appears to rely on agent-inferred approval evidence.", {
      decision_id: row.decision_id,
      line_number: row.line_number,
      fields: row.agent_inferred_fields
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-decision-register-owner-evidence-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DECISION_REGISTER_PATH,
    DECISION_REGISTER_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    validates_owner_evidence_quality_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    decision_register_total_rows: decisionSummary.total_rows,
    owner_evidence_row_count: ownerEvidenceRows.length,
    owner_evidence_quality_pass_count: ownerEvidenceRows.filter((row) => row.evidence_state === "owner_evidence_quality_pass").length,
    owner_evidence_quality_blocked_count: ownerEvidenceRows.filter((row) => row.evidence_state !== "owner_evidence_quality_pass").length,
    local_signature_ref_resolves_count: ownerEvidenceRows.filter((row) => row.signature_ref_state === "local_ref_resolves").length,
    external_signature_ref_declared_count: ownerEvidenceRows.filter((row) => row.signature_ref_state === "external_ref_declared").length,
    weak_owner_evidence_row_count: ownerEvidenceRows.filter((row) => row.weak_fields.length > 0).length,
    agent_inferred_owner_evidence_row_count: ownerEvidenceRows.filter((row) => row.agent_inferred_fields.length > 0).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  owner_evidence_rows: ownerEvidenceRows,
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
  owner_evidence_quality_pass_count: report.summary.owner_evidence_quality_pass_count,
  weak_owner_evidence_row_count: report.summary.weak_owner_evidence_row_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
