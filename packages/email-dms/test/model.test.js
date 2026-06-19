import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  EMAIL_DMS_CORE_CP272_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP272_PACK_BINDING,
  EMAIL_DMS_CORE_CP272_REQUIREMENTS,
  EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP273_PACK_BINDING,
  EMAIL_DMS_CORE_CP273_REQUIREMENTS,
  EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP274_PACK_BINDING,
  EMAIL_DMS_CORE_CP274_REQUIREMENTS,
  EMAIL_DMS_CORE_CP275_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP275_PACK_BINDING,
  EMAIL_DMS_CORE_CP275_REQUIREMENTS,
  EMAIL_DMS_CORE_CP276_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP276_PACK_BINDING,
  EMAIL_DMS_CORE_CP276_REQUIREMENTS,
  EMAIL_DMS_CORE_CP277_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP277_PACK_BINDING,
  EMAIL_DMS_CORE_CP277_REQUIREMENTS,
  EMAIL_DMS_CORE_CP278_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP278_PACK_BINDING,
  EMAIL_DMS_CORE_CP278_REQUIREMENTS,
  EMAIL_DMS_CORE_CP279_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP279_PACK_BINDING,
  EMAIL_DMS_CORE_CP279_REQUIREMENTS,
  EMAIL_DMS_CORE_CP280_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP280_PACK_BINDING,
  EMAIL_DMS_CORE_CP280_REQUIREMENTS,
  EMAIL_DMS_CORE_CP281_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP281_PACK_BINDING,
  EMAIL_DMS_CORE_CP281_REQUIREMENTS,
  EMAIL_DMS_CORE_CP282_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP282_PACK_BINDING,
  EMAIL_DMS_CORE_CP282_REQUIREMENTS,
  EMAIL_DMS_CORE_CP283_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP283_PACK_BINDING,
  EMAIL_DMS_CORE_CP283_REQUIREMENTS,
  EMAIL_DMS_CORE_CP284_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP284_PACK_BINDING,
  EMAIL_DMS_CORE_CP284_REQUIREMENTS,
  EMAIL_DMS_CORE_CP285_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP285_PACK_BINDING,
  EMAIL_DMS_CORE_CP285_REQUIREMENTS,
  EMAIL_DMS_CORE_CP286_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP286_PACK_BINDING,
  EMAIL_DMS_CORE_CP286_REQUIREMENTS,
  EMAIL_DMS_CORE_CP287_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP287_PACK_BINDING,
  EMAIL_DMS_CORE_CP287_REQUIREMENTS,
  EMAIL_DMS_CORE_CP288_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP288_PACK_BINDING,
  EMAIL_DMS_CORE_CP288_REQUIREMENTS,
  EMAIL_DMS_CORE_CP289_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP289_PACK_BINDING,
  EMAIL_DMS_CORE_CP289_REQUIREMENTS,
  EMAIL_DMS_CORE_CP290_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP290_PACK_BINDING,
  EMAIL_DMS_CORE_CP290_REQUIREMENTS,
  EMAIL_DMS_CORE_CP291_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP291_PACK_BINDING,
  EMAIL_DMS_CORE_CP291_REQUIREMENTS,
  EMAIL_DMS_CORE_CP292_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP292_PACK_BINDING,
  EMAIL_DMS_CORE_CP292_REQUIREMENTS,
  EMAIL_DMS_CORE_CP293_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP293_PACK_BINDING,
  EMAIL_DMS_CORE_CP293_REQUIREMENTS,
  EMAIL_DMS_CORE_CP294_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP294_PACK_BINDING,
  EMAIL_DMS_CORE_CP294_REQUIREMENTS,
  EMAIL_DMS_CORE_CP295_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP295_PACK_BINDING,
  EMAIL_DMS_CORE_CP295_REQUIREMENTS,
  EMAIL_DMS_CORE_CP296_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP296_PACK_BINDING,
  EMAIL_DMS_CORE_CP296_REQUIREMENTS,
  EMAIL_DMS_CORE_CP297_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP297_PACK_BINDING,
  EMAIL_DMS_CORE_CP297_REQUIREMENTS,
  EMAIL_DMS_CORE_CP298_NO_WRITE_ATTESTATION,
  EMAIL_DMS_CORE_CP298_PACK_BINDING,
  EMAIL_DMS_CORE_CP298_REQUIREMENTS,
  EMAIL_DMS_CORE_PROGRAM_CONTRACT,
  createEmailDmsCoreCp272ClaudeReviewPacket,
  createEmailDmsCoreCp272CloseoutHandoff,
  createEmailDmsCoreCp272HermesEvidencePacket,
  createEmailDmsCoreCp272ScopeContractFoundationCaseSet,
  createEmailDmsCoreCp272ScopeContractFoundationDescriptor,
  createEmailDmsCoreCp273ClaudeReviewPacket,
  createEmailDmsCoreCp273CloseoutHandoff,
  createEmailDmsCoreCp273HermesEvidencePacket,
  createEmailDmsCoreCp273ModelStorageSliceCaseSet,
  createEmailDmsCoreCp273ModelStorageSliceDescriptor,
  createEmailDmsCoreCp274ClaudeReviewPacket,
  createEmailDmsCoreCp274CloseoutHandoff,
  createEmailDmsCoreCp274HermesEvidencePacket,
  createEmailDmsCoreCp274ModelBindingSliceCaseSet,
  createEmailDmsCoreCp274ModelBindingSliceDescriptor,
  createEmailDmsCoreCp275ClaudeReviewPacket,
  createEmailDmsCoreCp275CloseoutHandoff,
  createEmailDmsCoreCp275HermesEvidencePacket,
  createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationCaseSet,
  createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor,
  createEmailDmsCoreCp276ClaudeReviewPacket,
  createEmailDmsCoreCp276CloseoutHandoff,
  createEmailDmsCoreCp276HermesEvidencePacket,
  createEmailDmsCoreCp276ServiceSliceCaseSet,
  createEmailDmsCoreCp276ServiceSliceDescriptor,
  createEmailDmsCoreCp277ClaudeReviewPacket,
  createEmailDmsCoreCp277CloseoutHandoff,
  createEmailDmsCoreCp277HermesEvidencePacket,
  createEmailDmsCoreCp277ServiceBindingSliceCaseSet,
  createEmailDmsCoreCp277ServiceBindingSliceDescriptor,
  createEmailDmsCoreCp278ClaudeReviewPacket,
  createEmailDmsCoreCp278CloseoutHandoff,
  createEmailDmsCoreCp278HermesEvidencePacket,
  createEmailDmsCoreCp278ServiceFixtureTailCaseSet,
  createEmailDmsCoreCp278ServiceFixtureTailDescriptor,
  createEmailDmsCoreCp279ClaudeReviewPacket,
  createEmailDmsCoreCp279CloseoutHandoff,
  createEmailDmsCoreCp279HermesEvidencePacket,
  createEmailDmsCoreCp279ServiceGoldenMidCaseSet,
  createEmailDmsCoreCp279ServiceGoldenMidDescriptor,
  createEmailDmsCoreCp280ClaudeReviewPacket,
  createEmailDmsCoreCp280CloseoutHandoff,
  createEmailDmsCoreCp280GoldenHermesSliceCaseSet,
  createEmailDmsCoreCp280GoldenHermesSliceDescriptor,
  createEmailDmsCoreCp280HermesEvidencePacket,
  createEmailDmsCoreCp281ClaudeReviewPacket,
  createEmailDmsCoreCp281CloseoutHandoff,
  createEmailDmsCoreCp281HermesEvidencePacket,
  createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationCaseSet,
  createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor,
  createEmailDmsCoreCp282ClaudeReviewPacket,
  createEmailDmsCoreCp282CloseoutHandoff,
  createEmailDmsCoreCp282HermesEvidencePacket,
  createEmailDmsCoreCp282P03CloseoutP04UiFoundationCaseSet,
  createEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor,
  createEmailDmsCoreCp283ClaudeReviewPacket,
  createEmailDmsCoreCp283CloseoutHandoff,
  createEmailDmsCoreCp283HermesEvidencePacket,
  createEmailDmsCoreCp283UiWorkflowSliceCaseSet,
  createEmailDmsCoreCp283UiWorkflowSliceDescriptor,
  createEmailDmsCoreCp284ClaudeReviewPacket,
  createEmailDmsCoreCp284CloseoutHandoff,
  createEmailDmsCoreCp284HermesEvidencePacket,
  createEmailDmsCoreCp284UiBindingTailCaseSet,
  createEmailDmsCoreCp284UiBindingTailDescriptor,
  createEmailDmsCoreCp285ClaudeReviewPacket,
  createEmailDmsCoreCp285CloseoutHandoff,
  createEmailDmsCoreCp285HermesEvidencePacket,
  createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationCaseSet,
  createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor,
  createEmailDmsCoreCp286ClaudeReviewPacket,
  createEmailDmsCoreCp286CloseoutHandoff,
  createEmailDmsCoreCp286FixtureSliceCaseSet,
  createEmailDmsCoreCp286FixtureSliceDescriptor,
  createEmailDmsCoreCp286HermesEvidencePacket,
  createEmailDmsCoreCp287ClaudeReviewPacket,
  createEmailDmsCoreCp287CloseoutHandoff,
  createEmailDmsCoreCp287HermesEvidencePacket,
  createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationCaseSet,
  createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor,
  createEmailDmsCoreCp288ClaudeReviewPacket,
  createEmailDmsCoreCp288CloseoutHandoff,
  createEmailDmsCoreCp288HermesEvidencePacket,
  createEmailDmsCoreCp288PermissionSliceCaseSet,
  createEmailDmsCoreCp288PermissionSliceDescriptor,
  createEmailDmsCoreCp289ClaudeReviewPacket,
  createEmailDmsCoreCp289CloseoutHandoff,
  createEmailDmsCoreCp289HermesEvidencePacket,
  createEmailDmsCoreCp289PermissionBindingSliceCaseSet,
  createEmailDmsCoreCp289PermissionBindingSliceDescriptor,
  createEmailDmsCoreCp290ClaudeReviewPacket,
  createEmailDmsCoreCp290CloseoutHandoff,
  createEmailDmsCoreCp290HermesEvidencePacket,
  createEmailDmsCoreCp290P06CloseoutP07FailureFoundationCaseSet,
  createEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor,
  createEmailDmsCoreCp291ClaudeReviewPacket,
  createEmailDmsCoreCp291CloseoutHandoff,
  createEmailDmsCoreCp291FailureSliceCaseSet,
  createEmailDmsCoreCp291FailureSliceDescriptor,
  createEmailDmsCoreCp291HermesEvidencePacket,
  createEmailDmsCoreCp292ClaudeReviewPacket,
  createEmailDmsCoreCp292CloseoutHandoff,
  createEmailDmsCoreCp292FailureBindingSliceCaseSet,
  createEmailDmsCoreCp292FailureBindingSliceDescriptor,
  createEmailDmsCoreCp292HermesEvidencePacket,
  createEmailDmsCoreCp293ClaudeReviewPacket,
  createEmailDmsCoreCp293CloseoutHandoff,
  createEmailDmsCoreCp293HermesEvidencePacket,
  createEmailDmsCoreCp293P07CloseoutP08HermesFoundationCaseSet,
  createEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor,
  createEmailDmsCoreCp294ClaudeReviewPacket,
  createEmailDmsCoreCp294CloseoutHandoff,
  createEmailDmsCoreCp294HermesEvidencePacket,
  createEmailDmsCoreCp294HermesSliceCaseSet,
  createEmailDmsCoreCp294HermesSliceDescriptor,
  createEmailDmsCoreCp295ClaudeReviewPacket,
  createEmailDmsCoreCp295CloseoutHandoff,
  createEmailDmsCoreCp295HermesBindingSliceCaseSet,
  createEmailDmsCoreCp295HermesBindingSliceDescriptor,
  createEmailDmsCoreCp295HermesEvidencePacket,
  createEmailDmsCoreCp296ClaudeReviewPacket,
  createEmailDmsCoreCp296CloseoutHandoff,
  createEmailDmsCoreCp296HermesEvidencePacket,
  createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationCaseSet,
  createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor,
  createEmailDmsCoreCp297ClaudeReviewPacket,
  createEmailDmsCoreCp297CloseoutHandoff,
  createEmailDmsCoreCp297HermesEvidencePacket,
  createEmailDmsCoreCp297ReviewSliceCaseSet,
  createEmailDmsCoreCp297ReviewSliceDescriptor,
  createEmailDmsCoreCp298ClaudeReviewPacket,
  createEmailDmsCoreCp298CloseoutHandoff,
  createEmailDmsCoreCp298HermesEvidencePacket,
  createEmailDmsCoreCp298P09CloseoutCaseSet,
  createEmailDmsCoreCp298P09CloseoutDescriptor,
  emailDmsCoreRowKey,
  validateEmailDmsCoreCp272Coverage,
  validateEmailDmsCoreCp272ScopeContractFoundationDescriptor,
  validateEmailDmsCoreCp273Coverage,
  validateEmailDmsCoreCp273ModelStorageSliceDescriptor,
  validateEmailDmsCoreCp274Coverage,
  validateEmailDmsCoreCp274ModelBindingSliceDescriptor,
  validateEmailDmsCoreCp275Coverage,
  validateEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor,
  validateEmailDmsCoreCp276Coverage,
  validateEmailDmsCoreCp276ServiceSliceDescriptor,
  validateEmailDmsCoreCp277Coverage,
  validateEmailDmsCoreCp277ServiceBindingSliceDescriptor,
  validateEmailDmsCoreCp278Coverage,
  validateEmailDmsCoreCp278ServiceFixtureTailDescriptor,
  validateEmailDmsCoreCp279Coverage,
  validateEmailDmsCoreCp279ServiceGoldenMidDescriptor,
  validateEmailDmsCoreCp280Coverage,
  validateEmailDmsCoreCp280GoldenHermesSliceDescriptor,
  validateEmailDmsCoreCp281Coverage,
  validateEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor,
  validateEmailDmsCoreCp282Coverage,
  validateEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor,
  validateEmailDmsCoreCp283Coverage,
  validateEmailDmsCoreCp283UiWorkflowSliceDescriptor,
  validateEmailDmsCoreCp284Coverage,
  validateEmailDmsCoreCp284UiBindingTailDescriptor,
  validateEmailDmsCoreCp285Coverage,
  validateEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor,
  validateEmailDmsCoreCp286Coverage,
  validateEmailDmsCoreCp286FixtureSliceDescriptor,
  validateEmailDmsCoreCp287Coverage,
  validateEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor,
  validateEmailDmsCoreCp288Coverage,
  validateEmailDmsCoreCp288PermissionSliceDescriptor,
  validateEmailDmsCoreCp289Coverage,
  validateEmailDmsCoreCp289PermissionBindingSliceDescriptor,
  validateEmailDmsCoreCp290Coverage,
  validateEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor,
  validateEmailDmsCoreCp291Coverage,
  validateEmailDmsCoreCp291FailureSliceDescriptor,
  validateEmailDmsCoreCp292Coverage,
  validateEmailDmsCoreCp292FailureBindingSliceDescriptor,
  validateEmailDmsCoreCp293Coverage,
  validateEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor,
  validateEmailDmsCoreCp294Coverage,
  validateEmailDmsCoreCp294HermesSliceDescriptor,
  validateEmailDmsCoreCp295Coverage,
  validateEmailDmsCoreCp295HermesBindingSliceDescriptor,
  validateEmailDmsCoreCp296Coverage,
  validateEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor,
  validateEmailDmsCoreCp297Coverage,
  validateEmailDmsCoreCp297ReviewSliceDescriptor,
  validateEmailDmsCoreCp298Coverage,
  validateEmailDmsCoreCp298P09CloseoutDescriptor,
} from "../src/index.js";

const emailDmsContract = JSON.parse(
  readFileSync(new URL("../../../contracts/email-dms-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp272ManifestPath = new URL("../../../docs/closeout-packs/cp00-272/manifest.json", import.meta.url);
const cp272Manifest = existsSync(cp272ManifestPath) ? JSON.parse(readFileSync(cp272ManifestPath, "utf8")) : null;
const cp272PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-272") ?? cp272Manifest?.plan_binding_snapshot;
const cp273ManifestPath = new URL("../../../docs/closeout-packs/cp00-273/manifest.json", import.meta.url);
const cp273Manifest = existsSync(cp273ManifestPath) ? JSON.parse(readFileSync(cp273ManifestPath, "utf8")) : null;
const cp273PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-273") ?? cp273Manifest?.plan_binding_snapshot;
const cp274ManifestPath = new URL("../../../docs/closeout-packs/cp00-274/manifest.json", import.meta.url);
const cp274Manifest = existsSync(cp274ManifestPath) ? JSON.parse(readFileSync(cp274ManifestPath, "utf8")) : null;
const cp274PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-274") ?? cp274Manifest?.plan_binding_snapshot;
const cp275ManifestPath = new URL("../../../docs/closeout-packs/cp00-275/manifest.json", import.meta.url);
const cp275Manifest = existsSync(cp275ManifestPath) ? JSON.parse(readFileSync(cp275ManifestPath, "utf8")) : null;
const cp275PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-275") ?? cp275Manifest?.plan_binding_snapshot;
const cp276ManifestPath = new URL("../../../docs/closeout-packs/cp00-276/manifest.json", import.meta.url);
const cp276Manifest = existsSync(cp276ManifestPath) ? JSON.parse(readFileSync(cp276ManifestPath, "utf8")) : null;
const cp276PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-276") ?? cp276Manifest?.plan_binding_snapshot;
const cp277ManifestPath = new URL("../../../docs/closeout-packs/cp00-277/manifest.json", import.meta.url);
const cp277Manifest = existsSync(cp277ManifestPath) ? JSON.parse(readFileSync(cp277ManifestPath, "utf8")) : null;
const cp277PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-277") ?? cp277Manifest?.plan_binding_snapshot;
const cp278ManifestPath = new URL("../../../docs/closeout-packs/cp00-278/manifest.json", import.meta.url);
const cp278Manifest = existsSync(cp278ManifestPath) ? JSON.parse(readFileSync(cp278ManifestPath, "utf8")) : null;
const cp278PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-278") ?? cp278Manifest?.plan_binding_snapshot;
const cp279ManifestPath = new URL("../../../docs/closeout-packs/cp00-279/manifest.json", import.meta.url);
const cp279Manifest = existsSync(cp279ManifestPath) ? JSON.parse(readFileSync(cp279ManifestPath, "utf8")) : null;
const cp279PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-279") ?? cp279Manifest?.plan_binding_snapshot;
const cp280ManifestPath = new URL("../../../docs/closeout-packs/cp00-280/manifest.json", import.meta.url);
const cp280Manifest = existsSync(cp280ManifestPath) ? JSON.parse(readFileSync(cp280ManifestPath, "utf8")) : null;
const cp280PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-280") ?? cp280Manifest?.plan_binding_snapshot;
const cp281ManifestPath = new URL("../../../docs/closeout-packs/cp00-281/manifest.json", import.meta.url);
const cp281Manifest = existsSync(cp281ManifestPath) ? JSON.parse(readFileSync(cp281ManifestPath, "utf8")) : null;
const cp281PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-281") ?? cp281Manifest?.plan_binding_snapshot;
const cp282ManifestPath = new URL("../../../docs/closeout-packs/cp00-282/manifest.json", import.meta.url);
const cp282Manifest = existsSync(cp282ManifestPath) ? JSON.parse(readFileSync(cp282ManifestPath, "utf8")) : null;
const cp282PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-282") ?? cp282Manifest?.plan_binding_snapshot;
const cp283ManifestPath = new URL("../../../docs/closeout-packs/cp00-283/manifest.json", import.meta.url);
const cp283Manifest = existsSync(cp283ManifestPath) ? JSON.parse(readFileSync(cp283ManifestPath, "utf8")) : null;
const cp283PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-283") ?? cp283Manifest?.plan_binding_snapshot;
const cp284ManifestPath = new URL("../../../docs/closeout-packs/cp00-284/manifest.json", import.meta.url);
const cp284Manifest = existsSync(cp284ManifestPath) ? JSON.parse(readFileSync(cp284ManifestPath, "utf8")) : null;
const cp284PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-284") ?? cp284Manifest?.plan_binding_snapshot;
const cp285ManifestPath = new URL("../../../docs/closeout-packs/cp00-285/manifest.json", import.meta.url);
const cp285Manifest = existsSync(cp285ManifestPath) ? JSON.parse(readFileSync(cp285ManifestPath, "utf8")) : null;
const cp285PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-285") ?? cp285Manifest?.plan_binding_snapshot;
const cp286ManifestPath = new URL("../../../docs/closeout-packs/cp00-286/manifest.json", import.meta.url);
const cp286Manifest = existsSync(cp286ManifestPath) ? JSON.parse(readFileSync(cp286ManifestPath, "utf8")) : null;
const cp286PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-286") ?? cp286Manifest?.plan_binding_snapshot;
const cp287ManifestPath = new URL("../../../docs/closeout-packs/cp00-287/manifest.json", import.meta.url);
const cp287Manifest = existsSync(cp287ManifestPath) ? JSON.parse(readFileSync(cp287ManifestPath, "utf8")) : null;
const cp287PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-287") ?? cp287Manifest?.plan_binding_snapshot;
const cp288ManifestPath = new URL("../../../docs/closeout-packs/cp00-288/manifest.json", import.meta.url);
const cp288Manifest = existsSync(cp288ManifestPath) ? JSON.parse(readFileSync(cp288ManifestPath, "utf8")) : null;
const cp288PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-288") ?? cp288Manifest?.plan_binding_snapshot;
const cp289ManifestPath = new URL("../../../docs/closeout-packs/cp00-289/manifest.json", import.meta.url);
const cp289Manifest = existsSync(cp289ManifestPath) ? JSON.parse(readFileSync(cp289ManifestPath, "utf8")) : null;
const cp289PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-289") ?? cp289Manifest?.plan_binding_snapshot;
const cp290ManifestPath = new URL("../../../docs/closeout-packs/cp00-290/manifest.json", import.meta.url);
const cp290Manifest = existsSync(cp290ManifestPath) ? JSON.parse(readFileSync(cp290ManifestPath, "utf8")) : null;
const cp290PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-290") ?? cp290Manifest?.plan_binding_snapshot;
const cp291ManifestPath = new URL("../../../docs/closeout-packs/cp00-291/manifest.json", import.meta.url);
const cp291Manifest = existsSync(cp291ManifestPath) ? JSON.parse(readFileSync(cp291ManifestPath, "utf8")) : null;
const cp291PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-291") ?? cp291Manifest?.plan_binding_snapshot;
const cp292ManifestPath = new URL("../../../docs/closeout-packs/cp00-292/manifest.json", import.meta.url);
const cp292Manifest = existsSync(cp292ManifestPath) ? JSON.parse(readFileSync(cp292ManifestPath, "utf8")) : null;
const cp292PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-292") ?? cp292Manifest?.plan_binding_snapshot;
const cp293ManifestPath = new URL("../../../docs/closeout-packs/cp00-293/manifest.json", import.meta.url);
const cp293Manifest = existsSync(cp293ManifestPath) ? JSON.parse(readFileSync(cp293ManifestPath, "utf8")) : null;
const cp293PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-293") ?? cp293Manifest?.plan_binding_snapshot;
const cp294ManifestPath = new URL("../../../docs/closeout-packs/cp00-294/manifest.json", import.meta.url);
const cp294Manifest = existsSync(cp294ManifestPath) ? JSON.parse(readFileSync(cp294ManifestPath, "utf8")) : null;
const cp294PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-294") ?? cp294Manifest?.plan_binding_snapshot;
const cp295ManifestPath = new URL("../../../docs/closeout-packs/cp00-295/manifest.json", import.meta.url);
const cp295Manifest = existsSync(cp295ManifestPath) ? JSON.parse(readFileSync(cp295ManifestPath, "utf8")) : null;
const cp295PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-295") ?? cp295Manifest?.plan_binding_snapshot;
const cp296ManifestPath = new URL("../../../docs/closeout-packs/cp00-296/manifest.json", import.meta.url);
const cp296Manifest = existsSync(cp296ManifestPath) ? JSON.parse(readFileSync(cp296ManifestPath, "utf8")) : null;
const cp296PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-296") ?? cp296Manifest?.plan_binding_snapshot;
const cp297ManifestPath = new URL("../../../docs/closeout-packs/cp00-297/manifest.json", import.meta.url);
const cp297Manifest = existsSync(cp297ManifestPath) ? JSON.parse(readFileSync(cp297ManifestPath, "utf8")) : null;
const cp297PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-297") ?? cp297Manifest?.plan_binding_snapshot;
const cp298ManifestPath = new URL("../../../docs/closeout-packs/cp00-298/manifest.json", import.meta.url);
const cp298Manifest = existsSync(cp298ManifestPath) ? JSON.parse(readFileSync(cp298ManifestPath, "utf8")) : null;
const cp298PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-298") ?? cp298Manifest?.plan_binding_snapshot;

test("RP08 program contract pins the email-dms descriptor boundary", () => {
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.program_id, "RP08");
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.program_title, "Email And Office Native DMS");
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP07");
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.hermes_gate, "H08");
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.claude_gate, "C08");
  assert.equal(EMAIL_DMS_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.equal(
    ["CP00-272", "CP00-273", "CP00-274", "CP00-275", "CP00-276", "CP00-277", "CP00-278", "CP00-279", "CP00-280", "CP00-281", "CP00-282", "CP00-283", "CP00-284", "CP00-285", "CP00-286", "CP00-287", "CP00-288", "CP00-289", "CP00-290", "CP00-291", "CP00-292", "CP00-293", "CP00-294", "CP00-295", "CP00-296", "CP00-297", "CP00-298"].includes(emailDmsContract.current_pack.pack_id),
    true,
    "contract current_pack must stay within the known email-dms pack chain",
  );
  assert.equal(emailDmsContract.program.program_id, "RP08");
});

test("CP00-272 plan binding covers the planned 150 RP08 scope contract foundation units", () => {
  const coverage = validateEmailDmsCoreCp272Coverage(cp272PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.pack_id, "CP00-272");
  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.range, "RP08.P00.M00.S01-RP08.P01.M02.S08");
  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.upstream_pack_id, "CP00-271");
  assert.equal(EMAIL_DMS_CORE_CP272_PACK_BINDING.next_pack_id, "CP00-273");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP08.P01"], 28);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP272_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-272 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp272ScopeContractFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp272ScopeContractFoundationDescriptor();
  const validation = validateEmailDmsCoreCp272ScopeContractFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP272_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m00 = caseSet.sections["RP08.P00.M00"].rows;
  assert.equal(m00.non_goal_boundary.email_runtime_opened, false);
  assert.equal(m00.non_goal_boundary.office_native_runtime_opened, false);
  assert.equal(m00.acceptance_gate_definition.hermes_gate, "H08");
  assert.equal(EMAIL_DMS_CORE_CP272_NO_WRITE_ATTESTATION.dispatches_email_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-272 evidence packets and handoff preserve scope contract foundation authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp272ScopeContractFoundationDescriptor();
  const hermes = createEmailDmsCoreCp272HermesEvidencePacket(cp272PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp272ClaudeReviewPacket(cp272PlanPack);
  const handoff = createEmailDmsCoreCp272CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-272-to-CP00-273");
  assert.equal(handoff.next_subphase_id, "RP08.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "email_dms_core_scope_contract_foundation_descriptor_verified");
});

test("CP00-273 plan binding covers the planned 40 RP08 model storage slice units", () => {
  const coverage = validateEmailDmsCoreCp273Coverage(cp273PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.pack_id, "CP00-273");
  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.range, "RP08.P01.M02.S09-RP08.P01.M04.S06");
  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.upstream_pack_id, "CP00-272");
  assert.equal(EMAIL_DMS_CORE_CP273_PACK_BINDING.next_pack_id, "CP00-274");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P01.M03"], 22);
});

test("CP00-273 model storage slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp273ModelStorageSliceCaseSet();
  const descriptor = createEmailDmsCoreCp273ModelStorageSliceDescriptor();
  const validation = validateEmailDmsCoreCp273ModelStorageSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP273_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P01.M03"].rows;
  assert.equal(m03.ownership_drift_test.ownership_drift_detected, false);
  assert.equal(m03.fixture_model.real_client_data_loaded, false);
  assert.equal(EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-273 evidence packets and handoff preserve model storage slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp273ModelStorageSliceDescriptor();
  const hermes = createEmailDmsCoreCp273HermesEvidencePacket(cp273PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp273ClaudeReviewPacket(cp273PlanPack);
  const handoff = createEmailDmsCoreCp273CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-273-to-CP00-274");
  assert.equal(handoff.next_subphase_id, "RP08.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "email_dms_core_model_storage_slice_descriptor_verified");
});

test("CP00-274 plan binding covers the planned 40 RP08 model binding slice units", () => {
  const coverage = validateEmailDmsCoreCp274Coverage(cp274PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.pack_id, "CP00-274");
  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.range, "RP08.P01.M04.S07-RP08.P01.M06.S04");
  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.upstream_pack_id, "CP00-273");
  assert.equal(EMAIL_DMS_CORE_CP274_PACK_BINDING.next_pack_id, "CP00-275");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P01.M05"], 22);
});

test("CP00-274 model binding slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp274ModelBindingSliceCaseSet();
  const descriptor = createEmailDmsCoreCp274ModelBindingSliceDescriptor();
  const validation = validateEmailDmsCoreCp274ModelBindingSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP274_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P01.M05"].rows;
  assert.equal(m05.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(m05.ownership_drift_test.ownership_drift_detected, false);
  assert.equal(EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-274 evidence packets and handoff preserve model binding slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp274ModelBindingSliceDescriptor();
  const hermes = createEmailDmsCoreCp274HermesEvidencePacket(cp274PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp274ClaudeReviewPacket(cp274PlanPack);
  const handoff = createEmailDmsCoreCp274CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-274-to-CP00-275");
  assert.equal(handoff.next_subphase_id, "RP08.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "email_dms_core_model_binding_slice_descriptor_verified");
});

test("CP00-275 plan binding covers the planned 150 RP08 P01 closeout and P02 service foundation units", () => {
  const coverage = validateEmailDmsCoreCp275Coverage(cp275PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.pack_id, "CP00-275");
  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.range, "RP08.P01.M06.S05-RP08.P02.M02.S22");
  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.upstream_pack_id, "CP00-274");
  assert.equal(EMAIL_DMS_CORE_CP275_PACK_BINDING.next_pack_id, "CP00-276");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P01"], 88);
  assert.equal(coverage.summary.by_phase["RP08.P02"], 62);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP275_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-275 P01 closeout and P02 service foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor();
  const validation = validateEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP275_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP08.P02.M02"].rows;
  assert.equal(m02.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m02.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m02.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-275 evidence packets and handoff route the P01 closeout to the P02 service phase", () => {
  const descriptor = createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor();
  const hermes = createEmailDmsCoreCp275HermesEvidencePacket(cp275PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp275ClaudeReviewPacket(cp275PlanPack);
  const handoff = createEmailDmsCoreCp275CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-275-to-CP00-276");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p01_closeout_p02_service_foundation_descriptor_verified");
});

test("CP00-276 plan binding covers the planned 40 RP08 service slice units", () => {
  const coverage = validateEmailDmsCoreCp276Coverage(cp276PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.pack_id, "CP00-276");
  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.range, "RP08.P02.M03.S01-RP08.P02.M04.S18");
  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.upstream_pack_id, "CP00-275");
  assert.equal(EMAIL_DMS_CORE_CP276_PACK_BINDING.next_pack_id, "CP00-277");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P02.M03"], 22);
});

test("CP00-276 service slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp276ServiceSliceCaseSet();
  const descriptor = createEmailDmsCoreCp276ServiceSliceDescriptor();
  const validation = validateEmailDmsCoreCp276ServiceSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP276_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P02.M03"].rows;
  assert.equal(m03.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m03.persistence_boundary.creates_database_rows, false);
  assert.equal(m03.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-276 evidence packets and handoff preserve service slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp276ServiceSliceDescriptor();
  const hermes = createEmailDmsCoreCp276HermesEvidencePacket(cp276PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp276ClaudeReviewPacket(cp276PlanPack);
  const handoff = createEmailDmsCoreCp276CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-276-to-CP00-277");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M04.S19");
  assert.equal(handoff.production_ready_flag, "email_dms_core_service_slice_descriptor_verified");
});

test("CP00-277 plan binding covers the planned 40 RP08 service binding slice units", () => {
  const coverage = validateEmailDmsCoreCp277Coverage(cp277PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.pack_id, "CP00-277");
  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.range, "RP08.P02.M04.S19-RP08.P02.M06.S14");
  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.upstream_pack_id, "CP00-276");
  assert.equal(EMAIL_DMS_CORE_CP277_PACK_BINDING.next_pack_id, "CP00-278");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P02.M05"], 22);
});

test("CP00-277 service binding slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp277ServiceBindingSliceCaseSet();
  const descriptor = createEmailDmsCoreCp277ServiceBindingSliceDescriptor();
  const validation = validateEmailDmsCoreCp277ServiceBindingSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP277_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P02.M05"].rows;
  assert.equal(m05.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m05.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m05.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-277 evidence packets and handoff preserve service binding slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp277ServiceBindingSliceDescriptor();
  const hermes = createEmailDmsCoreCp277HermesEvidencePacket(cp277PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp277ClaudeReviewPacket(cp277PlanPack);
  const handoff = createEmailDmsCoreCp277CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-277-to-CP00-278");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M06.S15");
  assert.equal(handoff.production_ready_flag, "email_dms_core_service_binding_slice_descriptor_verified");
});

test("CP00-278 plan binding covers the planned 10 RP08 service fixture tail units", () => {
  const coverage = validateEmailDmsCoreCp278Coverage(cp278PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.pack_id, "CP00-278");
  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.range, "RP08.P02.M06.S15-RP08.P02.M07.S02");
  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.upstream_pack_id, "CP00-277");
  assert.equal(EMAIL_DMS_CORE_CP278_PACK_BINDING.next_pack_id, "CP00-279");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P02.M06"], 8);
});

test("CP00-278 service fixture tail rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp278ServiceFixtureTailCaseSet();
  const descriptor = createEmailDmsCoreCp278ServiceFixtureTailDescriptor();
  const validation = validateEmailDmsCoreCp278ServiceFixtureTailDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP278_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP08.P02.M06"].rows;
  assert.equal(m06.blocked_claim_output.blocked_claim_detail_included, false);
  assert.equal(m06.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-278 evidence packets and handoff preserve service fixture tail authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp278ServiceFixtureTailDescriptor();
  const hermes = createEmailDmsCoreCp278HermesEvidencePacket(cp278PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp278ClaudeReviewPacket(cp278PlanPack);
  const handoff = createEmailDmsCoreCp278CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-278-to-CP00-279");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M07.S03");
  assert.equal(handoff.production_ready_flag, "email_dms_core_service_fixture_tail_descriptor_verified");
});

test("CP00-279 plan binding covers the planned 10 RP08 service golden mid units", () => {
  const coverage = validateEmailDmsCoreCp279Coverage(cp279PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.pack_id, "CP00-279");
  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.range, "RP08.P02.M07.S03-RP08.P02.M07.S12");
  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.upstream_pack_id, "CP00-278");
  assert.equal(EMAIL_DMS_CORE_CP279_PACK_BINDING.next_pack_id, "CP00-280");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P02.M07"], 10);
});

test("CP00-279 service golden mid rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp279ServiceGoldenMidCaseSet();
  const descriptor = createEmailDmsCoreCp279ServiceGoldenMidDescriptor();
  const validation = validateEmailDmsCoreCp279ServiceGoldenMidDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP279_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP08.P02.M07"].rows;
  assert.equal(m07.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m07.persistence_boundary.creates_database_rows, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-279 evidence packets and handoff preserve service golden mid authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp279ServiceGoldenMidDescriptor();
  const hermes = createEmailDmsCoreCp279HermesEvidencePacket(cp279PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp279ClaudeReviewPacket(cp279PlanPack);
  const handoff = createEmailDmsCoreCp279CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-279-to-CP00-280");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M07.S13");
  assert.equal(handoff.production_ready_flag, "email_dms_core_service_golden_mid_descriptor_verified");
});

test("CP00-280 plan binding covers the planned 40 RP08 golden hermes slice units", () => {
  const coverage = validateEmailDmsCoreCp280Coverage(cp280PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.pack_id, "CP00-280");
  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.range, "RP08.P02.M07.S13-RP08.P02.M09.S08");
  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.upstream_pack_id, "CP00-279");
  assert.equal(EMAIL_DMS_CORE_CP280_PACK_BINDING.next_pack_id, "CP00-281");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P02.M08"], 22);
});

test("CP00-280 golden hermes slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp280GoldenHermesSliceCaseSet();
  const descriptor = createEmailDmsCoreCp280GoldenHermesSliceDescriptor();
  const validation = validateEmailDmsCoreCp280GoldenHermesSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP280_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m08 = caseSet.sections["RP08.P02.M08"].rows;
  assert.equal(m08.permission_precheck.deny_over_allow_enforced, true);
  assert.equal(m08.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-280 evidence packets and handoff preserve golden hermes slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp280GoldenHermesSliceDescriptor();
  const hermes = createEmailDmsCoreCp280HermesEvidencePacket(cp280PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp280ClaudeReviewPacket(cp280PlanPack);
  const handoff = createEmailDmsCoreCp280CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-280-to-CP00-281");
  assert.equal(handoff.next_subphase_id, "RP08.P02.M09.S09");
  assert.equal(handoff.production_ready_flag, "email_dms_core_golden_hermes_slice_descriptor_verified");
});

test("CP00-281 plan binding covers the planned 150 RP08 P02 closeout and P03 interface foundation units", () => {
  const coverage = validateEmailDmsCoreCp281Coverage(cp281PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.pack_id, "CP00-281");
  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.range, "RP08.P02.M09.S09-RP08.P03.M06.S12");
  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.upstream_pack_id, "CP00-280");
  assert.equal(EMAIL_DMS_CORE_CP281_PACK_BINDING.next_pack_id, "CP00-282");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P02"], 34);
  assert.equal(coverage.summary.by_phase["RP08.P03"], 116);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP281_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-281 P02 closeout and P03 interface foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor();
  const validation = validateEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP281_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P03.M03"].rows;
  assert.equal(m03.permission_annotation.deny_over_allow_enforced, true);
  assert.equal(m03.pagination_or_filtering_contract.no_unauthorized_count_leak, true);
  assert.equal(m03.schema_drift_check.schema_drift_detected, false);
  assert.equal(m03.backward_compatibility_check.backward_compatibility_broken, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-281 evidence packets and handoff route the P02 closeout to the P03 interface phase", () => {
  const descriptor = createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor();
  const hermes = createEmailDmsCoreCp281HermesEvidencePacket(cp281PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp281ClaudeReviewPacket(cp281PlanPack);
  const handoff = createEmailDmsCoreCp281CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-281-to-CP00-282");
  assert.equal(handoff.next_subphase_id, "RP08.P03.M06.S13");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p02_closeout_p03_interface_foundation_descriptor_verified");
});

test("CP00-282 plan binding covers the planned 150 RP08 P03 closeout and P04 UI foundation units", () => {
  const coverage = validateEmailDmsCoreCp282Coverage(cp282PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.pack_id, "CP00-282");
  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.range, "RP08.P03.M06.S13-RP08.P04.M03.S20");
  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.upstream_pack_id, "CP00-281");
  assert.equal(EMAIL_DMS_CORE_CP282_PACK_BINDING.next_pack_id, "CP00-283");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P03"], 80);
  assert.equal(coverage.summary.by_phase["RP08.P04"], 70);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP282_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-282 P03 closeout and P04 UI foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp282P03CloseoutP04UiFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor();
  const validation = validateEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP282_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP08.P04.M01"].rows;
  assert.equal(m01.denied_state.permission_decision_detail_included, false);
  assert.equal(m01.empty_state.no_unauthorized_count_leak, true);
  assert.equal(m01.build_smoke.executes_ui_runtime, false);
  assert.equal(m01.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-282 evidence packets and handoff route the P03 closeout to the P04 UI phase", () => {
  const descriptor = createEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor();
  const hermes = createEmailDmsCoreCp282HermesEvidencePacket(cp282PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp282ClaudeReviewPacket(cp282PlanPack);
  const handoff = createEmailDmsCoreCp282CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-282-to-CP00-283");
  assert.equal(handoff.next_subphase_id, "RP08.P04.M03.S21");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p03_closeout_p04_ui_foundation_descriptor_verified");
});

test("CP00-283 plan binding covers the planned 40 RP08 UI workflow slice units", () => {
  const coverage = validateEmailDmsCoreCp283Coverage(cp283PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.pack_id, "CP00-283");
  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.range, "RP08.P04.M03.S21-RP08.P04.M05.S16");
  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.upstream_pack_id, "CP00-282");
  assert.equal(EMAIL_DMS_CORE_CP283_PACK_BINDING.next_pack_id, "CP00-284");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P04.M04"], 22);
});

test("CP00-283 UI workflow slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp283UiWorkflowSliceCaseSet();
  const descriptor = createEmailDmsCoreCp283UiWorkflowSliceDescriptor();
  const validation = validateEmailDmsCoreCp283UiWorkflowSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP283_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP08.P04.M04"].rows;
  assert.equal(m04.denied_state.permission_decision_detail_included, false);
  assert.equal(m04.no_unauthorized_count_leak.no_unauthorized_count_leak, true);
  assert.equal(m04.state_snapshot.state_snapshot_descriptor_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-283 evidence packets and handoff preserve UI workflow slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp283UiWorkflowSliceDescriptor();
  const hermes = createEmailDmsCoreCp283HermesEvidencePacket(cp283PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp283ClaudeReviewPacket(cp283PlanPack);
  const handoff = createEmailDmsCoreCp283CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-283-to-CP00-284");
  assert.equal(handoff.next_subphase_id, "RP08.P04.M05.S17");
  assert.equal(handoff.production_ready_flag, "email_dms_core_ui_workflow_slice_descriptor_verified");
});

test("CP00-284 plan binding covers the planned 10 RP08 UI binding tail units", () => {
  const coverage = validateEmailDmsCoreCp284Coverage(cp284PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.pack_id, "CP00-284");
  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.range, "RP08.P04.M05.S17-RP08.P04.M06.S04");
  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.upstream_pack_id, "CP00-283");
  assert.equal(EMAIL_DMS_CORE_CP284_PACK_BINDING.next_pack_id, "CP00-285");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P04.M05"], 6);
});

test("CP00-284 UI binding tail rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp284UiBindingTailCaseSet();
  const descriptor = createEmailDmsCoreCp284UiBindingTailDescriptor();
  const validation = validateEmailDmsCoreCp284UiBindingTailDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP284_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P04.M05"].rows;
  assert.equal(m05.build_smoke.executes_ui_runtime, false);
  assert.equal(m05.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(m05.no_unauthorized_count_leak.no_unauthorized_count_leak, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-284 evidence packets and handoff preserve UI binding tail authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp284UiBindingTailDescriptor();
  const hermes = createEmailDmsCoreCp284HermesEvidencePacket(cp284PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp284ClaudeReviewPacket(cp284PlanPack);
  const handoff = createEmailDmsCoreCp284CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-284-to-CP00-285");
  assert.equal(handoff.next_subphase_id, "RP08.P04.M06.S05");
  assert.equal(handoff.production_ready_flag, "email_dms_core_ui_binding_tail_descriptor_verified");
});

test("CP00-285 plan binding covers the planned 150 RP08 P04 closeout and P05 fixture foundation units", () => {
  const coverage = validateEmailDmsCoreCp285Coverage(cp285PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.pack_id, "CP00-285");
  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.range, "RP08.P04.M06.S05-RP08.P05.M03.S08");
  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.upstream_pack_id, "CP00-284");
  assert.equal(EMAIL_DMS_CORE_CP285_PACK_BINDING.next_pack_id, "CP00-286");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P04"], 92);
  assert.equal(coverage.summary.by_phase["RP08.P05"], 58);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP285_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-285 P04 closeout and P05 fixture foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor();
  const validation = validateEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP285_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP08.P05.M01"].rows;
  assert.equal(m01.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m01.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m01.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m01.no_real_data_check.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-285 evidence packets and handoff route the P04 closeout to the P05 fixture phase", () => {
  const descriptor = createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor();
  const hermes = createEmailDmsCoreCp285HermesEvidencePacket(cp285PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp285ClaudeReviewPacket(cp285PlanPack);
  const handoff = createEmailDmsCoreCp285CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-285-to-CP00-286");
  assert.equal(handoff.next_subphase_id, "RP08.P05.M03.S09");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p04_closeout_p05_fixture_foundation_descriptor_verified");
});

test("CP00-286 plan binding covers the planned 10 RP08 fixture slice units", () => {
  const coverage = validateEmailDmsCoreCp286Coverage(cp286PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.pack_id, "CP00-286");
  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.range, "RP08.P05.M03.S09-RP08.P05.M03.S18");
  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.upstream_pack_id, "CP00-285");
  assert.equal(EMAIL_DMS_CORE_CP286_PACK_BINDING.next_pack_id, "CP00-287");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P05.M03"], 10);
});

test("CP00-286 fixture slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp286FixtureSliceCaseSet();
  const descriptor = createEmailDmsCoreCp286FixtureSliceDescriptor();
  const validation = validateEmailDmsCoreCp286FixtureSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP286_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P05.M03"].rows;
  assert.equal(m03.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m03.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m03.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-286 evidence packets and handoff preserve fixture slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp286FixtureSliceDescriptor();
  const hermes = createEmailDmsCoreCp286HermesEvidencePacket(cp286PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp286ClaudeReviewPacket(cp286PlanPack);
  const handoff = createEmailDmsCoreCp286CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-286-to-CP00-287");
  assert.equal(handoff.next_subphase_id, "RP08.P05.M03.S19");
  assert.equal(handoff.production_ready_flag, "email_dms_core_fixture_slice_descriptor_verified");
});

test("CP00-287 plan binding covers the planned 150 RP08 P05 closeout and P06 permission foundation units", () => {
  const coverage = validateEmailDmsCoreCp287Coverage(cp287PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.pack_id, "CP00-287");
  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.range, "RP08.P05.M03.S19-RP08.P06.M00.S06");
  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.upstream_pack_id, "CP00-286");
  assert.equal(EMAIL_DMS_CORE_CP287_PACK_BINDING.next_pack_id, "CP00-288");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P05"], 144);
  assert.equal(coverage.summary.by_phase["RP08.P06"], 6);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP287_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-287 P05 closeout and P06 permission foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor();
  const validation = validateEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP287_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP08.P05.M04"].rows;
  assert.equal(m04.stable_id_check.stable_ids_used, true);
  assert.equal(m04.replay_command.executes_command_runtime, false);
  const m00 = caseSet.sections["RP08.P06.M00"].rows;
  assert.equal(m00.permission_matrix_row.deny_over_allow_enforced, true);
  assert.equal(m00.view_decision_binding.permission_decision_detail_included, false);
  assert.equal(m00.share_decision_binding.deny_over_allow_enforced, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-287 evidence packets and handoff route the P05 closeout to the P06 permission phase", () => {
  const descriptor = createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor();
  const hermes = createEmailDmsCoreCp287HermesEvidencePacket(cp287PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp287ClaudeReviewPacket(cp287PlanPack);
  const handoff = createEmailDmsCoreCp287CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-287-to-CP00-288");
  assert.equal(handoff.next_subphase_id, "RP08.P06.M00.S07");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p05_closeout_p06_permission_foundation_descriptor_verified");
});

test("CP00-288 plan binding covers the planned 150 RP08 permission slice units", () => {
  const coverage = validateEmailDmsCoreCp288Coverage(cp288PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.pack_id, "CP00-288");
  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.range, "RP08.P06.M00.S07-RP08.P06.M07.S06");
  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.upstream_pack_id, "CP00-287");
  assert.equal(EMAIL_DMS_CORE_CP288_PACK_BINDING.next_pack_id, "CP00-289");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P06"], 150);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP288_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-288 permission slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp288PermissionSliceCaseSet();
  const descriptor = createEmailDmsCoreCp288PermissionSliceDescriptor();
  const validation = validateEmailDmsCoreCp288PermissionSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP288_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P06.M03"].rows;
  assert.equal(m03.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m03.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m03.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m03.leak_prevention_test.leak_detected, false);
  assert.equal(m03.audit_event_expectation.writes_audit_event, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-288 evidence packets and handoff preserve permission slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp288PermissionSliceDescriptor();
  const hermes = createEmailDmsCoreCp288HermesEvidencePacket(cp288PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp288ClaudeReviewPacket(cp288PlanPack);
  const handoff = createEmailDmsCoreCp288CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-288-to-CP00-289");
  assert.equal(handoff.next_subphase_id, "RP08.P06.M07.S07");
  assert.equal(handoff.production_ready_flag, "email_dms_core_permission_slice_descriptor_verified");
});

test("CP00-289 plan binding covers the planned 40 RP08 permission binding slice units", () => {
  const coverage = validateEmailDmsCoreCp289Coverage(cp289PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.pack_id, "CP00-289");
  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.range, "RP08.P06.M07.S07-RP08.P06.M09.S02");
  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.upstream_pack_id, "CP00-288");
  assert.equal(EMAIL_DMS_CORE_CP289_PACK_BINDING.next_pack_id, "CP00-290");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P06.M08"], 22);
});

test("CP00-289 permission binding slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp289PermissionBindingSliceCaseSet();
  const descriptor = createEmailDmsCoreCp289PermissionBindingSliceDescriptor();
  const validation = validateEmailDmsCoreCp289PermissionBindingSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP289_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m08 = caseSet.sections["RP08.P06.M08"].rows;
  assert.equal(m08.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m08.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m08.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-289 evidence packets and handoff preserve permission binding slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp289PermissionBindingSliceDescriptor();
  const hermes = createEmailDmsCoreCp289HermesEvidencePacket(cp289PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp289ClaudeReviewPacket(cp289PlanPack);
  const handoff = createEmailDmsCoreCp289CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-289-to-CP00-290");
  assert.equal(handoff.next_subphase_id, "RP08.P06.M09.S03");
  assert.equal(handoff.production_ready_flag, "email_dms_core_permission_binding_slice_descriptor_verified");
});

test("CP00-290 plan binding covers the planned 150 RP08 P06 closeout and P07 failure foundation units", () => {
  const coverage = validateEmailDmsCoreCp290Coverage(cp290PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.pack_id, "CP00-290");
  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.range, "RP08.P06.M09.S03-RP08.P07.M05.S04");
  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.upstream_pack_id, "CP00-289");
  assert.equal(EMAIL_DMS_CORE_CP290_PACK_BINDING.next_pack_id, "CP00-291");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P06"], 40);
  assert.equal(coverage.summary.by_phase["RP08.P07"], 110);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP290_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-290 P06 closeout and P07 failure foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp290P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP290_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P07.M03"].rows;
  assert.equal(m03.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m03.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m03.retry_exhaustion_failure.performs_retry_runtime, false);
  assert.equal(m03.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m03.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-290 evidence packets and handoff route the P06 closeout to the P07 failure phase", () => {
  const descriptor = createEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createEmailDmsCoreCp290HermesEvidencePacket(cp290PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp290ClaudeReviewPacket(cp290PlanPack);
  const handoff = createEmailDmsCoreCp290CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-290-to-CP00-291");
  assert.equal(handoff.next_subphase_id, "RP08.P07.M05.S05");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-291 plan binding covers the planned 10 RP08 failure slice units", () => {
  const coverage = validateEmailDmsCoreCp291Coverage(cp291PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.pack_id, "CP00-291");
  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.range, "RP08.P07.M05.S05-RP08.P07.M05.S14");
  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.upstream_pack_id, "CP00-290");
  assert.equal(EMAIL_DMS_CORE_CP291_PACK_BINDING.next_pack_id, "CP00-292");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P07.M05"], 10);
});

test("CP00-291 failure slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp291FailureSliceCaseSet();
  const descriptor = createEmailDmsCoreCp291FailureSliceDescriptor();
  const validation = validateEmailDmsCoreCp291FailureSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP291_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P07.M05"].rows;
  assert.equal(m05.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m05.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m05.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-291 evidence packets and handoff preserve failure slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp291FailureSliceDescriptor();
  const hermes = createEmailDmsCoreCp291HermesEvidencePacket(cp291PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp291ClaudeReviewPacket(cp291PlanPack);
  const handoff = createEmailDmsCoreCp291CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-291-to-CP00-292");
  assert.equal(handoff.next_subphase_id, "RP08.P07.M05.S15");
  assert.equal(handoff.production_ready_flag, "email_dms_core_failure_slice_descriptor_verified");
});

test("CP00-292 plan binding covers the planned 10 RP08 failure binding slice units", () => {
  const coverage = validateEmailDmsCoreCp292Coverage(cp292PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.pack_id, "CP00-292");
  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.risk_class, "A");
  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.unit_count, 10);
  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.range, "RP08.P07.M05.S15-RP08.P07.M06.S02");
  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.upstream_pack_id, "CP00-291");
  assert.equal(EMAIL_DMS_CORE_CP292_PACK_BINDING.next_pack_id, "CP00-293");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP08.P07.M05"], 8);
});

test("CP00-292 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp292FailureBindingSliceCaseSet();
  const descriptor = createEmailDmsCoreCp292FailureBindingSliceDescriptor();
  const validation = validateEmailDmsCoreCp292FailureBindingSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP292_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P07.M05"].rows;
  assert.equal(m05.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(m05.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-292 evidence packets and handoff preserve failure binding slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp292FailureBindingSliceDescriptor();
  const hermes = createEmailDmsCoreCp292HermesEvidencePacket(cp292PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp292ClaudeReviewPacket(cp292PlanPack);
  const handoff = createEmailDmsCoreCp292CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-292-to-CP00-293");
  assert.equal(handoff.next_subphase_id, "RP08.P07.M06.S03");
  assert.equal(handoff.production_ready_flag, "email_dms_core_failure_binding_slice_descriptor_verified");
});

test("CP00-293 plan binding covers the planned 150 RP08 P07 closeout and P08 hermes foundation units", () => {
  const coverage = validateEmailDmsCoreCp293Coverage(cp293PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.pack_id, "CP00-293");
  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.range, "RP08.P07.M06.S03-RP08.P08.M02.S14");
  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.upstream_pack_id, "CP00-292");
  assert.equal(EMAIL_DMS_CORE_CP293_PACK_BINDING.next_pack_id, "CP00-294");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P07"], 106);
  assert.equal(coverage.summary.by_phase["RP08.P08"], 44);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP293_REQUIREMENTS.required_section_rows).length, 8);
});

test("CP00-293 P07 closeout and P08 hermes foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp293P07CloseoutP08HermesFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor();
  const validation = validateEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP293_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m01 = caseSet.sections["RP08.P08.M01"].rows;
  assert.equal(m01.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m01.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m01.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(m01.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m01.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-293 evidence packets and handoff route the P07 closeout to the P08 hermes phase", () => {
  const descriptor = createEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor();
  const hermes = createEmailDmsCoreCp293HermesEvidencePacket(cp293PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp293ClaudeReviewPacket(cp293PlanPack);
  const handoff = createEmailDmsCoreCp293CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-293-to-CP00-294");
  assert.equal(handoff.next_subphase_id, "RP08.P08.M02.S15");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p07_closeout_p08_hermes_foundation_descriptor_verified");
});

test("CP00-294 plan binding covers the planned 40 RP08 hermes slice units", () => {
  const coverage = validateEmailDmsCoreCp294Coverage(cp294PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.pack_id, "CP00-294");
  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.range, "RP08.P08.M02.S15-RP08.P08.M04.S12");
  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.upstream_pack_id, "CP00-293");
  assert.equal(EMAIL_DMS_CORE_CP294_PACK_BINDING.next_pack_id, "CP00-295");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P08.M03"], 22);
});

test("CP00-294 hermes slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp294HermesSliceCaseSet();
  const descriptor = createEmailDmsCoreCp294HermesSliceDescriptor();
  const validation = validateEmailDmsCoreCp294HermesSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP294_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP08.P08.M03"].rows;
  assert.equal(m03.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m03.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(m03.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-294 evidence packets and handoff preserve hermes slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp294HermesSliceDescriptor();
  const hermes = createEmailDmsCoreCp294HermesEvidencePacket(cp294PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp294ClaudeReviewPacket(cp294PlanPack);
  const handoff = createEmailDmsCoreCp294CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-294-to-CP00-295");
  assert.equal(handoff.next_subphase_id, "RP08.P08.M04.S13");
  assert.equal(handoff.production_ready_flag, "email_dms_core_hermes_slice_descriptor_verified");
});

test("CP00-295 plan binding covers the planned 40 RP08 hermes binding slice units", () => {
  const coverage = validateEmailDmsCoreCp295Coverage(cp295PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.pack_id, "CP00-295");
  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.range, "RP08.P08.M04.S13-RP08.P08.M06.S08");
  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.upstream_pack_id, "CP00-294");
  assert.equal(EMAIL_DMS_CORE_CP295_PACK_BINDING.next_pack_id, "CP00-296");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P08.M05"], 22);
});

test("CP00-295 hermes binding slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp295HermesBindingSliceCaseSet();
  const descriptor = createEmailDmsCoreCp295HermesBindingSliceDescriptor();
  const validation = validateEmailDmsCoreCp295HermesBindingSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP295_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P08.M05"].rows;
  assert.equal(m05.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m05.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m05.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-295 evidence packets and handoff preserve hermes binding slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp295HermesBindingSliceDescriptor();
  const hermes = createEmailDmsCoreCp295HermesEvidencePacket(cp295PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp295ClaudeReviewPacket(cp295PlanPack);
  const handoff = createEmailDmsCoreCp295CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-295-to-CP00-296");
  assert.equal(handoff.next_subphase_id, "RP08.P08.M06.S09");
  assert.equal(handoff.production_ready_flag, "email_dms_core_hermes_binding_slice_descriptor_verified");
});

test("CP00-296 plan binding covers the planned 150 RP08 P08 closeout and P09 review foundation units", () => {
  const coverage = validateEmailDmsCoreCp296Coverage(cp296PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.pack_id, "CP00-296");
  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.unit_count, 150);
  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.range, "RP08.P08.M06.S09-RP08.P09.M03.S22");
  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.upstream_pack_id, "CP00-295");
  assert.equal(EMAIL_DMS_CORE_CP296_PACK_BINDING.next_pack_id, "CP00-297");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP08.P08"], 88);
  assert.equal(coverage.summary.by_phase["RP08.P09"], 62);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP296_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-296 P08 closeout and P09 review foundation rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationCaseSet();
  const descriptor = createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor();
  const validation = validateEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP296_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP08.P09.M02"].rows;
  assert.equal(m02.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m02.ui_leak_questions.leak_detected, false);
  assert.equal(m02.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m02.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-296 evidence packets and handoff route the P08 closeout to the P09 review phase", () => {
  const descriptor = createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor();
  const hermes = createEmailDmsCoreCp296HermesEvidencePacket(cp296PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp296ClaudeReviewPacket(cp296PlanPack);
  const handoff = createEmailDmsCoreCp296CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-296-to-CP00-297");
  assert.equal(handoff.next_subphase_id, "RP08.P09.M04.S01");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p08_closeout_p09_review_foundation_descriptor_verified");
});

test("CP00-297 plan binding covers the planned 40 RP08 review slice units", () => {
  const coverage = validateEmailDmsCoreCp297Coverage(cp297PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.pack_id, "CP00-297");
  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.risk_class, "B");
  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.unit_count, 40);
  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.range, "RP08.P09.M04.S01-RP08.P09.M05.S20");
  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.upstream_pack_id, "CP00-296");
  assert.equal(EMAIL_DMS_CORE_CP297_PACK_BINDING.next_pack_id, "CP00-298");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP08.P09.M04"], 20);
});

test("CP00-297 review slice rows stay descriptor-only", () => {
  const caseSet = createEmailDmsCoreCp297ReviewSliceCaseSet();
  const descriptor = createEmailDmsCoreCp297ReviewSliceDescriptor();
  const validation = validateEmailDmsCoreCp297ReviewSliceDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP297_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP08.P09.M05"].rows;
  assert.equal(m05.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m05.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m05.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-297 evidence packets and handoff preserve review slice authority boundaries", () => {
  const descriptor = createEmailDmsCoreCp297ReviewSliceDescriptor();
  const hermes = createEmailDmsCoreCp297HermesEvidencePacket(cp297PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp297ClaudeReviewPacket(cp297PlanPack);
  const handoff = createEmailDmsCoreCp297CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-297-to-CP00-298");
  assert.equal(handoff.next_subphase_id, "RP08.P09.M06.S01");
  assert.equal(handoff.production_ready_flag, "email_dms_core_review_slice_descriptor_verified");
});

test("CP00-298 plan binding covers the planned 92 RP08 P09 closeout units", () => {
  const coverage = validateEmailDmsCoreCp298Coverage(cp298PlanPack);

  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.pack_id, "CP00-298");
  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.risk_class, "C");
  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.unit_count, 92);
  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.range, "RP08.P09.M06.S01-RP08.P09.M10.S10");
  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.upstream_pack_id, "CP00-297");
  assert.equal(EMAIL_DMS_CORE_CP298_PACK_BINDING.next_pack_id, "CP00-299");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 92);
  assert.equal(coverage.summary.by_micro_phase["RP08.P09.M07"], 22);
  assert.equal(Object.keys(EMAIL_DMS_CORE_CP298_REQUIREMENTS.required_section_rows).length, 5);
});

test("CP00-298 P09 closeout rows stay descriptor-only and close the RP08 program scope", () => {
  const caseSet = createEmailDmsCoreCp298P09CloseoutCaseSet();
  const descriptor = createEmailDmsCoreCp298P09CloseoutDescriptor();
  const validation = validateEmailDmsCoreCp298P09CloseoutDescriptor(descriptor, emailDmsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP298_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m10 = caseSet.sections["RP08.P09.M10"].rows;
  assert.equal(m10.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m10.ui_leak_questions.leak_detected, false);
  assert.equal(m10.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-298 evidence packets and handoff route the RP08 closeout to the RP09 bootstrap", () => {
  const descriptor = createEmailDmsCoreCp298P09CloseoutDescriptor();
  const hermes = createEmailDmsCoreCp298HermesEvidencePacket(cp298PlanPack, emailDmsContract, descriptor);
  const claude = createEmailDmsCoreCp298ClaudeReviewPacket(cp298PlanPack);
  const handoff = createEmailDmsCoreCp298CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-298-to-CP00-299");
  assert.equal(handoff.next_subphase_id, "RP09.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "email_dms_core_p09_closeout_descriptor_verified");
});
