#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const requiredFiles = [
  "packages/persistence/package.json",
  "packages/persistence/src/index.js",
  "packages/persistence/src/config.js",
  "packages/persistence/src/schema.js",
  "packages/persistence/src/connection.js",
  "packages/persistence/src/migration-runner.js",
  "packages/persistence/src/migrations/index.js",
  "packages/persistence/test/config.test.js",
  "packages/persistence/test/connection.test.js",
  "packages/persistence/test/migration-runner.test.js"
];

const requiredMarkers = [
  ["packages/persistence/src/config.js", /lawos-synthetic:/, /no_production_credentials/, /does not allow production/],
  ["packages/persistence/src/schema.js", /runtime_tenants/, /tenant_id/, /data_residency_policy/],
  ["packages/persistence/src/connection.js", /lawos-synthetic-persistence-connection/, /transaction/, /production_ready_claim: false/],
  ["packages/persistence/src/migration-runner.js", /runRuntimeSpineMigrations/, /dryRun/, /rollbackRuntimeSpineMigrations/],
  ["packages/persistence/src/migrations/index.js", /001_runtime_spine_tenant_base/, /runtime_migration_history/, /rollback_note/],
  ["packages/persistence/test/config.test.js", /rejects production URL/, /inline credentials/],
  ["packages/persistence/test/connection.test.js", /persists tenant base rows across reopen/, /rolls back partial synthetic writes/],
  ["packages/persistence/test/migration-runner.test.js", /idempotently/, /dry-run does not write history/, /rollback only affects synthetic/]
];

const ledger = JSON.parse(readFileSync(path.join(ROOT, "docs/runtime-spine/runtime-spine-ledger.json"), "utf8"));
const evidence = JSON.parse(readFileSync(path.join(ROOT, "docs/runtime-spine/evidence/runtime-spine-evidence-index.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
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

assert(packageJson.scripts?.["runtime-spine:rs1:persistence:validate"] === "node scripts/validate-runtime-spine-rs1-persistence.mjs", "package script runtime-spine:rs1:persistence:validate mismatch");
assert(/packages\/persistence\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/persistence tests");

const rs1 = ledger.spines?.find((spine) => spine.id === "RS-1");
const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
const g6ReadyCandidate = gateMap.get("G6")?.status === "ready_candidate";
assert(["in_progress", "ready_candidate"].includes(rs1?.status), "RS-1 must be in_progress or ready_candidate after RS-1A");
const closed = new Set((rs1?.tuws ?? []).filter((tuw) => tuw.status === "closed").map((tuw) => tuw.id));
for (const id of ["RS-1-T01", "RS-1-T02", "RS-1-T03", "RS-1-T04"]) {
  assert(closed.has(id), `${id}: must be closed for RS-1A`);
}
for (const tuw of rs1?.tuws ?? []) {
  if (closed.has(tuw.id)) {
    assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: closed TUW needs evidence refs`);
    assert(tuw.loop_stage === "act", `${tuw.id}: closed TUW loop_stage must be act`);
  }
}
assert(["in_progress", "ready_candidate"].includes(ledger.gates?.find((gate) => gate.id === "G1")?.status), "G1 must be in_progress or ready_candidate after RS-1A");
assert(ledger.runtime_ready_candidate_claim === g6ReadyCandidate, "RS-1A runtime_ready_candidate_claim must match G6 ready state");
assert(ledger.actual_launch_go_live_claim === false, "RS-1A must not claim actual launch/go-live");
assert(evidence.latest_rs1a_validation?.status === "passed", "RS-1A evidence summary must be recorded as passed");

if (errors.length > 0) {
  console.error("Runtime Spine RS-1 persistence validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-1 persistence validation passed.");
console.log("closed_tuws: RS-1-T01,RS-1-T02,RS-1-T03,RS-1-T04");
console.log("synthetic_only: true");
console.log("production_ready_claim: false");
console.log(`runtime_ready_candidate_claim: ${g6ReadyCandidate}`);
