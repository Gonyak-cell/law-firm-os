import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP364_PACK_BINDING,
  BILLING_CORE_CP364_REQUIREMENTS,
  BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP365_PACK_BINDING,
  BILLING_CORE_CP365_REQUIREMENTS,
  BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP366_PACK_BINDING,
  BILLING_CORE_CP366_REQUIREMENTS,
  BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP367_PACK_BINDING,
  BILLING_CORE_CP367_REQUIREMENTS,
  BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP368_PACK_BINDING,
  BILLING_CORE_CP368_REQUIREMENTS,
  BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP369_PACK_BINDING,
  BILLING_CORE_CP369_REQUIREMENTS,
  BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP370_PACK_BINDING,
  BILLING_CORE_CP370_REQUIREMENTS,
  BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP371_PACK_BINDING,
  BILLING_CORE_CP371_REQUIREMENTS,
  BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP372_PACK_BINDING,
  BILLING_CORE_CP372_REQUIREMENTS,
  BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP373_PACK_BINDING,
  BILLING_CORE_CP373_REQUIREMENTS,
  BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP374_PACK_BINDING,
  BILLING_CORE_CP374_REQUIREMENTS,
  BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP375_PACK_BINDING,
  BILLING_CORE_CP375_REQUIREMENTS,
  BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP376_PACK_BINDING,
  BILLING_CORE_CP376_REQUIREMENTS,
  BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP377_PACK_BINDING,
  BILLING_CORE_CP377_REQUIREMENTS,
  BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP378_PACK_BINDING,
  BILLING_CORE_CP378_REQUIREMENTS,
  BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP379_PACK_BINDING,
  BILLING_CORE_CP379_REQUIREMENTS,
  BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP380_PACK_BINDING,
  BILLING_CORE_CP380_REQUIREMENTS,
  BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP381_PACK_BINDING,
  BILLING_CORE_CP381_REQUIREMENTS,
  BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP382_PACK_BINDING,
  BILLING_CORE_CP382_REQUIREMENTS,
  BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP383_PACK_BINDING,
  BILLING_CORE_CP383_REQUIREMENTS,
  BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP384_PACK_BINDING,
  BILLING_CORE_CP384_REQUIREMENTS,
  BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP385_PACK_BINDING,
  BILLING_CORE_CP385_REQUIREMENTS,
  BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP386_PACK_BINDING,
  BILLING_CORE_CP386_REQUIREMENTS,
  BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP387_PACK_BINDING,
  BILLING_CORE_CP387_REQUIREMENTS,
  BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP388_PACK_BINDING,
  BILLING_CORE_CP388_REQUIREMENTS,
  BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP389_PACK_BINDING,
  BILLING_CORE_CP389_REQUIREMENTS,
  BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP390_PACK_BINDING,
  BILLING_CORE_CP390_REQUIREMENTS,
  BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP391_PACK_BINDING,
  BILLING_CORE_CP391_REQUIREMENTS,
  BILLING_CORE_PROGRAM_CONTRACT,
  createBillingCoreCp364ClaudeReviewPacket,
  createBillingCoreCp364CloseoutHandoff,
  createBillingCoreCp364HermesEvidencePacket,
  createBillingCoreCp364ScopeContractFoundationCaseSet,
  createBillingCoreCp364ScopeContractFoundationDescriptor,
  createBillingCoreCp365ClaudeReviewPacket,
  createBillingCoreCp365CloseoutHandoff,
  createBillingCoreCp365HermesEvidencePacket,
  createBillingCoreCp365ModelFoundationSliceCaseSet,
  createBillingCoreCp365ModelFoundationSliceDescriptor,
  createBillingCoreCp366ClaudeReviewPacket,
  createBillingCoreCp366CloseoutHandoff,
  createBillingCoreCp366HermesEvidencePacket,
  createBillingCoreCp366WorkflowPermissionSliceCaseSet,
  createBillingCoreCp366WorkflowPermissionSliceDescriptor,
  createBillingCoreCp367ClaudeReviewPacket,
  createBillingCoreCp367CloseoutHandoff,
  createBillingCoreCp367HermesEvidencePacket,
  createBillingCoreCp367P01CloseoutP02FoundationCaseSet,
  createBillingCoreCp367P01CloseoutP02FoundationDescriptor,
  createBillingCoreCp368ClaudeReviewPacket,
  createBillingCoreCp368CloseoutHandoff,
  createBillingCoreCp368HermesEvidencePacket,
  createBillingCoreCp368P02ImplementationSliceCaseSet,
  createBillingCoreCp368P02ImplementationSliceDescriptor,
  createBillingCoreCp369ClaudeReviewPacket,
  createBillingCoreCp369CloseoutHandoff,
  createBillingCoreCp369HermesEvidencePacket,
  createBillingCoreCp369P02PermissionFixtureSliceCaseSet,
  createBillingCoreCp369P02PermissionFixtureSliceDescriptor,
  createBillingCoreCp370ClaudeReviewPacket,
  createBillingCoreCp370CloseoutHandoff,
  createBillingCoreCp370HermesEvidencePacket,
  createBillingCoreCp370P02FixtureTestSliceCaseSet,
  createBillingCoreCp370P02FixtureTestSliceDescriptor,
  createBillingCoreCp371ClaudeReviewPacket,
  createBillingCoreCp371CloseoutHandoff,
  createBillingCoreCp371HermesEvidencePacket,
  createBillingCoreCp371P02TestSliceCaseSet,
  createBillingCoreCp371P02TestSliceDescriptor,
  createBillingCoreCp372ClaudeReviewPacket,
  createBillingCoreCp372CloseoutHandoff,
  createBillingCoreCp372HermesEvidencePacket,
  createBillingCoreCp372P02TestHermesSliceCaseSet,
  createBillingCoreCp372P02TestHermesSliceDescriptor,
  createBillingCoreCp373ClaudeReviewPacket,
  createBillingCoreCp373CloseoutHandoff,
  createBillingCoreCp373HermesEvidencePacket,
  createBillingCoreCp373P02CloseoutP03FoundationCaseSet,
  createBillingCoreCp373P02CloseoutP03FoundationDescriptor,
  createBillingCoreCp374ClaudeReviewPacket,
  createBillingCoreCp374CloseoutHandoff,
  createBillingCoreCp374HermesEvidencePacket,
  createBillingCoreCp374P03CloseoutP04FoundationCaseSet,
  createBillingCoreCp374P03CloseoutP04FoundationDescriptor,
  createBillingCoreCp375ClaudeReviewPacket,
  createBillingCoreCp375CloseoutHandoff,
  createBillingCoreCp375HermesEvidencePacket,
  createBillingCoreCp375P04WorkflowPermissionSliceCaseSet,
  createBillingCoreCp375P04WorkflowPermissionSliceDescriptor,
  createBillingCoreCp376ClaudeReviewPacket,
  createBillingCoreCp376CloseoutHandoff,
  createBillingCoreCp376HermesEvidencePacket,
  createBillingCoreCp376P04PermissionFixtureSliceCaseSet,
  createBillingCoreCp376P04PermissionFixtureSliceDescriptor,
  createBillingCoreCp377ClaudeReviewPacket,
  createBillingCoreCp377CloseoutHandoff,
  createBillingCoreCp377HermesEvidencePacket,
  createBillingCoreCp377P04CloseoutP05FoundationCaseSet,
  createBillingCoreCp377P04CloseoutP05FoundationDescriptor,
  createBillingCoreCp378ClaudeReviewPacket,
  createBillingCoreCp378CloseoutHandoff,
  createBillingCoreCp378HermesEvidencePacket,
  createBillingCoreCp378P05ImplementationSliceCaseSet,
  createBillingCoreCp378P05ImplementationSliceDescriptor,
  createBillingCoreCp379ClaudeReviewPacket,
  createBillingCoreCp379CloseoutHandoff,
  createBillingCoreCp379HermesEvidencePacket,
  createBillingCoreCp379P05CloseoutP06FoundationCaseSet,
  createBillingCoreCp379P05CloseoutP06FoundationDescriptor,
  createBillingCoreCp380ClaudeReviewPacket,
  createBillingCoreCp380CloseoutHandoff,
  createBillingCoreCp380HermesEvidencePacket,
  createBillingCoreCp380P06FoundationSliceCaseSet,
  createBillingCoreCp380P06FoundationSliceDescriptor,
  createBillingCoreCp381ClaudeReviewPacket,
  createBillingCoreCp381CloseoutHandoff,
  createBillingCoreCp381HermesEvidencePacket,
  createBillingCoreCp381P06TestHermesSliceCaseSet,
  createBillingCoreCp381P06TestHermesSliceDescriptor,
  createBillingCoreCp382ClaudeReviewPacket,
  createBillingCoreCp382CloseoutHandoff,
  createBillingCoreCp382HermesEvidencePacket,
  createBillingCoreCp382P06CloseoutP07FoundationCaseSet,
  createBillingCoreCp382P06CloseoutP07FoundationDescriptor,
  createBillingCoreCp383ClaudeReviewPacket,
  createBillingCoreCp383CloseoutHandoff,
  createBillingCoreCp383HermesEvidencePacket,
  createBillingCoreCp383P07PermissionSliceCaseSet,
  createBillingCoreCp383P07PermissionSliceDescriptor,
  createBillingCoreCp384ClaudeReviewPacket,
  createBillingCoreCp384CloseoutHandoff,
  createBillingCoreCp384HermesEvidencePacket,
  createBillingCoreCp384P07PermissionFixtureSliceCaseSet,
  createBillingCoreCp384P07PermissionFixtureSliceDescriptor,
  createBillingCoreCp385ClaudeReviewPacket,
  createBillingCoreCp385CloseoutHandoff,
  createBillingCoreCp385HermesEvidencePacket,
  createBillingCoreCp385P07CloseoutP08FoundationCaseSet,
  createBillingCoreCp385P07CloseoutP08FoundationDescriptor,
  createBillingCoreCp386ClaudeReviewPacket,
  createBillingCoreCp386CloseoutHandoff,
  createBillingCoreCp386HermesEvidencePacket,
  createBillingCoreCp386P08ImplementationSliceCaseSet,
  createBillingCoreCp386P08ImplementationSliceDescriptor,
  createBillingCoreCp387ClaudeReviewPacket,
  createBillingCoreCp387CloseoutHandoff,
  createBillingCoreCp387HermesEvidencePacket,
  createBillingCoreCp387P08WorkflowPermissionSliceCaseSet,
  createBillingCoreCp387P08WorkflowPermissionSliceDescriptor,
  createBillingCoreCp388ClaudeReviewPacket,
  createBillingCoreCp388CloseoutHandoff,
  createBillingCoreCp388HermesEvidencePacket,
  createBillingCoreCp388P08CloseoutP09FoundationCaseSet,
  createBillingCoreCp388P08CloseoutP09FoundationDescriptor,
  createBillingCoreCp389ClaudeReviewPacket,
  createBillingCoreCp389CloseoutHandoff,
  createBillingCoreCp389HermesEvidencePacket,
  createBillingCoreCp389P09WorkflowPermissionSliceCaseSet,
  createBillingCoreCp389P09WorkflowPermissionSliceDescriptor,
  createBillingCoreCp390ClaudeReviewPacket,
  createBillingCoreCp390CloseoutHandoff,
  createBillingCoreCp390HermesEvidencePacket,
  createBillingCoreCp390P09PermissionFixtureSliceCaseSet,
  createBillingCoreCp390P09PermissionFixtureSliceDescriptor,
  createBillingCoreCp391ClaudeReviewPacket,
  createBillingCoreCp391CloseoutHandoff,
  createBillingCoreCp391HermesEvidencePacket,
  createBillingCoreCp391P09CloseoutSliceCaseSet,
  createBillingCoreCp391P09CloseoutSliceDescriptor,
  billingCoreRowKey,
  validateBillingCoreCp364Coverage,
  validateBillingCoreCp364ScopeContractFoundationDescriptor,
  validateBillingCoreCp365Coverage,
  validateBillingCoreCp365ModelFoundationSliceDescriptor,
  validateBillingCoreCp366Coverage,
  validateBillingCoreCp366WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp367Coverage,
  validateBillingCoreCp367P01CloseoutP02FoundationDescriptor,
  validateBillingCoreCp368Coverage,
  validateBillingCoreCp368P02ImplementationSliceDescriptor,
  validateBillingCoreCp369Coverage,
  validateBillingCoreCp369P02PermissionFixtureSliceDescriptor,
  validateBillingCoreCp370Coverage,
  validateBillingCoreCp370P02FixtureTestSliceDescriptor,
  validateBillingCoreCp371Coverage,
  validateBillingCoreCp371P02TestSliceDescriptor,
  validateBillingCoreCp372Coverage,
  validateBillingCoreCp372P02TestHermesSliceDescriptor,
  validateBillingCoreCp373Coverage,
  validateBillingCoreCp373P02CloseoutP03FoundationDescriptor,
  validateBillingCoreCp374Coverage,
  validateBillingCoreCp374P03CloseoutP04FoundationDescriptor,
  validateBillingCoreCp375Coverage,
  validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp376Coverage,
  validateBillingCoreCp376P04PermissionFixtureSliceDescriptor,
  validateBillingCoreCp377Coverage,
  validateBillingCoreCp377P04CloseoutP05FoundationDescriptor,
  validateBillingCoreCp378Coverage,
  validateBillingCoreCp378P05ImplementationSliceDescriptor,
  validateBillingCoreCp379Coverage,
  validateBillingCoreCp379P05CloseoutP06FoundationDescriptor,
  validateBillingCoreCp380Coverage,
  validateBillingCoreCp380P06FoundationSliceDescriptor,
  validateBillingCoreCp381Coverage,
  validateBillingCoreCp381P06TestHermesSliceDescriptor,
  validateBillingCoreCp382Coverage,
  validateBillingCoreCp382P06CloseoutP07FoundationDescriptor,
  validateBillingCoreCp383Coverage,
  validateBillingCoreCp383P07PermissionSliceDescriptor,
  validateBillingCoreCp384Coverage,
  validateBillingCoreCp384P07PermissionFixtureSliceDescriptor,
  validateBillingCoreCp385Coverage,
  validateBillingCoreCp385P07CloseoutP08FoundationDescriptor,
  validateBillingCoreCp386Coverage,
  validateBillingCoreCp386P08ImplementationSliceDescriptor,
  validateBillingCoreCp387Coverage,
  validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp388Coverage,
  validateBillingCoreCp388P08CloseoutP09FoundationDescriptor,
  validateBillingCoreCp389Coverage,
  validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor,
  validateBillingCoreCp390Coverage,
  validateBillingCoreCp390P09PermissionFixtureSliceDescriptor,
  validateBillingCoreCp391Coverage,
  validateBillingCoreCp391P09CloseoutSliceDescriptor,
} from "../src/index.js";

const billingContract = JSON.parse(
  readFileSync(new URL("../../../contracts/billing-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp364ManifestPath = new URL("../../../docs/closeout-packs/cp00-364/manifest.json", import.meta.url);
const cp364Manifest = existsSync(cp364ManifestPath) ? JSON.parse(readFileSync(cp364ManifestPath, "utf8")) : null;
const cp364PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-364") ?? cp364Manifest?.plan_binding_snapshot;
const cp365ManifestPath = new URL("../../../docs/closeout-packs/cp00-365/manifest.json", import.meta.url);
const cp365Manifest = existsSync(cp365ManifestPath) ? JSON.parse(readFileSync(cp365ManifestPath, "utf8")) : null;
const cp365PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-365") ?? cp365Manifest?.plan_binding_snapshot;
const cp366ManifestPath = new URL("../../../docs/closeout-packs/cp00-366/manifest.json", import.meta.url);
const cp366Manifest = existsSync(cp366ManifestPath) ? JSON.parse(readFileSync(cp366ManifestPath, "utf8")) : null;
const cp366PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-366") ?? cp366Manifest?.plan_binding_snapshot;
const cp367ManifestPath = new URL("../../../docs/closeout-packs/cp00-367/manifest.json", import.meta.url);
const cp367Manifest = existsSync(cp367ManifestPath) ? JSON.parse(readFileSync(cp367ManifestPath, "utf8")) : null;
const cp367PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-367") ?? cp367Manifest?.plan_binding_snapshot;
const cp368ManifestPath = new URL("../../../docs/closeout-packs/cp00-368/manifest.json", import.meta.url);
const cp368Manifest = existsSync(cp368ManifestPath) ? JSON.parse(readFileSync(cp368ManifestPath, "utf8")) : null;
const cp368PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-368") ?? cp368Manifest?.plan_binding_snapshot;
const cp369ManifestPath = new URL("../../../docs/closeout-packs/cp00-369/manifest.json", import.meta.url);
const cp369Manifest = existsSync(cp369ManifestPath) ? JSON.parse(readFileSync(cp369ManifestPath, "utf8")) : null;
const cp369PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-369") ?? cp369Manifest?.plan_binding_snapshot;
const cp370ManifestPath = new URL("../../../docs/closeout-packs/cp00-370/manifest.json", import.meta.url);
const cp370Manifest = existsSync(cp370ManifestPath) ? JSON.parse(readFileSync(cp370ManifestPath, "utf8")) : null;
const cp370PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-370") ?? cp370Manifest?.plan_binding_snapshot;
const cp371ManifestPath = new URL("../../../docs/closeout-packs/cp00-371/manifest.json", import.meta.url);
const cp371Manifest = existsSync(cp371ManifestPath) ? JSON.parse(readFileSync(cp371ManifestPath, "utf8")) : null;
const cp371PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-371") ?? cp371Manifest?.plan_binding_snapshot;
const cp372ManifestPath = new URL("../../../docs/closeout-packs/cp00-372/manifest.json", import.meta.url);
const cp372Manifest = existsSync(cp372ManifestPath) ? JSON.parse(readFileSync(cp372ManifestPath, "utf8")) : null;
const cp372PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-372") ?? cp372Manifest?.plan_binding_snapshot;
const cp373ManifestPath = new URL("../../../docs/closeout-packs/cp00-373/manifest.json", import.meta.url);
const cp373Manifest = existsSync(cp373ManifestPath) ? JSON.parse(readFileSync(cp373ManifestPath, "utf8")) : null;
const cp373PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-373") ?? cp373Manifest?.plan_binding_snapshot;
const cp374ManifestPath = new URL("../../../docs/closeout-packs/cp00-374/manifest.json", import.meta.url);
const cp374Manifest = existsSync(cp374ManifestPath) ? JSON.parse(readFileSync(cp374ManifestPath, "utf8")) : null;
const cp374PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-374") ?? cp374Manifest?.plan_binding_snapshot;
const cp375ManifestPath = new URL("../../../docs/closeout-packs/cp00-375/manifest.json", import.meta.url);
const cp375Manifest = existsSync(cp375ManifestPath) ? JSON.parse(readFileSync(cp375ManifestPath, "utf8")) : null;
const cp375PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-375") ?? cp375Manifest?.plan_binding_snapshot;
const cp376ManifestPath = new URL("../../../docs/closeout-packs/cp00-376/manifest.json", import.meta.url);
const cp376Manifest = existsSync(cp376ManifestPath) ? JSON.parse(readFileSync(cp376ManifestPath, "utf8")) : null;
const cp376PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-376") ?? cp376Manifest?.plan_binding_snapshot;
const cp377ManifestPath = new URL("../../../docs/closeout-packs/cp00-377/manifest.json", import.meta.url);
const cp377Manifest = existsSync(cp377ManifestPath) ? JSON.parse(readFileSync(cp377ManifestPath, "utf8")) : null;
const cp377PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-377") ?? cp377Manifest?.plan_binding_snapshot;
const cp378ManifestPath = new URL("../../../docs/closeout-packs/cp00-378/manifest.json", import.meta.url);
const cp378Manifest = existsSync(cp378ManifestPath) ? JSON.parse(readFileSync(cp378ManifestPath, "utf8")) : null;
const cp378PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-378") ?? cp378Manifest?.plan_binding_snapshot;
const cp379ManifestPath = new URL("../../../docs/closeout-packs/cp00-379/manifest.json", import.meta.url);
const cp379Manifest = existsSync(cp379ManifestPath) ? JSON.parse(readFileSync(cp379ManifestPath, "utf8")) : null;
const cp379PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-379") ?? cp379Manifest?.plan_binding_snapshot;
const cp380ManifestPath = new URL("../../../docs/closeout-packs/cp00-380/manifest.json", import.meta.url);
const cp380Manifest = existsSync(cp380ManifestPath) ? JSON.parse(readFileSync(cp380ManifestPath, "utf8")) : null;
const cp380PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-380") ?? cp380Manifest?.plan_binding_snapshot;
const cp381ManifestPath = new URL("../../../docs/closeout-packs/cp00-381/manifest.json", import.meta.url);
const cp381Manifest = existsSync(cp381ManifestPath) ? JSON.parse(readFileSync(cp381ManifestPath, "utf8")) : null;
const cp381PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-381") ?? cp381Manifest?.plan_binding_snapshot;
const cp382ManifestPath = new URL("../../../docs/closeout-packs/cp00-382/manifest.json", import.meta.url);
const cp382Manifest = existsSync(cp382ManifestPath) ? JSON.parse(readFileSync(cp382ManifestPath, "utf8")) : null;
const cp382PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-382") ?? cp382Manifest?.plan_binding_snapshot;
const cp383ManifestPath = new URL("../../../docs/closeout-packs/cp00-383/manifest.json", import.meta.url);
const cp383Manifest = existsSync(cp383ManifestPath) ? JSON.parse(readFileSync(cp383ManifestPath, "utf8")) : null;
const cp383PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-383") ?? cp383Manifest?.plan_binding_snapshot;
const cp384ManifestPath = new URL("../../../docs/closeout-packs/cp00-384/manifest.json", import.meta.url);
const cp384Manifest = existsSync(cp384ManifestPath) ? JSON.parse(readFileSync(cp384ManifestPath, "utf8")) : null;
const cp384PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-384") ?? cp384Manifest?.plan_binding_snapshot;
const cp385ManifestPath = new URL("../../../docs/closeout-packs/cp00-385/manifest.json", import.meta.url);
const cp385Manifest = existsSync(cp385ManifestPath) ? JSON.parse(readFileSync(cp385ManifestPath, "utf8")) : null;
const cp385PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-385") ?? cp385Manifest?.plan_binding_snapshot;
const cp386ManifestPath = new URL("../../../docs/closeout-packs/cp00-386/manifest.json", import.meta.url);
const cp386Manifest = existsSync(cp386ManifestPath) ? JSON.parse(readFileSync(cp386ManifestPath, "utf8")) : null;
const cp386PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-386") ?? cp386Manifest?.plan_binding_snapshot;
const cp387ManifestPath = new URL("../../../docs/closeout-packs/cp00-387/manifest.json", import.meta.url);
const cp387Manifest = existsSync(cp387ManifestPath) ? JSON.parse(readFileSync(cp387ManifestPath, "utf8")) : null;
const cp387PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-387") ?? cp387Manifest?.plan_binding_snapshot;
const cp388ManifestPath = new URL("../../../docs/closeout-packs/cp00-388/manifest.json", import.meta.url);
const cp388Manifest = existsSync(cp388ManifestPath) ? JSON.parse(readFileSync(cp388ManifestPath, "utf8")) : null;
const cp388PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-388") ?? cp388Manifest?.plan_binding_snapshot;
const cp389ManifestPath = new URL("../../../docs/closeout-packs/cp00-389/manifest.json", import.meta.url);
const cp389Manifest = existsSync(cp389ManifestPath) ? JSON.parse(readFileSync(cp389ManifestPath, "utf8")) : null;
const cp389PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-389") ?? cp389Manifest?.plan_binding_snapshot;
const cp390ManifestPath = new URL("../../../docs/closeout-packs/cp00-390/manifest.json", import.meta.url);
const cp390Manifest = existsSync(cp390ManifestPath) ? JSON.parse(readFileSync(cp390ManifestPath, "utf8")) : null;
const cp390PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-390") ?? cp390Manifest?.plan_binding_snapshot;
const cp391ManifestPath = new URL("../../../docs/closeout-packs/cp00-391/manifest.json", import.meta.url);
const cp391Manifest = existsSync(cp391ManifestPath) ? JSON.parse(readFileSync(cp391ManifestPath, "utf8")) : null;
const cp391PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-391") ?? cp391Manifest?.plan_binding_snapshot;

test("RP12 program contract pins the Billing descriptor-only bootstrap", () => {
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.program_id, "RP12");
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.program_title, "Billing And Invoicing");
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP11");
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.hermes_gate, "H12");
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.claude_gate, "C12");
  assert.equal(BILLING_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-364", "CP00-365", "CP00-366", "CP00-367", "CP00-368", "CP00-369", "CP00-370", "CP00-371", "CP00-372", "CP00-373", "CP00-374", "CP00-375", "CP00-376", "CP00-377", "CP00-378", "CP00-379", "CP00-380", "CP00-381", "CP00-382", "CP00-383", "CP00-384", "CP00-385", "CP00-386", "CP00-387", "CP00-388", "CP00-389", "CP00-390", "CP00-391"].includes(billingContract.current_pack.pack_id));
  assert.equal(billingContract.program.program_id, "RP12");
});

test("CP00-364 plan binding covers the planned 150 RP12 scope and model foundation units", () => {
  const coverage = validateBillingCoreCp364Coverage(cp364PlanPack);

  assert.equal(BILLING_CORE_CP364_PACK_BINDING.pack_id, "CP00-364");
  assert.equal(BILLING_CORE_CP364_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP364_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP364_PACK_BINDING.range, "RP12.P00.M00.S01-RP12.P01.M02.S08");
  assert.equal(BILLING_CORE_CP364_PACK_BINDING.upstream_pack_id, "CP00-363");
  assert.equal(BILLING_CORE_CP364_PACK_BINDING.next_pack_id, "CP00-365");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP12.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP12.P01"], 28);
  assert.equal(Object.keys(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-364 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp364ScopeContractFoundationCaseSet();
  const descriptor = createBillingCoreCp364ScopeContractFoundationDescriptor();
  const validation = validateBillingCoreCp364ScopeContractFoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP12.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.billing_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m00 = caseSet.sections["RP12.P01.M00"].rows;
  assert.equal(p01m00.state_transition_map.writes_state_transition, false);
  assert.equal(p01m00.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-364 evidence packets and handoff preserve billing bootstrap authority boundaries", () => {
  const descriptor = createBillingCoreCp364ScopeContractFoundationDescriptor();
  const hermes = createBillingCoreCp364HermesEvidencePacket(cp364PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp364ClaudeReviewPacket(cp364PlanPack);
  const handoff = createBillingCoreCp364CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-364-to-CP00-365");
  assert.equal(handoff.next_subphase_id, "RP12.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "billing_core_scope_contract_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP364_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP364_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-365 plan binding covers the planned 40 RP12 model foundation slice units", () => {
  const coverage = validateBillingCoreCp365Coverage(cp365PlanPack);

  assert.equal(BILLING_CORE_CP365_PACK_BINDING.pack_id, "CP00-365");
  assert.equal(BILLING_CORE_CP365_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP365_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP365_PACK_BINDING.range, "RP12.P01.M02.S09-RP12.P01.M04.S06");
  assert.equal(BILLING_CORE_CP365_PACK_BINDING.upstream_pack_id, "CP00-364");
  assert.equal(BILLING_CORE_CP365_PACK_BINDING.next_pack_id, "CP00-366");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M02"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M04"], 6);
});

test("CP00-365 model foundation slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp365ModelFoundationSliceCaseSet();
  const descriptor = createBillingCoreCp365ModelFoundationSliceDescriptor();
  const validation = validateBillingCoreCp365ModelFoundationSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP12.P01.M03"].rows;
  assert.equal(m03.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(m03.state_transition_map.writes_state_transition, false);
  assert.equal(m03.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-365 evidence packets and handoff preserve model foundation slice authority boundaries", () => {
  const descriptor = createBillingCoreCp365ModelFoundationSliceDescriptor();
  const hermes = createBillingCoreCp365HermesEvidencePacket(cp365PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp365ClaudeReviewPacket(cp365PlanPack);
  const handoff = createBillingCoreCp365CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-365-to-CP00-366");
  assert.equal(handoff.next_subphase_id, "RP12.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "billing_core_model_foundation_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP365_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP365_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-366 plan binding covers the planned 40 RP12 workflow permission slice units", () => {
  const coverage = validateBillingCoreCp366Coverage(cp366PlanPack);

  assert.equal(BILLING_CORE_CP366_PACK_BINDING.pack_id, "CP00-366");
  assert.equal(BILLING_CORE_CP366_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP366_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP366_PACK_BINDING.range, "RP12.P01.M04.S07-RP12.P01.M06.S04");
  assert.equal(BILLING_CORE_CP366_PACK_BINDING.upstream_pack_id, "CP00-365");
  assert.equal(BILLING_CORE_CP366_PACK_BINDING.next_pack_id, "CP00-367");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M04"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M06"], 4);
});

test("CP00-366 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp366WorkflowPermissionSliceCaseSet();
  const descriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor();
  const validation = validateBillingCoreCp366WorkflowPermissionSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP12.P01.M05"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-366 evidence packets and handoff preserve workflow permission slice authority boundaries", () => {
  const descriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor();
  const hermes = createBillingCoreCp366HermesEvidencePacket(cp366PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp366ClaudeReviewPacket(cp366PlanPack);
  const handoff = createBillingCoreCp366CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-366-to-CP00-367");
  assert.equal(handoff.next_subphase_id, "RP12.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "billing_core_workflow_permission_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP366_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP366_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-367 plan binding covers the planned 150 RP12 p01 closeout p02 foundation units", () => {
  const coverage = validateBillingCoreCp367Coverage(cp367PlanPack);

  assert.equal(BILLING_CORE_CP367_PACK_BINDING.pack_id, "CP00-367");
  assert.equal(BILLING_CORE_CP367_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP367_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP367_PACK_BINDING.range, "RP12.P01.M06.S05-RP12.P02.M02.S22");
  assert.equal(BILLING_CORE_CP367_PACK_BINDING.upstream_pack_id, "CP00-366");
  assert.equal(BILLING_CORE_CP367_PACK_BINDING.next_pack_id, "CP00-368");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P01.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M02"], 22);
});

test("CP00-367 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp367P01CloseoutP02FoundationCaseSet();
  const descriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor();
  const validation = validateBillingCoreCp367P01CloseoutP02FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP12.P01.M07"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-367 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor();
  const hermes = createBillingCoreCp367HermesEvidencePacket(cp367PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp367ClaudeReviewPacket(cp367PlanPack);
  const handoff = createBillingCoreCp367CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-367-to-CP00-368");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "billing_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP367_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP367_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-368 plan binding covers the planned 40 RP12 p02 implementation slice units", () => {
  const coverage = validateBillingCoreCp368Coverage(cp368PlanPack);

  assert.equal(BILLING_CORE_CP368_PACK_BINDING.pack_id, "CP00-368");
  assert.equal(BILLING_CORE_CP368_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP368_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP368_PACK_BINDING.range, "RP12.P02.M03.S01-RP12.P02.M04.S18");
  assert.equal(BILLING_CORE_CP368_PACK_BINDING.upstream_pack_id, "CP00-367");
  assert.equal(BILLING_CORE_CP368_PACK_BINDING.next_pack_id, "CP00-369");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M04"], 18);
});

test("CP00-368 p02 implementation slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp368P02ImplementationSliceCaseSet();
  const descriptor = createBillingCoreCp368P02ImplementationSliceDescriptor();
  const validation = validateBillingCoreCp368P02ImplementationSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-368 evidence packets and handoff preserve p02 implementation slice authority boundaries", () => {
  const descriptor = createBillingCoreCp368P02ImplementationSliceDescriptor();
  const hermes = createBillingCoreCp368HermesEvidencePacket(cp368PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp368ClaudeReviewPacket(cp368PlanPack);
  const handoff = createBillingCoreCp368CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-368-to-CP00-369");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M04.S19");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_implementation_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP368_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP368_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-369 plan binding covers the planned 40 RP12 p02 permission fixture slice units", () => {
  const coverage = validateBillingCoreCp369Coverage(cp369PlanPack);

  assert.equal(BILLING_CORE_CP369_PACK_BINDING.pack_id, "CP00-369");
  assert.equal(BILLING_CORE_CP369_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP369_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP369_PACK_BINDING.range, "RP12.P02.M04.S19-RP12.P02.M06.S14");
  assert.equal(BILLING_CORE_CP369_PACK_BINDING.upstream_pack_id, "CP00-368");
  assert.equal(BILLING_CORE_CP369_PACK_BINDING.next_pack_id, "CP00-370");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M04"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M06"], 14);
});

test("CP00-369 p02 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp369P02PermissionFixtureSliceCaseSet();
  const descriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor();
  const validation = validateBillingCoreCp369P02PermissionFixtureSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-369 evidence packets and handoff preserve p02 permission fixture slice authority boundaries", () => {
  const descriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor();
  const hermes = createBillingCoreCp369HermesEvidencePacket(cp369PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp369ClaudeReviewPacket(cp369PlanPack);
  const handoff = createBillingCoreCp369CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-369-to-CP00-370");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M06.S15");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_permission_fixture_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP369_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP369_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-370 plan binding covers the planned 10 RP12 p02 fixture test slice units", () => {
  const coverage = validateBillingCoreCp370Coverage(cp370PlanPack);

  assert.equal(BILLING_CORE_CP370_PACK_BINDING.pack_id, "CP00-370");
  assert.equal(BILLING_CORE_CP370_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP370_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP370_PACK_BINDING.range, "RP12.P02.M06.S15-RP12.P02.M07.S02");
  assert.equal(BILLING_CORE_CP370_PACK_BINDING.upstream_pack_id, "CP00-369");
  assert.equal(BILLING_CORE_CP370_PACK_BINDING.next_pack_id, "CP00-371");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M07"], 2);
});

test("CP00-370 p02 fixture test slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp370P02FixtureTestSliceCaseSet();
  const descriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor();
  const validation = validateBillingCoreCp370P02FixtureTestSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-370 evidence packets and handoff preserve p02 fixture test slice authority boundaries", () => {
  const descriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor();
  const hermes = createBillingCoreCp370HermesEvidencePacket(cp370PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp370ClaudeReviewPacket(cp370PlanPack);
  const handoff = createBillingCoreCp370CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-370-to-CP00-371");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M07.S03");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_fixture_test_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP370_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP370_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-371 plan binding covers the planned 10 RP12 p02 test slice units", () => {
  const coverage = validateBillingCoreCp371Coverage(cp371PlanPack);

  assert.equal(BILLING_CORE_CP371_PACK_BINDING.pack_id, "CP00-371");
  assert.equal(BILLING_CORE_CP371_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP371_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP371_PACK_BINDING.range, "RP12.P02.M07.S03-RP12.P02.M07.S12");
  assert.equal(BILLING_CORE_CP371_PACK_BINDING.upstream_pack_id, "CP00-370");
  assert.equal(BILLING_CORE_CP371_PACK_BINDING.next_pack_id, "CP00-372");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M07"], 10);
});

test("CP00-371 p02 test slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp371P02TestSliceCaseSet();
  const descriptor = createBillingCoreCp371P02TestSliceDescriptor();
  const validation = validateBillingCoreCp371P02TestSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-371 evidence packets and handoff preserve p02 test slice authority boundaries", () => {
  const descriptor = createBillingCoreCp371P02TestSliceDescriptor();
  const hermes = createBillingCoreCp371HermesEvidencePacket(cp371PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp371ClaudeReviewPacket(cp371PlanPack);
  const handoff = createBillingCoreCp371CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-371-to-CP00-372");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M07.S13");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_test_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP371_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP371_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-372 plan binding covers the planned 40 RP12 p02 test hermes slice units", () => {
  const coverage = validateBillingCoreCp372Coverage(cp372PlanPack);

  assert.equal(BILLING_CORE_CP372_PACK_BINDING.pack_id, "CP00-372");
  assert.equal(BILLING_CORE_CP372_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP372_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP372_PACK_BINDING.range, "RP12.P02.M07.S13-RP12.P02.M09.S08");
  assert.equal(BILLING_CORE_CP372_PACK_BINDING.upstream_pack_id, "CP00-371");
  assert.equal(BILLING_CORE_CP372_PACK_BINDING.next_pack_id, "CP00-373");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M09"], 8);
});

test("CP00-372 p02 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp372P02TestHermesSliceCaseSet();
  const descriptor = createBillingCoreCp372P02TestHermesSliceDescriptor();
  const validation = validateBillingCoreCp372P02TestHermesSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-372 evidence packets and handoff preserve p02 test hermes slice authority boundaries", () => {
  const descriptor = createBillingCoreCp372P02TestHermesSliceDescriptor();
  const hermes = createBillingCoreCp372HermesEvidencePacket(cp372PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp372ClaudeReviewPacket(cp372PlanPack);
  const handoff = createBillingCoreCp372CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-372-to-CP00-373");
  assert.equal(handoff.next_subphase_id, "RP12.P02.M09.S09");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_test_hermes_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP372_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP372_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-373 plan binding covers the planned 150 RP12 p02 closeout p03 foundation units", () => {
  const coverage = validateBillingCoreCp373Coverage(cp373PlanPack);

  assert.equal(BILLING_CORE_CP373_PACK_BINDING.pack_id, "CP00-373");
  assert.equal(BILLING_CORE_CP373_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP373_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP373_PACK_BINDING.range, "RP12.P02.M09.S09-RP12.P03.M06.S12");
  assert.equal(BILLING_CORE_CP373_PACK_BINDING.upstream_pack_id, "CP00-372");
  assert.equal(BILLING_CORE_CP373_PACK_BINDING.next_pack_id, "CP00-374");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M09"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP12.P02.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M06"], 12);
});

test("CP00-373 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp373P02CloseoutP03FoundationCaseSet();
  const descriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor();
  const validation = validateBillingCoreCp373P02CloseoutP03FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-373 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor();
  const hermes = createBillingCoreCp373HermesEvidencePacket(cp373PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp373ClaudeReviewPacket(cp373PlanPack);
  const handoff = createBillingCoreCp373CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-373-to-CP00-374");
  assert.equal(handoff.next_subphase_id, "RP12.P03.M06.S13");
  assert.equal(handoff.production_ready_flag, "billing_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP373_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP373_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-374 plan binding covers the planned 150 RP12 p03 closeout p04 foundation units", () => {
  const coverage = validateBillingCoreCp374Coverage(cp374PlanPack);

  assert.equal(BILLING_CORE_CP374_PACK_BINDING.pack_id, "CP00-374");
  assert.equal(BILLING_CORE_CP374_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP374_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP374_PACK_BINDING.range, "RP12.P03.M06.S13-RP12.P04.M03.S20");
  assert.equal(BILLING_CORE_CP374_PACK_BINDING.upstream_pack_id, "CP00-373");
  assert.equal(BILLING_CORE_CP374_PACK_BINDING.next_pack_id, "CP00-375");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P03.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M03"], 20);
});

test("CP00-374 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp374P03CloseoutP04FoundationCaseSet();
  const descriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor();
  const validation = validateBillingCoreCp374P03CloseoutP04FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-374 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor();
  const hermes = createBillingCoreCp374HermesEvidencePacket(cp374PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp374ClaudeReviewPacket(cp374PlanPack);
  const handoff = createBillingCoreCp374CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-374-to-CP00-375");
  assert.equal(handoff.next_subphase_id, "RP12.P04.M03.S21");
  assert.equal(handoff.production_ready_flag, "billing_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP374_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP374_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-375 plan binding covers the planned 40 RP12 p04 workflow permission slice units", () => {
  const coverage = validateBillingCoreCp375Coverage(cp375PlanPack);

  assert.equal(BILLING_CORE_CP375_PACK_BINDING.pack_id, "CP00-375");
  assert.equal(BILLING_CORE_CP375_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP375_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP375_PACK_BINDING.range, "RP12.P04.M03.S21-RP12.P04.M05.S16");
  assert.equal(BILLING_CORE_CP375_PACK_BINDING.upstream_pack_id, "CP00-374");
  assert.equal(BILLING_CORE_CP375_PACK_BINDING.next_pack_id, "CP00-376");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M03"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M05"], 16);
});

test("CP00-375 p04 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp375P04WorkflowPermissionSliceCaseSet();
  const descriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor();
  const validation = validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-375 evidence packets and handoff preserve p04 workflow permission slice authority boundaries", () => {
  const descriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor();
  const hermes = createBillingCoreCp375HermesEvidencePacket(cp375PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp375ClaudeReviewPacket(cp375PlanPack);
  const handoff = createBillingCoreCp375CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-375-to-CP00-376");
  assert.equal(handoff.next_subphase_id, "RP12.P04.M05.S17");
  assert.equal(handoff.production_ready_flag, "billing_core_p04_workflow_permission_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP375_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP375_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-376 plan binding covers the planned 10 RP12 p04 permission fixture slice units", () => {
  const coverage = validateBillingCoreCp376Coverage(cp376PlanPack);

  assert.equal(BILLING_CORE_CP376_PACK_BINDING.pack_id, "CP00-376");
  assert.equal(BILLING_CORE_CP376_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP376_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP376_PACK_BINDING.range, "RP12.P04.M05.S17-RP12.P04.M06.S04");
  assert.equal(BILLING_CORE_CP376_PACK_BINDING.upstream_pack_id, "CP00-375");
  assert.equal(BILLING_CORE_CP376_PACK_BINDING.next_pack_id, "CP00-377");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M06"], 4);
});

test("CP00-376 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp376P04PermissionFixtureSliceCaseSet();
  const descriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor();
  const validation = validateBillingCoreCp376P04PermissionFixtureSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-376 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor();
  const hermes = createBillingCoreCp376HermesEvidencePacket(cp376PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp376ClaudeReviewPacket(cp376PlanPack);
  const handoff = createBillingCoreCp376CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-376-to-CP00-377");
  assert.equal(handoff.next_subphase_id, "RP12.P04.M06.S05");
  assert.equal(handoff.production_ready_flag, "billing_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP376_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP376_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-377 plan binding covers the planned 150 RP12 p04 closeout p05 foundation units", () => {
  const coverage = validateBillingCoreCp377Coverage(cp377PlanPack);

  assert.equal(BILLING_CORE_CP377_PACK_BINDING.pack_id, "CP00-377");
  assert.equal(BILLING_CORE_CP377_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP377_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP377_PACK_BINDING.range, "RP12.P04.M06.S05-RP12.P05.M03.S08");
  assert.equal(BILLING_CORE_CP377_PACK_BINDING.upstream_pack_id, "CP00-376");
  assert.equal(BILLING_CORE_CP377_PACK_BINDING.next_pack_id, "CP00-378");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M06"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P04.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M03"], 8);
});

test("CP00-377 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp377P04CloseoutP05FoundationCaseSet();
  const descriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor();
  const validation = validateBillingCoreCp377P04CloseoutP05FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-377 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor();
  const hermes = createBillingCoreCp377HermesEvidencePacket(cp377PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp377ClaudeReviewPacket(cp377PlanPack);
  const handoff = createBillingCoreCp377CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-377-to-CP00-378");
  assert.equal(handoff.next_subphase_id, "RP12.P05.M03.S09");
  assert.equal(handoff.production_ready_flag, "billing_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP377_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP377_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-378 plan binding covers the planned 10 RP12 p05 implementation slice units", () => {
  const coverage = validateBillingCoreCp378Coverage(cp378PlanPack);

  assert.equal(BILLING_CORE_CP378_PACK_BINDING.pack_id, "CP00-378");
  assert.equal(BILLING_CORE_CP378_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP378_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP378_PACK_BINDING.range, "RP12.P05.M03.S09-RP12.P05.M03.S18");
  assert.equal(BILLING_CORE_CP378_PACK_BINDING.upstream_pack_id, "CP00-377");
  assert.equal(BILLING_CORE_CP378_PACK_BINDING.next_pack_id, "CP00-379");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M03"], 10);
});

test("CP00-378 p05 implementation slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp378P05ImplementationSliceCaseSet();
  const descriptor = createBillingCoreCp378P05ImplementationSliceDescriptor();
  const validation = validateBillingCoreCp378P05ImplementationSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-378 evidence packets and handoff preserve p05 implementation slice authority boundaries", () => {
  const descriptor = createBillingCoreCp378P05ImplementationSliceDescriptor();
  const hermes = createBillingCoreCp378HermesEvidencePacket(cp378PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp378ClaudeReviewPacket(cp378PlanPack);
  const handoff = createBillingCoreCp378CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-378-to-CP00-379");
  assert.equal(handoff.next_subphase_id, "RP12.P05.M03.S19");
  assert.equal(handoff.production_ready_flag, "billing_core_p05_implementation_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP378_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP378_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-379 plan binding covers the planned 150 RP12 p05 closeout p06 foundation units", () => {
  const coverage = validateBillingCoreCp379Coverage(cp379PlanPack);

  assert.equal(BILLING_CORE_CP379_PACK_BINDING.pack_id, "CP00-379");
  assert.equal(BILLING_CORE_CP379_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP379_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP379_PACK_BINDING.range, "RP12.P05.M03.S19-RP12.P06.M00.S06");
  assert.equal(BILLING_CORE_CP379_PACK_BINDING.upstream_pack_id, "CP00-378");
  assert.equal(BILLING_CORE_CP379_PACK_BINDING.next_pack_id, "CP00-380");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M03"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P05.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M00"], 6);
});

test("CP00-379 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp379P05CloseoutP06FoundationCaseSet();
  const descriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor();
  const validation = validateBillingCoreCp379P05CloseoutP06FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-379 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor();
  const hermes = createBillingCoreCp379HermesEvidencePacket(cp379PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp379ClaudeReviewPacket(cp379PlanPack);
  const handoff = createBillingCoreCp379CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-379-to-CP00-380");
  assert.equal(handoff.next_subphase_id, "RP12.P06.M00.S07");
  assert.equal(handoff.production_ready_flag, "billing_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP379_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP379_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-380 plan binding covers the planned 150 RP12 p06 foundation slice units", () => {
  const coverage = validateBillingCoreCp380Coverage(cp380PlanPack);

  assert.equal(BILLING_CORE_CP380_PACK_BINDING.pack_id, "CP00-380");
  assert.equal(BILLING_CORE_CP380_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP380_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP380_PACK_BINDING.range, "RP12.P06.M00.S07-RP12.P06.M07.S06");
  assert.equal(BILLING_CORE_CP380_PACK_BINDING.upstream_pack_id, "CP00-379");
  assert.equal(BILLING_CORE_CP380_PACK_BINDING.next_pack_id, "CP00-381");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M00"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M07"], 6);
});

test("CP00-380 p06 foundation slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp380P06FoundationSliceCaseSet();
  const descriptor = createBillingCoreCp380P06FoundationSliceDescriptor();
  const validation = validateBillingCoreCp380P06FoundationSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-380 evidence packets and handoff preserve p06 foundation slice authority boundaries", () => {
  const descriptor = createBillingCoreCp380P06FoundationSliceDescriptor();
  const hermes = createBillingCoreCp380HermesEvidencePacket(cp380PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp380ClaudeReviewPacket(cp380PlanPack);
  const handoff = createBillingCoreCp380CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-380-to-CP00-381");
  assert.equal(handoff.next_subphase_id, "RP12.P06.M07.S07");
  assert.equal(handoff.production_ready_flag, "billing_core_p06_foundation_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP380_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP380_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-381 plan binding covers the planned 40 RP12 p06 test hermes slice units", () => {
  const coverage = validateBillingCoreCp381Coverage(cp381PlanPack);

  assert.equal(BILLING_CORE_CP381_PACK_BINDING.pack_id, "CP00-381");
  assert.equal(BILLING_CORE_CP381_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP381_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP381_PACK_BINDING.range, "RP12.P06.M07.S07-RP12.P06.M09.S02");
  assert.equal(BILLING_CORE_CP381_PACK_BINDING.upstream_pack_id, "CP00-380");
  assert.equal(BILLING_CORE_CP381_PACK_BINDING.next_pack_id, "CP00-382");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M07"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M09"], 2);
});

test("CP00-381 p06 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp381P06TestHermesSliceCaseSet();
  const descriptor = createBillingCoreCp381P06TestHermesSliceDescriptor();
  const validation = validateBillingCoreCp381P06TestHermesSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-381 evidence packets and handoff preserve p06 test hermes slice authority boundaries", () => {
  const descriptor = createBillingCoreCp381P06TestHermesSliceDescriptor();
  const hermes = createBillingCoreCp381HermesEvidencePacket(cp381PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp381ClaudeReviewPacket(cp381PlanPack);
  const handoff = createBillingCoreCp381CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-381-to-CP00-382");
  assert.equal(handoff.next_subphase_id, "RP12.P06.M09.S03");
  assert.equal(handoff.production_ready_flag, "billing_core_p06_test_hermes_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP381_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP381_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-382 plan binding covers the planned 150 RP12 p06 closeout p07 foundation units", () => {
  const coverage = validateBillingCoreCp382Coverage(cp382PlanPack);

  assert.equal(BILLING_CORE_CP382_PACK_BINDING.pack_id, "CP00-382");
  assert.equal(BILLING_CORE_CP382_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP382_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP382_PACK_BINDING.range, "RP12.P06.M09.S03-RP12.P07.M05.S04");
  assert.equal(BILLING_CORE_CP382_PACK_BINDING.upstream_pack_id, "CP00-381");
  assert.equal(BILLING_CORE_CP382_PACK_BINDING.next_pack_id, "CP00-383");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P06.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M05"], 4);
});

test("CP00-382 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp382P06CloseoutP07FoundationCaseSet();
  const descriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor();
  const validation = validateBillingCoreCp382P06CloseoutP07FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-382 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor();
  const hermes = createBillingCoreCp382HermesEvidencePacket(cp382PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp382ClaudeReviewPacket(cp382PlanPack);
  const handoff = createBillingCoreCp382CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-382-to-CP00-383");
  assert.equal(handoff.next_subphase_id, "RP12.P07.M05.S05");
  assert.equal(handoff.production_ready_flag, "billing_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP382_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP382_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-383 plan binding covers the planned 10 RP12 p07 permission slice units", () => {
  const coverage = validateBillingCoreCp383Coverage(cp383PlanPack);

  assert.equal(BILLING_CORE_CP383_PACK_BINDING.pack_id, "CP00-383");
  assert.equal(BILLING_CORE_CP383_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP383_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP383_PACK_BINDING.range, "RP12.P07.M05.S05-RP12.P07.M05.S14");
  assert.equal(BILLING_CORE_CP383_PACK_BINDING.upstream_pack_id, "CP00-382");
  assert.equal(BILLING_CORE_CP383_PACK_BINDING.next_pack_id, "CP00-384");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M05"], 10);
});

test("CP00-383 p07 permission slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp383P07PermissionSliceCaseSet();
  const descriptor = createBillingCoreCp383P07PermissionSliceDescriptor();
  const validation = validateBillingCoreCp383P07PermissionSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-383 evidence packets and handoff preserve p07 permission slice authority boundaries", () => {
  const descriptor = createBillingCoreCp383P07PermissionSliceDescriptor();
  const hermes = createBillingCoreCp383HermesEvidencePacket(cp383PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp383ClaudeReviewPacket(cp383PlanPack);
  const handoff = createBillingCoreCp383CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-383-to-CP00-384");
  assert.equal(handoff.next_subphase_id, "RP12.P07.M05.S15");
  assert.equal(handoff.production_ready_flag, "billing_core_p07_permission_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP383_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP383_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-384 plan binding covers the planned 10 RP12 p07 permission fixture slice units", () => {
  const coverage = validateBillingCoreCp384Coverage(cp384PlanPack);

  assert.equal(BILLING_CORE_CP384_PACK_BINDING.pack_id, "CP00-384");
  assert.equal(BILLING_CORE_CP384_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP384_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP384_PACK_BINDING.range, "RP12.P07.M05.S15-RP12.P07.M06.S02");
  assert.equal(BILLING_CORE_CP384_PACK_BINDING.upstream_pack_id, "CP00-383");
  assert.equal(BILLING_CORE_CP384_PACK_BINDING.next_pack_id, "CP00-385");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M06"], 2);
});

test("CP00-384 p07 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp384P07PermissionFixtureSliceCaseSet();
  const descriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor();
  const validation = validateBillingCoreCp384P07PermissionFixtureSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-384 evidence packets and handoff preserve p07 permission fixture slice authority boundaries", () => {
  const descriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor();
  const hermes = createBillingCoreCp384HermesEvidencePacket(cp384PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp384ClaudeReviewPacket(cp384PlanPack);
  const handoff = createBillingCoreCp384CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-384-to-CP00-385");
  assert.equal(handoff.next_subphase_id, "RP12.P07.M06.S03");
  assert.equal(handoff.production_ready_flag, "billing_core_p07_permission_fixture_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP384_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP384_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-385 plan binding covers the planned 150 RP12 p07 closeout p08 foundation units", () => {
  const coverage = validateBillingCoreCp385Coverage(cp385PlanPack);

  assert.equal(BILLING_CORE_CP385_PACK_BINDING.pack_id, "CP00-385");
  assert.equal(BILLING_CORE_CP385_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP385_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP385_PACK_BINDING.range, "RP12.P07.M06.S03-RP12.P08.M02.S14");
  assert.equal(BILLING_CORE_CP385_PACK_BINDING.upstream_pack_id, "CP00-384");
  assert.equal(BILLING_CORE_CP385_PACK_BINDING.next_pack_id, "CP00-386");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P07.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M02"], 14);
});

test("CP00-385 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp385P07CloseoutP08FoundationCaseSet();
  const descriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor();
  const validation = validateBillingCoreCp385P07CloseoutP08FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-385 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor();
  const hermes = createBillingCoreCp385HermesEvidencePacket(cp385PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp385ClaudeReviewPacket(cp385PlanPack);
  const handoff = createBillingCoreCp385CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-385-to-CP00-386");
  assert.equal(handoff.next_subphase_id, "RP12.P08.M02.S15");
  assert.equal(handoff.production_ready_flag, "billing_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP385_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP385_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-386 plan binding covers the planned 40 RP12 p08 implementation slice units", () => {
  const coverage = validateBillingCoreCp386Coverage(cp386PlanPack);

  assert.equal(BILLING_CORE_CP386_PACK_BINDING.pack_id, "CP00-386");
  assert.equal(BILLING_CORE_CP386_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP386_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP386_PACK_BINDING.range, "RP12.P08.M02.S15-RP12.P08.M04.S12");
  assert.equal(BILLING_CORE_CP386_PACK_BINDING.upstream_pack_id, "CP00-385");
  assert.equal(BILLING_CORE_CP386_PACK_BINDING.next_pack_id, "CP00-387");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M04"], 12);
});

test("CP00-386 p08 implementation slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp386P08ImplementationSliceCaseSet();
  const descriptor = createBillingCoreCp386P08ImplementationSliceDescriptor();
  const validation = validateBillingCoreCp386P08ImplementationSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-386 evidence packets and handoff preserve p08 implementation slice authority boundaries", () => {
  const descriptor = createBillingCoreCp386P08ImplementationSliceDescriptor();
  const hermes = createBillingCoreCp386HermesEvidencePacket(cp386PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp386ClaudeReviewPacket(cp386PlanPack);
  const handoff = createBillingCoreCp386CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-386-to-CP00-387");
  assert.equal(handoff.next_subphase_id, "RP12.P08.M04.S13");
  assert.equal(handoff.production_ready_flag, "billing_core_p08_implementation_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP386_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP386_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-387 plan binding covers the planned 40 RP12 p08 workflow permission slice units", () => {
  const coverage = validateBillingCoreCp387Coverage(cp387PlanPack);

  assert.equal(BILLING_CORE_CP387_PACK_BINDING.pack_id, "CP00-387");
  assert.equal(BILLING_CORE_CP387_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP387_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP387_PACK_BINDING.range, "RP12.P08.M04.S13-RP12.P08.M06.S08");
  assert.equal(BILLING_CORE_CP387_PACK_BINDING.upstream_pack_id, "CP00-386");
  assert.equal(BILLING_CORE_CP387_PACK_BINDING.next_pack_id, "CP00-388");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M06"], 8);
});

test("CP00-387 p08 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp387P08WorkflowPermissionSliceCaseSet();
  const descriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor();
  const validation = validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-387 evidence packets and handoff preserve p08 workflow permission slice authority boundaries", () => {
  const descriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor();
  const hermes = createBillingCoreCp387HermesEvidencePacket(cp387PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp387ClaudeReviewPacket(cp387PlanPack);
  const handoff = createBillingCoreCp387CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-387-to-CP00-388");
  assert.equal(handoff.next_subphase_id, "RP12.P08.M06.S09");
  assert.equal(handoff.production_ready_flag, "billing_core_p08_workflow_permission_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP387_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP387_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-388 plan binding covers the planned 150 RP12 p08 closeout p09 foundation units", () => {
  const coverage = validateBillingCoreCp388Coverage(cp388PlanPack);

  assert.equal(BILLING_CORE_CP388_PACK_BINDING.pack_id, "CP00-388");
  assert.equal(BILLING_CORE_CP388_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP388_PACK_BINDING.unit_count, 150);
  assert.equal(BILLING_CORE_CP388_PACK_BINDING.range, "RP12.P08.M06.S09-RP12.P09.M03.S22");
  assert.equal(BILLING_CORE_CP388_PACK_BINDING.upstream_pack_id, "CP00-387");
  assert.equal(BILLING_CORE_CP388_PACK_BINDING.next_pack_id, "CP00-389");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P08.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M03"], 22);
});

test("CP00-388 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp388P08CloseoutP09FoundationCaseSet();
  const descriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor();
  const validation = validateBillingCoreCp388P08CloseoutP09FoundationDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-388 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor();
  const hermes = createBillingCoreCp388HermesEvidencePacket(cp388PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp388ClaudeReviewPacket(cp388PlanPack);
  const handoff = createBillingCoreCp388CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-388-to-CP00-389");
  assert.equal(handoff.next_subphase_id, "RP12.P09.M04.S01");
  assert.equal(handoff.production_ready_flag, "billing_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(BILLING_CORE_CP388_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP388_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-389 plan binding covers the planned 40 RP12 p09 workflow permission slice units", () => {
  const coverage = validateBillingCoreCp389Coverage(cp389PlanPack);

  assert.equal(BILLING_CORE_CP389_PACK_BINDING.pack_id, "CP00-389");
  assert.equal(BILLING_CORE_CP389_PACK_BINDING.risk_class, "B");
  assert.equal(BILLING_CORE_CP389_PACK_BINDING.unit_count, 40);
  assert.equal(BILLING_CORE_CP389_PACK_BINDING.range, "RP12.P09.M04.S01-RP12.P09.M05.S20");
  assert.equal(BILLING_CORE_CP389_PACK_BINDING.upstream_pack_id, "CP00-388");
  assert.equal(BILLING_CORE_CP389_PACK_BINDING.next_pack_id, "CP00-390");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M05"], 20);
});

test("CP00-389 p09 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp389P09WorkflowPermissionSliceCaseSet();
  const descriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor();
  const validation = validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-389 evidence packets and handoff preserve p09 workflow permission slice authority boundaries", () => {
  const descriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor();
  const hermes = createBillingCoreCp389HermesEvidencePacket(cp389PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp389ClaudeReviewPacket(cp389PlanPack);
  const handoff = createBillingCoreCp389CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-389-to-CP00-390");
  assert.equal(handoff.next_subphase_id, "RP12.P09.M05.S21");
  assert.equal(handoff.production_ready_flag, "billing_core_p09_workflow_permission_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP389_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP389_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-390 plan binding covers the planned 10 RP12 p09 permission fixture slice units", () => {
  const coverage = validateBillingCoreCp390Coverage(cp390PlanPack);

  assert.equal(BILLING_CORE_CP390_PACK_BINDING.pack_id, "CP00-390");
  assert.equal(BILLING_CORE_CP390_PACK_BINDING.risk_class, "A");
  assert.equal(BILLING_CORE_CP390_PACK_BINDING.unit_count, 10);
  assert.equal(BILLING_CORE_CP390_PACK_BINDING.range, "RP12.P09.M05.S21-RP12.P09.M06.S08");
  assert.equal(BILLING_CORE_CP390_PACK_BINDING.upstream_pack_id, "CP00-389");
  assert.equal(BILLING_CORE_CP390_PACK_BINDING.next_pack_id, "CP00-391");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M06"], 8);
});

test("CP00-390 p09 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp390P09PermissionFixtureSliceCaseSet();
  const descriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor();
  const validation = validateBillingCoreCp390P09PermissionFixtureSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-390 evidence packets and handoff preserve p09 permission fixture slice authority boundaries", () => {
  const descriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor();
  const hermes = createBillingCoreCp390HermesEvidencePacket(cp390PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp390ClaudeReviewPacket(cp390PlanPack);
  const handoff = createBillingCoreCp390CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-390-to-CP00-391");
  assert.equal(handoff.next_subphase_id, "RP12.P09.M06.S09");
  assert.equal(handoff.production_ready_flag, "billing_core_p09_permission_fixture_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP390_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP390_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-391 plan binding covers the planned 84 RP12 p09 closeout slice units", () => {
  const coverage = validateBillingCoreCp391Coverage(cp391PlanPack);

  assert.equal(BILLING_CORE_CP391_PACK_BINDING.pack_id, "CP00-391");
  assert.equal(BILLING_CORE_CP391_PACK_BINDING.risk_class, "C");
  assert.equal(BILLING_CORE_CP391_PACK_BINDING.unit_count, 84);
  assert.equal(BILLING_CORE_CP391_PACK_BINDING.range, "RP12.P09.M06.S09-RP12.P09.M10.S10");
  assert.equal(BILLING_CORE_CP391_PACK_BINDING.upstream_pack_id, "CP00-390");
  assert.equal(BILLING_CORE_CP391_PACK_BINDING.next_pack_id, "CP00-392");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 84);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M06"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP12.P09.M10"], 10);
});

test("CP00-391 p09 closeout slice rows stay descriptor-only", () => {
  const caseSet = createBillingCoreCp391P09CloseoutSliceCaseSet();
  const descriptor = createBillingCoreCp391P09CloseoutSliceDescriptor();
  const validation = validateBillingCoreCp391P09CloseoutSliceDescriptor(descriptor, billingContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[billingCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-391 evidence packets and handoff preserve p09 closeout slice authority boundaries", () => {
  const descriptor = createBillingCoreCp391P09CloseoutSliceDescriptor();
  const hermes = createBillingCoreCp391HermesEvidencePacket(cp391PlanPack, billingContract, descriptor);
  const claude = createBillingCoreCp391ClaudeReviewPacket(cp391PlanPack);
  const handoff = createBillingCoreCp391CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H12");
  assert.equal(claude.gate, "C12");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-391-to-CP00-392");
  assert.equal(handoff.next_subphase_id, "RP13.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "billing_core_p09_closeout_slice_descriptor_verified");
  assert.equal(BILLING_CORE_CP391_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(BILLING_CORE_CP391_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
