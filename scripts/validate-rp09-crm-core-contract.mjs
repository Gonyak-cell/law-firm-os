import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CRM_CORE_CP299_NO_WRITE_ATTESTATION,
  CRM_CORE_CP299_PACK_BINDING,
  CRM_CORE_CP299_REQUIREMENTS,
  CRM_CORE_CP300_NO_WRITE_ATTESTATION,
  CRM_CORE_CP300_PACK_BINDING,
  CRM_CORE_CP300_REQUIREMENTS,
  CRM_CORE_CP301_NO_WRITE_ATTESTATION,
  CRM_CORE_CP301_PACK_BINDING,
  CRM_CORE_CP301_REQUIREMENTS,
  CRM_CORE_CP302_NO_WRITE_ATTESTATION,
  CRM_CORE_CP302_PACK_BINDING,
  CRM_CORE_CP302_REQUIREMENTS,
  CRM_CORE_CP303_NO_WRITE_ATTESTATION,
  CRM_CORE_CP303_PACK_BINDING,
  CRM_CORE_CP303_REQUIREMENTS,
  CRM_CORE_CP304_NO_WRITE_ATTESTATION,
  CRM_CORE_CP304_PACK_BINDING,
  CRM_CORE_CP304_REQUIREMENTS,
  CRM_CORE_CP305_NO_WRITE_ATTESTATION,
  CRM_CORE_CP305_PACK_BINDING,
  CRM_CORE_CP305_REQUIREMENTS,
  CRM_CORE_CP306_NO_WRITE_ATTESTATION,
  CRM_CORE_CP306_PACK_BINDING,
  CRM_CORE_CP306_REQUIREMENTS,
  CRM_CORE_CP307_NO_WRITE_ATTESTATION,
  CRM_CORE_CP307_PACK_BINDING,
  CRM_CORE_CP307_REQUIREMENTS,
  CRM_CORE_CP308_NO_WRITE_ATTESTATION,
  CRM_CORE_CP308_PACK_BINDING,
  CRM_CORE_CP308_REQUIREMENTS,
  CRM_CORE_CP309_NO_WRITE_ATTESTATION,
  CRM_CORE_CP309_PACK_BINDING,
  CRM_CORE_CP309_REQUIREMENTS,
  CRM_CORE_CP310_NO_WRITE_ATTESTATION,
  CRM_CORE_CP310_PACK_BINDING,
  CRM_CORE_CP310_REQUIREMENTS,
  CRM_CORE_CP311_NO_WRITE_ATTESTATION,
  CRM_CORE_CP311_PACK_BINDING,
  CRM_CORE_CP311_REQUIREMENTS,
  CRM_CORE_CP312_NO_WRITE_ATTESTATION,
  CRM_CORE_CP312_PACK_BINDING,
  CRM_CORE_CP312_REQUIREMENTS,
  CRM_CORE_CP313_NO_WRITE_ATTESTATION,
  CRM_CORE_CP313_PACK_BINDING,
  CRM_CORE_CP313_REQUIREMENTS,
  CRM_CORE_CP314_NO_WRITE_ATTESTATION,
  CRM_CORE_CP314_PACK_BINDING,
  CRM_CORE_CP314_REQUIREMENTS,
  CRM_CORE_CP315_NO_WRITE_ATTESTATION,
  CRM_CORE_CP315_PACK_BINDING,
  CRM_CORE_CP315_REQUIREMENTS,
  CRM_CORE_CP316_NO_WRITE_ATTESTATION,
  CRM_CORE_CP316_PACK_BINDING,
  CRM_CORE_CP316_REQUIREMENTS,
  CRM_CORE_CP317_NO_WRITE_ATTESTATION,
  CRM_CORE_CP317_PACK_BINDING,
  CRM_CORE_CP317_REQUIREMENTS,
  CRM_CORE_CP318_NO_WRITE_ATTESTATION,
  CRM_CORE_CP318_PACK_BINDING,
  CRM_CORE_CP318_REQUIREMENTS,
  CRM_CORE_CP319_NO_WRITE_ATTESTATION,
  CRM_CORE_CP319_PACK_BINDING,
  CRM_CORE_CP319_REQUIREMENTS,
  CRM_CORE_CP320_NO_WRITE_ATTESTATION,
  CRM_CORE_CP320_PACK_BINDING,
  CRM_CORE_CP320_REQUIREMENTS,
  CRM_CORE_PROGRAM_CONTRACT,
  createCrmCoreCp299ClaudeReviewPacket,
  createCrmCoreCp299CloseoutHandoff,
  createCrmCoreCp299HermesEvidencePacket,
  createCrmCoreCp299ScopeContractFoundationCaseSet,
  createCrmCoreCp299ScopeContractFoundationDescriptor,
  createCrmCoreCp300ClaudeReviewPacket,
  createCrmCoreCp300CloseoutHandoff,
  createCrmCoreCp300HermesEvidencePacket,
  createCrmCoreCp300P01CloseoutP02ServiceFoundationCaseSet,
  createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor,
  createCrmCoreCp301ClaudeReviewPacket,
  createCrmCoreCp301CloseoutHandoff,
  createCrmCoreCp301HermesEvidencePacket,
  createCrmCoreCp301ServiceSliceCaseSet,
  createCrmCoreCp301ServiceSliceDescriptor,
  createCrmCoreCp302ClaudeReviewPacket,
  createCrmCoreCp302CloseoutHandoff,
  createCrmCoreCp302HermesEvidencePacket,
  createCrmCoreCp302ServiceBindingSliceCaseSet,
  createCrmCoreCp302ServiceBindingSliceDescriptor,
  createCrmCoreCp303ClaudeReviewPacket,
  createCrmCoreCp303CloseoutHandoff,
  createCrmCoreCp303HermesEvidencePacket,
  createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createCrmCoreCp304ClaudeReviewPacket,
  createCrmCoreCp304CloseoutHandoff,
  createCrmCoreCp304HermesEvidencePacket,
  createCrmCoreCp304UiWorkflowSliceCaseSet,
  createCrmCoreCp304UiWorkflowSliceDescriptor,
  createCrmCoreCp305ClaudeReviewPacket,
  createCrmCoreCp305CloseoutHandoff,
  createCrmCoreCp305HermesEvidencePacket,
  createCrmCoreCp305UiBindingSliceCaseSet,
  createCrmCoreCp305UiBindingSliceDescriptor,
  createCrmCoreCp306ClaudeReviewPacket,
  createCrmCoreCp306CloseoutHandoff,
  createCrmCoreCp306HermesEvidencePacket,
  createCrmCoreCp306UiBindingTailCaseSet,
  createCrmCoreCp306UiBindingTailDescriptor,
  createCrmCoreCp307ClaudeReviewPacket,
  createCrmCoreCp307CloseoutHandoff,
  createCrmCoreCp307HermesEvidencePacket,
  createCrmCoreCp307P04CloseoutP05FixtureFoundationCaseSet,
  createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor,
  createCrmCoreCp308ClaudeReviewPacket,
  createCrmCoreCp308CloseoutHandoff,
  createCrmCoreCp308FixtureSliceCaseSet,
  createCrmCoreCp308FixtureSliceDescriptor,
  createCrmCoreCp308HermesEvidencePacket,
  createCrmCoreCp309ClaudeReviewPacket,
  createCrmCoreCp309CloseoutHandoff,
  createCrmCoreCp309FixtureBindingSliceCaseSet,
  createCrmCoreCp309FixtureBindingSliceDescriptor,
  createCrmCoreCp309HermesEvidencePacket,
  createCrmCoreCp310ClaudeReviewPacket,
  createCrmCoreCp310CloseoutHandoff,
  createCrmCoreCp310HermesEvidencePacket,
  createCrmCoreCp310P05CloseoutP06PermissionFoundationCaseSet,
  createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor,
  createCrmCoreCp311ClaudeReviewPacket,
  createCrmCoreCp311CloseoutHandoff,
  createCrmCoreCp311HermesEvidencePacket,
  createCrmCoreCp311PermissionSliceCaseSet,
  createCrmCoreCp311PermissionSliceDescriptor,
  createCrmCoreCp312ClaudeReviewPacket,
  createCrmCoreCp312CloseoutHandoff,
  createCrmCoreCp312HermesEvidencePacket,
  createCrmCoreCp312P06CloseoutP07FailureFoundationCaseSet,
  createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor,
  createCrmCoreCp313ClaudeReviewPacket,
  createCrmCoreCp313CloseoutHandoff,
  createCrmCoreCp313FailureSliceCaseSet,
  createCrmCoreCp313FailureSliceDescriptor,
  createCrmCoreCp313HermesEvidencePacket,
  createCrmCoreCp314ClaudeReviewPacket,
  createCrmCoreCp314CloseoutHandoff,
  createCrmCoreCp314FailureBindingSliceCaseSet,
  createCrmCoreCp314FailureBindingSliceDescriptor,
  createCrmCoreCp314HermesEvidencePacket,
  createCrmCoreCp315ClaudeReviewPacket,
  createCrmCoreCp315CloseoutHandoff,
  createCrmCoreCp315FailureTailSliceCaseSet,
  createCrmCoreCp315FailureTailSliceDescriptor,
  createCrmCoreCp315HermesEvidencePacket,
  createCrmCoreCp316ClaudeReviewPacket,
  createCrmCoreCp316CloseoutHandoff,
  createCrmCoreCp316FailureFixtureSliceCaseSet,
  createCrmCoreCp316FailureFixtureSliceDescriptor,
  createCrmCoreCp316HermesEvidencePacket,
  createCrmCoreCp317ClaudeReviewPacket,
  createCrmCoreCp317CloseoutHandoff,
  createCrmCoreCp317FailureHermesSliceCaseSet,
  createCrmCoreCp317FailureHermesSliceDescriptor,
  createCrmCoreCp317HermesEvidencePacket,
  createCrmCoreCp318ClaudeReviewPacket,
  createCrmCoreCp318CloseoutHandoff,
  createCrmCoreCp318HermesEvidencePacket,
  createCrmCoreCp318P07CloseoutP08HermesFoundationCaseSet,
  createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor,
  createCrmCoreCp319ClaudeReviewPacket,
  createCrmCoreCp319CloseoutHandoff,
  createCrmCoreCp319HermesEvidencePacket,
  createCrmCoreCp319P08CloseoutP09ReviewFoundationCaseSet,
  createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor,
  createCrmCoreCp320ClaudeReviewPacket,
  createCrmCoreCp320CloseoutHandoff,
  createCrmCoreCp320HermesEvidencePacket,
  createCrmCoreCp320ReviewCloseoutSliceCaseSet,
  createCrmCoreCp320ReviewCloseoutSliceDescriptor,
  crmCoreRowKey,
  validateCrmCoreCp299Coverage,
  validateCrmCoreCp299ScopeContractFoundationDescriptor,
  validateCrmCoreCp300Coverage,
  validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor,
  validateCrmCoreCp301Coverage,
  validateCrmCoreCp301ServiceSliceDescriptor,
  validateCrmCoreCp302Coverage,
  validateCrmCoreCp302ServiceBindingSliceDescriptor,
  validateCrmCoreCp303Coverage,
  validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  validateCrmCoreCp304Coverage,
  validateCrmCoreCp304UiWorkflowSliceDescriptor,
  validateCrmCoreCp305Coverage,
  validateCrmCoreCp305UiBindingSliceDescriptor,
  validateCrmCoreCp306Coverage,
  validateCrmCoreCp306UiBindingTailDescriptor,
  validateCrmCoreCp307Coverage,
  validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor,
  validateCrmCoreCp308Coverage,
  validateCrmCoreCp308FixtureSliceDescriptor,
  validateCrmCoreCp309Coverage,
  validateCrmCoreCp309FixtureBindingSliceDescriptor,
  validateCrmCoreCp310Coverage,
  validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor,
  validateCrmCoreCp311Coverage,
  validateCrmCoreCp311PermissionSliceDescriptor,
  validateCrmCoreCp312Coverage,
  validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor,
  validateCrmCoreCp313Coverage,
  validateCrmCoreCp313FailureSliceDescriptor,
  validateCrmCoreCp314Coverage,
  validateCrmCoreCp314FailureBindingSliceDescriptor,
  validateCrmCoreCp315Coverage,
  validateCrmCoreCp315FailureTailSliceDescriptor,
  validateCrmCoreCp316Coverage,
  validateCrmCoreCp316FailureFixtureSliceDescriptor,
  validateCrmCoreCp317Coverage,
  validateCrmCoreCp317FailureHermesSliceDescriptor,
  validateCrmCoreCp318Coverage,
  validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor,
  validateCrmCoreCp319Coverage,
  validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor,
  validateCrmCoreCp320Coverage,
  validateCrmCoreCp320ReviewCloseoutSliceDescriptor,
} from "../packages/crm/src/index.js";

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

const crmContract = await readJson("../contracts/crm-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp299Manifest = await readOptionalJson("../docs/closeout-packs/cp00-299/manifest.json");
const cp300Manifest = await readOptionalJson("../docs/closeout-packs/cp00-300/manifest.json");
const cp301Manifest = await readOptionalJson("../docs/closeout-packs/cp00-301/manifest.json");
const cp302Manifest = await readOptionalJson("../docs/closeout-packs/cp00-302/manifest.json");
const cp303Manifest = await readOptionalJson("../docs/closeout-packs/cp00-303/manifest.json");
const cp304Manifest = await readOptionalJson("../docs/closeout-packs/cp00-304/manifest.json");
const cp305Manifest = await readOptionalJson("../docs/closeout-packs/cp00-305/manifest.json");
const cp306Manifest = await readOptionalJson("../docs/closeout-packs/cp00-306/manifest.json");
const cp307Manifest = await readOptionalJson("../docs/closeout-packs/cp00-307/manifest.json");
const cp308Manifest = await readOptionalJson("../docs/closeout-packs/cp00-308/manifest.json");
const cp309Manifest = await readOptionalJson("../docs/closeout-packs/cp00-309/manifest.json");
const cp310Manifest = await readOptionalJson("../docs/closeout-packs/cp00-310/manifest.json");
const cp311Manifest = await readOptionalJson("../docs/closeout-packs/cp00-311/manifest.json");
const cp312Manifest = await readOptionalJson("../docs/closeout-packs/cp00-312/manifest.json");
const cp313Manifest = await readOptionalJson("../docs/closeout-packs/cp00-313/manifest.json");
const cp314Manifest = await readOptionalJson("../docs/closeout-packs/cp00-314/manifest.json");
const cp315Manifest = await readOptionalJson("../docs/closeout-packs/cp00-315/manifest.json");
const cp316Manifest = await readOptionalJson("../docs/closeout-packs/cp00-316/manifest.json");
const cp317Manifest = await readOptionalJson("../docs/closeout-packs/cp00-317/manifest.json");
const cp318Manifest = await readOptionalJson("../docs/closeout-packs/cp00-318/manifest.json");
const cp319Manifest = await readOptionalJson("../docs/closeout-packs/cp00-319/manifest.json");
const cp320Manifest = await readOptionalJson("../docs/closeout-packs/cp00-320/manifest.json");
const cp299PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-299") ?? cp299Manifest?.plan_binding_snapshot;
const cp300PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-300") ?? cp300Manifest?.plan_binding_snapshot;
const cp301PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-301") ?? cp301Manifest?.plan_binding_snapshot;
const cp302PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-302") ?? cp302Manifest?.plan_binding_snapshot;
const cp303PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-303") ?? cp303Manifest?.plan_binding_snapshot;
const cp304PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-304") ?? cp304Manifest?.plan_binding_snapshot;
const cp305PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-305") ?? cp305Manifest?.plan_binding_snapshot;
const cp306PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-306") ?? cp306Manifest?.plan_binding_snapshot;
const cp307PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-307") ?? cp307Manifest?.plan_binding_snapshot;
const cp308PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-308") ?? cp308Manifest?.plan_binding_snapshot;
const cp309PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-309") ?? cp309Manifest?.plan_binding_snapshot;
const cp310PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-310") ?? cp310Manifest?.plan_binding_snapshot;
const cp311PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-311") ?? cp311Manifest?.plan_binding_snapshot;
const cp312PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-312") ?? cp312Manifest?.plan_binding_snapshot;
const cp313PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-313") ?? cp313Manifest?.plan_binding_snapshot;
const cp314PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-314") ?? cp314Manifest?.plan_binding_snapshot;
const cp315PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-315") ?? cp315Manifest?.plan_binding_snapshot;
const cp316PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-316") ?? cp316Manifest?.plan_binding_snapshot;
const cp317PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-317") ?? cp317Manifest?.plan_binding_snapshot;
const cp318PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-318") ?? cp318Manifest?.plan_binding_snapshot;
const cp319PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-319") ?? cp319Manifest?.plan_binding_snapshot;
const cp320PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-320") ?? cp320Manifest?.plan_binding_snapshot;

assert.equal(crmContract.schema_version, "law-firm-os.crm-core-contract.v0.1");
assert.equal(crmContract.program.program_id, "RP09");
assert.equal(crmContract.program.program_title, "CRM And Business Development");
assert.equal(crmContract.program.upstream_program_id, "RP08");
assert.equal(crmContract.program.hermes_gate, "H09");
assert.equal(crmContract.program.claude_gate, "C09");
assert.equal(crmContract.program.descriptor_only, true);
assert.deepEqual(crmContract.program, JSON.parse(JSON.stringify(CRM_CORE_PROGRAM_CONTRACT)));
assert.equal(crmContract.current_pack.pack_id, "CP00-320");
assert.equal(crmContract.program.current_pack_id, "CP00-320");
assert.deepEqual(crmContract.current_pack, JSON.parse(JSON.stringify(CRM_CORE_CP320_PACK_BINDING)));
assert.deepEqual(crmContract.no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP320_NO_WRITE_ATTESTATION)));

assert.ok(cp299PlanPack, "CP00-299 must exist in closeout-pack-plan.json");
assert.equal(cp299PlanPack.unit_count, CRM_CORE_CP299_PACK_BINDING.unit_count, "CP00-299 unit count drift");
assert.ok(cp300PlanPack, "CP00-300 must exist in closeout-pack-plan.json");
assert.equal(cp300PlanPack.unit_count, CRM_CORE_CP300_PACK_BINDING.unit_count, "CP00-300 unit count drift");
assert.ok(cp301PlanPack, "CP00-301 must exist in closeout-pack-plan.json");
assert.equal(cp301PlanPack.unit_count, CRM_CORE_CP301_PACK_BINDING.unit_count, "CP00-301 unit count drift");
assert.ok(cp302PlanPack, "CP00-302 must exist in closeout-pack-plan.json");
assert.equal(cp302PlanPack.unit_count, CRM_CORE_CP302_PACK_BINDING.unit_count, "CP00-302 unit count drift");
assert.ok(cp303PlanPack, "CP00-303 must exist in closeout-pack-plan.json");
assert.equal(cp303PlanPack.unit_count, CRM_CORE_CP303_PACK_BINDING.unit_count, "CP00-303 unit count drift");
assert.ok(cp304PlanPack, "CP00-304 must exist in closeout-pack-plan.json");
assert.equal(cp304PlanPack.unit_count, CRM_CORE_CP304_PACK_BINDING.unit_count, "CP00-304 unit count drift");
assert.ok(cp305PlanPack, "CP00-305 must exist in closeout-pack-plan.json");
assert.equal(cp305PlanPack.unit_count, CRM_CORE_CP305_PACK_BINDING.unit_count, "CP00-305 unit count drift");
assert.ok(cp306PlanPack, "CP00-306 must exist in closeout-pack-plan.json");
assert.equal(cp306PlanPack.unit_count, CRM_CORE_CP306_PACK_BINDING.unit_count, "CP00-306 unit count drift");
assert.ok(cp307PlanPack, "CP00-307 must exist in closeout-pack-plan.json");
assert.equal(cp307PlanPack.unit_count, CRM_CORE_CP307_PACK_BINDING.unit_count, "CP00-307 unit count drift");
assert.ok(cp308PlanPack, "CP00-308 must exist in closeout-pack-plan.json");
assert.equal(cp308PlanPack.unit_count, CRM_CORE_CP308_PACK_BINDING.unit_count, "CP00-308 unit count drift");
assert.ok(cp309PlanPack, "CP00-309 must exist in closeout-pack-plan.json");
assert.equal(cp309PlanPack.unit_count, CRM_CORE_CP309_PACK_BINDING.unit_count, "CP00-309 unit count drift");
assert.ok(cp310PlanPack, "CP00-310 must exist in closeout-pack-plan.json");
assert.equal(cp310PlanPack.unit_count, CRM_CORE_CP310_PACK_BINDING.unit_count, "CP00-310 unit count drift");
assert.ok(cp311PlanPack, "CP00-311 must exist in closeout-pack-plan.json");
assert.equal(cp311PlanPack.unit_count, CRM_CORE_CP311_PACK_BINDING.unit_count, "CP00-311 unit count drift");
assert.ok(cp312PlanPack, "CP00-312 must exist in closeout-pack-plan.json");
assert.equal(cp312PlanPack.unit_count, CRM_CORE_CP312_PACK_BINDING.unit_count, "CP00-312 unit count drift");
assert.ok(cp313PlanPack, "CP00-313 must exist in closeout-pack-plan.json");
assert.equal(cp313PlanPack.unit_count, CRM_CORE_CP313_PACK_BINDING.unit_count, "CP00-313 unit count drift");
assert.ok(cp314PlanPack, "CP00-314 must exist in closeout-pack-plan.json");
assert.equal(cp314PlanPack.unit_count, CRM_CORE_CP314_PACK_BINDING.unit_count, "CP00-314 unit count drift");
assert.ok(cp315PlanPack, "CP00-315 must exist in closeout-pack-plan.json");
assert.equal(cp315PlanPack.unit_count, CRM_CORE_CP315_PACK_BINDING.unit_count, "CP00-315 unit count drift");
assert.ok(cp316PlanPack, "CP00-316 must exist in closeout-pack-plan.json");
assert.equal(cp316PlanPack.unit_count, CRM_CORE_CP316_PACK_BINDING.unit_count, "CP00-316 unit count drift");
assert.ok(cp317PlanPack, "CP00-317 must exist in closeout-pack-plan.json");
assert.equal(cp317PlanPack.unit_count, CRM_CORE_CP317_PACK_BINDING.unit_count, "CP00-317 unit count drift");
assert.ok(cp318PlanPack, "CP00-318 must exist in closeout-pack-plan.json");
assert.equal(cp318PlanPack.unit_count, CRM_CORE_CP318_PACK_BINDING.unit_count, "CP00-318 unit count drift");
assert.ok(cp319PlanPack, "CP00-319 must exist in closeout-pack-plan.json");
assert.equal(cp319PlanPack.unit_count, CRM_CORE_CP319_PACK_BINDING.unit_count, "CP00-319 unit count drift");
assert.ok(cp320PlanPack, "CP00-320 must exist in closeout-pack-plan.json");
assert.equal(cp320PlanPack.unit_count, CRM_CORE_CP320_PACK_BINDING.unit_count, "CP00-320 unit count drift");

const cp299Coverage = validateCrmCoreCp299Coverage(cp299PlanPack);
const cp299Descriptor = createCrmCoreCp299ScopeContractFoundationDescriptor();
const cp299CaseSet = createCrmCoreCp299ScopeContractFoundationCaseSet();
const cp299Foundation = validateCrmCoreCp299ScopeContractFoundationDescriptor(cp299Descriptor, crmContract);
const cp299Hermes = createCrmCoreCp299HermesEvidencePacket(cp299PlanPack, crmContract, cp299Descriptor);
const cp299Claude = createCrmCoreCp299ClaudeReviewPacket(cp299PlanPack);
const cp299Handoff = createCrmCoreCp299CloseoutHandoff();
const cp300Coverage = validateCrmCoreCp300Coverage(cp300PlanPack);
const cp300Descriptor = createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor();
const cp300CaseSet = createCrmCoreCp300P01CloseoutP02ServiceFoundationCaseSet();
const cp300Foundation = validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(cp300Descriptor, crmContract);
const cp300Hermes = createCrmCoreCp300HermesEvidencePacket(cp300PlanPack, crmContract, cp300Descriptor);
const cp300Claude = createCrmCoreCp300ClaudeReviewPacket(cp300PlanPack);
const cp300Handoff = createCrmCoreCp300CloseoutHandoff();
const cp301Coverage = validateCrmCoreCp301Coverage(cp301PlanPack);
const cp301Descriptor = createCrmCoreCp301ServiceSliceDescriptor();
const cp301CaseSet = createCrmCoreCp301ServiceSliceCaseSet();
const cp301Slice = validateCrmCoreCp301ServiceSliceDescriptor(cp301Descriptor, crmContract);
const cp301Hermes = createCrmCoreCp301HermesEvidencePacket(cp301PlanPack, crmContract, cp301Descriptor);
const cp301Claude = createCrmCoreCp301ClaudeReviewPacket(cp301PlanPack);
const cp301Handoff = createCrmCoreCp301CloseoutHandoff();
const cp302Coverage = validateCrmCoreCp302Coverage(cp302PlanPack);
const cp302Descriptor = createCrmCoreCp302ServiceBindingSliceDescriptor();
const cp302CaseSet = createCrmCoreCp302ServiceBindingSliceCaseSet();
const cp302Slice = validateCrmCoreCp302ServiceBindingSliceDescriptor(cp302Descriptor, crmContract);
const cp302Hermes = createCrmCoreCp302HermesEvidencePacket(cp302PlanPack, crmContract, cp302Descriptor);
const cp302Claude = createCrmCoreCp302ClaudeReviewPacket(cp302PlanPack);
const cp302Handoff = createCrmCoreCp302CloseoutHandoff();
const cp303Coverage = validateCrmCoreCp303Coverage(cp303PlanPack);
const cp303Descriptor = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor();
const cp303CaseSet = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationCaseSet();
const cp303Foundation = validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(cp303Descriptor, crmContract);
const cp303Hermes = createCrmCoreCp303HermesEvidencePacket(cp303PlanPack, crmContract, cp303Descriptor);
const cp303Claude = createCrmCoreCp303ClaudeReviewPacket(cp303PlanPack);
const cp303Handoff = createCrmCoreCp303CloseoutHandoff();
const cp304Coverage = validateCrmCoreCp304Coverage(cp304PlanPack);
const cp304Descriptor = createCrmCoreCp304UiWorkflowSliceDescriptor();
const cp304CaseSet = createCrmCoreCp304UiWorkflowSliceCaseSet();
const cp304Slice = validateCrmCoreCp304UiWorkflowSliceDescriptor(cp304Descriptor, crmContract);
const cp304Hermes = createCrmCoreCp304HermesEvidencePacket(cp304PlanPack, crmContract, cp304Descriptor);
const cp304Claude = createCrmCoreCp304ClaudeReviewPacket(cp304PlanPack);
const cp304Handoff = createCrmCoreCp304CloseoutHandoff();
const cp305Coverage = validateCrmCoreCp305Coverage(cp305PlanPack);
const cp305Descriptor = createCrmCoreCp305UiBindingSliceDescriptor();
const cp305CaseSet = createCrmCoreCp305UiBindingSliceCaseSet();
const cp305Slice = validateCrmCoreCp305UiBindingSliceDescriptor(cp305Descriptor, crmContract);
const cp305Hermes = createCrmCoreCp305HermesEvidencePacket(cp305PlanPack, crmContract, cp305Descriptor);
const cp305Claude = createCrmCoreCp305ClaudeReviewPacket(cp305PlanPack);
const cp305Handoff = createCrmCoreCp305CloseoutHandoff();
const cp306Coverage = validateCrmCoreCp306Coverage(cp306PlanPack);
const cp306Descriptor = createCrmCoreCp306UiBindingTailDescriptor();
const cp306CaseSet = createCrmCoreCp306UiBindingTailCaseSet();
const cp306Tail = validateCrmCoreCp306UiBindingTailDescriptor(cp306Descriptor, crmContract);
const cp306Hermes = createCrmCoreCp306HermesEvidencePacket(cp306PlanPack, crmContract, cp306Descriptor);
const cp306Claude = createCrmCoreCp306ClaudeReviewPacket(cp306PlanPack);
const cp306Handoff = createCrmCoreCp306CloseoutHandoff();
const cp307Coverage = validateCrmCoreCp307Coverage(cp307PlanPack);
const cp307Descriptor = createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor();
const cp307CaseSet = createCrmCoreCp307P04CloseoutP05FixtureFoundationCaseSet();
const cp307Foundation = validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(cp307Descriptor, crmContract);
const cp307Hermes = createCrmCoreCp307HermesEvidencePacket(cp307PlanPack, crmContract, cp307Descriptor);
const cp307Claude = createCrmCoreCp307ClaudeReviewPacket(cp307PlanPack);
const cp307Handoff = createCrmCoreCp307CloseoutHandoff();
const cp308Coverage = validateCrmCoreCp308Coverage(cp308PlanPack);
const cp308Descriptor = createCrmCoreCp308FixtureSliceDescriptor();
const cp308CaseSet = createCrmCoreCp308FixtureSliceCaseSet();
const cp308Slice = validateCrmCoreCp308FixtureSliceDescriptor(cp308Descriptor, crmContract);
const cp308Hermes = createCrmCoreCp308HermesEvidencePacket(cp308PlanPack, crmContract, cp308Descriptor);
const cp308Claude = createCrmCoreCp308ClaudeReviewPacket(cp308PlanPack);
const cp308Handoff = createCrmCoreCp308CloseoutHandoff();
const cp309Coverage = validateCrmCoreCp309Coverage(cp309PlanPack);
const cp309Descriptor = createCrmCoreCp309FixtureBindingSliceDescriptor();
const cp309CaseSet = createCrmCoreCp309FixtureBindingSliceCaseSet();
const cp309Slice = validateCrmCoreCp309FixtureBindingSliceDescriptor(cp309Descriptor, crmContract);
const cp309Hermes = createCrmCoreCp309HermesEvidencePacket(cp309PlanPack, crmContract, cp309Descriptor);
const cp309Claude = createCrmCoreCp309ClaudeReviewPacket(cp309PlanPack);
const cp309Handoff = createCrmCoreCp309CloseoutHandoff();
const cp310Coverage = validateCrmCoreCp310Coverage(cp310PlanPack);
const cp310Descriptor = createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor();
const cp310CaseSet = createCrmCoreCp310P05CloseoutP06PermissionFoundationCaseSet();
const cp310Foundation = validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(cp310Descriptor, crmContract);
const cp310Hermes = createCrmCoreCp310HermesEvidencePacket(cp310PlanPack, crmContract, cp310Descriptor);
const cp310Claude = createCrmCoreCp310ClaudeReviewPacket(cp310PlanPack);
const cp310Handoff = createCrmCoreCp310CloseoutHandoff();
const cp311Coverage = validateCrmCoreCp311Coverage(cp311PlanPack);
const cp311Descriptor = createCrmCoreCp311PermissionSliceDescriptor();
const cp311CaseSet = createCrmCoreCp311PermissionSliceCaseSet();
const cp311Slice = validateCrmCoreCp311PermissionSliceDescriptor(cp311Descriptor, crmContract);
const cp311Hermes = createCrmCoreCp311HermesEvidencePacket(cp311PlanPack, crmContract, cp311Descriptor);
const cp311Claude = createCrmCoreCp311ClaudeReviewPacket(cp311PlanPack);
const cp311Handoff = createCrmCoreCp311CloseoutHandoff();
const cp312Coverage = validateCrmCoreCp312Coverage(cp312PlanPack);
const cp312Descriptor = createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor();
const cp312CaseSet = createCrmCoreCp312P06CloseoutP07FailureFoundationCaseSet();
const cp312Foundation = validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(cp312Descriptor, crmContract);
const cp312Hermes = createCrmCoreCp312HermesEvidencePacket(cp312PlanPack, crmContract, cp312Descriptor);
const cp312Claude = createCrmCoreCp312ClaudeReviewPacket(cp312PlanPack);
const cp312Handoff = createCrmCoreCp312CloseoutHandoff();
const cp313Coverage = validateCrmCoreCp313Coverage(cp313PlanPack);
const cp313Descriptor = createCrmCoreCp313FailureSliceDescriptor();
const cp313CaseSet = createCrmCoreCp313FailureSliceCaseSet();
const cp313Slice = validateCrmCoreCp313FailureSliceDescriptor(cp313Descriptor, crmContract);
const cp313Hermes = createCrmCoreCp313HermesEvidencePacket(cp313PlanPack, crmContract, cp313Descriptor);
const cp313Claude = createCrmCoreCp313ClaudeReviewPacket(cp313PlanPack);
const cp313Handoff = createCrmCoreCp313CloseoutHandoff();
const cp314Coverage = validateCrmCoreCp314Coverage(cp314PlanPack);
const cp314Descriptor = createCrmCoreCp314FailureBindingSliceDescriptor();
const cp314CaseSet = createCrmCoreCp314FailureBindingSliceCaseSet();
const cp314Slice = validateCrmCoreCp314FailureBindingSliceDescriptor(cp314Descriptor, crmContract);
const cp314Hermes = createCrmCoreCp314HermesEvidencePacket(cp314PlanPack, crmContract, cp314Descriptor);
const cp314Claude = createCrmCoreCp314ClaudeReviewPacket(cp314PlanPack);
const cp314Handoff = createCrmCoreCp314CloseoutHandoff();
const cp315Coverage = validateCrmCoreCp315Coverage(cp315PlanPack);
const cp315Descriptor = createCrmCoreCp315FailureTailSliceDescriptor();
const cp315CaseSet = createCrmCoreCp315FailureTailSliceCaseSet();
const cp315Slice = validateCrmCoreCp315FailureTailSliceDescriptor(cp315Descriptor, crmContract);
const cp315Hermes = createCrmCoreCp315HermesEvidencePacket(cp315PlanPack, crmContract, cp315Descriptor);
const cp315Claude = createCrmCoreCp315ClaudeReviewPacket(cp315PlanPack);
const cp315Handoff = createCrmCoreCp315CloseoutHandoff();
const cp316Coverage = validateCrmCoreCp316Coverage(cp316PlanPack);
const cp316Descriptor = createCrmCoreCp316FailureFixtureSliceDescriptor();
const cp316CaseSet = createCrmCoreCp316FailureFixtureSliceCaseSet();
const cp316Slice = validateCrmCoreCp316FailureFixtureSliceDescriptor(cp316Descriptor, crmContract);
const cp316Hermes = createCrmCoreCp316HermesEvidencePacket(cp316PlanPack, crmContract, cp316Descriptor);
const cp316Claude = createCrmCoreCp316ClaudeReviewPacket(cp316PlanPack);
const cp316Handoff = createCrmCoreCp316CloseoutHandoff();
const cp317Coverage = validateCrmCoreCp317Coverage(cp317PlanPack);
const cp317Descriptor = createCrmCoreCp317FailureHermesSliceDescriptor();
const cp317CaseSet = createCrmCoreCp317FailureHermesSliceCaseSet();
const cp317Slice = validateCrmCoreCp317FailureHermesSliceDescriptor(cp317Descriptor, crmContract);
const cp317Hermes = createCrmCoreCp317HermesEvidencePacket(cp317PlanPack, crmContract, cp317Descriptor);
const cp317Claude = createCrmCoreCp317ClaudeReviewPacket(cp317PlanPack);
const cp317Handoff = createCrmCoreCp317CloseoutHandoff();
const cp318Coverage = validateCrmCoreCp318Coverage(cp318PlanPack);
const cp318Descriptor = createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor();
const cp318CaseSet = createCrmCoreCp318P07CloseoutP08HermesFoundationCaseSet();
const cp318Foundation = validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(cp318Descriptor, crmContract);
const cp318Hermes = createCrmCoreCp318HermesEvidencePacket(cp318PlanPack, crmContract, cp318Descriptor);
const cp318Claude = createCrmCoreCp318ClaudeReviewPacket(cp318PlanPack);
const cp318Handoff = createCrmCoreCp318CloseoutHandoff();
const cp319Coverage = validateCrmCoreCp319Coverage(cp319PlanPack);
const cp319Descriptor = createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor();
const cp319CaseSet = createCrmCoreCp319P08CloseoutP09ReviewFoundationCaseSet();
const cp319Foundation = validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(cp319Descriptor, crmContract);
const cp319Hermes = createCrmCoreCp319HermesEvidencePacket(cp319PlanPack, crmContract, cp319Descriptor);
const cp319Claude = createCrmCoreCp319ClaudeReviewPacket(cp319PlanPack);
const cp319Handoff = createCrmCoreCp319CloseoutHandoff();
const cp320Coverage = validateCrmCoreCp320Coverage(cp320PlanPack);
const cp320Descriptor = createCrmCoreCp320ReviewCloseoutSliceDescriptor();
const cp320CaseSet = createCrmCoreCp320ReviewCloseoutSliceCaseSet();
const cp320Slice = validateCrmCoreCp320ReviewCloseoutSliceDescriptor(cp320Descriptor, crmContract);
const cp320Hermes = createCrmCoreCp320HermesEvidencePacket(cp320PlanPack, crmContract, cp320Descriptor);
const cp320Claude = createCrmCoreCp320ClaudeReviewPacket(cp320PlanPack);
const cp320Handoff = createCrmCoreCp320CloseoutHandoff();

assert.equal(cp299Coverage.valid, true, cp299Coverage.errors.join("; "));
assert.equal(cp299Coverage.summary.unit_count, 150);
assert.equal(cp299Coverage.summary.by_phase["RP09.P00"], 52);
assert.equal(cp299Coverage.summary.by_phase["RP09.P01"], 98);
assert.equal(cp299Foundation.valid, true, cp299Foundation.errors.join("; "));
assert.equal(cp299CaseSet.section_count, 20);
for (const [microId, titles] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp299CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-299 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp299Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp299_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP299_REQUIREMENTS)));
assert.deepEqual(crmContract.cp299_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP299_NO_WRITE_ATTESTATION)));
assert.equal(cp299Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp299Hermes.production_ready_candidate, true);
assert.equal(cp299Claude.review_packet, "C09.CP00-299.crm_core_scope_contract_foundation_descriptor");
assert.equal(cp299Claude.read_only, true);
assert.equal(cp299Handoff.to_pack_id, "CP00-300");
assert.equal(cp299Handoff.next_subphase_id, "RP09.P01.M08.S06");
assert.equal(cp300Coverage.valid, true, cp300Coverage.errors.join("; "));
assert.equal(cp300Coverage.summary.unit_count, 150);
assert.equal(cp300Coverage.summary.by_phase["RP09.P01"], 14);
assert.equal(cp300Coverage.summary.by_phase["RP09.P02"], 136);
assert.equal(cp300Foundation.valid, true, cp300Foundation.errors.join("; "));
assert.equal(cp300CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp300CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-300 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p01_closeout_p02_service_foundation_descriptor,
  JSON.parse(JSON.stringify(cp300Descriptor)),
  "contract p01_closeout_p02_service_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp300_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP300_REQUIREMENTS)));
assert.deepEqual(crmContract.cp300_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP300_NO_WRITE_ATTESTATION)));
assert.equal(cp300Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp300Hermes.production_ready_candidate, true);
assert.equal(cp300Claude.review_packet, "C09.CP00-300.crm_core_p01_closeout_p02_service_foundation_descriptor");
assert.equal(cp300Claude.read_only, true);
assert.equal(cp300Handoff.to_pack_id, "CP00-301");
assert.equal(cp300Handoff.next_subphase_id, "RP09.P02.M07.S11");
assert.equal(cp301Coverage.valid, true, cp301Coverage.errors.join("; "));
assert.equal(cp301Coverage.summary.unit_count, 10);
assert.equal(cp301Coverage.summary.by_micro_phase["RP09.P02.M07"], 10);
assert.equal(cp301Slice.valid, true, cp301Slice.errors.join("; "));
assert.equal(cp301CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp301CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-301 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.service_slice_descriptor,
  JSON.parse(JSON.stringify(cp301Descriptor)),
  "contract service_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp301_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP301_REQUIREMENTS)));
assert.deepEqual(crmContract.cp301_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP301_NO_WRITE_ATTESTATION)));
assert.equal(cp301Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp301Hermes.production_ready_candidate, true);
assert.equal(cp301Claude.review_packet, "C09.CP00-301.crm_core_service_slice_descriptor");
assert.equal(cp301Claude.read_only, true);
assert.equal(cp301Handoff.to_pack_id, "CP00-302");
assert.equal(cp301Handoff.next_subphase_id, "RP09.P02.M07.S21");
assert.equal(cp302Coverage.valid, true, cp302Coverage.errors.join("; "));
assert.equal(cp302Coverage.summary.unit_count, 40);
assert.equal(cp302Coverage.summary.by_micro_phase["RP09.P02.M08"], 20);
assert.equal(cp302Slice.valid, true, cp302Slice.errors.join("; "));
assert.equal(cp302CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp302CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-302 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.service_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp302Descriptor)),
  "contract service_binding_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp302_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP302_REQUIREMENTS)));
assert.deepEqual(crmContract.cp302_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP302_NO_WRITE_ATTESTATION)));
assert.equal(cp302Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp302Hermes.production_ready_candidate, true);
assert.equal(cp302Claude.review_packet, "C09.CP00-302.crm_core_service_binding_slice_descriptor");
assert.equal(cp302Claude.read_only, true);
assert.equal(cp302Handoff.to_pack_id, "CP00-303");
assert.equal(cp302Handoff.next_subphase_id, "RP09.P02.M09.S19");
assert.equal(cp303Coverage.valid, true, cp303Coverage.errors.join("; "));
assert.equal(cp303Coverage.summary.unit_count, 150);
assert.equal(cp303Coverage.summary.by_phase["RP09.P02"], 13);
assert.equal(cp303Coverage.summary.by_phase["RP09.P03"], 112);
assert.equal(cp303Coverage.summary.by_phase["RP09.P04"], 25);
assert.equal(cp303Foundation.valid, true, cp303Foundation.errors.join("; "));
assert.equal(cp303CaseSet.section_count, 17);
for (const [microId, titles] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp303CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-303 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p02_closeout_p03_interface_p04_ui_foundation_descriptor,
  JSON.parse(JSON.stringify(cp303Descriptor)),
  "contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp303_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP303_REQUIREMENTS)));
assert.deepEqual(crmContract.cp303_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP303_NO_WRITE_ATTESTATION)));
assert.equal(cp303Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp303Hermes.production_ready_candidate, true);
assert.equal(cp303Claude.review_packet, "C09.CP00-303.crm_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor");
assert.equal(cp303Claude.read_only, true);
assert.equal(cp303Handoff.to_pack_id, "CP00-304");
assert.equal(cp303Handoff.next_subphase_id, "RP09.P04.M03.S06");
assert.equal(cp304Coverage.valid, true, cp304Coverage.errors.join("; "));
assert.equal(cp304Coverage.summary.unit_count, 40);
assert.equal(cp304Coverage.summary.by_micro_phase["RP09.P04.M04"], 20);
assert.equal(cp304Slice.valid, true, cp304Slice.errors.join("; "));
assert.equal(cp304CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp304CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-304 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.ui_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp304Descriptor)),
  "contract ui_workflow_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp304_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP304_REQUIREMENTS)));
assert.deepEqual(crmContract.cp304_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP304_NO_WRITE_ATTESTATION)));
assert.equal(cp304Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp304Hermes.production_ready_candidate, true);
assert.equal(cp304Claude.review_packet, "C09.CP00-304.crm_core_ui_workflow_slice_descriptor");
assert.equal(cp304Claude.read_only, true);
assert.equal(cp304Handoff.to_pack_id, "CP00-305");
assert.equal(cp304Handoff.next_subphase_id, "RP09.P04.M05.S06");
assert.equal(cp305Coverage.valid, true, cp305Coverage.errors.join("; "));
assert.equal(cp305Coverage.summary.unit_count, 10);
assert.equal(cp305Coverage.summary.by_micro_phase["RP09.P04.M05"], 10);
assert.equal(cp305Slice.valid, true, cp305Slice.errors.join("; "));
assert.equal(cp305CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp305CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-305 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.ui_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp305Descriptor)),
  "contract ui_binding_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp305_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP305_REQUIREMENTS)));
assert.deepEqual(crmContract.cp305_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP305_NO_WRITE_ATTESTATION)));
assert.equal(cp305Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp305Hermes.production_ready_candidate, true);
assert.equal(cp305Claude.review_packet, "C09.CP00-305.crm_core_ui_binding_slice_descriptor");
assert.equal(cp305Claude.read_only, true);
assert.equal(cp305Handoff.to_pack_id, "CP00-306");
assert.equal(cp305Handoff.next_subphase_id, "RP09.P04.M05.S16");
assert.equal(cp306Coverage.valid, true, cp306Coverage.errors.join("; "));
assert.equal(cp306Coverage.summary.unit_count, 10);
assert.equal(cp306Coverage.summary.by_micro_phase["RP09.P04.M06"], 5);
assert.equal(cp306Tail.valid, true, cp306Tail.errors.join("; "));
assert.equal(cp306CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp306CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-306 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.ui_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp306Descriptor)),
  "contract ui_binding_tail_descriptor drift",
);
assert.deepEqual(crmContract.cp306_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP306_REQUIREMENTS)));
assert.deepEqual(crmContract.cp306_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP306_NO_WRITE_ATTESTATION)));
assert.equal(cp306Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp306Hermes.production_ready_candidate, true);
assert.equal(cp306Claude.review_packet, "C09.CP00-306.crm_core_ui_binding_tail_descriptor");
assert.equal(cp306Claude.read_only, true);
assert.equal(cp306Handoff.to_pack_id, "CP00-307");
assert.equal(cp306Handoff.next_subphase_id, "RP09.P04.M06.S06");
assert.equal(cp307Coverage.valid, true, cp307Coverage.errors.join("; "));
assert.equal(cp307Coverage.summary.unit_count, 150);
assert.equal(cp307Coverage.summary.by_phase["RP09.P04"], 83);
assert.equal(cp307Coverage.summary.by_phase["RP09.P05"], 67);
assert.equal(cp307Foundation.valid, true, cp307Foundation.errors.join("; "));
assert.equal(cp307CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp307CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-307 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p04_closeout_p05_fixture_foundation_descriptor,
  JSON.parse(JSON.stringify(cp307Descriptor)),
  "contract p04_closeout_p05_fixture_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp307_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP307_REQUIREMENTS)));
assert.deepEqual(crmContract.cp307_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP307_NO_WRITE_ATTESTATION)));
assert.equal(cp307Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp307Hermes.production_ready_candidate, true);
assert.equal(cp307Claude.review_packet, "C09.CP00-307.crm_core_p04_closeout_p05_fixture_foundation_descriptor");
assert.equal(cp307Claude.read_only, true);
assert.equal(cp307Handoff.to_pack_id, "CP00-308");
assert.equal(cp307Handoff.next_subphase_id, "RP09.P05.M05.S08");
assert.equal(cp308Coverage.valid, true, cp308Coverage.errors.join("; "));
assert.equal(cp308Coverage.summary.unit_count, 10);
assert.equal(cp308Coverage.summary.by_micro_phase["RP09.P05.M05"], 10);
assert.equal(cp308Slice.valid, true, cp308Slice.errors.join("; "));
assert.equal(cp308CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp308CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-308 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp308Descriptor)),
  "contract fixture_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp308_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP308_REQUIREMENTS)));
assert.deepEqual(crmContract.cp308_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP308_NO_WRITE_ATTESTATION)));
assert.equal(cp308Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp308Hermes.production_ready_candidate, true);
assert.equal(cp308Claude.review_packet, "C09.CP00-308.crm_core_fixture_slice_descriptor");
assert.equal(cp308Claude.read_only, true);
assert.equal(cp308Handoff.to_pack_id, "CP00-309");
assert.equal(cp308Handoff.next_subphase_id, "RP09.P05.M05.S18");
assert.equal(cp309Coverage.valid, true, cp309Coverage.errors.join("; "));
assert.equal(cp309Coverage.summary.unit_count, 10);
assert.equal(cp309Coverage.summary.by_micro_phase["RP09.P05.M06"], 7);
assert.equal(cp309Slice.valid, true, cp309Slice.errors.join("; "));
assert.equal(cp309CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp309CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-309 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.fixture_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp309Descriptor)),
  "contract fixture_binding_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp309_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP309_REQUIREMENTS)));
assert.deepEqual(crmContract.cp309_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP309_NO_WRITE_ATTESTATION)));
assert.equal(cp309Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp309Hermes.production_ready_candidate, true);
assert.equal(cp309Claude.review_packet, "C09.CP00-309.crm_core_fixture_binding_slice_descriptor");
assert.equal(cp309Claude.read_only, true);
assert.equal(cp309Handoff.to_pack_id, "CP00-310");
assert.equal(cp309Handoff.next_subphase_id, "RP09.P05.M06.S08");
assert.equal(cp310Coverage.valid, true, cp310Coverage.errors.join("; "));
assert.equal(cp310Coverage.summary.unit_count, 150);
assert.equal(cp310Coverage.summary.by_phase["RP09.P05"], 81);
assert.equal(cp310Coverage.summary.by_phase["RP09.P06"], 69);
assert.equal(cp310Foundation.valid, true, cp310Foundation.errors.join("; "));
assert.equal(cp310CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp310CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-310 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p05_closeout_p06_permission_foundation_descriptor,
  JSON.parse(JSON.stringify(cp310Descriptor)),
  "contract p05_closeout_p06_permission_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp310_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP310_REQUIREMENTS)));
assert.deepEqual(crmContract.cp310_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP310_NO_WRITE_ATTESTATION)));
assert.equal(cp310Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp310Hermes.production_ready_candidate, true);
assert.equal(cp310Claude.review_packet, "C09.CP00-310.crm_core_p05_closeout_p06_permission_foundation_descriptor");
assert.equal(cp310Claude.read_only, true);
assert.equal(cp310Handoff.to_pack_id, "CP00-311");
assert.equal(cp310Handoff.next_subphase_id, "RP09.P06.M04.S06");
assert.equal(cp311Coverage.valid, true, cp311Coverage.errors.join("; "));
assert.equal(cp311Coverage.summary.unit_count, 40);
assert.equal(cp311Coverage.summary.by_micro_phase["RP09.P06.M05"], 22);
assert.equal(cp311Slice.valid, true, cp311Slice.errors.join("; "));
assert.equal(cp311CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp311CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-311 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp311Descriptor)),
  "contract permission_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp311_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP311_REQUIREMENTS)));
assert.deepEqual(crmContract.cp311_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP311_NO_WRITE_ATTESTATION)));
assert.equal(cp311Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp311Hermes.production_ready_candidate, true);
assert.equal(cp311Claude.review_packet, "C09.CP00-311.crm_core_permission_slice_descriptor");
assert.equal(cp311Claude.read_only, true);
assert.equal(cp311Handoff.to_pack_id, "CP00-312");
assert.equal(cp311Handoff.next_subphase_id, "RP09.P06.M06.S04");
assert.equal(cp312Coverage.valid, true, cp312Coverage.errors.join("; "));
assert.equal(cp312Coverage.summary.unit_count, 150);
assert.equal(cp312Coverage.summary.by_phase["RP09.P06"], 90);
assert.equal(cp312Coverage.summary.by_phase["RP09.P07"], 60);
assert.equal(cp312Foundation.valid, true, cp312Foundation.errors.join("; "));
assert.equal(cp312CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp312CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-312 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p06_closeout_p07_failure_foundation_descriptor,
  JSON.parse(JSON.stringify(cp312Descriptor)),
  "contract p06_closeout_p07_failure_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp312_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP312_REQUIREMENTS)));
assert.deepEqual(crmContract.cp312_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP312_NO_WRITE_ATTESTATION)));
assert.equal(cp312Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp312Hermes.production_ready_candidate, true);
assert.equal(cp312Claude.review_packet, "C09.CP00-312.crm_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp312Claude.read_only, true);
assert.equal(cp312Handoff.to_pack_id, "CP00-313");
assert.equal(cp312Handoff.next_subphase_id, "RP09.P07.M03.S19");
assert.equal(cp313Coverage.valid, true, cp313Coverage.errors.join("; "));
assert.equal(cp313Coverage.summary.unit_count, 10);
assert.equal(cp313Coverage.summary.by_micro_phase["RP09.P07.M04"], 6);
assert.equal(cp313Slice.valid, true, cp313Slice.errors.join("; "));
assert.equal(cp313CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp313CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-313 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.failure_slice_descriptor,
  JSON.parse(JSON.stringify(cp313Descriptor)),
  "contract failure_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp313_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP313_REQUIREMENTS)));
assert.deepEqual(crmContract.cp313_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP313_NO_WRITE_ATTESTATION)));
assert.equal(cp313Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp313Hermes.production_ready_candidate, true);
assert.equal(cp313Claude.review_packet, "C09.CP00-313.crm_core_failure_slice_descriptor");
assert.equal(cp313Claude.read_only, true);
assert.equal(cp313Handoff.to_pack_id, "CP00-314");
assert.equal(cp313Handoff.next_subphase_id, "RP09.P07.M04.S07");
assert.equal(cp314Coverage.valid, true, cp314Coverage.errors.join("; "));
assert.equal(cp314Coverage.summary.unit_count, 10);
assert.equal(cp314Coverage.summary.by_micro_phase["RP09.P07.M04"], 10);
assert.equal(cp314Slice.valid, true, cp314Slice.errors.join("; "));
assert.equal(cp314CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp314CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-314 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.failure_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp314Descriptor)),
  "contract failure_binding_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp314_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP314_REQUIREMENTS)));
assert.deepEqual(crmContract.cp314_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP314_NO_WRITE_ATTESTATION)));
assert.equal(cp314Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp314Hermes.production_ready_candidate, true);
assert.equal(cp314Claude.review_packet, "C09.CP00-314.crm_core_failure_binding_slice_descriptor");
assert.equal(cp314Claude.read_only, true);
assert.equal(cp314Handoff.to_pack_id, "CP00-315");
assert.equal(cp314Handoff.next_subphase_id, "RP09.P07.M04.S17");
assert.equal(cp315Coverage.valid, true, cp315Coverage.errors.join("; "));
assert.equal(cp315Coverage.summary.unit_count, 40);
assert.equal(cp315Coverage.summary.by_micro_phase["RP09.P07.M05"], 22);
assert.equal(cp315Slice.valid, true, cp315Slice.errors.join("; "));
assert.equal(cp315CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp315CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-315 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.failure_tail_slice_descriptor,
  JSON.parse(JSON.stringify(cp315Descriptor)),
  "contract failure_tail_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp315_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP315_REQUIREMENTS)));
assert.deepEqual(crmContract.cp315_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP315_NO_WRITE_ATTESTATION)));
assert.equal(cp315Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp315Hermes.production_ready_candidate, true);
assert.equal(cp315Claude.review_packet, "C09.CP00-315.crm_core_failure_tail_slice_descriptor");
assert.equal(cp315Claude.read_only, true);
assert.equal(cp315Handoff.to_pack_id, "CP00-316");
assert.equal(cp315Handoff.next_subphase_id, "RP09.P07.M06.S15");
assert.equal(cp316Coverage.valid, true, cp316Coverage.errors.join("; "));
assert.equal(cp316Coverage.summary.unit_count, 10);
assert.equal(cp316Coverage.summary.by_micro_phase["RP09.P07.M06"], 6);
assert.equal(cp316Slice.valid, true, cp316Slice.errors.join("; "));
assert.equal(cp316CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp316CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-316 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.failure_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp316Descriptor)),
  "contract failure_fixture_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp316_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP316_REQUIREMENTS)));
assert.deepEqual(crmContract.cp316_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP316_NO_WRITE_ATTESTATION)));
assert.equal(cp316Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp316Hermes.production_ready_candidate, true);
assert.equal(cp316Claude.review_packet, "C09.CP00-316.crm_core_failure_fixture_slice_descriptor");
assert.equal(cp316Claude.read_only, true);
assert.equal(cp316Handoff.to_pack_id, "CP00-317");
assert.equal(cp316Handoff.next_subphase_id, "RP09.P07.M07.S05");
assert.equal(cp317Coverage.valid, true, cp317Coverage.errors.join("; "));
assert.equal(cp317Coverage.summary.unit_count, 40);
assert.equal(cp317Coverage.summary.by_micro_phase["RP09.P07.M08"], 20);
assert.equal(cp317Slice.valid, true, cp317Slice.errors.join("; "));
assert.equal(cp317CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp317CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-317 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.failure_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp317Descriptor)),
  "contract failure_hermes_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp317_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP317_REQUIREMENTS)));
assert.deepEqual(crmContract.cp317_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP317_NO_WRITE_ATTESTATION)));
assert.equal(cp317Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp317Hermes.production_ready_candidate, true);
assert.equal(cp317Claude.review_packet, "C09.CP00-317.crm_core_failure_hermes_slice_descriptor");
assert.equal(cp317Claude.read_only, true);
assert.equal(cp317Handoff.to_pack_id, "CP00-318");
assert.equal(cp317Handoff.next_subphase_id, "RP09.P07.M09.S03");
assert.equal(cp318Coverage.valid, true, cp318Coverage.errors.join("; "));
assert.equal(cp318Coverage.summary.unit_count, 150);
assert.equal(cp318Coverage.summary.by_phase["RP09.P07"], 29);
assert.equal(cp318Coverage.summary.by_phase["RP09.P08"], 121);
assert.equal(cp318Foundation.valid, true, cp318Foundation.errors.join("; "));
assert.equal(cp318CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp318CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-318 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p07_closeout_p08_hermes_foundation_descriptor,
  JSON.parse(JSON.stringify(cp318Descriptor)),
  "contract p07_closeout_p08_hermes_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp318_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP318_REQUIREMENTS)));
assert.deepEqual(crmContract.cp318_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP318_NO_WRITE_ATTESTATION)));
assert.equal(cp318Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp318Hermes.production_ready_candidate, true);
assert.equal(cp318Claude.review_packet, "C09.CP00-318.crm_core_p07_closeout_p08_hermes_foundation_descriptor");
assert.equal(cp318Claude.read_only, true);
assert.equal(cp318Handoff.to_pack_id, "CP00-319");
assert.equal(cp318Handoff.next_subphase_id, "RP09.P08.M08.S02");
assert.equal(cp319Coverage.valid, true, cp319Coverage.errors.join("; "));
assert.equal(cp319Coverage.summary.unit_count, 150);
assert.equal(cp319Coverage.summary.by_phase["RP09.P08"], 47);
assert.equal(cp319Coverage.summary.by_phase["RP09.P09"], 103);
assert.equal(cp319Foundation.valid, true, cp319Foundation.errors.join("; "));
assert.equal(cp319CaseSet.section_count, 12);
for (const [microId, titles] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp319CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-319 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.p08_closeout_p09_review_foundation_descriptor,
  JSON.parse(JSON.stringify(cp319Descriptor)),
  "contract p08_closeout_p09_review_foundation_descriptor drift",
);
assert.deepEqual(crmContract.cp319_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP319_REQUIREMENTS)));
assert.deepEqual(crmContract.cp319_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP319_NO_WRITE_ATTESTATION)));
assert.equal(cp319Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp319Hermes.production_ready_candidate, true);
assert.equal(cp319Claude.review_packet, "C09.CP00-319.crm_core_p08_closeout_p09_review_foundation_descriptor");
assert.equal(cp319Claude.read_only, true);
assert.equal(cp319Handoff.to_pack_id, "CP00-320");
assert.equal(cp319Handoff.next_subphase_id, "RP09.P09.M09.S01");
assert.equal(cp320Coverage.valid, true, cp320Coverage.errors.join("; "));
assert.equal(cp320Coverage.summary.unit_count, 12);
assert.equal(cp320Coverage.summary.by_micro_phase["RP09.P09.M09"], 8);
assert.equal(cp320Coverage.summary.by_micro_phase["RP09.P09.M10"], 4);
assert.equal(cp320Slice.valid, true, cp320Slice.errors.join("; "));
assert.equal(cp320CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp320CaseSet.sections[microId].rows[crmCoreRowKey(title)];
    assert.ok(row, `CP00-320 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  crmContract.review_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp320Descriptor)),
  "contract review_closeout_slice_descriptor drift",
);
assert.deepEqual(crmContract.cp320_requirements, JSON.parse(JSON.stringify(CRM_CORE_CP320_REQUIREMENTS)));
assert.deepEqual(crmContract.cp320_no_write_attestation, JSON.parse(JSON.stringify(CRM_CORE_CP320_NO_WRITE_ATTESTATION)));
assert.equal(cp320Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp320Hermes.production_ready_candidate, true);
assert.equal(cp320Claude.review_packet, "C09.CP00-320.crm_core_review_closeout_slice_descriptor");
assert.equal(cp320Claude.read_only, true);
assert.equal(cp320Handoff.to_pack_id, "CP00-321");
assert.equal(cp320Handoff.next_subphase_id, "RP10.P00.M00.S01");
assert.equal(CRM_CORE_CP320_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP320_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP319_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP319_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP318_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP318_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP317_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP317_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP316_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP316_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP315_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP315_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP314_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP314_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP313_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP313_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP312_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP312_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP311_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP311_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP310_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP310_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP309_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP309_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP308_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP308_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP307_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP307_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP306_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP306_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP305_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP305_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP304_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP304_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP303_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP303_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP302_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP302_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP301_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP301_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP300_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP300_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(CRM_CORE_CP299_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CRM_CORE_CP299_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(crmContract.historical_pack_bindings));
assert.equal(crmContract.historical_pack_bindings.at(-1).pack_id, "CP00-320");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp09:crm-core:validate",
      pack_id: CRM_CORE_CP320_PACK_BINDING.pack_id,
      covered_units: cp320Coverage.summary.unit_count,
      program_id: CRM_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp320Hermes.gate,
      claude_gate: crmContract.current_pack.claude_gate,
      source_p08_closeout_p09_review_foundation_pack_id: CRM_CORE_CP320_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp299Coverage.summary.unit_count,
      p01_closeout_p02_service_foundation_units_preserved: cp300Coverage.summary.unit_count,
      service_slice_units_preserved: cp301Coverage.summary.unit_count,
      service_binding_slice_units_preserved: cp302Coverage.summary.unit_count,
      p02_closeout_p03_interface_p04_ui_foundation_units_preserved: cp303Coverage.summary.unit_count,
      ui_workflow_slice_units_preserved: cp304Coverage.summary.unit_count,
      ui_binding_slice_units_preserved: cp305Coverage.summary.unit_count,
      ui_binding_tail_units_preserved: cp306Coverage.summary.unit_count,
      p04_closeout_p05_fixture_foundation_units_preserved: cp307Coverage.summary.unit_count,
      fixture_slice_units_preserved: cp308Coverage.summary.unit_count,
      fixture_binding_slice_units_preserved: cp309Coverage.summary.unit_count,
      p05_closeout_p06_permission_foundation_units_preserved: cp310Coverage.summary.unit_count,
      permission_slice_units_preserved: cp311Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp312Coverage.summary.unit_count,
      failure_slice_units_preserved: cp313Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp314Coverage.summary.unit_count,
      failure_tail_slice_units_preserved: cp315Coverage.summary.unit_count,
      failure_fixture_slice_units_preserved: cp316Coverage.summary.unit_count,
      failure_hermes_slice_units_preserved: cp317Coverage.summary.unit_count,
      p07_closeout_p08_hermes_foundation_units_preserved: cp318Coverage.summary.unit_count,
      p08_closeout_p09_review_foundation_units_preserved: cp319Coverage.summary.unit_count,
      next_pack_id: cp320Handoff.to_pack_id,
      production_ready_candidate: cp320Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
