#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGE_PATH = "package.json";
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const CROSSWALK_PATH = "docs/runtime-spine/launch-tuw-crosswalk.json";
const CROSSWALK_DOC_PATH = "docs/runtime-spine/launch-tuw-crosswalk.md";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G6_EVIDENCE_PATH = "docs/runtime-spine/evidence/g6-runtime-ready-evidence.json";
const RS6_HARNESS_PATH = "packages/runtime-integration/src/harness.js";
const RS6_VALIDATOR_PATH = "scripts/validate-runtime-spine-rs6-integration.mjs";
const W07_PACKET_PATH = "docs/goal-closeout/lt-l2-w07/packet.json";

const expectedSpines = ["RS-PRE", "RS-1", "RS-2", "RS-3", "RS-4", "RS-5", "RS-6"];
const expectedLaunchBlockers = ["LT-L2-W01", "LT-L2-W02", "LT-L2-W03", "LT-L2-W07"];
const requiredFiles = [
  PACKAGE_PATH,
  LEDGER_PATH,
  CROSSWALK_PATH,
  CROSSWALK_DOC_PATH,
  EVIDENCE_INDEX_PATH,
  G6_EVIDENCE_PATH,
  RS6_HARNESS_PATH,
  RS6_VALIDATOR_PATH,
  "docs/goal-closeout/lt-l2-w01/packet.json",
  "docs/goal-closeout/lt-l2-w02/packet.json",
  "docs/goal-closeout/lt-l2-w03/packet.json",
  W07_PACKET_PATH
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

function includesAll(values, expected) {
  return expected.every((value) => values.includes(value));
}

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

for (const file of requiredFiles) {
  assert(existsSync(path.join(ROOT, file)), `${file}: missing`);
}

const packageJson = readJson(PACKAGE_PATH);
const ledger = readJson(LEDGER_PATH);
const crosswalk = readJson(CROSSWALK_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g6Evidence = readJson(G6_EVIDENCE_PATH);

assert(
  packageJson.scripts?.["runtime-spine:launch-crosswalk:validate"] === "node scripts/validate-runtime-spine-launch-crosswalk.mjs",
  "package script runtime-spine:launch-crosswalk:validate mismatch",
);

assert(crosswalk.schema_version === "law-firm-os.runtime-spine.launch-tuw-crosswalk.v0.1", "crosswalk schema mismatch");
assert(crosswalk.scope?.crosswalk_type === "boundary_reconciliation", "crosswalk must be boundary reconciliation only");
assert(crosswalk.scope?.repo_runtime_ready_candidate === true, "crosswalk must preserve repo runtime-ready candidate");
assert(crosswalk.scope?.final_go_live_approval_recorded === true, "crosswalk must record final go-live approval receipt");
assert(crosswalk.scope?.lt_terminal_closeout_claim === false, "crosswalk must not claim LT terminal closeout");
assert(crosswalk.scope?.launch_go_live_terminal_claim === false, "crosswalk must not claim launch/go-live terminal closeout");
assert(crosswalk.scope?.cutover_execution_completed === false, "crosswalk must not claim cutover execution");
assert(crosswalk.scope?.production_ready_claim === false, "crosswalk must not claim production-ready");
assert(crosswalk.scope?.crosswalk_replaces_rs_implementation === false, "crosswalk must not replace RS implementation");
assert(crosswalk.scope?.crosswalk_closes_launch_tuws === false, "crosswalk must not close Launch TUWs");
assert(crosswalk.scope?.launch_packets_remain_authoritative_for_launch_closeout === true, "Launch packets must remain authoritative");

for (const source of crosswalk.source_refs ?? []) {
  assert(existsSync(path.join(ROOT, source)), `${source}: crosswalk source ref missing`);
}

const mappings = crosswalk.mappings ?? [];
const mappingIds = mappings.map((mapping) => mapping.runtime_spine);
assert(mappings.length === expectedSpines.length, `crosswalk must map ${expectedSpines.length} spines`);
assert(includesAll(mappingIds, expectedSpines), `crosswalk missing expected spine mapping: ${expectedSpines.filter((id) => !mappingIds.includes(id)).join(", ")}`);
for (const mapping of mappings) {
  assert(mapping.implementation_gate === "repo_runtime_ready_candidate" || mapping.implementation_gate === "repo_evidence_only", `${mapping.runtime_spine}: invalid implementation gate`);
  assert(typeof mapping.lt_terminal_effect === "string" && !mapping.lt_terminal_effect.includes("closes"), `${mapping.runtime_spine}: launch terminal effect must not close LT`);
}

const mappingById = new Map(mappings.map((mapping) => [mapping.runtime_spine, mapping]));
assert(includesAll(mappingById.get("RS-1")?.launch_tuw_targets ?? [], ["LT-L2-W01"]), "RS-1 must map to LT-L2-W01");
assert(includesAll(mappingById.get("RS-2")?.launch_tuw_targets ?? [], ["LT-L2-W02"]), "RS-2 must map to LT-L2-W02");
assert(includesAll(mappingById.get("RS-3")?.launch_tuw_targets ?? [], ["LT-L2-W01", "LT-L2-W03", "LT-L5", "LT-L8"]), "RS-3 must map to audit/write launch targets");
assert(includesAll(mappingById.get("RS-4")?.launch_tuw_targets ?? [], ["LT-L2-W03", "LT-L4", "LT-L6"]), "RS-4 must map to canonical/UI launch targets");
assert(includesAll(mappingById.get("RS-5")?.launch_tuw_targets ?? [], ["LT-L2-W03", "LT-L4", "LT-L6"]), "RS-5 must map to app surface launch targets");
assert(includesAll(mappingById.get("RS-6")?.launch_tuw_targets ?? [], ["LT-L2-W07", "LT-L5", "LT-L8"]), "RS-6 must map to runtime integration/security/launch targets");

assert(ledger.runtime_ready_candidate_claim === true, "ledger must keep repo runtime_ready_candidate_claim true");
assert(ledger.actual_launch_go_live_claim === false, "ledger must keep actual_launch_go_live_claim false");
assert(ledger.final_go_live_approval_recorded === true, "ledger must record final go-live approval receipt");
assert(evidenceIndex.runtime_ready_candidate === true, "evidence index must keep runtime_ready_candidate true");
assert(evidenceIndex.actual_launch_go_live_claim === false, "evidence index must keep actual_launch_go_live_claim false");
assert(evidenceIndex.final_go_live_approval_recorded === true, "evidence index must record final go-live approval receipt");
assert(evidenceIndex.lt_terminal_closeout_claim === false, "evidence index must keep LT terminal closeout false");
assert(evidenceIndex.launch_go_live_terminal_claim === false, "evidence index must keep launch terminal false");
assert(evidenceIndex.launch_tuw_boundary?.repo_runtime_ready_candidate_is_launch_terminal_closeout === false, "evidence index must separate runtime ready from launch terminal");
assert(includesAll(evidenceIndex.launch_tuw_boundary?.blocked_goal_closeout_packets ?? [], expectedLaunchBlockers), "evidence index must list launch blocker packets");
assert((evidenceIndex.documents ?? []).includes(CROSSWALK_PATH), "evidence index documents must include crosswalk JSON");
assert((evidenceIndex.documents ?? []).includes(CROSSWALK_DOC_PATH), "evidence index documents must include crosswalk doc");
assert((evidenceIndex.validators ?? []).includes("npm run runtime-spine:launch-crosswalk:validate"), "evidence index validators must include launch crosswalk validator");
assert(evidenceIndex.latest_launch_tuw_crosswalk_validation?.status === "passed", "evidence index must record latest launch TUW crosswalk validation");

assert(g6Evidence.scope?.repo_runtime_ready_candidate === true, "G6 evidence must keep repo runtime-ready candidate true");
assert(g6Evidence.scope?.lt_terminal_closeout_claim === false, "G6 evidence must keep LT terminal closeout false");
assert(g6Evidence.scope?.production_ready_claim === false, "G6 evidence must keep production-ready false");
assert(g6Evidence.scope?.actual_launch_go_live_claim === false, "G6 evidence must keep actual launch/go-live false");
assert(g6Evidence.scope?.launch_go_live_terminal_claim === false, "G6 evidence must keep launch terminal false");
assert(g6Evidence.scope?.launch_tuw_crosswalk_ref === CROSSWALK_PATH, "G6 evidence must reference launch TUW crosswalk");
assert((g6Evidence.validation_commands ?? []).includes("npm run runtime-spine:launch-crosswalk:validate"), "G6 validation commands must include launch crosswalk validator");

const blockerIds = (crosswalk.launch_blocker_packets ?? []).map((packet) => packet.work_package_id);
assert(includesAll(blockerIds, expectedLaunchBlockers), "crosswalk must list LT-L2-W01/W02/W03/W07 launch blockers");

for (const blocker of crosswalk.launch_blocker_packets ?? []) {
  const packet = readJson(blocker.packet_ref);
  assert(packet.work_package_id === blocker.work_package_id, `${blocker.work_package_id}: packet id mismatch`);
  assert(packet.status?.startsWith(blocker.expected_status_prefix), `${blocker.work_package_id}: status must remain blocked`);
  assert(blocker.terminal_closeout_required === true, `${blocker.work_package_id}: terminal closeout must remain required`);
  assert(packet.current_status?.g2_satisfied === false, `${blocker.work_package_id}: G2 must remain unsatisfied for launch closeout`);
}

const w07 = readJson(W07_PACKET_PATH);
assert(w07.status === "blocked_pending_l2_w01_w02_w03_terminal_closeout", "LT-L2-W07 status must reflect predecessor-blocked closeout, not absent RS-6 harness");
assert(w07.current_status?.rs6_runtime_integration_harness_exists === true, "LT-L2-W07 must recognize RS-6 runtime integration harness");
assert(w07.current_status?.runtime_integration_directory_exists === true, "LT-L2-W07 must recognize runtime integration directory");
assert(w07.current_status?.runtime_integration_file_count >= 9, "LT-L2-W07 must record runtime integration file count");
assert(w07.current_status?.runner_script_exists === true, "LT-L2-W07 must recognize RS-6 runner script");
assert(w07.current_status?.rtg005_responsibility_map_exists === true, "LT-L2-W07 must recognize RTG-005 responsibility map");
assert(w07.current_status?.l2_w01_w02_w03_predecessors_closed === false, "LT-L2-W07 predecessors must remain unclosed");
assert(w07.current_status?.l2_exit_satisfied === false, "LT-L2-W07 L2 exit must remain unsatisfied");
assert(w07.current_status?.launch_go_live_terminal_claim === false, "LT-L2-W07 must not claim launch terminal closeout");

if (errors.length > 0) {
  console.error("Runtime Spine launch TUW crosswalk validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine launch TUW crosswalk validation passed.");
console.log(`mapped_spines: ${mappings.length}`);
console.log(`launch_blockers: ${expectedLaunchBlockers.join(",")}`);
console.log("repo_runtime_ready_candidate: true");
console.log("final_go_live_approval_recorded: true");
console.log("lt_terminal_closeout_claim: false");
console.log("actual_launch_go_live_claim: false");
