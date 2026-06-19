import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP514_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP514_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP515_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP515_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP516_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP516_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP517_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP517_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP518_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP518_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP519_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP519_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP520_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP520_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP521_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP521_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP522_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP522_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP523_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP523_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP524_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP524_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP525_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP525_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP526_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP526_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP527_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP527_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP528_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP528_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP529_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP529_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP530_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP530_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP531_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP531_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP532_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP532_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP533_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP533_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP534_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP534_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP535_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP535_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP536_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP536_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP537_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP537_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP538_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP538_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP539_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP539_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP540_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP540_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP541_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP541_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP542_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP542_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP543_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP543_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP544_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP544_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP545_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP545_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP546_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP546_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP547_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP547_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP548_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP548_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP549_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP549_REQUIREMENTS,
  AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION,
  AI_GOVERNANCE_CORE_CP550_PACK_BINDING,
  AI_GOVERNANCE_CORE_CP550_REQUIREMENTS,
  AI_GOVERNANCE_CORE_PROGRAM_CONTRACT,
  createAiGovernanceCoreCp514ClaudeReviewPacket,
  createAiGovernanceCoreCp514CloseoutHandoff,
  createAiGovernanceCoreCp514HermesEvidencePacket,
  createAiGovernanceCoreCp514ScopeContractFoundationCaseSet,
  createAiGovernanceCoreCp514ScopeContractFoundationDescriptor,
  createAiGovernanceCoreCp515ClaudeReviewPacket,
  createAiGovernanceCoreCp515CloseoutHandoff,
  createAiGovernanceCoreCp515HermesEvidencePacket,
  createAiGovernanceCoreCp515P01ImplementationSliceCaseSet,
  createAiGovernanceCoreCp515P01ImplementationSliceDescriptor,
  createAiGovernanceCoreCp516ClaudeReviewPacket,
  createAiGovernanceCoreCp516CloseoutHandoff,
  createAiGovernanceCoreCp516HermesEvidencePacket,
  createAiGovernanceCoreCp516P01WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp517ClaudeReviewPacket,
  createAiGovernanceCoreCp517CloseoutHandoff,
  createAiGovernanceCoreCp517HermesEvidencePacket,
  createAiGovernanceCoreCp517P01CloseoutP02FoundationCaseSet,
  createAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor,
  createAiGovernanceCoreCp518ClaudeReviewPacket,
  createAiGovernanceCoreCp518CloseoutHandoff,
  createAiGovernanceCoreCp518HermesEvidencePacket,
  createAiGovernanceCoreCp518P02ImplementationSliceCaseSet,
  createAiGovernanceCoreCp518P02ImplementationSliceDescriptor,
  createAiGovernanceCoreCp519ClaudeReviewPacket,
  createAiGovernanceCoreCp519CloseoutHandoff,
  createAiGovernanceCoreCp519HermesEvidencePacket,
  createAiGovernanceCoreCp519P02WorkflowSliceCaseSet,
  createAiGovernanceCoreCp519P02WorkflowSliceDescriptor,
  createAiGovernanceCoreCp520ClaudeReviewPacket,
  createAiGovernanceCoreCp520CloseoutHandoff,
  createAiGovernanceCoreCp520HermesEvidencePacket,
  createAiGovernanceCoreCp520P02PermissionSliceCaseSet,
  createAiGovernanceCoreCp520P02PermissionSliceDescriptor,
  createAiGovernanceCoreCp521ClaudeReviewPacket,
  createAiGovernanceCoreCp521CloseoutHandoff,
  createAiGovernanceCoreCp521HermesEvidencePacket,
  createAiGovernanceCoreCp521P02AuditBindingSliceCaseSet,
  createAiGovernanceCoreCp521P02AuditBindingSliceDescriptor,
  createAiGovernanceCoreCp522ClaudeReviewPacket,
  createAiGovernanceCoreCp522CloseoutHandoff,
  createAiGovernanceCoreCp522HermesEvidencePacket,
  createAiGovernanceCoreCp522P02PermissionFixtureSliceCaseSet,
  createAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor,
  createAiGovernanceCoreCp523ClaudeReviewPacket,
  createAiGovernanceCoreCp523CloseoutHandoff,
  createAiGovernanceCoreCp523HermesEvidencePacket,
  createAiGovernanceCoreCp523P02FixtureSliceCaseSet,
  createAiGovernanceCoreCp523P02FixtureSliceDescriptor,
  createAiGovernanceCoreCp524ClaudeReviewPacket,
  createAiGovernanceCoreCp524CloseoutHandoff,
  createAiGovernanceCoreCp524HermesEvidencePacket,
  createAiGovernanceCoreCp524P02FixtureTestSliceCaseSet,
  createAiGovernanceCoreCp524P02FixtureTestSliceDescriptor,
  createAiGovernanceCoreCp525ClaudeReviewPacket,
  createAiGovernanceCoreCp525CloseoutHandoff,
  createAiGovernanceCoreCp525HermesEvidencePacket,
  createAiGovernanceCoreCp525P02TestHermesSliceCaseSet,
  createAiGovernanceCoreCp525P02TestHermesSliceDescriptor,
  createAiGovernanceCoreCp526ClaudeReviewPacket,
  createAiGovernanceCoreCp526CloseoutHandoff,
  createAiGovernanceCoreCp526HermesEvidencePacket,
  createAiGovernanceCoreCp526P02CloseoutP03FoundationCaseSet,
  createAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor,
  createAiGovernanceCoreCp527ClaudeReviewPacket,
  createAiGovernanceCoreCp527CloseoutHandoff,
  createAiGovernanceCoreCp527HermesEvidencePacket,
  createAiGovernanceCoreCp527P03CloseoutP04FoundationCaseSet,
  createAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor,
  createAiGovernanceCoreCp528ClaudeReviewPacket,
  createAiGovernanceCoreCp528CloseoutHandoff,
  createAiGovernanceCoreCp528HermesEvidencePacket,
  createAiGovernanceCoreCp528P04ImplementationSliceCaseSet,
  createAiGovernanceCoreCp528P04ImplementationSliceDescriptor,
  createAiGovernanceCoreCp529ClaudeReviewPacket,
  createAiGovernanceCoreCp529CloseoutHandoff,
  createAiGovernanceCoreCp529HermesEvidencePacket,
  createAiGovernanceCoreCp529P04WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp530ClaudeReviewPacket,
  createAiGovernanceCoreCp530CloseoutHandoff,
  createAiGovernanceCoreCp530HermesEvidencePacket,
  createAiGovernanceCoreCp530P04PermissionFixtureSliceCaseSet,
  createAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor,
  createAiGovernanceCoreCp531ClaudeReviewPacket,
  createAiGovernanceCoreCp531CloseoutHandoff,
  createAiGovernanceCoreCp531HermesEvidencePacket,
  createAiGovernanceCoreCp531P04CloseoutP05FoundationCaseSet,
  createAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor,
  createAiGovernanceCoreCp532ClaudeReviewPacket,
  createAiGovernanceCoreCp532CloseoutHandoff,
  createAiGovernanceCoreCp532HermesEvidencePacket,
  createAiGovernanceCoreCp532P05ImplementationWorkflowSliceCaseSet,
  createAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor,
  createAiGovernanceCoreCp533ClaudeReviewPacket,
  createAiGovernanceCoreCp533CloseoutHandoff,
  createAiGovernanceCoreCp533HermesEvidencePacket,
  createAiGovernanceCoreCp533P05WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp534ClaudeReviewPacket,
  createAiGovernanceCoreCp534CloseoutHandoff,
  createAiGovernanceCoreCp534HermesEvidencePacket,
  createAiGovernanceCoreCp534P05FixtureSliceCaseSet,
  createAiGovernanceCoreCp534P05FixtureSliceDescriptor,
  createAiGovernanceCoreCp535ClaudeReviewPacket,
  createAiGovernanceCoreCp535CloseoutHandoff,
  createAiGovernanceCoreCp535HermesEvidencePacket,
  createAiGovernanceCoreCp535P05CloseoutP06FoundationCaseSet,
  createAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor,
  createAiGovernanceCoreCp536ClaudeReviewPacket,
  createAiGovernanceCoreCp536CloseoutHandoff,
  createAiGovernanceCoreCp536HermesEvidencePacket,
  createAiGovernanceCoreCp536P06FoundationSliceCaseSet,
  createAiGovernanceCoreCp536P06FoundationSliceDescriptor,
  createAiGovernanceCoreCp537ClaudeReviewPacket,
  createAiGovernanceCoreCp537CloseoutHandoff,
  createAiGovernanceCoreCp537HermesEvidencePacket,
  createAiGovernanceCoreCp537P06ImplementationWorkflowSliceCaseSet,
  createAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor,
  createAiGovernanceCoreCp538ClaudeReviewPacket,
  createAiGovernanceCoreCp538CloseoutHandoff,
  createAiGovernanceCoreCp538HermesEvidencePacket,
  createAiGovernanceCoreCp538P06WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp539ClaudeReviewPacket,
  createAiGovernanceCoreCp539CloseoutHandoff,
  createAiGovernanceCoreCp539HermesEvidencePacket,
  createAiGovernanceCoreCp539P06CloseoutP07FoundationCaseSet,
  createAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor,
  createAiGovernanceCoreCp540ClaudeReviewPacket,
  createAiGovernanceCoreCp540CloseoutHandoff,
  createAiGovernanceCoreCp540HermesEvidencePacket,
  createAiGovernanceCoreCp540P07ImplementationSliceCaseSet,
  createAiGovernanceCoreCp540P07ImplementationSliceDescriptor,
  createAiGovernanceCoreCp541ClaudeReviewPacket,
  createAiGovernanceCoreCp541CloseoutHandoff,
  createAiGovernanceCoreCp541HermesEvidencePacket,
  createAiGovernanceCoreCp541P07WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp542ClaudeReviewPacket,
  createAiGovernanceCoreCp542CloseoutHandoff,
  createAiGovernanceCoreCp542HermesEvidencePacket,
  createAiGovernanceCoreCp542P07PermissionFixtureSliceCaseSet,
  createAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor,
  createAiGovernanceCoreCp543ClaudeReviewPacket,
  createAiGovernanceCoreCp543CloseoutHandoff,
  createAiGovernanceCoreCp543HermesEvidencePacket,
  createAiGovernanceCoreCp543P07CloseoutP08FoundationCaseSet,
  createAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor,
  createAiGovernanceCoreCp544ClaudeReviewPacket,
  createAiGovernanceCoreCp544CloseoutHandoff,
  createAiGovernanceCoreCp544HermesEvidencePacket,
  createAiGovernanceCoreCp544P08ImplementationWorkflowSliceCaseSet,
  createAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor,
  createAiGovernanceCoreCp545ClaudeReviewPacket,
  createAiGovernanceCoreCp545CloseoutHandoff,
  createAiGovernanceCoreCp545HermesEvidencePacket,
  createAiGovernanceCoreCp545P08WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp546ClaudeReviewPacket,
  createAiGovernanceCoreCp546CloseoutHandoff,
  createAiGovernanceCoreCp546HermesEvidencePacket,
  createAiGovernanceCoreCp546P08CloseoutP09FoundationCaseSet,
  createAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor,
  createAiGovernanceCoreCp547ClaudeReviewPacket,
  createAiGovernanceCoreCp547CloseoutHandoff,
  createAiGovernanceCoreCp547HermesEvidencePacket,
  createAiGovernanceCoreCp547P09WorkflowPermissionSliceCaseSet,
  createAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor,
  createAiGovernanceCoreCp548ClaudeReviewPacket,
  createAiGovernanceCoreCp548CloseoutHandoff,
  createAiGovernanceCoreCp548HermesEvidencePacket,
  createAiGovernanceCoreCp548P09PermissionSliceCaseSet,
  createAiGovernanceCoreCp548P09PermissionSliceDescriptor,
  createAiGovernanceCoreCp549ClaudeReviewPacket,
  createAiGovernanceCoreCp549CloseoutHandoff,
  createAiGovernanceCoreCp549HermesEvidencePacket,
  createAiGovernanceCoreCp549P09PermissionFixtureSliceCaseSet,
  createAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor,
  createAiGovernanceCoreCp550ClaudeReviewPacket,
  createAiGovernanceCoreCp550CloseoutHandoff,
  createAiGovernanceCoreCp550HermesEvidencePacket,
  createAiGovernanceCoreCp550P09CloseoutHandoffSliceCaseSet,
  createAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor,
  aiGovernanceCoreRowKey,
  validateAiGovernanceCoreCp514Coverage,
  validateAiGovernanceCoreCp514ScopeContractFoundationDescriptor,
  validateAiGovernanceCoreCp515Coverage,
  validateAiGovernanceCoreCp515P01ImplementationSliceDescriptor,
  validateAiGovernanceCoreCp516Coverage,
  validateAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp517Coverage,
  validateAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor,
  validateAiGovernanceCoreCp518Coverage,
  validateAiGovernanceCoreCp518P02ImplementationSliceDescriptor,
  validateAiGovernanceCoreCp519Coverage,
  validateAiGovernanceCoreCp519P02WorkflowSliceDescriptor,
  validateAiGovernanceCoreCp520Coverage,
  validateAiGovernanceCoreCp520P02PermissionSliceDescriptor,
  validateAiGovernanceCoreCp521Coverage,
  validateAiGovernanceCoreCp521P02AuditBindingSliceDescriptor,
  validateAiGovernanceCoreCp522Coverage,
  validateAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor,
  validateAiGovernanceCoreCp523Coverage,
  validateAiGovernanceCoreCp523P02FixtureSliceDescriptor,
  validateAiGovernanceCoreCp524Coverage,
  validateAiGovernanceCoreCp524P02FixtureTestSliceDescriptor,
  validateAiGovernanceCoreCp525Coverage,
  validateAiGovernanceCoreCp525P02TestHermesSliceDescriptor,
  validateAiGovernanceCoreCp526Coverage,
  validateAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor,
  validateAiGovernanceCoreCp527Coverage,
  validateAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor,
  validateAiGovernanceCoreCp528Coverage,
  validateAiGovernanceCoreCp528P04ImplementationSliceDescriptor,
  validateAiGovernanceCoreCp529Coverage,
  validateAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp530Coverage,
  validateAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor,
  validateAiGovernanceCoreCp531Coverage,
  validateAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor,
  validateAiGovernanceCoreCp532Coverage,
  validateAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor,
  validateAiGovernanceCoreCp533Coverage,
  validateAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp534Coverage,
  validateAiGovernanceCoreCp534P05FixtureSliceDescriptor,
  validateAiGovernanceCoreCp535Coverage,
  validateAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor,
  validateAiGovernanceCoreCp536Coverage,
  validateAiGovernanceCoreCp536P06FoundationSliceDescriptor,
  validateAiGovernanceCoreCp537Coverage,
  validateAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor,
  validateAiGovernanceCoreCp538Coverage,
  validateAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp539Coverage,
  validateAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor,
  validateAiGovernanceCoreCp540Coverage,
  validateAiGovernanceCoreCp540P07ImplementationSliceDescriptor,
  validateAiGovernanceCoreCp541Coverage,
  validateAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp542Coverage,
  validateAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor,
  validateAiGovernanceCoreCp543Coverage,
  validateAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor,
  validateAiGovernanceCoreCp544Coverage,
  validateAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor,
  validateAiGovernanceCoreCp545Coverage,
  validateAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp546Coverage,
  validateAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor,
  validateAiGovernanceCoreCp547Coverage,
  validateAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor,
  validateAiGovernanceCoreCp548Coverage,
  validateAiGovernanceCoreCp548P09PermissionSliceDescriptor,
  validateAiGovernanceCoreCp549Coverage,
  validateAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor,
  validateAiGovernanceCoreCp550Coverage,
  validateAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor,
} from "../packages/ai-governance/src/index.js";

async function readJson(relPath) {
  return JSON.parse(await readFile(new URL(relPath, import.meta.url), "utf8"));
}

async function readOptionalJson(relPath) {
  try {
    return await readJson(relPath);
  } catch {
    return null;
  }
}

const aiGovernanceContract = await readJson("../contracts/ai-governance-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp514Manifest = await readOptionalJson("../docs/closeout-packs/cp00-514/manifest.json");
const cp514PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-514") ?? cp514Manifest?.plan_binding_snapshot;
const cp515Manifest = await readOptionalJson("../docs/closeout-packs/cp00-515/manifest.json");
const cp515PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-515") ?? cp515Manifest?.plan_binding_snapshot;
const cp516Manifest = await readOptionalJson("../docs/closeout-packs/cp00-516/manifest.json");
const cp516PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-516") ?? cp516Manifest?.plan_binding_snapshot;
const cp517Manifest = await readOptionalJson("../docs/closeout-packs/cp00-517/manifest.json");
const cp517PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-517") ?? cp517Manifest?.plan_binding_snapshot;
const cp518Manifest = await readOptionalJson("../docs/closeout-packs/cp00-518/manifest.json");
const cp518PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-518") ?? cp518Manifest?.plan_binding_snapshot;
const cp519Manifest = await readOptionalJson("../docs/closeout-packs/cp00-519/manifest.json");
const cp519PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-519") ?? cp519Manifest?.plan_binding_snapshot;
const cp520Manifest = await readOptionalJson("../docs/closeout-packs/cp00-520/manifest.json");
const cp520PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-520") ?? cp520Manifest?.plan_binding_snapshot;
const cp521Manifest = await readOptionalJson("../docs/closeout-packs/cp00-521/manifest.json");
const cp521PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-521") ?? cp521Manifest?.plan_binding_snapshot;
const cp522Manifest = await readOptionalJson("../docs/closeout-packs/cp00-522/manifest.json");
const cp522PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-522") ?? cp522Manifest?.plan_binding_snapshot;
const cp523Manifest = await readOptionalJson("../docs/closeout-packs/cp00-523/manifest.json");
const cp523PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-523") ?? cp523Manifest?.plan_binding_snapshot;
const cp524Manifest = await readOptionalJson("../docs/closeout-packs/cp00-524/manifest.json");
const cp524PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-524") ?? cp524Manifest?.plan_binding_snapshot;
const cp525Manifest = await readOptionalJson("../docs/closeout-packs/cp00-525/manifest.json");
const cp525PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-525") ?? cp525Manifest?.plan_binding_snapshot;
const cp526Manifest = await readOptionalJson("../docs/closeout-packs/cp00-526/manifest.json");
const cp526PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-526") ?? cp526Manifest?.plan_binding_snapshot;
const cp527Manifest = await readOptionalJson("../docs/closeout-packs/cp00-527/manifest.json");
const cp527PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-527") ?? cp527Manifest?.plan_binding_snapshot;
const cp528Manifest = await readOptionalJson("../docs/closeout-packs/cp00-528/manifest.json");
const cp528PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-528") ?? cp528Manifest?.plan_binding_snapshot;
const cp529Manifest = await readOptionalJson("../docs/closeout-packs/cp00-529/manifest.json");
const cp529PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-529") ?? cp529Manifest?.plan_binding_snapshot;
const cp530Manifest = await readOptionalJson("../docs/closeout-packs/cp00-530/manifest.json");
const cp530PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-530") ?? cp530Manifest?.plan_binding_snapshot;
const cp531Manifest = await readOptionalJson("../docs/closeout-packs/cp00-531/manifest.json");
const cp531PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-531") ?? cp531Manifest?.plan_binding_snapshot;
const cp532Manifest = await readOptionalJson("../docs/closeout-packs/cp00-532/manifest.json");
const cp532PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-532") ?? cp532Manifest?.plan_binding_snapshot;
const cp533Manifest = await readOptionalJson("../docs/closeout-packs/cp00-533/manifest.json");
const cp533PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-533") ?? cp533Manifest?.plan_binding_snapshot;
const cp534Manifest = await readOptionalJson("../docs/closeout-packs/cp00-534/manifest.json");
const cp534PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-534") ?? cp534Manifest?.plan_binding_snapshot;
const cp535Manifest = await readOptionalJson("../docs/closeout-packs/cp00-535/manifest.json");
const cp535PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-535") ?? cp535Manifest?.plan_binding_snapshot;
const cp536Manifest = await readOptionalJson("../docs/closeout-packs/cp00-536/manifest.json");
const cp536PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-536") ?? cp536Manifest?.plan_binding_snapshot;
const cp537Manifest = await readOptionalJson("../docs/closeout-packs/cp00-537/manifest.json");
const cp537PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-537") ?? cp537Manifest?.plan_binding_snapshot;
const cp538Manifest = await readOptionalJson("../docs/closeout-packs/cp00-538/manifest.json");
const cp538PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-538") ?? cp538Manifest?.plan_binding_snapshot;
const cp539Manifest = await readOptionalJson("../docs/closeout-packs/cp00-539/manifest.json");
const cp539PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-539") ?? cp539Manifest?.plan_binding_snapshot;
const cp540Manifest = await readOptionalJson("../docs/closeout-packs/cp00-540/manifest.json");
const cp540PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-540") ?? cp540Manifest?.plan_binding_snapshot;
const cp541Manifest = await readOptionalJson("../docs/closeout-packs/cp00-541/manifest.json");
const cp541PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-541") ?? cp541Manifest?.plan_binding_snapshot;
const cp542Manifest = await readOptionalJson("../docs/closeout-packs/cp00-542/manifest.json");
const cp542PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-542") ?? cp542Manifest?.plan_binding_snapshot;
const cp543Manifest = await readOptionalJson("../docs/closeout-packs/cp00-543/manifest.json");
const cp543PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-543") ?? cp543Manifest?.plan_binding_snapshot;
const cp544Manifest = await readOptionalJson("../docs/closeout-packs/cp00-544/manifest.json");
const cp544PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-544") ?? cp544Manifest?.plan_binding_snapshot;
const cp545Manifest = await readOptionalJson("../docs/closeout-packs/cp00-545/manifest.json");
const cp545PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-545") ?? cp545Manifest?.plan_binding_snapshot;
const cp546Manifest = await readOptionalJson("../docs/closeout-packs/cp00-546/manifest.json");
const cp546PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-546") ?? cp546Manifest?.plan_binding_snapshot;
const cp547Manifest = await readOptionalJson("../docs/closeout-packs/cp00-547/manifest.json");
const cp547PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-547") ?? cp547Manifest?.plan_binding_snapshot;
const cp548Manifest = await readOptionalJson("../docs/closeout-packs/cp00-548/manifest.json");
const cp548PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-548") ?? cp548Manifest?.plan_binding_snapshot;
const cp549Manifest = await readOptionalJson("../docs/closeout-packs/cp00-549/manifest.json");
const cp549PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-549") ?? cp549Manifest?.plan_binding_snapshot;
const cp550Manifest = await readOptionalJson("../docs/closeout-packs/cp00-550/manifest.json");
const cp550PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-550") ?? cp550Manifest?.plan_binding_snapshot;

assert.equal(aiGovernanceContract.schema_version, "law-firm-os.ai-governance-core-contract.v0.1");
assert.equal(aiGovernanceContract.program.program_id, "RP17");
assert.equal(aiGovernanceContract.program.program_title, "AI Governance");
assert.equal(aiGovernanceContract.program.upstream_program_id, "RP16");
assert.equal(aiGovernanceContract.program.hermes_gate, "H17");
assert.equal(aiGovernanceContract.program.claude_gate, "C17");
assert.equal(aiGovernanceContract.program.descriptor_only, true);
assert.deepEqual(aiGovernanceContract.program, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT)));
assert.equal(aiGovernanceContract.current_pack.pack_id, "CP00-550");
assert.equal(aiGovernanceContract.program.current_pack_id, "CP00-550");
assert.deepEqual(aiGovernanceContract.current_pack, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP550_PACK_BINDING)));
assert.deepEqual(aiGovernanceContract.no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION)));

assert.ok(cp514PlanPack, "CP00-514 must exist in closeout-pack-plan.json");
assert.equal(cp514PlanPack.unit_count, AI_GOVERNANCE_CORE_CP514_PACK_BINDING.unit_count, "CP00-514 unit count drift");
assert.ok(cp515PlanPack, "CP00-515 must exist in closeout-pack-plan.json");
assert.equal(cp515PlanPack.unit_count, AI_GOVERNANCE_CORE_CP515_PACK_BINDING.unit_count, "CP00-515 unit count drift");
assert.ok(cp516PlanPack, "CP00-516 must exist in closeout-pack-plan.json");
assert.equal(cp516PlanPack.unit_count, AI_GOVERNANCE_CORE_CP516_PACK_BINDING.unit_count, "CP00-516 unit count drift");
assert.ok(cp517PlanPack, "CP00-517 must exist in closeout-pack-plan.json");
assert.equal(cp517PlanPack.unit_count, AI_GOVERNANCE_CORE_CP517_PACK_BINDING.unit_count, "CP00-517 unit count drift");
assert.ok(cp518PlanPack, "CP00-518 must exist in closeout-pack-plan.json");
assert.equal(cp518PlanPack.unit_count, AI_GOVERNANCE_CORE_CP518_PACK_BINDING.unit_count, "CP00-518 unit count drift");
assert.ok(cp519PlanPack, "CP00-519 must exist in closeout-pack-plan.json");
assert.equal(cp519PlanPack.unit_count, AI_GOVERNANCE_CORE_CP519_PACK_BINDING.unit_count, "CP00-519 unit count drift");
assert.ok(cp520PlanPack, "CP00-520 must exist in closeout-pack-plan.json");
assert.equal(cp520PlanPack.unit_count, AI_GOVERNANCE_CORE_CP520_PACK_BINDING.unit_count, "CP00-520 unit count drift");
assert.ok(cp521PlanPack, "CP00-521 must exist in closeout-pack-plan.json");
assert.equal(cp521PlanPack.unit_count, AI_GOVERNANCE_CORE_CP521_PACK_BINDING.unit_count, "CP00-521 unit count drift");
assert.ok(cp522PlanPack, "CP00-522 must exist in closeout-pack-plan.json");
assert.equal(cp522PlanPack.unit_count, AI_GOVERNANCE_CORE_CP522_PACK_BINDING.unit_count, "CP00-522 unit count drift");
assert.ok(cp523PlanPack, "CP00-523 must exist in closeout-pack-plan.json");
assert.equal(cp523PlanPack.unit_count, AI_GOVERNANCE_CORE_CP523_PACK_BINDING.unit_count, "CP00-523 unit count drift");
assert.ok(cp524PlanPack, "CP00-524 must exist in closeout-pack-plan.json");
assert.equal(cp524PlanPack.unit_count, AI_GOVERNANCE_CORE_CP524_PACK_BINDING.unit_count, "CP00-524 unit count drift");
assert.ok(cp525PlanPack, "CP00-525 must exist in closeout-pack-plan.json");
assert.equal(cp525PlanPack.unit_count, AI_GOVERNANCE_CORE_CP525_PACK_BINDING.unit_count, "CP00-525 unit count drift");
assert.ok(cp526PlanPack, "CP00-526 must exist in closeout-pack-plan.json");
assert.equal(cp526PlanPack.unit_count, AI_GOVERNANCE_CORE_CP526_PACK_BINDING.unit_count, "CP00-526 unit count drift");
assert.ok(cp527PlanPack, "CP00-527 must exist in closeout-pack-plan.json");
assert.equal(cp527PlanPack.unit_count, AI_GOVERNANCE_CORE_CP527_PACK_BINDING.unit_count, "CP00-527 unit count drift");
assert.ok(cp528PlanPack, "CP00-528 must exist in closeout-pack-plan.json");
assert.equal(cp528PlanPack.unit_count, AI_GOVERNANCE_CORE_CP528_PACK_BINDING.unit_count, "CP00-528 unit count drift");
assert.ok(cp529PlanPack, "CP00-529 must exist in closeout-pack-plan.json");
assert.equal(cp529PlanPack.unit_count, AI_GOVERNANCE_CORE_CP529_PACK_BINDING.unit_count, "CP00-529 unit count drift");
assert.ok(cp530PlanPack, "CP00-530 must exist in closeout-pack-plan.json");
assert.equal(cp530PlanPack.unit_count, AI_GOVERNANCE_CORE_CP530_PACK_BINDING.unit_count, "CP00-530 unit count drift");
assert.ok(cp531PlanPack, "CP00-531 must exist in closeout-pack-plan.json");
assert.equal(cp531PlanPack.unit_count, AI_GOVERNANCE_CORE_CP531_PACK_BINDING.unit_count, "CP00-531 unit count drift");
assert.ok(cp532PlanPack, "CP00-532 must exist in closeout-pack-plan.json");
assert.equal(cp532PlanPack.unit_count, AI_GOVERNANCE_CORE_CP532_PACK_BINDING.unit_count, "CP00-532 unit count drift");
assert.ok(cp533PlanPack, "CP00-533 must exist in closeout-pack-plan.json");
assert.equal(cp533PlanPack.unit_count, AI_GOVERNANCE_CORE_CP533_PACK_BINDING.unit_count, "CP00-533 unit count drift");
assert.ok(cp534PlanPack, "CP00-534 must exist in closeout-pack-plan.json");
assert.equal(cp534PlanPack.unit_count, AI_GOVERNANCE_CORE_CP534_PACK_BINDING.unit_count, "CP00-534 unit count drift");
assert.ok(cp535PlanPack, "CP00-535 must exist in closeout-pack-plan.json");
assert.equal(cp535PlanPack.unit_count, AI_GOVERNANCE_CORE_CP535_PACK_BINDING.unit_count, "CP00-535 unit count drift");
assert.ok(cp536PlanPack, "CP00-536 must exist in closeout-pack-plan.json");
assert.equal(cp536PlanPack.unit_count, AI_GOVERNANCE_CORE_CP536_PACK_BINDING.unit_count, "CP00-536 unit count drift");
assert.ok(cp537PlanPack, "CP00-537 must exist in closeout-pack-plan.json");
assert.equal(cp537PlanPack.unit_count, AI_GOVERNANCE_CORE_CP537_PACK_BINDING.unit_count, "CP00-537 unit count drift");
assert.ok(cp538PlanPack, "CP00-538 must exist in closeout-pack-plan.json");
assert.equal(cp538PlanPack.unit_count, AI_GOVERNANCE_CORE_CP538_PACK_BINDING.unit_count, "CP00-538 unit count drift");
assert.ok(cp539PlanPack, "CP00-539 must exist in closeout-pack-plan.json");
assert.equal(cp539PlanPack.unit_count, AI_GOVERNANCE_CORE_CP539_PACK_BINDING.unit_count, "CP00-539 unit count drift");
assert.ok(cp540PlanPack, "CP00-540 must exist in closeout-pack-plan.json");
assert.equal(cp540PlanPack.unit_count, AI_GOVERNANCE_CORE_CP540_PACK_BINDING.unit_count, "CP00-540 unit count drift");
assert.ok(cp541PlanPack, "CP00-541 must exist in closeout-pack-plan.json");
assert.equal(cp541PlanPack.unit_count, AI_GOVERNANCE_CORE_CP541_PACK_BINDING.unit_count, "CP00-541 unit count drift");
assert.ok(cp542PlanPack, "CP00-542 must exist in closeout-pack-plan.json");
assert.equal(cp542PlanPack.unit_count, AI_GOVERNANCE_CORE_CP542_PACK_BINDING.unit_count, "CP00-542 unit count drift");
assert.ok(cp543PlanPack, "CP00-543 must exist in closeout-pack-plan.json");
assert.equal(cp543PlanPack.unit_count, AI_GOVERNANCE_CORE_CP543_PACK_BINDING.unit_count, "CP00-543 unit count drift");
assert.ok(cp544PlanPack, "CP00-544 must exist in closeout-pack-plan.json");
assert.equal(cp544PlanPack.unit_count, AI_GOVERNANCE_CORE_CP544_PACK_BINDING.unit_count, "CP00-544 unit count drift");
assert.ok(cp545PlanPack, "CP00-545 must exist in closeout-pack-plan.json");
assert.equal(cp545PlanPack.unit_count, AI_GOVERNANCE_CORE_CP545_PACK_BINDING.unit_count, "CP00-545 unit count drift");
assert.ok(cp546PlanPack, "CP00-546 must exist in closeout-pack-plan.json");
assert.equal(cp546PlanPack.unit_count, AI_GOVERNANCE_CORE_CP546_PACK_BINDING.unit_count, "CP00-546 unit count drift");
assert.ok(cp547PlanPack, "CP00-547 must exist in closeout-pack-plan.json");
assert.equal(cp547PlanPack.unit_count, AI_GOVERNANCE_CORE_CP547_PACK_BINDING.unit_count, "CP00-547 unit count drift");
assert.ok(cp548PlanPack, "CP00-548 must exist in closeout-pack-plan.json");
assert.equal(cp548PlanPack.unit_count, AI_GOVERNANCE_CORE_CP548_PACK_BINDING.unit_count, "CP00-548 unit count drift");
assert.ok(cp549PlanPack, "CP00-549 must exist in closeout-pack-plan.json");
assert.equal(cp549PlanPack.unit_count, AI_GOVERNANCE_CORE_CP549_PACK_BINDING.unit_count, "CP00-549 unit count drift");
assert.ok(cp550PlanPack, "CP00-550 must exist in closeout-pack-plan.json");
assert.equal(cp550PlanPack.unit_count, AI_GOVERNANCE_CORE_CP550_PACK_BINDING.unit_count, "CP00-550 unit count drift");

const cp514Coverage = validateAiGovernanceCoreCp514Coverage(cp514PlanPack);
const cp514Descriptor = createAiGovernanceCoreCp514ScopeContractFoundationDescriptor();
const cp514CaseSet = createAiGovernanceCoreCp514ScopeContractFoundationCaseSet();
const cp514Foundation = validateAiGovernanceCoreCp514ScopeContractFoundationDescriptor(cp514Descriptor, aiGovernanceContract);
const cp514Hermes = createAiGovernanceCoreCp514HermesEvidencePacket(cp514PlanPack, aiGovernanceContract, cp514Descriptor);
const cp514Claude = createAiGovernanceCoreCp514ClaudeReviewPacket(cp514PlanPack);
const cp514Handoff = createAiGovernanceCoreCp514CloseoutHandoff();
const cp515Coverage = validateAiGovernanceCoreCp515Coverage(cp515PlanPack);
const cp515Descriptor = createAiGovernanceCoreCp515P01ImplementationSliceDescriptor();
const cp515CaseSet = createAiGovernanceCoreCp515P01ImplementationSliceCaseSet();
const cp515Slice = validateAiGovernanceCoreCp515P01ImplementationSliceDescriptor(cp515Descriptor, aiGovernanceContract);
const cp515Hermes = createAiGovernanceCoreCp515HermesEvidencePacket(cp515PlanPack, aiGovernanceContract, cp515Descriptor);
const cp515Claude = createAiGovernanceCoreCp515ClaudeReviewPacket(cp515PlanPack);
const cp515Handoff = createAiGovernanceCoreCp515CloseoutHandoff();
const cp516Coverage = validateAiGovernanceCoreCp516Coverage(cp516PlanPack);
const cp516Descriptor = createAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor();
const cp516CaseSet = createAiGovernanceCoreCp516P01WorkflowPermissionSliceCaseSet();
const cp516Slice = validateAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor(cp516Descriptor, aiGovernanceContract);
const cp516Hermes = createAiGovernanceCoreCp516HermesEvidencePacket(cp516PlanPack, aiGovernanceContract, cp516Descriptor);
const cp516Claude = createAiGovernanceCoreCp516ClaudeReviewPacket(cp516PlanPack);
const cp516Handoff = createAiGovernanceCoreCp516CloseoutHandoff();
const cp517Coverage = validateAiGovernanceCoreCp517Coverage(cp517PlanPack);
const cp517Descriptor = createAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor();
const cp517CaseSet = createAiGovernanceCoreCp517P01CloseoutP02FoundationCaseSet();
const cp517Slice = validateAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor(cp517Descriptor, aiGovernanceContract);
const cp517Hermes = createAiGovernanceCoreCp517HermesEvidencePacket(cp517PlanPack, aiGovernanceContract, cp517Descriptor);
const cp517Claude = createAiGovernanceCoreCp517ClaudeReviewPacket(cp517PlanPack);
const cp517Handoff = createAiGovernanceCoreCp517CloseoutHandoff();
const cp518Coverage = validateAiGovernanceCoreCp518Coverage(cp518PlanPack);
const cp518Descriptor = createAiGovernanceCoreCp518P02ImplementationSliceDescriptor();
const cp518CaseSet = createAiGovernanceCoreCp518P02ImplementationSliceCaseSet();
const cp518Slice = validateAiGovernanceCoreCp518P02ImplementationSliceDescriptor(cp518Descriptor, aiGovernanceContract);
const cp518Hermes = createAiGovernanceCoreCp518HermesEvidencePacket(cp518PlanPack, aiGovernanceContract, cp518Descriptor);
const cp518Claude = createAiGovernanceCoreCp518ClaudeReviewPacket(cp518PlanPack);
const cp518Handoff = createAiGovernanceCoreCp518CloseoutHandoff();
const cp519Coverage = validateAiGovernanceCoreCp519Coverage(cp519PlanPack);
const cp519Descriptor = createAiGovernanceCoreCp519P02WorkflowSliceDescriptor();
const cp519CaseSet = createAiGovernanceCoreCp519P02WorkflowSliceCaseSet();
const cp519Slice = validateAiGovernanceCoreCp519P02WorkflowSliceDescriptor(cp519Descriptor, aiGovernanceContract);
const cp519Hermes = createAiGovernanceCoreCp519HermesEvidencePacket(cp519PlanPack, aiGovernanceContract, cp519Descriptor);
const cp519Claude = createAiGovernanceCoreCp519ClaudeReviewPacket(cp519PlanPack);
const cp519Handoff = createAiGovernanceCoreCp519CloseoutHandoff();
const cp520Coverage = validateAiGovernanceCoreCp520Coverage(cp520PlanPack);
const cp520Descriptor = createAiGovernanceCoreCp520P02PermissionSliceDescriptor();
const cp520CaseSet = createAiGovernanceCoreCp520P02PermissionSliceCaseSet();
const cp520Slice = validateAiGovernanceCoreCp520P02PermissionSliceDescriptor(cp520Descriptor, aiGovernanceContract);
const cp520Hermes = createAiGovernanceCoreCp520HermesEvidencePacket(cp520PlanPack, aiGovernanceContract, cp520Descriptor);
const cp520Claude = createAiGovernanceCoreCp520ClaudeReviewPacket(cp520PlanPack);
const cp520Handoff = createAiGovernanceCoreCp520CloseoutHandoff();
const cp521Coverage = validateAiGovernanceCoreCp521Coverage(cp521PlanPack);
const cp521Descriptor = createAiGovernanceCoreCp521P02AuditBindingSliceDescriptor();
const cp521CaseSet = createAiGovernanceCoreCp521P02AuditBindingSliceCaseSet();
const cp521Slice = validateAiGovernanceCoreCp521P02AuditBindingSliceDescriptor(cp521Descriptor, aiGovernanceContract);
const cp521Hermes = createAiGovernanceCoreCp521HermesEvidencePacket(cp521PlanPack, aiGovernanceContract, cp521Descriptor);
const cp521Claude = createAiGovernanceCoreCp521ClaudeReviewPacket(cp521PlanPack);
const cp521Handoff = createAiGovernanceCoreCp521CloseoutHandoff();
const cp522Coverage = validateAiGovernanceCoreCp522Coverage(cp522PlanPack);
const cp522Descriptor = createAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor();
const cp522CaseSet = createAiGovernanceCoreCp522P02PermissionFixtureSliceCaseSet();
const cp522Slice = validateAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor(cp522Descriptor, aiGovernanceContract);
const cp522Hermes = createAiGovernanceCoreCp522HermesEvidencePacket(cp522PlanPack, aiGovernanceContract, cp522Descriptor);
const cp522Claude = createAiGovernanceCoreCp522ClaudeReviewPacket(cp522PlanPack);
const cp522Handoff = createAiGovernanceCoreCp522CloseoutHandoff();
const cp523Coverage = validateAiGovernanceCoreCp523Coverage(cp523PlanPack);
const cp523Descriptor = createAiGovernanceCoreCp523P02FixtureSliceDescriptor();
const cp523CaseSet = createAiGovernanceCoreCp523P02FixtureSliceCaseSet();
const cp523Slice = validateAiGovernanceCoreCp523P02FixtureSliceDescriptor(cp523Descriptor, aiGovernanceContract);
const cp523Hermes = createAiGovernanceCoreCp523HermesEvidencePacket(cp523PlanPack, aiGovernanceContract, cp523Descriptor);
const cp523Claude = createAiGovernanceCoreCp523ClaudeReviewPacket(cp523PlanPack);
const cp523Handoff = createAiGovernanceCoreCp523CloseoutHandoff();
const cp524Coverage = validateAiGovernanceCoreCp524Coverage(cp524PlanPack);
const cp524Descriptor = createAiGovernanceCoreCp524P02FixtureTestSliceDescriptor();
const cp524CaseSet = createAiGovernanceCoreCp524P02FixtureTestSliceCaseSet();
const cp524Slice = validateAiGovernanceCoreCp524P02FixtureTestSliceDescriptor(cp524Descriptor, aiGovernanceContract);
const cp524Hermes = createAiGovernanceCoreCp524HermesEvidencePacket(cp524PlanPack, aiGovernanceContract, cp524Descriptor);
const cp524Claude = createAiGovernanceCoreCp524ClaudeReviewPacket(cp524PlanPack);
const cp524Handoff = createAiGovernanceCoreCp524CloseoutHandoff();
const cp525Coverage = validateAiGovernanceCoreCp525Coverage(cp525PlanPack);
const cp525Descriptor = createAiGovernanceCoreCp525P02TestHermesSliceDescriptor();
const cp525CaseSet = createAiGovernanceCoreCp525P02TestHermesSliceCaseSet();
const cp525Slice = validateAiGovernanceCoreCp525P02TestHermesSliceDescriptor(cp525Descriptor, aiGovernanceContract);
const cp525Hermes = createAiGovernanceCoreCp525HermesEvidencePacket(cp525PlanPack, aiGovernanceContract, cp525Descriptor);
const cp525Claude = createAiGovernanceCoreCp525ClaudeReviewPacket(cp525PlanPack);
const cp525Handoff = createAiGovernanceCoreCp525CloseoutHandoff();
const cp526Coverage = validateAiGovernanceCoreCp526Coverage(cp526PlanPack);
const cp526Descriptor = createAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor();
const cp526CaseSet = createAiGovernanceCoreCp526P02CloseoutP03FoundationCaseSet();
const cp526Slice = validateAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor(cp526Descriptor, aiGovernanceContract);
const cp526Hermes = createAiGovernanceCoreCp526HermesEvidencePacket(cp526PlanPack, aiGovernanceContract, cp526Descriptor);
const cp526Claude = createAiGovernanceCoreCp526ClaudeReviewPacket(cp526PlanPack);
const cp526Handoff = createAiGovernanceCoreCp526CloseoutHandoff();
const cp527Coverage = validateAiGovernanceCoreCp527Coverage(cp527PlanPack);
const cp527Descriptor = createAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor();
const cp527CaseSet = createAiGovernanceCoreCp527P03CloseoutP04FoundationCaseSet();
const cp527Slice = validateAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor(cp527Descriptor, aiGovernanceContract);
const cp527Hermes = createAiGovernanceCoreCp527HermesEvidencePacket(cp527PlanPack, aiGovernanceContract, cp527Descriptor);
const cp527Claude = createAiGovernanceCoreCp527ClaudeReviewPacket(cp527PlanPack);
const cp527Handoff = createAiGovernanceCoreCp527CloseoutHandoff();
const cp528Coverage = validateAiGovernanceCoreCp528Coverage(cp528PlanPack);
const cp528Descriptor = createAiGovernanceCoreCp528P04ImplementationSliceDescriptor();
const cp528CaseSet = createAiGovernanceCoreCp528P04ImplementationSliceCaseSet();
const cp528Slice = validateAiGovernanceCoreCp528P04ImplementationSliceDescriptor(cp528Descriptor, aiGovernanceContract);
const cp528Hermes = createAiGovernanceCoreCp528HermesEvidencePacket(cp528PlanPack, aiGovernanceContract, cp528Descriptor);
const cp528Claude = createAiGovernanceCoreCp528ClaudeReviewPacket(cp528PlanPack);
const cp528Handoff = createAiGovernanceCoreCp528CloseoutHandoff();
const cp529Coverage = validateAiGovernanceCoreCp529Coverage(cp529PlanPack);
const cp529Descriptor = createAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor();
const cp529CaseSet = createAiGovernanceCoreCp529P04WorkflowPermissionSliceCaseSet();
const cp529Slice = validateAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor(cp529Descriptor, aiGovernanceContract);
const cp529Hermes = createAiGovernanceCoreCp529HermesEvidencePacket(cp529PlanPack, aiGovernanceContract, cp529Descriptor);
const cp529Claude = createAiGovernanceCoreCp529ClaudeReviewPacket(cp529PlanPack);
const cp529Handoff = createAiGovernanceCoreCp529CloseoutHandoff();
const cp530Coverage = validateAiGovernanceCoreCp530Coverage(cp530PlanPack);
const cp530Descriptor = createAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor();
const cp530CaseSet = createAiGovernanceCoreCp530P04PermissionFixtureSliceCaseSet();
const cp530Slice = validateAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor(cp530Descriptor, aiGovernanceContract);
const cp530Hermes = createAiGovernanceCoreCp530HermesEvidencePacket(cp530PlanPack, aiGovernanceContract, cp530Descriptor);
const cp530Claude = createAiGovernanceCoreCp530ClaudeReviewPacket(cp530PlanPack);
const cp530Handoff = createAiGovernanceCoreCp530CloseoutHandoff();
const cp531Coverage = validateAiGovernanceCoreCp531Coverage(cp531PlanPack);
const cp531Descriptor = createAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor();
const cp531CaseSet = createAiGovernanceCoreCp531P04CloseoutP05FoundationCaseSet();
const cp531Slice = validateAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor(cp531Descriptor, aiGovernanceContract);
const cp531Hermes = createAiGovernanceCoreCp531HermesEvidencePacket(cp531PlanPack, aiGovernanceContract, cp531Descriptor);
const cp531Claude = createAiGovernanceCoreCp531ClaudeReviewPacket(cp531PlanPack);
const cp531Handoff = createAiGovernanceCoreCp531CloseoutHandoff();
const cp532Coverage = validateAiGovernanceCoreCp532Coverage(cp532PlanPack);
const cp532Descriptor = createAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor();
const cp532CaseSet = createAiGovernanceCoreCp532P05ImplementationWorkflowSliceCaseSet();
const cp532Slice = validateAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor(cp532Descriptor, aiGovernanceContract);
const cp532Hermes = createAiGovernanceCoreCp532HermesEvidencePacket(cp532PlanPack, aiGovernanceContract, cp532Descriptor);
const cp532Claude = createAiGovernanceCoreCp532ClaudeReviewPacket(cp532PlanPack);
const cp532Handoff = createAiGovernanceCoreCp532CloseoutHandoff();
const cp533Coverage = validateAiGovernanceCoreCp533Coverage(cp533PlanPack);
const cp533Descriptor = createAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor();
const cp533CaseSet = createAiGovernanceCoreCp533P05WorkflowPermissionSliceCaseSet();
const cp533Slice = validateAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor(cp533Descriptor, aiGovernanceContract);
const cp533Hermes = createAiGovernanceCoreCp533HermesEvidencePacket(cp533PlanPack, aiGovernanceContract, cp533Descriptor);
const cp533Claude = createAiGovernanceCoreCp533ClaudeReviewPacket(cp533PlanPack);
const cp533Handoff = createAiGovernanceCoreCp533CloseoutHandoff();
const cp534Coverage = validateAiGovernanceCoreCp534Coverage(cp534PlanPack);
const cp534Descriptor = createAiGovernanceCoreCp534P05FixtureSliceDescriptor();
const cp534CaseSet = createAiGovernanceCoreCp534P05FixtureSliceCaseSet();
const cp534Slice = validateAiGovernanceCoreCp534P05FixtureSliceDescriptor(cp534Descriptor, aiGovernanceContract);
const cp534Hermes = createAiGovernanceCoreCp534HermesEvidencePacket(cp534PlanPack, aiGovernanceContract, cp534Descriptor);
const cp534Claude = createAiGovernanceCoreCp534ClaudeReviewPacket(cp534PlanPack);
const cp534Handoff = createAiGovernanceCoreCp534CloseoutHandoff();
const cp535Coverage = validateAiGovernanceCoreCp535Coverage(cp535PlanPack);
const cp535Descriptor = createAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor();
const cp535CaseSet = createAiGovernanceCoreCp535P05CloseoutP06FoundationCaseSet();
const cp535Slice = validateAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor(cp535Descriptor, aiGovernanceContract);
const cp535Hermes = createAiGovernanceCoreCp535HermesEvidencePacket(cp535PlanPack, aiGovernanceContract, cp535Descriptor);
const cp535Claude = createAiGovernanceCoreCp535ClaudeReviewPacket(cp535PlanPack);
const cp535Handoff = createAiGovernanceCoreCp535CloseoutHandoff();
const cp536Coverage = validateAiGovernanceCoreCp536Coverage(cp536PlanPack);
const cp536Descriptor = createAiGovernanceCoreCp536P06FoundationSliceDescriptor();
const cp536CaseSet = createAiGovernanceCoreCp536P06FoundationSliceCaseSet();
const cp536Slice = validateAiGovernanceCoreCp536P06FoundationSliceDescriptor(cp536Descriptor, aiGovernanceContract);
const cp536Hermes = createAiGovernanceCoreCp536HermesEvidencePacket(cp536PlanPack, aiGovernanceContract, cp536Descriptor);
const cp536Claude = createAiGovernanceCoreCp536ClaudeReviewPacket(cp536PlanPack);
const cp536Handoff = createAiGovernanceCoreCp536CloseoutHandoff();
const cp537Coverage = validateAiGovernanceCoreCp537Coverage(cp537PlanPack);
const cp537Descriptor = createAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor();
const cp537CaseSet = createAiGovernanceCoreCp537P06ImplementationWorkflowSliceCaseSet();
const cp537Slice = validateAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor(cp537Descriptor, aiGovernanceContract);
const cp537Hermes = createAiGovernanceCoreCp537HermesEvidencePacket(cp537PlanPack, aiGovernanceContract, cp537Descriptor);
const cp537Claude = createAiGovernanceCoreCp537ClaudeReviewPacket(cp537PlanPack);
const cp537Handoff = createAiGovernanceCoreCp537CloseoutHandoff();
const cp538Coverage = validateAiGovernanceCoreCp538Coverage(cp538PlanPack);
const cp538Descriptor = createAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor();
const cp538CaseSet = createAiGovernanceCoreCp538P06WorkflowPermissionSliceCaseSet();
const cp538Slice = validateAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor(cp538Descriptor, aiGovernanceContract);
const cp538Hermes = createAiGovernanceCoreCp538HermesEvidencePacket(cp538PlanPack, aiGovernanceContract, cp538Descriptor);
const cp538Claude = createAiGovernanceCoreCp538ClaudeReviewPacket(cp538PlanPack);
const cp538Handoff = createAiGovernanceCoreCp538CloseoutHandoff();
const cp539Coverage = validateAiGovernanceCoreCp539Coverage(cp539PlanPack);
const cp539Descriptor = createAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor();
const cp539CaseSet = createAiGovernanceCoreCp539P06CloseoutP07FoundationCaseSet();
const cp539Slice = validateAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor(cp539Descriptor, aiGovernanceContract);
const cp539Hermes = createAiGovernanceCoreCp539HermesEvidencePacket(cp539PlanPack, aiGovernanceContract, cp539Descriptor);
const cp539Claude = createAiGovernanceCoreCp539ClaudeReviewPacket(cp539PlanPack);
const cp539Handoff = createAiGovernanceCoreCp539CloseoutHandoff();
const cp540Coverage = validateAiGovernanceCoreCp540Coverage(cp540PlanPack);
const cp540Descriptor = createAiGovernanceCoreCp540P07ImplementationSliceDescriptor();
const cp540CaseSet = createAiGovernanceCoreCp540P07ImplementationSliceCaseSet();
const cp540Slice = validateAiGovernanceCoreCp540P07ImplementationSliceDescriptor(cp540Descriptor, aiGovernanceContract);
const cp540Hermes = createAiGovernanceCoreCp540HermesEvidencePacket(cp540PlanPack, aiGovernanceContract, cp540Descriptor);
const cp540Claude = createAiGovernanceCoreCp540ClaudeReviewPacket(cp540PlanPack);
const cp540Handoff = createAiGovernanceCoreCp540CloseoutHandoff();
const cp541Coverage = validateAiGovernanceCoreCp541Coverage(cp541PlanPack);
const cp541Descriptor = createAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor();
const cp541CaseSet = createAiGovernanceCoreCp541P07WorkflowPermissionSliceCaseSet();
const cp541Slice = validateAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor(cp541Descriptor, aiGovernanceContract);
const cp541Hermes = createAiGovernanceCoreCp541HermesEvidencePacket(cp541PlanPack, aiGovernanceContract, cp541Descriptor);
const cp541Claude = createAiGovernanceCoreCp541ClaudeReviewPacket(cp541PlanPack);
const cp541Handoff = createAiGovernanceCoreCp541CloseoutHandoff();
const cp542Coverage = validateAiGovernanceCoreCp542Coverage(cp542PlanPack);
const cp542Descriptor = createAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor();
const cp542CaseSet = createAiGovernanceCoreCp542P07PermissionFixtureSliceCaseSet();
const cp542Slice = validateAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor(cp542Descriptor, aiGovernanceContract);
const cp542Hermes = createAiGovernanceCoreCp542HermesEvidencePacket(cp542PlanPack, aiGovernanceContract, cp542Descriptor);
const cp542Claude = createAiGovernanceCoreCp542ClaudeReviewPacket(cp542PlanPack);
const cp542Handoff = createAiGovernanceCoreCp542CloseoutHandoff();
const cp543Coverage = validateAiGovernanceCoreCp543Coverage(cp543PlanPack);
const cp543Descriptor = createAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor();
const cp543CaseSet = createAiGovernanceCoreCp543P07CloseoutP08FoundationCaseSet();
const cp543Slice = validateAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor(cp543Descriptor, aiGovernanceContract);
const cp543Hermes = createAiGovernanceCoreCp543HermesEvidencePacket(cp543PlanPack, aiGovernanceContract, cp543Descriptor);
const cp543Claude = createAiGovernanceCoreCp543ClaudeReviewPacket(cp543PlanPack);
const cp543Handoff = createAiGovernanceCoreCp543CloseoutHandoff();
const cp544Coverage = validateAiGovernanceCoreCp544Coverage(cp544PlanPack);
const cp544Descriptor = createAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor();
const cp544CaseSet = createAiGovernanceCoreCp544P08ImplementationWorkflowSliceCaseSet();
const cp544Slice = validateAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor(cp544Descriptor, aiGovernanceContract);
const cp544Hermes = createAiGovernanceCoreCp544HermesEvidencePacket(cp544PlanPack, aiGovernanceContract, cp544Descriptor);
const cp544Claude = createAiGovernanceCoreCp544ClaudeReviewPacket(cp544PlanPack);
const cp544Handoff = createAiGovernanceCoreCp544CloseoutHandoff();
const cp545Coverage = validateAiGovernanceCoreCp545Coverage(cp545PlanPack);
const cp545Descriptor = createAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor();
const cp545CaseSet = createAiGovernanceCoreCp545P08WorkflowPermissionSliceCaseSet();
const cp545Slice = validateAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor(cp545Descriptor, aiGovernanceContract);
const cp545Hermes = createAiGovernanceCoreCp545HermesEvidencePacket(cp545PlanPack, aiGovernanceContract, cp545Descriptor);
const cp545Claude = createAiGovernanceCoreCp545ClaudeReviewPacket(cp545PlanPack);
const cp545Handoff = createAiGovernanceCoreCp545CloseoutHandoff();
const cp546Coverage = validateAiGovernanceCoreCp546Coverage(cp546PlanPack);
const cp546Descriptor = createAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor();
const cp546CaseSet = createAiGovernanceCoreCp546P08CloseoutP09FoundationCaseSet();
const cp546Slice = validateAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor(cp546Descriptor, aiGovernanceContract);
const cp546Hermes = createAiGovernanceCoreCp546HermesEvidencePacket(cp546PlanPack, aiGovernanceContract, cp546Descriptor);
const cp546Claude = createAiGovernanceCoreCp546ClaudeReviewPacket(cp546PlanPack);
const cp546Handoff = createAiGovernanceCoreCp546CloseoutHandoff();
const cp547Coverage = validateAiGovernanceCoreCp547Coverage(cp547PlanPack);
const cp547Descriptor = createAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor();
const cp547CaseSet = createAiGovernanceCoreCp547P09WorkflowPermissionSliceCaseSet();
const cp547Slice = validateAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor(cp547Descriptor, aiGovernanceContract);
const cp547Hermes = createAiGovernanceCoreCp547HermesEvidencePacket(cp547PlanPack, aiGovernanceContract, cp547Descriptor);
const cp547Claude = createAiGovernanceCoreCp547ClaudeReviewPacket(cp547PlanPack);
const cp547Handoff = createAiGovernanceCoreCp547CloseoutHandoff();
const cp548Coverage = validateAiGovernanceCoreCp548Coverage(cp548PlanPack);
const cp548Descriptor = createAiGovernanceCoreCp548P09PermissionSliceDescriptor();
const cp548CaseSet = createAiGovernanceCoreCp548P09PermissionSliceCaseSet();
const cp548Slice = validateAiGovernanceCoreCp548P09PermissionSliceDescriptor(cp548Descriptor, aiGovernanceContract);
const cp548Hermes = createAiGovernanceCoreCp548HermesEvidencePacket(cp548PlanPack, aiGovernanceContract, cp548Descriptor);
const cp548Claude = createAiGovernanceCoreCp548ClaudeReviewPacket(cp548PlanPack);
const cp548Handoff = createAiGovernanceCoreCp548CloseoutHandoff();
const cp549Coverage = validateAiGovernanceCoreCp549Coverage(cp549PlanPack);
const cp549Descriptor = createAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor();
const cp549CaseSet = createAiGovernanceCoreCp549P09PermissionFixtureSliceCaseSet();
const cp549Slice = validateAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor(cp549Descriptor, aiGovernanceContract);
const cp549Hermes = createAiGovernanceCoreCp549HermesEvidencePacket(cp549PlanPack, aiGovernanceContract, cp549Descriptor);
const cp549Claude = createAiGovernanceCoreCp549ClaudeReviewPacket(cp549PlanPack);
const cp549Handoff = createAiGovernanceCoreCp549CloseoutHandoff();
const cp550Coverage = validateAiGovernanceCoreCp550Coverage(cp550PlanPack);
const cp550Descriptor = createAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor();
const cp550CaseSet = createAiGovernanceCoreCp550P09CloseoutHandoffSliceCaseSet();
const cp550Slice = validateAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor(cp550Descriptor, aiGovernanceContract);
const cp550Hermes = createAiGovernanceCoreCp550HermesEvidencePacket(cp550PlanPack, aiGovernanceContract, cp550Descriptor);
const cp550Claude = createAiGovernanceCoreCp550ClaudeReviewPacket(cp550PlanPack);
const cp550Handoff = createAiGovernanceCoreCp550CloseoutHandoff();

assert.equal(cp514Coverage.valid, true, cp514Coverage.errors.join("; "));
assert.equal(cp514Coverage.summary.unit_count, 150);
assert.equal(cp514Coverage.summary.by_phase["RP17.P00"], 122);
assert.equal(cp514Coverage.summary.by_phase["RP17.P01"], 28);
assert.equal(cp514Foundation.valid, true, cp514Foundation.errors.join("; "));
assert.equal(cp514CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP514_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp514CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-514 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp514Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp514_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP514_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp514_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION)));
assert.equal(cp514Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp514Hermes.production_ready_candidate, true);
assert.equal(cp514Claude.review_packet, "C17.CP00-514.ai_governance_core_scope_contract_foundation_descriptor");
assert.equal(cp514Claude.read_only, true);
assert.equal(cp514Handoff.to_pack_id, "CP00-515");
assert.equal(cp514Handoff.next_subphase_id, "RP17.P01.M02.S09");
assert.equal(AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp515Coverage.valid, true, cp515Coverage.errors.join("; "));
assert.equal(cp515Coverage.summary.unit_count, 40);
assert.equal(cp515Coverage.summary.by_micro_phase["RP17.P01.M02"], 12);
assert.equal(cp515Coverage.summary.by_micro_phase["RP17.P01.M03"], 22);
assert.equal(cp515Coverage.summary.by_micro_phase["RP17.P01.M04"], 6);
assert.equal(cp515Slice.valid, true, cp515Slice.errors.join("; "));
assert.equal(cp515CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP515_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp515CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-515 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p01_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp515Descriptor)),
  "contract p01_implementation_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp515_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP515_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp515_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION)));
assert.equal(cp515Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp515Hermes.production_ready_candidate, true);
assert.equal(cp515Claude.review_packet, "C17.CP00-515.ai_governance_core_p01_implementation_slice_descriptor");
assert.equal(cp515Claude.read_only, true);
assert.equal(cp515Handoff.to_pack_id, "CP00-516");
assert.equal(cp515Handoff.next_subphase_id, "RP17.P01.M04.S07");
assert.equal(AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp516Coverage.valid, true, cp516Coverage.errors.join("; "));
assert.equal(cp516Coverage.summary.unit_count, 40);
assert.equal(cp516Coverage.summary.by_micro_phase["RP17.P01.M04"], 14);
assert.equal(cp516Coverage.summary.by_micro_phase["RP17.P01.M05"], 22);
assert.equal(cp516Coverage.summary.by_micro_phase["RP17.P01.M06"], 4);
assert.equal(cp516Slice.valid, true, cp516Slice.errors.join("; "));
assert.equal(cp516CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP516_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp516CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-516 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p01_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp516Descriptor)),
  "contract p01_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp516_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP516_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp516_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION)));
assert.equal(cp516Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp516Hermes.production_ready_candidate, true);
assert.equal(cp516Claude.review_packet, "C17.CP00-516.ai_governance_core_p01_workflow_permission_slice_descriptor");
assert.equal(cp516Claude.read_only, true);
assert.equal(cp516Handoff.to_pack_id, "CP00-517");
assert.equal(cp516Handoff.next_subphase_id, "RP17.P01.M06.S05");
assert.equal(AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp517Coverage.valid, true, cp517Coverage.errors.join("; "));
assert.equal(cp517Coverage.summary.unit_count, 150);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P01.M06"], 16);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P01.M07"], 22);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P01.M08"], 20);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P01.M09"], 20);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P01.M10"], 10);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P02.M00"], 20);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P02.M01"], 20);
assert.equal(cp517Coverage.summary.by_micro_phase["RP17.P02.M02"], 22);
assert.equal(cp517Slice.valid, true, cp517Slice.errors.join("; "));
assert.equal(cp517CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP517_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp517CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-517 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp517Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp517_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP517_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp517_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION)));
assert.equal(cp517Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp517Hermes.production_ready_candidate, true);
assert.equal(cp517Claude.review_packet, "C17.CP00-517.ai_governance_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp517Claude.read_only, true);
assert.equal(cp517Handoff.to_pack_id, "CP00-518");
assert.equal(cp517Handoff.next_subphase_id, "RP17.P02.M03.S01");
assert.equal(AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp518Coverage.valid, true, cp518Coverage.errors.join("; "));
assert.equal(cp518Coverage.summary.unit_count, 40);
assert.equal(cp518Coverage.summary.by_micro_phase["RP17.P02.M03"], 25);
assert.equal(cp518Coverage.summary.by_micro_phase["RP17.P02.M04"], 15);
assert.equal(cp518Slice.valid, true, cp518Slice.errors.join("; "));
assert.equal(cp518CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP518_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp518CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-518 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp518Descriptor)),
  "contract p02_implementation_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp518_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP518_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp518_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION)));
assert.equal(cp518Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp518Hermes.production_ready_candidate, true);
assert.equal(cp518Claude.review_packet, "C17.CP00-518.ai_governance_core_p02_implementation_slice_descriptor");
assert.equal(cp518Claude.read_only, true);
assert.equal(cp518Handoff.to_pack_id, "CP00-519");
assert.equal(cp518Handoff.next_subphase_id, "RP17.P02.M04.S16");
assert.equal(AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp519Coverage.valid, true, cp519Coverage.errors.join("; "));
assert.equal(cp519Coverage.summary.unit_count, 10);
assert.equal(cp519Coverage.summary.by_micro_phase["RP17.P02.M04"], 10);
assert.equal(cp519Slice.valid, true, cp519Slice.errors.join("; "));
assert.equal(cp519CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP519_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp519CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-519 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp519Descriptor)),
  "contract p02_workflow_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp519_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP519_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp519_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION)));
assert.equal(cp519Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp519Hermes.production_ready_candidate, true);
assert.equal(cp519Claude.review_packet, "C17.CP00-519.ai_governance_core_p02_workflow_slice_descriptor");
assert.equal(cp519Claude.read_only, true);
assert.equal(cp519Handoff.to_pack_id, "CP00-520");
assert.equal(cp519Handoff.next_subphase_id, "RP17.P02.M05.S01");
assert.equal(AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp520Coverage.valid, true, cp520Coverage.errors.join("; "));
assert.equal(cp520Coverage.summary.unit_count, 10);
assert.equal(cp520Coverage.summary.by_micro_phase["RP17.P02.M05"], 10);
assert.equal(cp520Slice.valid, true, cp520Slice.errors.join("; "));
assert.equal(cp520CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP520_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp520CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-520 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp520Descriptor)),
  "contract p02_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp520_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP520_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp520_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION)));
assert.equal(cp520Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp520Hermes.production_ready_candidate, true);
assert.equal(cp520Claude.review_packet, "C17.CP00-520.ai_governance_core_p02_permission_slice_descriptor");
assert.equal(cp520Claude.read_only, true);
assert.equal(cp520Handoff.to_pack_id, "CP00-521");
assert.equal(cp520Handoff.next_subphase_id, "RP17.P02.M05.S11");
assert.equal(AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp521Coverage.valid, true, cp521Coverage.errors.join("; "));
assert.equal(cp521Coverage.summary.unit_count, 10);
assert.equal(cp521Coverage.summary.by_micro_phase["RP17.P02.M05"], 10);
assert.equal(cp521Slice.valid, true, cp521Slice.errors.join("; "));
assert.equal(cp521CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP521_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp521CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-521 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_audit_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp521Descriptor)),
  "contract p02_audit_binding_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp521_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP521_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp521_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION)));
assert.equal(cp521Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp521Hermes.production_ready_candidate, true);
assert.equal(cp521Claude.review_packet, "C17.CP00-521.ai_governance_core_p02_audit_binding_slice_descriptor");
assert.equal(cp521Claude.read_only, true);
assert.equal(cp521Handoff.to_pack_id, "CP00-522");
assert.equal(cp521Handoff.next_subphase_id, "RP17.P02.M05.S21");
assert.equal(AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp522Coverage.valid, true, cp522Coverage.errors.join("; "));
assert.equal(cp522Coverage.summary.unit_count, 10);
assert.equal(cp522Coverage.summary.by_micro_phase["RP17.P02.M05"], 5);
assert.equal(cp522Coverage.summary.by_micro_phase["RP17.P02.M06"], 5);
assert.equal(cp522Slice.valid, true, cp522Slice.errors.join("; "));
assert.equal(cp522CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP522_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp522CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-522 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp522Descriptor)),
  "contract p02_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp522_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP522_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp522_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION)));
assert.equal(cp522Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp522Hermes.production_ready_candidate, true);
assert.equal(cp522Claude.review_packet, "C17.CP00-522.ai_governance_core_p02_permission_fixture_slice_descriptor");
assert.equal(cp522Claude.read_only, true);
assert.equal(cp522Handoff.to_pack_id, "CP00-523");
assert.equal(cp522Handoff.next_subphase_id, "RP17.P02.M06.S06");
assert.equal(AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp523Coverage.valid, true, cp523Coverage.errors.join("; "));
assert.equal(cp523Coverage.summary.unit_count, 10);
assert.equal(cp523Coverage.summary.by_micro_phase["RP17.P02.M06"], 10);
assert.equal(cp523Slice.valid, true, cp523Slice.errors.join("; "));
assert.equal(cp523CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP523_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp523CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-523 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp523Descriptor)),
  "contract p02_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp523_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP523_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp523_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION)));
assert.equal(cp523Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp523Hermes.production_ready_candidate, true);
assert.equal(cp523Claude.review_packet, "C17.CP00-523.ai_governance_core_p02_fixture_slice_descriptor");
assert.equal(cp523Claude.read_only, true);
assert.equal(cp523Handoff.to_pack_id, "CP00-524");
assert.equal(cp523Handoff.next_subphase_id, "RP17.P02.M06.S16");
assert.equal(AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp524Coverage.valid, true, cp524Coverage.errors.join("; "));
assert.equal(cp524Coverage.summary.unit_count, 10);
assert.equal(cp524Coverage.summary.by_micro_phase["RP17.P02.M06"], 7);
assert.equal(cp524Coverage.summary.by_micro_phase["RP17.P02.M07"], 3);
assert.equal(cp524Slice.valid, true, cp524Slice.errors.join("; "));
assert.equal(cp524CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP524_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp524CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-524 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_fixture_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp524Descriptor)),
  "contract p02_fixture_test_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp524_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP524_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp524_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION)));
assert.equal(cp524Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp524Hermes.production_ready_candidate, true);
assert.equal(cp524Claude.review_packet, "C17.CP00-524.ai_governance_core_p02_fixture_test_slice_descriptor");
assert.equal(cp524Claude.read_only, true);
assert.equal(cp524Handoff.to_pack_id, "CP00-525");
assert.equal(cp524Handoff.next_subphase_id, "RP17.P02.M07.S04");
assert.equal(AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp525Coverage.valid, true, cp525Coverage.errors.join("; "));
assert.equal(cp525Coverage.summary.unit_count, 40);
assert.equal(cp525Coverage.summary.by_micro_phase["RP17.P02.M07"], 22);
assert.equal(cp525Coverage.summary.by_micro_phase["RP17.P02.M08"], 18);
assert.equal(cp525Slice.valid, true, cp525Slice.errors.join("; "));
assert.equal(cp525CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP525_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp525CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-525 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp525Descriptor)),
  "contract p02_test_hermes_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp525_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP525_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp525_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION)));
assert.equal(cp525Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp525Hermes.production_ready_candidate, true);
assert.equal(cp525Claude.review_packet, "C17.CP00-525.ai_governance_core_p02_test_hermes_slice_descriptor");
assert.equal(cp525Claude.read_only, true);
assert.equal(cp525Handoff.to_pack_id, "CP00-526");
assert.equal(cp525Handoff.next_subphase_id, "RP17.P02.M08.S19");
assert.equal(AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp526Coverage.valid, true, cp526Coverage.errors.join("; "));
assert.equal(cp526Coverage.summary.unit_count, 150);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P02.M08"], 4);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P02.M09"], 22);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P02.M10"], 20);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M00"], 10);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M01"], 10);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M02"], 20);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M03"], 22);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M04"], 20);
assert.equal(cp526Coverage.summary.by_micro_phase["RP17.P03.M05"], 22);
assert.equal(cp526Slice.valid, true, cp526Slice.errors.join("; "));
assert.equal(cp526CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP526_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp526CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-526 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp526Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp526_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP526_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp526_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION)));
assert.equal(cp526Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp526Hermes.production_ready_candidate, true);
assert.equal(cp526Claude.review_packet, "C17.CP00-526.ai_governance_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp526Claude.read_only, true);
assert.equal(cp526Handoff.to_pack_id, "CP00-527");
assert.equal(cp526Handoff.next_subphase_id, "RP17.P03.M06.S01");
assert.equal(AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp527Coverage.valid, true, cp527Coverage.errors.join("; "));
assert.equal(cp527Coverage.summary.unit_count, 150);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P03.M06"], 20);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P03.M07"], 22);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P03.M08"], 20);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P03.M09"], 20);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P03.M10"], 10);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P04.M00"], 10);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P04.M01"], 20);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P04.M02"], 20);
assert.equal(cp527Coverage.summary.by_micro_phase["RP17.P04.M03"], 8);
assert.equal(cp527Slice.valid, true, cp527Slice.errors.join("; "));
assert.equal(cp527CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP527_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp527CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-527 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp527Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp527_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP527_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp527_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION)));
assert.equal(cp527Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp527Hermes.production_ready_candidate, true);
assert.equal(cp527Claude.review_packet, "C17.CP00-527.ai_governance_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp527Claude.read_only, true);
assert.equal(cp527Handoff.to_pack_id, "CP00-528");
assert.equal(cp527Handoff.next_subphase_id, "RP17.P04.M03.S09");
assert.equal(AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp528Coverage.valid, true, cp528Coverage.errors.join("; "));
assert.equal(cp528Coverage.summary.unit_count, 10);
assert.equal(cp528Coverage.summary.by_micro_phase["RP17.P04.M03"], 10);
assert.equal(cp528Slice.valid, true, cp528Slice.errors.join("; "));
assert.equal(cp528CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP528_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp528CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-528 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p04_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp528Descriptor)),
  "contract p04_implementation_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp528_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP528_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp528_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION)));
assert.equal(cp528Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp528Hermes.production_ready_candidate, true);
assert.equal(cp528Claude.review_packet, "C17.CP00-528.ai_governance_core_p04_implementation_slice_descriptor");
assert.equal(cp528Claude.read_only, true);
assert.equal(cp528Handoff.to_pack_id, "CP00-529");
assert.equal(cp528Handoff.next_subphase_id, "RP17.P04.M03.S19");
assert.equal(AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp529Coverage.valid, true, cp529Coverage.errors.join("; "));
assert.equal(cp529Coverage.summary.unit_count, 40);
assert.equal(cp529Coverage.summary.by_micro_phase["RP17.P04.M03"], 4);
assert.equal(cp529Coverage.summary.by_micro_phase["RP17.P04.M04"], 22);
assert.equal(cp529Coverage.summary.by_micro_phase["RP17.P04.M05"], 14);
assert.equal(cp529Slice.valid, true, cp529Slice.errors.join("; "));
assert.equal(cp529CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP529_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp529CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-529 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p04_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp529Descriptor)),
  "contract p04_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp529_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP529_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp529_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION)));
assert.equal(cp529Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp529Hermes.production_ready_candidate, true);
assert.equal(cp529Claude.review_packet, "C17.CP00-529.ai_governance_core_p04_workflow_permission_slice_descriptor");
assert.equal(cp529Claude.read_only, true);
assert.equal(cp529Handoff.to_pack_id, "CP00-530");
assert.equal(cp529Handoff.next_subphase_id, "RP17.P04.M05.S15");
assert.equal(AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp530Coverage.valid, true, cp530Coverage.errors.join("; "));
assert.equal(cp530Coverage.summary.unit_count, 10);
assert.equal(cp530Coverage.summary.by_micro_phase["RP17.P04.M05"], 8);
assert.equal(cp530Coverage.summary.by_micro_phase["RP17.P04.M06"], 2);
assert.equal(cp530Slice.valid, true, cp530Slice.errors.join("; "));
assert.equal(cp530CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP530_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp530CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-530 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp530Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp530_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP530_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp530_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION)));
assert.equal(cp530Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp530Hermes.production_ready_candidate, true);
assert.equal(cp530Claude.review_packet, "C17.CP00-530.ai_governance_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp530Claude.read_only, true);
assert.equal(cp530Handoff.to_pack_id, "CP00-531");
assert.equal(cp530Handoff.next_subphase_id, "RP17.P04.M06.S03");
assert.equal(AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp531Coverage.valid, true, cp531Coverage.errors.join("; "));
assert.equal(cp531Coverage.summary.unit_count, 150);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P04.M06"], 20);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P04.M07"], 22);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P04.M08"], 22);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P04.M09"], 22);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P04.M10"], 20);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P05.M00"], 10);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P05.M01"], 20);
assert.equal(cp531Coverage.summary.by_micro_phase["RP17.P05.M02"], 14);
assert.equal(cp531Slice.valid, true, cp531Slice.errors.join("; "));
assert.equal(cp531CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP531_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp531CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-531 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp531Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp531_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP531_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp531_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION)));
assert.equal(cp531Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp531Hermes.production_ready_candidate, true);
assert.equal(cp531Claude.review_packet, "C17.CP00-531.ai_governance_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp531Claude.read_only, true);
assert.equal(cp531Handoff.to_pack_id, "CP00-532");
assert.equal(cp531Handoff.next_subphase_id, "RP17.P05.M02.S15");
assert.equal(AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp532Coverage.valid, true, cp532Coverage.errors.join("; "));
assert.equal(cp532Coverage.summary.unit_count, 40);
assert.equal(cp532Coverage.summary.by_micro_phase["RP17.P05.M02"], 6);
assert.equal(cp532Coverage.summary.by_micro_phase["RP17.P05.M03"], 22);
assert.equal(cp532Coverage.summary.by_micro_phase["RP17.P05.M04"], 12);
assert.equal(cp532Slice.valid, true, cp532Slice.errors.join("; "));
assert.equal(cp532CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP532_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp532CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-532 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p05_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp532Descriptor)),
  "contract p05_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp532_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP532_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp532_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION)));
assert.equal(cp532Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp532Hermes.production_ready_candidate, true);
assert.equal(cp532Claude.review_packet, "C17.CP00-532.ai_governance_core_p05_implementation_workflow_slice_descriptor");
assert.equal(cp532Claude.read_only, true);
assert.equal(cp532Handoff.to_pack_id, "CP00-533");
assert.equal(cp532Handoff.next_subphase_id, "RP17.P05.M04.S13");
assert.equal(AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp533Coverage.valid, true, cp533Coverage.errors.join("; "));
assert.equal(cp533Coverage.summary.unit_count, 40);
assert.equal(cp533Coverage.summary.by_micro_phase["RP17.P05.M04"], 10);
assert.equal(cp533Coverage.summary.by_micro_phase["RP17.P05.M05"], 22);
assert.equal(cp533Coverage.summary.by_micro_phase["RP17.P05.M06"], 8);
assert.equal(cp533Slice.valid, true, cp533Slice.errors.join("; "));
assert.equal(cp533CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP533_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp533CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-533 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p05_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp533Descriptor)),
  "contract p05_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp533_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP533_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp533_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION)));
assert.equal(cp533Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp533Hermes.production_ready_candidate, true);
assert.equal(cp533Claude.review_packet, "C17.CP00-533.ai_governance_core_p05_workflow_permission_slice_descriptor");
assert.equal(cp533Claude.read_only, true);
assert.equal(cp533Handoff.to_pack_id, "CP00-534");
assert.equal(cp533Handoff.next_subphase_id, "RP17.P05.M06.S09");
assert.equal(AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp534Coverage.valid, true, cp534Coverage.errors.join("; "));
assert.equal(cp534Coverage.summary.unit_count, 10);
assert.equal(cp534Coverage.summary.by_micro_phase["RP17.P05.M06"], 10);
assert.equal(cp534Slice.valid, true, cp534Slice.errors.join("; "));
assert.equal(cp534CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP534_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp534CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-534 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p05_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp534Descriptor)),
  "contract p05_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp534_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP534_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp534_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION)));
assert.equal(cp534Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp534Hermes.production_ready_candidate, true);
assert.equal(cp534Claude.review_packet, "C17.CP00-534.ai_governance_core_p05_fixture_slice_descriptor");
assert.equal(cp534Claude.read_only, true);
assert.equal(cp534Handoff.to_pack_id, "CP00-535");
assert.equal(cp534Handoff.next_subphase_id, "RP17.P05.M06.S19");
assert.equal(AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp535Coverage.valid, true, cp535Coverage.errors.join("; "));
assert.equal(cp535Coverage.summary.unit_count, 150);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P05.M06"], 4);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P05.M07"], 22);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P05.M08"], 22);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P05.M09"], 22);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P05.M10"], 20);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P06.M00"], 20);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P06.M01"], 20);
assert.equal(cp535Coverage.summary.by_micro_phase["RP17.P06.M02"], 20);
assert.equal(cp535Slice.valid, true, cp535Slice.errors.join("; "));
assert.equal(cp535CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP535_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp535CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-535 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp535Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp535_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP535_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp535_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION)));
assert.equal(cp535Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp535Hermes.production_ready_candidate, true);
assert.equal(cp535Claude.review_packet, "C17.CP00-535.ai_governance_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp535Claude.read_only, true);
assert.equal(cp535Handoff.to_pack_id, "CP00-536");
assert.equal(cp535Handoff.next_subphase_id, "RP17.P06.M02.S21");
assert.equal(AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp536Coverage.valid, true, cp536Coverage.errors.join("; "));
assert.equal(cp536Coverage.summary.unit_count, 10);
assert.equal(cp536Coverage.summary.by_micro_phase["RP17.P06.M02"], 2);
assert.equal(cp536Coverage.summary.by_micro_phase["RP17.P06.M03"], 8);
assert.equal(cp536Slice.valid, true, cp536Slice.errors.join("; "));
assert.equal(cp536CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP536_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp536CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-536 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p06_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp536Descriptor)),
  "contract p06_foundation_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp536_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP536_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp536_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION)));
assert.equal(cp536Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp536Hermes.production_ready_candidate, true);
assert.equal(cp536Claude.review_packet, "C17.CP00-536.ai_governance_core_p06_foundation_slice_descriptor");
assert.equal(cp536Claude.read_only, true);
assert.equal(cp536Handoff.to_pack_id, "CP00-537");
assert.equal(cp536Handoff.next_subphase_id, "RP17.P06.M03.S09");
assert.equal(AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp537Coverage.valid, true, cp537Coverage.errors.join("; "));
assert.equal(cp537Coverage.summary.unit_count, 40);
assert.equal(cp537Coverage.summary.by_micro_phase["RP17.P06.M03"], 17);
assert.equal(cp537Coverage.summary.by_micro_phase["RP17.P06.M04"], 23);
assert.equal(cp537Slice.valid, true, cp537Slice.errors.join("; "));
assert.equal(cp537CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP537_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp537CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-537 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p06_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp537Descriptor)),
  "contract p06_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp537_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP537_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp537_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION)));
assert.equal(cp537Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp537Hermes.production_ready_candidate, true);
assert.equal(cp537Claude.review_packet, "C17.CP00-537.ai_governance_core_p06_implementation_workflow_slice_descriptor");
assert.equal(cp537Claude.read_only, true);
assert.equal(cp537Handoff.to_pack_id, "CP00-538");
assert.equal(cp537Handoff.next_subphase_id, "RP17.P06.M04.S24");
assert.equal(AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp538Coverage.valid, true, cp538Coverage.errors.join("; "));
assert.equal(cp538Coverage.summary.unit_count, 40);
assert.equal(cp538Coverage.summary.by_micro_phase["RP17.P06.M04"], 2);
assert.equal(cp538Coverage.summary.by_micro_phase["RP17.P06.M05"], 25);
assert.equal(cp538Coverage.summary.by_micro_phase["RP17.P06.M06"], 13);
assert.equal(cp538Slice.valid, true, cp538Slice.errors.join("; "));
assert.equal(cp538CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP538_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp538CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-538 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p06_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp538Descriptor)),
  "contract p06_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp538_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP538_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp538_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION)));
assert.equal(cp538Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp538Hermes.production_ready_candidate, true);
assert.equal(cp538Claude.review_packet, "C17.CP00-538.ai_governance_core_p06_workflow_permission_slice_descriptor");
assert.equal(cp538Claude.read_only, true);
assert.equal(cp538Handoff.to_pack_id, "CP00-539");
assert.equal(cp538Handoff.next_subphase_id, "RP17.P06.M06.S14");
assert.equal(AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp539Coverage.valid, true, cp539Coverage.errors.join("; "));
assert.equal(cp539Coverage.summary.unit_count, 150);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P06.M06"], 9);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P06.M07"], 25);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P06.M08"], 22);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P06.M09"], 22);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P06.M10"], 20);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P07.M00"], 20);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P07.M01"], 20);
assert.equal(cp539Coverage.summary.by_micro_phase["RP17.P07.M02"], 12);
assert.equal(cp539Slice.valid, true, cp539Slice.errors.join("; "));
assert.equal(cp539CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP539_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp539CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-539 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp539Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp539_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP539_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp539_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION)));
assert.equal(cp539Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp539Hermes.production_ready_candidate, true);
assert.equal(cp539Claude.review_packet, "C17.CP00-539.ai_governance_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp539Claude.read_only, true);
assert.equal(cp539Handoff.to_pack_id, "CP00-540");
assert.equal(cp539Handoff.next_subphase_id, "RP17.P07.M02.S13");
assert.equal(AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp540Coverage.valid, true, cp540Coverage.errors.join("; "));
assert.equal(cp540Coverage.summary.unit_count, 40);
assert.equal(cp540Coverage.summary.by_micro_phase["RP17.P07.M02"], 10);
assert.equal(cp540Coverage.summary.by_micro_phase["RP17.P07.M03"], 25);
assert.equal(cp540Coverage.summary.by_micro_phase["RP17.P07.M04"], 5);
assert.equal(cp540Slice.valid, true, cp540Slice.errors.join("; "));
assert.equal(cp540CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP540_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp540CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-540 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p07_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp540Descriptor)),
  "contract p07_implementation_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp540_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP540_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp540_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION)));
assert.equal(cp540Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp540Hermes.production_ready_candidate, true);
assert.equal(cp540Claude.review_packet, "C17.CP00-540.ai_governance_core_p07_implementation_slice_descriptor");
assert.equal(cp540Claude.read_only, true);
assert.equal(cp540Handoff.to_pack_id, "CP00-541");
assert.equal(cp540Handoff.next_subphase_id, "RP17.P07.M04.S06");
assert.equal(AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp541Coverage.valid, true, cp541Coverage.errors.join("; "));
assert.equal(cp541Coverage.summary.unit_count, 40);
assert.equal(cp541Coverage.summary.by_micro_phase["RP17.P07.M04"], 20);
assert.equal(cp541Coverage.summary.by_micro_phase["RP17.P07.M05"], 20);
assert.equal(cp541Slice.valid, true, cp541Slice.errors.join("; "));
assert.equal(cp541CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP541_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp541CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-541 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p07_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp541Descriptor)),
  "contract p07_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp541_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP541_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp541_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION)));
assert.equal(cp541Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp541Hermes.production_ready_candidate, true);
assert.equal(cp541Claude.review_packet, "C17.CP00-541.ai_governance_core_p07_workflow_permission_slice_descriptor");
assert.equal(cp541Claude.read_only, true);
assert.equal(cp541Handoff.to_pack_id, "CP00-542");
assert.equal(cp541Handoff.next_subphase_id, "RP17.P07.M05.S21");
assert.equal(AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp542Coverage.valid, true, cp542Coverage.errors.join("; "));
assert.equal(cp542Coverage.summary.unit_count, 10);
assert.equal(cp542Coverage.summary.by_micro_phase["RP17.P07.M05"], 5);
assert.equal(cp542Coverage.summary.by_micro_phase["RP17.P07.M06"], 5);
assert.equal(cp542Slice.valid, true, cp542Slice.errors.join("; "));
assert.equal(cp542CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP542_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp542CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-542 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p07_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp542Descriptor)),
  "contract p07_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp542_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP542_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp542_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION)));
assert.equal(cp542Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp542Hermes.production_ready_candidate, true);
assert.equal(cp542Claude.review_packet, "C17.CP00-542.ai_governance_core_p07_permission_fixture_slice_descriptor");
assert.equal(cp542Claude.read_only, true);
assert.equal(cp542Handoff.to_pack_id, "CP00-543");
assert.equal(cp542Handoff.next_subphase_id, "RP17.P07.M06.S06");
assert.equal(AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp543Coverage.valid, true, cp543Coverage.errors.join("; "));
assert.equal(cp543Coverage.summary.unit_count, 150);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P07.M06"], 17);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P07.M07"], 25);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P07.M08"], 22);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P07.M09"], 22);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P07.M10"], 20);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P08.M00"], 10);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P08.M01"], 20);
assert.equal(cp543Coverage.summary.by_micro_phase["RP17.P08.M02"], 14);
assert.equal(cp543Slice.valid, true, cp543Slice.errors.join("; "));
assert.equal(cp543CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP543_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp543CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-543 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp543Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp543_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP543_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp543_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION)));
assert.equal(cp543Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp543Hermes.production_ready_candidate, true);
assert.equal(cp543Claude.review_packet, "C17.CP00-543.ai_governance_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp543Claude.read_only, true);
assert.equal(cp543Handoff.to_pack_id, "CP00-544");
assert.equal(cp543Handoff.next_subphase_id, "RP17.P08.M02.S15");
assert.equal(AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp544Coverage.valid, true, cp544Coverage.errors.join("; "));
assert.equal(cp544Coverage.summary.unit_count, 40);
assert.equal(cp544Coverage.summary.by_micro_phase["RP17.P08.M02"], 6);
assert.equal(cp544Coverage.summary.by_micro_phase["RP17.P08.M03"], 22);
assert.equal(cp544Coverage.summary.by_micro_phase["RP17.P08.M04"], 12);
assert.equal(cp544Slice.valid, true, cp544Slice.errors.join("; "));
assert.equal(cp544CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP544_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp544CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-544 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p08_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp544Descriptor)),
  "contract p08_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp544_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP544_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp544_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION)));
assert.equal(cp544Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp544Hermes.production_ready_candidate, true);
assert.equal(cp544Claude.review_packet, "C17.CP00-544.ai_governance_core_p08_implementation_workflow_slice_descriptor");
assert.equal(cp544Claude.read_only, true);
assert.equal(cp544Handoff.to_pack_id, "CP00-545");
assert.equal(cp544Handoff.next_subphase_id, "RP17.P08.M04.S13");
assert.equal(AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp545Coverage.valid, true, cp545Coverage.errors.join("; "));
assert.equal(cp545Coverage.summary.unit_count, 40);
assert.equal(cp545Coverage.summary.by_micro_phase["RP17.P08.M04"], 10);
assert.equal(cp545Coverage.summary.by_micro_phase["RP17.P08.M05"], 22);
assert.equal(cp545Coverage.summary.by_micro_phase["RP17.P08.M06"], 8);
assert.equal(cp545Slice.valid, true, cp545Slice.errors.join("; "));
assert.equal(cp545CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP545_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp545CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-545 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p08_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp545Descriptor)),
  "contract p08_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp545_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP545_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp545_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION)));
assert.equal(cp545Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp545Hermes.production_ready_candidate, true);
assert.equal(cp545Claude.review_packet, "C17.CP00-545.ai_governance_core_p08_workflow_permission_slice_descriptor");
assert.equal(cp545Claude.read_only, true);
assert.equal(cp545Handoff.to_pack_id, "CP00-546");
assert.equal(cp545Handoff.next_subphase_id, "RP17.P08.M06.S09");
assert.equal(AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp546Coverage.valid, true, cp546Coverage.errors.join("; "));
assert.equal(cp546Coverage.summary.unit_count, 150);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P08.M06"], 14);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P08.M07"], 22);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P08.M08"], 22);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P08.M09"], 22);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P08.M10"], 20);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P09.M00"], 10);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P09.M01"], 10);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P09.M02"], 20);
assert.equal(cp546Coverage.summary.by_micro_phase["RP17.P09.M03"], 10);
assert.equal(cp546Slice.valid, true, cp546Slice.errors.join("; "));
assert.equal(cp546CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP546_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp546CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-546 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp546Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp546_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP546_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp546_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION)));
assert.equal(cp546Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp546Hermes.production_ready_candidate, true);
assert.equal(cp546Claude.review_packet, "C17.CP00-546.ai_governance_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp546Claude.read_only, true);
assert.equal(cp546Handoff.to_pack_id, "CP00-547");
assert.equal(cp546Handoff.next_subphase_id, "RP17.P09.M03.S11");
assert.equal(AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp547Coverage.valid, true, cp547Coverage.errors.join("; "));
assert.equal(cp547Coverage.summary.unit_count, 40);
assert.equal(cp547Coverage.summary.by_micro_phase["RP17.P09.M03"], 12);
assert.equal(cp547Coverage.summary.by_micro_phase["RP17.P09.M04"], 20);
assert.equal(cp547Coverage.summary.by_micro_phase["RP17.P09.M05"], 8);
assert.equal(cp547Slice.valid, true, cp547Slice.errors.join("; "));
assert.equal(cp547CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP547_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp547CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-547 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p09_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp547Descriptor)),
  "contract p09_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp547_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP547_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp547_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION)));
assert.equal(cp547Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp547Hermes.production_ready_candidate, true);
assert.equal(cp547Claude.review_packet, "C17.CP00-547.ai_governance_core_p09_workflow_permission_slice_descriptor");
assert.equal(cp547Claude.read_only, true);
assert.equal(cp547Handoff.to_pack_id, "CP00-548");
assert.equal(cp547Handoff.next_subphase_id, "RP17.P09.M05.S09");
assert.equal(AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp548Coverage.valid, true, cp548Coverage.errors.join("; "));
assert.equal(cp548Coverage.summary.unit_count, 10);
assert.equal(cp548Coverage.summary.by_micro_phase["RP17.P09.M05"], 10);
assert.equal(cp548Slice.valid, true, cp548Slice.errors.join("; "));
assert.equal(cp548CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP548_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp548CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-548 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p09_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp548Descriptor)),
  "contract p09_permission_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp548_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP548_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp548_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION)));
assert.equal(cp548Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp548Hermes.production_ready_candidate, true);
assert.equal(cp548Claude.review_packet, "C17.CP00-548.ai_governance_core_p09_permission_slice_descriptor");
assert.equal(cp548Claude.read_only, true);
assert.equal(cp548Handoff.to_pack_id, "CP00-549");
assert.equal(cp548Handoff.next_subphase_id, "RP17.P09.M05.S19");
assert.equal(AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp549Coverage.valid, true, cp549Coverage.errors.join("; "));
assert.equal(cp549Coverage.summary.unit_count, 10);
assert.equal(cp549Coverage.summary.by_micro_phase["RP17.P09.M05"], 4);
assert.equal(cp549Coverage.summary.by_micro_phase["RP17.P09.M06"], 6);
assert.equal(cp549Slice.valid, true, cp549Slice.errors.join("; "));
assert.equal(cp549CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP549_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp549CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-549 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p09_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp549Descriptor)),
  "contract p09_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp549_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP549_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp549_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION)));
assert.equal(cp549Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp549Hermes.production_ready_candidate, true);
assert.equal(cp549Claude.review_packet, "C17.CP00-549.ai_governance_core_p09_permission_fixture_slice_descriptor");
assert.equal(cp549Claude.read_only, true);
assert.equal(cp549Handoff.to_pack_id, "CP00-550");
assert.equal(cp549Handoff.next_subphase_id, "RP17.P09.M06.S07");
assert.equal(AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp550Coverage.valid, true, cp550Coverage.errors.join("; "));
assert.equal(cp550Coverage.summary.unit_count, 86);
assert.equal(cp550Coverage.summary.by_micro_phase["RP17.P09.M06"], 14);
assert.equal(cp550Coverage.summary.by_micro_phase["RP17.P09.M07"], 22);
assert.equal(cp550Coverage.summary.by_micro_phase["RP17.P09.M08"], 20);
assert.equal(cp550Coverage.summary.by_micro_phase["RP17.P09.M09"], 20);
assert.equal(cp550Coverage.summary.by_micro_phase["RP17.P09.M10"], 10);
assert.equal(cp550Slice.valid, true, cp550Slice.errors.join("; "));
assert.equal(cp550CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP550_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp550CaseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
    assert.ok(row, `CP00-550 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiGovernanceContract.p09_closeout_handoff_slice_descriptor,
  JSON.parse(JSON.stringify(cp550Descriptor)),
  "contract p09_closeout_handoff_slice_descriptor drift",
);
assert.deepEqual(aiGovernanceContract.cp550_requirements, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP550_REQUIREMENTS)));
assert.deepEqual(aiGovernanceContract.cp550_no_write_attestation, JSON.parse(JSON.stringify(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION)));
assert.equal(cp550Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp550Hermes.production_ready_candidate, true);
assert.equal(cp550Claude.review_packet, "C17.CP00-550.ai_governance_core_p09_closeout_handoff_slice_descriptor");
assert.equal(cp550Claude.read_only, true);
assert.equal(cp550Handoff.to_pack_id, "CP00-551");
assert.equal(cp550Handoff.next_subphase_id, "RP18.P00.M00.S01");
assert.equal(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(aiGovernanceContract.historical_pack_bindings));
assert.equal(aiGovernanceContract.historical_pack_bindings.at(-1).pack_id, "CP00-550");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp17:ai-governance-core:validate",
      pack_id: AI_GOVERNANCE_CORE_CP550_PACK_BINDING.pack_id,
      covered_units: cp550Coverage.summary.unit_count,
      cp549_units_preserved: cp549Coverage.summary.unit_count,
      cp548_units_preserved: cp548Coverage.summary.unit_count,
      cp547_units_preserved: cp547Coverage.summary.unit_count,
      cp546_units_preserved: cp546Coverage.summary.unit_count,
      cp545_units_preserved: cp545Coverage.summary.unit_count,
      cp544_units_preserved: cp544Coverage.summary.unit_count,
      cp543_units_preserved: cp543Coverage.summary.unit_count,
      cp542_units_preserved: cp542Coverage.summary.unit_count,
      cp541_units_preserved: cp541Coverage.summary.unit_count,
      cp540_units_preserved: cp540Coverage.summary.unit_count,
      cp539_units_preserved: cp539Coverage.summary.unit_count,
      cp538_units_preserved: cp538Coverage.summary.unit_count,
      cp537_units_preserved: cp537Coverage.summary.unit_count,
      cp536_units_preserved: cp536Coverage.summary.unit_count,
      cp535_units_preserved: cp535Coverage.summary.unit_count,
      cp534_units_preserved: cp534Coverage.summary.unit_count,
      cp533_units_preserved: cp533Coverage.summary.unit_count,
      cp532_units_preserved: cp532Coverage.summary.unit_count,
      cp531_units_preserved: cp531Coverage.summary.unit_count,
      cp530_units_preserved: cp530Coverage.summary.unit_count,
      cp529_units_preserved: cp529Coverage.summary.unit_count,
      cp528_units_preserved: cp528Coverage.summary.unit_count,
      cp527_units_preserved: cp527Coverage.summary.unit_count,
      cp526_units_preserved: cp526Coverage.summary.unit_count,
      cp525_units_preserved: cp525Coverage.summary.unit_count,
      cp524_units_preserved: cp524Coverage.summary.unit_count,
      cp523_units_preserved: cp523Coverage.summary.unit_count,
      cp522_units_preserved: cp522Coverage.summary.unit_count,
      cp521_units_preserved: cp521Coverage.summary.unit_count,
      cp520_units_preserved: cp520Coverage.summary.unit_count,
      cp519_units_preserved: cp519Coverage.summary.unit_count,
      cp518_units_preserved: cp518Coverage.summary.unit_count,
      cp517_units_preserved: cp517Coverage.summary.unit_count,
      cp516_units_preserved: cp516Coverage.summary.unit_count,
      cp515_units_preserved: cp515Coverage.summary.unit_count,
      cp514_units_preserved: cp514Coverage.summary.unit_count,
      program_id: AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp550Hermes.gate,
      claude_gate: aiGovernanceContract.current_pack.claude_gate,
      source_governance_core_pack_id: AI_GOVERNANCE_CORE_CP514_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp550Handoff.to_pack_id,
      production_ready_candidate: cp550Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
