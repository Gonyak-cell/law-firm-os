import {
  AI_ALLOWED_ACTION_VALUES,
  AI_CONTROL_RULE_STATUS_VALUES,
  AI_FORBIDDEN_ACTION_VALUES,
  CONTROL_PLANE_BOUNDARY_FLAGS,
  CONTROL_PLANE_ENTITY_NAMES,
  CONTROL_PLANE_LIFECYCLE_STATES,
  PRODUCT_CONTRACT_STATUS_VALUES,
} from "./states.js";

export const CONTROL_PLANE_PACKAGE_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M00.S01",
  sourceMicroPhaseId: "RP00.P01.M00",
  title: "Package directory layout",
  status: "production_ready",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  directories: Object.freeze([
    "packages/control-plane/src",
    "packages/control-plane/test",
    "packages/control-plane/fixtures",
  ]),
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  ownedEntities: CONTROL_PLANE_ENTITY_NAMES,
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  nextSubphase: "RP00.P01.M01.S01",
});

export const CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES = Object.freeze([
  "RP00.P01.M00.S01",
  "RP00.P01.M01.S01",
  "RP00.P01.M02.S01",
  "RP00.P01.M02.S02",
  "RP00.P01.M02.S03",
  "RP00.P01.M03.S01",
  "RP00.P01.M03.S02",
  "RP00.P01.M03.S03",
  "RP00.P01.M03.S04",
  "RP00.P01.M03.S05",
  "RP00.P01.M03.S06",
  "RP00.P01.M03.S07",
  "RP00.P01.M03.S08",
  "RP00.P01.M03.S09",
  "RP00.P01.M03.S10",
  "RP00.P01.M03.S11",
  "RP00.P01.M04.S01",
  "RP00.P01.M04.S02",
  "RP00.P01.M04.S03",
  "RP00.P01.M04.S04",
  "RP00.P01.M05.S01",
  "RP00.P01.M05.S02",
  "RP00.P01.M05.S03",
  "RP00.P01.M05.S04",
  "RP00.P01.M05.S05",
  "RP00.P01.M05.S06",
  "RP00.P01.M05.S07",
  "RP00.P01.M05.S08",
  "RP00.P01.M05.S09",
  "RP00.P01.M05.S10",
  "RP00.P01.M05.S11",
  "RP00.P01.M06.S01",
  "RP00.P01.M06.S02",
  "RP00.P01.M06.S03",
  "RP00.P01.M07.S01",
  "RP00.P01.M07.S02",
  "RP00.P01.M07.S03",
  "RP00.P01.M07.S04",
  "RP00.P01.M07.S05",
  "RP00.P01.M07.S06",
  "RP00.P01.M07.S07",
  "RP00.P01.M07.S08",
  "RP00.P01.M07.S09",
  "RP00.P01.M07.S10",
  "RP00.P01.M07.S11",
  "RP00.P01.M08.S01",
  "RP00.P01.M08.S02",
  "RP00.P01.M08.S03",
  "RP00.P01.M09.S01",
  "RP00.P01.M09.S02",
  "RP00.P01.M09.S03",
]);

export const CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M10.S01",
  sourceMicroPhaseId: "RP00.P01.M10",
  title: "Package directory layout",
  status: "production_ready",
  phaseId: "RP00.P01",
  phaseTitle: "Domain Model",
  handoffName: "control_plane_domain_model_closeout_handoff",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "contracts/control-plane-contract.json",
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  completedDomainModelSubphases: CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES,
  completedDomainModelSubphaseCount: CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.length,
  requiredModelSurfaces: Object.freeze([
    "ProductContract",
    "AIControlRule",
    "HermesGate",
    "ClaudeReviewGate",
    "HumanApproval",
    "ControlPlaneSyntheticFixtureSet",
    "ControlPlaneStateEnumRegistry",
    "ControlPlaneHermesEvidencePacket",
    "ControlPlaneExportModelRegistry",
  ]),
  requiredEvidenceRoots: Object.freeze([
    "docs/goal-closeout/rp00-p01-m00-s01",
    "docs/goal-closeout/rp00-p01-m09-s03",
  ]),
  handoffOutputs: Object.freeze([
    "p01_domain_model_ready_for_service_logic_scope_inventory",
    "next_service_logic_boundary_recorded",
    "open_blocking_findings_none_after_C00_adjudication",
    "domain_model_metadata_only_closeout_recorded",
  ]),
  uiVerificationApplicability: "not_applicable_metadata_handoff_only",
  accessibilityVerificationApplicability: "not_applicable_metadata_handoff_only",
  designConsistencyApplicability: "not_applicable_metadata_handoff_only",
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  noRealData: true,
  writesProductState: false,
  doesNotMutateEntityRegistry: true,
  doesNotCreateServiceLogic: true,
  doesNotCloseRP00: true,
  nextPhase: "RP00.P02",
  nextPhaseTitle: "Service Logic",
  nextSubphase: "RP00.P02.M00.S01",
});

export const CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M06.S01",
  sourceMicroPhaseId: "RP00.P01.M06",
  title: "Package directory layout",
  status: "production_ready",
  fixtureSetName: "control_plane_domain_model_synthetic_fixture_set",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  fixtureDirectory: "packages/control-plane/fixtures",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  syntheticOnlyPolicySubphase: "RP00.P00.M06.S01",
  coveredPhase: "RP00.P01",
  coveredMicroPhases: Object.freeze([
    "RP00.P01.M00",
    "RP00.P01.M01",
    "RP00.P01.M02",
    "RP00.P01.M03",
    "RP00.P01.M04",
    "RP00.P01.M05",
    "RP00.P01.M06",
  ]),
  requiredFixtureMarkers: Object.freeze([
    "schema_version",
    "synthetic",
    "no_real_data",
    "fixture_id",
    "tenant",
  ]),
  allowedNamespacePrefixes: Object.freeze([
    "lfos_demo_",
    "synthetic_",
    "fake_",
  ]),
  allowedDomains: Object.freeze([
    "example.test",
    "lawfirm-os.invalid",
  ]),
  futureFixtureSubphases: Object.freeze([
    "RP00.P01.M06.S02",
    "RP00.P01.M06.S03",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M06.S02",
});

const CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_ID_PATTERN = /^fs_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_ID_PATTERN = /^ser_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_ID_PATTERN = /^matter_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_REF_PATTERN = /^owner\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_CORRECTION_ROUTE_PATTERN = /^blocked_claim\.[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_AUDIT_EVENT_REF_PATTERN = /^audit\.synthetic\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_BLOCKED_CLAIM_REF_PATTERN = /^blocked_claim\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_PRODUCT_CONTRACT_REF_PATTERN = /^pc_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_AI_CONTROL_RULE_REF_PATTERN = /^air_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_HERMES_GATE_REF_PATTERN = /^hermes_gate\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_CLAUDE_REVIEW_GATE_REF_PATTERN = /^claude_review_gate\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_STATE_ENUM_REGISTRY_HUMAN_APPROVAL_REF_PATTERN = /^human_approval\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
export const CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES = Object.freeze([
  "state_enum_registry_owner",
  "control_plane_enum_steward",
  "implementation_closeout_reviewer",
]);
const CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_METADATA_FIELDS = Object.freeze([
  "owner_module",
  "owner_role",
  "steward_ref",
  "correction_route",
  "may_reference",
  "may_not_mutate",
]);
export const CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS = Object.freeze([
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
const CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_FIELDS = Object.freeze([
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
export const CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS = Object.freeze([
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
export const CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS = Object.freeze([
  "matter_id",
  "blocked_claim_refs",
  "product_contract_refs",
  "ai_control_rule_refs",
  "hermes_gate_refs",
  "claude_review_gate_refs",
  "human_approval_refs",
]);
const CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_EDGES = Object.freeze([
  Object.freeze({ from: "draft", to: "implemented", requiredEvidence: "implementation_evidence" }),
  Object.freeze({ from: "draft", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "implemented", to: "hermes_validated", requiredEvidence: "hermes_H00_evidence" }),
  Object.freeze({ from: "implemented", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "hermes_validated", to: "claude_reviewed", requiredEvidence: "claude_C00_review" }),
  Object.freeze({ from: "hermes_validated", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "claude_reviewed", to: "construction_inspected", requiredEvidence: "construction_inspection" }),
  Object.freeze({ from: "claude_reviewed", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "construction_inspected", to: "production_ready", requiredEvidence: "final_validation_rerun" }),
  Object.freeze({ from: "construction_inspected", to: "blocked", requiredEvidence: "blocked_claim" }),
]);
export const CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS = Object.freeze([
  ...new Set(CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_EDGES.map((edge) => edge.requiredEvidence)),
]);

export const CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M06.S02",
  sourceMicroPhaseId: "RP00.P01.M06",
  title: "Primary entity identifier",
  status: "production_ready",
  entity: "ControlPlaneSyntheticFixtureSet",
  field: "fixture_set_id",
  stablePrefix: "fs_",
  canonicalPattern: "^fs_[a-z0-9]+(?:_[a-z0-9]+)*$",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_control_plane_synthetic_fixture_set",
  auditPurpose: "bind every control-plane domain-model synthetic fixture set, layout receipt, identifier receipt, tenant-scope receipt, and closeout packet to one stable synthetic fixture set identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_fs_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  layoutCompletionSubphase: "RP00.P01.M06.S01",
  tenantScopeCompletionSubphase: "RP00.P01.M06.S03",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M06.S03",
});

export const CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M06.S03",
  sourceMicroPhaseId: "RP00.P01.M06",
  title: "Tenant scope field",
  status: "production_ready",
  entity: "ControlPlaneSyntheticFixtureSet",
  field: "tenant_id",
  targetEntity: "Tenant",
  required: true,
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  sameTenantRequired: true,
  tenantIsolationInvariant: "ControlPlaneSyntheticFixtureSet.tenant_id must be canonical and match the provided Tenant context before synthetic fixture set evidence can close or be reused",
  crossTenantFailureMode: "cross_tenant_control_plane_synthetic_fixture_set_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "fixture_set_without_tenant_id",
  ]),
  identifierCompletionSubphase: "RP00.P01.M06.S02",
  completesSyntheticFixtureSet: true,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S01",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M07.S01",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Package directory layout",
  status: "production_ready",
  registryName: "control_plane_state_enum_registry",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  enumSourceFile: "packages/control-plane/src/states.js",
  registryFile: "packages/control-plane/src/registry.js",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  coveredEnumFamilies: Object.freeze([
    "control_plane_entity_names",
    "control_plane_lifecycle_states",
    "control_plane_review_outcomes",
    "product_contract_status_values",
    "ai_control_rule_status_values",
    "ai_allowed_action_values",
    "ai_forbidden_action_values",
    "control_plane_boundary_flags",
  ]),
  enumFamilyFutureSubphaseMap: Object.freeze({
    control_plane_entity_names: "RP00.P01.M07.S02",
    control_plane_lifecycle_states: "RP00.P01.M07.S03",
    control_plane_review_outcomes: "RP00.P01.M07.S04",
    product_contract_status_values: "RP00.P01.M07.S05",
    ai_control_rule_status_values: "RP00.P01.M07.S06",
    ai_allowed_action_values: "RP00.P01.M07.S07",
    ai_forbidden_action_values: "RP00.P01.M07.S08",
    control_plane_boundary_flags: "RP00.P01.M07.S09",
  }),
  futureEnumSubphases: Object.freeze([
    "RP00.P01.M07.S02",
    "RP00.P01.M07.S03",
    "RP00.P01.M07.S04",
    "RP00.P01.M07.S05",
    "RP00.P01.M07.S06",
    "RP00.P01.M07.S07",
    "RP00.P01.M07.S08",
    "RP00.P01.M07.S09",
    "RP00.P01.M07.S10",
    "RP00.P01.M07.S11",
  ]),
  bindsPreexistingEnumExports: true,
  definesNewEnumValues: false,
  implementsEnumValues: false,
  valueDefinitionScope: "binds_preexisting_enum_exports_without_creating_new_enum_values",
  noRealData: true,
  writesProductState: false,
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  nextSubphase: "RP00.P01.M07.S02",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S02",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Primary entity identifier",
  status: "production_ready",
  entity: "ControlPlaneStateEnumRegistry",
  field: "registry_id",
  stablePrefix: "ser_",
  canonicalPattern: "^ser_[a-z0-9]+(?:_[a-z0-9]+)*$",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_control_plane_state_enum_registry",
  auditPurpose: "bind every control-plane state enum registry layout, enum-family mapping, identifier receipt, tenant-scope receipt, enum policy receipt, and closeout packet to one stable synthetic registry identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_ser_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  layoutCompletionSubphase: "RP00.P01.M07.S01",
  tenantScopeCompletionSubphase: "RP00.P01.M07.S03",
  matterTraceCompletionSubphase: "RP00.P01.M07.S04",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S03",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S03",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Tenant scope field",
  status: "production_ready",
  entity: "ControlPlaneStateEnumRegistry",
  field: "tenant_id",
  targetEntity: "Tenant",
  required: true,
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  sameTenantRequired: true,
  tenantIsolationInvariant: "ControlPlaneStateEnumRegistry.tenant_id must be canonical and match the provided Tenant context before state enum registry evidence can close or be reused",
  crossTenantFailureMode: "cross_tenant_control_plane_state_enum_registry_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "state_enum_registry_without_tenant_id",
  ]),
  identifierCompletionSubphase: "RP00.P01.M07.S02",
  matterTraceCompletionSubphase: "RP00.P01.M07.S04",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S04",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S04",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Matter trace reference",
  status: "production_ready",
  entity: "ControlPlaneStateEnumRegistry",
  field: "matter_id",
  targetEntity: "Matter",
  required: false,
  nullableForFirmLevelRegistry: true,
  stablePrefix: "matter_",
  canonicalPattern: "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  requiredWhen: Object.freeze([
    "state_enum_registry_receipt_includes_matter_scoped_enum_policy",
    "state_enum_registry_receipt_includes_document_finance_external_share_portal_or_ai_output_behavior",
    "state_enum_registry_receipt_controls_client_facing_ai_output_with_matter_context",
  ]),
  matterTraceInvariant: "ControlPlaneStateEnumRegistry.matter_id may be null for firm-level enum registry receipts, but every recorded Matter reference must be canonical and match the provided Matter context before matter-scoped enum policy evidence can close",
  crossTenantFailureMode: "cross_tenant_control_plane_state_enum_registry_matter_trace_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_matter_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "matter_context_mismatch",
    "cross_tenant_matter_reference",
  ]),
  identifierCompletionSubphase: "RP00.P01.M07.S02",
  tenantScopeCompletionSubphase: "RP00.P01.M07.S03",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S05",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES = Object.freeze([...CONTROL_PLANE_LIFECYCLE_STATES]);

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S05",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Lifecycle status enum",
  status: "production_ready",
  entity: "ControlPlaneStateEnumRegistry",
  field: "status",
  required: true,
  enumValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES,
  sourceEnum: "CONTROL_PLANE_LIFECYCLE_STATES",
  initialStatus: "draft",
  hermesValidatedStatus: "hermes_validated",
  claudeReviewedStatus: "claude_reviewed",
  constructionInspectedStatus: "construction_inspected",
  productionReadyStatus: "production_ready",
  blockedStatus: "blocked",
  terminalStatuses: Object.freeze([
    "production_ready",
    "blocked",
  ]),
  transitionMapDeferredTo: "RP00.P01.M07.S10",
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  forbiddenForms: Object.freeze([
    "blank",
    "unknown_status",
    "uppercase",
    "hyphenated",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  identifierCompletionSubphase: "RP00.P01.M07.S02",
  tenantScopeCompletionSubphase: "RP00.P01.M07.S03",
  matterTraceCompletionSubphase: "RP00.P01.M07.S04",
  ownershipMetadataCompletionSubphase: "RP00.P01.M07.S06",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S06",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S06",
  sourceMicroPhaseId: "RP00.P01.M07",
  title: "Ownership metadata",
  status: "production_ready",
  entity: "ControlPlaneStateEnumRegistry",
  field: "ownership_metadata",
  fields: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_METADATA_FIELDS,
  metadataFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_METADATA_FIELDS,
  ownerModule: "packages/control-plane",
  ownerRoleValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES,
  defaultOwnerRole: "state_enum_registry_owner",
  stewardRefPattern: "^owner\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRoutePattern: "^blocked_claim\\.[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRouteRequired: true,
  mayReference: Object.freeze([
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "ProductContract",
    "AIControlRule",
    "HermesGate",
    "ClaudeReviewGate",
    "HumanApproval",
  ]),
  mayNotMutate: Object.freeze([
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
  ]),
  governanceBoundary: "ownership metadata may assign stewardship and correction routes but cannot define enum values, mutate product data, or replace Hermes, Claude, or HumanApproval gates",
  referenceRelationshipMapDeferredTo: "RP00.P01.M07.S07",
  requiredFieldRegistryDeferredTo: "RP00.P01.M07.S08",
  optionalFieldRegistryDeferredTo: "RP00.P01.M07.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M07.S10",
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S07",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M07.S07",
  sourceMicroPhaseId: "RP00.P01.M07",
  entity: "ControlPlaneStateEnumRegistry",
  title: "Reference relationship map",
  status: "production_ready",
  relationshipFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_FIELDS,
  targetEntities: CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_TARGETS,
  relationshipMap: Object.freeze([
    Object.freeze({
      field: "tenant_id",
      targetEntity: "Tenant",
      cardinality: "one",
      required: true,
      validator: "validateControlPlaneStateEnumRegistryTenantId",
      sameTenantRequired: true,
      completionSubphase: "RP00.P01.M07.S03",
    }),
    Object.freeze({
      field: "matter_id",
      targetEntity: "Matter",
      cardinality: "zero_or_one",
      required: false,
      nullableForFirmLevelRegistry: true,
      validator: "validateControlPlaneStateEnumRegistryMatterId",
      sameTenantRequiredWhenPresent: true,
      completionSubphase: "RP00.P01.M07.S04",
    }),
    Object.freeze({
      field: "audit_event_ref",
      targetEntity: "AuditEventReference",
      cardinality: "one",
      required: true,
      canonicalPattern: "^audit\\.synthetic\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^blocked_claim\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "product_contract_refs",
      targetEntity: "ProductContract",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^pc_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotMutateTarget: true,
    }),
    Object.freeze({
      field: "ai_control_rule_refs",
      targetEntity: "AIControlRule",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^air_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotMutateTarget: true,
    }),
    Object.freeze({
      field: "hermes_gate_refs",
      targetEntity: "HermesGate",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^hermes_gate\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotBypassOrMutate: true,
    }),
    Object.freeze({
      field: "claude_review_gate_refs",
      targetEntity: "ClaudeReviewGate",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^claude_review_gate\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotBypassOrMutate: true,
    }),
    Object.freeze({
      field: "human_approval_refs",
      targetEntity: "HumanApproval",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^human_approval\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryDeferredTo: "RP00.P01.M07.S08",
  optionalFieldRegistryDeferredTo: "RP00.P01.M07.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M07.S10",
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M07.S08",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M07.S08",
  sourceMicroPhaseId: "RP00.P01.M07",
  entity: "ControlPlaneStateEnumRegistry",
  title: "Required field registry",
  status: "production_ready",
  requiredFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "registry_id",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY",
      type: "stable_id",
      required: true,
      validator: "validateControlPlaneStateEnumRegistryId",
    }),
    Object.freeze({
      field: "tenant_id",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY",
      type: "tenant_id",
      required: true,
      targetEntity: "Tenant",
      validator: "validateControlPlaneStateEnumRegistryTenantId",
    }),
    Object.freeze({
      field: "status",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY",
      type: "enum",
      required: true,
      enumValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES,
      validator: "validateControlPlaneStateEnumRegistryStatus",
    }),
    Object.freeze({
      field: "owner_module",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "module_path",
      required: true,
    }),
    Object.freeze({
      field: "owner_role",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "enum",
      required: true,
      enumValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES,
    }),
    Object.freeze({
      field: "steward_ref",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "synthetic_owner_ref",
      required: true,
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_REF_PATTERN.source,
    }),
    Object.freeze({
      field: "correction_route",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "blocked_claim_correction_route",
      required: true,
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_CORRECTION_ROUTE_PATTERN.source,
    }),
    Object.freeze({
      field: "may_reference",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "entity_name_array",
      required: true,
      allowedValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference,
    }),
    Object.freeze({
      field: "may_not_mutate",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY",
      type: "mutation_boundary_array",
      required: true,
      allowedValues: CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate,
    }),
    Object.freeze({
      field: "audit_event_ref",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_audit_event_ref",
      required: true,
      targetEntity: "AuditEventReference",
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_AUDIT_EVENT_REF_PATTERN.source,
    }),
  ]),
  optionalFieldsExcluded: Object.freeze([
    "matter_id",
    "blocked_claim_refs",
    "product_contract_refs",
    "ai_control_rule_refs",
    "hermes_gate_refs",
    "claude_review_gate_refs",
    "human_approval_refs",
  ]),
  blockedClaimPatternPolicy: Object.freeze({
    correctionRoutePattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_CORRECTION_ROUTE_PATTERN.source,
    relationshipReferencePatternDeferredTo: "RP00.P01.M07.S09",
    rationale: "required correction_route is a single ownership correction route; optional blocked_claim_refs remain relationship references and are completed by the optional field registry",
  }),
  optionalFieldRegistryDeferredTo: "RP00.P01.M07.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M07.S10",
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  cannotDefineEnumValues: true,
  nextSubphase: "RP00.P01.M07.S09",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M07.S09",
  sourceMicroPhaseId: "RP00.P01.M07",
  entity: "ControlPlaneStateEnumRegistry",
  title: "Optional field registry",
  status: "production_ready",
  optionalFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "matter_id",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY",
      type: "nullable_matter_id",
      required: false,
      targetEntity: "Matter",
      nullableForFirmLevelRegistry: true,
      validator: "validateControlPlaneStateEnumRegistryMatterId",
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "blocked_claim_ref_array",
      required: false,
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_BLOCKED_CLAIM_REF_PATTERN.source,
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "product_contract_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "product_contract_ref_array",
      required: false,
      targetEntity: "ProductContract",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_PRODUCT_CONTRACT_REF_PATTERN.source,
      referenceOnly: true,
      cannotMutateTarget: true,
    }),
    Object.freeze({
      field: "ai_control_rule_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "ai_control_rule_ref_array",
      required: false,
      targetEntity: "AIControlRule",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_AI_CONTROL_RULE_REF_PATTERN.source,
      referenceOnly: true,
      cannotMutateTarget: true,
    }),
    Object.freeze({
      field: "hermes_gate_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_hermes_gate_ref_array",
      required: false,
      targetEntity: "HermesGate",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_HERMES_GATE_REF_PATTERN.source,
      referenceOnly: true,
      cannotBypassOrMutate: true,
    }),
    Object.freeze({
      field: "claude_review_gate_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_claude_review_gate_ref_array",
      required: false,
      targetEntity: "ClaudeReviewGate",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_CLAUDE_REVIEW_GATE_REF_PATTERN.source,
      referenceOnly: true,
      cannotBypassOrMutate: true,
    }),
    Object.freeze({
      field: "human_approval_refs",
      sourcePolicy: "CONTROL_PLANE_STATE_ENUM_REGISTRY_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_human_approval_ref_array",
      required: false,
      targetEntity: "HumanApproval",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: CONTROL_PLANE_STATE_ENUM_REGISTRY_HUMAN_APPROVAL_REF_PATTERN.source,
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryCompletedIn: "RP00.P01.M07.S08",
  stateTransitionMapDeferredTo: "RP00.P01.M07.S10",
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  cannotDefineEnumValues: true,
  nextSubphase: "RP00.P01.M07.S10",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP = Object.freeze({
  subphaseId: "RP00.P01.M07.S10",
  sourceMicroPhaseId: "RP00.P01.M07",
  entity: "ControlPlaneStateEnumRegistry",
  title: "State transition map",
  status: "production_ready",
  statusField: "status",
  states: CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES,
  initialStatus: "draft",
  terminalStatuses: CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_POLICY.terminalStatuses,
  transitionEdges: CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_EDGES,
  allowedTransitions: Object.freeze([
    Object.freeze({ from: "draft", to: Object.freeze(["implemented", "blocked"]) }),
    Object.freeze({ from: "implemented", to: Object.freeze(["hermes_validated", "blocked"]) }),
    Object.freeze({ from: "hermes_validated", to: Object.freeze(["claude_reviewed", "blocked"]) }),
    Object.freeze({ from: "claude_reviewed", to: Object.freeze(["construction_inspected", "blocked"]) }),
    Object.freeze({ from: "construction_inspected", to: Object.freeze(["production_ready", "blocked"]) }),
    Object.freeze({ from: "production_ready", to: Object.freeze([]) }),
    Object.freeze({ from: "blocked", to: Object.freeze([]) }),
  ]),
  guardPolicy: Object.freeze({
    noSkippedGates: true,
    noBackwardTransitions: true,
    productionReadyRequiresFinalValidation: true,
    blockedRequiresBlockedClaim: true,
    terminalStatusesCannotTransition: true,
    humanApprovalCannotBeSynthesized: true,
  }),
  validationHelperCompletionSubphase: "RP00.P01.M07.S11",
  definesNewEnumValues: false,
  noRealData: true,
  writesProductState: false,
  cannotDefineEnumValues: true,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M07.S11",
});

export const CONTROL_PLANE_STATE_ENUM_REGISTRY_VALIDATION_HELPER = Object.freeze({
  subphaseId: "RP00.P01.M07.S11",
  sourceMicroPhaseId: "RP00.P01.M07",
  entity: "ControlPlaneStateEnumRegistry",
  title: "Validation helper",
  status: "production_ready",
  helperExport: "validateControlPlaneStateEnumRegistry",
  transitionEvidenceExport: "assertControlPlaneStateEnumRegistryTransitionEvidence",
  validatesSubphases: Object.freeze([
    "RP00.P01.M07.S02",
    "RP00.P01.M07.S03",
    "RP00.P01.M07.S04",
    "RP00.P01.M07.S05",
    "RP00.P01.M07.S06",
    "RP00.P01.M07.S07",
    "RP00.P01.M07.S08",
    "RP00.P01.M07.S09",
    "RP00.P01.M07.S10",
  ]),
  requiredFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS,
  optionalFields: CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS,
  transitionEvidenceKeys: CONTROL_PLANE_STATE_ENUM_REGISTRY_TRANSITION_EVIDENCE_KEYS,
  enforcementPolicy: Object.freeze({
    requiredFields: true,
    optionalFields: true,
    tenantScope: true,
    matterTrace: true,
    relationshipReferences: true,
    transitionEvidence: true,
    terminalStatusProtection: true,
    humanApprovalCannotBeSynthesized: true,
    enumValueDefinitionMutationForbidden: true,
    noRealData: true,
    writesProductState: false,
  }),
  noRealData: true,
  writesProductState: false,
  definesNewEnumValues: false,
  cannotDefineEnumValues: true,
  completesStateEnumRegistryModel: true,
  nextSubphase: "RP00.P01.M08.S01",
});

export const CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M08.S01",
  sourceMicroPhaseId: "RP00.P01.M08",
  title: "Package directory layout",
  status: "production_ready",
  packetName: "control_plane_hermes_evidence_packet",
  expectedSurface: "ControlPlaneHermesEvidencePacket",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  evidenceRootTemplate: "docs/goal-closeout/{subphase_slug}",
  commandReceiptFields: Object.freeze([
    "command",
    "exit_code",
    "purpose",
  ]),
  evidenceSummaryFields: Object.freeze([
    "implemented_slice",
    "helper_export",
    "transition_evidence_export",
    "next_subphase",
  ]),
  requiredPacketFields: Object.freeze([
    "packet_id",
    "tenant_id",
    "commands",
    "evidence_summary",
    "blocked_claims",
    "gate_outcome",
    "hermes_gate_ref",
    "audit_event_ref",
  ]),
  relationshipTargets: Object.freeze([
    "Tenant",
    "AuditEventReference",
    "HermesGate",
    "BlockedClaim",
    "ProductContract",
    "AIControlRule",
    "ClaudeReviewGate",
    "HumanApproval",
  ]),
  futurePacketSubphases: Object.freeze([
    "RP00.P01.M08.S02",
    "RP00.P01.M08.S03",
  ]),
  implementedPacketIdentifier: false,
  implementedTenantScope: false,
  doesNotMutateEntityRegistry: true,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M08.S02",
});

const CONTROL_PLANE_HERMES_EVIDENCE_PACKET_ID_PATTERN = /^hep_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export const CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M08.S02",
  sourceMicroPhaseId: "RP00.P01.M08",
  title: "Primary entity identifier",
  status: "production_ready",
  surface: "ControlPlaneHermesEvidencePacket",
  field: "packet_id",
  stablePrefix: "hep_",
  canonicalPattern: "^hep_[a-z0-9]+(?:_[a-z0-9]+)*$",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_control_plane_hermes_evidence_packet_surface",
  auditPurpose: "bind every control-plane Hermes evidence packet, command receipt summary, blocked-claim route, gate outcome, and closeout evidence reference to one stable synthetic packet identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_hep_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  layoutCompletionSubphase: "RP00.P01.M08.S01",
  tenantScopeCompletionSubphase: "RP00.P01.M08.S03",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M08.S03",
});

export const CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M08.S03",
  sourceMicroPhaseId: "RP00.P01.M08",
  title: "Tenant scope field",
  status: "production_ready",
  entity: "ControlPlaneHermesEvidencePacket",
  field: "tenant_id",
  targetEntity: "Tenant",
  required: true,
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  sameTenantRequired: true,
  tenantIsolationInvariant: "ControlPlaneHermesEvidencePacket.tenant_id must be canonical and match the provided Tenant context before Hermes evidence packet evidence can close or be reused",
  crossTenantFailureMode: "cross_tenant_control_plane_hermes_evidence_packet_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "evidence_packet_without_tenant_id",
  ]),
  identifierCompletionSubphase: "RP00.P01.M08.S02",
  completesHermesEvidencePacket: true,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M09.S01",
});

export const CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M09.S01",
  sourceMicroPhaseId: "RP00.P01.M09",
  title: "Package directory layout",
  status: "production_ready",
  registryName: "control_plane_export_model_registry",
  expectedSurface: "ControlPlaneExportModelRegistry",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  exportModules: Object.freeze([
    "model.js",
    "states.js",
    "registry.js",
  ]),
  requiredExportGroups: Object.freeze([
    "domain_model_definitions",
    "state_constants",
    "domain_model_registry",
    "fixture_contracts",
    "validation_helpers",
  ]),
  requiredRegistryFields: Object.freeze([
    "packageLayout",
    "productContractModel",
    "aiControlRuleModel",
    "hermesGatePackageLayout",
    "claudeReviewGatePackageLayout",
    "humanApprovalPackageLayout",
    "hermesEvidencePacketLayout",
    "hermesEvidencePacketTenantScopePolicy",
  ]),
  futureRegistrySubphases: Object.freeze([
    "RP00.P01.M09.S02",
    "RP00.P01.M09.S03",
  ]),
  implementedRegistryIdentifier: false,
  implementedTenantScope: false,
  doesNotMutateEntityRegistry: true,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M09.S02",
});

const CONTROL_PLANE_EXPORT_MODEL_REGISTRY_ID_PATTERN = /^emr_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export const CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M09.S02",
  sourceMicroPhaseId: "RP00.P01.M09",
  title: "Primary entity identifier",
  status: "production_ready",
  surface: "ControlPlaneExportModelRegistry",
  field: "registry_id",
  stablePrefix: "emr_",
  canonicalPattern: "^emr_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_control_plane_export_model_registry_surface",
  auditPurpose: "bind every synthetic control-plane export model registry layout, export group inventory, registry field surface, and package handoff receipt to one stable registry identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_emr_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  layoutCompletionSubphase: "RP00.P01.M09.S01",
  tenantScopeCompletionSubphase: "RP00.P01.M09.S03",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M09.S03",
});

export const CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M09.S03",
  sourceMicroPhaseId: "RP00.P01.M09",
  title: "Tenant scope field",
  status: "production_ready",
  entity: "ControlPlaneExportModelRegistry",
  field: "tenant_id",
  targetEntity: "Tenant",
  required: true,
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  sameTenantRequired: true,
  tenantIsolationInvariant: "ControlPlaneExportModelRegistry.tenant_id must be canonical and match the provided Tenant context before export model registry evidence can close or be reused",
  crossTenantFailureMode: "cross_tenant_control_plane_export_model_registry_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "export_model_registry_without_tenant_id",
  ]),
  identifierCompletionSubphase: "RP00.P01.M09.S02",
  completesExportModelRegistry: true,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M10.S01",
});

export const CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M04.S01",
  sourceMicroPhaseId: "RP00.P01.M04",
  entity: "ClaudeReviewGate",
  title: "Package directory layout",
  status: "production_ready",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  expectedEntity: "ClaudeReviewGate",
  implementedModel: false,
  futureModelSubphases: Object.freeze([
    "RP00.P01.M04.S02",
    "RP00.P01.M04.S03",
    "RP00.P01.M04.S04",
  ]),
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M04.S02",
});

const CLAUDE_REVIEW_GATE_ID_PATTERN = /^crg_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CLAUDE_REVIEW_GATE_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CLAUDE_REVIEW_GATE_MATTER_ID_PATTERN = /^matter_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_ID_PATTERN = /^ha_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_MATTER_ID_PATTERN = /^matter_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
export const HUMAN_APPROVAL_STATUS_VALUES = Object.freeze([...CONTROL_PLANE_LIFECYCLE_STATES]);
export const HUMAN_APPROVAL_OWNER_ROLE_VALUES = Object.freeze([
  "human_approval_process_owner",
  "risk_approval_steward",
  "implementation_closeout_reviewer",
]);
const HUMAN_APPROVAL_OWNERSHIP_METADATA_FIELDS = Object.freeze([
  "owner_module",
  "owner_role",
  "steward_ref",
  "correction_route",
  "may_reference",
  "may_not_mutate",
]);
const HUMAN_APPROVAL_OWNER_REF_PATTERN = /^owner\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_CORRECTION_ROUTE_PATTERN = /^blocked_claim\.[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_AUDIT_EVENT_REF_PATTERN = /^audit\.synthetic\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const HUMAN_APPROVAL_BLOCKED_CLAIM_REF_PATTERN = /^blocked_claim\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const HUMAN_APPROVAL_HERMES_GATE_REF_PATTERN = /^hermes_gate\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HUMAN_APPROVAL_CLAUDE_REVIEW_GATE_REF_PATTERN = /^claude_review_gate\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
export const HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS = Object.freeze([
  "Tenant",
  "Matter",
  "AuditEventReference",
  "BlockedClaim",
  "HermesGate",
  "ClaudeReviewGate",
]);
const HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_FIELDS = Object.freeze([
  "tenant_id",
  "matter_id",
  "audit_event_ref",
  "blocked_claim_refs",
  "hermes_gate_refs",
  "claude_review_gate_refs",
]);
export const HUMAN_APPROVAL_REQUIRED_FIELDS = Object.freeze([
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
export const HUMAN_APPROVAL_OPTIONAL_FIELDS = Object.freeze([
  "matter_id",
  "blocked_claim_refs",
  "hermes_gate_refs",
  "claude_review_gate_refs",
]);
const HUMAN_APPROVAL_STATE_TRANSITION_EDGES = Object.freeze([
  Object.freeze({ from: "draft", to: "implemented", requiredEvidence: "implementation_evidence" }),
  Object.freeze({ from: "draft", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "implemented", to: "hermes_validated", requiredEvidence: "hermes_H00_evidence" }),
  Object.freeze({ from: "implemented", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "hermes_validated", to: "claude_reviewed", requiredEvidence: "claude_C00_review" }),
  Object.freeze({ from: "hermes_validated", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "claude_reviewed", to: "construction_inspected", requiredEvidence: "construction_inspection" }),
  Object.freeze({ from: "claude_reviewed", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "construction_inspected", to: "production_ready", requiredEvidence: "final_validation_rerun" }),
  Object.freeze({ from: "construction_inspected", to: "blocked", requiredEvidence: "blocked_claim" }),
]);
export const HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS = Object.freeze([
  ...new Set(HUMAN_APPROVAL_STATE_TRANSITION_EDGES.map((edge) => edge.requiredEvidence)),
]);

export const CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M04.S02",
  sourceMicroPhaseId: "RP00.P01.M04",
  entity: "ClaudeReviewGate",
  title: "Primary entity identifier",
  status: "production_ready",
  field: "review_id",
  stablePrefix: "crg_",
  canonicalPattern: "^crg_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_ClaudeReviewGate_entity",
  auditPurpose: "bind every ClaudeReviewGate packet, reviewed file set, finding, verdict, adjudication record, and closeout receipt to a stable auditable review identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_crg_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  tenantScopeCompletionSubphase: "RP00.P01.M04.S03",
  matterTraceCompletionSubphase: "RP00.P01.M04.S04",
  nextSubphase: "RP00.P01.M04.S03",
});

export const CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M04.S03",
  sourceMicroPhaseId: "RP00.P01.M04",
  entity: "ClaudeReviewGate",
  title: "Tenant scope field",
  status: "production_ready",
  field: "tenant_id",
  required: false,
  targetEntity: "Tenant",
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  tenantScopedByDefault: false,
  nullableForFirmLevelReviews: true,
  requiredWhen: Object.freeze([
    "review_packet_includes_tenant_scoped_synthetic_fixtures",
    "review_packet_includes_client_document_finance_external_share_portal_or_ai_output_behavior",
  ]),
  sameTenantRequired: true,
  tenantIsolationInvariant: "ClaudeReviewGate.tenant_id is optional for firm-level control-plane reviews, but must match the provided tenant context before tenant-scoped fixture, client, document, finance, portal, external-share, or AI-output review evidence can close",
  crossTenantFailureMode: "cross_tenant_claude_review_gate_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "tenant_context_without_record_tenant_id",
    "record_tenant_id_without_tenant_context",
  ]),
  noRealData: true,
  writesProductState: false,
  matterTraceCompletionSubphase: "RP00.P01.M04.S04",
  nextSubphase: "RP00.P01.M04.S04",
});

export const CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M04.S04",
  sourceMicroPhaseId: "RP00.P01.M04",
  entity: "ClaudeReviewGate",
  title: "Matter trace reference",
  status: "production_ready",
  field: "matter_id",
  targetEntity: "Matter",
  required: false,
  nullableForFirmLevelReviews: true,
  stablePrefix: "matter_",
  canonicalPattern: "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  requiredWhen: Object.freeze([
    "review_packet_includes_matter_scoped_synthetic_fixtures",
    "review_packet_includes_document_finance_external_share_portal_or_ai_output_behavior",
    "review_packet_includes_client_facing_ai_output_with_matter_context",
  ]),
  matterTraceInvariant: "ClaudeReviewGate.matter_id may be null for firm-level control-plane reviews, but every recorded matter reference must be canonical and match the provided Matter context before matter-scoped review evidence can close",
  crossTenantFailureMode: "cross_tenant_claude_review_gate_matter_trace_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_matter_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "matter_context_mismatch",
    "cross_tenant_matter_reference",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M05.S01",
});

export const HUMAN_APPROVAL_PACKAGE_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M05.S01",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Package directory layout",
  status: "production_ready",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  expectedEntity: "HumanApproval",
  implementedModel: false,
  futureModelSubphases: Object.freeze([
    "RP00.P01.M05.S02",
    "RP00.P01.M05.S03",
    "RP00.P01.M05.S04",
    "RP00.P01.M05.S05",
    "RP00.P01.M05.S06",
    "RP00.P01.M05.S07",
    "RP00.P01.M05.S08",
    "RP00.P01.M05.S09",
    "RP00.P01.M05.S10",
    "RP00.P01.M05.S11",
  ]),
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S02",
});

export const HUMAN_APPROVAL_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S02",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Primary entity identifier",
  status: "production_ready",
  field: "approval_id",
  stablePrefix: "ha_",
  canonicalPattern: "^ha_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_HumanApproval_entity",
  auditPurpose: "bind every non-delegable human approval request, decision, scope, actor, expiration, and closeout receipt to a stable auditable approval identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_ha_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  tenantScopeCompletionSubphase: "RP00.P01.M05.S03",
  matterTraceCompletionSubphase: "RP00.P01.M05.S04",
  lifecycleCompletionSubphase: "RP00.P01.M05.S05",
  nextSubphase: "RP00.P01.M05.S03",
});

export const HUMAN_APPROVAL_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S03",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Tenant scope field",
  status: "production_ready",
  field: "tenant_id",
  required: true,
  targetEntity: "Tenant",
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  sameTenantRequired: true,
  tenantIsolationInvariant: "HumanApproval.tenant_id must match the provided tenant context before approval scope evidence, decision metadata, expiration metadata, or closeout receipts can be recorded",
  crossTenantFailureMode: "cross_tenant_human_approval_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
    "missing_tenant_context",
  ]),
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  matterTraceCompletionSubphase: "RP00.P01.M05.S04",
  lifecycleCompletionSubphase: "RP00.P01.M05.S05",
  nextSubphase: "RP00.P01.M05.S04",
});

export const HUMAN_APPROVAL_MATTER_TRACE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S04",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Matter trace reference",
  status: "production_ready",
  field: "matter_id",
  targetEntity: "Matter",
  required: false,
  nullableForFirmLevelApprovals: true,
  stablePrefix: "matter_",
  canonicalPattern: "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  requiredWhen: Object.freeze([
    "approval_request_includes_matter_scoped_scope_evidence",
    "approval_request_includes_document_finance_external_share_portal_or_ai_output_behavior",
    "approval_request_controls_client_facing_ai_output_with_matter_context",
  ]),
  matterTraceInvariant: "HumanApproval.matter_id may be null for firm-level approvals, but every recorded Matter reference must be canonical and match the provided Matter context before approval scope evidence, decision metadata, expiration metadata, or closeout receipts can be recorded",
  crossTenantFailureMode: "cross_tenant_human_approval_matter_trace_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_matter_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "matter_context_mismatch",
    "cross_tenant_matter_reference",
  ]),
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  lifecycleCompletionSubphase: "RP00.P01.M05.S05",
  nextSubphase: "RP00.P01.M05.S05",
});

export const HUMAN_APPROVAL_STATUS_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S05",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Lifecycle status enum",
  status: "production_ready",
  field: "status",
  required: true,
  enumValues: HUMAN_APPROVAL_STATUS_VALUES,
  sourceEnum: "CONTROL_PLANE_LIFECYCLE_STATES",
  initialStatus: "draft",
  hermesValidatedStatus: "hermes_validated",
  claudeReviewedStatus: "claude_reviewed",
  constructionInspectedStatus: "construction_inspected",
  productionReadyStatus: "production_ready",
  blockedStatus: "blocked",
  terminalStatuses: Object.freeze([
    "production_ready",
    "blocked",
  ]),
  transitionMapDeferredTo: "RP00.P01.M05.S10",
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  forbiddenForms: Object.freeze([
    "blank",
    "unknown_status",
    "uppercase",
    "hyphenated",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S06",
});

export const HUMAN_APPROVAL_OWNERSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S06",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Ownership metadata",
  status: "production_ready",
  fields: HUMAN_APPROVAL_OWNERSHIP_METADATA_FIELDS,
  metadataFields: HUMAN_APPROVAL_OWNERSHIP_METADATA_FIELDS,
  ownerModule: "packages/control-plane",
  ownerRoleValues: HUMAN_APPROVAL_OWNER_ROLE_VALUES,
  defaultOwnerRole: "human_approval_process_owner",
  stewardRefPattern: "^owner\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRoutePattern: "^blocked_claim\\.[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRouteRequired: true,
  mayReference: Object.freeze([
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "HermesGate",
    "ClaudeReviewGate",
  ]),
  mayNotMutate: Object.freeze([
    "production_product_data",
    "client_data",
    "matter_data",
    "document_data",
    "billing_data",
    "human_approval_decisions",
    "human_approval_actor_identity",
  ]),
  humanApprovalBoundary: "ownership metadata may assign stewardship and correction routes but cannot record, synthesize, approve, or replace a HumanApproval decision",
  referenceRelationshipMapDeferredTo: "RP00.P01.M05.S07",
  requiredFieldRegistryDeferredTo: "RP00.P01.M05.S08",
  stateTransitionMapDeferredTo: "RP00.P01.M05.S10",
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S07",
});

export const HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M05.S07",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Reference relationship map",
  status: "production_ready",
  relationshipFields: HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_FIELDS,
  targetEntities: HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS,
  relationshipMap: Object.freeze([
    Object.freeze({
      field: "tenant_id",
      targetEntity: "Tenant",
      cardinality: "one",
      required: true,
      validator: "validateHumanApprovalTenantId",
      sameTenantRequired: true,
      completionSubphase: "RP00.P01.M05.S03",
    }),
    Object.freeze({
      field: "matter_id",
      targetEntity: "Matter",
      cardinality: "zero_or_one",
      required: false,
      nullableForFirmLevelApprovals: true,
      validator: "validateHumanApprovalMatterId",
      sameTenantRequiredWhenPresent: true,
      completionSubphase: "RP00.P01.M05.S04",
    }),
    Object.freeze({
      field: "audit_event_ref",
      targetEntity: "AuditEventReference",
      cardinality: "one",
      required: true,
      canonicalPattern: "^audit\\.synthetic\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^blocked_claim\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "hermes_gate_refs",
      targetEntity: "HermesGate",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^hermes_gate\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
    Object.freeze({
      field: "claude_review_gate_refs",
      targetEntity: "ClaudeReviewGate",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^claude_review_gate\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryDeferredTo: "RP00.P01.M05.S08",
  optionalFieldRegistryDeferredTo: "RP00.P01.M05.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M05.S10",
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S08",
});

export const HUMAN_APPROVAL_REQUIRED_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M05.S08",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Required field registry",
  status: "production_ready",
  requiredFields: HUMAN_APPROVAL_REQUIRED_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "approval_id",
      sourcePolicy: "HUMAN_APPROVAL_IDENTIFIER_POLICY",
      type: "stable_id",
      required: true,
      validator: "validateHumanApprovalId",
    }),
    Object.freeze({
      field: "tenant_id",
      sourcePolicy: "HUMAN_APPROVAL_TENANT_SCOPE_POLICY",
      type: "tenant_id",
      required: true,
      targetEntity: "Tenant",
      validator: "validateHumanApprovalTenantId",
    }),
    Object.freeze({
      field: "status",
      sourcePolicy: "HUMAN_APPROVAL_STATUS_POLICY",
      type: "enum",
      required: true,
      enumValues: HUMAN_APPROVAL_STATUS_VALUES,
      validator: "validateHumanApprovalStatus",
    }),
    Object.freeze({
      field: "owner_module",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "module_path",
      required: true,
    }),
    Object.freeze({
      field: "owner_role",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "enum",
      required: true,
      enumValues: HUMAN_APPROVAL_OWNER_ROLE_VALUES,
    }),
    Object.freeze({
      field: "steward_ref",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "synthetic_owner_ref",
      required: true,
      canonicalPattern: HUMAN_APPROVAL_OWNER_REF_PATTERN.source,
    }),
    Object.freeze({
      field: "correction_route",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "blocked_claim_correction_route",
      required: true,
      canonicalPattern: HUMAN_APPROVAL_CORRECTION_ROUTE_PATTERN.source,
    }),
    Object.freeze({
      field: "may_reference",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "entity_name_array",
      required: true,
      allowedValues: HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_TARGETS,
    }),
    Object.freeze({
      field: "may_not_mutate",
      sourcePolicy: "HUMAN_APPROVAL_OWNERSHIP_POLICY",
      type: "mutation_boundary_array",
      required: true,
      allowedValues: HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate,
    }),
    Object.freeze({
      field: "audit_event_ref",
      sourcePolicy: "HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_audit_event_ref",
      required: true,
      targetEntity: "AuditEventReference",
      canonicalPattern: HUMAN_APPROVAL_AUDIT_EVENT_REF_PATTERN.source,
    }),
  ]),
  blockedClaimPatternPolicy: Object.freeze({
    correctionRoutePattern: HUMAN_APPROVAL_CORRECTION_ROUTE_PATTERN.source,
    relationshipReferencePatternDeferredTo: "RP00.P01.M05.S09",
    rationale: "required correction_route is a single ownership correction route; optional blocked_claim_refs remain relationship references and are completed by the optional field registry",
  }),
  optionalFieldRegistryDeferredTo: "RP00.P01.M05.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M05.S10",
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S09",
});

export const HUMAN_APPROVAL_OPTIONAL_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M05.S09",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Optional field registry",
  status: "production_ready",
  optionalFields: HUMAN_APPROVAL_OPTIONAL_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "matter_id",
      sourcePolicy: "HUMAN_APPROVAL_MATTER_TRACE_POLICY",
      type: "nullable_matter_id",
      required: false,
      targetEntity: "Matter",
      nullableForFirmLevelApprovals: true,
      validator: "validateHumanApprovalMatterId",
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      sourcePolicy: "HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY",
      type: "blocked_claim_ref_array",
      required: false,
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: HUMAN_APPROVAL_BLOCKED_CLAIM_REF_PATTERN.source,
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "hermes_gate_refs",
      sourcePolicy: "HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_hermes_gate_ref_array",
      required: false,
      targetEntity: "HermesGate",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: HUMAN_APPROVAL_HERMES_GATE_REF_PATTERN.source,
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
    Object.freeze({
      field: "claude_review_gate_refs",
      sourcePolicy: "HUMAN_APPROVAL_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_claude_review_gate_ref_array",
      required: false,
      targetEntity: "ClaudeReviewGate",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: HUMAN_APPROVAL_CLAUDE_REVIEW_GATE_REF_PATTERN.source,
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryCompletedIn: "RP00.P01.M05.S08",
  stateTransitionMapDeferredTo: "RP00.P01.M05.S10",
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S10",
});

export const HUMAN_APPROVAL_STATE_TRANSITION_MAP = Object.freeze({
  subphaseId: "RP00.P01.M05.S10",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "State transition map",
  status: "production_ready",
  statusField: "status",
  states: HUMAN_APPROVAL_STATUS_VALUES,
  initialStatus: "draft",
  terminalStatuses: HUMAN_APPROVAL_STATUS_POLICY.terminalStatuses,
  transitionEdges: HUMAN_APPROVAL_STATE_TRANSITION_EDGES,
  allowedTransitions: Object.freeze([
    Object.freeze({ from: "draft", to: Object.freeze(["implemented", "blocked"]) }),
    Object.freeze({ from: "implemented", to: Object.freeze(["hermes_validated", "blocked"]) }),
    Object.freeze({ from: "hermes_validated", to: Object.freeze(["claude_reviewed", "blocked"]) }),
    Object.freeze({ from: "claude_reviewed", to: Object.freeze(["construction_inspected", "blocked"]) }),
    Object.freeze({ from: "construction_inspected", to: Object.freeze(["production_ready", "blocked"]) }),
    Object.freeze({ from: "production_ready", to: Object.freeze([]) }),
    Object.freeze({ from: "blocked", to: Object.freeze([]) }),
  ]),
  guardPolicy: Object.freeze({
    noSkippedGates: true,
    noBackwardTransitions: true,
    productionReadyRequiresFinalValidation: true,
    blockedRequiresBlockedClaim: true,
    terminalStatusesCannotTransition: true,
    humanApprovalCannotBeSynthesized: true,
  }),
  validationHelperCompletionSubphase: "RP00.P01.M05.S11",
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  nextSubphase: "RP00.P01.M05.S11",
});

export const HUMAN_APPROVAL_VALIDATION_HELPER = Object.freeze({
  subphaseId: "RP00.P01.M05.S11",
  sourceMicroPhaseId: "RP00.P01.M05",
  entity: "HumanApproval",
  title: "Validation helper",
  status: "production_ready",
  helperExport: "validateHumanApproval",
  transitionEvidenceExport: "assertHumanApprovalTransitionEvidence",
  validatesSubphases: Object.freeze([
    "RP00.P01.M05.S02",
    "RP00.P01.M05.S03",
    "RP00.P01.M05.S04",
    "RP00.P01.M05.S05",
    "RP00.P01.M05.S06",
    "RP00.P01.M05.S07",
    "RP00.P01.M05.S08",
    "RP00.P01.M05.S09",
    "RP00.P01.M05.S10",
  ]),
  requiredFields: HUMAN_APPROVAL_REQUIRED_FIELDS,
  optionalFields: HUMAN_APPROVAL_OPTIONAL_FIELDS,
  transitionEvidenceKeys: HUMAN_APPROVAL_TRANSITION_EVIDENCE_KEYS,
  enforcementPolicy: Object.freeze({
    requiredFields: true,
    optionalFields: true,
    tenantScope: true,
    matterTrace: true,
    relationshipReferences: true,
    transitionEvidence: true,
    terminalStatusProtection: true,
    humanApprovalCannotBeSynthesized: true,
    noRealData: true,
    writesProductState: false,
  }),
  noRealData: true,
  writesProductState: false,
  cannotSynthesizeHumanApproval: true,
  completesHumanApprovalModel: true,
  nextSubphase: "RP00.P01.M06.S01",
});

export const HERMES_GATE_PACKAGE_LAYOUT = Object.freeze({
  subphaseId: "RP00.P01.M03.S01",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Package directory layout",
  status: "production_ready",
  packageRoot: "packages/control-plane",
  packageManifest: "packages/control-plane/package.json",
  targetFiles: Object.freeze([
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]),
  targetTests: Object.freeze([
    "packages/control-plane/test/model.test.js",
  ]),
  fixtureFiles: Object.freeze([
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ]),
  expectedEntity: "HermesGate",
  implementedModel: false,
  futureModelSubphases: Object.freeze([
    "RP00.P01.M03.S02",
    "RP00.P01.M03.S03",
    "RP00.P01.M03.S04",
    "RP00.P01.M03.S05",
    "RP00.P01.M03.S06",
    "RP00.P01.M03.S07",
    "RP00.P01.M03.S08",
    "RP00.P01.M03.S09",
    "RP00.P01.M03.S10",
    "RP00.P01.M03.S11",
  ]),
  boundaryFlags: CONTROL_PLANE_BOUNDARY_FLAGS,
  nextSubphase: "RP00.P01.M03.S02",
});

const HERMES_GATE_ID_PATTERN = /^hg_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HERMES_GATE_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HERMES_GATE_MATTER_ID_PATTERN = /^matter_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HERMES_GATE_OWNER_REF_PATTERN = /^owner\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HERMES_GATE_CORRECTION_ROUTE_PATTERN = /^blocked_claim\.[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const HERMES_GATE_AUDIT_EVENT_REF_PATTERN = /^audit\.synthetic\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const HERMES_GATE_BLOCKED_CLAIM_REF_PATTERN = /^blocked_claim\.[a-z0-9]+(?:[._][a-z0-9]+)*$/u;
const HERMES_GATE_HUMAN_APPROVAL_REF_PATTERN = /^human_approval\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export const HERMES_GATE_STATUS_VALUES = Object.freeze([...CONTROL_PLANE_LIFECYCLE_STATES]);
export const HERMES_GATE_OWNER_ROLE_VALUES = Object.freeze([
  "control_plane_governance_owner",
  "hermes_evidence_steward",
  "implementation_closeout_reviewer",
]);
const HERMES_GATE_OWNERSHIP_METADATA_FIELDS = Object.freeze([
  "owner_module",
  "owner_role",
  "steward_ref",
  "correction_route",
  "may_reference",
  "may_not_mutate",
]);
export const HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS = Object.freeze([
  "Tenant",
  "Matter",
  "AuditEventReference",
  "BlockedClaim",
  "HumanApproval",
]);
const HERMES_GATE_REFERENCE_RELATIONSHIP_FIELDS = Object.freeze([
  "tenant_id",
  "matter_id",
  "audit_event_ref",
  "blocked_claim_refs",
  "human_approval_refs",
]);
export const HERMES_GATE_REQUIRED_FIELDS = Object.freeze([
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
export const HERMES_GATE_OPTIONAL_FIELDS = Object.freeze([
  "matter_id",
  "blocked_claim_refs",
  "human_approval_refs",
]);
const HERMES_GATE_STATE_TRANSITION_EDGES = Object.freeze([
  Object.freeze({ from: "draft", to: "implemented", requiredEvidence: "implementation_evidence" }),
  Object.freeze({ from: "draft", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "implemented", to: "hermes_validated", requiredEvidence: "hermes_H00_evidence" }),
  Object.freeze({ from: "implemented", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "hermes_validated", to: "claude_reviewed", requiredEvidence: "claude_C00_review" }),
  Object.freeze({ from: "hermes_validated", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "claude_reviewed", to: "construction_inspected", requiredEvidence: "construction_inspection" }),
  Object.freeze({ from: "claude_reviewed", to: "blocked", requiredEvidence: "blocked_claim" }),
  Object.freeze({ from: "construction_inspected", to: "production_ready", requiredEvidence: "final_validation_rerun" }),
  Object.freeze({ from: "construction_inspected", to: "blocked", requiredEvidence: "blocked_claim" }),
]);
export const HERMES_GATE_TRANSITION_EVIDENCE_KEYS = Object.freeze([
  ...new Set(HERMES_GATE_STATE_TRANSITION_EDGES.map((edge) => edge.requiredEvidence)),
]);

export const HERMES_GATE_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S02",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Primary entity identifier",
  status: "production_ready",
  field: "gate_id",
  stablePrefix: "hg_",
  canonicalPattern: "^hg_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_HermesGate_entity",
  auditPurpose: "bind every HermesGate evidence row, command receipt, blocked-claim reference, and closeout packet to a stable auditable identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_hg_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  tenantScopeCompletionSubphase: "RP00.P01.M03.S03",
  nextSubphase: "RP00.P01.M03.S03",
});

export const HERMES_GATE_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S03",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Tenant scope field",
  status: "production_ready",
  field: "tenant_id",
  required: true,
  targetEntity: "Tenant",
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  sameTenantRequired: true,
  tenantIsolationInvariant: "HermesGate.tenant_id must match the provided tenant context before evidence, command, blocked-claim, or closeout decisions can run",
  crossTenantFailureMode: "cross_tenant_hermes_gate_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S04",
});

export const HERMES_GATE_MATTER_TRACE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S04",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Matter trace reference",
  status: "production_ready",
  field: "matter_id",
  targetEntity: "Matter",
  required: false,
  nullableForFirmLevelGates: true,
  stablePrefix: "matter_",
  canonicalPattern: "^matter_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  requiredWhen: Object.freeze([
    "matter_data_touched",
    "document_data_touched",
    "billing_or_finance_data_touched",
    "client_facing_ai_output_touched",
    "external_share_or_portal_output_touched",
  ]),
  matterTraceInvariant: "HermesGate.matter_id may be null for firm-level gates, but every recorded matter reference must be canonical and match the provided Matter context before evidence, command, blocked-claim, or closeout decisions can run",
  crossTenantFailureMode: "cross_tenant_hermes_gate_matter_trace_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_matter_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "matter_context_mismatch",
    "cross_tenant_matter_reference",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S05",
});

export const HERMES_GATE_STATUS_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S05",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Lifecycle status enum",
  status: "production_ready",
  field: "status",
  required: true,
  enumValues: HERMES_GATE_STATUS_VALUES,
  sourceEnum: "CONTROL_PLANE_LIFECYCLE_STATES",
  initialStatus: "draft",
  hermesValidatedStatus: "hermes_validated",
  claudeReviewedStatus: "claude_reviewed",
  constructionInspectedStatus: "construction_inspected",
  productionReadyStatus: "production_ready",
  blockedStatus: "blocked",
  terminalStatuses: Object.freeze([
    "production_ready",
    "blocked",
  ]),
  transitionMapDeferredTo: "RP00.P01.M03.S10",
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  forbiddenForms: Object.freeze([
    "blank",
    "unknown_status",
    "uppercase",
    "hyphenated",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S06",
});

export const HERMES_GATE_OWNERSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S06",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Ownership metadata",
  status: "production_ready",
  fields: HERMES_GATE_OWNERSHIP_METADATA_FIELDS,
  metadataFields: HERMES_GATE_OWNERSHIP_METADATA_FIELDS,
  ownerModule: "packages/control-plane",
  ownerRoleValues: HERMES_GATE_OWNER_ROLE_VALUES,
  defaultOwnerRole: "control_plane_governance_owner",
  stewardRefPattern: "^owner\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRoutePattern: "^blocked_claim\\.[a-z0-9]+(?:_[a-z0-9]+)*$",
  correctionRouteRequired: true,
  mayReference: Object.freeze([
    "Tenant",
    "Matter",
    "AuditEventReference",
    "BlockedClaim",
    "HumanApproval",
  ]),
  mayNotMutate: Object.freeze([
    "production_product_data",
    "client_data",
    "matter_data",
    "document_data",
    "billing_data",
    "human_approval_decisions",
  ]),
  humanApprovalBoundary: "ownership metadata may route correction work but cannot approve or replace HumanApproval decisions",
  referenceRelationshipMapDeferredTo: "RP00.P01.M03.S07",
  requiredFieldRegistryDeferredTo: "RP00.P01.M03.S08",
  stateTransitionMapDeferredTo: "RP00.P01.M03.S10",
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S07",
});

export const HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M03.S07",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Reference relationship map",
  status: "production_ready",
  relationshipFields: HERMES_GATE_REFERENCE_RELATIONSHIP_FIELDS,
  targetEntities: HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS,
  relationshipMap: Object.freeze([
    Object.freeze({
      field: "tenant_id",
      targetEntity: "Tenant",
      cardinality: "one",
      required: true,
      validator: "validateHermesGateTenantId",
      sameTenantRequired: true,
      completionSubphase: "RP00.P01.M03.S03",
    }),
    Object.freeze({
      field: "matter_id",
      targetEntity: "Matter",
      cardinality: "zero_or_one",
      required: false,
      nullableForFirmLevelGates: true,
      validator: "validateHermesGateMatterId",
      sameTenantRequiredWhenPresent: true,
      completionSubphase: "RP00.P01.M03.S04",
    }),
    Object.freeze({
      field: "audit_event_ref",
      targetEntity: "AuditEventReference",
      cardinality: "one",
      required: true,
      canonicalPattern: "^audit\\.synthetic\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^blocked_claim\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "human_approval_refs",
      targetEntity: "HumanApproval",
      cardinality: "zero_or_many",
      required: false,
      canonicalPattern: "^human_approval\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryDeferredTo: "RP00.P01.M03.S08",
  optionalFieldRegistryDeferredTo: "RP00.P01.M03.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M03.S10",
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S08",
});

export const HERMES_GATE_REQUIRED_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M03.S08",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Required field registry",
  status: "production_ready",
  requiredFields: HERMES_GATE_REQUIRED_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "gate_id",
      sourcePolicy: "HERMES_GATE_IDENTIFIER_POLICY",
      type: "stable_id",
      required: true,
      validator: "validateHermesGateId",
    }),
    Object.freeze({
      field: "tenant_id",
      sourcePolicy: "HERMES_GATE_TENANT_SCOPE_POLICY",
      type: "tenant_id",
      required: true,
      targetEntity: "Tenant",
      validator: "validateHermesGateTenantId",
    }),
    Object.freeze({
      field: "status",
      sourcePolicy: "HERMES_GATE_STATUS_POLICY",
      type: "enum",
      required: true,
      enumValues: HERMES_GATE_STATUS_VALUES,
      validator: "validateHermesGateStatus",
    }),
    Object.freeze({
      field: "owner_module",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "module_path",
      required: true,
    }),
    Object.freeze({
      field: "owner_role",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "enum",
      required: true,
      enumValues: HERMES_GATE_OWNER_ROLE_VALUES,
    }),
    Object.freeze({
      field: "steward_ref",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "synthetic_owner_ref",
      required: true,
      canonicalPattern: "^owner\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
    }),
    Object.freeze({
      field: "correction_route",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "blocked_claim_ref",
      required: true,
      canonicalPattern: "^blocked_claim\\.[a-z0-9]+(?:_[a-z0-9]+)*$",
    }),
    Object.freeze({
      field: "may_reference",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "entity_name_array",
      required: true,
      allowedValues: HERMES_GATE_REFERENCE_RELATIONSHIP_TARGETS,
    }),
    Object.freeze({
      field: "may_not_mutate",
      sourcePolicy: "HERMES_GATE_OWNERSHIP_POLICY",
      type: "mutation_boundary_array",
      required: true,
      allowedValues: HERMES_GATE_OWNERSHIP_POLICY.mayNotMutate,
    }),
    Object.freeze({
      field: "audit_event_ref",
      sourcePolicy: "HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_audit_event_ref",
      required: true,
      targetEntity: "AuditEventReference",
      canonicalPattern: "^audit\\.synthetic\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
    }),
  ]),
  optionalFieldRegistryDeferredTo: "RP00.P01.M03.S09",
  stateTransitionMapDeferredTo: "RP00.P01.M03.S10",
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S09",
});

export const HERMES_GATE_OPTIONAL_FIELD_REGISTRY = Object.freeze({
  subphaseId: "RP00.P01.M03.S09",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Optional field registry",
  status: "production_ready",
  optionalFields: HERMES_GATE_OPTIONAL_FIELDS,
  fieldDefinitions: Object.freeze([
    Object.freeze({
      field: "matter_id",
      sourcePolicy: "HERMES_GATE_MATTER_TRACE_POLICY",
      type: "nullable_matter_id",
      required: false,
      targetEntity: "Matter",
      nullableForFirmLevelGates: true,
      validator: "validateHermesGateMatterId",
    }),
    Object.freeze({
      field: "blocked_claim_refs",
      sourcePolicy: "HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY",
      type: "blocked_claim_ref_array",
      required: false,
      targetEntity: "BlockedClaim",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: "^blocked_claim\\.[a-z0-9]+(?:[._][a-z0-9]+)*$",
      syntheticOnly: true,
    }),
    Object.freeze({
      field: "human_approval_refs",
      sourcePolicy: "HERMES_GATE_REFERENCE_RELATIONSHIP_POLICY",
      type: "synthetic_human_approval_ref_array",
      required: false,
      targetEntity: "HumanApproval",
      cardinality: "zero_or_many",
      defaultValue: Object.freeze([]),
      canonicalPattern: "^human_approval\\.synthetic_[a-z0-9]+(?:_[a-z0-9]+)*$",
      referenceOnly: true,
      cannotApproveOrMutate: true,
    }),
  ]),
  requiredFieldRegistryCompletedIn: "RP00.P01.M03.S08",
  stateTransitionMapDeferredTo: "RP00.P01.M03.S10",
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S10",
});

export const HERMES_GATE_STATE_TRANSITION_MAP = Object.freeze({
  subphaseId: "RP00.P01.M03.S10",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "State transition map",
  status: "production_ready",
  statusField: "status",
  states: HERMES_GATE_STATUS_VALUES,
  initialStatus: "draft",
  terminalStatuses: HERMES_GATE_STATUS_POLICY.terminalStatuses,
  transitionEdges: HERMES_GATE_STATE_TRANSITION_EDGES,
  allowedTransitions: Object.freeze([
    Object.freeze({ from: "draft", to: Object.freeze(["implemented", "blocked"]) }),
    Object.freeze({ from: "implemented", to: Object.freeze(["hermes_validated", "blocked"]) }),
    Object.freeze({ from: "hermes_validated", to: Object.freeze(["claude_reviewed", "blocked"]) }),
    Object.freeze({ from: "claude_reviewed", to: Object.freeze(["construction_inspected", "blocked"]) }),
    Object.freeze({ from: "construction_inspected", to: Object.freeze(["production_ready", "blocked"]) }),
    Object.freeze({ from: "production_ready", to: Object.freeze([]) }),
    Object.freeze({ from: "blocked", to: Object.freeze([]) }),
  ]),
  guardPolicy: Object.freeze({
    noSkippedGates: true,
    noBackwardTransitions: true,
    productionReadyRequiresFinalValidation: true,
    blockedRequiresBlockedClaim: true,
    terminalStatusesCannotTransition: true,
    humanApprovalCannotBeSynthesized: true,
  }),
  validationHelperCompletionSubphase: "RP00.P01.M03.S11",
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S11",
});

export const HERMES_GATE_VALIDATION_HELPER = Object.freeze({
  subphaseId: "RP00.P01.M03.S11",
  sourceMicroPhaseId: "RP00.P01.M03",
  entity: "HermesGate",
  title: "Validation helper",
  status: "production_ready",
  helperExport: "validateHermesGate",
  transitionEvidenceExport: "assertHermesGateTransitionEvidence",
  validatesSubphases: Object.freeze([
    "RP00.P01.M03.S02",
    "RP00.P01.M03.S03",
    "RP00.P01.M03.S04",
    "RP00.P01.M03.S05",
    "RP00.P01.M03.S06",
    "RP00.P01.M03.S07",
    "RP00.P01.M03.S08",
    "RP00.P01.M03.S09",
    "RP00.P01.M03.S10",
  ]),
  requiredFields: HERMES_GATE_REQUIRED_FIELDS,
  optionalFields: HERMES_GATE_OPTIONAL_FIELDS,
  transitionEvidenceKeys: HERMES_GATE_TRANSITION_EVIDENCE_KEYS,
  enforcementPolicy: Object.freeze({
    requiredFields: true,
    optionalFields: true,
    tenantScope: true,
    matterTrace: true,
    relationshipReferences: true,
    transitionEvidence: true,
    terminalStatusProtection: true,
    humanApprovalCannotBeSynthesized: true,
    noRealData: true,
    writesProductState: false,
  }),
  noRealData: true,
  writesProductState: false,
  completesHermesGateModel: true,
  nextSubphase: "RP00.P01.M04.S01",
});

export function assertControlPlanePackageLayout(layout = CONTROL_PLANE_PACKAGE_LAYOUT) {
  const requiredCollections = ["directories", "targetFiles", "targetTests", "fixtureFiles", "ownedEntities"];

  if (layout.subphaseId !== "RP00.P01.M00.S01") {
    throw new TypeError("control-plane package layout must bind to RP00.P01.M00.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M00") {
    throw new TypeError("control-plane package layout must bind to RP00.P01.M00");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("control-plane package layout must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`control-plane package layout missing ${collection}`);
    }
  }

  return true;
}

export function assertControlPlaneDomainModelCloseoutHandoffLayout(
  layout = CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_LAYOUT,
) {
  if (!layout || typeof layout !== "object") {
    throw new TypeError("control-plane domain model closeout handoff layout must be an object");
  }
  if (layout.subphaseId !== "RP00.P01.M10.S01") {
    throw new TypeError("control-plane domain model closeout handoff must bind to RP00.P01.M10.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M10") {
    throw new TypeError("control-plane domain model closeout handoff must bind to RP00.P01.M10");
  }
  if (layout.phaseId !== "RP00.P01" || layout.nextPhase !== "RP00.P02") {
    throw new TypeError("control-plane domain model closeout handoff must bridge P01 to P02");
  }
  if (layout.noRealData !== true || layout.writesProductState !== false) {
    throw new TypeError("control-plane domain model closeout handoff must be no-real-data and no-write");
  }
  if (
    layout.doesNotMutateEntityRegistry !== true
    || layout.doesNotCreateServiceLogic !== true
    || layout.doesNotCloseRP00 !== true
  ) {
    throw new TypeError("control-plane domain model closeout handoff must preserve metadata-only boundaries");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("control-plane domain model closeout handoff must carry no-write boundary flags");
  }
  for (const file of [
    "contracts/control-plane-contract.json",
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]) {
    if (!layout.targetFiles.includes(file)) {
      throw new TypeError(`control-plane domain model closeout handoff missing target file ${file}`);
    }
  }
  for (const requiredSubphase of CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES) {
    if (!layout.completedDomainModelSubphases.includes(requiredSubphase)) {
      throw new TypeError(`control-plane domain model closeout handoff missing completed subphase ${requiredSubphase}`);
    }
  }
  if (layout.completedDomainModelSubphaseCount !== CONTROL_PLANE_DOMAIN_MODEL_CLOSEOUT_HANDOFF_REQUIRED_SUBPHASES.length) {
    throw new TypeError("control-plane domain model closeout handoff subphase count mismatch");
  }
  if (!layout.requiredModelSurfaces.includes("ControlPlaneExportModelRegistry")) {
    throw new TypeError("control-plane domain model closeout handoff must include export model registry surface");
  }
  if (!layout.handoffOutputs.includes("next_service_logic_boundary_recorded")) {
    throw new TypeError("control-plane domain model closeout handoff must record service logic boundary");
  }
  if (layout.nextSubphase !== "RP00.P02.M00.S01") {
    throw new TypeError("control-plane domain model closeout handoff must hand off to RP00.P02.M00.S01");
  }
  return true;
}

export function assertControlPlaneSyntheticFixtureSetLayout(layout = CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_LAYOUT) {
  const requiredCollections = ["targetFiles", "targetTests", "fixtureFiles", "requiredFixtureMarkers", "futureFixtureSubphases"];
  const expectedTargetFiles = [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ];
  const expectedTargetTests = [
    "packages/control-plane/test/model.test.js",
  ];
  const expectedFixtureFiles = [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ];
  const expectedNamespacePrefixes = ["lfos_demo_", "synthetic_", "fake_"];
  const expectedDomains = ["example.test", "lawfirm-os.invalid"];

  if (layout.subphaseId !== "RP00.P01.M06.S01") {
    throw new TypeError("control-plane synthetic fixture set layout must bind to RP00.P01.M06.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M06") {
    throw new TypeError("control-plane synthetic fixture set layout must bind to RP00.P01.M06");
  }
  if (layout.fixtureDirectory !== "packages/control-plane/fixtures") {
    throw new TypeError("control-plane synthetic fixture set layout must bind the fixtures directory");
  }
  if (layout.syntheticOnlyPolicySubphase !== "RP00.P00.M06.S01") {
    throw new TypeError("control-plane synthetic fixture set layout must reference the synthetic-only fixture policy");
  }
  if (layout.noRealData !== true || layout.writesProductState !== false) {
    throw new TypeError("control-plane synthetic fixture set layout must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`control-plane synthetic fixture set layout missing ${collection}`);
    }
  }
  for (const file of expectedTargetFiles) {
    if (!layout.targetFiles.includes(file)) {
      throw new TypeError(`control-plane synthetic fixture set layout missing target file ${file}`);
    }
  }
  for (const testFile of expectedTargetTests) {
    if (!layout.targetTests.includes(testFile)) {
      throw new TypeError(`control-plane synthetic fixture set layout missing target test ${testFile}`);
    }
  }
  for (const fixtureFile of expectedFixtureFiles) {
    if (!layout.fixtureFiles.includes(fixtureFile)) {
      throw new TypeError(`control-plane synthetic fixture set layout missing fixture file ${fixtureFile}`);
    }
  }
  for (const prefix of expectedNamespacePrefixes) {
    if (!layout.allowedNamespacePrefixes.includes(prefix)) {
      throw new TypeError(`control-plane synthetic fixture set layout missing namespace prefix ${prefix}`);
    }
  }
  for (const domain of expectedDomains) {
    if (!layout.allowedDomains.includes(domain)) {
      throw new TypeError(`control-plane synthetic fixture set layout missing allowed domain ${domain}`);
    }
  }
  if (layout.nextSubphase !== "RP00.P01.M06.S02") {
    throw new TypeError("control-plane synthetic fixture set layout must hand off to RP00.P01.M06.S02");
  }

  return true;
}

export function assertControlPlaneStateEnumRegistryLayout(layout = CONTROL_PLANE_STATE_ENUM_REGISTRY_LAYOUT) {
  const requiredCollections = ["targetFiles", "targetTests", "fixtureFiles", "coveredEnumFamilies", "futureEnumSubphases"];
  const expectedTargetFiles = [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ];
  const expectedTargetTests = [
    "packages/control-plane/test/model.test.js",
  ];
  const expectedFixtureFiles = [
    "packages/control-plane/fixtures/synthetic-control-plane.json",
  ];
  const expectedEnumFamilies = [
    "control_plane_entity_names",
    "control_plane_lifecycle_states",
    "control_plane_review_outcomes",
    "product_contract_status_values",
    "ai_control_rule_status_values",
    "ai_allowed_action_values",
    "ai_forbidden_action_values",
    "control_plane_boundary_flags",
  ];

  if (layout.subphaseId !== "RP00.P01.M07.S01") {
    throw new TypeError("control-plane state enum registry layout must bind to RP00.P01.M07.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M07") {
    throw new TypeError("control-plane state enum registry layout must bind to RP00.P01.M07");
  }
  if (layout.enumSourceFile !== "packages/control-plane/src/states.js") {
    throw new TypeError("control-plane state enum registry layout must bind the states source file");
  }
  if (layout.registryFile !== "packages/control-plane/src/registry.js") {
    throw new TypeError("control-plane state enum registry layout must bind the registry source file");
  }
  if (layout.implementsEnumValues !== false) {
    throw new TypeError("control-plane state enum registry layout must not claim enum value completion");
  }
  if (layout.bindsPreexistingEnumExports !== true || layout.definesNewEnumValues !== false) {
    throw new TypeError("control-plane state enum registry layout must bind preexisting enum exports without defining new enum values");
  }
  if (layout.valueDefinitionScope !== "binds_preexisting_enum_exports_without_creating_new_enum_values") {
    throw new TypeError("control-plane state enum registry layout must record its value definition scope");
  }
  if (layout.noRealData !== true || layout.writesProductState !== false) {
    throw new TypeError("control-plane state enum registry layout must be no-real-data and no-write");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("control-plane state enum registry layout boundary flags must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`control-plane state enum registry layout missing ${collection}`);
    }
  }
  for (const targetFile of expectedTargetFiles) {
    if (!layout.targetFiles.includes(targetFile)) {
      throw new TypeError(`control-plane state enum registry layout missing target file ${targetFile}`);
    }
  }
  for (const targetTest of expectedTargetTests) {
    if (!layout.targetTests.includes(targetTest)) {
      throw new TypeError(`control-plane state enum registry layout missing target test ${targetTest}`);
    }
  }
  for (const fixtureFile of expectedFixtureFiles) {
    if (!layout.fixtureFiles.includes(fixtureFile)) {
      throw new TypeError(`control-plane state enum registry layout missing fixture file ${fixtureFile}`);
    }
  }
  for (const enumFamily of expectedEnumFamilies) {
    if (!layout.coveredEnumFamilies.includes(enumFamily)) {
      throw new TypeError(`control-plane state enum registry layout missing enum family ${enumFamily}`);
    }
    if (!layout.enumFamilyFutureSubphaseMap || !layout.futureEnumSubphases.includes(layout.enumFamilyFutureSubphaseMap[enumFamily])) {
      throw new TypeError(`control-plane state enum registry layout missing future subphase map for ${enumFamily}`);
    }
  }
  if (!layout.futureEnumSubphases.includes("RP00.P01.M07.S02") || !layout.futureEnumSubphases.includes("RP00.P01.M07.S11")) {
    throw new TypeError("control-plane state enum registry layout must defer enum completion to future M07 subphases");
  }
  if (layout.nextSubphase !== "RP00.P01.M07.S02") {
    throw new TypeError("control-plane state enum registry layout must hand off to RP00.P01.M07.S02");
  }

  return true;
}

export function assertControlPlaneHermesEvidencePacketLayout(layout = CONTROL_PLANE_HERMES_EVIDENCE_PACKET_LAYOUT) {
  const requiredCollections = [
    "targetFiles",
    "targetTests",
    "fixtureFiles",
    "commandReceiptFields",
    "evidenceSummaryFields",
    "requiredPacketFields",
    "relationshipTargets",
    "futurePacketSubphases",
  ];
  const expectedTargetFiles = [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/registry.js",
  ];
  const expectedRelationshipTargets = [
    "Tenant",
    "AuditEventReference",
    "HermesGate",
    "BlockedClaim",
    "ProductContract",
    "AIControlRule",
    "ClaudeReviewGate",
    "HumanApproval",
  ];

  if (layout.subphaseId !== "RP00.P01.M08.S01") {
    throw new TypeError("control-plane Hermes evidence packet layout must bind to RP00.P01.M08.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M08") {
    throw new TypeError("control-plane Hermes evidence packet layout must bind to RP00.P01.M08");
  }
  if (layout.packetName !== "control_plane_hermes_evidence_packet") {
    throw new TypeError("control-plane Hermes evidence packet layout must name the packet surface");
  }
  if (layout.expectedSurface !== "ControlPlaneHermesEvidencePacket") {
    throw new TypeError("control-plane Hermes evidence packet layout expected surface mismatch");
  }
  if (layout.implementedPacketIdentifier !== false || layout.implementedTenantScope !== false) {
    throw new TypeError("control-plane Hermes evidence packet layout must not claim packet identifier or tenant scope completion");
  }
  if (layout.doesNotMutateEntityRegistry !== true) {
    throw new TypeError("control-plane Hermes evidence packet layout must not mutate entity registry values");
  }
  if (layout.noRealData !== true || layout.writesProductState !== false) {
    throw new TypeError("control-plane Hermes evidence packet layout must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`control-plane Hermes evidence packet layout missing ${collection}`);
    }
  }
  for (const file of expectedTargetFiles) {
    if (!layout.targetFiles.includes(file)) {
      throw new TypeError(`control-plane Hermes evidence packet layout missing target file ${file}`);
    }
  }
  for (const relationshipTarget of expectedRelationshipTargets) {
    if (!layout.relationshipTargets.includes(relationshipTarget)) {
      throw new TypeError(`control-plane Hermes evidence packet layout missing relationship target ${relationshipTarget}`);
    }
  }
  if (!layout.futurePacketSubphases.includes("RP00.P01.M08.S02") || !layout.futurePacketSubphases.includes("RP00.P01.M08.S03")) {
    throw new TypeError("control-plane Hermes evidence packet layout must defer identifier and tenant scope subphases");
  }
  if (layout.nextSubphase !== "RP00.P01.M08.S02") {
    throw new TypeError("control-plane Hermes evidence packet layout must hand off to RP00.P01.M08.S02");
  }

  return true;
}

export function normalizeControlPlaneHermesEvidencePacketId(value) {
  assertControlPlaneString(value, "packet_id", "ControlPlaneHermesEvidencePacket");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneHermesEvidencePacket packet_id must start with hep_");
  }
  if (!CONTROL_PLANE_HERMES_EVIDENCE_PACKET_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneHermesEvidencePacket packet_id must be lowercase snake_case with no leading or trailing whitespace");
  }
  return normalized;
}

export function validateControlPlaneHermesEvidencePacketId(value) {
  const normalized = normalizeControlPlaneHermesEvidencePacketId(value);
  if (normalized !== value) {
    throw new TypeError("ControlPlaneHermesEvidencePacket packet_id must be stored in canonical form");
  }
  return true;
}

export function normalizeControlPlaneHermesEvidencePacketTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "ControlPlaneHermesEvidencePacket");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneHermesEvidencePacket.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!CONTROL_PLANE_HERMES_EVIDENCE_PACKET_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneHermesEvidencePacket.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneHermesEvidencePacketTenantId(value) {
  const normalized = normalizeControlPlaneHermesEvidencePacketTenantId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneHermesEvidencePacket.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function controlPlaneHermesEvidencePacketTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("ControlPlaneHermesEvidencePacket tenant scope context must provide tenant_id");
}

export function assertControlPlaneHermesEvidencePacketTenantScope(evidencePacket, tenantContext) {
  if (!evidencePacket || typeof evidencePacket !== "object") {
    throw new TypeError("ControlPlaneHermesEvidencePacket tenant scope requires an evidence packet object");
  }
  validateControlPlaneHermesEvidencePacketId(evidencePacket.packet_id);
  validateControlPlaneHermesEvidencePacketTenantId(evidencePacket.tenant_id);
  const contextTenantId = normalizeControlPlaneHermesEvidencePacketTenantId(
    controlPlaneHermesEvidencePacketTenantIdFromContext(tenantContext),
  );
  if (evidencePacket.tenant_id !== contextTenantId) {
    throw new TypeError("ControlPlaneHermesEvidencePacket.tenant_id must match tenant scope context");
  }
  return true;
}

export function assertControlPlaneExportModelRegistryLayout(layout = CONTROL_PLANE_EXPORT_MODEL_REGISTRY_LAYOUT) {
  if (!layout || typeof layout !== "object") {
    throw new TypeError("control-plane export model registry layout must be an object");
  }
  if (layout.subphaseId !== "RP00.P01.M09.S01") {
    throw new TypeError("control-plane export model registry layout must bind to RP00.P01.M09.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M09") {
    throw new TypeError("control-plane export model registry layout must bind to RP00.P01.M09");
  }
  if (layout.registryName !== "control_plane_export_model_registry") {
    throw new TypeError("control-plane export model registry layout must name the registry surface");
  }
  if (layout.expectedSurface !== "ControlPlaneExportModelRegistry") {
    throw new TypeError("control-plane export model registry layout expected surface mismatch");
  }
  if (layout.implementedRegistryIdentifier !== false || layout.implementedTenantScope !== false) {
    throw new TypeError("control-plane export model registry layout must not claim identifier or tenant scope completion");
  }
  if (layout.doesNotMutateEntityRegistry !== true) {
    throw new TypeError("control-plane export model registry layout must not mutate entity registry values");
  }
  if (layout.noRealData !== true || layout.writesProductState !== false) {
    throw new TypeError("control-plane export model registry layout must be no-real-data and no-write");
  }
  for (const file of [
    "packages/control-plane/src/model.js",
    "packages/control-plane/src/states.js",
    "packages/control-plane/src/registry.js",
  ]) {
    if (!layout.targetFiles.includes(file)) {
      throw new TypeError(`control-plane export model registry layout missing target file ${file}`);
    }
  }
  for (const exportGroup of [
    "domain_model_definitions",
    "state_constants",
    "domain_model_registry",
    "fixture_contracts",
    "validation_helpers",
  ]) {
    if (!layout.requiredExportGroups.includes(exportGroup)) {
      throw new TypeError(`control-plane export model registry layout missing export group ${exportGroup}`);
    }
  }
  for (const registryField of [
    "packageLayout",
    "productContractModel",
    "aiControlRuleModel",
    "hermesGatePackageLayout",
    "claudeReviewGatePackageLayout",
    "humanApprovalPackageLayout",
    "hermesEvidencePacketLayout",
    "hermesEvidencePacketTenantScopePolicy",
  ]) {
    if (!layout.requiredRegistryFields.includes(registryField)) {
      throw new TypeError(`control-plane export model registry layout missing registry field ${registryField}`);
    }
  }
  if (!layout.futureRegistrySubphases.includes("RP00.P01.M09.S02") || !layout.futureRegistrySubphases.includes("RP00.P01.M09.S03")) {
    throw new TypeError("control-plane export model registry layout must defer identifier and tenant scope subphases");
  }
  if (layout.nextSubphase !== "RP00.P01.M09.S02") {
    throw new TypeError("control-plane export model registry layout must hand off to RP00.P01.M09.S02");
  }
  return true;
}

export function normalizeControlPlaneExportModelRegistryId(value) {
  assertControlPlaneString(value, "registry_id", "ControlPlaneExportModelRegistry");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneExportModelRegistry registry_id must start with emr_");
  }
  if (!CONTROL_PLANE_EXPORT_MODEL_REGISTRY_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneExportModelRegistry registry_id must be lowercase snake_case with no leading or trailing whitespace");
  }
  return normalized;
}

export function validateControlPlaneExportModelRegistryId(value) {
  const normalized = normalizeControlPlaneExportModelRegistryId(value);
  if (normalized !== value) {
    throw new TypeError("ControlPlaneExportModelRegistry registry_id must be stored in canonical form");
  }
  return true;
}

export function normalizeControlPlaneExportModelRegistryTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "ControlPlaneExportModelRegistry");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneExportModelRegistry.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!CONTROL_PLANE_EXPORT_MODEL_REGISTRY_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneExportModelRegistry.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneExportModelRegistryTenantId(value) {
  const normalized = normalizeControlPlaneExportModelRegistryTenantId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneExportModelRegistry.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function controlPlaneExportModelRegistryTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("ControlPlaneExportModelRegistry tenant scope context must provide tenant_id");
}

export function assertControlPlaneExportModelRegistryTenantScope(exportModelRegistry, tenantContext) {
  if (!exportModelRegistry || typeof exportModelRegistry !== "object") {
    throw new TypeError("ControlPlaneExportModelRegistry tenant scope requires an export model registry object");
  }
  validateControlPlaneExportModelRegistryId(exportModelRegistry.registry_id);
  validateControlPlaneExportModelRegistryTenantId(exportModelRegistry.tenant_id);
  const contextTenantId = normalizeControlPlaneExportModelRegistryTenantId(
    controlPlaneExportModelRegistryTenantIdFromContext(tenantContext),
  );
  if (exportModelRegistry.tenant_id !== contextTenantId) {
    throw new TypeError("ControlPlaneExportModelRegistry.tenant_id must match tenant scope context");
  }
  return true;
}

export function normalizeControlPlaneStateEnumRegistryId(value) {
  assertControlPlaneString(value, "registry_id", "ControlPlaneStateEnumRegistry");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_STATE_ENUM_REGISTRY_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.registry_id must use the ser_ stable id prefix");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.registry_id must be canonical ser_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneStateEnumRegistryId(value) {
  const normalized = normalizeControlPlaneStateEnumRegistryId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneStateEnumRegistry.registry_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeControlPlaneStateEnumRegistryTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "ControlPlaneStateEnumRegistry");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneStateEnumRegistryTenantId(value) {
  const normalized = normalizeControlPlaneStateEnumRegistryTenantId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneStateEnumRegistry.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function controlPlaneStateEnumRegistryTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("ControlPlaneStateEnumRegistry tenant scope context must provide tenant_id");
}

export function assertControlPlaneStateEnumRegistryTenantScope(stateEnumRegistry, tenantContext) {
  if (!stateEnumRegistry || typeof stateEnumRegistry !== "object") {
    throw new TypeError("ControlPlaneStateEnumRegistry tenant scope requires a state enum registry object");
  }
  validateControlPlaneStateEnumRegistryId(stateEnumRegistry.registry_id);
  validateControlPlaneStateEnumRegistryTenantId(stateEnumRegistry.tenant_id);
  const contextTenantId = normalizeControlPlaneStateEnumRegistryTenantId(
    controlPlaneStateEnumRegistryTenantIdFromContext(tenantContext),
  );
  if (stateEnumRegistry.tenant_id !== contextTenantId) {
    throw new TypeError("ControlPlaneStateEnumRegistry.tenant_id must match tenant scope context");
  }
  return true;
}

export function normalizeControlPlaneStateEnumRegistryMatterId(value) {
  if (value === null || value === undefined) return null;
  assertControlPlaneString(value, "matter_id", "ControlPlaneStateEnumRegistry");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_TRACE_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id must use the matter_ stable id prefix");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_MATTER_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id must be canonical matter_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneStateEnumRegistryMatterId(value) {
  const normalized = normalizeControlPlaneStateEnumRegistryMatterId(value);
  if (normalized === null) return true;
  if (value !== normalized) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function controlPlaneStateEnumRegistryMatterIdFromContext(matterContext) {
  if (matterContext === null || matterContext === undefined) return null;
  if (typeof matterContext === "string") return matterContext;
  if (matterContext && typeof matterContext === "object") return matterContext.matter_id;
  throw new TypeError("ControlPlaneStateEnumRegistry Matter trace context must provide matter_id");
}

export function assertControlPlaneStateEnumRegistryMatterTrace(stateEnumRegistry, matterContext = null) {
  if (!stateEnumRegistry || typeof stateEnumRegistry !== "object") {
    throw new TypeError("ControlPlaneStateEnumRegistry Matter trace requires a state enum registry object");
  }
  validateControlPlaneStateEnumRegistryId(stateEnumRegistry.registry_id);
  validateControlPlaneStateEnumRegistryTenantId(stateEnumRegistry.tenant_id);
  validateControlPlaneStateEnumRegistryMatterId(stateEnumRegistry.matter_id ?? null);
  const registryMatterId = normalizeControlPlaneStateEnumRegistryMatterId(stateEnumRegistry.matter_id ?? null);
  const contextMatterId = normalizeControlPlaneStateEnumRegistryMatterId(controlPlaneStateEnumRegistryMatterIdFromContext(matterContext));
  if (registryMatterId === null && contextMatterId === null) return true;
  if (registryMatterId === null) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id is required when Matter trace context is provided");
  }
  if (contextMatterId === null) {
    throw new TypeError("ControlPlaneStateEnumRegistry Matter trace context is required when matter_id is present");
  }
  if (!matterContext || typeof matterContext !== "object" || matterContext.tenant_id == null) {
    throw new TypeError("ControlPlaneStateEnumRegistry Matter trace context must include tenant_id when matter_id is present");
  }
  if (registryMatterId !== contextMatterId) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id must match Matter trace context");
  }
  const matterTenantId = normalizeControlPlaneStateEnumRegistryTenantId(matterContext.tenant_id);
  if (stateEnumRegistry.tenant_id !== matterTenantId) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id must not reference a Matter from another tenant");
  }
  return true;
}

export function validateControlPlaneStateEnumRegistryStatus(value) {
  assertControlPlaneString(value, "status", "ControlPlaneStateEnumRegistry");
  const normalized = value.trim();
  if (value !== normalized) {
    throw new TypeError("ControlPlaneStateEnumRegistry.status must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_STATUS_VALUES.includes(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.status must be a known lifecycle status");
  }
  return true;
}

export function validateControlPlaneStateEnumRegistryOwnershipMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry ownership metadata must be an object");
  }

  assertControlPlaneString(value.owner_module, "owner_module", "ControlPlaneStateEnumRegistry");
  if (value.owner_module !== CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.ownerModule) {
    throw new TypeError("ControlPlaneStateEnumRegistry.owner_module must be packages/control-plane");
  }

  assertControlPlaneString(value.owner_role, "owner_role", "ControlPlaneStateEnumRegistry");
  if (value.owner_role !== value.owner_role.trim()) {
    throw new TypeError("ControlPlaneStateEnumRegistry.owner_role must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_ROLE_VALUES.includes(value.owner_role)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.owner_role must be a known owner role");
  }

  assertControlPlaneString(value.steward_ref, "steward_ref", "ControlPlaneStateEnumRegistry");
  if (value.steward_ref !== value.steward_ref.trim()) {
    throw new TypeError("ControlPlaneStateEnumRegistry.steward_ref must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNER_REF_PATTERN.test(value.steward_ref)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.steward_ref must use a synthetic owner reference");
  }

  assertControlPlaneString(value.correction_route, "correction_route", "ControlPlaneStateEnumRegistry");
  if (value.correction_route !== value.correction_route.trim()) {
    throw new TypeError("ControlPlaneStateEnumRegistry.correction_route must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_CORRECTION_ROUTE_PATTERN.test(value.correction_route)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.correction_route must use a blocked_claim correction route");
  }

  assertControlPlaneStringArray(value.may_reference, "may_reference", "ControlPlaneStateEnumRegistry");
  for (const reference of value.may_reference) {
    if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference.includes(reference)) {
      throw new TypeError("ControlPlaneStateEnumRegistry.may_reference includes unsupported target");
    }
  }
  for (const requiredReference of CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayReference) {
    if (!value.may_reference.includes(requiredReference)) {
      throw new TypeError("ControlPlaneStateEnumRegistry.may_reference must include required ownership reference boundaries");
    }
  }

  assertControlPlaneStringArray(value.may_not_mutate, "may_not_mutate", "ControlPlaneStateEnumRegistry");
  for (const mutationBoundary of value.may_not_mutate) {
    if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate.includes(mutationBoundary)) {
      throw new TypeError("ControlPlaneStateEnumRegistry.may_not_mutate includes unsupported mutation boundary");
    }
  }
  for (const requiredMutationBoundary of CONTROL_PLANE_STATE_ENUM_REGISTRY_OWNERSHIP_POLICY.mayNotMutate) {
    if (!value.may_not_mutate.includes(requiredMutationBoundary)) {
      throw new TypeError("ControlPlaneStateEnumRegistry.may_not_mutate must include required mutation boundaries");
    }
  }

  return true;
}

function validateControlPlaneStateEnumRegistryRefArray(value, fieldName, pattern, expectedDescription) {
  const refs = value ?? [];
  assertControlPlaneStringArray(refs, fieldName, "ControlPlaneStateEnumRegistry", { allowEmpty: true });
  for (const ref of refs) {
    if (ref !== ref.trim()) {
      throw new TypeError(`ControlPlaneStateEnumRegistry.${fieldName} must be stored without leading or trailing whitespace`);
    }
    if (!pattern.test(ref)) {
      throw new TypeError(`ControlPlaneStateEnumRegistry.${fieldName} must use ${expectedDescription}`);
    }
  }
  return true;
}

export function validateControlPlaneStateEnumRegistryReferenceRelationships(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry reference relationship map must be an object");
  }

  validateControlPlaneStateEnumRegistryId(value.registry_id);
  validateControlPlaneStateEnumRegistryTenantId(value.tenant_id);
  if (tenantContext != null) {
    assertControlPlaneStateEnumRegistryTenantScope(
      { registry_id: value.registry_id, tenant_id: value.tenant_id },
      tenantContext,
    );
  }

  validateControlPlaneStateEnumRegistryMatterId(value.matter_id);
  if (matterContext != null) {
    assertControlPlaneStateEnumRegistryMatterTrace(
      { registry_id: value.registry_id, tenant_id: value.tenant_id, matter_id: value.matter_id },
      matterContext,
    );
  }

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "ControlPlaneStateEnumRegistry");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("ControlPlaneStateEnumRegistry.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.audit_event_ref must use a synthetic audit reference");
  }

  validateControlPlaneStateEnumRegistryRefArray(
    value.blocked_claim_refs,
    "blocked_claim_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_BLOCKED_CLAIM_REF_PATTERN,
    "blocked_claim references",
  );
  validateControlPlaneStateEnumRegistryRefArray(
    value.product_contract_refs,
    "product_contract_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_PRODUCT_CONTRACT_REF_PATTERN,
    "canonical ProductContract references",
  );
  validateControlPlaneStateEnumRegistryRefArray(
    value.ai_control_rule_refs,
    "ai_control_rule_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_AI_CONTROL_RULE_REF_PATTERN,
    "canonical AIControlRule references",
  );
  validateControlPlaneStateEnumRegistryRefArray(
    value.hermes_gate_refs,
    "hermes_gate_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_HERMES_GATE_REF_PATTERN,
    "synthetic HermesGate references",
  );
  validateControlPlaneStateEnumRegistryRefArray(
    value.claude_review_gate_refs,
    "claude_review_gate_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_CLAUDE_REVIEW_GATE_REF_PATTERN,
    "synthetic ClaudeReviewGate references",
  );
  validateControlPlaneStateEnumRegistryRefArray(
    value.human_approval_refs,
    "human_approval_refs",
    CONTROL_PLANE_STATE_ENUM_REGISTRY_HUMAN_APPROVAL_REF_PATTERN,
    "synthetic HumanApproval references",
  );

  return true;
}

export function validateControlPlaneStateEnumRegistryRequiredFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry required field registry input must be an object");
  }
  for (const field of CONTROL_PLANE_STATE_ENUM_REGISTRY_REQUIRED_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      throw new TypeError(`ControlPlaneStateEnumRegistry required field ${field} is missing`);
    }
  }

  validateControlPlaneStateEnumRegistryId(value.registry_id);
  validateControlPlaneStateEnumRegistryTenantId(value.tenant_id);
  validateControlPlaneStateEnumRegistryStatus(value.status);
  validateControlPlaneStateEnumRegistryOwnershipMetadata({
    owner_module: value.owner_module,
    owner_role: value.owner_role,
    steward_ref: value.steward_ref,
    correction_route: value.correction_route,
    may_reference: value.may_reference,
    may_not_mutate: value.may_not_mutate,
  });

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "ControlPlaneStateEnumRegistry");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("ControlPlaneStateEnumRegistry.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!CONTROL_PLANE_STATE_ENUM_REGISTRY_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("ControlPlaneStateEnumRegistry.audit_event_ref must use a synthetic audit reference");
  }

  return true;
}

export function validateControlPlaneStateEnumRegistryOptionalFields(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry optional field registry input must be an object");
  }

  const allowedFields = new Set(["registry_id", "tenant_id", ...CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throw new TypeError(`ControlPlaneStateEnumRegistry optional field registry received unsupported field ${field}`);
    }
  }

  if (tenantContext != null) {
    assertControlPlaneStateEnumRegistryTenantScope(
      {
        registry_id: value.registry_id,
        tenant_id: value.tenant_id,
      },
      tenantContext,
    );
  }

  if (Object.hasOwn(value, "matter_id")) {
    validateControlPlaneStateEnumRegistryMatterId(value.matter_id);
    if (matterContext != null) {
      assertControlPlaneStateEnumRegistryMatterTrace(
        {
          registry_id: value.registry_id,
          tenant_id: value.tenant_id,
          matter_id: value.matter_id,
        },
        matterContext,
      );
    }
  } else if (matterContext != null) {
    throw new TypeError("ControlPlaneStateEnumRegistry.matter_id is required when Matter trace context is provided");
  }

  if ("blocked_claim_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.blocked_claim_refs,
      "blocked_claim_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_BLOCKED_CLAIM_REF_PATTERN,
      "blocked_claim references",
    );
  }
  if ("product_contract_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.product_contract_refs,
      "product_contract_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_PRODUCT_CONTRACT_REF_PATTERN,
      "canonical ProductContract references",
    );
  }
  if ("ai_control_rule_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.ai_control_rule_refs,
      "ai_control_rule_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_AI_CONTROL_RULE_REF_PATTERN,
      "canonical AIControlRule references",
    );
  }
  if ("hermes_gate_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.hermes_gate_refs,
      "hermes_gate_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_HERMES_GATE_REF_PATTERN,
      "synthetic HermesGate references",
    );
  }
  if ("claude_review_gate_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.claude_review_gate_refs,
      "claude_review_gate_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_CLAUDE_REVIEW_GATE_REF_PATTERN,
      "synthetic ClaudeReviewGate references",
    );
  }
  if ("human_approval_refs" in value) {
    validateControlPlaneStateEnumRegistryRefArray(
      value.human_approval_refs,
      "human_approval_refs",
      CONTROL_PLANE_STATE_ENUM_REGISTRY_HUMAN_APPROVAL_REF_PATTERN,
      "synthetic HumanApproval references",
    );
  }

  return true;
}

function controlPlaneStateEnumRegistryTransitionTargets(fromStatus) {
  validateControlPlaneStateEnumRegistryStatus(fromStatus);
  return CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.allowedTransitions.find((transition) => transition.from === fromStatus)?.to ?? [];
}

function controlPlaneStateEnumRegistryTransitionEdge(fromStatus, toStatus) {
  validateControlPlaneStateEnumRegistryStatus(fromStatus);
  validateControlPlaneStateEnumRegistryStatus(toStatus);
  const edge = CONTROL_PLANE_STATE_ENUM_REGISTRY_STATE_TRANSITION_MAP.transitionEdges.find(
    (transition) => transition.from === fromStatus && transition.to === toStatus,
  );
  if (!edge) {
    throw new TypeError(`ControlPlaneStateEnumRegistry status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return edge;
}

export function canTransitionControlPlaneStateEnumRegistryStatus(fromStatus, toStatus) {
  validateControlPlaneStateEnumRegistryStatus(toStatus);
  return controlPlaneStateEnumRegistryTransitionTargets(fromStatus).includes(toStatus);
}

export function assertControlPlaneStateEnumRegistryStatusTransition(fromStatus, toStatus) {
  if (!canTransitionControlPlaneStateEnumRegistryStatus(fromStatus, toStatus)) {
    throw new TypeError(`ControlPlaneStateEnumRegistry status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return true;
}

function assertControlPlaneStateEnumRegistryEvidenceObject(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("ControlPlaneStateEnumRegistry transition evidence must be an object");
  }
}

export function assertControlPlaneStateEnumRegistryTransitionEvidence(fromStatus, toStatus, evidence) {
  const edge = controlPlaneStateEnumRegistryTransitionEdge(fromStatus, toStatus);
  assertControlPlaneStateEnumRegistryEvidenceObject(evidence);
  if (evidence[edge.requiredEvidence] !== true) {
    throw new TypeError(`ControlPlaneStateEnumRegistry status transition from ${fromStatus} to ${toStatus} requires ${edge.requiredEvidence}`);
  }
  return true;
}

export function validateControlPlaneStateEnumRegistry(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("ControlPlaneStateEnumRegistry validation helper input must be an object");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("ControlPlaneStateEnumRegistry validation helper options must be an object");
  }

  validateControlPlaneStateEnumRegistryRequiredFields(value);
  const optionalFieldSlice = {
    registry_id: value.registry_id,
    tenant_id: value.tenant_id,
  };
  for (const field of CONTROL_PLANE_STATE_ENUM_REGISTRY_OPTIONAL_FIELDS) {
    if (Object.hasOwn(value, field)) optionalFieldSlice[field] = value[field];
  }
  validateControlPlaneStateEnumRegistryOptionalFields(optionalFieldSlice, options.tenantContext ?? null, options.matterContext ?? null);
  validateControlPlaneStateEnumRegistryReferenceRelationships(
    {
      ...value,
      matter_id: "matter_id" in value ? value.matter_id : null,
      blocked_claim_refs: value.blocked_claim_refs ?? [],
      product_contract_refs: value.product_contract_refs ?? [],
      ai_control_rule_refs: value.ai_control_rule_refs ?? [],
      hermes_gate_refs: value.hermes_gate_refs ?? [],
      claude_review_gate_refs: value.claude_review_gate_refs ?? [],
      human_approval_refs: value.human_approval_refs ?? [],
    },
    options.tenantContext ?? null,
    options.matterContext ?? null,
  );

  if ("fromStatus" in options) {
    assertControlPlaneStateEnumRegistryTransitionEvidence(options.fromStatus, value.status, options.evidence);
  }

  return true;
}

export function normalizeControlPlaneSyntheticFixtureSetId(value) {
  assertControlPlaneString(value, "fixture_set_id", "ControlPlaneSyntheticFixtureSet");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.fixture_set_id must use the fs_ stable id prefix");
  }
  if (!CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.fixture_set_id must be canonical fs_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneSyntheticFixtureSetId(value) {
  const normalized = normalizeControlPlaneSyntheticFixtureSetId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.fixture_set_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeControlPlaneSyntheticFixtureSetTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "ControlPlaneSyntheticFixtureSet");
  const normalized = value.trim();
  if (!normalized.startsWith(CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!CONTROL_PLANE_SYNTHETIC_FIXTURE_SET_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateControlPlaneSyntheticFixtureSetTenantId(value) {
  const normalized = normalizeControlPlaneSyntheticFixtureSetTenantId(value);
  if (value !== normalized) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function controlPlaneSyntheticFixtureSetTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("ControlPlaneSyntheticFixtureSet tenant scope context must provide tenant_id");
}

export function assertControlPlaneSyntheticFixtureSetTenantScope(fixtureSet, tenantContext) {
  if (!fixtureSet || typeof fixtureSet !== "object") {
    throw new TypeError("ControlPlaneSyntheticFixtureSet tenant scope requires a fixture set object");
  }
  validateControlPlaneSyntheticFixtureSetId(fixtureSet.fixture_set_id);
  validateControlPlaneSyntheticFixtureSetTenantId(fixtureSet.tenant_id);
  const contextTenantId = normalizeControlPlaneSyntheticFixtureSetTenantId(
    controlPlaneSyntheticFixtureSetTenantIdFromContext(tenantContext),
  );
  if (fixtureSet.tenant_id !== contextTenantId) {
    throw new TypeError("ControlPlaneSyntheticFixtureSet.tenant_id must match tenant scope context");
  }
  return true;
}

export function assertHermesGatePackageLayout(layout = HERMES_GATE_PACKAGE_LAYOUT) {
  const requiredCollections = ["targetFiles", "targetTests", "fixtureFiles", "futureModelSubphases"];

  if (layout.subphaseId !== "RP00.P01.M03.S01") {
    throw new TypeError("HermesGate package layout must bind to RP00.P01.M03.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M03") {
    throw new TypeError("HermesGate package layout must bind to RP00.P01.M03");
  }
  if (layout.expectedEntity !== "HermesGate" || layout.implementedModel !== false) {
    throw new TypeError("HermesGate package layout must not claim HermesGate model completion");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("HermesGate package layout must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`HermesGate package layout missing ${collection}`);
    }
  }

  return true;
}

export function assertClaudeReviewGatePackageLayout(layout = CLAUDE_REVIEW_GATE_PACKAGE_LAYOUT) {
  const requiredCollections = ["targetFiles", "targetTests", "fixtureFiles", "futureModelSubphases"];

  if (layout.subphaseId !== "RP00.P01.M04.S01") {
    throw new TypeError("ClaudeReviewGate package layout must bind to RP00.P01.M04.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M04") {
    throw new TypeError("ClaudeReviewGate package layout must bind to RP00.P01.M04");
  }
  if (layout.expectedEntity !== "ClaudeReviewGate" || layout.implementedModel !== false) {
    throw new TypeError("ClaudeReviewGate package layout must not claim ClaudeReviewGate model completion");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("ClaudeReviewGate package layout must be no-real-data and no-write");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`ClaudeReviewGate package layout missing ${collection}`);
    }
  }

  return true;
}

export function assertHumanApprovalPackageLayout(layout = HUMAN_APPROVAL_PACKAGE_LAYOUT) {
  const requiredCollections = ["targetFiles", "targetTests", "fixtureFiles", "futureModelSubphases"];

  if (layout.subphaseId !== "RP00.P01.M05.S01") {
    throw new TypeError("HumanApproval package layout must bind to RP00.P01.M05.S01");
  }
  if (layout.sourceMicroPhaseId !== "RP00.P01.M05") {
    throw new TypeError("HumanApproval package layout must bind to RP00.P01.M05");
  }
  if (layout.expectedEntity !== "HumanApproval" || layout.implementedModel !== false) {
    throw new TypeError("HumanApproval package layout must not claim HumanApproval model completion");
  }
  if (layout.boundaryFlags?.noRealData !== true || layout.boundaryFlags?.writesProductState !== false) {
    throw new TypeError("HumanApproval package layout must be no-real-data and no-write");
  }
  if (layout.cannotSynthesizeHumanApproval !== true) {
    throw new TypeError("HumanApproval package layout must not synthesize human approval");
  }
  for (const collection of requiredCollections) {
    if (!Array.isArray(layout[collection]) || layout[collection].length === 0) {
      throw new TypeError(`HumanApproval package layout missing ${collection}`);
    }
  }

  return true;
}

export function normalizeHumanApprovalId(value) {
  assertControlPlaneString(value, "approval_id", "HumanApproval");
  const normalized = value.trim();
  if (!normalized.startsWith(HUMAN_APPROVAL_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("HumanApproval.approval_id must use the ha_ stable id prefix");
  }
  if (!HUMAN_APPROVAL_ID_PATTERN.test(normalized)) {
    throw new TypeError("HumanApproval.approval_id must be canonical ha_ lowercase snake-case");
  }
  return normalized;
}

export function validateHumanApprovalId(value) {
  const normalized = normalizeHumanApprovalId(value);
  if (value !== normalized) {
    throw new TypeError("HumanApproval.approval_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeHumanApprovalTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "HumanApproval");
  const normalized = value.trim();
  if (!normalized.startsWith(HUMAN_APPROVAL_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("HumanApproval.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!HUMAN_APPROVAL_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("HumanApproval.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateHumanApprovalTenantId(value) {
  const normalized = normalizeHumanApprovalTenantId(value);
  if (value !== normalized) {
    throw new TypeError("HumanApproval.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function humanApprovalTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("HumanApproval tenant scope context must provide tenant_id");
}

export function assertHumanApprovalTenantScope(approval, tenantContext) {
  if (!approval || typeof approval !== "object") {
    throw new TypeError("HumanApproval tenant scope requires an approval object");
  }
  validateHumanApprovalId(approval.approval_id);
  validateHumanApprovalTenantId(approval.tenant_id);
  const approvalTenantId = approval.tenant_id;
  const contextTenantId = normalizeHumanApprovalTenantId(humanApprovalTenantIdFromContext(tenantContext));
  if (approvalTenantId !== contextTenantId) {
    throw new TypeError("HumanApproval.tenant_id must match tenant scope context");
  }
  return true;
}

export function normalizeHumanApprovalMatterId(value) {
  if (value === null || value === undefined) return null;
  assertControlPlaneString(value, "matter_id", "HumanApproval");
  const normalized = value.trim();
  if (!normalized.startsWith(HUMAN_APPROVAL_MATTER_TRACE_POLICY.stablePrefix)) {
    throw new TypeError("HumanApproval.matter_id must use the matter_ stable id prefix");
  }
  if (!HUMAN_APPROVAL_MATTER_ID_PATTERN.test(normalized)) {
    throw new TypeError("HumanApproval.matter_id must be canonical matter_ lowercase snake-case");
  }
  return normalized;
}

export function validateHumanApprovalMatterId(value) {
  const normalized = normalizeHumanApprovalMatterId(value);
  if (normalized === null) return true;
  if (value !== normalized) {
    throw new TypeError("HumanApproval.matter_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function humanApprovalMatterIdFromContext(matterContext) {
  if (matterContext === null || matterContext === undefined) return null;
  if (typeof matterContext === "string") return matterContext;
  if (matterContext && typeof matterContext === "object") return matterContext.matter_id;
  throw new TypeError("HumanApproval Matter trace context must provide matter_id");
}

export function assertHumanApprovalMatterTrace(approval, matterContext = null) {
  if (!approval || typeof approval !== "object") {
    throw new TypeError("HumanApproval Matter trace requires an approval object");
  }
  validateHumanApprovalId(approval.approval_id);
  validateHumanApprovalTenantId(approval.tenant_id);
  validateHumanApprovalMatterId(approval.matter_id ?? null);
  const approvalMatterId = normalizeHumanApprovalMatterId(approval.matter_id ?? null);
  const contextMatterId = normalizeHumanApprovalMatterId(humanApprovalMatterIdFromContext(matterContext));
  if (approvalMatterId === null && contextMatterId === null) return true;
  if (approvalMatterId === null) {
    throw new TypeError("HumanApproval.matter_id is required when Matter trace context is provided");
  }
  if (contextMatterId === null) {
    throw new TypeError("HumanApproval Matter trace context is required when matter_id is present");
  }
  if (!matterContext || typeof matterContext !== "object" || matterContext.tenant_id == null) {
    throw new TypeError("HumanApproval Matter trace context must include tenant_id when matter_id is present");
  }
  if (approvalMatterId !== contextMatterId) {
    throw new TypeError("HumanApproval.matter_id must match Matter trace context");
  }
  const matterTenantId = normalizeHumanApprovalTenantId(matterContext.tenant_id);
  if (approval.tenant_id !== matterTenantId) {
    throw new TypeError("HumanApproval.matter_id must not reference a Matter from another tenant");
  }
  return true;
}

export function validateHumanApprovalStatus(value) {
  assertControlPlaneString(value, "status", "HumanApproval");
  const normalized = value.trim();
  if (value !== normalized) {
    throw new TypeError("HumanApproval.status must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_STATUS_VALUES.includes(value)) {
    throw new TypeError("HumanApproval.status must be a known lifecycle status");
  }
  return true;
}

export function validateHumanApprovalOwnershipMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HumanApproval ownership metadata must be an object");
  }

  assertControlPlaneString(value.owner_module, "owner_module", "HumanApproval");
  if (value.owner_module !== HUMAN_APPROVAL_OWNERSHIP_POLICY.ownerModule) {
    throw new TypeError("HumanApproval.owner_module must be packages/control-plane");
  }

  assertControlPlaneString(value.owner_role, "owner_role", "HumanApproval");
  if (value.owner_role !== value.owner_role.trim()) {
    throw new TypeError("HumanApproval.owner_role must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_OWNER_ROLE_VALUES.includes(value.owner_role)) {
    throw new TypeError("HumanApproval.owner_role must be a known owner role");
  }

  assertControlPlaneString(value.steward_ref, "steward_ref", "HumanApproval");
  if (value.steward_ref !== value.steward_ref.trim()) {
    throw new TypeError("HumanApproval.steward_ref must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_OWNER_REF_PATTERN.test(value.steward_ref)) {
    throw new TypeError("HumanApproval.steward_ref must use a synthetic owner reference");
  }

  assertControlPlaneString(value.correction_route, "correction_route", "HumanApproval");
  if (value.correction_route !== value.correction_route.trim()) {
    throw new TypeError("HumanApproval.correction_route must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_CORRECTION_ROUTE_PATTERN.test(value.correction_route)) {
    throw new TypeError("HumanApproval.correction_route must use a blocked_claim correction route");
  }

  assertControlPlaneStringArray(value.may_reference, "may_reference", "HumanApproval");
  for (const reference of value.may_reference) {
    if (!HUMAN_APPROVAL_OWNERSHIP_POLICY.mayReference.includes(reference)) {
      throw new TypeError("HumanApproval.may_reference includes unsupported target");
    }
  }
  for (const requiredReference of HUMAN_APPROVAL_OWNERSHIP_POLICY.mayReference) {
    if (!value.may_reference.includes(requiredReference)) {
      throw new TypeError("HumanApproval.may_reference must include required ownership reference boundaries");
    }
  }

  assertControlPlaneStringArray(value.may_not_mutate, "may_not_mutate", "HumanApproval");
  for (const mutationBoundary of value.may_not_mutate) {
    if (!HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate.includes(mutationBoundary)) {
      throw new TypeError("HumanApproval.may_not_mutate includes unsupported mutation boundary");
    }
  }
  for (const requiredMutationBoundary of HUMAN_APPROVAL_OWNERSHIP_POLICY.mayNotMutate) {
    if (!value.may_not_mutate.includes(requiredMutationBoundary)) {
      throw new TypeError("HumanApproval.may_not_mutate must include required mutation boundaries");
    }
  }

  return true;
}

export function validateHumanApprovalReferenceRelationships(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HumanApproval reference relationship map must be an object");
  }

  validateHumanApprovalId(value.approval_id);
  validateHumanApprovalTenantId(value.tenant_id);
  if (tenantContext != null) {
    assertHumanApprovalTenantScope(
      { approval_id: value.approval_id, tenant_id: value.tenant_id },
      tenantContext,
    );
  }

  validateHumanApprovalMatterId(value.matter_id);
  if (matterContext != null) {
    assertHumanApprovalMatterTrace(
      { approval_id: value.approval_id, tenant_id: value.tenant_id, matter_id: value.matter_id },
      matterContext,
    );
  }

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "HumanApproval");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("HumanApproval.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("HumanApproval.audit_event_ref must use a synthetic audit reference");
  }

  const blockedClaimRefs = value.blocked_claim_refs ?? [];
  assertControlPlaneStringArray(blockedClaimRefs, "blocked_claim_refs", "HumanApproval", { allowEmpty: true });
  for (const blockedClaimRef of blockedClaimRefs) {
    if (blockedClaimRef !== blockedClaimRef.trim()) {
      throw new TypeError("HumanApproval.blocked_claim_refs must be stored without leading or trailing whitespace");
    }
    if (!HUMAN_APPROVAL_BLOCKED_CLAIM_REF_PATTERN.test(blockedClaimRef)) {
      throw new TypeError("HumanApproval.blocked_claim_refs must use blocked_claim references");
    }
  }

  const hermesGateRefs = value.hermes_gate_refs ?? [];
  assertControlPlaneStringArray(hermesGateRefs, "hermes_gate_refs", "HumanApproval", { allowEmpty: true });
  for (const hermesGateRef of hermesGateRefs) {
    if (hermesGateRef !== hermesGateRef.trim()) {
      throw new TypeError("HumanApproval.hermes_gate_refs must be stored without leading or trailing whitespace");
    }
    if (!HUMAN_APPROVAL_HERMES_GATE_REF_PATTERN.test(hermesGateRef)) {
      throw new TypeError("HumanApproval.hermes_gate_refs must use synthetic HermesGate references");
    }
  }

  const claudeReviewGateRefs = value.claude_review_gate_refs ?? [];
  assertControlPlaneStringArray(claudeReviewGateRefs, "claude_review_gate_refs", "HumanApproval", { allowEmpty: true });
  for (const claudeReviewGateRef of claudeReviewGateRefs) {
    if (claudeReviewGateRef !== claudeReviewGateRef.trim()) {
      throw new TypeError("HumanApproval.claude_review_gate_refs must be stored without leading or trailing whitespace");
    }
    if (!HUMAN_APPROVAL_CLAUDE_REVIEW_GATE_REF_PATTERN.test(claudeReviewGateRef)) {
      throw new TypeError("HumanApproval.claude_review_gate_refs must use synthetic ClaudeReviewGate references");
    }
  }

  return true;
}

export function validateHumanApprovalRequiredFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HumanApproval required field registry input must be an object");
  }
  for (const field of HUMAN_APPROVAL_REQUIRED_FIELDS) {
    if (!(field in value)) {
      throw new TypeError(`HumanApproval required field ${field} is missing`);
    }
  }

  validateHumanApprovalId(value.approval_id);
  validateHumanApprovalTenantId(value.tenant_id);
  validateHumanApprovalStatus(value.status);
  validateHumanApprovalOwnershipMetadata({
    owner_module: value.owner_module,
    owner_role: value.owner_role,
    steward_ref: value.steward_ref,
    correction_route: value.correction_route,
    may_reference: value.may_reference,
    may_not_mutate: value.may_not_mutate,
  });

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "HumanApproval");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("HumanApproval.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!HUMAN_APPROVAL_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("HumanApproval.audit_event_ref must use a synthetic audit reference");
  }

  return true;
}

export function validateHumanApprovalOptionalFields(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HumanApproval optional field registry input must be an object");
  }

  const allowedFields = new Set(["approval_id", "tenant_id", ...HUMAN_APPROVAL_OPTIONAL_FIELDS]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throw new TypeError(`HumanApproval optional field registry received unsupported field ${field}`);
    }
  }

  if (tenantContext != null) {
    assertHumanApprovalTenantScope(
      {
        approval_id: value.approval_id,
        tenant_id: value.tenant_id,
      },
      tenantContext,
    );
  }

  if ("matter_id" in value) {
    validateHumanApprovalMatterId(value.matter_id);
    if (matterContext != null) {
      assertHumanApprovalMatterTrace(
        {
          approval_id: value.approval_id,
          tenant_id: value.tenant_id,
          matter_id: value.matter_id,
        },
        matterContext,
      );
    }
  }

  if ("blocked_claim_refs" in value) {
    assertControlPlaneStringArray(value.blocked_claim_refs, "blocked_claim_refs", "HumanApproval", { allowEmpty: true });
    for (const blockedClaimRef of value.blocked_claim_refs) {
      if (blockedClaimRef !== blockedClaimRef.trim()) {
        throw new TypeError("HumanApproval.blocked_claim_refs must be stored without leading or trailing whitespace");
      }
      if (!HUMAN_APPROVAL_BLOCKED_CLAIM_REF_PATTERN.test(blockedClaimRef)) {
        throw new TypeError("HumanApproval.blocked_claim_refs must use blocked_claim references");
      }
    }
  }

  if ("hermes_gate_refs" in value) {
    assertControlPlaneStringArray(value.hermes_gate_refs, "hermes_gate_refs", "HumanApproval", { allowEmpty: true });
    for (const hermesGateRef of value.hermes_gate_refs) {
      if (hermesGateRef !== hermesGateRef.trim()) {
        throw new TypeError("HumanApproval.hermes_gate_refs must be stored without leading or trailing whitespace");
      }
      if (!HUMAN_APPROVAL_HERMES_GATE_REF_PATTERN.test(hermesGateRef)) {
        throw new TypeError("HumanApproval.hermes_gate_refs must use synthetic HermesGate references");
      }
    }
  }

  if ("claude_review_gate_refs" in value) {
    assertControlPlaneStringArray(value.claude_review_gate_refs, "claude_review_gate_refs", "HumanApproval", { allowEmpty: true });
    for (const claudeReviewGateRef of value.claude_review_gate_refs) {
      if (claudeReviewGateRef !== claudeReviewGateRef.trim()) {
        throw new TypeError("HumanApproval.claude_review_gate_refs must be stored without leading or trailing whitespace");
      }
      if (!HUMAN_APPROVAL_CLAUDE_REVIEW_GATE_REF_PATTERN.test(claudeReviewGateRef)) {
        throw new TypeError("HumanApproval.claude_review_gate_refs must use synthetic ClaudeReviewGate references");
      }
    }
  }

  return true;
}

function humanApprovalTransitionTargets(fromStatus) {
  validateHumanApprovalStatus(fromStatus);
  return HUMAN_APPROVAL_STATE_TRANSITION_MAP.allowedTransitions.find((transition) => transition.from === fromStatus)?.to ?? [];
}

function humanApprovalTransitionEdge(fromStatus, toStatus) {
  validateHumanApprovalStatus(fromStatus);
  validateHumanApprovalStatus(toStatus);
  const edge = HUMAN_APPROVAL_STATE_TRANSITION_MAP.transitionEdges.find(
    (transition) => transition.from === fromStatus && transition.to === toStatus,
  );
  if (!edge) {
    throw new TypeError(`HumanApproval status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return edge;
}

export function canTransitionHumanApprovalStatus(fromStatus, toStatus) {
  validateHumanApprovalStatus(toStatus);
  return humanApprovalTransitionTargets(fromStatus).includes(toStatus);
}

export function assertHumanApprovalStatusTransition(fromStatus, toStatus) {
  if (!canTransitionHumanApprovalStatus(fromStatus, toStatus)) {
    throw new TypeError(`HumanApproval status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return true;
}

function assertHumanApprovalEvidenceObject(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("HumanApproval transition evidence must be an object");
  }
}

export function assertHumanApprovalTransitionEvidence(fromStatus, toStatus, evidence) {
  const edge = humanApprovalTransitionEdge(fromStatus, toStatus);
  assertHumanApprovalEvidenceObject(evidence);
  if (evidence[edge.requiredEvidence] !== true) {
    throw new TypeError(`HumanApproval status transition from ${fromStatus} to ${toStatus} requires ${edge.requiredEvidence}`);
  }
  return true;
}

export function validateHumanApproval(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HumanApproval validation helper input must be an object");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("HumanApproval validation helper options must be an object");
  }

  const allowedFields = new Set([...HUMAN_APPROVAL_REQUIRED_FIELDS, ...HUMAN_APPROVAL_OPTIONAL_FIELDS]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throw new TypeError(`HumanApproval validation helper received unsupported field ${field}`);
    }
  }

  validateHumanApprovalRequiredFields(value);
  assertHumanApprovalTenantScope(value, options.tenantContext);
  const optionalFieldRecord = Object.fromEntries(
    ["approval_id", "tenant_id", ...HUMAN_APPROVAL_OPTIONAL_FIELDS]
      .filter((field) => field in value)
      .map((field) => [field, value[field]]),
  );
  validateHumanApprovalOptionalFields(optionalFieldRecord, options.tenantContext ?? null, options.matterContext ?? null);
  assertHumanApprovalMatterTrace(
    {
      approval_id: value.approval_id,
      tenant_id: value.tenant_id,
      matter_id: value.matter_id ?? null,
    },
    options.matterContext ?? null,
  );
  validateHumanApprovalReferenceRelationships(
    {
      ...value,
      matter_id: "matter_id" in value ? value.matter_id : null,
      blocked_claim_refs: value.blocked_claim_refs ?? [],
      hermes_gate_refs: value.hermes_gate_refs ?? [],
      claude_review_gate_refs: value.claude_review_gate_refs ?? [],
    },
    options.tenantContext ?? null,
    options.matterContext ?? null,
  );

  if ("fromStatus" in options) {
    assertHumanApprovalTransitionEvidence(options.fromStatus, value.status, options.evidence);
  }

  return true;
}

export function normalizeClaudeReviewGateId(value) {
  assertControlPlaneString(value, "review_id", "ClaudeReviewGate");
  const normalized = value.trim();
  if (!normalized.startsWith(CLAUDE_REVIEW_GATE_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("ClaudeReviewGate.review_id must use the crg_ stable id prefix");
  }
  if (!CLAUDE_REVIEW_GATE_ID_PATTERN.test(normalized)) {
    throw new TypeError("ClaudeReviewGate.review_id must be canonical crg_ lowercase snake-case");
  }
  return normalized;
}

export function validateClaudeReviewGateId(value) {
  const normalized = normalizeClaudeReviewGateId(value);
  if (value !== normalized) {
    throw new TypeError("ClaudeReviewGate.review_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeClaudeReviewGateTenantId(value) {
  if (value === null || value === undefined) return null;
  assertControlPlaneString(value, "tenant_id", "ClaudeReviewGate");
  const normalized = value.trim();
  if (!normalized.startsWith(CLAUDE_REVIEW_GATE_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("ClaudeReviewGate.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!CLAUDE_REVIEW_GATE_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("ClaudeReviewGate.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateClaudeReviewGateTenantId(value) {
  const normalized = normalizeClaudeReviewGateTenantId(value);
  if (normalized === null) return true;
  if (value !== normalized) {
    throw new TypeError("ClaudeReviewGate.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function claudeReviewGateTenantIdFromContext(tenantContext) {
  if (tenantContext === null || tenantContext === undefined) return null;
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("ClaudeReviewGate tenant scope context must provide tenant_id");
}

export function assertClaudeReviewGateTenantScope(reviewGate, tenantContext = null) {
  if (!reviewGate || typeof reviewGate !== "object") {
    throw new TypeError("ClaudeReviewGate tenant scope requires a review gate object");
  }
  const reviewTenantId = normalizeClaudeReviewGateTenantId(reviewGate.tenant_id ?? null);
  const contextTenantId = normalizeClaudeReviewGateTenantId(claudeReviewGateTenantIdFromContext(tenantContext));
  if (reviewTenantId === null && contextTenantId === null) return true;
  if (reviewTenantId === null) {
    throw new TypeError("ClaudeReviewGate.tenant_id is required when tenant scope context is provided");
  }
  if (contextTenantId === null) {
    throw new TypeError("ClaudeReviewGate tenant scope context is required when tenant_id is present");
  }
  if (reviewTenantId !== contextTenantId) {
    throw new TypeError("ClaudeReviewGate.tenant_id must match tenant scope context");
  }
  return true;
}

export function normalizeClaudeReviewGateMatterId(value) {
  if (value === null || value === undefined) return null;
  assertControlPlaneString(value, "matter_id", "ClaudeReviewGate");
  const normalized = value.trim();
  if (!normalized.startsWith(CLAUDE_REVIEW_GATE_MATTER_TRACE_POLICY.stablePrefix)) {
    throw new TypeError("ClaudeReviewGate.matter_id must use the matter_ stable id prefix");
  }
  if (!CLAUDE_REVIEW_GATE_MATTER_ID_PATTERN.test(normalized)) {
    throw new TypeError("ClaudeReviewGate.matter_id must be canonical matter_ lowercase snake-case");
  }
  return normalized;
}

export function validateClaudeReviewGateMatterId(value) {
  const normalized = normalizeClaudeReviewGateMatterId(value);
  if (normalized === null) return true;
  if (value !== normalized) {
    throw new TypeError("ClaudeReviewGate.matter_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function claudeReviewGateMatterIdFromContext(matterContext) {
  if (matterContext === null || matterContext === undefined) return null;
  if (typeof matterContext === "string") return matterContext;
  if (matterContext && typeof matterContext === "object") return matterContext.matter_id;
  throw new TypeError("ClaudeReviewGate Matter trace context must provide matter_id");
}

export function assertClaudeReviewGateMatterTrace(reviewGate, matterContext = null) {
  if (!reviewGate || typeof reviewGate !== "object") {
    throw new TypeError("ClaudeReviewGate Matter trace requires a review gate object");
  }
  validateClaudeReviewGateMatterId(reviewGate.matter_id ?? null);
  const reviewMatterId = normalizeClaudeReviewGateMatterId(reviewGate.matter_id ?? null);
  const contextMatterId = normalizeClaudeReviewGateMatterId(claudeReviewGateMatterIdFromContext(matterContext));
  if (reviewMatterId === null && contextMatterId === null) return true;
  if (reviewMatterId === null) {
    throw new TypeError("ClaudeReviewGate.matter_id is required when Matter trace context is provided");
  }
  if (contextMatterId === null) {
    throw new TypeError("ClaudeReviewGate Matter trace context is required when matter_id is present");
  }
  if (reviewMatterId !== contextMatterId) {
    throw new TypeError("ClaudeReviewGate.matter_id must match Matter trace context");
  }
  if (reviewGate.tenant_id != null && matterContext && typeof matterContext === "object" && matterContext.tenant_id != null) {
    const reviewTenantId = normalizeClaudeReviewGateTenantId(reviewGate.tenant_id);
    const matterTenantId = normalizeClaudeReviewGateTenantId(matterContext.tenant_id);
    if (reviewTenantId !== matterTenantId) {
      throw new TypeError("ClaudeReviewGate.matter_id must not reference a Matter from another tenant");
    }
  }
  return true;
}

export function normalizeHermesGateId(value) {
  assertControlPlaneString(value, "gate_id", "HermesGate");
  const normalized = value.trim();
  if (!normalized.startsWith(HERMES_GATE_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("HermesGate.gate_id must use the hg_ stable id prefix");
  }
  if (!HERMES_GATE_ID_PATTERN.test(normalized)) {
    throw new TypeError("HermesGate.gate_id must be canonical hg_ lowercase snake-case");
  }
  return normalized;
}

export function validateHermesGateId(value) {
  const normalized = normalizeHermesGateId(value);
  if (value !== normalized) {
    throw new TypeError("HermesGate.gate_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeHermesGateTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "HermesGate");
  const normalized = value.trim();
  if (!normalized.startsWith(HERMES_GATE_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("HermesGate.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!HERMES_GATE_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("HermesGate.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateHermesGateTenantId(value) {
  const normalized = normalizeHermesGateTenantId(value);
  if (value !== normalized) {
    throw new TypeError("HermesGate.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function hermesGateTenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("HermesGate tenant scope context must provide tenant_id");
}

export function assertHermesGateTenantScope(gate, tenantContext) {
  if (!gate || typeof gate !== "object") {
    throw new TypeError("HermesGate tenant scope requires a gate object");
  }
  const gateTenantId = normalizeHermesGateTenantId(gate.tenant_id);
  const contextTenantId = normalizeHermesGateTenantId(hermesGateTenantIdFromContext(tenantContext));
  if (gateTenantId !== contextTenantId) {
    throw new TypeError("HermesGate.tenant_id must match tenant scope context");
  }
  return true;
}

export function normalizeHermesGateMatterId(value) {
  if (value == null) return null;
  assertControlPlaneString(value, "matter_id", "HermesGate");
  const normalized = value.trim();
  if (!normalized.startsWith(HERMES_GATE_MATTER_TRACE_POLICY.stablePrefix)) {
    throw new TypeError("HermesGate.matter_id must use the matter_ stable id prefix");
  }
  if (!HERMES_GATE_MATTER_ID_PATTERN.test(normalized)) {
    throw new TypeError("HermesGate.matter_id must be canonical matter_ lowercase snake-case");
  }
  return normalized;
}

export function validateHermesGateMatterId(value) {
  const normalized = normalizeHermesGateMatterId(value);
  if (normalized === null) return true;
  if (value !== normalized) {
    throw new TypeError("HermesGate.matter_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function hermesGateMatterIdFromContext(matterContext) {
  if (typeof matterContext === "string") return matterContext;
  if (matterContext && typeof matterContext === "object" && "matter_id" in matterContext) return matterContext.matter_id;
  throw new TypeError("HermesGate Matter trace context must provide matter_id");
}

export function assertHermesGateMatterTrace(gate, matterContext = null) {
  if (!gate || typeof gate !== "object") {
    throw new TypeError("HermesGate Matter trace requires a gate object");
  }
  validateHermesGateMatterId(gate.matter_id);
  const gateMatterId = normalizeHermesGateMatterId(gate.matter_id);
  if (matterContext == null) return true;

  const contextMatterId = normalizeHermesGateMatterId(hermesGateMatterIdFromContext(matterContext));
  if (contextMatterId === null || gateMatterId === null || gateMatterId !== contextMatterId) {
    throw new TypeError("HermesGate.matter_id must match Matter trace context");
  }
  if (gate.tenant_id != null && matterContext && typeof matterContext === "object" && matterContext.tenant_id != null) {
    const gateTenantId = normalizeHermesGateTenantId(gate.tenant_id);
    const matterTenantId = normalizeHermesGateTenantId(matterContext.tenant_id);
    if (gateTenantId !== matterTenantId) {
      throw new TypeError("HermesGate.matter_id must not reference a Matter from another tenant");
    }
  }
  return true;
}

export function validateHermesGateStatus(value) {
  assertControlPlaneString(value, "status", "HermesGate");
  const normalized = value.trim();
  if (value !== normalized) {
    throw new TypeError("HermesGate.status must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_STATUS_VALUES.includes(value)) {
    throw new TypeError("HermesGate.status must be a known lifecycle status");
  }
  return true;
}

export function validateHermesGateOwnershipMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HermesGate ownership metadata must be an object");
  }

  assertControlPlaneString(value.owner_module, "owner_module", "HermesGate");
  if (value.owner_module !== HERMES_GATE_OWNERSHIP_POLICY.ownerModule) {
    throw new TypeError("HermesGate.owner_module must be packages/control-plane");
  }

  assertControlPlaneString(value.owner_role, "owner_role", "HermesGate");
  if (value.owner_role !== value.owner_role.trim()) {
    throw new TypeError("HermesGate.owner_role must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_OWNER_ROLE_VALUES.includes(value.owner_role)) {
    throw new TypeError("HermesGate.owner_role must be a known owner role");
  }

  assertControlPlaneString(value.steward_ref, "steward_ref", "HermesGate");
  if (value.steward_ref !== value.steward_ref.trim()) {
    throw new TypeError("HermesGate.steward_ref must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_OWNER_REF_PATTERN.test(value.steward_ref)) {
    throw new TypeError("HermesGate.steward_ref must use a synthetic owner reference");
  }

  assertControlPlaneString(value.correction_route, "correction_route", "HermesGate");
  if (value.correction_route !== value.correction_route.trim()) {
    throw new TypeError("HermesGate.correction_route must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_CORRECTION_ROUTE_PATTERN.test(value.correction_route)) {
    throw new TypeError("HermesGate.correction_route must use a blocked_claim correction route");
  }

  assertControlPlaneStringArray(value.may_reference, "may_reference", "HermesGate");
  for (const reference of value.may_reference) {
    if (!HERMES_GATE_OWNERSHIP_POLICY.mayReference.includes(reference)) {
      throw new TypeError(`HermesGate.may_reference contains unknown reference ${reference}`);
    }
  }

  assertControlPlaneStringArray(value.may_not_mutate, "may_not_mutate", "HermesGate");
  for (const mutationBoundary of value.may_not_mutate) {
    if (!HERMES_GATE_OWNERSHIP_POLICY.mayNotMutate.includes(mutationBoundary)) {
      throw new TypeError(`HermesGate.may_not_mutate contains unknown mutation boundary ${mutationBoundary}`);
    }
  }

  return true;
}

export function validateHermesGateReferenceRelationships(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HermesGate reference relationship map must be an object");
  }

  validateHermesGateTenantId(value.tenant_id);
  if (tenantContext != null) {
    assertHermesGateTenantScope({ tenant_id: value.tenant_id }, tenantContext);
  }

  validateHermesGateMatterId(value.matter_id);
  if (matterContext != null) {
    assertHermesGateMatterTrace(
      { tenant_id: value.tenant_id, matter_id: value.matter_id },
      matterContext,
    );
  }

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "HermesGate");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("HermesGate.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("HermesGate.audit_event_ref must use a synthetic audit reference");
  }

  assertControlPlaneStringArray(value.blocked_claim_refs, "blocked_claim_refs", "HermesGate", { allowEmpty: true });
  for (const blockedClaimRef of value.blocked_claim_refs) {
    if (blockedClaimRef !== blockedClaimRef.trim()) {
      throw new TypeError("HermesGate.blocked_claim_refs must be stored without leading or trailing whitespace");
    }
    if (!HERMES_GATE_BLOCKED_CLAIM_REF_PATTERN.test(blockedClaimRef)) {
      throw new TypeError("HermesGate.blocked_claim_refs must use blocked_claim references");
    }
  }

  assertControlPlaneStringArray(value.human_approval_refs, "human_approval_refs", "HermesGate", { allowEmpty: true });
  for (const humanApprovalRef of value.human_approval_refs) {
    if (humanApprovalRef !== humanApprovalRef.trim()) {
      throw new TypeError("HermesGate.human_approval_refs must be stored without leading or trailing whitespace");
    }
    if (!HERMES_GATE_HUMAN_APPROVAL_REF_PATTERN.test(humanApprovalRef)) {
      throw new TypeError("HermesGate.human_approval_refs must use synthetic human approval references");
    }
  }

  return true;
}

export function validateHermesGateRequiredFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HermesGate required field registry input must be an object");
  }
  for (const field of HERMES_GATE_REQUIRED_FIELDS) {
    if (!(field in value)) {
      throw new TypeError(`HermesGate required field ${field} is missing`);
    }
  }

  validateHermesGateId(value.gate_id);
  validateHermesGateTenantId(value.tenant_id);
  validateHermesGateStatus(value.status);
  validateHermesGateOwnershipMetadata({
    owner_module: value.owner_module,
    owner_role: value.owner_role,
    steward_ref: value.steward_ref,
    correction_route: value.correction_route,
    may_reference: value.may_reference,
    may_not_mutate: value.may_not_mutate,
  });

  assertControlPlaneString(value.audit_event_ref, "audit_event_ref", "HermesGate");
  if (value.audit_event_ref !== value.audit_event_ref.trim()) {
    throw new TypeError("HermesGate.audit_event_ref must be stored without leading or trailing whitespace");
  }
  if (!HERMES_GATE_AUDIT_EVENT_REF_PATTERN.test(value.audit_event_ref)) {
    throw new TypeError("HermesGate.audit_event_ref must use a synthetic audit reference");
  }

  return true;
}

export function validateHermesGateOptionalFields(value, tenantContext = null, matterContext = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HermesGate optional field registry input must be an object");
  }

  if ("matter_id" in value) {
    validateHermesGateMatterId(value.matter_id);
    if (matterContext != null) {
      assertHermesGateMatterTrace(
        { tenant_id: value.tenant_id, matter_id: value.matter_id },
        matterContext,
      );
    }
  }

  if ("blocked_claim_refs" in value) {
    assertControlPlaneStringArray(value.blocked_claim_refs, "blocked_claim_refs", "HermesGate", { allowEmpty: true });
    for (const blockedClaimRef of value.blocked_claim_refs) {
      if (blockedClaimRef !== blockedClaimRef.trim()) {
        throw new TypeError("HermesGate.blocked_claim_refs must be stored without leading or trailing whitespace");
      }
      if (!HERMES_GATE_BLOCKED_CLAIM_REF_PATTERN.test(blockedClaimRef)) {
        throw new TypeError("HermesGate.blocked_claim_refs must use blocked_claim references");
      }
    }
  }

  if ("human_approval_refs" in value) {
    assertControlPlaneStringArray(value.human_approval_refs, "human_approval_refs", "HermesGate", { allowEmpty: true });
    for (const humanApprovalRef of value.human_approval_refs) {
      if (humanApprovalRef !== humanApprovalRef.trim()) {
        throw new TypeError("HermesGate.human_approval_refs must be stored without leading or trailing whitespace");
      }
      if (!HERMES_GATE_HUMAN_APPROVAL_REF_PATTERN.test(humanApprovalRef)) {
        throw new TypeError("HermesGate.human_approval_refs must use synthetic human approval references");
      }
    }
  }

  return true;
}

function hermesGateTransitionTargets(fromStatus) {
  validateHermesGateStatus(fromStatus);
  return HERMES_GATE_STATE_TRANSITION_MAP.allowedTransitions.find((transition) => transition.from === fromStatus)?.to ?? [];
}

function hermesGateTransitionEdge(fromStatus, toStatus) {
  validateHermesGateStatus(fromStatus);
  validateHermesGateStatus(toStatus);
  const edge = HERMES_GATE_STATE_TRANSITION_MAP.transitionEdges.find(
    (transition) => transition.from === fromStatus && transition.to === toStatus,
  );
  if (!edge) {
    throw new TypeError(`HermesGate status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return edge;
}

export function canTransitionHermesGateStatus(fromStatus, toStatus) {
  validateHermesGateStatus(toStatus);
  return hermesGateTransitionTargets(fromStatus).includes(toStatus);
}

export function assertHermesGateStatusTransition(fromStatus, toStatus) {
  if (!canTransitionHermesGateStatus(fromStatus, toStatus)) {
    throw new TypeError(`HermesGate status transition from ${fromStatus} to ${toStatus} is not allowed`);
  }
  return true;
}

function assertHermesGateEvidenceObject(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("HermesGate transition evidence must be an object");
  }
}

export function assertHermesGateTransitionEvidence(fromStatus, toStatus, evidence) {
  const edge = hermesGateTransitionEdge(fromStatus, toStatus);
  assertHermesGateEvidenceObject(evidence);
  if (evidence[edge.requiredEvidence] !== true) {
    throw new TypeError(`HermesGate status transition from ${fromStatus} to ${toStatus} requires ${edge.requiredEvidence}`);
  }
  return true;
}

export function validateHermesGate(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("HermesGate validation helper input must be an object");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("HermesGate validation helper options must be an object");
  }

  validateHermesGateRequiredFields(value);
  validateHermesGateOptionalFields(value, options.tenantContext ?? null, options.matterContext ?? null);
  validateHermesGateReferenceRelationships(
    {
      ...value,
      matter_id: "matter_id" in value ? value.matter_id : null,
      blocked_claim_refs: value.blocked_claim_refs ?? [],
      human_approval_refs: value.human_approval_refs ?? [],
    },
    options.tenantContext ?? null,
    options.matterContext ?? null,
  );

  if ("fromStatus" in options) {
    assertHermesGateTransitionEvidence(options.fromStatus, value.status, options.evidence);
  }

  return true;
}

export const PRODUCT_CONTRACT_REQUIRED_FIELDS = Object.freeze([
  "contract_id",
  "tenant_id",
  "spec_version",
  "effective_status",
  "module_scope",
  "requirement_refs",
  "acceptance_gate_refs",
  "audit_event_ref",
  "created_at",
  "updated_at",
]);

export const PRODUCT_CONTRACT_MODEL = Object.freeze({
  subphaseId: "RP00.P01.M01.S01",
  sourceMicroPhaseId: "RP00.P01.M01",
  entity: "ProductContract",
  title: "Implement ProductContract model",
  status: "production_ready",
  ownerModule: "packages/control-plane",
  identifierField: "contract_id",
  identifierPrefix: "pc_",
  tenantScoped: true,
  requiredFields: PRODUCT_CONTRACT_REQUIRED_FIELDS,
  statusField: "effective_status",
  statusValues: PRODUCT_CONTRACT_STATUS_VALUES,
  matterReferencePolicy: Object.freeze({
    field: "matter_refs",
    nullableForFirmLevelContracts: true,
    requiredWhen: Object.freeze([
      "client_data_touched",
      "matter_data_touched",
      "document_data_touched",
      "billing_or_finance_data_touched",
      "client_facing_ai_output_touched",
      "external_share_or_portal_output_touched",
    ]),
  }),
  auditMetadataFields: Object.freeze([
    "audit_event_ref",
    "created_at",
    "updated_at",
  ]),
  nextSubphase: "RP00.P01.M02.S01",
});

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`ProductContract.${fieldName} must be a non-empty string`);
  }
}

function assertStringArray(value, fieldName, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`ProductContract.${fieldName} must be a ${allowEmpty ? "" : "non-empty "}string array`);
  }
  for (const item of value) assertNonEmptyString(item, fieldName);
}

function assertIsoDateTime(value, fieldName) {
  assertNonEmptyString(value, fieldName);
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`ProductContract.${fieldName} must be an ISO datetime string`);
  }
}

export function validateProductContract(contract) {
  if (!contract || typeof contract !== "object") {
    throw new TypeError("ProductContract must be an object");
  }

  assertNonEmptyString(contract.contract_id, "contract_id");
  if (!contract.contract_id.startsWith(PRODUCT_CONTRACT_MODEL.identifierPrefix)) {
    throw new TypeError("ProductContract.contract_id must use the pc_ stable id prefix");
  }
  assertNonEmptyString(contract.tenant_id, "tenant_id");
  assertNonEmptyString(contract.spec_version, "spec_version");
  if (!PRODUCT_CONTRACT_STATUS_VALUES.includes(contract.effective_status)) {
    throw new TypeError("ProductContract.effective_status must be a ProductContract.status value");
  }
  assertStringArray(contract.module_scope, "module_scope");
  assertStringArray(contract.requirement_refs, "requirement_refs");
  assertStringArray(contract.acceptance_gate_refs, "acceptance_gate_refs");
  assertStringArray(contract.matter_refs ?? [], "matter_refs", { allowEmpty: true });
  assertNonEmptyString(contract.audit_event_ref, "audit_event_ref");
  assertIsoDateTime(contract.created_at, "created_at");
  assertIsoDateTime(contract.updated_at, "updated_at");
  if (Date.parse(contract.updated_at) < Date.parse(contract.created_at)) {
    throw new TypeError("ProductContract.updated_at must not be earlier than created_at");
  }

  return true;
}

export function createProductContract(input) {
  validateProductContract(input);

  return Object.freeze({
    contract_id: input.contract_id,
    tenant_id: input.tenant_id,
    spec_version: input.spec_version,
    effective_status: input.effective_status,
    module_scope: Object.freeze([...input.module_scope]),
    requirement_refs: Object.freeze([...input.requirement_refs]),
    acceptance_gate_refs: Object.freeze([...input.acceptance_gate_refs]),
    matter_refs: Object.freeze([...(input.matter_refs ?? [])]),
    audit_event_ref: input.audit_event_ref,
    created_at: input.created_at,
    updated_at: input.updated_at,
  });
}

export const AI_CONTROL_RULE_REQUIRED_FIELDS = Object.freeze([
  "rule_id",
  "tenant_id",
  "scope",
  "effective_status",
  "allowed_actions",
  "forbidden_actions",
  "review_required_when",
  "blocked_claim_refs",
  "audit_event_ref",
  "created_at",
  "updated_at",
]);

const AI_CONTROL_RULE_ID_PATTERN = /^air_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const AI_CONTROL_RULE_TENANT_ID_PATTERN = /^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export const AI_CONTROL_RULE_IDENTIFIER_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M02.S02",
  sourceMicroPhaseId: "RP00.P01.M02",
  entity: "AIControlRule",
  title: "Primary entity identifier",
  status: "production_ready",
  field: "rule_id",
  stablePrefix: "air_",
  canonicalPattern: "^air_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  uniquenessPolicy: "primary_identifier_is_stable_and_non_reusable_within_the_AIControlRule_entity",
  auditPurpose: "bind every AIControlRule record, closeout packet, and blocked-claim reference to a stable auditable identifier",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_air_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
  ]),
  noRealData: true,
  writesProductState: false,
  tenantScopeCompletionSubphase: "RP00.P01.M02.S03",
  nextSubphase: "RP00.P01.M02.S03",
});

export const AI_CONTROL_RULE_TENANT_SCOPE_POLICY = Object.freeze({
  subphaseId: "RP00.P01.M02.S03",
  sourceMicroPhaseId: "RP00.P01.M02",
  entity: "AIControlRule",
  title: "Tenant scope field",
  status: "production_ready",
  field: "tenant_id",
  required: true,
  targetEntity: "Tenant",
  stablePrefix: "lfos_",
  canonicalPattern: "^lfos_[a-z0-9]+(?:_[a-z0-9]+)*$",
  normalization: "trim_input_then_store_canonical_value_without_case_or_separator_changes",
  sameTenantRequired: true,
  tenantIsolationInvariant: "AIControlRule.tenant_id must match the provided tenant context before permission, audit, or AI action decisions can run",
  crossTenantFailureMode: "cross_tenant_ai_control_rule_scope_denied",
  forbiddenForms: Object.freeze([
    "blank",
    "missing_lfos_prefix",
    "uppercase",
    "hyphenated",
    "double_underscore",
    "path_or_url_like",
    "leading_or_trailing_whitespace_in_stored_record",
    "cross_tenant_reference",
  ]),
  noRealData: true,
  writesProductState: false,
  nextSubphase: "RP00.P01.M03.S01",
});

export const AI_CONTROL_RULE_MODEL = Object.freeze({
  subphaseId: "RP00.P01.M02.S01",
  sourceMicroPhaseId: "RP00.P01.M02",
  entity: "AIControlRule",
  title: "Implement AIControlRule model",
  status: "production_ready",
  ownerModule: "packages/control-plane",
  identifierField: "rule_id",
  identifierPrefix: "air_",
  identifierPolicy: AI_CONTROL_RULE_IDENTIFIER_POLICY,
  tenantScoped: true,
  tenantScopePolicy: AI_CONTROL_RULE_TENANT_SCOPE_POLICY,
  requiredFields: AI_CONTROL_RULE_REQUIRED_FIELDS,
  statusField: "effective_status",
  statusValues: AI_CONTROL_RULE_STATUS_VALUES,
  allowedActionValues: AI_ALLOWED_ACTION_VALUES,
  forbiddenActionValues: AI_FORBIDDEN_ACTION_VALUES,
  requiredForbiddenActions: Object.freeze([
    "write_production_data",
    "approve_human_gate",
    "bypass_hermes",
    "bypass_claude_review",
    "claim_completion_without_evidence",
  ]),
  reviewRequiredWhenFields: Object.freeze([
    "sensitive_action",
    "production_data_access",
    "client_facing_output",
    "finance_action",
    "external_share",
    "missing_evidence",
    "p0_p1_finding",
  ]),
  referenceFields: Object.freeze([
    "blocked_claim_refs",
    "audit_event_ref",
  ]),
  nextSubphase: "RP00.P01.M02.S02",
});

function assertControlPlaneString(value, fieldName, entityName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${entityName}.${fieldName} must be a non-empty string`);
  }
}

function assertControlPlaneStringArray(value, fieldName, entityName, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${entityName}.${fieldName} must be a ${allowEmpty ? "" : "non-empty "}string array`);
  }
  for (const item of value) assertControlPlaneString(item, fieldName, entityName);
}

function assertControlPlaneIsoDateTime(value, fieldName, entityName) {
  assertControlPlaneString(value, fieldName, entityName);
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${entityName}.${fieldName} must be an ISO datetime string`);
  }
}

function assertKnownEnumValues(values, allowedValues, fieldName, entityName) {
  assertControlPlaneStringArray(values, fieldName, entityName);
  for (const value of values) {
    if (!allowedValues.includes(value)) {
      throw new TypeError(`${entityName}.${fieldName} contains unknown value ${value}`);
    }
  }
}

function assertReviewRequiredWhen(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("AIControlRule.review_required_when must be an object");
  }
  for (const field of AI_CONTROL_RULE_MODEL.reviewRequiredWhenFields) {
    if (value[field] !== true) {
      throw new TypeError(`AIControlRule.review_required_when.${field} must be true`);
    }
  }
}

export function normalizeAIControlRuleId(value) {
  assertControlPlaneString(value, "rule_id", "AIControlRule");
  const normalized = value.trim();
  if (!normalized.toLowerCase().startsWith(AI_CONTROL_RULE_IDENTIFIER_POLICY.stablePrefix)) {
    throw new TypeError("AIControlRule.rule_id must use the air_ stable id prefix");
  }
  if (!AI_CONTROL_RULE_ID_PATTERN.test(normalized)) {
    throw new TypeError("AIControlRule.rule_id must be canonical air_ lowercase snake-case");
  }
  return normalized;
}

export function validateAIControlRuleId(value) {
  const normalized = normalizeAIControlRuleId(value);
  if (value !== normalized) {
    throw new TypeError("AIControlRule.rule_id must be stored without leading or trailing whitespace");
  }
  return true;
}

export function normalizeAIControlRuleTenantId(value) {
  assertControlPlaneString(value, "tenant_id", "AIControlRule");
  const normalized = value.trim();
  if (!normalized.startsWith(AI_CONTROL_RULE_TENANT_SCOPE_POLICY.stablePrefix)) {
    throw new TypeError("AIControlRule.tenant_id must use the lfos_ tenant id prefix");
  }
  if (!AI_CONTROL_RULE_TENANT_ID_PATTERN.test(normalized)) {
    throw new TypeError("AIControlRule.tenant_id must be canonical lfos_ lowercase snake-case");
  }
  return normalized;
}

export function validateAIControlRuleTenantId(value) {
  const normalized = normalizeAIControlRuleTenantId(value);
  if (value !== normalized) {
    throw new TypeError("AIControlRule.tenant_id must be stored without leading or trailing whitespace");
  }
  return true;
}

function tenantIdFromContext(tenantContext) {
  if (typeof tenantContext === "string") return tenantContext;
  if (tenantContext && typeof tenantContext === "object") return tenantContext.tenant_id;
  throw new TypeError("AIControlRule tenant scope context must provide tenant_id");
}

export function assertAIControlRuleTenantScope(rule, tenantContext) {
  if (!rule || typeof rule !== "object") {
    throw new TypeError("AIControlRule tenant scope requires a rule object");
  }
  const ruleTenantId = normalizeAIControlRuleTenantId(rule.tenant_id);
  const contextTenantId = normalizeAIControlRuleTenantId(tenantIdFromContext(tenantContext));
  if (ruleTenantId !== contextTenantId) {
    throw new TypeError("AIControlRule.tenant_id must match tenant scope context");
  }
  return true;
}

export function validateAIControlRule(rule) {
  if (!rule || typeof rule !== "object") {
    throw new TypeError("AIControlRule must be an object");
  }

  validateAIControlRuleId(rule.rule_id);
  validateAIControlRuleTenantId(rule.tenant_id);
  assertControlPlaneString(rule.scope, "scope", "AIControlRule");
  if (!AI_CONTROL_RULE_STATUS_VALUES.includes(rule.effective_status)) {
    throw new TypeError("AIControlRule.effective_status must be an AIControlRule.status value");
  }
  assertKnownEnumValues(rule.allowed_actions, AI_ALLOWED_ACTION_VALUES, "allowed_actions", "AIControlRule");
  assertKnownEnumValues(rule.forbidden_actions, AI_FORBIDDEN_ACTION_VALUES, "forbidden_actions", "AIControlRule");
  for (const forbiddenAction of AI_CONTROL_RULE_MODEL.requiredForbiddenActions) {
    if (!rule.forbidden_actions.includes(forbiddenAction)) {
      throw new TypeError(`AIControlRule.forbidden_actions must include ${forbiddenAction}`);
    }
  }
  for (const allowedAction of rule.allowed_actions) {
    if (rule.forbidden_actions.includes(allowedAction)) {
      throw new TypeError(`AIControlRule action ${allowedAction} cannot be both allowed and forbidden`);
    }
  }
  assertReviewRequiredWhen(rule.review_required_when);
  assertControlPlaneStringArray(rule.blocked_claim_refs, "blocked_claim_refs", "AIControlRule", { allowEmpty: true });
  assertControlPlaneString(rule.audit_event_ref, "audit_event_ref", "AIControlRule");
  assertControlPlaneIsoDateTime(rule.created_at, "created_at", "AIControlRule");
  assertControlPlaneIsoDateTime(rule.updated_at, "updated_at", "AIControlRule");
  if (Date.parse(rule.updated_at) < Date.parse(rule.created_at)) {
    throw new TypeError("AIControlRule.updated_at must not be earlier than created_at");
  }

  return true;
}

export function createAIControlRule(input) {
  const ruleId = normalizeAIControlRuleId(input?.rule_id);
  const tenantId = normalizeAIControlRuleTenantId(input?.tenant_id);
  validateAIControlRule({ ...input, rule_id: ruleId, tenant_id: tenantId });

  return Object.freeze({
    rule_id: ruleId,
    tenant_id: tenantId,
    scope: input.scope,
    effective_status: input.effective_status,
    allowed_actions: Object.freeze([...input.allowed_actions]),
    forbidden_actions: Object.freeze([...input.forbidden_actions]),
    review_required_when: Object.freeze({ ...input.review_required_when }),
    blocked_claim_refs: Object.freeze([...input.blocked_claim_refs]),
    audit_event_ref: input.audit_event_ref,
    created_at: input.created_at,
    updated_at: input.updated_at,
  });
}
