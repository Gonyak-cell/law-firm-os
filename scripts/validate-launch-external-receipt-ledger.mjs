#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LEDGER_JSON_PATH = "docs/launch/launch-external-receipt-ledger.json";
const LEDGER_MD_PATH = "docs/launch/launch-external-receipt-ledger.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-external-receipt-ledger-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-external-receipt-ledger-validation.md";

const EXPECTED_QUEUE_IDS = [
  "LCX7-RI-05",
  "LCX7-RI-06",
  "LCX7-RI-07",
  "LCX7-RI-08",
  "LCX7-RI-09",
  "LCX7-RI-10",
  "LCX7-RI-11",
  "LCX7-RI-12"
];
const REQUIRED_RECEIPT_FIELDS = [
  "owner",
  "decision",
  "basis",
  "date_or_revisit_gate",
  "approval_signature_ref",
  "received_at",
  "recorded_by_human"
];
const REQUIRED_MARKDOWN_PHRASES = [
  "does not approve go-live",
  "does not approve production cutover",
  "does not close LT terminal packets",
  "Pending external receipts do not count as owner evidence",
  "`actual_launch_go_live_claim` remains false",
  "LCX7-RI-05 receipt is not production cutover approval"
];
const PLACEHOLDER_PATTERN = /<[^>]*>|REQUIRED|TBD|TODO|placeholder|pending owner|pending approval|\[[^\]]*\]/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const DATE_OR_REVISIT_GATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$|^REVISIT-[A-Z0-9][A-Z0-9-]*$|^GATE-[A-Z0-9][A-Z0-9-]*$/;
const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
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
  lines.push("# Launch External Receipt Ledger Validation");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
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
  lines.push("- This validation checks the external receipt ledger only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve production cutover.");
  lines.push("- It does not close LT terminal packets.");
  lines.push("- Pending external receipts do not count as owner evidence.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_JSON_PATH);
const ledgerMarkdown = readText(LEDGER_MD_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (ledger.schema_version !== "law-firm-os.launch-external-receipt-ledger.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected external receipt ledger schema version.", {
    actual: ledger.schema_version
  });
}

const expectedBoundary = {
  external_receipt_ledger_only: true,
  go_live_approved_by_this_ledger: false,
  production_cutover_approved_by_this_ledger: false,
  lt_terminal_closeout_approved_by_this_ledger: false,
  launch_decision_register_modified_by_this_ledger: false,
  pending_external_receipts_count_as_owner_evidence: false,
  actual_launch_go_live_claim: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (ledger.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `External receipt ledger boundary field ${key} drifted.`, {
      expected,
      actual: ledger.boundary?.[key]
    });
  }
}

if (!sameSet(ledger.required_receipt_fields ?? [], REQUIRED_RECEIPT_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_RECEIPT_FIELDS_MISMATCH", "External receipt ledger required fields drifted.", {
    expected: REQUIRED_RECEIPT_FIELDS,
    actual: ledger.required_receipt_fields
  });
}

const lanes = ledger.receipt_lanes ?? [];
const queueIds = lanes.map((lane) => lane.queue_id);
if (!sameSet(queueIds, EXPECTED_QUEUE_IDS)) {
  addFinding(findings, "P1", "QUEUE_IDS_MISMATCH", "External receipt ledger lanes do not match the LCX7-RI-05 through LCX7-RI-12 queue.", {
    expected: EXPECTED_QUEUE_IDS,
    actual: queueIds
  });
}

const realLanes = lanes.filter((lane) => lane.receipt_status === "real_external_receipt_received");
const pendingLanes = lanes.filter((lane) => lane.receipt_status === "pending_external_receipt");
const approvedLanes = realLanes.filter((lane) => lane.decision === "approved");
const deferredLanes = realLanes.filter((lane) => lane.decision === "deferred(시한 명기)");

for (const lane of lanes) {
  if (!EXPECTED_QUEUE_IDS.includes(lane.queue_id)) continue;
  if (!["pending_external_receipt", "real_external_receipt_received"].includes(lane.receipt_status)) {
    addFinding(findings, "P1", "RECEIPT_STATUS_INVALID", "External receipt lane has an unsupported status.", {
      queue_id: lane.queue_id,
      actual: lane.receipt_status
    });
  }
  if (lane.receipt_status === "pending_external_receipt") {
    const filledFields = REQUIRED_RECEIPT_FIELDS.filter((field) => String(lane[field] ?? "").trim());
    if (filledFields.length > 0) {
      addFinding(findings, "P1", "PENDING_LANE_HAS_RECEIPT_FIELDS", "Pending external receipt lane contains owner evidence fields.", {
        queue_id: lane.queue_id,
        filled_fields: filledFields
      });
    }
  }
  if (lane.receipt_status === "real_external_receipt_received") {
    const weakFields = REQUIRED_RECEIPT_FIELDS.filter((field) => {
      const value = String(lane[field] ?? "").trim();
      return !value || PLACEHOLDER_PATTERN.test(value);
    });
    if (weakFields.length > 0) {
      addFinding(findings, "P1", "REAL_RECEIPT_WEAK_FIELDS", "Real external receipt lane has missing or placeholder fields.", {
        queue_id: lane.queue_id,
        weak_fields: weakFields
      });
    }
    const agentInferredFields = REQUIRED_RECEIPT_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(lane[field] ?? "")));
    if (agentInferredFields.length > 0) {
      addFinding(findings, "P0", "REAL_RECEIPT_AGENT_INFERRED", "Real external receipt lane appears to rely on agent-inferred approval evidence.", {
        queue_id: lane.queue_id,
        fields: agentInferredFields
      });
    }
    if (!["approved", "deferred(시한 명기)"].includes(lane.decision)) {
      addFinding(findings, "P1", "REAL_RECEIPT_DECISION_INVALID", "Real external receipt lane has an unsupported decision.", {
        queue_id: lane.queue_id,
        actual: lane.decision
      });
    }
    const currentSignatureRefState = signatureRefState(lane.approval_signature_ref);
    if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
      addFinding(findings, "P1", "REAL_RECEIPT_SIGNATURE_REF_INVALID", "Real external receipt signature reference is missing, unresolved, or unclassified.", {
        queue_id: lane.queue_id,
        signature_ref_state: currentSignatureRefState
      });
    }
    if (!DATE_OR_REVISIT_GATE_PATTERN.test(String(lane.date_or_revisit_gate ?? ""))) {
      addFinding(findings, "P1", "REAL_RECEIPT_DATE_OR_GATE_INVALID", "Real external receipt date or revisit gate is invalid.", {
        queue_id: lane.queue_id,
        actual: lane.date_or_revisit_gate
      });
    }
    if (!RECEIVED_AT_PATTERN.test(String(lane.received_at ?? ""))) {
      addFinding(findings, "P1", "REAL_RECEIPT_RECEIVED_AT_INVALID", "Real external receipt received_at value must be UTC Zulu time.", {
        queue_id: lane.queue_id,
        actual: lane.received_at
      });
    }
    if (
      lane.receipt_counts_as_go_live_approval !== false ||
      lane.receipt_counts_as_production_cutover_approval !== false ||
      lane.receipt_counts_as_lt_terminal_closeout !== false ||
      lane.launch_decision_register_copy_allowed !== false
    ) {
      addFinding(findings, "P0", "REAL_RECEIPT_BOUNDARY_DRIFT", "Real external receipt lane crosses a launch boundary.", {
        queue_id: lane.queue_id
      });
    }
  }
}

const ri05 = lanes.find((lane) => lane.queue_id === "LCX7-RI-05");
if (!ri05 || ri05.receipt_status !== "real_external_receipt_received" || ri05.decision !== "approved") {
  addFinding(findings, "P1", "RI05_NOT_RECORDED", "LCX7-RI-05 production persistence receipt must be recorded as an approved real external receipt.", {
    actual_status: ri05?.receipt_status,
    actual_decision: ri05?.decision
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!ledgerMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "External receipt ledger markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const remainingQueueIds = pendingLanes.map((lane) => lane.queue_id);
const expectedSummary = {
  external_receipt_lane_count: lanes.length,
  real_external_receipt_count: realLanes.length,
  approved_external_receipt_count: approvedLanes.length,
  deferred_external_receipt_count: deferredLanes.length,
  pending_external_receipt_count: pendingLanes.length
};

for (const [key, expected] of Object.entries(expectedSummary)) {
  if (ledger.summary?.[key] !== expected) {
    addFinding(findings, "P1", `SUMMARY_${key}`, `External receipt ledger summary field ${key} drifted.`, {
      expected,
      actual: ledger.summary?.[key]
    });
  }
}

if (!sameSet(ledger.summary?.remaining_queue_ids ?? [], remainingQueueIds)) {
  addFinding(findings, "P1", "SUMMARY_REMAINING_QUEUE_IDS", "External receipt ledger remaining queue IDs drifted.", {
    expected: remainingQueueIds,
    actual: ledger.summary?.remaining_queue_ids
  });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-external-receipt-ledger.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LEDGER_JSON_PATH,
    LEDGER_MD_PATH
  ],
  verdict,
  summary: {
    external_receipt_lane_count: lanes.length,
    real_external_receipt_count: realLanes.length,
    approved_external_receipt_count: approvedLanes.length,
    deferred_external_receipt_count: deferredLanes.length,
    pending_external_receipt_count: pendingLanes.length,
    remaining_queue_ids: remainingQueueIds,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_external_receipt_ledger_only: true,
    go_live_approved_by_validation: false,
    production_cutover_approved_by_validation: false,
    lt_terminal_closeout_approved_by_validation: false,
    pending_external_receipts_count_as_owner_evidence: false
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
  external_receipt_lane_count: report.summary.external_receipt_lane_count,
  real_external_receipt_count: report.summary.real_external_receipt_count,
  pending_external_receipt_count: report.summary.pending_external_receipt_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
