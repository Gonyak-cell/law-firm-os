import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
} from "../packages/payments/src/index.js";

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

const paymentsContract = await readJson("../contracts/payments-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp392Manifest = await readOptionalJson("../docs/closeout-packs/cp00-392/manifest.json");
const cp392PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-392") ?? cp392Manifest?.plan_binding_snapshot;
const cp393Manifest = await readOptionalJson("../docs/closeout-packs/cp00-393/manifest.json");
const cp393PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-393") ?? cp393Manifest?.plan_binding_snapshot;
const cp394Manifest = await readOptionalJson("../docs/closeout-packs/cp00-394/manifest.json");
const cp394PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-394") ?? cp394Manifest?.plan_binding_snapshot;
const cp395Manifest = await readOptionalJson("../docs/closeout-packs/cp00-395/manifest.json");
const cp395PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-395") ?? cp395Manifest?.plan_binding_snapshot;
const cp396Manifest = await readOptionalJson("../docs/closeout-packs/cp00-396/manifest.json");
const cp396PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-396") ?? cp396Manifest?.plan_binding_snapshot;
const cp397Manifest = await readOptionalJson("../docs/closeout-packs/cp00-397/manifest.json");
const cp397PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-397") ?? cp397Manifest?.plan_binding_snapshot;
const cp398Manifest = await readOptionalJson("../docs/closeout-packs/cp00-398/manifest.json");
const cp398PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-398") ?? cp398Manifest?.plan_binding_snapshot;
const cp399Manifest = await readOptionalJson("../docs/closeout-packs/cp00-399/manifest.json");
const cp399PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-399") ?? cp399Manifest?.plan_binding_snapshot;
const cp400Manifest = await readOptionalJson("../docs/closeout-packs/cp00-400/manifest.json");
const cp400PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-400") ?? cp400Manifest?.plan_binding_snapshot;
const cp401Manifest = await readOptionalJson("../docs/closeout-packs/cp00-401/manifest.json");
const cp401PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-401") ?? cp401Manifest?.plan_binding_snapshot;
const cp402Manifest = await readOptionalJson("../docs/closeout-packs/cp00-402/manifest.json");
const cp402PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-402") ?? cp402Manifest?.plan_binding_snapshot;
const cp403Manifest = await readOptionalJson("../docs/closeout-packs/cp00-403/manifest.json");
const cp403PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-403") ?? cp403Manifest?.plan_binding_snapshot;
const cp404Manifest = await readOptionalJson("../docs/closeout-packs/cp00-404/manifest.json");
const cp404PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-404") ?? cp404Manifest?.plan_binding_snapshot;
const cp405Manifest = await readOptionalJson("../docs/closeout-packs/cp00-405/manifest.json");
const cp405PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-405") ?? cp405Manifest?.plan_binding_snapshot;
const cp406Manifest = await readOptionalJson("../docs/closeout-packs/cp00-406/manifest.json");
const cp406PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-406") ?? cp406Manifest?.plan_binding_snapshot;
const cp407Manifest = await readOptionalJson("../docs/closeout-packs/cp00-407/manifest.json");
const cp407PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-407") ?? cp407Manifest?.plan_binding_snapshot;
const cp408Manifest = await readOptionalJson("../docs/closeout-packs/cp00-408/manifest.json");
const cp408PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-408") ?? cp408Manifest?.plan_binding_snapshot;
const cp409Manifest = await readOptionalJson("../docs/closeout-packs/cp00-409/manifest.json");
const cp409PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-409") ?? cp409Manifest?.plan_binding_snapshot;
const cp410Manifest = await readOptionalJson("../docs/closeout-packs/cp00-410/manifest.json");
const cp410PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-410") ?? cp410Manifest?.plan_binding_snapshot;
const cp411Manifest = await readOptionalJson("../docs/closeout-packs/cp00-411/manifest.json");
const cp411PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-411") ?? cp411Manifest?.plan_binding_snapshot;
const cp412Manifest = await readOptionalJson("../docs/closeout-packs/cp00-412/manifest.json");
const cp412PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-412") ?? cp412Manifest?.plan_binding_snapshot;
const cp413Manifest = await readOptionalJson("../docs/closeout-packs/cp00-413/manifest.json");
const cp413PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-413") ?? cp413Manifest?.plan_binding_snapshot;
const cp414Manifest = await readOptionalJson("../docs/closeout-packs/cp00-414/manifest.json");
const cp414PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-414") ?? cp414Manifest?.plan_binding_snapshot;
const cp415Manifest = await readOptionalJson("../docs/closeout-packs/cp00-415/manifest.json");
const cp415PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-415") ?? cp415Manifest?.plan_binding_snapshot;
const cp416Manifest = await readOptionalJson("../docs/closeout-packs/cp00-416/manifest.json");
const cp416PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-416") ?? cp416Manifest?.plan_binding_snapshot;
const cp417Manifest = await readOptionalJson("../docs/closeout-packs/cp00-417/manifest.json");
const cp417PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-417") ?? cp417Manifest?.plan_binding_snapshot;
const cp418Manifest = await readOptionalJson("../docs/closeout-packs/cp00-418/manifest.json");
const cp418PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-418") ?? cp418Manifest?.plan_binding_snapshot;
const cp419Manifest = await readOptionalJson("../docs/closeout-packs/cp00-419/manifest.json");
const cp419PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-419") ?? cp419Manifest?.plan_binding_snapshot;
const cp420Manifest = await readOptionalJson("../docs/closeout-packs/cp00-420/manifest.json");
const cp420PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-420") ?? cp420Manifest?.plan_binding_snapshot;
const cp421Manifest = await readOptionalJson("../docs/closeout-packs/cp00-421/manifest.json");
const cp421PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-421") ?? cp421Manifest?.plan_binding_snapshot;
const cp422Manifest = await readOptionalJson("../docs/closeout-packs/cp00-422/manifest.json");
const cp422PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-422") ?? cp422Manifest?.plan_binding_snapshot;
const cp423Manifest = await readOptionalJson("../docs/closeout-packs/cp00-423/manifest.json");
const cp423PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-423") ?? cp423Manifest?.plan_binding_snapshot;
const cp424Manifest = await readOptionalJson("../docs/closeout-packs/cp00-424/manifest.json");
const cp424PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-424") ?? cp424Manifest?.plan_binding_snapshot;
const cp425Manifest = await readOptionalJson("../docs/closeout-packs/cp00-425/manifest.json");
const cp425PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-425") ?? cp425Manifest?.plan_binding_snapshot;

assert.equal(paymentsContract.schema_version, "law-firm-os.payments-core-contract.v0.1");
assert.equal(paymentsContract.program.program_id, "RP13");
assert.equal(paymentsContract.program.program_title, "Payments AR Accounting Export");
assert.equal(paymentsContract.program.upstream_program_id, "RP12");
assert.equal(paymentsContract.program.hermes_gate, "H13");
assert.equal(paymentsContract.program.claude_gate, "C13");
assert.equal(paymentsContract.program.descriptor_only, true);
assert.deepEqual(paymentsContract.program, JSON.parse(JSON.stringify(PAYMENTS_CORE_PROGRAM_CONTRACT)));
assert.equal(paymentsContract.current_pack.pack_id, "CP00-425");
assert.equal(paymentsContract.program.current_pack_id, "CP00-425");
assert.deepEqual(paymentsContract.current_pack, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP425_PACK_BINDING)));
assert.deepEqual(paymentsContract.no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION)));

assert.ok(cp392PlanPack, "CP00-392 must exist in closeout-pack-plan.json");
assert.equal(cp392PlanPack.unit_count, PAYMENTS_CORE_CP392_PACK_BINDING.unit_count, "CP00-392 unit count drift");
assert.ok(cp393PlanPack, "CP00-393 must exist in closeout-pack-plan.json");
assert.equal(cp393PlanPack.unit_count, PAYMENTS_CORE_CP393_PACK_BINDING.unit_count, "CP00-393 unit count drift");
assert.ok(cp394PlanPack, "CP00-394 must exist in closeout-pack-plan.json");
assert.equal(cp394PlanPack.unit_count, PAYMENTS_CORE_CP394_PACK_BINDING.unit_count, "CP00-394 unit count drift");
assert.ok(cp395PlanPack, "CP00-395 must exist in closeout-pack-plan.json");
assert.equal(cp395PlanPack.unit_count, PAYMENTS_CORE_CP395_PACK_BINDING.unit_count, "CP00-395 unit count drift");
assert.ok(cp396PlanPack, "CP00-396 must exist in closeout-pack-plan.json");
assert.equal(cp396PlanPack.unit_count, PAYMENTS_CORE_CP396_PACK_BINDING.unit_count, "CP00-396 unit count drift");
assert.ok(cp397PlanPack, "CP00-397 must exist in closeout-pack-plan.json");
assert.equal(cp397PlanPack.unit_count, PAYMENTS_CORE_CP397_PACK_BINDING.unit_count, "CP00-397 unit count drift");
assert.ok(cp398PlanPack, "CP00-398 must exist in closeout-pack-plan.json");
assert.equal(cp398PlanPack.unit_count, PAYMENTS_CORE_CP398_PACK_BINDING.unit_count, "CP00-398 unit count drift");
assert.ok(cp399PlanPack, "CP00-399 must exist in closeout-pack-plan.json");
assert.equal(cp399PlanPack.unit_count, PAYMENTS_CORE_CP399_PACK_BINDING.unit_count, "CP00-399 unit count drift");
assert.ok(cp400PlanPack, "CP00-400 must exist in closeout-pack-plan.json");
assert.equal(cp400PlanPack.unit_count, PAYMENTS_CORE_CP400_PACK_BINDING.unit_count, "CP00-400 unit count drift");
assert.ok(cp401PlanPack, "CP00-401 must exist in closeout-pack-plan.json");
assert.equal(cp401PlanPack.unit_count, PAYMENTS_CORE_CP401_PACK_BINDING.unit_count, "CP00-401 unit count drift");
assert.ok(cp402PlanPack, "CP00-402 must exist in closeout-pack-plan.json");
assert.equal(cp402PlanPack.unit_count, PAYMENTS_CORE_CP402_PACK_BINDING.unit_count, "CP00-402 unit count drift");
assert.ok(cp403PlanPack, "CP00-403 must exist in closeout-pack-plan.json");
assert.equal(cp403PlanPack.unit_count, PAYMENTS_CORE_CP403_PACK_BINDING.unit_count, "CP00-403 unit count drift");
assert.ok(cp404PlanPack, "CP00-404 must exist in closeout-pack-plan.json");
assert.equal(cp404PlanPack.unit_count, PAYMENTS_CORE_CP404_PACK_BINDING.unit_count, "CP00-404 unit count drift");
assert.ok(cp405PlanPack, "CP00-405 must exist in closeout-pack-plan.json");
assert.equal(cp405PlanPack.unit_count, PAYMENTS_CORE_CP405_PACK_BINDING.unit_count, "CP00-405 unit count drift");
assert.ok(cp406PlanPack, "CP00-406 must exist in closeout-pack-plan.json");
assert.equal(cp406PlanPack.unit_count, PAYMENTS_CORE_CP406_PACK_BINDING.unit_count, "CP00-406 unit count drift");
assert.ok(cp407PlanPack, "CP00-407 must exist in closeout-pack-plan.json");
assert.equal(cp407PlanPack.unit_count, PAYMENTS_CORE_CP407_PACK_BINDING.unit_count, "CP00-407 unit count drift");
assert.ok(cp408PlanPack, "CP00-408 must exist in closeout-pack-plan.json");
assert.equal(cp408PlanPack.unit_count, PAYMENTS_CORE_CP408_PACK_BINDING.unit_count, "CP00-408 unit count drift");
assert.ok(cp409PlanPack, "CP00-409 must exist in closeout-pack-plan.json");
assert.equal(cp409PlanPack.unit_count, PAYMENTS_CORE_CP409_PACK_BINDING.unit_count, "CP00-409 unit count drift");
assert.ok(cp410PlanPack, "CP00-410 must exist in closeout-pack-plan.json");
assert.equal(cp410PlanPack.unit_count, PAYMENTS_CORE_CP410_PACK_BINDING.unit_count, "CP00-410 unit count drift");
assert.ok(cp411PlanPack, "CP00-411 must exist in closeout-pack-plan.json");
assert.equal(cp411PlanPack.unit_count, PAYMENTS_CORE_CP411_PACK_BINDING.unit_count, "CP00-411 unit count drift");
assert.ok(cp412PlanPack, "CP00-412 must exist in closeout-pack-plan.json");
assert.equal(cp412PlanPack.unit_count, PAYMENTS_CORE_CP412_PACK_BINDING.unit_count, "CP00-412 unit count drift");
assert.ok(cp413PlanPack, "CP00-413 must exist in closeout-pack-plan.json");
assert.equal(cp413PlanPack.unit_count, PAYMENTS_CORE_CP413_PACK_BINDING.unit_count, "CP00-413 unit count drift");
assert.ok(cp414PlanPack, "CP00-414 must exist in closeout-pack-plan.json");
assert.equal(cp414PlanPack.unit_count, PAYMENTS_CORE_CP414_PACK_BINDING.unit_count, "CP00-414 unit count drift");
assert.ok(cp415PlanPack, "CP00-415 must exist in closeout-pack-plan.json");
assert.equal(cp415PlanPack.unit_count, PAYMENTS_CORE_CP415_PACK_BINDING.unit_count, "CP00-415 unit count drift");
assert.ok(cp416PlanPack, "CP00-416 must exist in closeout-pack-plan.json");
assert.equal(cp416PlanPack.unit_count, PAYMENTS_CORE_CP416_PACK_BINDING.unit_count, "CP00-416 unit count drift");
assert.ok(cp417PlanPack, "CP00-417 must exist in closeout-pack-plan.json");
assert.equal(cp417PlanPack.unit_count, PAYMENTS_CORE_CP417_PACK_BINDING.unit_count, "CP00-417 unit count drift");
assert.ok(cp418PlanPack, "CP00-418 must exist in closeout-pack-plan.json");
assert.equal(cp418PlanPack.unit_count, PAYMENTS_CORE_CP418_PACK_BINDING.unit_count, "CP00-418 unit count drift");
assert.ok(cp419PlanPack, "CP00-419 must exist in closeout-pack-plan.json");
assert.equal(cp419PlanPack.unit_count, PAYMENTS_CORE_CP419_PACK_BINDING.unit_count, "CP00-419 unit count drift");
assert.ok(cp420PlanPack, "CP00-420 must exist in closeout-pack-plan.json");
assert.equal(cp420PlanPack.unit_count, PAYMENTS_CORE_CP420_PACK_BINDING.unit_count, "CP00-420 unit count drift");
assert.ok(cp421PlanPack, "CP00-421 must exist in closeout-pack-plan.json");
assert.equal(cp421PlanPack.unit_count, PAYMENTS_CORE_CP421_PACK_BINDING.unit_count, "CP00-421 unit count drift");
assert.ok(cp422PlanPack, "CP00-422 must exist in closeout-pack-plan.json");
assert.equal(cp422PlanPack.unit_count, PAYMENTS_CORE_CP422_PACK_BINDING.unit_count, "CP00-422 unit count drift");
assert.ok(cp423PlanPack, "CP00-423 must exist in closeout-pack-plan.json");
assert.equal(cp423PlanPack.unit_count, PAYMENTS_CORE_CP423_PACK_BINDING.unit_count, "CP00-423 unit count drift");
assert.ok(cp424PlanPack, "CP00-424 must exist in closeout-pack-plan.json");
assert.equal(cp424PlanPack.unit_count, PAYMENTS_CORE_CP424_PACK_BINDING.unit_count, "CP00-424 unit count drift");
assert.ok(cp425PlanPack, "CP00-425 must exist in closeout-pack-plan.json");
assert.equal(cp425PlanPack.unit_count, PAYMENTS_CORE_CP425_PACK_BINDING.unit_count, "CP00-425 unit count drift");

const cp392Coverage = validatePaymentsCoreCp392Coverage(cp392PlanPack);
const cp392Descriptor = createPaymentsCoreCp392ScopeContractFoundationDescriptor();
const cp392CaseSet = createPaymentsCoreCp392ScopeContractFoundationCaseSet();
const cp392Foundation = validatePaymentsCoreCp392ScopeContractFoundationDescriptor(cp392Descriptor, paymentsContract);
const cp392Hermes = createPaymentsCoreCp392HermesEvidencePacket(cp392PlanPack, paymentsContract, cp392Descriptor);
const cp392Claude = createPaymentsCoreCp392ClaudeReviewPacket(cp392PlanPack);
const cp392Handoff = createPaymentsCoreCp392CloseoutHandoff();
const cp393Coverage = validatePaymentsCoreCp393Coverage(cp393PlanPack);
const cp393Descriptor = createPaymentsCoreCp393P01CloseoutP02FoundationDescriptor();
const cp393CaseSet = createPaymentsCoreCp393P01CloseoutP02FoundationCaseSet();
const cp393Slice = validatePaymentsCoreCp393P01CloseoutP02FoundationDescriptor(cp393Descriptor, paymentsContract);
const cp393Hermes = createPaymentsCoreCp393HermesEvidencePacket(cp393PlanPack, paymentsContract, cp393Descriptor);
const cp393Claude = createPaymentsCoreCp393ClaudeReviewPacket(cp393PlanPack);
const cp393Handoff = createPaymentsCoreCp393CloseoutHandoff();
const cp394Coverage = validatePaymentsCoreCp394Coverage(cp394PlanPack);
const cp394Descriptor = createPaymentsCoreCp394P02WorkflowPermissionSliceDescriptor();
const cp394CaseSet = createPaymentsCoreCp394P02WorkflowPermissionSliceCaseSet();
const cp394Slice = validatePaymentsCoreCp394P02WorkflowPermissionSliceDescriptor(cp394Descriptor, paymentsContract);
const cp394Hermes = createPaymentsCoreCp394HermesEvidencePacket(cp394PlanPack, paymentsContract, cp394Descriptor);
const cp394Claude = createPaymentsCoreCp394ClaudeReviewPacket(cp394PlanPack);
const cp394Handoff = createPaymentsCoreCp394CloseoutHandoff();
const cp395Coverage = validatePaymentsCoreCp395Coverage(cp395PlanPack);
const cp395Descriptor = createPaymentsCoreCp395P02FixtureSliceDescriptor();
const cp395CaseSet = createPaymentsCoreCp395P02FixtureSliceCaseSet();
const cp395Slice = validatePaymentsCoreCp395P02FixtureSliceDescriptor(cp395Descriptor, paymentsContract);
const cp395Hermes = createPaymentsCoreCp395HermesEvidencePacket(cp395PlanPack, paymentsContract, cp395Descriptor);
const cp395Claude = createPaymentsCoreCp395ClaudeReviewPacket(cp395PlanPack);
const cp395Handoff = createPaymentsCoreCp395CloseoutHandoff();
const cp396Coverage = validatePaymentsCoreCp396Coverage(cp396PlanPack);
const cp396Descriptor = createPaymentsCoreCp396P02CloseoutP03FoundationDescriptor();
const cp396CaseSet = createPaymentsCoreCp396P02CloseoutP03FoundationCaseSet();
const cp396Slice = validatePaymentsCoreCp396P02CloseoutP03FoundationDescriptor(cp396Descriptor, paymentsContract);
const cp396Hermes = createPaymentsCoreCp396HermesEvidencePacket(cp396PlanPack, paymentsContract, cp396Descriptor);
const cp396Claude = createPaymentsCoreCp396ClaudeReviewPacket(cp396PlanPack);
const cp396Handoff = createPaymentsCoreCp396CloseoutHandoff();
const cp397Coverage = validatePaymentsCoreCp397Coverage(cp397PlanPack);
const cp397Descriptor = createPaymentsCoreCp397P03PermissionSliceDescriptor();
const cp397CaseSet = createPaymentsCoreCp397P03PermissionSliceCaseSet();
const cp397Slice = validatePaymentsCoreCp397P03PermissionSliceDescriptor(cp397Descriptor, paymentsContract);
const cp397Hermes = createPaymentsCoreCp397HermesEvidencePacket(cp397PlanPack, paymentsContract, cp397Descriptor);
const cp397Claude = createPaymentsCoreCp397ClaudeReviewPacket(cp397PlanPack);
const cp397Handoff = createPaymentsCoreCp397CloseoutHandoff();
const cp398Coverage = validatePaymentsCoreCp398Coverage(cp398PlanPack);
const cp398Descriptor = createPaymentsCoreCp398P03PermissionFixtureSliceDescriptor();
const cp398CaseSet = createPaymentsCoreCp398P03PermissionFixtureSliceCaseSet();
const cp398Slice = validatePaymentsCoreCp398P03PermissionFixtureSliceDescriptor(cp398Descriptor, paymentsContract);
const cp398Hermes = createPaymentsCoreCp398HermesEvidencePacket(cp398PlanPack, paymentsContract, cp398Descriptor);
const cp398Claude = createPaymentsCoreCp398ClaudeReviewPacket(cp398PlanPack);
const cp398Handoff = createPaymentsCoreCp398CloseoutHandoff();
const cp399Coverage = validatePaymentsCoreCp399Coverage(cp399PlanPack);
const cp399Descriptor = createPaymentsCoreCp399P03FixtureSliceDescriptor();
const cp399CaseSet = createPaymentsCoreCp399P03FixtureSliceCaseSet();
const cp399Slice = validatePaymentsCoreCp399P03FixtureSliceDescriptor(cp399Descriptor, paymentsContract);
const cp399Hermes = createPaymentsCoreCp399HermesEvidencePacket(cp399PlanPack, paymentsContract, cp399Descriptor);
const cp399Claude = createPaymentsCoreCp399ClaudeReviewPacket(cp399PlanPack);
const cp399Handoff = createPaymentsCoreCp399CloseoutHandoff();
const cp400Coverage = validatePaymentsCoreCp400Coverage(cp400PlanPack);
const cp400Descriptor = createPaymentsCoreCp400P03CloseoutP04FoundationDescriptor();
const cp400CaseSet = createPaymentsCoreCp400P03CloseoutP04FoundationCaseSet();
const cp400Slice = validatePaymentsCoreCp400P03CloseoutP04FoundationDescriptor(cp400Descriptor, paymentsContract);
const cp400Hermes = createPaymentsCoreCp400HermesEvidencePacket(cp400PlanPack, paymentsContract, cp400Descriptor);
const cp400Claude = createPaymentsCoreCp400ClaudeReviewPacket(cp400PlanPack);
const cp400Handoff = createPaymentsCoreCp400CloseoutHandoff();
const cp401Coverage = validatePaymentsCoreCp401Coverage(cp401PlanPack);
const cp401Descriptor = createPaymentsCoreCp401P04PermissionFixtureSliceDescriptor();
const cp401CaseSet = createPaymentsCoreCp401P04PermissionFixtureSliceCaseSet();
const cp401Slice = validatePaymentsCoreCp401P04PermissionFixtureSliceDescriptor(cp401Descriptor, paymentsContract);
const cp401Hermes = createPaymentsCoreCp401HermesEvidencePacket(cp401PlanPack, paymentsContract, cp401Descriptor);
const cp401Claude = createPaymentsCoreCp401ClaudeReviewPacket(cp401PlanPack);
const cp401Handoff = createPaymentsCoreCp401CloseoutHandoff();
const cp402Coverage = validatePaymentsCoreCp402Coverage(cp402PlanPack);
const cp402Descriptor = createPaymentsCoreCp402P04CloseoutP05FoundationDescriptor();
const cp402CaseSet = createPaymentsCoreCp402P04CloseoutP05FoundationCaseSet();
const cp402Slice = validatePaymentsCoreCp402P04CloseoutP05FoundationDescriptor(cp402Descriptor, paymentsContract);
const cp402Hermes = createPaymentsCoreCp402HermesEvidencePacket(cp402PlanPack, paymentsContract, cp402Descriptor);
const cp402Claude = createPaymentsCoreCp402ClaudeReviewPacket(cp402PlanPack);
const cp402Handoff = createPaymentsCoreCp402CloseoutHandoff();
const cp403Coverage = validatePaymentsCoreCp403Coverage(cp403PlanPack);
const cp403Descriptor = createPaymentsCoreCp403P05CloseoutP06FoundationDescriptor();
const cp403CaseSet = createPaymentsCoreCp403P05CloseoutP06FoundationCaseSet();
const cp403Slice = validatePaymentsCoreCp403P05CloseoutP06FoundationDescriptor(cp403Descriptor, paymentsContract);
const cp403Hermes = createPaymentsCoreCp403HermesEvidencePacket(cp403PlanPack, paymentsContract, cp403Descriptor);
const cp403Claude = createPaymentsCoreCp403ClaudeReviewPacket(cp403PlanPack);
const cp403Handoff = createPaymentsCoreCp403CloseoutHandoff();
const cp404Coverage = validatePaymentsCoreCp404Coverage(cp404PlanPack);
const cp404Descriptor = createPaymentsCoreCp404P06ContractImplementationSliceDescriptor();
const cp404CaseSet = createPaymentsCoreCp404P06ContractImplementationSliceCaseSet();
const cp404Slice = validatePaymentsCoreCp404P06ContractImplementationSliceDescriptor(cp404Descriptor, paymentsContract);
const cp404Hermes = createPaymentsCoreCp404HermesEvidencePacket(cp404PlanPack, paymentsContract, cp404Descriptor);
const cp404Claude = createPaymentsCoreCp404ClaudeReviewPacket(cp404PlanPack);
const cp404Handoff = createPaymentsCoreCp404CloseoutHandoff();
const cp405Coverage = validatePaymentsCoreCp405Coverage(cp405PlanPack);
const cp405Descriptor = createPaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor();
const cp405CaseSet = createPaymentsCoreCp405P06ImplementationWorkflowSliceCaseSet();
const cp405Slice = validatePaymentsCoreCp405P06ImplementationWorkflowSliceDescriptor(cp405Descriptor, paymentsContract);
const cp405Hermes = createPaymentsCoreCp405HermesEvidencePacket(cp405PlanPack, paymentsContract, cp405Descriptor);
const cp405Claude = createPaymentsCoreCp405ClaudeReviewPacket(cp405PlanPack);
const cp405Handoff = createPaymentsCoreCp405CloseoutHandoff();
const cp406Coverage = validatePaymentsCoreCp406Coverage(cp406PlanPack);
const cp406Descriptor = createPaymentsCoreCp406P06PermissionSliceDescriptor();
const cp406CaseSet = createPaymentsCoreCp406P06PermissionSliceCaseSet();
const cp406Slice = validatePaymentsCoreCp406P06PermissionSliceDescriptor(cp406Descriptor, paymentsContract);
const cp406Hermes = createPaymentsCoreCp406HermesEvidencePacket(cp406PlanPack, paymentsContract, cp406Descriptor);
const cp406Claude = createPaymentsCoreCp406ClaudeReviewPacket(cp406PlanPack);
const cp406Handoff = createPaymentsCoreCp406CloseoutHandoff();
const cp407Coverage = validatePaymentsCoreCp407Coverage(cp407PlanPack);
const cp407Descriptor = createPaymentsCoreCp407P06PermissionFixtureSliceDescriptor();
const cp407CaseSet = createPaymentsCoreCp407P06PermissionFixtureSliceCaseSet();
const cp407Slice = validatePaymentsCoreCp407P06PermissionFixtureSliceDescriptor(cp407Descriptor, paymentsContract);
const cp407Hermes = createPaymentsCoreCp407HermesEvidencePacket(cp407PlanPack, paymentsContract, cp407Descriptor);
const cp407Claude = createPaymentsCoreCp407ClaudeReviewPacket(cp407PlanPack);
const cp407Handoff = createPaymentsCoreCp407CloseoutHandoff();
const cp408Coverage = validatePaymentsCoreCp408Coverage(cp408PlanPack);
const cp408Descriptor = createPaymentsCoreCp408P06CloseoutP07FoundationDescriptor();
const cp408CaseSet = createPaymentsCoreCp408P06CloseoutP07FoundationCaseSet();
const cp408Slice = validatePaymentsCoreCp408P06CloseoutP07FoundationDescriptor(cp408Descriptor, paymentsContract);
const cp408Hermes = createPaymentsCoreCp408HermesEvidencePacket(cp408PlanPack, paymentsContract, cp408Descriptor);
const cp408Claude = createPaymentsCoreCp408ClaudeReviewPacket(cp408PlanPack);
const cp408Handoff = createPaymentsCoreCp408CloseoutHandoff();
const cp409Coverage = validatePaymentsCoreCp409Coverage(cp409PlanPack);
const cp409Descriptor = createPaymentsCoreCp409P07ImplementationSliceDescriptor();
const cp409CaseSet = createPaymentsCoreCp409P07ImplementationSliceCaseSet();
const cp409Slice = validatePaymentsCoreCp409P07ImplementationSliceDescriptor(cp409Descriptor, paymentsContract);
const cp409Hermes = createPaymentsCoreCp409HermesEvidencePacket(cp409PlanPack, paymentsContract, cp409Descriptor);
const cp409Claude = createPaymentsCoreCp409ClaudeReviewPacket(cp409PlanPack);
const cp409Handoff = createPaymentsCoreCp409CloseoutHandoff();
const cp410Coverage = validatePaymentsCoreCp410Coverage(cp410PlanPack);
const cp410Descriptor = createPaymentsCoreCp410P07WorkflowPermissionSliceDescriptor();
const cp410CaseSet = createPaymentsCoreCp410P07WorkflowPermissionSliceCaseSet();
const cp410Slice = validatePaymentsCoreCp410P07WorkflowPermissionSliceDescriptor(cp410Descriptor, paymentsContract);
const cp410Hermes = createPaymentsCoreCp410HermesEvidencePacket(cp410PlanPack, paymentsContract, cp410Descriptor);
const cp410Claude = createPaymentsCoreCp410ClaudeReviewPacket(cp410PlanPack);
const cp410Handoff = createPaymentsCoreCp410CloseoutHandoff();
const cp411Coverage = validatePaymentsCoreCp411Coverage(cp411PlanPack);
const cp411Descriptor = createPaymentsCoreCp411P07PermissionSliceDescriptor();
const cp411CaseSet = createPaymentsCoreCp411P07PermissionSliceCaseSet();
const cp411Slice = validatePaymentsCoreCp411P07PermissionSliceDescriptor(cp411Descriptor, paymentsContract);
const cp411Hermes = createPaymentsCoreCp411HermesEvidencePacket(cp411PlanPack, paymentsContract, cp411Descriptor);
const cp411Claude = createPaymentsCoreCp411ClaudeReviewPacket(cp411PlanPack);
const cp411Handoff = createPaymentsCoreCp411CloseoutHandoff();
const cp412Coverage = validatePaymentsCoreCp412Coverage(cp412PlanPack);
const cp412Descriptor = createPaymentsCoreCp412P07CloseoutP08FoundationDescriptor();
const cp412CaseSet = createPaymentsCoreCp412P07CloseoutP08FoundationCaseSet();
const cp412Slice = validatePaymentsCoreCp412P07CloseoutP08FoundationDescriptor(cp412Descriptor, paymentsContract);
const cp412Hermes = createPaymentsCoreCp412HermesEvidencePacket(cp412PlanPack, paymentsContract, cp412Descriptor);
const cp412Claude = createPaymentsCoreCp412ClaudeReviewPacket(cp412PlanPack);
const cp412Handoff = createPaymentsCoreCp412CloseoutHandoff();
const cp413Coverage = validatePaymentsCoreCp413Coverage(cp413PlanPack);
const cp413Descriptor = createPaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor();
const cp413CaseSet = createPaymentsCoreCp413P08ImplementationWorkflowSliceCaseSet();
const cp413Slice = validatePaymentsCoreCp413P08ImplementationWorkflowSliceDescriptor(cp413Descriptor, paymentsContract);
const cp413Hermes = createPaymentsCoreCp413HermesEvidencePacket(cp413PlanPack, paymentsContract, cp413Descriptor);
const cp413Claude = createPaymentsCoreCp413ClaudeReviewPacket(cp413PlanPack);
const cp413Handoff = createPaymentsCoreCp413CloseoutHandoff();
const cp414Coverage = validatePaymentsCoreCp414Coverage(cp414PlanPack);
const cp414Descriptor = createPaymentsCoreCp414P08PermissionFixtureSliceDescriptor();
const cp414CaseSet = createPaymentsCoreCp414P08PermissionFixtureSliceCaseSet();
const cp414Slice = validatePaymentsCoreCp414P08PermissionFixtureSliceDescriptor(cp414Descriptor, paymentsContract);
const cp414Hermes = createPaymentsCoreCp414HermesEvidencePacket(cp414PlanPack, paymentsContract, cp414Descriptor);
const cp414Claude = createPaymentsCoreCp414ClaudeReviewPacket(cp414PlanPack);
const cp414Handoff = createPaymentsCoreCp414CloseoutHandoff();
const cp415Coverage = validatePaymentsCoreCp415Coverage(cp415PlanPack);
const cp415Descriptor = createPaymentsCoreCp415P08CloseoutP09FoundationDescriptor();
const cp415CaseSet = createPaymentsCoreCp415P08CloseoutP09FoundationCaseSet();
const cp415Slice = validatePaymentsCoreCp415P08CloseoutP09FoundationDescriptor(cp415Descriptor, paymentsContract);
const cp415Hermes = createPaymentsCoreCp415HermesEvidencePacket(cp415PlanPack, paymentsContract, cp415Descriptor);
const cp415Claude = createPaymentsCoreCp415ClaudeReviewPacket(cp415PlanPack);
const cp415Handoff = createPaymentsCoreCp415CloseoutHandoff();
const cp416Coverage = validatePaymentsCoreCp416Coverage(cp416PlanPack);
const cp416Descriptor = createPaymentsCoreCp416P09PermissionSliceDescriptor();
const cp416CaseSet = createPaymentsCoreCp416P09PermissionSliceCaseSet();
const cp416Slice = validatePaymentsCoreCp416P09PermissionSliceDescriptor(cp416Descriptor, paymentsContract);
const cp416Hermes = createPaymentsCoreCp416HermesEvidencePacket(cp416PlanPack, paymentsContract, cp416Descriptor);
const cp416Claude = createPaymentsCoreCp416ClaudeReviewPacket(cp416PlanPack);
const cp416Handoff = createPaymentsCoreCp416CloseoutHandoff();
const cp417Coverage = validatePaymentsCoreCp417Coverage(cp417PlanPack);
const cp417Descriptor = createPaymentsCoreCp417P09PermissionFixtureSliceDescriptor();
const cp417CaseSet = createPaymentsCoreCp417P09PermissionFixtureSliceCaseSet();
const cp417Slice = validatePaymentsCoreCp417P09PermissionFixtureSliceDescriptor(cp417Descriptor, paymentsContract);
const cp417Hermes = createPaymentsCoreCp417HermesEvidencePacket(cp417PlanPack, paymentsContract, cp417Descriptor);
const cp417Claude = createPaymentsCoreCp417ClaudeReviewPacket(cp417PlanPack);
const cp417Handoff = createPaymentsCoreCp417CloseoutHandoff();
const cp418Coverage = validatePaymentsCoreCp418Coverage(cp418PlanPack);
const cp418Descriptor = createPaymentsCoreCp418P09FixtureSliceDescriptor();
const cp418CaseSet = createPaymentsCoreCp418P09FixtureSliceCaseSet();
const cp418Slice = validatePaymentsCoreCp418P09FixtureSliceDescriptor(cp418Descriptor, paymentsContract);
const cp418Hermes = createPaymentsCoreCp418HermesEvidencePacket(cp418PlanPack, paymentsContract, cp418Descriptor);
const cp418Claude = createPaymentsCoreCp418ClaudeReviewPacket(cp418PlanPack);
const cp418Handoff = createPaymentsCoreCp418CloseoutHandoff();
const cp419Coverage = validatePaymentsCoreCp419Coverage(cp419PlanPack);
const cp419Descriptor = createPaymentsCoreCp419P09FixtureTestSliceDescriptor();
const cp419CaseSet = createPaymentsCoreCp419P09FixtureTestSliceCaseSet();
const cp419Slice = validatePaymentsCoreCp419P09FixtureTestSliceDescriptor(cp419Descriptor, paymentsContract);
const cp419Hermes = createPaymentsCoreCp419HermesEvidencePacket(cp419PlanPack, paymentsContract, cp419Descriptor);
const cp419Claude = createPaymentsCoreCp419ClaudeReviewPacket(cp419PlanPack);
const cp419Handoff = createPaymentsCoreCp419CloseoutHandoff();
const cp420Coverage = validatePaymentsCoreCp420Coverage(cp420PlanPack);
const cp420Descriptor = createPaymentsCoreCp420P09TestSliceDescriptor();
const cp420CaseSet = createPaymentsCoreCp420P09TestSliceCaseSet();
const cp420Slice = validatePaymentsCoreCp420P09TestSliceDescriptor(cp420Descriptor, paymentsContract);
const cp420Hermes = createPaymentsCoreCp420HermesEvidencePacket(cp420PlanPack, paymentsContract, cp420Descriptor);
const cp420Claude = createPaymentsCoreCp420ClaudeReviewPacket(cp420PlanPack);
const cp420Handoff = createPaymentsCoreCp420CloseoutHandoff();
const cp421Coverage = validatePaymentsCoreCp421Coverage(cp421PlanPack);
const cp421Descriptor = createPaymentsCoreCp421P09TestHermesSliceDescriptor();
const cp421CaseSet = createPaymentsCoreCp421P09TestHermesSliceCaseSet();
const cp421Slice = validatePaymentsCoreCp421P09TestHermesSliceDescriptor(cp421Descriptor, paymentsContract);
const cp421Hermes = createPaymentsCoreCp421HermesEvidencePacket(cp421PlanPack, paymentsContract, cp421Descriptor);
const cp421Claude = createPaymentsCoreCp421ClaudeReviewPacket(cp421PlanPack);
const cp421Handoff = createPaymentsCoreCp421CloseoutHandoff();
const cp422Coverage = validatePaymentsCoreCp422Coverage(cp422PlanPack);
const cp422Descriptor = createPaymentsCoreCp422P09HermesSliceDescriptor();
const cp422CaseSet = createPaymentsCoreCp422P09HermesSliceCaseSet();
const cp422Slice = validatePaymentsCoreCp422P09HermesSliceDescriptor(cp422Descriptor, paymentsContract);
const cp422Hermes = createPaymentsCoreCp422HermesEvidencePacket(cp422PlanPack, paymentsContract, cp422Descriptor);
const cp422Claude = createPaymentsCoreCp422ClaudeReviewPacket(cp422PlanPack);
const cp422Handoff = createPaymentsCoreCp422CloseoutHandoff();
const cp423Coverage = validatePaymentsCoreCp423Coverage(cp423PlanPack);
const cp423Descriptor = createPaymentsCoreCp423P09HermesReviewSliceDescriptor();
const cp423CaseSet = createPaymentsCoreCp423P09HermesReviewSliceCaseSet();
const cp423Slice = validatePaymentsCoreCp423P09HermesReviewSliceDescriptor(cp423Descriptor, paymentsContract);
const cp423Hermes = createPaymentsCoreCp423HermesEvidencePacket(cp423PlanPack, paymentsContract, cp423Descriptor);
const cp423Claude = createPaymentsCoreCp423ClaudeReviewPacket(cp423PlanPack);
const cp423Handoff = createPaymentsCoreCp423CloseoutHandoff();
const cp424Coverage = validatePaymentsCoreCp424Coverage(cp424PlanPack);
const cp424Descriptor = createPaymentsCoreCp424P09ReviewCloseoutSliceDescriptor();
const cp424CaseSet = createPaymentsCoreCp424P09ReviewCloseoutSliceCaseSet();
const cp424Slice = validatePaymentsCoreCp424P09ReviewCloseoutSliceDescriptor(cp424Descriptor, paymentsContract);
const cp424Hermes = createPaymentsCoreCp424HermesEvidencePacket(cp424PlanPack, paymentsContract, cp424Descriptor);
const cp424Claude = createPaymentsCoreCp424ClaudeReviewPacket(cp424PlanPack);
const cp424Handoff = createPaymentsCoreCp424CloseoutHandoff();
const cp425Coverage = validatePaymentsCoreCp425Coverage(cp425PlanPack);
const cp425Descriptor = createPaymentsCoreCp425P09CloseoutHandoffSliceDescriptor();
const cp425CaseSet = createPaymentsCoreCp425P09CloseoutHandoffSliceCaseSet();
const cp425Slice = validatePaymentsCoreCp425P09CloseoutHandoffSliceDescriptor(cp425Descriptor, paymentsContract);
const cp425Hermes = createPaymentsCoreCp425HermesEvidencePacket(cp425PlanPack, paymentsContract, cp425Descriptor);
const cp425Claude = createPaymentsCoreCp425ClaudeReviewPacket(cp425PlanPack);
const cp425Handoff = createPaymentsCoreCp425CloseoutHandoff();

assert.equal(cp392Coverage.valid, true, cp392Coverage.errors.join("; "));
assert.equal(cp392Coverage.summary.unit_count, 150);
assert.equal(cp392Coverage.summary.by_phase["RP13.P00"], 71);
assert.equal(cp392Coverage.summary.by_phase["RP13.P01"], 79);
assert.equal(cp392Foundation.valid, true, cp392Foundation.errors.join("; "));
assert.equal(cp392CaseSet.section_count, 17);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP392_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp392CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-392 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp392Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp392_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP392_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp392_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION)));
assert.equal(cp392Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp392Hermes.production_ready_candidate, true);
assert.equal(cp392Claude.review_packet, "C13.CP00-392.payments_core_scope_contract_foundation_descriptor");
assert.equal(cp392Claude.read_only, true);
assert.equal(cp392Handoff.to_pack_id, "CP00-393");
assert.equal(cp392Handoff.next_subphase_id, "RP13.P01.M06.S01");
assert.equal(PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP392_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp393Coverage.valid, true, cp393Coverage.errors.join("; "));
assert.equal(cp393Coverage.summary.unit_count, 150);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P01.M06"], 20);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P01.M07"], 20);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P01.M08"], 20);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P01.M09"], 8);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P01.M10"], 3);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P02.M00"], 11);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P02.M01"], 20);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P02.M02"], 20);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P02.M03"], 22);
assert.equal(cp393Coverage.summary.by_micro_phase["RP13.P02.M04"], 6);
assert.equal(cp393Slice.valid, true, cp393Slice.errors.join("; "));
assert.equal(cp393CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP393_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp393CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-393 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp393Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp393_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP393_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp393_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION)));
assert.equal(cp393Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp393Hermes.production_ready_candidate, true);
assert.equal(cp393Claude.review_packet, "C13.CP00-393.payments_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp393Claude.read_only, true);
assert.equal(cp393Handoff.to_pack_id, "CP00-394");
assert.equal(cp393Handoff.next_subphase_id, "RP13.P02.M04.S07");
assert.equal(PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP393_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp394Coverage.valid, true, cp394Coverage.errors.join("; "));
assert.equal(cp394Coverage.summary.unit_count, 40);
assert.equal(cp394Coverage.summary.by_micro_phase["RP13.P02.M04"], 16);
assert.equal(cp394Coverage.summary.by_micro_phase["RP13.P02.M05"], 22);
assert.equal(cp394Coverage.summary.by_micro_phase["RP13.P02.M06"], 2);
assert.equal(cp394Slice.valid, true, cp394Slice.errors.join("; "));
assert.equal(cp394CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP394_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp394CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-394 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp394Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp394_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP394_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp394_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION)));
assert.equal(cp394Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp394Hermes.production_ready_candidate, true);
assert.equal(cp394Claude.review_packet, "C13.CP00-394.payments_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp394Claude.read_only, true);
assert.equal(cp394Handoff.to_pack_id, "CP00-395");
assert.equal(cp394Handoff.next_subphase_id, "RP13.P02.M06.S03");
assert.equal(PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP394_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp395Coverage.valid, true, cp395Coverage.errors.join("; "));
assert.equal(cp395Coverage.summary.unit_count, 10);
assert.equal(cp395Coverage.summary.by_micro_phase["RP13.P02.M06"], 10);
assert.equal(cp395Slice.valid, true, cp395Slice.errors.join("; "));
assert.equal(cp395CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP395_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp395CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-395 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p02_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp395Descriptor)),
  "contract p02_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp395_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP395_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp395_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION)));
assert.equal(cp395Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp395Hermes.production_ready_candidate, true);
assert.equal(cp395Claude.review_packet, "C13.CP00-395.payments_core_p02_fixture_slice_descriptor");
assert.equal(cp395Claude.read_only, true);
assert.equal(cp395Handoff.to_pack_id, "CP00-396");
assert.equal(cp395Handoff.next_subphase_id, "RP13.P02.M06.S13");
assert.equal(PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP395_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp396Coverage.valid, true, cp396Coverage.errors.join("; "));
assert.equal(cp396Coverage.summary.unit_count, 150);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P02.M06"], 10);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P02.M07"], 22);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P02.M08"], 22);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P02.M09"], 22);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P02.M10"], 11);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M00"], 3);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M01"], 8);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M02"], 8);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M03"], 20);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M04"], 20);
assert.equal(cp396Coverage.summary.by_micro_phase["RP13.P03.M05"], 4);
assert.equal(cp396Slice.valid, true, cp396Slice.errors.join("; "));
assert.equal(cp396CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP396_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp396CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-396 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp396Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp396_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP396_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp396_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION)));
assert.equal(cp396Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp396Hermes.production_ready_candidate, true);
assert.equal(cp396Claude.review_packet, "C13.CP00-396.payments_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp396Claude.read_only, true);
assert.equal(cp396Handoff.to_pack_id, "CP00-397");
assert.equal(cp396Handoff.next_subphase_id, "RP13.P03.M05.S05");
assert.equal(PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP396_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp397Coverage.valid, true, cp397Coverage.errors.join("; "));
assert.equal(cp397Coverage.summary.unit_count, 10);
assert.equal(cp397Coverage.summary.by_micro_phase["RP13.P03.M05"], 10);
assert.equal(cp397Slice.valid, true, cp397Slice.errors.join("; "));
assert.equal(cp397CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP397_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp397CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-397 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p03_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp397Descriptor)),
  "contract p03_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp397_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP397_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp397_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION)));
assert.equal(cp397Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp397Hermes.production_ready_candidate, true);
assert.equal(cp397Claude.review_packet, "C13.CP00-397.payments_core_p03_permission_slice_descriptor");
assert.equal(cp397Claude.read_only, true);
assert.equal(cp397Handoff.to_pack_id, "CP00-398");
assert.equal(cp397Handoff.next_subphase_id, "RP13.P03.M05.S15");
assert.equal(PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP397_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp398Coverage.valid, true, cp398Coverage.errors.join("; "));
assert.equal(cp398Coverage.summary.unit_count, 10);
assert.equal(cp398Coverage.summary.by_micro_phase["RP13.P03.M05"], 6);
assert.equal(cp398Coverage.summary.by_micro_phase["RP13.P03.M06"], 4);
assert.equal(cp398Slice.valid, true, cp398Slice.errors.join("; "));
assert.equal(cp398CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP398_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp398CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-398 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p03_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp398Descriptor)),
  "contract p03_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp398_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP398_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp398_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION)));
assert.equal(cp398Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp398Hermes.production_ready_candidate, true);
assert.equal(cp398Claude.review_packet, "C13.CP00-398.payments_core_p03_permission_fixture_slice_descriptor");
assert.equal(cp398Claude.read_only, true);
assert.equal(cp398Handoff.to_pack_id, "CP00-399");
assert.equal(cp398Handoff.next_subphase_id, "RP13.P03.M06.S05");
assert.equal(PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP398_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp399Coverage.valid, true, cp399Coverage.errors.join("; "));
assert.equal(cp399Coverage.summary.unit_count, 10);
assert.equal(cp399Coverage.summary.by_micro_phase["RP13.P03.M06"], 10);
assert.equal(cp399Slice.valid, true, cp399Slice.errors.join("; "));
assert.equal(cp399CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP399_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp399CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-399 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p03_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp399Descriptor)),
  "contract p03_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp399_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP399_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp399_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION)));
assert.equal(cp399Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp399Hermes.production_ready_candidate, true);
assert.equal(cp399Claude.review_packet, "C13.CP00-399.payments_core_p03_fixture_slice_descriptor");
assert.equal(cp399Claude.read_only, true);
assert.equal(cp399Handoff.to_pack_id, "CP00-400");
assert.equal(cp399Handoff.next_subphase_id, "RP13.P03.M06.S15");
assert.equal(PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP399_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp400Coverage.valid, true, cp400Coverage.errors.join("; "));
assert.equal(cp400Coverage.summary.unit_count, 150);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P03.M06"], 6);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P03.M07"], 20);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P03.M08"], 20);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P03.M09"], 8);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P03.M10"], 3);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M00"], 8);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M01"], 8);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M02"], 20);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M03"], 22);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M04"], 20);
assert.equal(cp400Coverage.summary.by_micro_phase["RP13.P04.M05"], 15);
assert.equal(cp400Slice.valid, true, cp400Slice.errors.join("; "));
assert.equal(cp400CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP400_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp400CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-400 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp400Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp400_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP400_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp400_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION)));
assert.equal(cp400Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp400Hermes.production_ready_candidate, true);
assert.equal(cp400Claude.review_packet, "C13.CP00-400.payments_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp400Claude.read_only, true);
assert.equal(cp400Handoff.to_pack_id, "CP00-401");
assert.equal(cp400Handoff.next_subphase_id, "RP13.P04.M05.S16");
assert.equal(PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP400_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp401Coverage.valid, true, cp401Coverage.errors.join("; "));
assert.equal(cp401Coverage.summary.unit_count, 10);
assert.equal(cp401Coverage.summary.by_micro_phase["RP13.P04.M05"], 7);
assert.equal(cp401Coverage.summary.by_micro_phase["RP13.P04.M06"], 3);
assert.equal(cp401Slice.valid, true, cp401Slice.errors.join("; "));
assert.equal(cp401CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP401_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp401CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-401 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp401Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp401_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP401_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp401_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION)));
assert.equal(cp401Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp401Hermes.production_ready_candidate, true);
assert.equal(cp401Claude.review_packet, "C13.CP00-401.payments_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp401Claude.read_only, true);
assert.equal(cp401Handoff.to_pack_id, "CP00-402");
assert.equal(cp401Handoff.next_subphase_id, "RP13.P04.M06.S04");
assert.equal(PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP401_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp402Coverage.valid, true, cp402Coverage.errors.join("; "));
assert.equal(cp402Coverage.summary.unit_count, 150);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P04.M06"], 17);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P04.M07"], 22);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P04.M08"], 20);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P04.M09"], 20);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P04.M10"], 8);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P05.M00"], 8);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P05.M01"], 8);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P05.M02"], 20);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P05.M03"], 22);
assert.equal(cp402Coverage.summary.by_micro_phase["RP13.P05.M04"], 5);
assert.equal(cp402Slice.valid, true, cp402Slice.errors.join("; "));
assert.equal(cp402CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP402_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp402CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-402 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp402Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp402_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP402_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp402_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION)));
assert.equal(cp402Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp402Hermes.production_ready_candidate, true);
assert.equal(cp402Claude.review_packet, "C13.CP00-402.payments_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp402Claude.read_only, true);
assert.equal(cp402Handoff.to_pack_id, "CP00-403");
assert.equal(cp402Handoff.next_subphase_id, "RP13.P05.M04.S06");
assert.equal(PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP402_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp403Coverage.valid, true, cp403Coverage.errors.join("; "));
assert.equal(cp403Coverage.summary.unit_count, 150);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M04"], 15);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M05"], 22);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M06"], 20);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M07"], 22);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M08"], 20);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M09"], 20);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P05.M10"], 8);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P06.M00"], 11);
assert.equal(cp403Coverage.summary.by_micro_phase["RP13.P06.M01"], 12);
assert.equal(cp403Slice.valid, true, cp403Slice.errors.join("; "));
assert.equal(cp403CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP403_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp403CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-403 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp403Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp403_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP403_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp403_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION)));
assert.equal(cp403Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp403Hermes.production_ready_candidate, true);
assert.equal(cp403Claude.review_packet, "C13.CP00-403.payments_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp403Claude.read_only, true);
assert.equal(cp403Handoff.to_pack_id, "CP00-404");
assert.equal(cp403Handoff.next_subphase_id, "RP13.P06.M01.S13");
assert.equal(PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP403_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp404Coverage.valid, true, cp404Coverage.errors.join("; "));
assert.equal(cp404Coverage.summary.unit_count, 40);
assert.equal(cp404Coverage.summary.by_micro_phase["RP13.P06.M01"], 8);
assert.equal(cp404Coverage.summary.by_micro_phase["RP13.P06.M02"], 20);
assert.equal(cp404Coverage.summary.by_micro_phase["RP13.P06.M03"], 12);
assert.equal(cp404Slice.valid, true, cp404Slice.errors.join("; "));
assert.equal(cp404CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP404_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp404CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-404 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p06_contract_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp404Descriptor)),
  "contract p06_contract_implementation_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp404_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP404_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp404_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION)));
assert.equal(cp404Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp404Hermes.production_ready_candidate, true);
assert.equal(cp404Claude.review_packet, "C13.CP00-404.payments_core_p06_contract_implementation_slice_descriptor");
assert.equal(cp404Claude.read_only, true);
assert.equal(cp404Handoff.to_pack_id, "CP00-405");
assert.equal(cp404Handoff.next_subphase_id, "RP13.P06.M03.S13");
assert.equal(PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP404_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp405Coverage.valid, true, cp405Coverage.errors.join("; "));
assert.equal(cp405Coverage.summary.unit_count, 40);
assert.equal(cp405Coverage.summary.by_micro_phase["RP13.P06.M03"], 10);
assert.equal(cp405Coverage.summary.by_micro_phase["RP13.P06.M04"], 22);
assert.equal(cp405Coverage.summary.by_micro_phase["RP13.P06.M05"], 8);
assert.equal(cp405Slice.valid, true, cp405Slice.errors.join("; "));
assert.equal(cp405CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP405_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp405CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-405 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p06_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp405Descriptor)),
  "contract p06_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp405_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP405_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp405_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION)));
assert.equal(cp405Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp405Hermes.production_ready_candidate, true);
assert.equal(cp405Claude.review_packet, "C13.CP00-405.payments_core_p06_implementation_workflow_slice_descriptor");
assert.equal(cp405Claude.read_only, true);
assert.equal(cp405Handoff.to_pack_id, "CP00-406");
assert.equal(cp405Handoff.next_subphase_id, "RP13.P06.M05.S09");
assert.equal(PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP405_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp406Coverage.valid, true, cp406Coverage.errors.join("; "));
assert.equal(cp406Coverage.summary.unit_count, 10);
assert.equal(cp406Coverage.summary.by_micro_phase["RP13.P06.M05"], 10);
assert.equal(cp406Slice.valid, true, cp406Slice.errors.join("; "));
assert.equal(cp406CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP406_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp406CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-406 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p06_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp406Descriptor)),
  "contract p06_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp406_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP406_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp406_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION)));
assert.equal(cp406Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp406Hermes.production_ready_candidate, true);
assert.equal(cp406Claude.review_packet, "C13.CP00-406.payments_core_p06_permission_slice_descriptor");
assert.equal(cp406Claude.read_only, true);
assert.equal(cp406Handoff.to_pack_id, "CP00-407");
assert.equal(cp406Handoff.next_subphase_id, "RP13.P06.M05.S19");
assert.equal(PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP406_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp407Coverage.valid, true, cp407Coverage.errors.join("; "));
assert.equal(cp407Coverage.summary.unit_count, 10);
assert.equal(cp407Coverage.summary.by_micro_phase["RP13.P06.M05"], 4);
assert.equal(cp407Coverage.summary.by_micro_phase["RP13.P06.M06"], 6);
assert.equal(cp407Slice.valid, true, cp407Slice.errors.join("; "));
assert.equal(cp407CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP407_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp407CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-407 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp407Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp407_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP407_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp407_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION)));
assert.equal(cp407Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp407Hermes.production_ready_candidate, true);
assert.equal(cp407Claude.review_packet, "C13.CP00-407.payments_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp407Claude.read_only, true);
assert.equal(cp407Handoff.to_pack_id, "CP00-408");
assert.equal(cp407Handoff.next_subphase_id, "RP13.P06.M06.S07");
assert.equal(PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP407_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp408Coverage.valid, true, cp408Coverage.errors.join("; "));
assert.equal(cp408Coverage.summary.unit_count, 150);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P06.M06"], 16);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P06.M07"], 22);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P06.M08"], 22);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P06.M09"], 22);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P06.M10"], 11);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P07.M00"], 11);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P07.M01"], 20);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P07.M02"], 20);
assert.equal(cp408Coverage.summary.by_micro_phase["RP13.P07.M03"], 6);
assert.equal(cp408Slice.valid, true, cp408Slice.errors.join("; "));
assert.equal(cp408CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP408_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp408CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-408 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp408Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp408_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP408_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp408_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION)));
assert.equal(cp408Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp408Hermes.production_ready_candidate, true);
assert.equal(cp408Claude.review_packet, "C13.CP00-408.payments_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp408Claude.read_only, true);
assert.equal(cp408Handoff.to_pack_id, "CP00-409");
assert.equal(cp408Handoff.next_subphase_id, "RP13.P07.M03.S07");
assert.equal(PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP408_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp409Coverage.valid, true, cp409Coverage.errors.join("; "));
assert.equal(cp409Coverage.summary.unit_count, 10);
assert.equal(cp409Coverage.summary.by_micro_phase["RP13.P07.M03"], 10);
assert.equal(cp409Slice.valid, true, cp409Slice.errors.join("; "));
assert.equal(cp409CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP409_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp409CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-409 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p07_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp409Descriptor)),
  "contract p07_implementation_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp409_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP409_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp409_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION)));
assert.equal(cp409Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp409Hermes.production_ready_candidate, true);
assert.equal(cp409Claude.review_packet, "C13.CP00-409.payments_core_p07_implementation_slice_descriptor");
assert.equal(cp409Claude.read_only, true);
assert.equal(cp409Handoff.to_pack_id, "CP00-410");
assert.equal(cp409Handoff.next_subphase_id, "RP13.P07.M03.S17");
assert.equal(PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP409_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp410Coverage.valid, true, cp410Coverage.errors.join("; "));
assert.equal(cp410Coverage.summary.unit_count, 40);
assert.equal(cp410Coverage.summary.by_micro_phase["RP13.P07.M03"], 6);
assert.equal(cp410Coverage.summary.by_micro_phase["RP13.P07.M04"], 22);
assert.equal(cp410Coverage.summary.by_micro_phase["RP13.P07.M05"], 12);
assert.equal(cp410Slice.valid, true, cp410Slice.errors.join("; "));
assert.equal(cp410CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP410_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp410CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-410 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p07_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp410Descriptor)),
  "contract p07_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp410_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP410_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp410_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION)));
assert.equal(cp410Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp410Hermes.production_ready_candidate, true);
assert.equal(cp410Claude.review_packet, "C13.CP00-410.payments_core_p07_workflow_permission_slice_descriptor");
assert.equal(cp410Claude.read_only, true);
assert.equal(cp410Handoff.to_pack_id, "CP00-411");
assert.equal(cp410Handoff.next_subphase_id, "RP13.P07.M05.S13");
assert.equal(PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP410_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp411Coverage.valid, true, cp411Coverage.errors.join("; "));
assert.equal(cp411Coverage.summary.unit_count, 10);
assert.equal(cp411Coverage.summary.by_micro_phase["RP13.P07.M05"], 10);
assert.equal(cp411Slice.valid, true, cp411Slice.errors.join("; "));
assert.equal(cp411CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP411_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp411CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-411 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p07_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp411Descriptor)),
  "contract p07_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp411_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP411_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp411_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION)));
assert.equal(cp411Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp411Hermes.production_ready_candidate, true);
assert.equal(cp411Claude.review_packet, "C13.CP00-411.payments_core_p07_permission_slice_descriptor");
assert.equal(cp411Claude.read_only, true);
assert.equal(cp411Handoff.to_pack_id, "CP00-412");
assert.equal(cp411Handoff.next_subphase_id, "RP13.P07.M06.S01");
assert.equal(PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP411_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp412Coverage.valid, true, cp412Coverage.errors.join("; "));
assert.equal(cp412Coverage.summary.unit_count, 150);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P07.M06"], 22);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P07.M07"], 22);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P07.M08"], 22);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P07.M09"], 22);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P07.M10"], 11);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P08.M00"], 8);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P08.M01"], 8);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P08.M02"], 20);
assert.equal(cp412Coverage.summary.by_micro_phase["RP13.P08.M03"], 15);
assert.equal(cp412Slice.valid, true, cp412Slice.errors.join("; "));
assert.equal(cp412CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP412_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp412CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-412 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp412Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp412_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP412_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp412_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION)));
assert.equal(cp412Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp412Hermes.production_ready_candidate, true);
assert.equal(cp412Claude.review_packet, "C13.CP00-412.payments_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp412Claude.read_only, true);
assert.equal(cp412Handoff.to_pack_id, "CP00-413");
assert.equal(cp412Handoff.next_subphase_id, "RP13.P08.M03.S16");
assert.equal(PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP412_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp413Coverage.valid, true, cp413Coverage.errors.join("; "));
assert.equal(cp413Coverage.summary.unit_count, 40);
assert.equal(cp413Coverage.summary.by_micro_phase["RP13.P08.M03"], 7);
assert.equal(cp413Coverage.summary.by_micro_phase["RP13.P08.M04"], 20);
assert.equal(cp413Coverage.summary.by_micro_phase["RP13.P08.M05"], 13);
assert.equal(cp413Slice.valid, true, cp413Slice.errors.join("; "));
assert.equal(cp413CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP413_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp413CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-413 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p08_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp413Descriptor)),
  "contract p08_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp413_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP413_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp413_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION)));
assert.equal(cp413Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp413Hermes.production_ready_candidate, true);
assert.equal(cp413Claude.review_packet, "C13.CP00-413.payments_core_p08_implementation_workflow_slice_descriptor");
assert.equal(cp413Claude.read_only, true);
assert.equal(cp413Handoff.to_pack_id, "CP00-414");
assert.equal(cp413Handoff.next_subphase_id, "RP13.P08.M05.S14");
assert.equal(PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP413_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp414Coverage.valid, true, cp414Coverage.errors.join("; "));
assert.equal(cp414Coverage.summary.unit_count, 10);
assert.equal(cp414Coverage.summary.by_micro_phase["RP13.P08.M05"], 9);
assert.equal(cp414Coverage.summary.by_micro_phase["RP13.P08.M06"], 1);
assert.equal(cp414Slice.valid, true, cp414Slice.errors.join("; "));
assert.equal(cp414CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP414_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp414CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-414 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p08_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp414Descriptor)),
  "contract p08_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp414_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP414_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp414_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION)));
assert.equal(cp414Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp414Hermes.production_ready_candidate, true);
assert.equal(cp414Claude.review_packet, "C13.CP00-414.payments_core_p08_permission_fixture_slice_descriptor");
assert.equal(cp414Claude.read_only, true);
assert.equal(cp414Handoff.to_pack_id, "CP00-415");
assert.equal(cp414Handoff.next_subphase_id, "RP13.P08.M06.S02");
assert.equal(PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP414_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp415Coverage.valid, true, cp415Coverage.errors.join("; "));
assert.equal(cp415Coverage.summary.unit_count, 150);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P08.M06"], 19);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P08.M07"], 22);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P08.M08"], 20);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P08.M09"], 20);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P08.M10"], 8);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M00"], 4);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M01"], 8);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M02"], 8);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M03"], 20);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M04"], 20);
assert.equal(cp415Coverage.summary.by_micro_phase["RP13.P09.M05"], 1);
assert.equal(cp415Slice.valid, true, cp415Slice.errors.join("; "));
assert.equal(cp415CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP415_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp415CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-415 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp415Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(paymentsContract.cp415_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP415_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp415_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION)));
assert.equal(cp415Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp415Hermes.production_ready_candidate, true);
assert.equal(cp415Claude.review_packet, "C13.CP00-415.payments_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp415Claude.read_only, true);
assert.equal(cp415Handoff.to_pack_id, "CP00-416");
assert.equal(cp415Handoff.next_subphase_id, "RP13.P09.M05.S02");
assert.equal(PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP415_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp416Coverage.valid, true, cp416Coverage.errors.join("; "));
assert.equal(cp416Coverage.summary.unit_count, 10);
assert.equal(cp416Coverage.summary.by_micro_phase["RP13.P09.M05"], 10);
assert.equal(cp416Slice.valid, true, cp416Slice.errors.join("; "));
assert.equal(cp416CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP416_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp416CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-416 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp416Descriptor)),
  "contract p09_permission_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp416_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP416_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp416_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION)));
assert.equal(cp416Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp416Hermes.production_ready_candidate, true);
assert.equal(cp416Claude.review_packet, "C13.CP00-416.payments_core_p09_permission_slice_descriptor");
assert.equal(cp416Claude.read_only, true);
assert.equal(cp416Handoff.to_pack_id, "CP00-417");
assert.equal(cp416Handoff.next_subphase_id, "RP13.P09.M05.S12");
assert.equal(PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP416_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp417Coverage.valid, true, cp417Coverage.errors.join("; "));
assert.equal(cp417Coverage.summary.unit_count, 10);
assert.equal(cp417Coverage.summary.by_micro_phase["RP13.P09.M05"], 9);
assert.equal(cp417Coverage.summary.by_micro_phase["RP13.P09.M06"], 1);
assert.equal(cp417Slice.valid, true, cp417Slice.errors.join("; "));
assert.equal(cp417CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP417_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp417CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-417 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp417Descriptor)),
  "contract p09_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp417_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP417_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp417_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION)));
assert.equal(cp417Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp417Hermes.production_ready_candidate, true);
assert.equal(cp417Claude.review_packet, "C13.CP00-417.payments_core_p09_permission_fixture_slice_descriptor");
assert.equal(cp417Claude.read_only, true);
assert.equal(cp417Handoff.to_pack_id, "CP00-418");
assert.equal(cp417Handoff.next_subphase_id, "RP13.P09.M06.S02");
assert.equal(PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP417_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp418Coverage.valid, true, cp418Coverage.errors.join("; "));
assert.equal(cp418Coverage.summary.unit_count, 10);
assert.equal(cp418Coverage.summary.by_micro_phase["RP13.P09.M06"], 10);
assert.equal(cp418Slice.valid, true, cp418Slice.errors.join("; "));
assert.equal(cp418CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP418_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp418CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-418 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp418Descriptor)),
  "contract p09_fixture_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp418_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP418_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp418_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION)));
assert.equal(cp418Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp418Hermes.production_ready_candidate, true);
assert.equal(cp418Claude.review_packet, "C13.CP00-418.payments_core_p09_fixture_slice_descriptor");
assert.equal(cp418Claude.read_only, true);
assert.equal(cp418Handoff.to_pack_id, "CP00-419");
assert.equal(cp418Handoff.next_subphase_id, "RP13.P09.M06.S12");
assert.equal(PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP418_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp419Coverage.valid, true, cp419Coverage.errors.join("; "));
assert.equal(cp419Coverage.summary.unit_count, 10);
assert.equal(cp419Coverage.summary.by_micro_phase["RP13.P09.M06"], 9);
assert.equal(cp419Coverage.summary.by_micro_phase["RP13.P09.M07"], 1);
assert.equal(cp419Slice.valid, true, cp419Slice.errors.join("; "));
assert.equal(cp419CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP419_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp419CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-419 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_fixture_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp419Descriptor)),
  "contract p09_fixture_test_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp419_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP419_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp419_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION)));
assert.equal(cp419Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp419Hermes.production_ready_candidate, true);
assert.equal(cp419Claude.review_packet, "C13.CP00-419.payments_core_p09_fixture_test_slice_descriptor");
assert.equal(cp419Claude.read_only, true);
assert.equal(cp419Handoff.to_pack_id, "CP00-420");
assert.equal(cp419Handoff.next_subphase_id, "RP13.P09.M07.S02");
assert.equal(PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP419_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp420Coverage.valid, true, cp420Coverage.errors.join("; "));
assert.equal(cp420Coverage.summary.unit_count, 10);
assert.equal(cp420Coverage.summary.by_micro_phase["RP13.P09.M07"], 10);
assert.equal(cp420Slice.valid, true, cp420Slice.errors.join("; "));
assert.equal(cp420CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP420_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp420CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-420 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp420Descriptor)),
  "contract p09_test_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp420_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP420_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp420_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION)));
assert.equal(cp420Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp420Hermes.production_ready_candidate, true);
assert.equal(cp420Claude.review_packet, "C13.CP00-420.payments_core_p09_test_slice_descriptor");
assert.equal(cp420Claude.read_only, true);
assert.equal(cp420Handoff.to_pack_id, "CP00-421");
assert.equal(cp420Handoff.next_subphase_id, "RP13.P09.M07.S12");
assert.equal(PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP420_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp421Coverage.valid, true, cp421Coverage.errors.join("; "));
assert.equal(cp421Coverage.summary.unit_count, 10);
assert.equal(cp421Coverage.summary.by_micro_phase["RP13.P09.M07"], 9);
assert.equal(cp421Coverage.summary.by_micro_phase["RP13.P09.M08"], 1);
assert.equal(cp421Slice.valid, true, cp421Slice.errors.join("; "));
assert.equal(cp421CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP421_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp421CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-421 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp421Descriptor)),
  "contract p09_test_hermes_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp421_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP421_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp421_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION)));
assert.equal(cp421Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp421Hermes.production_ready_candidate, true);
assert.equal(cp421Claude.review_packet, "C13.CP00-421.payments_core_p09_test_hermes_slice_descriptor");
assert.equal(cp421Claude.read_only, true);
assert.equal(cp421Handoff.to_pack_id, "CP00-422");
assert.equal(cp421Handoff.next_subphase_id, "RP13.P09.M08.S02");
assert.equal(PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP421_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp422Coverage.valid, true, cp422Coverage.errors.join("; "));
assert.equal(cp422Coverage.summary.unit_count, 10);
assert.equal(cp422Coverage.summary.by_micro_phase["RP13.P09.M08"], 10);
assert.equal(cp422Slice.valid, true, cp422Slice.errors.join("; "));
assert.equal(cp422CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP422_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp422CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-422 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp422Descriptor)),
  "contract p09_hermes_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp422_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP422_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp422_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION)));
assert.equal(cp422Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp422Hermes.production_ready_candidate, true);
assert.equal(cp422Claude.review_packet, "C13.CP00-422.payments_core_p09_hermes_slice_descriptor");
assert.equal(cp422Claude.read_only, true);
assert.equal(cp422Handoff.to_pack_id, "CP00-423");
assert.equal(cp422Handoff.next_subphase_id, "RP13.P09.M08.S12");
assert.equal(PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP422_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp423Coverage.valid, true, cp423Coverage.errors.join("; "));
assert.equal(cp423Coverage.summary.unit_count, 10);
assert.equal(cp423Coverage.summary.by_micro_phase["RP13.P09.M08"], 9);
assert.equal(cp423Coverage.summary.by_micro_phase["RP13.P09.M09"], 1);
assert.equal(cp423Slice.valid, true, cp423Slice.errors.join("; "));
assert.equal(cp423CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP423_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp423CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-423 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_hermes_review_slice_descriptor,
  JSON.parse(JSON.stringify(cp423Descriptor)),
  "contract p09_hermes_review_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp423_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP423_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp423_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION)));
assert.equal(cp423Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp423Hermes.production_ready_candidate, true);
assert.equal(cp423Claude.review_packet, "C13.CP00-423.payments_core_p09_hermes_review_slice_descriptor");
assert.equal(cp423Claude.read_only, true);
assert.equal(cp423Handoff.to_pack_id, "CP00-424");
assert.equal(cp423Handoff.next_subphase_id, "RP13.P09.M09.S02");
assert.equal(PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP423_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp424Coverage.valid, true, cp424Coverage.errors.join("; "));
assert.equal(cp424Coverage.summary.unit_count, 10);
assert.equal(cp424Coverage.summary.by_micro_phase["RP13.P09.M09"], 7);
assert.equal(cp424Coverage.summary.by_micro_phase["RP13.P09.M10"], 3);
assert.equal(cp424Slice.valid, true, cp424Slice.errors.join("; "));
assert.equal(cp424CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP424_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp424CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-424 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_review_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp424Descriptor)),
  "contract p09_review_closeout_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp424_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP424_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp424_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION)));
assert.equal(cp424Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp424Hermes.production_ready_candidate, true);
assert.equal(cp424Claude.review_packet, "C13.CP00-424.payments_core_p09_review_closeout_slice_descriptor");
assert.equal(cp424Claude.read_only, true);
assert.equal(cp424Handoff.to_pack_id, "CP00-425");
assert.equal(cp424Handoff.next_subphase_id, "RP13.P09.M10.S04");
assert.equal(PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP424_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp425Coverage.valid, true, cp425Coverage.errors.join("; "));
assert.equal(cp425Coverage.summary.unit_count, 1);
assert.equal(cp425Coverage.summary.by_micro_phase["RP13.P09.M10"], 1);
assert.equal(cp425Slice.valid, true, cp425Slice.errors.join("; "));
assert.equal(cp425CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(PAYMENTS_CORE_CP425_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp425CaseSet.sections[microId].rows[paymentsCoreRowKey(title)];
    assert.ok(row, `CP00-425 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  paymentsContract.p09_closeout_handoff_slice_descriptor,
  JSON.parse(JSON.stringify(cp425Descriptor)),
  "contract p09_closeout_handoff_slice_descriptor drift",
);
assert.deepEqual(paymentsContract.cp425_requirements, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP425_REQUIREMENTS)));
assert.deepEqual(paymentsContract.cp425_no_write_attestation, JSON.parse(JSON.stringify(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION)));
assert.equal(cp425Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp425Hermes.production_ready_candidate, true);
assert.equal(cp425Claude.review_packet, "C13.CP00-425.payments_core_p09_closeout_handoff_slice_descriptor");
assert.equal(cp425Claude.read_only, true);
assert.equal(cp425Handoff.to_pack_id, "CP00-426");
assert.equal(cp425Handoff.next_subphase_id, "RP14.P00.M00.S01");
assert.equal(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(PAYMENTS_CORE_CP425_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(paymentsContract.historical_pack_bindings));
assert.equal(paymentsContract.historical_pack_bindings.at(-1).pack_id, "CP00-425");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp13:payments-core:validate",
      pack_id: PAYMENTS_CORE_CP425_PACK_BINDING.pack_id,
      covered_units: cp425Coverage.summary.unit_count,
      cp424_units_preserved: cp424Coverage.summary.unit_count,
      cp423_units_preserved: cp423Coverage.summary.unit_count,
      cp422_units_preserved: cp422Coverage.summary.unit_count,
      cp421_units_preserved: cp421Coverage.summary.unit_count,
      cp420_units_preserved: cp420Coverage.summary.unit_count,
      cp419_units_preserved: cp419Coverage.summary.unit_count,
      cp418_units_preserved: cp418Coverage.summary.unit_count,
      cp417_units_preserved: cp417Coverage.summary.unit_count,
      cp416_units_preserved: cp416Coverage.summary.unit_count,
      cp415_units_preserved: cp415Coverage.summary.unit_count,
      cp414_units_preserved: cp414Coverage.summary.unit_count,
      cp413_units_preserved: cp413Coverage.summary.unit_count,
      cp412_units_preserved: cp412Coverage.summary.unit_count,
      cp411_units_preserved: cp411Coverage.summary.unit_count,
      cp410_units_preserved: cp410Coverage.summary.unit_count,
      cp409_units_preserved: cp409Coverage.summary.unit_count,
      cp408_units_preserved: cp408Coverage.summary.unit_count,
      cp407_units_preserved: cp407Coverage.summary.unit_count,
      cp406_units_preserved: cp406Coverage.summary.unit_count,
      cp405_units_preserved: cp405Coverage.summary.unit_count,
      cp404_units_preserved: cp404Coverage.summary.unit_count,
      cp403_units_preserved: cp403Coverage.summary.unit_count,
      cp402_units_preserved: cp402Coverage.summary.unit_count,
      cp401_units_preserved: cp401Coverage.summary.unit_count,
      cp400_units_preserved: cp400Coverage.summary.unit_count,
      cp399_units_preserved: cp399Coverage.summary.unit_count,
      cp398_units_preserved: cp398Coverage.summary.unit_count,
      cp397_units_preserved: cp397Coverage.summary.unit_count,
      cp396_units_preserved: cp396Coverage.summary.unit_count,
      cp395_units_preserved: cp395Coverage.summary.unit_count,
      cp394_units_preserved: cp394Coverage.summary.unit_count,
      cp393_units_preserved: cp393Coverage.summary.unit_count,
      cp392_units_preserved: cp392Coverage.summary.unit_count,
      program_id: PAYMENTS_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp425Hermes.gate,
      claude_gate: paymentsContract.current_pack.claude_gate,
      source_billing_core_pack_id: PAYMENTS_CORE_CP392_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp425Handoff.to_pack_id,
      production_ready_candidate: cp425Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
