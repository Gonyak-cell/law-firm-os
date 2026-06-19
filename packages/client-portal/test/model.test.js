import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const clientPortalContract = JSON.parse(
  readFileSync(new URL("../../../contracts/client-portal-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp583ManifestPath = new URL("../../../docs/closeout-packs/cp00-583/manifest.json", import.meta.url);
const cp583Manifest = existsSync(cp583ManifestPath) ? JSON.parse(readFileSync(cp583ManifestPath, "utf8")) : null;
const cp583PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-583") ?? cp583Manifest?.plan_binding_snapshot;
const cp584ManifestPath = new URL("../../../docs/closeout-packs/cp00-584/manifest.json", import.meta.url);
const cp584Manifest = existsSync(cp584ManifestPath) ? JSON.parse(readFileSync(cp584ManifestPath, "utf8")) : null;
const cp584PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-584") ?? cp584Manifest?.plan_binding_snapshot;
const cp585ManifestPath = new URL("../../../docs/closeout-packs/cp00-585/manifest.json", import.meta.url);
const cp585Manifest = existsSync(cp585ManifestPath) ? JSON.parse(readFileSync(cp585ManifestPath, "utf8")) : null;
const cp585PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-585") ?? cp585Manifest?.plan_binding_snapshot;
const cp586ManifestPath = new URL("../../../docs/closeout-packs/cp00-586/manifest.json", import.meta.url);
const cp586Manifest = existsSync(cp586ManifestPath) ? JSON.parse(readFileSync(cp586ManifestPath, "utf8")) : null;
const cp586PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-586") ?? cp586Manifest?.plan_binding_snapshot;
const cp587ManifestPath = new URL("../../../docs/closeout-packs/cp00-587/manifest.json", import.meta.url);
const cp587Manifest = existsSync(cp587ManifestPath) ? JSON.parse(readFileSync(cp587ManifestPath, "utf8")) : null;
const cp587PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-587") ?? cp587Manifest?.plan_binding_snapshot;
const cp588ManifestPath = new URL("../../../docs/closeout-packs/cp00-588/manifest.json", import.meta.url);
const cp588Manifest = existsSync(cp588ManifestPath) ? JSON.parse(readFileSync(cp588ManifestPath, "utf8")) : null;
const cp588PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-588") ?? cp588Manifest?.plan_binding_snapshot;
const cp589ManifestPath = new URL("../../../docs/closeout-packs/cp00-589/manifest.json", import.meta.url);
const cp589Manifest = existsSync(cp589ManifestPath) ? JSON.parse(readFileSync(cp589ManifestPath, "utf8")) : null;
const cp589PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-589") ?? cp589Manifest?.plan_binding_snapshot;
const cp590ManifestPath = new URL("../../../docs/closeout-packs/cp00-590/manifest.json", import.meta.url);
const cp590Manifest = existsSync(cp590ManifestPath) ? JSON.parse(readFileSync(cp590ManifestPath, "utf8")) : null;
const cp590PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-590") ?? cp590Manifest?.plan_binding_snapshot;
const cp591ManifestPath = new URL("../../../docs/closeout-packs/cp00-591/manifest.json", import.meta.url);
const cp591Manifest = existsSync(cp591ManifestPath) ? JSON.parse(readFileSync(cp591ManifestPath, "utf8")) : null;
const cp591PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-591") ?? cp591Manifest?.plan_binding_snapshot;
const cp592ManifestPath = new URL("../../../docs/closeout-packs/cp00-592/manifest.json", import.meta.url);
const cp592Manifest = existsSync(cp592ManifestPath) ? JSON.parse(readFileSync(cp592ManifestPath, "utf8")) : null;
const cp592PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-592") ?? cp592Manifest?.plan_binding_snapshot;
const cp593ManifestPath = new URL("../../../docs/closeout-packs/cp00-593/manifest.json", import.meta.url);
const cp593Manifest = existsSync(cp593ManifestPath) ? JSON.parse(readFileSync(cp593ManifestPath, "utf8")) : null;
const cp593PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-593") ?? cp593Manifest?.plan_binding_snapshot;
const cp594ManifestPath = new URL("../../../docs/closeout-packs/cp00-594/manifest.json", import.meta.url);
const cp594Manifest = existsSync(cp594ManifestPath) ? JSON.parse(readFileSync(cp594ManifestPath, "utf8")) : null;
const cp594PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-594") ?? cp594Manifest?.plan_binding_snapshot;
const cp595ManifestPath = new URL("../../../docs/closeout-packs/cp00-595/manifest.json", import.meta.url);
const cp595Manifest = existsSync(cp595ManifestPath) ? JSON.parse(readFileSync(cp595ManifestPath, "utf8")) : null;
const cp595PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-595") ?? cp595Manifest?.plan_binding_snapshot;
const cp596ManifestPath = new URL("../../../docs/closeout-packs/cp00-596/manifest.json", import.meta.url);
const cp596Manifest = existsSync(cp596ManifestPath) ? JSON.parse(readFileSync(cp596ManifestPath, "utf8")) : null;
const cp596PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-596") ?? cp596Manifest?.plan_binding_snapshot;
const cp597ManifestPath = new URL("../../../docs/closeout-packs/cp00-597/manifest.json", import.meta.url);
const cp597Manifest = existsSync(cp597ManifestPath) ? JSON.parse(readFileSync(cp597ManifestPath, "utf8")) : null;
const cp597PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-597") ?? cp597Manifest?.plan_binding_snapshot;
const cp598ManifestPath = new URL("../../../docs/closeout-packs/cp00-598/manifest.json", import.meta.url);
const cp598Manifest = existsSync(cp598ManifestPath) ? JSON.parse(readFileSync(cp598ManifestPath, "utf8")) : null;
const cp598PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-598") ?? cp598Manifest?.plan_binding_snapshot;
const cp599ManifestPath = new URL("../../../docs/closeout-packs/cp00-599/manifest.json", import.meta.url);
const cp599Manifest = existsSync(cp599ManifestPath) ? JSON.parse(readFileSync(cp599ManifestPath, "utf8")) : null;
const cp599PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-599") ?? cp599Manifest?.plan_binding_snapshot;
const cp600ManifestPath = new URL("../../../docs/closeout-packs/cp00-600/manifest.json", import.meta.url);
const cp600Manifest = existsSync(cp600ManifestPath) ? JSON.parse(readFileSync(cp600ManifestPath, "utf8")) : null;
const cp600PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-600") ?? cp600Manifest?.plan_binding_snapshot;
const cp601ManifestPath = new URL("../../../docs/closeout-packs/cp00-601/manifest.json", import.meta.url);
const cp601Manifest = existsSync(cp601ManifestPath) ? JSON.parse(readFileSync(cp601ManifestPath, "utf8")) : null;
const cp601PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-601") ?? cp601Manifest?.plan_binding_snapshot;
const cp602ManifestPath = new URL("../../../docs/closeout-packs/cp00-602/manifest.json", import.meta.url);
const cp602Manifest = existsSync(cp602ManifestPath) ? JSON.parse(readFileSync(cp602ManifestPath, "utf8")) : null;
const cp602PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-602") ?? cp602Manifest?.plan_binding_snapshot;
const cp603ManifestPath = new URL("../../../docs/closeout-packs/cp00-603/manifest.json", import.meta.url);
const cp603Manifest = existsSync(cp603ManifestPath) ? JSON.parse(readFileSync(cp603ManifestPath, "utf8")) : null;
const cp603PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-603") ?? cp603Manifest?.plan_binding_snapshot;
const cp604ManifestPath = new URL("../../../docs/closeout-packs/cp00-604/manifest.json", import.meta.url);
const cp604Manifest = existsSync(cp604ManifestPath) ? JSON.parse(readFileSync(cp604ManifestPath, "utf8")) : null;
const cp604PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-604") ?? cp604Manifest?.plan_binding_snapshot;
const cp605ManifestPath = new URL("../../../docs/closeout-packs/cp00-605/manifest.json", import.meta.url);
const cp605Manifest = existsSync(cp605ManifestPath) ? JSON.parse(readFileSync(cp605ManifestPath, "utf8")) : null;
const cp605PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-605") ?? cp605Manifest?.plan_binding_snapshot;
const cp606ManifestPath = new URL("../../../docs/closeout-packs/cp00-606/manifest.json", import.meta.url);
const cp606Manifest = existsSync(cp606ManifestPath) ? JSON.parse(readFileSync(cp606ManifestPath, "utf8")) : null;
const cp606PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-606") ?? cp606Manifest?.plan_binding_snapshot;
const cp607ManifestPath = new URL("../../../docs/closeout-packs/cp00-607/manifest.json", import.meta.url);
const cp607Manifest = existsSync(cp607ManifestPath) ? JSON.parse(readFileSync(cp607ManifestPath, "utf8")) : null;
const cp607PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-607") ?? cp607Manifest?.plan_binding_snapshot;
const cp608ManifestPath = new URL("../../../docs/closeout-packs/cp00-608/manifest.json", import.meta.url);
const cp608Manifest = existsSync(cp608ManifestPath) ? JSON.parse(readFileSync(cp608ManifestPath, "utf8")) : null;
const cp608PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-608") ?? cp608Manifest?.plan_binding_snapshot;
const cp609ManifestPath = new URL("../../../docs/closeout-packs/cp00-609/manifest.json", import.meta.url);
const cp609Manifest = existsSync(cp609ManifestPath) ? JSON.parse(readFileSync(cp609ManifestPath, "utf8")) : null;
const cp609PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-609") ?? cp609Manifest?.plan_binding_snapshot;

test("RP19 program contract pins the Client Portal descriptor-only bootstrap", () => {
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.program_id, "RP19");
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.program_title, "Client Portal");
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP18");
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.hermes_gate, "H19");
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.claude_gate, "C19");
  assert.equal(CLIENT_PORTAL_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-583", "CP00-584", "CP00-585", "CP00-586", "CP00-587", "CP00-588", "CP00-589", "CP00-590", "CP00-591", "CP00-592", "CP00-593", "CP00-594", "CP00-595", "CP00-596", "CP00-597", "CP00-598", "CP00-599", "CP00-600", "CP00-601", "CP00-602", "CP00-603", "CP00-604", "CP00-605", "CP00-606", "CP00-607", "CP00-608", "CP00-609"].includes(clientPortalContract.current_pack.pack_id));
  assert.equal(clientPortalContract.program.program_id, "RP19");
});

test("CP00-583 plan binding covers the planned 150 RP19 scope and model foundation units", () => {
  const coverage = validateClientPortalCoreCp583Coverage(cp583PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.pack_id, "CP00-583");
  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.range, "RP19.P00.M00.S01-RP19.P01.M05.S20");
  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.upstream_pack_id, "CP00-582");
  assert.equal(CLIENT_PORTAL_CORE_CP583_PACK_BINDING.next_pack_id, "CP00-584");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP19.P00"], 71);
  assert.equal(coverage.summary.by_phase["RP19.P01"], 79);
  assert.equal(Object.keys(CLIENT_PORTAL_CORE_CP583_REQUIREMENTS.required_section_rows).length, 17);
});

test("CP00-583 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp583ScopeContractFoundationCaseSet();
  const descriptor = createClientPortalCoreCp583ScopeContractFoundationDescriptor();
  const validation = validateClientPortalCoreCp583ScopeContractFoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 17);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP583_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP19.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.client_portal_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP19.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-583 evidence packets and handoff preserve client portal bootstrap authority boundaries", () => {
  const descriptor = createClientPortalCoreCp583ScopeContractFoundationDescriptor();
  const hermes = createClientPortalCoreCp583HermesEvidencePacket(cp583PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp583ClaudeReviewPacket(cp583PlanPack);
  const handoff = createClientPortalCoreCp583CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-583-to-CP00-584");
  assert.equal(handoff.next_subphase_id, "RP19.P01.M06.S01");
  assert.equal(handoff.production_ready_flag, "client_portal_core_scope_contract_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP583_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-584 plan binding covers the planned 150 RP19 p01 closeout p02 foundation units", () => {
  const coverage = validateClientPortalCoreCp584Coverage(cp584PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.pack_id, "CP00-584");
  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.range, "RP19.P01.M06.S01-RP19.P02.M04.S06");
  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.upstream_pack_id, "CP00-583");
  assert.equal(CLIENT_PORTAL_CORE_CP584_PACK_BINDING.next_pack_id, "CP00-585");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P01.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P01.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P01.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P01.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M04"], 6);
});

test("CP00-584 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp584P01CloseoutP02FoundationCaseSet();
  const descriptor = createClientPortalCoreCp584P01CloseoutP02FoundationDescriptor();
  const validation = validateClientPortalCoreCp584P01CloseoutP02FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP584_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-584 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp584P01CloseoutP02FoundationDescriptor();
  const hermes = createClientPortalCoreCp584HermesEvidencePacket(cp584PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp584ClaudeReviewPacket(cp584PlanPack);
  const handoff = createClientPortalCoreCp584CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-584-to-CP00-585");
  assert.equal(handoff.next_subphase_id, "RP19.P02.M04.S07");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP584_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-585 plan binding covers the planned 40 RP19 p02 workflow permission slice units", () => {
  const coverage = validateClientPortalCoreCp585Coverage(cp585PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.pack_id, "CP00-585");
  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.risk_class, "B");
  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.unit_count, 40);
  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.range, "RP19.P02.M04.S07-RP19.P02.M06.S02");
  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.upstream_pack_id, "CP00-584");
  assert.equal(CLIENT_PORTAL_CORE_CP585_PACK_BINDING.next_pack_id, "CP00-586");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M04"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M06"], 2);
});

test("CP00-585 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp585P02WorkflowPermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP585_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-585 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp585P02WorkflowPermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp585HermesEvidencePacket(cp585PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp585ClaudeReviewPacket(cp585PlanPack);
  const handoff = createClientPortalCoreCp585CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-585-to-CP00-586");
  assert.equal(handoff.next_subphase_id, "RP19.P02.M06.S03");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP585_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-586 plan binding covers the planned 10 RP19 p02 fixture slice units", () => {
  const coverage = validateClientPortalCoreCp586Coverage(cp586PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.pack_id, "CP00-586");
  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.range, "RP19.P02.M06.S03-RP19.P02.M06.S12");
  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.upstream_pack_id, "CP00-585");
  assert.equal(CLIENT_PORTAL_CORE_CP586_PACK_BINDING.next_pack_id, "CP00-587");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M06"], 10);
});

test("CP00-586 p02 fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp586P02FixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp586P02FixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp586P02FixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP586_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-586 evidence packets and handoff preserve p02 fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp586P02FixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp586HermesEvidencePacket(cp586PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp586ClaudeReviewPacket(cp586PlanPack);
  const handoff = createClientPortalCoreCp586CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-586-to-CP00-587");
  assert.equal(handoff.next_subphase_id, "RP19.P02.M06.S13");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p02_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP586_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-587 plan binding covers the planned 150 RP19 p02 closeout p03 foundation units", () => {
  const coverage = validateClientPortalCoreCp587Coverage(cp587PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.pack_id, "CP00-587");
  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.range, "RP19.P02.M06.S13-RP19.P03.M05.S06");
  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.upstream_pack_id, "CP00-586");
  assert.equal(CLIENT_PORTAL_CORE_CP587_PACK_BINDING.next_pack_id, "CP00-588");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P02.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M00"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M05"], 6);
});

test("CP00-587 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp587P02CloseoutP03FoundationCaseSet();
  const descriptor = createClientPortalCoreCp587P02CloseoutP03FoundationDescriptor();
  const validation = validateClientPortalCoreCp587P02CloseoutP03FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP587_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-587 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp587P02CloseoutP03FoundationDescriptor();
  const hermes = createClientPortalCoreCp587HermesEvidencePacket(cp587PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp587ClaudeReviewPacket(cp587PlanPack);
  const handoff = createClientPortalCoreCp587CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-587-to-CP00-588");
  assert.equal(handoff.next_subphase_id, "RP19.P03.M05.S07");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP587_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-588 plan binding covers the planned 10 RP19 p03 permission slice units", () => {
  const coverage = validateClientPortalCoreCp588Coverage(cp588PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.pack_id, "CP00-588");
  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.range, "RP19.P03.M05.S07-RP19.P03.M05.S16");
  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.upstream_pack_id, "CP00-587");
  assert.equal(CLIENT_PORTAL_CORE_CP588_PACK_BINDING.next_pack_id, "CP00-589");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M05"], 10);
});

test("CP00-588 p03 permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp588P03PermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp588P03PermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp588P03PermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP588_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-588 evidence packets and handoff preserve p03 permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp588P03PermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp588HermesEvidencePacket(cp588PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp588ClaudeReviewPacket(cp588PlanPack);
  const handoff = createClientPortalCoreCp588CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-588-to-CP00-589");
  assert.equal(handoff.next_subphase_id, "RP19.P03.M05.S17");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p03_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP588_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-589 plan binding covers the planned 10 RP19 p03 permission fixture slice units", () => {
  const coverage = validateClientPortalCoreCp589Coverage(cp589PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.pack_id, "CP00-589");
  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.range, "RP19.P03.M05.S17-RP19.P03.M06.S06");
  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.upstream_pack_id, "CP00-588");
  assert.equal(CLIENT_PORTAL_CORE_CP589_PACK_BINDING.next_pack_id, "CP00-590");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M06"], 6);
});

test("CP00-589 p03 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp589P03PermissionFixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp589P03PermissionFixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp589P03PermissionFixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP589_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-589 evidence packets and handoff preserve p03 permission fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp589P03PermissionFixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp589HermesEvidencePacket(cp589PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp589ClaudeReviewPacket(cp589PlanPack);
  const handoff = createClientPortalCoreCp589CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-589-to-CP00-590");
  assert.equal(handoff.next_subphase_id, "RP19.P03.M06.S07");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p03_permission_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP589_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-590 plan binding covers the planned 150 RP19 p03 closeout p04 foundation units", () => {
  const coverage = validateClientPortalCoreCp590Coverage(cp590PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.pack_id, "CP00-590");
  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.range, "RP19.P03.M06.S07-RP19.P04.M05.S07");
  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.upstream_pack_id, "CP00-589");
  assert.equal(CLIENT_PORTAL_CORE_CP590_PACK_BINDING.next_pack_id, "CP00-591");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P03.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M05"], 7);
});

test("CP00-590 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp590P03CloseoutP04FoundationCaseSet();
  const descriptor = createClientPortalCoreCp590P03CloseoutP04FoundationDescriptor();
  const validation = validateClientPortalCoreCp590P03CloseoutP04FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP590_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-590 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp590P03CloseoutP04FoundationDescriptor();
  const hermes = createClientPortalCoreCp590HermesEvidencePacket(cp590PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp590ClaudeReviewPacket(cp590PlanPack);
  const handoff = createClientPortalCoreCp590CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-590-to-CP00-591");
  assert.equal(handoff.next_subphase_id, "RP19.P04.M05.S08");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP590_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-591 plan binding covers the planned 10 RP19 p04 permission slice units", () => {
  const coverage = validateClientPortalCoreCp591Coverage(cp591PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.pack_id, "CP00-591");
  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.range, "RP19.P04.M05.S08-RP19.P04.M05.S17");
  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.upstream_pack_id, "CP00-590");
  assert.equal(CLIENT_PORTAL_CORE_CP591_PACK_BINDING.next_pack_id, "CP00-592");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M05"], 10);
});

test("CP00-591 p04 permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp591P04PermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp591P04PermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp591P04PermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP591_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-591 evidence packets and handoff preserve p04 permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp591P04PermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp591HermesEvidencePacket(cp591PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp591ClaudeReviewPacket(cp591PlanPack);
  const handoff = createClientPortalCoreCp591CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-591-to-CP00-592");
  assert.equal(handoff.next_subphase_id, "RP19.P04.M05.S18");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p04_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP591_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-592 plan binding covers the planned 10 RP19 p04 permission fixture slice units", () => {
  const coverage = validateClientPortalCoreCp592Coverage(cp592PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.pack_id, "CP00-592");
  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.range, "RP19.P04.M05.S18-RP19.P04.M06.S05");
  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.upstream_pack_id, "CP00-591");
  assert.equal(CLIENT_PORTAL_CORE_CP592_PACK_BINDING.next_pack_id, "CP00-593");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M06"], 5);
});

test("CP00-592 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp592P04PermissionFixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp592P04PermissionFixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp592P04PermissionFixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP592_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-592 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp592P04PermissionFixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp592HermesEvidencePacket(cp592PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp592ClaudeReviewPacket(cp592PlanPack);
  const handoff = createClientPortalCoreCp592CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-592-to-CP00-593");
  assert.equal(handoff.next_subphase_id, "RP19.P04.M06.S06");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP592_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-593 plan binding covers the planned 150 RP19 p04 closeout p05 foundation units", () => {
  const coverage = validateClientPortalCoreCp593Coverage(cp593PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.pack_id, "CP00-593");
  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.range, "RP19.P04.M06.S06-RP19.P05.M04.S07");
  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.upstream_pack_id, "CP00-592");
  assert.equal(CLIENT_PORTAL_CORE_CP593_PACK_BINDING.next_pack_id, "CP00-594");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M06"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P04.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M04"], 7);
});

test("CP00-593 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp593P04CloseoutP05FoundationCaseSet();
  const descriptor = createClientPortalCoreCp593P04CloseoutP05FoundationDescriptor();
  const validation = validateClientPortalCoreCp593P04CloseoutP05FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP593_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-593 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp593P04CloseoutP05FoundationDescriptor();
  const hermes = createClientPortalCoreCp593HermesEvidencePacket(cp593PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp593ClaudeReviewPacket(cp593PlanPack);
  const handoff = createClientPortalCoreCp593CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-593-to-CP00-594");
  assert.equal(handoff.next_subphase_id, "RP19.P05.M04.S08");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP593_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-594 plan binding covers the planned 40 RP19 p05 workflow permission slice units", () => {
  const coverage = validateClientPortalCoreCp594Coverage(cp594PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.pack_id, "CP00-594");
  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.risk_class, "B");
  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.unit_count, 40);
  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.range, "RP19.P05.M04.S08-RP19.P05.M06.S05");
  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.upstream_pack_id, "CP00-593");
  assert.equal(CLIENT_PORTAL_CORE_CP594_PACK_BINDING.next_pack_id, "CP00-595");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M04"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M06"], 5);
});

test("CP00-594 p05 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp594P05WorkflowPermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP594_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-594 evidence packets and handoff preserve p05 workflow permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp594P05WorkflowPermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp594HermesEvidencePacket(cp594PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp594ClaudeReviewPacket(cp594PlanPack);
  const handoff = createClientPortalCoreCp594CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-594-to-CP00-595");
  assert.equal(handoff.next_subphase_id, "RP19.P05.M06.S06");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p05_workflow_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP594_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-595 plan binding covers the planned 150 RP19 p05 closeout p06 foundation units", () => {
  const coverage = validateClientPortalCoreCp595Coverage(cp595PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.pack_id, "CP00-595");
  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.range, "RP19.P05.M06.S06-RP19.P06.M03.S14");
  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.upstream_pack_id, "CP00-594");
  assert.equal(CLIENT_PORTAL_CORE_CP595_PACK_BINDING.next_pack_id, "CP00-596");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M06"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P05.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M03"], 14);
});

test("CP00-595 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp595P05CloseoutP06FoundationCaseSet();
  const descriptor = createClientPortalCoreCp595P05CloseoutP06FoundationDescriptor();
  const validation = validateClientPortalCoreCp595P05CloseoutP06FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP595_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-595 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp595P05CloseoutP06FoundationDescriptor();
  const hermes = createClientPortalCoreCp595HermesEvidencePacket(cp595PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp595ClaudeReviewPacket(cp595PlanPack);
  const handoff = createClientPortalCoreCp595CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-595-to-CP00-596");
  assert.equal(handoff.next_subphase_id, "RP19.P06.M03.S15");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP595_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-596 plan binding covers the planned 10 RP19 p06 implementation slice units", () => {
  const coverage = validateClientPortalCoreCp596Coverage(cp596PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.pack_id, "CP00-596");
  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.range, "RP19.P06.M03.S15-RP19.P06.M04.S02");
  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.upstream_pack_id, "CP00-595");
  assert.equal(CLIENT_PORTAL_CORE_CP596_PACK_BINDING.next_pack_id, "CP00-597");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M04"], 2);
});

test("CP00-596 p06 implementation slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp596P06ImplementationSliceCaseSet();
  const descriptor = createClientPortalCoreCp596P06ImplementationSliceDescriptor();
  const validation = validateClientPortalCoreCp596P06ImplementationSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP596_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-596 evidence packets and handoff preserve p06 implementation slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp596P06ImplementationSliceDescriptor();
  const hermes = createClientPortalCoreCp596HermesEvidencePacket(cp596PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp596ClaudeReviewPacket(cp596PlanPack);
  const handoff = createClientPortalCoreCp596CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-596-to-CP00-597");
  assert.equal(handoff.next_subphase_id, "RP19.P06.M04.S03");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p06_implementation_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP596_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-597 plan binding covers the planned 40 RP19 p06 workflow permission slice units", () => {
  const coverage = validateClientPortalCoreCp597Coverage(cp597PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.pack_id, "CP00-597");
  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.risk_class, "B");
  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.unit_count, 40);
  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.range, "RP19.P06.M04.S03-RP19.P06.M05.S20");
  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.upstream_pack_id, "CP00-596");
  assert.equal(CLIENT_PORTAL_CORE_CP597_PACK_BINDING.next_pack_id, "CP00-598");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M05"], 20);
});

test("CP00-597 p06 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp597P06WorkflowPermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP597_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-597 evidence packets and handoff preserve p06 workflow permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp597P06WorkflowPermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp597HermesEvidencePacket(cp597PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp597ClaudeReviewPacket(cp597PlanPack);
  const handoff = createClientPortalCoreCp597CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-597-to-CP00-598");
  assert.equal(handoff.next_subphase_id, "RP19.P06.M05.S21");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p06_workflow_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP597_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-598 plan binding covers the planned 10 RP19 p06 permission fixture slice units", () => {
  const coverage = validateClientPortalCoreCp598Coverage(cp598PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.pack_id, "CP00-598");
  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.range, "RP19.P06.M05.S21-RP19.P06.M06.S08");
  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.upstream_pack_id, "CP00-597");
  assert.equal(CLIENT_PORTAL_CORE_CP598_PACK_BINDING.next_pack_id, "CP00-599");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M06"], 8);
});

test("CP00-598 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp598P06PermissionFixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp598P06PermissionFixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp598P06PermissionFixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP598_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-598 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp598P06PermissionFixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp598HermesEvidencePacket(cp598PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp598ClaudeReviewPacket(cp598PlanPack);
  const handoff = createClientPortalCoreCp598CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-598-to-CP00-599");
  assert.equal(handoff.next_subphase_id, "RP19.P06.M06.S09");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP598_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-599 plan binding covers the planned 150 RP19 p06 closeout p07 foundation units", () => {
  const coverage = validateClientPortalCoreCp599Coverage(cp599PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.pack_id, "CP00-599");
  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.range, "RP19.P06.M06.S09-RP19.P07.M03.S10");
  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.upstream_pack_id, "CP00-598");
  assert.equal(CLIENT_PORTAL_CORE_CP599_PACK_BINDING.next_pack_id, "CP00-600");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P06.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M03"], 10);
});

test("CP00-599 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp599P06CloseoutP07FoundationCaseSet();
  const descriptor = createClientPortalCoreCp599P06CloseoutP07FoundationDescriptor();
  const validation = validateClientPortalCoreCp599P06CloseoutP07FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP599_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-599 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp599P06CloseoutP07FoundationDescriptor();
  const hermes = createClientPortalCoreCp599HermesEvidencePacket(cp599PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp599ClaudeReviewPacket(cp599PlanPack);
  const handoff = createClientPortalCoreCp599CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-599-to-CP00-600");
  assert.equal(handoff.next_subphase_id, "RP19.P07.M03.S11");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP599_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-600 plan binding covers the planned 10 RP19 p07 implementation slice units", () => {
  const coverage = validateClientPortalCoreCp600Coverage(cp600PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.pack_id, "CP00-600");
  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.range, "RP19.P07.M03.S11-RP19.P07.M03.S20");
  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.upstream_pack_id, "CP00-599");
  assert.equal(CLIENT_PORTAL_CORE_CP600_PACK_BINDING.next_pack_id, "CP00-601");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M03"], 10);
});

test("CP00-600 p07 implementation slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp600P07ImplementationSliceCaseSet();
  const descriptor = createClientPortalCoreCp600P07ImplementationSliceDescriptor();
  const validation = validateClientPortalCoreCp600P07ImplementationSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP600_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-600 evidence packets and handoff preserve p07 implementation slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp600P07ImplementationSliceDescriptor();
  const hermes = createClientPortalCoreCp600HermesEvidencePacket(cp600PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp600ClaudeReviewPacket(cp600PlanPack);
  const handoff = createClientPortalCoreCp600CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-600-to-CP00-601");
  assert.equal(handoff.next_subphase_id, "RP19.P07.M03.S21");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p07_implementation_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP600_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-601 plan binding covers the planned 40 RP19 p07 workflow permission slice units", () => {
  const coverage = validateClientPortalCoreCp601Coverage(cp601PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.pack_id, "CP00-601");
  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.risk_class, "B");
  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.unit_count, 40);
  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.range, "RP19.P07.M03.S21-RP19.P07.M05.S16");
  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.upstream_pack_id, "CP00-600");
  assert.equal(CLIENT_PORTAL_CORE_CP601_PACK_BINDING.next_pack_id, "CP00-602");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M03"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M05"], 16);
});

test("CP00-601 p07 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp601P07WorkflowPermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP601_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-601 evidence packets and handoff preserve p07 workflow permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp601P07WorkflowPermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp601HermesEvidencePacket(cp601PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp601ClaudeReviewPacket(cp601PlanPack);
  const handoff = createClientPortalCoreCp601CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-601-to-CP00-602");
  assert.equal(handoff.next_subphase_id, "RP19.P07.M05.S17");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p07_workflow_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP601_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-602 plan binding covers the planned 10 RP19 p07 permission fixture slice units", () => {
  const coverage = validateClientPortalCoreCp602Coverage(cp602PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.pack_id, "CP00-602");
  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.range, "RP19.P07.M05.S17-RP19.P07.M06.S04");
  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.upstream_pack_id, "CP00-601");
  assert.equal(CLIENT_PORTAL_CORE_CP602_PACK_BINDING.next_pack_id, "CP00-603");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M06"], 4);
});

test("CP00-602 p07 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp602P07PermissionFixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp602P07PermissionFixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp602P07PermissionFixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP602_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-602 evidence packets and handoff preserve p07 permission fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp602P07PermissionFixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp602HermesEvidencePacket(cp602PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp602ClaudeReviewPacket(cp602PlanPack);
  const handoff = createClientPortalCoreCp602CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-602-to-CP00-603");
  assert.equal(handoff.next_subphase_id, "RP19.P07.M06.S05");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p07_permission_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP602_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-603 plan binding covers the planned 150 RP19 p07 closeout p08 foundation units", () => {
  const coverage = validateClientPortalCoreCp603Coverage(cp603PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.pack_id, "CP00-603");
  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.range, "RP19.P07.M06.S05-RP19.P08.M03.S21");
  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.upstream_pack_id, "CP00-602");
  assert.equal(CLIENT_PORTAL_CORE_CP603_PACK_BINDING.next_pack_id, "CP00-604");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M06"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P07.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M03"], 21);
});

test("CP00-603 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp603P07CloseoutP08FoundationCaseSet();
  const descriptor = createClientPortalCoreCp603P07CloseoutP08FoundationDescriptor();
  const validation = validateClientPortalCoreCp603P07CloseoutP08FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP603_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-603 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp603P07CloseoutP08FoundationDescriptor();
  const hermes = createClientPortalCoreCp603HermesEvidencePacket(cp603PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp603ClaudeReviewPacket(cp603PlanPack);
  const handoff = createClientPortalCoreCp603CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-603-to-CP00-604");
  assert.equal(handoff.next_subphase_id, "RP19.P08.M03.S22");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP603_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-604 plan binding covers the planned 40 RP19 p08 workflow permission slice units", () => {
  const coverage = validateClientPortalCoreCp604Coverage(cp604PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.pack_id, "CP00-604");
  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.risk_class, "B");
  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.unit_count, 40);
  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.range, "RP19.P08.M03.S22-RP19.P08.M05.S19");
  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.upstream_pack_id, "CP00-603");
  assert.equal(CLIENT_PORTAL_CORE_CP604_PACK_BINDING.next_pack_id, "CP00-605");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M03"], 1);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M05"], 19);
});

test("CP00-604 p08 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp604P08WorkflowPermissionSliceCaseSet();
  const descriptor = createClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor();
  const validation = validateClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP604_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-604 evidence packets and handoff preserve p08 workflow permission slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp604P08WorkflowPermissionSliceDescriptor();
  const hermes = createClientPortalCoreCp604HermesEvidencePacket(cp604PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp604ClaudeReviewPacket(cp604PlanPack);
  const handoff = createClientPortalCoreCp604CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-604-to-CP00-605");
  assert.equal(handoff.next_subphase_id, "RP19.P08.M05.S20");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p08_workflow_permission_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP604_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-605 plan binding covers the planned 10 RP19 p08 permission fixture slice units", () => {
  const coverage = validateClientPortalCoreCp605Coverage(cp605PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.pack_id, "CP00-605");
  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.range, "RP19.P08.M05.S20-RP19.P08.M06.S07");
  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.upstream_pack_id, "CP00-604");
  assert.equal(CLIENT_PORTAL_CORE_CP605_PACK_BINDING.next_pack_id, "CP00-606");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M05"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M06"], 7);
});

test("CP00-605 p08 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp605P08PermissionFixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp605P08PermissionFixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp605P08PermissionFixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP605_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-605 evidence packets and handoff preserve p08 permission fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp605P08PermissionFixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp605HermesEvidencePacket(cp605PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp605ClaudeReviewPacket(cp605PlanPack);
  const handoff = createClientPortalCoreCp605CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-605-to-CP00-606");
  assert.equal(handoff.next_subphase_id, "RP19.P08.M06.S08");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p08_permission_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP605_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-606 plan binding covers the planned 10 RP19 p08 fixture slice units", () => {
  const coverage = validateClientPortalCoreCp606Coverage(cp606PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.pack_id, "CP00-606");
  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.range, "RP19.P08.M06.S08-RP19.P08.M06.S17");
  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.upstream_pack_id, "CP00-605");
  assert.equal(CLIENT_PORTAL_CORE_CP606_PACK_BINDING.next_pack_id, "CP00-607");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M06"], 10);
});

test("CP00-606 p08 fixture slice rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp606P08FixtureSliceCaseSet();
  const descriptor = createClientPortalCoreCp606P08FixtureSliceDescriptor();
  const validation = validateClientPortalCoreCp606P08FixtureSliceDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP606_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-606 evidence packets and handoff preserve p08 fixture slice authority boundaries", () => {
  const descriptor = createClientPortalCoreCp606P08FixtureSliceDescriptor();
  const hermes = createClientPortalCoreCp606HermesEvidencePacket(cp606PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp606ClaudeReviewPacket(cp606PlanPack);
  const handoff = createClientPortalCoreCp606CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-606-to-CP00-607");
  assert.equal(handoff.next_subphase_id, "RP19.P08.M06.S18");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p08_fixture_slice_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP606_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-607 plan binding covers the planned 150 RP19 p08 closeout p09 foundation units", () => {
  const coverage = validateClientPortalCoreCp607Coverage(cp607PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.pack_id, "CP00-607");
  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.unit_count, 150);
  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.range, "RP19.P08.M06.S18-RP19.P09.M05.S17");
  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.upstream_pack_id, "CP00-606");
  assert.equal(CLIENT_PORTAL_CORE_CP607_PACK_BINDING.next_pack_id, "CP00-608");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M06"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P08.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M00"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M05"], 17);
});

test("CP00-607 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp607P08CloseoutP09FoundationCaseSet();
  const descriptor = createClientPortalCoreCp607P08CloseoutP09FoundationDescriptor();
  const validation = validateClientPortalCoreCp607P08CloseoutP09FoundationDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP607_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-607 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createClientPortalCoreCp607P08CloseoutP09FoundationDescriptor();
  const hermes = createClientPortalCoreCp607HermesEvidencePacket(cp607PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp607ClaudeReviewPacket(cp607PlanPack);
  const handoff = createClientPortalCoreCp607CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-607-to-CP00-608");
  assert.equal(handoff.next_subphase_id, "RP19.P09.M05.S18");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP607_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-608 plan binding covers the planned 10 RP19 p09 permission audit fixture bridge units", () => {
  const coverage = validateClientPortalCoreCp608Coverage(cp608PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.pack_id, "CP00-608");
  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.risk_class, "A");
  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.unit_count, 10);
  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.range, "RP19.P09.M05.S18-RP19.P09.M06.S07");
  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.upstream_pack_id, "CP00-607");
  assert.equal(CLIENT_PORTAL_CORE_CP608_PACK_BINDING.next_pack_id, "CP00-609");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M05"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M06"], 7);
  assert.equal(coverage.summary.by_deliverable.implementation, 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
});

test("CP00-608 p09 permission audit fixture bridge rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp608P09PermissionAuditFixtureBridgeCaseSet();
  const descriptor = createClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor();
  const validation = validateClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP608_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-608 evidence packets and handoff preserve p09 permission audit fixture bridge authority boundaries", () => {
  const descriptor = createClientPortalCoreCp608P09PermissionAuditFixtureBridgeDescriptor();
  const hermes = createClientPortalCoreCp608HermesEvidencePacket(cp608PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp608ClaudeReviewPacket(cp608PlanPack);
  const handoff = createClientPortalCoreCp608CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-608-to-CP00-609");
  assert.equal(handoff.next_subphase_id, "RP19.P09.M06.S08");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p09_permission_audit_fixture_bridge_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP608_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-609 plan binding covers the planned 65 RP19 p09 review evidence closeout bridge units", () => {
  const coverage = validateClientPortalCoreCp609Coverage(cp609PlanPack);

  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.pack_id, "CP00-609");
  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.risk_class, "C");
  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.unit_count, 65);
  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.range, "RP19.P09.M06.S08-RP19.P09.M10.S04");
  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.upstream_pack_id, "CP00-608");
  assert.equal(CLIENT_PORTAL_CORE_CP609_PACK_BINDING.next_pack_id, "CP00-610");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 65);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M06"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP19.P09.M10"], 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 40);
  assert.equal(coverage.summary.by_deliverable.claude_review, 11);
});

test("CP00-609 p09 review evidence closeout bridge rows stay descriptor-only", () => {
  const caseSet = createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeCaseSet();
  const descriptor = createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor();
  const validation = validateClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor(descriptor, clientPortalContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(CLIENT_PORTAL_CORE_CP609_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[clientPortalCoreRowKey(title)];
      assert.ok(row, "missing row " + title + " in " + microId);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-609 evidence packets and handoff preserve p09 review evidence closeout bridge authority boundaries", () => {
  const descriptor = createClientPortalCoreCp609P09ReviewEvidenceCloseoutBridgeDescriptor();
  const hermes = createClientPortalCoreCp609HermesEvidencePacket(cp609PlanPack, clientPortalContract, descriptor);
  const claude = createClientPortalCoreCp609ClaudeReviewPacket(cp609PlanPack);
  const handoff = createClientPortalCoreCp609CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H19");
  assert.equal(claude.gate, "C19");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-609-to-CP00-610");
  assert.equal(handoff.next_subphase_id, "RP20.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "client_portal_core_p09_review_evidence_closeout_bridge_descriptor_verified");
  assert.equal(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(CLIENT_PORTAL_CORE_CP609_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
