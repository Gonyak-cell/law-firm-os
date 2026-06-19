#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const REQUEST_PACKET_JSON_PATH = "docs/launch/launch-owner-approval-request-packet.json";
const REQUEST_PACKET_MD_PATH = "docs/launch/launch-owner-approval-request-packet.md";
const RECEIPT_LEDGER_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_VALIDATION_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-owner-approval-request-packet-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-owner-approval-request-packet-validation.md";

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
  "owner approval request packet only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Pending request cards do not count as owner evidence",
  "request packet is not itself a launch decision"
];

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

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Approval Request Packet Validation");
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
  lines.push("- This validation checks the owner approval request packet only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Pending request cards do not count as owner evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const packet = readJson(REQUEST_PACKET_JSON_PATH);
const packetMarkdown = readText(REQUEST_PACKET_MD_PATH);
const receiptLedger = readJson(RECEIPT_LEDGER_PATH);
const receiptLedgerValidation = readJson(RECEIPT_LEDGER_VALIDATION_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (packet.schema_version !== "law-firm-os.launch-owner-approval-request-packet.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner approval request packet schema version.", {
    actual: packet.schema_version
  });
}

const expectedBoundary = {
  owner_approval_request_packet_only: true,
  go_live_approved_by_this_packet: false,
  owner_deferrals_approved_by_this_packet: false,
  launch_decision_register_modified_by_this_packet: false,
  pending_requests_count_as_owner_evidence: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (packet.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Owner approval request packet boundary field ${key} drifted.`, {
      expected,
      actual: packet.boundary?.[key]
    });
  }
}

if (receiptLedgerValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "RECEIPT_LEDGER_VALIDATION_NOT_PASS", "Receipt ledger validation must pass before owner request packet can be trusted.", {
    actual: receiptLedgerValidation.verdict
  });
}

if (!sameSet(packet.required_owner_response_fields ?? [], REQUIRED_OWNER_RESPONSE_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_OWNER_RESPONSE_FIELDS_MISMATCH", "Owner response fields drifted.", {
    expected: REQUIRED_OWNER_RESPONSE_FIELDS,
    actual: packet.required_owner_response_fields
  });
}

const pendingSlots = (receiptLedger.receipt_slots ?? []).filter((slot) => slot.receipt_status === "pending_owner_evidence");
const pendingByDecisionId = new Map(pendingSlots.map((slot) => [slot.decision_id, slot]));
const requestCards = packet.request_cards ?? [];
const requestDecisionIds = requestCards.map((card) => card.decision_id);
const pendingDecisionIds = pendingSlots.map((slot) => slot.decision_id);

if (!sameSet(requestDecisionIds, pendingDecisionIds)) {
  addFinding(findings, "P1", "REQUEST_CARDS_PENDING_SLOT_MISMATCH", "Request cards must match pending receipt slots exactly.", {
    expected: pendingDecisionIds,
    actual: requestDecisionIds
  });
}

for (const card of requestCards) {
  const slot = pendingByDecisionId.get(card.decision_id);
  if (!slot) continue;

  if (card.coverage_domain !== slot.coverage_domain) {
    addFinding(findings, "P1", "REQUEST_CARD_DOMAIN_MISMATCH", "Request card coverage domain does not match receipt slot.", {
      decision_id: card.decision_id,
      expected: slot.coverage_domain,
      actual: card.coverage_domain
    });
  }
  if (card.covered_target_count !== slot.covered_target_count) {
    addFinding(findings, "P1", "REQUEST_CARD_TARGET_COUNT_MISMATCH", "Request card target count does not match receipt slot.", {
      decision_id: card.decision_id,
      expected: slot.covered_target_count,
      actual: card.covered_target_count
    });
  }
  if (!sameSet(card.target_ids ?? [], slot.target_ids ?? [])) {
    addFinding(findings, "P1", "REQUEST_CARD_TARGET_IDS_MISMATCH", "Request card target IDs do not match receipt slot.", {
      decision_id: card.decision_id
    });
  }
  if (card.request_status !== "pending_owner_response" || card.owner_action_required !== true) {
    addFinding(findings, "P1", "REQUEST_CARD_STATUS_INVALID", "Request card must remain pending owner response.", {
      decision_id: card.decision_id,
      request_status: card.request_status,
      owner_action_required: card.owner_action_required
    });
  }
  if (card.pending_request_not_approval !== true || card.copy_to_launch_decision_register_allowed !== false) {
    addFinding(findings, "P0", "REQUEST_CARD_APPROVAL_BOUNDARY_DRIFT", "Request card can be mistaken for approval or copy permission.", {
      decision_id: card.decision_id
    });
  }
  if (card.allowed_register_status_after_real_receipt !== slot.allowed_register_status_after_real_receipt) {
    addFinding(findings, "P1", "REQUEST_CARD_REGISTER_STATUS_MISMATCH", "Request card register status does not match receipt slot.", {
      decision_id: card.decision_id
    });
  }

  const template = card.owner_response_template ?? {};
  if (!sameSet(Object.keys(template), REQUIRED_OWNER_RESPONSE_FIELDS)) {
    addFinding(findings, "P1", "REQUEST_CARD_RESPONSE_TEMPLATE_FIELDS_MISMATCH", "Request card response template fields drifted.", {
      decision_id: card.decision_id,
      actual: Object.keys(template)
    });
  }
  const filledFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => String(template[field] ?? "").trim());
  if (filledFields.length > 0) {
    addFinding(findings, "P0", "REQUEST_CARD_RESPONSE_TEMPLATE_FILLED", "Request packet contains filled owner evidence fields.", {
      decision_id: card.decision_id,
      filled_fields: filledFields
    });
  }
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!packetMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Owner approval request packet markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const targetCountByRequests = unique(requestCards.flatMap((card) => card.target_ids ?? [])).length;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-approval-request-packet.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    REQUEST_PACKET_JSON_PATH,
    REQUEST_PACKET_MD_PATH,
    RECEIPT_LEDGER_PATH,
    RECEIPT_LEDGER_VALIDATION_PATH
  ],
  verdict,
  summary: {
    request_card_count: requestCards.length,
    pending_receipt_slot_count: pendingSlots.length,
    real_owner_receipt_count: receiptLedger.summary.real_owner_receipt_count,
    copy_allowed_count: receiptLedger.summary.copy_allowed_count,
    target_count_by_pending_requests: targetCountByRequests,
    response_field_count: REQUIRED_OWNER_RESPONSE_FIELDS.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_owner_approval_request_packet_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    pending_requests_count_as_owner_evidence: false,
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
  request_card_count: report.summary.request_card_count,
  pending_receipt_slot_count: report.summary.pending_receipt_slot_count,
  target_count_by_pending_requests: report.summary.target_count_by_pending_requests,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
