#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildImplementationLayerLedger } from "./generate-implementation-layer-ledger.mjs";

const ledgerPath = "docs/closeout-pack-plan/implementation-layer-ledger.json";
const committed = JSON.parse(await readFile(ledgerPath, "utf8"));
const regenerated = await buildImplementationLayerLedger();
const errors = [];

if (JSON.stringify(committed) !== JSON.stringify(regenerated)) {
  errors.push("implementation-layer ledger is stale; run npm run implementation-layer:generate");
}
if (committed.summary?.declared_before_boundary_count !== 0) {
  errors.push("pre-boundary packs must not have layer_source declared");
}
if (committed.implementation_layer_start_pack_number !== 328) {
  errors.push("implementation layer boundary must remain 328 for this decision record");
}
for (const pack of committed.packs ?? []) {
  if (!["descriptor", "runtime", "mixed"].includes(pack.implementation_layer)) {
    errors.push(`${pack.pack_id} has invalid implementation_layer ${pack.implementation_layer}`);
  }
  if (!["declared", "derived_descriptor", "undeclared_legacy"].includes(pack.layer_source)) {
    errors.push(`${pack.pack_id} has invalid layer_source ${pack.layer_source}`);
  }
}

if (errors.length > 0) {
  console.error("Implementation layer ledger validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Implementation layer ledger validation passed.");
console.log(`packs: ${committed.summary.pack_count}`);
