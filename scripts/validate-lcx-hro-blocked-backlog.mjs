#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const contractPath = "docs/lazycodex/people-reflection/lcx-hro-07-blocked-backlog-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/lcx-hro-07-blocked-backlog-contract.md";
const evidencePath = "docs/lazycodex/people-reflection/lcx-hro-07-evidence.json";
const hroRegistryPath = "docs/hro-deel-parity/backend-contract-registry.json";
const hroRegisterSummaryPath = "docs/hro-deel-parity/backend-contract-register.md";
const hroCrosswalkPath = "docs/hro-deel-parity/crosswalk-ledger.json";
const shellPath = "apps/web/src/components/Shell.jsx";
const peopleHomePath = "apps/web/src/people/PeopleHome.tsx";
const apiClientPath = "apps/web/src/people/hrxApiClient.ts";

for (const path of [
  contractPath,
  summaryPath,
  evidencePath,
  hroRegistryPath,
  hroRegisterSummaryPath,
  hroCrosswalkPath,
  shellPath,
  peopleHomePath,
  apiClientPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:hro:blocked:validate"], "node scripts/validate-lcx-hro-blocked-backlog.mjs");

const contract = readJson(contractPath);
const evidence = readJson(evidencePath);
const hroRegistry = readJson(hroRegistryPath);
const hroCrosswalk = readJson(hroCrosswalkPath);

assert.equal(contract.schema_version, "lawos.lcx_hro.blocked_backlog_contract.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(contract.scope, ["LCX-HRO-07.01", "LCX-HRO-07.02", "LCX-HRO-07.03", "LCX-HRO-07.04"]);
assert.equal(contract.status, "local_blocked_contract_backlog_ready");
assert.equal(contract.claim_boundary.blocked_hro_surface_registry_complete, true);
assert.equal(contract.claim_boundary.workforce_bulk_contract_stub_complete, true);
assert.equal(contract.claim_boundary.performance_learning_contract_stub_complete, true);
assert.equal(contract.claim_boundary.external_owner_gate_pack_complete, true);
assert.equal(contract.claim_boundary.runtime_implementation_complete, false);
assert.equal(contract.claim_boundary.ui_exposure_allowed, false);
assert.equal(contract.claim_boundary.production_ready, false);
assert.equal(contract.claim_boundary.go_live_approved, false);
assert.equal(contract.claim_boundary.enterprise_trust_approved, false);

assert.equal(hroRegistry.policy.fake_ui_exposure_allowed, false);
assert.equal(hroRegistry.policy.external_provider_ready_claim_allowed, false);
assert.equal(hroRegistry.policy.go_live_or_production_approval_claim_allowed, false);
assert.ok(Array.isArray(hroRegistry.blocked_ui_sections) && hroRegistry.blocked_ui_sections.length >= 15);

const blockedSections = new Set(hroRegistry.blocked_ui_sections);
for (const section of contract.blocked_surface_registry.blocked_ui_sections) {
  assert.ok(blockedSections.has(section), `existing HRO registry missing blocked section ${section}`);
}

const featureById = new Map(hroCrosswalk.feature_crosswalk.map((feature) => [feature.id, feature]));
for (const featureId of [
  "workforce-planning-bulk-edit",
  "engagement-learning-performance",
  "equity-benefits-immigration-background"
]) {
  assert.ok(featureById.has(featureId), `crosswalk missing ${featureId}`);
}

const registryContractByFeature = new Map(hroRegistry.contracts.map((item) => [item.feature_id, item]));
assert.equal(registryContractByFeature.get("workforce-planning-bulk-edit")?.lawos_status, "backend_contract_required");
assert.equal(registryContractByFeature.get("engagement-learning-performance")?.lawos_status, "backend_contract_required");
assert.equal(registryContractByFeature.get("equity-benefits-immigration-background")?.lawos_status, "external_owner_decision_required");

assert.ok(contract.contract_stubs.workforce_bulk.routes.length >= 4);
assert.ok(contract.contract_stubs.workforce_bulk.required_boundaries.includes("diff preview before mutation"));
assert.ok(contract.contract_stubs.performance_learning_engagement.domain_objects.includes("PerformanceReview"));
assert.ok(contract.contract_stubs.performance_learning_engagement.domain_objects.includes("LearningAssignment"));
assert.ok(contract.contract_stubs.performance_learning_engagement.domain_objects.includes("EngagementSurvey"));
assert.equal(contract.external_owner_gate.required, true);
assert.ok(contract.external_owner_gate.domains.includes("benefits"));
assert.ok(contract.external_owner_gate.domains.includes("equity"));
assert.ok(contract.external_owner_gate.domains.includes("immigration"));
assert.ok(contract.external_owner_gate.domains.includes("background_checks"));
assert.ok(contract.external_owner_gate.missing_receipts.length >= 6);

const shell = read(shellPath);
const peopleHome = read(peopleHomePath);
const apiClient = read(apiClientPath);
for (const section of blockedSections) {
  assert.equal(shell.includes(`section: "${section}"`), false, `blocked section exposed in Shell: ${section}`);
  assert.equal(peopleHome.includes(`"${section}"`), false, `blocked section exposed in PeopleHome: ${section}`);
  assert.equal(apiClient.includes(section), false, `blocked section exposed in HRX API client: ${section}`);
}

requireText(summaryPath, "No-Fake-Working-UI");
requireText(hroRegisterSummaryPath, "No-Fake-Working-UI Gate");
assert.deepEqual(evidence.scope, contract.scope);
assert.equal(evidence.claim_boundary.blocked_hro_surface_registry_complete, true);
assert.equal(evidence.claim_boundary.runtime_implementation_complete, false);
assert.equal(evidence.claim_boundary.ui_exposure_allowed, false);
assert.equal(evidence.claim_boundary.production_ready, false);
assert.equal(evidence.claim_boundary.enterprise_trust_approved, false);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  scope: contract.scope,
  blocked_ui_section_count: blockedSections.size,
  workforce_bulk_contract_stub_complete: contract.claim_boundary.workforce_bulk_contract_stub_complete,
  performance_learning_contract_stub_complete: contract.claim_boundary.performance_learning_contract_stub_complete,
  external_owner_gate_pack_complete: contract.claim_boundary.external_owner_gate_pack_complete,
  runtime_implementation_complete: contract.claim_boundary.runtime_implementation_complete,
  ui_exposure_allowed: contract.claim_boundary.ui_exposure_allowed,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));
