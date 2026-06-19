#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { coverageDomainForDecisionId } from "./lib/launch-decision-register.mjs";

const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const DECISION_REGISTER_TEMPLATE_PATH = "docs/launch/launch-deferral-decision-register-template.json";
const INTAKE_BATCHES_PATH = "docs/launch/launch-deferral-intake-batches.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-coverage-options.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-coverage-options.md";

const DOMAIN_AGGREGATE_IDS = [
  {
    decision_id: "COVERAGE-ALL-GO-LIVE",
    label: "All failed G1-G10 gate evidence slots",
    required_owner_basis: "Owner accepts deferring all currently failed go-live gate evidence slots."
  },
  {
    decision_id: "COVERAGE-L9-STABILIZATION",
    label: "All L9 stabilization closure criteria",
    required_owner_basis: "Owner accepts deferring all currently blocked L9 stabilization closure criteria."
  },
  {
    decision_id: "COVERAGE-ALL-BLOCKED-WP",
    label: "All blocked launch work packages",
    required_owner_basis: "Owner accepts deferring all currently blocked PRE-L9 launch work packages."
  },
  {
    decision_id: "COVERAGE-ALL-PHASE-EXITS",
    label: "All PRE-L9 phase exits",
    required_owner_basis: "Owner accepts deferring all currently blocked PRE-L9 phase exits."
  }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function flattenCoverageRows(audit) {
  return Object.values(audit.coverage_rows ?? {}).flat();
}

function targetsCoveredByDecisionId(targets, decisionId) {
  return targets.filter((target) => (target.accepted_decision_ids ?? []).includes(decisionId));
}

function optionForDecisionId(targets, decisionId, optionType, label = "") {
  const coveredTargets = targetsCoveredByDecisionId(targets, decisionId);
  return {
    option_type: optionType,
    decision_id: decisionId,
    coverage_domain: coverageDomainForDecisionId(decisionId),
    label,
    covered_target_count: coveredTargets.length,
    covered_target_ids: coveredTargets.map((target) => target.coverage_id).sort(),
    owner_input_required: true,
    real_owner_row_required: true,
    approval_state: "not_approved_option_only"
  };
}

function unique(values) {
  return [...new Set(values)].sort();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Coverage Options");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This is a routing-options package only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Every option still requires real owner role/name, decision, basis, date or revisit gate, and approval signature reference.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Minimum All-Target Routing Bundle");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets | Owner basis required |");
  lines.push("| --- | --- | ---: | --- |");
  for (const row of report.minimum_all_target_routing_bundle.decision_rows) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} | ${markdownCell(row.required_owner_basis)} |`);
  }
  lines.push("");
  lines.push("## Domain Aggregate Options");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets |");
  lines.push("| --- | --- | ---: |");
  for (const row of report.domain_aggregate_options) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} |`);
  }
  lines.push("");
  lines.push("## Gate Options");
  lines.push("");
  lines.push("| Decision ID | Targets |");
  lines.push("| --- | ---: |");
  for (const row of report.gate_options) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${row.covered_target_count} |`);
  }
  lines.push("");
  lines.push("## Phase Options");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets |");
  lines.push("| --- | --- | ---: |");
  for (const row of [...report.blocked_wp_phase_options, ...report.phase_exit_options]) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} |`);
  }
  lines.push("");
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("An option can become a launch decision register row only after a real owner supplies all required decision evidence. This package is not itself approval evidence.");
  return `${lines.join("\n")}\n`;
}

const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const decisionRegisterTemplate = readJson(DECISION_REGISTER_TEMPLATE_PATH);
const intakeBatches = readJson(INTAKE_BATCHES_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const missingTargets = flattenCoverageRows(deferralCoverageAudit)
  .filter((row) => row.coverage_status === "missing_owner_deferral")
  .sort((left, right) => left.domain.localeCompare(right.domain) || left.coverage_id.localeCompare(right.coverage_id));

const targetDecisionIds = unique(missingTargets.flatMap((target) => target.accepted_decision_ids ?? []));
const gateDecisionIds = targetDecisionIds.filter((id) => /^COVERAGE-GATE-G\d+$/.test(id));
const blockedWpPhaseDecisionIds = targetDecisionIds.filter((id) => /^COVERAGE-PHASE-(PRE|L\d+)$/.test(id));
const phaseExitDecisionIds = targetDecisionIds.filter((id) => /^PHASE-(PRE|L\d+)$/.test(id));
const exactTargetOptions = missingTargets.map((target) =>
  optionForDecisionId(missingTargets, target.accepted_decision_ids?.[0] ?? target.coverage_id, "exact_target", target.coverage_id)
);
const domainAggregateOptions = DOMAIN_AGGREGATE_IDS.map((row) => ({
  ...optionForDecisionId(missingTargets, row.decision_id, "domain_aggregate", row.label),
  required_owner_basis: row.required_owner_basis
}));
const gateOptions = gateDecisionIds.map((id) => optionForDecisionId(missingTargets, id, "gate_bundle", id));
const blockedWpPhaseOptions = blockedWpPhaseDecisionIds.map((id) => optionForDecisionId(missingTargets, id, "blocked_wp_phase_bundle", id));
const phaseExitOptions = phaseExitDecisionIds.map((id) => optionForDecisionId(missingTargets, id, "phase_exit_bundle", id));
const minimumDecisionRows = domainAggregateOptions.map((option) => ({
  ...option,
  required_owner_basis: DOMAIN_AGGREGATE_IDS.find((row) => row.decision_id === option.decision_id)?.required_owner_basis ?? ""
}));
const minimumCoveredTargetIds = unique(minimumDecisionRows.flatMap((row) => row.covered_target_ids));
const missingTargetIds = missingTargets.map((target) => target.coverage_id).sort();
const minimumUncoveredTargetIds = missingTargetIds.filter((coverageId) => !minimumCoveredTargetIds.includes(coverageId));

const report = {
  schema_version: "law-firm-os.launch-deferral-coverage-options.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DEFERRAL_COVERAGE_AUDIT_PATH,
    DECISION_REGISTER_TEMPLATE_PATH,
    INTAKE_BATCHES_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    routing_options_only: true,
    go_live_approved_by_this_package: false,
    owner_deferrals_approved_by_this_package: false,
    launch_decision_register_modified_by_this_package: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    missing_deferral_target_count: missingTargets.length,
    template_row_count: decisionRegisterTemplate.summary.template_row_count,
    intake_target_count: intakeBatches.summary.intake_target_count,
    minimum_bundle_decision_id_count: minimumDecisionRows.length,
    minimum_bundle_covered_target_count: minimumCoveredTargetIds.length,
    minimum_bundle_uncovered_target_count: minimumUncoveredTargetIds.length,
    domain_aggregate_option_count: domainAggregateOptions.length,
    gate_option_count: gateOptions.length,
    blocked_wp_phase_option_count: blockedWpPhaseOptions.length,
    phase_exit_option_count: phaseExitOptions.length,
    exact_target_option_count: exactTargetOptions.length,
    not_approved_option_count: [
      ...domainAggregateOptions,
      ...gateOptions,
      ...blockedWpPhaseOptions,
      ...phaseExitOptions,
      ...exactTargetOptions
    ].filter((option) => option.approval_state === "not_approved_option_only").length
  },
  minimum_all_target_routing_bundle: {
    decision_rows: minimumDecisionRows,
    selected_decision_ids: minimumDecisionRows.map((row) => row.decision_id),
    covered_target_count: minimumCoveredTargetIds.length,
    covered_target_ids: minimumCoveredTargetIds,
    uncovered_target_count: minimumUncoveredTargetIds.length,
    uncovered_target_ids: minimumUncoveredTargetIds,
    owner_input_required: true,
    real_owner_rows_required: true,
    approval_state: "not_approved_option_only"
  },
  domain_aggregate_options: domainAggregateOptions,
  gate_options: gateOptions,
  blocked_wp_phase_options: blockedWpPhaseOptions,
  phase_exit_options: phaseExitOptions,
  exact_target_options: exactTargetOptions
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  missing_deferral_target_count: report.summary.missing_deferral_target_count,
  minimum_bundle_decision_id_count: report.summary.minimum_bundle_decision_id_count,
  minimum_bundle_covered_target_count: report.summary.minimum_bundle_covered_target_count,
  minimum_bundle_uncovered_target_count: report.summary.minimum_bundle_uncovered_target_count,
  domain_aggregate_option_count: report.summary.domain_aggregate_option_count,
  not_approved_option_count: report.summary.not_approved_option_count
}, null, 2));
