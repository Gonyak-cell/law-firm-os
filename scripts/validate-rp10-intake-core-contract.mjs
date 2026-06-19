import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
} from "../packages/intake/src/index.js";

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

const intakeContract = await readJson("../contracts/intake-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp321Manifest = await readOptionalJson("../docs/closeout-packs/cp00-321/manifest.json");
const cp322Manifest = await readOptionalJson("../docs/closeout-packs/cp00-322/manifest.json");
const cp323Manifest = await readOptionalJson("../docs/closeout-packs/cp00-323/manifest.json");
const cp324Manifest = await readOptionalJson("../docs/closeout-packs/cp00-324/manifest.json");
const cp325Manifest = await readOptionalJson("../docs/closeout-packs/cp00-325/manifest.json");
const cp326Manifest = await readOptionalJson("../docs/closeout-packs/cp00-326/manifest.json");
const cp327Manifest = await readOptionalJson("../docs/closeout-packs/cp00-327/manifest.json");
const cp328Manifest = await readOptionalJson("../docs/closeout-packs/cp00-328/manifest.json");
const cp329Manifest = await readOptionalJson("../docs/closeout-packs/cp00-329/manifest.json");
const cp330Manifest = await readOptionalJson("../docs/closeout-packs/cp00-330/manifest.json");
const cp331Manifest = await readOptionalJson("../docs/closeout-packs/cp00-331/manifest.json");
const cp332Manifest = await readOptionalJson("../docs/closeout-packs/cp00-332/manifest.json");
const cp333Manifest = await readOptionalJson("../docs/closeout-packs/cp00-333/manifest.json");
const cp334Manifest = await readOptionalJson("../docs/closeout-packs/cp00-334/manifest.json");
const cp335Manifest = await readOptionalJson("../docs/closeout-packs/cp00-335/manifest.json");
const cp336Manifest = await readOptionalJson("../docs/closeout-packs/cp00-336/manifest.json");
const cp337Manifest = await readOptionalJson("../docs/closeout-packs/cp00-337/manifest.json");
const cp338Manifest = await readOptionalJson("../docs/closeout-packs/cp00-338/manifest.json");
const cp339Manifest = await readOptionalJson("../docs/closeout-packs/cp00-339/manifest.json");
const cp340Manifest = await readOptionalJson("../docs/closeout-packs/cp00-340/manifest.json");
const cp341Manifest = await readOptionalJson("../docs/closeout-packs/cp00-341/manifest.json");
const cp321PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-321") ?? cp321Manifest?.plan_binding_snapshot;
const cp322PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-322") ?? cp322Manifest?.plan_binding_snapshot;
const cp323PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-323") ?? cp323Manifest?.plan_binding_snapshot;
const cp324PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-324") ?? cp324Manifest?.plan_binding_snapshot;
const cp325PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-325") ?? cp325Manifest?.plan_binding_snapshot;
const cp326PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-326") ?? cp326Manifest?.plan_binding_snapshot;
const cp327PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-327") ?? cp327Manifest?.plan_binding_snapshot;
const cp328PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-328") ?? cp328Manifest?.plan_binding_snapshot;
const cp329PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-329") ?? cp329Manifest?.plan_binding_snapshot;
const cp330PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-330") ?? cp330Manifest?.plan_binding_snapshot;
const cp331PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-331") ?? cp331Manifest?.plan_binding_snapshot;
const cp332PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-332") ?? cp332Manifest?.plan_binding_snapshot;
const cp333PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-333") ?? cp333Manifest?.plan_binding_snapshot;
const cp334PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-334") ?? cp334Manifest?.plan_binding_snapshot;
const cp335PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-335") ?? cp335Manifest?.plan_binding_snapshot;
const cp336PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-336") ?? cp336Manifest?.plan_binding_snapshot;
const cp337PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-337") ?? cp337Manifest?.plan_binding_snapshot;
const cp338PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-338") ?? cp338Manifest?.plan_binding_snapshot;
const cp339PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-339") ?? cp339Manifest?.plan_binding_snapshot;
const cp340PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-340") ?? cp340Manifest?.plan_binding_snapshot;
const cp341PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-341") ?? cp341Manifest?.plan_binding_snapshot;

assert.equal(intakeContract.schema_version, "law-firm-os.intake-core-contract.v0.1");
assert.equal(intakeContract.program.program_id, "RP10");
assert.equal(intakeContract.program.program_title, "Intake Conflict Engagement");
assert.equal(intakeContract.program.upstream_program_id, "RP08");
assert.equal(intakeContract.program.hermes_gate, "H10");
assert.equal(intakeContract.program.claude_gate, "C10");
assert.equal(intakeContract.program.descriptor_only, true);
assert.deepEqual(intakeContract.program, JSON.parse(JSON.stringify(INTAKE_CORE_PROGRAM_CONTRACT)));
assert.equal(intakeContract.current_pack.pack_id, "CP00-341");
assert.equal(intakeContract.program.current_pack_id, "CP00-341");
assert.deepEqual(intakeContract.current_pack, JSON.parse(JSON.stringify(INTAKE_CORE_CP341_PACK_BINDING)));
assert.deepEqual(intakeContract.no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP341_NO_WRITE_ATTESTATION)));

assert.ok(cp321PlanPack, "CP00-321 must exist in closeout-pack-plan.json");
assert.equal(cp321PlanPack.unit_count, INTAKE_CORE_CP321_PACK_BINDING.unit_count, "CP00-321 unit count drift");
assert.ok(cp322PlanPack, "CP00-322 must exist in closeout-pack-plan.json");
assert.equal(cp322PlanPack.unit_count, INTAKE_CORE_CP322_PACK_BINDING.unit_count, "CP00-322 unit count drift");
assert.ok(cp323PlanPack, "CP00-323 must exist in closeout-pack-plan.json");
assert.equal(cp323PlanPack.unit_count, INTAKE_CORE_CP323_PACK_BINDING.unit_count, "CP00-323 unit count drift");
assert.ok(cp324PlanPack, "CP00-324 must exist in closeout-pack-plan.json");
assert.equal(cp324PlanPack.unit_count, INTAKE_CORE_CP324_PACK_BINDING.unit_count, "CP00-324 unit count drift");
assert.ok(cp325PlanPack, "CP00-325 must exist in closeout-pack-plan.json");
assert.equal(cp325PlanPack.unit_count, INTAKE_CORE_CP325_PACK_BINDING.unit_count, "CP00-325 unit count drift");
assert.ok(cp326PlanPack, "CP00-326 must exist in closeout-pack-plan.json");
assert.equal(cp326PlanPack.unit_count, INTAKE_CORE_CP326_PACK_BINDING.unit_count, "CP00-326 unit count drift");
assert.ok(cp327PlanPack, "CP00-327 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp327PlanPack.unit_count, INTAKE_CORE_CP327_PACK_BINDING.unit_count, "CP00-327 unit count drift");
assert.ok(cp328PlanPack, "CP00-328 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp328PlanPack.unit_count, INTAKE_CORE_CP328_PACK_BINDING.unit_count, "CP00-328 unit count drift");
assert.ok(cp329PlanPack, "CP00-329 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp329PlanPack.unit_count, INTAKE_CORE_CP329_PACK_BINDING.unit_count, "CP00-329 unit count drift");
assert.ok(cp330PlanPack, "CP00-330 must exist in closeout-pack-plan.json or manifest snapshot");
assert.ok(cp331PlanPack, "CP00-331 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp331PlanPack.unit_count, INTAKE_CORE_CP331_PACK_BINDING.unit_count, "CP00-331 unit count drift");
assert.ok(cp332PlanPack, "CP00-332 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp332PlanPack.unit_count, INTAKE_CORE_CP332_PACK_BINDING.unit_count, "CP00-332 unit count drift");
assert.ok(cp333PlanPack, "CP00-333 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp333PlanPack.unit_count, INTAKE_CORE_CP333_PACK_BINDING.unit_count, "CP00-333 unit count drift");
assert.ok(cp334PlanPack, "CP00-334 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp334PlanPack.unit_count, INTAKE_CORE_CP334_PACK_BINDING.unit_count, "CP00-334 unit count drift");
assert.ok(cp335PlanPack, "CP00-335 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp335PlanPack.unit_count, INTAKE_CORE_CP335_PACK_BINDING.unit_count, "CP00-335 unit count drift");
assert.ok(cp336PlanPack, "CP00-336 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp336PlanPack.unit_count, INTAKE_CORE_CP336_PACK_BINDING.unit_count, "CP00-336 unit count drift");
assert.ok(cp337PlanPack, "CP00-337 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp337PlanPack.unit_count, INTAKE_CORE_CP337_PACK_BINDING.unit_count, "CP00-337 unit count drift");
assert.ok(cp338PlanPack, "CP00-338 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp338PlanPack.unit_count, INTAKE_CORE_CP338_PACK_BINDING.unit_count, "CP00-338 unit count drift");
assert.ok(cp339PlanPack, "CP00-339 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp339PlanPack.unit_count, INTAKE_CORE_CP339_PACK_BINDING.unit_count, "CP00-339 unit count drift");
assert.ok(cp340PlanPack, "CP00-340 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp340PlanPack.unit_count, INTAKE_CORE_CP340_PACK_BINDING.unit_count, "CP00-340 unit count drift");
assert.ok(cp341PlanPack, "CP00-341 must exist in closeout-pack-plan.json or manifest snapshot");
assert.equal(cp341PlanPack.unit_count, INTAKE_CORE_CP341_PACK_BINDING.unit_count, "CP00-341 unit count drift");
assert.equal(cp330PlanPack.unit_count, INTAKE_CORE_CP330_PACK_BINDING.unit_count, "CP00-330 unit count drift");

const cp321Coverage = validateIntakeCoreCp321Coverage(cp321PlanPack);
const cp321Descriptor = createIntakeCoreCp321ScopeContractFoundationDescriptor();
const cp321CaseSet = createIntakeCoreCp321ScopeContractFoundationCaseSet();
const cp321Foundation = validateIntakeCoreCp321ScopeContractFoundationDescriptor(cp321Descriptor, intakeContract);
const cp321Hermes = createIntakeCoreCp321HermesEvidencePacket(cp321PlanPack, intakeContract, cp321Descriptor);
const cp321Claude = createIntakeCoreCp321ClaudeReviewPacket(cp321PlanPack);
const cp321Handoff = createIntakeCoreCp321CloseoutHandoff();
const cp322Coverage = validateIntakeCoreCp322Coverage(cp322PlanPack);
const cp322Descriptor = createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor();
const cp322CaseSet = createIntakeCoreCp322P01CloseoutP02ServiceFoundationCaseSet();
const cp322Foundation = validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(cp322Descriptor, intakeContract);
const cp322Hermes = createIntakeCoreCp322HermesEvidencePacket(cp322PlanPack, intakeContract, cp322Descriptor);
const cp322Claude = createIntakeCoreCp322ClaudeReviewPacket(cp322PlanPack);
const cp322Handoff = createIntakeCoreCp322CloseoutHandoff();
const cp323Coverage = validateIntakeCoreCp323Coverage(cp323PlanPack);
const cp323Descriptor = createIntakeCoreCp323ServiceSliceDescriptor();
const cp323CaseSet = createIntakeCoreCp323ServiceSliceCaseSet();
const cp323Slice = validateIntakeCoreCp323ServiceSliceDescriptor(cp323Descriptor, intakeContract);
const cp323Hermes = createIntakeCoreCp323HermesEvidencePacket(cp323PlanPack, intakeContract, cp323Descriptor);
const cp323Claude = createIntakeCoreCp323ClaudeReviewPacket(cp323PlanPack);
const cp323Handoff = createIntakeCoreCp323CloseoutHandoff();
const cp324Coverage = validateIntakeCoreCp324Coverage(cp324PlanPack);
const cp324Descriptor = createIntakeCoreCp324ServiceReviewSliceDescriptor();
const cp324CaseSet = createIntakeCoreCp324ServiceReviewSliceCaseSet();
const cp324Slice = validateIntakeCoreCp324ServiceReviewSliceDescriptor(cp324Descriptor, intakeContract);
const cp324Hermes = createIntakeCoreCp324HermesEvidencePacket(cp324PlanPack, intakeContract, cp324Descriptor);
const cp324Claude = createIntakeCoreCp324ClaudeReviewPacket(cp324PlanPack);
const cp324Handoff = createIntakeCoreCp324CloseoutHandoff();
const cp325Coverage = validateIntakeCoreCp325Coverage(cp325PlanPack);
const cp325Descriptor = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor();
const cp325CaseSet = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationCaseSet();
const cp325Foundation = validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(cp325Descriptor, intakeContract);
const cp325Hermes = createIntakeCoreCp325HermesEvidencePacket(cp325PlanPack, intakeContract, cp325Descriptor);
const cp325Claude = createIntakeCoreCp325ClaudeReviewPacket(cp325PlanPack);
const cp325Handoff = createIntakeCoreCp325CloseoutHandoff();
const cp326Coverage = validateIntakeCoreCp326Coverage(cp326PlanPack);
const cp326Descriptor = createIntakeCoreCp326UiWorkflowSliceDescriptor();
const cp326CaseSet = createIntakeCoreCp326UiWorkflowSliceCaseSet();
const cp326Slice = validateIntakeCoreCp326UiWorkflowSliceDescriptor(cp326Descriptor, intakeContract);
const cp326Hermes = createIntakeCoreCp326HermesEvidencePacket(cp326PlanPack, intakeContract, cp326Descriptor);
const cp326Claude = createIntakeCoreCp326ClaudeReviewPacket(cp326PlanPack);
const cp326Handoff = createIntakeCoreCp326CloseoutHandoff();
const cp327Coverage = validateIntakeCoreCp327Coverage(cp327PlanPack);
const cp327Descriptor = createIntakeCoreCp327PermissionAuditFixtureDescriptor();
const cp327CaseSet = createIntakeCoreCp327PermissionAuditFixtureCaseSet();
const cp327Slice = validateIntakeCoreCp327PermissionAuditFixtureDescriptor(cp327Descriptor, intakeContract);
const cp327Hermes = createIntakeCoreCp327HermesEvidencePacket(cp327PlanPack, intakeContract, cp327Descriptor);
const cp327Claude = createIntakeCoreCp327ClaudeReviewPacket(cp327PlanPack);
const cp327Handoff = createIntakeCoreCp327CloseoutHandoff();
const cp328Coverage = validateIntakeCoreCp328Coverage(cp328PlanPack);
const cp328Descriptor = createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor();
const cp328CaseSet = createIntakeCoreCp328P04CloseoutP05PermissionFoundationCaseSet();
const cp328Foundation = validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(cp328Descriptor, intakeContract);
const cp328Hermes = createIntakeCoreCp328HermesEvidencePacket(cp328PlanPack, intakeContract, cp328Descriptor);
const cp328Claude = createIntakeCoreCp328ClaudeReviewPacket(cp328PlanPack);
const cp328Handoff = createIntakeCoreCp328CloseoutHandoff();
const cp329Coverage = validateIntakeCoreCp329Coverage(cp329PlanPack);
const cp329Descriptor = createIntakeCoreCp329PermissionFixtureTailDescriptor();
const cp329CaseSet = createIntakeCoreCp329PermissionFixtureTailCaseSet();
const cp329Tail = validateIntakeCoreCp329PermissionFixtureTailDescriptor(cp329Descriptor, intakeContract);
const cp329Hermes = createIntakeCoreCp329HermesEvidencePacket(cp329PlanPack, intakeContract, cp329Descriptor);
const cp329Claude = createIntakeCoreCp329ClaudeReviewPacket(cp329PlanPack);
const cp329Handoff = createIntakeCoreCp329CloseoutHandoff();
const cp330Coverage = validateIntakeCoreCp330Coverage(cp330PlanPack);
const cp330Descriptor = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor();
const cp330CaseSet = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationCaseSet();
const cp330Foundation = validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(cp330Descriptor, intakeContract);
const cp330Hermes = createIntakeCoreCp330HermesEvidencePacket(cp330PlanPack, intakeContract, cp330Descriptor);
const cp330Claude = createIntakeCoreCp330ClaudeReviewPacket(cp330PlanPack);
const cp330Handoff = createIntakeCoreCp330CloseoutHandoff();
const cp331Coverage = validateIntakeCoreCp331Coverage(cp331PlanPack);
const cp331Descriptor = createIntakeCoreCp331PermissionMatrixSliceDescriptor();
const cp331CaseSet = createIntakeCoreCp331PermissionMatrixSliceCaseSet();
const cp331Slice = validateIntakeCoreCp331PermissionMatrixSliceDescriptor(cp331Descriptor, intakeContract);
const cp331Hermes = createIntakeCoreCp331HermesEvidencePacket(cp331PlanPack, intakeContract, cp331Descriptor);
const cp331Claude = createIntakeCoreCp331ClaudeReviewPacket(cp331PlanPack);
const cp331Handoff = createIntakeCoreCp331CloseoutHandoff();
const cp332Coverage = validateIntakeCoreCp332Coverage(cp332PlanPack);
const cp332Descriptor = createIntakeCoreCp332PermissionBindingSliceDescriptor();
const cp332CaseSet = createIntakeCoreCp332PermissionBindingSliceCaseSet();
const cp332Slice = validateIntakeCoreCp332PermissionBindingSliceDescriptor(cp332Descriptor, intakeContract);
const cp332Hermes = createIntakeCoreCp332HermesEvidencePacket(cp332PlanPack, intakeContract, cp332Descriptor);
const cp332Claude = createIntakeCoreCp332ClaudeReviewPacket(cp332PlanPack);
const cp332Handoff = createIntakeCoreCp332CloseoutHandoff();
const cp333Coverage = validateIntakeCoreCp333Coverage(cp333PlanPack);
const cp333Descriptor = createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor();
const cp333CaseSet = createIntakeCoreCp333P06CloseoutP07FailureFoundationCaseSet();
const cp333Foundation = validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(cp333Descriptor, intakeContract);
const cp333Hermes = createIntakeCoreCp333HermesEvidencePacket(cp333PlanPack, intakeContract, cp333Descriptor);
const cp333Claude = createIntakeCoreCp333ClaudeReviewPacket(cp333PlanPack);
const cp333Handoff = createIntakeCoreCp333CloseoutHandoff();
const cp334Coverage = validateIntakeCoreCp334Coverage(cp334PlanPack);
const cp334Descriptor = createIntakeCoreCp334FailureSliceDescriptor();
const cp334CaseSet = createIntakeCoreCp334FailureSliceCaseSet();
const cp334Slice = validateIntakeCoreCp334FailureSliceDescriptor(cp334Descriptor, intakeContract);
const cp334Hermes = createIntakeCoreCp334HermesEvidencePacket(cp334PlanPack, intakeContract, cp334Descriptor);
const cp334Claude = createIntakeCoreCp334ClaudeReviewPacket(cp334PlanPack);
const cp334Handoff = createIntakeCoreCp334CloseoutHandoff();
const cp335Coverage = validateIntakeCoreCp335Coverage(cp335PlanPack);
const cp335Descriptor = createIntakeCoreCp335FailureBindingSliceDescriptor();
const cp335CaseSet = createIntakeCoreCp335FailureBindingSliceCaseSet();
const cp335Slice = validateIntakeCoreCp335FailureBindingSliceDescriptor(cp335Descriptor, intakeContract);
const cp335Hermes = createIntakeCoreCp335HermesEvidencePacket(cp335PlanPack, intakeContract, cp335Descriptor);
const cp335Claude = createIntakeCoreCp335ClaudeReviewPacket(cp335PlanPack);
const cp335Handoff = createIntakeCoreCp335CloseoutHandoff();
const cp336Coverage = validateIntakeCoreCp336Coverage(cp336PlanPack);
const cp336Descriptor = createIntakeCoreCp336FailureTailSliceDescriptor();
const cp336CaseSet = createIntakeCoreCp336FailureTailSliceCaseSet();
const cp336Slice = validateIntakeCoreCp336FailureTailSliceDescriptor(cp336Descriptor, intakeContract);
const cp336Hermes = createIntakeCoreCp336HermesEvidencePacket(cp336PlanPack, intakeContract, cp336Descriptor);
const cp336Claude = createIntakeCoreCp336ClaudeReviewPacket(cp336PlanPack);
const cp336Handoff = createIntakeCoreCp336CloseoutHandoff();
const cp337Coverage = validateIntakeCoreCp337Coverage(cp337PlanPack);
const cp337Descriptor = createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor();
const cp337CaseSet = createIntakeCoreCp337P07CloseoutP08HermesFoundationCaseSet();
const cp337Foundation = validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(cp337Descriptor, intakeContract);
const cp337Hermes = createIntakeCoreCp337HermesEvidencePacket(cp337PlanPack, intakeContract, cp337Descriptor);
const cp337Claude = createIntakeCoreCp337ClaudeReviewPacket(cp337PlanPack);
const cp337Handoff = createIntakeCoreCp337CloseoutHandoff();
const cp338Coverage = validateIntakeCoreCp338Coverage(cp338PlanPack);
const cp338Descriptor = createIntakeCoreCp338HermesSliceDescriptor();
const cp338CaseSet = createIntakeCoreCp338HermesSliceCaseSet();
const cp338Slice = validateIntakeCoreCp338HermesSliceDescriptor(cp338Descriptor, intakeContract);
const cp338Hermes = createIntakeCoreCp338HermesEvidencePacket(cp338PlanPack, intakeContract, cp338Descriptor);
const cp338Claude = createIntakeCoreCp338ClaudeReviewPacket(cp338PlanPack);
const cp338Handoff = createIntakeCoreCp338CloseoutHandoff();
const cp339Coverage = validateIntakeCoreCp339Coverage(cp339PlanPack);
const cp339Descriptor = createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor();
const cp339CaseSet = createIntakeCoreCp339P08CloseoutP09ReviewFoundationCaseSet();
const cp339Foundation = validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(cp339Descriptor, intakeContract);
const cp339Hermes = createIntakeCoreCp339HermesEvidencePacket(cp339PlanPack, intakeContract, cp339Descriptor);
const cp339Claude = createIntakeCoreCp339ClaudeReviewPacket(cp339PlanPack);
const cp339Handoff = createIntakeCoreCp339CloseoutHandoff();
const cp340Coverage = validateIntakeCoreCp340Coverage(cp340PlanPack);
const cp340Descriptor = createIntakeCoreCp340ReviewSliceDescriptor();
const cp340CaseSet = createIntakeCoreCp340ReviewSliceCaseSet();
const cp340Slice = validateIntakeCoreCp340ReviewSliceDescriptor(cp340Descriptor, intakeContract);
const cp340Hermes = createIntakeCoreCp340HermesEvidencePacket(cp340PlanPack, intakeContract, cp340Descriptor);
const cp340Claude = createIntakeCoreCp340ClaudeReviewPacket(cp340PlanPack);
const cp340Handoff = createIntakeCoreCp340CloseoutHandoff();
const cp341Coverage = validateIntakeCoreCp341Coverage(cp341PlanPack);
const cp341Descriptor = createIntakeCoreCp341ReviewCloseoutSliceDescriptor();
const cp341CaseSet = createIntakeCoreCp341ReviewCloseoutSliceCaseSet();
const cp341Slice = validateIntakeCoreCp341ReviewCloseoutSliceDescriptor(cp341Descriptor, intakeContract);
const cp341Hermes = createIntakeCoreCp341HermesEvidencePacket(cp341PlanPack, intakeContract, cp341Descriptor);
const cp341Claude = createIntakeCoreCp341ClaudeReviewPacket(cp341PlanPack);
const cp341Handoff = createIntakeCoreCp341CloseoutHandoff();

assert.equal(cp321Coverage.valid, true, cp321Coverage.errors.join("; "));
assert.equal(cp321Coverage.summary.unit_count, 150);
assert.equal(cp321Coverage.summary.by_phase["RP10.P00"], 52);
assert.equal(cp321Coverage.summary.by_phase["RP10.P01"], 98);
assert.equal(cp321Foundation.valid, true, cp321Foundation.errors.join("; "));
assert.equal(cp321CaseSet.section_count, 20);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp321CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-321 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp321Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp321_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP321_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp321_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP321_NO_WRITE_ATTESTATION)));
assert.equal(cp321Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp321Hermes.production_ready_candidate, true);
assert.equal(cp321Claude.review_packet, "C10.CP00-321.intake_core_scope_contract_foundation_descriptor");
assert.equal(cp321Claude.read_only, true);
assert.equal(cp321Handoff.to_pack_id, "CP00-322");
assert.equal(cp321Handoff.next_subphase_id, "RP10.P01.M08.S06");
assert.equal(cp322Coverage.valid, true, cp322Coverage.errors.join("; "));
assert.equal(cp322Coverage.summary.unit_count, 150);
assert.equal(cp322Coverage.summary.by_phase["RP10.P01"], 14);
assert.equal(cp322Coverage.summary.by_phase["RP10.P02"], 136);
assert.equal(cp322Foundation.valid, true, cp322Foundation.errors.join("; "));
assert.equal(cp322CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp322CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-322 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p01_closeout_p02_service_foundation_descriptor,
  JSON.parse(JSON.stringify(cp322Descriptor)),
  "contract p01_closeout_p02_service_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp322_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP322_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp322_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP322_NO_WRITE_ATTESTATION)));
assert.equal(cp322Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp322Hermes.production_ready_candidate, true);
assert.equal(cp322Claude.review_packet, "C10.CP00-322.intake_core_p01_closeout_p02_service_foundation_descriptor");
assert.equal(cp322Claude.read_only, true);
assert.equal(cp322Handoff.to_pack_id, "CP00-323");
assert.equal(cp322Handoff.next_subphase_id, "RP10.P02.M07.S07");
assert.equal(cp323Coverage.valid, true, cp323Coverage.errors.join("; "));
assert.equal(cp323Coverage.summary.unit_count, 40);
assert.equal(cp323Coverage.summary.by_micro_phase["RP10.P02.M08"], 22);
assert.equal(cp323Slice.valid, true, cp323Slice.errors.join("; "));
assert.equal(cp323CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp323CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-323 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.service_slice_descriptor,
  JSON.parse(JSON.stringify(cp323Descriptor)),
  "contract service_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp323_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP323_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp323_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP323_NO_WRITE_ATTESTATION)));
assert.equal(cp323Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp323Hermes.production_ready_candidate, true);
assert.equal(cp323Claude.review_packet, "C10.CP00-323.intake_core_service_slice_descriptor");
assert.equal(cp323Claude.read_only, true);
assert.equal(cp323Handoff.to_pack_id, "CP00-324");
assert.equal(cp323Handoff.next_subphase_id, "RP10.P02.M09.S03");
assert.equal(cp324Coverage.valid, true, cp324Coverage.errors.join("; "));
assert.equal(cp324Coverage.summary.unit_count, 10);
assert.equal(cp324Coverage.summary.by_micro_phase["RP10.P02.M09"], 10);
assert.equal(cp324Slice.valid, true, cp324Slice.errors.join("; "));
assert.equal(cp324CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp324CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-324 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.service_review_slice_descriptor,
  JSON.parse(JSON.stringify(cp324Descriptor)),
  "contract service_review_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp324_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP324_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp324_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP324_NO_WRITE_ATTESTATION)));
assert.equal(cp324Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp324Hermes.production_ready_candidate, true);
assert.equal(cp324Claude.review_packet, "C10.CP00-324.intake_core_service_review_slice_descriptor");
assert.equal(cp324Claude.read_only, true);
assert.equal(cp324Handoff.to_pack_id, "CP00-325");
assert.equal(cp324Handoff.next_subphase_id, "RP10.P02.M09.S13");
assert.equal(cp325Coverage.valid, true, cp325Coverage.errors.join("; "));
assert.equal(cp325Coverage.summary.unit_count, 150);
assert.equal(cp325Coverage.summary.by_phase["RP10.P03"], 112);
assert.equal(cp325Foundation.valid, true, cp325Foundation.errors.join("; "));
assert.equal(cp325CaseSet.section_count, 16);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp325CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-325 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p02_closeout_p03_interface_p04_ui_foundation_descriptor,
  JSON.parse(JSON.stringify(cp325Descriptor)),
  "contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp325_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP325_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp325_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP325_NO_WRITE_ATTESTATION)));
assert.equal(cp325Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp325Hermes.production_ready_candidate, true);
assert.equal(cp325Claude.review_packet, "C10.CP00-325.intake_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor");
assert.equal(cp325Claude.read_only, true);
assert.equal(cp325Handoff.to_pack_id, "CP00-326");
assert.equal(cp325Handoff.next_subphase_id, "RP10.P04.M02.S08");
assert.equal(cp326Coverage.valid, true, cp326Coverage.errors.join("; "));
assert.equal(cp326Coverage.summary.unit_count, 40);
assert.equal(cp326Coverage.summary.by_micro_phase["RP10.P04.M03"], 22);
assert.equal(cp326Slice.valid, true, cp326Slice.errors.join("; "));
assert.equal(cp326CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp326CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-326 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.ui_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp326Descriptor)),
  "contract ui_workflow_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp326_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP326_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp326_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP326_NO_WRITE_ATTESTATION)));
assert.equal(cp326Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp326Hermes.production_ready_candidate, true);
assert.equal(cp326Claude.review_packet, "C10.CP00-326.intake_core_ui_workflow_slice_descriptor");
assert.equal(cp326Claude.read_only, true);
assert.equal(cp326Handoff.to_pack_id, "CP00-327");
assert.equal(cp326Handoff.next_subphase_id, "RP10.P04.M04.S18");
assert.equal(cp327Coverage.valid, true, cp327Coverage.errors.join("; "));
assert.equal(cp327Coverage.summary.unit_count, 40);
assert.equal(cp327Coverage.summary.by_micro_phase["RP10.P04.M05"], 22);
assert.equal(cp327Coverage.summary.by_micro_phase["RP10.P04.M06"], 15);
assert.equal(cp327Slice.valid, true, cp327Slice.errors.join("; "));
assert.equal(cp327CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp327CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-327 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.permission_audit_fixture_descriptor,
  JSON.parse(JSON.stringify(cp327Descriptor)),
  "contract permission_audit_fixture_descriptor drift",
);
assert.deepEqual(intakeContract.cp327_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP327_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp327_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP327_NO_WRITE_ATTESTATION)));
assert.equal(cp327Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp327Hermes.production_ready_candidate, true);
assert.equal(cp327Claude.review_packet, "C10.CP00-327.intake_core_permission_audit_fixture_descriptor");
assert.equal(cp327Claude.read_only, true);
assert.equal(cp327Handoff.to_pack_id, "CP00-328");
assert.equal(cp327Handoff.next_subphase_id, "RP10.P04.M06.S16");
assert.equal(cp328Coverage.valid, true, cp328Coverage.errors.join("; "));
assert.equal(cp328Coverage.summary.unit_count, 150);
assert.equal(cp328Coverage.summary.by_phase["RP10.P04"], 75);
assert.equal(cp328Coverage.summary.by_phase["RP10.P05"], 75);
assert.equal(cp328Coverage.summary.by_micro_phase["RP10.P05.M03"], 22);
assert.equal(cp328Foundation.valid, true, cp328Foundation.errors.join("; "));
assert.equal(cp328CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp328CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-328 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p04_closeout_p05_permission_foundation_descriptor,
  JSON.parse(JSON.stringify(cp328Descriptor)),
  "contract p04_closeout_p05_permission_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp328_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP328_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp328_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP328_NO_WRITE_ATTESTATION)));
assert.equal(cp328Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp328Hermes.production_ready_candidate, true);
assert.equal(cp328Claude.review_packet, "C10.CP00-328.intake_core_p04_closeout_p05_permission_foundation_descriptor");
assert.equal(cp328Claude.read_only, true);
assert.equal(cp328Handoff.to_pack_id, "CP00-329");
assert.equal(cp328Handoff.next_subphase_id, "RP10.P05.M05.S14");
assert.equal(cp329Coverage.valid, true, cp329Coverage.errors.join("; "));
assert.equal(cp329Coverage.summary.unit_count, 10);
assert.equal(cp329Coverage.summary.by_phase["RP10.P05"], 10);
assert.equal(cp329Coverage.summary.by_micro_phase["RP10.P05.M05"], 9);
assert.equal(cp329Coverage.summary.by_micro_phase["RP10.P05.M06"], 1);
assert.equal(cp329Tail.valid, true, cp329Tail.errors.join("; "));
assert.equal(cp329CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp329CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-329 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.permission_fixture_tail_descriptor,
  JSON.parse(JSON.stringify(cp329Descriptor)),
  "contract permission_fixture_tail_descriptor drift",
);
assert.deepEqual(intakeContract.cp329_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP329_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp329_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP329_NO_WRITE_ATTESTATION)));
assert.equal(cp329Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp329Hermes.production_ready_candidate, true);
assert.equal(cp329Claude.review_packet, "C10.CP00-329.intake_core_permission_fixture_tail_descriptor");
assert.equal(cp329Claude.read_only, true);
assert.equal(cp329Handoff.to_pack_id, "CP00-330");
assert.equal(cp329Handoff.next_subphase_id, "RP10.P05.M06.S02");
assert.equal(cp330Coverage.valid, true, cp330Coverage.errors.join("; "));
assert.equal(cp330Coverage.summary.unit_count, 150);
assert.equal(cp330Coverage.summary.by_phase["RP10.P05"], 89);
assert.equal(cp330Coverage.summary.by_phase["RP10.P06"], 61);
assert.equal(cp330Coverage.summary.by_micro_phase["RP10.P05.M06"], 19);
assert.equal(cp330Coverage.summary.by_micro_phase["RP10.P06.M03"], 19);
assert.equal(cp330Foundation.valid, true, cp330Foundation.errors.join("; "));
assert.equal(cp330CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp330CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-330 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p05_fixture_closeout_p06_permission_matrix_foundation_descriptor,
  JSON.parse(JSON.stringify(cp330Descriptor)),
  "contract p05_fixture_closeout_p06_permission_matrix_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp330_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP330_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp330_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP330_NO_WRITE_ATTESTATION)));
assert.equal(cp330Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp330Hermes.production_ready_candidate, true);
assert.equal(cp330Claude.review_packet, "C10.CP00-330.intake_core_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor");
assert.equal(cp330Claude.read_only, true);
assert.equal(cp330Handoff.to_pack_id, "CP00-331");
assert.equal(cp330Handoff.next_subphase_id, "RP10.P06.M03.S20");
assert.equal(cp331Coverage.valid, true, cp331Coverage.errors.join("; "));
assert.equal(cp331Coverage.summary.unit_count, 40);
assert.equal(cp331Coverage.summary.by_micro_phase["RP10.P06.M04"], 22);
assert.equal(cp331Slice.valid, true, cp331Slice.errors.join("; "));
assert.equal(cp331CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp331CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-331 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.permission_matrix_slice_descriptor,
  JSON.parse(JSON.stringify(cp331Descriptor)),
  "contract permission_matrix_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp331_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP331_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp331_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP331_NO_WRITE_ATTESTATION)));
assert.equal(cp331Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp331Hermes.production_ready_candidate, true);
assert.equal(cp331Claude.review_packet, "C10.CP00-331.intake_core_permission_matrix_slice_descriptor");
assert.equal(cp331Claude.read_only, true);
assert.equal(cp331Handoff.to_pack_id, "CP00-332");
assert.equal(cp331Handoff.next_subphase_id, "RP10.P06.M05.S16");
assert.equal(cp332Coverage.valid, true, cp332Coverage.errors.join("; "));
assert.equal(cp332Coverage.summary.unit_count, 10);
assert.equal(cp332Coverage.summary.by_micro_phase["RP10.P06.M05"], 7);
assert.equal(cp332Slice.valid, true, cp332Slice.errors.join("; "));
assert.equal(cp332CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp332CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-332 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.permission_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp332Descriptor)),
  "contract permission_binding_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp332_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP332_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp332_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP332_NO_WRITE_ATTESTATION)));
assert.equal(cp332Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp332Hermes.production_ready_candidate, true);
assert.equal(cp332Claude.review_packet, "C10.CP00-332.intake_core_permission_binding_slice_descriptor");
assert.equal(cp332Claude.read_only, true);
assert.equal(cp332Handoff.to_pack_id, "CP00-333");
assert.equal(cp332Handoff.next_subphase_id, "RP10.P06.M06.S04");
assert.equal(cp333Coverage.valid, true, cp333Coverage.errors.join("; "));
assert.equal(cp333Coverage.summary.unit_count, 150);
assert.equal(cp333Coverage.summary.by_phase["RP10.P06"], 94);
assert.equal(cp333Coverage.summary.by_phase["RP10.P07"], 56);
assert.equal(cp333Foundation.valid, true, cp333Foundation.errors.join("; "));
assert.equal(cp333CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp333CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-333 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p06_closeout_p07_failure_foundation_descriptor,
  JSON.parse(JSON.stringify(cp333Descriptor)),
  "contract p06_closeout_p07_failure_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp333_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP333_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp333_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP333_NO_WRITE_ATTESTATION)));
assert.equal(cp333Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp333Hermes.production_ready_candidate, true);
assert.equal(cp333Claude.review_packet, "C10.CP00-333.intake_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp333Claude.read_only, true);
assert.equal(cp333Handoff.to_pack_id, "CP00-334");
assert.equal(cp333Handoff.next_subphase_id, "RP10.P07.M03.S15");
assert.equal(cp334Coverage.valid, true, cp334Coverage.errors.join("; "));
assert.equal(cp334Coverage.summary.unit_count, 10);
assert.equal(cp334Coverage.summary.by_micro_phase["RP10.P07.M03"], 8);
assert.equal(cp334Slice.valid, true, cp334Slice.errors.join("; "));
assert.equal(cp334CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp334CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-334 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.failure_slice_descriptor,
  JSON.parse(JSON.stringify(cp334Descriptor)),
  "contract failure_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp334_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP334_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp334_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP334_NO_WRITE_ATTESTATION)));
assert.equal(cp334Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp334Hermes.production_ready_candidate, true);
assert.equal(cp334Claude.review_packet, "C10.CP00-334.intake_core_failure_slice_descriptor");
assert.equal(cp334Claude.read_only, true);
assert.equal(cp334Handoff.to_pack_id, "CP00-335");
assert.equal(cp334Handoff.next_subphase_id, "RP10.P07.M04.S03");
assert.equal(cp335Coverage.valid, true, cp335Coverage.errors.join("; "));
assert.equal(cp335Coverage.summary.unit_count, 40);
assert.equal(cp335Coverage.summary.by_micro_phase["RP10.P07.M04"], 20);
assert.equal(cp335Slice.valid, true, cp335Slice.errors.join("; "));
assert.equal(cp335CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp335CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-335 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.failure_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp335Descriptor)),
  "contract failure_binding_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp335_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP335_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp335_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP335_NO_WRITE_ATTESTATION)));
assert.equal(cp335Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp335Hermes.production_ready_candidate, true);
assert.equal(cp335Claude.review_packet, "C10.CP00-335.intake_core_failure_binding_slice_descriptor");
assert.equal(cp335Claude.read_only, true);
assert.equal(cp335Handoff.to_pack_id, "CP00-336");
assert.equal(cp335Handoff.next_subphase_id, "RP10.P07.M05.S21");
assert.equal(cp336Coverage.valid, true, cp336Coverage.errors.join("; "));
assert.equal(cp336Coverage.summary.unit_count, 10);
assert.equal(cp336Coverage.summary.by_micro_phase["RP10.P07.M06"], 8);
assert.equal(cp336Slice.valid, true, cp336Slice.errors.join("; "));
assert.equal(cp336CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp336CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-336 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.failure_tail_slice_descriptor,
  JSON.parse(JSON.stringify(cp336Descriptor)),
  "contract failure_tail_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp336_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP336_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp336_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP336_NO_WRITE_ATTESTATION)));
assert.equal(cp336Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp336Hermes.production_ready_candidate, true);
assert.equal(cp336Claude.review_packet, "C10.CP00-336.intake_core_failure_tail_slice_descriptor");
assert.equal(cp336Claude.read_only, true);
assert.equal(cp336Handoff.to_pack_id, "CP00-337");
assert.equal(cp336Handoff.next_subphase_id, "RP10.P07.M06.S09");
assert.equal(cp337Coverage.valid, true, cp337Coverage.errors.join("; "));
assert.equal(cp337Coverage.summary.unit_count, 150);
assert.equal(cp337Coverage.summary.by_phase["RP10.P07"], 89);
assert.equal(cp337Coverage.summary.by_phase["RP10.P08"], 61);
assert.equal(cp337Foundation.valid, true, cp337Foundation.errors.join("; "));
assert.equal(cp337CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp337CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-337 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p07_closeout_p08_hermes_foundation_descriptor,
  JSON.parse(JSON.stringify(cp337Descriptor)),
  "contract p07_closeout_p08_hermes_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp337_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP337_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp337_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP337_NO_WRITE_ATTESTATION)));
assert.equal(cp337Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp337Hermes.production_ready_candidate, true);
assert.equal(cp337Claude.review_packet, "C10.CP00-337.intake_core_p07_closeout_p08_hermes_foundation_descriptor");
assert.equal(cp337Claude.read_only, true);
assert.equal(cp337Handoff.to_pack_id, "CP00-338");
assert.equal(cp337Handoff.next_subphase_id, "RP10.P08.M04.S20");
assert.equal(cp338Coverage.valid, true, cp338Coverage.errors.join("; "));
assert.equal(cp338Coverage.summary.unit_count, 40);
assert.equal(cp338Coverage.summary.by_micro_phase["RP10.P08.M05"], 22);
assert.equal(cp338Slice.valid, true, cp338Slice.errors.join("; "));
assert.equal(cp338CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp338CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-338 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp338Descriptor)),
  "contract hermes_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp338_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP338_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp338_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP338_NO_WRITE_ATTESTATION)));
assert.equal(cp338Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp338Hermes.production_ready_candidate, true);
assert.equal(cp338Claude.review_packet, "C10.CP00-338.intake_core_hermes_slice_descriptor");
assert.equal(cp338Claude.read_only, true);
assert.equal(cp338Handoff.to_pack_id, "CP00-339");
assert.equal(cp338Handoff.next_subphase_id, "RP10.P08.M06.S18");
assert.equal(cp339Coverage.valid, true, cp339Coverage.errors.join("; "));
assert.equal(cp339Coverage.summary.unit_count, 150);
assert.equal(cp339Coverage.summary.by_phase["RP10.P08"], 73);
assert.equal(cp339Coverage.summary.by_phase["RP10.P09"], 77);
assert.equal(cp339Foundation.valid, true, cp339Foundation.errors.join("; "));
assert.equal(cp339CaseSet.section_count, 13);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp339CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-339 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.p08_closeout_p09_review_foundation_descriptor,
  JSON.parse(JSON.stringify(cp339Descriptor)),
  "contract p08_closeout_p09_review_foundation_descriptor drift",
);
assert.deepEqual(intakeContract.cp339_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP339_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp339_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP339_NO_WRITE_ATTESTATION)));
assert.equal(cp339Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp339Hermes.production_ready_candidate, true);
assert.equal(cp339Claude.review_packet, "C10.CP00-339.intake_core_p08_closeout_p09_review_foundation_descriptor");
assert.equal(cp339Claude.read_only, true);
assert.equal(cp339Handoff.to_pack_id, "CP00-340");
assert.equal(cp339Handoff.next_subphase_id, "RP10.P09.M07.S03");
assert.equal(cp340Coverage.valid, true, cp340Coverage.errors.join("; "));
assert.equal(cp340Coverage.summary.unit_count, 10);
assert.equal(cp340Coverage.summary.by_micro_phase["RP10.P09.M07"], 10);
assert.equal(cp340Slice.valid, true, cp340Slice.errors.join("; "));
assert.equal(cp340CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp340CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-340 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.review_slice_descriptor,
  JSON.parse(JSON.stringify(cp340Descriptor)),
  "contract review_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp340_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP340_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp340_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP340_NO_WRITE_ATTESTATION)));
assert.equal(cp340Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp340Hermes.production_ready_candidate, true);
assert.equal(cp340Claude.review_packet, "C10.CP00-340.intake_core_review_slice_descriptor");
assert.equal(cp340Claude.read_only, true);
assert.equal(cp340Handoff.to_pack_id, "CP00-341");
assert.equal(cp340Handoff.next_subphase_id, "RP10.P09.M07.S13");
assert.equal(cp341Coverage.valid, true, cp341Coverage.errors.join("; "));
assert.equal(cp341Coverage.summary.unit_count, 28);
assert.equal(cp341Coverage.summary.by_micro_phase["RP10.P09.M07"], 8);
assert.equal(cp341Slice.valid, true, cp341Slice.errors.join("; "));
assert.equal(cp341CaseSet.section_count, 4);
for (const [microId, titles] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp341CaseSet.sections[microId].rows[intakeCoreRowKey(title)];
    assert.ok(row, `CP00-341 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  intakeContract.review_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp341Descriptor)),
  "contract review_closeout_slice_descriptor drift",
);
assert.deepEqual(intakeContract.cp341_requirements, JSON.parse(JSON.stringify(INTAKE_CORE_CP341_REQUIREMENTS)));
assert.deepEqual(intakeContract.cp341_no_write_attestation, JSON.parse(JSON.stringify(INTAKE_CORE_CP341_NO_WRITE_ATTESTATION)));
assert.equal(cp341Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp341Hermes.production_ready_candidate, true);
assert.equal(cp341Claude.review_packet, "C10.CP00-341.intake_core_review_closeout_slice_descriptor");
assert.equal(cp341Claude.read_only, true);
assert.equal(cp341Handoff.to_pack_id, "CP00-342");
assert.equal(cp341Handoff.next_subphase_id, "RP11.P00.M00.S01");
assert.equal(INTAKE_CORE_CP341_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP341_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP340_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP340_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP339_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP339_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP338_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP338_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP337_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP337_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP336_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP336_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP335_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP335_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP334_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP334_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP333_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP333_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP332_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP332_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP331_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP331_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP329_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP329_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP328_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP328_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP327_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP327_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP326_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP326_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP325_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP325_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP324_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP324_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP323_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP323_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP322_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP322_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(intakeContract.historical_pack_bindings));
assert.equal(intakeContract.historical_pack_bindings.at(-1).pack_id, "CP00-341");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp10:intake-core:validate",
      pack_id: INTAKE_CORE_CP341_PACK_BINDING.pack_id,
      covered_units: cp341Coverage.summary.unit_count,
      program_id: INTAKE_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp341Hermes.gate,
      claude_gate: intakeContract.current_pack.claude_gate,
      source_review_slice_pack_id: INTAKE_CORE_CP341_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp321Coverage.summary.unit_count,
      p01_closeout_p02_service_foundation_units_preserved: cp322Coverage.summary.unit_count,
      service_slice_units_preserved: cp323Coverage.summary.unit_count,
      service_review_slice_units_preserved: cp324Coverage.summary.unit_count,
      p02_closeout_p03_interface_p04_ui_foundation_units_preserved: cp325Coverage.summary.unit_count,
      ui_workflow_slice_units_preserved: cp326Coverage.summary.unit_count,
      permission_audit_fixture_units_preserved: cp327Coverage.summary.unit_count,
      p04_closeout_p05_permission_foundation_units_preserved: cp328Coverage.summary.unit_count,
      permission_fixture_tail_units_preserved: cp329Coverage.summary.unit_count,
      p05_fixture_closeout_p06_permission_matrix_foundation_units_preserved: cp330Coverage.summary.unit_count,
      permission_matrix_slice_units_preserved: cp331Coverage.summary.unit_count,
      permission_binding_slice_units_preserved: cp332Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp333Coverage.summary.unit_count,
      failure_slice_units_preserved: cp334Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp335Coverage.summary.unit_count,
      failure_tail_slice_units_preserved: cp336Coverage.summary.unit_count,
      p07_closeout_p08_hermes_foundation_units_preserved: cp337Coverage.summary.unit_count,
      hermes_slice_units_preserved: cp338Coverage.summary.unit_count,
      p08_closeout_p09_review_foundation_units_preserved: cp339Coverage.summary.unit_count,
      review_slice_units_preserved: cp340Coverage.summary.unit_count,
      next_pack_id: cp341Handoff.to_pack_id,
      production_ready_candidate: cp341Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
