import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

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
} from "../src/index.js";

const governanceContract = JSON.parse(
  readFileSync(new URL("../../../contracts/governance-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp480ManifestPath = new URL("../../../docs/closeout-packs/cp00-480/manifest.json", import.meta.url);
const cp480Manifest = existsSync(cp480ManifestPath) ? JSON.parse(readFileSync(cp480ManifestPath, "utf8")) : null;
const cp480PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-480") ?? cp480Manifest?.plan_binding_snapshot;
const cp481ManifestPath = new URL("../../../docs/closeout-packs/cp00-481/manifest.json", import.meta.url);
const cp481Manifest = existsSync(cp481ManifestPath) ? JSON.parse(readFileSync(cp481ManifestPath, "utf8")) : null;
const cp481PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-481") ?? cp481Manifest?.plan_binding_snapshot;
const cp482ManifestPath = new URL("../../../docs/closeout-packs/cp00-482/manifest.json", import.meta.url);
const cp482Manifest = existsSync(cp482ManifestPath) ? JSON.parse(readFileSync(cp482ManifestPath, "utf8")) : null;
const cp482PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-482") ?? cp482Manifest?.plan_binding_snapshot;
const cp483ManifestPath = new URL("../../../docs/closeout-packs/cp00-483/manifest.json", import.meta.url);
const cp483Manifest = existsSync(cp483ManifestPath) ? JSON.parse(readFileSync(cp483ManifestPath, "utf8")) : null;
const cp483PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-483") ?? cp483Manifest?.plan_binding_snapshot;
const cp484ManifestPath = new URL("../../../docs/closeout-packs/cp00-484/manifest.json", import.meta.url);
const cp484Manifest = existsSync(cp484ManifestPath) ? JSON.parse(readFileSync(cp484ManifestPath, "utf8")) : null;
const cp484PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-484") ?? cp484Manifest?.plan_binding_snapshot;
const cp485ManifestPath = new URL("../../../docs/closeout-packs/cp00-485/manifest.json", import.meta.url);
const cp485Manifest = existsSync(cp485ManifestPath) ? JSON.parse(readFileSync(cp485ManifestPath, "utf8")) : null;
const cp485PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-485") ?? cp485Manifest?.plan_binding_snapshot;
const cp486ManifestPath = new URL("../../../docs/closeout-packs/cp00-486/manifest.json", import.meta.url);
const cp486Manifest = existsSync(cp486ManifestPath) ? JSON.parse(readFileSync(cp486ManifestPath, "utf8")) : null;
const cp486PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-486") ?? cp486Manifest?.plan_binding_snapshot;
const cp487ManifestPath = new URL("../../../docs/closeout-packs/cp00-487/manifest.json", import.meta.url);
const cp487Manifest = existsSync(cp487ManifestPath) ? JSON.parse(readFileSync(cp487ManifestPath, "utf8")) : null;
const cp487PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-487") ?? cp487Manifest?.plan_binding_snapshot;
const cp488ManifestPath = new URL("../../../docs/closeout-packs/cp00-488/manifest.json", import.meta.url);
const cp488Manifest = existsSync(cp488ManifestPath) ? JSON.parse(readFileSync(cp488ManifestPath, "utf8")) : null;
const cp488PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-488") ?? cp488Manifest?.plan_binding_snapshot;
const cp489ManifestPath = new URL("../../../docs/closeout-packs/cp00-489/manifest.json", import.meta.url);
const cp489Manifest = existsSync(cp489ManifestPath) ? JSON.parse(readFileSync(cp489ManifestPath, "utf8")) : null;
const cp489PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-489") ?? cp489Manifest?.plan_binding_snapshot;
const cp490ManifestPath = new URL("../../../docs/closeout-packs/cp00-490/manifest.json", import.meta.url);
const cp490Manifest = existsSync(cp490ManifestPath) ? JSON.parse(readFileSync(cp490ManifestPath, "utf8")) : null;
const cp490PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-490") ?? cp490Manifest?.plan_binding_snapshot;
const cp491ManifestPath = new URL("../../../docs/closeout-packs/cp00-491/manifest.json", import.meta.url);
const cp491Manifest = existsSync(cp491ManifestPath) ? JSON.parse(readFileSync(cp491ManifestPath, "utf8")) : null;
const cp491PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-491") ?? cp491Manifest?.plan_binding_snapshot;
const cp492ManifestPath = new URL("../../../docs/closeout-packs/cp00-492/manifest.json", import.meta.url);
const cp492Manifest = existsSync(cp492ManifestPath) ? JSON.parse(readFileSync(cp492ManifestPath, "utf8")) : null;
const cp492PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-492") ?? cp492Manifest?.plan_binding_snapshot;
const cp493ManifestPath = new URL("../../../docs/closeout-packs/cp00-493/manifest.json", import.meta.url);
const cp493Manifest = existsSync(cp493ManifestPath) ? JSON.parse(readFileSync(cp493ManifestPath, "utf8")) : null;
const cp493PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-493") ?? cp493Manifest?.plan_binding_snapshot;
const cp494ManifestPath = new URL("../../../docs/closeout-packs/cp00-494/manifest.json", import.meta.url);
const cp494Manifest = existsSync(cp494ManifestPath) ? JSON.parse(readFileSync(cp494ManifestPath, "utf8")) : null;
const cp494PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-494") ?? cp494Manifest?.plan_binding_snapshot;
const cp495ManifestPath = new URL("../../../docs/closeout-packs/cp00-495/manifest.json", import.meta.url);
const cp495Manifest = existsSync(cp495ManifestPath) ? JSON.parse(readFileSync(cp495ManifestPath, "utf8")) : null;
const cp495PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-495") ?? cp495Manifest?.plan_binding_snapshot;
const cp496ManifestPath = new URL("../../../docs/closeout-packs/cp00-496/manifest.json", import.meta.url);
const cp496Manifest = existsSync(cp496ManifestPath) ? JSON.parse(readFileSync(cp496ManifestPath, "utf8")) : null;
const cp496PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-496") ?? cp496Manifest?.plan_binding_snapshot;
const cp497ManifestPath = new URL("../../../docs/closeout-packs/cp00-497/manifest.json", import.meta.url);
const cp497Manifest = existsSync(cp497ManifestPath) ? JSON.parse(readFileSync(cp497ManifestPath, "utf8")) : null;
const cp497PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-497") ?? cp497Manifest?.plan_binding_snapshot;
const cp498ManifestPath = new URL("../../../docs/closeout-packs/cp00-498/manifest.json", import.meta.url);
const cp498Manifest = existsSync(cp498ManifestPath) ? JSON.parse(readFileSync(cp498ManifestPath, "utf8")) : null;
const cp498PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-498") ?? cp498Manifest?.plan_binding_snapshot;
const cp499ManifestPath = new URL("../../../docs/closeout-packs/cp00-499/manifest.json", import.meta.url);
const cp499Manifest = existsSync(cp499ManifestPath) ? JSON.parse(readFileSync(cp499ManifestPath, "utf8")) : null;
const cp499PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-499") ?? cp499Manifest?.plan_binding_snapshot;
const cp500ManifestPath = new URL("../../../docs/closeout-packs/cp00-500/manifest.json", import.meta.url);
const cp500Manifest = existsSync(cp500ManifestPath) ? JSON.parse(readFileSync(cp500ManifestPath, "utf8")) : null;
const cp500PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-500") ?? cp500Manifest?.plan_binding_snapshot;
const cp501ManifestPath = new URL("../../../docs/closeout-packs/cp00-501/manifest.json", import.meta.url);
const cp501Manifest = existsSync(cp501ManifestPath) ? JSON.parse(readFileSync(cp501ManifestPath, "utf8")) : null;
const cp501PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-501") ?? cp501Manifest?.plan_binding_snapshot;
const cp502ManifestPath = new URL("../../../docs/closeout-packs/cp00-502/manifest.json", import.meta.url);
const cp502Manifest = existsSync(cp502ManifestPath) ? JSON.parse(readFileSync(cp502ManifestPath, "utf8")) : null;
const cp502PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-502") ?? cp502Manifest?.plan_binding_snapshot;
const cp503ManifestPath = new URL("../../../docs/closeout-packs/cp00-503/manifest.json", import.meta.url);
const cp503Manifest = existsSync(cp503ManifestPath) ? JSON.parse(readFileSync(cp503ManifestPath, "utf8")) : null;
const cp503PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-503") ?? cp503Manifest?.plan_binding_snapshot;
const cp504ManifestPath = new URL("../../../docs/closeout-packs/cp00-504/manifest.json", import.meta.url);
const cp504Manifest = existsSync(cp504ManifestPath) ? JSON.parse(readFileSync(cp504ManifestPath, "utf8")) : null;
const cp504PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-504") ?? cp504Manifest?.plan_binding_snapshot;
const cp505ManifestPath = new URL("../../../docs/closeout-packs/cp00-505/manifest.json", import.meta.url);
const cp505Manifest = existsSync(cp505ManifestPath) ? JSON.parse(readFileSync(cp505ManifestPath, "utf8")) : null;
const cp505PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-505") ?? cp505Manifest?.plan_binding_snapshot;
const cp506ManifestPath = new URL("../../../docs/closeout-packs/cp00-506/manifest.json", import.meta.url);
const cp506Manifest = existsSync(cp506ManifestPath) ? JSON.parse(readFileSync(cp506ManifestPath, "utf8")) : null;
const cp506PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-506") ?? cp506Manifest?.plan_binding_snapshot;
const cp507ManifestPath = new URL("../../../docs/closeout-packs/cp00-507/manifest.json", import.meta.url);
const cp507Manifest = existsSync(cp507ManifestPath) ? JSON.parse(readFileSync(cp507ManifestPath, "utf8")) : null;
const cp507PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-507") ?? cp507Manifest?.plan_binding_snapshot;
const cp508ManifestPath = new URL("../../../docs/closeout-packs/cp00-508/manifest.json", import.meta.url);
const cp508Manifest = existsSync(cp508ManifestPath) ? JSON.parse(readFileSync(cp508ManifestPath, "utf8")) : null;
const cp508PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-508") ?? cp508Manifest?.plan_binding_snapshot;
const cp509ManifestPath = new URL("../../../docs/closeout-packs/cp00-509/manifest.json", import.meta.url);
const cp509Manifest = existsSync(cp509ManifestPath) ? JSON.parse(readFileSync(cp509ManifestPath, "utf8")) : null;
const cp509PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-509") ?? cp509Manifest?.plan_binding_snapshot;
const cp510ManifestPath = new URL("../../../docs/closeout-packs/cp00-510/manifest.json", import.meta.url);
const cp510Manifest = existsSync(cp510ManifestPath) ? JSON.parse(readFileSync(cp510ManifestPath, "utf8")) : null;
const cp510PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-510") ?? cp510Manifest?.plan_binding_snapshot;
const cp511ManifestPath = new URL("../../../docs/closeout-packs/cp00-511/manifest.json", import.meta.url);
const cp511Manifest = existsSync(cp511ManifestPath) ? JSON.parse(readFileSync(cp511ManifestPath, "utf8")) : null;
const cp511PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-511") ?? cp511Manifest?.plan_binding_snapshot;
const cp512ManifestPath = new URL("../../../docs/closeout-packs/cp00-512/manifest.json", import.meta.url);
const cp512Manifest = existsSync(cp512ManifestPath) ? JSON.parse(readFileSync(cp512ManifestPath, "utf8")) : null;
const cp512PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-512") ?? cp512Manifest?.plan_binding_snapshot;
const cp513ManifestPath = new URL("../../../docs/closeout-packs/cp00-513/manifest.json", import.meta.url);
const cp513Manifest = existsSync(cp513ManifestPath) ? JSON.parse(readFileSync(cp513ManifestPath, "utf8")) : null;
const cp513PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-513") ?? cp513Manifest?.plan_binding_snapshot;

test("RP16 program contract pins the Governance descriptor-only bootstrap", () => {
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.program_id, "RP16");
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.program_title, "Governance DLP Retention");
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP15");
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.hermes_gate, "H16");
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.claude_gate, "C16");
  assert.equal(GOVERNANCE_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-480", "CP00-481", "CP00-482", "CP00-483", "CP00-484", "CP00-485", "CP00-486", "CP00-487", "CP00-488", "CP00-489", "CP00-490", "CP00-491", "CP00-492", "CP00-493", "CP00-494", "CP00-495", "CP00-496", "CP00-497", "CP00-498", "CP00-499", "CP00-500", "CP00-501", "CP00-502", "CP00-503", "CP00-504", "CP00-505", "CP00-506", "CP00-507", "CP00-508", "CP00-509", "CP00-510", "CP00-511", "CP00-512", "CP00-513"].includes(governanceContract.current_pack.pack_id));
  assert.equal(governanceContract.program.program_id, "RP16");
});

test("CP00-480 plan binding covers the planned 150 RP16 scope and model foundation units", () => {
  const coverage = validateGovernanceCoreCp480Coverage(cp480PlanPack);

  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.pack_id, "CP00-480");
  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.range, "RP16.P00.M00.S01-RP16.P01.M02.S08");
  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.upstream_pack_id, "CP00-479");
  assert.equal(GOVERNANCE_CORE_CP480_PACK_BINDING.next_pack_id, "CP00-481");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP16.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP16.P01"], 28);
  assert.equal(Object.keys(GOVERNANCE_CORE_CP480_REQUIREMENTS.required_section_rows).length, 14);
});

test("CP00-480 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp480ScopeContractFoundationCaseSet();
  const descriptor = createGovernanceCoreCp480ScopeContractFoundationDescriptor();
  const validation = validateGovernanceCoreCp480ScopeContractFoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 14);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP480_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP16.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.governance_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m00 = caseSet.sections["RP16.P01.M00"].rows;
  assert.equal(p01m00.state_transition_map.writes_state_transition, false);
  assert.equal(p01m00.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-480 evidence packets and handoff preserve governance bootstrap authority boundaries", () => {
  const descriptor = createGovernanceCoreCp480ScopeContractFoundationDescriptor();
  const hermes = createGovernanceCoreCp480HermesEvidencePacket(cp480PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp480ClaudeReviewPacket(cp480PlanPack);
  const handoff = createGovernanceCoreCp480CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-480-to-CP00-481");
  assert.equal(handoff.next_subphase_id, "RP16.P01.M02.S09");
  assert.equal(handoff.production_ready_flag, "governance_core_scope_contract_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP480_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-481 plan binding covers the planned 40 RP16 model foundation slice units", () => {
  const coverage = validateGovernanceCoreCp481Coverage(cp481PlanPack);

  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.pack_id, "CP00-481");
  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.range, "RP16.P01.M02.S09-RP16.P01.M04.S06");
  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.upstream_pack_id, "CP00-480");
  assert.equal(GOVERNANCE_CORE_CP481_PACK_BINDING.next_pack_id, "CP00-482");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M02"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M04"], 6);
});

test("CP00-481 model foundation slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp481ModelFoundationSliceCaseSet();
  const descriptor = createGovernanceCoreCp481ModelFoundationSliceDescriptor();
  const validation = validateGovernanceCoreCp481ModelFoundationSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP481_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP16.P01.M03"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-481 evidence packets and handoff preserve model foundation slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp481ModelFoundationSliceDescriptor();
  const hermes = createGovernanceCoreCp481HermesEvidencePacket(cp481PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp481ClaudeReviewPacket(cp481PlanPack);
  const handoff = createGovernanceCoreCp481CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-481-to-CP00-482");
  assert.equal(handoff.next_subphase_id, "RP16.P01.M04.S07");
  assert.equal(handoff.production_ready_flag, "governance_core_model_foundation_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP481_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-482 plan binding covers the planned 40 RP16 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp482Coverage(cp482PlanPack);

  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.pack_id, "CP00-482");
  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.range, "RP16.P01.M04.S07-RP16.P01.M06.S04");
  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.upstream_pack_id, "CP00-481");
  assert.equal(GOVERNANCE_CORE_CP482_PACK_BINDING.next_pack_id, "CP00-483");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M04"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M06"], 4);
});

test("CP00-482 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp482WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp482WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp482WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP482_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP16.P01.M05"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-482 evidence packets and handoff preserve workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp482WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp482HermesEvidencePacket(cp482PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp482ClaudeReviewPacket(cp482PlanPack);
  const handoff = createGovernanceCoreCp482CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-482-to-CP00-483");
  assert.equal(handoff.next_subphase_id, "RP16.P01.M06.S05");
  assert.equal(handoff.production_ready_flag, "governance_core_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP482_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-483 plan binding covers the planned 150 RP16 p01 closeout p02 foundation units", () => {
  const coverage = validateGovernanceCoreCp483Coverage(cp483PlanPack);

  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.pack_id, "CP00-483");
  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.range, "RP16.P01.M06.S05-RP16.P02.M02.S22");
  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.upstream_pack_id, "CP00-482");
  assert.equal(GOVERNANCE_CORE_CP483_PACK_BINDING.next_pack_id, "CP00-484");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M06"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P01.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M02"], 22);
});

test("CP00-483 p01 closeout p02 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp483P01CloseoutP02FoundationCaseSet();
  const descriptor = createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor();
  const validation = validateGovernanceCoreCp483P01CloseoutP02FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP483_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const mspot = caseSet.sections["RP16.P01.M07"].rows;
  assert.equal(mspot.tenant_scope_field.cross_tenant_access_allowed, false);
  assert.equal(mspot.state_transition_map.writes_state_transition, false);
  assert.equal(mspot.invalid_reference_test.expected_outcome, "rejected_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-483 evidence packets and handoff preserve p01 closeout p02 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp483P01CloseoutP02FoundationDescriptor();
  const hermes = createGovernanceCoreCp483HermesEvidencePacket(cp483PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp483ClaudeReviewPacket(cp483PlanPack);
  const handoff = createGovernanceCoreCp483CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-483-to-CP00-484");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M03.S01");
  assert.equal(handoff.production_ready_flag, "governance_core_p01_closeout_p02_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP483_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-484 plan binding covers the planned 40 RP16 p02 implementation slice units", () => {
  const coverage = validateGovernanceCoreCp484Coverage(cp484PlanPack);

  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.pack_id, "CP00-484");
  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.range, "RP16.P02.M03.S01-RP16.P02.M04.S18");
  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.upstream_pack_id, "CP00-483");
  assert.equal(GOVERNANCE_CORE_CP484_PACK_BINDING.next_pack_id, "CP00-485");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M04"], 18);
});

test("CP00-484 p02 implementation slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp484P02ImplementationSliceCaseSet();
  const descriptor = createGovernanceCoreCp484P02ImplementationSliceDescriptor();
  const validation = validateGovernanceCoreCp484P02ImplementationSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP484_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-484 evidence packets and handoff preserve p02 implementation slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp484P02ImplementationSliceDescriptor();
  const hermes = createGovernanceCoreCp484HermesEvidencePacket(cp484PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp484ClaudeReviewPacket(cp484PlanPack);
  const handoff = createGovernanceCoreCp484CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-484-to-CP00-485");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M04.S19");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_implementation_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP484_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-485 plan binding covers the planned 40 RP16 p02 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp485Coverage(cp485PlanPack);

  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.pack_id, "CP00-485");
  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.range, "RP16.P02.M04.S19-RP16.P02.M06.S14");
  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.upstream_pack_id, "CP00-484");
  assert.equal(GOVERNANCE_CORE_CP485_PACK_BINDING.next_pack_id, "CP00-486");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M04"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M06"], 14);
});

test("CP00-485 p02 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp485P02WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP485_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-485 evidence packets and handoff preserve p02 workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp485P02WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp485HermesEvidencePacket(cp485PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp485ClaudeReviewPacket(cp485PlanPack);
  const handoff = createGovernanceCoreCp485CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-485-to-CP00-486");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M06.S15");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP485_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-486 plan binding covers the planned 10 RP16 p02 fixture test slice units", () => {
  const coverage = validateGovernanceCoreCp486Coverage(cp486PlanPack);

  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.pack_id, "CP00-486");
  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.range, "RP16.P02.M06.S15-RP16.P02.M07.S02");
  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.upstream_pack_id, "CP00-485");
  assert.equal(GOVERNANCE_CORE_CP486_PACK_BINDING.next_pack_id, "CP00-487");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M07"], 2);
});

test("CP00-486 p02 fixture test slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp486P02FixtureTestSliceCaseSet();
  const descriptor = createGovernanceCoreCp486P02FixtureTestSliceDescriptor();
  const validation = validateGovernanceCoreCp486P02FixtureTestSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP486_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-486 evidence packets and handoff preserve p02 fixture test slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp486P02FixtureTestSliceDescriptor();
  const hermes = createGovernanceCoreCp486HermesEvidencePacket(cp486PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp486ClaudeReviewPacket(cp486PlanPack);
  const handoff = createGovernanceCoreCp486CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-486-to-CP00-487");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M07.S03");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_fixture_test_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP486_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-487 plan binding covers the planned 10 RP16 p02 test slice units", () => {
  const coverage = validateGovernanceCoreCp487Coverage(cp487PlanPack);

  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.pack_id, "CP00-487");
  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.range, "RP16.P02.M07.S03-RP16.P02.M07.S12");
  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.upstream_pack_id, "CP00-486");
  assert.equal(GOVERNANCE_CORE_CP487_PACK_BINDING.next_pack_id, "CP00-488");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M07"], 10);
});

test("CP00-487 p02 test slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp487P02TestSliceCaseSet();
  const descriptor = createGovernanceCoreCp487P02TestSliceDescriptor();
  const validation = validateGovernanceCoreCp487P02TestSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP487_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-487 evidence packets and handoff preserve p02 test slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp487P02TestSliceDescriptor();
  const hermes = createGovernanceCoreCp487HermesEvidencePacket(cp487PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp487ClaudeReviewPacket(cp487PlanPack);
  const handoff = createGovernanceCoreCp487CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-487-to-CP00-488");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M07.S13");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_test_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP487_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-488 plan binding covers the planned 40 RP16 p02 test hermes slice units", () => {
  const coverage = validateGovernanceCoreCp488Coverage(cp488PlanPack);

  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.pack_id, "CP00-488");
  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.range, "RP16.P02.M07.S13-RP16.P02.M09.S08");
  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.upstream_pack_id, "CP00-487");
  assert.equal(GOVERNANCE_CORE_CP488_PACK_BINDING.next_pack_id, "CP00-489");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M09"], 8);
});

test("CP00-488 p02 test hermes slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp488P02TestHermesSliceCaseSet();
  const descriptor = createGovernanceCoreCp488P02TestHermesSliceDescriptor();
  const validation = validateGovernanceCoreCp488P02TestHermesSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP488_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-488 evidence packets and handoff preserve p02 test hermes slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp488P02TestHermesSliceDescriptor();
  const hermes = createGovernanceCoreCp488HermesEvidencePacket(cp488PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp488ClaudeReviewPacket(cp488PlanPack);
  const handoff = createGovernanceCoreCp488CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-488-to-CP00-489");
  assert.equal(handoff.next_subphase_id, "RP16.P02.M09.S09");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_test_hermes_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP488_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-489 plan binding covers the planned 150 RP16 p02 closeout p03 foundation units", () => {
  const coverage = validateGovernanceCoreCp489Coverage(cp489PlanPack);

  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.pack_id, "CP00-489");
  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.range, "RP16.P02.M09.S09-RP16.P03.M06.S12");
  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.upstream_pack_id, "CP00-488");
  assert.equal(GOVERNANCE_CORE_CP489_PACK_BINDING.next_pack_id, "CP00-490");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M09"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP16.P02.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M06"], 12);
});

test("CP00-489 p02 closeout p03 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp489P02CloseoutP03FoundationCaseSet();
  const descriptor = createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor();
  const validation = validateGovernanceCoreCp489P02CloseoutP03FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP489_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-489 evidence packets and handoff preserve p02 closeout p03 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp489P02CloseoutP03FoundationDescriptor();
  const hermes = createGovernanceCoreCp489HermesEvidencePacket(cp489PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp489ClaudeReviewPacket(cp489PlanPack);
  const handoff = createGovernanceCoreCp489CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-489-to-CP00-490");
  assert.equal(handoff.next_subphase_id, "RP16.P03.M06.S13");
  assert.equal(handoff.production_ready_flag, "governance_core_p02_closeout_p03_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP489_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-490 plan binding covers the planned 150 RP16 p03 closeout p04 foundation units", () => {
  const coverage = validateGovernanceCoreCp490Coverage(cp490PlanPack);

  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.pack_id, "CP00-490");
  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.range, "RP16.P03.M06.S13-RP16.P04.M03.S20");
  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.upstream_pack_id, "CP00-489");
  assert.equal(GOVERNANCE_CORE_CP490_PACK_BINDING.next_pack_id, "CP00-491");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P03.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M03"], 20);
});

test("CP00-490 p03 closeout p04 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp490P03CloseoutP04FoundationCaseSet();
  const descriptor = createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor();
  const validation = validateGovernanceCoreCp490P03CloseoutP04FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP490_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-490 evidence packets and handoff preserve p03 closeout p04 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp490P03CloseoutP04FoundationDescriptor();
  const hermes = createGovernanceCoreCp490HermesEvidencePacket(cp490PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp490ClaudeReviewPacket(cp490PlanPack);
  const handoff = createGovernanceCoreCp490CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-490-to-CP00-491");
  assert.equal(handoff.next_subphase_id, "RP16.P04.M03.S21");
  assert.equal(handoff.production_ready_flag, "governance_core_p03_closeout_p04_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP490_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-491 plan binding covers the planned 40 RP16 p04 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp491Coverage(cp491PlanPack);

  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.pack_id, "CP00-491");
  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.range, "RP16.P04.M03.S21-RP16.P04.M05.S16");
  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.upstream_pack_id, "CP00-490");
  assert.equal(GOVERNANCE_CORE_CP491_PACK_BINDING.next_pack_id, "CP00-492");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M03"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M05"], 16);
});

test("CP00-491 p04 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp491P04WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP491_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-491 evidence packets and handoff preserve p04 workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp491P04WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp491HermesEvidencePacket(cp491PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp491ClaudeReviewPacket(cp491PlanPack);
  const handoff = createGovernanceCoreCp491CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-491-to-CP00-492");
  assert.equal(handoff.next_subphase_id, "RP16.P04.M05.S17");
  assert.equal(handoff.production_ready_flag, "governance_core_p04_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP491_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-492 plan binding covers the planned 10 RP16 p04 permission fixture slice units", () => {
  const coverage = validateGovernanceCoreCp492Coverage(cp492PlanPack);

  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.pack_id, "CP00-492");
  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.range, "RP16.P04.M05.S17-RP16.P04.M06.S04");
  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.upstream_pack_id, "CP00-491");
  assert.equal(GOVERNANCE_CORE_CP492_PACK_BINDING.next_pack_id, "CP00-493");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M06"], 4);
});

test("CP00-492 p04 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp492P04PermissionFixtureSliceCaseSet();
  const descriptor = createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor();
  const validation = validateGovernanceCoreCp492P04PermissionFixtureSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP492_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-492 evidence packets and handoff preserve p04 permission fixture slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp492P04PermissionFixtureSliceDescriptor();
  const hermes = createGovernanceCoreCp492HermesEvidencePacket(cp492PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp492ClaudeReviewPacket(cp492PlanPack);
  const handoff = createGovernanceCoreCp492CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-492-to-CP00-493");
  assert.equal(handoff.next_subphase_id, "RP16.P04.M06.S05");
  assert.equal(handoff.production_ready_flag, "governance_core_p04_permission_fixture_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP492_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-493 plan binding covers the planned 150 RP16 p04 closeout p05 foundation units", () => {
  const coverage = validateGovernanceCoreCp493Coverage(cp493PlanPack);

  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.pack_id, "CP00-493");
  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.range, "RP16.P04.M06.S05-RP16.P05.M03.S06");
  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.upstream_pack_id, "CP00-492");
  assert.equal(GOVERNANCE_CORE_CP493_PACK_BINDING.next_pack_id, "CP00-494");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M06"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P04.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M03"], 6);
});

test("CP00-493 p04 closeout p05 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp493P04CloseoutP05FoundationCaseSet();
  const descriptor = createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor();
  const validation = validateGovernanceCoreCp493P04CloseoutP05FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP493_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-493 evidence packets and handoff preserve p04 closeout p05 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp493P04CloseoutP05FoundationDescriptor();
  const hermes = createGovernanceCoreCp493HermesEvidencePacket(cp493PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp493ClaudeReviewPacket(cp493PlanPack);
  const handoff = createGovernanceCoreCp493CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-493-to-CP00-494");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M03.S07");
  assert.equal(handoff.production_ready_flag, "governance_core_p04_closeout_p05_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP493_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-494 plan binding covers the planned 40 RP16 p05 implementation workflow slice units", () => {
  const coverage = validateGovernanceCoreCp494Coverage(cp494PlanPack);

  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.pack_id, "CP00-494");
  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.range, "RP16.P05.M03.S07-RP16.P05.M05.S02");
  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.upstream_pack_id, "CP00-493");
  assert.equal(GOVERNANCE_CORE_CP494_PACK_BINDING.next_pack_id, "CP00-495");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M03"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M05"], 2);
});

test("CP00-494 p05 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp494P05ImplementationWorkflowSliceCaseSet();
  const descriptor = createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor();
  const validation = validateGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP494_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-494 evidence packets and handoff preserve p05 implementation workflow slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp494P05ImplementationWorkflowSliceDescriptor();
  const hermes = createGovernanceCoreCp494HermesEvidencePacket(cp494PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp494ClaudeReviewPacket(cp494PlanPack);
  const handoff = createGovernanceCoreCp494CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-494-to-CP00-495");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M05.S03");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_implementation_workflow_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP494_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-495 plan binding covers the planned 10 RP16 p05 permission slice units", () => {
  const coverage = validateGovernanceCoreCp495Coverage(cp495PlanPack);

  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.pack_id, "CP00-495");
  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.range, "RP16.P05.M05.S03-RP16.P05.M05.S12");
  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.upstream_pack_id, "CP00-494");
  assert.equal(GOVERNANCE_CORE_CP495_PACK_BINDING.next_pack_id, "CP00-496");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M05"], 10);
});

test("CP00-495 p05 permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp495P05PermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp495P05PermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp495P05PermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP495_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-495 evidence packets and handoff preserve p05 permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp495P05PermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp495HermesEvidencePacket(cp495PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp495ClaudeReviewPacket(cp495PlanPack);
  const handoff = createGovernanceCoreCp495CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-495-to-CP00-496");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M05.S13");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP495_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-496 plan binding covers the planned 10 RP16 p05 audit binding slice units", () => {
  const coverage = validateGovernanceCoreCp496Coverage(cp496PlanPack);

  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.pack_id, "CP00-496");
  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.range, "RP16.P05.M05.S13-RP16.P05.M05.S22");
  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.upstream_pack_id, "CP00-495");
  assert.equal(GOVERNANCE_CORE_CP496_PACK_BINDING.next_pack_id, "CP00-497");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M05"], 10);
});

test("CP00-496 p05 audit binding slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp496P05AuditBindingSliceCaseSet();
  const descriptor = createGovernanceCoreCp496P05AuditBindingSliceDescriptor();
  const validation = validateGovernanceCoreCp496P05AuditBindingSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP496_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-496 evidence packets and handoff preserve p05 audit binding slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp496P05AuditBindingSliceDescriptor();
  const hermes = createGovernanceCoreCp496HermesEvidencePacket(cp496PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp496ClaudeReviewPacket(cp496PlanPack);
  const handoff = createGovernanceCoreCp496CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-496-to-CP00-497");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M06.S01");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_audit_binding_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP496_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-497 plan binding covers the planned 10 RP16 p05 fixture slice units", () => {
  const coverage = validateGovernanceCoreCp497Coverage(cp497PlanPack);

  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.pack_id, "CP00-497");
  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.range, "RP16.P05.M06.S01-RP16.P05.M06.S10");
  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.upstream_pack_id, "CP00-496");
  assert.equal(GOVERNANCE_CORE_CP497_PACK_BINDING.next_pack_id, "CP00-498");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M06"], 10);
});

test("CP00-497 p05 fixture slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp497P05FixtureSliceCaseSet();
  const descriptor = createGovernanceCoreCp497P05FixtureSliceDescriptor();
  const validation = validateGovernanceCoreCp497P05FixtureSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP497_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-497 evidence packets and handoff preserve p05 fixture slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp497P05FixtureSliceDescriptor();
  const hermes = createGovernanceCoreCp497HermesEvidencePacket(cp497PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp497ClaudeReviewPacket(cp497PlanPack);
  const handoff = createGovernanceCoreCp497CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-497-to-CP00-498");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M06.S11");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_fixture_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP497_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-498 plan binding covers the planned 10 RP16 p05 synthetic fixture slice units", () => {
  const coverage = validateGovernanceCoreCp498Coverage(cp498PlanPack);

  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.pack_id, "CP00-498");
  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.range, "RP16.P05.M06.S11-RP16.P05.M06.S20");
  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.upstream_pack_id, "CP00-497");
  assert.equal(GOVERNANCE_CORE_CP498_PACK_BINDING.next_pack_id, "CP00-499");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M06"], 10);
});

test("CP00-498 p05 synthetic fixture slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp498P05SyntheticFixtureSliceCaseSet();
  const descriptor = createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor();
  const validation = validateGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP498_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-498 evidence packets and handoff preserve p05 synthetic fixture slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp498P05SyntheticFixtureSliceDescriptor();
  const hermes = createGovernanceCoreCp498HermesEvidencePacket(cp498PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp498ClaudeReviewPacket(cp498PlanPack);
  const handoff = createGovernanceCoreCp498CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-498-to-CP00-499");
  assert.equal(handoff.next_subphase_id, "RP16.P05.M06.S21");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_synthetic_fixture_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP498_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-499 plan binding covers the planned 150 RP16 p05 closeout p06 foundation units", () => {
  const coverage = validateGovernanceCoreCp499Coverage(cp499PlanPack);

  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.pack_id, "CP00-499");
  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.range, "RP16.P05.M06.S21-RP16.P06.M03.S10");
  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.upstream_pack_id, "CP00-498");
  assert.equal(GOVERNANCE_CORE_CP499_PACK_BINDING.next_pack_id, "CP00-500");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M06"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P05.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M03"], 10);
});

test("CP00-499 p05 closeout p06 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp499P05CloseoutP06FoundationCaseSet();
  const descriptor = createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor();
  const validation = validateGovernanceCoreCp499P05CloseoutP06FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP499_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-499 evidence packets and handoff preserve p05 closeout p06 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp499P05CloseoutP06FoundationDescriptor();
  const hermes = createGovernanceCoreCp499HermesEvidencePacket(cp499PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp499ClaudeReviewPacket(cp499PlanPack);
  const handoff = createGovernanceCoreCp499CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-499-to-CP00-500");
  assert.equal(handoff.next_subphase_id, "RP16.P06.M03.S11");
  assert.equal(handoff.production_ready_flag, "governance_core_p05_closeout_p06_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP499_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-500 plan binding covers the planned 40 RP16 p06 implementation workflow slice units", () => {
  const coverage = validateGovernanceCoreCp500Coverage(cp500PlanPack);

  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.pack_id, "CP00-500");
  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.range, "RP16.P06.M03.S11-RP16.P06.M05.S06");
  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.upstream_pack_id, "CP00-499");
  assert.equal(GOVERNANCE_CORE_CP500_PACK_BINDING.next_pack_id, "CP00-501");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M03"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M05"], 6);
});

test("CP00-500 p06 implementation workflow slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp500P06ImplementationWorkflowSliceCaseSet();
  const descriptor = createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor();
  const validation = validateGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP500_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-500 evidence packets and handoff preserve p06 implementation workflow slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp500P06ImplementationWorkflowSliceDescriptor();
  const hermes = createGovernanceCoreCp500HermesEvidencePacket(cp500PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp500ClaudeReviewPacket(cp500PlanPack);
  const handoff = createGovernanceCoreCp500CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-500-to-CP00-501");
  assert.equal(handoff.next_subphase_id, "RP16.P06.M05.S07");
  assert.equal(handoff.production_ready_flag, "governance_core_p06_implementation_workflow_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP500_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-501 plan binding covers the planned 10 RP16 p06 permission slice units", () => {
  const coverage = validateGovernanceCoreCp501Coverage(cp501PlanPack);

  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.pack_id, "CP00-501");
  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.range, "RP16.P06.M05.S07-RP16.P06.M05.S16");
  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.upstream_pack_id, "CP00-500");
  assert.equal(GOVERNANCE_CORE_CP501_PACK_BINDING.next_pack_id, "CP00-502");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M05"], 10);
});

test("CP00-501 p06 permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp501P06PermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp501P06PermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp501P06PermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP501_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-501 evidence packets and handoff preserve p06 permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp501P06PermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp501HermesEvidencePacket(cp501PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp501ClaudeReviewPacket(cp501PlanPack);
  const handoff = createGovernanceCoreCp501CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-501-to-CP00-502");
  assert.equal(handoff.next_subphase_id, "RP16.P06.M05.S17");
  assert.equal(handoff.production_ready_flag, "governance_core_p06_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP501_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-502 plan binding covers the planned 10 RP16 p06 permission fixture slice units", () => {
  const coverage = validateGovernanceCoreCp502Coverage(cp502PlanPack);

  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.pack_id, "CP00-502");
  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.range, "RP16.P06.M05.S17-RP16.P06.M06.S04");
  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.upstream_pack_id, "CP00-501");
  assert.equal(GOVERNANCE_CORE_CP502_PACK_BINDING.next_pack_id, "CP00-503");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M05"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M06"], 4);
});

test("CP00-502 p06 permission fixture slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp502P06PermissionFixtureSliceCaseSet();
  const descriptor = createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor();
  const validation = validateGovernanceCoreCp502P06PermissionFixtureSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP502_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-502 evidence packets and handoff preserve p06 permission fixture slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp502P06PermissionFixtureSliceDescriptor();
  const hermes = createGovernanceCoreCp502HermesEvidencePacket(cp502PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp502ClaudeReviewPacket(cp502PlanPack);
  const handoff = createGovernanceCoreCp502CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-502-to-CP00-503");
  assert.equal(handoff.next_subphase_id, "RP16.P06.M06.S05");
  assert.equal(handoff.production_ready_flag, "governance_core_p06_permission_fixture_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP502_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-503 plan binding covers the planned 150 RP16 p06 closeout p07 foundation units", () => {
  const coverage = validateGovernanceCoreCp503Coverage(cp503PlanPack);

  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.pack_id, "CP00-503");
  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.range, "RP16.P06.M06.S05-RP16.P07.M02.S06");
  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.upstream_pack_id, "CP00-502");
  assert.equal(GOVERNANCE_CORE_CP503_PACK_BINDING.next_pack_id, "CP00-504");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M06"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P06.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M00"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M02"], 6);
});

test("CP00-503 p06 closeout p07 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp503P06CloseoutP07FoundationCaseSet();
  const descriptor = createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor();
  const validation = validateGovernanceCoreCp503P06CloseoutP07FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP503_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-503 evidence packets and handoff preserve p06 closeout p07 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp503P06CloseoutP07FoundationDescriptor();
  const hermes = createGovernanceCoreCp503HermesEvidencePacket(cp503PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp503ClaudeReviewPacket(cp503PlanPack);
  const handoff = createGovernanceCoreCp503CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-503-to-CP00-504");
  assert.equal(handoff.next_subphase_id, "RP16.P07.M02.S07");
  assert.equal(handoff.production_ready_flag, "governance_core_p06_closeout_p07_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP503_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-504 plan binding covers the planned 10 RP16 p07 foundation slice units", () => {
  const coverage = validateGovernanceCoreCp504Coverage(cp504PlanPack);

  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.pack_id, "CP00-504");
  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.range, "RP16.P07.M02.S07-RP16.P07.M02.S16");
  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.upstream_pack_id, "CP00-503");
  assert.equal(GOVERNANCE_CORE_CP504_PACK_BINDING.next_pack_id, "CP00-505");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M02"], 10);
});

test("CP00-504 p07 foundation slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp504P07FoundationSliceCaseSet();
  const descriptor = createGovernanceCoreCp504P07FoundationSliceDescriptor();
  const validation = validateGovernanceCoreCp504P07FoundationSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP504_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-504 evidence packets and handoff preserve p07 foundation slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp504P07FoundationSliceDescriptor();
  const hermes = createGovernanceCoreCp504HermesEvidencePacket(cp504PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp504ClaudeReviewPacket(cp504PlanPack);
  const handoff = createGovernanceCoreCp504CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-504-to-CP00-505");
  assert.equal(handoff.next_subphase_id, "RP16.P07.M02.S17");
  assert.equal(handoff.production_ready_flag, "governance_core_p07_foundation_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP504_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-505 plan binding covers the planned 40 RP16 p07 implementation slice units", () => {
  const coverage = validateGovernanceCoreCp505Coverage(cp505PlanPack);

  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.pack_id, "CP00-505");
  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.range, "RP16.P07.M02.S17-RP16.P07.M04.S12");
  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.upstream_pack_id, "CP00-504");
  assert.equal(GOVERNANCE_CORE_CP505_PACK_BINDING.next_pack_id, "CP00-506");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M04"], 12);
});

test("CP00-505 p07 implementation slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp505P07ImplementationSliceCaseSet();
  const descriptor = createGovernanceCoreCp505P07ImplementationSliceDescriptor();
  const validation = validateGovernanceCoreCp505P07ImplementationSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP505_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-505 evidence packets and handoff preserve p07 implementation slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp505P07ImplementationSliceDescriptor();
  const hermes = createGovernanceCoreCp505HermesEvidencePacket(cp505PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp505ClaudeReviewPacket(cp505PlanPack);
  const handoff = createGovernanceCoreCp505CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-505-to-CP00-506");
  assert.equal(handoff.next_subphase_id, "RP16.P07.M04.S13");
  assert.equal(handoff.production_ready_flag, "governance_core_p07_implementation_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP505_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-506 plan binding covers the planned 40 RP16 p07 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp506Coverage(cp506PlanPack);

  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.pack_id, "CP00-506");
  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.range, "RP16.P07.M04.S13-RP16.P07.M06.S08");
  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.upstream_pack_id, "CP00-505");
  assert.equal(GOVERNANCE_CORE_CP506_PACK_BINDING.next_pack_id, "CP00-507");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M06"], 8);
});

test("CP00-506 p07 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp506P07WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP506_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-506 evidence packets and handoff preserve p07 workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp506P07WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp506HermesEvidencePacket(cp506PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp506ClaudeReviewPacket(cp506PlanPack);
  const handoff = createGovernanceCoreCp506CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-506-to-CP00-507");
  assert.equal(handoff.next_subphase_id, "RP16.P07.M06.S09");
  assert.equal(handoff.production_ready_flag, "governance_core_p07_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP506_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-507 plan binding covers the planned 150 RP16 p07 closeout p08 foundation units", () => {
  const coverage = validateGovernanceCoreCp507Coverage(cp507PlanPack);

  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.pack_id, "CP00-507");
  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.range, "RP16.P07.M06.S09-RP16.P08.M02.S20");
  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.upstream_pack_id, "CP00-506");
  assert.equal(GOVERNANCE_CORE_CP507_PACK_BINDING.next_pack_id, "CP00-508");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P07.M10"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M01"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M02"], 20);
});

test("CP00-507 p07 closeout p08 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp507P07CloseoutP08FoundationCaseSet();
  const descriptor = createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor();
  const validation = validateGovernanceCoreCp507P07CloseoutP08FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 8);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP507_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-507 evidence packets and handoff preserve p07 closeout p08 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp507P07CloseoutP08FoundationDescriptor();
  const hermes = createGovernanceCoreCp507HermesEvidencePacket(cp507PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp507ClaudeReviewPacket(cp507PlanPack);
  const handoff = createGovernanceCoreCp507CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-507-to-CP00-508");
  assert.equal(handoff.next_subphase_id, "RP16.P08.M03.S01");
  assert.equal(handoff.production_ready_flag, "governance_core_p07_closeout_p08_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP507_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-508 plan binding covers the planned 40 RP16 p08 implementation slice units", () => {
  const coverage = validateGovernanceCoreCp508Coverage(cp508PlanPack);

  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.pack_id, "CP00-508");
  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.range, "RP16.P08.M03.S01-RP16.P08.M04.S18");
  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.upstream_pack_id, "CP00-507");
  assert.equal(GOVERNANCE_CORE_CP508_PACK_BINDING.next_pack_id, "CP00-509");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M04"], 18);
});

test("CP00-508 p08 implementation slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp508P08ImplementationSliceCaseSet();
  const descriptor = createGovernanceCoreCp508P08ImplementationSliceDescriptor();
  const validation = validateGovernanceCoreCp508P08ImplementationSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP508_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-508 evidence packets and handoff preserve p08 implementation slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp508P08ImplementationSliceDescriptor();
  const hermes = createGovernanceCoreCp508HermesEvidencePacket(cp508PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp508ClaudeReviewPacket(cp508PlanPack);
  const handoff = createGovernanceCoreCp508CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-508-to-CP00-509");
  assert.equal(handoff.next_subphase_id, "RP16.P08.M04.S19");
  assert.equal(handoff.production_ready_flag, "governance_core_p08_implementation_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP508_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-509 plan binding covers the planned 40 RP16 p08 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp509Coverage(cp509PlanPack);

  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.pack_id, "CP00-509");
  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.range, "RP16.P08.M04.S19-RP16.P08.M06.S14");
  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.upstream_pack_id, "CP00-508");
  assert.equal(GOVERNANCE_CORE_CP509_PACK_BINDING.next_pack_id, "CP00-510");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M04"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M06"], 14);
});

test("CP00-509 p08 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp509P08WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP509_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-509 evidence packets and handoff preserve p08 workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp509P08WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp509HermesEvidencePacket(cp509PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp509ClaudeReviewPacket(cp509PlanPack);
  const handoff = createGovernanceCoreCp509CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-509-to-CP00-510");
  assert.equal(handoff.next_subphase_id, "RP16.P08.M06.S15");
  assert.equal(handoff.production_ready_flag, "governance_core_p08_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP509_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-510 plan binding covers the planned 150 RP16 p08 closeout p09 foundation units", () => {
  const coverage = validateGovernanceCoreCp510Coverage(cp510PlanPack);

  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.pack_id, "CP00-510");
  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.unit_count, 150);
  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.range, "RP16.P08.M06.S15-RP16.P09.M04.S04");
  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.upstream_pack_id, "CP00-509");
  assert.equal(GOVERNANCE_CORE_CP510_PACK_BINDING.next_pack_id, "CP00-511");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M09"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P08.M10"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M00"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M01"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M02"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M04"], 4);
});

test("CP00-510 p08 closeout p09 foundation rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp510P08CloseoutP09FoundationCaseSet();
  const descriptor = createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor();
  const validation = validateGovernanceCoreCp510P08CloseoutP09FoundationDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP510_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-510 evidence packets and handoff preserve p08 closeout p09 foundation authority boundaries", () => {
  const descriptor = createGovernanceCoreCp510P08CloseoutP09FoundationDescriptor();
  const hermes = createGovernanceCoreCp510HermesEvidencePacket(cp510PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp510ClaudeReviewPacket(cp510PlanPack);
  const handoff = createGovernanceCoreCp510CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-510-to-CP00-511");
  assert.equal(handoff.next_subphase_id, "RP16.P09.M04.S05");
  assert.equal(handoff.production_ready_flag, "governance_core_p08_closeout_p09_foundation_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP510_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-511 plan binding covers the planned 40 RP16 p09 workflow permission slice units", () => {
  const coverage = validateGovernanceCoreCp511Coverage(cp511PlanPack);

  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.pack_id, "CP00-511");
  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.risk_class, "B");
  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.unit_count, 40);
  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.range, "RP16.P09.M04.S05-RP16.P09.M06.S02");
  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.upstream_pack_id, "CP00-510");
  assert.equal(GOVERNANCE_CORE_CP511_PACK_BINDING.next_pack_id, "CP00-512");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M04"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M06"], 2);
});

test("CP00-511 p09 workflow permission slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp511P09WorkflowPermissionSliceCaseSet();
  const descriptor = createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor();
  const validation = validateGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 3);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP511_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-511 evidence packets and handoff preserve p09 workflow permission slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp511P09WorkflowPermissionSliceDescriptor();
  const hermes = createGovernanceCoreCp511HermesEvidencePacket(cp511PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp511ClaudeReviewPacket(cp511PlanPack);
  const handoff = createGovernanceCoreCp511CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-511-to-CP00-512");
  assert.equal(handoff.next_subphase_id, "RP16.P09.M06.S03");
  assert.equal(handoff.production_ready_flag, "governance_core_p09_workflow_permission_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP511_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-512 plan binding covers the planned 10 RP16 p09 fixture slice units", () => {
  const coverage = validateGovernanceCoreCp512Coverage(cp512PlanPack);

  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.pack_id, "CP00-512");
  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.risk_class, "A");
  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.unit_count, 10);
  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.range, "RP16.P09.M06.S03-RP16.P09.M06.S12");
  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.upstream_pack_id, "CP00-511");
  assert.equal(GOVERNANCE_CORE_CP512_PACK_BINDING.next_pack_id, "CP00-513");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M06"], 10);
});

test("CP00-512 p09 fixture slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp512P09FixtureSliceCaseSet();
  const descriptor = createGovernanceCoreCp512P09FixtureSliceDescriptor();
  const validation = validateGovernanceCoreCp512P09FixtureSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 1);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP512_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-512 evidence packets and handoff preserve p09 fixture slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp512P09FixtureSliceDescriptor();
  const hermes = createGovernanceCoreCp512HermesEvidencePacket(cp512PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp512ClaudeReviewPacket(cp512PlanPack);
  const handoff = createGovernanceCoreCp512CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-512-to-CP00-513");
  assert.equal(handoff.next_subphase_id, "RP16.P09.M06.S13");
  assert.equal(handoff.production_ready_flag, "governance_core_p09_fixture_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP512_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-513 plan binding covers the planned 80 RP16 p09 closeout handoff slice units", () => {
  const coverage = validateGovernanceCoreCp513Coverage(cp513PlanPack);

  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.pack_id, "CP00-513");
  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.risk_class, "C");
  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.unit_count, 80);
  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.range, "RP16.P09.M06.S13-RP16.P09.M10.S10");
  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.upstream_pack_id, "CP00-512");
  assert.equal(GOVERNANCE_CORE_CP513_PACK_BINDING.next_pack_id, "CP00-514");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 80);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP16.P09.M10"], 10);
});

test("CP00-513 p09 closeout handoff slice rows stay descriptor-only", () => {
  const caseSet = createGovernanceCoreCp513P09CloseoutHandoffSliceCaseSet();
  const descriptor = createGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor();
  const validation = validateGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor(descriptor, governanceContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 5);
  for (const [microId, titles] of Object.entries(GOVERNANCE_CORE_CP513_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[governanceCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-513 evidence packets and handoff preserve p09 closeout handoff slice authority boundaries", () => {
  const descriptor = createGovernanceCoreCp513P09CloseoutHandoffSliceDescriptor();
  const hermes = createGovernanceCoreCp513HermesEvidencePacket(cp513PlanPack, governanceContract, descriptor);
  const claude = createGovernanceCoreCp513ClaudeReviewPacket(cp513PlanPack);
  const handoff = createGovernanceCoreCp513CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H16");
  assert.equal(claude.gate, "C16");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-513-to-CP00-514");
  assert.equal(handoff.next_subphase_id, "RP17.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "governance_core_p09_closeout_handoff_slice_descriptor_verified");
  assert.equal(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(GOVERNANCE_CORE_CP513_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});
