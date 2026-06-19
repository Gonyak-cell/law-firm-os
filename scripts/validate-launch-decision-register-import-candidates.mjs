#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { coverageDomainForDecisionId, summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const IMPORT_CANDIDATES_JSON_PATH = "docs/launch/launch-decision-register-import-candidates.json";
const IMPORT_CANDIDATES_MD_PATH = "docs/launch/launch-decision-register-import-candidates.md";
const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-decision-register-import-candidates-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-decision-register-import-candidates-validation.md";

const REQUIRED_REGISTER_FIELDS = [
  "decision_id",
  "title",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature",
  "status"
];
const REQUIRED_MARKDOWN_PHRASES = [
  "import-candidate preview only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Pending owner receipt slots are excluded from import candidates"
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

function readText(path) {
  return readFileSync(path, "utf8");
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
  lines.push("# Launch Decision Register Import Candidates Validation");
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
  lines.push("- This validation checks import candidates only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const candidates = readJson(IMPORT_CANDIDATES_JSON_PATH);
const candidatesMarkdown = readText(IMPORT_CANDIDATES_MD_PATH);
const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (candidates.schema_version !== "law-firm-os.launch-decision-register-import-candidates.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected launch decision register import candidates schema version.", {
    actual: candidates.schema_version
  });
}

const expectedBoundary = {
  import_candidate_preview_only: true,
  go_live_approved_by_this_file: false,
  owner_deferrals_approved_by_this_file: false,
  launch_decision_register_modified_by_this_file: false,
  pending_receipts_excluded_from_candidates: true,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (candidates.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Import candidates boundary field ${key} drifted.`, {
      expected,
      actual: candidates.boundary?.[key]
    });
  }
}

if (receiptLedgerValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_LEDGER_VALIDATION_NOT_PASS", "Receipt ledger validation must pass before import candidates can be trusted.", {
    actual: receiptLedgerValidation.verdict
  });
}

const receiptByDecisionId = new Map((receiptLedger.receipt_slots ?? []).map((slot) => [slot.decision_id, slot]));
const importCandidates = candidates.import_candidates ?? [];
const expectedCandidateDecisionIds = (receiptLedger.receipt_slots ?? [])
  .filter((slot) => slot.receipt_status === "real_owner_evidence_received" && slot.copy_to_launch_decision_register_allowed === true)
  .map((slot) => slot.decision_id)
  .sort();
const actualCandidateDecisionIds = importCandidates.map((candidate) => candidate.decision_id).sort();

if (JSON.stringify(actualCandidateDecisionIds) !== JSON.stringify(expectedCandidateDecisionIds)) {
  addFinding(findings, "P1", "CANDIDATE_SET_MISMATCH", "Import candidates do not match real copy-allowed owner receipt slots.", {
    expected: expectedCandidateDecisionIds,
    actual: actualCandidateDecisionIds
  });
}

for (const candidate of importCandidates) {
  const slot = receiptByDecisionId.get(candidate.decision_id);
  if (!slot) {
    addFinding(findings, "P1", "CANDIDATE_WITHOUT_RECEIPT_SLOT", "Import candidate has no matching receipt ledger slot.", {
      decision_id: candidate.decision_id
    });
    continue;
  }
  if (slot.receipt_status !== "real_owner_evidence_received" || slot.copy_to_launch_decision_register_allowed !== true) {
    addFinding(findings, "P0", "PENDING_OR_NOT_ALLOWED_RECEIPT_INCLUDED", "Import candidate was created from a pending or copy-blocked receipt slot.", {
      decision_id: candidate.decision_id,
      receipt_status: slot.receipt_status,
      copy_allowed: slot.copy_to_launch_decision_register_allowed
    });
  }
  if (candidate.source_receipt_status !== slot.receipt_status || candidate.source_copy_allowed !== slot.copy_to_launch_decision_register_allowed) {
    addFinding(findings, "P1", "CANDIDATE_SOURCE_STATUS_MISMATCH", "Import candidate source status does not match receipt ledger.", {
      decision_id: candidate.decision_id
    });
  }
  if (candidate.coverage_domain !== coverageDomainForDecisionId(candidate.decision_id)) {
    addFinding(findings, "P1", "CANDIDATE_DECISION_ID_DOMAIN_MISMATCH", "Import candidate decision ID is not classified into its expected coverage domain.", {
      decision_id: candidate.decision_id,
      actual: candidate.coverage_domain
    });
  }

  const row = candidate.register_row ?? {};
  const missingFields = REQUIRED_REGISTER_FIELDS.filter((field) => !String(row[field] ?? "").trim() || PLACEHOLDER_PATTERN.test(String(row[field] ?? "")));
  if (missingFields.length > 0) {
    addFinding(findings, "P1", "CANDIDATE_REGISTER_ROW_WEAK_FIELDS", "Import candidate register row has missing or placeholder fields.", {
      decision_id: candidate.decision_id,
      missing_fields: missingFields
    });
  }
  const agentInferredFields = REQUIRED_REGISTER_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(row[field] ?? "")));
  if (agentInferredFields.length > 0) {
    addFinding(findings, "P0", "CANDIDATE_REGISTER_ROW_AGENT_INFERRED", "Import candidate register row appears to rely on agent-inferred approval evidence.", {
      decision_id: candidate.decision_id,
      fields: agentInferredFields
    });
  }
  if (row.status !== "deferred(시한 명기)") {
    addFinding(findings, "P1", "CANDIDATE_REGISTER_ROW_STATUS_INVALID", "Import candidate register row has invalid status.", {
      decision_id: candidate.decision_id,
      actual: row.status
    });
  }
  if (row.decision_id !== candidate.decision_id) {
    addFinding(findings, "P1", "CANDIDATE_REGISTER_ROW_DECISION_ID_MISMATCH", "Import candidate register row decision ID does not match candidate.", {
      decision_id: candidate.decision_id,
      row_decision_id: row.decision_id
    });
  }
  if (row.approval_signature !== candidate.source_approval_signature_ref) {
    addFinding(findings, "P1", "CANDIDATE_SIGNATURE_REF_SOURCE_MISMATCH", "Import candidate signature reference does not match receipt source.", {
      decision_id: candidate.decision_id
    });
  }
  const currentSignatureRefState = signatureRefState(row.approval_signature);
  if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
    addFinding(findings, "P1", "CANDIDATE_SIGNATURE_REF_INVALID", "Import candidate signature reference is missing, unresolved, or unclassified.", {
      decision_id: candidate.decision_id,
      signature_ref_state: currentSignatureRefState
    });
  }
  if (!DATE_OR_REVISIT_GATE_PATTERN.test(String(row.date_or_revisit_gate ?? ""))) {
    addFinding(findings, "P1", "CANDIDATE_DATE_OR_GATE_INVALID", "Import candidate date or revisit gate is invalid.", {
      decision_id: candidate.decision_id,
      actual: row.date_or_revisit_gate
    });
  }
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!candidatesMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Import candidates markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_MODIFIED_BY_IMPORT_CANDIDATES", "Launch decision register contains decision rows while import candidates are preview-only.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows
  });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-decision-register-import-candidates.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    IMPORT_CANDIDATES_JSON_PATH,
    IMPORT_CANDIDATES_MD_PATH,
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    import_candidate_count: importCandidates.length,
    expected_import_candidate_count: expectedCandidateDecisionIds.length,
    covered_target_count_by_candidates: candidates.summary?.covered_target_count_by_candidates ?? null,
    real_owner_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    pending_receipt_slot_count: receiptLedger.summary.pending_receipt_slot_count,
    copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_import_candidates_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    pending_receipts_excluded_from_candidates: true,
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
  import_candidate_count: report.summary.import_candidate_count,
  expected_import_candidate_count: report.summary.expected_import_candidate_count,
  covered_target_count_by_candidates: report.summary.covered_target_count_by_candidates,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
