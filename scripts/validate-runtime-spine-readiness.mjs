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
  const rs1Closed = closedTuws.filter((tuw) => tuw.spine === "RS-1");
  const g2ReadyCandidate = (ledger.gates ?? []).find((gate) => gate.id === "G2")?.status === "ready_candidate";
  const g3ReadyCandidate = (ledger.gates ?? []).find((gate) => gate.id === "G3")?.status === "ready_candidate";
  const g4ReadyCandidate = (ledger.gates ?? []).find((gate) => gate.id === "G4")?.status === "ready_candidate";
  const allowedClosedSpines = new Set(["RS-PRE", "RS-1", ...(g2ReadyCandidate ? ["RS-2"] : []), ...(g3ReadyCandidate ? ["RS-3"] : []), ...(g4ReadyCandidate ? ["RS-4"] : [])]);
  const prematureClosed = closedTuws.filter((tuw) => !allowedClosedSpines.has(tuw.spine));

  const assert = (condition, message) => {
    if (!condition) errors.push(message);
  };

  assert(ledger.runtime_ready_candidate_claim === false, "G0 readiness guard must keep runtime_ready_candidate_claim false");
  assert(ledger.actual_launch_go_live_claim === false, "G0 readiness guard must keep actual_launch_go_live_claim false");
  assert(evidence.runtime_ready_candidate === false, "evidence index must keep runtime_ready_candidate false");
  assert(evidence.actual_launch_go_live_claim === false, "evidence index must keep actual_launch_go_live_claim false");
  assert(prematureClosed.length === 0, `RS-2 through RS-6 TUWs must not close before G1: ${prematureClosed.map((tuw) => tuw.id).join(", ")}`);

  const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
  const g1ReadyCandidate = (ledger.gates ?? []).find((gate) => gate.id === "G1")?.status === "ready_candidate";
  assert(["planned", "partial"].includes(rtgById.get("RTG-001")?.status), "RTG-001 must remain planned or partial until full functional runtime path exists");
  assert(["planned", "partial"].includes(rtgById.get("RTG-002")?.status), "RTG-002 must remain planned or partial until full permission runtime path exists");
  assert(["planned", "partial"].includes(rtgById.get("RTG-003")?.status), "RTG-003 must remain planned or partial until durable audit append exists");
  assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must be guarded at G0");
  assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must be guarded at G0");

  for (const gate of ledger.gates ?? []) {
    if (gate.id === "G0") assert(gate.status === "scope_ready_candidate", "G0 must be scope_ready_candidate");
    if (gate.id === "G1") assert(["planned_blocked_by_prior_gate", "in_progress", "ready_candidate"].includes(gate.status), "G1 has invalid readiness progression status");
    if (gate.id === "G2") assert(["planned_blocked_by_prior_gate", "in_progress", "ready_candidate"].includes(gate.status), "G2 has invalid readiness progression status");
    if (gate.id === "G3") assert(["planned_blocked_by_prior_gate", "in_progress", "ready_candidate"].includes(gate.status), "G3 has invalid readiness progression status");
    if (gate.id === "G4") assert(["planned_blocked_by_prior_gate", "in_progress", "ready_candidate"].includes(gate.status), "G4 has invalid readiness progression status");
    if (!["G0", "G1", "G2", "G3", "G4"].includes(gate.id)) assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id} must remain planned_blocked_by_prior_gate`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, closedCount: closedTuws.length, deferredCount: deferredTuws.length };
  }

  if (!silent) {
    console.log("Runtime Spine readiness guard passed.");
    console.log("runtime_ready_candidate: false");
    console.log("actual_launch_go_live_claim: false");
    console.log(`total_closed_tuws: ${closedTuws.length}`);
    console.log(`g0_timed_deferrals: ${deferredTuws.length}`);
    console.log(`rs1_closed_tuws: ${rs1Closed.length}`);
    console.log(`premature_closed_tuws: ${prematureClosed.length}`);
    console.log(`next_gate: ${g4ReadyCandidate ? "G5 App Runtime Surface Ready" : (g3ReadyCandidate ? "G4 Canonical Model Ready" : (g2ReadyCandidate ? "G3 Audit Ready" : (g1ReadyCandidate ? "G2 Trust Boundary Ready" : "G1 Persistence Ready")))}`);
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
