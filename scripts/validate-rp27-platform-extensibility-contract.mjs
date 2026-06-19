#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS,
  validatePlatformExtensibilityContract,
  validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverage,
  validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor,
} from "../packages/platform/src/index.js";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const contractPath = path.resolve("contracts/platform-extensibility-contract.json");
const planPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const contract = await readJson(contractPath);
const plan = await readJson(planPath);
let planPack = plan.packs.find((pack) => pack.pack_id === PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.pack_id);
if (!planPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.pack_id) {
    planPack = manifest.plan_binding_snapshot;
  }
}

const errors = [];
if (PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.upstream_pack_id !== PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING.pack_id) {
  errors.push("CP844 upstream binding must point to CP00-843");
}

if (PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING.upstream_pack_id !== PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING.pack_id) {
  errors.push("CP843 upstream binding must point to CP00-842");
}

if (PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING.upstream_pack_id !== PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING.pack_id) {
  errors.push("CP842 upstream binding must point to CP00-841");
}

if (PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING.upstream_pack_id !== PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING.pack_id) {
  errors.push("CP841 upstream binding must point to CP00-840");
}

const coverage = validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverage(planPack);
if (!coverage.valid) errors.push(...coverage.errors);

const descriptor = validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor(undefined, contract);
if (!descriptor.valid) errors.push(...descriptor.errors);

const contractValidation = validatePlatformExtensibilityContract(contract, planPack);
if (!contractValidation.valid) errors.push(...contractValidation.errors);

for (const capability of PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.required_capabilities) {
  if (!contract.required_capabilities?.includes(capability)) errors.push(`contract missing capability ${capability}`);
}
for (const gate of PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.safety_gates) {
  if (!contract.safety_gates?.includes(gate)) errors.push(`contract missing safety gate ${gate}`);
}

if (errors.length > 0) {
  console.error("RP27 Platform Extensibility contract validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("RP27 Platform Extensibility contract validation passed.");
console.log(`pack: ${PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.pack_id}`);
console.log(`next: ${PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.next_pack_id} / ${PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.next_subphase_id}`);
console.log(`unit_count: ${coverage.summary.unit_count}`);
console.log(`mandatory_artifact_count: ${PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.mandatory_artifacts.length}`);
