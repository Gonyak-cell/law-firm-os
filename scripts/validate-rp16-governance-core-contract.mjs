import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP480_PACK_BINDING,
  GOVERNANCE_CORE_CP480_REQUIREMENTS,
  GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP481_PACK_BINDING,
  GOVERNANCE_CORE_CP481_REQUIREMENTS,
  GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP482_PACK_BINDING,
  GOVERNANCE_CORE_CP482_REQUIREMENTS,
  GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP483_PACK_BINDING,
  GOVERNANCE_CORE_CP483_REQUIREMENTS,
  GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP484_PACK_BINDING,
  GOVERNANCE_CORE_CP484_REQUIREMENTS,
  GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP485_PACK_BINDING,
  GOVERNANCE_CORE_CP485_REQUIREMENTS,
  GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP486_PACK_BINDING,
  GOVERNANCE_CORE_CP486_REQUIREMENTS,
  GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP487_PACK_BINDING,
  GOVERNANCE_CORE_CP487_REQUIREMENTS,
  GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP488_PACK_BINDING,
  GOVERNANCE_CORE_CP488_REQUIREMENTS,
  GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP489_PACK_BINDING,
  GOVERNANCE_CORE_CP489_REQUIREMENTS,
  GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP490_PACK_BINDING,
  GOVERNANCE_CORE_CP490_REQUIREMENTS,
  GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP491_PACK_BINDING,
  GOVERNANCE_CORE_CP491_REQUIREMENTS,
  GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP492_PACK_BINDING,
  GOVERNANCE_CORE_CP492_REQUIREMENTS,
  GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP493_PACK_BINDING,
  GOVERNANCE_CORE_CP493_REQUIREMENTS,
  GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP494_PACK_BINDING,
  GOVERNANCE_CORE_CP494_REQUIREMENTS,
  GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP495_PACK_BINDING,
  GOVERNANCE_CORE_CP495_REQUIREMENTS,
  GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP496_PACK_BINDING,
  GOVERNANCE_CORE_CP496_REQUIREMENTS,
  GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP497_PACK_BINDING,
  GOVERNANCE_CORE_CP497_REQUIREMENTS,
  GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP498_PACK_BINDING,
  GOVERNANCE_CORE_CP498_REQUIREMENTS,
  GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP499_PACK_BINDING,
  GOVERNANCE_CORE_CP499_REQUIREMENTS,
  GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP500_PACK_BINDING,
  GOVERNANCE_CORE_CP500_REQUIREMENTS,
  GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP501_PACK_BINDING,
  GOVERNANCE_CORE_CP501_REQUIREMENTS,
  GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP502_PACK_BINDING,
  GOVERNANCE_CORE_CP502_REQUIREMENTS,
  GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP503_PACK_BINDING,
  GOVERNANCE_CORE_CP503_REQUIREMENTS,
  GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP504_PACK_BINDING,
  GOVERNANCE_CORE_CP504_REQUIREMENTS,
  GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP505_PACK_BINDING,
  GOVERNANCE_CORE_CP505_REQUIREMENTS,
  GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP506_PACK_BINDING,
  GOVERNANCE_CORE_CP506_REQUIREMENTS,
  GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP507_PACK_BINDING,
  GOVERNANCE_CORE_CP507_REQUIREMENTS,
  GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP508_PACK_BINDING,
  GOVERNANCE_CORE_CP508_REQUIREMENTS,
  GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP509_PACK_BINDING,
  GOVERNANCE_CORE_CP509_REQUIREMENTS,
  GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP510_PACK_BINDING,
  GOVERNANCE_CORE_CP510_REQUIREMENTS,
  GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP511_PACK_BINDING,
  GOVERNANCE_CORE_CP511_REQUIREMENTS,
  GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP512_PACK_BINDING,
  GOVERNANCE_CORE_CP512_REQUIREMENTS,
  GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION,
  GOVERNANCE_CORE_CP513_PACK_BINDING,
  GOVERNANCE_CORE_CP513_REQUIREMENTS,
  GOVERNANCE_CORE_PROGRAM_CONTRACT,
  createGovernanceCoreCp480ClaudeReviewPacket,
  createGovernanceCoreCp480CloseoutHandoff,
  createGovernanceCoreCp480HermesEvidencePacket,
  createGovernanceCoreCp480ScopeContractFoundationCaseSet,
  createGovernanceCoreCp480ScopeContractFoundationDescriptor,
  createGovernanceCoreCp481ClaudeReviewPacket,
  createGovernanceCoreCp481CloseoutHandoff,
  createGovernanceCoreCp481HermesEvidencePacket,
  createGovernanceCoreCp481ModelFoundationSliceCaseSet,
  createGovernanceCoreCp481ModelFoundationSliceDescriptor,
  createGovernanceCoreCp482ClaudeReviewPacket,
  createGovernanceCoreCp482CloseoutHandoff,
  createGovernanceCoreCp482HermesEvidencePacket,
  createGovernanceCoreCp482WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp482WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp483ClaudeReviewPacket,
  createGovernanceCoreCp483CloseoutHandoff,
  createGovernanceCoreCp483HermesEvidencePacket,
  createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet,
  createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor,
  createGovernanceCoreCp484ClaudeReviewPacket,
  createGovernanceCoreCp484CloseoutHandoff,
  createGovernanceCoreCp484HermesEvidencePacket,
  createGovernanceCoreCp484P02ImplementationSliceCaseSet,
  createGovernanceCoreCp484P02ImplementationSliceDescriptor,
  createGovernanceCoreCp485ClaudeReviewPacket,
  createGovernanceCoreCp485CloseoutHandoff,
  createGovernanceCoreCp485HermesEvidencePacket,
  createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp486ClaudeReviewPacket,
  createGovernanceCoreCp486CloseoutHandoff,
  createGovernanceCoreCp486HermesEvidencePacket,
  createGovernanceCoreCp486P02FixtureTestSliceCaseSet,
  createGovernanceCoreCp486P02FixtureTestSliceDescriptor,
  createGovernanceCoreCp487ClaudeReviewPacket,
  createGovernanceCoreCp487CloseoutHandoff,
  createGovernanceCoreCp487HermesEvidencePacket,
  createGovernanceCoreCp487P02TestSliceCaseSet,
  createGovernanceCoreCp487P02TestSliceDescriptor,
  createGovernanceCoreCp488ClaudeReviewPacket,
  createGovernanceCoreCp488CloseoutHandoff,
  createGovernanceCoreCp488HermesEvidencePacket,
  createGovernanceCoreCp488P02TestHermesSliceCaseSet,
  createGovernanceCoreCp488P02TestHermesSliceDescriptor,
  createGovernanceCoreCp489ClaudeReviewPacket,
  createGovernanceCoreCp489CloseoutHandoff,
  createGovernanceCoreCp489HermesEvidencePacket,
  createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet,
  createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor,
  createGovernanceCoreCp490ClaudeReviewPacket,
  createGovernanceCoreCp490CloseoutHandoff,
  createGovernanceCoreCp490HermesEvidencePacket,
  createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet,
  createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor,
  createGovernanceCoreCp491ClaudeReviewPacket,
  createGovernanceCoreCp491CloseoutHandoff,
  createGovernanceCoreCp491HermesEvidencePacket,
  createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp492ClaudeReviewPacket,
  createGovernanceCoreCp492CloseoutHandoff,
  createGovernanceCoreCp492HermesEvidencePacket,
  createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet,
  createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor,
  createGovernanceCoreCp493ClaudeReviewPacket,
  createGovernanceCoreCp493CloseoutHandoff,
  createGovernanceCoreCp493HermesEvidencePacket,
  createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet,
  createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor,
  createGovernanceCoreCp494ClaudeReviewPacket,
  createGovernanceCoreCp494CloseoutHandoff,
  createGovernanceCoreCp494HermesEvidencePacket,
  createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet,
  createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor,
  createGovernanceCoreCp495ClaudeReviewPacket,
  createGovernanceCoreCp495CloseoutHandoff,
  createGovernanceCoreCp495HermesEvidencePacket,
  createGovernanceCoreCp495P05PermissionSliceCaseSet,
  createGovernanceCoreCp495P05PermissionSliceDescriptor,
  createGovernanceCoreCp496ClaudeReviewPacket,
  createGovernanceCoreCp496CloseoutHandoff,
  createGovernanceCoreCp496HermesEvidencePacket,
  createGovernanceCoreCp496P05AuditBindingSliceCaseSet,
  createGovernanceCoreCp496P05AuditBindingSliceDescriptor,
  createGovernanceCoreCp497ClaudeReviewPacket,
  createGovernanceCoreCp497CloseoutHandoff,
  createGovernanceCoreCp497HermesEvidencePacket,
  createGovernanceCoreCp497P05FixtureSliceCaseSet,
  createGovernanceCoreCp497P05FixtureSliceDescriptor,
  createGovernanceCoreCp498ClaudeReviewPacket,
  createGovernanceCoreCp498CloseoutHandoff,
  createGovernanceCoreCp498HermesEvidencePacket,
  createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet,
  createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor,
  createGovernanceCoreCp499ClaudeReviewPacket,
  createGovernanceCoreCp499CloseoutHandoff,
  createGovernanceCoreCp499HermesEvidencePacket,
  createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet,
  createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor,
  createGovernanceCoreCp500ClaudeReviewPacket,
  createGovernanceCoreCp500CloseoutHandoff,
  createGovernanceCoreCp500HermesEvidencePacket,
  createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet,
  createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor,
  createGovernanceCoreCp501ClaudeReviewPacket,
  createGovernanceCoreCp501CloseoutHandoff,
  createGovernanceCoreCp501HermesEvidencePacket,
  createGovernanceCoreCp501P06PermissionSliceCaseSet,
  createGovernanceCoreCp501P06PermissionSliceDescriptor,
  createGovernanceCoreCp502ClaudeReviewPacket,
  createGovernanceCoreCp502CloseoutHandoff,
  createGovernanceCoreCp502HermesEvidencePacket,
  createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet,
  createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor,
  createGovernanceCoreCp503ClaudeReviewPacket,
  createGovernanceCoreCp503CloseoutHandoff,
  createGovernanceCoreCp503HermesEvidencePacket,
  createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet,
  createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor,
  createGovernanceCoreCp504ClaudeReviewPacket,
  createGovernanceCoreCp504CloseoutHandoff,
  createGovernanceCoreCp504HermesEvidencePacket,
  createGovernanceCoreCp504P07FoundationSliceCaseSet,
  createGovernanceCoreCp504P07FoundationSliceDescriptor,
  createGovernanceCoreCp505ClaudeReviewPacket,
  createGovernanceCoreCp505CloseoutHandoff,
  createGovernanceCoreCp505HermesEvidencePacket,
  createGovernanceCoreCp505P07ImplementationSliceCaseSet,
  createGovernanceCoreCp505P07ImplementationSliceDescriptor,
  createGovernanceCoreCp506ClaudeReviewPacket,
  createGovernanceCoreCp506CloseoutHandoff,
  createGovernanceCoreCp506HermesEvidencePacket,
  createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp507ClaudeReviewPacket,
  createGovernanceCoreCp507CloseoutHandoff,
  createGovernanceCoreCp507HermesEvidencePacket,
  createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet,
  createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor,
  createGovernanceCoreCp508ClaudeReviewPacket,
  createGovernanceCoreCp508CloseoutHandoff,
  createGovernanceCoreCp508HermesEvidencePacket,
  createGovernanceCoreCp508P08ImplementationSliceCaseSet,
  createGovernanceCoreCp508P08ImplementationSliceDescriptor,
  createGovernanceCoreCp509ClaudeReviewPacket,
  createGovernanceCoreCp509CloseoutHandoff,
  createGovernanceCoreCp509HermesEvidencePacket,
  createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp510ClaudeReviewPacket,
  createGovernanceCoreCp510CloseoutHandoff,
  createGovernanceCoreCp510HermesEvidencePacket,
  createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet,
  createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor,
  createGovernanceCoreCp511ClaudeReviewPacket,
  createGovernanceCoreCp511CloseoutHandoff,
  createGovernanceCoreCp511HermesEvidencePacket,
  createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet,
  createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor,
  createGovernanceCoreCp512ClaudeReviewPacket,
  createGovernanceCoreCp512CloseoutHandoff,
  createGovernanceCoreCp512HermesEvidencePacket,
  createGovernanceCoreCp512P09FixtureSliceCaseSet,
  createGovernanceCoreCp512P09FixtureSliceDescriptor,
  createGovernanceCoreCp513ClaudeReviewPacket,
  createGovernanceCoreCp513CloseoutHandoff,
  createGovernanceCoreCp513HermesEvidencePacket,
  createGovernanceCoreCp513P09CloseoutHandoffSliceCaseSet,
  createGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor,
  governanceCoreRowKey,
  validateGovernanceCoreCp480Coverage,
  validateGovernanceCoreCp480ScopeContractFoundationDescriptor,
  validateGovernanceCoreCp481Coverage,
  validateGovernanceCoreCp481ModelFoundationSliceDescriptor,
  validateGovernanceCoreCp482Coverage,
  validateGovernanceCoreCp482WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp483Coverage,
  validateGovernanceCoreCp483P01CloseoutP02FoundationDescriptor,
  validateGovernanceCoreCp484Coverage,
  validateGovernanceCoreCp484P02ImplementationSliceDescriptor,
  validateGovernanceCoreCp485Coverage,
  validateGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp486Coverage,
  validateGovernanceCoreCp486P02FixtureTestSliceDescriptor,
  validateGovernanceCoreCp487Coverage,
  validateGovernanceCoreCp487P02TestSliceDescriptor,
  validateGovernanceCoreCp488Coverage,
  validateGovernanceCoreCp488P02TestHermesSliceDescriptor,
  validateGovernanceCoreCp489Coverage,
  validateGovernanceCoreCp489P02CloseoutP03FoundationDescriptor,
  validateGovernanceCoreCp490Coverage,
  validateGovernanceCoreCp490P03CloseoutP04FoundationDescriptor,
  validateGovernanceCoreCp491Coverage,
  validateGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp492Coverage,
  validateGovernanceCoreCp492P04PermissionFixtureSliceDescriptor,
  validateGovernanceCoreCp493Coverage,
  validateGovernanceCoreCp493P04CloseoutP05FoundationDescriptor,
  validateGovernanceCoreCp494Coverage,
  validateGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor,
  validateGovernanceCoreCp495Coverage,
  validateGovernanceCoreCp495P05PermissionSliceDescriptor,
  validateGovernanceCoreCp496Coverage,
  validateGovernanceCoreCp496P05AuditBindingSliceDescriptor,
  validateGovernanceCoreCp497Coverage,
  validateGovernanceCoreCp497P05FixtureSliceDescriptor,
  validateGovernanceCoreCp498Coverage,
  validateGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor,
  validateGovernanceCoreCp499Coverage,
  validateGovernanceCoreCp499P05CloseoutP06FoundationDescriptor,
  validateGovernanceCoreCp500Coverage,
  validateGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor,
  validateGovernanceCoreCp501Coverage,
  validateGovernanceCoreCp501P06PermissionSliceDescriptor,
  validateGovernanceCoreCp502Coverage,
  validateGovernanceCoreCp502P06PermissionFixtureSliceDescriptor,
  validateGovernanceCoreCp503Coverage,
  validateGovernanceCoreCp503P06CloseoutP07FoundationDescriptor,
  validateGovernanceCoreCp504Coverage,
  validateGovernanceCoreCp504P07FoundationSliceDescriptor,
  validateGovernanceCoreCp505Coverage,
  validateGovernanceCoreCp505P07ImplementationSliceDescriptor,
  validateGovernanceCoreCp506Coverage,
  validateGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp507Coverage,
  validateGovernanceCoreCp507P07CloseoutP08FoundationDescriptor,
  validateGovernanceCoreCp508Coverage,
  validateGovernanceCoreCp508P08ImplementationSliceDescriptor,
  validateGovernanceCoreCp509Coverage,
  validateGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp510Coverage,
  validateGovernanceCoreCp510P08CloseoutP09FoundationDescriptor,
  validateGovernanceCoreCp511Coverage,
  validateGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor,
  validateGovernanceCoreCp512Coverage,
  validateGovernanceCoreCp512P09FixtureSliceDescriptor,
  validateGovernanceCoreCp513Coverage,
  validateGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor,
} from "../packages/governance/src/index.js";

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

const governanceContract = await readJson("../contracts/governance-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp480Manifest = await readOptionalJson("../docs/closeout-packs/cp00-480/manifest.json");
const cp480PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-480") ?? cp480Manifest?.plan_binding_snapshot;
const cp481Manifest = await readOptionalJson("../docs/closeout-packs/cp00-481/manifest.json");
const cp481PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-481") ?? cp481Manifest?.plan_binding_snapshot;
const cp482Manifest = await readOptionalJson("../docs/closeout-packs/cp00-482/manifest.json");
const cp482PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-482") ?? cp482Manifest?.plan_binding_snapshot;
const cp483Manifest = await readOptionalJson("../docs/closeout-packs/cp00-483/manifest.json");
const cp483PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-483") ?? cp483Manifest?.plan_binding_snapshot;
const cp484Manifest = await readOptionalJson("../docs/closeout-packs/cp00-484/manifest.json");
const cp484PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-484") ?? cp484Manifest?.plan_binding_snapshot;
const cp485Manifest = await readOptionalJson("../docs/closeout-packs/cp00-485/manifest.json");
const cp485PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-485") ?? cp485Manifest?.plan_binding_snapshot;
const cp486Manifest = await readOptionalJson("../docs/closeout-packs/cp00-486/manifest.json");
const cp486PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-486") ?? cp486Manifest?.plan_binding_snapshot;
const cp487Manifest = await readOptionalJson("../docs/closeout-packs/cp00-487/manifest.json");
const cp487PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-487") ?? cp487Manifest?.plan_binding_snapshot;
const cp488Manifest = await readOptionalJson("../docs/closeout-packs/cp00-488/manifest.json");
const cp488PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-488") ?? cp488Manifest?.plan_binding_snapshot;
const cp489Manifest = await readOptionalJson("../docs/closeout-packs/cp00-489/manifest.json");
const cp489PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-489") ?? cp489Manifest?.plan_binding_snapshot;
const cp490Manifest = await readOptionalJson("../docs/closeout-packs/cp00-490/manifest.json");
const cp490PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-490") ?? cp490Manifest?.plan_binding_snapshot;
const cp491Manifest = await readOptionalJson("../docs/closeout-packs/cp00-491/manifest.json");
const cp491PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-491") ?? cp491Manifest?.plan_binding_snapshot;
const cp492Manifest = await readOptionalJson("../docs/closeout-packs/cp00-492/manifest.json");
const cp492PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-492") ?? cp492Manifest?.plan_binding_snapshot;
const cp493Manifest = await readOptionalJson("../docs/closeout-packs/cp00-493/manifest.json");
const cp493PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-493") ?? cp493Manifest?.plan_binding_snapshot;
const cp494Manifest = await readOptionalJson("../docs/closeout-packs/cp00-494/manifest.json");
const cp494PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-494") ?? cp494Manifest?.plan_binding_snapshot;
const cp495Manifest = await readOptionalJson("../docs/closeout-packs/cp00-495/manifest.json");
const cp495PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-495") ?? cp495Manifest?.plan_binding_snapshot;
const cp496Manifest = await readOptionalJson("../docs/closeout-packs/cp00-496/manifest.json");
const cp496PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-496") ?? cp496Manifest?.plan_binding_snapshot;
const cp497Manifest = await readOptionalJson("../docs/closeout-packs/cp00-497/manifest.json");
const cp497PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-497") ?? cp497Manifest?.plan_binding_snapshot;
const cp498Manifest = await readOptionalJson("../docs/closeout-packs/cp00-498/manifest.json");
const cp498PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-498") ?? cp498Manifest?.plan_binding_snapshot;
const cp499Manifest = await readOptionalJson("../docs/closeout-packs/cp00-499/manifest.json");
const cp499PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-499") ?? cp499Manifest?.plan_binding_snapshot;
const cp500Manifest = await readOptionalJson("../docs/closeout-packs/cp00-500/manifest.json");
const cp500PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-500") ?? cp500Manifest?.plan_binding_snapshot;
const cp501Manifest = await readOptionalJson("../docs/closeout-packs/cp00-501/manifest.json");
const cp501PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-501") ?? cp501Manifest?.plan_binding_snapshot;
const cp502Manifest = await readOptionalJson("../docs/closeout-packs/cp00-502/manifest.json");
const cp502PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-502") ?? cp502Manifest?.plan_binding_snapshot;
const cp503Manifest = await readOptionalJson("../docs/closeout-packs/cp00-503/manifest.json");
const cp503PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-503") ?? cp503Manifest?.plan_binding_snapshot;
const cp504Manifest = await readOptionalJson("../docs/closeout-packs/cp00-504/manifest.json");
const cp504PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-504") ?? cp504Manifest?.plan_binding_snapshot;
const cp505Manifest = await readOptionalJson("../docs/closeout-packs/cp00-505/manifest.json");
const cp505PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-505") ?? cp505Manifest?.plan_binding_snapshot;
const cp506Manifest = await readOptionalJson("../docs/closeout-packs/cp00-506/manifest.json");
const cp506PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-506") ?? cp506Manifest?.plan_binding_snapshot;
const cp507Manifest = await readOptionalJson("../docs/closeout-packs/cp00-507/manifest.json");
const cp507PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-507") ?? cp507Manifest?.plan_binding_snapshot;
const cp508Manifest = await readOptionalJson("../docs/closeout-packs/cp00-508/manifest.json");
const cp508PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-508") ?? cp508Manifest?.plan_binding_snapshot;
const cp509Manifest = await readOptionalJson("../docs/closeout-packs/cp00-509/manifest.json");
const cp509PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-509") ?? cp509Manifest?.plan_binding_snapshot;
const cp510Manifest = await readOptionalJson("../docs/closeout-packs/cp00-510/manifest.json");
const cp510PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-510") ?? cp510Manifest?.plan_binding_snapshot;
const cp511Manifest = await readOptionalJson("../docs/closeout-packs/cp00-511/manifest.json");
const cp511PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-511") ?? cp511Manifest?.plan_binding_snapshot;
const cp512Manifest = await readOptionalJson("../docs/closeout-packs/cp00-512/manifest.json");
const cp512PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-512") ?? cp512Manifest?.plan_binding_snapshot;
const cp513Manifest = await readOptionalJson("../docs/closeout-packs/cp00-513/manifest.json");
const cp513PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-513") ?? cp513Manifest?.plan_binding_snapshot;

assert.equal(governanceContract.schema_version, "law-firm-os.governance-core-contract.v0.1");
assert.equal(governanceContract.program.program_id, "RP16");
assert.equal(governanceContract.program.program_title, "Governance DLP Retention");
assert.equal(governanceContract.program.upstream_program_id, "RP15");
assert.equal(governanceContract.program.hermes_gate, "H16");
assert.equal(governanceContract.program.claude_gate, "C16");
assert.equal(governanceContract.program.descriptor_only, true);
assert.deepEqual(governanceContract.program, JSON.parse(JSON.stringify(GOVERNANCE_CORE_PROGRAM_CONTRACT)));
assert.equal(governanceContract.current_pack.pack_id, "CP00-513");
assert.equal(governanceContract.program.current_pack_id, "CP00-513");
assert.deepEqual(governanceContract.current_pack, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP513_PACK_BINDING)));
assert.deepEqual(governanceContract.no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION)));

assert.ok(cp480PlanPack, "CP00-480 must exist in closeout-pack-plan.json");
assert.equal(cp480PlanPack.unit_count, GOVERNANCE_CORE_CP480_PACK_BINDING.unit_count, "CP00-480 unit count drift");
assert.ok(cp481PlanPack, "CP00-481 must exist in closeout-pack-plan.json");
assert.equal(cp481PlanPack.unit_count, GOVERNANCE_CORE_CP481_PACK_BINDING.unit_count, "CP00-481 unit count drift");
assert.ok(cp482PlanPack, "CP00-482 must exist in closeout-pack-plan.json");
assert.equal(cp482PlanPack.unit_count, GOVERNANCE_CORE_CP482_PACK_BINDING.unit_count, "CP00-482 unit count drift");
assert.ok(cp483PlanPack, "CP00-483 must exist in closeout-pack-plan.json");
assert.equal(cp483PlanPack.unit_count, GOVERNANCE_CORE_CP483_PACK_BINDING.unit_count, "CP00-483 unit count drift");
assert.ok(cp484PlanPack, "CP00-484 must exist in closeout-pack-plan.json");
assert.equal(cp484PlanPack.unit_count, GOVERNANCE_CORE_CP484_PACK_BINDING.unit_count, "CP00-484 unit count drift");
assert.ok(cp485PlanPack, "CP00-485 must exist in closeout-pack-plan.json");
assert.equal(cp485PlanPack.unit_count, GOVERNANCE_CORE_CP485_PACK_BINDING.unit_count, "CP00-485 unit count drift");
assert.ok(cp486PlanPack, "CP00-486 must exist in closeout-pack-plan.json");
assert.equal(cp486PlanPack.unit_count, GOVERNANCE_CORE_CP486_PACK_BINDING.unit_count, "CP00-486 unit count drift");
assert.ok(cp487PlanPack, "CP00-487 must exist in closeout-pack-plan.json");
assert.equal(cp487PlanPack.unit_count, GOVERNANCE_CORE_CP487_PACK_BINDING.unit_count, "CP00-487 unit count drift");
assert.ok(cp488PlanPack, "CP00-488 must exist in closeout-pack-plan.json");
assert.equal(cp488PlanPack.unit_count, GOVERNANCE_CORE_CP488_PACK_BINDING.unit_count, "CP00-488 unit count drift");
assert.ok(cp489PlanPack, "CP00-489 must exist in closeout-pack-plan.json");
assert.equal(cp489PlanPack.unit_count, GOVERNANCE_CORE_CP489_PACK_BINDING.unit_count, "CP00-489 unit count drift");
assert.ok(cp490PlanPack, "CP00-490 must exist in closeout-pack-plan.json");
assert.equal(cp490PlanPack.unit_count, GOVERNANCE_CORE_CP490_PACK_BINDING.unit_count, "CP00-490 unit count drift");
assert.ok(cp491PlanPack, "CP00-491 must exist in closeout-pack-plan.json");
assert.equal(cp491PlanPack.unit_count, GOVERNANCE_CORE_CP491_PACK_BINDING.unit_count, "CP00-491 unit count drift");
assert.ok(cp492PlanPack, "CP00-492 must exist in closeout-pack-plan.json");
assert.equal(cp492PlanPack.unit_count, GOVERNANCE_CORE_CP492_PACK_BINDING.unit_count, "CP00-492 unit count drift");
assert.ok(cp493PlanPack, "CP00-493 must exist in closeout-pack-plan.json");
assert.equal(cp493PlanPack.unit_count, GOVERNANCE_CORE_CP493_PACK_BINDING.unit_count, "CP00-493 unit count drift");
assert.ok(cp494PlanPack, "CP00-494 must exist in closeout-pack-plan.json");
assert.equal(cp494PlanPack.unit_count, GOVERNANCE_CORE_CP494_PACK_BINDING.unit_count, "CP00-494 unit count drift");
assert.ok(cp495PlanPack, "CP00-495 must exist in closeout-pack-plan.json");
assert.equal(cp495PlanPack.unit_count, GOVERNANCE_CORE_CP495_PACK_BINDING.unit_count, "CP00-495 unit count drift");
assert.ok(cp496PlanPack, "CP00-496 must exist in closeout-pack-plan.json");
assert.equal(cp496PlanPack.unit_count, GOVERNANCE_CORE_CP496_PACK_BINDING.unit_count, "CP00-496 unit count drift");
assert.ok(cp497PlanPack, "CP00-497 must exist in closeout-pack-plan.json");
assert.equal(cp497PlanPack.unit_count, GOVERNANCE_CORE_CP497_PACK_BINDING.unit_count, "CP00-497 unit count drift");
assert.ok(cp498PlanPack, "CP00-498 must exist in closeout-pack-plan.json");
assert.equal(cp498PlanPack.unit_count, GOVERNANCE_CORE_CP498_PACK_BINDING.unit_count, "CP00-498 unit count drift");
assert.ok(cp499PlanPack, "CP00-499 must exist in closeout-pack-plan.json");
assert.equal(cp499PlanPack.unit_count, GOVERNANCE_CORE_CP499_PACK_BINDING.unit_count, "CP00-499 unit count drift");
assert.ok(cp500PlanPack, "CP00-500 must exist in closeout-pack-plan.json");
assert.equal(cp500PlanPack.unit_count, GOVERNANCE_CORE_CP500_PACK_BINDING.unit_count, "CP00-500 unit count drift");
assert.ok(cp501PlanPack, "CP00-501 must exist in closeout-pack-plan.json");
assert.equal(cp501PlanPack.unit_count, GOVERNANCE_CORE_CP501_PACK_BINDING.unit_count, "CP00-501 unit count drift");
assert.ok(cp502PlanPack, "CP00-502 must exist in closeout-pack-plan.json");
assert.equal(cp502PlanPack.unit_count, GOVERNANCE_CORE_CP502_PACK_BINDING.unit_count, "CP00-502 unit count drift");
assert.ok(cp503PlanPack, "CP00-503 must exist in closeout-pack-plan.json");
assert.equal(cp503PlanPack.unit_count, GOVERNANCE_CORE_CP503_PACK_BINDING.unit_count, "CP00-503 unit count drift");
assert.ok(cp504PlanPack, "CP00-504 must exist in closeout-pack-plan.json");
assert.equal(cp504PlanPack.unit_count, GOVERNANCE_CORE_CP504_PACK_BINDING.unit_count, "CP00-504 unit count drift");
assert.ok(cp505PlanPack, "CP00-505 must exist in closeout-pack-plan.json");
assert.equal(cp505PlanPack.unit_count, GOVERNANCE_CORE_CP505_PACK_BINDING.unit_count, "CP00-505 unit count drift");
assert.ok(cp506PlanPack, "CP00-506 must exist in closeout-pack-plan.json");
assert.equal(cp506PlanPack.unit_count, GOVERNANCE_CORE_CP506_PACK_BINDING.unit_count, "CP00-506 unit count drift");
assert.ok(cp507PlanPack, "CP00-507 must exist in closeout-pack-plan.json");
assert.equal(cp507PlanPack.unit_count, GOVERNANCE_CORE_CP507_PACK_BINDING.unit_count, "CP00-507 unit count drift");
assert.ok(cp508PlanPack, "CP00-508 must exist in closeout-pack-plan.json");
assert.equal(cp508PlanPack.unit_count, GOVERNANCE_CORE_CP508_PACK_BINDING.unit_count, "CP00-508 unit count drift");
assert.ok(cp509PlanPack, "CP00-509 must exist in closeout-pack-plan.json");
assert.equal(cp509PlanPack.unit_count, GOVERNANCE_CORE_CP509_PACK_BINDING.unit_count, "CP00-509 unit count drift");
assert.ok(cp510PlanPack, "CP00-510 must exist in closeout-pack-plan.json");
assert.equal(cp510PlanPack.unit_count, GOVERNANCE_CORE_CP510_PACK_BINDING.unit_count, "CP00-510 unit count drift");
assert.ok(cp511PlanPack, "CP00-511 must exist in closeout-pack-plan.json");
assert.equal(cp511PlanPack.unit_count, GOVERNANCE_CORE_CP511_PACK_BINDING.unit_count, "CP00-511 unit count drift");
assert.ok(cp512PlanPack, "CP00-512 must exist in closeout-pack-plan.json");
assert.equal(cp512PlanPack.unit_count, GOVERNANCE_CORE_CP512_PACK_BINDING.unit_count, "CP00-512 unit count drift");
assert.ok(cp513PlanPack, "CP00-513 must exist in closeout-pack-plan.json");
assert.equal(cp513PlanPack.unit_count, GOVERNANCE_CORE_CP513_PACK_BINDING.unit_count, "CP00-513 unit count drift");

const cp480Coverage = validateGovernanceCoreCp480Coverage(cp480PlanPack);
const cp480Descriptor = createGovernanceCoreCp480ScopeContractFoundationDescriptor();
const cp480CaseSet = createGovernanceCoreCp480ScopeContractFoundationCaseSet();
const cp480Foundation = validateGovernanceCoreCp480ScopeContractFoundationDescriptor(cp480Descriptor, governanceContract);
const cp480Hermes = createGovernanceCoreCp480HermesEvidencePacket(cp480PlanPack, governanceContract, cp480Descriptor);
const cp480Claude = createGovernanceCoreCp480ClaudeReviewPacket(cp480PlanPack);
const cp480Handoff = createGovernanceCoreCp480CloseoutHandoff();
const cp481Coverage = validateGovernanceCoreCp481Coverage(cp481PlanPack);
const cp481Descriptor = createGovernanceCoreCp481ModelFoundationSliceDescriptor();
const cp481CaseSet = createGovernanceCoreCp481ModelFoundationSliceCaseSet();
const cp481Slice = validateGovernanceCoreCp481ModelFoundationSliceDescriptor(cp481Descriptor, governanceContract);
const cp481Hermes = createGovernanceCoreCp481HermesEvidencePacket(cp481PlanPack, governanceContract, cp481Descriptor);
const cp481Claude = createGovernanceCoreCp481ClaudeReviewPacket(cp481PlanPack);
const cp481Handoff = createGovernanceCoreCp481CloseoutHandoff();
const cp482Coverage = validateGovernanceCoreCp482Coverage(cp482PlanPack);
const cp482Descriptor = createGovernanceCoreCp482WorkflowPermissionSliceDescriptor();
const cp482CaseSet = createGovernanceCoreCp482WorkflowPermissionSliceCaseSet();
const cp482Slice = validateGovernanceCoreCp482WorkflowPermissionSliceDescriptor(cp482Descriptor, governanceContract);
const cp482Hermes = createGovernanceCoreCp482HermesEvidencePacket(cp482PlanPack, governanceContract, cp482Descriptor);
const cp482Claude = createGovernanceCoreCp482ClaudeReviewPacket(cp482PlanPack);
const cp482Handoff = createGovernanceCoreCp482CloseoutHandoff();
const cp483Coverage = validateGovernanceCoreCp483Coverage(cp483PlanPack);
const cp483Descriptor = createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor();
const cp483CaseSet = createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet();
const cp483Slice = validateGovernanceCoreCp483P01CloseoutP02FoundationDescriptor(cp483Descriptor, governanceContract);
const cp483Hermes = createGovernanceCoreCp483HermesEvidencePacket(cp483PlanPack, governanceContract, cp483Descriptor);
const cp483Claude = createGovernanceCoreCp483ClaudeReviewPacket(cp483PlanPack);
const cp483Handoff = createGovernanceCoreCp483CloseoutHandoff();
const cp484Coverage = validateGovernanceCoreCp484Coverage(cp484PlanPack);
const cp484Descriptor = createGovernanceCoreCp484P02ImplementationSliceDescriptor();
const cp484CaseSet = createGovernanceCoreCp484P02ImplementationSliceCaseSet();
const cp484Slice = validateGovernanceCoreCp484P02ImplementationSliceDescriptor(cp484Descriptor, governanceContract);
const cp484Hermes = createGovernanceCoreCp484HermesEvidencePacket(cp484PlanPack, governanceContract, cp484Descriptor);
const cp484Claude = createGovernanceCoreCp484ClaudeReviewPacket(cp484PlanPack);
const cp484Handoff = createGovernanceCoreCp484CloseoutHandoff();
const cp485Coverage = validateGovernanceCoreCp485Coverage(cp485PlanPack);
const cp485Descriptor = createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor();
const cp485CaseSet = createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet();
const cp485Slice = validateGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor(cp485Descriptor, governanceContract);
const cp485Hermes = createGovernanceCoreCp485HermesEvidencePacket(cp485PlanPack, governanceContract, cp485Descriptor);
const cp485Claude = createGovernanceCoreCp485ClaudeReviewPacket(cp485PlanPack);
const cp485Handoff = createGovernanceCoreCp485CloseoutHandoff();
const cp486Coverage = validateGovernanceCoreCp486Coverage(cp486PlanPack);
const cp486Descriptor = createGovernanceCoreCp486P02FixtureTestSliceDescriptor();
const cp486CaseSet = createGovernanceCoreCp486P02FixtureTestSliceCaseSet();
const cp486Slice = validateGovernanceCoreCp486P02FixtureTestSliceDescriptor(cp486Descriptor, governanceContract);
const cp486Hermes = createGovernanceCoreCp486HermesEvidencePacket(cp486PlanPack, governanceContract, cp486Descriptor);
const cp486Claude = createGovernanceCoreCp486ClaudeReviewPacket(cp486PlanPack);
const cp486Handoff = createGovernanceCoreCp486CloseoutHandoff();
const cp487Coverage = validateGovernanceCoreCp487Coverage(cp487PlanPack);
const cp487Descriptor = createGovernanceCoreCp487P02TestSliceDescriptor();
const cp487CaseSet = createGovernanceCoreCp487P02TestSliceCaseSet();
const cp487Slice = validateGovernanceCoreCp487P02TestSliceDescriptor(cp487Descriptor, governanceContract);
const cp487Hermes = createGovernanceCoreCp487HermesEvidencePacket(cp487PlanPack, governanceContract, cp487Descriptor);
const cp487Claude = createGovernanceCoreCp487ClaudeReviewPacket(cp487PlanPack);
const cp487Handoff = createGovernanceCoreCp487CloseoutHandoff();
const cp488Coverage = validateGovernanceCoreCp488Coverage(cp488PlanPack);
const cp488Descriptor = createGovernanceCoreCp488P02TestHermesSliceDescriptor();
const cp488CaseSet = createGovernanceCoreCp488P02TestHermesSliceCaseSet();
const cp488Slice = validateGovernanceCoreCp488P02TestHermesSliceDescriptor(cp488Descriptor, governanceContract);
const cp488Hermes = createGovernanceCoreCp488HermesEvidencePacket(cp488PlanPack, governanceContract, cp488Descriptor);
const cp488Claude = createGovernanceCoreCp488ClaudeReviewPacket(cp488PlanPack);
const cp488Handoff = createGovernanceCoreCp488CloseoutHandoff();
const cp489Coverage = validateGovernanceCoreCp489Coverage(cp489PlanPack);
const cp489Descriptor = createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor();
const cp489CaseSet = createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet();
const cp489Slice = validateGovernanceCoreCp489P02CloseoutP03FoundationDescriptor(cp489Descriptor, governanceContract);
const cp489Hermes = createGovernanceCoreCp489HermesEvidencePacket(cp489PlanPack, governanceContract, cp489Descriptor);
const cp489Claude = createGovernanceCoreCp489ClaudeReviewPacket(cp489PlanPack);
const cp489Handoff = createGovernanceCoreCp489CloseoutHandoff();
const cp490Coverage = validateGovernanceCoreCp490Coverage(cp490PlanPack);
const cp490Descriptor = createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor();
const cp490CaseSet = createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet();
const cp490Slice = validateGovernanceCoreCp490P03CloseoutP04FoundationDescriptor(cp490Descriptor, governanceContract);
const cp490Hermes = createGovernanceCoreCp490HermesEvidencePacket(cp490PlanPack, governanceContract, cp490Descriptor);
const cp490Claude = createGovernanceCoreCp490ClaudeReviewPacket(cp490PlanPack);
const cp490Handoff = createGovernanceCoreCp490CloseoutHandoff();
const cp491Coverage = validateGovernanceCoreCp491Coverage(cp491PlanPack);
const cp491Descriptor = createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor();
const cp491CaseSet = createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet();
const cp491Slice = validateGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor(cp491Descriptor, governanceContract);
const cp491Hermes = createGovernanceCoreCp491HermesEvidencePacket(cp491PlanPack, governanceContract, cp491Descriptor);
const cp491Claude = createGovernanceCoreCp491ClaudeReviewPacket(cp491PlanPack);
const cp491Handoff = createGovernanceCoreCp491CloseoutHandoff();
const cp492Coverage = validateGovernanceCoreCp492Coverage(cp492PlanPack);
const cp492Descriptor = createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor();
const cp492CaseSet = createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet();
const cp492Slice = validateGovernanceCoreCp492P04PermissionFixtureSliceDescriptor(cp492Descriptor, governanceContract);
const cp492Hermes = createGovernanceCoreCp492HermesEvidencePacket(cp492PlanPack, governanceContract, cp492Descriptor);
const cp492Claude = createGovernanceCoreCp492ClaudeReviewPacket(cp492PlanPack);
const cp492Handoff = createGovernanceCoreCp492CloseoutHandoff();
const cp493Coverage = validateGovernanceCoreCp493Coverage(cp493PlanPack);
const cp493Descriptor = createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor();
const cp493CaseSet = createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet();
const cp493Slice = validateGovernanceCoreCp493P04CloseoutP05FoundationDescriptor(cp493Descriptor, governanceContract);
const cp493Hermes = createGovernanceCoreCp493HermesEvidencePacket(cp493PlanPack, governanceContract, cp493Descriptor);
const cp493Claude = createGovernanceCoreCp493ClaudeReviewPacket(cp493PlanPack);
const cp493Handoff = createGovernanceCoreCp493CloseoutHandoff();
const cp494Coverage = validateGovernanceCoreCp494Coverage(cp494PlanPack);
const cp494Descriptor = createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor();
const cp494CaseSet = createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet();
const cp494Slice = validateGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor(cp494Descriptor, governanceContract);
const cp494Hermes = createGovernanceCoreCp494HermesEvidencePacket(cp494PlanPack, governanceContract, cp494Descriptor);
const cp494Claude = createGovernanceCoreCp494ClaudeReviewPacket(cp494PlanPack);
const cp494Handoff = createGovernanceCoreCp494CloseoutHandoff();
const cp495Coverage = validateGovernanceCoreCp495Coverage(cp495PlanPack);
const cp495Descriptor = createGovernanceCoreCp495P05PermissionSliceDescriptor();
const cp495CaseSet = createGovernanceCoreCp495P05PermissionSliceCaseSet();
const cp495Slice = validateGovernanceCoreCp495P05PermissionSliceDescriptor(cp495Descriptor, governanceContract);
const cp495Hermes = createGovernanceCoreCp495HermesEvidencePacket(cp495PlanPack, governanceContract, cp495Descriptor);
const cp495Claude = createGovernanceCoreCp495ClaudeReviewPacket(cp495PlanPack);
const cp495Handoff = createGovernanceCoreCp495CloseoutHandoff();
const cp496Coverage = validateGovernanceCoreCp496Coverage(cp496PlanPack);
const cp496Descriptor = createGovernanceCoreCp496P05AuditBindingSliceDescriptor();
const cp496CaseSet = createGovernanceCoreCp496P05AuditBindingSliceCaseSet();
const cp496Slice = validateGovernanceCoreCp496P05AuditBindingSliceDescriptor(cp496Descriptor, governanceContract);
const cp496Hermes = createGovernanceCoreCp496HermesEvidencePacket(cp496PlanPack, governanceContract, cp496Descriptor);
const cp496Claude = createGovernanceCoreCp496ClaudeReviewPacket(cp496PlanPack);
const cp496Handoff = createGovernanceCoreCp496CloseoutHandoff();
const cp497Coverage = validateGovernanceCoreCp497Coverage(cp497PlanPack);
const cp497Descriptor = createGovernanceCoreCp497P05FixtureSliceDescriptor();
const cp497CaseSet = createGovernanceCoreCp497P05FixtureSliceCaseSet();
const cp497Slice = validateGovernanceCoreCp497P05FixtureSliceDescriptor(cp497Descriptor, governanceContract);
const cp497Hermes = createGovernanceCoreCp497HermesEvidencePacket(cp497PlanPack, governanceContract, cp497Descriptor);
const cp497Claude = createGovernanceCoreCp497ClaudeReviewPacket(cp497PlanPack);
const cp497Handoff = createGovernanceCoreCp497CloseoutHandoff();
const cp498Coverage = validateGovernanceCoreCp498Coverage(cp498PlanPack);
const cp498Descriptor = createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor();
const cp498CaseSet = createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet();
const cp498Slice = validateGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor(cp498Descriptor, governanceContract);
const cp498Hermes = createGovernanceCoreCp498HermesEvidencePacket(cp498PlanPack, governanceContract, cp498Descriptor);
const cp498Claude = createGovernanceCoreCp498ClaudeReviewPacket(cp498PlanPack);
const cp498Handoff = createGovernanceCoreCp498CloseoutHandoff();
const cp499Coverage = validateGovernanceCoreCp499Coverage(cp499PlanPack);
const cp499Descriptor = createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor();
const cp499CaseSet = createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet();
const cp499Slice = validateGovernanceCoreCp499P05CloseoutP06FoundationDescriptor(cp499Descriptor, governanceContract);
const cp499Hermes = createGovernanceCoreCp499HermesEvidencePacket(cp499PlanPack, governanceContract, cp499Descriptor);
const cp499Claude = createGovernanceCoreCp499ClaudeReviewPacket(cp499PlanPack);
const cp499Handoff = createGovernanceCoreCp499CloseoutHandoff();
const cp500Coverage = validateGovernanceCoreCp500Coverage(cp500PlanPack);
const cp500Descriptor = createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor();
const cp500CaseSet = createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet();
const cp500Slice = validateGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor(cp500Descriptor, governanceContract);
const cp500Hermes = createGovernanceCoreCp500HermesEvidencePacket(cp500PlanPack, governanceContract, cp500Descriptor);
const cp500Claude = createGovernanceCoreCp500ClaudeReviewPacket(cp500PlanPack);
const cp500Handoff = createGovernanceCoreCp500CloseoutHandoff();
const cp501Coverage = validateGovernanceCoreCp501Coverage(cp501PlanPack);
const cp501Descriptor = createGovernanceCoreCp501P06PermissionSliceDescriptor();
const cp501CaseSet = createGovernanceCoreCp501P06PermissionSliceCaseSet();
const cp501Slice = validateGovernanceCoreCp501P06PermissionSliceDescriptor(cp501Descriptor, governanceContract);
const cp501Hermes = createGovernanceCoreCp501HermesEvidencePacket(cp501PlanPack, governanceContract, cp501Descriptor);
const cp501Claude = createGovernanceCoreCp501ClaudeReviewPacket(cp501PlanPack);
const cp501Handoff = createGovernanceCoreCp501CloseoutHandoff();
const cp502Coverage = validateGovernanceCoreCp502Coverage(cp502PlanPack);
const cp502Descriptor = createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor();
const cp502CaseSet = createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet();
const cp502Slice = validateGovernanceCoreCp502P06PermissionFixtureSliceDescriptor(cp502Descriptor, governanceContract);
const cp502Hermes = createGovernanceCoreCp502HermesEvidencePacket(cp502PlanPack, governanceContract, cp502Descriptor);
const cp502Claude = createGovernanceCoreCp502ClaudeReviewPacket(cp502PlanPack);
const cp502Handoff = createGovernanceCoreCp502CloseoutHandoff();
const cp503Coverage = validateGovernanceCoreCp503Coverage(cp503PlanPack);
const cp503Descriptor = createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor();
const cp503CaseSet = createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet();
const cp503Slice = validateGovernanceCoreCp503P06CloseoutP07FoundationDescriptor(cp503Descriptor, governanceContract);
const cp503Hermes = createGovernanceCoreCp503HermesEvidencePacket(cp503PlanPack, governanceContract, cp503Descriptor);
const cp503Claude = createGovernanceCoreCp503ClaudeReviewPacket(cp503PlanPack);
const cp503Handoff = createGovernanceCoreCp503CloseoutHandoff();
const cp504Coverage = validateGovernanceCoreCp504Coverage(cp504PlanPack);
const cp504Descriptor = createGovernanceCoreCp504P07FoundationSliceDescriptor();
const cp504CaseSet = createGovernanceCoreCp504P07FoundationSliceCaseSet();
const cp504Slice = validateGovernanceCoreCp504P07FoundationSliceDescriptor(cp504Descriptor, governanceContract);
const cp504Hermes = createGovernanceCoreCp504HermesEvidencePacket(cp504PlanPack, governanceContract, cp504Descriptor);
const cp504Claude = createGovernanceCoreCp504ClaudeReviewPacket(cp504PlanPack);
const cp504Handoff = createGovernanceCoreCp504CloseoutHandoff();
const cp505Coverage = validateGovernanceCoreCp505Coverage(cp505PlanPack);
const cp505Descriptor = createGovernanceCoreCp505P07ImplementationSliceDescriptor();
const cp505CaseSet = createGovernanceCoreCp505P07ImplementationSliceCaseSet();
const cp505Slice = validateGovernanceCoreCp505P07ImplementationSliceDescriptor(cp505Descriptor, governanceContract);
const cp505Hermes = createGovernanceCoreCp505HermesEvidencePacket(cp505PlanPack, governanceContract, cp505Descriptor);
const cp505Claude = createGovernanceCoreCp505ClaudeReviewPacket(cp505PlanPack);
const cp505Handoff = createGovernanceCoreCp505CloseoutHandoff();
const cp506Coverage = validateGovernanceCoreCp506Coverage(cp506PlanPack);
const cp506Descriptor = createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor();
const cp506CaseSet = createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet();
const cp506Slice = validateGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor(cp506Descriptor, governanceContract);
const cp506Hermes = createGovernanceCoreCp506HermesEvidencePacket(cp506PlanPack, governanceContract, cp506Descriptor);
const cp506Claude = createGovernanceCoreCp506ClaudeReviewPacket(cp506PlanPack);
const cp506Handoff = createGovernanceCoreCp506CloseoutHandoff();
const cp507Coverage = validateGovernanceCoreCp507Coverage(cp507PlanPack);
const cp507Descriptor = createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor();
const cp507CaseSet = createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet();
const cp507Slice = validateGovernanceCoreCp507P07CloseoutP08FoundationDescriptor(cp507Descriptor, governanceContract);
const cp507Hermes = createGovernanceCoreCp507HermesEvidencePacket(cp507PlanPack, governanceContract, cp507Descriptor);
const cp507Claude = createGovernanceCoreCp507ClaudeReviewPacket(cp507PlanPack);
const cp507Handoff = createGovernanceCoreCp507CloseoutHandoff();
const cp508Coverage = validateGovernanceCoreCp508Coverage(cp508PlanPack);
const cp508Descriptor = createGovernanceCoreCp508P08ImplementationSliceDescriptor();
const cp508CaseSet = createGovernanceCoreCp508P08ImplementationSliceCaseSet();
const cp508Slice = validateGovernanceCoreCp508P08ImplementationSliceDescriptor(cp508Descriptor, governanceContract);
const cp508Hermes = createGovernanceCoreCp508HermesEvidencePacket(cp508PlanPack, governanceContract, cp508Descriptor);
const cp508Claude = createGovernanceCoreCp508ClaudeReviewPacket(cp508PlanPack);
const cp508Handoff = createGovernanceCoreCp508CloseoutHandoff();
const cp509Coverage = validateGovernanceCoreCp509Coverage(cp509PlanPack);
const cp509Descriptor = createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor();
const cp509CaseSet = createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet();
const cp509Slice = validateGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor(cp509Descriptor, governanceContract);
const cp509Hermes = createGovernanceCoreCp509HermesEvidencePacket(cp509PlanPack, governanceContract, cp509Descriptor);
const cp509Claude = createGovernanceCoreCp509ClaudeReviewPacket(cp509PlanPack);
const cp509Handoff = createGovernanceCoreCp509CloseoutHandoff();
const cp510Coverage = validateGovernanceCoreCp510Coverage(cp510PlanPack);
const cp510Descriptor = createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor();
const cp510CaseSet = createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet();
const cp510Slice = validateGovernanceCoreCp510P08CloseoutP09FoundationDescriptor(cp510Descriptor, governanceContract);
const cp510Hermes = createGovernanceCoreCp510HermesEvidencePacket(cp510PlanPack, governanceContract, cp510Descriptor);
const cp510Claude = createGovernanceCoreCp510ClaudeReviewPacket(cp510PlanPack);
const cp510Handoff = createGovernanceCoreCp510CloseoutHandoff();
const cp511Coverage = validateGovernanceCoreCp511Coverage(cp511PlanPack);
const cp511Descriptor = createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor();
const cp511CaseSet = createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet();
const cp511Slice = validateGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor(cp511Descriptor, governanceContract);
const cp511Hermes = createGovernanceCoreCp511HermesEvidencePacket(cp511PlanPack, governanceContract, cp511Descriptor);
const cp511Claude = createGovernanceCoreCp511ClaudeReviewPacket(cp511PlanPack);
const cp511Handoff = createGovernanceCoreCp511CloseoutHandoff();
const cp512Coverage = validateGovernanceCoreCp512Coverage(cp512PlanPack);
const cp512Descriptor = createGovernanceCoreCp512P09FixtureSliceDescriptor();
const cp512CaseSet = createGovernanceCoreCp512P09FixtureSliceCaseSet();
const cp512Slice = validateGovernanceCoreCp512P09FixtureSliceDescriptor(cp512Descriptor, governanceContract);
const cp512Hermes = createGovernanceCoreCp512HermesEvidencePacket(cp512PlanPack, governanceContract, cp512Descriptor);
const cp512Claude = createGovernanceCoreCp512ClaudeReviewPacket(cp512PlanPack);
const cp512Handoff = createGovernanceCoreCp512CloseoutHandoff();
const cp513Coverage = validateGovernanceCoreCp513Coverage(cp513PlanPack);
const cp513Descriptor = createGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor();
const cp513CaseSet = createGovernanceCoreCp513P09CloseoutHandoffSliceCaseSet();
const cp513Slice = validateGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor(cp513Descriptor, governanceContract);
const cp513Hermes = createGovernanceCoreCp513HermesEvidencePacket(cp513PlanPack, governanceContract, cp513Descriptor);
const cp513Claude = createGovernanceCoreCp513ClaudeReviewPacket(cp513PlanPack);
const cp513Handoff = createGovernanceCoreCp513CloseoutHandoff();

assert.equal(cp480Coverage.valid, true, cp480Coverage.errors.join("; "));
assert.equal(cp480Coverage.summary.unit_count, 150);
assert.equal(cp480Coverage.summary.by_phase["RP16.P00"], 122);
assert.equal(cp480Coverage.summary.by_phase["RP16.P01"], 28);
assert.equal(cp480Foundation.valid, true, cp480Foundation.errors.join("; "));
assert.equal(cp480CaseSet.section_count, 14);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP480_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp480CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-480 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp480Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp480_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP480_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp480_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION)));
assert.equal(cp480Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp480Hermes.production_ready_candidate, true);
assert.equal(cp480Claude.review_packet, "C16.CP00-480.governance_core_scope_contract_foundation_descriptor");
assert.equal(cp480Claude.read_only, true);
assert.equal(cp480Handoff.to_pack_id, "CP00-481");
assert.equal(cp480Handoff.next_subphase_id, "RP16.P01.M02.S09");
assert.equal(GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp481Coverage.valid, true, cp481Coverage.errors.join("; "));
assert.equal(cp481Coverage.summary.unit_count, 40);
assert.equal(cp481Coverage.summary.by_micro_phase["RP16.P01.M02"], 12);
assert.equal(cp481Coverage.summary.by_micro_phase["RP16.P01.M03"], 22);
assert.equal(cp481Coverage.summary.by_micro_phase["RP16.P01.M04"], 6);
assert.equal(cp481Slice.valid, true, cp481Slice.errors.join("; "));
assert.equal(cp481CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP481_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp481CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-481 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.model_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp481Descriptor)),
  "contract model_foundation_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp481_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP481_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp481_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION)));
assert.equal(cp481Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp481Hermes.production_ready_candidate, true);
assert.equal(cp481Claude.review_packet, "C16.CP00-481.governance_core_model_foundation_slice_descriptor");
assert.equal(cp481Claude.read_only, true);
assert.equal(cp481Handoff.to_pack_id, "CP00-482");
assert.equal(cp481Handoff.next_subphase_id, "RP16.P01.M04.S07");
assert.equal(GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp482Coverage.valid, true, cp482Coverage.errors.join("; "));
assert.equal(cp482Coverage.summary.unit_count, 40);
assert.equal(cp482Coverage.summary.by_micro_phase["RP16.P01.M04"], 14);
assert.equal(cp482Coverage.summary.by_micro_phase["RP16.P01.M05"], 22);
assert.equal(cp482Coverage.summary.by_micro_phase["RP16.P01.M06"], 4);
assert.equal(cp482Slice.valid, true, cp482Slice.errors.join("; "));
assert.equal(cp482CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP482_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp482CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-482 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp482Descriptor)),
  "contract workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp482_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP482_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp482_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION)));
assert.equal(cp482Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp482Hermes.production_ready_candidate, true);
assert.equal(cp482Claude.review_packet, "C16.CP00-482.governance_core_workflow_permission_slice_descriptor");
assert.equal(cp482Claude.read_only, true);
assert.equal(cp482Handoff.to_pack_id, "CP00-483");
assert.equal(cp482Handoff.next_subphase_id, "RP16.P01.M06.S05");
assert.equal(GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp483Coverage.valid, true, cp483Coverage.errors.join("; "));
assert.equal(cp483Coverage.summary.unit_count, 150);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P01.M06"], 16);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P01.M07"], 22);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P01.M08"], 20);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P01.M09"], 20);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P01.M10"], 10);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P02.M00"], 20);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P02.M01"], 20);
assert.equal(cp483Coverage.summary.by_micro_phase["RP16.P02.M02"], 22);
assert.equal(cp483Slice.valid, true, cp483Slice.errors.join("; "));
assert.equal(cp483CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP483_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp483CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-483 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p01_closeout_p02_foundation_descriptor,
  JSON.parse(JSON.stringify(cp483Descriptor)),
  "contract p01_closeout_p02_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp483_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP483_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp483_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION)));
assert.equal(cp483Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp483Hermes.production_ready_candidate, true);
assert.equal(cp483Claude.review_packet, "C16.CP00-483.governance_core_p01_closeout_p02_foundation_descriptor");
assert.equal(cp483Claude.read_only, true);
assert.equal(cp483Handoff.to_pack_id, "CP00-484");
assert.equal(cp483Handoff.next_subphase_id, "RP16.P02.M03.S01");
assert.equal(GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp484Coverage.valid, true, cp484Coverage.errors.join("; "));
assert.equal(cp484Coverage.summary.unit_count, 40);
assert.equal(cp484Coverage.summary.by_micro_phase["RP16.P02.M03"], 22);
assert.equal(cp484Coverage.summary.by_micro_phase["RP16.P02.M04"], 18);
assert.equal(cp484Slice.valid, true, cp484Slice.errors.join("; "));
assert.equal(cp484CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP484_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp484CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-484 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp484Descriptor)),
  "contract p02_implementation_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp484_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP484_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp484_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION)));
assert.equal(cp484Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp484Hermes.production_ready_candidate, true);
assert.equal(cp484Claude.review_packet, "C16.CP00-484.governance_core_p02_implementation_slice_descriptor");
assert.equal(cp484Claude.read_only, true);
assert.equal(cp484Handoff.to_pack_id, "CP00-485");
assert.equal(cp484Handoff.next_subphase_id, "RP16.P02.M04.S19");
assert.equal(GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp485Coverage.valid, true, cp485Coverage.errors.join("; "));
assert.equal(cp485Coverage.summary.unit_count, 40);
assert.equal(cp485Coverage.summary.by_micro_phase["RP16.P02.M04"], 4);
assert.equal(cp485Coverage.summary.by_micro_phase["RP16.P02.M05"], 22);
assert.equal(cp485Coverage.summary.by_micro_phase["RP16.P02.M06"], 14);
assert.equal(cp485Slice.valid, true, cp485Slice.errors.join("; "));
assert.equal(cp485CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP485_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp485CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-485 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp485Descriptor)),
  "contract p02_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp485_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP485_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp485_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION)));
assert.equal(cp485Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp485Hermes.production_ready_candidate, true);
assert.equal(cp485Claude.review_packet, "C16.CP00-485.governance_core_p02_workflow_permission_slice_descriptor");
assert.equal(cp485Claude.read_only, true);
assert.equal(cp485Handoff.to_pack_id, "CP00-486");
assert.equal(cp485Handoff.next_subphase_id, "RP16.P02.M06.S15");
assert.equal(GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp486Coverage.valid, true, cp486Coverage.errors.join("; "));
assert.equal(cp486Coverage.summary.unit_count, 10);
assert.equal(cp486Coverage.summary.by_micro_phase["RP16.P02.M06"], 8);
assert.equal(cp486Coverage.summary.by_micro_phase["RP16.P02.M07"], 2);
assert.equal(cp486Slice.valid, true, cp486Slice.errors.join("; "));
assert.equal(cp486CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP486_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp486CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-486 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_fixture_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp486Descriptor)),
  "contract p02_fixture_test_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp486_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP486_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp486_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION)));
assert.equal(cp486Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp486Hermes.production_ready_candidate, true);
assert.equal(cp486Claude.review_packet, "C16.CP00-486.governance_core_p02_fixture_test_slice_descriptor");
assert.equal(cp486Claude.read_only, true);
assert.equal(cp486Handoff.to_pack_id, "CP00-487");
assert.equal(cp486Handoff.next_subphase_id, "RP16.P02.M07.S03");
assert.equal(GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp487Coverage.valid, true, cp487Coverage.errors.join("; "));
assert.equal(cp487Coverage.summary.unit_count, 10);
assert.equal(cp487Coverage.summary.by_micro_phase["RP16.P02.M07"], 10);
assert.equal(cp487Slice.valid, true, cp487Slice.errors.join("; "));
assert.equal(cp487CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP487_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp487CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-487 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_test_slice_descriptor,
  JSON.parse(JSON.stringify(cp487Descriptor)),
  "contract p02_test_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp487_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP487_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp487_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION)));
assert.equal(cp487Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp487Hermes.production_ready_candidate, true);
assert.equal(cp487Claude.review_packet, "C16.CP00-487.governance_core_p02_test_slice_descriptor");
assert.equal(cp487Claude.read_only, true);
assert.equal(cp487Handoff.to_pack_id, "CP00-488");
assert.equal(cp487Handoff.next_subphase_id, "RP16.P02.M07.S13");
assert.equal(GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp488Coverage.valid, true, cp488Coverage.errors.join("; "));
assert.equal(cp488Coverage.summary.unit_count, 40);
assert.equal(cp488Coverage.summary.by_micro_phase["RP16.P02.M07"], 10);
assert.equal(cp488Coverage.summary.by_micro_phase["RP16.P02.M08"], 22);
assert.equal(cp488Coverage.summary.by_micro_phase["RP16.P02.M09"], 8);
assert.equal(cp488Slice.valid, true, cp488Slice.errors.join("; "));
assert.equal(cp488CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP488_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp488CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-488 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_test_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp488Descriptor)),
  "contract p02_test_hermes_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp488_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP488_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp488_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION)));
assert.equal(cp488Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp488Hermes.production_ready_candidate, true);
assert.equal(cp488Claude.review_packet, "C16.CP00-488.governance_core_p02_test_hermes_slice_descriptor");
assert.equal(cp488Claude.read_only, true);
assert.equal(cp488Handoff.to_pack_id, "CP00-489");
assert.equal(cp488Handoff.next_subphase_id, "RP16.P02.M09.S09");
assert.equal(GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp489Coverage.valid, true, cp489Coverage.errors.join("; "));
assert.equal(cp489Coverage.summary.unit_count, 150);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P02.M09"], 14);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P02.M10"], 20);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M00"], 10);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M01"], 10);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M02"], 20);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M03"], 22);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M04"], 20);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M05"], 22);
assert.equal(cp489Coverage.summary.by_micro_phase["RP16.P03.M06"], 12);
assert.equal(cp489Slice.valid, true, cp489Slice.errors.join("; "));
assert.equal(cp489CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP489_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp489CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-489 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p02_closeout_p03_foundation_descriptor,
  JSON.parse(JSON.stringify(cp489Descriptor)),
  "contract p02_closeout_p03_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp489_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP489_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp489_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION)));
assert.equal(cp489Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp489Hermes.production_ready_candidate, true);
assert.equal(cp489Claude.review_packet, "C16.CP00-489.governance_core_p02_closeout_p03_foundation_descriptor");
assert.equal(cp489Claude.read_only, true);
assert.equal(cp489Handoff.to_pack_id, "CP00-490");
assert.equal(cp489Handoff.next_subphase_id, "RP16.P03.M06.S13");
assert.equal(GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp490Coverage.valid, true, cp490Coverage.errors.join("; "));
assert.equal(cp490Coverage.summary.unit_count, 150);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P03.M06"], 8);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P03.M07"], 22);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P03.M08"], 20);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P03.M09"], 20);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P03.M10"], 10);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P04.M00"], 10);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P04.M01"], 20);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P04.M02"], 20);
assert.equal(cp490Coverage.summary.by_micro_phase["RP16.P04.M03"], 20);
assert.equal(cp490Slice.valid, true, cp490Slice.errors.join("; "));
assert.equal(cp490CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP490_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp490CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-490 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p03_closeout_p04_foundation_descriptor,
  JSON.parse(JSON.stringify(cp490Descriptor)),
  "contract p03_closeout_p04_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp490_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP490_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp490_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION)));
assert.equal(cp490Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp490Hermes.production_ready_candidate, true);
assert.equal(cp490Claude.review_packet, "C16.CP00-490.governance_core_p03_closeout_p04_foundation_descriptor");
assert.equal(cp490Claude.read_only, true);
assert.equal(cp490Handoff.to_pack_id, "CP00-491");
assert.equal(cp490Handoff.next_subphase_id, "RP16.P04.M03.S21");
assert.equal(GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp491Coverage.valid, true, cp491Coverage.errors.join("; "));
assert.equal(cp491Coverage.summary.unit_count, 40);
assert.equal(cp491Coverage.summary.by_micro_phase["RP16.P04.M03"], 2);
assert.equal(cp491Coverage.summary.by_micro_phase["RP16.P04.M04"], 22);
assert.equal(cp491Coverage.summary.by_micro_phase["RP16.P04.M05"], 16);
assert.equal(cp491Slice.valid, true, cp491Slice.errors.join("; "));
assert.equal(cp491CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP491_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp491CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-491 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p04_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp491Descriptor)),
  "contract p04_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp491_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP491_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp491_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION)));
assert.equal(cp491Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp491Hermes.production_ready_candidate, true);
assert.equal(cp491Claude.review_packet, "C16.CP00-491.governance_core_p04_workflow_permission_slice_descriptor");
assert.equal(cp491Claude.read_only, true);
assert.equal(cp491Handoff.to_pack_id, "CP00-492");
assert.equal(cp491Handoff.next_subphase_id, "RP16.P04.M05.S17");
assert.equal(GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp492Coverage.valid, true, cp492Coverage.errors.join("; "));
assert.equal(cp492Coverage.summary.unit_count, 10);
assert.equal(cp492Coverage.summary.by_micro_phase["RP16.P04.M05"], 6);
assert.equal(cp492Coverage.summary.by_micro_phase["RP16.P04.M06"], 4);
assert.equal(cp492Slice.valid, true, cp492Slice.errors.join("; "));
assert.equal(cp492CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP492_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp492CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-492 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p04_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp492Descriptor)),
  "contract p04_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp492_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP492_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp492_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION)));
assert.equal(cp492Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp492Hermes.production_ready_candidate, true);
assert.equal(cp492Claude.review_packet, "C16.CP00-492.governance_core_p04_permission_fixture_slice_descriptor");
assert.equal(cp492Claude.read_only, true);
assert.equal(cp492Handoff.to_pack_id, "CP00-493");
assert.equal(cp492Handoff.next_subphase_id, "RP16.P04.M06.S05");
assert.equal(GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp493Coverage.valid, true, cp493Coverage.errors.join("; "));
assert.equal(cp493Coverage.summary.unit_count, 150);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P04.M06"], 18);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P04.M07"], 22);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P04.M08"], 22);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P04.M09"], 22);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P04.M10"], 10);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P05.M00"], 10);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P05.M01"], 20);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P05.M02"], 20);
assert.equal(cp493Coverage.summary.by_micro_phase["RP16.P05.M03"], 6);
assert.equal(cp493Slice.valid, true, cp493Slice.errors.join("; "));
assert.equal(cp493CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP493_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp493CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-493 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p04_closeout_p05_foundation_descriptor,
  JSON.parse(JSON.stringify(cp493Descriptor)),
  "contract p04_closeout_p05_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp493_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP493_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp493_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION)));
assert.equal(cp493Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp493Hermes.production_ready_candidate, true);
assert.equal(cp493Claude.review_packet, "C16.CP00-493.governance_core_p04_closeout_p05_foundation_descriptor");
assert.equal(cp493Claude.read_only, true);
assert.equal(cp493Handoff.to_pack_id, "CP00-494");
assert.equal(cp493Handoff.next_subphase_id, "RP16.P05.M03.S07");
assert.equal(GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp494Coverage.valid, true, cp494Coverage.errors.join("; "));
assert.equal(cp494Coverage.summary.unit_count, 40);
assert.equal(cp494Coverage.summary.by_micro_phase["RP16.P05.M03"], 16);
assert.equal(cp494Coverage.summary.by_micro_phase["RP16.P05.M04"], 22);
assert.equal(cp494Coverage.summary.by_micro_phase["RP16.P05.M05"], 2);
assert.equal(cp494Slice.valid, true, cp494Slice.errors.join("; "));
assert.equal(cp494CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP494_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp494CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-494 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp494Descriptor)),
  "contract p05_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp494_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP494_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp494_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION)));
assert.equal(cp494Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp494Hermes.production_ready_candidate, true);
assert.equal(cp494Claude.review_packet, "C16.CP00-494.governance_core_p05_implementation_workflow_slice_descriptor");
assert.equal(cp494Claude.read_only, true);
assert.equal(cp494Handoff.to_pack_id, "CP00-495");
assert.equal(cp494Handoff.next_subphase_id, "RP16.P05.M05.S03");
assert.equal(GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp495Coverage.valid, true, cp495Coverage.errors.join("; "));
assert.equal(cp495Coverage.summary.unit_count, 10);
assert.equal(cp495Coverage.summary.by_micro_phase["RP16.P05.M05"], 10);
assert.equal(cp495Slice.valid, true, cp495Slice.errors.join("; "));
assert.equal(cp495CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP495_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp495CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-495 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp495Descriptor)),
  "contract p05_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp495_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP495_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp495_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION)));
assert.equal(cp495Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp495Hermes.production_ready_candidate, true);
assert.equal(cp495Claude.review_packet, "C16.CP00-495.governance_core_p05_permission_slice_descriptor");
assert.equal(cp495Claude.read_only, true);
assert.equal(cp495Handoff.to_pack_id, "CP00-496");
assert.equal(cp495Handoff.next_subphase_id, "RP16.P05.M05.S13");
assert.equal(GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp496Coverage.valid, true, cp496Coverage.errors.join("; "));
assert.equal(cp496Coverage.summary.unit_count, 10);
assert.equal(cp496Coverage.summary.by_micro_phase["RP16.P05.M05"], 10);
assert.equal(cp496Slice.valid, true, cp496Slice.errors.join("; "));
assert.equal(cp496CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP496_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp496CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-496 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_audit_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp496Descriptor)),
  "contract p05_audit_binding_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp496_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP496_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp496_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION)));
assert.equal(cp496Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp496Hermes.production_ready_candidate, true);
assert.equal(cp496Claude.review_packet, "C16.CP00-496.governance_core_p05_audit_binding_slice_descriptor");
assert.equal(cp496Claude.read_only, true);
assert.equal(cp496Handoff.to_pack_id, "CP00-497");
assert.equal(cp496Handoff.next_subphase_id, "RP16.P05.M06.S01");
assert.equal(GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp497Coverage.valid, true, cp497Coverage.errors.join("; "));
assert.equal(cp497Coverage.summary.unit_count, 10);
assert.equal(cp497Coverage.summary.by_micro_phase["RP16.P05.M06"], 10);
assert.equal(cp497Slice.valid, true, cp497Slice.errors.join("; "));
assert.equal(cp497CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP497_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp497CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-497 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp497Descriptor)),
  "contract p05_fixture_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp497_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP497_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp497_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION)));
assert.equal(cp497Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp497Hermes.production_ready_candidate, true);
assert.equal(cp497Claude.review_packet, "C16.CP00-497.governance_core_p05_fixture_slice_descriptor");
assert.equal(cp497Claude.read_only, true);
assert.equal(cp497Handoff.to_pack_id, "CP00-498");
assert.equal(cp497Handoff.next_subphase_id, "RP16.P05.M06.S11");
assert.equal(GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp498Coverage.valid, true, cp498Coverage.errors.join("; "));
assert.equal(cp498Coverage.summary.unit_count, 10);
assert.equal(cp498Coverage.summary.by_micro_phase["RP16.P05.M06"], 10);
assert.equal(cp498Slice.valid, true, cp498Slice.errors.join("; "));
assert.equal(cp498CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP498_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp498CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-498 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_synthetic_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp498Descriptor)),
  "contract p05_synthetic_fixture_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp498_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP498_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp498_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION)));
assert.equal(cp498Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp498Hermes.production_ready_candidate, true);
assert.equal(cp498Claude.review_packet, "C16.CP00-498.governance_core_p05_synthetic_fixture_slice_descriptor");
assert.equal(cp498Claude.read_only, true);
assert.equal(cp498Handoff.to_pack_id, "CP00-499");
assert.equal(cp498Handoff.next_subphase_id, "RP16.P05.M06.S21");
assert.equal(GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp499Coverage.valid, true, cp499Coverage.errors.join("; "));
assert.equal(cp499Coverage.summary.unit_count, 150);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P05.M06"], 2);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P05.M07"], 22);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P05.M08"], 22);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P05.M09"], 22);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P05.M10"], 10);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P06.M00"], 20);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P06.M01"], 20);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P06.M02"], 22);
assert.equal(cp499Coverage.summary.by_micro_phase["RP16.P06.M03"], 10);
assert.equal(cp499Slice.valid, true, cp499Slice.errors.join("; "));
assert.equal(cp499CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP499_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp499CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-499 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p05_closeout_p06_foundation_descriptor,
  JSON.parse(JSON.stringify(cp499Descriptor)),
  "contract p05_closeout_p06_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp499_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP499_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp499_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION)));
assert.equal(cp499Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp499Hermes.production_ready_candidate, true);
assert.equal(cp499Claude.review_packet, "C16.CP00-499.governance_core_p05_closeout_p06_foundation_descriptor");
assert.equal(cp499Claude.read_only, true);
assert.equal(cp499Handoff.to_pack_id, "CP00-500");
assert.equal(cp499Handoff.next_subphase_id, "RP16.P06.M03.S11");
assert.equal(GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp500Coverage.valid, true, cp500Coverage.errors.join("; "));
assert.equal(cp500Coverage.summary.unit_count, 40);
assert.equal(cp500Coverage.summary.by_micro_phase["RP16.P06.M03"], 12);
assert.equal(cp500Coverage.summary.by_micro_phase["RP16.P06.M04"], 22);
assert.equal(cp500Coverage.summary.by_micro_phase["RP16.P06.M05"], 6);
assert.equal(cp500Slice.valid, true, cp500Slice.errors.join("; "));
assert.equal(cp500CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP500_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp500CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-500 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p06_implementation_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp500Descriptor)),
  "contract p06_implementation_workflow_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp500_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP500_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp500_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION)));
assert.equal(cp500Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp500Hermes.production_ready_candidate, true);
assert.equal(cp500Claude.review_packet, "C16.CP00-500.governance_core_p06_implementation_workflow_slice_descriptor");
assert.equal(cp500Claude.read_only, true);
assert.equal(cp500Handoff.to_pack_id, "CP00-501");
assert.equal(cp500Handoff.next_subphase_id, "RP16.P06.M05.S07");
assert.equal(GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp501Coverage.valid, true, cp501Coverage.errors.join("; "));
assert.equal(cp501Coverage.summary.unit_count, 10);
assert.equal(cp501Coverage.summary.by_micro_phase["RP16.P06.M05"], 10);
assert.equal(cp501Slice.valid, true, cp501Slice.errors.join("; "));
assert.equal(cp501CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP501_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp501CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-501 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p06_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp501Descriptor)),
  "contract p06_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp501_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP501_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp501_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION)));
assert.equal(cp501Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp501Hermes.production_ready_candidate, true);
assert.equal(cp501Claude.review_packet, "C16.CP00-501.governance_core_p06_permission_slice_descriptor");
assert.equal(cp501Claude.read_only, true);
assert.equal(cp501Handoff.to_pack_id, "CP00-502");
assert.equal(cp501Handoff.next_subphase_id, "RP16.P06.M05.S17");
assert.equal(GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp502Coverage.valid, true, cp502Coverage.errors.join("; "));
assert.equal(cp502Coverage.summary.unit_count, 10);
assert.equal(cp502Coverage.summary.by_micro_phase["RP16.P06.M05"], 6);
assert.equal(cp502Coverage.summary.by_micro_phase["RP16.P06.M06"], 4);
assert.equal(cp502Slice.valid, true, cp502Slice.errors.join("; "));
assert.equal(cp502CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP502_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp502CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-502 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p06_permission_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp502Descriptor)),
  "contract p06_permission_fixture_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp502_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP502_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp502_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION)));
assert.equal(cp502Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp502Hermes.production_ready_candidate, true);
assert.equal(cp502Claude.review_packet, "C16.CP00-502.governance_core_p06_permission_fixture_slice_descriptor");
assert.equal(cp502Claude.read_only, true);
assert.equal(cp502Handoff.to_pack_id, "CP00-503");
assert.equal(cp502Handoff.next_subphase_id, "RP16.P06.M06.S05");
assert.equal(GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp503Coverage.valid, true, cp503Coverage.errors.join("; "));
assert.equal(cp503Coverage.summary.unit_count, 150);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P06.M06"], 18);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P06.M07"], 22);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P06.M08"], 22);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P06.M09"], 22);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P06.M10"], 20);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P07.M00"], 20);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P07.M01"], 20);
assert.equal(cp503Coverage.summary.by_micro_phase["RP16.P07.M02"], 6);
assert.equal(cp503Slice.valid, true, cp503Slice.errors.join("; "));
assert.equal(cp503CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP503_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp503CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-503 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p06_closeout_p07_foundation_descriptor,
  JSON.parse(JSON.stringify(cp503Descriptor)),
  "contract p06_closeout_p07_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp503_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP503_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp503_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION)));
assert.equal(cp503Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp503Hermes.production_ready_candidate, true);
assert.equal(cp503Claude.review_packet, "C16.CP00-503.governance_core_p06_closeout_p07_foundation_descriptor");
assert.equal(cp503Claude.read_only, true);
assert.equal(cp503Handoff.to_pack_id, "CP00-504");
assert.equal(cp503Handoff.next_subphase_id, "RP16.P07.M02.S07");
assert.equal(GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp504Coverage.valid, true, cp504Coverage.errors.join("; "));
assert.equal(cp504Coverage.summary.unit_count, 10);
assert.equal(cp504Coverage.summary.by_micro_phase["RP16.P07.M02"], 10);
assert.equal(cp504Slice.valid, true, cp504Slice.errors.join("; "));
assert.equal(cp504CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP504_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp504CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-504 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p07_foundation_slice_descriptor,
  JSON.parse(JSON.stringify(cp504Descriptor)),
  "contract p07_foundation_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp504_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP504_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp504_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION)));
assert.equal(cp504Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp504Hermes.production_ready_candidate, true);
assert.equal(cp504Claude.review_packet, "C16.CP00-504.governance_core_p07_foundation_slice_descriptor");
assert.equal(cp504Claude.read_only, true);
assert.equal(cp504Handoff.to_pack_id, "CP00-505");
assert.equal(cp504Handoff.next_subphase_id, "RP16.P07.M02.S17");
assert.equal(GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp505Coverage.valid, true, cp505Coverage.errors.join("; "));
assert.equal(cp505Coverage.summary.unit_count, 40);
assert.equal(cp505Coverage.summary.by_micro_phase["RP16.P07.M02"], 6);
assert.equal(cp505Coverage.summary.by_micro_phase["RP16.P07.M03"], 22);
assert.equal(cp505Coverage.summary.by_micro_phase["RP16.P07.M04"], 12);
assert.equal(cp505Slice.valid, true, cp505Slice.errors.join("; "));
assert.equal(cp505CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP505_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp505CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-505 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p07_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp505Descriptor)),
  "contract p07_implementation_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp505_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP505_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp505_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION)));
assert.equal(cp505Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp505Hermes.production_ready_candidate, true);
assert.equal(cp505Claude.review_packet, "C16.CP00-505.governance_core_p07_implementation_slice_descriptor");
assert.equal(cp505Claude.read_only, true);
assert.equal(cp505Handoff.to_pack_id, "CP00-506");
assert.equal(cp505Handoff.next_subphase_id, "RP16.P07.M04.S13");
assert.equal(GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp506Coverage.valid, true, cp506Coverage.errors.join("; "));
assert.equal(cp506Coverage.summary.unit_count, 40);
assert.equal(cp506Coverage.summary.by_micro_phase["RP16.P07.M04"], 10);
assert.equal(cp506Coverage.summary.by_micro_phase["RP16.P07.M05"], 22);
assert.equal(cp506Coverage.summary.by_micro_phase["RP16.P07.M06"], 8);
assert.equal(cp506Slice.valid, true, cp506Slice.errors.join("; "));
assert.equal(cp506CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP506_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp506CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-506 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p07_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp506Descriptor)),
  "contract p07_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp506_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP506_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp506_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION)));
assert.equal(cp506Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp506Hermes.production_ready_candidate, true);
assert.equal(cp506Claude.review_packet, "C16.CP00-506.governance_core_p07_workflow_permission_slice_descriptor");
assert.equal(cp506Claude.read_only, true);
assert.equal(cp506Handoff.to_pack_id, "CP00-507");
assert.equal(cp506Handoff.next_subphase_id, "RP16.P07.M06.S09");
assert.equal(GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp507Coverage.valid, true, cp507Coverage.errors.join("; "));
assert.equal(cp507Coverage.summary.unit_count, 150);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P07.M06"], 14);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P07.M07"], 22);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P07.M08"], 22);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P07.M09"], 22);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P07.M10"], 20);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P08.M00"], 10);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P08.M01"], 20);
assert.equal(cp507Coverage.summary.by_micro_phase["RP16.P08.M02"], 20);
assert.equal(cp507Slice.valid, true, cp507Slice.errors.join("; "));
assert.equal(cp507CaseSet.section_count, 8);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP507_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp507CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-507 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p07_closeout_p08_foundation_descriptor,
  JSON.parse(JSON.stringify(cp507Descriptor)),
  "contract p07_closeout_p08_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp507_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP507_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp507_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION)));
assert.equal(cp507Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp507Hermes.production_ready_candidate, true);
assert.equal(cp507Claude.review_packet, "C16.CP00-507.governance_core_p07_closeout_p08_foundation_descriptor");
assert.equal(cp507Claude.read_only, true);
assert.equal(cp507Handoff.to_pack_id, "CP00-508");
assert.equal(cp507Handoff.next_subphase_id, "RP16.P08.M03.S01");
assert.equal(GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp508Coverage.valid, true, cp508Coverage.errors.join("; "));
assert.equal(cp508Coverage.summary.unit_count, 40);
assert.equal(cp508Coverage.summary.by_micro_phase["RP16.P08.M03"], 22);
assert.equal(cp508Coverage.summary.by_micro_phase["RP16.P08.M04"], 18);
assert.equal(cp508Slice.valid, true, cp508Slice.errors.join("; "));
assert.equal(cp508CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP508_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp508CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-508 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p08_implementation_slice_descriptor,
  JSON.parse(JSON.stringify(cp508Descriptor)),
  "contract p08_implementation_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp508_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP508_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp508_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION)));
assert.equal(cp508Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp508Hermes.production_ready_candidate, true);
assert.equal(cp508Claude.review_packet, "C16.CP00-508.governance_core_p08_implementation_slice_descriptor");
assert.equal(cp508Claude.read_only, true);
assert.equal(cp508Handoff.to_pack_id, "CP00-509");
assert.equal(cp508Handoff.next_subphase_id, "RP16.P08.M04.S19");
assert.equal(GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp509Coverage.valid, true, cp509Coverage.errors.join("; "));
assert.equal(cp509Coverage.summary.unit_count, 40);
assert.equal(cp509Coverage.summary.by_micro_phase["RP16.P08.M04"], 4);
assert.equal(cp509Coverage.summary.by_micro_phase["RP16.P08.M05"], 22);
assert.equal(cp509Coverage.summary.by_micro_phase["RP16.P08.M06"], 14);
assert.equal(cp509Slice.valid, true, cp509Slice.errors.join("; "));
assert.equal(cp509CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP509_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp509CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-509 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p08_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp509Descriptor)),
  "contract p08_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp509_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP509_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp509_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION)));
assert.equal(cp509Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp509Hermes.production_ready_candidate, true);
assert.equal(cp509Claude.review_packet, "C16.CP00-509.governance_core_p08_workflow_permission_slice_descriptor");
assert.equal(cp509Claude.read_only, true);
assert.equal(cp509Handoff.to_pack_id, "CP00-510");
assert.equal(cp509Handoff.next_subphase_id, "RP16.P08.M06.S15");
assert.equal(GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp510Coverage.valid, true, cp510Coverage.errors.join("; "));
assert.equal(cp510Coverage.summary.unit_count, 150);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P08.M06"], 8);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P08.M07"], 22);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P08.M08"], 22);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P08.M09"], 22);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P08.M10"], 10);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P09.M00"], 10);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P09.M01"], 10);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P09.M02"], 20);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P09.M03"], 22);
assert.equal(cp510Coverage.summary.by_micro_phase["RP16.P09.M04"], 4);
assert.equal(cp510Slice.valid, true, cp510Slice.errors.join("; "));
assert.equal(cp510CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP510_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp510CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-510 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p08_closeout_p09_foundation_descriptor,
  JSON.parse(JSON.stringify(cp510Descriptor)),
  "contract p08_closeout_p09_foundation_descriptor drift",
);
assert.deepEqual(governanceContract.cp510_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP510_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp510_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION)));
assert.equal(cp510Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp510Hermes.production_ready_candidate, true);
assert.equal(cp510Claude.review_packet, "C16.CP00-510.governance_core_p08_closeout_p09_foundation_descriptor");
assert.equal(cp510Claude.read_only, true);
assert.equal(cp510Handoff.to_pack_id, "CP00-511");
assert.equal(cp510Handoff.next_subphase_id, "RP16.P09.M04.S05");
assert.equal(GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp511Coverage.valid, true, cp511Coverage.errors.join("; "));
assert.equal(cp511Coverage.summary.unit_count, 40);
assert.equal(cp511Coverage.summary.by_micro_phase["RP16.P09.M04"], 16);
assert.equal(cp511Coverage.summary.by_micro_phase["RP16.P09.M05"], 22);
assert.equal(cp511Coverage.summary.by_micro_phase["RP16.P09.M06"], 2);
assert.equal(cp511Slice.valid, true, cp511Slice.errors.join("; "));
assert.equal(cp511CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP511_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp511CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-511 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p09_workflow_permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp511Descriptor)),
  "contract p09_workflow_permission_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp511_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP511_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp511_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION)));
assert.equal(cp511Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp511Hermes.production_ready_candidate, true);
assert.equal(cp511Claude.review_packet, "C16.CP00-511.governance_core_p09_workflow_permission_slice_descriptor");
assert.equal(cp511Claude.read_only, true);
assert.equal(cp511Handoff.to_pack_id, "CP00-512");
assert.equal(cp511Handoff.next_subphase_id, "RP16.P09.M06.S03");
assert.equal(GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp512Coverage.valid, true, cp512Coverage.errors.join("; "));
assert.equal(cp512Coverage.summary.unit_count, 10);
assert.equal(cp512Coverage.summary.by_micro_phase["RP16.P09.M06"], 10);
assert.equal(cp512Slice.valid, true, cp512Slice.errors.join("; "));
assert.equal(cp512CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP512_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp512CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-512 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p09_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp512Descriptor)),
  "contract p09_fixture_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp512_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP512_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp512_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION)));
assert.equal(cp512Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp512Hermes.production_ready_candidate, true);
assert.equal(cp512Claude.review_packet, "C16.CP00-512.governance_core_p09_fixture_slice_descriptor");
assert.equal(cp512Claude.read_only, true);
assert.equal(cp512Handoff.to_pack_id, "CP00-513");
assert.equal(cp512Handoff.next_subphase_id, "RP16.P09.M06.S13");
assert.equal(GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.equal(cp513Coverage.valid, true, cp513Coverage.errors.join("; "));
assert.equal(cp513Coverage.summary.unit_count, 80);
assert.equal(cp513Coverage.summary.by_micro_phase["RP16.P09.M06"], 8);
assert.equal(cp513Coverage.summary.by_micro_phase["RP16.P09.M07"], 22);
assert.equal(cp513Coverage.summary.by_micro_phase["RP16.P09.M08"], 20);
assert.equal(cp513Coverage.summary.by_micro_phase["RP16.P09.M09"], 20);
assert.equal(cp513Coverage.summary.by_micro_phase["RP16.P09.M10"], 10);
assert.equal(cp513Slice.valid, true, cp513Slice.errors.join("; "));
assert.equal(cp513CaseSet.section_count, 5);
for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP513_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp513CaseSet.sections[microId].rows[governanceCoreRowKey(title)];
    assert.ok(row, `CP00-513 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  governanceContract.p09_closeout_handoff_slice_descriptor,
  JSON.parse(JSON.stringify(cp513Descriptor)),
  "contract p09_closeout_handoff_slice_descriptor drift",
);
assert.deepEqual(governanceContract.cp513_requirements, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP513_REQUIREMENTS)));
assert.deepEqual(governanceContract.cp513_no_write_attestation, JSON.parse(JSON.stringify(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION)));
assert.equal(cp513Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp513Hermes.production_ready_candidate, true);
assert.equal(cp513Claude.review_packet, "C16.CP00-513.governance_core_p09_closeout_handoff_slice_descriptor");
assert.equal(cp513Claude.read_only, true);
assert.equal(cp513Handoff.to_pack_id, "CP00-514");
assert.equal(cp513Handoff.next_subphase_id, "RP17.P00.M00.S01");
assert.equal(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(governanceContract.historical_pack_bindings));
assert.equal(governanceContract.historical_pack_bindings.at(-1).pack_id, "CP00-513");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp16:governance-core:validate",
      pack_id: GOVERNANCE_CORE_CP513_PACK_BINDING.pack_id,
      covered_units: cp513Coverage.summary.unit_count,
      cp512_units_preserved: cp512Coverage.summary.unit_count,
      cp511_units_preserved: cp511Coverage.summary.unit_count,
      cp510_units_preserved: cp510Coverage.summary.unit_count,
      cp509_units_preserved: cp509Coverage.summary.unit_count,
      cp508_units_preserved: cp508Coverage.summary.unit_count,
      cp507_units_preserved: cp507Coverage.summary.unit_count,
      cp506_units_preserved: cp506Coverage.summary.unit_count,
      cp505_units_preserved: cp505Coverage.summary.unit_count,
      cp504_units_preserved: cp504Coverage.summary.unit_count,
      cp503_units_preserved: cp503Coverage.summary.unit_count,
      cp502_units_preserved: cp502Coverage.summary.unit_count,
      cp501_units_preserved: cp501Coverage.summary.unit_count,
      cp500_units_preserved: cp500Coverage.summary.unit_count,
      cp499_units_preserved: cp499Coverage.summary.unit_count,
      cp498_units_preserved: cp498Coverage.summary.unit_count,
      cp497_units_preserved: cp497Coverage.summary.unit_count,
      cp496_units_preserved: cp496Coverage.summary.unit_count,
      cp495_units_preserved: cp495Coverage.summary.unit_count,
      cp494_units_preserved: cp494Coverage.summary.unit_count,
      cp493_units_preserved: cp493Coverage.summary.unit_count,
      cp492_units_preserved: cp492Coverage.summary.unit_count,
      cp491_units_preserved: cp491Coverage.summary.unit_count,
      cp490_units_preserved: cp490Coverage.summary.unit_count,
      cp489_units_preserved: cp489Coverage.summary.unit_count,
      cp488_units_preserved: cp488Coverage.summary.unit_count,
      cp487_units_preserved: cp487Coverage.summary.unit_count,
      cp486_units_preserved: cp486Coverage.summary.unit_count,
      cp485_units_preserved: cp485Coverage.summary.unit_count,
      cp484_units_preserved: cp484Coverage.summary.unit_count,
      cp483_units_preserved: cp483Coverage.summary.unit_count,
      cp482_units_preserved: cp482Coverage.summary.unit_count,
      cp481_units_preserved: cp481Coverage.summary.unit_count,
      cp480_units_preserved: cp480Coverage.summary.unit_count,
      program_id: GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp513Hermes.gate,
      claude_gate: governanceContract.current_pack.claude_gate,
      source_analytics_core_pack_id: GOVERNANCE_CORE_CP480_PACK_BINDING.upstream_pack_id,
      next_pack_id: cp513Handoff.to_pack_id,
      production_ready_candidate: cp513Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
