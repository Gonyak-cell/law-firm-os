import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP551_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP552_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP553_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP554_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP555_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP556_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP557_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP558_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP559_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP560_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP561_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP562_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP563_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP564_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP565_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP566_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP567_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP568_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP569_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP570_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP571_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP572_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP573_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP574_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP575_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP576_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP577_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP578_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP579_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP580_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP581_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION,
  AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING,
  AI_LEGAL_WORKFLOWS_CORE_CP582_REQUIREMENTS,
  AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT,
  createAiLegalWorkflowsCoreCp551ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp551CloseoutHandoff,
  createAiLegalWorkflowsCoreCp551HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp551ScopeContractFoundationCaseSet,
  createAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor,
  createAiLegalWorkflowsCoreCp552ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp552CloseoutHandoff,
  createAiLegalWorkflowsCoreCp552HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp552P01ImplementationSliceCaseSet,
  createAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor,
  createAiLegalWorkflowsCoreCp553ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp553CloseoutHandoff,
  createAiLegalWorkflowsCoreCp553HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp554ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp554CloseoutHandoff,
  createAiLegalWorkflowsCoreCp554HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationCaseSet,
  createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor,
  createAiLegalWorkflowsCoreCp555ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp555CloseoutHandoff,
  createAiLegalWorkflowsCoreCp555HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp555P02ImplementationSliceCaseSet,
  createAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor,
  createAiLegalWorkflowsCoreCp556ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp556CloseoutHandoff,
  createAiLegalWorkflowsCoreCp556HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp556P02WorkflowSliceCaseSet,
  createAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor,
  createAiLegalWorkflowsCoreCp557ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp557CloseoutHandoff,
  createAiLegalWorkflowsCoreCp557HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp558ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp558CloseoutHandoff,
  createAiLegalWorkflowsCoreCp558HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationCaseSet,
  createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor,
  createAiLegalWorkflowsCoreCp559ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp559CloseoutHandoff,
  createAiLegalWorkflowsCoreCp559HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceCaseSet,
  createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor,
  createAiLegalWorkflowsCoreCp560ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp560CloseoutHandoff,
  createAiLegalWorkflowsCoreCp560HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp561ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp561CloseoutHandoff,
  createAiLegalWorkflowsCoreCp561HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationCaseSet,
  createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor,
  createAiLegalWorkflowsCoreCp562ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp562CloseoutHandoff,
  createAiLegalWorkflowsCoreCp562HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp563ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp563CloseoutHandoff,
  createAiLegalWorkflowsCoreCp563HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceCaseSet,
  createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor,
  createAiLegalWorkflowsCoreCp564ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp564CloseoutHandoff,
  createAiLegalWorkflowsCoreCp564HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationCaseSet,
  createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor,
  createAiLegalWorkflowsCoreCp565ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp565CloseoutHandoff,
  createAiLegalWorkflowsCoreCp565HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceCaseSet,
  createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor,
  createAiLegalWorkflowsCoreCp566ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp566CloseoutHandoff,
  createAiLegalWorkflowsCoreCp566HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp567ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp567CloseoutHandoff,
  createAiLegalWorkflowsCoreCp567HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp567P05FixtureSliceCaseSet,
  createAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor,
  createAiLegalWorkflowsCoreCp568ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp568CloseoutHandoff,
  createAiLegalWorkflowsCoreCp568HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationCaseSet,
  createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor,
  createAiLegalWorkflowsCoreCp569ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp569CloseoutHandoff,
  createAiLegalWorkflowsCoreCp569HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp569P06FoundationSliceCaseSet,
  createAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor,
  createAiLegalWorkflowsCoreCp570ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp570CloseoutHandoff,
  createAiLegalWorkflowsCoreCp570HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp570P06ImplementationSliceCaseSet,
  createAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor,
  createAiLegalWorkflowsCoreCp571ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp571CloseoutHandoff,
  createAiLegalWorkflowsCoreCp571HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp572ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp572CloseoutHandoff,
  createAiLegalWorkflowsCoreCp572HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceCaseSet,
  createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor,
  createAiLegalWorkflowsCoreCp573ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp573CloseoutHandoff,
  createAiLegalWorkflowsCoreCp573HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationCaseSet,
  createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor,
  createAiLegalWorkflowsCoreCp574ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp574CloseoutHandoff,
  createAiLegalWorkflowsCoreCp574HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceCaseSet,
  createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor,
  createAiLegalWorkflowsCoreCp575ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp575CloseoutHandoff,
  createAiLegalWorkflowsCoreCp575HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceCaseSet,
  createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor,
  createAiLegalWorkflowsCoreCp576ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp576CloseoutHandoff,
  createAiLegalWorkflowsCoreCp576HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp576P07PermissionSliceCaseSet,
  createAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor,
  createAiLegalWorkflowsCoreCp577ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp577CloseoutHandoff,
  createAiLegalWorkflowsCoreCp577HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp577P07AuditBindingSliceCaseSet,
  createAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor,
  createAiLegalWorkflowsCoreCp578ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp578CloseoutHandoff,
  createAiLegalWorkflowsCoreCp578HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceCaseSet,
  createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor,
  createAiLegalWorkflowsCoreCp579ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp579CloseoutHandoff,
  createAiLegalWorkflowsCoreCp579HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationCaseSet,
  createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor,
  createAiLegalWorkflowsCoreCp580ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp580CloseoutHandoff,
  createAiLegalWorkflowsCoreCp580HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceCaseSet,
  createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor,
  createAiLegalWorkflowsCoreCp581ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp581CloseoutHandoff,
  createAiLegalWorkflowsCoreCp581HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationCaseSet,
  createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor,
  createAiLegalWorkflowsCoreCp582ClaudeReviewPacket,
  createAiLegalWorkflowsCoreCp582CloseoutHandoff,
  createAiLegalWorkflowsCoreCp582HermesEvidencePacket,
  createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceCaseSet,
  createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor,
  aiLegalWorkflowsCoreRowKey,
  validateAiLegalWorkflowsCoreCp551Coverage,
  validateAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor,
  validateAiLegalWorkflowsCoreCp552Coverage,
  validateAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor,
  validateAiLegalWorkflowsCoreCp553Coverage,
  validateAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp554Coverage,
  validateAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp555Coverage,
  validateAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor,
  validateAiLegalWorkflowsCoreCp556Coverage,
  validateAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor,
  validateAiLegalWorkflowsCoreCp557Coverage,
  validateAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp558Coverage,
  validateAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp559Coverage,
  validateAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor,
  validateAiLegalWorkflowsCoreCp560Coverage,
  validateAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp561Coverage,
  validateAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp562Coverage,
  validateAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp563Coverage,
  validateAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor,
  validateAiLegalWorkflowsCoreCp564Coverage,
  validateAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp565Coverage,
  validateAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor,
  validateAiLegalWorkflowsCoreCp566Coverage,
  validateAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp567Coverage,
  validateAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor,
  validateAiLegalWorkflowsCoreCp568Coverage,
  validateAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp569Coverage,
  validateAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor,
  validateAiLegalWorkflowsCoreCp570Coverage,
  validateAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor,
  validateAiLegalWorkflowsCoreCp571Coverage,
  validateAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp572Coverage,
  validateAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor,
  validateAiLegalWorkflowsCoreCp573Coverage,
  validateAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp574Coverage,
  validateAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor,
  validateAiLegalWorkflowsCoreCp575Coverage,
  validateAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor,
  validateAiLegalWorkflowsCoreCp576Coverage,
  validateAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor,
  validateAiLegalWorkflowsCoreCp577Coverage,
  validateAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor,
  validateAiLegalWorkflowsCoreCp578Coverage,
  validateAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor,
  validateAiLegalWorkflowsCoreCp579Coverage,
  validateAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp580Coverage,
  validateAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor,
  validateAiLegalWorkflowsCoreCp581Coverage,
  validateAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor,
  validateAiLegalWorkflowsCoreCp582Coverage,
  validateAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor,
} from "../packages/ai-legal-workflows/src/index.js";

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

const aiLegalWorkflowsContract = await readJson("../contracts/ai-legal-workflows-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp551Manifest = await readOptionalJson("../docs/closeout-packs/cp00-551/manifest.json");
const cp551PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-551") ?? cp551Manifest?.plan_binding_snapshot;
const cp552Manifest = await readOptionalJson("../docs/closeout-packs/cp00-552/manifest.json");
const cp552PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-552") ?? cp552Manifest?.plan_binding_snapshot;
const cp553Manifest = await readOptionalJson("../docs/closeout-packs/cp00-553/manifest.json");
const cp553PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-553") ?? cp553Manifest?.plan_binding_snapshot;
const cp554Manifest = await readOptionalJson("../docs/closeout-packs/cp00-554/manifest.json");
const cp554PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-554") ?? cp554Manifest?.plan_binding_snapshot;
const cp555Manifest = await readOptionalJson("../docs/closeout-packs/cp00-555/manifest.json");
const cp555PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-555") ?? cp555Manifest?.plan_binding_snapshot;
const cp556Manifest = await readOptionalJson("../docs/closeout-packs/cp00-556/manifest.json");
const cp556PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-556") ?? cp556Manifest?.plan_binding_snapshot;
const cp557Manifest = await readOptionalJson("../docs/closeout-packs/cp00-557/manifest.json");
const cp557PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-557") ?? cp557Manifest?.plan_binding_snapshot;
const cp558Manifest = await readOptionalJson("../docs/closeout-packs/cp00-558/manifest.json");
const cp558PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-558") ?? cp558Manifest?.plan_binding_snapshot;
const cp559Manifest = await readOptionalJson("../docs/closeout-packs/cp00-559/manifest.json");
const cp559PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-559") ?? cp559Manifest?.plan_binding_snapshot;
const cp560Manifest = await readOptionalJson("../docs/closeout-packs/cp00-560/manifest.json");
const cp560PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-560") ?? cp560Manifest?.plan_binding_snapshot;
const cp561Manifest = await readOptionalJson("../docs/closeout-packs/cp00-561/manifest.json");
const cp561PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-561") ?? cp561Manifest?.plan_binding_snapshot;
const cp562Manifest = await readOptionalJson("../docs/closeout-packs/cp00-562/manifest.json");
const cp562PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-562") ?? cp562Manifest?.plan_binding_snapshot;
const cp563Manifest = await readOptionalJson("../docs/closeout-packs/cp00-563/manifest.json");
const cp563PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-563") ?? cp563Manifest?.plan_binding_snapshot;
const cp564Manifest = await readOptionalJson("../docs/closeout-packs/cp00-564/manifest.json");
const cp564PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-564") ?? cp564Manifest?.plan_binding_snapshot;
const cp565Manifest = await readOptionalJson("../docs/closeout-packs/cp00-565/manifest.json");
const cp565PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-565") ?? cp565Manifest?.plan_binding_snapshot;
const cp566Manifest = await readOptionalJson("../docs/closeout-packs/cp00-566/manifest.json");
const cp566PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-566") ?? cp566Manifest?.plan_binding_snapshot;
const cp567Manifest = await readOptionalJson("../docs/closeout-packs/cp00-567/manifest.json");
const cp567PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-567") ?? cp567Manifest?.plan_binding_snapshot;
const cp568Manifest = await readOptionalJson("../docs/closeout-packs/cp00-568/manifest.json");
const cp568PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-568") ?? cp568Manifest?.plan_binding_snapshot;
const cp569Manifest = await readOptionalJson("../docs/closeout-packs/cp00-569/manifest.json");
const cp569PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-569") ?? cp569Manifest?.plan_binding_snapshot;
const cp570Manifest = await readOptionalJson("../docs/closeout-packs/cp00-570/manifest.json");
const cp570PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-570") ?? cp570Manifest?.plan_binding_snapshot;
const cp571Manifest = await readOptionalJson("../docs/closeout-packs/cp00-571/manifest.json");
const cp571PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-571") ?? cp571Manifest?.plan_binding_snapshot;
const cp572Manifest = await readOptionalJson("../docs/closeout-packs/cp00-572/manifest.json");
const cp572PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-572") ?? cp572Manifest?.plan_binding_snapshot;
const cp573Manifest = await readOptionalJson("../docs/closeout-packs/cp00-573/manifest.json");
const cp573PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-573") ?? cp573Manifest?.plan_binding_snapshot;
const cp574Manifest = await readOptionalJson("../docs/closeout-packs/cp00-574/manifest.json");
const cp574PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-574") ?? cp574Manifest?.plan_binding_snapshot;
const cp575Manifest = await readOptionalJson("../docs/closeout-packs/cp00-575/manifest.json");
const cp575PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-575") ?? cp575Manifest?.plan_binding_snapshot;
const cp576Manifest = await readOptionalJson("../docs/closeout-packs/cp00-576/manifest.json");
const cp576PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-576") ?? cp576Manifest?.plan_binding_snapshot;
const cp577Manifest = await readOptionalJson("../docs/closeout-packs/cp00-577/manifest.json");
const cp577PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-577") ?? cp577Manifest?.plan_binding_snapshot;
const cp578Manifest = await readOptionalJson("../docs/closeout-packs/cp00-578/manifest.json");
const cp578PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-578") ?? cp578Manifest?.plan_binding_snapshot;
const cp579Manifest = await readOptionalJson("../docs/closeout-packs/cp00-579/manifest.json");
const cp579PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-579") ?? cp579Manifest?.plan_binding_snapshot;
const cp580Manifest = await readOptionalJson("../docs/closeout-packs/cp00-580/manifest.json");
const cp580PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-580") ?? cp580Manifest?.plan_binding_snapshot;
const cp581Manifest = await readOptionalJson("../docs/closeout-packs/cp00-581/manifest.json");
const cp581PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-581") ?? cp581Manifest?.plan_binding_snapshot;
const cp582Manifest = await readOptionalJson("../docs/closeout-packs/cp00-582/manifest.json");
const cp582PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-582") ?? cp582Manifest?.plan_binding_snapshot;

assert.equal(aiLegalWorkflowsContract.schema_version, "law-firm-os.ai-legal-workflows-core-contract.v0.1");
assert.equal(aiLegalWorkflowsContract.program.program_id, "RP18");
assert.equal(aiLegalWorkflowsContract.program.program_title, "AI Legal Workflows");
assert.equal(aiLegalWorkflowsContract.program.upstream_program_id, "RP17");
assert.equal(aiLegalWorkflowsContract.program.hermes_gate, "H18");
assert.equal(aiLegalWorkflowsContract.program.claude_gate, "C18");
assert.equal(aiLegalWorkflowsContract.program.descriptor_only, true);
assert.deepEqual(aiLegalWorkflowsContract.program, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT)));
assert.equal(aiLegalWorkflowsContract.current_pack.pack_id, "CP00-582");
assert.equal(aiLegalWorkflowsContract.program.current_pack_id, "CP00-582");
assert.deepEqual(aiLegalWorkflowsContract.current_pack, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING)));
assert.deepEqual(aiLegalWorkflowsContract.no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION)));

assert.ok(cp551PlanPack, "CP00-551 must exist in closeout-pack-plan.json");
assert.equal(cp551PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.unit_count, "CP00-551 unit count drift");
assert.ok(cp552PlanPack, "CP00-552 must exist in closeout-pack-plan.json");
assert.equal(cp552PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.unit_count, "CP00-552 unit count drift");
assert.ok(cp553PlanPack, "CP00-553 must exist in closeout-pack-plan.json");
assert.equal(cp553PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.unit_count, "CP00-553 unit count drift");
assert.ok(cp554PlanPack, "CP00-554 must exist in closeout-pack-plan.json");
assert.equal(cp554PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.unit_count, "CP00-554 unit count drift");
assert.ok(cp555PlanPack, "CP00-555 must exist in closeout-pack-plan.json");
assert.equal(cp555PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.unit_count, "CP00-555 unit count drift");
assert.ok(cp556PlanPack, "CP00-556 must exist in closeout-pack-plan.json");
assert.equal(cp556PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.unit_count, "CP00-556 unit count drift");
assert.ok(cp557PlanPack, "CP00-557 must exist in closeout-pack-plan.json");
assert.equal(cp557PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.unit_count, "CP00-557 unit count drift");
assert.ok(cp558PlanPack, "CP00-558 must exist in closeout-pack-plan.json");
assert.equal(cp558PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.unit_count, "CP00-558 unit count drift");
assert.ok(cp559PlanPack, "CP00-559 must exist in closeout-pack-plan.json");
assert.equal(cp559PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.unit_count, "CP00-559 unit count drift");
assert.ok(cp560PlanPack, "CP00-560 must exist in closeout-pack-plan.json");
assert.equal(cp560PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.unit_count, "CP00-560 unit count drift");
assert.ok(cp561PlanPack, "CP00-561 must exist in closeout-pack-plan.json");
assert.equal(cp561PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.unit_count, "CP00-561 unit count drift");
assert.ok(cp562PlanPack, "CP00-562 must exist in closeout-pack-plan.json");
assert.equal(cp562PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.unit_count, "CP00-562 unit count drift");
assert.ok(cp563PlanPack, "CP00-563 must exist in closeout-pack-plan.json");
assert.equal(cp563PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.unit_count, "CP00-563 unit count drift");
assert.ok(cp564PlanPack, "CP00-564 must exist in closeout-pack-plan.json");
assert.equal(cp564PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.unit_count, "CP00-564 unit count drift");
assert.ok(cp565PlanPack, "CP00-565 must exist in closeout-pack-plan.json");
assert.equal(cp565PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.unit_count, "CP00-565 unit count drift");
assert.ok(cp566PlanPack, "CP00-566 must exist in closeout-pack-plan.json");
assert.equal(cp566PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.unit_count, "CP00-566 unit count drift");
assert.ok(cp567PlanPack, "CP00-567 must exist in closeout-pack-plan.json");
assert.equal(cp567PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.unit_count, "CP00-567 unit count drift");
assert.ok(cp568PlanPack, "CP00-568 must exist in closeout-pack-plan.json");
assert.equal(cp568PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.unit_count, "CP00-568 unit count drift");
assert.ok(cp569PlanPack, "CP00-569 must exist in closeout-pack-plan.json");
assert.equal(cp569PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.unit_count, "CP00-569 unit count drift");
assert.ok(cp570PlanPack, "CP00-570 must exist in closeout-pack-plan.json");
assert.equal(cp570PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.unit_count, "CP00-570 unit count drift");
assert.ok(cp571PlanPack, "CP00-571 must exist in closeout-pack-plan.json");
assert.equal(cp571PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.unit_count, "CP00-571 unit count drift");
assert.ok(cp572PlanPack, "CP00-572 must exist in closeout-pack-plan.json");
assert.equal(cp572PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.unit_count, "CP00-572 unit count drift");
assert.ok(cp573PlanPack, "CP00-573 must exist in closeout-pack-plan.json");
assert.equal(cp573PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.unit_count, "CP00-573 unit count drift");
assert.ok(cp574PlanPack, "CP00-574 must exist in closeout-pack-plan.json");
assert.equal(cp574PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.unit_count, "CP00-574 unit count drift");
assert.ok(cp575PlanPack, "CP00-575 must exist in closeout-pack-plan.json");
assert.equal(cp575PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.unit_count, "CP00-575 unit count drift");
assert.ok(cp576PlanPack, "CP00-576 must exist in closeout-pack-plan.json");
assert.equal(cp576PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.unit_count, "CP00-576 unit count drift");
assert.ok(cp577PlanPack, "CP00-577 must exist in closeout-pack-plan.json");
assert.equal(cp577PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.unit_count, "CP00-577 unit count drift");
assert.ok(cp578PlanPack, "CP00-578 must exist in closeout-pack-plan.json");
assert.equal(cp578PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.unit_count, "CP00-578 unit count drift");
assert.ok(cp579PlanPack, "CP00-579 must exist in closeout-pack-plan.json");
assert.equal(cp579PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.unit_count, "CP00-579 unit count drift");
assert.ok(cp580PlanPack, "CP00-580 must exist in closeout-pack-plan.json");
assert.equal(cp580PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.unit_count, "CP00-580 unit count drift");
assert.ok(cp581PlanPack, "CP00-581 must exist in closeout-pack-plan.json");
assert.equal(cp581PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.unit_count, "CP00-581 unit count drift");
assert.ok(cp582PlanPack, "CP00-582 must exist in closeout-pack-plan.json");
assert.equal(cp582PlanPack.unit_count, AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.unit_count, "CP00-582 unit count drift");

const cp551Coverage = validateAiLegalWorkflowsCoreCp551Coverage(cp551PlanPack);
const cp551Descriptor = createAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor();
const cp551CaseSet = createAiLegalWorkflowsCoreCp551ScopeContractFoundationCaseSet();
const cp551Foundation = validateAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor(cp551Descriptor, aiLegalWorkflowsContract);
const cp551Hermes = createAiLegalWorkflowsCoreCp551HermesEvidencePacket(cp551PlanPack, aiLegalWorkflowsContract, cp551Descriptor);
const cp551Claude = createAiLegalWorkflowsCoreCp551ClaudeReviewPacket(cp551PlanPack);
const cp551Handoff = createAiLegalWorkflowsCoreCp551CloseoutHandoff();
const cp552Coverage = validateAiLegalWorkflowsCoreCp552Coverage(cp552PlanPack);
const cp552Descriptor = createAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor();
const cp552CaseSet = createAiLegalWorkflowsCoreCp552P01ImplementationSliceCaseSet();
const cp552Slice = validateAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor(cp552Descriptor, aiLegalWorkflowsContract);
const cp552Hermes = createAiLegalWorkflowsCoreCp552HermesEvidencePacket(cp552PlanPack, aiLegalWorkflowsContract, cp552Descriptor);
const cp552Claude = createAiLegalWorkflowsCoreCp552ClaudeReviewPacket(cp552PlanPack);
const cp552Handoff = createAiLegalWorkflowsCoreCp552CloseoutHandoff();
const cp553Coverage = validateAiLegalWorkflowsCoreCp553Coverage(cp553PlanPack);
const cp553Descriptor = createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor();
const cp553CaseSet = createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceCaseSet();
const cp553Slice = validateAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor(cp553Descriptor, aiLegalWorkflowsContract);
const cp553Hermes = createAiLegalWorkflowsCoreCp553HermesEvidencePacket(cp553PlanPack, aiLegalWorkflowsContract, cp553Descriptor);
const cp553Claude = createAiLegalWorkflowsCoreCp553ClaudeReviewPacket(cp553PlanPack);
const cp553Handoff = createAiLegalWorkflowsCoreCp553CloseoutHandoff();
const cp554Coverage = validateAiLegalWorkflowsCoreCp554Coverage(cp554PlanPack);
const cp554Descriptor = createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor();
const cp554CaseSet = createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationCaseSet();
const cp554Slice = validateAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor(cp554Descriptor, aiLegalWorkflowsContract);
const cp554Hermes = createAiLegalWorkflowsCoreCp554HermesEvidencePacket(cp554PlanPack, aiLegalWorkflowsContract, cp554Descriptor);
const cp554Claude = createAiLegalWorkflowsCoreCp554ClaudeReviewPacket(cp554PlanPack);
const cp554Handoff = createAiLegalWorkflowsCoreCp554CloseoutHandoff();
const cp555Coverage = validateAiLegalWorkflowsCoreCp555Coverage(cp555PlanPack);
const cp555Descriptor = createAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor();
const cp555CaseSet = createAiLegalWorkflowsCoreCp555P02ImplementationSliceCaseSet();
const cp555Slice = validateAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor(cp555Descriptor, aiLegalWorkflowsContract);
const cp555Hermes = createAiLegalWorkflowsCoreCp555HermesEvidencePacket(cp555PlanPack, aiLegalWorkflowsContract, cp555Descriptor);
const cp555Claude = createAiLegalWorkflowsCoreCp555ClaudeReviewPacket(cp555PlanPack);
const cp555Handoff = createAiLegalWorkflowsCoreCp555CloseoutHandoff();
const cp556Coverage = validateAiLegalWorkflowsCoreCp556Coverage(cp556PlanPack);
const cp556Descriptor = createAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor();
const cp556CaseSet = createAiLegalWorkflowsCoreCp556P02WorkflowSliceCaseSet();
const cp556Slice = validateAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor(cp556Descriptor, aiLegalWorkflowsContract);
const cp556Hermes = createAiLegalWorkflowsCoreCp556HermesEvidencePacket(cp556PlanPack, aiLegalWorkflowsContract, cp556Descriptor);
const cp556Claude = createAiLegalWorkflowsCoreCp556ClaudeReviewPacket(cp556PlanPack);
const cp556Handoff = createAiLegalWorkflowsCoreCp556CloseoutHandoff();
const cp557Coverage = validateAiLegalWorkflowsCoreCp557Coverage(cp557PlanPack);
const cp557Descriptor = createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor();
const cp557CaseSet = createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceCaseSet();
const cp557Slice = validateAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor(cp557Descriptor, aiLegalWorkflowsContract);
const cp557Hermes = createAiLegalWorkflowsCoreCp557HermesEvidencePacket(cp557PlanPack, aiLegalWorkflowsContract, cp557Descriptor);
const cp557Claude = createAiLegalWorkflowsCoreCp557ClaudeReviewPacket(cp557PlanPack);
const cp557Handoff = createAiLegalWorkflowsCoreCp557CloseoutHandoff();
const cp558Coverage = validateAiLegalWorkflowsCoreCp558Coverage(cp558PlanPack);
const cp558Descriptor = createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor();
const cp558CaseSet = createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationCaseSet();
const cp558Slice = validateAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor(cp558Descriptor, aiLegalWorkflowsContract);
const cp558Hermes = createAiLegalWorkflowsCoreCp558HermesEvidencePacket(cp558PlanPack, aiLegalWorkflowsContract, cp558Descriptor);
const cp558Claude = createAiLegalWorkflowsCoreCp558ClaudeReviewPacket(cp558PlanPack);
const cp558Handoff = createAiLegalWorkflowsCoreCp558CloseoutHandoff();
const cp559Coverage = validateAiLegalWorkflowsCoreCp559Coverage(cp559PlanPack);
const cp559Descriptor = createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor();
const cp559CaseSet = createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceCaseSet();
const cp559Slice = validateAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor(cp559Descriptor, aiLegalWorkflowsContract);
const cp559Hermes = createAiLegalWorkflowsCoreCp559HermesEvidencePacket(cp559PlanPack, aiLegalWorkflowsContract, cp559Descriptor);
const cp559Claude = createAiLegalWorkflowsCoreCp559ClaudeReviewPacket(cp559PlanPack);
const cp559Handoff = createAiLegalWorkflowsCoreCp559CloseoutHandoff();
const cp560Coverage = validateAiLegalWorkflowsCoreCp560Coverage(cp560PlanPack);
const cp560Descriptor = createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor();
const cp560CaseSet = createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceCaseSet();
const cp560Slice = validateAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor(cp560Descriptor, aiLegalWorkflowsContract);
const cp560Hermes = createAiLegalWorkflowsCoreCp560HermesEvidencePacket(cp560PlanPack, aiLegalWorkflowsContract, cp560Descriptor);
const cp560Claude = createAiLegalWorkflowsCoreCp560ClaudeReviewPacket(cp560PlanPack);
const cp560Handoff = createAiLegalWorkflowsCoreCp560CloseoutHandoff();
const cp561Coverage = validateAiLegalWorkflowsCoreCp561Coverage(cp561PlanPack);
const cp561Descriptor = createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor();
const cp561CaseSet = createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationCaseSet();
const cp561Slice = validateAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor(cp561Descriptor, aiLegalWorkflowsContract);
const cp561Hermes = createAiLegalWorkflowsCoreCp561HermesEvidencePacket(cp561PlanPack, aiLegalWorkflowsContract, cp561Descriptor);
const cp561Claude = createAiLegalWorkflowsCoreCp561ClaudeReviewPacket(cp561PlanPack);
const cp561Handoff = createAiLegalWorkflowsCoreCp561CloseoutHandoff();
const cp562Coverage = validateAiLegalWorkflowsCoreCp562Coverage(cp562PlanPack);
const cp562Descriptor = createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor();
const cp562CaseSet = createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceCaseSet();
const cp562Slice = validateAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor(cp562Descriptor, aiLegalWorkflowsContract);
const cp562Hermes = createAiLegalWorkflowsCoreCp562HermesEvidencePacket(cp562PlanPack, aiLegalWorkflowsContract, cp562Descriptor);
const cp562Claude = createAiLegalWorkflowsCoreCp562ClaudeReviewPacket(cp562PlanPack);
const cp562Handoff = createAiLegalWorkflowsCoreCp562CloseoutHandoff();
const cp563Coverage = validateAiLegalWorkflowsCoreCp563Coverage(cp563PlanPack);
const cp563Descriptor = createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor();
const cp563CaseSet = createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceCaseSet();
const cp563Slice = validateAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor(cp563Descriptor, aiLegalWorkflowsContract);
const cp563Hermes = createAiLegalWorkflowsCoreCp563HermesEvidencePacket(cp563PlanPack, aiLegalWorkflowsContract, cp563Descriptor);
const cp563Claude = createAiLegalWorkflowsCoreCp563ClaudeReviewPacket(cp563PlanPack);
const cp563Handoff = createAiLegalWorkflowsCoreCp563CloseoutHandoff();
const cp564Coverage = validateAiLegalWorkflowsCoreCp564Coverage(cp564PlanPack);
const cp564Descriptor = createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor();
const cp564CaseSet = createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationCaseSet();
const cp564Slice = validateAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor(cp564Descriptor, aiLegalWorkflowsContract);
const cp564Hermes = createAiLegalWorkflowsCoreCp564HermesEvidencePacket(cp564PlanPack, aiLegalWorkflowsContract, cp564Descriptor);
const cp564Claude = createAiLegalWorkflowsCoreCp564ClaudeReviewPacket(cp564PlanPack);
const cp564Handoff = createAiLegalWorkflowsCoreCp564CloseoutHandoff();
const cp565Coverage = validateAiLegalWorkflowsCoreCp565Coverage(cp565PlanPack);
const cp565Descriptor = createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor();
const cp565CaseSet = createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceCaseSet();
const cp565Slice = validateAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor(cp565Descriptor, aiLegalWorkflowsContract);
const cp565Hermes = createAiLegalWorkflowsCoreCp565HermesEvidencePacket(cp565PlanPack, aiLegalWorkflowsContract, cp565Descriptor);
const cp565Claude = createAiLegalWorkflowsCoreCp565ClaudeReviewPacket(cp565PlanPack);
const cp565Handoff = createAiLegalWorkflowsCoreCp565CloseoutHandoff();
const cp566Coverage = validateAiLegalWorkflowsCoreCp566Coverage(cp566PlanPack);
const cp566Descriptor = createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor();
const cp566CaseSet = createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceCaseSet();
const cp566Slice = validateAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor(cp566Descriptor, aiLegalWorkflowsContract);
const cp566Hermes = createAiLegalWorkflowsCoreCp566HermesEvidencePacket(cp566PlanPack, aiLegalWorkflowsContract, cp566Descriptor);
const cp566Claude = createAiLegalWorkflowsCoreCp566ClaudeReviewPacket(cp566PlanPack);
const cp566Handoff = createAiLegalWorkflowsCoreCp566CloseoutHandoff();
const cp567Coverage = validateAiLegalWorkflowsCoreCp567Coverage(cp567PlanPack);
const cp567Descriptor = createAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor();
const cp567CaseSet = createAiLegalWorkflowsCoreCp567P05FixtureSliceCaseSet();
const cp567Slice = validateAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor(cp567Descriptor, aiLegalWorkflowsContract);
const cp567Hermes = createAiLegalWorkflowsCoreCp567HermesEvidencePacket(cp567PlanPack, aiLegalWorkflowsContract, cp567Descriptor);
const cp567Claude = createAiLegalWorkflowsCoreCp567ClaudeReviewPacket(cp567PlanPack);
const cp567Handoff = createAiLegalWorkflowsCoreCp567CloseoutHandoff();
const cp568Coverage = validateAiLegalWorkflowsCoreCp568Coverage(cp568PlanPack);
const cp568Descriptor = createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor();
const cp568CaseSet = createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationCaseSet();
const cp568Slice = validateAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor(cp568Descriptor, aiLegalWorkflowsContract);
const cp568Hermes = createAiLegalWorkflowsCoreCp568HermesEvidencePacket(cp568PlanPack, aiLegalWorkflowsContract, cp568Descriptor);
const cp568Claude = createAiLegalWorkflowsCoreCp568ClaudeReviewPacket(cp568PlanPack);
const cp568Handoff = createAiLegalWorkflowsCoreCp568CloseoutHandoff();
const cp569Coverage = validateAiLegalWorkflowsCoreCp569Coverage(cp569PlanPack);
const cp569Descriptor = createAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor();
const cp569CaseSet = createAiLegalWorkflowsCoreCp569P06FoundationSliceCaseSet();
const cp569Slice = validateAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor(cp569Descriptor, aiLegalWorkflowsContract);
const cp569Hermes = createAiLegalWorkflowsCoreCp569HermesEvidencePacket(cp569PlanPack, aiLegalWorkflowsContract, cp569Descriptor);
const cp569Claude = createAiLegalWorkflowsCoreCp569ClaudeReviewPacket(cp569PlanPack);
const cp569Handoff = createAiLegalWorkflowsCoreCp569CloseoutHandoff();
const cp570Coverage = validateAiLegalWorkflowsCoreCp570Coverage(cp570PlanPack);
const cp570Descriptor = createAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor();
const cp570CaseSet = createAiLegalWorkflowsCoreCp570P06ImplementationSliceCaseSet();
const cp570Slice = validateAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor(cp570Descriptor, aiLegalWorkflowsContract);
const cp570Hermes = createAiLegalWorkflowsCoreCp570HermesEvidencePacket(cp570PlanPack, aiLegalWorkflowsContract, cp570Descriptor);
const cp570Claude = createAiLegalWorkflowsCoreCp570ClaudeReviewPacket(cp570PlanPack);
const cp570Handoff = createAiLegalWorkflowsCoreCp570CloseoutHandoff();
const cp571Coverage = validateAiLegalWorkflowsCoreCp571Coverage(cp571PlanPack);
const cp571Descriptor = createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor();
const cp571CaseSet = createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceCaseSet();
const cp571Slice = validateAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor(cp571Descriptor, aiLegalWorkflowsContract);
const cp571Hermes = createAiLegalWorkflowsCoreCp571HermesEvidencePacket(cp571PlanPack, aiLegalWorkflowsContract, cp571Descriptor);
const cp571Claude = createAiLegalWorkflowsCoreCp571ClaudeReviewPacket(cp571PlanPack);
const cp571Handoff = createAiLegalWorkflowsCoreCp571CloseoutHandoff();
const cp572Coverage = validateAiLegalWorkflowsCoreCp572Coverage(cp572PlanPack);
const cp572Descriptor = createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor();
const cp572CaseSet = createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceCaseSet();
const cp572Slice = validateAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor(cp572Descriptor, aiLegalWorkflowsContract);
const cp572Hermes = createAiLegalWorkflowsCoreCp572HermesEvidencePacket(cp572PlanPack, aiLegalWorkflowsContract, cp572Descriptor);
const cp572Claude = createAiLegalWorkflowsCoreCp572ClaudeReviewPacket(cp572PlanPack);
const cp572Handoff = createAiLegalWorkflowsCoreCp572CloseoutHandoff();
const cp573Coverage = validateAiLegalWorkflowsCoreCp573Coverage(cp573PlanPack);
const cp573Descriptor = createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor();
const cp573CaseSet = createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationCaseSet();
const cp573Slice = validateAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor(cp573Descriptor, aiLegalWorkflowsContract);
const cp573Hermes = createAiLegalWorkflowsCoreCp573HermesEvidencePacket(cp573PlanPack, aiLegalWorkflowsContract, cp573Descriptor);
const cp573Claude = createAiLegalWorkflowsCoreCp573ClaudeReviewPacket(cp573PlanPack);
const cp573Handoff = createAiLegalWorkflowsCoreCp573CloseoutHandoff();
const cp574Coverage = validateAiLegalWorkflowsCoreCp574Coverage(cp574PlanPack);
const cp574Descriptor = createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor();
const cp574CaseSet = createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceCaseSet();
const cp574Slice = validateAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor(cp574Descriptor, aiLegalWorkflowsContract);
const cp574Hermes = createAiLegalWorkflowsCoreCp574HermesEvidencePacket(cp574PlanPack, aiLegalWorkflowsContract, cp574Descriptor);
const cp574Claude = createAiLegalWorkflowsCoreCp574ClaudeReviewPacket(cp574PlanPack);
const cp574Handoff = createAiLegalWorkflowsCoreCp574CloseoutHandoff();
const cp575Coverage = validateAiLegalWorkflowsCoreCp575Coverage(cp575PlanPack);
const cp575Descriptor = createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor();
const cp575CaseSet = createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceCaseSet();
const cp575Slice = validateAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor(cp575Descriptor, aiLegalWorkflowsContract);
const cp575Hermes = createAiLegalWorkflowsCoreCp575HermesEvidencePacket(cp575PlanPack, aiLegalWorkflowsContract, cp575Descriptor);
const cp575Claude = createAiLegalWorkflowsCoreCp575ClaudeReviewPacket(cp575PlanPack);
const cp575Handoff = createAiLegalWorkflowsCoreCp575CloseoutHandoff();
const cp576Coverage = validateAiLegalWorkflowsCoreCp576Coverage(cp576PlanPack);
const cp576Descriptor = createAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor();
const cp576CaseSet = createAiLegalWorkflowsCoreCp576P07PermissionSliceCaseSet();
const cp576Slice = validateAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor(cp576Descriptor, aiLegalWorkflowsContract);
const cp576Hermes = createAiLegalWorkflowsCoreCp576HermesEvidencePacket(cp576PlanPack, aiLegalWorkflowsContract, cp576Descriptor);
const cp576Claude = createAiLegalWorkflowsCoreCp576ClaudeReviewPacket(cp576PlanPack);
const cp576Handoff = createAiLegalWorkflowsCoreCp576CloseoutHandoff();
const cp577Coverage = validateAiLegalWorkflowsCoreCp577Coverage(cp577PlanPack);
const cp577Descriptor = createAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor();
const cp577CaseSet = createAiLegalWorkflowsCoreCp577P07AuditBindingSliceCaseSet();
const cp577Slice = validateAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor(cp577Descriptor, aiLegalWorkflowsContract);
const cp577Hermes = createAiLegalWorkflowsCoreCp577HermesEvidencePacket(cp577PlanPack, aiLegalWorkflowsContract, cp577Descriptor);
const cp577Claude = createAiLegalWorkflowsCoreCp577ClaudeReviewPacket(cp577PlanPack);
const cp577Handoff = createAiLegalWorkflowsCoreCp577CloseoutHandoff();
const cp578Coverage = validateAiLegalWorkflowsCoreCp578Coverage(cp578PlanPack);
const cp578Descriptor = createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor();
const cp578CaseSet = createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceCaseSet();
const cp578Slice = validateAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor(cp578Descriptor, aiLegalWorkflowsContract);
const cp578Hermes = createAiLegalWorkflowsCoreCp578HermesEvidencePacket(cp578PlanPack, aiLegalWorkflowsContract, cp578Descriptor);
const cp578Claude = createAiLegalWorkflowsCoreCp578ClaudeReviewPacket(cp578PlanPack);
const cp578Handoff = createAiLegalWorkflowsCoreCp578CloseoutHandoff();
const cp579Coverage = validateAiLegalWorkflowsCoreCp579Coverage(cp579PlanPack);
const cp579Descriptor = createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor();
const cp579CaseSet = createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationCaseSet();
const cp579Slice = validateAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor(cp579Descriptor, aiLegalWorkflowsContract);
const cp579Hermes = createAiLegalWorkflowsCoreCp579HermesEvidencePacket(cp579PlanPack, aiLegalWorkflowsContract, cp579Descriptor);
const cp579Claude = createAiLegalWorkflowsCoreCp579ClaudeReviewPacket(cp579PlanPack);
const cp579Handoff = createAiLegalWorkflowsCoreCp579CloseoutHandoff();
const cp580Coverage = validateAiLegalWorkflowsCoreCp580Coverage(cp580PlanPack);
const cp580Descriptor = createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor();
const cp580CaseSet = createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceCaseSet();
const cp580Slice = validateAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor(cp580Descriptor, aiLegalWorkflowsContract);
const cp580Hermes = createAiLegalWorkflowsCoreCp580HermesEvidencePacket(cp580PlanPack, aiLegalWorkflowsContract, cp580Descriptor);
const cp580Claude = createAiLegalWorkflowsCoreCp580ClaudeReviewPacket(cp580PlanPack);
const cp580Handoff = createAiLegalWorkflowsCoreCp580CloseoutHandoff();
const cp581Coverage = validateAiLegalWorkflowsCoreCp581Coverage(cp581PlanPack);
const cp581Descriptor = createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor();
const cp581CaseSet = createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationCaseSet();
const cp581Slice = validateAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor(cp581Descriptor, aiLegalWorkflowsContract);
const cp581Hermes = createAiLegalWorkflowsCoreCp581HermesEvidencePacket(cp581PlanPack, aiLegalWorkflowsContract, cp581Descriptor);
const cp581Claude = createAiLegalWorkflowsCoreCp581ClaudeReviewPacket(cp581PlanPack);
const cp581Handoff = createAiLegalWorkflowsCoreCp581CloseoutHandoff();
const cp582Coverage = validateAiLegalWorkflowsCoreCp582Coverage(cp582PlanPack);
const cp582Descriptor = createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor();
const cp582CaseSet = createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceCaseSet();
const cp582Slice = validateAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor(cp582Descriptor, aiLegalWorkflowsContract);
const cp582Hermes = createAiLegalWorkflowsCoreCp582HermesEvidencePacket(cp582PlanPack, aiLegalWorkflowsContract, cp582Descriptor);
const cp582Claude = createAiLegalWorkflowsCoreCp582ClaudeReviewPacket(cp582PlanPack);
const cp582Handoff = createAiLegalWorkflowsCoreCp582CloseoutHandoff();

assert.equal(cp551Coverage.valid, true, cp551Coverage.errors.join("; "));
assert.equal(cp551Coverage.summary.unit_count, 150);
assert.equal(cp551Coverage.summary.by_phase["RP18.P00"], 122);
assert.equal(cp551Coverage.summary.by_phase["RP18.P01"], 28);
assert.equal(cp551Foundation.valid, true, cp551Foundation.errors.join("; "));
assert.equal(cp551CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP551_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp551CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-551 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp551Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp551_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP551_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp551_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION)));
assert.equal(cp551Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp551Hermes.production_ready_candidate, true);
assert.equal(cp551Claude.review_packet, "C18.CP00-551.ai_legal_workflows_core_scope_contract_foundation_descriptor");
assert.equal(cp551Claude.read_only, true);
assert.equal(cp551Handoff.to_pack_id, "CP00-552");
assert.equal(cp551Handoff.next_subphase_id, "RP18.P01.M02.S09");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp552Coverage.valid, true, cp552Coverage.errors.join("; "));
assert.equal(cp552Coverage.summary.unit_count, 40);
assert.equal(cp552Coverage.summary.by_micro_phase["RP18.P01.M02"], 12);
assert.equal(cp552Coverage.summary.by_micro_phase["RP18.P01.M03"], 22);
assert.equal(cp552Coverage.summary.by_micro_phase["RP18.P01.M04"], 6);
assert.equal(cp552Slice.valid, true, cp552Slice.errors.join("; "));
assert.equal(cp552CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP552_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp552CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-552 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p01_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp552Descriptor)),
  "contract p01_implementation_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp552_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP552_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp552_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION)));
assert.equal(cp552Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp552Hermes.production_ready_candidate, true);
assert.equal(cp552Claude.review_packet, "C18.CP00-552.ai_legal_workflows_core_p01_implementation_slice_descriptor");
assert.equal(cp552Claude.read_only, true);
assert.equal(cp552Handoff.to_pack_id, "CP00-553");
assert.equal(cp552Handoff.next_subphase_id, "RP18.P01.M04.S07");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp553Coverage.valid, true, cp553Coverage.errors.join("; "));
assert.equal(cp553Coverage.summary.unit_count, 40);
assert.equal(cp553Coverage.summary.by_micro_phase["RP18.P01.M04"], 14);
assert.equal(cp553Coverage.summary.by_micro_phase["RP18.P01.M05"], 22);
assert.equal(cp553Coverage.summary.by_micro_phase["RP18.P01.M06"], 4);
assert.equal(cp553Slice.valid, true, cp553Slice.errors.join("; "));
assert.equal(cp553CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP553_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp553CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-553 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p01_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp553Descriptor)),
  "contract p01_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp553_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP553_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp553_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION)));
assert.equal(cp553Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp553Hermes.production_ready_candidate, true);
assert.equal(cp553Claude.review_packet, "C18.CP00-553.ai_legal_workflows_core_p01_workflow_permission_slice_descriptor");
assert.equal(cp553Claude.read_only, true);
assert.equal(cp553Handoff.to_pack_id, "CP00-554");
assert.equal(cp553Handoff.next_subphase_id, "RP18.P01.M06.S05");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp554Coverage.valid, true, cp554Coverage.errors.join("; "));
assert.equal(cp554Coverage.summary.unit_count, 150);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P01.M06"], 16);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P01.M07"], 22);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P01.M08"], 20);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P01.M09"], 20);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P01.M10"], 10);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P02.M00"], 20);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P02.M01"], 20);
assert.equal(cp554Coverage.summary.by_micro_phase["RP18.P02.M02"], 22);
assert.equal(cp554Slice.valid, true, cp554Slice.errors.join("; "));
assert.equal(cp554CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP554_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp554CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-554 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp554Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp554_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP554_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp554_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION)));
assert.equal(cp554Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp554Hermes.production_ready_candidate, true);
assert.equal(cp554Claude.review_packet, "C18.CP00-554.ai_legal_workflows_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp554Claude.read_only, true);
assert.equal(cp554Handoff.to_pack_id, "CP00-555");
assert.equal(cp554Handoff.next_subphase_id, "RP18.P02.M03.S01");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp555Coverage.valid, true, cp555Coverage.errors.join("; "));
assert.equal(cp555Coverage.summary.unit_count, 40);
assert.equal(cp555Coverage.summary.by_micro_phase["RP18.P02.M03"], 30);
assert.equal(cp555Coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
assert.equal(cp555Slice.valid, true, cp555Slice.errors.join("; "));
assert.equal(cp555CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP555_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp555CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-555 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p02_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp555Descriptor)),
  "contract p02_implementation_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp555_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP555_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp555_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION)));
assert.equal(cp555Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp555Hermes.production_ready_candidate, true);
assert.equal(cp555Claude.review_packet, "C18.CP00-555.ai_legal_workflows_core_p02_implementation_slice_descriptor");
assert.equal(cp555Claude.read_only, true);
assert.equal(cp555Handoff.to_pack_id, "CP00-556");
assert.equal(cp555Handoff.next_subphase_id, "RP18.P02.M04.S11");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp556Coverage.valid, true, cp556Coverage.errors.join("; "));
assert.equal(cp556Coverage.summary.unit_count, 10);
assert.equal(cp556Coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
assert.equal(cp556Slice.valid, true, cp556Slice.errors.join("; "));
assert.equal(cp556CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP556_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp556CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-556 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p02_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp556Descriptor)),
  "contract p02_workflow_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp556_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP556_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp556_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION)));
assert.equal(cp556Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp556Hermes.production_ready_candidate, true);
assert.equal(cp556Claude.review_packet, "C18.CP00-556.ai_legal_workflows_core_p02_workflow_slice_descriptor");
assert.equal(cp556Claude.read_only, true);
assert.equal(cp556Handoff.to_pack_id, "CP00-557");
assert.equal(cp556Handoff.next_subphase_id, "RP18.P02.M04.S21");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp557Coverage.valid, true, cp557Coverage.errors.join("; "));
assert.equal(cp557Coverage.summary.unit_count, 40);
assert.equal(cp557Coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
assert.equal(cp557Coverage.summary.by_micro_phase["RP18.P02.M05"], 30);
assert.equal(cp557Slice.valid, true, cp557Slice.errors.join("; "));
assert.equal(cp557CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP557_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp557CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-557 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp557Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp557_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP557_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp557_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION)));
assert.equal(cp557Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp557Hermes.production_ready_candidate, true);
assert.equal(cp557Claude.review_packet, "C18.CP00-557.ai_legal_workflows_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp557Claude.read_only, true);
assert.equal(cp557Handoff.to_pack_id, "CP00-558");
assert.equal(cp557Handoff.next_subphase_id, "RP18.P02.M06.S01");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp558Coverage.valid, true, cp558Coverage.errors.join("; "));
assert.equal(cp558Coverage.summary.unit_count, 150);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P02.M06"], 22);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P02.M07"], 30);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P02.M08"], 22);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P02.M09"], 22);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P02.M10"], 20);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P03.M00"], 10);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P03.M01"], 10);
assert.equal(cp558Coverage.summary.by_micro_phase["RP18.P03.M02"], 14);
assert.equal(cp558Slice.valid, true, cp558Slice.errors.join("; "));
assert.equal(cp558CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP558_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp558CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-558 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp558Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp558_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP558_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp558_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION)));
assert.equal(cp558Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp558Hermes.production_ready_candidate, true);
assert.equal(cp558Claude.review_packet, "C18.CP00-558.ai_legal_workflows_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp558Claude.read_only, true);
assert.equal(cp558Handoff.to_pack_id, "CP00-559");
assert.equal(cp558Handoff.next_subphase_id, "RP18.P03.M02.S15");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp559Coverage.valid, true, cp559Coverage.errors.join("; "));
assert.equal(cp559Coverage.summary.unit_count, 40);
assert.equal(cp559Coverage.summary.by_micro_phase["RP18.P03.M02"], 6);
assert.equal(cp559Coverage.summary.by_micro_phase["RP18.P03.M03"], 22);
assert.equal(cp559Coverage.summary.by_micro_phase["RP18.P03.M04"], 12);
assert.equal(cp559Slice.valid, true, cp559Slice.errors.join("; "));
assert.equal(cp559CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP559_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp559CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-559 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p03_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp559Descriptor)),
  "contract p03_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp559_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP559_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp559_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION)));
assert.equal(cp559Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp559Hermes.production_ready_candidate, true);
assert.equal(cp559Claude.review_packet, "C18.CP00-559.ai_legal_workflows_core_p03_implementation_workflow_slice_descriptor");
assert.equal(cp559Claude.read_only, true);
assert.equal(cp559Handoff.to_pack_id, "CP00-560");
assert.equal(cp559Handoff.next_subphase_id, "RP18.P03.M04.S13");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp560Coverage.valid, true, cp560Coverage.errors.join("; "));
assert.equal(cp560Coverage.summary.unit_count, 40);
assert.equal(cp560Coverage.summary.by_micro_phase["RP18.P03.M04"], 8);
assert.equal(cp560Coverage.summary.by_micro_phase["RP18.P03.M05"], 22);
assert.equal(cp560Coverage.summary.by_micro_phase["RP18.P03.M06"], 10);
assert.equal(cp560Slice.valid, true, cp560Slice.errors.join("; "));
assert.equal(cp560CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP560_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp560CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-560 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p03_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp560Descriptor)),
  "contract p03_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp560_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP560_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp560_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION)));
assert.equal(cp560Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp560Hermes.production_ready_candidate, true);
assert.equal(cp560Claude.review_packet, "C18.CP00-560.ai_legal_workflows_core_p03_workflow_permission_slice_descriptor");
assert.equal(cp560Claude.read_only, true);
assert.equal(cp560Handoff.to_pack_id, "CP00-561");
assert.equal(cp560Handoff.next_subphase_id, "RP18.P03.M06.S11");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp561Coverage.valid, true, cp561Coverage.errors.join("; "));
assert.equal(cp561Coverage.summary.unit_count, 150);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P03.M06"], 10);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P03.M07"], 22);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P03.M08"], 20);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P03.M09"], 20);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P03.M10"], 10);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P04.M00"], 10);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P04.M01"], 20);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P04.M02"], 20);
assert.equal(cp561Coverage.summary.by_micro_phase["RP18.P04.M03"], 18);
assert.equal(cp561Slice.valid, true, cp561Slice.errors.join("; "));
assert.equal(cp561CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP561_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp561CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-561 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp561Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp561_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP561_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp561_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION)));
assert.equal(cp561Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp561Hermes.production_ready_candidate, true);
assert.equal(cp561Claude.review_packet, "C18.CP00-561.ai_legal_workflows_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp561Claude.read_only, true);
assert.equal(cp561Handoff.to_pack_id, "CP00-562");
assert.equal(cp561Handoff.next_subphase_id, "RP18.P04.M03.S19");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp562Coverage.valid, true, cp562Coverage.errors.join("; "));
assert.equal(cp562Coverage.summary.unit_count, 40);
assert.equal(cp562Coverage.summary.by_micro_phase["RP18.P04.M03"], 4);
assert.equal(cp562Coverage.summary.by_micro_phase["RP18.P04.M04"], 22);
assert.equal(cp562Coverage.summary.by_micro_phase["RP18.P04.M05"], 14);
assert.equal(cp562Slice.valid, true, cp562Slice.errors.join("; "));
assert.equal(cp562CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP562_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp562CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-562 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p04_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp562Descriptor)),
  "contract p04_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp562_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP562_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp562_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION)));
assert.equal(cp562Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp562Hermes.production_ready_candidate, true);
assert.equal(cp562Claude.review_packet, "C18.CP00-562.ai_legal_workflows_core_p04_workflow_permission_slice_descriptor");
assert.equal(cp562Claude.read_only, true);
assert.equal(cp562Handoff.to_pack_id, "CP00-563");
assert.equal(cp562Handoff.next_subphase_id, "RP18.P04.M05.S15");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp563Coverage.valid, true, cp563Coverage.errors.join("; "));
assert.equal(cp563Coverage.summary.unit_count, 10);
assert.equal(cp563Coverage.summary.by_micro_phase["RP18.P04.M05"], 8);
assert.equal(cp563Coverage.summary.by_micro_phase["RP18.P04.M06"], 2);
assert.equal(cp563Slice.valid, true, cp563Slice.errors.join("; "));
assert.equal(cp563CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP563_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp563CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-563 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp563Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp563_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP563_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp563_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION)));
assert.equal(cp563Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp563Hermes.production_ready_candidate, true);
assert.equal(cp563Claude.review_packet, "C18.CP00-563.ai_legal_workflows_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp563Claude.read_only, true);
assert.equal(cp563Handoff.to_pack_id, "CP00-564");
assert.equal(cp563Handoff.next_subphase_id, "RP18.P04.M06.S03");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp564Coverage.valid, true, cp564Coverage.errors.join("; "));
assert.equal(cp564Coverage.summary.unit_count, 150);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P04.M06"], 20);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P04.M07"], 22);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P04.M08"], 22);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P04.M09"], 22);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P04.M10"], 20);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P05.M00"], 10);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P05.M01"], 20);
assert.equal(cp564Coverage.summary.by_micro_phase["RP18.P05.M02"], 14);
assert.equal(cp564Slice.valid, true, cp564Slice.errors.join("; "));
assert.equal(cp564CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP564_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp564CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-564 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp564Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp564_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP564_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp564_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION)));
assert.equal(cp564Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp564Hermes.production_ready_candidate, true);
assert.equal(cp564Claude.review_packet, "C18.CP00-564.ai_legal_workflows_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp564Claude.read_only, true);
assert.equal(cp564Handoff.to_pack_id, "CP00-565");
assert.equal(cp564Handoff.next_subphase_id, "RP18.P05.M02.S15");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp565Coverage.valid, true, cp565Coverage.errors.join("; "));
assert.equal(cp565Coverage.summary.unit_count, 40);
assert.equal(cp565Coverage.summary.by_micro_phase["RP18.P05.M02"], 6);
assert.equal(cp565Coverage.summary.by_micro_phase["RP18.P05.M03"], 22);
assert.equal(cp565Coverage.summary.by_micro_phase["RP18.P05.M04"], 12);
assert.equal(cp565Slice.valid, true, cp565Slice.errors.join("; "));
assert.equal(cp565CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP565_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp565CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-565 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p05_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp565Descriptor)),
  "contract p05_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp565_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP565_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp565_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION)));
assert.equal(cp565Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp565Hermes.production_ready_candidate, true);
assert.equal(cp565Claude.review_packet, "C18.CP00-565.ai_legal_workflows_core_p05_implementation_workflow_slice_descriptor");
assert.equal(cp565Claude.read_only, true);
assert.equal(cp565Handoff.to_pack_id, "CP00-566");
assert.equal(cp565Handoff.next_subphase_id, "RP18.P05.M04.S13");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp566Coverage.valid, true, cp566Coverage.errors.join("; "));
assert.equal(cp566Coverage.summary.unit_count, 40);
assert.equal(cp566Coverage.summary.by_micro_phase["RP18.P05.M04"], 10);
assert.equal(cp566Coverage.summary.by_micro_phase["RP18.P05.M05"], 22);
assert.equal(cp566Coverage.summary.by_micro_phase["RP18.P05.M06"], 8);
assert.equal(cp566Slice.valid, true, cp566Slice.errors.join("; "));
assert.equal(cp566CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP566_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp566CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-566 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p05_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp566Descriptor)),
  "contract p05_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp566_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP566_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp566_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION)));
assert.equal(cp566Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp566Hermes.production_ready_candidate, true);
assert.equal(cp566Claude.review_packet, "C18.CP00-566.ai_legal_workflows_core_p05_workflow_permission_slice_descriptor");
assert.equal(cp566Claude.read_only, true);
assert.equal(cp566Handoff.to_pack_id, "CP00-567");
assert.equal(cp566Handoff.next_subphase_id, "RP18.P05.M06.S09");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp567Coverage.valid, true, cp567Coverage.errors.join("; "));
assert.equal(cp567Coverage.summary.unit_count, 10);
assert.equal(cp567Coverage.summary.by_micro_phase["RP18.P05.M06"], 10);
assert.equal(cp567Slice.valid, true, cp567Slice.errors.join("; "));
assert.equal(cp567CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP567_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp567CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-567 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p05_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp567Descriptor)),
  "contract p05_fixture_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp567_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP567_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp567_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION)));
assert.equal(cp567Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp567Hermes.production_ready_candidate, true);
assert.equal(cp567Claude.review_packet, "C18.CP00-567.ai_legal_workflows_core_p05_fixture_slice_descriptor");
assert.equal(cp567Claude.read_only, true);
assert.equal(cp567Handoff.to_pack_id, "CP00-568");
assert.equal(cp567Handoff.next_subphase_id, "RP18.P05.M06.S19");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp568Coverage.valid, true, cp568Coverage.errors.join("; "));
assert.equal(cp568Coverage.summary.unit_count, 150);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P05.M06"], 4);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P05.M07"], 22);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P05.M08"], 22);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P05.M09"], 22);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P05.M10"], 20);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P06.M00"], 20);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P06.M01"], 20);
assert.equal(cp568Coverage.summary.by_micro_phase["RP18.P06.M02"], 20);
assert.equal(cp568Slice.valid, true, cp568Slice.errors.join("; "));
assert.equal(cp568CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP568_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp568CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-568 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp568Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp568_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP568_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp568_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION)));
assert.equal(cp568Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp568Hermes.production_ready_candidate, true);
assert.equal(cp568Claude.review_packet, "C18.CP00-568.ai_legal_workflows_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp568Claude.read_only, true);
assert.equal(cp568Handoff.to_pack_id, "CP00-569");
assert.equal(cp568Handoff.next_subphase_id, "RP18.P06.M02.S21");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp569Coverage.valid, true, cp569Coverage.errors.join("; "));
assert.equal(cp569Coverage.summary.unit_count, 10);
assert.equal(cp569Coverage.summary.by_micro_phase["RP18.P06.M02"], 2);
assert.equal(cp569Coverage.summary.by_micro_phase["RP18.P06.M03"], 8);
assert.equal(cp569Slice.valid, true, cp569Slice.errors.join("; "));
assert.equal(cp569CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP569_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp569CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-569 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p06_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp569Descriptor)),
  "contract p06_foundation_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp569_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP569_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp569_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION)));
assert.equal(cp569Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp569Hermes.production_ready_candidate, true);
assert.equal(cp569Claude.review_packet, "C18.CP00-569.ai_legal_workflows_core_p06_foundation_slice_descriptor");
assert.equal(cp569Claude.read_only, true);
assert.equal(cp569Handoff.to_pack_id, "CP00-570");
assert.equal(cp569Handoff.next_subphase_id, "RP18.P06.M03.S09");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp570Coverage.valid, true, cp570Coverage.errors.join("; "));
assert.equal(cp570Coverage.summary.unit_count, 40);
assert.equal(cp570Coverage.summary.by_micro_phase["RP18.P06.M03"], 22);
assert.equal(cp570Coverage.summary.by_micro_phase["RP18.P06.M04"], 18);
assert.equal(cp570Slice.valid, true, cp570Slice.errors.join("; "));
assert.equal(cp570CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP570_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp570CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-570 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p06_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp570Descriptor)),
  "contract p06_implementation_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp570_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP570_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp570_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION)));
assert.equal(cp570Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp570Hermes.production_ready_candidate, true);
assert.equal(cp570Claude.review_packet, "C18.CP00-570.ai_legal_workflows_core_p06_implementation_slice_descriptor");
assert.equal(cp570Claude.read_only, true);
assert.equal(cp570Handoff.to_pack_id, "CP00-571");
assert.equal(cp570Handoff.next_subphase_id, "RP18.P06.M04.S19");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp571Coverage.valid, true, cp571Coverage.errors.join("; "));
assert.equal(cp571Coverage.summary.unit_count, 40);
assert.equal(cp571Coverage.summary.by_micro_phase["RP18.P06.M04"], 12);
assert.equal(cp571Coverage.summary.by_micro_phase["RP18.P06.M05"], 28);
assert.equal(cp571Slice.valid, true, cp571Slice.errors.join("; "));
assert.equal(cp571CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP571_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp571CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-571 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p06_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp571Descriptor)),
  "contract p06_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp571_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP571_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp571_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION)));
assert.equal(cp571Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp571Hermes.production_ready_candidate, true);
assert.equal(cp571Claude.review_packet, "C18.CP00-571.ai_legal_workflows_core_p06_workflow_permission_slice_descriptor");
assert.equal(cp571Claude.read_only, true);
assert.equal(cp571Handoff.to_pack_id, "CP00-572");
assert.equal(cp571Handoff.next_subphase_id, "RP18.P06.M05.S29");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp572Coverage.valid, true, cp572Coverage.errors.join("; "));
assert.equal(cp572Coverage.summary.unit_count, 10);
assert.equal(cp572Coverage.summary.by_micro_phase["RP18.P06.M05"], 2);
assert.equal(cp572Coverage.summary.by_micro_phase["RP18.P06.M06"], 8);
assert.equal(cp572Slice.valid, true, cp572Slice.errors.join("; "));
assert.equal(cp572CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP572_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp572CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-572 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp572Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp572_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP572_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp572_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION)));
assert.equal(cp572Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp572Hermes.production_ready_candidate, true);
assert.equal(cp572Claude.review_packet, "C18.CP00-572.ai_legal_workflows_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp572Claude.read_only, true);
assert.equal(cp572Handoff.to_pack_id, "CP00-573");
assert.equal(cp572Handoff.next_subphase_id, "RP18.P06.M06.S09");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp573Coverage.valid, true, cp573Coverage.errors.join("; "));
assert.equal(cp573Coverage.summary.unit_count, 150);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P06.M06"], 14);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P06.M07"], 30);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P06.M08"], 22);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P06.M09"], 22);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P06.M10"], 20);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P07.M00"], 20);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P07.M01"], 20);
assert.equal(cp573Coverage.summary.by_micro_phase["RP18.P07.M02"], 2);
assert.equal(cp573Slice.valid, true, cp573Slice.errors.join("; "));
assert.equal(cp573CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP573_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp573CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-573 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp573Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp573_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP573_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp573_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION)));
assert.equal(cp573Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp573Hermes.production_ready_candidate, true);
assert.equal(cp573Claude.review_packet, "C18.CP00-573.ai_legal_workflows_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp573Claude.read_only, true);
assert.equal(cp573Handoff.to_pack_id, "CP00-574");
assert.equal(cp573Handoff.next_subphase_id, "RP18.P07.M02.S03");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp574Coverage.valid, true, cp574Coverage.errors.join("; "));
assert.equal(cp574Coverage.summary.unit_count, 40);
assert.equal(cp574Coverage.summary.by_micro_phase["RP18.P07.M02"], 20);
assert.equal(cp574Coverage.summary.by_micro_phase["RP18.P07.M03"], 20);
assert.equal(cp574Slice.valid, true, cp574Slice.errors.join("; "));
assert.equal(cp574CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP574_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp574CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-574 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_contract_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp574Descriptor)),
  "contract p07_contract_implementation_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp574_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP574_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp574_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION)));
assert.equal(cp574Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp574Hermes.production_ready_candidate, true);
assert.equal(cp574Claude.review_packet, "C18.CP00-574.ai_legal_workflows_core_p07_contract_implementation_slice_descriptor");
assert.equal(cp574Claude.read_only, true);
assert.equal(cp574Handoff.to_pack_id, "CP00-575");
assert.equal(cp574Handoff.next_subphase_id, "RP18.P07.M03.S21");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp575Coverage.valid, true, cp575Coverage.errors.join("; "));
assert.equal(cp575Coverage.summary.unit_count, 40);
assert.equal(cp575Coverage.summary.by_micro_phase["RP18.P07.M03"], 10);
assert.equal(cp575Coverage.summary.by_micro_phase["RP18.P07.M04"], 30);
assert.equal(cp575Slice.valid, true, cp575Slice.errors.join("; "));
assert.equal(cp575CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP575_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp575CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-575 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp575Descriptor)),
  "contract p07_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp575_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP575_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp575_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION)));
assert.equal(cp575Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp575Hermes.production_ready_candidate, true);
assert.equal(cp575Claude.review_packet, "C18.CP00-575.ai_legal_workflows_core_p07_implementation_workflow_slice_descriptor");
assert.equal(cp575Claude.read_only, true);
assert.equal(cp575Handoff.to_pack_id, "CP00-576");
assert.equal(cp575Handoff.next_subphase_id, "RP18.P07.M05.S01");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp576Coverage.valid, true, cp576Coverage.errors.join("; "));
assert.equal(cp576Coverage.summary.unit_count, 10);
assert.equal(cp576Coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
assert.equal(cp576Slice.valid, true, cp576Slice.errors.join("; "));
assert.equal(cp576CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP576_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp576CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-576 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp576Descriptor)),
  "contract p07_permission_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp576_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP576_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp576_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION)));
assert.equal(cp576Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp576Hermes.production_ready_candidate, true);
assert.equal(cp576Claude.review_packet, "C18.CP00-576.ai_legal_workflows_core_p07_permission_slice_descriptor");
assert.equal(cp576Claude.read_only, true);
assert.equal(cp576Handoff.to_pack_id, "CP00-577");
assert.equal(cp576Handoff.next_subphase_id, "RP18.P07.M05.S11");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp577Coverage.valid, true, cp577Coverage.errors.join("; "));
assert.equal(cp577Coverage.summary.unit_count, 10);
assert.equal(cp577Coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
assert.equal(cp577Slice.valid, true, cp577Slice.errors.join("; "));
assert.equal(cp577CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP577_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp577CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-577 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_audit_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp577Descriptor)),
  "contract p07_audit_binding_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp577_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP577_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp577_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION)));
assert.equal(cp577Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp577Hermes.production_ready_candidate, true);
assert.equal(cp577Claude.review_packet, "C18.CP00-577.ai_legal_workflows_core_p07_audit_binding_slice_descriptor");
assert.equal(cp577Claude.read_only, true);
assert.equal(cp577Handoff.to_pack_id, "CP00-578");
assert.equal(cp577Handoff.next_subphase_id, "RP18.P07.M05.S21");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp578Coverage.valid, true, cp578Coverage.errors.join("; "));
assert.equal(cp578Coverage.summary.unit_count, 10);
assert.equal(cp578Coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
assert.equal(cp578Slice.valid, true, cp578Slice.errors.join("; "));
assert.equal(cp578CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP578_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp578CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-578 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_permission_audit_slice_descriptor,
  JSON.parse(JSON.stringify(cp578Descriptor)),
  "contract p07_permission_audit_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp578_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP578_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp578_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION)));
assert.equal(cp578Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp578Hermes.production_ready_candidate, true);
assert.equal(cp578Claude.review_packet, "C18.CP00-578.ai_legal_workflows_core_p07_permission_audit_slice_descriptor");
assert.equal(cp578Claude.read_only, true);
assert.equal(cp578Handoff.to_pack_id, "CP00-579");
assert.equal(cp578Handoff.next_subphase_id, "RP18.P07.M06.S01");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp579Coverage.valid, true, cp579Coverage.errors.join("; "));
assert.equal(cp579Coverage.summary.unit_count, 150);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P07.M06"], 22);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P07.M07"], 30);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P07.M08"], 22);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P07.M09"], 22);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P07.M10"], 20);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P08.M00"], 10);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P08.M01"], 20);
assert.equal(cp579Coverage.summary.by_micro_phase["RP18.P08.M02"], 4);
assert.equal(cp579Slice.valid, true, cp579Slice.errors.join("; "));
assert.equal(cp579CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP579_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp579CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-579 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp579Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp579_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP579_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp579_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION)));
assert.equal(cp579Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp579Hermes.production_ready_candidate, true);
assert.equal(cp579Claude.review_packet, "C18.CP00-579.ai_legal_workflows_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp579Claude.read_only, true);
assert.equal(cp579Handoff.to_pack_id, "CP00-580");
assert.equal(cp579Handoff.next_subphase_id, "RP18.P08.M02.S05");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp580Coverage.valid, true, cp580Coverage.errors.join("; "));
assert.equal(cp580Coverage.summary.unit_count, 150);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M02"], 16);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M03"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M04"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M05"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M06"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M07"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M08"], 22);
assert.equal(cp580Coverage.summary.by_micro_phase["RP18.P08.M09"], 2);
assert.equal(cp580Slice.valid, true, cp580Slice.errors.join("; "));
assert.equal(cp580CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP580_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp580CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-580 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p08_implementation_review_slice_descriptor,
  JSON.parse(JSON.stringify(cp580Descriptor)),
  "contract p08_implementation_review_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp580_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP580_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp580_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION)));
assert.equal(cp580Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp580Hermes.production_ready_candidate, true);
assert.equal(cp580Claude.review_packet, "C18.CP00-580.ai_legal_workflows_core_p08_implementation_review_slice_descriptor");
assert.equal(cp580Claude.read_only, true);
assert.equal(cp580Handoff.to_pack_id, "CP00-581");
assert.equal(cp580Handoff.next_subphase_id, "RP18.P08.M09.S03");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp581Coverage.valid, true, cp581Coverage.errors.join("; "));
assert.equal(cp581Coverage.summary.unit_count, 150);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P08.M09"], 20);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P08.M10"], 20);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M00"], 10);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M01"], 10);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M02"], 20);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M03"], 22);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M04"], 20);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M05"], 22);
assert.equal(cp581Coverage.summary.by_micro_phase["RP18.P09.M06"], 6);
assert.equal(cp581Slice.valid, true, cp581Slice.errors.join("; "));
assert.equal(cp581CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP581_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp581CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-581 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp581Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp581_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP581_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp581_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION)));
assert.equal(cp581Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp581Hermes.production_ready_candidate, true);
assert.equal(cp581Claude.review_packet, "C18.CP00-581.ai_legal_workflows_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp581Claude.read_only, true);
assert.equal(cp581Handoff.to_pack_id, "CP00-582");
assert.equal(cp581Handoff.next_subphase_id, "RP18.P09.M06.S07");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp582Coverage.valid, true, cp582Coverage.errors.join("; "));
assert.equal(cp582Coverage.summary.unit_count, 86);
assert.equal(cp582Coverage.summary.by_micro_phase["RP18.P09.M06"], 14);
assert.equal(cp582Coverage.summary.by_micro_phase["RP18.P09.M07"], 22);
assert.equal(cp582Coverage.summary.by_micro_phase["RP18.P09.M08"], 20);
assert.equal(cp582Coverage.summary.by_micro_phase["RP18.P09.M09"], 20);
assert.equal(cp582Coverage.summary.by_micro_phase["RP18.P09.M10"], 10);
assert.equal(cp582Slice.valid, true, cp582Slice.errors.join("; "));
assert.equal(cp582CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP582_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp582CaseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
    assert.ok(row, `CP00-582 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  aiLegalWorkflowsContract.p09_closeout_handoff_slice_descriptor,
  JSON.parse(JSON.stringify(cp582Descriptor)),
  "contract p09_closeout_handoff_slice_descriptor drift",
);
assert.deepEqual(aiLegalWorkflowsContract.cp582_requirements, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP582_REQUIREMENTS)));
assert.deepEqual(aiLegalWorkflowsContract.cp582_no_write_attestation, JSON.parse(JSON.stringify(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION)));
assert.equal(cp582Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp582Hermes.production_ready_candidate, true);
assert.equal(cp582Claude.review_packet, "C18.CP00-582.ai_legal_workflows_core_p09_closeout_handoff_slice_descriptor");
assert.equal(cp582Claude.read_only, true);
assert.equal(cp582Handoff.to_pack_id, "CP00-583");
assert.equal(cp582Handoff.next_subphase_id, "RP19.P00.M00.S01");
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(aiLegalWorkflowsContract.historical_pack_bindings));
assert.equal(aiLegalWorkflowsContract.historical_pack_bindings.at(-1).pack_id, "CP00-582");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp18:ai-legal-workflows-core:validate",
      pack_id: AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.pack_id,
      covered_units: cp582Coverage.summary.unit_count,
      cp581_units_preserved: cp581Coverage.summary.unit_count,
      cp580_units_preserved: cp580Coverage.summary.unit_count,
      cp579_units_preserved: cp579Coverage.summary.unit_count,
      cp578_units_preserved: cp578Coverage.summary.unit_count,
      cp577_units_preserved: cp577Coverage.summary.unit_count,
      cp576_units_preserved: cp576Coverage.summary.unit_count,
      cp575_units_preserved: cp575Coverage.summary.unit_count,
      cp574_units_preserved: cp574Coverage.summary.unit_count,
      cp573_units_preserved: cp573Coverage.summary.unit_count,
      cp572_units_preserved: cp572Coverage.summary.unit_count,
      cp571_units_preserved: cp571Coverage.summary.unit_count,
      cp570_units_preserved: cp570Coverage.summary.unit_count,
      cp569_units_preserved: cp569Coverage.summary.unit_count,
      cp568_units_preserved: cp568Coverage.summary.unit_count,
      cp567_units_preserved: cp567Coverage.summary.unit_count,
      cp566_units_preserved: cp566Coverage.summary.unit_count,
      cp565_units_preserved: cp565Coverage.summary.unit_count,
      cp564_units_preserved: cp564Coverage.summary.unit_count,
      cp563_units_preserved: cp563Coverage.summary.unit_count,
      cp562_units_preserved: cp562Coverage.summary.unit_count,
      cp561_units_preserved: cp561Coverage.summary.unit_count,
      cp560_units_preserved: cp560Coverage.summary.unit_count,
      cp559_units_preserved: cp559Coverage.summary.unit_count,
      cp558_units_preserved: cp558Coverage.summary.unit_count,
      cp557_units_preserved: cp557Coverage.summary.unit_count,
      cp556_units_preserved: cp556Coverage.summary.unit_count,
      cp555_units_preserved: cp555Coverage.summary.unit_count,
      cp554_units_preserved: cp554Coverage.summary.unit_count,
      cp553_units_preserved: cp553Coverage.summary.unit_count,
      cp552_units_preserved: cp552Coverage.summary.unit_count,
      cp551_units_preserved: cp551Coverage.summary.unit_count,
      program_id: AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp582Hermes.gate,
      claude_gate: aiLegalWorkflowsContract.current_pack.claude_gate,
      source_ai_governance_core_pack_id: AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp582Handoff.to_pack_id,
      production_ready_candidate: cp582Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
