import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  AI_CONTROL_RULE_IDENTIFIER_POLICY,
  AI_CONTROL_RULE_MODEL,
  AI_CONTROL_RULE_REQUIRED_FIELDS,
  AI_CONTROL_RULE_TENANT_SCOPE_POLICY,
  CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY,
  CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY,
  CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT,
  CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY,
  CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY,
  CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT,
  CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY,
  CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT,
  CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES,
  CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY,
  CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT,
  CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY,
  CONTROL_PLANE_PACKAGE_LAYOUT,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS,
  CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER,
  CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY,
  CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT,
  CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY,
  HERMES_GATE_IDENTIFIER_POLICY,
  HERMES_GATE_MATTER_TRACE_POLICY,
  HERMES_GATE_OWNERSHIP_POLICY,
  HERMES_GATE_OPTIONAL_FIELD_REGISTRY,
  HERMES_GATE_OPTIONAL_FIELDS,
  HERMES_GATE_OWNER_ROLE_VALUES,
  HERMES_GATE_PACKAGE_LAYOUT,
  HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY,
  HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS,
  HERMES_GATE_REQUIRED_FIELD_REGISTRY,
  HERMES_GATE_REQUIRED_FIELDS,
  HERMES_GATE_STATE_TRANSITION_MAP,
  HERMES_GATE_STATUS_POLICY,
  HERMES_GATE_STATUS_VALUES,
  HERMES_GATE_TENANT_SCOPE_POLICY,
  HERMES_GATE_TRANSITION_EVIDENCE_KEYS,
  HERMES_GATE_VALIDATION_HELPER,
  HUMAN_APPROVAL_IDENTIFIER_POLICY,
  HUMAN_APPROVAL_MATTER_TRACE_POLICY,
  HUMAN_APPROVAL_OWNERSHIP_POLICY,
  HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY,
  HUMAN_APPROVAL_OPTIONAL_FIELDS,
  HUMAN_APPROVAL_OWNER_ROLE_VALUES,
  HUMAN_APPROVAL_PACKAGE_LAYOUT,
  HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY,
  HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS,
  HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY,
  HUMAN_APPROVAL_REQUIRED_FIELDS,
  HUMAN_APPROVAL_STATE_TRANSITION_MAP,
  HUMAN_APPROVAL_STATUS_POLICY,
  HUMAN_APPROVAL_STATUS_VALUES,
  HUMAN_APPROVAL_TENANT_SCOPE_POLICY,
  HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS,
  HUMAN_APPROVAL_VALIDATION_HELPER,
  PRODUCT_CONTRACT_MODEL,
  PRODUCT_CONTRACT_REQUIRED_FIELDS,
  assertControlPlaneExportModelRegistryLayout,
  assertControlPlaneExportModelRegistryTenantScope,
  assertControlPlaneDomainModelCloseoutHandoffLayout,
  assertControlPlaneHermesEvidencePacketTenantScope,
  assertControlPlaneHermesEvidencePacketLayout,
  assertControlPlaneStateEnumRegistryMatterTrace,
  assertControlPlaneStateEnumRegistryStatusTransition,
  assertControlPlaneStateEnumRegistryTransitionEvidence,
  assertControlPlaneStateEnumRegistryTenantScope,
  assertControlPlaneStateEnumRegistryLayout,
  assertControlPlanePackageLayout,
  assertControlPlaneSyntheticFixtureSetLayout,
  assertControlPlaneSyntheticFixtureSetTenantScope,
  assertAIControlRuleTenantScope,
  assertClaudeReviewGateMatterTrace,
  assertClaudeReviewGatePackageLayout,
  assertClaudeReviewGateTenantScope,
  assertHermesGateMatterTrace,
  assertHermesGateStatusTransition,
  assertHermesGateTransitionEvidence,
  assertHumanApprovalStatusTransition,
  assertHumanApprovalTransitionEvidence,
  canTransitionControlPlaneStateEnumRegistryStatus,
  canTransitionHermesGateStatus,
  canTransitionHumanApprovalStatus,
  assertHermesGatePackageLayout,
  assertHermesGateTenantScope,
  assertHumanApprovalPackageLayout,
  assertHumanApprovalMatterTrace,
  assertHumanApprovalTenantScope,
  createAIControlRule,
  createProductContract,
  normalizeClaudeReviewGateId,
  normalizeClaudeReviewGateMatterId,
  normalizeClaudeReviewGateTenantId,
  normalizeHermesGateId,
  normalizeHermesGateMatterId,
  normalizeHermesGateTenantId,
  normalizeHumanApprovalId,
  normalizeHumanApprovalMatterId,
  normalizeHumanApprovalTenantId,
  normalizeAIControlRuleId,
  normalizeAIControlRuleTenantId,
  normalizeControlPlaneExportModelRegistryId,
  normalizeControlPlaneExportModelRegistryTenantId,
  normalizeControlPlaneHermesEvidencePacketId,
  normalizeControlPlaneHermesEvidencePacketTenantId,
  normalizeControlPlaneStateEnumRegistryId,
  normalizeControlPlaneStateEnumRegistryMatterId,
  normalizeControlPlaneStateEnumRegistryTenantId,
  normalizeControlPlaneSyntheticFixtureSetId,
  normalizeControlPlaneSyntheticFixtureSetTenantId,
  validateHermesGateId,
  validateClaudeReviewGateId,
  validateClaudeReviewGateMatterId,
  validateClaudeReviewGateTenantId,
  validateHermesGateMatterId,
  validateHermesGateOptionalFields,
  validateHermesGateOwnershipMetadata,
  validateHermesGateReferenceRelationships,
  validateHermesGateRequiredFields,
  validateHermesGateStatus,
  validateHermesGateTenantId,
  validateHermesGate,
  validateHumanApprovalId,
  validateHumanApprovalMatterId,
  validateHumanApprovalOptionalFields,
  validateHumanApprovalOwnershipMetadata,
  validateHumanApprovalReferenceRelationships,
  validateHumanApprovalRequiredFields,
  validateHumanApprovalStatus,
  validateHumanApprovalTenantId,
  validateHumanApproval,
  validateAIControlRuleId,
  validateAIControlRuleTenantId,
  validateControlPlaneExportModelRegistryId,
  validateControlPlaneExportModelRegistryTenantId,
  validateControlPlaneHermesEvidencePacketId,
  validateControlPlaneHermesEvidencePacketTenantId,
  validateControlPlaneStateEnumRegistryId,
  validateControlPlaneStateEnumRegistryMatterId,
  validateControlPlaneStateEnumRegistryOptionalFields,
  validateControlPlaneStateEnumRegistryOwnershipMetadata,
  validateControlPlaneStateEnumRegistryReferenceRelationships,
  validateControlPlaneStateEnumRegistryRequiredFields,
  validateControlPlaneStateEnumRegistryStatus,
  validateControlPlaneStateEnumRegistryTenantId,
  validateControlPlaneStateEnumRegistry,
  validateControlPlaneSyntheticFixtureSetId,
  validateControlPlaneSyntheticFixtureSetTenantId,
  validateAIControlRule,
  validateProductContract,
} from "../src/model.js";
import { CONTROL_PLANE_DOMAIN_MODEL_REGISTRY } from "../src/registry.js";
import {
  AI_ALLOWED_ACTION_VALUES,
  AI_CONTROL_RULE_STATUS_VALUES,
  AI_FORBIDDEN_ACTION_VALUES,
  CONTROL_PLANE_BOUNDARY_FLAGS,
  CONTROL_PLANE_ENTITY_NAMES,
  CONTROL_PLANE_LIFECYCLE_STATES,
  PRODUCT_CONTRACT_STATUS_VALUES,
  CONTROL_PLANE_REVIEW_OUTCOMES,
} from "../src/states.js";

test("control-plane package layout binds to RP00.P01.M00.S01", () => {
  assert.equal(CONTROL_PLANE_PACKAGE_LAYOUT.subphaseId, "RP00.P01.M00.S01");
  assert.equal(CONTROL_PLANE_PACKAGE_LAYOUT.sourceMicroPhaseId, "RP00.P01.M00");
  assert.equal(CONTROL_PLANE_PACKAGE_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_PACKAGE_LAYOUT.nextSubphase, "RP00.P01.M01.S01");
  assert.equal(assertControlPlanePackageLayout(), true);
});

test("control-plane package layout inventories target src, test, and fixture files", () => {
  assert.deepEqual(CONTROL_PLANE_PACKAGE_LAYOUT.directories, [
    "packages/control-plane/src",
    "packages/control-plane/test",
    "packages/control-plane/fixtures",
  ]);
  assert.deepEqual(CONTROL_PLANE_PACKAGE_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_PACKAGE_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_PACKAGE_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
});

test("control-plane synthetic fixture set layout is synthetic-only and no-write", () => {
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.subphaseId, "RP00.P01.M06.S01");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.sourceMicroPhaseId, "RP00.P01.M06");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.fixtureDirectory, "packages/control-plane/fixtures");
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.syntheticOnlyPolicySubphase, "RP00.P00.M06.S01");
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.requiredFixtureMarkers, [
    "schema_version",
    "synthetic",
    "no_real_data",
    "fixture_id",
    "tenant",
  ]);
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.allowedNamespacePrefixes, [
    "lfos_demo_",
    "synthetic_",
    "fake_",
  ]);
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.allowedDomains, [
    "example.test",
    "lawfirm-os.invalid",
  ]);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.allowedDomains.includes("example.test"), true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.noRealData, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.writesProductState, false);
  assert.deepEqual(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.futureFixtureSubphases, [
    "RP00.P01.M06.S02",
    "RP00.P01.M06.S03",
  ]);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.nextSubphase, "RP00.P01.M06.S02");
  assert.equal(assertControlPlaneSyntheticFixtureSetLayout(), true);
});

test("control-plane synthetic fixture set primary identifier is canonical and executable", () => {
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M06.S02");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M06");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.entity, "ControlPlaneSyntheticFixtureSet");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.field, "fixture_set_id");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.stablePrefix, "fs_");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.canonicalPattern, "^fs_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.layoutCompletionSubphase, "RP00.P01.M06.S01");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M06.S03");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M06.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.syntheticFixtureSetIdentifierPolicy, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY);

  assert.equal(normalizeControlPlaneSyntheticFixtureSetId(" fs_control_plane_domain_model_synthetic "), "fs_control_plane_domain_model_synthetic");
  assert.equal(validateControlPlaneSyntheticFixtureSetId("fs_control_plane_domain_model_synthetic"), true);
  assert.throws(() => validateControlPlaneSyntheticFixtureSetId(" fs_control_plane_domain_model_synthetic "), /stored without/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId("fixture_set_control_plane"), /fs_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId("FS_control_plane_domain_model_synthetic"), /fs_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId("fs_control-plane-domain-model-synthetic"), /canonical/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId("fs_control__plane"), /canonical/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId("https://example.test/fs_control_plane_domain_model_synthetic"), /fs_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId(""), /non-empty string/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetId(null), /non-empty string/);
});

test("control-plane synthetic fixture set tenant scope is canonical and fail-closed", () => {
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M06.S03");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M06");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.entity, "ControlPlaneSyntheticFixtureSet");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.required, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.identifierCompletionSubphase, "RP00.P01.M06.S02");
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.completesSyntheticFixtureSet, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M07.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.syntheticFixtureSetTenantScopePolicy, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY);

  const fixtureSet = {
    fixture_set_id: "fs_control_plane_domain_model_synthetic",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeControlPlaneSyntheticFixtureSetTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateControlPlaneSyntheticFixtureSetTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertControlPlaneSyntheticFixtureSetTenantScope(fixtureSet, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertControlPlaneSyntheticFixtureSetTenantScope(fixtureSet, "lfos_demo_tenant_layout"), true);

  assert.throws(() => validateControlPlaneSyntheticFixtureSetTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId(""), /non-empty string/);
  assert.throws(() => normalizeControlPlaneSyntheticFixtureSetTenantId(null), /non-empty string/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope({ ...fixtureSet, fixture_set_id: " fixture_set " }, { tenant_id: "lfos_demo_tenant_layout" }), /fs_/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope({ ...fixtureSet, tenant_id: " lfos_demo_tenant_layout " }, { tenant_id: "lfos_demo_tenant_layout" }), /stored without/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope({ ...fixtureSet, tenant_id: "lfos_demo_tenant_other" }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant scope context/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope(fixtureSet, null), /context/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope({ fixture_set_id: fixtureSet.fixture_set_id }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant_id/);
  assert.throws(() => assertControlPlaneSyntheticFixtureSetTenantScope(null, { tenant_id: "lfos_demo_tenant_layout" }), /fixture set object/);
});

test("control-plane state enum registry layout opens enum surfaces without claiming enum completion", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.subphaseId, "RP00.P01.M07.S01");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.registryName, "control_plane_state_enum_registry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.enumSourceFile, "packages/control-plane/src/states.js");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.registryFile, "packages/control-plane/src/registry.js");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.coveredEnumFamilies, [
    "control_plane_entity_names",
    "control_plane_lifecycle_states",
    "control_plane_review_outcomes",
    "product_contract_status_values",
    "ai_control_rule_status_values",
    "ai_allowed_action_values",
    "ai_forbidden_action_values",
    "control_plane_boundary_flags",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.enumFamilyFutureSubphaseMap, {
    control_plane_entity_names: "RP00.P01.M07.S02",
    control_plane_lifecycle_states: "RP00.P01.M07.S03",
    control_plane_review_outcomes: "RP00.P01.M07.S04",
    product_contract_status_values: "RP00.P01.M07.S05",
    ai_control_rule_status_values: "RP00.P01.M07.S06",
    ai_allowed_action_values: "RP00.P01.M07.S07",
    ai_forbidden_action_values: "RP00.P01.M07.S08",
    control_plane_boundary_flags: "RP00.P01.M07.S09",
  });
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.futureEnumSubphases.includes("RP00.P01.M07.S02"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.futureEnumSubphases.includes("RP00.P01.M07.S11"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.bindsPreexistingEnumExports, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.implementsEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.valueDefinitionScope, "binds_preexisting_enum_exports_without_creating_new_enum_values");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.boundaryFlags.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.boundaryFlags.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.nextSubphase, "RP00.P01.M07.S02");
  assert.equal(assertControlPlaneStateEnumRegistryLayout(), true);
  assert.throws(() => assertControlPlaneStateEnumRegistryLayout({
    ...CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT,
    implementsEnumValues: true,
  }), /must not claim enum value completion/);
  assert.throws(() => assertControlPlaneStateEnumRegistryLayout({
    ...CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT,
    targetFiles: ["packages/control-plane/src/model.js"],
  }), /states\.js/);
  assert.throws(() => assertControlPlaneStateEnumRegistryLayout({
    ...CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT,
    coveredEnumFamilies: ["control_plane_lifecycle_states"],
  }), /control_plane_entity_names/);
});

test("control-plane state enum registry primary identifier is canonical and executable", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M07.S02");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.field, "registry_id");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.stablePrefix, "ser_");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.canonicalPattern, "^ser_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.layoutCompletionSubphase, "RP00.P01.M07.S01");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M07.S03");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.matterTraceCompletionSubphase, "RP00.P01.M07.S04");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M07.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryIdentifierPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY);

  assert.equal(normalizeControlPlaneStateEnumRegistryId(" ser_control_plane_state_enum_registry "), "ser_control_plane_state_enum_registry");
  assert.equal(validateControlPlaneStateEnumRegistryId("ser_control_plane_state_enum_registry"), true);
  assert.throws(() => validateControlPlaneStateEnumRegistryId(" ser_control_plane_state_enum_registry "), /stored without/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId("state_enum_registry"), /ser_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId("SER_control_plane_state_enum_registry"), /ser_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId("ser-control-plane-state-enum-registry"), /ser_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId("ser_control__plane_state_enum_registry"), /canonical/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId("https://example.test/ser_control_plane_state_enum_registry"), /ser_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId(""), /non-empty string/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryId(null), /non-empty string/);
});

test("control-plane state enum registry tenant scope is canonical and fail-closed", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M07.S03");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.required, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.identifierCompletionSubphase, "RP00.P01.M07.S02");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.matterTraceCompletionSubphase, "RP00.P01.M07.S04");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M07.S04");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryTenantScopePolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY);

  const stateEnumRegistry = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeControlPlaneStateEnumRegistryTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateControlPlaneStateEnumRegistryTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertControlPlaneStateEnumRegistryTenantScope(stateEnumRegistry, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertControlPlaneStateEnumRegistryTenantScope(stateEnumRegistry, "lfos_demo_tenant_layout"), true);

  assert.throws(() => validateControlPlaneStateEnumRegistryTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId(""), /non-empty string/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryTenantId(null), /non-empty string/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope({ ...stateEnumRegistry, registry_id: " registry " }, { tenant_id: "lfos_demo_tenant_layout" }), /ser_/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope({ ...stateEnumRegistry, tenant_id: " lfos_demo_tenant_layout " }, { tenant_id: "lfos_demo_tenant_layout" }), /stored without/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope({ ...stateEnumRegistry, tenant_id: "lfos_demo_tenant_other" }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant scope context/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope(stateEnumRegistry, null), /context/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope({ registry_id: stateEnumRegistry.registry_id }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant_id/);
  assert.throws(() => assertControlPlaneStateEnumRegistryTenantScope(null, { tenant_id: "lfos_demo_tenant_layout" }), /state enum registry object/);
});

test("control-plane state enum registry Matter trace reference is nullable, canonical, and fail-closed", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.subphaseId, "RP00.P01.M07.S04");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.field, "matter_id");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.targetEntity, "Matter");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.required, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.nullableForFirmLevelRegistry, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.stablePrefix, "matter_");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.canonicalPattern, "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.requiredWhen.includes("state_enum_registry_receipt_includes_matter_scoped_enum_policy"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.identifierCompletionSubphase, "RP00.P01.M07.S02");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M07.S03");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.nextSubphase, "RP00.P01.M07.S05");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryMatterTracePolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY);

  const firmLevelRegistry = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
  };
  const matterScopedRegistry = {
    ...firmLevelRegistry,
    matter_id: "matter_demo_control_plane",
  };
  assert.equal(normalizeControlPlaneStateEnumRegistryMatterId(" matter_demo_control_plane "), "matter_demo_control_plane");
  assert.equal(normalizeControlPlaneStateEnumRegistryMatterId(null), null);
  assert.equal(normalizeControlPlaneStateEnumRegistryMatterId(undefined), null);
  assert.equal(validateControlPlaneStateEnumRegistryMatterId("matter_demo_control_plane"), true);
  assert.equal(validateControlPlaneStateEnumRegistryMatterId(null), true);
  assert.equal(validateControlPlaneStateEnumRegistryMatterId(undefined), true);
  assert.equal(assertControlPlaneStateEnumRegistryMatterTrace(firmLevelRegistry, null), true);
  assert.equal(assertControlPlaneStateEnumRegistryMatterTrace(firmLevelRegistry, { matter_id: null }), true);
  assert.equal(assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" }), true);

  assert.throws(() => validateControlPlaneStateEnumRegistryMatterId(" matter_demo_control_plane "), /stored without/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace({ ...matterScopedRegistry, matter_id: " matter_demo_control_plane " }, { matter_id: "matter_demo_control_plane" }), /stored without/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId("MATTER_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId("matter-demo-control-plane"), /matter_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId("matter_demo__control_plane"), /canonical/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId("https://example.test/matter_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId(""), /non-empty string/);
  assert.throws(() => normalizeControlPlaneStateEnumRegistryMatterId("   "), /non-empty string/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(null, null), /state enum registry object/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(42, null), /state enum registry object/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace({ registry_id: matterScopedRegistry.registry_id, matter_id: null }, null), /tenant_id/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(firmLevelRegistry, 42), /must provide matter_id/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, "matter_demo_control_plane"), /include tenant_id/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, { matter_id: "matter_demo_control_plane" }), /include tenant_id/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(firmLevelRegistry, { matter_id: "matter_demo_control_plane" }), /required when Matter trace context/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, null), /context is required/);
  assert.throws(() => assertControlPlaneStateEnumRegistryMatterTrace(matterScopedRegistry, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" }), /another tenant/);
});

test("control-plane state enum registry lifecycle status enum uses shared states and rejects unknown status", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.subphaseId, "RP00.P01.M07.S05");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.title, "Lifecycle status enum");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.field, "status");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.required, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.sourceEnum, "CONTROL_PLANE_LIFECYCLE_STATES");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES, CONTROL_PLANE_LIFECYCLE_STATES);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.enumValues, CONTROL_PLANE_LIFECYCLE_STATES);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.initialStatus, "draft");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.hermesValidatedStatus, "hermes_validated");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.claudeReviewedStatus, "claude_reviewed");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.constructionInspectedStatus, "construction_inspected");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.productionReadyStatus, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.blockedStatus, "blocked");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.terminalStatuses, ["production_ready", "blocked"]);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.transitionMapDeferredTo, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.identifierCompletionSubphase, "RP00.P01.M07.S02");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M07.S03");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.matterTraceCompletionSubphase, "RP00.P01.M07.S04");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.ownershipMetadataCompletionSubphase, "RP00.P01.M07.S06");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.nextSubphase, "RP00.P01.M07.S06");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryStatusPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY);

  for (const statusValue of CONTROL_PLANE_LIFECYCLE_STATES) {
    assert.equal(validateControlPlaneStateEnumRegistryStatus(statusValue), true);
  }
  assert.equal(validateControlPlaneStateEnumRegistryStatus("draft"), true);
  assert.equal(validateControlPlaneStateEnumRegistryStatus("production_ready"), true);
  assert.equal(validateControlPlaneStateEnumRegistryStatus("blocked"), true);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus(" draft "), /stored without/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("DRAFT"), /known lifecycle status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("production-ready"), /known lifecycle status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("approved"), /known lifecycle status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("\tdraft"), /stored without/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("draft\n"), /stored without/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus(""), /non-empty string/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus("   "), /non-empty string/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus(null), /non-empty string/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus(42), /non-empty string/);
  assert.throws(() => validateControlPlaneStateEnumRegistryStatus({ status: "draft" }), /non-empty string/);
});

test("control-plane state enum registry ownership metadata is synthetic, bounded, and cannot mutate enum values", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.subphaseId, "RP00.P01.M07.S06");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.title, "Ownership metadata");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.field, "ownership_metadata");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.fields, [
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.metadataFields, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.fields);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.ownerModule, "packages/control-plane");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES, [
    "state_enum_registry_owner",
    "control_plane_enum_steward",
    "implementation_closeout_reviewer",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.ownerRoleValues, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.defaultOwnerRole, "state_enum_registry_owner");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.correctionRouteRequired, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference.includes("ProductContract"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference.includes("AIControlRule"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference.includes("HumanApproval"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate.includes("enum_value_definitions"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate.includes("control_plane_lifecycle_states"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate.includes("human_approval_decisions"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.referenceRelationshipMapDeferredTo, "RP00.P01.M07.S07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M07.S08");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.optionalFieldRegistryDeferredTo, "RP00.P01.M07.S09");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.nextSubphase, "RP00.P01.M07.S07");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryOwnershipPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY);

  const valid = {
    owner_module: "packages/control-plane",
    owner_role: "state_enum_registry_owner",
    steward_ref: "owner.synthetic_state_enum_registry_steward",
    correction_route: "blocked_claim.state_enum_registry_ownership_correction",
    may_reference: [
      "Tenant",
      "Matter",
      "AuditEventReference",
      "BlockedClaim",
      "ProductContract",
      "AIControlRule",
      "HermesGate",
      "ClaudeReviewGate",
      "HumanApproval",
    ],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
      "enum_value_definitions",
      "control_plane_lifecycle_states",
      "product_contract_status_values",
      "ai_control_rule_status_values",
    ],
  };
  assert.equal(validateControlPlaneStateEnumRegistryOwnershipMetadata(valid), true);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, owner_module: "packages/billing" }), /owner_module/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, owner_role: "owner" }), /owner_role/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, owner_role: " state_enum_registry_owner " }), /owner_role/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, steward_ref: "OWNER.synthetic_state_enum_registry_steward" }), /steward_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, steward_ref: "owner.synthetic_state_enum_registry_steward " }), /steward_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, correction_route: "claim.state_enum_registry_ownership_correction" }), /correction_route/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, correction_route: "blocked_claim.state_enum_registry_ownership_correction " }), /correction_route/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_reference: [] }), /may_reference/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_reference: ["Tenant", "Client"] }), /may_reference/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_reference: valid.may_reference.filter((item) => item !== "ProductContract") }), /may_reference/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_not_mutate: [] }), /may_not_mutate/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_not_mutate: ["write_product_state"] }), /may_not_mutate/);
  assert.throws(
    () => validateControlPlaneStateEnumRegistryOwnershipMetadata({ ...valid, may_not_mutate: valid.may_not_mutate.filter((item) => item !== "enum_value_definitions") }),
    /may_not_mutate/,
  );
  assert.throws(() => validateControlPlaneStateEnumRegistryOwnershipMetadata(null), /object/);
});

test("control-plane state enum registry reference relationship map is canonical and reference-only", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.subphaseId, "RP00.P01.M07.S07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.status, "production_ready");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS, [
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "ProductContract",
    "AIControlRule",
    "HermesGate",
    "ClaudeReviewGate",
    "HumanApproval",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.relationshipFields, [
    "tenant_id",
    "matter_id",
    "audit_event_ref",
    "blocked_claim_refs",
    "product_contract_refs",
    "ai_control_rule_refs",
    "hermes_gate_refs",
    "claude_review_gate_refs",
    "human_approval_refs",
  ]);
  assert.deepEqual(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.targetEntities,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS,
  );
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.length, 9);

  const relationshipByField = new Map(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.map((relationship) => [relationship.field, relationship]),
  );
  assert.equal(relationshipByField.get("tenant_id").targetEntity, "Tenant");
  assert.equal(relationshipByField.get("tenant_id").sameTenantRequired, true);
  assert.equal(relationshipByField.get("matter_id").targetEntity, "Matter");
  assert.equal(relationshipByField.get("matter_id").nullableForFirmLevelRegistry, true);
  assert.equal(relationshipByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(relationshipByField.get("audit_event_ref").required, true);
  assert.equal(relationshipByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(relationshipByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(relationshipByField.get("product_contract_refs").targetEntity, "ProductContract");
  assert.equal(relationshipByField.get("product_contract_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("product_contract_refs").cannotMutateTarget, true);
  assert.equal(relationshipByField.get("ai_control_rule_refs").targetEntity, "AIControlRule");
  assert.equal(relationshipByField.get("ai_control_rule_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("ai_control_rule_refs").cannotMutateTarget, true);
  assert.equal(relationshipByField.get("hermes_gate_refs").targetEntity, "HermesGate");
  assert.equal(relationshipByField.get("hermes_gate_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("hermes_gate_refs").cannotBypassOrMutate, true);
  assert.equal(relationshipByField.get("claude_review_gate_refs").targetEntity, "ClaudeReviewGate");
  assert.equal(relationshipByField.get("claude_review_gate_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("claude_review_gate_refs").cannotBypassOrMutate, true);
  assert.equal(relationshipByField.get("human_approval_refs").targetEntity, "HumanApproval");
  assert.equal(relationshipByField.get("human_approval_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("human_approval_refs").cannotApproveOrMutate, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M07.S08");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.optionalFieldRegistryDeferredTo, "RP00.P01.M07.S09");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.nextSubphase, "RP00.P01.M07.S08");
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryReferenceRelationshipPolicy,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY,
  );

  const valid = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    audit_event_ref: "audit.synthetic.state_enum_registry.relationship_map",
    blocked_claim_refs: ["blocked_claim.state_enum_registry_ownership_correction"],
    product_contract_refs: ["pc_synthetic_product_contract_fixture"],
    ai_control_rule_refs: ["air_synthetic_implementation_handoff_rule"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };
  assert.equal(validateControlPlaneStateEnumRegistryReferenceRelationships(valid, "lfos_demo_tenant_layout"), true);
  assert.equal(
    validateControlPlaneStateEnumRegistryReferenceRelationships({
      ...valid,
      blocked_claim_refs: [],
      product_contract_refs: [],
      ai_control_rule_refs: [],
      hermes_gate_refs: [],
      claude_review_gate_refs: [],
      human_approval_refs: [],
    }),
    true,
  );
  const {
    blocked_claim_refs,
    product_contract_refs,
    ai_control_rule_refs,
    hermes_gate_refs,
    claude_review_gate_refs,
    human_approval_refs,
    ...validWithoutOptionalRefs
  } = valid;
  assert.equal(validateControlPlaneStateEnumRegistryReferenceRelationships(validWithoutOptionalRefs), true);
  assert.equal(
    validateControlPlaneStateEnumRegistryReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    true,
  );

  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, registry_id: "registry_control_plane" }), /registry_id/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships(valid, "lfos_demo_tenant_other"), /tenant scope/);
  assert.throws(
    () => validateControlPlaneStateEnumRegistryReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /Matter trace context/,
  );
  assert.throws(
    () => validateControlPlaneStateEnumRegistryReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" },
    ),
    /another tenant/,
  );
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, audit_event_ref: "audit.real.client" }), /audit_event_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, audit_event_ref: " audit.synthetic.state_enum_registry.relationship_map " }), /audit_event_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, blocked_claim_refs: ["claim.state_enum_registry"] }), /blocked_claim_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, blocked_claim_refs: ["blocked_claim.state_enum_registry "] }), /blocked_claim_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, product_contract_refs: ["contract.synthetic"] }), /product_contract_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, product_contract_refs: ["pc_synthetic_product_contract_fixture "] }), /product_contract_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, ai_control_rule_refs: ["rule.synthetic"] }), /ai_control_rule_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, ai_control_rule_refs: ["air_synthetic_implementation_handoff_rule "] }), /ai_control_rule_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, hermes_gate_refs: ["hermes_gate.real_h00"] }), /hermes_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane "] }), /hermes_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, claude_review_gate_refs: ["claude_review_gate.real_c00"] }), /claude_review_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review "] }), /claude_review_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, human_approval_refs: ["human_approval.real_decision"] }), /human_approval_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryReferenceRelationships({ ...valid, human_approval_refs: ["human_approval.synthetic_control_plane_boundary "] }), /human_approval_refs/);
});

test("control-plane state enum registry required field registry is canonical and enum-definition safe", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.subphaseId, "RP00.P01.M07.S08");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS, [
    "registry_id",
    "tenant_id",
    "status",
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
    "audit_event_ref",
  ]);
  assert.deepEqual(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.requiredFields,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS,
  );
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.fieldDefinitions.length, CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS.length);
  const fieldDefinitionByField = new Map(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  for (const field of CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS) {
    assert.equal(fieldDefinitionByField.has(field), true);
    assert.equal(fieldDefinitionByField.get(field).required, true);
  }
  assert.equal(fieldDefinitionByField.get("registry_id").sourcePolicy, "CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY");
  assert.equal(fieldDefinitionByField.get("tenant_id").targetEntity, "Tenant");
  assert.deepEqual(fieldDefinitionByField.get("status").enumValues, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES);
  assert.deepEqual(fieldDefinitionByField.get("owner_role").enumValues, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES);
  assert.deepEqual(fieldDefinitionByField.get("may_reference").allowedValues, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference);
  assert.deepEqual(fieldDefinitionByField.get("may_not_mutate").allowedValues, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate);
  assert.equal(fieldDefinitionByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(fieldDefinitionByField.get("audit_event_ref").canonicalPattern, "^audit\\.synthetic\\.[a-z0-9]+(?:[._][a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.optionalFieldsExcluded.includes("matter_id"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.optionalFieldsExcluded.includes("blocked_claim_refs"), true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.blockedClaimPatternPolicy.correctionRoutePattern, "^blocked_claim\\.[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.blockedClaimPatternPolicy.relationshipReferencePatternDeferredTo, "RP00.P01.M07.S09");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.optionalFieldRegistryDeferredTo, "RP00.P01.M07.S09");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.cannotDefineEnumValues, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY.nextSubphase, "RP00.P01.M07.S09");
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryRequiredFieldRegistry,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY,
  );

  const valid = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
    status: "draft",
    owner_module: "packages/control-plane",
    owner_role: "state_enum_registry_owner",
    steward_ref: "owner.synthetic_state_enum_registry_steward",
    correction_route: "blocked_claim.state_enum_registry_ownership_correction",
    may_reference: [...CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference],
    may_not_mutate: [...CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate],
    audit_event_ref: "audit.synthetic.state_enum_registry.required_fields",
  };
  assert.equal(validateControlPlaneStateEnumRegistryRequiredFields(valid), true);
  assert.equal(validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, status: "production_ready" }), true);
  assert.equal(validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, owner_role: "control_plane_enum_steward" }), true);

  for (const requiredField of CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS) {
    const missing = { ...valid };
    delete missing[requiredField];
    assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields(missing), new RegExp(requiredField));
  }
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields(null), /object/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields([]), /object/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, registry_id: "registry_control_plane" }), /registry_id/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, status: "approved" }), /status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, status: " draft " }), /status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, owner_module: "packages/domain" }), /owner_module/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, owner_role: "state_enum_registry_owner " }), /owner_role/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, steward_ref: "owner.real_state_enum_registry_steward" }), /steward_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, correction_route: "claim.state_enum_registry_ownership_correction" }), /correction_route/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, may_reference: ["Tenant"] }), /may_reference/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, may_reference: [...valid.may_reference, "Client"] }), /may_reference/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, may_not_mutate: ["enum_value_definitions"] }), /may_not_mutate/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, may_not_mutate: [...valid.may_not_mutate, "matter_status_values"] }), /may_not_mutate/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, audit_event_ref: "audit.real.state_enum_registry.required_fields" }), /audit_event_ref/);
  assert.throws(() => validateControlPlaneStateEnumRegistryRequiredFields({ ...valid, audit_event_ref: " audit.synthetic.state_enum_registry.required_fields " }), /audit_event_ref/);
});

test("control-plane state enum registry optional field registry is canonical, nullable, reference-only, and fail-closed", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.subphaseId, "RP00.P01.M07.S09");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS, [
    "matter_id",
    "blocked_claim_refs",
    "product_contract_refs",
    "ai_control_rule_refs",
    "hermes_gate_refs",
    "claude_review_gate_refs",
    "human_approval_refs",
  ]);
  assert.deepEqual(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.optionalFields,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS,
  );
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.length, CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS.length);
  const fieldDefinitionByField = new Map(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  for (const field of CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS) {
    assert.equal(fieldDefinitionByField.has(field), true);
    assert.equal(fieldDefinitionByField.get(field).required, false);
  }
  assert.equal(fieldDefinitionByField.get("matter_id").sourcePolicy, "CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY");
  assert.equal(fieldDefinitionByField.get("matter_id").targetEntity, "Matter");
  assert.equal(fieldDefinitionByField.get("matter_id").nullableForFirmLevelRegistry, true);
  assert.equal(fieldDefinitionByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(fieldDefinitionByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(fieldDefinitionByField.get("blocked_claim_refs").syntheticOnly, true);
  assert.equal(fieldDefinitionByField.get("product_contract_refs").targetEntity, "ProductContract");
  assert.equal(fieldDefinitionByField.get("product_contract_refs").referenceOnly, true);
  assert.equal(fieldDefinitionByField.get("product_contract_refs").cannotMutateTarget, true);
  assert.equal(fieldDefinitionByField.get("ai_control_rule_refs").targetEntity, "AIControlRule");
  assert.equal(fieldDefinitionByField.get("ai_control_rule_refs").referenceOnly, true);
  assert.equal(fieldDefinitionByField.get("ai_control_rule_refs").cannotMutateTarget, true);
  assert.equal(fieldDefinitionByField.get("hermes_gate_refs").targetEntity, "HermesGate");
  assert.equal(fieldDefinitionByField.get("hermes_gate_refs").referenceOnly, true);
  assert.equal(fieldDefinitionByField.get("hermes_gate_refs").cannotBypassOrMutate, true);
  assert.equal(fieldDefinitionByField.get("claude_review_gate_refs").targetEntity, "ClaudeReviewGate");
  assert.equal(fieldDefinitionByField.get("claude_review_gate_refs").referenceOnly, true);
  assert.equal(fieldDefinitionByField.get("claude_review_gate_refs").cannotBypassOrMutate, true);
  assert.equal(fieldDefinitionByField.get("human_approval_refs").targetEntity, "HumanApproval");
  assert.equal(fieldDefinitionByField.get("human_approval_refs").referenceOnly, true);
  assert.equal(fieldDefinitionByField.get("human_approval_refs").cannotApproveOrMutate, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.requiredFieldRegistryCompletedIn, "RP00.P01.M07.S08");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.cannotDefineEnumValues, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY.nextSubphase, "RP00.P01.M07.S10");
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryOptionalFieldRegistry,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY,
  );

  const valid = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    blocked_claim_refs: ["blocked_claim.state_enum_registry_ownership_correction"],
    product_contract_refs: ["pc_synthetic_product_contract_fixture"],
    ai_control_rule_refs: ["air_synthetic_implementation_handoff_rule"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };
  assert.equal(validateControlPlaneStateEnumRegistryOptionalFields({}), true);
  assert.equal(validateControlPlaneStateEnumRegistryOptionalFields(valid), true);
  assert.equal(validateControlPlaneStateEnumRegistryOptionalFields(valid, "lfos_demo_tenant_layout"), true);
  assert.equal(
    validateControlPlaneStateEnumRegistryOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    true,
  );
  assert.equal(
    validateControlPlaneStateEnumRegistryOptionalFields({
      registry_id: valid.registry_id,
      tenant_id: valid.tenant_id,
      blocked_claim_refs: [],
      product_contract_refs: [],
      ai_control_rule_refs: [],
      hermes_gate_refs: [],
      claude_review_gate_refs: [],
      human_approval_refs: [],
    }),
    true,
  );

  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields(null), /optional field registry input/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ status: "draft" }), /unsupported field status/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields(valid, "lfos_demo_tenant_other"), /tenant scope/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, matter_id: "matter-demo-control-plane" }), /matter_id/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, matter_id: " matter_demo_control_plane " }), /matter_id/);
  assert.throws(
    () => validateControlPlaneStateEnumRegistryOptionalFields(
      { ...valid, matter_id: null },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /matter_id is required/,
  );
  assert.throws(
    () => validateControlPlaneStateEnumRegistryOptionalFields(
      {
        registry_id: valid.registry_id,
        tenant_id: valid.tenant_id,
        blocked_claim_refs: valid.blocked_claim_refs,
      },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /matter_id is required/,
  );
  assert.throws(
    () => validateControlPlaneStateEnumRegistryOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /Matter trace context/,
  );
  assert.throws(
    () => validateControlPlaneStateEnumRegistryOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" },
    ),
    /another tenant/,
  );
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, blocked_claim_refs: "blocked_claim.state_enum_registry_ownership_correction" }), /blocked_claim_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, blocked_claim_refs: ["claim.state_enum_registry"] }), /blocked_claim_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, blocked_claim_refs: ["blocked_claim.state_enum_registry "] }), /blocked_claim_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, product_contract_refs: "pc_synthetic_product_contract_fixture" }), /product_contract_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, product_contract_refs: ["contract.synthetic"] }), /product_contract_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, product_contract_refs: ["pc_synthetic_product_contract_fixture "] }), /product_contract_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, ai_control_rule_refs: "air_synthetic_implementation_handoff_rule" }), /ai_control_rule_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, ai_control_rule_refs: ["rule.synthetic"] }), /ai_control_rule_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, ai_control_rule_refs: ["air_synthetic_implementation_handoff_rule "] }), /ai_control_rule_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, hermes_gate_refs: "hermes_gate.synthetic_h00_control_plane" }), /hermes_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, hermes_gate_refs: ["hermes_gate.real_h00"] }), /hermes_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane "] }), /hermes_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, claude_review_gate_refs: "claude_review_gate.synthetic_c00_control_plane_review" }), /claude_review_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, claude_review_gate_refs: ["claude_review_gate.real_c00"] }), /claude_review_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review "] }), /claude_review_gate_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, human_approval_refs: "human_approval.synthetic_control_plane_boundary" }), /human_approval_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, human_approval_refs: ["human_approval.real_decision"] }), /human_approval_refs/);
  assert.throws(() => validateControlPlaneStateEnumRegistryOptionalFields({ ...valid, human_approval_refs: ["human_approval.synthetic_control_plane_boundary "] }), /human_approval_refs/);
});

test("control-plane state enum registry state transition map is ordered, terminal, enum-safe, and fail-closed", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.subphaseId, "RP00.P01.M07.S10");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.statusField, "status");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.states, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.initialStatus, "draft");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.terminalStatuses, ["production_ready", "blocked"]);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.transitionEdges.length, 10);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.noSkippedGates, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.noBackwardTransitions, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.productionReadyRequiresFinalValidation, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.blockedRequiresBlockedClaim, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.terminalStatusesCannotTransition, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.guardPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.validationHelperCompletionSubphase, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.cannotDefineEnumValues, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.cannotSynthesizeHumanApproval, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.nextSubphase, "RP00.P01.M07.S11");

  const transitionByFrom = new Map(
    CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => [transition.from, transition.to]),
  );
  assert.deepEqual(transitionByFrom.get("draft"), ["implemented", "blocked"]);
  assert.deepEqual(transitionByFrom.get("implemented"), ["hermes_validated", "blocked"]);
  assert.deepEqual(transitionByFrom.get("hermes_validated"), ["claude_reviewed", "blocked"]);
  assert.deepEqual(transitionByFrom.get("claude_reviewed"), ["construction_inspected", "blocked"]);
  assert.deepEqual(transitionByFrom.get("construction_inspected"), ["production_ready", "blocked"]);
  assert.deepEqual(transitionByFrom.get("production_ready"), []);
  assert.deepEqual(transitionByFrom.get("blocked"), []);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS, [
    "implementation_evidence",
    "blocked_claim",
    "hermes_H00_evidence",
    "claude_C00_review",
    "construction_inspection",
    "final_validation_rerun",
  ]);

  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryStateTransitionMap,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP,
  );
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("draft", "implemented"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("implemented", "hermes_validated"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("hermes_validated", "claude_reviewed"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("claude_reviewed", "construction_inspected"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("draft", "blocked"), true);
  assert.equal(assertControlPlaneStateEnumRegistryStatusTransition("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("draft", "production_ready"), false);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("implemented", "claude_reviewed"), false);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("production_ready", "blocked"), false);
  assert.equal(canTransitionControlPlaneStateEnumRegistryStatus("blocked", "draft"), false);
  assert.throws(() => assertControlPlaneStateEnumRegistryStatusTransition("draft", "production_ready"), /not allowed/);
  assert.throws(() => canTransitionControlPlaneStateEnumRegistryStatus("approved", "production_ready"), /known lifecycle status/);
  assert.throws(() => canTransitionControlPlaneStateEnumRegistryStatus("draft", "approved"), /known lifecycle status/);
});

test("control-plane state enum registry validation helper validates complete records and transition evidence", () => {
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.subphaseId, "RP00.P01.M07.S11");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.sourceMicroPhaseId, "RP00.P01.M07");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.entity, "ControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.status, "production_ready");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.helperExport, "validateControlPlaneStateEnumRegistry");
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.transitionEvidenceExport, "assertControlPlaneStateEnumRegistryTransitionEvidence");
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.validatesSubphases, [
    "RP00.P01.M07.S02",
    "RP00.P01.M07.S03",
    "RP00.P01.M07.S04",
    "RP00.P01.M07.S05",
    "RP00.P01.M07.S06",
    "RP00.P01.M07.S07",
    "RP00.P01.M07.S08",
    "RP00.P01.M07.S09",
    "RP00.P01.M07.S10",
  ]);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.requiredFields, CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.optionalFields, CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS);
  assert.deepEqual(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.transitionEvidenceKeys, CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.requiredFields, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.optionalFields, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.tenantScope, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.matterTrace, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.relationshipReferences, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.transitionEvidence, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.terminalStatusProtection, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.enforcementPolicy.enumValueDefinitionMutationForbidden, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.noRealData, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.writesProductState, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.definesNewEnumValues, false);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.cannotDefineEnumValues, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.completesStateEnumRegistryModel, true);
  assert.equal(CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.nextSubphase, "RP00.P01.M08.S01");

  const valid = {
    registry_id: "ser_control_plane_state_enum_registry",
    tenant_id: "lfos_demo_tenant_layout",
    status: "production_ready",
    owner_module: "packages/control-plane",
    owner_role: "state_enum_registry_owner",
    steward_ref: "owner.synthetic_control_plane_steward",
    correction_route: "blocked_claim.state_enum_registry_ownership_correction",
    may_reference: [
      "Tenant",
      "Matter",
      "AuditEventReference",
      "BlockedClaim",
      "ProductContract",
      "AIControlRule",
      "HermesGate",
      "ClaudeReviewGate",
      "HumanApproval",
    ],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
      "enum_value_definitions",
      "control_plane_lifecycle_states",
      "product_contract_status_values",
      "ai_control_rule_status_values",
    ],
    audit_event_ref: "audit.synthetic.state_enum_registry.validation_helper",
    matter_id: null,
    blocked_claim_refs: ["blocked_claim.state_enum_registry_ownership_correction"],
    product_contract_refs: ["pc_synthetic_product_contract_fixture"],
    ai_control_rule_refs: ["air_synthetic_implementation_handoff_rule"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryValidationHelper, CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(validateControlPlaneStateEnumRegistry(valid, { tenantContext: "lfos_demo_tenant_layout" }), true);
  assert.equal(validateControlPlaneStateEnumRegistry(valid, {
    tenantContext: "lfos_demo_tenant_layout",
    fromStatus: "construction_inspected",
    evidence: { final_validation_rerun: true },
  }), true);
  assert.equal(assertControlPlaneStateEnumRegistryTransitionEvidence("construction_inspected", "production_ready", { final_validation_rerun: true }), true);
  assert.throws(() => validateControlPlaneStateEnumRegistry({ ...valid, status: "approved" }), /known lifecycle status/);
  assert.throws(() => validateControlPlaneStateEnumRegistry({ ...valid, owner_role: "approval_owner" }), /owner_role/);
  assert.throws(() => validateControlPlaneStateEnumRegistry({ ...valid, product_contract_refs: ["pc_synthetic_product_contract_fixture "] }), /product_contract_refs/);
  assert.throws(
    () => validateControlPlaneStateEnumRegistry(valid, { fromStatus: "construction_inspected", evidence: {} }),
    /final_validation_rerun/,
  );
  assert.throws(
    () => validateControlPlaneStateEnumRegistry(valid, { fromStatus: "draft", evidence: { final_validation_rerun: true } }),
    /not allowed/,
  );
  assert.throws(
    () => assertControlPlaneStateEnumRegistryTransitionEvidence("production_ready", "blocked", { blocked_claim: true }),
    /not allowed/,
  );
});

test("control-plane Hermes evidence packet layout opens packet surfaces without claiming identifier completion", () => {
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.subphaseId, "RP00.P01.M08.S01");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.sourceMicroPhaseId, "RP00.P01.M08");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.packetName, "control_plane_hermes_evidence_packet");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.expectedSurface, "ControlPlaneHermesEvidencePacket");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.packageRoot, "packages/control-plane");
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.commandReceiptFields, [
    "command",
    "exit_code",
    "purpose",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.evidenceSummaryFields, [
    "implemented_slice",
    "helper_export",
    "transition_evidence_export",
    "next_subphase",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.requiredPacketFields, [
    "packet_id",
    "tenant_id",
    "commands",
    "evidence_summary",
    "blocked_claims",
    "gate_outcome",
    "hermes_gate_ref",
    "audit_event_ref",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.relationshipTargets, [
    "Tenant",
    "AuditEventReference",
    "HermesGate",
    "BlockedClaim",
    "ProductContract",
    "AIControlRule",
    "ClaudeReviewGate",
    "HumanApproval",
  ]);
  assert.deepEqual(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.futurePacketSubphases, [
    "RP00.P01.M08.S02",
    "RP00.P01.M08.S03",
  ]);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.implementedPacketIdentifier, false);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.implementedTenantScope, false);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.doesNotMutateEntityRegistry, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.noRealData, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.writesProductState, false);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.nextSubphase, "RP00.P01.M08.S02");

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketLayout, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(assertControlPlaneHermesEvidencePacketLayout(), true);
  assert.throws(() => assertControlPlaneHermesEvidencePacketLayout({
    ...CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT,
    implementedPacketIdentifier: true,
  }), /must not claim packet identifier/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketLayout({
    ...CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT,
    targetFiles: ["packages/control-plane/src/model.js"],
  }), /registry\.js/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketLayout({
    ...CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT,
    relationshipTargets: ["Tenant"],
  }), /AuditEventReference/);
});

test("control-plane Hermes evidence packet primary identifier is canonical and executable", () => {
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M08.S02");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M08");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.surface, "ControlPlaneHermesEvidencePacket");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.field, "packet_id");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.stablePrefix, "hep_");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.canonicalPattern, "^hep_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.layoutCompletionSubphase, "RP00.P01.M08.S01");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M08.S03");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M08.S03");
  assert.equal(
    CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.requiredPacketFields.includes(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.field),
    true,
  );

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketIdentifierPolicy, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(normalizeControlPlaneHermesEvidencePacketId(" hep_rp00_h00_control_plane_evidence_packet "), "hep_rp00_h00_control_plane_evidence_packet");
  assert.equal(validateControlPlaneHermesEvidencePacketId("hep_rp00_h00_control_plane_evidence_packet"), true);
  assert.throws(() => normalizeControlPlaneHermesEvidencePacketId("rp00_h00_control_plane_evidence_packet"), /hep_/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketId("hep_RP00_h00_control_plane"), /packet_id/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketId("hep-rp00-h00-control-plane"), /hep_/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketId("hep_rp00_h00_control_plane "), /canonical form/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketId("hep_rp00__h00_control_plane"), /packet_id/);
});

test("control-plane Hermes evidence packet tenant scope is canonical and fail-closed", () => {
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M08.S03");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M08");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.entity, "ControlPlaneHermesEvidencePacket");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.required, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.identifierCompletionSubphase, "RP00.P01.M08.S02");
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.completesHermesEvidencePacket, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M09.S01");

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketTenantScopePolicy, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  const evidencePacket = {
    packet_id: "hep_rp00_h00_control_plane_evidence_packet",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeControlPlaneHermesEvidencePacketTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateControlPlaneHermesEvidencePacketTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertControlPlaneHermesEvidencePacketTenantScope(evidencePacket, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertControlPlaneHermesEvidencePacketTenantScope(evidencePacket, "lfos_demo_tenant_layout"), true);
  assert.throws(() => validateControlPlaneHermesEvidencePacketTenantId("tenant_demo_layout"), /lfos_/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketTenantId("lfos_Demo_Tenant"), /tenant_id/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketTenantId("lfos-demo-tenant"), /lfos_/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketTenantId("lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => validateControlPlaneHermesEvidencePacketTenantId("lfos_demo__tenant_layout"), /tenant_id/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketTenantScope({ ...evidencePacket, tenant_id: "lfos_demo_tenant_other" }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant scope context/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketTenantScope(evidencePacket, null), /context/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketTenantScope({ packet_id: evidencePacket.packet_id }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant_id/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketTenantScope(null, { tenant_id: "lfos_demo_tenant_layout" }), /evidence packet object/);
  assert.throws(() => assertControlPlaneHermesEvidencePacketTenantScope({ tenant_id: "lfos_demo_tenant_layout" }, { tenant_id: "lfos_demo_tenant_layout" }), /packet_id/);
});

test("control-plane export model registry layout opens package interface without claiming identifier completion", () => {
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.subphaseId, "RP00.P01.M09.S01");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.sourceMicroPhaseId, "RP00.P01.M09");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.registryName, "control_plane_export_model_registry");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.expectedSurface, "ControlPlaneExportModelRegistry");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.packageRoot, "packages/control-plane");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.packageManifest, "packages/control-plane/package.json");
  assert.deepEqual(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.exportModules, [
    "model.js",
    "states.js",
    "registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.requiredExportGroups, [
    "domain_model_definitions",
    "state_constants",
    "domain_model_registry",
    "fixture_contracts",
    "validation_helpers",
  ]);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.requiredRegistryFields.includes("hermesEvidencePacketTenantScopePolicy"), true);
  assert.deepEqual(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.futureRegistrySubphases, [
    "RP00.P01.M09.S02",
    "RP00.P01.M09.S03",
  ]);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.implementedRegistryIdentifier, false);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.implementedTenantScope, false);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.doesNotMutateEntityRegistry, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.noRealData, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.writesProductState, false);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.nextSubphase, "RP00.P01.M09.S02");

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.exportModelRegistryLayout, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(assertControlPlaneExportModelRegistryLayout(), true);
  assert.throws(() => assertControlPlaneExportModelRegistryLayout({
    ...CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT,
    implementedRegistryIdentifier: true,
  }), /must not claim identifier/);
  assert.throws(() => assertControlPlaneExportModelRegistryLayout({
    ...CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT,
    requiredRegistryFields: ["packageLayout"],
  }), /registry field/);
  assert.throws(() => assertControlPlaneExportModelRegistryLayout({
    ...CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT,
    nextSubphase: "RP00.P01.M09.S03",
  }), /RP00.P01.M09.S02/);
});

test("control-plane export model registry primary identifier is canonical and executable", () => {
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M09.S02");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M09");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.surface, "ControlPlaneExportModelRegistry");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.field, "registry_id");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.stablePrefix, "emr_");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.canonicalPattern, "^emr_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.normalization, "trim_input_then_store_canonical_value_without_case_or_separator_changes");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.layoutCompletionSubphase, "RP00.P01.M09.S01");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M09.S03");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M09.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.exportModelRegistryIdentifierPolicy, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");

  const registryId = "emr_rp00_control_plane_export_model_registry";
  assert.equal(normalizeControlPlaneExportModelRegistryId(` ${registryId} `), registryId);
  assert.equal(validateControlPlaneExportModelRegistryId(registryId), true);
  for (const invalidRegistryId of [
    "",
    "registry_rp00_control_plane_export_model_registry",
    "emr_RP00_control_plane_export_model_registry",
    "emr-rp00-control-plane-export-model-registry",
    `${registryId} `,
    "emr_rp00__control_plane_export_model_registry",
    "emr_http://example.com/registry",
  ]) {
    assert.throws(() => validateControlPlaneExportModelRegistryId(invalidRegistryId), /registry_id|emr_/);
  }
});

test("control-plane export model registry tenant scope is canonical and fail-closed", () => {
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M09.S03");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M09");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.entity, "ControlPlaneExportModelRegistry");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.identifierCompletionSubphase, "RP00.P01.M09.S02");
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.completesExportModelRegistry, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.noRealData, true);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.writesProductState, false);
  assert.equal(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M10.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.exportModelRegistryTenantScopePolicy, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");

  const exportModelRegistry = {
    registry_id: "emr_rp00_control_plane_export_model_registry",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeControlPlaneExportModelRegistryTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateControlPlaneExportModelRegistryTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertControlPlaneExportModelRegistryTenantScope(exportModelRegistry, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertControlPlaneExportModelRegistryTenantScope(exportModelRegistry, "lfos_demo_tenant_layout"), true);
  assert.throws(() => validateControlPlaneExportModelRegistryTenantId("tenant_demo_layout"), /lfos_/);
  assert.throws(() => validateControlPlaneExportModelRegistryTenantId("lfos_Demo_Tenant"), /tenant_id/);
  assert.throws(() => validateControlPlaneExportModelRegistryTenantId("lfos-demo-tenant"), /lfos_/);
  assert.throws(() => validateControlPlaneExportModelRegistryTenantId("lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => validateControlPlaneExportModelRegistryTenantId("lfos_demo__tenant_layout"), /tenant_id/);
  assert.throws(() => assertControlPlaneExportModelRegistryTenantScope({ ...exportModelRegistry, tenant_id: "lfos_demo_tenant_other" }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant scope context/);
  assert.throws(() => assertControlPlaneExportModelRegistryTenantScope(exportModelRegistry, null), /context/);
  assert.throws(() => assertControlPlaneExportModelRegistryTenantScope({ registry_id: exportModelRegistry.registry_id }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant_id/);
  assert.throws(() => assertControlPlaneExportModelRegistryTenantScope(null, { tenant_id: "lfos_demo_tenant_layout" }), /export model registry object/);
  assert.throws(() => assertControlPlaneExportModelRegistryTenantScope({ tenant_id: "lfos_demo_tenant_layout" }, { tenant_id: "lfos_demo_tenant_layout" }), /registry_id/);
});

test("control-plane domain model closeout handoff records P01 completion and P02 boundary", () => {
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.subphaseId, "RP00.P01.M10.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.sourceMicroPhaseId, "RP00.P01.M10");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.title, "Package directory layout");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.status, "production_ready");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.phaseId, "RP00.P01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.phaseTitle, "Domain Model");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.nextPhase, "RP00.P02");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.nextPhaseTitle, "Service Logic");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.completedDomainModelSubphaseCount, 51);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.length, 51);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES[0], "RP00.P01.M00.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.at(-1), "RP00.P01.M09.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.completedDomainModelSubphases, CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES);
  assert.deepEqual(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.targetFiles, [
    "contracts/control-plane-contract.json",
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.deepEqual(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.requiredModelSurfaces, [
    "ProductContract",
    "AIControlRule",
    "HermesGate",
    "ClaudeReviewGate",
    "HumanApproval",
    "ControlPlaneSyntheticFixtureSet",
    "ControlPlaneStateEnumRegistry",
    "ControlPlaneHermesEvidencePacket",
    "ControlPlaneExportModelRegistry",
  ]);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.handoffOutputs.includes("next_service_logic_boundary_recorded"), true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.uiVerificationApplicability, "not_applicable_metadata_handoff_only");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.noRealData, true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.writesProductState, false);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.doesNotMutateEntityRegistry, true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.doesNotCreateServiceLogic, true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.doesNotCloseRP00, true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.domainModelCloseoutHandoffLayout, CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(assertControlPlaneDomainModelCloseoutHandoffLayout(), true);
  assert.throws(() => assertControlPlaneDomainModelCloseoutHandoffLayout({
    ...CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT,
    completedDomainModelSubphases: CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.slice(0, -1),
  }), /RP00\.P01\.M09\.S03/);
  assert.throws(() => assertControlPlaneDomainModelCloseoutHandoffLayout({
    ...CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT,
    doesNotCreateServiceLogic: false,
  }), /metadata-only/);
  assert.throws(() => assertControlPlaneDomainModelCloseoutHandoffLayout({
    ...CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT,
    nextSubphase: "RP00.P02.M01.S01",
  }), /RP00\.P02\.M00\.S01/);
});

test("control-plane registry exposes owned entities and completed HermesGate model surface", () => {
  assert.deepEqual(CONTROL_PLANE_ENTITY_NAMES, [
    "ProductContract",
    "AIControlRule",
    "HermesGate",
    "ClaudeReviewGate",
    "HumanApproval",
    "BlockedClaim",
  ]);
  assert.deepEqual(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.map((entity) => entity.name),
    CONTROL_PLANE_ENTITY_NAMES,
  );
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.status, "production_ready");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.syntheticFixtureSetLayout, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.syntheticFixtureSetIdentifierPolicy, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.syntheticFixtureSetTenantScopePolicy, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryLayout, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryIdentifierPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryTenantScopePolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryMatterTracePolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryStatusPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryOwnershipPolicy, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY);
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryReferenceRelationshipPolicy,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryRequiredFieldRegistry,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryOptionalFieldRegistry,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY,
  );
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryStateTransitionMap, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.stateEnumRegistryValidationHelper, CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketLayout, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketIdentifierPolicy, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesEvidencePacketTenantScopePolicy, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.exportModelRegistryLayout, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.productContractModel.entity, "ProductContract");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.aiControlRuleModel.entity, "AIControlRule");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.aiControlRuleIdentifierPolicy.entity, "AIControlRule");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.aiControlRuleIdentifierPolicy.subphaseId, "RP00.P01.M02.S02");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.aiControlRuleTenantScopePolicy.entity, "AIControlRule");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.aiControlRuleTenantScopePolicy.subphaseId, "RP00.P01.M02.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGatePackageLayout.expectedEntity, "ClaudeReviewGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGatePackageLayout.subphaseId, "RP00.P01.M04.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateIdentifierPolicy.entity, "ClaudeReviewGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateIdentifierPolicy.subphaseId, "RP00.P01.M04.S02");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateTenantScopePolicy.entity, "ClaudeReviewGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateTenantScopePolicy.subphaseId, "RP00.P01.M04.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateMatterTracePolicy.entity, "ClaudeReviewGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.claudeReviewGateMatterTracePolicy.subphaseId, "RP00.P01.M04.S04");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGatePackageLayout.expectedEntity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGatePackageLayout.subphaseId, "RP00.P01.M03.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateIdentifierPolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateIdentifierPolicy.subphaseId, "RP00.P01.M03.S02");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateTenantScopePolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateTenantScopePolicy.subphaseId, "RP00.P01.M03.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateMatterTracePolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateMatterTracePolicy.subphaseId, "RP00.P01.M03.S04");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateStatusPolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateStatusPolicy.subphaseId, "RP00.P01.M03.S05");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateOwnershipPolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateOwnershipPolicy.subphaseId, "RP00.P01.M03.S06");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateReferenceRelationshipPolicy.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateReferenceRelationshipPolicy.subphaseId, "RP00.P01.M03.S07");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateRequiredFieldRegistry.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateRequiredFieldRegistry.subphaseId, "RP00.P01.M03.S08");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateOptionalFieldRegistry.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateOptionalFieldRegistry.subphaseId, "RP00.P01.M03.S09");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateStateTransitionMap.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateStateTransitionMap.subphaseId, "RP00.P01.M03.S10");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateValidationHelper.entity, "HermesGate");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.hermesGateValidationHelper.subphaseId, "RP00.P01.M03.S11");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalPackageLayout.expectedEntity, "HumanApproval");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalPackageLayout.subphaseId, "RP00.P01.M05.S01");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalIdentifierPolicy.subphaseId, "RP00.P01.M05.S02");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalTenantScopePolicy.subphaseId, "RP00.P01.M05.S03");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalMatterTracePolicy.subphaseId, "RP00.P01.M05.S04");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalStatusPolicy.subphaseId, "RP00.P01.M05.S05");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalOwnershipPolicy.subphaseId, "RP00.P01.M05.S06");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalReferenceRelationshipPolicy.subphaseId, "RP00.P01.M05.S07");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalRequiredFieldRegistry.subphaseId, "RP00.P01.M05.S08");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalOptionalFieldRegistry.subphaseId, "RP00.P01.M05.S09");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalStateTransitionMap.subphaseId, "RP00.P01.M05.S10");
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalValidationHelper.subphaseId, "RP00.P01.M05.S11");
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "ProductContract").implementedInFutureSubphase,
    false,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "AIControlRule").implementedInFutureSubphase,
    false,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "HermesGate").implementedInFutureSubphase,
    false,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "HermesGate").implementedSubphase,
    "RP00.P01.M03.S11",
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "ClaudeReviewGate").implementedInFutureSubphase,
    false,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "ClaudeReviewGate").implementedSubphase,
    "RP00.P01.M04.S04",
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "HumanApproval").implementedInFutureSubphase,
    false,
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "HumanApproval").implementedSubphase,
    "RP00.P01.M05.S11",
  );
  assert.equal(
    CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.entities.find((entity) => entity.name === "ClaudeReviewGate").tenantScoped,
    false,
  );
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nonGoals.includes("does_not_implement_full_domain_models"), true);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
});

test("ClaudeReviewGate package layout opens model surfaces without claiming model completion", () => {
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.subphaseId, "RP00.P01.M04.S01");
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.sourceMicroPhaseId, "RP00.P01.M04");
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.status, "production_ready");
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.expectedEntity, "ClaudeReviewGate");
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.implementedModel, false);
  assert.deepEqual(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.deepEqual(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.futureModelSubphases, [
    "RP00.P01.M04.S02",
    "RP00.P01.M04.S03",
    "RP00.P01.M04.S04",
  ]);
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.boundaryFlags.noRealData, true);
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.boundaryFlags.writesProductState, false);
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.noRealData, true);
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.writesProductState, false);
  assert.equal(CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT.nextSubphase, "RP00.P01.M04.S02");
  assert.equal(assertClaudeReviewGatePackageLayout(), true);
});

test("HumanApproval package layout opens model surfaces without claiming approval completion", () => {
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.subphaseId, "RP00.P01.M05.S01");
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.expectedEntity, "HumanApproval");
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.implementedModel, false);
  assert.deepEqual(HUMAN_APPROVAL_PACKAGE_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_PACKAGE_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_PACKAGE_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.futureModelSubphases.includes("RP00.P01.M05.S02"), true);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.futureModelSubphases.includes("RP00.P01.M05.S11"), true);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.boundaryFlags.noRealData, true);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.boundaryFlags.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.noRealData, true);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_PACKAGE_LAYOUT.nextSubphase, "RP00.P01.M05.S02");
  assert.equal(assertHumanApprovalPackageLayout(), true);
});

test("HumanApproval primary identifier policy is canonical and executable without approving decisions", () => {
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M05.S02");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.field, "approval_id");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.stablePrefix, "ha_");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.canonicalPattern, "^ha_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M05.S03");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.matterTraceCompletionSubphase, "RP00.P01.M05.S04");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.lifecycleCompletionSubphase, "RP00.P01.M05.S05");
  assert.equal(HUMAN_APPROVAL_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M05.S03");

  assert.equal(normalizeHumanApprovalId(" ha_rp00_non_delegable_sensitive_closeout "), "ha_rp00_non_delegable_sensitive_closeout");
  assert.equal(validateHumanApprovalId("ha_rp00_non_delegable_sensitive_closeout"), true);
  assert.throws(() => validateHumanApprovalId(" ha_rp00_non_delegable_sensitive_closeout "), /stored without/);
  assert.throws(() => normalizeHumanApprovalId("HA_rp00_non_delegable_sensitive_closeout"), /ha_/);
  assert.throws(() => normalizeHumanApprovalId("ha-rp00-non-delegable-sensitive-closeout"), /ha_/);
  assert.throws(() => normalizeHumanApprovalId("ha_RP00_non_delegable_sensitive_closeout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_rp00-non_delegable_sensitive_closeout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_rp00_"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_rp00/non_delegable_sensitive_closeout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_rp00.non_delegable_sensitive_closeout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("ha_rp00__non_delegable_sensitive_closeout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalId("https://example.test/ha_rp00_non_delegable_sensitive_closeout"), /ha_/);
  assert.throws(() => normalizeHumanApprovalId(""), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalId("   "), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalId(null), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalId(undefined), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalId(42), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalId({ approval_id: "ha_rp00_non_delegable_sensitive_closeout" }), /non-empty string/);
});

test("HumanApproval tenant scope field is required, canonical, and fail-closed", () => {
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M05.S03");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.required, true);
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.matterTraceCompletionSubphase, "RP00.P01.M05.S04");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.lifecycleCompletionSubphase, "RP00.P01.M05.S05");
  assert.equal(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M05.S04");

  const approval = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeHumanApprovalTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateHumanApprovalTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertHumanApprovalTenantScope({ ...approval }, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertHumanApprovalTenantScope({ ...approval }, "lfos_demo_tenant_layout"), true);
  assert.throws(() => validateHumanApprovalTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => assertHumanApprovalTenantScope({ ...approval, approval_id: " ha_rp00_non_delegable_sensitive_closeout " }, { tenant_id: "lfos_demo_tenant_layout" }), /stored without/);
  assert.throws(() => assertHumanApprovalTenantScope({ ...approval, tenant_id: " lfos_demo_tenant_layout " }, { tenant_id: "lfos_demo_tenant_layout" }), /stored without/);
  assert.throws(() => normalizeHumanApprovalTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeHumanApprovalTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeHumanApprovalTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeHumanApprovalTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeHumanApprovalTenantId(""), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalTenantId(null), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalTenantId(42), /non-empty string/);
  assert.throws(() => assertHumanApprovalTenantScope({ ...approval, tenant_id: "lfos_demo_tenant_other" }, { tenant_id: "lfos_demo_tenant_layout" }), /match tenant/);
  assert.throws(() => assertHumanApprovalTenantScope({ ...approval }, null), /context/);
  assert.throws(() => assertHumanApprovalTenantScope({ approval_id: approval.approval_id }, { tenant_id: "lfos_demo_tenant_layout" }), /tenant_id/);
  assert.throws(() => assertHumanApprovalTenantScope(null, { tenant_id: "lfos_demo_tenant_layout" }), /approval object/);
  assert.throws(() => assertHumanApprovalTenantScope({ tenant_id: "lfos_demo_tenant_layout" }, { tenant_id: "lfos_demo_tenant_layout" }), /approval_id/);
});

test("HumanApproval Matter trace reference is nullable, canonical, and fail-closed", () => {
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.subphaseId, "RP00.P01.M05.S04");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.field, "matter_id");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.targetEntity, "Matter");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.required, false);
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.nullableForFirmLevelApprovals, true);
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.stablePrefix, "matter_");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.canonicalPattern, "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.requiredWhen.includes("approval_request_includes_matter_scoped_scope_evidence"), true);
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.requiredWhen.includes("approval_request_includes_document_finance_external_share_portal_or_ai_output_behavior"), true);
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.lifecycleCompletionSubphase, "RP00.P01.M05.S05");
  assert.equal(HUMAN_APPROVAL_MATTER_TRACE_POLICY.nextSubphase, "RP00.P01.M05.S05");

  const firmLevelApproval = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
  };
  const matterScopedApproval = {
    ...firmLevelApproval,
    matter_id: "matter_demo_control_plane",
  };
  assert.equal(normalizeHumanApprovalMatterId(" matter_demo_control_plane "), "matter_demo_control_plane");
  assert.equal(normalizeHumanApprovalMatterId(null), null);
  assert.equal(normalizeHumanApprovalMatterId(undefined), null);
  assert.equal(validateHumanApprovalMatterId("matter_demo_control_plane"), true);
  assert.equal(validateHumanApprovalMatterId(null), true);
  assert.equal(validateHumanApprovalMatterId(undefined), true);
  assert.equal(assertHumanApprovalMatterTrace(firmLevelApproval, null), true);
  assert.equal(assertHumanApprovalMatterTrace(firmLevelApproval, { matter_id: null }), true);
  assert.equal(assertHumanApprovalMatterTrace(matterScopedApproval, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.throws(() => validateHumanApprovalMatterId(" matter_demo_control_plane "), /stored without/);
  assert.throws(() => assertHumanApprovalMatterTrace({ ...matterScopedApproval, matter_id: " matter_demo_control_plane " }, { matter_id: "matter_demo_control_plane" }), /stored without/);
  assert.throws(() => normalizeHumanApprovalMatterId("MATTER_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeHumanApprovalMatterId("matter-demo-control-plane"), /matter_/);
  assert.throws(() => normalizeHumanApprovalMatterId("matter_demo__control_plane"), /canonical/);
  assert.throws(() => normalizeHumanApprovalMatterId("https://example.test/matter_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeHumanApprovalMatterId(""), /non-empty string/);
  assert.throws(() => normalizeHumanApprovalMatterId("   "), /non-empty string/);
  assert.throws(() => assertHumanApprovalMatterTrace(null, null), /approval object/);
  assert.throws(() => assertHumanApprovalMatterTrace(42, null), /approval object/);
  assert.throws(() => assertHumanApprovalMatterTrace({ approval_id: matterScopedApproval.approval_id, matter_id: null }, null), /tenant_id/);
  assert.throws(() => assertHumanApprovalMatterTrace(firmLevelApproval, 42), /must provide matter_id/);
  assert.throws(() => assertHumanApprovalMatterTrace(matterScopedApproval, "matter_demo_control_plane"), /include tenant_id/);
  assert.throws(() => assertHumanApprovalMatterTrace(matterScopedApproval, { matter_id: "matter_demo_control_plane" }), /include tenant_id/);
  assert.throws(() => assertHumanApprovalMatterTrace(matterScopedApproval, { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => assertHumanApprovalMatterTrace(firmLevelApproval, { matter_id: "matter_demo_control_plane" }), /required when Matter trace context/);
  assert.throws(() => assertHumanApprovalMatterTrace(matterScopedApproval, null), /context is required/);
  assert.throws(() => assertHumanApprovalMatterTrace(matterScopedApproval, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" }), /another tenant/);
});

test("HumanApproval Lifecycle status enum uses shared states and rejects unknown status", () => {
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.subphaseId, "RP00.P01.M05.S05");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.field, "status");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.required, true);
  assert.deepEqual(HUMAN_APPROVAL_STATUS_VALUES, CONTROL_PLANE_LIFECYCLE_STATES);
  assert.deepEqual(HUMAN_APPROVAL_STATUS_POLICY.enumValues, HUMAN_APPROVAL_STATUS_VALUES);
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.initialStatus, "draft");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.hermesValidatedStatus, "hermes_validated");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.claudeReviewedStatus, "claude_reviewed");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.constructionInspectedStatus, "construction_inspected");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.productionReadyStatus, "production_ready");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.blockedStatus, "blocked");
  assert.deepEqual(HUMAN_APPROVAL_STATUS_POLICY.terminalStatuses, [
    "production_ready",
    "blocked",
  ]);
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.transitionMapDeferredTo, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.noRealData, true);
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_STATUS_POLICY.nextSubphase, "RP00.P01.M05.S06");

  assert.equal(validateHumanApprovalStatus("draft"), true);
  assert.equal(validateHumanApprovalStatus("implemented"), true);
  assert.equal(validateHumanApprovalStatus("hermes_validated"), true);
  assert.equal(validateHumanApprovalStatus("claude_reviewed"), true);
  assert.equal(validateHumanApprovalStatus("construction_inspected"), true);
  assert.equal(validateHumanApprovalStatus("production_ready"), true);
  assert.equal(validateHumanApprovalStatus("blocked"), true);
  assert.throws(() => validateHumanApprovalStatus(" draft "), /stored without/);
  assert.throws(() => validateHumanApprovalStatus("DRAFT"), /known lifecycle status/);
  assert.throws(() => validateHumanApprovalStatus("human-approved"), /known lifecycle status/);
  assert.throws(() => validateHumanApprovalStatus("approved"), /known lifecycle status/);
  assert.throws(() => validateHumanApprovalStatus(""), /non-empty string/);
  assert.throws(() => validateHumanApprovalStatus(null), /non-empty string/);
  assert.throws(() => validateHumanApprovalStatus(42), /non-empty string/);
});

test("HumanApproval ownership metadata is synthetic, bounded, and cannot approve decisions", () => {
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.subphaseId, "RP00.P01.M05.S06");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.status, "production_ready");
  assert.deepEqual(HUMAN_APPROVAL_OWNERSHIP_POLICY.fields, [
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_OWNERSHIP_POLICY.metadataFields, HUMAN_APPROVAL_OWNERSHIP_POLICY.fields);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.ownerModule, "packages/control-plane");
  assert.deepEqual(HUMAN_APPROVAL_OWNER_ROLE_VALUES, [
    "human_approval_process_owner",
    "risk_approval_steward",
    "implementation_closeout_reviewer",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_OWNERSHIP_POLICY.ownerRoleValues, HUMAN_APPROVAL_OWNER_ROLE_VALUES);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.defaultOwnerRole, "human_approval_process_owner");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.correctionRouteRequired, true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.mayReference.includes("BlockedClaim"), true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.mayReference.includes("HermesGate"), true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.mayReference.includes("ClaudeReviewGate"), true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate.includes("human_approval_decisions"), true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate.includes("human_approval_actor_identity"), true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.referenceRelationshipMapDeferredTo, "RP00.P01.M05.S07");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M05.S08");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.noRealData, true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_OWNERSHIP_POLICY.nextSubphase, "RP00.P01.M05.S07");

  const valid = {
    owner_module: "packages/control-plane",
    owner_role: "human_approval_process_owner",
    steward_ref: "owner.synthetic_human_approval_steward",
    correction_route: "blocked_claim.human_approval_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HermesGate", "ClaudeReviewGate"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
      "human_approval_actor_identity",
    ],
  };
  assert.equal(validateHumanApprovalOwnershipMetadata(valid), true);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, owner_module: "packages/billing" }), /owner_module/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, owner_role: "owner" }), /owner_role/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, owner_role: " human_approval_process_owner " }), /owner_role/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, steward_ref: "OWNER.synthetic_human_approval_steward" }), /steward_ref/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, steward_ref: "owner.synthetic_human_approval_steward " }), /steward_ref/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, correction_route: "claim.human_approval_ownership_correction" }), /correction_route/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, correction_route: "blocked_claim.human_approval_ownership_correction " }), /correction_route/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, may_reference: [] }), /may_reference/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, may_reference: ["Tenant", "Client"] }), /may_reference/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HermesGate"] }), /may_reference/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, may_not_mutate: [] }), /may_not_mutate/);
  assert.throws(() => validateHumanApprovalOwnershipMetadata({ ...valid, may_not_mutate: ["approve_human_gate"] }), /may_not_mutate/);
  assert.throws(
    () => validateHumanApprovalOwnershipMetadata({ ...valid, may_not_mutate: valid.may_not_mutate.filter((item) => item !== "human_approval_decisions") }),
    /may_not_mutate/,
  );
  assert.throws(() => validateHumanApprovalOwnershipMetadata(null), /object/);
});

test("HumanApproval reference relationship map is canonical and cannot approve gates", () => {
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.subphaseId, "RP00.P01.M05.S07");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.status, "production_ready");
  assert.deepEqual(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS, [
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "HermesGate",
    "ClaudeReviewGate",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.relationshipFields, [
    "tenant_id",
    "matter_id",
    "audit_event_ref",
    "blocked_claim_refs",
    "hermes_gate_refs",
    "claude_review_gate_refs",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.targetEntities, HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS);
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.length, 6);

  const relationshipByField = new Map(
    HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.map((relationship) => [relationship.field, relationship]),
  );
  assert.equal(relationshipByField.get("tenant_id").targetEntity, "Tenant");
  assert.equal(relationshipByField.get("tenant_id").sameTenantRequired, true);
  assert.equal(relationshipByField.get("matter_id").targetEntity, "Matter");
  assert.equal(relationshipByField.get("matter_id").nullableForFirmLevelApprovals, true);
  assert.equal(relationshipByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(relationshipByField.get("audit_event_ref").required, true);
  assert.equal(relationshipByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(relationshipByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(relationshipByField.get("hermes_gate_refs").targetEntity, "HermesGate");
  assert.equal(relationshipByField.get("hermes_gate_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("hermes_gate_refs").cannotApproveOrMutate, true);
  assert.equal(relationshipByField.get("claude_review_gate_refs").targetEntity, "ClaudeReviewGate");
  assert.equal(relationshipByField.get("claude_review_gate_refs").referenceOnly, true);
  assert.equal(relationshipByField.get("claude_review_gate_refs").cannotApproveOrMutate, true);
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M05.S08");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.optionalFieldRegistryDeferredTo, "RP00.P01.M05.S09");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.noRealData, true);
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY.nextSubphase, "RP00.P01.M05.S08");

  const valid = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    audit_event_ref: "audit.synthetic.human_approval.relationship_map",
    blocked_claim_refs: ["blocked_claim.human_approval_ownership_correction"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
  };
  assert.equal(validateHumanApprovalReferenceRelationships(valid, "lfos_demo_tenant_layout"), true);
  assert.equal(validateHumanApprovalReferenceRelationships({ ...valid, blocked_claim_refs: [], hermes_gate_refs: [], claude_review_gate_refs: [] }), true);
  const { blocked_claim_refs, hermes_gate_refs, claude_review_gate_refs, ...validWithoutOptionalRefs } = valid;
  assert.equal(validateHumanApprovalReferenceRelationships(validWithoutOptionalRefs), true);
  assert.equal(
    validateHumanApprovalReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    true,
  );

  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, approval_id: "human_approval_1" }), /approval_id/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateHumanApprovalReferenceRelationships(valid, "lfos_demo_tenant_other"), /tenant scope/);
  assert.throws(
    () => validateHumanApprovalReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /Matter trace context/,
  );
  assert.throws(
    () => validateHumanApprovalReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" },
    ),
    /another tenant/,
  );
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, audit_event_ref: "audit.real.client" }), /audit_event_ref/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, audit_event_ref: " audit.synthetic.human_approval.relationship_map " }), /audit_event_ref/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, blocked_claim_refs: ["claim.human_approval"] }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, blocked_claim_refs: ["blocked_claim.human_approval "] }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, hermes_gate_refs: ["hermes_gate.real_h00"] }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane "] }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, claude_review_gate_refs: ["claude_review_gate.real_c00"] }), /claude_review_gate_refs/);
  assert.throws(() => validateHumanApprovalReferenceRelationships({ ...valid, claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review "] }), /claude_review_gate_refs/);
});

test("HumanApproval required field registry is canonical and cannot synthesize approvals", () => {
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.subphaseId, "RP00.P01.M05.S08");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(HUMAN_APPROVAL_REQUIRED_FIELDS, [
    "approval_id",
    "tenant_id",
    "status",
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
    "audit_event_ref",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.requiredFields, HUMAN_APPROVAL_REQUIRED_FIELDS);
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.fieldDefinitions.length, HUMAN_APPROVAL_REQUIRED_FIELDS.length);

  const definitionByField = new Map(
    HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  assert.equal(definitionByField.get("approval_id").sourcePolicy, "HUMAN_APPROVAL_IDENTIFIER_POLICY");
  assert.equal(definitionByField.get("tenant_id").targetEntity, "Tenant");
  assert.deepEqual(definitionByField.get("status").enumValues, HUMAN_APPROVAL_STATUS_VALUES);
  assert.deepEqual(definitionByField.get("owner_role").enumValues, HUMAN_APPROVAL_OWNER_ROLE_VALUES);
  assert.deepEqual(definitionByField.get("may_reference").allowedValues, HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS);
  assert.deepEqual(definitionByField.get("may_not_mutate").allowedValues, HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate);
  assert.equal(definitionByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(definitionByField.has("matter_id"), false);
  assert.equal(definitionByField.has("blocked_claim_refs"), false);
  assert.equal(definitionByField.has("hermes_gate_refs"), false);
  assert.equal(definitionByField.has("claude_review_gate_refs"), false);
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.blockedClaimPatternPolicy.relationshipReferencePatternDeferredTo, "RP00.P01.M05.S09");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.optionalFieldRegistryDeferredTo, "RP00.P01.M05.S09");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.noRealData, true);
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY.nextSubphase, "RP00.P01.M05.S09");

  const valid = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
    status: "draft",
    owner_module: "packages/control-plane",
    owner_role: "human_approval_process_owner",
    steward_ref: "owner.synthetic_human_approval_steward",
    correction_route: "blocked_claim.human_approval_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HermesGate", "ClaudeReviewGate"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
      "human_approval_actor_identity",
    ],
    audit_event_ref: "audit.synthetic.human_approval.required_fields",
  };
  const { audit_event_ref, ...missingAuditEventRef } = valid;
  assert.equal(validateHumanApprovalRequiredFields(valid), true);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, approval_id: undefined }), /approval_id/);
  assert.throws(() => validateHumanApprovalRequiredFields(missingAuditEventRef), /audit_event_ref/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, status: "approved" }), /status/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, owner_role: "owner" }), /owner_role/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, correction_route: "blocked_claim.human.approval" }), /correction_route/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, may_reference: [] }), /may_reference/);
  assert.throws(
    () => validateHumanApprovalRequiredFields({ ...valid, may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HermesGate"] }),
    /may_reference/,
  );
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, may_not_mutate: ["write_product_state"] }), /may_not_mutate/);
  assert.throws(
    () => validateHumanApprovalRequiredFields({ ...valid, may_not_mutate: valid.may_not_mutate.filter((item) => item !== "human_approval_decisions") }),
    /may_not_mutate/,
  );
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, audit_event_ref: "audit.real.client" }), /audit_event_ref/);
  assert.throws(() => validateHumanApprovalRequiredFields({ ...valid, audit_event_ref: " audit.synthetic.human_approval.required_fields " }), /audit_event_ref/);
  assert.throws(() => validateHumanApprovalRequiredFields(null), /object/);
});

test("HumanApproval optional field registry is canonical, nullable, reference-only, and fail-closed", () => {
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.subphaseId, "RP00.P01.M05.S09");
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(HUMAN_APPROVAL_OPTIONAL_FIELDS, [
    "matter_id",
    "blocked_claim_refs",
    "hermes_gate_refs",
    "claude_review_gate_refs",
  ]);
  assert.deepEqual(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.optionalFields, HUMAN_APPROVAL_OPTIONAL_FIELDS);
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.length, HUMAN_APPROVAL_OPTIONAL_FIELDS.length);

  const definitionByField = new Map(
    HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  assert.equal(definitionByField.get("matter_id").sourcePolicy, "HUMAN_APPROVAL_MATTER_TRACE_POLICY");
  assert.equal(definitionByField.get("matter_id").targetEntity, "Matter");
  assert.equal(definitionByField.get("matter_id").nullableForFirmLevelApprovals, true);
  assert.equal(definitionByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(definitionByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(definitionByField.get("hermes_gate_refs").targetEntity, "HermesGate");
  assert.equal(definitionByField.get("hermes_gate_refs").referenceOnly, true);
  assert.equal(definitionByField.get("hermes_gate_refs").cannotApproveOrMutate, true);
  assert.equal(definitionByField.get("claude_review_gate_refs").targetEntity, "ClaudeReviewGate");
  assert.equal(definitionByField.get("claude_review_gate_refs").referenceOnly, true);
  assert.equal(definitionByField.get("claude_review_gate_refs").cannotApproveOrMutate, true);
  assert.equal(definitionByField.has("approval_id"), false);
  assert.equal(definitionByField.has("tenant_id"), false);
  assert.equal(definitionByField.has("status"), false);
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.requiredFieldRegistryCompletedIn, "RP00.P01.M05.S08");
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.noRealData, true);
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY.nextSubphase, "RP00.P01.M05.S10");

  const valid = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    blocked_claim_refs: ["blocked_claim.human_approval_ownership_correction"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
  };
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalOptionalFieldRegistry, HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(validateHumanApprovalOptionalFields({}), true);
  assert.equal(validateHumanApprovalOptionalFields(valid), true);
  assert.equal(validateHumanApprovalOptionalFields(valid, "lfos_demo_tenant_layout"), true);
  assert.equal(
    validateHumanApprovalOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      null,
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    true,
  );
  assert.throws(() => validateHumanApprovalOptionalFields(null), /optional field registry input/);
  assert.throws(() => validateHumanApprovalOptionalFields({ blocked_claim_ref: "blocked_claim.human_approval_ownership_correction" }), /unsupported field blocked_claim_ref/);
  assert.throws(() => validateHumanApprovalOptionalFields(valid, "lfos_demo_tenant_other"), /tenant scope/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, matter_id: "matter-demo-control-plane" }), /matter_id/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, matter_id: " matter_demo_control_plane " }), /matter_id/);
  assert.throws(
    () => validateHumanApprovalOptionalFields(
      valid,
      null,
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /matter_id is required/,
  );
  assert.throws(
    () => validateHumanApprovalOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      null,
      { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /Matter trace context/,
  );
  assert.throws(
    () => validateHumanApprovalOptionalFields(
      { ...valid, matter_id: "matter_demo_control_plane" },
      null,
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" },
    ),
    /another tenant/,
  );
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, blocked_claim_refs: "blocked_claim.human_approval_ownership_correction" }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, blocked_claim_refs: ["claim.human_approval"] }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, blocked_claim_refs: ["blocked_claim.human_approval "] }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, hermes_gate_refs: "hermes_gate.synthetic_h00_control_plane" }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, hermes_gate_refs: ["hermes_gate.real_h00"] }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane "] }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, claude_review_gate_refs: "claude_review_gate.synthetic_c00_control_plane_review" }), /claude_review_gate_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, claude_review_gate_refs: ["claude_review_gate.real_c00"] }), /claude_review_gate_refs/);
  assert.throws(() => validateHumanApprovalOptionalFields({ ...valid, claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review "] }), /claude_review_gate_refs/);
});

test("HumanApproval state transition map is ordered, terminal, non-synthetic, and fail-closed", () => {
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.subphaseId, "RP00.P01.M05.S10");
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.entity, "HumanApproval");
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.statusField, "status");
  assert.deepEqual(HUMAN_APPROVAL_STATE_TRANSITION_MAP.states, HUMAN_APPROVAL_STATUS_VALUES);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.initialStatus, "draft");
  assert.deepEqual(HUMAN_APPROVAL_STATE_TRANSITION_MAP.terminalStatuses, ["production_ready", "blocked"]);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.transitionEdges.length, 10);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.noSkippedGates, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.noBackwardTransitions, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.productionReadyRequiresFinalValidation, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.blockedRequiresBlockedClaim, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.terminalStatusesCannotTransition, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.guardPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.validationHelperCompletionSubphase, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.noRealData, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_STATE_TRANSITION_MAP.nextSubphase, "RP00.P01.M05.S11");

  const transitionByFrom = new Map(
    HUMAN_APPROVAL_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => [transition.from, transition.to]),
  );
  assert.deepEqual(transitionByFrom.get("draft"), ["implemented", "blocked"]);
  assert.deepEqual(transitionByFrom.get("implemented"), ["hermes_validated", "blocked"]);
  assert.deepEqual(transitionByFrom.get("hermes_validated"), ["claude_reviewed", "blocked"]);
  assert.deepEqual(transitionByFrom.get("claude_reviewed"), ["construction_inspected", "blocked"]);
  assert.deepEqual(transitionByFrom.get("construction_inspected"), ["production_ready", "blocked"]);
  assert.deepEqual(transitionByFrom.get("production_ready"), []);
  assert.deepEqual(transitionByFrom.get("blocked"), []);
  assert.deepEqual(HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS, [
    "implementation_evidence",
    "blocked_claim",
    "hermes_H00_evidence",
    "claude_C00_review",
    "construction_inspection",
    "final_validation_rerun",
  ]);

  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.humanApprovalStateTransitionMap, HUMAN_APPROVAL_STATE_TRANSITION_MAP);
  assert.equal(CONTROL_PLANE_DOMAIN_MODEL_REGISTRY.nextSubphase, "RP00.P02.M00.S01");
  assert.equal(canTransitionHumanApprovalStatus("draft", "implemented"), true);
  assert.equal(canTransitionHumanApprovalStatus("implemented", "hermes_validated"), true);
  assert.equal(canTransitionHumanApprovalStatus("hermes_validated", "claude_reviewed"), true);
  assert.equal(canTransitionHumanApprovalStatus("claude_reviewed", "construction_inspected"), true);
  assert.equal(canTransitionHumanApprovalStatus("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionHumanApprovalStatus("draft", "blocked"), true);
  assert.equal(assertHumanApprovalStatusTransition("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionHumanApprovalStatus("draft", "production_ready"), false);
  assert.equal(canTransitionHumanApprovalStatus("implemented", "claude_reviewed"), false);
  assert.equal(canTransitionHumanApprovalStatus("production_ready", "blocked"), false);
  assert.equal(canTransitionHumanApprovalStatus("blocked", "draft"), false);
  assert.throws(() => assertHumanApprovalStatusTransition("draft", "production_ready"), /not allowed/);
  assert.throws(() => assertHumanApprovalStatusTransition("production_ready", "implemented"), /not allowed/);
  assert.throws(() => canTransitionHumanApprovalStatus("approved", "production_ready"), /status/);
  assert.throws(() => canTransitionHumanApprovalStatus("draft", "approved"), /status/);
});

test("HumanApproval validation helper validates complete records and transition evidence", () => {
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.subphaseId, "RP00.P01.M05.S11");
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.sourceMicroPhaseId, "RP00.P01.M05");
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.status, "production_ready");
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.helperExport, "validateHumanApproval");
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.transitionEvidenceExport, "assertHumanApprovalTransitionEvidence");
  assert.deepEqual(HUMAN_APPROVAL_VALIDATION_HELPER.transitionEvidenceKeys, HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS);
  assert.deepEqual(HUMAN_APPROVAL_VALIDATION_HELPER.validatesSubphases, [
    "RP00.P01.M05.S02",
    "RP00.P01.M05.S03",
    "RP00.P01.M05.S04",
    "RP00.P01.M05.S05",
    "RP00.P01.M05.S06",
    "RP00.P01.M05.S07",
    "RP00.P01.M05.S08",
    "RP00.P01.M05.S09",
    "RP00.P01.M05.S10",
  ]);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.requiredFields, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.optionalFields, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.tenantScope, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.matterTrace, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.relationshipReferences, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.transitionEvidence, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.terminalStatusProtection, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.enforcementPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.noRealData, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.writesProductState, false);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.cannotSynthesizeHumanApproval, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.completesHumanApprovalModel, true);
  assert.equal(HUMAN_APPROVAL_VALIDATION_HELPER.nextSubphase, "RP00.P01.M06.S01");

  const valid = {
    approval_id: "ha_rp00_non_delegable_sensitive_closeout",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    status: "production_ready",
    owner_module: "packages/control-plane",
    owner_role: "human_approval_process_owner",
    steward_ref: "owner.synthetic_human_approval_steward",
    correction_route: "blocked_claim.human_approval_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HermesGate", "ClaudeReviewGate"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
      "human_approval_actor_identity",
    ],
    audit_event_ref: "audit.synthetic.human_approval.validation_helper",
    blocked_claim_refs: ["blocked_claim.human_approval_ownership_correction"],
    hermes_gate_refs: ["hermes_gate.synthetic_h00_control_plane"],
    claude_review_gate_refs: ["claude_review_gate.synthetic_c00_control_plane_review"],
  };
  assert.equal(assertHumanApprovalTransitionEvidence("construction_inspected", "production_ready", { final_validation_rerun: true }), true);
  assert.equal(
    validateHumanApproval(valid, {
      tenantContext: "lfos_demo_tenant_layout",
      fromStatus: "construction_inspected",
      evidence: { final_validation_rerun: true },
    }),
    true,
  );
  assert.equal(
    validateHumanApproval(
      { ...valid, matter_id: "matter_demo_control_plane" },
      {
        tenantContext: "lfos_demo_tenant_layout",
        matterContext: { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
        fromStatus: "construction_inspected",
        evidence: { final_validation_rerun: true },
      },
    ),
    true,
  );
  assert.throws(() => validateHumanApproval(valid, null), /options/);
  assert.throws(() => validateHumanApproval({ ...valid, approval_id: "human_approval_1" }), /approval_id/);
  assert.throws(() => validateHumanApproval({ ...valid, tenant_id: "lfos_demo_tenant_other" }, { tenantContext: "lfos_demo_tenant_layout" }), /tenant scope/);
  assert.throws(() => validateHumanApproval({ ...valid, matter_id: "matter_demo_control_plane" }, { tenantContext: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => validateHumanApproval({ ...valid, audit_event_ref: "audit.real.client" }, { tenantContext: "lfos_demo_tenant_layout" }), /audit_event_ref/);
  assert.throws(() => validateHumanApproval({ ...valid, blocked_claim_refs: ["claim.human_approval"] }, { tenantContext: "lfos_demo_tenant_layout" }), /blocked_claim_refs/);
  assert.throws(() => validateHumanApproval({ ...valid, hermes_gate_refs: ["hermes_gate.real_h00"] }, { tenantContext: "lfos_demo_tenant_layout" }), /hermes_gate_refs/);
  assert.throws(() => validateHumanApproval({ ...valid, claude_review_gate_refs: ["claude_review_gate.real_c00"] }, { tenantContext: "lfos_demo_tenant_layout" }), /claude_review_gate_refs/);
  assert.throws(() => validateHumanApproval({ ...valid, actor_user_id: "user_real" }), /unsupported field/);
  assert.throws(() => assertHumanApprovalTransitionEvidence("construction_inspected", "production_ready", {}), /final_validation_rerun/);
  assert.throws(() => assertHumanApprovalTransitionEvidence("draft", "production_ready", { final_validation_rerun: true }), /not allowed/);
  assert.throws(() => assertHumanApprovalTransitionEvidence("draft", "blocked", { final_validation_rerun: true }), /blocked_claim/);
  assert.throws(() => assertHumanApprovalTransitionEvidence("production_ready", "implemented", { implementation_evidence: true }), /not allowed/);
});

test("ClaudeReviewGate primary identifier policy is canonical and executable", () => {
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M04.S02");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M04");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.field, "review_id");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.stablePrefix, "crg_");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.canonicalPattern, "^crg_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M04.S03");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.matterTraceCompletionSubphase, "RP00.P01.M04.S04");
  assert.equal(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M04.S03");

  assert.equal(normalizeClaudeReviewGateId(" crg_rp00_c00_control_plane_review "), "crg_rp00_c00_control_plane_review");
  assert.equal(validateClaudeReviewGateId("crg_rp00_c00_control_plane_review"), true);
  assert.throws(() => validateClaudeReviewGateId(" crg_rp00_c00_control_plane_review "), /stored without/);
  assert.throws(() => normalizeClaudeReviewGateId("CRG_rp00_c00_control_plane_review"), /crg_/);
  assert.throws(() => normalizeClaudeReviewGateId("crg-rp00-c00-control-plane-review"), /crg_/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_RP00_c00_control_plane_review"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_rp00-c00_control_plane_review"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_rp00_"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_rp00/c00_control_plane_review"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_rp00.c00_control_plane_review"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("crg_rp00__c00_control_plane_review"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateId("https://example.test/crg_rp00_c00_control_plane_review"), /crg_/);
  assert.throws(() => normalizeClaudeReviewGateId(""), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateId("   "), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateId(null), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateId(undefined), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateId(42), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateId({ review_id: "crg_rp00_c00_control_plane_review" }), /non-empty string/);
});

test("ClaudeReviewGate tenant scope field is conditional, canonical, and fail-closed", () => {
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M04.S03");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M04");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.required, false);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.tenantScopedByDefault, false);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.nullableForFirmLevelReviews, true);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.requiredWhen.includes("review_packet_includes_tenant_scoped_synthetic_fixtures"), true);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.requiredWhen.includes("review_packet_includes_client_document_finance_external_share_portal_or_ai_output_behavior"), true);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.matterTraceCompletionSubphase, "RP00.P01.M04.S04");
  assert.equal(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M04.S04");

  const tenantScopedReview = {
    review_id: "crg_rp00_c00_control_plane_review",
    tenant_id: "lfos_demo_tenant_layout",
  };
  assert.equal(normalizeClaudeReviewGateTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(normalizeClaudeReviewGateTenantId(null), null);
  assert.equal(normalizeClaudeReviewGateTenantId(undefined), null);
  assert.equal(validateClaudeReviewGateTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(validateClaudeReviewGateTenantId(null), true);
  assert.equal(validateClaudeReviewGateTenantId(undefined), true);
  assert.equal(assertClaudeReviewGateTenantScope({ review_id: tenantScopedReview.review_id }, null), true);
  assert.equal(assertClaudeReviewGateTenantScope({ review_id: tenantScopedReview.review_id }, { tenant_id: null }), true);
  assert.equal(assertClaudeReviewGateTenantScope({ ...tenantScopedReview }, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertClaudeReviewGateTenantScope({ ...tenantScopedReview }, "lfos_demo_tenant_layout"), true);
  assert.throws(() => validateClaudeReviewGateTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => normalizeClaudeReviewGateTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeClaudeReviewGateTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeClaudeReviewGateTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeClaudeReviewGateTenantId(""), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateTenantId("   "), /non-empty string/);
  assert.throws(() => assertClaudeReviewGateTenantScope(null, null), /review gate object/);
  assert.throws(() => assertClaudeReviewGateTenantScope(42, null), /review gate object/);
  assert.throws(() => assertClaudeReviewGateTenantScope({ review_id: tenantScopedReview.review_id }, 42), /must provide tenant_id/);
  assert.throws(() => assertClaudeReviewGateTenantScope({ ...tenantScopedReview }, { tenant_id: "lfos_demo_tenant_other" }), /tenant scope context/);
  assert.throws(() => assertClaudeReviewGateTenantScope({ review_id: tenantScopedReview.review_id }, { tenant_id: "lfos_demo_tenant_layout" }), /required when tenant scope context/);
  assert.throws(() => assertClaudeReviewGateTenantScope({ ...tenantScopedReview }, null), /context is required/);
});

test("ClaudeReviewGate Matter trace reference is nullable, canonical, and fail-closed", () => {
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.subphaseId, "RP00.P01.M04.S04");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.sourceMicroPhaseId, "RP00.P01.M04");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.status, "production_ready");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.field, "matter_id");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.targetEntity, "Matter");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.required, false);
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.nullableForFirmLevelReviews, true);
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.stablePrefix, "matter_");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.canonicalPattern, "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.requiredWhen.includes("review_packet_includes_matter_scoped_synthetic_fixtures"), true);
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.requiredWhen.includes("review_packet_includes_document_finance_external_share_portal_or_ai_output_behavior"), true);
  assert.equal(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.nextSubphase, "RP00.P01.M05.S01");

  const matterScopedReview = {
    review_id: "crg_rp00_c00_control_plane_review",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: "matter_demo_control_plane",
  };
  assert.equal(normalizeClaudeReviewGateMatterId(" matter_demo_control_plane "), "matter_demo_control_plane");
  assert.equal(normalizeClaudeReviewGateMatterId(null), null);
  assert.equal(normalizeClaudeReviewGateMatterId(undefined), null);
  assert.equal(validateClaudeReviewGateMatterId("matter_demo_control_plane"), true);
  assert.equal(validateClaudeReviewGateMatterId(null), true);
  assert.equal(validateClaudeReviewGateMatterId(undefined), true);
  assert.equal(assertClaudeReviewGateMatterTrace({ review_id: matterScopedReview.review_id }, null), true);
  assert.equal(assertClaudeReviewGateMatterTrace({ review_id: matterScopedReview.review_id }, { matter_id: null }), true);
  assert.equal(assertClaudeReviewGateMatterTrace(matterScopedReview, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertClaudeReviewGateMatterTrace(matterScopedReview, "matter_demo_control_plane"), true);
  assert.throws(() => validateClaudeReviewGateMatterId(" matter_demo_control_plane "), /stored without/);
  assert.throws(() => normalizeClaudeReviewGateMatterId("MATTER_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeClaudeReviewGateMatterId("matter-demo-control-plane"), /matter_/);
  assert.throws(() => normalizeClaudeReviewGateMatterId("matter_demo__control_plane"), /canonical/);
  assert.throws(() => normalizeClaudeReviewGateMatterId("https://example.test/matter_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeClaudeReviewGateMatterId(""), /non-empty string/);
  assert.throws(() => normalizeClaudeReviewGateMatterId("   "), /non-empty string/);
  assert.throws(() => assertClaudeReviewGateMatterTrace(null, null), /review gate object/);
  assert.throws(() => assertClaudeReviewGateMatterTrace(42, null), /review gate object/);
  assert.throws(() => assertClaudeReviewGateMatterTrace({ review_id: matterScopedReview.review_id }, 42), /must provide matter_id/);
  assert.throws(() => assertClaudeReviewGateMatterTrace(matterScopedReview, { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => assertClaudeReviewGateMatterTrace({ review_id: matterScopedReview.review_id }, { matter_id: "matter_demo_control_plane" }), /required when Matter trace context/);
  assert.throws(() => assertClaudeReviewGateMatterTrace(matterScopedReview, null), /context is required/);
  assert.throws(() => assertClaudeReviewGateMatterTrace(matterScopedReview, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" }), /another tenant/);
});

test("HermesGate package layout opens model surfaces without claiming model completion", () => {
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.subphaseId, "RP00.P01.M03.S01");
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.status, "production_ready");
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.expectedEntity, "HermesGate");
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.implementedModel, false);
  assert.deepEqual(HERMES_GATE_PACKAGE_LAYOUT.targetFiles, [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]);
  assert.deepEqual(HERMES_GATE_PACKAGE_LAYOUT.targetTests, [
    "packages/control-plane/test/model.test.js",
  ]);
  assert.deepEqual(HERMES_GATE_PACKAGE_LAYOUT.fixtureFiles, [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]);
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.futureModelSubphases.includes("RP00.P01.M03.S02"), true);
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.futureModelSubphases.includes("RP00.P01.M03.S11"), true);
  assert.equal(HERMES_GATE_PACKAGE_LAYOUT.nextSubphase, "RP00.P01.M03.S02");
  assert.equal(assertHermesGatePackageLayout(), true);
});

test("HermesGate primary identifier policy is canonical and executable", () => {
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M03.S02");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.field, "gate_id");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.stablePrefix, "hg_");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.canonicalPattern, "^hg_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M03.S03");
  assert.equal(HERMES_GATE_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M03.S03");

  assert.equal(normalizeHermesGateId(" hg_rp00_h00_control_plane "), "hg_rp00_h00_control_plane");
  assert.equal(validateHermesGateId("hg_rp00_h00_control_plane"), true);
  assert.throws(() => validateHermesGateId(" hg_rp00_h00_control_plane "), /stored without/);
  assert.throws(() => normalizeHermesGateId("HG_rp00_h00_control_plane"), /hg_/);
  assert.throws(() => normalizeHermesGateId("hg-rp00-h00-control-plane"), /hg_/);
  assert.throws(() => normalizeHermesGateId("hg_rp00__h00_control_plane"), /canonical/);
  assert.throws(() => normalizeHermesGateId("https://example.test/hg_rp00_h00_control_plane"), /hg_/);
});

test("HermesGate tenant scope policy is canonical and fail-closed", () => {
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M03.S03");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(HERMES_GATE_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M03.S04");

  const gate = { gate_id: "hg_rp00_h00_control_plane", tenant_id: "lfos_demo_tenant_layout" };
  assert.equal(normalizeHermesGateTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateHermesGateTenantId("lfos_demo_tenant_layout"), true);
  assert.equal(assertHermesGateTenantScope(gate, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertHermesGateTenantScope(gate, "lfos_demo_tenant_layout"), true);
  assert.throws(() => validateHermesGateTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => normalizeHermesGateTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeHermesGateTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeHermesGateTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeHermesGateTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
  assert.throws(() => assertHermesGateTenantScope(gate, { tenant_id: "lfos_demo_tenant_other" }), /tenant scope/);
});

test("HermesGate Matter trace reference policy is canonical, nullable, and fail-closed", () => {
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.subphaseId, "RP00.P01.M03.S04");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.status, "production_ready");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.field, "matter_id");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.targetEntity, "Matter");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.required, false);
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.nullableForFirmLevelGates, true);
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.stablePrefix, "matter_");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.canonicalPattern, "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(HERMES_GATE_MATTER_TRACE_POLICY.nextSubphase, "RP00.P01.M03.S05");

  const gate = {
    gate_id: "hg_rp00_h00_control_plane",
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: "matter_demo_control_plane",
  };
  assert.equal(normalizeHermesGateMatterId(" matter_demo_control_plane "), "matter_demo_control_plane");
  assert.equal(validateHermesGateMatterId("matter_demo_control_plane"), true);
  assert.equal(validateHermesGateMatterId(null), true);
  assert.equal(validateHermesGateMatterId(undefined), true);
  assert.equal(assertHermesGateMatterTrace({ ...gate, matter_id: null }, null), true);
  assert.equal(assertHermesGateMatterTrace(gate, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(assertHermesGateMatterTrace(gate, "matter_demo_control_plane"), true);
  assert.throws(() => validateHermesGateMatterId(" matter_demo_control_plane "), /stored without/);
  assert.throws(() => normalizeHermesGateMatterId("MATTER_demo_control_plane"), /matter_/);
  assert.throws(() => normalizeHermesGateMatterId("matter-demo-control-plane"), /matter_/);
  assert.throws(() => normalizeHermesGateMatterId("matter_demo__control_plane"), /canonical/);
  assert.throws(() => normalizeHermesGateMatterId("https://example.test/matter_demo_control_plane"), /matter_/);
  assert.throws(() => assertHermesGateMatterTrace(gate, { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => assertHermesGateMatterTrace(gate, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" }), /another tenant/);
});

test("HermesGate lifecycle status enum is canonical and transition-map deferred", () => {
  assert.equal(HERMES_GATE_STATUS_POLICY.subphaseId, "RP00.P01.M03.S05");
  assert.equal(HERMES_GATE_STATUS_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_STATUS_POLICY.status, "production_ready");
  assert.equal(HERMES_GATE_STATUS_POLICY.field, "status");
  assert.equal(HERMES_GATE_STATUS_POLICY.required, true);
  assert.deepEqual(HERMES_GATE_STATUS_VALUES, CONTROL_PLANE_LIFECYCLE_STATES);
  assert.deepEqual(HERMES_GATE_STATUS_POLICY.enumValues, HERMES_GATE_STATUS_VALUES);
  assert.equal(HERMES_GATE_STATUS_POLICY.initialStatus, "draft");
  assert.equal(HERMES_GATE_STATUS_POLICY.hermesValidatedStatus, "hermes_validated");
  assert.equal(HERMES_GATE_STATUS_POLICY.claudeReviewedStatus, "claude_reviewed");
  assert.equal(HERMES_GATE_STATUS_POLICY.constructionInspectedStatus, "construction_inspected");
  assert.equal(HERMES_GATE_STATUS_POLICY.productionReadyStatus, "production_ready");
  assert.equal(HERMES_GATE_STATUS_POLICY.blockedStatus, "blocked");
  assert.deepEqual(HERMES_GATE_STATUS_POLICY.terminalStatuses, [
    "production_ready",
    "blocked",
  ]);
  assert.equal(HERMES_GATE_STATUS_POLICY.transitionMapDeferredTo, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_STATUS_POLICY.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_STATUS_POLICY.nextSubphase, "RP00.P01.M03.S06");

  assert.equal(validateHermesGateStatus("draft"), true);
  assert.equal(validateHermesGateStatus("hermes_validated"), true);
  assert.equal(validateHermesGateStatus("production_ready"), true);
  assert.equal(validateHermesGateStatus("blocked"), true);
  assert.throws(() => validateHermesGateStatus(" draft "), /stored without/);
  assert.throws(() => validateHermesGateStatus("DRAFT"), /known lifecycle status/);
  assert.throws(() => validateHermesGateStatus("hermes-validated"), /known lifecycle status/);
  assert.throws(() => validateHermesGateStatus("approved"), /known lifecycle status/);
});

test("HermesGate ownership metadata is synthetic, bounded, and fail-closed", () => {
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.subphaseId, "RP00.P01.M03.S06");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.status, "production_ready");
  assert.deepEqual(HERMES_GATE_OWNERSHIP_POLICY.fields, [
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
  ]);
  assert.deepEqual(HERMES_GATE_OWNERSHIP_POLICY.metadataFields, HERMES_GATE_OWNERSHIP_POLICY.fields);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.ownerModule, "packages/control-plane");
  assert.deepEqual(HERMES_GATE_OWNER_ROLE_VALUES, [
    "control_plane_governance_owner",
    "hermes_evidence_steward",
    "implementation_closeout_reviewer",
  ]);
  assert.deepEqual(HERMES_GATE_OWNERSHIP_POLICY.ownerRoleValues, HERMES_GATE_OWNER_ROLE_VALUES);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.defaultOwnerRole, "control_plane_governance_owner");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.correctionRouteRequired, true);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.mayReference.includes("BlockedClaim"), true);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.mayReference.includes("HumanApproval"), true);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.mayNotMutate.includes("human_approval_decisions"), true);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.referenceRelationshipMapDeferredTo, "RP00.P01.M03.S07");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M03.S08");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.noRealData, true);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.writesProductState, false);
  assert.equal(HERMES_GATE_OWNERSHIP_POLICY.nextSubphase, "RP00.P01.M03.S07");

  const valid = {
    owner_module: "packages/control-plane",
    owner_role: "control_plane_governance_owner",
    steward_ref: "owner.synthetic_control_plane_steward",
    correction_route: "blocked_claim.hermes_gate_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HumanApproval"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
    ],
  };
  assert.equal(validateHermesGateOwnershipMetadata(valid), true);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, owner_module: "packages/billing" }), /owner_module/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, owner_role: "owner" }), /owner_role/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, owner_role: " control_plane_governance_owner " }), /owner_role/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, steward_ref: "OWNER.synthetic_control_plane_steward" }), /steward_ref/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, steward_ref: "owner.synthetic_control_plane_steward " }), /steward_ref/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, correction_route: "claim.hermes_gate_ownership_correction" }), /correction_route/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, correction_route: "blocked_claim.hermes_gate_ownership_correction " }), /correction_route/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, may_reference: [] }), /may_reference/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, may_reference: ["Tenant", "Client"] }), /may_reference/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, may_not_mutate: [] }), /may_not_mutate/);
  assert.throws(() => validateHermesGateOwnershipMetadata({ ...valid, may_not_mutate: ["write_product_state"] }), /may_not_mutate/);
});

test("HermesGate reference relationship map is canonical and fail-closed", () => {
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.subphaseId, "RP00.P01.M03.S07");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.status, "production_ready");
  assert.deepEqual(HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS, [
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "HumanApproval",
  ]);
  assert.deepEqual(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.relationshipFields, [
    "tenant_id",
    "matter_id",
    "audit_event_ref",
    "blocked_claim_refs",
    "human_approval_refs",
  ]);
  assert.deepEqual(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.targetEntities, HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS);
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.length, 5);

  const relationshipByField = new Map(
    HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.relationshipMap.map((relationship) => [relationship.field, relationship]),
  );
  assert.equal(relationshipByField.get("tenant_id").targetEntity, "Tenant");
  assert.equal(relationshipByField.get("tenant_id").sameTenantRequired, true);
  assert.equal(relationshipByField.get("matter_id").targetEntity, "Matter");
  assert.equal(relationshipByField.get("matter_id").nullableForFirmLevelGates, true);
  assert.equal(relationshipByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(relationshipByField.get("audit_event_ref").required, true);
  assert.equal(relationshipByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(relationshipByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(relationshipByField.get("human_approval_refs").targetEntity, "HumanApproval");
  assert.equal(relationshipByField.get("human_approval_refs").cannotApproveOrMutate, true);
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.requiredFieldRegistryDeferredTo, "RP00.P01.M03.S08");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.optionalFieldRegistryDeferredTo, "RP00.P01.M03.S09");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.stateTransitionMapDeferredTo, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.noRealData, true);
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.writesProductState, false);
  assert.equal(HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY.nextSubphase, "RP00.P01.M03.S08");

  const valid = {
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    audit_event_ref: "audit.synthetic.hermes_gate.relationship_map",
    blocked_claim_refs: ["blocked_claim.hermes_gate_ownership_correction"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };
  assert.equal(validateHermesGateReferenceRelationships(valid, "lfos_demo_tenant_layout"), true);
  assert.equal(validateHermesGateReferenceRelationships({ ...valid, blocked_claim_refs: [], human_approval_refs: [] }), true);
  assert.equal(
    validateHermesGateReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" },
    ),
    true,
  );

  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateHermesGateReferenceRelationships(valid, "lfos_demo_tenant_other"), /tenant scope/);
  assert.throws(
    () => validateHermesGateReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" },
    ),
    /Matter trace context/,
  );
  assert.throws(
    () => validateHermesGateReferenceRelationships(
      { ...valid, matter_id: "matter_demo_control_plane" },
      "lfos_demo_tenant_layout",
      { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" },
    ),
    /another tenant/,
  );
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, audit_event_ref: "audit.real.client" }), /audit_event_ref/);
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, audit_event_ref: " audit.synthetic.hermes_gate.relationship_map " }), /audit_event_ref/);
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, blocked_claim_refs: ["claim.hermes_gate"] }), /blocked_claim_refs/);
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, blocked_claim_refs: ["blocked_claim.hermes_gate "] }), /blocked_claim_refs/);
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, human_approval_refs: ["human_approval.real_decision"] }), /human_approval_refs/);
  assert.throws(() => validateHermesGateReferenceRelationships({ ...valid, human_approval_refs: ["human_approval.synthetic_boundary "] }), /human_approval_refs/);
});

test("HermesGate required field registry is canonical and fail-closed", () => {
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.subphaseId, "RP00.P01.M03.S08");
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(HERMES_GATE_REQUIRED_FIELDS, [
    "gate_id",
    "tenant_id",
    "status",
    "owner_module",
    "owner_role",
    "steward_ref",
    "correction_route",
    "may_reference",
    "may_not_mutate",
    "audit_event_ref",
  ]);
  assert.deepEqual(HERMES_GATE_REQUIRED_FIELD_REGISTRY.requiredFields, HERMES_GATE_REQUIRED_FIELDS);
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.fieldDefinitions.length, HERMES_GATE_REQUIRED_FIELDS.length);

  const definitionByField = new Map(
    HERMES_GATE_REQUIRED_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  assert.equal(definitionByField.get("gate_id").sourcePolicy, "HERMES_GATE_IDENTIFIER_POLICY");
  assert.equal(definitionByField.get("tenant_id").targetEntity, "Tenant");
  assert.deepEqual(definitionByField.get("status").enumValues, HERMES_GATE_STATUS_VALUES);
  assert.deepEqual(definitionByField.get("owner_role").enumValues, HERMES_GATE_OWNER_ROLE_VALUES);
  assert.equal(definitionByField.get("audit_event_ref").targetEntity, "AuditEventReference");
  assert.equal(definitionByField.has("matter_id"), false);
  assert.equal(definitionByField.has("blocked_claim_refs"), false);
  assert.equal(definitionByField.has("human_approval_refs"), false);
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.optionalFieldRegistryDeferredTo, "RP00.P01.M03.S09");
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.noRealData, true);
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.writesProductState, false);
  assert.equal(HERMES_GATE_REQUIRED_FIELD_REGISTRY.nextSubphase, "RP00.P01.M03.S09");

  const valid = {
    gate_id: "hg_rp00_h00_control_plane",
    tenant_id: "lfos_demo_tenant_layout",
    status: "draft",
    owner_module: "packages/control-plane",
    owner_role: "control_plane_governance_owner",
    steward_ref: "owner.synthetic_control_plane_steward",
    correction_route: "blocked_claim.hermes_gate_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HumanApproval"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
    ],
    audit_event_ref: "audit.synthetic.hermes_gate.required_fields",
  };
  assert.equal(validateHermesGateRequiredFields(valid), true);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, gate_id: undefined }), /gate_id/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, tenant_id: "tenant_demo" }), /tenant_id/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, status: "approved" }), /status/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, owner_role: "owner" }), /owner_role/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, may_reference: [] }), /may_reference/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, may_not_mutate: ["write_product_state"] }), /may_not_mutate/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, audit_event_ref: "audit.real.client" }), /audit_event_ref/);
  assert.throws(() => validateHermesGateRequiredFields({ ...valid, audit_event_ref: " audit.synthetic.hermes_gate.required_fields " }), /audit_event_ref/);
});

test("HermesGate optional field registry is canonical, nullable, and fail-closed", () => {
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.subphaseId, "RP00.P01.M03.S09");
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.status, "production_ready");
  assert.deepEqual(HERMES_GATE_OPTIONAL_FIELDS, [
    "matter_id",
    "blocked_claim_refs",
    "human_approval_refs",
  ]);
  assert.deepEqual(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.optionalFields, HERMES_GATE_OPTIONAL_FIELDS);
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.length, HERMES_GATE_OPTIONAL_FIELDS.length);

  const definitionByField = new Map(
    HERMES_GATE_OPTIONAL_FIELD_REGISTRY.fieldDefinitions.map((definition) => [definition.field, definition]),
  );
  assert.equal(definitionByField.get("matter_id").sourcePolicy, "HERMES_GATE_MATTER_TRACE_POLICY");
  assert.equal(definitionByField.get("matter_id").targetEntity, "Matter");
  assert.equal(definitionByField.get("matter_id").nullableForFirmLevelGates, true);
  assert.equal(definitionByField.get("blocked_claim_refs").targetEntity, "BlockedClaim");
  assert.equal(definitionByField.get("blocked_claim_refs").cardinality, "zero_or_many");
  assert.equal(definitionByField.get("human_approval_refs").targetEntity, "HumanApproval");
  assert.equal(definitionByField.get("human_approval_refs").referenceOnly, true);
  assert.equal(definitionByField.get("human_approval_refs").cannotApproveOrMutate, true);
  assert.equal(definitionByField.has("gate_id"), false);
  assert.equal(definitionByField.has("tenant_id"), false);
  assert.equal(definitionByField.has("status"), false);
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.requiredFieldRegistryCompletedIn, "RP00.P01.M03.S08");
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.stateTransitionMapDeferredTo, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.noRealData, true);
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.writesProductState, false);
  assert.equal(HERMES_GATE_OPTIONAL_FIELD_REGISTRY.nextSubphase, "RP00.P01.M03.S10");

  const valid = {
    tenant_id: "lfos_demo_tenant_layout",
    matter_id: null,
    blocked_claim_refs: ["blocked_claim.hermes_gate_ownership_correction"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };
  assert.equal(validateHermesGateOptionalFields({}), true);
  assert.equal(validateHermesGateOptionalFields(valid), true);
  assert.equal(validateHermesGateOptionalFields({ ...valid, matter_id: "matter_demo_control_plane" }, null, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.throws(() => validateHermesGateOptionalFields(null), /optional field registry input/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, matter_id: "matter-demo-control-plane" }), /matter_id/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, matter_id: " matter_demo_control_plane " }), /matter_id/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, matter_id: "matter_demo_control_plane" }, null, { matter_id: "matter_demo_other", tenant_id: "lfos_demo_tenant_layout" }), /Matter trace context/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, matter_id: "matter_demo_control_plane" }, null, { matter_id: "matter_demo_control_plane", tenant_id: "lfos_demo_tenant_other" }), /another tenant/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, blocked_claim_refs: "blocked_claim.hermes_gate_ownership_correction" }), /blocked_claim_refs/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, blocked_claim_refs: ["claim.hermes_gate"] }), /blocked_claim_refs/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, blocked_claim_refs: ["blocked_claim.hermes_gate "] }), /blocked_claim_refs/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, human_approval_refs: "human_approval.synthetic_control_plane_boundary" }), /human_approval_refs/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, human_approval_refs: ["human_approval.real_decision"] }), /human_approval_refs/);
  assert.throws(() => validateHermesGateOptionalFields({ ...valid, human_approval_refs: ["human_approval.synthetic_boundary "] }), /human_approval_refs/);
});

test("HermesGate state transition map is ordered, terminal, and fail-closed", () => {
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.subphaseId, "RP00.P01.M03.S10");
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.status, "production_ready");
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.statusField, "status");
  assert.deepEqual(HERMES_GATE_STATE_TRANSITION_MAP.states, HERMES_GATE_STATUS_VALUES);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.initialStatus, "draft");
  assert.deepEqual(HERMES_GATE_STATE_TRANSITION_MAP.terminalStatuses, ["production_ready", "blocked"]);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.transitionEdges.length, 10);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.noSkippedGates, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.noBackwardTransitions, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.productionReadyRequiresFinalValidation, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.blockedRequiresBlockedClaim, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.terminalStatusesCannotTransition, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.guardPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.validationHelperCompletionSubphase, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.noRealData, true);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.writesProductState, false);
  assert.equal(HERMES_GATE_STATE_TRANSITION_MAP.nextSubphase, "RP00.P01.M03.S11");

  const transitionByFrom = new Map(
    HERMES_GATE_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => [transition.from, transition.to]),
  );
  assert.deepEqual(transitionByFrom.get("draft"), ["implemented", "blocked"]);
  assert.deepEqual(transitionByFrom.get("implemented"), ["hermes_validated", "blocked"]);
  assert.deepEqual(transitionByFrom.get("hermes_validated"), ["claude_reviewed", "blocked"]);
  assert.deepEqual(transitionByFrom.get("claude_reviewed"), ["construction_inspected", "blocked"]);
  assert.deepEqual(transitionByFrom.get("construction_inspected"), ["production_ready", "blocked"]);
  assert.deepEqual(transitionByFrom.get("production_ready"), []);
  assert.deepEqual(transitionByFrom.get("blocked"), []);

  assert.equal(canTransitionHermesGateStatus("draft", "implemented"), true);
  assert.equal(canTransitionHermesGateStatus("implemented", "hermes_validated"), true);
  assert.equal(canTransitionHermesGateStatus("hermes_validated", "claude_reviewed"), true);
  assert.equal(canTransitionHermesGateStatus("claude_reviewed", "construction_inspected"), true);
  assert.equal(canTransitionHermesGateStatus("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionHermesGateStatus("draft", "blocked"), true);
  assert.equal(assertHermesGateStatusTransition("construction_inspected", "production_ready"), true);
  assert.equal(canTransitionHermesGateStatus("draft", "production_ready"), false);
  assert.equal(canTransitionHermesGateStatus("implemented", "claude_reviewed"), false);
  assert.equal(canTransitionHermesGateStatus("production_ready", "blocked"), false);
  assert.equal(canTransitionHermesGateStatus("blocked", "draft"), false);
  assert.throws(() => assertHermesGateStatusTransition("draft", "production_ready"), /not allowed/);
  assert.throws(() => assertHermesGateStatusTransition("production_ready", "implemented"), /not allowed/);
  assert.throws(() => canTransitionHermesGateStatus("approved", "production_ready"), /status/);
  assert.throws(() => canTransitionHermesGateStatus("draft", "approved"), /status/);
});

test("HermesGate validation helper validates complete records and transition evidence", () => {
  assert.equal(HERMES_GATE_VALIDATION_HELPER.subphaseId, "RP00.P01.M03.S11");
  assert.equal(HERMES_GATE_VALIDATION_HELPER.sourceMicroPhaseId, "RP00.P01.M03");
  assert.equal(HERMES_GATE_VALIDATION_HELPER.status, "production_ready");
  assert.equal(HERMES_GATE_VALIDATION_HELPER.helperExport, "validateHermesGate");
  assert.equal(HERMES_GATE_VALIDATION_HELPER.transitionEvidenceExport, "assertHermesGateTransitionEvidence");
  assert.deepEqual(HERMES_GATE_VALIDATION_HELPER.transitionEvidenceKeys, HERMES_GATE_TRANSITION_EVIDENCE_KEYS);
  assert.deepEqual(HERMES_GATE_TRANSITION_EVIDENCE_KEYS, [
    "implementation_evidence",
    "blocked_claim",
    "hermes_H00_evidence",
    "claude_C00_review",
    "construction_inspection",
    "final_validation_rerun",
  ]);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.requiredFields, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.optionalFields, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.tenantScope, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.matterTrace, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.relationshipReferences, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.transitionEvidence, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.enforcementPolicy.humanApprovalCannotBeSynthesized, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.noRealData, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.writesProductState, false);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.completesHermesGateModel, true);
  assert.equal(HERMES_GATE_VALIDATION_HELPER.nextSubphase, "RP00.P01.M04.S01");

  const validGate = {
    gate_id: "hg_rp00_h00_control_plane",
    tenant_id: "lfos_demo_tenant_layout",
    status: "production_ready",
    owner_module: "packages/control-plane",
    owner_role: "control_plane_governance_owner",
    steward_ref: "owner.synthetic_control_plane_steward",
    correction_route: "blocked_claim.hermes_gate_ownership_correction",
    may_reference: ["Tenant", "Matter", "AuditEventReference", "BlockedClaim", "HumanApproval"],
    may_not_mutate: [
      "production_product_data",
      "client_data",
      "matter_data",
      "document_data",
      "billing_data",
      "human_approval_decisions",
    ],
    audit_event_ref: "audit.synthetic.hermes_gate.validation_helper",
    matter_id: null,
    blocked_claim_refs: ["blocked_claim.hermes_gate_ownership_correction"],
    human_approval_refs: ["human_approval.synthetic_control_plane_boundary"],
  };

  assert.equal(assertHermesGateTransitionEvidence("construction_inspected", "production_ready", { final_validation_rerun: true }), true);
  assert.equal(assertHermesGateTransitionEvidence("implemented", "hermes_validated", { hermes_H00_evidence: true }), true);
  assert.equal(assertHermesGateTransitionEvidence("draft", "blocked", { blocked_claim: true }), true);
  assert.equal(
    validateHermesGate(validGate, {
      tenantContext: { tenant_id: "lfos_demo_tenant_layout" },
      fromStatus: "construction_inspected",
      evidence: { final_validation_rerun: true },
    }),
    true,
  );
  const { matter_id, blocked_claim_refs, human_approval_refs, ...validGateWithoutOptionals } = validGate;
  assert.equal(validateHermesGate({ ...validGateWithoutOptionals, status: "draft" }), true);
  assert.throws(() => assertHermesGateTransitionEvidence("construction_inspected", "production_ready", {}), /final_validation_rerun/);
  assert.throws(() => assertHermesGateTransitionEvidence("draft", "production_ready", { final_validation_rerun: true }), /not allowed/);
  assert.throws(() => assertHermesGateTransitionEvidence("production_ready", "blocked", { blocked_claim: true }), /not allowed/);
  assert.throws(() => assertHermesGateTransitionEvidence("draft", "approved", { implementation_evidence: true }), /status/);
  assert.throws(() => assertHermesGateTransitionEvidence("draft", "implemented", null), /evidence/);
  assert.throws(() => validateHermesGate(null), /validation helper input/);
  assert.throws(() => validateHermesGate(validGate, null), /options/);
  assert.throws(() => validateHermesGate({ ...validGate, audit_event_ref: "" }), /audit_event_ref/);
  assert.throws(
    () => validateHermesGate(validGate, { tenantContext: { tenant_id: "lfos_demo_tenant_other" } }),
    /tenant scope/,
  );
  assert.throws(
    () => validateHermesGate(validGate, { fromStatus: "construction_inspected", evidence: {} }),
    /final_validation_rerun/,
  );
});

test("control-plane layout remains synthetic-only and no-write", () => {
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.syntheticOnly, true);
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.noRealData, true);
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.writesProductState, false);
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.requiresHermesEvidence, true);
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.requiresClaudeReview, true);
  assert.equal(CONTROL_PLANE_BOUNDARY_FLAGS.requiresConstructionInspection, true);
});

test("control-plane state constants include review and closeout outcomes", () => {
  assert.deepEqual(CONTROL_PLANE_LIFECYCLE_STATES, [
    "draft",
    "implemented",
    "hermes_validated",
    "claude_reviewed",
    "construction_inspected",
    "production_ready",
    "blocked",
  ]);
  assert.deepEqual(CONTROL_PLANE_REVIEW_OUTCOMES, [
    "PASS",
    "PASS_WITH_FINDINGS",
    "BLOCKED",
  ]);
  assert.deepEqual(PRODUCT_CONTRACT_STATUS_VALUES, [
    "draft",
    "review_ready",
    "hermes_evidenced",
    "claude_reviewed",
    "human_accepted",
    "production_ready",
    "blocked",
  ]);
  assert.deepEqual(AI_CONTROL_RULE_STATUS_VALUES, [
    "draft",
    "active",
    "suspended",
    "blocked",
    "retired",
  ]);
  assert.deepEqual(AI_ALLOWED_ACTION_VALUES, [
    "read_context",
    "draft_plan",
    "draft_code",
    "recommend_fix",
    "summarize_evidence",
  ]);
  assert.deepEqual(AI_FORBIDDEN_ACTION_VALUES, [
    "write_production_data",
    "approve_human_gate",
    "bypass_hermes",
    "bypass_claude_review",
    "claim_completion_without_evidence",
  ]);
});

test("ProductContract model defines identifiers, tenant scope, statuses, matter refs, and audit metadata", () => {
  assert.equal(PRODUCT_CONTRACT_MODEL.subphaseId, "RP00.P01.M01.S01");
  assert.equal(PRODUCT_CONTRACT_MODEL.sourceMicroPhaseId, "RP00.P01.M01");
  assert.equal(PRODUCT_CONTRACT_MODEL.status, "production_ready");
  assert.equal(PRODUCT_CONTRACT_MODEL.identifierField, "contract_id");
  assert.equal(PRODUCT_CONTRACT_MODEL.identifierPrefix, "pc_");
  assert.equal(PRODUCT_CONTRACT_MODEL.tenantScoped, true);
  assert.equal(PRODUCT_CONTRACT_MODEL.statusField, "effective_status");
  assert.deepEqual(PRODUCT_CONTRACT_MODEL.requiredFields, PRODUCT_CONTRACT_REQUIRED_FIELDS);
  assert.deepEqual(PRODUCT_CONTRACT_MODEL.auditMetadataFields, [
    "audit_event_ref",
    "created_at",
    "updated_at",
  ]);
  assert.equal(PRODUCT_CONTRACT_MODEL.matterReferencePolicy.field, "matter_refs");
  assert.equal(PRODUCT_CONTRACT_MODEL.matterReferencePolicy.nullableForFirmLevelContracts, true);
  assert.equal(PRODUCT_CONTRACT_MODEL.nextSubphase, "RP00.P01.M02.S01");
});

test("ProductContract factory returns immutable tenant-scoped records", () => {
  const contract = createProductContract({
    contract_id: "pc_synthetic_product_contract_001",
    tenant_id: "lfos_demo_tenant_layout",
    spec_version: "0.1.0",
    effective_status: "review_ready",
    module_scope: ["control-plane", "tenant"],
    requirement_refs: ["TEN-001", "NARR-018"],
    acceptance_gate_refs: ["RP00.P05.M07.S01", "RP00.P08.M08.S01"],
    matter_refs: [],
    audit_event_ref: "audit.synthetic.product_contract.created",
    created_at: "2026-06-03T00:00:00.000Z",
    updated_at: "2026-06-03T00:00:00.000Z",
  });

  assert.equal(validateProductContract(contract), true);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.module_scope), true);
  assert.equal(Object.isFrozen(contract.requirement_refs), true);
  assert.equal(Object.isFrozen(contract.acceptance_gate_refs), true);
  assert.equal(Object.isFrozen(contract.matter_refs), true);
  assert.equal(contract.tenant_id, "lfos_demo_tenant_layout");
  assert.deepEqual(contract.matter_refs, []);
});

test("ProductContract validation fails closed on unsafe or incomplete records", () => {
  const valid = {
    contract_id: "pc_synthetic_product_contract_002",
    tenant_id: "lfos_demo_tenant_layout",
    spec_version: "0.1.0",
    effective_status: "review_ready",
    module_scope: ["control-plane"],
    requirement_refs: ["TEN-001"],
    acceptance_gate_refs: ["RP00.P05.M07.S01"],
    audit_event_ref: "audit.synthetic.product_contract.created",
    created_at: "2026-06-03T00:00:00.000Z",
    updated_at: "2026-06-03T00:00:00.000Z",
  };

  assert.throws(() => validateProductContract({ ...valid, contract_id: "bad_001" }), /pc_/);
  assert.throws(() => validateProductContract({ ...valid, tenant_id: "" }), /tenant_id/);
  assert.throws(() => validateProductContract({ ...valid, effective_status: "approved" }), /effective_status/);
  assert.throws(() => validateProductContract({ ...valid, module_scope: [] }), /module_scope/);
  assert.throws(() => validateProductContract({ ...valid, audit_event_ref: "" }), /audit_event_ref/);
  assert.throws(
    () => validateProductContract({ ...valid, updated_at: "2026-06-02T00:00:00.000Z" }),
    /updated_at/,
  );
});

test("AIControlRule model defines actions, review gates, ownership, and state constraints", () => {
  assert.equal(AI_CONTROL_RULE_MODEL.subphaseId, "RP00.P01.M02.S01");
  assert.equal(AI_CONTROL_RULE_MODEL.sourceMicroPhaseId, "RP00.P01.M02");
  assert.equal(AI_CONTROL_RULE_MODEL.status, "production_ready");
  assert.equal(AI_CONTROL_RULE_MODEL.identifierField, "rule_id");
  assert.equal(AI_CONTROL_RULE_MODEL.identifierPrefix, "air_");
  assert.equal(AI_CONTROL_RULE_MODEL.identifierPolicy, AI_CONTROL_RULE_IDENTIFIER_POLICY);
  assert.equal(AI_CONTROL_RULE_MODEL.tenantScoped, true);
  assert.equal(AI_CONTROL_RULE_MODEL.tenantScopePolicy, AI_CONTROL_RULE_TENANT_SCOPE_POLICY);
  assert.equal(AI_CONTROL_RULE_MODEL.statusField, "effective_status");
  assert.deepEqual(AI_CONTROL_RULE_MODEL.requiredFields, AI_CONTROL_RULE_REQUIRED_FIELDS);
  assert.deepEqual(AI_CONTROL_RULE_MODEL.requiredForbiddenActions, AI_FORBIDDEN_ACTION_VALUES);
  assert.equal(AI_CONTROL_RULE_MODEL.referenceFields.includes("blocked_claim_refs"), true);
  assert.equal(AI_CONTROL_RULE_MODEL.referenceFields.includes("audit_event_ref"), true);
  assert.equal(AI_CONTROL_RULE_MODEL.nextSubphase, "RP00.P01.M02.S02");
});

test("AIControlRule primary identifier policy is canonical and executable", () => {
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.subphaseId, "RP00.P01.M02.S02");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.sourceMicroPhaseId, "RP00.P01.M02");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.status, "production_ready");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.field, "rule_id");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.stablePrefix, "air_");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.canonicalPattern, "^air_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.tenantScopeCompletionSubphase, "RP00.P01.M02.S03");
  assert.equal(AI_CONTROL_RULE_IDENTIFIER_POLICY.nextSubphase, "RP00.P01.M02.S03");

  assert.equal(normalizeAIControlRuleId(" air_synthetic_rule_003 "), "air_synthetic_rule_003");
  assert.equal(validateAIControlRuleId("air_synthetic_rule_003"), true);
  assert.throws(() => validateAIControlRuleId(" air_synthetic_rule_003 "), /stored without/);
  assert.throws(() => normalizeAIControlRuleId("AIR_synthetic_rule_003"), /canonical/);
  assert.throws(() => normalizeAIControlRuleId("air_synthetic-rule-003"), /canonical/);
  assert.throws(() => normalizeAIControlRuleId("air_synthetic__rule_003"), /canonical/);
  assert.throws(() => normalizeAIControlRuleId("https://example.test/air_synthetic_rule_003"), /air_/);
});

test("AIControlRule tenant scope policy is canonical and fail-closed", () => {
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.subphaseId, "RP00.P01.M02.S03");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.sourceMicroPhaseId, "RP00.P01.M02");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.status, "production_ready");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.field, "tenant_id");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.targetEntity, "Tenant");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.stablePrefix, "lfos_");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.canonicalPattern, "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$");
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.sameTenantRequired, true);
  assert.equal(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.nextSubphase, "RP00.P01.M03.S01");

  assert.equal(normalizeAIControlRuleTenantId(" lfos_demo_tenant_layout "), "lfos_demo_tenant_layout");
  assert.equal(validateAIControlRuleTenantId("lfos_demo_tenant_layout"), true);
  assert.throws(() => validateAIControlRuleTenantId(" lfos_demo_tenant_layout "), /stored without/);
  assert.throws(() => normalizeAIControlRuleTenantId("LFOS_demo_tenant_layout"), /lfos_/);
  assert.throws(() => normalizeAIControlRuleTenantId("lfos-demo-tenant-layout"), /lfos_/);
  assert.throws(() => normalizeAIControlRuleTenantId("lfos_demo__tenant_layout"), /canonical/);
  assert.throws(() => normalizeAIControlRuleTenantId("https://example.test/lfos_demo_tenant_layout"), /lfos_/);
});

test("AIControlRule factory returns immutable tenant-scoped rules", () => {
  const rule = createAIControlRule({
    rule_id: " air_synthetic_rule_001 ",
    tenant_id: " lfos_demo_tenant_layout ",
    scope: "implementation_handoff",
    effective_status: "active",
    allowed_actions: ["read_context", "draft_plan", "draft_code", "recommend_fix", "summarize_evidence"],
    forbidden_actions: [...AI_FORBIDDEN_ACTION_VALUES],
    review_required_when: {
      sensitive_action: true,
      production_data_access: true,
      client_facing_output: true,
      finance_action: true,
      external_share: true,
      missing_evidence: true,
      p0_p1_finding: true,
    },
    blocked_claim_refs: [],
    audit_event_ref: "audit.synthetic.ai_rule.created",
    created_at: "2026-06-03T00:00:00.000Z",
    updated_at: "2026-06-03T00:00:00.000Z",
  });

  assert.equal(validateAIControlRule(rule), true);
  assert.equal(Object.isFrozen(rule), true);
  assert.equal(Object.isFrozen(rule.allowed_actions), true);
  assert.equal(Object.isFrozen(rule.forbidden_actions), true);
  assert.equal(Object.isFrozen(rule.review_required_when), true);
  assert.equal(Object.isFrozen(rule.blocked_claim_refs), true);
  assert.equal(rule.rule_id, "air_synthetic_rule_001");
  assert.equal(rule.tenant_id, "lfos_demo_tenant_layout");
  assert.equal(assertAIControlRuleTenantScope(rule, "lfos_demo_tenant_layout"), true);
  assert.equal(assertAIControlRuleTenantScope(rule, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.throws(() => assertAIControlRuleTenantScope(rule, { tenant_id: "lfos_demo_tenant_other" }), /tenant scope context/);
});

test("AIControlRule validation fails closed on unsafe authority claims", () => {
  const valid = {
    rule_id: "air_synthetic_rule_002",
    tenant_id: "lfos_demo_tenant_layout",
    scope: "implementation_handoff",
    effective_status: "active",
    allowed_actions: ["read_context", "draft_plan"],
    forbidden_actions: [...AI_FORBIDDEN_ACTION_VALUES],
    review_required_when: {
      sensitive_action: true,
      production_data_access: true,
      client_facing_output: true,
      finance_action: true,
      external_share: true,
      missing_evidence: true,
      p0_p1_finding: true,
    },
    blocked_claim_refs: [],
    audit_event_ref: "audit.synthetic.ai_rule.created",
    created_at: "2026-06-03T00:00:00.000Z",
    updated_at: "2026-06-03T00:00:00.000Z",
  };

  assert.throws(() => validateAIControlRule({ ...valid, rule_id: "bad_001" }), /air_/);
  assert.throws(() => validateAIControlRule({ ...valid, rule_id: " air_synthetic_rule_002 " }), /stored without/);
  assert.throws(() => validateAIControlRule({ ...valid, rule_id: "air_synthetic-rule-002" }), /canonical/);
  assert.throws(() => validateAIControlRule({ ...valid, tenant_id: "t_other" }), /lfos_/);
  assert.throws(() => validateAIControlRule({ ...valid, tenant_id: " lfos_demo_tenant_layout " }), /stored without/);
  assert.throws(() => validateAIControlRule({ ...valid, effective_status: "enabled" }), /effective_status/);
  assert.throws(() => validateAIControlRule({ ...valid, allowed_actions: ["write_production_data"] }), /unknown value/);
  assert.throws(
    () => validateAIControlRule({ ...valid, forbidden_actions: ["write_production_data"] }),
    /approve_human_gate/,
  );
  assert.throws(
    () => validateAIControlRule({ ...valid, review_required_when: { ...valid.review_required_when, missing_evidence: false } }),
    /missing_evidence/,
  );
  assert.throws(() => validateAIControlRule({ ...valid, audit_event_ref: "" }), /audit_event_ref/);
});

test("synthetic fixture is explicitly marked and stays on reserved example domains", async () => {
  const fixtureUrl = new URL("../fixtures/synthetic-control-plane.json", import.meta.url);
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.no_real_data, true);
  assert.equal(fixture.subphase_id, "RP00.P01.M00.S01");
  assert.equal(fixture.boundary.writes_product_state, false);
  assert.equal(fixture.boundary.uses_real_client_matter_document_or_billing_data, false);
  assert.equal(fixture.tenant.email_domain, "example.test");
  assert.deepEqual(fixture.owned_entities, CONTROL_PLANE_ENTITY_NAMES);
  assert.equal(validateProductContract(fixture.product_contract), true);
  assert.equal(fixture.ai_control_rule_identifier.rule_id, fixture.ai_control_rule.rule_id);
  assert.equal(fixture.ai_control_rule_identifier.policy_ref, "AI_CONTROL_RULE_IDENTIFIER_POLICY");
  assert.equal(fixture.ai_control_rule_identifier.subphase_id, "RP00.P01.M02.S02");
  assert.equal(validateAIControlRuleId(fixture.ai_control_rule_identifier.rule_id), true);
  assert.equal(fixture.ai_control_rule_tenant_scope.tenant_id, fixture.ai_control_rule.tenant_id);
  assert.equal(fixture.ai_control_rule_tenant_scope.policy_ref, "AI_CONTROL_RULE_TENANT_SCOPE_POLICY");
  assert.equal(fixture.ai_control_rule_tenant_scope.subphase_id, "RP00.P01.M02.S03");
  assert.equal(validateAIControlRuleTenantId(fixture.ai_control_rule_tenant_scope.tenant_id), true);
  assert.equal(assertAIControlRuleTenantScope(fixture.ai_control_rule, fixture.tenant), true);
  assert.equal(fixture.claude_review_gate_package_layout.subphase_id, "RP00.P01.M04.S01");
  assert.equal(fixture.claude_review_gate_package_layout.expected_entity, "ClaudeReviewGate");
  assert.equal(fixture.claude_review_gate_package_layout.implemented_model, false);
  assert.deepEqual(fixture.claude_review_gate_package_layout.future_model_subphases, [
    "RP00.P01.M04.S02",
    "RP00.P01.M04.S03",
    "RP00.P01.M04.S04",
  ]);
  assert.equal(fixture.claude_review_gate_package_layout.no_real_data, true);
  assert.equal(fixture.claude_review_gate_package_layout.writes_product_state, false);
  assert.equal(fixture.claude_review_gate_package_layout.next_subphase, "RP00.P01.M04.S02");
  assert.equal(fixture.claude_review_gate_identifier.review_id, "crg_rp00_c00_control_plane_review");
  assert.equal(fixture.claude_review_gate_identifier.policy_ref, "CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY");
  assert.equal(fixture.claude_review_gate_identifier.subphase_id, "RP00.P01.M04.S02");
  assert.equal(validateClaudeReviewGateId(fixture.claude_review_gate_identifier.review_id), true);
  assert.equal(fixture.claude_review_gate_identifier.tenant_scope_deferred_to, "RP00.P01.M04.S03");
  assert.equal(fixture.claude_review_gate_identifier.matter_trace_deferred_to, "RP00.P01.M04.S04");
  assert.equal(fixture.claude_review_gate_identifier.next_subphase, "RP00.P01.M04.S03");
  assert.equal(fixture.claude_review_gate_tenant_scope.review_id, fixture.claude_review_gate_identifier.review_id);
  assert.equal(fixture.claude_review_gate_tenant_scope.policy_ref, "CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY");
  assert.equal(fixture.claude_review_gate_tenant_scope.subphase_id, "RP00.P01.M04.S03");
  assert.equal(fixture.claude_review_gate_tenant_scope.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.claude_review_gate_tenant_scope.tenant_scoped_by_default, false);
  assert.equal(fixture.claude_review_gate_tenant_scope.nullable_for_firm_level_reviews, true);
  assert.equal(fixture.claude_review_gate_tenant_scope.required_when_tenant_context_present, true);
  assert.equal(validateClaudeReviewGateTenantId(fixture.claude_review_gate_tenant_scope.tenant_id), true);
  assert.equal(assertClaudeReviewGateTenantScope(fixture.claude_review_gate_tenant_scope, fixture.tenant), true);
  assert.equal(fixture.claude_review_gate_tenant_scope.matter_trace_deferred_to, "RP00.P01.M04.S04");
  assert.equal(fixture.claude_review_gate_tenant_scope.next_subphase, "RP00.P01.M04.S04");
  assert.equal(fixture.claude_review_gate_matter_trace.review_id, fixture.claude_review_gate_identifier.review_id);
  assert.equal(fixture.claude_review_gate_matter_trace.policy_ref, "CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY");
  assert.equal(fixture.claude_review_gate_matter_trace.subphase_id, "RP00.P01.M04.S04");
  assert.equal(fixture.claude_review_gate_matter_trace.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.claude_review_gate_matter_trace.matter_id, null);
  assert.equal(fixture.claude_review_gate_matter_trace.nullable_for_firm_level_reviews, true);
  assert.equal(validateClaudeReviewGateMatterId(fixture.claude_review_gate_matter_trace.matter_id), true);
  assert.equal(assertClaudeReviewGateMatterTrace(fixture.claude_review_gate_matter_trace, null), true);
  assert.equal(fixture.claude_review_gate_matter_trace.next_subphase, "RP00.P01.M05.S01");
  assert.equal(fixture.human_approval_package_layout.subphase_id, "RP00.P01.M05.S01");
  assert.equal(fixture.human_approval_package_layout.policy_ref, "HUMAN_APPROVAL_PACKAGE_LAYOUT");
  assert.equal(fixture.human_approval_package_layout.expected_entity, "HumanApproval");
  assert.equal(fixture.human_approval_package_layout.implemented_model, false);
  assert.deepEqual(fixture.human_approval_package_layout.future_model_subphases, HUMAN_APPROVAL_PACKAGE_LAYOUT.futureModelSubphases);
  assert.equal(fixture.human_approval_package_layout.no_real_data, true);
  assert.equal(fixture.human_approval_package_layout.writes_product_state, false);
  assert.equal(fixture.human_approval_package_layout.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_package_layout.next_subphase, "RP00.P01.M05.S02");
  assert.equal(fixture.human_approval_identifier.approval_id, "ha_rp00_non_delegable_sensitive_closeout");
  assert.equal(fixture.human_approval_identifier.policy_ref, "HUMAN_APPROVAL_IDENTIFIER_POLICY");
  assert.equal(fixture.human_approval_identifier.subphase_id, "RP00.P01.M05.S02");
  assert.equal(validateHumanApprovalId(fixture.human_approval_identifier.approval_id), true);
  assert.equal(fixture.human_approval_identifier.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_identifier.tenant_scope_deferred_to, "RP00.P01.M05.S03");
  assert.equal(fixture.human_approval_identifier.matter_trace_deferred_to, "RP00.P01.M05.S04");
  assert.equal(fixture.human_approval_identifier.lifecycle_deferred_to, "RP00.P01.M05.S05");
  assert.equal(fixture.human_approval_identifier.next_subphase, "RP00.P01.M05.S03");
  assert.equal(fixture.human_approval_tenant_scope.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_tenant_scope.policy_ref, "HUMAN_APPROVAL_TENANT_SCOPE_POLICY");
  assert.equal(fixture.human_approval_tenant_scope.subphase_id, "RP00.P01.M05.S03");
  assert.equal(fixture.human_approval_tenant_scope.tenant_id, fixture.tenant.tenant_id);
  assert.equal(validateHumanApprovalTenantId(fixture.human_approval_tenant_scope.tenant_id), true);
  assert.equal(assertHumanApprovalTenantScope(fixture.human_approval_tenant_scope, fixture.tenant), true);
  assert.equal(fixture.human_approval_tenant_scope.required, true);
  assert.equal(fixture.human_approval_tenant_scope.same_tenant_required, true);
  assert.equal(fixture.human_approval_tenant_scope.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_tenant_scope.matter_trace_deferred_to, "RP00.P01.M05.S04");
  assert.equal(fixture.human_approval_tenant_scope.lifecycle_deferred_to, "RP00.P01.M05.S05");
  assert.equal(fixture.human_approval_tenant_scope.next_subphase, "RP00.P01.M05.S04");
  assert.equal(fixture.human_approval_matter_trace.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_matter_trace.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.human_approval_matter_trace.policy_ref, "HUMAN_APPROVAL_MATTER_TRACE_POLICY");
  assert.equal(fixture.human_approval_matter_trace.subphase_id, "RP00.P01.M05.S04");
  assert.equal(fixture.human_approval_matter_trace.matter_id, null);
  assert.equal(fixture.human_approval_matter_trace.nullable_for_firm_level_approvals, true);
  assert.equal(validateHumanApprovalMatterId(fixture.human_approval_matter_trace.matter_id), true);
  assert.equal(assertHumanApprovalMatterTrace(fixture.human_approval_matter_trace, null), true);
  assert.equal(fixture.human_approval_matter_trace.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_matter_trace.lifecycle_deferred_to, "RP00.P01.M05.S05");
  assert.equal(fixture.human_approval_matter_trace.next_subphase, "RP00.P01.M05.S05");
  assert.equal(fixture.human_approval_lifecycle_status.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_lifecycle_status.policy_ref, "HUMAN_APPROVAL_STATUS_POLICY");
  assert.equal(fixture.human_approval_lifecycle_status.subphase_id, "RP00.P01.M05.S05");
  assert.equal(fixture.human_approval_lifecycle_status.status, "draft");
  assert.deepEqual(fixture.human_approval_lifecycle_status.status_values, HUMAN_APPROVAL_STATUS_VALUES);
  assert.deepEqual(fixture.human_approval_lifecycle_status.terminal_statuses, HUMAN_APPROVAL_STATUS_POLICY.terminalStatuses);
  assert.equal(validateHumanApprovalStatus(fixture.human_approval_lifecycle_status.status), true);
  assert.equal(fixture.human_approval_lifecycle_status.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_lifecycle_status.transition_map_deferred_to, "RP00.P01.M05.S10");
  assert.equal(fixture.human_approval_lifecycle_status.validation_helper_completion_subphase, "RP00.P01.M05.S11");
  assert.equal(fixture.human_approval_lifecycle_status.next_subphase, "RP00.P01.M05.S06");
  assert.equal(fixture.human_approval_ownership_metadata.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_ownership_metadata.policy_ref, "HUMAN_APPROVAL_OWNERSHIP_POLICY");
  assert.equal(fixture.human_approval_ownership_metadata.subphase_id, "RP00.P01.M05.S06");
  assert.equal(fixture.human_approval_ownership_metadata.owner_module, "packages/control-plane");
  assert.equal(fixture.human_approval_ownership_metadata.owner_role, "human_approval_process_owner");
  assert.deepEqual(fixture.human_approval_ownership_metadata.owner_role_values, HUMAN_APPROVAL_OWNER_ROLE_VALUES);
  assert.equal(fixture.human_approval_ownership_metadata.steward_ref, "owner.synthetic_human_approval_steward");
  assert.equal(fixture.human_approval_ownership_metadata.correction_route, "blocked_claim.human_approval_ownership_correction");
  assert.equal(fixture.human_approval_ownership_metadata.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_ownership_metadata.may_not_mutate.includes("human_approval_decisions"), true);
  assert.equal(fixture.human_approval_ownership_metadata.reference_relationship_map_deferred_to, "RP00.P01.M05.S07");
  assert.equal(fixture.human_approval_ownership_metadata.required_field_registry_deferred_to, "RP00.P01.M05.S08");
  assert.equal(fixture.human_approval_ownership_metadata.state_transition_map_deferred_to, "RP00.P01.M05.S10");
  assert.equal(fixture.human_approval_ownership_metadata.validation_helper_completion_subphase, "RP00.P01.M05.S11");
  assert.equal(validateHumanApprovalOwnershipMetadata(fixture.human_approval_ownership_metadata), true);
  assert.equal(fixture.human_approval_ownership_metadata.next_subphase, "RP00.P01.M05.S07");
  assert.equal(fixture.human_approval_reference_relationship_map.policy_ref, "HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY");
  assert.equal(fixture.human_approval_reference_relationship_map.subphase_id, "RP00.P01.M05.S07");
  assert.equal(fixture.human_approval_reference_relationship_map.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_reference_relationship_map.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.human_approval_reference_relationship_map.matter_id, null);
  assert.equal(fixture.human_approval_reference_relationship_map.audit_event_ref, "audit.synthetic.human_approval.relationship_map");
  assert.deepEqual(fixture.human_approval_reference_relationship_map.target_entities, HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS);
  assert.equal(fixture.human_approval_reference_relationship_map.blocked_claim_refs.includes("blocked_claim.human_approval_ownership_correction"), true);
  assert.equal(fixture.human_approval_reference_relationship_map.hermes_gate_refs.includes("hermes_gate.synthetic_h00_control_plane"), true);
  assert.equal(fixture.human_approval_reference_relationship_map.claude_review_gate_refs.includes("claude_review_gate.synthetic_c00_control_plane_review"), true);
  assert.equal(validateHumanApprovalReferenceRelationships(fixture.human_approval_reference_relationship_map, fixture.tenant), true);
  assert.equal(fixture.human_approval_required_field_registry.policy_ref, "HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY");
  assert.equal(fixture.human_approval_required_field_registry.subphase_id, "RP00.P01.M05.S08");
  assert.equal(fixture.human_approval_required_field_registry.approval_id, fixture.human_approval_identifier.approval_id);
  assert.deepEqual(fixture.human_approval_required_field_registry.required_fields, HUMAN_APPROVAL_REQUIRED_FIELDS);
  assert.equal(fixture.human_approval_required_field_registry.required_field_count, HUMAN_APPROVAL_REQUIRED_FIELDS.length);
  assert.equal(fixture.human_approval_required_field_registry.required_record.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_required_field_registry.required_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.human_approval_required_field_registry.required_record.audit_event_ref, "audit.synthetic.human_approval.required_fields");
  assert.equal(validateHumanApprovalRequiredFields(fixture.human_approval_required_field_registry.required_record), true);
  assert.equal(fixture.human_approval_optional_field_registry.policy_ref, "HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY");
  assert.equal(fixture.human_approval_optional_field_registry.subphase_id, "RP00.P01.M05.S09");
  assert.equal(fixture.human_approval_optional_field_registry.approval_id, fixture.human_approval_identifier.approval_id);
  assert.deepEqual(fixture.human_approval_optional_field_registry.optional_fields, HUMAN_APPROVAL_OPTIONAL_FIELDS);
  assert.equal(fixture.human_approval_optional_field_registry.optional_field_count, HUMAN_APPROVAL_OPTIONAL_FIELDS.length);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.matter_id, null);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.blocked_claim_refs.includes("blocked_claim.human_approval_ownership_correction"), true);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.hermes_gate_refs.includes("hermes_gate.synthetic_h00_control_plane"), true);
  assert.equal(fixture.human_approval_optional_field_registry.optional_record.claude_review_gate_refs.includes("claude_review_gate.synthetic_c00_control_plane_review"), true);
  assert.equal(fixture.human_approval_optional_field_registry.empty_optional_record_allowed, true);
  assert.equal(fixture.human_approval_optional_field_registry.cannot_synthesize_human_approval, true);
  assert.equal(validateHumanApprovalOptionalFields(fixture.human_approval_optional_field_registry.optional_record), true);
  assert.equal(validateHumanApprovalOptionalFields({}), true);
  assert.equal(fixture.human_approval_state_transition_map.policy_ref, "HUMAN_APPROVAL_STATE_TRANSITION_MAP");
  assert.equal(fixture.human_approval_state_transition_map.subphase_id, "RP00.P01.M05.S10");
  assert.equal(fixture.human_approval_state_transition_map.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_state_transition_map.status_field, "status");
  assert.equal(fixture.human_approval_state_transition_map.initial_status, "draft");
  assert.deepEqual(fixture.human_approval_state_transition_map.terminal_statuses, ["production_ready", "blocked"]);
  assert.deepEqual(
    fixture.human_approval_state_transition_map.allowed_transitions,
    HUMAN_APPROVAL_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => ({
      from: transition.from,
      to: [...transition.to],
    })),
  );
  assert.equal(fixture.human_approval_state_transition_map.transition_edge_count, HUMAN_APPROVAL_STATE_TRANSITION_MAP.transitionEdges.length);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.no_skipped_gates, true);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.no_backward_transitions, true);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.production_ready_requires_final_validation, true);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.blocked_requires_blocked_claim, true);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.terminal_statuses_cannot_transition, true);
  assert.equal(fixture.human_approval_state_transition_map.guard_policy.human_approval_cannot_be_synthesized, true);
  assert.equal(fixture.human_approval_state_transition_map.validation_helper_completion_subphase, "RP00.P01.M05.S11");
  assert.equal(fixture.human_approval_state_transition_map.no_real_data, true);
  assert.equal(fixture.human_approval_state_transition_map.writes_product_state, false);
  assert.equal(fixture.human_approval_state_transition_map.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_state_transition_map.next_subphase, "RP00.P01.M05.S11");
  assert.equal(assertHumanApprovalStatusTransition("draft", "implemented"), true);
  assert.equal(fixture.human_approval_validation_helper.policy_ref, "HUMAN_APPROVAL_VALIDATION_HELPER");
  assert.equal(fixture.human_approval_validation_helper.subphase_id, "RP00.P01.M05.S11");
  assert.equal(fixture.human_approval_validation_helper.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_validation_helper.helper_export, "validateHumanApproval");
  assert.equal(fixture.human_approval_validation_helper.transition_evidence_export, "assertHumanApprovalTransitionEvidence");
  assert.deepEqual(fixture.human_approval_validation_helper.transition_evidence_keys, HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS);
  assert.deepEqual(fixture.human_approval_validation_helper.validates_subphases, HUMAN_APPROVAL_VALIDATION_HELPER.validatesSubphases);
  assert.equal(fixture.human_approval_validation_helper.validation_record.approval_id, fixture.human_approval_identifier.approval_id);
  assert.equal(fixture.human_approval_validation_helper.validation_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.human_approval_validation_helper.validation_record.status, "production_ready");
  assert.equal(fixture.human_approval_validation_helper.transition_from_status, "construction_inspected");
  assert.equal(fixture.human_approval_validation_helper.transition_to_status, "production_ready");
  assert.equal(fixture.human_approval_validation_helper.transition_evidence.final_validation_rerun, true);
  assert.equal(fixture.human_approval_validation_helper.enforcement_policy.transition_evidence, true);
  assert.equal(fixture.human_approval_validation_helper.enforcement_policy.human_approval_cannot_be_synthesized, true);
  assert.equal(fixture.human_approval_validation_helper.no_real_data, true);
  assert.equal(fixture.human_approval_validation_helper.writes_product_state, false);
  assert.equal(fixture.human_approval_validation_helper.cannot_synthesize_human_approval, true);
  assert.equal(fixture.human_approval_validation_helper.completes_human_approval_model, true);
  assert.equal(fixture.human_approval_validation_helper.next_subphase, "RP00.P01.M06.S01");
  assert.equal(
    validateHumanApproval(fixture.human_approval_validation_helper.validation_record, {
      tenantContext: fixture.tenant,
      fromStatus: fixture.human_approval_validation_helper.transition_from_status,
      evidence: fixture.human_approval_validation_helper.transition_evidence,
    }),
    true,
  );
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.policy_ref, "CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT");
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.subphase_id, "RP00.P01.M06.S01");
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.fixture_set_name, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.fixtureSetName);
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.fixture_directory, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.fixtureDirectory);
  assert.deepEqual(fixture.control_plane_synthetic_fixture_set_layout.fixture_files, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.fixtureFiles);
  assert.deepEqual(fixture.control_plane_synthetic_fixture_set_layout.required_fixture_markers, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.requiredFixtureMarkers);
  assert.deepEqual(fixture.control_plane_synthetic_fixture_set_layout.future_fixture_subphases, CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT.futureFixtureSubphases);
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.synthetic_only_policy_subphase, "RP00.P00.M06.S01");
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.synthetic, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.no_real_data, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.writes_product_state, false);
  assert.equal(fixture.control_plane_synthetic_fixture_set_layout.next_subphase, "RP00.P01.M06.S02");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.policy_ref, "CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.subphase_id, "RP00.P01.M06.S02");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.field, "fixture_set_id");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.fixture_set_id, fixture.control_plane_synthetic_fixture_set_layout.fixture_set_id);
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.stable_prefix, "fs_");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.canonical, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.matches_layout_record, true);
  assert.equal(validateControlPlaneSyntheticFixtureSetId(fixture.control_plane_synthetic_fixture_set_identifier.fixture_set_id), true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.no_real_data, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.writes_product_state, false);
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.tenant_scope_deferred_to, "RP00.P01.M06.S03");
  assert.equal(fixture.control_plane_synthetic_fixture_set_identifier.next_subphase, "RP00.P01.M06.S03");
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.policy_ref, "CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY");
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.subphase_id, "RP00.P01.M06.S03");
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.fixture_set_id, fixture.control_plane_synthetic_fixture_set_identifier.fixture_set_id);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.field, "tenant_id");
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.stable_prefix, "lfos_");
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.required, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.same_tenant_required, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.matches_identifier_record, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.matches_tenant_record, true);
  assert.equal(validateControlPlaneSyntheticFixtureSetTenantId(fixture.control_plane_synthetic_fixture_set_tenant_scope.tenant_id), true);
  assert.equal(assertControlPlaneSyntheticFixtureSetTenantScope(fixture.control_plane_synthetic_fixture_set_tenant_scope, fixture.tenant), true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.synthetic, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.no_real_data, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.writes_product_state, false);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.completes_synthetic_fixture_set, true);
  assert.equal(fixture.control_plane_synthetic_fixture_set_tenant_scope.next_subphase, "RP00.P01.M07.S01");
  assert.equal(fixture.control_plane_state_enum_registry_layout.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT");
  assert.equal(fixture.control_plane_state_enum_registry_layout.subphase_id, "RP00.P01.M07.S01");
  assert.equal(fixture.control_plane_state_enum_registry_layout.registry_name, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.registryName);
  assert.equal(fixture.control_plane_state_enum_registry_layout.enum_source_file, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.enumSourceFile);
  assert.equal(fixture.control_plane_state_enum_registry_layout.registry_file, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.registryFile);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.target_files, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.targetFiles);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.target_tests, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.targetTests);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.fixture_files, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.fixtureFiles);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.covered_enum_families, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.coveredEnumFamilies);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.enum_family_future_subphase_map, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.enumFamilyFutureSubphaseMap);
  assert.deepEqual(fixture.control_plane_state_enum_registry_layout.future_enum_subphases, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.futureEnumSubphases);
  assert.equal(fixture.control_plane_state_enum_registry_layout.registry_id, "ser_control_plane_state_enum_registry");
  assert.equal(fixture.control_plane_state_enum_registry_layout.binds_preexisting_enum_exports, true);
  assert.equal(fixture.control_plane_state_enum_registry_layout.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_layout.implements_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_layout.value_definition_scope, CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT.valueDefinitionScope);
  assert.equal(fixture.control_plane_state_enum_registry_layout.synthetic, true);
  assert.equal(fixture.control_plane_state_enum_registry_layout.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_layout.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_layout.next_subphase, "RP00.P01.M07.S02");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.subphase_id, "RP00.P01.M07.S02");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.field, "registry_id");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.registry_id, "ser_control_plane_state_enum_registry");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.stable_prefix, "ser_");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.canonical_pattern, CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.canonicalPattern);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.canonical, true);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.matches_layout_record, true);
  assert.equal(validateControlPlaneStateEnumRegistryId(fixture.control_plane_state_enum_registry_identifier.registry_id), true);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.synthetic, true);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_identifier.tenant_scope_deferred_to, "RP00.P01.M07.S03");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.matter_trace_deferred_to, "RP00.P01.M07.S04");
  assert.equal(fixture.control_plane_state_enum_registry_identifier.next_subphase, "RP00.P01.M07.S03");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.subphase_id, "RP00.P01.M07.S03");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.stable_prefix, "lfos_");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.canonical_pattern, CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.canonicalPattern);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.matches_tenant_record, true);
  assert.equal(validateControlPlaneStateEnumRegistryTenantId(fixture.control_plane_state_enum_registry_tenant_scope.tenant_id), true);
  assert.equal(assertControlPlaneStateEnumRegistryTenantScope(fixture.control_plane_state_enum_registry_tenant_scope, fixture.tenant), true);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.canonical, true);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.synthetic, true);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.matter_trace_deferred_to, "RP00.P01.M07.S04");
  assert.equal(fixture.control_plane_state_enum_registry_tenant_scope.next_subphase, "RP00.P01.M07.S04");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.subphase_id, "RP00.P01.M07.S04");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.field, "matter_id");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.matter_id, null);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.target_entity, "Matter");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.nullable_for_firm_level_registry, true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.stable_prefix, "matter_");
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.canonical_pattern, CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.canonicalPattern);
  assert.deepEqual(fixture.control_plane_state_enum_registry_matter_trace.matter_context_required_when, CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.requiredWhen);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.matches_tenant_record, true);
  assert.equal(validateControlPlaneStateEnumRegistryMatterId(fixture.control_plane_state_enum_registry_matter_trace.matter_id), true);
  assert.equal(assertControlPlaneStateEnumRegistryMatterTrace(fixture.control_plane_state_enum_registry_matter_trace, null), true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.canonical, true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.synthetic, true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_matter_trace.next_subphase, "RP00.P01.M07.S05");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.subphase_id, "RP00.P01.M07.S05");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.field, "status");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.matter_id, null);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.status, "draft");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.source_enum, "CONTROL_PLANE_LIFECYCLE_STATES");
  assert.deepEqual(fixture.control_plane_state_enum_registry_lifecycle_status.status_values, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES);
  assert.deepEqual(fixture.control_plane_state_enum_registry_lifecycle_status.terminal_statuses, CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.terminalStatuses);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.matches_tenant_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.matches_matter_trace_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.transition_map_deferred_to, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(validateControlPlaneStateEnumRegistryStatus(fixture.control_plane_state_enum_registry_lifecycle_status.status), true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_lifecycle_status.next_subphase, "RP00.P01.M07.S06");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.subphase_id, "RP00.P01.M07.S06");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.field, "ownership_metadata");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.matter_id, null);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.status, "draft");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.owner_module, "packages/control-plane");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.owner_role, "state_enum_registry_owner");
  assert.deepEqual(fixture.control_plane_state_enum_registry_ownership_metadata.owner_role_values, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.steward_ref, "owner.synthetic_state_enum_registry_steward");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.correction_route, "blocked_claim.state_enum_registry_ownership_correction");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.correction_route_required, true);
  assert.deepEqual(fixture.control_plane_state_enum_registry_ownership_metadata.may_reference, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference);
  assert.deepEqual(fixture.control_plane_state_enum_registry_ownership_metadata.may_not_mutate, CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.matches_tenant_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.matches_matter_trace_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.matches_lifecycle_status_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.reference_relationship_map_deferred_to, "RP00.P01.M07.S07");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.required_field_registry_deferred_to, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.optional_field_registry_deferred_to, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.state_transition_map_deferred_to, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(validateControlPlaneStateEnumRegistryOwnershipMetadata(fixture.control_plane_state_enum_registry_ownership_metadata), true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_ownership_metadata.next_subphase, "RP00.P01.M07.S07");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.subphase_id, "RP00.P01.M07.S07");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matter_id, null);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.audit_event_ref, "audit.synthetic.state_enum_registry.relationship_map");
  assert.deepEqual(fixture.control_plane_state_enum_registry_reference_relationship_map.target_entities, CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS);
  assert.deepEqual(fixture.control_plane_state_enum_registry_reference_relationship_map.relationship_fields, CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY.relationshipFields);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.blocked_claim_refs.includes("blocked_claim.state_enum_registry_ownership_correction"), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.product_contract_refs.includes(fixture.product_contract.contract_id), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.ai_control_rule_refs.includes(fixture.ai_control_rule.rule_id), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.hermes_gate_refs.includes("hermes_gate.synthetic_h00_control_plane"), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.claude_review_gate_refs.includes("claude_review_gate.synthetic_c00_control_plane_review"), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.human_approval_refs.includes("human_approval.synthetic_control_plane_boundary"), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_tenant_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_matter_trace_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_lifecycle_status_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_ownership_metadata_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_product_contract_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.matches_ai_control_rule_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.reference_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.cannot_mutate_referenced_targets, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.cannot_bypass_hermes_or_claude, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.cannot_approve_human_gate, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.required_field_registry_deferred_to, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.optional_field_registry_deferred_to, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.state_transition_map_deferred_to, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(validateControlPlaneStateEnumRegistryReferenceRelationships(fixture.control_plane_state_enum_registry_reference_relationship_map), true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_reference_relationship_map.next_subphase, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.subphase_id, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.status, fixture.control_plane_state_enum_registry_lifecycle_status.status);
  assert.deepEqual(fixture.control_plane_state_enum_registry_required_field_registry.required_fields, CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.required_field_count, CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS.length);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.required_record.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.required_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.required_record.audit_event_ref, "audit.synthetic.state_enum_registry.required_fields");
  assert.equal(validateControlPlaneStateEnumRegistryRequiredFields(fixture.control_plane_state_enum_registry_required_field_registry.required_record), true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.optional_fields_excluded.includes("matter_id"), true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.optional_fields_excluded.includes("product_contract_refs"), true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.matches_tenant_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.matches_lifecycle_status_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.matches_ownership_metadata_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.matches_reference_relationship_map, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.blocked_claim_relationship_pattern_deferred_to, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.optional_field_registry_deferred_to, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.state_transition_map_deferred_to, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.cannot_define_enum_values, true);
  assert.equal(fixture.control_plane_state_enum_registry_required_field_registry.next_subphase, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.subphase_id, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.source_micro_phase_id, "RP00.P01.M07");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.tenant_id, fixture.tenant.tenant_id);
  assert.deepEqual(fixture.control_plane_state_enum_registry_optional_field_registry.optional_fields, CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_field_count, CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS.length);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record.matter_id, null);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record.product_contract_refs.includes(fixture.product_contract.contract_id), true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record.ai_control_rule_refs.includes(fixture.ai_control_rule.rule_id), true);
  assert.equal(validateControlPlaneStateEnumRegistryOptionalFields(fixture.control_plane_state_enum_registry_optional_field_registry.optional_record), true);
  assert.equal(validateControlPlaneStateEnumRegistryOptionalFields({}), true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.matches_tenant_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.matches_matter_trace_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.matches_reference_relationship_map, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.required_field_registry_completed_in, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.state_transition_map_deferred_to, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.reference_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.cannot_mutate_referenced_targets, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.cannot_bypass_hermes_or_claude, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.cannot_approve_human_gate, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.cannot_define_enum_values, true);
  assert.equal(fixture.control_plane_state_enum_registry_optional_field_registry.next_subphase, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.subphase_id, "RP00.P01.M07.S10");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.deepEqual(
    fixture.control_plane_state_enum_registry_state_transition_map.allowed_transitions,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => ({
      from: transition.from,
      to: [...transition.to],
    })),
  );
  assert.equal(
    fixture.control_plane_state_enum_registry_state_transition_map.transition_edge_count,
    CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.transitionEdges.length,
  );
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.valid_closeout_transition, "construction_inspected_to_production_ready");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.invalid_skip_transition, "draft_to_production_ready");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.invalid_terminal_transition, "production_ready_to_blocked");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.no_skipped_gates, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.no_backward_transitions, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.production_ready_requires_final_validation, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.blocked_requires_blocked_claim, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.terminal_statuses_cannot_transition, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.guard_policy.human_approval_cannot_be_synthesized, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.matches_lifecycle_status_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.required_field_registry_completed_in, "RP00.P01.M07.S08");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.optional_field_registry_completed_in, "RP00.P01.M07.S09");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.validation_helper_completion_subphase, "RP00.P01.M07.S11");
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.synthetic_only, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.cannot_define_enum_values, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.cannot_synthesize_human_approval, true);
  assert.equal(fixture.control_plane_state_enum_registry_state_transition_map.next_subphase, "RP00.P01.M07.S11");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.subphase_id, "RP00.P01.M07.S11");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.policy_ref, "CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.deepEqual(fixture.control_plane_state_enum_registry_validation_helper.validated_subphases, CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER.validatesSubphases);
  assert.deepEqual(fixture.control_plane_state_enum_registry_validation_helper.transition_evidence_keys, CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.validation_record.registry_id, fixture.control_plane_state_enum_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.validation_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.validation_record.status, "production_ready");
  assert.equal(
    validateControlPlaneStateEnumRegistry(fixture.control_plane_state_enum_registry_validation_helper.validation_record, {
      tenantContext: fixture.tenant.tenant_id,
      fromStatus: fixture.control_plane_state_enum_registry_validation_helper.transition_from_status,
      evidence: fixture.control_plane_state_enum_registry_validation_helper.transition_evidence,
    }),
    true,
  );
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.transition_evidence.final_validation_rerun, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.invalid_missing_evidence_transition, "construction_inspected_to_production_ready_without_final_validation");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.invalid_skipped_transition, "draft_to_production_ready");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.invalid_terminal_transition, "production_ready_to_blocked");
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.matches_identifier_record, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.matches_fixture_tenant, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.no_real_data, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.writes_product_state, false);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.defines_new_enum_values, false);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.cannot_define_enum_values, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.cannot_synthesize_human_approval, true);
  assert.equal(fixture.control_plane_state_enum_registry_validation_helper.next_subphase, "RP00.P01.M08.S01");
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.subphase_id, "RP00.P01.M08.S01");
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.policy_ref, "CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT");
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.packet_name, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.packetName);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.expected_surface, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.expectedSurface);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.target_files, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.targetFiles);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.target_tests, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.targetTests);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.fixture_files, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.fixtureFiles);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.command_receipt_fields, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.commandReceiptFields);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.required_packet_fields, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.requiredPacketFields);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.relationship_targets, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.relationshipTargets);
  assert.deepEqual(fixture.control_plane_hermes_evidence_packet_layout.future_packet_subphases, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT.futurePacketSubphases);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.implemented_packet_identifier, false);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.implemented_tenant_scope, false);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.does_not_mutate_entity_registry, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.no_real_data, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.writes_product_state, false);
  assert.equal(fixture.control_plane_hermes_evidence_packet_layout.next_subphase, "RP00.P01.M08.S02");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.subphase_id, "RP00.P01.M08.S02");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.policy_ref, "CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.field, "packet_id");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.packet_id, "hep_rp00_h00_control_plane_evidence_packet");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.stable_prefix, "hep_");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.canonical_pattern, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.canonicalPattern);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.canonical, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.matches_layout_record, true);
  assert.equal(
    fixture.control_plane_hermes_evidence_packet_layout.required_packet_fields.includes(fixture.control_plane_hermes_evidence_packet_identifier.field),
    true,
  );
  assert.equal(validateControlPlaneHermesEvidencePacketId(fixture.control_plane_hermes_evidence_packet_identifier.packet_id), true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.synthetic, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.no_real_data, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.writes_product_state, false);
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.tenant_scope_deferred_to, "RP00.P01.M08.S03");
  assert.equal(fixture.control_plane_hermes_evidence_packet_identifier.next_subphase, "RP00.P01.M08.S03");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.subphase_id, "RP00.P01.M08.S03");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.policy_ref, "CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.field, "tenant_id");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.target_entity, "Tenant");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.packet_id, fixture.control_plane_hermes_evidence_packet_identifier.packet_id);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.tenant_id, "lfos_demo_tenant_layout");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.stable_prefix, "lfos_");
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.canonical_pattern, CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.canonicalPattern);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.same_tenant_required, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.matches_layout_record, true);
  assert.equal(
    fixture.control_plane_hermes_evidence_packet_layout.required_packet_fields.includes(fixture.control_plane_hermes_evidence_packet_tenant_scope.field),
    true,
  );
  assert.equal(assertControlPlaneHermesEvidencePacketTenantScope(fixture.control_plane_hermes_evidence_packet_tenant_scope, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.synthetic, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.no_real_data, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.writes_product_state, false);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.completes_hermes_evidence_packet, true);
  assert.equal(fixture.control_plane_hermes_evidence_packet_tenant_scope.next_subphase, "RP00.P01.M09.S01");
  assert.equal(fixture.control_plane_export_model_registry_layout.subphase_id, "RP00.P01.M09.S01");
  assert.equal(fixture.control_plane_export_model_registry_layout.policy_ref, "CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT");
  assert.equal(fixture.control_plane_export_model_registry_layout.registry_name, "control_plane_export_model_registry");
  assert.equal(fixture.control_plane_export_model_registry_layout.expected_surface, "ControlPlaneExportModelRegistry");
  assert.deepEqual(fixture.control_plane_export_model_registry_layout.export_modules, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.exportModules);
  assert.deepEqual(fixture.control_plane_export_model_registry_layout.required_export_groups, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.requiredExportGroups);
  assert.deepEqual(fixture.control_plane_export_model_registry_layout.required_registry_fields, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.requiredRegistryFields);
  assert.deepEqual(fixture.control_plane_export_model_registry_layout.future_registry_subphases, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT.futureRegistrySubphases);
  assert.equal(fixture.control_plane_export_model_registry_layout.implemented_registry_identifier, false);
  assert.equal(fixture.control_plane_export_model_registry_layout.implemented_tenant_scope, false);
  assert.equal(fixture.control_plane_export_model_registry_layout.does_not_mutate_entity_registry, true);
  assert.equal(fixture.control_plane_export_model_registry_layout.synthetic, true);
  assert.equal(fixture.control_plane_export_model_registry_layout.no_real_data, true);
  assert.equal(fixture.control_plane_export_model_registry_layout.writes_product_state, false);
  assert.equal(fixture.control_plane_export_model_registry_layout.next_subphase, "RP00.P01.M09.S02");
  assert.equal(fixture.control_plane_export_model_registry_identifier.subphase_id, "RP00.P01.M09.S02");
  assert.equal(fixture.control_plane_export_model_registry_identifier.policy_ref, "CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY");
  assert.equal(fixture.control_plane_export_model_registry_identifier.field, "registry_id");
  assert.equal(fixture.control_plane_export_model_registry_identifier.registry_id, "emr_rp00_control_plane_export_model_registry");
  assert.equal(fixture.control_plane_export_model_registry_identifier.stable_prefix, "emr_");
  assert.equal(fixture.control_plane_export_model_registry_identifier.canonical_pattern, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.canonicalPattern);
  assert.equal(validateControlPlaneExportModelRegistryId(fixture.control_plane_export_model_registry_identifier.registry_id), true);
  assert.equal(fixture.control_plane_export_model_registry_identifier.canonical, true);
  assert.equal(fixture.control_plane_export_model_registry_identifier.matches_layout_record, true);
  assert.equal(fixture.control_plane_export_model_registry_identifier.synthetic, true);
  assert.equal(fixture.control_plane_export_model_registry_identifier.no_real_data, true);
  assert.equal(fixture.control_plane_export_model_registry_identifier.writes_product_state, false);
  assert.equal(fixture.control_plane_export_model_registry_identifier.tenant_scope_deferred_to, "RP00.P01.M09.S03");
  assert.equal(fixture.control_plane_export_model_registry_identifier.next_subphase, "RP00.P01.M09.S03");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.subphase_id, "RP00.P01.M09.S03");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.policy_ref, "CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.field, "tenant_id");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.target_entity, "Tenant");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.registry_id, fixture.control_plane_export_model_registry_identifier.registry_id);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.tenant_id, "lfos_demo_tenant_layout");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.stable_prefix, "lfos_");
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.canonical_pattern, CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.canonicalPattern);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.same_tenant_required, true);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.identifier_ref, fixture.control_plane_export_model_registry_identifier.registry_id);
  assert.equal(assertControlPlaneExportModelRegistryTenantScope(fixture.control_plane_export_model_registry_tenant_scope, { tenant_id: "lfos_demo_tenant_layout" }), true);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.synthetic, true);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.no_real_data, true);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.writes_product_state, false);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.completes_export_model_registry, true);
  assert.equal(fixture.control_plane_export_model_registry_tenant_scope.next_subphase, "RP00.P01.M10.S01");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.subphase_id, "RP00.P01.M10.S01");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.policy_ref, "CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.phase_id, "RP00.P01");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.phase_title, "Domain Model");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.completed_domain_model_subphase_count, CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.length);
  assert.deepEqual(fixture.control_plane_domain_model_closeout_handoff.required_model_surfaces, CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.requiredModelSurfaces);
  assert.deepEqual(fixture.control_plane_domain_model_closeout_handoff.handoff_outputs, CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT.handoffOutputs);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.ui_verification_applicability, "not_applicable_metadata_handoff_only");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.synthetic, true);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.no_real_data, true);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.writes_product_state, false);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.does_not_mutate_entity_registry, true);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.does_not_create_service_logic, true);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.does_not_close_RP00, true);
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.next_phase, "RP00.P02");
  assert.equal(fixture.control_plane_domain_model_closeout_handoff.next_subphase, "RP00.P02.M00.S01");
  assert.equal(fixture.hermes_gate_package_layout.subphase_id, "RP00.P01.M03.S01");
  assert.equal(fixture.hermes_gate_package_layout.expected_entity, "HermesGate");
  assert.equal(fixture.hermes_gate_package_layout.implemented_model, false);
  assert.equal(fixture.hermes_gate_package_layout.next_subphase, "RP00.P01.M03.S02");
  assert.equal(fixture.hermes_gate_identifier.gate_id, "hg_rp00_h00_control_plane");
  assert.equal(fixture.hermes_gate_identifier.policy_ref, "HERMES_GATE_IDENTIFIER_POLICY");
  assert.equal(fixture.hermes_gate_identifier.subphase_id, "RP00.P01.M03.S02");
  assert.equal(validateHermesGateId(fixture.hermes_gate_identifier.gate_id), true);
  assert.equal(fixture.hermes_gate_tenant_scope.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.hermes_gate_tenant_scope.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_tenant_scope.policy_ref, "HERMES_GATE_TENANT_SCOPE_POLICY");
  assert.equal(fixture.hermes_gate_tenant_scope.subphase_id, "RP00.P01.M03.S03");
  assert.equal(validateHermesGateTenantId(fixture.hermes_gate_tenant_scope.tenant_id), true);
  assert.equal(assertHermesGateTenantScope(fixture.hermes_gate_tenant_scope, fixture.tenant), true);
  assert.equal(fixture.hermes_gate_matter_trace.policy_ref, "HERMES_GATE_MATTER_TRACE_POLICY");
  assert.equal(fixture.hermes_gate_matter_trace.subphase_id, "RP00.P01.M03.S04");
  assert.equal(fixture.hermes_gate_matter_trace.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_matter_trace.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.hermes_gate_matter_trace.matter_id, null);
  assert.equal(fixture.hermes_gate_matter_trace.nullable_for_firm_level_gates, true);
  assert.equal(assertHermesGateMatterTrace(fixture.hermes_gate_matter_trace, null), true);
  assert.equal(fixture.hermes_gate_lifecycle_status.policy_ref, "HERMES_GATE_STATUS_POLICY");
  assert.equal(fixture.hermes_gate_lifecycle_status.subphase_id, "RP00.P01.M03.S05");
  assert.equal(fixture.hermes_gate_lifecycle_status.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_lifecycle_status.status, "draft");
  assert.deepEqual(fixture.hermes_gate_lifecycle_status.status_values, HERMES_GATE_STATUS_VALUES);
  assert.equal(validateHermesGateStatus(fixture.hermes_gate_lifecycle_status.status), true);
  assert.equal(fixture.hermes_gate_ownership_metadata.policy_ref, "HERMES_GATE_OWNERSHIP_POLICY");
  assert.equal(fixture.hermes_gate_ownership_metadata.subphase_id, "RP00.P01.M03.S06");
  assert.equal(fixture.hermes_gate_ownership_metadata.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_ownership_metadata.owner_module, "packages/control-plane");
  assert.equal(fixture.hermes_gate_ownership_metadata.owner_role, "control_plane_governance_owner");
  assert.equal(fixture.hermes_gate_ownership_metadata.steward_ref, "owner.synthetic_control_plane_steward");
  assert.equal(fixture.hermes_gate_ownership_metadata.correction_route, "blocked_claim.hermes_gate_ownership_correction");
  assert.deepEqual(fixture.hermes_gate_ownership_metadata.owner_role_values, HERMES_GATE_OWNER_ROLE_VALUES);
  assert.equal(fixture.hermes_gate_ownership_metadata.may_reference.includes("BlockedClaim"), true);
  assert.equal(fixture.hermes_gate_ownership_metadata.may_not_mutate.includes("human_approval_decisions"), true);
  assert.equal(validateHermesGateOwnershipMetadata(fixture.hermes_gate_ownership_metadata), true);
  assert.equal(fixture.hermes_gate_reference_relationship_map.policy_ref, "HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY");
  assert.equal(fixture.hermes_gate_reference_relationship_map.subphase_id, "RP00.P01.M03.S07");
  assert.equal(fixture.hermes_gate_reference_relationship_map.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_reference_relationship_map.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.hermes_gate_reference_relationship_map.matter_id, null);
  assert.equal(fixture.hermes_gate_reference_relationship_map.audit_event_ref, "audit.synthetic.hermes_gate.relationship_map");
  assert.deepEqual(fixture.hermes_gate_reference_relationship_map.relationship_targets, HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS);
  assert.equal(fixture.hermes_gate_reference_relationship_map.blocked_claim_refs.includes("blocked_claim.hermes_gate_ownership_correction"), true);
  assert.equal(fixture.hermes_gate_reference_relationship_map.human_approval_refs.includes("human_approval.synthetic_control_plane_boundary"), true);
  assert.equal(validateHermesGateReferenceRelationships(fixture.hermes_gate_reference_relationship_map, fixture.tenant), true);
  assert.equal(fixture.hermes_gate_required_field_registry.policy_ref, "HERMES_GATE_REQUIRED_FIELD_REGISTRY");
  assert.equal(fixture.hermes_gate_required_field_registry.subphase_id, "RP00.P01.M03.S08");
  assert.equal(fixture.hermes_gate_required_field_registry.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.deepEqual(fixture.hermes_gate_required_field_registry.required_fields, HERMES_GATE_REQUIRED_FIELDS);
  assert.equal(fixture.hermes_gate_required_field_registry.required_field_count, HERMES_GATE_REQUIRED_FIELDS.length);
  assert.equal(fixture.hermes_gate_required_field_registry.required_record.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_required_field_registry.required_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.hermes_gate_required_field_registry.required_record.audit_event_ref, "audit.synthetic.hermes_gate.required_fields");
  assert.equal(validateHermesGateRequiredFields(fixture.hermes_gate_required_field_registry.required_record), true);
  assert.equal(fixture.hermes_gate_optional_field_registry.policy_ref, "HERMES_GATE_OPTIONAL_FIELD_REGISTRY");
  assert.equal(fixture.hermes_gate_optional_field_registry.subphase_id, "RP00.P01.M03.S09");
  assert.equal(fixture.hermes_gate_optional_field_registry.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.deepEqual(fixture.hermes_gate_optional_field_registry.optional_fields, HERMES_GATE_OPTIONAL_FIELDS);
  assert.equal(fixture.hermes_gate_optional_field_registry.optional_field_count, HERMES_GATE_OPTIONAL_FIELDS.length);
  assert.equal(fixture.hermes_gate_optional_field_registry.optional_record.tenant_id, fixture.tenant.tenant_id);
  assert.equal(fixture.hermes_gate_optional_field_registry.optional_record.matter_id, null);
  assert.equal(fixture.hermes_gate_optional_field_registry.optional_record.blocked_claim_refs.includes("blocked_claim.hermes_gate_ownership_correction"), true);
  assert.equal(fixture.hermes_gate_optional_field_registry.optional_record.human_approval_refs.includes("human_approval.synthetic_control_plane_boundary"), true);
  assert.equal(fixture.hermes_gate_optional_field_registry.empty_optional_record_allowed, true);
  assert.equal(validateHermesGateOptionalFields(fixture.hermes_gate_optional_field_registry.optional_record), true);
  assert.equal(validateHermesGateOptionalFields({}), true);
  assert.equal(fixture.hermes_gate_state_transition_map.policy_ref, "HERMES_GATE_STATE_TRANSITION_MAP");
  assert.equal(fixture.hermes_gate_state_transition_map.subphase_id, "RP00.P01.M03.S10");
  assert.equal(fixture.hermes_gate_state_transition_map.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_state_transition_map.status_field, "status");
  assert.equal(fixture.hermes_gate_state_transition_map.initial_status, "draft");
  assert.deepEqual(fixture.hermes_gate_state_transition_map.terminal_statuses, ["production_ready", "blocked"]);
  assert.deepEqual(
    fixture.hermes_gate_state_transition_map.allowed_transitions,
    HERMES_GATE_STATE_TRANSITION_MAP.allowedTransitions.map((transition) => ({
      from: transition.from,
      to: [...transition.to],
    })),
  );
  assert.equal(fixture.hermes_gate_state_transition_map.transition_edge_count, HERMES_GATE_STATE_TRANSITION_MAP.transitionEdges.length);
  assert.equal(fixture.hermes_gate_state_transition_map.guard_policy.no_skipped_gates, true);
  assert.equal(fixture.hermes_gate_state_transition_map.guard_policy.terminal_statuses_cannot_transition, true);
  assert.equal(assertHermesGateStatusTransition("draft", "implemented"), true);
  assert.equal(fixture.hermes_gate_validation_helper.policy_ref, "HERMES_GATE_VALIDATION_HELPER");
  assert.equal(fixture.hermes_gate_validation_helper.subphase_id, "RP00.P01.M03.S11");
  assert.equal(fixture.hermes_gate_validation_helper.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_validation_helper.helper_export, "validateHermesGate");
  assert.equal(fixture.hermes_gate_validation_helper.transition_evidence_export, "assertHermesGateTransitionEvidence");
  assert.deepEqual(fixture.hermes_gate_validation_helper.transition_evidence_keys, HERMES_GATE_TRANSITION_EVIDENCE_KEYS);
  assert.equal(fixture.hermes_gate_validation_helper.validation_record.gate_id, fixture.hermes_gate_identifier.gate_id);
  assert.equal(fixture.hermes_gate_validation_helper.validation_record.status, "production_ready");
  assert.equal(fixture.hermes_gate_validation_helper.transition_from_status, "construction_inspected");
  assert.equal(fixture.hermes_gate_validation_helper.transition_to_status, "production_ready");
  assert.equal(fixture.hermes_gate_validation_helper.transition_evidence.final_validation_rerun, true);
  assert.equal(fixture.hermes_gate_validation_helper.no_real_data, true);
  assert.equal(fixture.hermes_gate_validation_helper.writes_product_state, false);
  assert.equal(fixture.hermes_gate_validation_helper.next_subphase, "RP00.P01.M04.S01");
  assert.equal(
    validateHermesGate(fixture.hermes_gate_validation_helper.validation_record, {
      tenantContext: fixture.tenant,
      fromStatus: fixture.hermes_gate_validation_helper.transition_from_status,
      evidence: fixture.hermes_gate_validation_helper.transition_evidence,
    }),
    true,
  );
  assert.equal(validateAIControlRule(fixture.ai_control_rule), true);
});
