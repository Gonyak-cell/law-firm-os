#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  coverageDomainForDecisionId,
  summarizeLaunchDecisionRegister
} from "./lib/launch-decision-register.mjs";

const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const COVERAGE_OPTIONS_JSON_PATH = "docs/launch/launch-deferral-coverage-options.json";
const COVERAGE_OPTIONS_MD_PATH = "docs/launch/launch-deferral-coverage-options.md";
const DECISION_REGISTER_PATH = "docs/launch/launch-decision-register.md";
const VALIDATION_JSON_PATH = "docs/launch/launch-deferral-coverage-options-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-deferral-coverage-options-validation.md";

const REQUIRED_BOUNDARY_PHRASES = [
  "routing-options package only",
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

function flattenCoverageRows(audit) {
  return Object.values(audit.coverage_rows ?? {}).flat();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function sameSet(left, right) {
  const a = unique(left ?? []);
  const b = unique(right ?? []);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function coveredTargetIdsForDecisionIds(targets, decisionIds) {
  return unique(targets
    .filter((target) => (target.accepted_decision_ids ?? []).some((id) => decisionIds.includes(id)))
    .map((target) => target.coverage_id));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Coverage Options Validation");
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
  lines.push("- This validation checks routing options only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It confirms the launch decision register remains unmodified by the coverage-options package.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const coverageOptions = readJson(COVERAGE_OPTIONS_JSON_PATH);
const coverageOptionsMarkdown = readText(COVERAGE_OPTIONS_MD_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const decisionSummary = summarizeLaunchDecisionRegister(DECISION_REGISTER_PATH);
const findings = [];
const missingTargets = flattenCoverageRows(deferralCoverageAudit)
  .filter((row) => row.coverage_status === "missing_owner_deferral")
  .sort((left, right) => left.domain.localeCompare(right.domain) || left.coverage_id.localeCompare(right.coverage_id));
const missingTargetIds = missingTargets.map((target) => target.coverage_id).sort();

if (deferralCoverageAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "DEFERRAL_COVERAGE_AUDIT_NOT_PASS", "Deferral coverage audit must pass before coverage options are valid.", {
    actual: deferralCoverageAudit.verdict
  });
}

if (coverageOptions.schema_version !== "law-firm-os.launch-deferral-coverage-options.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected launch deferral coverage options schema version.", {
    actual: coverageOptions.schema_version
  });
}

const expectedBoundary = {
  routing_options_only: true,
  go_live_approved_by_this_package: false,
  owner_deferrals_approved_by_this_package: false,
  launch_decision_register_modified_by_this_package: false,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (coverageOptions.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Coverage options boundary field ${key} drifted.`, {
      expected,
      actual: coverageOptions.boundary?.[key]
    });
  }
}

if (coverageOptions.summary?.missing_deferral_target_count !== missingTargets.length) {
  addFinding(findings, "P1", "MISSING_TARGET_COUNT_MISMATCH", "Coverage options missing target count does not match deferral coverage audit.", {
    expected: missingTargets.length,
    actual: coverageOptions.summary?.missing_deferral_target_count
  });
}

const minimumBundle = coverageOptions.minimum_all_target_routing_bundle ?? {};
const selectedDecisionIds = minimumBundle.selected_decision_ids ?? [];
const calculatedMinimumCoveredIds = coveredTargetIdsForDecisionIds(missingTargets, selectedDecisionIds);
if (!sameSet(calculatedMinimumCoveredIds, missingTargetIds)) {
  addFinding(findings, "P1", "MINIMUM_BUNDLE_DOES_NOT_COVER_ALL_TARGETS", "Minimum routing bundle does not cover every missing deferral target.", {
    expected_count: missingTargetIds.length,
    actual_count: calculatedMinimumCoveredIds.length,
    missing_coverage_ids: missingTargetIds.filter((id) => !calculatedMinimumCoveredIds.includes(id))
  });
}

if (!sameSet(minimumBundle.covered_target_ids ?? [], calculatedMinimumCoveredIds)) {
  addFinding(findings, "P1", "MINIMUM_BUNDLE_RECORDED_COVERAGE_MISMATCH", "Recorded minimum bundle target IDs do not match calculated coverage.", {
    recorded_count: (minimumBundle.covered_target_ids ?? []).length,
    calculated_count: calculatedMinimumCoveredIds.length
  });
}

if ((minimumBundle.uncovered_target_ids ?? []).length !== 0 || coverageOptions.summary?.minimum_bundle_uncovered_target_count !== 0) {
  addFinding(findings, "P1", "MINIMUM_BUNDLE_UNCOVERED_TARGETS", "Minimum routing bundle records uncovered targets.", {
    uncovered_target_ids: minimumBundle.uncovered_target_ids ?? [],
    uncovered_count: coverageOptions.summary?.minimum_bundle_uncovered_target_count
  });
}

const allOptions = [
  ...(coverageOptions.domain_aggregate_options ?? []),
  ...(coverageOptions.gate_options ?? []),
  ...(coverageOptions.blocked_wp_phase_options ?? []),
  ...(coverageOptions.phase_exit_options ?? []),
  ...(coverageOptions.exact_target_options ?? [])
];

for (const option of allOptions) {
  const expectedDomain = coverageDomainForDecisionId(option.decision_id);
  const calculatedCoveredIds = coveredTargetIdsForDecisionIds(missingTargets, [option.decision_id]);
  if (!expectedDomain) {
    addFinding(findings, "P1", "OPTION_DECISION_ID_NOT_COVERAGE_ELIGIBLE", "Coverage option decision ID is not coverage-eligible.", {
      decision_id: option.decision_id
    });
  }
  if (option.coverage_domain !== expectedDomain) {
    addFinding(findings, "P1", "OPTION_DOMAIN_MISMATCH", "Coverage option domain does not match decision ID contract.", {
      decision_id: option.decision_id,
      expected: expectedDomain,
      actual: option.coverage_domain
    });
  }
  if (option.covered_target_count !== calculatedCoveredIds.length || !sameSet(option.covered_target_ids ?? [], calculatedCoveredIds)) {
    addFinding(findings, "P1", "OPTION_COVERAGE_MISMATCH", "Coverage option target set does not match accepted decision IDs.", {
      decision_id: option.decision_id,
      expected_count: calculatedCoveredIds.length,
      actual_count: option.covered_target_count
    });
  }
  if (option.approval_state !== "not_approved_option_only" || option.owner_input_required !== true || option.real_owner_row_required !== true) {
    addFinding(findings, "P0", "OPTION_NOT_MARKED_OWNER_INPUT_REQUIRED", "Coverage option is not explicitly marked as unapproved and owner-input-required.", {
      decision_id: option.decision_id
    });
  }
}

if (decisionSummary.total_rows !== 0 || decisionSummary.valid_deferred_rows !== 0 || decisionSummary.valid_decided_rows !== 0) {
  addFinding(findings, "P0", "DECISION_REGISTER_MODIFIED_BY_COVERAGE_OPTIONS", "Launch decision register contains decision rows while coverage options are routing-only.", {
    total_rows: decisionSummary.total_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    valid_decided_rows: decisionSummary.valid_decided_rows
  });
}

for (const phrase of REQUIRED_BOUNDARY_PHRASES) {
  if (!coverageOptionsMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Coverage options markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-coverage-options.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    COVERAGE_OPTIONS_JSON_PATH,
    COVERAGE_OPTIONS_MD_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH,
    DECISION_REGISTER_PATH
  ],
  verdict,
  summary: {
    missing_deferral_target_count: missingTargets.length,
    minimum_bundle_decision_id_count: selectedDecisionIds.length,
    minimum_bundle_covered_target_count: calculatedMinimumCoveredIds.length,
    minimum_bundle_uncovered_target_count: missingTargetIds.length - calculatedMinimumCoveredIds.length,
    option_count: allOptions.length,
    decision_register_total_rows: decisionSummary.total_rows,
    decision_register_valid_deferred_rows: decisionSummary.valid_deferred_rows,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_routing_options_only: true,
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
  missing_deferral_target_count: report.summary.missing_deferral_target_count,
  minimum_bundle_decision_id_count: report.summary.minimum_bundle_decision_id_count,
  minimum_bundle_covered_target_count: report.summary.minimum_bundle_covered_target_count,
  minimum_bundle_uncovered_target_count: report.summary.minimum_bundle_uncovered_target_count,
  decision_register_total_rows: report.summary.decision_register_total_rows,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
