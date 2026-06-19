import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const aiLegalWorkflowsContract = JSON.parse(
  readFileSync(new URL("../../../contracts/ai-legal-workflows-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp551ManifestPath = new URL("../../../docs/closeout-packs/cp00-551/manifest.json", import.meta.url);
const cp551Manifest = existsSync(cp551ManifestPath) ? JSON.parse(readFileSync(cp551ManifestPath, "utf8")) : null;
const cp551PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-551") ?? cp551Manifest?.plan_binding_snapshot;
const cp552ManifestPath = new URL("../../../docs/closeout-packs/cp00-552/manifest.json", import.meta.url);
const cp552Manifest = existsSync(cp552ManifestPath) ? JSON.parse(readFileSync(cp552ManifestPath, "utf8")) : null;
const cp552PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-552") ?? cp552Manifest?.plan_binding_snapshot;
const cp553ManifestPath = new URL("../../../docs/closeout-packs/cp00-553/manifest.json", import.meta.url);
const cp553Manifest = existsSync(cp553ManifestPath) ? JSON.parse(readFileSync(cp553ManifestPath, "utf8")) : null;
const cp553PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-553") ?? cp553Manifest?.plan_binding_snapshot;
const cp554ManifestPath = new URL("../../../docs/closeout-packs/cp00-554/manifest.json", import.meta.url);
const cp554Manifest = existsSync(cp554ManifestPath) ? JSON.parse(readFileSync(cp554ManifestPath, "utf8")) : null;
const cp554PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-554") ?? cp554Manifest?.plan_binding_snapshot;
const cp555ManifestPath = new URL("../../../docs/closeout-packs/cp00-555/manifest.json", import.meta.url);
const cp555Manifest = existsSync(cp555ManifestPath) ? JSON.parse(readFileSync(cp555ManifestPath, "utf8")) : null;
const cp555PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-555") ?? cp555Manifest?.plan_binding_snapshot;
const cp556ManifestPath = new URL("../../../docs/closeout-packs/cp00-556/manifest.json", import.meta.url);
const cp556Manifest = existsSync(cp556ManifestPath) ? JSON.parse(readFileSync(cp556ManifestPath, "utf8")) : null;
const cp556PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-556") ?? cp556Manifest?.plan_binding_snapshot;
const cp557ManifestPath = new URL("../../../docs/closeout-packs/cp00-557/manifest.json", import.meta.url);
const cp557Manifest = existsSync(cp557ManifestPath) ? JSON.parse(readFileSync(cp557ManifestPath, "utf8")) : null;
const cp557PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-557") ?? cp557Manifest?.plan_binding_snapshot;
const cp558ManifestPath = new URL("../../../docs/closeout-packs/cp00-558/manifest.json", import.meta.url);
const cp558Manifest = existsSync(cp558ManifestPath) ? JSON.parse(readFileSync(cp558ManifestPath, "utf8")) : null;
const cp558PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-558") ?? cp558Manifest?.plan_binding_snapshot;
const cp559ManifestPath = new URL("../../../docs/closeout-packs/cp00-559/manifest.json", import.meta.url);
const cp559Manifest = existsSync(cp559ManifestPath) ? JSON.parse(readFileSync(cp559ManifestPath, "utf8")) : null;
const cp559PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-559") ?? cp559Manifest?.plan_binding_snapshot;
const cp560ManifestPath = new URL("../../../docs/closeout-packs/cp00-560/manifest.json", import.meta.url);
const cp560Manifest = existsSync(cp560ManifestPath) ? JSON.parse(readFileSync(cp560ManifestPath, "utf8")) : null;
const cp560PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-560") ?? cp560Manifest?.plan_binding_snapshot;
const cp561ManifestPath = new URL("../../../docs/closeout-packs/cp00-561/manifest.json", import.meta.url);
const cp561Manifest = existsSync(cp561ManifestPath) ? JSON.parse(readFileSync(cp561ManifestPath, "utf8")) : null;
const cp561PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-561") ?? cp561Manifest?.plan_binding_snapshot;
const cp562ManifestPath = new URL("../../../docs/closeout-packs/cp00-562/manifest.json", import.meta.url);
const cp562Manifest = existsSync(cp562ManifestPath) ? JSON.parse(readFileSync(cp562ManifestPath, "utf8")) : null;
const cp562PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-562") ?? cp562Manifest?.plan_binding_snapshot;
const cp563ManifestPath = new URL("../../../docs/closeout-packs/cp00-563/manifest.json", import.meta.url);
const cp563Manifest = existsSync(cp563ManifestPath) ? JSON.parse(readFileSync(cp563ManifestPath, "utf8")) : null;
const cp563PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-563") ?? cp563Manifest?.plan_binding_snapshot;
const cp564ManifestPath = new URL("../../../docs/closeout-packs/cp00-564/manifest.json", import.meta.url);
const cp564Manifest = existsSync(cp564ManifestPath) ? JSON.parse(readFileSync(cp564ManifestPath, "utf8")) : null;
const cp564PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-564") ?? cp564Manifest?.plan_binding_snapshot;
const cp565ManifestPath = new URL("../../../docs/closeout-packs/cp00-565/manifest.json", import.meta.url);
const cp565Manifest = existsSync(cp565ManifestPath) ? JSON.parse(readFileSync(cp565ManifestPath, "utf8")) : null;
const cp565PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-565") ?? cp565Manifest?.plan_binding_snapshot;
const cp566ManifestPath = new URL("../../../docs/closeout-packs/cp00-566/manifest.json", import.meta.url);
const cp566Manifest = existsSync(cp566ManifestPath) ? JSON.parse(readFileSync(cp566ManifestPath, "utf8")) : null;
const cp566PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-566") ?? cp566Manifest?.plan_binding_snapshot;
const cp567ManifestPath = new URL("../../../docs/closeout-packs/cp00-567/manifest.json", import.meta.url);
const cp567Manifest = existsSync(cp567ManifestPath) ? JSON.parse(readFileSync(cp567ManifestPath, "utf8")) : null;
const cp567PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-567") ?? cp567Manifest?.plan_binding_snapshot;
const cp568ManifestPath = new URL("../../../docs/closeout-packs/cp00-568/manifest.json", import.meta.url);
const cp568Manifest = existsSync(cp568ManifestPath) ? JSON.parse(readFileSync(cp568ManifestPath, "utf8")) : null;
const cp568PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-568") ?? cp568Manifest?.plan_binding_snapshot;
const cp569ManifestPath = new URL("../../../docs/closeout-packs/cp00-569/manifest.json", import.meta.url);
const cp569Manifest = existsSync(cp569ManifestPath) ? JSON.parse(readFileSync(cp569ManifestPath, "utf8")) : null;
const cp569PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-569") ?? cp569Manifest?.plan_binding_snapshot;
const cp570ManifestPath = new URL("../../../docs/closeout-packs/cp00-570/manifest.json", import.meta.url);
const cp570Manifest = existsSync(cp570ManifestPath) ? JSON.parse(readFileSync(cp570ManifestPath, "utf8")) : null;
const cp570PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-570") ?? cp570Manifest?.plan_binding_snapshot;
const cp571ManifestPath = new URL("../../../docs/closeout-packs/cp00-571/manifest.json", import.meta.url);
const cp571Manifest = existsSync(cp571ManifestPath) ? JSON.parse(readFileSync(cp571ManifestPath, "utf8")) : null;
const cp571PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-571") ?? cp571Manifest?.plan_binding_snapshot;
const cp572ManifestPath = new URL("../../../docs/closeout-packs/cp00-572/manifest.json", import.meta.url);
const cp572Manifest = existsSync(cp572ManifestPath) ? JSON.parse(readFileSync(cp572ManifestPath, "utf8")) : null;
const cp572PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-572") ?? cp572Manifest?.plan_binding_snapshot;
const cp573ManifestPath = new URL("../../../docs/closeout-packs/cp00-573/manifest.json", import.meta.url);
const cp573Manifest = existsSync(cp573ManifestPath) ? JSON.parse(readFileSync(cp573ManifestPath, "utf8")) : null;
const cp573PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-573") ?? cp573Manifest?.plan_binding_snapshot;
const cp574ManifestPath = new URL("../../../docs/closeout-packs/cp00-574/manifest.json", import.meta.url);
const cp574Manifest = existsSync(cp574ManifestPath) ? JSON.parse(readFileSync(cp574ManifestPath, "utf8")) : null;
const cp574PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-574") ?? cp574Manifest?.plan_binding_snapshot;
const cp575ManifestPath = new URL("../../../docs/closeout-packs/cp00-575/manifest.json", import.meta.url);
const cp575Manifest = existsSync(cp575ManifestPath) ? JSON.parse(readFileSync(cp575ManifestPath, "utf8")) : null;
const cp575PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-575") ?? cp575Manifest?.plan_binding_snapshot;
const cp576ManifestPath = new URL("../../../docs/closeout-packs/cp00-576/manifest.json", import.meta.url);
const cp576Manifest = existsSync(cp576ManifestPath) ? JSON.parse(readFileSync(cp576ManifestPath, "utf8")) : null;
const cp576PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-576") ?? cp576Manifest?.plan_binding_snapshot;
const cp577ManifestPath = new URL("../../../docs/closeout-packs/cp00-577/manifest.json", import.meta.url);
const cp577Manifest = existsSync(cp577ManifestPath) ? JSON.parse(readFileSync(cp577ManifestPath, "utf8")) : null;
const cp577PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-577") ?? cp577Manifest?.plan_binding_snapshot;
const cp578ManifestPath = new URL("../../../docs/closeout-packs/cp00-578/manifest.json", import.meta.url);
const cp578Manifest = existsSync(cp578ManifestPath) ? JSON.parse(readFileSync(cp578ManifestPath, "utf8")) : null;
const cp578PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-578") ?? cp578Manifest?.plan_binding_snapshot;
const cp579ManifestPath = new URL("../../../docs/closeout-packs/cp00-579/manifest.json", import.meta.url);
const cp579Manifest = existsSync(cp579ManifestPath) ? JSON.parse(readFileSync(cp579ManifestPath, "utf8")) : null;
const cp579PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-579") ?? cp579Manifest?.plan_binding_snapshot;
const cp580ManifestPath = new URL("../../../docs/closeout-packs/cp00-580/manifest.json", import.meta.url);
const cp580Manifest = existsSync(cp580ManifestPath) ? JSON.parse(readFileSync(cp580ManifestPath, "utf8")) : null;
const cp580PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-580") ?? cp580Manifest?.plan_binding_snapshot;
const cp581ManifestPath = new URL("../../../docs/closeout-packs/cp00-581/manifest.json", import.meta.url);
const cp581Manifest = existsSync(cp581ManifestPath) ? JSON.parse(readFileSync(cp581ManifestPath, "utf8")) : null;
const cp581PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-581") ?? cp581Manifest?.plan_binding_snapshot;
const cp582ManifestPath = new URL("../../../docs/closeout-packs/cp00-582/manifest.json", import.meta.url);
const cp582Manifest = existsSync(cp582ManifestPath) ? JSON.parse(readFileSync(cp582ManifestPath, "utf8")) : null;
const cp582PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-582") ?? cp582Manifest?.plan_binding_snapshot;

test("RP18 program contract pins the AI Legal Workflows descriptor-only bootstrap", () => {
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.program_id, "RP18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.program_title, "AI Legal Workflows");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP17");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.hermes_gate, "H18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.claude_gate, "C18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-551", "CP00-552", "CP00-553", "CP00-554", "CP00-555", "CP00-556", "CP00-557", "CP00-558", "CP00-559", "CP00-560", "CP00-561", "CP00-562", "CP00-563", "CP00-564", "CP00-565", "CP00-566", "CP00-567", "CP00-568", "CP00-569", "CP00-570", "CP00-571", "CP00-572", "CP00-573", "CP00-574", "CP00-575", "CP00-576", "CP00-577", "CP00-578", "CP00-579", "CP00-580", "CP00-581", "CP00-582"].includes(aiLegalWorkflowsContract.current_pack.pack_id));
  assert.equal(aiLegalWorkflowsContract.program.program_id, "RP18");
});

test("CP00-551 plan binding covers the planned 150 RP18 scope and model foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp551Coverage(cp551PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.pack_id, "CP00-551");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.range, "RP18.P00.M00.S01-RP18.P01.M02.S08");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.upstream_pack_id, "CP00-550");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_PACK_BINDING.next_pack_id, "CP00-552");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP18.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP18.P01"], 28);
  assert.equal(Object.keys(AI_LEGAL_WORKFLOWS_CORE_CP551_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-551 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp551ScopeContractFoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP551_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP18.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.ai_legal_workflows_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m00 = caseSet.sections["RP18.P01.M00"].rows;
  assert.equal(p01m00.state_transition_map.writes_state_transition, false);
  assert.equal(p01m00.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-551 evidence packets and handoff preserve AI legal workflows bootstrap authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp551ScopeContractFoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp551HermesEvidencePacket(cp551PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp551ClaudeReviewPacket(cp551PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp551CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-551-to-CP00-552");
  assert.equal(handoff.next_subphase_id, "RP18.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_scope_contract_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP551_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-552 plan binding covers the planned 40 RP18 p01 implementation slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp552Coverage(cp552PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.pack_id, "CP00-552");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.range, "RP18.P01.M02.S09-RP18.P01.M04.S06");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.upstream_pack_id, "CP00-551");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_PACK_BINDING.next_pack_id, "CP00-553");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M02"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M04"], 6);
});

test("CP00-552 p01 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp552P01ImplementationSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP552_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP18.P01.M03"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-552 evidence packets and handoff preserve p01 implementation slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp552P01ImplementationSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp552HermesEvidencePacket(cp552PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp552ClaudeReviewPacket(cp552PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp552CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-552-to-CP00-553");
  assert.equal(handoff.next_subphase_id, "RP18.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p01_implementation_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP552_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-553 plan binding covers the planned 40 RP18 p01 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp553Coverage(cp553PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.pack_id, "CP00-553");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.range, "RP18.P01.M04.S07-RP18.P01.M06.S04");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.upstream_pack_id, "CP00-552");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_PACK_BINDING.next_pack_id, "CP00-554");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M04"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M06"], 4);
});

test("CP00-553 p01 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP553_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP18.P01.M05"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-553 evidence packets and handoff preserve p01 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp553P01WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp553HermesEvidencePacket(cp553PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp553ClaudeReviewPacket(cp553PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp553CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-553-to-CP00-554");
  assert.equal(handoff.next_subphase_id, "RP18.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p01_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP553_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-554 plan binding covers the planned 150 RP18 p01 closeout p02 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp554Coverage(cp554PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.pack_id, "CP00-554");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.range, "RP18.P01.M06.S05-RP18.P02.M02.S22");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.upstream_pack_id, "CP00-553");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_PACK_BINDING.next_pack_id, "CP00-555");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P01.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M02"], 22);
});

test("CP00-554 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP554_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP18.P01.M07"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-554 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp554P01CloseoutP02FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp554HermesEvidencePacket(cp554PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp554ClaudeReviewPacket(cp554PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp554CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-554-to-CP00-555");
  assert.equal(handoff.next_subphase_id, "RP18.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP554_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-555 plan binding covers the planned 40 RP18 p02 implementation slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp555Coverage(cp555PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.pack_id, "CP00-555");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.range, "RP18.P02.M03.S01-RP18.P02.M04.S10");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.upstream_pack_id, "CP00-554");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_PACK_BINDING.next_pack_id, "CP00-556");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M03"], 30);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
});

test("CP00-555 p02 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp555P02ImplementationSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP555_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-555 evidence packets and handoff preserve p02 implementation slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp555P02ImplementationSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp555HermesEvidencePacket(cp555PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp555ClaudeReviewPacket(cp555PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp555CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-555-to-CP00-556");
  assert.equal(handoff.next_subphase_id, "RP18.P02.M04.S11");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p02_implementation_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP555_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-556 plan binding covers the planned 10 RP18 p02 workflow slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp556Coverage(cp556PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.pack_id, "CP00-556");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.range, "RP18.P02.M04.S11-RP18.P02.M04.S20");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.upstream_pack_id, "CP00-555");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_PACK_BINDING.next_pack_id, "CP00-557");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
});

test("CP00-556 p02 workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp556P02WorkflowSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP556_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-556 evidence packets and handoff preserve p02 workflow slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp556P02WorkflowSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp556HermesEvidencePacket(cp556PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp556ClaudeReviewPacket(cp556PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp556CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-556-to-CP00-557");
  assert.equal(handoff.next_subphase_id, "RP18.P02.M04.S21");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p02_workflow_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP556_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-557 plan binding covers the planned 40 RP18 p02 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp557Coverage(cp557PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.pack_id, "CP00-557");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.range, "RP18.P02.M04.S21-RP18.P02.M05.S30");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.upstream_pack_id, "CP00-556");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_PACK_BINDING.next_pack_id, "CP00-558");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M05"], 30);
});

test("CP00-557 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP557_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-557 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp557P02WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp557HermesEvidencePacket(cp557PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp557ClaudeReviewPacket(cp557PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp557CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-557-to-CP00-558");
  assert.equal(handoff.next_subphase_id, "RP18.P02.M06.S01");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP557_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-558 plan binding covers the planned 150 RP18 p02 closeout p03 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp558Coverage(cp558PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.pack_id, "CP00-558");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.range, "RP18.P02.M06.S01-RP18.P03.M02.S14");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.upstream_pack_id, "CP00-557");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_PACK_BINDING.next_pack_id, "CP00-559");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M07"], 30);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P02.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M02"], 14);
});

test("CP00-558 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP558_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-558 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp558P02CloseoutP03FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp558HermesEvidencePacket(cp558PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp558ClaudeReviewPacket(cp558PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp558CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-558-to-CP00-559");
  assert.equal(handoff.next_subphase_id, "RP18.P03.M02.S15");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP558_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-559 plan binding covers the planned 40 RP18 p03 implementation workflow slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp559Coverage(cp559PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.pack_id, "CP00-559");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.range, "RP18.P03.M02.S15-RP18.P03.M04.S12");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.upstream_pack_id, "CP00-558");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_PACK_BINDING.next_pack_id, "CP00-560");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M04"], 12);
});

test("CP00-559 p03 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP559_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-559 evidence packets and handoff preserve p03 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp559P03ImplementationWorkflowSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp559HermesEvidencePacket(cp559PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp559ClaudeReviewPacket(cp559PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp559CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-559-to-CP00-560");
  assert.equal(handoff.next_subphase_id, "RP18.P03.M04.S13");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p03_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP559_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-560 plan binding covers the planned 40 RP18 p03 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp560Coverage(cp560PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.pack_id, "CP00-560");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.range, "RP18.P03.M04.S13-RP18.P03.M06.S10");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.upstream_pack_id, "CP00-559");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_PACK_BINDING.next_pack_id, "CP00-561");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M04"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M06"], 10);
});

test("CP00-560 p03 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP560_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-560 evidence packets and handoff preserve p03 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp560P03WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp560HermesEvidencePacket(cp560PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp560ClaudeReviewPacket(cp560PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp560CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-560-to-CP00-561");
  assert.equal(handoff.next_subphase_id, "RP18.P03.M06.S11");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p03_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP560_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-561 plan binding covers the planned 150 RP18 p03 closeout p04 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp561Coverage(cp561PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.pack_id, "CP00-561");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.range, "RP18.P03.M06.S11-RP18.P04.M03.S18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.upstream_pack_id, "CP00-560");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_PACK_BINDING.next_pack_id, "CP00-562");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P03.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M03"], 18);
});

test("CP00-561 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP561_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-561 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp561P03CloseoutP04FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp561HermesEvidencePacket(cp561PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp561ClaudeReviewPacket(cp561PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp561CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-561-to-CP00-562");
  assert.equal(handoff.next_subphase_id, "RP18.P04.M03.S19");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP561_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-562 plan binding covers the planned 40 RP18 p04 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp562Coverage(cp562PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.pack_id, "CP00-562");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.range, "RP18.P04.M03.S19-RP18.P04.M05.S14");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.upstream_pack_id, "CP00-561");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_PACK_BINDING.next_pack_id, "CP00-563");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M03"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M05"], 14);
});

test("CP00-562 p04 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP562_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-562 evidence packets and handoff preserve p04 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp562P04WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp562HermesEvidencePacket(cp562PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp562ClaudeReviewPacket(cp562PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp562CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-562-to-CP00-563");
  assert.equal(handoff.next_subphase_id, "RP18.P04.M05.S15");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p04_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP562_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-563 plan binding covers the planned 10 RP18 p04 permission fixture slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp563Coverage(cp563PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.pack_id, "CP00-563");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.range, "RP18.P04.M05.S15-RP18.P04.M06.S02");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.upstream_pack_id, "CP00-562");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_PACK_BINDING.next_pack_id, "CP00-564");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M06"], 2);
});

test("CP00-563 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP563_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-563 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp563P04PermissionFixtureSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp563HermesEvidencePacket(cp563PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp563ClaudeReviewPacket(cp563PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp563CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-563-to-CP00-564");
  assert.equal(handoff.next_subphase_id, "RP18.P04.M06.S03");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP563_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-564 plan binding covers the planned 150 RP18 p04 closeout p05 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp564Coverage(cp564PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.pack_id, "CP00-564");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.range, "RP18.P04.M06.S03-RP18.P05.M02.S14");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.upstream_pack_id, "CP00-563");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_PACK_BINDING.next_pack_id, "CP00-565");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P04.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M02"], 14);
});

test("CP00-564 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP564_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-564 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp564P04CloseoutP05FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp564HermesEvidencePacket(cp564PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp564ClaudeReviewPacket(cp564PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp564CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-564-to-CP00-565");
  assert.equal(handoff.next_subphase_id, "RP18.P05.M02.S15");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP564_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-565 plan binding covers the planned 40 RP18 p05 implementation workflow slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp565Coverage(cp565PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.pack_id, "CP00-565");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.range, "RP18.P05.M02.S15-RP18.P05.M04.S12");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.upstream_pack_id, "CP00-564");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_PACK_BINDING.next_pack_id, "CP00-566");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M04"], 12);
});

test("CP00-565 p05 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP565_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-565 evidence packets and handoff preserve p05 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp565P05ImplementationWorkflowSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp565HermesEvidencePacket(cp565PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp565ClaudeReviewPacket(cp565PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp565CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-565-to-CP00-566");
  assert.equal(handoff.next_subphase_id, "RP18.P05.M04.S13");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p05_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP565_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-566 plan binding covers the planned 40 RP18 p05 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp566Coverage(cp566PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.pack_id, "CP00-566");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.range, "RP18.P05.M04.S13-RP18.P05.M06.S08");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.upstream_pack_id, "CP00-565");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_PACK_BINDING.next_pack_id, "CP00-567");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M06"], 8);
});

test("CP00-566 p05 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP566_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-566 evidence packets and handoff preserve p05 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp566P05WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp566HermesEvidencePacket(cp566PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp566ClaudeReviewPacket(cp566PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp566CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-566-to-CP00-567");
  assert.equal(handoff.next_subphase_id, "RP18.P05.M06.S09");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p05_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP566_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-567 plan binding covers the planned 10 RP18 p05 fixture slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp567Coverage(cp567PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.pack_id, "CP00-567");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.range, "RP18.P05.M06.S09-RP18.P05.M06.S18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.upstream_pack_id, "CP00-566");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_PACK_BINDING.next_pack_id, "CP00-568");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M06"], 10);
});

test("CP00-567 p05 fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp567P05FixtureSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP567_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-567 evidence packets and handoff preserve p05 fixture slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp567P05FixtureSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp567HermesEvidencePacket(cp567PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp567ClaudeReviewPacket(cp567PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp567CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-567-to-CP00-568");
  assert.equal(handoff.next_subphase_id, "RP18.P05.M06.S19");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p05_fixture_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP567_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-568 plan binding covers the planned 150 RP18 p05 closeout p06 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp568Coverage(cp568PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.pack_id, "CP00-568");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.range, "RP18.P05.M06.S19-RP18.P06.M02.S20");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.upstream_pack_id, "CP00-567");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_PACK_BINDING.next_pack_id, "CP00-569");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M06"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P05.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M02"], 20);
});

test("CP00-568 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP568_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-568 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp568P05CloseoutP06FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp568HermesEvidencePacket(cp568PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp568ClaudeReviewPacket(cp568PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp568CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-568-to-CP00-569");
  assert.equal(handoff.next_subphase_id, "RP18.P06.M02.S21");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP568_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-569 plan binding covers the planned 10 RP18 p06 foundation slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp569Coverage(cp569PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.pack_id, "CP00-569");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.range, "RP18.P06.M02.S21-RP18.P06.M03.S08");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.upstream_pack_id, "CP00-568");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_PACK_BINDING.next_pack_id, "CP00-570");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M02"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M03"], 8);
});

test("CP00-569 p06 foundation slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp569P06FoundationSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP569_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-569 evidence packets and handoff preserve p06 foundation slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp569P06FoundationSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp569HermesEvidencePacket(cp569PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp569ClaudeReviewPacket(cp569PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp569CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-569-to-CP00-570");
  assert.equal(handoff.next_subphase_id, "RP18.P06.M03.S09");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p06_foundation_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP569_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-570 plan binding covers the planned 40 RP18 p06 implementation slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp570Coverage(cp570PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.pack_id, "CP00-570");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.range, "RP18.P06.M03.S09-RP18.P06.M04.S18");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.upstream_pack_id, "CP00-569");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_PACK_BINDING.next_pack_id, "CP00-571");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M04"], 18);
});

test("CP00-570 p06 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp570P06ImplementationSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP570_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-570 evidence packets and handoff preserve p06 implementation slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp570P06ImplementationSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp570HermesEvidencePacket(cp570PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp570ClaudeReviewPacket(cp570PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp570CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-570-to-CP00-571");
  assert.equal(handoff.next_subphase_id, "RP18.P06.M04.S19");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p06_implementation_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP570_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-571 plan binding covers the planned 40 RP18 p06 workflow permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp571Coverage(cp571PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.pack_id, "CP00-571");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.range, "RP18.P06.M04.S19-RP18.P06.M05.S28");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.upstream_pack_id, "CP00-570");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_PACK_BINDING.next_pack_id, "CP00-572");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M04"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M05"], 28);
});

test("CP00-571 p06 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP571_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-571 evidence packets and handoff preserve p06 workflow permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp571P06WorkflowPermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp571HermesEvidencePacket(cp571PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp571ClaudeReviewPacket(cp571PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp571CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-571-to-CP00-572");
  assert.equal(handoff.next_subphase_id, "RP18.P06.M05.S29");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p06_workflow_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP571_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-572 plan binding covers the planned 10 RP18 p06 permission fixture slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp572Coverage(cp572PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.pack_id, "CP00-572");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.range, "RP18.P06.M05.S29-RP18.P06.M06.S08");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.upstream_pack_id, "CP00-571");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_PACK_BINDING.next_pack_id, "CP00-573");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M06"], 8);
});

test("CP00-572 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP572_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-572 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp572P06PermissionFixtureSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp572HermesEvidencePacket(cp572PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp572ClaudeReviewPacket(cp572PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp572CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-572-to-CP00-573");
  assert.equal(handoff.next_subphase_id, "RP18.P06.M06.S09");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP572_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-573 plan binding covers the planned 150 RP18 p06 closeout p07 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp573Coverage(cp573PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.pack_id, "CP00-573");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.range, "RP18.P06.M06.S09-RP18.P07.M02.S02");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.upstream_pack_id, "CP00-572");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_PACK_BINDING.next_pack_id, "CP00-574");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M07"], 30);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P06.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M02"], 2);
});

test("CP00-573 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP573_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-573 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp573P06CloseoutP07FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp573HermesEvidencePacket(cp573PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp573ClaudeReviewPacket(cp573PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp573CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-573-to-CP00-574");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M02.S03");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP573_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-574 plan binding covers the planned 40 RP18 p07 contract implementation slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp574Coverage(cp574PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.pack_id, "CP00-574");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.range, "RP18.P07.M02.S03-RP18.P07.M03.S20");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.upstream_pack_id, "CP00-573");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_PACK_BINDING.next_pack_id, "CP00-575");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M03"], 20);
});

test("CP00-574 p07 contract implementation slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP574_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-574 evidence packets and handoff preserve p07 contract implementation slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp574P07ContractImplementationSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp574HermesEvidencePacket(cp574PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp574ClaudeReviewPacket(cp574PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp574CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-574-to-CP00-575");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M03.S21");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_contract_implementation_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP574_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-575 plan binding covers the planned 40 RP18 p07 implementation workflow slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp575Coverage(cp575PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.pack_id, "CP00-575");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.risk_class, "B");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.unit_count, 40);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.range, "RP18.P07.M03.S21-RP18.P07.M04.S30");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.upstream_pack_id, "CP00-574");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_PACK_BINDING.next_pack_id, "CP00-576");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M03"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M04"], 30);
});

test("CP00-575 p07 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP575_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-575 evidence packets and handoff preserve p07 implementation workflow slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp575P07ImplementationWorkflowSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp575HermesEvidencePacket(cp575PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp575ClaudeReviewPacket(cp575PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp575CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-575-to-CP00-576");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M05.S01");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_implementation_workflow_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP575_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-576 plan binding covers the planned 10 RP18 p07 permission slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp576Coverage(cp576PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.pack_id, "CP00-576");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.range, "RP18.P07.M05.S01-RP18.P07.M05.S10");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.upstream_pack_id, "CP00-575");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_PACK_BINDING.next_pack_id, "CP00-577");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
});

test("CP00-576 p07 permission slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp576P07PermissionSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP576_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-576 evidence packets and handoff preserve p07 permission slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp576P07PermissionSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp576HermesEvidencePacket(cp576PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp576ClaudeReviewPacket(cp576PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp576CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-576-to-CP00-577");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M05.S11");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_permission_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP576_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-577 plan binding covers the planned 10 RP18 p07 audit binding slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp577Coverage(cp577PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.pack_id, "CP00-577");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.range, "RP18.P07.M05.S11-RP18.P07.M05.S20");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.upstream_pack_id, "CP00-576");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_PACK_BINDING.next_pack_id, "CP00-578");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
});

test("CP00-577 p07 audit binding slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp577P07AuditBindingSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP577_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-577 evidence packets and handoff preserve p07 audit binding slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp577P07AuditBindingSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp577HermesEvidencePacket(cp577PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp577ClaudeReviewPacket(cp577PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp577CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-577-to-CP00-578");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M05.S21");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_audit_binding_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP577_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-578 plan binding covers the planned 10 RP18 p07 permission audit slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp578Coverage(cp578PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.pack_id, "CP00-578");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.risk_class, "A");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.unit_count, 10);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.range, "RP18.P07.M05.S21-RP18.P07.M05.S30");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.upstream_pack_id, "CP00-577");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_PACK_BINDING.next_pack_id, "CP00-579");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M05"], 10);
});

test("CP00-578 p07 permission audit slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP578_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-578 evidence packets and handoff preserve p07 permission audit slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp578P07PermissionAuditSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp578HermesEvidencePacket(cp578PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp578ClaudeReviewPacket(cp578PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp578CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-578-to-CP00-579");
  assert.equal(handoff.next_subphase_id, "RP18.P07.M06.S01");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_permission_audit_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP578_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-579 plan binding covers the planned 150 RP18 p07 closeout p08 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp579Coverage(cp579PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.pack_id, "CP00-579");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.range, "RP18.P07.M06.S01-RP18.P08.M02.S04");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.upstream_pack_id, "CP00-578");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_PACK_BINDING.next_pack_id, "CP00-580");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M07"], 30);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P07.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M02"], 4);
});

test("CP00-579 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP579_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-579 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp579P07CloseoutP08FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp579HermesEvidencePacket(cp579PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp579ClaudeReviewPacket(cp579PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp579CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-579-to-CP00-580");
  assert.equal(handoff.next_subphase_id, "RP18.P08.M02.S05");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP579_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-580 plan binding covers the planned 150 RP18 p08 implementation review slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp580Coverage(cp580PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.pack_id, "CP00-580");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.range, "RP18.P08.M02.S05-RP18.P08.M09.S02");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.upstream_pack_id, "CP00-579");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_PACK_BINDING.next_pack_id, "CP00-581");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M02"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M09"], 2);
});

test("CP00-580 p08 implementation review slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP580_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-580 evidence packets and handoff preserve p08 implementation review slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp580P08ImplementationReviewSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp580HermesEvidencePacket(cp580PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp580ClaudeReviewPacket(cp580PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp580CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-580-to-CP00-581");
  assert.equal(handoff.next_subphase_id, "RP18.P08.M09.S03");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p08_implementation_review_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP580_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-581 plan binding covers the planned 150 RP18 p08 closeout p09 foundation units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp581Coverage(cp581PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.pack_id, "CP00-581");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.unit_count, 150);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.range, "RP18.P08.M09.S03-RP18.P09.M06.S06");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.upstream_pack_id, "CP00-580");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_PACK_BINDING.next_pack_id, "CP00-582");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P08.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M06"], 6);
});

test("CP00-581 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP581_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-581 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp581P08CloseoutP09FoundationDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp581HermesEvidencePacket(cp581PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp581ClaudeReviewPacket(cp581PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp581CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-581-to-CP00-582");
  assert.equal(handoff.next_subphase_id, "RP18.P09.M06.S07");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP581_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-582 plan binding covers the planned 86 RP18 p09 closeout handoff slice units", () => {
  const coverage = validateAiLegalWorkflowsCoreCp582Coverage(cp582PlanPack);

  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.pack_id, "CP00-582");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.risk_class, "C");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.unit_count, 86);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.range, "RP18.P09.M06.S07-RP18.P09.M10.S10");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.upstream_pack_id, "CP00-581");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_PACK_BINDING.next_pack_id, "CP00-583");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 86);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP18.P09.M10"], 10);
});

test("CP00-582 p09 closeout handoff slice rows stay descriptor-only", () => {
  const caseSet = createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceCaseSet();
  const descriptor = createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor();
  const validation = validateAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor(descriptor, aiLegalWorkflowsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(AI_LEGAL_WORKFLOWS_CORE_CP582_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[aiLegalWorkflowsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-582 evidence packets and handoff preserve p09 closeout handoff slice authority boundaries", () => {
  const descriptor = createAiLegalWorkflowsCoreCp582P09CloseoutHandoffSliceDescriptor();
  const hermes = createAiLegalWorkflowsCoreCp582HermesEvidencePacket(cp582PlanPack, aiLegalWorkflowsContract, descriptor);
  const claude = createAiLegalWorkflowsCoreCp582ClaudeReviewPacket(cp582PlanPack);
  const handoff = createAiLegalWorkflowsCoreCp582CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H18");
  assert.equal(claude.gate, "C18");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-582-to-CP00-583");
  assert.equal(handoff.next_subphase_id, "RP19.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "ai_legal_workflows_core_p09_closeout_handoff_slice_descriptor_verified");
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(AI_LEGAL_WORKFLOWS_CORE_CP582_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
