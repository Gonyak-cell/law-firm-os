#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateRuntimeSpinePlan } from "./validate-runtime-spine-plan.mjs";

const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function validateRuntimeSpineReadiness({ silent = false } = {}) {
  const errors = [];
  const plan = await validateRuntimeSpinePlan({ silent: true });
  if (!plan.ok) errors.push(...plan.errors);

  const ledger = await readJson(LEDGER_PATH);
  const evidence = await readJson(EVIDENCE_PATH);
  const allTuws = (ledger.spines ?? []).flatMap((spine) => (spine.tuws ?? []).map((tuw) => ({ ...tuw, spine: spine.id })));
  const closedTuws = allTuws.filter((tuw) => tuw.status === "closed");
  const deferredTuws = allTuws.filter((tuw) => tuw.status === "timed_deferral");
  const futureClosed = closedTuws.filter((tuw) => tuw.spine !== "RS-PRE");

  const assert = (condition, message) => {
    if (!condition) errors.push(message);
  };

  assert(ledger.runtime_ready_candidate_claim === false, "G0 readiness guard must keep runtime_ready_candidate_claim false");
  assert(ledger.actual_launch_go_live_claim === false, "G0 readiness guard must keep actual_launch_go_live_claim false");
  assert(evidence.runtime_ready_candidate === false, "evidence index must keep runtime_ready_candidate false");
  assert(evidence.actual_launch_go_live_claim === false, "evidence index must keep actual_launch_go_live_claim false");
  assert(futureClosed.length === 0, `future runtime TUWs must not be closed at G0: ${futureClosed.map((tuw) => tuw.id).join(", ")}`);

  const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
  assert(rtgById.get("RTG-001")?.status === "planned", "RTG-001 must remain planned until functional runtime path exists");
  assert(rtgById.get("RTG-002")?.status === "planned", "RTG-002 must remain planned until permission runtime path exists");
  assert(rtgById.get("RTG-003")?.status === "planned", "RTG-003 must remain planned until durable audit append exists");
  assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must be guarded at G0");
  assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must be guarded at G0");

  for (const gate of ledger.gates ?? []) {
    if (gate.id === "G0") assert(gate.status === "scope_ready_candidate", "G0 must be scope_ready_candidate");
    if (gate.id !== "G0") assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id} must remain planned_blocked_by_prior_gate`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, closedCount: closedTuws.length, deferredCount: deferredTuws.length };
  }

  if (!silent) {
    console.log("Runtime Spine readiness guard passed.");
    console.log("runtime_ready_candidate: false");
    console.log("actual_launch_go_live_claim: false");
    console.log(`g0_closed_tuws: ${closedTuws.length}`);
    console.log(`g0_timed_deferrals: ${deferredTuws.length}`);
    console.log(`future_closed_tuws: ${futureClosed.length}`);
    console.log("next_gate: G1 Persistence Ready");
  }

  return { ok: true, errors: [], closedCount: closedTuws.length, deferredCount: deferredTuws.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateRuntimeSpineReadiness();
  if (!result.ok) {
    console.error("Runtime Spine readiness guard failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
}
