#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  COMMERCIAL_CP873_PACK_BINDING,
  COMMERCIAL_CP874_PACK_BINDING,
  COMMERCIAL_CP875_PACK_BINDING,
  COMMERCIAL_CP876_PACK_BINDING,
  COMMERCIAL_CP877_PACK_BINDING,
  COMMERCIAL_CP878_PACK_BINDING,
  COMMERCIAL_CP879_PACK_BINDING,
  COMMERCIAL_CP880_PACK_BINDING,
  COMMERCIAL_CP881_PACK_BINDING,
  COMMERCIAL_CP882_PACK_BINDING,
  COMMERCIAL_CP883_PACK_BINDING,
  COMMERCIAL_CP884_PACK_BINDING,
  COMMERCIAL_CP885_PACK_BINDING,
  COMMERCIAL_CP886_PACK_BINDING,
  COMMERCIAL_CP887_PACK_BINDING,
  COMMERCIAL_CP888_PACK_BINDING,
  COMMERCIAL_CP889_PACK_BINDING,
  COMMERCIAL_CP890_PACK_BINDING,
  COMMERCIAL_CP891_PACK_BINDING,
  COMMERCIAL_CP892_PACK_BINDING,
  COMMERCIAL_CP893_PACK_BINDING,
  COMMERCIAL_CP894_PACK_BINDING,
  COMMERCIAL_CP895_PACK_BINDING,
  COMMERCIAL_CP896_PACK_BINDING,
  COMMERCIAL_CP896_REQUIREMENTS,
  validateCommercialCp896ReviewCloseoutHandoffCoverage,
  validateCommercialCp896ReviewCloseoutHandoffDescriptor,
  validateCommercialReadinessContract,
} from "../packages/commercial/src/index.js";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const contractPath = path.resolve("contracts/commercial-readiness-contract.json");
const aliasPath = path.resolve("contracts/commercial-contract.json");
const planPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const contract = await readJson(contractPath);
const alias = await readJson(aliasPath);
const plan = await readJson(planPath);
let cp873PlanPack = plan.packs.find((pack) => pack.pack_id === COMMERCIAL_CP873_PACK_BINDING.pack_id);
if (!cp873PlanPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${COMMERCIAL_CP873_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === COMMERCIAL_CP873_PACK_BINDING.pack_id) {
    cp873PlanPack = manifest.plan_binding_snapshot;
  }
}
let cp874PlanPack = plan.packs.find((pack) => pack.pack_id === COMMERCIAL_CP874_PACK_BINDING.pack_id);
if (!cp874PlanPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${COMMERCIAL_CP874_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === COMMERCIAL_CP874_PACK_BINDING.pack_id) {
    cp874PlanPack = manifest.plan_binding_snapshot;
  }
}
let latestPlanPack = plan.packs.find((pack) => pack.pack_id === COMMERCIAL_CP896_PACK_BINDING.pack_id);
if (!latestPlanPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${COMMERCIAL_CP896_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === COMMERCIAL_CP896_PACK_BINDING.pack_id) {
    latestPlanPack = manifest.plan_binding_snapshot;
  }
}

const errors = [];
if (COMMERCIAL_CP873_PACK_BINDING.upstream_pack_id !== "CP00-872") {
  errors.push("CP873 upstream binding must point to CP00-872");
}
if (COMMERCIAL_CP874_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP873_PACK_BINDING.pack_id) {
  errors.push("CP874 upstream binding must point to CP00-873");
}
if (COMMERCIAL_CP874_PACK_BINDING.next_pack_id !== "CP00-875") {
  errors.push("CP874 next binding must point to CP00-875");
}
if (COMMERCIAL_CP875_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP874_PACK_BINDING.pack_id) {
  errors.push("CP875 upstream binding must point to CP00-874");
}
if (COMMERCIAL_CP875_PACK_BINDING.next_pack_id !== "CP00-876") {
  errors.push("CP875 next binding must point to CP00-876");
}
if (COMMERCIAL_CP876_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP875_PACK_BINDING.pack_id) {
  errors.push("CP876 upstream binding must point to CP00-875");
}
if (COMMERCIAL_CP876_PACK_BINDING.next_pack_id !== "CP00-877") {
  errors.push("CP876 next binding must point to CP00-877");
}
if (COMMERCIAL_CP877_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP876_PACK_BINDING.pack_id) {
  errors.push("CP877 upstream binding must point to CP00-876");
}
if (COMMERCIAL_CP877_PACK_BINDING.next_pack_id !== "CP00-878") {
  errors.push("CP877 next binding must point to CP00-878");
}
if (COMMERCIAL_CP878_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP877_PACK_BINDING.pack_id) {
  errors.push("CP878 upstream binding must point to CP00-877");
}
if (COMMERCIAL_CP878_PACK_BINDING.next_pack_id !== "CP00-879") {
  errors.push("CP878 next binding must point to CP00-879");
}
if (COMMERCIAL_CP879_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP878_PACK_BINDING.pack_id) {
  errors.push("CP879 upstream binding must point to CP00-878");
}
if (COMMERCIAL_CP879_PACK_BINDING.next_pack_id !== "CP00-880") {
  errors.push("CP879 next binding must point to CP00-880");
}
if (COMMERCIAL_CP880_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP879_PACK_BINDING.pack_id) {
  errors.push("CP880 upstream binding must point to CP00-879");
}
if (COMMERCIAL_CP880_PACK_BINDING.next_pack_id !== "CP00-881") {
  errors.push("CP880 next binding must point to CP00-881");
}
if (COMMERCIAL_CP881_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP880_PACK_BINDING.pack_id) {
  errors.push("CP881 upstream binding must point to CP00-880");
}
if (COMMERCIAL_CP881_PACK_BINDING.next_pack_id !== "CP00-882") {
  errors.push("CP881 next binding must point to CP00-882");
}
if (COMMERCIAL_CP882_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP881_PACK_BINDING.pack_id) {
  errors.push("CP882 upstream binding must point to CP00-881");
}
if (COMMERCIAL_CP882_PACK_BINDING.next_pack_id !== "CP00-883") {
  errors.push("CP882 next binding must point to CP00-883");
}
if (COMMERCIAL_CP883_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP882_PACK_BINDING.pack_id) {
  errors.push("CP883 upstream binding must point to CP00-882");
}
if (COMMERCIAL_CP883_PACK_BINDING.next_pack_id !== "CP00-884") {
  errors.push("CP883 next binding must point to CP00-884");
}
if (COMMERCIAL_CP884_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP883_PACK_BINDING.pack_id) {
  errors.push("CP884 upstream binding must point to CP00-883");
}
if (COMMERCIAL_CP884_PACK_BINDING.next_pack_id !== "CP00-885") {
  errors.push("CP884 next binding must point to CP00-885");
}
if (COMMERCIAL_CP885_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP884_PACK_BINDING.pack_id) {
  errors.push("CP885 upstream binding must point to CP00-884");
}
if (COMMERCIAL_CP885_PACK_BINDING.next_pack_id !== "CP00-886") {
  errors.push("CP885 next binding must point to CP00-886");
}
if (COMMERCIAL_CP886_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP885_PACK_BINDING.pack_id) {
  errors.push("CP886 upstream binding must point to CP00-885");
}
if (COMMERCIAL_CP886_PACK_BINDING.next_pack_id !== "CP00-887") {
  errors.push("CP886 next binding must point to CP00-887");
}
if (COMMERCIAL_CP887_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP886_PACK_BINDING.pack_id) {
  errors.push("CP887 upstream binding must point to CP00-886");
}
if (COMMERCIAL_CP887_PACK_BINDING.next_pack_id !== "CP00-888") {
  errors.push("CP887 next binding must point to CP00-888");
}
if (COMMERCIAL_CP888_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP887_PACK_BINDING.pack_id) {
  errors.push("CP888 upstream binding must point to CP00-887");
}
if (COMMERCIAL_CP888_PACK_BINDING.next_pack_id !== "CP00-889") {
  errors.push("CP888 next binding must point to CP00-889");
}
if (COMMERCIAL_CP889_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP888_PACK_BINDING.pack_id) {
  errors.push("CP889 upstream binding must point to CP00-888");
}
if (COMMERCIAL_CP889_PACK_BINDING.next_pack_id !== "CP00-890") {
  errors.push("CP889 next binding must point to CP00-890");
}
if (COMMERCIAL_CP890_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP889_PACK_BINDING.pack_id) {
  errors.push("CP890 upstream binding must point to CP00-889");
}
if (COMMERCIAL_CP890_PACK_BINDING.next_pack_id !== "CP00-891") {
  errors.push("CP890 next binding must point to CP00-891");
}
if (COMMERCIAL_CP891_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP890_PACK_BINDING.pack_id) {
  errors.push("CP891 upstream binding must point to CP00-890");
}
if (COMMERCIAL_CP891_PACK_BINDING.next_pack_id !== "CP00-892") {
  errors.push("CP891 next binding must point to CP00-892");
}
if (COMMERCIAL_CP892_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP891_PACK_BINDING.pack_id) {
  errors.push("CP892 upstream binding must point to CP00-891");
}
if (COMMERCIAL_CP892_PACK_BINDING.next_pack_id !== "CP00-893") {
  errors.push("CP892 next binding must point to CP00-893");
}
if (COMMERCIAL_CP893_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP892_PACK_BINDING.pack_id) {
  errors.push("CP893 upstream binding must point to CP00-892");
}
if (COMMERCIAL_CP893_PACK_BINDING.next_pack_id !== "CP00-894") {
  errors.push("CP893 next binding must point to CP00-894");
}
if (COMMERCIAL_CP894_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP893_PACK_BINDING.pack_id) {
  errors.push("CP894 upstream binding must point to CP00-893");
}
if (COMMERCIAL_CP894_PACK_BINDING.next_pack_id !== "CP00-895") {
  errors.push("CP894 next binding must point to CP00-895");
}
if (COMMERCIAL_CP895_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP894_PACK_BINDING.pack_id) {
  errors.push("CP895 upstream binding must point to CP00-894");
}
if (COMMERCIAL_CP895_PACK_BINDING.next_pack_id !== "CP00-896") {
  errors.push("CP895 next binding must point to CP00-896");
}
if (COMMERCIAL_CP896_PACK_BINDING.upstream_pack_id !== COMMERCIAL_CP895_PACK_BINDING.pack_id) {
  errors.push("CP896 upstream binding must point to CP00-895");
}
if (COMMERCIAL_CP896_PACK_BINDING.next_pack_id !== "CP00-897") {
  errors.push("CP896 next binding must point to CP00-897");
}
if (alias.canonical_contract_ref !== "contracts/commercial-readiness-contract.json") {
  errors.push("commercial compatibility contract must point to commercial-readiness contract");
}
if (alias.latest_pack_id !== COMMERCIAL_CP896_PACK_BINDING.pack_id) {
  errors.push("commercial compatibility contract latest pack drift");
}

if (!cp873PlanPack) errors.push("CP873 historical plan pack is required");
if (!cp874PlanPack) errors.push("CP874 historical plan pack is required");
const coverage = validateCommercialCp896ReviewCloseoutHandoffCoverage(latestPlanPack);
if (!coverage.valid) errors.push(...coverage.errors);

const descriptor = validateCommercialCp896ReviewCloseoutHandoffDescriptor(undefined, contract);
if (!descriptor.valid) errors.push(...descriptor.errors);

const contractValidation = validateCommercialReadinessContract(contract, latestPlanPack);
if (!contractValidation.valid) errors.push(...contractValidation.errors);

for (const capability of COMMERCIAL_CP896_REQUIREMENTS.required_capabilities) {
  if (!contract.required_capabilities?.includes(capability)) errors.push(`contract missing capability ${capability}`);
}
for (const gate of COMMERCIAL_CP896_REQUIREMENTS.safety_gates) {
  if (!contract.safety_gates?.includes(gate)) errors.push(`contract missing safety gate ${gate}`);
}

if (errors.length > 0) {
  console.error("RP29 Commercial Readiness contract validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("RP29 Commercial Readiness contract validation passed.");
console.log(`pack: ${COMMERCIAL_CP896_PACK_BINDING.pack_id}`);
console.log(`next: ${COMMERCIAL_CP896_PACK_BINDING.next_pack_id} / ${COMMERCIAL_CP896_PACK_BINDING.next_subphase_id}`);
console.log(`unit_count: ${coverage.summary.unit_count}`);
console.log(`mandatory_artifact_count: ${COMMERCIAL_CP896_REQUIREMENTS.mandatory_artifacts.length}`);
