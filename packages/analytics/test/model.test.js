import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const analyticsContract = JSON.parse(
  readFileSync(new URL("../../../contracts/analytics-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp453ManifestPath = new URL("../../../docs/closeout-packs/cp00-453/manifest.json", import.meta.url);
const cp453Manifest = existsSync(cp453ManifestPath) ? JSON.parse(readFileSync(cp453ManifestPath, "utf8")) : null;
const cp453PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-453") ?? cp453Manifest?.plan_binding_snapshot;
const cp454ManifestPath = new URL("../../../docs/closeout-packs/cp00-454/manifest.json", import.meta.url);
const cp454Manifest = existsSync(cp454ManifestPath) ? JSON.parse(readFileSync(cp454ManifestPath, "utf8")) : null;
const cp454PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-454") ?? cp454Manifest?.plan_binding_snapshot;
const cp455ManifestPath = new URL("../../../docs/closeout-packs/cp00-455/manifest.json", import.meta.url);
const cp455Manifest = existsSync(cp455ManifestPath) ? JSON.parse(readFileSync(cp455ManifestPath, "utf8")) : null;
const cp455PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-455") ?? cp455Manifest?.plan_binding_snapshot;
const cp456ManifestPath = new URL("../../../docs/closeout-packs/cp00-456/manifest.json", import.meta.url);
const cp456Manifest = existsSync(cp456ManifestPath) ? JSON.parse(readFileSync(cp456ManifestPath, "utf8")) : null;
const cp456PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-456") ?? cp456Manifest?.plan_binding_snapshot;
const cp457ManifestPath = new URL("../../../docs/closeout-packs/cp00-457/manifest.json", import.meta.url);
const cp457Manifest = existsSync(cp457ManifestPath) ? JSON.parse(readFileSync(cp457ManifestPath, "utf8")) : null;
const cp457PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-457") ?? cp457Manifest?.plan_binding_snapshot;
const cp458ManifestPath = new URL("../../../docs/closeout-packs/cp00-458/manifest.json", import.meta.url);
const cp458Manifest = existsSync(cp458ManifestPath) ? JSON.parse(readFileSync(cp458ManifestPath, "utf8")) : null;
const cp458PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-458") ?? cp458Manifest?.plan_binding_snapshot;
const cp459ManifestPath = new URL("../../../docs/closeout-packs/cp00-459/manifest.json", import.meta.url);
const cp459Manifest = existsSync(cp459ManifestPath) ? JSON.parse(readFileSync(cp459ManifestPath, "utf8")) : null;
const cp459PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-459") ?? cp459Manifest?.plan_binding_snapshot;
const cp460ManifestPath = new URL("../../../docs/closeout-packs/cp00-460/manifest.json", import.meta.url);
const cp460Manifest = existsSync(cp460ManifestPath) ? JSON.parse(readFileSync(cp460ManifestPath, "utf8")) : null;
const cp460PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-460") ?? cp460Manifest?.plan_binding_snapshot;
const cp461ManifestPath = new URL("../../../docs/closeout-packs/cp00-461/manifest.json", import.meta.url);
const cp461Manifest = existsSync(cp461ManifestPath) ? JSON.parse(readFileSync(cp461ManifestPath, "utf8")) : null;
const cp461PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-461") ?? cp461Manifest?.plan_binding_snapshot;
const cp462ManifestPath = new URL("../../../docs/closeout-packs/cp00-462/manifest.json", import.meta.url);
const cp462Manifest = existsSync(cp462ManifestPath) ? JSON.parse(readFileSync(cp462ManifestPath, "utf8")) : null;
const cp462PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-462") ?? cp462Manifest?.plan_binding_snapshot;
const cp463ManifestPath = new URL("../../../docs/closeout-packs/cp00-463/manifest.json", import.meta.url);
const cp463Manifest = existsSync(cp463ManifestPath) ? JSON.parse(readFileSync(cp463ManifestPath, "utf8")) : null;
const cp463PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-463") ?? cp463Manifest?.plan_binding_snapshot;
const cp464ManifestPath = new URL("../../../docs/closeout-packs/cp00-464/manifest.json", import.meta.url);
const cp464Manifest = existsSync(cp464ManifestPath) ? JSON.parse(readFileSync(cp464ManifestPath, "utf8")) : null;
const cp464PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-464") ?? cp464Manifest?.plan_binding_snapshot;
const cp465ManifestPath = new URL("../../../docs/closeout-packs/cp00-465/manifest.json", import.meta.url);
const cp465Manifest = existsSync(cp465ManifestPath) ? JSON.parse(readFileSync(cp465ManifestPath, "utf8")) : null;
const cp465PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-465") ?? cp465Manifest?.plan_binding_snapshot;
const cp466ManifestPath = new URL("../../../docs/closeout-packs/cp00-466/manifest.json", import.meta.url);
const cp466Manifest = existsSync(cp466ManifestPath) ? JSON.parse(readFileSync(cp466ManifestPath, "utf8")) : null;
const cp466PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-466") ?? cp466Manifest?.plan_binding_snapshot;
const cp467ManifestPath = new URL("../../../docs/closeout-packs/cp00-467/manifest.json", import.meta.url);
const cp467Manifest = existsSync(cp467ManifestPath) ? JSON.parse(readFileSync(cp467ManifestPath, "utf8")) : null;
const cp467PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-467") ?? cp467Manifest?.plan_binding_snapshot;
const cp468ManifestPath = new URL("../../../docs/closeout-packs/cp00-468/manifest.json", import.meta.url);
const cp468Manifest = existsSync(cp468ManifestPath) ? JSON.parse(readFileSync(cp468ManifestPath, "utf8")) : null;
const cp468PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-468") ?? cp468Manifest?.plan_binding_snapshot;
const cp469ManifestPath = new URL("../../../docs/closeout-packs/cp00-469/manifest.json", import.meta.url);
const cp469Manifest = existsSync(cp469ManifestPath) ? JSON.parse(readFileSync(cp469ManifestPath, "utf8")) : null;
const cp469PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-469") ?? cp469Manifest?.plan_binding_snapshot;
const cp470ManifestPath = new URL("../../../docs/closeout-packs/cp00-470/manifest.json", import.meta.url);
const cp470Manifest = existsSync(cp470ManifestPath) ? JSON.parse(readFileSync(cp470ManifestPath, "utf8")) : null;
const cp470PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-470") ?? cp470Manifest?.plan_binding_snapshot;
const cp471ManifestPath = new URL("../../../docs/closeout-packs/cp00-471/manifest.json", import.meta.url);
const cp471Manifest = existsSync(cp471ManifestPath) ? JSON.parse(readFileSync(cp471ManifestPath, "utf8")) : null;
const cp471PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-471") ?? cp471Manifest?.plan_binding_snapshot;
const cp472ManifestPath = new URL("../../../docs/closeout-packs/cp00-472/manifest.json", import.meta.url);
const cp472Manifest = existsSync(cp472ManifestPath) ? JSON.parse(readFileSync(cp472ManifestPath, "utf8")) : null;
const cp472PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-472") ?? cp472Manifest?.plan_binding_snapshot;
const cp473ManifestPath = new URL("../../../docs/closeout-packs/cp00-473/manifest.json", import.meta.url);
const cp473Manifest = existsSync(cp473ManifestPath) ? JSON.parse(readFileSync(cp473ManifestPath, "utf8")) : null;
const cp473PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-473") ?? cp473Manifest?.plan_binding_snapshot;
const cp474ManifestPath = new URL("../../../docs/closeout-packs/cp00-474/manifest.json", import.meta.url);
const cp474Manifest = existsSync(cp474ManifestPath) ? JSON.parse(readFileSync(cp474ManifestPath, "utf8")) : null;
const cp474PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-474") ?? cp474Manifest?.plan_binding_snapshot;
const cp475ManifestPath = new URL("../../../docs/closeout-packs/cp00-475/manifest.json", import.meta.url);
const cp475Manifest = existsSync(cp475ManifestPath) ? JSON.parse(readFileSync(cp475ManifestPath, "utf8")) : null;
const cp475PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-475") ?? cp475Manifest?.plan_binding_snapshot;
const cp476ManifestPath = new URL("../../../docs/closeout-packs/cp00-476/manifest.json", import.meta.url);
const cp476Manifest = existsSync(cp476ManifestPath) ? JSON.parse(readFileSync(cp476ManifestPath, "utf8")) : null;
const cp476PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-476") ?? cp476Manifest?.plan_binding_snapshot;
const cp477ManifestPath = new URL("../../../docs/closeout-packs/cp00-477/manifest.json", import.meta.url);
const cp477Manifest = existsSync(cp477ManifestPath) ? JSON.parse(readFileSync(cp477ManifestPath, "utf8")) : null;
const cp477PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-477") ?? cp477Manifest?.plan_binding_snapshot;
const cp478ManifestPath = new URL("../../../docs/closeout-packs/cp00-478/manifest.json", import.meta.url);
const cp478Manifest = existsSync(cp478ManifestPath) ? JSON.parse(readFileSync(cp478ManifestPath, "utf8")) : null;
const cp478PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-478") ?? cp478Manifest?.plan_binding_snapshot;
const cp479ManifestPath = new URL("../../../docs/closeout-packs/cp00-479/manifest.json", import.meta.url);
const cp479Manifest = existsSync(cp479ManifestPath) ? JSON.parse(readFileSync(cp479ManifestPath, "utf8")) : null;
const cp479PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-479") ?? cp479Manifest?.plan_binding_snapshot;

test("RP15 program contract pins the Analytics descriptor-only bootstrap", () => {
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.program_id, "RP15");
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.program_title, "Firm Analytics");
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP14");
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.hermes_gate, "H15");
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.claude_gate, "C15");
  assert.equal(ANALYTICS_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-453", "CP00-454", "CP00-455", "CP00-456", "CP00-457", "CP00-458", "CP00-459", "CP00-460", "CP00-461", "CP00-462", "CP00-463", "CP00-464", "CP00-465", "CP00-466", "CP00-467", "CP00-468", "CP00-469", "CP00-470", "CP00-471", "CP00-472", "CP00-473", "CP00-474", "CP00-475", "CP00-476", "CP00-477", "CP00-478", "CP00-479"].includes(analyticsContract.current_pack.pack_id));
  assert.equal(analyticsContract.program.program_id, "RP15");
});

test("CP00-453 plan binding covers the planned 150 RP15 scope and model foundation units", () => {
  const coverage = validateAnalyticsCoreCp453Coverage(cp453PlanPack);

  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.pack_id, "CP00-453");
  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.range, "RP15.P00.M00.S01-RP15.P01.M05.S20");
  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.upstream_pack_id, "CP00-452");
  assert.equal(ANALYTICS_CORE_CP453_PACK_BINDING.next_pack_id, "CP00-454");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP15.P00"], 71);
  assert.equal(coverage.summary.by_phase["RP15.P01"], 79);
  assert.equal(Object.keys(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows).length, 17);
});

test("CP00-453 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp453ScopeContractFoundationCaseSet();
  const descriptor = createAnalyticsCoreCp453ScopeContractFoundationDescriptor();
  const validation = validateAnalyticsCoreCp453ScopeContractFoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 17);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP15.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.analytics_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP15.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-453 evidence packets and handoff preserve analytics bootstrap authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp453ScopeContractFoundationDescriptor();
  const hermes = createAnalyticsCoreCp453HermesEvidencePacket(cp453PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp453ClaudeReviewPacket(cp453PlanPack);
  const handoff = createAnalyticsCoreCp453CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-453-to-CP00-454");
  assert.equal(handoff.next_subphase_id, "RP15.P01.M06.S01");
  assert.equal(handoff.production_ready_flag, "analytics_core_scope_contract_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-454 plan binding covers the planned 150 RP15 p01 closeout p02 foundation units", () => {
  const coverage = validateAnalyticsCoreCp454Coverage(cp454PlanPack);

  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.pack_id, "CP00-454");
  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.range, "RP15.P01.M06.S01-RP15.P02.M04.S06");
  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.upstream_pack_id, "CP00-453");
  assert.equal(ANALYTICS_CORE_CP454_PACK_BINDING.next_pack_id, "CP00-455");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P01.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P01.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P01.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P01.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M04"], 6);
});

test("CP00-454 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp454P01CloseoutP02FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor();
  const validation = validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-454 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor();
  const hermes = createAnalyticsCoreCp454HermesEvidencePacket(cp454PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp454ClaudeReviewPacket(cp454PlanPack);
  const handoff = createAnalyticsCoreCp454CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-454-to-CP00-455");
  assert.equal(handoff.next_subphase_id, "RP15.P02.M04.S07");
  assert.equal(handoff.production_ready_flag, "analytics_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-455 plan binding covers the planned 40 RP15 p02 workflow permission slice units", () => {
  const coverage = validateAnalyticsCoreCp455Coverage(cp455PlanPack);

  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.pack_id, "CP00-455");
  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.risk_class, "B");
  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.unit_count, 40);
  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.range, "RP15.P02.M04.S07-RP15.P02.M06.S02");
  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.upstream_pack_id, "CP00-454");
  assert.equal(ANALYTICS_CORE_CP455_PACK_BINDING.next_pack_id, "CP00-456");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M04"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M06"], 2);
});

test("CP00-455 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp455P02WorkflowPermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-455 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp455HermesEvidencePacket(cp455PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp455ClaudeReviewPacket(cp455PlanPack);
  const handoff = createAnalyticsCoreCp455CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-455-to-CP00-456");
  assert.equal(handoff.next_subphase_id, "RP15.P02.M06.S03");
  assert.equal(handoff.production_ready_flag, "analytics_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-456 plan binding covers the planned 10 RP15 p02 fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp456Coverage(cp456PlanPack);

  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.pack_id, "CP00-456");
  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.range, "RP15.P02.M06.S03-RP15.P02.M06.S12");
  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.upstream_pack_id, "CP00-455");
  assert.equal(ANALYTICS_CORE_CP456_PACK_BINDING.next_pack_id, "CP00-457");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M06"], 10);
});

test("CP00-456 p02 fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp456P02FixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp456P02FixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp456P02FixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-456 evidence packets and handoff preserve p02 fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp456P02FixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp456HermesEvidencePacket(cp456PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp456ClaudeReviewPacket(cp456PlanPack);
  const handoff = createAnalyticsCoreCp456CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-456-to-CP00-457");
  assert.equal(handoff.next_subphase_id, "RP15.P02.M06.S13");
  assert.equal(handoff.production_ready_flag, "analytics_core_p02_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-457 plan binding covers the planned 150 RP15 p02 closeout p03 foundation units", () => {
  const coverage = validateAnalyticsCoreCp457Coverage(cp457PlanPack);

  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, "CP00-457");
  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.range, "RP15.P02.M06.S13-RP15.P03.M05.S06");
  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.upstream_pack_id, "CP00-456");
  assert.equal(ANALYTICS_CORE_CP457_PACK_BINDING.next_pack_id, "CP00-458");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P02.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M00"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M05"], 6);
});

test("CP00-457 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp457P02CloseoutP03FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor();
  const validation = validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-457 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor();
  const hermes = createAnalyticsCoreCp457HermesEvidencePacket(cp457PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp457ClaudeReviewPacket(cp457PlanPack);
  const handoff = createAnalyticsCoreCp457CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-457-to-CP00-458");
  assert.equal(handoff.next_subphase_id, "RP15.P03.M05.S07");
  assert.equal(handoff.production_ready_flag, "analytics_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-458 plan binding covers the planned 10 RP15 p03 permission slice units", () => {
  const coverage = validateAnalyticsCoreCp458Coverage(cp458PlanPack);

  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, "CP00-458");
  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.range, "RP15.P03.M05.S07-RP15.P03.M05.S16");
  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.upstream_pack_id, "CP00-457");
  assert.equal(ANALYTICS_CORE_CP458_PACK_BINDING.next_pack_id, "CP00-459");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M05"], 10);
});

test("CP00-458 p03 permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp458P03PermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp458P03PermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp458P03PermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-458 evidence packets and handoff preserve p03 permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp458P03PermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp458HermesEvidencePacket(cp458PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp458ClaudeReviewPacket(cp458PlanPack);
  const handoff = createAnalyticsCoreCp458CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-458-to-CP00-459");
  assert.equal(handoff.next_subphase_id, "RP15.P03.M05.S17");
  assert.equal(handoff.production_ready_flag, "analytics_core_p03_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-459 plan binding covers the planned 10 RP15 p03 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp459Coverage(cp459PlanPack);

  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, "CP00-459");
  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.range, "RP15.P03.M05.S17-RP15.P03.M06.S06");
  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.upstream_pack_id, "CP00-458");
  assert.equal(ANALYTICS_CORE_CP459_PACK_BINDING.next_pack_id, "CP00-460");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M06"], 6);
});

test("CP00-459 p03 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp459P03PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-459 evidence packets and handoff preserve p03 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp459HermesEvidencePacket(cp459PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp459ClaudeReviewPacket(cp459PlanPack);
  const handoff = createAnalyticsCoreCp459CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-459-to-CP00-460");
  assert.equal(handoff.next_subphase_id, "RP15.P03.M06.S07");
  assert.equal(handoff.production_ready_flag, "analytics_core_p03_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-460 plan binding covers the planned 150 RP15 p03 closeout p04 foundation units", () => {
  const coverage = validateAnalyticsCoreCp460Coverage(cp460PlanPack);

  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, "CP00-460");
  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.range, "RP15.P03.M06.S07-RP15.P04.M05.S07");
  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.upstream_pack_id, "CP00-459");
  assert.equal(ANALYTICS_CORE_CP460_PACK_BINDING.next_pack_id, "CP00-461");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P03.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M05"], 7);
});

test("CP00-460 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp460P03CloseoutP04FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor();
  const validation = validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-460 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor();
  const hermes = createAnalyticsCoreCp460HermesEvidencePacket(cp460PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp460ClaudeReviewPacket(cp460PlanPack);
  const handoff = createAnalyticsCoreCp460CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-460-to-CP00-461");
  assert.equal(handoff.next_subphase_id, "RP15.P04.M05.S08");
  assert.equal(handoff.production_ready_flag, "analytics_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-461 plan binding covers the planned 10 RP15 p04 permission slice units", () => {
  const coverage = validateAnalyticsCoreCp461Coverage(cp461PlanPack);

  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, "CP00-461");
  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.range, "RP15.P04.M05.S08-RP15.P04.M05.S17");
  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.upstream_pack_id, "CP00-460");
  assert.equal(ANALYTICS_CORE_CP461_PACK_BINDING.next_pack_id, "CP00-462");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M05"], 10);
});

test("CP00-461 p04 permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp461P04PermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp461P04PermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp461P04PermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-461 evidence packets and handoff preserve p04 permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp461P04PermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp461HermesEvidencePacket(cp461PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp461ClaudeReviewPacket(cp461PlanPack);
  const handoff = createAnalyticsCoreCp461CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-461-to-CP00-462");
  assert.equal(handoff.next_subphase_id, "RP15.P04.M05.S18");
  assert.equal(handoff.production_ready_flag, "analytics_core_p04_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-462 plan binding covers the planned 10 RP15 p04 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp462Coverage(cp462PlanPack);

  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, "CP00-462");
  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.range, "RP15.P04.M05.S18-RP15.P04.M06.S05");
  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.upstream_pack_id, "CP00-461");
  assert.equal(ANALYTICS_CORE_CP462_PACK_BINDING.next_pack_id, "CP00-463");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M06"], 5);
});

test("CP00-462 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp462P04PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-462 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp462HermesEvidencePacket(cp462PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp462ClaudeReviewPacket(cp462PlanPack);
  const handoff = createAnalyticsCoreCp462CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-462-to-CP00-463");
  assert.equal(handoff.next_subphase_id, "RP15.P04.M06.S06");
  assert.equal(handoff.production_ready_flag, "analytics_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-463 plan binding covers the planned 150 RP15 p04 closeout p05 foundation units", () => {
  const coverage = validateAnalyticsCoreCp463Coverage(cp463PlanPack);

  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, "CP00-463");
  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.range, "RP15.P04.M06.S06-RP15.P05.M04.S07");
  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.upstream_pack_id, "CP00-462");
  assert.equal(ANALYTICS_CORE_CP463_PACK_BINDING.next_pack_id, "CP00-464");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M06"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P04.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M04"], 7);
});

test("CP00-463 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp463P04CloseoutP05FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor();
  const validation = validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-463 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor();
  const hermes = createAnalyticsCoreCp463HermesEvidencePacket(cp463PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp463ClaudeReviewPacket(cp463PlanPack);
  const handoff = createAnalyticsCoreCp463CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-463-to-CP00-464");
  assert.equal(handoff.next_subphase_id, "RP15.P05.M04.S08");
  assert.equal(handoff.production_ready_flag, "analytics_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-464 plan binding covers the planned 40 RP15 p05 workflow permission slice units", () => {
  const coverage = validateAnalyticsCoreCp464Coverage(cp464PlanPack);

  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, "CP00-464");
  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.risk_class, "B");
  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.unit_count, 40);
  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.range, "RP15.P05.M04.S08-RP15.P05.M06.S05");
  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.upstream_pack_id, "CP00-463");
  assert.equal(ANALYTICS_CORE_CP464_PACK_BINDING.next_pack_id, "CP00-465");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M04"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M06"], 5);
});

test("CP00-464 p05 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp464P05WorkflowPermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-464 evidence packets and handoff preserve p05 workflow permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp464HermesEvidencePacket(cp464PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp464ClaudeReviewPacket(cp464PlanPack);
  const handoff = createAnalyticsCoreCp464CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-464-to-CP00-465");
  assert.equal(handoff.next_subphase_id, "RP15.P05.M06.S06");
  assert.equal(handoff.production_ready_flag, "analytics_core_p05_workflow_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-465 plan binding covers the planned 150 RP15 p05 closeout p06 foundation units", () => {
  const coverage = validateAnalyticsCoreCp465Coverage(cp465PlanPack);

  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, "CP00-465");
  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.range, "RP15.P05.M06.S06-RP15.P06.M03.S14");
  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.upstream_pack_id, "CP00-464");
  assert.equal(ANALYTICS_CORE_CP465_PACK_BINDING.next_pack_id, "CP00-466");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M06"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P05.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M03"], 14);
});

test("CP00-465 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp465P05CloseoutP06FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor();
  const validation = validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-465 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor();
  const hermes = createAnalyticsCoreCp465HermesEvidencePacket(cp465PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp465ClaudeReviewPacket(cp465PlanPack);
  const handoff = createAnalyticsCoreCp465CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-465-to-CP00-466");
  assert.equal(handoff.next_subphase_id, "RP15.P06.M03.S15");
  assert.equal(handoff.production_ready_flag, "analytics_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-466 plan binding covers the planned 10 RP15 p06 implementation workflow slice units", () => {
  const coverage = validateAnalyticsCoreCp466Coverage(cp466PlanPack);

  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, "CP00-466");
  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.range, "RP15.P06.M03.S15-RP15.P06.M04.S02");
  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.upstream_pack_id, "CP00-465");
  assert.equal(ANALYTICS_CORE_CP466_PACK_BINDING.next_pack_id, "CP00-467");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M04"], 2);
});

test("CP00-466 p06 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp466P06ImplementationWorkflowSliceCaseSet();
  const descriptor = createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor();
  const validation = validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-466 evidence packets and handoff preserve p06 implementation workflow slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor();
  const hermes = createAnalyticsCoreCp466HermesEvidencePacket(cp466PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp466ClaudeReviewPacket(cp466PlanPack);
  const handoff = createAnalyticsCoreCp466CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-466-to-CP00-467");
  assert.equal(handoff.next_subphase_id, "RP15.P06.M04.S03");
  assert.equal(handoff.production_ready_flag, "analytics_core_p06_implementation_workflow_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-467 plan binding covers the planned 40 RP15 p06 workflow permission slice units", () => {
  const coverage = validateAnalyticsCoreCp467Coverage(cp467PlanPack);

  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, "CP00-467");
  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.risk_class, "B");
  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.unit_count, 40);
  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.range, "RP15.P06.M04.S03-RP15.P06.M05.S20");
  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.upstream_pack_id, "CP00-466");
  assert.equal(ANALYTICS_CORE_CP467_PACK_BINDING.next_pack_id, "CP00-468");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M05"], 20);
});

test("CP00-467 p06 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp467P06WorkflowPermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-467 evidence packets and handoff preserve p06 workflow permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp467HermesEvidencePacket(cp467PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp467ClaudeReviewPacket(cp467PlanPack);
  const handoff = createAnalyticsCoreCp467CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-467-to-CP00-468");
  assert.equal(handoff.next_subphase_id, "RP15.P06.M05.S21");
  assert.equal(handoff.production_ready_flag, "analytics_core_p06_workflow_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-468 plan binding covers the planned 10 RP15 p06 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp468Coverage(cp468PlanPack);

  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, "CP00-468");
  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.range, "RP15.P06.M05.S21-RP15.P06.M06.S08");
  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.upstream_pack_id, "CP00-467");
  assert.equal(ANALYTICS_CORE_CP468_PACK_BINDING.next_pack_id, "CP00-469");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M06"], 8);
});

test("CP00-468 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp468P06PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-468 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp468HermesEvidencePacket(cp468PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp468ClaudeReviewPacket(cp468PlanPack);
  const handoff = createAnalyticsCoreCp468CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-468-to-CP00-469");
  assert.equal(handoff.next_subphase_id, "RP15.P06.M06.S09");
  assert.equal(handoff.production_ready_flag, "analytics_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-469 plan binding covers the planned 150 RP15 p06 closeout p07 foundation units", () => {
  const coverage = validateAnalyticsCoreCp469Coverage(cp469PlanPack);

  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, "CP00-469");
  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.range, "RP15.P06.M06.S09-RP15.P07.M03.S10");
  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.upstream_pack_id, "CP00-468");
  assert.equal(ANALYTICS_CORE_CP469_PACK_BINDING.next_pack_id, "CP00-470");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P06.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M03"], 10);
});

test("CP00-469 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp469P06CloseoutP07FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor();
  const validation = validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-469 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor();
  const hermes = createAnalyticsCoreCp469HermesEvidencePacket(cp469PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp469ClaudeReviewPacket(cp469PlanPack);
  const handoff = createAnalyticsCoreCp469CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-469-to-CP00-470");
  assert.equal(handoff.next_subphase_id, "RP15.P07.M03.S11");
  assert.equal(handoff.production_ready_flag, "analytics_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-470 plan binding covers the planned 10 RP15 p07 implementation slice units", () => {
  const coverage = validateAnalyticsCoreCp470Coverage(cp470PlanPack);

  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, "CP00-470");
  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.range, "RP15.P07.M03.S11-RP15.P07.M03.S20");
  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.upstream_pack_id, "CP00-469");
  assert.equal(ANALYTICS_CORE_CP470_PACK_BINDING.next_pack_id, "CP00-471");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M03"], 10);
});

test("CP00-470 p07 implementation slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp470P07ImplementationSliceCaseSet();
  const descriptor = createAnalyticsCoreCp470P07ImplementationSliceDescriptor();
  const validation = validateAnalyticsCoreCp470P07ImplementationSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-470 evidence packets and handoff preserve p07 implementation slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp470P07ImplementationSliceDescriptor();
  const hermes = createAnalyticsCoreCp470HermesEvidencePacket(cp470PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp470ClaudeReviewPacket(cp470PlanPack);
  const handoff = createAnalyticsCoreCp470CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-470-to-CP00-471");
  assert.equal(handoff.next_subphase_id, "RP15.P07.M03.S21");
  assert.equal(handoff.production_ready_flag, "analytics_core_p07_implementation_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-471 plan binding covers the planned 40 RP15 p07 workflow permission slice units", () => {
  const coverage = validateAnalyticsCoreCp471Coverage(cp471PlanPack);

  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, "CP00-471");
  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.risk_class, "B");
  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.unit_count, 40);
  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.range, "RP15.P07.M03.S21-RP15.P07.M05.S16");
  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.upstream_pack_id, "CP00-470");
  assert.equal(ANALYTICS_CORE_CP471_PACK_BINDING.next_pack_id, "CP00-472");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M03"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M05"], 16);
});

test("CP00-471 p07 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp471P07WorkflowPermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-471 evidence packets and handoff preserve p07 workflow permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp471HermesEvidencePacket(cp471PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp471ClaudeReviewPacket(cp471PlanPack);
  const handoff = createAnalyticsCoreCp471CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-471-to-CP00-472");
  assert.equal(handoff.next_subphase_id, "RP15.P07.M05.S17");
  assert.equal(handoff.production_ready_flag, "analytics_core_p07_workflow_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-472 plan binding covers the planned 10 RP15 p07 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp472Coverage(cp472PlanPack);

  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, "CP00-472");
  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.range, "RP15.P07.M05.S17-RP15.P07.M06.S04");
  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.upstream_pack_id, "CP00-471");
  assert.equal(ANALYTICS_CORE_CP472_PACK_BINDING.next_pack_id, "CP00-473");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M06"], 4);
});

test("CP00-472 p07 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp472P07PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-472 evidence packets and handoff preserve p07 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp472HermesEvidencePacket(cp472PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp472ClaudeReviewPacket(cp472PlanPack);
  const handoff = createAnalyticsCoreCp472CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-472-to-CP00-473");
  assert.equal(handoff.next_subphase_id, "RP15.P07.M06.S05");
  assert.equal(handoff.production_ready_flag, "analytics_core_p07_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-473 plan binding covers the planned 150 RP15 p07 closeout p08 foundation units", () => {
  const coverage = validateAnalyticsCoreCp473Coverage(cp473PlanPack);

  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, "CP00-473");
  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.range, "RP15.P07.M06.S05-RP15.P08.M03.S21");
  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.upstream_pack_id, "CP00-472");
  assert.equal(ANALYTICS_CORE_CP473_PACK_BINDING.next_pack_id, "CP00-474");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M06"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P07.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M03"], 21);
});

test("CP00-473 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp473P07CloseoutP08FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor();
  const validation = validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-473 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor();
  const hermes = createAnalyticsCoreCp473HermesEvidencePacket(cp473PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp473ClaudeReviewPacket(cp473PlanPack);
  const handoff = createAnalyticsCoreCp473CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-473-to-CP00-474");
  assert.equal(handoff.next_subphase_id, "RP15.P08.M03.S22");
  assert.equal(handoff.production_ready_flag, "analytics_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-474 plan binding covers the planned 40 RP15 p08 workflow permission slice units", () => {
  const coverage = validateAnalyticsCoreCp474Coverage(cp474PlanPack);

  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, "CP00-474");
  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.risk_class, "B");
  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.unit_count, 40);
  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.range, "RP15.P08.M03.S22-RP15.P08.M05.S19");
  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.upstream_pack_id, "CP00-473");
  assert.equal(ANALYTICS_CORE_CP474_PACK_BINDING.next_pack_id, "CP00-475");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M03"], 1);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M05"], 19);
});

test("CP00-474 p08 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp474P08WorkflowPermissionSliceCaseSet();
  const descriptor = createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor();
  const validation = validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-474 evidence packets and handoff preserve p08 workflow permission slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor();
  const hermes = createAnalyticsCoreCp474HermesEvidencePacket(cp474PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp474ClaudeReviewPacket(cp474PlanPack);
  const handoff = createAnalyticsCoreCp474CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-474-to-CP00-475");
  assert.equal(handoff.next_subphase_id, "RP15.P08.M05.S20");
  assert.equal(handoff.production_ready_flag, "analytics_core_p08_workflow_permission_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-475 plan binding covers the planned 10 RP15 p08 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp475Coverage(cp475PlanPack);

  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, "CP00-475");
  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.range, "RP15.P08.M05.S20-RP15.P08.M06.S07");
  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.upstream_pack_id, "CP00-474");
  assert.equal(ANALYTICS_CORE_CP475_PACK_BINDING.next_pack_id, "CP00-476");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M05"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M06"], 7);
});

test("CP00-475 p08 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp475P08PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-475 evidence packets and handoff preserve p08 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp475HermesEvidencePacket(cp475PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp475ClaudeReviewPacket(cp475PlanPack);
  const handoff = createAnalyticsCoreCp475CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-475-to-CP00-476");
  assert.equal(handoff.next_subphase_id, "RP15.P08.M06.S08");
  assert.equal(handoff.production_ready_flag, "analytics_core_p08_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-476 plan binding covers the planned 10 RP15 p08 fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp476Coverage(cp476PlanPack);

  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, "CP00-476");
  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.range, "RP15.P08.M06.S08-RP15.P08.M06.S17");
  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.upstream_pack_id, "CP00-475");
  assert.equal(ANALYTICS_CORE_CP476_PACK_BINDING.next_pack_id, "CP00-477");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M06"], 10);
});

test("CP00-476 p08 fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp476P08FixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp476P08FixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp476P08FixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-476 evidence packets and handoff preserve p08 fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp476P08FixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp476HermesEvidencePacket(cp476PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp476ClaudeReviewPacket(cp476PlanPack);
  const handoff = createAnalyticsCoreCp476CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-476-to-CP00-477");
  assert.equal(handoff.next_subphase_id, "RP15.P08.M06.S18");
  assert.equal(handoff.production_ready_flag, "analytics_core_p08_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-477 plan binding covers the planned 150 RP15 p08 closeout p09 foundation units", () => {
  const coverage = validateAnalyticsCoreCp477Coverage(cp477PlanPack);

  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, "CP00-477");
  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.unit_count, 150);
  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.range, "RP15.P08.M06.S18-RP15.P09.M05.S17");
  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.upstream_pack_id, "CP00-476");
  assert.equal(ANALYTICS_CORE_CP477_PACK_BINDING.next_pack_id, "CP00-478");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M06"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P08.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M00"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M05"], 17);
});

test("CP00-477 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp477P08CloseoutP09FoundationCaseSet();
  const descriptor = createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor();
  const validation = validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-477 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor();
  const hermes = createAnalyticsCoreCp477HermesEvidencePacket(cp477PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp477ClaudeReviewPacket(cp477PlanPack);
  const handoff = createAnalyticsCoreCp477CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-477-to-CP00-478");
  assert.equal(handoff.next_subphase_id, "RP15.P09.M05.S18");
  assert.equal(handoff.production_ready_flag, "analytics_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-478 plan binding covers the planned 10 RP15 p09 permission fixture slice units", () => {
  const coverage = validateAnalyticsCoreCp478Coverage(cp478PlanPack);

  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, "CP00-478");
  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.risk_class, "A");
  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.unit_count, 10);
  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.range, "RP15.P09.M05.S18-RP15.P09.M06.S07");
  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.upstream_pack_id, "CP00-477");
  assert.equal(ANALYTICS_CORE_CP478_PACK_BINDING.next_pack_id, "CP00-479");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M05"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M06"], 7);
});

test("CP00-478 p09 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp478P09PermissionFixtureSliceCaseSet();
  const descriptor = createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor();
  const validation = validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-478 evidence packets and handoff preserve p09 permission fixture slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor();
  const hermes = createAnalyticsCoreCp478HermesEvidencePacket(cp478PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp478ClaudeReviewPacket(cp478PlanPack);
  const handoff = createAnalyticsCoreCp478CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-478-to-CP00-479");
  assert.equal(handoff.next_subphase_id, "RP15.P09.M06.S08");
  assert.equal(handoff.production_ready_flag, "analytics_core_p09_permission_fixture_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-479 plan binding covers the planned 65 RP15 p09 closeout slice units", () => {
  const coverage = validateAnalyticsCoreCp479Coverage(cp479PlanPack);

  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.pack_id, "CP00-479");
  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.risk_class, "C");
  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.unit_count, 65);
  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.range, "RP15.P09.M06.S08-RP15.P09.M10.S04");
  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.upstream_pack_id, "CP00-478");
  assert.equal(ANALYTICS_CORE_CP479_PACK_BINDING.next_pack_id, "CP00-480");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 65);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M06"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP15.P09.M10"], 4);
});

test("CP00-479 p09 closeout slice rows stay descriptor-only", () => {
  const caseSet = createAnalyticsCoreCp479P09CloseoutSliceCaseSet();
  const descriptor = createAnalyticsCoreCp479P09CloseoutSliceDescriptor();
  const validation = validateAnalyticsCoreCp479P09CloseoutSliceDescriptor(descriptor, analyticsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[analyticsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-479 evidence packets and handoff preserve p09 closeout slice authority boundaries", () => {
  const descriptor = createAnalyticsCoreCp479P09CloseoutSliceDescriptor();
  const hermes = createAnalyticsCoreCp479HermesEvidencePacket(cp479PlanPack, analyticsContract, descriptor);
  const claude = createAnalyticsCoreCp479ClaudeReviewPacket(cp479PlanPack);
  const handoff = createAnalyticsCoreCp479CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H15");
  assert.equal(claude.gate, "C15");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-479-to-CP00-480");
  assert.equal(handoff.next_subphase_id, "RP16.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "analytics_core_p09_closeout_slice_descriptor_verified");
  assert.equal(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
