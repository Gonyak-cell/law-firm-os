#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const LEDGER_PATH = path.resolve("docs/weighted-implementation-ledger.json");
const SOURCE_PATH = path.resolve("docs/full-spec-microphase-ledger.json");

const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
const source = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
const requirementLedger = JSON.parse(await readFile(path.resolve("docs/spec-requirement-ledger.json"), "utf8"));
const criticalRpHardening = JSON.parse(await readFile(path.resolve("contracts/critical-rp-saas-hardening-contract.json"), "utf8"));
const errors = [];
const sourceIds = new Set(source.entries.map((entry) => entry.id));
const requirementIds = new Set(requirementLedger.requirements.map((requirement) => requirement.id));
const criticalRpIds = new Set(criticalRpHardening.critical_rp_ids ?? []);
const seenSourceIds = new Set();
const seenSubphaseIds = new Set();
const seenRequirementIds = new Set();
const weightCounts = { L: 0, M: 0, H: 0, XH: 0 };
const subphaseCounts = { L: 0, M: 0, H: 0, XH: 0 };
let implementationSubphaseCount = 0;

const splitRules = {
  L: [1, 2],
  M: [3, 5],
  H: [8, 15],
  XH: [20, 50],
};

const universalGateIds = new Set(["implemented", "tests", "permission_audit", "hermes_validation", "claude_cross_validation", "human_approval", "production_readiness"]);

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

if (ledger.schema_version !== "law-firm-os.weighted-implementation-ledger.v1") {
  errors.push("schema_version mismatch");
}
if (ledger.source_micro_phase_count !== 3300) {
  errors.push(`source_micro_phase_count must be 3300, got ${ledger.source_micro_phase_count}`);
}
if (!Array.isArray(ledger.entries)) {
  errors.push("entries must be an array");
}
if ((ledger.entries?.length ?? 0) !== source.entries.length) {
  errors.push(`entries length must match source ledger ${source.entries.length}`);
}
if (ledger.requirement_count !== requirementLedger.requirement_count) {
  errors.push(`requirement_count must match spec requirement ledger ${requirementLedger.requirement_count}`);
}
if (ledger.critical_rp_count !== criticalRpIds.size) {
  errors.push(`critical_rp_count must match hardening contract ${criticalRpIds.size}`);
}
if (!Array.isArray(ledger.critical_rp_ids) || ledger.critical_rp_ids.length !== criticalRpIds.size) {
  errors.push("critical_rp_ids must match hardening contract size");
}
if (!ledger.saas_completion_policy?.construction_inspection_rule) {
  errors.push("saas_completion_policy missing construction_inspection_rule");
}
if (!ledger.saas_completion_policy?.construction_inspection_rule?.includes("SaaS-grade product candidate")) {
  errors.push("construction_inspection_rule must define PASS as SaaS-grade product candidate");
}
if (!ledger.saas_completion_policy?.construction_inspection_rule?.includes("not automatic market SaaS recognition")) {
  errors.push("construction_inspection_rule must distinguish internal 준공검사 from market SaaS recognition");
}
if (!ledger.saas_completion_policy?.critical_rp_rule) {
  errors.push("saas_completion_policy missing critical_rp_rule");
}
if (ledger.construction_inspection_template?.id !== "construction_inspection.v1") {
  errors.push("construction_inspection_template missing construction_inspection.v1");
}
if (ledger.construction_inspection_template?.pass_means !== "internal_saas_grade_product_candidate") {
  errors.push("construction_inspection_template pass_means must be internal_saas_grade_product_candidate");
}
if (ledger.construction_inspection_template?.pass_does_not_mean !== "market_validated_saas") {
  errors.push("construction_inspection_template pass_does_not_mean must be market_validated_saas");
}
for (const criterion of [
  "subphase_54355_all_production_ready",
  "spec_requirement_227_all_covered",
  "hermes_validation_all_passed",
  "claude_cross_validation_all_passed",
  "ux_performance_security_operations_gates_all_passed",
]) {
  if (!ledger.construction_inspection_template?.internal_product_completion_formula?.includes(criterion)) {
    errors.push(`construction_inspection_template missing formula criterion ${criterion}`);
  }
}
if (!Array.isArray(ledger.construction_inspection_template?.stages) || ledger.construction_inspection_template.stages.length !== 5) {
  errors.push("construction_inspection_template must define 5 stages");
}
if (!Array.isArray(ledger.construction_inspection_template?.maturity_ladder) || ledger.construction_inspection_template.maturity_ladder.length !== 3) {
  errors.push("construction_inspection_template must define 3 maturity ladder levels");
}
if (ledger.market_validation_template?.id !== "market_validation.v1") {
  errors.push("market_validation_template missing market_validation.v1");
}
if (ledger.market_validation_template?.starts_after !== "construction_inspection.v1 PASS") {
  errors.push("market_validation_template must start after construction inspection PASS");
}
for (const activity of [
  "actual_customer_pilot_3_to_5_sites",
  "migration_rehearsal_with_realistic_business_data",
  "customer_feedback_triage_and_fix_loop",
  "incident_load_security_rehearsal",
  "pricing_permission_support_onboarding_operations",
  "post_release_defect_correction_loop",
]) {
  if (!ledger.market_validation_template?.required_activities?.includes(activity)) {
    errors.push(`market_validation_template missing activity ${activity}`);
  }
}
if (!Array.isArray(ledger.hermes_validation_template?.required_evidence) || !ledger.hermes_validation_template.required_evidence.includes("blocked_claims")) {
  errors.push("hermes_validation_template missing blocked_claims evidence");
}
if (!Array.isArray(ledger.claude_cross_validation_template?.review_focus) || !ledger.claude_cross_validation_template.review_focus.includes("security_bypass_paths")) {
  errors.push("claude_cross_validation_template missing security_bypass_paths");
}

for (const entry of ledger.entries ?? []) {
  if (!sourceIds.has(entry.source_micro_phase_id)) errors.push(`${entry.source_micro_phase_id} does not exist in source ledger`);
  if (seenSourceIds.has(entry.source_micro_phase_id)) errors.push(`duplicate source_micro_phase_id ${entry.source_micro_phase_id}`);
  seenSourceIds.add(entry.source_micro_phase_id);

  if (!["L", "M", "H", "XH"].includes(entry.weight)) errors.push(`${entry.source_micro_phase_id} invalid weight ${entry.weight}`);
  if (!Number.isFinite(entry.estimated_hours) || entry.estimated_hours <= 0) errors.push(`${entry.source_micro_phase_id} invalid estimated_hours`);
  if (!Number.isInteger(entry.split_count) || !inRange(entry.split_count, splitRules[entry.weight] ?? [0, 0])) {
    errors.push(`${entry.source_micro_phase_id} split_count ${entry.split_count} violates ${entry.weight} rule`);
  }
  if (!Array.isArray(entry.implementation_subphases) || entry.implementation_subphases.length !== entry.split_count) {
    errors.push(`${entry.source_micro_phase_id} implementation_subphases length mismatch`);
  }
  if (!Array.isArray(entry.commands) || !entry.commands.includes("npm run validate")) {
    errors.push(`${entry.source_micro_phase_id} missing npm run validate command`);
  }
  if (!Array.isArray(entry.requirement_refs)) errors.push(`${entry.source_micro_phase_id} missing requirement_refs`);
  if (entry.critical_rp !== criticalRpIds.has(entry.program_id)) errors.push(`${entry.source_micro_phase_id} critical_rp flag mismatch`);
  if (!entry.phase_construction_inspection?.required) errors.push(`${entry.source_micro_phase_id} missing required phase construction inspection`);
  if (entry.phase_construction_inspection?.process_name !== "페이즈 준공검사") errors.push(`${entry.source_micro_phase_id} phase construction inspection process mismatch`);
  if (entry.phase_construction_inspection?.minimum_final_verdict !== "PASS") errors.push(`${entry.source_micro_phase_id} phase construction inspection minimum verdict must be PASS`);

  weightCounts[entry.weight] += 1;
  subphaseCounts[entry.weight] += entry.split_count;
  implementationSubphaseCount += entry.split_count;

  for (const subphase of entry.implementation_subphases ?? []) {
    if (seenSubphaseIds.has(subphase.id)) errors.push(`duplicate subphase id ${subphase.id}`);
    seenSubphaseIds.add(subphase.id);
    if (!subphase.id.startsWith(`${entry.source_micro_phase_id}.S`)) errors.push(`${subphase.id} does not belong to ${entry.source_micro_phase_id}`);
    if (!Number.isInteger(subphase.order) || subphase.order < 1 || subphase.order > entry.split_count) errors.push(`${subphase.id} invalid order`);
    if (!subphase.title) errors.push(`${subphase.id} missing title`);
    if (!subphase.deliverable_type) errors.push(`${subphase.id} missing deliverable_type`);
    if (!subphase.completion_status_model) errors.push(`${subphase.id} missing completion_status_model`);
    if (!Array.isArray(subphase.completion_status_model?.allowed_statuses) || !subphase.completion_status_model.allowed_statuses.includes("production_ready")) {
      errors.push(`${subphase.id} completion_status_model must include production_ready`);
    }
    if (subphase.completion_status_model?.minimum_closeout_status !== "production_ready") {
      errors.push(`${subphase.id} minimum_closeout_status must be production_ready`);
    }
    if (!Array.isArray(subphase.completion_gates) || subphase.completion_gates.length < 7) {
      errors.push(`${subphase.id} missing SaaS completion gates`);
    } else {
      const gateIds = new Set(subphase.completion_gates.map((gate) => gate.id));
      for (const gateId of universalGateIds) {
        if (!gateIds.has(gateId)) errors.push(`${subphase.id} missing universal completion gate ${gateId}`);
      }
      for (const gate of subphase.completion_gates) {
        if (!gate.status || !gate.evidence) errors.push(`${subphase.id} completion gate ${gate.id} missing status/evidence`);
      }
    }
    if (subphase.construction_inspection_required !== true) errors.push(`${subphase.id} missing required 준공검사`);
    if (subphase.construction_inspection_ref !== "construction_inspection.v1") errors.push(`${subphase.id} construction inspection ref mismatch`);
    if (subphase.hermes_validation_required !== true) errors.push(`${subphase.id} missing Hermes validation requirement`);
    if (subphase.hermes_validation_plan_ref !== `${entry.hermes_gate}.weighted_subphase_evidence`) {
      errors.push(`${subphase.id} missing Hermes validation plan ref for ${entry.hermes_gate}`);
    }
    if (subphase.claude_cross_validation_required !== true) errors.push(`${subphase.id} missing Claude cross-validation requirement`);
    if (subphase.claude_cross_validation_plan_ref !== `${entry.claude_gate}.weighted_subphase_review`) {
      errors.push(`${subphase.id} missing Claude cross-validation plan ref for ${entry.claude_gate}`);
    }
    if (!subphase.saas_hardening_overlay_ref) errors.push(`${subphase.id} missing saas_hardening_overlay_ref`);
    if (criticalRpIds.has(entry.program_id)) {
      if (subphase.critical_rp !== true) errors.push(`${subphase.id} critical RP flag must be true`);
      if (subphase.saas_hardening_overlay_ref !== `${entry.program_id}.critical_rp_overlay`) {
        errors.push(`${subphase.id} critical RP overlay ref must point to ${entry.program_id}`);
      }
    } else {
      if (subphase.critical_rp !== false) errors.push(`${subphase.id} non-critical RP flag must be false`);
      if (subphase.saas_hardening_overlay_ref !== "standard_saas_overlay") errors.push(`${subphase.id} non-critical RP overlay ref mismatch`);
    }
    if (!Array.isArray(subphase.requirement_refs)) errors.push(`${subphase.id} missing requirement_refs`);
    for (const ref of subphase.requirement_refs ?? []) {
      if (!requirementIds.has(ref.requirement_id)) errors.push(`${subphase.id} unknown requirement ref ${ref.requirement_id}`);
      seenRequirementIds.add(ref.requirement_id);
      if (!ref.anchor_role) errors.push(`${subphase.id} requirement ref missing anchor_role`);
    }
    if (!subphase.objective || subphase.objective.length < 80) errors.push(`${subphase.id} objective too short`);
    if (!Number.isFinite(subphase.estimated_hours) || subphase.estimated_hours <= 0) errors.push(`${subphase.id} invalid estimated_hours`);
    if (!Array.isArray(subphase.acceptance) || subphase.acceptance.length < 4) errors.push(`${subphase.id} missing strengthened acceptance criteria`);
  }
}

for (const id of sourceIds) {
  if (!seenSourceIds.has(id)) errors.push(`missing weighted entry for ${id}`);
}

for (const weight of ["L", "M", "H", "XH"]) {
  if (weightCounts[weight] === 0) errors.push(`no ${weight} weighted phases found`);
  if (ledger.weight_counts?.[weight] !== weightCounts[weight]) errors.push(`${weight} weight_counts mismatch`);
  if (ledger.subphase_counts_by_weight?.[weight] !== subphaseCounts[weight]) errors.push(`${weight} subphase_counts mismatch`);
}

if (implementationSubphaseCount !== ledger.implementation_subphase_count) {
  errors.push(`implementation_subphase_count mismatch: ${implementationSubphaseCount} vs ${ledger.implementation_subphase_count}`);
}
if (implementationSubphaseCount < 30000 || implementationSubphaseCount > 55000) {
  errors.push(`implementation_subphase_count must be between 30000 and 55000, got ${implementationSubphaseCount}`);
}
if (subphaseCounts.XH <= subphaseCounts.H) {
  errors.push("XH subphase count should be greater than H subphase count");
}
if (subphaseCounts.H <= subphaseCounts.M) {
  errors.push("H subphase count should be greater than M subphase count");
}
if (!Array.isArray(ledger.program_distribution) || ledger.program_distribution.length !== 30) {
  errors.push("program_distribution must contain 30 programs");
}
for (const requirementId of requirementIds) {
  if (!seenRequirementIds.has(requirementId)) errors.push(`requirement ${requirementId} is not attached to any weighted subphase`);
}
if (ledger.subphase_requirement_ref_count < requirementIds.size) {
  errors.push("subphase_requirement_ref_count must cover all requirements");
}
const criticalSubphaseCount = (ledger.entries ?? [])
  .filter((entry) => criticalRpIds.has(entry.program_id))
  .reduce((sum, entry) => sum + (entry.implementation_subphases?.length ?? 0), 0);
if (ledger.critical_rp_subphase_count !== criticalSubphaseCount) {
  errors.push(`critical_rp_subphase_count mismatch: ${ledger.critical_rp_subphase_count} vs ${criticalSubphaseCount}`);
}

if (errors.length > 0) {
  console.error("Weighted implementation ledger validation failed:");
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log("Weighted implementation ledger validation passed.");
console.log(`source_micro_phase_count: ${ledger.source_micro_phase_count}`);
console.log(`implementation_subphase_count: ${ledger.implementation_subphase_count}`);
console.log(`weight_counts: ${JSON.stringify(ledger.weight_counts)}`);
console.log(`estimated_hours_total: ${ledger.estimated_hours_total}`);
