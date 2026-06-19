import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import * as commercial from "../src/index.js";

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

test("CP00-873 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP873_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-873");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P00.M00.S01");
  assert.equal(binding.last_unit_id, "RP29.P01.M05.S13");
  const coverage = commercial.validateCommercialCp873ContractAcceptanceDomainFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP873_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P00"], 78);
  assert.equal(coverage.summary.by_phase["RP29.P01"], 72);
});

test("CP00-873 descriptor and evidence packets stay runtime-closed", () => {
  const binding = commercial.COMMERCIAL_CP873_PACK_BINDING;
  const descriptor = commercial.createCommercialCp873ContractAcceptanceDomainFoundationDescriptor();
  const validation = commercial.validateCommercialCp873ContractAcceptanceDomainFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "MarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.local_validation_claims_enterprise_trust, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.release_candidate_created, false);
  assert.equal(descriptor.deployment_run_created, false);
  assert.equal(descriptor.observability_signal_written, false);
  assert.equal(descriptor.compliance_report_generated, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.ok(descriptor.blocked_claims.includes("unverified_release"));
  assert.ok(descriptor.blocked_claims.includes("missing_observability"));
  assert.ok(descriptor.blocked_claims.includes("compliance_evidence_gap"));
  const hermes = commercial.createCommercialCp873HermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = commercial.createCommercialCp873ClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  assert.equal(claude.promotes_claude_to_final_approval, false);
  const handoff = commercial.createCommercialCp873CloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness model registry is tenant-scoped and audit-traceable", () => {
  const validation = commercial.validateCommercialModelRegistry();
  assert.deepEqual(validation.errors, []);
  assert.equal(commercial.COMMERCIAL_IMPLEMENTED_MODEL_NAMES.includes("IncidentRunbook"), true);
  assert.equal(commercial.COMMERCIAL_IMPLEMENTED_MODEL_NAMES.includes("CustomerPlan"), false);
  for (const descriptor of Object.values(commercial.COMMERCIAL_MODEL_DECLARATIONS)) {
    assert.equal(descriptor.tenant_scoped, true);
    assert.ok(descriptor.required_fields.includes("matter_trace_ref"));
    assert.ok(descriptor.references.includes("AuditEvent"));
  }
});

test("Commercial Readiness contract projection keeps CP00-873 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.program_contract.program_id, "RP29");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-873"), true);
  assert.equal(contract.projections.cp873.descriptor, "CommercialCp873ContractAcceptanceDomainFoundationDescriptor");
  assert.equal(contract.validation.valid, true);
  for (const artifact of commercial.COMMERCIAL_CP873_REQUIREMENTS.mandatory_artifacts) {
    assert.ok(contract.mandatory_artifacts.includes(artifact));
  }
});

test("CP00-874 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP874_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-874");
  assert.equal(binding.unit_count, 10);
  const coverage = commercial.validateCommercialCp874IncidentRunbookRelationshipTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP874_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P01.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP29.P01.M06"], 3);
});

test("CP00-874 descriptor closes IncidentRunbook export tail without runtime", () => {
  const binding = commercial.COMMERCIAL_CP874_PACK_BINDING;
  const descriptor = commercial.createCommercialCp874IncidentRunbookRelationshipTailDescriptor();
  const validation = commercial.validateCommercialCp874IncidentRunbookRelationshipTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp873ContractAcceptanceDomainFoundationDescriptor");
  assert.equal(descriptor.incident_runbook_activated, false);
  assert.equal(descriptor.customer_plan_mutated, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.ok(descriptor.relationship_map.IncidentRunbook.includes("AuditEvent"));
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial model registry catches invalid references and ownership drift", () => {
  const missingAudit = {
    ...commercial.COMMERCIAL_MODEL_DECLARATIONS,
    IncidentRunbook: {
      ...commercial.COMMERCIAL_MODEL_DECLARATIONS.IncidentRunbook,
      references: commercial.COMMERCIAL_MODEL_DECLARATIONS.IncidentRunbook.references.filter((ref) => ref !== "AuditEvent"),
    },
  };
  assert.equal(commercial.validateCommercialModelRegistry(missingAudit).valid, false);
  const badOwner = {
    ...commercial.COMMERCIAL_MODEL_DECLARATIONS,
    IncidentRunbook: {
      ...commercial.COMMERCIAL_MODEL_DECLARATIONS.IncidentRunbook,
      owner_program_id: "RP28",
    },
  };
  assert.equal(commercial.validateCommercialModelRegistry(badOwner).valid, false);
});

test("Commercial Readiness contract projection keeps CP00-874 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-874"), true);
  assert.equal(contract.projections.cp874.descriptor, "CommercialCp874IncidentRunbookRelationshipTailDescriptor");
  const validation = commercial.validateCommercialCp874IncidentRunbookRelationshipTailDescriptor(contract.projections.cp874, { latest_pack: commercial.COMMERCIAL_CP874_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-875 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP875_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-875");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P01.M06.S04");
  assert.equal(binding.last_unit_id, "RP29.P02.M03.S14");
  const coverage = commercial.validateCommercialCp875RelationshipServiceFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP875_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P01"], 85);
  assert.equal(coverage.summary.by_phase["RP29.P02"], 65);
});

test("CP00-875 descriptor closes relationship and service foundation without runtime", () => {
  const binding = commercial.COMMERCIAL_CP875_PACK_BINDING;
  const descriptor = commercial.createCommercialCp875RelationshipServiceFoundationDescriptor();
  const validation = commercial.validateCommercialCp875RelationshipServiceFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp874IncidentRunbookRelationshipTailDescriptor");
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, binding.next_pack_id);
  assert.equal(descriptor.release_candidate_created, false);
  assert.equal(descriptor.deployment_run_created, false);
  assert.equal(descriptor.ci_cd_pipeline_triggered, false);
  assert.equal(descriptor.deployment_executed, false);
  assert.equal(descriptor.audit_event_written, false);
  assert.equal(descriptor.service_matrix.release_candidate_creation.permission_precheck, "allowed_descriptor");
  assert.equal(descriptor.service_matrix.cross_tenant_denied.permission_precheck, "denied_descriptor");
  assert.equal(descriptor.service_matrix.unverified_release.permission_precheck, "review_required");
  assert.ok(descriptor.relationship_map.ReleaseCandidate.includes("DeploymentRun"));
  assert.ok(descriptor.required_capabilities.includes("service_entrypoint_descriptor"));
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-875 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-875"), true);
  assert.equal(contract.projections.cp875.descriptor, "CommercialCp875RelationshipServiceFoundationDescriptor");
  const validation = commercial.validateCommercialCp875RelationshipServiceFoundationDescriptor(contract.projections.cp875, { latest_pack: commercial.COMMERCIAL_CP875_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-876 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP876_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-876");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P02.M03.S15");
  assert.equal(binding.last_unit_id, "RP29.P02.M04.S02");
  const coverage = commercial.validateCommercialCp876ServiceTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP876_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M04"], 2);
});

test("CP00-876 descriptor closes approval, blocked-claim, rollback, and retry service tail", () => {
  const binding = commercial.COMMERCIAL_CP876_PACK_BINDING;
  const descriptor = commercial.createCommercialCp876ServiceTailDescriptor();
  const validation = commercial.validateCommercialCp876ServiceTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp875RelationshipServiceFoundationDescriptor");
  assert.equal(descriptor.service_matrix.approval_required.permission_precheck, "approval_required");
  assert.equal(descriptor.service_matrix.approval_required.permission_decision_written, false);
  assert.equal(descriptor.service_matrix.rollback_behavior.rollback_behavior_descriptor, true);
  assert.equal(descriptor.service_matrix.rollback_behavior.rollback_executes_now, false);
  assert.equal(descriptor.service_matrix.retry_behavior.retry_behavior_descriptor, true);
  assert.equal(descriptor.service_matrix.retry_behavior.retry_executes_now, false);
  assert.equal(descriptor.service_matrix.unsafe_deploy.permission_precheck, "review_required");
  assert.equal(descriptor.service_matrix.customer_plan_mismatch.permission_precheck, "review_required");
  assert.equal(descriptor.service_matrix.secondary_workflow.workflow_name, "secondary_compliance_review");
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-876 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-876"), true);
  assert.equal(contract.projections.cp876.descriptor, "CommercialCp876ServiceTailDescriptor");
  const validation = commercial.validateCommercialCp876ServiceTailDescriptor(contract.projections.cp876, { latest_pack: commercial.COMMERCIAL_CP876_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-877 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP877_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-877");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P02.M04.S03");
  assert.equal(binding.last_unit_id, "RP29.P02.M04.S12");
  const coverage = commercial.validateCommercialCp877SecondaryWorkflowBoundaryCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP877_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M04"], 10);
  assert.equal(coverage.summary.by_micro_title["Secondary Workflow Slice"], 10);
});

test("CP00-877 descriptor closes secondary workflow boundary without persistence", () => {
  const binding = commercial.COMMERCIAL_CP877_PACK_BINDING;
  const descriptor = commercial.createCommercialCp877SecondaryWorkflowBoundaryDescriptor();
  const validation = commercial.validateCommercialCp877SecondaryWorkflowBoundaryDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  const secondary = descriptor.service_matrix.secondary_workflow;
  assert.equal(descriptor.source_descriptor, "CommercialCp876ServiceTailDescriptor");
  assert.equal(secondary.tenant_boundary_precheck, true);
  assert.equal(secondary.matter_trace_precheck, true);
  assert.equal(secondary.audit_hint.writes_audit_event_now, false);
  assert.equal(secondary.state_transition_descriptor, "enforced_descriptor_only");
  assert.equal(secondary.idempotency_scope, "tenant_matter_action");
  assert.equal(secondary.lock_acquisition_rule, "declared_not_acquired");
  assert.equal(secondary.runtime_lock_acquired, false);
  assert.equal(secondary.persistence_boundary, "no_persistence");
  assert.equal(secondary.persists_product_state, false);
  assert.equal(secondary.writes_product_state, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-877 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-877"), true);
  assert.equal(contract.projections.cp877.descriptor, "CommercialCp877SecondaryWorkflowBoundaryDescriptor");
  const validation = commercial.validateCommercialCp877SecondaryWorkflowBoundaryDescriptor(contract.projections.cp877, { latest_pack: commercial.COMMERCIAL_CP877_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-878 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP878_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-878");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P02.M04.S13");
  assert.equal(binding.last_unit_id, "RP29.P02.M06.S08");
  const coverage = commercial.validateCommercialCp878PermissionAuditFixtureCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP878_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M04"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP29.P02.M06"], 8);
});

test("CP00-878 descriptor closes permission-audit and fixture slices without runtime", () => {
  const binding = commercial.COMMERCIAL_CP878_PACK_BINDING;
  const descriptor = commercial.createCommercialCp878PermissionAuditFixtureDescriptor();
  const validation = commercial.validateCommercialCp878PermissionAuditFixtureDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp877SecondaryWorkflowBoundaryDescriptor");
  assert.equal(descriptor.service_matrix.unverified_release.review_required_routing, true);
  assert.ok(descriptor.service_matrix.unverified_release.validation_error_mapping.some((mapping) => mapping.claim === "unverified_release" && mapping.route === "review_required"));
  assert.equal(descriptor.service_matrix.approval_required.approval_required_routing, true);
  assert.equal(descriptor.service_matrix.approval_required.permission_decision_written, false);
  assert.equal(descriptor.synthetic_fixture_matrix.permission_precheck.review_required, "review_required");
  assert.equal(descriptor.synthetic_fixture_matrix.audit_hint_precheck.writes_audit_event_now, false);
  assert.equal(descriptor.synthetic_fixture_matrix.secondary_workflow_path.secondary_workflow_path, true);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-878 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-878"), true);
  assert.equal(contract.projections.cp878.descriptor, "CommercialCp878PermissionAuditFixtureDescriptor");
  const validation = commercial.validateCommercialCp878PermissionAuditFixtureDescriptor(contract.projections.cp878, { latest_pack: commercial.COMMERCIAL_CP878_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-879 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP879_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-879");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P02.M06.S09");
  assert.equal(binding.last_unit_id, "RP29.P03.M04.S11");
  const coverage = commercial.validateCommercialCp879FixtureInterfaceBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP879_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P02"], 100);
  assert.equal(coverage.summary.by_phase["RP29.P03"], 50);
});

test("CP00-879 descriptor bridges fixture evidence to interface contract without runtime", () => {
  const binding = commercial.COMMERCIAL_CP879_PACK_BINDING;
  const descriptor = commercial.createCommercialCp879FixtureInterfaceBridgeDescriptor();
  const validation = commercial.validateCommercialCp879FixtureInterfaceBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp878PermissionAuditFixtureDescriptor");
  assert.equal(descriptor.interface_contract.descriptor_only, true);
  assert.equal(descriptor.interface_contract.runtime_execution, false);
  assert.equal(descriptor.interface_contract.serialization_guard.unauthorized_data_omitted, true);
  assert.equal(descriptor.interface_contract.api_fixture.synthetic_only, true);
  assert.equal(descriptor.interface_contract.hermes_api_evidence.emits_runtime_receipt, false);
  assert.equal(descriptor.interface_contract.claude_interface_prompt.read_only, true);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-879 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-879"), true);
  assert.equal(contract.projections.cp879.descriptor, "CommercialCp879FixtureInterfaceBridgeDescriptor");
  const validation = commercial.validateCommercialCp879FixtureInterfaceBridgeDescriptor(contract.projections.cp879, { latest_pack: commercial.COMMERCIAL_CP879_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-880 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP880_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-880");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P03.M04.S12");
  assert.equal(binding.last_unit_id, "RP29.P03.M06.S11");
  const coverage = commercial.validateCommercialCp880InterfacePermissionFixtureTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP880_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P03.M04"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP29.P03.M05"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP29.P03.M06"], 11);
});

test("CP00-880 descriptor closes interface permission fixture tail without runtime", () => {
  const binding = commercial.COMMERCIAL_CP880_PACK_BINDING;
  const descriptor = commercial.createCommercialCp880InterfacePermissionFixtureTailDescriptor();
  const validation = commercial.validateCommercialCp880InterfacePermissionFixtureTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp879FixtureInterfaceBridgeDescriptor");
  assert.equal(descriptor.interface_contract.interface_test_matrix.contract_test.runtime_execution, false);
  assert.equal(descriptor.interface_contract.interface_test_matrix.invalid_request_test.decision, "denied_descriptor");
  assert.ok(descriptor.interface_contract.interface_test_matrix.invalid_request_test.validation_errors.includes("cross_tenant_release_access"));
  assert.equal(descriptor.interface_contract.interface_test_matrix.invalid_request_test.permission_decision_written, false);
  assert.equal(descriptor.interface_contract.interface_test_matrix.invalid_request_test.audit_event_written, false);
  assert.equal(descriptor.interface_contract.interface_test_matrix.denied_response_test.denied_response_omits_unauthorized_data, true);
  assert.equal(descriptor.interface_contract.interface_test_matrix.denied_response_test.runtime_receipt_emitted, false);
  assert.equal(descriptor.interface_contract.interface_test_matrix.review_required_response_test.decision, "review_required");
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-880 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-880"), true);
  assert.equal(contract.projections.cp880.descriptor, "CommercialCp880InterfacePermissionFixtureTailDescriptor");
  const validation = commercial.validateCommercialCp880InterfacePermissionFixtureTailDescriptor(contract.projections.cp880, { latest_pack: commercial.COMMERCIAL_CP880_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-881 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP881_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-881");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P03.M06.S12");
  assert.equal(binding.last_unit_id, "RP29.P04.M04.S15");
  const coverage = commercial.validateCommercialCp881InterfaceEvidenceUiFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP881_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P03"], 77);
  assert.equal(coverage.summary.by_phase["RP29.P04"], 73);
  assert.equal(coverage.summary.by_micro_phase["RP29.P04.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-881 descriptor closes interface evidence and UI foundation without leaks", () => {
  const binding = commercial.COMMERCIAL_CP881_PACK_BINDING;
  const descriptor = commercial.createCommercialCp881InterfaceEvidenceUiFoundationDescriptor();
  const validation = commercial.validateCommercialCp881InterfaceEvidenceUiFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp880InterfacePermissionFixtureTailDescriptor");
  assert.equal(descriptor.interface_contract.runtime_execution, false);
  assert.equal(descriptor.ui_surface_matrix.descriptor_only, true);
  assert.equal(descriptor.ui_surface_matrix.runtime_execution, false);
  assert.equal(descriptor.ui_surface_matrix.denied_state.unauthorized_data_omitted, true);
  assert.equal(descriptor.ui_surface_matrix.denied_state.unauthorized_count_leak, false);
  assert.equal(descriptor.ui_surface_matrix.permission_badge.permission_decision_written, false);
  assert.equal(descriptor.ui_surface_matrix.audit_hint_display.audit_event_written, false);
  assert.equal(descriptor.ui_surface_matrix.build_smoke.executes_runtime_smoke, false);
  assert.equal(descriptor.ui_surface_matrix.hermes_ui_evidence.emits_runtime_receipt, false);
  assert.equal(descriptor.ui_surface_matrix.claude_ui_leak_prompt.read_only, true);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-881 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-881"), true);
  assert.equal(contract.projections.cp881.descriptor, "CommercialCp881InterfaceEvidenceUiFoundationDescriptor");
  const validation = commercial.validateCommercialCp881InterfaceEvidenceUiFoundationDescriptor(contract.projections.cp881, { latest_pack: commercial.COMMERCIAL_CP881_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-882 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP882_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-882");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P04.M04.S16");
  assert.equal(binding.last_unit_id, "RP29.P05.M02.S17");
  const coverage = commercial.validateCommercialCp882UiFixtureGoldenCaseBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP882_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P04"], 117);
  assert.equal(coverage.summary.by_phase["RP29.P05"], 33);
  assert.equal(coverage.summary.by_micro_phase["RP29.P05.M02"], 17);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 17);
});

test("CP00-882 descriptor bridges UI fixture golden cases without runtime", () => {
  const binding = commercial.COMMERCIAL_CP882_PACK_BINDING;
  const descriptor = commercial.createCommercialCp882UiFixtureGoldenCaseBridgeDescriptor();
  const validation = commercial.validateCommercialCp882UiFixtureGoldenCaseBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp881InterfaceEvidenceUiFoundationDescriptor");
  assert.equal(descriptor.ui_surface_matrix.runtime_execution, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.descriptor_only, true);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.runtime_execution, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.fixture_scope.real_client_data_included, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.fixture_manifest.aggregate_count_included, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.cases.cross_tenant_case.unauthorized_data_omitted, true);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.cases.cross_tenant_case.unauthorized_count_leak, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.failure_test.permission_decision_written, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.hermes_fixture_evidence.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-882 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-882"), true);
  assert.equal(contract.projections.cp882.descriptor, "CommercialCp882UiFixtureGoldenCaseBridgeDescriptor");
  const validation = commercial.validateCommercialCp882UiFixtureGoldenCaseBridgeDescriptor(contract.projections.cp882, { latest_pack: commercial.COMMERCIAL_CP882_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-883 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP883_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-883");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P05.M02.S18");
  assert.equal(binding.last_unit_id, "RP29.P05.M04.S15");
  const coverage = commercial.validateCommercialCp883UiFixtureGoldenCaseTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP883_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P05"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP29.P05.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-883 descriptor closes UI fixture golden-case tail without runtime", () => {
  const binding = commercial.COMMERCIAL_CP883_PACK_BINDING;
  const descriptor = commercial.createCommercialCp883UiFixtureGoldenCaseTailDescriptor();
  const validation = commercial.validateCommercialCp883UiFixtureGoldenCaseTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp882UiFixtureGoldenCaseBridgeDescriptor");
  assert.equal(descriptor.ui_fixture_golden_case_matrix.claude_missing_test_prompt.read_only, true);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.claude_missing_test_prompt.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.no_real_data_check.enforced, true);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.no_real_data_check.real_client_data_included, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.stable_id_check.exposes_customer_or_matter_ids, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.replay_command.executes_replay, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.replay_command.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-883 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-883"), true);
  assert.equal(contract.projections.cp883.descriptor, "CommercialCp883UiFixtureGoldenCaseTailDescriptor");
  const validation = commercial.validateCommercialCp883UiFixtureGoldenCaseTailDescriptor(contract.projections.cp883, { latest_pack: commercial.COMMERCIAL_CP883_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-884 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP884_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-884");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P05.M04.S16");
  assert.equal(binding.last_unit_id, "RP29.P05.M06.S13");
  const coverage = commercial.validateCommercialCp884UiFixturePermissionAuditSliceCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP884_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P05"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP29.P05.M05"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-884 descriptor closes UI fixture permission-audit slice without writes", () => {
  const binding = commercial.COMMERCIAL_CP884_PACK_BINDING;
  const descriptor = commercial.createCommercialCp884UiFixturePermissionAuditSliceDescriptor();
  const validation = commercial.validateCommercialCp884UiFixturePermissionAuditSliceDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp883UiFixtureGoldenCaseTailDescriptor");
  assert.equal(descriptor.ui_surface_matrix.closeout_handoff.next_ui_rows.includes("RP29.P04.M04"), false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.cases.audit_hint_case.audit_event_written, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.cases.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.hermes_fixture_evidence.emits_runtime_receipt, false);
  assert.equal(descriptor.ui_fixture_golden_case_matrix.no_real_data_check.real_client_data_included, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-884 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-884"), true);
  assert.equal(contract.projections.cp884.descriptor, "CommercialCp884UiFixturePermissionAuditSliceDescriptor");
  const validation = commercial.validateCommercialCp884UiFixturePermissionAuditSliceDescriptor(contract.projections.cp884, { latest_pack: commercial.COMMERCIAL_CP884_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-885 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP885_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-885");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P05.M06.S14");
  assert.equal(binding.last_unit_id, "RP29.P06.M03.S22");
  const coverage = commercial.validateCommercialCp885UiFixtureCloseoutPermissionFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP885_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P05"], 77);
  assert.equal(coverage.summary.by_phase["RP29.P06"], 73);
  assert.equal(coverage.summary.by_micro_phase["RP29.P06.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-885 descriptor closes UI fixture tail and permission foundation without writes", () => {
  const binding = commercial.COMMERCIAL_CP885_PACK_BINDING;
  const descriptor = commercial.createCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor();
  const validation = commercial.validateCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp884UiFixturePermissionAuditSliceDescriptor");
  const primaryRows = descriptor.ui_fixture_closeout_permission_foundation_case_set.sections["RP29.P06.M03"].rows;
  assert.equal(primaryRows.permission_matrix_row.permission_matrix_descriptor, true);
  assert.equal(primaryRows.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(primaryRows.legal_hold_interaction.legal_hold_bypassed, false);
  assert.equal(primaryRows.ethical_wall_interaction.ethical_wall_bypassed, false);
  assert.equal(primaryRows.object_acl_interaction.object_acl_bypassed, false);
  assert.equal(primaryRows.security_trimming_proof.security_trimming_omits_unauthorized_data, true);
  assert.equal(primaryRows.leak_prevention_test.cross_tenant_data_exposed, false);
  assert.equal(primaryRows.allowed_test.allowed_test_executes_runtime, false);
  assert.equal(primaryRows.denied_test.denied_test_executes_runtime, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-885 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-885"), true);
  assert.equal(contract.projections.cp885.descriptor, "CommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor");
  const validation = commercial.validateCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor(contract.projections.cp885, { latest_pack: commercial.COMMERCIAL_CP885_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-886 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP886_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-886");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P06.M04.S01");
  assert.equal(binding.last_unit_id, "RP29.P06.M04.S10");
  const coverage = commercial.validateCommercialCp886PermissionMatrixSecondaryHeadCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP886_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP29.P06.M04"], 10);
});

test("CP00-886 descriptor closes secondary permission matrix head without writes", () => {
  const binding = commercial.COMMERCIAL_CP886_PACK_BINDING;
  const descriptor = commercial.createCommercialCp886PermissionMatrixSecondaryHeadDescriptor();
  const validation = commercial.validateCommercialCp886PermissionMatrixSecondaryHeadDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor");
  const rows = descriptor.permission_matrix_secondary_head_case_set.sections["RP29.P06.M04"].rows;
  assert.equal(rows.view_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.search_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.mutation_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.export_download_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.share_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.ai_retrieval_decision_binding.decision_binding_descriptor, true);
  assert.equal(rows.matched_rule_capture.matched_rule_contains_secret, false);
  assert.equal(rows.audit_hint_fields.audit_event_body_written, false);
  assert.equal(rows.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-886 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-886"), true);
  assert.equal(contract.projections.cp886.descriptor, "CommercialCp886PermissionMatrixSecondaryHeadDescriptor");
  const validation = commercial.validateCommercialCp886PermissionMatrixSecondaryHeadDescriptor(contract.projections.cp886, { latest_pack: commercial.COMMERCIAL_CP886_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-887 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP887_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-887");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P06.M04.S11");
  assert.equal(binding.last_unit_id, "RP29.P06.M06.S06");
  const coverage = commercial.validateCommercialCp887PermissionMatrixBoundaryTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP887_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P06.M05"], 22);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
});

test("CP00-887 descriptor closes permission boundary tail without runtime or leaks", () => {
  const binding = commercial.COMMERCIAL_CP887_PACK_BINDING;
  const descriptor = commercial.createCommercialCp887PermissionMatrixBoundaryTailDescriptor();
  const validation = commercial.validateCommercialCp887PermissionMatrixBoundaryTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp886PermissionMatrixSecondaryHeadDescriptor");
  const secondaryRows = descriptor.permission_matrix_boundary_tail_case_set.sections["RP29.P06.M04"].rows;
  const bindingRows = descriptor.permission_matrix_boundary_tail_case_set.sections["RP29.P06.M05"].rows;
  assert.equal(secondaryRows.legal_hold_interaction.legal_hold_bypassed, false);
  assert.equal(secondaryRows.ethical_wall_interaction.ethical_wall_bypassed, false);
  assert.equal(secondaryRows.object_acl_interaction.object_acl_bypassed, false);
  assert.equal(secondaryRows.security_trimming_proof.security_trimming_omits_unauthorized_data, true);
  assert.equal(secondaryRows.leak_prevention_test.cross_tenant_data_exposed, false);
  assert.equal(bindingRows.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-887 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-887"), true);
  assert.equal(contract.projections.cp887.descriptor, "CommercialCp887PermissionMatrixBoundaryTailDescriptor");
  const validation = commercial.validateCommercialCp887PermissionMatrixBoundaryTailDescriptor(contract.projections.cp887, { latest_pack: commercial.COMMERCIAL_CP887_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-888 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP888_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-888");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P06.M06.S07");
  assert.equal(binding.last_unit_id, "RP29.P07.M02.S17");
  const coverage = commercial.validateCommercialCp888PermissionFailureBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP888_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P06"], 102);
  assert.equal(coverage.summary.by_phase["RP29.P07"], 48);
  assert.equal(coverage.summary.by_micro_phase["RP29.P07.M01"], 20);
});

test("CP00-888 descriptor bridges permission tail to failure recovery without runtime", () => {
  const binding = commercial.COMMERCIAL_CP888_PACK_BINDING;
  const descriptor = commercial.createCommercialCp888PermissionFailureBridgeDescriptor();
  const validation = commercial.validateCommercialCp888PermissionFailureBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp887PermissionMatrixBoundaryTailDescriptor");
  const permissionRows = descriptor.permission_failure_bridge_case_set.sections["RP29.P06.M06"].rows;
  const failureRows = descriptor.permission_failure_bridge_case_set.sections["RP29.P07.M01"].rows;
  assert.equal(permissionRows.ai_retrieval_decision_binding.decision_binding_descriptor, true);
  assert.equal(permissionRows.deny_over_allow_check.deny_over_allow_enforced, true);
  assert.equal(permissionRows.security_trimming_proof.security_trimming_omits_unauthorized_data, true);
  assert.equal(failureRows.blocked_claim_receipt.blocked_claim_receipt_descriptor, true);
  assert.equal(failureRows.hermes_failure_evidence.hermes_failure_evidence_descriptor, true);
  assert.equal(failureRows.audit_failure_hint.audit_failure_hint_omits_body, true);
  assert.equal(failureRows.rollback_expectation.rollback_executes_now, false);
  assert.equal(failureRows.compensation_expectation.compensation_executed, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-888 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-888"), true);
  assert.equal(contract.projections.cp888.descriptor, "CommercialCp888PermissionFailureBridgeDescriptor");
  const validation = commercial.validateCommercialCp888PermissionFailureBridgeDescriptor(contract.projections.cp888, { latest_pack: commercial.COMMERCIAL_CP888_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-889 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP889_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-889");
  assert.equal(binding.risk_class, "B");
  assert.equal(binding.unit_count, 40);
  assert.equal(binding.first_unit_id, "RP29.P07.M02.S18");
  assert.equal(binding.last_unit_id, "RP29.P07.M04.S15");
  const coverage = commercial.validateCommercialCp889FailureRecoverySliceCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP889_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_micro_phase["RP29.P07.M03"], 22);
  assert.equal(coverage.summary.by_micro_title["Primary Implementation Slice"], 22);
});

test("CP00-889 descriptor closes failure recovery slice without runtime", () => {
  const binding = commercial.COMMERCIAL_CP889_PACK_BINDING;
  const descriptor = commercial.createCommercialCp889FailureRecoverySliceDescriptor();
  const validation = commercial.validateCommercialCp889FailureRecoverySliceDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp888PermissionFailureBridgeDescriptor");
  const tailRows = descriptor.failure_recovery_slice_case_set.sections["RP29.P07.M02"].rows;
  const primaryRows = descriptor.failure_recovery_slice_case_set.sections["RP29.P07.M03"].rows;
  const secondaryRows = descriptor.failure_recovery_slice_case_set.sections["RP29.P07.M04"].rows;
  assert.equal(tailRows.audit_failure_hint.audit_failure_hint_omits_body, true);
  assert.equal(tailRows.hermes_failure_evidence.hermes_failure_evidence_descriptor, true);
  assert.equal(primaryRows.blocked_claim_receipt.blocked_claim_receipt_descriptor, true);
  assert.equal(primaryRows.failure_fixture.failure_fixture_descriptor, true);
  assert.equal(primaryRows.claude_edge_case_prompt.runtime_receipt_emitted, false);
  assert.equal(primaryRows.human_escalation_note.runtime_execution, false);
  assert.equal(secondaryRows.permission_denied_failure.permission_denied_is_terminal_descriptor, true);
  assert.equal(secondaryRows.compensation_expectation.compensation_executed, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-889 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-889"), true);
  assert.equal(contract.projections.cp889.descriptor, "CommercialCp889FailureRecoverySliceDescriptor");
  const validation = commercial.validateCommercialCp889FailureRecoverySliceDescriptor(contract.projections.cp889, { latest_pack: commercial.COMMERCIAL_CP889_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-890 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP890_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-890");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P07.M04.S16");
  assert.equal(binding.last_unit_id, "RP29.P08.M01.S05");
  const coverage = commercial.validateCommercialCp890FailureHermesBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP890_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P07"], 137);
  assert.equal(coverage.summary.by_phase["RP29.P08"], 13);
});

test("CP00-890 descriptor bridges failure tail to Hermes evidence without runtime receipts", () => {
  const binding = commercial.COMMERCIAL_CP890_PACK_BINDING;
  const descriptor = commercial.createCommercialCp890FailureHermesBridgeDescriptor();
  const validation = commercial.validateCommercialCp890FailureHermesBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp889FailureRecoverySliceDescriptor");
  const failureRows = descriptor.failure_hermes_bridge_case_set.sections["RP29.P07.M04"].rows;
  const hermesRows = descriptor.failure_hermes_bridge_case_set.sections["RP29.P08.M00"].rows;
  const contractRows = descriptor.failure_hermes_bridge_case_set.sections["RP29.P08.M01"].rows;
  assert.equal(failureRows.failure_fixture.failure_fixture_descriptor, true);
  assert.equal(failureRows.hermes_failure_evidence.hermes_failure_evidence_descriptor, true);
  assert.equal(hermesRows.hermes_command_matrix.hermes_command_executes_now, false);
  assert.equal(hermesRows.changed_file_receipt.changed_file_receipt_contains_secret, false);
  assert.equal(hermesRows.permission_summary_receipt.permission_summary_writes_decision, false);
  assert.equal(hermesRows.audit_summary_receipt.audit_summary_writes_event, false);
  assert.equal(contractRows.fixture_summary_receipt.fixture_summary_uses_real_data, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-890 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-890"), true);
  assert.equal(contract.projections.cp890.descriptor, "CommercialCp890FailureHermesBridgeDescriptor");
  const validation = commercial.validateCommercialCp890FailureHermesBridgeDescriptor(contract.projections.cp890, { latest_pack: commercial.COMMERCIAL_CP890_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-891 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP891_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-891");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P08.M01.S06");
  assert.equal(binding.last_unit_id, "RP29.P08.M02.S07");
  const coverage = commercial.validateCommercialCp891HermesReceiptShapeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP891_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P08"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP29.P08.M01"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP29.P08.M02"], 7);
});

test("CP00-891 descriptor closes Hermes receipt shapes without runtime writes", () => {
  const binding = commercial.COMMERCIAL_CP891_PACK_BINDING;
  const descriptor = commercial.createCommercialCp891HermesReceiptShapeDescriptor();
  const validation = commercial.validateCommercialCp891HermesReceiptShapeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp890FailureHermesBridgeDescriptor");
  const contractRows = descriptor.hermes_receipt_shape_case_set.sections["RP29.P08.M01"].rows;
  const typeRows = descriptor.hermes_receipt_shape_case_set.sections["RP29.P08.M02"].rows;
  assert.equal(contractRows.blocked_claim_receipt.blocked_claim_receipt_descriptor, true);
  assert.equal(contractRows.permission_summary_receipt.permission_summary_writes_decision, false);
  assert.equal(contractRows.audit_summary_receipt.audit_summary_writes_event, false);
  assert.equal(typeRows.hermes_command_matrix.hermes_command_executes_now, false);
  assert.equal(typeRows.changed_file_receipt.changed_file_receipt_contains_secret, false);
  assert.equal(typeRows.command_result_receipt.command_result_receipt_contains_secret, false);
  assert.equal(typeRows.fixture_summary_receipt.fixture_summary_uses_real_data, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-891 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-891"), true);
  assert.equal(contract.projections.cp891.descriptor, "CommercialCp891HermesReceiptShapeDescriptor");
  const validation = commercial.validateCommercialCp891HermesReceiptShapeDescriptor(contract.projections.cp891, { latest_pack: commercial.COMMERCIAL_CP891_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-892 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP892_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-892");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P08.M02.S08");
  assert.equal(binding.last_unit_id, "RP29.P08.M02.S17");
  const coverage = commercial.validateCommercialCp892HermesSemanticsCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP892_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P08"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP29.P08.M02"], 10);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 10);
});

test("CP00-892 descriptor closes Hermes semantics without runtime execution", () => {
  const binding = commercial.COMMERCIAL_CP892_PACK_BINDING;
  const descriptor = commercial.createCommercialCp892HermesSemanticsDescriptor();
  const validation = commercial.validateCommercialCp892HermesSemanticsDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp891HermesReceiptShapeDescriptor");
  const rows = descriptor.hermes_semantics_case_set.sections["RP29.P08.M02"].rows;
  assert.equal(rows.audit_summary_receipt.audit_summary_writes_event, false);
  assert.equal(rows.no_real_data_receipt.real_client_data_included, false);
  assert.equal(rows.claude_dependency_marker.human_final_approval_required, true);
  assert.equal(rows.human_approval_marker.human_final_approval_required, true);
  assert.equal(rows.pass_semantics.runtime_execution, false);
  assert.equal(rows.pass_with_findings_semantics.runtime_execution, false);
  assert.equal(rows.block_semantics.runtime_execution, false);
  assert.equal(rows.validation_command_check.hermes_command_executes_now, false);
  assert.equal(rows.harness_boundary_note.runtime_execution, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-892 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-892"), true);
  assert.equal(contract.projections.cp892.descriptor, "CommercialCp892HermesSemanticsDescriptor");
  const validation = commercial.validateCommercialCp892HermesSemanticsDescriptor(contract.projections.cp892, { latest_pack: commercial.COMMERCIAL_CP892_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-893 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP893_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-893");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P08.M02.S18");
  assert.equal(binding.last_unit_id, "RP29.P08.M10.S01");
  const coverage = commercial.validateCommercialCp893HermesEvidenceSweepCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP893_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P08"], 150);
  assert.equal(coverage.summary.by_micro_phase["RP29.P08.M02"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP29.P08.M10"], 1);
});

test("CP00-893 descriptor sweeps Hermes evidence rows without runtime receipts", () => {
  const binding = commercial.COMMERCIAL_CP893_PACK_BINDING;
  const descriptor = commercial.createCommercialCp893HermesEvidenceSweepDescriptor();
  const validation = commercial.validateCommercialCp893HermesEvidenceSweepDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp892HermesSemanticsDescriptor");
  const tailRows = descriptor.hermes_evidence_sweep_case_set.sections["RP29.P08.M02"].rows;
  const primaryRows = descriptor.hermes_evidence_sweep_case_set.sections["RP29.P08.M03"].rows;
  const closeoutRows = descriptor.hermes_evidence_sweep_case_set.sections["RP29.P08.M10"].rows;
  assert.equal(tailRows.closeout_handoff.runtime_execution, false);
  assert.equal(tailRows.regression_receipt.runtime_execution, false);
  assert.equal(tailRows.next_gate_readiness.human_final_approval_required, true);
  assert.equal(primaryRows.hermes_command_matrix.hermes_command_executes_now, false);
  assert.equal(primaryRows.operator_summary.real_client_data_included, false);
  assert.equal(closeoutRows.hermes_command_matrix.hermes_command_executes_now, false);
  assert.equal(descriptor.hermes_packet.emits_runtime_receipt, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-893 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-893"), true);
  assert.equal(contract.projections.cp893.descriptor, "CommercialCp893HermesEvidenceSweepDescriptor");
  const validation = commercial.validateCommercialCp893HermesEvidenceSweepDescriptor(contract.projections.cp893, { latest_pack: commercial.COMMERCIAL_CP893_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-894 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP894_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-894");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 150);
  assert.equal(binding.first_unit_id, "RP29.P08.M10.S02");
  assert.equal(binding.last_unit_id, "RP29.P09.M09.S03");
  const coverage = commercial.validateCommercialCp894ReviewScopeBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP894_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P08"], 7);
  assert.equal(coverage.summary.by_phase["RP29.P09"], 143);
  assert.equal(coverage.summary.by_micro_phase["RP29.P09.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP29.P09.M09"], 3);
});

test("CP00-894 descriptor bridges Hermes evidence tail into review-scope rows", () => {
  const binding = commercial.COMMERCIAL_CP894_PACK_BINDING;
  const descriptor = commercial.createCommercialCp894ReviewScopeBridgeDescriptor();
  const validation = commercial.validateCommercialCp894ReviewScopeBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp893HermesEvidenceSweepDescriptor");
  const hermesTailRows = descriptor.review_scope_bridge_case_set.sections["RP29.P08.M10"].rows;
  const scopeRows = descriptor.review_scope_bridge_case_set.sections["RP29.P09.M00"].rows;
  const primaryRows = descriptor.review_scope_bridge_case_set.sections["RP29.P09.M03"].rows;
  const tailRows = descriptor.review_scope_bridge_case_set.sections["RP29.P09.M09"].rows;
  assert.equal(hermesTailRows.changed_file_receipt.changed_file_receipt_contains_secret, false);
  assert.equal(hermesTailRows.permission_summary_receipt.permission_summary_writes_decision, false);
  assert.equal(scopeRows.architecture_review_questions.claude_review_question_descriptor, true);
  assert.equal(scopeRows.permission_bypass_questions.permission_bypass_question_descriptor, true);
  assert.equal(scopeRows.audit_completeness_questions.audit_completeness_question_descriptor, true);
  assert.equal(primaryRows.command_rerun.command_rerun_executes, false);
  assert.equal(tailRows.permission_bypass_questions.permission_bypass_question_descriptor, true);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-894 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-894"), true);
  assert.equal(contract.projections.cp894.descriptor, "CommercialCp894ReviewScopeBridgeDescriptor");
  const validation = commercial.validateCommercialCp894ReviewScopeBridgeDescriptor(contract.projections.cp894, { latest_pack: commercial.COMMERCIAL_CP894_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-895 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP895_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-895");
  assert.equal(binding.risk_class, "A");
  assert.equal(binding.unit_count, 10);
  assert.equal(binding.first_unit_id, "RP29.P09.M09.S04");
  assert.equal(binding.last_unit_id, "RP29.P09.M09.S13");
  const coverage = commercial.validateCommercialCp895ReviewPacketTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP895_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP29.P09.M09"], 10);
  assert.equal(coverage.summary.by_micro_title["Claude Review Packet"], 10);
});

test("CP00-895 descriptor closes review packet tail without approval drift", () => {
  const binding = commercial.COMMERCIAL_CP895_PACK_BINDING;
  const descriptor = commercial.createCommercialCp895ReviewPacketTailDescriptor();
  const validation = commercial.validateCommercialCp895ReviewPacketTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp894ReviewScopeBridgeDescriptor");
  const rows = descriptor.review_packet_tail_case_set.sections["RP29.P09.M09"].rows;
  assert.equal(rows.audit_completeness_questions.audit_completeness_question_descriptor, true);
  assert.equal(rows.missing_test_questions.missing_test_question_descriptor, true);
  assert.equal(rows.ui_leak_questions.ui_leak_question_descriptor, true);
  assert.equal(rows.downstream_readiness_questions.downstream_readiness_question_descriptor, true);
  assert.equal(rows.risk_register.risk_register_descriptor, true);
  assert.equal(rows.severity_taxonomy.severity_taxonomy_descriptor, true);
  assert.equal(rows.go_no_go_verdict_format.go_no_go_verdict_descriptor, true);
  assert.equal(rows.finding_routing_map.finding_routing_map_descriptor, true);
  assert.equal(rows.human_approval_summary.human_approval_summary_descriptor, true);
  assert.equal(rows.claude_review_packet.claude_review_packet_descriptor, true);
  assert.equal(rows.claude_review_packet.claude_is_final_approval, false);
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
});

test("Commercial Readiness contract projection keeps CP00-895 historical", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-895"), true);
  assert.equal(contract.projections.cp895.descriptor, "CommercialCp895ReviewPacketTailDescriptor");
  const validation = commercial.validateCommercialCp895ReviewPacketTailDescriptor(contract.projections.cp895, { latest_pack: commercial.COMMERCIAL_CP895_PACK_BINDING });
  assert.deepEqual(validation.errors, []);
});

test("CP00-896 binding and coverage match the live RP29 plan", () => {
  const binding = commercial.COMMERCIAL_CP896_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-896");
  assert.equal(binding.risk_class, "C");
  assert.equal(binding.unit_count, 15);
  assert.equal(binding.first_unit_id, "RP29.P09.M09.S14");
  assert.equal(binding.last_unit_id, "RP29.P09.M10.S08");
  const coverage = commercial.validateCommercialCp896ReviewCloseoutHandoffCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, commercial.COMMERCIAL_CP896_REQUIREMENTS.deliverable_counts);
  assert.equal(coverage.summary.by_phase["RP29.P09"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP29.P09.M09"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP29.P09.M10"], 8);
  assert.equal(coverage.summary.by_micro_title["Claude Review Packet"], 7);
  assert.equal(coverage.summary.by_micro_title["Closeout And Next Handoff"], 8);
});

test("CP00-896 descriptor closes review closeout and hands off to RP30", () => {
  const binding = commercial.COMMERCIAL_CP896_PACK_BINDING;
  const descriptor = commercial.createCommercialCp896ReviewCloseoutHandoffDescriptor();
  const validation = commercial.validateCommercialCp896ReviewCloseoutHandoffDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.source_descriptor, "CommercialCp895ReviewPacketTailDescriptor");
  const closeoutRows = descriptor.review_closeout_handoff_case_set.sections["RP29.P09.M09"].rows;
  const handoffRows = descriptor.review_closeout_handoff_case_set.sections["RP29.P09.M10"].rows;
  assert.equal(closeoutRows.closeout_criteria.closeout_criteria_descriptor, true);
  assert.equal(closeoutRows.pass_closeout_note.pass_closeout_note_descriptor, true);
  assert.equal(closeoutRows.pass_with_findings_closeout_note.pass_with_findings_closeout_note_descriptor, true);
  assert.equal(closeoutRows.block_closeout_note.block_closeout_note_descriptor, true);
  assert.equal(closeoutRows.next_rp_dependency.next_rp_dependency_descriptor, true);
  assert.equal(closeoutRows.documentation_update.documentation_update_descriptor, true);
  assert.equal(closeoutRows.command_rerun.command_rerun_executes, false);
  assert.equal(handoffRows.architecture_review_questions.claude_review_question_descriptor, true);
  assert.equal(handoffRows.security_review_questions.claude_review_question_descriptor, true);
  assert.equal(handoffRows.permission_bypass_questions.permission_bypass_question_descriptor, true);
  assert.equal(handoffRows.audit_completeness_questions.audit_completeness_question_descriptor, true);
  assert.equal(handoffRows.risk_register.risk_register_descriptor, true);
  assert.equal(descriptor.closeout_handoff.to_pack_id, binding.next_pack_id);
  assert.equal(descriptor.closeout_handoff.next_subphase_id, "RP30.P00.M00.S01");
  assert.equal(descriptor.claude_packet.promotes_claude_to_final_approval, false);
});

test("Commercial Readiness contract projection keeps CP00-896 current", () => {
  const contract = readJson("contracts/commercial-readiness-contract.json");
  assert.equal(contract.current_pack.pack_id, "CP00-896");
  assert.equal(contract.latest_pack.pack_id, "CP00-896");
  assert.equal(contract.historical_packs.some((pack) => pack.pack_id === "CP00-896"), true);
  assert.equal(contract.latest_projection.descriptor, "CommercialCp896ReviewCloseoutHandoffDescriptor");
  assert.equal(contract.projections.cp896.descriptor, "CommercialCp896ReviewCloseoutHandoffDescriptor");
  const validation = commercial.validateCommercialReadinessContract(contract, planPack(commercial.COMMERCIAL_CP896_PACK_BINDING));
  assert.deepEqual(validation.errors, []);
});

test("Commercial compatibility contract points to the canonical RP29 contract", () => {
  const alias = readJson("contracts/commercial-contract.json");
  assert.equal(alias.schema_version, "law-firm-os.commercial-compatibility-contract.v0.1");
  assert.equal(alias.canonical_contract_ref, "contracts/commercial-readiness-contract.json");
  assert.equal(alias.latest_pack_id, "CP00-896");
  assert.equal(alias.program_id, "RP29");
});
