#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  MARKETPLACE_CP845_PACK_BINDING,
  MARKETPLACE_CP845_REQUIREMENTS,
  MARKETPLACE_CP846_PACK_BINDING,
  MARKETPLACE_CP847_PACK_BINDING,
  MARKETPLACE_CP848_PACK_BINDING,
  MARKETPLACE_CP849_PACK_BINDING,
  MARKETPLACE_CP850_PACK_BINDING,
  MARKETPLACE_CP851_PACK_BINDING,
  MARKETPLACE_CP852_PACK_BINDING,
  MARKETPLACE_CP853_PACK_BINDING,
  MARKETPLACE_CP854_PACK_BINDING,
  MARKETPLACE_CP855_PACK_BINDING,
  MARKETPLACE_CP856_PACK_BINDING,
  MARKETPLACE_CP857_PACK_BINDING,
  MARKETPLACE_CP858_PACK_BINDING,
  MARKETPLACE_CP859_PACK_BINDING,
  MARKETPLACE_CP860_PACK_BINDING,
  MARKETPLACE_CP861_PACK_BINDING,
  MARKETPLACE_CP862_PACK_BINDING,
  MARKETPLACE_CP863_PACK_BINDING,
  MARKETPLACE_CP864_PACK_BINDING,
  MARKETPLACE_CP865_PACK_BINDING,
  MARKETPLACE_CP866_PACK_BINDING,
  MARKETPLACE_CP867_PACK_BINDING,
  MARKETPLACE_CP868_PACK_BINDING,
  MARKETPLACE_CP869_PACK_BINDING,
  MARKETPLACE_CP870_PACK_BINDING,
  MARKETPLACE_CP871_PACK_BINDING,
  MARKETPLACE_CP872_PACK_BINDING,
  MARKETPLACE_CP872_REQUIREMENTS,
  validateMarketplaceCp872ClaudeReviewCloseoutHandoffCoverage,
  validateMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor,
  validateMarketplaceCustomAiAppsContract,
} from "../packages/marketplace/src/index.js";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const contractPath = path.resolve("contracts/marketplace-custom-ai-apps-contract.json");
const planPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const contract = await readJson(contractPath);
const plan = await readJson(planPath);
let planPack = plan.packs.find((pack) => pack.pack_id === MARKETPLACE_CP872_PACK_BINDING.pack_id);
if (!planPack) {
  const manifestPath = path.resolve(`docs/closeout-packs/${MARKETPLACE_CP872_PACK_BINDING.pack_id.toLowerCase()}/manifest.json`);
  const manifest = await readJson(manifestPath);
  if (manifest.plan_binding_snapshot?.pack_id === MARKETPLACE_CP872_PACK_BINDING.pack_id) {
    planPack = manifest.plan_binding_snapshot;
  }
}

const errors = [];
if (MARKETPLACE_CP845_PACK_BINDING.upstream_pack_id !== "CP00-844") {
  errors.push("CP845 upstream binding must point to CP00-844");
}
if (MARKETPLACE_CP846_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP845_PACK_BINDING.pack_id) {
  errors.push("CP846 upstream binding must point to CP00-845");
}
if (MARKETPLACE_CP847_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP846_PACK_BINDING.pack_id) {
  errors.push("CP847 upstream binding must point to CP00-846");
}
if (MARKETPLACE_CP848_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP847_PACK_BINDING.pack_id) {
  errors.push("CP848 upstream binding must point to CP00-847");
}
if (MARKETPLACE_CP849_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP848_PACK_BINDING.pack_id) {
  errors.push("CP849 upstream binding must point to CP00-848");
}
if (MARKETPLACE_CP850_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP849_PACK_BINDING.pack_id) {
  errors.push("CP850 upstream binding must point to CP00-849");
}
if (MARKETPLACE_CP851_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP850_PACK_BINDING.pack_id) {
  errors.push("CP851 upstream binding must point to CP00-850");
}
if (MARKETPLACE_CP852_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP851_PACK_BINDING.pack_id) {
  errors.push("CP852 upstream binding must point to CP00-851");
}
if (MARKETPLACE_CP853_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP852_PACK_BINDING.pack_id) {
  errors.push("CP853 upstream binding must point to CP00-852");
}
if (MARKETPLACE_CP854_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP853_PACK_BINDING.pack_id) {
  errors.push("CP854 upstream binding must point to CP00-853");
}
if (MARKETPLACE_CP855_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP854_PACK_BINDING.pack_id) {
  errors.push("CP855 upstream binding must point to CP00-854");
}
if (MARKETPLACE_CP856_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP855_PACK_BINDING.pack_id) {
  errors.push("CP856 upstream binding must point to CP00-855");
}
if (MARKETPLACE_CP857_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP856_PACK_BINDING.pack_id) {
  errors.push("CP857 upstream binding must point to CP00-856");
}
if (MARKETPLACE_CP858_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP857_PACK_BINDING.pack_id) {
  errors.push("CP858 upstream binding must point to CP00-857");
}
if (MARKETPLACE_CP859_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP858_PACK_BINDING.pack_id) {
  errors.push("CP859 upstream binding must point to CP00-858");
}
if (MARKETPLACE_CP860_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP859_PACK_BINDING.pack_id) {
  errors.push("CP860 upstream binding must point to CP00-859");
}
if (MARKETPLACE_CP861_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP860_PACK_BINDING.pack_id) {
  errors.push("CP861 upstream binding must point to CP00-860");
}
if (MARKETPLACE_CP862_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP861_PACK_BINDING.pack_id) {
  errors.push("CP862 upstream binding must point to CP00-861");
}
if (MARKETPLACE_CP863_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP862_PACK_BINDING.pack_id) {
  errors.push("CP863 upstream binding must point to CP00-862");
}
if (MARKETPLACE_CP864_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP863_PACK_BINDING.pack_id) {
  errors.push("CP864 upstream binding must point to CP00-863");
}
if (MARKETPLACE_CP865_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP864_PACK_BINDING.pack_id) {
  errors.push("CP865 upstream binding must point to CP00-864");
}
if (MARKETPLACE_CP866_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP865_PACK_BINDING.pack_id) {
  errors.push("CP866 upstream binding must point to CP00-865");
}
if (MARKETPLACE_CP867_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP866_PACK_BINDING.pack_id) {
  errors.push("CP867 upstream binding must point to CP00-866");
}
if (MARKETPLACE_CP868_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP867_PACK_BINDING.pack_id) {
  errors.push("CP868 upstream binding must point to CP00-867");
}
if (MARKETPLACE_CP869_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP868_PACK_BINDING.pack_id) {
  errors.push("CP869 upstream binding must point to CP00-868");
}
if (MARKETPLACE_CP870_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP869_PACK_BINDING.pack_id) {
  errors.push("CP870 upstream binding must point to CP00-869");
}
if (MARKETPLACE_CP871_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP870_PACK_BINDING.pack_id) {
  errors.push("CP871 upstream binding must point to CP00-870");
}
if (MARKETPLACE_CP872_PACK_BINDING.upstream_pack_id !== MARKETPLACE_CP871_PACK_BINDING.pack_id) {
  errors.push("CP872 upstream binding must point to CP00-871");
}

const coverage = validateMarketplaceCp872ClaudeReviewCloseoutHandoffCoverage(planPack);
if (!coverage.valid) errors.push(...coverage.errors);

const descriptor = validateMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor(undefined, contract);
if (!descriptor.valid) errors.push(...descriptor.errors);

const contractValidation = validateMarketplaceCustomAiAppsContract(contract, planPack);
if (!contractValidation.valid) errors.push(...contractValidation.errors);

for (const capability of MARKETPLACE_CP872_REQUIREMENTS.required_capabilities) {
  if (!contract.required_capabilities?.includes(capability)) errors.push(`contract missing capability ${capability}`);
}
for (const gate of MARKETPLACE_CP872_REQUIREMENTS.safety_gates) {
  if (!contract.safety_gates?.includes(gate)) errors.push(`contract missing safety gate ${gate}`);
}

if (errors.length > 0) {
  console.error("RP28 Marketplace And Custom AI Apps contract validation failed:");
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`...and ${errors.length - 120} more`);
  process.exit(1);
}

console.log("RP28 Marketplace And Custom AI Apps contract validation passed.");
console.log(`pack: ${MARKETPLACE_CP872_PACK_BINDING.pack_id}`);
console.log(`next: ${MARKETPLACE_CP872_PACK_BINDING.next_pack_id} / ${MARKETPLACE_CP872_PACK_BINDING.next_subphase_id}`);
console.log(`unit_count: ${coverage.summary.unit_count}`);
console.log(`mandatory_artifact_count: ${MARKETPLACE_CP872_REQUIREMENTS.mandatory_artifacts.length}`);
