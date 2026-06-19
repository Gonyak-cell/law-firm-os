#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const contract = JSON.parse(await readFile("contracts/runtime-readiness-contract.json", "utf8"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(contract.schema_version === "law-firm-os.runtime-readiness-contract.v0.1", "schema_version mismatch");
assert(contract.decision_ref === "MAT-DEC-07", "decision_ref must be MAT-DEC-07");
assert(contract.implementation_layer_start_pack_number === 328, "implementation layer boundary must be CP00-328");
assert(contract.implementation_layer_start_pack_id === "CP00-328", "implementation layer start pack id mismatch");
assert(JSON.stringify(contract.implementation_layer_enum) === JSON.stringify(["descriptor", "runtime", "mixed"]), "implementation layer enum mismatch");
assert(contract.runtime_ready_semantics?.does_not_replace === "production_ready", "runtime_ready must not replace production_ready");
assert(contract.boundary_policy?.closed_packs_before_start === "derive_only", "closed packs must be derive-only");
assert(contract.boundary_policy?.packs_at_or_after_start === "must_declare_implementation_layer", "future packs must declare implementation_layer");
assert(contract.runtime_sandbox_attestation_schema?.writes_product_state === false, "sandbox must not write product state");

const gateIds = new Set((contract.rtg_gates ?? []).map((gate) => gate.id));
for (const id of ["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"]) {
  assert(gateIds.has(id), `missing ${id}`);
}

const nonWeakening = JSON.stringify(contract.non_weakening_clause ?? []);
for (const phrase of ["Closed packs", "boundary-gated", "additive", "unchanged"]) {
  assert(nonWeakening.includes(phrase), `non_weakening_clause missing ${phrase}`);
}

if (errors.length > 0) {
  console.error("Runtime readiness contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime readiness contract validation passed.");
console.log(`implementation_layer_start_pack_id: ${contract.implementation_layer_start_pack_id}`);
