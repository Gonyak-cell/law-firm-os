import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP364_PACK_BINDING,
  BILLING_CORE_CP364_REQUIREMENTS,
  BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP365_PACK_BINDING,
  BILLING_CORE_CP365_REQUIREMENTS,
  BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP366_PACK_BINDING,
  BILLING_CORE_CP366_REQUIREMENTS,
  BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP367_PACK_BINDING,
  BILLING_CORE_CP367_REQUIREMENTS,
  BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP368_PACK_BINDING,
  BILLING_CORE_CP368_REQUIREMENTS,
  BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP369_PACK_BINDING,
  BILLING_CORE_CP369_REQUIREMENTS,
  BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP370_PACK_BINDING,
  BILLING_CORE_CP370_REQUIREMENTS,
  BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP371_PACK_BINDING,
  BILLING_CORE_CP371_REQUIREMENTS,
  BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP372_PACK_BINDING,
  BILLING_CORE_CP372_REQUIREMENTS,
  BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP373_PACK_BINDING,
  BILLING_CORE_CP373_REQUIREMENTS,
  BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP374_PACK_BINDING,
  BILLING_CORE_CP374_REQUIREMENTS,
  BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP375_PACK_BINDING,
  BILLING_CORE_CP375_REQUIREMENTS,
  BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP376_PACK_BINDING,
  BILLING_CORE_CP376_REQUIREMENTS,
  BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP377_PACK_BINDING,
  BILLING_CORE_CP377_REQUIREMENTS,
  BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP378_PACK_BINDING,
  BILLING_CORE_CP378_REQUIREMENTS,
  BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP379_PACK_BINDING,
  BILLING_CORE_CP379_REQUIREMENTS,
  BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP380_PACK_BINDING,
  BILLING_CORE_CP380_REQUIREMENTS,
  BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP381_PACK_BINDING,
  BILLING_CORE_CP381_REQUIREMENTS,
  BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP382_PACK_BINDING,
  BILLING_CORE_CP382_REQUIREMENTS,
  BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP383_PACK_BINDING,
  BILLING_CORE_CP383_REQUIREMENTS,
  BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP384_PACK_BINDING,
  BILLING_CORE_CP384_REQUIREMENTS,
  BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP385_PACK_BINDING,
  BILLING_CORE_CP385_REQUIREMENTS,
  BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP386_PACK_BINDING,
  BILLING_CORE_CP386_REQUIREMENTS,
  BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP387_PACK_BINDING,
  BILLING_CORE_CP387_REQUIREMENTS,
  BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP388_PACK_BINDING,
  BILLING_CORE_CP388_REQUIREMENTS,
  BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP389_PACK_BINDING,
  BILLING_CORE_CP389_REQUIREMENTS,
  BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP390_PACK_BINDING,
  BILLING_CORE_CP390_REQUIREMENTS,
  BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP391_PACK_BINDING,
  BILLING_CORE_CP391_REQUIREMENTS,
  BILLING_CORE_PROGRAM_CONTRACT,
  createBillingCoreCp364ClaudeReviewPacket,
  createBillingCoreCp364CloseoutHandoff,
  createBillingCoreCp364HermesEvidencePacket,
  createBillingCoreCp364ScopeContractFoundationCaseSet,
  createBillingCoreCp364ScopeContractFoundationDescriptor,
  createBillingCoreCp365ClaudeReviewPacket,
  createBillingCoreCp365CloseoutHandoff,
  createBillingCoreCp365HermesEvidencePacket,
  createBillingCoreCp365ModelFoundationSliceCaseSet,
  createBillingCoreCp365ModelFoundationSliceDescriptor,
  createBillingCoreCp366ClaudeReviewPacket,
  createBillingCoreCp366CloseoutHandoff,
  createBillingCoreCp366HermesEvidencePacket,
  createBillingCoreCp366WorkflowPermissionSliceCaseSet,
  createBillingCoreCp366WorkflowPermissionSliceDescriptor,
  createBillingCoreCp367ClaudeReviewPacket,
  createBillingCoreCp367CloseoutHandoff,
  createBillingCoreCp367HermesEvidencePacket,
  createBillingCoreCp367P01CloseoutP02FoundationCaseSet,
  createBillingCoreCp367P01CloseoutP02FoundationDescriptor,
  createBillingCoreCp368ClaudeReviewPacket,
  createBillingCoreCp368CloseoutHandoff,
  createBillingCoreCp368HermesEvidencePacket,
  createBillingCoreCp368P02ImplementationSliceCaseSet,
  createBillingCoreCp368P02ImplementationSliceDescriptor,
  createBillingCoreCp369ClaudeReviewPacket,
  createBillingCoreCp369CloseoutHandoff,
  createBillingCoreCp369HermesEvidencePacket,
  createBillingCoreCp369P02PermissionFixtureSliceCaseSet,
  createBillingCoreCp369P02PermissionFixtureSliceDescriptor,
  createBillingCoreCp370ClaudeReviewPacket,
  createBillingCoreCp370CloseoutHandoff,
  createBillingCoreCp370HermesEvidencePacket,
  createBillingCoreCp370P02FixtureTestSliceCaseSet,
  createBillingCoreCp370P02FixtureTestSliceDescriptor,
  createBillingCoreCp371ClaudeReviewPacket,
  createBillingCoreCp371CloseoutHandoff,
  createBillingCoreCp371HermesEvidencePacket,
  createBillingCoreCp371P02TestSliceCaseSet,
  createBillingCoreCp371P02TestSliceDescriptor,
  createBillingCoreCp372ClaudeReviewPacket,
  createBillingCoreCp372CloseoutHandoff,
  createBillingCoreCp372HermesEvidencePacket,
  createBillingCoreCp372P02TestHermesSliceCaseSet,
  createBillingCoreCp372P02TestHermesSliceDescriptor,
  createBillingCoreCp373ClaudeReviewPacket,
  createBillingCoreCp373CloseoutHandoff,
  createBillingCoreCp373HermesEvidencePacket,
  createBillingCoreCp373P02CloseoutP03FoundationCaseSet,
  createBillingCoreCp373P02CloseoutP03FoundationDescriptor,
  createBillingCoreCp374ClaudeReviewPacket,
  createBillingCoreCp374CloseoutHandoff,
  createBillingCoreCp374HermesEvidencePacket,
  createBillingCoreCp374P03CloseoutP04FoundationCaseSet,
  createBillingCoreCp374P03CloseoutP04FoundationDescriptor,
  createBillingCoreCp375ClaudeReviewPacket,
  createBillingCoreCp375CloseoutHandoff,
  createBillingCoreCp375HermesEvidencePacket,
  createBillingCoreCp375P04WorkflowPermissionSliceCaseSet,
  createBillingCoreCp375P04WorkflowPermissionSliceDescriptor,
  createBillingCoreCp376ClaudeReviewPacket,
  createBillingCoreCp376CloseoutHandoff,
  createBillingCoreCp376HermesEvidencePacket,
  createBillingCoreCp376P04PermissionFixtureSliceCaseSet,
  createBillingCoreCp376P04PermissionFixtureSliceDescriptor,
  createBillingCoreCp377ClaudeReviewPacket,
  createBillingCoreCp377CloseoutHandoff,
  createBillingCoreCp377HermesEvidencePacket,
  createBillingCoreCp377P04CloseoutP05FoundationCaseSet,
  createBillingCoreCp377P04CloseoutP05FoundationDescriptor,
  createBillingCoreCp378ClaudeReviewPacket,
  createBillingCoreCp378CloseoutHandoff,
  createBillingCoreCp378HermesEvidencePacket,
  createBillingCoreCp378P05ImplementationSliceCaseSet,
  createBillingCoreCp378P05ImplementationSliceDescriptor,
  createBillingCoreCp379ClaudeReviewPacket,
  createBillingCoreCp379CloseoutHandoff,
  createBillingCoreCp379HermesEvidencePacket,
  createBillingCoreCp379P05CloseoutP06FoundationCaseSet,
  createBillingCoreCp379P05CloseoutP06FoundationDescriptor,
  createBillingCoreCp380ClaudeReviewPacket,
  createBillingCoreCp380CloseoutHandoff,
  createBillingCoreCp380HermesEvidencePacket,
  createBillingCoreCp380P06FoundationSliceCaseSet,
  createBillingCoreCp380P06FoundationSliceDescriptor,
  createBillingCoreCp381ClaudeReviewPacket,
  createBillingCoreCp381CloseoutHandoff,
  createBillingCoreCp381HermesEvidencePacket,
  createBillingCoreCp381P06TestHermesSliceCaseSet,
  createBillingCoreCp381P06TestHermesSliceDescriptor,
  createBillingCoreCp382ClaudeReviewPacket,
  createBillingCoreCp382CloseoutHandoff,
  createBillingCoreCp382HermesEvidencePacket,
  createBillingCoreCp382P06CloseoutP07FoundationCaseSet,
  createBillingCoreCp382P06CloseoutP07FoundationDescriptor,
  createBillingCoreCp383ClaudeReviewPacket,
  createBillingCoreCp383CloseoutHandoff,
  createBillingCoreCp383HermesEvidencePacket,
  createBillingCoreCp383P07PermissionSliceCaseSet,
  createBillingCoreCp383P07PermissionSliceDescriptor,
  createBillingCoreCp384ClaudeReviewPacket,
  createBillingCoreCp384CloseoutHandoff,
  createBillingCoreCp384HermesEvidencePacket,
  createBillingCoreCp384P07PermissionFixtureSliceCaseSet,
  createBillingCoreCp384P07PermissionFixtureSliceDescriptor,
  createBillingCoreCp385ClaudeReviewPacket,
  createBillingCoreCp385CloseoutHandoff,
  createBillingCoreCp385HermesEvidencePacket,
  createBillingCoreCp385P07CloseoutP08FoundationCaseSet,
  createBillingCoreCp385P07CloseoutP08FoundationDescriptor,
  createBillingCoreCp386ClaudeReviewPacket,
  createBillingCoreCp386CloseoutHandoff,
  createBillingCoreCp386HermesEvidencePacket,
  createBillingCoreCp386P08ImplementationSliceCaseSet,
  createBillingCoreCp386P08ImplementationSliceDescriptor,
  createBillingCoreCp387ClaudeReviewPacket,
  createBillingCoreCp387CloseoutHandoff,
  createBillingCoreCp387HermesEvidencePacket,
  createBillingCoreCp387P08WorkflowPermissionSliceCaseSet,
  createBillingCoreCp387P08WorkflowPermissionSliceDescriptor,
  createBillingCoreCp388ClaudeReviewPacket,
  createBillingCoreCp388CloseoutHandoff,
  createBillingCoreCp388HermesEvidencePacket,
  createBillingCoreCp388P08CloseoutP09FoundationCaseSet,
  createBillingCoreCp388P08CloseoutP09FoundationDescriptor,
  createBillingCoreCp389ClaudeReviewPacket,
  createBillingCoreCp389CloseoutHandoff,
  createBillingCoreCp389HermesEvidencePacket,
  createBillingCoreCp389P09WorkflowPermissionSliceCaseSet,
  createBillingCoreCp389P09WorkflowPermissionSliceDescriptor,
  createBillingCoreCp390ClaudeReviewPacket,
  createBillingCoreCp390CloseoutHandoff,
  createBillingCoreCp390HermesEvidencePacket,
  createBillingCoreCp390P09PermissionFixtureSliceCaseSet,
  createBillingCoreCp390P09PermissionFixtureSliceDescriptor,
  createBillingCoreCp391ClaudeReviewPacket,
  createBillingCoreCp391CloseoutHandoff,
  createBillingCoreCp391HermesEvidencePacket,
  createBillingCoreCp391P09CloseoutSliceCaseSet,
  createBillingCoreCp391P09CloseoutSliceDescriptor,
  billingCoreRowKey,
  validateBillingCoreCp364Coverage,
  validateBillingCoreCp364ScopeContractFoundationDescriptor,
  validateBillingCoreCp365Coverage,
  validateBillingCoreCp365ModelFoundationSliceDescriptor,
  validateBillingCoreCp366Coverage,
  validateBillingCoreCp366WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp367Coverage,
  validateBillingCoreCp367P01CloseoutP02FoundationDescriptor,
  validateBillingCoreCp368Coverage,
  validateBillingCoreCp368P02ImplementationSliceDescriptor,
  validateBillingCoreCp369Coverage,
  validateBillingCoreCp369P02PermissionFixtureSliceDescriptor,
  validateBillingCoreCp370Coverage,
  validateBillingCoreCp370P02FixtureTestSliceDescriptor,
  validateBillingCoreCp371Coverage,
  validateBillingCoreCp371P02TestSliceDescriptor,
  validateBillingCoreCp372Coverage,
  validateBillingCoreCp372P02TestHermesSliceDescriptor,
  validateBillingCoreCp373Coverage,
  validateBillingCoreCp373P02CloseoutP03FoundationDescriptor,
  validateBillingCoreCp374Coverage,
  validateBillingCoreCp374P03CloseoutP04FoundationDescriptor,
  validateBillingCoreCp375Coverage,
  validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp376Coverage,
  validateBillingCoreCp376P04PermissionFixtureSliceDescriptor,
  validateBillingCoreCp377Coverage,
  validateBillingCoreCp377P04CloseoutP05FoundationDescriptor,
  validateBillingCoreCp378Coverage,
  validateBillingCoreCp378P05ImplementationSliceDescriptor,
  validateBillingCoreCp379Coverage,
  validateBillingCoreCp379P05CloseoutP06FoundationDescriptor,
  validateBillingCoreCp380Coverage,
  validateBillingCoreCp380P06FoundationSliceDescriptor,
  validateBillingCoreCp381Coverage,
  validateBillingCoreCp381P06TestHermesSliceDescriptor,
  validateBillingCoreCp382Coverage,
  validateBillingCoreCp382P06CloseoutP07FoundationDescriptor,
  validateBillingCoreCp383Coverage,
  validateBillingCoreCp383P07PermissionSliceDescriptor,
  validateBillingCoreCp384Coverage,
  validateBillingCoreCp384P07PermissionFixtureSliceDescriptor,
  validateBillingCoreCp385Coverage,
  validateBillingCoreCp385P07CloseoutP08FoundationDescriptor,
  validateBillingCoreCp386Coverage,
  validateBillingCoreCp386P08ImplementationSliceDescriptor,
  validateBillingCoreCp387Coverage,
  validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp388Coverage,
  validateBillingCoreCp388P08CloseoutP09FoundationDescriptor,
  validateBillingCoreCp389Coverage,
  validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp390Coverage,
  validateBillingCoreCp390P09PermissionFixtureSliceDescriptor,
  validateBillingCoreCp391Coverage,
  validateBillingCoreCp391P09CloseoutSliceDescriptor,
} from "../packages/billing/src/index.js";

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

const billingContract = await readJson("../contracts/billing-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp364Manifest = await readOptionalJson("../docs/closeout-packs/cp00-364/manifest.json");
const cp364PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-364") ?? cp364Manifest?.plan_binding_snapshot;
const cp365Manifest = await readOptionalJson("../docs/closeout-packs/cp00-365/manifest.json");
const cp365PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-365") ?? cp365Manifest?.plan_binding_snapshot;
const cp366Manifest = await readOptionalJson("../docs/closeout-packs/cp00-366/manifest.json");
const cp366PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-366") ?? cp366Manifest?.plan_binding_snapshot;
const cp367Manifest = await readOptionalJson("../docs/closeout-packs/cp00-367/manifest.json");
const cp367PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-367") ?? cp367Manifest?.plan_binding_snapshot;
const cp368Manifest = await readOptionalJson("../docs/closeout-packs/cp00-368/manifest.json");
const cp368PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-368") ?? cp368Manifest?.plan_binding_snapshot;
const cp369Manifest = await readOptionalJson("../docs/closeout-packs/cp00-369/manifest.json");
const cp369PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-369") ?? cp369Manifest?.plan_binding_snapshot;
const cp370Manifest = await readOptionalJson("../docs/closeout-packs/cp00-370/manifest.json");
const cp370PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-370") ?? cp370Manifest?.plan_binding_snapshot;
const cp371Manifest = await readOptionalJson("../docs/closeout-packs/cp00-371/manifest.json");
const cp371PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-371") ?? cp371Manifest?.plan_binding_snapshot;
const cp372Manifest = await readOptionalJson("../docs/closeout-packs/cp00-372/manifest.json");
const cp372PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-372") ?? cp372Manifest?.plan_binding_snapshot;
const cp373Manifest = await readOptionalJson("../docs/closeout-packs/cp00-373/manifest.json");
const cp373PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-373") ?? cp373Manifest?.plan_binding_snapshot;
const cp374Manifest = await readOptionalJson("../docs/closeout-packs/cp00-374/manifest.json");
const cp374PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-374") ?? cp374Manifest?.plan_binding_snapshot;
const cp375Manifest = await readOptionalJson("../docs/closeout-packs/cp00-375/manifest.json");
const cp375PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-375") ?? cp375Manifest?.plan_binding_snapshot;
const cp376Manifest = await readOptionalJson("../docs/closeout-packs/cp00-376/manifest.json");
const cp376PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-376") ?? cp376Manifest?.plan_binding_snapshot;
const cp377Manifest = await readOptionalJson("../docs/closeout-packs/cp00-377/manifest.json");
const cp377PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-377") ?? cp377Manifest?.plan_binding_snapshot;
const cp378Manifest = await readOptionalJson("../docs/closeout-packs/cp00-378/manifest.json");
const cp378PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-378") ?? cp378Manifest?.plan_binding_snapshot;
const cp379Manifest = await readOptionalJson("../docs/closeout-packs/cp00-379/manifest.json");
const cp379PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-379") ?? cp379Manifest?.plan_binding_snapshot;
const cp380Manifest = await readOptionalJson("../docs/closeout-packs/cp00-380/manifest.json");
const cp380PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-380") ?? cp380Manifest?.plan_binding_snapshot;
const cp381Manifest = await readOptionalJson("../docs/closeout-packs/cp00-381/manifest.json");
const cp381PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-381") ?? cp381Manifest?.plan_binding_snapshot;
const cp382Manifest = await readOptionalJson("../docs/closeout-packs/cp00-382/manifest.json");
const cp382PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-382") ?? cp382Manifest?.plan_binding_snapshot;
const cp383Manifest = await readOptionalJson("../docs/closeout-packs/cp00-383/manifest.json");
const cp383PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-383") ?? cp383Manifest?.plan_binding_snapshot;
const cp384Manifest = await readOptionalJson("../docs/closeout-packs/cp00-384/manifest.json");
const cp384PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-384") ?? cp384Manifest?.plan_binding_snapshot;
const cp385Manifest = await readOptionalJson("../docs/closeout-packs/cp00-385/manifest.json");
const cp385PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-385") ?? cp385Manifest?.plan_binding_snapshot;
const cp386Manifest = await readOptionalJson("../docs/closeout-packs/cp00-386/manifest.json");
const cp386PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-386") ?? cp386Manifest?.plan_binding_snapshot;
const cp387Manifest = await readOptionalJson("../docs/closeout-packs/cp00-387/manifest.json");
const cp387PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-387") ?? cp387Manifest?.plan_binding_snapshot;
const cp388Manifest = await readOptionalJson("../docs/closeout-packs/cp00-388/manifest.json");
const cp388PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-388") ?? cp388Manifest?.plan_binding_snapshot;
const cp389Manifest = await readOptionalJson("../docs/closeout-packs/cp00-389/manifest.json");
const cp389PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-389") ?? cp389Manifest?.plan_binding_snapshot;
const cp390Manifest = await readOptionalJson("../docs/closeout-packs/cp00-390/manifest.json");
const cp390PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-390") ?? cp390Manifest?.plan_binding_snapshot;
const cp391Manifest = await readOptionalJson("../docs/closeout-packs/cp00-391/manifest.json");
const cp391PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-391") ?? cp391Manifest?.plan_binding_snapshot;

assert.equal(billingContract.schema_version, "law-firm-os.billing-core-contract.v0.1");
assert.equal(billingContract.program.program_id, "RP12");
assert.equal(billingContract.program.program_title, "Billing And Invoicing");
assert.equal(billingContract.program.upstream_program_id, "RP11");
assert.equal(billingContract.program.hermes_gate, "H12");
assert.equal(billingContract.program.claude_gate, "C12");
assert.equal(billingContract.program.descriptor_only, true);
assert.deepEqual(billingContract.program, JSON.parse(JSON.stringify(BILLING_CORE_PROGRAM_CONTRACT)));
assert.equal(billingContract.current_pack.pack_id, "CP00-391");
assert.equal(billingContract.program.current_pack_id, "CP00-391");
assert.deepEqual(billingContract.current_pack, JSON.parse(JSON.stringify(BILLING_CORE_CP391_PACK_BINDING)));
assert.deepEqual(billingContract.no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP391_NO_WRITE_ATTESTATION)));

assert.ok(cp364PlanPack, "CP00-364 must exist in closeout-pack-plan.json");
assert.equal(cp364PlanPack.unit_count, BILLING_CORE_CP364_PACK_BINDING.unit_count, "CP00-364 unit count drift");
assert.ok(cp365PlanPack, "CP00-365 must exist in closeout-pack-plan.json");
assert.equal(cp365PlanPack.unit_count, BILLING_CORE_CP365_PACK_BINDING.unit_count, "CP00-365 unit count drift");
assert.ok(cp366PlanPack, "CP00-366 must exist in closeout-pack-plan.json");
assert.equal(cp366PlanPack.unit_count, BILLING_CORE_CP366_PACK_BINDING.unit_count, "CP00-366 unit count drift");
assert.ok(cp367PlanPack, "CP00-367 must exist in closeout-pack-plan.json");
assert.equal(cp367PlanPack.unit_count, BILLING_CORE_CP367_PACK_BINDING.unit_count, "CP00-367 unit count drift");
assert.ok(cp368PlanPack, "CP00-368 must exist in closeout-pack-plan.json");
assert.equal(cp368PlanPack.unit_count, BILLING_CORE_CP368_PACK_BINDING.unit_count, "CP00-368 unit count drift");
assert.ok(cp369PlanPack, "CP00-369 must exist in closeout-pack-plan.json");
assert.equal(cp369PlanPack.unit_count, BILLING_CORE_CP369_PACK_BINDING.unit_count, "CP00-369 unit count drift");
assert.ok(cp370PlanPack, "CP00-370 must exist in closeout-pack-plan.json");
assert.equal(cp370PlanPack.unit_count, BILLING_CORE_CP370_PACK_BINDING.unit_count, "CP00-370 unit count drift");
assert.ok(cp371PlanPack, "CP00-371 must exist in closeout-pack-plan.json");
assert.equal(cp371PlanPack.unit_count, BILLING_CORE_CP371_PACK_BINDING.unit_count, "CP00-371 unit count drift");
assert.ok(cp372PlanPack, "CP00-372 must exist in closeout-pack-plan.json");
assert.equal(cp372PlanPack.unit_count, BILLING_CORE_CP372_PACK_BINDING.unit_count, "CP00-372 unit count drift");
assert.ok(cp373PlanPack, "CP00-373 must exist in closeout-pack-plan.json");
assert.equal(cp373PlanPack.unit_count, BILLING_CORE_CP373_PACK_BINDING.unit_count, "CP00-373 unit count drift");
assert.ok(cp374PlanPack, "CP00-374 must exist in closeout-pack-plan.json");
assert.equal(cp374PlanPack.unit_count, BILLING_CORE_CP374_PACK_BINDING.unit_count, "CP00-374 unit count drift");
assert.ok(cp375PlanPack, "CP00-375 must exist in closeout-pack-plan.json");
assert.equal(cp375PlanPack.unit_count, BILLING_CORE_CP375_PACK_BINDING.unit_count, "CP00-375 unit count drift");
assert.ok(cp376PlanPack, "CP00-376 must exist in closeout-pack-plan.json");
assert.equal(cp376PlanPack.unit_count, BILLING_CORE_CP376_PACK_BINDING.unit_count, "CP00-376 unit count drift");
assert.ok(cp377PlanPack, "CP00-377 must exist in closeout-pack-plan.json");
assert.equal(cp377PlanPack.unit_count, BILLING_CORE_CP377_PACK_BINDING.unit_count, "CP00-377 unit count drift");
assert.ok(cp378PlanPack, "CP00-378 must exist in closeout-pack-plan.json");
assert.equal(cp378PlanPack.unit_count, BILLING_CORE_CP378_PACK_BINDING.unit_count, "CP00-378 unit count drift");
assert.ok(cp379PlanPack, "CP00-379 must exist in closeout-pack-plan.json");
assert.equal(cp379PlanPack.unit_count, BILLING_CORE_CP379_PACK_BINDING.unit_count, "CP00-379 unit count drift");
assert.ok(cp380PlanPack, "CP00-380 must exist in closeout-pack-plan.json");
assert.equal(cp380PlanPack.unit_count, BILLING_CORE_CP380_PACK_BINDING.unit_count, "CP00-380 unit count drift");
assert.ok(cp381PlanPack, "CP00-381 must exist in closeout-pack-plan.json");
assert.equal(cp381PlanPack.unit_count, BILLING_CORE_CP381_PACK_BINDING.unit_count, "CP00-381 unit count drift");
assert.ok(cp382PlanPack, "CP00-382 must exist in closeout-pack-plan.json");
assert.equal(cp382PlanPack.unit_count, BILLING_CORE_CP382_PACK_BINDING.unit_count, "CP00-382 unit count drift");
assert.ok(cp383PlanPack, "CP00-383 must exist in closeout-pack-plan.json");
assert.equal(cp383PlanPack.unit_count, BILLING_CORE_CP383_PACK_BINDING.unit_count, "CP00-383 unit count drift");
assert.ok(cp384PlanPack, "CP00-384 must exist in closeout-pack-plan.json");
assert.equal(cp384PlanPack.unit_count, BILLING_CORE_CP384_PACK_BINDING.unit_count, "CP00-384 unit count drift");
assert.ok(cp385PlanPack, "CP00-385 must exist in closeout-pack-plan.json");
assert.equal(cp385PlanPack.unit_count, BILLING_CORE_CP385_PACK_BINDING.unit_count, "CP00-385 unit count drift");
assert.ok(cp386PlanPack, "CP00-386 must exist in closeout-pack-plan.json");
assert.equal(cp386PlanPack.unit_count, BILLING_CORE_CP386_PACK_BINDING.unit_count, "CP00-386 unit count drift");
assert.ok(cp387PlanPack, "CP00-387 must exist in closeout-pack-plan.json");
assert.equal(cp387PlanPack.unit_count, BILLING_CORE_CP387_PACK_BINDING.unit_count, "CP00-387 unit count drift");
assert.ok(cp388PlanPack, "CP00-388 must exist in closeout-pack-plan.json");
assert.equal(cp388PlanPack.unit_count, BILLING_CORE_CP388_PACK_BINDING.unit_count, "CP00-388 unit count drift");
assert.ok(cp389PlanPack, "CP00-389 must exist in closeout-pack-plan.json");
assert.equal(cp389PlanPack.unit_count, BILLING_CORE_CP389_PACK_BINDING.unit_count, "CP00-389 unit count drift");
assert.ok(cp390PlanPack, "CP00-390 must exist in closeout-pack-plan.json");
assert.equal(cp390PlanPack.unit_count, BILLING_CORE_CP390_PACK_BINDING.unit_count, "CP00-390 unit count drift");
assert.ok(cp391PlanPack, "CP00-391 must exist in closeout-pack-plan.json");
assert.equal(cp391PlanPack.unit_count, BILLING_CORE_CP391_PACK_BINDING.unit_count, "CP00-391 unit count drift");

const cp364Coverage = validateBillingCoreCp364Coverage(cp364PlanPack);
const cp364Descriptor = createBillingCoreCp364ScopeContractFoundationDescriptor();
const cp364CaseSet = createBillingCoreCp364ScopeContractFoundationCaseSet();
const cp364Foundation = validateBillingCoreCp364ScopeContractFoundationDescriptor(cp364Descriptor, billingContract);
const cp364Hermes = createBillingCoreCp364HermesEvidencePacket(cp364PlanPack, billingContract, cp364Descriptor);
const cp364Claude = createBillingCoreCp364ClaudeReviewPacket(cp364PlanPack);
const cp364Handoff = createBillingCoreCp364CloseoutHandoff();
const cp365Coverage = validateBillingCoreCp365Coverage(cp365PlanPack);
const cp365Descriptor = createBillingCoreCp365ModelFoundationSliceDescriptor();
const cp365CaseSet = createBillingCoreCp365ModelFoundationSliceCaseSet();
const cp365Slice = validateBillingCoreCp365ModelFoundationSliceDescriptor(cp365Descriptor, billingContract);
const cp365Hermes = createBillingCoreCp365HermesEvidencePacket(cp365PlanPack, billingContract, cp365Descriptor);
const cp365Claude = createBillingCoreCp365ClaudeReviewPacket(cp365PlanPack);
const cp365Handoff = createBillingCoreCp365CloseoutHandoff();
const cp366Coverage = validateBillingCoreCp366Coverage(cp366PlanPack);
const cp366Descriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor();
const cp366CaseSet = createBillingCoreCp366WorkflowPermissionSliceCaseSet();
const cp366Slice = validateBillingCoreCp366WorkflowPermissionSliceDescriptor(cp366Descriptor, billingContract);
const cp366Hermes = createBillingCoreCp366HermesEvidencePacket(cp366PlanPack, billingContract, cp366Descriptor);
const cp366Claude = createBillingCoreCp366ClaudeReviewPacket(cp366PlanPack);
const cp366Handoff = createBillingCoreCp366CloseoutHandoff();
const cp367Coverage = validateBillingCoreCp367Coverage(cp367PlanPack);
const cp367Descriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor();
const cp367CaseSet = createBillingCoreCp367P01CloseoutP02FoundationCaseSet();
const cp367Slice = validateBillingCoreCp367P01CloseoutP02FoundationDescriptor(cp367Descriptor, billingContract);
const cp367Hermes = createBillingCoreCp367HermesEvidencePacket(cp367PlanPack, billingContract, cp367Descriptor);
const cp367Claude = createBillingCoreCp367ClaudeReviewPacket(cp367PlanPack);
const cp367Handoff = createBillingCoreCp367CloseoutHandoff();
const cp368Coverage = validateBillingCoreCp368Coverage(cp368PlanPack);
const cp368Descriptor = createBillingCoreCp368P02ImplementationSliceDescriptor();
const cp368CaseSet = createBillingCoreCp368P02ImplementationSliceCaseSet();
const cp368Slice = validateBillingCoreCp368P02ImplementationSliceDescriptor(cp368Descriptor, billingContract);
const cp368Hermes = createBillingCoreCp368HermesEvidencePacket(cp368PlanPack, billingContract, cp368Descriptor);
const cp368Claude = createBillingCoreCp368ClaudeReviewPacket(cp368PlanPack);
const cp368Handoff = createBillingCoreCp368CloseoutHandoff();
const cp369Coverage = validateBillingCoreCp369Coverage(cp369PlanPack);
const cp369Descriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor();
const cp369CaseSet = createBillingCoreCp369P02PermissionFixtureSliceCaseSet();
const cp369Slice = validateBillingCoreCp369P02PermissionFixtureSliceDescriptor(cp369Descriptor, billingContract);
const cp369Hermes = createBillingCoreCp369HermesEvidencePacket(cp369PlanPack, billingContract, cp369Descriptor);
const cp369Claude = createBillingCoreCp369ClaudeReviewPacket(cp369PlanPack);
const cp369Handoff = createBillingCoreCp369CloseoutHandoff();
const cp370Coverage = validateBillingCoreCp370Coverage(cp370PlanPack);
const cp370Descriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor();
const cp370CaseSet = createBillingCoreCp370P02FixtureTestSliceCaseSet();
const cp370Slice = validateBillingCoreCp370P02FixtureTestSliceDescriptor(cp370Descriptor, billingContract);
const cp370Hermes = createBillingCoreCp370HermesEvidencePacket(cp370PlanPack, billingContract, cp370Descriptor);
const cp370Claude = createBillingCoreCp370ClaudeReviewPacket(cp370PlanPack);
const cp370Handoff = createBillingCoreCp370CloseoutHandoff();
const cp371Coverage = validateBillingCoreCp371Coverage(cp371PlanPack);
const cp371Descriptor = createBillingCoreCp371P02TestSliceDescriptor();
const cp371CaseSet = createBillingCoreCp371P02TestSliceCaseSet();
const cp371Slice = validateBillingCoreCp371P02TestSliceDescriptor(cp371Descriptor, billingContract);
const cp371Hermes = createBillingCoreCp371HermesEvidencePacket(cp371PlanPack, billingContract, cp371Descriptor);
const cp371Claude = createBillingCoreCp371ClaudeReviewPacket(cp371PlanPack);
const cp371Handoff = createBillingCoreCp371CloseoutHandoff();
const cp372Coverage = validateBillingCoreCp372Coverage(cp372PlanPack);
const cp372Descriptor = createBillingCoreCp372P02TestHermesSliceDescriptor();
const cp372CaseSet = createBillingCoreCp372P02TestHermesSliceCaseSet();
const cp372Slice = validateBillingCoreCp372P02TestHermesSliceDescriptor(cp372Descriptor, billingContract);
const cp372Hermes = createBillingCoreCp372HermesEvidencePacket(cp372PlanPack, billingContract, cp372Descriptor);
const cp372Claude = createBillingCoreCp372ClaudeReviewPacket(cp372PlanPack);
const cp372Handoff = createBillingCoreCp372CloseoutHandoff();
const cp373Coverage = validateBillingCoreCp373Coverage(cp373PlanPack);
const cp373Descriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor();
const cp373CaseSet = createBillingCoreCp373P02CloseoutP03FoundationCaseSet();
const cp373Slice = validateBillingCoreCp373P02CloseoutP03FoundationDescriptor(cp373Descriptor, billingContract);
const cp373Hermes = createBillingCoreCp373HermesEvidencePacket(cp373PlanPack, billingContract, cp373Descriptor);
const cp373Claude = createBillingCoreCp373ClaudeReviewPacket(cp373PlanPack);
const cp373Handoff = createBillingCoreCp373CloseoutHandoff();
const cp374Coverage = validateBillingCoreCp374Coverage(cp374PlanPack);
const cp374Descriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor();
const cp374CaseSet = createBillingCoreCp374P03CloseoutP04FoundationCaseSet();
const cp374Slice = validateBillingCoreCp374P03CloseoutP04FoundationDescriptor(cp374Descriptor, billingContract);
const cp374Hermes = createBillingCoreCp374HermesEvidencePacket(cp374PlanPack, billingContract, cp374Descriptor);
const cp374Claude = createBillingCoreCp374ClaudeReviewPacket(cp374PlanPack);
const cp374Handoff = createBillingCoreCp374CloseoutHandoff();
const cp375Coverage = validateBillingCoreCp375Coverage(cp375PlanPack);
const cp375Descriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor();
const cp375CaseSet = createBillingCoreCp375P04WorkflowPermissionSliceCaseSet();
const cp375Slice = validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor(cp375Descriptor, billingContract);
const cp375Hermes = createBillingCoreCp375HermesEvidencePacket(cp375PlanPack, billingContract, cp375Descriptor);
const cp375Claude = createBillingCoreCp375ClaudeReviewPacket(cp375PlanPack);
const cp375Handoff = createBillingCoreCp375CloseoutHandoff();
const cp376Coverage = validateBillingCoreCp376Coverage(cp376PlanPack);
const cp376Descriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor();
const cp376CaseSet = createBillingCoreCp376P04PermissionFixtureSliceCaseSet();
const cp376Slice = validateBillingCoreCp376P04PermissionFixtureSliceDescriptor(cp376Descriptor, billingContract);
const cp376Hermes = createBillingCoreCp376HermesEvidencePacket(cp376PlanPack, billingContract, cp376Descriptor);
const cp376Claude = createBillingCoreCp376ClaudeReviewPacket(cp376PlanPack);
const cp376Handoff = createBillingCoreCp376CloseoutHandoff();
const cp377Coverage = validateBillingCoreCp377Coverage(cp377PlanPack);
const cp377Descriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor();
const cp377CaseSet = createBillingCoreCp377P04CloseoutP05FoundationCaseSet();
const cp377Slice = validateBillingCoreCp377P04CloseoutP05FoundationDescriptor(cp377Descriptor, billingContract);
const cp377Hermes = createBillingCoreCp377HermesEvidencePacket(cp377PlanPack, billingContract, cp377Descriptor);
const cp377Claude = createBillingCoreCp377ClaudeReviewPacket(cp377PlanPack);
const cp377Handoff = createBillingCoreCp377CloseoutHandoff();
const cp378Coverage = validateBillingCoreCp378Coverage(cp378PlanPack);
const cp378Descriptor = createBillingCoreCp378P05ImplementationSliceDescriptor();
const cp378CaseSet = createBillingCoreCp378P05ImplementationSliceCaseSet();
const cp378Slice = validateBillingCoreCp378P05ImplementationSliceDescriptor(cp378Descriptor, billingContract);
const cp378Hermes = createBillingCoreCp378HermesEvidencePacket(cp378PlanPack, billingContract, cp378Descriptor);
const cp378Claude = createBillingCoreCp378ClaudeReviewPacket(cp378PlanPack);
const cp378Handoff = createBillingCoreCp378CloseoutHandoff();
const cp379Coverage = validateBillingCoreCp379Coverage(cp379PlanPack);
const cp379Descriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor();
const cp379CaseSet = createBillingCoreCp379P05CloseoutP06FoundationCaseSet();
const cp379Slice = validateBillingCoreCp379P05CloseoutP06FoundationDescriptor(cp379Descriptor, billingContract);
const cp379Hermes = createBillingCoreCp379HermesEvidencePacket(cp379PlanPack, billingContract, cp379Descriptor);
const cp379Claude = createBillingCoreCp379ClaudeReviewPacket(cp379PlanPack);
const cp379Handoff = createBillingCoreCp379CloseoutHandoff();
const cp380Coverage = validateBillingCoreCp380Coverage(cp380PlanPack);
const cp380Descriptor = createBillingCoreCp380P06FoundationSliceDescriptor();
const cp380CaseSet = createBillingCoreCp380P06FoundationSliceCaseSet();
const cp380Slice = validateBillingCoreCp380P06FoundationSliceDescriptor(cp380Descriptor, billingContract);
const cp380Hermes = createBillingCoreCp380HermesEvidencePacket(cp380PlanPack, billingContract, cp380Descriptor);
const cp380Claude = createBillingCoreCp380ClaudeReviewPacket(cp380PlanPack);
const cp380Handoff = createBillingCoreCp380CloseoutHandoff();
const cp381Coverage = validateBillingCoreCp381Coverage(cp381PlanPack);
const cp381Descriptor = createBillingCoreCp381P06TestHermesSliceDescriptor();
const cp381CaseSet = createBillingCoreCp381P06TestHermesSliceCaseSet();
const cp381Slice = validateBillingCoreCp381P06TestHermesSliceDescriptor(cp381Descriptor, billingContract);
const cp381Hermes = createBillingCoreCp381HermesEvidencePacket(cp381PlanPack, billingContract, cp381Descriptor);
const cp381Claude = createBillingCoreCp381ClaudeReviewPacket(cp381PlanPack);
const cp381Handoff = createBillingCoreCp381CloseoutHandoff();
const cp382Coverage = validateBillingCoreCp382Coverage(cp382PlanPack);
const cp382Descriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor();
const cp382CaseSet = createBillingCoreCp382P06CloseoutP07FoundationCaseSet();
const cp382Slice = validateBillingCoreCp382P06CloseoutP07FoundationDescriptor(cp382Descriptor, billingContract);
const cp382Hermes = createBillingCoreCp382HermesEvidencePacket(cp382PlanPack, billingContract, cp382Descriptor);
const cp382Claude = createBillingCoreCp382ClaudeReviewPacket(cp382PlanPack);
const cp382Handoff = createBillingCoreCp382CloseoutHandoff();
const cp383Coverage = validateBillingCoreCp383Coverage(cp383PlanPack);
const cp383Descriptor = createBillingCoreCp383P07PermissionSliceDescriptor();
const cp383CaseSet = createBillingCoreCp383P07PermissionSliceCaseSet();
const cp383Slice = validateBillingCoreCp383P07PermissionSliceDescriptor(cp383Descriptor, billingContract);
const cp383Hermes = createBillingCoreCp383HermesEvidencePacket(cp383PlanPack, billingContract, cp383Descriptor);
const cp383Claude = createBillingCoreCp383ClaudeReviewPacket(cp383PlanPack);
const cp383Handoff = createBillingCoreCp383CloseoutHandoff();
const cp384Coverage = validateBillingCoreCp384Coverage(cp384PlanPack);
const cp384Descriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor();
const cp384CaseSet = createBillingCoreCp384P07PermissionFixtureSliceCaseSet();
const cp384Slice = validateBillingCoreCp384P07PermissionFixtureSliceDescriptor(cp384Descriptor, billingContract);
const cp384Hermes = createBillingCoreCp384HermesEvidencePacket(cp384PlanPack, billingContract, cp384Descriptor);
const cp384Claude = createBillingCoreCp384ClaudeReviewPacket(cp384PlanPack);
const cp384Handoff = createBillingCoreCp384CloseoutHandoff();
const cp385Coverage = validateBillingCoreCp385Coverage(cp385PlanPack);
const cp385Descriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor();
const cp385CaseSet = createBillingCoreCp385P07CloseoutP08FoundationCaseSet();
const cp385Slice = validateBillingCoreCp385P07CloseoutP08FoundationDescriptor(cp385Descriptor, billingContract);
const cp385Hermes = createBillingCoreCp385HermesEvidencePacket(cp385PlanPack, billingContract, cp385Descriptor);
const cp385Claude = createBillingCoreCp385ClaudeReviewPacket(cp385PlanPack);
const cp385Handoff = createBillingCoreCp385CloseoutHandoff();
const cp386Coverage = validateBillingCoreCp386Coverage(cp386PlanPack);
const cp386Descriptor = createBillingCoreCp386P08ImplementationSliceDescriptor();
const cp386CaseSet = createBillingCoreCp386P08ImplementationSliceCaseSet();
const cp386Slice = validateBillingCoreCp386P08ImplementationSliceDescriptor(cp386Descriptor, billingContract);
const cp386Hermes = createBillingCoreCp386HermesEvidencePacket(cp386PlanPack, billingContract, cp386Descriptor);
const cp386Claude = createBillingCoreCp386ClaudeReviewPacket(cp386PlanPack);
const cp386Handoff = createBillingCoreCp386CloseoutHandoff();
const cp387Coverage = validateBillingCoreCp387Coverage(cp387PlanPack);
const cp387Descriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor();
const cp387CaseSet = createBillingCoreCp387P08WorkflowPermissionSliceCaseSet();
const cp387Slice = validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor(cp387Descriptor, billingContract);
const cp387Hermes = createBillingCoreCp387HermesEvidencePacket(cp387PlanPack, billingContract, cp387Descriptor);
const cp387Claude = createBillingCoreCp387ClaudeReviewPacket(cp387PlanPack);
const cp387Handoff = createBillingCoreCp387CloseoutHandoff();
const cp388Coverage = validateBillingCoreCp388Coverage(cp388PlanPack);
const cp388Descriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor();
const cp388CaseSet = createBillingCoreCp388P08CloseoutP09FoundationCaseSet();
const cp388Slice = validateBillingCoreCp388P08CloseoutP09FoundationDescriptor(cp388Descriptor, billingContract);
const cp388Hermes = createBillingCoreCp388HermesEvidencePacket(cp388PlanPack, billingContract, cp388Descriptor);
const cp388Claude = createBillingCoreCp388ClaudeReviewPacket(cp388PlanPack);
const cp388Handoff = createBillingCoreCp388CloseoutHandoff();
const cp389Coverage = validateBillingCoreCp389Coverage(cp389PlanPack);
const cp389Descriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor();
const cp389CaseSet = createBillingCoreCp389P09WorkflowPermissionSliceCaseSet();
const cp389Slice = validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor(cp389Descriptor, billingContract);
const cp389Hermes = createBillingCoreCp389HermesEvidencePacket(cp389PlanPack, billingContract, cp389Descriptor);
const cp389Claude = createBillingCoreCp389ClaudeReviewPacket(cp389PlanPack);
const cp389Handoff = createBillingCoreCp389CloseoutHandoff();
const cp390Coverage = validateBillingCoreCp390Coverage(cp390PlanPack);
const cp390Descriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor();
const cp390CaseSet = createBillingCoreCp390P09PermissionFixtureSliceCaseSet();
const cp390Slice = validateBillingCoreCp390P09PermissionFixtureSliceDescriptor(cp390Descriptor, billingContract);
const cp390Hermes = createBillingCoreCp390HermesEvidencePacket(cp390PlanPack, billingContract, cp390Descriptor);
const cp390Claude = createBillingCoreCp390ClaudeReviewPacket(cp390PlanPack);
const cp390Handoff = createBillingCoreCp390CloseoutHandoff();
const cp391Coverage = validateBillingCoreCp391Coverage(cp391PlanPack);
const cp391Descriptor = createBillingCoreCp391P09CloseoutSliceDescriptor();
const cp391CaseSet = createBillingCoreCp391P09CloseoutSliceCaseSet();
const cp391Slice = validateBillingCoreCp391P09CloseoutSliceDescriptor(cp391Descriptor, billingContract);
const cp391Hermes = createBillingCoreCp391HermesEvidencePacket(cp391PlanPack, billingContract, cp391Descriptor);
const cp391Claude = createBillingCoreCp391ClaudeReviewPacket(cp391PlanPack);
const cp391Handoff = createBillingCoreCp391CloseoutHandoff();

assert.equal(cp364Coverage.valid, true, cp364Coverage.errors.join("; "));
assert.equal(cp364Coverage.summary.unit_count, 150);
assert.equal(cp364Coverage.summary.by_phase["RP12.P00"], 122);
assert.equal(cp364Coverage.summary.by_phase["RP12.P01"], 28);
assert.equal(cp364Foundation.valid, true, cp364Foundation.errors.join("; "));
assert.equal(cp364CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp364CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-364 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp364Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp364_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP364_REQUIREMENTS)));
assert.deepEqual(billingContract.cp364_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP364_NO_WRITE_ATTESTATION)));
assert.equal(cp364Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp364Hermes.production_ready_candidate, true);
assert.equal(cp364Claude.review_packet, "C12.CP00-364.billing_core_scope_contract_foundation_descriptor");
assert.equal(cp364Claude.read_only, true);
assert.equal(cp364Handoff.to_pack_id, "CP00-365");
assert.equal(cp364Handoff.next_subphase_id, "RP12.P01.M02.S09");
assert.equal(BILLING_CORE_CP364_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP364_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp365Coverage.valid, true, cp365Coverage.errors.join("; "));
assert.equal(cp365Coverage.summary.unit_count, 40);
assert.equal(cp365Coverage.summary.by_micro_phase["RP12.P01.M02"], 12);
assert.equal(cp365Coverage.summary.by_micro_phase["RP12.P01.M03"], 22);
assert.equal(cp365Coverage.summary.by_micro_phase["RP12.P01.M04"], 6);
assert.equal(cp365Slice.valid, true, cp365Slice.errors.join("; "));
assert.equal(cp365CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp365CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-365 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.model_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp365Descriptor)),
  "contract model_foundation_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp365_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP365_REQUIREMENTS)));
assert.deepEqual(billingContract.cp365_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP365_NO_WRITE_ATTESTATION)));
assert.equal(cp365Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp365Hermes.production_ready_candidate, true);
assert.equal(cp365Claude.review_packet, "C12.CP00-365.billing_core_model_foundation_slice_descriptor");
assert.equal(cp365Claude.read_only, true);
assert.equal(cp365Handoff.to_pack_id, "CP00-366");
assert.equal(cp365Handoff.next_subphase_id, "RP12.P01.M04.S07");
assert.equal(BILLING_CORE_CP365_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP365_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp366Coverage.valid, true, cp366Coverage.errors.join("; "));
assert.equal(cp366Coverage.summary.unit_count, 40);
assert.equal(cp366Coverage.summary.by_micro_phase["RP12.P01.M04"], 14);
assert.equal(cp366Coverage.summary.by_micro_phase["RP12.P01.M05"], 22);
assert.equal(cp366Coverage.summary.by_micro_phase["RP12.P01.M06"], 4);
assert.equal(cp366Slice.valid, true, cp366Slice.errors.join("; "));
assert.equal(cp366CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp366CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-366 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp366Descriptor)),
  "contract workflow_permission_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp366_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP366_REQUIREMENTS)));
assert.deepEqual(billingContract.cp366_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP366_NO_WRITE_ATTESTATION)));
assert.equal(cp366Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp366Hermes.production_ready_candidate, true);
assert.equal(cp366Claude.review_packet, "C12.CP00-366.billing_core_workflow_permission_slice_descriptor");
assert.equal(cp366Claude.read_only, true);
assert.equal(cp366Handoff.to_pack_id, "CP00-367");
assert.equal(cp366Handoff.next_subphase_id, "RP12.P01.M06.S05");
assert.equal(BILLING_CORE_CP366_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP366_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp367Coverage.valid, true, cp367Coverage.errors.join("; "));
assert.equal(cp367Coverage.summary.unit_count, 150);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P01.M06"], 16);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P01.M07"], 22);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P01.M08"], 20);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P01.M09"], 20);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P01.M10"], 10);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P02.M00"], 20);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P02.M01"], 20);
assert.equal(cp367Coverage.summary.by_micro_phase["RP12.P02.M02"], 22);
assert.equal(cp367Slice.valid, true, cp367Slice.errors.join("; "));
assert.equal(cp367CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp367CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-367 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp367Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp367_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP367_REQUIREMENTS)));
assert.deepEqual(billingContract.cp367_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP367_NO_WRITE_ATTESTATION)));
assert.equal(cp367Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp367Hermes.production_ready_candidate, true);
assert.equal(cp367Claude.review_packet, "C12.CP00-367.billing_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp367Claude.read_only, true);
assert.equal(cp367Handoff.to_pack_id, "CP00-368");
assert.equal(cp367Handoff.next_subphase_id, "RP12.P02.M03.S01");
assert.equal(BILLING_CORE_CP367_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP367_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp368Coverage.valid, true, cp368Coverage.errors.join("; "));
assert.equal(cp368Coverage.summary.unit_count, 40);
assert.equal(cp368Coverage.summary.by_micro_phase["RP12.P02.M03"], 22);
assert.equal(cp368Coverage.summary.by_micro_phase["RP12.P02.M04"], 18);
assert.equal(cp368Slice.valid, true, cp368Slice.errors.join("; "));
assert.equal(cp368CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp368CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-368 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp368Descriptor)),
  "contract p02_implementation_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp368_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP368_REQUIREMENTS)));
assert.deepEqual(billingContract.cp368_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP368_NO_WRITE_ATTESTATION)));
assert.equal(cp368Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp368Hermes.production_ready_candidate, true);
assert.equal(cp368Claude.review_packet, "C12.CP00-368.billing_core_p02_implementation_slice_descriptor");
assert.equal(cp368Claude.read_only, true);
assert.equal(cp368Handoff.to_pack_id, "CP00-369");
assert.equal(cp368Handoff.next_subphase_id, "RP12.P02.M04.S19");
assert.equal(BILLING_CORE_CP368_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP368_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp369Coverage.valid, true, cp369Coverage.errors.join("; "));
assert.equal(cp369Coverage.summary.unit_count, 40);
assert.equal(cp369Coverage.summary.by_micro_phase["RP12.P02.M04"], 4);
assert.equal(cp369Coverage.summary.by_micro_phase["RP12.P02.M05"], 22);
assert.equal(cp369Coverage.summary.by_micro_phase["RP12.P02.M06"], 14);
assert.equal(cp369Slice.valid, true, cp369Slice.errors.join("; "));
assert.equal(cp369CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp369CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-369 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp369Descriptor)),
  "contract p02_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp369_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP369_REQUIREMENTS)));
assert.deepEqual(billingContract.cp369_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP369_NO_WRITE_ATTESTATION)));
assert.equal(cp369Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp369Hermes.production_ready_candidate, true);
assert.equal(cp369Claude.review_packet, "C12.CP00-369.billing_core_p02_permission_fixture_slice_descriptor");
assert.equal(cp369Claude.read_only, true);
assert.equal(cp369Handoff.to_pack_id, "CP00-370");
assert.equal(cp369Handoff.next_subphase_id, "RP12.P02.M06.S15");
assert.equal(BILLING_CORE_CP369_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP369_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp370Coverage.valid, true, cp370Coverage.errors.join("; "));
assert.equal(cp370Coverage.summary.unit_count, 10);
assert.equal(cp370Coverage.summary.by_micro_phase["RP12.P02.M06"], 8);
assert.equal(cp370Coverage.summary.by_micro_phase["RP12.P02.M07"], 2);
assert.equal(cp370Slice.valid, true, cp370Slice.errors.join("; "));
assert.equal(cp370CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp370CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-370 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_fixture_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp370Descriptor)),
  "contract p02_fixture_test_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp370_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP370_REQUIREMENTS)));
assert.deepEqual(billingContract.cp370_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP370_NO_WRITE_ATTESTATION)));
assert.equal(cp370Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp370Hermes.production_ready_candidate, true);
assert.equal(cp370Claude.review_packet, "C12.CP00-370.billing_core_p02_fixture_test_slice_descriptor");
assert.equal(cp370Claude.read_only, true);
assert.equal(cp370Handoff.to_pack_id, "CP00-371");
assert.equal(cp370Handoff.next_subphase_id, "RP12.P02.M07.S03");
assert.equal(BILLING_CORE_CP370_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP370_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp371Coverage.valid, true, cp371Coverage.errors.join("; "));
assert.equal(cp371Coverage.summary.unit_count, 10);
assert.equal(cp371Coverage.summary.by_micro_phase["RP12.P02.M07"], 10);
assert.equal(cp371Slice.valid, true, cp371Slice.errors.join("; "));
assert.equal(cp371CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp371CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-371 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp371Descriptor)),
  "contract p02_test_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp371_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP371_REQUIREMENTS)));
assert.deepEqual(billingContract.cp371_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP371_NO_WRITE_ATTESTATION)));
assert.equal(cp371Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp371Hermes.production_ready_candidate, true);
assert.equal(cp371Claude.review_packet, "C12.CP00-371.billing_core_p02_test_slice_descriptor");
assert.equal(cp371Claude.read_only, true);
assert.equal(cp371Handoff.to_pack_id, "CP00-372");
assert.equal(cp371Handoff.next_subphase_id, "RP12.P02.M07.S13");
assert.equal(BILLING_CORE_CP371_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP371_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp372Coverage.valid, true, cp372Coverage.errors.join("; "));
assert.equal(cp372Coverage.summary.unit_count, 40);
assert.equal(cp372Coverage.summary.by_micro_phase["RP12.P02.M07"], 10);
assert.equal(cp372Coverage.summary.by_micro_phase["RP12.P02.M08"], 22);
assert.equal(cp372Coverage.summary.by_micro_phase["RP12.P02.M09"], 8);
assert.equal(cp372Slice.valid, true, cp372Slice.errors.join("; "));
assert.equal(cp372CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp372CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-372 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp372Descriptor)),
  "contract p02_test_hermes_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp372_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP372_REQUIREMENTS)));
assert.deepEqual(billingContract.cp372_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP372_NO_WRITE_ATTESTATION)));
assert.equal(cp372Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp372Hermes.production_ready_candidate, true);
assert.equal(cp372Claude.review_packet, "C12.CP00-372.billing_core_p02_test_hermes_slice_descriptor");
assert.equal(cp372Claude.read_only, true);
assert.equal(cp372Handoff.to_pack_id, "CP00-373");
assert.equal(cp372Handoff.next_subphase_id, "RP12.P02.M09.S09");
assert.equal(BILLING_CORE_CP372_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP372_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp373Coverage.valid, true, cp373Coverage.errors.join("; "));
assert.equal(cp373Coverage.summary.unit_count, 150);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P02.M09"], 14);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P02.M10"], 20);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M00"], 10);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M01"], 10);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M02"], 20);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M03"], 22);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M04"], 20);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M05"], 22);
assert.equal(cp373Coverage.summary.by_micro_phase["RP12.P03.M06"], 12);
assert.equal(cp373Slice.valid, true, cp373Slice.errors.join("; "));
assert.equal(cp373CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp373CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-373 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp373Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp373_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP373_REQUIREMENTS)));
assert.deepEqual(billingContract.cp373_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP373_NO_WRITE_ATTESTATION)));
assert.equal(cp373Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp373Hermes.production_ready_candidate, true);
assert.equal(cp373Claude.review_packet, "C12.CP00-373.billing_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp373Claude.read_only, true);
assert.equal(cp373Handoff.to_pack_id, "CP00-374");
assert.equal(cp373Handoff.next_subphase_id, "RP12.P03.M06.S13");
assert.equal(BILLING_CORE_CP373_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP373_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp374Coverage.valid, true, cp374Coverage.errors.join("; "));
assert.equal(cp374Coverage.summary.unit_count, 150);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P03.M06"], 8);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P03.M07"], 22);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P03.M08"], 20);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P03.M09"], 20);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P03.M10"], 10);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P04.M00"], 10);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P04.M01"], 20);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P04.M02"], 20);
assert.equal(cp374Coverage.summary.by_micro_phase["RP12.P04.M03"], 20);
assert.equal(cp374Slice.valid, true, cp374Slice.errors.join("; "));
assert.equal(cp374CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp374CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-374 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp374Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp374_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP374_REQUIREMENTS)));
assert.deepEqual(billingContract.cp374_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP374_NO_WRITE_ATTESTATION)));
assert.equal(cp374Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp374Hermes.production_ready_candidate, true);
assert.equal(cp374Claude.review_packet, "C12.CP00-374.billing_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp374Claude.read_only, true);
assert.equal(cp374Handoff.to_pack_id, "CP00-375");
assert.equal(cp374Handoff.next_subphase_id, "RP12.P04.M03.S21");
assert.equal(BILLING_CORE_CP374_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP374_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp375Coverage.valid, true, cp375Coverage.errors.join("; "));
assert.equal(cp375Coverage.summary.unit_count, 40);
assert.equal(cp375Coverage.summary.by_micro_phase["RP12.P04.M03"], 2);
assert.equal(cp375Coverage.summary.by_micro_phase["RP12.P04.M04"], 22);
assert.equal(cp375Coverage.summary.by_micro_phase["RP12.P04.M05"], 16);
assert.equal(cp375Slice.valid, true, cp375Slice.errors.join("; "));
assert.equal(cp375CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp375CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-375 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p04_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp375Descriptor)),
  "contract p04_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp375_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP375_REQUIREMENTS)));
assert.deepEqual(billingContract.cp375_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP375_NO_WRITE_ATTESTATION)));
assert.equal(cp375Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp375Hermes.production_ready_candidate, true);
assert.equal(cp375Claude.review_packet, "C12.CP00-375.billing_core_p04_workflow_permission_slice_descriptor");
assert.equal(cp375Claude.read_only, true);
assert.equal(cp375Handoff.to_pack_id, "CP00-376");
assert.equal(cp375Handoff.next_subphase_id, "RP12.P04.M05.S17");
assert.equal(BILLING_CORE_CP375_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP375_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp376Coverage.valid, true, cp376Coverage.errors.join("; "));
assert.equal(cp376Coverage.summary.unit_count, 10);
assert.equal(cp376Coverage.summary.by_micro_phase["RP12.P04.M05"], 6);
assert.equal(cp376Coverage.summary.by_micro_phase["RP12.P04.M06"], 4);
assert.equal(cp376Slice.valid, true, cp376Slice.errors.join("; "));
assert.equal(cp376CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp376CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-376 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp376Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp376_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP376_REQUIREMENTS)));
assert.deepEqual(billingContract.cp376_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP376_NO_WRITE_ATTESTATION)));
assert.equal(cp376Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp376Hermes.production_ready_candidate, true);
assert.equal(cp376Claude.review_packet, "C12.CP00-376.billing_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp376Claude.read_only, true);
assert.equal(cp376Handoff.to_pack_id, "CP00-377");
assert.equal(cp376Handoff.next_subphase_id, "RP12.P04.M06.S05");
assert.equal(BILLING_CORE_CP376_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP376_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp377Coverage.valid, true, cp377Coverage.errors.join("; "));
assert.equal(cp377Coverage.summary.unit_count, 150);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P04.M06"], 18);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P04.M07"], 22);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P04.M08"], 22);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P04.M09"], 20);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P04.M10"], 10);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P05.M00"], 10);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P05.M01"], 20);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P05.M02"], 20);
assert.equal(cp377Coverage.summary.by_micro_phase["RP12.P05.M03"], 8);
assert.equal(cp377Slice.valid, true, cp377Slice.errors.join("; "));
assert.equal(cp377CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp377CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-377 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp377Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp377_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP377_REQUIREMENTS)));
assert.deepEqual(billingContract.cp377_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP377_NO_WRITE_ATTESTATION)));
assert.equal(cp377Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp377Hermes.production_ready_candidate, true);
assert.equal(cp377Claude.review_packet, "C12.CP00-377.billing_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp377Claude.read_only, true);
assert.equal(cp377Handoff.to_pack_id, "CP00-378");
assert.equal(cp377Handoff.next_subphase_id, "RP12.P05.M03.S09");
assert.equal(BILLING_CORE_CP377_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP377_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp378Coverage.valid, true, cp378Coverage.errors.join("; "));
assert.equal(cp378Coverage.summary.unit_count, 10);
assert.equal(cp378Coverage.summary.by_micro_phase["RP12.P05.M03"], 10);
assert.equal(cp378Slice.valid, true, cp378Slice.errors.join("; "));
assert.equal(cp378CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp378CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-378 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p05_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp378Descriptor)),
  "contract p05_implementation_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp378_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP378_REQUIREMENTS)));
assert.deepEqual(billingContract.cp378_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP378_NO_WRITE_ATTESTATION)));
assert.equal(cp378Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp378Hermes.production_ready_candidate, true);
assert.equal(cp378Claude.review_packet, "C12.CP00-378.billing_core_p05_implementation_slice_descriptor");
assert.equal(cp378Claude.read_only, true);
assert.equal(cp378Handoff.to_pack_id, "CP00-379");
assert.equal(cp378Handoff.next_subphase_id, "RP12.P05.M03.S19");
assert.equal(BILLING_CORE_CP378_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP378_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp379Coverage.valid, true, cp379Coverage.errors.join("; "));
assert.equal(cp379Coverage.summary.unit_count, 150);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M03"], 4);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M04"], 22);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M05"], 22);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M06"], 22);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M07"], 22);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M08"], 22);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M09"], 20);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P05.M10"], 10);
assert.equal(cp379Coverage.summary.by_micro_phase["RP12.P06.M00"], 6);
assert.equal(cp379Slice.valid, true, cp379Slice.errors.join("; "));
assert.equal(cp379CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp379CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-379 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp379Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp379_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP379_REQUIREMENTS)));
assert.deepEqual(billingContract.cp379_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP379_NO_WRITE_ATTESTATION)));
assert.equal(cp379Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp379Hermes.production_ready_candidate, true);
assert.equal(cp379Claude.review_packet, "C12.CP00-379.billing_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp379Claude.read_only, true);
assert.equal(cp379Handoff.to_pack_id, "CP00-380");
assert.equal(cp379Handoff.next_subphase_id, "RP12.P06.M00.S07");
assert.equal(BILLING_CORE_CP379_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP379_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp380Coverage.valid, true, cp380Coverage.errors.join("; "));
assert.equal(cp380Coverage.summary.unit_count, 150);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M00"], 14);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M01"], 20);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M02"], 22);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M03"], 22);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M04"], 22);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M05"], 22);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M06"], 22);
assert.equal(cp380Coverage.summary.by_micro_phase["RP12.P06.M07"], 6);
assert.equal(cp380Slice.valid, true, cp380Slice.errors.join("; "));
assert.equal(cp380CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp380CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-380 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p06_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp380Descriptor)),
  "contract p06_foundation_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp380_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP380_REQUIREMENTS)));
assert.deepEqual(billingContract.cp380_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP380_NO_WRITE_ATTESTATION)));
assert.equal(cp380Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp380Hermes.production_ready_candidate, true);
assert.equal(cp380Claude.review_packet, "C12.CP00-380.billing_core_p06_foundation_slice_descriptor");
assert.equal(cp380Claude.read_only, true);
assert.equal(cp380Handoff.to_pack_id, "CP00-381");
assert.equal(cp380Handoff.next_subphase_id, "RP12.P06.M07.S07");
assert.equal(BILLING_CORE_CP380_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP380_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp381Coverage.valid, true, cp381Coverage.errors.join("; "));
assert.equal(cp381Coverage.summary.unit_count, 40);
assert.equal(cp381Coverage.summary.by_micro_phase["RP12.P06.M07"], 16);
assert.equal(cp381Coverage.summary.by_micro_phase["RP12.P06.M08"], 22);
assert.equal(cp381Coverage.summary.by_micro_phase["RP12.P06.M09"], 2);
assert.equal(cp381Slice.valid, true, cp381Slice.errors.join("; "));
assert.equal(cp381CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp381CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-381 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p06_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp381Descriptor)),
  "contract p06_test_hermes_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp381_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP381_REQUIREMENTS)));
assert.deepEqual(billingContract.cp381_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP381_NO_WRITE_ATTESTATION)));
assert.equal(cp381Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp381Hermes.production_ready_candidate, true);
assert.equal(cp381Claude.review_packet, "C12.CP00-381.billing_core_p06_test_hermes_slice_descriptor");
assert.equal(cp381Claude.read_only, true);
assert.equal(cp381Handoff.to_pack_id, "CP00-382");
assert.equal(cp381Handoff.next_subphase_id, "RP12.P06.M09.S03");
assert.equal(BILLING_CORE_CP381_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP381_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp382Coverage.valid, true, cp382Coverage.errors.join("; "));
assert.equal(cp382Coverage.summary.unit_count, 150);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P06.M09"], 20);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P06.M10"], 20);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M00"], 20);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M01"], 20);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M02"], 22);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M03"], 22);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M04"], 22);
assert.equal(cp382Coverage.summary.by_micro_phase["RP12.P07.M05"], 4);
assert.equal(cp382Slice.valid, true, cp382Slice.errors.join("; "));
assert.equal(cp382CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp382CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-382 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp382Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp382_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP382_REQUIREMENTS)));
assert.deepEqual(billingContract.cp382_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP382_NO_WRITE_ATTESTATION)));
assert.equal(cp382Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp382Hermes.production_ready_candidate, true);
assert.equal(cp382Claude.review_packet, "C12.CP00-382.billing_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp382Claude.read_only, true);
assert.equal(cp382Handoff.to_pack_id, "CP00-383");
assert.equal(cp382Handoff.next_subphase_id, "RP12.P07.M05.S05");
assert.equal(BILLING_CORE_CP382_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP382_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp383Coverage.valid, true, cp383Coverage.errors.join("; "));
assert.equal(cp383Coverage.summary.unit_count, 10);
assert.equal(cp383Coverage.summary.by_micro_phase["RP12.P07.M05"], 10);
assert.equal(cp383Slice.valid, true, cp383Slice.errors.join("; "));
assert.equal(cp383CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp383CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-383 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p07_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp383Descriptor)),
  "contract p07_permission_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp383_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP383_REQUIREMENTS)));
assert.deepEqual(billingContract.cp383_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP383_NO_WRITE_ATTESTATION)));
assert.equal(cp383Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp383Hermes.production_ready_candidate, true);
assert.equal(cp383Claude.review_packet, "C12.CP00-383.billing_core_p07_permission_slice_descriptor");
assert.equal(cp383Claude.read_only, true);
assert.equal(cp383Handoff.to_pack_id, "CP00-384");
assert.equal(cp383Handoff.next_subphase_id, "RP12.P07.M05.S15");
assert.equal(BILLING_CORE_CP383_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP383_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp384Coverage.valid, true, cp384Coverage.errors.join("; "));
assert.equal(cp384Coverage.summary.unit_count, 10);
assert.equal(cp384Coverage.summary.by_micro_phase["RP12.P07.M05"], 8);
assert.equal(cp384Coverage.summary.by_micro_phase["RP12.P07.M06"], 2);
assert.equal(cp384Slice.valid, true, cp384Slice.errors.join("; "));
assert.equal(cp384CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp384CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-384 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p07_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp384Descriptor)),
  "contract p07_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp384_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP384_REQUIREMENTS)));
assert.deepEqual(billingContract.cp384_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP384_NO_WRITE_ATTESTATION)));
assert.equal(cp384Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp384Hermes.production_ready_candidate, true);
assert.equal(cp384Claude.review_packet, "C12.CP00-384.billing_core_p07_permission_fixture_slice_descriptor");
assert.equal(cp384Claude.read_only, true);
assert.equal(cp384Handoff.to_pack_id, "CP00-385");
assert.equal(cp384Handoff.next_subphase_id, "RP12.P07.M06.S03");
assert.equal(BILLING_CORE_CP384_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP384_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp385Coverage.valid, true, cp385Coverage.errors.join("; "));
assert.equal(cp385Coverage.summary.unit_count, 150);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P07.M06"], 20);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P07.M07"], 22);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P07.M08"], 22);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P07.M09"], 22);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P07.M10"], 20);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P08.M00"], 10);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P08.M01"], 20);
assert.equal(cp385Coverage.summary.by_micro_phase["RP12.P08.M02"], 14);
assert.equal(cp385Slice.valid, true, cp385Slice.errors.join("; "));
assert.equal(cp385CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp385CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-385 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp385Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp385_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP385_REQUIREMENTS)));
assert.deepEqual(billingContract.cp385_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP385_NO_WRITE_ATTESTATION)));
assert.equal(cp385Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp385Hermes.production_ready_candidate, true);
assert.equal(cp385Claude.review_packet, "C12.CP00-385.billing_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp385Claude.read_only, true);
assert.equal(cp385Handoff.to_pack_id, "CP00-386");
assert.equal(cp385Handoff.next_subphase_id, "RP12.P08.M02.S15");
assert.equal(BILLING_CORE_CP385_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP385_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp386Coverage.valid, true, cp386Coverage.errors.join("; "));
assert.equal(cp386Coverage.summary.unit_count, 40);
assert.equal(cp386Coverage.summary.by_micro_phase["RP12.P08.M02"], 6);
assert.equal(cp386Coverage.summary.by_micro_phase["RP12.P08.M03"], 22);
assert.equal(cp386Coverage.summary.by_micro_phase["RP12.P08.M04"], 12);
assert.equal(cp386Slice.valid, true, cp386Slice.errors.join("; "));
assert.equal(cp386CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp386CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-386 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p08_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp386Descriptor)),
  "contract p08_implementation_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp386_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP386_REQUIREMENTS)));
assert.deepEqual(billingContract.cp386_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP386_NO_WRITE_ATTESTATION)));
assert.equal(cp386Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp386Hermes.production_ready_candidate, true);
assert.equal(cp386Claude.review_packet, "C12.CP00-386.billing_core_p08_implementation_slice_descriptor");
assert.equal(cp386Claude.read_only, true);
assert.equal(cp386Handoff.to_pack_id, "CP00-387");
assert.equal(cp386Handoff.next_subphase_id, "RP12.P08.M04.S13");
assert.equal(BILLING_CORE_CP386_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP386_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp387Coverage.valid, true, cp387Coverage.errors.join("; "));
assert.equal(cp387Coverage.summary.unit_count, 40);
assert.equal(cp387Coverage.summary.by_micro_phase["RP12.P08.M04"], 10);
assert.equal(cp387Coverage.summary.by_micro_phase["RP12.P08.M05"], 22);
assert.equal(cp387Coverage.summary.by_micro_phase["RP12.P08.M06"], 8);
assert.equal(cp387Slice.valid, true, cp387Slice.errors.join("; "));
assert.equal(cp387CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp387CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-387 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p08_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp387Descriptor)),
  "contract p08_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp387_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP387_REQUIREMENTS)));
assert.deepEqual(billingContract.cp387_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP387_NO_WRITE_ATTESTATION)));
assert.equal(cp387Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp387Hermes.production_ready_candidate, true);
assert.equal(cp387Claude.review_packet, "C12.CP00-387.billing_core_p08_workflow_permission_slice_descriptor");
assert.equal(cp387Claude.read_only, true);
assert.equal(cp387Handoff.to_pack_id, "CP00-388");
assert.equal(cp387Handoff.next_subphase_id, "RP12.P08.M06.S09");
assert.equal(BILLING_CORE_CP387_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP387_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp388Coverage.valid, true, cp388Coverage.errors.join("; "));
assert.equal(cp388Coverage.summary.unit_count, 150);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P08.M06"], 14);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P08.M07"], 22);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P08.M08"], 22);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P08.M09"], 20);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P08.M10"], 10);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P09.M00"], 10);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P09.M01"], 10);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P09.M02"], 20);
assert.equal(cp388Coverage.summary.by_micro_phase["RP12.P09.M03"], 22);
assert.equal(cp388Slice.valid, true, cp388Slice.errors.join("; "));
assert.equal(cp388CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp388CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-388 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp388Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(billingContract.cp388_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP388_REQUIREMENTS)));
assert.deepEqual(billingContract.cp388_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP388_NO_WRITE_ATTESTATION)));
assert.equal(cp388Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp388Hermes.production_ready_candidate, true);
assert.equal(cp388Claude.review_packet, "C12.CP00-388.billing_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp388Claude.read_only, true);
assert.equal(cp388Handoff.to_pack_id, "CP00-389");
assert.equal(cp388Handoff.next_subphase_id, "RP12.P09.M04.S01");
assert.equal(BILLING_CORE_CP388_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP388_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp389Coverage.valid, true, cp389Coverage.errors.join("; "));
assert.equal(cp389Coverage.summary.unit_count, 40);
assert.equal(cp389Coverage.summary.by_micro_phase["RP12.P09.M04"], 20);
assert.equal(cp389Coverage.summary.by_micro_phase["RP12.P09.M05"], 20);
assert.equal(cp389Slice.valid, true, cp389Slice.errors.join("; "));
assert.equal(cp389CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp389CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-389 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p09_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp389Descriptor)),
  "contract p09_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp389_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP389_REQUIREMENTS)));
assert.deepEqual(billingContract.cp389_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP389_NO_WRITE_ATTESTATION)));
assert.equal(cp389Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp389Hermes.production_ready_candidate, true);
assert.equal(cp389Claude.review_packet, "C12.CP00-389.billing_core_p09_workflow_permission_slice_descriptor");
assert.equal(cp389Claude.read_only, true);
assert.equal(cp389Handoff.to_pack_id, "CP00-390");
assert.equal(cp389Handoff.next_subphase_id, "RP12.P09.M05.S21");
assert.equal(BILLING_CORE_CP389_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP389_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp390Coverage.valid, true, cp390Coverage.errors.join("; "));
assert.equal(cp390Coverage.summary.unit_count, 10);
assert.equal(cp390Coverage.summary.by_micro_phase["RP12.P09.M05"], 2);
assert.equal(cp390Coverage.summary.by_micro_phase["RP12.P09.M06"], 8);
assert.equal(cp390Slice.valid, true, cp390Slice.errors.join("; "));
assert.equal(cp390CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp390CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-390 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p09_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp390Descriptor)),
  "contract p09_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp390_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP390_REQUIREMENTS)));
assert.deepEqual(billingContract.cp390_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP390_NO_WRITE_ATTESTATION)));
assert.equal(cp390Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp390Hermes.production_ready_candidate, true);
assert.equal(cp390Claude.review_packet, "C12.CP00-390.billing_core_p09_permission_fixture_slice_descriptor");
assert.equal(cp390Claude.read_only, true);
assert.equal(cp390Handoff.to_pack_id, "CP00-391");
assert.equal(cp390Handoff.next_subphase_id, "RP12.P09.M06.S09");
assert.equal(BILLING_CORE_CP390_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP390_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp391Coverage.valid, true, cp391Coverage.errors.join("; "));
assert.equal(cp391Coverage.summary.unit_count, 84);
assert.equal(cp391Coverage.summary.by_micro_phase["RP12.P09.M06"], 12);
assert.equal(cp391Coverage.summary.by_micro_phase["RP12.P09.M07"], 22);
assert.equal(cp391Coverage.summary.by_micro_phase["RP12.P09.M08"], 20);
assert.equal(cp391Coverage.summary.by_micro_phase["RP12.P09.M09"], 20);
assert.equal(cp391Coverage.summary.by_micro_phase["RP12.P09.M10"], 10);
assert.equal(cp391Slice.valid, true, cp391Slice.errors.join("; "));
assert.equal(cp391CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp391CaseSet.sections[microId].rows[billingCoreRowKey(title)];
    assert.ok(row, `CP00-391 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  billingContract.p09_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp391Descriptor)),
  "contract p09_closeout_slice_descriptor drift",
);
assert.deepEqual(billingContract.cp391_requirements, JSON.parse(JSON.stringify(BILLING_CORE_CP391_REQUIREMENTS)));
assert.deepEqual(billingContract.cp391_no_write_attestation, JSON.parse(JSON.stringify(BILLING_CORE_CP391_NO_WRITE_ATTESTATION)));
assert.equal(cp391Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp391Hermes.production_ready_candidate, true);
assert.equal(cp391Claude.review_packet, "C12.CP00-391.billing_core_p09_closeout_slice_descriptor");
assert.equal(cp391Claude.read_only, true);
assert.equal(cp391Handoff.to_pack_id, "CP00-392");
assert.equal(cp391Handoff.next_subphase_id, "RP13.P00.M00.S01");
assert.equal(BILLING_CORE_CP391_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(BILLING_CORE_CP391_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(billingContract.historical_pack_bindings));
assert.equal(billingContract.historical_pack_bindings.at(-1).pack_id, "CP00-391");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp12:billing-core:validate",
      pack_id: BILLING_CORE_CP391_PACK_BINDING.pack_id,
      covered_units: cp391Coverage.summary.unit_count,
      cp390_units_preserved: cp390Coverage.summary.unit_count,
      cp389_units_preserved: cp389Coverage.summary.unit_count,
      cp388_units_preserved: cp388Coverage.summary.unit_count,
      cp387_units_preserved: cp387Coverage.summary.unit_count,
      cp386_units_preserved: cp386Coverage.summary.unit_count,
      cp385_units_preserved: cp385Coverage.summary.unit_count,
      cp384_units_preserved: cp384Coverage.summary.unit_count,
      cp383_units_preserved: cp383Coverage.summary.unit_count,
      cp382_units_preserved: cp382Coverage.summary.unit_count,
      cp381_units_preserved: cp381Coverage.summary.unit_count,
      cp380_units_preserved: cp380Coverage.summary.unit_count,
      cp379_units_preserved: cp379Coverage.summary.unit_count,
      cp378_units_preserved: cp378Coverage.summary.unit_count,
      cp377_units_preserved: cp377Coverage.summary.unit_count,
      cp376_units_preserved: cp376Coverage.summary.unit_count,
      cp375_units_preserved: cp375Coverage.summary.unit_count,
      cp374_units_preserved: cp374Coverage.summary.unit_count,
      cp373_units_preserved: cp373Coverage.summary.unit_count,
      cp372_units_preserved: cp372Coverage.summary.unit_count,
      cp371_units_preserved: cp371Coverage.summary.unit_count,
      cp370_units_preserved: cp370Coverage.summary.unit_count,
      cp369_units_preserved: cp369Coverage.summary.unit_count,
      cp368_units_preserved: cp368Coverage.summary.unit_count,
      cp367_units_preserved: cp367Coverage.summary.unit_count,
      cp366_units_preserved: cp366Coverage.summary.unit_count,
      cp365_units_preserved: cp365Coverage.summary.unit_count,
      program_id: BILLING_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp391Hermes.gate,
      claude_gate: billingContract.current_pack.claude_gate,
      source_scope_contract_foundation_pack_id: BILLING_CORE_CP365_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp364Coverage.summary.unit_count,
      next_pack_id: cp391Handoff.to_pack_id,
      production_ready_candidate: cp391Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
