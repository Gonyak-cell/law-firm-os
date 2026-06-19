#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RESPONSE_INTAKE_JSON_PATH = "docs/launch/launch-owner-response-intake.json";
const RESPONSE_INTAKE_MD_PATH = "docs/launch/launch-owner-response-intake.md";
const REQUEST_PACKET_PATH = "docs/launch/launch-owner-approval-request-packet.json";
const REQUEST_PACKET_VALIDATION_PATH = "docs/launch/launch-owner-approval-request-packet-validation.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-owner-response-intake-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-owner-response-intake-validation.md";

const REQUIRED_OWNER_RESPONSE_FIELDS = [
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human"
];
const REQUIRED_MARKDOWN_PHRASES = [
  "owner response intake template only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-owner-approval-receipt-ledger.json`",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Pending response entries do not count as owner evidence",
  "Existing response fields are preserved by decision ID during regeneration",
  "response intake is not itself a launch decision"
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

function signatureRefState(value) {
  const signature = String(value ?? "").trim();
  if (!signature || PLACEHOLDER_PATTERN.test(signature)) return "missing_or_placeholder";
  if (signature.startsWith("docs/")) return existsSync(signature) ? "local_ref_resolves" : "local_ref_missing";
  if (EXTERNAL_SIGNATURE_REF_PATTERN.test(signature)) return "external_ref_declared";
  return "unclassified_ref";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Response Intake Validation");
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
  lines.push("- This validation checks the owner response intake only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the owner approval receipt ledger.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Pending response entries do not count as owner evidence.");
  lines.push("- It requires response intake regeneration to preserve existing response fields by decision ID.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const intake = readJson(RESPONSE_INTAKE_JSON_PATH);
const intakeMarkdown = readText(RESPONSE_INTAKE_MD_PATH);
const requestPacket = readJson(REQUEST_PACKET_PATH);
const requestPacketValidation = readJson(REQUEST_PACKET_VALIDATION_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (intake.schema_version !== "law-firm-os.launch-owner-response-intake.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner response intake schema version.", {
    actual: intake.schema_version
  });
}

const expectedBoundary = {
  owner_response_intake_template_only: true,
  go_live_approved_by_this_file: false,
  owner_deferrals_approved_by_this_file: false,
  receipt_ledger_modified_by_this_file: false,
  launch_decision_register_modified_by_this_file: false,
  pending_responses_count_as_owner_evidence: false,
  regeneration_preserves_existing_response_fields: true,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (intake.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Owner response intake boundary field ${key} drifted.`, {
      expected,
      actual: intake.boundary?.[key]
    });
  }
}

if (requestPacketValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "REQUEST_PACKET_VALIDATION_NOT_PASS", "Request packet validation must pass before owner response intake can be trusted.", {
    actual: requestPacketValidation.verdict
  });
}

if (!sameSet(intake.required_owner_response_fields ?? [], REQUIRED_OWNER_RESPONSE_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_OWNER_RESPONSE_FIELDS_MISMATCH", "Owner response intake required fields drifted.", {
    expected: REQUIRED_OWNER_RESPONSE_FIELDS,
    actual: intake.required_owner_response_fields
  });
}

const cards = requestPacket.request_cards ?? [];
const cardByDecisionId = new Map(cards.map((card) => [card.decision_id, card]));
const entries = intake.response_entries ?? [];
const entryDecisionIds = entries.map((entry) => entry.decision_id);
const cardDecisionIds = cards.map((card) => card.decision_id);

if (!sameSet(entryDecisionIds, cardDecisionIds)) {
  addFinding(findings, "P1", "RESPONSE_ENTRY_DECISION_IDS_MISMATCH", "Owner response entries must match request packet cards exactly.", {
    expected: cardDecisionIds,
    actual: entryDecisionIds
  });
}

for (const entry of entries) {
  const card = cardByDecisionId.get(entry.decision_id);
  if (!card) continue;

  if (entry.coverage_domain !== card.coverage_domain) {
    addFinding(findings, "P1", "RESPONSE_ENTRY_DOMAIN_MISMATCH", "Owner response entry coverage domain does not match request card.", {
      decision_id: entry.decision_id,
      expected: card.coverage_domain,
      actual: entry.coverage_domain
    });
  }
  if (entry.covered_target_count !== card.covered_target_count) {
    addFinding(findings, "P1", "RESPONSE_ENTRY_TARGET_COUNT_MISMATCH", "Owner response entry target count does not match request card.", {
      decision_id: entry.decision_id,
      expected: card.covered_target_count,
      actual: entry.covered_target_count
    });
  }
  if (!sameSet(entry.target_ids ?? [], card.target_ids ?? [])) {
    addFinding(findings, "P1", "RESPONSE_ENTRY_TARGET_IDS_MISMATCH", "Owner response entry target IDs do not match request card.", {
      decision_id: entry.decision_id
    });
  }
  if (entry.allowed_register_status_after_real_receipt !== card.allowed_register_status_after_real_receipt) {
    addFinding(findings, "P1", "RESPONSE_ENTRY_REGISTER_STATUS_MISMATCH", "Owner response entry register status does not match request card.", {
      decision_id: entry.decision_id
    });
  }

  if (entry.response_status === "pending_owner_response") {
    const filledFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => String(entry[field] ?? "").trim());
    if (filledFields.length > 0) {
      addFinding(findings, "P1", "PENDING_RESPONSE_HAS_OWNER_FIELDS", "Pending owner response entry contains owner evidence fields.", {
        decision_id: entry.decision_id,
        filled_fields: filledFields
      });
    }
    if (entry.pending_response_not_approval !== true || entry.copy_to_receipt_ledger_allowed !== false) {
      addFinding(findings, "P0", "PENDING_RESPONSE_BOUNDARY_DRIFT", "Pending response entry can be mistaken for approval or receipt-copy permission.", {
        decision_id: entry.decision_id
      });
    }
  } else if (entry.response_status === "real_owner_response_received") {
    const weakFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => {
      const value = String(entry[field] ?? "").trim();
      return !value || PLACEHOLDER_PATTERN.test(value);
    });
    if (weakFields.length > 0) {
      addFinding(findings, "P1", "REAL_RESPONSE_WEAK_FIELDS", "Real owner response entry has missing or placeholder fields.", {
        decision_id: entry.decision_id,
        weak_fields: weakFields
      });
    }
    const agentInferredFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(entry[field] ?? "")));
    if (agentInferredFields.length > 0) {
      addFinding(findings, "P0", "REAL_RESPONSE_AGENT_INFERRED", "Real owner response entry appears to rely on agent-inferred approval evidence.", {
        decision_id: entry.decision_id,
        fields: agentInferredFields
      });
    }
    const currentSignatureRefState = signatureRefState(entry.approval_signature_ref);
    if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
      addFinding(findings, "P1", "REAL_RESPONSE_SIGNATURE_REF_INVALID", "Real owner response signature reference is missing, unresolved, or unclassified.", {
        decision_id: entry.decision_id,
        signature_ref_state: currentSignatureRefState
      });
    }
    if (!DATE_OR_REVISIT_GATE_PATTERN.test(String(entry.date_or_revisit_gate ?? ""))) {
      addFinding(findings, "P1", "REAL_RESPONSE_DATE_OR_GATE_INVALID", "Real owner response date or revisit gate is invalid.", {
        decision_id: entry.decision_id,
        actual: entry.date_or_revisit_gate
      });
    }
    if (!RECEIVED_AT_PATTERN.test(String(entry.received_at ?? ""))) {
      addFinding(findings, "P1", "REAL_RESPONSE_RECEIVED_AT_INVALID", "Real owner response received_at value is invalid.", {
        decision_id: entry.decision_id,
        actual: entry.received_at
      });
    }
    if (entry.pending_response_not_approval !== false || entry.copy_to_receipt_ledger_allowed !== true) {
      addFinding(findings, "P1", "REAL_RESPONSE_NOT_COPY_READY", "Real owner response must explicitly switch to receipt-copy-ready state after validation-quality evidence is recorded.", {
        decision_id: entry.decision_id,
        pending_response_not_approval: entry.pending_response_not_approval,
        copy_to_receipt_ledger_allowed: entry.copy_to_receipt_ledger_allowed
      });
    }
  } else {
    addFinding(findings, "P1", "RESPONSE_STATUS_INVALID", "Owner response entry status is not allowed.", {
      decision_id: entry.decision_id,
      actual: entry.response_status
    });
  }
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!intakeMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Owner response intake markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const pendingResponseCount = entries.filter((entry) => entry.response_status === "pending_owner_response").length;
const realOwnerResponseCount = entries.filter((entry) => entry.response_status === "real_owner_response_received").length;
const copyAllowedCount = entries.filter((entry) => entry.copy_to_receipt_ledger_allowed === true).length;
const targetCountByRealResponses = unique(
  entries
    .filter((entry) => entry.response_status === "real_owner_response_received")
    .flatMap((entry) => entry.target_ids ?? [])
).length;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-response-intake.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RESPONSE_INTAKE_JSON_PATH,
    RESPONSE_INTAKE_MD_PATH,
    REQUEST_PACKET_PATH,
    REQUEST_PACKET_VALIDATION_PATH
  ],
  verdict,
  summary: {
    response_entry_count: entries.length,
    request_card_count: cards.length,
    pending_response_count: pendingResponseCount,
    real_owner_response_count: realOwnerResponseCount,
    copy_allowed_count: copyAllowedCount,
    target_count_if_all_responses_received: unique(entries.flatMap((entry) => entry.target_ids ?? [])).length,
    target_count_by_real_responses: targetCountByRealResponses,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_owner_response_intake_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    receipt_ledger_modified_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    pending_responses_count_as_owner_evidence: false,
    response_regeneration_preservation_required_by_validation: true,
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
  response_entry_count: report.summary.response_entry_count,
  pending_response_count: report.summary.pending_response_count,
  real_owner_response_count: report.summary.real_owner_response_count,
  copy_allowed_count: report.summary.copy_allowed_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
