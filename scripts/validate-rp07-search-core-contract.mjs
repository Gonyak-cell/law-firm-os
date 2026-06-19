#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  SEARCH_CORE_CP235_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP235_PACK_BINDING,
  SEARCH_CORE_CP235_REQUIREMENTS,
  SEARCH_CORE_CP236_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP236_PACK_BINDING,
  SEARCH_CORE_CP236_REQUIREMENTS,
  SEARCH_CORE_CP237_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP237_PACK_BINDING,
  SEARCH_CORE_CP237_REQUIREMENTS,
  SEARCH_CORE_CP238_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP238_PACK_BINDING,
  SEARCH_CORE_CP238_REQUIREMENTS,
  SEARCH_CORE_CP239_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP239_PACK_BINDING,
  SEARCH_CORE_CP239_REQUIREMENTS,
  SEARCH_CORE_CP240_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP240_PACK_BINDING,
  SEARCH_CORE_CP240_REQUIREMENTS,
  SEARCH_CORE_CP241_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP241_PACK_BINDING,
  SEARCH_CORE_CP241_REQUIREMENTS,
  SEARCH_CORE_CP242_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP242_PACK_BINDING,
  SEARCH_CORE_CP242_REQUIREMENTS,
  SEARCH_CORE_CP243_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP243_PACK_BINDING,
  SEARCH_CORE_CP243_REQUIREMENTS,
  SEARCH_CORE_CP244_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP244_PACK_BINDING,
  SEARCH_CORE_CP244_REQUIREMENTS,
  SEARCH_CORE_CP245_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP245_PACK_BINDING,
  SEARCH_CORE_CP245_REQUIREMENTS,
  SEARCH_CORE_CP246_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP246_PACK_BINDING,
  SEARCH_CORE_CP246_REQUIREMENTS,
  SEARCH_CORE_CP247_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP247_PACK_BINDING,
  SEARCH_CORE_CP247_REQUIREMENTS,
  SEARCH_CORE_CP248_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP248_PACK_BINDING,
  SEARCH_CORE_CP248_REQUIREMENTS,
  SEARCH_CORE_CP249_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP249_PACK_BINDING,
  SEARCH_CORE_CP249_REQUIREMENTS,
  SEARCH_CORE_CP250_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP250_PACK_BINDING,
  SEARCH_CORE_CP250_REQUIREMENTS,
  SEARCH_CORE_CP251_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP251_PACK_BINDING,
  SEARCH_CORE_CP251_REQUIREMENTS,
  SEARCH_CORE_CP252_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP252_PACK_BINDING,
  SEARCH_CORE_CP252_REQUIREMENTS,
  SEARCH_CORE_CP253_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP253_PACK_BINDING,
  SEARCH_CORE_CP253_REQUIREMENTS,
  SEARCH_CORE_CP254_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP254_PACK_BINDING,
  SEARCH_CORE_CP254_REQUIREMENTS,
  SEARCH_CORE_CP255_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP255_PACK_BINDING,
  SEARCH_CORE_CP255_REQUIREMENTS,
  SEARCH_CORE_CP256_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP256_PACK_BINDING,
  SEARCH_CORE_CP256_REQUIREMENTS,
  SEARCH_CORE_CP257_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP257_PACK_BINDING,
  SEARCH_CORE_CP257_REQUIREMENTS,
  SEARCH_CORE_CP258_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP258_PACK_BINDING,
  SEARCH_CORE_CP258_REQUIREMENTS,
  SEARCH_CORE_CP259_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP259_PACK_BINDING,
  SEARCH_CORE_CP259_REQUIREMENTS,
  SEARCH_CORE_CP260_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP260_PACK_BINDING,
  SEARCH_CORE_CP260_REQUIREMENTS,
  SEARCH_CORE_CP261_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP261_PACK_BINDING,
  SEARCH_CORE_CP261_REQUIREMENTS,
  SEARCH_CORE_CP262_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP262_PACK_BINDING,
  SEARCH_CORE_CP262_REQUIREMENTS,
  SEARCH_CORE_CP263_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP263_PACK_BINDING,
  SEARCH_CORE_CP263_REQUIREMENTS,
  SEARCH_CORE_CP264_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP264_PACK_BINDING,
  SEARCH_CORE_CP264_REQUIREMENTS,
  SEARCH_CORE_CP265_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP265_PACK_BINDING,
  SEARCH_CORE_CP265_REQUIREMENTS,
  SEARCH_CORE_CP266_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP266_PACK_BINDING,
  SEARCH_CORE_CP266_REQUIREMENTS,
  SEARCH_CORE_CP267_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP267_PACK_BINDING,
  SEARCH_CORE_CP267_REQUIREMENTS,
  SEARCH_CORE_CP268_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP268_PACK_BINDING,
  SEARCH_CORE_CP268_REQUIREMENTS,
  SEARCH_CORE_CP269_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP269_PACK_BINDING,
  SEARCH_CORE_CP269_REQUIREMENTS,
  SEARCH_CORE_CP270_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP270_PACK_BINDING,
  SEARCH_CORE_CP270_REQUIREMENTS,
  SEARCH_CORE_CP271_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP271_PACK_BINDING,
  SEARCH_CORE_CP271_REQUIREMENTS,
  SEARCH_CORE_PROGRAM_CONTRACT,
  createSearchCoreCp235ClaudeReviewPacket,
  createSearchCoreCp235CloseoutHandoff,
  createSearchCoreCp235HermesEvidencePacket,
  createSearchCoreCp235ScopeContractFoundationCaseSet,
  createSearchCoreCp235ScopeContractFoundationDescriptor,
  createSearchCoreCp236ClaudeReviewPacket,
  createSearchCoreCp236CloseoutHandoff,
  createSearchCoreCp236HermesEvidencePacket,
  createSearchCoreCp236ModelStorageSliceCaseSet,
  createSearchCoreCp236ModelStorageSliceDescriptor,
  createSearchCoreCp237ClaudeReviewPacket,
  createSearchCoreCp237CloseoutHandoff,
  createSearchCoreCp237HermesEvidencePacket,
  createSearchCoreCp237ModelBindingSliceCaseSet,
  createSearchCoreCp237ModelBindingSliceDescriptor,
  createSearchCoreCp238ClaudeReviewPacket,
  createSearchCoreCp238CloseoutHandoff,
  createSearchCoreCp238HermesEvidencePacket,
  createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet,
  createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor,
  createSearchCoreCp239ClaudeReviewPacket,
  createSearchCoreCp239CloseoutHandoff,
  createSearchCoreCp239HermesEvidencePacket,
  createSearchCoreCp239ServiceSliceCaseSet,
  createSearchCoreCp239ServiceSliceDescriptor,
  createSearchCoreCp240ClaudeReviewPacket,
  createSearchCoreCp240CloseoutHandoff,
  createSearchCoreCp240HermesEvidencePacket,
  createSearchCoreCp240ServiceWorkflowTailCaseSet,
  createSearchCoreCp240ServiceWorkflowTailDescriptor,
  createSearchCoreCp241ClaudeReviewPacket,
  createSearchCoreCp241CloseoutHandoff,
  createSearchCoreCp241HermesEvidencePacket,
  createSearchCoreCp241ServiceAuditBindingCaseSet,
  createSearchCoreCp241ServiceAuditBindingDescriptor,
  createSearchCoreCp242ClaudeReviewPacket,
  createSearchCoreCp242CloseoutHandoff,
  createSearchCoreCp242HermesEvidencePacket,
  createSearchCoreCp242ServiceBindingMidCaseSet,
  createSearchCoreCp242ServiceBindingMidDescriptor,
  createSearchCoreCp243ClaudeReviewPacket,
  createSearchCoreCp243CloseoutHandoff,
  createSearchCoreCp243HermesEvidencePacket,
  createSearchCoreCp243ServiceFixtureHeadCaseSet,
  createSearchCoreCp243ServiceFixtureHeadDescriptor,
  createSearchCoreCp244ClaudeReviewPacket,
  createSearchCoreCp244CloseoutHandoff,
  createSearchCoreCp244HermesEvidencePacket,
  createSearchCoreCp244ServiceFixtureMidCaseSet,
  createSearchCoreCp244ServiceFixtureMidDescriptor,
  createSearchCoreCp245ClaudeReviewPacket,
  createSearchCoreCp245CloseoutHandoff,
  createSearchCoreCp245HermesEvidencePacket,
  createSearchCoreCp245ServiceGoldenHeadCaseSet,
  createSearchCoreCp245ServiceGoldenHeadDescriptor,
  createSearchCoreCp246ClaudeReviewPacket,
  createSearchCoreCp246CloseoutHandoff,
  createSearchCoreCp246GoldenHermesSliceCaseSet,
  createSearchCoreCp246GoldenHermesSliceDescriptor,
  createSearchCoreCp246HermesEvidencePacket,
  createSearchCoreCp247ClaudeReviewPacket,
  createSearchCoreCp247CloseoutHandoff,
  createSearchCoreCp247HermesEvidencePacket,
  createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet,
  createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor,
  createSearchCoreCp248ClaudeReviewPacket,
  createSearchCoreCp248CloseoutHandoff,
  createSearchCoreCp248HermesEvidencePacket,
  createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet,
  createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor,
  createSearchCoreCp249ClaudeReviewPacket,
  createSearchCoreCp249CloseoutHandoff,
  createSearchCoreCp249HermesEvidencePacket,
  createSearchCoreCp249UiSliceMidCaseSet,
  createSearchCoreCp249UiSliceMidDescriptor,
  createSearchCoreCp250ClaudeReviewPacket,
  createSearchCoreCp250CloseoutHandoff,
  createSearchCoreCp250HermesEvidencePacket,
  createSearchCoreCp250UiWorkflowSliceCaseSet,
  createSearchCoreCp250UiWorkflowSliceDescriptor,
  createSearchCoreCp251ClaudeReviewPacket,
  createSearchCoreCp251CloseoutHandoff,
  createSearchCoreCp251HermesEvidencePacket,
  createSearchCoreCp251UiBindingTailCaseSet,
  createSearchCoreCp251UiBindingTailDescriptor,
  createSearchCoreCp252ClaudeReviewPacket,
  createSearchCoreCp252CloseoutHandoff,
  createSearchCoreCp252HermesEvidencePacket,
  createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet,
  createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor,
  createSearchCoreCp253ClaudeReviewPacket,
  createSearchCoreCp253CloseoutHandoff,
  createSearchCoreCp253FixtureSliceCaseSet,
  createSearchCoreCp253FixtureSliceDescriptor,
  createSearchCoreCp253HermesEvidencePacket,
  createSearchCoreCp254ClaudeReviewPacket,
  createSearchCoreCp254CloseoutHandoff,
  createSearchCoreCp254FixtureBindingSliceCaseSet,
  createSearchCoreCp254FixtureBindingSliceDescriptor,
  createSearchCoreCp254HermesEvidencePacket,
  createSearchCoreCp255ClaudeReviewPacket,
  createSearchCoreCp255CloseoutHandoff,
  createSearchCoreCp255FixtureSetMidCaseSet,
  createSearchCoreCp255FixtureSetMidDescriptor,
  createSearchCoreCp255HermesEvidencePacket,
  createSearchCoreCp256ClaudeReviewPacket,
  createSearchCoreCp256CloseoutHandoff,
  createSearchCoreCp256HermesEvidencePacket,
  createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet,
  createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor,
  createSearchCoreCp257ClaudeReviewPacket,
  createSearchCoreCp257CloseoutHandoff,
  createSearchCoreCp257HermesEvidencePacket,
  createSearchCoreCp257PermissionSliceHeadCaseSet,
  createSearchCoreCp257PermissionSliceHeadDescriptor,
  createSearchCoreCp258ClaudeReviewPacket,
  createSearchCoreCp258CloseoutHandoff,
  createSearchCoreCp258HermesEvidencePacket,
  createSearchCoreCp258PermissionWorkflowSliceCaseSet,
  createSearchCoreCp258PermissionWorkflowSliceDescriptor,
  createSearchCoreCp259ClaudeReviewPacket,
  createSearchCoreCp259CloseoutHandoff,
  createSearchCoreCp259HermesEvidencePacket,
  createSearchCoreCp259PermissionBindingSliceCaseSet,
  createSearchCoreCp259PermissionBindingSliceDescriptor,
  createSearchCoreCp260ClaudeReviewPacket,
  createSearchCoreCp260CloseoutHandoff,
  createSearchCoreCp260HermesEvidencePacket,
  createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet,
  createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor,
  createSearchCoreCp261ClaudeReviewPacket,
  createSearchCoreCp261CloseoutHandoff,
  createSearchCoreCp261FailureSliceCaseSet,
  createSearchCoreCp261FailureSliceDescriptor,
  createSearchCoreCp261HermesEvidencePacket,
  createSearchCoreCp262ClaudeReviewPacket,
  createSearchCoreCp262CloseoutHandoff,
  createSearchCoreCp262FailureBindingSliceCaseSet,
  createSearchCoreCp262FailureBindingSliceDescriptor,
  createSearchCoreCp262HermesEvidencePacket,
  createSearchCoreCp263ClaudeReviewPacket,
  createSearchCoreCp263CloseoutHandoff,
  createSearchCoreCp263FailureBindingTailCaseSet,
  createSearchCoreCp263FailureBindingTailDescriptor,
  createSearchCoreCp263HermesEvidencePacket,
  createSearchCoreCp264ClaudeReviewPacket,
  createSearchCoreCp264CloseoutHandoff,
  createSearchCoreCp264HermesEvidencePacket,
  createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet,
  createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor,
  createSearchCoreCp265ClaudeReviewPacket,
  createSearchCoreCp265CloseoutHandoff,
  createSearchCoreCp265HermesEvidencePacket,
  createSearchCoreCp265HermesSliceCaseSet,
  createSearchCoreCp265HermesSliceDescriptor,
  createSearchCoreCp266ClaudeReviewPacket,
  createSearchCoreCp266CloseoutHandoff,
  createSearchCoreCp266HermesBindingSliceCaseSet,
  createSearchCoreCp266HermesBindingSliceDescriptor,
  createSearchCoreCp266HermesEvidencePacket,
  createSearchCoreCp267ClaudeReviewPacket,
  createSearchCoreCp267CloseoutHandoff,
  createSearchCoreCp267HermesEvidencePacket,
  createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet,
  createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor,
  createSearchCoreCp268ClaudeReviewPacket,
  createSearchCoreCp268CloseoutHandoff,
  createSearchCoreCp268HermesEvidencePacket,
  createSearchCoreCp268ReviewSliceCaseSet,
  createSearchCoreCp268ReviewSliceDescriptor,
  createSearchCoreCp269ClaudeReviewPacket,
  createSearchCoreCp269CloseoutHandoff,
  createSearchCoreCp269HermesEvidencePacket,
  createSearchCoreCp269ReviewBindingMidCaseSet,
  createSearchCoreCp269ReviewBindingMidDescriptor,
  createSearchCoreCp270ClaudeReviewPacket,
  createSearchCoreCp270CloseoutHandoff,
  createSearchCoreCp270HermesEvidencePacket,
  createSearchCoreCp270ReviewBindingTailCaseSet,
  createSearchCoreCp270ReviewBindingTailDescriptor,
  createSearchCoreCp271ClaudeReviewPacket,
  createSearchCoreCp271CloseoutHandoff,
  createSearchCoreCp271HermesEvidencePacket,
  createSearchCoreCp271P09CloseoutCaseSet,
  createSearchCoreCp271P09CloseoutDescriptor,
  searchCoreRowKey,
  validateSearchCoreCp235Coverage,
  validateSearchCoreCp235ScopeContractFoundationDescriptor,
  validateSearchCoreCp236Coverage,
  validateSearchCoreCp236ModelStorageSliceDescriptor,
  validateSearchCoreCp237Coverage,
  validateSearchCoreCp237ModelBindingSliceDescriptor,
  validateSearchCoreCp238Coverage,
  validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor,
  validateSearchCoreCp239Coverage,
  validateSearchCoreCp239ServiceSliceDescriptor,
  validateSearchCoreCp240Coverage,
  validateSearchCoreCp240ServiceWorkflowTailDescriptor,
  validateSearchCoreCp241Coverage,
  validateSearchCoreCp241ServiceAuditBindingDescriptor,
  validateSearchCoreCp242Coverage,
  validateSearchCoreCp242ServiceBindingMidDescriptor,
  validateSearchCoreCp243Coverage,
  validateSearchCoreCp243ServiceFixtureHeadDescriptor,
  validateSearchCoreCp244Coverage,
  validateSearchCoreCp244ServiceFixtureMidDescriptor,
  validateSearchCoreCp245Coverage,
  validateSearchCoreCp245ServiceGoldenHeadDescriptor,
  validateSearchCoreCp246Coverage,
  validateSearchCoreCp246GoldenHermesSliceDescriptor,
  validateSearchCoreCp247Coverage,
  validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor,
  validateSearchCoreCp248Coverage,
  validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor,
  validateSearchCoreCp249Coverage,
  validateSearchCoreCp249UiSliceMidDescriptor,
  validateSearchCoreCp250Coverage,
  validateSearchCoreCp250UiWorkflowSliceDescriptor,
  validateSearchCoreCp251Coverage,
  validateSearchCoreCp251UiBindingTailDescriptor,
  validateSearchCoreCp252Coverage,
  validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor,
  validateSearchCoreCp253Coverage,
  validateSearchCoreCp253FixtureSliceDescriptor,
  validateSearchCoreCp254Coverage,
  validateSearchCoreCp254FixtureBindingSliceDescriptor,
  validateSearchCoreCp255Coverage,
  validateSearchCoreCp255FixtureSetMidDescriptor,
  validateSearchCoreCp256Coverage,
  validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor,
  validateSearchCoreCp257Coverage,
  validateSearchCoreCp257PermissionSliceHeadDescriptor,
  validateSearchCoreCp258Coverage,
  validateSearchCoreCp258PermissionWorkflowSliceDescriptor,
  validateSearchCoreCp259Coverage,
  validateSearchCoreCp259PermissionBindingSliceDescriptor,
  validateSearchCoreCp260Coverage,
  validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor,
  validateSearchCoreCp261Coverage,
  validateSearchCoreCp261FailureSliceDescriptor,
  validateSearchCoreCp262Coverage,
  validateSearchCoreCp262FailureBindingSliceDescriptor,
  validateSearchCoreCp263Coverage,
  validateSearchCoreCp263FailureBindingTailDescriptor,
  validateSearchCoreCp264Coverage,
  validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor,
  validateSearchCoreCp265Coverage,
  validateSearchCoreCp265HermesSliceDescriptor,
  validateSearchCoreCp266Coverage,
  validateSearchCoreCp266HermesBindingSliceDescriptor,
  validateSearchCoreCp267Coverage,
  validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor,
  validateSearchCoreCp268Coverage,
  validateSearchCoreCp268ReviewSliceDescriptor,
  validateSearchCoreCp269Coverage,
  validateSearchCoreCp269ReviewBindingMidDescriptor,
  validateSearchCoreCp270Coverage,
  validateSearchCoreCp270ReviewBindingTailDescriptor,
  validateSearchCoreCp271Coverage,
  validateSearchCoreCp271P09CloseoutDescriptor,
} from "../packages/search/src/index.js";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch {
    return null;
  }
}

const searchContract = await readJson("../contracts/search-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp235Manifest = await readOptionalJson("../docs/closeout-packs/cp00-235/manifest.json");
const cp236Manifest = await readOptionalJson("../docs/closeout-packs/cp00-236/manifest.json");
const cp237Manifest = await readOptionalJson("../docs/closeout-packs/cp00-237/manifest.json");
const cp238Manifest = await readOptionalJson("../docs/closeout-packs/cp00-238/manifest.json");
const cp239Manifest = await readOptionalJson("../docs/closeout-packs/cp00-239/manifest.json");
const cp240Manifest = await readOptionalJson("../docs/closeout-packs/cp00-240/manifest.json");
const cp241Manifest = await readOptionalJson("../docs/closeout-packs/cp00-241/manifest.json");
const cp242Manifest = await readOptionalJson("../docs/closeout-packs/cp00-242/manifest.json");
const cp243Manifest = await readOptionalJson("../docs/closeout-packs/cp00-243/manifest.json");
const cp244Manifest = await readOptionalJson("../docs/closeout-packs/cp00-244/manifest.json");
const cp245Manifest = await readOptionalJson("../docs/closeout-packs/cp00-245/manifest.json");
const cp246Manifest = await readOptionalJson("../docs/closeout-packs/cp00-246/manifest.json");
const cp247Manifest = await readOptionalJson("../docs/closeout-packs/cp00-247/manifest.json");
const cp248Manifest = await readOptionalJson("../docs/closeout-packs/cp00-248/manifest.json");
const cp249Manifest = await readOptionalJson("../docs/closeout-packs/cp00-249/manifest.json");
const cp250Manifest = await readOptionalJson("../docs/closeout-packs/cp00-250/manifest.json");
const cp251Manifest = await readOptionalJson("../docs/closeout-packs/cp00-251/manifest.json");
const cp252Manifest = await readOptionalJson("../docs/closeout-packs/cp00-252/manifest.json");
const cp253Manifest = await readOptionalJson("../docs/closeout-packs/cp00-253/manifest.json");
const cp254Manifest = await readOptionalJson("../docs/closeout-packs/cp00-254/manifest.json");
const cp255Manifest = await readOptionalJson("../docs/closeout-packs/cp00-255/manifest.json");
const cp256Manifest = await readOptionalJson("../docs/closeout-packs/cp00-256/manifest.json");
const cp257Manifest = await readOptionalJson("../docs/closeout-packs/cp00-257/manifest.json");
const cp258Manifest = await readOptionalJson("../docs/closeout-packs/cp00-258/manifest.json");
const cp259Manifest = await readOptionalJson("../docs/closeout-packs/cp00-259/manifest.json");
const cp260Manifest = await readOptionalJson("../docs/closeout-packs/cp00-260/manifest.json");
const cp261Manifest = await readOptionalJson("../docs/closeout-packs/cp00-261/manifest.json");
const cp262Manifest = await readOptionalJson("../docs/closeout-packs/cp00-262/manifest.json");
const cp263Manifest = await readOptionalJson("../docs/closeout-packs/cp00-263/manifest.json");
const cp264Manifest = await readOptionalJson("../docs/closeout-packs/cp00-264/manifest.json");
const cp265Manifest = await readOptionalJson("../docs/closeout-packs/cp00-265/manifest.json");
const cp266Manifest = await readOptionalJson("../docs/closeout-packs/cp00-266/manifest.json");
const cp267Manifest = await readOptionalJson("../docs/closeout-packs/cp00-267/manifest.json");
const cp268Manifest = await readOptionalJson("../docs/closeout-packs/cp00-268/manifest.json");
const cp269Manifest = await readOptionalJson("../docs/closeout-packs/cp00-269/manifest.json");
const cp270Manifest = await readOptionalJson("../docs/closeout-packs/cp00-270/manifest.json");
const cp271Manifest = await readOptionalJson("../docs/closeout-packs/cp00-271/manifest.json");
const cp235PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-235") ?? cp235Manifest?.plan_binding_snapshot;
const cp236PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-236") ?? cp236Manifest?.plan_binding_snapshot;
const cp237PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-237") ?? cp237Manifest?.plan_binding_snapshot;
const cp238PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-238") ?? cp238Manifest?.plan_binding_snapshot;
const cp239PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-239") ?? cp239Manifest?.plan_binding_snapshot;
const cp240PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-240") ?? cp240Manifest?.plan_binding_snapshot;
const cp241PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-241") ?? cp241Manifest?.plan_binding_snapshot;
const cp242PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-242") ?? cp242Manifest?.plan_binding_snapshot;
const cp243PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-243") ?? cp243Manifest?.plan_binding_snapshot;
const cp244PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-244") ?? cp244Manifest?.plan_binding_snapshot;
const cp245PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-245") ?? cp245Manifest?.plan_binding_snapshot;
const cp246PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-246") ?? cp246Manifest?.plan_binding_snapshot;
const cp247PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-247") ?? cp247Manifest?.plan_binding_snapshot;
const cp248PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-248") ?? cp248Manifest?.plan_binding_snapshot;
const cp249PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-249") ?? cp249Manifest?.plan_binding_snapshot;
const cp250PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-250") ?? cp250Manifest?.plan_binding_snapshot;
const cp251PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-251") ?? cp251Manifest?.plan_binding_snapshot;
const cp252PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-252") ?? cp252Manifest?.plan_binding_snapshot;
const cp253PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-253") ?? cp253Manifest?.plan_binding_snapshot;
const cp254PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-254") ?? cp254Manifest?.plan_binding_snapshot;
const cp255PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-255") ?? cp255Manifest?.plan_binding_snapshot;
const cp256PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-256") ?? cp256Manifest?.plan_binding_snapshot;
const cp257PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-257") ?? cp257Manifest?.plan_binding_snapshot;
const cp258PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-258") ?? cp258Manifest?.plan_binding_snapshot;
const cp259PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-259") ?? cp259Manifest?.plan_binding_snapshot;
const cp260PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-260") ?? cp260Manifest?.plan_binding_snapshot;
const cp261PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-261") ?? cp261Manifest?.plan_binding_snapshot;
const cp262PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-262") ?? cp262Manifest?.plan_binding_snapshot;
const cp263PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-263") ?? cp263Manifest?.plan_binding_snapshot;
const cp264PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-264") ?? cp264Manifest?.plan_binding_snapshot;
const cp265PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-265") ?? cp265Manifest?.plan_binding_snapshot;
const cp266PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-266") ?? cp266Manifest?.plan_binding_snapshot;
const cp267PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-267") ?? cp267Manifest?.plan_binding_snapshot;
const cp268PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-268") ?? cp268Manifest?.plan_binding_snapshot;
const cp269PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-269") ?? cp269Manifest?.plan_binding_snapshot;
const cp270PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-270") ?? cp270Manifest?.plan_binding_snapshot;
const cp271PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-271") ?? cp271Manifest?.plan_binding_snapshot;

assert.equal(searchContract.program.program_id, "RP07", "search contract program drift");
assert.equal(searchContract.program.program_title, "Search OCR And Index");
assert.equal(searchContract.program.upstream_program_id, "RP06");
assert.equal(searchContract.program.hermes_gate, "H07");
assert.equal(searchContract.program.claude_gate, "C07");
assert.equal(searchContract.current_pack.pack_id, "CP00-271");
assert.equal(searchContract.program.current_pack_id, "CP00-271");
assert.deepEqual(searchContract.program, JSON.parse(JSON.stringify(SEARCH_CORE_PROGRAM_CONTRACT)));
assert.deepEqual(searchContract.cp235_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP235_REQUIREMENTS)));
assert.deepEqual(searchContract.cp235_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION)));

assert.ok(cp235PlanPack, "CP00-235 must exist in closeout-pack-plan.json");
assert.equal(cp235PlanPack.unit_count, SEARCH_CORE_CP235_PACK_BINDING.unit_count, "CP00-235 unit count drift");
assert.ok(cp236PlanPack, "CP00-236 must exist in closeout-pack-plan.json");
assert.equal(cp236PlanPack.unit_count, SEARCH_CORE_CP236_PACK_BINDING.unit_count, "CP00-236 unit count drift");
assert.ok(cp237PlanPack, "CP00-237 must exist in closeout-pack-plan.json");
assert.equal(cp237PlanPack.unit_count, SEARCH_CORE_CP237_PACK_BINDING.unit_count, "CP00-237 unit count drift");
assert.ok(cp238PlanPack, "CP00-238 must exist in closeout-pack-plan.json");
assert.equal(cp238PlanPack.unit_count, SEARCH_CORE_CP238_PACK_BINDING.unit_count, "CP00-238 unit count drift");
assert.ok(cp239PlanPack, "CP00-239 must exist in closeout-pack-plan.json");
assert.equal(cp239PlanPack.unit_count, SEARCH_CORE_CP239_PACK_BINDING.unit_count, "CP00-239 unit count drift");
assert.ok(cp240PlanPack, "CP00-240 must exist in closeout-pack-plan.json");
assert.equal(cp240PlanPack.unit_count, SEARCH_CORE_CP240_PACK_BINDING.unit_count, "CP00-240 unit count drift");
assert.ok(cp241PlanPack, "CP00-241 must exist in closeout-pack-plan.json");
assert.equal(cp241PlanPack.unit_count, SEARCH_CORE_CP241_PACK_BINDING.unit_count, "CP00-241 unit count drift");
assert.ok(cp242PlanPack, "CP00-242 must exist in closeout-pack-plan.json");
assert.equal(cp242PlanPack.unit_count, SEARCH_CORE_CP242_PACK_BINDING.unit_count, "CP00-242 unit count drift");
assert.ok(cp243PlanPack, "CP00-243 must exist in closeout-pack-plan.json");
assert.equal(cp243PlanPack.unit_count, SEARCH_CORE_CP243_PACK_BINDING.unit_count, "CP00-243 unit count drift");
assert.ok(cp244PlanPack, "CP00-244 must exist in closeout-pack-plan.json");
assert.equal(cp244PlanPack.unit_count, SEARCH_CORE_CP244_PACK_BINDING.unit_count, "CP00-244 unit count drift");
assert.ok(cp245PlanPack, "CP00-245 must exist in closeout-pack-plan.json");
assert.equal(cp245PlanPack.unit_count, SEARCH_CORE_CP245_PACK_BINDING.unit_count, "CP00-245 unit count drift");
assert.ok(cp246PlanPack, "CP00-246 must exist in closeout-pack-plan.json");
assert.equal(cp246PlanPack.unit_count, SEARCH_CORE_CP246_PACK_BINDING.unit_count, "CP00-246 unit count drift");
assert.ok(cp247PlanPack, "CP00-247 must exist in closeout-pack-plan.json");
assert.equal(cp247PlanPack.unit_count, SEARCH_CORE_CP247_PACK_BINDING.unit_count, "CP00-247 unit count drift");
assert.ok(cp248PlanPack, "CP00-248 must exist in closeout-pack-plan.json");
assert.equal(cp248PlanPack.unit_count, SEARCH_CORE_CP248_PACK_BINDING.unit_count, "CP00-248 unit count drift");
assert.ok(cp249PlanPack, "CP00-249 must exist in closeout-pack-plan.json");
assert.equal(cp249PlanPack.unit_count, SEARCH_CORE_CP249_PACK_BINDING.unit_count, "CP00-249 unit count drift");
assert.ok(cp250PlanPack, "CP00-250 must exist in closeout-pack-plan.json");
assert.equal(cp250PlanPack.unit_count, SEARCH_CORE_CP250_PACK_BINDING.unit_count, "CP00-250 unit count drift");
assert.ok(cp251PlanPack, "CP00-251 must exist in closeout-pack-plan.json");
assert.equal(cp251PlanPack.unit_count, SEARCH_CORE_CP251_PACK_BINDING.unit_count, "CP00-251 unit count drift");
assert.ok(cp252PlanPack, "CP00-252 must exist in closeout-pack-plan.json");
assert.equal(cp252PlanPack.unit_count, SEARCH_CORE_CP252_PACK_BINDING.unit_count, "CP00-252 unit count drift");
assert.ok(cp253PlanPack, "CP00-253 must exist in closeout-pack-plan.json");
assert.equal(cp253PlanPack.unit_count, SEARCH_CORE_CP253_PACK_BINDING.unit_count, "CP00-253 unit count drift");
assert.ok(cp254PlanPack, "CP00-254 must exist in closeout-pack-plan.json");
assert.equal(cp254PlanPack.unit_count, SEARCH_CORE_CP254_PACK_BINDING.unit_count, "CP00-254 unit count drift");
assert.ok(cp255PlanPack, "CP00-255 must exist in closeout-pack-plan.json");
assert.equal(cp255PlanPack.unit_count, SEARCH_CORE_CP255_PACK_BINDING.unit_count, "CP00-255 unit count drift");
assert.ok(cp256PlanPack, "CP00-256 must exist in closeout-pack-plan.json");
assert.equal(cp256PlanPack.unit_count, SEARCH_CORE_CP256_PACK_BINDING.unit_count, "CP00-256 unit count drift");
assert.ok(cp257PlanPack, "CP00-257 must exist in closeout-pack-plan.json");
assert.equal(cp257PlanPack.unit_count, SEARCH_CORE_CP257_PACK_BINDING.unit_count, "CP00-257 unit count drift");
assert.ok(cp258PlanPack, "CP00-258 must exist in closeout-pack-plan.json");
assert.equal(cp258PlanPack.unit_count, SEARCH_CORE_CP258_PACK_BINDING.unit_count, "CP00-258 unit count drift");
assert.ok(cp259PlanPack, "CP00-259 must exist in closeout-pack-plan.json");
assert.equal(cp259PlanPack.unit_count, SEARCH_CORE_CP259_PACK_BINDING.unit_count, "CP00-259 unit count drift");
assert.ok(cp260PlanPack, "CP00-260 must exist in closeout-pack-plan.json");
assert.equal(cp260PlanPack.unit_count, SEARCH_CORE_CP260_PACK_BINDING.unit_count, "CP00-260 unit count drift");
assert.ok(cp261PlanPack, "CP00-261 must exist in closeout-pack-plan.json");
assert.equal(cp261PlanPack.unit_count, SEARCH_CORE_CP261_PACK_BINDING.unit_count, "CP00-261 unit count drift");
assert.ok(cp262PlanPack, "CP00-262 must exist in closeout-pack-plan.json");
assert.equal(cp262PlanPack.unit_count, SEARCH_CORE_CP262_PACK_BINDING.unit_count, "CP00-262 unit count drift");
assert.ok(cp263PlanPack, "CP00-263 must exist in closeout-pack-plan.json");
assert.equal(cp263PlanPack.unit_count, SEARCH_CORE_CP263_PACK_BINDING.unit_count, "CP00-263 unit count drift");
assert.ok(cp264PlanPack, "CP00-264 must exist in closeout-pack-plan.json");
assert.equal(cp264PlanPack.unit_count, SEARCH_CORE_CP264_PACK_BINDING.unit_count, "CP00-264 unit count drift");
assert.ok(cp265PlanPack, "CP00-265 must exist in closeout-pack-plan.json");
assert.equal(cp265PlanPack.unit_count, SEARCH_CORE_CP265_PACK_BINDING.unit_count, "CP00-265 unit count drift");
assert.ok(cp266PlanPack, "CP00-266 must exist in closeout-pack-plan.json");
assert.equal(cp266PlanPack.unit_count, SEARCH_CORE_CP266_PACK_BINDING.unit_count, "CP00-266 unit count drift");
assert.ok(cp267PlanPack, "CP00-267 must exist in closeout-pack-plan.json");
assert.equal(cp267PlanPack.unit_count, SEARCH_CORE_CP267_PACK_BINDING.unit_count, "CP00-267 unit count drift");
assert.ok(cp268PlanPack, "CP00-268 must exist in closeout-pack-plan.json");
assert.equal(cp268PlanPack.unit_count, SEARCH_CORE_CP268_PACK_BINDING.unit_count, "CP00-268 unit count drift");
assert.ok(cp269PlanPack, "CP00-269 must exist in closeout-pack-plan.json");
assert.equal(cp269PlanPack.unit_count, SEARCH_CORE_CP269_PACK_BINDING.unit_count, "CP00-269 unit count drift");
assert.ok(cp270PlanPack, "CP00-270 must exist in closeout-pack-plan.json");
assert.equal(cp270PlanPack.unit_count, SEARCH_CORE_CP270_PACK_BINDING.unit_count, "CP00-270 unit count drift");
assert.ok(cp271PlanPack, "CP00-271 must exist in closeout-pack-plan.json");
assert.equal(cp271PlanPack.unit_count, SEARCH_CORE_CP271_PACK_BINDING.unit_count, "CP00-271 unit count drift");

const cp235Coverage = validateSearchCoreCp235Coverage(cp235PlanPack);
const cp235Descriptor = createSearchCoreCp235ScopeContractFoundationDescriptor();
const cp235CaseSet = createSearchCoreCp235ScopeContractFoundationCaseSet();
const cp235Foundation = validateSearchCoreCp235ScopeContractFoundationDescriptor(cp235Descriptor, searchContract);
const cp235Hermes = createSearchCoreCp235HermesEvidencePacket(cp235PlanPack, searchContract, cp235Descriptor);
const cp235Claude = createSearchCoreCp235ClaudeReviewPacket(cp235PlanPack);
const cp235Handoff = createSearchCoreCp235CloseoutHandoff();
const cp236Coverage = validateSearchCoreCp236Coverage(cp236PlanPack);
const cp236Descriptor = createSearchCoreCp236ModelStorageSliceDescriptor();
const cp236CaseSet = createSearchCoreCp236ModelStorageSliceCaseSet();
const cp236Slice = validateSearchCoreCp236ModelStorageSliceDescriptor(cp236Descriptor, searchContract);
const cp236Hermes = createSearchCoreCp236HermesEvidencePacket(cp236PlanPack, searchContract, cp236Descriptor);
const cp236Claude = createSearchCoreCp236ClaudeReviewPacket(cp236PlanPack);
const cp236Handoff = createSearchCoreCp236CloseoutHandoff();
const cp237Coverage = validateSearchCoreCp237Coverage(cp237PlanPack);
const cp237Descriptor = createSearchCoreCp237ModelBindingSliceDescriptor();
const cp237CaseSet = createSearchCoreCp237ModelBindingSliceCaseSet();
const cp237Slice = validateSearchCoreCp237ModelBindingSliceDescriptor(cp237Descriptor, searchContract);
const cp237Hermes = createSearchCoreCp237HermesEvidencePacket(cp237PlanPack, searchContract, cp237Descriptor);
const cp237Claude = createSearchCoreCp237ClaudeReviewPacket(cp237PlanPack);
const cp237Handoff = createSearchCoreCp237CloseoutHandoff();
const cp238Coverage = validateSearchCoreCp238Coverage(cp238PlanPack);
const cp238Descriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor();
const cp238CaseSet = createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet();
const cp238Foundation = validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(cp238Descriptor, searchContract);
const cp238Hermes = createSearchCoreCp238HermesEvidencePacket(cp238PlanPack, searchContract, cp238Descriptor);
const cp238Claude = createSearchCoreCp238ClaudeReviewPacket(cp238PlanPack);
const cp238Handoff = createSearchCoreCp238CloseoutHandoff();
const cp239Coverage = validateSearchCoreCp239Coverage(cp239PlanPack);
const cp239Descriptor = createSearchCoreCp239ServiceSliceDescriptor();
const cp239CaseSet = createSearchCoreCp239ServiceSliceCaseSet();
const cp239Slice = validateSearchCoreCp239ServiceSliceDescriptor(cp239Descriptor, searchContract);
const cp239Hermes = createSearchCoreCp239HermesEvidencePacket(cp239PlanPack, searchContract, cp239Descriptor);
const cp239Claude = createSearchCoreCp239ClaudeReviewPacket(cp239PlanPack);
const cp239Handoff = createSearchCoreCp239CloseoutHandoff();
const cp240Coverage = validateSearchCoreCp240Coverage(cp240PlanPack);
const cp240Descriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor();
const cp240CaseSet = createSearchCoreCp240ServiceWorkflowTailCaseSet();
const cp240Tail = validateSearchCoreCp240ServiceWorkflowTailDescriptor(cp240Descriptor, searchContract);
const cp240Hermes = createSearchCoreCp240HermesEvidencePacket(cp240PlanPack, searchContract, cp240Descriptor);
const cp240Claude = createSearchCoreCp240ClaudeReviewPacket(cp240PlanPack);
const cp240Handoff = createSearchCoreCp240CloseoutHandoff();
const cp241Coverage = validateSearchCoreCp241Coverage(cp241PlanPack);
const cp241Descriptor = createSearchCoreCp241ServiceAuditBindingDescriptor();
const cp241CaseSet = createSearchCoreCp241ServiceAuditBindingCaseSet();
const cp241Binding = validateSearchCoreCp241ServiceAuditBindingDescriptor(cp241Descriptor, searchContract);
const cp241Hermes = createSearchCoreCp241HermesEvidencePacket(cp241PlanPack, searchContract, cp241Descriptor);
const cp241Claude = createSearchCoreCp241ClaudeReviewPacket(cp241PlanPack);
const cp241Handoff = createSearchCoreCp241CloseoutHandoff();
const cp242Coverage = validateSearchCoreCp242Coverage(cp242PlanPack);
const cp242Descriptor = createSearchCoreCp242ServiceBindingMidDescriptor();
const cp242CaseSet = createSearchCoreCp242ServiceBindingMidCaseSet();
const cp242Binding = validateSearchCoreCp242ServiceBindingMidDescriptor(cp242Descriptor, searchContract);
const cp242Hermes = createSearchCoreCp242HermesEvidencePacket(cp242PlanPack, searchContract, cp242Descriptor);
const cp242Claude = createSearchCoreCp242ClaudeReviewPacket(cp242PlanPack);
const cp242Handoff = createSearchCoreCp242CloseoutHandoff();
const cp243Coverage = validateSearchCoreCp243Coverage(cp243PlanPack);
const cp243Descriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor();
const cp243CaseSet = createSearchCoreCp243ServiceFixtureHeadCaseSet();
const cp243Head = validateSearchCoreCp243ServiceFixtureHeadDescriptor(cp243Descriptor, searchContract);
const cp243Hermes = createSearchCoreCp243HermesEvidencePacket(cp243PlanPack, searchContract, cp243Descriptor);
const cp243Claude = createSearchCoreCp243ClaudeReviewPacket(cp243PlanPack);
const cp243Handoff = createSearchCoreCp243CloseoutHandoff();
const cp244Coverage = validateSearchCoreCp244Coverage(cp244PlanPack);
const cp244Descriptor = createSearchCoreCp244ServiceFixtureMidDescriptor();
const cp244CaseSet = createSearchCoreCp244ServiceFixtureMidCaseSet();
const cp244Mid = validateSearchCoreCp244ServiceFixtureMidDescriptor(cp244Descriptor, searchContract);
const cp244Hermes = createSearchCoreCp244HermesEvidencePacket(cp244PlanPack, searchContract, cp244Descriptor);
const cp244Claude = createSearchCoreCp244ClaudeReviewPacket(cp244PlanPack);
const cp244Handoff = createSearchCoreCp244CloseoutHandoff();
const cp245Coverage = validateSearchCoreCp245Coverage(cp245PlanPack);
const cp245Descriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor();
const cp245CaseSet = createSearchCoreCp245ServiceGoldenHeadCaseSet();
const cp245Head = validateSearchCoreCp245ServiceGoldenHeadDescriptor(cp245Descriptor, searchContract);
const cp245Hermes = createSearchCoreCp245HermesEvidencePacket(cp245PlanPack, searchContract, cp245Descriptor);
const cp245Claude = createSearchCoreCp245ClaudeReviewPacket(cp245PlanPack);
const cp245Handoff = createSearchCoreCp245CloseoutHandoff();
const cp246Coverage = validateSearchCoreCp246Coverage(cp246PlanPack);
const cp246Descriptor = createSearchCoreCp246GoldenHermesSliceDescriptor();
const cp246CaseSet = createSearchCoreCp246GoldenHermesSliceCaseSet();
const cp246Slice = validateSearchCoreCp246GoldenHermesSliceDescriptor(cp246Descriptor, searchContract);
const cp246Hermes = createSearchCoreCp246HermesEvidencePacket(cp246PlanPack, searchContract, cp246Descriptor);
const cp246Claude = createSearchCoreCp246ClaudeReviewPacket(cp246PlanPack);
const cp246Handoff = createSearchCoreCp246CloseoutHandoff();
const cp247Coverage = validateSearchCoreCp247Coverage(cp247PlanPack);
const cp247Descriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor();
const cp247CaseSet = createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet();
const cp247Foundation = validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(cp247Descriptor, searchContract);
const cp247Hermes = createSearchCoreCp247HermesEvidencePacket(cp247PlanPack, searchContract, cp247Descriptor);
const cp247Claude = createSearchCoreCp247ClaudeReviewPacket(cp247PlanPack);
const cp247Handoff = createSearchCoreCp247CloseoutHandoff();
const cp248Coverage = validateSearchCoreCp248Coverage(cp248PlanPack);
const cp248Descriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor();
const cp248CaseSet = createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet();
const cp248Foundation = validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(cp248Descriptor, searchContract);
const cp248Hermes = createSearchCoreCp248HermesEvidencePacket(cp248PlanPack, searchContract, cp248Descriptor);
const cp248Claude = createSearchCoreCp248ClaudeReviewPacket(cp248PlanPack);
const cp248Handoff = createSearchCoreCp248CloseoutHandoff();
const cp249Coverage = validateSearchCoreCp249Coverage(cp249PlanPack);
const cp249Descriptor = createSearchCoreCp249UiSliceMidDescriptor();
const cp249CaseSet = createSearchCoreCp249UiSliceMidCaseSet();
const cp249Mid = validateSearchCoreCp249UiSliceMidDescriptor(cp249Descriptor, searchContract);
const cp249Hermes = createSearchCoreCp249HermesEvidencePacket(cp249PlanPack, searchContract, cp249Descriptor);
const cp249Claude = createSearchCoreCp249ClaudeReviewPacket(cp249PlanPack);
const cp249Handoff = createSearchCoreCp249CloseoutHandoff();
const cp250Coverage = validateSearchCoreCp250Coverage(cp250PlanPack);
const cp250Descriptor = createSearchCoreCp250UiWorkflowSliceDescriptor();
const cp250CaseSet = createSearchCoreCp250UiWorkflowSliceCaseSet();
const cp250Slice = validateSearchCoreCp250UiWorkflowSliceDescriptor(cp250Descriptor, searchContract);
const cp250Hermes = createSearchCoreCp250HermesEvidencePacket(cp250PlanPack, searchContract, cp250Descriptor);
const cp250Claude = createSearchCoreCp250ClaudeReviewPacket(cp250PlanPack);
const cp250Handoff = createSearchCoreCp250CloseoutHandoff();
const cp251Coverage = validateSearchCoreCp251Coverage(cp251PlanPack);
const cp251Descriptor = createSearchCoreCp251UiBindingTailDescriptor();
const cp251CaseSet = createSearchCoreCp251UiBindingTailCaseSet();
const cp251Tail = validateSearchCoreCp251UiBindingTailDescriptor(cp251Descriptor, searchContract);
const cp251Hermes = createSearchCoreCp251HermesEvidencePacket(cp251PlanPack, searchContract, cp251Descriptor);
const cp251Claude = createSearchCoreCp251ClaudeReviewPacket(cp251PlanPack);
const cp251Handoff = createSearchCoreCp251CloseoutHandoff();
const cp252Coverage = validateSearchCoreCp252Coverage(cp252PlanPack);
const cp252Descriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor();
const cp252CaseSet = createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet();
const cp252Foundation = validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(cp252Descriptor, searchContract);
const cp252Hermes = createSearchCoreCp252HermesEvidencePacket(cp252PlanPack, searchContract, cp252Descriptor);
const cp252Claude = createSearchCoreCp252ClaudeReviewPacket(cp252PlanPack);
const cp252Handoff = createSearchCoreCp252CloseoutHandoff();
const cp253Coverage = validateSearchCoreCp253Coverage(cp253PlanPack);
const cp253Descriptor = createSearchCoreCp253FixtureSliceDescriptor();
const cp253CaseSet = createSearchCoreCp253FixtureSliceCaseSet();
const cp253Slice = validateSearchCoreCp253FixtureSliceDescriptor(cp253Descriptor, searchContract);
const cp253Hermes = createSearchCoreCp253HermesEvidencePacket(cp253PlanPack, searchContract, cp253Descriptor);
const cp253Claude = createSearchCoreCp253ClaudeReviewPacket(cp253PlanPack);
const cp253Handoff = createSearchCoreCp253CloseoutHandoff();
const cp254Coverage = validateSearchCoreCp254Coverage(cp254PlanPack);
const cp254Descriptor = createSearchCoreCp254FixtureBindingSliceDescriptor();
const cp254CaseSet = createSearchCoreCp254FixtureBindingSliceCaseSet();
const cp254Slice = validateSearchCoreCp254FixtureBindingSliceDescriptor(cp254Descriptor, searchContract);
const cp254Hermes = createSearchCoreCp254HermesEvidencePacket(cp254PlanPack, searchContract, cp254Descriptor);
const cp254Claude = createSearchCoreCp254ClaudeReviewPacket(cp254PlanPack);
const cp254Handoff = createSearchCoreCp254CloseoutHandoff();
const cp255Coverage = validateSearchCoreCp255Coverage(cp255PlanPack);
const cp255Descriptor = createSearchCoreCp255FixtureSetMidDescriptor();
const cp255CaseSet = createSearchCoreCp255FixtureSetMidCaseSet();
const cp255Mid = validateSearchCoreCp255FixtureSetMidDescriptor(cp255Descriptor, searchContract);
const cp255Hermes = createSearchCoreCp255HermesEvidencePacket(cp255PlanPack, searchContract, cp255Descriptor);
const cp255Claude = createSearchCoreCp255ClaudeReviewPacket(cp255PlanPack);
const cp255Handoff = createSearchCoreCp255CloseoutHandoff();
const cp256Coverage = validateSearchCoreCp256Coverage(cp256PlanPack);
const cp256Descriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor();
const cp256CaseSet = createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet();
const cp256Foundation = validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(cp256Descriptor, searchContract);
const cp256Hermes = createSearchCoreCp256HermesEvidencePacket(cp256PlanPack, searchContract, cp256Descriptor);
const cp256Claude = createSearchCoreCp256ClaudeReviewPacket(cp256PlanPack);
const cp256Handoff = createSearchCoreCp256CloseoutHandoff();
const cp257Coverage = validateSearchCoreCp257Coverage(cp257PlanPack);
const cp257Descriptor = createSearchCoreCp257PermissionSliceHeadDescriptor();
const cp257CaseSet = createSearchCoreCp257PermissionSliceHeadCaseSet();
const cp257Head = validateSearchCoreCp257PermissionSliceHeadDescriptor(cp257Descriptor, searchContract);
const cp257Hermes = createSearchCoreCp257HermesEvidencePacket(cp257PlanPack, searchContract, cp257Descriptor);
const cp257Claude = createSearchCoreCp257ClaudeReviewPacket(cp257PlanPack);
const cp257Handoff = createSearchCoreCp257CloseoutHandoff();
const cp258Coverage = validateSearchCoreCp258Coverage(cp258PlanPack);
const cp258Descriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor();
const cp258CaseSet = createSearchCoreCp258PermissionWorkflowSliceCaseSet();
const cp258Slice = validateSearchCoreCp258PermissionWorkflowSliceDescriptor(cp258Descriptor, searchContract);
const cp258Hermes = createSearchCoreCp258HermesEvidencePacket(cp258PlanPack, searchContract, cp258Descriptor);
const cp258Claude = createSearchCoreCp258ClaudeReviewPacket(cp258PlanPack);
const cp258Handoff = createSearchCoreCp258CloseoutHandoff();
const cp259Coverage = validateSearchCoreCp259Coverage(cp259PlanPack);
const cp259Descriptor = createSearchCoreCp259PermissionBindingSliceDescriptor();
const cp259CaseSet = createSearchCoreCp259PermissionBindingSliceCaseSet();
const cp259Slice = validateSearchCoreCp259PermissionBindingSliceDescriptor(cp259Descriptor, searchContract);
const cp259Hermes = createSearchCoreCp259HermesEvidencePacket(cp259PlanPack, searchContract, cp259Descriptor);
const cp259Claude = createSearchCoreCp259ClaudeReviewPacket(cp259PlanPack);
const cp259Handoff = createSearchCoreCp259CloseoutHandoff();
const cp260Coverage = validateSearchCoreCp260Coverage(cp260PlanPack);
const cp260Descriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor();
const cp260CaseSet = createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet();
const cp260Foundation = validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(cp260Descriptor, searchContract);
const cp260Hermes = createSearchCoreCp260HermesEvidencePacket(cp260PlanPack, searchContract, cp260Descriptor);
const cp260Claude = createSearchCoreCp260ClaudeReviewPacket(cp260PlanPack);
const cp260Handoff = createSearchCoreCp260CloseoutHandoff();
const cp261Coverage = validateSearchCoreCp261Coverage(cp261PlanPack);
const cp261Descriptor = createSearchCoreCp261FailureSliceDescriptor();
const cp261CaseSet = createSearchCoreCp261FailureSliceCaseSet();
const cp261Slice = validateSearchCoreCp261FailureSliceDescriptor(cp261Descriptor, searchContract);
const cp261Hermes = createSearchCoreCp261HermesEvidencePacket(cp261PlanPack, searchContract, cp261Descriptor);
const cp261Claude = createSearchCoreCp261ClaudeReviewPacket(cp261PlanPack);
const cp261Handoff = createSearchCoreCp261CloseoutHandoff();
const cp262Coverage = validateSearchCoreCp262Coverage(cp262PlanPack);
const cp262Descriptor = createSearchCoreCp262FailureBindingSliceDescriptor();
const cp262CaseSet = createSearchCoreCp262FailureBindingSliceCaseSet();
const cp262Slice = validateSearchCoreCp262FailureBindingSliceDescriptor(cp262Descriptor, searchContract);
const cp262Hermes = createSearchCoreCp262HermesEvidencePacket(cp262PlanPack, searchContract, cp262Descriptor);
const cp262Claude = createSearchCoreCp262ClaudeReviewPacket(cp262PlanPack);
const cp262Handoff = createSearchCoreCp262CloseoutHandoff();
const cp263Coverage = validateSearchCoreCp263Coverage(cp263PlanPack);
const cp263Descriptor = createSearchCoreCp263FailureBindingTailDescriptor();
const cp263CaseSet = createSearchCoreCp263FailureBindingTailCaseSet();
const cp263Tail = validateSearchCoreCp263FailureBindingTailDescriptor(cp263Descriptor, searchContract);
const cp263Hermes = createSearchCoreCp263HermesEvidencePacket(cp263PlanPack, searchContract, cp263Descriptor);
const cp263Claude = createSearchCoreCp263ClaudeReviewPacket(cp263PlanPack);
const cp263Handoff = createSearchCoreCp263CloseoutHandoff();
const cp264Coverage = validateSearchCoreCp264Coverage(cp264PlanPack);
const cp264Descriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor();
const cp264CaseSet = createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet();
const cp264Foundation = validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(cp264Descriptor, searchContract);
const cp264Hermes = createSearchCoreCp264HermesEvidencePacket(cp264PlanPack, searchContract, cp264Descriptor);
const cp264Claude = createSearchCoreCp264ClaudeReviewPacket(cp264PlanPack);
const cp264Handoff = createSearchCoreCp264CloseoutHandoff();
const cp265Coverage = validateSearchCoreCp265Coverage(cp265PlanPack);
const cp265Descriptor = createSearchCoreCp265HermesSliceDescriptor();
const cp265CaseSet = createSearchCoreCp265HermesSliceCaseSet();
const cp265Slice = validateSearchCoreCp265HermesSliceDescriptor(cp265Descriptor, searchContract);
const cp265Hermes = createSearchCoreCp265HermesEvidencePacket(cp265PlanPack, searchContract, cp265Descriptor);
const cp265Claude = createSearchCoreCp265ClaudeReviewPacket(cp265PlanPack);
const cp265Handoff = createSearchCoreCp265CloseoutHandoff();
const cp266Coverage = validateSearchCoreCp266Coverage(cp266PlanPack);
const cp266Descriptor = createSearchCoreCp266HermesBindingSliceDescriptor();
const cp266CaseSet = createSearchCoreCp266HermesBindingSliceCaseSet();
const cp266Slice = validateSearchCoreCp266HermesBindingSliceDescriptor(cp266Descriptor, searchContract);
const cp266Hermes = createSearchCoreCp266HermesEvidencePacket(cp266PlanPack, searchContract, cp266Descriptor);
const cp266Claude = createSearchCoreCp266ClaudeReviewPacket(cp266PlanPack);
const cp266Handoff = createSearchCoreCp266CloseoutHandoff();
const cp267Coverage = validateSearchCoreCp267Coverage(cp267PlanPack);
const cp267Descriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor();
const cp267CaseSet = createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet();
const cp267Foundation = validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(cp267Descriptor, searchContract);
const cp267Hermes = createSearchCoreCp267HermesEvidencePacket(cp267PlanPack, searchContract, cp267Descriptor);
const cp267Claude = createSearchCoreCp267ClaudeReviewPacket(cp267PlanPack);
const cp267Handoff = createSearchCoreCp267CloseoutHandoff();
const cp268Coverage = validateSearchCoreCp268Coverage(cp268PlanPack);
const cp268Descriptor = createSearchCoreCp268ReviewSliceDescriptor();
const cp268CaseSet = createSearchCoreCp268ReviewSliceCaseSet();
const cp268Slice = validateSearchCoreCp268ReviewSliceDescriptor(cp268Descriptor, searchContract);
const cp268Hermes = createSearchCoreCp268HermesEvidencePacket(cp268PlanPack, searchContract, cp268Descriptor);
const cp268Claude = createSearchCoreCp268ClaudeReviewPacket(cp268PlanPack);
const cp268Handoff = createSearchCoreCp268CloseoutHandoff();
const cp269Coverage = validateSearchCoreCp269Coverage(cp269PlanPack);
const cp269Descriptor = createSearchCoreCp269ReviewBindingMidDescriptor();
const cp269CaseSet = createSearchCoreCp269ReviewBindingMidCaseSet();
const cp269Mid = validateSearchCoreCp269ReviewBindingMidDescriptor(cp269Descriptor, searchContract);
const cp269Hermes = createSearchCoreCp269HermesEvidencePacket(cp269PlanPack, searchContract, cp269Descriptor);
const cp269Claude = createSearchCoreCp269ClaudeReviewPacket(cp269PlanPack);
const cp269Handoff = createSearchCoreCp269CloseoutHandoff();
const cp270Coverage = validateSearchCoreCp270Coverage(cp270PlanPack);
const cp270Descriptor = createSearchCoreCp270ReviewBindingTailDescriptor();
const cp270CaseSet = createSearchCoreCp270ReviewBindingTailCaseSet();
const cp270Tail = validateSearchCoreCp270ReviewBindingTailDescriptor(cp270Descriptor, searchContract);
const cp270Hermes = createSearchCoreCp270HermesEvidencePacket(cp270PlanPack, searchContract, cp270Descriptor);
const cp270Claude = createSearchCoreCp270ClaudeReviewPacket(cp270PlanPack);
const cp270Handoff = createSearchCoreCp270CloseoutHandoff();
const cp271Coverage = validateSearchCoreCp271Coverage(cp271PlanPack);
const cp271Descriptor = createSearchCoreCp271P09CloseoutDescriptor();
const cp271CaseSet = createSearchCoreCp271P09CloseoutCaseSet();
const cp271Closeout = validateSearchCoreCp271P09CloseoutDescriptor(cp271Descriptor, searchContract);
const cp271Hermes = createSearchCoreCp271HermesEvidencePacket(cp271PlanPack, searchContract, cp271Descriptor);
const cp271Claude = createSearchCoreCp271ClaudeReviewPacket(cp271PlanPack);
const cp271Handoff = createSearchCoreCp271CloseoutHandoff();

assert.equal(cp235Coverage.valid, true, cp235Coverage.errors.join("; "));
assert.equal(cp235Coverage.summary.unit_count, 150);
assert.equal(cp235Coverage.summary.by_phase["RP07.P00"], 122);
assert.equal(cp235Coverage.summary.by_phase["RP07.P01"], 28);
assert.equal(cp235Foundation.valid, true, cp235Foundation.errors.join("; "));
assert.equal(cp235CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp235CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-235 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp235Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.equal(cp235Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp235Hermes.production_ready_candidate, true);
assert.equal(cp235Claude.review_packet, "C07.CP00-235.search_core_scope_contract_foundation_descriptor");
assert.equal(cp235Claude.read_only, true);
assert.deepEqual(SEARCH_CORE_CP235_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp235Handoff.to_pack_id, "CP00-236");
assert.equal(cp235Handoff.next_subphase_id, "RP07.P01.M02.S09");
assert.equal(cp236Coverage.valid, true, cp236Coverage.errors.join("; "));
assert.equal(cp236Coverage.summary.unit_count, 40);
assert.equal(cp236Coverage.summary.by_micro_phase["RP07.P01.M03"], 22);
assert.equal(cp236Slice.valid, true, cp236Slice.errors.join("; "));
assert.equal(cp236CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp236CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-236 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.model_storage_slice_descriptor,
  JSON.parse(JSON.stringify(cp236Descriptor)),
  "contract model_storage_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp236_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP236_REQUIREMENTS)));
assert.deepEqual(searchContract.cp236_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP236_NO_WRITE_ATTESTATION)));
assert.equal(cp236Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp236Hermes.production_ready_candidate, true);
assert.equal(cp236Claude.review_packet, "C07.CP00-236.search_core_model_storage_slice_descriptor");
assert.equal(cp236Claude.read_only, true);
assert.equal(cp236Handoff.to_pack_id, "CP00-237");
assert.equal(cp236Handoff.next_subphase_id, "RP07.P01.M04.S07");
assert.equal(cp237Coverage.valid, true, cp237Coverage.errors.join("; "));
assert.equal(cp237Coverage.summary.unit_count, 40);
assert.equal(cp237Coverage.summary.by_micro_phase["RP07.P01.M05"], 22);
assert.equal(cp237Slice.valid, true, cp237Slice.errors.join("; "));
assert.equal(cp237CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp237CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-237 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.model_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp237Descriptor)),
  "contract model_binding_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp237_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP237_REQUIREMENTS)));
assert.deepEqual(searchContract.cp237_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP237_NO_WRITE_ATTESTATION)));
assert.equal(cp237Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp237Hermes.production_ready_candidate, true);
assert.equal(cp237Claude.review_packet, "C07.CP00-237.search_core_model_binding_slice_descriptor");
assert.equal(cp237Claude.read_only, true);
assert.equal(cp237Handoff.to_pack_id, "CP00-238");
assert.equal(cp237Handoff.next_subphase_id, "RP07.P01.M06.S05");
assert.equal(cp238Coverage.valid, true, cp238Coverage.errors.join("; "));
assert.equal(cp238Coverage.summary.unit_count, 150);
assert.equal(cp238Coverage.summary.by_phase["RP07.P01"], 88);
assert.equal(cp238Coverage.summary.by_phase["RP07.P02"], 62);
assert.equal(cp238Foundation.valid, true, cp238Foundation.errors.join("; "));
assert.equal(cp238CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp238CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-238 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p01_closeout_p02_service_foundation_descriptor,
  JSON.parse(JSON.stringify(cp238Descriptor)),
  "contract p01_closeout_p02_service_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp238_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP238_REQUIREMENTS)));
assert.deepEqual(searchContract.cp238_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP238_NO_WRITE_ATTESTATION)));
assert.equal(cp238Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp238Hermes.production_ready_candidate, true);
assert.equal(cp238Claude.review_packet, "C07.CP00-238.search_core_p01_closeout_p02_service_foundation_descriptor");
assert.equal(cp238Claude.read_only, true);
assert.equal(cp238Handoff.to_pack_id, "CP00-239");
assert.equal(cp238Handoff.next_subphase_id, "RP07.P02.M03.S01");
assert.equal(cp239Coverage.valid, true, cp239Coverage.errors.join("; "));
assert.equal(cp239Coverage.summary.unit_count, 40);
assert.equal(cp239Coverage.summary.by_micro_phase["RP07.P02.M03"], 25);
assert.equal(cp239Slice.valid, true, cp239Slice.errors.join("; "));
assert.equal(cp239CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp239CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-239 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_slice_descriptor,
  JSON.parse(JSON.stringify(cp239Descriptor)),
  "contract service_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp239_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP239_REQUIREMENTS)));
assert.deepEqual(searchContract.cp239_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP239_NO_WRITE_ATTESTATION)));
assert.equal(cp239Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp239Hermes.production_ready_candidate, true);
assert.equal(cp239Claude.review_packet, "C07.CP00-239.search_core_service_slice_descriptor");
assert.equal(cp239Claude.read_only, true);
assert.equal(cp239Handoff.to_pack_id, "CP00-240");
assert.equal(cp239Handoff.next_subphase_id, "RP07.P02.M04.S16");
assert.equal(cp240Coverage.valid, true, cp240Coverage.errors.join("; "));
assert.equal(cp240Coverage.summary.unit_count, 10);
assert.equal(cp240Coverage.summary.by_micro_phase["RP07.P02.M04"], 10);
assert.equal(cp240Tail.valid, true, cp240Tail.errors.join("; "));
assert.equal(cp240CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp240CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-240 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_workflow_tail_descriptor,
  JSON.parse(JSON.stringify(cp240Descriptor)),
  "contract service_workflow_tail_descriptor drift",
);
assert.deepEqual(searchContract.cp240_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP240_REQUIREMENTS)));
assert.deepEqual(searchContract.cp240_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP240_NO_WRITE_ATTESTATION)));
assert.equal(cp240Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp240Hermes.production_ready_candidate, true);
assert.equal(cp240Claude.review_packet, "C07.CP00-240.search_core_service_workflow_tail_descriptor");
assert.equal(cp240Claude.read_only, true);
assert.equal(cp240Handoff.to_pack_id, "CP00-241");
assert.equal(cp240Handoff.next_subphase_id, "RP07.P02.M05.S01");
assert.equal(cp241Coverage.valid, true, cp241Coverage.errors.join("; "));
assert.equal(cp241Coverage.summary.unit_count, 10);
assert.equal(cp241Coverage.summary.by_micro_phase["RP07.P02.M05"], 10);
assert.equal(cp241Binding.valid, true, cp241Binding.errors.join("; "));
assert.equal(cp241CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp241CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-241 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_audit_binding_descriptor,
  JSON.parse(JSON.stringify(cp241Descriptor)),
  "contract service_audit_binding_descriptor drift",
);
assert.deepEqual(searchContract.cp241_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP241_REQUIREMENTS)));
assert.deepEqual(searchContract.cp241_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP241_NO_WRITE_ATTESTATION)));
assert.equal(cp241Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp241Hermes.production_ready_candidate, true);
assert.equal(cp241Claude.review_packet, "C07.CP00-241.search_core_service_audit_binding_descriptor");
assert.equal(cp241Claude.read_only, true);
assert.equal(cp241Handoff.to_pack_id, "CP00-242");
assert.equal(cp241Handoff.next_subphase_id, "RP07.P02.M05.S11");
assert.equal(cp242Coverage.valid, true, cp242Coverage.errors.join("; "));
assert.equal(cp242Coverage.summary.unit_count, 10);
assert.equal(cp242Coverage.summary.by_micro_phase["RP07.P02.M05"], 10);
assert.equal(cp242Binding.valid, true, cp242Binding.errors.join("; "));
assert.equal(cp242CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp242CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-242 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_binding_mid_descriptor,
  JSON.parse(JSON.stringify(cp242Descriptor)),
  "contract service_binding_mid_descriptor drift",
);
assert.deepEqual(searchContract.cp242_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP242_REQUIREMENTS)));
assert.deepEqual(searchContract.cp242_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP242_NO_WRITE_ATTESTATION)));
assert.equal(cp242Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp242Hermes.production_ready_candidate, true);
assert.equal(cp242Claude.review_packet, "C07.CP00-242.search_core_service_binding_mid_descriptor");
assert.equal(cp242Claude.read_only, true);
assert.equal(cp242Handoff.to_pack_id, "CP00-243");
assert.equal(cp242Handoff.next_subphase_id, "RP07.P02.M05.S21");
assert.equal(cp243Coverage.valid, true, cp243Coverage.errors.join("; "));
assert.equal(cp243Coverage.summary.unit_count, 10);
assert.equal(cp243Coverage.summary.by_micro_phase["RP07.P02.M06"], 5);
assert.equal(cp243Head.valid, true, cp243Head.errors.join("; "));
assert.equal(cp243CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp243CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-243 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_fixture_head_descriptor,
  JSON.parse(JSON.stringify(cp243Descriptor)),
  "contract service_fixture_head_descriptor drift",
);
assert.deepEqual(searchContract.cp243_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP243_REQUIREMENTS)));
assert.deepEqual(searchContract.cp243_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP243_NO_WRITE_ATTESTATION)));
assert.equal(cp243Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp243Hermes.production_ready_candidate, true);
assert.equal(cp243Claude.review_packet, "C07.CP00-243.search_core_service_fixture_head_descriptor");
assert.equal(cp243Claude.read_only, true);
assert.equal(cp243Handoff.to_pack_id, "CP00-244");
assert.equal(cp243Handoff.next_subphase_id, "RP07.P02.M06.S06");
assert.equal(cp244Coverage.valid, true, cp244Coverage.errors.join("; "));
assert.equal(cp244Coverage.summary.unit_count, 10);
assert.equal(cp244Coverage.summary.by_micro_phase["RP07.P02.M06"], 10);
assert.equal(cp244Mid.valid, true, cp244Mid.errors.join("; "));
assert.equal(cp244CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp244CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-244 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_fixture_mid_descriptor,
  JSON.parse(JSON.stringify(cp244Descriptor)),
  "contract service_fixture_mid_descriptor drift",
);
assert.deepEqual(searchContract.cp244_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP244_REQUIREMENTS)));
assert.deepEqual(searchContract.cp244_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP244_NO_WRITE_ATTESTATION)));
assert.equal(cp244Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp244Hermes.production_ready_candidate, true);
assert.equal(cp244Claude.review_packet, "C07.CP00-244.search_core_service_fixture_mid_descriptor");
assert.equal(cp244Claude.read_only, true);
assert.equal(cp244Handoff.to_pack_id, "CP00-245");
assert.equal(cp244Handoff.next_subphase_id, "RP07.P02.M06.S16");
assert.equal(cp245Coverage.valid, true, cp245Coverage.errors.join("; "));
assert.equal(cp245Coverage.summary.unit_count, 10);
assert.equal(cp245Coverage.summary.by_micro_phase["RP07.P02.M07"], 3);
assert.equal(cp245Head.valid, true, cp245Head.errors.join("; "));
assert.equal(cp245CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp245CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-245 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.service_golden_head_descriptor,
  JSON.parse(JSON.stringify(cp245Descriptor)),
  "contract service_golden_head_descriptor drift",
);
assert.deepEqual(searchContract.cp245_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP245_REQUIREMENTS)));
assert.deepEqual(searchContract.cp245_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP245_NO_WRITE_ATTESTATION)));
assert.equal(cp245Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp245Hermes.production_ready_candidate, true);
assert.equal(cp245Claude.review_packet, "C07.CP00-245.search_core_service_golden_head_descriptor");
assert.equal(cp245Claude.read_only, true);
assert.equal(cp245Handoff.to_pack_id, "CP00-246");
assert.equal(cp245Handoff.next_subphase_id, "RP07.P02.M07.S04");
assert.equal(cp246Coverage.valid, true, cp246Coverage.errors.join("; "));
assert.equal(cp246Coverage.summary.unit_count, 40);
assert.equal(cp246Coverage.summary.by_micro_phase["RP07.P02.M07"], 22);
assert.equal(cp246Slice.valid, true, cp246Slice.errors.join("; "));
assert.equal(cp246CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp246CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-246 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.golden_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp246Descriptor)),
  "contract golden_hermes_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp246_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP246_REQUIREMENTS)));
assert.deepEqual(searchContract.cp246_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP246_NO_WRITE_ATTESTATION)));
assert.equal(cp246Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp246Hermes.production_ready_candidate, true);
assert.equal(cp246Claude.review_packet, "C07.CP00-246.search_core_golden_hermes_slice_descriptor");
assert.equal(cp246Claude.read_only, true);
assert.equal(cp246Handoff.to_pack_id, "CP00-247");
assert.equal(cp246Handoff.next_subphase_id, "RP07.P02.M08.S19");
assert.equal(cp247Coverage.valid, true, cp247Coverage.errors.join("; "));
assert.equal(cp247Coverage.summary.unit_count, 150);
assert.equal(cp247Coverage.summary.by_phase["RP07.P02"], 46);
assert.equal(cp247Coverage.summary.by_phase["RP07.P03"], 104);
assert.equal(cp247Foundation.valid, true, cp247Foundation.errors.join("; "));
assert.equal(cp247CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp247CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-247 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p02_closeout_p03_interface_foundation_descriptor,
  JSON.parse(JSON.stringify(cp247Descriptor)),
  "contract p02_closeout_p03_interface_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp247_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP247_REQUIREMENTS)));
assert.deepEqual(searchContract.cp247_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION)));
assert.equal(cp247Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp247Hermes.production_ready_candidate, true);
assert.equal(cp247Claude.review_packet, "C07.CP00-247.search_core_p02_closeout_p03_interface_foundation_descriptor");
assert.equal(cp247Claude.read_only, true);
assert.equal(cp247Handoff.to_pack_id, "CP00-248");
assert.equal(cp247Handoff.next_subphase_id, "RP07.P03.M06.S01");
assert.equal(cp248Coverage.valid, true, cp248Coverage.errors.join("; "));
assert.equal(cp248Coverage.summary.unit_count, 150);
assert.equal(cp248Coverage.summary.by_phase["RP07.P03"], 92);
assert.equal(cp248Coverage.summary.by_phase["RP07.P04"], 58);
assert.equal(cp248Foundation.valid, true, cp248Foundation.errors.join("; "));
assert.equal(cp248CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp248CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-248 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p03_closeout_p04_ui_foundation_descriptor,
  JSON.parse(JSON.stringify(cp248Descriptor)),
  "contract p03_closeout_p04_ui_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp248_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP248_REQUIREMENTS)));
assert.deepEqual(searchContract.cp248_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP248_NO_WRITE_ATTESTATION)));
assert.equal(cp248Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp248Hermes.production_ready_candidate, true);
assert.equal(cp248Claude.review_packet, "C07.CP00-248.search_core_p03_closeout_p04_ui_foundation_descriptor");
assert.equal(cp248Claude.read_only, true);
assert.equal(cp248Handoff.to_pack_id, "CP00-249");
assert.equal(cp248Handoff.next_subphase_id, "RP07.P04.M03.S09");
assert.equal(cp249Coverage.valid, true, cp249Coverage.errors.join("; "));
assert.equal(cp249Coverage.summary.unit_count, 10);
assert.equal(cp249Coverage.summary.by_micro_phase["RP07.P04.M03"], 10);
assert.equal(cp249Mid.valid, true, cp249Mid.errors.join("; "));
assert.equal(cp249CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp249CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-249 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.ui_slice_mid_descriptor,
  JSON.parse(JSON.stringify(cp249Descriptor)),
  "contract ui_slice_mid_descriptor drift",
);
assert.deepEqual(searchContract.cp249_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP249_REQUIREMENTS)));
assert.deepEqual(searchContract.cp249_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP249_NO_WRITE_ATTESTATION)));
assert.equal(cp249Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp249Hermes.production_ready_candidate, true);
assert.equal(cp249Claude.review_packet, "C07.CP00-249.search_core_ui_slice_mid_descriptor");
assert.equal(cp249Claude.read_only, true);
assert.equal(cp249Handoff.to_pack_id, "CP00-250");
assert.equal(cp249Handoff.next_subphase_id, "RP07.P04.M03.S19");
assert.equal(cp250Coverage.valid, true, cp250Coverage.errors.join("; "));
assert.equal(cp250Coverage.summary.unit_count, 40);
assert.equal(cp250Coverage.summary.by_micro_phase["RP07.P04.M04"], 22);
assert.equal(cp250Slice.valid, true, cp250Slice.errors.join("; "));
assert.equal(cp250CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp250CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-250 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.ui_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp250Descriptor)),
  "contract ui_workflow_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp250_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP250_REQUIREMENTS)));
assert.deepEqual(searchContract.cp250_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP250_NO_WRITE_ATTESTATION)));
assert.equal(cp250Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp250Hermes.production_ready_candidate, true);
assert.equal(cp250Claude.review_packet, "C07.CP00-250.search_core_ui_workflow_slice_descriptor");
assert.equal(cp250Claude.read_only, true);
assert.equal(cp250Handoff.to_pack_id, "CP00-251");
assert.equal(cp250Handoff.next_subphase_id, "RP07.P04.M05.S15");
assert.equal(cp251Coverage.valid, true, cp251Coverage.errors.join("; "));
assert.equal(cp251Coverage.summary.unit_count, 10);
assert.equal(cp251Coverage.summary.by_micro_phase["RP07.P04.M05"], 8);
assert.equal(cp251Tail.valid, true, cp251Tail.errors.join("; "));
assert.equal(cp251CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp251CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-251 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.ui_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp251Descriptor)),
  "contract ui_binding_tail_descriptor drift",
);
assert.deepEqual(searchContract.cp251_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP251_REQUIREMENTS)));
assert.deepEqual(searchContract.cp251_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP251_NO_WRITE_ATTESTATION)));
assert.equal(cp251Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp251Hermes.production_ready_candidate, true);
assert.equal(cp251Claude.review_packet, "C07.CP00-251.search_core_ui_binding_tail_descriptor");
assert.equal(cp251Claude.read_only, true);
assert.equal(cp251Handoff.to_pack_id, "CP00-252");
assert.equal(cp251Handoff.next_subphase_id, "RP07.P04.M06.S03");
assert.equal(cp252Coverage.valid, true, cp252Coverage.errors.join("; "));
assert.equal(cp252Coverage.summary.unit_count, 150);
assert.equal(cp252Coverage.summary.by_phase["RP07.P04"], 106);
assert.equal(cp252Coverage.summary.by_phase["RP07.P05"], 44);
assert.equal(cp252Foundation.valid, true, cp252Foundation.errors.join("; "));
assert.equal(cp252CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp252CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-252 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p04_closeout_p05_fixture_foundation_descriptor,
  JSON.parse(JSON.stringify(cp252Descriptor)),
  "contract p04_closeout_p05_fixture_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp252_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP252_REQUIREMENTS)));
assert.deepEqual(searchContract.cp252_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP252_NO_WRITE_ATTESTATION)));
assert.equal(cp252Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp252Hermes.production_ready_candidate, true);
assert.equal(cp252Claude.review_packet, "C07.CP00-252.search_core_p04_closeout_p05_fixture_foundation_descriptor");
assert.equal(cp252Claude.read_only, true);
assert.equal(cp252Handoff.to_pack_id, "CP00-253");
assert.equal(cp252Handoff.next_subphase_id, "RP07.P05.M02.S15");
assert.equal(cp253Coverage.valid, true, cp253Coverage.errors.join("; "));
assert.equal(cp253Coverage.summary.unit_count, 40);
assert.equal(cp253Coverage.summary.by_micro_phase["RP07.P05.M03"], 22);
assert.equal(cp253Slice.valid, true, cp253Slice.errors.join("; "));
assert.equal(cp253CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp253CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-253 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp253Descriptor)),
  "contract fixture_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp253_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP253_REQUIREMENTS)));
assert.deepEqual(searchContract.cp253_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP253_NO_WRITE_ATTESTATION)));
assert.equal(cp253Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp253Hermes.production_ready_candidate, true);
assert.equal(cp253Claude.review_packet, "C07.CP00-253.search_core_fixture_slice_descriptor");
assert.equal(cp253Claude.read_only, true);
assert.equal(cp253Handoff.to_pack_id, "CP00-254");
assert.equal(cp253Handoff.next_subphase_id, "RP07.P05.M04.S13");
assert.equal(cp254Coverage.valid, true, cp254Coverage.errors.join("; "));
assert.equal(cp254Coverage.summary.unit_count, 40);
assert.equal(cp254Coverage.summary.by_micro_phase["RP07.P05.M05"], 22);
assert.equal(cp254Slice.valid, true, cp254Slice.errors.join("; "));
assert.equal(cp254CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp254CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-254 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.fixture_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp254Descriptor)),
  "contract fixture_binding_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp254_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP254_REQUIREMENTS)));
assert.deepEqual(searchContract.cp254_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP254_NO_WRITE_ATTESTATION)));
assert.equal(cp254Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp254Hermes.production_ready_candidate, true);
assert.equal(cp254Claude.review_packet, "C07.CP00-254.search_core_fixture_binding_slice_descriptor");
assert.equal(cp254Claude.read_only, true);
assert.equal(cp254Handoff.to_pack_id, "CP00-255");
assert.equal(cp254Handoff.next_subphase_id, "RP07.P05.M06.S09");
assert.equal(cp255Coverage.valid, true, cp255Coverage.errors.join("; "));
assert.equal(cp255Coverage.summary.unit_count, 10);
assert.equal(cp255Coverage.summary.by_micro_phase["RP07.P05.M06"], 10);
assert.equal(cp255Mid.valid, true, cp255Mid.errors.join("; "));
assert.equal(cp255CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp255CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-255 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.fixture_set_mid_descriptor,
  JSON.parse(JSON.stringify(cp255Descriptor)),
  "contract fixture_set_mid_descriptor drift",
);
assert.deepEqual(searchContract.cp255_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP255_REQUIREMENTS)));
assert.deepEqual(searchContract.cp255_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP255_NO_WRITE_ATTESTATION)));
assert.equal(cp255Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp255Hermes.production_ready_candidate, true);
assert.equal(cp255Claude.review_packet, "C07.CP00-255.search_core_fixture_set_mid_descriptor");
assert.equal(cp255Claude.read_only, true);
assert.equal(cp255Handoff.to_pack_id, "CP00-256");
assert.equal(cp255Handoff.next_subphase_id, "RP07.P05.M06.S19");
assert.equal(cp256Coverage.valid, true, cp256Coverage.errors.join("; "));
assert.equal(cp256Coverage.summary.unit_count, 150);
assert.equal(cp256Coverage.summary.by_phase["RP07.P05"], 90);
assert.equal(cp256Coverage.summary.by_phase["RP07.P06"], 60);
assert.equal(cp256Foundation.valid, true, cp256Foundation.errors.join("; "));
assert.equal(cp256CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp256CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-256 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p05_closeout_p06_permission_foundation_descriptor,
  JSON.parse(JSON.stringify(cp256Descriptor)),
  "contract p05_closeout_p06_permission_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp256_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP256_REQUIREMENTS)));
assert.deepEqual(searchContract.cp256_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP256_NO_WRITE_ATTESTATION)));
assert.equal(cp256Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp256Hermes.production_ready_candidate, true);
assert.equal(cp256Claude.review_packet, "C07.CP00-256.search_core_p05_closeout_p06_permission_foundation_descriptor");
assert.equal(cp256Claude.read_only, true);
assert.equal(cp256Handoff.to_pack_id, "CP00-257");
assert.equal(cp256Handoff.next_subphase_id, "RP07.P06.M02.S21");
assert.equal(cp257Coverage.valid, true, cp257Coverage.errors.join("; "));
assert.equal(cp257Coverage.summary.unit_count, 10);
assert.equal(cp257Coverage.summary.by_micro_phase["RP07.P06.M03"], 8);
assert.equal(cp257Head.valid, true, cp257Head.errors.join("; "));
assert.equal(cp257CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp257CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-257 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.permission_slice_head_descriptor,
  JSON.parse(JSON.stringify(cp257Descriptor)),
  "contract permission_slice_head_descriptor drift",
);
assert.deepEqual(searchContract.cp257_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP257_REQUIREMENTS)));
assert.deepEqual(searchContract.cp257_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP257_NO_WRITE_ATTESTATION)));
assert.equal(cp257Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp257Hermes.production_ready_candidate, true);
assert.equal(cp257Claude.review_packet, "C07.CP00-257.search_core_permission_slice_head_descriptor");
assert.equal(cp257Claude.read_only, true);
assert.equal(cp257Handoff.to_pack_id, "CP00-258");
assert.equal(cp257Handoff.next_subphase_id, "RP07.P06.M03.S09");
assert.equal(cp258Coverage.valid, true, cp258Coverage.errors.join("; "));
assert.equal(cp258Coverage.summary.unit_count, 40);
assert.equal(cp258Coverage.summary.by_micro_phase["RP07.P06.M04"], 23);
assert.equal(cp258Slice.valid, true, cp258Slice.errors.join("; "));
assert.equal(cp258CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp258CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-258 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.permission_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp258Descriptor)),
  "contract permission_workflow_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp258_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP258_REQUIREMENTS)));
assert.deepEqual(searchContract.cp258_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP258_NO_WRITE_ATTESTATION)));
assert.equal(cp258Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp258Hermes.production_ready_candidate, true);
assert.equal(cp258Claude.review_packet, "C07.CP00-258.search_core_permission_workflow_slice_descriptor");
assert.equal(cp258Claude.read_only, true);
assert.equal(cp258Handoff.to_pack_id, "CP00-259");
assert.equal(cp258Handoff.next_subphase_id, "RP07.P06.M04.S24");
assert.equal(cp259Coverage.valid, true, cp259Coverage.errors.join("; "));
assert.equal(cp259Coverage.summary.unit_count, 40);
assert.equal(cp259Coverage.summary.by_micro_phase["RP07.P06.M05"], 25);
assert.equal(cp259Slice.valid, true, cp259Slice.errors.join("; "));
assert.equal(cp259CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp259CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-259 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.permission_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp259Descriptor)),
  "contract permission_binding_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp259_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP259_REQUIREMENTS)));
assert.deepEqual(searchContract.cp259_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP259_NO_WRITE_ATTESTATION)));
assert.equal(cp259Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp259Hermes.production_ready_candidate, true);
assert.equal(cp259Claude.review_packet, "C07.CP00-259.search_core_permission_binding_slice_descriptor");
assert.equal(cp259Claude.read_only, true);
assert.equal(cp259Handoff.to_pack_id, "CP00-260");
assert.equal(cp259Handoff.next_subphase_id, "RP07.P06.M06.S14");
assert.equal(cp260Coverage.valid, true, cp260Coverage.errors.join("; "));
assert.equal(cp260Coverage.summary.unit_count, 150);
assert.equal(cp260Coverage.summary.by_phase["RP07.P06"], 98);
assert.equal(cp260Coverage.summary.by_phase["RP07.P07"], 52);
assert.equal(cp260Foundation.valid, true, cp260Foundation.errors.join("; "));
assert.equal(cp260CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp260CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-260 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p06_closeout_p07_failure_foundation_descriptor,
  JSON.parse(JSON.stringify(cp260Descriptor)),
  "contract p06_closeout_p07_failure_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp260_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP260_REQUIREMENTS)));
assert.deepEqual(searchContract.cp260_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP260_NO_WRITE_ATTESTATION)));
assert.equal(cp260Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp260Hermes.production_ready_candidate, true);
assert.equal(cp260Claude.review_packet, "C07.CP00-260.search_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp260Claude.read_only, true);
assert.equal(cp260Handoff.to_pack_id, "CP00-261");
assert.equal(cp260Handoff.next_subphase_id, "RP07.P07.M02.S13");
assert.equal(cp261Coverage.valid, true, cp261Coverage.errors.join("; "));
assert.equal(cp261Coverage.summary.unit_count, 40);
assert.equal(cp261Coverage.summary.by_micro_phase["RP07.P07.M03"], 25);
assert.equal(cp261Slice.valid, true, cp261Slice.errors.join("; "));
assert.equal(cp261CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp261CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-261 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.failure_slice_descriptor,
  JSON.parse(JSON.stringify(cp261Descriptor)),
  "contract failure_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp261_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP261_REQUIREMENTS)));
assert.deepEqual(searchContract.cp261_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP261_NO_WRITE_ATTESTATION)));
assert.equal(cp261Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp261Hermes.production_ready_candidate, true);
assert.equal(cp261Claude.review_packet, "C07.CP00-261.search_core_failure_slice_descriptor");
assert.equal(cp261Claude.read_only, true);
assert.equal(cp261Handoff.to_pack_id, "CP00-262");
assert.equal(cp261Handoff.next_subphase_id, "RP07.P07.M04.S06");
assert.equal(cp262Coverage.valid, true, cp262Coverage.errors.join("; "));
assert.equal(cp262Coverage.summary.unit_count, 40);
assert.equal(cp262Coverage.summary.by_micro_phase["RP07.P07.M05"], 20);
assert.equal(cp262Slice.valid, true, cp262Slice.errors.join("; "));
assert.equal(cp262CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp262CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-262 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.failure_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp262Descriptor)),
  "contract failure_binding_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp262_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP262_REQUIREMENTS)));
assert.deepEqual(searchContract.cp262_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP262_NO_WRITE_ATTESTATION)));
assert.equal(cp262Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp262Hermes.production_ready_candidate, true);
assert.equal(cp262Claude.review_packet, "C07.CP00-262.search_core_failure_binding_slice_descriptor");
assert.equal(cp262Claude.read_only, true);
assert.equal(cp262Handoff.to_pack_id, "CP00-263");
assert.equal(cp262Handoff.next_subphase_id, "RP07.P07.M05.S21");
assert.equal(cp263Coverage.valid, true, cp263Coverage.errors.join("; "));
assert.equal(cp263Coverage.summary.unit_count, 10);
assert.equal(cp263Coverage.summary.by_micro_phase["RP07.P07.M06"], 5);
assert.equal(cp263Tail.valid, true, cp263Tail.errors.join("; "));
assert.equal(cp263CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp263CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-263 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.failure_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp263Descriptor)),
  "contract failure_binding_tail_descriptor drift",
);
assert.deepEqual(searchContract.cp263_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP263_REQUIREMENTS)));
assert.deepEqual(searchContract.cp263_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP263_NO_WRITE_ATTESTATION)));
assert.equal(cp263Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp263Hermes.production_ready_candidate, true);
assert.equal(cp263Claude.review_packet, "C07.CP00-263.search_core_failure_binding_tail_descriptor");
assert.equal(cp263Claude.read_only, true);
assert.equal(cp263Handoff.to_pack_id, "CP00-264");
assert.equal(cp263Handoff.next_subphase_id, "RP07.P07.M06.S06");
assert.equal(cp264Coverage.valid, true, cp264Coverage.errors.join("; "));
assert.equal(cp264Coverage.summary.unit_count, 150);
assert.equal(cp264Coverage.summary.by_phase["RP07.P07"], 106);
assert.equal(cp264Coverage.summary.by_phase["RP07.P08"], 44);
assert.equal(cp264Foundation.valid, true, cp264Foundation.errors.join("; "));
assert.equal(cp264CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp264CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-264 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p07_closeout_p08_hermes_foundation_descriptor,
  JSON.parse(JSON.stringify(cp264Descriptor)),
  "contract p07_closeout_p08_hermes_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp264_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP264_REQUIREMENTS)));
assert.deepEqual(searchContract.cp264_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP264_NO_WRITE_ATTESTATION)));
assert.equal(cp264Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp264Hermes.production_ready_candidate, true);
assert.equal(cp264Claude.review_packet, "C07.CP00-264.search_core_p07_closeout_p08_hermes_foundation_descriptor");
assert.equal(cp264Claude.read_only, true);
assert.equal(cp264Handoff.to_pack_id, "CP00-265");
assert.equal(cp264Handoff.next_subphase_id, "RP07.P08.M02.S15");
assert.equal(cp265Coverage.valid, true, cp265Coverage.errors.join("; "));
assert.equal(cp265Coverage.summary.unit_count, 40);
assert.equal(cp265Coverage.summary.by_micro_phase["RP07.P08.M03"], 22);
assert.equal(cp265Slice.valid, true, cp265Slice.errors.join("; "));
assert.equal(cp265CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp265CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-265 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp265Descriptor)),
  "contract hermes_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp265_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP265_REQUIREMENTS)));
assert.deepEqual(searchContract.cp265_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP265_NO_WRITE_ATTESTATION)));
assert.equal(cp265Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp265Hermes.production_ready_candidate, true);
assert.equal(cp265Claude.review_packet, "C07.CP00-265.search_core_hermes_slice_descriptor");
assert.equal(cp265Claude.read_only, true);
assert.equal(cp265Handoff.to_pack_id, "CP00-266");
assert.equal(cp265Handoff.next_subphase_id, "RP07.P08.M04.S13");
assert.equal(cp266Coverage.valid, true, cp266Coverage.errors.join("; "));
assert.equal(cp266Coverage.summary.unit_count, 40);
assert.equal(cp266Coverage.summary.by_micro_phase["RP07.P08.M05"], 22);
assert.equal(cp266Slice.valid, true, cp266Slice.errors.join("; "));
assert.equal(cp266CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp266CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-266 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.hermes_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp266Descriptor)),
  "contract hermes_binding_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp266_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP266_REQUIREMENTS)));
assert.deepEqual(searchContract.cp266_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP266_NO_WRITE_ATTESTATION)));
assert.equal(cp266Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp266Hermes.production_ready_candidate, true);
assert.equal(cp266Claude.review_packet, "C07.CP00-266.search_core_hermes_binding_slice_descriptor");
assert.equal(cp266Claude.read_only, true);
assert.equal(cp266Handoff.to_pack_id, "CP00-267");
assert.equal(cp266Handoff.next_subphase_id, "RP07.P08.M06.S09");
assert.equal(cp267Coverage.valid, true, cp267Coverage.errors.join("; "));
assert.equal(cp267Coverage.summary.unit_count, 150);
assert.equal(cp267Coverage.summary.by_phase["RP07.P08"], 100);
assert.equal(cp267Coverage.summary.by_phase["RP07.P09"], 50);
assert.equal(cp267Foundation.valid, true, cp267Foundation.errors.join("; "));
assert.equal(cp267CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp267CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-267 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p08_closeout_p09_review_foundation_descriptor,
  JSON.parse(JSON.stringify(cp267Descriptor)),
  "contract p08_closeout_p09_review_foundation_descriptor drift",
);
assert.deepEqual(searchContract.cp267_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP267_REQUIREMENTS)));
assert.deepEqual(searchContract.cp267_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP267_NO_WRITE_ATTESTATION)));
assert.equal(cp267Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp267Hermes.production_ready_candidate, true);
assert.equal(cp267Claude.review_packet, "C07.CP00-267.search_core_p08_closeout_p09_review_foundation_descriptor");
assert.equal(cp267Claude.read_only, true);
assert.equal(cp267Handoff.to_pack_id, "CP00-268");
assert.equal(cp267Handoff.next_subphase_id, "RP07.P09.M03.S11");
assert.equal(cp268Coverage.valid, true, cp268Coverage.errors.join("; "));
assert.equal(cp268Coverage.summary.unit_count, 40);
assert.equal(cp268Coverage.summary.by_micro_phase["RP07.P09.M04"], 20);
assert.equal(cp268Slice.valid, true, cp268Slice.errors.join("; "));
assert.equal(cp268CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp268CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-268 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.review_slice_descriptor,
  JSON.parse(JSON.stringify(cp268Descriptor)),
  "contract review_slice_descriptor drift",
);
assert.deepEqual(searchContract.cp268_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP268_REQUIREMENTS)));
assert.deepEqual(searchContract.cp268_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP268_NO_WRITE_ATTESTATION)));
assert.equal(cp268Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp268Hermes.production_ready_candidate, true);
assert.equal(cp268Claude.review_packet, "C07.CP00-268.search_core_review_slice_descriptor");
assert.equal(cp268Claude.read_only, true);
assert.equal(cp268Handoff.to_pack_id, "CP00-269");
assert.equal(cp268Handoff.next_subphase_id, "RP07.P09.M05.S09");
assert.equal(cp269Coverage.valid, true, cp269Coverage.errors.join("; "));
assert.equal(cp269Coverage.summary.unit_count, 10);
assert.equal(cp269Coverage.summary.by_micro_phase["RP07.P09.M05"], 10);
assert.equal(cp269Mid.valid, true, cp269Mid.errors.join("; "));
assert.equal(cp269CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp269CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-269 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.review_binding_mid_descriptor,
  JSON.parse(JSON.stringify(cp269Descriptor)),
  "contract review_binding_mid_descriptor drift",
);
assert.deepEqual(searchContract.cp269_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP269_REQUIREMENTS)));
assert.deepEqual(searchContract.cp269_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP269_NO_WRITE_ATTESTATION)));
assert.equal(cp269Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp269Hermes.production_ready_candidate, true);
assert.equal(cp269Claude.review_packet, "C07.CP00-269.search_core_review_binding_mid_descriptor");
assert.equal(cp269Claude.read_only, true);
assert.equal(cp269Handoff.to_pack_id, "CP00-270");
assert.equal(cp269Handoff.next_subphase_id, "RP07.P09.M05.S19");
assert.equal(cp270Coverage.valid, true, cp270Coverage.errors.join("; "));
assert.equal(cp270Coverage.summary.unit_count, 10);
assert.equal(cp270Coverage.summary.by_micro_phase["RP07.P09.M06"], 6);
assert.equal(cp270Tail.valid, true, cp270Tail.errors.join("; "));
assert.equal(cp270CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp270CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-270 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.review_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp270Descriptor)),
  "contract review_binding_tail_descriptor drift",
);
assert.deepEqual(searchContract.cp270_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP270_REQUIREMENTS)));
assert.deepEqual(searchContract.cp270_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP270_NO_WRITE_ATTESTATION)));
assert.equal(cp270Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp270Hermes.production_ready_candidate, true);
assert.equal(cp270Claude.review_packet, "C07.CP00-270.search_core_review_binding_tail_descriptor");
assert.equal(cp270Claude.read_only, true);
assert.equal(cp270Handoff.to_pack_id, "CP00-271");
assert.equal(cp270Handoff.next_subphase_id, "RP07.P09.M06.S07");
assert.equal(cp271Coverage.valid, true, cp271Coverage.errors.join("; "));
assert.equal(cp271Coverage.summary.unit_count, 86);
assert.equal(cp271Coverage.summary.by_micro_phase["RP07.P09.M07"], 22);
assert.equal(cp271Closeout.valid, true, cp271Closeout.errors.join("; "));
assert.equal(cp271CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp271CaseSet.sections[microId].rows[searchCoreRowKey(title)];
    assert.ok(row, `CP00-271 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  searchContract.p09_closeout_descriptor,
  JSON.parse(JSON.stringify(cp271Descriptor)),
  "contract p09_closeout_descriptor drift",
);
assert.deepEqual(searchContract.cp271_requirements, JSON.parse(JSON.stringify(SEARCH_CORE_CP271_REQUIREMENTS)));
assert.deepEqual(searchContract.cp271_no_write_attestation, JSON.parse(JSON.stringify(SEARCH_CORE_CP271_NO_WRITE_ATTESTATION)));
assert.equal(cp271Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp271Hermes.production_ready_candidate, true);
assert.equal(cp271Claude.review_packet, "C07.CP00-271.search_core_p09_closeout_descriptor");
assert.equal(cp271Claude.read_only, true);
assert.equal(cp271Handoff.to_pack_id, "CP00-272");
assert.equal(cp271Handoff.next_subphase_id, "RP08.P00.M00.S01");
assert.equal(SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.closes_rp07_descriptor_scope, true);
assert.equal(SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP270_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP270_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP269_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP269_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP268_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP268_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP267_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP267_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP266_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP266_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP265_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP265_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP264_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP264_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.silent_success_detected, false);
assert.equal(SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.silent_success_detected, false);
assert.equal(SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.silent_success_detected, false);
assert.equal(SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP260_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP260_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
assert.equal(SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
assert.equal(SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.deny_over_allow_enforced, true);
assert.equal(SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.deny_over_allow_enforced, true);
assert.equal(SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP255_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP255_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.id_drift_detected, false);
assert.equal(SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.id_drift_detected, false);
assert.equal(SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP252_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP252_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP251_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP251_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.unauthorized_count_leak_detected, false);
assert.equal(SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.ui_leak_detected, false);
assert.equal(SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.ui_leak_detected, false);
assert.equal(SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.schema_drift_detected, false);
assert.equal(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.breaking_change_detected, false);
assert.equal(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP246_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP246_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP245_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP245_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP244_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP244_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP243_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP243_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP242_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP242_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP241_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP241_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP240_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP240_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP239_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP239_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
assert.equal(SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
assert.equal(SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_search_runtime, false);
assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_ocr_runtime, false);
assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_index_runtime, false);
assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(searchContract.historical_pack_bindings.at(-1).pack_id, "CP00-271");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp07:search-core:validate",
      pack_id: SEARCH_CORE_CP271_PACK_BINDING.pack_id,
      covered_units: cp271Coverage.summary.unit_count,
      program_id: SEARCH_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp271Hermes.gate,
      claude_gate: searchContract.current_pack.claude_gate,
      source_review_binding_tail_pack_id: SEARCH_CORE_CP271_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp235Coverage.summary.unit_count,
      model_storage_slice_units_preserved: cp236Coverage.summary.unit_count,
      model_binding_slice_units_preserved: cp237Coverage.summary.unit_count,
      p01_closeout_p02_service_foundation_units_preserved: cp238Coverage.summary.unit_count,
      service_slice_units_preserved: cp239Coverage.summary.unit_count,
      service_workflow_tail_units_preserved: cp240Coverage.summary.unit_count,
      service_audit_binding_units_preserved: cp241Coverage.summary.unit_count,
      service_binding_mid_units_preserved: cp242Coverage.summary.unit_count,
      service_fixture_head_units_preserved: cp243Coverage.summary.unit_count,
      service_fixture_mid_units_preserved: cp244Coverage.summary.unit_count,
      service_golden_head_units_preserved: cp245Coverage.summary.unit_count,
      golden_hermes_slice_units_preserved: cp246Coverage.summary.unit_count,
      p02_closeout_p03_interface_foundation_units_preserved: cp247Coverage.summary.unit_count,
      p03_closeout_p04_ui_foundation_units_preserved: cp248Coverage.summary.unit_count,
      ui_slice_mid_units_preserved: cp249Coverage.summary.unit_count,
      ui_workflow_slice_units_preserved: cp250Coverage.summary.unit_count,
      ui_binding_tail_units_preserved: cp251Coverage.summary.unit_count,
      p04_closeout_p05_fixture_foundation_units_preserved: cp252Coverage.summary.unit_count,
      fixture_slice_units_preserved: cp253Coverage.summary.unit_count,
      fixture_binding_slice_units_preserved: cp254Coverage.summary.unit_count,
      fixture_set_mid_units_preserved: cp255Coverage.summary.unit_count,
      p05_closeout_p06_permission_foundation_units_preserved: cp256Coverage.summary.unit_count,
      permission_slice_head_units_preserved: cp257Coverage.summary.unit_count,
      permission_workflow_slice_units_preserved: cp258Coverage.summary.unit_count,
      permission_binding_slice_units_preserved: cp259Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp260Coverage.summary.unit_count,
      failure_slice_units_preserved: cp261Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp262Coverage.summary.unit_count,
      failure_binding_tail_units_preserved: cp263Coverage.summary.unit_count,
      p07_closeout_p08_hermes_foundation_units_preserved: cp264Coverage.summary.unit_count,
      hermes_slice_units_preserved: cp265Coverage.summary.unit_count,
      hermes_binding_slice_units_preserved: cp266Coverage.summary.unit_count,
      p08_closeout_p09_review_foundation_units_preserved: cp267Coverage.summary.unit_count,
      review_slice_units_preserved: cp268Coverage.summary.unit_count,
      review_binding_mid_units_preserved: cp269Coverage.summary.unit_count,
      review_binding_tail_units_preserved: cp270Coverage.summary.unit_count,
      next_pack_id: cp271Handoff.to_pack_id,
      production_ready_candidate: cp271Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
