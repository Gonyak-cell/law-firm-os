import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP426_PACK_BINDING,
  SETTLEMENT_CORE_CP426_REQUIREMENTS,
  SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP427_PACK_BINDING,
  SETTLEMENT_CORE_CP427_REQUIREMENTS,
  SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP428_PACK_BINDING,
  SETTLEMENT_CORE_CP428_REQUIREMENTS,
  SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP429_PACK_BINDING,
  SETTLEMENT_CORE_CP429_REQUIREMENTS,
  SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP430_PACK_BINDING,
  SETTLEMENT_CORE_CP430_REQUIREMENTS,
  SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP431_PACK_BINDING,
  SETTLEMENT_CORE_CP431_REQUIREMENTS,
  SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP432_PACK_BINDING,
  SETTLEMENT_CORE_CP432_REQUIREMENTS,
  SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP433_PACK_BINDING,
  SETTLEMENT_CORE_CP433_REQUIREMENTS,
  SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP434_PACK_BINDING,
  SETTLEMENT_CORE_CP434_REQUIREMENTS,
  SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP435_PACK_BINDING,
  SETTLEMENT_CORE_CP435_REQUIREMENTS,
  SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP436_PACK_BINDING,
  SETTLEMENT_CORE_CP436_REQUIREMENTS,
  SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP437_PACK_BINDING,
  SETTLEMENT_CORE_CP437_REQUIREMENTS,
  SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP438_PACK_BINDING,
  SETTLEMENT_CORE_CP438_REQUIREMENTS,
  SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP439_PACK_BINDING,
  SETTLEMENT_CORE_CP439_REQUIREMENTS,
  SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP440_PACK_BINDING,
  SETTLEMENT_CORE_CP440_REQUIREMENTS,
  SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP441_PACK_BINDING,
  SETTLEMENT_CORE_CP441_REQUIREMENTS,
  SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP442_PACK_BINDING,
  SETTLEMENT_CORE_CP442_REQUIREMENTS,
  SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP443_PACK_BINDING,
  SETTLEMENT_CORE_CP443_REQUIREMENTS,
  SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP444_PACK_BINDING,
  SETTLEMENT_CORE_CP444_REQUIREMENTS,
  SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP445_PACK_BINDING,
  SETTLEMENT_CORE_CP445_REQUIREMENTS,
  SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP446_PACK_BINDING,
  SETTLEMENT_CORE_CP446_REQUIREMENTS,
  SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP447_PACK_BINDING,
  SETTLEMENT_CORE_CP447_REQUIREMENTS,
  SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP448_PACK_BINDING,
  SETTLEMENT_CORE_CP448_REQUIREMENTS,
  SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP449_PACK_BINDING,
  SETTLEMENT_CORE_CP449_REQUIREMENTS,
  SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP450_PACK_BINDING,
  SETTLEMENT_CORE_CP450_REQUIREMENTS,
  SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP451_PACK_BINDING,
  SETTLEMENT_CORE_CP451_REQUIREMENTS,
  SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP452_PACK_BINDING,
  SETTLEMENT_CORE_CP452_REQUIREMENTS,
  SETTLEMENT_CORE_PROGRAM_CONTRACT,
  createSettlementCoreCp426ClaudeReviewPacket,
  createSettlementCoreCp426CloseoutHandoff,
  createSettlementCoreCp426HermesEvidencePacket,
  createSettlementCoreCp426ScopeContractFoundationCaseSet,
  createSettlementCoreCp426ScopeContractFoundationDescriptor,
  createSettlementCoreCp427ClaudeReviewPacket,
  createSettlementCoreCp427CloseoutHandoff,
  createSettlementCoreCp427HermesEvidencePacket,
  createSettlementCoreCp427P01CloseoutP02FoundationCaseSet,
  createSettlementCoreCp427P01CloseoutP02FoundationDescriptor,
  createSettlementCoreCp428ClaudeReviewPacket,
  createSettlementCoreCp428CloseoutHandoff,
  createSettlementCoreCp428HermesEvidencePacket,
  createSettlementCoreCp428P02ContractImplementationSliceCaseSet,
  createSettlementCoreCp428P02ContractImplementationSliceDescriptor,
  createSettlementCoreCp429ClaudeReviewPacket,
  createSettlementCoreCp429CloseoutHandoff,
  createSettlementCoreCp429HermesEvidencePacket,
  createSettlementCoreCp429P02ImplementationWorkflowSliceCaseSet,
  createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor,
  createSettlementCoreCp430ClaudeReviewPacket,
  createSettlementCoreCp430CloseoutHandoff,
  createSettlementCoreCp430HermesEvidencePacket,
  createSettlementCoreCp430P02WorkflowSliceCaseSet,
  createSettlementCoreCp430P02WorkflowSliceDescriptor,
  createSettlementCoreCp431ClaudeReviewPacket,
  createSettlementCoreCp431CloseoutHandoff,
  createSettlementCoreCp431HermesEvidencePacket,
  createSettlementCoreCp431P02WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp432ClaudeReviewPacket,
  createSettlementCoreCp432CloseoutHandoff,
  createSettlementCoreCp432HermesEvidencePacket,
  createSettlementCoreCp432P02CloseoutP03FoundationCaseSet,
  createSettlementCoreCp432P02CloseoutP03FoundationDescriptor,
  createSettlementCoreCp433ClaudeReviewPacket,
  createSettlementCoreCp433CloseoutHandoff,
  createSettlementCoreCp433HermesEvidencePacket,
  createSettlementCoreCp433P03WorkflowSliceCaseSet,
  createSettlementCoreCp433P03WorkflowSliceDescriptor,
  createSettlementCoreCp434ClaudeReviewPacket,
  createSettlementCoreCp434CloseoutHandoff,
  createSettlementCoreCp434HermesEvidencePacket,
  createSettlementCoreCp434P03CloseoutP04FoundationCaseSet,
  createSettlementCoreCp434P03CloseoutP04FoundationDescriptor,
  createSettlementCoreCp435ClaudeReviewPacket,
  createSettlementCoreCp435CloseoutHandoff,
  createSettlementCoreCp435HermesEvidencePacket,
  createSettlementCoreCp435P04ImplementationSliceCaseSet,
  createSettlementCoreCp435P04ImplementationSliceDescriptor,
  createSettlementCoreCp436ClaudeReviewPacket,
  createSettlementCoreCp436CloseoutHandoff,
  createSettlementCoreCp436HermesEvidencePacket,
  createSettlementCoreCp436P04WorkflowSliceCaseSet,
  createSettlementCoreCp436P04WorkflowSliceDescriptor,
  createSettlementCoreCp437ClaudeReviewPacket,
  createSettlementCoreCp437CloseoutHandoff,
  createSettlementCoreCp437HermesEvidencePacket,
  createSettlementCoreCp437P04CloseoutP05FoundationCaseSet,
  createSettlementCoreCp437P04CloseoutP05FoundationDescriptor,
  createSettlementCoreCp438ClaudeReviewPacket,
  createSettlementCoreCp438CloseoutHandoff,
  createSettlementCoreCp438HermesEvidencePacket,
  createSettlementCoreCp438P05ImplementationSliceCaseSet,
  createSettlementCoreCp438P05ImplementationSliceDescriptor,
  createSettlementCoreCp439ClaudeReviewPacket,
  createSettlementCoreCp439CloseoutHandoff,
  createSettlementCoreCp439HermesEvidencePacket,
  createSettlementCoreCp439P05WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp440ClaudeReviewPacket,
  createSettlementCoreCp440CloseoutHandoff,
  createSettlementCoreCp440HermesEvidencePacket,
  createSettlementCoreCp440P05CloseoutP06FoundationCaseSet,
  createSettlementCoreCp440P05CloseoutP06FoundationDescriptor,
  createSettlementCoreCp441ClaudeReviewPacket,
  createSettlementCoreCp441CloseoutHandoff,
  createSettlementCoreCp441HermesEvidencePacket,
  createSettlementCoreCp441P06ImplementationWorkflowSliceCaseSet,
  createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor,
  createSettlementCoreCp442ClaudeReviewPacket,
  createSettlementCoreCp442CloseoutHandoff,
  createSettlementCoreCp442HermesEvidencePacket,
  createSettlementCoreCp442P06WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp443ClaudeReviewPacket,
  createSettlementCoreCp443CloseoutHandoff,
  createSettlementCoreCp443HermesEvidencePacket,
  createSettlementCoreCp443P06PermissionSliceCaseSet,
  createSettlementCoreCp443P06PermissionSliceDescriptor,
  createSettlementCoreCp444ClaudeReviewPacket,
  createSettlementCoreCp444CloseoutHandoff,
  createSettlementCoreCp444HermesEvidencePacket,
  createSettlementCoreCp444P06PermissionFixtureSliceCaseSet,
  createSettlementCoreCp444P06PermissionFixtureSliceDescriptor,
  createSettlementCoreCp445ClaudeReviewPacket,
  createSettlementCoreCp445CloseoutHandoff,
  createSettlementCoreCp445HermesEvidencePacket,
  createSettlementCoreCp445P06CloseoutP07FoundationCaseSet,
  createSettlementCoreCp445P06CloseoutP07FoundationDescriptor,
  createSettlementCoreCp446ClaudeReviewPacket,
  createSettlementCoreCp446CloseoutHandoff,
  createSettlementCoreCp446HermesEvidencePacket,
  createSettlementCoreCp446P07FoundationSliceCaseSet,
  createSettlementCoreCp446P07FoundationSliceDescriptor,
  createSettlementCoreCp447ClaudeReviewPacket,
  createSettlementCoreCp447CloseoutHandoff,
  createSettlementCoreCp447HermesEvidencePacket,
  createSettlementCoreCp447P07CloseoutP08FoundationCaseSet,
  createSettlementCoreCp447P07CloseoutP08FoundationDescriptor,
  createSettlementCoreCp448ClaudeReviewPacket,
  createSettlementCoreCp448CloseoutHandoff,
  createSettlementCoreCp448HermesEvidencePacket,
  createSettlementCoreCp448P08FixtureTestSliceCaseSet,
  createSettlementCoreCp448P08FixtureTestSliceDescriptor,
  createSettlementCoreCp449ClaudeReviewPacket,
  createSettlementCoreCp449CloseoutHandoff,
  createSettlementCoreCp449HermesEvidencePacket,
  createSettlementCoreCp449P08TestHermesSliceCaseSet,
  createSettlementCoreCp449P08TestHermesSliceDescriptor,
  createSettlementCoreCp450ClaudeReviewPacket,
  createSettlementCoreCp450CloseoutHandoff,
  createSettlementCoreCp450HermesEvidencePacket,
  createSettlementCoreCp450P08CloseoutP09FoundationCaseSet,
  createSettlementCoreCp450P08CloseoutP09FoundationDescriptor,
  createSettlementCoreCp451ClaudeReviewPacket,
  createSettlementCoreCp451CloseoutHandoff,
  createSettlementCoreCp451HermesEvidencePacket,
  createSettlementCoreCp451P09TestHermesSliceCaseSet,
  createSettlementCoreCp451P09TestHermesSliceDescriptor,
  createSettlementCoreCp452ClaudeReviewPacket,
  createSettlementCoreCp452CloseoutHandoff,
  createSettlementCoreCp452HermesEvidencePacket,
  createSettlementCoreCp452P09ReviewCloseoutSliceCaseSet,
  createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor,
  settlementCoreRowKey,
  validateSettlementCoreCp426Coverage,
  validateSettlementCoreCp426ScopeContractFoundationDescriptor,
  validateSettlementCoreCp427Coverage,
  validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor,
  validateSettlementCoreCp428Coverage,
  validateSettlementCoreCp428P02ContractImplementationSliceDescriptor,
  validateSettlementCoreCp429Coverage,
  validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor,
  validateSettlementCoreCp430Coverage,
  validateSettlementCoreCp430P02WorkflowSliceDescriptor,
  validateSettlementCoreCp431Coverage,
  validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor,
  validateSettlementCoreCp432Coverage,
  validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor,
  validateSettlementCoreCp433Coverage,
  validateSettlementCoreCp433P03WorkflowSliceDescriptor,
  validateSettlementCoreCp434Coverage,
  validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor,
  validateSettlementCoreCp435Coverage,
  validateSettlementCoreCp435P04ImplementationSliceDescriptor,
  validateSettlementCoreCp436Coverage,
  validateSettlementCoreCp436P04WorkflowSliceDescriptor,
  validateSettlementCoreCp437Coverage,
  validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor,
  validateSettlementCoreCp438Coverage,
  validateSettlementCoreCp438P05ImplementationSliceDescriptor,
  validateSettlementCoreCp439Coverage,
  validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor,
  validateSettlementCoreCp440Coverage,
  validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor,
  validateSettlementCoreCp441Coverage,
  validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor,
  validateSettlementCoreCp442Coverage,
  validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor,
  validateSettlementCoreCp443Coverage,
  validateSettlementCoreCp443P06PermissionSliceDescriptor,
  validateSettlementCoreCp444Coverage,
  validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor,
  validateSettlementCoreCp445Coverage,
  validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor,
  validateSettlementCoreCp446Coverage,
  validateSettlementCoreCp446P07FoundationSliceDescriptor,
  validateSettlementCoreCp447Coverage,
  validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor,
  validateSettlementCoreCp448Coverage,
  validateSettlementCoreCp448P08FixtureTestSliceDescriptor,
  validateSettlementCoreCp449Coverage,
  validateSettlementCoreCp449P08TestHermesSliceDescriptor,
  validateSettlementCoreCp450Coverage,
  validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor,
  validateSettlementCoreCp451Coverage,
  validateSettlementCoreCp451P09TestHermesSliceDescriptor,
  validateSettlementCoreCp452Coverage,
  validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor,
} from "../packages/settlement/src/index.js";

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

const settlementContract = await readJson("../contracts/settlement-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp426Manifest = await readOptionalJson("../docs/closeout-packs/cp00-426/manifest.json");
const cp426PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-426") ?? cp426Manifest?.plan_binding_snapshot;
const cp427Manifest = await readOptionalJson("../docs/closeout-packs/cp00-427/manifest.json");
const cp427PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-427") ?? cp427Manifest?.plan_binding_snapshot;
const cp428Manifest = await readOptionalJson("../docs/closeout-packs/cp00-428/manifest.json");
const cp428PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-428") ?? cp428Manifest?.plan_binding_snapshot;
const cp429Manifest = await readOptionalJson("../docs/closeout-packs/cp00-429/manifest.json");
const cp429PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-429") ?? cp429Manifest?.plan_binding_snapshot;
const cp430Manifest = await readOptionalJson("../docs/closeout-packs/cp00-430/manifest.json");
const cp430PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-430") ?? cp430Manifest?.plan_binding_snapshot;
const cp431Manifest = await readOptionalJson("../docs/closeout-packs/cp00-431/manifest.json");
const cp431PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-431") ?? cp431Manifest?.plan_binding_snapshot;
const cp432Manifest = await readOptionalJson("../docs/closeout-packs/cp00-432/manifest.json");
const cp432PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-432") ?? cp432Manifest?.plan_binding_snapshot;
const cp433Manifest = await readOptionalJson("../docs/closeout-packs/cp00-433/manifest.json");
const cp433PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-433") ?? cp433Manifest?.plan_binding_snapshot;
const cp434Manifest = await readOptionalJson("../docs/closeout-packs/cp00-434/manifest.json");
const cp434PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-434") ?? cp434Manifest?.plan_binding_snapshot;
const cp435Manifest = await readOptionalJson("../docs/closeout-packs/cp00-435/manifest.json");
const cp435PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-435") ?? cp435Manifest?.plan_binding_snapshot;
const cp436Manifest = await readOptionalJson("../docs/closeout-packs/cp00-436/manifest.json");
const cp436PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-436") ?? cp436Manifest?.plan_binding_snapshot;
const cp437Manifest = await readOptionalJson("../docs/closeout-packs/cp00-437/manifest.json");
const cp437PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-437") ?? cp437Manifest?.plan_binding_snapshot;
const cp438Manifest = await readOptionalJson("../docs/closeout-packs/cp00-438/manifest.json");
const cp438PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-438") ?? cp438Manifest?.plan_binding_snapshot;
const cp439Manifest = await readOptionalJson("../docs/closeout-packs/cp00-439/manifest.json");
const cp439PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-439") ?? cp439Manifest?.plan_binding_snapshot;
const cp440Manifest = await readOptionalJson("../docs/closeout-packs/cp00-440/manifest.json");
const cp440PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-440") ?? cp440Manifest?.plan_binding_snapshot;
const cp441Manifest = await readOptionalJson("../docs/closeout-packs/cp00-441/manifest.json");
const cp441PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-441") ?? cp441Manifest?.plan_binding_snapshot;
const cp442Manifest = await readOptionalJson("../docs/closeout-packs/cp00-442/manifest.json");
const cp442PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-442") ?? cp442Manifest?.plan_binding_snapshot;
const cp443Manifest = await readOptionalJson("../docs/closeout-packs/cp00-443/manifest.json");
const cp443PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-443") ?? cp443Manifest?.plan_binding_snapshot;
const cp444Manifest = await readOptionalJson("../docs/closeout-packs/cp00-444/manifest.json");
const cp444PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-444") ?? cp444Manifest?.plan_binding_snapshot;
const cp445Manifest = await readOptionalJson("../docs/closeout-packs/cp00-445/manifest.json");
const cp445PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-445") ?? cp445Manifest?.plan_binding_snapshot;
const cp446Manifest = await readOptionalJson("../docs/closeout-packs/cp00-446/manifest.json");
const cp446PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-446") ?? cp446Manifest?.plan_binding_snapshot;
const cp447Manifest = await readOptionalJson("../docs/closeout-packs/cp00-447/manifest.json");
const cp447PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-447") ?? cp447Manifest?.plan_binding_snapshot;
const cp448Manifest = await readOptionalJson("../docs/closeout-packs/cp00-448/manifest.json");
const cp448PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-448") ?? cp448Manifest?.plan_binding_snapshot;
const cp449Manifest = await readOptionalJson("../docs/closeout-packs/cp00-449/manifest.json");
const cp449PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-449") ?? cp449Manifest?.plan_binding_snapshot;
const cp450Manifest = await readOptionalJson("../docs/closeout-packs/cp00-450/manifest.json");
const cp450PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-450") ?? cp450Manifest?.plan_binding_snapshot;
const cp451Manifest = await readOptionalJson("../docs/closeout-packs/cp00-451/manifest.json");
const cp451PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-451") ?? cp451Manifest?.plan_binding_snapshot;
const cp452Manifest = await readOptionalJson("../docs/closeout-packs/cp00-452/manifest.json");
const cp452PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-452") ?? cp452Manifest?.plan_binding_snapshot;

assert.equal(settlementContract.schema_version, "law-firm-os.settlement-core-contract.v0.1");
assert.equal(settlementContract.program.program_id, "RP14");
assert.equal(settlementContract.program.program_title, "Partner Settlement");
assert.equal(settlementContract.program.upstream_program_id, "RP13");
assert.equal(settlementContract.program.hermes_gate, "H14");
assert.equal(settlementContract.program.claude_gate, "C14");
assert.equal(settlementContract.program.descriptor_only, true);
assert.deepEqual(settlementContract.program, JSON.parse(JSON.stringify(SETTLEMENT_CORE_PROGRAM_CONTRACT)));
assert.equal(settlementContract.current_pack.pack_id, "CP00-452");
assert.equal(settlementContract.program.current_pack_id, "CP00-452");
assert.deepEqual(settlementContract.current_pack, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP452_PACK_BINDING)));
assert.deepEqual(settlementContract.no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION)));

assert.ok(cp426PlanPack, "CP00-426 must exist in closeout-pack-plan.json");
assert.equal(cp426PlanPack.unit_count, SETTLEMENT_CORE_CP426_PACK_BINDING.unit_count, "CP00-426 unit count drift");
assert.ok(cp427PlanPack, "CP00-427 must exist in closeout-pack-plan.json");
assert.equal(cp427PlanPack.unit_count, SETTLEMENT_CORE_CP427_PACK_BINDING.unit_count, "CP00-427 unit count drift");
assert.ok(cp428PlanPack, "CP00-428 must exist in closeout-pack-plan.json");
assert.equal(cp428PlanPack.unit_count, SETTLEMENT_CORE_CP428_PACK_BINDING.unit_count, "CP00-428 unit count drift");
assert.ok(cp429PlanPack, "CP00-429 must exist in closeout-pack-plan.json");
assert.equal(cp429PlanPack.unit_count, SETTLEMENT_CORE_CP429_PACK_BINDING.unit_count, "CP00-429 unit count drift");
assert.ok(cp430PlanPack, "CP00-430 must exist in closeout-pack-plan.json");
assert.equal(cp430PlanPack.unit_count, SETTLEMENT_CORE_CP430_PACK_BINDING.unit_count, "CP00-430 unit count drift");
assert.ok(cp431PlanPack, "CP00-431 must exist in closeout-pack-plan.json");
assert.equal(cp431PlanPack.unit_count, SETTLEMENT_CORE_CP431_PACK_BINDING.unit_count, "CP00-431 unit count drift");
assert.ok(cp432PlanPack, "CP00-432 must exist in closeout-pack-plan.json");
assert.equal(cp432PlanPack.unit_count, SETTLEMENT_CORE_CP432_PACK_BINDING.unit_count, "CP00-432 unit count drift");
assert.ok(cp433PlanPack, "CP00-433 must exist in closeout-pack-plan.json");
assert.equal(cp433PlanPack.unit_count, SETTLEMENT_CORE_CP433_PACK_BINDING.unit_count, "CP00-433 unit count drift");
assert.ok(cp434PlanPack, "CP00-434 must exist in closeout-pack-plan.json");
assert.equal(cp434PlanPack.unit_count, SETTLEMENT_CORE_CP434_PACK_BINDING.unit_count, "CP00-434 unit count drift");
assert.ok(cp435PlanPack, "CP00-435 must exist in closeout-pack-plan.json");
assert.equal(cp435PlanPack.unit_count, SETTLEMENT_CORE_CP435_PACK_BINDING.unit_count, "CP00-435 unit count drift");
assert.ok(cp436PlanPack, "CP00-436 must exist in closeout-pack-plan.json");
assert.equal(cp436PlanPack.unit_count, SETTLEMENT_CORE_CP436_PACK_BINDING.unit_count, "CP00-436 unit count drift");
assert.ok(cp437PlanPack, "CP00-437 must exist in closeout-pack-plan.json");
assert.equal(cp437PlanPack.unit_count, SETTLEMENT_CORE_CP437_PACK_BINDING.unit_count, "CP00-437 unit count drift");
assert.ok(cp438PlanPack, "CP00-438 must exist in closeout-pack-plan.json");
assert.equal(cp438PlanPack.unit_count, SETTLEMENT_CORE_CP438_PACK_BINDING.unit_count, "CP00-438 unit count drift");
assert.ok(cp439PlanPack, "CP00-439 must exist in closeout-pack-plan.json");
assert.equal(cp439PlanPack.unit_count, SETTLEMENT_CORE_CP439_PACK_BINDING.unit_count, "CP00-439 unit count drift");
assert.ok(cp440PlanPack, "CP00-440 must exist in closeout-pack-plan.json");
assert.equal(cp440PlanPack.unit_count, SETTLEMENT_CORE_CP440_PACK_BINDING.unit_count, "CP00-440 unit count drift");
assert.ok(cp441PlanPack, "CP00-441 must exist in closeout-pack-plan.json");
assert.equal(cp441PlanPack.unit_count, SETTLEMENT_CORE_CP441_PACK_BINDING.unit_count, "CP00-441 unit count drift");
assert.ok(cp442PlanPack, "CP00-442 must exist in closeout-pack-plan.json");
assert.equal(cp442PlanPack.unit_count, SETTLEMENT_CORE_CP442_PACK_BINDING.unit_count, "CP00-442 unit count drift");
assert.ok(cp443PlanPack, "CP00-443 must exist in closeout-pack-plan.json");
assert.equal(cp443PlanPack.unit_count, SETTLEMENT_CORE_CP443_PACK_BINDING.unit_count, "CP00-443 unit count drift");
assert.ok(cp444PlanPack, "CP00-444 must exist in closeout-pack-plan.json");
assert.equal(cp444PlanPack.unit_count, SETTLEMENT_CORE_CP444_PACK_BINDING.unit_count, "CP00-444 unit count drift");
assert.ok(cp445PlanPack, "CP00-445 must exist in closeout-pack-plan.json");
assert.equal(cp445PlanPack.unit_count, SETTLEMENT_CORE_CP445_PACK_BINDING.unit_count, "CP00-445 unit count drift");
assert.ok(cp446PlanPack, "CP00-446 must exist in closeout-pack-plan.json");
assert.equal(cp446PlanPack.unit_count, SETTLEMENT_CORE_CP446_PACK_BINDING.unit_count, "CP00-446 unit count drift");
assert.ok(cp447PlanPack, "CP00-447 must exist in closeout-pack-plan.json");
assert.equal(cp447PlanPack.unit_count, SETTLEMENT_CORE_CP447_PACK_BINDING.unit_count, "CP00-447 unit count drift");
assert.ok(cp448PlanPack, "CP00-448 must exist in closeout-pack-plan.json");
assert.equal(cp448PlanPack.unit_count, SETTLEMENT_CORE_CP448_PACK_BINDING.unit_count, "CP00-448 unit count drift");
assert.ok(cp449PlanPack, "CP00-449 must exist in closeout-pack-plan.json");
assert.equal(cp449PlanPack.unit_count, SETTLEMENT_CORE_CP449_PACK_BINDING.unit_count, "CP00-449 unit count drift");
assert.ok(cp450PlanPack, "CP00-450 must exist in closeout-pack-plan.json");
assert.equal(cp450PlanPack.unit_count, SETTLEMENT_CORE_CP450_PACK_BINDING.unit_count, "CP00-450 unit count drift");
assert.ok(cp451PlanPack, "CP00-451 must exist in closeout-pack-plan.json");
assert.equal(cp451PlanPack.unit_count, SETTLEMENT_CORE_CP451_PACK_BINDING.unit_count, "CP00-451 unit count drift");
assert.ok(cp452PlanPack, "CP00-452 must exist in closeout-pack-plan.json");
assert.equal(cp452PlanPack.unit_count, SETTLEMENT_CORE_CP452_PACK_BINDING.unit_count, "CP00-452 unit count drift");

const cp426Coverage = validateSettlementCoreCp426Coverage(cp426PlanPack);
const cp426Descriptor = createSettlementCoreCp426ScopeContractFoundationDescriptor();
const cp426CaseSet = createSettlementCoreCp426ScopeContractFoundationCaseSet();
const cp426Foundation = validateSettlementCoreCp426ScopeContractFoundationDescriptor(cp426Descriptor, settlementContract);
const cp426Hermes = createSettlementCoreCp426HermesEvidencePacket(cp426PlanPack, settlementContract, cp426Descriptor);
const cp426Claude = createSettlementCoreCp426ClaudeReviewPacket(cp426PlanPack);
const cp426Handoff = createSettlementCoreCp426CloseoutHandoff();
const cp427Coverage = validateSettlementCoreCp427Coverage(cp427PlanPack);
const cp427Descriptor = createSettlementCoreCp427P01CloseoutP02FoundationDescriptor();
const cp427CaseSet = createSettlementCoreCp427P01CloseoutP02FoundationCaseSet();
const cp427Slice = validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor(cp427Descriptor, settlementContract);
const cp427Hermes = createSettlementCoreCp427HermesEvidencePacket(cp427PlanPack, settlementContract, cp427Descriptor);
const cp427Claude = createSettlementCoreCp427ClaudeReviewPacket(cp427PlanPack);
const cp427Handoff = createSettlementCoreCp427CloseoutHandoff();
const cp428Coverage = validateSettlementCoreCp428Coverage(cp428PlanPack);
const cp428Descriptor = createSettlementCoreCp428P02ContractImplementationSliceDescriptor();
const cp428CaseSet = createSettlementCoreCp428P02ContractImplementationSliceCaseSet();
const cp428Slice = validateSettlementCoreCp428P02ContractImplementationSliceDescriptor(cp428Descriptor, settlementContract);
const cp428Hermes = createSettlementCoreCp428HermesEvidencePacket(cp428PlanPack, settlementContract, cp428Descriptor);
const cp428Claude = createSettlementCoreCp428ClaudeReviewPacket(cp428PlanPack);
const cp428Handoff = createSettlementCoreCp428CloseoutHandoff();
const cp429Coverage = validateSettlementCoreCp429Coverage(cp429PlanPack);
const cp429Descriptor = createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor();
const cp429CaseSet = createSettlementCoreCp429P02ImplementationWorkflowSliceCaseSet();
const cp429Slice = validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(cp429Descriptor, settlementContract);
const cp429Hermes = createSettlementCoreCp429HermesEvidencePacket(cp429PlanPack, settlementContract, cp429Descriptor);
const cp429Claude = createSettlementCoreCp429ClaudeReviewPacket(cp429PlanPack);
const cp429Handoff = createSettlementCoreCp429CloseoutHandoff();
const cp430Coverage = validateSettlementCoreCp430Coverage(cp430PlanPack);
const cp430Descriptor = createSettlementCoreCp430P02WorkflowSliceDescriptor();
const cp430CaseSet = createSettlementCoreCp430P02WorkflowSliceCaseSet();
const cp430Slice = validateSettlementCoreCp430P02WorkflowSliceDescriptor(cp430Descriptor, settlementContract);
const cp430Hermes = createSettlementCoreCp430HermesEvidencePacket(cp430PlanPack, settlementContract, cp430Descriptor);
const cp430Claude = createSettlementCoreCp430ClaudeReviewPacket(cp430PlanPack);
const cp430Handoff = createSettlementCoreCp430CloseoutHandoff();
const cp431Coverage = validateSettlementCoreCp431Coverage(cp431PlanPack);
const cp431Descriptor = createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor();
const cp431CaseSet = createSettlementCoreCp431P02WorkflowPermissionSliceCaseSet();
const cp431Slice = validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(cp431Descriptor, settlementContract);
const cp431Hermes = createSettlementCoreCp431HermesEvidencePacket(cp431PlanPack, settlementContract, cp431Descriptor);
const cp431Claude = createSettlementCoreCp431ClaudeReviewPacket(cp431PlanPack);
const cp431Handoff = createSettlementCoreCp431CloseoutHandoff();
const cp432Coverage = validateSettlementCoreCp432Coverage(cp432PlanPack);
const cp432Descriptor = createSettlementCoreCp432P02CloseoutP03FoundationDescriptor();
const cp432CaseSet = createSettlementCoreCp432P02CloseoutP03FoundationCaseSet();
const cp432Slice = validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor(cp432Descriptor, settlementContract);
const cp432Hermes = createSettlementCoreCp432HermesEvidencePacket(cp432PlanPack, settlementContract, cp432Descriptor);
const cp432Claude = createSettlementCoreCp432ClaudeReviewPacket(cp432PlanPack);
const cp432Handoff = createSettlementCoreCp432CloseoutHandoff();
const cp433Coverage = validateSettlementCoreCp433Coverage(cp433PlanPack);
const cp433Descriptor = createSettlementCoreCp433P03WorkflowSliceDescriptor();
const cp433CaseSet = createSettlementCoreCp433P03WorkflowSliceCaseSet();
const cp433Slice = validateSettlementCoreCp433P03WorkflowSliceDescriptor(cp433Descriptor, settlementContract);
const cp433Hermes = createSettlementCoreCp433HermesEvidencePacket(cp433PlanPack, settlementContract, cp433Descriptor);
const cp433Claude = createSettlementCoreCp433ClaudeReviewPacket(cp433PlanPack);
const cp433Handoff = createSettlementCoreCp433CloseoutHandoff();
const cp434Coverage = validateSettlementCoreCp434Coverage(cp434PlanPack);
const cp434Descriptor = createSettlementCoreCp434P03CloseoutP04FoundationDescriptor();
const cp434CaseSet = createSettlementCoreCp434P03CloseoutP04FoundationCaseSet();
const cp434Slice = validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor(cp434Descriptor, settlementContract);
const cp434Hermes = createSettlementCoreCp434HermesEvidencePacket(cp434PlanPack, settlementContract, cp434Descriptor);
const cp434Claude = createSettlementCoreCp434ClaudeReviewPacket(cp434PlanPack);
const cp434Handoff = createSettlementCoreCp434CloseoutHandoff();
const cp435Coverage = validateSettlementCoreCp435Coverage(cp435PlanPack);
const cp435Descriptor = createSettlementCoreCp435P04ImplementationSliceDescriptor();
const cp435CaseSet = createSettlementCoreCp435P04ImplementationSliceCaseSet();
const cp435Slice = validateSettlementCoreCp435P04ImplementationSliceDescriptor(cp435Descriptor, settlementContract);
const cp435Hermes = createSettlementCoreCp435HermesEvidencePacket(cp435PlanPack, settlementContract, cp435Descriptor);
const cp435Claude = createSettlementCoreCp435ClaudeReviewPacket(cp435PlanPack);
const cp435Handoff = createSettlementCoreCp435CloseoutHandoff();
const cp436Coverage = validateSettlementCoreCp436Coverage(cp436PlanPack);
const cp436Descriptor = createSettlementCoreCp436P04WorkflowSliceDescriptor();
const cp436CaseSet = createSettlementCoreCp436P04WorkflowSliceCaseSet();
const cp436Slice = validateSettlementCoreCp436P04WorkflowSliceDescriptor(cp436Descriptor, settlementContract);
const cp436Hermes = createSettlementCoreCp436HermesEvidencePacket(cp436PlanPack, settlementContract, cp436Descriptor);
const cp436Claude = createSettlementCoreCp436ClaudeReviewPacket(cp436PlanPack);
const cp436Handoff = createSettlementCoreCp436CloseoutHandoff();
const cp437Coverage = validateSettlementCoreCp437Coverage(cp437PlanPack);
const cp437Descriptor = createSettlementCoreCp437P04CloseoutP05FoundationDescriptor();
const cp437CaseSet = createSettlementCoreCp437P04CloseoutP05FoundationCaseSet();
const cp437Slice = validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor(cp437Descriptor, settlementContract);
const cp437Hermes = createSettlementCoreCp437HermesEvidencePacket(cp437PlanPack, settlementContract, cp437Descriptor);
const cp437Claude = createSettlementCoreCp437ClaudeReviewPacket(cp437PlanPack);
const cp437Handoff = createSettlementCoreCp437CloseoutHandoff();
const cp438Coverage = validateSettlementCoreCp438Coverage(cp438PlanPack);
const cp438Descriptor = createSettlementCoreCp438P05ImplementationSliceDescriptor();
const cp438CaseSet = createSettlementCoreCp438P05ImplementationSliceCaseSet();
const cp438Slice = validateSettlementCoreCp438P05ImplementationSliceDescriptor(cp438Descriptor, settlementContract);
const cp438Hermes = createSettlementCoreCp438HermesEvidencePacket(cp438PlanPack, settlementContract, cp438Descriptor);
const cp438Claude = createSettlementCoreCp438ClaudeReviewPacket(cp438PlanPack);
const cp438Handoff = createSettlementCoreCp438CloseoutHandoff();
const cp439Coverage = validateSettlementCoreCp439Coverage(cp439PlanPack);
const cp439Descriptor = createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor();
const cp439CaseSet = createSettlementCoreCp439P05WorkflowPermissionSliceCaseSet();
const cp439Slice = validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(cp439Descriptor, settlementContract);
const cp439Hermes = createSettlementCoreCp439HermesEvidencePacket(cp439PlanPack, settlementContract, cp439Descriptor);
const cp439Claude = createSettlementCoreCp439ClaudeReviewPacket(cp439PlanPack);
const cp439Handoff = createSettlementCoreCp439CloseoutHandoff();
const cp440Coverage = validateSettlementCoreCp440Coverage(cp440PlanPack);
const cp440Descriptor = createSettlementCoreCp440P05CloseoutP06FoundationDescriptor();
const cp440CaseSet = createSettlementCoreCp440P05CloseoutP06FoundationCaseSet();
const cp440Slice = validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor(cp440Descriptor, settlementContract);
const cp440Hermes = createSettlementCoreCp440HermesEvidencePacket(cp440PlanPack, settlementContract, cp440Descriptor);
const cp440Claude = createSettlementCoreCp440ClaudeReviewPacket(cp440PlanPack);
const cp440Handoff = createSettlementCoreCp440CloseoutHandoff();
const cp441Coverage = validateSettlementCoreCp441Coverage(cp441PlanPack);
const cp441Descriptor = createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor();
const cp441CaseSet = createSettlementCoreCp441P06ImplementationWorkflowSliceCaseSet();
const cp441Slice = validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(cp441Descriptor, settlementContract);
const cp441Hermes = createSettlementCoreCp441HermesEvidencePacket(cp441PlanPack, settlementContract, cp441Descriptor);
const cp441Claude = createSettlementCoreCp441ClaudeReviewPacket(cp441PlanPack);
const cp441Handoff = createSettlementCoreCp441CloseoutHandoff();
const cp442Coverage = validateSettlementCoreCp442Coverage(cp442PlanPack);
const cp442Descriptor = createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor();
const cp442CaseSet = createSettlementCoreCp442P06WorkflowPermissionSliceCaseSet();
const cp442Slice = validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(cp442Descriptor, settlementContract);
const cp442Hermes = createSettlementCoreCp442HermesEvidencePacket(cp442PlanPack, settlementContract, cp442Descriptor);
const cp442Claude = createSettlementCoreCp442ClaudeReviewPacket(cp442PlanPack);
const cp442Handoff = createSettlementCoreCp442CloseoutHandoff();
const cp443Coverage = validateSettlementCoreCp443Coverage(cp443PlanPack);
const cp443Descriptor = createSettlementCoreCp443P06PermissionSliceDescriptor();
const cp443CaseSet = createSettlementCoreCp443P06PermissionSliceCaseSet();
const cp443Slice = validateSettlementCoreCp443P06PermissionSliceDescriptor(cp443Descriptor, settlementContract);
const cp443Hermes = createSettlementCoreCp443HermesEvidencePacket(cp443PlanPack, settlementContract, cp443Descriptor);
const cp443Claude = createSettlementCoreCp443ClaudeReviewPacket(cp443PlanPack);
const cp443Handoff = createSettlementCoreCp443CloseoutHandoff();
const cp444Coverage = validateSettlementCoreCp444Coverage(cp444PlanPack);
const cp444Descriptor = createSettlementCoreCp444P06PermissionFixtureSliceDescriptor();
const cp444CaseSet = createSettlementCoreCp444P06PermissionFixtureSliceCaseSet();
const cp444Slice = validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor(cp444Descriptor, settlementContract);
const cp444Hermes = createSettlementCoreCp444HermesEvidencePacket(cp444PlanPack, settlementContract, cp444Descriptor);
const cp444Claude = createSettlementCoreCp444ClaudeReviewPacket(cp444PlanPack);
const cp444Handoff = createSettlementCoreCp444CloseoutHandoff();
const cp445Coverage = validateSettlementCoreCp445Coverage(cp445PlanPack);
const cp445Descriptor = createSettlementCoreCp445P06CloseoutP07FoundationDescriptor();
const cp445CaseSet = createSettlementCoreCp445P06CloseoutP07FoundationCaseSet();
const cp445Slice = validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor(cp445Descriptor, settlementContract);
const cp445Hermes = createSettlementCoreCp445HermesEvidencePacket(cp445PlanPack, settlementContract, cp445Descriptor);
const cp445Claude = createSettlementCoreCp445ClaudeReviewPacket(cp445PlanPack);
const cp445Handoff = createSettlementCoreCp445CloseoutHandoff();
const cp446Coverage = validateSettlementCoreCp446Coverage(cp446PlanPack);
const cp446Descriptor = createSettlementCoreCp446P07FoundationSliceDescriptor();
const cp446CaseSet = createSettlementCoreCp446P07FoundationSliceCaseSet();
const cp446Slice = validateSettlementCoreCp446P07FoundationSliceDescriptor(cp446Descriptor, settlementContract);
const cp446Hermes = createSettlementCoreCp446HermesEvidencePacket(cp446PlanPack, settlementContract, cp446Descriptor);
const cp446Claude = createSettlementCoreCp446ClaudeReviewPacket(cp446PlanPack);
const cp446Handoff = createSettlementCoreCp446CloseoutHandoff();
const cp447Coverage = validateSettlementCoreCp447Coverage(cp447PlanPack);
const cp447Descriptor = createSettlementCoreCp447P07CloseoutP08FoundationDescriptor();
const cp447CaseSet = createSettlementCoreCp447P07CloseoutP08FoundationCaseSet();
const cp447Slice = validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor(cp447Descriptor, settlementContract);
const cp447Hermes = createSettlementCoreCp447HermesEvidencePacket(cp447PlanPack, settlementContract, cp447Descriptor);
const cp447Claude = createSettlementCoreCp447ClaudeReviewPacket(cp447PlanPack);
const cp447Handoff = createSettlementCoreCp447CloseoutHandoff();
const cp448Coverage = validateSettlementCoreCp448Coverage(cp448PlanPack);
const cp448Descriptor = createSettlementCoreCp448P08FixtureTestSliceDescriptor();
const cp448CaseSet = createSettlementCoreCp448P08FixtureTestSliceCaseSet();
const cp448Slice = validateSettlementCoreCp448P08FixtureTestSliceDescriptor(cp448Descriptor, settlementContract);
const cp448Hermes = createSettlementCoreCp448HermesEvidencePacket(cp448PlanPack, settlementContract, cp448Descriptor);
const cp448Claude = createSettlementCoreCp448ClaudeReviewPacket(cp448PlanPack);
const cp448Handoff = createSettlementCoreCp448CloseoutHandoff();
const cp449Coverage = validateSettlementCoreCp449Coverage(cp449PlanPack);
const cp449Descriptor = createSettlementCoreCp449P08TestHermesSliceDescriptor();
const cp449CaseSet = createSettlementCoreCp449P08TestHermesSliceCaseSet();
const cp449Slice = validateSettlementCoreCp449P08TestHermesSliceDescriptor(cp449Descriptor, settlementContract);
const cp449Hermes = createSettlementCoreCp449HermesEvidencePacket(cp449PlanPack, settlementContract, cp449Descriptor);
const cp449Claude = createSettlementCoreCp449ClaudeReviewPacket(cp449PlanPack);
const cp449Handoff = createSettlementCoreCp449CloseoutHandoff();
const cp450Coverage = validateSettlementCoreCp450Coverage(cp450PlanPack);
const cp450Descriptor = createSettlementCoreCp450P08CloseoutP09FoundationDescriptor();
const cp450CaseSet = createSettlementCoreCp450P08CloseoutP09FoundationCaseSet();
const cp450Slice = validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor(cp450Descriptor, settlementContract);
const cp450Hermes = createSettlementCoreCp450HermesEvidencePacket(cp450PlanPack, settlementContract, cp450Descriptor);
const cp450Claude = createSettlementCoreCp450ClaudeReviewPacket(cp450PlanPack);
const cp450Handoff = createSettlementCoreCp450CloseoutHandoff();
const cp451Coverage = validateSettlementCoreCp451Coverage(cp451PlanPack);
const cp451Descriptor = createSettlementCoreCp451P09TestHermesSliceDescriptor();
const cp451CaseSet = createSettlementCoreCp451P09TestHermesSliceCaseSet();
const cp451Slice = validateSettlementCoreCp451P09TestHermesSliceDescriptor(cp451Descriptor, settlementContract);
const cp451Hermes = createSettlementCoreCp451HermesEvidencePacket(cp451PlanPack, settlementContract, cp451Descriptor);
const cp451Claude = createSettlementCoreCp451ClaudeReviewPacket(cp451PlanPack);
const cp451Handoff = createSettlementCoreCp451CloseoutHandoff();
const cp452Coverage = validateSettlementCoreCp452Coverage(cp452PlanPack);
const cp452Descriptor = createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor();
const cp452CaseSet = createSettlementCoreCp452P09ReviewCloseoutSliceCaseSet();
const cp452Slice = validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(cp452Descriptor, settlementContract);
const cp452Hermes = createSettlementCoreCp452HermesEvidencePacket(cp452PlanPack, settlementContract, cp452Descriptor);
const cp452Claude = createSettlementCoreCp452ClaudeReviewPacket(cp452PlanPack);
const cp452Handoff = createSettlementCoreCp452CloseoutHandoff();

assert.equal(cp426Coverage.valid, true, cp426Coverage.errors.join("; "));
assert.equal(cp426Coverage.summary.unit_count, 150);
assert.equal(cp426Coverage.summary.by_phase["RP14.P00"], 92);
assert.equal(cp426Coverage.summary.by_phase["RP14.P01"], 58);
assert.equal(cp426Foundation.valid, true, cp426Foundation.errors.join("; "));
assert.equal(cp426CaseSet.section_count, 16);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp426CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-426 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp426Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp426_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP426_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp426_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION)));
assert.equal(cp426Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp426Hermes.production_ready_candidate, true);
assert.equal(cp426Claude.review_packet, "C14.CP00-426.settlement_core_scope_contract_foundation_descriptor");
assert.equal(cp426Claude.read_only, true);
assert.equal(cp426Handoff.to_pack_id, "CP00-427");
assert.equal(cp426Handoff.next_subphase_id, "RP14.P01.M04.S14");
assert.equal(SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp427Coverage.valid, true, cp427Coverage.errors.join("; "));
assert.equal(cp427Coverage.summary.unit_count, 150);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M04"], 7);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M05"], 22);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M06"], 20);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M07"], 22);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M08"], 20);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M09"], 20);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P01.M10"], 10);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P02.M00"], 13);
assert.equal(cp427Coverage.summary.by_micro_phase["RP14.P02.M01"], 16);
assert.equal(cp427Slice.valid, true, cp427Slice.errors.join("; "));
assert.equal(cp427CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp427CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-427 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp427Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp427_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP427_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp427_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION)));
assert.equal(cp427Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp427Hermes.production_ready_candidate, true);
assert.equal(cp427Claude.review_packet, "C14.CP00-427.settlement_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp427Claude.read_only, true);
assert.equal(cp427Handoff.to_pack_id, "CP00-428");
assert.equal(cp427Handoff.next_subphase_id, "RP14.P02.M01.S17");
assert.equal(SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp428Coverage.valid, true, cp428Coverage.errors.join("; "));
assert.equal(cp428Coverage.summary.unit_count, 40);
assert.equal(cp428Coverage.summary.by_micro_phase["RP14.P02.M01"], 4);
assert.equal(cp428Coverage.summary.by_micro_phase["RP14.P02.M02"], 22);
assert.equal(cp428Coverage.summary.by_micro_phase["RP14.P02.M03"], 14);
assert.equal(cp428Slice.valid, true, cp428Slice.errors.join("; "));
assert.equal(cp428CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp428CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-428 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p02_contract_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp428Descriptor)),
  "contract p02_contract_implementation_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp428_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP428_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp428_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION)));
assert.equal(cp428Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp428Hermes.production_ready_candidate, true);
assert.equal(cp428Claude.review_packet, "C14.CP00-428.settlement_core_p02_contract_implementation_slice_descriptor");
assert.equal(cp428Claude.read_only, true);
assert.equal(cp428Handoff.to_pack_id, "CP00-429");
assert.equal(cp428Handoff.next_subphase_id, "RP14.P02.M03.S15");
assert.equal(SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp429Coverage.valid, true, cp429Coverage.errors.join("; "));
assert.equal(cp429Coverage.summary.unit_count, 10);
assert.equal(cp429Coverage.summary.by_micro_phase["RP14.P02.M03"], 8);
assert.equal(cp429Coverage.summary.by_micro_phase["RP14.P02.M04"], 2);
assert.equal(cp429Slice.valid, true, cp429Slice.errors.join("; "));
assert.equal(cp429CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp429CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-429 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p02_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp429Descriptor)),
  "contract p02_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp429_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP429_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp429_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION)));
assert.equal(cp429Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp429Hermes.production_ready_candidate, true);
assert.equal(cp429Claude.review_packet, "C14.CP00-429.settlement_core_p02_implementation_workflow_slice_descriptor");
assert.equal(cp429Claude.read_only, true);
assert.equal(cp429Handoff.to_pack_id, "CP00-430");
assert.equal(cp429Handoff.next_subphase_id, "RP14.P02.M04.S03");
assert.equal(SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp430Coverage.valid, true, cp430Coverage.errors.join("; "));
assert.equal(cp430Coverage.summary.unit_count, 10);
assert.equal(cp430Coverage.summary.by_micro_phase["RP14.P02.M04"], 10);
assert.equal(cp430Slice.valid, true, cp430Slice.errors.join("; "));
assert.equal(cp430CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp430CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-430 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p02_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp430Descriptor)),
  "contract p02_workflow_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp430_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP430_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp430_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION)));
assert.equal(cp430Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp430Hermes.production_ready_candidate, true);
assert.equal(cp430Claude.review_packet, "C14.CP00-430.settlement_core_p02_workflow_slice_descriptor");
assert.equal(cp430Claude.read_only, true);
assert.equal(cp430Handoff.to_pack_id, "CP00-431");
assert.equal(cp430Handoff.next_subphase_id, "RP14.P02.M04.S13");
assert.equal(SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp431Coverage.valid, true, cp431Coverage.errors.join("; "));
assert.equal(cp431Coverage.summary.unit_count, 40);
assert.equal(cp431Coverage.summary.by_micro_phase["RP14.P02.M04"], 10);
assert.equal(cp431Coverage.summary.by_micro_phase["RP14.P02.M05"], 22);
assert.equal(cp431Coverage.summary.by_micro_phase["RP14.P02.M06"], 8);
assert.equal(cp431Slice.valid, true, cp431Slice.errors.join("; "));
assert.equal(cp431CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp431CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-431 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp431Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp431_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP431_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp431_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION)));
assert.equal(cp431Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp431Hermes.production_ready_candidate, true);
assert.equal(cp431Claude.review_packet, "C14.CP00-431.settlement_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp431Claude.read_only, true);
assert.equal(cp431Handoff.to_pack_id, "CP00-432");
assert.equal(cp431Handoff.next_subphase_id, "RP14.P02.M06.S09");
assert.equal(SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp432Coverage.valid, true, cp432Coverage.errors.join("; "));
assert.equal(cp432Coverage.summary.unit_count, 150);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P02.M06"], 14);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P02.M07"], 22);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P02.M08"], 22);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P02.M09"], 22);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P02.M10"], 20);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P03.M00"], 3);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P03.M01"], 10);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P03.M02"], 10);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P03.M03"], 22);
assert.equal(cp432Coverage.summary.by_micro_phase["RP14.P03.M04"], 5);
assert.equal(cp432Slice.valid, true, cp432Slice.errors.join("; "));
assert.equal(cp432CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp432CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-432 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp432Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp432_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP432_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp432_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION)));
assert.equal(cp432Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp432Hermes.production_ready_candidate, true);
assert.equal(cp432Claude.review_packet, "C14.CP00-432.settlement_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp432Claude.read_only, true);
assert.equal(cp432Handoff.to_pack_id, "CP00-433");
assert.equal(cp432Handoff.next_subphase_id, "RP14.P03.M04.S06");
assert.equal(SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp433Coverage.valid, true, cp433Coverage.errors.join("; "));
assert.equal(cp433Coverage.summary.unit_count, 10);
assert.equal(cp433Coverage.summary.by_micro_phase["RP14.P03.M04"], 10);
assert.equal(cp433Slice.valid, true, cp433Slice.errors.join("; "));
assert.equal(cp433CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp433CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-433 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p03_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp433Descriptor)),
  "contract p03_workflow_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp433_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP433_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp433_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION)));
assert.equal(cp433Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp433Hermes.production_ready_candidate, true);
assert.equal(cp433Claude.review_packet, "C14.CP00-433.settlement_core_p03_workflow_slice_descriptor");
assert.equal(cp433Claude.read_only, true);
assert.equal(cp433Handoff.to_pack_id, "CP00-434");
assert.equal(cp433Handoff.next_subphase_id, "RP14.P03.M04.S16");
assert.equal(SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp434Coverage.valid, true, cp434Coverage.errors.join("; "));
assert.equal(cp434Coverage.summary.unit_count, 150);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M04"], 5);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M05"], 22);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M06"], 20);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M07"], 22);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M08"], 20);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M09"], 20);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P03.M10"], 10);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P04.M00"], 10);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P04.M01"], 10);
assert.equal(cp434Coverage.summary.by_micro_phase["RP14.P04.M02"], 11);
assert.equal(cp434Slice.valid, true, cp434Slice.errors.join("; "));
assert.equal(cp434CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp434CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-434 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp434Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp434_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP434_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp434_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION)));
assert.equal(cp434Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp434Hermes.production_ready_candidate, true);
assert.equal(cp434Claude.review_packet, "C14.CP00-434.settlement_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp434Claude.read_only, true);
assert.equal(cp434Handoff.to_pack_id, "CP00-435");
assert.equal(cp434Handoff.next_subphase_id, "RP14.P04.M02.S12");
assert.equal(SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp435Coverage.valid, true, cp435Coverage.errors.join("; "));
assert.equal(cp435Coverage.summary.unit_count, 40);
assert.equal(cp435Coverage.summary.by_micro_phase["RP14.P04.M02"], 9);
assert.equal(cp435Coverage.summary.by_micro_phase["RP14.P04.M03"], 22);
assert.equal(cp435Coverage.summary.by_micro_phase["RP14.P04.M04"], 9);
assert.equal(cp435Slice.valid, true, cp435Slice.errors.join("; "));
assert.equal(cp435CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp435CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-435 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p04_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp435Descriptor)),
  "contract p04_implementation_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp435_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP435_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp435_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION)));
assert.equal(cp435Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp435Hermes.production_ready_candidate, true);
assert.equal(cp435Claude.review_packet, "C14.CP00-435.settlement_core_p04_implementation_slice_descriptor");
assert.equal(cp435Claude.read_only, true);
assert.equal(cp435Handoff.to_pack_id, "CP00-436");
assert.equal(cp435Handoff.next_subphase_id, "RP14.P04.M04.S10");
assert.equal(SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp436Coverage.valid, true, cp436Coverage.errors.join("; "));
assert.equal(cp436Coverage.summary.unit_count, 10);
assert.equal(cp436Coverage.summary.by_micro_phase["RP14.P04.M04"], 10);
assert.equal(cp436Slice.valid, true, cp436Slice.errors.join("; "));
assert.equal(cp436CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp436CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-436 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p04_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp436Descriptor)),
  "contract p04_workflow_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp436_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP436_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp436_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION)));
assert.equal(cp436Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp436Hermes.production_ready_candidate, true);
assert.equal(cp436Claude.review_packet, "C14.CP00-436.settlement_core_p04_workflow_slice_descriptor");
assert.equal(cp436Claude.read_only, true);
assert.equal(cp436Handoff.to_pack_id, "CP00-437");
assert.equal(cp436Handoff.next_subphase_id, "RP14.P04.M04.S20");
assert.equal(SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp437Coverage.valid, true, cp437Coverage.errors.join("; "));
assert.equal(cp437Coverage.summary.unit_count, 150);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M04"], 3);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M05"], 22);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M06"], 22);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M07"], 22);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M08"], 22);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M09"], 20);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P04.M10"], 10);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P05.M00"], 10);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P05.M01"], 10);
assert.equal(cp437Coverage.summary.by_micro_phase["RP14.P05.M02"], 9);
assert.equal(cp437Slice.valid, true, cp437Slice.errors.join("; "));
assert.equal(cp437CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp437CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-437 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp437Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp437_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP437_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp437_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION)));
assert.equal(cp437Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp437Hermes.production_ready_candidate, true);
assert.equal(cp437Claude.review_packet, "C14.CP00-437.settlement_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp437Claude.read_only, true);
assert.equal(cp437Handoff.to_pack_id, "CP00-438");
assert.equal(cp437Handoff.next_subphase_id, "RP14.P05.M02.S10");
assert.equal(SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp438Coverage.valid, true, cp438Coverage.errors.join("; "));
assert.equal(cp438Coverage.summary.unit_count, 40);
assert.equal(cp438Coverage.summary.by_micro_phase["RP14.P05.M02"], 11);
assert.equal(cp438Coverage.summary.by_micro_phase["RP14.P05.M03"], 22);
assert.equal(cp438Coverage.summary.by_micro_phase["RP14.P05.M04"], 7);
assert.equal(cp438Slice.valid, true, cp438Slice.errors.join("; "));
assert.equal(cp438CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp438CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-438 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p05_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp438Descriptor)),
  "contract p05_implementation_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp438_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP438_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp438_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION)));
assert.equal(cp438Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp438Hermes.production_ready_candidate, true);
assert.equal(cp438Claude.review_packet, "C14.CP00-438.settlement_core_p05_implementation_slice_descriptor");
assert.equal(cp438Claude.read_only, true);
assert.equal(cp438Handoff.to_pack_id, "CP00-439");
assert.equal(cp438Handoff.next_subphase_id, "RP14.P05.M04.S08");
assert.equal(SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp439Coverage.valid, true, cp439Coverage.errors.join("; "));
assert.equal(cp439Coverage.summary.unit_count, 40);
assert.equal(cp439Coverage.summary.by_micro_phase["RP14.P05.M04"], 15);
assert.equal(cp439Coverage.summary.by_micro_phase["RP14.P05.M05"], 22);
assert.equal(cp439Coverage.summary.by_micro_phase["RP14.P05.M06"], 3);
assert.equal(cp439Slice.valid, true, cp439Slice.errors.join("; "));
assert.equal(cp439CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp439CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-439 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p05_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp439Descriptor)),
  "contract p05_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp439_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP439_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp439_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION)));
assert.equal(cp439Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp439Hermes.production_ready_candidate, true);
assert.equal(cp439Claude.review_packet, "C14.CP00-439.settlement_core_p05_workflow_permission_slice_descriptor");
assert.equal(cp439Claude.read_only, true);
assert.equal(cp439Handoff.to_pack_id, "CP00-440");
assert.equal(cp439Handoff.next_subphase_id, "RP14.P05.M06.S04");
assert.equal(SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp440Coverage.valid, true, cp440Coverage.errors.join("; "));
assert.equal(cp440Coverage.summary.unit_count, 150);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P05.M06"], 19);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P05.M07"], 22);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P05.M08"], 22);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P05.M09"], 20);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P05.M10"], 10);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P06.M00"], 13);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P06.M01"], 20);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P06.M02"], 22);
assert.equal(cp440Coverage.summary.by_micro_phase["RP14.P06.M03"], 2);
assert.equal(cp440Slice.valid, true, cp440Slice.errors.join("; "));
assert.equal(cp440CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp440CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-440 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp440Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp440_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP440_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp440_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION)));
assert.equal(cp440Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp440Hermes.production_ready_candidate, true);
assert.equal(cp440Claude.review_packet, "C14.CP00-440.settlement_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp440Claude.read_only, true);
assert.equal(cp440Handoff.to_pack_id, "CP00-441");
assert.equal(cp440Handoff.next_subphase_id, "RP14.P06.M03.S03");
assert.equal(SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp441Coverage.valid, true, cp441Coverage.errors.join("; "));
assert.equal(cp441Coverage.summary.unit_count, 40);
assert.equal(cp441Coverage.summary.by_micro_phase["RP14.P06.M03"], 20);
assert.equal(cp441Coverage.summary.by_micro_phase["RP14.P06.M04"], 20);
assert.equal(cp441Slice.valid, true, cp441Slice.errors.join("; "));
assert.equal(cp441CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp441CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-441 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p06_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp441Descriptor)),
  "contract p06_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp441_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP441_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp441_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION)));
assert.equal(cp441Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp441Hermes.production_ready_candidate, true);
assert.equal(cp441Claude.review_packet, "C14.CP00-441.settlement_core_p06_implementation_workflow_slice_descriptor");
assert.equal(cp441Claude.read_only, true);
assert.equal(cp441Handoff.to_pack_id, "CP00-442");
assert.equal(cp441Handoff.next_subphase_id, "RP14.P06.M04.S21");
assert.equal(SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp442Coverage.valid, true, cp442Coverage.errors.join("; "));
assert.equal(cp442Coverage.summary.unit_count, 10);
assert.equal(cp442Coverage.summary.by_micro_phase["RP14.P06.M04"], 2);
assert.equal(cp442Coverage.summary.by_micro_phase["RP14.P06.M05"], 8);
assert.equal(cp442Slice.valid, true, cp442Slice.errors.join("; "));
assert.equal(cp442CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp442CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-442 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p06_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp442Descriptor)),
  "contract p06_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp442_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP442_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp442_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION)));
assert.equal(cp442Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp442Hermes.production_ready_candidate, true);
assert.equal(cp442Claude.review_packet, "C14.CP00-442.settlement_core_p06_workflow_permission_slice_descriptor");
assert.equal(cp442Claude.read_only, true);
assert.equal(cp442Handoff.to_pack_id, "CP00-443");
assert.equal(cp442Handoff.next_subphase_id, "RP14.P06.M05.S09");
assert.equal(SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp443Coverage.valid, true, cp443Coverage.errors.join("; "));
assert.equal(cp443Coverage.summary.unit_count, 10);
assert.equal(cp443Coverage.summary.by_micro_phase["RP14.P06.M05"], 10);
assert.equal(cp443Slice.valid, true, cp443Slice.errors.join("; "));
assert.equal(cp443CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp443CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-443 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p06_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp443Descriptor)),
  "contract p06_permission_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp443_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP443_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp443_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION)));
assert.equal(cp443Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp443Hermes.production_ready_candidate, true);
assert.equal(cp443Claude.review_packet, "C14.CP00-443.settlement_core_p06_permission_slice_descriptor");
assert.equal(cp443Claude.read_only, true);
assert.equal(cp443Handoff.to_pack_id, "CP00-444");
assert.equal(cp443Handoff.next_subphase_id, "RP14.P06.M05.S19");
assert.equal(SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp444Coverage.valid, true, cp444Coverage.errors.join("; "));
assert.equal(cp444Coverage.summary.unit_count, 10);
assert.equal(cp444Coverage.summary.by_micro_phase["RP14.P06.M05"], 4);
assert.equal(cp444Coverage.summary.by_micro_phase["RP14.P06.M06"], 6);
assert.equal(cp444Slice.valid, true, cp444Slice.errors.join("; "));
assert.equal(cp444CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp444CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-444 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp444Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp444_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP444_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp444_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION)));
assert.equal(cp444Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp444Hermes.production_ready_candidate, true);
assert.equal(cp444Claude.review_packet, "C14.CP00-444.settlement_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp444Claude.read_only, true);
assert.equal(cp444Handoff.to_pack_id, "CP00-445");
assert.equal(cp444Handoff.next_subphase_id, "RP14.P06.M06.S07");
assert.equal(SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp445Coverage.valid, true, cp445Coverage.errors.join("; "));
assert.equal(cp445Coverage.summary.unit_count, 150);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P06.M06"], 16);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P06.M07"], 22);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P06.M08"], 22);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P06.M09"], 22);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P06.M10"], 20);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P07.M00"], 13);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P07.M01"], 20);
assert.equal(cp445Coverage.summary.by_micro_phase["RP14.P07.M02"], 15);
assert.equal(cp445Slice.valid, true, cp445Slice.errors.join("; "));
assert.equal(cp445CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp445CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-445 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp445Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp445_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP445_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp445_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION)));
assert.equal(cp445Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp445Hermes.production_ready_candidate, true);
assert.equal(cp445Claude.review_packet, "C14.CP00-445.settlement_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp445Claude.read_only, true);
assert.equal(cp445Handoff.to_pack_id, "CP00-446");
assert.equal(cp445Handoff.next_subphase_id, "RP14.P07.M02.S16");
assert.equal(SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp446Coverage.valid, true, cp446Coverage.errors.join("; "));
assert.equal(cp446Coverage.summary.unit_count, 150);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M02"], 7);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M03"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M04"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M05"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M06"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M07"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M08"], 22);
assert.equal(cp446Coverage.summary.by_micro_phase["RP14.P07.M09"], 11);
assert.equal(cp446Slice.valid, true, cp446Slice.errors.join("; "));
assert.equal(cp446CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp446CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-446 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p07_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp446Descriptor)),
  "contract p07_foundation_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp446_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP446_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp446_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION)));
assert.equal(cp446Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp446Hermes.production_ready_candidate, true);
assert.equal(cp446Claude.review_packet, "C14.CP00-446.settlement_core_p07_foundation_slice_descriptor");
assert.equal(cp446Claude.read_only, true);
assert.equal(cp446Handoff.to_pack_id, "CP00-447");
assert.equal(cp446Handoff.next_subphase_id, "RP14.P07.M09.S12");
assert.equal(SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp447Coverage.valid, true, cp447Coverage.errors.join("; "));
assert.equal(cp447Coverage.summary.unit_count, 150);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P07.M09"], 11);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P07.M10"], 20);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M00"], 10);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M01"], 10);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M02"], 20);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M03"], 22);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M04"], 22);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M05"], 22);
assert.equal(cp447Coverage.summary.by_micro_phase["RP14.P08.M06"], 13);
assert.equal(cp447Slice.valid, true, cp447Slice.errors.join("; "));
assert.equal(cp447CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp447CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-447 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp447Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp447_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP447_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp447_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION)));
assert.equal(cp447Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp447Hermes.production_ready_candidate, true);
assert.equal(cp447Claude.review_packet, "C14.CP00-447.settlement_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp447Claude.read_only, true);
assert.equal(cp447Handoff.to_pack_id, "CP00-448");
assert.equal(cp447Handoff.next_subphase_id, "RP14.P08.M06.S14");
assert.equal(SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp448Coverage.valid, true, cp448Coverage.errors.join("; "));
assert.equal(cp448Coverage.summary.unit_count, 10);
assert.equal(cp448Coverage.summary.by_micro_phase["RP14.P08.M06"], 9);
assert.equal(cp448Coverage.summary.by_micro_phase["RP14.P08.M07"], 1);
assert.equal(cp448Slice.valid, true, cp448Slice.errors.join("; "));
assert.equal(cp448CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp448CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-448 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p08_fixture_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp448Descriptor)),
  "contract p08_fixture_test_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp448_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP448_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp448_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION)));
assert.equal(cp448Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp448Hermes.production_ready_candidate, true);
assert.equal(cp448Claude.review_packet, "C14.CP00-448.settlement_core_p08_fixture_test_slice_descriptor");
assert.equal(cp448Claude.read_only, true);
assert.equal(cp448Handoff.to_pack_id, "CP00-449");
assert.equal(cp448Handoff.next_subphase_id, "RP14.P08.M07.S02");
assert.equal(SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp449Coverage.valid, true, cp449Coverage.errors.join("; "));
assert.equal(cp449Coverage.summary.unit_count, 40);
assert.equal(cp449Coverage.summary.by_micro_phase["RP14.P08.M07"], 21);
assert.equal(cp449Coverage.summary.by_micro_phase["RP14.P08.M08"], 19);
assert.equal(cp449Slice.valid, true, cp449Slice.errors.join("; "));
assert.equal(cp449CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp449CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-449 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p08_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp449Descriptor)),
  "contract p08_test_hermes_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp449_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP449_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp449_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION)));
assert.equal(cp449Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp449Hermes.production_ready_candidate, true);
assert.equal(cp449Claude.review_packet, "C14.CP00-449.settlement_core_p08_test_hermes_slice_descriptor");
assert.equal(cp449Claude.read_only, true);
assert.equal(cp449Handoff.to_pack_id, "CP00-450");
assert.equal(cp449Handoff.next_subphase_id, "RP14.P08.M08.S20");
assert.equal(SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp450Coverage.valid, true, cp450Coverage.errors.join("; "));
assert.equal(cp450Coverage.summary.unit_count, 150);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P08.M08"], 3);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P08.M09"], 20);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P08.M10"], 10);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M00"], 4);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M01"], 10);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M02"], 10);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M03"], 22);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M04"], 20);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M05"], 22);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M06"], 20);
assert.equal(cp450Coverage.summary.by_micro_phase["RP14.P09.M07"], 9);
assert.equal(cp450Slice.valid, true, cp450Slice.errors.join("; "));
assert.equal(cp450CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp450CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-450 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp450Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(settlementContract.cp450_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP450_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp450_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION)));
assert.equal(cp450Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp450Hermes.production_ready_candidate, true);
assert.equal(cp450Claude.review_packet, "C14.CP00-450.settlement_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp450Claude.read_only, true);
assert.equal(cp450Handoff.to_pack_id, "CP00-451");
assert.equal(cp450Handoff.next_subphase_id, "RP14.P09.M07.S10");
assert.equal(SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp451Coverage.valid, true, cp451Coverage.errors.join("; "));
assert.equal(cp451Coverage.summary.unit_count, 40);
assert.equal(cp451Coverage.summary.by_micro_phase["RP14.P09.M07"], 13);
assert.equal(cp451Coverage.summary.by_micro_phase["RP14.P09.M08"], 20);
assert.equal(cp451Coverage.summary.by_micro_phase["RP14.P09.M09"], 7);
assert.equal(cp451Slice.valid, true, cp451Slice.errors.join("; "));
assert.equal(cp451CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp451CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-451 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p09_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp451Descriptor)),
  "contract p09_test_hermes_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp451_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP451_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp451_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION)));
assert.equal(cp451Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp451Hermes.production_ready_candidate, true);
assert.equal(cp451Claude.review_packet, "C14.CP00-451.settlement_core_p09_test_hermes_slice_descriptor");
assert.equal(cp451Claude.read_only, true);
assert.equal(cp451Handoff.to_pack_id, "CP00-452");
assert.equal(cp451Handoff.next_subphase_id, "RP14.P09.M09.S08");
assert.equal(SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp452Coverage.valid, true, cp452Coverage.errors.join("; "));
assert.equal(cp452Coverage.summary.unit_count, 23);
assert.equal(cp452Coverage.summary.by_micro_phase["RP14.P09.M09"], 13);
assert.equal(cp452Coverage.summary.by_micro_phase["RP14.P09.M10"], 10);
assert.equal(cp452Slice.valid, true, cp452Slice.errors.join("; "));
assert.equal(cp452CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp452CaseSet.sections[microId].rows[settlementCoreRowKey(title)];
    assert.ok(row, `CP00-452 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  settlementContract.p09_review_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp452Descriptor)),
  "contract p09_review_closeout_slice_descriptor drift",
);
assert.deepEqual(settlementContract.cp452_requirements, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP452_REQUIREMENTS)));
assert.deepEqual(settlementContract.cp452_no_write_attestation, JSON.parse(JSON.stringify(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION)));
assert.equal(cp452Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp452Hermes.production_ready_candidate, true);
assert.equal(cp452Claude.review_packet, "C14.CP00-452.settlement_core_p09_review_closeout_slice_descriptor");
assert.equal(cp452Claude.read_only, true);
assert.equal(cp452Handoff.to_pack_id, "CP00-453");
assert.equal(cp452Handoff.next_subphase_id, "RP15.P00.M00.S01");
assert.equal(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(settlementContract.historical_pack_bindings));
assert.equal(settlementContract.historical_pack_bindings.at(-1).pack_id, "CP00-452");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp14:settlement-core:validate",
      pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id,
      covered_units: cp452Coverage.summary.unit_count,
      cp451_units_preserved: cp451Coverage.summary.unit_count,
      cp450_units_preserved: cp450Coverage.summary.unit_count,
      cp449_units_preserved: cp449Coverage.summary.unit_count,
      cp448_units_preserved: cp448Coverage.summary.unit_count,
      cp447_units_preserved: cp447Coverage.summary.unit_count,
      cp446_units_preserved: cp446Coverage.summary.unit_count,
      cp445_units_preserved: cp445Coverage.summary.unit_count,
      cp444_units_preserved: cp444Coverage.summary.unit_count,
      cp443_units_preserved: cp443Coverage.summary.unit_count,
      cp442_units_preserved: cp442Coverage.summary.unit_count,
      cp441_units_preserved: cp441Coverage.summary.unit_count,
      cp440_units_preserved: cp440Coverage.summary.unit_count,
      cp439_units_preserved: cp439Coverage.summary.unit_count,
      cp438_units_preserved: cp438Coverage.summary.unit_count,
      cp437_units_preserved: cp437Coverage.summary.unit_count,
      cp436_units_preserved: cp436Coverage.summary.unit_count,
      cp435_units_preserved: cp435Coverage.summary.unit_count,
      cp434_units_preserved: cp434Coverage.summary.unit_count,
      cp433_units_preserved: cp433Coverage.summary.unit_count,
      cp432_units_preserved: cp432Coverage.summary.unit_count,
      cp431_units_preserved: cp431Coverage.summary.unit_count,
      cp430_units_preserved: cp430Coverage.summary.unit_count,
      cp429_units_preserved: cp429Coverage.summary.unit_count,
      cp428_units_preserved: cp428Coverage.summary.unit_count,
      cp427_units_preserved: cp427Coverage.summary.unit_count,
      cp426_units_preserved: cp426Coverage.summary.unit_count,
      program_id: SETTLEMENT_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp452Hermes.gate,
      claude_gate: settlementContract.current_pack.claude_gate,
      source_payments_core_pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp452Handoff.to_pack_id,
      production_ready_candidate: cp452Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
