import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
} from "../packages/email-dms/src/index.js";

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

const emailDmsContract = await readJson("../contracts/email-dms-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp272Manifest = await readOptionalJson("../docs/closeout-packs/cp00-272/manifest.json");
const cp273Manifest = await readOptionalJson("../docs/closeout-packs/cp00-273/manifest.json");
const cp274Manifest = await readOptionalJson("../docs/closeout-packs/cp00-274/manifest.json");
const cp275Manifest = await readOptionalJson("../docs/closeout-packs/cp00-275/manifest.json");
const cp276Manifest = await readOptionalJson("../docs/closeout-packs/cp00-276/manifest.json");
const cp277Manifest = await readOptionalJson("../docs/closeout-packs/cp00-277/manifest.json");
const cp278Manifest = await readOptionalJson("../docs/closeout-packs/cp00-278/manifest.json");
const cp279Manifest = await readOptionalJson("../docs/closeout-packs/cp00-279/manifest.json");
const cp280Manifest = await readOptionalJson("../docs/closeout-packs/cp00-280/manifest.json");
const cp281Manifest = await readOptionalJson("../docs/closeout-packs/cp00-281/manifest.json");
const cp282Manifest = await readOptionalJson("../docs/closeout-packs/cp00-282/manifest.json");
const cp283Manifest = await readOptionalJson("../docs/closeout-packs/cp00-283/manifest.json");
const cp284Manifest = await readOptionalJson("../docs/closeout-packs/cp00-284/manifest.json");
const cp285Manifest = await readOptionalJson("../docs/closeout-packs/cp00-285/manifest.json");
const cp286Manifest = await readOptionalJson("../docs/closeout-packs/cp00-286/manifest.json");
const cp287Manifest = await readOptionalJson("../docs/closeout-packs/cp00-287/manifest.json");
const cp288Manifest = await readOptionalJson("../docs/closeout-packs/cp00-288/manifest.json");
const cp289Manifest = await readOptionalJson("../docs/closeout-packs/cp00-289/manifest.json");
const cp290Manifest = await readOptionalJson("../docs/closeout-packs/cp00-290/manifest.json");
const cp291Manifest = await readOptionalJson("../docs/closeout-packs/cp00-291/manifest.json");
const cp292Manifest = await readOptionalJson("../docs/closeout-packs/cp00-292/manifest.json");
const cp293Manifest = await readOptionalJson("../docs/closeout-packs/cp00-293/manifest.json");
const cp294Manifest = await readOptionalJson("../docs/closeout-packs/cp00-294/manifest.json");
const cp295Manifest = await readOptionalJson("../docs/closeout-packs/cp00-295/manifest.json");
const cp296Manifest = await readOptionalJson("../docs/closeout-packs/cp00-296/manifest.json");
const cp297Manifest = await readOptionalJson("../docs/closeout-packs/cp00-297/manifest.json");
const cp298Manifest = await readOptionalJson("../docs/closeout-packs/cp00-298/manifest.json");
const cp272PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-272") ?? cp272Manifest?.plan_binding_snapshot;
const cp273PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-273") ?? cp273Manifest?.plan_binding_snapshot;
const cp274PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-274") ?? cp274Manifest?.plan_binding_snapshot;
const cp275PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-275") ?? cp275Manifest?.plan_binding_snapshot;
const cp276PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-276") ?? cp276Manifest?.plan_binding_snapshot;
const cp277PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-277") ?? cp277Manifest?.plan_binding_snapshot;
const cp278PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-278") ?? cp278Manifest?.plan_binding_snapshot;
const cp279PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-279") ?? cp279Manifest?.plan_binding_snapshot;
const cp280PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-280") ?? cp280Manifest?.plan_binding_snapshot;
const cp281PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-281") ?? cp281Manifest?.plan_binding_snapshot;
const cp282PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-282") ?? cp282Manifest?.plan_binding_snapshot;
const cp283PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-283") ?? cp283Manifest?.plan_binding_snapshot;
const cp284PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-284") ?? cp284Manifest?.plan_binding_snapshot;
const cp285PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-285") ?? cp285Manifest?.plan_binding_snapshot;
const cp286PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-286") ?? cp286Manifest?.plan_binding_snapshot;
const cp287PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-287") ?? cp287Manifest?.plan_binding_snapshot;
const cp288PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-288") ?? cp288Manifest?.plan_binding_snapshot;
const cp289PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-289") ?? cp289Manifest?.plan_binding_snapshot;
const cp290PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-290") ?? cp290Manifest?.plan_binding_snapshot;
const cp291PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-291") ?? cp291Manifest?.plan_binding_snapshot;
const cp292PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-292") ?? cp292Manifest?.plan_binding_snapshot;
const cp293PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-293") ?? cp293Manifest?.plan_binding_snapshot;
const cp294PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-294") ?? cp294Manifest?.plan_binding_snapshot;
const cp295PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-295") ?? cp295Manifest?.plan_binding_snapshot;
const cp296PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-296") ?? cp296Manifest?.plan_binding_snapshot;
const cp297PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-297") ?? cp297Manifest?.plan_binding_snapshot;
const cp298PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-298") ?? cp298Manifest?.plan_binding_snapshot;

assert.equal(emailDmsContract.program.program_id, "RP08");
assert.equal(emailDmsContract.program.program_title, "Email And Office Native DMS");
assert.equal(emailDmsContract.program.upstream_program_id, "RP07");
assert.equal(emailDmsContract.program.hermes_gate, "H08");
assert.equal(emailDmsContract.program.claude_gate, "C08");
assert.equal(emailDmsContract.program.descriptor_only, true);
assert.equal(emailDmsContract.current_pack.pack_id, "CP00-298");
assert.equal(emailDmsContract.program.current_pack_id, "CP00-298");
assert.deepEqual(emailDmsContract.program, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_PROGRAM_CONTRACT)));
assert.deepEqual(emailDmsContract.current_pack, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP298_PACK_BINDING)));

assert.ok(cp272PlanPack, "CP00-272 must exist in closeout-pack-plan.json");
assert.equal(cp272PlanPack.unit_count, EMAIL_DMS_CORE_CP272_PACK_BINDING.unit_count, "CP00-272 unit count drift");
assert.ok(cp273PlanPack, "CP00-273 must exist in closeout-pack-plan.json");
assert.equal(cp273PlanPack.unit_count, EMAIL_DMS_CORE_CP273_PACK_BINDING.unit_count, "CP00-273 unit count drift");
assert.ok(cp274PlanPack, "CP00-274 must exist in closeout-pack-plan.json");
assert.equal(cp274PlanPack.unit_count, EMAIL_DMS_CORE_CP274_PACK_BINDING.unit_count, "CP00-274 unit count drift");
assert.ok(cp275PlanPack, "CP00-275 must exist in closeout-pack-plan.json");
assert.equal(cp275PlanPack.unit_count, EMAIL_DMS_CORE_CP275_PACK_BINDING.unit_count, "CP00-275 unit count drift");
assert.ok(cp276PlanPack, "CP00-276 must exist in closeout-pack-plan.json");
assert.equal(cp276PlanPack.unit_count, EMAIL_DMS_CORE_CP276_PACK_BINDING.unit_count, "CP00-276 unit count drift");
assert.ok(cp277PlanPack, "CP00-277 must exist in closeout-pack-plan.json");
assert.equal(cp277PlanPack.unit_count, EMAIL_DMS_CORE_CP277_PACK_BINDING.unit_count, "CP00-277 unit count drift");
assert.ok(cp278PlanPack, "CP00-278 must exist in closeout-pack-plan.json");
assert.equal(cp278PlanPack.unit_count, EMAIL_DMS_CORE_CP278_PACK_BINDING.unit_count, "CP00-278 unit count drift");
assert.ok(cp279PlanPack, "CP00-279 must exist in closeout-pack-plan.json");
assert.equal(cp279PlanPack.unit_count, EMAIL_DMS_CORE_CP279_PACK_BINDING.unit_count, "CP00-279 unit count drift");
assert.ok(cp280PlanPack, "CP00-280 must exist in closeout-pack-plan.json");
assert.equal(cp280PlanPack.unit_count, EMAIL_DMS_CORE_CP280_PACK_BINDING.unit_count, "CP00-280 unit count drift");
assert.ok(cp281PlanPack, "CP00-281 must exist in closeout-pack-plan.json");
assert.equal(cp281PlanPack.unit_count, EMAIL_DMS_CORE_CP281_PACK_BINDING.unit_count, "CP00-281 unit count drift");
assert.ok(cp282PlanPack, "CP00-282 must exist in closeout-pack-plan.json");
assert.equal(cp282PlanPack.unit_count, EMAIL_DMS_CORE_CP282_PACK_BINDING.unit_count, "CP00-282 unit count drift");
assert.ok(cp283PlanPack, "CP00-283 must exist in closeout-pack-plan.json");
assert.equal(cp283PlanPack.unit_count, EMAIL_DMS_CORE_CP283_PACK_BINDING.unit_count, "CP00-283 unit count drift");
assert.ok(cp284PlanPack, "CP00-284 must exist in closeout-pack-plan.json");
assert.equal(cp284PlanPack.unit_count, EMAIL_DMS_CORE_CP284_PACK_BINDING.unit_count, "CP00-284 unit count drift");
assert.ok(cp285PlanPack, "CP00-285 must exist in closeout-pack-plan.json");
assert.equal(cp285PlanPack.unit_count, EMAIL_DMS_CORE_CP285_PACK_BINDING.unit_count, "CP00-285 unit count drift");
assert.ok(cp286PlanPack, "CP00-286 must exist in closeout-pack-plan.json");
assert.equal(cp286PlanPack.unit_count, EMAIL_DMS_CORE_CP286_PACK_BINDING.unit_count, "CP00-286 unit count drift");
assert.ok(cp287PlanPack, "CP00-287 must exist in closeout-pack-plan.json");
assert.equal(cp287PlanPack.unit_count, EMAIL_DMS_CORE_CP287_PACK_BINDING.unit_count, "CP00-287 unit count drift");
assert.ok(cp288PlanPack, "CP00-288 must exist in closeout-pack-plan.json");
assert.equal(cp288PlanPack.unit_count, EMAIL_DMS_CORE_CP288_PACK_BINDING.unit_count, "CP00-288 unit count drift");
assert.ok(cp289PlanPack, "CP00-289 must exist in closeout-pack-plan.json");
assert.equal(cp289PlanPack.unit_count, EMAIL_DMS_CORE_CP289_PACK_BINDING.unit_count, "CP00-289 unit count drift");
assert.ok(cp290PlanPack, "CP00-290 must exist in closeout-pack-plan.json");
assert.equal(cp290PlanPack.unit_count, EMAIL_DMS_CORE_CP290_PACK_BINDING.unit_count, "CP00-290 unit count drift");
assert.ok(cp291PlanPack, "CP00-291 must exist in closeout-pack-plan.json");
assert.equal(cp291PlanPack.unit_count, EMAIL_DMS_CORE_CP291_PACK_BINDING.unit_count, "CP00-291 unit count drift");
assert.ok(cp292PlanPack, "CP00-292 must exist in closeout-pack-plan.json");
assert.equal(cp292PlanPack.unit_count, EMAIL_DMS_CORE_CP292_PACK_BINDING.unit_count, "CP00-292 unit count drift");
assert.ok(cp293PlanPack, "CP00-293 must exist in closeout-pack-plan.json");
assert.equal(cp293PlanPack.unit_count, EMAIL_DMS_CORE_CP293_PACK_BINDING.unit_count, "CP00-293 unit count drift");
assert.ok(cp294PlanPack, "CP00-294 must exist in closeout-pack-plan.json");
assert.equal(cp294PlanPack.unit_count, EMAIL_DMS_CORE_CP294_PACK_BINDING.unit_count, "CP00-294 unit count drift");
assert.ok(cp295PlanPack, "CP00-295 must exist in closeout-pack-plan.json");
assert.equal(cp295PlanPack.unit_count, EMAIL_DMS_CORE_CP295_PACK_BINDING.unit_count, "CP00-295 unit count drift");
assert.ok(cp296PlanPack, "CP00-296 must exist in closeout-pack-plan.json");
assert.equal(cp296PlanPack.unit_count, EMAIL_DMS_CORE_CP296_PACK_BINDING.unit_count, "CP00-296 unit count drift");
assert.ok(cp297PlanPack, "CP00-297 must exist in closeout-pack-plan.json");
assert.equal(cp297PlanPack.unit_count, EMAIL_DMS_CORE_CP297_PACK_BINDING.unit_count, "CP00-297 unit count drift");
assert.ok(cp298PlanPack, "CP00-298 must exist in closeout-pack-plan.json");
assert.equal(cp298PlanPack.unit_count, EMAIL_DMS_CORE_CP298_PACK_BINDING.unit_count, "CP00-298 unit count drift");

const cp272Coverage = validateEmailDmsCoreCp272Coverage(cp272PlanPack);
const cp272Descriptor = createEmailDmsCoreCp272ScopeContractFoundationDescriptor();
const cp272CaseSet = createEmailDmsCoreCp272ScopeContractFoundationCaseSet();
const cp272Foundation = validateEmailDmsCoreCp272ScopeContractFoundationDescriptor(cp272Descriptor, emailDmsContract);
const cp272Hermes = createEmailDmsCoreCp272HermesEvidencePacket(cp272PlanPack, emailDmsContract, cp272Descriptor);
const cp272Claude = createEmailDmsCoreCp272ClaudeReviewPacket(cp272PlanPack);
const cp272Handoff = createEmailDmsCoreCp272CloseoutHandoff();
const cp273Coverage = validateEmailDmsCoreCp273Coverage(cp273PlanPack);
const cp273Descriptor = createEmailDmsCoreCp273ModelStorageSliceDescriptor();
const cp273CaseSet = createEmailDmsCoreCp273ModelStorageSliceCaseSet();
const cp273Slice = validateEmailDmsCoreCp273ModelStorageSliceDescriptor(cp273Descriptor, emailDmsContract);
const cp273Hermes = createEmailDmsCoreCp273HermesEvidencePacket(cp273PlanPack, emailDmsContract, cp273Descriptor);
const cp273Claude = createEmailDmsCoreCp273ClaudeReviewPacket(cp273PlanPack);
const cp273Handoff = createEmailDmsCoreCp273CloseoutHandoff();
const cp274Coverage = validateEmailDmsCoreCp274Coverage(cp274PlanPack);
const cp274Descriptor = createEmailDmsCoreCp274ModelBindingSliceDescriptor();
const cp274CaseSet = createEmailDmsCoreCp274ModelBindingSliceCaseSet();
const cp274Slice = validateEmailDmsCoreCp274ModelBindingSliceDescriptor(cp274Descriptor, emailDmsContract);
const cp274Hermes = createEmailDmsCoreCp274HermesEvidencePacket(cp274PlanPack, emailDmsContract, cp274Descriptor);
const cp274Claude = createEmailDmsCoreCp274ClaudeReviewPacket(cp274PlanPack);
const cp274Handoff = createEmailDmsCoreCp274CloseoutHandoff();
const cp275Coverage = validateEmailDmsCoreCp275Coverage(cp275PlanPack);
const cp275Descriptor = createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor();
const cp275CaseSet = createEmailDmsCoreCp275P01CloseoutP02ServiceFoundationCaseSet();
const cp275Foundation = validateEmailDmsCoreCp275P01CloseoutP02ServiceFoundationDescriptor(cp275Descriptor, emailDmsContract);
const cp275Hermes = createEmailDmsCoreCp275HermesEvidencePacket(cp275PlanPack, emailDmsContract, cp275Descriptor);
const cp275Claude = createEmailDmsCoreCp275ClaudeReviewPacket(cp275PlanPack);
const cp275Handoff = createEmailDmsCoreCp275CloseoutHandoff();
const cp276Coverage = validateEmailDmsCoreCp276Coverage(cp276PlanPack);
const cp276Descriptor = createEmailDmsCoreCp276ServiceSliceDescriptor();
const cp276CaseSet = createEmailDmsCoreCp276ServiceSliceCaseSet();
const cp276Slice = validateEmailDmsCoreCp276ServiceSliceDescriptor(cp276Descriptor, emailDmsContract);
const cp276Hermes = createEmailDmsCoreCp276HermesEvidencePacket(cp276PlanPack, emailDmsContract, cp276Descriptor);
const cp276Claude = createEmailDmsCoreCp276ClaudeReviewPacket(cp276PlanPack);
const cp276Handoff = createEmailDmsCoreCp276CloseoutHandoff();
const cp277Coverage = validateEmailDmsCoreCp277Coverage(cp277PlanPack);
const cp277Descriptor = createEmailDmsCoreCp277ServiceBindingSliceDescriptor();
const cp277CaseSet = createEmailDmsCoreCp277ServiceBindingSliceCaseSet();
const cp277Slice = validateEmailDmsCoreCp277ServiceBindingSliceDescriptor(cp277Descriptor, emailDmsContract);
const cp277Hermes = createEmailDmsCoreCp277HermesEvidencePacket(cp277PlanPack, emailDmsContract, cp277Descriptor);
const cp277Claude = createEmailDmsCoreCp277ClaudeReviewPacket(cp277PlanPack);
const cp277Handoff = createEmailDmsCoreCp277CloseoutHandoff();
const cp278Coverage = validateEmailDmsCoreCp278Coverage(cp278PlanPack);
const cp278Descriptor = createEmailDmsCoreCp278ServiceFixtureTailDescriptor();
const cp278CaseSet = createEmailDmsCoreCp278ServiceFixtureTailCaseSet();
const cp278Tail = validateEmailDmsCoreCp278ServiceFixtureTailDescriptor(cp278Descriptor, emailDmsContract);
const cp278Hermes = createEmailDmsCoreCp278HermesEvidencePacket(cp278PlanPack, emailDmsContract, cp278Descriptor);
const cp278Claude = createEmailDmsCoreCp278ClaudeReviewPacket(cp278PlanPack);
const cp278Handoff = createEmailDmsCoreCp278CloseoutHandoff();
const cp279Coverage = validateEmailDmsCoreCp279Coverage(cp279PlanPack);
const cp279Descriptor = createEmailDmsCoreCp279ServiceGoldenMidDescriptor();
const cp279CaseSet = createEmailDmsCoreCp279ServiceGoldenMidCaseSet();
const cp279Mid = validateEmailDmsCoreCp279ServiceGoldenMidDescriptor(cp279Descriptor, emailDmsContract);
const cp279Hermes = createEmailDmsCoreCp279HermesEvidencePacket(cp279PlanPack, emailDmsContract, cp279Descriptor);
const cp279Claude = createEmailDmsCoreCp279ClaudeReviewPacket(cp279PlanPack);
const cp279Handoff = createEmailDmsCoreCp279CloseoutHandoff();
const cp280Coverage = validateEmailDmsCoreCp280Coverage(cp280PlanPack);
const cp280Descriptor = createEmailDmsCoreCp280GoldenHermesSliceDescriptor();
const cp280CaseSet = createEmailDmsCoreCp280GoldenHermesSliceCaseSet();
const cp280Slice = validateEmailDmsCoreCp280GoldenHermesSliceDescriptor(cp280Descriptor, emailDmsContract);
const cp280Hermes = createEmailDmsCoreCp280HermesEvidencePacket(cp280PlanPack, emailDmsContract, cp280Descriptor);
const cp280Claude = createEmailDmsCoreCp280ClaudeReviewPacket(cp280PlanPack);
const cp280Handoff = createEmailDmsCoreCp280CloseoutHandoff();
const cp281Coverage = validateEmailDmsCoreCp281Coverage(cp281PlanPack);
const cp281Descriptor = createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor();
const cp281CaseSet = createEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationCaseSet();
const cp281Foundation = validateEmailDmsCoreCp281P02CloseoutP03InterfaceFoundationDescriptor(cp281Descriptor, emailDmsContract);
const cp281Hermes = createEmailDmsCoreCp281HermesEvidencePacket(cp281PlanPack, emailDmsContract, cp281Descriptor);
const cp281Claude = createEmailDmsCoreCp281ClaudeReviewPacket(cp281PlanPack);
const cp281Handoff = createEmailDmsCoreCp281CloseoutHandoff();
const cp282Coverage = validateEmailDmsCoreCp282Coverage(cp282PlanPack);
const cp282Descriptor = createEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor();
const cp282CaseSet = createEmailDmsCoreCp282P03CloseoutP04UiFoundationCaseSet();
const cp282Foundation = validateEmailDmsCoreCp282P03CloseoutP04UiFoundationDescriptor(cp282Descriptor, emailDmsContract);
const cp282Hermes = createEmailDmsCoreCp282HermesEvidencePacket(cp282PlanPack, emailDmsContract, cp282Descriptor);
const cp282Claude = createEmailDmsCoreCp282ClaudeReviewPacket(cp282PlanPack);
const cp282Handoff = createEmailDmsCoreCp282CloseoutHandoff();
const cp283Coverage = validateEmailDmsCoreCp283Coverage(cp283PlanPack);
const cp283Descriptor = createEmailDmsCoreCp283UiWorkflowSliceDescriptor();
const cp283CaseSet = createEmailDmsCoreCp283UiWorkflowSliceCaseSet();
const cp283Slice = validateEmailDmsCoreCp283UiWorkflowSliceDescriptor(cp283Descriptor, emailDmsContract);
const cp283Hermes = createEmailDmsCoreCp283HermesEvidencePacket(cp283PlanPack, emailDmsContract, cp283Descriptor);
const cp283Claude = createEmailDmsCoreCp283ClaudeReviewPacket(cp283PlanPack);
const cp283Handoff = createEmailDmsCoreCp283CloseoutHandoff();
const cp284Coverage = validateEmailDmsCoreCp284Coverage(cp284PlanPack);
const cp284Descriptor = createEmailDmsCoreCp284UiBindingTailDescriptor();
const cp284CaseSet = createEmailDmsCoreCp284UiBindingTailCaseSet();
const cp284Tail = validateEmailDmsCoreCp284UiBindingTailDescriptor(cp284Descriptor, emailDmsContract);
const cp284Hermes = createEmailDmsCoreCp284HermesEvidencePacket(cp284PlanPack, emailDmsContract, cp284Descriptor);
const cp284Claude = createEmailDmsCoreCp284ClaudeReviewPacket(cp284PlanPack);
const cp284Handoff = createEmailDmsCoreCp284CloseoutHandoff();
const cp285Coverage = validateEmailDmsCoreCp285Coverage(cp285PlanPack);
const cp285Descriptor = createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor();
const cp285CaseSet = createEmailDmsCoreCp285P04CloseoutP05FixtureFoundationCaseSet();
const cp285Foundation = validateEmailDmsCoreCp285P04CloseoutP05FixtureFoundationDescriptor(cp285Descriptor, emailDmsContract);
const cp285Hermes = createEmailDmsCoreCp285HermesEvidencePacket(cp285PlanPack, emailDmsContract, cp285Descriptor);
const cp285Claude = createEmailDmsCoreCp285ClaudeReviewPacket(cp285PlanPack);
const cp285Handoff = createEmailDmsCoreCp285CloseoutHandoff();
const cp286Coverage = validateEmailDmsCoreCp286Coverage(cp286PlanPack);
const cp286Descriptor = createEmailDmsCoreCp286FixtureSliceDescriptor();
const cp286CaseSet = createEmailDmsCoreCp286FixtureSliceCaseSet();
const cp286Slice = validateEmailDmsCoreCp286FixtureSliceDescriptor(cp286Descriptor, emailDmsContract);
const cp286Hermes = createEmailDmsCoreCp286HermesEvidencePacket(cp286PlanPack, emailDmsContract, cp286Descriptor);
const cp286Claude = createEmailDmsCoreCp286ClaudeReviewPacket(cp286PlanPack);
const cp286Handoff = createEmailDmsCoreCp286CloseoutHandoff();
const cp287Coverage = validateEmailDmsCoreCp287Coverage(cp287PlanPack);
const cp287Descriptor = createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor();
const cp287CaseSet = createEmailDmsCoreCp287P05CloseoutP06PermissionFoundationCaseSet();
const cp287Foundation = validateEmailDmsCoreCp287P05CloseoutP06PermissionFoundationDescriptor(cp287Descriptor, emailDmsContract);
const cp287Hermes = createEmailDmsCoreCp287HermesEvidencePacket(cp287PlanPack, emailDmsContract, cp287Descriptor);
const cp287Claude = createEmailDmsCoreCp287ClaudeReviewPacket(cp287PlanPack);
const cp287Handoff = createEmailDmsCoreCp287CloseoutHandoff();
const cp288Coverage = validateEmailDmsCoreCp288Coverage(cp288PlanPack);
const cp288Descriptor = createEmailDmsCoreCp288PermissionSliceDescriptor();
const cp288CaseSet = createEmailDmsCoreCp288PermissionSliceCaseSet();
const cp288Slice = validateEmailDmsCoreCp288PermissionSliceDescriptor(cp288Descriptor, emailDmsContract);
const cp288Hermes = createEmailDmsCoreCp288HermesEvidencePacket(cp288PlanPack, emailDmsContract, cp288Descriptor);
const cp288Claude = createEmailDmsCoreCp288ClaudeReviewPacket(cp288PlanPack);
const cp288Handoff = createEmailDmsCoreCp288CloseoutHandoff();
const cp289Coverage = validateEmailDmsCoreCp289Coverage(cp289PlanPack);
const cp289Descriptor = createEmailDmsCoreCp289PermissionBindingSliceDescriptor();
const cp289CaseSet = createEmailDmsCoreCp289PermissionBindingSliceCaseSet();
const cp289Slice = validateEmailDmsCoreCp289PermissionBindingSliceDescriptor(cp289Descriptor, emailDmsContract);
const cp289Hermes = createEmailDmsCoreCp289HermesEvidencePacket(cp289PlanPack, emailDmsContract, cp289Descriptor);
const cp289Claude = createEmailDmsCoreCp289ClaudeReviewPacket(cp289PlanPack);
const cp289Handoff = createEmailDmsCoreCp289CloseoutHandoff();
const cp290Coverage = validateEmailDmsCoreCp290Coverage(cp290PlanPack);
const cp290Descriptor = createEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor();
const cp290CaseSet = createEmailDmsCoreCp290P06CloseoutP07FailureFoundationCaseSet();
const cp290Foundation = validateEmailDmsCoreCp290P06CloseoutP07FailureFoundationDescriptor(cp290Descriptor, emailDmsContract);
const cp290Hermes = createEmailDmsCoreCp290HermesEvidencePacket(cp290PlanPack, emailDmsContract, cp290Descriptor);
const cp290Claude = createEmailDmsCoreCp290ClaudeReviewPacket(cp290PlanPack);
const cp290Handoff = createEmailDmsCoreCp290CloseoutHandoff();
const cp291Coverage = validateEmailDmsCoreCp291Coverage(cp291PlanPack);
const cp291Descriptor = createEmailDmsCoreCp291FailureSliceDescriptor();
const cp291CaseSet = createEmailDmsCoreCp291FailureSliceCaseSet();
const cp291Slice = validateEmailDmsCoreCp291FailureSliceDescriptor(cp291Descriptor, emailDmsContract);
const cp291Hermes = createEmailDmsCoreCp291HermesEvidencePacket(cp291PlanPack, emailDmsContract, cp291Descriptor);
const cp291Claude = createEmailDmsCoreCp291ClaudeReviewPacket(cp291PlanPack);
const cp291Handoff = createEmailDmsCoreCp291CloseoutHandoff();
const cp292Coverage = validateEmailDmsCoreCp292Coverage(cp292PlanPack);
const cp292Descriptor = createEmailDmsCoreCp292FailureBindingSliceDescriptor();
const cp292CaseSet = createEmailDmsCoreCp292FailureBindingSliceCaseSet();
const cp292Slice = validateEmailDmsCoreCp292FailureBindingSliceDescriptor(cp292Descriptor, emailDmsContract);
const cp292Hermes = createEmailDmsCoreCp292HermesEvidencePacket(cp292PlanPack, emailDmsContract, cp292Descriptor);
const cp292Claude = createEmailDmsCoreCp292ClaudeReviewPacket(cp292PlanPack);
const cp292Handoff = createEmailDmsCoreCp292CloseoutHandoff();
const cp293Coverage = validateEmailDmsCoreCp293Coverage(cp293PlanPack);
const cp293Descriptor = createEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor();
const cp293CaseSet = createEmailDmsCoreCp293P07CloseoutP08HermesFoundationCaseSet();
const cp293Foundation = validateEmailDmsCoreCp293P07CloseoutP08HermesFoundationDescriptor(cp293Descriptor, emailDmsContract);
const cp293Hermes = createEmailDmsCoreCp293HermesEvidencePacket(cp293PlanPack, emailDmsContract, cp293Descriptor);
const cp293Claude = createEmailDmsCoreCp293ClaudeReviewPacket(cp293PlanPack);
const cp293Handoff = createEmailDmsCoreCp293CloseoutHandoff();
const cp294Coverage = validateEmailDmsCoreCp294Coverage(cp294PlanPack);
const cp294Descriptor = createEmailDmsCoreCp294HermesSliceDescriptor();
const cp294CaseSet = createEmailDmsCoreCp294HermesSliceCaseSet();
const cp294Slice = validateEmailDmsCoreCp294HermesSliceDescriptor(cp294Descriptor, emailDmsContract);
const cp294Hermes = createEmailDmsCoreCp294HermesEvidencePacket(cp294PlanPack, emailDmsContract, cp294Descriptor);
const cp294Claude = createEmailDmsCoreCp294ClaudeReviewPacket(cp294PlanPack);
const cp294Handoff = createEmailDmsCoreCp294CloseoutHandoff();
const cp295Coverage = validateEmailDmsCoreCp295Coverage(cp295PlanPack);
const cp295Descriptor = createEmailDmsCoreCp295HermesBindingSliceDescriptor();
const cp295CaseSet = createEmailDmsCoreCp295HermesBindingSliceCaseSet();
const cp295Slice = validateEmailDmsCoreCp295HermesBindingSliceDescriptor(cp295Descriptor, emailDmsContract);
const cp295Hermes = createEmailDmsCoreCp295HermesEvidencePacket(cp295PlanPack, emailDmsContract, cp295Descriptor);
const cp295Claude = createEmailDmsCoreCp295ClaudeReviewPacket(cp295PlanPack);
const cp295Handoff = createEmailDmsCoreCp295CloseoutHandoff();
const cp296Coverage = validateEmailDmsCoreCp296Coverage(cp296PlanPack);
const cp296Descriptor = createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor();
const cp296CaseSet = createEmailDmsCoreCp296P08CloseoutP09ReviewFoundationCaseSet();
const cp296Foundation = validateEmailDmsCoreCp296P08CloseoutP09ReviewFoundationDescriptor(cp296Descriptor, emailDmsContract);
const cp296Hermes = createEmailDmsCoreCp296HermesEvidencePacket(cp296PlanPack, emailDmsContract, cp296Descriptor);
const cp296Claude = createEmailDmsCoreCp296ClaudeReviewPacket(cp296PlanPack);
const cp296Handoff = createEmailDmsCoreCp296CloseoutHandoff();
const cp297Coverage = validateEmailDmsCoreCp297Coverage(cp297PlanPack);
const cp297Descriptor = createEmailDmsCoreCp297ReviewSliceDescriptor();
const cp297CaseSet = createEmailDmsCoreCp297ReviewSliceCaseSet();
const cp297Slice = validateEmailDmsCoreCp297ReviewSliceDescriptor(cp297Descriptor, emailDmsContract);
const cp297Hermes = createEmailDmsCoreCp297HermesEvidencePacket(cp297PlanPack, emailDmsContract, cp297Descriptor);
const cp297Claude = createEmailDmsCoreCp297ClaudeReviewPacket(cp297PlanPack);
const cp297Handoff = createEmailDmsCoreCp297CloseoutHandoff();
const cp298Coverage = validateEmailDmsCoreCp298Coverage(cp298PlanPack);
const cp298Descriptor = createEmailDmsCoreCp298P09CloseoutDescriptor();
const cp298CaseSet = createEmailDmsCoreCp298P09CloseoutCaseSet();
const cp298Closeout = validateEmailDmsCoreCp298P09CloseoutDescriptor(cp298Descriptor, emailDmsContract);
const cp298Hermes = createEmailDmsCoreCp298HermesEvidencePacket(cp298PlanPack, emailDmsContract, cp298Descriptor);
const cp298Claude = createEmailDmsCoreCp298ClaudeReviewPacket(cp298PlanPack);
const cp298Handoff = createEmailDmsCoreCp298CloseoutHandoff();

assert.equal(cp272Coverage.valid, true, cp272Coverage.errors.join("; "));
assert.equal(cp272Coverage.summary.unit_count, 150);
assert.equal(cp272Coverage.summary.by_phase["RP08.P00"], 122);
assert.equal(cp272Coverage.summary.by_phase["RP08.P01"], 28);
assert.equal(cp272Foundation.valid, true, cp272Foundation.errors.join("; "));
assert.equal(cp272CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP272_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp272CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-272 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp272Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp272_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP272_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp272_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP272_NO_WRITE_ATTESTATION)));
assert.deepEqual(emailDmsContract.no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP298_NO_WRITE_ATTESTATION)));
assert.equal(cp272Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp272Hermes.production_ready_candidate, true);
assert.equal(cp272Claude.review_packet, "C08.CP00-272.email_dms_core_scope_contract_foundation_descriptor");
assert.equal(cp272Claude.read_only, true);
assert.equal(cp272Handoff.to_pack_id, "CP00-273");
assert.equal(cp272Handoff.next_subphase_id, "RP08.P01.M02.S09");
assert.equal(cp273Coverage.valid, true, cp273Coverage.errors.join("; "));
assert.equal(cp273Coverage.summary.unit_count, 40);
assert.equal(cp273Coverage.summary.by_micro_phase["RP08.P01.M03"], 22);
assert.equal(cp273Slice.valid, true, cp273Slice.errors.join("; "));
assert.equal(cp273CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP273_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp273CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-273 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.model_storage_slice_descriptor,
  JSON.parse(JSON.stringify(cp273Descriptor)),
  "contract model_storage_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp273_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP273_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp273_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION)));
assert.equal(cp273Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp273Hermes.production_ready_candidate, true);
assert.equal(cp273Claude.review_packet, "C08.CP00-273.email_dms_core_model_storage_slice_descriptor");
assert.equal(cp273Claude.read_only, true);
assert.equal(cp273Handoff.to_pack_id, "CP00-274");
assert.equal(cp273Handoff.next_subphase_id, "RP08.P01.M04.S07");
assert.equal(cp274Coverage.valid, true, cp274Coverage.errors.join("; "));
assert.equal(cp274Coverage.summary.unit_count, 40);
assert.equal(cp274Coverage.summary.by_micro_phase["RP08.P01.M05"], 22);
assert.equal(cp274Slice.valid, true, cp274Slice.errors.join("; "));
assert.equal(cp274CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP274_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp274CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-274 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.model_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp274Descriptor)),
  "contract model_binding_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp274_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP274_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp274_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION)));
assert.equal(cp274Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp274Hermes.production_ready_candidate, true);
assert.equal(cp274Claude.review_packet, "C08.CP00-274.email_dms_core_model_binding_slice_descriptor");
assert.equal(cp274Claude.read_only, true);
assert.equal(cp274Handoff.to_pack_id, "CP00-275");
assert.equal(cp274Handoff.next_subphase_id, "RP08.P01.M06.S05");
assert.equal(cp275Coverage.valid, true, cp275Coverage.errors.join("; "));
assert.equal(cp275Coverage.summary.unit_count, 150);
assert.equal(cp275Coverage.summary.by_phase["RP08.P01"], 88);
assert.equal(cp275Coverage.summary.by_phase["RP08.P02"], 62);
assert.equal(cp275Foundation.valid, true, cp275Foundation.errors.join("; "));
assert.equal(cp275CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP275_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp275CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-275 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p01_closeout_p02_service_foundation_descriptor,
  JSON.parse(JSON.stringify(cp275Descriptor)),
  "contract p01_closeout_p02_service_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp275_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP275_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp275_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP275_NO_WRITE_ATTESTATION)));
assert.equal(cp275Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp275Hermes.production_ready_candidate, true);
assert.equal(cp275Claude.review_packet, "C08.CP00-275.email_dms_core_p01_closeout_p02_service_foundation_descriptor");
assert.equal(cp275Claude.read_only, true);
assert.equal(cp275Handoff.to_pack_id, "CP00-276");
assert.equal(cp275Handoff.next_subphase_id, "RP08.P02.M03.S01");
assert.equal(cp276Coverage.valid, true, cp276Coverage.errors.join("; "));
assert.equal(cp276Coverage.summary.unit_count, 40);
assert.equal(cp276Coverage.summary.by_micro_phase["RP08.P02.M03"], 22);
assert.equal(cp276Slice.valid, true, cp276Slice.errors.join("; "));
assert.equal(cp276CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP276_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp276CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-276 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.service_slice_descriptor,
  JSON.parse(JSON.stringify(cp276Descriptor)),
  "contract service_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp276_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP276_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp276_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP276_NO_WRITE_ATTESTATION)));
assert.equal(cp276Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp276Hermes.production_ready_candidate, true);
assert.equal(cp276Claude.review_packet, "C08.CP00-276.email_dms_core_service_slice_descriptor");
assert.equal(cp276Claude.read_only, true);
assert.equal(cp276Handoff.to_pack_id, "CP00-277");
assert.equal(cp276Handoff.next_subphase_id, "RP08.P02.M04.S19");
assert.equal(cp277Coverage.valid, true, cp277Coverage.errors.join("; "));
assert.equal(cp277Coverage.summary.unit_count, 40);
assert.equal(cp277Coverage.summary.by_micro_phase["RP08.P02.M05"], 22);
assert.equal(cp277Slice.valid, true, cp277Slice.errors.join("; "));
assert.equal(cp277CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP277_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp277CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-277 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.service_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp277Descriptor)),
  "contract service_binding_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp277_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP277_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp277_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP277_NO_WRITE_ATTESTATION)));
assert.equal(cp277Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp277Hermes.production_ready_candidate, true);
assert.equal(cp277Claude.review_packet, "C08.CP00-277.email_dms_core_service_binding_slice_descriptor");
assert.equal(cp277Claude.read_only, true);
assert.equal(cp277Handoff.to_pack_id, "CP00-278");
assert.equal(cp277Handoff.next_subphase_id, "RP08.P02.M06.S15");
assert.equal(cp278Coverage.valid, true, cp278Coverage.errors.join("; "));
assert.equal(cp278Coverage.summary.unit_count, 10);
assert.equal(cp278Coverage.summary.by_micro_phase["RP08.P02.M06"], 8);
assert.equal(cp278Tail.valid, true, cp278Tail.errors.join("; "));
assert.equal(cp278CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP278_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp278CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-278 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.service_fixture_tail_descriptor,
  JSON.parse(JSON.stringify(cp278Descriptor)),
  "contract service_fixture_tail_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp278_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP278_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp278_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP278_NO_WRITE_ATTESTATION)));
assert.equal(cp278Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp278Hermes.production_ready_candidate, true);
assert.equal(cp278Claude.review_packet, "C08.CP00-278.email_dms_core_service_fixture_tail_descriptor");
assert.equal(cp278Claude.read_only, true);
assert.equal(cp278Handoff.to_pack_id, "CP00-279");
assert.equal(cp278Handoff.next_subphase_id, "RP08.P02.M07.S03");
assert.equal(cp279Coverage.valid, true, cp279Coverage.errors.join("; "));
assert.equal(cp279Coverage.summary.unit_count, 10);
assert.equal(cp279Coverage.summary.by_micro_phase["RP08.P02.M07"], 10);
assert.equal(cp279Mid.valid, true, cp279Mid.errors.join("; "));
assert.equal(cp279CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP279_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp279CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-279 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.service_golden_mid_descriptor,
  JSON.parse(JSON.stringify(cp279Descriptor)),
  "contract service_golden_mid_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp279_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP279_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp279_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP279_NO_WRITE_ATTESTATION)));
assert.equal(cp279Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp279Hermes.production_ready_candidate, true);
assert.equal(cp279Claude.review_packet, "C08.CP00-279.email_dms_core_service_golden_mid_descriptor");
assert.equal(cp279Claude.read_only, true);
assert.equal(cp279Handoff.to_pack_id, "CP00-280");
assert.equal(cp279Handoff.next_subphase_id, "RP08.P02.M07.S13");
assert.equal(cp280Coverage.valid, true, cp280Coverage.errors.join("; "));
assert.equal(cp280Coverage.summary.unit_count, 40);
assert.equal(cp280Coverage.summary.by_micro_phase["RP08.P02.M08"], 22);
assert.equal(cp280Slice.valid, true, cp280Slice.errors.join("; "));
assert.equal(cp280CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP280_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp280CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-280 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.golden_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp280Descriptor)),
  "contract golden_hermes_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp280_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP280_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp280_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP280_NO_WRITE_ATTESTATION)));
assert.equal(cp280Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp280Hermes.production_ready_candidate, true);
assert.equal(cp280Claude.review_packet, "C08.CP00-280.email_dms_core_golden_hermes_slice_descriptor");
assert.equal(cp280Claude.read_only, true);
assert.equal(cp280Handoff.to_pack_id, "CP00-281");
assert.equal(cp280Handoff.next_subphase_id, "RP08.P02.M09.S09");
assert.equal(cp281Coverage.valid, true, cp281Coverage.errors.join("; "));
assert.equal(cp281Coverage.summary.unit_count, 150);
assert.equal(cp281Coverage.summary.by_phase["RP08.P02"], 34);
assert.equal(cp281Coverage.summary.by_phase["RP08.P03"], 116);
assert.equal(cp281Foundation.valid, true, cp281Foundation.errors.join("; "));
assert.equal(cp281CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP281_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp281CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-281 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p02_closeout_p03_interface_foundation_descriptor,
  JSON.parse(JSON.stringify(cp281Descriptor)),
  "contract p02_closeout_p03_interface_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp281_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP281_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp281_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP281_NO_WRITE_ATTESTATION)));
assert.equal(cp281Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp281Hermes.production_ready_candidate, true);
assert.equal(cp281Claude.review_packet, "C08.CP00-281.email_dms_core_p02_closeout_p03_interface_foundation_descriptor");
assert.equal(cp281Claude.read_only, true);
assert.equal(cp281Handoff.to_pack_id, "CP00-282");
assert.equal(cp281Handoff.next_subphase_id, "RP08.P03.M06.S13");
assert.equal(cp282Coverage.valid, true, cp282Coverage.errors.join("; "));
assert.equal(cp282Coverage.summary.unit_count, 150);
assert.equal(cp282Coverage.summary.by_phase["RP08.P03"], 80);
assert.equal(cp282Coverage.summary.by_phase["RP08.P04"], 70);
assert.equal(cp282Foundation.valid, true, cp282Foundation.errors.join("; "));
assert.equal(cp282CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP282_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp282CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-282 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p03_closeout_p04_ui_foundation_descriptor,
  JSON.parse(JSON.stringify(cp282Descriptor)),
  "contract p03_closeout_p04_ui_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp282_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP282_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp282_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP282_NO_WRITE_ATTESTATION)));
assert.equal(cp282Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp282Hermes.production_ready_candidate, true);
assert.equal(cp282Claude.review_packet, "C08.CP00-282.email_dms_core_p03_closeout_p04_ui_foundation_descriptor");
assert.equal(cp282Claude.read_only, true);
assert.equal(cp282Handoff.to_pack_id, "CP00-283");
assert.equal(cp282Handoff.next_subphase_id, "RP08.P04.M03.S21");
assert.equal(cp283Coverage.valid, true, cp283Coverage.errors.join("; "));
assert.equal(cp283Coverage.summary.unit_count, 40);
assert.equal(cp283Coverage.summary.by_micro_phase["RP08.P04.M04"], 22);
assert.equal(cp283Slice.valid, true, cp283Slice.errors.join("; "));
assert.equal(cp283CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP283_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp283CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-283 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.ui_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp283Descriptor)),
  "contract ui_workflow_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp283_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP283_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp283_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP283_NO_WRITE_ATTESTATION)));
assert.equal(cp283Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp283Hermes.production_ready_candidate, true);
assert.equal(cp283Claude.review_packet, "C08.CP00-283.email_dms_core_ui_workflow_slice_descriptor");
assert.equal(cp283Claude.read_only, true);
assert.equal(cp283Handoff.to_pack_id, "CP00-284");
assert.equal(cp283Handoff.next_subphase_id, "RP08.P04.M05.S17");
assert.equal(cp284Coverage.valid, true, cp284Coverage.errors.join("; "));
assert.equal(cp284Coverage.summary.unit_count, 10);
assert.equal(cp284Coverage.summary.by_micro_phase["RP08.P04.M05"], 6);
assert.equal(cp284Tail.valid, true, cp284Tail.errors.join("; "));
assert.equal(cp284CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP284_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp284CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-284 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.ui_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp284Descriptor)),
  "contract ui_binding_tail_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp284_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP284_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp284_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP284_NO_WRITE_ATTESTATION)));
assert.equal(cp284Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp284Hermes.production_ready_candidate, true);
assert.equal(cp284Claude.review_packet, "C08.CP00-284.email_dms_core_ui_binding_tail_descriptor");
assert.equal(cp284Claude.read_only, true);
assert.equal(cp284Handoff.to_pack_id, "CP00-285");
assert.equal(cp284Handoff.next_subphase_id, "RP08.P04.M06.S05");
assert.equal(cp285Coverage.valid, true, cp285Coverage.errors.join("; "));
assert.equal(cp285Coverage.summary.unit_count, 150);
assert.equal(cp285Coverage.summary.by_phase["RP08.P04"], 92);
assert.equal(cp285Coverage.summary.by_phase["RP08.P05"], 58);
assert.equal(cp285Foundation.valid, true, cp285Foundation.errors.join("; "));
assert.equal(cp285CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP285_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp285CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-285 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p04_closeout_p05_fixture_foundation_descriptor,
  JSON.parse(JSON.stringify(cp285Descriptor)),
  "contract p04_closeout_p05_fixture_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp285_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP285_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp285_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP285_NO_WRITE_ATTESTATION)));
assert.equal(cp285Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp285Hermes.production_ready_candidate, true);
assert.equal(cp285Claude.review_packet, "C08.CP00-285.email_dms_core_p04_closeout_p05_fixture_foundation_descriptor");
assert.equal(cp285Claude.read_only, true);
assert.equal(cp285Handoff.to_pack_id, "CP00-286");
assert.equal(cp285Handoff.next_subphase_id, "RP08.P05.M03.S09");
assert.equal(cp286Coverage.valid, true, cp286Coverage.errors.join("; "));
assert.equal(cp286Coverage.summary.unit_count, 10);
assert.equal(cp286Coverage.summary.by_micro_phase["RP08.P05.M03"], 10);
assert.equal(cp286Slice.valid, true, cp286Slice.errors.join("; "));
assert.equal(cp286CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP286_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp286CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-286 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp286Descriptor)),
  "contract fixture_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp286_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP286_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp286_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP286_NO_WRITE_ATTESTATION)));
assert.equal(cp286Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp286Hermes.production_ready_candidate, true);
assert.equal(cp286Claude.review_packet, "C08.CP00-286.email_dms_core_fixture_slice_descriptor");
assert.equal(cp286Claude.read_only, true);
assert.equal(cp286Handoff.to_pack_id, "CP00-287");
assert.equal(cp286Handoff.next_subphase_id, "RP08.P05.M03.S19");
assert.equal(cp287Coverage.valid, true, cp287Coverage.errors.join("; "));
assert.equal(cp287Coverage.summary.unit_count, 150);
assert.equal(cp287Coverage.summary.by_phase["RP08.P05"], 144);
assert.equal(cp287Coverage.summary.by_phase["RP08.P06"], 6);
assert.equal(cp287Foundation.valid, true, cp287Foundation.errors.join("; "));
assert.equal(cp287CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP287_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp287CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-287 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p05_closeout_p06_permission_foundation_descriptor,
  JSON.parse(JSON.stringify(cp287Descriptor)),
  "contract p05_closeout_p06_permission_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp287_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP287_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp287_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP287_NO_WRITE_ATTESTATION)));
assert.equal(cp287Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp287Hermes.production_ready_candidate, true);
assert.equal(cp287Claude.review_packet, "C08.CP00-287.email_dms_core_p05_closeout_p06_permission_foundation_descriptor");
assert.equal(cp287Claude.read_only, true);
assert.equal(cp287Handoff.to_pack_id, "CP00-288");
assert.equal(cp287Handoff.next_subphase_id, "RP08.P06.M00.S07");
assert.equal(cp288Coverage.valid, true, cp288Coverage.errors.join("; "));
assert.equal(cp288Coverage.summary.unit_count, 150);
assert.equal(cp288Coverage.summary.by_phase["RP08.P06"], 150);
assert.equal(cp288Slice.valid, true, cp288Slice.errors.join("; "));
assert.equal(cp288CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP288_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp288CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-288 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp288Descriptor)),
  "contract permission_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp288_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP288_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp288_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP288_NO_WRITE_ATTESTATION)));
assert.equal(cp288Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp288Hermes.production_ready_candidate, true);
assert.equal(cp288Claude.review_packet, "C08.CP00-288.email_dms_core_permission_slice_descriptor");
assert.equal(cp288Claude.read_only, true);
assert.equal(cp288Handoff.to_pack_id, "CP00-289");
assert.equal(cp288Handoff.next_subphase_id, "RP08.P06.M07.S07");
assert.equal(cp289Coverage.valid, true, cp289Coverage.errors.join("; "));
assert.equal(cp289Coverage.summary.unit_count, 40);
assert.equal(cp289Coverage.summary.by_micro_phase["RP08.P06.M08"], 22);
assert.equal(cp289Slice.valid, true, cp289Slice.errors.join("; "));
assert.equal(cp289CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP289_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp289CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-289 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.permission_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp289Descriptor)),
  "contract permission_binding_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp289_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP289_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp289_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP289_NO_WRITE_ATTESTATION)));
assert.equal(cp289Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp289Hermes.production_ready_candidate, true);
assert.equal(cp289Claude.review_packet, "C08.CP00-289.email_dms_core_permission_binding_slice_descriptor");
assert.equal(cp289Claude.read_only, true);
assert.equal(cp289Handoff.to_pack_id, "CP00-290");
assert.equal(cp289Handoff.next_subphase_id, "RP08.P06.M09.S03");
assert.equal(cp290Coverage.valid, true, cp290Coverage.errors.join("; "));
assert.equal(cp290Coverage.summary.unit_count, 150);
assert.equal(cp290Coverage.summary.by_phase["RP08.P06"], 40);
assert.equal(cp290Coverage.summary.by_phase["RP08.P07"], 110);
assert.equal(cp290Foundation.valid, true, cp290Foundation.errors.join("; "));
assert.equal(cp290CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP290_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp290CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-290 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p06_closeout_p07_failure_foundation_descriptor,
  JSON.parse(JSON.stringify(cp290Descriptor)),
  "contract p06_closeout_p07_failure_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp290_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP290_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp290_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP290_NO_WRITE_ATTESTATION)));
assert.equal(cp290Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp290Hermes.production_ready_candidate, true);
assert.equal(cp290Claude.review_packet, "C08.CP00-290.email_dms_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp290Claude.read_only, true);
assert.equal(cp290Handoff.to_pack_id, "CP00-291");
assert.equal(cp290Handoff.next_subphase_id, "RP08.P07.M05.S05");
assert.equal(cp291Coverage.valid, true, cp291Coverage.errors.join("; "));
assert.equal(cp291Coverage.summary.unit_count, 10);
assert.equal(cp291Coverage.summary.by_micro_phase["RP08.P07.M05"], 10);
assert.equal(cp291Slice.valid, true, cp291Slice.errors.join("; "));
assert.equal(cp291CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP291_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp291CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-291 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.failure_slice_descriptor,
  JSON.parse(JSON.stringify(cp291Descriptor)),
  "contract failure_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp291_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP291_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp291_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP291_NO_WRITE_ATTESTATION)));
assert.equal(cp291Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp291Hermes.production_ready_candidate, true);
assert.equal(cp291Claude.review_packet, "C08.CP00-291.email_dms_core_failure_slice_descriptor");
assert.equal(cp291Claude.read_only, true);
assert.equal(cp291Handoff.to_pack_id, "CP00-292");
assert.equal(cp291Handoff.next_subphase_id, "RP08.P07.M05.S15");
assert.equal(cp292Coverage.valid, true, cp292Coverage.errors.join("; "));
assert.equal(cp292Coverage.summary.unit_count, 10);
assert.equal(cp292Coverage.summary.by_micro_phase["RP08.P07.M05"], 8);
assert.equal(cp292Slice.valid, true, cp292Slice.errors.join("; "));
assert.equal(cp292CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP292_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp292CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-292 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.failure_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp292Descriptor)),
  "contract failure_binding_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp292_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP292_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp292_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP292_NO_WRITE_ATTESTATION)));
assert.equal(cp292Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp292Hermes.production_ready_candidate, true);
assert.equal(cp292Claude.review_packet, "C08.CP00-292.email_dms_core_failure_binding_slice_descriptor");
assert.equal(cp292Claude.read_only, true);
assert.equal(cp292Handoff.to_pack_id, "CP00-293");
assert.equal(cp292Handoff.next_subphase_id, "RP08.P07.M06.S03");
assert.equal(cp293Coverage.valid, true, cp293Coverage.errors.join("; "));
assert.equal(cp293Coverage.summary.unit_count, 150);
assert.equal(cp293Coverage.summary.by_phase["RP08.P07"], 106);
assert.equal(cp293Coverage.summary.by_phase["RP08.P08"], 44);
assert.equal(cp293Foundation.valid, true, cp293Foundation.errors.join("; "));
assert.equal(cp293CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP293_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp293CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-293 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p07_closeout_p08_hermes_foundation_descriptor,
  JSON.parse(JSON.stringify(cp293Descriptor)),
  "contract p07_closeout_p08_hermes_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp293_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP293_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp293_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP293_NO_WRITE_ATTESTATION)));
assert.equal(cp293Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp293Hermes.production_ready_candidate, true);
assert.equal(cp293Claude.review_packet, "C08.CP00-293.email_dms_core_p07_closeout_p08_hermes_foundation_descriptor");
assert.equal(cp293Claude.read_only, true);
assert.equal(cp293Handoff.to_pack_id, "CP00-294");
assert.equal(cp293Handoff.next_subphase_id, "RP08.P08.M02.S15");
assert.equal(cp294Coverage.valid, true, cp294Coverage.errors.join("; "));
assert.equal(cp294Coverage.summary.unit_count, 40);
assert.equal(cp294Coverage.summary.by_micro_phase["RP08.P08.M03"], 22);
assert.equal(cp294Slice.valid, true, cp294Slice.errors.join("; "));
assert.equal(cp294CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP294_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp294CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-294 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp294Descriptor)),
  "contract hermes_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp294_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP294_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp294_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP294_NO_WRITE_ATTESTATION)));
assert.equal(cp294Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp294Hermes.production_ready_candidate, true);
assert.equal(cp294Claude.review_packet, "C08.CP00-294.email_dms_core_hermes_slice_descriptor");
assert.equal(cp294Claude.read_only, true);
assert.equal(cp294Handoff.to_pack_id, "CP00-295");
assert.equal(cp294Handoff.next_subphase_id, "RP08.P08.M04.S13");
assert.equal(cp295Coverage.valid, true, cp295Coverage.errors.join("; "));
assert.equal(cp295Coverage.summary.unit_count, 40);
assert.equal(cp295Coverage.summary.by_micro_phase["RP08.P08.M05"], 22);
assert.equal(cp295Slice.valid, true, cp295Slice.errors.join("; "));
assert.equal(cp295CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP295_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp295CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-295 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.hermes_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp295Descriptor)),
  "contract hermes_binding_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp295_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP295_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp295_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP295_NO_WRITE_ATTESTATION)));
assert.equal(cp295Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp295Hermes.production_ready_candidate, true);
assert.equal(cp295Claude.review_packet, "C08.CP00-295.email_dms_core_hermes_binding_slice_descriptor");
assert.equal(cp295Claude.read_only, true);
assert.equal(cp295Handoff.to_pack_id, "CP00-296");
assert.equal(cp295Handoff.next_subphase_id, "RP08.P08.M06.S09");
assert.equal(cp296Coverage.valid, true, cp296Coverage.errors.join("; "));
assert.equal(cp296Coverage.summary.unit_count, 150);
assert.equal(cp296Coverage.summary.by_phase["RP08.P08"], 88);
assert.equal(cp296Coverage.summary.by_phase["RP08.P09"], 62);
assert.equal(cp296Foundation.valid, true, cp296Foundation.errors.join("; "));
assert.equal(cp296CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP296_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp296CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-296 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p08_closeout_p09_review_foundation_descriptor,
  JSON.parse(JSON.stringify(cp296Descriptor)),
  "contract p08_closeout_p09_review_foundation_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp296_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP296_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp296_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP296_NO_WRITE_ATTESTATION)));
assert.equal(cp296Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp296Hermes.production_ready_candidate, true);
assert.equal(cp296Claude.review_packet, "C08.CP00-296.email_dms_core_p08_closeout_p09_review_foundation_descriptor");
assert.equal(cp296Claude.read_only, true);
assert.equal(cp296Handoff.to_pack_id, "CP00-297");
assert.equal(cp296Handoff.next_subphase_id, "RP08.P09.M04.S01");
assert.equal(cp297Coverage.valid, true, cp297Coverage.errors.join("; "));
assert.equal(cp297Coverage.summary.unit_count, 40);
assert.equal(cp297Coverage.summary.by_micro_phase["RP08.P09.M04"], 20);
assert.equal(cp297Slice.valid, true, cp297Slice.errors.join("; "));
assert.equal(cp297CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP297_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp297CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-297 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.review_slice_descriptor,
  JSON.parse(JSON.stringify(cp297Descriptor)),
  "contract review_slice_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp297_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP297_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp297_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP297_NO_WRITE_ATTESTATION)));
assert.equal(cp297Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp297Hermes.production_ready_candidate, true);
assert.equal(cp297Claude.review_packet, "C08.CP00-297.email_dms_core_review_slice_descriptor");
assert.equal(cp297Claude.read_only, true);
assert.equal(cp297Handoff.to_pack_id, "CP00-298");
assert.equal(cp297Handoff.next_subphase_id, "RP08.P09.M06.S01");
assert.equal(cp298Coverage.valid, true, cp298Coverage.errors.join("; "));
assert.equal(cp298Coverage.summary.unit_count, 92);
assert.equal(cp298Coverage.summary.by_micro_phase["RP08.P09.M07"], 22);
assert.equal(cp298Closeout.valid, true, cp298Closeout.errors.join("; "));
assert.equal(cp298CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(EMAIL_DMS_CORE_CP298_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp298CaseSet.sections[microId].rows[emailDmsCoreRowKey(title)];
    assert.ok(row, `CP00-298 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  emailDmsContract.p09_closeout_descriptor,
  JSON.parse(JSON.stringify(cp298Descriptor)),
  "contract p09_closeout_descriptor drift",
);
assert.deepEqual(emailDmsContract.cp298_requirements, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP298_REQUIREMENTS)));
assert.deepEqual(emailDmsContract.cp298_no_write_attestation, JSON.parse(JSON.stringify(EMAIL_DMS_CORE_CP298_NO_WRITE_ATTESTATION)));
assert.equal(cp298Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp298Hermes.production_ready_candidate, true);
assert.equal(cp298Claude.review_packet, "C08.CP00-298.email_dms_core_p09_closeout_descriptor");
assert.equal(cp298Claude.read_only, true);
assert.equal(cp298Handoff.to_pack_id, "CP00-299");
assert.equal(cp298Handoff.next_subphase_id, "RP09.P00.M00.S01");
assert.equal(EMAIL_DMS_CORE_CP298_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP298_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP297_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP297_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP296_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP296_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP295_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP295_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP294_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP294_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP293_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP293_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP292_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP292_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP291_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP291_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP290_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP290_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP289_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP289_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP288_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP288_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP287_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP287_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP286_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP286_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP285_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP285_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP284_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP284_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP283_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP283_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP282_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP282_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP281_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP281_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP280_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP280_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP279_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP279_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP278_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP278_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP277_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP277_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP276_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP276_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP275_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP275_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
assert.equal(EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP274_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION.ownership_drift_detected, false);
assert.equal(EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP273_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(EMAIL_DMS_CORE_CP272_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(EMAIL_DMS_CORE_CP272_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(emailDmsContract.historical_pack_bindings.at(-1).pack_id, "CP00-298");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp08:email-dms-core:validate",
      pack_id: EMAIL_DMS_CORE_CP298_PACK_BINDING.pack_id,
      covered_units: cp298Coverage.summary.unit_count,
      program_id: EMAIL_DMS_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp298Hermes.gate,
      claude_gate: emailDmsContract.current_pack.claude_gate,
      source_review_slice_pack_id: EMAIL_DMS_CORE_CP298_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp272Coverage.summary.unit_count,
      model_storage_slice_units_preserved: cp273Coverage.summary.unit_count,
      model_binding_slice_units_preserved: cp274Coverage.summary.unit_count,
      p01_closeout_p02_service_foundation_units_preserved: cp275Coverage.summary.unit_count,
      service_slice_units_preserved: cp276Coverage.summary.unit_count,
      service_binding_slice_units_preserved: cp277Coverage.summary.unit_count,
      service_fixture_tail_units_preserved: cp278Coverage.summary.unit_count,
      service_golden_mid_units_preserved: cp279Coverage.summary.unit_count,
      golden_hermes_slice_units_preserved: cp280Coverage.summary.unit_count,
      p02_closeout_p03_interface_foundation_units_preserved: cp281Coverage.summary.unit_count,
      p03_closeout_p04_ui_foundation_units_preserved: cp282Coverage.summary.unit_count,
      ui_workflow_slice_units_preserved: cp283Coverage.summary.unit_count,
      ui_binding_tail_units_preserved: cp284Coverage.summary.unit_count,
      p04_closeout_p05_fixture_foundation_units_preserved: cp285Coverage.summary.unit_count,
      fixture_slice_units_preserved: cp286Coverage.summary.unit_count,
      p05_closeout_p06_permission_foundation_units_preserved: cp287Coverage.summary.unit_count,
      permission_slice_units_preserved: cp288Coverage.summary.unit_count,
      permission_binding_slice_units_preserved: cp289Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp290Coverage.summary.unit_count,
      failure_slice_units_preserved: cp291Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp292Coverage.summary.unit_count,
      p07_closeout_p08_hermes_foundation_units_preserved: cp293Coverage.summary.unit_count,
      hermes_slice_units_preserved: cp294Coverage.summary.unit_count,
      hermes_binding_slice_units_preserved: cp295Coverage.summary.unit_count,
      p08_closeout_p09_review_foundation_units_preserved: cp296Coverage.summary.unit_count,
      review_slice_units_preserved: cp297Coverage.summary.unit_count,
      next_pack_id: cp298Handoff.to_pack_id,
      production_ready_candidate: cp298Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
