import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import * as marketplace from "../src/index.js";

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

test("CP00-845 binding and coverage match the live RP28 plan", () => {
  const binding = marketplace.MARKETPLACE_CP845_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-845");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P00.M00.S01");
  assert.equal(binding.last_unit_id, "RP28.P01.M02.S08");
  const coverage = marketplace.validateMarketplaceCp845ScopeDomainFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP845_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P00"], 122);
  assert.equal(coverage.summary.by_phase["RP28.P01"], 28);
});

test("CP00-845 descriptor and review packets stay runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP845_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp845ScopeDomainFoundationDescriptor();
  const validation = marketplace.validateMarketplaceCp845ScopeDomainFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.tenant_install_performed, false);
  assert.equal(descriptor.custom_ai_app_runtime_executed, false);
  assert.equal(descriptor.install_receipt_emitted, false);
  assert.ok(descriptor.blocked_claims.includes("unsafe_app_permission"));
  assert.ok(descriptor.blocked_claims.includes("custom_ai_data_leak"));
  assert.ok(descriptor.blocked_claims.includes("unreviewed_connector"));
  const hermes = marketplace.createMarketplaceCp845HermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = marketplace.createMarketplaceCp845ClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  const handoff = marketplace.createMarketplaceCp845CloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("Marketplace model registry is tenant-scoped and audit-traceable", () => {
  const validation = marketplace.validateMarketplaceModelRegistry();
  assert.deepEqual(validation.errors, []);
  for (const descriptor of Object.values(marketplace.MARKETPLACE_MODEL_DECLARATIONS)) {
    assert.equal(descriptor.tenant_scoped, true);
    assert.ok(descriptor.required_fields.includes("matter_trace_ref"));
    assert.ok(descriptor.references.includes("AuditEvent"));
  }
  const cp845 = marketplace.createMarketplaceCp845ScopeDomainFoundationDescriptor();
  const cp846 = marketplace.createMarketplaceCp846DomainCustomAiReviewGateDescriptor();
  const cp847 = marketplace.createMarketplaceCp847ReviewGatePermissionRelationshipDescriptor();
  const cp848 = marketplace.createMarketplaceCp848InstallReceiptSubmissionReviewDescriptor();
  const cp849 = marketplace.createMarketplaceCp849SubmissionReviewWorkflowDescriptor();
  const cp850 = marketplace.createMarketplaceCp850PermissionAuditFixtureDescriptor();
  const cp851 = marketplace.createMarketplaceCp851FixtureGoldenCaseDescriptor();
  const cp852 = marketplace.createMarketplaceCp852GoldenCaseValidationDescriptor();
  const cp853 = marketplace.createMarketplaceCp853EvidenceReviewPacketDescriptor();
  const cp854 = marketplace.createMarketplaceCp854CloseoutAppRegistryDescriptor();
  const cp855 = marketplace.createMarketplaceCp855ApiUiFoundationDescriptor();
  const cp856 = marketplace.createMarketplaceCp856UiPermissionBindingDescriptor();
  const cp857 = marketplace.createMarketplaceCp857UiFixtureTransitionDescriptor();
  const cp858 = marketplace.createMarketplaceCp858UiFixtureGoldenCaseDescriptor();
  const cp859 = marketplace.createMarketplaceCp859FixtureSecurityTestDescriptor();
  const cp860 = marketplace.createMarketplaceCp860FixturePermissionMatrixBridgeDescriptor();
  const cp861 = marketplace.createMarketplaceCp861PermissionDecisionMatrixDescriptor();
  const cp862 = marketplace.createMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor();
  const cp863 = marketplace.createMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor();
  const cp864 = marketplace.createMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor();
  const cp865 = marketplace.createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor();
  const cp866 = marketplace.createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor();
  const cp867 = marketplace.createMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor();
  const cp868 = marketplace.createMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor();
  const cp869 = marketplace.createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor();
  const cp870 = marketplace.createMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor();
  const cp871 = marketplace.createMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor();
  const cp872 = marketplace.createMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor();
  assert.deepEqual(cp845.implemented_model_names, ["MarketplaceApp", "ConnectorSDK"]);
  assert.deepEqual(cp846.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate"]);
  assert.deepEqual(cp847.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission"]);
  assert.deepEqual(cp848.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp849.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp850.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp851.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp852.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp853.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp854.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp855.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp856.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp857.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp858.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp859.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp860.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp861.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp862.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp863.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp864.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp865.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp866.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp867.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp868.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp869.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp870.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp871.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
  assert.deepEqual(cp872.implemented_model_names, ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]);
});

test("Marketplace contract projection keeps CP00-845 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.program_contract.program_id, "RP28");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-845"), true);
  assert.equal(contract.projections.cp845.descriptor, "MarketplaceCp845ScopeDomainFoundationDescriptor");
  assert.equal(contract.validation.valid, true);
  for (const artifact of marketplace.MARKETPLACE_CP845_REQUIREMENTS.mandatory_artifacts) {
    assert.ok(contract.mandatory_artifacts.includes(artifact));
  }
});

test("CP00-846 binding and coverage match the live RP28 domain model plan", () => {
  const binding = marketplace.MARKETPLACE_CP846_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-846");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P01.M02.S09");
  assert.equal(binding.last_unit_id, "RP28.P01.M04.S06");
  const coverage = marketplace.validateMarketplaceCp846DomainCustomAiReviewGateCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP846_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P01.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-846 descriptor extends CustomAIApp and ReviewGate without runtime", () => {
  const binding = marketplace.MARKETPLACE_CP846_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp846DomainCustomAiReviewGateDescriptor();
  const validation = marketplace.validateMarketplaceCp846DomainCustomAiReviewGateDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp845ScopeDomainFoundationDescriptor");
  assert.equal(descriptor.tenant_install_performed, false);
  assert.equal(descriptor.custom_ai_app_runtime_executed, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.ok(descriptor.models.CustomAIApp.required_fields.includes("custom_ai_app_id"));
  assert.ok(descriptor.models.ReviewGate.required_fields.includes("review_gate_id"));
});

test("Marketplace contract projection keeps CP00-846 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-846"), true);
  assert.equal(contract.projections.cp846.descriptor, "MarketplaceCp846DomainCustomAiReviewGateDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-847 binding and coverage match the live RP28 permission relationship plan", () => {
  const binding = marketplace.MARKETPLACE_CP847_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-847");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P01.M04.S07");
  assert.equal(binding.last_unit_id, "RP28.P01.M06.S04");
  const coverage = marketplace.validateMarketplaceCp847ReviewGatePermissionRelationshipCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP847_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P01.M05"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-847 descriptor extends AppPermission and relationship map without runtime", () => {
  const binding = marketplace.MARKETPLACE_CP847_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp847ReviewGatePermissionRelationshipDescriptor();
  const validation = marketplace.validateMarketplaceCp847ReviewGatePermissionRelationshipDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp846DomainCustomAiReviewGateDescriptor");
  assert.equal(descriptor.tenant_install_performed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.ok(descriptor.models.AppPermission.required_fields.includes("app_permission_id"));
  assert.ok(descriptor.relationship_map.ReviewGate.includes("AppPermission"));
});

test("Marketplace contract projection keeps CP00-847 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-847"), true);
  assert.equal(contract.projections.cp847.descriptor, "MarketplaceCp847ReviewGatePermissionRelationshipDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-848 binding and coverage match the live RP28 submission review plan", () => {
  const binding = marketplace.MARKETPLACE_CP848_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-848");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P01.M06.S05");
  assert.equal(binding.last_unit_id, "RP28.P02.M02.S22");
  const coverage = marketplace.validateMarketplaceCp848InstallReceiptSubmissionReviewCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP848_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P01"], 88);
  assert.equal(coverage.summary.by_phase["RP28.P02"], 62);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M02"], 22);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 22);
});

test("CP00-848 descriptor extends InstallReceipt and submission review rows without runtime", () => {
  const binding = marketplace.MARKETPLACE_CP848_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp848InstallReceiptSubmissionReviewDescriptor();
  const validation = marketplace.validateMarketplaceCp848InstallReceiptSubmissionReviewDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp847ReviewGatePermissionRelationshipDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.install_receipt_emitted, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.ok(descriptor.models.InstallReceipt.required_fields.includes("install_receipt_id"));
  assert.ok(descriptor.relationship_map.AppPermission.includes("InstallReceipt"));
});

test("Marketplace contract projection keeps CP00-848 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-848"), true);
  assert.equal(contract.projections.cp848.descriptor, "MarketplaceCp848InstallReceiptSubmissionReviewDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-849 binding and coverage match the live RP28 submission workflow plan", () => {
  const binding = marketplace.MARKETPLACE_CP849_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-849");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P02.M03.S01");
  assert.equal(binding.last_unit_id, "RP28.P02.M04.S18");
  const coverage = marketplace.validateMarketplaceCp849SubmissionReviewWorkflowCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP849_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M04"], 18);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-849 descriptor keeps submission review workflow rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP849_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp849SubmissionReviewWorkflowDescriptor();
  const validation = marketplace.validateMarketplaceCp849SubmissionReviewWorkflowDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp848InstallReceiptSubmissionReviewDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.install_receipt_emitted, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.submission_review_workflow_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-849 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-849"), true);
  assert.equal(contract.projections.cp849.descriptor, "MarketplaceCp849SubmissionReviewWorkflowDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-850 binding and coverage match the live RP28 permission/audit fixture plan", () => {
  const binding = marketplace.MARKETPLACE_CP850_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-850");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P02.M04.S19");
  assert.equal(binding.last_unit_id, "RP28.P02.M06.S14");
  const coverage = marketplace.validateMarketplaceCp850PermissionAuditFixtureCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP850_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M04"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M06"], 14);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-850 descriptor keeps permission/audit fixture rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP850_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp850PermissionAuditFixtureDescriptor();
  const validation = marketplace.validateMarketplaceCp850PermissionAuditFixtureDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp849SubmissionReviewWorkflowDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.permission_audit_fixture_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-850 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-850"), true);
  assert.equal(contract.projections.cp850.descriptor, "MarketplaceCp850PermissionAuditFixtureDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-851 binding and coverage match the live RP28 fixture/golden case plan", () => {
  const binding = marketplace.MARKETPLACE_CP851_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-851");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P02.M06.S15");
  assert.equal(binding.last_unit_id, "RP28.P02.M07.S02");
  const coverage = marketplace.validateMarketplaceCp851FixtureGoldenCaseCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP851_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M06"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M07"], 2);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 8);
});

test("CP00-851 descriptor keeps fixture and golden case rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP851_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp851FixtureGoldenCaseDescriptor();
  const validation = marketplace.validateMarketplaceCp851FixtureGoldenCaseDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp850PermissionAuditFixtureDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.fixture_golden_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-851 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-851"), true);
  assert.equal(contract.projections.cp851.descriptor, "MarketplaceCp851FixtureGoldenCaseDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-852 binding and coverage match the live RP28 golden case validation plan", () => {
  const binding = marketplace.MARKETPLACE_CP852_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-852");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P02.M07.S03");
  assert.equal(binding.last_unit_id, "RP28.P02.M07.S12");
  const coverage = marketplace.validateMarketplaceCp852GoldenCaseValidationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP852_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M07"], 10);
  assert.equal(coverage.summary.by_micro_title["Test And Golden Case Set"], 10);
});

test("CP00-852 descriptor keeps golden case validation rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP852_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp852GoldenCaseValidationDescriptor();
  const validation = marketplace.validateMarketplaceCp852GoldenCaseValidationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp851FixtureGoldenCaseDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.golden_case_validation_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-852 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-852"), true);
  assert.equal(contract.projections.cp852.descriptor, "MarketplaceCp852GoldenCaseValidationDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-853 binding and coverage match the live RP28 evidence/review packet plan", () => {
  const binding = marketplace.MARKETPLACE_CP853_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-853");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P02.M07.S13");
  assert.equal(binding.last_unit_id, "RP28.P02.M09.S08");
  const coverage = marketplace.validateMarketplaceCp853EvidenceReviewPacketCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP853_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P02.M09"], 8);
  assert.equal(coverage.summary.by_micro_title["Hermes Evidence Packet"], 22);
});

test("CP00-853 descriptor keeps evidence and review packet rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP853_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp853EvidenceReviewPacketDescriptor();
  const validation = marketplace.validateMarketplaceCp853EvidenceReviewPacketDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp852GoldenCaseValidationDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.evidence_review_packet_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-853 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-853"), true);
  assert.equal(contract.projections.cp853.descriptor, "MarketplaceCp853EvidenceReviewPacketDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});


test("CP00-854 binding and coverage match the live RP28 closeout/app registry plan", () => {
  const binding = marketplace.MARKETPLACE_CP854_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-854");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P02.M09.S09");
  assert.equal(binding.last_unit_id, "RP28.P03.M06.S12");
  const coverage = marketplace.validateMarketplaceCp854CloseoutAppRegistryCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP854_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P02"], 34);
  assert.equal(coverage.summary.by_phase["RP28.P03"], 116);
  assert.equal(coverage.summary.by_micro_phase["RP28.P03.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-854 descriptor keeps closeout and app registry rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP854_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp854CloseoutAppRegistryDescriptor();
  const validation = marketplace.validateMarketplaceCp854CloseoutAppRegistryDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp853EvidenceReviewPacketDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.closeout_app_registry_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-854 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-854"), true);
  assert.equal(contract.projections.cp854.descriptor, "MarketplaceCp854CloseoutAppRegistryDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-855 binding and coverage match the live RP28 API/UI foundation plan", () => {
  const binding = marketplace.MARKETPLACE_CP855_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-855");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P03.M06.S13");
  assert.equal(binding.last_unit_id, "RP28.P04.M03.S20");
  const coverage = marketplace.validateMarketplaceCp855ApiUiFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP855_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P03"], 80);
  assert.equal(coverage.summary.by_phase["RP28.P04"], 70);
  assert.equal(coverage.summary.by_micro_phase["RP28.P03.M07"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 20);
});

test("CP00-855 descriptor keeps API/UI foundation rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP855_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp855ApiUiFoundationDescriptor();
  const validation = marketplace.validateMarketplaceCp855ApiUiFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp854CloseoutAppRegistryDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.api_ui_foundation_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-855 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-855"), true);
  assert.equal(contract.projections.cp855.descriptor, "MarketplaceCp855ApiUiFoundationDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-856 binding and coverage match the live RP28 UI permission binding plan", () => {
  const binding = marketplace.MARKETPLACE_CP856_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-856");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P04.M03.S21");
  assert.equal(binding.last_unit_id, "RP28.P04.M05.S16");
  const coverage = marketplace.validateMarketplaceCp856UiPermissionBindingCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP856_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P04"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP28.P04.M04"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 16);
});

test("CP00-856 descriptor keeps UI permission binding rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP856_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp856UiPermissionBindingDescriptor();
  const validation = marketplace.validateMarketplaceCp856UiPermissionBindingDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp855ApiUiFoundationDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.ui_permission_binding_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-856 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-856"), true);
  assert.equal(contract.projections.cp856.descriptor, "MarketplaceCp856UiPermissionBindingDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-857 binding and coverage match the live RP28 UI fixture transition plan", () => {
  const binding = marketplace.MARKETPLACE_CP857_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-857");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P04.M05.S17");
  assert.equal(binding.last_unit_id, "RP28.P04.M06.S04");
  const coverage = marketplace.validateMarketplaceCp857UiFixtureTransitionCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP857_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P04.M05"], 6);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 4);
});

test("CP00-857 descriptor keeps UI fixture transition rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP857_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp857UiFixtureTransitionDescriptor();
  const validation = marketplace.validateMarketplaceCp857UiFixtureTransitionDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp856UiPermissionBindingDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.ui_fixture_transition_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-857 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-857"), true);
  assert.equal(contract.projections.cp857.descriptor, "MarketplaceCp857UiFixtureTransitionDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-858 binding and coverage match the live RP28 UI fixture golden-case plan", () => {
  const binding = marketplace.MARKETPLACE_CP858_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-858");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P04.M06.S05");
  assert.equal(binding.last_unit_id, "RP28.P05.M03.S08");
  const coverage = marketplace.validateMarketplaceCp858UiFixtureGoldenCaseCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP858_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P04"], 92);
  assert.equal(coverage.summary.by_phase["RP28.P05"], 58);
  assert.equal(coverage.summary.by_micro_phase["RP28.P04.M07"], 22);
  assert.equal(coverage.summary.by_micro_title["Hermes Evidence Packet"], 22);
});

test("CP00-858 descriptor keeps UI fixture golden-case rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP858_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp858UiFixtureGoldenCaseDescriptor();
  const validation = marketplace.validateMarketplaceCp858UiFixtureGoldenCaseDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp857UiFixtureTransitionDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.ui_fixture_golden_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-858 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-858"), true);
  assert.equal(contract.projections.cp858.descriptor, "MarketplaceCp858UiFixtureGoldenCaseDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-859 binding and coverage match the live RP28 fixture security test tail plan", () => {
  const binding = marketplace.MARKETPLACE_CP859_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-859");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P05.M03.S09");
  assert.equal(binding.last_unit_id, "RP28.P05.M03.S18");
  const coverage = marketplace.validateMarketplaceCp859FixtureSecurityTestCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP859_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P05"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P05.M03"], 10);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 10);
});

test("CP00-859 descriptor keeps fixture security test rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP859_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp859FixtureSecurityTestDescriptor();
  const validation = marketplace.validateMarketplaceCp859FixtureSecurityTestDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp858UiFixtureGoldenCaseDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.fixture_security_test_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-859 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-859"), true);
  assert.equal(contract.projections.cp859.descriptor, "MarketplaceCp859FixtureSecurityTestDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-860 binding and coverage match the live RP28 fixture permission matrix bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP860_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-860");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P05.M03.S19");
  assert.equal(binding.last_unit_id, "RP28.P06.M00.S06");
  const coverage = marketplace.validateMarketplaceCp860FixturePermissionMatrixBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP860_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P05"], 144);
  assert.equal(coverage.summary.by_phase["RP28.P06"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP28.P05.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M00"], 6);
  assert.equal(coverage.summary.by_micro_title["Scope Inventory"], 6);
});

test("CP00-860 descriptor keeps fixture permission matrix bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP860_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp860FixturePermissionMatrixBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp860FixturePermissionMatrixBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp859FixtureSecurityTestDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.fixture_permission_matrix_bridge_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-860 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-860"), true);
  assert.equal(contract.projections.cp860.descriptor, "MarketplaceCp860FixturePermissionMatrixBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-861 binding and coverage match the live RP28 permission decision matrix plan", () => {
  const binding = marketplace.MARKETPLACE_CP861_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-861");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P06.M00.S07");
  assert.equal(binding.last_unit_id, "RP28.P06.M07.S06");
  const coverage = marketplace.validateMarketplaceCp861PermissionDecisionMatrixCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP861_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P06"], 150);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M00"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M06"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M07"], 6);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-861 descriptor keeps permission decision matrix rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP861_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp861PermissionDecisionMatrixDescriptor();
  const validation = marketplace.validateMarketplaceCp861PermissionDecisionMatrixDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp860FixturePermissionMatrixBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.permission_decision_matrix_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-861 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-861"), true);
  assert.equal(contract.projections.cp861.descriptor, "MarketplaceCp861PermissionDecisionMatrixDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-862 binding and coverage match the live RP28 permission evidence bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP862_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-862");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P06.M07.S07");
  assert.equal(binding.last_unit_id, "RP28.P06.M09.S02");
  const coverage = marketplace.validateMarketplaceCp862PermissionDecisionEvidenceBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP862_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P06"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M07"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P06.M09"], 2);
  assert.equal(coverage.summary.by_micro_title["Hermes Evidence Packet"], 22);
});

test("CP00-862 descriptor keeps permission evidence bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP862_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp861PermissionDecisionMatrixDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.permission_decision_evidence_bridge_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-862 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-862"), true);
  assert.equal(contract.projections.cp862.descriptor, "MarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-863 binding and coverage match the live RP28 failure recovery foundation bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP863_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-863");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P06.M09.S03");
  assert.equal(binding.last_unit_id, "RP28.P07.M05.S04");
  const coverage = marketplace.validateMarketplaceCp863FailureRecoveryFoundationBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP863_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P06"], 40);
  assert.equal(coverage.summary.by_phase["RP28.P07"], 110);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M02"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M05"], 4);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 4);
});

test("CP00-863 descriptor keeps failure recovery foundation bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP863_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.failure_recovery_foundation_bridge_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-863 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-863"), true);
  assert.equal(contract.projections.cp863.descriptor, "MarketplaceCp863FailureRecoveryFoundationBridgeDescriptor");
});

test("CP00-864 binding and coverage match the live RP28 failure recovery permission audit bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP864_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-864");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P07.M05.S05");
  assert.equal(binding.last_unit_id, "RP28.P07.M05.S14");
  const coverage = marketplace.validateMarketplaceCp864FailureRecoveryPermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP864_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M05"], 10);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 10);
});

test("CP00-864 descriptor keeps failure recovery permission audit bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP864_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp863FailureRecoveryFoundationBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.failure_recovery_permission_audit_bridge_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-864 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-864"), true);
  assert.equal(contract.projections.cp864.descriptor, "MarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor");
});

test("CP00-865 binding and coverage match the live RP28 failure recovery fixture transition plan", () => {
  const binding = marketplace.MARKETPLACE_CP865_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-865");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P07.M05.S15");
  assert.equal(binding.last_unit_id, "RP28.P07.M06.S02");
  const coverage = marketplace.validateMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP865_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M05"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M06"], 2);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 8);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 2);
});

test("CP00-865 descriptor keeps failure recovery fixture transition rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP865_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.failure_recovery_fixture_transition_bridge_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-865 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-865"), true);
  assert.equal(contract.projections.cp865.descriptor, "MarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor");
});

test("CP00-866 binding and coverage match the live RP28 failure recovery evidence review bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP866_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-866");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P07.M06.S03");
  assert.equal(binding.last_unit_id, "RP28.P08.M02.S14");
  const coverage = marketplace.validateMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP866_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P07"], 106);
  assert.equal(coverage.summary.by_phase["RP28.P08"], 44);
  assert.equal(coverage.summary.by_micro_phase["RP28.P07.M06"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M02"], 14);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 20);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 14);
});

test("CP00-866 descriptor keeps failure recovery evidence review bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP866_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.failure_recovery_evidence_review_bridge_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-866 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-866"), true);
  assert.equal(contract.projections.cp866.descriptor, "MarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor");
});

test("CP00-867 binding and coverage match the live RP28 evidence review implementation bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP867_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-867");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P08.M02.S15");
  assert.equal(binding.last_unit_id, "RP28.P08.M04.S12");
  const coverage = marketplace.validateMarketplaceCp867EvidenceReviewImplementationBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP867_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P08"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M02"], 6);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M04"], 12);
});

test("CP00-867 descriptor keeps evidence review implementation bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP867_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.evidence_review_implementation_bridge_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-867 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-867"), true);
  assert.equal(contract.projections.cp867.descriptor, "MarketplaceCp867EvidenceReviewImplementationBridgeDescriptor");
});

test("CP00-868 binding and coverage match the live RP28 evidence review permission audit bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP868_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-868");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P08.M04.S13");
  assert.equal(binding.last_unit_id, "RP28.P08.M06.S08");
  const coverage = marketplace.validateMarketplaceCp868EvidenceReviewPermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP868_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P08"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M06"], 8);
});

test("CP00-868 descriptor keeps evidence review permission audit bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP868_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp867EvidenceReviewImplementationBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.evidence_review_permission_audit_bridge_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-868 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-868"), true);
  assert.equal(contract.projections.cp868.descriptor, "MarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-869 binding and coverage match the live RP28 evidence review closeout Claude bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP869_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-869");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP28.P08.M06.S09");
  assert.equal(binding.last_unit_id, "RP28.P09.M03.S22");
  const coverage = marketplace.validateMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP869_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P08"], 88);
  assert.equal(coverage.summary.by_phase["RP28.P09"], 62);
  assert.equal(coverage.summary.by_micro_phase["RP28.P08.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M03"], 22);
});

test("CP00-869 descriptor keeps evidence review closeout Claude bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP869_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.evidence_review_closeout_claude_bridge_case_set.row_count, 150);
});

test("Marketplace contract projection keeps CP00-869 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-869"), true);
  assert.equal(contract.projections.cp869.descriptor, "MarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-870 binding and coverage match the live RP28 Claude review permission audit bridge plan", () => {
  const binding = marketplace.MARKETPLACE_CP870_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-870");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP28.P09.M04.S01");
  assert.equal(binding.last_unit_id, "RP28.P09.M05.S20");
  const coverage = marketplace.validateMarketplaceCp870ClaudeReviewPermissionAuditBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP870_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P09"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M05"], 20);
});

test("CP00-870 descriptor keeps Claude review permission audit bridge rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP870_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor();
  const validation = marketplace.validateMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_review_permission_audit_bridge_case_set.row_count, 40);
});

test("Marketplace contract projection keeps CP00-870 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-870"), true);
  assert.equal(contract.projections.cp870.descriptor, "MarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-871 binding and coverage match the live RP28 Claude review fixture transition plan", () => {
  const binding = marketplace.MARKETPLACE_CP871_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-871");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP28.P09.M05.S21");
  assert.equal(binding.last_unit_id, "RP28.P09.M06.S08");
  const coverage = marketplace.validateMarketplaceCp871ClaudeReviewFixtureTransitionCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP871_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M06"], 8);
});

test("CP00-871 descriptor keeps Claude review fixture transition rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP871_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor();
  const validation = marketplace.validateMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_review_fixture_transition_case_set.row_count, 10);
});

test("Marketplace contract projection keeps CP00-871 historical", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-871"), true);
  assert.equal(contract.projections.cp871.descriptor, "MarketplaceCp871ClaudeReviewFixtureTransitionDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});

test("CP00-872 binding and coverage match the live RP28 Claude review closeout handoff plan", () => {
  const binding = marketplace.MARKETPLACE_CP872_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-872");
  assert.equal(binding.unit_count, 84);
  assert.equal(binding.first_unit_id, "RP28.P09.M06.S09");
  assert.equal(binding.last_unit_id, "RP28.P09.M10.S10");
  const coverage = marketplace.validateMarketplaceCp872ClaudeReviewCloseoutHandoffCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, marketplace.MARKETPLACE_CP872_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP28.P09"], 84);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M06"], 12);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP28.P09.M10"], 10);
});

test("CP00-872 descriptor keeps Claude review closeout handoff rows runtime-closed", () => {
  const binding = marketplace.MARKETPLACE_CP872_PACK_BINDING;
  const descriptor = marketplace.createMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor();
  const validation = marketplace.validateMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp871ClaudeReviewFixtureTransitionDescriptor");
  assert.equal(descriptor.app_submission_executed, false);
  assert.equal(descriptor.permission_decision_written, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.claude_review_closeout_handoff_case_set.row_count, 84);
});

test("Marketplace contract projection keeps CP00-872 current", () => {
  const contract = readJson("contracts/marketplace-custom-ai-apps-contract.json");
  assert.equal(contract.latest_pack.pack_id, "CP00-872");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-872"), true);
  assert.equal(contract.projections.cp872.descriptor, "MarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor");
  assert.equal(contract.validation.latest_pack_id, "CP00-872");
});
