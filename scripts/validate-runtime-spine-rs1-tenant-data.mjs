#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const requiredFiles = [
  "packages/persistence/src/id.js",
  "packages/persistence/src/lifecycle.js",
  "packages/persistence/src/repository.js",
  "packages/persistence/src/idempotency.js",
  "packages/persistence/src/outbox.js",
  "packages/persistence/src/transaction.js",
  "packages/persistence/test/id.test.js",
  "packages/persistence/test/repository.test.js",
  "packages/persistence/test/idempotency-outbox.test.js"
];

const requiredMarkers = [
  ["packages/persistence/src/id.js", /createStableRuntimeId/, /tenantId/, /sha256/],
  ["packages/persistence/src/repository.js", /createTenantScopedRepository/, /tenant_id is required/, /softDelete/],
  ["packages/persistence/src/idempotency.js", /createIdempotencyService/, /request_hash/, /different request hash/],
  ["packages/persistence/src/outbox.js", /appendOutboxEvent/, /listPendingOutboxEvents/, /tenant_id is required/],
  ["packages/persistence/src/lifecycle.js", /applyLifecycleFields/, /deleted_at/, /retention_class/],
  ["packages/persistence/src/transaction.js", /runPersistenceTransaction/],
  ["packages/persistence/src/schema.js", /runtime_records/, /runtime_idempotency_keys/, /runtime_outbox_events/],
  ["packages/persistence/test/repository.test.js", /prevents cross-tenant reads/, /lifecycle hides deleted rows/],
  ["packages/persistence/test/idempotency-outbox.test.js", /replays duplicate requests/, /rolls back repository and outbox writes atomically/]
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

assert(packageJson.scripts?.["runtime-spine:rs1:tenant-data:validate"] === "node scripts/validate-runtime-spine-rs1-tenant-data.mjs", "package script runtime-spine:rs1:tenant-data:validate mismatch");

const rs1 = ledger.spines?.find((spine) => spine.id === "RS-1");
const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
const g6ReadyCandidate = gateMap.get("G6")?.status === "ready_candidate";
assert(["in_progress", "ready_candidate"].includes(rs1?.status), "RS-1 must be in_progress or ready_candidate after RS-1B");
const closed = new Set((rs1?.tuws ?? []).filter((tuw) => tuw.status === "closed").map((tuw) => tuw.id));
for (const id of ["RS-1-T05", "RS-1-T06", "RS-1-T07", "RS-1-T08", "RS-1-T09", "RS-1-T10"]) {
  assert(closed.has(id), `${id}: must be closed for RS-1B`);
}
if (g6ReadyCandidate) {
  assert(ledger.rtg_summary?.find((rtg) => rtg.id === "RTG-002")?.status === "passed", "RTG-002 must be passed at G6");
  assert(ledger.rtg_summary?.find((rtg) => rtg.id === "RTG-003")?.status === "passed", "RTG-003 must be passed at G6");
} else {
  assert(ledger.rtg_summary?.find((rtg) => rtg.id === "RTG-002")?.status === "partial", "RTG-002 must be partial after tenant-scoped repository negative tests");
  assert(ledger.rtg_summary?.find((rtg) => rtg.id === "RTG-003")?.status === "partial", "RTG-003 must be partial after outbox transaction tests");
}
assert(ledger.runtime_ready_candidate_claim === g6ReadyCandidate, "RS-1B runtime_ready_candidate_claim must match G6 ready state");
assert(ledger.actual_launch_go_live_claim === false, "RS-1B must not claim actual launch/go-live");
assert(evidence.latest_rs1b_validation?.status === "passed", "RS-1B evidence summary must be recorded as passed");

if (errors.length > 0) {
  console.error("Runtime Spine RS-1 tenant data validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-1 tenant data validation passed.");
console.log("closed_tuws: RS-1-T05,RS-1-T06,RS-1-T07,RS-1-T08,RS-1-T09,RS-1-T10");
console.log("tenant_scoped_repository: true");
console.log(`runtime_ready_candidate_claim: ${g6ReadyCandidate}`);
