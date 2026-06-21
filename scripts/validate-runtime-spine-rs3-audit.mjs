#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G3_EVIDENCE_PATH = "docs/runtime-spine/evidence/g3-audit-evidence.json";

const requiredFiles = [
  "packages/audit/src/runtime-taxonomy.js",
  "packages/audit/src/runtime-writer.js",
  "packages/audit/src/runtime-middleware.js",
  "packages/audit/src/runtime-reader.js",
  "packages/audit/src/runtime-immutability.js",
  "packages/audit/src/runtime-route-coverage.js",
  "packages/audit/test/runtime-audit-writer.test.js",
  "packages/audit/test/runtime-audit-middleware.test.js",
  "packages/audit/test/runtime-audit-read-retention.test.js",
  "packages/audit/test/runtime-route-coverage.test.js",
  G3_EVIDENCE_PATH
];

const requiredMarkers = [
  ["packages/audit/src/runtime-writer.js", /createRuntimeAuditWriter/, /permission_context_id is required/, /server-derived principal/],
  ["packages/audit/src/runtime-middleware.js", /recordRead/, /recordWrite/, /recordPermission/, /recordExport/],
  ["packages/audit/src/runtime-reader.js", /raw_payload_included: false/, /tenant mismatch/],
  ["packages/audit/src/runtime-immutability.js", /append-only/, /sha256/],
  ["packages/audit/src/runtime-route-coverage.js", /scanRuntimeRouteAuditCoverage/, /audit_required_false/],
  ["packages/audit/test/runtime-audit-writer.test.js", /hash-chain events idempotently/, /missing permission context/],
  ["packages/audit/test/runtime-audit-middleware.test.js", /non-bypassable/, /permission evaluations/],
  ["packages/audit/test/runtime-audit-read-retention.test.js", /human approval/, /raw payloads/],
  ["packages/audit/test/runtime-route-coverage.test.js", /fails when route audit is bypassable/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g3Evidence = readJson(G3_EVIDENCE_PATH);
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

assert(packageJson.scripts?.["runtime-spine:rs3:audit:validate"] === "node scripts/validate-runtime-spine-rs3-audit.mjs", "package script runtime-spine:rs3:audit:validate mismatch");
assert(/packages\/audit\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/audit tests");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
assert(gateMap.get("G2")?.status === "ready_candidate", "G2 must remain ready_candidate before G3");
assert(gateMap.get("G3")?.status === "ready_candidate", "G3 must be ready_candidate after RS-3 closeout");
for (const gate of ledger.gates ?? []) {
  if (!["G0", "G1", "G2", "G3", "G4"].includes(gate.id)) {
    assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate`);
  }
}

const rs3 = ledger.spines?.find((spine) => spine.id === "RS-3");
assert(rs3?.status === "ready_candidate", "RS-3 must be ready_candidate");
const rs3Tuws = rs3?.tuws ?? [];
assert(rs3Tuws.length === 15, `RS-3 must keep 15 TUWs, got ${rs3Tuws.length}`);
for (const tuw of rs3Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G3 ready candidate`);
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

assert(ledger.runtime_ready_candidate_claim === false, "G3 must not claim runtime_ready candidate");
assert(ledger.actual_launch_go_live_claim === false, "G3 must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs3_validation?.status === "passed", "RS-3 evidence summary must be passed");
assert(g3Evidence.scope?.synthetic_only === true, "G3 evidence must remain synthetic-only");
assert(g3Evidence.scope?.audit_bypass_allowed === false, "G3 evidence must not allow audit bypass");
assert(g3Evidence.scope?.raw_payload_export_allowed === false, "G3 evidence must not allow raw payload export");
assert(g3Evidence.scope?.runtime_ready_candidate === false, "G3 evidence must not claim runtime_ready candidate");
assert(g3Evidence.scope?.actual_launch_go_live_claim === false, "G3 evidence must not claim actual launch/go-live");
assert(Object.values(g3Evidence.latest_results ?? {}).every((result) => typeof result === "string" && !result.includes("pending_current_pr_run")), "G3 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-3 audit validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-3 audit validation passed.");
console.log("g3_status: ready_candidate");
console.log("rs3_closed_tuws: 15");
console.log("runtime_ready_candidate_claim: false");
