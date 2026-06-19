import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  validateDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor,
  validateDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor,
  validateDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor,
  validateDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor,
  validateDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor,
  validateDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor,
  validateDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor,
  validateDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor,
  validateDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor,
  validateDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor,
  validateDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor,
  validateDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor,
  validateDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor,
  validateDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor,
  validateDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor,
  validateDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor,
  validateDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor,
  validateDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor,
  validateDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor,
  validateDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor,
  validateDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor,
  validateDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor,
  validateDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor,
  validateDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor,
  validateDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor,
  validateDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor,
  validateDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor,
  validateDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor,
  validateDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor,
  validateDataRoomVdrCoreCp610ScopeContractFoundationDescriptor,
} from "../packages/data-room/src/index.js";

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

const dataRoomContract = await readJson("../contracts/data-room-vdr-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp610Manifest = await readOptionalJson("../docs/closeout-packs/cp00-610/manifest.json");
const cp611Manifest = await readOptionalJson("../docs/closeout-packs/cp00-611/manifest.json");
const cp612Manifest = await readOptionalJson("../docs/closeout-packs/cp00-612/manifest.json");
const cp613Manifest = await readOptionalJson("../docs/closeout-packs/cp00-613/manifest.json");
const cp614Manifest = await readOptionalJson("../docs/closeout-packs/cp00-614/manifest.json");
const cp615Manifest = await readOptionalJson("../docs/closeout-packs/cp00-615/manifest.json");
const cp616Manifest = await readOptionalJson("../docs/closeout-packs/cp00-616/manifest.json");
const cp617Manifest = await readOptionalJson("../docs/closeout-packs/cp00-617/manifest.json");
const cp618Manifest = await readOptionalJson("../docs/closeout-packs/cp00-618/manifest.json");
const cp619Manifest = await readOptionalJson("../docs/closeout-packs/cp00-619/manifest.json");
const cp620Manifest = await readOptionalJson("../docs/closeout-packs/cp00-620/manifest.json");
const cp621Manifest = await readOptionalJson("../docs/closeout-packs/cp00-621/manifest.json");
const cp622Manifest = await readOptionalJson("../docs/closeout-packs/cp00-622/manifest.json");
const cp623Manifest = await readOptionalJson("../docs/closeout-packs/cp00-623/manifest.json");
const cp624Manifest = await readOptionalJson("../docs/closeout-packs/cp00-624/manifest.json");
const cp625Manifest = await readOptionalJson("../docs/closeout-packs/cp00-625/manifest.json");
const cp626Manifest = await readOptionalJson("../docs/closeout-packs/cp00-626/manifest.json");
const cp627Manifest = await readOptionalJson("../docs/closeout-packs/cp00-627/manifest.json");
const cp628Manifest = await readOptionalJson("../docs/closeout-packs/cp00-628/manifest.json");
const cp629Manifest = await readOptionalJson("../docs/closeout-packs/cp00-629/manifest.json");
const cp630Manifest = await readOptionalJson("../docs/closeout-packs/cp00-630/manifest.json");
const cp631Manifest = await readOptionalJson("../docs/closeout-packs/cp00-631/manifest.json");
const cp632Manifest = await readOptionalJson("../docs/closeout-packs/cp00-632/manifest.json");
const cp633Manifest = await readOptionalJson("../docs/closeout-packs/cp00-633/manifest.json");
const cp634Manifest = await readOptionalJson("../docs/closeout-packs/cp00-634/manifest.json");
const cp635Manifest = await readOptionalJson("../docs/closeout-packs/cp00-635/manifest.json");
const cp636Manifest = await readOptionalJson("../docs/closeout-packs/cp00-636/manifest.json");
const cp637Manifest = await readOptionalJson("../docs/closeout-packs/cp00-637/manifest.json");
const cp638Manifest = await readOptionalJson("../docs/closeout-packs/cp00-638/manifest.json");
const cp639Manifest = await readOptionalJson("../docs/closeout-packs/cp00-639/manifest.json");
const cp640Manifest = await readOptionalJson("../docs/closeout-packs/cp00-640/manifest.json");
const cp641Manifest = await readOptionalJson("../docs/closeout-packs/cp00-641/manifest.json");
const cp642Manifest = await readOptionalJson("../docs/closeout-packs/cp00-642/manifest.json");
const cp643Manifest = await readOptionalJson("../docs/closeout-packs/cp00-643/manifest.json");
const cp644Manifest = await readOptionalJson("../docs/closeout-packs/cp00-644/manifest.json");
const cp610PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-610") ?? cp610Manifest?.plan_binding_snapshot;
const cp611PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-611") ?? cp611Manifest?.plan_binding_snapshot;
const cp612PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-612") ?? cp612Manifest?.plan_binding_snapshot;
const cp613PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-613") ?? cp613Manifest?.plan_binding_snapshot;
const cp614PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-614") ?? cp614Manifest?.plan_binding_snapshot;
const cp615PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-615") ?? cp615Manifest?.plan_binding_snapshot;
const cp616PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-616") ?? cp616Manifest?.plan_binding_snapshot;
const cp617PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-617") ?? cp617Manifest?.plan_binding_snapshot;
const cp618PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-618") ?? cp618Manifest?.plan_binding_snapshot;
const cp619PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-619") ?? cp619Manifest?.plan_binding_snapshot;
const cp620PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-620") ?? cp620Manifest?.plan_binding_snapshot;
const cp621PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-621") ?? cp621Manifest?.plan_binding_snapshot;
const cp622PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-622") ?? cp622Manifest?.plan_binding_snapshot;
const cp623PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-623") ?? cp623Manifest?.plan_binding_snapshot;
const cp624PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-624") ?? cp624Manifest?.plan_binding_snapshot;
const cp625PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-625") ?? cp625Manifest?.plan_binding_snapshot;
const cp626PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-626") ?? cp626Manifest?.plan_binding_snapshot;
const cp627PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-627") ?? cp627Manifest?.plan_binding_snapshot;
const cp628PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-628") ?? cp628Manifest?.plan_binding_snapshot;
const cp629PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-629") ?? cp629Manifest?.plan_binding_snapshot;
const cp630PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-630") ?? cp630Manifest?.plan_binding_snapshot;
const cp631PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-631") ?? cp631Manifest?.plan_binding_snapshot;
const cp632PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-632") ?? cp632Manifest?.plan_binding_snapshot;
const cp633PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-633") ?? cp633Manifest?.plan_binding_snapshot;
const cp634PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-634") ?? cp634Manifest?.plan_binding_snapshot;
const cp635PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-635") ?? cp635Manifest?.plan_binding_snapshot;
const cp636PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-636") ?? cp636Manifest?.plan_binding_snapshot;
const cp637PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-637") ?? cp637Manifest?.plan_binding_snapshot;
const cp638PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-638") ?? cp638Manifest?.plan_binding_snapshot;
const cp639PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-639") ?? cp639Manifest?.plan_binding_snapshot;
const cp640PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-640") ?? cp640Manifest?.plan_binding_snapshot;
const cp641PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-641") ?? cp641Manifest?.plan_binding_snapshot;
const cp642PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-642") ?? cp642Manifest?.plan_binding_snapshot;
const cp643PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-643") ?? cp643Manifest?.plan_binding_snapshot;
const cp644PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-644") ?? cp644Manifest?.plan_binding_snapshot;

const cp610Descriptor = createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor();
const cp610Validation = validateDataRoomVdrCoreCp610ScopeContractFoundationDescriptor(cp610Descriptor);
const cp610HermesPacket = createDataRoomVdrCoreCp610HermesEvidencePacket(cp610Descriptor);
const cp610ClaudePacket = createDataRoomVdrCoreCp610ClaudeReviewPacket(cp610Descriptor);
const cp610Handoff = createDataRoomVdrCoreCp610CloseoutHandoff(cp610Descriptor);
const cp611Descriptor = createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor();
const cp611Validation = validateDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor(cp611Descriptor);
const cp611HermesPacket = createDataRoomVdrCoreCp611HermesEvidencePacket(cp611Descriptor);
const cp611ClaudePacket = createDataRoomVdrCoreCp611ClaudeReviewPacket(cp611Descriptor);
const cp611Handoff = createDataRoomVdrCoreCp611CloseoutHandoff(cp611Descriptor);
const cp612Descriptor = createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor();
const cp612Validation = validateDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor(cp612Descriptor);
const cp612HermesPacket = createDataRoomVdrCoreCp612HermesEvidencePacket(cp612Descriptor);
const cp612ClaudePacket = createDataRoomVdrCoreCp612ClaudeReviewPacket(cp612Descriptor);
const cp612Handoff = createDataRoomVdrCoreCp612CloseoutHandoff(cp612Descriptor);
const cp613Descriptor = createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor();
const cp613Validation = validateDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor(cp613Descriptor);
const cp613HermesPacket = createDataRoomVdrCoreCp613HermesEvidencePacket(cp613Descriptor);
const cp613ClaudePacket = createDataRoomVdrCoreCp613ClaudeReviewPacket(cp613Descriptor);
const cp613Handoff = createDataRoomVdrCoreCp613CloseoutHandoff(cp613Descriptor);
const cp614Descriptor = createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor();
const cp614Validation = validateDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor(cp614Descriptor);
const cp614HermesPacket = createDataRoomVdrCoreCp614HermesEvidencePacket(cp614Descriptor);
const cp614ClaudePacket = createDataRoomVdrCoreCp614ClaudeReviewPacket(cp614Descriptor);
const cp614Handoff = createDataRoomVdrCoreCp614CloseoutHandoff(cp614Descriptor);
const cp615Descriptor = createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor();
const cp615Validation = validateDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor(cp615Descriptor);
const cp615HermesPacket = createDataRoomVdrCoreCp615HermesEvidencePacket(cp615Descriptor);
const cp615ClaudePacket = createDataRoomVdrCoreCp615ClaudeReviewPacket(cp615Descriptor);
const cp615Handoff = createDataRoomVdrCoreCp615CloseoutHandoff(cp615Descriptor);
const cp616Descriptor = createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor();
const cp616Validation = validateDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor(cp616Descriptor);
const cp616HermesPacket = createDataRoomVdrCoreCp616HermesEvidencePacket(cp616Descriptor);
const cp616ClaudePacket = createDataRoomVdrCoreCp616ClaudeReviewPacket(cp616Descriptor);
const cp616Handoff = createDataRoomVdrCoreCp616CloseoutHandoff(cp616Descriptor);
const cp617Descriptor = createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor();
const cp617Validation = validateDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor(cp617Descriptor);
const cp617HermesPacket = createDataRoomVdrCoreCp617HermesEvidencePacket(cp617Descriptor);
const cp617ClaudePacket = createDataRoomVdrCoreCp617ClaudeReviewPacket(cp617Descriptor);
const cp617Handoff = createDataRoomVdrCoreCp617CloseoutHandoff(cp617Descriptor);
const cp618Descriptor = createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor();
const cp618Validation = validateDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor(cp618Descriptor);
const cp618HermesPacket = createDataRoomVdrCoreCp618HermesEvidencePacket(cp618Descriptor);
const cp618ClaudePacket = createDataRoomVdrCoreCp618ClaudeReviewPacket(cp618Descriptor);
const cp618Handoff = createDataRoomVdrCoreCp618CloseoutHandoff(cp618Descriptor);
const cp619Descriptor = createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor();
const cp619Validation = validateDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor(cp619Descriptor);
const cp619HermesPacket = createDataRoomVdrCoreCp619HermesEvidencePacket(cp619Descriptor);
const cp619ClaudePacket = createDataRoomVdrCoreCp619ClaudeReviewPacket(cp619Descriptor);
const cp619Handoff = createDataRoomVdrCoreCp619CloseoutHandoff(cp619Descriptor);
const cp620Descriptor = createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor();
const cp620Validation = validateDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor(cp620Descriptor);
const cp620HermesPacket = createDataRoomVdrCoreCp620HermesEvidencePacket(cp620Descriptor);
const cp620ClaudePacket = createDataRoomVdrCoreCp620ClaudeReviewPacket(cp620Descriptor);
const cp620Handoff = createDataRoomVdrCoreCp620CloseoutHandoff(cp620Descriptor);
const cp621Descriptor = createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor();
const cp621Validation = validateDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor(cp621Descriptor);
const cp621HermesPacket = createDataRoomVdrCoreCp621HermesEvidencePacket(cp621Descriptor);
const cp621ClaudePacket = createDataRoomVdrCoreCp621ClaudeReviewPacket(cp621Descriptor);
const cp621Handoff = createDataRoomVdrCoreCp621CloseoutHandoff(cp621Descriptor);
const cp622Descriptor = createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor();
const cp622Validation = validateDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor(cp622Descriptor);
const cp622HermesPacket = createDataRoomVdrCoreCp622HermesEvidencePacket(cp622Descriptor);
const cp622ClaudePacket = createDataRoomVdrCoreCp622ClaudeReviewPacket(cp622Descriptor);
const cp622Handoff = createDataRoomVdrCoreCp622CloseoutHandoff(cp622Descriptor);
const cp623Descriptor = createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor();
const cp623Validation = validateDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor(cp623Descriptor);
const cp623HermesPacket = createDataRoomVdrCoreCp623HermesEvidencePacket(cp623Descriptor);
const cp623ClaudePacket = createDataRoomVdrCoreCp623ClaudeReviewPacket(cp623Descriptor);
const cp623Handoff = createDataRoomVdrCoreCp623CloseoutHandoff(cp623Descriptor);
const cp624Descriptor = createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor();
const cp624Validation = validateDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor(cp624Descriptor);
const cp624HermesPacket = createDataRoomVdrCoreCp624HermesEvidencePacket(cp624Descriptor);
const cp624ClaudePacket = createDataRoomVdrCoreCp624ClaudeReviewPacket(cp624Descriptor);
const cp624Handoff = createDataRoomVdrCoreCp624CloseoutHandoff(cp624Descriptor);
const cp625Descriptor = createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor();
const cp625Validation = validateDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor(cp625Descriptor);
const cp625HermesPacket = createDataRoomVdrCoreCp625HermesEvidencePacket(cp625Descriptor);
const cp625ClaudePacket = createDataRoomVdrCoreCp625ClaudeReviewPacket(cp625Descriptor);
const cp625Handoff = createDataRoomVdrCoreCp625CloseoutHandoff(cp625Descriptor);
const cp626Descriptor = createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor();
const cp626Validation = validateDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor(cp626Descriptor);
const cp626HermesPacket = createDataRoomVdrCoreCp626HermesEvidencePacket(cp626Descriptor);
const cp626ClaudePacket = createDataRoomVdrCoreCp626ClaudeReviewPacket(cp626Descriptor);
const cp626Handoff = createDataRoomVdrCoreCp626CloseoutHandoff(cp626Descriptor);
const cp627Descriptor = createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor();
const cp627Validation = validateDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor(cp627Descriptor);
const cp627HermesPacket = createDataRoomVdrCoreCp627HermesEvidencePacket(cp627Descriptor);
const cp627ClaudePacket = createDataRoomVdrCoreCp627ClaudeReviewPacket(cp627Descriptor);
const cp627Handoff = createDataRoomVdrCoreCp627CloseoutHandoff(cp627Descriptor);
const cp628Descriptor = createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor();
const cp628Validation = validateDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor(cp628Descriptor);
const cp628HermesPacket = createDataRoomVdrCoreCp628HermesEvidencePacket(cp628Descriptor);
const cp628ClaudePacket = createDataRoomVdrCoreCp628ClaudeReviewPacket(cp628Descriptor);
const cp628Handoff = createDataRoomVdrCoreCp628CloseoutHandoff(cp628Descriptor);
const cp629Descriptor = createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor();
const cp629Validation = validateDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor(cp629Descriptor);
const cp629HermesPacket = createDataRoomVdrCoreCp629HermesEvidencePacket(cp629Descriptor);
const cp629ClaudePacket = createDataRoomVdrCoreCp629ClaudeReviewPacket(cp629Descriptor);
const cp629Handoff = createDataRoomVdrCoreCp629CloseoutHandoff(cp629Descriptor);
const cp630Descriptor = createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor();
const cp630Validation = validateDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor(cp630Descriptor);
const cp630HermesPacket = createDataRoomVdrCoreCp630HermesEvidencePacket(cp630Descriptor);
const cp630ClaudePacket = createDataRoomVdrCoreCp630ClaudeReviewPacket(cp630Descriptor);
const cp630Handoff = createDataRoomVdrCoreCp630CloseoutHandoff(cp630Descriptor);
const cp631Descriptor = createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor();
const cp631Validation = validateDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor(cp631Descriptor);
const cp631HermesPacket = createDataRoomVdrCoreCp631HermesEvidencePacket(cp631Descriptor);
const cp631ClaudePacket = createDataRoomVdrCoreCp631ClaudeReviewPacket(cp631Descriptor);
const cp631Handoff = createDataRoomVdrCoreCp631CloseoutHandoff(cp631Descriptor);
const cp632Descriptor = createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor();
const cp632Validation = validateDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor(cp632Descriptor);
const cp632HermesPacket = createDataRoomVdrCoreCp632HermesEvidencePacket(cp632Descriptor);
const cp632ClaudePacket = createDataRoomVdrCoreCp632ClaudeReviewPacket(cp632Descriptor);
const cp632Handoff = createDataRoomVdrCoreCp632CloseoutHandoff(cp632Descriptor);
const cp633Descriptor = createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor();
const cp633Validation = validateDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor(cp633Descriptor);
const cp633HermesPacket = createDataRoomVdrCoreCp633HermesEvidencePacket(cp633Descriptor);
const cp633ClaudePacket = createDataRoomVdrCoreCp633ClaudeReviewPacket(cp633Descriptor);
const cp633Handoff = createDataRoomVdrCoreCp633CloseoutHandoff(cp633Descriptor);
const cp634Descriptor = createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor();
const cp634Validation = validateDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor(cp634Descriptor);
const cp634HermesPacket = createDataRoomVdrCoreCp634HermesEvidencePacket(cp634Descriptor);
const cp634ClaudePacket = createDataRoomVdrCoreCp634ClaudeReviewPacket(cp634Descriptor);
const cp634Handoff = createDataRoomVdrCoreCp634CloseoutHandoff(cp634Descriptor);
const cp635Descriptor = createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor();
const cp635Validation = validateDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor(cp635Descriptor);
const cp635HermesPacket = createDataRoomVdrCoreCp635HermesEvidencePacket(cp635Descriptor);
const cp635ClaudePacket = createDataRoomVdrCoreCp635ClaudeReviewPacket(cp635Descriptor);
const cp635Handoff = createDataRoomVdrCoreCp635CloseoutHandoff(cp635Descriptor);
const cp636Descriptor = createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor();
const cp636Validation = validateDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor(cp636Descriptor);
const cp636HermesPacket = createDataRoomVdrCoreCp636HermesEvidencePacket(cp636Descriptor);
const cp636ClaudePacket = createDataRoomVdrCoreCp636ClaudeReviewPacket(cp636Descriptor);
const cp636Handoff = createDataRoomVdrCoreCp636CloseoutHandoff(cp636Descriptor);
const cp637Descriptor = createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor();
const cp637Validation = validateDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor(cp637Descriptor);
const cp637HermesPacket = createDataRoomVdrCoreCp637HermesEvidencePacket(cp637Descriptor);
const cp637ClaudePacket = createDataRoomVdrCoreCp637ClaudeReviewPacket(cp637Descriptor);
const cp637Handoff = createDataRoomVdrCoreCp637CloseoutHandoff(cp637Descriptor);
const cp638Descriptor = createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor();
const cp638Validation = validateDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor(cp638Descriptor);
const cp638HermesPacket = createDataRoomVdrCoreCp638HermesEvidencePacket(cp638Descriptor);
const cp638ClaudePacket = createDataRoomVdrCoreCp638ClaudeReviewPacket(cp638Descriptor);
const cp638Handoff = createDataRoomVdrCoreCp638CloseoutHandoff(cp638Descriptor);
const cp639Descriptor = createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor();
const cp639Validation = validateDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor(cp639Descriptor);
const cp639HermesPacket = createDataRoomVdrCoreCp639HermesEvidencePacket(cp639Descriptor);
const cp639ClaudePacket = createDataRoomVdrCoreCp639ClaudeReviewPacket(cp639Descriptor);
const cp639Handoff = createDataRoomVdrCoreCp639CloseoutHandoff(cp639Descriptor);
const cp640Descriptor = createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor();
const cp640Validation = validateDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor(cp640Descriptor);
const cp640HermesPacket = createDataRoomVdrCoreCp640HermesEvidencePacket(cp640Descriptor);
const cp640ClaudePacket = createDataRoomVdrCoreCp640ClaudeReviewPacket(cp640Descriptor);
const cp640Handoff = createDataRoomVdrCoreCp640CloseoutHandoff(cp640Descriptor);
const cp641Descriptor = createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor();
const cp641Validation = validateDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor(cp641Descriptor);
const cp641HermesPacket = createDataRoomVdrCoreCp641HermesEvidencePacket(cp641Descriptor);
const cp641ClaudePacket = createDataRoomVdrCoreCp641ClaudeReviewPacket(cp641Descriptor);
const cp641Handoff = createDataRoomVdrCoreCp641CloseoutHandoff(cp641Descriptor);
const cp642Descriptor = createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor();
const cp642Validation = validateDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor(cp642Descriptor);
const cp642HermesPacket = createDataRoomVdrCoreCp642HermesEvidencePacket(cp642Descriptor);
const cp642ClaudePacket = createDataRoomVdrCoreCp642ClaudeReviewPacket(cp642Descriptor);
const cp642Handoff = createDataRoomVdrCoreCp642CloseoutHandoff(cp642Descriptor);
const cp643Descriptor = createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor();
const cp643Validation = validateDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor(cp643Descriptor);
const cp643HermesPacket = createDataRoomVdrCoreCp643HermesEvidencePacket(cp643Descriptor);
const cp643ClaudePacket = createDataRoomVdrCoreCp643ClaudeReviewPacket(cp643Descriptor);
const cp643Handoff = createDataRoomVdrCoreCp643CloseoutHandoff(cp643Descriptor);
const cp644Descriptor = createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor();
const cp644Validation = validateDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor(cp644Descriptor);
const cp644HermesPacket = createDataRoomVdrCoreCp644HermesEvidencePacket(cp644Descriptor);
const cp644ClaudePacket = createDataRoomVdrCoreCp644ClaudeReviewPacket(cp644Descriptor);
const cp644Handoff = createDataRoomVdrCoreCp644CloseoutHandoff(cp644Descriptor);

assert.equal(dataRoomContract.schema_version, "law-firm-os.data-room-vdr-core-contract.v0.1");
assert.equal(dataRoomContract.program.program_id, "RP20");
assert.equal(dataRoomContract.program.program_title, "Data Room And VDR");
assert.deepEqual(dataRoomContract.program, DATA_ROOM_VDR_CORE_PROGRAM_CONTRACT);
assert.deepEqual(dataRoomContract.projections.cp610_pack_binding, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp610_requirements, DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp610_no_write_attestation, DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp610_scope_contract_foundation_descriptor, cp610Descriptor);
assert.deepEqual(dataRoomContract.projections.cp611_pack_binding, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp611_requirements, DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp611_no_write_attestation, DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp611_p01_model_foundation_continuation_descriptor, cp611Descriptor);
assert.deepEqual(dataRoomContract.projections.cp612_pack_binding, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp612_requirements, DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp612_no_write_attestation, DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp612_p01_secondary_workflow_permission_audit_descriptor, cp612Descriptor);
assert.deepEqual(dataRoomContract.projections.cp613_pack_binding, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp613_requirements, DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp613_no_write_attestation, DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp613_p01_p02_service_foundation_bridge_descriptor, cp613Descriptor);
assert.deepEqual(dataRoomContract.projections.cp614_pack_binding, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp614_requirements, DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp614_no_write_attestation, DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp614_p02_primary_secondary_service_descriptor, cp614Descriptor);
assert.deepEqual(dataRoomContract.projections.cp615_pack_binding, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp615_requirements, DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp615_no_write_attestation, DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp615_p02_permission_audit_fixture_head_descriptor, cp615Descriptor);
assert.deepEqual(dataRoomContract.projections.cp616_pack_binding, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp616_requirements, DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp616_no_write_attestation, DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp616_p02_fixture_tail_test_head_descriptor, cp616Descriptor);
assert.deepEqual(dataRoomContract.projections.cp617_pack_binding, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp617_requirements, DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp617_no_write_attestation, DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp617_p02_test_golden_case_core_descriptor, cp617Descriptor);
assert.deepEqual(dataRoomContract.projections.cp618_pack_binding, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp618_requirements, DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp618_no_write_attestation, DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp618_p02_test_hermes_claude_bridge_descriptor, cp618Descriptor);
assert.deepEqual(dataRoomContract.projections.cp619_pack_binding, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp619_requirements, DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp619_no_write_attestation, DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp619_p02_claude_p03_api_interface_bridge_descriptor, cp619Descriptor);
assert.deepEqual(dataRoomContract.projections.cp620_pack_binding, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp620_requirements, DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp620_no_write_attestation, DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp620_p03_api_p04_ui_bridge_descriptor, cp620Descriptor);
assert.deepEqual(dataRoomContract.projections.cp621_pack_binding, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp621_requirements, DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp621_no_write_attestation, DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp621_p04_ui_p05_fixture_bridge_descriptor, cp621Descriptor);
assert.deepEqual(dataRoomContract.projections.cp622_pack_binding, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp622_requirements, DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp622_no_write_attestation, DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp622_p05_fixture_contract_draft_descriptor, cp622Descriptor);
assert.deepEqual(dataRoomContract.projections.cp623_pack_binding, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp623_requirements, DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp623_no_write_attestation, DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp623_p05_fixture_contract_draft_tail_descriptor, cp623Descriptor);
assert.deepEqual(dataRoomContract.projections.cp624_pack_binding, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp624_requirements, DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp624_no_write_attestation, DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp624_p05_fixture_type_shape_head_descriptor, cp624Descriptor);
assert.deepEqual(dataRoomContract.projections.cp625_pack_binding, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp625_requirements, DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp625_no_write_attestation, DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp625_p05_fixture_type_shape_tail_descriptor, cp625Descriptor);
assert.deepEqual(dataRoomContract.projections.cp626_pack_binding, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp626_requirements, DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp626_no_write_attestation, DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp626_p05_primary_implementation_head_descriptor, cp626Descriptor);
assert.deepEqual(dataRoomContract.projections.cp627_pack_binding, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp627_requirements, DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp627_no_write_attestation, DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp627_p05_primary_implementation_tail_descriptor, cp627Descriptor);
assert.deepEqual(dataRoomContract.projections.cp628_pack_binding, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp628_requirements, DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp628_no_write_attestation, DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp628_p05_secondary_workflow_permission_audit_bridge_descriptor, cp628Descriptor);
assert.deepEqual(dataRoomContract.projections.cp629_pack_binding, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp629_requirements, DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp629_no_write_attestation, DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp629_p05_permission_audit_tail_synthetic_fixture_head_descriptor, cp629Descriptor);
assert.deepEqual(dataRoomContract.projections.cp630_pack_binding, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp630_requirements, DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp630_no_write_attestation, DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp630_p05_fixture_closeout_p06_permission_matrix_bridge_descriptor, cp630Descriptor);
assert.deepEqual(dataRoomContract.projections.cp631_pack_binding, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp631_requirements, DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp631_no_write_attestation, DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp631_p06_type_shape_tail_primary_secondary_bridge_descriptor, cp631Descriptor);
assert.deepEqual(dataRoomContract.projections.cp632_pack_binding, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp632_requirements, DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp632_no_write_attestation, DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp632_p06_secondary_tail_permission_audit_binding_head_descriptor, cp632Descriptor);
assert.deepEqual(dataRoomContract.projections.cp633_pack_binding, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp633_requirements, DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp633_no_write_attestation, DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp633_p06_permission_audit_binding_middle_descriptor, cp633Descriptor);
assert.deepEqual(dataRoomContract.projections.cp634_pack_binding, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp634_requirements, DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp634_no_write_attestation, DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp634_p06_permission_audit_binding_tail_descriptor, cp634Descriptor);
assert.deepEqual(dataRoomContract.projections.cp635_pack_binding, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp635_requirements, DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp635_no_write_attestation, DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp635_p06_synthetic_fixture_head_descriptor, cp635Descriptor);
assert.deepEqual(dataRoomContract.projections.cp636_pack_binding, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp636_requirements, DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp636_no_write_attestation, DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp636_p06_p07_fixture_failure_bridge_descriptor, cp636Descriptor);
assert.deepEqual(dataRoomContract.projections.cp637_pack_binding, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp637_requirements, DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp637_no_write_attestation, DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp637_p07_failure_recovery_type_primary_secondary_bridge_descriptor, cp637Descriptor);
assert.deepEqual(dataRoomContract.projections.cp638_pack_binding, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp638_requirements, DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp638_no_write_attestation, DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp638_p07_secondary_tail_permission_audit_fixture_head_descriptor, cp638Descriptor);
assert.deepEqual(dataRoomContract.projections.cp639_pack_binding, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp639_requirements, DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp639_no_write_attestation, DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp639_p07_fixture_closeout_p08_hermes_evidence_bridge_descriptor, cp639Descriptor);
assert.deepEqual(dataRoomContract.projections.cp640_pack_binding, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp640_requirements, DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp640_no_write_attestation, DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp640_p08_hermes_evidence_type_primary_secondary_bridge_descriptor, cp640Descriptor);
assert.deepEqual(dataRoomContract.projections.cp641_pack_binding, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp641_requirements, DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp641_no_write_attestation, DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp641_p08_hermes_evidence_secondary_permission_fixture_bridge_descriptor, cp641Descriptor);
assert.deepEqual(dataRoomContract.projections.cp642_pack_binding, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp642_requirements, DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp642_no_write_attestation, DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp642_p08_hermes_evidence_synthetic_fixture_tail_descriptor, cp642Descriptor);
assert.deepEqual(dataRoomContract.projections.cp643_pack_binding, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp643_requirements, DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp643_no_write_attestation, DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp643_p08_p09_review_closeout_bridge_descriptor, cp643Descriptor);
assert.deepEqual(dataRoomContract.projections.cp644_pack_binding, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING);
assert.deepEqual(dataRoomContract.projections.cp644_requirements, DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS);
assert.deepEqual(dataRoomContract.projections.cp644_no_write_attestation, DATA_ROOM_VDR_CORE_CP644_NO_WRITE_ATTESTATION);
assert.deepEqual(dataRoomContract.packs.cp644_p09_review_closeout_tail_descriptor, cp644Descriptor);
assert.equal(cp610PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.pack_id);
assert.equal(cp610PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.unit_count);
assert.equal(cp610PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.first_unit_id);
assert.equal(cp610PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.last_unit_id);
assert.equal(cp610PlanPack.range.description, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.range);
assert.equal(cp611PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.pack_id);
assert.equal(cp611PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.unit_count);
assert.equal(cp611PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.first_unit_id);
assert.equal(cp611PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.last_unit_id);
assert.equal(cp611PlanPack.range.description, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.range);
assert.equal(cp612PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.pack_id);
assert.equal(cp612PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.unit_count);
assert.equal(cp612PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.first_unit_id);
assert.equal(cp612PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.last_unit_id);
assert.equal(cp612PlanPack.range.description, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.range);
assert.equal(cp613PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.pack_id);
assert.equal(cp613PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.unit_count);
assert.equal(cp613PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.first_unit_id);
assert.equal(cp613PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.last_unit_id);
assert.equal(cp613PlanPack.range.description, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.range);
assert.equal(cp614PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.pack_id);
assert.equal(cp614PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.unit_count);
assert.equal(cp614PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.first_unit_id);
assert.equal(cp614PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.last_unit_id);
assert.equal(cp614PlanPack.range.description, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.range);
assert.equal(cp615PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.pack_id);
assert.equal(cp615PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.unit_count);
assert.equal(cp615PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.first_unit_id);
assert.equal(cp615PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.last_unit_id);
assert.equal(cp615PlanPack.range.description, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.range);
assert.equal(cp616PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.pack_id);
assert.equal(cp616PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.unit_count);
assert.equal(cp616PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.first_unit_id);
assert.equal(cp616PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.last_unit_id);
assert.equal(cp616PlanPack.range.description, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.range);
assert.equal(cp617PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.pack_id);
assert.equal(cp617PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.unit_count);
assert.equal(cp617PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.first_unit_id);
assert.equal(cp617PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.last_unit_id);
assert.equal(cp617PlanPack.range.description, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.range);
assert.equal(cp618PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.pack_id);
assert.equal(cp618PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.unit_count);
assert.equal(cp618PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.first_unit_id);
assert.equal(cp618PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.last_unit_id);
assert.equal(cp618PlanPack.range.description, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.range);
assert.equal(cp619PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.pack_id);
assert.equal(cp619PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.unit_count);
assert.equal(cp619PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.first_unit_id);
assert.equal(cp619PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.last_unit_id);
assert.equal(cp619PlanPack.range.description, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.range);
assert.equal(cp620PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.pack_id);
assert.equal(cp620PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.unit_count);
assert.equal(cp620PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.first_unit_id);
assert.equal(cp620PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.last_unit_id);
assert.equal(cp620PlanPack.range.description, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.range);
assert.equal(cp621PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.pack_id);
assert.equal(cp621PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.unit_count);
assert.equal(cp621PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.first_unit_id);
assert.equal(cp621PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.last_unit_id);
assert.equal(cp621PlanPack.range.description, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.range);
assert.equal(cp622PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.pack_id);
assert.equal(cp622PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.unit_count);
assert.equal(cp622PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.first_unit_id);
assert.equal(cp622PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.last_unit_id);
assert.equal(cp622PlanPack.range.description, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.range);
assert.equal(cp623PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.pack_id);
assert.equal(cp623PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.unit_count);
assert.equal(cp623PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.first_unit_id);
assert.equal(cp623PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.last_unit_id);
assert.equal(cp623PlanPack.range.description, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.range);
assert.equal(cp624PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.pack_id);
assert.equal(cp624PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.unit_count);
assert.equal(cp624PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.first_unit_id);
assert.equal(cp624PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.last_unit_id);
assert.equal(cp624PlanPack.range.description, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.range);
assert.equal(cp625PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.pack_id);
assert.equal(cp625PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.unit_count);
assert.equal(cp625PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.first_unit_id);
assert.equal(cp625PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.last_unit_id);
assert.equal(cp625PlanPack.range.description, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.range);
assert.equal(cp626PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.pack_id);
assert.equal(cp626PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.unit_count);
assert.equal(cp626PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.first_unit_id);
assert.equal(cp626PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.last_unit_id);
assert.equal(cp626PlanPack.range.description, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.range);
assert.equal(cp627PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.pack_id);
assert.equal(cp627PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.unit_count);
assert.equal(cp627PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.first_unit_id);
assert.equal(cp627PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.last_unit_id);
assert.equal(cp627PlanPack.range.description, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.range);
assert.equal(cp628PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.pack_id);
assert.equal(cp628PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.unit_count);
assert.equal(cp628PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.first_unit_id);
assert.equal(cp628PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.last_unit_id);
assert.equal(cp628PlanPack.range.description, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.range);
assert.equal(cp629PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.pack_id);
assert.equal(cp629PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.unit_count);
assert.equal(cp629PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.first_unit_id);
assert.equal(cp629PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.last_unit_id);
assert.equal(cp629PlanPack.range.description, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.range);
assert.equal(cp630PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.pack_id);
assert.equal(cp630PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.unit_count);
assert.equal(cp630PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.first_unit_id);
assert.equal(cp630PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.last_unit_id);
assert.equal(cp630PlanPack.range.description, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.range);
assert.equal(cp631PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.pack_id);
assert.equal(cp631PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.unit_count);
assert.equal(cp631PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.first_unit_id);
assert.equal(cp631PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.last_unit_id);
assert.equal(cp631PlanPack.range.description, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.range);
assert.equal(cp632PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.pack_id);
assert.equal(cp632PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.unit_count);
assert.equal(cp632PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.first_unit_id);
assert.equal(cp632PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.last_unit_id);
assert.equal(cp632PlanPack.range.description, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.range);
assert.equal(cp633PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.pack_id);
assert.equal(cp633PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.unit_count);
assert.equal(cp633PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.first_unit_id);
assert.equal(cp633PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.last_unit_id);
assert.equal(cp633PlanPack.range.description, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.range);
assert.equal(cp634PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.pack_id);
assert.equal(cp634PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.unit_count);
assert.equal(cp634PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.first_unit_id);
assert.equal(cp634PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.last_unit_id);
assert.equal(cp634PlanPack.range.description, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.range);
assert.equal(cp635PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.pack_id);
assert.equal(cp635PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.unit_count);
assert.equal(cp635PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.first_unit_id);
assert.equal(cp635PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.last_unit_id);
assert.equal(cp635PlanPack.range.description, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.range);
assert.equal(cp636PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.pack_id);
assert.equal(cp636PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.unit_count);
assert.equal(cp636PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.first_unit_id);
assert.equal(cp636PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.last_unit_id);
assert.equal(cp636PlanPack.range.description, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.range);
assert.equal(cp637PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.pack_id);
assert.equal(cp637PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.unit_count);
assert.equal(cp637PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.first_unit_id);
assert.equal(cp637PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.last_unit_id);
assert.equal(cp637PlanPack.range.description, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.range);
assert.equal(cp638PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.pack_id);
assert.equal(cp638PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.unit_count);
assert.equal(cp638PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.first_unit_id);
assert.equal(cp638PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.last_unit_id);
assert.equal(cp638PlanPack.range.description, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.range);
assert.equal(cp639PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.pack_id);
assert.equal(cp639PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.unit_count);
assert.equal(cp639PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.first_unit_id);
assert.equal(cp639PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.last_unit_id);
assert.equal(cp639PlanPack.range.description, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.range);
assert.equal(cp640PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.pack_id);
assert.equal(cp640PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.unit_count);
assert.equal(cp640PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.first_unit_id);
assert.equal(cp640PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.last_unit_id);
assert.equal(cp640PlanPack.range.description, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.range);
assert.equal(cp641PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.pack_id);
assert.equal(cp641PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.unit_count);
assert.equal(cp641PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.first_unit_id);
assert.equal(cp641PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.last_unit_id);
assert.equal(cp641PlanPack.range.description, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.range);
assert.equal(cp642PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.pack_id);
assert.equal(cp642PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.unit_count);
assert.equal(cp642PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.first_unit_id);
assert.equal(cp642PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.last_unit_id);
assert.equal(cp642PlanPack.range.description, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.range);
assert.equal(cp643PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.pack_id);
assert.equal(cp643PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.unit_count);
assert.equal(cp643PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.first_unit_id);
assert.equal(cp643PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.last_unit_id);
assert.equal(cp643PlanPack.range.description, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.range);
assert.equal(cp644PlanPack.pack_id, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.pack_id);
assert.equal(cp644PlanPack.unit_count, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.unit_count);
assert.equal(cp644PlanPack.range.first_unit_id, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.first_unit_id);
assert.equal(cp644PlanPack.range.last_unit_id, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.last_unit_id);
assert.equal(cp644PlanPack.range.description, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.range);
assert.equal(cp610Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.unit_count);
assert.equal(cp610HermesPacket.hermes_gate, "H20");
assert.equal(cp610HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp610ClaudePacket.claude_gate, "C20");
assert.equal(cp610ClaudePacket.claude_is_final_approval, false);
assert.equal(cp610Handoff.to_pack_id, "CP00-611");
assert.equal(cp610Handoff.next_subphase_id, "RP20.P01.M02.S09");
assert.equal(cp611Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.unit_count);
assert.equal(cp611HermesPacket.hermes_gate, "H20");
assert.equal(cp611HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp611ClaudePacket.claude_gate, "C20");
assert.equal(cp611ClaudePacket.claude_is_final_approval, false);
assert.equal(cp611Handoff.to_pack_id, "CP00-612");
assert.equal(cp611Handoff.next_subphase_id, "RP20.P01.M04.S07");
assert.equal(cp612Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.unit_count);
assert.equal(cp612HermesPacket.hermes_gate, "H20");
assert.equal(cp612HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp612ClaudePacket.claude_gate, "C20");
assert.equal(cp612ClaudePacket.claude_is_final_approval, false);
assert.equal(cp612Handoff.to_pack_id, "CP00-613");
assert.equal(cp612Handoff.next_subphase_id, "RP20.P01.M06.S05");
assert.equal(cp613Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.unit_count);
assert.equal(cp613HermesPacket.hermes_gate, "H20");
assert.equal(cp613HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp613ClaudePacket.claude_gate, "C20");
assert.equal(cp613ClaudePacket.claude_is_final_approval, false);
assert.equal(cp613Handoff.to_pack_id, "CP00-614");
assert.equal(cp613Handoff.next_subphase_id, "RP20.P02.M03.S01");
assert.equal(cp614Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.unit_count);
assert.equal(cp614HermesPacket.hermes_gate, "H20");
assert.equal(cp614HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp614ClaudePacket.claude_gate, "C20");
assert.equal(cp614ClaudePacket.claude_is_final_approval, false);
assert.equal(cp614Handoff.to_pack_id, "CP00-615");
assert.equal(cp614Handoff.next_subphase_id, "RP20.P02.M04.S19");
assert.equal(cp615Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.unit_count);
assert.equal(cp615HermesPacket.hermes_gate, "H20");
assert.equal(cp615HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp615ClaudePacket.claude_gate, "C20");
assert.equal(cp615ClaudePacket.claude_is_final_approval, false);
assert.equal(cp615Handoff.to_pack_id, "CP00-616");
assert.equal(cp615Handoff.next_subphase_id, "RP20.P02.M06.S15");
assert.equal(cp616Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.unit_count);
assert.equal(cp616HermesPacket.hermes_gate, "H20");
assert.equal(cp616HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp616ClaudePacket.claude_gate, "C20");
assert.equal(cp616ClaudePacket.claude_is_final_approval, false);
assert.equal(cp616Handoff.to_pack_id, "CP00-617");
assert.equal(cp616Handoff.next_subphase_id, "RP20.P02.M07.S03");
assert.equal(cp617Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.unit_count);
assert.equal(cp617HermesPacket.hermes_gate, "H20");
assert.equal(cp617HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp617ClaudePacket.claude_gate, "C20");
assert.equal(cp617ClaudePacket.claude_is_final_approval, false);
assert.equal(cp617Handoff.to_pack_id, "CP00-618");
assert.equal(cp617Handoff.next_subphase_id, "RP20.P02.M07.S13");
assert.equal(cp618Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.unit_count);
assert.equal(cp618HermesPacket.hermes_gate, "H20");
assert.equal(cp618HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp618ClaudePacket.claude_gate, "C20");
assert.equal(cp618ClaudePacket.claude_is_final_approval, false);
assert.equal(cp618Handoff.to_pack_id, "CP00-619");
assert.equal(cp618Handoff.next_subphase_id, "RP20.P02.M09.S09");
assert.equal(cp619Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.unit_count);
assert.equal(cp619HermesPacket.hermes_gate, "H20");
assert.equal(cp619HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp619ClaudePacket.claude_gate, "C20");
assert.equal(cp619ClaudePacket.claude_is_final_approval, false);
assert.equal(cp619Handoff.to_pack_id, "CP00-620");
assert.equal(cp619Handoff.next_subphase_id, "RP20.P03.M06.S13");
assert.equal(cp620Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.unit_count);
assert.equal(cp620HermesPacket.hermes_gate, "H20");
assert.equal(cp620HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp620ClaudePacket.claude_gate, "C20");
assert.equal(cp620ClaudePacket.claude_is_final_approval, false);
assert.equal(cp620Handoff.to_pack_id, "CP00-621");
assert.equal(cp620Handoff.next_subphase_id, "RP20.P04.M04.S01");
assert.equal(cp621Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.unit_count);
assert.equal(cp621HermesPacket.hermes_gate, "H20");
assert.equal(cp621HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp621ClaudePacket.claude_gate, "C20");
assert.equal(cp621ClaudePacket.claude_is_final_approval, false);
assert.equal(cp621Handoff.to_pack_id, "CP00-622");
assert.equal(cp621Handoff.next_subphase_id, "RP20.P05.M01.S01");
assert.equal(cp622Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.unit_count);
assert.equal(cp622HermesPacket.hermes_gate, "H20");
assert.equal(cp622HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp622ClaudePacket.claude_gate, "C20");
assert.equal(cp622ClaudePacket.claude_is_final_approval, false);
assert.equal(cp622Handoff.to_pack_id, "CP00-623");
assert.equal(cp622Handoff.next_subphase_id, "RP20.P05.M01.S11");
assert.equal(cp623Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.unit_count);
assert.equal(cp623HermesPacket.hermes_gate, "H20");
assert.equal(cp623HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp623ClaudePacket.claude_gate, "C20");
assert.equal(cp623ClaudePacket.claude_is_final_approval, false);
assert.equal(cp623Handoff.to_pack_id, "CP00-624");
assert.equal(cp623Handoff.next_subphase_id, "RP20.P05.M02.S01");
assert.equal(cp624Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.unit_count);
assert.equal(cp624HermesPacket.hermes_gate, "H20");
assert.equal(cp624HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp624ClaudePacket.claude_gate, "C20");
assert.equal(cp624ClaudePacket.claude_is_final_approval, false);
assert.equal(cp624Handoff.to_pack_id, "CP00-625");
assert.equal(cp624Handoff.next_subphase_id, "RP20.P05.M02.S11");
assert.equal(cp625Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.unit_count);
assert.equal(cp625HermesPacket.hermes_gate, "H20");
assert.equal(cp625HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp625ClaudePacket.claude_gate, "C20");
assert.equal(cp625ClaudePacket.claude_is_final_approval, false);
assert.equal(cp625Handoff.to_pack_id, "CP00-626");
assert.equal(cp625Handoff.next_subphase_id, "RP20.P05.M03.S01");
assert.equal(cp626Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.unit_count);
assert.equal(cp626HermesPacket.hermes_gate, "H20");
assert.equal(cp626HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp626ClaudePacket.claude_gate, "C20");
assert.equal(cp626ClaudePacket.claude_is_final_approval, false);
assert.equal(cp626Handoff.to_pack_id, "CP00-627");
assert.equal(cp626Handoff.next_subphase_id, "RP20.P05.M03.S11");
assert.equal(cp627Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.unit_count);
assert.equal(cp627HermesPacket.hermes_gate, "H20");
assert.equal(cp627HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp627ClaudePacket.claude_gate, "C20");
assert.equal(cp627ClaudePacket.claude_is_final_approval, false);
assert.equal(cp627Handoff.to_pack_id, "CP00-628");
assert.equal(cp627Handoff.next_subphase_id, "RP20.P05.M03.S21");
assert.equal(cp628Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.unit_count);
assert.equal(cp628HermesPacket.hermes_gate, "H20");
assert.equal(cp628HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp628ClaudePacket.claude_gate, "C20");
assert.equal(cp628ClaudePacket.claude_is_final_approval, false);
assert.equal(cp628Handoff.to_pack_id, "CP00-629");
assert.equal(cp628Handoff.next_subphase_id, "RP20.P05.M05.S17");
assert.equal(cp629Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.unit_count);
assert.equal(cp629HermesPacket.hermes_gate, "H20");
assert.equal(cp629HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp629ClaudePacket.claude_gate, "C20");
assert.equal(cp629ClaudePacket.claude_is_final_approval, false);
assert.equal(cp629Handoff.to_pack_id, "CP00-630");
assert.equal(cp629Handoff.next_subphase_id, "RP20.P05.M06.S05");
assert.equal(cp630Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.unit_count);
assert.equal(cp630HermesPacket.hermes_gate, "H20");
assert.equal(cp630HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp630ClaudePacket.claude_gate, "C20");
assert.equal(cp630ClaudePacket.claude_is_final_approval, false);
assert.equal(cp630Handoff.to_pack_id, "CP00-631");
assert.equal(cp630Handoff.next_subphase_id, "RP20.P06.M02.S19");
assert.equal(cp631Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.unit_count);
assert.equal(cp631HermesPacket.hermes_gate, "H20");
assert.equal(cp631HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp631ClaudePacket.claude_gate, "C20");
assert.equal(cp631ClaudePacket.claude_is_final_approval, false);
assert.equal(cp631Handoff.to_pack_id, "CP00-632");
assert.equal(cp631Handoff.next_subphase_id, "RP20.P06.M04.S15");
assert.equal(cp632Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.unit_count);
assert.equal(cp632HermesPacket.hermes_gate, "H20");
assert.equal(cp632HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp632ClaudePacket.claude_gate, "C20");
assert.equal(cp632ClaudePacket.claude_is_final_approval, false);
assert.equal(cp632Handoff.to_pack_id, "CP00-633");
assert.equal(cp632Handoff.next_subphase_id, "RP20.P06.M05.S03");
assert.equal(cp633Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.unit_count);
assert.equal(cp633HermesPacket.hermes_gate, "H20");
assert.equal(cp633HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp633ClaudePacket.claude_gate, "C20");
assert.equal(cp633ClaudePacket.claude_is_final_approval, false);
assert.equal(cp633Handoff.to_pack_id, "CP00-634");
assert.equal(cp633Handoff.next_subphase_id, "RP20.P06.M05.S13");
assert.equal(cp634Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.unit_count);
assert.equal(cp634HermesPacket.hermes_gate, "H20");
assert.equal(cp634HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp634ClaudePacket.claude_gate, "C20");
assert.equal(cp634ClaudePacket.claude_is_final_approval, false);
assert.equal(cp634Handoff.to_pack_id, "CP00-635");
assert.equal(cp634Handoff.next_subphase_id, "RP20.P06.M06.S01");
assert.equal(cp635Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.unit_count);
assert.equal(cp635HermesPacket.hermes_gate, "H20");
assert.equal(cp635HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp635ClaudePacket.claude_gate, "C20");
assert.equal(cp635ClaudePacket.claude_is_final_approval, false);
assert.equal(cp635Handoff.to_pack_id, "CP00-636");
assert.equal(cp635Handoff.next_subphase_id, "RP20.P06.M06.S11");
assert.equal(cp636Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.unit_count);
assert.equal(cp636HermesPacket.hermes_gate, "H20");
assert.equal(cp636HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp636ClaudePacket.claude_gate, "C20");
assert.equal(cp636ClaudePacket.claude_is_final_approval, false);
assert.equal(cp636Handoff.to_pack_id, "CP00-637");
assert.equal(cp636Handoff.next_subphase_id, "RP20.P07.M02.S13");
assert.equal(cp637Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.unit_count);
assert.equal(cp637HermesPacket.hermes_gate, "H20");
assert.equal(cp637HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp637ClaudePacket.claude_gate, "C20");
assert.equal(cp637ClaudePacket.claude_is_final_approval, false);
assert.equal(cp637Handoff.to_pack_id, "CP00-638");
assert.equal(cp637Handoff.next_subphase_id, "RP20.P07.M04.S09");
assert.equal(cp638Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.unit_count);
assert.equal(cp638HermesPacket.hermes_gate, "H20");
assert.equal(cp638HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp638ClaudePacket.claude_gate, "C20");
assert.equal(cp638ClaudePacket.claude_is_final_approval, false);
assert.equal(cp638Handoff.to_pack_id, "CP00-639");
assert.equal(cp638Handoff.next_subphase_id, "RP20.P07.M06.S05");
assert.equal(cp639Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.unit_count);
assert.equal(cp639HermesPacket.hermes_gate, "H20");
assert.equal(cp639HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp639ClaudePacket.claude_gate, "C20");
assert.equal(cp639ClaudePacket.claude_is_final_approval, false);
assert.equal(cp639Handoff.to_pack_id, "CP00-640");
assert.equal(cp639Handoff.next_subphase_id, "RP20.P08.M02.S17");
assert.equal(cp640Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.unit_count);
assert.equal(cp640HermesPacket.hermes_gate, "H20");
assert.equal(cp640HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp640ClaudePacket.claude_gate, "C20");
assert.equal(cp640ClaudePacket.claude_is_final_approval, false);
assert.equal(cp640Handoff.to_pack_id, "CP00-641");
assert.equal(cp640Handoff.next_subphase_id, "RP20.P08.M04.S15");
assert.equal(cp641Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.unit_count);
assert.equal(cp641HermesPacket.hermes_gate, "H20");
assert.equal(cp641HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp641ClaudePacket.claude_gate, "C20");
assert.equal(cp641ClaudePacket.claude_is_final_approval, false);
assert.equal(cp641Handoff.to_pack_id, "CP00-642");
assert.equal(cp641Handoff.next_subphase_id, "RP20.P08.M06.S11");
assert.equal(cp642Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.unit_count);
assert.equal(cp642HermesPacket.hermes_gate, "H20");
assert.equal(cp642HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp642ClaudePacket.claude_gate, "C20");
assert.equal(cp642ClaudePacket.claude_is_final_approval, false);
assert.equal(cp642Handoff.to_pack_id, "CP00-643");
assert.equal(cp642Handoff.next_subphase_id, "RP20.P08.M06.S21");
assert.equal(cp643Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.unit_count);
assert.equal(cp643HermesPacket.hermes_gate, "H20");
assert.equal(cp643HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp643ClaudePacket.claude_gate, "C20");
assert.equal(cp643ClaudePacket.claude_is_final_approval, false);
assert.equal(cp643Handoff.to_pack_id, "CP00-644");
assert.equal(cp643Handoff.next_subphase_id, "RP20.P09.M04.S13");
assert.equal(cp644Validation.coverage.covered_units, DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.unit_count);
assert.equal(cp644HermesPacket.hermes_gate, "H20");
assert.equal(cp644HermesPacket.emits_hermes_runtime_receipt, false);
assert.equal(cp644ClaudePacket.claude_gate, "C20");
assert.equal(cp644ClaudePacket.claude_is_final_approval, false);
assert.equal(cp644Handoff.to_pack_id, "CP00-645");
assert.equal(cp644Handoff.next_subphase_id, "RP21.P00.M00.S01");

console.log(
  JSON.stringify(
    {
      validator: "rp20:data-room-vdr-core:validate",
      pack_id: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.pack_id,
      covered_units: cp644Validation.coverage.covered_units,
      section_count: cp644Validation.coverage.section_count,
      next_pack_id: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.next_pack_id,
      historical_pack_ids_validated: [
        DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.pack_id,
        DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.pack_id,
      ],
      production_ready_candidate: cp644Validation.production_ready_candidate,
      runtime_opened: false,
    },
    null,
    2,
  ),
);
