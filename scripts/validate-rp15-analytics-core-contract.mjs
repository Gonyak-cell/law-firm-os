import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP453_PACK_BINDING,
  ANALYTICS_CORE_CP453_REQUIREMENTS,
  ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP454_PACK_BINDING,
  ANALYTICS_CORE_CP454_REQUIREMENTS,
  ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP455_PACK_BINDING,
  ANALYTICS_CORE_CP455_REQUIREMENTS,
  ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP456_PACK_BINDING,
  ANALYTICS_CORE_CP456_REQUIREMENTS,
  ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP457_PACK_BINDING,
  ANALYTICS_CORE_CP457_REQUIREMENTS,
  ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP458_PACK_BINDING,
  ANALYTICS_CORE_CP458_REQUIREMENTS,
  ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP459_PACK_BINDING,
  ANALYTICS_CORE_CP459_REQUIREMENTS,
  ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP460_PACK_BINDING,
  ANALYTICS_CORE_CP460_REQUIREMENTS,
  ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP461_PACK_BINDING,
  ANALYTICS_CORE_CP461_REQUIREMENTS,
  ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP462_PACK_BINDING,
  ANALYTICS_CORE_CP462_REQUIREMENTS,
  ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP463_PACK_BINDING,
  ANALYTICS_CORE_CP463_REQUIREMENTS,
  ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP464_PACK_BINDING,
  ANALYTICS_CORE_CP464_REQUIREMENTS,
  ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP465_PACK_BINDING,
  ANALYTICS_CORE_CP465_REQUIREMENTS,
  ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP466_PACK_BINDING,
  ANALYTICS_CORE_CP466_REQUIREMENTS,
  ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP467_PACK_BINDING,
  ANALYTICS_CORE_CP467_REQUIREMENTS,
  ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP468_PACK_BINDING,
  ANALYTICS_CORE_CP468_REQUIREMENTS,
  ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP469_PACK_BINDING,
  ANALYTICS_CORE_CP469_REQUIREMENTS,
  ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP470_PACK_BINDING,
  ANALYTICS_CORE_CP470_REQUIREMENTS,
  ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP471_PACK_BINDING,
  ANALYTICS_CORE_CP471_REQUIREMENTS,
  ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP472_PACK_BINDING,
  ANALYTICS_CORE_CP472_REQUIREMENTS,
  ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP473_PACK_BINDING,
  ANALYTICS_CORE_CP473_REQUIREMENTS,
  ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP474_PACK_BINDING,
  ANALYTICS_CORE_CP474_REQUIREMENTS,
  ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP475_PACK_BINDING,
  ANALYTICS_CORE_CP475_REQUIREMENTS,
  ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP476_PACK_BINDING,
  ANALYTICS_CORE_CP476_REQUIREMENTS,
  ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP477_PACK_BINDING,
  ANALYTICS_CORE_CP477_REQUIREMENTS,
  ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP478_PACK_BINDING,
  ANALYTICS_CORE_CP478_REQUIREMENTS,
  ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP479_PACK_BINDING,
  ANALYTICS_CORE_CP479_REQUIREMENTS,
  ANALYTICS_CORE_PROGRAM_CONTRACT,
  createAnalyticsCoreCp453ClaudeReviewPacket,
  createAnalyticsCoreCp453CloseoutHandoff,
  createAnalyticsCoreCp453HermesEvidencePacket,
  createAnalyticsCoreCp453ScopeContractFoundationCaseSet,
  createAnalyticsCoreCp453ScopeContractFoundationDescriptor,
  createAnalyticsCoreCp454ClaudeReviewPacket,
  createAnalyticsCoreCp454CloseoutHandoff,
  createAnalyticsCoreCp454HermesEvidencePacket,
  createAnalyticsCoreCp454P01CloseoutP02FoundationCaseSet,
  createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor,
  createAnalyticsCoreCp455ClaudeReviewPacket,
  createAnalyticsCoreCp455CloseoutHandoff,
  createAnalyticsCoreCp455HermesEvidencePacket,
  createAnalyticsCoreCp455P02WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp456ClaudeReviewPacket,
  createAnalyticsCoreCp456CloseoutHandoff,
  createAnalyticsCoreCp456HermesEvidencePacket,
  createAnalyticsCoreCp456P02FixtureSliceCaseSet,
  createAnalyticsCoreCp456P02FixtureSliceDescriptor,
  createAnalyticsCoreCp457ClaudeReviewPacket,
  createAnalyticsCoreCp457CloseoutHandoff,
  createAnalyticsCoreCp457HermesEvidencePacket,
  createAnalyticsCoreCp457P02CloseoutP03FoundationCaseSet,
  createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor,
  createAnalyticsCoreCp458ClaudeReviewPacket,
  createAnalyticsCoreCp458CloseoutHandoff,
  createAnalyticsCoreCp458HermesEvidencePacket,
  createAnalyticsCoreCp458P03PermissionSliceCaseSet,
  createAnalyticsCoreCp458P03PermissionSliceDescriptor,
  createAnalyticsCoreCp459ClaudeReviewPacket,
  createAnalyticsCoreCp459CloseoutHandoff,
  createAnalyticsCoreCp459HermesEvidencePacket,
  createAnalyticsCoreCp459P03PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp460ClaudeReviewPacket,
  createAnalyticsCoreCp460CloseoutHandoff,
  createAnalyticsCoreCp460HermesEvidencePacket,
  createAnalyticsCoreCp460P03CloseoutP04FoundationCaseSet,
  createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor,
  createAnalyticsCoreCp461ClaudeReviewPacket,
  createAnalyticsCoreCp461CloseoutHandoff,
  createAnalyticsCoreCp461HermesEvidencePacket,
  createAnalyticsCoreCp461P04PermissionSliceCaseSet,
  createAnalyticsCoreCp461P04PermissionSliceDescriptor,
  createAnalyticsCoreCp462ClaudeReviewPacket,
  createAnalyticsCoreCp462CloseoutHandoff,
  createAnalyticsCoreCp462HermesEvidencePacket,
  createAnalyticsCoreCp462P04PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp463ClaudeReviewPacket,
  createAnalyticsCoreCp463CloseoutHandoff,
  createAnalyticsCoreCp463HermesEvidencePacket,
  createAnalyticsCoreCp463P04CloseoutP05FoundationCaseSet,
  createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor,
  createAnalyticsCoreCp464ClaudeReviewPacket,
  createAnalyticsCoreCp464CloseoutHandoff,
  createAnalyticsCoreCp464HermesEvidencePacket,
  createAnalyticsCoreCp464P05WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp465ClaudeReviewPacket,
  createAnalyticsCoreCp465CloseoutHandoff,
  createAnalyticsCoreCp465HermesEvidencePacket,
  createAnalyticsCoreCp465P05CloseoutP06FoundationCaseSet,
  createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor,
  createAnalyticsCoreCp466ClaudeReviewPacket,
  createAnalyticsCoreCp466CloseoutHandoff,
  createAnalyticsCoreCp466HermesEvidencePacket,
  createAnalyticsCoreCp466P06ImplementationWorkflowSliceCaseSet,
  createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor,
  createAnalyticsCoreCp467ClaudeReviewPacket,
  createAnalyticsCoreCp467CloseoutHandoff,
  createAnalyticsCoreCp467HermesEvidencePacket,
  createAnalyticsCoreCp467P06WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp468ClaudeReviewPacket,
  createAnalyticsCoreCp468CloseoutHandoff,
  createAnalyticsCoreCp468HermesEvidencePacket,
  createAnalyticsCoreCp468P06PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp469ClaudeReviewPacket,
  createAnalyticsCoreCp469CloseoutHandoff,
  createAnalyticsCoreCp469HermesEvidencePacket,
  createAnalyticsCoreCp469P06CloseoutP07FoundationCaseSet,
  createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor,
  createAnalyticsCoreCp470ClaudeReviewPacket,
  createAnalyticsCoreCp470CloseoutHandoff,
  createAnalyticsCoreCp470HermesEvidencePacket,
  createAnalyticsCoreCp470P07ImplementationSliceCaseSet,
  createAnalyticsCoreCp470P07ImplementationSliceDescriptor,
  createAnalyticsCoreCp471ClaudeReviewPacket,
  createAnalyticsCoreCp471CloseoutHandoff,
  createAnalyticsCoreCp471HermesEvidencePacket,
  createAnalyticsCoreCp471P07WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp472ClaudeReviewPacket,
  createAnalyticsCoreCp472CloseoutHandoff,
  createAnalyticsCoreCp472HermesEvidencePacket,
  createAnalyticsCoreCp472P07PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp473ClaudeReviewPacket,
  createAnalyticsCoreCp473CloseoutHandoff,
  createAnalyticsCoreCp473HermesEvidencePacket,
  createAnalyticsCoreCp473P07CloseoutP08FoundationCaseSet,
  createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor,
  createAnalyticsCoreCp474ClaudeReviewPacket,
  createAnalyticsCoreCp474CloseoutHandoff,
  createAnalyticsCoreCp474HermesEvidencePacket,
  createAnalyticsCoreCp474P08WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp475ClaudeReviewPacket,
  createAnalyticsCoreCp475CloseoutHandoff,
  createAnalyticsCoreCp475HermesEvidencePacket,
  createAnalyticsCoreCp475P08PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp476ClaudeReviewPacket,
  createAnalyticsCoreCp476CloseoutHandoff,
  createAnalyticsCoreCp476HermesEvidencePacket,
  createAnalyticsCoreCp476P08FixtureSliceCaseSet,
  createAnalyticsCoreCp476P08FixtureSliceDescriptor,
  createAnalyticsCoreCp477ClaudeReviewPacket,
  createAnalyticsCoreCp477CloseoutHandoff,
  createAnalyticsCoreCp477HermesEvidencePacket,
  createAnalyticsCoreCp477P08CloseoutP09FoundationCaseSet,
  createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor,
  createAnalyticsCoreCp478ClaudeReviewPacket,
  createAnalyticsCoreCp478CloseoutHandoff,
  createAnalyticsCoreCp478HermesEvidencePacket,
  createAnalyticsCoreCp478P09PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp479ClaudeReviewPacket,
  createAnalyticsCoreCp479CloseoutHandoff,
  createAnalyticsCoreCp479HermesEvidencePacket,
  createAnalyticsCoreCp479P09CloseoutSliceCaseSet,
  createAnalyticsCoreCp479P09CloseoutSliceDescriptor,
  analyticsCoreRowKey,
  validateAnalyticsCoreCp453Coverage,
  validateAnalyticsCoreCp453ScopeContractFoundationDescriptor,
  validateAnalyticsCoreCp454Coverage,
  validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor,
  validateAnalyticsCoreCp455Coverage,
  validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor,
  validateAnalyticsCoreCp456Coverage,
  validateAnalyticsCoreCp456P02FixtureSliceDescriptor,
  validateAnalyticsCoreCp457Coverage,
  validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor,
  validateAnalyticsCoreCp458Coverage,
  validateAnalyticsCoreCp458P03PermissionSliceDescriptor,
  validateAnalyticsCoreCp459Coverage,
  validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp460Coverage,
  validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor,
  validateAnalyticsCoreCp461Coverage,
  validateAnalyticsCoreCp461P04PermissionSliceDescriptor,
  validateAnalyticsCoreCp462Coverage,
  validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp463Coverage,
  validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor,
  validateAnalyticsCoreCp464Coverage,
  validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor,
  validateAnalyticsCoreCp465Coverage,
  validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor,
  validateAnalyticsCoreCp466Coverage,
  validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor,
  validateAnalyticsCoreCp467Coverage,
  validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor,
  validateAnalyticsCoreCp468Coverage,
  validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp469Coverage,
  validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor,
  validateAnalyticsCoreCp470Coverage,
  validateAnalyticsCoreCp470P07ImplementationSliceDescriptor,
  validateAnalyticsCoreCp471Coverage,
  validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor,
  validateAnalyticsCoreCp472Coverage,
  validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp473Coverage,
  validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor,
  validateAnalyticsCoreCp474Coverage,
  validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor,
  validateAnalyticsCoreCp475Coverage,
  validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp476Coverage,
  validateAnalyticsCoreCp476P08FixtureSliceDescriptor,
  validateAnalyticsCoreCp477Coverage,
  validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor,
  validateAnalyticsCoreCp478Coverage,
  validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor,
  validateAnalyticsCoreCp479Coverage,
  validateAnalyticsCoreCp479P09CloseoutSliceDescriptor,
} from "../packages/analytics/src/index.js";

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

const analyticsContract = await readJson("../contracts/analytics-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp453Manifest = await readOptionalJson("../docs/closeout-packs/cp00-453/manifest.json");
const cp453PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-453") ?? cp453Manifest?.plan_binding_snapshot;
const cp454Manifest = await readOptionalJson("../docs/closeout-packs/cp00-454/manifest.json");
const cp454PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-454") ?? cp454Manifest?.plan_binding_snapshot;
const cp455Manifest = await readOptionalJson("../docs/closeout-packs/cp00-455/manifest.json");
const cp455PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-455") ?? cp455Manifest?.plan_binding_snapshot;
const cp456Manifest = await readOptionalJson("../docs/closeout-packs/cp00-456/manifest.json");
const cp456PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-456") ?? cp456Manifest?.plan_binding_snapshot;
const cp457Manifest = await readOptionalJson("../docs/closeout-packs/cp00-457/manifest.json");
const cp457PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-457") ?? cp457Manifest?.plan_binding_snapshot;
const cp458Manifest = await readOptionalJson("../docs/closeout-packs/cp00-458/manifest.json");
const cp458PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-458") ?? cp458Manifest?.plan_binding_snapshot;
const cp459Manifest = await readOptionalJson("../docs/closeout-packs/cp00-459/manifest.json");
const cp459PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-459") ?? cp459Manifest?.plan_binding_snapshot;
const cp460Manifest = await readOptionalJson("../docs/closeout-packs/cp00-460/manifest.json");
const cp460PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-460") ?? cp460Manifest?.plan_binding_snapshot;
const cp461Manifest = await readOptionalJson("../docs/closeout-packs/cp00-461/manifest.json");
const cp461PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-461") ?? cp461Manifest?.plan_binding_snapshot;
const cp462Manifest = await readOptionalJson("../docs/closeout-packs/cp00-462/manifest.json");
const cp462PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-462") ?? cp462Manifest?.plan_binding_snapshot;
const cp463Manifest = await readOptionalJson("../docs/closeout-packs/cp00-463/manifest.json");
const cp463PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-463") ?? cp463Manifest?.plan_binding_snapshot;
const cp464Manifest = await readOptionalJson("../docs/closeout-packs/cp00-464/manifest.json");
const cp464PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-464") ?? cp464Manifest?.plan_binding_snapshot;
const cp465Manifest = await readOptionalJson("../docs/closeout-packs/cp00-465/manifest.json");
const cp465PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-465") ?? cp465Manifest?.plan_binding_snapshot;
const cp466Manifest = await readOptionalJson("../docs/closeout-packs/cp00-466/manifest.json");
const cp466PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-466") ?? cp466Manifest?.plan_binding_snapshot;
const cp467Manifest = await readOptionalJson("../docs/closeout-packs/cp00-467/manifest.json");
const cp467PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-467") ?? cp467Manifest?.plan_binding_snapshot;
const cp468Manifest = await readOptionalJson("../docs/closeout-packs/cp00-468/manifest.json");
const cp468PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-468") ?? cp468Manifest?.plan_binding_snapshot;
const cp469Manifest = await readOptionalJson("../docs/closeout-packs/cp00-469/manifest.json");
const cp469PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-469") ?? cp469Manifest?.plan_binding_snapshot;
const cp470Manifest = await readOptionalJson("../docs/closeout-packs/cp00-470/manifest.json");
const cp470PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-470") ?? cp470Manifest?.plan_binding_snapshot;
const cp471Manifest = await readOptionalJson("../docs/closeout-packs/cp00-471/manifest.json");
const cp471PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-471") ?? cp471Manifest?.plan_binding_snapshot;
const cp472Manifest = await readOptionalJson("../docs/closeout-packs/cp00-472/manifest.json");
const cp472PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-472") ?? cp472Manifest?.plan_binding_snapshot;
const cp473Manifest = await readOptionalJson("../docs/closeout-packs/cp00-473/manifest.json");
const cp473PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-473") ?? cp473Manifest?.plan_binding_snapshot;
const cp474Manifest = await readOptionalJson("../docs/closeout-packs/cp00-474/manifest.json");
const cp474PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-474") ?? cp474Manifest?.plan_binding_snapshot;
const cp475Manifest = await readOptionalJson("../docs/closeout-packs/cp00-475/manifest.json");
const cp475PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-475") ?? cp475Manifest?.plan_binding_snapshot;
const cp476Manifest = await readOptionalJson("../docs/closeout-packs/cp00-476/manifest.json");
const cp476PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-476") ?? cp476Manifest?.plan_binding_snapshot;
const cp477Manifest = await readOptionalJson("../docs/closeout-packs/cp00-477/manifest.json");
const cp477PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-477") ?? cp477Manifest?.plan_binding_snapshot;
const cp478Manifest = await readOptionalJson("../docs/closeout-packs/cp00-478/manifest.json");
const cp478PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-478") ?? cp478Manifest?.plan_binding_snapshot;
const cp479Manifest = await readOptionalJson("../docs/closeout-packs/cp00-479/manifest.json");
const cp479PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-479") ?? cp479Manifest?.plan_binding_snapshot;

assert.equal(analyticsContract.schema_version, "law-firm-os.analytics-core-contract.v0.1");
assert.equal(analyticsContract.program.program_id, "RP15");
assert.equal(analyticsContract.program.program_title, "Firm Analytics");
assert.equal(analyticsContract.program.upstream_program_id, "RP14");
assert.equal(analyticsContract.program.hermes_gate, "H15");
assert.equal(analyticsContract.program.claude_gate, "C15");
assert.equal(analyticsContract.program.descriptor_only, true);
assert.deepEqual(analyticsContract.program, JSON.parse(JSON.stringify(ANALYTICS_CORE_PROGRAM_CONTRACT)));
assert.equal(analyticsContract.current_pack.pack_id, "CP00-479");
assert.equal(analyticsContract.program.current_pack_id, "CP00-479");
assert.deepEqual(analyticsContract.current_pack, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP479_PACK_BINDING)));
assert.deepEqual(analyticsContract.no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION)));

assert.ok(cp453PlanPack, "CP00-453 must exist in closeout-pack-plan.json");
assert.equal(cp453PlanPack.unit_count, ANALYTICS_CORE_CP453_PACK_BINDING.unit_count, "CP00-453 unit count drift");
assert.ok(cp454PlanPack, "CP00-454 must exist in closeout-pack-plan.json");
assert.equal(cp454PlanPack.unit_count, ANALYTICS_CORE_CP454_PACK_BINDING.unit_count, "CP00-454 unit count drift");
assert.ok(cp455PlanPack, "CP00-455 must exist in closeout-pack-plan.json");
assert.equal(cp455PlanPack.unit_count, ANALYTICS_CORE_CP455_PACK_BINDING.unit_count, "CP00-455 unit count drift");
assert.ok(cp456PlanPack, "CP00-456 must exist in closeout-pack-plan.json");
assert.equal(cp456PlanPack.unit_count, ANALYTICS_CORE_CP456_PACK_BINDING.unit_count, "CP00-456 unit count drift");
assert.ok(cp457PlanPack, "CP00-457 must exist in closeout-pack-plan.json");
assert.equal(cp457PlanPack.unit_count, ANALYTICS_CORE_CP457_PACK_BINDING.unit_count, "CP00-457 unit count drift");
assert.ok(cp458PlanPack, "CP00-458 must exist in closeout-pack-plan.json");
assert.equal(cp458PlanPack.unit_count, ANALYTICS_CORE_CP458_PACK_BINDING.unit_count, "CP00-458 unit count drift");
assert.ok(cp459PlanPack, "CP00-459 must exist in closeout-pack-plan.json");
assert.equal(cp459PlanPack.unit_count, ANALYTICS_CORE_CP459_PACK_BINDING.unit_count, "CP00-459 unit count drift");
assert.ok(cp460PlanPack, "CP00-460 must exist in closeout-pack-plan.json");
assert.equal(cp460PlanPack.unit_count, ANALYTICS_CORE_CP460_PACK_BINDING.unit_count, "CP00-460 unit count drift");
assert.ok(cp461PlanPack, "CP00-461 must exist in closeout-pack-plan.json");
assert.equal(cp461PlanPack.unit_count, ANALYTICS_CORE_CP461_PACK_BINDING.unit_count, "CP00-461 unit count drift");
assert.ok(cp462PlanPack, "CP00-462 must exist in closeout-pack-plan.json");
assert.equal(cp462PlanPack.unit_count, ANALYTICS_CORE_CP462_PACK_BINDING.unit_count, "CP00-462 unit count drift");
assert.ok(cp463PlanPack, "CP00-463 must exist in closeout-pack-plan.json");
assert.equal(cp463PlanPack.unit_count, ANALYTICS_CORE_CP463_PACK_BINDING.unit_count, "CP00-463 unit count drift");
assert.ok(cp464PlanPack, "CP00-464 must exist in closeout-pack-plan.json");
assert.equal(cp464PlanPack.unit_count, ANALYTICS_CORE_CP464_PACK_BINDING.unit_count, "CP00-464 unit count drift");
assert.ok(cp465PlanPack, "CP00-465 must exist in closeout-pack-plan.json");
assert.equal(cp465PlanPack.unit_count, ANALYTICS_CORE_CP465_PACK_BINDING.unit_count, "CP00-465 unit count drift");
assert.ok(cp466PlanPack, "CP00-466 must exist in closeout-pack-plan.json");
assert.equal(cp466PlanPack.unit_count, ANALYTICS_CORE_CP466_PACK_BINDING.unit_count, "CP00-466 unit count drift");
assert.ok(cp467PlanPack, "CP00-467 must exist in closeout-pack-plan.json");
assert.equal(cp467PlanPack.unit_count, ANALYTICS_CORE_CP467_PACK_BINDING.unit_count, "CP00-467 unit count drift");
assert.ok(cp468PlanPack, "CP00-468 must exist in closeout-pack-plan.json");
assert.equal(cp468PlanPack.unit_count, ANALYTICS_CORE_CP468_PACK_BINDING.unit_count, "CP00-468 unit count drift");
assert.ok(cp469PlanPack, "CP00-469 must exist in closeout-pack-plan.json");
assert.equal(cp469PlanPack.unit_count, ANALYTICS_CORE_CP469_PACK_BINDING.unit_count, "CP00-469 unit count drift");
assert.ok(cp470PlanPack, "CP00-470 must exist in closeout-pack-plan.json");
assert.equal(cp470PlanPack.unit_count, ANALYTICS_CORE_CP470_PACK_BINDING.unit_count, "CP00-470 unit count drift");
assert.ok(cp471PlanPack, "CP00-471 must exist in closeout-pack-plan.json");
assert.equal(cp471PlanPack.unit_count, ANALYTICS_CORE_CP471_PACK_BINDING.unit_count, "CP00-471 unit count drift");
assert.ok(cp472PlanPack, "CP00-472 must exist in closeout-pack-plan.json");
assert.equal(cp472PlanPack.unit_count, ANALYTICS_CORE_CP472_PACK_BINDING.unit_count, "CP00-472 unit count drift");
assert.ok(cp473PlanPack, "CP00-473 must exist in closeout-pack-plan.json");
assert.equal(cp473PlanPack.unit_count, ANALYTICS_CORE_CP473_PACK_BINDING.unit_count, "CP00-473 unit count drift");
assert.ok(cp474PlanPack, "CP00-474 must exist in closeout-pack-plan.json");
assert.equal(cp474PlanPack.unit_count, ANALYTICS_CORE_CP474_PACK_BINDING.unit_count, "CP00-474 unit count drift");
assert.ok(cp475PlanPack, "CP00-475 must exist in closeout-pack-plan.json");
assert.equal(cp475PlanPack.unit_count, ANALYTICS_CORE_CP475_PACK_BINDING.unit_count, "CP00-475 unit count drift");
assert.ok(cp476PlanPack, "CP00-476 must exist in closeout-pack-plan.json");
assert.equal(cp476PlanPack.unit_count, ANALYTICS_CORE_CP476_PACK_BINDING.unit_count, "CP00-476 unit count drift");
assert.ok(cp477PlanPack, "CP00-477 must exist in closeout-pack-plan.json");
assert.equal(cp477PlanPack.unit_count, ANALYTICS_CORE_CP477_PACK_BINDING.unit_count, "CP00-477 unit count drift");
assert.ok(cp478PlanPack, "CP00-478 must exist in closeout-pack-plan.json");
assert.equal(cp478PlanPack.unit_count, ANALYTICS_CORE_CP478_PACK_BINDING.unit_count, "CP00-478 unit count drift");
assert.ok(cp479PlanPack, "CP00-479 must exist in closeout-pack-plan.json");
assert.equal(cp479PlanPack.unit_count, ANALYTICS_CORE_CP479_PACK_BINDING.unit_count, "CP00-479 unit count drift");

const cp453Coverage = validateAnalyticsCoreCp453Coverage(cp453PlanPack);
const cp453Descriptor = createAnalyticsCoreCp453ScopeContractFoundationDescriptor();
const cp453CaseSet = createAnalyticsCoreCp453ScopeContractFoundationCaseSet();
const cp453Foundation = validateAnalyticsCoreCp453ScopeContractFoundationDescriptor(cp453Descriptor, analyticsContract);
const cp453Hermes = createAnalyticsCoreCp453HermesEvidencePacket(cp453PlanPack, analyticsContract, cp453Descriptor);
const cp453Claude = createAnalyticsCoreCp453ClaudeReviewPacket(cp453PlanPack);
const cp453Handoff = createAnalyticsCoreCp453CloseoutHandoff();
const cp454Coverage = validateAnalyticsCoreCp454Coverage(cp454PlanPack);
const cp454Descriptor = createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor();
const cp454CaseSet = createAnalyticsCoreCp454P01CloseoutP02FoundationCaseSet();
const cp454Slice = validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(cp454Descriptor, analyticsContract);
const cp454Hermes = createAnalyticsCoreCp454HermesEvidencePacket(cp454PlanPack, analyticsContract, cp454Descriptor);
const cp454Claude = createAnalyticsCoreCp454ClaudeReviewPacket(cp454PlanPack);
const cp454Handoff = createAnalyticsCoreCp454CloseoutHandoff();
const cp455Coverage = validateAnalyticsCoreCp455Coverage(cp455PlanPack);
const cp455Descriptor = createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor();
const cp455CaseSet = createAnalyticsCoreCp455P02WorkflowPermissionSliceCaseSet();
const cp455Slice = validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(cp455Descriptor, analyticsContract);
const cp455Hermes = createAnalyticsCoreCp455HermesEvidencePacket(cp455PlanPack, analyticsContract, cp455Descriptor);
const cp455Claude = createAnalyticsCoreCp455ClaudeReviewPacket(cp455PlanPack);
const cp455Handoff = createAnalyticsCoreCp455CloseoutHandoff();
const cp456Coverage = validateAnalyticsCoreCp456Coverage(cp456PlanPack);
const cp456Descriptor = createAnalyticsCoreCp456P02FixtureSliceDescriptor();
const cp456CaseSet = createAnalyticsCoreCp456P02FixtureSliceCaseSet();
const cp456Slice = validateAnalyticsCoreCp456P02FixtureSliceDescriptor(cp456Descriptor, analyticsContract);
const cp456Hermes = createAnalyticsCoreCp456HermesEvidencePacket(cp456PlanPack, analyticsContract, cp456Descriptor);
const cp456Claude = createAnalyticsCoreCp456ClaudeReviewPacket(cp456PlanPack);
const cp456Handoff = createAnalyticsCoreCp456CloseoutHandoff();
const cp457Coverage = validateAnalyticsCoreCp457Coverage(cp457PlanPack);
const cp457Descriptor = createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor();
const cp457CaseSet = createAnalyticsCoreCp457P02CloseoutP03FoundationCaseSet();
const cp457Slice = validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(cp457Descriptor, analyticsContract);
const cp457Hermes = createAnalyticsCoreCp457HermesEvidencePacket(cp457PlanPack, analyticsContract, cp457Descriptor);
const cp457Claude = createAnalyticsCoreCp457ClaudeReviewPacket(cp457PlanPack);
const cp457Handoff = createAnalyticsCoreCp457CloseoutHandoff();
const cp458Coverage = validateAnalyticsCoreCp458Coverage(cp458PlanPack);
const cp458Descriptor = createAnalyticsCoreCp458P03PermissionSliceDescriptor();
const cp458CaseSet = createAnalyticsCoreCp458P03PermissionSliceCaseSet();
const cp458Slice = validateAnalyticsCoreCp458P03PermissionSliceDescriptor(cp458Descriptor, analyticsContract);
const cp458Hermes = createAnalyticsCoreCp458HermesEvidencePacket(cp458PlanPack, analyticsContract, cp458Descriptor);
const cp458Claude = createAnalyticsCoreCp458ClaudeReviewPacket(cp458PlanPack);
const cp458Handoff = createAnalyticsCoreCp458CloseoutHandoff();
const cp459Coverage = validateAnalyticsCoreCp459Coverage(cp459PlanPack);
const cp459Descriptor = createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor();
const cp459CaseSet = createAnalyticsCoreCp459P03PermissionFixtureSliceCaseSet();
const cp459Slice = validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(cp459Descriptor, analyticsContract);
const cp459Hermes = createAnalyticsCoreCp459HermesEvidencePacket(cp459PlanPack, analyticsContract, cp459Descriptor);
const cp459Claude = createAnalyticsCoreCp459ClaudeReviewPacket(cp459PlanPack);
const cp459Handoff = createAnalyticsCoreCp459CloseoutHandoff();
const cp460Coverage = validateAnalyticsCoreCp460Coverage(cp460PlanPack);
const cp460Descriptor = createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor();
const cp460CaseSet = createAnalyticsCoreCp460P03CloseoutP04FoundationCaseSet();
const cp460Slice = validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(cp460Descriptor, analyticsContract);
const cp460Hermes = createAnalyticsCoreCp460HermesEvidencePacket(cp460PlanPack, analyticsContract, cp460Descriptor);
const cp460Claude = createAnalyticsCoreCp460ClaudeReviewPacket(cp460PlanPack);
const cp460Handoff = createAnalyticsCoreCp460CloseoutHandoff();
const cp461Coverage = validateAnalyticsCoreCp461Coverage(cp461PlanPack);
const cp461Descriptor = createAnalyticsCoreCp461P04PermissionSliceDescriptor();
const cp461CaseSet = createAnalyticsCoreCp461P04PermissionSliceCaseSet();
const cp461Slice = validateAnalyticsCoreCp461P04PermissionSliceDescriptor(cp461Descriptor, analyticsContract);
const cp461Hermes = createAnalyticsCoreCp461HermesEvidencePacket(cp461PlanPack, analyticsContract, cp461Descriptor);
const cp461Claude = createAnalyticsCoreCp461ClaudeReviewPacket(cp461PlanPack);
const cp461Handoff = createAnalyticsCoreCp461CloseoutHandoff();
const cp462Coverage = validateAnalyticsCoreCp462Coverage(cp462PlanPack);
const cp462Descriptor = createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor();
const cp462CaseSet = createAnalyticsCoreCp462P04PermissionFixtureSliceCaseSet();
const cp462Slice = validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(cp462Descriptor, analyticsContract);
const cp462Hermes = createAnalyticsCoreCp462HermesEvidencePacket(cp462PlanPack, analyticsContract, cp462Descriptor);
const cp462Claude = createAnalyticsCoreCp462ClaudeReviewPacket(cp462PlanPack);
const cp462Handoff = createAnalyticsCoreCp462CloseoutHandoff();
const cp463Coverage = validateAnalyticsCoreCp463Coverage(cp463PlanPack);
const cp463Descriptor = createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor();
const cp463CaseSet = createAnalyticsCoreCp463P04CloseoutP05FoundationCaseSet();
const cp463Slice = validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(cp463Descriptor, analyticsContract);
const cp463Hermes = createAnalyticsCoreCp463HermesEvidencePacket(cp463PlanPack, analyticsContract, cp463Descriptor);
const cp463Claude = createAnalyticsCoreCp463ClaudeReviewPacket(cp463PlanPack);
const cp463Handoff = createAnalyticsCoreCp463CloseoutHandoff();
const cp464Coverage = validateAnalyticsCoreCp464Coverage(cp464PlanPack);
const cp464Descriptor = createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor();
const cp464CaseSet = createAnalyticsCoreCp464P05WorkflowPermissionSliceCaseSet();
const cp464Slice = validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(cp464Descriptor, analyticsContract);
const cp464Hermes = createAnalyticsCoreCp464HermesEvidencePacket(cp464PlanPack, analyticsContract, cp464Descriptor);
const cp464Claude = createAnalyticsCoreCp464ClaudeReviewPacket(cp464PlanPack);
const cp464Handoff = createAnalyticsCoreCp464CloseoutHandoff();
const cp465Coverage = validateAnalyticsCoreCp465Coverage(cp465PlanPack);
const cp465Descriptor = createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor();
const cp465CaseSet = createAnalyticsCoreCp465P05CloseoutP06FoundationCaseSet();
const cp465Slice = validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(cp465Descriptor, analyticsContract);
const cp465Hermes = createAnalyticsCoreCp465HermesEvidencePacket(cp465PlanPack, analyticsContract, cp465Descriptor);
const cp465Claude = createAnalyticsCoreCp465ClaudeReviewPacket(cp465PlanPack);
const cp465Handoff = createAnalyticsCoreCp465CloseoutHandoff();
const cp466Coverage = validateAnalyticsCoreCp466Coverage(cp466PlanPack);
const cp466Descriptor = createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor();
const cp466CaseSet = createAnalyticsCoreCp466P06ImplementationWorkflowSliceCaseSet();
const cp466Slice = validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(cp466Descriptor, analyticsContract);
const cp466Hermes = createAnalyticsCoreCp466HermesEvidencePacket(cp466PlanPack, analyticsContract, cp466Descriptor);
const cp466Claude = createAnalyticsCoreCp466ClaudeReviewPacket(cp466PlanPack);
const cp466Handoff = createAnalyticsCoreCp466CloseoutHandoff();
const cp467Coverage = validateAnalyticsCoreCp467Coverage(cp467PlanPack);
const cp467Descriptor = createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor();
const cp467CaseSet = createAnalyticsCoreCp467P06WorkflowPermissionSliceCaseSet();
const cp467Slice = validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(cp467Descriptor, analyticsContract);
const cp467Hermes = createAnalyticsCoreCp467HermesEvidencePacket(cp467PlanPack, analyticsContract, cp467Descriptor);
const cp467Claude = createAnalyticsCoreCp467ClaudeReviewPacket(cp467PlanPack);
const cp467Handoff = createAnalyticsCoreCp467CloseoutHandoff();
const cp468Coverage = validateAnalyticsCoreCp468Coverage(cp468PlanPack);
const cp468Descriptor = createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor();
const cp468CaseSet = createAnalyticsCoreCp468P06PermissionFixtureSliceCaseSet();
const cp468Slice = validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(cp468Descriptor, analyticsContract);
const cp468Hermes = createAnalyticsCoreCp468HermesEvidencePacket(cp468PlanPack, analyticsContract, cp468Descriptor);
const cp468Claude = createAnalyticsCoreCp468ClaudeReviewPacket(cp468PlanPack);
const cp468Handoff = createAnalyticsCoreCp468CloseoutHandoff();
const cp469Coverage = validateAnalyticsCoreCp469Coverage(cp469PlanPack);
const cp469Descriptor = createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor();
const cp469CaseSet = createAnalyticsCoreCp469P06CloseoutP07FoundationCaseSet();
const cp469Slice = validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(cp469Descriptor, analyticsContract);
const cp469Hermes = createAnalyticsCoreCp469HermesEvidencePacket(cp469PlanPack, analyticsContract, cp469Descriptor);
const cp469Claude = createAnalyticsCoreCp469ClaudeReviewPacket(cp469PlanPack);
const cp469Handoff = createAnalyticsCoreCp469CloseoutHandoff();
const cp470Coverage = validateAnalyticsCoreCp470Coverage(cp470PlanPack);
const cp470Descriptor = createAnalyticsCoreCp470P07ImplementationSliceDescriptor();
const cp470CaseSet = createAnalyticsCoreCp470P07ImplementationSliceCaseSet();
const cp470Slice = validateAnalyticsCoreCp470P07ImplementationSliceDescriptor(cp470Descriptor, analyticsContract);
const cp470Hermes = createAnalyticsCoreCp470HermesEvidencePacket(cp470PlanPack, analyticsContract, cp470Descriptor);
const cp470Claude = createAnalyticsCoreCp470ClaudeReviewPacket(cp470PlanPack);
const cp470Handoff = createAnalyticsCoreCp470CloseoutHandoff();
const cp471Coverage = validateAnalyticsCoreCp471Coverage(cp471PlanPack);
const cp471Descriptor = createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor();
const cp471CaseSet = createAnalyticsCoreCp471P07WorkflowPermissionSliceCaseSet();
const cp471Slice = validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(cp471Descriptor, analyticsContract);
const cp471Hermes = createAnalyticsCoreCp471HermesEvidencePacket(cp471PlanPack, analyticsContract, cp471Descriptor);
const cp471Claude = createAnalyticsCoreCp471ClaudeReviewPacket(cp471PlanPack);
const cp471Handoff = createAnalyticsCoreCp471CloseoutHandoff();
const cp472Coverage = validateAnalyticsCoreCp472Coverage(cp472PlanPack);
const cp472Descriptor = createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor();
const cp472CaseSet = createAnalyticsCoreCp472P07PermissionFixtureSliceCaseSet();
const cp472Slice = validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(cp472Descriptor, analyticsContract);
const cp472Hermes = createAnalyticsCoreCp472HermesEvidencePacket(cp472PlanPack, analyticsContract, cp472Descriptor);
const cp472Claude = createAnalyticsCoreCp472ClaudeReviewPacket(cp472PlanPack);
const cp472Handoff = createAnalyticsCoreCp472CloseoutHandoff();
const cp473Coverage = validateAnalyticsCoreCp473Coverage(cp473PlanPack);
const cp473Descriptor = createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor();
const cp473CaseSet = createAnalyticsCoreCp473P07CloseoutP08FoundationCaseSet();
const cp473Slice = validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(cp473Descriptor, analyticsContract);
const cp473Hermes = createAnalyticsCoreCp473HermesEvidencePacket(cp473PlanPack, analyticsContract, cp473Descriptor);
const cp473Claude = createAnalyticsCoreCp473ClaudeReviewPacket(cp473PlanPack);
const cp473Handoff = createAnalyticsCoreCp473CloseoutHandoff();
const cp474Coverage = validateAnalyticsCoreCp474Coverage(cp474PlanPack);
const cp474Descriptor = createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor();
const cp474CaseSet = createAnalyticsCoreCp474P08WorkflowPermissionSliceCaseSet();
const cp474Slice = validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(cp474Descriptor, analyticsContract);
const cp474Hermes = createAnalyticsCoreCp474HermesEvidencePacket(cp474PlanPack, analyticsContract, cp474Descriptor);
const cp474Claude = createAnalyticsCoreCp474ClaudeReviewPacket(cp474PlanPack);
const cp474Handoff = createAnalyticsCoreCp474CloseoutHandoff();
const cp475Coverage = validateAnalyticsCoreCp475Coverage(cp475PlanPack);
const cp475Descriptor = createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor();
const cp475CaseSet = createAnalyticsCoreCp475P08PermissionFixtureSliceCaseSet();
const cp475Slice = validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(cp475Descriptor, analyticsContract);
const cp475Hermes = createAnalyticsCoreCp475HermesEvidencePacket(cp475PlanPack, analyticsContract, cp475Descriptor);
const cp475Claude = createAnalyticsCoreCp475ClaudeReviewPacket(cp475PlanPack);
const cp475Handoff = createAnalyticsCoreCp475CloseoutHandoff();
const cp476Coverage = validateAnalyticsCoreCp476Coverage(cp476PlanPack);
const cp476Descriptor = createAnalyticsCoreCp476P08FixtureSliceDescriptor();
const cp476CaseSet = createAnalyticsCoreCp476P08FixtureSliceCaseSet();
const cp476Slice = validateAnalyticsCoreCp476P08FixtureSliceDescriptor(cp476Descriptor, analyticsContract);
const cp476Hermes = createAnalyticsCoreCp476HermesEvidencePacket(cp476PlanPack, analyticsContract, cp476Descriptor);
const cp476Claude = createAnalyticsCoreCp476ClaudeReviewPacket(cp476PlanPack);
const cp476Handoff = createAnalyticsCoreCp476CloseoutHandoff();
const cp477Coverage = validateAnalyticsCoreCp477Coverage(cp477PlanPack);
const cp477Descriptor = createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor();
const cp477CaseSet = createAnalyticsCoreCp477P08CloseoutP09FoundationCaseSet();
const cp477Slice = validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(cp477Descriptor, analyticsContract);
const cp477Hermes = createAnalyticsCoreCp477HermesEvidencePacket(cp477PlanPack, analyticsContract, cp477Descriptor);
const cp477Claude = createAnalyticsCoreCp477ClaudeReviewPacket(cp477PlanPack);
const cp477Handoff = createAnalyticsCoreCp477CloseoutHandoff();
const cp478Coverage = validateAnalyticsCoreCp478Coverage(cp478PlanPack);
const cp478Descriptor = createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor();
const cp478CaseSet = createAnalyticsCoreCp478P09PermissionFixtureSliceCaseSet();
const cp478Slice = validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(cp478Descriptor, analyticsContract);
const cp478Hermes = createAnalyticsCoreCp478HermesEvidencePacket(cp478PlanPack, analyticsContract, cp478Descriptor);
const cp478Claude = createAnalyticsCoreCp478ClaudeReviewPacket(cp478PlanPack);
const cp478Handoff = createAnalyticsCoreCp478CloseoutHandoff();
const cp479Coverage = validateAnalyticsCoreCp479Coverage(cp479PlanPack);
const cp479Descriptor = createAnalyticsCoreCp479P09CloseoutSliceDescriptor();
const cp479CaseSet = createAnalyticsCoreCp479P09CloseoutSliceCaseSet();
const cp479Slice = validateAnalyticsCoreCp479P09CloseoutSliceDescriptor(cp479Descriptor, analyticsContract);
const cp479Hermes = createAnalyticsCoreCp479HermesEvidencePacket(cp479PlanPack, analyticsContract, cp479Descriptor);
const cp479Claude = createAnalyticsCoreCp479ClaudeReviewPacket(cp479PlanPack);
const cp479Handoff = createAnalyticsCoreCp479CloseoutHandoff();

assert.equal(cp453Coverage.valid, true, cp453Coverage.errors.join("; "));
assert.equal(cp453Coverage.summary.unit_count, 150);
assert.equal(cp453Coverage.summary.by_phase["RP15.P00"], 71);
assert.equal(cp453Coverage.summary.by_phase["RP15.P01"], 79);
assert.equal(cp453Foundation.valid, true, cp453Foundation.errors.join("; "));
assert.equal(cp453CaseSet.section_count, 17);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp453CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-453 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp453Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp453_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP453_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp453_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION)));
assert.equal(cp453Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp453Hermes.production_ready_candidate, true);
assert.equal(cp453Claude.review_packet, "C15.CP00-453.analytics_core_scope_contract_foundation_descriptor");
assert.equal(cp453Claude.read_only, true);
assert.equal(cp453Handoff.to_pack_id, "CP00-454");
assert.equal(cp453Handoff.next_subphase_id, "RP15.P01.M06.S01");
assert.equal(ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp454Coverage.valid, true, cp454Coverage.errors.join("; "));
assert.equal(cp454Coverage.summary.unit_count, 150);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P01.M06"], 20);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P01.M07"], 20);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P01.M08"], 20);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P01.M09"], 8);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P01.M10"], 3);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P02.M00"], 11);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P02.M01"], 20);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P02.M02"], 20);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P02.M03"], 22);
assert.equal(cp454Coverage.summary.by_micro_phase["RP15.P02.M04"], 6);
assert.equal(cp454Slice.valid, true, cp454Slice.errors.join("; "));
assert.equal(cp454CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp454CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-454 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp454Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp454_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP454_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp454_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION)));
assert.equal(cp454Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp454Hermes.production_ready_candidate, true);
assert.equal(cp454Claude.review_packet, "C15.CP00-454.analytics_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp454Claude.read_only, true);
assert.equal(cp454Handoff.to_pack_id, "CP00-455");
assert.equal(cp454Handoff.next_subphase_id, "RP15.P02.M04.S07");
assert.equal(ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp455Coverage.valid, true, cp455Coverage.errors.join("; "));
assert.equal(cp455Coverage.summary.unit_count, 40);
assert.equal(cp455Coverage.summary.by_micro_phase["RP15.P02.M04"], 16);
assert.equal(cp455Coverage.summary.by_micro_phase["RP15.P02.M05"], 22);
assert.equal(cp455Coverage.summary.by_micro_phase["RP15.P02.M06"], 2);
assert.equal(cp455Slice.valid, true, cp455Slice.errors.join("; "));
assert.equal(cp455CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp455CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-455 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp455Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp455_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP455_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp455_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION)));
assert.equal(cp455Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp455Hermes.production_ready_candidate, true);
assert.equal(cp455Claude.review_packet, "C15.CP00-455.analytics_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp455Claude.read_only, true);
assert.equal(cp455Handoff.to_pack_id, "CP00-456");
assert.equal(cp455Handoff.next_subphase_id, "RP15.P02.M06.S03");
assert.equal(ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp456Coverage.valid, true, cp456Coverage.errors.join("; "));
assert.equal(cp456Coverage.summary.unit_count, 10);
assert.equal(cp456Coverage.summary.by_micro_phase["RP15.P02.M06"], 10);
assert.equal(cp456Slice.valid, true, cp456Slice.errors.join("; "));
assert.equal(cp456CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp456CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-456 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p02_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp456Descriptor)),
  "contract p02_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp456_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP456_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp456_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION)));
assert.equal(cp456Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp456Hermes.production_ready_candidate, true);
assert.equal(cp456Claude.review_packet, "C15.CP00-456.analytics_core_p02_fixture_slice_descriptor");
assert.equal(cp456Claude.read_only, true);
assert.equal(cp456Handoff.to_pack_id, "CP00-457");
assert.equal(cp456Handoff.next_subphase_id, "RP15.P02.M06.S13");
assert.equal(ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp457Coverage.valid, true, cp457Coverage.errors.join("; "));
assert.equal(cp457Coverage.summary.unit_count, 150);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P02.M06"], 10);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P02.M07"], 22);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P02.M08"], 22);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P02.M09"], 20);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P02.M10"], 11);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M00"], 3);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M01"], 8);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M02"], 8);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M03"], 20);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M04"], 20);
assert.equal(cp457Coverage.summary.by_micro_phase["RP15.P03.M05"], 6);
assert.equal(cp457Slice.valid, true, cp457Slice.errors.join("; "));
assert.equal(cp457CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp457CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-457 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp457Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp457_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP457_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp457_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION)));
assert.equal(cp457Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp457Hermes.production_ready_candidate, true);
assert.equal(cp457Claude.review_packet, "C15.CP00-457.analytics_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp457Claude.read_only, true);
assert.equal(cp457Handoff.to_pack_id, "CP00-458");
assert.equal(cp457Handoff.next_subphase_id, "RP15.P03.M05.S07");
assert.equal(ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp458Coverage.valid, true, cp458Coverage.errors.join("; "));
assert.equal(cp458Coverage.summary.unit_count, 10);
assert.equal(cp458Coverage.summary.by_micro_phase["RP15.P03.M05"], 10);
assert.equal(cp458Slice.valid, true, cp458Slice.errors.join("; "));
assert.equal(cp458CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp458CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-458 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p03_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp458Descriptor)),
  "contract p03_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp458_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP458_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp458_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION)));
assert.equal(cp458Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp458Hermes.production_ready_candidate, true);
assert.equal(cp458Claude.review_packet, "C15.CP00-458.analytics_core_p03_permission_slice_descriptor");
assert.equal(cp458Claude.read_only, true);
assert.equal(cp458Handoff.to_pack_id, "CP00-459");
assert.equal(cp458Handoff.next_subphase_id, "RP15.P03.M05.S17");
assert.equal(ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp459Coverage.valid, true, cp459Coverage.errors.join("; "));
assert.equal(cp459Coverage.summary.unit_count, 10);
assert.equal(cp459Coverage.summary.by_micro_phase["RP15.P03.M05"], 4);
assert.equal(cp459Coverage.summary.by_micro_phase["RP15.P03.M06"], 6);
assert.equal(cp459Slice.valid, true, cp459Slice.errors.join("; "));
assert.equal(cp459CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp459CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-459 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p03_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp459Descriptor)),
  "contract p03_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp459_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP459_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp459_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION)));
assert.equal(cp459Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp459Hermes.production_ready_candidate, true);
assert.equal(cp459Claude.review_packet, "C15.CP00-459.analytics_core_p03_permission_fixture_slice_descriptor");
assert.equal(cp459Claude.read_only, true);
assert.equal(cp459Handoff.to_pack_id, "CP00-460");
assert.equal(cp459Handoff.next_subphase_id, "RP15.P03.M06.S07");
assert.equal(ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp460Coverage.valid, true, cp460Coverage.errors.join("; "));
assert.equal(cp460Coverage.summary.unit_count, 150);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P03.M06"], 14);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P03.M07"], 20);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P03.M08"], 20);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P03.M09"], 8);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P03.M10"], 3);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M00"], 8);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M01"], 8);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M02"], 20);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M03"], 22);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M04"], 20);
assert.equal(cp460Coverage.summary.by_micro_phase["RP15.P04.M05"], 7);
assert.equal(cp460Slice.valid, true, cp460Slice.errors.join("; "));
assert.equal(cp460CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp460CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-460 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp460Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp460_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP460_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp460_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION)));
assert.equal(cp460Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp460Hermes.production_ready_candidate, true);
assert.equal(cp460Claude.review_packet, "C15.CP00-460.analytics_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp460Claude.read_only, true);
assert.equal(cp460Handoff.to_pack_id, "CP00-461");
assert.equal(cp460Handoff.next_subphase_id, "RP15.P04.M05.S08");
assert.equal(ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp461Coverage.valid, true, cp461Coverage.errors.join("; "));
assert.equal(cp461Coverage.summary.unit_count, 10);
assert.equal(cp461Coverage.summary.by_micro_phase["RP15.P04.M05"], 10);
assert.equal(cp461Slice.valid, true, cp461Slice.errors.join("; "));
assert.equal(cp461CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp461CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-461 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p04_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp461Descriptor)),
  "contract p04_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp461_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP461_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp461_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION)));
assert.equal(cp461Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp461Hermes.production_ready_candidate, true);
assert.equal(cp461Claude.review_packet, "C15.CP00-461.analytics_core_p04_permission_slice_descriptor");
assert.equal(cp461Claude.read_only, true);
assert.equal(cp461Handoff.to_pack_id, "CP00-462");
assert.equal(cp461Handoff.next_subphase_id, "RP15.P04.M05.S18");
assert.equal(ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp462Coverage.valid, true, cp462Coverage.errors.join("; "));
assert.equal(cp462Coverage.summary.unit_count, 10);
assert.equal(cp462Coverage.summary.by_micro_phase["RP15.P04.M05"], 5);
assert.equal(cp462Coverage.summary.by_micro_phase["RP15.P04.M06"], 5);
assert.equal(cp462Slice.valid, true, cp462Slice.errors.join("; "));
assert.equal(cp462CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp462CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-462 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp462Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp462_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP462_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp462_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION)));
assert.equal(cp462Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp462Hermes.production_ready_candidate, true);
assert.equal(cp462Claude.review_packet, "C15.CP00-462.analytics_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp462Claude.read_only, true);
assert.equal(cp462Handoff.to_pack_id, "CP00-463");
assert.equal(cp462Handoff.next_subphase_id, "RP15.P04.M06.S06");
assert.equal(ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp463Coverage.valid, true, cp463Coverage.errors.join("; "));
assert.equal(cp463Coverage.summary.unit_count, 150);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P04.M06"], 15);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P04.M07"], 22);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P04.M08"], 20);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P04.M09"], 20);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P04.M10"], 8);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P05.M00"], 8);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P05.M01"], 8);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P05.M02"], 20);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P05.M03"], 22);
assert.equal(cp463Coverage.summary.by_micro_phase["RP15.P05.M04"], 7);
assert.equal(cp463Slice.valid, true, cp463Slice.errors.join("; "));
assert.equal(cp463CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp463CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-463 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp463Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp463_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP463_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp463_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION)));
assert.equal(cp463Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp463Hermes.production_ready_candidate, true);
assert.equal(cp463Claude.review_packet, "C15.CP00-463.analytics_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp463Claude.read_only, true);
assert.equal(cp463Handoff.to_pack_id, "CP00-464");
assert.equal(cp463Handoff.next_subphase_id, "RP15.P05.M04.S08");
assert.equal(ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp464Coverage.valid, true, cp464Coverage.errors.join("; "));
assert.equal(cp464Coverage.summary.unit_count, 40);
assert.equal(cp464Coverage.summary.by_micro_phase["RP15.P05.M04"], 13);
assert.equal(cp464Coverage.summary.by_micro_phase["RP15.P05.M05"], 22);
assert.equal(cp464Coverage.summary.by_micro_phase["RP15.P05.M06"], 5);
assert.equal(cp464Slice.valid, true, cp464Slice.errors.join("; "));
assert.equal(cp464CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp464CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-464 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p05_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp464Descriptor)),
  "contract p05_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp464_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP464_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp464_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION)));
assert.equal(cp464Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp464Hermes.production_ready_candidate, true);
assert.equal(cp464Claude.review_packet, "C15.CP00-464.analytics_core_p05_workflow_permission_slice_descriptor");
assert.equal(cp464Claude.read_only, true);
assert.equal(cp464Handoff.to_pack_id, "CP00-465");
assert.equal(cp464Handoff.next_subphase_id, "RP15.P05.M06.S06");
assert.equal(ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp465Coverage.valid, true, cp465Coverage.errors.join("; "));
assert.equal(cp465Coverage.summary.unit_count, 150);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P05.M06"], 15);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P05.M07"], 22);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P05.M08"], 20);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P05.M09"], 20);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P05.M10"], 8);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P06.M00"], 11);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P06.M01"], 20);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P06.M02"], 20);
assert.equal(cp465Coverage.summary.by_micro_phase["RP15.P06.M03"], 14);
assert.equal(cp465Slice.valid, true, cp465Slice.errors.join("; "));
assert.equal(cp465CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp465CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-465 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp465Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp465_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP465_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp465_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION)));
assert.equal(cp465Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp465Hermes.production_ready_candidate, true);
assert.equal(cp465Claude.review_packet, "C15.CP00-465.analytics_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp465Claude.read_only, true);
assert.equal(cp465Handoff.to_pack_id, "CP00-466");
assert.equal(cp465Handoff.next_subphase_id, "RP15.P06.M03.S15");
assert.equal(ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp466Coverage.valid, true, cp466Coverage.errors.join("; "));
assert.equal(cp466Coverage.summary.unit_count, 10);
assert.equal(cp466Coverage.summary.by_micro_phase["RP15.P06.M03"], 8);
assert.equal(cp466Coverage.summary.by_micro_phase["RP15.P06.M04"], 2);
assert.equal(cp466Slice.valid, true, cp466Slice.errors.join("; "));
assert.equal(cp466CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp466CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-466 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p06_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp466Descriptor)),
  "contract p06_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp466_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP466_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp466_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION)));
assert.equal(cp466Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp466Hermes.production_ready_candidate, true);
assert.equal(cp466Claude.review_packet, "C15.CP00-466.analytics_core_p06_implementation_workflow_slice_descriptor");
assert.equal(cp466Claude.read_only, true);
assert.equal(cp466Handoff.to_pack_id, "CP00-467");
assert.equal(cp466Handoff.next_subphase_id, "RP15.P06.M04.S03");
assert.equal(ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp467Coverage.valid, true, cp467Coverage.errors.join("; "));
assert.equal(cp467Coverage.summary.unit_count, 40);
assert.equal(cp467Coverage.summary.by_micro_phase["RP15.P06.M04"], 20);
assert.equal(cp467Coverage.summary.by_micro_phase["RP15.P06.M05"], 20);
assert.equal(cp467Slice.valid, true, cp467Slice.errors.join("; "));
assert.equal(cp467CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp467CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-467 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p06_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp467Descriptor)),
  "contract p06_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp467_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP467_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp467_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION)));
assert.equal(cp467Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp467Hermes.production_ready_candidate, true);
assert.equal(cp467Claude.review_packet, "C15.CP00-467.analytics_core_p06_workflow_permission_slice_descriptor");
assert.equal(cp467Claude.read_only, true);
assert.equal(cp467Handoff.to_pack_id, "CP00-468");
assert.equal(cp467Handoff.next_subphase_id, "RP15.P06.M05.S21");
assert.equal(ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp468Coverage.valid, true, cp468Coverage.errors.join("; "));
assert.equal(cp468Coverage.summary.unit_count, 10);
assert.equal(cp468Coverage.summary.by_micro_phase["RP15.P06.M05"], 2);
assert.equal(cp468Coverage.summary.by_micro_phase["RP15.P06.M06"], 8);
assert.equal(cp468Slice.valid, true, cp468Slice.errors.join("; "));
assert.equal(cp468CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp468CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-468 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp468Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp468_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP468_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp468_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION)));
assert.equal(cp468Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp468Hermes.production_ready_candidate, true);
assert.equal(cp468Claude.review_packet, "C15.CP00-468.analytics_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp468Claude.read_only, true);
assert.equal(cp468Handoff.to_pack_id, "CP00-469");
assert.equal(cp468Handoff.next_subphase_id, "RP15.P06.M06.S09");
assert.equal(ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp469Coverage.valid, true, cp469Coverage.errors.join("; "));
assert.equal(cp469Coverage.summary.unit_count, 150);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P06.M06"], 14);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P06.M07"], 22);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P06.M08"], 22);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P06.M09"], 20);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P06.M10"], 11);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P07.M00"], 11);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P07.M01"], 20);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P07.M02"], 20);
assert.equal(cp469Coverage.summary.by_micro_phase["RP15.P07.M03"], 10);
assert.equal(cp469Slice.valid, true, cp469Slice.errors.join("; "));
assert.equal(cp469CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp469CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-469 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp469Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp469_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP469_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp469_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION)));
assert.equal(cp469Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp469Hermes.production_ready_candidate, true);
assert.equal(cp469Claude.review_packet, "C15.CP00-469.analytics_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp469Claude.read_only, true);
assert.equal(cp469Handoff.to_pack_id, "CP00-470");
assert.equal(cp469Handoff.next_subphase_id, "RP15.P07.M03.S11");
assert.equal(ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp470Coverage.valid, true, cp470Coverage.errors.join("; "));
assert.equal(cp470Coverage.summary.unit_count, 10);
assert.equal(cp470Coverage.summary.by_micro_phase["RP15.P07.M03"], 10);
assert.equal(cp470Slice.valid, true, cp470Slice.errors.join("; "));
assert.equal(cp470CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp470CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-470 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p07_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp470Descriptor)),
  "contract p07_implementation_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp470_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP470_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp470_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION)));
assert.equal(cp470Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp470Hermes.production_ready_candidate, true);
assert.equal(cp470Claude.review_packet, "C15.CP00-470.analytics_core_p07_implementation_slice_descriptor");
assert.equal(cp470Claude.read_only, true);
assert.equal(cp470Handoff.to_pack_id, "CP00-471");
assert.equal(cp470Handoff.next_subphase_id, "RP15.P07.M03.S21");
assert.equal(ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp471Coverage.valid, true, cp471Coverage.errors.join("; "));
assert.equal(cp471Coverage.summary.unit_count, 40);
assert.equal(cp471Coverage.summary.by_micro_phase["RP15.P07.M03"], 2);
assert.equal(cp471Coverage.summary.by_micro_phase["RP15.P07.M04"], 22);
assert.equal(cp471Coverage.summary.by_micro_phase["RP15.P07.M05"], 16);
assert.equal(cp471Slice.valid, true, cp471Slice.errors.join("; "));
assert.equal(cp471CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp471CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-471 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p07_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp471Descriptor)),
  "contract p07_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp471_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP471_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp471_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION)));
assert.equal(cp471Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp471Hermes.production_ready_candidate, true);
assert.equal(cp471Claude.review_packet, "C15.CP00-471.analytics_core_p07_workflow_permission_slice_descriptor");
assert.equal(cp471Claude.read_only, true);
assert.equal(cp471Handoff.to_pack_id, "CP00-472");
assert.equal(cp471Handoff.next_subphase_id, "RP15.P07.M05.S17");
assert.equal(ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp472Coverage.valid, true, cp472Coverage.errors.join("; "));
assert.equal(cp472Coverage.summary.unit_count, 10);
assert.equal(cp472Coverage.summary.by_micro_phase["RP15.P07.M05"], 6);
assert.equal(cp472Coverage.summary.by_micro_phase["RP15.P07.M06"], 4);
assert.equal(cp472Slice.valid, true, cp472Slice.errors.join("; "));
assert.equal(cp472CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp472CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-472 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p07_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp472Descriptor)),
  "contract p07_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp472_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP472_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp472_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION)));
assert.equal(cp472Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp472Hermes.production_ready_candidate, true);
assert.equal(cp472Claude.review_packet, "C15.CP00-472.analytics_core_p07_permission_fixture_slice_descriptor");
assert.equal(cp472Claude.read_only, true);
assert.equal(cp472Handoff.to_pack_id, "CP00-473");
assert.equal(cp472Handoff.next_subphase_id, "RP15.P07.M06.S05");
assert.equal(ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp473Coverage.valid, true, cp473Coverage.errors.join("; "));
assert.equal(cp473Coverage.summary.unit_count, 150);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P07.M06"], 18);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P07.M07"], 22);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P07.M08"], 22);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P07.M09"], 20);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P07.M10"], 11);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P08.M00"], 8);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P08.M01"], 8);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P08.M02"], 20);
assert.equal(cp473Coverage.summary.by_micro_phase["RP15.P08.M03"], 21);
assert.equal(cp473Slice.valid, true, cp473Slice.errors.join("; "));
assert.equal(cp473CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp473CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-473 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp473Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp473_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP473_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp473_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION)));
assert.equal(cp473Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp473Hermes.production_ready_candidate, true);
assert.equal(cp473Claude.review_packet, "C15.CP00-473.analytics_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp473Claude.read_only, true);
assert.equal(cp473Handoff.to_pack_id, "CP00-474");
assert.equal(cp473Handoff.next_subphase_id, "RP15.P08.M03.S22");
assert.equal(ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp474Coverage.valid, true, cp474Coverage.errors.join("; "));
assert.equal(cp474Coverage.summary.unit_count, 40);
assert.equal(cp474Coverage.summary.by_micro_phase["RP15.P08.M03"], 1);
assert.equal(cp474Coverage.summary.by_micro_phase["RP15.P08.M04"], 20);
assert.equal(cp474Coverage.summary.by_micro_phase["RP15.P08.M05"], 19);
assert.equal(cp474Slice.valid, true, cp474Slice.errors.join("; "));
assert.equal(cp474CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp474CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-474 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p08_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp474Descriptor)),
  "contract p08_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp474_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP474_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp474_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION)));
assert.equal(cp474Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp474Hermes.production_ready_candidate, true);
assert.equal(cp474Claude.review_packet, "C15.CP00-474.analytics_core_p08_workflow_permission_slice_descriptor");
assert.equal(cp474Claude.read_only, true);
assert.equal(cp474Handoff.to_pack_id, "CP00-475");
assert.equal(cp474Handoff.next_subphase_id, "RP15.P08.M05.S20");
assert.equal(ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp475Coverage.valid, true, cp475Coverage.errors.join("; "));
assert.equal(cp475Coverage.summary.unit_count, 10);
assert.equal(cp475Coverage.summary.by_micro_phase["RP15.P08.M05"], 3);
assert.equal(cp475Coverage.summary.by_micro_phase["RP15.P08.M06"], 7);
assert.equal(cp475Slice.valid, true, cp475Slice.errors.join("; "));
assert.equal(cp475CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp475CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-475 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p08_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp475Descriptor)),
  "contract p08_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp475_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP475_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp475_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION)));
assert.equal(cp475Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp475Hermes.production_ready_candidate, true);
assert.equal(cp475Claude.review_packet, "C15.CP00-475.analytics_core_p08_permission_fixture_slice_descriptor");
assert.equal(cp475Claude.read_only, true);
assert.equal(cp475Handoff.to_pack_id, "CP00-476");
assert.equal(cp475Handoff.next_subphase_id, "RP15.P08.M06.S08");
assert.equal(ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp476Coverage.valid, true, cp476Coverage.errors.join("; "));
assert.equal(cp476Coverage.summary.unit_count, 10);
assert.equal(cp476Coverage.summary.by_micro_phase["RP15.P08.M06"], 10);
assert.equal(cp476Slice.valid, true, cp476Slice.errors.join("; "));
assert.equal(cp476CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp476CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-476 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p08_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp476Descriptor)),
  "contract p08_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp476_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP476_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp476_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION)));
assert.equal(cp476Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp476Hermes.production_ready_candidate, true);
assert.equal(cp476Claude.review_packet, "C15.CP00-476.analytics_core_p08_fixture_slice_descriptor");
assert.equal(cp476Claude.read_only, true);
assert.equal(cp476Handoff.to_pack_id, "CP00-477");
assert.equal(cp476Handoff.next_subphase_id, "RP15.P08.M06.S18");
assert.equal(ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp477Coverage.valid, true, cp477Coverage.errors.join("; "));
assert.equal(cp477Coverage.summary.unit_count, 150);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P08.M06"], 3);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P08.M07"], 22);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P08.M08"], 20);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P08.M09"], 20);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P08.M10"], 8);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M00"], 4);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M01"], 8);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M02"], 8);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M03"], 20);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M04"], 20);
assert.equal(cp477Coverage.summary.by_micro_phase["RP15.P09.M05"], 17);
assert.equal(cp477Slice.valid, true, cp477Slice.errors.join("; "));
assert.equal(cp477CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp477CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-477 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp477Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(analyticsContract.cp477_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP477_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp477_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION)));
assert.equal(cp477Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp477Hermes.production_ready_candidate, true);
assert.equal(cp477Claude.review_packet, "C15.CP00-477.analytics_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp477Claude.read_only, true);
assert.equal(cp477Handoff.to_pack_id, "CP00-478");
assert.equal(cp477Handoff.next_subphase_id, "RP15.P09.M05.S18");
assert.equal(ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp478Coverage.valid, true, cp478Coverage.errors.join("; "));
assert.equal(cp478Coverage.summary.unit_count, 10);
assert.equal(cp478Coverage.summary.by_micro_phase["RP15.P09.M05"], 3);
assert.equal(cp478Coverage.summary.by_micro_phase["RP15.P09.M06"], 7);
assert.equal(cp478Slice.valid, true, cp478Slice.errors.join("; "));
assert.equal(cp478CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp478CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-478 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p09_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp478Descriptor)),
  "contract p09_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp478_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP478_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp478_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION)));
assert.equal(cp478Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp478Hermes.production_ready_candidate, true);
assert.equal(cp478Claude.review_packet, "C15.CP00-478.analytics_core_p09_permission_fixture_slice_descriptor");
assert.equal(cp478Claude.read_only, true);
assert.equal(cp478Handoff.to_pack_id, "CP00-479");
assert.equal(cp478Handoff.next_subphase_id, "RP15.P09.M06.S08");
assert.equal(ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp479Coverage.valid, true, cp479Coverage.errors.join("; "));
assert.equal(cp479Coverage.summary.unit_count, 65);
assert.equal(cp479Coverage.summary.by_micro_phase["RP15.P09.M06"], 13);
assert.equal(cp479Coverage.summary.by_micro_phase["RP15.P09.M07"], 20);
assert.equal(cp479Coverage.summary.by_micro_phase["RP15.P09.M08"], 20);
assert.equal(cp479Coverage.summary.by_micro_phase["RP15.P09.M09"], 8);
assert.equal(cp479Coverage.summary.by_micro_phase["RP15.P09.M10"], 4);
assert.equal(cp479Slice.valid, true, cp479Slice.errors.join("; "));
assert.equal(cp479CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp479CaseSet.sections[microId].rows[analyticsCoreRowKey(title)];
    assert.ok(row, `CP00-479 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  analyticsContract.p09_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp479Descriptor)),
  "contract p09_closeout_slice_descriptor drift",
);
assert.deepEqual(analyticsContract.cp479_requirements, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP479_REQUIREMENTS)));
assert.deepEqual(analyticsContract.cp479_no_write_attestation, JSON.parse(JSON.stringify(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION)));
assert.equal(cp479Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp479Hermes.production_ready_candidate, true);
assert.equal(cp479Claude.review_packet, "C15.CP00-479.analytics_core_p09_closeout_slice_descriptor");
assert.equal(cp479Claude.read_only, true);
assert.equal(cp479Handoff.to_pack_id, "CP00-480");
assert.equal(cp479Handoff.next_subphase_id, "RP16.P00.M00.S01");
assert.equal(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(analyticsContract.historical_pack_bindings));
assert.equal(analyticsContract.historical_pack_bindings.at(-1).pack_id, "CP00-479");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp15:analytics-core:validate",
      pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.pack_id,
      covered_units: cp479Coverage.summary.unit_count,
      cp478_units_preserved: cp478Coverage.summary.unit_count,
      cp477_units_preserved: cp477Coverage.summary.unit_count,
      cp476_units_preserved: cp476Coverage.summary.unit_count,
      cp475_units_preserved: cp475Coverage.summary.unit_count,
      cp474_units_preserved: cp474Coverage.summary.unit_count,
      cp473_units_preserved: cp473Coverage.summary.unit_count,
      cp472_units_preserved: cp472Coverage.summary.unit_count,
      cp471_units_preserved: cp471Coverage.summary.unit_count,
      cp470_units_preserved: cp470Coverage.summary.unit_count,
      cp469_units_preserved: cp469Coverage.summary.unit_count,
      cp468_units_preserved: cp468Coverage.summary.unit_count,
      cp467_units_preserved: cp467Coverage.summary.unit_count,
      cp466_units_preserved: cp466Coverage.summary.unit_count,
      cp465_units_preserved: cp465Coverage.summary.unit_count,
      cp464_units_preserved: cp464Coverage.summary.unit_count,
      cp463_units_preserved: cp463Coverage.summary.unit_count,
      cp462_units_preserved: cp462Coverage.summary.unit_count,
      cp461_units_preserved: cp461Coverage.summary.unit_count,
      cp460_units_preserved: cp460Coverage.summary.unit_count,
      cp459_units_preserved: cp459Coverage.summary.unit_count,
      cp458_units_preserved: cp458Coverage.summary.unit_count,
      cp457_units_preserved: cp457Coverage.summary.unit_count,
      cp456_units_preserved: cp456Coverage.summary.unit_count,
      cp455_units_preserved: cp455Coverage.summary.unit_count,
      cp454_units_preserved: cp454Coverage.summary.unit_count,
      cp453_units_preserved: cp453Coverage.summary.unit_count,
      program_id: ANALYTICS_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp479Hermes.gate,
      claude_gate: analyticsContract.current_pack.claude_gate,
      source_settlement_core_pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp479Handoff.to_pack_id,
      production_ready_candidate: cp479Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
