import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import * as platform from "../src/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function planPack(binding) {
  const plan = readJson("docs/closeout-pack-plan/closeout-pack-plan.json");
  const fromPlan = plan.packs.find((item) => item.pack_id === binding.pack_id);
  if (fromPlan) return fromPlan;
  const manifestPath = `docs/closeout-packs/${binding.pack_id.toLowerCase()}/manifest.json`;
  if (existsSync(manifestPath)) return readJson(manifestPath).plan_binding_snapshot;
  return undefined;
}

test("CP00-820 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-820");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp820ScopeDomainFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP820_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P00"], 78);
  assert.equal(coverage.summary.by_phase["RP27.P01"], 72);
});

test("CP00-820 descriptor and packets stay runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp820ScopeDomainFoundationDescriptor();
  const validation = platform.validatePlatformExtensibilityCp820ScopeDomainFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.ok(descriptor.blocked_claims.includes("api_over_permission"));
  assert.ok(descriptor.blocked_claims.includes("webhook_replay"));
  assert.ok(descriptor.blocked_claims.includes("workflow_unsafe_mutation"));
  const hermes = platform.createPlatformExtensibilityCp820HermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = platform.createPlatformExtensibilityCp820ClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  const handoff = platform.createPlatformExtensibilityCp820CloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility model registry is tenant-scoped and audit-traceable", () => {
  const validation = platform.validatePlatformExtensibilityModelRegistry();
  assert.deepEqual(validation.errors, []);
  for (const descriptor of Object.values(platform.PLATFORM_EXTENSIBILITY_MODELS)) {
    assert.equal(descriptor.tenant_scoped, true);
    assert.ok(descriptor.required_fields.includes("matter_trace_ref"));
    assert.ok(descriptor.references.includes("AuditEvent"));
  }
});

test("Platform Extensibility contract projection keeps CP00-820 current", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.program_contract.program_id, "RP27");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-820"), true);
  assert.equal(contract.projections.cp820.descriptor, "PlatformExtensibilityCp820ScopeDomainFoundationDescriptor");
  assert.equal(contract.validation.valid, true);
  for (const artifact of platform.PLATFORM_EXTENSIBILITY_CP820_REQUIREMENTS.mandatory_artifacts) {
    assert.ok(contract.mandatory_artifacts.includes(artifact));
  }
});

test("CP00-821 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-821");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp821DomainPermissionAuditCloseoutCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP821_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P01.M05"], 10);
});

test("CP00-821 descriptor closes the domain permission/audit tail without runtime", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor();
  const validation = platform.validatePlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp820ScopeDomainFoundationDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-821 current", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-821"), true);
  assert.equal(contract.projections.cp821.descriptor, "PlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor");
});

test("CP00-822 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-822");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp822IndexExportFixtureFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP822_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P01.M06"], 9);
});

test("CP00-822 descriptor keeps index export and fixture foundation runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor();
  const validation = platform.validatePlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-822 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-822"), true);
  assert.equal(contract.projections.cp822.descriptor, "PlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor");
});

test("CP00-823 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-823");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp823FixtureServiceBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP823_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P01"], 81);
  assert.equal(coverage.summary.by_phase["RP27.P02"], 69);
});

test("CP00-823 descriptor keeps fixture and service bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp823FixtureServiceBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp823FixtureServiceBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-823 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-823"), true);
  assert.equal(contract.projections.cp823.descriptor, "PlatformExtensibilityCp823FixtureServiceBridgeDescriptor");
});

test("CP00-824 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-824");
  assert.equal(binding.unit_count, 40);
  const coverage = platform.validatePlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP824_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P02.M04"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 12);
});

test("CP00-824 descriptor keeps service tail and permission audit bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp823FixtureServiceBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-824 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-824"), true);
  assert.equal(contract.projections.cp824.descriptor, "PlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor");
});

test("CP00-825 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-825");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp825PermissionAuditTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP825_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P02.M05"], 10);
});

test("CP00-825 descriptor keeps permission audit tail runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp825PermissionAuditTailDescriptor();
  const validation = platform.validatePlatformExtensibilityCp825PermissionAuditTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-825 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-825"), true);
  assert.equal(contract.projections.cp825.descriptor, "PlatformExtensibilityCp825PermissionAuditTailDescriptor");
});

test("CP00-826 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-826");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP826_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P02"], 108);
  assert.equal(coverage.summary.by_phase["RP27.P03"], 42);
});

test("CP00-826 descriptor keeps synthetic fixture interface bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp825PermissionAuditTailDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-826 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-826"), true);
  assert.equal(contract.projections.cp826.descriptor, "PlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor");
});

test("CP00-827 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-827");
  assert.equal(binding.unit_count, 40);
  const coverage = platform.validatePlatformExtensibilityCp827InterfacePermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP827_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P03.M04"], 19);
  assert.equal(coverage.summary.by_micro_phase["RP27.P03.M05"], 21);
});

test("CP00-827 descriptor keeps interface permission audit bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-827 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-827"), true);
  assert.equal(contract.projections.cp827.descriptor, "PlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor");
});

test("CP00-828 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-828");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP828_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P03.M05"], 1);
  assert.equal(coverage.summary.by_micro_phase["RP27.P03.M06"], 9);
});

test("CP00-828 descriptor keeps interface fixture foundation runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor();
  const validation = platform.validatePlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-828 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-828"), true);
  assert.equal(contract.projections.cp828.descriptor, "PlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor");
});

test("CP00-829 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-829");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp829FixtureReviewUiBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP829_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P03"], 81);
  assert.equal(coverage.summary.by_phase["RP27.P04"], 69);
});

test("CP00-829 descriptor keeps fixture review UI bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-829 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-829"), true);
  assert.equal(contract.projections.cp829.descriptor, "PlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor");
});

test("CP00-830 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-830");
  assert.equal(binding.unit_count, 40);
  const coverage = platform.validatePlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP830_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P04.M04"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP27.P04.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP27.P04.M06"], 7);
});

test("CP00-830 descriptor keeps UI permission fixture bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-830 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-830"), true);
  assert.equal(contract.projections.cp830.descriptor, "PlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor");
});

test("CP00-831 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-831");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp831UiFixtureFoundationBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP831_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P04"], 87);
  assert.equal(coverage.summary.by_phase["RP27.P05"], 63);
});

test("CP00-831 descriptor keeps UI fixture foundation bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-831 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-831"), true);
  assert.equal(contract.projections.cp831.descriptor, "PlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor");
});

test("CP00-832 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-832");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp832FixturePermissionMatrixBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP832_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P05"], 133);
  assert.equal(coverage.summary.by_phase["RP27.P06"], 17);
});

test("CP00-832 descriptor keeps fixture permission matrix bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-832 historical", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-832"), true);
  assert.equal(contract.projections.cp832.descriptor, "PlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor");
});

test("CP00-833 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-833");
  assert.equal(binding.unit_count, 40);
  const coverage = platform.validatePlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP833_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M01"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M03"], 4);
});

test("CP00-833 descriptor keeps permission matrix contract shape bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-833 historical after CP00-834 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-833"), true);
  assert.equal(contract.projections.cp833.descriptor, "PlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor");
});

test("CP00-834 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-834");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP834_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M03"], 18);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M09"], 22);
});

test("CP00-834 descriptor keeps permission matrix runtime workflow bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-834 historical after CP00-835 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-834"), true);
  assert.equal(contract.projections.cp834.descriptor, "PlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor");
});

test("CP00-835 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-835");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP835_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP27.P06.M10"], 10);
  assert.equal(coverage.summary.by_micro_title["Closeout And Next Handoff"], 10);
});

test("CP00-835 descriptor keeps permission matrix closeout handoff bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-835 historical after CP00-836 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-835"), true);
  assert.equal(contract.projections.cp835.descriptor, "PlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor");
});

test("CP00-836 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-836");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp836FailureFoundationTransitionBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP836_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P06"], 10);
  assert.equal(coverage.summary.by_phase["RP27.P07"], 140);
  assert.equal(coverage.summary.by_micro_phase["RP27.P07.M06"], 21);
});

test("CP00-836 descriptor keeps failure foundation transition bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-836 historical after CP00-837 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-836"), true);
  assert.equal(contract.projections.cp836.descriptor, "PlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor");
});

test("CP00-837 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-837");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP837_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P07"], 87);
  assert.equal(coverage.summary.by_phase["RP27.P08"], 63);
  assert.equal(coverage.summary.by_micro_phase["RP27.P08.M04"], 5);
});

test("CP00-837 descriptor keeps failure evidence command matrix bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-837 historical after CP00-838 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-837"), true);
  assert.equal(contract.projections.cp837.descriptor, "PlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor");
});

test("CP00-838 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-838");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP838_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P08"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP27.P08.M04"], 10);
  assert.equal(coverage.summary.by_micro_title["Secondary Workflow Slice"], 10);
});

test("CP00-838 descriptor keeps Hermes evidence secondary workflow bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-838 historical after CP00-839 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-838"), true);
  assert.equal(contract.projections.cp838.descriptor, "PlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor");
});

test("CP00-839 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-839");
  assert.equal(binding.unit_count, 40);
  const coverage = platform.validatePlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP839_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P08"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP27.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-839 descriptor keeps Hermes evidence permission audit fixture bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Platform Extensibility contract projection keeps CP00-839 historical after CP00-840 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-839"), true);
  assert.equal(contract.projections.cp839.descriptor, "PlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor");
});

test("CP00-840 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-840");
  assert.equal(binding.unit_count, 150);
  const coverage = platform.validatePlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP840_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P08"], 83);
  assert.equal(coverage.summary.by_phase["RP27.P09"], 67);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M03"], 22);
});

test("CP00-840 descriptor keeps Hermes evidence Claude review foundation bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_packet.read_only, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Platform Extensibility contract projection keeps CP00-840 historical after CP00-841 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-840"), true);
  assert.equal(contract.projections.cp840.descriptor, "PlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor");
});

test("CP00-841 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-841");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP841_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M05"], 10);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 10);
});

test("CP00-841 descriptor keeps Claude review permission audit bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_packet.read_only, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Platform Extensibility contract projection keeps CP00-841 historical after CP00-842 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-841"), true);
  assert.equal(contract.projections.cp841.descriptor, "PlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor");
});

test("CP00-842 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-842");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP842_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M06"], 3);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 7);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 3);
});

test("CP00-842 descriptor keeps Claude closeout synthetic fixture bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_packet.read_only, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Platform Extensibility contract projection keeps CP00-842 historical after CP00-843 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-842"), true);
  assert.equal(contract.projections.cp842.descriptor, "PlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor");
});

test("CP00-843 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-843");
  assert.equal(binding.unit_count, 10);
  const coverage = platform.validatePlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP843_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M06"], 10);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 10);
});

test("CP00-843 descriptor keeps synthetic fixture review question bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_packet.read_only, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Platform Extensibility contract projection keeps CP00-843 historical after CP00-844 promotion", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-843"), true);
  assert.equal(contract.projections.cp843.descriptor, "PlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor");
});

test("CP00-844 binding and coverage match the live RP27 plan", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-844");
  assert.equal(binding.unit_count, 77);
  const coverage = platform.validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, platform.PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP27.P09"], 77);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M06"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP27.P09.M10"], 8);
  assert.equal(coverage.summary.by_micro_title["Closeout And Next Handoff"], 8);
});

test("CP00-844 descriptor keeps review evidence closeout bridge runtime-closed", () => {
  const binding = platform.PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING;
  const descriptor = platform.createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor();
  const validation = platform.validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "PlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor");
  assert.equal(descriptor.api_key_issued, false);
  assert.equal(descriptor.webhook_delivered, false);
  assert.equal(descriptor.workflow_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.closeout_handoff.next_subphase_id, "RP28.P00.M00.S01");
  assert.equal(descriptor.claude_packet.read_only, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Platform Extensibility contract projection keeps CP00-844 current", () => {
  const contract = readJson("contracts/platform-extensibility-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-844");
  assert.equal(contract.projections.cp844.descriptor, "PlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor");
  assert.equal(contract.latest_projection.descriptor, "PlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-844");
});
