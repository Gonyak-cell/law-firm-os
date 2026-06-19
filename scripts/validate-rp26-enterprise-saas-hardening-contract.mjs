#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ENTERPRISE_SAAS_CP819_PACK_BINDING,
  ENTERPRISE_SAAS_CP819_REQUIREMENTS,
  validateEnterpriseSaasCp819ReviewCloseoutHandoffCoverage,
  validateEnterpriseSaasCp819ReviewCloseoutHandoffDescriptor,
  validateEnterpriseSaasHardeningContract,
} from "../packages/enterprise/src/index.js";

const contractPath = path.resolve("contracts/enterprise-saas-hardening-contract.json");
const planPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const plan = JSON.parse(await readFile(planPath, "utf8"));
let planPack = plan.packs.find((pack) => pack.pack_id === ENTERPRISE_SAAS_CP819_PACK_BINDING.pack_id);
if (!planPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${ENTERPRISE_SAAS_CP819_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.plan_binding_snapshot?.pack_id === ENTERPRISE_SAAS_CP819_PACK_BINDING.pack_id) {
    planPack = manifest.plan_binding_snapshot;
  }
}

const errors = [];
const coverage = validateEnterpriseSaasCp819ReviewCloseoutHandoffCoverage(planPack);
if (!coverage.valid) errors.push(...coverage.errors);

const descriptor = validateEnterpriseSaasCp819ReviewCloseoutHandoffDescriptor(undefined, contract);
if (!descriptor.valid) errors.push(...descriptor.errors);

const contractValidation = validateEnterpriseSaasHardeningContract(contract, planPack);
if (!contractValidation.valid) errors.push(...contractValidation.errors);

for (const capability of ENTERPRISE_SAAS_CP819_REQUIREMENTS.required_capabilities) {
  if (!contract.required_capabilities?.includes(capability)) errors.push(`contract missing capability ${capability}`);
}
for (const gate of ENTERPRISE_SAAS_CP819_REQUIREMENTS.safety_gates) {
  if (!contract.safety_gates?.includes(gate)) errors.push(`contract missing safety gate ${gate}`);
}
for (const source of ENTERPRISE_SAAS_CP819_REQUIREMENTS.research_alignment) {
  if (!contract.research_alignment?.includes(source)) errors.push(`contract missing research source ${source}`);
}

if (errors.length > 0) {
  console.error("RP26 Enterprise SaaS Hardening contract validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("RP26 Enterprise SaaS Hardening contract validation passed.");
console.log(`pack: ${ENTERPRISE_SAAS_CP819_PACK_BINDING.pack_id}`);
console.log(`next: ${ENTERPRISE_SAAS_CP819_PACK_BINDING.next_pack_id} / ${ENTERPRISE_SAAS_CP819_PACK_BINDING.next_subphase_id}`);
console.log(`unit_count: ${coverage.summary.unit_count}`);
console.log(`mandatory_artifact_count: ${ENTERPRISE_SAAS_CP819_REQUIREMENTS.mandatory_artifacts.length}`);
