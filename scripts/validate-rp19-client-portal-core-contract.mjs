import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP583_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP583_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP584_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP584_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP585_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP585_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP586_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP586_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP587_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP587_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP588_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP588_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP589_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP589_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP590_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP590_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP591_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP591_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP592_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP592_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP593_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP593_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP594_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP594_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP595_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP595_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP596_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP596_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP597_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP597_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP598_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP598_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP599_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP599_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP600_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP600_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP601_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP601_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP602_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP602_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP603_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP603_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP604_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP604_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP605_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP605_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP606_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP606_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP607_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP607_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP608_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP608_REQUIREMENTS,
  CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION,
  CLIENT_PORTAL_CORE_CP609_PACK_BINDING,
  CLIENT_PORTAL_CORE_CP609_REQUIREMENTS,
  CLIENT_PORTAL_CORE_PROGRAM_CONTRACT,
  createClientPortalCoreCp583ClaudeReviewPacket,
  createClientPortalCoreCp583CloseoutHandoff,
  createClientPortalCoreCp583HermesEvidencePacket,
  createClientPortalCoreCp583ScopeContractFoundationCaseSet,
  createClientPortalCoreCp583ScopeContractFoundationDescriptor,
  createClientPortalCoreCp584ClaudeReviewPacket,
  createClientPortalCoreCp584CloseoutHandoff,
  createClientPortalCoreCp584HermesEvidencePacket,
  createClientPortalCoreCp584P01CloseoutP02FoundationCaseSet,
  createClientPortalCoreCp584P01CloseoutP02FoundationDescriptor,
  createClientPortalCoreCp585ClaudeReviewPacket,
  createClientPortalCoreCp585CloseoutHandoff,
  createClientPortalCoreCp585HermesEvidencePacket,
  createClientPortalCoreCp585P02WorkflowPermissionSliceCaseSet,
  createClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor,
  createClientPortalCoreCp586ClaudeReviewPacket,
  createClientPortalCoreCp586CloseoutHandoff,
  createClientPortalCoreCp586HermesEvidencePacket,
  createClientPortalCoreCp586P02FixtureSliceCaseSet,
  createClientPortalCoreCp586P02FixtureSliceDescriptor,
  createClientPortalCoreCp587ClaudeReviewPacket,
  createClientPortalCoreCp587CloseoutHandoff,
  createClientPortalCoreCp587HermesEvidencePacket,
  createClientPortalCoreCp587P02CloseoutP03FoundationCaseSet,
  createClientPortalCoreCp587P02CloseoutP03FoundationDescriptor,
  createClientPortalCoreCp588ClaudeReviewPacket,
  createClientPortalCoreCp588CloseoutHandoff,
  createClientPortalCoreCp588HermesEvidencePacket,
  createClientPortalCoreCp588P03PermissionSliceCaseSet,
  createClientPortalCoreCp588P03PermissionSliceDescriptor,
  createClientPortalCoreCp589ClaudeReviewPacket,
  createClientPortalCoreCp589CloseoutHandoff,
  createClientPortalCoreCp589HermesEvidencePacket,
  createClientPortalCoreCp589P03PermissionFixtureSliceCaseSet,
  createClientPortalCoreCp589P03PermissionFixtureSliceDescriptor,
  createClientPortalCoreCp590ClaudeReviewPacket,
  createClientPortalCoreCp590CloseoutHandoff,
  createClientPortalCoreCp590HermesEvidencePacket,
  createClientPortalCoreCp590P03CloseoutP04FoundationCaseSet,
  createClientPortalCoreCp590P03CloseoutP04FoundationDescriptor,
  createClientPortalCoreCp591ClaudeReviewPacket,
  createClientPortalCoreCp591CloseoutHandoff,
  createClientPortalCoreCp591HermesEvidencePacket,
  createClientPortalCoreCp591P04PermissionSliceCaseSet,
  createClientPortalCoreCp591P04PermissionSliceDescriptor,
  createClientPortalCoreCp592ClaudeReviewPacket,
  createClientPortalCoreCp592CloseoutHandoff,
  createClientPortalCoreCp592HermesEvidencePacket,
  createClientPortalCoreCp592P04PermissionFixtureSliceCaseSet,
  createClientPortalCoreCp592P04PermissionFixtureSliceDescriptor,
  createClientPortalCoreCp593ClaudeReviewPacket,
  createClientPortalCoreCp593CloseoutHandoff,
  createClientPortalCoreCp593HermesEvidencePacket,
  createClientPortalCoreCp593P04CloseoutP05FoundationCaseSet,
  createClientPortalCoreCp593P04CloseoutP05FoundationDescriptor,
  createClientPortalCoreCp594ClaudeReviewPacket,
  createClientPortalCoreCp594CloseoutHandoff,
  createClientPortalCoreCp594HermesEvidencePacket,
  createClientPortalCoreCp594P05WorkflowPermissionSliceCaseSet,
  createClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor,
  createClientPortalCoreCp595ClaudeReviewPacket,
  createClientPortalCoreCp595CloseoutHandoff,
  createClientPortalCoreCp595HermesEvidencePacket,
  createClientPortalCoreCp595P05CloseoutP06FoundationCaseSet,
  createClientPortalCoreCp595P05CloseoutP06FoundationDescriptor,
  createClientPortalCoreCp596ClaudeReviewPacket,
  createClientPortalCoreCp596CloseoutHandoff,
  createClientPortalCoreCp596HermesEvidencePacket,
  createClientPortalCoreCp596P06ImplementationSliceCaseSet,
  createClientPortalCoreCp596P06ImplementationSliceDescriptor,
  createClientPortalCoreCp597ClaudeReviewPacket,
  createClientPortalCoreCp597CloseoutHandoff,
  createClientPortalCoreCp597HermesEvidencePacket,
  createClientPortalCoreCp597P06WorkflowPermissionSliceCaseSet,
  createClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor,
  createClientPortalCoreCp598ClaudeReviewPacket,
  createClientPortalCoreCp598CloseoutHandoff,
  createClientPortalCoreCp598HermesEvidencePacket,
  createClientPortalCoreCp598P06PermissionFixtureSliceCaseSet,
  createClientPortalCoreCp598P06PermissionFixtureSliceDescriptor,
  createClientPortalCoreCp599ClaudeReviewPacket,
  createClientPortalCoreCp599CloseoutHandoff,
  createClientPortalCoreCp599HermesEvidencePacket,
  createClientPortalCoreCp599P06CloseoutP07FoundationCaseSet,
  createClientPortalCoreCp599P06CloseoutP07FoundationDescriptor,
  createClientPortalCoreCp600ClaudeReviewPacket,
  createClientPortalCoreCp600CloseoutHandoff,
  createClientPortalCoreCp600HermesEvidencePacket,
  createClientPortalCoreCp600P07ImplementationSliceCaseSet,
  createClientPortalCoreCp600P07ImplementationSliceDescriptor,
  createClientPortalCoreCp601ClaudeReviewPacket,
  createClientPortalCoreCp601CloseoutHandoff,
  createClientPortalCoreCp601HermesEvidencePacket,
  createClientPortalCoreCp601P07WorkflowPermissionSliceCaseSet,
  createClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor,
  createClientPortalCoreCp602ClaudeReviewPacket,
  createClientPortalCoreCp602CloseoutHandoff,
  createClientPortalCoreCp602HermesEvidencePacket,
  createClientPortalCoreCp602P07PermissionFixtureSliceCaseSet,
  createClientPortalCoreCp602P07PermissionFixtureSliceDescriptor,
  createClientPortalCoreCp603ClaudeReviewPacket,
  createClientPortalCoreCp603CloseoutHandoff,
  createClientPortalCoreCp603HermesEvidencePacket,
  createClientPortalCoreCp603P07CloseoutP08FoundationCaseSet,
  createClientPortalCoreCp603P07CloseoutP08FoundationDescriptor,
  createClientPortalCoreCp604ClaudeReviewPacket,
  createClientPortalCoreCp604CloseoutHandoff,
  createClientPortalCoreCp604HermesEvidencePacket,
  createClientPortalCoreCp604P08WorkflowPermissionSliceCaseSet,
  createClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor,
  createClientPortalCoreCp605ClaudeReviewPacket,
  createClientPortalCoreCp605CloseoutHandoff,
  createClientPortalCoreCp605HermesEvidencePacket,
  createClientPortalCoreCp605P08PermissionFixtureSliceCaseSet,
  createClientPortalCoreCp605P08PermissionFixtureSliceDescriptor,
  createClientPortalCoreCp606ClaudeReviewPacket,
  createClientPortalCoreCp606CloseoutHandoff,
  createClientPortalCoreCp606HermesEvidencePacket,
  createClientPortalCoreCp606P08FixtureSliceCaseSet,
  createClientPortalCoreCp606P08FixtureSliceDescriptor,
  createClientPortalCoreCp607ClaudeReviewPacket,
  createClientPortalCoreCp607CloseoutHandoff,
  createClientPortalCoreCp607HermesEvidencePacket,
  createClientPortalCoreCp607P08CloseoutP09FoundationCaseSet,
  createClientPortalCoreCp607P08CloseoutP09FoundationDescriptor,
  createClientPortalCoreCp608ClaudeReviewPacket,
  createClientPortalCoreCp608CloseoutHandoff,
  createClientPortalCoreCp608HermesEvidencePacket,
  createClientPortalCoreCp608P09PermissionAuditFixtureBridgeCaseSet,
  createClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor,
  createClientPortalCoreCp609ClaudeReviewPacket,
  createClientPortalCoreCp609CloseoutHandoff,
  createClientPortalCoreCp609HermesEvidencePacket,
  createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeCaseSet,
  createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor,
  clientPortalCoreRowKey,
  validateClientPortalCoreCp583Coverage,
  validateClientPortalCoreCp583ScopeContractFoundationDescriptor,
  validateClientPortalCoreCp584Coverage,
  validateClientPortalCoreCp584P01CloseoutP02FoundationDescriptor,
  validateClientPortalCoreCp585Coverage,
  validateClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor,
  validateClientPortalCoreCp586Coverage,
  validateClientPortalCoreCp586P02FixtureSliceDescriptor,
  validateClientPortalCoreCp587Coverage,
  validateClientPortalCoreCp587P02CloseoutP03FoundationDescriptor,
  validateClientPortalCoreCp588Coverage,
  validateClientPortalCoreCp588P03PermissionSliceDescriptor,
  validateClientPortalCoreCp589Coverage,
  validateClientPortalCoreCp589P03PermissionFixtureSliceDescriptor,
  validateClientPortalCoreCp590Coverage,
  validateClientPortalCoreCp590P03CloseoutP04FoundationDescriptor,
  validateClientPortalCoreCp591Coverage,
  validateClientPortalCoreCp591P04PermissionSliceDescriptor,
  validateClientPortalCoreCp592Coverage,
  validateClientPortalCoreCp592P04PermissionFixtureSliceDescriptor,
  validateClientPortalCoreCp593Coverage,
  validateClientPortalCoreCp593P04CloseoutP05FoundationDescriptor,
  validateClientPortalCoreCp594Coverage,
  validateClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor,
  validateClientPortalCoreCp595Coverage,
  validateClientPortalCoreCp595P05CloseoutP06FoundationDescriptor,
  validateClientPortalCoreCp596Coverage,
  validateClientPortalCoreCp596P06ImplementationSliceDescriptor,
  validateClientPortalCoreCp597Coverage,
  validateClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor,
  validateClientPortalCoreCp598Coverage,
  validateClientPortalCoreCp598P06PermissionFixtureSliceDescriptor,
  validateClientPortalCoreCp599Coverage,
  validateClientPortalCoreCp599P06CloseoutP07FoundationDescriptor,
  validateClientPortalCoreCp600Coverage,
  validateClientPortalCoreCp600P07ImplementationSliceDescriptor,
  validateClientPortalCoreCp601Coverage,
  validateClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor,
  validateClientPortalCoreCp602Coverage,
  validateClientPortalCoreCp602P07PermissionFixtureSliceDescriptor,
  validateClientPortalCoreCp603Coverage,
  validateClientPortalCoreCp603P07CloseoutP08FoundationDescriptor,
  validateClientPortalCoreCp604Coverage,
  validateClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor,
  validateClientPortalCoreCp605Coverage,
  validateClientPortalCoreCp605P08PermissionFixtureSliceDescriptor,
  validateClientPortalCoreCp606Coverage,
  validateClientPortalCoreCp606P08FixtureSliceDescriptor,
  validateClientPortalCoreCp607Coverage,
  validateClientPortalCoreCp607P08CloseoutP09FoundationDescriptor,
  validateClientPortalCoreCp608Coverage,
  validateClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor,
  validateClientPortalCoreCp609Coverage,
  validateClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor,
} from "../packages/client-portal/src/index.js";

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

const clientPortalContract = await readJson("../contracts/client-portal-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp583Manifest = await readOptionalJson("../docs/closeout-packs/cp00-583/manifest.json");
const cp583PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-583") ?? cp583Manifest?.plan_binding_snapshot;
const cp584Manifest = await readOptionalJson("../docs/closeout-packs/cp00-584/manifest.json");
const cp584PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-584") ?? cp584Manifest?.plan_binding_snapshot;
const cp585Manifest = await readOptionalJson("../docs/closeout-packs/cp00-585/manifest.json");
const cp585PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-585") ?? cp585Manifest?.plan_binding_snapshot;
const cp586Manifest = await readOptionalJson("../docs/closeout-packs/cp00-586/manifest.json");
const cp586PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-586") ?? cp586Manifest?.plan_binding_snapshot;
const cp587Manifest = await readOptionalJson("../docs/closeout-packs/cp00-587/manifest.json");
const cp587PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-587") ?? cp587Manifest?.plan_binding_snapshot;
const cp588Manifest = await readOptionalJson("../docs/closeout-packs/cp00-588/manifest.json");
const cp588PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-588") ?? cp588Manifest?.plan_binding_snapshot;
const cp589Manifest = await readOptionalJson("../docs/closeout-packs/cp00-589/manifest.json");
const cp589PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-589") ?? cp589Manifest?.plan_binding_snapshot;
const cp590Manifest = await readOptionalJson("../docs/closeout-packs/cp00-590/manifest.json");
const cp590PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-590") ?? cp590Manifest?.plan_binding_snapshot;
const cp591Manifest = await readOptionalJson("../docs/closeout-packs/cp00-591/manifest.json");
const cp591PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-591") ?? cp591Manifest?.plan_binding_snapshot;
const cp592Manifest = await readOptionalJson("../docs/closeout-packs/cp00-592/manifest.json");
const cp592PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-592") ?? cp592Manifest?.plan_binding_snapshot;
const cp593Manifest = await readOptionalJson("../docs/closeout-packs/cp00-593/manifest.json");
const cp593PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-593") ?? cp593Manifest?.plan_binding_snapshot;
const cp594Manifest = await readOptionalJson("../docs/closeout-packs/cp00-594/manifest.json");
const cp594PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-594") ?? cp594Manifest?.plan_binding_snapshot;
const cp595Manifest = await readOptionalJson("../docs/closeout-packs/cp00-595/manifest.json");
const cp595PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-595") ?? cp595Manifest?.plan_binding_snapshot;
const cp596Manifest = await readOptionalJson("../docs/closeout-packs/cp00-596/manifest.json");
const cp596PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-596") ?? cp596Manifest?.plan_binding_snapshot;
const cp597Manifest = await readOptionalJson("../docs/closeout-packs/cp00-597/manifest.json");
const cp597PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-597") ?? cp597Manifest?.plan_binding_snapshot;
const cp598Manifest = await readOptionalJson("../docs/closeout-packs/cp00-598/manifest.json");
const cp598PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-598") ?? cp598Manifest?.plan_binding_snapshot;
const cp599Manifest = await readOptionalJson("../docs/closeout-packs/cp00-599/manifest.json");
const cp599PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-599") ?? cp599Manifest?.plan_binding_snapshot;
const cp600Manifest = await readOptionalJson("../docs/closeout-packs/cp00-600/manifest.json");
const cp600PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-600") ?? cp600Manifest?.plan_binding_snapshot;
const cp601Manifest = await readOptionalJson("../docs/closeout-packs/cp00-601/manifest.json");
const cp601PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-601") ?? cp601Manifest?.plan_binding_snapshot;
const cp602Manifest = await readOptionalJson("../docs/closeout-packs/cp00-602/manifest.json");
const cp602PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-602") ?? cp602Manifest?.plan_binding_snapshot;
const cp603Manifest = await readOptionalJson("../docs/closeout-packs/cp00-603/manifest.json");
const cp603PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-603") ?? cp603Manifest?.plan_binding_snapshot;
const cp604Manifest = await readOptionalJson("../docs/closeout-packs/cp00-604/manifest.json");
const cp604PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-604") ?? cp604Manifest?.plan_binding_snapshot;
const cp605Manifest = await readOptionalJson("../docs/closeout-packs/cp00-605/manifest.json");
const cp605PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-605") ?? cp605Manifest?.plan_binding_snapshot;
const cp606Manifest = await readOptionalJson("../docs/closeout-packs/cp00-606/manifest.json");
const cp606PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-606") ?? cp606Manifest?.plan_binding_snapshot;
const cp607Manifest = await readOptionalJson("../docs/closeout-packs/cp00-607/manifest.json");
const cp607PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-607") ?? cp607Manifest?.plan_binding_snapshot;
const cp608Manifest = await readOptionalJson("../docs/closeout-packs/cp00-608/manifest.json");
const cp608PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-608") ?? cp608Manifest?.plan_binding_snapshot;
const cp609Manifest = await readOptionalJson("../docs/closeout-packs/cp00-609/manifest.json");
const cp609PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-609") ?? cp609Manifest?.plan_binding_snapshot;

assert.equal(clientPortalContract.schema_version, "law-firm-os.client-portal-core-contract.v0.1");
assert.equal(clientPortalContract.program.program_id, "RP19");
assert.equal(clientPortalContract.program.program_title, "Client Portal");
assert.equal(clientPortalContract.program.upstream_program_id, "RP18");
assert.equal(clientPortalContract.program.hermes_gate, "H19");
assert.equal(clientPortalContract.program.claude_gate, "C19");
assert.equal(clientPortalContract.program.descriptor_only, true);
assert.deepEqual(clientPortalContract.program, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT)));
assert.equal(clientPortalContract.current_pack.pack_id, "CP00-609");
assert.equal(clientPortalContract.program.current_pack_id, "CP00-609");
assert.deepEqual(clientPortalContract.current_pack, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP609_PACK_BINDING)));
assert.deepEqual(clientPortalContract.no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION)));

assert.ok(cp583PlanPack, "CP00-583 must exist in closeout-pack-plan.json");
assert.equal(cp583PlanPack.unit_count, CLIENT_PORTAL_CORE_CP583_PACK_BINDING.unit_count, "CP00-583 unit count drift");
assert.ok(cp584PlanPack, "CP00-584 must exist in closeout-pack-plan.json");
assert.equal(cp584PlanPack.unit_count, CLIENT_PORTAL_CORE_CP584_PACK_BINDING.unit_count, "CP00-584 unit count drift");
assert.ok(cp585PlanPack, "CP00-585 must exist in closeout-pack-plan.json");
assert.equal(cp585PlanPack.unit_count, CLIENT_PORTAL_CORE_CP585_PACK_BINDING.unit_count, "CP00-585 unit count drift");
assert.ok(cp586PlanPack, "CP00-586 must exist in closeout-pack-plan.json");
assert.equal(cp586PlanPack.unit_count, CLIENT_PORTAL_CORE_CP586_PACK_BINDING.unit_count, "CP00-586 unit count drift");
assert.ok(cp587PlanPack, "CP00-587 must exist in closeout-pack-plan.json");
assert.equal(cp587PlanPack.unit_count, CLIENT_PORTAL_CORE_CP587_PACK_BINDING.unit_count, "CP00-587 unit count drift");
assert.ok(cp588PlanPack, "CP00-588 must exist in closeout-pack-plan.json");
assert.equal(cp588PlanPack.unit_count, CLIENT_PORTAL_CORE_CP588_PACK_BINDING.unit_count, "CP00-588 unit count drift");
assert.ok(cp589PlanPack, "CP00-589 must exist in closeout-pack-plan.json");
assert.equal(cp589PlanPack.unit_count, CLIENT_PORTAL_CORE_CP589_PACK_BINDING.unit_count, "CP00-589 unit count drift");
assert.ok(cp590PlanPack, "CP00-590 must exist in closeout-pack-plan.json");
assert.equal(cp590PlanPack.unit_count, CLIENT_PORTAL_CORE_CP590_PACK_BINDING.unit_count, "CP00-590 unit count drift");
assert.ok(cp591PlanPack, "CP00-591 must exist in closeout-pack-plan.json");
assert.equal(cp591PlanPack.unit_count, CLIENT_PORTAL_CORE_CP591_PACK_BINDING.unit_count, "CP00-591 unit count drift");
assert.ok(cp592PlanPack, "CP00-592 must exist in closeout-pack-plan.json");
assert.equal(cp592PlanPack.unit_count, CLIENT_PORTAL_CORE_CP592_PACK_BINDING.unit_count, "CP00-592 unit count drift");
assert.ok(cp593PlanPack, "CP00-593 must exist in closeout-pack-plan.json");
assert.equal(cp593PlanPack.unit_count, CLIENT_PORTAL_CORE_CP593_PACK_BINDING.unit_count, "CP00-593 unit count drift");
assert.ok(cp594PlanPack, "CP00-594 must exist in closeout-pack-plan.json");
assert.equal(cp594PlanPack.unit_count, CLIENT_PORTAL_CORE_CP594_PACK_BINDING.unit_count, "CP00-594 unit count drift");
assert.ok(cp595PlanPack, "CP00-595 must exist in closeout-pack-plan.json");
assert.equal(cp595PlanPack.unit_count, CLIENT_PORTAL_CORE_CP595_PACK_BINDING.unit_count, "CP00-595 unit count drift");
assert.ok(cp596PlanPack, "CP00-596 must exist in closeout-pack-plan.json");
assert.equal(cp596PlanPack.unit_count, CLIENT_PORTAL_CORE_CP596_PACK_BINDING.unit_count, "CP00-596 unit count drift");
assert.ok(cp597PlanPack, "CP00-597 must exist in closeout-pack-plan.json");
assert.equal(cp597PlanPack.unit_count, CLIENT_PORTAL_CORE_CP597_PACK_BINDING.unit_count, "CP00-597 unit count drift");
assert.ok(cp598PlanPack, "CP00-598 must exist in closeout-pack-plan.json");
assert.equal(cp598PlanPack.unit_count, CLIENT_PORTAL_CORE_CP598_PACK_BINDING.unit_count, "CP00-598 unit count drift");
assert.ok(cp599PlanPack, "CP00-599 must exist in closeout-pack-plan.json");
assert.equal(cp599PlanPack.unit_count, CLIENT_PORTAL_CORE_CP599_PACK_BINDING.unit_count, "CP00-599 unit count drift");
assert.ok(cp600PlanPack, "CP00-600 must exist in closeout-pack-plan.json");
assert.equal(cp600PlanPack.unit_count, CLIENT_PORTAL_CORE_CP600_PACK_BINDING.unit_count, "CP00-600 unit count drift");
assert.ok(cp601PlanPack, "CP00-601 must exist in closeout-pack-plan.json");
assert.equal(cp601PlanPack.unit_count, CLIENT_PORTAL_CORE_CP601_PACK_BINDING.unit_count, "CP00-601 unit count drift");
assert.ok(cp602PlanPack, "CP00-602 must exist in closeout-pack-plan.json");
assert.equal(cp602PlanPack.unit_count, CLIENT_PORTAL_CORE_CP602_PACK_BINDING.unit_count, "CP00-602 unit count drift");
assert.ok(cp603PlanPack, "CP00-603 must exist in closeout-pack-plan.json");
assert.equal(cp603PlanPack.unit_count, CLIENT_PORTAL_CORE_CP603_PACK_BINDING.unit_count, "CP00-603 unit count drift");
assert.ok(cp604PlanPack, "CP00-604 must exist in closeout-pack-plan.json");
assert.equal(cp604PlanPack.unit_count, CLIENT_PORTAL_CORE_CP604_PACK_BINDING.unit_count, "CP00-604 unit count drift");
assert.ok(cp605PlanPack, "CP00-605 must exist in closeout-pack-plan.json");
assert.equal(cp605PlanPack.unit_count, CLIENT_PORTAL_CORE_CP605_PACK_BINDING.unit_count, "CP00-605 unit count drift");
assert.ok(cp606PlanPack, "CP00-606 must exist in closeout-pack-plan.json");
assert.equal(cp606PlanPack.unit_count, CLIENT_PORTAL_CORE_CP606_PACK_BINDING.unit_count, "CP00-606 unit count drift");
assert.ok(cp607PlanPack, "CP00-607 must exist in closeout-pack-plan.json");
assert.equal(cp607PlanPack.unit_count, CLIENT_PORTAL_CORE_CP607_PACK_BINDING.unit_count, "CP00-607 unit count drift");
assert.ok(cp608PlanPack, "CP00-608 must exist in closeout-pack-plan.json");
assert.equal(cp608PlanPack.unit_count, CLIENT_PORTAL_CORE_CP608_PACK_BINDING.unit_count, "CP00-608 unit count drift");
assert.ok(cp609PlanPack, "CP00-609 must exist in closeout-pack-plan.json");
assert.equal(cp609PlanPack.unit_count, CLIENT_PORTAL_CORE_CP609_PACK_BINDING.unit_count, "CP00-609 unit count drift");

const cp583Coverage = validateClientPortalCoreCp583Coverage(cp583PlanPack);
const cp583Descriptor = createClientPortalCoreCp583ScopeContractFoundationDescriptor();
const cp583CaseSet = createClientPortalCoreCp583ScopeContractFoundationCaseSet();
const cp583Foundation = validateClientPortalCoreCp583ScopeContractFoundationDescriptor(cp583Descriptor, clientPortalContract);
const cp583Hermes = createClientPortalCoreCp583HermesEvidencePacket(cp583PlanPack, clientPortalContract, cp583Descriptor);
const cp583Claude = createClientPortalCoreCp583ClaudeReviewPacket(cp583PlanPack);
const cp583Handoff = createClientPortalCoreCp583CloseoutHandoff();
const cp584Coverage = validateClientPortalCoreCp584Coverage(cp584PlanPack);
const cp584Descriptor = createClientPortalCoreCp584P01CloseoutP02FoundationDescriptor();
const cp584CaseSet = createClientPortalCoreCp584P01CloseoutP02FoundationCaseSet();
const cp584Slice = validateClientPortalCoreCp584P01CloseoutP02FoundationDescriptor(cp584Descriptor, clientPortalContract);
const cp584Hermes = createClientPortalCoreCp584HermesEvidencePacket(cp584PlanPack, clientPortalContract, cp584Descriptor);
const cp584Claude = createClientPortalCoreCp584ClaudeReviewPacket(cp584PlanPack);
const cp584Handoff = createClientPortalCoreCp584CloseoutHandoff();
const cp585Coverage = validateClientPortalCoreCp585Coverage(cp585PlanPack);
const cp585Descriptor = createClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor();
const cp585CaseSet = createClientPortalCoreCp585P02WorkflowPermissionSliceCaseSet();
const cp585Slice = validateClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor(cp585Descriptor, clientPortalContract);
const cp585Hermes = createClientPortalCoreCp585HermesEvidencePacket(cp585PlanPack, clientPortalContract, cp585Descriptor);
const cp585Claude = createClientPortalCoreCp585ClaudeReviewPacket(cp585PlanPack);
const cp585Handoff = createClientPortalCoreCp585CloseoutHandoff();
const cp586Coverage = validateClientPortalCoreCp586Coverage(cp586PlanPack);
const cp586Descriptor = createClientPortalCoreCp586P02FixtureSliceDescriptor();
const cp586CaseSet = createClientPortalCoreCp586P02FixtureSliceCaseSet();
const cp586Slice = validateClientPortalCoreCp586P02FixtureSliceDescriptor(cp586Descriptor, clientPortalContract);
const cp586Hermes = createClientPortalCoreCp586HermesEvidencePacket(cp586PlanPack, clientPortalContract, cp586Descriptor);
const cp586Claude = createClientPortalCoreCp586ClaudeReviewPacket(cp586PlanPack);
const cp586Handoff = createClientPortalCoreCp586CloseoutHandoff();
const cp587Coverage = validateClientPortalCoreCp587Coverage(cp587PlanPack);
const cp587Descriptor = createClientPortalCoreCp587P02CloseoutP03FoundationDescriptor();
const cp587CaseSet = createClientPortalCoreCp587P02CloseoutP03FoundationCaseSet();
const cp587Slice = validateClientPortalCoreCp587P02CloseoutP03FoundationDescriptor(cp587Descriptor, clientPortalContract);
const cp587Hermes = createClientPortalCoreCp587HermesEvidencePacket(cp587PlanPack, clientPortalContract, cp587Descriptor);
const cp587Claude = createClientPortalCoreCp587ClaudeReviewPacket(cp587PlanPack);
const cp587Handoff = createClientPortalCoreCp587CloseoutHandoff();
const cp588Coverage = validateClientPortalCoreCp588Coverage(cp588PlanPack);
const cp588Descriptor = createClientPortalCoreCp588P03PermissionSliceDescriptor();
const cp588CaseSet = createClientPortalCoreCp588P03PermissionSliceCaseSet();
const cp588Slice = validateClientPortalCoreCp588P03PermissionSliceDescriptor(cp588Descriptor, clientPortalContract);
const cp588Hermes = createClientPortalCoreCp588HermesEvidencePacket(cp588PlanPack, clientPortalContract, cp588Descriptor);
const cp588Claude = createClientPortalCoreCp588ClaudeReviewPacket(cp588PlanPack);
const cp588Handoff = createClientPortalCoreCp588CloseoutHandoff();
const cp589Coverage = validateClientPortalCoreCp589Coverage(cp589PlanPack);
const cp589Descriptor = createClientPortalCoreCp589P03PermissionFixtureSliceDescriptor();
const cp589CaseSet = createClientPortalCoreCp589P03PermissionFixtureSliceCaseSet();
const cp589Slice = validateClientPortalCoreCp589P03PermissionFixtureSliceDescriptor(cp589Descriptor, clientPortalContract);
const cp589Hermes = createClientPortalCoreCp589HermesEvidencePacket(cp589PlanPack, clientPortalContract, cp589Descriptor);
const cp589Claude = createClientPortalCoreCp589ClaudeReviewPacket(cp589PlanPack);
const cp589Handoff = createClientPortalCoreCp589CloseoutHandoff();
const cp590Coverage = validateClientPortalCoreCp590Coverage(cp590PlanPack);
const cp590Descriptor = createClientPortalCoreCp590P03CloseoutP04FoundationDescriptor();
const cp590CaseSet = createClientPortalCoreCp590P03CloseoutP04FoundationCaseSet();
const cp590Slice = validateClientPortalCoreCp590P03CloseoutP04FoundationDescriptor(cp590Descriptor, clientPortalContract);
const cp590Hermes = createClientPortalCoreCp590HermesEvidencePacket(cp590PlanPack, clientPortalContract, cp590Descriptor);
const cp590Claude = createClientPortalCoreCp590ClaudeReviewPacket(cp590PlanPack);
const cp590Handoff = createClientPortalCoreCp590CloseoutHandoff();
const cp591Coverage = validateClientPortalCoreCp591Coverage(cp591PlanPack);
const cp591Descriptor = createClientPortalCoreCp591P04PermissionSliceDescriptor();
const cp591CaseSet = createClientPortalCoreCp591P04PermissionSliceCaseSet();
const cp591Slice = validateClientPortalCoreCp591P04PermissionSliceDescriptor(cp591Descriptor, clientPortalContract);
const cp591Hermes = createClientPortalCoreCp591HermesEvidencePacket(cp591PlanPack, clientPortalContract, cp591Descriptor);
const cp591Claude = createClientPortalCoreCp591ClaudeReviewPacket(cp591PlanPack);
const cp591Handoff = createClientPortalCoreCp591CloseoutHandoff();
const cp592Coverage = validateClientPortalCoreCp592Coverage(cp592PlanPack);
const cp592Descriptor = createClientPortalCoreCp592P04PermissionFixtureSliceDescriptor();
const cp592CaseSet = createClientPortalCoreCp592P04PermissionFixtureSliceCaseSet();
const cp592Slice = validateClientPortalCoreCp592P04PermissionFixtureSliceDescriptor(cp592Descriptor, clientPortalContract);
const cp592Hermes = createClientPortalCoreCp592HermesEvidencePacket(cp592PlanPack, clientPortalContract, cp592Descriptor);
const cp592Claude = createClientPortalCoreCp592ClaudeReviewPacket(cp592PlanPack);
const cp592Handoff = createClientPortalCoreCp592CloseoutHandoff();
const cp593Coverage = validateClientPortalCoreCp593Coverage(cp593PlanPack);
const cp593Descriptor = createClientPortalCoreCp593P04CloseoutP05FoundationDescriptor();
const cp593CaseSet = createClientPortalCoreCp593P04CloseoutP05FoundationCaseSet();
const cp593Slice = validateClientPortalCoreCp593P04CloseoutP05FoundationDescriptor(cp593Descriptor, clientPortalContract);
const cp593Hermes = createClientPortalCoreCp593HermesEvidencePacket(cp593PlanPack, clientPortalContract, cp593Descriptor);
const cp593Claude = createClientPortalCoreCp593ClaudeReviewPacket(cp593PlanPack);
const cp593Handoff = createClientPortalCoreCp593CloseoutHandoff();
const cp594Coverage = validateClientPortalCoreCp594Coverage(cp594PlanPack);
const cp594Descriptor = createClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor();
const cp594CaseSet = createClientPortalCoreCp594P05WorkflowPermissionSliceCaseSet();
const cp594Slice = validateClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor(cp594Descriptor, clientPortalContract);
const cp594Hermes = createClientPortalCoreCp594HermesEvidencePacket(cp594PlanPack, clientPortalContract, cp594Descriptor);
const cp594Claude = createClientPortalCoreCp594ClaudeReviewPacket(cp594PlanPack);
const cp594Handoff = createClientPortalCoreCp594CloseoutHandoff();
const cp595Coverage = validateClientPortalCoreCp595Coverage(cp595PlanPack);
const cp595Descriptor = createClientPortalCoreCp595P05CloseoutP06FoundationDescriptor();
const cp595CaseSet = createClientPortalCoreCp595P05CloseoutP06FoundationCaseSet();
const cp595Slice = validateClientPortalCoreCp595P05CloseoutP06FoundationDescriptor(cp595Descriptor, clientPortalContract);
const cp595Hermes = createClientPortalCoreCp595HermesEvidencePacket(cp595PlanPack, clientPortalContract, cp595Descriptor);
const cp595Claude = createClientPortalCoreCp595ClaudeReviewPacket(cp595PlanPack);
const cp595Handoff = createClientPortalCoreCp595CloseoutHandoff();
const cp596Coverage = validateClientPortalCoreCp596Coverage(cp596PlanPack);
const cp596Descriptor = createClientPortalCoreCp596P06ImplementationSliceDescriptor();
const cp596CaseSet = createClientPortalCoreCp596P06ImplementationSliceCaseSet();
const cp596Slice = validateClientPortalCoreCp596P06ImplementationSliceDescriptor(cp596Descriptor, clientPortalContract);
const cp596Hermes = createClientPortalCoreCp596HermesEvidencePacket(cp596PlanPack, clientPortalContract, cp596Descriptor);
const cp596Claude = createClientPortalCoreCp596ClaudeReviewPacket(cp596PlanPack);
const cp596Handoff = createClientPortalCoreCp596CloseoutHandoff();
const cp597Coverage = validateClientPortalCoreCp597Coverage(cp597PlanPack);
const cp597Descriptor = createClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor();
const cp597CaseSet = createClientPortalCoreCp597P06WorkflowPermissionSliceCaseSet();
const cp597Slice = validateClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor(cp597Descriptor, clientPortalContract);
const cp597Hermes = createClientPortalCoreCp597HermesEvidencePacket(cp597PlanPack, clientPortalContract, cp597Descriptor);
const cp597Claude = createClientPortalCoreCp597ClaudeReviewPacket(cp597PlanPack);
const cp597Handoff = createClientPortalCoreCp597CloseoutHandoff();
const cp598Coverage = validateClientPortalCoreCp598Coverage(cp598PlanPack);
const cp598Descriptor = createClientPortalCoreCp598P06PermissionFixtureSliceDescriptor();
const cp598CaseSet = createClientPortalCoreCp598P06PermissionFixtureSliceCaseSet();
const cp598Slice = validateClientPortalCoreCp598P06PermissionFixtureSliceDescriptor(cp598Descriptor, clientPortalContract);
const cp598Hermes = createClientPortalCoreCp598HermesEvidencePacket(cp598PlanPack, clientPortalContract, cp598Descriptor);
const cp598Claude = createClientPortalCoreCp598ClaudeReviewPacket(cp598PlanPack);
const cp598Handoff = createClientPortalCoreCp598CloseoutHandoff();
const cp599Coverage = validateClientPortalCoreCp599Coverage(cp599PlanPack);
const cp599Descriptor = createClientPortalCoreCp599P06CloseoutP07FoundationDescriptor();
const cp599CaseSet = createClientPortalCoreCp599P06CloseoutP07FoundationCaseSet();
const cp599Slice = validateClientPortalCoreCp599P06CloseoutP07FoundationDescriptor(cp599Descriptor, clientPortalContract);
const cp599Hermes = createClientPortalCoreCp599HermesEvidencePacket(cp599PlanPack, clientPortalContract, cp599Descriptor);
const cp599Claude = createClientPortalCoreCp599ClaudeReviewPacket(cp599PlanPack);
const cp599Handoff = createClientPortalCoreCp599CloseoutHandoff();
const cp600Coverage = validateClientPortalCoreCp600Coverage(cp600PlanPack);
const cp600Descriptor = createClientPortalCoreCp600P07ImplementationSliceDescriptor();
const cp600CaseSet = createClientPortalCoreCp600P07ImplementationSliceCaseSet();
const cp600Slice = validateClientPortalCoreCp600P07ImplementationSliceDescriptor(cp600Descriptor, clientPortalContract);
const cp600Hermes = createClientPortalCoreCp600HermesEvidencePacket(cp600PlanPack, clientPortalContract, cp600Descriptor);
const cp600Claude = createClientPortalCoreCp600ClaudeReviewPacket(cp600PlanPack);
const cp600Handoff = createClientPortalCoreCp600CloseoutHandoff();
const cp601Coverage = validateClientPortalCoreCp601Coverage(cp601PlanPack);
const cp601Descriptor = createClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor();
const cp601CaseSet = createClientPortalCoreCp601P07WorkflowPermissionSliceCaseSet();
const cp601Slice = validateClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor(cp601Descriptor, clientPortalContract);
const cp601Hermes = createClientPortalCoreCp601HermesEvidencePacket(cp601PlanPack, clientPortalContract, cp601Descriptor);
const cp601Claude = createClientPortalCoreCp601ClaudeReviewPacket(cp601PlanPack);
const cp601Handoff = createClientPortalCoreCp601CloseoutHandoff();
const cp602Coverage = validateClientPortalCoreCp602Coverage(cp602PlanPack);
const cp602Descriptor = createClientPortalCoreCp602P07PermissionFixtureSliceDescriptor();
const cp602CaseSet = createClientPortalCoreCp602P07PermissionFixtureSliceCaseSet();
const cp602Slice = validateClientPortalCoreCp602P07PermissionFixtureSliceDescriptor(cp602Descriptor, clientPortalContract);
const cp602Hermes = createClientPortalCoreCp602HermesEvidencePacket(cp602PlanPack, clientPortalContract, cp602Descriptor);
const cp602Claude = createClientPortalCoreCp602ClaudeReviewPacket(cp602PlanPack);
const cp602Handoff = createClientPortalCoreCp602CloseoutHandoff();
const cp603Coverage = validateClientPortalCoreCp603Coverage(cp603PlanPack);
const cp603Descriptor = createClientPortalCoreCp603P07CloseoutP08FoundationDescriptor();
const cp603CaseSet = createClientPortalCoreCp603P07CloseoutP08FoundationCaseSet();
const cp603Slice = validateClientPortalCoreCp603P07CloseoutP08FoundationDescriptor(cp603Descriptor, clientPortalContract);
const cp603Hermes = createClientPortalCoreCp603HermesEvidencePacket(cp603PlanPack, clientPortalContract, cp603Descriptor);
const cp603Claude = createClientPortalCoreCp603ClaudeReviewPacket(cp603PlanPack);
const cp603Handoff = createClientPortalCoreCp603CloseoutHandoff();
const cp604Coverage = validateClientPortalCoreCp604Coverage(cp604PlanPack);
const cp604Descriptor = createClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor();
const cp604CaseSet = createClientPortalCoreCp604P08WorkflowPermissionSliceCaseSet();
const cp604Slice = validateClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor(cp604Descriptor, clientPortalContract);
const cp604Hermes = createClientPortalCoreCp604HermesEvidencePacket(cp604PlanPack, clientPortalContract, cp604Descriptor);
const cp604Claude = createClientPortalCoreCp604ClaudeReviewPacket(cp604PlanPack);
const cp604Handoff = createClientPortalCoreCp604CloseoutHandoff();
const cp605Coverage = validateClientPortalCoreCp605Coverage(cp605PlanPack);
const cp605Descriptor = createClientPortalCoreCp605P08PermissionFixtureSliceDescriptor();
const cp605CaseSet = createClientPortalCoreCp605P08PermissionFixtureSliceCaseSet();
const cp605Slice = validateClientPortalCoreCp605P08PermissionFixtureSliceDescriptor(cp605Descriptor, clientPortalContract);
const cp605Hermes = createClientPortalCoreCp605HermesEvidencePacket(cp605PlanPack, clientPortalContract, cp605Descriptor);
const cp605Claude = createClientPortalCoreCp605ClaudeReviewPacket(cp605PlanPack);
const cp605Handoff = createClientPortalCoreCp605CloseoutHandoff();
const cp606Coverage = validateClientPortalCoreCp606Coverage(cp606PlanPack);
const cp606Descriptor = createClientPortalCoreCp606P08FixtureSliceDescriptor();
const cp606CaseSet = createClientPortalCoreCp606P08FixtureSliceCaseSet();
const cp606Slice = validateClientPortalCoreCp606P08FixtureSliceDescriptor(cp606Descriptor, clientPortalContract);
const cp606Hermes = createClientPortalCoreCp606HermesEvidencePacket(cp606PlanPack, clientPortalContract, cp606Descriptor);
const cp606Claude = createClientPortalCoreCp606ClaudeReviewPacket(cp606PlanPack);
const cp606Handoff = createClientPortalCoreCp606CloseoutHandoff();
const cp607Coverage = validateClientPortalCoreCp607Coverage(cp607PlanPack);
const cp607Descriptor = createClientPortalCoreCp607P08CloseoutP09FoundationDescriptor();
const cp607CaseSet = createClientPortalCoreCp607P08CloseoutP09FoundationCaseSet();
const cp607Slice = validateClientPortalCoreCp607P08CloseoutP09FoundationDescriptor(cp607Descriptor, clientPortalContract);
const cp607Hermes = createClientPortalCoreCp607HermesEvidencePacket(cp607PlanPack, clientPortalContract, cp607Descriptor);
const cp607Claude = createClientPortalCoreCp607ClaudeReviewPacket(cp607PlanPack);
const cp607Handoff = createClientPortalCoreCp607CloseoutHandoff();
const cp608Coverage = validateClientPortalCoreCp608Coverage(cp608PlanPack);
const cp608Descriptor = createClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor();
const cp608CaseSet = createClientPortalCoreCp608P09PermissionAuditFixtureBridgeCaseSet();
const cp608Slice = validateClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor(cp608Descriptor, clientPortalContract);
const cp608Hermes = createClientPortalCoreCp608HermesEvidencePacket(cp608PlanPack, clientPortalContract, cp608Descriptor);
const cp608Claude = createClientPortalCoreCp608ClaudeReviewPacket(cp608PlanPack);
const cp608Handoff = createClientPortalCoreCp608CloseoutHandoff();
const cp609Coverage = validateClientPortalCoreCp609Coverage(cp609PlanPack);
const cp609Descriptor = createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor();
const cp609CaseSet = createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeCaseSet();
const cp609Slice = validateClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor(cp609Descriptor, clientPortalContract);
const cp609Hermes = createClientPortalCoreCp609HermesEvidencePacket(cp609PlanPack, clientPortalContract, cp609Descriptor);
const cp609Claude = createClientPortalCoreCp609ClaudeReviewPacket(cp609PlanPack);
const cp609Handoff = createClientPortalCoreCp609CloseoutHandoff();

assert.equal(cp583Coverage.valid, true, cp583Coverage.errors.join("; "));
assert.equal(cp583Coverage.summary.unit_count, 150);
assert.equal(cp583Coverage.summary.by_phase["RP19.P00"], 71);
assert.equal(cp583Coverage.summary.by_phase["RP19.P01"], 79);
assert.equal(cp583Foundation.valid, true, cp583Foundation.errors.join("; "));
assert.equal(cp583CaseSet.section_count, 17);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP583_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp583CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-583 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp583Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp583_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP583_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp583_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION)));
assert.equal(cp583Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp583Hermes.production_ready_candidate, true);
assert.equal(cp583Claude.review_packet, "C19.CP00-583.client_portal_core_scope_contract_foundation_descriptor");
assert.equal(cp583Claude.read_only, true);
assert.equal(cp583Handoff.to_pack_id, "CP00-584");
assert.equal(cp583Handoff.next_subphase_id, "RP19.P01.M06.S01");
assert.equal(CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp584Coverage.valid, true, cp584Coverage.errors.join("; "));
assert.equal(cp584Coverage.summary.unit_count, 150);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P01.M06"], 20);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P01.M07"], 20);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P01.M08"], 20);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P01.M09"], 8);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P01.M10"], 3);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P02.M00"], 11);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P02.M01"], 20);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P02.M02"], 20);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P02.M03"], 22);
assert.equal(cp584Coverage.summary.by_micro_phase["RP19.P02.M04"], 6);
assert.equal(cp584Slice.valid, true, cp584Slice.errors.join("; "));
assert.equal(cp584CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP584_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp584CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-584 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp584Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp584_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP584_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp584_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION)));
assert.equal(cp584Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp584Hermes.production_ready_candidate, true);
assert.equal(cp584Claude.review_packet, "C19.CP00-584.client_portal_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp584Claude.read_only, true);
assert.equal(cp584Handoff.to_pack_id, "CP00-585");
assert.equal(cp584Handoff.next_subphase_id, "RP19.P02.M04.S07");
assert.equal(CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp585Coverage.valid, true, cp585Coverage.errors.join("; "));
assert.equal(cp585Coverage.summary.unit_count, 40);
assert.equal(cp585Coverage.summary.by_micro_phase["RP19.P02.M04"], 16);
assert.equal(cp585Coverage.summary.by_micro_phase["RP19.P02.M05"], 22);
assert.equal(cp585Coverage.summary.by_micro_phase["RP19.P02.M06"], 2);
assert.equal(cp585Slice.valid, true, cp585Slice.errors.join("; "));
assert.equal(cp585CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP585_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp585CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-585 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp585Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp585_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP585_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp585_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION)));
assert.equal(cp585Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp585Hermes.production_ready_candidate, true);
assert.equal(cp585Claude.review_packet, "C19.CP00-585.client_portal_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp585Claude.read_only, true);
assert.equal(cp585Handoff.to_pack_id, "CP00-586");
assert.equal(cp585Handoff.next_subphase_id, "RP19.P02.M06.S03");
assert.equal(CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp586Coverage.valid, true, cp586Coverage.errors.join("; "));
assert.equal(cp586Coverage.summary.unit_count, 10);
assert.equal(cp586Coverage.summary.by_micro_phase["RP19.P02.M06"], 10);
assert.equal(cp586Slice.valid, true, cp586Slice.errors.join("; "));
assert.equal(cp586CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP586_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp586CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-586 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p02_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp586Descriptor)),
  "contract p02_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp586_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP586_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp586_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION)));
assert.equal(cp586Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp586Hermes.production_ready_candidate, true);
assert.equal(cp586Claude.review_packet, "C19.CP00-586.client_portal_core_p02_fixture_slice_descriptor");
assert.equal(cp586Claude.read_only, true);
assert.equal(cp586Handoff.to_pack_id, "CP00-587");
assert.equal(cp586Handoff.next_subphase_id, "RP19.P02.M06.S13");
assert.equal(CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp587Coverage.valid, true, cp587Coverage.errors.join("; "));
assert.equal(cp587Coverage.summary.unit_count, 150);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P02.M06"], 10);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P02.M07"], 22);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P02.M08"], 22);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P02.M09"], 20);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P02.M10"], 11);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M00"], 3);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M01"], 8);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M02"], 8);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M03"], 20);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M04"], 20);
assert.equal(cp587Coverage.summary.by_micro_phase["RP19.P03.M05"], 6);
assert.equal(cp587Slice.valid, true, cp587Slice.errors.join("; "));
assert.equal(cp587CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP587_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp587CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-587 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp587Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp587_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP587_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp587_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION)));
assert.equal(cp587Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp587Hermes.production_ready_candidate, true);
assert.equal(cp587Claude.review_packet, "C19.CP00-587.client_portal_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp587Claude.read_only, true);
assert.equal(cp587Handoff.to_pack_id, "CP00-588");
assert.equal(cp587Handoff.next_subphase_id, "RP19.P03.M05.S07");
assert.equal(CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp588Coverage.valid, true, cp588Coverage.errors.join("; "));
assert.equal(cp588Coverage.summary.unit_count, 10);
assert.equal(cp588Coverage.summary.by_micro_phase["RP19.P03.M05"], 10);
assert.equal(cp588Slice.valid, true, cp588Slice.errors.join("; "));
assert.equal(cp588CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP588_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp588CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-588 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p03_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp588Descriptor)),
  "contract p03_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp588_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP588_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp588_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION)));
assert.equal(cp588Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp588Hermes.production_ready_candidate, true);
assert.equal(cp588Claude.review_packet, "C19.CP00-588.client_portal_core_p03_permission_slice_descriptor");
assert.equal(cp588Claude.read_only, true);
assert.equal(cp588Handoff.to_pack_id, "CP00-589");
assert.equal(cp588Handoff.next_subphase_id, "RP19.P03.M05.S17");
assert.equal(CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp589Coverage.valid, true, cp589Coverage.errors.join("; "));
assert.equal(cp589Coverage.summary.unit_count, 10);
assert.equal(cp589Coverage.summary.by_micro_phase["RP19.P03.M05"], 4);
assert.equal(cp589Coverage.summary.by_micro_phase["RP19.P03.M06"], 6);
assert.equal(cp589Slice.valid, true, cp589Slice.errors.join("; "));
assert.equal(cp589CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP589_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp589CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-589 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p03_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp589Descriptor)),
  "contract p03_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp589_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP589_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp589_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION)));
assert.equal(cp589Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp589Hermes.production_ready_candidate, true);
assert.equal(cp589Claude.review_packet, "C19.CP00-589.client_portal_core_p03_permission_fixture_slice_descriptor");
assert.equal(cp589Claude.read_only, true);
assert.equal(cp589Handoff.to_pack_id, "CP00-590");
assert.equal(cp589Handoff.next_subphase_id, "RP19.P03.M06.S07");
assert.equal(CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp590Coverage.valid, true, cp590Coverage.errors.join("; "));
assert.equal(cp590Coverage.summary.unit_count, 150);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P03.M06"], 14);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P03.M07"], 20);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P03.M08"], 20);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P03.M09"], 8);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P03.M10"], 3);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M00"], 8);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M01"], 8);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M02"], 20);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M03"], 22);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M04"], 20);
assert.equal(cp590Coverage.summary.by_micro_phase["RP19.P04.M05"], 7);
assert.equal(cp590Slice.valid, true, cp590Slice.errors.join("; "));
assert.equal(cp590CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP590_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp590CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-590 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp590Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp590_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP590_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp590_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION)));
assert.equal(cp590Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp590Hermes.production_ready_candidate, true);
assert.equal(cp590Claude.review_packet, "C19.CP00-590.client_portal_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp590Claude.read_only, true);
assert.equal(cp590Handoff.to_pack_id, "CP00-591");
assert.equal(cp590Handoff.next_subphase_id, "RP19.P04.M05.S08");
assert.equal(CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp591Coverage.valid, true, cp591Coverage.errors.join("; "));
assert.equal(cp591Coverage.summary.unit_count, 10);
assert.equal(cp591Coverage.summary.by_micro_phase["RP19.P04.M05"], 10);
assert.equal(cp591Slice.valid, true, cp591Slice.errors.join("; "));
assert.equal(cp591CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP591_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp591CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-591 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p04_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp591Descriptor)),
  "contract p04_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp591_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP591_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp591_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION)));
assert.equal(cp591Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp591Hermes.production_ready_candidate, true);
assert.equal(cp591Claude.review_packet, "C19.CP00-591.client_portal_core_p04_permission_slice_descriptor");
assert.equal(cp591Claude.read_only, true);
assert.equal(cp591Handoff.to_pack_id, "CP00-592");
assert.equal(cp591Handoff.next_subphase_id, "RP19.P04.M05.S18");
assert.equal(CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp592Coverage.valid, true, cp592Coverage.errors.join("; "));
assert.equal(cp592Coverage.summary.unit_count, 10);
assert.equal(cp592Coverage.summary.by_micro_phase["RP19.P04.M05"], 5);
assert.equal(cp592Coverage.summary.by_micro_phase["RP19.P04.M06"], 5);
assert.equal(cp592Slice.valid, true, cp592Slice.errors.join("; "));
assert.equal(cp592CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP592_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp592CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-592 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp592Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp592_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP592_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp592_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION)));
assert.equal(cp592Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp592Hermes.production_ready_candidate, true);
assert.equal(cp592Claude.review_packet, "C19.CP00-592.client_portal_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp592Claude.read_only, true);
assert.equal(cp592Handoff.to_pack_id, "CP00-593");
assert.equal(cp592Handoff.next_subphase_id, "RP19.P04.M06.S06");
assert.equal(CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp593Coverage.valid, true, cp593Coverage.errors.join("; "));
assert.equal(cp593Coverage.summary.unit_count, 150);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P04.M06"], 15);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P04.M07"], 22);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P04.M08"], 20);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P04.M09"], 20);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P04.M10"], 8);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P05.M00"], 8);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P05.M01"], 8);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P05.M02"], 20);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P05.M03"], 22);
assert.equal(cp593Coverage.summary.by_micro_phase["RP19.P05.M04"], 7);
assert.equal(cp593Slice.valid, true, cp593Slice.errors.join("; "));
assert.equal(cp593CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP593_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp593CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-593 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp593Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp593_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP593_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp593_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION)));
assert.equal(cp593Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp593Hermes.production_ready_candidate, true);
assert.equal(cp593Claude.review_packet, "C19.CP00-593.client_portal_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp593Claude.read_only, true);
assert.equal(cp593Handoff.to_pack_id, "CP00-594");
assert.equal(cp593Handoff.next_subphase_id, "RP19.P05.M04.S08");
assert.equal(CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp594Coverage.valid, true, cp594Coverage.errors.join("; "));
assert.equal(cp594Coverage.summary.unit_count, 40);
assert.equal(cp594Coverage.summary.by_micro_phase["RP19.P05.M04"], 13);
assert.equal(cp594Coverage.summary.by_micro_phase["RP19.P05.M05"], 22);
assert.equal(cp594Coverage.summary.by_micro_phase["RP19.P05.M06"], 5);
assert.equal(cp594Slice.valid, true, cp594Slice.errors.join("; "));
assert.equal(cp594CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP594_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp594CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-594 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p05_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp594Descriptor)),
  "contract p05_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp594_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP594_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp594_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION)));
assert.equal(cp594Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp594Hermes.production_ready_candidate, true);
assert.equal(cp594Claude.review_packet, "C19.CP00-594.client_portal_core_p05_workflow_permission_slice_descriptor");
assert.equal(cp594Claude.read_only, true);
assert.equal(cp594Handoff.to_pack_id, "CP00-595");
assert.equal(cp594Handoff.next_subphase_id, "RP19.P05.M06.S06");
assert.equal(CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp595Coverage.valid, true, cp595Coverage.errors.join("; "));
assert.equal(cp595Coverage.summary.unit_count, 150);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P05.M06"], 15);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P05.M07"], 22);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P05.M08"], 20);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P05.M09"], 20);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P05.M10"], 8);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P06.M00"], 11);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P06.M01"], 20);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P06.M02"], 20);
assert.equal(cp595Coverage.summary.by_micro_phase["RP19.P06.M03"], 14);
assert.equal(cp595Slice.valid, true, cp595Slice.errors.join("; "));
assert.equal(cp595CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP595_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp595CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-595 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp595Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp595_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP595_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp595_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION)));
assert.equal(cp595Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp595Hermes.production_ready_candidate, true);
assert.equal(cp595Claude.review_packet, "C19.CP00-595.client_portal_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp595Claude.read_only, true);
assert.equal(cp595Handoff.to_pack_id, "CP00-596");
assert.equal(cp595Handoff.next_subphase_id, "RP19.P06.M03.S15");
assert.equal(CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp596Coverage.valid, true, cp596Coverage.errors.join("; "));
assert.equal(cp596Coverage.summary.unit_count, 10);
assert.equal(cp596Coverage.summary.by_micro_phase["RP19.P06.M03"], 8);
assert.equal(cp596Coverage.summary.by_micro_phase["RP19.P06.M04"], 2);
assert.equal(cp596Slice.valid, true, cp596Slice.errors.join("; "));
assert.equal(cp596CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP596_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp596CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-596 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p06_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp596Descriptor)),
  "contract p06_implementation_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp596_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP596_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp596_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION)));
assert.equal(cp596Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp596Hermes.production_ready_candidate, true);
assert.equal(cp596Claude.review_packet, "C19.CP00-596.client_portal_core_p06_implementation_slice_descriptor");
assert.equal(cp596Claude.read_only, true);
assert.equal(cp596Handoff.to_pack_id, "CP00-597");
assert.equal(cp596Handoff.next_subphase_id, "RP19.P06.M04.S03");
assert.equal(CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp597Coverage.valid, true, cp597Coverage.errors.join("; "));
assert.equal(cp597Coverage.summary.unit_count, 40);
assert.equal(cp597Coverage.summary.by_micro_phase["RP19.P06.M04"], 20);
assert.equal(cp597Coverage.summary.by_micro_phase["RP19.P06.M05"], 20);
assert.equal(cp597Slice.valid, true, cp597Slice.errors.join("; "));
assert.equal(cp597CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP597_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp597CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-597 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p06_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp597Descriptor)),
  "contract p06_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp597_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP597_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp597_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION)));
assert.equal(cp597Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp597Hermes.production_ready_candidate, true);
assert.equal(cp597Claude.review_packet, "C19.CP00-597.client_portal_core_p06_workflow_permission_slice_descriptor");
assert.equal(cp597Claude.read_only, true);
assert.equal(cp597Handoff.to_pack_id, "CP00-598");
assert.equal(cp597Handoff.next_subphase_id, "RP19.P06.M05.S21");
assert.equal(CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp598Coverage.valid, true, cp598Coverage.errors.join("; "));
assert.equal(cp598Coverage.summary.unit_count, 10);
assert.equal(cp598Coverage.summary.by_micro_phase["RP19.P06.M05"], 2);
assert.equal(cp598Coverage.summary.by_micro_phase["RP19.P06.M06"], 8);
assert.equal(cp598Slice.valid, true, cp598Slice.errors.join("; "));
assert.equal(cp598CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP598_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp598CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-598 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp598Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp598_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP598_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp598_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION)));
assert.equal(cp598Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp598Hermes.production_ready_candidate, true);
assert.equal(cp598Claude.review_packet, "C19.CP00-598.client_portal_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp598Claude.read_only, true);
assert.equal(cp598Handoff.to_pack_id, "CP00-599");
assert.equal(cp598Handoff.next_subphase_id, "RP19.P06.M06.S09");
assert.equal(CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp599Coverage.valid, true, cp599Coverage.errors.join("; "));
assert.equal(cp599Coverage.summary.unit_count, 150);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P06.M06"], 14);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P06.M07"], 22);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P06.M08"], 22);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P06.M09"], 20);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P06.M10"], 11);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P07.M00"], 11);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P07.M01"], 20);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P07.M02"], 20);
assert.equal(cp599Coverage.summary.by_micro_phase["RP19.P07.M03"], 10);
assert.equal(cp599Slice.valid, true, cp599Slice.errors.join("; "));
assert.equal(cp599CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP599_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp599CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-599 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp599Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp599_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP599_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp599_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION)));
assert.equal(cp599Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp599Hermes.production_ready_candidate, true);
assert.equal(cp599Claude.review_packet, "C19.CP00-599.client_portal_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp599Claude.read_only, true);
assert.equal(cp599Handoff.to_pack_id, "CP00-600");
assert.equal(cp599Handoff.next_subphase_id, "RP19.P07.M03.S11");
assert.equal(CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp600Coverage.valid, true, cp600Coverage.errors.join("; "));
assert.equal(cp600Coverage.summary.unit_count, 10);
assert.equal(cp600Coverage.summary.by_micro_phase["RP19.P07.M03"], 10);
assert.equal(cp600Slice.valid, true, cp600Slice.errors.join("; "));
assert.equal(cp600CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP600_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp600CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-600 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p07_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp600Descriptor)),
  "contract p07_implementation_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp600_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP600_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp600_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION)));
assert.equal(cp600Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp600Hermes.production_ready_candidate, true);
assert.equal(cp600Claude.review_packet, "C19.CP00-600.client_portal_core_p07_implementation_slice_descriptor");
assert.equal(cp600Claude.read_only, true);
assert.equal(cp600Handoff.to_pack_id, "CP00-601");
assert.equal(cp600Handoff.next_subphase_id, "RP19.P07.M03.S21");
assert.equal(CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp601Coverage.valid, true, cp601Coverage.errors.join("; "));
assert.equal(cp601Coverage.summary.unit_count, 40);
assert.equal(cp601Coverage.summary.by_micro_phase["RP19.P07.M03"], 2);
assert.equal(cp601Coverage.summary.by_micro_phase["RP19.P07.M04"], 22);
assert.equal(cp601Coverage.summary.by_micro_phase["RP19.P07.M05"], 16);
assert.equal(cp601Slice.valid, true, cp601Slice.errors.join("; "));
assert.equal(cp601CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP601_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp601CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-601 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p07_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp601Descriptor)),
  "contract p07_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp601_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP601_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp601_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION)));
assert.equal(cp601Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp601Hermes.production_ready_candidate, true);
assert.equal(cp601Claude.review_packet, "C19.CP00-601.client_portal_core_p07_workflow_permission_slice_descriptor");
assert.equal(cp601Claude.read_only, true);
assert.equal(cp601Handoff.to_pack_id, "CP00-602");
assert.equal(cp601Handoff.next_subphase_id, "RP19.P07.M05.S17");
assert.equal(CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp602Coverage.valid, true, cp602Coverage.errors.join("; "));
assert.equal(cp602Coverage.summary.unit_count, 10);
assert.equal(cp602Coverage.summary.by_micro_phase["RP19.P07.M05"], 6);
assert.equal(cp602Coverage.summary.by_micro_phase["RP19.P07.M06"], 4);
assert.equal(cp602Slice.valid, true, cp602Slice.errors.join("; "));
assert.equal(cp602CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP602_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp602CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-602 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p07_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp602Descriptor)),
  "contract p07_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp602_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP602_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp602_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION)));
assert.equal(cp602Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp602Hermes.production_ready_candidate, true);
assert.equal(cp602Claude.review_packet, "C19.CP00-602.client_portal_core_p07_permission_fixture_slice_descriptor");
assert.equal(cp602Claude.read_only, true);
assert.equal(cp602Handoff.to_pack_id, "CP00-603");
assert.equal(cp602Handoff.next_subphase_id, "RP19.P07.M06.S05");
assert.equal(CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp603Coverage.valid, true, cp603Coverage.errors.join("; "));
assert.equal(cp603Coverage.summary.unit_count, 150);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P07.M06"], 18);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P07.M07"], 22);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P07.M08"], 22);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P07.M09"], 20);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P07.M10"], 11);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P08.M00"], 8);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P08.M01"], 8);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P08.M02"], 20);
assert.equal(cp603Coverage.summary.by_micro_phase["RP19.P08.M03"], 21);
assert.equal(cp603Slice.valid, true, cp603Slice.errors.join("; "));
assert.equal(cp603CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP603_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp603CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-603 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp603Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp603_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP603_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp603_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION)));
assert.equal(cp603Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp603Hermes.production_ready_candidate, true);
assert.equal(cp603Claude.review_packet, "C19.CP00-603.client_portal_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp603Claude.read_only, true);
assert.equal(cp603Handoff.to_pack_id, "CP00-604");
assert.equal(cp603Handoff.next_subphase_id, "RP19.P08.M03.S22");
assert.equal(CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp604Coverage.valid, true, cp604Coverage.errors.join("; "));
assert.equal(cp604Coverage.summary.unit_count, 40);
assert.equal(cp604Coverage.summary.by_micro_phase["RP19.P08.M03"], 1);
assert.equal(cp604Coverage.summary.by_micro_phase["RP19.P08.M04"], 20);
assert.equal(cp604Coverage.summary.by_micro_phase["RP19.P08.M05"], 19);
assert.equal(cp604Slice.valid, true, cp604Slice.errors.join("; "));
assert.equal(cp604CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP604_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp604CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-604 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p08_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp604Descriptor)),
  "contract p08_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp604_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP604_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp604_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION)));
assert.equal(cp604Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp604Hermes.production_ready_candidate, true);
assert.equal(cp604Claude.review_packet, "C19.CP00-604.client_portal_core_p08_workflow_permission_slice_descriptor");
assert.equal(cp604Claude.read_only, true);
assert.equal(cp604Handoff.to_pack_id, "CP00-605");
assert.equal(cp604Handoff.next_subphase_id, "RP19.P08.M05.S20");
assert.equal(CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp605Coverage.valid, true, cp605Coverage.errors.join("; "));
assert.equal(cp605Coverage.summary.unit_count, 10);
assert.equal(cp605Coverage.summary.by_micro_phase["RP19.P08.M05"], 3);
assert.equal(cp605Coverage.summary.by_micro_phase["RP19.P08.M06"], 7);
assert.equal(cp605Slice.valid, true, cp605Slice.errors.join("; "));
assert.equal(cp605CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP605_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp605CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-605 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p08_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp605Descriptor)),
  "contract p08_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp605_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP605_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp605_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION)));
assert.equal(cp605Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp605Hermes.production_ready_candidate, true);
assert.equal(cp605Claude.review_packet, "C19.CP00-605.client_portal_core_p08_permission_fixture_slice_descriptor");
assert.equal(cp605Claude.read_only, true);
assert.equal(cp605Handoff.to_pack_id, "CP00-606");
assert.equal(cp605Handoff.next_subphase_id, "RP19.P08.M06.S08");
assert.equal(CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp606Coverage.valid, true, cp606Coverage.errors.join("; "));
assert.equal(cp606Coverage.summary.unit_count, 10);
assert.equal(cp606Coverage.summary.by_micro_phase["RP19.P08.M06"], 10);
assert.equal(cp606Slice.valid, true, cp606Slice.errors.join("; "));
assert.equal(cp606CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP606_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp606CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-606 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p08_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp606Descriptor)),
  "contract p08_fixture_slice_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp606_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP606_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp606_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION)));
assert.equal(cp606Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp606Hermes.production_ready_candidate, true);
assert.equal(cp606Claude.review_packet, "C19.CP00-606.client_portal_core_p08_fixture_slice_descriptor");
assert.equal(cp606Claude.read_only, true);
assert.equal(cp606Handoff.to_pack_id, "CP00-607");
assert.equal(cp606Handoff.next_subphase_id, "RP19.P08.M06.S18");
assert.equal(CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp607Coverage.valid, true, cp607Coverage.errors.join("; "));
assert.equal(cp607Coverage.summary.unit_count, 150);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P08.M06"], 3);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P08.M07"], 22);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P08.M08"], 20);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P08.M09"], 20);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P08.M10"], 8);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M00"], 4);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M01"], 8);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M02"], 8);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M03"], 20);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M04"], 20);
assert.equal(cp607Coverage.summary.by_micro_phase["RP19.P09.M05"], 17);
assert.equal(cp607Slice.valid, true, cp607Slice.errors.join("; "));
assert.equal(cp607CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP607_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp607CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-607 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp607Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp607_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP607_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp607_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION)));
assert.equal(cp607Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp607Hermes.production_ready_candidate, true);
assert.equal(cp607Claude.review_packet, "C19.CP00-607.client_portal_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp607Claude.read_only, true);
assert.equal(cp607Handoff.to_pack_id, "CP00-608");
assert.equal(cp607Handoff.next_subphase_id, "RP19.P09.M05.S18");
assert.equal(CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp608Coverage.valid, true, cp608Coverage.errors.join("; "));
assert.equal(cp608Coverage.summary.unit_count, 10);
assert.equal(cp608Coverage.summary.by_micro_phase["RP19.P09.M05"], 3);
assert.equal(cp608Coverage.summary.by_micro_phase["RP19.P09.M06"], 7);
assert.equal(cp608Slice.valid, true, cp608Slice.errors.join("; "));
assert.equal(cp608CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP608_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp608CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, `CP00-608 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p09_permission_audit_fixture_bridge_descriptor,
  JSON.parse(JSON.stringify(cp608Descriptor)),
  "contract p09_permission_audit_fixture_bridge_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp608_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP608_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp608_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION)));
assert.equal(cp608Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp608Hermes.production_ready_candidate, true);
assert.equal(cp608Claude.review_packet, "C19.CP00-608.client_portal_core_p09_permission_audit_fixture_bridge_descriptor");
assert.equal(cp608Claude.read_only, true);
assert.equal(cp608Handoff.to_pack_id, "CP00-609");
assert.equal(cp608Handoff.next_subphase_id, "RP19.P09.M06.S08");
assert.equal(CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);


assert.equal(cp609Coverage.valid, true, cp609Coverage.errors.join("; "));
assert.equal(cp609Coverage.summary.unit_count, 65);
assert.equal(cp609Coverage.summary.by_micro_phase["RP19.P09.M06"], 13);
assert.equal(cp609Coverage.summary.by_micro_phase["RP19.P09.M07"], 20);
assert.equal(cp609Coverage.summary.by_micro_phase["RP19.P09.M08"], 20);
assert.equal(cp609Coverage.summary.by_micro_phase["RP19.P09.M09"], 8);
assert.equal(cp609Coverage.summary.by_micro_phase["RP19.P09.M10"], 4);
assert.equal(cp609Slice.valid, true, cp609Slice.errors.join("; "));
assert.equal(cp609CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP609_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp609CaseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
    assert.ok(row, "CP00-609 " + microId + " missing row " + title);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  clientPortalContract.p09_review_evidence_closeout_bridge_descriptor,
  JSON.parse(JSON.stringify(cp609Descriptor)),
  "contract p09_review_evidence_closeout_bridge_descriptor drift",
);
assert.deepEqual(clientPortalContract.cp609_requirements, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP609_REQUIREMENTS)));
assert.deepEqual(clientPortalContract.cp609_no_write_attestation, JSON.parse(JSON.stringify(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION)));
assert.equal(cp609Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp609Hermes.production_ready_candidate, true);
assert.equal(cp609Claude.review_packet, "C19.CP00-609.client_portal_core_p09_review_evidence_closeout_bridge_descriptor");
assert.equal(cp609Claude.read_only, true);
assert.equal(cp609Handoff.to_pack_id, "CP00-610");
assert.equal(cp609Handoff.next_subphase_id, "RP20.P00.M00.S01");
assert.equal(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(clientPortalContract.historical_pack_bindings));
assert.equal(clientPortalContract.historical_pack_bindings.at(-1).pack_id, "CP00-609");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp19:client-portal-core:validate",
      pack_id: CLIENT_PORTAL_CORE_CP609_PACK_BINDING.pack_id,
      covered_units: cp609Coverage.summary.unit_count,
      cp608_units_preserved: cp608Coverage.summary.unit_count,
      cp607_units_preserved: cp607Coverage.summary.unit_count,
      cp606_units_preserved: cp606Coverage.summary.unit_count,
      cp605_units_preserved: cp605Coverage.summary.unit_count,
      cp604_units_preserved: cp604Coverage.summary.unit_count,
      cp603_units_preserved: cp603Coverage.summary.unit_count,
      cp602_units_preserved: cp602Coverage.summary.unit_count,
      cp601_units_preserved: cp601Coverage.summary.unit_count,
      cp600_units_preserved: cp600Coverage.summary.unit_count,
      cp599_units_preserved: cp599Coverage.summary.unit_count,
      cp598_units_preserved: cp598Coverage.summary.unit_count,
      cp597_units_preserved: cp597Coverage.summary.unit_count,
      cp596_units_preserved: cp596Coverage.summary.unit_count,
      cp595_units_preserved: cp595Coverage.summary.unit_count,
      cp594_units_preserved: cp594Coverage.summary.unit_count,
      cp593_units_preserved: cp593Coverage.summary.unit_count,
      cp592_units_preserved: cp592Coverage.summary.unit_count,
      cp591_units_preserved: cp591Coverage.summary.unit_count,
      cp590_units_preserved: cp590Coverage.summary.unit_count,
      cp589_units_preserved: cp589Coverage.summary.unit_count,
      cp588_units_preserved: cp588Coverage.summary.unit_count,
      cp587_units_preserved: cp587Coverage.summary.unit_count,
      cp586_units_preserved: cp586Coverage.summary.unit_count,
      cp585_units_preserved: cp585Coverage.summary.unit_count,
      cp584_units_preserved: cp584Coverage.summary.unit_count,
      cp583_units_preserved: cp583Coverage.summary.unit_count,
      program_id: CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp608Hermes.gate,
      claude_gate: clientPortalContract.current_pack.claude_gate,
      source_ai_legal_workflows_core_pack_id: CLIENT_PORTAL_CORE_CP583_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp609Handoff.to_pack_id,
      production_ready_candidate: cp609Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
