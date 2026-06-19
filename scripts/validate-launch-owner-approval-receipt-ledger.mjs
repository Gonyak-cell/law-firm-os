#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const RECEIPT_LEDGER_JSON_PATH = "docs/launch/launch-owner-approval-receipt-ledger.json";
const RECEIPT_LEDGER_MD_PATH = "docs/launch/launch-owner-approval-receipt-ledger.md";
const OWNER_RUNBOOK_PATH = "docs/launch/launch-owner-decision-intake-runbook.json";
const TARGET_ANNEX_PATH = "docs/launch/launch-minimum-deferral-target-annex.json";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-owner-approval-receipt-ledger-validation.md";

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
  "receipt intake template only",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Pending receipt slots do not count as owner evidence",
  "Existing receipt fields are preserved by decision ID during regeneration"
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
  lines.push("# Launch Owner Approval Receipt Ledger Validation");
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
  lines.push("- This validation checks the owner approval receipt ledger only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- It requires receipt ledger regeneration to preserve existing receipt fields by decision ID.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(RECEIPT_LEDGER_JSON_PATH);
const ledgerMarkdown = readText(RECEIPT_LEDGER_MD_PATH);
const ownerRunbook = readJson(OWNER_RUNBOOK_PATH);
const targetAnnex = readJson(TARGET_ANNEX_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (ledger.schema_version !== "law-firm-os.launch-owner-approval-receipt-ledger.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner approval receipt ledger schema version.", {
    actual: ledger.schema_version
  });
}

const expectedBoundary = {
  receipt_intake_template_only: true,
  go_live_approved_by_this_ledger: false,
  owner_deferrals_approved_by_this_ledger: false,
  launch_decision_register_modified_by_this_ledger: false,
  pending_slots_count_as_owner_evidence: false,
  regeneration_preserves_existing_receipt_fields: true,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (ledger.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Owner approval receipt ledger boundary field ${key} drifted.`, {
      expected,
      actual: ledger.boundary?.[key]
    });
  }
}

if (!sameSet(ledger.required_receipt_fields ?? [], REQUIRED_RECEIPT_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_RECEIPT_FIELDS_MISMATCH", "Receipt ledger required fields drifted.", {
    expected: REQUIRED_RECEIPT_FIELDS,
    actual: ledger.required_receipt_fields
  });
}

const runbookRows = ownerRunbook.minimum_owner_rows ?? [];
const annexRows = targetAnnex.minimum_decision_rows ?? [];
const slots = ledger.receipt_slots ?? [];
const slotDecisionIds = slots.map((slot) => slot.decision_id);
const expectedDecisionIds = runbookRows.map((row) => row.decision_id);
const runbookByDecisionId = new Map(runbookRows.map((row) => [row.decision_id, row]));
const annexByDecisionId = new Map(annexRows.map((row) => [row.decision_id, row]));

if (!sameSet(slotDecisionIds, expectedDecisionIds)) {
  addFinding(findings, "P1", "RECEIPT_SLOT_DECISION_IDS_MISMATCH", "Receipt ledger slots do not match owner runbook minimum rows.", {
    expected: expectedDecisionIds,
    actual: slotDecisionIds
  });
}

for (const slot of slots) {
  const runbookRow = runbookByDecisionId.get(slot.decision_id);
  const annexRow = annexByDecisionId.get(slot.decision_id);
  if (!runbookRow || !annexRow) continue;

  if (slot.coverage_domain !== runbookRow.coverage_domain) {
    addFinding(findings, "P1", "RECEIPT_SLOT_DOMAIN_MISMATCH", "Receipt slot coverage domain does not match owner runbook.", {
      decision_id: slot.decision_id,
      expected: runbookRow.coverage_domain,
      actual: slot.coverage_domain
    });
  }
  if (slot.covered_target_count !== runbookRow.covered_target_count) {
    addFinding(findings, "P1", "RECEIPT_SLOT_TARGET_COUNT_MISMATCH", "Receipt slot target count does not match owner runbook.", {
      decision_id: slot.decision_id,
      expected: runbookRow.covered_target_count,
      actual: slot.covered_target_count
    });
  }
  if (!sameSet(slot.target_ids ?? [], annexRow.target_ids ?? [])) {
    addFinding(findings, "P1", "RECEIPT_SLOT_TARGET_IDS_MISMATCH", "Receipt slot target IDs do not match the target annex.", {
      decision_id: slot.decision_id
    });
  }
  if (slot.allowed_register_status_after_real_receipt !== "deferred(시한 명기)") {
    addFinding(findings, "P1", "RECEIPT_SLOT_REGISTER_STATUS_INVALID", "Receipt slot has invalid register status after real receipt.", {
      decision_id: slot.decision_id,
      actual: slot.allowed_register_status_after_real_receipt
    });
  }

  if (slot.receipt_status === "pending_owner_evidence") {
    const filledFields = REQUIRED_RECEIPT_FIELDS.filter((field) => String(slot[field] ?? "").trim());
    if (filledFields.length > 0) {
      addFinding(findings, "P1", "PENDING_SLOT_HAS_RECEIPT_FIELDS", "Pending receipt slot contains owner evidence fields.", {
        decision_id: slot.decision_id,
        filled_fields: filledFields
      });
    }
    if (slot.pending_slot_not_approval !== true || slot.copy_to_launch_decision_register_allowed !== false) {
      addFinding(findings, "P0", "PENDING_SLOT_BOUNDARY_DRIFT", "Pending receipt slot can be mistaken for approval.", {
        decision_id: slot.decision_id
      });
    }
  } else if (slot.receipt_status === "real_owner_evidence_received") {
    const weakFields = REQUIRED_RECEIPT_FIELDS.filter((field) => {
      const value = String(slot[field] ?? "").trim();
      return !value || PLACEHOLDER_PATTERN.test(value);
    });
    if (weakFields.length > 0) {
      addFinding(findings, "P1", "REAL_RECEIPT_WEAK_FIELDS", "Real owner receipt slot has missing or placeholder fields.", {
        decision_id: slot.decision_id,
        weak_fields: weakFields
      });
    }
    const agentInferredFields = REQUIRED_RECEIPT_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(slot[field] ?? "")));
    if (agentInferredFields.length > 0) {
      addFinding(findings, "P0", "REAL_RECEIPT_AGENT_INFERRED", "Real owner receipt slot appears to rely on agent-inferred approval evidence.", {
        decision_id: slot.decision_id,
        fields: agentInferredFields
      });
    }
    const currentSignatureRefState = signatureRefState(slot.approval_signature_ref);
    if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
      addFinding(findings, "P1", "REAL_RECEIPT_SIGNATURE_REF_INVALID", "Real owner receipt signature reference is missing, unresolved, or unclassified.", {
        decision_id: slot.decision_id,
        signature_ref_state: currentSignatureRefState
      });
    }
    if (!DATE_OR_REVISIT_GATE_PATTERN.test(String(slot.date_or_revisit_gate ?? ""))) {
      addFinding(findings, "P1", "REAL_RECEIPT_DATE_OR_GATE_INVALID", "Real owner receipt date or revisit gate is invalid.", {
        decision_id: slot.decision_id,
        actual: slot.date_or_revisit_gate
      });
    }
    if (!RECEIVED_AT_PATTERN.test(String(slot.received_at ?? ""))) {
      addFinding(findings, "P1", "REAL_RECEIPT_RECEIVED_AT_INVALID", "Real owner receipt received_at value is invalid.", {
        decision_id: slot.decision_id,
        actual: slot.received_at
      });
    }
  } else {
    addFinding(findings, "P1", "RECEIPT_STATUS_INVALID", "Receipt slot status is not allowed.", {
      decision_id: slot.decision_id,
      actual: slot.receipt_status
    });
  }
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!ledgerMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Receipt ledger markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_ROWS_PRESENT_WHILE_RECEIPTS_PENDING", "Launch decision register contains decision rows while receipt ledger slots are pending.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows
  });
}

const realReceiptCount = slots.filter((slot) => slot.receipt_status === "real_owner_evidence_received").length;
const pendingReceiptCount = slots.filter((slot) => slot.receipt_status === "pending_owner_evidence").length;
const copyAllowedCount = slots.filter((slot) => slot.copy_to_launch_decision_register_allowed === true).length;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-owner-approval-receipt-ledger.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    RECEIPT_LEDGER_JSON_PATH,
    RECEIPT_LEDGER_MD_PATH,
    OWNER_RUNBOOK_PATH,
    TARGET_ANNEX_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    receipt_slot_count: slots.length,
    pending_receipt_slot_count: pendingReceiptCount,
    real_owner_receipt_count: realReceiptCount,
    copy_allowed_count: copyAllowedCount,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    target_count_if_all_receipts_are_completed: ledger.summary?.target_count_if_all_receipts_are_completed ?? null,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_receipt_ledger_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    pending_slots_count_as_owner_evidence: false,
    receipt_regeneration_preservation_required_by_validation: true,
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
  receipt_slot_count: report.summary.receipt_slot_count,
  pending_receipt_slot_count: report.summary.pending_receipt_slot_count,
  real_owner_receipt_count: report.summary.real_owner_receipt_count,
  copy_allowed_count: report.summary.copy_allowed_count,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
