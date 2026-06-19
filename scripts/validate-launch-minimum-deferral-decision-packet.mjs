#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  coverageDomainForDecisionId,
  summarizeLaunchDecisionRegister
} from "./lib/launch-decision-register.mjs";

const COVERAGE_OPTIONS_VALIDATION_PATH = "docs/launch/launch-deferral-coverage-options-validation.json";
const MINIMUM_PACKET_JSON_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const MINIMUM_PACKET_MD_PATH = "docs/launch/launch-minimum-deferral-decision-packet.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-minimum-deferral-decision-packet-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-minimum-deferral-decision-packet-validation.md";

const REQUIRED_PLACEHOLDERS = [
  "owner_required_placeholder",
  "decision_required_placeholder",
  "basis_required_placeholder",
  "date_or_revisit_gate_required_placeholder",
  "approval_signature_required_placeholder"
];

const REQUIRED_MARKDOWN_PHRASES = [
  "placeholder-only decision packet",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "Full Claude review remains waived"
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

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Minimum Deferral Decision Packet Validation");
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
  lines.push("- This validation checks a placeholder-only decision packet.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It confirms the launch decision register remains unmodified by the packet.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const coverageOptionsValidation = readJson(COVERAGE_OPTIONS_VALIDATION_PATH);
const packet = readJson(MINIMUM_PACKET_JSON_PATH);
const packetMarkdown = readText(MINIMUM_PACKET_MD_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];

if (coverageOptionsValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "COVERAGE_OPTIONS_VALIDATION_NOT_PASS", "Coverage options validation must pass before the minimum decision packet is valid.", {
    actual: coverageOptionsValidation.verdict
  });
}

if (packet.schema_version !== "law-firm-os.launch-minimum-deferral-decision-packet.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected minimum deferral decision packet schema version.", {
    actual: packet.schema_version
  });
}

const expectedBoundary = {
  placeholder_only: true,
  go_live_approved_by_this_packet: false,
  owner_deferrals_approved_by_this_packet: false,
  launch_decision_register_modified_by_this_packet: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (packet.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Minimum decision packet boundary field ${key} drifted.`, {
      expected,
      actual: packet.boundary?.[key]
    });
  }
}

const rows = packet.placeholder_decision_rows ?? [];
const coveredTargetIds = unique(rows.flatMap((row) => row.covered_target_ids ?? []));

if (rows.length !== coverageOptionsValidation.summary.minimum_bundle_decision_id_count) {
  addFinding(findings, "P1", "MINIMUM_PACKET_ROW_COUNT_MISMATCH", "Minimum decision packet row count does not match the coverage-options minimum bundle.", {
    expected: coverageOptionsValidation.summary.minimum_bundle_decision_id_count,
    actual: rows.length
  });
}

if (coveredTargetIds.length !== coverageOptionsValidation.summary.minimum_bundle_covered_target_count) {
  addFinding(findings, "P1", "MINIMUM_PACKET_COVERED_TARGET_COUNT_MISMATCH", "Minimum decision packet covered target count does not match coverage-options validation.", {
    expected: coverageOptionsValidation.summary.minimum_bundle_covered_target_count,
    actual: coveredTargetIds.length
  });
}

if (packet.summary?.uncovered_target_count_if_owner_rows_are_completed !== 0) {
  addFinding(findings, "P1", "MINIMUM_PACKET_UNCOVERED_TARGETS", "Minimum decision packet records uncovered targets after completed owner rows.", {
    uncovered_count: packet.summary?.uncovered_target_count_if_owner_rows_are_completed
  });
}

for (const row of rows) {
  const expectedDomain = coverageDomainForDecisionId(row.decision_id);
  if (!expectedDomain) {
    addFinding(findings, "P1", "PACKET_DECISION_ID_NOT_COVERAGE_ELIGIBLE", "Minimum packet decision ID is not coverage-eligible.", {
      decision_id: row.decision_id
    });
  }
  if (row.coverage_domain !== expectedDomain) {
    addFinding(findings, "P1", "PACKET_DECISION_ID_DOMAIN_MISMATCH", "Minimum packet row domain does not match the decision ID contract.", {
      decision_id: row.decision_id,
      expected: expectedDomain,
      actual: row.coverage_domain
    });
  }
  if (row.status_to_use_after_approval !== "deferred(시한 명기)") {
    addFinding(findings, "P1", "PACKET_STATUS_AFTER_APPROVAL_INVALID", "Minimum packet row does not use the required deferred status after real owner approval.", {
      decision_id: row.decision_id,
      actual: row.status_to_use_after_approval
    });
  }
  if (row.template_only_not_approved !== true || row.owner_input_required !== true || row.real_owner_row_required !== true) {
    addFinding(findings, "P0", "PACKET_ROW_NOT_MARKED_PLACEHOLDER_ONLY", "Minimum packet row is not explicitly marked placeholder-only and owner-input-required.", {
      decision_id: row.decision_id
    });
  }
  const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter((field) => !String(row[field] ?? "").includes("REQUIRED"));
  if (missingPlaceholders.length > 0) {
    addFinding(findings, "P1", "PACKET_PLACEHOLDER_MISSING", "Minimum packet row has non-placeholder owner approval fields.", {
      decision_id: row.decision_id,
      missing_placeholders: missingPlaceholders
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0 || decisionSummary.valid_decided_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_MODIFIED_BY_MINIMUM_PACKET", "Launch decision register contains decision rows while the minimum packet is placeholder-only.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    valid_decided_rows: decisionSummary.valid_decided_rows
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!packetMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Minimum decision packet markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-minimum-deferral-decision-packet.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MINIMUM_PACKET_JSON_PATH,
    MINIMUM_PACKET_MD_PATH,
    COVERAGE_OPTIONS_VALIDATION_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    placeholder_decision_row_count: rows.length,
    minimum_bundle_decision_id_count: coverageOptionsValidation.summary.minimum_bundle_decision_id_count,
    covered_target_count_if_owner_rows_are_completed: coveredTargetIds.length,
    minimum_bundle_covered_target_count: coverageOptionsValidation.summary.minimum_bundle_covered_target_count,
    uncovered_target_count_if_owner_rows_are_completed: packet.summary?.uncovered_target_count_if_owner_rows_are_completed ?? null,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    placeholder_row_count: rows.filter((row) => row.template_only_not_approved === true).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_placeholder_packet_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
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
  placeholder_decision_row_count: report.summary.placeholder_decision_row_count,
  covered_target_count_if_owner_rows_are_completed: report.summary.covered_target_count_if_owner_rows_are_completed,
  uncovered_target_count_if_owner_rows_are_completed: report.summary.uncovered_target_count_if_owner_rows_are_completed,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
