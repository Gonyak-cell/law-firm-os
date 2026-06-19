import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import closeoutPlan from "../../../docs/closeout-pack-plan/closeout-pack-plan.json" with { type: "json" };
import dmsContract from "../../../contracts/dms-core-contract.json" with { type: "json" };
import {
  DMS_CORE_CP198_NO_WRITE_ATTESTATION,
  DMS_CORE_CP198_PACK_BINDING,
  DMS_CORE_CP198_REQUIREMENTS,
  DMS_CORE_CP199_NO_WRITE_ATTESTATION,
  DMS_CORE_CP199_PACK_BINDING,
  DMS_CORE_CP199_REQUIREMENTS,
  DMS_CORE_CP200_NO_WRITE_ATTESTATION,
  DMS_CORE_CP200_PACK_BINDING,
  DMS_CORE_CP200_REQUIREMENTS,
  DMS_CORE_CP201_NO_WRITE_ATTESTATION,
  DMS_CORE_CP201_PACK_BINDING,
  DMS_CORE_CP201_REQUIREMENTS,
  DMS_CORE_CP202_NO_WRITE_ATTESTATION,
  DMS_CORE_CP202_PACK_BINDING,
  DMS_CORE_CP202_REQUIREMENTS,
  DMS_CORE_CP203_NO_WRITE_ATTESTATION,
  DMS_CORE_CP203_PACK_BINDING,
  DMS_CORE_CP203_REQUIREMENTS,
  DMS_CORE_CP204_NO_WRITE_ATTESTATION,
  DMS_CORE_CP204_PACK_BINDING,
  DMS_CORE_CP204_REQUIREMENTS,
  DMS_CORE_CP205_NO_WRITE_ATTESTATION,
  DMS_CORE_CP205_PACK_BINDING,
  DMS_CORE_CP205_REQUIREMENTS,
  DMS_CORE_CP206_NO_WRITE_ATTESTATION,
  DMS_CORE_CP206_PACK_BINDING,
  DMS_CORE_CP206_REQUIREMENTS,
  DMS_CORE_CP207_NO_WRITE_ATTESTATION,
  DMS_CORE_CP207_PACK_BINDING,
  DMS_CORE_CP207_REQUIREMENTS,
  DMS_CORE_CP208_NO_WRITE_ATTESTATION,
  DMS_CORE_CP208_PACK_BINDING,
  DMS_CORE_CP208_REQUIREMENTS,
  DMS_CORE_CP209_NO_WRITE_ATTESTATION,
  DMS_CORE_CP209_PACK_BINDING,
  DMS_CORE_CP209_REQUIREMENTS,
  DMS_CORE_CP210_NO_WRITE_ATTESTATION,
  DMS_CORE_CP210_PACK_BINDING,
  DMS_CORE_CP210_REQUIREMENTS,
  DMS_CORE_CP211_NO_WRITE_ATTESTATION,
  DMS_CORE_CP211_PACK_BINDING,
  DMS_CORE_CP211_REQUIREMENTS,
  DMS_CORE_CP212_NO_WRITE_ATTESTATION,
  DMS_CORE_CP212_PACK_BINDING,
  DMS_CORE_CP212_REQUIREMENTS,
  DMS_CORE_CP213_NO_WRITE_ATTESTATION,
  DMS_CORE_CP213_PACK_BINDING,
  DMS_CORE_CP213_REQUIREMENTS,
  DMS_CORE_CP214_NO_WRITE_ATTESTATION,
  DMS_CORE_CP214_PACK_BINDING,
  DMS_CORE_CP214_REQUIREMENTS,
  DMS_CORE_CP215_NO_WRITE_ATTESTATION,
  DMS_CORE_CP215_PACK_BINDING,
  DMS_CORE_CP215_REQUIREMENTS,
  DMS_CORE_CP216_NO_WRITE_ATTESTATION,
  DMS_CORE_CP216_PACK_BINDING,
  DMS_CORE_CP216_REQUIREMENTS,
  DMS_CORE_CP217_NO_WRITE_ATTESTATION,
  DMS_CORE_CP217_PACK_BINDING,
  DMS_CORE_CP217_REQUIREMENTS,
  DMS_CORE_CP218_NO_WRITE_ATTESTATION,
  DMS_CORE_CP218_PACK_BINDING,
  DMS_CORE_CP218_REQUIREMENTS,
  DMS_CORE_CP219_NO_WRITE_ATTESTATION,
  DMS_CORE_CP219_PACK_BINDING,
  DMS_CORE_CP219_REQUIREMENTS,
  DMS_CORE_CP220_NO_WRITE_ATTESTATION,
  DMS_CORE_CP220_PACK_BINDING,
  DMS_CORE_CP220_REQUIREMENTS,
  DMS_CORE_CP221_NO_WRITE_ATTESTATION,
  DMS_CORE_CP221_PACK_BINDING,
  DMS_CORE_CP221_REQUIREMENTS,
  DMS_CORE_CP222_NO_WRITE_ATTESTATION,
  DMS_CORE_CP222_PACK_BINDING,
  DMS_CORE_CP222_REQUIREMENTS,
  DMS_CORE_CP223_NO_WRITE_ATTESTATION,
  DMS_CORE_CP223_PACK_BINDING,
  DMS_CORE_CP223_REQUIREMENTS,
  DMS_CORE_CP224_NO_WRITE_ATTESTATION,
  DMS_CORE_CP224_PACK_BINDING,
  DMS_CORE_CP224_REQUIREMENTS,
  DMS_CORE_CP225_NO_WRITE_ATTESTATION,
  DMS_CORE_CP225_PACK_BINDING,
  DMS_CORE_CP225_REQUIREMENTS,
  DMS_CORE_CP226_NO_WRITE_ATTESTATION,
  DMS_CORE_CP226_PACK_BINDING,
  DMS_CORE_CP226_REQUIREMENTS,
  DMS_CORE_CP227_NO_WRITE_ATTESTATION,
  DMS_CORE_CP227_PACK_BINDING,
  DMS_CORE_CP227_REQUIREMENTS,
  DMS_CORE_CP228_NO_WRITE_ATTESTATION,
  DMS_CORE_CP228_PACK_BINDING,
  DMS_CORE_CP228_REQUIREMENTS,
  DMS_CORE_CP229_NO_WRITE_ATTESTATION,
  DMS_CORE_CP229_PACK_BINDING,
  DMS_CORE_CP229_REQUIREMENTS,
  DMS_CORE_CP230_NO_WRITE_ATTESTATION,
  DMS_CORE_CP230_PACK_BINDING,
  DMS_CORE_CP230_REQUIREMENTS,
  DMS_CORE_CP231_NO_WRITE_ATTESTATION,
  DMS_CORE_CP231_PACK_BINDING,
  DMS_CORE_CP231_REQUIREMENTS,
  DMS_CORE_CP232_NO_WRITE_ATTESTATION,
  DMS_CORE_CP232_PACK_BINDING,
  DMS_CORE_CP232_REQUIREMENTS,
  DMS_CORE_CP233_NO_WRITE_ATTESTATION,
  DMS_CORE_CP233_PACK_BINDING,
  DMS_CORE_CP233_REQUIREMENTS,
  DMS_CORE_CP234_NO_WRITE_ATTESTATION,
  DMS_CORE_CP234_PACK_BINDING,
  DMS_CORE_CP234_REQUIREMENTS,
  DMS_CORE_MODEL_DEFINITIONS,
  DMS_CORE_OPTIONAL_FIELD_REGISTRY,
  DMS_CORE_REQUIRED_FIELD_REGISTRY,
  DMS_CORE_STATE_TRANSITION_MAP,
  createDmsCoreCp198ClaudeReviewPacket,
  createDmsCoreCp198CloseoutHandoff,
  createDmsCoreCp198HermesEvidencePacket,
  createDmsCoreCp199ClaudeReviewPacket,
  createDmsCoreCp199CloseoutHandoff,
  createDmsCoreCp199FixtureModel,
  createDmsCoreCp199HermesEvidencePacket,
  createDmsCoreCp199TypeShapeDescriptor,
  createDmsCoreCp200ClaudeReviewPacket,
  createDmsCoreCp200CloseoutHandoff,
  createDmsCoreCp200FixtureModel,
  createDmsCoreCp200HermesEvidencePacket,
  createDmsCoreCp200PermissionAuditDescriptor,
  createDmsCoreCp201ClaudeReviewPacket,
  createDmsCoreCp201CloseoutHandoff,
  createDmsCoreCp201GoldenCaseSet,
  createDmsCoreCp201HermesEvidencePacket,
  createDmsCoreCp201ServiceContractDescriptor,
  createDmsCoreCp201ServiceDescriptor,
  createDmsCoreCp202ClaudeReviewPacket,
  createDmsCoreCp202CloseoutHandoff,
  createDmsCoreCp202HermesEvidencePacket,
  createDmsCoreCp202RouteMatrix,
  createDmsCoreCp203ClaudeReviewPacket,
  createDmsCoreCp203CloseoutHandoff,
  createDmsCoreCp203HermesEvidencePacket,
  createDmsCoreCp203SensitiveTailCaseSet,
  createDmsCoreCp203SensitiveTailDescriptor,
  createDmsCoreCp204ClaudeReviewPacket,
  createDmsCoreCp204CloseoutHandoff,
  createDmsCoreCp204HermesEvidencePacket,
  createDmsCoreCp204PermissionAuditGateSet,
  createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor,
  createDmsCoreCp205ClaudeReviewPacket,
  createDmsCoreCp205CloseoutHandoff,
  createDmsCoreCp205HermesEvidencePacket,
  createDmsCoreCp205PermissionAuditTailCaseSet,
  createDmsCoreCp205PermissionAuditTailDescriptor,
  createDmsCoreCp206ClaudeReviewPacket,
  createDmsCoreCp206CloseoutHandoff,
  createDmsCoreCp206HermesEvidencePacket,
  createDmsCoreCp206SyntheticFixtureServiceCaseSet,
  createDmsCoreCp206SyntheticFixtureServiceDescriptor,
  createDmsCoreCp207ClaudeReviewPacket,
  createDmsCoreCp207CloseoutHandoff,
  createDmsCoreCp207HermesEvidencePacket,
  createDmsCoreCp207SyntheticFixtureWorkflowCaseSet,
  createDmsCoreCp207SyntheticFixtureWorkflowDescriptor,
  createDmsCoreCp208ClaudeReviewPacket,
  createDmsCoreCp208CloseoutHandoff,
  createDmsCoreCp208HermesEvidencePacket,
  createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet,
  createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor,
  createDmsCoreCp209ClaudeReviewPacket,
  createDmsCoreCp209CloseoutHandoff,
  createDmsCoreCp209GoldenCaseHermesCycleCaseSet,
  createDmsCoreCp209GoldenCaseHermesCycleDescriptor,
  createDmsCoreCp209HermesEvidencePacket,
  createDmsCoreCp210ClaudeReviewPacket,
  createDmsCoreCp210CloseoutHandoff,
  createDmsCoreCp210HermesEvidencePacket,
  createDmsCoreCp210P02CloseoutP03FoundationCaseSet,
  createDmsCoreCp210P02CloseoutP03FoundationDescriptor,
  createDmsCoreCp211ClaudeReviewPacket,
  createDmsCoreCp211CloseoutHandoff,
  createDmsCoreCp211HermesEvidencePacket,
  createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet,
  createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor,
  createDmsCoreCp212ClaudeReviewPacket,
  createDmsCoreCp212CloseoutHandoff,
  createDmsCoreCp212HermesEvidencePacket,
  createDmsCoreCp212UiPrimarySliceTailCaseSet,
  createDmsCoreCp212UiPrimarySliceTailDescriptor,
  createDmsCoreCp213ClaudeReviewPacket,
  createDmsCoreCp213CloseoutHandoff,
  createDmsCoreCp213HermesEvidencePacket,
  createDmsCoreCp213UiSecondarySliceBindingCaseSet,
  createDmsCoreCp213UiSecondarySliceBindingDescriptor,
  createDmsCoreCp214ClaudeReviewPacket,
  createDmsCoreCp214CloseoutHandoff,
  createDmsCoreCp214HermesEvidencePacket,
  createDmsCoreCp214UiBindingTailCaseSet,
  createDmsCoreCp214UiBindingTailDescriptor,
  createDmsCoreCp215ClaudeReviewPacket,
  createDmsCoreCp215CloseoutHandoff,
  createDmsCoreCp215HermesEvidencePacket,
  createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet,
  createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor,
  createDmsCoreCp216ClaudeReviewPacket,
  createDmsCoreCp216CloseoutHandoff,
  createDmsCoreCp216FixtureCaseSliceCaseSet,
  createDmsCoreCp216FixtureCaseSliceDescriptor,
  createDmsCoreCp216HermesEvidencePacket,
  createDmsCoreCp217ClaudeReviewPacket,
  createDmsCoreCp217CloseoutHandoff,
  createDmsCoreCp217FixtureBindingSliceCaseSet,
  createDmsCoreCp217FixtureBindingSliceDescriptor,
  createDmsCoreCp217HermesEvidencePacket,
  createDmsCoreCp218ClaudeReviewPacket,
  createDmsCoreCp218CloseoutHandoff,
  createDmsCoreCp218FixtureSetTailCaseSet,
  createDmsCoreCp218FixtureSetTailDescriptor,
  createDmsCoreCp218HermesEvidencePacket,
  createDmsCoreCp219ClaudeReviewPacket,
  createDmsCoreCp219CloseoutHandoff,
  createDmsCoreCp219HermesEvidencePacket,
  createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet,
  createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor,
  createDmsCoreCp220ClaudeReviewPacket,
  createDmsCoreCp220CloseoutHandoff,
  createDmsCoreCp220HermesEvidencePacket,
  createDmsCoreCp220PermissionMatrixSliceCaseSet,
  createDmsCoreCp220PermissionMatrixSliceDescriptor,
  createDmsCoreCp221ClaudeReviewPacket,
  createDmsCoreCp221CloseoutHandoff,
  createDmsCoreCp221HermesEvidencePacket,
  createDmsCoreCp221PermissionWorkflowSliceCaseSet,
  createDmsCoreCp221PermissionWorkflowSliceDescriptor,
  createDmsCoreCp222ClaudeReviewPacket,
  createDmsCoreCp222CloseoutHandoff,
  createDmsCoreCp222HermesEvidencePacket,
  createDmsCoreCp222PermissionAuditBindingSliceCaseSet,
  createDmsCoreCp222PermissionAuditBindingSliceDescriptor,
  createDmsCoreCp223ClaudeReviewPacket,
  createDmsCoreCp223CloseoutHandoff,
  createDmsCoreCp223HermesEvidencePacket,
  createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet,
  createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor,
  createDmsCoreCp224ClaudeReviewPacket,
  createDmsCoreCp224CloseoutHandoff,
  createDmsCoreCp224FailureRecoverySliceCaseSet,
  createDmsCoreCp224FailureRecoverySliceDescriptor,
  createDmsCoreCp224HermesEvidencePacket,
  createDmsCoreCp225ClaudeReviewPacket,
  createDmsCoreCp225CloseoutHandoff,
  createDmsCoreCp225FailureBindingSliceCaseSet,
  createDmsCoreCp225FailureBindingSliceDescriptor,
  createDmsCoreCp225HermesEvidencePacket,
  createDmsCoreCp226ClaudeReviewPacket,
  createDmsCoreCp226CloseoutHandoff,
  createDmsCoreCp226FailureAuditTailCaseSet,
  createDmsCoreCp226FailureAuditTailDescriptor,
  createDmsCoreCp226HermesEvidencePacket,
  createDmsCoreCp227ClaudeReviewPacket,
  createDmsCoreCp227CloseoutHandoff,
  createDmsCoreCp227HermesEvidencePacket,
  createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet,
  createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor,
  createDmsCoreCp228ClaudeReviewPacket,
  createDmsCoreCp228CloseoutHandoff,
  createDmsCoreCp228HermesEvidencePacket,
  createDmsCoreCp228HermesReceiptSliceCaseSet,
  createDmsCoreCp228HermesReceiptSliceDescriptor,
  createDmsCoreCp229ClaudeReviewPacket,
  createDmsCoreCp229CloseoutHandoff,
  createDmsCoreCp229HermesBindingSliceCaseSet,
  createDmsCoreCp229HermesBindingSliceDescriptor,
  createDmsCoreCp229HermesEvidencePacket,
  createDmsCoreCp230ClaudeReviewPacket,
  createDmsCoreCp230CloseoutHandoff,
  createDmsCoreCp230HermesEvidencePacket,
  createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet,
  createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor,
  createDmsCoreCp231ClaudeReviewPacket,
  createDmsCoreCp231CloseoutHandoff,
  createDmsCoreCp231HermesEvidencePacket,
  createDmsCoreCp231ReviewGateSliceCaseSet,
  createDmsCoreCp231ReviewGateSliceDescriptor,
  createDmsCoreCp232ClaudeReviewPacket,
  createDmsCoreCp232CloseoutHandoff,
  createDmsCoreCp232HermesEvidencePacket,
  createDmsCoreCp232ReviewAuditBindingCaseSet,
  createDmsCoreCp232ReviewAuditBindingDescriptor,
  createDmsCoreCp233ClaudeReviewPacket,
  createDmsCoreCp233CloseoutHandoff,
  createDmsCoreCp233HermesEvidencePacket,
  createDmsCoreCp233ReviewFixtureTailCaseSet,
  createDmsCoreCp233ReviewFixtureTailDescriptor,
  createDmsCoreCp234ClaudeReviewPacket,
  createDmsCoreCp234CloseoutHandoff,
  createDmsCoreCp234HermesEvidencePacket,
  createDmsCoreCp234P09ReviewCloseoutCaseSet,
  createDmsCoreCp234P09ReviewCloseoutDescriptor,
  dmsCoreCp210RowKey,
  createDmsCoreCp202WorkflowCaseSet,
  createDmsCoreCp202WorkflowDescriptor,
  createDmsCorePermissionAuditBindingRegistry,
  createDmsCoreRequiredFieldRegistry,
  createDmsCoreFoundationDescriptor,
  createDmsCoreModelShapeRegistry,
  createDmsCoreSyntheticFixture,
  createDmsDocument,
  createDmsFileObject,
  createDmsCoreServiceOutcomeDescriptor,
  normalizeDmsCoreServiceRequest,
  serializeDmsCoreDescriptor,
  listDmsCoreModelTypes,
  validateDmsCoreCp198Coverage,
  validateDmsCoreCp198Foundation,
  validateDmsCoreCp199Coverage,
  validateDmsCoreCp199ModelShapeRegistry,
  validateDmsCoreCp199SerializedDescriptor,
  validateDmsCoreCp199TypeShape,
  validateDmsCoreCp200Coverage,
  validateDmsCoreCp200FixtureIntegrity,
  validateDmsCoreCp200PermissionAuditBinding,
  validateDmsCoreCp201Coverage,
  validateDmsCoreCp201GoldenCases,
  validateDmsCoreCp201ServiceContract,
  validateDmsCoreCp202Coverage,
  validateDmsCoreCp202RouteMatrix,
  validateDmsCoreCp202WorkflowDescriptor,
  validateDmsCoreCp203Coverage,
  validateDmsCoreCp203SensitiveTailDescriptor,
  validateDmsCoreCp204Coverage,
  validateDmsCoreCp204PermissionAuditWorkflowBinding,
  validateDmsCoreCp205Coverage,
  validateDmsCoreCp205PermissionAuditTailDescriptor,
  validateDmsCoreCp206Coverage,
  validateDmsCoreCp206SyntheticFixtureServiceDescriptor,
  validateDmsCoreCp207Coverage,
  validateDmsCoreCp207SyntheticFixtureWorkflowDescriptor,
  validateDmsCoreCp208Coverage,
  validateDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor,
  validateDmsCoreCp209Coverage,
  validateDmsCoreCp209GoldenCaseHermesCycleDescriptor,
  validateDmsCoreCp210Coverage,
  validateDmsCoreCp210P02CloseoutP03FoundationDescriptor,
  validateDmsCoreCp211Coverage,
  validateDmsCoreCp211P03CloseoutP04UiFoundationDescriptor,
  validateDmsCoreCp212Coverage,
  validateDmsCoreCp212UiPrimarySliceTailDescriptor,
  validateDmsCoreCp213Coverage,
  validateDmsCoreCp213UiSecondarySliceBindingDescriptor,
  validateDmsCoreCp214Coverage,
  validateDmsCoreCp214UiBindingTailDescriptor,
  validateDmsCoreCp215Coverage,
  validateDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor,
  validateDmsCoreCp216Coverage,
  validateDmsCoreCp216FixtureCaseSliceDescriptor,
  validateDmsCoreCp217Coverage,
  validateDmsCoreCp217FixtureBindingSliceDescriptor,
  validateDmsCoreCp218Coverage,
  validateDmsCoreCp218FixtureSetTailDescriptor,
  validateDmsCoreCp219Coverage,
  validateDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor,
  validateDmsCoreCp220Coverage,
  validateDmsCoreCp220PermissionMatrixSliceDescriptor,
  validateDmsCoreCp221Coverage,
  validateDmsCoreCp221PermissionWorkflowSliceDescriptor,
  validateDmsCoreCp222Coverage,
  validateDmsCoreCp222PermissionAuditBindingSliceDescriptor,
  validateDmsCoreCp223Coverage,
  validateDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor,
  validateDmsCoreCp224Coverage,
  validateDmsCoreCp224FailureRecoverySliceDescriptor,
  validateDmsCoreCp225Coverage,
  validateDmsCoreCp225FailureBindingSliceDescriptor,
  validateDmsCoreCp226Coverage,
  validateDmsCoreCp226FailureAuditTailDescriptor,
  validateDmsCoreCp227Coverage,
  validateDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor,
  validateDmsCoreCp228Coverage,
  validateDmsCoreCp228HermesReceiptSliceDescriptor,
  validateDmsCoreCp229Coverage,
  validateDmsCoreCp229HermesBindingSliceDescriptor,
  validateDmsCoreCp230Coverage,
  validateDmsCoreCp230P08CloseoutP09ReviewGateDescriptor,
  validateDmsCoreCp231Coverage,
  validateDmsCoreCp231ReviewGateSliceDescriptor,
  validateDmsCoreCp232Coverage,
  validateDmsCoreCp232ReviewAuditBindingDescriptor,
  validateDmsCoreCp233Coverage,
  validateDmsCoreCp233ReviewFixtureTailDescriptor,
  validateDmsCoreCp234Coverage,
  validateDmsCoreCp234P09ReviewCloseoutDescriptor,
  validateDmsCoreRecord,
  validateDmsCoreRegistry,
} from "../src/index.js";

const cp198ManifestPath = new URL("../../../docs/closeout-packs/cp00-198/manifest.json", import.meta.url);
const cp198Manifest = existsSync(cp198ManifestPath) ? JSON.parse(readFileSync(cp198ManifestPath, "utf8")) : null;
const cp198PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-198") ?? cp198Manifest?.plan_binding_snapshot;
const cp199ManifestPath = new URL("../../../docs/closeout-packs/cp00-199/manifest.json", import.meta.url);
const cp199Manifest = existsSync(cp199ManifestPath) ? JSON.parse(readFileSync(cp199ManifestPath, "utf8")) : null;
const cp199PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-199") ?? cp199Manifest?.plan_binding_snapshot;
const cp200ManifestPath = new URL("../../../docs/closeout-packs/cp00-200/manifest.json", import.meta.url);
const cp200Manifest = existsSync(cp200ManifestPath) ? JSON.parse(readFileSync(cp200ManifestPath, "utf8")) : null;
const cp200PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-200") ?? cp200Manifest?.plan_binding_snapshot;
const cp201ManifestPath = new URL("../../../docs/closeout-packs/cp00-201/manifest.json", import.meta.url);
const cp201Manifest = existsSync(cp201ManifestPath) ? JSON.parse(readFileSync(cp201ManifestPath, "utf8")) : null;
const cp201PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-201") ?? cp201Manifest?.plan_binding_snapshot;
const cp202ManifestPath = new URL("../../../docs/closeout-packs/cp00-202/manifest.json", import.meta.url);
const cp202Manifest = existsSync(cp202ManifestPath) ? JSON.parse(readFileSync(cp202ManifestPath, "utf8")) : null;
const cp202PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-202") ?? cp202Manifest?.plan_binding_snapshot;
const cp203ManifestPath = new URL("../../../docs/closeout-packs/cp00-203/manifest.json", import.meta.url);
const cp203Manifest = existsSync(cp203ManifestPath) ? JSON.parse(readFileSync(cp203ManifestPath, "utf8")) : null;
const cp203PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-203") ?? cp203Manifest?.plan_binding_snapshot;
const cp204ManifestPath = new URL("../../../docs/closeout-packs/cp00-204/manifest.json", import.meta.url);
const cp204Manifest = existsSync(cp204ManifestPath) ? JSON.parse(readFileSync(cp204ManifestPath, "utf8")) : null;
const cp204PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-204") ?? cp204Manifest?.plan_binding_snapshot;
const cp205ManifestPath = new URL("../../../docs/closeout-packs/cp00-205/manifest.json", import.meta.url);
const cp205Manifest = existsSync(cp205ManifestPath) ? JSON.parse(readFileSync(cp205ManifestPath, "utf8")) : null;
const cp205PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-205") ?? cp205Manifest?.plan_binding_snapshot;
const cp206ManifestPath = new URL("../../../docs/closeout-packs/cp00-206/manifest.json", import.meta.url);
const cp206Manifest = existsSync(cp206ManifestPath) ? JSON.parse(readFileSync(cp206ManifestPath, "utf8")) : null;
const cp206PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-206") ?? cp206Manifest?.plan_binding_snapshot;
const cp207ManifestPath = new URL("../../../docs/closeout-packs/cp00-207/manifest.json", import.meta.url);
const cp207Manifest = existsSync(cp207ManifestPath) ? JSON.parse(readFileSync(cp207ManifestPath, "utf8")) : null;
const cp207PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-207") ?? cp207Manifest?.plan_binding_snapshot;
const cp208ManifestPath = new URL("../../../docs/closeout-packs/cp00-208/manifest.json", import.meta.url);
const cp208Manifest = existsSync(cp208ManifestPath) ? JSON.parse(readFileSync(cp208ManifestPath, "utf8")) : null;
const cp208PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-208") ?? cp208Manifest?.plan_binding_snapshot;
const cp209ManifestPath = new URL("../../../docs/closeout-packs/cp00-209/manifest.json", import.meta.url);
const cp209Manifest = existsSync(cp209ManifestPath) ? JSON.parse(readFileSync(cp209ManifestPath, "utf8")) : null;
const cp209PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-209") ?? cp209Manifest?.plan_binding_snapshot;
const cp210ManifestPath = new URL("../../../docs/closeout-packs/cp00-210/manifest.json", import.meta.url);
const cp210Manifest = existsSync(cp210ManifestPath) ? JSON.parse(readFileSync(cp210ManifestPath, "utf8")) : null;
const cp210PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-210") ?? cp210Manifest?.plan_binding_snapshot;
const cp211ManifestPath = new URL("../../../docs/closeout-packs/cp00-211/manifest.json", import.meta.url);
const cp211Manifest = existsSync(cp211ManifestPath) ? JSON.parse(readFileSync(cp211ManifestPath, "utf8")) : null;
const cp211PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-211") ?? cp211Manifest?.plan_binding_snapshot;
const cp212ManifestPath = new URL("../../../docs/closeout-packs/cp00-212/manifest.json", import.meta.url);
const cp212Manifest = existsSync(cp212ManifestPath) ? JSON.parse(readFileSync(cp212ManifestPath, "utf8")) : null;
const cp212PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-212") ?? cp212Manifest?.plan_binding_snapshot;
const cp213ManifestPath = new URL("../../../docs/closeout-packs/cp00-213/manifest.json", import.meta.url);
const cp213Manifest = existsSync(cp213ManifestPath) ? JSON.parse(readFileSync(cp213ManifestPath, "utf8")) : null;
const cp213PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-213") ?? cp213Manifest?.plan_binding_snapshot;
const cp214ManifestPath = new URL("../../../docs/closeout-packs/cp00-214/manifest.json", import.meta.url);
const cp214Manifest = existsSync(cp214ManifestPath) ? JSON.parse(readFileSync(cp214ManifestPath, "utf8")) : null;
const cp214PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-214") ?? cp214Manifest?.plan_binding_snapshot;
const cp215ManifestPath = new URL("../../../docs/closeout-packs/cp00-215/manifest.json", import.meta.url);
const cp215Manifest = existsSync(cp215ManifestPath) ? JSON.parse(readFileSync(cp215ManifestPath, "utf8")) : null;
const cp215PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-215") ?? cp215Manifest?.plan_binding_snapshot;
const cp216ManifestPath = new URL("../../../docs/closeout-packs/cp00-216/manifest.json", import.meta.url);
const cp216Manifest = existsSync(cp216ManifestPath) ? JSON.parse(readFileSync(cp216ManifestPath, "utf8")) : null;
const cp216PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-216") ?? cp216Manifest?.plan_binding_snapshot;
const cp217ManifestPath = new URL("../../../docs/closeout-packs/cp00-217/manifest.json", import.meta.url);
const cp217Manifest = existsSync(cp217ManifestPath) ? JSON.parse(readFileSync(cp217ManifestPath, "utf8")) : null;
const cp217PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-217") ?? cp217Manifest?.plan_binding_snapshot;
const cp218ManifestPath = new URL("../../../docs/closeout-packs/cp00-218/manifest.json", import.meta.url);
const cp218Manifest = existsSync(cp218ManifestPath) ? JSON.parse(readFileSync(cp218ManifestPath, "utf8")) : null;
const cp218PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-218") ?? cp218Manifest?.plan_binding_snapshot;
const cp219ManifestPath = new URL("../../../docs/closeout-packs/cp00-219/manifest.json", import.meta.url);
const cp219Manifest = existsSync(cp219ManifestPath) ? JSON.parse(readFileSync(cp219ManifestPath, "utf8")) : null;
const cp219PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-219") ?? cp219Manifest?.plan_binding_snapshot;
const cp220ManifestPath = new URL("../../../docs/closeout-packs/cp00-220/manifest.json", import.meta.url);
const cp220Manifest = existsSync(cp220ManifestPath) ? JSON.parse(readFileSync(cp220ManifestPath, "utf8")) : null;
const cp220PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-220") ?? cp220Manifest?.plan_binding_snapshot;
const cp221ManifestPath = new URL("../../../docs/closeout-packs/cp00-221/manifest.json", import.meta.url);
const cp221Manifest = existsSync(cp221ManifestPath) ? JSON.parse(readFileSync(cp221ManifestPath, "utf8")) : null;
const cp221PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-221") ?? cp221Manifest?.plan_binding_snapshot;
const cp222ManifestPath = new URL("../../../docs/closeout-packs/cp00-222/manifest.json", import.meta.url);
const cp222Manifest = existsSync(cp222ManifestPath) ? JSON.parse(readFileSync(cp222ManifestPath, "utf8")) : null;
const cp222PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-222") ?? cp222Manifest?.plan_binding_snapshot;
const cp223ManifestPath = new URL("../../../docs/closeout-packs/cp00-223/manifest.json", import.meta.url);
const cp223Manifest = existsSync(cp223ManifestPath) ? JSON.parse(readFileSync(cp223ManifestPath, "utf8")) : null;
const cp223PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-223") ?? cp223Manifest?.plan_binding_snapshot;
const cp224ManifestPath = new URL("../../../docs/closeout-packs/cp00-224/manifest.json", import.meta.url);
const cp224Manifest = existsSync(cp224ManifestPath) ? JSON.parse(readFileSync(cp224ManifestPath, "utf8")) : null;
const cp224PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-224") ?? cp224Manifest?.plan_binding_snapshot;
const cp225ManifestPath = new URL("../../../docs/closeout-packs/cp00-225/manifest.json", import.meta.url);
const cp225Manifest = existsSync(cp225ManifestPath) ? JSON.parse(readFileSync(cp225ManifestPath, "utf8")) : null;
const cp225PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-225") ?? cp225Manifest?.plan_binding_snapshot;
const cp226ManifestPath = new URL("../../../docs/closeout-packs/cp00-226/manifest.json", import.meta.url);
const cp226Manifest = existsSync(cp226ManifestPath) ? JSON.parse(readFileSync(cp226ManifestPath, "utf8")) : null;
const cp226PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-226") ?? cp226Manifest?.plan_binding_snapshot;
const cp227ManifestPath = new URL("../../../docs/closeout-packs/cp00-227/manifest.json", import.meta.url);
const cp227Manifest = existsSync(cp227ManifestPath) ? JSON.parse(readFileSync(cp227ManifestPath, "utf8")) : null;
const cp227PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-227") ?? cp227Manifest?.plan_binding_snapshot;
const cp228ManifestPath = new URL("../../../docs/closeout-packs/cp00-228/manifest.json", import.meta.url);
const cp228Manifest = existsSync(cp228ManifestPath) ? JSON.parse(readFileSync(cp228ManifestPath, "utf8")) : null;
const cp228PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-228") ?? cp228Manifest?.plan_binding_snapshot;
const cp229ManifestPath = new URL("../../../docs/closeout-packs/cp00-229/manifest.json", import.meta.url);
const cp229Manifest = existsSync(cp229ManifestPath) ? JSON.parse(readFileSync(cp229ManifestPath, "utf8")) : null;
const cp229PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-229") ?? cp229Manifest?.plan_binding_snapshot;
const cp230ManifestPath = new URL("../../../docs/closeout-packs/cp00-230/manifest.json", import.meta.url);
const cp230Manifest = existsSync(cp230ManifestPath) ? JSON.parse(readFileSync(cp230ManifestPath, "utf8")) : null;
const cp230PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-230") ?? cp230Manifest?.plan_binding_snapshot;
const cp231ManifestPath = new URL("../../../docs/closeout-packs/cp00-231/manifest.json", import.meta.url);
const cp231Manifest = existsSync(cp231ManifestPath) ? JSON.parse(readFileSync(cp231ManifestPath, "utf8")) : null;
const cp231PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-231") ?? cp231Manifest?.plan_binding_snapshot;
const cp232ManifestPath = new URL("../../../docs/closeout-packs/cp00-232/manifest.json", import.meta.url);
const cp232Manifest = existsSync(cp232ManifestPath) ? JSON.parse(readFileSync(cp232ManifestPath, "utf8")) : null;
const cp232PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-232") ?? cp232Manifest?.plan_binding_snapshot;
const cp233ManifestPath = new URL("../../../docs/closeout-packs/cp00-233/manifest.json", import.meta.url);
const cp233Manifest = existsSync(cp233ManifestPath) ? JSON.parse(readFileSync(cp233ManifestPath, "utf8")) : null;
const cp233PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-233") ?? cp233Manifest?.plan_binding_snapshot;
const cp234ManifestPath = new URL("../../../docs/closeout-packs/cp00-234/manifest.json", import.meta.url);
const cp234Manifest = existsSync(cp234ManifestPath) ? JSON.parse(readFileSync(cp234ManifestPath, "utf8")) : null;
const cp234PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-234") ?? cp234Manifest?.plan_binding_snapshot;

test("CP00-198 plan binding covers the planned 150 RP06 DMS Core units", () => {
  const coverage = validateDmsCoreCp198Coverage(cp198PlanPack);

  assert.equal(DMS_CORE_CP198_PACK_BINDING.pack_id, "CP00-198");
  assert.equal(DMS_CORE_CP198_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP198_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP198_PACK_BINDING.range, "RP06.P00.M00.S01-RP06.P01.M02.S08");
  assert.equal(DMS_CORE_CP198_PACK_BINDING.upstream_pack_id, "CP00-197");
  assert.equal(DMS_CORE_CP198_PACK_BINDING.next_pack_id, "CP00-199");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP06.P01"], 28);
  assert.equal(coverage.summary.by_deliverable.implementation, 108);
  assert.equal(coverage.summary.by_deliverable.contract, 8);
  assert.equal(coverage.summary.by_deliverable.security_audit, 16);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 7);
  assert.equal(coverage.summary.by_deliverable.claude_review, 3);
  assert.equal(coverage.summary.by_deliverable.ui, 8);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 20);
  assert.equal(coverage.summary.by_micro_title["Test And Golden Case Set"], 20);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 18);
});

test("DMS Core registry is matter-first version-safe and descriptor-only", () => {
  const registry = validateDmsCoreRegistry();

  assert.equal(registry.valid, true, registry.errors.join("; "));
  assert.equal(registry.model_count, 10);
  assert.ok(listDmsCoreModelTypes().includes("DmsDocument"));
  assert.ok(listDmsCoreModelTypes().includes("DmsDocumentVersion"));
  assert.ok(listDmsCoreModelTypes().includes("DmsFileObject"));
  assert.equal(DMS_CORE_MODEL_DEFINITIONS.DmsDocument.owner_module, "legal-workspace-dms");
  assert.ok(DMS_CORE_MODEL_DEFINITIONS.DmsDocument.required_fields.includes("matter_id"));
  assert.ok(DMS_CORE_MODEL_DEFINITIONS.DmsDocument.required_fields.includes("permission_envelope_id"));
  assert.ok(DMS_CORE_MODEL_DEFINITIONS.DmsDocument.required_fields.includes("audit_trace_id"));
});

test("DMS Core synthetic fixture never loads document bytes text OCR search or email runtime", () => {
  const fixture = createDmsCoreSyntheticFixture();

  assert.equal(fixture.synthetic_only, true);
  assert.equal(fixture.no_real_data, true);
  assert.equal(fixture.writes_product_state, false);
  assert.equal(fixture.evaluates_runtime_permission, false);
  assert.equal(fixture.writes_audit_event, false);
  assert.equal(fixture.reads_object_storage, false);
  assert.equal(fixture.writes_object_storage, false);
  assert.equal(fixture.executes_ocr, false);
  assert.equal(fixture.executes_search_indexing, false);
  assert.equal(fixture.executes_email_runtime, false);
  assert.equal(fixture.exposes_document_bytes, false);
  assert.equal(fixture.exposes_extracted_text, false);
  assert.equal(fixture.document.version_safe_dms, true);
  assert.equal(fixture.document.matter_first_trace_required, true);
  assert.equal(fixture.file_object.object_storage_runtime_executed, false);
  assert.equal(fixture.extracted_text.raw_text_exposed, false);
  assert.equal(fixture.ocr_result.ocr_runtime_executed, false);
  assert.equal(fixture.email_thread.reserved_for_rp08, true);
});

test("CP00-198 committed contract snapshot matches generated DMS Core descriptors", () => {
  assert.deepEqual(dmsContract.model_definitions, DMS_CORE_MODEL_DEFINITIONS);
  assert.deepEqual(dmsContract.foundation_descriptor, createDmsCoreFoundationDescriptor());
});

test("DMS Core record validators enforce required matter permission and audit fields", () => {
  const invalid = createDmsDocument({
    document_id: "doc_missing_permission",
    tenant_id: "tenant_rp06_synthetic",
    matter_id: "matter_rp06_synthetic_opening",
    workspace_id: "workspace_rp06_synthetic",
    title: "Synthetic Evidence Document",
    status: "active",
    current_version_id: "docver_rp06_synthetic_v1",
    permission_envelope_id: "perm_rp06_synthetic_dms",
    audit_trace_id: "audit_rp06_synthetic_dms",
  });
  const validation = validateDmsCoreRecord("DmsDocument", {
    ...invalid,
    permission_envelope_id: "",
  });
  const fileObject = createDmsFileObject({
    file_object_id: "fileobj_rp06_synthetic_v1",
    tenant_id: "tenant_rp06_synthetic",
    matter_id: "matter_rp06_synthetic_opening",
    storage_pointer_ref: "object-store-ref:reserved-no-read",
    sha256: "0".repeat(64),
    byte_size: 0,
    mime_type: "application/pdf",
    permission_envelope_id: "perm_rp06_synthetic_dms",
    audit_trace_id: "audit_rp06_synthetic_dms",
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("missing required field permission_envelope_id"));
  assert.equal(fileObject.object_storage_runtime_executed, false);
  assert.equal(validateDmsCoreRecord("DmsFileObject", fileObject).valid, true);
});

test("CP00-198 descriptor contract and evidence packets preserve RP06 authority boundaries", () => {
  const descriptor = createDmsCoreFoundationDescriptor();
  const foundation = validateDmsCoreCp198Foundation(dmsContract, descriptor);
  const hermes = createDmsCoreCp198HermesEvidencePacket(cp198PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp198ClaudeReviewPacket(cp198PlanPack);
  const handoff = createDmsCoreCp198CloseoutHandoff();

  assert.equal(foundation.valid, true, foundation.errors.join("; "));
  assert.ok(
    [
      "CP00-198",
      "CP00-199",
      "CP00-200",
      "CP00-201",
      "CP00-202",
      "CP00-203",
      "CP00-204",
      "CP00-205",
      "CP00-206",
      "CP00-207",
      "CP00-208",
      "CP00-209",
      "CP00-210",
      "CP00-211",
      "CP00-212",
      "CP00-213",
      "CP00-214",
      "CP00-215",
      "CP00-216",
      "CP00-217",
      "CP00-218",
      "CP00-219",
      "CP00-220",
      "CP00-221",
      "CP00-222",
      "CP00-223",
      "CP00-224",
      "CP00-225",
      "CP00-226",
      "CP00-227",
      "CP00-228",
      "CP00-229",
      "CP00-230",
      "CP00-231",
      "CP00-232",
      "CP00-233",
      "CP00-234",
    ].includes(dmsContract.current_pack.pack_id),
  );
  assert.equal(dmsContract.program.program_id, "RP06");
  assert.equal(dmsContract.program.upstream_pack_id, "CP00-197");
  assert.equal(descriptor.source_matter_core_pack_id, "CP00-197");
  assert.equal(descriptor.permission_baseline.permission_decision_detail_exposed, false);
  assert.equal(descriptor.audit_baseline.audit_event_body_exposed, false);
  assert.equal(descriptor.audit_baseline.audit_event_written, false);
  assert.deepEqual(DMS_CORE_CP198_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_object_storage_read, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_object_storage_write, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_ocr, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_search_indexing, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.exposes_document_bytes, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.exposes_extracted_text, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-198.dms_core_foundation_model_registry");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-198.dms_core_foundation_model_registry");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-199");
  assert.equal(handoff.next_subphase_id, "RP06.P01.M02.S09");
});

test("CP00-199 plan binding covers the planned 40 RP06 DMS type-shape units", () => {
  const coverage = validateDmsCoreCp199Coverage(cp199PlanPack);

  assert.equal(DMS_CORE_CP199_PACK_BINDING.pack_id, "CP00-199");
  assert.equal(DMS_CORE_CP199_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP199_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP199_PACK_BINDING.range, "RP06.P01.M02.S09-RP06.P01.M04.S06");
  assert.equal(DMS_CORE_CP199_PACK_BINDING.upstream_pack_id, "CP00-198");
  assert.equal(DMS_CORE_CP199_PACK_BINDING.next_pack_id, "CP00-200");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP06.P01"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M02"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M04"], 6);
  assert.equal(coverage.summary.by_deliverable.implementation, 23);
  assert.equal(coverage.summary.by_deliverable.ui, 5);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 6);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 2);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
});

test("CP00-199 model shape registry binds required optional ownership and transition metadata", () => {
  const registry = createDmsCoreModelShapeRegistry();
  const validation = validateDmsCoreCp199ModelShapeRegistry(registry);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(registry.model_count, 10);
  assert.equal(registry.model_shapes.DmsDocument.primary_entity_identifier, "document_id");
  assert.equal(registry.model_shapes.DmsDocument.tenant_scope_field, "tenant_id");
  assert.equal(registry.model_shapes.DmsDocument.matter_trace_reference, "matter_id");
  assert.deepEqual(registry.model_shapes.DmsDocument.optional_fields, DMS_CORE_OPTIONAL_FIELD_REGISTRY.DmsDocument);
  assert.ok(registry.model_shapes.DmsDocument.reference_relationships.includes("current_version_id"));
  assert.ok(DMS_CORE_STATE_TRANSITION_MAP.active.includes("archived"));
  assert.equal(registry.model_shapes.DmsDocument.ownership_metadata.owner_module, "legal-workspace-dms");
});

test("CP00-199 fixture serialization is descriptor-only and blocks raw content exposure", () => {
  const fixture = createDmsCoreCp199FixtureModel();
  const serializedDocument = serializeDmsCoreDescriptor(fixture.records.find((record) => record.model_type === "DmsDocument"));
  const validation = validateDmsCoreCp199SerializedDescriptor(fixture.records.find((record) => record.model_type === "DmsDocument"));

  assert.equal(fixture.fixture_id, "dms-core-cp199-type-shape-fixture");
  assert.equal(fixture.serialized_records.length, 10);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(serializedDocument.envelope, "DmsCoreDescriptorEnvelope");
  assert.equal(serializedDocument.descriptor_ref, "DmsDocument:doc_rp06_synthetic");
  assert.equal(serializedDocument.raw_payload_included, false);
  assert.equal(serializedDocument.document_bytes_included, false);
  assert.equal(serializedDocument.extracted_text_included, false);
  assert.equal(serializedDocument.permission_decision_detail_included, false);
  assert.equal(serializedDocument.audit_event_body_included, false);
  assert.equal(serializedDocument.writes_product_state, false);
});

test("CP00-199 contract evidence packets and handoff preserve DMS runtime boundaries", () => {
  const descriptor = createDmsCoreCp199TypeShapeDescriptor();
  const typeShape = validateDmsCoreCp199TypeShape(dmsContract, descriptor);
  const hermes = createDmsCoreCp199HermesEvidencePacket(cp199PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp199ClaudeReviewPacket(cp199PlanPack);
  const handoff = createDmsCoreCp199CloseoutHandoff();

  assert.equal(typeShape.valid, true, typeShape.errors.join("; "));
  assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_object_storage_read, false);
  assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_ocr, false);
  assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_search_indexing, false);
  assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-199.dms_core_type_shape_service_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-199.dms_core_type_shape_service_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.deepEqual(DMS_CORE_CP199_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-200");
  assert.equal(handoff.next_subphase_id, "RP06.P01.M04.S07");
});

test("CP00-200 plan binding covers the planned 40 RP06 DMS permission audit fixture units", () => {
  const coverage = validateDmsCoreCp200Coverage(cp200PlanPack);

  assert.equal(DMS_CORE_CP200_PACK_BINDING.pack_id, "CP00-200");
  assert.equal(DMS_CORE_CP200_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP200_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP200_PACK_BINDING.range, "RP06.P01.M04.S07-RP06.P01.M06.S04");
  assert.equal(DMS_CORE_CP200_PACK_BINDING.upstream_pack_id, "CP00-199");
  assert.equal(DMS_CORE_CP200_PACK_BINDING.next_pack_id, "CP00-201");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP06.P01"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M04"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M06"], 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 22);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 6);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 2);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
});

test("CP00-200 permission and audit binding registry is descriptor-only for every DMS model", () => {
  const requiredRegistry = createDmsCoreRequiredFieldRegistry();
  const bindingRegistry = createDmsCorePermissionAuditBindingRegistry();
  const descriptor = createDmsCoreCp200PermissionAuditDescriptor();
  const validation = validateDmsCoreCp200PermissionAuditBinding(descriptor, dmsContract);

  assert.equal(requiredRegistry.model_count, 10);
  assert.deepEqual(requiredRegistry.required_fields_by_model, DMS_CORE_REQUIRED_FIELD_REGISTRY);
  assert.equal(bindingRegistry.binding_count, 10);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(bindingRegistry.bindings.DmsDocument.primary_entity_identifier, "document_id");
  assert.equal(bindingRegistry.bindings.DmsDocument.tenant_scope_field, "tenant_id");
  assert.equal(bindingRegistry.bindings.DmsDocument.matter_trace_reference, "matter_id");
  assert.equal(bindingRegistry.bindings.DmsDocument.permission_binding.envelope_required, true);
  assert.equal(bindingRegistry.bindings.DmsDocument.permission_binding.runtime_permission_evaluated, false);
  assert.equal(bindingRegistry.bindings.DmsDocument.audit_binding.trace_required, true);
  assert.equal(bindingRegistry.bindings.DmsDocument.audit_binding.audit_event_written, false);
  assert.deepEqual(DMS_CORE_CP200_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
});

test("CP00-200 fixture integrity covers invalid references ownership drift and no leak serialization", () => {
  const fixture = createDmsCoreCp200FixtureModel();
  const integrity = validateDmsCoreCp200FixtureIntegrity(fixture);
  const invalidCaseIds = fixture.invalid_reference_cases.map((item) => item.case_id);

  assert.equal(fixture.fixture_id, "dms-core-cp200-permission-audit-fixture");
  assert.equal(fixture.record_count, 10);
  assert.equal(integrity.valid, true, integrity.errors.join("; "));
  assert.ok(invalidCaseIds.includes("missing_permission_envelope_id"));
  assert.ok(invalidCaseIds.includes("missing_audit_trace_id"));
  assert.ok(invalidCaseIds.includes("cross_tenant_reference_blocked_by_descriptor"));
  assert.equal(fixture.ownership_drift_cases[0].case_id, "owner_module_must_remain_legal_workspace_dms");
  for (const record of fixture.records) {
    assert.equal(record.permission_envelope_id_present, true);
    assert.equal(record.audit_trace_id_present, true);
    assert.equal(record.serialized_descriptor.document_bytes_included, false);
    assert.equal(record.serialized_descriptor.extracted_text_included, false);
    assert.equal(record.serialized_descriptor.permission_decision_detail_included, false);
    assert.equal(record.serialized_descriptor.audit_event_body_included, false);
    assert.equal(record.permission_binding.runtime_permission_evaluated, false);
    assert.equal(record.audit_binding.audit_event_written, false);
  }
});

test("CP00-200 contract evidence packets and handoff preserve permission audit authority boundaries", () => {
  const descriptor = createDmsCoreCp200PermissionAuditDescriptor();
  const binding = validateDmsCoreCp200PermissionAuditBinding(descriptor, dmsContract);
  const hermes = createDmsCoreCp200HermesEvidencePacket(cp200PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp200ClaudeReviewPacket(cp200PlanPack);
  const handoff = createDmsCoreCp200CloseoutHandoff();

  assert.equal(binding.valid, true, binding.errors.join("; "));
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.dispatches_permission_runtime, false);
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.dispatches_audit_runtime, false);
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.exposes_permission_envelope_payload, false);
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.exposes_audit_trace_payload, false);
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-200.dms_core_permission_audit_fixture_binding");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-200.dms_core_permission_audit_fixture_binding");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-201");
  assert.equal(handoff.next_subphase_id, "RP06.P01.M06.S05");
});

test("CP00-201 plan binding covers the planned 150 RP06 DMS service and golden-case units", () => {
  const coverage = validateDmsCoreCp201Coverage(cp201PlanPack);

  assert.equal(DMS_CORE_CP201_PACK_BINDING.pack_id, "CP00-201");
  assert.equal(DMS_CORE_CP201_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP201_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP201_PACK_BINDING.range, "RP06.P01.M06.S05-RP06.P02.M02.S22");
  assert.equal(DMS_CORE_CP201_PACK_BINDING.upstream_pack_id, "CP00-200");
  assert.equal(DMS_CORE_CP201_PACK_BINDING.next_pack_id, "CP00-202");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P01"], 88);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 62);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP06.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M02"], 22);
  assert.equal(coverage.summary.by_deliverable.implementation, 77);
  assert.equal(coverage.summary.by_deliverable.ui, 23);
  assert.equal(coverage.summary.by_deliverable.fixture, 4);
  assert.equal(coverage.summary.by_deliverable.test, 20);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 7);
  assert.equal(coverage.summary.by_deliverable.contract, 3);
  assert.equal(coverage.summary.by_deliverable.security_audit, 6);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 6);
});

test("CP00-201 service contract models prechecks idempotency locks and persistence as descriptors", () => {
  const request = normalizeDmsCoreServiceRequest();
  const outcome = createDmsCoreServiceOutcomeDescriptor(request, "happy_path_descriptor");
  const contract = createDmsCoreCp201ServiceContractDescriptor();
  const descriptor = createDmsCoreCp201ServiceDescriptor();
  const validation = validateDmsCoreCp201ServiceContract(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(request.tenant_boundary_precheck, true);
  assert.equal(request.matter_trace_precheck, true);
  assert.equal(request.permission_precheck, true);
  assert.equal(request.audit_hint_precheck, true);
  assert.equal(request.persistence_boundary_closed, true);
  assert.equal(request.raw_payload_included, false);
  assert.equal(outcome.prechecks_pass, true);
  assert.equal(outcome.persistence_boundary.descriptor_only, true);
  assert.equal(outcome.persistence_boundary.persists_idempotency_key, false);
  assert.equal(outcome.persistence_boundary.acquires_runtime_lock, false);
  assert.equal(contract.entrypoint_contract.runtime_execution, false);
  assert.equal(contract.entrypoint_contract.rollback_behavior_descriptor, true);
  assert.equal(contract.entrypoint_contract.retry_behavior_descriptor, true);
  assert.deepEqual(DMS_CORE_CP201_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
});

test("CP00-201 golden cases cover happy denied review approval blocked rollback retry and smoke paths", () => {
  const goldenCases = createDmsCoreCp201GoldenCaseSet();
  const validation = validateDmsCoreCp201GoldenCases(goldenCases);
  const outcomes = goldenCases.records.map((record) => record.outcome);

  assert.equal(goldenCases.fixture_id, "dms-core-cp201-service-golden-case-set");
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(goldenCases.records.length, DMS_CORE_CP201_REQUIREMENTS.service_outcomes.length);
  for (const outcome of DMS_CORE_CP201_REQUIREMENTS.service_outcomes) assert.ok(outcomes.includes(outcome));
  assert.equal(goldenCases.records.find((record) => record.outcome === "happy_path_descriptor").prechecks_pass, true);
  assert.equal(goldenCases.records.find((record) => record.outcome === "denied_path_descriptor").request.tenant_boundary_precheck, false);
  assert.equal(goldenCases.records.find((record) => record.outcome === "blocked_claim_descriptor").allowed_operation, false);
  assert.equal(goldenCases.integration_smoke_case.covers_contract_descriptor, true);
  assert.equal(goldenCases.integration_smoke_case.executes_runtime, false);
});

test("CP00-201 contract evidence packets and handoff preserve service authority boundaries", () => {
  const descriptor = createDmsCoreCp201ServiceDescriptor();
  const service = validateDmsCoreCp201ServiceContract(descriptor, dmsContract);
  const goldenCases = validateDmsCoreCp201GoldenCases(descriptor.golden_cases);
  const hermes = createDmsCoreCp201HermesEvidencePacket(cp201PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp201ClaudeReviewPacket(cp201PlanPack);
  const handoff = createDmsCoreCp201CloseoutHandoff();

  assert.equal(service.valid, true, service.errors.join("; "));
  assert.equal(goldenCases.valid, true, goldenCases.errors.join("; "));
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.dispatches_dms_runtime_service, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.persists_idempotency_key, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.performs_retry_runtime, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-201.dms_core_service_contract_golden_case_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-201.dms_core_service_contract_golden_case_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-202");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M03.S01");
});

test("CP00-202 plan binding covers the planned 40 RP06 DMS workflow units", () => {
  const coverage = validateDmsCoreCp202Coverage(cp202PlanPack);

  assert.equal(DMS_CORE_CP202_PACK_BINDING.pack_id, "CP00-202");
  assert.equal(DMS_CORE_CP202_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP202_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP202_PACK_BINDING.range, "RP06.P02.M03.S01-RP06.P02.M04.S15");
  assert.equal(DMS_CORE_CP202_PACK_BINDING.upstream_pack_id, "CP00-201");
  assert.equal(DMS_CORE_CP202_PACK_BINDING.next_pack_id, "CP00-203");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M03"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M04"], 15);
  assert.equal(coverage.summary.by_deliverable.contract, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 17);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(coverage.summary.by_deliverable.claude_review, 3);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
});

test("CP00-202 workflow descriptor binds primary secondary and guarded routes without runtime dispatch", () => {
  const routeMatrix = createDmsCoreCp202RouteMatrix();
  const caseSet = createDmsCoreCp202WorkflowCaseSet();
  const descriptor = createDmsCoreCp202WorkflowDescriptor();
  const routeValidation = validateDmsCoreCp202RouteMatrix(routeMatrix);
  const workflowValidation = validateDmsCoreCp202WorkflowDescriptor(descriptor, dmsContract);

  assert.equal(routeValidation.valid, true, routeValidation.errors.join("; "));
  assert.equal(workflowValidation.valid, true, workflowValidation.errors.join("; "));
  assert.equal(routeMatrix.path_count, DMS_CORE_CP202_REQUIREMENTS.workflow_paths.length);
  assert.equal(routeMatrix.route_rows.find((route) => route.outcome === "happy_path_descriptor").prechecks_pass, true);
  assert.equal(routeMatrix.route_rows.find((route) => route.outcome === "denied_path_descriptor").request.tenant_boundary_precheck, false);
  assert.equal(routeMatrix.route_rows.find((route) => route.outcome === "blocked_claim_descriptor").allowed_operation, false);
  assert.equal(caseSet.integration_smoke_case.covers_primary_slice, true);
  assert.equal(caseSet.integration_smoke_case.covers_secondary_slice, true);
  assert.equal(caseSet.integration_smoke_case.executes_runtime, false);
  assert.equal(descriptor.persistence_boundary.descriptor_only, true);
  assert.equal(descriptor.persistence_boundary.persists_workflow_attempt, false);
  assert.equal(descriptor.state_transition_enforcement.runtime_state_write, false);
});

test("CP00-202 evidence packets and handoff preserve workflow authority boundaries", () => {
  const descriptor = createDmsCoreCp202WorkflowDescriptor();
  const workflow = validateDmsCoreCp202WorkflowDescriptor(descriptor, dmsContract);
  const routeMatrix = validateDmsCoreCp202RouteMatrix(descriptor.route_matrix);
  const hermes = createDmsCoreCp202HermesEvidencePacket(cp202PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp202ClaudeReviewPacket(cp202PlanPack);
  const handoff = createDmsCoreCp202CloseoutHandoff();

  assert.equal(workflow.valid, true, workflow.errors.join("; "));
  assert.equal(routeMatrix.valid, true, routeMatrix.errors.join("; "));
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_primary_workflow_runtime, false);
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_secondary_workflow_runtime, false);
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_review_route_runtime, false);
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_approval_route_runtime, false);
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-202.dms_core_primary_secondary_workflow_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-202.dms_core_primary_secondary_workflow_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-203");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M04.S16");
});

test("CP00-203 plan binding covers the planned 10 RP06 DMS sensitive workflow tail units", () => {
  const coverage = validateDmsCoreCp203Coverage(cp203PlanPack);

  assert.equal(DMS_CORE_CP203_PACK_BINDING.pack_id, "CP00-203");
  assert.equal(DMS_CORE_CP203_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP203_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP203_PACK_BINDING.range, "RP06.P02.M04.S16-RP06.P02.M04.S25");
  assert.equal(DMS_CORE_CP203_PACK_BINDING.upstream_pack_id, "CP00-202");
  assert.equal(DMS_CORE_CP203_PACK_BINDING.next_pack_id, "CP00-204");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M04"], 10);
  assert.equal(coverage.summary.by_deliverable.implementation, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
});

test("CP00-203 sensitive workflow tail blocks claim leaks rollback internals and retry runtime", () => {
  const caseSet = createDmsCoreCp203SensitiveTailCaseSet();
  const descriptor = createDmsCoreCp203SensitiveTailDescriptor();
  const validation = validateDmsCoreCp203SensitiveTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.blocked_claim_output.customer_safe_error_code, "DMS_SERVICE_UNSUPPORTED_OPERATION");
  assert.equal(caseSet.blocked_claim_output.details_redacted, true);
  assert.equal(caseSet.blocked_claim_output.permission_decision_detail_included, false);
  assert.equal(caseSet.blocked_claim_output.audit_event_body_included, false);
  assert.equal(caseSet.blocked_claim_output.unauthorized_count_included, false);
  assert.equal(caseSet.blocked_claim_output.raw_payload_included, false);
  assert.equal(caseSet.blocked_claim_output.dispatches_runtime, false);
  assert.equal(caseSet.rollback_behavior.rollback_runtime_executed, false);
  assert.equal(caseSet.rollback_behavior.internal_state_included, false);
  assert.equal(caseSet.retry_behavior.retry_runtime_executed, false);
  assert.equal(caseSet.retry_behavior.idempotency_key_persisted, false);
  assert.equal(caseSet.retry_behavior.internal_state_included, false);
  assert.equal(caseSet.integration_smoke_case.executes_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.deepEqual(DMS_CORE_CP203_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
});

test("CP00-203 evidence packets and handoff preserve sensitive tail authority boundaries", () => {
  const descriptor = createDmsCoreCp203SensitiveTailDescriptor();
  const sensitiveTail = validateDmsCoreCp203SensitiveTailDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp203HermesEvidencePacket(cp203PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp203ClaudeReviewPacket(cp203PlanPack);
  const handoff = createDmsCoreCp203CloseoutHandoff();

  assert.equal(sensitiveTail.valid, true, sensitiveTail.errors.join("; "));
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_blocked_claim_runtime, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_rollback_runtime, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_retry_runtime, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_blocked_claim_detail, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_rollback_internal_state, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_retry_internal_state, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-203.dms_core_sensitive_workflow_tail_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-203.dms_core_sensitive_workflow_tail_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-204");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M05.S01");
});

test("CP00-204 plan binding covers the planned 10 RP06 DMS permission audit workflow units", () => {
  const coverage = validateDmsCoreCp204Coverage(cp204PlanPack);

  assert.equal(DMS_CORE_CP204_PACK_BINDING.pack_id, "CP00-204");
  assert.equal(DMS_CORE_CP204_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP204_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP204_PACK_BINDING.range, "RP06.P02.M05.S01-RP06.P02.M05.S10");
  assert.equal(DMS_CORE_CP204_PACK_BINDING.upstream_pack_id, "CP00-203");
  assert.equal(DMS_CORE_CP204_PACK_BINDING.next_pack_id, "CP00-205");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M05"], 10);
  assert.equal(coverage.summary.by_deliverable.contract, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 6);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 1);
});

test("CP00-204 permission audit workflow gate remains descriptor-only and no-leak", () => {
  const gateSet = createDmsCoreCp204PermissionAuditGateSet();
  const descriptor = createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor();
  const validation = validateDmsCoreCp204PermissionAuditWorkflowBinding(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(gateSet.source_sensitive_tail_descriptor, "DmsCoreCp203SensitiveWorkflowTailDescriptor");
  assert.deepEqual(gateSet.required_permission_audit_guards, DMS_CORE_CP204_REQUIREMENTS.required_permission_audit_guards);
  assert.equal(gateSet.service_entrypoint_contract.descriptor_only, true);
  assert.equal(gateSet.service_entrypoint_contract.runtime_execution, false);
  assert.equal(gateSet.service_entrypoint_contract.permission_runtime_evaluated, false);
  assert.equal(gateSet.service_entrypoint_contract.audit_runtime_appended, false);
  assert.equal(gateSet.request_normalization.raw_payload_included, false);
  assert.equal(gateSet.tenant_boundary_precheck.policy_rule_detail_included, false);
  assert.equal(gateSet.tenant_boundary_precheck.unauthorized_count_included, false);
  assert.equal(gateSet.matter_trace_precheck.matter_payload_included, false);
  assert.equal(gateSet.permission_precheck.permission_policy_rule_detail_included, false);
  assert.equal(gateSet.permission_precheck.permission_decision_detail_included, false);
  assert.equal(gateSet.permission_precheck.permission_envelope_payload_included, false);
  assert.equal(gateSet.permission_precheck.runtime_permission_evaluated, false);
  assert.equal(gateSet.permission_precheck.writes_permission_decision, false);
  assert.equal(gateSet.audit_hint_precheck.audit_hint_detail_included, false);
  assert.equal(gateSet.audit_hint_precheck.audit_event_body_included, false);
  assert.equal(gateSet.audit_hint_precheck.audit_trace_payload_included, false);
  assert.equal(gateSet.audit_hint_precheck.audit_runtime_appended, false);
  assert.equal(gateSet.primary_happy_path.dispatches_runtime, false);
  assert.equal(gateSet.secondary_workflow_path.dispatches_runtime, false);
  assert.equal(gateSet.state_transition_enforcement.runtime_state_write, false);
  assert.equal(gateSet.idempotency_key_handling.persists_idempotency_key, false);
  assert.equal(gateSet.idempotency_key_handling.exposes_key_material, false);
});

test("CP00-204 evidence packets and handoff preserve permission audit authority boundaries", () => {
  const descriptor = createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor();
  const validation = validateDmsCoreCp204PermissionAuditWorkflowBinding(descriptor, dmsContract);
  const hermes = createDmsCoreCp204HermesEvidencePacket(cp204PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp204ClaudeReviewPacket(cp204PlanPack);
  const handoff = createDmsCoreCp204CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.dispatches_permission_audit_gate_runtime, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.evaluates_authorization_policy_runtime, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.writes_permission_decision, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.appends_audit_trace, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.exposes_policy_rule_detail, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.exposes_audit_hint_detail, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-204.dms_core_permission_audit_workflow_binding");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-204.dms_core_permission_audit_workflow_binding");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-205");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M05.S11");
});

test("CP00-205 plan binding covers the planned 10 RP06 DMS permission audit tail units", () => {
  const coverage = validateDmsCoreCp205Coverage(cp205PlanPack);

  assert.equal(DMS_CORE_CP205_PACK_BINDING.pack_id, "CP00-205");
  assert.equal(DMS_CORE_CP205_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP205_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP205_PACK_BINDING.range, "RP06.P02.M05.S11-RP06.P02.M05.S20");
  assert.equal(DMS_CORE_CP205_PACK_BINDING.upstream_pack_id, "CP00-204");
  assert.equal(DMS_CORE_CP205_PACK_BINDING.next_pack_id, "CP00-206");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M05"], 10);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
  assert.equal(coverage.summary.by_deliverable.test, 2);
});

test("CP00-205 permission audit tail keeps lock persistence routing and failure paths descriptor-only", () => {
  const caseSet = createDmsCoreCp205PermissionAuditTailCaseSet();
  const descriptor = createDmsCoreCp205PermissionAuditTailDescriptor();
  const validation = validateDmsCoreCp205PermissionAuditTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.source_permission_audit_gate_set_id, "dms-core-cp204-permission-audit-workflow-gate-set");
  assert.deepEqual(caseSet.required_permission_audit_tail_guards, DMS_CORE_CP205_REQUIREMENTS.required_permission_audit_tail_guards);
  assert.equal(caseSet.lock_acquisition_rule.descriptor_only, true);
  assert.equal(caseSet.lock_acquisition_rule.runtime_lock_acquired, false);
  assert.equal(caseSet.lock_acquisition_rule.lock_token_included, false);
  assert.equal(caseSet.persistence_boundary.descriptor_only, true);
  assert.equal(caseSet.persistence_boundary.persists_workflow_attempt, false);
  assert.equal(caseSet.persistence_boundary.persistence_payload_included, false);
  assert.equal(caseSet.validation_error_mapping.customer_safe_errors_only, true);
  assert.equal(caseSet.validation_error_mapping.validation_error_detail_included, false);
  assert.equal(caseSet.review_required_routing.dispatches_review_route_runtime, false);
  assert.equal(caseSet.review_required_routing.read_only_claude_review_packet_only, true);
  assert.equal(caseSet.approval_required_routing.dispatches_approval_route_runtime, false);
  assert.equal(caseSet.approval_required_routing.human_approval_route_required_before_runtime, true);
  assert.equal(caseSet.blocked_claim_output.details_redacted, true);
  assert.equal(caseSet.blocked_claim_output.dispatches_runtime, false);
  assert.equal(caseSet.rollback_behavior.rollback_runtime_executed, false);
  assert.equal(caseSet.rollback_behavior.internal_state_included, false);
  assert.equal(caseSet.retry_behavior.retry_runtime_executed, false);
  assert.equal(caseSet.retry_behavior.idempotency_key_persisted, false);
  assert.equal(caseSet.happy_path_unit_descriptor.executes_runtime, false);
  assert.equal(caseSet.denied_path_unit_descriptor.expected_customer_safe_error_code, "DMS_SERVICE_TENANT_BOUNDARY");
  assert.equal(caseSet.denied_path_unit_descriptor.executes_runtime, false);
});

test("CP00-205 evidence packets and handoff preserve permission audit tail authority boundaries", () => {
  const descriptor = createDmsCoreCp205PermissionAuditTailDescriptor();
  const validation = validateDmsCoreCp205PermissionAuditTailDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp205HermesEvidencePacket(cp205PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp205ClaudeReviewPacket(cp205PlanPack);
  const handoff = createDmsCoreCp205CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.persists_workflow_attempt, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_review_route_runtime, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_approval_route_runtime, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_blocked_claim_runtime, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.performs_retry_runtime, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_lock_token, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_persistence_payload, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_rollback_internal_state, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_retry_internal_state, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-205.dms_core_permission_audit_tail_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-205.dms_core_permission_audit_tail_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-206");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M05.S21");
});

test("CP00-206 plan binding covers the planned 10 RP06 DMS synthetic fixture service units", () => {
  const coverage = validateDmsCoreCp206Coverage(cp206PlanPack);

  assert.equal(DMS_CORE_CP206_PACK_BINDING.pack_id, "CP00-206");
  assert.equal(DMS_CORE_CP206_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP206_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP206_PACK_BINDING.range, "RP06.P02.M05.S21-RP06.P02.M06.S05");
  assert.equal(DMS_CORE_CP206_PACK_BINDING.upstream_pack_id, "CP00-205");
  assert.equal(DMS_CORE_CP206_PACK_BINDING.next_pack_id, "CP00-207");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M06"], 5);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.contract, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
});

test("CP00-206 synthetic fixture service keeps review smoke fixture and prechecks descriptor-only", () => {
  const caseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet();
  const descriptor = createDmsCoreCp206SyntheticFixtureServiceDescriptor();
  const validation = validateDmsCoreCp206SyntheticFixtureServiceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.source_permission_audit_tail_case_set_id, "dms-core-cp205-permission-audit-tail-case-set");
  assert.deepEqual(caseSet.required_synthetic_fixture_service_guards, DMS_CORE_CP206_REQUIREMENTS.required_synthetic_fixture_service_guards);
  assert.equal(caseSet.review_path_unit_descriptor.descriptor_only, true);
  assert.equal(caseSet.review_path_unit_descriptor.review_required, true);
  assert.equal(caseSet.review_path_unit_descriptor.dispatches_review_route_runtime, false);
  assert.equal(caseSet.review_path_unit_descriptor.review_payload_included, false);
  assert.equal(caseSet.integration_smoke_case_descriptor.descriptor_only, true);
  assert.equal(caseSet.integration_smoke_case_descriptor.dispatches_integration_smoke_runtime, false);
  assert.equal(caseSet.integration_smoke_case_descriptor.writes_product_state, false);
  assert.equal(caseSet.golden_fixture_binding.synthetic_only, true);
  assert.equal(caseSet.golden_fixture_binding.no_real_data, true);
  assert.equal(caseSet.golden_fixture_binding.real_document_data_loaded, false);
  assert.equal(caseSet.golden_fixture_binding.document_bytes_loaded, false);
  assert.equal(caseSet.hermes_service_evidence_descriptor.dispatches_runtime, false);
  assert.equal(caseSet.hermes_service_evidence_descriptor.claims_enterprise_trust, false);
  assert.equal(caseSet.claude_service_review_prompt.read_only, true);
  assert.equal(caseSet.claude_service_review_prompt.claude_is_final_approval, false);
  assert.equal(caseSet.claude_service_review_prompt.source_mutation_allowed, false);
  assert.equal(caseSet.synthetic_fixture_service_entrypoint_contract.runtime_execution, false);
  assert.equal(caseSet.synthetic_fixture_request_normalization.raw_payload_included, false);
  assert.equal(caseSet.synthetic_fixture_tenant_boundary_precheck.runtime_policy_lookup, false);
  assert.equal(caseSet.synthetic_fixture_tenant_boundary_precheck.tenant_policy_detail_included, false);
  assert.equal(caseSet.synthetic_fixture_matter_trace_precheck.runtime_matter_lookup, false);
  assert.equal(caseSet.synthetic_fixture_matter_trace_precheck.matter_payload_included, false);
  assert.equal(caseSet.synthetic_fixture_permission_precheck.runtime_permission_evaluated, false);
  assert.equal(caseSet.synthetic_fixture_permission_precheck.writes_permission_decision, false);
});

test("CP00-206 evidence packets and handoff preserve synthetic fixture service authority boundaries", () => {
  const descriptor = createDmsCoreCp206SyntheticFixtureServiceDescriptor();
  const validation = validateDmsCoreCp206SyntheticFixtureServiceDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp206HermesEvidencePacket(cp206PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp206ClaudeReviewPacket(cp206PlanPack);
  const handoff = createDmsCoreCp206CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.dispatches_integration_smoke_runtime, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.dispatches_fixture_service_runtime, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.executes_review_path_runtime, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.loads_real_fixture_data, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.exposes_review_payload, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.exposes_fixture_payload, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.exposes_tenant_policy_detail, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.exposes_matter_payload, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP206_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-206.dms_core_synthetic_fixture_service_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-206.dms_core_synthetic_fixture_service_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-207");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M06.S06");
});

test("CP00-207 plan binding covers the planned 10 RP06 DMS synthetic fixture workflow units", () => {
  const coverage = validateDmsCoreCp207Coverage(cp207PlanPack);

  assert.equal(DMS_CORE_CP207_PACK_BINDING.pack_id, "CP00-207");
  assert.equal(DMS_CORE_CP207_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP207_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP207_PACK_BINDING.range, "RP06.P02.M06.S06-RP06.P02.M06.S15");
  assert.equal(DMS_CORE_CP207_PACK_BINDING.upstream_pack_id, "CP00-206");
  assert.equal(DMS_CORE_CP207_PACK_BINDING.next_pack_id, "CP00-208");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M06"], 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 5);
  assert.equal(coverage.summary.by_deliverable.ui, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.deepEqual(DMS_CORE_CP207_REQUIREMENTS.required_synthetic_fixture_workflow_guards, [
    "audit_hint_precheck",
    "primary_happy_path",
    "secondary_workflow_path",
    "state_transition_enforcement",
    "idempotency_key_handling",
    "lock_acquisition_rule",
    "persistence_boundary",
    "validation_error_mapping",
    "review_required_routing",
    "approval_required_routing",
  ]);
});

test("CP00-207 synthetic fixture workflow keeps audit workflow state lock persistence and routing descriptor-only", () => {
  const caseSet = createDmsCoreCp207SyntheticFixtureWorkflowCaseSet();
  const descriptor = createDmsCoreCp207SyntheticFixtureWorkflowDescriptor();
  const validation = validateDmsCoreCp207SyntheticFixtureWorkflowDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.source_synthetic_fixture_service_case_set_id, "dms-core-cp206-synthetic-fixture-service-case-set");
  assert.deepEqual(caseSet.required_synthetic_fixture_workflow_guards, DMS_CORE_CP207_REQUIREMENTS.required_synthetic_fixture_workflow_guards);
  assert.equal(caseSet.audit_hint_precheck.descriptor_only, true);
  assert.equal(caseSet.audit_hint_precheck.runtime_audit_lookup, false);
  assert.equal(caseSet.audit_hint_precheck.audit_hint_detail_included, false);
  assert.equal(caseSet.audit_hint_precheck.audit_event_body_included, false);
  assert.equal(caseSet.audit_hint_precheck.audit_trace_payload_included, false);
  assert.equal(caseSet.audit_hint_precheck.audit_runtime_appended, false);
  assert.equal(caseSet.primary_happy_path.descriptor_only, true);
  assert.equal(caseSet.primary_happy_path.prechecks_pass, true);
  assert.equal(caseSet.primary_happy_path.permission_gate_passed, true);
  assert.equal(caseSet.primary_happy_path.audit_gate_passed, true);
  assert.equal(caseSet.primary_happy_path.dispatches_primary_fixture_runtime, false);
  assert.equal(caseSet.primary_happy_path.writes_product_state, false);
  assert.equal(caseSet.primary_happy_path.creates_database_rows, false);
  assert.equal(caseSet.primary_happy_path.reads_object_storage, false);
  assert.equal(caseSet.primary_happy_path.writes_object_storage, false);
  assert.equal(caseSet.secondary_workflow_path.descriptor_only, true);
  assert.equal(caseSet.secondary_workflow_path.review_required_descriptor, true);
  assert.equal(caseSet.secondary_workflow_path.approval_required_descriptor, true);
  assert.equal(caseSet.secondary_workflow_path.dispatches_secondary_fixture_runtime, false);
  assert.equal(caseSet.secondary_workflow_path.review_payload_included, false);
  assert.equal(caseSet.secondary_workflow_path.approval_payload_included, false);
  assert.equal(caseSet.state_transition_enforcement.descriptor_only, true);
  assert.deepEqual(caseSet.state_transition_enforcement.allowed_next_statuses, ["under_review", "blocked"]);
  assert.equal(caseSet.state_transition_enforcement.runtime_state_write, false);
  assert.equal(caseSet.state_transition_enforcement.writes_state_transition, false);
  assert.equal(caseSet.state_transition_enforcement.state_transition_payload_included, false);
  assert.equal(caseSet.idempotency_key_handling.descriptor_only, true);
  assert.equal(caseSet.idempotency_key_handling.persists_idempotency_key, false);
  assert.equal(caseSet.idempotency_key_handling.idempotency_key_material_included, false);
  assert.equal(caseSet.idempotency_key_handling.duplicate_runtime_detection_executed, false);
  assert.equal(caseSet.lock_acquisition_rule.descriptor_only, true);
  assert.equal(caseSet.lock_acquisition_rule.runtime_lock_acquired, false);
  assert.equal(caseSet.lock_acquisition_rule.lock_token_included, false);
  assert.equal(caseSet.lock_acquisition_rule.lock_wait_queue_executed, false);
  assert.equal(caseSet.persistence_boundary.descriptor_only, true);
  assert.equal(caseSet.persistence_boundary.persists_workflow_attempt, false);
  assert.equal(caseSet.persistence_boundary.persists_idempotency_key, false);
  assert.equal(caseSet.persistence_boundary.creates_database_rows, false);
  assert.equal(caseSet.persistence_boundary.updates_database_rows, false);
  assert.equal(caseSet.persistence_boundary.persistence_payload_included, false);
  assert.equal(caseSet.persistence_boundary.raw_payload_included, false);
  assert.equal(caseSet.validation_error_mapping.customer_safe_errors_only, true);
  assert.equal(caseSet.validation_error_mapping.validation_error_detail_included, false);
  assert.equal(caseSet.validation_error_mapping.permission_decision_detail_included, false);
  assert.equal(caseSet.validation_error_mapping.audit_event_body_included, false);
  assert.equal(caseSet.validation_error_mapping.raw_payload_included, false);
  assert.equal(caseSet.review_required_routing.descriptor_only, true);
  assert.equal(caseSet.review_required_routing.read_only_claude_review_packet_only, true);
  assert.equal(caseSet.review_required_routing.dispatches_review_route_runtime, false);
  assert.equal(caseSet.approval_required_routing.descriptor_only, true);
  assert.equal(caseSet.approval_required_routing.human_approval_route_required_before_runtime, true);
  assert.equal(caseSet.approval_required_routing.dispatches_approval_route_runtime, false);
  assert.equal(caseSet.approval_required_routing.approval_payload_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
});

test("CP00-207 evidence packets and handoff preserve synthetic fixture workflow authority boundaries", () => {
  const descriptor = createDmsCoreCp207SyntheticFixtureWorkflowDescriptor();
  const validation = validateDmsCoreCp207SyntheticFixtureWorkflowDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp207HermesEvidencePacket(cp207PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp207ClaudeReviewPacket(cp207PlanPack);
  const handoff = createDmsCoreCp207CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.dispatches_primary_fixture_runtime, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.dispatches_secondary_fixture_runtime, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.dispatches_review_route_runtime, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.dispatches_approval_route_runtime, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.writes_state_transition, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.persists_idempotency_key, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.persists_workflow_attempt, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.exposes_idempotency_key_material, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.exposes_state_transition_payload, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(DMS_CORE_CP207_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H06.CP00-207.dms_core_synthetic_fixture_workflow_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-207.dms_core_synthetic_fixture_workflow_descriptor");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.equal(handoff.to_pack_id, "CP00-208");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M06.S16");
});

test("CP00-208 plan binding covers the planned 10 RP06 DMS synthetic fixture tail entrypoint units", () => {
  const coverage = validateDmsCoreCp208Coverage(cp208PlanPack);

  assert.equal(DMS_CORE_CP208_PACK_BINDING.pack_id, "CP00-208");
  assert.equal(DMS_CORE_CP208_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP208_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP208_PACK_BINDING.range, "RP06.P02.M06.S16-RP06.P02.M07.S03");
  assert.equal(DMS_CORE_CP208_PACK_BINDING.upstream_pack_id, "CP00-207");
  assert.equal(DMS_CORE_CP208_PACK_BINDING.next_pack_id, "CP00-209");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M06"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M07"], 3);
  assert.equal(coverage.summary.by_deliverable.contract, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.deepEqual(DMS_CORE_CP208_REQUIREMENTS.required_synthetic_fixture_tail_entrypoint_guards, [
    "blocked_claim_output",
    "rollback_behavior",
    "retry_behavior",
    "unit_test_happy_path",
    "unit_test_denied_path",
    "unit_test_review_path",
    "integration_smoke_case",
    "service_entrypoint_contract",
    "request_normalization",
    "tenant_boundary_precheck",
  ]);
});

test("CP00-208 synthetic fixture tail entrypoint keeps blocked-claim rollback retry tests smoke and entrypoint descriptor-only", () => {
  const caseSet = createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet();
  const descriptor = createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor();
  const validation = validateDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.source_synthetic_fixture_workflow_case_set_id, "dms-core-cp207-synthetic-fixture-workflow-case-set");
  assert.deepEqual(
    caseSet.required_synthetic_fixture_tail_entrypoint_guards,
    DMS_CORE_CP208_REQUIREMENTS.required_synthetic_fixture_tail_entrypoint_guards,
  );
  assert.equal(caseSet.blocked_claim_output.descriptor_only, true);
  assert.equal(caseSet.blocked_claim_output.blocked_status, "blocked");
  assert.equal(caseSet.blocked_claim_output.customer_safe_error_code, "DMS_FIXTURE_BLOCKED_CLAIM");
  assert.equal(caseSet.blocked_claim_output.dispatches_blocked_claim_runtime, false);
  assert.equal(caseSet.blocked_claim_output.blocked_claim_detail_included, false);
  assert.equal(caseSet.blocked_claim_output.permission_decision_detail_included, false);
  assert.equal(caseSet.blocked_claim_output.audit_event_body_included, false);
  assert.equal(caseSet.blocked_claim_output.raw_payload_included, false);
  assert.equal(caseSet.rollback_behavior.descriptor_only, true);
  assert.equal(caseSet.rollback_behavior.compensates_descriptor_steps_only, true);
  assert.equal(caseSet.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(caseSet.rollback_behavior.rollback_internal_state_included, false);
  assert.equal(caseSet.rollback_behavior.writes_state_transition, false);
  assert.equal(caseSet.rollback_behavior.persists_workflow_attempt, false);
  assert.equal(caseSet.retry_behavior.descriptor_only, true);
  assert.equal(caseSet.retry_behavior.bounded_retry_descriptor, true);
  assert.equal(caseSet.retry_behavior.max_retry_count_descriptor, 3);
  assert.equal(caseSet.retry_behavior.performs_retry_runtime, false);
  assert.equal(caseSet.retry_behavior.retry_internal_state_included, false);
  assert.equal(caseSet.retry_behavior.duplicate_runtime_detection_executed, false);
  assert.equal(caseSet.unit_test_happy_path.descriptor_only, true);
  assert.equal(caseSet.unit_test_happy_path.expected_outcome, "allowed");
  assert.equal(caseSet.unit_test_happy_path.executes_unit_test_runtime_paths, false);
  assert.equal(caseSet.unit_test_happy_path.writes_product_state, false);
  assert.equal(caseSet.unit_test_happy_path.fixture_payload_included, false);
  assert.equal(caseSet.unit_test_denied_path.descriptor_only, true);
  assert.equal(caseSet.unit_test_denied_path.expected_outcome, "denied_customer_safe");
  assert.equal(caseSet.unit_test_denied_path.customer_safe_error_code, "DMS_FIXTURE_DENIED");
  assert.equal(caseSet.unit_test_denied_path.executes_unit_test_runtime_paths, false);
  assert.equal(caseSet.unit_test_denied_path.permission_decision_detail_included, false);
  assert.equal(caseSet.unit_test_denied_path.validation_error_detail_included, false);
  assert.equal(caseSet.unit_test_review_path.descriptor_only, true);
  assert.equal(caseSet.unit_test_review_path.expected_outcome, "review_required");
  assert.equal(caseSet.unit_test_review_path.executes_unit_test_runtime_paths, false);
  assert.equal(caseSet.unit_test_review_path.dispatches_review_route_runtime, false);
  assert.equal(caseSet.unit_test_review_path.review_payload_included, false);
  assert.equal(caseSet.integration_smoke_case.descriptor_only, true);
  assert.equal(caseSet.integration_smoke_case.smoke_scope, "descriptor_chain_cp198_to_cp208");
  assert.equal(caseSet.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(caseSet.integration_smoke_case.loads_real_fixture_data, false);
  assert.equal(caseSet.integration_smoke_case.fixture_payload_included, false);
  assert.equal(caseSet.integration_smoke_case.raw_payload_included, false);
  assert.equal(caseSet.service_entrypoint_contract.descriptor_only, true);
  assert.equal(caseSet.service_entrypoint_contract.service_entrypoint, "createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor");
  assert.equal(caseSet.service_entrypoint_contract.runtime_execution, false);
  assert.equal(caseSet.service_entrypoint_contract.fixture_service_runtime_dispatched, false);
  assert.equal(caseSet.service_entrypoint_contract.permission_runtime_evaluated, false);
  assert.equal(caseSet.service_entrypoint_contract.audit_runtime_appended, false);
  assert.equal(caseSet.service_entrypoint_contract.object_storage_runtime_executed, false);
  assert.equal(caseSet.request_normalization.descriptor_only, true);
  assert.equal(caseSet.request_normalization.rejects_unknown_fields, true);
  assert.equal(caseSet.request_normalization.normalizes_before_prechecks, true);
  assert.equal(caseSet.request_normalization.runtime_execution, false);
  assert.equal(caseSet.request_normalization.raw_payload_included, false);
  assert.equal(caseSet.request_normalization.validation_error_detail_included, false);
  assert.deepEqual(caseSet.request_normalization.normalized_fields, ["tenant_id", "matter_id", "fixture_id", "request_id"]);
  assert.equal(caseSet.tenant_boundary_precheck.descriptor_only, true);
  assert.equal(caseSet.tenant_boundary_precheck.passed, true);
  assert.equal(caseSet.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(caseSet.tenant_boundary_precheck.runtime_tenant_lookup, false);
  assert.equal(caseSet.tenant_boundary_precheck.tenant_policy_detail_included, false);
  assert.equal(caseSet.tenant_boundary_precheck.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.executes_unit_test_runtime_paths, false);
  assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_blocked_claim_detail, false);
  assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_tenant_policy_detail, false);
});

test("CP00-208 evidence packets and handoff preserve synthetic fixture tail entrypoint authority boundaries", () => {
  const descriptor = createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor();
  const validation = validateDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp208HermesEvidencePacket(cp208PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp208ClaudeReviewPacket(cp208PlanPack);
  const handoff = createDmsCoreCp208CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(hermes.evidence_packet, "H06.CP00-208.dms_core_synthetic_fixture_tail_entrypoint_descriptor");
  assert.equal(hermes.gate, "H06");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.synthetic_fixture_tail_entrypoint_valid, true);
  assert.equal(hermes.no_real_data, true);
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-208.dms_core_synthetic_fixture_tail_entrypoint_descriptor");
  assert.equal(claude.gate, "C06");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.required_effort, "max");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(claude.coverage_valid, true);
  assert.equal(claude.synthetic_fixture_tail_entrypoint_valid, true);
  assert.equal(handoff.handoff_id, "CP00-208-to-CP00-209");
  assert.equal(handoff.from_pack_id, "CP00-208");
  assert.equal(handoff.to_pack_id, "CP00-209");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M07.S04");
  assert.equal(handoff.closed_scope, "RP06.P02.M06.S16-RP06.P02.M07.S03");
  assert.equal(handoff.production_ready_flag, "dms_core_synthetic_fixture_tail_entrypoint_descriptor_verified");
});

test("CP00-209 plan binding covers the planned 40 RP06 DMS golden case and hermes cycle units", () => {
  const coverage = validateDmsCoreCp209Coverage(cp209PlanPack);

  assert.equal(DMS_CORE_CP209_PACK_BINDING.pack_id, "CP00-209");
  assert.equal(DMS_CORE_CP209_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP209_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP209_PACK_BINDING.range, "RP06.P02.M07.S04-RP06.P02.M08.S18");
  assert.equal(DMS_CORE_CP209_PACK_BINDING.upstream_pack_id, "CP00-208");
  assert.equal(DMS_CORE_CP209_PACK_BINDING.next_pack_id, "CP00-210");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M08"], 18);
  assert.equal(coverage.summary.by_deliverable.claude_review, 3);
  assert.equal(coverage.summary.by_deliverable.contract, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 16);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(DMS_CORE_CP209_REQUIREMENTS.required_golden_case_cycle_guards.length, 22);
  assert.equal(DMS_CORE_CP209_REQUIREMENTS.required_hermes_evidence_cycle_guards.length, 18);
});

test("CP00-209 golden case and hermes evidence cycles stay descriptor-only with no runtime or leak surface", () => {
  const caseSet = createDmsCoreCp209GoldenCaseHermesCycleCaseSet();
  const descriptor = createDmsCoreCp209GoldenCaseHermesCycleDescriptor();
  const validation = validateDmsCoreCp209GoldenCaseHermesCycleDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.source_synthetic_fixture_tail_entrypoint_case_set_id, "dms-core-cp208-synthetic-fixture-tail-entrypoint-case-set");
  assert.equal(caseSet.golden_case_cycle.micro_phase_id, "RP06.P02.M07");
  assert.equal(caseSet.hermes_evidence_cycle.micro_phase_id, "RP06.P02.M08");
  for (const guard of DMS_CORE_CP209_REQUIREMENTS.required_golden_case_cycle_guards) {
    const cycleCase = caseSet.golden_case_cycle[guard];
    assert.ok(cycleCase, `golden case cycle missing ${guard}`);
    assert.equal(cycleCase.descriptor_only, true);
    assert.equal(cycleCase.runtime_execution, false);
    assert.equal(cycleCase.customer_safe_errors_only, true);
    assert.equal(cycleCase.raw_payload_included, false);
  }
  for (const guard of DMS_CORE_CP209_REQUIREMENTS.required_hermes_evidence_cycle_guards) {
    const cycleCase = caseSet.hermes_evidence_cycle[guard];
    assert.ok(cycleCase, `hermes evidence cycle missing ${guard}`);
    assert.equal(cycleCase.descriptor_only, true);
    assert.equal(cycleCase.runtime_execution, false);
    assert.equal(cycleCase.customer_safe_errors_only, true);
    assert.equal(cycleCase.raw_payload_included, false);
  }
  assert.equal(caseSet.golden_case_cycle.golden_fixture_binding.fixture_id, "dms-core-cp198-synthetic-fixture");
  assert.equal(caseSet.golden_case_cycle.hermes_service_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(caseSet.golden_case_cycle.claude_service_review_prompt.claude_final_approval_claimed, false);
  assert.equal(caseSet.hermes_evidence_cycle.service_entrypoint_contract.service_entrypoint, "createDmsCoreCp209GoldenCaseHermesCycleDescriptor");
  assert.equal(caseSet.hermes_evidence_cycle.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.dispatches_golden_case_runtime, false);
  assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.dispatches_hermes_packet_runtime, false);
  assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.emits_hermes_runtime_receipt, false);
  assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.exposes_golden_case_payload, false);
  assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.exposes_hermes_packet_body, false);
});

test("CP00-209 evidence packets and handoff preserve golden case hermes cycle authority boundaries", () => {
  const descriptor = createDmsCoreCp209GoldenCaseHermesCycleDescriptor();
  const validation = validateDmsCoreCp209GoldenCaseHermesCycleDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp209HermesEvidencePacket(cp209PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp209ClaudeReviewPacket(cp209PlanPack);
  const handoff = createDmsCoreCp209CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(hermes.evidence_packet, "H06.CP00-209.dms_core_golden_case_hermes_cycle_descriptor");
  assert.equal(hermes.gate, "H06");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.golden_case_hermes_cycle_valid, true);
  assert.equal(hermes.no_real_data, true);
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-209.dms_core_golden_case_hermes_cycle_descriptor");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.required_effort, "max");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(claude.coverage_valid, true);
  assert.equal(claude.golden_case_hermes_cycle_valid, true);
  assert.equal(handoff.handoff_id, "CP00-209-to-CP00-210");
  assert.equal(handoff.to_pack_id, "CP00-210");
  assert.equal(handoff.next_subphase_id, "RP06.P02.M08.S19");
  assert.equal(handoff.closed_scope, "RP06.P02.M07.S04-RP06.P02.M08.S18");
  assert.equal(handoff.production_ready_flag, "dms_core_golden_case_hermes_cycle_descriptor_verified");
});

test("CP00-210 plan binding covers the planned 150 RP06 P02-closeout and P03-foundation units", () => {
  const coverage = validateDmsCoreCp210Coverage(cp210PlanPack);

  assert.equal(DMS_CORE_CP210_PACK_BINDING.pack_id, "CP00-210");
  assert.equal(DMS_CORE_CP210_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP210_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP210_PACK_BINDING.range, "RP06.P02.M08.S19-RP06.P03.M05.S22");
  assert.equal(DMS_CORE_CP210_PACK_BINDING.upstream_pack_id, "CP00-209");
  assert.equal(DMS_CORE_CP210_PACK_BINDING.next_pack_id, "CP00-211");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P02"], 46);
  assert.equal(coverage.summary.by_phase["RP06.P03"], 104);
  assert.equal(coverage.summary.by_micro_phase["RP06.P02.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P03.M05"], 22);
  assert.equal(coverage.summary.by_deliverable.implementation, 64);
  assert.equal(coverage.summary.by_deliverable.contract, 28);
  assert.equal(coverage.summary.by_deliverable.test, 22);
  assert.equal(coverage.summary.by_deliverable.security_audit, 16);
  assert.equal(Object.keys(DMS_CORE_CP210_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-210 descriptor sections stay descriptor-only across P02 closeout and P03 API surface rows", () => {
  const caseSet = createDmsCoreCp210P02CloseoutP03FoundationCaseSet();
  const descriptor = createDmsCoreCp210P02CloseoutP03FoundationDescriptor();
  const validation = validateDmsCoreCp210P02CloseoutP03FoundationDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP210_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections[microId];
    assert.ok(section, `missing section ${microId}`);
    assert.equal(section.row_count, titles.length);
    for (const title of titles) {
      const row = section.rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
      assert.equal(row.customer_safe_errors_only, true);
      assert.equal(row.raw_payload_included, false);
    }
  }
  const m05 = caseSet.sections["RP06.P03.M05"].rows;
  assert.equal(m05.unauthorized_data_omission.unauthorized_data_omitted, true);
  assert.equal(m05.response_contract.api_response_payload_included, false);
  assert.equal(m05.pagination_or_filtering_contract.pagination_cursor_material_included, false);
  assert.equal(m05.schema_drift_check.schema_drift_detected, false);
  assert.equal(m05.backward_compatibility_check.backward_compatible_descriptor, true);
  assert.equal(m05.claude_interface_prompt.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.serves_api_response_runtime, false);
  assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.omits_unauthorized_data, true);
});

test("CP00-210 evidence packets and handoff preserve P03 foundation authority boundaries", () => {
  const descriptor = createDmsCoreCp210P02CloseoutP03FoundationDescriptor();
  const validation = validateDmsCoreCp210P02CloseoutP03FoundationDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp210HermesEvidencePacket(cp210PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp210ClaudeReviewPacket(cp210PlanPack);
  const handoff = createDmsCoreCp210CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(hermes.evidence_packet, "H06.CP00-210.dms_core_p02_closeout_p03_foundation_descriptor");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.p02_closeout_p03_foundation_valid, true);
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-210.dms_core_p02_closeout_p03_foundation_descriptor");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.handoff_id, "CP00-210-to-CP00-211");
  assert.equal(handoff.to_pack_id, "CP00-211");
  assert.equal(handoff.next_subphase_id, "RP06.P03.M06.S01");
  assert.equal(handoff.production_ready_flag, "dms_core_p02_closeout_p03_foundation_descriptor_verified");
});

test("CP00-211 plan binding covers the planned 150 RP06 P03-closeout and P04-UI-foundation units", () => {
  const coverage = validateDmsCoreCp211Coverage(cp211PlanPack);

  assert.equal(DMS_CORE_CP211_PACK_BINDING.pack_id, "CP00-211");
  assert.equal(DMS_CORE_CP211_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP211_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP211_PACK_BINDING.range, "RP06.P03.M06.S01-RP06.P04.M03.S08");
  assert.equal(DMS_CORE_CP211_PACK_BINDING.upstream_pack_id, "CP00-210");
  assert.equal(DMS_CORE_CP211_PACK_BINDING.next_pack_id, "CP00-212");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P03"], 92);
  assert.equal(coverage.summary.by_phase["RP06.P04"], 58);
  assert.equal(coverage.summary.by_deliverable.ui, 28);
  assert.equal(coverage.summary.by_deliverable.implementation, 53);
  assert.equal(Object.keys(DMS_CORE_CP211_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-211 descriptor sections stay descriptor-only across P03 API tail and P04 UI surface rows", () => {
  const caseSet = createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet();
  const descriptor = createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor();
  const validation = validateDmsCoreCp211P03CloseoutP04UiFoundationDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP211_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections[microId];
    assert.ok(section, `missing section ${microId}`);
    assert.equal(section.row_count, titles.length);
    for (const title of titles) {
      const row = section.rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const ui = caseSet.sections["RP06.P04.M01"].rows;
  assert.equal(ui.denied_state.permission_decision_detail_included, false);
  assert.equal(ui.review_required_state.review_payload_included, false);
  assert.equal(ui.permission_badge.permission_decision_detail_included, false);
  assert.equal(ui.audit_hint_display.audit_hint_detail_included, false);
  assert.equal(ui.build_smoke.dispatches_build_runtime, false);
  assert.equal(ui.claude_ui_leak_prompt.claude_final_approval_claimed, false);
  assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
  assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.dispatches_build_runtime, false);
  assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.exposes_ui_state_payload, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-211 evidence packets and handoff preserve P04 UI foundation authority boundaries", () => {
  const descriptor = createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor();
  const validation = validateDmsCoreCp211P03CloseoutP04UiFoundationDescriptor(descriptor, dmsContract);
  const hermes = createDmsCoreCp211HermesEvidencePacket(cp211PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp211ClaudeReviewPacket(cp211PlanPack);
  const handoff = createDmsCoreCp211CloseoutHandoff();

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(hermes.evidence_packet, "H06.CP00-211.dms_core_p03_closeout_p04_ui_foundation_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C06.CP00-211.dms_core_p03_closeout_p04_ui_foundation_descriptor");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-211-to-CP00-212");
  assert.equal(handoff.to_pack_id, "CP00-212");
  assert.equal(handoff.next_subphase_id, "RP06.P04.M03.S09");
  assert.equal(handoff.production_ready_flag, "dms_core_p03_closeout_p04_ui_foundation_descriptor_verified");
});

test("CP00-212 plan binding covers the planned 10 RP06 UI primary slice tail units", () => {
  const coverage = validateDmsCoreCp212Coverage(cp212PlanPack);

  assert.equal(DMS_CORE_CP212_PACK_BINDING.pack_id, "CP00-212");
  assert.equal(DMS_CORE_CP212_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP212_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP212_PACK_BINDING.range, "RP06.P04.M03.S09-RP06.P04.M03.S18");
  assert.equal(DMS_CORE_CP212_PACK_BINDING.upstream_pack_id, "CP00-211");
  assert.equal(DMS_CORE_CP212_PACK_BINDING.next_pack_id, "CP00-213");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M03"], 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
});

test("CP00-212 UI primary slice tail rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp212UiPrimarySliceTailCaseSet();
  const descriptor = createDmsCoreCp212UiPrimarySliceTailDescriptor();
  const validation = validateDmsCoreCp212UiPrimarySliceTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  const rows = caseSet.sections["RP06.P04.M03"].rows;
  for (const title of DMS_CORE_CP212_REQUIREMENTS.required_section_rows["RP06.P04.M03"]) {
    const row = rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
  assert.equal(rows.permission_badge.permission_decision_detail_included, false);
  assert.equal(rows.audit_hint_display.audit_hint_detail_included, false);
  assert.equal(rows.build_smoke.dispatches_build_runtime, false);
  assert.equal(rows.hermes_ui_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-212 evidence packets and handoff preserve UI slice tail authority boundaries", () => {
  const descriptor = createDmsCoreCp212UiPrimarySliceTailDescriptor();
  const hermes = createDmsCoreCp212HermesEvidencePacket(cp212PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp212ClaudeReviewPacket(cp212PlanPack);
  const handoff = createDmsCoreCp212CloseoutHandoff();

  assert.equal(hermes.evidence_packet, "H06.CP00-212.dms_core_ui_primary_slice_tail_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-212-to-CP00-213");
  assert.equal(handoff.next_subphase_id, "RP06.P04.M03.S19");
  assert.equal(handoff.production_ready_flag, "dms_core_ui_primary_slice_tail_descriptor_verified");
});

test("CP00-213 plan binding covers the planned 40 RP06 UI secondary slice binding units", () => {
  const coverage = validateDmsCoreCp213Coverage(cp213PlanPack);

  assert.equal(DMS_CORE_CP213_PACK_BINDING.pack_id, "CP00-213");
  assert.equal(DMS_CORE_CP213_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP213_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP213_PACK_BINDING.range, "RP06.P04.M03.S19-RP06.P04.M05.S14");
  assert.equal(DMS_CORE_CP213_PACK_BINDING.upstream_pack_id, "CP00-212");
  assert.equal(DMS_CORE_CP213_PACK_BINDING.next_pack_id, "CP00-214");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M03"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M05"], 14);
  assert.equal(coverage.summary.by_deliverable.ui, 18);
  assert.equal(coverage.summary.by_deliverable.implementation, 11);
});

test("CP00-213 UI secondary slice binding rows stay descriptor-only with no count or snapshot leaks", () => {
  const caseSet = createDmsCoreCp213UiSecondarySliceBindingCaseSet();
  const descriptor = createDmsCoreCp213UiSecondarySliceBindingDescriptor();
  const validation = validateDmsCoreCp213UiSecondarySliceBindingDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP213_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections[microId];
    assert.ok(section, `missing section ${microId}`);
    assert.equal(section.row_count, titles.length);
    for (const title of titles) {
      const row = section.rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP06.P04.M04"].rows;
  assert.equal(m04.state_snapshot.state_snapshot_payload_included, false);
  assert.equal(m04.no_unauthorized_count_leak.unauthorized_count_included, false);
  assert.equal(m04.claude_ui_leak_prompt.claude_final_approval_claimed, false);
  assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.exposes_unauthorized_count, false);
  assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.exposes_state_snapshot_payload, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-213 evidence packets and handoff preserve UI secondary slice binding authority boundaries", () => {
  const descriptor = createDmsCoreCp213UiSecondarySliceBindingDescriptor();
  const hermes = createDmsCoreCp213HermesEvidencePacket(cp213PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp213ClaudeReviewPacket(cp213PlanPack);
  const handoff = createDmsCoreCp213CloseoutHandoff();

  assert.equal(hermes.evidence_packet, "H06.CP00-213.dms_core_ui_secondary_slice_binding_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-213-to-CP00-214");
  assert.equal(handoff.next_subphase_id, "RP06.P04.M05.S15");
  assert.equal(handoff.production_ready_flag, "dms_core_ui_secondary_slice_binding_descriptor_verified");
});

test("CP00-214 plan binding covers the planned 10 RP06 UI binding tail units", () => {
  const coverage = validateDmsCoreCp214Coverage(cp214PlanPack);

  assert.equal(DMS_CORE_CP214_PACK_BINDING.pack_id, "CP00-214");
  assert.equal(DMS_CORE_CP214_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP214_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP214_PACK_BINDING.range, "RP06.P04.M05.S15-RP06.P04.M06.S02");
  assert.equal(DMS_CORE_CP214_PACK_BINDING.upstream_pack_id, "CP00-213");
  assert.equal(DMS_CORE_CP214_PACK_BINDING.next_pack_id, "CP00-215");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP06.P04.M06"], 2);
});

test("CP00-214 UI binding tail rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp214UiBindingTailCaseSet();
  const descriptor = createDmsCoreCp214UiBindingTailDescriptor();
  const validation = validateDmsCoreCp214UiBindingTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP214_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P04.M05"].rows;
  assert.equal(m05.state_snapshot.state_snapshot_payload_included, false);
  assert.equal(m05.no_unauthorized_count_leak.unauthorized_count_included, false);
  assert.equal(m05.build_smoke.dispatches_build_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-214 evidence packets and handoff preserve UI binding tail authority boundaries", () => {
  const descriptor = createDmsCoreCp214UiBindingTailDescriptor();
  const hermes = createDmsCoreCp214HermesEvidencePacket(cp214PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp214ClaudeReviewPacket(cp214PlanPack);
  const handoff = createDmsCoreCp214CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-214-to-CP00-215");
  assert.equal(handoff.next_subphase_id, "RP06.P04.M06.S03");
  assert.equal(handoff.production_ready_flag, "dms_core_ui_binding_tail_descriptor_verified");
});

test("CP00-215 plan binding covers the planned 150 RP06 P04-closeout and P05-fixture-foundation units", () => {
  const coverage = validateDmsCoreCp215Coverage(cp215PlanPack);

  assert.equal(DMS_CORE_CP215_PACK_BINDING.pack_id, "CP00-215");
  assert.equal(DMS_CORE_CP215_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP215_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP215_PACK_BINDING.range, "RP06.P04.M06.S03-RP06.P05.M02.S14");
  assert.equal(DMS_CORE_CP215_PACK_BINDING.upstream_pack_id, "CP00-214");
  assert.equal(DMS_CORE_CP215_PACK_BINDING.next_pack_id, "CP00-216");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P04"], 106);
  assert.equal(coverage.summary.by_phase["RP06.P05"], 44);
  assert.equal(Object.keys(DMS_CORE_CP215_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-215 descriptor sections stay descriptor-only across P04 UI tail and P05 fixture cases", () => {
  const caseSet = createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet();
  const descriptor = createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor();
  const validation = validateDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP215_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP06.P05.M01"].rows;
  assert.equal(m01.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m01.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m01.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m01.no_real_data_check.real_client_data_loaded, false);
  assert.equal(m01.claude_missing_test_prompt.claude_final_approval_claimed, false);
  assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.dispatches_ai_runtime, false);
  assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.exposes_ai_payload, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-215 evidence packets and handoff preserve fixture foundation authority boundaries", () => {
  const descriptor = createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor();
  const hermes = createDmsCoreCp215HermesEvidencePacket(cp215PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp215ClaudeReviewPacket(cp215PlanPack);
  const handoff = createDmsCoreCp215CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-215-to-CP00-216");
  assert.equal(handoff.next_subphase_id, "RP06.P05.M02.S15");
  assert.equal(handoff.production_ready_flag, "dms_core_p04_closeout_p05_fixture_foundation_descriptor_verified");
});

test("CP00-216 plan binding covers the planned 40 RP06 fixture case slice units", () => {
  const coverage = validateDmsCoreCp216Coverage(cp216PlanPack);

  assert.equal(DMS_CORE_CP216_PACK_BINDING.pack_id, "CP00-216");
  assert.equal(DMS_CORE_CP216_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP216_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP216_PACK_BINDING.range, "RP06.P05.M02.S15-RP06.P05.M04.S12");
  assert.equal(DMS_CORE_CP216_PACK_BINDING.upstream_pack_id, "CP00-215");
  assert.equal(DMS_CORE_CP216_PACK_BINDING.next_pack_id, "CP00-217");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M04"], 12);
});

test("CP00-216 fixture case slice rows stay descriptor-only with stable IDs and no replay runtime", () => {
  const caseSet = createDmsCoreCp216FixtureCaseSliceCaseSet();
  const descriptor = createDmsCoreCp216FixtureCaseSliceDescriptor();
  const validation = validateDmsCoreCp216FixtureCaseSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP216_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP06.P05.M03"].rows;
  assert.equal(m03.stable_id_check.id_drift_detected, false);
  assert.equal(m03.replay_command.executes_replay_runtime, false);
  assert.equal(m03.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m03.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.executes_replay_runtime, false);
  assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.exposes_stable_id_material, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-216 evidence packets and handoff preserve fixture case slice authority boundaries", () => {
  const descriptor = createDmsCoreCp216FixtureCaseSliceDescriptor();
  const hermes = createDmsCoreCp216HermesEvidencePacket(cp216PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp216ClaudeReviewPacket(cp216PlanPack);
  const handoff = createDmsCoreCp216CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-216-to-CP00-217");
  assert.equal(handoff.next_subphase_id, "RP06.P05.M04.S13");
  assert.equal(handoff.production_ready_flag, "dms_core_fixture_case_slice_descriptor_verified");
});

test("CP00-217 plan binding covers the planned 40 RP06 fixture binding slice units", () => {
  const coverage = validateDmsCoreCp217Coverage(cp217PlanPack);

  assert.equal(DMS_CORE_CP217_PACK_BINDING.pack_id, "CP00-217");
  assert.equal(DMS_CORE_CP217_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP217_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP217_PACK_BINDING.range, "RP06.P05.M04.S13-RP06.P05.M06.S08");
  assert.equal(DMS_CORE_CP217_PACK_BINDING.upstream_pack_id, "CP00-216");
  assert.equal(DMS_CORE_CP217_PACK_BINDING.next_pack_id, "CP00-218");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M06"], 8);
});

test("CP00-217 fixture binding slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp217FixtureBindingSliceCaseSet();
  const descriptor = createDmsCoreCp217FixtureBindingSliceDescriptor();
  const validation = validateDmsCoreCp217FixtureBindingSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP217_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P05.M05"].rows;
  assert.equal(m05.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m05.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m05.stable_id_check.id_drift_detected, false);
  assert.equal(m05.replay_command.executes_replay_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-217 evidence packets and handoff preserve fixture binding slice authority boundaries", () => {
  const descriptor = createDmsCoreCp217FixtureBindingSliceDescriptor();
  const hermes = createDmsCoreCp217HermesEvidencePacket(cp217PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp217ClaudeReviewPacket(cp217PlanPack);
  const handoff = createDmsCoreCp217CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-217-to-CP00-218");
  assert.equal(handoff.next_subphase_id, "RP06.P05.M06.S09");
  assert.equal(handoff.production_ready_flag, "dms_core_fixture_binding_slice_descriptor_verified");
});

test("CP00-218 plan binding covers the planned 10 RP06 fixture set tail units", () => {
  const coverage = validateDmsCoreCp218Coverage(cp218PlanPack);

  assert.equal(DMS_CORE_CP218_PACK_BINDING.pack_id, "CP00-218");
  assert.equal(DMS_CORE_CP218_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP218_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP218_PACK_BINDING.range, "RP06.P05.M06.S09-RP06.P05.M06.S18");
  assert.equal(DMS_CORE_CP218_PACK_BINDING.upstream_pack_id, "CP00-217");
  assert.equal(DMS_CORE_CP218_PACK_BINDING.next_pack_id, "CP00-219");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P05.M06"], 10);
});

test("CP00-218 fixture set tail rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp218FixtureSetTailCaseSet();
  const descriptor = createDmsCoreCp218FixtureSetTailDescriptor();
  const validation = validateDmsCoreCp218FixtureSetTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  const rows = caseSet.sections["RP06.P05.M06"].rows;
  for (const title of DMS_CORE_CP218_REQUIREMENTS.required_section_rows["RP06.P05.M06"]) {
    const row = rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
  assert.equal(rows.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(rows.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-218 evidence packets and handoff preserve fixture set tail authority boundaries", () => {
  const descriptor = createDmsCoreCp218FixtureSetTailDescriptor();
  const hermes = createDmsCoreCp218HermesEvidencePacket(cp218PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp218ClaudeReviewPacket(cp218PlanPack);
  const handoff = createDmsCoreCp218CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-218-to-CP00-219");
  assert.equal(handoff.next_subphase_id, "RP06.P05.M06.S19");
  assert.equal(handoff.production_ready_flag, "dms_core_fixture_set_tail_descriptor_verified");
});

test("CP00-219 plan binding covers the planned 150 RP06 P05-closeout and P06-permission-matrix units", () => {
  const coverage = validateDmsCoreCp219Coverage(cp219PlanPack);

  assert.equal(DMS_CORE_CP219_PACK_BINDING.pack_id, "CP00-219");
  assert.equal(DMS_CORE_CP219_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP219_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP219_PACK_BINDING.range, "RP06.P05.M06.S19-RP06.P06.M02.S20");
  assert.equal(DMS_CORE_CP219_PACK_BINDING.upstream_pack_id, "CP00-218");
  assert.equal(DMS_CORE_CP219_PACK_BINDING.next_pack_id, "CP00-220");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P05"], 90);
  assert.equal(coverage.summary.by_phase["RP06.P06"], 60);
  assert.equal(Object.keys(DMS_CORE_CP219_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-219 permission matrix sections stay descriptor-only with deny-over-allow and wall boundaries", () => {
  const caseSet = createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet();
  const descriptor = createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor();
  const validation = validateDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP219_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP06.P06.M00"].rows;
  assert.equal(m00.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m00.ethical_wall_interaction.cross_wall_access_allowed, false);
  assert.equal(m00.matched_rule_capture.policy_rule_detail_included, false);
  assert.equal(m00.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m00.export_download_decision_binding.executes_file_download, false);
  assert.equal(m00.share_decision_binding.external_share_executed, false);
  assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.enforces_deny_over_allow_descriptor, true);
  assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.allows_cross_wall_access, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-219 evidence packets and handoff preserve permission matrix authority boundaries", () => {
  const descriptor = createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor();
  const hermes = createDmsCoreCp219HermesEvidencePacket(cp219PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp219ClaudeReviewPacket(cp219PlanPack);
  const handoff = createDmsCoreCp219CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-219-to-CP00-220");
  assert.equal(handoff.next_subphase_id, "RP06.P06.M02.S21");
  assert.equal(handoff.production_ready_flag, "dms_core_p05_closeout_p06_permission_matrix_descriptor_verified");
});

test("CP00-220 plan binding covers the planned 10 RP06 permission matrix slice units", () => {
  const coverage = validateDmsCoreCp220Coverage(cp220PlanPack);

  assert.equal(DMS_CORE_CP220_PACK_BINDING.pack_id, "CP00-220");
  assert.equal(DMS_CORE_CP220_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP220_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP220_PACK_BINDING.range, "RP06.P06.M02.S21-RP06.P06.M03.S08");
  assert.equal(DMS_CORE_CP220_PACK_BINDING.upstream_pack_id, "CP00-219");
  assert.equal(DMS_CORE_CP220_PACK_BINDING.next_pack_id, "CP00-221");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M02"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M03"], 8);
});

test("CP00-220 permission matrix slice rows stay descriptor-only with cross-tenant and leak boundaries", () => {
  const caseSet = createDmsCoreCp220PermissionMatrixSliceCaseSet();
  const descriptor = createDmsCoreCp220PermissionMatrixSliceDescriptor();
  const validation = validateDmsCoreCp220PermissionMatrixSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP220_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP06.P06.M02"].rows;
  assert.equal(m02.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m02.leak_prevention_test.leak_detected, false);
  assert.equal(DMS_CORE_CP220_NO_WRITE_ATTESTATION.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-220 evidence packets and handoff preserve permission matrix slice authority boundaries", () => {
  const descriptor = createDmsCoreCp220PermissionMatrixSliceDescriptor();
  const hermes = createDmsCoreCp220HermesEvidencePacket(cp220PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp220ClaudeReviewPacket(cp220PlanPack);
  const handoff = createDmsCoreCp220CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-220-to-CP00-221");
  assert.equal(handoff.next_subphase_id, "RP06.P06.M03.S09");
  assert.equal(handoff.production_ready_flag, "dms_core_permission_matrix_slice_descriptor_verified");
});

test("CP00-221 plan binding covers the planned 40 RP06 permission workflow slice units", () => {
  const coverage = validateDmsCoreCp221Coverage(cp221PlanPack);

  assert.equal(DMS_CORE_CP221_PACK_BINDING.pack_id, "CP00-221");
  assert.equal(DMS_CORE_CP221_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP221_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP221_PACK_BINDING.range, "RP06.P06.M03.S09-RP06.P06.M04.S23");
  assert.equal(DMS_CORE_CP221_PACK_BINDING.upstream_pack_id, "CP00-220");
  assert.equal(DMS_CORE_CP221_PACK_BINDING.next_pack_id, "CP00-222");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M03"], 17);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M04"], 23);
});

test("CP00-221 permission workflow slice rows stay descriptor-only with bypass and approval boundaries", () => {
  const caseSet = createDmsCoreCp221PermissionWorkflowSliceCaseSet();
  const descriptor = createDmsCoreCp221PermissionWorkflowSliceDescriptor();
  const validation = validateDmsCoreCp221PermissionWorkflowSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP221_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP06.P06.M03"].rows;
  assert.equal(m03.claude_bypass_prompt.permission_bypass_detected, false);
  assert.equal(m03.human_approval_note.human_approval_route_required_before_runtime, true);
  assert.equal(m03.hermes_security_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(DMS_CORE_CP221_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-221 evidence packets and handoff preserve permission workflow slice authority boundaries", () => {
  const descriptor = createDmsCoreCp221PermissionWorkflowSliceDescriptor();
  const hermes = createDmsCoreCp221HermesEvidencePacket(cp221PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp221ClaudeReviewPacket(cp221PlanPack);
  const handoff = createDmsCoreCp221CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-221-to-CP00-222");
  assert.equal(handoff.next_subphase_id, "RP06.P06.M04.S24");
  assert.equal(handoff.production_ready_flag, "dms_core_permission_workflow_slice_descriptor_verified");
});

test("CP00-222 plan binding covers the planned 40 RP06 permission audit binding slice units", () => {
  const coverage = validateDmsCoreCp222Coverage(cp222PlanPack);

  assert.equal(DMS_CORE_CP222_PACK_BINDING.pack_id, "CP00-222");
  assert.equal(DMS_CORE_CP222_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP222_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP222_PACK_BINDING.range, "RP06.P06.M04.S24-RP06.P06.M06.S13");
  assert.equal(DMS_CORE_CP222_PACK_BINDING.upstream_pack_id, "CP00-221");
  assert.equal(DMS_CORE_CP222_PACK_BINDING.next_pack_id, "CP00-223");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M05"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP06.P06.M06"], 13);
});

test("CP00-222 permission audit binding slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp222PermissionAuditBindingSliceCaseSet();
  const descriptor = createDmsCoreCp222PermissionAuditBindingSliceDescriptor();
  const validation = validateDmsCoreCp222PermissionAuditBindingSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP222_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P06.M05"].rows;
  assert.equal(m05.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m05.claude_bypass_prompt.permission_bypass_detected, false);
  assert.equal(m05.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-222 evidence packets and handoff preserve permission audit binding slice authority boundaries", () => {
  const descriptor = createDmsCoreCp222PermissionAuditBindingSliceDescriptor();
  const hermes = createDmsCoreCp222HermesEvidencePacket(cp222PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp222ClaudeReviewPacket(cp222PlanPack);
  const handoff = createDmsCoreCp222CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-222-to-CP00-223");
  assert.equal(handoff.next_subphase_id, "RP06.P06.M06.S14");
  assert.equal(handoff.production_ready_flag, "dms_core_permission_audit_binding_slice_descriptor_verified");
});

test("CP00-223 plan binding covers the planned 150 RP06 P06-closeout and P07-failure-foundation units", () => {
  const coverage = validateDmsCoreCp223Coverage(cp223PlanPack);

  assert.equal(DMS_CORE_CP223_PACK_BINDING.pack_id, "CP00-223");
  assert.equal(DMS_CORE_CP223_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP223_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP223_PACK_BINDING.range, "RP06.P06.M06.S14-RP06.P07.M02.S12");
  assert.equal(DMS_CORE_CP223_PACK_BINDING.upstream_pack_id, "CP00-222");
  assert.equal(DMS_CORE_CP223_PACK_BINDING.next_pack_id, "CP00-224");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P06"], 98);
  assert.equal(coverage.summary.by_phase["RP06.P07"], 52);
  assert.equal(Object.keys(DMS_CORE_CP223_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-223 failure foundation sections stay descriptor-only with rollback and compensation boundaries", () => {
  const caseSet = createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP223_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP06.P07.M00"].rows;
  assert.equal(m00.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m00.ambiguous_rule_failure.deny_over_allow_enforced, true);
  assert.equal(m00.lock_conflict_failure.lock_token_included, false);
  assert.equal(m00.retry_exhaustion_failure.performs_retry_runtime, false);
  assert.equal(m00.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m00.compensation_expectation.compensates_descriptor_steps_only, true);
  assert.equal(DMS_CORE_CP223_NO_WRITE_ATTESTATION.exposes_failure_internal_state, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-223 evidence packets and handoff preserve failure foundation authority boundaries", () => {
  const descriptor = createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createDmsCoreCp223HermesEvidencePacket(cp223PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp223ClaudeReviewPacket(cp223PlanPack);
  const handoff = createDmsCoreCp223CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-223-to-CP00-224");
  assert.equal(handoff.next_subphase_id, "RP06.P07.M02.S13");
  assert.equal(handoff.production_ready_flag, "dms_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-224 plan binding covers the planned 40 RP06 failure recovery slice units", () => {
  const coverage = validateDmsCoreCp224Coverage(cp224PlanPack);

  assert.equal(DMS_CORE_CP224_PACK_BINDING.pack_id, "CP00-224");
  assert.equal(DMS_CORE_CP224_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP224_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP224_PACK_BINDING.range, "RP06.P07.M02.S13-RP06.P07.M04.S05");
  assert.equal(DMS_CORE_CP224_PACK_BINDING.upstream_pack_id, "CP00-223");
  assert.equal(DMS_CORE_CP224_PACK_BINDING.next_pack_id, "CP00-225");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M03"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M04"], 5);
});

test("CP00-224 failure recovery slice rows stay descriptor-only with silent-success and leak checks", () => {
  const caseSet = createDmsCoreCp224FailureRecoverySliceCaseSet();
  const descriptor = createDmsCoreCp224FailureRecoverySliceDescriptor();
  const validation = validateDmsCoreCp224FailureRecoverySliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP224_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP06.P07.M03"].rows;
  assert.equal(m03.no_silent_success_check.silent_success_detected, false);
  assert.equal(m03.no_data_leak_check.leak_detected, false);
  assert.equal(m03.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m03.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(DMS_CORE_CP224_NO_WRITE_ATTESTATION.silent_success_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-224 evidence packets and handoff preserve failure recovery slice authority boundaries", () => {
  const descriptor = createDmsCoreCp224FailureRecoverySliceDescriptor();
  const hermes = createDmsCoreCp224HermesEvidencePacket(cp224PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp224ClaudeReviewPacket(cp224PlanPack);
  const handoff = createDmsCoreCp224CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-224-to-CP00-225");
  assert.equal(handoff.next_subphase_id, "RP06.P07.M04.S06");
  assert.equal(handoff.production_ready_flag, "dms_core_failure_recovery_slice_descriptor_verified");
});

test("CP00-225 plan binding covers the planned 40 RP06 failure binding slice units", () => {
  const coverage = validateDmsCoreCp225Coverage(cp225PlanPack);

  assert.equal(DMS_CORE_CP225_PACK_BINDING.pack_id, "CP00-225");
  assert.equal(DMS_CORE_CP225_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP225_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP225_PACK_BINDING.range, "RP06.P07.M04.S06-RP06.P07.M05.S20");
  assert.equal(DMS_CORE_CP225_PACK_BINDING.upstream_pack_id, "CP00-224");
  assert.equal(DMS_CORE_CP225_PACK_BINDING.next_pack_id, "CP00-226");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M05"], 20);
});

test("CP00-225 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp225FailureBindingSliceCaseSet();
  const descriptor = createDmsCoreCp225FailureBindingSliceDescriptor();
  const validation = validateDmsCoreCp225FailureBindingSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP225_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P07.M05"].rows;
  assert.equal(m05.ambiguous_rule_failure.deny_over_allow_enforced, true);
  assert.equal(m05.lock_conflict_failure.lock_token_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-225 evidence packets and handoff preserve failure binding slice authority boundaries", () => {
  const descriptor = createDmsCoreCp225FailureBindingSliceDescriptor();
  const hermes = createDmsCoreCp225HermesEvidencePacket(cp225PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp225ClaudeReviewPacket(cp225PlanPack);
  const handoff = createDmsCoreCp225CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-225-to-CP00-226");
  assert.equal(handoff.next_subphase_id, "RP06.P07.M05.S21");
  assert.equal(handoff.production_ready_flag, "dms_core_failure_binding_slice_descriptor_verified");
});

test("CP00-226 plan binding covers the planned 10 RP06 failure audit tail units", () => {
  const coverage = validateDmsCoreCp226Coverage(cp226PlanPack);

  assert.equal(DMS_CORE_CP226_PACK_BINDING.pack_id, "CP00-226");
  assert.equal(DMS_CORE_CP226_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP226_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP226_PACK_BINDING.range, "RP06.P07.M05.S21-RP06.P07.M06.S05");
  assert.equal(DMS_CORE_CP226_PACK_BINDING.upstream_pack_id, "CP00-225");
  assert.equal(DMS_CORE_CP226_PACK_BINDING.next_pack_id, "CP00-227");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP06.P07.M06"], 5);
});

test("CP00-226 failure audit tail rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp226FailureAuditTailCaseSet();
  const descriptor = createDmsCoreCp226FailureAuditTailDescriptor();
  const validation = validateDmsCoreCp226FailureAuditTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP226_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P07.M05"].rows;
  assert.equal(m05.no_silent_success_check.silent_success_detected, false);
  assert.equal(m05.no_data_leak_check.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-226 evidence packets and handoff preserve failure audit tail authority boundaries", () => {
  const descriptor = createDmsCoreCp226FailureAuditTailDescriptor();
  const hermes = createDmsCoreCp226HermesEvidencePacket(cp226PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp226ClaudeReviewPacket(cp226PlanPack);
  const handoff = createDmsCoreCp226CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-226-to-CP00-227");
  assert.equal(handoff.next_subphase_id, "RP06.P07.M06.S06");
  assert.equal(handoff.production_ready_flag, "dms_core_failure_audit_tail_descriptor_verified");
});

test("CP00-227 plan binding covers the planned 150 RP06 P07-closeout and P08-hermes-receipt units", () => {
  const coverage = validateDmsCoreCp227Coverage(cp227PlanPack);

  assert.equal(DMS_CORE_CP227_PACK_BINDING.pack_id, "CP00-227");
  assert.equal(DMS_CORE_CP227_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP227_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP227_PACK_BINDING.range, "RP06.P07.M06.S06-RP06.P08.M02.S14");
  assert.equal(DMS_CORE_CP227_PACK_BINDING.upstream_pack_id, "CP00-226");
  assert.equal(DMS_CORE_CP227_PACK_BINDING.next_pack_id, "CP00-228");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P07"], 106);
  assert.equal(coverage.summary.by_phase["RP06.P08"], 44);
  assert.equal(Object.keys(DMS_CORE_CP227_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-227 hermes receipt sections stay descriptor-only with verdict semantics boundaries", () => {
  const caseSet = createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet();
  const descriptor = createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor();
  const validation = validateDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP227_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP06.P08.M01"].rows;
  assert.equal(m01.pass_semantics.verdict_descriptor, "PASS");
  assert.equal(m01.block_semantics.blocks_closeout_descriptor, true);
  assert.equal(m01.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(m01.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m01.regression_receipt.regression_detected, false);
  assert.equal(DMS_CORE_CP227_NO_WRITE_ATTESTATION.regression_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-227 evidence packets and handoff preserve hermes receipt authority boundaries", () => {
  const descriptor = createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor();
  const hermes = createDmsCoreCp227HermesEvidencePacket(cp227PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp227ClaudeReviewPacket(cp227PlanPack);
  const handoff = createDmsCoreCp227CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-227-to-CP00-228");
  assert.equal(handoff.next_subphase_id, "RP06.P08.M02.S15");
  assert.equal(handoff.production_ready_flag, "dms_core_p07_closeout_p08_hermes_receipt_descriptor_verified");
});

test("CP00-228 plan binding covers the planned 40 RP06 hermes receipt slice units", () => {
  const coverage = validateDmsCoreCp228Coverage(cp228PlanPack);

  assert.equal(DMS_CORE_CP228_PACK_BINDING.pack_id, "CP00-228");
  assert.equal(DMS_CORE_CP228_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP228_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP228_PACK_BINDING.range, "RP06.P08.M02.S15-RP06.P08.M04.S12");
  assert.equal(DMS_CORE_CP228_PACK_BINDING.upstream_pack_id, "CP00-227");
  assert.equal(DMS_CORE_CP228_PACK_BINDING.next_pack_id, "CP00-229");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P08.M03"], 22);
});

test("CP00-228 hermes receipt slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp228HermesReceiptSliceCaseSet();
  const descriptor = createDmsCoreCp228HermesReceiptSliceDescriptor();
  const validation = validateDmsCoreCp228HermesReceiptSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP228_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP06.P08.M03"].rows;
  assert.equal(m03.pass_semantics.verdict_descriptor, "PASS");
  assert.equal(m03.block_semantics.blocks_closeout_descriptor, true);
  assert.equal(m03.operator_summary.hermes_packet_body_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-228 evidence packets and handoff preserve hermes receipt slice authority boundaries", () => {
  const descriptor = createDmsCoreCp228HermesReceiptSliceDescriptor();
  const hermes = createDmsCoreCp228HermesEvidencePacket(cp228PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp228ClaudeReviewPacket(cp228PlanPack);
  const handoff = createDmsCoreCp228CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-228-to-CP00-229");
  assert.equal(handoff.next_subphase_id, "RP06.P08.M04.S13");
  assert.equal(handoff.production_ready_flag, "dms_core_hermes_receipt_slice_descriptor_verified");
});

test("CP00-229 plan binding covers the planned 40 RP06 hermes binding slice units", () => {
  const coverage = validateDmsCoreCp229Coverage(cp229PlanPack);

  assert.equal(DMS_CORE_CP229_PACK_BINDING.pack_id, "CP00-229");
  assert.equal(DMS_CORE_CP229_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP229_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP229_PACK_BINDING.range, "RP06.P08.M04.S13-RP06.P08.M06.S08");
  assert.equal(DMS_CORE_CP229_PACK_BINDING.upstream_pack_id, "CP00-228");
  assert.equal(DMS_CORE_CP229_PACK_BINDING.next_pack_id, "CP00-230");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P08.M05"], 22);
});

test("CP00-229 hermes binding slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp229HermesBindingSliceCaseSet();
  const descriptor = createDmsCoreCp229HermesBindingSliceDescriptor();
  const validation = validateDmsCoreCp229HermesBindingSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP229_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P08.M05"].rows;
  assert.equal(m05.pass_semantics.verdict_descriptor, "PASS");
  assert.equal(m05.regression_receipt.regression_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-229 evidence packets and handoff preserve hermes binding slice authority boundaries", () => {
  const descriptor = createDmsCoreCp229HermesBindingSliceDescriptor();
  const hermes = createDmsCoreCp229HermesEvidencePacket(cp229PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp229ClaudeReviewPacket(cp229PlanPack);
  const handoff = createDmsCoreCp229CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-229-to-CP00-230");
  assert.equal(handoff.next_subphase_id, "RP06.P08.M06.S09");
  assert.equal(handoff.production_ready_flag, "dms_core_hermes_binding_slice_descriptor_verified");
});

test("CP00-230 plan binding covers the planned 150 RP06 P08-closeout and P09-review-gate units", () => {
  const coverage = validateDmsCoreCp230Coverage(cp230PlanPack);

  assert.equal(DMS_CORE_CP230_PACK_BINDING.pack_id, "CP00-230");
  assert.equal(DMS_CORE_CP230_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP230_PACK_BINDING.unit_count, 150);
  assert.equal(DMS_CORE_CP230_PACK_BINDING.range, "RP06.P08.M06.S09-RP06.P09.M03.S10");
  assert.equal(DMS_CORE_CP230_PACK_BINDING.upstream_pack_id, "CP00-229");
  assert.equal(DMS_CORE_CP230_PACK_BINDING.next_pack_id, "CP00-231");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP06.P08"], 100);
  assert.equal(coverage.summary.by_phase["RP06.P09"], 50);
  assert.equal(Object.keys(DMS_CORE_CP230_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-230 review gate sections stay descriptor-only with severity and verdict boundaries", () => {
  const caseSet = createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet();
  const descriptor = createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor();
  const validation = validateDmsCoreCp230P08CloseoutP09ReviewGateDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP230_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP06.P09.M02"].rows;
  assert.deepEqual([...m02.severity_taxonomy.severity_levels], ["P0", "P1", "P2", "P3"]);
  assert.deepEqual([...m02.go_no_go_verdict_format.verdict_values], ["PASS", "PASS_WITH_FINDINGS", "BLOCK"]);
  assert.equal(m02.human_approval_summary.human_approval_route_required_before_runtime, true);
  assert.equal(m02.claude_review_packet.read_only, true);
  assert.equal(m02.block_closeout_note.blocks_closeout_descriptor, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-230 evidence packets and handoff preserve review gate authority boundaries", () => {
  const descriptor = createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor();
  const hermes = createDmsCoreCp230HermesEvidencePacket(cp230PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp230ClaudeReviewPacket(cp230PlanPack);
  const handoff = createDmsCoreCp230CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-230-to-CP00-231");
  assert.equal(handoff.next_subphase_id, "RP06.P09.M03.S11");
  assert.equal(handoff.production_ready_flag, "dms_core_p08_closeout_p09_review_gate_descriptor_verified");
});

test("CP00-231 plan binding covers the planned 40 RP06 review gate slice units", () => {
  const coverage = validateDmsCoreCp231Coverage(cp231PlanPack);

  assert.equal(DMS_CORE_CP231_PACK_BINDING.pack_id, "CP00-231");
  assert.equal(DMS_CORE_CP231_PACK_BINDING.risk_class, "B");
  assert.equal(DMS_CORE_CP231_PACK_BINDING.unit_count, 40);
  assert.equal(DMS_CORE_CP231_PACK_BINDING.range, "RP06.P09.M03.S11-RP06.P09.M05.S08");
  assert.equal(DMS_CORE_CP231_PACK_BINDING.upstream_pack_id, "CP00-230");
  assert.equal(DMS_CORE_CP231_PACK_BINDING.next_pack_id, "CP00-232");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP06.P09.M04"], 20);
});

test("CP00-231 review gate slice rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp231ReviewGateSliceCaseSet();
  const descriptor = createDmsCoreCp231ReviewGateSliceDescriptor();
  const validation = validateDmsCoreCp231ReviewGateSliceDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP231_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP06.P09.M03"].rows;
  assert.equal(m03.review_receipt_placeholder.review_receipt_descriptor_only, true);
  assert.equal(m03.future_correction_slot.future_correction_descriptor_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-231 evidence packets and handoff preserve review gate slice authority boundaries", () => {
  const descriptor = createDmsCoreCp231ReviewGateSliceDescriptor();
  const hermes = createDmsCoreCp231HermesEvidencePacket(cp231PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp231ClaudeReviewPacket(cp231PlanPack);
  const handoff = createDmsCoreCp231CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-231-to-CP00-232");
  assert.equal(handoff.next_subphase_id, "RP06.P09.M05.S09");
  assert.equal(handoff.production_ready_flag, "dms_core_review_gate_slice_descriptor_verified");
});

test("CP00-232 plan binding covers the planned 10 RP06 review audit binding units", () => {
  const coverage = validateDmsCoreCp232Coverage(cp232PlanPack);

  assert.equal(DMS_CORE_CP232_PACK_BINDING.pack_id, "CP00-232");
  assert.equal(DMS_CORE_CP232_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP232_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP232_PACK_BINDING.range, "RP06.P09.M05.S09-RP06.P09.M05.S18");
  assert.equal(DMS_CORE_CP232_PACK_BINDING.upstream_pack_id, "CP00-231");
  assert.equal(DMS_CORE_CP232_PACK_BINDING.next_pack_id, "CP00-233");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P09.M05"], 10);
});

test("CP00-232 review audit binding rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp232ReviewAuditBindingCaseSet();
  const descriptor = createDmsCoreCp232ReviewAuditBindingDescriptor();
  const validation = validateDmsCoreCp232ReviewAuditBindingDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP232_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP06.P09.M05"].rows;
  assert.deepEqual([...m05.severity_taxonomy.severity_levels], ["P0", "P1", "P2", "P3"]);
  assert.equal(m05.claude_review_packet.read_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-232 evidence packets and handoff preserve review audit binding authority boundaries", () => {
  const descriptor = createDmsCoreCp232ReviewAuditBindingDescriptor();
  const hermes = createDmsCoreCp232HermesEvidencePacket(cp232PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp232ClaudeReviewPacket(cp232PlanPack);
  const handoff = createDmsCoreCp232CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-232-to-CP00-233");
  assert.equal(handoff.next_subphase_id, "RP06.P09.M05.S19");
  assert.equal(handoff.production_ready_flag, "dms_core_review_audit_binding_descriptor_verified");
});

test("CP00-233 plan binding covers the planned 10 RP06 review fixture tail units", () => {
  const coverage = validateDmsCoreCp233Coverage(cp233PlanPack);

  assert.equal(DMS_CORE_CP233_PACK_BINDING.pack_id, "CP00-233");
  assert.equal(DMS_CORE_CP233_PACK_BINDING.risk_class, "A");
  assert.equal(DMS_CORE_CP233_PACK_BINDING.unit_count, 10);
  assert.equal(DMS_CORE_CP233_PACK_BINDING.range, "RP06.P09.M05.S19-RP06.P09.M06.S06");
  assert.equal(DMS_CORE_CP233_PACK_BINDING.upstream_pack_id, "CP00-232");
  assert.equal(DMS_CORE_CP233_PACK_BINDING.next_pack_id, "CP00-234");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP06.P09.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP06.P09.M06"], 6);
});

test("CP00-233 review fixture tail rows stay descriptor-only", () => {
  const caseSet = createDmsCoreCp233ReviewFixtureTailCaseSet();
  const descriptor = createDmsCoreCp233ReviewFixtureTailDescriptor();
  const validation = validateDmsCoreCp233ReviewFixtureTailDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(DMS_CORE_CP233_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP06.P09.M06"].rows;
  assert.equal(m06.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m06.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-233 evidence packets and handoff preserve review fixture tail authority boundaries", () => {
  const descriptor = createDmsCoreCp233ReviewFixtureTailDescriptor();
  const hermes = createDmsCoreCp233HermesEvidencePacket(cp233PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp233ClaudeReviewPacket(cp233PlanPack);
  const handoff = createDmsCoreCp233CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-233-to-CP00-234");
  assert.equal(handoff.next_subphase_id, "RP06.P09.M06.S07");
  assert.equal(handoff.production_ready_flag, "dms_core_review_fixture_tail_descriptor_verified");
});

test("CP00-234 plan binding covers the planned 86 RP06 P09 review closeout units", () => {
  const coverage = validateDmsCoreCp234Coverage(cp234PlanPack);

  assert.equal(DMS_CORE_CP234_PACK_BINDING.pack_id, "CP00-234");
  assert.equal(DMS_CORE_CP234_PACK_BINDING.risk_class, "C");
  assert.equal(DMS_CORE_CP234_PACK_BINDING.unit_count, 86);
  assert.equal(DMS_CORE_CP234_PACK_BINDING.range, "RP06.P09.M06.S07-RP06.P09.M10.S10");
  assert.equal(DMS_CORE_CP234_PACK_BINDING.upstream_pack_id, "CP00-233");
  assert.equal(DMS_CORE_CP234_PACK_BINDING.next_pack_id, "CP00-235");
  assert.equal(DMS_CORE_CP234_PACK_BINDING.next_subphase_id, "RP07.P00.M00.S01");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 86);
  assert.equal(coverage.summary.by_micro_phase["RP06.P09.M07"], 22);
  assert.equal(Object.keys(DMS_CORE_CP234_REQUIREMENTS.required_section_rows).length, 5);
});

test("CP00-234 P09 review closeout rows stay descriptor-only and close the RP06.P09 scope", () => {
  const caseSet = createDmsCoreCp234P09ReviewCloseoutCaseSet();
  const descriptor = createDmsCoreCp234P09ReviewCloseoutDescriptor();
  const validation = validateDmsCoreCp234P09ReviewCloseoutDescriptor(descriptor, dmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(DMS_CORE_CP234_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP06.P09.M06"].rows;
  assert.equal(m06.documentation_update.documentation_entry, "packages/dms/README.md#cp00-234");
  assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.closes_rp06_p09_descriptor_scope, true);
  assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.opens_rp07_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-234 evidence packets and handoff hand off to RP07 without opening runtime", () => {
  const descriptor = createDmsCoreCp234P09ReviewCloseoutDescriptor();
  const hermes = createDmsCoreCp234HermesEvidencePacket(cp234PlanPack, dmsContract, descriptor);
  const claude = createDmsCoreCp234ClaudeReviewPacket(cp234PlanPack);
  const handoff = createDmsCoreCp234CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-234-to-CP00-235");
  assert.equal(handoff.next_subphase_id, "RP07.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "dms_core_p09_review_closeout_descriptor_verified");
});
