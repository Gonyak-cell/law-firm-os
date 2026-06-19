import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  INTAKE_CORE_CP321_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP321_PACK_BINDING,
  INTAKE_CORE_CP321_REQUIREMENTS,
  INTAKE_CORE_CP322_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP322_PACK_BINDING,
  INTAKE_CORE_CP322_REQUIREMENTS,
  INTAKE_CORE_CP323_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP323_PACK_BINDING,
  INTAKE_CORE_CP323_REQUIREMENTS,
  INTAKE_CORE_CP324_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP324_PACK_BINDING,
  INTAKE_CORE_CP324_REQUIREMENTS,
  INTAKE_CORE_CP325_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP325_PACK_BINDING,
  INTAKE_CORE_CP325_REQUIREMENTS,
  INTAKE_CORE_CP326_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP326_PACK_BINDING,
  INTAKE_CORE_CP326_REQUIREMENTS,
  INTAKE_CORE_CP327_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP327_PACK_BINDING,
  INTAKE_CORE_CP327_REQUIREMENTS,
  INTAKE_CORE_CP328_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP328_PACK_BINDING,
  INTAKE_CORE_CP328_REQUIREMENTS,
  INTAKE_CORE_CP329_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP329_PACK_BINDING,
  INTAKE_CORE_CP329_REQUIREMENTS,
  INTAKE_CORE_CP330_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP330_PACK_BINDING,
  INTAKE_CORE_CP330_REQUIREMENTS,
  INTAKE_CORE_CP331_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP331_PACK_BINDING,
  INTAKE_CORE_CP331_REQUIREMENTS,
  INTAKE_CORE_CP332_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP332_PACK_BINDING,
  INTAKE_CORE_CP332_REQUIREMENTS,
  INTAKE_CORE_CP333_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP333_PACK_BINDING,
  INTAKE_CORE_CP333_REQUIREMENTS,
  INTAKE_CORE_CP334_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP334_PACK_BINDING,
  INTAKE_CORE_CP334_REQUIREMENTS,
  INTAKE_CORE_CP335_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP335_PACK_BINDING,
  INTAKE_CORE_CP335_REQUIREMENTS,
  INTAKE_CORE_CP336_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP336_PACK_BINDING,
  INTAKE_CORE_CP336_REQUIREMENTS,
  INTAKE_CORE_CP337_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP337_PACK_BINDING,
  INTAKE_CORE_CP337_REQUIREMENTS,
  INTAKE_CORE_CP338_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP338_PACK_BINDING,
  INTAKE_CORE_CP338_REQUIREMENTS,
  INTAKE_CORE_CP339_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP339_PACK_BINDING,
  INTAKE_CORE_CP339_REQUIREMENTS,
  INTAKE_CORE_CP340_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP340_PACK_BINDING,
  INTAKE_CORE_CP340_REQUIREMENTS,
  INTAKE_CORE_CP341_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP341_PACK_BINDING,
  INTAKE_CORE_CP341_REQUIREMENTS,
  INTAKE_CORE_PROGRAM_CONTRACT,
  createIntakeCoreCp321ClaudeReviewPacket,
  createIntakeCoreCp321CloseoutHandoff,
  createIntakeCoreCp321HermesEvidencePacket,
  createIntakeCoreCp321ScopeContractFoundationCaseSet,
  createIntakeCoreCp321ScopeContractFoundationDescriptor,
  createIntakeCoreCp322ClaudeReviewPacket,
  createIntakeCoreCp322CloseoutHandoff,
  createIntakeCoreCp322HermesEvidencePacket,
  createIntakeCoreCp322P01CloseoutP02ServiceFoundationCaseSet,
  createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor,
  createIntakeCoreCp323ClaudeReviewPacket,
  createIntakeCoreCp323CloseoutHandoff,
  createIntakeCoreCp323HermesEvidencePacket,
  createIntakeCoreCp323ServiceSliceCaseSet,
  createIntakeCoreCp323ServiceSliceDescriptor,
  createIntakeCoreCp324ClaudeReviewPacket,
  createIntakeCoreCp324CloseoutHandoff,
  createIntakeCoreCp324HermesEvidencePacket,
  createIntakeCoreCp324ServiceReviewSliceCaseSet,
  createIntakeCoreCp324ServiceReviewSliceDescriptor,
  createIntakeCoreCp325ClaudeReviewPacket,
  createIntakeCoreCp325CloseoutHandoff,
  createIntakeCoreCp325HermesEvidencePacket,
  createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createIntakeCoreCp326ClaudeReviewPacket,
  createIntakeCoreCp326CloseoutHandoff,
  createIntakeCoreCp326HermesEvidencePacket,
  createIntakeCoreCp326UiWorkflowSliceCaseSet,
  createIntakeCoreCp326UiWorkflowSliceDescriptor,
  createIntakeCoreCp327ClaudeReviewPacket,
  createIntakeCoreCp327CloseoutHandoff,
  createIntakeCoreCp327HermesEvidencePacket,
  createIntakeCoreCp327PermissionAuditFixtureCaseSet,
  createIntakeCoreCp327PermissionAuditFixtureDescriptor,
  createIntakeCoreCp328ClaudeReviewPacket,
  createIntakeCoreCp328CloseoutHandoff,
  createIntakeCoreCp328HermesEvidencePacket,
  createIntakeCoreCp328P04CloseoutP05PermissionFoundationCaseSet,
  createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor,
  createIntakeCoreCp329ClaudeReviewPacket,
  createIntakeCoreCp329CloseoutHandoff,
  createIntakeCoreCp329HermesEvidencePacket,
  createIntakeCoreCp329PermissionFixtureTailCaseSet,
  createIntakeCoreCp329PermissionFixtureTailDescriptor,
  createIntakeCoreCp330ClaudeReviewPacket,
  createIntakeCoreCp330CloseoutHandoff,
  createIntakeCoreCp330HermesEvidencePacket,
  createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationCaseSet,
  createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor,
  createIntakeCoreCp331ClaudeReviewPacket,
  createIntakeCoreCp331CloseoutHandoff,
  createIntakeCoreCp331HermesEvidencePacket,
  createIntakeCoreCp331PermissionMatrixSliceCaseSet,
  createIntakeCoreCp331PermissionMatrixSliceDescriptor,
  createIntakeCoreCp332ClaudeReviewPacket,
  createIntakeCoreCp332CloseoutHandoff,
  createIntakeCoreCp332HermesEvidencePacket,
  createIntakeCoreCp332PermissionBindingSliceCaseSet,
  createIntakeCoreCp332PermissionBindingSliceDescriptor,
  createIntakeCoreCp333ClaudeReviewPacket,
  createIntakeCoreCp333CloseoutHandoff,
  createIntakeCoreCp333HermesEvidencePacket,
  createIntakeCoreCp333P06CloseoutP07FailureFoundationCaseSet,
  createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor,
  createIntakeCoreCp334ClaudeReviewPacket,
  createIntakeCoreCp334CloseoutHandoff,
  createIntakeCoreCp334FailureSliceCaseSet,
  createIntakeCoreCp334FailureSliceDescriptor,
  createIntakeCoreCp334HermesEvidencePacket,
  createIntakeCoreCp335ClaudeReviewPacket,
  createIntakeCoreCp335CloseoutHandoff,
  createIntakeCoreCp335FailureBindingSliceCaseSet,
  createIntakeCoreCp335FailureBindingSliceDescriptor,
  createIntakeCoreCp335HermesEvidencePacket,
  createIntakeCoreCp336ClaudeReviewPacket,
  createIntakeCoreCp336CloseoutHandoff,
  createIntakeCoreCp336FailureTailSliceCaseSet,
  createIntakeCoreCp336FailureTailSliceDescriptor,
  createIntakeCoreCp336HermesEvidencePacket,
  createIntakeCoreCp337ClaudeReviewPacket,
  createIntakeCoreCp337CloseoutHandoff,
  createIntakeCoreCp337HermesEvidencePacket,
  createIntakeCoreCp337P07CloseoutP08HermesFoundationCaseSet,
  createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor,
  createIntakeCoreCp338ClaudeReviewPacket,
  createIntakeCoreCp338CloseoutHandoff,
  createIntakeCoreCp338HermesEvidencePacket,
  createIntakeCoreCp338HermesSliceCaseSet,
  createIntakeCoreCp338HermesSliceDescriptor,
  createIntakeCoreCp339ClaudeReviewPacket,
  createIntakeCoreCp339CloseoutHandoff,
  createIntakeCoreCp339HermesEvidencePacket,
  createIntakeCoreCp339P08CloseoutP09ReviewFoundationCaseSet,
  createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor,
  createIntakeCoreCp340ClaudeReviewPacket,
  createIntakeCoreCp340CloseoutHandoff,
  createIntakeCoreCp340HermesEvidencePacket,
  createIntakeCoreCp340ReviewSliceCaseSet,
  createIntakeCoreCp340ReviewSliceDescriptor,
  createIntakeCoreCp341ClaudeReviewPacket,
  createIntakeCoreCp341CloseoutHandoff,
  createIntakeCoreCp341HermesEvidencePacket,
  createIntakeCoreCp341ReviewCloseoutSliceCaseSet,
  createIntakeCoreCp341ReviewCloseoutSliceDescriptor,
  intakeCoreRowKey,
  validateIntakeCoreCp321Coverage,
  validateIntakeCoreCp321ScopeContractFoundationDescriptor,
  validateIntakeCoreCp322Coverage,
  validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor,
  validateIntakeCoreCp323Coverage,
  validateIntakeCoreCp323ServiceSliceDescriptor,
  validateIntakeCoreCp324Coverage,
  validateIntakeCoreCp324ServiceReviewSliceDescriptor,
  validateIntakeCoreCp325Coverage,
  validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  validateIntakeCoreCp326Coverage,
  validateIntakeCoreCp326UiWorkflowSliceDescriptor,
  validateIntakeCoreCp327Coverage,
  validateIntakeCoreCp327PermissionAuditFixtureDescriptor,
  validateIntakeCoreCp328Coverage,
  validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor,
  validateIntakeCoreCp329Coverage,
  validateIntakeCoreCp329PermissionFixtureTailDescriptor,
  validateIntakeCoreCp330Coverage,
  validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor,
  validateIntakeCoreCp331Coverage,
  validateIntakeCoreCp331PermissionMatrixSliceDescriptor,
  validateIntakeCoreCp332Coverage,
  validateIntakeCoreCp332PermissionBindingSliceDescriptor,
  validateIntakeCoreCp333Coverage,
  validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor,
  validateIntakeCoreCp334Coverage,
  validateIntakeCoreCp334FailureSliceDescriptor,
  validateIntakeCoreCp335Coverage,
  validateIntakeCoreCp335FailureBindingSliceDescriptor,
  validateIntakeCoreCp336Coverage,
  validateIntakeCoreCp336FailureTailSliceDescriptor,
  validateIntakeCoreCp337Coverage,
  validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor,
  validateIntakeCoreCp338Coverage,
  validateIntakeCoreCp338HermesSliceDescriptor,
  validateIntakeCoreCp339Coverage,
  validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor,
  validateIntakeCoreCp340Coverage,
  validateIntakeCoreCp340ReviewSliceDescriptor,
  validateIntakeCoreCp341Coverage,
  validateIntakeCoreCp341ReviewCloseoutSliceDescriptor,
} from "../src/index.js";

const intakeContract = JSON.parse(
  readFileSync(new URL("../../../contracts/intake-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp321ManifestPath = new URL("../../../docs/closeout-packs/cp00-321/manifest.json", import.meta.url);
const cp321Manifest = existsSync(cp321ManifestPath) ? JSON.parse(readFileSync(cp321ManifestPath, "utf8")) : null;
const cp321PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-321") ?? cp321Manifest?.plan_binding_snapshot;
const cp322ManifestPath = new URL("../../../docs/closeout-packs/cp00-322/manifest.json", import.meta.url);
const cp322Manifest = existsSync(cp322ManifestPath) ? JSON.parse(readFileSync(cp322ManifestPath, "utf8")) : null;
const cp322PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-322") ?? cp322Manifest?.plan_binding_snapshot;
const cp323ManifestPath = new URL("../../../docs/closeout-packs/cp00-323/manifest.json", import.meta.url);
const cp323Manifest = existsSync(cp323ManifestPath) ? JSON.parse(readFileSync(cp323ManifestPath, "utf8")) : null;
const cp323PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-323") ?? cp323Manifest?.plan_binding_snapshot;
const cp324ManifestPath = new URL("../../../docs/closeout-packs/cp00-324/manifest.json", import.meta.url);
const cp324Manifest = existsSync(cp324ManifestPath) ? JSON.parse(readFileSync(cp324ManifestPath, "utf8")) : null;
const cp324PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-324") ?? cp324Manifest?.plan_binding_snapshot;
const cp325ManifestPath = new URL("../../../docs/closeout-packs/cp00-325/manifest.json", import.meta.url);
const cp325Manifest = existsSync(cp325ManifestPath) ? JSON.parse(readFileSync(cp325ManifestPath, "utf8")) : null;
const cp325PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-325") ?? cp325Manifest?.plan_binding_snapshot;
const cp326ManifestPath = new URL("../../../docs/closeout-packs/cp00-326/manifest.json", import.meta.url);
const cp326Manifest = existsSync(cp326ManifestPath) ? JSON.parse(readFileSync(cp326ManifestPath, "utf8")) : null;
const cp326PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-326") ?? cp326Manifest?.plan_binding_snapshot;
const cp327ManifestPath = new URL("../../../docs/closeout-packs/cp00-327/manifest.json", import.meta.url);
const cp327Manifest = existsSync(cp327ManifestPath) ? JSON.parse(readFileSync(cp327ManifestPath, "utf8")) : null;
const cp327PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-327") ?? cp327Manifest?.plan_binding_snapshot;
const cp328ManifestPath = new URL("../../../docs/closeout-packs/cp00-328/manifest.json", import.meta.url);
const cp328Manifest = existsSync(cp328ManifestPath) ? JSON.parse(readFileSync(cp328ManifestPath, "utf8")) : null;
const cp328PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-328") ?? cp328Manifest?.plan_binding_snapshot;
const cp329ManifestPath = new URL("../../../docs/closeout-packs/cp00-329/manifest.json", import.meta.url);
const cp329Manifest = existsSync(cp329ManifestPath) ? JSON.parse(readFileSync(cp329ManifestPath, "utf8")) : null;
const cp329PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-329") ?? cp329Manifest?.plan_binding_snapshot;
const cp330ManifestPath = new URL("../../../docs/closeout-packs/cp00-330/manifest.json", import.meta.url);
const cp330Manifest = existsSync(cp330ManifestPath) ? JSON.parse(readFileSync(cp330ManifestPath, "utf8")) : null;
const cp330PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-330") ?? cp330Manifest?.plan_binding_snapshot;
const cp331ManifestPath = new URL("../../../docs/closeout-packs/cp00-331/manifest.json", import.meta.url);
const cp331Manifest = existsSync(cp331ManifestPath) ? JSON.parse(readFileSync(cp331ManifestPath, "utf8")) : null;
const cp331PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-331") ?? cp331Manifest?.plan_binding_snapshot;
const cp332ManifestPath = new URL("../../../docs/closeout-packs/cp00-332/manifest.json", import.meta.url);
const cp332Manifest = existsSync(cp332ManifestPath) ? JSON.parse(readFileSync(cp332ManifestPath, "utf8")) : null;
const cp332PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-332") ?? cp332Manifest?.plan_binding_snapshot;
const cp333ManifestPath = new URL("../../../docs/closeout-packs/cp00-333/manifest.json", import.meta.url);
const cp333Manifest = existsSync(cp333ManifestPath) ? JSON.parse(readFileSync(cp333ManifestPath, "utf8")) : null;
const cp333PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-333") ?? cp333Manifest?.plan_binding_snapshot;
const cp334ManifestPath = new URL("../../../docs/closeout-packs/cp00-334/manifest.json", import.meta.url);
const cp334Manifest = existsSync(cp334ManifestPath) ? JSON.parse(readFileSync(cp334ManifestPath, "utf8")) : null;
const cp334PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-334") ?? cp334Manifest?.plan_binding_snapshot;
const cp335ManifestPath = new URL("../../../docs/closeout-packs/cp00-335/manifest.json", import.meta.url);
const cp335Manifest = existsSync(cp335ManifestPath) ? JSON.parse(readFileSync(cp335ManifestPath, "utf8")) : null;
const cp335PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-335") ?? cp335Manifest?.plan_binding_snapshot;
const cp336ManifestPath = new URL("../../../docs/closeout-packs/cp00-336/manifest.json", import.meta.url);
const cp336Manifest = existsSync(cp336ManifestPath) ? JSON.parse(readFileSync(cp336ManifestPath, "utf8")) : null;
const cp336PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-336") ?? cp336Manifest?.plan_binding_snapshot;
const cp337ManifestPath = new URL("../../../docs/closeout-packs/cp00-337/manifest.json", import.meta.url);
const cp337Manifest = existsSync(cp337ManifestPath) ? JSON.parse(readFileSync(cp337ManifestPath, "utf8")) : null;
const cp337PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-337") ?? cp337Manifest?.plan_binding_snapshot;
const cp338ManifestPath = new URL("../../../docs/closeout-packs/cp00-338/manifest.json", import.meta.url);
const cp338Manifest = existsSync(cp338ManifestPath) ? JSON.parse(readFileSync(cp338ManifestPath, "utf8")) : null;
const cp338PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-338") ?? cp338Manifest?.plan_binding_snapshot;
const cp339ManifestPath = new URL("../../../docs/closeout-packs/cp00-339/manifest.json", import.meta.url);
const cp339Manifest = existsSync(cp339ManifestPath) ? JSON.parse(readFileSync(cp339ManifestPath, "utf8")) : null;
const cp339PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-339") ?? cp339Manifest?.plan_binding_snapshot;
const cp340ManifestPath = new URL("../../../docs/closeout-packs/cp00-340/manifest.json", import.meta.url);
const cp340Manifest = existsSync(cp340ManifestPath) ? JSON.parse(readFileSync(cp340ManifestPath, "utf8")) : null;
const cp340PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-340") ?? cp340Manifest?.plan_binding_snapshot;
const cp341ManifestPath = new URL("../../../docs/closeout-packs/cp00-341/manifest.json", import.meta.url);
const cp341Manifest = existsSync(cp341ManifestPath) ? JSON.parse(readFileSync(cp341ManifestPath, "utf8")) : null;
const cp341PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-341") ?? cp341Manifest?.plan_binding_snapshot;

test("RP10 program contract pins the Intake descriptor-only bootstrap", () => {
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.program_id, "RP10");
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.program_title, "Intake Conflict Engagement");
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP08");
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.hermes_gate, "H10");
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.claude_gate, "C10");
  assert.equal(INTAKE_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(
    [
      "CP00-321",
      "CP00-322",
      "CP00-323",
      "CP00-324",
      "CP00-325",
      "CP00-326",
      "CP00-327",
      "CP00-328",
      "CP00-329",
      "CP00-330",
      "CP00-331",
      "CP00-332",
      "CP00-333",
      "CP00-334",
      "CP00-335",
      "CP00-336",
      "CP00-337",
      "CP00-338",
      "CP00-339",
      "CP00-340",
      "CP00-341",
    ].includes(intakeContract.current_pack.pack_id),
  );
  assert.equal(intakeContract.program.program_id, "RP10");
});

test("CP00-321 plan binding covers the planned 150 RP10 scope and model foundation units", () => {
  const coverage = validateIntakeCoreCp321Coverage(cp321PlanPack);

  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.pack_id, "CP00-321");
  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.range, "RP10.P00.M00.S01-RP10.P01.M08.S05");
  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.upstream_pack_id, "CP00-320");
  assert.equal(INTAKE_CORE_CP321_PACK_BINDING.next_pack_id, "CP00-322");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P00"], 52);
  assert.equal(coverage.summary.by_phase["RP10.P01"], 98);
  assert.equal(Object.keys(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows).length, 20);
});

test("CP00-321 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp321ScopeContractFoundationCaseSet();
  const descriptor = createIntakeCoreCp321ScopeContractFoundationDescriptor();
  const validation = validateIntakeCoreCp321ScopeContractFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 20);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.intake_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP10.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.claude_model_review_prompt.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-321 evidence packets and handoff preserve intake bootstrap authority boundaries", () => {
  const descriptor = createIntakeCoreCp321ScopeContractFoundationDescriptor();
  const hermes = createIntakeCoreCp321HermesEvidencePacket(cp321PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp321ClaudeReviewPacket(cp321PlanPack);
  const handoff = createIntakeCoreCp321CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H10");
  assert.equal(claude.gate, "C10");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-321-to-CP00-322");
  assert.equal(handoff.next_subphase_id, "RP10.P01.M08.S06");
  assert.equal(handoff.production_ready_flag, "intake_core_scope_contract_foundation_descriptor_verified");
  assert.equal(INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-322 plan binding covers the planned 150 RP10 P01 closeout and P02 service foundation units", () => {
  const coverage = validateIntakeCoreCp322Coverage(cp322PlanPack);

  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.pack_id, "CP00-322");
  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.range, "RP10.P01.M08.S06-RP10.P02.M07.S06");
  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.upstream_pack_id, "CP00-321");
  assert.equal(INTAKE_CORE_CP322_PACK_BINDING.next_pack_id, "CP00-323");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P01"], 14);
  assert.equal(coverage.summary.by_phase["RP10.P02"], 136);
  assert.equal(Object.keys(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-322 P01 closeout and P02 service foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp322P01CloseoutP02ServiceFoundationCaseSet();
  const descriptor = createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor();
  const validation = validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P02.M05"].rows;
  assert.equal(m05.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m05.permission_precheck.permission_decision_detail_included, false);
  assert.equal(m05.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m05.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-322 evidence packets and handoff route the P01 closeout to the P02 service phase", () => {
  const descriptor = createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor();
  const hermes = createIntakeCoreCp322HermesEvidencePacket(cp322PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp322ClaudeReviewPacket(cp322PlanPack);
  const handoff = createIntakeCoreCp322CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-322-to-CP00-323");
  assert.equal(handoff.next_subphase_id, "RP10.P02.M07.S07");
  assert.equal(handoff.production_ready_flag, "intake_core_p01_closeout_p02_service_foundation_descriptor_verified");
});

test("CP00-323 plan binding covers the planned 40 RP10 service slice units", () => {
  const coverage = validateIntakeCoreCp323Coverage(cp323PlanPack);

  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.pack_id, "CP00-323");
  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.range, "RP10.P02.M07.S07-RP10.P02.M09.S02");
  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.upstream_pack_id, "CP00-322");
  assert.equal(INTAKE_CORE_CP323_PACK_BINDING.next_pack_id, "CP00-324");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P02.M07"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP10.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP10.P02.M09"], 2);
  assert.equal(Object.keys(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows).length, 3);
});

test("CP00-323 service slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp323ServiceSliceCaseSet();
  const descriptor = createIntakeCoreCp323ServiceSliceDescriptor();
  const validation = validateIntakeCoreCp323ServiceSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m08 = caseSet.sections["RP10.P02.M08"].rows;
  assert.equal(m08.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m08.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m08.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m08.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-323 evidence packets and handoff route the service slice to CP00-324", () => {
  const descriptor = createIntakeCoreCp323ServiceSliceDescriptor();
  const hermes = createIntakeCoreCp323HermesEvidencePacket(cp323PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp323ClaudeReviewPacket(cp323PlanPack);
  const handoff = createIntakeCoreCp323CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-323-to-CP00-324");
  assert.equal(handoff.next_subphase_id, "RP10.P02.M09.S03");
  assert.equal(handoff.production_ready_flag, "intake_core_service_slice_descriptor_verified");
});

test("CP00-324 plan binding covers the planned 10 RP10 service review slice units", () => {
  const coverage = validateIntakeCoreCp324Coverage(cp324PlanPack);

  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.pack_id, "CP00-324");
  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.range, "RP10.P02.M09.S03-RP10.P02.M09.S12");
  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.upstream_pack_id, "CP00-323");
  assert.equal(INTAKE_CORE_CP324_PACK_BINDING.next_pack_id, "CP00-325");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P02.M09"], 10);
  assert.equal(Object.keys(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows).length, 1);
});

test("CP00-324 service review slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp324ServiceReviewSliceCaseSet();
  const descriptor = createIntakeCoreCp324ServiceReviewSliceDescriptor();
  const validation = validateIntakeCoreCp324ServiceReviewSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m09 = caseSet.sections["RP10.P02.M09"].rows;
  assert.equal(m09.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m09.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m09.persistence_boundary.creates_database_rows, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-324 evidence packets and handoff route the service review slice to CP00-325", () => {
  const descriptor = createIntakeCoreCp324ServiceReviewSliceDescriptor();
  const hermes = createIntakeCoreCp324HermesEvidencePacket(cp324PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp324ClaudeReviewPacket(cp324PlanPack);
  const handoff = createIntakeCoreCp324CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-324-to-CP00-325");
  assert.equal(handoff.next_subphase_id, "RP10.P02.M09.S13");
  assert.equal(handoff.production_ready_flag, "intake_core_service_review_slice_descriptor_verified");
});

test("CP00-325 plan binding covers the planned 150 RP10 P02 closeout P03 interface P04 UI units", () => {
  const coverage = validateIntakeCoreCp325Coverage(cp325PlanPack);

  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.pack_id, "CP00-325");
  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.range, "RP10.P02.M09.S13-RP10.P04.M02.S07");
  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.upstream_pack_id, "CP00-324");
  assert.equal(INTAKE_CORE_CP325_PACK_BINDING.next_pack_id, "CP00-326");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P02"], 19);
  assert.equal(coverage.summary.by_phase["RP10.P03"], 112);
  assert.equal(coverage.summary.by_phase["RP10.P04"], 19);
  assert.equal(Object.keys(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows).length, 16);
});

test("CP00-325 interface and UI foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  const descriptor = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const validation = validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 16);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P03.M03"].rows;
  assert.equal(m03.permission_annotation.permission_decision_detail_included, false);
  assert.equal(m03.pagination_or_filtering_contract.no_unauthorized_count_leak, true);
  assert.equal(m03.api_fixture.real_client_data_loaded, false);
  assert.equal(m03.claude_interface_prompt.claude_final_approval_claimed, false);
  const m01 = caseSet.sections["RP10.P04.M01"].rows;
  assert.equal(m01.empty_state.no_unauthorized_count_leak, true);
  assert.equal(m01.denied_state.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-325 evidence packets and handoff close P02/P03 and route to the P04 UI phase", () => {
  const descriptor = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const hermes = createIntakeCoreCp325HermesEvidencePacket(cp325PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp325ClaudeReviewPacket(cp325PlanPack);
  const handoff = createIntakeCoreCp325CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-325-to-CP00-326");
  assert.equal(handoff.next_subphase_id, "RP10.P04.M02.S08");
  assert.equal(handoff.production_ready_flag, "intake_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor_verified");
});

test("CP00-326 plan binding covers the planned 40 RP10 UI workflow slice units", () => {
  const coverage = validateIntakeCoreCp326Coverage(cp326PlanPack);

  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.pack_id, "CP00-326");
  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.range, "RP10.P04.M02.S08-RP10.P04.M04.S17");
  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.upstream_pack_id, "CP00-325");
  assert.equal(INTAKE_CORE_CP326_PACK_BINDING.next_pack_id, "CP00-327");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP10.P04.M04"], 17);
  assert.equal(Object.keys(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows).length, 3);
});

test("CP00-326 UI workflow slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp326UiWorkflowSliceCaseSet();
  const descriptor = createIntakeCoreCp326UiWorkflowSliceDescriptor();
  const validation = validateIntakeCoreCp326UiWorkflowSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P04.M03"].rows;
  assert.equal(m03.permission_badge.permission_decision_detail_included, false);
  assert.equal(m03.build_smoke.executes_ui_runtime, false);
  assert.equal(m03.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(m03.no_unauthorized_count_leak.no_unauthorized_count_leak, true);
  assert.equal(m03.state_snapshot.raw_payload_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-326 evidence packets and handoff route the UI workflow slice to CP00-327", () => {
  const descriptor = createIntakeCoreCp326UiWorkflowSliceDescriptor();
  const hermes = createIntakeCoreCp326HermesEvidencePacket(cp326PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp326ClaudeReviewPacket(cp326PlanPack);
  const handoff = createIntakeCoreCp326CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-326-to-CP00-327");
  assert.equal(handoff.next_subphase_id, "RP10.P04.M04.S18");
  assert.equal(handoff.production_ready_flag, "intake_core_ui_workflow_slice_descriptor_verified");
});

test("CP00-327 plan binding covers the planned 40 RP10 permission/audit fixture units", () => {
  const coverage = validateIntakeCoreCp327Coverage(cp327PlanPack);

  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.pack_id, "CP00-327");
  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.range, "RP10.P04.M04.S18-RP10.P04.M06.S15");
  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.upstream_pack_id, "CP00-326");
  assert.equal(INTAKE_CORE_CP327_PACK_BINDING.next_pack_id, "CP00-328");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P04.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP10.P04.M06"], 15);
  assert.equal(Object.keys(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows).length, 3);
});

test("CP00-327 permission/audit fixture rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp327PermissionAuditFixtureCaseSet();
  const descriptor = createIntakeCoreCp327PermissionAuditFixtureDescriptor();
  const validation = validateIntakeCoreCp327PermissionAuditFixtureDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P04.M05"].rows;
  assert.equal(m05.permission_badge.permission_decision_detail_included, false);
  assert.equal(m05.audit_hint_display.audit_hint_detail_included, false);
  assert.equal(m05.synthetic_fixture_binding.real_client_data_loaded, false);
  assert.equal(m05.no_unauthorized_count_leak.no_unauthorized_count_leak, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(INTAKE_CORE_CP327_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
});

test("CP00-327 evidence packets and handoff route the permission/audit fixture slice to CP00-328", () => {
  const descriptor = createIntakeCoreCp327PermissionAuditFixtureDescriptor();
  const hermes = createIntakeCoreCp327HermesEvidencePacket(cp327PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp327ClaudeReviewPacket(cp327PlanPack);
  const handoff = createIntakeCoreCp327CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-327-to-CP00-328");
  assert.equal(handoff.next_subphase_id, "RP10.P04.M06.S16");
  assert.equal(handoff.production_ready_flag, "intake_core_permission_audit_fixture_descriptor_verified");
});

test("CP00-328 plan binding covers the planned 150 RP10 P04 closeout and P05 permission foundation units", () => {
  const coverage = validateIntakeCoreCp328Coverage(cp328PlanPack);

  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.pack_id, "CP00-328");
  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.range, "RP10.P04.M06.S16-RP10.P05.M05.S13");
  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.upstream_pack_id, "CP00-327");
  assert.equal(INTAKE_CORE_CP328_PACK_BINDING.next_pack_id, "CP00-329");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P04"], 75);
  assert.equal(coverage.summary.by_phase["RP10.P05"], 75);
  assert.equal(coverage.summary.by_micro_phase["RP10.P05.M03"], 22);
  assert.equal(Object.keys(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-328 P04 closeout and P05 permission foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp328P04CloseoutP05PermissionFoundationCaseSet();
  const descriptor = createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor();
  const validation = validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P05.M03"].rows;
  assert.equal(m03.base_tenant_fixture.real_client_data_loaded, false);
  assert.equal(m03.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m03.audit_hint_case.audit_hint_detail_included, false);
  assert.equal(m03.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m03.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m03.replay_command.executes_command_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(INTAKE_CORE_CP328_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
});

test("CP00-328 evidence packets and handoff route P05 permission foundation to CP00-329", () => {
  const descriptor = createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor();
  const hermes = createIntakeCoreCp328HermesEvidencePacket(cp328PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp328ClaudeReviewPacket(cp328PlanPack);
  const handoff = createIntakeCoreCp328CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-328-to-CP00-329");
  assert.equal(handoff.next_subphase_id, "RP10.P05.M05.S14");
  assert.equal(handoff.production_ready_flag, "intake_core_p04_closeout_p05_permission_foundation_descriptor_verified");
});

test("CP00-329 plan binding covers the planned 10 RP10 permission fixture tail units", () => {
  const coverage = validateIntakeCoreCp329Coverage(cp329PlanPack);

  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.pack_id, "CP00-329");
  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.range, "RP10.P05.M05.S14-RP10.P05.M06.S01");
  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.upstream_pack_id, "CP00-328");
  assert.equal(INTAKE_CORE_CP329_PACK_BINDING.next_pack_id, "CP00-330");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP10.P05"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P05.M05"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP10.P05.M06"], 1);
  assert.equal(Object.keys(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-329 permission fixture tail rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp329PermissionFixtureTailCaseSet();
  const descriptor = createIntakeCoreCp329PermissionFixtureTailDescriptor();
  const validation = validateIntakeCoreCp329PermissionFixtureTailDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P05.M05"].rows;
  const m06 = caseSet.sections["RP10.P05.M06"].rows;
  assert.equal(m05.fixture_manifest.real_client_data_loaded, false);
  assert.equal(m05.golden_test.executes_unit_test_runtime_paths, false);
  assert.equal(m05.failure_test.executes_unit_test_runtime_paths, false);
  assert.equal(m05.hermes_fixture_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(m05.replay_command.executes_command_runtime, false);
  assert.equal(m06.base_tenant_fixture.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(INTAKE_CORE_CP329_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
});

test("CP00-329 evidence packets and handoff route permission fixture tail to CP00-330", () => {
  const descriptor = createIntakeCoreCp329PermissionFixtureTailDescriptor();
  const hermes = createIntakeCoreCp329HermesEvidencePacket(cp329PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp329ClaudeReviewPacket(cp329PlanPack);
  const handoff = createIntakeCoreCp329CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-329-to-CP00-330");
  assert.equal(handoff.next_subphase_id, "RP10.P05.M06.S02");
  assert.equal(handoff.production_ready_flag, "intake_core_permission_fixture_tail_descriptor_verified");
});

test("CP00-330 plan binding covers the planned P05 fixture closeout and P06 permission matrix foundation units", () => {
  const coverage = validateIntakeCoreCp330Coverage(cp330PlanPack);

  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.pack_id, "CP00-330");
  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.range, "RP10.P05.M06.S02-RP10.P06.M03.S19");
  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.upstream_pack_id, "CP00-329");
  assert.equal(INTAKE_CORE_CP330_PACK_BINDING.next_pack_id, "CP00-331");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P05"], 89);
  assert.equal(coverage.summary.by_phase["RP10.P06"], 61);
  assert.equal(coverage.summary.by_micro_phase["RP10.P05.M06"], 19);
  assert.equal(coverage.summary.by_micro_phase["RP10.P06.M03"], 19);
  assert.equal(Object.keys(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-330 fixture closeout and permission matrix rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationCaseSet();
  const descriptor = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor();
  const validation = validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const p05m06 = caseSet.sections["RP10.P05.M06"].rows;
  const p06m02 = caseSet.sections["RP10.P06.M02"].rows;
  assert.equal(p05m06.base_user_fixture.fixture_payload_included, false);
  assert.equal(p05m06.base_user_fixture.real_client_data_loaded, false);
  assert.equal(p05m06.hermes_fixture_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(p06m02.permission_matrix_row.evaluates_runtime_permission, false);
  assert.equal(p06m02.permission_matrix_row.writes_permission_decision, false);
  assert.equal(p06m02.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(p06m02.security_trimming_proof.unauthorized_data_omitted, true);
  assert.equal(p06m02.security_trimming_proof.no_unauthorized_count_leak, true);
  assert.equal(p06m02.audit_event_expectation.audit_event_body_included, false);
  assert.equal(p06m02.allowed_test.executes_unit_test_runtime_paths, false);
  assert.equal(p06m02.denied_test.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
});

test("CP00-330 evidence packets and handoff route permission matrix foundation to CP00-331", () => {
  const descriptor = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor();
  const hermes = createIntakeCoreCp330HermesEvidencePacket(cp330PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp330ClaudeReviewPacket(cp330PlanPack);
  const handoff = createIntakeCoreCp330CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-330-to-CP00-331");
  assert.equal(handoff.next_subphase_id, "RP10.P06.M03.S20");
  assert.equal(handoff.production_ready_flag, "intake_core_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor_verified");
});

test("CP00-331 plan binding covers the planned 40 RP10 permission matrix slice units", () => {
  const coverage = validateIntakeCoreCp331Coverage(cp331PlanPack);

  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.pack_id, "CP00-331");
  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.range, "RP10.P06.M03.S20-RP10.P06.M05.S15");
  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.upstream_pack_id, "CP00-330");
  assert.equal(INTAKE_CORE_CP331_PACK_BINDING.next_pack_id, "CP00-332");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P06.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP10.P06.M05"], 15);
  assert.equal(Object.keys(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows).length, 3);
});

test("CP00-331 permission matrix slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp331PermissionMatrixSliceCaseSet();
  const descriptor = createIntakeCoreCp331PermissionMatrixSliceDescriptor();
  const validation = validateIntakeCoreCp331PermissionMatrixSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP10.P06.M04"].rows;
  assert.equal(m04.permission_matrix_row.evaluates_runtime_permission, false);
  assert.equal(m04.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(m04.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m04.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-331 evidence packets and handoff route the permission matrix slice to CP00-332", () => {
  const descriptor = createIntakeCoreCp331PermissionMatrixSliceDescriptor();
  const hermes = createIntakeCoreCp331HermesEvidencePacket(cp331PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp331ClaudeReviewPacket(cp331PlanPack);
  const handoff = createIntakeCoreCp331CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-331-to-CP00-332");
  assert.equal(handoff.next_subphase_id, "RP10.P06.M05.S16");
  assert.equal(handoff.production_ready_flag, "intake_core_permission_matrix_slice_descriptor_verified");
});

test("CP00-332 plan binding covers the planned 10 RP10 permission binding slice units", () => {
  const coverage = validateIntakeCoreCp332Coverage(cp332PlanPack);

  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.pack_id, "CP00-332");
  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.range, "RP10.P06.M05.S16-RP10.P06.M06.S03");
  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.upstream_pack_id, "CP00-331");
  assert.equal(INTAKE_CORE_CP332_PACK_BINDING.next_pack_id, "CP00-333");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P06.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP10.P06.M06"], 3);
  assert.equal(Object.keys(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-332 permission binding slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp332PermissionBindingSliceCaseSet();
  const descriptor = createIntakeCoreCp332PermissionBindingSliceDescriptor();
  const validation = validateIntakeCoreCp332PermissionBindingSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P06.M05"].rows;
  assert.equal(m05.security_trimming_proof.unauthorized_data_omitted, true);
  assert.equal(m05.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m05.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-332 evidence packets and handoff route the permission binding slice to CP00-333", () => {
  const descriptor = createIntakeCoreCp332PermissionBindingSliceDescriptor();
  const hermes = createIntakeCoreCp332HermesEvidencePacket(cp332PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp332ClaudeReviewPacket(cp332PlanPack);
  const handoff = createIntakeCoreCp332CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-332-to-CP00-333");
  assert.equal(handoff.next_subphase_id, "RP10.P06.M06.S04");
  assert.equal(handoff.production_ready_flag, "intake_core_permission_binding_slice_descriptor_verified");
});

test("CP00-333 plan binding covers the planned 150 RP10 P06 closeout and P07 failure foundation units", () => {
  const coverage = validateIntakeCoreCp333Coverage(cp333PlanPack);

  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.pack_id, "CP00-333");
  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.range, "RP10.P06.M06.S04-RP10.P07.M03.S14");
  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.upstream_pack_id, "CP00-332");
  assert.equal(INTAKE_CORE_CP333_PACK_BINDING.next_pack_id, "CP00-334");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P06"], 94);
  assert.equal(coverage.summary.by_phase["RP10.P07"], 56);
  assert.equal(Object.keys(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-333 P06 closeout and P07 failure foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp333P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP10.P07.M02"].rows;
  assert.equal(m02.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m02.permission_denied_failure.permission_decision_detail_included, false);
  assert.equal(m02.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m02.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m02.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-333 evidence packets and handoff close P06 and route to the P07 failure phase", () => {
  const descriptor = createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createIntakeCoreCp333HermesEvidencePacket(cp333PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp333ClaudeReviewPacket(cp333PlanPack);
  const handoff = createIntakeCoreCp333CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-333-to-CP00-334");
  assert.equal(handoff.next_subphase_id, "RP10.P07.M03.S15");
  assert.equal(handoff.production_ready_flag, "intake_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-334 plan binding covers the planned 10 RP10 failure slice units", () => {
  const coverage = validateIntakeCoreCp334Coverage(cp334PlanPack);

  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.pack_id, "CP00-334");
  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.range, "RP10.P07.M03.S15-RP10.P07.M04.S02");
  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.upstream_pack_id, "CP00-333");
  assert.equal(INTAKE_CORE_CP334_PACK_BINDING.next_pack_id, "CP00-335");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M04"], 2);
  assert.equal(Object.keys(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-334 failure slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp334FailureSliceCaseSet();
  const descriptor = createIntakeCoreCp334FailureSliceDescriptor();
  const validation = validateIntakeCoreCp334FailureSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P07.M03"].rows;
  assert.equal(m03.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(m03.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(m03.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m03.human_escalation_note.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-334 evidence packets and handoff route the failure slice to CP00-335", () => {
  const descriptor = createIntakeCoreCp334FailureSliceDescriptor();
  const hermes = createIntakeCoreCp334HermesEvidencePacket(cp334PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp334ClaudeReviewPacket(cp334PlanPack);
  const handoff = createIntakeCoreCp334CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-334-to-CP00-335");
  assert.equal(handoff.next_subphase_id, "RP10.P07.M04.S03");
  assert.equal(handoff.production_ready_flag, "intake_core_failure_slice_descriptor_verified");
});

test("CP00-335 plan binding covers the planned 40 RP10 failure binding slice units", () => {
  const coverage = validateIntakeCoreCp335Coverage(cp335PlanPack);

  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.pack_id, "CP00-335");
  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.range, "RP10.P07.M04.S03-RP10.P07.M05.S20");
  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.upstream_pack_id, "CP00-334");
  assert.equal(INTAKE_CORE_CP335_PACK_BINDING.next_pack_id, "CP00-336");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M05"], 20);
  assert.equal(Object.keys(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-335 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp335FailureBindingSliceCaseSet();
  const descriptor = createIntakeCoreCp335FailureBindingSliceDescriptor();
  const validation = validateIntakeCoreCp335FailureBindingSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P07.M05"].rows;
  assert.equal(m05.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m05.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m05.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m05.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  const m04 = caseSet.sections["RP10.P07.M04"].rows;
  assert.equal(m04.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m04.human_escalation_note.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-335 evidence packets and handoff route the failure binding slice to CP00-336", () => {
  const descriptor = createIntakeCoreCp335FailureBindingSliceDescriptor();
  const hermes = createIntakeCoreCp335HermesEvidencePacket(cp335PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp335ClaudeReviewPacket(cp335PlanPack);
  const handoff = createIntakeCoreCp335CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-335-to-CP00-336");
  assert.equal(handoff.next_subphase_id, "RP10.P07.M05.S21");
  assert.equal(handoff.production_ready_flag, "intake_core_failure_binding_slice_descriptor_verified");
});

test("CP00-336 plan binding covers the planned 10 RP10 failure tail slice units", () => {
  const coverage = validateIntakeCoreCp336Coverage(cp336PlanPack);

  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.pack_id, "CP00-336");
  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.range, "RP10.P07.M05.S21-RP10.P07.M06.S08");
  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.upstream_pack_id, "CP00-335");
  assert.equal(INTAKE_CORE_CP336_PACK_BINDING.next_pack_id, "CP00-337");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP10.P07.M06"], 8);
  assert.equal(Object.keys(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-336 failure tail slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp336FailureTailSliceCaseSet();
  const descriptor = createIntakeCoreCp336FailureTailSliceDescriptor();
  const validation = validateIntakeCoreCp336FailureTailSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P07.M05"].rows;
  assert.equal(m05.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m05.human_escalation_note.human_final_approval_required, true);
  const m06 = caseSet.sections["RP10.P07.M06"].rows;
  assert.equal(m06.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m06.permission_denied_failure.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-336 evidence packets and handoff route the failure tail slice to CP00-337", () => {
  const descriptor = createIntakeCoreCp336FailureTailSliceDescriptor();
  const hermes = createIntakeCoreCp336HermesEvidencePacket(cp336PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp336ClaudeReviewPacket(cp336PlanPack);
  const handoff = createIntakeCoreCp336CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-336-to-CP00-337");
  assert.equal(handoff.next_subphase_id, "RP10.P07.M06.S09");
  assert.equal(handoff.production_ready_flag, "intake_core_failure_tail_slice_descriptor_verified");
});

test("CP00-337 plan binding covers the planned 150 RP10 P07 closeout and P08 hermes foundation units", () => {
  const coverage = validateIntakeCoreCp337Coverage(cp337PlanPack);

  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.pack_id, "CP00-337");
  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.range, "RP10.P07.M06.S09-RP10.P08.M04.S19");
  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.upstream_pack_id, "CP00-336");
  assert.equal(INTAKE_CORE_CP337_PACK_BINDING.next_pack_id, "CP00-338");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P07"], 89);
  assert.equal(coverage.summary.by_phase["RP10.P08"], 61);
  assert.equal(Object.keys(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows).length, 10);
});

test("CP00-337 P07 closeout and P08 hermes foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp337P07CloseoutP08HermesFoundationCaseSet();
  const descriptor = createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor();
  const validation = validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P08.M03"].rows;
  assert.equal(m03.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m03.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m03.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(m03.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(m03.operator_summary.operator_summary_descriptor_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-337 evidence packets and handoff close P07 and route to the P08 hermes phase", () => {
  const descriptor = createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor();
  const hermes = createIntakeCoreCp337HermesEvidencePacket(cp337PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp337ClaudeReviewPacket(cp337PlanPack);
  const handoff = createIntakeCoreCp337CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-337-to-CP00-338");
  assert.equal(handoff.next_subphase_id, "RP10.P08.M04.S20");
  assert.equal(handoff.production_ready_flag, "intake_core_p07_closeout_p08_hermes_foundation_descriptor_verified");
});

test("CP00-338 plan binding covers the planned 40 RP10 hermes slice units", () => {
  const coverage = validateIntakeCoreCp338Coverage(cp338PlanPack);

  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.pack_id, "CP00-338");
  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.risk_class, "B");
  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.unit_count, 40);
  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.range, "RP10.P08.M04.S20-RP10.P08.M06.S17");
  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.upstream_pack_id, "CP00-337");
  assert.equal(INTAKE_CORE_CP338_PACK_BINDING.next_pack_id, "CP00-339");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP10.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP10.P08.M06"], 17);
  assert.equal(Object.keys(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows).length, 3);
});

test("CP00-338 hermes slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp338HermesSliceCaseSet();
  const descriptor = createIntakeCoreCp338HermesSliceDescriptor();
  const validation = validateIntakeCoreCp338HermesSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP10.P08.M05"].rows;
  assert.equal(m05.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m05.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m05.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m05.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(m05.operator_summary.operator_summary_descriptor_only, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-338 evidence packets and handoff route the hermes slice to CP00-339", () => {
  const descriptor = createIntakeCoreCp338HermesSliceDescriptor();
  const hermes = createIntakeCoreCp338HermesEvidencePacket(cp338PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp338ClaudeReviewPacket(cp338PlanPack);
  const handoff = createIntakeCoreCp338CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-338-to-CP00-339");
  assert.equal(handoff.next_subphase_id, "RP10.P08.M06.S18");
  assert.equal(handoff.production_ready_flag, "intake_core_hermes_slice_descriptor_verified");
});

test("CP00-339 plan binding covers the planned 150 RP10 P08 closeout and P09 review foundation units", () => {
  const coverage = validateIntakeCoreCp339Coverage(cp339PlanPack);

  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.pack_id, "CP00-339");
  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.unit_count, 150);
  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.range, "RP10.P08.M06.S18-RP10.P09.M07.S02");
  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.upstream_pack_id, "CP00-338");
  assert.equal(INTAKE_CORE_CP339_PACK_BINDING.next_pack_id, "CP00-340");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP10.P08"], 73);
  assert.equal(coverage.summary.by_phase["RP10.P09"], 77);
  assert.equal(Object.keys(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows).length, 13);
});

test("CP00-339 P08 closeout and P09 review foundation rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp339P08CloseoutP09ReviewFoundationCaseSet();
  const descriptor = createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor();
  const validation = validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 13);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP10.P09.M03"].rows;
  assert.equal(m03.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m03.ui_leak_questions.leak_detected, false);
  assert.equal(m03.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_summary.human_final_approval_required, true);
  assert.equal(m03.command_rerun.executes_command_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-339 evidence packets and handoff close P08 and route to the P09 review phase", () => {
  const descriptor = createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor();
  const hermes = createIntakeCoreCp339HermesEvidencePacket(cp339PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp339ClaudeReviewPacket(cp339PlanPack);
  const handoff = createIntakeCoreCp339CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-339-to-CP00-340");
  assert.equal(handoff.next_subphase_id, "RP10.P09.M07.S03");
  assert.equal(handoff.production_ready_flag, "intake_core_p08_closeout_p09_review_foundation_descriptor_verified");
});

test("CP00-340 plan binding covers the planned 10 RP10 review slice units", () => {
  const coverage = validateIntakeCoreCp340Coverage(cp340PlanPack);

  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.pack_id, "CP00-340");
  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.risk_class, "A");
  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.unit_count, 10);
  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.range, "RP10.P09.M07.S03-RP10.P09.M07.S12");
  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.upstream_pack_id, "CP00-339");
  assert.equal(INTAKE_CORE_CP340_PACK_BINDING.next_pack_id, "CP00-341");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP10.P09.M07"], 10);
  assert.equal(Object.keys(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows).length, 1);
});

test("CP00-340 review slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp340ReviewSliceCaseSet();
  const descriptor = createIntakeCoreCp340ReviewSliceDescriptor();
  const validation = validateIntakeCoreCp340ReviewSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP10.P09.M07"].rows;
  assert.equal(m07.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m07.ui_leak_questions.leak_detected, false);
  assert.equal(m07.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m07.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-340 evidence packets and handoff route the review slice to CP00-341", () => {
  const descriptor = createIntakeCoreCp340ReviewSliceDescriptor();
  const hermes = createIntakeCoreCp340HermesEvidencePacket(cp340PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp340ClaudeReviewPacket(cp340PlanPack);
  const handoff = createIntakeCoreCp340CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-340-to-CP00-341");
  assert.equal(handoff.next_subphase_id, "RP10.P09.M07.S13");
  assert.equal(handoff.production_ready_flag, "intake_core_review_slice_descriptor_verified");
});

test("CP00-341 plan binding covers the planned 28 RP10 review closeout units", () => {
  const coverage = validateIntakeCoreCp341Coverage(cp341PlanPack);

  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.pack_id, "CP00-341");
  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.risk_class, "C");
  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.unit_count, 28);
  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.range, "RP10.P09.M07.S13-RP10.P09.M10.S04");
  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.upstream_pack_id, "CP00-340");
  assert.equal(INTAKE_CORE_CP341_PACK_BINDING.next_pack_id, "CP00-342");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 28);
  assert.equal(coverage.summary.by_micro_phase["RP10.P09.M07"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP10.P09.M10"], 4);
  assert.equal(Object.keys(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows).length, 4);
});

test("CP00-341 review closeout slice rows stay descriptor-only", () => {
  const caseSet = createIntakeCoreCp341ReviewCloseoutSliceCaseSet();
  const descriptor = createIntakeCoreCp341ReviewCloseoutSliceDescriptor();
  const validation = validateIntakeCoreCp341ReviewCloseoutSliceDescriptor(descriptor, intakeContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 4);
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[intakeCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP10.P09.M07"].rows;
  assert.equal(m07.claude_review_packet.claude_final_approval_claimed, false);
  assert.equal(m07.command_rerun.executes_command_runtime, false);
  const m08 = caseSet.sections["RP10.P09.M08"].rows;
  assert.equal(m08.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m08.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-341 evidence packets and handoff close RP10 and route to RP11", () => {
  const descriptor = createIntakeCoreCp341ReviewCloseoutSliceDescriptor();
  const hermes = createIntakeCoreCp341HermesEvidencePacket(cp341PlanPack, intakeContract, descriptor);
  const claude = createIntakeCoreCp341ClaudeReviewPacket(cp341PlanPack);
  const handoff = createIntakeCoreCp341CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-341-to-CP00-342");
  assert.equal(handoff.next_subphase_id, "RP11.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "intake_core_review_closeout_slice_descriptor_verified");
});
