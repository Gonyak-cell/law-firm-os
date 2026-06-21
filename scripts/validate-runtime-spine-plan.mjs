#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const DECISIONS_PATH = "docs/runtime-spine/runtime-spine-decisions.json";
const EVIDENCE_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";

const requiredFiles = [
  "docs/runtime-spine/runtime-spine-charter.md",
  "docs/runtime-spine/non-weakening-policy.md",
  "docs/runtime-spine/runtime-boundary-map.md",
  "docs/runtime-spine/baseline-runtime-measurement.md",
  "docs/runtime-spine/qa-checklist.md",
  "docs/runtime-spine/rollback-migration-notes.md",
  LEDGER_PATH,
  DECISIONS_PATH,
  EVIDENCE_PATH,
  "scripts/validate-runtime-spine-plan.mjs",
  "scripts/validate-runtime-spine-readiness.mjs"
];

const expectedCounts = {
  "RS-PRE": 10,
  "RS-1": 14,
  "RS-2": 15,
  "RS-3": 15,
  "RS-4": 20,
  "RS-5": 30,
  "RS-6": 20
};

const expectedGates = ["G0", "G1", "G2", "G3", "G4", "G5", "G6"];
const expectedRtgs = ["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"];
const expectedDecisions = [
  "DEC-RS-001",
  "DEC-RS-002",
  "DEC-RS-003",
  "DEC-RS-004",
  "DEC-RS-005",
  "DEC-RS-006",
  "DEC-RS-007",
  "DEC-RS-008",
  "DEC-RS-009"
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function expectedId(spine, index) {
  const suffix = String(index).padStart(2, "0");
  return `${spine}-T${suffix}`;
}

export async function validateRuntimeSpinePlan({ silent = false } = {}) {
  const errors = [];
  const packageJson = await readJson("package.json");
  const ledger = await readJson(LEDGER_PATH);
  const decisions = await readJson(DECISIONS_PATH);
  const evidence = await readJson(EVIDENCE_PATH);

  const assert = (condition, message) => {
    if (!condition) errors.push(message);
  };

  for (const file of requiredFiles) {
    assert(await exists(file), `${file}: missing`);
  }

  assert(packageJson.scripts?.["runtime-spine:plan:validate"] === "node scripts/validate-runtime-spine-plan.mjs", "package script runtime-spine:plan:validate mismatch");
  assert(packageJson.scripts?.["runtime-spine:readiness:validate"] === "node scripts/validate-runtime-spine-readiness.mjs", "package script runtime-spine:readiness:validate mismatch");

  assert(ledger.schema_version === "law-firm-os.runtime-spine-ledger.v0.1", "ledger schema version mismatch");
  assert(ledger.baseline_commit === "41268c4becac7d06948d10c173d30635e108c5e1", "ledger baseline commit mismatch");
  assert(ledger.runtime_ready_candidate_claim === false, "ledger must not claim runtime_ready candidate at G0");
  assert(ledger.actual_launch_go_live_claim === false, "ledger must not claim actual launch/go-live");

  const gateIds = new Set((ledger.gates ?? []).map((gate) => gate.id));
  for (const gate of expectedGates) assert(gateIds.has(gate), `${gate}: missing gate`);
  assert(ledger.gates?.find((gate) => gate.id === "G0")?.status === "scope_ready_candidate", "G0 must be scope_ready_candidate");
  for (const gate of ledger.gates ?? []) {
    if (gate.id !== "G0") assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate at G0`);
  }

  const rtgIds = new Set((ledger.rtg_summary ?? []).map((rtg) => rtg.id));
  for (const rtg of expectedRtgs) assert(rtgIds.has(rtg), `${rtg}: missing RTG summary`);

  const spines = ledger.spines ?? [];
  const spineMap = new Map(spines.map((spine) => [spine.id, spine]));
  let totalTuws = 0;
  for (const [spineId, count] of Object.entries(expectedCounts)) {
    const spine = spineMap.get(spineId);
    assert(spine, `${spineId}: missing spine`);
    const tuws = spine?.tuws ?? [];
    totalTuws += tuws.length;
    assert(tuws.length === count, `${spineId}: expected ${count} TUWs, got ${tuws.length}`);
    const ids = new Set(tuws.map((tuw) => tuw.id));
    for (let index = 1; index <= count; index += 1) {
      assert(ids.has(expectedId(spineId, index)), `${expectedId(spineId, index)}: missing TUW`);
    }
    for (const tuw of tuws) {
      assert(typeof tuw.title === "string" && tuw.title.length > 0, `${tuw.id}: missing title`);
      assert(typeof tuw.status === "string" && tuw.status.length > 0, `${tuw.id}: missing status`);
      assert(typeof tuw.loop_stage === "string" && tuw.loop_stage.length > 0, `${tuw.id}: missing loop_stage`);
      assert(Array.isArray(tuw.rtg) && tuw.rtg.length > 0, `${tuw.id}: missing RTG mapping`);
      for (const rtg of tuw.rtg ?? []) assert(expectedRtgs.includes(rtg), `${tuw.id}: invalid RTG ${rtg}`);
      if (spineId !== "RS-PRE") assert(tuw.status === "planned", `${tuw.id}: future TUW must remain planned at G0`);
    }
  }
  assert(totalTuws === 124, `total TUW count must be 124, got ${totalTuws}`);

  const g0 = spineMap.get("RS-PRE")?.tuws ?? [];
  const g0Closed = new Set(["RS-PRE-T01", "RS-PRE-T02", "RS-PRE-T03", "RS-PRE-T07", "RS-PRE-T08", "RS-PRE-T09", "RS-PRE-T10"]);
  const g0Deferred = new Set(["RS-PRE-T04", "RS-PRE-T05", "RS-PRE-T06"]);
  for (const tuw of g0) {
    if (g0Closed.has(tuw.id)) assert(tuw.status === "closed", `${tuw.id}: must be closed for G0`);
    if (g0Deferred.has(tuw.id)) assert(tuw.status === "timed_deferral", `${tuw.id}: must be timed_deferral for G0`);
    assert(tuw.loop_stage === "act", `${tuw.id}: G0 TUW loop_stage must be act`);
    assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: G0 TUW missing evidence`);
  }

  assert(decisions.schema_version === "law-firm-os.runtime-spine-decisions.v0.1", "decision register schema mismatch");
  const decisionMap = new Map((decisions.decisions ?? []).map((decision) => [decision.id, decision]));
  for (const id of expectedDecisions) assert(decisionMap.has(id), `${id}: missing decision`);
  for (const decision of decisions.decisions ?? []) {
    assert(decision.owner_role && !decision.owner_name, `${decision.id}: must use owner role only at G0`);
    assert(["accepted_for_repo", "timed_deferral"].includes(decision.state), `${decision.id}: invalid state ${decision.state}`);
    if (decision.state === "timed_deferral") {
      assert(decision.runtime_implementation_allowed === false, `${decision.id}: timed deferral cannot allow runtime implementation`);
      assert(decision.blocks_real_tenant_data === true, `${decision.id}: timed deferral must block real tenant data`);
    }
  }

  assert(evidence.schema_version === "law-firm-os.runtime-spine-evidence-index.v0.1", "evidence schema mismatch");
  assert(evidence.runtime_ready_candidate === false, "evidence must not claim runtime_ready candidate at G0");
  assert(evidence.actual_launch_go_live_claim === false, "evidence must not claim actual launch/go-live");

  for (const domain of ledger.locked_future_domains ?? []) {
    assert(/locked|synthetic_only/.test(domain.status), `${domain.domain}: future domain must remain locked or synthetic-only`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, totalTuws };
  }

  if (!silent) {
    console.log("Runtime Spine plan validation passed.");
    console.log(`baseline_commit: ${ledger.baseline_commit}`);
    console.log(`gates: ${expectedGates.length}`);
    console.log(`tuws: ${totalTuws}`);
    console.log("g0_status: scope_ready_candidate");
    console.log("runtime_ready_candidate_claim: false");
    console.log("actual_launch_go_live_claim: false");
  }
  return { ok: true, errors: [], totalTuws };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateRuntimeSpinePlan();
  if (!result.ok) {
    console.error("Runtime Spine plan validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
}
