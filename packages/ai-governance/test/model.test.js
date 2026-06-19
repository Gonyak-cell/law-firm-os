import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const aiGovernanceContract = JSON.parse(
  readFileSync(new URL("../../../contracts/ai-governance-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp514ManifestPath = new URL("../../../docs/closeout-packs/cp00-514/manifest.json", import.meta.url);
const cp514Manifest = existsSync(cp514ManifestPath) ? JSON.parse(readFileSync(cp514ManifestPath, "utf8")) : null;
const cp514PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-514") ?? cp514Manifest?.plan_binding_snapshot;
const cp515ManifestPath = new URL("../../../docs/closeout-packs/cp00-515/manifest.json", import.meta.url);
const cp515Manifest = existsSync(cp515ManifestPath) ? JSON.parse(readFileSync(cp515ManifestPath, "utf8")) : null;
const cp515PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-515") ?? cp515Manifest?.plan_binding_snapshot;
const cp516ManifestPath = new URL("../../../docs/closeout-packs/cp00-516/manifest.json", import.meta.url);
const cp516Manifest = existsSync(cp516ManifestPath) ? JSON.parse(readFileSync(cp516ManifestPath, "utf8")) : null;
const cp516PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-516") ?? cp516Manifest?.plan_binding_snapshot;
const cp517ManifestPath = new URL("../../../docs/closeout-packs/cp00-517/manifest.json", import.meta.url);
const cp517Manifest = existsSync(cp517ManifestPath) ? JSON.parse(readFileSync(cp517ManifestPath, "utf8")) : null;
const cp517PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-517") ?? cp517Manifest?.plan_binding_snapshot;
const cp518ManifestPath = new URL("../../../docs/closeout-packs/cp00-518/manifest.json", import.meta.url);
const cp518Manifest = existsSync(cp518ManifestPath) ? JSON.parse(readFileSync(cp518ManifestPath, "utf8")) : null;
const cp518PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-518") ?? cp518Manifest?.plan_binding_snapshot;
const cp519ManifestPath = new URL("../../../docs/closeout-packs/cp00-519/manifest.json", import.meta.url);
const cp519Manifest = existsSync(cp519ManifestPath) ? JSON.parse(readFileSync(cp519ManifestPath, "utf8")) : null;
const cp519PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-519") ?? cp519Manifest?.plan_binding_snapshot;
const cp520ManifestPath = new URL("../../../docs/closeout-packs/cp00-520/manifest.json", import.meta.url);
const cp520Manifest = existsSync(cp520ManifestPath) ? JSON.parse(readFileSync(cp520ManifestPath, "utf8")) : null;
const cp520PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-520") ?? cp520Manifest?.plan_binding_snapshot;
const cp521ManifestPath = new URL("../../../docs/closeout-packs/cp00-521/manifest.json", import.meta.url);
const cp521Manifest = existsSync(cp521ManifestPath) ? JSON.parse(readFileSync(cp521ManifestPath, "utf8")) : null;
const cp521PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-521") ?? cp521Manifest?.plan_binding_snapshot;
const cp522ManifestPath = new URL("../../../docs/closeout-packs/cp00-522/manifest.json", import.meta.url);
const cp522Manifest = existsSync(cp522ManifestPath) ? JSON.parse(readFileSync(cp522ManifestPath, "utf8")) : null;
const cp522PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-522") ?? cp522Manifest?.plan_binding_snapshot;
const cp523ManifestPath = new URL("../../../docs/closeout-packs/cp00-523/manifest.json", import.meta.url);
const cp523Manifest = existsSync(cp523ManifestPath) ? JSON.parse(readFileSync(cp523ManifestPath, "utf8")) : null;
const cp523PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-523") ?? cp523Manifest?.plan_binding_snapshot;
const cp524ManifestPath = new URL("../../../docs/closeout-packs/cp00-524/manifest.json", import.meta.url);
const cp524Manifest = existsSync(cp524ManifestPath) ? JSON.parse(readFileSync(cp524ManifestPath, "utf8")) : null;
const cp524PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-524") ?? cp524Manifest?.plan_binding_snapshot;
const cp525ManifestPath = new URL("../../../docs/closeout-packs/cp00-525/manifest.json", import.meta.url);
const cp525Manifest = existsSync(cp525ManifestPath) ? JSON.parse(readFileSync(cp525ManifestPath, "utf8")) : null;
const cp525PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-525") ?? cp525Manifest?.plan_binding_snapshot;
const cp526ManifestPath = new URL("../../../docs/closeout-packs/cp00-526/manifest.json", import.meta.url);
const cp526Manifest = existsSync(cp526ManifestPath) ? JSON.parse(readFileSync(cp526ManifestPath, "utf8")) : null;
const cp526PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-526") ?? cp526Manifest?.plan_binding_snapshot;
const cp527ManifestPath = new URL("../../../docs/closeout-packs/cp00-527/manifest.json", import.meta.url);
const cp527Manifest = existsSync(cp527ManifestPath) ? JSON.parse(readFileSync(cp527ManifestPath, "utf8")) : null;
const cp527PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-527") ?? cp527Manifest?.plan_binding_snapshot;
const cp528ManifestPath = new URL("../../../docs/closeout-packs/cp00-528/manifest.json", import.meta.url);
const cp528Manifest = existsSync(cp528ManifestPath) ? JSON.parse(readFileSync(cp528ManifestPath, "utf8")) : null;
const cp528PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-528") ?? cp528Manifest?.plan_binding_snapshot;
const cp529ManifestPath = new URL("../../../docs/closeout-packs/cp00-529/manifest.json", import.meta.url);
const cp529Manifest = existsSync(cp529ManifestPath) ? JSON.parse(readFileSync(cp529ManifestPath, "utf8")) : null;
const cp529PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-529") ?? cp529Manifest?.plan_binding_snapshot;
const cp530ManifestPath = new URL("../../../docs/closeout-packs/cp00-530/manifest.json", import.meta.url);
const cp530Manifest = existsSync(cp530ManifestPath) ? JSON.parse(readFileSync(cp530ManifestPath, "utf8")) : null;
const cp530PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-530") ?? cp530Manifest?.plan_binding_snapshot;
const cp531ManifestPath = new URL("../../../docs/closeout-packs/cp00-531/manifest.json", import.meta.url);
const cp531Manifest = existsSync(cp531ManifestPath) ? JSON.parse(readFileSync(cp531ManifestPath, "utf8")) : null;
const cp531PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-531") ?? cp531Manifest?.plan_binding_snapshot;
const cp532ManifestPath = new URL("../../../docs/closeout-packs/cp00-532/manifest.json", import.meta.url);
const cp532Manifest = existsSync(cp532ManifestPath) ? JSON.parse(readFileSync(cp532ManifestPath, "utf8")) : null;
const cp532PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-532") ?? cp532Manifest?.plan_binding_snapshot;
const cp533ManifestPath = new URL("../../../docs/closeout-packs/cp00-533/manifest.json", import.meta.url);
const cp533Manifest = existsSync(cp533ManifestPath) ? JSON.parse(readFileSync(cp533ManifestPath, "utf8")) : null;
const cp533PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-533") ?? cp533Manifest?.plan_binding_snapshot;
const cp534ManifestPath = new URL("../../../docs/closeout-packs/cp00-534/manifest.json", import.meta.url);
const cp534Manifest = existsSync(cp534ManifestPath) ? JSON.parse(readFileSync(cp534ManifestPath, "utf8")) : null;
const cp534PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-534") ?? cp534Manifest?.plan_binding_snapshot;
const cp535ManifestPath = new URL("../../../docs/closeout-packs/cp00-535/manifest.json", import.meta.url);
const cp535Manifest = existsSync(cp535ManifestPath) ? JSON.parse(readFileSync(cp535ManifestPath, "utf8")) : null;
const cp535PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-535") ?? cp535Manifest?.plan_binding_snapshot;
const cp536ManifestPath = new URL("../../../docs/closeout-packs/cp00-536/manifest.json", import.meta.url);
const cp536Manifest = existsSync(cp536ManifestPath) ? JSON.parse(readFileSync(cp536ManifestPath, "utf8")) : null;
const cp536PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-536") ?? cp536Manifest?.plan_binding_snapshot;
const cp537ManifestPath = new URL("../../../docs/closeout-packs/cp00-537/manifest.json", import.meta.url);
const cp537Manifest = existsSync(cp537ManifestPath) ? JSON.parse(readFileSync(cp537ManifestPath, "utf8")) : null;
const cp537PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-537") ?? cp537Manifest?.plan_binding_snapshot;
const cp538ManifestPath = new URL("../../../docs/closeout-packs/cp00-538/manifest.json", import.meta.url);
const cp538Manifest = existsSync(cp538ManifestPath) ? JSON.parse(readFileSync(cp538ManifestPath, "utf8")) : null;
const cp538PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-538") ?? cp538Manifest?.plan_binding_snapshot;
const cp539ManifestPath = new URL("../../../docs/closeout-packs/cp00-539/manifest.json", import.meta.url);
const cp539Manifest = existsSync(cp539ManifestPath) ? JSON.parse(readFileSync(cp539ManifestPath, "utf8")) : null;
const cp539PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-539") ?? cp539Manifest?.plan_binding_snapshot;
const cp540ManifestPath = new URL("../../../docs/closeout-packs/cp00-540/manifest.json", import.meta.url);
const cp540Manifest = existsSync(cp540ManifestPath) ? JSON.parse(readFileSync(cp540ManifestPath, "utf8")) : null;
const cp540PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-540") ?? cp540Manifest?.plan_binding_snapshot;
const cp541ManifestPath = new URL("../../../docs/closeout-packs/cp00-541/manifest.json", import.meta.url);
const cp541Manifest = existsSync(cp541ManifestPath) ? JSON.parse(readFileSync(cp541ManifestPath, "utf8")) : null;
const cp541PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-541") ?? cp541Manifest?.plan_binding_snapshot;
const cp542ManifestPath = new URL("../../../docs/closeout-packs/cp00-542/manifest.json", import.meta.url);
const cp542Manifest = existsSync(cp542ManifestPath) ? JSON.parse(readFileSync(cp542ManifestPath, "utf8")) : null;
const cp542PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-542") ?? cp542Manifest?.plan_binding_snapshot;
const cp543ManifestPath = new URL("../../../docs/closeout-packs/cp00-543/manifest.json", import.meta.url);
const cp543Manifest = existsSync(cp543ManifestPath) ? JSON.parse(readFileSync(cp543ManifestPath, "utf8")) : null;
const cp543PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-543") ?? cp543Manifest?.plan_binding_snapshot;
const cp544ManifestPath = new URL("../../../docs/closeout-packs/cp00-544/manifest.json", import.meta.url);
const cp544Manifest = existsSync(cp544ManifestPath) ? JSON.parse(readFileSync(cp544ManifestPath, "utf8")) : null;
const cp544PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-544") ?? cp544Manifest?.plan_binding_snapshot;
const cp545ManifestPath = new URL("../../../docs/closeout-packs/cp00-545/manifest.json", import.meta.url);
const cp545Manifest = existsSync(cp545ManifestPath) ? JSON.parse(readFileSync(cp545ManifestPath, "utf8")) : null;
const cp545PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-545") ?? cp545Manifest?.plan_binding_snapshot;
const cp546ManifestPath = new URL("../../../docs/closeout-packs/cp00-546/manifest.json", import.meta.url);
const cp546Manifest = existsSync(cp546ManifestPath) ? JSON.parse(readFileSync(cp546ManifestPath, "utf8")) : null;
const cp546PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-546") ?? cp546Manifest?.plan_binding_snapshot;
const cp547ManifestPath = new URL("../../../docs/closeout-packs/cp00-547/manifest.json", import.meta.url);
const cp547Manifest = existsSync(cp547ManifestPath) ? JSON.parse(readFileSync(cp547ManifestPath, "utf8")) : null;
const cp547PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-547") ?? cp547Manifest?.plan_binding_snapshot;
const cp548ManifestPath = new URL("../../../docs/closeout-packs/cp00-548/manifest.json", import.meta.url);
const cp548Manifest = existsSync(cp548ManifestPath) ? JSON.parse(readFileSync(cp548ManifestPath, "utf8")) : null;
const cp548PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-548") ?? cp548Manifest?.plan_binding_snapshot;
const cp549ManifestPath = new URL("../../../docs/closeout-packs/cp00-549/manifest.json", import.meta.url);
const cp549Manifest = existsSync(cp549ManifestPath) ? JSON.parse(readFileSync(cp549ManifestPath, "utf8")) : null;
const cp549PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-549") ?? cp549Manifest?.plan_binding_snapshot;
const cp550ManifestPath = new URL("../../../docs/closeout-packs/cp00-550/manifest.json", import.meta.url);
const cp550Manifest = existsSync(cp550ManifestPath) ? JSON.parse(readFileSync(cp550ManifestPath, "utf8")) : null;
const cp550PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-550") ?? cp550Manifest?.plan_binding_snapshot;

test("RP17 program contract pins the AI Governance descriptor-only bootstrap", () => {
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id, "RP17");
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.program_title, "AI Governance");
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP16");
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.hermes_gate, "H17");
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.claude_gate, "C17");
  assert.equal(AI_GOVERNANCE_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-514", "CP00-515", "CP00-516", "CP00-517", "CP00-518", "CP00-519", "CP00-520", "CP00-521", "CP00-522", "CP00-523", "CP00-524", "CP00-525", "CP00-526", "CP00-527", "CP00-528", "CP00-529", "CP00-530", "CP00-531", "CP00-532", "CP00-533", "CP00-534", "CP00-535", "CP00-536", "CP00-537", "CP00-538", "CP00-539", "CP00-540", "CP00-541", "CP00-542", "CP00-543", "CP00-544", "CP00-545", "CP00-546", "CP00-547", "CP00-548", "CP00-549", "CP00-550"].includes(aiGovernanceContract.current_pack.pack_id));
  assert.equal(aiGovernanceContract.program.program_id, "RP17");
});

test("CP00-514 plan binding covers the planned 150 RP17 scope and model foundation units", () => {
  const coverage = validateAiGovernanceCoreCp514Coverage(cp514PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.pack_id, "CP00-514");
  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.range, "RP17.P00.M00.S01-RP17.P01.M02.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.upstream_pack_id, "CP00-513");
  assert.equal(AI_GOVERNANCE_CORE_CP514_PACK_BINDING.next_pack_id, "CP00-515");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP17.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP17.P01"], 28);
  assert.equal(Object.keys(AI_GOVERNANCE_CORE_CP514_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-514 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp514ScopeContractFoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp514ScopeContractFoundationDescriptor();
  const validation = validateAiGovernanceCoreCp514ScopeContractFoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP514_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP17.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.ai_governance_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m00 = caseSet.sections["RP17.P01.M00"].rows;
  assert.equal(p01m00.state_transition_map.writes_state_transition, false);
  assert.equal(p01m00.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-514 evidence packets and handoff preserve AI governance bootstrap authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp514ScopeContractFoundationDescriptor();
  const hermes = createAiGovernanceCoreCp514HermesEvidencePacket(cp514PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp514ClaudeReviewPacket(cp514PlanPack);
  const handoff = createAiGovernanceCoreCp514CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-514-to-CP00-515");
  assert.equal(handoff.next_subphase_id, "RP17.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_scope_contract_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP514_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-515 plan binding covers the planned 40 RP17 p01 implementation slice units", () => {
  const coverage = validateAiGovernanceCoreCp515Coverage(cp515PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.pack_id, "CP00-515");
  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.range, "RP17.P01.M02.S09-RP17.P01.M04.S06");
  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.upstream_pack_id, "CP00-514");
  assert.equal(AI_GOVERNANCE_CORE_CP515_PACK_BINDING.next_pack_id, "CP00-516");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M02"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M04"], 6);
});

test("CP00-515 p01 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp515P01ImplementationSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp515P01ImplementationSliceDescriptor();
  const validation = validateAiGovernanceCoreCp515P01ImplementationSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP515_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP17.P01.M03"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-515 evidence packets and handoff preserve p01 implementation slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp515P01ImplementationSliceDescriptor();
  const hermes = createAiGovernanceCoreCp515HermesEvidencePacket(cp515PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp515ClaudeReviewPacket(cp515PlanPack);
  const handoff = createAiGovernanceCoreCp515CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-515-to-CP00-516");
  assert.equal(handoff.next_subphase_id, "RP17.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p01_implementation_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP515_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-516 plan binding covers the planned 40 RP17 p01 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp516Coverage(cp516PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.pack_id, "CP00-516");
  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.range, "RP17.P01.M04.S07-RP17.P01.M06.S04");
  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.upstream_pack_id, "CP00-515");
  assert.equal(AI_GOVERNANCE_CORE_CP516_PACK_BINDING.next_pack_id, "CP00-517");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M04"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M06"], 4);
});

test("CP00-516 p01 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp516P01WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP516_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP17.P01.M05"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-516 evidence packets and handoff preserve p01 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp516P01WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp516HermesEvidencePacket(cp516PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp516ClaudeReviewPacket(cp516PlanPack);
  const handoff = createAiGovernanceCoreCp516CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-516-to-CP00-517");
  assert.equal(handoff.next_subphase_id, "RP17.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p01_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP516_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-517 plan binding covers the planned 150 RP17 p01 closeout p02 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp517Coverage(cp517PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.pack_id, "CP00-517");
  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.range, "RP17.P01.M06.S05-RP17.P02.M02.S22");
  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.upstream_pack_id, "CP00-516");
  assert.equal(AI_GOVERNANCE_CORE_CP517_PACK_BINDING.next_pack_id, "CP00-518");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P01.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M02"], 22);
});

test("CP00-517 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp517P01CloseoutP02FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP517_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP17.P01.M07"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-517 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp517P01CloseoutP02FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp517HermesEvidencePacket(cp517PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp517ClaudeReviewPacket(cp517PlanPack);
  const handoff = createAiGovernanceCoreCp517CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-517-to-CP00-518");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP517_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-518 plan binding covers the planned 40 RP17 p02 implementation slice units", () => {
  const coverage = validateAiGovernanceCoreCp518Coverage(cp518PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.pack_id, "CP00-518");
  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.range, "RP17.P02.M03.S01-RP17.P02.M04.S15");
  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.upstream_pack_id, "CP00-517");
  assert.equal(AI_GOVERNANCE_CORE_CP518_PACK_BINDING.next_pack_id, "CP00-519");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M03"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M04"], 15);
});

test("CP00-518 p02 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp518P02ImplementationSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp518P02ImplementationSliceDescriptor();
  const validation = validateAiGovernanceCoreCp518P02ImplementationSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP518_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-518 evidence packets and handoff preserve p02 implementation slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp518P02ImplementationSliceDescriptor();
  const hermes = createAiGovernanceCoreCp518HermesEvidencePacket(cp518PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp518ClaudeReviewPacket(cp518PlanPack);
  const handoff = createAiGovernanceCoreCp518CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-518-to-CP00-519");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M04.S16");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_implementation_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP518_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-519 plan binding covers the planned 10 RP17 p02 workflow slice units", () => {
  const coverage = validateAiGovernanceCoreCp519Coverage(cp519PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.pack_id, "CP00-519");
  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.range, "RP17.P02.M04.S16-RP17.P02.M04.S25");
  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.upstream_pack_id, "CP00-518");
  assert.equal(AI_GOVERNANCE_CORE_CP519_PACK_BINDING.next_pack_id, "CP00-520");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M04"], 10);
});

test("CP00-519 p02 workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp519P02WorkflowSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp519P02WorkflowSliceDescriptor();
  const validation = validateAiGovernanceCoreCp519P02WorkflowSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP519_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-519 evidence packets and handoff preserve p02 workflow slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp519P02WorkflowSliceDescriptor();
  const hermes = createAiGovernanceCoreCp519HermesEvidencePacket(cp519PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp519ClaudeReviewPacket(cp519PlanPack);
  const handoff = createAiGovernanceCoreCp519CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-519-to-CP00-520");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M05.S01");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_workflow_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP519_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-520 plan binding covers the planned 10 RP17 p02 permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp520Coverage(cp520PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.pack_id, "CP00-520");
  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.range, "RP17.P02.M05.S01-RP17.P02.M05.S10");
  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.upstream_pack_id, "CP00-519");
  assert.equal(AI_GOVERNANCE_CORE_CP520_PACK_BINDING.next_pack_id, "CP00-521");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M05"], 10);
});

test("CP00-520 p02 permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp520P02PermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp520P02PermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp520P02PermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP520_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-520 evidence packets and handoff preserve p02 permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp520P02PermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp520HermesEvidencePacket(cp520PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp520ClaudeReviewPacket(cp520PlanPack);
  const handoff = createAiGovernanceCoreCp520CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-520-to-CP00-521");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M05.S11");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP520_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-521 plan binding covers the planned 10 RP17 p02 audit binding slice units", () => {
  const coverage = validateAiGovernanceCoreCp521Coverage(cp521PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.pack_id, "CP00-521");
  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.range, "RP17.P02.M05.S11-RP17.P02.M05.S20");
  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.upstream_pack_id, "CP00-520");
  assert.equal(AI_GOVERNANCE_CORE_CP521_PACK_BINDING.next_pack_id, "CP00-522");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M05"], 10);
});

test("CP00-521 p02 audit binding slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp521P02AuditBindingSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp521P02AuditBindingSliceDescriptor();
  const validation = validateAiGovernanceCoreCp521P02AuditBindingSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP521_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-521 evidence packets and handoff preserve p02 audit binding slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp521P02AuditBindingSliceDescriptor();
  const hermes = createAiGovernanceCoreCp521HermesEvidencePacket(cp521PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp521ClaudeReviewPacket(cp521PlanPack);
  const handoff = createAiGovernanceCoreCp521CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-521-to-CP00-522");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M05.S21");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_audit_binding_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP521_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-522 plan binding covers the planned 10 RP17 p02 permission fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp522Coverage(cp522PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.pack_id, "CP00-522");
  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.range, "RP17.P02.M05.S21-RP17.P02.M06.S05");
  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.upstream_pack_id, "CP00-521");
  assert.equal(AI_GOVERNANCE_CORE_CP522_PACK_BINDING.next_pack_id, "CP00-523");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M06"], 5);
});

test("CP00-522 p02 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp522P02PermissionFixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP522_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-522 evidence packets and handoff preserve p02 permission fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp522P02PermissionFixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp522HermesEvidencePacket(cp522PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp522ClaudeReviewPacket(cp522PlanPack);
  const handoff = createAiGovernanceCoreCp522CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-522-to-CP00-523");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M06.S06");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP522_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-523 plan binding covers the planned 10 RP17 p02 fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp523Coverage(cp523PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.pack_id, "CP00-523");
  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.range, "RP17.P02.M06.S06-RP17.P02.M06.S15");
  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.upstream_pack_id, "CP00-522");
  assert.equal(AI_GOVERNANCE_CORE_CP523_PACK_BINDING.next_pack_id, "CP00-524");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M06"], 10);
});

test("CP00-523 p02 fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp523P02FixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp523P02FixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp523P02FixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP523_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-523 evidence packets and handoff preserve p02 fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp523P02FixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp523HermesEvidencePacket(cp523PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp523ClaudeReviewPacket(cp523PlanPack);
  const handoff = createAiGovernanceCoreCp523CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-523-to-CP00-524");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M06.S16");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP523_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-524 plan binding covers the planned 10 RP17 p02 fixture test slice units", () => {
  const coverage = validateAiGovernanceCoreCp524Coverage(cp524PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.pack_id, "CP00-524");
  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.range, "RP17.P02.M06.S16-RP17.P02.M07.S03");
  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.upstream_pack_id, "CP00-523");
  assert.equal(AI_GOVERNANCE_CORE_CP524_PACK_BINDING.next_pack_id, "CP00-525");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M06"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M07"], 3);
});

test("CP00-524 p02 fixture test slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp524P02FixtureTestSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp524P02FixtureTestSliceDescriptor();
  const validation = validateAiGovernanceCoreCp524P02FixtureTestSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP524_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-524 evidence packets and handoff preserve p02 fixture test slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp524P02FixtureTestSliceDescriptor();
  const hermes = createAiGovernanceCoreCp524HermesEvidencePacket(cp524PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp524ClaudeReviewPacket(cp524PlanPack);
  const handoff = createAiGovernanceCoreCp524CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-524-to-CP00-525");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M07.S04");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_fixture_test_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP524_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-525 plan binding covers the planned 40 RP17 p02 test hermes slice units", () => {
  const coverage = validateAiGovernanceCoreCp525Coverage(cp525PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.pack_id, "CP00-525");
  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.range, "RP17.P02.M07.S04-RP17.P02.M08.S18");
  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.upstream_pack_id, "CP00-524");
  assert.equal(AI_GOVERNANCE_CORE_CP525_PACK_BINDING.next_pack_id, "CP00-526");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M08"], 18);
});

test("CP00-525 p02 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp525P02TestHermesSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp525P02TestHermesSliceDescriptor();
  const validation = validateAiGovernanceCoreCp525P02TestHermesSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP525_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-525 evidence packets and handoff preserve p02 test hermes slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp525P02TestHermesSliceDescriptor();
  const hermes = createAiGovernanceCoreCp525HermesEvidencePacket(cp525PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp525ClaudeReviewPacket(cp525PlanPack);
  const handoff = createAiGovernanceCoreCp525CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-525-to-CP00-526");
  assert.equal(handoff.next_subphase_id, "RP17.P02.M08.S19");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_test_hermes_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP525_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-526 plan binding covers the planned 150 RP17 p02 closeout p03 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp526Coverage(cp526PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.pack_id, "CP00-526");
  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.range, "RP17.P02.M08.S19-RP17.P03.M05.S22");
  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.upstream_pack_id, "CP00-525");
  assert.equal(AI_GOVERNANCE_CORE_CP526_PACK_BINDING.next_pack_id, "CP00-527");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M08"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P02.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M05"], 22);
});

test("CP00-526 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp526P02CloseoutP03FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP526_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-526 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp526P02CloseoutP03FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp526HermesEvidencePacket(cp526PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp526ClaudeReviewPacket(cp526PlanPack);
  const handoff = createAiGovernanceCoreCp526CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-526-to-CP00-527");
  assert.equal(handoff.next_subphase_id, "RP17.P03.M06.S01");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP526_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-527 plan binding covers the planned 150 RP17 p03 closeout p04 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp527Coverage(cp527PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.pack_id, "CP00-527");
  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.range, "RP17.P03.M06.S01-RP17.P04.M03.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.upstream_pack_id, "CP00-526");
  assert.equal(AI_GOVERNANCE_CORE_CP527_PACK_BINDING.next_pack_id, "CP00-528");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P03.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M03"], 8);
});

test("CP00-527 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp527P03CloseoutP04FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP527_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-527 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp527P03CloseoutP04FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp527HermesEvidencePacket(cp527PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp527ClaudeReviewPacket(cp527PlanPack);
  const handoff = createAiGovernanceCoreCp527CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-527-to-CP00-528");
  assert.equal(handoff.next_subphase_id, "RP17.P04.M03.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP527_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-528 plan binding covers the planned 10 RP17 p04 implementation slice units", () => {
  const coverage = validateAiGovernanceCoreCp528Coverage(cp528PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.pack_id, "CP00-528");
  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.range, "RP17.P04.M03.S09-RP17.P04.M03.S18");
  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.upstream_pack_id, "CP00-527");
  assert.equal(AI_GOVERNANCE_CORE_CP528_PACK_BINDING.next_pack_id, "CP00-529");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M03"], 10);
});

test("CP00-528 p04 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp528P04ImplementationSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp528P04ImplementationSliceDescriptor();
  const validation = validateAiGovernanceCoreCp528P04ImplementationSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP528_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-528 evidence packets and handoff preserve p04 implementation slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp528P04ImplementationSliceDescriptor();
  const hermes = createAiGovernanceCoreCp528HermesEvidencePacket(cp528PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp528ClaudeReviewPacket(cp528PlanPack);
  const handoff = createAiGovernanceCoreCp528CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-528-to-CP00-529");
  assert.equal(handoff.next_subphase_id, "RP17.P04.M03.S19");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p04_implementation_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP528_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-529 plan binding covers the planned 40 RP17 p04 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp529Coverage(cp529PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.pack_id, "CP00-529");
  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.range, "RP17.P04.M03.S19-RP17.P04.M05.S14");
  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.upstream_pack_id, "CP00-528");
  assert.equal(AI_GOVERNANCE_CORE_CP529_PACK_BINDING.next_pack_id, "CP00-530");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M03"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M05"], 14);
});

test("CP00-529 p04 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp529P04WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP529_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-529 evidence packets and handoff preserve p04 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp529P04WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp529HermesEvidencePacket(cp529PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp529ClaudeReviewPacket(cp529PlanPack);
  const handoff = createAiGovernanceCoreCp529CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-529-to-CP00-530");
  assert.equal(handoff.next_subphase_id, "RP17.P04.M05.S15");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p04_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP529_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-530 plan binding covers the planned 10 RP17 p04 permission fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp530Coverage(cp530PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.pack_id, "CP00-530");
  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.range, "RP17.P04.M05.S15-RP17.P04.M06.S02");
  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.upstream_pack_id, "CP00-529");
  assert.equal(AI_GOVERNANCE_CORE_CP530_PACK_BINDING.next_pack_id, "CP00-531");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M06"], 2);
});

test("CP00-530 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp530P04PermissionFixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP530_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-530 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp530P04PermissionFixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp530HermesEvidencePacket(cp530PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp530ClaudeReviewPacket(cp530PlanPack);
  const handoff = createAiGovernanceCoreCp530CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-530-to-CP00-531");
  assert.equal(handoff.next_subphase_id, "RP17.P04.M06.S03");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP530_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-531 plan binding covers the planned 150 RP17 p04 closeout p05 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp531Coverage(cp531PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.pack_id, "CP00-531");
  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.range, "RP17.P04.M06.S03-RP17.P05.M02.S14");
  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.upstream_pack_id, "CP00-530");
  assert.equal(AI_GOVERNANCE_CORE_CP531_PACK_BINDING.next_pack_id, "CP00-532");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P04.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M02"], 14);
});

test("CP00-531 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp531P04CloseoutP05FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP531_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-531 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp531P04CloseoutP05FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp531HermesEvidencePacket(cp531PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp531ClaudeReviewPacket(cp531PlanPack);
  const handoff = createAiGovernanceCoreCp531CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-531-to-CP00-532");
  assert.equal(handoff.next_subphase_id, "RP17.P05.M02.S15");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP531_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-532 plan binding covers the planned 40 RP17 p05 implementation workflow slice units", () => {
  const coverage = validateAiGovernanceCoreCp532Coverage(cp532PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.pack_id, "CP00-532");
  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.range, "RP17.P05.M02.S15-RP17.P05.M04.S12");
  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.upstream_pack_id, "CP00-531");
  assert.equal(AI_GOVERNANCE_CORE_CP532_PACK_BINDING.next_pack_id, "CP00-533");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M04"], 12);
});

test("CP00-532 p05 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp532P05ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor();
  const validation = validateAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP532_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-532 evidence packets and handoff preserve p05 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp532P05ImplementationWorkflowSliceDescriptor();
  const hermes = createAiGovernanceCoreCp532HermesEvidencePacket(cp532PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp532ClaudeReviewPacket(cp532PlanPack);
  const handoff = createAiGovernanceCoreCp532CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-532-to-CP00-533");
  assert.equal(handoff.next_subphase_id, "RP17.P05.M04.S13");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p05_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP532_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-533 plan binding covers the planned 40 RP17 p05 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp533Coverage(cp533PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.pack_id, "CP00-533");
  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.range, "RP17.P05.M04.S13-RP17.P05.M06.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.upstream_pack_id, "CP00-532");
  assert.equal(AI_GOVERNANCE_CORE_CP533_PACK_BINDING.next_pack_id, "CP00-534");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M06"], 8);
});

test("CP00-533 p05 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp533P05WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP533_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-533 evidence packets and handoff preserve p05 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp533P05WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp533HermesEvidencePacket(cp533PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp533ClaudeReviewPacket(cp533PlanPack);
  const handoff = createAiGovernanceCoreCp533CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-533-to-CP00-534");
  assert.equal(handoff.next_subphase_id, "RP17.P05.M06.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p05_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP533_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-534 plan binding covers the planned 10 RP17 p05 fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp534Coverage(cp534PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.pack_id, "CP00-534");
  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.range, "RP17.P05.M06.S09-RP17.P05.M06.S18");
  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.upstream_pack_id, "CP00-533");
  assert.equal(AI_GOVERNANCE_CORE_CP534_PACK_BINDING.next_pack_id, "CP00-535");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M06"], 10);
});

test("CP00-534 p05 fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp534P05FixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp534P05FixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp534P05FixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP534_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-534 evidence packets and handoff preserve p05 fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp534P05FixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp534HermesEvidencePacket(cp534PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp534ClaudeReviewPacket(cp534PlanPack);
  const handoff = createAiGovernanceCoreCp534CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-534-to-CP00-535");
  assert.equal(handoff.next_subphase_id, "RP17.P05.M06.S19");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p05_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP534_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-535 plan binding covers the planned 150 RP17 p05 closeout p06 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp535Coverage(cp535PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.pack_id, "CP00-535");
  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.range, "RP17.P05.M06.S19-RP17.P06.M02.S20");
  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.upstream_pack_id, "CP00-534");
  assert.equal(AI_GOVERNANCE_CORE_CP535_PACK_BINDING.next_pack_id, "CP00-536");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M06"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P05.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M02"], 20);
});

test("CP00-535 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp535P05CloseoutP06FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP535_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-535 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp535P05CloseoutP06FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp535HermesEvidencePacket(cp535PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp535ClaudeReviewPacket(cp535PlanPack);
  const handoff = createAiGovernanceCoreCp535CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-535-to-CP00-536");
  assert.equal(handoff.next_subphase_id, "RP17.P06.M02.S21");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP535_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-536 plan binding covers the planned 10 RP17 p06 foundation slice units", () => {
  const coverage = validateAiGovernanceCoreCp536Coverage(cp536PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.pack_id, "CP00-536");
  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.range, "RP17.P06.M02.S21-RP17.P06.M03.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.upstream_pack_id, "CP00-535");
  assert.equal(AI_GOVERNANCE_CORE_CP536_PACK_BINDING.next_pack_id, "CP00-537");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M02"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M03"], 8);
});

test("CP00-536 p06 foundation slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp536P06FoundationSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp536P06FoundationSliceDescriptor();
  const validation = validateAiGovernanceCoreCp536P06FoundationSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP536_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-536 evidence packets and handoff preserve p06 foundation slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp536P06FoundationSliceDescriptor();
  const hermes = createAiGovernanceCoreCp536HermesEvidencePacket(cp536PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp536ClaudeReviewPacket(cp536PlanPack);
  const handoff = createAiGovernanceCoreCp536CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-536-to-CP00-537");
  assert.equal(handoff.next_subphase_id, "RP17.P06.M03.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p06_foundation_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP536_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-537 plan binding covers the planned 40 RP17 p06 implementation workflow slice units", () => {
  const coverage = validateAiGovernanceCoreCp537Coverage(cp537PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.pack_id, "CP00-537");
  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.range, "RP17.P06.M03.S09-RP17.P06.M04.S23");
  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.upstream_pack_id, "CP00-536");
  assert.equal(AI_GOVERNANCE_CORE_CP537_PACK_BINDING.next_pack_id, "CP00-538");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M03"], 17);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M04"], 23);
});

test("CP00-537 p06 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp537P06ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor();
  const validation = validateAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP537_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-537 evidence packets and handoff preserve p06 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp537P06ImplementationWorkflowSliceDescriptor();
  const hermes = createAiGovernanceCoreCp537HermesEvidencePacket(cp537PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp537ClaudeReviewPacket(cp537PlanPack);
  const handoff = createAiGovernanceCoreCp537CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-537-to-CP00-538");
  assert.equal(handoff.next_subphase_id, "RP17.P06.M04.S24");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p06_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP537_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-538 plan binding covers the planned 40 RP17 p06 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp538Coverage(cp538PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.pack_id, "CP00-538");
  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.range, "RP17.P06.M04.S24-RP17.P06.M06.S13");
  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.upstream_pack_id, "CP00-537");
  assert.equal(AI_GOVERNANCE_CORE_CP538_PACK_BINDING.next_pack_id, "CP00-539");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M04"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M05"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M06"], 13);
});

test("CP00-538 p06 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp538P06WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP538_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-538 evidence packets and handoff preserve p06 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp538P06WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp538HermesEvidencePacket(cp538PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp538ClaudeReviewPacket(cp538PlanPack);
  const handoff = createAiGovernanceCoreCp538CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-538-to-CP00-539");
  assert.equal(handoff.next_subphase_id, "RP17.P06.M06.S14");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p06_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP538_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-539 plan binding covers the planned 150 RP17 p06 closeout p07 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp539Coverage(cp539PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.pack_id, "CP00-539");
  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.range, "RP17.P06.M06.S14-RP17.P07.M02.S12");
  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.upstream_pack_id, "CP00-538");
  assert.equal(AI_GOVERNANCE_CORE_CP539_PACK_BINDING.next_pack_id, "CP00-540");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M06"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M07"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P06.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M02"], 12);
});

test("CP00-539 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp539P06CloseoutP07FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP539_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-539 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp539P06CloseoutP07FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp539HermesEvidencePacket(cp539PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp539ClaudeReviewPacket(cp539PlanPack);
  const handoff = createAiGovernanceCoreCp539CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-539-to-CP00-540");
  assert.equal(handoff.next_subphase_id, "RP17.P07.M02.S13");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP539_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-540 plan binding covers the planned 40 RP17 p07 implementation slice units", () => {
  const coverage = validateAiGovernanceCoreCp540Coverage(cp540PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.pack_id, "CP00-540");
  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.range, "RP17.P07.M02.S13-RP17.P07.M04.S05");
  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.upstream_pack_id, "CP00-539");
  assert.equal(AI_GOVERNANCE_CORE_CP540_PACK_BINDING.next_pack_id, "CP00-541");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M03"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M04"], 5);
});

test("CP00-540 p07 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp540P07ImplementationSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp540P07ImplementationSliceDescriptor();
  const validation = validateAiGovernanceCoreCp540P07ImplementationSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP540_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-540 evidence packets and handoff preserve p07 implementation slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp540P07ImplementationSliceDescriptor();
  const hermes = createAiGovernanceCoreCp540HermesEvidencePacket(cp540PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp540ClaudeReviewPacket(cp540PlanPack);
  const handoff = createAiGovernanceCoreCp540CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-540-to-CP00-541");
  assert.equal(handoff.next_subphase_id, "RP17.P07.M04.S06");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p07_implementation_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP540_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-541 plan binding covers the planned 40 RP17 p07 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp541Coverage(cp541PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.pack_id, "CP00-541");
  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.range, "RP17.P07.M04.S06-RP17.P07.M05.S20");
  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.upstream_pack_id, "CP00-540");
  assert.equal(AI_GOVERNANCE_CORE_CP541_PACK_BINDING.next_pack_id, "CP00-542");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M05"], 20);
});

test("CP00-541 p07 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp541P07WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP541_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-541 evidence packets and handoff preserve p07 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp541P07WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp541HermesEvidencePacket(cp541PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp541ClaudeReviewPacket(cp541PlanPack);
  const handoff = createAiGovernanceCoreCp541CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-541-to-CP00-542");
  assert.equal(handoff.next_subphase_id, "RP17.P07.M05.S21");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p07_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP541_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-542 plan binding covers the planned 10 RP17 p07 permission fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp542Coverage(cp542PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.pack_id, "CP00-542");
  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.range, "RP17.P07.M05.S21-RP17.P07.M06.S05");
  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.upstream_pack_id, "CP00-541");
  assert.equal(AI_GOVERNANCE_CORE_CP542_PACK_BINDING.next_pack_id, "CP00-543");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M06"], 5);
});

test("CP00-542 p07 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp542P07PermissionFixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP542_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-542 evidence packets and handoff preserve p07 permission fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp542P07PermissionFixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp542HermesEvidencePacket(cp542PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp542ClaudeReviewPacket(cp542PlanPack);
  const handoff = createAiGovernanceCoreCp542CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-542-to-CP00-543");
  assert.equal(handoff.next_subphase_id, "RP17.P07.M06.S06");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p07_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP542_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-543 plan binding covers the planned 150 RP17 p07 closeout p08 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp543Coverage(cp543PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.pack_id, "CP00-543");
  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.range, "RP17.P07.M06.S06-RP17.P08.M02.S14");
  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.upstream_pack_id, "CP00-542");
  assert.equal(AI_GOVERNANCE_CORE_CP543_PACK_BINDING.next_pack_id, "CP00-544");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M06"], 17);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M07"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P07.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M02"], 14);
});

test("CP00-543 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp543P07CloseoutP08FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP543_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-543 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp543P07CloseoutP08FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp543HermesEvidencePacket(cp543PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp543ClaudeReviewPacket(cp543PlanPack);
  const handoff = createAiGovernanceCoreCp543CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-543-to-CP00-544");
  assert.equal(handoff.next_subphase_id, "RP17.P08.M02.S15");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP543_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-544 plan binding covers the planned 40 RP17 p08 implementation workflow slice units", () => {
  const coverage = validateAiGovernanceCoreCp544Coverage(cp544PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.pack_id, "CP00-544");
  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.range, "RP17.P08.M02.S15-RP17.P08.M04.S12");
  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.upstream_pack_id, "CP00-543");
  assert.equal(AI_GOVERNANCE_CORE_CP544_PACK_BINDING.next_pack_id, "CP00-545");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M04"], 12);
});

test("CP00-544 p08 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp544P08ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor();
  const validation = validateAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP544_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-544 evidence packets and handoff preserve p08 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp544P08ImplementationWorkflowSliceDescriptor();
  const hermes = createAiGovernanceCoreCp544HermesEvidencePacket(cp544PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp544ClaudeReviewPacket(cp544PlanPack);
  const handoff = createAiGovernanceCoreCp544CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-544-to-CP00-545");
  assert.equal(handoff.next_subphase_id, "RP17.P08.M04.S13");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p08_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP544_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-545 plan binding covers the planned 40 RP17 p08 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp545Coverage(cp545PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.pack_id, "CP00-545");
  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.range, "RP17.P08.M04.S13-RP17.P08.M06.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.upstream_pack_id, "CP00-544");
  assert.equal(AI_GOVERNANCE_CORE_CP545_PACK_BINDING.next_pack_id, "CP00-546");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M06"], 8);
});

test("CP00-545 p08 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp545P08WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP545_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-545 evidence packets and handoff preserve p08 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp545P08WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp545HermesEvidencePacket(cp545PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp545ClaudeReviewPacket(cp545PlanPack);
  const handoff = createAiGovernanceCoreCp545CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-545-to-CP00-546");
  assert.equal(handoff.next_subphase_id, "RP17.P08.M06.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p08_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP545_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-546 plan binding covers the planned 150 RP17 p08 closeout p09 foundation units", () => {
  const coverage = validateAiGovernanceCoreCp546Coverage(cp546PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.pack_id, "CP00-546");
  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.unit_count, 150);
  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.range, "RP17.P08.M06.S09-RP17.P09.M03.S10");
  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.upstream_pack_id, "CP00-545");
  assert.equal(AI_GOVERNANCE_CORE_CP546_PACK_BINDING.next_pack_id, "CP00-547");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P08.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M03"], 10);
});

test("CP00-546 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp546P08CloseoutP09FoundationCaseSet();
  const descriptor = createAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor();
  const validation = validateAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP546_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-546 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp546P08CloseoutP09FoundationDescriptor();
  const hermes = createAiGovernanceCoreCp546HermesEvidencePacket(cp546PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp546ClaudeReviewPacket(cp546PlanPack);
  const handoff = createAiGovernanceCoreCp546CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-546-to-CP00-547");
  assert.equal(handoff.next_subphase_id, "RP17.P09.M03.S11");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP546_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-547 plan binding covers the planned 40 RP17 p09 workflow permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp547Coverage(cp547PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.pack_id, "CP00-547");
  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.risk_class, "B");
  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.unit_count, 40);
  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.range, "RP17.P09.M03.S11-RP17.P09.M05.S08");
  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.upstream_pack_id, "CP00-546");
  assert.equal(AI_GOVERNANCE_CORE_CP547_PACK_BINDING.next_pack_id, "CP00-548");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M03"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M05"], 8);
});

test("CP00-547 p09 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp547P09WorkflowPermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP547_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-547 evidence packets and handoff preserve p09 workflow permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp547P09WorkflowPermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp547HermesEvidencePacket(cp547PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp547ClaudeReviewPacket(cp547PlanPack);
  const handoff = createAiGovernanceCoreCp547CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-547-to-CP00-548");
  assert.equal(handoff.next_subphase_id, "RP17.P09.M05.S09");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p09_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP547_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-548 plan binding covers the planned 10 RP17 p09 permission slice units", () => {
  const coverage = validateAiGovernanceCoreCp548Coverage(cp548PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.pack_id, "CP00-548");
  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.range, "RP17.P09.M05.S09-RP17.P09.M05.S18");
  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.upstream_pack_id, "CP00-547");
  assert.equal(AI_GOVERNANCE_CORE_CP548_PACK_BINDING.next_pack_id, "CP00-549");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M05"], 10);
});

test("CP00-548 p09 permission slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp548P09PermissionSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp548P09PermissionSliceDescriptor();
  const validation = validateAiGovernanceCoreCp548P09PermissionSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP548_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-548 evidence packets and handoff preserve p09 permission slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp548P09PermissionSliceDescriptor();
  const hermes = createAiGovernanceCoreCp548HermesEvidencePacket(cp548PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp548ClaudeReviewPacket(cp548PlanPack);
  const handoff = createAiGovernanceCoreCp548CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-548-to-CP00-549");
  assert.equal(handoff.next_subphase_id, "RP17.P09.M05.S19");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p09_permission_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP548_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-549 plan binding covers the planned 10 RP17 p09 permission fixture slice units", () => {
  const coverage = validateAiGovernanceCoreCp549Coverage(cp549PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.pack_id, "CP00-549");
  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.risk_class, "A");
  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.unit_count, 10);
  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.range, "RP17.P09.M05.S19-RP17.P09.M06.S06");
  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.upstream_pack_id, "CP00-548");
  assert.equal(AI_GOVERNANCE_CORE_CP549_PACK_BINDING.next_pack_id, "CP00-550");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M06"], 6);
});

test("CP00-549 p09 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp549P09PermissionFixtureSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor();
  const validation = validateAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP549_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-549 evidence packets and handoff preserve p09 permission fixture slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp549P09PermissionFixtureSliceDescriptor();
  const hermes = createAiGovernanceCoreCp549HermesEvidencePacket(cp549PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp549ClaudeReviewPacket(cp549PlanPack);
  const handoff = createAiGovernanceCoreCp549CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-549-to-CP00-550");
  assert.equal(handoff.next_subphase_id, "RP17.P09.M06.S07");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p09_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP549_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-550 plan binding covers the planned 86 RP17 p09 closeout handoff slice units", () => {
  const coverage = validateAiGovernanceCoreCp550Coverage(cp550PlanPack);

  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.pack_id, "CP00-550");
  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.risk_class, "C");
  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.unit_count, 86);
  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.range, "RP17.P09.M06.S07-RP17.P09.M10.S10");
  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.upstream_pack_id, "CP00-549");
  assert.equal(AI_GOVERNANCE_CORE_CP550_PACK_BINDING.next_pack_id, "CP00-551");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 86);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP17.P09.M10"], 10);
});

test("CP00-550 p09 closeout handoff slice rows stay descriptor-only", () => {
  const caseSet = createAiGovernanceCoreCp550P09CloseoutHandoffSliceCaseSet();
  const descriptor = createAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor();
  const validation = validateAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor(descriptor, aiGovernanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(AI_GOVERNANCE_CORE_CP550_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiGovernanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-550 evidence packets and handoff preserve p09 closeout handoff slice authority boundaries", () => {
  const descriptor = createAiGovernanceCoreCp550P09CloseoutHandoffSliceDescriptor();
  const hermes = createAiGovernanceCoreCp550HermesEvidencePacket(cp550PlanPack, aiGovernanceContract, descriptor);
  const claude = createAiGovernanceCoreCp550ClaudeReviewPacket(cp550PlanPack);
  const handoff = createAiGovernanceCoreCp550CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H17");
  assert.equal(claude.gate, "C17");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-550-to-CP00-551");
  assert.equal(handoff.next_subphase_id, "RP18.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "ai_governance_core_p09_closeout_handoff_slice_descriptor_verified");
  assert.equal(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_GOVERNANCE_CORE_CP550_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
