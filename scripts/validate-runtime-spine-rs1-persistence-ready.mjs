#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G1_EVIDENCE_PATH = "docs/runtime-spine/evidence/g1-persistence-evidence.json";

const requiredFiles = [
  "packages/persistence/src/residency.js",
  "packages/persistence/src/backup.js",
  "packages/persistence/test/residency-backup.test.js",
  "packages/persistence/test/tenant-isolation.test.js",
  G1_EVIDENCE_PATH
];

const requiredMarkers = [
  ["packages/persistence/src/residency.js", /createDataResidencyMetadata/, /assertTenantResidency/, /client-confidential/],
  ["packages/persistence/src/backup.js", /createPersistenceBackup/, /restorePersistenceBackup/, /synthetic-only/],
  ["packages/persistence/src/schema.js", /residency_region/, /data_residency_policy/, /data_classification/],
  ["packages/persistence/test/residency-backup.test.js", /Backup and restore are synthetic-only/, /tenant policy mismatches/],
  ["packages/persistence/test/tenant-isolation.test.js", /backup leakage/, /shared-key/, /repository.get/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g1Evidence = readJson(G1_EVIDENCE_PATH);
const packageJson = readJson("package.json");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of requiredFiles) {
  assert(existsSync(path.join(ROOT, file)), `${file}: missing`);
}

for (const [file, ...patterns] of requiredMarkers) {
  if (!existsSync(path.join(ROOT, file))) continue;
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) assert(pattern.test(source), `${file}: missing ${pattern}`);
}

assert(packageJson.scripts?.["runtime-spine:rs1:persistence-ready:validate"] === "node scripts/validate-runtime-spine-rs1-persistence-ready.mjs", "package script runtime-spine:rs1:persistence-ready:validate mismatch");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
assert(gateMap.get("G1")?.status === "ready_candidate", "G1 must be ready_candidate after RS-1 closeout");
for (const gate of ledger.gates ?? []) {
  if (!["G0", "G1"].includes(gate.id)) {
    assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate`);
  }
}

const rs1 = ledger.spines?.find((spine) => spine.id === "RS-1");
assert(rs1?.status === "ready_candidate", "RS-1 must be ready_candidate");
const rs1Tuws = rs1?.tuws ?? [];
assert(rs1Tuws.length === 14, `RS-1 must keep 14 TUWs, got ${rs1Tuws.length}`);
for (const tuw of rs1Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G1 ready candidate`);
  assert(tuw.loop_stage === "act", `${tuw.id}: loop_stage must be act`);
  assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: missing evidence refs`);
}

const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
assert(rtgById.get("RTG-001")?.status === "partial", "RTG-001 must remain partial until G6");
assert(rtgById.get("RTG-002")?.status === "partial", "RTG-002 must remain partial until G6");
assert(rtgById.get("RTG-003")?.status === "partial", "RTG-003 must remain partial until G6");
assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must remain guarded");
assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must remain guarded");

assert(ledger.runtime_ready_candidate_claim === false, "G1 must not claim runtime_ready candidate");
assert(ledger.actual_launch_go_live_claim === false, "G1 must not claim actual launch/go-live");
assert(evidenceIndex.runtime_ready_candidate === false, "evidence index must not claim runtime_ready candidate");
assert(evidenceIndex.actual_launch_go_live_claim === false, "evidence index must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs1c_validation?.status === "passed", "RS-1C evidence summary must be passed");

assert(g1Evidence.status === "ready_candidate", "G1 evidence packet must be ready_candidate");
assert(g1Evidence.scope?.synthetic_only === true, "G1 evidence must remain synthetic-only");
assert(g1Evidence.scope?.production_db_approved === false, "G1 evidence must not approve production DB");
assert(g1Evidence.scope?.real_tenant_data_allowed === false, "G1 evidence must not allow real tenant data");
assert(g1Evidence.scope?.runtime_ready_candidate === false, "G1 evidence must not claim runtime_ready candidate");
assert(g1Evidence.scope?.actual_launch_go_live_claim === false, "G1 evidence must not claim actual launch/go-live");
assert((g1Evidence.closed_tuws ?? []).length === 14, "G1 evidence must list all 14 RS-1 TUWs");
assert(Object.values(g1Evidence.latest_results ?? {}).every((result) => typeof result === "string" && !result.includes("pending_current_pr_run")), "G1 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-1 persistence-ready validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-1 persistence-ready validation passed.");
console.log("g1_status: ready_candidate");
console.log("rs1_closed_tuws: 14");
console.log("runtime_ready_candidate_claim: false");
