import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP392_PACK_BINDING,
  PAYMENTS_CORE_CP392_REQUIREMENTS,
  PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP393_PACK_BINDING,
  PAYMENTS_CORE_CP393_REQUIREMENTS,
  PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP394_PACK_BINDING,
  PAYMENTS_CORE_CP394_REQUIREMENTS,
  PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP395_PACK_BINDING,
  PAYMENTS_CORE_CP395_REQUIREMENTS,
  PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP396_PACK_BINDING,
  PAYMENTS_CORE_CP396_REQUIREMENTS,
  PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP397_PACK_BINDING,
  PAYMENTS_CORE_CP397_REQUIREMENTS,
  PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP398_PACK_BINDING,
  PAYMENTS_CORE_CP398_REQUIREMENTS,
  PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP399_PACK_BINDING,
  PAYMENTS_CORE_CP399_REQUIREMENTS,
  PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP400_PACK_BINDING,
  PAYMENTS_CORE_CP400_REQUIREMENTS,
  PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP401_PACK_BINDING,
  PAYMENTS_CORE_CP401_REQUIREMENTS,
  PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP402_PACK_BINDING,
  PAYMENTS_CORE_CP402_REQUIREMENTS,
  PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP403_PACK_BINDING,
  PAYMENTS_CORE_CP403_REQUIREMENTS,
  PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP404_PACK_BINDING,
  PAYMENTS_CORE_CP404_REQUIREMENTS,
  PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP405_PACK_BINDING,
  PAYMENTS_CORE_CP405_REQUIREMENTS,
  PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP406_PACK_BINDING,
  PAYMENTS_CORE_CP406_REQUIREMENTS,
  PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP407_PACK_BINDING,
  PAYMENTS_CORE_CP407_REQUIREMENTS,
  PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP408_PACK_BINDING,
  PAYMENTS_CORE_CP408_REQUIREMENTS,
  PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP409_PACK_BINDING,
  PAYMENTS_CORE_CP409_REQUIREMENTS,
  PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP410_PACK_BINDING,
  PAYMENTS_CORE_CP410_REQUIREMENTS,
  PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP411_PACK_BINDING,
  PAYMENTS_CORE_CP411_REQUIREMENTS,
  PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP412_PACK_BINDING,
  PAYMENTS_CORE_CP412_REQUIREMENTS,
  PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP413_PACK_BINDING,
  PAYMENTS_CORE_CP413_REQUIREMENTS,
  PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP414_PACK_BINDING,
  PAYMENTS_CORE_CP414_REQUIREMENTS,
  PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP415_PACK_BINDING,
  PAYMENTS_CORE_CP415_REQUIREMENTS,
  PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP416_PACK_BINDING,
  PAYMENTS_CORE_CP416_REQUIREMENTS,
  PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP417_PACK_BINDING,
  PAYMENTS_CORE_CP417_REQUIREMENTS,
  PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP418_PACK_BINDING,
  PAYMENTS_CORE_CP418_REQUIREMENTS,
  PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP419_PACK_BINDING,
  PAYMENTS_CORE_CP419_REQUIREMENTS,
  PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP420_PACK_BINDING,
  PAYMENTS_CORE_CP420_REQUIREMENTS,
  PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP421_PACK_BINDING,
  PAYMENTS_CORE_CP421_REQUIREMENTS,
  PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP422_PACK_BINDING,
  PAYMENTS_CORE_CP422_REQUIREMENTS,
  PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP423_PACK_BINDING,
  PAYMENTS_CORE_CP423_REQUIREMENTS,
  PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP424_PACK_BINDING,
  PAYMENTS_CORE_CP424_REQUIREMENTS,
  PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION,
  PAYMENTS_CORE_CP425_PACK_BINDING,
  PAYMENTS_CORE_CP425_REQUIREMENTS,
  PAYMENTS_CORE_PROGRAM_CONTRACT,
  createPaymentsCoreCp392ClaudeReviewPacket,
  createPaymentsCoreCp392CloseoutHandoff,
  createPaymentsCoreCp392HermesEvidencePacket,
  createPaymentsCoreCp392ScopeContractFoundationCaseSet,
  createPaymentsCoreCp392ScopeContractFoundationDescriptor,
  createPaymentsCoreCp393ClaudeReviewPacket,
  createPaymentsCoreCp393CloseoutHandoff,
  createPaymentsCoreCp393HermesEvidencePacket,
  createPaymentsCoreCp393P01CloseoutP02FoundationCaseSet,
  createPaymentsCoreCp393P01CloseoutP02FoundationDescriptor,
  createPaymentsCoreCp394ClaudeReviewPacket,
  createPaymentsCoreCp394CloseoutHandoff,
  createPaymentsCoreCp394HermesEvidencePacket,
  createPaymentsCoreCp394P02WorkflowPermissionSliceCaseSet,
  createPaymentsCoreCp394P02WorkflowPermissionSliceDescriptor,
  createPaymentsCoreCp395ClaudeReviewPacket,
  createPaymentsCoreCp395CloseoutHandoff,
  createPaymentsCoreCp395HermesEvidencePacket,
  createPaymentsCoreCp395P02FixtureSliceCaseSet,
  createPaymentsCoreCp395P02FixtureSliceDescriptor,
  createPaymentsCoreCp396ClaudeReviewPacket,
  createPaymentsCoreCp396CloseoutHandoff,
  createPaymentsCoreCp396HermesEvidencePacket,
  createPaymentsCoreCp396P02CloseoutP03FoundationCaseSet,
  createPaymentsCoreCp396P02CloseoutP03FoundationDescriptor,
  createPaymentsCoreCp397ClaudeReviewPacket,
  createPaymentsCoreCp397CloseoutHandoff,
  createPaymentsCoreCp397HermesEvidencePacket,
  createPaymentsCoreCp397P03PermissionSliceCaseSet,
  createPaymentsCoreCp397P03PermissionSliceDescriptor,
  createPaymentsCoreCp398ClaudeReviewPacket,
  createPaymentsCoreCp398CloseoutHandoff,
  createPaymentsCoreCp398HermesEvidencePacket,
  createPaymentsCoreCp398P03PermissionFixtureSliceCaseSet,
  createPaymentsCoreCp398P03PermissionFixtureSliceDescriptor,
  createPaymentsCoreCp399ClaudeReviewPacket,
  createPaymentsCoreCp399CloseoutHandoff,
  createPaymentsCoreCp399HermesEvidencePacket,
  createPaymentsCoreCp399P03FixtureSliceCaseSet,
  createPaymentsCoreCp399P03FixtureSliceDescriptor,
  createPaymentsCoreCp400ClaudeReviewPacket,
  createPaymentsCoreCp400CloseoutHandoff,
  createPaymentsCoreCp400HermesEvidencePacket,
  createPaymentsCoreCp400P03CloseoutP04FoundationCaseSet,
  createPaymentsCoreCp400P03CloseoutP04FoundationDescriptor,
  createPaymentsCoreCp401ClaudeReviewPacket,
  createPaymentsCoreCp401CloseoutHandoff,
  createPaymentsCoreCp401HermesEvidencePacket,
  createPaymentsCoreCp401P04PermissionFixtureSliceCaseSet,
  createPaymentsCoreCp401P04PermissionFixtureSliceDescriptor,
  createPaymentsCoreCp402ClaudeReviewPacket,
  createPaymentsCoreCp402CloseoutHandoff,
  createPaymentsCoreCp402HermesEvidencePacket,
  createPaymentsCoreCp402P04CloseoutP05FoundationCaseSet,
  createPaymentsCoreCp402P04CloseoutP05FoundationDescriptor,
  createPaymentsCoreCp403ClaudeReviewPacket,
  createPaymentsCoreCp403CloseoutHandoff,
  createPaymentsCoreCp403HermesEvidencePacket,
  createPaymentsCoreCp403P05CloseoutP06FoundationCaseSet,
  createPaymentsCoreCp403P05CloseoutP06FoundationDescriptor,
  createPaymentsCoreCp404ClaudeReviewPacket,
  createPaymentsCoreCp404CloseoutHandoff,
  createPaymentsCoreCp404HermesEvidencePacket,
  createPaymentsCoreCp404P06ContractImplementationSliceCaseSet,
  createPaymentsCoreCp404P06ContractImplementationSliceDescriptor,
  createPaymentsCoreCp405ClaudeReviewPacket,
  createPaymentsCoreCp405CloseoutHandoff,
  createPaymentsCoreCp405HermesEvidencePacket,
  createPaymentsCoreCp405P06ImplementationWorkflowSliceCaseSet,
  createPaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor,
  createPaymentsCoreCp406ClaudeReviewPacket,
  createPaymentsCoreCp406CloseoutHandoff,
  createPaymentsCoreCp406HermesEvidencePacket,
  createPaymentsCoreCp406P06PermissionSliceCaseSet,
  createPaymentsCoreCp406P06PermissionSliceDescriptor,
  createPaymentsCoreCp407ClaudeReviewPacket,
  createPaymentsCoreCp407CloseoutHandoff,
  createPaymentsCoreCp407HermesEvidencePacket,
  createPaymentsCoreCp407P06PermissionFixtureSliceCaseSet,
  createPaymentsCoreCp407P06PermissionFixtureSliceDescriptor,
  createPaymentsCoreCp408ClaudeReviewPacket,
  createPaymentsCoreCp408CloseoutHandoff,
  createPaymentsCoreCp408HermesEvidencePacket,
  createPaymentsCoreCp408P06CloseoutP07FoundationCaseSet,
  createPaymentsCoreCp408P06CloseoutP07FoundationDescriptor,
  createPaymentsCoreCp409ClaudeReviewPacket,
  createPaymentsCoreCp409CloseoutHandoff,
  createPaymentsCoreCp409HermesEvidencePacket,
  createPaymentsCoreCp409P07ImplementationSliceCaseSet,
  createPaymentsCoreCp409P07ImplementationSliceDescriptor,
  createPaymentsCoreCp410ClaudeReviewPacket,
  createPaymentsCoreCp410CloseoutHandoff,
  createPaymentsCoreCp410HermesEvidencePacket,
  createPaymentsCoreCp410P07WorkflowPermissionSliceCaseSet,
  createPaymentsCoreCp410P07WorkflowPermissionSliceDescriptor,
  createPaymentsCoreCp411ClaudeReviewPacket,
  createPaymentsCoreCp411CloseoutHandoff,
  createPaymentsCoreCp411HermesEvidencePacket,
  createPaymentsCoreCp411P07PermissionSliceCaseSet,
  createPaymentsCoreCp411P07PermissionSliceDescriptor,
  createPaymentsCoreCp412ClaudeReviewPacket,
  createPaymentsCoreCp412CloseoutHandoff,
  createPaymentsCoreCp412HermesEvidencePacket,
  createPaymentsCoreCp412P07CloseoutP08FoundationCaseSet,
  createPaymentsCoreCp412P07CloseoutP08FoundationDescriptor,
  createPaymentsCoreCp413ClaudeReviewPacket,
  createPaymentsCoreCp413CloseoutHandoff,
  createPaymentsCoreCp413HermesEvidencePacket,
  createPaymentsCoreCp413P08ImplementationWorkflowSliceCaseSet,
  createPaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor,
  createPaymentsCoreCp414ClaudeReviewPacket,
  createPaymentsCoreCp414CloseoutHandoff,
  createPaymentsCoreCp414HermesEvidencePacket,
  createPaymentsCoreCp414P08PermissionFixtureSliceCaseSet,
  createPaymentsCoreCp414P08PermissionFixtureSliceDescriptor,
  createPaymentsCoreCp415ClaudeReviewPacket,
  createPaymentsCoreCp415CloseoutHandoff,
  createPaymentsCoreCp415HermesEvidencePacket,
  createPaymentsCoreCp415P08CloseoutP09FoundationCaseSet,
  createPaymentsCoreCp415P08CloseoutP09FoundationDescriptor,
  createPaymentsCoreCp416ClaudeReviewPacket,
  createPaymentsCoreCp416CloseoutHandoff,
  createPaymentsCoreCp416HermesEvidencePacket,
  createPaymentsCoreCp416P09PermissionSliceCaseSet,
  createPaymentsCoreCp416P09PermissionSliceDescriptor,
  createPaymentsCoreCp417ClaudeReviewPacket,
  createPaymentsCoreCp417CloseoutHandoff,
  createPaymentsCoreCp417HermesEvidencePacket,
  createPaymentsCoreCp417P09PermissionFixtureSliceCaseSet,
  createPaymentsCoreCp417P09PermissionFixtureSliceDescriptor,
  createPaymentsCoreCp418ClaudeReviewPacket,
  createPaymentsCoreCp418CloseoutHandoff,
  createPaymentsCoreCp418HermesEvidencePacket,
  createPaymentsCoreCp418P09FixtureSliceCaseSet,
  createPaymentsCoreCp418P09FixtureSliceDescriptor,
  createPaymentsCoreCp419ClaudeReviewPacket,
  createPaymentsCoreCp419CloseoutHandoff,
  createPaymentsCoreCp419HermesEvidencePacket,
  createPaymentsCoreCp419P09FixtureTestSliceCaseSet,
  createPaymentsCoreCp419P09FixtureTestSliceDescriptor,
  createPaymentsCoreCp420ClaudeReviewPacket,
  createPaymentsCoreCp420CloseoutHandoff,
  createPaymentsCoreCp420HermesEvidencePacket,
  createPaymentsCoreCp420P09TestSliceCaseSet,
  createPaymentsCoreCp420P09TestSliceDescriptor,
  createPaymentsCoreCp421ClaudeReviewPacket,
  createPaymentsCoreCp421CloseoutHandoff,
  createPaymentsCoreCp421HermesEvidencePacket,
  createPaymentsCoreCp421P09TestHermesSliceCaseSet,
  createPaymentsCoreCp421P09TestHermesSliceDescriptor,
  createPaymentsCoreCp422ClaudeReviewPacket,
  createPaymentsCoreCp422CloseoutHandoff,
  createPaymentsCoreCp422HermesEvidencePacket,
  createPaymentsCoreCp422P09HermesSliceCaseSet,
  createPaymentsCoreCp422P09HermesSliceDescriptor,
  createPaymentsCoreCp423ClaudeReviewPacket,
  createPaymentsCoreCp423CloseoutHandoff,
  createPaymentsCoreCp423HermesEvidencePacket,
  createPaymentsCoreCp423P09HermesReviewSliceCaseSet,
  createPaymentsCoreCp423P09HermesReviewSliceDescriptor,
  createPaymentsCoreCp424ClaudeReviewPacket,
  createPaymentsCoreCp424CloseoutHandoff,
  createPaymentsCoreCp424HermesEvidencePacket,
  createPaymentsCoreCp424P09ReviewCloseoutSliceCaseSet,
  createPaymentsCoreCp424P09ReviewCloseoutSliceDescriptor,
  createPaymentsCoreCp425ClaudeReviewPacket,
  createPaymentsCoreCp425CloseoutHandoff,
  createPaymentsCoreCp425HermesEvidencePacket,
  createPaymentsCoreCp425P09CloseoutHandoffSliceCaseSet,
  createPaymentsCoreCp425P09CloseoutHandoffSliceDescriptor,
  paymentsCoreRowKey,
  validatePaymentsCoreCp392Coverage,
  validatePaymentsCoreCp392ScopeContractFoundationDescriptor,
  validatePaymentsCoreCp393Coverage,
  validatePaymentsCoreCp393P01CloseoutP02FoundationDescriptor,
  validatePaymentsCoreCp394Coverage,
  validatePaymentsCoreCp394P02WorkflowPermissionSliceDescriptor,
  validatePaymentsCoreCp395Coverage,
  validatePaymentsCoreCp395P02FixtureSliceDescriptor,
  validatePaymentsCoreCp396Coverage,
  validatePaymentsCoreCp396P02CloseoutP03FoundationDescriptor,
  validatePaymentsCoreCp397Coverage,
  validatePaymentsCoreCp397P03PermissionSliceDescriptor,
  validatePaymentsCoreCp398Coverage,
  validatePaymentsCoreCp398P03PermissionFixtureSliceDescriptor,
  validatePaymentsCoreCp399Coverage,
  validatePaymentsCoreCp399P03FixtureSliceDescriptor,
  validatePaymentsCoreCp400Coverage,
  validatePaymentsCoreCp400P03CloseoutP04FoundationDescriptor,
  validatePaymentsCoreCp401Coverage,
  validatePaymentsCoreCp401P04PermissionFixtureSliceDescriptor,
  validatePaymentsCoreCp402Coverage,
  validatePaymentsCoreCp402P04CloseoutP05FoundationDescriptor,
  validatePaymentsCoreCp403Coverage,
  validatePaymentsCoreCp403P05CloseoutP06FoundationDescriptor,
  validatePaymentsCoreCp404Coverage,
  validatePaymentsCoreCp404P06ContractImplementationSliceDescriptor,
  validatePaymentsCoreCp405Coverage,
  validatePaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor,
  validatePaymentsCoreCp406Coverage,
  validatePaymentsCoreCp406P06PermissionSliceDescriptor,
  validatePaymentsCoreCp407Coverage,
  validatePaymentsCoreCp407P06PermissionFixtureSliceDescriptor,
  validatePaymentsCoreCp408Coverage,
  validatePaymentsCoreCp408P06CloseoutP07FoundationDescriptor,
  validatePaymentsCoreCp409Coverage,
  validatePaymentsCoreCp409P07ImplementationSliceDescriptor,
  validatePaymentsCoreCp410Coverage,
  validatePaymentsCoreCp410P07WorkflowPermissionSliceDescriptor,
  validatePaymentsCoreCp411Coverage,
  validatePaymentsCoreCp411P07PermissionSliceDescriptor,
  validatePaymentsCoreCp412Coverage,
  validatePaymentsCoreCp412P07CloseoutP08FoundationDescriptor,
  validatePaymentsCoreCp413Coverage,
  validatePaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor,
  validatePaymentsCoreCp414Coverage,
  validatePaymentsCoreCp414P08PermissionFixtureSliceDescriptor,
  validatePaymentsCoreCp415Coverage,
  validatePaymentsCoreCp415P08CloseoutP09FoundationDescriptor,
  validatePaymentsCoreCp416Coverage,
  validatePaymentsCoreCp416P09PermissionSliceDescriptor,
  validatePaymentsCoreCp417Coverage,
  validatePaymentsCoreCp417P09PermissionFixtureSliceDescriptor,
  validatePaymentsCoreCp418Coverage,
  validatePaymentsCoreCp418P09FixtureSliceDescriptor,
  validatePaymentsCoreCp419Coverage,
  validatePaymentsCoreCp419P09FixtureTestSliceDescriptor,
  validatePaymentsCoreCp420Coverage,
  validatePaymentsCoreCp420P09TestSliceDescriptor,
  validatePaymentsCoreCp421Coverage,
  validatePaymentsCoreCp421P09TestHermesSliceDescriptor,
  validatePaymentsCoreCp422Coverage,
  validatePaymentsCoreCp422P09HermesSliceDescriptor,
  validatePaymentsCoreCp423Coverage,
  validatePaymentsCoreCp423P09HermesReviewSliceDescriptor,
  validatePaymentsCoreCp424Coverage,
  validatePaymentsCoreCp424P09ReviewCloseoutSliceDescriptor,
  validatePaymentsCoreCp425Coverage,
  validatePaymentsCoreCp425P09CloseoutHandoffSliceDescriptor,
} from "../src/index.js";

const paymentsContract = JSON.parse(
  readFileSync(new URL("../../../contracts/payments-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp392ManifestPath = new URL("../../../docs/closeout-packs/cp00-392/manifest.json", import.meta.url);
const cp392Manifest = existsSync(cp392ManifestPath) ? JSON.parse(readFileSync(cp392ManifestPath, "utf8")) : null;
const cp392PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-392") ?? cp392Manifest?.plan_binding_snapshot;
const cp393ManifestPath = new URL("../../../docs/closeout-packs/cp00-393/manifest.json", import.meta.url);
const cp393Manifest = existsSync(cp393ManifestPath) ? JSON.parse(readFileSync(cp393ManifestPath, "utf8")) : null;
const cp393PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-393") ?? cp393Manifest?.plan_binding_snapshot;
const cp394ManifestPath = new URL("../../../docs/closeout-packs/cp00-394/manifest.json", import.meta.url);
const cp394Manifest = existsSync(cp394ManifestPath) ? JSON.parse(readFileSync(cp394ManifestPath, "utf8")) : null;
const cp394PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-394") ?? cp394Manifest?.plan_binding_snapshot;
const cp395ManifestPath = new URL("../../../docs/closeout-packs/cp00-395/manifest.json", import.meta.url);
const cp395Manifest = existsSync(cp395ManifestPath) ? JSON.parse(readFileSync(cp395ManifestPath, "utf8")) : null;
const cp395PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-395") ?? cp395Manifest?.plan_binding_snapshot;
const cp396ManifestPath = new URL("../../../docs/closeout-packs/cp00-396/manifest.json", import.meta.url);
const cp396Manifest = existsSync(cp396ManifestPath) ? JSON.parse(readFileSync(cp396ManifestPath, "utf8")) : null;
const cp396PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-396") ?? cp396Manifest?.plan_binding_snapshot;
const cp397ManifestPath = new URL("../../../docs/closeout-packs/cp00-397/manifest.json", import.meta.url);
const cp397Manifest = existsSync(cp397ManifestPath) ? JSON.parse(readFileSync(cp397ManifestPath, "utf8")) : null;
const cp397PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-397") ?? cp397Manifest?.plan_binding_snapshot;
const cp398ManifestPath = new URL("../../../docs/closeout-packs/cp00-398/manifest.json", import.meta.url);
const cp398Manifest = existsSync(cp398ManifestPath) ? JSON.parse(readFileSync(cp398ManifestPath, "utf8")) : null;
const cp398PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-398") ?? cp398Manifest?.plan_binding_snapshot;
const cp399ManifestPath = new URL("../../../docs/closeout-packs/cp00-399/manifest.json", import.meta.url);
const cp399Manifest = existsSync(cp399ManifestPath) ? JSON.parse(readFileSync(cp399ManifestPath, "utf8")) : null;
const cp399PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-399") ?? cp399Manifest?.plan_binding_snapshot;
const cp400ManifestPath = new URL("../../../docs/closeout-packs/cp00-400/manifest.json", import.meta.url);
const cp400Manifest = existsSync(cp400ManifestPath) ? JSON.parse(readFileSync(cp400ManifestPath, "utf8")) : null;
const cp400PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-400") ?? cp400Manifest?.plan_binding_snapshot;
const cp401ManifestPath = new URL("../../../docs/closeout-packs/cp00-401/manifest.json", import.meta.url);
const cp401Manifest = existsSync(cp401ManifestPath) ? JSON.parse(readFileSync(cp401ManifestPath, "utf8")) : null;
const cp401PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-401") ?? cp401Manifest?.plan_binding_snapshot;
const cp402ManifestPath = new URL("../../../docs/closeout-packs/cp00-402/manifest.json", import.meta.url);
const cp402Manifest = existsSync(cp402ManifestPath) ? JSON.parse(readFileSync(cp402ManifestPath, "utf8")) : null;
const cp402PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-402") ?? cp402Manifest?.plan_binding_snapshot;
const cp403ManifestPath = new URL("../../../docs/closeout-packs/cp00-403/manifest.json", import.meta.url);
const cp403Manifest = existsSync(cp403ManifestPath) ? JSON.parse(readFileSync(cp403ManifestPath, "utf8")) : null;
const cp403PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-403") ?? cp403Manifest?.plan_binding_snapshot;
const cp404ManifestPath = new URL("../../../docs/closeout-packs/cp00-404/manifest.json", import.meta.url);
const cp404Manifest = existsSync(cp404ManifestPath) ? JSON.parse(readFileSync(cp404ManifestPath, "utf8")) : null;
const cp404PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-404") ?? cp404Manifest?.plan_binding_snapshot;
const cp405ManifestPath = new URL("../../../docs/closeout-packs/cp00-405/manifest.json", import.meta.url);
const cp405Manifest = existsSync(cp405ManifestPath) ? JSON.parse(readFileSync(cp405ManifestPath, "utf8")) : null;
const cp405PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-405") ?? cp405Manifest?.plan_binding_snapshot;
const cp406ManifestPath = new URL("../../../docs/closeout-packs/cp00-406/manifest.json", import.meta.url);
const cp406Manifest = existsSync(cp406ManifestPath) ? JSON.parse(readFileSync(cp406ManifestPath, "utf8")) : null;
const cp406PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-406") ?? cp406Manifest?.plan_binding_snapshot;
const cp407ManifestPath = new URL("../../../docs/closeout-packs/cp00-407/manifest.json", import.meta.url);
const cp407Manifest = existsSync(cp407ManifestPath) ? JSON.parse(readFileSync(cp407ManifestPath, "utf8")) : null;
const cp407PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-407") ?? cp407Manifest?.plan_binding_snapshot;
const cp408ManifestPath = new URL("../../../docs/closeout-packs/cp00-408/manifest.json", import.meta.url);
const cp408Manifest = existsSync(cp408ManifestPath) ? JSON.parse(readFileSync(cp408ManifestPath, "utf8")) : null;
const cp408PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-408") ?? cp408Manifest?.plan_binding_snapshot;
const cp409ManifestPath = new URL("../../../docs/closeout-packs/cp00-409/manifest.json", import.meta.url);
const cp409Manifest = existsSync(cp409ManifestPath) ? JSON.parse(readFileSync(cp409ManifestPath, "utf8")) : null;
const cp409PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-409") ?? cp409Manifest?.plan_binding_snapshot;
const cp410ManifestPath = new URL("../../../docs/closeout-packs/cp00-410/manifest.json", import.meta.url);
const cp410Manifest = existsSync(cp410ManifestPath) ? JSON.parse(readFileSync(cp410ManifestPath, "utf8")) : null;
const cp410PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-410") ?? cp410Manifest?.plan_binding_snapshot;
const cp411ManifestPath = new URL("../../../docs/closeout-packs/cp00-411/manifest.json", import.meta.url);
const cp411Manifest = existsSync(cp411ManifestPath) ? JSON.parse(readFileSync(cp411ManifestPath, "utf8")) : null;
const cp411PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-411") ?? cp411Manifest?.plan_binding_snapshot;
const cp412ManifestPath = new URL("../../../docs/closeout-packs/cp00-412/manifest.json", import.meta.url);
const cp412Manifest = existsSync(cp412ManifestPath) ? JSON.parse(readFileSync(cp412ManifestPath, "utf8")) : null;
const cp412PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-412") ?? cp412Manifest?.plan_binding_snapshot;
const cp413ManifestPath = new URL("../../../docs/closeout-packs/cp00-413/manifest.json", import.meta.url);
const cp413Manifest = existsSync(cp413ManifestPath) ? JSON.parse(readFileSync(cp413ManifestPath, "utf8")) : null;
const cp413PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-413") ?? cp413Manifest?.plan_binding_snapshot;
const cp414ManifestPath = new URL("../../../docs/closeout-packs/cp00-414/manifest.json", import.meta.url);
const cp414Manifest = existsSync(cp414ManifestPath) ? JSON.parse(readFileSync(cp414ManifestPath, "utf8")) : null;
const cp414PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-414") ?? cp414Manifest?.plan_binding_snapshot;
const cp415ManifestPath = new URL("../../../docs/closeout-packs/cp00-415/manifest.json", import.meta.url);
const cp415Manifest = existsSync(cp415ManifestPath) ? JSON.parse(readFileSync(cp415ManifestPath, "utf8")) : null;
const cp415PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-415") ?? cp415Manifest?.plan_binding_snapshot;
const cp416ManifestPath = new URL("../../../docs/closeout-packs/cp00-416/manifest.json", import.meta.url);
const cp416Manifest = existsSync(cp416ManifestPath) ? JSON.parse(readFileSync(cp416ManifestPath, "utf8")) : null;
const cp416PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-416") ?? cp416Manifest?.plan_binding_snapshot;
const cp417ManifestPath = new URL("../../../docs/closeout-packs/cp00-417/manifest.json", import.meta.url);
const cp417Manifest = existsSync(cp417ManifestPath) ? JSON.parse(readFileSync(cp417ManifestPath, "utf8")) : null;
const cp417PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-417") ?? cp417Manifest?.plan_binding_snapshot;
const cp418ManifestPath = new URL("../../../docs/closeout-packs/cp00-418/manifest.json", import.meta.url);
const cp418Manifest = existsSync(cp418ManifestPath) ? JSON.parse(readFileSync(cp418ManifestPath, "utf8")) : null;
const cp418PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-418") ?? cp418Manifest?.plan_binding_snapshot;
const cp419ManifestPath = new URL("../../../docs/closeout-packs/cp00-419/manifest.json", import.meta.url);
const cp419Manifest = existsSync(cp419ManifestPath) ? JSON.parse(readFileSync(cp419ManifestPath, "utf8")) : null;
const cp419PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-419") ?? cp419Manifest?.plan_binding_snapshot;
const cp420ManifestPath = new URL("../../../docs/closeout-packs/cp00-420/manifest.json", import.meta.url);
const cp420Manifest = existsSync(cp420ManifestPath) ? JSON.parse(readFileSync(cp420ManifestPath, "utf8")) : null;
const cp420PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-420") ?? cp420Manifest?.plan_binding_snapshot;
const cp421ManifestPath = new URL("../../../docs/closeout-packs/cp00-421/manifest.json", import.meta.url);
const cp421Manifest = existsSync(cp421ManifestPath) ? JSON.parse(readFileSync(cp421ManifestPath, "utf8")) : null;
const cp421PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-421") ?? cp421Manifest?.plan_binding_snapshot;
const cp422ManifestPath = new URL("../../../docs/closeout-packs/cp00-422/manifest.json", import.meta.url);
const cp422Manifest = existsSync(cp422ManifestPath) ? JSON.parse(readFileSync(cp422ManifestPath, "utf8")) : null;
const cp422PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-422") ?? cp422Manifest?.plan_binding_snapshot;
const cp423ManifestPath = new URL("../../../docs/closeout-packs/cp00-423/manifest.json", import.meta.url);
const cp423Manifest = existsSync(cp423ManifestPath) ? JSON.parse(readFileSync(cp423ManifestPath, "utf8")) : null;
const cp423PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-423") ?? cp423Manifest?.plan_binding_snapshot;
const cp424ManifestPath = new URL("../../../docs/closeout-packs/cp00-424/manifest.json", import.meta.url);
const cp424Manifest = existsSync(cp424ManifestPath) ? JSON.parse(readFileSync(cp424ManifestPath, "utf8")) : null;
const cp424PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-424") ?? cp424Manifest?.plan_binding_snapshot;
const cp425ManifestPath = new URL("../../../docs/closeout-packs/cp00-425/manifest.json", import.meta.url);
const cp425Manifest = existsSync(cp425ManifestPath) ? JSON.parse(readFileSync(cp425ManifestPath, "utf8")) : null;
const cp425PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-425") ?? cp425Manifest?.plan_binding_snapshot;

test("RP13 program contract pins the Payments descriptor-only bootstrap", () => {
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.program_id, "RP13");
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.program_title, "Payments AR Accounting Export");
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP12");
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.hermes_gate, "H13");
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.claude_gate, "C13");
  assert.equal(PAYMENTS_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-392", "CP00-393", "CP00-394", "CP00-395", "CP00-396", "CP00-397", "CP00-398", "CP00-399", "CP00-400", "CP00-401", "CP00-402", "CP00-403", "CP00-404", "CP00-405", "CP00-406", "CP00-407", "CP00-408", "CP00-409", "CP00-410", "CP00-411", "CP00-412", "CP00-413", "CP00-414", "CP00-415", "CP00-416", "CP00-417", "CP00-418", "CP00-419", "CP00-420", "CP00-421", "CP00-422", "CP00-423", "CP00-424", "CP00-425"].includes(paymentsContract.current_pack.pack_id));
  assert.equal(paymentsContract.program.program_id, "RP13");
});

test("CP00-392 plan binding covers the planned 150 RP13 scope and model foundation units", () => {
  const coverage = validatePaymentsCoreCp392Coverage(cp392PlanPack);

  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.pack_id, "CP00-392");
  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.range, "RP13.P00.M00.S01-RP13.P01.M05.S20");
  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.upstream_pack_id, "CP00-391");
  assert.equal(PAYMENTS_CORE_CP392_PACK_BINDING.next_pack_id, "CP00-393");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP13.P00"], 71);
  assert.equal(coverage.summary.by_phase["RP13.P01"], 79);
  assert.equal(Object.keys(PAYMENTS_CORE_CP392_REQUIREMENTS.required_section_rows).length, 17);
});

test("CP00-392 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp392ScopeContractFoundationCaseSet();
  const descriptor = createPaymentsCoreCp392ScopeContractFoundationDescriptor();
  const validation = validatePaymentsCoreCp392ScopeContractFoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 17);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP392_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP13.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.payments_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP13.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-392 evidence packets and handoff preserve payments bootstrap authority boundaries", () => {
  const descriptor = createPaymentsCoreCp392ScopeContractFoundationDescriptor();
  const hermes = createPaymentsCoreCp392HermesEvidencePacket(cp392PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp392ClaudeReviewPacket(cp392PlanPack);
  const handoff = createPaymentsCoreCp392CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-392-to-CP00-393");
  assert.equal(handoff.next_subphase_id, "RP13.P01.M06.S01");
  assert.equal(handoff.production_ready_flag, "payments_core_scope_contract_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-393 plan binding covers the planned 150 RP13 p01 closeout p02 foundation units", () => {
  const coverage = validatePaymentsCoreCp393Coverage(cp393PlanPack);

  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.pack_id, "CP00-393");
  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.range, "RP13.P01.M06.S01-RP13.P02.M04.S06");
  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.upstream_pack_id, "CP00-392");
  assert.equal(PAYMENTS_CORE_CP393_PACK_BINDING.next_pack_id, "CP00-394");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P01.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P01.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P01.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P01.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M04"], 6);
});

test("CP00-393 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp393P01CloseoutP02FoundationCaseSet();
  const descriptor = createPaymentsCoreCp393P01CloseoutP02FoundationDescriptor();
  const validation = validatePaymentsCoreCp393P01CloseoutP02FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP393_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-393 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp393P01CloseoutP02FoundationDescriptor();
  const hermes = createPaymentsCoreCp393HermesEvidencePacket(cp393PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp393ClaudeReviewPacket(cp393PlanPack);
  const handoff = createPaymentsCoreCp393CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-393-to-CP00-394");
  assert.equal(handoff.next_subphase_id, "RP13.P02.M04.S07");
  assert.equal(handoff.production_ready_flag, "payments_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-394 plan binding covers the planned 40 RP13 p02 workflow permission slice units", () => {
  const coverage = validatePaymentsCoreCp394Coverage(cp394PlanPack);

  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.pack_id, "CP00-394");
  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.risk_class, "B");
  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.unit_count, 40);
  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.range, "RP13.P02.M04.S07-RP13.P02.M06.S02");
  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.upstream_pack_id, "CP00-393");
  assert.equal(PAYMENTS_CORE_CP394_PACK_BINDING.next_pack_id, "CP00-395");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M04"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M06"], 2);
});

test("CP00-394 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp394P02WorkflowPermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp394P02WorkflowPermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp394P02WorkflowPermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP394_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-394 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp394P02WorkflowPermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp394HermesEvidencePacket(cp394PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp394ClaudeReviewPacket(cp394PlanPack);
  const handoff = createPaymentsCoreCp394CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-394-to-CP00-395");
  assert.equal(handoff.next_subphase_id, "RP13.P02.M06.S03");
  assert.equal(handoff.production_ready_flag, "payments_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-395 plan binding covers the planned 10 RP13 p02 fixture slice units", () => {
  const coverage = validatePaymentsCoreCp395Coverage(cp395PlanPack);

  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.pack_id, "CP00-395");
  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.range, "RP13.P02.M06.S03-RP13.P02.M06.S12");
  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.upstream_pack_id, "CP00-394");
  assert.equal(PAYMENTS_CORE_CP395_PACK_BINDING.next_pack_id, "CP00-396");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M06"], 10);
});

test("CP00-395 p02 fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp395P02FixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp395P02FixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp395P02FixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP395_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-395 evidence packets and handoff preserve p02 fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp395P02FixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp395HermesEvidencePacket(cp395PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp395ClaudeReviewPacket(cp395PlanPack);
  const handoff = createPaymentsCoreCp395CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-395-to-CP00-396");
  assert.equal(handoff.next_subphase_id, "RP13.P02.M06.S13");
  assert.equal(handoff.production_ready_flag, "payments_core_p02_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-396 plan binding covers the planned 150 RP13 p02 closeout p03 foundation units", () => {
  const coverage = validatePaymentsCoreCp396Coverage(cp396PlanPack);

  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.pack_id, "CP00-396");
  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.range, "RP13.P02.M06.S13-RP13.P03.M05.S04");
  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.upstream_pack_id, "CP00-395");
  assert.equal(PAYMENTS_CORE_CP396_PACK_BINDING.next_pack_id, "CP00-397");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P02.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M00"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M05"], 4);
});

test("CP00-396 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp396P02CloseoutP03FoundationCaseSet();
  const descriptor = createPaymentsCoreCp396P02CloseoutP03FoundationDescriptor();
  const validation = validatePaymentsCoreCp396P02CloseoutP03FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP396_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-396 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp396P02CloseoutP03FoundationDescriptor();
  const hermes = createPaymentsCoreCp396HermesEvidencePacket(cp396PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp396ClaudeReviewPacket(cp396PlanPack);
  const handoff = createPaymentsCoreCp396CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-396-to-CP00-397");
  assert.equal(handoff.next_subphase_id, "RP13.P03.M05.S05");
  assert.equal(handoff.production_ready_flag, "payments_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-397 plan binding covers the planned 10 RP13 p03 permission slice units", () => {
  const coverage = validatePaymentsCoreCp397Coverage(cp397PlanPack);

  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.pack_id, "CP00-397");
  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.range, "RP13.P03.M05.S05-RP13.P03.M05.S14");
  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.upstream_pack_id, "CP00-396");
  assert.equal(PAYMENTS_CORE_CP397_PACK_BINDING.next_pack_id, "CP00-398");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M05"], 10);
});

test("CP00-397 p03 permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp397P03PermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp397P03PermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp397P03PermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP397_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-397 evidence packets and handoff preserve p03 permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp397P03PermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp397HermesEvidencePacket(cp397PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp397ClaudeReviewPacket(cp397PlanPack);
  const handoff = createPaymentsCoreCp397CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-397-to-CP00-398");
  assert.equal(handoff.next_subphase_id, "RP13.P03.M05.S15");
  assert.equal(handoff.production_ready_flag, "payments_core_p03_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-398 plan binding covers the planned 10 RP13 p03 permission fixture slice units", () => {
  const coverage = validatePaymentsCoreCp398Coverage(cp398PlanPack);

  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.pack_id, "CP00-398");
  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.range, "RP13.P03.M05.S15-RP13.P03.M06.S04");
  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.upstream_pack_id, "CP00-397");
  assert.equal(PAYMENTS_CORE_CP398_PACK_BINDING.next_pack_id, "CP00-399");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M06"], 4);
});

test("CP00-398 p03 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp398P03PermissionFixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp398P03PermissionFixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp398P03PermissionFixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP398_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-398 evidence packets and handoff preserve p03 permission fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp398P03PermissionFixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp398HermesEvidencePacket(cp398PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp398ClaudeReviewPacket(cp398PlanPack);
  const handoff = createPaymentsCoreCp398CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-398-to-CP00-399");
  assert.equal(handoff.next_subphase_id, "RP13.P03.M06.S05");
  assert.equal(handoff.production_ready_flag, "payments_core_p03_permission_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-399 plan binding covers the planned 10 RP13 p03 fixture slice units", () => {
  const coverage = validatePaymentsCoreCp399Coverage(cp399PlanPack);

  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.pack_id, "CP00-399");
  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.range, "RP13.P03.M06.S05-RP13.P03.M06.S14");
  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.upstream_pack_id, "CP00-398");
  assert.equal(PAYMENTS_CORE_CP399_PACK_BINDING.next_pack_id, "CP00-400");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M06"], 10);
});

test("CP00-399 p03 fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp399P03FixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp399P03FixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp399P03FixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP399_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-399 evidence packets and handoff preserve p03 fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp399P03FixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp399HermesEvidencePacket(cp399PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp399ClaudeReviewPacket(cp399PlanPack);
  const handoff = createPaymentsCoreCp399CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-399-to-CP00-400");
  assert.equal(handoff.next_subphase_id, "RP13.P03.M06.S15");
  assert.equal(handoff.production_ready_flag, "payments_core_p03_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-400 plan binding covers the planned 150 RP13 p03 closeout p04 foundation units", () => {
  const coverage = validatePaymentsCoreCp400Coverage(cp400PlanPack);

  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.pack_id, "CP00-400");
  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.range, "RP13.P03.M06.S15-RP13.P04.M05.S15");
  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.upstream_pack_id, "CP00-399");
  assert.equal(PAYMENTS_CORE_CP400_PACK_BINDING.next_pack_id, "CP00-401");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M06"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M07"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P03.M10"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M05"], 15);
});

test("CP00-400 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp400P03CloseoutP04FoundationCaseSet();
  const descriptor = createPaymentsCoreCp400P03CloseoutP04FoundationDescriptor();
  const validation = validatePaymentsCoreCp400P03CloseoutP04FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP400_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-400 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp400P03CloseoutP04FoundationDescriptor();
  const hermes = createPaymentsCoreCp400HermesEvidencePacket(cp400PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp400ClaudeReviewPacket(cp400PlanPack);
  const handoff = createPaymentsCoreCp400CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-400-to-CP00-401");
  assert.equal(handoff.next_subphase_id, "RP13.P04.M05.S16");
  assert.equal(handoff.production_ready_flag, "payments_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-401 plan binding covers the planned 10 RP13 p04 permission fixture slice units", () => {
  const coverage = validatePaymentsCoreCp401Coverage(cp401PlanPack);

  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.pack_id, "CP00-401");
  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.range, "RP13.P04.M05.S16-RP13.P04.M06.S03");
  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.upstream_pack_id, "CP00-400");
  assert.equal(PAYMENTS_CORE_CP401_PACK_BINDING.next_pack_id, "CP00-402");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M06"], 3);
});

test("CP00-401 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp401P04PermissionFixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp401P04PermissionFixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp401P04PermissionFixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP401_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-401 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp401P04PermissionFixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp401HermesEvidencePacket(cp401PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp401ClaudeReviewPacket(cp401PlanPack);
  const handoff = createPaymentsCoreCp401CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-401-to-CP00-402");
  assert.equal(handoff.next_subphase_id, "RP13.P04.M06.S04");
  assert.equal(handoff.production_ready_flag, "payments_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-402 plan binding covers the planned 150 RP13 p04 closeout p05 foundation units", () => {
  const coverage = validatePaymentsCoreCp402Coverage(cp402PlanPack);

  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.pack_id, "CP00-402");
  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.range, "RP13.P04.M06.S04-RP13.P05.M04.S05");
  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.upstream_pack_id, "CP00-401");
  assert.equal(PAYMENTS_CORE_CP402_PACK_BINDING.next_pack_id, "CP00-403");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M06"], 17);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P04.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M04"], 5);
});

test("CP00-402 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp402P04CloseoutP05FoundationCaseSet();
  const descriptor = createPaymentsCoreCp402P04CloseoutP05FoundationDescriptor();
  const validation = validatePaymentsCoreCp402P04CloseoutP05FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP402_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-402 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp402P04CloseoutP05FoundationDescriptor();
  const hermes = createPaymentsCoreCp402HermesEvidencePacket(cp402PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp402ClaudeReviewPacket(cp402PlanPack);
  const handoff = createPaymentsCoreCp402CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-402-to-CP00-403");
  assert.equal(handoff.next_subphase_id, "RP13.P05.M04.S06");
  assert.equal(handoff.production_ready_flag, "payments_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-403 plan binding covers the planned 150 RP13 p05 closeout p06 foundation units", () => {
  const coverage = validatePaymentsCoreCp403Coverage(cp403PlanPack);

  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.pack_id, "CP00-403");
  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.range, "RP13.P05.M04.S06-RP13.P06.M01.S12");
  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.upstream_pack_id, "CP00-402");
  assert.equal(PAYMENTS_CORE_CP403_PACK_BINDING.next_pack_id, "CP00-404");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M04"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P05.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M01"], 12);
});

test("CP00-403 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp403P05CloseoutP06FoundationCaseSet();
  const descriptor = createPaymentsCoreCp403P05CloseoutP06FoundationDescriptor();
  const validation = validatePaymentsCoreCp403P05CloseoutP06FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP403_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-403 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp403P05CloseoutP06FoundationDescriptor();
  const hermes = createPaymentsCoreCp403HermesEvidencePacket(cp403PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp403ClaudeReviewPacket(cp403PlanPack);
  const handoff = createPaymentsCoreCp403CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-403-to-CP00-404");
  assert.equal(handoff.next_subphase_id, "RP13.P06.M01.S13");
  assert.equal(handoff.production_ready_flag, "payments_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-404 plan binding covers the planned 40 RP13 p06 contract implementation slice units", () => {
  const coverage = validatePaymentsCoreCp404Coverage(cp404PlanPack);

  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.pack_id, "CP00-404");
  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.risk_class, "B");
  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.unit_count, 40);
  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.range, "RP13.P06.M01.S13-RP13.P06.M03.S12");
  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.upstream_pack_id, "CP00-403");
  assert.equal(PAYMENTS_CORE_CP404_PACK_BINDING.next_pack_id, "CP00-405");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M03"], 12);
});

test("CP00-404 p06 contract implementation slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp404P06ContractImplementationSliceCaseSet();
  const descriptor = createPaymentsCoreCp404P06ContractImplementationSliceDescriptor();
  const validation = validatePaymentsCoreCp404P06ContractImplementationSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP404_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-404 evidence packets and handoff preserve p06 contract implementation slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp404P06ContractImplementationSliceDescriptor();
  const hermes = createPaymentsCoreCp404HermesEvidencePacket(cp404PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp404ClaudeReviewPacket(cp404PlanPack);
  const handoff = createPaymentsCoreCp404CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-404-to-CP00-405");
  assert.equal(handoff.next_subphase_id, "RP13.P06.M03.S13");
  assert.equal(handoff.production_ready_flag, "payments_core_p06_contract_implementation_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-405 plan binding covers the planned 40 RP13 p06 implementation workflow slice units", () => {
  const coverage = validatePaymentsCoreCp405Coverage(cp405PlanPack);

  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.pack_id, "CP00-405");
  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.risk_class, "B");
  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.unit_count, 40);
  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.range, "RP13.P06.M03.S13-RP13.P06.M05.S08");
  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.upstream_pack_id, "CP00-404");
  assert.equal(PAYMENTS_CORE_CP405_PACK_BINDING.next_pack_id, "CP00-406");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M03"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M05"], 8);
});

test("CP00-405 p06 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp405P06ImplementationWorkflowSliceCaseSet();
  const descriptor = createPaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor();
  const validation = validatePaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP405_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-405 evidence packets and handoff preserve p06 implementation workflow slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor();
  const hermes = createPaymentsCoreCp405HermesEvidencePacket(cp405PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp405ClaudeReviewPacket(cp405PlanPack);
  const handoff = createPaymentsCoreCp405CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-405-to-CP00-406");
  assert.equal(handoff.next_subphase_id, "RP13.P06.M05.S09");
  assert.equal(handoff.production_ready_flag, "payments_core_p06_implementation_workflow_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-406 plan binding covers the planned 10 RP13 p06 permission slice units", () => {
  const coverage = validatePaymentsCoreCp406Coverage(cp406PlanPack);

  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.pack_id, "CP00-406");
  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.range, "RP13.P06.M05.S09-RP13.P06.M05.S18");
  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.upstream_pack_id, "CP00-405");
  assert.equal(PAYMENTS_CORE_CP406_PACK_BINDING.next_pack_id, "CP00-407");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M05"], 10);
});

test("CP00-406 p06 permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp406P06PermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp406P06PermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp406P06PermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP406_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-406 evidence packets and handoff preserve p06 permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp406P06PermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp406HermesEvidencePacket(cp406PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp406ClaudeReviewPacket(cp406PlanPack);
  const handoff = createPaymentsCoreCp406CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-406-to-CP00-407");
  assert.equal(handoff.next_subphase_id, "RP13.P06.M05.S19");
  assert.equal(handoff.production_ready_flag, "payments_core_p06_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-407 plan binding covers the planned 10 RP13 p06 permission fixture slice units", () => {
  const coverage = validatePaymentsCoreCp407Coverage(cp407PlanPack);

  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.pack_id, "CP00-407");
  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.range, "RP13.P06.M05.S19-RP13.P06.M06.S06");
  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.upstream_pack_id, "CP00-406");
  assert.equal(PAYMENTS_CORE_CP407_PACK_BINDING.next_pack_id, "CP00-408");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M06"], 6);
});

test("CP00-407 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp407P06PermissionFixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp407P06PermissionFixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp407P06PermissionFixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP407_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-407 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp407P06PermissionFixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp407HermesEvidencePacket(cp407PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp407ClaudeReviewPacket(cp407PlanPack);
  const handoff = createPaymentsCoreCp407CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-407-to-CP00-408");
  assert.equal(handoff.next_subphase_id, "RP13.P06.M06.S07");
  assert.equal(handoff.production_ready_flag, "payments_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-408 plan binding covers the planned 150 RP13 p06 closeout p07 foundation units", () => {
  const coverage = validatePaymentsCoreCp408Coverage(cp408PlanPack);

  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.pack_id, "CP00-408");
  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.range, "RP13.P06.M06.S07-RP13.P07.M03.S06");
  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.upstream_pack_id, "CP00-407");
  assert.equal(PAYMENTS_CORE_CP408_PACK_BINDING.next_pack_id, "CP00-409");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P06.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M00"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M03"], 6);
});

test("CP00-408 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp408P06CloseoutP07FoundationCaseSet();
  const descriptor = createPaymentsCoreCp408P06CloseoutP07FoundationDescriptor();
  const validation = validatePaymentsCoreCp408P06CloseoutP07FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP408_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-408 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp408P06CloseoutP07FoundationDescriptor();
  const hermes = createPaymentsCoreCp408HermesEvidencePacket(cp408PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp408ClaudeReviewPacket(cp408PlanPack);
  const handoff = createPaymentsCoreCp408CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-408-to-CP00-409");
  assert.equal(handoff.next_subphase_id, "RP13.P07.M03.S07");
  assert.equal(handoff.production_ready_flag, "payments_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-409 plan binding covers the planned 10 RP13 p07 implementation slice units", () => {
  const coverage = validatePaymentsCoreCp409Coverage(cp409PlanPack);

  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.pack_id, "CP00-409");
  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.range, "RP13.P07.M03.S07-RP13.P07.M03.S16");
  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.upstream_pack_id, "CP00-408");
  assert.equal(PAYMENTS_CORE_CP409_PACK_BINDING.next_pack_id, "CP00-410");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M03"], 10);
});

test("CP00-409 p07 implementation slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp409P07ImplementationSliceCaseSet();
  const descriptor = createPaymentsCoreCp409P07ImplementationSliceDescriptor();
  const validation = validatePaymentsCoreCp409P07ImplementationSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP409_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-409 evidence packets and handoff preserve p07 implementation slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp409P07ImplementationSliceDescriptor();
  const hermes = createPaymentsCoreCp409HermesEvidencePacket(cp409PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp409ClaudeReviewPacket(cp409PlanPack);
  const handoff = createPaymentsCoreCp409CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-409-to-CP00-410");
  assert.equal(handoff.next_subphase_id, "RP13.P07.M03.S17");
  assert.equal(handoff.production_ready_flag, "payments_core_p07_implementation_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-410 plan binding covers the planned 40 RP13 p07 workflow permission slice units", () => {
  const coverage = validatePaymentsCoreCp410Coverage(cp410PlanPack);

  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.pack_id, "CP00-410");
  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.risk_class, "B");
  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.unit_count, 40);
  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.range, "RP13.P07.M03.S17-RP13.P07.M05.S12");
  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.upstream_pack_id, "CP00-409");
  assert.equal(PAYMENTS_CORE_CP410_PACK_BINDING.next_pack_id, "CP00-411");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M03"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M05"], 12);
});

test("CP00-410 p07 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp410P07WorkflowPermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp410P07WorkflowPermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp410P07WorkflowPermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP410_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-410 evidence packets and handoff preserve p07 workflow permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp410P07WorkflowPermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp410HermesEvidencePacket(cp410PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp410ClaudeReviewPacket(cp410PlanPack);
  const handoff = createPaymentsCoreCp410CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-410-to-CP00-411");
  assert.equal(handoff.next_subphase_id, "RP13.P07.M05.S13");
  assert.equal(handoff.production_ready_flag, "payments_core_p07_workflow_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-411 plan binding covers the planned 10 RP13 p07 permission slice units", () => {
  const coverage = validatePaymentsCoreCp411Coverage(cp411PlanPack);

  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.pack_id, "CP00-411");
  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.range, "RP13.P07.M05.S13-RP13.P07.M05.S22");
  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.upstream_pack_id, "CP00-410");
  assert.equal(PAYMENTS_CORE_CP411_PACK_BINDING.next_pack_id, "CP00-412");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M05"], 10);
});

test("CP00-411 p07 permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp411P07PermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp411P07PermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp411P07PermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP411_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-411 evidence packets and handoff preserve p07 permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp411P07PermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp411HermesEvidencePacket(cp411PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp411ClaudeReviewPacket(cp411PlanPack);
  const handoff = createPaymentsCoreCp411CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-411-to-CP00-412");
  assert.equal(handoff.next_subphase_id, "RP13.P07.M06.S01");
  assert.equal(handoff.production_ready_flag, "payments_core_p07_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-412 plan binding covers the planned 150 RP13 p07 closeout p08 foundation units", () => {
  const coverage = validatePaymentsCoreCp412Coverage(cp412PlanPack);

  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.pack_id, "CP00-412");
  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.range, "RP13.P07.M06.S01-RP13.P08.M03.S15");
  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.upstream_pack_id, "CP00-411");
  assert.equal(PAYMENTS_CORE_CP412_PACK_BINDING.next_pack_id, "CP00-413");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P07.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M00"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M03"], 15);
});

test("CP00-412 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp412P07CloseoutP08FoundationCaseSet();
  const descriptor = createPaymentsCoreCp412P07CloseoutP08FoundationDescriptor();
  const validation = validatePaymentsCoreCp412P07CloseoutP08FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP412_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-412 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp412P07CloseoutP08FoundationDescriptor();
  const hermes = createPaymentsCoreCp412HermesEvidencePacket(cp412PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp412ClaudeReviewPacket(cp412PlanPack);
  const handoff = createPaymentsCoreCp412CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-412-to-CP00-413");
  assert.equal(handoff.next_subphase_id, "RP13.P08.M03.S16");
  assert.equal(handoff.production_ready_flag, "payments_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-413 plan binding covers the planned 40 RP13 p08 implementation workflow slice units", () => {
  const coverage = validatePaymentsCoreCp413Coverage(cp413PlanPack);

  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.pack_id, "CP00-413");
  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.risk_class, "B");
  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.unit_count, 40);
  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.range, "RP13.P08.M03.S16-RP13.P08.M05.S13");
  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.upstream_pack_id, "CP00-412");
  assert.equal(PAYMENTS_CORE_CP413_PACK_BINDING.next_pack_id, "CP00-414");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M03"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M05"], 13);
});

test("CP00-413 p08 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp413P08ImplementationWorkflowSliceCaseSet();
  const descriptor = createPaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor();
  const validation = validatePaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP413_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-413 evidence packets and handoff preserve p08 implementation workflow slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor();
  const hermes = createPaymentsCoreCp413HermesEvidencePacket(cp413PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp413ClaudeReviewPacket(cp413PlanPack);
  const handoff = createPaymentsCoreCp413CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-413-to-CP00-414");
  assert.equal(handoff.next_subphase_id, "RP13.P08.M05.S14");
  assert.equal(handoff.production_ready_flag, "payments_core_p08_implementation_workflow_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-414 plan binding covers the planned 10 RP13 p08 permission fixture slice units", () => {
  const coverage = validatePaymentsCoreCp414Coverage(cp414PlanPack);

  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.pack_id, "CP00-414");
  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.range, "RP13.P08.M05.S14-RP13.P08.M06.S01");
  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.upstream_pack_id, "CP00-413");
  assert.equal(PAYMENTS_CORE_CP414_PACK_BINDING.next_pack_id, "CP00-415");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M05"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M06"], 1);
});

test("CP00-414 p08 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp414P08PermissionFixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp414P08PermissionFixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp414P08PermissionFixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP414_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-414 evidence packets and handoff preserve p08 permission fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp414P08PermissionFixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp414HermesEvidencePacket(cp414PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp414ClaudeReviewPacket(cp414PlanPack);
  const handoff = createPaymentsCoreCp414CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-414-to-CP00-415");
  assert.equal(handoff.next_subphase_id, "RP13.P08.M06.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p08_permission_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-415 plan binding covers the planned 150 RP13 p08 closeout p09 foundation units", () => {
  const coverage = validatePaymentsCoreCp415Coverage(cp415PlanPack);

  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.pack_id, "CP00-415");
  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.risk_class, "C");
  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.unit_count, 150);
  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.range, "RP13.P08.M06.S02-RP13.P09.M05.S01");
  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.upstream_pack_id, "CP00-414");
  assert.equal(PAYMENTS_CORE_CP415_PACK_BINDING.next_pack_id, "CP00-416");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M06"], 19);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P08.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M00"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M05"], 1);
});

test("CP00-415 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp415P08CloseoutP09FoundationCaseSet();
  const descriptor = createPaymentsCoreCp415P08CloseoutP09FoundationDescriptor();
  const validation = validatePaymentsCoreCp415P08CloseoutP09FoundationDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP415_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-415 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createPaymentsCoreCp415P08CloseoutP09FoundationDescriptor();
  const hermes = createPaymentsCoreCp415HermesEvidencePacket(cp415PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp415ClaudeReviewPacket(cp415PlanPack);
  const handoff = createPaymentsCoreCp415CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-415-to-CP00-416");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M05.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-416 plan binding covers the planned 10 RP13 p09 permission slice units", () => {
  const coverage = validatePaymentsCoreCp416Coverage(cp416PlanPack);

  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.pack_id, "CP00-416");
  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.range, "RP13.P09.M05.S02-RP13.P09.M05.S11");
  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.upstream_pack_id, "CP00-415");
  assert.equal(PAYMENTS_CORE_CP416_PACK_BINDING.next_pack_id, "CP00-417");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M05"], 10);
});

test("CP00-416 p09 permission slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp416P09PermissionSliceCaseSet();
  const descriptor = createPaymentsCoreCp416P09PermissionSliceDescriptor();
  const validation = validatePaymentsCoreCp416P09PermissionSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP416_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-416 evidence packets and handoff preserve p09 permission slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp416P09PermissionSliceDescriptor();
  const hermes = createPaymentsCoreCp416HermesEvidencePacket(cp416PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp416ClaudeReviewPacket(cp416PlanPack);
  const handoff = createPaymentsCoreCp416CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-416-to-CP00-417");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M05.S12");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_permission_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-417 plan binding covers the planned 10 RP13 p09 permission fixture slice units", () => {
  const coverage = validatePaymentsCoreCp417Coverage(cp417PlanPack);

  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.pack_id, "CP00-417");
  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.range, "RP13.P09.M05.S12-RP13.P09.M06.S01");
  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.upstream_pack_id, "CP00-416");
  assert.equal(PAYMENTS_CORE_CP417_PACK_BINDING.next_pack_id, "CP00-418");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M05"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M06"], 1);
});

test("CP00-417 p09 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp417P09PermissionFixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp417P09PermissionFixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp417P09PermissionFixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP417_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-417 evidence packets and handoff preserve p09 permission fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp417P09PermissionFixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp417HermesEvidencePacket(cp417PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp417ClaudeReviewPacket(cp417PlanPack);
  const handoff = createPaymentsCoreCp417CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-417-to-CP00-418");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M06.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_permission_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-418 plan binding covers the planned 10 RP13 p09 fixture slice units", () => {
  const coverage = validatePaymentsCoreCp418Coverage(cp418PlanPack);

  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.pack_id, "CP00-418");
  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.range, "RP13.P09.M06.S02-RP13.P09.M06.S11");
  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.upstream_pack_id, "CP00-417");
  assert.equal(PAYMENTS_CORE_CP418_PACK_BINDING.next_pack_id, "CP00-419");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M06"], 10);
});

test("CP00-418 p09 fixture slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp418P09FixtureSliceCaseSet();
  const descriptor = createPaymentsCoreCp418P09FixtureSliceDescriptor();
  const validation = validatePaymentsCoreCp418P09FixtureSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP418_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-418 evidence packets and handoff preserve p09 fixture slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp418P09FixtureSliceDescriptor();
  const hermes = createPaymentsCoreCp418HermesEvidencePacket(cp418PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp418ClaudeReviewPacket(cp418PlanPack);
  const handoff = createPaymentsCoreCp418CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-418-to-CP00-419");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M06.S12");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_fixture_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-419 plan binding covers the planned 10 RP13 p09 fixture test slice units", () => {
  const coverage = validatePaymentsCoreCp419Coverage(cp419PlanPack);

  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.pack_id, "CP00-419");
  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.range, "RP13.P09.M06.S12-RP13.P09.M07.S01");
  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.upstream_pack_id, "CP00-418");
  assert.equal(PAYMENTS_CORE_CP419_PACK_BINDING.next_pack_id, "CP00-420");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M06"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M07"], 1);
});

test("CP00-419 p09 fixture test slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp419P09FixtureTestSliceCaseSet();
  const descriptor = createPaymentsCoreCp419P09FixtureTestSliceDescriptor();
  const validation = validatePaymentsCoreCp419P09FixtureTestSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP419_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-419 evidence packets and handoff preserve p09 fixture test slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp419P09FixtureTestSliceDescriptor();
  const hermes = createPaymentsCoreCp419HermesEvidencePacket(cp419PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp419ClaudeReviewPacket(cp419PlanPack);
  const handoff = createPaymentsCoreCp419CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-419-to-CP00-420");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M07.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_fixture_test_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-420 plan binding covers the planned 10 RP13 p09 test slice units", () => {
  const coverage = validatePaymentsCoreCp420Coverage(cp420PlanPack);

  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.pack_id, "CP00-420");
  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.range, "RP13.P09.M07.S02-RP13.P09.M07.S11");
  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.upstream_pack_id, "CP00-419");
  assert.equal(PAYMENTS_CORE_CP420_PACK_BINDING.next_pack_id, "CP00-421");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M07"], 10);
});

test("CP00-420 p09 test slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp420P09TestSliceCaseSet();
  const descriptor = createPaymentsCoreCp420P09TestSliceDescriptor();
  const validation = validatePaymentsCoreCp420P09TestSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP420_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-420 evidence packets and handoff preserve p09 test slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp420P09TestSliceDescriptor();
  const hermes = createPaymentsCoreCp420HermesEvidencePacket(cp420PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp420ClaudeReviewPacket(cp420PlanPack);
  const handoff = createPaymentsCoreCp420CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-420-to-CP00-421");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M07.S12");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_test_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-421 plan binding covers the planned 10 RP13 p09 test hermes slice units", () => {
  const coverage = validatePaymentsCoreCp421Coverage(cp421PlanPack);

  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.pack_id, "CP00-421");
  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.range, "RP13.P09.M07.S12-RP13.P09.M08.S01");
  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.upstream_pack_id, "CP00-420");
  assert.equal(PAYMENTS_CORE_CP421_PACK_BINDING.next_pack_id, "CP00-422");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M07"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M08"], 1);
});

test("CP00-421 p09 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp421P09TestHermesSliceCaseSet();
  const descriptor = createPaymentsCoreCp421P09TestHermesSliceDescriptor();
  const validation = validatePaymentsCoreCp421P09TestHermesSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP421_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-421 evidence packets and handoff preserve p09 test hermes slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp421P09TestHermesSliceDescriptor();
  const hermes = createPaymentsCoreCp421HermesEvidencePacket(cp421PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp421ClaudeReviewPacket(cp421PlanPack);
  const handoff = createPaymentsCoreCp421CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-421-to-CP00-422");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M08.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_test_hermes_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-422 plan binding covers the planned 10 RP13 p09 hermes slice units", () => {
  const coverage = validatePaymentsCoreCp422Coverage(cp422PlanPack);

  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.pack_id, "CP00-422");
  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.range, "RP13.P09.M08.S02-RP13.P09.M08.S11");
  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.upstream_pack_id, "CP00-421");
  assert.equal(PAYMENTS_CORE_CP422_PACK_BINDING.next_pack_id, "CP00-423");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M08"], 10);
});

test("CP00-422 p09 hermes slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp422P09HermesSliceCaseSet();
  const descriptor = createPaymentsCoreCp422P09HermesSliceDescriptor();
  const validation = validatePaymentsCoreCp422P09HermesSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP422_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-422 evidence packets and handoff preserve p09 hermes slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp422P09HermesSliceDescriptor();
  const hermes = createPaymentsCoreCp422HermesEvidencePacket(cp422PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp422ClaudeReviewPacket(cp422PlanPack);
  const handoff = createPaymentsCoreCp422CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-422-to-CP00-423");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M08.S12");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_hermes_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-423 plan binding covers the planned 10 RP13 p09 hermes review slice units", () => {
  const coverage = validatePaymentsCoreCp423Coverage(cp423PlanPack);

  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.pack_id, "CP00-423");
  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.range, "RP13.P09.M08.S12-RP13.P09.M09.S01");
  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.upstream_pack_id, "CP00-422");
  assert.equal(PAYMENTS_CORE_CP423_PACK_BINDING.next_pack_id, "CP00-424");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M08"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M09"], 1);
});

test("CP00-423 p09 hermes review slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp423P09HermesReviewSliceCaseSet();
  const descriptor = createPaymentsCoreCp423P09HermesReviewSliceDescriptor();
  const validation = validatePaymentsCoreCp423P09HermesReviewSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP423_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-423 evidence packets and handoff preserve p09 hermes review slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp423P09HermesReviewSliceDescriptor();
  const hermes = createPaymentsCoreCp423HermesEvidencePacket(cp423PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp423ClaudeReviewPacket(cp423PlanPack);
  const handoff = createPaymentsCoreCp423CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-423-to-CP00-424");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M09.S02");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_hermes_review_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-424 plan binding covers the planned 10 RP13 p09 review closeout slice units", () => {
  const coverage = validatePaymentsCoreCp424Coverage(cp424PlanPack);

  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.pack_id, "CP00-424");
  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.unit_count, 10);
  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.range, "RP13.P09.M09.S02-RP13.P09.M10.S03");
  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.upstream_pack_id, "CP00-423");
  assert.equal(PAYMENTS_CORE_CP424_PACK_BINDING.next_pack_id, "CP00-425");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M09"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M10"], 3);
});

test("CP00-424 p09 review closeout slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp424P09ReviewCloseoutSliceCaseSet();
  const descriptor = createPaymentsCoreCp424P09ReviewCloseoutSliceDescriptor();
  const validation = validatePaymentsCoreCp424P09ReviewCloseoutSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP424_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-424 evidence packets and handoff preserve p09 review closeout slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp424P09ReviewCloseoutSliceDescriptor();
  const hermes = createPaymentsCoreCp424HermesEvidencePacket(cp424PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp424ClaudeReviewPacket(cp424PlanPack);
  const handoff = createPaymentsCoreCp424CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-424-to-CP00-425");
  assert.equal(handoff.next_subphase_id, "RP13.P09.M10.S04");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_review_closeout_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-425 plan binding covers the planned 1 RP13 p09 closeout handoff slice units", () => {
  const coverage = validatePaymentsCoreCp425Coverage(cp425PlanPack);

  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.pack_id, "CP00-425");
  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.risk_class, "A");
  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.unit_count, 1);
  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.range, "RP13.P09.M10.S04-RP13.P09.M10.S04");
  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.upstream_pack_id, "CP00-424");
  assert.equal(PAYMENTS_CORE_CP425_PACK_BINDING.next_pack_id, "CP00-426");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 1);
  assert.equal(coverage.summary.by_micro_phase["RP13.P09.M10"], 1);
});

test("CP00-425 p09 closeout handoff slice rows stay descriptor-only", () => {
  const caseSet = createPaymentsCoreCp425P09CloseoutHandoffSliceCaseSet();
  const descriptor = createPaymentsCoreCp425P09CloseoutHandoffSliceDescriptor();
  const validation = validatePaymentsCoreCp425P09CloseoutHandoffSliceDescriptor(descriptor, paymentsContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP425_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[paymentsCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-425 evidence packets and handoff preserve p09 closeout handoff slice authority boundaries", () => {
  const descriptor = createPaymentsCoreCp425P09CloseoutHandoffSliceDescriptor();
  const hermes = createPaymentsCoreCp425HermesEvidencePacket(cp425PlanPack, paymentsContract, descriptor);
  const claude = createPaymentsCoreCp425ClaudeReviewPacket(cp425PlanPack);
  const handoff = createPaymentsCoreCp425CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H13");
  assert.equal(claude.gate, "C13");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-425-to-CP00-426");
  assert.equal(handoff.next_subphase_id, "RP14.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "payments_core_p09_closeout_handoff_slice_descriptor_verified");
  assert.equal(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
