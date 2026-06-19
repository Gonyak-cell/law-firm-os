#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const PACKAGE_JSON_PATH = "docs/launch/owner-action-deferral-request.json";
const PACKAGE_MD_PATH = "docs/launch/owner-action-deferral-request.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/owner-action-deferral-request-validation.json";
const VALIDATION_MD_PATH = "docs/launch/owner-action-deferral-request-validation.md";
const REQUIRED_ACCEPTED_DECISION_ID_PATTERN_TOKENS = [
  "ACC-GL-<gate>-<evidence>",
  "COVERAGE-GATE-<gate>",
  "COVERAGE-ALL-GO-LIVE",
  "ACC-L9-C##",
  "COVERAGE-L9-STABILIZATION",
  "WP-<wp_id>",
  "COVERAGE-PHASE-<phase>",
  "COVERAGE-ALL-BLOCKED-WP",
  "PHASE-<phase>",
  "PHASE-<exit_gate>",
  "COVERAGE-ALL-PHASE-EXITS"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function statusText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function gateEvidenceLookup(contract) {
  const lookup = {};
  for (const [gateId, gate] of Object.entries(contract.gates ?? {})) {
    for (const evidence of gate.evidence ?? []) {
      lookup[evidence.id] = {
        gate_id: gateId,
        dimension: gate.dimension,
        slot: evidence.slot,
        required_state: evidence.required_state
      };
    }
  }
  return lookup;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Owner Action Deferral Request Validation");
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
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("This validation proves the owner action package is internally consistent with the current launch audit and go-live contract. It does not approve go-live, does not approve deferrals, and keeps closed CP evidence read-only.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
const audit = readJson(AUDIT_PATH);
const contract = readJson(CONTRACT_PATH);
const requestPackage = readJson(PACKAGE_JSON_PATH);
const requestMarkdown = readText(PACKAGE_MD_PATH);
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const gateLookup = gateEvidenceLookup(contract);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;

if (requestPackage.schema_version !== "law-firm-os.launch-owner-action-deferral-request.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected owner action package schema version.", {
    actual: requestPackage.schema_version
  });
}

const packageAcceptedDecisionIdTokens = new Set(
  (requestPackage.accepted_decision_id_patterns ?? []).flatMap((row) => row.accepted_decision_ids ?? [])
);
const missingAcceptedDecisionIdPatternTokens = REQUIRED_ACCEPTED_DECISION_ID_PATTERN_TOKENS.filter(
  (token) => !packageAcceptedDecisionIdTokens.has(token)
);
if (missingAcceptedDecisionIdPatternTokens.length > 0) {
  addFinding(findings, "P1", "ACCEPTED_DECISION_ID_PATTERNS_MISSING", "Owner action package does not list all accepted deferral decision-id patterns.", {
    missing_tokens: missingAcceptedDecisionIdPatternTokens
  });
}

const expectedBoundary = {
  go_live_approved: false,
  owner_deferrals_approved_by_this_package: false,
  launch_decision_register_modified_by_this_package: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (requestPackage.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Boundary field ${key} drifted.`, {
      expected,
      actual: requestPackage.boundary?.[key]
    });
  }
}

const blockedWps = audit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_blocked");
const recordedWps = audit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_recorded");
const blockedIds = blockedWps.map((wp) => wp.wp_id);
const recordedIds = recordedWps.map((wp) => wp.wp_id);
const packageBlockedIds = (requestPackage.blocked_work_package_actions ?? []).map((wp) => wp.wp_id);
const packageRecordedIds = (requestPackage.recorded_work_packages ?? []).map((wp) => wp.wp_id);
const requestOnlyBlockedWorkPackageCount = (requestPackage.blocked_work_package_actions ?? [])
  .filter((action) => action.owner_deferral_request_status === "not_approved_request_only").length;
const approvedByPackageBlockedWorkPackageCount = (requestPackage.blocked_work_package_actions ?? [])
  .filter((action) => action.owner_deferral_request_status !== "not_approved_request_only").length;

if (!sameSet(blockedIds, packageBlockedIds)) {
  addFinding(findings, "P0", "BLOCKED_QUEUE_MISMATCH", "Blocked work package queue does not match launch audit.", {
    expected_count: blockedIds.length,
    actual_count: packageBlockedIds.length,
    missing: blockedIds.filter((id) => !packageBlockedIds.includes(id)),
    unexpected: packageBlockedIds.filter((id) => !blockedIds.includes(id))
  });
}

if (!sameSet(recordedIds, packageRecordedIds)) {
  addFinding(findings, "P1", "RECORDED_QUEUE_MISMATCH", "Recorded work package queue does not match launch audit.", {
    expected_count: recordedIds.length,
    actual_count: packageRecordedIds.length,
    missing: recordedIds.filter((id) => !packageRecordedIds.includes(id)),
    unexpected: packageRecordedIds.filter((id) => !recordedIds.includes(id))
  });
}

const expectedSummary = {
  work_package_count: audit.summary.work_package_count,
  tuw_count: audit.summary.tuw_count,
  standard_five_present_count: audit.summary.standard_five_present_count,
  command_evidence_present_count: audit.summary.command_evidence_present_count,
  blocked_work_package_count: blockedWps.length,
  recorded_work_package_count: recordedWps.length,
  missing_evidence_count: audit.summary.missing_evidence_count,
  go_live_all_pass: audit.go_live_readiness.all_pass,
  owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
  decision_register_valid_decided_rows: audit.launch_decisions.valid_decided_rows,
  decision_register_valid_deferred_rows: audit.launch_decisions.valid_deferred_rows,
  decision_register_coverage_eligible_valid_deferred_rows: audit.launch_decisions.coverage_eligible_valid_deferred_rows,
  decision_register_non_coverage_valid_deferred_rows: audit.launch_decisions.non_coverage_valid_deferred_rows,
  decision_register_invalid_rows: audit.launch_decisions.invalid_decision_rows
};

for (const [key, expected] of Object.entries(expectedSummary)) {
  if (requestPackage.summary?.[key] !== expected) {
    addFinding(findings, "P1", `SUMMARY_${key}`, `Summary field ${key} does not match current audit.`, {
      expected,
      actual: requestPackage.summary?.[key]
    });
  }
}

if (!sameSet(audit.go_live_readiness.failed_gate_ids, requestPackage.summary?.failed_gate_ids ?? [])) {
  addFinding(findings, "P1", "FAILED_GATE_SUMMARY_MISMATCH", "Failed gate id list does not match current audit.", {
    expected: audit.go_live_readiness.failed_gate_ids,
    actual: requestPackage.summary?.failed_gate_ids
  });
}

if (requestPackage.summary?.request_only_blocked_work_package_count !== requestOnlyBlockedWorkPackageCount) {
  addFinding(findings, "P1", "REQUEST_ONLY_SUMMARY_MISMATCH", "Request-only blocked work package count does not match package rows.", {
    expected: requestOnlyBlockedWorkPackageCount,
    actual: requestPackage.summary?.request_only_blocked_work_package_count
  });
}

if (requestOnlyBlockedWorkPackageCount !== blockedWps.length) {
  addFinding(findings, "P0", "BLOCKED_ROWS_NOT_ALL_REQUEST_ONLY", "Not every blocked work package is marked request-only.", {
    blocked_work_package_count: blockedWps.length,
    request_only_blocked_work_package_count: requestOnlyBlockedWorkPackageCount
  });
}

if (requestPackage.summary?.approved_by_package_blocked_work_package_count !== approvedByPackageBlockedWorkPackageCount) {
  addFinding(findings, "P1", "PACKAGE_APPROVED_SUMMARY_MISMATCH", "Package-approved blocked work package count does not match package rows.", {
    expected: approvedByPackageBlockedWorkPackageCount,
    actual: requestPackage.summary?.approved_by_package_blocked_work_package_count
  });
}

if (approvedByPackageBlockedWorkPackageCount !== 0) {
  addFinding(findings, "P0", "PACKAGE_APPROVED_BLOCKED_ROWS", "Owner action package contains blocked rows that are not request-only.", {
    approved_by_package_blocked_work_package_count: approvedByPackageBlockedWorkPackageCount
  });
}

const packageGateIds = (requestPackage.failed_gate_actions ?? []).map((gate) => gate.gate_id);
if (!sameSet(audit.go_live_readiness.failed_gate_ids, packageGateIds)) {
  addFinding(findings, "P0", "FAILED_GATE_ACTION_MISMATCH", "Failed gate action list does not match current audit.", {
    expected: audit.go_live_readiness.failed_gate_ids,
    actual: packageGateIds
  });
}

for (const gateAction of requestPackage.failed_gate_actions ?? []) {
  const auditGate = audit.go_live_readiness.gates?.[gateAction.gate_id];
  if (!auditGate) {
    addFinding(findings, "P0", "UNKNOWN_GATE_ACTION", "Package contains an unknown failed gate action.", {
      gate_id: gateAction.gate_id
    });
    continue;
  }
  const packageFailedIds = (gateAction.failed_evidence ?? []).map((item) => item.id);
  if (!sameSet(auditGate.failed_evidence, packageFailedIds)) {
    addFinding(findings, "P0", "FAILED_EVIDENCE_MISMATCH", "Failed evidence list does not match current audit.", {
      gate_id: gateAction.gate_id,
      expected: auditGate.failed_evidence,
      actual: packageFailedIds
    });
  }
  for (const evidence of gateAction.failed_evidence ?? []) {
    const expected = gateLookup[evidence.id];
    if (!expected) {
      addFinding(findings, "P0", "UNKNOWN_FAILED_EVIDENCE", "Package references unknown gate evidence id.", {
        gate_id: gateAction.gate_id,
        evidence_id: evidence.id
      });
      continue;
    }
    for (const key of ["gate_id", "dimension", "slot", "required_state"]) {
      if (evidence[key] !== expected[key]) {
        addFinding(findings, "P0", "FAILED_EVIDENCE_CONTRACT_MISMATCH", `Gate evidence ${evidence.id} field ${key} does not match contract.`, {
          expected: expected[key],
          actual: evidence[key]
        });
      }
    }
  }
}

const requiredDeferralFields = [
  "owner role/name",
  "decision or deferral basis",
  "target date or revisit gate",
  "approval signature reference"
];

for (const action of requestPackage.blocked_work_package_actions ?? []) {
  if (action.owner_deferral_request_status !== "not_approved_request_only") {
    addFinding(findings, "P0", "OWNER_DEFERRAL_STATUS_DRIFT", "Blocked action row claims an approved or ambiguous deferral status.", {
      wp_id: action.wp_id,
      actual: action.owner_deferral_request_status
    });
  }
  if (!sameSet(requiredDeferralFields, action.required_deferral_fields ?? [])) {
    addFinding(findings, "P1", "REQUIRED_DEFERRAL_FIELDS_MISMATCH", "Blocked action row does not list the required deferral fields.", {
      wp_id: action.wp_id,
      expected: requiredDeferralFields,
      actual: action.required_deferral_fields
    });
  }
  const evidenceFiles = action.standard_evidence_files_present ?? {};
  const missingFiles = Object.entries(evidenceFiles)
    .filter(([, present]) => present !== true)
    .map(([file]) => file);
  if (missingFiles.length > 0) {
    addFinding(findings, "P0", "STANDARD_EVIDENCE_FILE_MISSING", "Blocked action row points to an incomplete standard evidence set.", {
      wp_id: action.wp_id,
      missing_files: missingFiles
    });
  }
}

if (decisionSummary.owner_approved_deferrals_present !== audit.launch_decisions.owner_approved_deferrals_present) {
  addFinding(findings, "P1", "DECISION_REGISTER_SUMMARY_MISMATCH", "Decision register deferral summary does not match launch audit.", {
    decision_register: decisionSummary,
    audit_launch_decisions: audit.launch_decisions
  });
}

for (const [decisionKey, auditKey] of [
  ["valid_deferred_rows", "valid_deferred_rows"],
  ["coverage_eligible_valid_deferred_rows", "coverage_eligible_valid_deferred_rows"],
  ["non_coverage_valid_deferred_rows", "non_coverage_valid_deferred_rows"],
  ["invalid_decision_rows", "invalid_decision_rows"]
]) {
  if (decisionSummary[decisionKey] !== audit.launch_decisions[auditKey]) {
    addFinding(findings, "P1", `DECISION_REGISTER_${decisionKey.toUpperCase()}_MISMATCH`, `Decision register ${decisionKey} does not match launch audit.`, {
      expected: decisionSummary[decisionKey],
      actual: audit.launch_decisions[auditKey]
    });
  }
}

if (decisionSummary.invalid_decision_rows > 0) {
  addFinding(findings, "P1", "DECISION_REGISTER_INVALID_ROWS", "Decision register contains malformed or incomplete owner decision rows.", {
    invalid_rows: decisionSummary.invalid_rows
  });
}

if (decisionSummary.deferred_rows > 0 && requestPackage.boundary?.owner_deferrals_approved_by_this_package !== false) {
  addFinding(findings, "P0", "PACKAGE_APPROVES_DEFERRALS", "Package boundary cannot approve deferrals, even when deferrals exist in the launch decision register.", {
    decision_register: decisionSummary
  });
}

const requiredMarkdownPhrases = [
  "This package does not approve go-live",
  "does not approve a deferral",
  "Full Claude review is waived",
  "Closed CP evidence remains read-only",
  "Decision ID Handoff",
  "This package is only the request queue"
];

for (const phrase of requiredMarkdownPhrases) {
  if (!requestMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Markdown package is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";

const report = {
  schema_version: "law-firm-os.launch-owner-action-deferral-request.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    AUDIT_PATH,
    CONTRACT_PATH,
    PACKAGE_JSON_PATH,
    PACKAGE_MD_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    work_package_count: audit.summary.work_package_count,
    blocked_work_package_count: blockedWps.length,
    recorded_work_package_count: recordedWps.length,
    request_only_blocked_work_package_count: requestOnlyBlockedWorkPackageCount,
    approved_by_package_blocked_work_package_count: approvedByPackageBlockedWorkPackageCount,
    failed_gate_count: audit.go_live_readiness.failed_gate_ids.length,
    decision_register_decided_rows: decisionSummary.decided_rows,
    decision_register_deferred_rows: decisionSummary.deferred_rows,
    decision_register_valid_decided_rows: decisionSummary.valid_decided_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    decision_register_coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
    decision_register_non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows,
    decision_register_invalid_rows: decisionSummary.invalid_decision_rows,
    owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
    go_live_all_pass: audit.go_live_readiness.all_pass,
    accepted_decision_id_pattern_count: packageAcceptedDecisionIdTokens.size,
    missing_accepted_decision_id_pattern_count: missingAcceptedDecisionIdPatternTokens.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_internal_consistency_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    review_waiver_counts_as_valid_review_evidence: false,
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
  finding_count: findings.length,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count,
  go_live_all_pass: audit.go_live_readiness.all_pass,
  owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
  coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
  non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
