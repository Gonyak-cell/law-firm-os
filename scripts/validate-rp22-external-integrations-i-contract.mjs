import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import {
  EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING,
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
} from "../packages/integrations-core/src/index.js";

const planPath = new URL("../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url);
const manifestPath = new URL("../docs/closeout-packs/cp00-666/manifest.json", import.meta.url);
const cp667ManifestPath = new URL("../docs/closeout-packs/cp00-667/manifest.json", import.meta.url);
const cp668ManifestPath = new URL("../docs/closeout-packs/cp00-668/manifest.json", import.meta.url);
const cp669ManifestPath = new URL("../docs/closeout-packs/cp00-669/manifest.json", import.meta.url);
const cp670ManifestPath = new URL("../docs/closeout-packs/cp00-670/manifest.json", import.meta.url);
const cp671ManifestPath = new URL("../docs/closeout-packs/cp00-671/manifest.json", import.meta.url);
const cp672ManifestPath = new URL("../docs/closeout-packs/cp00-672/manifest.json", import.meta.url);
const cp673ManifestPath = new URL("../docs/closeout-packs/cp00-673/manifest.json", import.meta.url);
const cp674ManifestPath = new URL("../docs/closeout-packs/cp00-674/manifest.json", import.meta.url);
const cp675ManifestPath = new URL("../docs/closeout-packs/cp00-675/manifest.json", import.meta.url);
const cp676ManifestPath = new URL("../docs/closeout-packs/cp00-676/manifest.json", import.meta.url);
const cp677ManifestPath = new URL("../docs/closeout-packs/cp00-677/manifest.json", import.meta.url);
const cp678ManifestPath = new URL("../docs/closeout-packs/cp00-678/manifest.json", import.meta.url);
const cp679ManifestPath = new URL("../docs/closeout-packs/cp00-679/manifest.json", import.meta.url);
const cp680ManifestPath = new URL("../docs/closeout-packs/cp00-680/manifest.json", import.meta.url);
const cp681ManifestPath = new URL("../docs/closeout-packs/cp00-681/manifest.json", import.meta.url);
const cp682ManifestPath = new URL("../docs/closeout-packs/cp00-682/manifest.json", import.meta.url);
const cp683ManifestPath = new URL("../docs/closeout-packs/cp00-683/manifest.json", import.meta.url);
const cp684ManifestPath = new URL("../docs/closeout-packs/cp00-684/manifest.json", import.meta.url);
const cp685ManifestPath = new URL("../docs/closeout-packs/cp00-685/manifest.json", import.meta.url);
const cp686ManifestPath = new URL("../docs/closeout-packs/cp00-686/manifest.json", import.meta.url);
const cp687ManifestPath = new URL("../docs/closeout-packs/cp00-687/manifest.json", import.meta.url);
const cp688ManifestPath = new URL("../docs/closeout-packs/cp00-688/manifest.json", import.meta.url);
const cp689ManifestPath = new URL("../docs/closeout-packs/cp00-689/manifest.json", import.meta.url);
const cp690ManifestPath = new URL("../docs/closeout-packs/cp00-690/manifest.json", import.meta.url);
const cp691ManifestPath = new URL("../docs/closeout-packs/cp00-691/manifest.json", import.meta.url);
const cp692ManifestPath = new URL("../docs/closeout-packs/cp00-692/manifest.json", import.meta.url);
const cp693ManifestPath = new URL("../docs/closeout-packs/cp00-693/manifest.json", import.meta.url);
const coreContractPath = new URL("../contracts/integrations-core-contract.json", import.meta.url);
const externalContractPath = new URL("../contracts/external-integrations-i-contract.json", import.meta.url);

const shouldWrite = process.argv.includes("--write");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const closeoutPlan = await readJson(planPath);
const cp666Manifest = existsSync(manifestPath) ? await readJson(manifestPath) : null;
const cp667Manifest = existsSync(cp667ManifestPath) ? await readJson(cp667ManifestPath) : null;
const cp668Manifest = existsSync(cp668ManifestPath) ? await readJson(cp668ManifestPath) : null;
const cp669Manifest = existsSync(cp669ManifestPath) ? await readJson(cp669ManifestPath) : null;
const cp670Manifest = existsSync(cp670ManifestPath) ? await readJson(cp670ManifestPath) : null;
const cp671Manifest = existsSync(cp671ManifestPath) ? await readJson(cp671ManifestPath) : null;
const cp672Manifest = existsSync(cp672ManifestPath) ? await readJson(cp672ManifestPath) : null;
const cp673Manifest = existsSync(cp673ManifestPath) ? await readJson(cp673ManifestPath) : null;
const cp674Manifest = existsSync(cp674ManifestPath) ? await readJson(cp674ManifestPath) : null;
const cp675Manifest = existsSync(cp675ManifestPath) ? await readJson(cp675ManifestPath) : null;
const cp676Manifest = existsSync(cp676ManifestPath) ? await readJson(cp676ManifestPath) : null;
const cp677Manifest = existsSync(cp677ManifestPath) ? await readJson(cp677ManifestPath) : null;
const cp678Manifest = existsSync(cp678ManifestPath) ? await readJson(cp678ManifestPath) : null;
const cp679Manifest = existsSync(cp679ManifestPath) ? await readJson(cp679ManifestPath) : null;
const cp680Manifest = existsSync(cp680ManifestPath) ? await readJson(cp680ManifestPath) : null;
const cp681Manifest = existsSync(cp681ManifestPath) ? await readJson(cp681ManifestPath) : null;
const cp682Manifest = existsSync(cp682ManifestPath) ? await readJson(cp682ManifestPath) : null;
const cp683Manifest = existsSync(cp683ManifestPath) ? await readJson(cp683ManifestPath) : null;
const cp684Manifest = existsSync(cp684ManifestPath) ? await readJson(cp684ManifestPath) : null;
const cp685Manifest = existsSync(cp685ManifestPath) ? await readJson(cp685ManifestPath) : null;
const cp686Manifest = existsSync(cp686ManifestPath) ? await readJson(cp686ManifestPath) : null;
const cp687Manifest = existsSync(cp687ManifestPath) ? await readJson(cp687ManifestPath) : null;
const cp688Manifest = existsSync(cp688ManifestPath) ? await readJson(cp688ManifestPath) : null;
const cp689Manifest = existsSync(cp689ManifestPath) ? await readJson(cp689ManifestPath) : null;
const cp690Manifest = existsSync(cp690ManifestPath) ? await readJson(cp690ManifestPath) : null;
const cp691Manifest = existsSync(cp691ManifestPath) ? await readJson(cp691ManifestPath) : null;
const cp692Manifest = existsSync(cp692ManifestPath) ? await readJson(cp692ManifestPath) : null;
const cp693Manifest = existsSync(cp693ManifestPath) ? await readJson(cp693ManifestPath) : null;
const cp666PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.pack_id) ??
  cp666Manifest?.plan_binding_snapshot;
assert(cp666PlanPack, "CP00-666 plan pack must exist");
const cp667PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.pack_id) ??
  cp667Manifest?.plan_binding_snapshot;
assert(cp667PlanPack, "CP00-667 plan pack must exist");
const cp668PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.pack_id) ??
  cp668Manifest?.plan_binding_snapshot;
assert(cp668PlanPack, "CP00-668 plan pack must exist");
const cp669PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.pack_id) ??
  cp669Manifest?.plan_binding_snapshot;
assert(cp669PlanPack, "CP00-669 plan pack must exist");
const cp670PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.pack_id) ??
  cp670Manifest?.plan_binding_snapshot;
assert(cp670PlanPack, "CP00-670 plan pack must exist");
const cp671PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.pack_id) ??
  cp671Manifest?.plan_binding_snapshot;
assert(cp671PlanPack, "CP00-671 plan pack must exist");
const cp672PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.pack_id) ??
  cp672Manifest?.plan_binding_snapshot;
assert(cp672PlanPack, "CP00-672 plan pack must exist");
const cp673PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.pack_id) ??
  cp673Manifest?.plan_binding_snapshot;
assert(cp673PlanPack, "CP00-673 plan pack must exist");
const cp674PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.pack_id) ??
  cp674Manifest?.plan_binding_snapshot;
assert(cp674PlanPack, "CP00-674 plan pack must exist");
const cp675PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.pack_id) ??
  cp675Manifest?.plan_binding_snapshot;
assert(cp675PlanPack, "CP00-675 plan pack must exist");
const cp676PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.pack_id) ??
  cp676Manifest?.plan_binding_snapshot;
assert(cp676PlanPack, "CP00-676 plan pack must exist");
const cp677PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.pack_id) ??
  cp677Manifest?.plan_binding_snapshot;
assert(cp677PlanPack, "CP00-677 plan pack must exist");
const cp678PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.pack_id) ??
  cp678Manifest?.plan_binding_snapshot;
assert(cp678PlanPack, "CP00-678 plan pack must exist");
const cp679PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.pack_id) ??
  cp679Manifest?.plan_binding_snapshot;
assert(cp679PlanPack, "CP00-679 plan pack must exist");
const cp680PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.pack_id) ??
  cp680Manifest?.plan_binding_snapshot;
assert(cp680PlanPack, "CP00-680 plan pack must exist");
const cp681PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.pack_id) ??
  cp681Manifest?.plan_binding_snapshot;
assert(cp681PlanPack, "CP00-681 plan pack must exist");
const cp682PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.pack_id) ??
  cp682Manifest?.plan_binding_snapshot;
assert(cp682PlanPack, "CP00-682 plan pack must exist");
const cp683PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.pack_id) ??
  cp683Manifest?.plan_binding_snapshot;
assert(cp683PlanPack, "CP00-683 plan pack must exist");
const cp684PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.pack_id) ??
  cp684Manifest?.plan_binding_snapshot;
assert(cp684PlanPack, "CP00-684 plan pack must exist");
const cp685PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.pack_id) ??
  cp685Manifest?.plan_binding_snapshot;
assert(cp685PlanPack, "CP00-685 plan pack must exist");
const cp686PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.pack_id) ??
  cp686Manifest?.plan_binding_snapshot;
assert(cp686PlanPack, "CP00-686 plan pack must exist");
const cp687PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.pack_id) ??
  cp687Manifest?.plan_binding_snapshot;
assert(cp687PlanPack, "CP00-687 plan pack must exist");
const cp688PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.pack_id) ??
  cp688Manifest?.plan_binding_snapshot;
assert(cp688PlanPack, "CP00-688 plan pack must exist");
const cp689PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.pack_id) ??
  cp689Manifest?.plan_binding_snapshot;
assert(cp689PlanPack, "CP00-689 plan pack must exist");
const cp690PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.pack_id) ??
  cp690Manifest?.plan_binding_snapshot;
assert(cp690PlanPack, "CP00-690 plan pack must exist");
const cp691PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.pack_id) ??
  cp691Manifest?.plan_binding_snapshot;
assert(cp691PlanPack, "CP00-691 plan pack must exist");
const cp692PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.pack_id) ??
  cp692Manifest?.plan_binding_snapshot;
assert(cp692PlanPack, "CP00-692 plan pack must exist");
const cp693PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id) ??
  cp693Manifest?.plan_binding_snapshot;
assert(cp693PlanPack, "CP00-693 plan pack must exist");

const coverage = validateExternalIntegrationsICp666Coverage(cp666PlanPack);
assert.equal(coverage.valid, true, coverage.errors.join("\n"));
const cp667Coverage = validateExternalIntegrationsICp667Coverage(cp667PlanPack);
assert.equal(cp667Coverage.valid, true, cp667Coverage.errors.join("\n"));
const cp668Coverage = validateExternalIntegrationsICp668Coverage(cp668PlanPack);
assert.equal(cp668Coverage.valid, true, cp668Coverage.errors.join("\n"));
const cp669Coverage = validateExternalIntegrationsICp669Coverage(cp669PlanPack);
assert.equal(cp669Coverage.valid, true, cp669Coverage.errors.join("\n"));
const cp670Coverage = validateExternalIntegrationsICp670Coverage(cp670PlanPack);
assert.equal(cp670Coverage.valid, true, cp670Coverage.errors.join("\n"));
const cp671Coverage = validateExternalIntegrationsICp671Coverage(cp671PlanPack);
assert.equal(cp671Coverage.valid, true, cp671Coverage.errors.join("\n"));
const cp672Coverage = validateExternalIntegrationsICp672Coverage(cp672PlanPack);
assert.equal(cp672Coverage.valid, true, cp672Coverage.errors.join("\n"));
const cp673Coverage = validateExternalIntegrationsICp673Coverage(cp673PlanPack);
assert.equal(cp673Coverage.valid, true, cp673Coverage.errors.join("\n"));
const cp674Coverage = validateExternalIntegrationsICp674Coverage(cp674PlanPack);
assert.equal(cp674Coverage.valid, true, cp674Coverage.errors.join("\n"));
const cp675Coverage = validateExternalIntegrationsICp675Coverage(cp675PlanPack);
assert.equal(cp675Coverage.valid, true, cp675Coverage.errors.join("\n"));
const cp676Coverage = validateExternalIntegrationsICp676Coverage(cp676PlanPack);
assert.equal(cp676Coverage.valid, true, cp676Coverage.errors.join("\n"));
const cp677Coverage = validateExternalIntegrationsICp677Coverage(cp677PlanPack);
assert.equal(cp677Coverage.valid, true, cp677Coverage.errors.join("\n"));
const cp678Coverage = validateExternalIntegrationsICp678Coverage(cp678PlanPack);
assert.equal(cp678Coverage.valid, true, cp678Coverage.errors.join("\n"));
const cp679Coverage = validateExternalIntegrationsICp679Coverage(cp679PlanPack);
assert.equal(cp679Coverage.valid, true, cp679Coverage.errors.join("\n"));
const cp680Coverage = validateExternalIntegrationsICp680Coverage(cp680PlanPack);
assert.equal(cp680Coverage.valid, true, cp680Coverage.errors.join("\n"));
const cp681Coverage = validateExternalIntegrationsICp681Coverage(cp681PlanPack);
assert.equal(cp681Coverage.valid, true, cp681Coverage.errors.join("\n"));
const cp682Coverage = validateExternalIntegrationsICp682Coverage(cp682PlanPack);
assert.equal(cp682Coverage.valid, true, cp682Coverage.errors.join("\n"));
const cp683Coverage = validateExternalIntegrationsICp683Coverage(cp683PlanPack);
assert.equal(cp683Coverage.valid, true, cp683Coverage.errors.join("\n"));
const cp684Coverage = validateExternalIntegrationsICp684Coverage(cp684PlanPack);
assert.equal(cp684Coverage.valid, true, cp684Coverage.errors.join("\n"));
const cp685Coverage = validateExternalIntegrationsICp685Coverage(cp685PlanPack);
assert.equal(cp685Coverage.valid, true, cp685Coverage.errors.join("\n"));
const cp686Coverage = validateExternalIntegrationsICp686Coverage(cp686PlanPack);
assert.equal(cp686Coverage.valid, true, cp686Coverage.errors.join("\n"));
const cp687Coverage = validateExternalIntegrationsICp687Coverage(cp687PlanPack);
assert.equal(cp687Coverage.valid, true, cp687Coverage.errors.join("\n"));
const cp688Coverage = validateExternalIntegrationsICp688Coverage(cp688PlanPack);
assert.equal(cp688Coverage.valid, true, cp688Coverage.errors.join("\n"));
const cp689Coverage = validateExternalIntegrationsICp689Coverage(cp689PlanPack);
assert.equal(cp689Coverage.valid, true, cp689Coverage.errors.join("\n"));
const cp690Coverage = validateExternalIntegrationsICp690Coverage(cp690PlanPack);
assert.equal(cp690Coverage.valid, true, cp690Coverage.errors.join("\n"));
const cp691Coverage = validateExternalIntegrationsICp691Coverage(cp691PlanPack);
assert.equal(cp691Coverage.valid, true, cp691Coverage.errors.join("\n"));
const cp692Coverage = validateExternalIntegrationsICp692Coverage(cp692PlanPack);
assert.equal(cp692Coverage.valid, true, cp692Coverage.errors.join("\n"));
const cp693Coverage = validateExternalIntegrationsICp693Coverage(cp693PlanPack);
assert.equal(cp693Coverage.valid, true, cp693Coverage.errors.join("\n"));

const cp666Descriptor = createExternalIntegrationsICp666ScopeDomainFoundationDescriptor();
const descriptorValidation = validateExternalIntegrationsICp666ScopeDomainFoundationDescriptor(cp666Descriptor);
assert.equal(descriptorValidation.valid, true, descriptorValidation.errors.join("\n"));
const cp667Descriptor = createExternalIntegrationsICp667DomainModelContinuationDescriptor();
const cp667DescriptorValidation = validateExternalIntegrationsICp667DomainModelContinuationDescriptor(cp667Descriptor);
assert.equal(cp667DescriptorValidation.valid, true, cp667DescriptorValidation.errors.join("\n"));
const cp668Descriptor = createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor();
const cp668DescriptorValidation = validateExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor(cp668Descriptor);
assert.equal(cp668DescriptorValidation.valid, true, cp668DescriptorValidation.errors.join("\n"));
const cp669Descriptor = createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor();
const cp669DescriptorValidation = validateExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor(cp669Descriptor);
assert.equal(cp669DescriptorValidation.valid, true, cp669DescriptorValidation.errors.join("\n"));
const cp670Descriptor = createExternalIntegrationsICp670ServiceImplementationSliceDescriptor();
const cp670DescriptorValidation = validateExternalIntegrationsICp670ServiceImplementationSliceDescriptor(cp670Descriptor);
assert.equal(cp670DescriptorValidation.valid, true, cp670DescriptorValidation.errors.join("\n"));
const cp671Descriptor = createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor();
const cp671DescriptorValidation = validateExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor(cp671Descriptor);
assert.equal(cp671DescriptorValidation.valid, true, cp671DescriptorValidation.errors.join("\n"));
const cp672Descriptor = createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor();
const cp672DescriptorValidation = validateExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor(cp672Descriptor);
assert.equal(cp672DescriptorValidation.valid, true, cp672DescriptorValidation.errors.join("\n"));
const cp673Descriptor = createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor();
const cp673DescriptorValidation = validateExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor(cp673Descriptor);
assert.equal(cp673DescriptorValidation.valid, true, cp673DescriptorValidation.errors.join("\n"));
const cp674Descriptor = createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor();
const cp674DescriptorValidation = validateExternalIntegrationsICp674EvidenceReviewBridgeDescriptor(cp674Descriptor);
assert.equal(cp674DescriptorValidation.valid, true, cp674DescriptorValidation.errors.join("\n"));
const cp675Descriptor = createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor();
const cp675DescriptorValidation = validateExternalIntegrationsICp675Phase3FoundationBridgeDescriptor(cp675Descriptor);
assert.equal(cp675DescriptorValidation.valid, true, cp675DescriptorValidation.errors.join("\n"));
const cp676Descriptor = createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor();
const cp676DescriptorValidation = validateExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor(cp676Descriptor);
assert.equal(cp676DescriptorValidation.valid, true, cp676DescriptorValidation.errors.join("\n"));
const cp677Descriptor = createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor();
const cp677DescriptorValidation = validateExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor(cp677Descriptor);
assert.equal(cp677DescriptorValidation.valid, true, cp677DescriptorValidation.errors.join("\n"));
const cp678Descriptor = createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor();
const cp678DescriptorValidation = validateExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor(cp678Descriptor);
assert.equal(cp678DescriptorValidation.valid, true, cp678DescriptorValidation.errors.join("\n"));
const cp679Descriptor = createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor();
const cp679DescriptorValidation = validateExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor(cp679Descriptor);
assert.equal(cp679DescriptorValidation.valid, true, cp679DescriptorValidation.errors.join("\n"));
const cp680Descriptor = createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor();
const cp680DescriptorValidation = validateExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor(cp680Descriptor);
assert.equal(cp680DescriptorValidation.valid, true, cp680DescriptorValidation.errors.join("\n"));
const cp681Descriptor = createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor();
const cp681DescriptorValidation = validateExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor(cp681Descriptor);
assert.equal(cp681DescriptorValidation.valid, true, cp681DescriptorValidation.errors.join("\n"));
const cp682Descriptor = createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor();
const cp682DescriptorValidation = validateExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor(cp682Descriptor);
assert.equal(cp682DescriptorValidation.valid, true, cp682DescriptorValidation.errors.join("\n"));
const cp683Descriptor = createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor();
const cp683DescriptorValidation = validateExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor(cp683Descriptor);
assert.equal(cp683DescriptorValidation.valid, true, cp683DescriptorValidation.errors.join("\n"));
const cp684Descriptor = createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor();
const cp684DescriptorValidation = validateExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor(cp684Descriptor);
assert.equal(cp684DescriptorValidation.valid, true, cp684DescriptorValidation.errors.join("\n"));
const cp685Descriptor = createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor();
const cp685DescriptorValidation = validateExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor(cp685Descriptor);
assert.equal(cp685DescriptorValidation.valid, true, cp685DescriptorValidation.errors.join("\n"));
const cp686Descriptor = createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor();
const cp686DescriptorValidation = validateExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor(cp686Descriptor);
assert.equal(cp686DescriptorValidation.valid, true, cp686DescriptorValidation.errors.join("\n"));
const cp687Descriptor = createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor();
const cp687DescriptorValidation = validateExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor(cp687Descriptor);
assert.equal(cp687DescriptorValidation.valid, true, cp687DescriptorValidation.errors.join("\n"));
const cp688Descriptor = createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor();
const cp688DescriptorValidation = validateExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor(cp688Descriptor);
assert.equal(cp688DescriptorValidation.valid, true, cp688DescriptorValidation.errors.join("\n"));
const cp689Descriptor = createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor();
const cp689DescriptorValidation = validateExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor(cp689Descriptor);
assert.equal(cp689DescriptorValidation.valid, true, cp689DescriptorValidation.errors.join("\n"));
const cp690Descriptor = createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor();
const cp690DescriptorValidation = validateExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor(cp690Descriptor);
assert.equal(cp690DescriptorValidation.valid, true, cp690DescriptorValidation.errors.join("\n"));
const cp691Descriptor = createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor();
const cp691DescriptorValidation = validateExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor(cp691Descriptor);
assert.equal(cp691DescriptorValidation.valid, true, cp691DescriptorValidation.errors.join("\n"));
const cp692Descriptor = createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor();
const cp692DescriptorValidation = validateExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor(cp692Descriptor);
assert.equal(cp692DescriptorValidation.valid, true, cp692DescriptorValidation.errors.join("\n"));
const cp693Descriptor = createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor();
const cp693DescriptorValidation = validateExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor(cp693Descriptor);
assert.equal(cp693DescriptorValidation.valid, true, cp693DescriptorValidation.errors.join("\n"));

const cp666Hermes = createExternalIntegrationsICp666HermesEvidencePacket(cp666Descriptor);
const cp666Claude = createExternalIntegrationsICp666ClaudeReviewPacket(cp666Descriptor);
const cp666Handoff = createExternalIntegrationsICp666CloseoutHandoff();
const cp667Hermes = createExternalIntegrationsICp667HermesEvidencePacket(cp667Descriptor);
const cp667Claude = createExternalIntegrationsICp667ClaudeReviewPacket(cp667Descriptor);
const cp667Handoff = createExternalIntegrationsICp667CloseoutHandoff();
const cp668Hermes = createExternalIntegrationsICp668HermesEvidencePacket(cp668Descriptor);
const cp668Claude = createExternalIntegrationsICp668ClaudeReviewPacket(cp668Descriptor);
const cp668Handoff = createExternalIntegrationsICp668CloseoutHandoff();
const cp669Hermes = createExternalIntegrationsICp669HermesEvidencePacket(cp669Descriptor);
const cp669Claude = createExternalIntegrationsICp669ClaudeReviewPacket(cp669Descriptor);
const cp669Handoff = createExternalIntegrationsICp669CloseoutHandoff();
const cp670Hermes = createExternalIntegrationsICp670HermesEvidencePacket(cp670Descriptor);
const cp670Claude = createExternalIntegrationsICp670ClaudeReviewPacket(cp670Descriptor);
const cp670Handoff = createExternalIntegrationsICp670CloseoutHandoff();
const cp671Hermes = createExternalIntegrationsICp671HermesEvidencePacket(cp671Descriptor);
const cp671Claude = createExternalIntegrationsICp671ClaudeReviewPacket(cp671Descriptor);
const cp671Handoff = createExternalIntegrationsICp671CloseoutHandoff();
const cp672Hermes = createExternalIntegrationsICp672HermesEvidencePacket(cp672Descriptor);
const cp672Claude = createExternalIntegrationsICp672ClaudeReviewPacket(cp672Descriptor);
const cp672Handoff = createExternalIntegrationsICp672CloseoutHandoff();
const cp673Hermes = createExternalIntegrationsICp673HermesEvidencePacket(cp673Descriptor);
const cp673Claude = createExternalIntegrationsICp673ClaudeReviewPacket(cp673Descriptor);
const cp673Handoff = createExternalIntegrationsICp673CloseoutHandoff();
const cp674Hermes = createExternalIntegrationsICp674HermesEvidencePacket(cp674Descriptor);
const cp674Claude = createExternalIntegrationsICp674ClaudeReviewPacket(cp674Descriptor);
const cp674Handoff = createExternalIntegrationsICp674CloseoutHandoff();
const cp675Hermes = createExternalIntegrationsICp675HermesEvidencePacket(cp675Descriptor);
const cp675Claude = createExternalIntegrationsICp675ClaudeReviewPacket(cp675Descriptor);
const cp675Handoff = createExternalIntegrationsICp675CloseoutHandoff();
const cp676Hermes = createExternalIntegrationsICp676HermesEvidencePacket(cp676Descriptor);
const cp676Claude = createExternalIntegrationsICp676ClaudeReviewPacket(cp676Descriptor);
const cp676Handoff = createExternalIntegrationsICp676CloseoutHandoff();
const cp677Hermes = createExternalIntegrationsICp677HermesEvidencePacket(cp677Descriptor);
const cp677Claude = createExternalIntegrationsICp677ClaudeReviewPacket(cp677Descriptor);
const cp677Handoff = createExternalIntegrationsICp677CloseoutHandoff();
const cp678Hermes = createExternalIntegrationsICp678HermesEvidencePacket(cp678Descriptor);
const cp678Claude = createExternalIntegrationsICp678ClaudeReviewPacket(cp678Descriptor);
const cp678Handoff = createExternalIntegrationsICp678CloseoutHandoff();
const cp679Hermes = createExternalIntegrationsICp679HermesEvidencePacket(cp679Descriptor);
const cp679Claude = createExternalIntegrationsICp679ClaudeReviewPacket(cp679Descriptor);
const cp679Handoff = createExternalIntegrationsICp679CloseoutHandoff();
const cp680Hermes = createExternalIntegrationsICp680HermesEvidencePacket(cp680Descriptor);
const cp680Claude = createExternalIntegrationsICp680ClaudeReviewPacket(cp680Descriptor);
const cp680Handoff = createExternalIntegrationsICp680CloseoutHandoff();
const cp681Hermes = createExternalIntegrationsICp681HermesEvidencePacket(cp681Descriptor);
const cp681Claude = createExternalIntegrationsICp681ClaudeReviewPacket(cp681Descriptor);
const cp681Handoff = createExternalIntegrationsICp681CloseoutHandoff();
const cp682Hermes = createExternalIntegrationsICp682HermesEvidencePacket(cp682Descriptor);
const cp682Claude = createExternalIntegrationsICp682ClaudeReviewPacket(cp682Descriptor);
const cp682Handoff = createExternalIntegrationsICp682CloseoutHandoff();
const cp683Hermes = createExternalIntegrationsICp683HermesEvidencePacket(cp683Descriptor);
const cp683Claude = createExternalIntegrationsICp683ClaudeReviewPacket(cp683Descriptor);
const cp683Handoff = createExternalIntegrationsICp683CloseoutHandoff();
const cp684Hermes = createExternalIntegrationsICp684HermesEvidencePacket(cp684Descriptor);
const cp684Claude = createExternalIntegrationsICp684ClaudeReviewPacket(cp684Descriptor);
const cp684Handoff = createExternalIntegrationsICp684CloseoutHandoff();
const cp685Hermes = createExternalIntegrationsICp685HermesEvidencePacket(cp685Descriptor);
const cp685Claude = createExternalIntegrationsICp685ClaudeReviewPacket(cp685Descriptor);
const cp685Handoff = createExternalIntegrationsICp685CloseoutHandoff();
const cp686Hermes = createExternalIntegrationsICp686HermesEvidencePacket(cp686Descriptor);
const cp686Claude = createExternalIntegrationsICp686ClaudeReviewPacket(cp686Descriptor);
const cp686Handoff = createExternalIntegrationsICp686CloseoutHandoff();
const cp687Hermes = createExternalIntegrationsICp687HermesEvidencePacket(cp687Descriptor);
const cp687Claude = createExternalIntegrationsICp687ClaudeReviewPacket(cp687Descriptor);
const cp687Handoff = createExternalIntegrationsICp687CloseoutHandoff();
const cp688Hermes = createExternalIntegrationsICp688HermesEvidencePacket(cp688Descriptor);
const cp688Claude = createExternalIntegrationsICp688ClaudeReviewPacket(cp688Descriptor);
const cp688Handoff = createExternalIntegrationsICp688CloseoutHandoff();
const cp689Hermes = createExternalIntegrationsICp689HermesEvidencePacket(cp689Descriptor);
const cp689Claude = createExternalIntegrationsICp689ClaudeReviewPacket(cp689Descriptor);
const cp689Handoff = createExternalIntegrationsICp689CloseoutHandoff();
const cp690Hermes = createExternalIntegrationsICp690HermesEvidencePacket(cp690Descriptor);
const cp690Claude = createExternalIntegrationsICp690ClaudeReviewPacket(cp690Descriptor);
const cp690Handoff = createExternalIntegrationsICp690CloseoutHandoff();
const cp691Hermes = createExternalIntegrationsICp691HermesEvidencePacket(cp691Descriptor);
const cp691Claude = createExternalIntegrationsICp691ClaudeReviewPacket(cp691Descriptor);
const cp691Handoff = createExternalIntegrationsICp691CloseoutHandoff();
const cp692Hermes = createExternalIntegrationsICp692HermesEvidencePacket(cp692Descriptor);
const cp692Claude = createExternalIntegrationsICp692ClaudeReviewPacket(cp692Descriptor);
const cp692Handoff = createExternalIntegrationsICp692CloseoutHandoff();
const cp693Hermes = createExternalIntegrationsICp693HermesEvidencePacket(cp693Descriptor);
const cp693Claude = createExternalIntegrationsICp693ClaudeReviewPacket(cp693Descriptor);
const cp693Handoff = createExternalIntegrationsICp693CloseoutHandoff();
const projection = createExternalIntegrationsICoreContractProjection({
  cp666Descriptor,
  cp666Hermes,
  cp666Claude,
  cp666Handoff,
  cp667Descriptor,
  cp667Hermes,
  cp667Claude,
  cp667Handoff,
  cp668Descriptor,
  cp668Hermes,
  cp668Claude,
  cp668Handoff,
  cp669Descriptor,
  cp669Hermes,
  cp669Claude,
  cp669Handoff,
  cp670Descriptor,
  cp670Hermes,
  cp670Claude,
  cp670Handoff,
  cp671Descriptor,
  cp671Hermes,
  cp671Claude,
  cp671Handoff,
  cp672Descriptor,
  cp672Hermes,
  cp672Claude,
  cp672Handoff,
  cp673Descriptor,
  cp673Hermes,
  cp673Claude,
  cp673Handoff,
  cp674Descriptor,
  cp674Hermes,
  cp674Claude,
  cp674Handoff,
  cp675Descriptor,
  cp675Hermes,
  cp675Claude,
  cp675Handoff,
  cp676Descriptor,
  cp676Hermes,
  cp676Claude,
  cp676Handoff,
  cp677Descriptor,
  cp677Hermes,
  cp677Claude,
  cp677Handoff,
  cp678Descriptor,
  cp678Hermes,
  cp678Claude,
  cp678Handoff,
  cp679Descriptor,
  cp679Hermes,
  cp679Claude,
  cp679Handoff,
  cp680Descriptor,
  cp680Hermes,
  cp680Claude,
  cp680Handoff,
  cp681Descriptor,
  cp681Hermes,
  cp681Claude,
  cp681Handoff,
  cp682Descriptor,
  cp682Hermes,
  cp682Claude,
  cp682Handoff,
  cp683Descriptor,
  cp683Hermes,
  cp683Claude,
  cp683Handoff,
  cp684Descriptor,
  cp684Hermes,
  cp684Claude,
  cp684Handoff,
  cp685Descriptor,
  cp685Hermes,
  cp685Claude,
  cp685Handoff,
  cp686Descriptor,
  cp686Hermes,
  cp686Claude,
  cp686Handoff,
  cp687Descriptor,
  cp687Hermes,
  cp687Claude,
  cp687Handoff,
  cp688Descriptor,
  cp688Hermes,
  cp688Claude,
  cp688Handoff,
  cp689Descriptor,
  cp689Hermes,
  cp689Claude,
  cp689Handoff,
  cp690Descriptor,
  cp690Hermes,
  cp690Claude,
  cp690Handoff,
  cp691Descriptor,
  cp691Hermes,
  cp691Claude,
  cp691Handoff,
  cp692Descriptor,
  cp692Hermes,
  cp692Claude,
  cp692Handoff,
  cp693Descriptor,
  cp693Hermes,
  cp693Claude,
  cp693Handoff,
});
const projectionValidation = validateExternalIntegrationsICoreContractProjection(projection);
assert.equal(projectionValidation.valid, true, projectionValidation.errors.join("\n"));

if (shouldWrite) {
  await writeJson(coreContractPath, projection);
  await writeJson(externalContractPath, projection);
}

assert(existsSync(coreContractPath), "contracts/integrations-core-contract.json must exist; run with --write");
assert(existsSync(externalContractPath), "contracts/external-integrations-i-contract.json must exist; run with --write");

const coreContract = await readJson(coreContractPath);
const externalContract = await readJson(externalContractPath);
const coreValidation = validateExternalIntegrationsICoreContractProjection(coreContract, { expectedProjection: projection });
const externalValidation = validateExternalIntegrationsICoreContractProjection(externalContract, { expectedProjection: projection });
assert.equal(coreValidation.valid, true, coreValidation.errors.join("\n"));
assert.equal(externalValidation.valid, true, externalValidation.errors.join("\n"));

console.log("RP22 External Integrations I contract validation passed.");
console.log(`pack: ${EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id}`);
console.log(`units: ${cp693Coverage.summary.unit_count}`);
console.log(`range: ${EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.range}`);
console.log(`contracts: ${coreContractPath.pathname}, ${externalContractPath.pathname}`);
