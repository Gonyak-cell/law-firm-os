import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const settlementContract = JSON.parse(
  readFileSync(new URL("../../../contracts/settlement-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp426ManifestPath = new URL("../../../docs/closeout-packs/cp00-426/manifest.json", import.meta.url);
const cp426Manifest = existsSync(cp426ManifestPath) ? JSON.parse(readFileSync(cp426ManifestPath, "utf8")) : null;
const cp426PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-426") ?? cp426Manifest?.plan_binding_snapshot;
const cp427ManifestPath = new URL("../../../docs/closeout-packs/cp00-427/manifest.json", import.meta.url);
const cp427Manifest = existsSync(cp427ManifestPath) ? JSON.parse(readFileSync(cp427ManifestPath, "utf8")) : null;
const cp427PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-427") ?? cp427Manifest?.plan_binding_snapshot;
const cp428ManifestPath = new URL("../../../docs/closeout-packs/cp00-428/manifest.json", import.meta.url);
const cp428Manifest = existsSync(cp428ManifestPath) ? JSON.parse(readFileSync(cp428ManifestPath, "utf8")) : null;
const cp428PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-428") ?? cp428Manifest?.plan_binding_snapshot;
const cp429ManifestPath = new URL("../../../docs/closeout-packs/cp00-429/manifest.json", import.meta.url);
const cp429Manifest = existsSync(cp429ManifestPath) ? JSON.parse(readFileSync(cp429ManifestPath, "utf8")) : null;
const cp429PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-429") ?? cp429Manifest?.plan_binding_snapshot;
const cp430ManifestPath = new URL("../../../docs/closeout-packs/cp00-430/manifest.json", import.meta.url);
const cp430Manifest = existsSync(cp430ManifestPath) ? JSON.parse(readFileSync(cp430ManifestPath, "utf8")) : null;
const cp430PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-430") ?? cp430Manifest?.plan_binding_snapshot;
const cp431ManifestPath = new URL("../../../docs/closeout-packs/cp00-431/manifest.json", import.meta.url);
const cp431Manifest = existsSync(cp431ManifestPath) ? JSON.parse(readFileSync(cp431ManifestPath, "utf8")) : null;
const cp431PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-431") ?? cp431Manifest?.plan_binding_snapshot;
const cp432ManifestPath = new URL("../../../docs/closeout-packs/cp00-432/manifest.json", import.meta.url);
const cp432Manifest = existsSync(cp432ManifestPath) ? JSON.parse(readFileSync(cp432ManifestPath, "utf8")) : null;
const cp432PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-432") ?? cp432Manifest?.plan_binding_snapshot;
const cp433ManifestPath = new URL("../../../docs/closeout-packs/cp00-433/manifest.json", import.meta.url);
const cp433Manifest = existsSync(cp433ManifestPath) ? JSON.parse(readFileSync(cp433ManifestPath, "utf8")) : null;
const cp433PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-433") ?? cp433Manifest?.plan_binding_snapshot;
const cp434ManifestPath = new URL("../../../docs/closeout-packs/cp00-434/manifest.json", import.meta.url);
const cp434Manifest = existsSync(cp434ManifestPath) ? JSON.parse(readFileSync(cp434ManifestPath, "utf8")) : null;
const cp434PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-434") ?? cp434Manifest?.plan_binding_snapshot;
const cp435ManifestPath = new URL("../../../docs/closeout-packs/cp00-435/manifest.json", import.meta.url);
const cp435Manifest = existsSync(cp435ManifestPath) ? JSON.parse(readFileSync(cp435ManifestPath, "utf8")) : null;
const cp435PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-435") ?? cp435Manifest?.plan_binding_snapshot;
const cp436ManifestPath = new URL("../../../docs/closeout-packs/cp00-436/manifest.json", import.meta.url);
const cp436Manifest = existsSync(cp436ManifestPath) ? JSON.parse(readFileSync(cp436ManifestPath, "utf8")) : null;
const cp436PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-436") ?? cp436Manifest?.plan_binding_snapshot;
const cp437ManifestPath = new URL("../../../docs/closeout-packs/cp00-437/manifest.json", import.meta.url);
const cp437Manifest = existsSync(cp437ManifestPath) ? JSON.parse(readFileSync(cp437ManifestPath, "utf8")) : null;
const cp437PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-437") ?? cp437Manifest?.plan_binding_snapshot;
const cp438ManifestPath = new URL("../../../docs/closeout-packs/cp00-438/manifest.json", import.meta.url);
const cp438Manifest = existsSync(cp438ManifestPath) ? JSON.parse(readFileSync(cp438ManifestPath, "utf8")) : null;
const cp438PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-438") ?? cp438Manifest?.plan_binding_snapshot;
const cp439ManifestPath = new URL("../../../docs/closeout-packs/cp00-439/manifest.json", import.meta.url);
const cp439Manifest = existsSync(cp439ManifestPath) ? JSON.parse(readFileSync(cp439ManifestPath, "utf8")) : null;
const cp439PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-439") ?? cp439Manifest?.plan_binding_snapshot;
const cp440ManifestPath = new URL("../../../docs/closeout-packs/cp00-440/manifest.json", import.meta.url);
const cp440Manifest = existsSync(cp440ManifestPath) ? JSON.parse(readFileSync(cp440ManifestPath, "utf8")) : null;
const cp440PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-440") ?? cp440Manifest?.plan_binding_snapshot;
const cp441ManifestPath = new URL("../../../docs/closeout-packs/cp00-441/manifest.json", import.meta.url);
const cp441Manifest = existsSync(cp441ManifestPath) ? JSON.parse(readFileSync(cp441ManifestPath, "utf8")) : null;
const cp441PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-441") ?? cp441Manifest?.plan_binding_snapshot;
const cp442ManifestPath = new URL("../../../docs/closeout-packs/cp00-442/manifest.json", import.meta.url);
const cp442Manifest = existsSync(cp442ManifestPath) ? JSON.parse(readFileSync(cp442ManifestPath, "utf8")) : null;
const cp442PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-442") ?? cp442Manifest?.plan_binding_snapshot;
const cp443ManifestPath = new URL("../../../docs/closeout-packs/cp00-443/manifest.json", import.meta.url);
const cp443Manifest = existsSync(cp443ManifestPath) ? JSON.parse(readFileSync(cp443ManifestPath, "utf8")) : null;
const cp443PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-443") ?? cp443Manifest?.plan_binding_snapshot;
const cp444ManifestPath = new URL("../../../docs/closeout-packs/cp00-444/manifest.json", import.meta.url);
const cp444Manifest = existsSync(cp444ManifestPath) ? JSON.parse(readFileSync(cp444ManifestPath, "utf8")) : null;
const cp444PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-444") ?? cp444Manifest?.plan_binding_snapshot;
const cp445ManifestPath = new URL("../../../docs/closeout-packs/cp00-445/manifest.json", import.meta.url);
const cp445Manifest = existsSync(cp445ManifestPath) ? JSON.parse(readFileSync(cp445ManifestPath, "utf8")) : null;
const cp445PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-445") ?? cp445Manifest?.plan_binding_snapshot;
const cp446ManifestPath = new URL("../../../docs/closeout-packs/cp00-446/manifest.json", import.meta.url);
const cp446Manifest = existsSync(cp446ManifestPath) ? JSON.parse(readFileSync(cp446ManifestPath, "utf8")) : null;
const cp446PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-446") ?? cp446Manifest?.plan_binding_snapshot;
const cp447ManifestPath = new URL("../../../docs/closeout-packs/cp00-447/manifest.json", import.meta.url);
const cp447Manifest = existsSync(cp447ManifestPath) ? JSON.parse(readFileSync(cp447ManifestPath, "utf8")) : null;
const cp447PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-447") ?? cp447Manifest?.plan_binding_snapshot;
const cp448ManifestPath = new URL("../../../docs/closeout-packs/cp00-448/manifest.json", import.meta.url);
const cp448Manifest = existsSync(cp448ManifestPath) ? JSON.parse(readFileSync(cp448ManifestPath, "utf8")) : null;
const cp448PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-448") ?? cp448Manifest?.plan_binding_snapshot;
const cp449ManifestPath = new URL("../../../docs/closeout-packs/cp00-449/manifest.json", import.meta.url);
const cp449Manifest = existsSync(cp449ManifestPath) ? JSON.parse(readFileSync(cp449ManifestPath, "utf8")) : null;
const cp449PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-449") ?? cp449Manifest?.plan_binding_snapshot;
const cp450ManifestPath = new URL("../../../docs/closeout-packs/cp00-450/manifest.json", import.meta.url);
const cp450Manifest = existsSync(cp450ManifestPath) ? JSON.parse(readFileSync(cp450ManifestPath, "utf8")) : null;
const cp450PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-450") ?? cp450Manifest?.plan_binding_snapshot;
const cp451ManifestPath = new URL("../../../docs/closeout-packs/cp00-451/manifest.json", import.meta.url);
const cp451Manifest = existsSync(cp451ManifestPath) ? JSON.parse(readFileSync(cp451ManifestPath, "utf8")) : null;
const cp451PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-451") ?? cp451Manifest?.plan_binding_snapshot;
const cp452ManifestPath = new URL("../../../docs/closeout-packs/cp00-452/manifest.json", import.meta.url);
const cp452Manifest = existsSync(cp452ManifestPath) ? JSON.parse(readFileSync(cp452ManifestPath, "utf8")) : null;
const cp452PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-452") ?? cp452Manifest?.plan_binding_snapshot;

test("RP14 program contract pins the Settlement descriptor-only bootstrap", () => {
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.program_id, "RP14");
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.program_title, "Partner Settlement");
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP13");
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.hermes_gate, "H14");
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.claude_gate, "C14");
  assert.equal(SETTLEMENT_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-426", "CP00-427", "CP00-428", "CP00-429", "CP00-430", "CP00-431", "CP00-432", "CP00-433", "CP00-434", "CP00-435", "CP00-436", "CP00-437", "CP00-438", "CP00-439", "CP00-440", "CP00-441", "CP00-442", "CP00-443", "CP00-444", "CP00-445", "CP00-446", "CP00-447", "CP00-448", "CP00-449", "CP00-450", "CP00-451", "CP00-452"].includes(settlementContract.current_pack.pack_id));
  assert.equal(settlementContract.program.program_id, "RP14");
});

test("CP00-426 plan binding covers the planned 150 RP14 scope and model foundation units", () => {
  const coverage = validateSettlementCoreCp426Coverage(cp426PlanPack);

  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.pack_id, "CP00-426");
  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.range, "RP14.P00.M00.S01-RP14.P01.M04.S13");
  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.upstream_pack_id, "CP00-425");
  assert.equal(SETTLEMENT_CORE_CP426_PACK_BINDING.next_pack_id, "CP00-427");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP14.P00"], 92);
  assert.equal(coverage.summary.by_phase["RP14.P01"], 58);
  assert.equal(Object.keys(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows).length, 16);
});

test("CP00-426 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp426ScopeContractFoundationCaseSet();
  const descriptor = createSettlementCoreCp426ScopeContractFoundationDescriptor();
  const validation = validateSettlementCoreCp426ScopeContractFoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 16);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP14.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.settlement_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP14.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-426 evidence packets and handoff preserve settlement bootstrap authority boundaries", () => {
  const descriptor = createSettlementCoreCp426ScopeContractFoundationDescriptor();
  const hermes = createSettlementCoreCp426HermesEvidencePacket(cp426PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp426ClaudeReviewPacket(cp426PlanPack);
  const handoff = createSettlementCoreCp426CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-426-to-CP00-427");
  assert.equal(handoff.next_subphase_id, "RP14.P01.M04.S14");
  assert.equal(handoff.production_ready_flag, "settlement_core_scope_contract_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-427 plan binding covers the planned 150 RP14 p01 closeout p02 foundation units", () => {
  const coverage = validateSettlementCoreCp427Coverage(cp427PlanPack);

  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id, "CP00-427");
  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.range, "RP14.P01.M04.S14-RP14.P02.M01.S16");
  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.upstream_pack_id, "CP00-426");
  assert.equal(SETTLEMENT_CORE_CP427_PACK_BINDING.next_pack_id, "CP00-428");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M04"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P01.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M00"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M01"], 16);
});

test("CP00-427 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp427P01CloseoutP02FoundationCaseSet();
  const descriptor = createSettlementCoreCp427P01CloseoutP02FoundationDescriptor();
  const validation = validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP14.P01.M05"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-427 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp427P01CloseoutP02FoundationDescriptor();
  const hermes = createSettlementCoreCp427HermesEvidencePacket(cp427PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp427ClaudeReviewPacket(cp427PlanPack);
  const handoff = createSettlementCoreCp427CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-427-to-CP00-428");
  assert.equal(handoff.next_subphase_id, "RP14.P02.M01.S17");
  assert.equal(handoff.production_ready_flag, "settlement_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-428 plan binding covers the planned 40 RP14 p02 contract implementation slice units", () => {
  const coverage = validateSettlementCoreCp428Coverage(cp428PlanPack);

  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id, "CP00-428");
  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.range, "RP14.P02.M01.S17-RP14.P02.M03.S14");
  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.upstream_pack_id, "CP00-427");
  assert.equal(SETTLEMENT_CORE_CP428_PACK_BINDING.next_pack_id, "CP00-429");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M01"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M03"], 14);
});

test("CP00-428 p02 contract implementation slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp428P02ContractImplementationSliceCaseSet();
  const descriptor = createSettlementCoreCp428P02ContractImplementationSliceDescriptor();
  const validation = validateSettlementCoreCp428P02ContractImplementationSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-428 evidence packets and handoff preserve p02 contract implementation slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp428P02ContractImplementationSliceDescriptor();
  const hermes = createSettlementCoreCp428HermesEvidencePacket(cp428PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp428ClaudeReviewPacket(cp428PlanPack);
  const handoff = createSettlementCoreCp428CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-428-to-CP00-429");
  assert.equal(handoff.next_subphase_id, "RP14.P02.M03.S15");
  assert.equal(handoff.production_ready_flag, "settlement_core_p02_contract_implementation_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-429 plan binding covers the planned 10 RP14 p02 implementation workflow slice units", () => {
  const coverage = validateSettlementCoreCp429Coverage(cp429PlanPack);

  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id, "CP00-429");
  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.range, "RP14.P02.M03.S15-RP14.P02.M04.S02");
  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.upstream_pack_id, "CP00-428");
  assert.equal(SETTLEMENT_CORE_CP429_PACK_BINDING.next_pack_id, "CP00-430");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M04"], 2);
});

test("CP00-429 p02 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp429P02ImplementationWorkflowSliceCaseSet();
  const descriptor = createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor();
  const validation = validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-429 evidence packets and handoff preserve p02 implementation workflow slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor();
  const hermes = createSettlementCoreCp429HermesEvidencePacket(cp429PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp429ClaudeReviewPacket(cp429PlanPack);
  const handoff = createSettlementCoreCp429CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-429-to-CP00-430");
  assert.equal(handoff.next_subphase_id, "RP14.P02.M04.S03");
  assert.equal(handoff.production_ready_flag, "settlement_core_p02_implementation_workflow_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-430 plan binding covers the planned 10 RP14 p02 workflow slice units", () => {
  const coverage = validateSettlementCoreCp430Coverage(cp430PlanPack);

  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, "CP00-430");
  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.range, "RP14.P02.M04.S03-RP14.P02.M04.S12");
  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.upstream_pack_id, "CP00-429");
  assert.equal(SETTLEMENT_CORE_CP430_PACK_BINDING.next_pack_id, "CP00-431");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M04"], 10);
});

test("CP00-430 p02 workflow slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp430P02WorkflowSliceCaseSet();
  const descriptor = createSettlementCoreCp430P02WorkflowSliceDescriptor();
  const validation = validateSettlementCoreCp430P02WorkflowSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-430 evidence packets and handoff preserve p02 workflow slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp430P02WorkflowSliceDescriptor();
  const hermes = createSettlementCoreCp430HermesEvidencePacket(cp430PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp430ClaudeReviewPacket(cp430PlanPack);
  const handoff = createSettlementCoreCp430CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-430-to-CP00-431");
  assert.equal(handoff.next_subphase_id, "RP14.P02.M04.S13");
  assert.equal(handoff.production_ready_flag, "settlement_core_p02_workflow_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-431 plan binding covers the planned 40 RP14 p02 workflow permission slice units", () => {
  const coverage = validateSettlementCoreCp431Coverage(cp431PlanPack);

  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, "CP00-431");
  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.range, "RP14.P02.M04.S13-RP14.P02.M06.S08");
  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.upstream_pack_id, "CP00-430");
  assert.equal(SETTLEMENT_CORE_CP431_PACK_BINDING.next_pack_id, "CP00-432");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M06"], 8);
});

test("CP00-431 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp431P02WorkflowPermissionSliceCaseSet();
  const descriptor = createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor();
  const validation = validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-431 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor();
  const hermes = createSettlementCoreCp431HermesEvidencePacket(cp431PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp431ClaudeReviewPacket(cp431PlanPack);
  const handoff = createSettlementCoreCp431CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-431-to-CP00-432");
  assert.equal(handoff.next_subphase_id, "RP14.P02.M06.S09");
  assert.equal(handoff.production_ready_flag, "settlement_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-432 plan binding covers the planned 150 RP14 p02 closeout p03 foundation units", () => {
  const coverage = validateSettlementCoreCp432Coverage(cp432PlanPack);

  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, "CP00-432");
  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.range, "RP14.P02.M06.S09-RP14.P03.M04.S05");
  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.upstream_pack_id, "CP00-431");
  assert.equal(SETTLEMENT_CORE_CP432_PACK_BINDING.next_pack_id, "CP00-433");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P02.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M00"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M04"], 5);
});

test("CP00-432 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp432P02CloseoutP03FoundationCaseSet();
  const descriptor = createSettlementCoreCp432P02CloseoutP03FoundationDescriptor();
  const validation = validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-432 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp432P02CloseoutP03FoundationDescriptor();
  const hermes = createSettlementCoreCp432HermesEvidencePacket(cp432PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp432ClaudeReviewPacket(cp432PlanPack);
  const handoff = createSettlementCoreCp432CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-432-to-CP00-433");
  assert.equal(handoff.next_subphase_id, "RP14.P03.M04.S06");
  assert.equal(handoff.production_ready_flag, "settlement_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-433 plan binding covers the planned 10 RP14 p03 workflow slice units", () => {
  const coverage = validateSettlementCoreCp433Coverage(cp433PlanPack);

  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, "CP00-433");
  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.range, "RP14.P03.M04.S06-RP14.P03.M04.S15");
  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.upstream_pack_id, "CP00-432");
  assert.equal(SETTLEMENT_CORE_CP433_PACK_BINDING.next_pack_id, "CP00-434");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M04"], 10);
});

test("CP00-433 p03 workflow slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp433P03WorkflowSliceCaseSet();
  const descriptor = createSettlementCoreCp433P03WorkflowSliceDescriptor();
  const validation = validateSettlementCoreCp433P03WorkflowSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-433 evidence packets and handoff preserve p03 workflow slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp433P03WorkflowSliceDescriptor();
  const hermes = createSettlementCoreCp433HermesEvidencePacket(cp433PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp433ClaudeReviewPacket(cp433PlanPack);
  const handoff = createSettlementCoreCp433CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-433-to-CP00-434");
  assert.equal(handoff.next_subphase_id, "RP14.P03.M04.S16");
  assert.equal(handoff.production_ready_flag, "settlement_core_p03_workflow_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-434 plan binding covers the planned 150 RP14 p03 closeout p04 foundation units", () => {
  const coverage = validateSettlementCoreCp434Coverage(cp434PlanPack);

  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, "CP00-434");
  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.range, "RP14.P03.M04.S16-RP14.P04.M02.S11");
  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.upstream_pack_id, "CP00-433");
  assert.equal(SETTLEMENT_CORE_CP434_PACK_BINDING.next_pack_id, "CP00-435");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M04"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P03.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M02"], 11);
});

test("CP00-434 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp434P03CloseoutP04FoundationCaseSet();
  const descriptor = createSettlementCoreCp434P03CloseoutP04FoundationDescriptor();
  const validation = validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-434 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp434P03CloseoutP04FoundationDescriptor();
  const hermes = createSettlementCoreCp434HermesEvidencePacket(cp434PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp434ClaudeReviewPacket(cp434PlanPack);
  const handoff = createSettlementCoreCp434CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-434-to-CP00-435");
  assert.equal(handoff.next_subphase_id, "RP14.P04.M02.S12");
  assert.equal(handoff.production_ready_flag, "settlement_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-435 plan binding covers the planned 40 RP14 p04 implementation slice units", () => {
  const coverage = validateSettlementCoreCp435Coverage(cp435PlanPack);

  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, "CP00-435");
  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.range, "RP14.P04.M02.S12-RP14.P04.M04.S09");
  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.upstream_pack_id, "CP00-434");
  assert.equal(SETTLEMENT_CORE_CP435_PACK_BINDING.next_pack_id, "CP00-436");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M02"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M04"], 9);
});

test("CP00-435 p04 implementation slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp435P04ImplementationSliceCaseSet();
  const descriptor = createSettlementCoreCp435P04ImplementationSliceDescriptor();
  const validation = validateSettlementCoreCp435P04ImplementationSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-435 evidence packets and handoff preserve p04 implementation slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp435P04ImplementationSliceDescriptor();
  const hermes = createSettlementCoreCp435HermesEvidencePacket(cp435PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp435ClaudeReviewPacket(cp435PlanPack);
  const handoff = createSettlementCoreCp435CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-435-to-CP00-436");
  assert.equal(handoff.next_subphase_id, "RP14.P04.M04.S10");
  assert.equal(handoff.production_ready_flag, "settlement_core_p04_implementation_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-436 plan binding covers the planned 10 RP14 p04 workflow slice units", () => {
  const coverage = validateSettlementCoreCp436Coverage(cp436PlanPack);

  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, "CP00-436");
  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.range, "RP14.P04.M04.S10-RP14.P04.M04.S19");
  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.upstream_pack_id, "CP00-435");
  assert.equal(SETTLEMENT_CORE_CP436_PACK_BINDING.next_pack_id, "CP00-437");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M04"], 10);
});

test("CP00-436 p04 workflow slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp436P04WorkflowSliceCaseSet();
  const descriptor = createSettlementCoreCp436P04WorkflowSliceDescriptor();
  const validation = validateSettlementCoreCp436P04WorkflowSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-436 evidence packets and handoff preserve p04 workflow slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp436P04WorkflowSliceDescriptor();
  const hermes = createSettlementCoreCp436HermesEvidencePacket(cp436PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp436ClaudeReviewPacket(cp436PlanPack);
  const handoff = createSettlementCoreCp436CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-436-to-CP00-437");
  assert.equal(handoff.next_subphase_id, "RP14.P04.M04.S20");
  assert.equal(handoff.production_ready_flag, "settlement_core_p04_workflow_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-437 plan binding covers the planned 150 RP14 p04 closeout p05 foundation units", () => {
  const coverage = validateSettlementCoreCp437Coverage(cp437PlanPack);

  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, "CP00-437");
  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.range, "RP14.P04.M04.S20-RP14.P05.M02.S09");
  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.upstream_pack_id, "CP00-436");
  assert.equal(SETTLEMENT_CORE_CP437_PACK_BINDING.next_pack_id, "CP00-438");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M04"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P04.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M02"], 9);
});

test("CP00-437 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp437P04CloseoutP05FoundationCaseSet();
  const descriptor = createSettlementCoreCp437P04CloseoutP05FoundationDescriptor();
  const validation = validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-437 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp437P04CloseoutP05FoundationDescriptor();
  const hermes = createSettlementCoreCp437HermesEvidencePacket(cp437PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp437ClaudeReviewPacket(cp437PlanPack);
  const handoff = createSettlementCoreCp437CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-437-to-CP00-438");
  assert.equal(handoff.next_subphase_id, "RP14.P05.M02.S10");
  assert.equal(handoff.production_ready_flag, "settlement_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-438 plan binding covers the planned 40 RP14 p05 implementation slice units", () => {
  const coverage = validateSettlementCoreCp438Coverage(cp438PlanPack);

  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, "CP00-438");
  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.range, "RP14.P05.M02.S10-RP14.P05.M04.S07");
  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.upstream_pack_id, "CP00-437");
  assert.equal(SETTLEMENT_CORE_CP438_PACK_BINDING.next_pack_id, "CP00-439");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M02"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M04"], 7);
});

test("CP00-438 p05 implementation slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp438P05ImplementationSliceCaseSet();
  const descriptor = createSettlementCoreCp438P05ImplementationSliceDescriptor();
  const validation = validateSettlementCoreCp438P05ImplementationSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-438 evidence packets and handoff preserve p05 implementation slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp438P05ImplementationSliceDescriptor();
  const hermes = createSettlementCoreCp438HermesEvidencePacket(cp438PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp438ClaudeReviewPacket(cp438PlanPack);
  const handoff = createSettlementCoreCp438CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-438-to-CP00-439");
  assert.equal(handoff.next_subphase_id, "RP14.P05.M04.S08");
  assert.equal(handoff.production_ready_flag, "settlement_core_p05_implementation_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-439 plan binding covers the planned 40 RP14 p05 workflow permission slice units", () => {
  const coverage = validateSettlementCoreCp439Coverage(cp439PlanPack);

  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, "CP00-439");
  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.range, "RP14.P05.M04.S08-RP14.P05.M06.S03");
  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.upstream_pack_id, "CP00-438");
  assert.equal(SETTLEMENT_CORE_CP439_PACK_BINDING.next_pack_id, "CP00-440");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M04"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M06"], 3);
});

test("CP00-439 p05 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp439P05WorkflowPermissionSliceCaseSet();
  const descriptor = createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor();
  const validation = validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-439 evidence packets and handoff preserve p05 workflow permission slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor();
  const hermes = createSettlementCoreCp439HermesEvidencePacket(cp439PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp439ClaudeReviewPacket(cp439PlanPack);
  const handoff = createSettlementCoreCp439CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-439-to-CP00-440");
  assert.equal(handoff.next_subphase_id, "RP14.P05.M06.S04");
  assert.equal(handoff.production_ready_flag, "settlement_core_p05_workflow_permission_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-440 plan binding covers the planned 150 RP14 p05 closeout p06 foundation units", () => {
  const coverage = validateSettlementCoreCp440Coverage(cp440PlanPack);

  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, "CP00-440");
  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.range, "RP14.P05.M06.S04-RP14.P06.M03.S02");
  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.upstream_pack_id, "CP00-439");
  assert.equal(SETTLEMENT_CORE_CP440_PACK_BINDING.next_pack_id, "CP00-441");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M06"], 19);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P05.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M00"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M03"], 2);
});

test("CP00-440 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp440P05CloseoutP06FoundationCaseSet();
  const descriptor = createSettlementCoreCp440P05CloseoutP06FoundationDescriptor();
  const validation = validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-440 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp440P05CloseoutP06FoundationDescriptor();
  const hermes = createSettlementCoreCp440HermesEvidencePacket(cp440PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp440ClaudeReviewPacket(cp440PlanPack);
  const handoff = createSettlementCoreCp440CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-440-to-CP00-441");
  assert.equal(handoff.next_subphase_id, "RP14.P06.M03.S03");
  assert.equal(handoff.production_ready_flag, "settlement_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-441 plan binding covers the planned 40 RP14 p06 implementation workflow slice units", () => {
  const coverage = validateSettlementCoreCp441Coverage(cp441PlanPack);

  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, "CP00-441");
  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.range, "RP14.P06.M03.S03-RP14.P06.M04.S20");
  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.upstream_pack_id, "CP00-440");
  assert.equal(SETTLEMENT_CORE_CP441_PACK_BINDING.next_pack_id, "CP00-442");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M04"], 20);
});

test("CP00-441 p06 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp441P06ImplementationWorkflowSliceCaseSet();
  const descriptor = createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor();
  const validation = validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-441 evidence packets and handoff preserve p06 implementation workflow slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor();
  const hermes = createSettlementCoreCp441HermesEvidencePacket(cp441PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp441ClaudeReviewPacket(cp441PlanPack);
  const handoff = createSettlementCoreCp441CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-441-to-CP00-442");
  assert.equal(handoff.next_subphase_id, "RP14.P06.M04.S21");
  assert.equal(handoff.production_ready_flag, "settlement_core_p06_implementation_workflow_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-442 plan binding covers the planned 10 RP14 p06 workflow permission slice units", () => {
  const coverage = validateSettlementCoreCp442Coverage(cp442PlanPack);

  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, "CP00-442");
  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.range, "RP14.P06.M04.S21-RP14.P06.M05.S08");
  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.upstream_pack_id, "CP00-441");
  assert.equal(SETTLEMENT_CORE_CP442_PACK_BINDING.next_pack_id, "CP00-443");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M04"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M05"], 8);
});

test("CP00-442 p06 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp442P06WorkflowPermissionSliceCaseSet();
  const descriptor = createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor();
  const validation = validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-442 evidence packets and handoff preserve p06 workflow permission slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor();
  const hermes = createSettlementCoreCp442HermesEvidencePacket(cp442PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp442ClaudeReviewPacket(cp442PlanPack);
  const handoff = createSettlementCoreCp442CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-442-to-CP00-443");
  assert.equal(handoff.next_subphase_id, "RP14.P06.M05.S09");
  assert.equal(handoff.production_ready_flag, "settlement_core_p06_workflow_permission_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-443 plan binding covers the planned 10 RP14 p06 permission slice units", () => {
  const coverage = validateSettlementCoreCp443Coverage(cp443PlanPack);

  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, "CP00-443");
  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.range, "RP14.P06.M05.S09-RP14.P06.M05.S18");
  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.upstream_pack_id, "CP00-442");
  assert.equal(SETTLEMENT_CORE_CP443_PACK_BINDING.next_pack_id, "CP00-444");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M05"], 10);
});

test("CP00-443 p06 permission slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp443P06PermissionSliceCaseSet();
  const descriptor = createSettlementCoreCp443P06PermissionSliceDescriptor();
  const validation = validateSettlementCoreCp443P06PermissionSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-443 evidence packets and handoff preserve p06 permission slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp443P06PermissionSliceDescriptor();
  const hermes = createSettlementCoreCp443HermesEvidencePacket(cp443PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp443ClaudeReviewPacket(cp443PlanPack);
  const handoff = createSettlementCoreCp443CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-443-to-CP00-444");
  assert.equal(handoff.next_subphase_id, "RP14.P06.M05.S19");
  assert.equal(handoff.production_ready_flag, "settlement_core_p06_permission_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-444 plan binding covers the planned 10 RP14 p06 permission fixture slice units", () => {
  const coverage = validateSettlementCoreCp444Coverage(cp444PlanPack);

  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, "CP00-444");
  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.range, "RP14.P06.M05.S19-RP14.P06.M06.S06");
  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.upstream_pack_id, "CP00-443");
  assert.equal(SETTLEMENT_CORE_CP444_PACK_BINDING.next_pack_id, "CP00-445");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M06"], 6);
});

test("CP00-444 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp444P06PermissionFixtureSliceCaseSet();
  const descriptor = createSettlementCoreCp444P06PermissionFixtureSliceDescriptor();
  const validation = validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-444 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp444P06PermissionFixtureSliceDescriptor();
  const hermes = createSettlementCoreCp444HermesEvidencePacket(cp444PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp444ClaudeReviewPacket(cp444PlanPack);
  const handoff = createSettlementCoreCp444CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-444-to-CP00-445");
  assert.equal(handoff.next_subphase_id, "RP14.P06.M06.S07");
  assert.equal(handoff.production_ready_flag, "settlement_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-445 plan binding covers the planned 150 RP14 p06 closeout p07 foundation units", () => {
  const coverage = validateSettlementCoreCp445Coverage(cp445PlanPack);

  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, "CP00-445");
  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.range, "RP14.P06.M06.S07-RP14.P07.M02.S15");
  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.upstream_pack_id, "CP00-444");
  assert.equal(SETTLEMENT_CORE_CP445_PACK_BINDING.next_pack_id, "CP00-446");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P06.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M00"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M02"], 15);
});

test("CP00-445 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp445P06CloseoutP07FoundationCaseSet();
  const descriptor = createSettlementCoreCp445P06CloseoutP07FoundationDescriptor();
  const validation = validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-445 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp445P06CloseoutP07FoundationDescriptor();
  const hermes = createSettlementCoreCp445HermesEvidencePacket(cp445PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp445ClaudeReviewPacket(cp445PlanPack);
  const handoff = createSettlementCoreCp445CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-445-to-CP00-446");
  assert.equal(handoff.next_subphase_id, "RP14.P07.M02.S16");
  assert.equal(handoff.production_ready_flag, "settlement_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-446 plan binding covers the planned 150 RP14 p07 foundation slice units", () => {
  const coverage = validateSettlementCoreCp446Coverage(cp446PlanPack);

  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, "CP00-446");
  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.range, "RP14.P07.M02.S16-RP14.P07.M09.S11");
  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.upstream_pack_id, "CP00-445");
  assert.equal(SETTLEMENT_CORE_CP446_PACK_BINDING.next_pack_id, "CP00-447");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M02"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M09"], 11);
});

test("CP00-446 p07 foundation slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp446P07FoundationSliceCaseSet();
  const descriptor = createSettlementCoreCp446P07FoundationSliceDescriptor();
  const validation = validateSettlementCoreCp446P07FoundationSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-446 evidence packets and handoff preserve p07 foundation slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp446P07FoundationSliceDescriptor();
  const hermes = createSettlementCoreCp446HermesEvidencePacket(cp446PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp446ClaudeReviewPacket(cp446PlanPack);
  const handoff = createSettlementCoreCp446CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-446-to-CP00-447");
  assert.equal(handoff.next_subphase_id, "RP14.P07.M09.S12");
  assert.equal(handoff.production_ready_flag, "settlement_core_p07_foundation_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-447 plan binding covers the planned 150 RP14 p07 closeout p08 foundation units", () => {
  const coverage = validateSettlementCoreCp447Coverage(cp447PlanPack);

  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, "CP00-447");
  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.range, "RP14.P07.M09.S12-RP14.P08.M06.S13");
  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.upstream_pack_id, "CP00-446");
  assert.equal(SETTLEMENT_CORE_CP447_PACK_BINDING.next_pack_id, "CP00-448");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M09"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP14.P07.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M06"], 13);
});

test("CP00-447 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp447P07CloseoutP08FoundationCaseSet();
  const descriptor = createSettlementCoreCp447P07CloseoutP08FoundationDescriptor();
  const validation = validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-447 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp447P07CloseoutP08FoundationDescriptor();
  const hermes = createSettlementCoreCp447HermesEvidencePacket(cp447PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp447ClaudeReviewPacket(cp447PlanPack);
  const handoff = createSettlementCoreCp447CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-447-to-CP00-448");
  assert.equal(handoff.next_subphase_id, "RP14.P08.M06.S14");
  assert.equal(handoff.production_ready_flag, "settlement_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-448 plan binding covers the planned 10 RP14 p08 fixture test slice units", () => {
  const coverage = validateSettlementCoreCp448Coverage(cp448PlanPack);

  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, "CP00-448");
  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.risk_class, "A");
  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.unit_count, 10);
  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.range, "RP14.P08.M06.S14-RP14.P08.M07.S01");
  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.upstream_pack_id, "CP00-447");
  assert.equal(SETTLEMENT_CORE_CP448_PACK_BINDING.next_pack_id, "CP00-449");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M06"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M07"], 1);
});

test("CP00-448 p08 fixture test slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp448P08FixtureTestSliceCaseSet();
  const descriptor = createSettlementCoreCp448P08FixtureTestSliceDescriptor();
  const validation = validateSettlementCoreCp448P08FixtureTestSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-448 evidence packets and handoff preserve p08 fixture test slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp448P08FixtureTestSliceDescriptor();
  const hermes = createSettlementCoreCp448HermesEvidencePacket(cp448PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp448ClaudeReviewPacket(cp448PlanPack);
  const handoff = createSettlementCoreCp448CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-448-to-CP00-449");
  assert.equal(handoff.next_subphase_id, "RP14.P08.M07.S02");
  assert.equal(handoff.production_ready_flag, "settlement_core_p08_fixture_test_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-449 plan binding covers the planned 40 RP14 p08 test hermes slice units", () => {
  const coverage = validateSettlementCoreCp449Coverage(cp449PlanPack);

  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, "CP00-449");
  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.range, "RP14.P08.M07.S02-RP14.P08.M08.S19");
  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.upstream_pack_id, "CP00-448");
  assert.equal(SETTLEMENT_CORE_CP449_PACK_BINDING.next_pack_id, "CP00-450");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M07"], 21);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M08"], 19);
});

test("CP00-449 p08 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp449P08TestHermesSliceCaseSet();
  const descriptor = createSettlementCoreCp449P08TestHermesSliceDescriptor();
  const validation = validateSettlementCoreCp449P08TestHermesSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-449 evidence packets and handoff preserve p08 test hermes slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp449P08TestHermesSliceDescriptor();
  const hermes = createSettlementCoreCp449HermesEvidencePacket(cp449PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp449ClaudeReviewPacket(cp449PlanPack);
  const handoff = createSettlementCoreCp449CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-449-to-CP00-450");
  assert.equal(handoff.next_subphase_id, "RP14.P08.M08.S20");
  assert.equal(handoff.production_ready_flag, "settlement_core_p08_test_hermes_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-450 plan binding covers the planned 150 RP14 p08 closeout p09 foundation units", () => {
  const coverage = validateSettlementCoreCp450Coverage(cp450PlanPack);

  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, "CP00-450");
  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.unit_count, 150);
  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.range, "RP14.P08.M08.S20-RP14.P09.M07.S09");
  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.upstream_pack_id, "CP00-449");
  assert.equal(SETTLEMENT_CORE_CP450_PACK_BINDING.next_pack_id, "CP00-451");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M08"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P08.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M00"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M02"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M07"], 9);
});

test("CP00-450 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp450P08CloseoutP09FoundationCaseSet();
  const descriptor = createSettlementCoreCp450P08CloseoutP09FoundationDescriptor();
  const validation = validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-450 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createSettlementCoreCp450P08CloseoutP09FoundationDescriptor();
  const hermes = createSettlementCoreCp450HermesEvidencePacket(cp450PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp450ClaudeReviewPacket(cp450PlanPack);
  const handoff = createSettlementCoreCp450CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-450-to-CP00-451");
  assert.equal(handoff.next_subphase_id, "RP14.P09.M07.S10");
  assert.equal(handoff.production_ready_flag, "settlement_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-451 plan binding covers the planned 40 RP14 p09 test hermes slice units", () => {
  const coverage = validateSettlementCoreCp451Coverage(cp451PlanPack);

  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, "CP00-451");
  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.risk_class, "B");
  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.unit_count, 40);
  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.range, "RP14.P09.M07.S10-RP14.P09.M09.S07");
  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.upstream_pack_id, "CP00-450");
  assert.equal(SETTLEMENT_CORE_CP451_PACK_BINDING.next_pack_id, "CP00-452");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M07"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M09"], 7);
});

test("CP00-451 p09 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp451P09TestHermesSliceCaseSet();
  const descriptor = createSettlementCoreCp451P09TestHermesSliceDescriptor();
  const validation = validateSettlementCoreCp451P09TestHermesSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-451 evidence packets and handoff preserve p09 test hermes slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp451P09TestHermesSliceDescriptor();
  const hermes = createSettlementCoreCp451HermesEvidencePacket(cp451PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp451ClaudeReviewPacket(cp451PlanPack);
  const handoff = createSettlementCoreCp451CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-451-to-CP00-452");
  assert.equal(handoff.next_subphase_id, "RP14.P09.M09.S08");
  assert.equal(handoff.production_ready_flag, "settlement_core_p09_test_hermes_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-452 plan binding covers the planned 23 RP14 p09 review closeout slice units", () => {
  const coverage = validateSettlementCoreCp452Coverage(cp452PlanPack);

  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id, "CP00-452");
  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.risk_class, "C");
  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.unit_count, 23);
  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.range, "RP14.P09.M09.S08-RP14.P09.M10.S10");
  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.upstream_pack_id, "CP00-451");
  assert.equal(SETTLEMENT_CORE_CP452_PACK_BINDING.next_pack_id, "CP00-453");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 23);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M09"], 13);
  assert.equal(coverage.summary.by_micro_phase["RP14.P09.M10"], 10);
});

test("CP00-452 p09 review closeout slice rows stay descriptor-only", () => {
  const caseSet = createSettlementCoreCp452P09ReviewCloseoutSliceCaseSet();
  const descriptor = createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor();
  const validation = validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(descriptor, settlementContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[settlementCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-452 evidence packets and handoff preserve p09 review closeout slice authority boundaries", () => {
  const descriptor = createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor();
  const hermes = createSettlementCoreCp452HermesEvidencePacket(cp452PlanPack, settlementContract, descriptor);
  const claude = createSettlementCoreCp452ClaudeReviewPacket(cp452PlanPack);
  const handoff = createSettlementCoreCp452CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H14");
  assert.equal(claude.gate, "C14");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-452-to-CP00-453");
  assert.equal(handoff.next_subphase_id, "RP15.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "settlement_core_p09_review_closeout_slice_descriptor_verified");
  assert.equal(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
