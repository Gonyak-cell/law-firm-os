#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const contract = JSON.parse(await readFile("contracts/runtime-readiness-contract.json", "utf8"));
const ledger = JSON.parse(await readFile("docs/closeout-pack-plan/implementation-layer-ledger.json", "utf8"));
const errors = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const runtimeTargets = (ledger.packs ?? []).filter(
  (pack) =>
    pack.pack_number >= contract.implementation_layer_start_pack_number &&
    ["runtime", "mixed"].includes(pack.implementation_layer),
);

assert(
  runtimeTargets.length > 0,
  `Runtime readiness requires at least one runtime/mixed pack at or after pack ${contract.implementation_layer_start_pack_number}; found 0.`,
);

for (const pack of runtimeTargets) {
  const manifest = JSON.parse(await readFile(pack.manifest_ref, "utf8"));
  assert(manifest.status === "production_ready", `${pack.pack_id} runtime/mixed pack must be production_ready before runtime readiness`);
  assert(manifest.runtime_ready === true, `${pack.pack_id} runtime/mixed pack must set runtime_ready true`);
  const block = manifest.runtime_readiness;
  assert(block && typeof block === "object", `${pack.pack_id} missing runtime_readiness block`);
  for (const gate of contract.rtg_gates ?? []) {
    assert(block?.rtg_results?.[gate.id]?.status === "passed", `${pack.pack_id} missing passed ${gate.id}`);
  }
  const evidenceRef = block?.runtime_command_evidence_ref ?? `docs/closeout-packs/${pack.pack_id.toLowerCase()}/runtime-command-evidence.json`;
  assert(await exists(evidenceRef), `${pack.pack_id} missing runtime command evidence ${evidenceRef}`);
  if (await exists(evidenceRef)) {
    const evidence = JSON.parse(await readFile(evidenceRef, "utf8"));
    for (const key of Object.keys(contract.runtime_sandbox_attestation_schema ?? {})) {
      assert(
        evidence.sandbox_attestation?.[key] === contract.runtime_sandbox_attestation_schema[key],
        `${pack.pack_id} sandbox attestation ${key} mismatch`,
      );
    }
    for (const command of evidence.commands ?? []) {
      assert(command.exit_code === 0, `${pack.pack_id} runtime command ${command.command} must exit 0`);
    }
  }
}

if (errors.length > 0) {
  console.error("Runtime readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime readiness validation passed.");
console.log(`runtime_target_packs: ${runtimeTargets.length}`);
