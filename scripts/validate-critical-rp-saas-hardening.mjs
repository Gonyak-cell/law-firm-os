#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { programs } from "./rp-detailed-plan-catalog.mjs";

const contractPath = path.resolve("contracts/critical-rp-saas-hardening-contract.json");
const planPath = path.resolve("docs/critical-rp-saas-hardening-plan.md");
const fullPlanPath = path.resolve("docs/full-spec-microphase-ledger.json");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const plan = await readFile(planPath, "utf8");
const fullPlan = JSON.parse(await readFile(fullPlanPath, "utf8"));

const errors = [];
const expectedCriticalIds = [
  "RP00",
  "RP01",
  "RP02",
  "RP03",
  "RP04",
  "RP05",
  "RP06",
  "RP07",
  "RP10",
  "RP12",
  "RP14",
  "RP16",
  "RP17",
  "RP25",
  "RP26",
  "RP29",
];
const requiredSourceIds = [
  "OWASP-ASVS",
  "OWASP-API-2023",
  "NIST-SSDF",
  "NIST-CSF-2",
  "NIST-PRIVACY",
  "AICPA-TSC",
  "CSA-CCM",
  "NIST-AI-RMF",
  "OWASP-LLM",
  "PCI-DSS",
  "OTEL",
  "KOREA-PIPA",
];
const universalControls = [
  "tenant_isolation",
  "object_level_authorization",
  "deny_over_allow",
  "matter_first_traceability",
  "append_only_audit_or_evidence",
  "privacy_minimization",
  "secure_secret_handling",
  "idempotency_and_replay_protection",
  "data_retention_and_legal_hold",
  "observability_trace_log_metric",
  "synthetic_fixture_only",
  "contract_tests",
  "threat_model",
  "migration_or_release_rollback",
  "hermes_gate",
  "claude_cross_validation",
  "human_approval",
];

function requireArrayIncludes(array, value, label) {
  if (!Array.isArray(array) || !array.includes(value)) errors.push(`${label} must include ${value}`);
}

function requireText(text, value, label) {
  if (!text.includes(value)) errors.push(`${label} missing ${value}`);
}

if (contract.schema_version !== "law-firm-os.critical-rp-saas-hardening.v0.1") {
  errors.push("schema_version mismatch");
}
if (!Array.isArray(contract.critical_rp_ids) || contract.critical_rp_ids.length !== 16) {
  errors.push(`critical_rp_ids must contain 16 items, got ${contract.critical_rp_ids?.length}`);
}
for (const id of expectedCriticalIds) requireArrayIncludes(contract.critical_rp_ids, id, "critical_rp_ids");

const sourceIds = new Set((contract.research_sources ?? []).map((source) => source.id));
for (const id of requiredSourceIds) {
  if (!sourceIds.has(id)) errors.push(`research_sources missing ${id}`);
}
for (const source of contract.research_sources ?? []) {
  if (!source.url?.startsWith("https://")) errors.push(`${source.id} must have https url`);
  if (!Array.isArray(source.applies_to) || source.applies_to.length < 2) errors.push(`${source.id} missing applies_to detail`);
}

for (const control of universalControls) requireArrayIncludes(contract.universal_saas_controls, control, "universal_saas_controls");

const programIds = new Set(programs.map((program) => program.id));
const fullPlanProgramIds = new Set(fullPlan.entries.map((entry) => entry.program_id));
const overlayIds = new Set();
for (const overlay of contract.rp_overlays ?? []) {
  overlayIds.add(overlay.id);
  if (!expectedCriticalIds.includes(overlay.id)) errors.push(`unexpected overlay id ${overlay.id}`);
  if (!programIds.has(overlay.id)) errors.push(`${overlay.id} missing from detailed plan catalog`);
  if (!fullPlanProgramIds.has(overlay.id)) errors.push(`${overlay.id} missing from full plan`);
  if (!overlay.title) errors.push(`${overlay.id} missing title`);
  if (!overlay.tier) errors.push(`${overlay.id} missing tier`);
  if (!overlay.why_critical || overlay.why_critical.length < 60) errors.push(`${overlay.id} why_critical too short`);
  if (!Array.isArray(overlay.research_alignment) || overlay.research_alignment.length < 2) errors.push(`${overlay.id} needs at least 2 research alignments`);
  for (const sourceId of overlay.research_alignment ?? []) {
    if (!sourceIds.has(sourceId)) errors.push(`${overlay.id} unknown research source ${sourceId}`);
  }
  if (!Array.isArray(overlay.essential_capabilities) || overlay.essential_capabilities.length < 5) {
    errors.push(`${overlay.id} needs at least 5 essential capabilities`);
  }
  if (!Array.isArray(overlay.safety_gates) || overlay.safety_gates.length < 5) {
    errors.push(`${overlay.id} needs at least 5 safety gates`);
  }
  if (!Array.isArray(overlay.mandatory_artifacts) || overlay.mandatory_artifacts.length < 3) {
    errors.push(`${overlay.id} needs at least 3 mandatory artifacts`);
  }
  if (overlay.hermes_gate !== `H${overlay.id.slice(2)}`) errors.push(`${overlay.id} Hermes gate mismatch`);
  if (overlay.claude_gate !== `C${overlay.id.slice(2)}`) errors.push(`${overlay.id} Claude gate mismatch`);
}

if (overlayIds.size !== expectedCriticalIds.length) {
  errors.push(`rp_overlays must contain ${expectedCriticalIds.length} unique overlays, got ${overlayIds.size}`);
}
for (const id of expectedCriticalIds) {
  if (!overlayIds.has(id)) errors.push(`missing overlay for ${id}`);
  requireText(plan, id, "critical RP hardening plan");
}

for (const term of [
  "tenant isolation",
  "object-level authorization",
  "deny-over-allow",
  "matter-first traceability",
  "privacy minimization",
  "Hermes gate",
  "Claude Code cross-validation",
  "human approval",
  "AI cannot bypass",
  "release approval",
]) {
  requireText(plan, term, "critical RP hardening plan");
}

if (errors.length > 0) {
  console.error("Critical RP SaaS hardening validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("Critical RP SaaS hardening validation passed.");
console.log(`critical_rp_count: ${contract.critical_rp_ids.length}`);
console.log(`research_source_count: ${contract.research_sources.length}`);
console.log(`universal_control_count: ${contract.universal_saas_controls.length}`);
