import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

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
} from "../src/index.js";

const searchContract = JSON.parse(
  readFileSync(new URL("../../../contracts/search-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp235ManifestPath = new URL("../../../docs/closeout-packs/cp00-235/manifest.json", import.meta.url);
const cp235Manifest = existsSync(cp235ManifestPath) ? JSON.parse(readFileSync(cp235ManifestPath, "utf8")) : null;
const cp235PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-235") ?? cp235Manifest?.plan_binding_snapshot;
const cp236ManifestPath = new URL("../../../docs/closeout-packs/cp00-236/manifest.json", import.meta.url);
const cp236Manifest = existsSync(cp236ManifestPath) ? JSON.parse(readFileSync(cp236ManifestPath, "utf8")) : null;
const cp236PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-236") ?? cp236Manifest?.plan_binding_snapshot;
const cp237ManifestPath = new URL("../../../docs/closeout-packs/cp00-237/manifest.json", import.meta.url);
const cp237Manifest = existsSync(cp237ManifestPath) ? JSON.parse(readFileSync(cp237ManifestPath, "utf8")) : null;
const cp237PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-237") ?? cp237Manifest?.plan_binding_snapshot;
const cp238ManifestPath = new URL("../../../docs/closeout-packs/cp00-238/manifest.json", import.meta.url);
const cp238Manifest = existsSync(cp238ManifestPath) ? JSON.parse(readFileSync(cp238ManifestPath, "utf8")) : null;
const cp238PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-238") ?? cp238Manifest?.plan_binding_snapshot;
const cp239ManifestPath = new URL("../../../docs/closeout-packs/cp00-239/manifest.json", import.meta.url);
const cp239Manifest = existsSync(cp239ManifestPath) ? JSON.parse(readFileSync(cp239ManifestPath, "utf8")) : null;
const cp239PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-239") ?? cp239Manifest?.plan_binding_snapshot;
const cp240ManifestPath = new URL("../../../docs/closeout-packs/cp00-240/manifest.json", import.meta.url);
const cp240Manifest = existsSync(cp240ManifestPath) ? JSON.parse(readFileSync(cp240ManifestPath, "utf8")) : null;
const cp240PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-240") ?? cp240Manifest?.plan_binding_snapshot;
const cp241ManifestPath = new URL("../../../docs/closeout-packs/cp00-241/manifest.json", import.meta.url);
const cp241Manifest = existsSync(cp241ManifestPath) ? JSON.parse(readFileSync(cp241ManifestPath, "utf8")) : null;
const cp241PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-241") ?? cp241Manifest?.plan_binding_snapshot;
const cp242ManifestPath = new URL("../../../docs/closeout-packs/cp00-242/manifest.json", import.meta.url);
const cp242Manifest = existsSync(cp242ManifestPath) ? JSON.parse(readFileSync(cp242ManifestPath, "utf8")) : null;
const cp242PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-242") ?? cp242Manifest?.plan_binding_snapshot;
const cp243ManifestPath = new URL("../../../docs/closeout-packs/cp00-243/manifest.json", import.meta.url);
const cp243Manifest = existsSync(cp243ManifestPath) ? JSON.parse(readFileSync(cp243ManifestPath, "utf8")) : null;
const cp243PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-243") ?? cp243Manifest?.plan_binding_snapshot;
const cp244ManifestPath = new URL("../../../docs/closeout-packs/cp00-244/manifest.json", import.meta.url);
const cp244Manifest = existsSync(cp244ManifestPath) ? JSON.parse(readFileSync(cp244ManifestPath, "utf8")) : null;
const cp244PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-244") ?? cp244Manifest?.plan_binding_snapshot;
const cp245ManifestPath = new URL("../../../docs/closeout-packs/cp00-245/manifest.json", import.meta.url);
const cp245Manifest = existsSync(cp245ManifestPath) ? JSON.parse(readFileSync(cp245ManifestPath, "utf8")) : null;
const cp245PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-245") ?? cp245Manifest?.plan_binding_snapshot;
const cp246ManifestPath = new URL("../../../docs/closeout-packs/cp00-246/manifest.json", import.meta.url);
const cp246Manifest = existsSync(cp246ManifestPath) ? JSON.parse(readFileSync(cp246ManifestPath, "utf8")) : null;
const cp246PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-246") ?? cp246Manifest?.plan_binding_snapshot;
const cp247ManifestPath = new URL("../../../docs/closeout-packs/cp00-247/manifest.json", import.meta.url);
const cp247Manifest = existsSync(cp247ManifestPath) ? JSON.parse(readFileSync(cp247ManifestPath, "utf8")) : null;
const cp247PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-247") ?? cp247Manifest?.plan_binding_snapshot;
const cp248ManifestPath = new URL("../../../docs/closeout-packs/cp00-248/manifest.json", import.meta.url);
const cp248Manifest = existsSync(cp248ManifestPath) ? JSON.parse(readFileSync(cp248ManifestPath, "utf8")) : null;
const cp248PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-248") ?? cp248Manifest?.plan_binding_snapshot;
const cp249ManifestPath = new URL("../../../docs/closeout-packs/cp00-249/manifest.json", import.meta.url);
const cp249Manifest = existsSync(cp249ManifestPath) ? JSON.parse(readFileSync(cp249ManifestPath, "utf8")) : null;
const cp249PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-249") ?? cp249Manifest?.plan_binding_snapshot;
const cp250ManifestPath = new URL("../../../docs/closeout-packs/cp00-250/manifest.json", import.meta.url);
const cp250Manifest = existsSync(cp250ManifestPath) ? JSON.parse(readFileSync(cp250ManifestPath, "utf8")) : null;
const cp250PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-250") ?? cp250Manifest?.plan_binding_snapshot;
const cp251ManifestPath = new URL("../../../docs/closeout-packs/cp00-251/manifest.json", import.meta.url);
const cp251Manifest = existsSync(cp251ManifestPath) ? JSON.parse(readFileSync(cp251ManifestPath, "utf8")) : null;
const cp251PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-251") ?? cp251Manifest?.plan_binding_snapshot;
const cp252ManifestPath = new URL("../../../docs/closeout-packs/cp00-252/manifest.json", import.meta.url);
const cp252Manifest = existsSync(cp252ManifestPath) ? JSON.parse(readFileSync(cp252ManifestPath, "utf8")) : null;
const cp252PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-252") ?? cp252Manifest?.plan_binding_snapshot;
const cp253ManifestPath = new URL("../../../docs/closeout-packs/cp00-253/manifest.json", import.meta.url);
const cp253Manifest = existsSync(cp253ManifestPath) ? JSON.parse(readFileSync(cp253ManifestPath, "utf8")) : null;
const cp253PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-253") ?? cp253Manifest?.plan_binding_snapshot;
const cp254ManifestPath = new URL("../../../docs/closeout-packs/cp00-254/manifest.json", import.meta.url);
const cp254Manifest = existsSync(cp254ManifestPath) ? JSON.parse(readFileSync(cp254ManifestPath, "utf8")) : null;
const cp254PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-254") ?? cp254Manifest?.plan_binding_snapshot;
const cp255ManifestPath = new URL("../../../docs/closeout-packs/cp00-255/manifest.json", import.meta.url);
const cp255Manifest = existsSync(cp255ManifestPath) ? JSON.parse(readFileSync(cp255ManifestPath, "utf8")) : null;
const cp255PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-255") ?? cp255Manifest?.plan_binding_snapshot;
const cp256ManifestPath = new URL("../../../docs/closeout-packs/cp00-256/manifest.json", import.meta.url);
const cp256Manifest = existsSync(cp256ManifestPath) ? JSON.parse(readFileSync(cp256ManifestPath, "utf8")) : null;
const cp256PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-256") ?? cp256Manifest?.plan_binding_snapshot;
const cp257ManifestPath = new URL("../../../docs/closeout-packs/cp00-257/manifest.json", import.meta.url);
const cp257Manifest = existsSync(cp257ManifestPath) ? JSON.parse(readFileSync(cp257ManifestPath, "utf8")) : null;
const cp257PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-257") ?? cp257Manifest?.plan_binding_snapshot;
const cp258ManifestPath = new URL("../../../docs/closeout-packs/cp00-258/manifest.json", import.meta.url);
const cp258Manifest = existsSync(cp258ManifestPath) ? JSON.parse(readFileSync(cp258ManifestPath, "utf8")) : null;
const cp258PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-258") ?? cp258Manifest?.plan_binding_snapshot;
const cp259ManifestPath = new URL("../../../docs/closeout-packs/cp00-259/manifest.json", import.meta.url);
const cp259Manifest = existsSync(cp259ManifestPath) ? JSON.parse(readFileSync(cp259ManifestPath, "utf8")) : null;
const cp259PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-259") ?? cp259Manifest?.plan_binding_snapshot;
const cp260ManifestPath = new URL("../../../docs/closeout-packs/cp00-260/manifest.json", import.meta.url);
const cp260Manifest = existsSync(cp260ManifestPath) ? JSON.parse(readFileSync(cp260ManifestPath, "utf8")) : null;
const cp260PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-260") ?? cp260Manifest?.plan_binding_snapshot;
const cp261ManifestPath = new URL("../../../docs/closeout-packs/cp00-261/manifest.json", import.meta.url);
const cp261Manifest = existsSync(cp261ManifestPath) ? JSON.parse(readFileSync(cp261ManifestPath, "utf8")) : null;
const cp261PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-261") ?? cp261Manifest?.plan_binding_snapshot;
const cp262ManifestPath = new URL("../../../docs/closeout-packs/cp00-262/manifest.json", import.meta.url);
const cp262Manifest = existsSync(cp262ManifestPath) ? JSON.parse(readFileSync(cp262ManifestPath, "utf8")) : null;
const cp262PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-262") ?? cp262Manifest?.plan_binding_snapshot;
const cp263ManifestPath = new URL("../../../docs/closeout-packs/cp00-263/manifest.json", import.meta.url);
const cp263Manifest = existsSync(cp263ManifestPath) ? JSON.parse(readFileSync(cp263ManifestPath, "utf8")) : null;
const cp263PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-263") ?? cp263Manifest?.plan_binding_snapshot;
const cp264ManifestPath = new URL("../../../docs/closeout-packs/cp00-264/manifest.json", import.meta.url);
const cp264Manifest = existsSync(cp264ManifestPath) ? JSON.parse(readFileSync(cp264ManifestPath, "utf8")) : null;
const cp264PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-264") ?? cp264Manifest?.plan_binding_snapshot;
const cp265ManifestPath = new URL("../../../docs/closeout-packs/cp00-265/manifest.json", import.meta.url);
const cp265Manifest = existsSync(cp265ManifestPath) ? JSON.parse(readFileSync(cp265ManifestPath, "utf8")) : null;
const cp265PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-265") ?? cp265Manifest?.plan_binding_snapshot;
const cp266ManifestPath = new URL("../../../docs/closeout-packs/cp00-266/manifest.json", import.meta.url);
const cp266Manifest = existsSync(cp266ManifestPath) ? JSON.parse(readFileSync(cp266ManifestPath, "utf8")) : null;
const cp266PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-266") ?? cp266Manifest?.plan_binding_snapshot;
const cp267ManifestPath = new URL("../../../docs/closeout-packs/cp00-267/manifest.json", import.meta.url);
const cp267Manifest = existsSync(cp267ManifestPath) ? JSON.parse(readFileSync(cp267ManifestPath, "utf8")) : null;
const cp267PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-267") ?? cp267Manifest?.plan_binding_snapshot;
const cp268ManifestPath = new URL("../../../docs/closeout-packs/cp00-268/manifest.json", import.meta.url);
const cp268Manifest = existsSync(cp268ManifestPath) ? JSON.parse(readFileSync(cp268ManifestPath, "utf8")) : null;
const cp268PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-268") ?? cp268Manifest?.plan_binding_snapshot;
const cp269ManifestPath = new URL("../../../docs/closeout-packs/cp00-269/manifest.json", import.meta.url);
const cp269Manifest = existsSync(cp269ManifestPath) ? JSON.parse(readFileSync(cp269ManifestPath, "utf8")) : null;
const cp269PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-269") ?? cp269Manifest?.plan_binding_snapshot;
const cp270ManifestPath = new URL("../../../docs/closeout-packs/cp00-270/manifest.json", import.meta.url);
const cp270Manifest = existsSync(cp270ManifestPath) ? JSON.parse(readFileSync(cp270ManifestPath, "utf8")) : null;
const cp270PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-270") ?? cp270Manifest?.plan_binding_snapshot;
const cp271ManifestPath = new URL("../../../docs/closeout-packs/cp00-271/manifest.json", import.meta.url);
const cp271Manifest = existsSync(cp271ManifestPath) ? JSON.parse(readFileSync(cp271ManifestPath, "utf8")) : null;
const cp271PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-271") ?? cp271Manifest?.plan_binding_snapshot;

test("search core program contract binds RP07 with descriptor-only boundaries", () => {
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.program_id, "RP07");
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.program_title, "Search OCR And Index");
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP06");
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.hermes_gate, "H07");
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.claude_gate, "C07");
  assert.equal(SEARCH_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.equal(searchContract.program.program_id, "RP07");
  assert.ok(
    ["CP00-235", "CP00-236", "CP00-237", "CP00-238", "CP00-239", "CP00-240", "CP00-241", "CP00-242", "CP00-243", "CP00-244", "CP00-245", "CP00-246", "CP00-247", "CP00-248", "CP00-249", "CP00-250", "CP00-251", "CP00-252", "CP00-253", "CP00-254", "CP00-255", "CP00-256", "CP00-257", "CP00-258", "CP00-259", "CP00-260", "CP00-261", "CP00-262", "CP00-263", "CP00-264", "CP00-265", "CP00-266", "CP00-267", "CP00-268", "CP00-269", "CP00-270", "CP00-271"].includes(
      searchContract.current_pack.pack_id,
    ),
  );
});

test("CP00-235 plan binding covers the planned 150 RP07 scope contract foundation units", () => {
  const coverage = validateSearchCoreCp235Coverage(cp235PlanPack);

  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.pack_id, "CP00-235");
  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.range, "RP07.P00.M00.S01-RP07.P01.M02.S08");
  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.upstream_pack_id, "CP00-234");
  assert.equal(SEARCH_CORE_CP235_PACK_BINDING.next_pack_id, "CP00-236");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP07.P01"], 28);
  assert.equal(Object.keys(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-235 scope contract foundation rows stay descriptor-only with runtime non-goals", () => {
  const caseSet = createSearchCoreCp235ScopeContractFoundationCaseSet();
  const descriptor = createSearchCoreCp235ScopeContractFoundationDescriptor();
  const validation = validateSearchCoreCp235ScopeContractFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP07.P00.M00"].rows;
  assert.equal(m00.non_goal_boundary.search_runtime_opened, false);
  assert.equal(m00.non_goal_boundary.ocr_runtime_opened, false);
  assert.equal(m00.non_goal_boundary.index_runtime_opened, false);
  assert.equal(m00.acceptance_gate_definition.hermes_gate, "H07");
  const p01 = caseSet.sections["RP07.P01.M00"].rows;
  assert.equal(p01.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(p01.matter_trace_reference.matter_trace_required, true);
  assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_search_runtime, false);
  assert.equal(SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_ocr_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-235 evidence packets and handoff preserve search foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp235ScopeContractFoundationDescriptor();
  const hermes = createSearchCoreCp235HermesEvidencePacket(cp235PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp235ClaudeReviewPacket(cp235PlanPack);
  const handoff = createSearchCoreCp235CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H07");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.deepEqual(SEARCH_CORE_CP235_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.handoff_id, "CP00-235-to-CP00-236");
  assert.equal(handoff.next_subphase_id, "RP07.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "search_core_scope_contract_foundation_descriptor_verified");
});

test("CP00-236 plan binding covers the planned 40 RP07 model storage slice units", () => {
  const coverage = validateSearchCoreCp236Coverage(cp236PlanPack);

  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.pack_id, "CP00-236");
  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.range, "RP07.P01.M02.S09-RP07.P01.M04.S06");
  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.upstream_pack_id, "CP00-235");
  assert.equal(SEARCH_CORE_CP236_PACK_BINDING.next_pack_id, "CP00-237");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P01.M03"], 22);
});

test("CP00-236 model storage slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp236ModelStorageSliceCaseSet();
  const descriptor = createSearchCoreCp236ModelStorageSliceDescriptor();
  const validation = validateSearchCoreCp236ModelStorageSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P01.M03"].rows;
  assert.equal(m03.ownership_drift_test.ownership_drift_detected, false);
  assert.equal(m03.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(m03.documentation_entry.documentation_entry, "packages/search/README.md#cp00-236");
  assert.equal(SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-236 evidence packets and handoff preserve model storage slice authority boundaries", () => {
  const descriptor = createSearchCoreCp236ModelStorageSliceDescriptor();
  const hermes = createSearchCoreCp236HermesEvidencePacket(cp236PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp236ClaudeReviewPacket(cp236PlanPack);
  const handoff = createSearchCoreCp236CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-236-to-CP00-237");
  assert.equal(handoff.next_subphase_id, "RP07.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "search_core_model_storage_slice_descriptor_verified");
});

test("CP00-237 plan binding covers the planned 40 RP07 model binding slice units", () => {
  const coverage = validateSearchCoreCp237Coverage(cp237PlanPack);

  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.pack_id, "CP00-237");
  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.range, "RP07.P01.M04.S07-RP07.P01.M06.S04");
  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.upstream_pack_id, "CP00-236");
  assert.equal(SEARCH_CORE_CP237_PACK_BINDING.next_pack_id, "CP00-238");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P01.M05"], 22);
});

test("CP00-237 model binding slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp237ModelBindingSliceCaseSet();
  const descriptor = createSearchCoreCp237ModelBindingSliceDescriptor();
  const validation = validateSearchCoreCp237ModelBindingSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P01.M05"].rows;
  assert.equal(m05.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(m05.documentation_entry.documentation_entry, "packages/search/README.md#cp00-237");
  assert.equal(SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-237 evidence packets and handoff preserve model binding slice authority boundaries", () => {
  const descriptor = createSearchCoreCp237ModelBindingSliceDescriptor();
  const hermes = createSearchCoreCp237HermesEvidencePacket(cp237PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp237ClaudeReviewPacket(cp237PlanPack);
  const handoff = createSearchCoreCp237CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-237-to-CP00-238");
  assert.equal(handoff.next_subphase_id, "RP07.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "search_core_model_binding_slice_descriptor_verified");
});

test("CP00-238 plan binding covers the planned 150 RP07 P01-closeout and P02-service-foundation units", () => {
  const coverage = validateSearchCoreCp238Coverage(cp238PlanPack);

  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.pack_id, "CP00-238");
  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.range, "RP07.P01.M06.S05-RP07.P02.M02.S22");
  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.upstream_pack_id, "CP00-237");
  assert.equal(SEARCH_CORE_CP238_PACK_BINDING.next_pack_id, "CP00-239");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P01"], 88);
  assert.equal(coverage.summary.by_phase["RP07.P02"], 62);
  assert.equal(Object.keys(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-238 service foundation rows stay descriptor-only with runtime boundaries", () => {
  const caseSet = createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet();
  const descriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor();
  const validation = validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP07.P02.M00"].rows;
  assert.equal(m00.service_entrypoint_contract.dispatches_search_runtime, false);
  assert.equal(m00.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m00.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m00.unit_test_denied_path.expected_outcome, "denied_customer_safe");
  assert.equal(SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-238 evidence packets and handoff preserve service foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor();
  const hermes = createSearchCoreCp238HermesEvidencePacket(cp238PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp238ClaudeReviewPacket(cp238PlanPack);
  const handoff = createSearchCoreCp238CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-238-to-CP00-239");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "search_core_p01_closeout_p02_service_foundation_descriptor_verified");
});

test("CP00-239 plan binding covers the planned 40 RP07 service slice units", () => {
  const coverage = validateSearchCoreCp239Coverage(cp239PlanPack);

  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.pack_id, "CP00-239");
  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.range, "RP07.P02.M03.S01-RP07.P02.M04.S15");
  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.upstream_pack_id, "CP00-238");
  assert.equal(SEARCH_CORE_CP239_PACK_BINDING.next_pack_id, "CP00-240");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M03"], 25);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M04"], 15);
});

test("CP00-239 service slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp239ServiceSliceCaseSet();
  const descriptor = createSearchCoreCp239ServiceSliceDescriptor();
  const validation = validateSearchCoreCp239ServiceSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P02.M03"].rows;
  assert.equal(m03.golden_fixture_binding.real_client_data_loaded, false);
  assert.equal(m03.hermes_service_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(m03.claude_service_review_prompt.read_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-239 evidence packets and handoff preserve service slice authority boundaries", () => {
  const descriptor = createSearchCoreCp239ServiceSliceDescriptor();
  const hermes = createSearchCoreCp239HermesEvidencePacket(cp239PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp239ClaudeReviewPacket(cp239PlanPack);
  const handoff = createSearchCoreCp239CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-239-to-CP00-240");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M04.S16");
  assert.equal(handoff.production_ready_flag, "search_core_service_slice_descriptor_verified");
});

test("CP00-240 plan binding covers the planned 10 RP07 service workflow tail units", () => {
  const coverage = validateSearchCoreCp240Coverage(cp240PlanPack);

  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.pack_id, "CP00-240");
  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.range, "RP07.P02.M04.S16-RP07.P02.M04.S25");
  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.upstream_pack_id, "CP00-239");
  assert.equal(SEARCH_CORE_CP240_PACK_BINDING.next_pack_id, "CP00-241");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M04"], 10);
});

test("CP00-240 service workflow tail rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp240ServiceWorkflowTailCaseSet();
  const descriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor();
  const validation = validateSearchCoreCp240ServiceWorkflowTailDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP07.P02.M04"].rows;
  assert.equal(m04.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m04.retry_behavior.performs_retry_runtime, false);
  assert.equal(m04.blocked_claim_output.customer_safe_error_code, "SEARCH_BLOCKED_CLAIM");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-240 evidence packets and handoff preserve service workflow tail authority boundaries", () => {
  const descriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor();
  const hermes = createSearchCoreCp240HermesEvidencePacket(cp240PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp240ClaudeReviewPacket(cp240PlanPack);
  const handoff = createSearchCoreCp240CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-240-to-CP00-241");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M05.S01");
  assert.equal(handoff.production_ready_flag, "search_core_service_workflow_tail_descriptor_verified");
});

test("CP00-241 plan binding covers the planned 10 RP07 service audit binding units", () => {
  const coverage = validateSearchCoreCp241Coverage(cp241PlanPack);

  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.pack_id, "CP00-241");
  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.range, "RP07.P02.M05.S01-RP07.P02.M05.S10");
  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.upstream_pack_id, "CP00-240");
  assert.equal(SEARCH_CORE_CP241_PACK_BINDING.next_pack_id, "CP00-242");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M05"], 10);
});

test("CP00-241 service audit binding rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp241ServiceAuditBindingCaseSet();
  const descriptor = createSearchCoreCp241ServiceAuditBindingDescriptor();
  const validation = validateSearchCoreCp241ServiceAuditBindingDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P02.M05"].rows;
  assert.equal(m05.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m05.idempotency_key_handling.persists_idempotency_key, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-241 evidence packets and handoff preserve service audit binding authority boundaries", () => {
  const descriptor = createSearchCoreCp241ServiceAuditBindingDescriptor();
  const hermes = createSearchCoreCp241HermesEvidencePacket(cp241PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp241ClaudeReviewPacket(cp241PlanPack);
  const handoff = createSearchCoreCp241CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-241-to-CP00-242");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M05.S11");
  assert.equal(handoff.production_ready_flag, "search_core_service_audit_binding_descriptor_verified");
});

test("CP00-242 plan binding covers the planned 10 RP07 service binding mid units", () => {
  const coverage = validateSearchCoreCp242Coverage(cp242PlanPack);

  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.pack_id, "CP00-242");
  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.range, "RP07.P02.M05.S11-RP07.P02.M05.S20");
  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.upstream_pack_id, "CP00-241");
  assert.equal(SEARCH_CORE_CP242_PACK_BINDING.next_pack_id, "CP00-243");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M05"], 10);
});

test("CP00-242 service binding mid rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp242ServiceBindingMidCaseSet();
  const descriptor = createSearchCoreCp242ServiceBindingMidDescriptor();
  const validation = validateSearchCoreCp242ServiceBindingMidDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P02.M05"].rows;
  assert.equal(m05.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m05.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-242 evidence packets and handoff preserve service binding mid authority boundaries", () => {
  const descriptor = createSearchCoreCp242ServiceBindingMidDescriptor();
  const hermes = createSearchCoreCp242HermesEvidencePacket(cp242PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp242ClaudeReviewPacket(cp242PlanPack);
  const handoff = createSearchCoreCp242CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-242-to-CP00-243");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M05.S21");
  assert.equal(handoff.production_ready_flag, "search_core_service_binding_mid_descriptor_verified");
});

test("CP00-243 plan binding covers the planned 10 RP07 service fixture head units", () => {
  const coverage = validateSearchCoreCp243Coverage(cp243PlanPack);

  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.pack_id, "CP00-243");
  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.range, "RP07.P02.M05.S21-RP07.P02.M06.S05");
  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.upstream_pack_id, "CP00-242");
  assert.equal(SEARCH_CORE_CP243_PACK_BINDING.next_pack_id, "CP00-244");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M06"], 5);
});

test("CP00-243 service fixture head rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp243ServiceFixtureHeadCaseSet();
  const descriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor();
  const validation = validateSearchCoreCp243ServiceFixtureHeadDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP07.P02.M06"].rows;
  assert.equal(m06.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m06.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-243 evidence packets and handoff preserve service fixture head authority boundaries", () => {
  const descriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor();
  const hermes = createSearchCoreCp243HermesEvidencePacket(cp243PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp243ClaudeReviewPacket(cp243PlanPack);
  const handoff = createSearchCoreCp243CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-243-to-CP00-244");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M06.S06");
  assert.equal(handoff.production_ready_flag, "search_core_service_fixture_head_descriptor_verified");
});

test("CP00-244 plan binding covers the planned 10 RP07 service fixture mid units", () => {
  const coverage = validateSearchCoreCp244Coverage(cp244PlanPack);

  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.pack_id, "CP00-244");
  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.range, "RP07.P02.M06.S06-RP07.P02.M06.S15");
  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.upstream_pack_id, "CP00-243");
  assert.equal(SEARCH_CORE_CP244_PACK_BINDING.next_pack_id, "CP00-245");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M06"], 10);
});

test("CP00-244 service fixture mid rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp244ServiceFixtureMidCaseSet();
  const descriptor = createSearchCoreCp244ServiceFixtureMidDescriptor();
  const validation = validateSearchCoreCp244ServiceFixtureMidDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP07.P02.M06"].rows;
  assert.equal(m06.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m06.review_required_routing.dispatches_review_route_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-244 evidence packets and handoff preserve service fixture mid authority boundaries", () => {
  const descriptor = createSearchCoreCp244ServiceFixtureMidDescriptor();
  const hermes = createSearchCoreCp244HermesEvidencePacket(cp244PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp244ClaudeReviewPacket(cp244PlanPack);
  const handoff = createSearchCoreCp244CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-244-to-CP00-245");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M06.S16");
  assert.equal(handoff.production_ready_flag, "search_core_service_fixture_mid_descriptor_verified");
});

test("CP00-245 plan binding covers the planned 10 RP07 service golden head units", () => {
  const coverage = validateSearchCoreCp245Coverage(cp245PlanPack);

  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.pack_id, "CP00-245");
  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.range, "RP07.P02.M06.S16-RP07.P02.M07.S03");
  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.upstream_pack_id, "CP00-244");
  assert.equal(SEARCH_CORE_CP245_PACK_BINDING.next_pack_id, "CP00-246");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M06"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M07"], 3);
});

test("CP00-245 service golden head rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp245ServiceGoldenHeadCaseSet();
  const descriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor();
  const validation = validateSearchCoreCp245ServiceGoldenHeadDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP07.P02.M06"].rows;
  assert.equal(m06.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m06.blocked_claim_output.customer_safe_error_code, "SEARCH_BLOCKED_CLAIM");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-245 evidence packets and handoff preserve service golden head authority boundaries", () => {
  const descriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor();
  const hermes = createSearchCoreCp245HermesEvidencePacket(cp245PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp245ClaudeReviewPacket(cp245PlanPack);
  const handoff = createSearchCoreCp245CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-245-to-CP00-246");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M07.S04");
  assert.equal(handoff.production_ready_flag, "search_core_service_golden_head_descriptor_verified");
});

test("CP00-246 plan binding covers the planned 40 RP07 golden hermes slice units", () => {
  const coverage = validateSearchCoreCp246Coverage(cp246PlanPack);

  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.pack_id, "CP00-246");
  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.range, "RP07.P02.M07.S04-RP07.P02.M08.S18");
  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.upstream_pack_id, "CP00-245");
  assert.equal(SEARCH_CORE_CP246_PACK_BINDING.next_pack_id, "CP00-247");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP07.P02.M08"], 18);
});

test("CP00-246 golden hermes slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp246GoldenHermesSliceCaseSet();
  const descriptor = createSearchCoreCp246GoldenHermesSliceDescriptor();
  const validation = validateSearchCoreCp246GoldenHermesSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP07.P02.M07"].rows;
  assert.equal(m07.hermes_service_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(m07.claude_service_review_prompt.read_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-246 evidence packets and handoff preserve golden hermes slice authority boundaries", () => {
  const descriptor = createSearchCoreCp246GoldenHermesSliceDescriptor();
  const hermes = createSearchCoreCp246HermesEvidencePacket(cp246PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp246ClaudeReviewPacket(cp246PlanPack);
  const handoff = createSearchCoreCp246CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-246-to-CP00-247");
  assert.equal(handoff.next_subphase_id, "RP07.P02.M08.S19");
  assert.equal(handoff.production_ready_flag, "search_core_golden_hermes_slice_descriptor_verified");
});

test("CP00-247 plan binding covers the planned 150 RP07 P02-closeout and P03-interface units", () => {
  const coverage = validateSearchCoreCp247Coverage(cp247PlanPack);

  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.pack_id, "CP00-247");
  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.range, "RP07.P02.M08.S19-RP07.P03.M05.S22");
  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.upstream_pack_id, "CP00-246");
  assert.equal(SEARCH_CORE_CP247_PACK_BINDING.next_pack_id, "CP00-248");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P02"], 46);
  assert.equal(coverage.summary.by_phase["RP07.P03"], 104);
  assert.equal(Object.keys(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-247 interface foundation rows stay descriptor-only with schema and compatibility boundaries", () => {
  const caseSet = createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet();
  const descriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor();
  const validation = validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P03.M03"].rows;
  assert.equal(m03.schema_drift_check.schema_drift_detected, false);
  assert.equal(m03.backward_compatibility_check.breaking_change_detected, false);
  assert.equal(m03.permission_annotation.deny_over_allow_enforced, true);
  assert.equal(SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.schema_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-247 evidence packets and handoff preserve interface foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor();
  const hermes = createSearchCoreCp247HermesEvidencePacket(cp247PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp247ClaudeReviewPacket(cp247PlanPack);
  const handoff = createSearchCoreCp247CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-247-to-CP00-248");
  assert.equal(handoff.next_subphase_id, "RP07.P03.M06.S01");
  assert.equal(handoff.production_ready_flag, "search_core_p02_closeout_p03_interface_foundation_descriptor_verified");
});

test("CP00-248 plan binding covers the planned 150 RP07 P03-closeout and P04-UI units", () => {
  const coverage = validateSearchCoreCp248Coverage(cp248PlanPack);

  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.pack_id, "CP00-248");
  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.range, "RP07.P03.M06.S01-RP07.P04.M03.S08");
  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.upstream_pack_id, "CP00-247");
  assert.equal(SEARCH_CORE_CP248_PACK_BINDING.next_pack_id, "CP00-249");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P03"], 92);
  assert.equal(coverage.summary.by_phase["RP07.P04"], 58);
  assert.equal(Object.keys(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-248 UI foundation rows stay descriptor-only with leak boundaries", () => {
  const caseSet = createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet();
  const descriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor();
  const validation = validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP07.P04.M01"].rows;
  assert.equal(m01.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(m01.permission_badge.permission_decision_detail_included, false);
  assert.equal(m01.denied_state.expected_outcome, "denied_customer_safe");
  assert.equal(SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.ui_leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-248 evidence packets and handoff preserve UI foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor();
  const hermes = createSearchCoreCp248HermesEvidencePacket(cp248PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp248ClaudeReviewPacket(cp248PlanPack);
  const handoff = createSearchCoreCp248CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-248-to-CP00-249");
  assert.equal(handoff.next_subphase_id, "RP07.P04.M03.S09");
  assert.equal(handoff.production_ready_flag, "search_core_p03_closeout_p04_ui_foundation_descriptor_verified");
});

test("CP00-249 plan binding covers the planned 10 RP07 UI slice mid units", () => {
  const coverage = validateSearchCoreCp249Coverage(cp249PlanPack);

  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.pack_id, "CP00-249");
  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.range, "RP07.P04.M03.S09-RP07.P04.M03.S18");
  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.upstream_pack_id, "CP00-248");
  assert.equal(SEARCH_CORE_CP249_PACK_BINDING.next_pack_id, "CP00-250");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P04.M03"], 10);
});

test("CP00-249 UI slice mid rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp249UiSliceMidCaseSet();
  const descriptor = createSearchCoreCp249UiSliceMidDescriptor();
  const validation = validateSearchCoreCp249UiSliceMidDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P04.M03"].rows;
  assert.equal(m03.permission_badge.permission_decision_detail_included, false);
  assert.equal(m03.hermes_ui_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-249 evidence packets and handoff preserve UI slice mid authority boundaries", () => {
  const descriptor = createSearchCoreCp249UiSliceMidDescriptor();
  const hermes = createSearchCoreCp249HermesEvidencePacket(cp249PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp249ClaudeReviewPacket(cp249PlanPack);
  const handoff = createSearchCoreCp249CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-249-to-CP00-250");
  assert.equal(handoff.next_subphase_id, "RP07.P04.M03.S19");
  assert.equal(handoff.production_ready_flag, "search_core_ui_slice_mid_descriptor_verified");
});

test("CP00-250 plan binding covers the planned 40 RP07 UI workflow slice units", () => {
  const coverage = validateSearchCoreCp250Coverage(cp250PlanPack);

  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.pack_id, "CP00-250");
  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.range, "RP07.P04.M03.S19-RP07.P04.M05.S14");
  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.upstream_pack_id, "CP00-249");
  assert.equal(SEARCH_CORE_CP250_PACK_BINDING.next_pack_id, "CP00-251");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P04.M04"], 22);
});

test("CP00-250 UI workflow slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp250UiWorkflowSliceCaseSet();
  const descriptor = createSearchCoreCp250UiWorkflowSliceDescriptor();
  const validation = validateSearchCoreCp250UiWorkflowSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP07.P04.M04"].rows;
  assert.equal(m04.state_snapshot.writes_state_transition, false);
  assert.equal(m04.no_unauthorized_count_leak.unauthorized_count_leak_detected, false);
  assert.equal(SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.unauthorized_count_leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-250 evidence packets and handoff preserve UI workflow slice authority boundaries", () => {
  const descriptor = createSearchCoreCp250UiWorkflowSliceDescriptor();
  const hermes = createSearchCoreCp250HermesEvidencePacket(cp250PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp250ClaudeReviewPacket(cp250PlanPack);
  const handoff = createSearchCoreCp250CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-250-to-CP00-251");
  assert.equal(handoff.next_subphase_id, "RP07.P04.M05.S15");
  assert.equal(handoff.production_ready_flag, "search_core_ui_workflow_slice_descriptor_verified");
});

test("CP00-251 plan binding covers the planned 10 RP07 UI binding tail units", () => {
  const coverage = validateSearchCoreCp251Coverage(cp251PlanPack);

  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.pack_id, "CP00-251");
  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.range, "RP07.P04.M05.S15-RP07.P04.M06.S02");
  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.upstream_pack_id, "CP00-250");
  assert.equal(SEARCH_CORE_CP251_PACK_BINDING.next_pack_id, "CP00-252");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P04.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP07.P04.M06"], 2);
});

test("CP00-251 UI binding tail rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp251UiBindingTailCaseSet();
  const descriptor = createSearchCoreCp251UiBindingTailDescriptor();
  const validation = validateSearchCoreCp251UiBindingTailDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P04.M05"].rows;
  assert.equal(m05.no_unauthorized_count_leak.unauthorized_count_leak_detected, false);
  assert.equal(m05.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-251 evidence packets and handoff preserve UI binding tail authority boundaries", () => {
  const descriptor = createSearchCoreCp251UiBindingTailDescriptor();
  const hermes = createSearchCoreCp251HermesEvidencePacket(cp251PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp251ClaudeReviewPacket(cp251PlanPack);
  const handoff = createSearchCoreCp251CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-251-to-CP00-252");
  assert.equal(handoff.next_subphase_id, "RP07.P04.M06.S03");
  assert.equal(handoff.production_ready_flag, "search_core_ui_binding_tail_descriptor_verified");
});

test("CP00-252 plan binding covers the planned 150 RP07 P04-closeout and P05-fixture units", () => {
  const coverage = validateSearchCoreCp252Coverage(cp252PlanPack);

  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.pack_id, "CP00-252");
  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.range, "RP07.P04.M06.S03-RP07.P05.M02.S14");
  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.upstream_pack_id, "CP00-251");
  assert.equal(SEARCH_CORE_CP252_PACK_BINDING.next_pack_id, "CP00-253");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P04"], 106);
  assert.equal(coverage.summary.by_phase["RP07.P05"], 44);
  assert.equal(Object.keys(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-252 fixture foundation rows stay descriptor-only with no-real-data boundaries", () => {
  const caseSet = createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet();
  const descriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor();
  const validation = validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP07.P05.M01"].rows;
  assert.equal(m01.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m01.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m01.no_real_data_check.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-252 evidence packets and handoff preserve fixture foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor();
  const hermes = createSearchCoreCp252HermesEvidencePacket(cp252PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp252ClaudeReviewPacket(cp252PlanPack);
  const handoff = createSearchCoreCp252CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-252-to-CP00-253");
  assert.equal(handoff.next_subphase_id, "RP07.P05.M02.S15");
  assert.equal(handoff.production_ready_flag, "search_core_p04_closeout_p05_fixture_foundation_descriptor_verified");
});

test("CP00-253 plan binding covers the planned 40 RP07 fixture slice units", () => {
  const coverage = validateSearchCoreCp253Coverage(cp253PlanPack);

  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.pack_id, "CP00-253");
  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.range, "RP07.P05.M02.S15-RP07.P05.M04.S12");
  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.upstream_pack_id, "CP00-252");
  assert.equal(SEARCH_CORE_CP253_PACK_BINDING.next_pack_id, "CP00-254");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P05.M03"], 22);
});

test("CP00-253 fixture slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp253FixtureSliceCaseSet();
  const descriptor = createSearchCoreCp253FixtureSliceDescriptor();
  const validation = validateSearchCoreCp253FixtureSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P05.M03"].rows;
  assert.equal(m03.stable_id_check.id_drift_detected, false);
  assert.equal(m03.replay_command.executes_command_runtime, false);
  assert.equal(SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.id_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-253 evidence packets and handoff preserve fixture slice authority boundaries", () => {
  const descriptor = createSearchCoreCp253FixtureSliceDescriptor();
  const hermes = createSearchCoreCp253HermesEvidencePacket(cp253PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp253ClaudeReviewPacket(cp253PlanPack);
  const handoff = createSearchCoreCp253CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-253-to-CP00-254");
  assert.equal(handoff.next_subphase_id, "RP07.P05.M04.S13");
  assert.equal(handoff.production_ready_flag, "search_core_fixture_slice_descriptor_verified");
});

test("CP00-254 plan binding covers the planned 40 RP07 fixture binding slice units", () => {
  const coverage = validateSearchCoreCp254Coverage(cp254PlanPack);

  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.pack_id, "CP00-254");
  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.range, "RP07.P05.M04.S13-RP07.P05.M06.S08");
  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.upstream_pack_id, "CP00-253");
  assert.equal(SEARCH_CORE_CP254_PACK_BINDING.next_pack_id, "CP00-255");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P05.M05"], 22);
});

test("CP00-254 fixture binding slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp254FixtureBindingSliceCaseSet();
  const descriptor = createSearchCoreCp254FixtureBindingSliceDescriptor();
  const validation = validateSearchCoreCp254FixtureBindingSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P05.M05"].rows;
  assert.equal(m05.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m05.stable_id_check.id_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-254 evidence packets and handoff preserve fixture binding slice authority boundaries", () => {
  const descriptor = createSearchCoreCp254FixtureBindingSliceDescriptor();
  const hermes = createSearchCoreCp254HermesEvidencePacket(cp254PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp254ClaudeReviewPacket(cp254PlanPack);
  const handoff = createSearchCoreCp254CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-254-to-CP00-255");
  assert.equal(handoff.next_subphase_id, "RP07.P05.M06.S09");
  assert.equal(handoff.production_ready_flag, "search_core_fixture_binding_slice_descriptor_verified");
});

test("CP00-255 plan binding covers the planned 10 RP07 fixture set mid units", () => {
  const coverage = validateSearchCoreCp255Coverage(cp255PlanPack);

  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.pack_id, "CP00-255");
  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.range, "RP07.P05.M06.S09-RP07.P05.M06.S18");
  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.upstream_pack_id, "CP00-254");
  assert.equal(SEARCH_CORE_CP255_PACK_BINDING.next_pack_id, "CP00-256");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P05.M06"], 10);
});

test("CP00-255 fixture set mid rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp255FixtureSetMidCaseSet();
  const descriptor = createSearchCoreCp255FixtureSetMidDescriptor();
  const validation = validateSearchCoreCp255FixtureSetMidDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP07.P05.M06"].rows;
  assert.equal(m06.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m06.hermes_fixture_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-255 evidence packets and handoff preserve fixture set mid authority boundaries", () => {
  const descriptor = createSearchCoreCp255FixtureSetMidDescriptor();
  const hermes = createSearchCoreCp255HermesEvidencePacket(cp255PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp255ClaudeReviewPacket(cp255PlanPack);
  const handoff = createSearchCoreCp255CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-255-to-CP00-256");
  assert.equal(handoff.next_subphase_id, "RP07.P05.M06.S19");
  assert.equal(handoff.production_ready_flag, "search_core_fixture_set_mid_descriptor_verified");
});

test("CP00-256 plan binding covers the planned 150 RP07 P05-closeout and P06-permission units", () => {
  const coverage = validateSearchCoreCp256Coverage(cp256PlanPack);

  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.pack_id, "CP00-256");
  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.range, "RP07.P05.M06.S19-RP07.P06.M02.S20");
  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.upstream_pack_id, "CP00-255");
  assert.equal(SEARCH_CORE_CP256_PACK_BINDING.next_pack_id, "CP00-257");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P05"], 90);
  assert.equal(coverage.summary.by_phase["RP07.P06"], 60);
  assert.equal(Object.keys(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-256 permission foundation rows stay descriptor-only with deny-over-allow boundaries", () => {
  const caseSet = createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet();
  const descriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor();
  const validation = validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP07.P06.M00"].rows;
  assert.equal(m00.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m00.ethical_wall_interaction.cross_wall_access_allowed, false);
  assert.equal(m00.audit_event_expectation.writes_audit_event, false);
  assert.equal(SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.deny_over_allow_enforced, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-256 evidence packets and handoff preserve permission foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor();
  const hermes = createSearchCoreCp256HermesEvidencePacket(cp256PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp256ClaudeReviewPacket(cp256PlanPack);
  const handoff = createSearchCoreCp256CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-256-to-CP00-257");
  assert.equal(handoff.next_subphase_id, "RP07.P06.M02.S21");
  assert.equal(handoff.production_ready_flag, "search_core_p05_closeout_p06_permission_foundation_descriptor_verified");
});

test("CP00-257 plan binding covers the planned 10 RP07 permission slice head units", () => {
  const coverage = validateSearchCoreCp257Coverage(cp257PlanPack);

  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.pack_id, "CP00-257");
  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.range, "RP07.P06.M02.S21-RP07.P06.M03.S08");
  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.upstream_pack_id, "CP00-256");
  assert.equal(SEARCH_CORE_CP257_PACK_BINDING.next_pack_id, "CP00-258");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P06.M03"], 8);
});

test("CP00-257 permission slice head rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp257PermissionSliceHeadCaseSet();
  const descriptor = createSearchCoreCp257PermissionSliceHeadDescriptor();
  const validation = validateSearchCoreCp257PermissionSliceHeadDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP07.P06.M02"].rows;
  assert.equal(m02.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m02.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-257 evidence packets and handoff preserve permission slice head authority boundaries", () => {
  const descriptor = createSearchCoreCp257PermissionSliceHeadDescriptor();
  const hermes = createSearchCoreCp257HermesEvidencePacket(cp257PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp257ClaudeReviewPacket(cp257PlanPack);
  const handoff = createSearchCoreCp257CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-257-to-CP00-258");
  assert.equal(handoff.next_subphase_id, "RP07.P06.M03.S09");
  assert.equal(handoff.production_ready_flag, "search_core_permission_slice_head_descriptor_verified");
});

test("CP00-258 plan binding covers the planned 40 RP07 permission workflow slice units", () => {
  const coverage = validateSearchCoreCp258Coverage(cp258PlanPack);

  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.pack_id, "CP00-258");
  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.range, "RP07.P06.M03.S09-RP07.P06.M04.S23");
  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.upstream_pack_id, "CP00-257");
  assert.equal(SEARCH_CORE_CP258_PACK_BINDING.next_pack_id, "CP00-259");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P06.M04"], 23);
});

test("CP00-258 permission workflow slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp258PermissionWorkflowSliceCaseSet();
  const descriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor();
  const validation = validateSearchCoreCp258PermissionWorkflowSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P06.M03"].rows;
  assert.equal(m03.claude_bypass_prompt.permission_bypass_detected, false);
  assert.equal(m03.human_approval_note.human_final_approval_required, true);
  assert.equal(SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.permission_bypass_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-258 evidence packets and handoff preserve permission workflow slice authority boundaries", () => {
  const descriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor();
  const hermes = createSearchCoreCp258HermesEvidencePacket(cp258PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp258ClaudeReviewPacket(cp258PlanPack);
  const handoff = createSearchCoreCp258CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-258-to-CP00-259");
  assert.equal(handoff.next_subphase_id, "RP07.P06.M04.S24");
  assert.equal(handoff.production_ready_flag, "search_core_permission_workflow_slice_descriptor_verified");
});

test("CP00-259 plan binding covers the planned 40 RP07 permission binding slice units", () => {
  const coverage = validateSearchCoreCp259Coverage(cp259PlanPack);

  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.pack_id, "CP00-259");
  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.range, "RP07.P06.M04.S24-RP07.P06.M06.S13");
  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.upstream_pack_id, "CP00-258");
  assert.equal(SEARCH_CORE_CP259_PACK_BINDING.next_pack_id, "CP00-260");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P06.M05"], 25);
});

test("CP00-259 permission binding slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp259PermissionBindingSliceCaseSet();
  const descriptor = createSearchCoreCp259PermissionBindingSliceDescriptor();
  const validation = validateSearchCoreCp259PermissionBindingSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P06.M05"].rows;
  assert.equal(m05.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m05.claude_bypass_prompt.permission_bypass_detected, false);
  assert.equal(m05.human_approval_note.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-259 evidence packets and handoff preserve permission binding slice authority boundaries", () => {
  const descriptor = createSearchCoreCp259PermissionBindingSliceDescriptor();
  const hermes = createSearchCoreCp259HermesEvidencePacket(cp259PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp259ClaudeReviewPacket(cp259PlanPack);
  const handoff = createSearchCoreCp259CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-259-to-CP00-260");
  assert.equal(handoff.next_subphase_id, "RP07.P06.M06.S14");
  assert.equal(handoff.production_ready_flag, "search_core_permission_binding_slice_descriptor_verified");
});

test("CP00-260 plan binding covers the planned 150 RP07 P06-closeout and P07-failure units", () => {
  const coverage = validateSearchCoreCp260Coverage(cp260PlanPack);

  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.pack_id, "CP00-260");
  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.range, "RP07.P06.M06.S14-RP07.P07.M02.S12");
  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.upstream_pack_id, "CP00-259");
  assert.equal(SEARCH_CORE_CP260_PACK_BINDING.next_pack_id, "CP00-261");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P06"], 98);
  assert.equal(coverage.summary.by_phase["RP07.P07"], 52);
  assert.equal(Object.keys(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-260 failure foundation rows stay descriptor-only with customer-safe boundaries", () => {
  const caseSet = createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP07.P07.M01"].rows;
  assert.equal(m01.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m01.retry_exhaustion_failure.performs_retry_runtime, false);
  assert.equal(m01.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m01.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-260 evidence packets and handoff preserve failure foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createSearchCoreCp260HermesEvidencePacket(cp260PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp260ClaudeReviewPacket(cp260PlanPack);
  const handoff = createSearchCoreCp260CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-260-to-CP00-261");
  assert.equal(handoff.next_subphase_id, "RP07.P07.M02.S13");
  assert.equal(handoff.production_ready_flag, "search_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-261 plan binding covers the planned 40 RP07 failure slice units", () => {
  const coverage = validateSearchCoreCp261Coverage(cp261PlanPack);

  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.pack_id, "CP00-261");
  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.range, "RP07.P07.M02.S13-RP07.P07.M04.S05");
  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.upstream_pack_id, "CP00-260");
  assert.equal(SEARCH_CORE_CP261_PACK_BINDING.next_pack_id, "CP00-262");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P07.M03"], 25);
});

test("CP00-261 failure slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp261FailureSliceCaseSet();
  const descriptor = createSearchCoreCp261FailureSliceDescriptor();
  const validation = validateSearchCoreCp261FailureSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P07.M03"].rows;
  assert.equal(m03.no_silent_success_check.silent_success_detected, false);
  assert.equal(m03.no_data_leak_check.leak_detected, false);
  assert.equal(m03.human_escalation_note.human_final_approval_required, true);
  assert.equal(SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.silent_success_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-261 evidence packets and handoff preserve failure slice authority boundaries", () => {
  const descriptor = createSearchCoreCp261FailureSliceDescriptor();
  const hermes = createSearchCoreCp261HermesEvidencePacket(cp261PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp261ClaudeReviewPacket(cp261PlanPack);
  const handoff = createSearchCoreCp261CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-261-to-CP00-262");
  assert.equal(handoff.next_subphase_id, "RP07.P07.M04.S06");
  assert.equal(handoff.production_ready_flag, "search_core_failure_slice_descriptor_verified");
});

test("CP00-262 plan binding covers the planned 40 RP07 failure binding slice units", () => {
  const coverage = validateSearchCoreCp262Coverage(cp262PlanPack);

  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.pack_id, "CP00-262");
  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.range, "RP07.P07.M04.S06-RP07.P07.M05.S20");
  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.upstream_pack_id, "CP00-261");
  assert.equal(SEARCH_CORE_CP262_PACK_BINDING.next_pack_id, "CP00-263");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP07.P07.M05"], 20);
});

test("CP00-262 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp262FailureBindingSliceCaseSet();
  const descriptor = createSearchCoreCp262FailureBindingSliceDescriptor();
  const validation = validateSearchCoreCp262FailureBindingSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP07.P07.M04"].rows;
  assert.equal(m04.no_silent_success_check.silent_success_detected, false);
  assert.equal(m04.no_data_leak_check.leak_detected, false);
  const m05 = caseSet.sections["RP07.P07.M05"].rows;
  assert.equal(m05.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-262 evidence packets and handoff preserve failure binding slice authority boundaries", () => {
  const descriptor = createSearchCoreCp262FailureBindingSliceDescriptor();
  const hermes = createSearchCoreCp262HermesEvidencePacket(cp262PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp262ClaudeReviewPacket(cp262PlanPack);
  const handoff = createSearchCoreCp262CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-262-to-CP00-263");
  assert.equal(handoff.next_subphase_id, "RP07.P07.M05.S21");
  assert.equal(handoff.production_ready_flag, "search_core_failure_binding_slice_descriptor_verified");
});

test("CP00-263 plan binding covers the planned 10 RP07 failure binding tail units", () => {
  const coverage = validateSearchCoreCp263Coverage(cp263PlanPack);

  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.pack_id, "CP00-263");
  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.range, "RP07.P07.M05.S21-RP07.P07.M06.S05");
  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.upstream_pack_id, "CP00-262");
  assert.equal(SEARCH_CORE_CP263_PACK_BINDING.next_pack_id, "CP00-264");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P07.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP07.P07.M06"], 5);
});

test("CP00-263 failure binding tail rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp263FailureBindingTailCaseSet();
  const descriptor = createSearchCoreCp263FailureBindingTailDescriptor();
  const validation = validateSearchCoreCp263FailureBindingTailDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P07.M05"].rows;
  assert.equal(m05.no_silent_success_check.silent_success_detected, false);
  assert.equal(m05.human_escalation_note.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-263 evidence packets and handoff preserve failure binding tail authority boundaries", () => {
  const descriptor = createSearchCoreCp263FailureBindingTailDescriptor();
  const hermes = createSearchCoreCp263HermesEvidencePacket(cp263PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp263ClaudeReviewPacket(cp263PlanPack);
  const handoff = createSearchCoreCp263CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-263-to-CP00-264");
  assert.equal(handoff.next_subphase_id, "RP07.P07.M06.S06");
  assert.equal(handoff.production_ready_flag, "search_core_failure_binding_tail_descriptor_verified");
});

test("CP00-264 plan binding covers the planned 150 RP07 P07-closeout and P08-hermes units", () => {
  const coverage = validateSearchCoreCp264Coverage(cp264PlanPack);

  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.pack_id, "CP00-264");
  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.range, "RP07.P07.M06.S06-RP07.P08.M02.S14");
  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.upstream_pack_id, "CP00-263");
  assert.equal(SEARCH_CORE_CP264_PACK_BINDING.next_pack_id, "CP00-265");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P07"], 106);
  assert.equal(coverage.summary.by_phase["RP07.P08"], 44);
  assert.equal(Object.keys(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-264 hermes foundation rows stay descriptor-only with receipt boundaries", () => {
  const caseSet = createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet();
  const descriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor();
  const validation = validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP07.P08.M01"].rows;
  assert.equal(m01.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m01.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m01.human_approval_marker.human_final_approval_required, true);
  assert.equal(m01.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-264 evidence packets and handoff preserve hermes foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor();
  const hermes = createSearchCoreCp264HermesEvidencePacket(cp264PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp264ClaudeReviewPacket(cp264PlanPack);
  const handoff = createSearchCoreCp264CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-264-to-CP00-265");
  assert.equal(handoff.next_subphase_id, "RP07.P08.M02.S15");
  assert.equal(handoff.production_ready_flag, "search_core_p07_closeout_p08_hermes_foundation_descriptor_verified");
});

test("CP00-265 plan binding covers the planned 40 RP07 hermes slice units", () => {
  const coverage = validateSearchCoreCp265Coverage(cp265PlanPack);

  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.pack_id, "CP00-265");
  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.range, "RP07.P08.M02.S15-RP07.P08.M04.S12");
  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.upstream_pack_id, "CP00-264");
  assert.equal(SEARCH_CORE_CP265_PACK_BINDING.next_pack_id, "CP00-266");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P08.M03"], 22);
});

test("CP00-265 hermes slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp265HermesSliceCaseSet();
  const descriptor = createSearchCoreCp265HermesSliceDescriptor();
  const validation = validateSearchCoreCp265HermesSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P08.M03"].rows;
  assert.equal(m03.documentation_update.documentation_descriptor_only, true);
  assert.equal(m03.operator_summary.operator_summary_descriptor_only, true);
  assert.equal(m03.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-265 evidence packets and handoff preserve hermes slice authority boundaries", () => {
  const descriptor = createSearchCoreCp265HermesSliceDescriptor();
  const hermes = createSearchCoreCp265HermesEvidencePacket(cp265PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp265ClaudeReviewPacket(cp265PlanPack);
  const handoff = createSearchCoreCp265CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-265-to-CP00-266");
  assert.equal(handoff.next_subphase_id, "RP07.P08.M04.S13");
  assert.equal(handoff.production_ready_flag, "search_core_hermes_slice_descriptor_verified");
});

test("CP00-266 plan binding covers the planned 40 RP07 hermes binding slice units", () => {
  const coverage = validateSearchCoreCp266Coverage(cp266PlanPack);

  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.pack_id, "CP00-266");
  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.range, "RP07.P08.M04.S13-RP07.P08.M06.S08");
  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.upstream_pack_id, "CP00-265");
  assert.equal(SEARCH_CORE_CP266_PACK_BINDING.next_pack_id, "CP00-267");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P08.M05"], 22);
});

test("CP00-266 hermes binding slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp266HermesBindingSliceCaseSet();
  const descriptor = createSearchCoreCp266HermesBindingSliceDescriptor();
  const validation = validateSearchCoreCp266HermesBindingSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P08.M05"].rows;
  assert.equal(m05.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m05.human_approval_marker.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-266 evidence packets and handoff preserve hermes binding slice authority boundaries", () => {
  const descriptor = createSearchCoreCp266HermesBindingSliceDescriptor();
  const hermes = createSearchCoreCp266HermesEvidencePacket(cp266PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp266ClaudeReviewPacket(cp266PlanPack);
  const handoff = createSearchCoreCp266CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-266-to-CP00-267");
  assert.equal(handoff.next_subphase_id, "RP07.P08.M06.S09");
  assert.equal(handoff.production_ready_flag, "search_core_hermes_binding_slice_descriptor_verified");
});

test("CP00-267 plan binding covers the planned 150 RP07 P08-closeout and P09-review units", () => {
  const coverage = validateSearchCoreCp267Coverage(cp267PlanPack);

  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.pack_id, "CP00-267");
  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.unit_count, 150);
  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.range, "RP07.P08.M06.S09-RP07.P09.M03.S10");
  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.upstream_pack_id, "CP00-266");
  assert.equal(SEARCH_CORE_CP267_PACK_BINDING.next_pack_id, "CP00-268");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP07.P08"], 100);
  assert.equal(coverage.summary.by_phase["RP07.P09"], 50);
  assert.equal(Object.keys(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-267 review foundation rows stay descriptor-only with review boundaries", () => {
  const caseSet = createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet();
  const descriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor();
  const validation = validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP07.P09.M02"].rows;
  assert.equal(m02.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m02.human_approval_summary.human_final_approval_required, true);
  assert.equal(m02.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m02.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-267 evidence packets and handoff preserve review foundation authority boundaries", () => {
  const descriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor();
  const hermes = createSearchCoreCp267HermesEvidencePacket(cp267PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp267ClaudeReviewPacket(cp267PlanPack);
  const handoff = createSearchCoreCp267CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-267-to-CP00-268");
  assert.equal(handoff.next_subphase_id, "RP07.P09.M03.S11");
  assert.equal(handoff.production_ready_flag, "search_core_p08_closeout_p09_review_foundation_descriptor_verified");
});

test("CP00-268 plan binding covers the planned 40 RP07 review slice units", () => {
  const coverage = validateSearchCoreCp268Coverage(cp268PlanPack);

  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.pack_id, "CP00-268");
  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.risk_class, "B");
  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.unit_count, 40);
  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.range, "RP07.P09.M03.S11-RP07.P09.M05.S08");
  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.upstream_pack_id, "CP00-267");
  assert.equal(SEARCH_CORE_CP268_PACK_BINDING.next_pack_id, "CP00-269");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP07.P09.M04"], 20);
});

test("CP00-268 review slice rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp268ReviewSliceCaseSet();
  const descriptor = createSearchCoreCp268ReviewSliceDescriptor();
  const validation = validateSearchCoreCp268ReviewSliceDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP07.P09.M03"].rows;
  assert.equal(m03.review_receipt_placeholder.review_receipt_placeholder_descriptor_only, true);
  assert.equal(m03.future_correction_slot.future_correction_slot_descriptor_only, true);
  assert.equal(m03.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-268 evidence packets and handoff preserve review slice authority boundaries", () => {
  const descriptor = createSearchCoreCp268ReviewSliceDescriptor();
  const hermes = createSearchCoreCp268HermesEvidencePacket(cp268PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp268ClaudeReviewPacket(cp268PlanPack);
  const handoff = createSearchCoreCp268CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-268-to-CP00-269");
  assert.equal(handoff.next_subphase_id, "RP07.P09.M05.S09");
  assert.equal(handoff.production_ready_flag, "search_core_review_slice_descriptor_verified");
});

test("CP00-269 plan binding covers the planned 10 RP07 review binding mid units", () => {
  const coverage = validateSearchCoreCp269Coverage(cp269PlanPack);

  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.pack_id, "CP00-269");
  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.range, "RP07.P09.M05.S09-RP07.P09.M05.S18");
  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.upstream_pack_id, "CP00-268");
  assert.equal(SEARCH_CORE_CP269_PACK_BINDING.next_pack_id, "CP00-270");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P09.M05"], 10);
});

test("CP00-269 review binding mid rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp269ReviewBindingMidCaseSet();
  const descriptor = createSearchCoreCp269ReviewBindingMidDescriptor();
  const validation = validateSearchCoreCp269ReviewBindingMidDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP07.P09.M05"].rows;
  assert.equal(m05.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m05.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-269 evidence packets and handoff preserve review binding mid authority boundaries", () => {
  const descriptor = createSearchCoreCp269ReviewBindingMidDescriptor();
  const hermes = createSearchCoreCp269HermesEvidencePacket(cp269PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp269ClaudeReviewPacket(cp269PlanPack);
  const handoff = createSearchCoreCp269CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-269-to-CP00-270");
  assert.equal(handoff.next_subphase_id, "RP07.P09.M05.S19");
  assert.equal(handoff.production_ready_flag, "search_core_review_binding_mid_descriptor_verified");
});

test("CP00-270 plan binding covers the planned 10 RP07 review binding tail units", () => {
  const coverage = validateSearchCoreCp270Coverage(cp270PlanPack);

  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.pack_id, "CP00-270");
  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.risk_class, "A");
  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.unit_count, 10);
  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.range, "RP07.P09.M05.S19-RP07.P09.M06.S06");
  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.upstream_pack_id, "CP00-269");
  assert.equal(SEARCH_CORE_CP270_PACK_BINDING.next_pack_id, "CP00-271");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP07.P09.M06"], 6);
});

test("CP00-270 review binding tail rows stay descriptor-only", () => {
  const caseSet = createSearchCoreCp270ReviewBindingTailCaseSet();
  const descriptor = createSearchCoreCp270ReviewBindingTailDescriptor();
  const validation = validateSearchCoreCp270ReviewBindingTailDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP07.P09.M06"].rows;
  assert.equal(m06.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m06.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-270 evidence packets and handoff preserve review binding tail authority boundaries", () => {
  const descriptor = createSearchCoreCp270ReviewBindingTailDescriptor();
  const hermes = createSearchCoreCp270HermesEvidencePacket(cp270PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp270ClaudeReviewPacket(cp270PlanPack);
  const handoff = createSearchCoreCp270CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-270-to-CP00-271");
  assert.equal(handoff.next_subphase_id, "RP07.P09.M06.S07");
  assert.equal(handoff.production_ready_flag, "search_core_review_binding_tail_descriptor_verified");
});

test("CP00-271 plan binding covers the planned 86 RP07 P09 closeout units", () => {
  const coverage = validateSearchCoreCp271Coverage(cp271PlanPack);

  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.pack_id, "CP00-271");
  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.risk_class, "C");
  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.unit_count, 86);
  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.range, "RP07.P09.M06.S07-RP07.P09.M10.S10");
  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.upstream_pack_id, "CP00-270");
  assert.equal(SEARCH_CORE_CP271_PACK_BINDING.next_pack_id, "CP00-272");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 86);
  assert.equal(coverage.summary.by_micro_phase["RP07.P09.M07"], 22);
  assert.equal(Object.keys(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows).length, 5);
});

test("CP00-271 P09 closeout rows stay descriptor-only and close RP07", () => {
  const caseSet = createSearchCoreCp271P09CloseoutCaseSet();
  const descriptor = createSearchCoreCp271P09CloseoutDescriptor();
  const validation = validateSearchCoreCp271P09CloseoutDescriptor(descriptor, searchContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[searchCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.closes_rp07_descriptor_scope, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-271 evidence packets and handoff route RP07 closeout to the RP08 bootstrap", () => {
  const descriptor = createSearchCoreCp271P09CloseoutDescriptor();
  const hermes = createSearchCoreCp271HermesEvidencePacket(cp271PlanPack, searchContract, descriptor);
  const claude = createSearchCoreCp271ClaudeReviewPacket(cp271PlanPack);
  const handoff = createSearchCoreCp271CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-271-to-CP00-272");
  assert.equal(handoff.next_subphase_id, "RP08.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "search_core_p09_closeout_descriptor_verified");
});
