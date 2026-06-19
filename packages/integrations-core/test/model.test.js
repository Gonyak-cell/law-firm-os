import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES,
  EXTERNAL_INTEGRATIONS_I_PROGRAM_CONTRACT,
  createExternalIntegrationsICp666ClaudeReviewPacket,
  createExternalIntegrationsICp666CloseoutHandoff,
  createExternalIntegrationsICp666HermesEvidencePacket,
  createExternalIntegrationsICp666ScopeDomainFoundationDescriptor,
  createExternalIntegrationsICp667ClaudeReviewPacket,
  createExternalIntegrationsICp667CloseoutHandoff,
  createExternalIntegrationsICp667DomainModelContinuationDescriptor,
  createExternalIntegrationsICp667HermesEvidencePacket,
  createExternalIntegrationsICp668ClaudeReviewPacket,
  createExternalIntegrationsICp668CloseoutHandoff,
  createExternalIntegrationsICp668HermesEvidencePacket,
  createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor,
  createExternalIntegrationsICp669ClaudeReviewPacket,
  createExternalIntegrationsICp669CloseoutHandoff,
  createExternalIntegrationsICp669HermesEvidencePacket,
  createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor,
  createExternalIntegrationsICp670ClaudeReviewPacket,
  createExternalIntegrationsICp670CloseoutHandoff,
  createExternalIntegrationsICp670HermesEvidencePacket,
  createExternalIntegrationsICp670ServiceImplementationSliceDescriptor,
  createExternalIntegrationsICp671ClaudeReviewPacket,
  createExternalIntegrationsICp671CloseoutHandoff,
  createExternalIntegrationsICp671HermesEvidencePacket,
  createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor,
  createExternalIntegrationsICp672ClaudeReviewPacket,
  createExternalIntegrationsICp672CloseoutHandoff,
  createExternalIntegrationsICp672HermesEvidencePacket,
  createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor,
  createExternalIntegrationsICp673ClaudeReviewPacket,
  createExternalIntegrationsICp673CloseoutHandoff,
  createExternalIntegrationsICp673HermesEvidencePacket,
  createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor,
  createExternalIntegrationsICp674ClaudeReviewPacket,
  createExternalIntegrationsICp674CloseoutHandoff,
  createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor,
  createExternalIntegrationsICp674HermesEvidencePacket,
  createExternalIntegrationsICp675ClaudeReviewPacket,
  createExternalIntegrationsICp675CloseoutHandoff,
  createExternalIntegrationsICp675HermesEvidencePacket,
  createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor,
  createExternalIntegrationsICp676ClaudeReviewPacket,
  createExternalIntegrationsICp676CloseoutHandoff,
  createExternalIntegrationsICp676HermesEvidencePacket,
  createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor,
  createExternalIntegrationsICp677ClaudeReviewPacket,
  createExternalIntegrationsICp677CloseoutHandoff,
  createExternalIntegrationsICp677HermesEvidencePacket,
  createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor,
  createExternalIntegrationsICp678ClaudeReviewPacket,
  createExternalIntegrationsICp678CloseoutHandoff,
  createExternalIntegrationsICp678HermesEvidencePacket,
  createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor,
  createExternalIntegrationsICp679ClaudeReviewPacket,
  createExternalIntegrationsICp679CloseoutHandoff,
  createExternalIntegrationsICp679HermesEvidencePacket,
  createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor,
  createExternalIntegrationsICp680ClaudeReviewPacket,
  createExternalIntegrationsICp680CloseoutHandoff,
  createExternalIntegrationsICp680HermesEvidencePacket,
  createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor,
  createExternalIntegrationsICp681ClaudeReviewPacket,
  createExternalIntegrationsICp681CloseoutHandoff,
  createExternalIntegrationsICp681HermesEvidencePacket,
  createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor,
  createExternalIntegrationsICp682ClaudeReviewPacket,
  createExternalIntegrationsICp682CloseoutHandoff,
  createExternalIntegrationsICp682HermesEvidencePacket,
  createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor,
  createExternalIntegrationsICp683ClaudeReviewPacket,
  createExternalIntegrationsICp683CloseoutHandoff,
  createExternalIntegrationsICp683HermesEvidencePacket,
  createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor,
  createExternalIntegrationsICp684ClaudeReviewPacket,
  createExternalIntegrationsICp684CloseoutHandoff,
  createExternalIntegrationsICp684HermesEvidencePacket,
  createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor,
  createExternalIntegrationsICp685ClaudeReviewPacket,
  createExternalIntegrationsICp685CloseoutHandoff,
  createExternalIntegrationsICp685HermesEvidencePacket,
  createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor,
  createExternalIntegrationsICp686ClaudeReviewPacket,
  createExternalIntegrationsICp686CloseoutHandoff,
  createExternalIntegrationsICp686HermesEvidencePacket,
  createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor,
  createExternalIntegrationsICp687ClaudeReviewPacket,
  createExternalIntegrationsICp687CloseoutHandoff,
  createExternalIntegrationsICp687HermesEvidencePacket,
  createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor,
  createExternalIntegrationsICp688ClaudeReviewPacket,
  createExternalIntegrationsICp688CloseoutHandoff,
  createExternalIntegrationsICp688HermesEvidencePacket,
  createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor,
  createExternalIntegrationsICp689ClaudeReviewPacket,
  createExternalIntegrationsICp689CloseoutHandoff,
  createExternalIntegrationsICp689HermesEvidencePacket,
  createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor,
  createExternalIntegrationsICp690ClaudeReviewPacket,
  createExternalIntegrationsICp690CloseoutHandoff,
  createExternalIntegrationsICp690HermesEvidencePacket,
  createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor,
  createExternalIntegrationsICp691ClaudeReviewPacket,
  createExternalIntegrationsICp691CloseoutHandoff,
  createExternalIntegrationsICp691HermesEvidencePacket,
  createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor,
  createExternalIntegrationsICp692ClaudeReviewPacket,
  createExternalIntegrationsICp692CloseoutHandoff,
  createExternalIntegrationsICp692HermesEvidencePacket,
  createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor,
  createExternalIntegrationsICp693ClaudeReviewPacket,
  createExternalIntegrationsICp693CloseoutHandoff,
  createExternalIntegrationsICp693HermesEvidencePacket,
  createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor,
  createExternalIntegrationsICoreContractProjection,
  validateExternalIntegrationsICp666Coverage,
  validateExternalIntegrationsICp666ScopeDomainFoundationDescriptor,
  validateExternalIntegrationsICp667Coverage,
  validateExternalIntegrationsICp667DomainModelContinuationDescriptor,
  validateExternalIntegrationsICp668Coverage,
  validateExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor,
  validateExternalIntegrationsICp669Coverage,
  validateExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor,
  validateExternalIntegrationsICp670Coverage,
  validateExternalIntegrationsICp670ServiceImplementationSliceDescriptor,
  validateExternalIntegrationsICp671Coverage,
  validateExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor,
  validateExternalIntegrationsICp672Coverage,
  validateExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor,
  validateExternalIntegrationsICp673Coverage,
  validateExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor,
  validateExternalIntegrationsICp674Coverage,
  validateExternalIntegrationsICp674EvidenceReviewBridgeDescriptor,
  validateExternalIntegrationsICp675Coverage,
  validateExternalIntegrationsICp675Phase3FoundationBridgeDescriptor,
  validateExternalIntegrationsICp676Coverage,
  validateExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor,
  validateExternalIntegrationsICp677Coverage,
  validateExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor,
  validateExternalIntegrationsICp678Coverage,
  validateExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor,
  validateExternalIntegrationsICp679Coverage,
  validateExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor,
  validateExternalIntegrationsICp680Coverage,
  validateExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor,
  validateExternalIntegrationsICp681Coverage,
  validateExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor,
  validateExternalIntegrationsICp682Coverage,
  validateExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor,
  validateExternalIntegrationsICp683Coverage,
  validateExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor,
  validateExternalIntegrationsICp684Coverage,
  validateExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor,
  validateExternalIntegrationsICp685Coverage,
  validateExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor,
  validateExternalIntegrationsICp686Coverage,
  validateExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor,
  validateExternalIntegrationsICp687Coverage,
  validateExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor,
  validateExternalIntegrationsICp688Coverage,
  validateExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor,
  validateExternalIntegrationsICp689Coverage,
  validateExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor,
  validateExternalIntegrationsICp690Coverage,
  validateExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor,
  validateExternalIntegrationsICp691Coverage,
  validateExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor,
  validateExternalIntegrationsICp692Coverage,
  validateExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor,
  validateExternalIntegrationsICp693Coverage,
  validateExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor,
  validateExternalIntegrationsICoreContractProjection,
} from "../src/index.js";

const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
const manifestPath = new URL("../../../docs/closeout-packs/cp00-666/manifest.json", import.meta.url);
const cp667ManifestPath = new URL("../../../docs/closeout-packs/cp00-667/manifest.json", import.meta.url);
const cp668ManifestPath = new URL("../../../docs/closeout-packs/cp00-668/manifest.json", import.meta.url);
const cp669ManifestPath = new URL("../../../docs/closeout-packs/cp00-669/manifest.json", import.meta.url);
const cp670ManifestPath = new URL("../../../docs/closeout-packs/cp00-670/manifest.json", import.meta.url);
const cp671ManifestPath = new URL("../../../docs/closeout-packs/cp00-671/manifest.json", import.meta.url);
const cp672ManifestPath = new URL("../../../docs/closeout-packs/cp00-672/manifest.json", import.meta.url);
const cp673ManifestPath = new URL("../../../docs/closeout-packs/cp00-673/manifest.json", import.meta.url);
const cp674ManifestPath = new URL("../../../docs/closeout-packs/cp00-674/manifest.json", import.meta.url);
const cp675ManifestPath = new URL("../../../docs/closeout-packs/cp00-675/manifest.json", import.meta.url);
const cp676ManifestPath = new URL("../../../docs/closeout-packs/cp00-676/manifest.json", import.meta.url);
const cp677ManifestPath = new URL("../../../docs/closeout-packs/cp00-677/manifest.json", import.meta.url);
const cp678ManifestPath = new URL("../../../docs/closeout-packs/cp00-678/manifest.json", import.meta.url);
const cp679ManifestPath = new URL("../../../docs/closeout-packs/cp00-679/manifest.json", import.meta.url);
const cp680ManifestPath = new URL("../../../docs/closeout-packs/cp00-680/manifest.json", import.meta.url);
const cp681ManifestPath = new URL("../../../docs/closeout-packs/cp00-681/manifest.json", import.meta.url);
const cp682ManifestPath = new URL("../../../docs/closeout-packs/cp00-682/manifest.json", import.meta.url);
const cp683ManifestPath = new URL("../../../docs/closeout-packs/cp00-683/manifest.json", import.meta.url);
const cp684ManifestPath = new URL("../../../docs/closeout-packs/cp00-684/manifest.json", import.meta.url);
const cp685ManifestPath = new URL("../../../docs/closeout-packs/cp00-685/manifest.json", import.meta.url);
const cp686ManifestPath = new URL("../../../docs/closeout-packs/cp00-686/manifest.json", import.meta.url);
const cp687ManifestPath = new URL("../../../docs/closeout-packs/cp00-687/manifest.json", import.meta.url);
const cp688ManifestPath = new URL("../../../docs/closeout-packs/cp00-688/manifest.json", import.meta.url);
const cp689ManifestPath = new URL("../../../docs/closeout-packs/cp00-689/manifest.json", import.meta.url);
const cp690ManifestPath = new URL("../../../docs/closeout-packs/cp00-690/manifest.json", import.meta.url);
const cp691ManifestPath = new URL("../../../docs/closeout-packs/cp00-691/manifest.json", import.meta.url);
const cp692ManifestPath = new URL("../../../docs/closeout-packs/cp00-692/manifest.json", import.meta.url);
const cp693ManifestPath = new URL("../../../docs/closeout-packs/cp00-693/manifest.json", import.meta.url);
const cp666Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
const cp667Manifest = existsSync(cp667ManifestPath) ? JSON.parse(readFileSync(cp667ManifestPath, "utf8")) : null;
const cp668Manifest = existsSync(cp668ManifestPath) ? JSON.parse(readFileSync(cp668ManifestPath, "utf8")) : null;
const cp669Manifest = existsSync(cp669ManifestPath) ? JSON.parse(readFileSync(cp669ManifestPath, "utf8")) : null;
const cp670Manifest = existsSync(cp670ManifestPath) ? JSON.parse(readFileSync(cp670ManifestPath, "utf8")) : null;
const cp671Manifest = existsSync(cp671ManifestPath) ? JSON.parse(readFileSync(cp671ManifestPath, "utf8")) : null;
const cp672Manifest = existsSync(cp672ManifestPath) ? JSON.parse(readFileSync(cp672ManifestPath, "utf8")) : null;
const cp673Manifest = existsSync(cp673ManifestPath) ? JSON.parse(readFileSync(cp673ManifestPath, "utf8")) : null;
const cp674Manifest = existsSync(cp674ManifestPath) ? JSON.parse(readFileSync(cp674ManifestPath, "utf8")) : null;
const cp675Manifest = existsSync(cp675ManifestPath) ? JSON.parse(readFileSync(cp675ManifestPath, "utf8")) : null;
const cp676Manifest = existsSync(cp676ManifestPath) ? JSON.parse(readFileSync(cp676ManifestPath, "utf8")) : null;
const cp677Manifest = existsSync(cp677ManifestPath) ? JSON.parse(readFileSync(cp677ManifestPath, "utf8")) : null;
const cp678Manifest = existsSync(cp678ManifestPath) ? JSON.parse(readFileSync(cp678ManifestPath, "utf8")) : null;
const cp679Manifest = existsSync(cp679ManifestPath) ? JSON.parse(readFileSync(cp679ManifestPath, "utf8")) : null;
const cp680Manifest = existsSync(cp680ManifestPath) ? JSON.parse(readFileSync(cp680ManifestPath, "utf8")) : null;
const cp681Manifest = existsSync(cp681ManifestPath) ? JSON.parse(readFileSync(cp681ManifestPath, "utf8")) : null;
const cp682Manifest = existsSync(cp682ManifestPath) ? JSON.parse(readFileSync(cp682ManifestPath, "utf8")) : null;
const cp683Manifest = existsSync(cp683ManifestPath) ? JSON.parse(readFileSync(cp683ManifestPath, "utf8")) : null;
const cp684Manifest = existsSync(cp684ManifestPath) ? JSON.parse(readFileSync(cp684ManifestPath, "utf8")) : null;
const cp685Manifest = existsSync(cp685ManifestPath) ? JSON.parse(readFileSync(cp685ManifestPath, "utf8")) : null;
const cp686Manifest = existsSync(cp686ManifestPath) ? JSON.parse(readFileSync(cp686ManifestPath, "utf8")) : null;
const cp687Manifest = existsSync(cp687ManifestPath) ? JSON.parse(readFileSync(cp687ManifestPath, "utf8")) : null;
const cp688Manifest = existsSync(cp688ManifestPath) ? JSON.parse(readFileSync(cp688ManifestPath, "utf8")) : null;
const cp689Manifest = existsSync(cp689ManifestPath) ? JSON.parse(readFileSync(cp689ManifestPath, "utf8")) : null;
const cp690Manifest = existsSync(cp690ManifestPath) ? JSON.parse(readFileSync(cp690ManifestPath, "utf8")) : null;
const cp691Manifest = existsSync(cp691ManifestPath) ? JSON.parse(readFileSync(cp691ManifestPath, "utf8")) : null;
const cp692Manifest = existsSync(cp692ManifestPath) ? JSON.parse(readFileSync(cp692ManifestPath, "utf8")) : null;
const cp693Manifest = existsSync(cp693ManifestPath) ? JSON.parse(readFileSync(cp693ManifestPath, "utf8")) : null;
const cp666PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.pack_id) ??
  cp666Manifest?.plan_binding_snapshot;
const cp667PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.pack_id) ??
  cp667Manifest?.plan_binding_snapshot;
const cp668PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.pack_id) ??
  cp668Manifest?.plan_binding_snapshot;
const cp669PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.pack_id) ??
  cp669Manifest?.plan_binding_snapshot;
const cp670PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.pack_id) ??
  cp670Manifest?.plan_binding_snapshot;
const cp671PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.pack_id) ??
  cp671Manifest?.plan_binding_snapshot;
const cp672PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.pack_id) ??
  cp672Manifest?.plan_binding_snapshot;
const cp673PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.pack_id) ??
  cp673Manifest?.plan_binding_snapshot;
const cp674PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.pack_id) ??
  cp674Manifest?.plan_binding_snapshot;
const cp675PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.pack_id) ??
  cp675Manifest?.plan_binding_snapshot;
const cp676PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.pack_id) ??
  cp676Manifest?.plan_binding_snapshot;
const cp677PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.pack_id) ??
  cp677Manifest?.plan_binding_snapshot;
const cp678PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.pack_id) ??
  cp678Manifest?.plan_binding_snapshot;
const cp679PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.pack_id) ??
  cp679Manifest?.plan_binding_snapshot;
const cp680PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.pack_id) ??
  cp680Manifest?.plan_binding_snapshot;
const cp681PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.pack_id) ??
  cp681Manifest?.plan_binding_snapshot;
const cp682PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.pack_id) ??
  cp682Manifest?.plan_binding_snapshot;
const cp683PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.pack_id) ??
  cp683Manifest?.plan_binding_snapshot;
const cp684PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.pack_id) ??
  cp684Manifest?.plan_binding_snapshot;
const cp685PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.pack_id) ??
  cp685Manifest?.plan_binding_snapshot;
const cp686PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.pack_id) ??
  cp686Manifest?.plan_binding_snapshot;
const cp687PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.pack_id) ??
  cp687Manifest?.plan_binding_snapshot;
const cp688PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.pack_id) ??
  cp688Manifest?.plan_binding_snapshot;
const cp689PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.pack_id) ??
  cp689Manifest?.plan_binding_snapshot;
const cp690PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.pack_id) ??
  cp690Manifest?.plan_binding_snapshot;
const cp691PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.pack_id) ??
  cp691Manifest?.plan_binding_snapshot;
const cp692PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.pack_id) ??
  cp692Manifest?.plan_binding_snapshot;
const cp693PlanPack =
  plan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id) ??
  cp693Manifest?.plan_binding_snapshot;
const coreContractPath = new URL("../../../contracts/integrations-core-contract.json", import.meta.url);
const externalContractPath = new URL("../../../contracts/external-integrations-i-contract.json", import.meta.url);
const coreContract = existsSync(coreContractPath)
  ? JSON.parse(readFileSync(coreContractPath, "utf8"))
  : createExternalIntegrationsICoreContractProjection();
const externalContract = existsSync(externalContractPath)
  ? JSON.parse(readFileSync(externalContractPath, "utf8"))
  : createExternalIntegrationsICoreContractProjection();

test("CP00-666 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp666Coverage(cp666PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P00.M00.S01");
  assert.equal(coverage.summary.last_unit_id, "RP22.P01.M02.S08");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-667 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp667Coverage(cp667PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P01.M02.S09");
  assert.equal(coverage.summary.last_unit_id, "RP22.P01.M04.S06");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-668 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp668Coverage(cp668PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P01.M04.S07");
  assert.equal(coverage.summary.last_unit_id, "RP22.P01.M06.S04");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-669 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp669Coverage(cp669PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P01.M06.S05");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M02.S22");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-670 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp670Coverage(cp670PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M03.S01");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M04.S18");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-671 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp671Coverage(cp671PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M04.S19");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M06.S14");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-672 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp672Coverage(cp672PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M06.S15");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M07.S02");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-673 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp673Coverage(cp673PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M07.S03");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M07.S12");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-674 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp674Coverage(cp674PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M07.S13");
  assert.equal(coverage.summary.last_unit_id, "RP22.P02.M09.S08");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-675 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp675Coverage(cp675PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P02.M09.S09");
  assert.equal(coverage.summary.last_unit_id, "RP22.P03.M06.S12");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-676 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp676Coverage(cp676PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P03.M06.S13");
  assert.equal(coverage.summary.last_unit_id, "RP22.P04.M03.S20");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-677 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp677Coverage(cp677PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P04.M03.S21");
  assert.equal(coverage.summary.last_unit_id, "RP22.P04.M05.S16");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-678 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp678Coverage(cp678PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P04.M05.S17");
  assert.equal(coverage.summary.last_unit_id, "RP22.P04.M06.S04");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-679 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp679Coverage(cp679PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.first_unit_id, "RP22.P04.M06.S05");
  assert.equal(coverage.summary.last_unit_id, "RP22.P05.M03.S08");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-680 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp680Coverage(cp680PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-680");
  assert.equal(coverage.summary.first_unit_id, "RP22.P05.M03.S09");
  assert.equal(coverage.summary.last_unit_id, "RP22.P05.M03.S18");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-681 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp681Coverage(cp681PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-681");
  assert.equal(coverage.summary.first_unit_id, "RP22.P05.M03.S19");
  assert.equal(coverage.summary.last_unit_id, "RP22.P06.M00.S06");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-682 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp682Coverage(cp682PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-682");
  assert.equal(coverage.summary.first_unit_id, "RP22.P06.M00.S07");
  assert.equal(coverage.summary.last_unit_id, "RP22.P06.M07.S06");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-683 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp683Coverage(cp683PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-683");
  assert.equal(coverage.summary.first_unit_id, "RP22.P06.M07.S07");
  assert.equal(coverage.summary.last_unit_id, "RP22.P06.M09.S02");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-684 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp684Coverage(cp684PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-684");
  assert.equal(coverage.summary.first_unit_id, "RP22.P06.M09.S03");
  assert.equal(coverage.summary.last_unit_id, "RP22.P07.M05.S04");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-685 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp685Coverage(cp685PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-685");
  assert.equal(coverage.summary.first_unit_id, "RP22.P07.M05.S05");
  assert.equal(coverage.summary.last_unit_id, "RP22.P07.M05.S14");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-686 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp686Coverage(cp686PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-686");
  assert.equal(coverage.summary.first_unit_id, "RP22.P07.M05.S15");
  assert.equal(coverage.summary.last_unit_id, "RP22.P07.M06.S02");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-687 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp687Coverage(cp687PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-687");
  assert.equal(coverage.summary.first_unit_id, "RP22.P07.M06.S03");
  assert.equal(coverage.summary.last_unit_id, "RP22.P08.M02.S14");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-688 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp688Coverage(cp688PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-688");
  assert.equal(coverage.summary.first_unit_id, "RP22.P08.M02.S15");
  assert.equal(coverage.summary.last_unit_id, "RP22.P08.M04.S12");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-689 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp689Coverage(cp689PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-689");
  assert.equal(coverage.summary.first_unit_id, "RP22.P08.M04.S13");
  assert.equal(coverage.summary.last_unit_id, "RP22.P08.M06.S08");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-690 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp690Coverage(cp690PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-690");
  assert.equal(coverage.summary.first_unit_id, "RP22.P08.M06.S09");
  assert.equal(coverage.summary.last_unit_id, "RP22.P09.M03.S22");
  assert.equal(coverage.summary.unit_count, 150);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-691 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp691Coverage(cp691PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-691");
  assert.equal(coverage.summary.first_unit_id, "RP22.P09.M04.S01");
  assert.equal(coverage.summary.last_unit_id, "RP22.P09.M05.S20");
  assert.equal(coverage.summary.unit_count, 40);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-692 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp692Coverage(cp692PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-692");
  assert.equal(coverage.summary.first_unit_id, "RP22.P09.M05.S21");
  assert.equal(coverage.summary.last_unit_id, "RP22.P09.M06.S08");
  assert.equal(coverage.summary.unit_count, 10);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-693 coverage matches live closeout plan distribution", () => {
  const coverage = validateExternalIntegrationsICp693Coverage(cp693PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("\n"));
  assert.equal(coverage.summary.pack_id, "CP00-693");
  assert.equal(coverage.summary.first_unit_id, "RP22.P09.M06.S09");
  assert.equal(coverage.summary.last_unit_id, "RP22.P09.M10.S10");
  assert.equal(coverage.summary.unit_count, 84);
  assert.deepEqual(coverage.summary.by_deliverable, EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.micro_phase_row_counts);
  assert.deepEqual(coverage.summary.by_micro_title, EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.micro_title_row_counts);
});

test("CP00-666 descriptor is no-write, synthetic, and runtime closed", () => {
  const descriptor = createExternalIntegrationsICp666ScopeDomainFoundationDescriptor();
  const validation = validateExternalIntegrationsICp666ScopeDomainFoundationDescriptor(descriptor);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-666");
  assert.equal(descriptor.program_contract.program_id, "RP22");
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.oauth_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.sync_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.webhook_runtime_opened, false);
  assert.equal(descriptor.no_write_attestation.calls_external_provider_api, false);
  assert.equal(descriptor.no_write_attestation.persists_access_token, false);
  assert.equal(descriptor.no_write_attestation.persists_refresh_token, false);
  assert.equal(descriptor.no_write_attestation.includes_raw_external_payload, false);
  assert.equal(descriptor.no_write_attestation.no_real_data, true);
});

test("CP00-666 entity shapes keep tenant scope, Matter trace, and credential references explicit", () => {
  assert.equal(EXTERNAL_INTEGRATIONS_I_PROGRAM_CONTRACT.package_path, "packages/integrations-core");
  for (const entity of EXTERNAL_INTEGRATIONS_I_PROGRAM_CONTRACT.target_entities) {
    const shape = EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES[entity];
    assert.ok(shape, `${entity} shape must exist`);
    assert.equal(shape.owner, "integrations-core");
    assert.ok(shape.required_fields.includes("tenant_id"), `${entity} must be tenant scoped`);
    assert.ok(shape.states.length > 0, `${entity} must define lifecycle states`);
  }
  assert.ok(EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES.IntegrationConnection.required_fields.includes("matter_scope"));
  assert.ok(EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES.OAuthCredentialRef.required_fields.includes("secret_storage_ref"));
  assert.ok(EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES.WebhookEvent.required_fields.includes("signature_verification_status"));
});

test("CP00-666 review packets are read-only and hand off to CP00-667", () => {
  const descriptor = createExternalIntegrationsICp666ScopeDomainFoundationDescriptor();
  const hermes = createExternalIntegrationsICp666HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp666ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp666CloseoutHandoff();
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C22");
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-667");
  assert.equal(handoff.next_subphase_id, "RP22.P01.M02.S09");
});

test("CP00-667 descriptor continues domain model shape without opening runtime", () => {
  const descriptor = createExternalIntegrationsICp667DomainModelContinuationDescriptor();
  const validation = validateExternalIntegrationsICp667DomainModelContinuationDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp667HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp667ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp667CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-667");
  assert.equal(descriptor.model_continuation_contract.validates_required_fields, true);
  assert.equal(descriptor.model_continuation_contract.serialization_hides_raw_external_payload, true);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(descriptor.no_write_attestation.includes_raw_external_payload, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-668");
  assert.equal(handoff.next_subphase_id, "RP22.P01.M04.S07");
});

test("CP00-668 descriptor bridges permission, audit, and fixture rows without opening runtime", () => {
  const descriptor = createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor();
  const validation = validateExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp668HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp668ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp668CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-668");
  assert.equal(descriptor.permission_audit_fixture_contract.permission_decision_required_before_runtime, true);
  assert.equal(descriptor.permission_audit_fixture_contract.audit_hint_required, true);
  assert.equal(descriptor.permission_audit_fixture_contract.fixture_payload_included, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-669");
  assert.equal(handoff.next_subphase_id, "RP22.P01.M06.S05");
});

test("CP00-669 descriptor opens service contract and type-shape descriptors without runtime", () => {
  const descriptor = createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor();
  const validation = validateExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp669HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp669ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp669CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-669");
  assert.equal(descriptor.service_contract_type_shape_contract.service_entrypoint_contract_defined, true);
  assert.equal(descriptor.service_contract_type_shape_contract.tenant_boundary_precheck_required, true);
  assert.equal(descriptor.service_contract_type_shape_contract.persistence_boundary_no_write, true);
  assert.equal(descriptor.service_contract_type_shape_contract.runtime_execution_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-670");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M03.S01");
});

test("CP00-670 descriptor continues service implementation slices without runtime", () => {
  const descriptor = createExternalIntegrationsICp670ServiceImplementationSliceDescriptor();
  const validation = validateExternalIntegrationsICp670ServiceImplementationSliceDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp670HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp670ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp670CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-670");
  assert.equal(descriptor.service_implementation_slice_contract.service_entrypoint_contract_bound, true);
  assert.equal(descriptor.service_implementation_slice_contract.tenant_boundary_precheck_required, true);
  assert.equal(descriptor.service_implementation_slice_contract.persistence_boundary_no_write, true);
  assert.equal(descriptor.service_implementation_slice_contract.implementation_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-671");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M04.S19");
});

test("CP00-671 descriptor bridges permission, audit, and fixtures without runtime", () => {
  const descriptor = createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor();
  const validation = validateExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor(descriptor);
  const hermes = createExternalIntegrationsICp671HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp671ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp671CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-671");
  assert.equal(descriptor.permission_audit_fixture_bridge_v2_contract.permission_decision_required_before_runtime, true);
  assert.equal(descriptor.permission_audit_fixture_bridge_v2_contract.audit_hint_required, true);
  assert.equal(descriptor.permission_audit_fixture_bridge_v2_contract.fixture_payload_included, false);
  assert.equal(descriptor.permission_audit_fixture_bridge_v2_contract.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-672");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M06.S15");
});

test("CP00-672 descriptor bridges synthetic fixture tail and test/golden rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor();
  const validation = validateExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp672HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp672ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp672CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-672");
  assert.equal(descriptor.synthetic_fixture_test_golden_bridge_contract.approval_required_routing_descriptor_only, true);
  assert.equal(descriptor.synthetic_fixture_test_golden_bridge_contract.blocked_claim_output_descriptor_only, true);
  assert.equal(descriptor.synthetic_fixture_test_golden_bridge_contract.golden_case_payload_included, false);
  assert.equal(descriptor.synthetic_fixture_test_golden_bridge_contract.test_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-673");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M07.S03");
});

test("CP00-673 descriptor binds test/golden boundary prechecks without runtime", () => {
  const descriptor = createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor();
  const validation = validateExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp673HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp673ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp673CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-673");
  assert.equal(descriptor.test_golden_boundary_precheck_contract.tenant_boundary_precheck_required, true);
  assert.equal(descriptor.test_golden_boundary_precheck_contract.permission_precheck_required, true);
  assert.equal(descriptor.test_golden_boundary_precheck_contract.persistence_boundary_no_write, true);
  assert.equal(descriptor.test_golden_boundary_precheck_contract.persistence_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-674");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M07.S13");
});

test("CP00-674 descriptor bridges evidence and review packets without runtime", () => {
  const descriptor = createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor();
  const validation = validateExternalIntegrationsICp674EvidenceReviewBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp674HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp674ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp674CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-674");
  assert.equal(descriptor.evidence_review_bridge_contract.hermes_evidence_packet_descriptor_only, true);
  assert.equal(descriptor.evidence_review_bridge_contract.claude_review_packet_descriptor_only, true);
  assert.equal(descriptor.evidence_review_bridge_contract.hermes_runtime_opened, false);
  assert.equal(descriptor.evidence_review_bridge_contract.claude_runtime_opened, false);
  assert.equal(descriptor.evidence_review_bridge_contract.persistence_boundary_no_write, true);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-675");
  assert.equal(handoff.next_subphase_id, "RP22.P02.M09.S09");
});

test("CP00-675 descriptor bridges phase 3 foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp675Phase3FoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp675HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp675ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp675CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-675");
  assert.equal(descriptor.phase3_foundation_bridge_contract.scope_inventory_descriptor_only, true);
  assert.equal(descriptor.phase3_foundation_bridge_contract.permission_audit_binding_descriptor_only, true);
  assert.equal(descriptor.phase3_foundation_bridge_contract.synthetic_fixture_descriptor_only, true);
  assert.equal(descriptor.phase3_foundation_bridge_contract.hermes_runtime_opened, false);
  assert.equal(descriptor.phase3_foundation_bridge_contract.claude_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-676");
  assert.equal(handoff.next_subphase_id, "RP22.P03.M06.S13");
});

test("CP00-676 descriptor bridges UI evidence foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp676HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp676ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp676CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-676");
  assert.equal(descriptor.ui_evidence_foundation_bridge_contract.synthetic_fixture_tail_descriptor_only, true);
  assert.equal(descriptor.ui_evidence_foundation_bridge_contract.test_golden_case_set_descriptor_only, true);
  assert.equal(descriptor.ui_evidence_foundation_bridge_contract.hermes_ui_evidence_descriptor_only, true);
  assert.equal(descriptor.ui_evidence_foundation_bridge_contract.claude_ui_leak_prompt_read_only, true);
  assert.equal(descriptor.ui_evidence_foundation_bridge_contract.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-677");
  assert.equal(handoff.next_subphase_id, "RP22.P04.M03.S21");
});

test("CP00-677 descriptor bridges UI workflow permission audit rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor();
  const validation = validateExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp677HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp677ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp677CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-677");
  assert.equal(descriptor.ui_workflow_permission_audit_bridge_contract.secondary_workflow_slice_descriptor_only, true);
  assert.equal(descriptor.ui_workflow_permission_audit_bridge_contract.permission_audit_binding_descriptor_only, true);
  assert.equal(descriptor.ui_workflow_permission_audit_bridge_contract.no_unauthorized_count_leak_required, true);
  assert.equal(descriptor.ui_workflow_permission_audit_bridge_contract.unauthorized_count_included, false);
  assert.equal(descriptor.ui_workflow_permission_audit_bridge_contract.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-678");
  assert.equal(handoff.next_subphase_id, "RP22.P04.M05.S17");
});

test("CP00-678 descriptor bridges permission audit fixture boundary rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor();
  const validation = validateExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp678HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp678ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp678CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-678");
  assert.equal(descriptor.permission_audit_fixture_boundary_contract.permission_audit_binding_tail_descriptor_only, true);
  assert.equal(descriptor.permission_audit_fixture_boundary_contract.synthetic_fixture_set_descriptor_only, true);
  assert.equal(descriptor.permission_audit_fixture_boundary_contract.no_unauthorized_count_leak_required, true);
  assert.equal(descriptor.permission_audit_fixture_boundary_contract.unauthorized_count_included, false);
  assert.equal(descriptor.permission_audit_fixture_boundary_contract.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-679");
  assert.equal(handoff.next_subphase_id, "RP22.P04.M06.S05");
});

test("CP00-679 descriptor bridges P05 fixture foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp679HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp679ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp679CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-679");
  assert.equal(descriptor.p05_fixture_foundation_bridge_contract.p05_fixture_foundation_descriptor_only, true);
  assert.equal(descriptor.p05_fixture_foundation_bridge_contract.base_tenant_fixture_synthetic_only, true);
  assert.equal(descriptor.p05_fixture_foundation_bridge_contract.no_real_data_check_required, true);
  assert.equal(descriptor.p05_fixture_foundation_bridge_contract.real_fixture_payload_included, false);
  assert.equal(descriptor.p05_fixture_foundation_bridge_contract.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-680");
  assert.equal(handoff.next_subphase_id, "RP22.P05.M03.S09");
});

test("CP00-680 descriptor binds primary implementation fixture boundary rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor();
  const validation = validateExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp680HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp680ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp680CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-680");
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.primary_implementation_slice_descriptor_only, true);
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.cross_tenant_access_allowed, false);
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.security_trimming_required, true);
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.real_fixture_payload_included, false);
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.ai_retrieval_runtime_opened, false);
  assert.equal(descriptor.p05_primary_implementation_fixture_boundary_contract.test_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-681");
  assert.equal(handoff.next_subphase_id, "RP22.P05.M03.S19");
});

test("CP00-681 descriptor bridges P05 closeout and P06 scope inventory rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor();
  const validation = validateExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp681HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp681ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp681CloseoutHandoff();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-681");
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.p05_closeout_next_handoff_descriptor_only, true);
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.p06_scope_inventory_descriptor_only, true);
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.replay_command_descriptor_only, true);
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.permission_matrix_row_descriptor_only, true);
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.command_runtime_opened, false);
  assert.equal(descriptor.p05_closeout_p06_scope_inventory_bridge_contract.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-682");
  assert.equal(handoff.next_subphase_id, "RP22.P06.M00.S07");
});

test("CP00-682 descriptor bridges P06 permission decision rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor();
  const validation = validateExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp682HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp682ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp682CloseoutHandoff();
  const contract = descriptor.p06_scope_contract_implementation_fixture_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-682");
  assert.equal(contract.p06_scope_inventory_descriptor_only, true);
  assert.equal(contract.p06_contract_draft_descriptor_only, true);
  assert.equal(contract.p06_permission_audit_binding_descriptor_only, true);
  assert.equal(contract.ai_retrieval_decision_binding_descriptor_only, true);
  assert.equal(contract.legal_hold_interaction_descriptor_only, true);
  assert.equal(contract.cross_tenant_leak_prevention_tests_descriptor_only, true);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-683");
  assert.equal(handoff.next_subphase_id, "RP22.P06.M07.S07");
});

test("CP00-683 descriptor bridges P06 test golden evidence review rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor();
  const validation = validateExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp683HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp683ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp683CloseoutHandoff();
  const contract = descriptor.p06_test_golden_evidence_review_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-683");
  assert.equal(contract.p06_test_golden_case_set_descriptor_only, true);
  assert.equal(contract.p06_hermes_evidence_packet_descriptor_only, true);
  assert.equal(contract.p06_claude_review_packet_descriptor_only, true);
  assert.equal(contract.ai_retrieval_decision_binding_descriptor_only, true);
  assert.equal(contract.cross_tenant_leak_prevention_tests_descriptor_only, true);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-684");
  assert.equal(handoff.next_subphase_id, "RP22.P06.M09.S03");
});

test("CP00-684 descriptor bridges P06 review closeout and P07 failure foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp684HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp684ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp684CloseoutHandoff();
  const contract = descriptor.p06_review_closeout_p07_failure_foundation_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-684");
  assert.equal(contract.p06_claude_review_packet_tail_descriptor_only, true);
  assert.equal(contract.p07_scope_inventory_descriptor_only, true);
  assert.equal(contract.failure_taxonomy_descriptor_only, true);
  assert.equal(contract.blocked_claim_receipt_descriptor_only, true);
  assert.equal(contract.human_escalation_note_descriptor_only, true);
  assert.equal(contract.failure_recovery_runtime_opened, false);
  assert.equal(contract.rollback_runtime_opened, false);
  assert.equal(contract.compensation_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-685");
  assert.equal(handoff.next_subphase_id, "RP22.P07.M05.S05");
});

test("CP00-685 descriptor bridges P07 permission audit failure slice rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor();
  const validation = validateExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp685HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp685ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp685CloseoutHandoff();
  const contract = descriptor.p07_permission_audit_failure_slice_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-685");
  assert.equal(contract.p07_permission_audit_binding_descriptor_only, true);
  assert.equal(contract.missing_resource_failure_descriptor_only, true);
  assert.equal(contract.permission_denied_failure_descriptor_only, true);
  assert.equal(contract.rollback_expectation_descriptor_only, true);
  assert.equal(contract.compensation_expectation_descriptor_only, true);
  assert.equal(contract.failure_recovery_runtime_opened, false);
  assert.equal(contract.rollback_runtime_opened, false);
  assert.equal(contract.compensation_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-686");
  assert.equal(handoff.next_subphase_id, "RP22.P07.M05.S15");
});

test("CP00-686 descriptor bridges P07 blocked-claim fixture taxonomy rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor();
  const validation = validateExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp686HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp686ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp686CloseoutHandoff();
  const contract = descriptor.p07_blocked_claim_fixture_taxonomy_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-686");
  assert.equal(contract.blocked_claim_receipt_descriptor_only, true);
  assert.equal(contract.failure_fixture_descriptor_only, true);
  assert.equal(contract.failure_unit_test_descriptor_only, true);
  assert.equal(contract.hermes_failure_evidence_descriptor_only, true);
  assert.equal(contract.failure_taxonomy_descriptor_only, true);
  assert.equal(contract.missing_tenant_failure_descriptor_only, true);
  assert.equal(contract.blocked_claim_runtime_receipt_emitted, false);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.test_runtime_opened, false);
  assert.equal(contract.failure_recovery_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-687");
  assert.equal(handoff.next_subphase_id, "RP22.P07.M06.S03");
});

test("CP00-687 descriptor bridges P07 fixture evidence review and P08 foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp687HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp687ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp687CloseoutHandoff();
  const contract = descriptor.p07_fixture_evidence_review_p08_foundation_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-687");
  assert.equal(contract.p07_synthetic_fixture_set_descriptor_only, true);
  assert.equal(contract.p07_test_and_golden_case_set_descriptor_only, true);
  assert.equal(contract.p08_scope_inventory_descriptor_only, true);
  assert.equal(contract.pass_semantics_descriptor_only, true);
  assert.equal(contract.block_semantics_descriptor_only, true);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.test_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-688");
  assert.equal(handoff.next_subphase_id, "RP22.P08.M02.S15");
});

test("CP00-688 descriptor bridges P08 evidence implementation workflow rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor();
  const validation = validateExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp688HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp688ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp688CloseoutHandoff();
  const contract = descriptor.p08_evidence_implementation_workflow_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-688");
  assert.equal(contract.p08_type_shape_definition_descriptor_only, true);
  assert.equal(contract.p08_primary_implementation_slice_descriptor_only, true);
  assert.equal(contract.p08_secondary_workflow_slice_descriptor_only, true);
  assert.equal(contract.pass_semantics_descriptor_only, true);
  assert.equal(contract.validation_command_check_descriptor_only, true);
  assert.equal(contract.blocked_claim_receipt_descriptor_only, true);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.test_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-689");
  assert.equal(handoff.next_subphase_id, "RP22.P08.M04.S13");
});

test("CP00-689 descriptor bridges P08 workflow permission fixture rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor();
  const validation = validateExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp689HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp689ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp689CloseoutHandoff();
  const contract = descriptor.p08_workflow_permission_fixture_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-689");
  assert.equal(contract.p08_secondary_workflow_slice_descriptor_only, true);
  assert.equal(contract.p08_permission_audit_binding_descriptor_only, true);
  assert.equal(contract.p08_synthetic_fixture_set_descriptor_only, true);
  assert.equal(contract.pass_with_findings_semantics_descriptor_only, true);
  assert.equal(contract.permission_summary_receipt_descriptor_only, true);
  assert.equal(contract.audit_summary_receipt_descriptor_only, true);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-690");
  assert.equal(handoff.next_subphase_id, "RP22.P08.M06.S09");
});

test("CP00-690 descriptor bridges P08 closeout and P09 foundation rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor();
  const validation = validateExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp690HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp690ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp690CloseoutHandoff();
  const contract = descriptor.p08_p09_review_handoff_foundation_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-690");
  assert.equal(contract.p08_synthetic_fixture_set_descriptor_only, true);
  assert.equal(contract.p08_test_and_golden_case_set_descriptor_only, true);
  assert.equal(contract.p08_hermes_evidence_packet_descriptor_only, true);
  assert.equal(contract.p08_claude_review_packet_descriptor_only, true);
  assert.equal(contract.p09_scope_inventory_descriptor_only, true);
  assert.equal(contract.p09_contract_draft_descriptor_only, true);
  assert.equal(contract.p09_type_and_shape_definition_descriptor_only, true);
  assert.equal(contract.p09_primary_implementation_slice_descriptor_only, true);
  assert.equal(contract.security_review_questions_descriptor_only, true);
  assert.equal(contract.ui_leak_questions_descriptor_only, true);
  assert.equal(contract.security_audit_runtime_opening, undefined);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.test_runtime_opened, false);
  assert.equal(contract.ui_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-691");
  assert.equal(handoff.next_subphase_id, "RP22.P09.M04.S01");
});

test("CP00-691 descriptor bridges P09 workflow permission audit rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor();
  const validation = validateExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp691HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp691ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp691CloseoutHandoff();
  const contract = descriptor.p09_workflow_permission_audit_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-691");
  assert.equal(contract.p09_secondary_workflow_slice_descriptor_only, true);
  assert.equal(contract.p09_permission_and_audit_binding_descriptor_only, true);
  assert.equal(contract.architecture_review_questions_descriptor_only, true);
  assert.equal(contract.permission_bypass_questions_descriptor_only, true);
  assert.equal(contract.audit_completeness_questions_descriptor_only, true);
  assert.equal(contract.ui_leak_questions_descriptor_only, true);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.security_audit_runtime_opened, false);
  assert.equal(contract.ui_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-692");
  assert.equal(handoff.next_subphase_id, "RP22.P09.M05.S21");
});

test("CP00-692 descriptor bridges P09 permission audit tail and synthetic fixture rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor();
  const validation = validateExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp692HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp692ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp692CloseoutHandoff();
  const contract = descriptor.p09_permission_audit_synthetic_fixture_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-692");
  assert.equal(contract.p09_permission_and_audit_binding_tail_descriptor_only, true);
  assert.equal(contract.p09_synthetic_fixture_set_foundation_descriptor_only, true);
  assert.equal(contract.review_receipt_placeholder_descriptor_only, true);
  assert.equal(contract.future_correction_slot_descriptor_only, true);
  assert.equal(contract.architecture_review_questions_descriptor_only, true);
  assert.equal(contract.permission_bypass_questions_descriptor_only, true);
  assert.equal(contract.audit_completeness_questions_descriptor_only, true);
  assert.equal(contract.risk_register_descriptor_only, true);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.security_audit_runtime_opened, false);
  assert.equal(contract.ui_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-693");
  assert.equal(handoff.next_subphase_id, "RP22.P09.M06.S09");
});

test("CP00-693 descriptor bridges P09 fixture evidence review closeout rows without runtime", () => {
  const descriptor = createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor();
  const validation = validateExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor(descriptor);
  const hermes = createExternalIntegrationsICp693HermesEvidencePacket(descriptor);
  const claude = createExternalIntegrationsICp693ClaudeReviewPacket(descriptor);
  const handoff = createExternalIntegrationsICp693CloseoutHandoff();
  const contract = descriptor.p09_synthetic_fixture_evidence_review_closeout_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(descriptor.pack_binding.pack_id, "CP00-693");
  assert.equal(contract.p09_synthetic_fixture_set_tail_descriptor_only, true);
  assert.equal(contract.p09_test_and_golden_case_set_descriptor_only, true);
  assert.equal(contract.p09_hermes_evidence_packet_descriptor_only, true);
  assert.equal(contract.p09_claude_review_packet_descriptor_only, true);
  assert.equal(contract.p09_closeout_and_next_handoff_head_descriptor_only, true);
  assert.equal(contract.severity_taxonomy_descriptor_only, true);
  assert.equal(contract.claude_review_packet_descriptor_only, true);
  assert.equal(contract.command_rerun_descriptor_only, true);
  assert.equal(contract.review_receipt_placeholder_descriptor_only, true);
  assert.equal(contract.go_no_go_verdict_format_descriptor_only, true);
  assert.equal(contract.permission_runtime_opened, false);
  assert.equal(contract.audit_runtime_opened, false);
  assert.equal(contract.fixture_runtime_opened, false);
  assert.equal(contract.test_runtime_opened, false);
  assert.equal(contract.hermes_runtime_opened, false);
  assert.equal(contract.claude_runtime_opened, false);
  assert.equal(contract.security_audit_runtime_opened, false);
  assert.equal(contract.ui_runtime_opened, false);
  assert.equal(contract.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.external_api_runtime_opened, false);
  assert.equal(hermes.gate, "H22");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-694");
  assert.equal(handoff.next_subphase_id, "RP23.P00.M00.S01");
});

test("latest RP22 contract projection matches both contract files", () => {
  const projection = createExternalIntegrationsICoreContractProjection();
  const coreValidation = validateExternalIntegrationsICoreContractProjection(coreContract, { expectedProjection: projection });
  const externalValidation = validateExternalIntegrationsICoreContractProjection(externalContract, { expectedProjection: projection });
  assert.equal(coreValidation.valid, true, coreValidation.errors.join("\n"));
  assert.equal(externalValidation.valid, true, externalValidation.errors.join("\n"));
  assert.equal(coreContract.current_pack.pack_id, "CP00-693");
  assert.deepEqual(coreContract.historical_pack_ids, [
    "CP00-666",
    "CP00-667",
    "CP00-668",
    "CP00-669",
    "CP00-670",
    "CP00-671",
    "CP00-672",
    "CP00-673",
    "CP00-674",
    "CP00-675",
    "CP00-676",
    "CP00-677",
    "CP00-678",
    "CP00-679",
    "CP00-680",
    "CP00-681",
    "CP00-682",
    "CP00-683",
    "CP00-684",
    "CP00-685",
    "CP00-686",
    "CP00-687",
    "CP00-688",
    "CP00-689",
    "CP00-690",
    "CP00-691",
    "CP00-692",
  ]);
  assert.deepEqual(coreContract.cp666_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp675_requirements, EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS);
  assert.deepEqual(externalContract.cp676_requirements, EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS);
  assert.deepEqual(externalContract.cp677_requirements, EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS);
  assert.deepEqual(externalContract.cp677_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp678_requirements, EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS);
  assert.deepEqual(externalContract.cp678_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp679_requirements, EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS);
  assert.deepEqual(externalContract.cp679_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp680_requirements, EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS);
  assert.deepEqual(externalContract.cp680_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp681_requirements, EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS);
  assert.deepEqual(externalContract.cp681_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp682_requirements, EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS);
  assert.deepEqual(externalContract.cp682_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp683_requirements, EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS);
  assert.deepEqual(externalContract.cp683_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp684_requirements, EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS);
  assert.deepEqual(externalContract.cp684_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp685_requirements, EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS);
  assert.deepEqual(externalContract.cp685_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp686_requirements, EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS);
  assert.deepEqual(externalContract.cp686_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp687_requirements, EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS);
  assert.deepEqual(externalContract.cp687_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp688_requirements, EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS);
  assert.deepEqual(externalContract.cp688_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp689_requirements, EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS);
  assert.deepEqual(externalContract.cp689_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp690_requirements, EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS);
  assert.deepEqual(externalContract.cp690_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp691_requirements, EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS);
  assert.deepEqual(externalContract.cp691_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp692_requirements, EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS);
  assert.deepEqual(externalContract.cp692_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
  assert.deepEqual(externalContract.cp693_requirements, EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS);
  assert.deepEqual(externalContract.cp693_no_write_attestation, EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION);
});
