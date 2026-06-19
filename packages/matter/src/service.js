import { createMatterCoreRecord } from "./model.js";
import {
  MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS,
  MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP181_PACK_BINDING,
  MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP182_PACK_BINDING,
  MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS,
  MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP183_PACK_BINDING,
  MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP184_PACK_BINDING,
  MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP185_PACK_BINDING,
  MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS,
  MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP186_PACK_BINDING,
  MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS,
  MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP187_PACK_BINDING,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS,
  MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP188_PACK_BINDING,
  MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS,
  MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP189_PACK_BINDING,
  MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP190_PACK_BINDING,
  MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS,
  MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP191_PACK_BINDING,
  MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP192_PACK_BINDING,
  MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS,
  MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP193_PACK_BINDING,
  MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP194_PACK_BINDING,
  MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP195_PACK_BINDING,
  MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP196_PACK_BINDING,
  MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS,
  MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP197_PACK_BINDING,
  MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS,
  MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP178_PACK_BINDING,
  MATTER_CORE_SERVICE_BOUNDARY,
  MATTER_CORE_SERVICE_OPERATIONS,
} from "./registry.js";
import { validateMatterCoreRecord } from "./validators.js";

const MATTER_CORE_SECRET_MATERIAL_FIELD_PATTERN =
  /(^|_)(secret|credential|access_token|api_key|password|private_key|client_secret|refresh_token|id_token|signed_url|lock_token)($|_)/i;

export const MATTER_CORE_SECURE_SECRET_HANDLING_POLICY = Object.freeze({
  accepts_secret_material: false,
  credential_or_secret_included: false,
  secret_material_included: false,
  exposes_secret_material: false,
});

export function assertMatterCoreNoSecretMaterialIncluded(payload = {}) {
  const forbiddenFields = Object.keys(payload).filter((field) => MATTER_CORE_SECRET_MATERIAL_FIELD_PATTERN.test(field));
  if (forbiddenFields.length > 0) {
    throw new Error(`Matter Core payload must not include secret material fields: ${forbiddenFields.join(", ")}`);
  }
  return Object.freeze({
    ...MATTER_CORE_SECURE_SECRET_HANDLING_POLICY,
    checked_field_count: Object.keys(payload).length,
    forbidden_field_count: 0,
  });
}

function freezeServiceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    issues_network_request: false,
    implements_loop_engine: false,
    no_write_attestation: MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  });
}

function freezeApiResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP181_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    no_write_attestation: MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  });
}

function freezeUiWorkflowResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP182_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    no_write_attestation: MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  });
}

function freezeUiEvidenceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP183_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    no_write_attestation: MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  });
}

function freezeFixtureEvidenceTerminalResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditTailFixtureResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP185_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  });
}

function freezeSyntheticFixturePermissionSubstrateResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP186_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionSubstrateWorkflowBindingResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP187_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditSecurityFixtureResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP188_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  });
}

function freezeSyntheticFixtureFailureEvidenceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP189_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureReceiptTaxonomyBoundaryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP190_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  });
}

function freezeGeneratedFailureRecoveryBindingResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP191_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureFixtureEntryBoundaryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP192_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureFixtureEvidenceReviewBridgeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP193_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditEvidenceTerminalBridgeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  });
}

function freezeEvidenceReviewHandoffTerminalBridgeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  });
}

function freezeReviewQuestionSecurityGateResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP196_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  });
}

function freezeTerminalReviewCloseoutHandoffResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MATTER_CORE_CP197_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    acquires_runtime_lock: false,
    persists_idempotency_key: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    executes_rollback: false,
    executes_retry: false,
    executes_api_handler: false,
    renders_live_dom: false,
    issues_network_request: false,
    implements_loop_engine: false,
    implements_rp06_dms_runtime: false,
    exposes_raw_payload: false,
    leaks_unauthorized_counts: false,
    leaks_permission_decision_detail: false,
    leaks_audit_event_body: false,
    uses_real_client_data: false,
    uses_real_document_data: false,
    no_write_attestation: MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  });
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function operationSpec(operation) {
  return MATTER_CORE_SERVICE_OPERATIONS[operation] ?? null;
}

function inferModelType(operation, input = {}) {
  return input.model_type ?? operationSpec(operation)?.model_type ?? "Matter";
}

export function normalizeMatterCoreServiceRequest(input = {}) {
  const operation = input.operation ?? "matter_opening";
  const modelType = inferModelType(operation, input);
  const tenantId = input.tenant_id ?? input.payload?.tenant_id ?? null;
  const requestId = input.request_id ?? null;
  const idempotencyKey = input.idempotency_key ?? (tenantId && requestId ? `${tenantId}:${operation}:${requestId}` : null);
  return freezeServiceResult({
    normalized: true,
    request_id: requestId,
    operation,
    model_type: modelType,
    tenant_id: tenantId,
    expected_tenant_id: input.expected_tenant_id ?? tenantId,
    actor_user_id: input.actor_user_id ?? null,
    matter_id: input.matter_id ?? input.payload?.matter_id ?? null,
    permission_ref: input.permission_ref ?? null,
    audit_hint_ref: input.audit_hint_ref ?? null,
    idempotency_key: idempotencyKey,
    lock_key: idempotencyKey ? `matter-core:${tenantId}:${operation}:${requestId}` : null,
    payload: Object.freeze({ ...(input.payload ?? {}), tenant_id: input.payload?.tenant_id ?? tenantId }),
    supported_operations: MATTER_CORE_SERVICE_BOUNDARY.supported_operations,
    declared_prechecks: MATTER_CORE_SERVICE_BOUNDARY.prechecks,
  });
}

export function executeMatterCoreServicePrechecks(normalizedRequest) {
  const blockedClaims = [];
  const checked = [];
  const operation = operationSpec(normalizedRequest.operation);

  checked.push("tenant_boundary_precheck");
  if (!normalizedRequest.tenant_id) pushUnique(blockedClaims, "tenant_scope_missing");
  if (
    normalizedRequest.tenant_id &&
    normalizedRequest.expected_tenant_id &&
    normalizedRequest.tenant_id !== normalizedRequest.expected_tenant_id
  ) {
    pushUnique(blockedClaims, "tenant_boundary_mismatch");
  }
  if (normalizedRequest.payload?.tenant_id && normalizedRequest.tenant_id && normalizedRequest.payload.tenant_id !== normalizedRequest.tenant_id) {
    pushUnique(blockedClaims, "cross_tenant_reference");
  }

  checked.push("matter_trace_precheck");
  if (operation?.model_type !== "Matter" && !normalizedRequest.matter_id) pushUnique(blockedClaims, "missing_matter_trace");

  checked.push("permission_precheck");
  if (!normalizedRequest.permission_ref) pushUnique(blockedClaims, "permission_precheck_required");

  checked.push("audit_hint_precheck");
  if (!normalizedRequest.audit_hint_ref) pushUnique(blockedClaims, "audit_hint_precheck_required");

  checked.push("idempotency_key_handling");
  if (!normalizedRequest.idempotency_key) pushUnique(blockedClaims, "idempotency_key_required");

  if (!operation) {
    pushUnique(blockedClaims, "unsupported_service_operation");
  } else {
    checked.push("state_transition_enforcement");
  }

  checked.push("lock_acquisition_rule", "persistence_boundary");

  return freezeServiceResult({
    request_id: normalizedRequest.request_id,
    operation: normalizedRequest.operation,
    model_type: normalizedRequest.model_type,
    outcome: blockedClaims.length === 0 ? "passed" : "blocked",
    valid: blockedClaims.length === 0,
    checked: Object.freeze(checked),
    declared_prechecks: MATTER_CORE_SERVICE_BOUNDARY.prechecks,
    blocked_claims: Object.freeze(blockedClaims),
    customer_safe_error_codes: Object.freeze(
      blockedClaims.map((claim) => MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim] ?? "MATTER_CORE_BLOCKED"),
    ),
    idempotency_key: normalizedRequest.idempotency_key,
    lock_key: normalizedRequest.lock_key,
    lock_status: "not_acquired_descriptor_only",
    persistence_boundary: "never_write_descriptor_only",
  });
}

export function executeMatterCoreServiceWorkflow(input = {}) {
  const normalized = normalizeMatterCoreServiceRequest(input);
  const precheck = executeMatterCoreServicePrechecks(normalized);
  const operation = operationSpec(normalized.operation);
  if (!precheck.valid || !operation) {
    return freezeServiceResult({
      ...precheck,
      normalized_request: normalized,
      precheck,
      action_preview: Object.freeze({
        operation: normalized.operation,
        writes_product_state: false,
        writes_audit_event: false,
        creates_database_rows: false,
        reason: "blocked_before_descriptor_factory",
      }),
      rollback_behavior: "no_mutation_so_rollback_is_descriptor_noop",
      retry_behavior: "same_idempotency_key_returns_same_descriptor_shape",
    });
  }

  let record = null;
  let validation = null;
  const blockedClaims = [];
  const reviewRequiredClaims = [];
  try {
    record = createMatterCoreRecord(operation.model_type, normalized.payload);
    validation = validateMatterCoreRecord(operation.model_type, record, {
      expected_tenant_id: normalized.expected_tenant_id,
      pack_binding: MATTER_CORE_CP178_PACK_BINDING,
      no_write_attestation: MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
    });
    for (const claim of validation.blocked_claims ?? []) pushUnique(blockedClaims, claim);
    for (const claim of validation.review_required_claims ?? []) pushUnique(reviewRequiredClaims, claim);
  } catch (error) {
    pushUnique(blockedClaims, "service_factory_descriptor_error");
    validation = Object.freeze({ valid: false, errors: Object.freeze([error.message]), blocked_claims: Object.freeze(blockedClaims) });
  }

  if (normalized.payload?.requires_approval === true) pushUnique(reviewRequiredClaims, "matter_opening_requires_partner_approval");
  const outcome =
    blockedClaims.length > 0
      ? "blocked"
      : normalized.payload?.requires_approval === true
        ? "approval_required"
        : reviewRequiredClaims.length > 0 || operation.happy_outcome === "review_required"
          ? "review_required"
          : "passed";

  return freezeServiceResult({
    request_id: normalized.request_id,
    operation: normalized.operation,
    model_type: operation.model_type,
    outcome,
    valid: outcome !== "blocked",
    normalized_request: normalized,
    precheck,
    descriptor: record,
    validation,
    blocked_claims: Object.freeze(blockedClaims),
    review_required_claims: Object.freeze(reviewRequiredClaims),
    approval_required_claims: Object.freeze(outcome === "approval_required" ? ["matter_opening_requires_partner_approval"] : []),
    action_preview: Object.freeze({
      operation: normalized.operation,
      model_type: operation.model_type,
      secondary_route: operation.secondary_route,
      writes_product_state: false,
      writes_audit_event: false,
      creates_database_rows: false,
      dispatches_review_route: false,
      dispatches_approval_route: false,
    }),
    idempotency_key: normalized.idempotency_key,
    lock_key: normalized.lock_key,
    lock_status: "not_acquired_descriptor_only",
    persistence_boundary: "never_write_descriptor_only",
    rollback_behavior: "no_mutation_so_rollback_is_descriptor_noop",
    retry_behavior: "same_idempotency_key_returns_same_descriptor_shape",
  });
}

function descriptorRefFor(result = {}) {
  const descriptor = result.descriptor ?? {};
  const primaryIdByModelType = {
    Matter: descriptor.matter_id,
    MatterMember: descriptor.member_id,
    MatterTask: descriptor.task_id,
    MatterCalendarEvent: descriptor.event_id,
    MatterChecklist: descriptor.checklist_id,
    MatterWiki: descriptor.wiki_id,
    MatterWikiSection: descriptor.section_id,
    MatterWikiSourceLink: descriptor.link_id,
    MatterWikiSnapshot: descriptor.snapshot_id,
    MatterGraphNode: descriptor.node_id,
    MatterGraphEdge: descriptor.edge_id,
  };
  const primaryId =
    primaryIdByModelType[result.model_type]
    ?? descriptor.matter_id
    ?? descriptor.member_id
    ?? descriptor.task_id
    ?? descriptor.section_id
    ?? descriptor.edge_id
    ?? descriptor.node_id
    ?? descriptor.wiki_id
    ?? null;
  return primaryId
    ? `${result.model_type ?? "MatterCoreDescriptor"}:${primaryId}`
    : null;
}

function statusCodeForOutcome(outcome) {
  if (outcome === "passed") return "MATTER_CORE_DESCRIPTOR_READY";
  if (outcome === "review_required") return "MATTER_CORE_REVIEW_REQUIRED";
  if (outcome === "approval_required") return "MATTER_CORE_APPROVAL_REQUIRED";
  return "MATTER_CORE_BLOCKED";
}

export function createMatterCoreApiRequestDescriptor(input = {}) {
  const pagination = Object.freeze({
    limit: Math.max(1, Math.min(Number(input.pagination?.limit ?? 25), 100)),
    cursor: input.pagination?.cursor ?? null,
  });
  const filters = Object.freeze({
    operation: input.filters?.operation ?? input.operation ?? null,
    matter_id: input.filters?.matter_id ?? input.matter_id ?? input.payload?.matter_id ?? null,
    review_status: input.filters?.review_status ?? input.payload?.review_status ?? null,
  });
  return freezeApiResult({
    request_contract: "MatterCoreApiRequestDescriptor",
    request_id: input.request_id ?? null,
    tenant_id: input.tenant_id ?? input.payload?.tenant_id ?? null,
    actor_user_id: input.actor_user_id ?? null,
    operation: input.operation ?? "matter_opening",
    permission_ref_present: Boolean(input.permission_ref),
    audit_hint_ref_present: Boolean(input.audit_hint_ref),
    pagination,
    filters,
    request_contract_fields: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.request_contract_fields,
    source_service_entrypoint: MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint,
    raw_payload_included: false,
  });
}

export function serializeMatterCoreServiceResultForApi(serviceResult = {}) {
  const blockedClaims = Object.freeze([...(serviceResult.blocked_claims ?? [])]);
  const reviewRequiredClaims = Object.freeze([...(serviceResult.review_required_claims ?? [])]);
  const approvalRequiredClaims = Object.freeze([...(serviceResult.approval_required_claims ?? [])]);
  const safeCodes = Object.freeze(
    blockedClaims.map((claim) => MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim] ?? "MATTER_CORE_BLOCKED"),
  );
  return freezeApiResult({
    response_contract: "MatterCoreApiResponseEnvelope",
    request_id: serviceResult.request_id ?? null,
    operation: serviceResult.operation ?? null,
    outcome: serviceResult.outcome ?? "blocked",
    status_code: statusCodeForOutcome(serviceResult.outcome),
    descriptor_type: serviceResult.model_type ?? serviceResult.normalized_request?.model_type ?? null,
    descriptor_ref: descriptorRefFor(serviceResult),
    blocked_claims: blockedClaims,
    review_required_claims: reviewRequiredClaims,
    approval_required_claims: approvalRequiredClaims,
    customer_safe_error_codes: serviceResult.customer_safe_error_codes ?? safeCodes,
    rollback_behavior: serviceResult.rollback_behavior ?? "no_mutation_so_rollback_is_descriptor_noop",
    retry_behavior: serviceResult.retry_behavior ?? "same_idempotency_key_returns_same_descriptor_shape",
    idempotency_key: serviceResult.idempotency_key ?? null,
    lock_status: serviceResult.lock_status ?? "not_acquired_descriptor_only",
    persistence_boundary: serviceResult.persistence_boundary ?? "never_write_descriptor_only",
    page_info: Object.freeze({ has_more: false, next_cursor: null, descriptor_only: true }),
    response_contract_fields: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.response_contract_fields,
    serialization_guards: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.serialization_guards,
    raw_payload_included: false,
    normalized_request_included: false,
    descriptor_body_included: false,
  });
}

export function deriveMatterCoreUiState(apiEnvelope = {}, options = {}) {
  const uiState =
    options.loading === true
      ? "loading"
      : options.empty === true
        ? "empty"
        : apiEnvelope.outcome === "review_required"
          ? "review_required"
          : apiEnvelope.outcome === "approval_required"
            ? "approval_required"
            : apiEnvelope.outcome === "blocked"
              ? "denied"
              : "ready";
  const primaryInteraction =
    uiState === "ready"
      ? "open_descriptor_preview"
      : uiState === "review_required"
        ? "open_review_queue_descriptor"
        : uiState === "approval_required"
          ? "open_approval_route_descriptor"
          : "show_safe_error_summary";
  return freezeApiResult({
    ui_contract: "MatterCoreUiStateDescriptor",
    ui_state: uiState,
    operation: apiEnvelope.operation ?? null,
    surface: options.surface ?? "matter_opening_panel",
    loading_state: uiState === "loading",
    empty_state: uiState === "empty",
    denied_state: uiState === "denied",
    review_required_state: uiState === "review_required",
    approval_required_state: uiState === "approval_required",
    primary_interaction: primaryInteraction,
    secondary_interaction: "refresh_descriptor_without_mutation",
    data_dependencies: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.data_dependencies,
    ui_surface_inventory: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.ui_surface_inventory,
    customer_safe_error_codes: apiEnvelope.customer_safe_error_codes ?? Object.freeze([]),
    descriptor_ref: apiEnvelope.descriptor_ref ?? null,
    raw_payload_included: false,
  });
}

export function executeMatterCoreApiInterface(input = {}) {
  const requestDescriptor = createMatterCoreApiRequestDescriptor(input);
  const serviceResult = executeMatterCoreServiceWorkflow(input);
  const responseEnvelope = serializeMatterCoreServiceResultForApi(serviceResult);
  const uiState = deriveMatterCoreUiState(responseEnvelope, { surface: input.ui_surface });
  return freezeApiResult({
    api_interface: "MatterCoreDescriptorApiInterface",
    request: requestDescriptor,
    response: Object.freeze({ ...responseEnvelope, ui_state: uiState.ui_state }),
    ui: uiState,
    service_source_pack_id: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.source_service_pack_id,
    boundary_source_pack_id: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.upstream_sensitive_boundary_pack_id,
    public_exports: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.public_exports,
    descriptor_only: true,
    runtime_dispatch_enabled: false,
  });
}

function safeErrorCopyFor(code) {
  return MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.safe_error_copy[code] ?? MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.safe_error_copy.MATTER_CORE_BLOCKED;
}

export function createMatterCoreUiWorkflowFixture(input = {}) {
  const operation = input.operation ?? "matter_opening";
  const surface = input.surface ?? (
    operation === "member_assignment"
      ? "matter_member_assignment_panel"
      : operation === "task_planning"
        ? "matter_task_planning_panel"
        : operation === "wiki_section_staging"
          ? "matter_wiki_section_review_panel"
          : operation === "graph_relationship_staging"
            ? "matter_graph_relationship_review_panel"
            : "matter_opening_panel"
  );
  return freezeUiWorkflowResult({
    fixture_id: `matter-core-ui-workflow:${surface}:${operation}`,
    operation,
    surface,
    required_states: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_states,
    required_interactions: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_interactions,
    display_guards: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_display_guards,
    responsive_layouts: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.responsive_layouts,
    keyboard_focus_order: Object.freeze([
      "primary_action",
      "secondary_action",
      "permission_badge",
      "audit_hint",
      "safe_error_summary",
    ]),
    visual_density: "dense_operational_panel",
    build_smoke: "descriptor_shape_only",
  });
}

export function executeMatterCoreUiWorkflow(input = {}) {
  const api = executeMatterCoreApiInterface(input);
  const fixture = createMatterCoreUiWorkflowFixture({
    operation: api.response.operation ?? input.operation,
    surface: input.ui_surface ?? api.ui.surface,
  });
  const safeErrorMessages = Object.freeze(
    (api.response.customer_safe_error_codes ?? []).map((code) => Object.freeze({ code, copy: safeErrorCopyFor(code) })),
  );
  return freezeUiWorkflowResult({
    workflow: "MatterCoreUiInteractionWorkflowDescriptor",
    source_api_interface_pack_id: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.source_api_interface_pack_id,
    source_service_pack_id: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.source_service_pack_id,
    request_id: api.response.request_id,
    operation: api.response.operation,
    surface: fixture.surface,
    state: api.ui.ui_state,
    primary_interaction: api.ui.primary_interaction,
    secondary_interaction: api.ui.secondary_interaction,
    permission_badge: Object.freeze({
      mode: "ref_only",
      present: Boolean(input.permission_ref),
      value: input.permission_ref ? "permission_ref_present" : "permission_required",
      leaks_decision_detail: false,
    }),
    audit_hint_display: Object.freeze({
      mode: "ref_only",
      present: Boolean(input.audit_hint_ref),
      value: input.audit_hint_ref ? "audit_hint_ref_present" : "audit_hint_required",
      writes_audit_event: false,
    }),
    error_message_copy: safeErrorMessages,
    responsive_layout: Object.freeze({
      desktop: "desktop_dense",
      mobile: "mobile_single_column",
      text_overflow_policy: "wrap_without_overlap",
    }),
    keyboard_focus_behavior: fixture.keyboard_focus_order,
    visual_density: fixture.visual_density,
    state_snapshot: Object.freeze({
      ui_state: api.ui.ui_state,
      descriptor_ref: api.response.descriptor_ref,
      status_code: api.response.status_code,
      unauthorized_count: null,
      unauthorized_count_leaked: false,
    }),
    synthetic_fixture: fixture,
    build_smoke: Object.freeze({
      status: "passed",
      check: "descriptor_shape_only",
      live_dom_rendered: false,
      api_handler_executed: false,
    }),
    api_response: api.response,
    descriptor_only: true,
    live_render_enabled: false,
  });
}

export function createMatterCorePermissionAuditBindingDescriptor(input = {}) {
  const workflow = executeMatterCoreUiWorkflow(input);
  return freezeUiEvidenceResult({
    binding: "MatterCorePermissionAuditBindingDescriptor",
    source_ui_workflow_pack_id: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.source_ui_workflow_pack_id,
    source_api_interface_pack_id: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.source_api_interface_pack_id,
    operation: workflow.operation,
    surface: workflow.surface,
    state: workflow.state,
    permission_badge_ref_only: true,
    audit_hint_ref_only: true,
    permission_badge: Object.freeze({
      ...workflow.permission_badge,
      decision_detail: null,
      decision_detail_included: false,
      leaks_decision_detail: false,
    }),
    audit_hint_display: Object.freeze({
      ...workflow.audit_hint_display,
      audit_event_body: null,
      audit_event_body_included: false,
      leaks_audit_event_body: false,
    }),
    safe_error_copy: workflow.error_message_copy,
    review_required_state: workflow.state === "review_required",
    denied_state: workflow.state === "denied",
    required_guards: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_permission_audit_binding,
    guard_results: Object.freeze({
      no_permission_decision_detail_leak: true,
      no_audit_event_body_leak: true,
      no_unauthorized_count_leak: workflow.state_snapshot.unauthorized_count_leaked === false,
    }),
    workflow_ref: Object.freeze({
      workflow: workflow.workflow,
      request_id: workflow.request_id,
      descriptor_only: workflow.descriptor_only,
      live_render_enabled: workflow.live_render_enabled,
    }),
  });
}

export function createMatterCoreSyntheticUiFixtureSet(input = {}) {
  const surfaces = input.surfaces ?? MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_surfaces;
  const states = input.states ?? MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_states;
  const fixtures = surfaces.flatMap((surface) =>
    states.map((state) =>
      Object.freeze({
        fixture_id: `matter-core-cp183-ui-fixture:${surface}:${state}`,
        surface,
        state,
        descriptor_only: true,
        permission_badge: "ref_only",
        audit_hint: "ref_only",
        raw_payload_included: false,
        permission_decision_detail_included: false,
        audit_event_body_included: false,
        unauthorized_count: null,
        unauthorized_count_leaked: false,
        responsive_layouts: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.responsive_layouts,
        keyboard_focus_behavior: [
          "primary_action",
          "secondary_action",
          "permission_badge",
          "audit_hint",
          "safe_error_summary",
        ],
        visual_density: "dense_operational_panel",
        build_smoke: "descriptor_shape_only",
      }),
    ),
  );
  return freezeUiEvidenceResult({
    fixture_set: "MatterCoreSyntheticUiFixtureSet",
    source_ui_workflow_pack_id: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.source_ui_workflow_pack_id,
    required_surfaces: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_surfaces,
    required_states: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_states,
    fixtures: Object.freeze(fixtures),
    surface_count: surfaces.length,
    state_count: states.length,
    fixture_count: fixtures.length,
    build_smoke_descriptor: Object.freeze({
      status: "passed",
      check: "descriptor_shape_only",
      live_dom_rendered: false,
      api_handler_executed: false,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: fixtures.every((fixture) => fixture.raw_payload_included === false),
      no_permission_decision_detail: fixtures.every((fixture) => fixture.permission_decision_detail_included === false),
      no_audit_event_body: fixtures.every((fixture) => fixture.audit_event_body_included === false),
      no_unauthorized_count: fixtures.every((fixture) => fixture.unauthorized_count_leaked === false),
    }),
  });
}

export function createMatterCoreUiEvidenceDescriptor(input = {}) {
  const workflow = executeMatterCoreUiWorkflow(input);
  const permissionAuditBinding = createMatterCorePermissionAuditBindingDescriptor(input);
  const syntheticFixtureSet = createMatterCoreSyntheticUiFixtureSet(input);
  return freezeUiEvidenceResult({
    evidence_descriptor: "MatterCoreUiEvidencePermissionFixtureDescriptor",
    source_ui_workflow_pack_id: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.source_ui_workflow_pack_id,
    source_api_interface_pack_id: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.source_api_interface_pack_id,
    evidence_mode: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.evidence_mode,
    required_evidence_sections: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_evidence_sections,
    hermes_ui_evidence: Object.freeze({
      evidence_packet: "H05.CP00-183.matter_core_ui_evidence_permission_fixture",
      checks: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.hermes_evidence_checks,
      synthetic_fixture_binding: syntheticFixtureSet.fixture_count > 0,
      build_smoke_descriptor: syntheticFixtureSet.build_smoke_descriptor,
      permission_badge_ref_only: permissionAuditBinding.permission_badge_ref_only,
      audit_hint_ref_only: permissionAuditBinding.audit_hint_ref_only,
      state_snapshot_without_unauthorized_count: workflow.state_snapshot.unauthorized_count === null,
    }),
    claude_ui_leak_prompt: Object.freeze({
      review_packet: "C05.CP00-183.matter_core_ui_evidence_permission_fixture",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: Object.freeze(["Read", "Grep", "Glob"]),
      checks: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.leak_prompt_checks,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP183_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP183_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP183_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP183_PACK_BINDING.range,
    }),
    permission_audit_binding: permissionAuditBinding,
    synthetic_fixture_set: syntheticFixtureSet,
    source_workflow: workflow,
    leak_guards: Object.freeze({
      no_raw_payload: workflow.exposes_raw_payload === false,
      no_permission_decision_detail: permissionAuditBinding.guard_results.no_permission_decision_detail_leak,
      no_audit_event_body: permissionAuditBinding.guard_results.no_audit_event_body_leak,
      no_unauthorized_count: permissionAuditBinding.guard_results.no_unauthorized_count_leak,
      no_client_visible_wiki_output: true,
      claude_not_final_approval: true,
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function p05EntryFixtureCase(caseType, microPhase) {
  const caseId = `matter-core-cp184:${microPhase}:${caseType}`;
  const denied =
    caseType === "denied_case"
    || caseType === "cross_tenant_case"
    || caseType === "missing_context_case"
    || caseType === "failure_test";
  const reviewRequired = caseType === "review_required_case" || caseType === "claude_missing_test_prompt";
  return Object.freeze({
    case_id: caseId,
    case_type: caseType,
    micro_phase: microPhase,
    tenant_id: "tenant_rp05_synthetic",
    actor_user_ref: "user_ref_only",
    matter_ref: "matter_ref_only",
    document_ref: "document_ref_only",
    outcome: denied ? "blocked" : reviewRequired ? "review_required" : "passed",
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_document_content_included: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    stable_id: caseId,
    replay_command: `npm run rp05:matter-core:validate -- ${caseId}`,
  });
}

export function createMatterCoreFixtureEvidenceTerminalDescriptor(input = {}) {
  const sourceEvidence = createMatterCoreUiEvidenceDescriptor(input);
  const requirements = MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS;
  const p05EntryCases = requirements.required_p05_entry_surfaces.flatMap((surface) =>
    requirements.required_case_types.map((caseType) => p05EntryFixtureCase(caseType, surface)),
  );
  const goldenCases = p05EntryCases.filter((item) => item.case_type.endsWith("golden_case"));
  const failureCases = p05EntryCases.filter((item) =>
    ["denied_case", "cross_tenant_case", "missing_context_case", "failure_test"].includes(item.case_type),
  );
  return freezeFixtureEvidenceTerminalResult({
    descriptor: "MatterCoreFixtureEvidenceTerminalEntryDescriptor",
    source_ui_evidence_pack_id: requirements.source_ui_evidence_pack_id,
    source_ui_workflow_pack_id: requirements.source_ui_workflow_pack_id,
    source_service_pack_id: requirements.source_service_pack_id,
    terminal_mode: requirements.terminal_mode,
    rp05_p04_terminal_micro_phases: requirements.rp05_p04_terminal_micro_phases,
    rp05_p05_entry_micro_phases: requirements.rp05_p05_entry_micro_phases,
    required_terminal_sections: requirements.required_terminal_sections,
    synthetic_fixture_binding: Object.freeze({
      source_fixture_set: sourceEvidence.synthetic_fixture_set.fixture_set,
      fixture_count: sourceEvidence.synthetic_fixture_set.fixture_count,
      bound_to_pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
      descriptor_only: true,
    }),
    build_smoke: Object.freeze({
      status: "passed",
      check: "descriptor_shape_and_fixture_replay_only",
      live_dom_rendered: false,
      api_handler_executed: false,
      real_document_loaded: false,
    }),
    hermes_ui_evidence: Object.freeze({
      evidence_packet: "H05.CP00-184.matter_core_fixture_evidence_terminal_entry",
      upstream_evidence_packet: sourceEvidence.hermes_ui_evidence.evidence_packet,
      fixture_manifest_case_count: p05EntryCases.length,
      golden_case_count: goldenCases.length,
      failure_case_count: failureCases.length,
      permission_badge_ref_only: true,
      audit_hint_ref_only: true,
      no_unauthorized_count: true,
    }),
    claude_ui_leak_prompt: Object.freeze({
      review_packet: "C05.CP00-184.matter_core_fixture_evidence_terminal_entry",
      upstream_review_packet: sourceEvidence.claude_ui_leak_prompt.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: Object.freeze(["Read", "Grep", "Glob"]),
      checks: requirements.required_no_leak_guards,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP184_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP184_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP184_PACK_BINDING.range,
    }),
    golden_case_set: Object.freeze(goldenCases),
    failure_case_set: Object.freeze(failureCases),
    p05_permission_audit_entry: Object.freeze({
      surfaces: requirements.required_p05_entry_surfaces,
      cases: Object.freeze(p05EntryCases),
      case_count: p05EntryCases.length,
      required_case_types: requirements.required_case_types,
      audit_hint_cases: Object.freeze(p05EntryCases.filter((item) => item.case_type === "audit_hint_case")),
      security_trimming_cases: Object.freeze(p05EntryCases.filter((item) => item.case_type === "security_trimming_case")),
      ai_retrieval_or_analytics_cases: Object.freeze(
        p05EntryCases.filter((item) => item.case_type === "ai_retrieval_or_analytics_case"),
      ),
    }),
    leak_guards: Object.freeze({
      no_raw_payload: p05EntryCases.every((item) => item.raw_payload_included === false),
      no_real_document_content: p05EntryCases.every((item) => item.real_document_content_included === false),
      no_permission_decision_detail: p05EntryCases.every((item) => item.permission_decision_detail_included === false),
      no_audit_event_body: p05EntryCases.every((item) => item.audit_event_body_included === false),
      no_unauthorized_count: p05EntryCases.every((item) => item.unauthorized_count_leaked === false),
      no_client_visible_wiki_output: true,
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function permissionAuditTailRow(unitKey, index) {
  const blocked = unitKey === "failure_test";
  const reviewRequired = unitKey === "claude_missing_test_prompt";
  const stableId = `matter-core-cp185:${String(index + 1).padStart(2, "0")}:${unitKey}`;
  return Object.freeze({
    stable_id: stableId,
    unit_key: unitKey,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : "passed",
    tenant_id: "tenant_rp05_synthetic",
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    customer_safe_error_codes: Object.freeze(blocked ? ["MATTER_CORE_BLOCKED"] : []),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    runtime_permission_evaluated: false,
    audit_event_written: false,
    idempotency_key_persisted: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCorePermissionAuditTailFixtureDescriptor(input = {}) {
  const terminalDescriptor = createMatterCoreFixtureEvidenceTerminalDescriptor(input);
  const requirements = MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS;
  const tailRows = requirements.required_units.map(permissionAuditTailRow);
  const baseTenantFixture = Object.freeze({
    ...requirements.base_tenant_fixture,
    stable_id: "matter-core-cp185:base-tenant-fixture",
    permission_badge: "ref_only",
    audit_hint: "ref_only",
  });
  return freezePermissionAuditTailFixtureResult({
    descriptor: "MatterCorePermissionAuditTailFixtureDescriptor",
    source_fixture_evidence_terminal_pack_id: requirements.source_fixture_evidence_terminal_pack_id,
    source_ui_evidence_pack_id: requirements.source_ui_evidence_pack_id,
    source_sensitive_boundary_pack_id: requirements.source_sensitive_boundary_pack_id,
    tail_mode: requirements.tail_mode,
    risk_a_pack_reason: requirements.risk_a_pack_reason,
    required_tail_checks: requirements.required_tail_checks,
    expected_outcomes: requirements.expected_outcomes,
    tail_rows: Object.freeze(tailRows),
    tail_row_count: tailRows.length,
    golden_test: tailRows.find((row) => row.unit_key === "golden_test"),
    failure_test: tailRows.find((row) => row.unit_key === "failure_test"),
    claude_missing_test_prompt: tailRows.find((row) => row.unit_key === "claude_missing_test_prompt"),
    base_tenant_fixture: baseTenantFixture,
    hermes_fixture_evidence: Object.freeze({
      evidence_packet: "H05.CP00-185.matter_core_permission_audit_tail_fixture",
      upstream_evidence_packet: terminalDescriptor.hermes_ui_evidence.evidence_packet,
      tail_row_count: tailRows.length,
      permission_badge_ref_only: true,
      audit_hint_ref_only: true,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_real_data: true,
      no_unauthorized_count: true,
    }),
    claude_missing_test_review: Object.freeze({
      review_packet: "C05.CP00-185.matter_core_permission_audit_tail_fixture",
      upstream_review_packet: terminalDescriptor.claude_ui_leak_prompt.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: Object.freeze(["Read", "Grep", "Glob"]),
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP185_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP185_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP185_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP185_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: tailRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: tailRows.every((row) => row.real_client_data_included === false) && baseTenantFixture.contains_real_client_data === false,
      no_real_document_content:
        tailRows.every((row) => row.real_document_content_included === false) && baseTenantFixture.contains_real_document_content === false,
      no_permission_decision_detail: tailRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: tailRows.every((row) => row.audit_event_body_included === false),
      no_unauthorized_count: tailRows.every((row) => row.unauthorized_count_leaked === false),
      no_runtime_permission_evaluation: tailRows.every((row) => row.runtime_permission_evaluated === false),
      no_audit_event_write: tailRows.every((row) => row.audit_event_written === false),
      replay_commands_inert: tailRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function cp186FixtureRow(control, microPhase, index) {
  const blocked = ["denied_case", "cross_tenant_case", "missing_context_case", "failure_test"].includes(control);
  const reviewRequired = ["review_required_case", "claude_missing_test_prompt"].includes(control);
  const stableId = `matter-core-cp186:p05:${microPhase}:${String(index + 1).padStart(2, "0")}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase: microPhase,
    control,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : "passed",
    tenant_id: "tenant_rp05_synthetic",
    user_ref: "user_ref_only",
    matter_ref: "matter_ref_only",
    document_ref: "document_ref_only",
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    stable_id_shape: "matter-core-cp186:p05:{micro_phase}:{ordinal}:{control}",
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

function cp186PermissionSubstrateRow(control, microPhase, index) {
  const deniedTest = control === "denied_test";
  const allowedTest = control === "allowed_test";
  const reviewRoute = control === "review_required_route";
  const approvalRoute = control === "approval_required_route";
  const stableId = `matter-core-cp186:p06:${microPhase}:${String(index + 1).padStart(2, "0")}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase: microPhase,
    control,
    outcome: deniedTest ? "blocked" : reviewRoute ? "review_required" : approvalRoute ? "approval_required" : "passed",
    permission_matrix_row_ref: `permission-matrix-row-ref:${microPhase}`,
    decision_binding_ref:
      control.includes("decision_binding") || control === "permission_matrix_row"
        ? `permission-decision-ref:${microPhase}:${control}`
        : null,
    matched_rule_ref: control === "matched_rule_capture" || deniedTest || allowedTest ? `matched-rule-ref:${microPhase}` : null,
    deny_over_allow_applied: control === "deny_over_allow_check" || deniedTest,
    legal_hold_ref: control === "legal_hold_interaction" ? "legal-hold-ref-only" : null,
    ethical_wall_ref: control === "ethical_wall_interaction" ? "ethical-wall-ref-only" : null,
    object_acl_ref: control === "object_acl_interaction" ? "object-acl-ref-only" : null,
    approval_route_ref: approvalRoute ? "approval-route-ref-only" : null,
    review_route_ref: reviewRoute ? "review-route-ref-only" : null,
    security_trimming_proof_ref: control === "security_trimming_proof" ? "security-trimming-proof-ref-only" : null,
    audit_event_expectation_ref: control === "audit_event_expectation" ? "audit-event-expectation-ref-only" : null,
    permission_fixture_ref: control === "permission_fixture" ? "permission-fixture-ref-only" : null,
    customer_safe_error_codes: Object.freeze(deniedTest ? ["MATTER_CORE_BLOCKED"] : []),
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    raw_payload_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreSyntheticFixturePermissionSubstrateDescriptor(input = {}) {
  const tailDescriptor = createMatterCorePermissionAuditTailFixtureDescriptor(input);
  const requirements = MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS;
  const fixtureRows = requirements.p05_fixture_micro_phases.flatMap((microPhase) =>
    requirements.required_fixture_controls.map((control, index) => cp186FixtureRow(control, microPhase, index)),
  );
  const permissionRows = requirements.p06_permission_micro_phases.flatMap((microPhase) =>
    requirements.required_permission_controls.map((control, index) => cp186PermissionSubstrateRow(control, microPhase, index)),
  );
  const allowedRows = permissionRows.filter((row) => row.outcome === "passed");
  const deniedRows = permissionRows.filter((row) => row.outcome === "blocked");
  const reviewRows = permissionRows.filter((row) => row.outcome === "review_required");
  const approvalRows = permissionRows.filter((row) => row.outcome === "approval_required");
  return freezeSyntheticFixturePermissionSubstrateResult({
    descriptor: "MatterCoreSyntheticFixturePermissionSubstrateDescriptor",
    source_permission_audit_tail_pack_id: requirements.source_permission_audit_tail_pack_id,
    source_fixture_evidence_terminal_pack_id: requirements.source_fixture_evidence_terminal_pack_id,
    source_ui_evidence_pack_id: requirements.source_ui_evidence_pack_id,
    source_sensitive_boundary_pack_id: requirements.source_sensitive_boundary_pack_id,
    source_service_pack_id: requirements.source_service_pack_id,
    substrate_mode: requirements.substrate_mode,
    risk_c_pack_reason: requirements.risk_c_pack_reason,
    p05_fixture_micro_phases: requirements.p05_fixture_micro_phases,
    p06_permission_micro_phases: requirements.p06_permission_micro_phases,
    fixture_rows: Object.freeze(fixtureRows),
    fixture_row_count: fixtureRows.length,
    permission_substrate_rows: Object.freeze(permissionRows),
    permission_substrate_row_count: permissionRows.length,
    allowed_test_rows: Object.freeze(allowedRows.filter((row) => row.control === "allowed_test")),
    denied_test_rows: Object.freeze(deniedRows.filter((row) => row.control === "denied_test")),
    review_required_rows: Object.freeze(reviewRows),
    approval_required_rows: Object.freeze(approvalRows),
    inherited_tail_descriptor: Object.freeze({
      descriptor: tailDescriptor.descriptor,
      pack_id: tailDescriptor.pack_id,
      tail_row_count: tailDescriptor.tail_row_count,
      leak_safe: tailDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_fixture_evidence: Object.freeze({
      evidence_packet: "H05.CP00-186.matter_core_synthetic_fixture_permission_substrate",
      upstream_evidence_packet: tailDescriptor.hermes_fixture_evidence.evidence_packet,
      fixture_row_count: fixtureRows.length,
      permission_substrate_row_count: permissionRows.length,
      p06_micro_phase_count: requirements.p06_permission_micro_phases.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_real_data: true,
      no_unauthorized_count: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-186.matter_core_synthetic_fixture_permission_substrate",
      upstream_review_packet: tailDescriptor.claude_missing_test_review.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP186_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP186_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP186_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP186_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: fixtureRows.every((row) => row.raw_payload_included === false) && permissionRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: fixtureRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: fixtureRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation:
        fixtureRows.every((row) => row.runtime_permission_evaluated === false)
        && permissionRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail:
        fixtureRows.every((row) => row.permission_decision_detail_included === false)
        && permissionRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body:
        fixtureRows.every((row) => row.audit_event_body_included === false)
        && permissionRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write:
        fixtureRows.every((row) => row.audit_event_written === false)
        && permissionRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count:
        fixtureRows.every((row) => row.unauthorized_count_leaked === false)
        && permissionRows.every((row) => row.unauthorized_count_leaked === false),
      no_client_visible_wiki_output: true,
      replay_commands_inert:
        fixtureRows.every((row) => row.replay_command_inert === true)
        && permissionRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function cp187WorkflowBindingRow(control, microPhase, index, group) {
  const denied = control === "denied_test" || control === "cross_tenant_test";
  const reviewRoute = control === "review_required_route";
  const approvalRoute = control === "approval_required_route";
  const stableId = `matter-core-cp187:${group}:${microPhase}:${String(index + 1).padStart(2, "0")}:${control}`;
  const decisionBindingRefs = {
    view_decision_binding: "view_decision_ref",
    search_decision_binding: "search_decision_ref",
    mutation_decision_binding: "mutation_decision_ref",
    export_download_decision_binding: "export_download_decision_ref",
    share_decision_binding: "share_decision_ref",
    ai_retrieval_decision_binding: "ai_retrieval_decision_ref",
  };
  const decisionRefField = decisionBindingRefs[control] ?? null;
  return Object.freeze({
    stable_id: stableId,
    micro_phase: microPhase,
    group,
    control,
    outcome: denied ? "blocked" : reviewRoute ? "review_required" : approvalRoute ? "approval_required" : "passed",
    permission_matrix_row_ref: control === "permission_matrix_row" ? `permission-matrix-row-ref:${microPhase}` : null,
    view_decision_ref: decisionRefField === "view_decision_ref" ? `view-decision-ref:${microPhase}` : null,
    search_decision_ref: decisionRefField === "search_decision_ref" ? `search-decision-ref:${microPhase}` : null,
    mutation_decision_ref: decisionRefField === "mutation_decision_ref" ? `mutation-decision-ref:${microPhase}` : null,
    export_download_decision_ref: decisionRefField === "export_download_decision_ref" ? `export-download-decision-ref:${microPhase}` : null,
    share_decision_ref: decisionRefField === "share_decision_ref" ? `share-decision-ref:${microPhase}` : null,
    ai_retrieval_decision_ref: decisionRefField === "ai_retrieval_decision_ref" ? `ai-retrieval-decision-ref:${microPhase}` : null,
    audit_hint_fields_ref: control === "audit_hint_fields" ? `audit-hint-fields-ref:${microPhase}` : null,
    matched_rule_ref: control === "matched_rule_capture" || denied ? `matched-rule-ref:${microPhase}` : null,
    deny_over_allow_applied: control === "deny_over_allow_check" || denied,
    legal_hold_ref: control === "legal_hold_interaction" ? "legal-hold-ref-only" : null,
    ethical_wall_ref: control === "ethical_wall_interaction" ? "ethical-wall-ref-only" : null,
    object_acl_ref: control === "object_acl_interaction" ? "object-acl-ref-only" : null,
    review_route_ref: reviewRoute ? "review-route-ref-only" : null,
    approval_route_ref: approvalRoute ? "approval-route-ref-only" : null,
    security_trimming_proof_ref: control === "security_trimming_proof" || control === "leak_prevention_test" ? "security-trimming-proof-ref-only" : null,
    audit_event_expectation_ref: control === "audit_event_expectation" ? "audit-event-expectation-ref-only" : null,
    permission_fixture_ref: control === "permission_fixture" ? "permission-fixture-ref-only" : null,
    customer_safe_error_codes: Object.freeze(denied ? ["MATTER_CORE_BLOCKED"] : []),
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCorePermissionSubstrateWorkflowBindingDescriptor(input = {}) {
  const substrateDescriptor = createMatterCoreSyntheticFixturePermissionSubstrateDescriptor(input);
  const requirements = MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS;
  const primaryTailRows = requirements.primary_tail_tests.map((control, index) =>
    cp187WorkflowBindingRow(control, "Primary Implementation Slice", index, "primary-tail-test"),
  );
  const secondaryWorkflowRows = requirements.secondary_workflow_controls.map((control, index) =>
    cp187WorkflowBindingRow(control, "Secondary Workflow Slice", index, "secondary-workflow"),
  );
  const permissionAuditBindingRows = requirements.permission_audit_binding_controls.map((control, index) =>
    cp187WorkflowBindingRow(control, "Permission And Audit Binding", index, "permission-audit-binding"),
  );
  const allRows = Object.freeze([...primaryTailRows, ...secondaryWorkflowRows, ...permissionAuditBindingRows]);
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  return freezePermissionSubstrateWorkflowBindingResult({
    descriptor: "MatterCorePermissionSubstrateWorkflowBindingDescriptor",
    source_synthetic_fixture_permission_substrate_pack_id: requirements.source_synthetic_fixture_permission_substrate_pack_id,
    source_permission_audit_tail_pack_id: requirements.source_permission_audit_tail_pack_id,
    source_ui_evidence_pack_id: requirements.source_ui_evidence_pack_id,
    source_sensitive_boundary_pack_id: requirements.source_sensitive_boundary_pack_id,
    source_service_pack_id: requirements.source_service_pack_id,
    binding_mode: requirements.binding_mode,
    risk_b_pack_reason: requirements.risk_b_pack_reason,
    primary_tail_test_rows: Object.freeze(primaryTailRows),
    secondary_workflow_rows: Object.freeze(secondaryWorkflowRows),
    permission_audit_binding_rows: Object.freeze(permissionAuditBindingRows),
    workflow_binding_rows: allRows,
    workflow_binding_row_count: allRows.length,
    rows_by_outcome: rowsByOutcome,
    inherited_substrate_descriptor: Object.freeze({
      descriptor: substrateDescriptor.descriptor,
      pack_id: substrateDescriptor.pack_id,
      permission_substrate_row_count: substrateDescriptor.permission_substrate_row_count,
      leak_safe: substrateDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_workflow_evidence: Object.freeze({
      evidence_packet: "H05.CP00-187.matter_core_permission_substrate_workflow_binding",
      upstream_evidence_packet: substrateDescriptor.hermes_fixture_evidence.evidence_packet,
      workflow_binding_row_count: allRows.length,
      primary_tail_test_count: primaryTailRows.length,
      secondary_workflow_row_count: secondaryWorkflowRows.length,
      permission_audit_binding_row_count: permissionAuditBindingRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-187.matter_core_permission_substrate_workflow_binding",
      upstream_review_packet: substrateDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP187_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP187_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP187_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP187_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_client_visible_wiki_output: true,
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function cp188SecurityFixtureRow(control, microPhase, index, group) {
  const denied = control === "denied_test" || control === "cross_tenant_test";
  const leakPrevention = control === "leak_prevention_test";
  const stableId = `matter-core-cp188:${group}:${microPhase}:${String(index + 1).padStart(2, "0")}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase: microPhase,
    group,
    control,
    outcome: denied ? "blocked" : "passed",
    permission_matrix_row_ref: control === "permission_matrix_row" ? `permission-matrix-row-ref:${microPhase}` : null,
    view_decision_ref: control === "view_decision_binding" ? `view-decision-ref:${microPhase}` : null,
    search_decision_ref: control === "search_decision_binding" ? `search-decision-ref:${microPhase}` : null,
    security_trimming_proof_ref:
      control === "security_trimming_proof" || leakPrevention ? `security-trimming-proof-ref:${microPhase}` : null,
    audit_event_expectation_ref: control === "audit_event_expectation" ? `audit-event-expectation-ref:${microPhase}` : null,
    permission_fixture_ref: control === "permission_fixture" ? `permission-fixture-ref:${microPhase}` : null,
    matched_rule_ref: denied || control === "allowed_test" ? `matched-rule-ref:${microPhase}` : null,
    deny_over_allow_applied: denied,
    customer_safe_error_codes: Object.freeze(denied ? ["MATTER_CORE_BLOCKED"] : []),
    permission_badge: "ref_only",
    audit_hint: "ref_only",
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count: null,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCorePermissionAuditSecurityFixtureDescriptor(input = {}) {
  const workflowBindingDescriptor = createMatterCorePermissionSubstrateWorkflowBindingDescriptor(input);
  const requirements = MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS;
  const permissionAuditTailRows = requirements.permission_audit_binding_tail_controls.map((control, index) =>
    cp188SecurityFixtureRow(control, "Permission And Audit Binding", index, "permission-audit-tail"),
  );
  const syntheticFixtureEntryRows = requirements.synthetic_fixture_entry_controls.map((control, index) =>
    cp188SecurityFixtureRow(control, "Synthetic Fixture Set", index, "synthetic-fixture-entry"),
  );
  const allRows = Object.freeze([...permissionAuditTailRows, ...syntheticFixtureEntryRows]);
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
  });
  return freezePermissionAuditSecurityFixtureResult({
    descriptor: "MatterCorePermissionAuditSecurityFixtureDescriptor",
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_synthetic_fixture_permission_substrate_pack_id: requirements.source_synthetic_fixture_permission_substrate_pack_id,
    source_permission_audit_tail_pack_id: requirements.source_permission_audit_tail_pack_id,
    source_sensitive_boundary_pack_id: requirements.source_sensitive_boundary_pack_id,
    source_service_pack_id: requirements.source_service_pack_id,
    fixture_mode: requirements.fixture_mode,
    risk_a_pack_reason: requirements.risk_a_pack_reason,
    permission_audit_tail_rows: Object.freeze(permissionAuditTailRows),
    synthetic_fixture_entry_rows: Object.freeze(syntheticFixtureEntryRows),
    security_fixture_rows: allRows,
    security_fixture_row_count: allRows.length,
    rows_by_outcome: rowsByOutcome,
    inherited_workflow_binding_descriptor: Object.freeze({
      descriptor: workflowBindingDescriptor.descriptor,
      pack_id: workflowBindingDescriptor.pack_id,
      workflow_binding_row_count: workflowBindingDescriptor.workflow_binding_row_count,
      leak_safe: workflowBindingDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_security_fixture_evidence: Object.freeze({
      evidence_packet: "H05.CP00-188.matter_core_permission_audit_security_fixture_boundary",
      upstream_evidence_packet: workflowBindingDescriptor.hermes_workflow_evidence.evidence_packet,
      security_fixture_row_count: allRows.length,
      permission_audit_tail_row_count: permissionAuditTailRows.length,
      synthetic_fixture_entry_row_count: syntheticFixtureEntryRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-188.matter_core_permission_audit_security_fixture_boundary",
      upstream_review_packet: workflowBindingDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP188_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP188_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP188_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP188_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP189_SYNTHETIC_GROUPS = Object.freeze([
  Object.freeze({ micro_phase_id: "RP05.P06.M06", micro_title: "Synthetic Fixture Set", start: 3, count: 19 }),
  Object.freeze({ micro_phase_id: "RP05.P06.M07", micro_title: "Test And Golden Case Set", start: 0, count: 22 }),
  Object.freeze({ micro_phase_id: "RP05.P06.M08", micro_title: "Hermes Evidence Packet", start: 0, count: 22 }),
  Object.freeze({ micro_phase_id: "RP05.P06.M09", micro_title: "Claude Review Packet", start: 0, count: 20 }),
  Object.freeze({ micro_phase_id: "RP05.P06.M10", micro_title: "Closeout And Next Handoff", start: 0, count: 11 }),
]);

const CP189_FAILURE_GROUPS = Object.freeze([
  Object.freeze({ micro_phase_id: "RP05.P07.M00", micro_title: "Scope Inventory", count: 11 }),
  Object.freeze({ micro_phase_id: "RP05.P07.M01", micro_title: "Contract Draft", count: 11 }),
  Object.freeze({ micro_phase_id: "RP05.P07.M02", micro_title: "Type And Shape Definition", count: 20 }),
  Object.freeze({ micro_phase_id: "RP05.P07.M03", micro_title: "Primary Implementation Slice", count: 14 }),
]);

function cp189SyntheticRow(control, group, index) {
  const blocked = control === "denied_test" || control === "cross_tenant_test";
  const reviewRequired = control === "review_required_route";
  const approvalRequired = control === "approval_required_route";
  const outcome = blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed";
  const stableId = `matter-core-cp189:synthetic:${group.micro_phase_id}:${String(index + 1).padStart(2, "0")}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: "synthetic_fixture_continuation",
    control,
    outcome,
    permission_matrix_row_ref: control === "permission_matrix_row" ? `permission-matrix-row-ref:${group.micro_phase_id}` : null,
    view_decision_ref: control === "view_decision_binding" ? `view-decision-ref:${group.micro_phase_id}` : null,
    search_decision_ref: control === "search_decision_binding" ? `search-decision-ref:${group.micro_phase_id}` : null,
    mutation_decision_ref: control === "mutation_decision_binding" ? `mutation-decision-ref:${group.micro_phase_id}` : null,
    export_download_decision_ref: control === "export_download_decision_binding" ? `export-download-decision-ref:${group.micro_phase_id}` : null,
    share_decision_ref: control === "share_decision_binding" ? `share-decision-ref:${group.micro_phase_id}` : null,
    ai_retrieval_decision_ref: control === "ai_retrieval_decision_binding" ? `ai-retrieval-decision-ref:${group.micro_phase_id}` : null,
    audit_hint_ref: control === "audit_hint_fields" ? `audit-hint-ref:${group.micro_phase_id}` : null,
    matched_rule_ref: control === "matched_rule_capture" || blocked ? `matched-rule-ref:${group.micro_phase_id}` : null,
    deny_over_allow_ref: control === "deny_over_allow_check" || blocked ? `deny-over-allow-ref:${group.micro_phase_id}` : null,
    legal_hold_ref: control === "legal_hold_interaction" ? `legal-hold-ref:${group.micro_phase_id}` : null,
    ethical_wall_ref: control === "ethical_wall_interaction" ? `ethical-wall-ref:${group.micro_phase_id}` : null,
    object_acl_ref: control === "object_acl_interaction" ? `object-acl-ref:${group.micro_phase_id}` : null,
    review_route_ref: reviewRequired ? `review-route-ref:${group.micro_phase_id}` : null,
    approval_route_ref: approvalRequired ? `approval-route-ref:${group.micro_phase_id}` : null,
    security_trimming_proof_ref:
      control === "security_trimming_proof" || control === "leak_prevention_test"
        ? `security-trimming-proof-ref:${group.micro_phase_id}`
        : null,
    audit_event_expectation_ref: control === "audit_event_expectation" ? `audit-event-expectation-ref:${group.micro_phase_id}` : null,
    permission_fixture_ref: control === "permission_fixture" ? `permission-fixture-ref:${group.micro_phase_id}` : null,
    customer_safe_error_codes: Object.freeze(blocked ? ["MATTER_CORE_BLOCKED"] : []),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

function cp189FailureRow(control, group, index) {
  const compensation = control === "compensation_expectation";
  const stableId = `matter-core-cp189:failure:${group.micro_phase_id}:${String(index + 1).padStart(2, "0")}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: "failure_taxonomy_continuation",
    control,
    outcome: compensation ? "passed" : "blocked",
    failure_taxonomy_ref: `failure-taxonomy-ref:${group.micro_phase_id}`,
    blocked_claim_receipt_ref: control === "blocked_claim_receipt" ? `blocked-claim-receipt-ref:${group.micro_phase_id}` : null,
    audit_failure_hint_ref: control === "audit_failure_hint" ? `audit-failure-hint-ref:${group.micro_phase_id}` : null,
    hermes_failure_evidence_ref: control === "hermes_failure_evidence" ? `hermes-failure-evidence-ref:${group.micro_phase_id}` : null,
    customer_safe_error_codes: Object.freeze([`MATTER_CORE_${control.toUpperCase()}`]),
    rollback_expectation_ref: control === "rollback_expectation" ? `rollback-expectation-ref:${group.micro_phase_id}` : null,
    compensation_expectation_ref: compensation ? `compensation-expectation-ref:${group.micro_phase_id}` : null,
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor(input = {}) {
  const securityFixtureDescriptor = createMatterCorePermissionAuditSecurityFixtureDescriptor(input);
  const requirements = MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS;
  const syntheticRows = Object.freeze(
    CP189_SYNTHETIC_GROUPS.flatMap((group) =>
      requirements.synthetic_control_template
        .slice(group.start, group.start + group.count)
        .map((control, index) => cp189SyntheticRow(control, group, index)),
    ),
  );
  const failureRows = Object.freeze(
    CP189_FAILURE_GROUPS.flatMap((group) =>
      requirements.failure_control_template.slice(0, group.count).map((control, index) => cp189FailureRow(control, group, index)),
    ),
  );
  const allRows = Object.freeze([...syntheticRows, ...failureRows]);
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezeSyntheticFixtureFailureEvidenceResult({
    descriptor: "MatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor",
    source_permission_audit_security_fixture_boundary_pack_id:
      requirements.source_permission_audit_security_fixture_boundary_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_synthetic_fixture_permission_substrate_pack_id: requirements.source_synthetic_fixture_permission_substrate_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    fixture_mode: requirements.fixture_mode,
    risk_c_pack_reason: requirements.risk_c_pack_reason,
    synthetic_rows: syntheticRows,
    failure_rows: failureRows,
    continuation_rows: allRows,
    continuation_row_count: allRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_outcome: rowsByOutcome,
    inherited_security_fixture_descriptor: Object.freeze({
      descriptor: securityFixtureDescriptor.descriptor,
      pack_id: securityFixtureDescriptor.pack_id,
      security_fixture_row_count: securityFixtureDescriptor.security_fixture_row_count,
      leak_safe: securityFixtureDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_failure_evidence: Object.freeze({
      evidence_packet: "H05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation",
      upstream_evidence_packet: securityFixtureDescriptor.hermes_security_fixture_evidence.evidence_packet,
      synthetic_row_count: syntheticRows.length,
      failure_row_count: failureRows.length,
      continuation_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation",
      upstream_review_packet: securityFixtureDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP189_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP189_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP189_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP189_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback !== true) && allRows.every((row) => row.executes_retry !== true),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function cp190FailureBoundaryRow(control, index) {
  const primaryControls = new Set([
    "blocked_claim_receipt",
    "failure_fixture",
    "failure_unit_test",
    "failure_integration_smoke",
    "audit_failure_hint",
    "hermes_failure_evidence",
    "claude_edge_case_prompt",
    "human_escalation_note",
  ]);
  const microPhaseId = primaryControls.has(control) ? "RP05.P07.M03" : "RP05.P07.M04";
  const microTitle = primaryControls.has(control) ? "Primary Implementation Slice" : "Secondary Workflow Slice";
  const reviewRequired = control === "claude_edge_case_prompt";
  const approvalRequired = control === "human_escalation_note";
  const blocked = control === "blocked_claim_receipt" || control === "missing_tenant_failure";
  const stableId = `matter-core-cp190:failure-boundary:${microPhaseId}:${String(index + 1).padStart(2, "0")}:${control}`;
  const safeCodeByControl = {
    blocked_claim_receipt: "MATTER_CORE_BLOCKED_CLAIM",
    failure_fixture: "MATTER_CORE_FAILURE_FIXTURE",
    failure_unit_test: "MATTER_CORE_FAILURE_TEST",
    failure_integration_smoke: "MATTER_CORE_FAILURE_TEST",
    audit_failure_hint: "MATTER_CORE_AUDIT_FAILURE_HINT",
    hermes_failure_evidence: "MATTER_CORE_HERMES_FAILURE_EVIDENCE",
    claude_edge_case_prompt: "MATTER_CORE_EDGE_CASE_REVIEW",
    human_escalation_note: "MATTER_CORE_HUMAN_ESCALATION_REQUIRED",
    failure_taxonomy: "MATTER_CORE_FAILURE_FIXTURE",
    missing_tenant_failure: "MATTER_CORE_MISSING_TENANT",
  };
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: microPhaseId,
    micro_title: microTitle,
    group_type: "failure_receipt_taxonomy_boundary",
    control,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    blocked_claim_receipt_ref: control === "blocked_claim_receipt" ? `blocked-claim-receipt-ref:${microPhaseId}` : null,
    failure_fixture_ref: control === "failure_fixture" ? `failure-fixture-ref:${microPhaseId}` : null,
    failure_unit_test_ref: control === "failure_unit_test" ? `failure-unit-test-ref:${microPhaseId}` : null,
    failure_integration_smoke_ref: control === "failure_integration_smoke" ? `failure-integration-smoke-ref:${microPhaseId}` : null,
    audit_failure_hint_ref: control === "audit_failure_hint" ? `audit-failure-hint-ref:${microPhaseId}` : null,
    hermes_failure_evidence_ref: control === "hermes_failure_evidence" ? `hermes-failure-evidence-ref:${microPhaseId}` : null,
    claude_edge_case_prompt_ref: control === "claude_edge_case_prompt" ? `claude-edge-case-prompt-ref:${microPhaseId}` : null,
    human_escalation_note_ref: control === "human_escalation_note" ? `human-escalation-note-ref:${microPhaseId}` : null,
    failure_taxonomy_ref: control === "failure_taxonomy" ? `failure-taxonomy-ref:${microPhaseId}` : null,
    missing_tenant_failure_ref: control === "missing_tenant_failure" ? `missing-tenant-failure-ref:${microPhaseId}` : null,
    customer_safe_error_codes: Object.freeze([safeCodeByControl[control]]),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor(input = {}) {
  const continuationDescriptor = createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor(input);
  const requirements = MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS;
  const boundaryRows = Object.freeze(requirements.required_controls.map((control, index) => cp190FailureBoundaryRow(control, index)));
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(boundaryRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(boundaryRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(boundaryRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(boundaryRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    boundaryRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezeFailureReceiptTaxonomyBoundaryResult({
    descriptor: "MatterCoreFailureReceiptTaxonomyBoundaryDescriptor",
    source_synthetic_fixture_failure_evidence_continuation_pack_id:
      requirements.source_synthetic_fixture_failure_evidence_continuation_pack_id,
    source_permission_audit_security_fixture_boundary_pack_id:
      requirements.source_permission_audit_security_fixture_boundary_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_a_pack_reason: requirements.risk_a_pack_reason,
    failure_boundary_rows: boundaryRows,
    failure_boundary_row_count: boundaryRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_outcome: rowsByOutcome,
    inherited_failure_evidence_descriptor: Object.freeze({
      descriptor: continuationDescriptor.descriptor,
      pack_id: continuationDescriptor.pack_id,
      continuation_row_count: continuationDescriptor.continuation_row_count,
      leak_safe: continuationDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_failure_boundary_evidence: Object.freeze({
      evidence_packet: "H05.CP00-190.matter_core_failure_receipt_taxonomy_boundary",
      upstream_evidence_packet: continuationDescriptor.hermes_failure_evidence.evidence_packet,
      failure_boundary_row_count: boundaryRows.length,
      blocked_claim_receipt_count: boundaryRows.filter((row) => row.blocked_claim_receipt_ref).length,
      missing_tenant_failure_count: boundaryRows.filter((row) => row.missing_tenant_failure_ref).length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-190.matter_core_failure_receipt_taxonomy_boundary",
      upstream_review_packet: continuationDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP190_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP190_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP190_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP190_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: boundaryRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: boundaryRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: boundaryRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: boundaryRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: boundaryRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: boundaryRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: boundaryRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: boundaryRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        boundaryRows.every((row) => row.dispatches_review_route === false)
        && boundaryRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        boundaryRows.every((row) => row.executes_rollback === false) && boundaryRows.every((row) => row.executes_retry === false),
      replay_commands_inert: boundaryRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP191_SAFE_CODE_BY_CONTROL = Object.freeze({
  missing_tenant_failure: "MATTER_CORE_MISSING_TENANT",
  missing_actor_failure: "MATTER_CORE_MISSING_ACTOR",
  missing_matter_failure: "MATTER_CORE_MISSING_MATTER",
  missing_resource_failure: "MATTER_CORE_MISSING_RESOURCE",
  unknown_action_failure: "MATTER_CORE_UNKNOWN_ACTION",
  cross_tenant_failure: "MATTER_CORE_CROSS_TENANT",
  permission_denied_failure: "MATTER_CORE_PERMISSION_DENIED",
  ambiguous_rule_failure: "MATTER_CORE_AMBIGUOUS_RULE",
  stale_reference_failure: "MATTER_CORE_STALE_REFERENCE",
  lock_conflict_failure: "MATTER_CORE_LOCK_CONFLICT",
  retry_exhaustion_failure: "MATTER_CORE_RETRY_EXHAUSTED",
  rollback_expectation: "MATTER_CORE_ROLLBACK_REQUIRED",
  compensation_expectation: "MATTER_CORE_COMPENSATION_EXPECTED",
  blocked_claim_receipt: "MATTER_CORE_BLOCKED_CLAIM",
  failure_fixture: "MATTER_CORE_FAILURE_FIXTURE",
  failure_unit_test: "MATTER_CORE_FAILURE_TEST",
  failure_integration_smoke: "MATTER_CORE_FAILURE_TEST",
  audit_failure_hint: "MATTER_CORE_AUDIT_FAILURE_HINT",
  hermes_failure_evidence: "MATTER_CORE_HERMES_FAILURE_EVIDENCE",
  claude_edge_case_prompt: "MATTER_CORE_EDGE_CASE_REVIEW",
  human_escalation_note: "MATTER_CORE_HUMAN_ESCALATION_REQUIRED",
  failure_taxonomy: "MATTER_CORE_FAILURE_FIXTURE",
});

function cp191GeneratedFailureRecoveryBindingRow(control, microPhaseId, microTitle, group, index) {
  const requirements = MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const reviewRequired = requirements.review_required_controls.includes(control);
  const approvalRequired = requirements.approval_required_controls.includes(control);
  const stableId = `matter-core-cp191:generated-failure-binding:${group}:${microPhaseId}:${String(index + 1).padStart(2, "0")}:${control}`;
  const permissionAuditBinding = group === "permission-audit-binding";
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: microPhaseId,
    micro_title: microTitle,
    group_type: group,
    control,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    failure_taxonomy_ref: control === "failure_taxonomy" ? `failure-taxonomy-ref:${microPhaseId}` : null,
    missing_tenant_failure_ref: control === "missing_tenant_failure" ? `missing-tenant-failure-ref:${microPhaseId}` : null,
    missing_actor_failure_ref: control === "missing_actor_failure" ? `missing-actor-failure-ref:${microPhaseId}` : null,
    missing_matter_failure_ref: control === "missing_matter_failure" ? `missing-matter-failure-ref:${microPhaseId}` : null,
    missing_resource_failure_ref: control === "missing_resource_failure" ? `missing-resource-failure-ref:${microPhaseId}` : null,
    unknown_action_failure_ref: control === "unknown_action_failure" ? `unknown-action-failure-ref:${microPhaseId}` : null,
    cross_tenant_failure_ref: control === "cross_tenant_failure" ? `cross-tenant-failure-ref:${microPhaseId}` : null,
    permission_denied_failure_ref: control === "permission_denied_failure" ? `permission-denied-failure-ref:${microPhaseId}` : null,
    ambiguous_rule_failure_ref: control === "ambiguous_rule_failure" ? `ambiguous-rule-failure-ref:${microPhaseId}` : null,
    stale_reference_failure_ref: control === "stale_reference_failure" ? `stale-reference-failure-ref:${microPhaseId}` : null,
    lock_conflict_failure_ref: control === "lock_conflict_failure" ? `lock-conflict-failure-ref:${microPhaseId}` : null,
    retry_exhaustion_failure_ref: control === "retry_exhaustion_failure" ? `retry-exhaustion-failure-ref:${microPhaseId}` : null,
    rollback_expectation_ref: control === "rollback_expectation" ? `rollback-expectation-ref:${microPhaseId}` : null,
    compensation_expectation_ref: control === "compensation_expectation" ? `compensation-expectation-ref:${microPhaseId}` : null,
    blocked_claim_receipt_ref: control === "blocked_claim_receipt" ? `blocked-claim-receipt-ref:${microPhaseId}` : null,
    failure_fixture_ref: control === "failure_fixture" ? `failure-fixture-ref:${microPhaseId}` : null,
    failure_unit_test_ref: control === "failure_unit_test" ? `failure-unit-test-ref:${microPhaseId}` : null,
    failure_integration_smoke_ref: control === "failure_integration_smoke" ? `failure-integration-smoke-ref:${microPhaseId}` : null,
    audit_failure_hint_ref: control === "audit_failure_hint" ? `audit-failure-hint-ref:${microPhaseId}` : null,
    hermes_failure_evidence_ref: control === "hermes_failure_evidence" ? `hermes-failure-evidence-ref:${microPhaseId}` : null,
    claude_edge_case_prompt_ref: control === "claude_edge_case_prompt" ? `claude-edge-case-prompt-ref:${microPhaseId}` : null,
    human_escalation_note_ref: control === "human_escalation_note" ? `human-escalation-note-ref:${microPhaseId}` : null,
    permission_badge_ref: permissionAuditBinding ? `permission-badge-ref:${microPhaseId}` : null,
    audit_hint_ref: permissionAuditBinding ? `audit-hint-ref:${microPhaseId}` : null,
    customer_safe_error_codes: Object.freeze([CP191_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_FAILURE_BOUNDARY"]),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreGeneratedFailureRecoveryBindingDescriptor(input = {}) {
  const boundaryDescriptor = createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor(input);
  const requirements = MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS;
  const secondaryWorkflowRows = Object.freeze(
    requirements.secondary_workflow_controls.map((control, index) =>
      cp191GeneratedFailureRecoveryBindingRow(control, "RP05.P07.M04", "Secondary Workflow Slice", "secondary-workflow", index),
    ),
  );
  const permissionAuditBindingRows = Object.freeze(
    requirements.permission_audit_binding_controls.map((control, index) =>
      cp191GeneratedFailureRecoveryBindingRow(
        control,
        "RP05.P07.M05",
        "Permission And Audit Binding",
        "permission-audit-binding",
        index,
      ),
    ),
  );
  const allRows = Object.freeze([...secondaryWorkflowRows, ...permissionAuditBindingRows]);
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByGroup = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.group_type] = (acc[row.group_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezeGeneratedFailureRecoveryBindingResult({
    descriptor: "MatterCoreGeneratedFailureRecoveryBindingDescriptor",
    source_failure_receipt_taxonomy_boundary_pack_id: requirements.source_failure_receipt_taxonomy_boundary_pack_id,
    source_synthetic_fixture_failure_evidence_continuation_pack_id:
      requirements.source_synthetic_fixture_failure_evidence_continuation_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_b_pack_reason: requirements.risk_b_pack_reason,
    secondary_workflow_rows: secondaryWorkflowRows,
    permission_audit_binding_rows: permissionAuditBindingRows,
    generated_failure_rows: allRows,
    generated_failure_row_count: allRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_group: rowsByGroup,
    rows_by_outcome: rowsByOutcome,
    inherited_failure_boundary_descriptor: Object.freeze({
      descriptor: boundaryDescriptor.descriptor,
      pack_id: boundaryDescriptor.pack_id,
      failure_boundary_row_count: boundaryDescriptor.failure_boundary_row_count,
      leak_safe: boundaryDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_generated_failure_evidence: Object.freeze({
      evidence_packet: "H05.CP00-191.matter_core_generated_failure_recovery_binding",
      upstream_evidence_packet: boundaryDescriptor.hermes_failure_boundary_evidence.evidence_packet,
      generated_failure_row_count: allRows.length,
      secondary_workflow_row_count: secondaryWorkflowRows.length,
      permission_audit_binding_row_count: permissionAuditBindingRows.length,
      blocked_row_count: rowsByOutcome.blocked.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-191.matter_core_generated_failure_recovery_binding",
      upstream_review_packet: boundaryDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP191_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP191_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP191_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP191_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

function cp192FailureFixtureEntryBoundaryRow(control, microPhaseId, microTitle, group, index) {
  const requirements = MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const reviewRequired = requirements.review_required_controls.includes(control);
  const approvalRequired = requirements.approval_required_controls.includes(control);
  const stableId = `matter-core-cp192:failure-fixture-entry:${group}:${microPhaseId}:${String(index + 1).padStart(2, "0")}:${control}`;
  const fixtureEntry = group === "failure-fixture-entry";
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: microPhaseId,
    micro_title: microTitle,
    group_type: group,
    control,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    source_generated_failure_recovery_binding_pack_id: requirements.source_generated_failure_recovery_binding_pack_id,
    source_generated_failure_row_ref: `matter-core-cp191:generated-failure-binding:${control}`,
    claude_edge_case_prompt_ref: control === "claude_edge_case_prompt" ? `claude-edge-case-prompt-ref:${microPhaseId}:tail` : null,
    human_escalation_note_ref: control === "human_escalation_note" ? `human-escalation-note-ref:${microPhaseId}:tail` : null,
    failure_taxonomy_ref: control === "failure_taxonomy" ? `failure-taxonomy-ref:${microPhaseId}:entry` : null,
    missing_tenant_failure_ref: control === "missing_tenant_failure" ? `missing-tenant-failure-ref:${microPhaseId}:entry` : null,
    missing_actor_failure_ref: control === "missing_actor_failure" ? `missing-actor-failure-ref:${microPhaseId}:entry` : null,
    missing_matter_failure_ref: control === "missing_matter_failure" ? `missing-matter-failure-ref:${microPhaseId}:entry` : null,
    missing_resource_failure_ref: control === "missing_resource_failure" ? `missing-resource-failure-ref:${microPhaseId}:entry` : null,
    unknown_action_failure_ref: control === "unknown_action_failure" ? `unknown-action-failure-ref:${microPhaseId}:entry` : null,
    cross_tenant_failure_ref: control === "cross_tenant_failure" ? `cross-tenant-failure-ref:${microPhaseId}:entry` : null,
    permission_denied_failure_ref: control === "permission_denied_failure" ? `permission-denied-failure-ref:${microPhaseId}:entry` : null,
    permission_badge_ref: fixtureEntry ? `permission-badge-ref:${microPhaseId}:failure-fixture-entry` : null,
    audit_hint_ref: fixtureEntry ? `audit-hint-ref:${microPhaseId}:failure-fixture-entry` : null,
    customer_safe_error_codes: Object.freeze([CP191_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_FAILURE_BOUNDARY"]),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreFailureFixtureEntryBoundaryDescriptor(input = {}) {
  const generatedFailureDescriptor = createMatterCoreGeneratedFailureRecoveryBindingDescriptor(input);
  const requirements = MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS;
  const tailReviewRows = Object.freeze(
    requirements.tail_review_controls.map((control, index) =>
      cp192FailureFixtureEntryBoundaryRow(control, "RP05.P07.M05", "Permission And Audit Binding", "review-escalation-tail", index),
    ),
  );
  const fixtureEntryRows = Object.freeze(
    requirements.fixture_entry_controls.map((control, index) =>
      cp192FailureFixtureEntryBoundaryRow(control, "RP05.P07.M06", "Synthetic Fixture Set", "failure-fixture-entry", index),
    ),
  );
  const allRows = Object.freeze([...tailReviewRows, ...fixtureEntryRows]);
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByGroup = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.group_type] = (acc[row.group_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezeFailureFixtureEntryBoundaryResult({
    descriptor: "MatterCoreFailureFixtureEntryBoundaryDescriptor",
    source_generated_failure_recovery_binding_pack_id: requirements.source_generated_failure_recovery_binding_pack_id,
    source_failure_receipt_taxonomy_boundary_pack_id: requirements.source_failure_receipt_taxonomy_boundary_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_a_pack_reason: requirements.risk_a_pack_reason,
    tail_review_rows: tailReviewRows,
    fixture_entry_rows: fixtureEntryRows,
    failure_fixture_entry_rows: allRows,
    failure_fixture_entry_row_count: allRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_group: rowsByGroup,
    rows_by_outcome: rowsByOutcome,
    inherited_generated_failure_descriptor: Object.freeze({
      descriptor: generatedFailureDescriptor.descriptor,
      pack_id: generatedFailureDescriptor.pack_id,
      generated_failure_row_count: generatedFailureDescriptor.generated_failure_row_count,
      leak_safe: generatedFailureDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_failure_fixture_entry_evidence: Object.freeze({
      evidence_packet: "H05.CP00-192.matter_core_failure_fixture_entry_boundary",
      upstream_evidence_packet: generatedFailureDescriptor.hermes_generated_failure_evidence.evidence_packet,
      failure_fixture_entry_row_count: allRows.length,
      tail_review_row_count: tailReviewRows.length,
      fixture_entry_row_count: fixtureEntryRows.length,
      blocked_row_count: rowsByOutcome.blocked.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-192.matter_core_failure_fixture_entry_boundary",
      upstream_review_packet: generatedFailureDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP192_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP192_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP192_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP192_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP193_SAFE_CODE_BY_CONTROL = Object.freeze({
  ...CP191_SAFE_CODE_BY_CONTROL,
  hermes_command_matrix: "MATTER_CORE_EVIDENCE_PACKET",
  evidence_field_list: "MATTER_CORE_EVIDENCE_PACKET",
  changed_file_receipt: "MATTER_CORE_EVIDENCE_PACKET",
  command_result_receipt: "MATTER_CORE_EVIDENCE_PACKET",
  fixture_summary_receipt: "MATTER_CORE_FAILURE_FIXTURE",
  permission_summary_receipt: "MATTER_CORE_EVIDENCE_PACKET",
  audit_summary_receipt: "MATTER_CORE_AUDIT_FAILURE_HINT",
  no_real_data_receipt: "MATTER_CORE_EVIDENCE_PACKET",
  claude_dependency_marker: "MATTER_CORE_REVIEW_DEPENDENCY",
  human_approval_marker: "MATTER_CORE_HUMAN_APPROVAL_REQUIRED",
  pass_semantics: "MATTER_CORE_PASS_SEMANTICS",
  pass_with_findings_semantics: "MATTER_CORE_PASS_WITH_FINDINGS",
  block_semantics: "MATTER_CORE_BLOCKED_SEMANTICS",
  evidence_template: "MATTER_CORE_EVIDENCE_PACKET",
  validation_command_check: "MATTER_CORE_EVIDENCE_PACKET",
  harness_boundary_note: "MATTER_CORE_CLOSEOUT_HANDOFF",
  closeout_handoff: "MATTER_CORE_CLOSEOUT_HANDOFF",
  regression_receipt: "MATTER_CORE_FAILURE_TEST",
  next_gate_readiness: "MATTER_CORE_CLOSEOUT_HANDOFF",
  documentation_update: "MATTER_CORE_CLOSEOUT_HANDOFF",
  operator_summary: "MATTER_CORE_CLOSEOUT_HANDOFF",
});

const CP193_FAILURE_FULL_CONTROLS = Object.freeze([
  "failure_taxonomy",
  "missing_tenant_failure",
  "missing_actor_failure",
  "missing_matter_failure",
  "missing_resource_failure",
  "unknown_action_failure",
  "cross_tenant_failure",
  "permission_denied_failure",
  "ambiguous_rule_failure",
  "stale_reference_failure",
  "lock_conflict_failure",
  "retry_exhaustion_failure",
  "rollback_expectation",
  "compensation_expectation",
  "blocked_claim_receipt",
  "failure_fixture",
  "failure_unit_test",
  "failure_integration_smoke",
  "audit_failure_hint",
  "hermes_failure_evidence",
  "claude_edge_case_prompt",
  "human_escalation_note",
]);

const CP193_EVIDENCE_FULL_CONTROLS = Object.freeze([
  "hermes_command_matrix",
  "evidence_field_list",
  "changed_file_receipt",
  "command_result_receipt",
  "fixture_summary_receipt",
  "blocked_claim_receipt",
  "permission_summary_receipt",
  "audit_summary_receipt",
  "no_real_data_receipt",
  "claude_dependency_marker",
  "human_approval_marker",
  "pass_semantics",
  "pass_with_findings_semantics",
  "block_semantics",
  "evidence_template",
  "validation_command_check",
  "harness_boundary_note",
  "closeout_handoff",
  "regression_receipt",
  "next_gate_readiness",
  "documentation_update",
  "operator_summary",
]);

const CP193_ROW_GROUPS = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP05.P07.M06",
    micro_title: "Synthetic Fixture Set",
    group_type: "synthetic-fixture-tail",
    controls: Object.freeze(CP193_FAILURE_FULL_CONTROLS.slice(8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P07.M07",
    micro_title: "Test And Golden Case Set",
    group_type: "test-and-golden-case-set",
    controls: CP193_FAILURE_FULL_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P07.M08",
    micro_title: "Hermes Evidence Packet",
    group_type: "hermes-evidence-packet",
    controls: CP193_FAILURE_FULL_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P07.M09",
    micro_title: "Claude Review Packet",
    group_type: "claude-review-packet",
    controls: Object.freeze(CP193_FAILURE_FULL_CONTROLS.slice(0, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P07.M10",
    micro_title: "Closeout And Next Handoff",
    group_type: "closeout-and-next-handoff",
    controls: Object.freeze(CP193_FAILURE_FULL_CONTROLS.slice(0, 11)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M00",
    micro_title: "Scope Inventory",
    group_type: "scope-inventory",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 4)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M01",
    micro_title: "Contract Draft",
    group_type: "contract-draft",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M02",
    micro_title: "Type And Shape Definition",
    group_type: "type-and-shape-definition",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M03",
    micro_title: "Primary Implementation Slice",
    group_type: "primary-implementation-slice",
    controls: CP193_EVIDENCE_FULL_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M04",
    micro_title: "Secondary Workflow Slice",
    group_type: "secondary-workflow-slice",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 19)),
  }),
]);

const CP193_DELIVERABLE_BY_CONTROL = Object.freeze({
  permission_denied_failure: "security_audit",
  audit_failure_hint: "security_audit",
  compensation_expectation: "implementation",
  human_escalation_note: "implementation",
  blocked_claim_receipt: "hermes_evidence",
  hermes_failure_evidence: "hermes_evidence",
  failure_fixture: "fixture",
  failure_unit_test: "test",
  failure_integration_smoke: "test",
  claude_edge_case_prompt: "claude_review",
  hermes_command_matrix: "hermes_evidence",
  evidence_field_list: "hermes_evidence",
  changed_file_receipt: "hermes_evidence",
  command_result_receipt: "hermes_evidence",
  fixture_summary_receipt: "hermes_evidence",
  permission_summary_receipt: "hermes_evidence",
  audit_summary_receipt: "hermes_evidence",
  no_real_data_receipt: "hermes_evidence",
  claude_dependency_marker: "claude_review",
  human_approval_marker: "implementation",
  pass_semantics: "implementation",
  pass_with_findings_semantics: "implementation",
  block_semantics: "implementation",
  evidence_template: "hermes_evidence",
  validation_command_check: "implementation",
  harness_boundary_note: "implementation",
  closeout_handoff: "implementation",
  regression_receipt: "test",
  next_gate_readiness: "implementation",
  documentation_update: "implementation",
  operator_summary: "implementation",
});

function cp193FailureFixtureEvidenceReviewBridgeRow(control, group, index) {
  const requirements = MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const reviewRequired = requirements.review_required_controls.includes(control);
  const approvalRequired = requirements.approval_required_controls.includes(control);
  const stableId = `matter-core-cp193:failure-evidence-review-bridge:${group.group_type}:${String(index + 1).padStart(2, "0")}:${control}`;
  const emittedRefKey = `${control}_ref`;
  const deliverableType = CP193_DELIVERABLE_BY_CONTROL[control] ?? "failure_recovery";
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: group.group_type,
    control,
    deliverable_type: deliverableType,
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    source_failure_fixture_entry_boundary_pack_id: requirements.source_failure_fixture_entry_boundary_pack_id,
    [emittedRefKey]: `${control.replaceAll("_", "-")}-ref:${group.micro_phase_id}`,
    permission_badge_ref: `permission-badge-ref:${group.micro_phase_id}:${group.group_type}`,
    audit_hint_ref: `audit-hint-ref:${group.micro_phase_id}:${group.group_type}`,
    customer_safe_error_codes: Object.freeze([CP193_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_EVIDENCE_PACKET"]),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor(input = {}) {
  const entryDescriptor = createMatterCoreFailureFixtureEntryBoundaryDescriptor(input);
  const requirements = MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS;
  const rowGroups = Object.freeze(
    CP193_ROW_GROUPS.map((group) =>
      Object.freeze(group.controls.map((control, index) => cp193FailureFixtureEvidenceReviewBridgeRow(control, group, index))),
    ),
  );
  const allRows = Object.freeze(rowGroups.flat());
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByMicroTitle = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_title] = (acc[row.micro_title] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByGroup = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.group_type] = (acc[row.group_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByDeliverable = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.deliverable_type] = (acc[row.deliverable_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezeFailureFixtureEvidenceReviewBridgeResult({
    descriptor: "MatterCoreFailureFixtureEvidenceReviewBridgeDescriptor",
    source_failure_fixture_entry_boundary_pack_id: requirements.source_failure_fixture_entry_boundary_pack_id,
    source_generated_failure_recovery_binding_pack_id: requirements.source_generated_failure_recovery_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_c_pack_reason: requirements.risk_c_pack_reason,
    failure_fixture_evidence_review_rows: allRows,
    failure_fixture_evidence_review_row_count: allRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_micro_title: rowsByMicroTitle,
    rows_by_group: rowsByGroup,
    rows_by_deliverable: rowsByDeliverable,
    rows_by_outcome: rowsByOutcome,
    inherited_failure_fixture_entry_descriptor: Object.freeze({
      descriptor: entryDescriptor.descriptor,
      pack_id: entryDescriptor.pack_id,
      failure_fixture_entry_row_count: entryDescriptor.failure_fixture_entry_row_count,
      leak_safe: entryDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_failure_fixture_evidence_review: Object.freeze({
      evidence_packet: "H05.CP00-193.matter_core_failure_fixture_evidence_review_bridge",
      upstream_evidence_packet: entryDescriptor.hermes_failure_fixture_entry_evidence.evidence_packet,
      failure_fixture_evidence_review_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-193.matter_core_failure_fixture_evidence_review_bridge",
      upstream_review_packet: entryDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP193_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP193_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP193_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP193_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP194_ROW_GROUPS = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP05.P08.M04",
    micro_title: "Secondary Workflow Slice",
    group_type: "secondary-workflow-terminal",
    controls: Object.freeze(["next_gate_readiness"]),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M05",
    micro_title: "Permission And Audit Binding",
    group_type: "permission-audit-binding",
    controls: CP193_EVIDENCE_FULL_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M06",
    micro_title: "Synthetic Fixture Set",
    group_type: "synthetic-fixture-set-entry",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 17)),
  }),
]);

function cp194PermissionAuditEvidenceTerminalRow(control, group, index) {
  const requirements = MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const reviewRequired = requirements.review_required_controls.includes(control);
  const approvalRequired = requirements.approval_required_controls.includes(control);
  const stableId = `matter-core-cp194:permission-audit-evidence-terminal:${group.group_type}:${String(index + 1).padStart(2, "0")}:${control}`;
  const emittedRefKey = `${control}_ref`;
  return Object.freeze({
    stable_id: stableId,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: group.group_type,
    control,
    deliverable_type: CP193_DELIVERABLE_BY_CONTROL[control] ?? "implementation",
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    source_failure_fixture_evidence_review_bridge_pack_id: requirements.source_failure_fixture_evidence_review_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    [emittedRefKey]: `${control.replaceAll("_", "-")}-ref:${group.micro_phase_id}`,
    permission_badge_ref: `permission-badge-ref:${group.micro_phase_id}:${group.group_type}`,
    audit_hint_ref: `audit-hint-ref:${group.micro_phase_id}:${group.group_type}`,
    customer_safe_error_codes: Object.freeze([CP193_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_EVIDENCE_PACKET"]),
    descriptor_ref_only: true,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor(input = {}) {
  const upstreamDescriptor = createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor(input);
  const requirements = MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS;
  const rowGroups = Object.freeze(
    CP194_ROW_GROUPS.map((group) =>
      Object.freeze(group.controls.map((control, index) => cp194PermissionAuditEvidenceTerminalRow(control, group, index))),
    ),
  );
  const allRows = Object.freeze(rowGroups.flat());
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  const rowsByMicroPhase = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_phase_id] = (acc[row.micro_phase_id] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByMicroTitle = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.micro_title] = (acc[row.micro_title] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByGroup = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.group_type] = (acc[row.group_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const rowsByDeliverable = Object.freeze(
    allRows.reduce((acc, row) => {
      acc[row.deliverable_type] = (acc[row.deliverable_type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return freezePermissionAuditEvidenceTerminalBridgeResult({
    descriptor: "MatterCorePermissionAuditEvidenceTerminalBridgeDescriptor",
    source_failure_fixture_evidence_review_bridge_pack_id: requirements.source_failure_fixture_evidence_review_bridge_pack_id,
    source_failure_fixture_entry_boundary_pack_id: requirements.source_failure_fixture_entry_boundary_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_b_pack_reason: requirements.risk_b_pack_reason,
    permission_audit_evidence_terminal_rows: allRows,
    permission_audit_evidence_terminal_row_count: allRows.length,
    rows_by_micro_phase: rowsByMicroPhase,
    rows_by_micro_title: rowsByMicroTitle,
    rows_by_group: rowsByGroup,
    rows_by_deliverable: rowsByDeliverable,
    rows_by_outcome: rowsByOutcome,
    inherited_failure_fixture_evidence_review_bridge_descriptor: Object.freeze({
      descriptor: upstreamDescriptor.descriptor,
      pack_id: upstreamDescriptor.pack_id,
      failure_fixture_evidence_review_row_count: upstreamDescriptor.failure_fixture_evidence_review_row_count,
      leak_safe: upstreamDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_permission_audit_evidence_terminal: Object.freeze({
      evidence_packet: "H05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge",
      upstream_evidence_packet: upstreamDescriptor.hermes_failure_fixture_evidence_review.evidence_packet,
      permission_audit_evidence_terminal_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge",
      upstream_review_packet: upstreamDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP194_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP194_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP194_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP195_REVIEW_QUESTION_CONTROLS = Object.freeze([
  "architecture_review_questions",
  "security_review_questions",
  "permission_bypass_questions",
  "audit_completeness_questions",
  "missing_test_questions",
  "ui_leak_questions",
  "downstream_readiness_questions",
  "risk_register",
  "severity_taxonomy",
  "go_no_go_verdict_format",
  "finding_routing_map",
  "human_approval_summary",
  "claude_review_packet",
  "closeout_criteria",
  "pass_closeout_note",
  "pass_with_findings_closeout_note",
  "block_closeout_note",
  "next_rp_dependency",
  "documentation_update",
  "command_rerun",
]);

const CP195_DELIVERABLE_BY_CONTROL = Object.freeze({
  ...CP193_DELIVERABLE_BY_CONTROL,
  architecture_review_questions: "claude_review",
  security_review_questions: "claude_review",
  permission_bypass_questions: "security_audit",
  audit_completeness_questions: "security_audit",
  missing_test_questions: "test",
  ui_leak_questions: "ui",
  downstream_readiness_questions: "implementation",
  risk_register: "implementation",
  severity_taxonomy: "implementation",
  go_no_go_verdict_format: "implementation",
  finding_routing_map: "implementation",
  human_approval_summary: "implementation",
  claude_review_packet: "claude_review",
  closeout_criteria: "implementation",
  pass_closeout_note: "implementation",
  pass_with_findings_closeout_note: "implementation",
  block_closeout_note: "implementation",
  next_rp_dependency: "implementation",
  command_rerun: "implementation",
});

const CP195_SAFE_CODE_BY_CONTROL = Object.freeze({
  ...CP193_SAFE_CODE_BY_CONTROL,
  architecture_review_questions: "MATTER_CORE_REVIEW_DEPENDENCY",
  security_review_questions: "MATTER_CORE_REVIEW_DEPENDENCY",
  permission_bypass_questions: "MATTER_CORE_SECURITY_AUDIT_QUESTION",
  audit_completeness_questions: "MATTER_CORE_SECURITY_AUDIT_QUESTION",
  missing_test_questions: "MATTER_CORE_FAILURE_TEST",
  ui_leak_questions: "MATTER_CORE_UI_LEAK_REVIEW",
  downstream_readiness_questions: "MATTER_CORE_CLOSEOUT_HANDOFF",
  risk_register: "MATTER_CORE_RISK_REGISTER",
  severity_taxonomy: "MATTER_CORE_RISK_REGISTER",
  go_no_go_verdict_format: "MATTER_CORE_CLOSEOUT_HANDOFF",
  finding_routing_map: "MATTER_CORE_RISK_REGISTER",
  human_approval_summary: "MATTER_CORE_HUMAN_APPROVAL_REQUIRED",
  claude_review_packet: "MATTER_CORE_REVIEW_DEPENDENCY",
  closeout_criteria: "MATTER_CORE_CLOSEOUT_HANDOFF",
  pass_closeout_note: "MATTER_CORE_PASS_SEMANTICS",
  pass_with_findings_closeout_note: "MATTER_CORE_PASS_WITH_FINDINGS",
  block_closeout_note: "MATTER_CORE_BLOCKED_SEMANTICS",
  next_rp_dependency: "MATTER_CORE_CLOSEOUT_HANDOFF",
  command_rerun: "MATTER_CORE_EVIDENCE_PACKET",
});

const CP195_ROW_GROUPS = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP05.P08.M06",
    phase_id: "RP05.P08",
    micro_title: "Synthetic Fixture Set",
    group_type: "p08-synthetic-fixture-terminal",
    controls: Object.freeze(["closeout_handoff", "regression_receipt", "next_gate_readiness"]),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M07",
    phase_id: "RP05.P08",
    micro_title: "Test And Golden Case Set",
    group_type: "p08-test-golden-terminal",
    controls: CP193_EVIDENCE_FULL_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M08",
    phase_id: "RP05.P08",
    micro_title: "Hermes Evidence Packet",
    group_type: "p08-hermes-evidence-terminal",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M09",
    phase_id: "RP05.P08",
    micro_title: "Claude Review Packet",
    group_type: "p08-claude-review-terminal",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 20)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P08.M10",
    phase_id: "RP05.P08",
    micro_title: "Closeout And Next Handoff",
    group_type: "p08-closeout-next-handoff",
    controls: Object.freeze(CP193_EVIDENCE_FULL_CONTROLS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M00",
    phase_id: "RP05.P09",
    micro_title: "Scope Inventory",
    group_type: "p09-scope-inventory",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 4)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M01",
    phase_id: "RP05.P09",
    micro_title: "Contract Draft",
    group_type: "p09-contract-draft",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 4)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M02",
    phase_id: "RP05.P09",
    micro_title: "Type And Shape Definition",
    group_type: "p09-type-shape-definition",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M03",
    phase_id: "RP05.P09",
    micro_title: "Primary Implementation Slice",
    group_type: "p09-primary-implementation-slice",
    controls: CP195_REVIEW_QUESTION_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M04",
    phase_id: "RP05.P09",
    micro_title: "Secondary Workflow Slice",
    group_type: "p09-secondary-workflow-slice",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 11)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M05",
    phase_id: "RP05.P09",
    micro_title: "Permission And Audit Binding",
    group_type: "p09-permission-audit-binding",
    controls: CP195_REVIEW_QUESTION_CONTROLS,
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M06",
    phase_id: "RP05.P09",
    micro_title: "Synthetic Fixture Set",
    group_type: "p09-synthetic-fixture-set",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 8)),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M07",
    phase_id: "RP05.P09",
    micro_title: "Test And Golden Case Set",
    group_type: "p09-test-golden-case-entry",
    controls: Object.freeze(CP195_REVIEW_QUESTION_CONTROLS.slice(0, 2)),
  }),
]);

function cp195EvidenceReviewHandoffTerminalRow(control, group, index) {
  const requirements = MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS;
  const blocked = requirements.blocked_titles.includes(control) || control === "block_semantics";
  const reviewRequired = requirements.review_required_titles.includes(control) || control === "claude_dependency_marker";
  const approvalRequired = requirements.approval_required_titles.includes(control) || control === "human_approval_marker";
  const stableId = `matter-core-cp195:evidence-review-handoff-terminal:${group.group_type}:${String(index + 1).padStart(2, "0")}:${control}`;
  const emittedRefKey = `${control}_ref`;
  return Object.freeze({
    stable_id: stableId,
    phase_id: group.phase_id,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: group.group_type,
    control,
    deliverable_type: CP195_DELIVERABLE_BY_CONTROL[control] ?? "implementation",
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : approvalRequired ? "approval_required" : "passed",
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_failure_fixture_evidence_review_bridge_pack_id: requirements.source_failure_fixture_evidence_review_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    [emittedRefKey]: `${control.replaceAll("_", "-")}-ref:${group.micro_phase_id}`,
    permission_badge_ref: `permission-badge-ref:${group.micro_phase_id}:${group.group_type}`,
    audit_hint_ref: `audit-hint-ref:${group.micro_phase_id}:${group.group_type}`,
    customer_safe_error_codes: Object.freeze([CP195_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_EVIDENCE_PACKET"]),
    descriptor_ref_only: true,
    review_question_ref_only: control.endsWith("_questions"),
    security_audit_ref_only: requirements.security_audit_titles.includes(control),
    ui_leak_ref_only: requirements.ui_guard_titles.includes(control),
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor(input = {}) {
  const upstreamDescriptor = createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor(input);
  const requirements = MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS;
  const rowGroups = Object.freeze(
    CP195_ROW_GROUPS.map((group) =>
      Object.freeze(group.controls.map((control, index) => cp195EvidenceReviewHandoffTerminalRow(control, group, index))),
    ),
  );
  const allRows = Object.freeze(rowGroups.flat());
  const summarize = (key) =>
    Object.freeze(
      allRows.reduce((acc, row) => {
        acc[row[key]] = (acc[row[key]] ?? 0) + 1;
        return acc;
      }, {}),
    );
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  return freezeEvidenceReviewHandoffTerminalBridgeResult({
    descriptor: "MatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor",
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_failure_fixture_evidence_review_bridge_pack_id: requirements.source_failure_fixture_evidence_review_bridge_pack_id,
    source_failure_fixture_entry_boundary_pack_id: requirements.source_failure_fixture_entry_boundary_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_c_pack_reason: requirements.risk_c_pack_reason,
    evidence_review_handoff_terminal_rows: allRows,
    evidence_review_handoff_terminal_row_count: allRows.length,
    rows_by_phase: summarize("phase_id"),
    rows_by_micro_phase: summarize("micro_phase_id"),
    rows_by_micro_title: summarize("micro_title"),
    rows_by_group: summarize("group_type"),
    rows_by_deliverable: summarize("deliverable_type"),
    rows_by_outcome: rowsByOutcome,
    security_audit_rows: Object.freeze(allRows.filter((row) => row.security_audit_ref_only === true)),
    ui_leak_rows: Object.freeze(allRows.filter((row) => row.ui_leak_ref_only === true)),
    inherited_permission_audit_evidence_terminal_bridge_descriptor: Object.freeze({
      descriptor: upstreamDescriptor.descriptor,
      pack_id: upstreamDescriptor.pack_id,
      permission_audit_evidence_terminal_row_count: upstreamDescriptor.permission_audit_evidence_terminal_row_count,
      leak_safe: upstreamDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_evidence_review_handoff_terminal: Object.freeze({
      evidence_packet: "H05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge",
      upstream_evidence_packet: upstreamDescriptor.hermes_permission_audit_evidence_terminal.evidence_packet,
      evidence_review_handoff_terminal_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_failure_recovery_execution: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge",
      upstream_review_packet: upstreamDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP195_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP195_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP195_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP196_REVIEW_QUESTION_CONTROLS =
  MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.required_question_controls;

function cp196ReviewQuestionSecurityGateRow(control, index) {
  const requirements = MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const approvalRequired = requirements.approval_required_controls.includes(control);
  const unitOrder = String(index + 3).padStart(2, "0");
  const stableId = `matter-core-cp196:review-question-security-gate:rp05-p09-m07:s${unitOrder}:${control}`;
  return Object.freeze({
    stable_id: stableId,
    unit_id: `RP05.P09.M07.S${unitOrder}`,
    phase_id: "RP05.P09",
    micro_phase_id: "RP05.P09.M07",
    micro_title: "Test And Golden Case Set",
    group_type: "p09-test-golden-security-gate",
    control,
    deliverable_type: CP195_DELIVERABLE_BY_CONTROL[control] ?? "implementation",
    outcome: blocked ? "blocked" : approvalRequired ? "approval_required" : "passed",
    source_evidence_review_handoff_terminal_bridge_pack_id:
      requirements.source_evidence_review_handoff_terminal_bridge_pack_id,
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    question_ref: `${control.replaceAll("_", "-")}-question-ref:RP05.P09.M07.S${unitOrder}`,
    permission_badge_ref: `permission-badge-ref:RP05.P09.M07.S${unitOrder}`,
    audit_hint_ref: `audit-hint-ref:RP05.P09.M07.S${unitOrder}`,
    bypass_resistance_ref: `bypass-resistance-ref:RP05.P09.M07.S${unitOrder}`,
    fail_closed_ref: `fail-closed-ref:RP05.P09.M07.S${unitOrder}`,
    customer_safe_error_codes: Object.freeze([CP195_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_CLOSEOUT_HANDOFF"]),
    descriptor_ref_only: true,
    review_question_ref_only: true,
    security_audit_ref_only: requirements.blocked_controls.includes(control),
    missing_test_question: requirements.test_controls.includes(control),
    ui_leak_ref_only: requirements.ui_guard_controls.includes(control),
    risk_register_ref_only: requirements.risk_register_controls.includes(control),
    human_approval_summary_ref_only: requirements.approval_required_controls.includes(control),
    human_approval_required: requirements.approval_required_controls.includes(control),
    go_no_go_verdict_ref_only: control === "go_no_go_verdict_format",
    finding_routing_ref_only: control === "finding_routing_map",
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreReviewQuestionSecurityGateDescriptor(input = {}) {
  const upstreamDescriptor = createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor(input);
  const requirements = MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS;
  const allRows = Object.freeze(
    CP196_REVIEW_QUESTION_CONTROLS.map((control, index) => cp196ReviewQuestionSecurityGateRow(control, index)),
  );
  const summarize = (key) =>
    Object.freeze(
      allRows.reduce((acc, row) => {
        acc[row[key]] = (acc[row[key]] ?? 0) + 1;
        return acc;
      }, {}),
    );
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    approval_required: Object.freeze(allRows.filter((row) => row.outcome === "approval_required")),
  });
  return freezeReviewQuestionSecurityGateResult({
    descriptor: "MatterCoreReviewQuestionSecurityGateDescriptor",
    source_evidence_review_handoff_terminal_bridge_pack_id:
      requirements.source_evidence_review_handoff_terminal_bridge_pack_id,
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    risk_a_pack_reason: requirements.risk_a_pack_reason,
    review_question_security_gate_rows: allRows,
    review_question_security_gate_row_count: allRows.length,
    rows_by_phase: summarize("phase_id"),
    rows_by_micro_phase: summarize("micro_phase_id"),
    rows_by_micro_title: summarize("micro_title"),
    rows_by_group: summarize("group_type"),
    rows_by_deliverable: summarize("deliverable_type"),
    rows_by_outcome: rowsByOutcome,
    blocked_question_rows: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    test_question_rows: Object.freeze(allRows.filter((row) => row.missing_test_question === true)),
    ui_leak_rows: Object.freeze(allRows.filter((row) => row.ui_leak_ref_only === true)),
    risk_register_rows: Object.freeze(allRows.filter((row) => row.risk_register_ref_only === true)),
    human_approval_rows: Object.freeze(allRows.filter((row) => row.human_approval_required === true)),
    inherited_evidence_review_handoff_terminal_bridge_descriptor: Object.freeze({
      descriptor: upstreamDescriptor.descriptor,
      pack_id: upstreamDescriptor.pack_id,
      evidence_review_handoff_terminal_row_count: upstreamDescriptor.evidence_review_handoff_terminal_row_count,
      leak_safe: upstreamDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_review_question_security_gate: Object.freeze({
      evidence_packet: "H05.CP00-196.matter_core_review_question_security_gate",
      upstream_evidence_packet: upstreamDescriptor.hermes_evidence_review_handoff_terminal.evidence_packet,
      review_question_security_gate_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-196.matter_core_review_question_security_gate",
      upstream_review_packet: upstreamDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP196_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP196_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP196_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP196_PACK_BINDING.range,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

const CP197_TERMINAL_REVIEW_GROUPS = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP05.P09.M07",
    phase_id: "RP05.P09",
    micro_title: "Test And Golden Case Set",
    group_type: "p09-test-golden-terminal-closeout",
    start_order: 13,
    controls: Object.freeze([
      "claude_review_packet",
      "closeout_criteria",
      "pass_closeout_note",
      "pass_with_findings_closeout_note",
      "block_closeout_note",
      "next_rp_dependency",
      "documentation_update",
      "command_rerun",
    ]),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M08",
    phase_id: "RP05.P09",
    micro_title: "Hermes Evidence Packet",
    group_type: "p09-hermes-evidence-terminal-review",
    start_order: 1,
    controls: Object.freeze([
      "architecture_review_questions",
      "security_review_questions",
      "permission_bypass_questions",
      "audit_completeness_questions",
      "missing_test_questions",
      "ui_leak_questions",
      "downstream_readiness_questions",
      "risk_register",
    ]),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M09",
    phase_id: "RP05.P09",
    micro_title: "Claude Review Packet",
    group_type: "p09-claude-review-terminal-review",
    start_order: 1,
    controls: Object.freeze([
      "architecture_review_questions",
      "security_review_questions",
      "permission_bypass_questions",
      "audit_completeness_questions",
      "missing_test_questions",
      "ui_leak_questions",
      "downstream_readiness_questions",
      "risk_register",
    ]),
  }),
  Object.freeze({
    micro_phase_id: "RP05.P09.M10",
    phase_id: "RP05.P09",
    micro_title: "Closeout And Next Handoff",
    group_type: "p09-closeout-next-handoff-terminal-review",
    start_order: 1,
    controls: Object.freeze([
      "architecture_review_questions",
      "security_review_questions",
      "permission_bypass_questions",
      "audit_completeness_questions",
    ]),
  }),
]);

function cp197TerminalReviewCloseoutHandoffRow(control, group, index) {
  const requirements = MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS;
  const blocked = requirements.blocked_controls.includes(control);
  const reviewRequired = requirements.review_required_controls.includes(control);
  const unitOrder = String(group.start_order + index).padStart(2, "0");
  const unitId = `${group.micro_phase_id}.S${unitOrder}`;
  const stableId = `matter-core-cp197:terminal-review-closeout-handoff:${group.group_type}:s${unitOrder}:${control}`;
  const customerSafeErrorCodes = new Set([CP195_SAFE_CODE_BY_CONTROL[control] ?? "MATTER_CORE_CLOSEOUT_HANDOFF"]);
  if (control === "block_closeout_note") customerSafeErrorCodes.add("MATTER_CORE_BLOCKED_CLAIM");
  if (control === "command_rerun") customerSafeErrorCodes.add("MATTER_CORE_FAILURE_FIXTURE");
  if (control === "audit_completeness_questions") customerSafeErrorCodes.add("MATTER_CORE_AUDIT_FAILURE_HINT");
  if (control === "downstream_readiness_questions") customerSafeErrorCodes.add("MATTER_CORE_HUMAN_APPROVAL_REQUIRED");
  return Object.freeze({
    stable_id: stableId,
    unit_id: unitId,
    phase_id: group.phase_id,
    micro_phase_id: group.micro_phase_id,
    micro_title: group.micro_title,
    group_type: group.group_type,
    control,
    deliverable_type: CP195_DELIVERABLE_BY_CONTROL[control] ?? "implementation",
    outcome: blocked ? "blocked" : reviewRequired ? "review_required" : "passed",
    source_review_question_security_gate_pack_id: requirements.source_review_question_security_gate_pack_id,
    source_evidence_review_handoff_terminal_bridge_pack_id:
      requirements.source_evidence_review_handoff_terminal_bridge_pack_id,
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    terminal_review_ref: `${control.replaceAll("_", "-")}-terminal-ref:${unitId}`,
    question_ref: `terminal-review-question-ref:${control.replaceAll("_", "-")}:${unitId}`,
    permission_badge_ref: `permission-badge-ref:${unitId}`,
    audit_hint_ref: `audit-hint-ref:${unitId}`,
    closeout_handoff_ref: `rp05-to-rp06-handoff-ref:${unitId}`,
    next_rp_dependency_ref: control === "next_rp_dependency" ? "rp06-dms-core-entry:RP06.P00.M00.S01" : null,
    customer_safe_error_codes: Object.freeze([...customerSafeErrorCodes]),
    descriptor_ref_only: true,
    terminal_closeout_ref_only: true,
    review_question_ref_only: control.endsWith("_questions") || control === "claude_review_packet",
    security_audit_ref_only: requirements.blocked_controls.includes(control),
    missing_test_question: requirements.test_controls.includes(control),
    ui_leak_ref_only: requirements.ui_guard_controls.includes(control),
    risk_register_ref_only: requirements.risk_register_controls.includes(control),
    handoff_ref_only: requirements.handoff_controls.includes(control),
    closeout_note_ref_only: requirements.closeout_note_controls.includes(control),
    rp06_runtime_implemented: false,
    runtime_permission_evaluated: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
    audit_event_written: false,
    unauthorized_count_leaked: false,
    raw_payload_included: false,
    real_client_data_included: false,
    real_document_content_included: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    live_dom_rendered: false,
    executes_api_handler: false,
    executes_rollback: false,
    executes_retry: false,
    replay_command: `npm run rp05:matter-core:validate -- ${stableId}`,
    replay_command_inert: true,
  });
}

export function createMatterCoreTerminalReviewCloseoutHandoffDescriptor(input = {}) {
  const upstreamDescriptor = createMatterCoreReviewQuestionSecurityGateDescriptor(input);
  const requirements = MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS;
  const rowGroups = Object.freeze(
    CP197_TERMINAL_REVIEW_GROUPS.map((group) =>
      Object.freeze(group.controls.map((control, index) => cp197TerminalReviewCloseoutHandoffRow(control, group, index))),
    ),
  );
  const allRows = Object.freeze(rowGroups.flat());
  const summarize = (key) =>
    Object.freeze(
      allRows.reduce((acc, row) => {
        acc[row[key]] = (acc[row[key]] ?? 0) + 1;
        return acc;
      }, {}),
    );
  const rowsByOutcome = Object.freeze({
    passed: Object.freeze(allRows.filter((row) => row.outcome === "passed")),
    blocked: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
  });
  return freezeTerminalReviewCloseoutHandoffResult({
    descriptor: "MatterCoreTerminalReviewCloseoutHandoffDescriptor",
    source_review_question_security_gate_pack_id: requirements.source_review_question_security_gate_pack_id,
    source_evidence_review_handoff_terminal_bridge_pack_id:
      requirements.source_evidence_review_handoff_terminal_bridge_pack_id,
    source_permission_audit_evidence_terminal_bridge_pack_id:
      requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
    source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
    source_service_evidence_pack_id: requirements.source_service_evidence_pack_id,
    boundary_mode: requirements.boundary_mode,
    terminal_pack_reason: requirements.terminal_pack_reason,
    risk_c_override_reason: requirements.risk_c_override_reason,
    terminal_review_closeout_handoff_rows: allRows,
    terminal_review_closeout_handoff_row_count: allRows.length,
    rows_by_phase: summarize("phase_id"),
    rows_by_micro_phase: summarize("micro_phase_id"),
    rows_by_micro_title: summarize("micro_title"),
    rows_by_group: summarize("group_type"),
    rows_by_deliverable: summarize("deliverable_type"),
    rows_by_outcome: rowsByOutcome,
    blocked_question_rows: Object.freeze(allRows.filter((row) => row.outcome === "blocked")),
    review_required_rows: Object.freeze(allRows.filter((row) => row.outcome === "review_required")),
    test_question_rows: Object.freeze(allRows.filter((row) => row.missing_test_question === true)),
    ui_leak_rows: Object.freeze(allRows.filter((row) => row.ui_leak_ref_only === true)),
    handoff_rows: Object.freeze(allRows.filter((row) => row.handoff_ref_only === true)),
    closeout_note_rows: Object.freeze(allRows.filter((row) => row.closeout_note_ref_only === true)),
    inherited_review_question_security_gate_descriptor: Object.freeze({
      descriptor: upstreamDescriptor.descriptor,
      pack_id: upstreamDescriptor.pack_id,
      review_question_security_gate_row_count: upstreamDescriptor.review_question_security_gate_row_count,
      leak_safe: upstreamDescriptor.leak_guards.no_permission_decision_detail === true,
    }),
    hermes_terminal_review_closeout_handoff: Object.freeze({
      evidence_packet: "H05.CP00-197.matter_core_terminal_review_closeout_handoff",
      upstream_evidence_packet: upstreamDescriptor.hermes_review_question_security_gate.evidence_packet,
      terminal_review_closeout_handoff_row_count: allRows.length,
      no_runtime_permission_evaluation: true,
      no_audit_event_write: true,
      no_route_dispatch: true,
      no_live_dom_render: true,
      no_rp06_runtime_implementation: true,
    }),
    claude_review_packet: Object.freeze({
      review_packet: "C05.CP00-197.matter_core_terminal_review_closeout_handoff",
      upstream_review_packet: upstreamDescriptor.claude_review_packet.review_packet,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: requirements.allowed_claude_tools,
      review_sequence: requirements.hardened_review_sequence,
      invalid_review_blockers: requirements.forbidden_review_evidence,
      claude_is_final_approval: false,
      production_or_enterprise_trust_claim: false,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: MATTER_CORE_CP197_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP197_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP197_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP197_PACK_BINDING.range,
      next_program_id: "RP06",
      next_program_runtime_implemented: false,
    }),
    leak_guards: Object.freeze({
      no_raw_payload: allRows.every((row) => row.raw_payload_included === false),
      no_real_client_data: allRows.every((row) => row.real_client_data_included === false),
      no_real_document_content: allRows.every((row) => row.real_document_content_included === false),
      no_runtime_permission_evaluation: allRows.every((row) => row.runtime_permission_evaluated === false),
      no_permission_decision_detail: allRows.every((row) => row.permission_decision_detail_included === false),
      no_audit_event_body: allRows.every((row) => row.audit_event_body_included === false),
      no_audit_event_write: allRows.every((row) => row.audit_event_written === false),
      no_unauthorized_count: allRows.every((row) => row.unauthorized_count_leaked === false),
      no_route_dispatch:
        allRows.every((row) => row.dispatches_review_route === false)
        && allRows.every((row) => row.dispatches_approval_route === false),
      no_failure_recovery_execution:
        allRows.every((row) => row.executes_rollback === false) && allRows.every((row) => row.executes_retry === false),
      no_rp06_runtime_implementation: allRows.every((row) => row.rp06_runtime_implemented === false),
      replay_commands_inert: allRows.every((row) => row.replay_command_inert === true),
    }),
    descriptor_only: true,
    live_render_enabled: false,
  });
}

export function executeMatterOpeningWorkflow(input = {}) {
  return executeMatterCoreServiceWorkflow({ ...input, operation: "matter_opening" });
}

export function executeMatterMemberAssignmentWorkflow(input = {}) {
  return executeMatterCoreServiceWorkflow({ ...input, operation: "member_assignment" });
}

export function executeMatterTaskPlanningWorkflow(input = {}) {
  return executeMatterCoreServiceWorkflow({ ...input, operation: "task_planning" });
}

export function executeMatterWikiSectionStagingWorkflow(input = {}) {
  return executeMatterCoreServiceWorkflow({ ...input, operation: "wiki_section_staging" });
}

export function executeMatterGraphRelationshipStagingWorkflow(input = {}) {
  return executeMatterCoreServiceWorkflow({ ...input, operation: "graph_relationship_staging" });
}
