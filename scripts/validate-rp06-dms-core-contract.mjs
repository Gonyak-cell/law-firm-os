#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  DMS_CORE_PROGRAM_CONTRACT,
  createDmsCoreCp198ClaudeReviewPacket,
  createDmsCoreCp198CloseoutHandoff,
  createDmsCoreCp198HermesEvidencePacket,
  createDmsCoreCp199ClaudeReviewPacket,
  createDmsCoreCp199CloseoutHandoff,
  createDmsCoreCp199HermesEvidencePacket,
  createDmsCoreCp199TypeShapeDescriptor,
  createDmsCoreCp200ClaudeReviewPacket,
  createDmsCoreCp200CloseoutHandoff,
  createDmsCoreCp200HermesEvidencePacket,
  createDmsCoreCp200PermissionAuditDescriptor,
  createDmsCoreCp201ClaudeReviewPacket,
  createDmsCoreCp201CloseoutHandoff,
  createDmsCoreCp201HermesEvidencePacket,
  createDmsCoreCp201ServiceDescriptor,
  createDmsCoreCp202ClaudeReviewPacket,
  createDmsCoreCp202CloseoutHandoff,
  createDmsCoreCp202HermesEvidencePacket,
  createDmsCoreCp202RouteMatrix,
  createDmsCoreCp203ClaudeReviewPacket,
  createDmsCoreCp203CloseoutHandoff,
  createDmsCoreCp203HermesEvidencePacket,
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
  createDmsCoreCp202WorkflowDescriptor,
  createDmsCoreFoundationDescriptor,
  createDmsCoreSyntheticFixture,
  validateDmsCoreCp198Coverage,
  validateDmsCoreCp198Foundation,
  validateDmsCoreCp199Coverage,
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
} from "../packages/dms/src/index.js";

const closeoutPlan = JSON.parse(await readFile(new URL("../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
const dmsContract = JSON.parse(await readFile(new URL("../contracts/dms-core-contract.json", import.meta.url), "utf8"));

async function readOptionalJson(relativePath) {
  try {
    return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
  } catch {
    return null;
  }
}

const cp198Manifest = await readOptionalJson("../docs/closeout-packs/cp00-198/manifest.json");
const cp199Manifest = await readOptionalJson("../docs/closeout-packs/cp00-199/manifest.json");
const cp200Manifest = await readOptionalJson("../docs/closeout-packs/cp00-200/manifest.json");
const cp201Manifest = await readOptionalJson("../docs/closeout-packs/cp00-201/manifest.json");
const cp202Manifest = await readOptionalJson("../docs/closeout-packs/cp00-202/manifest.json");
const cp203Manifest = await readOptionalJson("../docs/closeout-packs/cp00-203/manifest.json");
const cp204Manifest = await readOptionalJson("../docs/closeout-packs/cp00-204/manifest.json");
const cp205Manifest = await readOptionalJson("../docs/closeout-packs/cp00-205/manifest.json");
const cp206Manifest = await readOptionalJson("../docs/closeout-packs/cp00-206/manifest.json");
const cp207Manifest = await readOptionalJson("../docs/closeout-packs/cp00-207/manifest.json");
const cp208Manifest = await readOptionalJson("../docs/closeout-packs/cp00-208/manifest.json");
const cp209Manifest = await readOptionalJson("../docs/closeout-packs/cp00-209/manifest.json");
const cp210Manifest = await readOptionalJson("../docs/closeout-packs/cp00-210/manifest.json");
const cp211Manifest = await readOptionalJson("../docs/closeout-packs/cp00-211/manifest.json");
const cp212Manifest = await readOptionalJson("../docs/closeout-packs/cp00-212/manifest.json");
const cp213Manifest = await readOptionalJson("../docs/closeout-packs/cp00-213/manifest.json");
const cp214Manifest = await readOptionalJson("../docs/closeout-packs/cp00-214/manifest.json");
const cp215Manifest = await readOptionalJson("../docs/closeout-packs/cp00-215/manifest.json");
const cp216Manifest = await readOptionalJson("../docs/closeout-packs/cp00-216/manifest.json");
const cp217Manifest = await readOptionalJson("../docs/closeout-packs/cp00-217/manifest.json");
const cp218Manifest = await readOptionalJson("../docs/closeout-packs/cp00-218/manifest.json");
const cp219Manifest = await readOptionalJson("../docs/closeout-packs/cp00-219/manifest.json");
const cp220Manifest = await readOptionalJson("../docs/closeout-packs/cp00-220/manifest.json");
const cp221Manifest = await readOptionalJson("../docs/closeout-packs/cp00-221/manifest.json");
const cp222Manifest = await readOptionalJson("../docs/closeout-packs/cp00-222/manifest.json");
const cp223Manifest = await readOptionalJson("../docs/closeout-packs/cp00-223/manifest.json");
const cp224Manifest = await readOptionalJson("../docs/closeout-packs/cp00-224/manifest.json");
const cp225Manifest = await readOptionalJson("../docs/closeout-packs/cp00-225/manifest.json");
const cp226Manifest = await readOptionalJson("../docs/closeout-packs/cp00-226/manifest.json");
const cp227Manifest = await readOptionalJson("../docs/closeout-packs/cp00-227/manifest.json");
const cp228Manifest = await readOptionalJson("../docs/closeout-packs/cp00-228/manifest.json");
const cp229Manifest = await readOptionalJson("../docs/closeout-packs/cp00-229/manifest.json");
const cp230Manifest = await readOptionalJson("../docs/closeout-packs/cp00-230/manifest.json");
const cp231Manifest = await readOptionalJson("../docs/closeout-packs/cp00-231/manifest.json");
const cp232Manifest = await readOptionalJson("../docs/closeout-packs/cp00-232/manifest.json");
const cp233Manifest = await readOptionalJson("../docs/closeout-packs/cp00-233/manifest.json");
const cp234Manifest = await readOptionalJson("../docs/closeout-packs/cp00-234/manifest.json");
const cp198PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-198") ?? cp198Manifest?.plan_binding_snapshot;
const cp199PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-199") ?? cp199Manifest?.plan_binding_snapshot;
const cp200PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-200") ?? cp200Manifest?.plan_binding_snapshot;
const cp201PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-201") ?? cp201Manifest?.plan_binding_snapshot;
const cp202PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-202") ?? cp202Manifest?.plan_binding_snapshot;
const cp203PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-203") ?? cp203Manifest?.plan_binding_snapshot;
const cp204PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-204") ?? cp204Manifest?.plan_binding_snapshot;
const cp205PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-205") ?? cp205Manifest?.plan_binding_snapshot;
const cp206PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-206") ?? cp206Manifest?.plan_binding_snapshot;
const cp207PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-207") ?? cp207Manifest?.plan_binding_snapshot;
const cp208PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-208") ?? cp208Manifest?.plan_binding_snapshot;
const cp209PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-209") ?? cp209Manifest?.plan_binding_snapshot;
const cp210PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-210") ?? cp210Manifest?.plan_binding_snapshot;
const cp211PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-211") ?? cp211Manifest?.plan_binding_snapshot;
const cp212PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-212") ?? cp212Manifest?.plan_binding_snapshot;
const cp213PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-213") ?? cp213Manifest?.plan_binding_snapshot;
const cp214PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-214") ?? cp214Manifest?.plan_binding_snapshot;
const cp215PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-215") ?? cp215Manifest?.plan_binding_snapshot;
const cp216PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-216") ?? cp216Manifest?.plan_binding_snapshot;
const cp217PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-217") ?? cp217Manifest?.plan_binding_snapshot;
const cp218PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-218") ?? cp218Manifest?.plan_binding_snapshot;
const cp219PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-219") ?? cp219Manifest?.plan_binding_snapshot;
const cp220PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-220") ?? cp220Manifest?.plan_binding_snapshot;
const cp221PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-221") ?? cp221Manifest?.plan_binding_snapshot;
const cp222PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-222") ?? cp222Manifest?.plan_binding_snapshot;
const cp223PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-223") ?? cp223Manifest?.plan_binding_snapshot;
const cp224PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-224") ?? cp224Manifest?.plan_binding_snapshot;
const cp225PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-225") ?? cp225Manifest?.plan_binding_snapshot;
const cp226PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-226") ?? cp226Manifest?.plan_binding_snapshot;
const cp227PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-227") ?? cp227Manifest?.plan_binding_snapshot;
const cp228PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-228") ?? cp228Manifest?.plan_binding_snapshot;
const cp229PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-229") ?? cp229Manifest?.plan_binding_snapshot;
const cp230PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-230") ?? cp230Manifest?.plan_binding_snapshot;
const cp231PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-231") ?? cp231Manifest?.plan_binding_snapshot;
const cp232PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-232") ?? cp232Manifest?.plan_binding_snapshot;
const cp233PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-233") ?? cp233Manifest?.plan_binding_snapshot;
const cp234PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-234") ?? cp234Manifest?.plan_binding_snapshot;

assert.ok(cp198PlanPack, "CP00-198 must exist in closeout-pack-plan.json");
assert.equal(cp198PlanPack.unit_count, DMS_CORE_CP198_PACK_BINDING.unit_count, "CP00-198 unit count drift");
assert.ok(cp199PlanPack, "CP00-199 must exist in closeout-pack-plan.json");
assert.equal(cp199PlanPack.unit_count, DMS_CORE_CP199_PACK_BINDING.unit_count, "CP00-199 unit count drift");
assert.ok(cp200PlanPack, "CP00-200 must exist in closeout-pack-plan.json");
assert.equal(cp200PlanPack.unit_count, DMS_CORE_CP200_PACK_BINDING.unit_count, "CP00-200 unit count drift");
assert.ok(cp201PlanPack, "CP00-201 must exist in closeout-pack-plan.json");
assert.equal(cp201PlanPack.unit_count, DMS_CORE_CP201_PACK_BINDING.unit_count, "CP00-201 unit count drift");
assert.ok(cp202PlanPack, "CP00-202 must exist in closeout-pack-plan.json");
assert.equal(cp202PlanPack.unit_count, DMS_CORE_CP202_PACK_BINDING.unit_count, "CP00-202 unit count drift");
assert.ok(cp203PlanPack, "CP00-203 must exist in closeout-pack-plan.json");
assert.equal(cp203PlanPack.unit_count, DMS_CORE_CP203_PACK_BINDING.unit_count, "CP00-203 unit count drift");
assert.ok(cp204PlanPack, "CP00-204 must exist in closeout-pack-plan.json");
assert.equal(cp204PlanPack.unit_count, DMS_CORE_CP204_PACK_BINDING.unit_count, "CP00-204 unit count drift");
assert.ok(cp205PlanPack, "CP00-205 must exist in closeout-pack-plan.json");
assert.equal(cp205PlanPack.unit_count, DMS_CORE_CP205_PACK_BINDING.unit_count, "CP00-205 unit count drift");
assert.ok(cp206PlanPack, "CP00-206 must exist in closeout-pack-plan.json");
assert.equal(cp206PlanPack.unit_count, DMS_CORE_CP206_PACK_BINDING.unit_count, "CP00-206 unit count drift");
assert.ok(cp207PlanPack, "CP00-207 must exist in closeout-pack-plan.json");
assert.equal(cp207PlanPack.unit_count, DMS_CORE_CP207_PACK_BINDING.unit_count, "CP00-207 unit count drift");
assert.ok(cp208PlanPack, "CP00-208 must exist in closeout-pack-plan.json");
assert.equal(cp208PlanPack.unit_count, DMS_CORE_CP208_PACK_BINDING.unit_count, "CP00-208 unit count drift");
assert.ok(cp209PlanPack, "CP00-209 must exist in closeout-pack-plan.json");
assert.equal(cp209PlanPack.unit_count, DMS_CORE_CP209_PACK_BINDING.unit_count, "CP00-209 unit count drift");
assert.ok(cp210PlanPack, "CP00-210 must exist in closeout-pack-plan.json");
assert.equal(cp210PlanPack.unit_count, DMS_CORE_CP210_PACK_BINDING.unit_count, "CP00-210 unit count drift");
assert.ok(cp211PlanPack, "CP00-211 must exist in closeout-pack-plan.json");
assert.equal(cp211PlanPack.unit_count, DMS_CORE_CP211_PACK_BINDING.unit_count, "CP00-211 unit count drift");
assert.ok(cp212PlanPack, "CP00-212 must exist in closeout-pack-plan.json");
assert.equal(cp212PlanPack.unit_count, DMS_CORE_CP212_PACK_BINDING.unit_count, "CP00-212 unit count drift");
assert.ok(cp213PlanPack, "CP00-213 must exist in closeout-pack-plan.json");
assert.equal(cp213PlanPack.unit_count, DMS_CORE_CP213_PACK_BINDING.unit_count, "CP00-213 unit count drift");
assert.ok(cp214PlanPack, "CP00-214 must exist in closeout-pack-plan.json");
assert.equal(cp214PlanPack.unit_count, DMS_CORE_CP214_PACK_BINDING.unit_count, "CP00-214 unit count drift");
assert.ok(cp215PlanPack, "CP00-215 must exist in closeout-pack-plan.json");
assert.equal(cp215PlanPack.unit_count, DMS_CORE_CP215_PACK_BINDING.unit_count, "CP00-215 unit count drift");
assert.ok(cp216PlanPack, "CP00-216 must exist in closeout-pack-plan.json");
assert.equal(cp216PlanPack.unit_count, DMS_CORE_CP216_PACK_BINDING.unit_count, "CP00-216 unit count drift");
assert.ok(cp217PlanPack, "CP00-217 must exist in closeout-pack-plan.json");
assert.equal(cp217PlanPack.unit_count, DMS_CORE_CP217_PACK_BINDING.unit_count, "CP00-217 unit count drift");
assert.ok(cp218PlanPack, "CP00-218 must exist in closeout-pack-plan.json");
assert.equal(cp218PlanPack.unit_count, DMS_CORE_CP218_PACK_BINDING.unit_count, "CP00-218 unit count drift");
assert.ok(cp219PlanPack, "CP00-219 must exist in closeout-pack-plan.json");
assert.equal(cp219PlanPack.unit_count, DMS_CORE_CP219_PACK_BINDING.unit_count, "CP00-219 unit count drift");
assert.ok(cp220PlanPack, "CP00-220 must exist in closeout-pack-plan.json");
assert.equal(cp220PlanPack.unit_count, DMS_CORE_CP220_PACK_BINDING.unit_count, "CP00-220 unit count drift");
assert.ok(cp221PlanPack, "CP00-221 must exist in closeout-pack-plan.json");
assert.equal(cp221PlanPack.unit_count, DMS_CORE_CP221_PACK_BINDING.unit_count, "CP00-221 unit count drift");
assert.ok(cp222PlanPack, "CP00-222 must exist in closeout-pack-plan.json");
assert.equal(cp222PlanPack.unit_count, DMS_CORE_CP222_PACK_BINDING.unit_count, "CP00-222 unit count drift");
assert.ok(cp223PlanPack, "CP00-223 must exist in closeout-pack-plan.json");
assert.equal(cp223PlanPack.unit_count, DMS_CORE_CP223_PACK_BINDING.unit_count, "CP00-223 unit count drift");
assert.ok(cp224PlanPack, "CP00-224 must exist in closeout-pack-plan.json");
assert.equal(cp224PlanPack.unit_count, DMS_CORE_CP224_PACK_BINDING.unit_count, "CP00-224 unit count drift");
assert.ok(cp225PlanPack, "CP00-225 must exist in closeout-pack-plan.json");
assert.equal(cp225PlanPack.unit_count, DMS_CORE_CP225_PACK_BINDING.unit_count, "CP00-225 unit count drift");
assert.ok(cp226PlanPack, "CP00-226 must exist in closeout-pack-plan.json");
assert.equal(cp226PlanPack.unit_count, DMS_CORE_CP226_PACK_BINDING.unit_count, "CP00-226 unit count drift");
assert.ok(cp227PlanPack, "CP00-227 must exist in closeout-pack-plan.json");
assert.equal(cp227PlanPack.unit_count, DMS_CORE_CP227_PACK_BINDING.unit_count, "CP00-227 unit count drift");
assert.ok(cp228PlanPack, "CP00-228 must exist in closeout-pack-plan.json");
assert.equal(cp228PlanPack.unit_count, DMS_CORE_CP228_PACK_BINDING.unit_count, "CP00-228 unit count drift");
assert.ok(cp229PlanPack, "CP00-229 must exist in closeout-pack-plan.json");
assert.equal(cp229PlanPack.unit_count, DMS_CORE_CP229_PACK_BINDING.unit_count, "CP00-229 unit count drift");
assert.ok(cp230PlanPack, "CP00-230 must exist in closeout-pack-plan.json");
assert.equal(cp230PlanPack.unit_count, DMS_CORE_CP230_PACK_BINDING.unit_count, "CP00-230 unit count drift");
assert.ok(cp231PlanPack, "CP00-231 must exist in closeout-pack-plan.json");
assert.equal(cp231PlanPack.unit_count, DMS_CORE_CP231_PACK_BINDING.unit_count, "CP00-231 unit count drift");
assert.ok(cp232PlanPack, "CP00-232 must exist in closeout-pack-plan.json");
assert.equal(cp232PlanPack.unit_count, DMS_CORE_CP232_PACK_BINDING.unit_count, "CP00-232 unit count drift");
assert.ok(cp233PlanPack, "CP00-233 must exist in closeout-pack-plan.json");
assert.equal(cp233PlanPack.unit_count, DMS_CORE_CP233_PACK_BINDING.unit_count, "CP00-233 unit count drift");
assert.ok(cp234PlanPack, "CP00-234 must exist in closeout-pack-plan.json");
assert.equal(cp234PlanPack.unit_count, DMS_CORE_CP234_PACK_BINDING.unit_count, "CP00-234 unit count drift");
assert.equal(dmsContract.schema_version, "law-firm-os.dms-core-contract.v0.1");
assert.equal(dmsContract.current_pack.pack_id, "CP00-234");
assert.equal(dmsContract.program.program_id, "RP06");
assert.equal(dmsContract.program.owner_module, "LegalWorkspaceDms");
assert.equal(dmsContract.program.upstream_pack_id, "CP00-197");
assert.equal(dmsContract.program.current_pack_id, "CP00-234");

const coverage = validateDmsCoreCp198Coverage(cp198PlanPack);
const cp199Coverage = validateDmsCoreCp199Coverage(cp199PlanPack);
const cp200Coverage = validateDmsCoreCp200Coverage(cp200PlanPack);
const cp201Coverage = validateDmsCoreCp201Coverage(cp201PlanPack);
const cp202Coverage = validateDmsCoreCp202Coverage(cp202PlanPack);
const cp203Coverage = validateDmsCoreCp203Coverage(cp203PlanPack);
const cp204Coverage = validateDmsCoreCp204Coverage(cp204PlanPack);
const cp205Coverage = validateDmsCoreCp205Coverage(cp205PlanPack);
const cp206Coverage = validateDmsCoreCp206Coverage(cp206PlanPack);
const cp207Coverage = validateDmsCoreCp207Coverage(cp207PlanPack);
const cp208Coverage = validateDmsCoreCp208Coverage(cp208PlanPack);
const cp209Coverage = validateDmsCoreCp209Coverage(cp209PlanPack);
const cp210Coverage = validateDmsCoreCp210Coverage(cp210PlanPack);
const cp211Coverage = validateDmsCoreCp211Coverage(cp211PlanPack);
const cp212Coverage = validateDmsCoreCp212Coverage(cp212PlanPack);
const cp213Coverage = validateDmsCoreCp213Coverage(cp213PlanPack);
const cp214Coverage = validateDmsCoreCp214Coverage(cp214PlanPack);
const cp215Coverage = validateDmsCoreCp215Coverage(cp215PlanPack);
const cp216Coverage = validateDmsCoreCp216Coverage(cp216PlanPack);
const cp217Coverage = validateDmsCoreCp217Coverage(cp217PlanPack);
const cp218Coverage = validateDmsCoreCp218Coverage(cp218PlanPack);
const cp219Coverage = validateDmsCoreCp219Coverage(cp219PlanPack);
const cp220Coverage = validateDmsCoreCp220Coverage(cp220PlanPack);
const cp221Coverage = validateDmsCoreCp221Coverage(cp221PlanPack);
const cp222Coverage = validateDmsCoreCp222Coverage(cp222PlanPack);
const cp223Coverage = validateDmsCoreCp223Coverage(cp223PlanPack);
const cp224Coverage = validateDmsCoreCp224Coverage(cp224PlanPack);
const cp225Coverage = validateDmsCoreCp225Coverage(cp225PlanPack);
const cp226Coverage = validateDmsCoreCp226Coverage(cp226PlanPack);
const cp227Coverage = validateDmsCoreCp227Coverage(cp227PlanPack);
const cp228Coverage = validateDmsCoreCp228Coverage(cp228PlanPack);
const cp229Coverage = validateDmsCoreCp229Coverage(cp229PlanPack);
const cp230Coverage = validateDmsCoreCp230Coverage(cp230PlanPack);
const cp231Coverage = validateDmsCoreCp231Coverage(cp231PlanPack);
const cp232Coverage = validateDmsCoreCp232Coverage(cp232PlanPack);
const cp233Coverage = validateDmsCoreCp233Coverage(cp233PlanPack);
const cp234Coverage = validateDmsCoreCp234Coverage(cp234PlanPack);
const registry = validateDmsCoreRegistry();
const fixture = createDmsCoreSyntheticFixture();
const descriptor = createDmsCoreFoundationDescriptor();
const foundation = validateDmsCoreCp198Foundation(dmsContract, descriptor);
const hermes = createDmsCoreCp198HermesEvidencePacket(cp198PlanPack, dmsContract, descriptor);
const claude = createDmsCoreCp198ClaudeReviewPacket(cp198PlanPack);
const handoff = createDmsCoreCp198CloseoutHandoff();
const cp199Descriptor = createDmsCoreCp199TypeShapeDescriptor();
const cp199TypeShape = validateDmsCoreCp199TypeShape(dmsContract, cp199Descriptor);
const cp199Hermes = createDmsCoreCp199HermesEvidencePacket(cp199PlanPack, dmsContract, cp199Descriptor);
const cp199Claude = createDmsCoreCp199ClaudeReviewPacket(cp199PlanPack);
const cp199Handoff = createDmsCoreCp199CloseoutHandoff();
const cp200Descriptor = createDmsCoreCp200PermissionAuditDescriptor();
const cp200Binding = validateDmsCoreCp200PermissionAuditBinding(cp200Descriptor, dmsContract);
const cp200Fixture = validateDmsCoreCp200FixtureIntegrity(cp200Descriptor.fixture);
const cp200Hermes = createDmsCoreCp200HermesEvidencePacket(cp200PlanPack, dmsContract, cp200Descriptor);
const cp200Claude = createDmsCoreCp200ClaudeReviewPacket(cp200PlanPack);
const cp200Handoff = createDmsCoreCp200CloseoutHandoff();
const cp201Descriptor = createDmsCoreCp201ServiceDescriptor();
const cp201Service = validateDmsCoreCp201ServiceContract(cp201Descriptor, dmsContract);
const cp201GoldenCases = validateDmsCoreCp201GoldenCases(cp201Descriptor.golden_cases);
const cp201Hermes = createDmsCoreCp201HermesEvidencePacket(cp201PlanPack, dmsContract, cp201Descriptor);
const cp201Claude = createDmsCoreCp201ClaudeReviewPacket(cp201PlanPack);
const cp201Handoff = createDmsCoreCp201CloseoutHandoff();
const cp202Descriptor = createDmsCoreCp202WorkflowDescriptor();
const cp202RouteMatrix = validateDmsCoreCp202RouteMatrix(createDmsCoreCp202RouteMatrix());
const cp202Workflow = validateDmsCoreCp202WorkflowDescriptor(cp202Descriptor, dmsContract);
const cp202Hermes = createDmsCoreCp202HermesEvidencePacket(cp202PlanPack, dmsContract, cp202Descriptor);
const cp202Claude = createDmsCoreCp202ClaudeReviewPacket(cp202PlanPack);
const cp202Handoff = createDmsCoreCp202CloseoutHandoff();
const cp203Descriptor = createDmsCoreCp203SensitiveTailDescriptor();
const cp203SensitiveTail = validateDmsCoreCp203SensitiveTailDescriptor(cp203Descriptor, dmsContract);
const cp203Hermes = createDmsCoreCp203HermesEvidencePacket(cp203PlanPack, dmsContract, cp203Descriptor);
const cp203Claude = createDmsCoreCp203ClaudeReviewPacket(cp203PlanPack);
const cp203Handoff = createDmsCoreCp203CloseoutHandoff();
const cp204Descriptor = createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor();
const cp204GateSet = createDmsCoreCp204PermissionAuditGateSet();
const cp204PermissionAuditWorkflow = validateDmsCoreCp204PermissionAuditWorkflowBinding(cp204Descriptor, dmsContract);
const cp204Hermes = createDmsCoreCp204HermesEvidencePacket(cp204PlanPack, dmsContract, cp204Descriptor);
const cp204Claude = createDmsCoreCp204ClaudeReviewPacket(cp204PlanPack);
const cp204Handoff = createDmsCoreCp204CloseoutHandoff();
const cp205Descriptor = createDmsCoreCp205PermissionAuditTailDescriptor();
const cp205CaseSet = createDmsCoreCp205PermissionAuditTailCaseSet();
const cp205PermissionAuditTail = validateDmsCoreCp205PermissionAuditTailDescriptor(cp205Descriptor, dmsContract);
const cp205Hermes = createDmsCoreCp205HermesEvidencePacket(cp205PlanPack, dmsContract, cp205Descriptor);
const cp205Claude = createDmsCoreCp205ClaudeReviewPacket(cp205PlanPack);
const cp205Handoff = createDmsCoreCp205CloseoutHandoff();
const cp206Descriptor = createDmsCoreCp206SyntheticFixtureServiceDescriptor();
const cp206CaseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet();
const cp206SyntheticFixtureService = validateDmsCoreCp206SyntheticFixtureServiceDescriptor(cp206Descriptor, dmsContract);
const cp206Hermes = createDmsCoreCp206HermesEvidencePacket(cp206PlanPack, dmsContract, cp206Descriptor);
const cp206Claude = createDmsCoreCp206ClaudeReviewPacket(cp206PlanPack);
const cp206Handoff = createDmsCoreCp206CloseoutHandoff();
const cp207Descriptor = createDmsCoreCp207SyntheticFixtureWorkflowDescriptor();
const cp207CaseSet = createDmsCoreCp207SyntheticFixtureWorkflowCaseSet();
const cp207SyntheticFixtureWorkflow = validateDmsCoreCp207SyntheticFixtureWorkflowDescriptor(cp207Descriptor, dmsContract);
const cp207Hermes = createDmsCoreCp207HermesEvidencePacket(cp207PlanPack, dmsContract, cp207Descriptor);
const cp207Claude = createDmsCoreCp207ClaudeReviewPacket(cp207PlanPack);
const cp207Handoff = createDmsCoreCp207CloseoutHandoff();
const cp208Descriptor = createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor();
const cp208CaseSet = createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet();
const cp208SyntheticFixtureTailEntrypoint = validateDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor(cp208Descriptor, dmsContract);
const cp208Hermes = createDmsCoreCp208HermesEvidencePacket(cp208PlanPack, dmsContract, cp208Descriptor);
const cp208Claude = createDmsCoreCp208ClaudeReviewPacket(cp208PlanPack);
const cp208Handoff = createDmsCoreCp208CloseoutHandoff();
const cp209Descriptor = createDmsCoreCp209GoldenCaseHermesCycleDescriptor();
const cp209CaseSet = createDmsCoreCp209GoldenCaseHermesCycleCaseSet();
const cp209GoldenCaseHermesCycle = validateDmsCoreCp209GoldenCaseHermesCycleDescriptor(cp209Descriptor, dmsContract);
const cp209Hermes = createDmsCoreCp209HermesEvidencePacket(cp209PlanPack, dmsContract, cp209Descriptor);
const cp209Claude = createDmsCoreCp209ClaudeReviewPacket(cp209PlanPack);
const cp209Handoff = createDmsCoreCp209CloseoutHandoff();
const cp210Descriptor = createDmsCoreCp210P02CloseoutP03FoundationDescriptor();
const cp210CaseSet = createDmsCoreCp210P02CloseoutP03FoundationCaseSet();
const cp210Foundation = validateDmsCoreCp210P02CloseoutP03FoundationDescriptor(cp210Descriptor, dmsContract);
const cp210Hermes = createDmsCoreCp210HermesEvidencePacket(cp210PlanPack, dmsContract, cp210Descriptor);
const cp210Claude = createDmsCoreCp210ClaudeReviewPacket(cp210PlanPack);
const cp210Handoff = createDmsCoreCp210CloseoutHandoff();
const cp211Descriptor = createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor();
const cp211CaseSet = createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet();
const cp211Foundation = validateDmsCoreCp211P03CloseoutP04UiFoundationDescriptor(cp211Descriptor, dmsContract);
const cp211Hermes = createDmsCoreCp211HermesEvidencePacket(cp211PlanPack, dmsContract, cp211Descriptor);
const cp211Claude = createDmsCoreCp211ClaudeReviewPacket(cp211PlanPack);
const cp211Handoff = createDmsCoreCp211CloseoutHandoff();
const cp212Descriptor = createDmsCoreCp212UiPrimarySliceTailDescriptor();
const cp212CaseSet = createDmsCoreCp212UiPrimarySliceTailCaseSet();
const cp212Tail = validateDmsCoreCp212UiPrimarySliceTailDescriptor(cp212Descriptor, dmsContract);
const cp212Hermes = createDmsCoreCp212HermesEvidencePacket(cp212PlanPack, dmsContract, cp212Descriptor);
const cp212Claude = createDmsCoreCp212ClaudeReviewPacket(cp212PlanPack);
const cp212Handoff = createDmsCoreCp212CloseoutHandoff();
const cp213Descriptor = createDmsCoreCp213UiSecondarySliceBindingDescriptor();
const cp213CaseSet = createDmsCoreCp213UiSecondarySliceBindingCaseSet();
const cp213Binding = validateDmsCoreCp213UiSecondarySliceBindingDescriptor(cp213Descriptor, dmsContract);
const cp213Hermes = createDmsCoreCp213HermesEvidencePacket(cp213PlanPack, dmsContract, cp213Descriptor);
const cp213Claude = createDmsCoreCp213ClaudeReviewPacket(cp213PlanPack);
const cp213Handoff = createDmsCoreCp213CloseoutHandoff();
const cp214Descriptor = createDmsCoreCp214UiBindingTailDescriptor();
const cp214CaseSet = createDmsCoreCp214UiBindingTailCaseSet();
const cp214Tail = validateDmsCoreCp214UiBindingTailDescriptor(cp214Descriptor, dmsContract);
const cp214Hermes = createDmsCoreCp214HermesEvidencePacket(cp214PlanPack, dmsContract, cp214Descriptor);
const cp214Claude = createDmsCoreCp214ClaudeReviewPacket(cp214PlanPack);
const cp214Handoff = createDmsCoreCp214CloseoutHandoff();
const cp215Descriptor = createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor();
const cp215CaseSet = createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet();
const cp215Foundation = validateDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor(cp215Descriptor, dmsContract);
const cp215Hermes = createDmsCoreCp215HermesEvidencePacket(cp215PlanPack, dmsContract, cp215Descriptor);
const cp215Claude = createDmsCoreCp215ClaudeReviewPacket(cp215PlanPack);
const cp215Handoff = createDmsCoreCp215CloseoutHandoff();
const cp216Descriptor = createDmsCoreCp216FixtureCaseSliceDescriptor();
const cp216CaseSet = createDmsCoreCp216FixtureCaseSliceCaseSet();
const cp216Slice = validateDmsCoreCp216FixtureCaseSliceDescriptor(cp216Descriptor, dmsContract);
const cp216Hermes = createDmsCoreCp216HermesEvidencePacket(cp216PlanPack, dmsContract, cp216Descriptor);
const cp216Claude = createDmsCoreCp216ClaudeReviewPacket(cp216PlanPack);
const cp216Handoff = createDmsCoreCp216CloseoutHandoff();
const cp217Descriptor = createDmsCoreCp217FixtureBindingSliceDescriptor();
const cp217CaseSet = createDmsCoreCp217FixtureBindingSliceCaseSet();
const cp217Slice = validateDmsCoreCp217FixtureBindingSliceDescriptor(cp217Descriptor, dmsContract);
const cp217Hermes = createDmsCoreCp217HermesEvidencePacket(cp217PlanPack, dmsContract, cp217Descriptor);
const cp217Claude = createDmsCoreCp217ClaudeReviewPacket(cp217PlanPack);
const cp217Handoff = createDmsCoreCp217CloseoutHandoff();
const cp218Descriptor = createDmsCoreCp218FixtureSetTailDescriptor();
const cp218CaseSet = createDmsCoreCp218FixtureSetTailCaseSet();
const cp218Tail = validateDmsCoreCp218FixtureSetTailDescriptor(cp218Descriptor, dmsContract);
const cp218Hermes = createDmsCoreCp218HermesEvidencePacket(cp218PlanPack, dmsContract, cp218Descriptor);
const cp218Claude = createDmsCoreCp218ClaudeReviewPacket(cp218PlanPack);
const cp218Handoff = createDmsCoreCp218CloseoutHandoff();
const cp219Descriptor = createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor();
const cp219CaseSet = createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet();
const cp219Matrix = validateDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor(cp219Descriptor, dmsContract);
const cp219Hermes = createDmsCoreCp219HermesEvidencePacket(cp219PlanPack, dmsContract, cp219Descriptor);
const cp219Claude = createDmsCoreCp219ClaudeReviewPacket(cp219PlanPack);
const cp219Handoff = createDmsCoreCp219CloseoutHandoff();
const cp220Descriptor = createDmsCoreCp220PermissionMatrixSliceDescriptor();
const cp220CaseSet = createDmsCoreCp220PermissionMatrixSliceCaseSet();
const cp220Slice = validateDmsCoreCp220PermissionMatrixSliceDescriptor(cp220Descriptor, dmsContract);
const cp220Hermes = createDmsCoreCp220HermesEvidencePacket(cp220PlanPack, dmsContract, cp220Descriptor);
const cp220Claude = createDmsCoreCp220ClaudeReviewPacket(cp220PlanPack);
const cp220Handoff = createDmsCoreCp220CloseoutHandoff();
const cp221Descriptor = createDmsCoreCp221PermissionWorkflowSliceDescriptor();
const cp221CaseSet = createDmsCoreCp221PermissionWorkflowSliceCaseSet();
const cp221Slice = validateDmsCoreCp221PermissionWorkflowSliceDescriptor(cp221Descriptor, dmsContract);
const cp221Hermes = createDmsCoreCp221HermesEvidencePacket(cp221PlanPack, dmsContract, cp221Descriptor);
const cp221Claude = createDmsCoreCp221ClaudeReviewPacket(cp221PlanPack);
const cp221Handoff = createDmsCoreCp221CloseoutHandoff();
const cp222Descriptor = createDmsCoreCp222PermissionAuditBindingSliceDescriptor();
const cp222CaseSet = createDmsCoreCp222PermissionAuditBindingSliceCaseSet();
const cp222Slice = validateDmsCoreCp222PermissionAuditBindingSliceDescriptor(cp222Descriptor, dmsContract);
const cp222Hermes = createDmsCoreCp222HermesEvidencePacket(cp222PlanPack, dmsContract, cp222Descriptor);
const cp222Claude = createDmsCoreCp222ClaudeReviewPacket(cp222PlanPack);
const cp222Handoff = createDmsCoreCp222CloseoutHandoff();
const cp223Descriptor = createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor();
const cp223CaseSet = createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet();
const cp223Foundation = validateDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor(cp223Descriptor, dmsContract);
const cp223Hermes = createDmsCoreCp223HermesEvidencePacket(cp223PlanPack, dmsContract, cp223Descriptor);
const cp223Claude = createDmsCoreCp223ClaudeReviewPacket(cp223PlanPack);
const cp223Handoff = createDmsCoreCp223CloseoutHandoff();
const cp224Descriptor = createDmsCoreCp224FailureRecoverySliceDescriptor();
const cp224CaseSet = createDmsCoreCp224FailureRecoverySliceCaseSet();
const cp224Slice = validateDmsCoreCp224FailureRecoverySliceDescriptor(cp224Descriptor, dmsContract);
const cp224Hermes = createDmsCoreCp224HermesEvidencePacket(cp224PlanPack, dmsContract, cp224Descriptor);
const cp224Claude = createDmsCoreCp224ClaudeReviewPacket(cp224PlanPack);
const cp224Handoff = createDmsCoreCp224CloseoutHandoff();
const cp225Descriptor = createDmsCoreCp225FailureBindingSliceDescriptor();
const cp225CaseSet = createDmsCoreCp225FailureBindingSliceCaseSet();
const cp225Slice = validateDmsCoreCp225FailureBindingSliceDescriptor(cp225Descriptor, dmsContract);
const cp225Hermes = createDmsCoreCp225HermesEvidencePacket(cp225PlanPack, dmsContract, cp225Descriptor);
const cp225Claude = createDmsCoreCp225ClaudeReviewPacket(cp225PlanPack);
const cp225Handoff = createDmsCoreCp225CloseoutHandoff();
const cp226Descriptor = createDmsCoreCp226FailureAuditTailDescriptor();
const cp226CaseSet = createDmsCoreCp226FailureAuditTailCaseSet();
const cp226Tail = validateDmsCoreCp226FailureAuditTailDescriptor(cp226Descriptor, dmsContract);
const cp226Hermes = createDmsCoreCp226HermesEvidencePacket(cp226PlanPack, dmsContract, cp226Descriptor);
const cp226Claude = createDmsCoreCp226ClaudeReviewPacket(cp226PlanPack);
const cp226Handoff = createDmsCoreCp226CloseoutHandoff();
const cp227Descriptor = createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor();
const cp227CaseSet = createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet();
const cp227Receipt = validateDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor(cp227Descriptor, dmsContract);
const cp227Hermes = createDmsCoreCp227HermesEvidencePacket(cp227PlanPack, dmsContract, cp227Descriptor);
const cp227Claude = createDmsCoreCp227ClaudeReviewPacket(cp227PlanPack);
const cp227Handoff = createDmsCoreCp227CloseoutHandoff();
const cp228Descriptor = createDmsCoreCp228HermesReceiptSliceDescriptor();
const cp228CaseSet = createDmsCoreCp228HermesReceiptSliceCaseSet();
const cp228Slice = validateDmsCoreCp228HermesReceiptSliceDescriptor(cp228Descriptor, dmsContract);
const cp228Hermes = createDmsCoreCp228HermesEvidencePacket(cp228PlanPack, dmsContract, cp228Descriptor);
const cp228Claude = createDmsCoreCp228ClaudeReviewPacket(cp228PlanPack);
const cp228Handoff = createDmsCoreCp228CloseoutHandoff();
const cp229Descriptor = createDmsCoreCp229HermesBindingSliceDescriptor();
const cp229CaseSet = createDmsCoreCp229HermesBindingSliceCaseSet();
const cp229Slice = validateDmsCoreCp229HermesBindingSliceDescriptor(cp229Descriptor, dmsContract);
const cp229Hermes = createDmsCoreCp229HermesEvidencePacket(cp229PlanPack, dmsContract, cp229Descriptor);
const cp229Claude = createDmsCoreCp229ClaudeReviewPacket(cp229PlanPack);
const cp229Handoff = createDmsCoreCp229CloseoutHandoff();
const cp230Descriptor = createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor();
const cp230CaseSet = createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet();
const cp230Gate = validateDmsCoreCp230P08CloseoutP09ReviewGateDescriptor(cp230Descriptor, dmsContract);
const cp230Hermes = createDmsCoreCp230HermesEvidencePacket(cp230PlanPack, dmsContract, cp230Descriptor);
const cp230Claude = createDmsCoreCp230ClaudeReviewPacket(cp230PlanPack);
const cp230Handoff = createDmsCoreCp230CloseoutHandoff();
const cp231Descriptor = createDmsCoreCp231ReviewGateSliceDescriptor();
const cp231CaseSet = createDmsCoreCp231ReviewGateSliceCaseSet();
const cp231Slice = validateDmsCoreCp231ReviewGateSliceDescriptor(cp231Descriptor, dmsContract);
const cp231Hermes = createDmsCoreCp231HermesEvidencePacket(cp231PlanPack, dmsContract, cp231Descriptor);
const cp231Claude = createDmsCoreCp231ClaudeReviewPacket(cp231PlanPack);
const cp231Handoff = createDmsCoreCp231CloseoutHandoff();
const cp232Descriptor = createDmsCoreCp232ReviewAuditBindingDescriptor();
const cp232CaseSet = createDmsCoreCp232ReviewAuditBindingCaseSet();
const cp232Binding = validateDmsCoreCp232ReviewAuditBindingDescriptor(cp232Descriptor, dmsContract);
const cp232Hermes = createDmsCoreCp232HermesEvidencePacket(cp232PlanPack, dmsContract, cp232Descriptor);
const cp232Claude = createDmsCoreCp232ClaudeReviewPacket(cp232PlanPack);
const cp232Handoff = createDmsCoreCp232CloseoutHandoff();
const cp233Descriptor = createDmsCoreCp233ReviewFixtureTailDescriptor();
const cp233CaseSet = createDmsCoreCp233ReviewFixtureTailCaseSet();
const cp233Tail = validateDmsCoreCp233ReviewFixtureTailDescriptor(cp233Descriptor, dmsContract);
const cp233Hermes = createDmsCoreCp233HermesEvidencePacket(cp233PlanPack, dmsContract, cp233Descriptor);
const cp233Claude = createDmsCoreCp233ClaudeReviewPacket(cp233PlanPack);
const cp233Handoff = createDmsCoreCp233CloseoutHandoff();
const cp234Descriptor = createDmsCoreCp234P09ReviewCloseoutDescriptor();
const cp234CaseSet = createDmsCoreCp234P09ReviewCloseoutCaseSet();
const cp234Closeout = validateDmsCoreCp234P09ReviewCloseoutDescriptor(cp234Descriptor, dmsContract);
const cp234Hermes = createDmsCoreCp234HermesEvidencePacket(cp234PlanPack, dmsContract, cp234Descriptor);
const cp234Claude = createDmsCoreCp234ClaudeReviewPacket(cp234PlanPack);
const cp234Handoff = createDmsCoreCp234CloseoutHandoff();

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
assert.equal(cp199Coverage.valid, true, cp199Coverage.errors.join("; "));
assert.equal(cp199Coverage.summary.unit_count, 40);
assert.equal(cp199Coverage.summary.by_phase["RP06.P01"], 40);
assert.equal(cp199Coverage.summary.by_deliverable.implementation, 23);
assert.equal(cp199Coverage.summary.by_deliverable.ui, 5);
assert.equal(cp199Coverage.summary.by_deliverable.fixture, 2);
assert.equal(cp199Coverage.summary.by_deliverable.test, 6);
assert.equal(cp199Coverage.summary.by_deliverable.hermes_evidence, 2);
assert.equal(cp199Coverage.summary.by_deliverable.claude_review, 2);
assert.equal(cp200Coverage.valid, true, cp200Coverage.errors.join("; "));
assert.equal(cp200Coverage.summary.unit_count, 40);
assert.equal(cp200Coverage.summary.by_phase["RP06.P01"], 40);
assert.equal(cp200Coverage.summary.by_deliverable.implementation, 22);
assert.equal(cp200Coverage.summary.by_deliverable.ui, 6);
assert.equal(cp200Coverage.summary.by_deliverable.fixture, 2);
assert.equal(cp200Coverage.summary.by_deliverable.test, 6);
assert.equal(cp200Coverage.summary.by_deliverable.hermes_evidence, 2);
assert.equal(cp200Coverage.summary.by_deliverable.claude_review, 2);
assert.equal(cp201Coverage.valid, true, cp201Coverage.errors.join("; "));
assert.equal(cp201Coverage.summary.unit_count, 150);
assert.equal(cp201Coverage.summary.by_phase["RP06.P01"], 88);
assert.equal(cp201Coverage.summary.by_phase["RP06.P02"], 62);
assert.equal(cp201Coverage.summary.by_deliverable.implementation, 77);
assert.equal(cp201Coverage.summary.by_deliverable.ui, 23);
assert.equal(cp201Coverage.summary.by_deliverable.fixture, 4);
assert.equal(cp201Coverage.summary.by_deliverable.test, 20);
assert.equal(cp201Coverage.summary.by_deliverable.hermes_evidence, 4);
assert.equal(cp201Coverage.summary.by_deliverable.claude_review, 7);
assert.equal(cp201Coverage.summary.by_deliverable.contract, 3);
assert.equal(cp201Coverage.summary.by_deliverable.security_audit, 6);
assert.equal(cp201Coverage.summary.by_deliverable.failure_recovery, 6);
assert.equal(cp202Coverage.valid, true, cp202Coverage.errors.join("; "));
assert.equal(cp202Coverage.summary.unit_count, 40);
assert.equal(cp202Coverage.summary.by_phase["RP06.P02"], 40);
assert.equal(cp202Coverage.summary.by_micro_phase["RP06.P02.M03"], 25);
assert.equal(cp202Coverage.summary.by_micro_phase["RP06.P02.M04"], 15);
assert.equal(cp202Coverage.summary.by_deliverable.contract, 2);
assert.equal(cp202Coverage.summary.by_deliverable.implementation, 17);
assert.equal(cp202Coverage.summary.by_deliverable.security_audit, 4);
assert.equal(cp202Coverage.summary.by_deliverable.ui, 6);
assert.equal(cp202Coverage.summary.by_deliverable.claude_review, 3);
assert.equal(cp202Coverage.summary.by_deliverable.failure_recovery, 2);
assert.equal(cp202Coverage.summary.by_deliverable.test, 4);
assert.equal(cp202Coverage.summary.by_deliverable.fixture, 1);
assert.equal(cp202Coverage.summary.by_deliverable.hermes_evidence, 1);
assert.equal(cp203Coverage.valid, true, cp203Coverage.errors.join("; "));
assert.equal(cp203Coverage.summary.unit_count, 10);
assert.equal(cp203Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp203Coverage.summary.by_micro_phase["RP06.P02.M04"], 10);
assert.equal(cp203Coverage.summary.by_deliverable.implementation, 1);
assert.equal(cp203Coverage.summary.by_deliverable.failure_recovery, 2);
assert.equal(cp203Coverage.summary.by_deliverable.test, 4);
assert.equal(cp203Coverage.summary.by_deliverable.fixture, 1);
assert.equal(cp203Coverage.summary.by_deliverable.hermes_evidence, 1);
assert.equal(cp203Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp204Coverage.valid, true, cp204Coverage.errors.join("; "));
assert.equal(cp204Coverage.summary.unit_count, 10);
assert.equal(cp204Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp204Coverage.summary.by_micro_phase["RP06.P02.M05"], 10);
assert.equal(cp204Coverage.summary.by_deliverable.contract, 1);
assert.equal(cp204Coverage.summary.by_deliverable.implementation, 6);
assert.equal(cp204Coverage.summary.by_deliverable.security_audit, 2);
assert.equal(cp204Coverage.summary.by_deliverable.ui, 1);
assert.equal(cp205Coverage.valid, true, cp205Coverage.errors.join("; "));
assert.equal(cp205Coverage.summary.unit_count, 10);
assert.equal(cp205Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp205Coverage.summary.by_micro_phase["RP06.P02.M05"], 10);
assert.equal(cp205Coverage.summary.by_deliverable.ui, 2);
assert.equal(cp205Coverage.summary.by_deliverable.implementation, 3);
assert.equal(cp205Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp205Coverage.summary.by_deliverable.failure_recovery, 2);
assert.equal(cp205Coverage.summary.by_deliverable.test, 2);
assert.equal(cp206Coverage.valid, true, cp206Coverage.errors.join("; "));
assert.equal(cp206Coverage.summary.unit_count, 10);
assert.equal(cp206Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp206Coverage.summary.by_micro_phase["RP06.P02.M05"], 5);
assert.equal(cp206Coverage.summary.by_micro_phase["RP06.P02.M06"], 5);
assert.equal(cp206Coverage.summary.by_deliverable.test, 2);
assert.equal(cp206Coverage.summary.by_deliverable.fixture, 1);
assert.equal(cp206Coverage.summary.by_deliverable.hermes_evidence, 1);
assert.equal(cp206Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp206Coverage.summary.by_deliverable.contract, 1);
assert.equal(cp206Coverage.summary.by_deliverable.implementation, 3);
assert.equal(cp206Coverage.summary.by_deliverable.security_audit, 1);
assert.equal(cp207Coverage.valid, true, cp207Coverage.errors.join("; "));
assert.equal(cp207Coverage.summary.unit_count, 10);
assert.equal(cp207Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp207Coverage.summary.by_micro_phase["RP06.P02.M06"], 10);
assert.equal(cp207Coverage.summary.by_deliverable.security_audit, 1);
assert.equal(cp207Coverage.summary.by_deliverable.implementation, 5);
assert.equal(cp207Coverage.summary.by_deliverable.ui, 3);
assert.equal(cp207Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp208Coverage.valid, true, cp208Coverage.errors.join("; "));
assert.equal(cp208Coverage.summary.unit_count, 10);
assert.equal(cp208Coverage.summary.by_phase["RP06.P02"], 10);
assert.equal(cp208Coverage.summary.by_micro_phase["RP06.P02.M06"], 7);
assert.equal(cp208Coverage.summary.by_micro_phase["RP06.P02.M07"], 3);
assert.equal(cp208Coverage.summary.by_deliverable.contract, 1);
assert.equal(cp208Coverage.summary.by_deliverable.failure_recovery, 2);
assert.equal(cp208Coverage.summary.by_deliverable.implementation, 3);
assert.equal(cp208Coverage.summary.by_deliverable.test, 4);
assert.equal(cp209Coverage.valid, true, cp209Coverage.errors.join("; "));
assert.equal(cp209Coverage.summary.unit_count, 40);
assert.equal(cp209Coverage.summary.by_phase["RP06.P02"], 40);
assert.equal(cp209Coverage.summary.by_micro_phase["RP06.P02.M07"], 22);
assert.equal(cp209Coverage.summary.by_micro_phase["RP06.P02.M08"], 18);
assert.equal(cp209Coverage.summary.by_deliverable.implementation, 16);
assert.equal(cp209Coverage.summary.by_deliverable.security_audit, 4);
assert.equal(cp209Coverage.summary.by_deliverable.ui, 6);
assert.equal(cp209Coverage.summary.by_deliverable.claude_review, 3);
assert.equal(cp209Coverage.summary.by_deliverable.failure_recovery, 4);
assert.equal(cp209Coverage.summary.by_deliverable.test, 4);
assert.equal(cp209Coverage.summary.by_deliverable.fixture, 1);
assert.equal(cp209Coverage.summary.by_deliverable.hermes_evidence, 1);
assert.equal(cp209Coverage.summary.by_deliverable.contract, 1);
assert.equal(cp210Coverage.valid, true, cp210Coverage.errors.join("; "));
assert.equal(cp210Coverage.summary.unit_count, 150);
assert.equal(cp210Coverage.summary.by_phase["RP06.P02"], 46);
assert.equal(cp210Coverage.summary.by_phase["RP06.P03"], 104);
assert.equal(cp210Coverage.summary.by_deliverable.implementation, 64);
assert.equal(cp210Coverage.summary.by_deliverable.contract, 28);
assert.equal(cp210Coverage.summary.by_deliverable.test, 22);
assert.equal(cp210Coverage.summary.by_deliverable.security_audit, 16);
assert.equal(cp211Coverage.valid, true, cp211Coverage.errors.join("; "));
assert.equal(cp211Coverage.summary.unit_count, 150);
assert.equal(cp211Coverage.summary.by_phase["RP06.P03"], 92);
assert.equal(cp211Coverage.summary.by_phase["RP06.P04"], 58);
assert.equal(cp211Coverage.summary.by_deliverable.ui, 28);
assert.equal(cp211Coverage.summary.by_deliverable.implementation, 53);
assert.equal(cp212Coverage.valid, true, cp212Coverage.errors.join("; "));
assert.equal(cp212Coverage.summary.unit_count, 10);
assert.equal(cp212Coverage.summary.by_micro_phase["RP06.P04.M03"], 10);
assert.equal(cp213Coverage.valid, true, cp213Coverage.errors.join("; "));
assert.equal(cp213Coverage.summary.unit_count, 40);
assert.equal(cp213Coverage.summary.by_micro_phase["RP06.P04.M04"], 22);
assert.equal(cp213Coverage.summary.by_micro_phase["RP06.P04.M05"], 14);
assert.equal(cp214Coverage.valid, true, cp214Coverage.errors.join("; "));
assert.equal(cp214Coverage.summary.unit_count, 10);
assert.equal(cp214Coverage.summary.by_micro_phase["RP06.P04.M05"], 8);
assert.equal(cp214Coverage.summary.by_micro_phase["RP06.P04.M06"], 2);
assert.equal(cp215Coverage.valid, true, cp215Coverage.errors.join("; "));
assert.equal(cp215Coverage.summary.unit_count, 150);
assert.equal(cp215Coverage.summary.by_phase["RP06.P04"], 106);
assert.equal(cp215Coverage.summary.by_phase["RP06.P05"], 44);
assert.equal(cp216Coverage.valid, true, cp216Coverage.errors.join("; "));
assert.equal(cp216Coverage.summary.unit_count, 40);
assert.equal(cp216Coverage.summary.by_micro_phase["RP06.P05.M03"], 22);
assert.equal(cp217Coverage.valid, true, cp217Coverage.errors.join("; "));
assert.equal(cp217Coverage.summary.unit_count, 40);
assert.equal(cp217Coverage.summary.by_micro_phase["RP06.P05.M05"], 22);
assert.equal(cp218Coverage.valid, true, cp218Coverage.errors.join("; "));
assert.equal(cp218Coverage.summary.unit_count, 10);
assert.equal(cp218Coverage.summary.by_micro_phase["RP06.P05.M06"], 10);
assert.equal(cp219Coverage.valid, true, cp219Coverage.errors.join("; "));
assert.equal(cp219Coverage.summary.unit_count, 150);
assert.equal(cp219Coverage.summary.by_phase["RP06.P05"], 90);
assert.equal(cp219Coverage.summary.by_phase["RP06.P06"], 60);
assert.equal(cp220Coverage.valid, true, cp220Coverage.errors.join("; "));
assert.equal(cp220Coverage.summary.unit_count, 10);
assert.equal(cp220Coverage.summary.by_micro_phase["RP06.P06.M03"], 8);
assert.equal(cp221Coverage.valid, true, cp221Coverage.errors.join("; "));
assert.equal(cp221Coverage.summary.unit_count, 40);
assert.equal(cp221Coverage.summary.by_micro_phase["RP06.P06.M04"], 23);
assert.equal(cp222Coverage.valid, true, cp222Coverage.errors.join("; "));
assert.equal(cp222Coverage.summary.unit_count, 40);
assert.equal(cp222Coverage.summary.by_micro_phase["RP06.P06.M05"], 25);
assert.equal(cp223Coverage.valid, true, cp223Coverage.errors.join("; "));
assert.equal(cp223Coverage.summary.unit_count, 150);
assert.equal(cp223Coverage.summary.by_phase["RP06.P06"], 98);
assert.equal(cp223Coverage.summary.by_phase["RP06.P07"], 52);
assert.equal(cp224Coverage.valid, true, cp224Coverage.errors.join("; "));
assert.equal(cp224Coverage.summary.unit_count, 40);
assert.equal(cp224Coverage.summary.by_micro_phase["RP06.P07.M03"], 25);
assert.equal(cp225Coverage.valid, true, cp225Coverage.errors.join("; "));
assert.equal(cp225Coverage.summary.unit_count, 40);
assert.equal(cp225Coverage.summary.by_micro_phase["RP06.P07.M05"], 20);
assert.equal(cp226Coverage.valid, true, cp226Coverage.errors.join("; "));
assert.equal(cp226Coverage.summary.unit_count, 10);
assert.equal(cp226Coverage.summary.by_micro_phase["RP06.P07.M06"], 5);
assert.equal(cp227Coverage.valid, true, cp227Coverage.errors.join("; "));
assert.equal(cp227Coverage.summary.unit_count, 150);
assert.equal(cp227Coverage.summary.by_phase["RP06.P07"], 106);
assert.equal(cp227Coverage.summary.by_phase["RP06.P08"], 44);
assert.equal(cp228Coverage.valid, true, cp228Coverage.errors.join("; "));
assert.equal(cp228Coverage.summary.unit_count, 40);
assert.equal(cp228Coverage.summary.by_micro_phase["RP06.P08.M03"], 22);
assert.equal(cp229Coverage.valid, true, cp229Coverage.errors.join("; "));
assert.equal(cp229Coverage.summary.unit_count, 40);
assert.equal(cp229Coverage.summary.by_micro_phase["RP06.P08.M05"], 22);
assert.equal(cp230Coverage.valid, true, cp230Coverage.errors.join("; "));
assert.equal(cp230Coverage.summary.unit_count, 150);
assert.equal(cp230Coverage.summary.by_phase["RP06.P08"], 100);
assert.equal(cp230Coverage.summary.by_phase["RP06.P09"], 50);
assert.equal(cp231Coverage.valid, true, cp231Coverage.errors.join("; "));
assert.equal(cp231Coverage.summary.unit_count, 40);
assert.equal(cp231Coverage.summary.by_micro_phase["RP06.P09.M04"], 20);
assert.equal(cp232Coverage.valid, true, cp232Coverage.errors.join("; "));
assert.equal(cp232Coverage.summary.unit_count, 10);
assert.equal(cp232Coverage.summary.by_micro_phase["RP06.P09.M05"], 10);
assert.equal(cp233Coverage.valid, true, cp233Coverage.errors.join("; "));
assert.equal(cp233Coverage.summary.unit_count, 10);
assert.equal(cp233Coverage.summary.by_micro_phase["RP06.P09.M06"], 6);
assert.equal(cp234Coverage.valid, true, cp234Coverage.errors.join("; "));
assert.equal(cp234Coverage.summary.unit_count, 86);
assert.equal(cp234Coverage.summary.by_micro_phase["RP06.P09.M07"], 22);
assert.equal(registry.valid, true, registry.errors.join("; "));
assert.equal(registry.model_count, 10);
assert.equal(foundation.valid, true, foundation.errors.join("; "));
assert.equal(cp199TypeShape.valid, true, cp199TypeShape.errors.join("; "));
assert.equal(cp199TypeShape.serialized_record_count, 10);
assert.equal(fixture.fixture_id, "dms-core-cp198-synthetic-fixture");
assert.equal(fixture.document.matter_id, "matter_rp06_synthetic_opening");
assert.equal(validateDmsCoreRecord("DmsDocument", fixture.document).valid, true);
assert.equal(validateDmsCoreRecord("DmsDocumentVersion", fixture.version).valid, true);
assert.equal(validateDmsCoreRecord("DmsFileObject", fixture.file_object).valid, true);
assert.equal(fixture.file_object.object_storage_runtime_executed, false);
assert.equal(fixture.extracted_text.raw_text_exposed, false);
assert.equal(fixture.ocr_result.ocr_runtime_executed, false);
assert.equal(fixture.email_thread.email_runtime_executed, false);
assert.equal(descriptor.program_contract.model_count, DMS_CORE_PROGRAM_CONTRACT.model_count);
assert.equal(descriptor.source_matter_core_pack_id, "CP00-197");
assert.equal(descriptor.permission_baseline.permission_decision_detail_exposed, false);
assert.equal(descriptor.audit_baseline.audit_event_body_exposed, false);
assert.equal(descriptor.audit_baseline.audit_event_written, false);
assert.equal(hermes.production_ready_candidate, true);
assert.equal(hermes.gate, "H06");
assert.equal(claude.review_packet, "C06.CP00-198.dms_core_foundation_model_registry");
assert.equal(claude.read_only, true);
assert.equal(claude.source_inspection_basis, "read_tools_used");
assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP198_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(handoff.to_pack_id, "CP00-199");
assert.equal(handoff.next_subphase_id, "RP06.P01.M02.S09");
assert.equal(cp199Hermes.production_ready_candidate, true);
assert.equal(cp199Hermes.gate, "H06");
assert.equal(cp199Claude.review_packet, "C06.CP00-199.dms_core_type_shape_service_descriptor");
assert.equal(cp199Claude.read_only, true);
assert.deepEqual(cp199Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP199_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp199Handoff.to_pack_id, "CP00-200");
assert.equal(cp199Handoff.next_subphase_id, "RP06.P01.M04.S07");
assert.equal(cp200Binding.valid, true, cp200Binding.errors.join("; "));
assert.equal(cp200Fixture.valid, true, cp200Fixture.errors.join("; "));
assert.equal(cp200Hermes.production_ready_candidate, true);
assert.equal(cp200Hermes.gate, "H06");
assert.equal(cp200Claude.review_packet, "C06.CP00-200.dms_core_permission_audit_fixture_binding");
assert.equal(cp200Claude.read_only, true);
assert.deepEqual(cp200Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP200_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp200Handoff.to_pack_id, "CP00-201");
assert.equal(cp200Handoff.next_subphase_id, "RP06.P01.M06.S05");
assert.equal(cp201Service.valid, true, cp201Service.errors.join("; "));
assert.equal(cp201GoldenCases.valid, true, cp201GoldenCases.errors.join("; "));
assert.equal(cp201Hermes.production_ready_candidate, true);
assert.equal(cp201Hermes.gate, "H06");
assert.equal(cp201Claude.review_packet, "C06.CP00-201.dms_core_service_contract_golden_case_descriptor");
assert.equal(cp201Claude.read_only, true);
assert.deepEqual(cp201Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP201_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp201Handoff.to_pack_id, "CP00-202");
assert.equal(cp201Handoff.next_subphase_id, "RP06.P02.M03.S01");
assert.equal(cp202Workflow.valid, true, cp202Workflow.errors.join("; "));
assert.equal(cp202RouteMatrix.valid, true, cp202RouteMatrix.errors.join("; "));
assert.equal(cp202Hermes.production_ready_candidate, true);
assert.equal(cp202Hermes.gate, "H06");
assert.equal(cp202Claude.review_packet, "C06.CP00-202.dms_core_primary_secondary_workflow_descriptor");
assert.equal(cp202Claude.read_only, true);
assert.deepEqual(cp202Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP202_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp202Handoff.to_pack_id, "CP00-203");
assert.equal(cp202Handoff.next_subphase_id, "RP06.P02.M04.S16");
assert.equal(cp203SensitiveTail.valid, true, cp203SensitiveTail.errors.join("; "));
assert.equal(cp203Descriptor.sensitive_tail_case_set.blocked_claim_output.details_redacted, true);
assert.equal(cp203Descriptor.sensitive_tail_case_set.blocked_claim_output.permission_decision_detail_included, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.blocked_claim_output.audit_event_body_included, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.blocked_claim_output.unauthorized_count_included, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.rollback_behavior.rollback_runtime_executed, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.rollback_behavior.internal_state_included, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.retry_behavior.retry_runtime_executed, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.retry_behavior.idempotency_key_persisted, false);
assert.equal(cp203Descriptor.sensitive_tail_case_set.integration_smoke_case.executes_runtime, false);
assert.equal(cp203Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp203Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp203Hermes.production_ready_candidate, true);
assert.equal(cp203Hermes.gate, "H06");
assert.equal(cp203Claude.review_packet, "C06.CP00-203.dms_core_sensitive_workflow_tail_descriptor");
assert.equal(cp203Claude.read_only, true);
assert.deepEqual(cp203Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP203_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp203Handoff.to_pack_id, "CP00-204");
assert.equal(cp203Handoff.next_subphase_id, "RP06.P02.M05.S01");
assert.equal(cp204PermissionAuditWorkflow.valid, true, cp204PermissionAuditWorkflow.errors.join("; "));
assert.equal(cp204GateSet.source_sensitive_tail_descriptor, "DmsCoreCp203SensitiveWorkflowTailDescriptor");
assert.equal(cp204GateSet.service_entrypoint_contract.descriptor_only, true);
assert.equal(cp204GateSet.service_entrypoint_contract.runtime_execution, false);
assert.equal(cp204GateSet.service_entrypoint_contract.permission_runtime_evaluated, false);
assert.equal(cp204GateSet.service_entrypoint_contract.audit_runtime_appended, false);
assert.equal(cp204GateSet.request_normalization.raw_payload_included, false);
assert.equal(cp204GateSet.tenant_boundary_precheck.policy_rule_detail_included, false);
assert.equal(cp204GateSet.tenant_boundary_precheck.unauthorized_count_included, false);
assert.equal(cp204GateSet.permission_precheck.permission_policy_rule_detail_included, false);
assert.equal(cp204GateSet.permission_precheck.permission_decision_detail_included, false);
assert.equal(cp204GateSet.permission_precheck.permission_envelope_payload_included, false);
assert.equal(cp204GateSet.permission_precheck.runtime_permission_evaluated, false);
assert.equal(cp204GateSet.permission_precheck.writes_permission_decision, false);
assert.equal(cp204GateSet.audit_hint_precheck.audit_hint_detail_included, false);
assert.equal(cp204GateSet.audit_hint_precheck.audit_event_body_included, false);
assert.equal(cp204GateSet.audit_hint_precheck.audit_trace_payload_included, false);
assert.equal(cp204GateSet.audit_hint_precheck.audit_runtime_appended, false);
assert.equal(cp204GateSet.primary_happy_path.dispatches_runtime, false);
assert.equal(cp204GateSet.secondary_workflow_path.dispatches_runtime, false);
assert.equal(cp204GateSet.state_transition_enforcement.runtime_state_write, false);
assert.equal(cp204GateSet.idempotency_key_handling.persists_idempotency_key, false);
assert.equal(cp204GateSet.idempotency_key_handling.exposes_key_material, false);
assert.equal(cp204Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp204Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp204Hermes.production_ready_candidate, true);
assert.equal(cp204Hermes.gate, "H06");
assert.equal(cp204Claude.review_packet, "C06.CP00-204.dms_core_permission_audit_workflow_binding");
assert.equal(cp204Claude.read_only, true);
assert.deepEqual(cp204Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP204_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp204Handoff.to_pack_id, "CP00-205");
assert.equal(cp204Handoff.next_subphase_id, "RP06.P02.M05.S11");
assert.equal(cp205PermissionAuditTail.valid, true, cp205PermissionAuditTail.errors.join("; "));
assert.equal(cp205CaseSet.source_permission_audit_gate_set_id, "dms-core-cp204-permission-audit-workflow-gate-set");
assert.equal(cp205CaseSet.lock_acquisition_rule.descriptor_only, true);
assert.equal(cp205CaseSet.lock_acquisition_rule.runtime_lock_acquired, false);
assert.equal(cp205CaseSet.lock_acquisition_rule.lock_token_included, false);
assert.equal(cp205CaseSet.persistence_boundary.descriptor_only, true);
assert.equal(cp205CaseSet.persistence_boundary.persists_workflow_attempt, false);
assert.equal(cp205CaseSet.persistence_boundary.persists_idempotency_key, false);
assert.equal(cp205CaseSet.persistence_boundary.persistence_payload_included, false);
assert.equal(cp205CaseSet.validation_error_mapping.customer_safe_errors_only, true);
assert.equal(cp205CaseSet.validation_error_mapping.validation_error_detail_included, false);
assert.equal(cp205CaseSet.validation_error_mapping.permission_decision_detail_included, false);
assert.equal(cp205CaseSet.validation_error_mapping.audit_event_body_included, false);
assert.equal(cp205CaseSet.validation_error_mapping.raw_payload_included, false);
assert.equal(cp205CaseSet.review_required_routing.dispatches_review_route_runtime, false);
assert.equal(cp205CaseSet.review_required_routing.read_only_claude_review_packet_only, true);
assert.equal(cp205CaseSet.approval_required_routing.dispatches_approval_route_runtime, false);
assert.equal(cp205CaseSet.approval_required_routing.human_approval_route_required_before_runtime, true);
assert.equal(cp205CaseSet.blocked_claim_output.details_redacted, true);
assert.equal(cp205CaseSet.blocked_claim_output.dispatches_runtime, false);
assert.equal(cp205CaseSet.rollback_behavior.rollback_runtime_executed, false);
assert.equal(cp205CaseSet.rollback_behavior.internal_state_included, false);
assert.equal(cp205CaseSet.retry_behavior.retry_runtime_executed, false);
assert.equal(cp205CaseSet.retry_behavior.idempotency_key_persisted, false);
assert.equal(cp205CaseSet.happy_path_unit_descriptor.executes_runtime, false);
assert.equal(cp205CaseSet.denied_path_unit_descriptor.expected_customer_safe_error_code, "DMS_SERVICE_TENANT_BOUNDARY");
assert.equal(cp205CaseSet.denied_path_unit_descriptor.executes_runtime, false);
assert.equal(cp205Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp205Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp205Hermes.production_ready_candidate, true);
assert.equal(cp205Hermes.gate, "H06");
assert.equal(cp205Claude.review_packet, "C06.CP00-205.dms_core_permission_audit_tail_descriptor");
assert.equal(cp205Claude.read_only, true);
assert.deepEqual(cp205Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP205_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp205Handoff.to_pack_id, "CP00-206");
assert.equal(cp205Handoff.next_subphase_id, "RP06.P02.M05.S21");
assert.equal(cp206SyntheticFixtureService.valid, true, cp206SyntheticFixtureService.errors.join("; "));
assert.equal(cp206CaseSet.source_permission_audit_tail_case_set_id, "dms-core-cp205-permission-audit-tail-case-set");
assert.equal(cp206CaseSet.review_path_unit_descriptor.descriptor_only, true);
assert.equal(cp206CaseSet.review_path_unit_descriptor.review_required, true);
assert.equal(cp206CaseSet.review_path_unit_descriptor.dispatches_review_route_runtime, false);
assert.equal(cp206CaseSet.review_path_unit_descriptor.review_payload_included, false);
assert.equal(cp206CaseSet.integration_smoke_case_descriptor.descriptor_only, true);
assert.equal(cp206CaseSet.integration_smoke_case_descriptor.dispatches_integration_smoke_runtime, false);
assert.equal(cp206CaseSet.integration_smoke_case_descriptor.writes_product_state, false);
assert.equal(cp206CaseSet.golden_fixture_binding.synthetic_only, true);
assert.equal(cp206CaseSet.golden_fixture_binding.no_real_data, true);
assert.equal(cp206CaseSet.golden_fixture_binding.real_client_data_loaded, false);
assert.equal(cp206CaseSet.golden_fixture_binding.real_matter_data_loaded, false);
assert.equal(cp206CaseSet.golden_fixture_binding.real_document_data_loaded, false);
assert.equal(cp206CaseSet.golden_fixture_binding.document_bytes_loaded, false);
assert.equal(cp206CaseSet.hermes_service_evidence_descriptor.dispatches_runtime, false);
assert.equal(cp206CaseSet.hermes_service_evidence_descriptor.claims_enterprise_trust, false);
assert.equal(cp206CaseSet.claude_service_review_prompt.read_only, true);
assert.equal(cp206CaseSet.claude_service_review_prompt.claude_is_final_approval, false);
assert.equal(cp206CaseSet.claude_service_review_prompt.source_mutation_allowed, false);
assert.equal(cp206CaseSet.synthetic_fixture_service_entrypoint_contract.runtime_execution, false);
assert.equal(cp206CaseSet.synthetic_fixture_request_normalization.raw_payload_included, false);
assert.equal(cp206CaseSet.synthetic_fixture_tenant_boundary_precheck.runtime_policy_lookup, false);
assert.equal(cp206CaseSet.synthetic_fixture_tenant_boundary_precheck.tenant_policy_detail_included, false);
assert.equal(cp206CaseSet.synthetic_fixture_matter_trace_precheck.runtime_matter_lookup, false);
assert.equal(cp206CaseSet.synthetic_fixture_matter_trace_precheck.matter_payload_included, false);
assert.equal(cp206CaseSet.synthetic_fixture_permission_precheck.runtime_permission_evaluated, false);
assert.equal(cp206CaseSet.synthetic_fixture_permission_precheck.writes_permission_decision, false);
assert.equal(cp206Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp206Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp206Hermes.production_ready_candidate, true);
assert.equal(cp206Hermes.gate, "H06");
assert.equal(cp206Claude.review_packet, "C06.CP00-206.dms_core_synthetic_fixture_service_descriptor");
assert.equal(cp206Claude.read_only, true);
assert.deepEqual(cp206Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP206_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp206Handoff.to_pack_id, "CP00-207");
assert.equal(cp206Handoff.next_subphase_id, "RP06.P02.M06.S06");
assert.equal(cp207SyntheticFixtureWorkflow.valid, true, cp207SyntheticFixtureWorkflow.errors.join("; "));
assert.equal(cp207CaseSet.source_synthetic_fixture_service_case_set_id, "dms-core-cp206-synthetic-fixture-service-case-set");
assert.deepEqual(cp207CaseSet.required_synthetic_fixture_workflow_guards, DMS_CORE_CP207_REQUIREMENTS.required_synthetic_fixture_workflow_guards);
assert.equal(cp207CaseSet.audit_hint_precheck.descriptor_only, true);
assert.equal(cp207CaseSet.audit_hint_precheck.runtime_audit_lookup, false);
assert.equal(cp207CaseSet.audit_hint_precheck.audit_hint_detail_included, false);
assert.equal(cp207CaseSet.audit_hint_precheck.audit_event_body_included, false);
assert.equal(cp207CaseSet.audit_hint_precheck.audit_trace_payload_included, false);
assert.equal(cp207CaseSet.audit_hint_precheck.audit_runtime_appended, false);
assert.equal(cp207CaseSet.primary_happy_path.descriptor_only, true);
assert.equal(cp207CaseSet.primary_happy_path.prechecks_pass, true);
assert.equal(cp207CaseSet.primary_happy_path.permission_gate_passed, true);
assert.equal(cp207CaseSet.primary_happy_path.audit_gate_passed, true);
assert.equal(cp207CaseSet.primary_happy_path.dispatches_primary_fixture_runtime, false);
assert.equal(cp207CaseSet.primary_happy_path.writes_product_state, false);
assert.equal(cp207CaseSet.primary_happy_path.creates_database_rows, false);
assert.equal(cp207CaseSet.primary_happy_path.reads_object_storage, false);
assert.equal(cp207CaseSet.primary_happy_path.writes_object_storage, false);
assert.equal(cp207CaseSet.secondary_workflow_path.descriptor_only, true);
assert.equal(cp207CaseSet.secondary_workflow_path.review_required_descriptor, true);
assert.equal(cp207CaseSet.secondary_workflow_path.approval_required_descriptor, true);
assert.equal(cp207CaseSet.secondary_workflow_path.dispatches_secondary_fixture_runtime, false);
assert.equal(cp207CaseSet.secondary_workflow_path.review_payload_included, false);
assert.equal(cp207CaseSet.secondary_workflow_path.approval_payload_included, false);
assert.equal(cp207CaseSet.state_transition_enforcement.descriptor_only, true);
assert.deepEqual(cp207CaseSet.state_transition_enforcement.allowed_next_statuses, ["under_review", "blocked"]);
assert.equal(cp207CaseSet.state_transition_enforcement.runtime_state_write, false);
assert.equal(cp207CaseSet.state_transition_enforcement.writes_state_transition, false);
assert.equal(cp207CaseSet.state_transition_enforcement.state_transition_payload_included, false);
assert.equal(cp207CaseSet.idempotency_key_handling.descriptor_only, true);
assert.equal(cp207CaseSet.idempotency_key_handling.persists_idempotency_key, false);
assert.equal(cp207CaseSet.idempotency_key_handling.idempotency_key_material_included, false);
assert.equal(cp207CaseSet.idempotency_key_handling.duplicate_runtime_detection_executed, false);
assert.equal(cp207CaseSet.lock_acquisition_rule.descriptor_only, true);
assert.equal(cp207CaseSet.lock_acquisition_rule.runtime_lock_acquired, false);
assert.equal(cp207CaseSet.lock_acquisition_rule.lock_token_included, false);
assert.equal(cp207CaseSet.lock_acquisition_rule.lock_wait_queue_executed, false);
assert.equal(cp207CaseSet.persistence_boundary.descriptor_only, true);
assert.equal(cp207CaseSet.persistence_boundary.persists_workflow_attempt, false);
assert.equal(cp207CaseSet.persistence_boundary.persists_idempotency_key, false);
assert.equal(cp207CaseSet.persistence_boundary.creates_database_rows, false);
assert.equal(cp207CaseSet.persistence_boundary.updates_database_rows, false);
assert.equal(cp207CaseSet.persistence_boundary.persistence_payload_included, false);
assert.equal(cp207CaseSet.persistence_boundary.raw_payload_included, false);
assert.equal(cp207CaseSet.validation_error_mapping.customer_safe_errors_only, true);
assert.equal(cp207CaseSet.validation_error_mapping.validation_error_detail_included, false);
assert.equal(cp207CaseSet.validation_error_mapping.permission_decision_detail_included, false);
assert.equal(cp207CaseSet.validation_error_mapping.audit_event_body_included, false);
assert.equal(cp207CaseSet.validation_error_mapping.raw_payload_included, false);
assert.equal(cp207CaseSet.review_required_routing.descriptor_only, true);
assert.equal(cp207CaseSet.review_required_routing.read_only_claude_review_packet_only, true);
assert.equal(cp207CaseSet.review_required_routing.dispatches_review_route_runtime, false);
assert.equal(cp207CaseSet.approval_required_routing.descriptor_only, true);
assert.equal(cp207CaseSet.approval_required_routing.human_approval_route_required_before_runtime, true);
assert.equal(cp207CaseSet.approval_required_routing.dispatches_approval_route_runtime, false);
assert.equal(cp207CaseSet.approval_required_routing.approval_payload_included, false);
assert.equal(cp207Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp207Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp207Hermes.production_ready_candidate, true);
assert.equal(cp207Hermes.gate, "H06");
assert.equal(cp207Claude.review_packet, "C06.CP00-207.dms_core_synthetic_fixture_workflow_descriptor");
assert.equal(cp207Claude.read_only, true);
assert.deepEqual(cp207Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP207_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp207Handoff.to_pack_id, "CP00-208");
assert.equal(cp207Handoff.next_subphase_id, "RP06.P02.M06.S16");
assert.equal(cp208SyntheticFixtureTailEntrypoint.valid, true, cp208SyntheticFixtureTailEntrypoint.errors.join("; "));
assert.equal(cp208CaseSet.source_synthetic_fixture_workflow_case_set_id, "dms-core-cp207-synthetic-fixture-workflow-case-set");
assert.deepEqual(
  cp208CaseSet.required_synthetic_fixture_tail_entrypoint_guards,
  DMS_CORE_CP208_REQUIREMENTS.required_synthetic_fixture_tail_entrypoint_guards,
);
assert.equal(cp208CaseSet.blocked_claim_output.descriptor_only, true);
assert.equal(cp208CaseSet.blocked_claim_output.blocked_status, "blocked");
assert.equal(cp208CaseSet.blocked_claim_output.customer_safe_errors_only, true);
assert.equal(cp208CaseSet.blocked_claim_output.dispatches_blocked_claim_runtime, false);
assert.equal(cp208CaseSet.blocked_claim_output.blocked_claim_detail_included, false);
assert.equal(cp208CaseSet.blocked_claim_output.permission_decision_detail_included, false);
assert.equal(cp208CaseSet.blocked_claim_output.audit_event_body_included, false);
assert.equal(cp208CaseSet.blocked_claim_output.raw_payload_included, false);
assert.equal(cp208CaseSet.rollback_behavior.descriptor_only, true);
assert.equal(cp208CaseSet.rollback_behavior.compensates_descriptor_steps_only, true);
assert.equal(cp208CaseSet.rollback_behavior.performs_rollback_runtime, false);
assert.equal(cp208CaseSet.rollback_behavior.rollback_internal_state_included, false);
assert.equal(cp208CaseSet.rollback_behavior.writes_state_transition, false);
assert.equal(cp208CaseSet.rollback_behavior.persists_workflow_attempt, false);
assert.equal(cp208CaseSet.retry_behavior.descriptor_only, true);
assert.equal(cp208CaseSet.retry_behavior.bounded_retry_descriptor, true);
assert.equal(cp208CaseSet.retry_behavior.performs_retry_runtime, false);
assert.equal(cp208CaseSet.retry_behavior.retry_internal_state_included, false);
assert.equal(cp208CaseSet.retry_behavior.duplicate_runtime_detection_executed, false);
assert.equal(cp208CaseSet.unit_test_happy_path.descriptor_only, true);
assert.equal(cp208CaseSet.unit_test_happy_path.expected_outcome, "allowed");
assert.equal(cp208CaseSet.unit_test_happy_path.executes_unit_test_runtime_paths, false);
assert.equal(cp208CaseSet.unit_test_happy_path.writes_product_state, false);
assert.equal(cp208CaseSet.unit_test_happy_path.fixture_payload_included, false);
assert.equal(cp208CaseSet.unit_test_denied_path.descriptor_only, true);
assert.equal(cp208CaseSet.unit_test_denied_path.expected_outcome, "denied_customer_safe");
assert.equal(cp208CaseSet.unit_test_denied_path.executes_unit_test_runtime_paths, false);
assert.equal(cp208CaseSet.unit_test_denied_path.permission_decision_detail_included, false);
assert.equal(cp208CaseSet.unit_test_denied_path.validation_error_detail_included, false);
assert.equal(cp208CaseSet.unit_test_review_path.descriptor_only, true);
assert.equal(cp208CaseSet.unit_test_review_path.expected_outcome, "review_required");
assert.equal(cp208CaseSet.unit_test_review_path.executes_unit_test_runtime_paths, false);
assert.equal(cp208CaseSet.unit_test_review_path.dispatches_review_route_runtime, false);
assert.equal(cp208CaseSet.unit_test_review_path.review_payload_included, false);
assert.equal(cp208CaseSet.integration_smoke_case.descriptor_only, true);
assert.equal(cp208CaseSet.integration_smoke_case.smoke_scope, "descriptor_chain_cp198_to_cp208");
assert.equal(cp208CaseSet.integration_smoke_case.dispatches_integration_smoke_runtime, false);
assert.equal(cp208CaseSet.integration_smoke_case.loads_real_fixture_data, false);
assert.equal(cp208CaseSet.integration_smoke_case.fixture_payload_included, false);
assert.equal(cp208CaseSet.integration_smoke_case.raw_payload_included, false);
assert.equal(cp208CaseSet.service_entrypoint_contract.descriptor_only, true);
assert.equal(cp208CaseSet.service_entrypoint_contract.service_entrypoint, "createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor");
assert.equal(cp208CaseSet.service_entrypoint_contract.runtime_execution, false);
assert.equal(cp208CaseSet.service_entrypoint_contract.fixture_service_runtime_dispatched, false);
assert.equal(cp208CaseSet.service_entrypoint_contract.permission_runtime_evaluated, false);
assert.equal(cp208CaseSet.service_entrypoint_contract.audit_runtime_appended, false);
assert.equal(cp208CaseSet.service_entrypoint_contract.object_storage_runtime_executed, false);
assert.equal(cp208CaseSet.request_normalization.descriptor_only, true);
assert.equal(cp208CaseSet.request_normalization.rejects_unknown_fields, true);
assert.equal(cp208CaseSet.request_normalization.normalizes_before_prechecks, true);
assert.equal(cp208CaseSet.request_normalization.runtime_execution, false);
assert.equal(cp208CaseSet.request_normalization.raw_payload_included, false);
assert.equal(cp208CaseSet.request_normalization.validation_error_detail_included, false);
assert.deepEqual(cp208CaseSet.request_normalization.normalized_fields, ["tenant_id", "matter_id", "fixture_id", "request_id"]);
assert.equal(cp208CaseSet.tenant_boundary_precheck.descriptor_only, true);
assert.equal(cp208CaseSet.tenant_boundary_precheck.passed, true);
assert.equal(cp208CaseSet.tenant_boundary_precheck.cross_tenant_access_allowed, false);
assert.equal(cp208CaseSet.tenant_boundary_precheck.runtime_tenant_lookup, false);
assert.equal(cp208CaseSet.tenant_boundary_precheck.tenant_policy_detail_included, false);
assert.equal(cp208CaseSet.tenant_boundary_precheck.permission_decision_detail_included, false);
assert.equal(cp208Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp208Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp208Hermes.production_ready_candidate, true);
assert.equal(cp208Hermes.gate, "H06");
assert.equal(cp208Claude.review_packet, "C06.CP00-208.dms_core_synthetic_fixture_tail_entrypoint_descriptor");
assert.equal(cp208Claude.read_only, true);
assert.deepEqual(cp208Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP208_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp208Handoff.to_pack_id, "CP00-209");
assert.equal(cp208Handoff.next_subphase_id, "RP06.P02.M07.S04");
assert.equal(cp209GoldenCaseHermesCycle.valid, true, cp209GoldenCaseHermesCycle.errors.join("; "));
assert.equal(cp209CaseSet.source_synthetic_fixture_tail_entrypoint_case_set_id, "dms-core-cp208-synthetic-fixture-tail-entrypoint-case-set");
assert.equal(cp209CaseSet.golden_case_cycle.micro_phase_id, "RP06.P02.M07");
assert.equal(cp209CaseSet.hermes_evidence_cycle.micro_phase_id, "RP06.P02.M08");
for (const guard of DMS_CORE_CP209_REQUIREMENTS.required_golden_case_cycle_guards) {
  assert.ok(cp209CaseSet.golden_case_cycle[guard], `CP00-209 golden case cycle missing ${guard}`);
  assert.equal(cp209CaseSet.golden_case_cycle[guard].descriptor_only, true);
  assert.equal(cp209CaseSet.golden_case_cycle[guard].runtime_execution, false);
}
for (const guard of DMS_CORE_CP209_REQUIREMENTS.required_hermes_evidence_cycle_guards) {
  assert.ok(cp209CaseSet.hermes_evidence_cycle[guard], `CP00-209 hermes evidence cycle missing ${guard}`);
  assert.equal(cp209CaseSet.hermes_evidence_cycle[guard].descriptor_only, true);
  assert.equal(cp209CaseSet.hermes_evidence_cycle[guard].runtime_execution, false);
}
assert.equal(cp209CaseSet.golden_case_cycle.golden_fixture_binding.fixture_id, "dms-core-cp198-synthetic-fixture");
assert.equal(cp209CaseSet.golden_case_cycle.hermes_service_evidence.emits_hermes_runtime_receipt, false);
assert.equal(cp209CaseSet.golden_case_cycle.claude_service_review_prompt.claude_final_approval_claimed, false);
assert.equal(cp209CaseSet.hermes_evidence_cycle.service_entrypoint_contract.service_entrypoint, "createDmsCoreCp209GoldenCaseHermesCycleDescriptor");
assert.equal(cp209CaseSet.hermes_evidence_cycle.tenant_boundary_precheck.cross_tenant_access_allowed, false);
assert.equal(cp209Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp209Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp209Hermes.production_ready_candidate, true);
assert.equal(cp209Hermes.gate, "H06");
assert.equal(cp209Claude.review_packet, "C06.CP00-209.dms_core_golden_case_hermes_cycle_descriptor");
assert.equal(cp209Claude.read_only, true);
assert.deepEqual(cp209Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP209_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp209Handoff.to_pack_id, "CP00-210");
assert.equal(cp209Handoff.next_subphase_id, "RP06.P02.M08.S19");
assert.equal(cp210Foundation.valid, true, cp210Foundation.errors.join("; "));
assert.equal(cp210CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(DMS_CORE_CP210_REQUIREMENTS.required_section_rows)) {
  const section = cp210CaseSet.sections[microId];
  assert.ok(section, `CP00-210 missing section ${microId}`);
  assert.equal(section.row_count, titles.length);
  for (const title of titles) {
    const row = section.rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-210 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp210Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp210Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp210Hermes.production_ready_candidate, true);
assert.equal(cp210Hermes.gate, "H06");
assert.equal(cp210Claude.review_packet, "C06.CP00-210.dms_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp210Claude.read_only, true);
assert.deepEqual(cp210Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP210_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp210Handoff.to_pack_id, "CP00-211");
assert.equal(cp210Handoff.next_subphase_id, "RP06.P03.M06.S01");
assert.equal(cp211Foundation.valid, true, cp211Foundation.errors.join("; "));
assert.equal(cp211CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(DMS_CORE_CP211_REQUIREMENTS.required_section_rows)) {
  const section = cp211CaseSet.sections[microId];
  assert.ok(section, `CP00-211 missing section ${microId}`);
  assert.equal(section.row_count, titles.length);
  for (const title of titles) {
    const row = section.rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-211 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp211Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp211Descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
assert.equal(cp211Hermes.production_ready_candidate, true);
assert.equal(cp211Claude.review_packet, "C06.CP00-211.dms_core_p03_closeout_p04_ui_foundation_descriptor");
assert.equal(cp211Claude.read_only, true);
assert.deepEqual(cp211Claude.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(DMS_CORE_CP211_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp211Handoff.to_pack_id, "CP00-212");
assert.equal(cp211Handoff.next_subphase_id, "RP06.P04.M03.S09");
assert.equal(cp212Tail.valid, true, cp212Tail.errors.join("; "));
assert.equal(cp212CaseSet.section_count, 1);
for (const title of DMS_CORE_CP212_REQUIREMENTS.required_section_rows["RP06.P04.M03"]) {
  const row = cp212CaseSet.sections["RP06.P04.M03"].rows[dmsCoreCp210RowKey(title)];
  assert.ok(row, `CP00-212 missing row ${title}`);
  assert.equal(row.descriptor_only, true);
  assert.equal(row.runtime_execution, false);
}
assert.equal(cp212Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp212Hermes.production_ready_candidate, true);
assert.equal(cp212Claude.review_packet, "C06.CP00-212.dms_core_ui_primary_slice_tail_descriptor");
assert.equal(cp212Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP212_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp212Handoff.to_pack_id, "CP00-213");
assert.equal(cp212Handoff.next_subphase_id, "RP06.P04.M03.S19");
assert.equal(cp213Binding.valid, true, cp213Binding.errors.join("; "));
assert.equal(cp213CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP213_REQUIREMENTS.required_section_rows)) {
  const section = cp213CaseSet.sections[microId];
  assert.ok(section, `CP00-213 missing section ${microId}`);
  assert.equal(section.row_count, titles.length);
  for (const title of titles) {
    const row = section.rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-213 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp213Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp213Hermes.production_ready_candidate, true);
assert.equal(cp213Claude.review_packet, "C06.CP00-213.dms_core_ui_secondary_slice_binding_descriptor");
assert.equal(cp213Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP213_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp213Handoff.to_pack_id, "CP00-214");
assert.equal(cp213Handoff.next_subphase_id, "RP06.P04.M05.S15");
assert.equal(cp214Tail.valid, true, cp214Tail.errors.join("; "));
assert.equal(cp214CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP214_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp214CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-214 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp214Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp214Hermes.production_ready_candidate, true);
assert.equal(cp214Claude.review_packet, "C06.CP00-214.dms_core_ui_binding_tail_descriptor");
assert.equal(cp214Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP214_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp214Handoff.to_pack_id, "CP00-215");
assert.equal(cp214Handoff.next_subphase_id, "RP06.P04.M06.S03");
assert.equal(cp215Foundation.valid, true, cp215Foundation.errors.join("; "));
assert.equal(cp215CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(DMS_CORE_CP215_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp215CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-215 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp215Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp215Hermes.production_ready_candidate, true);
assert.equal(cp215Claude.review_packet, "C06.CP00-215.dms_core_p04_closeout_p05_fixture_foundation_descriptor");
assert.equal(cp215Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP215_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp215Handoff.to_pack_id, "CP00-216");
assert.equal(cp215Handoff.next_subphase_id, "RP06.P05.M02.S15");
assert.equal(cp216Slice.valid, true, cp216Slice.errors.join("; "));
assert.equal(cp216CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP216_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp216CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-216 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp216Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp216Hermes.production_ready_candidate, true);
assert.equal(cp216Claude.review_packet, "C06.CP00-216.dms_core_fixture_case_slice_descriptor");
assert.equal(cp216Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP216_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp216Handoff.to_pack_id, "CP00-217");
assert.equal(cp216Handoff.next_subphase_id, "RP06.P05.M04.S13");
assert.equal(cp217Slice.valid, true, cp217Slice.errors.join("; "));
assert.equal(cp217CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP217_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp217CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-217 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp217Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp217Hermes.production_ready_candidate, true);
assert.equal(cp217Claude.review_packet, "C06.CP00-217.dms_core_fixture_binding_slice_descriptor");
assert.equal(cp217Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP217_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp217Handoff.to_pack_id, "CP00-218");
assert.equal(cp217Handoff.next_subphase_id, "RP06.P05.M06.S09");
assert.equal(cp218Tail.valid, true, cp218Tail.errors.join("; "));
assert.equal(cp218CaseSet.section_count, 1);
for (const title of DMS_CORE_CP218_REQUIREMENTS.required_section_rows["RP06.P05.M06"]) {
  const row = cp218CaseSet.sections["RP06.P05.M06"].rows[dmsCoreCp210RowKey(title)];
  assert.ok(row, `CP00-218 missing row ${title}`);
  assert.equal(row.descriptor_only, true);
  assert.equal(row.runtime_execution, false);
}
assert.equal(cp218Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp218Hermes.production_ready_candidate, true);
assert.equal(cp218Claude.review_packet, "C06.CP00-218.dms_core_fixture_set_tail_descriptor");
assert.equal(cp218Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP218_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp218Handoff.to_pack_id, "CP00-219");
assert.equal(cp218Handoff.next_subphase_id, "RP06.P05.M06.S19");
assert.equal(cp219Matrix.valid, true, cp219Matrix.errors.join("; "));
assert.equal(cp219CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(DMS_CORE_CP219_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp219CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-219 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp219Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp219Hermes.production_ready_candidate, true);
assert.equal(cp219Claude.review_packet, "C06.CP00-219.dms_core_p05_closeout_p06_permission_matrix_descriptor");
assert.equal(cp219Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP219_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp219Handoff.to_pack_id, "CP00-220");
assert.equal(cp219Handoff.next_subphase_id, "RP06.P06.M02.S21");
assert.equal(cp220Slice.valid, true, cp220Slice.errors.join("; "));
assert.equal(cp220CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP220_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp220CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-220 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp220Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp220Hermes.production_ready_candidate, true);
assert.equal(cp220Claude.review_packet, "C06.CP00-220.dms_core_permission_matrix_slice_descriptor");
assert.equal(cp220Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP220_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp220Handoff.to_pack_id, "CP00-221");
assert.equal(cp220Handoff.next_subphase_id, "RP06.P06.M03.S09");
assert.equal(cp221Slice.valid, true, cp221Slice.errors.join("; "));
assert.equal(cp221CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP221_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp221CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-221 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp221Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp221Hermes.production_ready_candidate, true);
assert.equal(cp221Claude.review_packet, "C06.CP00-221.dms_core_permission_workflow_slice_descriptor");
assert.equal(cp221Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP221_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp221Handoff.to_pack_id, "CP00-222");
assert.equal(cp221Handoff.next_subphase_id, "RP06.P06.M04.S24");
assert.equal(cp222Slice.valid, true, cp222Slice.errors.join("; "));
assert.equal(cp222CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP222_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp222CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-222 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp222Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp222Hermes.production_ready_candidate, true);
assert.equal(cp222Claude.review_packet, "C06.CP00-222.dms_core_permission_audit_binding_slice_descriptor");
assert.equal(cp222Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP222_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp222Handoff.to_pack_id, "CP00-223");
assert.equal(cp222Handoff.next_subphase_id, "RP06.P06.M06.S14");
assert.equal(cp223Foundation.valid, true, cp223Foundation.errors.join("; "));
assert.equal(cp223CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(DMS_CORE_CP223_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp223CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-223 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp223Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp223Hermes.production_ready_candidate, true);
assert.equal(cp223Claude.review_packet, "C06.CP00-223.dms_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp223Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP223_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp223Handoff.to_pack_id, "CP00-224");
assert.equal(cp223Handoff.next_subphase_id, "RP06.P07.M02.S13");
assert.equal(cp224Slice.valid, true, cp224Slice.errors.join("; "));
assert.equal(cp224CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP224_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp224CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-224 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp224Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp224Hermes.production_ready_candidate, true);
assert.equal(cp224Claude.review_packet, "C06.CP00-224.dms_core_failure_recovery_slice_descriptor");
assert.equal(cp224Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP224_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp224Handoff.to_pack_id, "CP00-225");
assert.equal(cp224Handoff.next_subphase_id, "RP06.P07.M04.S06");
assert.equal(cp225Slice.valid, true, cp225Slice.errors.join("; "));
assert.equal(cp225CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP225_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp225CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-225 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp225Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp225Hermes.production_ready_candidate, true);
assert.equal(cp225Claude.review_packet, "C06.CP00-225.dms_core_failure_binding_slice_descriptor");
assert.equal(cp225Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP225_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp225Handoff.to_pack_id, "CP00-226");
assert.equal(cp225Handoff.next_subphase_id, "RP06.P07.M05.S21");
assert.equal(cp226Tail.valid, true, cp226Tail.errors.join("; "));
assert.equal(cp226CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP226_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp226CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-226 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp226Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp226Hermes.production_ready_candidate, true);
assert.equal(cp226Claude.review_packet, "C06.CP00-226.dms_core_failure_audit_tail_descriptor");
assert.equal(cp226Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP226_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp226Handoff.to_pack_id, "CP00-227");
assert.equal(cp226Handoff.next_subphase_id, "RP06.P07.M06.S06");
assert.equal(cp227Receipt.valid, true, cp227Receipt.errors.join("; "));
assert.equal(cp227CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(DMS_CORE_CP227_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp227CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-227 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp227Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp227Hermes.production_ready_candidate, true);
assert.equal(cp227Claude.review_packet, "C06.CP00-227.dms_core_p07_closeout_p08_hermes_receipt_descriptor");
assert.equal(cp227Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP227_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp227Handoff.to_pack_id, "CP00-228");
assert.equal(cp227Handoff.next_subphase_id, "RP06.P08.M02.S15");
assert.equal(cp228Slice.valid, true, cp228Slice.errors.join("; "));
assert.equal(cp228CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP228_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp228CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-228 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp228Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp228Hermes.production_ready_candidate, true);
assert.equal(cp228Claude.review_packet, "C06.CP00-228.dms_core_hermes_receipt_slice_descriptor");
assert.equal(cp228Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP228_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp228Handoff.to_pack_id, "CP00-229");
assert.equal(cp228Handoff.next_subphase_id, "RP06.P08.M04.S13");
assert.equal(cp229Slice.valid, true, cp229Slice.errors.join("; "));
assert.equal(cp229CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP229_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp229CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-229 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp229Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp229Hermes.production_ready_candidate, true);
assert.equal(cp229Claude.review_packet, "C06.CP00-229.dms_core_hermes_binding_slice_descriptor");
assert.equal(cp229Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP229_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp229Handoff.to_pack_id, "CP00-230");
assert.equal(cp229Handoff.next_subphase_id, "RP06.P08.M06.S09");
assert.equal(cp230Gate.valid, true, cp230Gate.errors.join("; "));
assert.equal(cp230CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(DMS_CORE_CP230_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp230CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-230 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp230Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp230Hermes.production_ready_candidate, true);
assert.equal(cp230Claude.review_packet, "C06.CP00-230.dms_core_p08_closeout_p09_review_gate_descriptor");
assert.equal(cp230Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP230_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp230Handoff.to_pack_id, "CP00-231");
assert.equal(cp230Handoff.next_subphase_id, "RP06.P09.M03.S11");
assert.equal(cp231Slice.valid, true, cp231Slice.errors.join("; "));
assert.equal(cp231CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(DMS_CORE_CP231_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp231CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-231 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp231Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp231Hermes.production_ready_candidate, true);
assert.equal(cp231Claude.review_packet, "C06.CP00-231.dms_core_review_gate_slice_descriptor");
assert.equal(cp231Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP231_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp231Handoff.to_pack_id, "CP00-232");
assert.equal(cp231Handoff.next_subphase_id, "RP06.P09.M05.S09");
assert.equal(cp232Binding.valid, true, cp232Binding.errors.join("; "));
assert.equal(cp232CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(DMS_CORE_CP232_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp232CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-232 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp232Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp232Hermes.production_ready_candidate, true);
assert.equal(cp232Claude.review_packet, "C06.CP00-232.dms_core_review_audit_binding_descriptor");
assert.equal(cp232Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP232_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp232Handoff.to_pack_id, "CP00-233");
assert.equal(cp232Handoff.next_subphase_id, "RP06.P09.M05.S19");
assert.equal(cp233Tail.valid, true, cp233Tail.errors.join("; "));
assert.equal(cp233CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(DMS_CORE_CP233_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp233CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-233 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp233Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp233Hermes.production_ready_candidate, true);
assert.equal(cp233Claude.review_packet, "C06.CP00-233.dms_core_review_fixture_tail_descriptor");
assert.equal(cp233Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP233_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp233Handoff.to_pack_id, "CP00-234");
assert.equal(cp233Handoff.next_subphase_id, "RP06.P09.M06.S07");
assert.equal(cp234Closeout.valid, true, cp234Closeout.errors.join("; "));
assert.equal(cp234CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(DMS_CORE_CP234_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp234CaseSet.sections[microId].rows[dmsCoreCp210RowKey(title)];
    assert.ok(row, `CP00-234 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.equal(cp234Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp234Hermes.production_ready_candidate, true);
assert.equal(cp234Claude.review_packet, "C06.CP00-234.dms_core_p09_review_closeout_descriptor");
assert.equal(cp234Claude.read_only, true);
assert.deepEqual(DMS_CORE_CP234_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp234Handoff.to_pack_id, "CP00-235");
assert.equal(cp234Handoff.next_subphase_id, "RP07.P00.M00.S01");
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.writes_product_state, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_object_storage_read, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_object_storage_write, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_ocr, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.executes_search_indexing, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.exposes_document_bytes, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.exposes_extracted_text, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP198_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.writes_product_state, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_object_storage_read, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_object_storage_write, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_ocr, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.executes_search_indexing, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.exposes_document_bytes, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.exposes_extracted_text, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP199_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.dispatches_permission_runtime, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.dispatches_audit_runtime, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.exposes_permission_envelope_payload, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.exposes_audit_trace_payload, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP200_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.dispatches_dms_runtime_service, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.persists_idempotency_key, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.performs_retry_runtime, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP201_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_primary_workflow_runtime, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_secondary_workflow_runtime, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_review_route_runtime, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.dispatches_approval_route_runtime, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.persists_workflow_attempt, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP202_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_blocked_claim_runtime, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_rollback_runtime, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.dispatches_retry_runtime, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_blocked_claim_detail, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_rollback_internal_state, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.exposes_retry_internal_state, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP203_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.dispatches_permission_audit_gate_runtime, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.evaluates_authorization_policy_runtime, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.writes_permission_decision, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.appends_audit_trace, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.exposes_policy_rule_detail, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.exposes_audit_hint_detail, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP204_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.persists_workflow_attempt, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_review_route_runtime, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_approval_route_runtime, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.dispatches_blocked_claim_runtime, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.performs_retry_runtime, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_validation_error_detail, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_lock_token, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_persistence_payload, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_rollback_internal_state, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.exposes_retry_internal_state, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP205_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
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
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.dispatches_blocked_claim_runtime, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.dispatches_integration_smoke_runtime, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.performs_retry_runtime, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.executes_unit_test_runtime_paths, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_blocked_claim_detail, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_rollback_internal_state, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_retry_internal_state, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.exposes_tenant_policy_detail, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP208_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.dispatches_golden_case_runtime, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.dispatches_hermes_packet_runtime, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.emits_hermes_runtime_receipt, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.exposes_golden_case_payload, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.exposes_hermes_packet_body, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.exposes_matter_trace_detail, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP209_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.serves_api_response_runtime, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.exposes_api_response_payload, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.exposes_error_taxonomy_internal_detail, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.exposes_pagination_cursor_material, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.omits_unauthorized_data, true);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP210_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.dispatches_build_runtime, false);
assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.exposes_ui_state_payload, false);
assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP211_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.dispatches_build_runtime, false);
assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.exposes_ui_state_payload, false);
assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP212_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.exposes_unauthorized_count, false);
assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.exposes_state_snapshot_payload, false);
assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP213_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP214_NO_WRITE_ATTESTATION.executes_ui_runtime, false);
assert.equal(DMS_CORE_CP214_NO_WRITE_ATTESTATION.exposes_unauthorized_count, false);
assert.equal(DMS_CORE_CP214_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP214_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.dispatches_ai_runtime, false);
assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.exposes_ai_payload, false);
assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP215_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.executes_replay_runtime, false);
assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.exposes_stable_id_material, false);
assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP216_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP217_NO_WRITE_ATTESTATION.executes_replay_runtime, false);
assert.equal(DMS_CORE_CP217_NO_WRITE_ATTESTATION.dispatches_ai_runtime, false);
assert.equal(DMS_CORE_CP217_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP217_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP218_NO_WRITE_ATTESTATION.dispatches_ai_runtime, false);
assert.equal(DMS_CORE_CP218_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP218_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.enforces_deny_over_allow_descriptor, true);
assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.allows_cross_wall_access, false);
assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.exposes_policy_rule_detail, false);
assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP219_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP220_NO_WRITE_ATTESTATION.leak_detected, false);
assert.equal(DMS_CORE_CP220_NO_WRITE_ATTESTATION.enforces_deny_over_allow_descriptor, true);
assert.equal(DMS_CORE_CP220_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP220_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP221_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
assert.equal(DMS_CORE_CP221_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP221_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP222_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
assert.equal(DMS_CORE_CP222_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP222_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP223_NO_WRITE_ATTESTATION.exposes_failure_internal_state, false);
assert.equal(DMS_CORE_CP223_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP223_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP224_NO_WRITE_ATTESTATION.silent_success_detected, false);
assert.equal(DMS_CORE_CP224_NO_WRITE_ATTESTATION.leak_detected, false);
assert.equal(DMS_CORE_CP224_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP224_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP225_NO_WRITE_ATTESTATION.silent_success_detected, false);
assert.equal(DMS_CORE_CP225_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP225_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP226_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP226_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP227_NO_WRITE_ATTESTATION.regression_detected, false);
assert.equal(DMS_CORE_CP227_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP227_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP228_NO_WRITE_ATTESTATION.regression_detected, false);
assert.equal(DMS_CORE_CP228_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP228_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP229_NO_WRITE_ATTESTATION.regression_detected, false);
assert.equal(DMS_CORE_CP229_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP229_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP230_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP230_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP231_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP231_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP232_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP232_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP233_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP233_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.closes_rp06_p09_descriptor_scope, true);
assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.opens_rp07_runtime, false);
assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(DMS_CORE_CP234_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp06:dms-core:validate",
      pack_id: DMS_CORE_CP234_PACK_BINDING.pack_id,
      covered_units: cp234Coverage.summary.unit_count,
      model_count: registry.model_count,
      hermes_gate: cp234Hermes.gate,
      claude_gate: dmsContract.current_pack.claude_gate,
      source_review_fixture_tail_pack_id: DMS_CORE_CP234_PACK_BINDING.upstream_pack_id,
      foundation_units_preserved: coverage.summary.unit_count,
      type_shape_units_preserved: cp199Coverage.summary.unit_count,
      permission_audit_units_preserved: cp200Coverage.summary.unit_count,
      service_contract_units_preserved: cp201Coverage.summary.unit_count,
      workflow_units_preserved: cp202Coverage.summary.unit_count,
      sensitive_tail_units_preserved: cp203Coverage.summary.unit_count,
      permission_audit_workflow_units_preserved: cp204Coverage.summary.unit_count,
      permission_audit_tail_units_preserved: cp205Coverage.summary.unit_count,
      synthetic_fixture_service_units_preserved: cp206Coverage.summary.unit_count,
      synthetic_fixture_workflow_units_preserved: cp207Coverage.summary.unit_count,
      synthetic_fixture_tail_entrypoint_units_preserved: cp208Coverage.summary.unit_count,
      golden_case_hermes_cycle_units_preserved: cp209Coverage.summary.unit_count,
      p02_closeout_p03_foundation_units_preserved: cp210Coverage.summary.unit_count,
      p03_closeout_p04_ui_foundation_units_preserved: cp211Coverage.summary.unit_count,
      ui_primary_slice_tail_units_preserved: cp212Coverage.summary.unit_count,
      ui_secondary_slice_binding_units_preserved: cp213Coverage.summary.unit_count,
      ui_binding_tail_units_preserved: cp214Coverage.summary.unit_count,
      p04_closeout_p05_fixture_foundation_units_preserved: cp215Coverage.summary.unit_count,
      fixture_case_slice_units_preserved: cp216Coverage.summary.unit_count,
      fixture_binding_slice_units_preserved: cp217Coverage.summary.unit_count,
      fixture_set_tail_units_preserved: cp218Coverage.summary.unit_count,
      p05_closeout_p06_permission_matrix_units_preserved: cp219Coverage.summary.unit_count,
      permission_matrix_slice_units_preserved: cp220Coverage.summary.unit_count,
      permission_workflow_slice_units_preserved: cp221Coverage.summary.unit_count,
      permission_audit_binding_slice_units_preserved: cp222Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp223Coverage.summary.unit_count,
      failure_recovery_slice_units_preserved: cp224Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp225Coverage.summary.unit_count,
      failure_audit_tail_units_preserved: cp226Coverage.summary.unit_count,
      p07_closeout_p08_hermes_receipt_units_preserved: cp227Coverage.summary.unit_count,
      hermes_receipt_slice_units_preserved: cp228Coverage.summary.unit_count,
      hermes_binding_slice_units_preserved: cp229Coverage.summary.unit_count,
      p08_closeout_p09_review_gate_units_preserved: cp230Coverage.summary.unit_count,
      review_gate_slice_units_preserved: cp231Coverage.summary.unit_count,
      review_audit_binding_units_preserved: cp232Coverage.summary.unit_count,
      review_fixture_tail_units_preserved: cp233Coverage.summary.unit_count,
      next_pack_id: cp234Handoff.to_pack_id,
      production_ready_candidate: cp234Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
