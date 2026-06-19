#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const ledger = JSON.parse(await readFile("docs/hrx-weighted-implementation-ledger.json", "utf8"));
const mainWeighted = JSON.parse(await readFile("docs/weighted-implementation-ledger.json", "utf8"));
const mainRequirements = JSON.parse(await readFile("docs/spec-requirement-ledger.json", "utf8"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(mainWeighted.implementation_subphase_count === 54355, "main weighted ledger must remain 54355");
assert(mainRequirements.requirement_count === 227, "main requirement ledger must remain 227");
assert(ledger.hrx_implementation_subphase_count === 901, "HRX subphase count must be exactly 901");
assert(ledger.hrx_calibration?.base_subphase_count === 895, "HRX base calibration must be 895");
assert(ledger.hrx_calibration?.supplements_count === 6, "HRX supplements must be 6");
assert(ledger.hrx_calibration?.final_subphase_count === 901, "HRX calibration final must be 901");
assert(ledger.source_micro_phase_count === 110, "HRX source micro phase count must be 110");
assert(Array.isArray(ledger.entries) && ledger.entries.length === 110, "HRX entries must be 110");
const ids = new Set();
let counted = 0;
for (const entry of ledger.entries ?? []) {
  assert(entry.program_id === "RP30", `${entry.source_micro_phase_id} must be RP30`);
  assert(entry.hrx_embedded === true, `${entry.source_micro_phase_id} must be HRX embedded`);
  assert(entry.critical_rp === true, `${entry.source_micro_phase_id} must be critical RP`);
  assert(Array.isArray(entry.implementation_subphases) && entry.implementation_subphases.length === entry.split_count, `${entry.source_micro_phase_id} split mismatch`);
  counted += entry.split_count;
  for (const subphase of entry.implementation_subphases ?? []) {
    assert(!ids.has(subphase.id), `duplicate subphase ${subphase.id}`);
    ids.add(subphase.id);
    assert(subphase.id.startsWith("RP30."), `${subphase.id} must start with RP30`);
    assert(subphase.hrx_embedded === true, `${subphase.id} must be HRX embedded`);
    assert(subphase.hermes_validation_plan_ref === "H30.weighted_subphase_evidence", `${subphase.id} H30 ref mismatch`);
    assert(subphase.claude_cross_validation_plan_ref === "C30.weighted_subphase_review", `${subphase.id} C30 ref mismatch`);
    assert(Array.isArray(subphase.completion_gates) && subphase.completion_gates.length >= 7, `${subphase.id} missing completion gates`);
  }
}
assert(counted === 901, `counted subphases must be 901, got ${counted}`);

if (errors.length > 0) {
  console.error("HRX weighted ledger validation failed:");
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log("HRX weighted ledger validation passed.");
console.log("hrx_implementation_subphase_count: 901");
