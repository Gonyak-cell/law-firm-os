import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP610_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP611_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP612_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP613_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP614_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP615_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP616_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP617_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP618_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP619_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP620_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP621_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP622_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP623_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP624_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP625_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP626_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP627_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP628_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP629_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP630_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP631_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP632_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP633_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP634_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP635_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP636_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP637_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP638_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP639_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP640_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP641_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP642_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP643_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_CP644_NO_WRITE_ATTESTATION,
  DATA_ROOM_VDR_CORE_CP644_PACK_BINDING,
  DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS,
  DATA_ROOM_VDR_CORE_PROGRAM_CONTRACT,
  createDataRoomVdrCoreCp644ClaudeReviewPacket,
  createDataRoomVdrCoreCp644CloseoutHandoff,
  createDataRoomVdrCoreCp644HermesEvidencePacket,
  createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor,
  createDataRoomVdrCoreCp643ClaudeReviewPacket,
  createDataRoomVdrCoreCp643CloseoutHandoff,
  createDataRoomVdrCoreCp643HermesEvidencePacket,
  createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor,
  createDataRoomVdrCoreCp642ClaudeReviewPacket,
  createDataRoomVdrCoreCp642CloseoutHandoff,
  createDataRoomVdrCoreCp642HermesEvidencePacket,
  createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor,
  createDataRoomVdrCoreCp641ClaudeReviewPacket,
  createDataRoomVdrCoreCp641CloseoutHandoff,
  createDataRoomVdrCoreCp641HermesEvidencePacket,
  createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor,
  createDataRoomVdrCoreCp640ClaudeReviewPacket,
  createDataRoomVdrCoreCp640CloseoutHandoff,
  createDataRoomVdrCoreCp640HermesEvidencePacket,
  createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor,
  createDataRoomVdrCoreCp639ClaudeReviewPacket,
  createDataRoomVdrCoreCp639CloseoutHandoff,
  createDataRoomVdrCoreCp639HermesEvidencePacket,
  createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor,
  createDataRoomVdrCoreCp638ClaudeReviewPacket,
  createDataRoomVdrCoreCp638CloseoutHandoff,
  createDataRoomVdrCoreCp638HermesEvidencePacket,
  createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor,
  createDataRoomVdrCoreCp637ClaudeReviewPacket,
  createDataRoomVdrCoreCp637CloseoutHandoff,
  createDataRoomVdrCoreCp637HermesEvidencePacket,
  createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor,
  createDataRoomVdrCoreCp636ClaudeReviewPacket,
  createDataRoomVdrCoreCp636CloseoutHandoff,
  createDataRoomVdrCoreCp636HermesEvidencePacket,
  createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor,
  createDataRoomVdrCoreCp635ClaudeReviewPacket,
  createDataRoomVdrCoreCp635CloseoutHandoff,
  createDataRoomVdrCoreCp635HermesEvidencePacket,
  createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor,
  createDataRoomVdrCoreCp634ClaudeReviewPacket,
  createDataRoomVdrCoreCp634CloseoutHandoff,
  createDataRoomVdrCoreCp634HermesEvidencePacket,
  createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor,
  createDataRoomVdrCoreCp633ClaudeReviewPacket,
  createDataRoomVdrCoreCp633CloseoutHandoff,
  createDataRoomVdrCoreCp633HermesEvidencePacket,
  createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor,
  createDataRoomVdrCoreCp632ClaudeReviewPacket,
  createDataRoomVdrCoreCp632CloseoutHandoff,
  createDataRoomVdrCoreCp632HermesEvidencePacket,
  createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor,
  createDataRoomVdrCoreCp631ClaudeReviewPacket,
  createDataRoomVdrCoreCp631CloseoutHandoff,
  createDataRoomVdrCoreCp631HermesEvidencePacket,
  createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor,
  createDataRoomVdrCoreCp630ClaudeReviewPacket,
  createDataRoomVdrCoreCp630CloseoutHandoff,
  createDataRoomVdrCoreCp630HermesEvidencePacket,
  createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor,
  createDataRoomVdrCoreCp629ClaudeReviewPacket,
  createDataRoomVdrCoreCp629CloseoutHandoff,
  createDataRoomVdrCoreCp629HermesEvidencePacket,
  createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor,
  createDataRoomVdrCoreCp628ClaudeReviewPacket,
  createDataRoomVdrCoreCp628CloseoutHandoff,
  createDataRoomVdrCoreCp628HermesEvidencePacket,
  createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor,
  createDataRoomVdrCoreCp627ClaudeReviewPacket,
  createDataRoomVdrCoreCp627CloseoutHandoff,
  createDataRoomVdrCoreCp627HermesEvidencePacket,
  createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor,
  createDataRoomVdrCoreCp626ClaudeReviewPacket,
  createDataRoomVdrCoreCp626CloseoutHandoff,
  createDataRoomVdrCoreCp626HermesEvidencePacket,
  createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor,
  createDataRoomVdrCoreCp625ClaudeReviewPacket,
  createDataRoomVdrCoreCp625CloseoutHandoff,
  createDataRoomVdrCoreCp625HermesEvidencePacket,
  createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor,
  createDataRoomVdrCoreCp624ClaudeReviewPacket,
  createDataRoomVdrCoreCp624CloseoutHandoff,
  createDataRoomVdrCoreCp624HermesEvidencePacket,
  createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor,
  createDataRoomVdrCoreCp623ClaudeReviewPacket,
  createDataRoomVdrCoreCp623CloseoutHandoff,
  createDataRoomVdrCoreCp623HermesEvidencePacket,
  createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor,
  createDataRoomVdrCoreCp622ClaudeReviewPacket,
  createDataRoomVdrCoreCp622CloseoutHandoff,
  createDataRoomVdrCoreCp622HermesEvidencePacket,
  createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor,
  createDataRoomVdrCoreCp621ClaudeReviewPacket,
  createDataRoomVdrCoreCp621CloseoutHandoff,
  createDataRoomVdrCoreCp621HermesEvidencePacket,
  createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor,
  createDataRoomVdrCoreCp620ClaudeReviewPacket,
  createDataRoomVdrCoreCp620CloseoutHandoff,
  createDataRoomVdrCoreCp620HermesEvidencePacket,
  createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor,
  createDataRoomVdrCoreCp619ClaudeReviewPacket,
  createDataRoomVdrCoreCp619CloseoutHandoff,
  createDataRoomVdrCoreCp619HermesEvidencePacket,
  createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor,
  createDataRoomVdrCoreCp618ClaudeReviewPacket,
  createDataRoomVdrCoreCp618CloseoutHandoff,
  createDataRoomVdrCoreCp618HermesEvidencePacket,
  createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor,
  createDataRoomVdrCoreCp617ClaudeReviewPacket,
  createDataRoomVdrCoreCp617CloseoutHandoff,
  createDataRoomVdrCoreCp617HermesEvidencePacket,
  createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor,
  createDataRoomVdrCoreCp616ClaudeReviewPacket,
  createDataRoomVdrCoreCp616CloseoutHandoff,
  createDataRoomVdrCoreCp616HermesEvidencePacket,
  createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor,
  createDataRoomVdrCoreCp615ClaudeReviewPacket,
  createDataRoomVdrCoreCp615CloseoutHandoff,
  createDataRoomVdrCoreCp615HermesEvidencePacket,
  createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor,
  createDataRoomVdrCoreCp614ClaudeReviewPacket,
  createDataRoomVdrCoreCp614CloseoutHandoff,
  createDataRoomVdrCoreCp614HermesEvidencePacket,
  createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor,
  createDataRoomVdrCoreCp613ClaudeReviewPacket,
  createDataRoomVdrCoreCp613CloseoutHandoff,
  createDataRoomVdrCoreCp613HermesEvidencePacket,
  createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor,
  createDataRoomVdrCoreCp612ClaudeReviewPacket,
  createDataRoomVdrCoreCp612CloseoutHandoff,
  createDataRoomVdrCoreCp612HermesEvidencePacket,
  createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor,
  createDataRoomVdrCoreCp611ClaudeReviewPacket,
  createDataRoomVdrCoreCp611CloseoutHandoff,
  createDataRoomVdrCoreCp611HermesEvidencePacket,
  createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor,
  createDataRoomVdrCoreCp610ClaudeReviewPacket,
  createDataRoomVdrCoreCp610CloseoutHandoff,
  createDataRoomVdrCoreCp610HermesEvidencePacket,
  createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor,
  validateDataRoomVdrCoreCp616Coverage,
  validateDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor,
  validateDataRoomVdrCoreCp617Coverage,
  validateDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor,
  validateDataRoomVdrCoreCp618Coverage,
  validateDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor,
  validateDataRoomVdrCoreCp619Coverage,
  validateDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor,
  validateDataRoomVdrCoreCp620Coverage,
  validateDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor,
  validateDataRoomVdrCoreCp621Coverage,
  validateDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor,
  validateDataRoomVdrCoreCp622Coverage,
  validateDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor,
  validateDataRoomVdrCoreCp623Coverage,
  validateDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor,
  validateDataRoomVdrCoreCp624Coverage,
  validateDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor,
  validateDataRoomVdrCoreCp625Coverage,
  validateDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor,
  validateDataRoomVdrCoreCp626Coverage,
  validateDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor,
  validateDataRoomVdrCoreCp627Coverage,
  validateDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor,
  validateDataRoomVdrCoreCp628Coverage,
  validateDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor,
  validateDataRoomVdrCoreCp629Coverage,
  validateDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp630Coverage,
  validateDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor,
  validateDataRoomVdrCoreCp631Coverage,
  validateDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp632Coverage,
  validateDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor,
  validateDataRoomVdrCoreCp633Coverage,
  validateDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor,
  validateDataRoomVdrCoreCp634Coverage,
  validateDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor,
  validateDataRoomVdrCoreCp635Coverage,
  validateDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp636Coverage,
  validateDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor,
  validateDataRoomVdrCoreCp637Coverage,
  validateDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp638Coverage,
  validateDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp639Coverage,
  validateDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor,
  validateDataRoomVdrCoreCp640Coverage,
  validateDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp641Coverage,
  validateDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor,
  validateDataRoomVdrCoreCp642Coverage,
  validateDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor,
  validateDataRoomVdrCoreCp643Coverage,
  validateDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor,
  validateDataRoomVdrCoreCp644Coverage,
  validateDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor,
  validateDataRoomVdrCoreCp615Coverage,
  validateDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp614Coverage,
  validateDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor,
  validateDataRoomVdrCoreCp613Coverage,
  validateDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor,
  validateDataRoomVdrCoreCp612Coverage,
  validateDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor,
  validateDataRoomVdrCoreCp611Coverage,
  validateDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor,
  validateDataRoomVdrCoreCp610Coverage,
  validateDataRoomVdrCoreCp610ScopeContractFoundationDescriptor,
} from "../src/index.js";

const contract = JSON.parse(
  readFileSync(new URL("../../../contracts/data-room-vdr-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp610ManifestUrl = new URL("../../../docs/closeout-packs/cp00-610/manifest.json", import.meta.url);
const cp610Manifest = existsSync(cp610ManifestUrl) ? JSON.parse(readFileSync(cp610ManifestUrl, "utf8")) : null;
const cp610PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-610") ?? cp610Manifest?.plan_binding_snapshot;
const cp611ManifestUrl = new URL("../../../docs/closeout-packs/cp00-611/manifest.json", import.meta.url);
const cp611Manifest = existsSync(cp611ManifestUrl) ? JSON.parse(readFileSync(cp611ManifestUrl, "utf8")) : null;
const cp611PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-611") ?? cp611Manifest?.plan_binding_snapshot;
const cp612ManifestUrl = new URL("../../../docs/closeout-packs/cp00-612/manifest.json", import.meta.url);
const cp612Manifest = existsSync(cp612ManifestUrl) ? JSON.parse(readFileSync(cp612ManifestUrl, "utf8")) : null;
const cp612PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-612") ?? cp612Manifest?.plan_binding_snapshot;
const cp613ManifestUrl = new URL("../../../docs/closeout-packs/cp00-613/manifest.json", import.meta.url);
const cp613Manifest = existsSync(cp613ManifestUrl) ? JSON.parse(readFileSync(cp613ManifestUrl, "utf8")) : null;
const cp613PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-613") ?? cp613Manifest?.plan_binding_snapshot;
const cp614ManifestUrl = new URL("../../../docs/closeout-packs/cp00-614/manifest.json", import.meta.url);
const cp614Manifest = existsSync(cp614ManifestUrl) ? JSON.parse(readFileSync(cp614ManifestUrl, "utf8")) : null;
const cp614PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-614") ?? cp614Manifest?.plan_binding_snapshot;
const cp615ManifestUrl = new URL("../../../docs/closeout-packs/cp00-615/manifest.json", import.meta.url);
const cp615Manifest = existsSync(cp615ManifestUrl) ? JSON.parse(readFileSync(cp615ManifestUrl, "utf8")) : null;
const cp615PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-615") ?? cp615Manifest?.plan_binding_snapshot;
const cp616ManifestUrl = new URL("../../../docs/closeout-packs/cp00-616/manifest.json", import.meta.url);
const cp616Manifest = existsSync(cp616ManifestUrl) ? JSON.parse(readFileSync(cp616ManifestUrl, "utf8")) : null;
const cp616PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-616") ?? cp616Manifest?.plan_binding_snapshot;
const cp617ManifestUrl = new URL("../../../docs/closeout-packs/cp00-617/manifest.json", import.meta.url);
const cp617Manifest = existsSync(cp617ManifestUrl) ? JSON.parse(readFileSync(cp617ManifestUrl, "utf8")) : null;
const cp617PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-617") ?? cp617Manifest?.plan_binding_snapshot;
const cp618ManifestUrl = new URL("../../../docs/closeout-packs/cp00-618/manifest.json", import.meta.url);
const cp618Manifest = existsSync(cp618ManifestUrl) ? JSON.parse(readFileSync(cp618ManifestUrl, "utf8")) : null;
const cp618PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-618") ?? cp618Manifest?.plan_binding_snapshot;
const cp619ManifestUrl = new URL("../../../docs/closeout-packs/cp00-619/manifest.json", import.meta.url);
const cp619Manifest = existsSync(cp619ManifestUrl) ? JSON.parse(readFileSync(cp619ManifestUrl, "utf8")) : null;
const cp619PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-619") ?? cp619Manifest?.plan_binding_snapshot;
const cp620ManifestUrl = new URL("../../../docs/closeout-packs/cp00-620/manifest.json", import.meta.url);
const cp620Manifest = existsSync(cp620ManifestUrl) ? JSON.parse(readFileSync(cp620ManifestUrl, "utf8")) : null;
const cp620PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-620") ?? cp620Manifest?.plan_binding_snapshot;
const cp621ManifestUrl = new URL("../../../docs/closeout-packs/cp00-621/manifest.json", import.meta.url);
const cp621Manifest = existsSync(cp621ManifestUrl) ? JSON.parse(readFileSync(cp621ManifestUrl, "utf8")) : null;
const cp621PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-621") ?? cp621Manifest?.plan_binding_snapshot;
const cp622ManifestUrl = new URL("../../../docs/closeout-packs/cp00-622/manifest.json", import.meta.url);
const cp622Manifest = existsSync(cp622ManifestUrl) ? JSON.parse(readFileSync(cp622ManifestUrl, "utf8")) : null;
const cp622PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-622") ?? cp622Manifest?.plan_binding_snapshot;
const cp623ManifestUrl = new URL("../../../docs/closeout-packs/cp00-623/manifest.json", import.meta.url);
const cp623Manifest = existsSync(cp623ManifestUrl) ? JSON.parse(readFileSync(cp623ManifestUrl, "utf8")) : null;
const cp623PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-623") ?? cp623Manifest?.plan_binding_snapshot;
const cp624ManifestUrl = new URL("../../../docs/closeout-packs/cp00-624/manifest.json", import.meta.url);
const cp624Manifest = existsSync(cp624ManifestUrl) ? JSON.parse(readFileSync(cp624ManifestUrl, "utf8")) : null;
const cp624PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-624") ?? cp624Manifest?.plan_binding_snapshot;
const cp625ManifestUrl = new URL("../../../docs/closeout-packs/cp00-625/manifest.json", import.meta.url);
const cp625Manifest = existsSync(cp625ManifestUrl) ? JSON.parse(readFileSync(cp625ManifestUrl, "utf8")) : null;
const cp625PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-625") ?? cp625Manifest?.plan_binding_snapshot;
const cp626ManifestUrl = new URL("../../../docs/closeout-packs/cp00-626/manifest.json", import.meta.url);
const cp626Manifest = existsSync(cp626ManifestUrl) ? JSON.parse(readFileSync(cp626ManifestUrl, "utf8")) : null;
const cp626PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-626") ?? cp626Manifest?.plan_binding_snapshot;
const cp627ManifestUrl = new URL("../../../docs/closeout-packs/cp00-627/manifest.json", import.meta.url);
const cp627Manifest = existsSync(cp627ManifestUrl) ? JSON.parse(readFileSync(cp627ManifestUrl, "utf8")) : null;
const cp627PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-627") ?? cp627Manifest?.plan_binding_snapshot;
const cp628ManifestUrl = new URL("../../../docs/closeout-packs/cp00-628/manifest.json", import.meta.url);
const cp628Manifest = existsSync(cp628ManifestUrl) ? JSON.parse(readFileSync(cp628ManifestUrl, "utf8")) : null;
const cp628PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-628") ?? cp628Manifest?.plan_binding_snapshot;
const cp629ManifestUrl = new URL("../../../docs/closeout-packs/cp00-629/manifest.json", import.meta.url);
const cp629Manifest = existsSync(cp629ManifestUrl) ? JSON.parse(readFileSync(cp629ManifestUrl, "utf8")) : null;
const cp629PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-629") ?? cp629Manifest?.plan_binding_snapshot;
const cp630ManifestUrl = new URL("../../../docs/closeout-packs/cp00-630/manifest.json", import.meta.url);
const cp630Manifest = existsSync(cp630ManifestUrl) ? JSON.parse(readFileSync(cp630ManifestUrl, "utf8")) : null;
const cp630PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-630") ?? cp630Manifest?.plan_binding_snapshot;
const cp631ManifestUrl = new URL("../../../docs/closeout-packs/cp00-631/manifest.json", import.meta.url);
const cp631Manifest = existsSync(cp631ManifestUrl) ? JSON.parse(readFileSync(cp631ManifestUrl, "utf8")) : null;
const cp631PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-631") ?? cp631Manifest?.plan_binding_snapshot;
const cp632ManifestUrl = new URL("../../../docs/closeout-packs/cp00-632/manifest.json", import.meta.url);
const cp632Manifest = existsSync(cp632ManifestUrl) ? JSON.parse(readFileSync(cp632ManifestUrl, "utf8")) : null;
const cp632PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-632") ?? cp632Manifest?.plan_binding_snapshot;
const cp633ManifestUrl = new URL("../../../docs/closeout-packs/cp00-633/manifest.json", import.meta.url);
const cp633Manifest = existsSync(cp633ManifestUrl) ? JSON.parse(readFileSync(cp633ManifestUrl, "utf8")) : null;
const cp633PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-633") ?? cp633Manifest?.plan_binding_snapshot;
const cp634ManifestUrl = new URL("../../../docs/closeout-packs/cp00-634/manifest.json", import.meta.url);
const cp634Manifest = existsSync(cp634ManifestUrl) ? JSON.parse(readFileSync(cp634ManifestUrl, "utf8")) : null;
const cp634PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-634") ?? cp634Manifest?.plan_binding_snapshot;
const cp635ManifestUrl = new URL("../../../docs/closeout-packs/cp00-635/manifest.json", import.meta.url);
const cp635Manifest = existsSync(cp635ManifestUrl) ? JSON.parse(readFileSync(cp635ManifestUrl, "utf8")) : null;
const cp635PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-635") ?? cp635Manifest?.plan_binding_snapshot;
const cp636ManifestUrl = new URL("../../../docs/closeout-packs/cp00-636/manifest.json", import.meta.url);
const cp636Manifest = existsSync(cp636ManifestUrl) ? JSON.parse(readFileSync(cp636ManifestUrl, "utf8")) : null;
const cp636PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-636") ?? cp636Manifest?.plan_binding_snapshot;
const cp637ManifestUrl = new URL("../../../docs/closeout-packs/cp00-637/manifest.json", import.meta.url);
const cp637Manifest = existsSync(cp637ManifestUrl) ? JSON.parse(readFileSync(cp637ManifestUrl, "utf8")) : null;
const cp637PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-637") ?? cp637Manifest?.plan_binding_snapshot;
const cp638ManifestUrl = new URL("../../../docs/closeout-packs/cp00-638/manifest.json", import.meta.url);
const cp638Manifest = existsSync(cp638ManifestUrl) ? JSON.parse(readFileSync(cp638ManifestUrl, "utf8")) : null;
const cp638PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-638") ?? cp638Manifest?.plan_binding_snapshot;
const cp639ManifestUrl = new URL("../../../docs/closeout-packs/cp00-639/manifest.json", import.meta.url);
const cp639Manifest = existsSync(cp639ManifestUrl) ? JSON.parse(readFileSync(cp639ManifestUrl, "utf8")) : null;
const cp639PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-639") ?? cp639Manifest?.plan_binding_snapshot;
const cp640ManifestUrl = new URL("../../../docs/closeout-packs/cp00-640/manifest.json", import.meta.url);
const cp640Manifest = existsSync(cp640ManifestUrl) ? JSON.parse(readFileSync(cp640ManifestUrl, "utf8")) : null;
const cp640PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-640") ?? cp640Manifest?.plan_binding_snapshot;
const cp641ManifestUrl = new URL("../../../docs/closeout-packs/cp00-641/manifest.json", import.meta.url);
const cp641Manifest = existsSync(cp641ManifestUrl) ? JSON.parse(readFileSync(cp641ManifestUrl, "utf8")) : null;
const cp641PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-641") ?? cp641Manifest?.plan_binding_snapshot;
const cp642ManifestUrl = new URL("../../../docs/closeout-packs/cp00-642/manifest.json", import.meta.url);
const cp642Manifest = existsSync(cp642ManifestUrl) ? JSON.parse(readFileSync(cp642ManifestUrl, "utf8")) : null;
const cp642PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-642") ?? cp642Manifest?.plan_binding_snapshot;
const cp643ManifestUrl = new URL("../../../docs/closeout-packs/cp00-643/manifest.json", import.meta.url);
const cp643Manifest = existsSync(cp643ManifestUrl) ? JSON.parse(readFileSync(cp643ManifestUrl, "utf8")) : null;
const cp643PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-643") ?? cp643Manifest?.plan_binding_snapshot;
const cp644ManifestUrl = new URL("../../../docs/closeout-packs/cp00-644/manifest.json", import.meta.url);
const cp644Manifest = existsSync(cp644ManifestUrl) ? JSON.parse(readFileSync(cp644ManifestUrl, "utf8")) : null;
const cp644PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-644") ?? cp644Manifest?.plan_binding_snapshot;

test("CP00-610 descriptor covers the live RP20 plan rows", () => {
  const descriptor = createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor();
  const summary = validateDataRoomVdrCoreCp610Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 14);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp610PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.pack_id);
  assert.equal(cp610PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.unit_count);
  assert.equal(cp610PlanPack.range.description, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.range);
});

test("CP00-610 keeps Data Room and VDR runtime closed", () => {
  const descriptor = createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor();
  const validation = validateDataRoomVdrCoreCp610ScopeContractFoundationDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp610HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp610ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp610CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.dispatches_rfi_runtime, false);
  assert.equal(descriptor.dispatches_cp_runtime, false);
  assert.equal(descriptor.dispatches_closing_binder_runtime, false);
  assert.equal(descriptor.dispatches_access_analytics_runtime, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.writes_object_storage, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-611");
  assert.equal(handoff.next_subphase_id, "RP20.P01.M02.S09");
});

test("CP00-610 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor();

  assert.equal(contract.schema_version, "law-firm-os.data-room-vdr-core-contract.v0.1");
  assert.deepEqual(contract.program, DATA_ROOM_VDR_CORE_PROGRAM_CONTRACT);
  assert.deepEqual(contract.projections.cp610_pack_binding, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING);
  assert.deepEqual(contract.projections.cp610_requirements, DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp610_no_write_attestation, DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp610_scope_contract_foundation_descriptor, descriptor);
});

test("CP00-611 descriptor covers the live RP20 model continuation rows", () => {
  const descriptor = createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor();
  const summary = validateDataRoomVdrCoreCp611Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp611PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.pack_id);
  assert.equal(cp611PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.unit_count);
  assert.equal(cp611PlanPack.range.description, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.range);
});

test("CP00-611 keeps model, fixture, and test rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor();
  const validation = validateDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp611HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp611ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp611CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.executes_unit_test_runtime_paths, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.writes_object_storage, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-612");
  assert.equal(handoff.next_subphase_id, "RP20.P01.M04.S07");
});

test("CP00-611 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor();

  assert.deepEqual(contract.projections.cp611_pack_binding, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING);
  assert.deepEqual(contract.projections.cp611_requirements, DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp611_no_write_attestation, DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp611_p01_model_foundation_continuation_descriptor, descriptor);
});

test("CP00-612 descriptor covers the live RP20 secondary workflow and permission rows", () => {
  const descriptor = createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor();
  const summary = validateDataRoomVdrCoreCp612Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp612PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.pack_id);
  assert.equal(cp612PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.unit_count);
  assert.equal(cp612PlanPack.range.description, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.range);
});

test("CP00-612 keeps permission, audit, fixture, and workflow rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor();
  const validation = validateDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp612HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp612ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp612CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.dispatches_rfi_runtime, false);
  assert.equal(descriptor.dispatches_cp_runtime, false);
  assert.equal(descriptor.dispatches_closing_binder_runtime, false);
  assert.equal(descriptor.dispatches_access_analytics_runtime, false);
  assert.equal(descriptor.writes_permission_decision, false);
  assert.equal(descriptor.appends_audit_trace, false);
  assert.equal(descriptor.loads_real_fixture_data, false);
  assert.equal(descriptor.writes_object_storage, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-613");
  assert.equal(handoff.next_subphase_id, "RP20.P01.M06.S05");
});

test("CP00-612 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor();

  assert.deepEqual(contract.projections.cp612_pack_binding, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING);
  assert.deepEqual(contract.projections.cp612_requirements, DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp612_no_write_attestation, DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp612_p01_secondary_workflow_permission_audit_descriptor, descriptor);
});

test("CP00-613 descriptor covers the live RP20 P01/P02 service bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp613Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 8);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp613PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.pack_id);
  assert.equal(cp613PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.unit_count);
  assert.equal(cp613PlanPack.range.description, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.range);
});

test("CP00-613 keeps service, permission, audit, and recovery rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp613HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp613ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp613CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.dispatches_rfi_runtime, false);
  assert.equal(descriptor.dispatches_cp_runtime, false);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_service_entrypoint_runtime, false);
  assert.equal(descriptor.executes_permission_precheck_runtime, false);
  assert.equal(descriptor.executes_audit_hint_runtime, false);
  assert.equal(descriptor.executes_failure_recovery_runtime, false);
  assert.equal(descriptor.executes_integration_smoke_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-614");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M03.S01");
});

test("CP00-613 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor();

  assert.deepEqual(contract.projections.cp613_pack_binding, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING);
  assert.deepEqual(contract.projections.cp613_requirements, DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp613_no_write_attestation, DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp613_p01_p02_service_foundation_bridge_descriptor, descriptor);
});

test("CP00-614 descriptor covers the live RP20 P02 primary and secondary service rows", () => {
  const descriptor = createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor();
  const summary = validateDataRoomVdrCoreCp614Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 2);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp614PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.pack_id);
  assert.equal(cp614PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.unit_count);
  assert.equal(cp614PlanPack.range.description, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.range);
});

test("CP00-614 keeps primary and secondary service rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor();
  const validation = validateDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp614HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp614ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp614CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_service_entrypoint_runtime, false);
  assert.equal(descriptor.executes_request_normalization_runtime, false);
  assert.equal(descriptor.executes_permission_precheck_runtime, false);
  assert.equal(descriptor.executes_audit_hint_runtime, false);
  assert.equal(descriptor.executes_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_secondary_workflow_runtime, false);
  assert.equal(descriptor.executes_failure_recovery_runtime, false);
  assert.equal(descriptor.executes_integration_smoke_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-615");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M04.S19");
});

test("CP00-614 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor();

  assert.deepEqual(contract.projections.cp614_pack_binding, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING);
  assert.deepEqual(contract.projections.cp614_requirements, DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp614_no_write_attestation, DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp614_p02_primary_secondary_service_descriptor, descriptor);
});

test("CP00-615 descriptor covers the live RP20 P02 permission audit and fixture head rows", () => {
  const descriptor = createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp615Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp615PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.pack_id);
  assert.equal(cp615PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.unit_count);
  assert.equal(cp615PlanPack.range.description, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.range);
});

test("CP00-615 keeps permission audit and fixture head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp615HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp615ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp615CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_service_entrypoint_runtime, false);
  assert.equal(descriptor.executes_permission_precheck_runtime, false);
  assert.equal(descriptor.executes_audit_hint_runtime, false);
  assert.equal(descriptor.executes_permission_audit_binding_runtime, false);
  assert.equal(descriptor.executes_fixture_head_runtime, false);
  assert.equal(descriptor.executes_integration_smoke_runtime, false);
  assert.equal(descriptor.writes_permission_decision, false);
  assert.equal(descriptor.appends_audit_trace, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-616");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M06.S15");
});

test("CP00-615 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor();

  assert.deepEqual(contract.projections.cp615_pack_binding, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING);
  assert.deepEqual(contract.projections.cp615_requirements, DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp615_no_write_attestation, DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp615_p02_permission_audit_fixture_head_descriptor, descriptor);
});

test("CP00-616 descriptor covers the live RP20 P02 fixture tail and test head rows", () => {
  const descriptor = createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp616Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 2);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp616PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.pack_id);
  assert.equal(cp616PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.unit_count);
  assert.equal(cp616PlanPack.range.description, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.range);
});

test("CP00-616 keeps fixture tail and test head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp616HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp616ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp616CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_service_entrypoint_runtime, false);
  assert.equal(descriptor.executes_request_normalization_runtime, false);
  assert.equal(descriptor.executes_unit_test_runtime_paths, false);
  assert.equal(descriptor.executes_failure_recovery_runtime, false);
  assert.equal(descriptor.executes_integration_smoke_runtime, false);
  assert.equal(descriptor.executes_fixture_tail_runtime, false);
  assert.equal(descriptor.executes_test_golden_case_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-617");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M07.S03");
});

test("CP00-616 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor();

  assert.deepEqual(contract.projections.cp616_pack_binding, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING);
  assert.deepEqual(contract.projections.cp616_requirements, DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp616_no_write_attestation, DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp616_p02_fixture_tail_test_head_descriptor, descriptor);
});

test("CP00-617 descriptor covers the live RP20 P02 test golden case core rows", () => {
  const descriptor = createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor();
  const summary = validateDataRoomVdrCoreCp617Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp617PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.pack_id);
  assert.equal(cp617PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.unit_count);
  assert.equal(cp617PlanPack.range.description, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.range);
});

test("CP00-617 keeps test golden case core rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor();
  const validation = validateDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp617HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp617ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp617CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_permission_precheck_runtime, false);
  assert.equal(descriptor.executes_audit_hint_runtime, false);
  assert.equal(descriptor.executes_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_secondary_workflow_runtime, false);
  assert.equal(descriptor.executes_state_transition_runtime, false);
  assert.equal(descriptor.executes_idempotency_runtime, false);
  assert.equal(descriptor.executes_lock_runtime, false);
  assert.equal(descriptor.executes_persistence_runtime, false);
  assert.equal(descriptor.executes_test_golden_case_core_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-618");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M07.S13");
});

test("CP00-617 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor();

  assert.deepEqual(contract.projections.cp617_pack_binding, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING);
  assert.deepEqual(contract.projections.cp617_requirements, DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp617_no_write_attestation, DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp617_p02_test_golden_case_core_descriptor, descriptor);
});

test("CP00-618 descriptor covers the live RP20 P02 test, Hermes, and Claude bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp618Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp618PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.pack_id);
  assert.equal(cp618PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.unit_count);
  assert.equal(cp618PlanPack.range.description, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.range);
});

test("CP00-618 keeps test, Hermes, and Claude bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp618HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp618ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp618CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_service_entrypoint_runtime, false);
  assert.equal(descriptor.executes_permission_precheck_runtime, false);
  assert.equal(descriptor.executes_audit_hint_runtime, false);
  assert.equal(descriptor.executes_failure_recovery_runtime, false);
  assert.equal(descriptor.executes_integration_smoke_runtime, false);
  assert.equal(descriptor.executes_test_golden_case_tail_runtime, false);
  assert.equal(descriptor.executes_hermes_evidence_packet_runtime, false);
  assert.equal(descriptor.executes_claude_review_packet_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-619");
  assert.equal(handoff.next_subphase_id, "RP20.P02.M09.S09");
});

test("CP00-618 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor();

  assert.deepEqual(contract.projections.cp618_pack_binding, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING);
  assert.deepEqual(contract.projections.cp618_requirements, DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp618_no_write_attestation, DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp618_p02_test_hermes_claude_bridge_descriptor, descriptor);
});

test("CP00-619 descriptor covers the live RP20 P02 Claude and P03 API interface bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp619Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 9);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp619PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.pack_id);
  assert.equal(cp619PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.unit_count);
  assert.equal(cp619PlanPack.range.description, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.range);
});

test("CP00-619 keeps P03 API/interface bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp619HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp619ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp619CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.executes_api_interface_runtime, false);
  assert.equal(descriptor.executes_room_setup_api_runtime, false);
  assert.equal(descriptor.executes_request_contract_runtime, false);
  assert.equal(descriptor.executes_response_contract_runtime, false);
  assert.equal(descriptor.executes_serialization_runtime, false);
  assert.equal(descriptor.executes_synthetic_fixture_runtime, false);
  assert.equal(descriptor.emits_hermes_api_runtime_evidence, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-620");
  assert.equal(handoff.next_subphase_id, "RP20.P03.M06.S13");
});

test("CP00-619 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor();

  assert.deepEqual(contract.projections.cp619_pack_binding, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING);
  assert.deepEqual(contract.projections.cp619_requirements, DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp619_no_write_attestation, DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp619_p02_claude_p03_api_interface_bridge_descriptor, descriptor);
});

test("CP00-620 descriptor covers the live RP20 P03 API and P04 UI bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp620Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 9);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp620PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.pack_id);
  assert.equal(cp620PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.unit_count);
  assert.equal(cp620PlanPack.range.description, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.range);
});

test("CP00-620 keeps P03 API and P04 UI bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp620HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp620ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp620CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_api_interface_runtime, false);
  assert.equal(descriptor.executes_ui_runtime, false);
  assert.equal(descriptor.executes_ui_surface_runtime, false);
  assert.equal(descriptor.executes_ui_data_dependency_runtime, false);
  assert.equal(descriptor.executes_ui_interaction_runtime, false);
  assert.equal(descriptor.executes_responsive_layout_runtime, false);
  assert.equal(descriptor.executes_keyboard_focus_runtime, false);
  assert.equal(descriptor.executes_ui_synthetic_fixture_runtime, false);
  assert.equal(descriptor.executes_build_smoke_runtime, false);
  assert.equal(descriptor.emits_hermes_ui_runtime_evidence, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-621");
  assert.equal(handoff.next_subphase_id, "RP20.P04.M04.S01");
});

test("CP00-620 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor();

  assert.deepEqual(contract.projections.cp620_pack_binding, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING);
  assert.deepEqual(contract.projections.cp620_requirements, DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp620_no_write_attestation, DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp620_p03_api_p04_ui_bridge_descriptor, descriptor);
});

test("CP00-621 descriptor covers the live RP20 P04 UI and P05 fixture bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp621Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 8);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp621PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.pack_id);
  assert.equal(cp621PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.unit_count);
  assert.equal(cp621PlanPack.range.description, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.range);
});

test("CP00-621 keeps P04 UI and P05 fixture bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp621HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp621ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp621CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_ui_runtime, false);
  assert.equal(descriptor.executes_ui_surface_runtime, false);
  assert.equal(descriptor.executes_ui_interaction_runtime, false);
  assert.equal(descriptor.executes_ui_state_snapshot_runtime, false);
  assert.equal(descriptor.executes_unauthorized_count_query_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_foundation_runtime, false);
  assert.equal(descriptor.executes_golden_case_runtime, false);
  assert.equal(descriptor.executes_cross_tenant_fixture_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-622");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M01.S01");
});

test("CP00-621 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor();

  assert.deepEqual(contract.projections.cp621_pack_binding, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING);
  assert.deepEqual(contract.projections.cp621_requirements, DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp621_no_write_attestation, DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp621_p04_ui_p05_fixture_bridge_descriptor, descriptor);
});

test("CP00-622 descriptor covers the live RP20 P05 fixture contract draft rows", () => {
  const descriptor = createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor();
  const summary = validateDataRoomVdrCoreCp622Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp622PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.pack_id);
  assert.equal(cp622PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.unit_count);
  assert.equal(cp622PlanPack.range.description, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.range);
});

test("CP00-622 keeps P05 fixture contract draft rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor();
  const validation = validateDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp622HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp622ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp622CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_fixture_foundation_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_contract_draft_runtime, false);
  assert.equal(descriptor.executes_fixture_manifest_runtime, false);
  assert.equal(descriptor.executes_golden_case_runtime, false);
  assert.equal(descriptor.executes_cross_tenant_fixture_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-623");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M01.S11");
});

test("CP00-622 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor();

  assert.deepEqual(contract.projections.cp622_pack_binding, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING);
  assert.deepEqual(contract.projections.cp622_requirements, DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp622_no_write_attestation, DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp622_p05_fixture_contract_draft_descriptor, descriptor);
});

test("CP00-623 descriptor covers the live RP20 P05 fixture contract draft tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor();
  const summary = validateDataRoomVdrCoreCp623Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp623PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.pack_id);
  assert.equal(cp623PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.unit_count);
  assert.equal(cp623PlanPack.range.description, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.range);
});

test("CP00-623 keeps P05 fixture contract draft tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor();
  const validation = validateDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp623HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp623ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp623CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_fixture_contract_draft_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_contract_draft_tail_runtime, false);
  assert.equal(descriptor.executes_fixture_manifest_runtime, false);
  assert.equal(descriptor.executes_fixture_test_runtime, false);
  assert.equal(descriptor.executes_ai_retrieval_runtime, false);
  assert.equal(descriptor.emits_hermes_fixture_runtime_evidence, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-624");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M02.S01");
});

test("CP00-623 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor();

  assert.deepEqual(contract.projections.cp623_pack_binding, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING);
  assert.deepEqual(contract.projections.cp623_requirements, DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp623_no_write_attestation, DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp623_p05_fixture_contract_draft_tail_descriptor, descriptor);
});

test("CP00-624 descriptor covers the live RP20 P05 fixture type and shape head rows", () => {
  const descriptor = createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp624Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp624PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.pack_id);
  assert.equal(cp624PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.unit_count);
  assert.equal(cp624PlanPack.range.description, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.range);
});

test("CP00-624 keeps P05 fixture type and shape head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp624HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp624ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp624CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_fixture_contract_draft_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_contract_draft_tail_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_type_shape_runtime, false);
  assert.equal(descriptor.executes_base_fixture_shape_runtime, false);
  assert.equal(descriptor.executes_golden_case_type_shape_runtime, false);
  assert.equal(descriptor.executes_review_required_type_shape_runtime, false);
  assert.equal(descriptor.executes_denied_or_cross_tenant_type_shape_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-625");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M02.S11");
});

test("CP00-624 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor();

  assert.deepEqual(contract.projections.cp624_pack_binding, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING);
  assert.deepEqual(contract.projections.cp624_requirements, DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp624_no_write_attestation, DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp624_p05_fixture_type_shape_head_descriptor, descriptor);
});

test("CP00-625 descriptor covers the live RP20 P05 fixture type and shape tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor();
  const summary = validateDataRoomVdrCoreCp625Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp625PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.pack_id);
  assert.equal(cp625PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.unit_count);
  assert.equal(cp625PlanPack.range.description, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.range);
});

test("CP00-625 keeps P05 fixture type and shape tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor();
  const validation = validateDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp625HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp625ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp625CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_fixture_type_shape_runtime, false);
  assert.equal(descriptor.executes_p05_fixture_type_shape_tail_runtime, false);
  assert.equal(descriptor.executes_type_shape_ai_retrieval_runtime, false);
  assert.equal(descriptor.executes_type_shape_fixture_test_runtime, false);
  assert.equal(descriptor.emits_type_shape_hermes_fixture_runtime_evidence, false);
  assert.equal(descriptor.executes_fixture_manifest_runtime, false);
  assert.equal(descriptor.executes_fixture_test_runtime, false);
  assert.equal(descriptor.executes_ai_retrieval_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-626");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M03.S01");
});

test("CP00-625 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor();

  assert.deepEqual(contract.projections.cp625_pack_binding, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING);
  assert.deepEqual(contract.projections.cp625_requirements, DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp625_no_write_attestation, DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp625_p05_fixture_type_shape_tail_descriptor, descriptor);
});

test("CP00-626 descriptor covers the live RP20 P05 primary implementation head rows", () => {
  const descriptor = createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp626Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp626PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.pack_id);
  assert.equal(cp626PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.unit_count);
  assert.equal(cp626PlanPack.range.description, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.range);
});

test("CP00-626 keeps P05 primary implementation head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp626HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp626ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp626CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_primary_fixture_runtime, false);
  assert.equal(descriptor.executes_primary_golden_case_runtime, false);
  assert.equal(descriptor.executes_primary_review_required_runtime, false);
  assert.equal(descriptor.executes_primary_denied_or_cross_tenant_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-627");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M03.S11");
});

test("CP00-626 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor();

  assert.deepEqual(contract.projections.cp626_pack_binding, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING);
  assert.deepEqual(contract.projections.cp626_requirements, DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp626_no_write_attestation, DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp626_p05_primary_implementation_head_descriptor, descriptor);
});

test("CP00-627 descriptor covers the live RP20 P05 primary implementation tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor();
  const summary = validateDataRoomVdrCoreCp627Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp627PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.pack_id);
  assert.equal(cp627PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.unit_count);
  assert.equal(cp627PlanPack.range.description, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.range);
});

test("CP00-627 keeps P05 primary implementation tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor();
  const validation = validateDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp627HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp627ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp627CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_p05_primary_implementation_tail_runtime, false);
  assert.equal(descriptor.executes_primary_ai_retrieval_runtime, false);
  assert.equal(descriptor.executes_primary_fixture_test_runtime, false);
  assert.equal(descriptor.emits_primary_hermes_fixture_runtime_evidence, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-628");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M03.S21");
});

test("CP00-627 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor();

  assert.deepEqual(contract.projections.cp627_pack_binding, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING);
  assert.deepEqual(contract.projections.cp627_requirements, DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp627_no_write_attestation, DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp627_p05_primary_implementation_tail_descriptor, descriptor);
});

test("CP00-628 descriptor covers the live RP20 P05 secondary workflow permission audit bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp628Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp628PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.pack_id);
  assert.equal(cp628PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.unit_count);
  assert.equal(cp628PlanPack.range.description, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.range);
});

test("CP00-628 keeps P05 secondary workflow permission audit bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp628HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp628ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp628CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_primary_stable_id_runtime, false);
  assert.equal(descriptor.executes_p05_primary_replay_runtime, false);
  assert.equal(descriptor.executes_p05_secondary_workflow_runtime, false);
  assert.equal(descriptor.executes_p05_permission_audit_binding_runtime, false);
  assert.equal(descriptor.executes_secondary_fixture_runtime, false);
  assert.equal(descriptor.executes_permission_audit_fixture_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-629");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M05.S17");
});

test("CP00-628 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor();

  assert.deepEqual(contract.projections.cp628_pack_binding, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING);
  assert.deepEqual(contract.projections.cp628_requirements, DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp628_no_write_attestation, DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp628_p05_secondary_workflow_permission_audit_bridge_descriptor, descriptor);
});

test("CP00-629 descriptor covers the live RP20 P05 permission audit tail and synthetic fixture head rows", () => {
  const descriptor = createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp629Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 2);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp629PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.pack_id);
  assert.equal(cp629PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.unit_count);
  assert.equal(cp629PlanPack.range.description, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.range);
});

test("CP00-629 keeps P05 permission audit tail and synthetic fixture head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp629HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp629ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp629CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_permission_audit_tail_runtime, false);
  assert.equal(descriptor.executes_p05_synthetic_fixture_head_runtime, false);
  assert.equal(descriptor.executes_synthetic_fixture_head_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-630");
  assert.equal(handoff.next_subphase_id, "RP20.P05.M06.S05");
});

test("CP00-629 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor();

  assert.deepEqual(contract.projections.cp629_pack_binding, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING);
  assert.deepEqual(contract.projections.cp629_requirements, DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp629_no_write_attestation, DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp629_p05_permission_audit_tail_synthetic_fixture_head_descriptor, descriptor);
});

test("CP00-630 descriptor covers the live RP20 P05 fixture closeout and P06 permission matrix bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp630Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 8);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp630PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.pack_id);
  assert.equal(cp630PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.unit_count);
  assert.equal(cp630PlanPack.range.description, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.range);
});

test("CP00-630 keeps P05 closeout and P06 permission bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp630HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp630ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp630CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p05_fixture_closeout_runtime, false);
  assert.equal(descriptor.executes_p06_permission_matrix_runtime, false);
  assert.equal(descriptor.executes_p06_decision_binding_runtime, false);
  assert.equal(descriptor.executes_p06_security_interaction_runtime, false);
  assert.equal(descriptor.executes_p06_permission_fixture_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-631");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M02.S19");
});

test("CP00-630 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor();

  assert.deepEqual(contract.projections.cp630_pack_binding, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING);
  assert.deepEqual(contract.projections.cp630_requirements, DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp630_no_write_attestation, DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp630_p05_fixture_closeout_p06_permission_matrix_bridge_descriptor, descriptor);
});

test("CP00-631 descriptor covers the live RP20 P06 type-shape tail and primary/secondary bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp631Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp631PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.pack_id);
  assert.equal(cp631PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.unit_count);
  assert.equal(cp631PlanPack.range.description, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.range);
});

test("CP00-631 keeps P06 type-shape tail and primary/secondary bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp631HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp631ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp631CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_type_shape_test_tail_runtime, false);
  assert.equal(descriptor.executes_p06_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_p06_secondary_workflow_head_runtime, false);
  assert.equal(descriptor.executes_p06_cross_tenant_test_runtime, false);
  assert.equal(descriptor.executes_p06_leak_prevention_test_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-632");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M04.S15");
});

test("CP00-631 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor();

  assert.deepEqual(contract.projections.cp631_pack_binding, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING);
  assert.deepEqual(contract.projections.cp631_requirements, DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp631_no_write_attestation, DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp631_p06_type_shape_tail_primary_secondary_bridge_descriptor, descriptor);
});

test("CP00-632 descriptor covers the live RP20 P06 secondary tail and permission/audit binding head rows", () => {
  const descriptor = createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp632Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 2);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp632PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.pack_id);
  assert.equal(cp632PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.unit_count);
  assert.equal(cp632PlanPack.range.description, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.range);
});

test("CP00-632 keeps P06 secondary tail and permission/audit binding head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp632HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp632ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp632CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_secondary_workflow_tail_runtime, false);
  assert.equal(descriptor.executes_p06_permission_audit_binding_head_runtime, false);
  assert.equal(descriptor.executes_p06_approval_route_runtime, false);
  assert.equal(descriptor.executes_p06_security_trimming_runtime, false);
  assert.equal(descriptor.executes_p06_audit_event_runtime, false);
  assert.equal(descriptor.executes_p06_cross_tenant_test_runtime, false);
  assert.equal(descriptor.executes_p06_leak_prevention_test_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-633");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M05.S03");
});

test("CP00-632 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor();

  assert.deepEqual(contract.projections.cp632_pack_binding, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING);
  assert.deepEqual(contract.projections.cp632_requirements, DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp632_no_write_attestation, DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp632_p06_secondary_tail_permission_audit_binding_head_descriptor, descriptor);
});

test("CP00-633 descriptor covers the live RP20 P06 permission/audit binding middle rows", () => {
  const descriptor = createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor();
  const summary = validateDataRoomVdrCoreCp633Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp633PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.pack_id);
  assert.equal(cp633PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.unit_count);
  assert.equal(cp633PlanPack.range.description, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.range);
});

test("CP00-633 keeps P06 permission/audit binding middle rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor();
  const validation = validateDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp633HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp633ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp633CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_permission_audit_binding_middle_runtime, false);
  assert.equal(descriptor.executes_p06_decision_binding_middle_runtime, false);
  assert.equal(descriptor.executes_p06_audit_hint_runtime, false);
  assert.equal(descriptor.executes_p06_matched_rule_capture_runtime, false);
  assert.equal(descriptor.executes_p06_deny_over_allow_runtime, false);
  assert.equal(descriptor.executes_p06_legal_hold_interaction_runtime, false);
  assert.equal(descriptor.executes_p06_ethical_wall_interaction_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-634");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M05.S13");
});

test("CP00-633 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor();

  assert.deepEqual(contract.projections.cp633_pack_binding, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING);
  assert.deepEqual(contract.projections.cp633_requirements, DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp633_no_write_attestation, DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp633_p06_permission_audit_binding_middle_descriptor, descriptor);
});

test("CP00-634 descriptor covers the live RP20 P06 permission/audit binding tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor();
  const summary = validateDataRoomVdrCoreCp634Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp634PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.pack_id);
  assert.equal(cp634PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.unit_count);
  assert.equal(cp634PlanPack.range.description, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.range);
});

test("CP00-634 keeps P06 permission/audit binding tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor();
  const validation = validateDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp634HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp634ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp634CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_permission_audit_binding_tail_runtime, false);
  assert.equal(descriptor.executes_p06_object_acl_interaction_runtime, false);
  assert.equal(descriptor.executes_p06_review_required_route_runtime, false);
  assert.equal(descriptor.executes_p06_approval_required_route_runtime, false);
  assert.equal(descriptor.executes_p06_security_trimming_proof_runtime, false);
  assert.equal(descriptor.executes_p06_audit_event_expectation_runtime, false);
  assert.equal(descriptor.executes_p06_permission_fixture_runtime, false);
  assert.equal(descriptor.executes_p06_permission_test_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-635");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M06.S01");
});

test("CP00-634 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor();

  assert.deepEqual(contract.projections.cp634_pack_binding, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING);
  assert.deepEqual(contract.projections.cp634_requirements, DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp634_no_write_attestation, DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp634_p06_permission_audit_binding_tail_descriptor, descriptor);
});

test("CP00-635 descriptor covers the live RP20 P06 synthetic fixture head rows", () => {
  const descriptor = createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp635Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp635PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.pack_id);
  assert.equal(cp635PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.unit_count);
  assert.equal(cp635PlanPack.range.description, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.range);
});

test("CP00-635 keeps P06 synthetic fixture head rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp635HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp635ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp635CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_synthetic_fixture_head_runtime, false);
  assert.equal(descriptor.executes_p06_synthetic_permission_matrix_runtime, false);
  assert.equal(descriptor.executes_p06_synthetic_decision_binding_runtime, false);
  assert.equal(descriptor.executes_p06_synthetic_audit_hint_runtime, false);
  assert.equal(descriptor.executes_p06_synthetic_matched_rule_runtime, false);
  assert.equal(descriptor.executes_p06_synthetic_deny_over_allow_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-636");
  assert.equal(handoff.next_subphase_id, "RP20.P06.M06.S11");
});

test("CP00-635 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor();

  assert.deepEqual(contract.projections.cp635_pack_binding, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING);
  assert.deepEqual(contract.projections.cp635_requirements, DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp635_no_write_attestation, DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp635_p06_synthetic_fixture_head_descriptor, descriptor);
});

test("CP00-636 descriptor covers the live RP20 P06/P07 fixture failure bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp636Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 8);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp636PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.pack_id);
  assert.equal(cp636PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.unit_count);
  assert.equal(cp636PlanPack.range.description, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.range);
});

test("CP00-636 keeps P06/P07 fixture failure bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp636HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp636ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp636CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p06_synthetic_fixture_tail_runtime, false);
  assert.equal(descriptor.executes_p06_test_golden_case_runtime, false);
  assert.equal(descriptor.executes_p06_hermes_evidence_packet_runtime, false);
  assert.equal(descriptor.executes_p06_claude_review_packet_runtime, false);
  assert.equal(descriptor.executes_p06_closeout_handoff_runtime, false);
  assert.equal(descriptor.executes_p07_failure_recovery_scope_runtime, false);
  assert.equal(descriptor.executes_p07_failure_recovery_contract_runtime, false);
  assert.equal(descriptor.executes_p07_failure_recovery_type_shape_runtime, false);
  assert.equal(descriptor.executes_p07_failure_runtime, false);
  assert.equal(descriptor.executes_p07_compensation_runtime, false);
  assert.equal(descriptor.executes_p07_failure_test_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-637");
  assert.equal(handoff.next_subphase_id, "RP20.P07.M02.S13");
});

test("CP00-636 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor();

  assert.deepEqual(contract.projections.cp636_pack_binding, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING);
  assert.deepEqual(contract.projections.cp636_requirements, DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp636_no_write_attestation, DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp636_p06_p07_fixture_failure_bridge_descriptor, descriptor);
});

test("CP00-637 descriptor covers the live RP20 P07 failure recovery continuation rows", () => {
  const descriptor = createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp637Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp637PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.pack_id);
  assert.equal(cp637PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.unit_count);
  assert.equal(cp637PlanPack.range.description, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.range);
});

test("CP00-637 keeps P07 failure recovery continuation rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp637HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp637ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp637CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p07_failure_recovery_type_tail_runtime, false);
  assert.equal(descriptor.executes_p07_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_p07_secondary_workflow_head_runtime, false);
  assert.equal(descriptor.executes_p07_failure_recovery_edge_prompt_runtime, false);
  assert.equal(descriptor.executes_p07_human_escalation_runtime, false);
  assert.equal(descriptor.executes_p07_failure_runtime, false);
  assert.equal(descriptor.executes_p07_compensation_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-638");
  assert.equal(handoff.next_subphase_id, "RP20.P07.M04.S09");
});

test("CP00-637 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor();

  assert.deepEqual(contract.projections.cp637_pack_binding, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING);
  assert.deepEqual(contract.projections.cp637_requirements, DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp637_no_write_attestation, DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp637_p07_failure_recovery_type_primary_secondary_bridge_descriptor, descriptor);
});

test("CP00-638 descriptor covers the live RP20 P07 secondary tail permission and fixture rows", () => {
  const descriptor = createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor();
  const summary = validateDataRoomVdrCoreCp638Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp638PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.pack_id);
  assert.equal(cp638PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.unit_count);
  assert.equal(cp638PlanPack.range.description, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.range);
});

test("CP00-638 keeps P07 secondary tail permission and fixture rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor();
  const validation = validateDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp638HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp638ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp638CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p07_secondary_workflow_tail_runtime, false);
  assert.equal(descriptor.executes_p07_permission_audit_binding_runtime, false);
  assert.equal(descriptor.executes_p07_synthetic_fixture_head_runtime, false);
  assert.equal(descriptor.executes_p07_failure_runtime, false);
  assert.equal(descriptor.executes_p07_compensation_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-639");
  assert.equal(handoff.next_subphase_id, "RP20.P07.M06.S05");
});

test("CP00-638 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor();

  assert.deepEqual(contract.projections.cp638_pack_binding, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING);
  assert.deepEqual(contract.projections.cp638_requirements, DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp638_no_write_attestation, DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp638_p07_secondary_tail_permission_audit_fixture_head_descriptor, descriptor);
});

test("CP00-639 descriptor covers the live RP20 P07 closeout and P08 Hermes evidence bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp639Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 8);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp639PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.pack_id);
  assert.equal(cp639PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.unit_count);
  assert.equal(cp639PlanPack.range.description, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.range);
});

test("CP00-639 keeps P07 closeout and P08 Hermes evidence bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp639HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp639ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp639CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p07_synthetic_fixture_tail_runtime, false);
  assert.equal(descriptor.executes_p07_test_golden_case_runtime, false);
  assert.equal(descriptor.executes_p07_hermes_evidence_packet_runtime, false);
  assert.equal(descriptor.executes_p07_claude_review_packet_runtime, false);
  assert.equal(descriptor.executes_p07_closeout_handoff_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_scope_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_contract_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_type_shape_head_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-640");
  assert.equal(handoff.next_subphase_id, "RP20.P08.M02.S17");
});

test("CP00-639 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor();

  assert.deepEqual(contract.projections.cp639_pack_binding, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING);
  assert.deepEqual(contract.projections.cp639_requirements, DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp639_no_write_attestation, DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp639_p07_fixture_closeout_p08_hermes_evidence_bridge_descriptor, descriptor);
});

test("CP00-640 descriptor covers the live RP20 P08 Hermes evidence continuation rows", () => {
  const descriptor = createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp640Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp640PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.pack_id);
  assert.equal(cp640PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.unit_count);
  assert.equal(cp640PlanPack.range.description, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.range);
});

test("CP00-640 keeps P08 Hermes evidence continuation rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp640HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp640ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp640CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p08_hermes_evidence_type_shape_tail_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_secondary_workflow_head_runtime, false);
  assert.equal(descriptor.dispatches_data_room_runtime, false);
  assert.equal(descriptor.dispatches_vdr_runtime, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-641");
  assert.equal(handoff.next_subphase_id, "RP20.P08.M04.S15");
});

test("CP00-640 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor();

  assert.deepEqual(contract.projections.cp640_pack_binding, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING);
  assert.deepEqual(contract.projections.cp640_requirements, DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp640_no_write_attestation, DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp640_p08_hermes_evidence_type_primary_secondary_bridge_descriptor, descriptor);
});

test("CP00-641 descriptor covers the live RP20 P08 secondary, permission, and fixture bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp641Coverage(descriptor);

  assert.equal(summary.covered_units, 40);
  assert.equal(summary.section_count, 3);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp641PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.pack_id);
  assert.equal(cp641PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.unit_count);
  assert.equal(cp641PlanPack.range.description, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.range);
});

test("CP00-641 keeps P08 secondary, permission, and fixture bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp641HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp641ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp641CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p08_hermes_evidence_secondary_workflow_tail_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_permission_audit_binding_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_synthetic_fixture_head_runtime, false);
  assert.equal(descriptor.evaluates_runtime_permission, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-642");
  assert.equal(handoff.next_subphase_id, "RP20.P08.M06.S11");
});

test("CP00-641 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor();

  assert.deepEqual(contract.projections.cp641_pack_binding, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING);
  assert.deepEqual(contract.projections.cp641_requirements, DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp641_no_write_attestation, DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp641_p08_hermes_evidence_secondary_permission_fixture_bridge_descriptor, descriptor);
});

test("CP00-642 descriptor covers the live RP20 P08 synthetic fixture tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor();
  const summary = validateDataRoomVdrCoreCp642Coverage(descriptor);

  assert.equal(summary.covered_units, 10);
  assert.equal(summary.section_count, 1);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp642PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.pack_id);
  assert.equal(cp642PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.unit_count);
  assert.equal(cp642PlanPack.range.description, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.range);
});

test("CP00-642 keeps P08 synthetic fixture tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor();
  const validation = validateDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp642HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp642ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp642CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p08_hermes_evidence_synthetic_fixture_tail_runtime, false);
  assert.equal(descriptor.evaluates_runtime_permission, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-643");
  assert.equal(handoff.next_subphase_id, "RP20.P08.M06.S21");
});

test("CP00-642 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor();

  assert.deepEqual(contract.projections.cp642_pack_binding, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING);
  assert.deepEqual(contract.projections.cp642_requirements, DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp642_no_write_attestation, DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp642_p08_hermes_evidence_synthetic_fixture_tail_descriptor, descriptor);
});

test("CP00-643 descriptor covers the live RP20 P08/P09 review closeout bridge rows", () => {
  const descriptor = createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor();
  const summary = validateDataRoomVdrCoreCp643Coverage(descriptor);

  assert.equal(summary.covered_units, 150);
  assert.equal(summary.section_count, 10);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp643PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.pack_id);
  assert.equal(cp643PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.unit_count);
  assert.equal(cp643PlanPack.range.description, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.range);
});

test("CP00-643 keeps P08/P09 review closeout bridge rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor();
  const validation = validateDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp643HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp643ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp643CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p08_hermes_evidence_synthetic_fixture_documentation_tail_runtime, false);
  assert.equal(descriptor.executes_p08_test_golden_case_runtime, false);
  assert.equal(descriptor.executes_p08_hermes_evidence_packet_runtime, false);
  assert.equal(descriptor.executes_p08_claude_review_packet_runtime, false);
  assert.equal(descriptor.executes_p08_closeout_handoff_runtime, false);
  assert.equal(descriptor.executes_p09_review_scope_runtime, false);
  assert.equal(descriptor.executes_p09_review_contract_runtime, false);
  assert.equal(descriptor.executes_p09_review_type_shape_runtime, false);
  assert.equal(descriptor.executes_p09_review_primary_implementation_runtime, false);
  assert.equal(descriptor.executes_p09_review_secondary_workflow_head_runtime, false);
  assert.equal(descriptor.evaluates_runtime_permission, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-644");
  assert.equal(handoff.next_subphase_id, "RP20.P09.M04.S13");
});

test("CP00-643 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor();

  assert.deepEqual(contract.projections.cp643_pack_binding, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING);
  assert.deepEqual(contract.projections.cp643_requirements, DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp643_no_write_attestation, DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp643_p08_p09_review_closeout_bridge_descriptor, descriptor);
});

test("CP00-644 descriptor covers the live RP20 P09 review closeout tail rows", () => {
  const descriptor = createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor();
  const summary = validateDataRoomVdrCoreCp644Coverage(descriptor);

  assert.equal(summary.covered_units, 122);
  assert.equal(summary.section_count, 7);
  assert.deepEqual(summary.deliverable_counts, DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS.expected_deliverable_counts);
  assert.equal(cp644PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.pack_id);
  assert.equal(cp644PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.unit_count);
  assert.equal(cp644PlanPack.range.description, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.range);
});

test("CP00-644 keeps P09 review closeout tail rows descriptor-only", () => {
  const descriptor = createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor();
  const validation = validateDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor(descriptor);
  const hermesPacket = createDataRoomVdrCoreCp644HermesEvidencePacket(descriptor);
  const claudePacket = createDataRoomVdrCoreCp644ClaudeReviewPacket(descriptor);
  const handoff = createDataRoomVdrCoreCp644CloseoutHandoff(descriptor);

  assert.equal(validation.production_ready_candidate, true);
  assert.equal(descriptor.executes_p09_review_secondary_workflow_tail_runtime, false);
  assert.equal(descriptor.executes_p09_review_permission_audit_binding_runtime, false);
  assert.equal(descriptor.executes_p09_review_synthetic_fixture_runtime, false);
  assert.equal(descriptor.executes_p09_review_test_golden_case_runtime, false);
  assert.equal(descriptor.executes_p09_review_hermes_evidence_packet_runtime, false);
  assert.equal(descriptor.executes_p09_review_claude_review_packet_runtime, false);
  assert.equal(descriptor.executes_p09_review_closeout_handoff_runtime, false);
  assert.equal(descriptor.evaluates_runtime_permission, false);
  assert.equal(descriptor.writes_audit_event, false);
  assert.equal(descriptor.no_write_attestation, DATA_ROOM_VDR_CORE_CP644_NO_WRITE_ATTESTATION);
  assert.equal(hermesPacket.emits_hermes_runtime_receipt, false);
  assert.equal(claudePacket.claude_is_final_approval, false);
  assert.equal(handoff.to_pack_id, "CP00-645");
  assert.equal(handoff.next_subphase_id, "RP21.P00.M00.S01");
});

test("CP00-644 contract projection matches package code", () => {
  const descriptor = createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor();

  assert.deepEqual(contract.projections.cp644_pack_binding, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING);
  assert.deepEqual(contract.projections.cp644_requirements, DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS);
  assert.deepEqual(contract.projections.cp644_no_write_attestation, DATA_ROOM_VDR_CORE_CP644_NO_WRITE_ATTESTATION);
  assert.deepEqual(contract.packs.cp644_p09_review_closeout_tail_descriptor, descriptor);
});
