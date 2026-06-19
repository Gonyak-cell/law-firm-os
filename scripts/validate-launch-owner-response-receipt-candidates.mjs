#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CANDIDATES_JSON_PATH = "docs/launch/launch-owner-response-receipt-candidates.json";
const CANDIDATES_MD_PATH = "docs/launch/launch-owner-response-receipt-candidates.md";
const RESPONSE_INTAKE_PATH = "docs/launch/launch-owner-response-intake.json";
const RESPONSE_INTAKE_VALIDATION_PATH = "docs/launch/launch-owner-response-intake-validation.json";
const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-owner-response-receipt-candidates-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-owner-response-receipt-candidates-validation.md";

const RECEIPT_SLOT_UPDATE_FIELDS = [
  "decision_id",
  "title",
  "coverage_domain",
  "covered_target_count",
  "required_owner_basis",
  "target_detail_state",
  "target_ids",
  "allowed_register_status_after_real_receipt",
  "receipt_status",
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human",
  "pending_slot_not_approval",
  "copy_to_launch_decision_register_allowed"
];
const REQUIRED_MARKDOWN_PHRASES = [
  "receipt-update candidate preview only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-owner-approval-receipt-ledger.json`",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Pending owner responses are excluded from receipt-update candidates",
  "candidate file is not itself a launch decision"
];
const PLACEHOLDER_PATTERN = /<[^>]*>|REQUIRED|TBD|TODO|placeholder|pending owner|pending approval/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const DATE_OR_REVISIT_GATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$|^REVISIT-[A-Z0-9][A-Z0-9-]*$|^GATE-[A-Z0-9][A-Z0-9-]*$|^(PRE|L\d)-EXIT$/;
const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/;
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

function unique(values) {
  return [...new Set(values)].sort();
}

function sameSet(left, right) {
  return JSON.stringify(unique(left)) === JSON.stringify(unique(right));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function signatureRefState(value) {
  const signature = String(value ?? "").trim();
  if (!signature || PLACEHOLDER_PATTERN.test(signature)) return "missing_or_placeholder";
  if (signature.startsWith("docs/")) return existsSync(signature) ? "local_ref_resolves" : "local_ref_missing";
  if (EXTERNAL_SIGNATURE_REF_PATTERN.test(signature)) return "external_ref_declared";
  return "unclassified_ref";
}

function expectedReceiptSlotUpdate(entry) {
  return {
    decision_id: entry.decision_id,
    title: entry.title,
    coverage_domain: entry.coverage_domain,
    covered_target_count: entry.covered_target_count,
    required_owner_basis: entry.required_owner_basis,
    target_detail_state: entry.target_detail_state,
    target_ids: entry.target_ids ?? [],
    allowed_register_status_after_real_receipt: entry.allowed_register_status_after_real_receipt,
    receipt_status: "real_owner_evidence_received",
    owner: entry.owner,
    decision: entry.decision,
    basis: entry.basis,
    date_or_revisit_gate: entry.date_or_revisit_gate,
    approval_signature_ref: entry.approval_signature_ref,
    received_at: entry.received_at,
    recorded_by_human: entry.recorded_by_human,
    pending_slot_not_approval: false,
    copy_to_launch_decision_register_allowed: true
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Receipt Candidates Validation");
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
  lines.push("- This validation checks receipt-update candidates only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the owner approval receipt ledger.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Pending owner responses are excluded from candidates.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const candidates = readJson(CANDIDATES_JSON_PATH);
const candidatesMarkdown = readText(CANDIDATES_MD_PATH);
const responseIntake = readJson(RESPONSE_INTAKE_PATH);
const responseIntakeValidation = readJson(RESPONSE_INTAKE_VALIDATION_PATH);
const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (candidates.schema_version !== "law-firm-os.launch-owner-response-receipt-candidates.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner response receipt candidates schema version.", {
    actual: candidates.schema_version
  });
}

const expectedBoundary = {
  receipt_update_candidate_preview_only: true,
  go_live_approved_by_this_file: false,
  owner_deferrals_approved_by_this_file: false,
  receipt_ledger_modified_by_this_file: false,
  launch_decision_register_modified_by_this_file: false,
  pending_responses_excluded_from_candidates: true,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (candidates.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Owner response receipt candidates boundary field ${key} drifted.`, {
      expected,
      actual: candidates.boundary?.[key]
    });
  }
}

if (responseIntakeValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RESPONSE_INTAKE_VALIDATION_NOT_PASS", "Owner response intake validation must pass before receipt candidates can be trusted.", {
    actual: responseIntakeValidation.verdict
  });
}

if (receiptLedgerValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_LEDGER_VALIDATION_NOT_PASS", "Receipt ledger validation must pass before receipt candidates can be trusted.", {
    actual: receiptLedgerValidation.verdict
  });
}

const copyReadyResponses = (responseIntake.response_entries ?? [])
  .filter((entry) => entry.response_status === "real_owner_response_received" && entry.copy_to_receipt_ledger_allowed === true);
const copyReadyByDecisionId = new Map(copyReadyResponses.map((entry) => [entry.decision_id, entry]));
const expectedCandidateDecisionIds = copyReadyResponses.map((entry) => entry.decision_id);
const receiptUpdateCandidates = candidates.receipt_update_candidates ?? [];
const actualCandidateDecisionIds = receiptUpdateCandidates.map((candidate) => candidate.decision_id);

if (!sameSet(actualCandidateDecisionIds, expectedCandidateDecisionIds)) {
  addFinding(findings, "P1", "CANDIDATE_SET_MISMATCH", "Receipt-update candidates must match real copy-ready owner responses exactly.", {
    expected: expectedCandidateDecisionIds,
    actual: actualCandidateDecisionIds
  });
}

for (const candidate of receiptUpdateCandidates) {
  const entry = copyReadyByDecisionId.get(candidate.decision_id);
  if (!entry) {
    addFinding(findings, "P1", "CANDIDATE_WITHOUT_COPY_READY_RESPONSE", "Receipt-update candidate has no matching real copy-ready owner response.", {
      decision_id: candidate.decision_id
    });
    continue;
  }
  if (candidate.source_response_status !== entry.response_status || candidate.source_copy_allowed !== entry.copy_to_receipt_ledger_allowed) {
    addFinding(findings, "P1", "CANDIDATE_SOURCE_STATUS_MISMATCH", "Receipt-update candidate source status does not match owner response intake.", {
      decision_id: candidate.decision_id
    });
  }
  if (candidate.source_approval_signature_ref !== entry.approval_signature_ref) {
    addFinding(findings, "P1", "CANDIDATE_SIGNATURE_REF_SOURCE_MISMATCH", "Receipt-update candidate signature reference does not match owner response intake.", {
      decision_id: candidate.decision_id
    });
  }
  if (!sameSet(candidate.target_ids ?? [], entry.target_ids ?? [])) {
    addFinding(findings, "P1", "CANDIDATE_TARGET_IDS_MISMATCH", "Receipt-update candidate target IDs do not match owner response intake.", {
      decision_id: candidate.decision_id
    });
  }

  const row = candidate.receipt_slot_update ?? {};
  const missingFields = RECEIPT_SLOT_UPDATE_FIELDS.filter((field) => !(field in row));
  if (missingFields.length > 0) {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_UPDATE_MISSING_FIELDS", "Receipt-update candidate row is missing required fields.", {
      decision_id: candidate.decision_id,
      missing_fields: missingFields
    });
  }
  const expectedRow = expectedReceiptSlotUpdate(entry);
  if (!sameJson(row, expectedRow)) {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_UPDATE_MISMATCH", "Receipt-update candidate row does not match the owner response intake source.", {
      decision_id: candidate.decision_id
    });
  }
  const weakFields = ["owner", "decision", "basis", "date_or_revisit_gate", "approval_signature_ref", "received_at", "recorded_by_human"].filter((field) => {
    const value = String(row[field] ?? "").trim();
    return !value || PLACEHOLDER_PATTERN.test(value);
  });
  if (weakFields.length > 0) {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_UPDATE_WEAK_FIELDS", "Receipt-update candidate row has missing or placeholder owner evidence fields.", {
      decision_id: candidate.decision_id,
      weak_fields: weakFields
    });
  }
  const agentInferredFields = ["owner", "decision", "basis", "approval_signature_ref", "recorded_by_human"].filter((field) => AGENT_INFERENCE_PATTERN.test(String(row[field] ?? "")));
  if (agentInferredFields.length > 0) {
    addFinding(findings, "P0", "CANDIDATE_RECEIPT_UPDATE_AGENT_INFERRED", "Receipt-update candidate appears to rely on agent-inferred owner evidence.", {
      decision_id: candidate.decision_id,
      fields: agentInferredFields
    });
  }
  if (row.receipt_status !== "real_owner_evidence_received") {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_STATUS_INVALID", "Receipt-update candidate row has invalid receipt status.", {
      decision_id: candidate.decision_id,
      actual: row.receipt_status
    });
  }
  if (row.pending_slot_not_approval !== false || row.copy_to_launch_decision_register_allowed !== true) {
    addFinding(findings, "P1", "CANDIDATE_RECEIPT_COPY_STATE_INVALID", "Receipt-update candidate row is not ready for receipt-ledger copy state.", {
      decision_id: candidate.decision_id,
      pending_slot_not_approval: row.pending_slot_not_approval,
      copy_to_launch_decision_register_allowed: row.copy_to_launch_decision_register_allowed
    });
  }
  const currentSignatureRefState = signatureRefState(row.approval_signature_ref);
  if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
    addFinding(findings, "P1", "CANDIDATE_SIGNATURE_REF_INVALID", "Receipt-update candidate signature reference is missing, unresolved, or unclassified.", {
      decision_id: candidate.decision_id,
      signature_ref_state: currentSignatureRefState
    });
  }
  if (!DATE_OR_REVISIT_GATE_PATTERN.test(String(row.date_or_revisit_gate ?? ""))) {
    addFinding(findings, "P1", "CANDIDATE_DATE_OR_GATE_INVALID", "Receipt-update candidate date or revisit gate is invalid.", {
      decision_id: candidate.decision_id,
      actual: row.date_or_revisit_gate
    });
  }
  if (!RECEIVED_AT_PATTERN.test(String(row.received_at ?? ""))) {
    addFinding(findings, "P1", "CANDIDATE_RECEIVED_AT_INVALID", "Receipt-update candidate received_at value is invalid.", {
      decision_id: candidate.decision_id,
      actual: row.received_at
    });
  }
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!candidatesMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Receipt candidates markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-response-receipt-candidates.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    CANDIDATES_JSON_PATH,
    CANDIDATES_MD_PATH,
    RESPONSE_INTAKE_PATH,
    RESPONSE_INTAKE_VALIDATION_PATH,
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH
  ],
  verdict,
  summary: {
    receipt_update_candidate_count: receiptUpdateCandidates.length,
    expected_receipt_update_candidate_count: expectedCandidateDecisionIds.length,
    response_entry_count: responseIntake.summary.response_entry_count,
    real_owner_response_count: responseIntake.summary.real_owner_response_count,
    copy_allowed_response_count: responseIntake.summary.copy_allowed_count,
    target_count_by_candidates: unique(receiptUpdateCandidates.flatMap((candidate) => candidate.target_ids ?? [])).length,
    receipt_ledger_current_real_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    receipt_ledger_current_copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_receipt_update_candidates_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    receipt_ledger_modified_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    pending_responses_excluded_from_candidates: true,
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
  receipt_update_candidate_count: report.summary.receipt_update_candidate_count,
  expected_receipt_update_candidate_count: report.summary.expected_receipt_update_candidate_count,
  real_owner_response_count: report.summary.real_owner_response_count,
  copy_allowed_response_count: report.summary.copy_allowed_response_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
