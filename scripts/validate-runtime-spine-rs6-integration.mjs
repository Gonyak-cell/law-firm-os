#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G6_EVIDENCE_PATH = "docs/runtime-spine/evidence/g6-runtime-ready-evidence.json";
const RTG005_MAP_PATH = "docs/runtime-spine/rtg-005-responsibility-map.md";

const requiredFiles = [
  "packages/runtime-integration/package.json",
  "packages/runtime-integration/src/factory.js",
  "packages/runtime-integration/src/harness.js",
  "packages/runtime-integration/src/readiness-report.js",
  "packages/runtime-integration/src/responsibility-map.js",
  "packages/runtime-integration/test/harness.test.js",
  "packages/runtime-integration/test/security-boundary.test.js",
  "packages/runtime-integration/test/readiness-report.test.js",
  G6_EVIDENCE_PATH,
  RTG005_MAP_PATH
];

const requiredMarkers = [
  ["packages/runtime-integration/src/factory.js", /RUNTIME_INTEGRATION_SANDBOX_ATTESTATION/, /real_tenant_data_allowed: false/],
  ["packages/runtime-integration/src/harness.js", /runTenantIsolationE2E/, /runAuthzE2E/, /runAuditChainE2E/, /runMigrationResetSuite/],
  ["packages/runtime-integration/src/readiness-report.js", /runtime_ready_candidate/, /actual_launch_go_live_claim: false/],
  ["packages/runtime-integration/src/responsibility-map.js", /RTG-005/, /qa_owner/],
  ["packages/runtime-integration/test/harness.test.js", /RTG gates/],
  ["packages/runtime-integration/test/security-boundary.test.js", /safe error suites fail closed/],
  ["packages/runtime-integration/test/readiness-report.test.js", /separates repo runtime-ready candidate from launch approval/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g6Evidence = readJson(G6_EVIDENCE_PATH);
const packageJson = readJson("package.json");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of requiredFiles) assert(existsSync(path.join(ROOT, file)), `${file}: missing`);
for (const [file, ...patterns] of requiredMarkers) {
  if (!existsSync(path.join(ROOT, file))) continue;
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) assert(pattern.test(source), `${file}: missing ${pattern}`);
}

assert(packageJson.scripts?.["runtime-spine:rs6:integration:validate"] === "node scripts/validate-runtime-spine-rs6-integration.mjs", "package script runtime-spine:rs6:integration:validate mismatch");
assert(/packages\/runtime-integration\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/runtime-integration tests");

const integration = await import(pathToFileURL(path.join(ROOT, "packages/runtime-integration/src/index.js")).href);
const result = integration.runRuntimeIntegrationHarness();
const report = integration.createRuntimeReadyEvidenceReport(result);
assert(result.ok === true, "runtime integration harness must pass");
assert(result.checks.length === 20, `runtime integration harness must close 20 checks, got ${result.checks.length}`);
assert(result.runtime_ready_candidate === true, "G6 harness must claim repo runtime-ready candidate");
assert(result.production_ready_claim === false, "G6 harness must not claim production_ready");
assert(result.actual_launch_go_live_claim === false, "G6 harness must not claim actual launch/go-live");
assert(result.sandbox_attestation?.synthetic_only === true, "G6 harness must remain synthetic-only");
assert(result.sandbox_attestation?.real_tenant_data_allowed === false, "G6 harness must block real tenant data");
assert(result.audit_event_count >= 15, "G6 harness must append audit evidence");
assert(report.runtime_ready_candidate === true, "G6 report must claim repo runtime-ready candidate");
assert(report.actual_launch_go_live_claim === false, "G6 report must not claim launch/go-live");

for (const rtg of ["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"]) {
  assert(result.rtg_results?.[rtg]?.status === "passed", `${rtg}: harness result must be passed`);
}
assert(integration.validateRuntimeIntegrationResponsibilityMap().ok === true, "RTG responsibility map must be complete");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
for (const gate of ["G1", "G2", "G3", "G4", "G5", "G6"]) {
  assert(gateMap.get(gate)?.status === "ready_candidate", `${gate} must be ready_candidate`);
}

const rs6 = ledger.spines?.find((spine) => spine.id === "RS-6");
assert(rs6?.status === "ready_candidate", "RS-6 must be ready_candidate");
const rs6Tuws = rs6?.tuws ?? [];
assert(rs6Tuws.length === 20, `RS-6 must keep 20 TUWs, got ${rs6Tuws.length}`);
for (const tuw of rs6Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G6 ready candidate`);
  assert(tuw.loop_stage === "act", `${tuw.id}: loop_stage must be act`);
  assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: missing evidence refs`);
}

const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
for (const rtg of ["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"]) {
  assert(rtgById.get(rtg)?.status === "passed", `${rtg}: ledger status must be passed at G6`);
}

assert(ledger.runtime_ready_candidate_claim === true, "G6 must set repo runtime_ready_candidate_claim true");
assert(ledger.actual_launch_go_live_claim === false, "G6 must not claim actual launch/go-live");
assert(evidenceIndex.runtime_ready_candidate === true, "evidence index must set runtime_ready_candidate true at G6");
assert(evidenceIndex.actual_launch_go_live_claim === false, "evidence index must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs6_validation?.status === "passed", "RS-6 evidence summary must be passed");
assert(g6Evidence.scope?.synthetic_only === true, "G6 evidence must remain synthetic-only");
assert(g6Evidence.scope?.repo_runtime_ready_candidate === true, "G6 evidence must claim repo runtime-ready candidate");
assert(g6Evidence.scope?.production_ready_claim === false, "G6 evidence must not claim production-ready");
assert(g6Evidence.scope?.actual_launch_go_live_claim === false, "G6 evidence must not claim actual launch/go-live");
assert(g6Evidence.scope?.portal_m365_hr_real_data_ai_vault_sync_locked === true, "future domains must remain locked");
assert((g6Evidence.closed_tuws ?? []).length === 20, "G6 evidence must list all 20 RS-6 TUWs");
assert(Object.values(g6Evidence.latest_results ?? {}).every((entry) => typeof entry === "string" && !entry.includes("pending_current_pr_run")), "G6 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-6 integration validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-6 integration validation passed.");
console.log("g6_status: ready_candidate");
console.log("rs6_closed_tuws: 20");
console.log("runtime_ready_candidate_claim: true");
console.log("actual_launch_go_live_claim: false");
