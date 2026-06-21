#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G5_EVIDENCE_PATH = "docs/runtime-spine/evidence/g5-app-runtime-evidence.json";

const requiredFiles = [
  "packages/runtime-surface/package.json",
  "packages/runtime-surface/src/route-catalog.js",
  "packages/runtime-surface/src/service.js",
  "packages/runtime-surface/src/ui-client.js",
  "packages/runtime-surface/src/permission-matrix.js",
  "packages/runtime-surface/src/smoke-flow.js",
  "packages/runtime-surface/test/api-surface.test.js",
  "packages/runtime-surface/test/permission-audit.test.js",
  "packages/runtime-surface/test/ui-client.test.js",
  "packages/runtime-surface/test/smoke-flow.test.js",
  G5_EVIDENCE_PATH
];

const requiredMarkers = [
  ["packages/runtime-surface/src/route-catalog.js", /session\.read/, /matter_document\.link/, /vault\.export/, /feature\.locks/],
  ["packages/runtime-surface/src/service.js", /createRuntimeSurfaceService/, /permission_context_id/, /createRuntimeAuditMiddleware/, /production_ready_claim/],
  ["packages/runtime-surface/src/ui-client.js", /createRuntimeSurfaceUiClient/, /denied/, /review_required/],
  ["packages/runtime-surface/src/permission-matrix.js", /RUNTIME_SURFACE_FEATURE_LOCKS/, /hr_real_data/, /vault_sync/],
  ["packages/runtime-surface/src/smoke-flow.js", /runRuntimeSurfaceSmoke/, /actual_launch_go_live_claim/],
  ["packages/runtime-surface/test/api-surface.test.js", /client, matter, member, people, party, document, task, issue, wiki, and vault routes/],
  ["packages/runtime-surface/test/permission-audit.test.js", /route coverage includes read write permission export/],
  ["packages/runtime-surface/test/ui-client.test.js", /locked future domains/],
  ["packages/runtime-surface/test/smoke-flow.test.js", /without launch claim/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g5Evidence = readJson(G5_EVIDENCE_PATH);
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

assert(packageJson.scripts?.["runtime-spine:rs5:app-surface:validate"] === "node scripts/validate-runtime-spine-rs5-app-surface.mjs", "package script runtime-spine:rs5:app-surface:validate mismatch");
assert(/packages\/runtime-surface\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/runtime-surface tests");

const runtimeSurface = await import(pathToFileURL(path.join(ROOT, "packages/runtime-surface/src/index.js")).href);
const coverage = runtimeSurface.runRuntimeSurfaceSmoke();
assert(coverage.ok === true, "runtime surface smoke flow must pass");
assert(coverage.audit_event_count >= 7, "runtime surface smoke flow must write audit events");
assert(runtimeSurface.RUNTIME_SURFACE_ROUTE_CATALOG.length >= 23, "runtime surface route catalog must cover app surface routes");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
const g6ReadyCandidate = gateMap.get("G6")?.status === "ready_candidate";
assert(gateMap.get("G4")?.status === "ready_candidate", "G4 must remain ready_candidate before G5");
assert(gateMap.get("G5")?.status === "ready_candidate", "G5 must be ready_candidate after RS-5 closeout");
for (const gate of ledger.gates ?? []) {
  if (!["G0", "G1", "G2", "G3", "G4", "G5", "G6"].includes(gate.id)) {
    assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate`);
  }
}

const rs5 = ledger.spines?.find((spine) => spine.id === "RS-5");
assert(rs5?.status === "ready_candidate", "RS-5 must be ready_candidate");
const rs5Tuws = rs5?.tuws ?? [];
assert(rs5Tuws.length === 30, `RS-5 must keep 30 TUWs, got ${rs5Tuws.length}`);
for (const tuw of rs5Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G5 ready candidate`);
  assert(tuw.loop_stage === "act", `${tuw.id}: loop_stage must be act`);
  assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: missing evidence refs`);
}

const prematureClosed = (ledger.spines ?? [])
  .filter((spine) => !["RS-PRE", "RS-1", "RS-2", "RS-3", "RS-4", "RS-5", ...(g6ReadyCandidate ? ["RS-6"] : [])].includes(spine.id))
  .flatMap((spine) => (spine.tuws ?? []).filter((tuw) => tuw.status === "closed").map((tuw) => tuw.id));
assert(prematureClosed.length === 0, `RS-6 TUWs must remain planned: ${prematureClosed.join(", ")}`);

const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
if (g6ReadyCandidate) {
  for (const rtg of ["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"]) assert(rtgById.get(rtg)?.status === "passed", `${rtg} must be passed at G6`);
} else {
  assert(rtgById.get("RTG-001")?.status === "partial", "RTG-001 must remain partial until G6");
  assert(rtgById.get("RTG-002")?.status === "partial", "RTG-002 must remain partial until G6");
  assert(rtgById.get("RTG-003")?.status === "partial", "RTG-003 must remain partial until G6");
  assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must remain guarded");
  assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must remain guarded until G6 responsibility evidence");
}

assert(ledger.runtime_ready_candidate_claim === g6ReadyCandidate, "ledger runtime_ready_candidate_claim must match G6 ready state");
assert(ledger.actual_launch_go_live_claim === false, "G5 must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs5_validation?.status === "passed", "RS-5 evidence summary must be passed");
assert(g5Evidence.scope?.synthetic_only === true, "G5 evidence must remain synthetic-only");
assert(g5Evidence.scope?.runtime_ready_candidate === false, "G5 evidence must not claim runtime_ready candidate");
assert(g5Evidence.scope?.actual_launch_go_live_claim === false, "G5 evidence must not claim actual launch/go-live");
assert(g5Evidence.scope?.portal_m365_hr_real_data_ai_vault_sync_locked === true, "future domains must remain locked");
assert(Object.values(g5Evidence.latest_results ?? {}).every((result) => typeof result === "string" && !result.includes("pending_current_pr_run")), "G5 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-5 app surface validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-5 app surface validation passed.");
console.log("g5_status: ready_candidate");
console.log("rs5_closed_tuws: 30");
console.log(`runtime_ready_candidate_claim: ${g6ReadyCandidate}`);
