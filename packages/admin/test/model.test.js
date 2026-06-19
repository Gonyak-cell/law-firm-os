import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP645_PACK_BINDING,
  ADMIN_CONSOLE_CP645_REQUIREMENTS,
  ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP646_PACK_BINDING,
  ADMIN_CONSOLE_CP646_REQUIREMENTS,
  ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP647_PACK_BINDING,
  ADMIN_CONSOLE_CP647_REQUIREMENTS,
  ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP648_PACK_BINDING,
  ADMIN_CONSOLE_CP648_REQUIREMENTS,
  ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP649_PACK_BINDING,
  ADMIN_CONSOLE_CP649_REQUIREMENTS,
  ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP650_PACK_BINDING,
  ADMIN_CONSOLE_CP650_REQUIREMENTS,
  ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP651_PACK_BINDING,
  ADMIN_CONSOLE_CP651_REQUIREMENTS,
  ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP652_PACK_BINDING,
  ADMIN_CONSOLE_CP652_REQUIREMENTS,
  ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP653_PACK_BINDING,
  ADMIN_CONSOLE_CP653_REQUIREMENTS,
  ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP654_PACK_BINDING,
  ADMIN_CONSOLE_CP654_REQUIREMENTS,
  ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP655_PACK_BINDING,
  ADMIN_CONSOLE_CP655_REQUIREMENTS,
  ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP656_PACK_BINDING,
  ADMIN_CONSOLE_CP656_REQUIREMENTS,
  ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP657_PACK_BINDING,
  ADMIN_CONSOLE_CP657_REQUIREMENTS,
  ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP658_PACK_BINDING,
  ADMIN_CONSOLE_CP658_REQUIREMENTS,
  ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP659_PACK_BINDING,
  ADMIN_CONSOLE_CP659_REQUIREMENTS,
  ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP660_PACK_BINDING,
  ADMIN_CONSOLE_CP660_REQUIREMENTS,
  ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP661_PACK_BINDING,
  ADMIN_CONSOLE_CP661_REQUIREMENTS,
  ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP662_PACK_BINDING,
  ADMIN_CONSOLE_CP662_REQUIREMENTS,
  ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP663_PACK_BINDING,
  ADMIN_CONSOLE_CP663_REQUIREMENTS,
  ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP664_PACK_BINDING,
  ADMIN_CONSOLE_CP664_REQUIREMENTS,
  ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP665_PACK_BINDING,
  ADMIN_CONSOLE_CP665_REQUIREMENTS,
  ADMIN_CONSOLE_PROGRAM_CONTRACT,
  createAdminConsoleCoreContractProjection,
  createAdminConsoleCp665ReviewEvidenceCloseoutBridgeCaseSet,
  createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor,
  createAdminConsoleCp665ClaudeReviewPacket,
  createAdminConsoleCp665CloseoutHandoff,
  createAdminConsoleCp665HermesEvidencePacket,
  createAdminConsoleCp664TestGoldenReviewTailCaseSet,
  createAdminConsoleCp664TestGoldenReviewTailDescriptor,
  createAdminConsoleCp664ClaudeReviewPacket,
  createAdminConsoleCp664CloseoutHandoff,
  createAdminConsoleCp664HermesEvidencePacket,
  createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeCaseSet,
  createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor,
  createAdminConsoleCp661ClaudeReviewPacket,
  createAdminConsoleCp661CloseoutHandoff,
  createAdminConsoleCp661HermesEvidencePacket,
  createAdminConsoleCp662EvidencePermissionFixtureBridgeCaseSet,
  createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor,
  createAdminConsoleCp662ClaudeReviewPacket,
  createAdminConsoleCp662CloseoutHandoff,
  createAdminConsoleCp662HermesEvidencePacket,
  createAdminConsoleCp663ReviewReadinessBridgeCaseSet,
  createAdminConsoleCp663ReviewReadinessBridgeDescriptor,
  createAdminConsoleCp663ClaudeReviewPacket,
  createAdminConsoleCp663CloseoutHandoff,
  createAdminConsoleCp663HermesEvidencePacket,
  createAdminConsoleCp660FailureRecoveryFixtureTransitionCaseSet,
  createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor,
  createAdminConsoleCp660ClaudeReviewPacket,
  createAdminConsoleCp660CloseoutHandoff,
  createAdminConsoleCp660HermesEvidencePacket,
  createAdminConsoleCp659FailureRecoveryPermissionAuditBindingCaseSet,
  createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor,
  createAdminConsoleCp659ClaudeReviewPacket,
  createAdminConsoleCp659CloseoutHandoff,
  createAdminConsoleCp659HermesEvidencePacket,
  createAdminConsoleCp658FailureReceiptEscalationCaseSet,
  createAdminConsoleCp658FailureReceiptEscalationDescriptor,
  createAdminConsoleCp658ClaudeReviewPacket,
  createAdminConsoleCp658CloseoutHandoff,
  createAdminConsoleCp658HermesEvidencePacket,
  createAdminConsoleCp657SyntheticFailureRecoveryBridgeCaseSet,
  createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor,
  createAdminConsoleCp657ClaudeReviewPacket,
  createAdminConsoleCp657CloseoutHandoff,
  createAdminConsoleCp657HermesEvidencePacket,
  createAdminConsoleCp656PermissionAuditFixtureTransitionCaseSet,
  createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor,
  createAdminConsoleCp656ClaudeReviewPacket,
  createAdminConsoleCp656CloseoutHandoff,
  createAdminConsoleCp656HermesEvidencePacket,
  createAdminConsoleCp655PermissionMatrixWorkflowTailCaseSet,
  createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor,
  createAdminConsoleCp655ClaudeReviewPacket,
  createAdminConsoleCp655CloseoutHandoff,
  createAdminConsoleCp655HermesEvidencePacket,
  createAdminConsoleCp654SyntheticPermissionMatrixCaseSet,
  createAdminConsoleCp654SyntheticPermissionMatrixDescriptor,
  createAdminConsoleCp654ClaudeReviewPacket,
  createAdminConsoleCp654CloseoutHandoff,
  createAdminConsoleCp654HermesEvidencePacket,
  createAdminConsoleCp653PermissionFixtureTailCaseSet,
  createAdminConsoleCp653PermissionFixtureTailDescriptor,
  createAdminConsoleCp653ClaudeReviewPacket,
  createAdminConsoleCp653CloseoutHandoff,
  createAdminConsoleCp653HermesEvidencePacket,
  createAdminConsoleCp652FixtureGoldenCaseSet,
  createAdminConsoleCp652FixtureGoldenCaseDescriptor,
  createAdminConsoleCp652ClaudeReviewPacket,
  createAdminConsoleCp652CloseoutHandoff,
  createAdminConsoleCp652HermesEvidencePacket,
  createAdminConsoleCp651UiPermissionFixtureCaseSet,
  createAdminConsoleCp651UiPermissionFixtureDescriptor,
  createAdminConsoleCp651ClaudeReviewPacket,
  createAdminConsoleCp651CloseoutHandoff,
  createAdminConsoleCp651HermesEvidencePacket,
  createAdminConsoleCp650UiImplementationSliceCaseSet,
  createAdminConsoleCp650UiImplementationSliceDescriptor,
  createAdminConsoleCp650ClaudeReviewPacket,
  createAdminConsoleCp650CloseoutHandoff,
  createAdminConsoleCp650HermesEvidencePacket,
  createAdminConsoleCp649ReviewCloseoutApiUiCaseSet,
  createAdminConsoleCp649ReviewCloseoutApiUiDescriptor,
  createAdminConsoleCp649ClaudeReviewPacket,
  createAdminConsoleCp649CloseoutHandoff,
  createAdminConsoleCp649HermesEvidencePacket,
  createAdminConsoleCp648ClaudeReviewBoundaryCaseSet,
  createAdminConsoleCp648ClaudeReviewBoundaryDescriptor,
  createAdminConsoleCp648ClaudeReviewPacket,
  createAdminConsoleCp648CloseoutHandoff,
  createAdminConsoleCp648HermesEvidencePacket,
  createAdminConsoleCp645ClaudeReviewPacket,
  createAdminConsoleCp645CloseoutHandoff,
  createAdminConsoleCp645HermesEvidencePacket,
  createAdminConsoleCp645ScopeDomainFoundationCaseSet,
  createAdminConsoleCp645ScopeDomainFoundationDescriptor,
  createAdminConsoleCp646ClaudeReviewPacket,
  createAdminConsoleCp646CloseoutHandoff,
  createAdminConsoleCp646DomainServiceBridgeCaseSet,
  createAdminConsoleCp646DomainServiceBridgeDescriptor,
  createAdminConsoleCp646HermesEvidencePacket,
  createAdminConsoleCp647ClaudeReviewPacket,
  createAdminConsoleCp647CloseoutHandoff,
  createAdminConsoleCp647HermesEvidencePacket,
  createAdminConsoleCp647TestEvidenceReviewCaseSet,
  createAdminConsoleCp647TestEvidenceReviewPacketDescriptor,
  validateAdminConsoleCoreContractProjection,
  validateAdminConsoleCp645Coverage,
  validateAdminConsoleCp645ScopeDomainFoundationDescriptor,
  validateAdminConsoleCp646Coverage,
  validateAdminConsoleCp646DomainServiceBridgeDescriptor,
  validateAdminConsoleCp647Coverage,
  validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor,
  validateAdminConsoleCp648Coverage,
  validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor,
  validateAdminConsoleCp649Coverage,
  validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor,
  validateAdminConsoleCp650Coverage,
  validateAdminConsoleCp650UiImplementationSliceDescriptor,
  validateAdminConsoleCp651Coverage,
  validateAdminConsoleCp651UiPermissionFixtureDescriptor,
  validateAdminConsoleCp652Coverage,
  validateAdminConsoleCp652FixtureGoldenCaseDescriptor,
  validateAdminConsoleCp653Coverage,
  validateAdminConsoleCp653PermissionFixtureTailDescriptor,
  validateAdminConsoleCp654Coverage,
  validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor,
  validateAdminConsoleCp655Coverage,
  validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor,
  validateAdminConsoleCp656Coverage,
  validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor,
  validateAdminConsoleCp657Coverage,
  validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor,
  validateAdminConsoleCp658Coverage,
  validateAdminConsoleCp658FailureReceiptEscalationDescriptor,
  validateAdminConsoleCp659Coverage,
  validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor,
  validateAdminConsoleCp660Coverage,
  validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor,
  validateAdminConsoleCp661Coverage,
  validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor,
  validateAdminConsoleCp662Coverage,
  validateAdminConsoleCp663ReviewReadinessBridgeDescriptor,
  validateAdminConsoleCp663Coverage,
  validateAdminConsoleCp664TestGoldenReviewTailDescriptor,
  validateAdminConsoleCp664Coverage,
  validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor,
  validateAdminConsoleCp665Coverage,
  validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor,
} from "../src/index.js";

const closeoutPlan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
const cp645Manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-645/manifest.json", import.meta.url), "utf8"));
const cp646Manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-646/manifest.json", import.meta.url), "utf8"));
const cp647ManifestPath = new URL("../../../docs/closeout-packs/cp00-647/manifest.json", import.meta.url);
const cp647Manifest = existsSync(cp647ManifestPath) ? JSON.parse(readFileSync(cp647ManifestPath, "utf8")) : null;
const cp648ManifestPath = new URL("../../../docs/closeout-packs/cp00-648/manifest.json", import.meta.url);
const cp648Manifest = existsSync(cp648ManifestPath) ? JSON.parse(readFileSync(cp648ManifestPath, "utf8")) : null;
const cp649ManifestPath = new URL("../../../docs/closeout-packs/cp00-649/manifest.json", import.meta.url);
const cp649Manifest = existsSync(cp649ManifestPath) ? JSON.parse(readFileSync(cp649ManifestPath, "utf8")) : null;
const cp650ManifestPath = new URL("../../../docs/closeout-packs/cp00-650/manifest.json", import.meta.url);
const cp650Manifest = existsSync(cp650ManifestPath) ? JSON.parse(readFileSync(cp650ManifestPath, "utf8")) : null;
const cp651ManifestPath = new URL("../../../docs/closeout-packs/cp00-651/manifest.json", import.meta.url);
const cp651Manifest = existsSync(cp651ManifestPath) ? JSON.parse(readFileSync(cp651ManifestPath, "utf8")) : null;
const cp652ManifestPath = new URL("../../../docs/closeout-packs/cp00-652/manifest.json", import.meta.url);
const cp652Manifest = existsSync(cp652ManifestPath) ? JSON.parse(readFileSync(cp652ManifestPath, "utf8")) : null;
const cp653ManifestPath = new URL("../../../docs/closeout-packs/cp00-653/manifest.json", import.meta.url);
const cp653Manifest = existsSync(cp653ManifestPath) ? JSON.parse(readFileSync(cp653ManifestPath, "utf8")) : null;
const cp654ManifestPath = new URL("../../../docs/closeout-packs/cp00-654/manifest.json", import.meta.url);
const cp654Manifest = existsSync(cp654ManifestPath) ? JSON.parse(readFileSync(cp654ManifestPath, "utf8")) : null;
const cp655ManifestPath = new URL("../../../docs/closeout-packs/cp00-655/manifest.json", import.meta.url);
const cp655Manifest = existsSync(cp655ManifestPath) ? JSON.parse(readFileSync(cp655ManifestPath, "utf8")) : null;
const cp656ManifestPath = new URL("../../../docs/closeout-packs/cp00-656/manifest.json", import.meta.url);
const cp656Manifest = existsSync(cp656ManifestPath) ? JSON.parse(readFileSync(cp656ManifestPath, "utf8")) : null;
const cp657ManifestPath = new URL("../../../docs/closeout-packs/cp00-657/manifest.json", import.meta.url);
const cp657Manifest = existsSync(cp657ManifestPath) ? JSON.parse(readFileSync(cp657ManifestPath, "utf8")) : null;
const cp658ManifestPath = new URL("../../../docs/closeout-packs/cp00-658/manifest.json", import.meta.url);
const cp658Manifest = existsSync(cp658ManifestPath) ? JSON.parse(readFileSync(cp658ManifestPath, "utf8")) : null;
const cp659ManifestPath = new URL("../../../docs/closeout-packs/cp00-659/manifest.json", import.meta.url);
const cp659Manifest = existsSync(cp659ManifestPath) ? JSON.parse(readFileSync(cp659ManifestPath, "utf8")) : null;
const cp660ManifestPath = new URL("../../../docs/closeout-packs/cp00-660/manifest.json", import.meta.url);
const cp660Manifest = existsSync(cp660ManifestPath) ? JSON.parse(readFileSync(cp660ManifestPath, "utf8")) : null;
const cp661ManifestPath = new URL("../../../docs/closeout-packs/cp00-661/manifest.json", import.meta.url);
const cp661Manifest = existsSync(cp661ManifestPath) ? JSON.parse(readFileSync(cp661ManifestPath, "utf8")) : null;
const cp662ManifestPath = new URL("../../../docs/closeout-packs/cp00-662/manifest.json", import.meta.url);
const cp662Manifest = existsSync(cp662ManifestPath) ? JSON.parse(readFileSync(cp662ManifestPath, "utf8")) : null;
const cp663ManifestPath = new URL("../../../docs/closeout-packs/cp00-663/manifest.json", import.meta.url);
const cp663Manifest = existsSync(cp663ManifestPath) ? JSON.parse(readFileSync(cp663ManifestPath, "utf8")) : null;
const cp664ManifestPath = new URL("../../../docs/closeout-packs/cp00-664/manifest.json", import.meta.url);
const cp664Manifest = existsSync(cp664ManifestPath) ? JSON.parse(readFileSync(cp664ManifestPath, "utf8")) : null;
const cp665ManifestPath = new URL("../../../docs/closeout-packs/cp00-665/manifest.json", import.meta.url);
const cp665Manifest = existsSync(cp665ManifestPath) ? JSON.parse(readFileSync(cp665ManifestPath, "utf8")) : null;
const cp645PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id) ??
  cp645Manifest.plan_binding_snapshot;
const cp646PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id) ??
  cp646Manifest.plan_binding_snapshot;
const cp647PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id) ??
  cp647Manifest?.plan_binding_snapshot;
const cp648PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id) ??
  cp648Manifest?.plan_binding_snapshot;
const cp649PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id) ??
  cp649Manifest?.plan_binding_snapshot;
const cp650PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id) ??
  cp650Manifest?.plan_binding_snapshot;
const cp651PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id) ??
  cp651Manifest?.plan_binding_snapshot;
const cp652PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id) ??
  cp652Manifest?.plan_binding_snapshot;
const cp653PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id) ??
  cp653Manifest?.plan_binding_snapshot;
const cp654PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id) ??
  cp654Manifest?.plan_binding_snapshot;
const cp655PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id) ??
  cp655Manifest?.plan_binding_snapshot;
const cp656PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id) ??
  cp656Manifest?.plan_binding_snapshot;
const cp657PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id) ??
  cp657Manifest?.plan_binding_snapshot;
const cp658PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id) ??
  cp658Manifest?.plan_binding_snapshot;
const cp659PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id) ??
  cp659Manifest?.plan_binding_snapshot;
const cp660PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id) ??
  cp660Manifest?.plan_binding_snapshot;
const cp661PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id) ??
  cp661Manifest?.plan_binding_snapshot;
const cp662PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id) ??
  cp662Manifest?.plan_binding_snapshot;
const cp663PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id) ??
  cp663Manifest?.plan_binding_snapshot;
const cp664PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id) ??
  cp664Manifest?.plan_binding_snapshot;
const cp665PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) ??
  cp665Manifest?.plan_binding_snapshot;
const contractPath = new URL("../../../contracts/admin-console-contract.json", import.meta.url);
const adminConsoleContract = existsSync(contractPath) ? JSON.parse(readFileSync(contractPath, "utf8")) : createAdminConsoleCoreContractProjection();
const historicalPackIdsThroughCp664 = Object.freeze([
  "CP00-645",
  "CP00-646",
  "CP00-647",
  "CP00-648",
  "CP00-649",
  "CP00-650",
  "CP00-651",
  "CP00-652",
  "CP00-653",
  "CP00-654",
  "CP00-655",
  "CP00-656",
  "CP00-657",
  "CP00-658",
  "CP00-659",
  "CP00-660",
  "CP00-661",
  "CP00-662",
  "CP00-663",
  "CP00-664",
]);

test("RP21 program contract pins the Admin Console descriptor-only bootstrap", () => {
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id, "RP21");
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.program_title, "Admin Console");
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.upstream_program_id, "RP20");
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.hermes_gate, "H21");
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.claude_gate, "C21");
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.equal(ADMIN_CONSOLE_PROGRAM_CONTRACT.authority_boundaries.admin_runtime_opened, false);
});

test("CP00-645 plan binding covers the planned 150 RP21 scope and domain foundation units", () => {
  const coverage = validateAdminConsoleCp645Coverage(cp645PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id, "CP00-645");
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.range, "RP21.P00.M00.S01-RP21.P01.M08.S05");
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.upstream_pack_id, "CP00-644");
  assert.equal(ADMIN_CONSOLE_CP645_PACK_BINDING.next_pack_id, "CP00-646");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP645_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP645_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP645_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-645 scope and domain foundation rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp645ScopeDomainFoundationCaseSet();
  const descriptor = createAdminConsoleCp645ScopeDomainFoundationDescriptor();
  const validation = validateAdminConsoleCp645ScopeDomainFoundationDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP645_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.mutation_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(descriptor.exposes_hidden_policy_internals, false);
  assert.equal(descriptor.exposes_unauthorized_admin_rows, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION);
});

test("CP00-645 evidence packets and handoff preserve Admin Console authority boundaries", () => {
  const descriptor = createAdminConsoleCp645ScopeDomainFoundationDescriptor();
  const hermes = createAdminConsoleCp645HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp645ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp645CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-646");
  assert.equal(handoff.next_subphase_id, "RP21.P01.M08.S06");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-645 contract projection matches package code", () => {
  const projection = createAdminConsoleCoreContractProjection();
  const validation = validateAdminConsoleCoreContractProjection(adminConsoleContract, {
    cp645PlanPack,
    cp646PlanPack,
    cp647PlanPack,
    cp648PlanPack,
    cp649PlanPack,
    cp650PlanPack,
    cp651PlanPack,
    cp652PlanPack,
    cp653PlanPack,
    cp654PlanPack,
    cp655PlanPack,
    cp656PlanPack,
    cp657PlanPack,
    cp658PlanPack,
    cp659PlanPack,
    cp660PlanPack,
    cp661PlanPack,
    cp662PlanPack,
    cp663PlanPack,
    cp664PlanPack,
    cp665PlanPack,
  });

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.deepEqual(adminConsoleContract, JSON.parse(JSON.stringify(projection)));
});

test("CP00-646 plan binding covers the planned 150 Admin Console domain service bridge units", () => {
  const coverage = validateAdminConsoleCp646Coverage(cp646PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id, "CP00-646");
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.range, "RP21.P01.M08.S06-RP21.P02.M07.S06");
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.upstream_pack_id, "CP00-645");
  assert.equal(ADMIN_CONSOLE_CP646_PACK_BINDING.next_pack_id, "CP00-647");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP646_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP646_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP646_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-646 domain service bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp646DomainServiceBridgeCaseSet();
  const descriptor = createAdminConsoleCp646DomainServiceBridgeDescriptor();
  const validation = validateAdminConsoleCp646DomainServiceBridgeDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP646_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.persistence_runtime_opened, false);
  assert.equal(descriptor.service_bridge_contract.runtime_handler_opened, false);
  assert.equal(descriptor.exposes_blocked_claim_detail, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION);
});

test("CP00-646 evidence packets and handoff preserve Admin Console service authority boundaries", () => {
  const descriptor = createAdminConsoleCp646DomainServiceBridgeDescriptor();
  const hermes = createAdminConsoleCp646HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp646ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp646CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-647");
  assert.equal(handoff.next_subphase_id, "RP21.P02.M07.S07");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-646 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp645_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION)));
  assert.deepEqual(adminConsoleContract.cp646_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp646_closeout_handoff.to_pack_id, "CP00-647");
  assert.equal(adminConsoleContract.cp646_closeout_handoff.next_subphase_id, "RP21.P02.M07.S07");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-647 plan binding covers the planned 40 Admin Console test/evidence/review units", () => {
  const coverage = validateAdminConsoleCp647Coverage(cp647PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id, "CP00-647");
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.range, "RP21.P02.M07.S07-RP21.P02.M09.S02");
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.upstream_pack_id, "CP00-646");
  assert.equal(ADMIN_CONSOLE_CP647_PACK_BINDING.next_pack_id, "CP00-648");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP647_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP647_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP647_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-647 test evidence review packet rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp647TestEvidenceReviewCaseSet();
  const descriptor = createAdminConsoleCp647TestEvidenceReviewPacketDescriptor();
  const validation = validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP647_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.golden_case_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.claude_runtime_opened, false);
  assert.equal(descriptor.test_golden_contract.runtime_case_execution_opened, false);
  assert.equal(descriptor.evidence_review_contract.hermes_runtime_receipt_emitted, false);
  assert.equal(descriptor.evidence_review_contract.review_payload_persisted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION);
});

test("CP00-647 evidence packets and handoff preserve Admin Console review authority boundaries", () => {
  const descriptor = createAdminConsoleCp647TestEvidenceReviewPacketDescriptor();
  const hermes = createAdminConsoleCp647HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp647ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp647CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-648");
  assert.equal(handoff.next_subphase_id, "RP21.P02.M09.S03");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-647 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp647_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp647_closeout_handoff.to_pack_id, "CP00-648");
  assert.equal(adminConsoleContract.cp647_closeout_handoff.next_subphase_id, "RP21.P02.M09.S03");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-648 plan binding covers the planned 10 Admin Console Claude review boundary units", () => {
  const coverage = validateAdminConsoleCp648Coverage(cp648PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id, "CP00-648");
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.range, "RP21.P02.M09.S03-RP21.P02.M09.S12");
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.upstream_pack_id, "CP00-647");
  assert.equal(ADMIN_CONSOLE_CP648_PACK_BINDING.next_pack_id, "CP00-649");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP648_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP648_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP648_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-648 Claude review boundary rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp648ClaudeReviewBoundaryCaseSet();
  const descriptor = createAdminConsoleCp648ClaudeReviewBoundaryDescriptor();
  const validation = validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP648_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.persistence_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.claude_runtime_opened, false);
  assert.equal(descriptor.claude_review_boundary_contract.runtime_handler_opened, false);
  assert.equal(descriptor.claude_review_boundary_contract.review_payload_persisted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION);
});

test("CP00-648 evidence packets and handoff preserve Admin Console Claude review boundaries", () => {
  const descriptor = createAdminConsoleCp648ClaudeReviewBoundaryDescriptor();
  const hermes = createAdminConsoleCp648HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp648ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp648CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-649");
  assert.equal(handoff.next_subphase_id, "RP21.P02.M09.S13");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-648 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp648_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp648_closeout_handoff.to_pack_id, "CP00-649");
  assert.equal(adminConsoleContract.cp648_closeout_handoff.next_subphase_id, "RP21.P02.M09.S13");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-649 plan binding covers the planned 150 Admin Console review closeout API and UI units", () => {
  const coverage = validateAdminConsoleCp649Coverage(cp649PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id, "CP00-649");
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.range, "RP21.P02.M09.S13-RP21.P04.M02.S07");
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.upstream_pack_id, "CP00-648");
  assert.equal(ADMIN_CONSOLE_CP649_PACK_BINDING.next_pack_id, "CP00-650");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP649_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP649_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP649_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-649 review closeout API and UI rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp649ReviewCloseoutApiUiCaseSet();
  const descriptor = createAdminConsoleCp649ReviewCloseoutApiUiDescriptor();
  const validation = validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP649_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.persistence_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.api_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(descriptor.closeout_service_contract.runtime_handler_opened, false);
  assert.equal(descriptor.api_surface_contract.runtime_handler_opened, false);
  assert.equal(descriptor.api_surface_contract.unauthorized_data_omitted, true);
  assert.equal(descriptor.ui_surface_contract.interaction_runtime_opened, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION);
});

test("CP00-649 evidence packets and handoff preserve Admin Console API and UI boundaries", () => {
  const descriptor = createAdminConsoleCp649ReviewCloseoutApiUiDescriptor();
  const hermes = createAdminConsoleCp649HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp649ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp649CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-650");
  assert.equal(handoff.next_subphase_id, "RP21.P04.M02.S08");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-649 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp649_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp649_closeout_handoff.to_pack_id, "CP00-650");
  assert.equal(adminConsoleContract.cp649_closeout_handoff.next_subphase_id, "RP21.P04.M02.S08");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-650 plan binding covers the planned 40 Admin Console UI implementation slice units", () => {
  const coverage = validateAdminConsoleCp650Coverage(cp650PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id, "CP00-650");
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.range, "RP21.P04.M02.S08-RP21.P04.M04.S17");
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.upstream_pack_id, "CP00-649");
  assert.equal(ADMIN_CONSOLE_CP650_PACK_BINDING.next_pack_id, "CP00-651");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP650_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP650_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP650_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-650 UI implementation slice rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp650UiImplementationSliceCaseSet();
  const descriptor = createAdminConsoleCp650UiImplementationSliceDescriptor();
  const validation = validateAdminConsoleCp650UiImplementationSliceDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP650_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.api_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_build_runtime_opened, false);
  assert.equal(descriptor.ui_interaction_contract.interaction_runtime_opened, false);
  assert.equal(descriptor.ui_interaction_contract.build_runtime_opened, false);
  assert.equal(descriptor.ui_interaction_contract.no_unauthorized_count_leak, true);
  assert.equal(descriptor.ui_evidence_contract.runtime_receipt_emitted, false);
  assert.equal(descriptor.ui_evidence_contract.review_payload_persisted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION);
});

test("CP00-650 evidence packets and handoff preserve Admin Console UI boundaries", () => {
  const descriptor = createAdminConsoleCp650UiImplementationSliceDescriptor();
  const hermes = createAdminConsoleCp650HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp650ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp650CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-651");
  assert.equal(handoff.next_subphase_id, "RP21.P04.M04.S18");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-650 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp650_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp650_closeout_handoff.to_pack_id, "CP00-651");
  assert.equal(adminConsoleContract.cp650_closeout_handoff.next_subphase_id, "RP21.P04.M04.S18");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-651 plan binding covers the planned 40 Admin Console UI permission and fixture units", () => {
  const coverage = validateAdminConsoleCp651Coverage(cp651PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id, "CP00-651");
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.range, "RP21.P04.M04.S18-RP21.P04.M06.S15");
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.upstream_pack_id, "CP00-650");
  assert.equal(ADMIN_CONSOLE_CP651_PACK_BINDING.next_pack_id, "CP00-652");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP651_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP651_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP651_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-651 UI permission fixture rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp651UiPermissionFixtureCaseSet();
  const descriptor = createAdminConsoleCp651UiPermissionFixtureDescriptor();
  const validation = validateAdminConsoleCp651UiPermissionFixtureDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP651_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_build_runtime_opened, false);
  assert.equal(descriptor.ui_permission_audit_contract.runtime_permission_evaluated, false);
  assert.equal(descriptor.ui_permission_audit_contract.writes_permission_decision, false);
  assert.equal(descriptor.ui_permission_audit_contract.emits_audit_event, false);
  assert.equal(descriptor.ui_permission_audit_contract.persists_audit_event, false);
  assert.equal(descriptor.ui_permission_audit_contract.no_unauthorized_count_leak, true);
  assert.equal(descriptor.ui_fixture_evidence_contract.fixture_payload_included, false);
  assert.equal(descriptor.ui_fixture_evidence_contract.runtime_receipt_emitted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION);
});

test("CP00-651 evidence packets and handoff preserve Admin Console permission fixture boundaries", () => {
  const descriptor = createAdminConsoleCp651UiPermissionFixtureDescriptor();
  const hermes = createAdminConsoleCp651HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp651ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp651CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-652");
  assert.equal(handoff.next_subphase_id, "RP21.P04.M06.S16");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-651 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp651_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp651_closeout_handoff.to_pack_id, "CP00-652");
  assert.equal(adminConsoleContract.cp651_closeout_handoff.next_subphase_id, "RP21.P04.M06.S16");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-652 plan binding covers the planned 150 Admin Console fixture and golden case units", () => {
  const coverage = validateAdminConsoleCp652Coverage(cp652PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id, "CP00-652");
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.range, "RP21.P04.M06.S16-RP21.P05.M05.S13");
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.upstream_pack_id, "CP00-651");
  assert.equal(ADMIN_CONSOLE_CP652_PACK_BINDING.next_pack_id, "CP00-653");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP652_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP652_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP652_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-652 fixture golden case rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp652FixtureGoldenCaseSet();
  const descriptor = createAdminConsoleCp652FixtureGoldenCaseDescriptor();
  const validation = validateAdminConsoleCp652FixtureGoldenCaseDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP652_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.golden_case_runtime_opened, false);
  assert.equal(descriptor.fixture_golden_case_contract.fixture_payload_included, false);
  assert.equal(descriptor.fixture_golden_case_contract.real_client_data_loaded, false);
  assert.equal(descriptor.fixture_golden_case_contract.executes_golden_case_runtime, false);
  assert.equal(descriptor.fixture_golden_case_contract.review_required_case_exposes_payload, false);
  assert.equal(descriptor.fixture_golden_case_contract.security_trimming_exposes_unauthorized_count, false);
  assert.equal(descriptor.test_evidence_contract.runtime_receipt_emitted, false);
  assert.equal(descriptor.test_evidence_contract.review_payload_persisted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION);
});

test("CP00-652 evidence packets and handoff preserve Admin Console fixture golden case boundaries", () => {
  const descriptor = createAdminConsoleCp652FixtureGoldenCaseDescriptor();
  const hermes = createAdminConsoleCp652HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp652ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp652CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-653");
  assert.equal(handoff.next_subphase_id, "RP21.P05.M05.S14");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-652 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp652_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp652_closeout_handoff.to_pack_id, "CP00-653");
  assert.equal(adminConsoleContract.cp652_closeout_handoff.next_subphase_id, "RP21.P05.M05.S14");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-653 plan binding covers the planned 10 Admin Console permission fixture tail units", () => {
  const coverage = validateAdminConsoleCp653Coverage(cp653PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id, "CP00-653");
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.range, "RP21.P05.M05.S14-RP21.P05.M06.S01");
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.upstream_pack_id, "CP00-652");
  assert.equal(ADMIN_CONSOLE_CP653_PACK_BINDING.next_pack_id, "CP00-654");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP653_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP653_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP653_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-653 permission fixture tail rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp653PermissionFixtureTailCaseSet();
  const descriptor = createAdminConsoleCp653PermissionFixtureTailDescriptor();
  const validation = validateAdminConsoleCp653PermissionFixtureTailDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP653_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.golden_case_runtime_opened, false);
  assert.equal(descriptor.permission_fixture_tail_contract.fixture_payload_included, false);
  assert.equal(descriptor.permission_fixture_tail_contract.real_client_data_loaded, false);
  assert.equal(descriptor.permission_fixture_tail_contract.executes_golden_case_runtime, false);
  assert.equal(descriptor.permission_fixture_tail_contract.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.permission_fixture_tail_contract.persists_review_packet, false);
  assert.equal(descriptor.permission_fixture_tail_contract.persists_idempotency_key, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION);
});

test("CP00-653 evidence packets and handoff preserve Admin Console permission fixture tail boundaries", () => {
  const descriptor = createAdminConsoleCp653PermissionFixtureTailDescriptor();
  const hermes = createAdminConsoleCp653HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp653ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp653CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-654");
  assert.equal(handoff.next_subphase_id, "RP21.P05.M06.S02");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-653 contract projection remains historical after CP00-665 promotion", () => {
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp653_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp653_closeout_handoff.to_pack_id, "CP00-654");
  assert.equal(adminConsoleContract.cp653_closeout_handoff.next_subphase_id, "RP21.P05.M06.S02");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-654 plan binding covers the planned 150 Admin Console synthetic permission matrix units", () => {
  const coverage = validateAdminConsoleCp654Coverage(cp654PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id, "CP00-654");
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.range, "RP21.P05.M06.S02-RP21.P06.M03.S19");
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.upstream_pack_id, "CP00-653");
  assert.equal(ADMIN_CONSOLE_CP654_PACK_BINDING.next_pack_id, "CP00-655");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP654_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP654_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP654_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-654 synthetic permission matrix rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp654SyntheticPermissionMatrixCaseSet();
  const descriptor = createAdminConsoleCp654SyntheticPermissionMatrixDescriptor();
  const validation = validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP654_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_matrix_runtime_opened, false);
  assert.equal(descriptor.synthetic_fixture_contract.fixture_payload_included, false);
  assert.equal(descriptor.synthetic_fixture_contract.real_user_data_loaded, false);
  assert.equal(descriptor.synthetic_fixture_contract.real_matter_data_loaded, false);
  assert.equal(descriptor.permission_matrix_contract.evaluates_runtime_permission, false);
  assert.equal(descriptor.permission_matrix_contract.writes_permission_decision, false);
  assert.equal(descriptor.permission_matrix_contract.emits_audit_event, false);
  assert.equal(descriptor.permission_matrix_contract.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION);
});

test("CP00-654 evidence packets and handoff preserve Admin Console synthetic permission matrix boundaries", () => {
  const descriptor = createAdminConsoleCp654SyntheticPermissionMatrixDescriptor();
  const hermes = createAdminConsoleCp654HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp654ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp654CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-655");
  assert.equal(handoff.next_subphase_id, "RP21.P06.M03.S20");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-654 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp654_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp654_closeout_handoff.to_pack_id, "CP00-655");
  assert.equal(adminConsoleContract.cp654_closeout_handoff.next_subphase_id, "RP21.P06.M03.S20");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-655 plan binding covers the planned 40 Admin Console permission matrix workflow tail units", () => {
  const coverage = validateAdminConsoleCp655Coverage(cp655PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id, "CP00-655");
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.range, "RP21.P06.M03.S20-RP21.P06.M05.S15");
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.upstream_pack_id, "CP00-654");
  assert.equal(ADMIN_CONSOLE_CP655_PACK_BINDING.next_pack_id, "CP00-656");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP655_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP655_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP655_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-655 permission matrix workflow tail rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp655PermissionMatrixWorkflowTailCaseSet();
  const descriptor = createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor();
  const validation = validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP655_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.workflow_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_matrix_runtime_opened, false);
  assert.equal(descriptor.permission_matrix_workflow_tail_contract.evaluates_runtime_permission, false);
  assert.equal(descriptor.permission_matrix_workflow_tail_contract.writes_permission_decision, false);
  assert.equal(descriptor.permission_matrix_workflow_tail_contract.emits_audit_event, false);
  assert.equal(descriptor.permission_matrix_workflow_tail_contract.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.test_evidence_contract.denied_test_descriptor_only, true);
  assert.equal(descriptor.test_evidence_contract.cross_tenant_test_descriptor_only, true);
  assert.equal(descriptor.test_evidence_contract.leak_prevention_test_descriptor_only, true);
  assert.equal(descriptor.test_evidence_contract.runtime_receipt_emitted, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION);
});

test("CP00-655 evidence packets and handoff preserve Admin Console workflow tail boundaries", () => {
  const descriptor = createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor();
  const hermes = createAdminConsoleCp655HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp655ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp655CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-656");
  assert.equal(handoff.next_subphase_id, "RP21.P06.M05.S16");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-655 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp655_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp655_closeout_handoff.to_pack_id, "CP00-656");
  assert.equal(adminConsoleContract.cp655_closeout_handoff.next_subphase_id, "RP21.P06.M05.S16");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-656 plan binding covers the planned 10 Admin Console permission audit fixture transition units", () => {
  const coverage = validateAdminConsoleCp656Coverage(cp656PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id, "CP00-656");
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.range, "RP21.P06.M05.S16-RP21.P06.M06.S03");
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.upstream_pack_id, "CP00-655");
  assert.equal(ADMIN_CONSOLE_CP656_PACK_BINDING.next_pack_id, "CP00-657");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP656_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP656_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP656_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-656 permission audit fixture transition rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp656PermissionAuditFixtureTransitionCaseSet();
  const descriptor = createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor();
  const validation = validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP656_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_matrix_runtime_opened, false);
  assert.equal(descriptor.permission_audit_fixture_transition_contract.fixture_payload_included, false);
  assert.equal(descriptor.permission_audit_fixture_transition_contract.real_tenant_data_loaded, false);
  assert.equal(descriptor.permission_audit_fixture_transition_contract.real_user_data_loaded, false);
  assert.equal(descriptor.permission_audit_fixture_transition_contract.real_matter_data_loaded, false);
  assert.equal(descriptor.permission_audit_fixture_transition_contract.exposes_unauthorized_count, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION);
});

test("CP00-656 evidence packets and handoff preserve Admin Console fixture transition boundaries", () => {
  const descriptor = createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor();
  const hermes = createAdminConsoleCp656HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp656ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp656CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-657");
  assert.equal(handoff.next_subphase_id, "RP21.P06.M06.S04");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-656 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp656_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp656_closeout_handoff.to_pack_id, "CP00-657");
  assert.equal(adminConsoleContract.cp656_closeout_handoff.next_subphase_id, "RP21.P06.M06.S04");
  assert.equal(adminConsoleContract.runtime_opened, false);
});


test("CP00-657 plan binding covers the planned 150 Admin Console synthetic failure recovery bridge units", () => {
  const coverage = validateAdminConsoleCp657Coverage(cp657PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id, "CP00-657");
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.range, "RP21.P06.M06.S04-RP21.P07.M03.S14");
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.upstream_pack_id, "CP00-656");
  assert.equal(ADMIN_CONSOLE_CP657_PACK_BINDING.next_pack_id, "CP00-658");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP657_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP657_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP657_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-657 synthetic failure recovery bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp657SyntheticFailureRecoveryBridgeCaseSet();
  const descriptor = createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor();
  const validation = validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP657_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_matrix_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.failure_recovery_runtime_opened, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.fixture_payload_included, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.real_tenant_data_loaded, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.real_user_data_loaded, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.real_matter_data_loaded, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.real_document_data_loaded, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.persists_failure_receipt, false);
  assert.equal(descriptor.synthetic_failure_recovery_bridge_contract.exposes_unauthorized_count, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION);
});

test("CP00-657 evidence packets and handoff preserve Admin Console failure recovery bridge boundaries", () => {
  const descriptor = createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor();
  const hermes = createAdminConsoleCp657HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp657ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp657CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-658");
  assert.equal(handoff.next_subphase_id, "RP21.P07.M03.S15");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-657 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp657_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp657_closeout_handoff.to_pack_id, "CP00-658");
  assert.equal(adminConsoleContract.cp657_closeout_handoff.next_subphase_id, "RP21.P07.M03.S15");
  assert.equal(adminConsoleContract.runtime_opened, false);
});


test("CP00-658 plan binding covers the planned 10 Admin Console failure receipt escalation units", () => {
  const coverage = validateAdminConsoleCp658Coverage(cp658PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id, "CP00-658");
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.range, "RP21.P07.M03.S15-RP21.P07.M04.S02");
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.upstream_pack_id, "CP00-657");
  assert.equal(ADMIN_CONSOLE_CP658_PACK_BINDING.next_pack_id, "CP00-659");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP658_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP658_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP658_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-658 failure receipt escalation rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp658FailureReceiptEscalationCaseSet();
  const descriptor = createAdminConsoleCp658FailureReceiptEscalationDescriptor();
  const validation = validateAdminConsoleCp658FailureReceiptEscalationDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP658_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.failure_recovery_runtime_opened, false);
  assert.equal(descriptor.failure_receipt_escalation_contract.fixture_payload_included, false);
  assert.equal(descriptor.failure_receipt_escalation_contract.real_tenant_data_loaded, false);
  assert.equal(descriptor.failure_receipt_escalation_contract.persists_failure_receipt, false);
  assert.equal(descriptor.failure_receipt_escalation_contract.exposes_blocked_claim_detail, false);
  assert.equal(descriptor.failure_receipt_escalation_contract.exposes_unauthorized_count, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION);
});

test("CP00-658 evidence packets and handoff preserve Admin Console failure escalation boundaries", () => {
  const descriptor = createAdminConsoleCp658FailureReceiptEscalationDescriptor();
  const hermes = createAdminConsoleCp658HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp658ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp658CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-659");
  assert.equal(handoff.next_subphase_id, "RP21.P07.M04.S03");
  assert.equal(handoff.runtime_opened, false);
});

test("CP00-658 contract projection remains historical after CP00-665 promotion", () => {
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp658_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp658_closeout_handoff.to_pack_id, "CP00-659");
  assert.equal(adminConsoleContract.cp658_closeout_handoff.next_subphase_id, "RP21.P07.M04.S03");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-659 plan binding covers the planned 40 Admin Console failure recovery permission audit binding units", () => {
  const coverage = validateAdminConsoleCp659Coverage(cp659PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id, "CP00-659");
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.range, "RP21.P07.M04.S03-RP21.P07.M05.S20");
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.upstream_pack_id, "CP00-658");
  assert.equal(ADMIN_CONSOLE_CP659_PACK_BINDING.next_pack_id, "CP00-660");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP659_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP659_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP659_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-659 failure recovery permission audit binding rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp659FailureRecoveryPermissionAuditBindingCaseSet();
  const descriptor = createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor();
  const validation = validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor(descriptor, adminConsoleContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP659_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.failure_recovery_runtime_opened, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.fixture_payload_included, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.real_tenant_data_loaded, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.persists_failure_receipt, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.exposes_blocked_claim_detail, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.exposes_unauthorized_count, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.evaluates_runtime_permission, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.writes_permission_decision, false);
  assert.equal(descriptor.failure_recovery_permission_audit_binding_contract.emits_audit_event, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION);
});

test("CP00-659 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor();
  const hermes = createAdminConsoleCp659HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp659ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp659CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-660");
  assert.equal(handoff.next_subphase_id, "RP21.P07.M05.S21");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp659_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp659_closeout_handoff.to_pack_id, "CP00-660");
  assert.equal(adminConsoleContract.cp659_closeout_handoff.next_subphase_id, "RP21.P07.M05.S21");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-660 plan binding covers the planned 10 Admin Console failure recovery fixture transition units", () => {
  const coverage = validateAdminConsoleCp660Coverage(cp660PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id, "CP00-660");
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.range, "RP21.P07.M05.S21-RP21.P07.M06.S08");
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.upstream_pack_id, "CP00-659");
  assert.equal(ADMIN_CONSOLE_CP660_PACK_BINDING.next_pack_id, "CP00-661");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP660_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP660_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP660_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-660 failure recovery fixture transition rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp660FailureRecoveryFixtureTransitionCaseSet();
  const descriptor = createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor();
  const validation = validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.failure_recovery_fixture_transition_contract;

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP660_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.failure_recovery_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(contract.fixture_payload_included, false);
  assert.equal(contract.real_tenant_data_loaded, false);
  assert.equal(contract.persists_failure_receipt, false);
  assert.equal(contract.exposes_blocked_claim_detail, false);
  assert.equal(contract.exposes_unauthorized_count, false);
  assert.equal(contract.evaluates_runtime_permission, false);
  assert.equal(contract.writes_permission_decision, false);
  assert.equal(contract.emits_audit_event, false);
  assert.equal(contract.persists_audit_event, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION);
});

test("CP00-660 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor();
  const hermes = createAdminConsoleCp660HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp660ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp660CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-661");
  assert.equal(handoff.next_subphase_id, "RP21.P07.M06.S09");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp660_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp660_closeout_handoff.to_pack_id, "CP00-661");
  assert.equal(adminConsoleContract.cp660_closeout_handoff.next_subphase_id, "RP21.P07.M06.S09");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-661 plan binding covers the planned 150 Admin Console failure recovery Hermes evidence bridge units", () => {
  const coverage = validateAdminConsoleCp661Coverage(cp661PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id, "CP00-661");
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.range, "RP21.P07.M06.S09-RP21.P08.M04.S19");
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.upstream_pack_id, "CP00-660");
  assert.equal(ADMIN_CONSOLE_CP661_PACK_BINDING.next_pack_id, "CP00-662");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP661_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP661_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP661_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-661 failure recovery Hermes evidence bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeCaseSet();
  const descriptor = createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor();
  const validation = validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.failure_recovery_hermes_evidence_bridge_contract;

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP661_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.failure_recovery_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.command_runtime_opened, false);
  assert.equal(contract.fixture_payload_included, false);
  assert.equal(contract.real_tenant_data_loaded, false);
  assert.equal(contract.real_document_data_loaded, false);
  assert.equal(contract.persists_failure_receipt, false);
  assert.equal(contract.exposes_blocked_claim_detail, false);
  assert.equal(contract.exposes_unauthorized_count, false);
  assert.equal(contract.executes_hermes_command_runtime, false);
  assert.equal(contract.persists_command_result_receipt, false);
  assert.equal(contract.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION);
});

test("CP00-661 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor();
  const hermes = createAdminConsoleCp661HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp661ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp661CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-662");
  assert.equal(handoff.next_subphase_id, "RP21.P08.M04.S20");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp661_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp661_closeout_handoff.to_pack_id, "CP00-662");
  assert.equal(adminConsoleContract.cp661_closeout_handoff.next_subphase_id, "RP21.P08.M04.S20");
  assert.equal(adminConsoleContract.runtime_opened, false);
});


test("CP00-662 plan binding covers the planned 40 Admin Console evidence permission fixture bridge units", () => {
  const coverage = validateAdminConsoleCp662Coverage(cp662PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id, "CP00-662");
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.risk_class, "B");
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.unit_count, 40);
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.range, "RP21.P08.M04.S20-RP21.P08.M06.S17");
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.upstream_pack_id, "CP00-661");
  assert.equal(ADMIN_CONSOLE_CP662_PACK_BINDING.next_pack_id, "CP00-663");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP662_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP662_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP662_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-662 evidence permission fixture bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp662EvidencePermissionFixtureBridgeCaseSet();
  const descriptor = createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor();
  const validation = validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.evidence_permission_fixture_bridge_contract;

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP662_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.command_runtime_opened, false);
  assert.equal(contract.fixture_payload_included, false);
  assert.equal(contract.real_tenant_data_loaded, false);
  assert.equal(contract.real_document_data_loaded, false);
  assert.equal(contract.exposes_blocked_claim_detail, false);
  assert.equal(contract.exposes_unauthorized_count, false);
  assert.equal(contract.executes_hermes_command_runtime, false);
  assert.equal(contract.persists_command_result_receipt, false);
  assert.equal(contract.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION);
});

test("CP00-662 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor();
  const hermes = createAdminConsoleCp662HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp662ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp662CloseoutHandoff();

  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-663");
  assert.equal(handoff.next_subphase_id, "RP21.P08.M06.S18");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp662_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp662_closeout_handoff.to_pack_id, "CP00-663");
  assert.equal(adminConsoleContract.cp662_closeout_handoff.next_subphase_id, "RP21.P08.M06.S18");
  assert.equal(adminConsoleContract.runtime_opened, false);
});


test("CP00-663 plan binding covers the planned 150 Admin Console review readiness bridge units", () => {
  const coverage = validateAdminConsoleCp663Coverage(cp663PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id, "CP00-663");
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.unit_count, 150);
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.range, "RP21.P08.M06.S18-RP21.P09.M07.S02");
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.upstream_pack_id, "CP00-662");
  assert.equal(ADMIN_CONSOLE_CP663_PACK_BINDING.next_pack_id, "CP00-664");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP663_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP663_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP663_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-663 review readiness bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp663ReviewReadinessBridgeCaseSet();
  const descriptor = createAdminConsoleCp663ReviewReadinessBridgeDescriptor();
  const validation = validateAdminConsoleCp663ReviewReadinessBridgeDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.review_readiness_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP663_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(contract.real_tenant_data_loaded, false);
  assert.equal(contract.real_document_data_loaded, false);
  assert.equal(contract.persists_review_packet, false);
  assert.equal(contract.evaluates_runtime_permission, false);
  assert.equal(contract.writes_permission_decision, false);
  assert.equal(contract.emits_hermes_runtime_receipt, false);
  assert.equal(contract.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION);
});

test("CP00-663 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp663ReviewReadinessBridgeDescriptor();
  const hermes = createAdminConsoleCp663HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp663ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp663CloseoutHandoff();
  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-664");
  assert.equal(handoff.next_subphase_id, "RP21.P09.M07.S03");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp663_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp663_closeout_handoff.to_pack_id, "CP00-664");
  assert.equal(adminConsoleContract.cp663_closeout_handoff.next_subphase_id, "RP21.P09.M07.S03");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-664 plan binding covers the planned 10 Admin Console test golden review tail units", () => {
  const coverage = validateAdminConsoleCp664Coverage(cp664PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id, "CP00-664");
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.risk_class, "A");
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.unit_count, 10);
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.range, "RP21.P09.M07.S03-RP21.P09.M07.S12");
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.upstream_pack_id, "CP00-663");
  assert.equal(ADMIN_CONSOLE_CP664_PACK_BINDING.next_pack_id, "CP00-665");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP664_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP664_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP664_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-664 test golden review tail rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp664TestGoldenReviewTailCaseSet();
  const descriptor = createAdminConsoleCp664TestGoldenReviewTailDescriptor();
  const validation = validateAdminConsoleCp664TestGoldenReviewTailDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.test_golden_review_tail_contract;
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP664_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(contract.permission_bypass_questions_descriptor_only, true);
  assert.equal(contract.audit_completeness_questions_descriptor_only, true);
  assert.equal(contract.missing_test_questions_descriptor_only, true);
  assert.equal(contract.ui_leak_questions_descriptor_only, true);
  assert.equal(contract.evaluates_runtime_permission, false);
  assert.equal(contract.writes_permission_decision, false);
  assert.equal(contract.emits_audit_event, false);
  assert.equal(contract.persists_review_packet, false);
  assert.equal(contract.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION);
});

test("CP00-664 evidence packets and contract projection remain historical after CP00-665 promotion", () => {
  const descriptor = createAdminConsoleCp664TestGoldenReviewTailDescriptor();
  const hermes = createAdminConsoleCp664HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp664ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp664CloseoutHandoff();
  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-665");
  assert.equal(handoff.next_subphase_id, "RP21.P09.M07.S13");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp664_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp664_closeout_handoff.to_pack_id, "CP00-665");
  assert.equal(adminConsoleContract.cp664_closeout_handoff.next_subphase_id, "RP21.P09.M07.S13");
  assert.equal(adminConsoleContract.runtime_opened, false);
});

test("CP00-665 plan binding covers the planned 28 Admin Console review evidence closeout bridge units", () => {
  const coverage = validateAdminConsoleCp665Coverage(cp665PlanPack);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id, "CP00-665");
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.risk_class, "C");
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.unit_count, 28);
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.range, "RP21.P09.M07.S13-RP21.P09.M10.S04");
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.upstream_pack_id, "CP00-664");
  assert.equal(ADMIN_CONSOLE_CP665_PACK_BINDING.next_pack_id, "CP00-666");
  assert.deepEqual(coverage.summary.by_deliverable, ADMIN_CONSOLE_CP665_REQUIREMENTS.deliverable_counts);
  assert.deepEqual(coverage.summary.by_phase, ADMIN_CONSOLE_CP665_REQUIREMENTS.phase_counts);
  assert.deepEqual(coverage.summary.by_micro_phase, ADMIN_CONSOLE_CP665_REQUIREMENTS.micro_phase_row_counts);
});

test("CP00-665 review evidence closeout bridge rows stay descriptor-only", () => {
  const caseSet = createAdminConsoleCp665ReviewEvidenceCloseoutBridgeCaseSet();
  const descriptor = createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor();
  const validation = validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor(descriptor, adminConsoleContract);
  const contract = descriptor.review_evidence_closeout_bridge_contract;
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, Object.keys(ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_rows).length);
  assert.equal(descriptor.runtime_boundary.admin_console_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.permission_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.audit_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.fixture_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.hermes_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.command_runtime_opened, false);
  assert.equal(descriptor.runtime_boundary.ui_runtime_opened, false);
  assert.equal(contract.claude_review_packet_read_only, true);
  assert.equal(contract.closeout_criteria_descriptor_only, true);
  assert.equal(contract.next_rp_dependency_descriptor_only, true);
  assert.equal(contract.command_rerun_descriptor_only, true);
  assert.equal(contract.evaluates_runtime_permission, false);
  assert.equal(contract.writes_permission_decision, false);
  assert.equal(contract.emits_audit_event, false);
  assert.equal(contract.persists_review_packet, false);
  assert.equal(contract.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.no_write_attestation, ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION);
});

test("CP00-665 evidence packets and contract projection are current while prior Admin Console packs remain historical", () => {
  const descriptor = createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor();
  const hermes = createAdminConsoleCp665HermesEvidencePacket(descriptor);
  const claude = createAdminConsoleCp665ClaudeReviewPacket(descriptor);
  const handoff = createAdminConsoleCp665CloseoutHandoff();
  assert.equal(hermes.gate, "H21");
  assert.equal(hermes.runtime_receipt_emitted, false);
  assert.equal(hermes.hermes_runtime_opened, false);
  assert.equal(claude.gate, "C21");
  assert.equal(claude.read_only, true);
  assert.equal(claude.blocks_pack_on_p0_p1_p2, true);
  assert.equal(handoff.to_pack_id, "CP00-666");
  assert.equal(handoff.next_subphase_id, "RP22.P00.M00.S01");
  assert.equal(handoff.runtime_opened, false);
  assert.equal(adminConsoleContract.current_pack.pack_id, "CP00-665");
  assert.deepEqual(adminConsoleContract.historical_pack_ids, historicalPackIdsThroughCp664);
  assert.deepEqual(adminConsoleContract.cp665_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION)));
  assert.equal(adminConsoleContract.cp665_closeout_handoff.to_pack_id, "CP00-666");
  assert.equal(adminConsoleContract.cp665_closeout_handoff.next_subphase_id, "RP22.P00.M00.S01");
  assert.equal(adminConsoleContract.runtime_opened, false);
});
