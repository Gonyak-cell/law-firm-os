import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const crmContract = JSON.parse(
  readFileSync(new URL("../../../contracts/crm-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp299ManifestPath = new URL("../../../docs/closeout-packs/cp00-299/manifest.json", import.meta.url);
const cp299Manifest = existsSync(cp299ManifestPath) ? JSON.parse(readFileSync(cp299ManifestPath, "utf8")) : null;
const cp299PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-299") ?? cp299Manifest?.plan_binding_snapshot;
const cp300ManifestPath = new URL("../../../docs/closeout-packs/cp00-300/manifest.json", import.meta.url);
const cp300Manifest = existsSync(cp300ManifestPath) ? JSON.parse(readFileSync(cp300ManifestPath, "utf8")) : null;
const cp300PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-300") ?? cp300Manifest?.plan_binding_snapshot;
const cp301ManifestPath = new URL("../../../docs/closeout-packs/cp00-301/manifest.json", import.meta.url);
const cp301Manifest = existsSync(cp301ManifestPath) ? JSON.parse(readFileSync(cp301ManifestPath, "utf8")) : null;
const cp301PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-301") ?? cp301Manifest?.plan_binding_snapshot;
const cp302ManifestPath = new URL("../../../docs/closeout-packs/cp00-302/manifest.json", import.meta.url);
const cp302Manifest = existsSync(cp302ManifestPath) ? JSON.parse(readFileSync(cp302ManifestPath, "utf8")) : null;
const cp302PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-302") ?? cp302Manifest?.plan_binding_snapshot;
const cp303ManifestPath = new URL("../../../docs/closeout-packs/cp00-303/manifest.json", import.meta.url);
const cp303Manifest = existsSync(cp303ManifestPath) ? JSON.parse(readFileSync(cp303ManifestPath, "utf8")) : null;
const cp303PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-303") ?? cp303Manifest?.plan_binding_snapshot;
const cp304ManifestPath = new URL("../../../docs/closeout-packs/cp00-304/manifest.json", import.meta.url);
const cp304Manifest = existsSync(cp304ManifestPath) ? JSON.parse(readFileSync(cp304ManifestPath, "utf8")) : null;
const cp304PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-304") ?? cp304Manifest?.plan_binding_snapshot;
const cp305ManifestPath = new URL("../../../docs/closeout-packs/cp00-305/manifest.json", import.meta.url);
const cp305Manifest = existsSync(cp305ManifestPath) ? JSON.parse(readFileSync(cp305ManifestPath, "utf8")) : null;
const cp305PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-305") ?? cp305Manifest?.plan_binding_snapshot;
const cp306ManifestPath = new URL("../../../docs/closeout-packs/cp00-306/manifest.json", import.meta.url);
const cp306Manifest = existsSync(cp306ManifestPath) ? JSON.parse(readFileSync(cp306ManifestPath, "utf8")) : null;
const cp306PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-306") ?? cp306Manifest?.plan_binding_snapshot;
const cp307ManifestPath = new URL("../../../docs/closeout-packs/cp00-307/manifest.json", import.meta.url);
const cp307Manifest = existsSync(cp307ManifestPath) ? JSON.parse(readFileSync(cp307ManifestPath, "utf8")) : null;
const cp307PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-307") ?? cp307Manifest?.plan_binding_snapshot;
const cp308ManifestPath = new URL("../../../docs/closeout-packs/cp00-308/manifest.json", import.meta.url);
const cp308Manifest = existsSync(cp308ManifestPath) ? JSON.parse(readFileSync(cp308ManifestPath, "utf8")) : null;
const cp308PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-308") ?? cp308Manifest?.plan_binding_snapshot;
const cp309ManifestPath = new URL("../../../docs/closeout-packs/cp00-309/manifest.json", import.meta.url);
const cp309Manifest = existsSync(cp309ManifestPath) ? JSON.parse(readFileSync(cp309ManifestPath, "utf8")) : null;
const cp309PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-309") ?? cp309Manifest?.plan_binding_snapshot;
const cp310ManifestPath = new URL("../../../docs/closeout-packs/cp00-310/manifest.json", import.meta.url);
const cp310Manifest = existsSync(cp310ManifestPath) ? JSON.parse(readFileSync(cp310ManifestPath, "utf8")) : null;
const cp310PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-310") ?? cp310Manifest?.plan_binding_snapshot;
const cp311ManifestPath = new URL("../../../docs/closeout-packs/cp00-311/manifest.json", import.meta.url);
const cp311Manifest = existsSync(cp311ManifestPath) ? JSON.parse(readFileSync(cp311ManifestPath, "utf8")) : null;
const cp311PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-311") ?? cp311Manifest?.plan_binding_snapshot;
const cp312ManifestPath = new URL("../../../docs/closeout-packs/cp00-312/manifest.json", import.meta.url);
const cp312Manifest = existsSync(cp312ManifestPath) ? JSON.parse(readFileSync(cp312ManifestPath, "utf8")) : null;
const cp312PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-312") ?? cp312Manifest?.plan_binding_snapshot;
const cp313ManifestPath = new URL("../../../docs/closeout-packs/cp00-313/manifest.json", import.meta.url);
const cp313Manifest = existsSync(cp313ManifestPath) ? JSON.parse(readFileSync(cp313ManifestPath, "utf8")) : null;
const cp313PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-313") ?? cp313Manifest?.plan_binding_snapshot;
const cp314ManifestPath = new URL("../../../docs/closeout-packs/cp00-314/manifest.json", import.meta.url);
const cp314Manifest = existsSync(cp314ManifestPath) ? JSON.parse(readFileSync(cp314ManifestPath, "utf8")) : null;
const cp314PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-314") ?? cp314Manifest?.plan_binding_snapshot;
const cp315ManifestPath = new URL("../../../docs/closeout-packs/cp00-315/manifest.json", import.meta.url);
const cp315Manifest = existsSync(cp315ManifestPath) ? JSON.parse(readFileSync(cp315ManifestPath, "utf8")) : null;
const cp315PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-315") ?? cp315Manifest?.plan_binding_snapshot;
const cp316ManifestPath = new URL("../../../docs/closeout-packs/cp00-316/manifest.json", import.meta.url);
const cp316Manifest = existsSync(cp316ManifestPath) ? JSON.parse(readFileSync(cp316ManifestPath, "utf8")) : null;
const cp316PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-316") ?? cp316Manifest?.plan_binding_snapshot;
const cp317ManifestPath = new URL("../../../docs/closeout-packs/cp00-317/manifest.json", import.meta.url);
const cp317Manifest = existsSync(cp317ManifestPath) ? JSON.parse(readFileSync(cp317ManifestPath, "utf8")) : null;
const cp317PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-317") ?? cp317Manifest?.plan_binding_snapshot;
const cp318ManifestPath = new URL("../../../docs/closeout-packs/cp00-318/manifest.json", import.meta.url);
const cp318Manifest = existsSync(cp318ManifestPath) ? JSON.parse(readFileSync(cp318ManifestPath, "utf8")) : null;
const cp318PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-318") ?? cp318Manifest?.plan_binding_snapshot;
const cp319ManifestPath = new URL("../../../docs/closeout-packs/cp00-319/manifest.json", import.meta.url);
const cp319Manifest = existsSync(cp319ManifestPath) ? JSON.parse(readFileSync(cp319ManifestPath, "utf8")) : null;
const cp319PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-319") ?? cp319Manifest?.plan_binding_snapshot;
const cp320ManifestPath = new URL("../../../docs/closeout-packs/cp00-320/manifest.json", import.meta.url);
const cp320Manifest = existsSync(cp320ManifestPath) ? JSON.parse(readFileSync(cp320ManifestPath, "utf8")) : null;
const cp320PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-320") ?? cp320Manifest?.plan_binding_snapshot;

test("RP09 program contract pins the CRM descriptor-only bootstrap", () => {
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.program_id, "RP09");
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.program_title, "CRM And Business Development");
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP08");
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.hermes_gate, "H09");
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.claude_gate, "C09");
  assert.equal(CRM_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-299", "CP00-300", "CP00-301", "CP00-302", "CP00-303", "CP00-304", "CP00-305", "CP00-306", "CP00-307", "CP00-308", "CP00-309", "CP00-310", "CP00-311", "CP00-312", "CP00-313", "CP00-314", "CP00-315", "CP00-316", "CP00-317", "CP00-318", "CP00-319", "CP00-320"].includes(crmContract.current_pack.pack_id));
  assert.equal(crmContract.program.program_id, "RP09");
});

test("CP00-299 plan binding covers the planned 150 RP09 scope and model foundation units", () => {
  const coverage = validateCrmCoreCp299Coverage(cp299PlanPack);

  assert.equal(CRM_CORE_CP299_PACK_BINDING.pack_id, "CP00-299");
  assert.equal(CRM_CORE_CP299_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP299_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP299_PACK_BINDING.range, "RP09.P00.M00.S01-RP09.P01.M08.S05");
  assert.equal(CRM_CORE_CP299_PACK_BINDING.upstream_pack_id, "CP00-298");
  assert.equal(CRM_CORE_CP299_PACK_BINDING.next_pack_id, "CP00-300");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P00"], 52);
  assert.equal(coverage.summary.by_phase["RP09.P01"], 98);
  assert.equal(Object.keys(CRM_CORE_CP299_REQUIREMENTS.required_section_rows).length, 20);
});

test("CP00-299 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp299ScopeContractFoundationCaseSet();
  const descriptor = createCrmCoreCp299ScopeContractFoundationDescriptor();
  const validation = validateCrmCoreCp299ScopeContractFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 20);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.crm_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP09.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.claude_model_review_prompt.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-299 evidence packets and handoff preserve CRM bootstrap authority boundaries", () => {
  const descriptor = createCrmCoreCp299ScopeContractFoundationDescriptor();
  const hermes = createCrmCoreCp299HermesEvidencePacket(cp299PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp299ClaudeReviewPacket(cp299PlanPack);
  const handoff = createCrmCoreCp299CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H09");
  assert.equal(claude.gate, "C09");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-299-to-CP00-300");
  assert.equal(handoff.next_subphase_id, "RP09.P01.M08.S06");
  assert.equal(handoff.production_ready_flag, "crm_core_scope_contract_foundation_descriptor_verified");
  assert.equal(CRM_CORE_CP299_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CRM_CORE_CP299_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-300 plan binding covers the planned 150 RP09 P01 closeout and P02 service foundation units", () => {
  const coverage = validateCrmCoreCp300Coverage(cp300PlanPack);

  assert.equal(CRM_CORE_CP300_PACK_BINDING.pack_id, "CP00-300");
  assert.equal(CRM_CORE_CP300_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP300_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP300_PACK_BINDING.range, "RP09.P01.M08.S06-RP09.P02.M07.S10");
  assert.equal(CRM_CORE_CP300_PACK_BINDING.upstream_pack_id, "CP00-299");
  assert.equal(CRM_CORE_CP300_PACK_BINDING.next_pack_id, "CP00-301");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P01"], 14);
  assert.equal(coverage.summary.by_phase["RP09.P02"], 136);
  assert.equal(Object.keys(CRM_CORE_CP300_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-300 P01 closeout and P02 service foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp300P01CloseoutP02ServiceFoundationCaseSet();
  const descriptor = createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor();
  const validation = validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P02.M05"].rows;
  assert.equal(m05.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m05.permission_precheck.permission_decision_detail_included, false);
  assert.equal(m05.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m05.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-300 evidence packets and handoff route the P01 closeout to the P02 service phase", () => {
  const descriptor = createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor();
  const hermes = createCrmCoreCp300HermesEvidencePacket(cp300PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp300ClaudeReviewPacket(cp300PlanPack);
  const handoff = createCrmCoreCp300CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-300-to-CP00-301");
  assert.equal(handoff.next_subphase_id, "RP09.P02.M07.S11");
  assert.equal(handoff.production_ready_flag, "crm_core_p01_closeout_p02_service_foundation_descriptor_verified");
});

test("CP00-301 plan binding covers the planned 10 RP09 service slice units", () => {
  const coverage = validateCrmCoreCp301Coverage(cp301PlanPack);

  assert.equal(CRM_CORE_CP301_PACK_BINDING.pack_id, "CP00-301");
  assert.equal(CRM_CORE_CP301_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP301_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP301_PACK_BINDING.range, "RP09.P02.M07.S11-RP09.P02.M07.S20");
  assert.equal(CRM_CORE_CP301_PACK_BINDING.upstream_pack_id, "CP00-300");
  assert.equal(CRM_CORE_CP301_PACK_BINDING.next_pack_id, "CP00-302");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P02.M07"], 10);
});

test("CP00-301 service slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp301ServiceSliceCaseSet();
  const descriptor = createCrmCoreCp301ServiceSliceDescriptor();
  const validation = validateCrmCoreCp301ServiceSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP09.P02.M07"].rows;
  assert.equal(m07.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m07.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m07.unit_test_denied_path.expected_outcome, "denied_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-301 evidence packets and handoff preserve service slice authority boundaries", () => {
  const descriptor = createCrmCoreCp301ServiceSliceDescriptor();
  const hermes = createCrmCoreCp301HermesEvidencePacket(cp301PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp301ClaudeReviewPacket(cp301PlanPack);
  const handoff = createCrmCoreCp301CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-301-to-CP00-302");
  assert.equal(handoff.next_subphase_id, "RP09.P02.M07.S21");
  assert.equal(handoff.production_ready_flag, "crm_core_service_slice_descriptor_verified");
});

test("CP00-302 plan binding covers the planned 40 RP09 service binding slice units", () => {
  const coverage = validateCrmCoreCp302Coverage(cp302PlanPack);

  assert.equal(CRM_CORE_CP302_PACK_BINDING.pack_id, "CP00-302");
  assert.equal(CRM_CORE_CP302_PACK_BINDING.risk_class, "B");
  assert.equal(CRM_CORE_CP302_PACK_BINDING.unit_count, 40);
  assert.equal(CRM_CORE_CP302_PACK_BINDING.range, "RP09.P02.M07.S21-RP09.P02.M09.S18");
  assert.equal(CRM_CORE_CP302_PACK_BINDING.upstream_pack_id, "CP00-301");
  assert.equal(CRM_CORE_CP302_PACK_BINDING.next_pack_id, "CP00-303");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP09.P02.M08"], 20);
});

test("CP00-302 service binding slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp302ServiceBindingSliceCaseSet();
  const descriptor = createCrmCoreCp302ServiceBindingSliceDescriptor();
  const validation = validateCrmCoreCp302ServiceBindingSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP09.P02.M07"].rows;
  assert.equal(m07.unit_test_review_path.expected_outcome, "review_required");
  assert.equal(m07.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  const m08 = caseSet.sections["RP09.P02.M08"].rows;
  assert.equal(m08.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m08.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-302 evidence packets and handoff preserve service binding slice authority boundaries", () => {
  const descriptor = createCrmCoreCp302ServiceBindingSliceDescriptor();
  const hermes = createCrmCoreCp302HermesEvidencePacket(cp302PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp302ClaudeReviewPacket(cp302PlanPack);
  const handoff = createCrmCoreCp302CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-302-to-CP00-303");
  assert.equal(handoff.next_subphase_id, "RP09.P02.M09.S19");
  assert.equal(handoff.production_ready_flag, "crm_core_service_binding_slice_descriptor_verified");
});

test("CP00-303 plan binding covers the planned 150 RP09 P02 closeout, P03 interface, and P04 UI foundation units", () => {
  const coverage = validateCrmCoreCp303Coverage(cp303PlanPack);

  assert.equal(CRM_CORE_CP303_PACK_BINDING.pack_id, "CP00-303");
  assert.equal(CRM_CORE_CP303_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP303_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP303_PACK_BINDING.range, "RP09.P02.M09.S19-RP09.P04.M03.S05");
  assert.equal(CRM_CORE_CP303_PACK_BINDING.upstream_pack_id, "CP00-302");
  assert.equal(CRM_CORE_CP303_PACK_BINDING.next_pack_id, "CP00-304");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P02"], 13);
  assert.equal(coverage.summary.by_phase["RP09.P03"], 112);
  assert.equal(coverage.summary.by_phase["RP09.P04"], 25);
  assert.equal(Object.keys(CRM_CORE_CP303_REQUIREMENTS.required_section_rows).length, 17);
});

test("CP00-303 interface and UI foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  const descriptor = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const validation = validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 17);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P03.M05"].rows;
  assert.equal(m05.permission_annotation.permission_decision_detail_included, false);
  assert.equal(m05.pagination_or_filtering_contract.no_unauthorized_count_leak, true);
  assert.equal(m05.unauthorized_data_omission.unauthorized_data_omitted, true);
  const ui = caseSet.sections["RP09.P04.M01"].rows;
  assert.equal(ui.empty_state.no_unauthorized_count_leak, true);
  assert.equal(ui.denied_state.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-303 evidence packets and handoff route the P02/P03 closeout to the P04 UI phase", () => {
  const descriptor = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const hermes = createCrmCoreCp303HermesEvidencePacket(cp303PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp303ClaudeReviewPacket(cp303PlanPack);
  const handoff = createCrmCoreCp303CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-303-to-CP00-304");
  assert.equal(handoff.next_subphase_id, "RP09.P04.M03.S06");
  assert.equal(handoff.production_ready_flag, "crm_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor_verified");
});

test("CP00-304 plan binding covers the planned 40 RP09 UI workflow slice units", () => {
  const coverage = validateCrmCoreCp304Coverage(cp304PlanPack);

  assert.equal(CRM_CORE_CP304_PACK_BINDING.pack_id, "CP00-304");
  assert.equal(CRM_CORE_CP304_PACK_BINDING.risk_class, "B");
  assert.equal(CRM_CORE_CP304_PACK_BINDING.unit_count, 40);
  assert.equal(CRM_CORE_CP304_PACK_BINDING.range, "RP09.P04.M03.S06-RP09.P04.M05.S05");
  assert.equal(CRM_CORE_CP304_PACK_BINDING.upstream_pack_id, "CP00-303");
  assert.equal(CRM_CORE_CP304_PACK_BINDING.next_pack_id, "CP00-305");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP09.P04.M04"], 20);
});

test("CP00-304 UI workflow slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp304UiWorkflowSliceCaseSet();
  const descriptor = createCrmCoreCp304UiWorkflowSliceDescriptor();
  const validation = validateCrmCoreCp304UiWorkflowSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP09.P04.M04"].rows;
  assert.equal(m04.permission_badge.permission_decision_detail_included, false);
  assert.equal(m04.build_smoke.executes_ui_runtime, false);
  assert.equal(m04.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-304 evidence packets and handoff preserve UI workflow slice authority boundaries", () => {
  const descriptor = createCrmCoreCp304UiWorkflowSliceDescriptor();
  const hermes = createCrmCoreCp304HermesEvidencePacket(cp304PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp304ClaudeReviewPacket(cp304PlanPack);
  const handoff = createCrmCoreCp304CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-304-to-CP00-305");
  assert.equal(handoff.next_subphase_id, "RP09.P04.M05.S06");
  assert.equal(handoff.production_ready_flag, "crm_core_ui_workflow_slice_descriptor_verified");
});

test("CP00-305 plan binding covers the planned 10 RP09 UI binding slice units", () => {
  const coverage = validateCrmCoreCp305Coverage(cp305PlanPack);

  assert.equal(CRM_CORE_CP305_PACK_BINDING.pack_id, "CP00-305");
  assert.equal(CRM_CORE_CP305_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP305_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP305_PACK_BINDING.range, "RP09.P04.M05.S06-RP09.P04.M05.S15");
  assert.equal(CRM_CORE_CP305_PACK_BINDING.upstream_pack_id, "CP00-304");
  assert.equal(CRM_CORE_CP305_PACK_BINDING.next_pack_id, "CP00-306");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P04.M05"], 10);
});

test("CP00-305 UI binding slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp305UiBindingSliceCaseSet();
  const descriptor = createCrmCoreCp305UiBindingSliceDescriptor();
  const validation = validateCrmCoreCp305UiBindingSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P04.M05"].rows;
  assert.equal(m05.permission_badge.permission_decision_detail_included, false);
  assert.equal(m05.audit_hint_display.audit_hint_detail_included, false);
  assert.equal(m05.error_message_copy.validation_error_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-305 evidence packets and handoff preserve UI binding slice authority boundaries", () => {
  const descriptor = createCrmCoreCp305UiBindingSliceDescriptor();
  const hermes = createCrmCoreCp305HermesEvidencePacket(cp305PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp305ClaudeReviewPacket(cp305PlanPack);
  const handoff = createCrmCoreCp305CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-305-to-CP00-306");
  assert.equal(handoff.next_subphase_id, "RP09.P04.M05.S16");
  assert.equal(handoff.production_ready_flag, "crm_core_ui_binding_slice_descriptor_verified");
});

test("CP00-306 plan binding covers the planned 10 RP09 UI binding tail units", () => {
  const coverage = validateCrmCoreCp306Coverage(cp306PlanPack);

  assert.equal(CRM_CORE_CP306_PACK_BINDING.pack_id, "CP00-306");
  assert.equal(CRM_CORE_CP306_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP306_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP306_PACK_BINDING.range, "RP09.P04.M05.S16-RP09.P04.M06.S05");
  assert.equal(CRM_CORE_CP306_PACK_BINDING.upstream_pack_id, "CP00-305");
  assert.equal(CRM_CORE_CP306_PACK_BINDING.next_pack_id, "CP00-307");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P04.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP09.P04.M06"], 5);
});

test("CP00-306 UI binding tail rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp306UiBindingTailCaseSet();
  const descriptor = createCrmCoreCp306UiBindingTailDescriptor();
  const validation = validateCrmCoreCp306UiBindingTailDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P04.M05"].rows;
  assert.equal(m05.synthetic_fixture_binding.real_client_data_loaded, false);
  assert.equal(m05.build_smoke.executes_ui_runtime, false);
  assert.equal(m05.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-306 evidence packets and handoff preserve UI binding tail authority boundaries", () => {
  const descriptor = createCrmCoreCp306UiBindingTailDescriptor();
  const hermes = createCrmCoreCp306HermesEvidencePacket(cp306PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp306ClaudeReviewPacket(cp306PlanPack);
  const handoff = createCrmCoreCp306CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-306-to-CP00-307");
  assert.equal(handoff.next_subphase_id, "RP09.P04.M06.S06");
  assert.equal(handoff.production_ready_flag, "crm_core_ui_binding_tail_descriptor_verified");
});

test("CP00-307 plan binding covers the planned 150 RP09 P04 closeout and P05 fixture foundation units", () => {
  const coverage = validateCrmCoreCp307Coverage(cp307PlanPack);

  assert.equal(CRM_CORE_CP307_PACK_BINDING.pack_id, "CP00-307");
  assert.equal(CRM_CORE_CP307_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP307_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP307_PACK_BINDING.range, "RP09.P04.M06.S06-RP09.P05.M05.S07");
  assert.equal(CRM_CORE_CP307_PACK_BINDING.upstream_pack_id, "CP00-306");
  assert.equal(CRM_CORE_CP307_PACK_BINDING.next_pack_id, "CP00-308");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P04"], 83);
  assert.equal(coverage.summary.by_phase["RP09.P05"], 67);
  assert.equal(Object.keys(CRM_CORE_CP307_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-307 P04 closeout and P05 fixture foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp307P04CloseoutP05FixtureFoundationCaseSet();
  const descriptor = createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor();
  const validation = validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P05.M03"].rows;
  assert.equal(m03.base_tenant_fixture.real_client_data_loaded, false);
  assert.equal(m03.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m03.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m03.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m03.no_real_data_check.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-307 evidence packets and handoff route the P04 closeout to the P05 fixture phase", () => {
  const descriptor = createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor();
  const hermes = createCrmCoreCp307HermesEvidencePacket(cp307PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp307ClaudeReviewPacket(cp307PlanPack);
  const handoff = createCrmCoreCp307CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-307-to-CP00-308");
  assert.equal(handoff.next_subphase_id, "RP09.P05.M05.S08");
  assert.equal(handoff.production_ready_flag, "crm_core_p04_closeout_p05_fixture_foundation_descriptor_verified");
});

test("CP00-308 plan binding covers the planned 10 RP09 fixture slice units", () => {
  const coverage = validateCrmCoreCp308Coverage(cp308PlanPack);

  assert.equal(CRM_CORE_CP308_PACK_BINDING.pack_id, "CP00-308");
  assert.equal(CRM_CORE_CP308_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP308_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP308_PACK_BINDING.range, "RP09.P05.M05.S08-RP09.P05.M05.S17");
  assert.equal(CRM_CORE_CP308_PACK_BINDING.upstream_pack_id, "CP00-307");
  assert.equal(CRM_CORE_CP308_PACK_BINDING.next_pack_id, "CP00-309");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P05.M05"], 10);
});

test("CP00-308 fixture slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp308FixtureSliceCaseSet();
  const descriptor = createCrmCoreCp308FixtureSliceDescriptor();
  const validation = validateCrmCoreCp308FixtureSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P05.M05"].rows;
  assert.equal(m05.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m05.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m05.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-308 evidence packets and handoff preserve fixture slice authority boundaries", () => {
  const descriptor = createCrmCoreCp308FixtureSliceDescriptor();
  const hermes = createCrmCoreCp308HermesEvidencePacket(cp308PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp308ClaudeReviewPacket(cp308PlanPack);
  const handoff = createCrmCoreCp308CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-308-to-CP00-309");
  assert.equal(handoff.next_subphase_id, "RP09.P05.M05.S18");
  assert.equal(handoff.production_ready_flag, "crm_core_fixture_slice_descriptor_verified");
});

test("CP00-309 plan binding covers the planned 10 RP09 fixture binding slice units", () => {
  const coverage = validateCrmCoreCp309Coverage(cp309PlanPack);

  assert.equal(CRM_CORE_CP309_PACK_BINDING.pack_id, "CP00-309");
  assert.equal(CRM_CORE_CP309_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP309_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP309_PACK_BINDING.range, "RP09.P05.M05.S18-RP09.P05.M06.S07");
  assert.equal(CRM_CORE_CP309_PACK_BINDING.upstream_pack_id, "CP00-308");
  assert.equal(CRM_CORE_CP309_PACK_BINDING.next_pack_id, "CP00-310");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P05.M06"], 7);
});

test("CP00-309 fixture binding slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp309FixtureBindingSliceCaseSet();
  const descriptor = createCrmCoreCp309FixtureBindingSliceDescriptor();
  const validation = validateCrmCoreCp309FixtureBindingSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P05.M05"].rows;
  assert.equal(m05.claude_missing_test_prompt.claude_final_approval_claimed, false);
  assert.equal(m05.no_real_data_check.real_client_data_loaded, false);
  const m06 = caseSet.sections["RP09.P05.M06"].rows;
  assert.equal(m06.base_tenant_fixture.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-309 evidence packets and handoff preserve fixture binding slice authority boundaries", () => {
  const descriptor = createCrmCoreCp309FixtureBindingSliceDescriptor();
  const hermes = createCrmCoreCp309HermesEvidencePacket(cp309PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp309ClaudeReviewPacket(cp309PlanPack);
  const handoff = createCrmCoreCp309CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-309-to-CP00-310");
  assert.equal(handoff.next_subphase_id, "RP09.P05.M06.S08");
  assert.equal(handoff.production_ready_flag, "crm_core_fixture_binding_slice_descriptor_verified");
});

test("CP00-310 plan binding covers the planned 150 RP09 P05 closeout and P06 permission foundation units", () => {
  const coverage = validateCrmCoreCp310Coverage(cp310PlanPack);

  assert.equal(CRM_CORE_CP310_PACK_BINDING.pack_id, "CP00-310");
  assert.equal(CRM_CORE_CP310_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP310_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP310_PACK_BINDING.range, "RP09.P05.M06.S08-RP09.P06.M04.S05");
  assert.equal(CRM_CORE_CP310_PACK_BINDING.upstream_pack_id, "CP00-309");
  assert.equal(CRM_CORE_CP310_PACK_BINDING.next_pack_id, "CP00-311");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P05"], 81);
  assert.equal(coverage.summary.by_phase["RP09.P06"], 69);
  assert.equal(Object.keys(CRM_CORE_CP310_REQUIREMENTS.required_section_rows).length, 10);
});

test("CP00-310 P05 closeout and P06 permission foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp310P05CloseoutP06PermissionFoundationCaseSet();
  const descriptor = createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor();
  const validation = validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P06.M03"].rows;
  assert.equal(m03.permission_matrix_row.deny_over_allow_enforced, true);
  assert.equal(m03.view_decision_binding.permission_decision_detail_included, false);
  assert.equal(m03.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m03.security_trimming_proof.unauthorized_data_omitted, true);
  assert.equal(m03.audit_event_expectation.writes_audit_event, false);
  assert.equal(m03.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-310 evidence packets and handoff route the P05 closeout to the P06 permission phase", () => {
  const descriptor = createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor();
  const hermes = createCrmCoreCp310HermesEvidencePacket(cp310PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp310ClaudeReviewPacket(cp310PlanPack);
  const handoff = createCrmCoreCp310CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-310-to-CP00-311");
  assert.equal(handoff.next_subphase_id, "RP09.P06.M04.S06");
  assert.equal(handoff.production_ready_flag, "crm_core_p05_closeout_p06_permission_foundation_descriptor_verified");
});

test("CP00-311 plan binding covers the planned 40 RP09 permission slice units", () => {
  const coverage = validateCrmCoreCp311Coverage(cp311PlanPack);

  assert.equal(CRM_CORE_CP311_PACK_BINDING.pack_id, "CP00-311");
  assert.equal(CRM_CORE_CP311_PACK_BINDING.risk_class, "B");
  assert.equal(CRM_CORE_CP311_PACK_BINDING.unit_count, 40);
  assert.equal(CRM_CORE_CP311_PACK_BINDING.range, "RP09.P06.M04.S06-RP09.P06.M06.S03");
  assert.equal(CRM_CORE_CP311_PACK_BINDING.upstream_pack_id, "CP00-310");
  assert.equal(CRM_CORE_CP311_PACK_BINDING.next_pack_id, "CP00-312");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP09.P06.M05"], 22);
});

test("CP00-311 permission slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp311PermissionSliceCaseSet();
  const descriptor = createCrmCoreCp311PermissionSliceDescriptor();
  const validation = validateCrmCoreCp311PermissionSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P06.M05"].rows;
  assert.equal(m05.permission_matrix_row.deny_over_allow_enforced, true);
  assert.equal(m05.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m05.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m05.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-311 evidence packets and handoff preserve permission slice authority boundaries", () => {
  const descriptor = createCrmCoreCp311PermissionSliceDescriptor();
  const hermes = createCrmCoreCp311HermesEvidencePacket(cp311PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp311ClaudeReviewPacket(cp311PlanPack);
  const handoff = createCrmCoreCp311CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-311-to-CP00-312");
  assert.equal(handoff.next_subphase_id, "RP09.P06.M06.S04");
  assert.equal(handoff.production_ready_flag, "crm_core_permission_slice_descriptor_verified");
});

test("CP00-312 plan binding covers the planned 150 RP09 P06 closeout and P07 failure foundation units", () => {
  const coverage = validateCrmCoreCp312Coverage(cp312PlanPack);

  assert.equal(CRM_CORE_CP312_PACK_BINDING.pack_id, "CP00-312");
  assert.equal(CRM_CORE_CP312_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP312_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP312_PACK_BINDING.range, "RP09.P06.M06.S04-RP09.P07.M03.S18");
  assert.equal(CRM_CORE_CP312_PACK_BINDING.upstream_pack_id, "CP00-311");
  assert.equal(CRM_CORE_CP312_PACK_BINDING.next_pack_id, "CP00-313");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P06"], 90);
  assert.equal(coverage.summary.by_phase["RP09.P07"], 60);
  assert.equal(Object.keys(CRM_CORE_CP312_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-312 P06 closeout and P07 failure foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp312P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP09.P07.M02"].rows;
  assert.equal(m02.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m02.permission_denied_failure.permission_decision_detail_included, false);
  assert.equal(m02.ambiguous_rule_failure.deny_over_allow_enforced, true);
  assert.equal(m02.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m02.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-312 evidence packets and handoff route the P06 closeout to the P07 failure phase", () => {
  const descriptor = createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createCrmCoreCp312HermesEvidencePacket(cp312PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp312ClaudeReviewPacket(cp312PlanPack);
  const handoff = createCrmCoreCp312CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-312-to-CP00-313");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M03.S19");
  assert.equal(handoff.production_ready_flag, "crm_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-313 plan binding covers the planned 10 RP09 failure slice units", () => {
  const coverage = validateCrmCoreCp313Coverage(cp313PlanPack);

  assert.equal(CRM_CORE_CP313_PACK_BINDING.pack_id, "CP00-313");
  assert.equal(CRM_CORE_CP313_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP313_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP313_PACK_BINDING.range, "RP09.P07.M03.S19-RP09.P07.M04.S06");
  assert.equal(CRM_CORE_CP313_PACK_BINDING.upstream_pack_id, "CP00-312");
  assert.equal(CRM_CORE_CP313_PACK_BINDING.next_pack_id, "CP00-314");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P07.M04"], 6);
});

test("CP00-313 failure slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp313FailureSliceCaseSet();
  const descriptor = createCrmCoreCp313FailureSliceDescriptor();
  const validation = validateCrmCoreCp313FailureSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P07.M03"].rows;
  assert.equal(m03.audit_failure_hint.audit_hint_detail_included, false);
  assert.equal(m03.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m03.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-313 evidence packets and handoff preserve failure slice authority boundaries", () => {
  const descriptor = createCrmCoreCp313FailureSliceDescriptor();
  const hermes = createCrmCoreCp313HermesEvidencePacket(cp313PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp313ClaudeReviewPacket(cp313PlanPack);
  const handoff = createCrmCoreCp313CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-313-to-CP00-314");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M04.S07");
  assert.equal(handoff.production_ready_flag, "crm_core_failure_slice_descriptor_verified");
});

test("CP00-314 plan binding covers the planned 10 RP09 failure binding slice units", () => {
  const coverage = validateCrmCoreCp314Coverage(cp314PlanPack);

  assert.equal(CRM_CORE_CP314_PACK_BINDING.pack_id, "CP00-314");
  assert.equal(CRM_CORE_CP314_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP314_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP314_PACK_BINDING.range, "RP09.P07.M04.S07-RP09.P07.M04.S16");
  assert.equal(CRM_CORE_CP314_PACK_BINDING.upstream_pack_id, "CP00-313");
  assert.equal(CRM_CORE_CP314_PACK_BINDING.next_pack_id, "CP00-315");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P07.M04"], 10);
});

test("CP00-314 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp314FailureBindingSliceCaseSet();
  const descriptor = createCrmCoreCp314FailureBindingSliceDescriptor();
  const validation = validateCrmCoreCp314FailureBindingSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP09.P07.M04"].rows;
  assert.equal(m04.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m04.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m04.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m04.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-314 evidence packets and handoff preserve failure binding slice authority boundaries", () => {
  const descriptor = createCrmCoreCp314FailureBindingSliceDescriptor();
  const hermes = createCrmCoreCp314HermesEvidencePacket(cp314PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp314ClaudeReviewPacket(cp314PlanPack);
  const handoff = createCrmCoreCp314CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-314-to-CP00-315");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M04.S17");
  assert.equal(handoff.production_ready_flag, "crm_core_failure_binding_slice_descriptor_verified");
});

test("CP00-315 plan binding covers the planned 40 RP09 failure tail slice units", () => {
  const coverage = validateCrmCoreCp315Coverage(cp315PlanPack);

  assert.equal(CRM_CORE_CP315_PACK_BINDING.pack_id, "CP00-315");
  assert.equal(CRM_CORE_CP315_PACK_BINDING.risk_class, "B");
  assert.equal(CRM_CORE_CP315_PACK_BINDING.unit_count, 40);
  assert.equal(CRM_CORE_CP315_PACK_BINDING.range, "RP09.P07.M04.S17-RP09.P07.M06.S14");
  assert.equal(CRM_CORE_CP315_PACK_BINDING.upstream_pack_id, "CP00-314");
  assert.equal(CRM_CORE_CP315_PACK_BINDING.next_pack_id, "CP00-316");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP09.P07.M05"], 22);
});

test("CP00-315 failure tail slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp315FailureTailSliceCaseSet();
  const descriptor = createCrmCoreCp315FailureTailSliceDescriptor();
  const validation = validateCrmCoreCp315FailureTailSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP09.P07.M05"].rows;
  assert.equal(m05.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m05.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m05.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-315 evidence packets and handoff preserve failure tail slice authority boundaries", () => {
  const descriptor = createCrmCoreCp315FailureTailSliceDescriptor();
  const hermes = createCrmCoreCp315HermesEvidencePacket(cp315PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp315ClaudeReviewPacket(cp315PlanPack);
  const handoff = createCrmCoreCp315CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-315-to-CP00-316");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M06.S15");
  assert.equal(handoff.production_ready_flag, "crm_core_failure_tail_slice_descriptor_verified");
});

test("CP00-316 plan binding covers the planned 10 RP09 failure fixture slice units", () => {
  const coverage = validateCrmCoreCp316Coverage(cp316PlanPack);

  assert.equal(CRM_CORE_CP316_PACK_BINDING.pack_id, "CP00-316");
  assert.equal(CRM_CORE_CP316_PACK_BINDING.risk_class, "A");
  assert.equal(CRM_CORE_CP316_PACK_BINDING.unit_count, 10);
  assert.equal(CRM_CORE_CP316_PACK_BINDING.range, "RP09.P07.M06.S15-RP09.P07.M07.S04");
  assert.equal(CRM_CORE_CP316_PACK_BINDING.upstream_pack_id, "CP00-315");
  assert.equal(CRM_CORE_CP316_PACK_BINDING.next_pack_id, "CP00-317");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP09.P07.M06"], 6);
});

test("CP00-316 failure fixture slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp316FailureFixtureSliceCaseSet();
  const descriptor = createCrmCoreCp316FailureFixtureSliceDescriptor();
  const validation = validateCrmCoreCp316FailureFixtureSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP09.P07.M06"].rows;
  assert.equal(m06.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(m06.failure_fixture.real_client_data_loaded, false);
  assert.equal(m06.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-316 evidence packets and handoff preserve failure fixture slice authority boundaries", () => {
  const descriptor = createCrmCoreCp316FailureFixtureSliceDescriptor();
  const hermes = createCrmCoreCp316HermesEvidencePacket(cp316PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp316ClaudeReviewPacket(cp316PlanPack);
  const handoff = createCrmCoreCp316CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-316-to-CP00-317");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M07.S05");
  assert.equal(handoff.production_ready_flag, "crm_core_failure_fixture_slice_descriptor_verified");
});

test("CP00-317 plan binding covers the planned 40 RP09 failure hermes slice units", () => {
  const coverage = validateCrmCoreCp317Coverage(cp317PlanPack);

  assert.equal(CRM_CORE_CP317_PACK_BINDING.pack_id, "CP00-317");
  assert.equal(CRM_CORE_CP317_PACK_BINDING.risk_class, "B");
  assert.equal(CRM_CORE_CP317_PACK_BINDING.unit_count, 40);
  assert.equal(CRM_CORE_CP317_PACK_BINDING.range, "RP09.P07.M07.S05-RP09.P07.M09.S02");
  assert.equal(CRM_CORE_CP317_PACK_BINDING.upstream_pack_id, "CP00-316");
  assert.equal(CRM_CORE_CP317_PACK_BINDING.next_pack_id, "CP00-318");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP09.P07.M08"], 20);
});

test("CP00-317 failure hermes slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp317FailureHermesSliceCaseSet();
  const descriptor = createCrmCoreCp317FailureHermesSliceDescriptor();
  const validation = validateCrmCoreCp317FailureHermesSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m08 = caseSet.sections["RP09.P07.M08"].rows;
  assert.equal(m08.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m08.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  const m07 = caseSet.sections["RP09.P07.M07"].rows;
  assert.equal(m07.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m07.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-317 evidence packets and handoff preserve failure hermes slice authority boundaries", () => {
  const descriptor = createCrmCoreCp317FailureHermesSliceDescriptor();
  const hermes = createCrmCoreCp317HermesEvidencePacket(cp317PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp317ClaudeReviewPacket(cp317PlanPack);
  const handoff = createCrmCoreCp317CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-317-to-CP00-318");
  assert.equal(handoff.next_subphase_id, "RP09.P07.M09.S03");
  assert.equal(handoff.production_ready_flag, "crm_core_failure_hermes_slice_descriptor_verified");
});

test("CP00-318 plan binding covers the planned 150 RP09 P07 closeout and P08 hermes foundation units", () => {
  const coverage = validateCrmCoreCp318Coverage(cp318PlanPack);

  assert.equal(CRM_CORE_CP318_PACK_BINDING.pack_id, "CP00-318");
  assert.equal(CRM_CORE_CP318_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP318_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP318_PACK_BINDING.range, "RP09.P07.M09.S03-RP09.P08.M08.S01");
  assert.equal(CRM_CORE_CP318_PACK_BINDING.upstream_pack_id, "CP00-317");
  assert.equal(CRM_CORE_CP318_PACK_BINDING.next_pack_id, "CP00-319");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P07"], 29);
  assert.equal(coverage.summary.by_phase["RP09.P08"], 121);
  assert.equal(Object.keys(CRM_CORE_CP318_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-318 P07 closeout and P08 hermes foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp318P07CloseoutP08HermesFoundationCaseSet();
  const descriptor = createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor();
  const validation = validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P08.M03"].rows;
  assert.equal(m03.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m03.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m03.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(m03.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-318 evidence packets and handoff route the P07 closeout to the P08 hermes phase", () => {
  const descriptor = createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor();
  const hermes = createCrmCoreCp318HermesEvidencePacket(cp318PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp318ClaudeReviewPacket(cp318PlanPack);
  const handoff = createCrmCoreCp318CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-318-to-CP00-319");
  assert.equal(handoff.next_subphase_id, "RP09.P08.M08.S02");
  assert.equal(handoff.production_ready_flag, "crm_core_p07_closeout_p08_hermes_foundation_descriptor_verified");
});

test("CP00-319 plan binding covers the planned 150 RP09 P08 closeout and P09 review foundation units", () => {
  const coverage = validateCrmCoreCp319Coverage(cp319PlanPack);

  assert.equal(CRM_CORE_CP319_PACK_BINDING.pack_id, "CP00-319");
  assert.equal(CRM_CORE_CP319_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP319_PACK_BINDING.unit_count, 150);
  assert.equal(CRM_CORE_CP319_PACK_BINDING.range, "RP09.P08.M08.S02-RP09.P09.M08.S08");
  assert.equal(CRM_CORE_CP319_PACK_BINDING.upstream_pack_id, "CP00-318");
  assert.equal(CRM_CORE_CP319_PACK_BINDING.next_pack_id, "CP00-320");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP09.P08"], 47);
  assert.equal(coverage.summary.by_phase["RP09.P09"], 103);
  assert.equal(Object.keys(CRM_CORE_CP319_REQUIREMENTS.required_section_rows).length, 12);
});

test("CP00-319 P08 closeout and P09 review foundation rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp319P08CloseoutP09ReviewFoundationCaseSet();
  const descriptor = createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor();
  const validation = validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 12);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP09.P09.M03"].rows;
  assert.equal(m03.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m03.ui_leak_questions.leak_detected, false);
  assert.equal(m03.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-319 evidence packets and handoff route the P08 closeout to the P09 review phase", () => {
  const descriptor = createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor();
  const hermes = createCrmCoreCp319HermesEvidencePacket(cp319PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp319ClaudeReviewPacket(cp319PlanPack);
  const handoff = createCrmCoreCp319CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-319-to-CP00-320");
  assert.equal(handoff.next_subphase_id, "RP09.P09.M09.S01");
  assert.equal(handoff.production_ready_flag, "crm_core_p08_closeout_p09_review_foundation_descriptor_verified");
});

test("CP00-320 plan binding covers the planned 12 RP09 review closeout units", () => {
  const coverage = validateCrmCoreCp320Coverage(cp320PlanPack);

  assert.equal(CRM_CORE_CP320_PACK_BINDING.pack_id, "CP00-320");
  assert.equal(CRM_CORE_CP320_PACK_BINDING.risk_class, "C");
  assert.equal(CRM_CORE_CP320_PACK_BINDING.unit_count, 12);
  assert.equal(CRM_CORE_CP320_PACK_BINDING.range, "RP09.P09.M09.S01-RP09.P09.M10.S04");
  assert.equal(CRM_CORE_CP320_PACK_BINDING.upstream_pack_id, "CP00-319");
  assert.equal(CRM_CORE_CP320_PACK_BINDING.next_pack_id, "CP00-321");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 12);
  assert.equal(coverage.summary.by_micro_phase["RP09.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP09.P09.M10"], 4);
  assert.equal(Object.keys(CRM_CORE_CP320_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-320 review closeout slice rows stay descriptor-only", () => {
  const caseSet = createCrmCoreCp320ReviewCloseoutSliceCaseSet();
  const descriptor = createCrmCoreCp320ReviewCloseoutSliceDescriptor();
  const validation = validateCrmCoreCp320ReviewCloseoutSliceDescriptor(descriptor, crmContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[crmCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m09 = caseSet.sections["RP09.P09.M09"].rows;
  assert.equal(m09.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m09.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-320 evidence packets and handoff close RP09 and route to RP10", () => {
  const descriptor = createCrmCoreCp320ReviewCloseoutSliceDescriptor();
  const hermes = createCrmCoreCp320HermesEvidencePacket(cp320PlanPack, crmContract, descriptor);
  const claude = createCrmCoreCp320ClaudeReviewPacket(cp320PlanPack);
  const handoff = createCrmCoreCp320CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-320-to-CP00-321");
  assert.equal(handoff.next_subphase_id, "RP10.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "crm_core_review_closeout_slice_descriptor_verified");
});
