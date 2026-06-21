#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G4_EVIDENCE_PATH = "docs/runtime-spine/evidence/g4-canonical-model-evidence.json";
const GLOSSARY_PATH = "docs/runtime-spine/canonical-object-glossary.json";

const requiredFiles = [
  "packages/runtime-model/package.json",
  "packages/runtime-model/src/schema-registry.js",
  "packages/runtime-model/src/validators.js",
  "packages/runtime-model/src/relationships.js",
  "packages/runtime-model/src/fixtures.js",
  "packages/runtime-model/src/migration-compatibility.js",
  "packages/runtime-model/test/schema-registry.test.js",
  "packages/runtime-model/test/canonical-records.test.js",
  "packages/runtime-model/test/relationship-registry.test.js",
  "packages/runtime-model/test/seed-fixture-migration.test.js",
  GLOSSARY_PATH,
  G4_EVIDENCE_PATH
];

const requiredMarkers = [
  ["packages/runtime-model/src/schema-registry.js", /TenantMembership/, /ClassificationEnvelope/, /CANONICAL_MODEL_TUW_OBJECT_MAP/],
  ["packages/runtime-model/src/validators.js", /validateCanonicalDataset/, /writes_product_state: false/, /creates_database_rows: false/],
  ["packages/runtime-model/src/relationships.js", /CANONICAL_RELATIONSHIP_REGISTRY/, /matter.document/, /document.version/],
  ["packages/runtime-model/src/fixtures.js", /CANONICAL_SEED_FIXTURE/, /validateCanonicalDataset/],
  ["packages/runtime-model/src/migration-compatibility.js", /assertCanonicalMigrationCompatibility/, /mapMasterDataRecordToCanonical/, /mapDmsRecordToCanonical/],
  ["packages/runtime-model/test/schema-registry.test.js", /RS-4 objects and TUWs/],
  ["packages/runtime-model/test/canonical-records.test.js", /fail closed/, /Classification envelope/],
  ["packages/runtime-model/test/seed-fixture-migration.test.js", /Migration compatibility/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g4Evidence = readJson(G4_EVIDENCE_PATH);
const glossary = readJson(GLOSSARY_PATH);
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

assert(packageJson.scripts?.["runtime-spine:rs4:canonical-model:validate"] === "node scripts/validate-runtime-spine-rs4-canonical-model.mjs", "package script runtime-spine:rs4:canonical-model:validate mismatch");
assert(/packages\/runtime-model\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/runtime-model tests");

const runtimeModel = await import(pathToFileURL(path.join(ROOT, "packages/runtime-model/src/index.js")).href);
assert(runtimeModel.requiredCanonicalObjectTypes().length === 25, "canonical model must expose 25 object types");
assert(runtimeModel.validateCanonicalDataset(runtimeModel.CANONICAL_SEED_FIXTURE).ok === true, "canonical seed fixture must validate");
assert(runtimeModel.validateCanonicalRelationshipRegistry().ok === true, "canonical relationship registry must validate");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
assert(gateMap.get("G3")?.status === "ready_candidate", "G3 must remain ready_candidate before G4");
assert(gateMap.get("G4")?.status === "ready_candidate", "G4 must be ready_candidate after RS-4 closeout");
for (const gate of ledger.gates ?? []) {
  if (!["G0", "G1", "G2", "G3", "G4"].includes(gate.id)) {
    assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate`);
  }
}

const rs4 = ledger.spines?.find((spine) => spine.id === "RS-4");
assert(rs4?.status === "ready_candidate", "RS-4 must be ready_candidate");
const rs4Tuws = rs4?.tuws ?? [];
assert(rs4Tuws.length === 20, `RS-4 must keep 20 TUWs, got ${rs4Tuws.length}`);
for (const tuw of rs4Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G4 ready candidate`);
  assert(tuw.loop_stage === "act", `${tuw.id}: loop_stage must be act`);
  assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: missing evidence refs`);
}

const prematureClosed = (ledger.spines ?? [])
  .filter((spine) => !["RS-PRE", "RS-1", "RS-2", "RS-3", "RS-4"].includes(spine.id))
  .flatMap((spine) => (spine.tuws ?? []).filter((tuw) => tuw.status === "closed").map((tuw) => tuw.id));
assert(prematureClosed.length === 0, `RS-5 through RS-6 TUWs must remain planned: ${prematureClosed.join(", ")}`);

const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
assert(rtgById.get("RTG-001")?.status === "partial", "RTG-001 must remain partial until G6");
assert(rtgById.get("RTG-002")?.status === "partial", "RTG-002 must remain partial until G6");
assert(rtgById.get("RTG-003")?.status === "partial", "RTG-003 must remain partial until G6");
assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must remain guarded");
assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must remain guarded");

assert(ledger.runtime_ready_candidate_claim === false, "G4 must not claim runtime_ready candidate");
assert(ledger.actual_launch_go_live_claim === false, "G4 must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs4_validation?.status === "passed", "RS-4 evidence summary must be passed");
assert(glossary.object_count === 25, "canonical glossary must record 25 objects");
assert(g4Evidence.scope?.synthetic_only === true, "G4 evidence must remain synthetic-only");
assert(g4Evidence.scope?.production_data_model_migration_approved === false, "G4 evidence must not approve production migration");
assert(g4Evidence.scope?.runtime_ready_candidate === false, "G4 evidence must not claim runtime_ready candidate");
assert(g4Evidence.scope?.actual_launch_go_live_claim === false, "G4 evidence must not claim actual launch/go-live");
assert(Object.values(g4Evidence.latest_results ?? {}).every((result) => typeof result === "string" && !result.includes("pending_current_pr_run")), "G4 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-4 canonical model validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-4 canonical model validation passed.");
console.log("g4_status: ready_candidate");
console.log("rs4_closed_tuws: 20");
console.log("runtime_ready_candidate_claim: false");
