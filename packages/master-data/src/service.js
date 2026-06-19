import { createMasterDataRecord } from "./model.js";
import {
  MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP157_PACK_BINDING,
  MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP158_PACK_BINDING,
  MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP159_PACK_BINDING,
  MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS,
  MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP160_PACK_BINDING,
  MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP161_PACK_BINDING,
  MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP162_PACK_BINDING,
  MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP163_PACK_BINDING,
  MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP164_PACK_BINDING,
  MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP165_PACK_BINDING,
  MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP166_PACK_BINDING,
  MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP167_PACK_BINDING,
  MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP168_PACK_BINDING,
  MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP169_PACK_BINDING,
  MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP170_PACK_BINDING,
  MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP171_PACK_BINDING,
  MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP172_PACK_BINDING,
  MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP173_PACK_BINDING,
  MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP174_PACK_BINDING,
  MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP175_PACK_BINDING,
  MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP176_PACK_BINDING,
  MASTER_DATA_API_REFERENCE_SURFACE,
  MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE,
  MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION,
  MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY,
  MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW,
  MASTER_DATA_PERMISSION_AUDIT_BINDING,
  MASTER_DATA_SERVICE_BOUNDARY,
  MASTER_DATA_SERVICE_OPERATIONS,
  MASTER_DATA_SERVICE_TAIL_BOUNDARY,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG,
  MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS,
  MASTER_DATA_UI_INTERACTION_WORKFLOW,
  MASTER_DATA_UI_SURFACE_STATES,
} from "./registry.js";
import { validateMasterDataRecord } from "./validators.js";

function freezeServiceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP157_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
  });
}

function freezeTailResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP158_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
  });
}

function freezeEvidenceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP159_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
  });
}

function freezeApiReferenceResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP160_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
  });
}

function freezeUiInteractionResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP161_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditBindingResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP162_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
  });
}

function freezeSyntheticFixtureEntryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP163_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
  });
}

function freezeSyntheticFixtureSetResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP164_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionMatrixWorkflowResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP165_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditDecisionBindingResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP166_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditControlInteractionsResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP167_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditFixtureDecisionTestsResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP168_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditWorkflowFailureTaxonomyResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP169_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureTaxonomyEdgeCaseEscalationResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP170_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureTaxonomySensitiveEntryBoundaryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP171_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureTaxonomyOperationalEdgeBoundaryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP172_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
  });
}

function freezeFailureEvidenceReviewHandoffBridgeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP173_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
  });
}

function freezePermissionAuditSensitiveTailBoundaryResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP174_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
  });
}

function freezeEvidenceReviewUiReadinessBridgeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP175_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
  });
}

function freezeTerminalReviewCloseoutReadinessResult(result) {
  return Object.freeze({
    ...result,
    pack_id: MASTER_DATA_CP176_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_api_handler: false,
    issues_network_request: false,
    renders_ui: false,
    mutates_dom: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    dispatches_review_route: false,
    dispatches_approval_route: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    executes_rollback: false,
    executes_retry: false,
    acquires_runtime_lock: false,
    writes_case_note: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
  });
}

function unique(values) {
  return Object.freeze([...new Set(values.filter(Boolean))]);
}

function valueFrom(request, key) {
  return request?.[key] ?? request?.context?.[key] ?? request?.payload?.[key] ?? null;
}

function operationFor(request) {
  return request?.operation ?? request?.workflow ?? "entity_creation";
}

function serviceOperationDefinition(operation) {
  return MASTER_DATA_SERVICE_OPERATIONS[operation] ?? null;
}

function defaultModelTypeFor(operation, request) {
  return request?.model_type ?? request?.payload?.model_type ?? serviceOperationDefinition(operation)?.default_model_type ?? null;
}

function idempotencyKeyFor(request, operation, tenantId) {
  return (
    request?.idempotency_key ??
    request?.context?.idempotency_key ??
    request?.payload?.idempotency_key ??
    (tenantId && request?.request_id ? `${tenantId}:${operation}:${request.request_id}` : null)
  );
}

function lockKeyFor(operation, tenantId, idempotencyKey) {
  if (!tenantId || !idempotencyKey) return null;
  return `master-data:${tenantId}:${operation}:${idempotencyKey}`;
}

function safeErrorCodesFor(claims) {
  return Object.freeze(
    claims.map((claim) => ({
      claim,
      safe_error_code: MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping[claim] ?? "MASTER_DATA_VALIDATION_ERROR",
    })),
  );
}

function sanitizeTailValue(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => sanitizeTailValue(entry)));
  if (value && typeof value === "object") {
    const sanitized = {};
    for (const [key, entry] of Object.entries(value)) {
      if (MASTER_DATA_SERVICE_TAIL_BOUNDARY.hidden_output_fields.includes(key)) continue;
      sanitized[key] = sanitizeTailValue(entry);
    }
    return Object.freeze(sanitized);
  }
  return value;
}

function hiddenFieldProbePayload() {
  return Object.freeze(
    Object.fromEntries(MASTER_DATA_SERVICE_TAIL_BOUNDARY.hidden_output_fields.map((field) => [field, `cp159_hidden_value_${field}`])),
  );
}

function hiddenFieldProbeValues() {
  return Object.freeze(MASTER_DATA_SERVICE_TAIL_BOUNDARY.hidden_output_fields.map((field) => `cp159_hidden_value_${field}`));
}

function sanitizeApiItem(item) {
  const sanitized = {};
  for (const [key, value] of Object.entries(item ?? {})) {
    if (MASTER_DATA_SERVICE_TAIL_BOUNDARY.hidden_output_fields.includes(key)) continue;
    if (key === "internal_blocked_claim_refs") continue;
    sanitized[key] = value;
  }
  return Object.freeze(sanitized);
}

function pageInfoFor(request) {
  const limit = Math.max(1, Math.min(Number(request.limit ?? 25), 100));
  return Object.freeze({
    limit,
    cursor: request.cursor ?? null,
    next_cursor: null,
    has_more: false,
    pagination_contract: "cursor_limit_filter_contract",
  });
}

function routeFor(workflow) {
  if (workflow.outcome === "review_required") {
    return Object.freeze({
      route_type: "review_required",
      route_refs: Object.freeze(
        (workflow.review_required_claims ?? []).map(
          (claim) => MASTER_DATA_SERVICE_TAIL_BOUNDARY.review_required_routing[claim] ?? "route_to_master_data_review_queue",
        ),
      ),
      dispatches_route: false,
    });
  }
  if (workflow.outcome === "approval_required") {
    return Object.freeze({
      route_type: "approval_required",
      route_refs: Object.freeze(
        (workflow.approval_required_claims ?? []).map(
          (claim) => MASTER_DATA_SERVICE_TAIL_BOUNDARY.approval_required_routing[claim] ?? "route_to_master_data_approval_queue",
        ),
      ),
      dispatches_route: false,
    });
  }
  if (workflow.outcome === "blocked") {
    return Object.freeze({
      route_type: "blocked",
      route_refs: Object.freeze(["return_customer_safe_blocked_claim_output"]),
      dispatches_route: false,
    });
  }
  return Object.freeze({
    route_type: "passed",
    route_refs: Object.freeze(["return_descriptor_preview_without_persistence"]),
    dispatches_route: false,
  });
}

// CP00-157 service helpers are descriptor builders. They do not apply effects,
// acquire locks, evaluate permissions, append audit events, or persist records.
export function normalizeMasterDataServiceRequest(request = {}) {
  const operation = operationFor(request);
  const tenant_id = valueFrom(request, "tenant_id");
  const matter_id = valueFrom(request, "matter_id");
  const request_id = request.request_id ?? request.context?.request_id ?? `synthetic_${operation}_request`;
  const actor_user_id = request.actor_user_id ?? request.context?.actor_user_id ?? request.payload?.owner_user_id ?? null;
  const idempotency_key = idempotencyKeyFor(request, operation, tenant_id);
  return freezeServiceResult({
    normalized: true,
    service_entrypoint: MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint,
    request_id,
    tenant_id,
    actor_user_id,
    operation,
    model_type: defaultModelTypeFor(operation, request),
    payload: Object.freeze({ ...(request.payload ?? {}) }),
    matter_id,
    touches_matter_or_document: request.touches_matter_or_document ?? request.context?.touches_matter_or_document ?? false,
    expected_tenant_id: request.expected_tenant_id ?? request.context?.expected_tenant_id ?? tenant_id,
    permission_ref: request.permission_ref ?? request.context?.permission_ref ?? request.payload?.permission_ref ?? null,
    audit_hint_ref: request.audit_hint_ref ?? request.context?.audit_hint_ref ?? request.payload?.audit_hint_ref ?? null,
    known_identity_keys: Object.freeze([...(request.known_identity_keys ?? request.context?.known_identity_keys ?? [])]),
    member_tenant_ids: Object.freeze([...(request.member_tenant_ids ?? request.context?.member_tenant_ids ?? [])]),
    idempotency_key,
    lock_key: lockKeyFor(operation, tenant_id, idempotency_key),
    lock_rule: MASTER_DATA_SERVICE_BOUNDARY.lock_acquisition_rule,
    persistence_boundary: MASTER_DATA_SERVICE_BOUNDARY.persistence_boundary,
  });
}

export function executeMasterDataServicePrechecks(request = {}) {
  const normalized = request.normalized ? request : normalizeMasterDataServiceRequest(request);
  const blockedClaims = [];
  const reviewRequiredClaims = [];
  const approvalRequiredClaims = [];
  const errors = [];
  const checked = [];
  const operationDefinition = serviceOperationDefinition(normalized.operation);

  if (!operationDefinition) {
    errors.push(`Unsupported Master Data service operation ${normalized.operation}`);
    blockedClaims.push("unsupported_service_operation");
  }
  checked.push("tenant_boundary_precheck");
  if (!normalized.tenant_id) {
    errors.push("Master Data service request requires tenant_id");
    blockedClaims.push("tenant_scope_missing");
  }
  if (normalized.expected_tenant_id && normalized.tenant_id && normalized.expected_tenant_id !== normalized.tenant_id) {
    errors.push(`Master Data service request tenant_id must match expected tenant ${normalized.expected_tenant_id}`);
    blockedClaims.push("tenant_boundary_mismatch");
  }
  if (normalized.payload?.tenant_id && normalized.tenant_id && normalized.payload.tenant_id !== normalized.tenant_id) {
    errors.push("Master Data service payload tenant_id must match request tenant_id");
    blockedClaims.push("tenant_boundary_mismatch");
  }
  checked.push("matter_trace_precheck");
  if (normalized.touches_matter_or_document === true && !normalized.matter_id && !normalized.payload?.matter_id) {
    errors.push("Master Data service requires matter trace when workflow touches Matter or document context");
    blockedClaims.push("missing_matter_trace");
  }
  checked.push("permission_precheck");
  if (!normalized.permission_ref) {
    errors.push("Master Data service requires permission_ref descriptor before execution");
    blockedClaims.push("permission_precheck_required");
  }
  checked.push("audit_hint_precheck");
  if (!normalized.audit_hint_ref) {
    errors.push("Master Data service requires audit_hint_ref descriptor before execution");
    blockedClaims.push("audit_hint_precheck_required");
  }
  checked.push("idempotency_key_handling");
  if (!normalized.idempotency_key) {
    errors.push("Master Data service requires idempotency_key descriptor");
    blockedClaims.push("idempotency_key_required");
  }

  if (operationDefinition && normalized.model_type && normalized.payload) {
    const recordValidation = validateMasterDataRecord(normalized.model_type, normalized.payload, {
      expected_tenant_id: normalized.tenant_id,
      touches_matter_or_document: normalized.touches_matter_or_document,
      known_identity_keys: normalized.known_identity_keys,
      member_tenant_ids: normalized.member_tenant_ids,
    });
    errors.push(...recordValidation.errors);
    blockedClaims.push(...recordValidation.blocked_claims);
    reviewRequiredClaims.push(...recordValidation.review_required_claims);
    checked.push("state_transition_enforcement");
  }
  if (normalized.payload?.requires_approval === true) approvalRequiredClaims.push("master_data_approval_required");

  const blocked_claims = unique(blockedClaims);
  const review_required_claims = unique(reviewRequiredClaims);
  const approval_required_claims = unique(approvalRequiredClaims);
  const outcome =
    blocked_claims.length > 0
      ? "blocked"
      : approval_required_claims.length > 0
        ? "approval_required"
        : review_required_claims.length > 0
          ? "review_required"
          : "passed";

  return freezeServiceResult({
    valid: outcome !== "blocked",
    outcome,
    checked: unique(checked),
    declared_prechecks: Object.freeze(MASTER_DATA_SERVICE_BOUNDARY.prechecks),
    errors: Object.freeze(errors),
    blocked_claims,
    review_required_claims,
    approval_required_claims,
    normalized_request: normalized,
  });
}

export function executeMasterDataServiceWorkflow(request = {}) {
  const normalized = normalizeMasterDataServiceRequest(request);
  const precheck = executeMasterDataServicePrechecks(normalized);
  const operationDefinition = serviceOperationDefinition(normalized.operation);
  let actionPreview = null;
  const factoryErrors = [];

  if (precheck.outcome !== "blocked" && operationDefinition?.primary_path === "createMasterDataRecord") {
    try {
      actionPreview = createMasterDataRecord(normalized.model_type, {
        ...normalized.payload,
        tenant_id: normalized.payload.tenant_id ?? normalized.tenant_id,
        matter_id: normalized.payload.matter_id ?? normalized.matter_id,
        permission_ref: normalized.payload.permission_ref ?? normalized.permission_ref,
        audit_hint_ref: normalized.payload.audit_hint_ref ?? normalized.audit_hint_ref,
      });
    } catch (error) {
      factoryErrors.push(error.message);
    }
  }

  const blockedClaims = [...precheck.blocked_claims];
  if (factoryErrors.length > 0) blockedClaims.push("service_factory_descriptor_error");
  const outcome = blockedClaims.length > 0 ? "blocked" : precheck.outcome;

  return freezeServiceResult({
    workflow_descriptor: operationDefinition?.result_descriptor ?? "master_data_unknown_service_descriptor",
    service_entrypoint: MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint,
    operation: normalized.operation,
    model_type: normalized.model_type,
    request_id: normalized.request_id,
    outcome,
    normalized_request: normalized,
    precheck,
    action_preview: actionPreview,
    errors: Object.freeze([...precheck.errors, ...factoryErrors]),
    blocked_claims: unique(blockedClaims),
    review_required_claims: precheck.review_required_claims,
    approval_required_claims: precheck.approval_required_claims,
    idempotency_key: normalized.idempotency_key,
    lock_key: normalized.lock_key,
    rollback_behavior: MASTER_DATA_SERVICE_BOUNDARY.rollback_behavior,
    retry_behavior: MASTER_DATA_SERVICE_BOUNDARY.retry_behavior,
  });
}

export function executeMasterDataEntityCreationWorkflow(request = {}) {
  return executeMasterDataServiceWorkflow({ ...request, operation: "entity_creation", model_type: request.model_type ?? "Entity" });
}

export function executeMasterDataClientGroupingWorkflow(request = {}) {
  return executeMasterDataServiceWorkflow({ ...request, operation: "client_grouping", model_type: "ClientGroup" });
}

export function executeMasterDataRelationshipMappingWorkflow(request = {}) {
  return executeMasterDataServiceWorkflow({ ...request, operation: "relationship_mapping", model_type: "Relationship" });
}

export function executeMasterDataContactNormalizationWorkflow(request = {}) {
  return executeMasterDataServiceWorkflow({ ...request, operation: "contact_normalization", model_type: "ContactPoint" });
}

export function executeMasterDataDuplicateReviewWorkflow(request = {}) {
  return executeMasterDataServiceWorkflow({ ...request, operation: "duplicate_review", model_type: request.model_type ?? "Entity" });
}

export function createMasterDataServiceTailDescriptor(request = {}) {
  const workflow = request.workflow_descriptor ? request : executeMasterDataServiceWorkflow(request);
  const sanitizedWorkflow = sanitizeTailValue(workflow);
  const blockedClaims = [...(workflow.blocked_claims ?? [])];
  const safeErrors = safeErrorCodesFor(blockedClaims);
  const exposedBlockedOutput = Object.freeze({
    outcome: workflow.outcome,
    safe_error_codes: Object.freeze(safeErrors.map((entry) => entry.safe_error_code)),
    exposes_sensitive_values: false,
    hidden_output_fields: MASTER_DATA_SERVICE_TAIL_BOUNDARY.hidden_output_fields,
  });
  return freezeTailResult({
    tail_descriptor: "master_data_service_tail_boundary_descriptor",
    source_workflow_descriptor: workflow.workflow_descriptor,
    source_pack_id: workflow.pack_id,
    operation: workflow.operation,
    model_type: workflow.model_type,
    request_id: workflow.request_id,
    outcome: workflow.outcome,
    idempotency_key: workflow.idempotency_key,
    lock: Object.freeze({
      lock_key: workflow.lock_key,
      lock_rule: MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_acquisition_rule,
      lock_status: MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_status,
      acquired: false,
    }),
    persistence: Object.freeze({
      boundary: MASTER_DATA_SERVICE_TAIL_BOUNDARY.persistence_boundary,
      creates_database_rows: false,
      updates_database_rows: false,
      deletes_database_rows: false,
      writes_product_state: false,
    }),
    validation_error_mapping: safeErrors,
    route: routeFor(workflow),
    internal_blocked_claim_refs: Object.freeze(blockedClaims),
    blocked_output: exposedBlockedOutput,
    rollback: Object.freeze({
      behavior: MASTER_DATA_SERVICE_TAIL_BOUNDARY.rollback_behavior,
      executed: false,
      reason: "descriptor_only_no_mutation",
    }),
    retry: Object.freeze({
      behavior: MASTER_DATA_SERVICE_TAIL_BOUNDARY.retry_behavior,
      executed: false,
      stable_replay_key: workflow.idempotency_key,
    }),
    workflow: sanitizedWorkflow,
  });
}

export function createMasterDataServiceReviewPathCase(request = {}) {
  const reviewTail = createMasterDataServiceTailDescriptor({
    request_id: request.request_id ?? "req_cp159_review_path",
    tenant_id: request.tenant_id ?? "tenant_rp04",
    actor_user_id: request.actor_user_id ?? "user_owner",
    operation: "duplicate_review",
    permission_ref: request.permission_ref ?? "permission_ref_cp159",
    audit_hint_ref: request.audit_hint_ref ?? "audit_hint_cp159",
    known_identity_keys: request.known_identity_keys ?? ["tenant_rp04:organization:duplicate"],
    payload: {
      entity_id: "entity_cp159_review_path",
      tenant_id: request.tenant_id ?? "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP159 Duplicate Review",
      status: "active",
      owner_user_id: "user_owner",
      identity_key: "tenant_rp04:organization:duplicate",
      ...(request.payload ?? {}),
    },
  });

  return freezeEvidenceResult({
    case_id: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.review_path_case_id,
    evidence_role: "unit_test_review_path",
    outcome: reviewTail.outcome,
    route_type: reviewTail.route.route_type,
    route_refs: reviewTail.route.route_refs,
    dispatches_route: reviewTail.route.dispatches_route,
    tail_pack_id: reviewTail.pack_id,
    hidden_output_sanitized: !JSON.stringify(reviewTail).includes("must not leak"),
    review_tail: reviewTail,
  });
}

export function createMasterDataServiceIntegrationSmokeCase() {
  const happy = createMasterDataServiceTailDescriptor({
    request_id: "req_cp159_smoke_happy",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp159",
    audit_hint_ref: "audit_hint_cp159",
    payload: {
      entity_id: "entity_cp159_smoke_happy",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP159 Smoke Happy",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  const review = createMasterDataServiceReviewPathCase().review_tail;
  const approval = createMasterDataServiceTailDescriptor({
    request_id: "req_cp159_smoke_approval",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp159",
    audit_hint_ref: "audit_hint_cp159",
    payload: {
      entity_id: "entity_cp159_smoke_approval",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP159 Smoke Approval",
      status: "active",
      owner_user_id: "user_owner",
      requires_approval: true,
    },
  });
  const blocked = createMasterDataServiceTailDescriptor({
    request_id: "req_cp159_smoke_blocked",
    tenant_id: "tenant_rp04",
    expected_tenant_id: "tenant_expected",
    actor_user_id: "user_owner",
    operation: "relationship_mapping",
    model_type: "Relationship",
    permission_ref: "permission_ref_cp159",
    audit_hint_ref: "audit_hint_cp159",
    payload: {
      relationship_id: "relationship_cp159_blocked",
      tenant_id: "tenant_other",
      from_entity_id: "entity_same",
      to_entity_id: "entity_same",
      relationship_type: "self",
      direction: "person_to_person",
      status: "active",
      owner_user_id: "user_owner",
      ...hiddenFieldProbePayload(),
    },
  });
  const cases = Object.freeze({ happy, review, approval, blocked });
  const outcomes = Object.freeze(Object.fromEntries(Object.entries(cases).map(([key, tail]) => [key, tail.outcome])));
  const allCases = Object.values(cases);

  return freezeEvidenceResult({
    case_id: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.integration_smoke_case_id,
    evidence_role: "integration_smoke_case",
    required_tail_outcomes: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes,
    outcomes,
    outcome_count: new Set(Object.values(outcomes)).size,
    all_no_write: allCases.every((tail) => tail.writes_product_state === false && tail.persistence?.writes_product_state === false),
    all_routes_descriptor_only: allCases.every((tail) => tail.route?.dispatches_route === false),
    all_hidden_fields_sanitized: allCases.every((tail) => hiddenFieldProbeValues().every((value) => !JSON.stringify(tail).includes(value))),
    hidden_source_probe_values: hiddenFieldProbeValues(),
    safe_blocked_output_codes: blocked.blocked_output.safe_error_codes,
    cases,
  });
}

export function createMasterDataApiReferenceFixture(request = {}) {
  const scenario = request.scenario ?? "happy_search";
  const requestId = request.request_id ?? `req_cp160_${scenario}`;
  const baseRequest = Object.freeze({
    tenant_id: request.tenant_id ?? null,
    actor_user_id: request.actor_user_id ?? "user_owner",
    permission_ref: request.permission_ref ?? null,
    audit_hint_ref: request.audit_hint_ref ?? null,
    request_id: requestId,
    model_type: request.model_type ?? "Entity",
    cursor: request.cursor ?? null,
    limit: request.limit ?? 25,
    filters: Object.freeze({ ...(request.filters ?? {}) }),
  });
  const errors = [];
  if (!baseRequest.tenant_id) errors.push("tenant_required");
  if (!baseRequest.permission_ref) errors.push("permission_required");
  if (!baseRequest.audit_hint_ref) errors.push("audit_hint_required");
  if (baseRequest.filters?.unsupported_filter) errors.push("unsupported_filter");
  if (scenario === "denied_response") errors.push("unauthorized_omission");

  const outcome = errors.length > 0 ? "blocked" : "passed";
  const item = sanitizeApiItem({
    entity_id: "entity_cp160_reference",
    tenant_id: baseRequest.tenant_id,
    entity_kind: "organization",
    display_name: "CP160 Reference Entity",
    status: "active",
    owner_user_id: "user_owner",
    secret: "cp160_hidden_value_secret",
    internal_blocked_claim_refs: ["permission_precheck_required"],
  });
  const safeErrorCodes = Object.freeze(errors.map((error) => MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy[error] ?? "MASTER_DATA_API_VALIDATION_ERROR"));

  return freezeApiReferenceResult({
    fixture_id: `cp160_api_fixture_${scenario}`,
    api_surface_id: MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id,
    endpoint: scenario === "denied_response" ? MASTER_DATA_API_REFERENCE_SURFACE.endpoints.relationship_lookup : MASTER_DATA_API_REFERENCE_SURFACE.endpoints.records_search,
    request_contract: "MasterDataApiReferenceRequest",
    response_contract: "MasterDataApiReferenceResponse",
    request: baseRequest,
    response: Object.freeze({
      request_id: requestId,
      outcome,
      items: outcome === "passed" ? Object.freeze([item]) : Object.freeze([]),
      page_info: pageInfoFor(baseRequest),
      safe_error_codes: safeErrorCodes,
      omitted_fields: scenario === "denied_response" ? Object.freeze(["items", "internal_blocked_claim_refs"]) : Object.freeze(["secret", "internal_blocked_claim_refs"]),
      audit_hint_ref: baseRequest.audit_hint_ref,
    }),
    serialization_guard: MASTER_DATA_API_REFERENCE_SURFACE.serialization_guard,
    unauthorized_data_omission: MASTER_DATA_API_REFERENCE_SURFACE.unauthorized_data_omission,
    permission_annotation: "descriptor_only_permission_ref_required",
    audit_annotation: "descriptor_only_audit_hint_required",
    executes_api_handler: false,
  });
}

export function createMasterDataApiReferenceCatalog() {
  const happy = createMasterDataApiReferenceFixture({
    scenario: "happy_search",
    tenant_id: "tenant_rp04",
    permission_ref: "permission_ref_cp160",
    audit_hint_ref: "audit_hint_cp160",
    limit: 25,
  });
  const invalid = createMasterDataApiReferenceFixture({
    scenario: "invalid_request",
    filters: { unsupported_filter: true },
  });
  const denied = createMasterDataApiReferenceFixture({
    scenario: "denied_response",
    tenant_id: "tenant_rp04",
    permission_ref: "permission_ref_denied",
    audit_hint_ref: "audit_hint_cp160",
  });
  const fixtures = Object.freeze([happy, invalid, denied]);

  return freezeApiReferenceResult({
    catalog_id: "cp160_master_data_api_reference_catalog",
    api_surface: MASTER_DATA_API_REFERENCE_SURFACE,
    fixtures,
    fixture_ids: Object.freeze(fixtures.map((fixture) => fixture.fixture_id)),
    all_no_write: fixtures.every((fixture) => fixture.writes_product_state === false && fixture.executes_api_handler === false),
    all_serialized_without_hidden_values: fixtures.every((fixture) => !JSON.stringify(fixture).includes("cp160_hidden_value_secret")),
    denied_omits_items: denied.response.items.length === 0 && denied.response.safe_error_codes.includes("MASTER_DATA_API_UNAUTHORIZED_OMISSION"),
    invalid_request_codes: invalid.response.safe_error_codes,
  });
}

export function createMasterDataUiSurfaceStateCatalog() {
  return freezeApiReferenceResult({
    catalog_id: MASTER_DATA_UI_SURFACE_STATES.surface_id,
    ui_surface_states: MASTER_DATA_UI_SURFACE_STATES,
    state_count: Object.keys(MASTER_DATA_UI_SURFACE_STATES.states).length,
    surfaces: MASTER_DATA_UI_SURFACE_STATES.surfaces,
    data_dependencies: MASTER_DATA_UI_SURFACE_STATES.data_dependencies,
    loading_state: MASTER_DATA_UI_SURFACE_STATES.states.loading,
    empty_state: MASTER_DATA_UI_SURFACE_STATES.states.empty,
    denied_state: MASTER_DATA_UI_SURFACE_STATES.states.denied,
    review_required_state: MASTER_DATA_UI_SURFACE_STATES.states.review_required,
    primary_interaction: MASTER_DATA_UI_SURFACE_STATES.states.primary_interaction,
    secondary_interaction: MASTER_DATA_UI_SURFACE_STATES.states.secondary_interaction,
    renders_ui: false,
    mutates_dom: false,
  });
}

export function createMasterDataUiInteractionFixture(request = {}) {
  const slice = request.slice ?? "primary_implementation_slice";
  const scenario = request.scenario ?? "review_required";
  const fixtureId = request.fixture_id ?? `cp161_ui_fixture_${slice}_${scenario}`;
  const safeErrorCode = request.safe_error_code ?? (scenario === "denied" ? "MASTER_DATA_API_UNAUTHORIZED_OMISSION" : null);
  const state = Object.freeze({
    loading: scenario === "loading",
    empty: scenario === "empty",
    denied: scenario === "denied",
    review_required: scenario === "review_required",
    primary_interaction: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.primary_interaction,
    secondary_interaction: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.secondary_interaction,
  });
  const permissionBadge = Object.freeze({
    label: "Permission descriptor required",
    source: MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.permission_badge_source,
    permission_ref: request.permission_ref ?? "permission_ref_cp161",
    evaluates_runtime_permission: false,
    exposes_raw_rule: false,
  });
  const auditHint = Object.freeze({
    label: "Audit hint linked",
    source: MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.audit_hint_source,
    audit_hint_ref: request.audit_hint_ref ?? "audit_hint_cp161",
    appends_audit_event: false,
    exposes_internal_payload: false,
  });
  const errorCopy = Object.freeze({
    safe_error_code: safeErrorCode,
    message: safeErrorCode ? "Access cannot be shown for this descriptor." : "No action is required for this descriptor.",
    source: MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.denied_copy_source,
    exposes_internal_claims: false,
  });

  return freezeUiInteractionResult({
    fixture_id: fixtureId,
    workflow_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id,
    slice,
    scenario,
    surface_refs: MASTER_DATA_UI_SURFACE_STATES.surfaces,
    data_dependencies: MASTER_DATA_UI_INTERACTION_WORKFLOW.data_dependencies,
    state,
    interactions: Object.freeze({
      primary: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.primary_interaction,
      secondary: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.secondary_interaction,
      dispatches_review_route: false,
      dispatches_approval_route: false,
    }),
    permission_badge: permissionBadge,
    audit_hint_display: auditHint,
    error_message_copy: errorCopy,
    responsive_layout: Object.freeze({
      desktop: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.responsive_desktop_layout,
      mobile: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.responsive_mobile_layout,
      text_overlap_allowed: false,
    }),
    keyboard_focus_behavior: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.keyboard_focus_behavior,
    visual_density_check: MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states.visual_density_check,
    synthetic_fixture_binding: true,
    build_smoke: Object.freeze({
      descriptor_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.build_smoke,
      command: "npm run build",
      expected_status: "passed",
      executes_build_from_package_code: false,
    }),
    hermes_ui_evidence: Object.freeze({
      evidence_packet: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.hermes_ui_evidence,
      emitted_by_package_code: false,
    }),
    claude_ui_leak_prompt: Object.freeze({
      review_packet: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.claude_ui_leak_prompt,
      sent_by_package_code: false,
      leak_checks: MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.prohibited_outputs,
    }),
    closeout_handoff: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.closeout_handoff,
  });
}

export function createMasterDataUiInteractionWorkflowCatalog() {
  const fixtures = Object.freeze([
    createMasterDataUiInteractionFixture({
      fixture_id: "cp161_ui_fixture_primary_review_required",
      slice: "primary_implementation_slice",
      scenario: "review_required",
    }),
    createMasterDataUiInteractionFixture({
      fixture_id: "cp161_ui_fixture_secondary_denied",
      slice: "secondary_workflow_slice",
      scenario: "denied",
      safe_error_code: "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
    }),
    createMasterDataUiInteractionFixture({
      fixture_id: "cp161_ui_fixture_permission_audit_empty",
      slice: "permission_audit_binding_entry",
      scenario: "empty",
    }),
  ]);
  const serializedCustomerFacingDescriptors = JSON.stringify(
    fixtures.map((fixture) => ({
      fixture_id: fixture.fixture_id,
      state: fixture.state,
      interactions: fixture.interactions,
      permission_badge: fixture.permission_badge,
      audit_hint_display: fixture.audit_hint_display,
      error_message_copy: fixture.error_message_copy,
      responsive_layout: fixture.responsive_layout,
    })),
  );
  return freezeUiInteractionResult({
    catalog_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id,
    workflow: MASTER_DATA_UI_INTERACTION_WORKFLOW,
    fixtures,
    fixture_ids: Object.freeze(fixtures.map((fixture) => fixture.fixture_id)),
    covered_slices: MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices,
    all_no_write: fixtures.every((fixture) => fixture.writes_product_state === false && fixture.renders_ui === false && fixture.mutates_dom === false),
    all_security_displays_descriptor_only: fixtures.every(
      (fixture) =>
        fixture.permission_badge?.evaluates_runtime_permission === false &&
        fixture.audit_hint_display?.appends_audit_event === false &&
        fixture.error_message_copy?.exposes_internal_claims === false,
    ),
    all_required_interactions_present: fixtures.every(
      (fixture) => fixture.interactions?.primary && fixture.interactions?.secondary && fixture.keyboard_focus_behavior,
    ),
    prohibited_output_absent: MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.prohibited_outputs.every(
      (value) => !serializedCustomerFacingDescriptors.includes(value),
    ),
    build_smoke_descriptor_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.build_smoke,
    hermes_ui_evidence_packet: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.hermes_ui_evidence,
    claude_ui_leak_prompt: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.claude_ui_leak_prompt,
    next_pack_id: MASTER_DATA_CP161_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataPermissionAuditBindingDescriptor(request = {}) {
  const scenario = request.scenario ?? "review_required";
  const permissionRef = request.permission_ref ?? (scenario === "permission_missing" ? null : "permission_ref_cp162");
  const auditHintRef = request.audit_hint_ref ?? (scenario === "audit_missing" ? null : "audit_hint_cp162");
  const safeErrorCode =
    request.safe_error_code ??
    (permissionRef
      ? auditHintRef
        ? scenario === "denied"
          ? "MASTER_DATA_API_UNAUTHORIZED_OMISSION"
          : scenario === "review_required"
            ? "MASTER_DATA_REVIEW_REQUIRED"
            : null
        : MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.safe_missing_code
      : MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.safe_missing_code);
  const fixtureId = request.fixture_id ?? `cp162_binding_fixture_${scenario}`;

  const permissionBadge = Object.freeze({
    source: MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.source,
    label: permissionRef
      ? MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.present_label
      : MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.missing_label,
    permission_ref: permissionRef,
    safe_missing_code: MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.safe_missing_code,
    evaluates_runtime_permission: false,
    exposes_raw_rule: false,
  });

  const auditHintDisplay = Object.freeze({
    source: MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.source,
    label: auditHintRef
      ? MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.present_label
      : MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.missing_label,
    audit_hint_ref: auditHintRef,
    safe_missing_code: MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.safe_missing_code,
    appends_audit_event: false,
    exposes_internal_payload: false,
  });

  const customerFacingDescriptor = Object.freeze({
    permission_badge: permissionBadge,
    audit_hint_display: auditHintDisplay,
    safe_error_code: safeErrorCode,
    review_required: scenario === "review_required",
    denied: scenario === "denied",
  });

  return freezePermissionAuditBindingResult({
    fixture_id: fixtureId,
    binding_id: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id,
    source_workflow_id: MASTER_DATA_PERMISSION_AUDIT_BINDING.source_workflow_id,
    renderable_surface: MASTER_DATA_PERMISSION_AUDIT_BINDING.renderable_surface,
    scenario,
    required_descriptor_refs: MASTER_DATA_PERMISSION_AUDIT_BINDING.required_descriptor_refs,
    descriptor_refs: Object.freeze({
      tenant_id: request.tenant_id ?? "tenant_cp162",
      actor_user_id: request.actor_user_id ?? "user_cp162",
      permission_ref: permissionRef,
      audit_hint_ref: auditHintRef,
      ui_surface_state_id: request.ui_surface_state_id ?? "master_data_records_table",
      safe_error_code: safeErrorCode,
    }),
    binding_states: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states,
    state: Object.freeze({
      review_required: scenario === "review_required",
      primary_interaction: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states.primary_interaction,
      secondary_interaction: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states.secondary_interaction,
      denied: scenario === "denied",
      permission_missing: !permissionRef,
      audit_missing: !auditHintRef,
    }),
    interactions: MASTER_DATA_PERMISSION_AUDIT_BINDING.interaction_contract,
    permission_badge: permissionBadge,
    audit_hint_display: auditHintDisplay,
    error_message_copy: Object.freeze({
      source: MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.source,
      safe_error_code: safeErrorCode,
      message: safeErrorCode ? "This Master Data descriptor needs a safe permission or audit reference before display." : "Descriptor references are linked.",
      exposes_internal_claims: false,
      exposes_hidden_values: false,
    }),
    responsive_layout: MASTER_DATA_PERMISSION_AUDIT_BINDING.layout_contract,
    keyboard_focus_behavior: MASTER_DATA_PERMISSION_AUDIT_BINDING.layout_contract.keyboard_focus,
    visual_density_check: MASTER_DATA_PERMISSION_AUDIT_BINDING.layout_contract.density,
    customer_facing_descriptor: customerFacingDescriptor,
    prohibited_outputs_absent: MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.prohibited_outputs.every(
      (value) => !JSON.stringify(customerFacingDescriptor).includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditBindingCatalog() {
  const fixtures = Object.freeze([
    createMasterDataPermissionAuditBindingDescriptor({
      fixture_id: "cp162_binding_fixture_review_required",
      scenario: "review_required",
      safe_error_code: "MASTER_DATA_REVIEW_REQUIRED",
    }),
    createMasterDataPermissionAuditBindingDescriptor({
      fixture_id: "cp162_binding_fixture_permission_missing",
      scenario: "permission_missing",
    }),
    createMasterDataPermissionAuditBindingDescriptor({
      fixture_id: "cp162_binding_fixture_audit_missing",
      scenario: "audit_missing",
    }),
    createMasterDataPermissionAuditBindingDescriptor({
      fixture_id: "cp162_binding_fixture_denied",
      scenario: "denied",
      safe_error_code: "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
    }),
  ]);

  return freezePermissionAuditBindingResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id,
    binding: MASTER_DATA_PERMISSION_AUDIT_BINDING,
    renderable_surface: MASTER_DATA_PERMISSION_AUDIT_BINDING.renderable_surface,
    fixture_ids: Object.freeze(fixtures.map((fixture) => fixture.fixture_id)),
    fixtures,
    all_descriptor_refs_checked: fixtures.every((fixture) =>
      MASTER_DATA_PERMISSION_AUDIT_BINDING.required_descriptor_refs.every((ref) => Object.hasOwn(fixture.descriptor_refs, ref)),
    ),
    no_runtime_permission_decisions: fixtures.every((fixture) => fixture.permission_badge.evaluates_runtime_permission === false),
    no_audit_events_appended: fixtures.every((fixture) => fixture.audit_hint_display.appends_audit_event === false),
    safe_error_copy_only: fixtures.every(
      (fixture) =>
        fixture.error_message_copy.exposes_internal_claims === false &&
        fixture.error_message_copy.exposes_hidden_values === false &&
        MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.allowed_safe_error_codes.includes(fixture.error_message_copy.safe_error_code),
    ),
    layout_boundaries_stable: fixtures.every(
      (fixture) => fixture.responsive_layout.text_overlap_allowed === false && fixture.keyboard_focus_behavior && fixture.visual_density_check,
    ),
    prohibited_output_absent: fixtures.every((fixture) => fixture.prohibited_outputs_absent === true),
    hermes_evidence_packet: MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors.hermes_permission_audit_evidence,
    claude_review_packet: MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors.claude_permission_audit_review,
    next_pack_id: MASTER_DATA_CP162_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataSyntheticFixtureEntryDescriptor(request = {}) {
  const scenario = request.scenario ?? "loading";
  const fixtureId = request.fixture_id ?? `cp163_fixture_entry_${scenario}`;
  const safeErrorCode =
    request.safe_error_code ?? (scenario === "denied" ? MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy.unauthorized_omission : null);
  const customerFacingFixture = Object.freeze({
    fixture_id: fixtureId,
    scenario,
    ui_state: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states[scenario] ?? MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states.loading,
    safe_error_code: safeErrorCode,
    permission_ref: request.permission_ref ?? "permission_ref_cp163",
    audit_hint_ref: request.audit_hint_ref ?? "audit_hint_cp163",
  });

  return freezeSyntheticFixtureEntryResult({
    fixture_id: fixtureId,
    fixture_entry_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id,
    source_binding_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.source_binding_id,
    scenario,
    renderable_surface: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.renderable_surface,
    ui_surface_inventory: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_surface_inventory,
    data_dependencies: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.data_dependencies,
    fixture_entry_states: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_states,
    ui_state: Object.freeze({
      loading: scenario === "loading",
      empty: scenario === "empty",
      denied: scenario === "denied",
      descriptor: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states[scenario] ?? MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states.loading,
    }),
    descriptor_refs: Object.freeze({
      tenant_id: request.tenant_id ?? "tenant_cp163",
      permission_ref: request.permission_ref ?? "permission_ref_cp163",
      audit_hint_ref: request.audit_hint_ref ?? "audit_hint_cp163",
      permission_audit_binding_fixture_id: request.permission_audit_binding_fixture_id ?? "cp162_binding_fixture_denied",
      ui_surface_state_id: request.ui_surface_state_id ?? "master_data_records_table",
      safe_error_code: safeErrorCode,
    }),
    build_smoke: Object.freeze({
      descriptor_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.build_smoke,
      command: "npm run build",
      expected_status: "passed",
      executes_build_from_package_code: false,
    }),
    hermes_ui_evidence: Object.freeze({
      evidence_packet: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.hermes_ui_evidence,
      emitted_by_package_code: false,
    }),
    claude_ui_leak_prompt: Object.freeze({
      review_packet: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.claude_ui_leak_prompt,
      sent_by_package_code: false,
      leak_checks: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.prohibited_outputs,
    }),
    closeout_handoff: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.closeout_handoff,
    customer_facing_fixture: customerFacingFixture,
    prohibited_output_absent: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.prohibited_outputs.every(
      (value) => !JSON.stringify(customerFacingFixture).includes(value),
    ),
  });
}

export function createMasterDataSyntheticFixtureEntryCatalog() {
  const fixtures = Object.freeze([
    createMasterDataSyntheticFixtureEntryDescriptor({
      fixture_id: "cp163_fixture_entry_loading",
      scenario: "loading",
    }),
    createMasterDataSyntheticFixtureEntryDescriptor({
      fixture_id: "cp163_fixture_entry_empty",
      scenario: "empty",
    }),
    createMasterDataSyntheticFixtureEntryDescriptor({
      fixture_id: "cp163_fixture_entry_denied",
      scenario: "denied",
      safe_error_code: MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy.unauthorized_omission,
    }),
  ]);

  return freezeSyntheticFixtureEntryResult({
    catalog_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id,
    fixture_entry: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
    renderable_surface: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.renderable_surface,
    fixture_ids: Object.freeze(fixtures.map((fixture) => fixture.fixture_id)),
    fixtures,
    all_descriptor_refs_checked: fixtures.every((fixture) =>
      MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.data_dependencies.every((dependency) => Object.hasOwn(fixture.descriptor_refs, dependency)),
    ),
    ui_surface_inventory_complete: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_surface_inventory.every((surface) =>
      MASTER_DATA_UI_SURFACE_STATES.surfaces.includes(surface),
    ),
    loading_empty_denied_states_present: ["loading", "empty", "denied"].every((scenario) => fixtures.some((fixture) => fixture.scenario === scenario)),
    build_smoke_descriptor_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.build_smoke,
    hermes_ui_evidence_packet: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.hermes_ui_evidence,
    claude_ui_leak_prompt: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.claude_ui_leak_prompt,
    no_runtime_or_rendering_side_effects: fixtures.every(
      (fixture) =>
        fixture.renders_ui === false &&
        fixture.mutates_dom === false &&
        fixture.executes_api_handler === false &&
        fixture.issues_network_request === false &&
        fixture.evaluates_runtime_permission === false &&
        fixture.appends_audit_event === false,
    ),
    prohibited_output_absent: fixtures.every((fixture) => fixture.prohibited_output_absent === true),
    next_pack_id: MASTER_DATA_CP163_PACK_BINDING.next_pack_id,
  });
}

function outcomeForFixtureSetCase(caseType) {
  if (caseType === "review_required_case") return "review_required";
  if (
    [
      "denied_case",
      "cross_tenant_case",
      "missing_context_case",
      "security_trimming_case",
    ].includes(caseType)
  ) {
    return "blocked";
  }
  return "passed";
}

function safeCodeForFixtureSetCase(caseType) {
  return MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.safe_error_codes[caseType] ?? null;
}

export function createMasterDataSyntheticFixtureSetCase(request = {}) {
  const caseType = request.case_type ?? "primary_golden_case";
  const outcome = outcomeForFixtureSetCase(caseType);
  const safeErrorCode = request.safe_error_code ?? safeCodeForFixtureSetCase(caseType);
  const fixtureCaseId = request.fixture_case_id ?? `cp164_${caseType}`;
  const baseFixtureRefs = Object.freeze({
    tenant_fixture_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs.tenant,
    user_fixture_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs.user,
    matter_fixture_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs.matter,
    document_fixture_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs.document,
  });
  const customerFacingDescriptor = Object.freeze({
    fixture_case_id: fixtureCaseId,
    case_type: caseType,
    outcome,
    safe_error_code: safeErrorCode,
    display_label:
      outcome === "passed"
        ? "Synthetic fixture case ready"
        : outcome === "review_required"
          ? "Synthetic fixture case needs review"
          : "Synthetic fixture case blocked safely",
    base_fixture_refs: baseFixtureRefs,
    ui_state:
      outcome === "review_required"
        ? MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.review_required
        : outcome === "blocked"
          ? MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.denied
          : MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.primary_interaction,
    permission_badge: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.permission_badge,
    audit_hint_display: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.audit_hint_display,
    error_message_copy: safeErrorCode ? MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states.error_message_copy : null,
  });
  const serializedCustomerFacingDescriptor = JSON.stringify(customerFacingDescriptor);

  return freezeSyntheticFixtureSetResult({
    fixture_case_id: fixtureCaseId,
    catalog_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id,
    source_fixture_entry_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.source_fixture_entry_id,
    source_binding_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.source_binding_id,
    case_type: caseType,
    outcome,
    safe_error_code: safeErrorCode,
    base_fixture_refs: baseFixtureRefs,
    customer_facing_descriptor: customerFacingDescriptor,
    fixture_manifest_ref: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_manifest.manifest_id,
    ui_workflow_states: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states,
    golden_test_descriptor:
      MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.golden_case_ids.includes(fixtureCaseId) ||
      ["primary_golden_case", "secondary_golden_case"].includes(caseType),
    failure_test_descriptor: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.failure_case_ids.includes(fixtureCaseId) || outcome === "blocked",
    security_trimming: Object.freeze({
      trims_unauthorized_data: ["security_trimming_case", "denied_case", "cross_tenant_case"].includes(caseType),
      exposes_internal_claims: false,
      exposes_hidden_values: false,
      safe_error_code: safeErrorCode,
    }),
    ai_retrieval_or_analytics: Object.freeze({
      descriptor_present: caseType === "ai_retrieval_or_analytics_case",
      executes_ai_retrieval: false,
      executes_analytics_query: false,
      payload_surface: "descriptor_only",
    }),
    no_real_data_check: Object.freeze({
      generated_from_real_client_data: false,
      loads_real_client_data: false,
      raw_document_body_exposed: false,
    }),
    prohibited_output_absent: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingDescriptor.includes(value),
    ),
  });
}

export function createMasterDataSyntheticFixtureSetCatalog() {
  const cases = Object.freeze(
    MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_case_types.map((caseType) =>
      createMasterDataSyntheticFixtureSetCase({ case_type: caseType }),
    ),
  );
  const byType = Object.freeze(Object.fromEntries(cases.map((fixtureCase) => [fixtureCase.case_type, fixtureCase])));
  const customerFacingDescriptors = JSON.stringify(cases.map((fixtureCase) => fixtureCase.customer_facing_descriptor));

  return freezeSyntheticFixtureSetResult({
    catalog_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id,
    fixture_set: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG,
    cases,
    case_count: cases.length,
    fixture_case_ids: Object.freeze(cases.map((fixtureCase) => fixtureCase.fixture_case_id)),
    fixture_case_types: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_case_types,
    base_fixture_refs: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs,
    fixture_manifest: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_manifest,
    golden_case_ids: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.golden_case_ids,
    failure_case_ids: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.failure_case_ids,
    all_no_write: cases.every(
      (fixtureCase) =>
        fixtureCase.writes_product_state === false &&
        fixtureCase.executes_api_handler === false &&
        fixtureCase.renders_ui === false &&
        fixtureCase.mutates_dom === false,
    ),
    all_base_fixture_refs_present: cases.every((fixtureCase) =>
      Object.keys(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs).every((key) =>
        Boolean(fixtureCase.base_fixture_refs?.[`${key}_fixture_id`]),
      ),
    ),
    all_customer_facing_descriptors_trimmed: cases.every((fixtureCase) => fixtureCase.prohibited_output_absent === true),
    denied_case_safe_error_code: byType.denied_case.safe_error_code,
    cross_tenant_case_safe_error_code: byType.cross_tenant_case.safe_error_code,
    missing_context_case_safe_error_code: byType.missing_context_case.safe_error_code,
    review_required_case_outcome: byType.review_required_case.outcome,
    security_trimming_case_trims_unauthorized_data: byType.security_trimming_case.security_trimming.trims_unauthorized_data,
    ai_retrieval_or_analytics_descriptor_only:
      byType.ai_retrieval_or_analytics_case.ai_retrieval_or_analytics.payload_surface === "descriptor_only" &&
      byType.ai_retrieval_or_analytics_case.executes_ai_retrieval === false &&
      byType.ai_retrieval_or_analytics_case.executes_analytics_query === false,
    golden_test_descriptor_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.golden_test,
    failure_test_descriptor_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.failure_test,
    hermes_fixture_evidence_packet: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.hermes_fixture_evidence,
    claude_missing_test_prompt: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.claude_missing_test_prompt,
    closeout_handoff: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingDescriptors.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP164_PACK_BINDING.next_pack_id,
  });
}

function permissionMatrixOutcomeForScenario(scenario) {
  if (scenario === "allowed") return "allowed";
  if (scenario === "review_required") return "review_required";
  if (scenario === "approval_required") return "approval_required";
  return "denied";
}

function safeCodeForPermissionMatrixScenario(scenario) {
  return (
    {
      denied: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.denied,
      cross_tenant: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.cross_tenant,
      legal_hold: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.legal_hold,
      ethical_wall: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.ethical_wall,
      object_acl: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.object_acl,
      review_required: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.review_required,
      approval_required: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.approval_required,
      leak_prevention: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes.leak_prevention,
    }[scenario] ?? null
  );
}

export function createMasterDataPermissionMatrixDecisionDescriptor(request = {}) {
  const scenario = request.scenario ?? "allowed";
  const action = request.action ?? "view";
  const decisionOutcome = permissionMatrixOutcomeForScenario(scenario);
  const fixtureId = request.fixture_id ?? `cp165_permission_fixture_${scenario}_${action}`;
  const safeErrorCode = request.safe_error_code ?? safeCodeForPermissionMatrixScenario(scenario);
  const permissionRef = request.permission_ref ?? "permission_ref_cp165";
  const auditHintRef = request.audit_hint_ref ?? "audit_hint_cp165";
  const matchedRuleId = request.matched_rule_id ?? `matched_rule_cp165_${scenario}_${action}`;
  const customerFacingDecision = Object.freeze({
    fixture_id: fixtureId,
    scenario,
    action,
    decision_outcome: decisionOutcome,
    safe_error_code: safeErrorCode,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    matched_rule_ref: matchedRuleId,
    security_trimmed: ["object_acl", "security_trimming", "leak_prevention"].includes(scenario),
    review_required: scenario === "review_required",
    approval_required: scenario === "approval_required",
  });
  const serializedCustomerFacingDecision = JSON.stringify(customerFacingDecision);

  return freezePermissionMatrixWorkflowResult({
    fixture_id: fixtureId,
    matrix_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id,
    source_fixture_set_catalog_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.source_fixture_set_catalog_id,
    source_binding_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.source_binding_id,
    scenario,
    action,
    decision_binding: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.decision_bindings[action] ?? null,
    decision_outcome: decisionOutcome,
    safe_error_code: safeErrorCode,
    permission_ref: permissionRef,
    audit_hint_fields: Object.freeze({
      audit_hint_ref: auditHintRef,
      audit_reason_code: request.audit_reason_code ?? `audit_reason_cp165_${scenario}`,
      audit_expectation_ref: request.audit_expectation_ref ?? "audit_event_expected_descriptor_only",
      appends_audit_event: false,
      exposes_internal_payload: false,
    }),
    matched_rule_capture: Object.freeze({
      matched_rule_id: matchedRuleId,
      capture_mode: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.matched_rule_capture,
      exposes_raw_rule: false,
    }),
    deny_over_allow_check: Object.freeze({
      rule: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.deny_over_allow,
      applied: decisionOutcome === "denied",
    }),
    route: Object.freeze({
      review_required: scenario === "review_required",
      approval_required: scenario === "approval_required",
      review_route: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.review_required_route,
      approval_route: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.approval_required_route,
      dispatches_review_route: false,
      dispatches_approval_route: false,
    }),
    security_interactions: Object.freeze({
      legal_hold: scenario === "legal_hold" ? MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.legal_hold_interaction : null,
      ethical_wall: scenario === "ethical_wall" ? MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.ethical_wall_interaction : null,
      object_acl: scenario === "object_acl" ? MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.object_acl_interaction : null,
      security_trimming_proof:
        ["object_acl", "security_trimming", "leak_prevention"].includes(scenario)
          ? MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.security_trimming_proof
          : null,
    }),
    audit_event_expectation: Object.freeze({
      expectation: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.audit_event_expectation,
      writes_audit_event: false,
      appends_audit_event: false,
    }),
    customer_facing_decision: customerFacingDecision,
    prohibited_output_absent: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingDecision.includes(value),
    ),
  });
}

export function createMasterDataPermissionMatrixWorkflowCatalog() {
  const fixtures = Object.freeze([
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_allowed_view",
      scenario: "allowed",
      action: "view",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_denied_export",
      scenario: "denied",
      action: "export_download",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_cross_tenant_search",
      scenario: "cross_tenant",
      action: "search",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_legal_hold_share",
      scenario: "legal_hold",
      action: "share",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_ethical_wall_ai",
      scenario: "ethical_wall",
      action: "ai_retrieval",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_object_acl_trimmed",
      scenario: "object_acl",
      action: "view",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_review_required",
      scenario: "review_required",
      action: "mutation",
    }),
    createMasterDataPermissionMatrixDecisionDescriptor({
      fixture_id: "cp165_permission_fixture_approval_required",
      scenario: "approval_required",
      action: "export_download",
    }),
  ]);
  const fixtureIds = Object.freeze(fixtures.map((fixture) => fixture.fixture_id));
  const customerFacingDecisions = JSON.stringify(fixtures.map((fixture) => fixture.customer_facing_decision));

  return freezePermissionMatrixWorkflowResult({
    catalog_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id,
    workflow: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW,
    fixtures,
    fixture_ids: fixtureIds,
    permission_actions: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions,
    decision_bindings: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.decision_bindings,
    fixture_tail_scope: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.fixture_tail_scope,
    all_fixture_ids_declared: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_fixture_ids.every((fixtureId) =>
      fixtureIds.includes(fixtureId),
    ),
    all_no_write: fixtures.every(
      (fixture) =>
        fixture.writes_product_state === false &&
        fixture.evaluates_runtime_permission === false &&
        fixture.appends_audit_event === false &&
        fixture.executes_api_handler === false &&
        fixture.renders_ui === false &&
        fixture.mutates_dom === false,
    ),
    all_routes_descriptor_only: fixtures.every(
      (fixture) => fixture.route.dispatches_review_route === false && fixture.route.dispatches_approval_route === false,
    ),
    all_audit_expectations_descriptor_only: fixtures.every(
      (fixture) => fixture.audit_event_expectation.writes_audit_event === false && fixture.audit_event_expectation.appends_audit_event === false,
    ),
    all_matched_rules_reference_only: fixtures.every((fixture) => fixture.matched_rule_capture.exposes_raw_rule === false),
    deny_over_allow_covered: fixtures.some((fixture) => fixture.deny_over_allow_check.applied === true),
    legal_hold_covered: fixtures.some((fixture) => fixture.security_interactions.legal_hold),
    ethical_wall_covered: fixtures.some((fixture) => fixture.security_interactions.ethical_wall),
    object_acl_covered: fixtures.some((fixture) => fixture.security_interactions.object_acl),
    security_trimming_covered: fixtures.some((fixture) => fixture.security_interactions.security_trimming_proof),
    review_and_approval_routes_present: fixtures.some((fixture) => fixture.route.review_required) && fixtures.some((fixture) => fixture.route.approval_required),
    allowed_test_descriptor_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.allowed_test,
    denied_test_descriptor_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.denied_test,
    cross_tenant_test_descriptor_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.cross_tenant_test,
    leak_prevention_test_descriptor_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.leak_prevention_test,
    hermes_permission_evidence_packet: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.hermes_permission_evidence,
    claude_permission_review_packet: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.claude_permission_review,
    closeout_handoff: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingDecisions.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP165_PACK_BINDING.next_pack_id,
  });
}

function defaultScenarioForCp166Action(action) {
  return (
    {
      view: "allowed",
      search: "allowed",
      mutation: "review_required",
      export_download: "denied",
      share: "approval_required",
      ai_retrieval: "ethical_wall",
    }[action] ?? "denied"
  );
}

export function createMasterDataPermissionAuditDecisionBindingDescriptor(request = {}) {
  const action = request.action ?? "view";
  const scenario = request.scenario ?? defaultScenarioForCp166Action(action);
  const binding = MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.action_decision_bindings[action] ?? null;
  const matrixDecision = createMasterDataPermissionMatrixDecisionDescriptor({
    fixture_id: request.fixture_id ?? `cp166_permission_audit_${scenario}_${action}`,
    scenario,
    action,
    permission_ref: request.permission_ref ?? `permission_ref_cp166_${action}`,
    audit_hint_ref: request.audit_hint_ref ?? `audit_hint_cp166_${action}`,
    matched_rule_id: request.matched_rule_id ?? `matched_rule_cp166_${scenario}_${action}`,
  });
  const customerFacingDecision = Object.freeze({
    fixture_id: matrixDecision.fixture_id,
    action,
    scenario,
    decision_outcome: matrixDecision.decision_outcome,
    safe_error_code: matrixDecision.safe_error_code,
    security_trimmed: matrixDecision.customer_facing_decision.security_trimmed,
    review_required: matrixDecision.customer_facing_decision.review_required,
    approval_required: matrixDecision.customer_facing_decision.approval_required,
  });
  const internalEvidenceBinding = Object.freeze({
    permission_ref: matrixDecision.permission_ref,
    audit_hint_ref: matrixDecision.audit_hint_fields.audit_hint_ref,
    matched_rule_ref: matrixDecision.matched_rule_capture.matched_rule_id,
    exposes_raw_permission_rule: false,
    exposes_audit_internal_payload: false,
    exposes_customer_surface: false,
  });
  const serializedCustomerFacingDecision = JSON.stringify(customerFacingDecision);

  return freezePermissionAuditDecisionBindingResult({
    binding_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
    source_matrix_workflow_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.source_matrix_workflow_id,
    source_permission_audit_binding_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.source_permission_audit_binding_id,
    permission_matrix_row_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.permission_matrix_row.row_id,
    action,
    scenario,
    action_binding: binding,
    matrix_decision: matrixDecision,
    customer_facing_decision: customerFacingDecision,
    internal_evidence_binding: internalEvidenceBinding,
    audit_event_expectation: Object.freeze({
      expectation: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.permission_matrix_row.audit_event_expectation,
      writes_audit_event: false,
      appends_audit_event: false,
    }),
    route: matrixDecision.route,
    test_descriptor:
      scenario === "allowed"
        ? MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.allowed_test
        : MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.denied_test,
    customer_surface_excludes_internal_refs: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingDecision, field),
    ),
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingDecision.includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditDecisionBindingCatalog() {
  const rows = Object.freeze(
    MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions.map((action) =>
      createMasterDataPermissionAuditDecisionBindingDescriptor({ action }),
    ),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_decision));
  const fixtureTests = Object.freeze({
    permission_fixture_descriptor: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.permission_fixture,
    allowed_test_descriptor: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.allowed_test,
    denied_test_descriptor: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.denied_test,
    allowed_covered: rows.some((row) => row.scenario === "allowed" && row.matrix_decision.decision_outcome === "allowed"),
    denied_covered: rows.some((row) => row.matrix_decision.decision_outcome === "denied"),
  });

  return freezePermissionAuditDecisionBindingResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
    binding: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING,
    permission_matrix_row: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.permission_matrix_row,
    action_rows: rows,
    fixture_tests: fixtureTests,
    all_actions_bound: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions.every((action) =>
      rows.some((row) => row.action === action && row.action_binding?.decision_binding === MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.decision_bindings[action]),
    ),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_evidence_binding.exposes_raw_permission_rule === false &&
        row.internal_evidence_binding.exposes_audit_internal_payload === false &&
        row.internal_evidence_binding.exposes_customer_surface === false,
    ),
    all_audit_expectations_descriptor_only: rows.every(
      (row) => row.audit_event_expectation.writes_audit_event === false && row.audit_event_expectation.appends_audit_event === false,
    ),
    review_and_approval_routes_descriptor_only: rows.every(
      (row) => row.route.dispatches_review_route === false && row.route.dispatches_approval_route === false,
    ),
    allowed_test_descriptor_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.allowed_test,
    denied_test_descriptor_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors.denied_test,
    hermes_permission_audit_binding_packet: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.hermes_permission_audit_binding,
    claude_permission_audit_binding_review_packet:
      MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.claude_permission_audit_binding_review,
    closeout_handoff: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP166_PACK_BINDING.next_pack_id,
  });
}

function defaultCp167ScenarioForControl(controlKey) {
  return (
    {
      audit_hint_fields: "allowed",
      matched_rule_capture: "denied",
      deny_over_allow: "denied",
      legal_hold_interaction: "legal_hold",
      ethical_wall_interaction: "ethical_wall",
      object_acl_interaction: "object_acl",
      review_required_route: "review_required",
      approval_required_route: "approval_required",
      security_trimming_proof: "object_acl",
      audit_event_expectation: "allowed",
    }[controlKey] ?? "denied"
  );
}

function defaultCp167ActionForControl(controlKey) {
  return (
    {
      audit_hint_fields: "view",
      matched_rule_capture: "export_download",
      deny_over_allow: "export_download",
      legal_hold_interaction: "share",
      ethical_wall_interaction: "ai_retrieval",
      object_acl_interaction: "view",
      review_required_route: "mutation",
      approval_required_route: "share",
      security_trimming_proof: "view",
      audit_event_expectation: "search",
    }[controlKey] ?? "export_download"
  );
}

export function createMasterDataPermissionAuditControlInteractionDescriptor(request = {}) {
  const controlKey = request.control_key ?? "audit_hint_fields";
  const controlDescriptor = MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_descriptors[controlKey] ?? null;
  const scenario = request.scenario ?? defaultCp167ScenarioForControl(controlKey);
  const action = request.action ?? defaultCp167ActionForControl(controlKey);
  const decisionBinding = createMasterDataPermissionAuditDecisionBindingDescriptor({
    fixture_id: request.fixture_id ?? `cp167_control_${controlKey}_${scenario}_${action}`,
    scenario,
    action,
    permission_ref: request.permission_ref ?? `permission_ref_cp167_${controlKey}`,
    audit_hint_ref: request.audit_hint_ref ?? `audit_hint_cp167_${controlKey}`,
    matched_rule_id: request.matched_rule_id ?? `matched_rule_cp167_${controlKey}_${scenario}`,
  });
  const customerFacingControlOutcome = Object.freeze({
    fixture_id: decisionBinding.customer_facing_decision.fixture_id,
    control_key: controlKey,
    action,
    scenario,
    decision_outcome: decisionBinding.customer_facing_decision.decision_outcome,
    safe_error_code: decisionBinding.customer_facing_decision.safe_error_code,
    security_trimmed: decisionBinding.customer_facing_decision.security_trimmed,
    review_required: decisionBinding.customer_facing_decision.review_required,
    approval_required: decisionBinding.customer_facing_decision.approval_required,
    route_queued: ["review_required_route", "approval_required_route"].includes(controlKey),
    audit_expected: controlKey === "audit_event_expectation" || controlKey === "audit_hint_fields",
  });
  const internalControlEvidence = Object.freeze({
    permission_ref: decisionBinding.internal_evidence_binding.permission_ref,
    audit_hint_ref: decisionBinding.internal_evidence_binding.audit_hint_ref,
    matched_rule_ref: decisionBinding.internal_evidence_binding.matched_rule_ref,
    control_descriptor: controlDescriptor,
    exposes_customer_surface: false,
    exposes_raw_rule: false,
    exposes_audit_internal_payload: false,
    exposes_denied_items: false,
  });
  const serializedCustomerFacingControlOutcome = JSON.stringify(customerFacingControlOutcome);

  return freezePermissionAuditControlInteractionsResult({
    control_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
    source_decision_binding_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_decision_binding_id,
    source_matrix_workflow_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_matrix_workflow_id,
    control_key: controlKey,
    control_descriptor: controlDescriptor,
    decision_binding: decisionBinding,
    customer_facing_control_outcome: customerFacingControlOutcome,
    internal_control_evidence: internalControlEvidence,
    audit_hint_fields_descriptor: controlKey === "audit_hint_fields" ? controlDescriptor : null,
    matched_rule_capture_descriptor: controlKey === "matched_rule_capture" ? controlDescriptor : null,
    deny_over_allow_descriptor: controlKey === "deny_over_allow" ? controlDescriptor : null,
    legal_hold_interaction_descriptor: controlKey === "legal_hold_interaction" ? controlDescriptor : null,
    ethical_wall_interaction_descriptor: controlKey === "ethical_wall_interaction" ? controlDescriptor : null,
    object_acl_interaction_descriptor: controlKey === "object_acl_interaction" ? controlDescriptor : null,
    review_required_route_descriptor: controlKey === "review_required_route" ? controlDescriptor : null,
    approval_required_route_descriptor: controlKey === "approval_required_route" ? controlDescriptor : null,
    security_trimming_proof_descriptor: controlKey === "security_trimming_proof" ? controlDescriptor : null,
    audit_event_expectation_descriptor: controlKey === "audit_event_expectation" ? controlDescriptor : null,
    route: decisionBinding.route,
    audit_event_expectation: decisionBinding.audit_event_expectation,
    customer_surface_excludes_internal_refs: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingControlOutcome, field),
    ),
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingControlOutcome.includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditControlInteractionsCatalog() {
  const controlKeys = Object.freeze(Object.keys(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_descriptors));
  const rows = Object.freeze(
    controlKeys.map((controlKey) => createMasterDataPermissionAuditControlInteractionDescriptor({ control_key: controlKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_control_outcome));

  return freezePermissionAuditControlInteractionsResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
    control_interactions: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS,
    control_keys: controlKeys,
    control_rows: rows,
    all_controls_declared: controlKeys.every((controlKey) => rows.some((row) => row.control_key === controlKey && row.control_descriptor)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_control_evidence.exposes_customer_surface === false &&
        row.internal_control_evidence.exposes_raw_rule === false &&
        row.internal_control_evidence.exposes_audit_internal_payload === false &&
        row.internal_control_evidence.exposes_denied_items === false,
    ),
    audit_hint_fields_covered: rows.some((row) => row.audit_hint_fields_descriptor?.fields?.length === 3),
    matched_rule_capture_reference_only: rows.some((row) => row.matched_rule_capture_descriptor?.exposes_raw_rule === false),
    deny_over_allow_covered: rows.some((row) => row.deny_over_allow_descriptor?.applied_when_any_boundary_blocks === true),
    legal_hold_covered: rows.some((row) => row.legal_hold_interaction_descriptor?.mutates_hold_state === false),
    ethical_wall_covered: rows.some((row) => row.ethical_wall_interaction_descriptor?.exposes_wall_membership === false),
    object_acl_covered: rows.some((row) => row.object_acl_interaction_descriptor?.exposes_denied_items === false),
    review_route_descriptor_only: rows.some((row) => row.review_required_route_descriptor?.dispatches_review_route === false),
    approval_route_descriptor_only: rows.some((row) => row.approval_required_route_descriptor?.dispatches_approval_route === false),
    security_trimming_safe_counts_only: rows.some((row) => row.security_trimming_proof_descriptor?.safe_counts_only === true),
    audit_event_expectation_descriptor_only: rows.some(
      (row) =>
        row.audit_event_expectation_descriptor?.writes_audit_event === false &&
        row.audit_event_expectation_descriptor?.appends_audit_event === false,
    ),
    hermes_control_interactions_packet: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.hermes_control_interactions,
    claude_control_interactions_review_packet:
      MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.claude_control_interactions_review,
    closeout_handoff: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP167_PACK_BINDING.next_pack_id,
  });
}

function defaultCp168ScenarioForTest(testKey) {
  return (
    {
      permission_fixture: "allowed",
      allowed_test: "allowed",
      denied_test: "denied",
      cross_tenant_test: "cross_tenant",
      leak_prevention_test: "leak_prevention",
      permission_matrix_row: "allowed",
      view_decision_binding: "allowed",
      search_decision_binding: "cross_tenant",
      mutation_decision_binding: "review_required",
      export_download_decision_binding: "denied",
    }[testKey] ?? "denied"
  );
}

function defaultCp168ActionForTest(testKey) {
  return (
    {
      permission_fixture: "view",
      allowed_test: "view",
      denied_test: "export_download",
      cross_tenant_test: "search",
      leak_prevention_test: "view",
      permission_matrix_row: "view",
      view_decision_binding: "view",
      search_decision_binding: "search",
      mutation_decision_binding: "mutation",
      export_download_decision_binding: "export_download",
    }[testKey] ?? "export_download"
  );
}

function defaultCp168ControlForTest(testKey) {
  return (
    {
      permission_fixture: "audit_hint_fields",
      allowed_test: "audit_hint_fields",
      denied_test: "deny_over_allow",
      cross_tenant_test: "object_acl_interaction",
      leak_prevention_test: "security_trimming_proof",
      permission_matrix_row: "matched_rule_capture",
      view_decision_binding: "audit_hint_fields",
      search_decision_binding: "object_acl_interaction",
      mutation_decision_binding: "review_required_route",
      export_download_decision_binding: "deny_over_allow",
    }[testKey] ?? "deny_over_allow"
  );
}

export function createMasterDataPermissionAuditFixtureDecisionTestDescriptor(request = {}) {
  const testKey = request.test_key ?? "permission_fixture";
  const fixtureDescriptor = MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors[testKey] ?? null;
  const decisionDescriptor = MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors[testKey] ?? null;
  const scenario = request.scenario ?? fixtureDescriptor?.scenario ?? defaultCp168ScenarioForTest(testKey);
  const action = request.action ?? fixtureDescriptor?.action ?? decisionDescriptor?.action ?? defaultCp168ActionForTest(testKey);
  const controlKey = request.control_key ?? defaultCp168ControlForTest(testKey);
  const controlInteraction = createMasterDataPermissionAuditControlInteractionDescriptor({
    fixture_id: request.fixture_id ?? `cp168_${testKey}_${scenario}_${action}`,
    control_key: controlKey,
    scenario,
    action,
    permission_ref: request.permission_ref ?? `permission_ref_cp168_${testKey}`,
    audit_hint_ref: request.audit_hint_ref ?? `audit_hint_cp168_${testKey}`,
    matched_rule_id: request.matched_rule_id ?? `matched_rule_cp168_${testKey}_${scenario}`,
  });
  const expectedOutcome =
    fixtureDescriptor?.expected_outcome ??
    controlInteraction.customer_facing_control_outcome.decision_outcome ??
    (scenario === "allowed" ? "allowed" : "denied");
  const customerFacingTestOutcome = Object.freeze({
    fixture_id: controlInteraction.customer_facing_control_outcome.fixture_id,
    test_key: testKey,
    control_key: controlKey,
    action,
    scenario,
    expected_outcome: expectedOutcome,
    actual_outcome_descriptor: controlInteraction.customer_facing_control_outcome.decision_outcome,
    safe_error_code: controlInteraction.customer_facing_control_outcome.safe_error_code,
    security_trimmed: controlInteraction.customer_facing_control_outcome.security_trimmed,
    review_required: controlInteraction.customer_facing_control_outcome.review_required,
    approval_required: controlInteraction.customer_facing_control_outcome.approval_required,
    test_pass_descriptor: expectedOutcome === controlInteraction.customer_facing_control_outcome.decision_outcome,
  });
  const internalFixtureEvidence = Object.freeze({
    permission_ref: controlInteraction.internal_control_evidence.permission_ref,
    audit_hint_ref: controlInteraction.internal_control_evidence.audit_hint_ref,
    matched_rule_ref: controlInteraction.internal_control_evidence.matched_rule_ref,
    source_control_interaction_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
    source_decision_binding_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_decision_binding_id,
    fixture_descriptor: fixtureDescriptor,
    decision_descriptor: decisionDescriptor,
    exposes_customer_surface: false,
    exposes_raw_rule: false,
    exposes_foreign_tenant_id: false,
    exposes_hidden_source_values: false,
    exposes_denied_item_payload: false,
  });
  const serializedCustomerFacingTestOutcome = JSON.stringify(customerFacingTestOutcome);

  return freezePermissionAuditFixtureDecisionTestsResult({
    test_matrix_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
    source_control_interactions_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_control_interactions_id,
    source_decision_binding_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_decision_binding_id,
    source_matrix_workflow_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_matrix_workflow_id,
    test_key: testKey,
    scenario,
    action,
    control_interaction: controlInteraction,
    fixture_descriptor: fixtureDescriptor,
    decision_descriptor: decisionDescriptor,
    customer_facing_test_outcome: customerFacingTestOutcome,
    internal_fixture_evidence: internalFixtureEvidence,
    permission_fixture_descriptor: testKey === "permission_fixture" ? fixtureDescriptor : null,
    allowed_test_descriptor: testKey === "allowed_test" ? fixtureDescriptor : null,
    denied_test_descriptor: testKey === "denied_test" ? fixtureDescriptor : null,
    cross_tenant_test_descriptor: testKey === "cross_tenant_test" ? fixtureDescriptor : null,
    leak_prevention_test_descriptor: testKey === "leak_prevention_test" ? fixtureDescriptor : null,
    permission_matrix_row_descriptor: testKey === "permission_matrix_row" ? decisionDescriptor : null,
    view_decision_binding_descriptor: testKey === "view_decision_binding" ? decisionDescriptor : null,
    search_decision_binding_descriptor: testKey === "search_decision_binding" ? decisionDescriptor : null,
    mutation_decision_binding_descriptor: testKey === "mutation_decision_binding" ? decisionDescriptor : null,
    export_download_decision_binding_descriptor: testKey === "export_download_decision_binding" ? decisionDescriptor : null,
    customer_surface_excludes_internal_refs: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingTestOutcome, field),
    ),
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingTestOutcome.includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditFixtureDecisionTestsCatalog() {
  const testKeys = Object.freeze([
    ...Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors),
    ...Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors),
  ]);
  const rows = Object.freeze(
    testKeys.map((testKey) => createMasterDataPermissionAuditFixtureDecisionTestDescriptor({ test_key: testKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_test_outcome));

  return freezePermissionAuditFixtureDecisionTestsResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
    fixture_decision_tests: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS,
    test_keys: testKeys,
    test_rows: rows,
    all_fixture_tests_declared: Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors).every((testKey) =>
      rows.some((row) => row.test_key === testKey && row.fixture_descriptor),
    ),
    all_decision_bindings_declared: Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors).every(
      (testKey) => rows.some((row) => row.test_key === testKey && row.decision_descriptor),
    ),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_fixture_evidence.exposes_customer_surface === false &&
        row.internal_fixture_evidence.exposes_raw_rule === false &&
        row.internal_fixture_evidence.exposes_foreign_tenant_id === false &&
        row.internal_fixture_evidence.exposes_hidden_source_values === false &&
        row.internal_fixture_evidence.exposes_denied_item_payload === false,
    ),
    permission_fixture_covered: rows.some((row) => row.permission_fixture_descriptor?.synthetic_only === true),
    allowed_test_covered: rows.some(
      (row) => row.allowed_test_descriptor?.expected_outcome === "allowed" && row.customer_facing_test_outcome.test_pass_descriptor === true,
    ),
    denied_test_covered: rows.some(
      (row) => row.denied_test_descriptor?.expected_outcome === "denied" && row.customer_facing_test_outcome.test_pass_descriptor === true,
    ),
    cross_tenant_test_covered: rows.some(
      (row) => row.cross_tenant_test_descriptor?.exposes_foreign_tenant_id === false && row.customer_facing_test_outcome.scenario === "cross_tenant",
    ),
    leak_prevention_test_covered: rows.some(
      (row) =>
        row.leak_prevention_test_descriptor?.exposes_hidden_source_values === false &&
        row.leak_prevention_test_descriptor?.exposes_unauthorized_payload === false,
    ),
    permission_matrix_row_covered: rows.some((row) => row.permission_matrix_row_descriptor?.exposes_raw_matrix_rule === false),
    view_decision_binding_covered: rows.some((row) => row.view_decision_binding_descriptor?.action === "view"),
    search_decision_binding_covered: rows.some((row) => row.search_decision_binding_descriptor?.action === "search"),
    mutation_decision_binding_covered: rows.some((row) => row.mutation_decision_binding_descriptor?.action === "mutation"),
    export_download_decision_binding_covered: rows.some((row) => row.export_download_decision_binding_descriptor?.action === "export_download"),
    hermes_fixture_decision_tests_packet:
      MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.hermes_fixture_decision_tests,
    claude_fixture_decision_tests_review_packet:
      MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.claude_fixture_decision_tests_review,
    closeout_handoff: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP168_PACK_BINDING.next_pack_id,
  });
}

function defaultCp169SourceTestKey(descriptorKey) {
  return (
    {
      share_decision_binding: "denied_test",
      ai_retrieval_decision_binding: "leak_prevention_test",
      hermes_evidence_packet: "permission_fixture",
      claude_review_packet: "permission_fixture",
      closeout_handoff: "permission_fixture",
      missing_tenant_failure: "denied_test",
      missing_actor_failure: "denied_test",
      missing_matter_failure: "denied_test",
      missing_resource_failure: "denied_test",
      unknown_action_failure: "denied_test",
      cross_tenant_failure: "cross_tenant_test",
      permission_denied_failure: "denied_test",
      ambiguous_rule_failure: "denied_test",
      stale_reference_failure: "leak_prevention_test",
      lock_conflict_failure: "denied_test",
      retry_exhaustion_failure: "denied_test",
      rollback_expectation: "denied_test",
      compensation_expectation: "denied_test",
      blocked_claim_receipt: "denied_test",
      failure_fixture: "permission_fixture",
      failure_unit_test: "denied_test",
      failure_integration_smoke: "denied_test",
      audit_failure_hint: "denied_test",
      hermes_failure_evidence: "denied_test",
    }[descriptorKey] ?? "denied_test"
  );
}

function descriptorOutcomeForCp169(descriptorKey, descriptor) {
  if (descriptorKey === "share_decision_binding") return "approval_required";
  if (descriptorKey === "ai_retrieval_decision_binding") return "denied";
  if (descriptor?.safe_error_code) return "blocked";
  return "reference_only";
}

export function createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor(request = {}) {
  const descriptorKey = request.descriptor_key ?? request.failure_key ?? "permission_denied_failure";
  const continuationDescriptor = MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors[descriptorKey] ?? null;
  const failureDescriptor = MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.failure_taxonomy_descriptors[descriptorKey] ?? null;
  const descriptor = continuationDescriptor ?? failureDescriptor;
  const sourceTestKey = request.source_test_key ?? defaultCp169SourceTestKey(descriptorKey);
  const sourceFixtureTest = createMasterDataPermissionAuditFixtureDecisionTestDescriptor({
    test_key: sourceTestKey,
    action: continuationDescriptor?.action,
    scenario: request.scenario,
  });
  const category = continuationDescriptor ? "permission_audit_continuation" : "failure_taxonomy";
  const outcomeDescriptor = descriptorOutcomeForCp169(descriptorKey, descriptor);
  const safeErrorCode = descriptor?.safe_error_code ?? sourceFixtureTest.customer_facing_test_outcome.safe_error_code;
  const customerFacingFailureSummary = Object.freeze({
    descriptor_key: descriptorKey,
    category,
    action: continuationDescriptor?.action ?? request.action ?? sourceFixtureTest.action,
    source_test_key: sourceTestKey,
    outcome_descriptor: outcomeDescriptor,
    safe_error_code: safeErrorCode,
    customer_visible: descriptor?.customer_visible ?? true,
    review_required: outcomeDescriptor === "review_required",
    approval_required: outcomeDescriptor === "approval_required",
    retryable_descriptor: descriptorKey === "retry_exhaustion_failure" ? false : null,
  });
  const internalFailureEvidence = Object.freeze({
    blocked_claim_ref: failureDescriptor?.blocked_claim ?? null,
    source_fixture_decision_tests_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_fixture_decision_tests_id,
    source_control_interactions_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_control_interactions_id,
    source_decision_binding_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_decision_binding_id,
    source_matrix_workflow_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_matrix_workflow_id,
    source_fixture_test_pack_id: sourceFixtureTest.pack_id,
    continuation_descriptor: continuationDescriptor,
    failure_descriptor: failureDescriptor,
    exposes_customer_surface: false,
    exposes_raw_rule: false,
    exposes_foreign_tenant_id: false,
    exposes_hidden_source_values: false,
    exposes_rule_candidates: false,
    exposes_stale_payload: false,
    exposes_denied_item_payload: false,
  });
  const serializedCustomerFacingFailureSummary = JSON.stringify(customerFacingFailureSummary);

  return freezePermissionAuditWorkflowFailureTaxonomyResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
    source_fixture_decision_tests_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_fixture_decision_tests_id,
    source_control_interactions_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_control_interactions_id,
    source_decision_binding_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_decision_binding_id,
    source_matrix_workflow_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_matrix_workflow_id,
    descriptor_key: descriptorKey,
    category,
    source_fixture_test: sourceFixtureTest,
    continuation_descriptor: continuationDescriptor,
    failure_descriptor: failureDescriptor,
    customer_facing_failure_summary: customerFacingFailureSummary,
    internal_failure_evidence: internalFailureEvidence,
    customer_surface_excludes_internal_refs: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingFailureSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingFailureSummary.includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditWorkflowFailureTaxonomyCatalog() {
  const continuationKeys = Object.freeze(
    Object.keys(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors),
  );
  const failureKeys = Object.freeze(Object.keys(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.failure_taxonomy_descriptors));
  const descriptorKeys = Object.freeze([...continuationKeys, ...failureKeys]);
  const rows = Object.freeze(
    descriptorKeys.map((descriptorKey) => createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({ descriptor_key: descriptorKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_failure_summary));

  return freezePermissionAuditWorkflowFailureTaxonomyResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
    workflow_failure_taxonomy: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY,
    descriptor_keys: descriptorKeys,
    continuation_keys: continuationKeys,
    failure_keys: failureKeys,
    descriptor_rows: rows,
    all_continuation_descriptors_declared: continuationKeys.every((key) => rows.some((row) => row.descriptor_key === key && row.continuation_descriptor)),
    all_failure_taxonomy_descriptors_declared: failureKeys.every((key) => rows.some((row) => row.descriptor_key === key && row.failure_descriptor)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_claude_review === false &&
        row.executes_retry === false &&
        row.executes_rollback === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_failure_evidence.exposes_customer_surface === false &&
        row.internal_failure_evidence.exposes_raw_rule === false &&
        row.internal_failure_evidence.exposes_foreign_tenant_id === false &&
        row.internal_failure_evidence.exposes_hidden_source_values === false &&
        row.internal_failure_evidence.exposes_rule_candidates === false &&
        row.internal_failure_evidence.exposes_stale_payload === false &&
        row.internal_failure_evidence.exposes_denied_item_payload === false,
    ),
    share_decision_binding_covered: rows.some((row) => row.descriptor_key === "share_decision_binding" && row.continuation_descriptor?.action === "share"),
    ai_retrieval_decision_binding_covered: rows.some(
      (row) => row.descriptor_key === "ai_retrieval_decision_binding" && row.continuation_descriptor?.executes_ai_retrieval === false,
    ),
    missing_tenant_failure_covered: rows.some((row) => row.descriptor_key === "missing_tenant_failure"),
    missing_actor_failure_covered: rows.some((row) => row.descriptor_key === "missing_actor_failure"),
    missing_matter_failure_covered: rows.some((row) => row.descriptor_key === "missing_matter_failure"),
    cross_tenant_failure_covered: rows.some(
      (row) => row.descriptor_key === "cross_tenant_failure" && row.failure_descriptor?.exposes_foreign_tenant_id === false,
    ),
    permission_denied_failure_covered: rows.some(
      (row) => row.descriptor_key === "permission_denied_failure" && row.failure_descriptor?.exposes_permission_rule === false,
    ),
    ambiguous_rule_failure_covered: rows.some(
      (row) => row.descriptor_key === "ambiguous_rule_failure" && row.failure_descriptor?.exposes_rule_candidates === false,
    ),
    stale_reference_failure_covered: rows.some(
      (row) => row.descriptor_key === "stale_reference_failure" && row.failure_descriptor?.exposes_stale_payload === false,
    ),
    lock_conflict_failure_covered: rows.some(
      (row) => row.descriptor_key === "lock_conflict_failure" && row.failure_descriptor?.acquires_runtime_lock === false,
    ),
    retry_and_rollback_descriptor_only: rows.some((row) => row.descriptor_key === "retry_exhaustion_failure" && row.executes_retry === false) &&
      rows.some((row) => row.descriptor_key === "rollback_expectation" && row.executes_rollback === false),
    blocked_claim_receipt_covered: rows.some(
      (row) => row.descriptor_key === "blocked_claim_receipt" && row.failure_descriptor?.emits_hermes_evidence === false,
    ),
    failure_fixture_covered: rows.some(
      (row) => row.descriptor_key === "failure_fixture" && row.failure_descriptor?.synthetic_only === true,
    ),
    failure_tests_covered: rows.some((row) => row.descriptor_key === "failure_unit_test") &&
      rows.some((row) => row.descriptor_key === "failure_integration_smoke"),
    hermes_and_claude_packets_descriptor_only:
      MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors.hermes_evidence_packet.emits_hermes_evidence === false &&
      MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors.claude_review_packet.sends_claude_prompt === false,
    hermes_workflow_failure_taxonomy_packet:
      MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.hermes_workflow_failure_taxonomy,
    claude_workflow_failure_taxonomy_review_packet:
      MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.claude_workflow_failure_taxonomy_review,
    closeout_handoff: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP169_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor(request = {}) {
  const descriptorKey = request.descriptor_key ?? request.failure_key ?? "permission_denied_failure";
  const edgeCaseDescriptor = MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.edge_case_descriptors[descriptorKey] ?? null;
  const failureRecoveryBinding = MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.failure_recovery_bindings[descriptorKey] ?? null;
  const sourceDescriptorKey = failureRecoveryBinding?.source_descriptor_key ?? descriptorKey;
  const sourceFailureTaxonomyDescriptor = edgeCaseDescriptor
    ? null
    : createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({
        descriptor_key: sourceDescriptorKey,
        source_test_key: request.source_test_key,
        scenario: request.scenario,
      });
  const category = edgeCaseDescriptor ? "edge_case_control_descriptor" : "failure_recovery_binding";
  const safeErrorCode =
    failureRecoveryBinding?.safe_error_code ??
    sourceFailureTaxonomyDescriptor?.customer_facing_failure_summary?.safe_error_code ??
    "MASTER_DATA_VALIDATION_ERROR";
  const customerFacingEdgeCaseSummary = Object.freeze({
    descriptor_key: descriptorKey,
    category,
    safe_error_code: safeErrorCode,
    customer_visible: failureRecoveryBinding?.customer_visible ?? false,
    escalation_required: failureRecoveryBinding?.escalation_required ?? false,
    replay_count: failureRecoveryBinding?.replay_count ?? 1,
    outcome_descriptor: sourceFailureTaxonomyDescriptor?.customer_facing_failure_summary?.outcome_descriptor ?? "reference_only",
    descriptor_only: true,
  });
  const internalEdgeCaseEvidence = Object.freeze({
    source_failure_taxonomy_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_failure_taxonomy_catalog_id,
    source_fixture_decision_tests_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_fixture_decision_tests_id,
    source_control_interactions_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_control_interactions_id,
    source_descriptor_key: sourceDescriptorKey,
    edge_case_descriptor: edgeCaseDescriptor,
    failure_recovery_binding: failureRecoveryBinding,
    source_failure_taxonomy_descriptor: sourceFailureTaxonomyDescriptor,
    exposes_customer_surface: false,
    exposes_internal_prompt: false,
    exposes_internal_note: false,
    exposes_review_route_dispatch: false,
    exposes_approval_route_dispatch: false,
    exposes_permission_rule: false,
    exposes_foreign_tenant_id: false,
    exposes_rule_candidates: false,
    exposes_stale_payload: false,
  });
  const serializedCustomerFacingEdgeCaseSummary = JSON.stringify(customerFacingEdgeCaseSummary);

  return freezeFailureTaxonomyEdgeCaseEscalationResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
    source_failure_taxonomy_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_failure_taxonomy_catalog_id,
    descriptor_key: descriptorKey,
    category,
    edge_case_descriptor: edgeCaseDescriptor,
    failure_recovery_binding: failureRecoveryBinding,
    source_failure_taxonomy_descriptor: sourceFailureTaxonomyDescriptor,
    customer_facing_edge_case_summary: customerFacingEdgeCaseSummary,
    internal_edge_case_evidence: internalEdgeCaseEvidence,
    customer_surface_excludes_internal_refs: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingEdgeCaseSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingEdgeCaseSummary.includes(value),
    ),
  });
}

export function createMasterDataFailureTaxonomyEdgeCaseEscalationCatalog() {
  const edgeCaseKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.edge_case_descriptors));
  const recoveryKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.failure_recovery_bindings));
  const descriptorKeys = Object.freeze([...edgeCaseKeys, ...recoveryKeys]);
  const rows = Object.freeze(
    descriptorKeys.map((descriptorKey) => createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({ descriptor_key: descriptorKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_edge_case_summary));

  return freezeFailureTaxonomyEdgeCaseEscalationResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
    edge_case_escalation: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION,
    descriptor_keys: descriptorKeys,
    edge_case_keys: edgeCaseKeys,
    recovery_keys: recoveryKeys,
    descriptor_rows: rows,
    source_failure_taxonomy_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_failure_taxonomy_catalog_id,
    all_edge_case_descriptors_declared: edgeCaseKeys.every((key) => rows.some((row) => row.descriptor_key === key && row.edge_case_descriptor)),
    all_failure_recovery_bindings_declared: recoveryKeys.every(
      (key) => rows.some((row) => row.descriptor_key === key && row.failure_recovery_binding),
    ),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_edge_case_evidence.exposes_customer_surface === false &&
        row.internal_edge_case_evidence.exposes_internal_prompt === false &&
        row.internal_edge_case_evidence.exposes_internal_note === false &&
        row.internal_edge_case_evidence.exposes_review_route_dispatch === false &&
        row.internal_edge_case_evidence.exposes_approval_route_dispatch === false &&
        row.internal_edge_case_evidence.exposes_permission_rule === false &&
        row.internal_edge_case_evidence.exposes_foreign_tenant_id === false &&
        row.internal_edge_case_evidence.exposes_rule_candidates === false &&
        row.internal_edge_case_evidence.exposes_stale_payload === false,
    ),
    claude_edge_case_prompt_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "claude_edge_case_prompt" &&
        row.edge_case_descriptor?.read_only === true &&
        row.edge_case_descriptor?.sends_claude_prompt === false,
    ),
    human_escalation_note_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "human_escalation_note" &&
        row.edge_case_descriptor?.dispatches_review_route === false &&
        row.edge_case_descriptor?.writes_case_note === false,
    ),
    missing_tenant_failure_escalates: rows.some(
      (row) => row.descriptor_key === "missing_tenant_failure" && row.failure_recovery_binding?.escalation_required === true,
    ),
    cross_tenant_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "cross_tenant_failure" && row.failure_recovery_binding?.exposes_foreign_tenant_id === false,
    ),
    permission_denied_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "permission_denied_failure" && row.failure_recovery_binding?.exposes_permission_rule === false,
    ),
    ambiguous_rule_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "ambiguous_rule_failure" && row.failure_recovery_binding?.exposes_rule_candidates === false,
    ),
    stale_reference_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "stale_reference_failure" && row.failure_recovery_binding?.exposes_stale_payload === false,
    ),
    lock_retry_rollback_descriptor_only:
      rows.some((row) => row.descriptor_key === "lock_conflict_failure" && row.failure_recovery_binding?.acquires_runtime_lock === false) &&
      rows.some((row) => row.descriptor_key === "retry_exhaustion_failure" && row.failure_recovery_binding?.executes_retry === false) &&
      rows.some((row) => row.descriptor_key === "rollback_expectation" && row.failure_recovery_binding?.executes_rollback === false),
    blocked_claim_receipt_descriptor_only: rows.some(
      (row) => row.descriptor_key === "blocked_claim_receipt" && row.failure_recovery_binding?.emits_hermes_evidence === false,
    ),
    failure_fixture_synthetic_only: rows.some(
      (row) => row.descriptor_key === "failure_fixture" && row.failure_recovery_binding?.synthetic_only === true,
    ),
    failure_tests_descriptor_only: rows.some((row) => row.descriptor_key === "failure_unit_test") &&
      rows.some((row) => row.descriptor_key === "failure_integration_smoke"),
    audit_and_hermes_descriptors_only:
      rows.some((row) => row.descriptor_key === "audit_failure_hint" && row.failure_recovery_binding?.appends_audit_event === false) &&
      rows.some((row) => row.descriptor_key === "hermes_failure_evidence" && row.failure_recovery_binding?.emits_hermes_evidence === false),
    hermes_edge_case_escalation_packet: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.hermes_edge_case_escalation,
    claude_edge_case_escalation_review_packet:
      MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.claude_edge_case_escalation_review,
    closeout_handoff: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP170_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor(request = {}) {
  const descriptorKey = request.descriptor_key ?? request.failure_key ?? "missing_tenant_failure";
  const boundaryDescriptor = MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.boundary_descriptors[descriptorKey] ?? null;
  const entryFailureBinding = MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.entry_failure_bindings[descriptorKey] ?? null;
  const sourceDescriptorKey = boundaryDescriptor?.source_descriptor_key ?? entryFailureBinding?.source_descriptor_key ?? descriptorKey;
  const sourceEdgeCaseDescriptor = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
    descriptor_key: sourceDescriptorKey,
    source_test_key: request.source_test_key,
    scenario: request.scenario,
  });
  const category = boundaryDescriptor ? "sensitive_permission_audit_boundary" : "missing_scope_failure_boundary";
  const safeErrorCode =
    entryFailureBinding?.safe_error_code ??
    sourceEdgeCaseDescriptor.customer_facing_edge_case_summary?.safe_error_code ??
    "MASTER_DATA_VALIDATION_ERROR";
  const customerFacingSensitiveSummary = Object.freeze({
    descriptor_key: descriptorKey,
    category,
    safe_error_code: safeErrorCode,
    customer_visible: entryFailureBinding?.customer_visible ?? false,
    escalation_required: entryFailureBinding?.escalation_required ?? false,
    descriptor_only: true,
  });
  const internalSensitiveEvidence = Object.freeze({
    source_edge_case_escalation_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_edge_case_escalation_catalog_id,
    source_failure_taxonomy_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_failure_taxonomy_catalog_id,
    source_descriptor_key: sourceDescriptorKey,
    boundary_descriptor: boundaryDescriptor,
    entry_failure_binding: entryFailureBinding,
    source_edge_case_descriptor: sourceEdgeCaseDescriptor,
    exposes_customer_surface: false,
    exposes_internal_prompt: false,
    exposes_internal_note: false,
    exposes_review_route_dispatch: false,
    exposes_approval_route_dispatch: false,
    exposes_audit_payload: false,
    exposes_matter_payload: false,
    exposes_resource_payload: false,
    exposes_foreign_tenant_id: false,
    exposes_permission_rule: false,
  });
  const serializedCustomerFacingSensitiveSummary = JSON.stringify(customerFacingSensitiveSummary);

  return freezeFailureTaxonomySensitiveEntryBoundaryResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
    source_edge_case_escalation_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_edge_case_escalation_catalog_id,
    descriptor_key: descriptorKey,
    category,
    boundary_descriptor: boundaryDescriptor,
    entry_failure_binding: entryFailureBinding,
    source_edge_case_descriptor: sourceEdgeCaseDescriptor,
    customer_facing_sensitive_summary: customerFacingSensitiveSummary,
    internal_sensitive_evidence: internalSensitiveEvidence,
    customer_surface_excludes_internal_refs: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingSensitiveSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingSensitiveSummary.includes(value),
    ),
  });
}

export function createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog() {
  const boundaryKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.boundary_descriptors));
  const entryFailureKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.entry_failure_bindings));
  const descriptorKeys = Object.freeze([...boundaryKeys, ...entryFailureKeys]);
  const rows = Object.freeze(
    descriptorKeys.map((descriptorKey) => createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({ descriptor_key: descriptorKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_sensitive_summary));

  return freezeFailureTaxonomySensitiveEntryBoundaryResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
    sensitive_entry_boundary: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY,
    descriptor_keys: descriptorKeys,
    boundary_keys: boundaryKeys,
    entry_failure_keys: entryFailureKeys,
    descriptor_rows: rows,
    source_edge_case_escalation_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_edge_case_escalation_catalog_id,
    all_boundary_descriptors_declared: boundaryKeys.every(
      (key) => rows.some((row) => row.descriptor_key === key && row.boundary_descriptor),
    ),
    all_entry_failure_bindings_declared: entryFailureKeys.every(
      (key) => rows.some((row) => row.descriptor_key === key && row.entry_failure_binding),
    ),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_sensitive_evidence.exposes_customer_surface === false &&
        row.internal_sensitive_evidence.exposes_internal_prompt === false &&
        row.internal_sensitive_evidence.exposes_internal_note === false &&
        row.internal_sensitive_evidence.exposes_review_route_dispatch === false &&
        row.internal_sensitive_evidence.exposes_approval_route_dispatch === false &&
        row.internal_sensitive_evidence.exposes_audit_payload === false &&
        row.internal_sensitive_evidence.exposes_matter_payload === false &&
        row.internal_sensitive_evidence.exposes_resource_payload === false &&
        row.internal_sensitive_evidence.exposes_foreign_tenant_id === false &&
        row.internal_sensitive_evidence.exposes_permission_rule === false,
    ),
    audit_failure_hint_descriptor_only: rows.some(
      (row) => row.descriptor_key === "audit_failure_hint" && row.boundary_descriptor?.appends_audit_event === false,
    ),
    hermes_failure_evidence_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "hermes_failure_evidence" &&
        row.boundary_descriptor?.emits_hermes_evidence === false &&
        row.boundary_descriptor?.executes_hermes_command === false,
    ),
    claude_edge_case_prompt_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "claude_edge_case_prompt" &&
        row.boundary_descriptor?.read_only === true &&
        row.boundary_descriptor?.sends_claude_prompt === false,
    ),
    human_escalation_note_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "human_escalation_note" &&
        row.boundary_descriptor?.dispatches_review_route === false &&
        row.boundary_descriptor?.writes_case_note === false,
    ),
    missing_scope_failures_covered: [
      "missing_tenant_failure",
      "missing_actor_failure",
      "missing_matter_failure",
      "missing_resource_failure",
      "unknown_action_failure",
    ].every((key) => rows.some((row) => row.descriptor_key === key && row.entry_failure_binding)),
    missing_matter_resource_payloads_trimmed: rows.some(
      (row) => row.descriptor_key === "missing_matter_failure" && row.entry_failure_binding?.exposes_matter_payload === false,
    ) &&
      rows.some(
        (row) => row.descriptor_key === "missing_resource_failure" && row.entry_failure_binding?.exposes_resource_payload === false,
      ),
    hermes_sensitive_entry_boundary_packet:
      MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.hermes_sensitive_entry_boundary,
    claude_sensitive_entry_boundary_review_packet:
      MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.claude_sensitive_entry_boundary_review,
    closeout_handoff: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP171_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor(request = {}) {
  const descriptorKey = request.descriptor_key ?? request.failure_key ?? "cross_tenant_failure";
  const operationalBinding = MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.operational_failure_bindings[descriptorKey] ?? null;
  const sourceDescriptorKey = operationalBinding?.source_descriptor_key ?? descriptorKey;
  const sourceEdgeCaseDescriptor = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
    descriptor_key: sourceDescriptorKey,
    source_test_key: request.source_test_key,
    scenario: request.scenario,
  });
  const sourceSensitiveEntryCatalog = createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog();
  const safeErrorCode =
    operationalBinding?.safe_error_code ??
    sourceEdgeCaseDescriptor.customer_facing_edge_case_summary?.safe_error_code ??
    "MASTER_DATA_OPERATIONAL_FAILURE";
  const customerFacingOperationalSummary = Object.freeze({
    category: "operational_failure_boundary",
    safe_error_code: safeErrorCode,
    customer_visible: operationalBinding?.customer_visible ?? false,
    escalation_required: operationalBinding?.escalation_required ?? false,
    descriptor_only: true,
  });
  const internalOperationalEvidence = Object.freeze({
    source_sensitive_entry_boundary_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_sensitive_entry_boundary_catalog_id,
    source_edge_case_escalation_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_edge_case_escalation_catalog_id,
    source_failure_taxonomy_catalog_id: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_failure_taxonomy_catalog_id,
    source_descriptor_key: sourceDescriptorKey,
    operational_binding: operationalBinding,
    source_edge_case_descriptor: sourceEdgeCaseDescriptor,
    source_sensitive_entry_catalog: sourceSensitiveEntryCatalog,
    exposes_customer_surface: false,
    exposes_foreign_tenant_id: false,
    exposes_permission_rule: false,
    exposes_denied_item_payload: false,
    exposes_rule_candidates: false,
    exposes_stale_payload: false,
    exposes_retry_backoff: false,
    exposes_rollback_state: false,
    exposes_compensation_payload: false,
    exposes_blocked_claim: false,
    exposes_receipt_payload: false,
    exposes_fixture_payload: false,
    executes_retry: false,
    executes_rollback: false,
    acquires_runtime_lock: false,
    writes_product_state: false,
    emits_hermes_evidence: false,
    executes_hermes_command: false,
  });
  const serializedCustomerFacingOperationalSummary = JSON.stringify(customerFacingOperationalSummary);

  return freezeFailureTaxonomyOperationalEdgeBoundaryResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
    source_sensitive_entry_boundary_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_sensitive_entry_boundary_catalog_id,
    source_edge_case_escalation_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_edge_case_escalation_catalog_id,
    descriptor_key: descriptorKey,
    operational_binding: operationalBinding,
    source_edge_case_descriptor: sourceEdgeCaseDescriptor,
    customer_facing_operational_summary: customerFacingOperationalSummary,
    internal_operational_evidence: internalOperationalEvidence,
    customer_surface_excludes_internal_refs: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingOperationalSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingOperationalSummary.includes(value),
    ),
  });
}

export function createMasterDataFailureTaxonomyOperationalEdgeBoundaryCatalog() {
  const operationalKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.operational_failure_bindings));
  const rows = Object.freeze(
    operationalKeys.map((descriptorKey) => createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({ descriptor_key: descriptorKey })),
  );
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_operational_summary));

  return freezeFailureTaxonomyOperationalEdgeBoundaryResult({
    catalog_id: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
    operational_edge_boundary: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY,
    descriptor_keys: operationalKeys,
    descriptor_rows: rows,
    source_sensitive_entry_boundary_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_sensitive_entry_boundary_catalog_id,
    source_edge_case_escalation_catalog_id:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_edge_case_escalation_catalog_id,
    all_operational_bindings_declared: operationalKeys.every(
      (key) => rows.some((row) => row.descriptor_key === key && row.operational_binding),
    ),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_operational_evidence.exposes_customer_surface === false &&
        row.internal_operational_evidence.exposes_foreign_tenant_id === false &&
        row.internal_operational_evidence.exposes_permission_rule === false &&
        row.internal_operational_evidence.exposes_denied_item_payload === false &&
        row.internal_operational_evidence.exposes_rule_candidates === false &&
        row.internal_operational_evidence.exposes_stale_payload === false &&
        row.internal_operational_evidence.exposes_retry_backoff === false &&
        row.internal_operational_evidence.exposes_rollback_state === false &&
        row.internal_operational_evidence.exposes_compensation_payload === false &&
        row.internal_operational_evidence.exposes_blocked_claim === false &&
        row.internal_operational_evidence.exposes_receipt_payload === false &&
        row.internal_operational_evidence.exposes_fixture_payload === false,
    ),
    cross_tenant_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "cross_tenant_failure" && row.operational_binding?.exposes_foreign_tenant_id === false,
    ),
    permission_denied_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "permission_denied_failure" && row.operational_binding?.exposes_permission_rule === false,
    ),
    ambiguous_rule_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "ambiguous_rule_failure" && row.operational_binding?.exposes_rule_candidates === false,
    ),
    stale_reference_failure_trimmed: rows.some(
      (row) => row.descriptor_key === "stale_reference_failure" && row.operational_binding?.exposes_stale_payload === false,
    ),
    lock_retry_rollback_descriptor_only: rows.some(
      (row) => row.descriptor_key === "lock_conflict_failure" && row.operational_binding?.acquires_runtime_lock === false,
    ) &&
      rows.some((row) => row.descriptor_key === "retry_exhaustion_failure" && row.operational_binding?.executes_retry === false) &&
      rows.some((row) => row.descriptor_key === "rollback_expectation" && row.operational_binding?.executes_rollback === false),
    compensation_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "compensation_expectation" &&
        row.operational_binding?.executes_compensation === false &&
        row.operational_binding?.writes_case_note === false,
    ),
    blocked_claim_receipt_descriptor_only: rows.some(
      (row) =>
        row.descriptor_key === "blocked_claim_receipt" &&
        row.operational_binding?.emits_hermes_evidence === false &&
        row.operational_binding?.executes_hermes_command === false,
    ),
    failure_fixture_synthetic_only: rows.some(
      (row) =>
        row.descriptor_key === "failure_fixture" &&
        row.operational_binding?.synthetic_fixture_only === true &&
        row.operational_binding?.loads_real_client_data === false,
    ),
    hermes_operational_edge_boundary_packet:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.hermes_operational_edge_boundary,
    claude_operational_edge_boundary_review_packet:
      MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.claude_operational_edge_boundary_review,
    closeout_handoff: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP172_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor(request = {}) {
  const sectionKey = request.section_key ?? "failure_fixture_test_tail";
  const bridgeSection = Object.hasOwn(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections, sectionKey)
    ? MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections[sectionKey]
    : null;
  const customerFacingBridgeSummary = Object.freeze({
    section_key: sectionKey,
    section_id: bridgeSection?.section_id ?? "cp173_unknown_bridge_section",
    phase_scope: bridgeSection?.phase_scope ?? Object.freeze([]),
    micro_phase_scope: bridgeSection?.micro_phase_scope ?? Object.freeze([]),
    unit_count: bridgeSection?.unit_count ?? 0,
    summary_only: true,
    descriptor_only: true,
    safe_for_customer_surface: true,
  });
  const serializedCustomerFacingBridgeSummary = JSON.stringify(customerFacingBridgeSummary);

  return freezeFailureEvidenceReviewHandoffBridgeResult({
    catalog_id: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
    section_key: sectionKey,
    bridge_section: bridgeSection,
    source_catalog_refs: Object.freeze([
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_operational_edge_boundary_catalog_id,
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_sensitive_entry_boundary_catalog_id,
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_failure_taxonomy_catalog_id,
    ]),
    customer_facing_bridge_summary: customerFacingBridgeSummary,
    internal_bridge_evidence: Object.freeze({
      source_operational_edge_boundary_catalog_id:
        MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_operational_edge_boundary_catalog_id,
      source_sensitive_entry_boundary_catalog_id:
        MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_sensitive_entry_boundary_catalog_id,
      source_failure_taxonomy_catalog_id:
        MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_failure_taxonomy_catalog_id,
      emits_hermes_evidence: false,
      executes_hermes_command: false,
      sends_claude_prompt: false,
      executes_claude_review: false,
      evaluates_runtime_permission: false,
      appends_audit_event: false,
      executes_primary_workflow: false,
      executes_secondary_workflow: false,
      loads_real_client_data: false,
      exposes_customer_surface: false,
      exposes_permission_rule: false,
      exposes_audit_payload: false,
      exposes_hermes_command_payload: false,
      exposes_claude_prompt_payload: false,
    }),
    customer_surface_excludes_internal_refs: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingBridgeSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingBridgeSummary.includes(value),
    ),
  });
}

export function createMasterDataFailureEvidenceReviewHandoffBridgeCatalog() {
  const sectionKeys = Object.freeze(Object.keys(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections));
  const rows = Object.freeze(sectionKeys.map((sectionKey) => createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({ section_key: sectionKey })));
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_bridge_summary));

  return freezeFailureEvidenceReviewHandoffBridgeResult({
    catalog_id: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
    bridge: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE,
    descriptor_keys: sectionKeys,
    descriptor_rows: rows,
    source_operational_edge_boundary_catalog_id:
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_operational_edge_boundary_catalog_id,
    all_bridge_sections_declared: sectionKeys.every((key) => rows.some((row) => row.section_key === key && row.bridge_section)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_bridge_evidence.exposes_customer_surface === false &&
        row.internal_bridge_evidence.exposes_permission_rule === false &&
        row.internal_bridge_evidence.exposes_audit_payload === false &&
        row.internal_bridge_evidence.exposes_hermes_command_payload === false &&
        row.internal_bridge_evidence.exposes_claude_prompt_payload === false,
    ),
    hermes_packet_descriptor_only:
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.hermes_evidence_packet.emits_hermes_evidence === false &&
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.hermes_evidence_packet.executes_hermes_command === false,
    claude_packet_descriptor_only:
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.claude_review_packet.read_only === true &&
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.claude_review_packet.sends_claude_prompt === false &&
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.claude_review_packet.executes_claude_review === false,
    permission_audit_entry_deferred_to_cp174:
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.rp08_permission_audit_entry_boundary.next_sensitive_pack_id ===
      MASTER_DATA_CP173_PACK_BINDING.next_pack_id,
    rp08_workflow_receipts_descriptor_only:
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.rp08_primary_secondary_workflow_receipts.executes_primary_workflow === false &&
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.rp08_primary_secondary_workflow_receipts.executes_secondary_workflow === false &&
      MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections.rp08_primary_secondary_workflow_receipts.emits_hermes_evidence === false,
    evidence_packet: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.hermes_failure_evidence_review_handoff_bridge,
    review_packet: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.claude_failure_evidence_review_handoff_bridge_review,
    closeout_handoff: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP173_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor(request = {}) {
  const sectionKey = request.section_key ?? "block_semantics";
  const boundarySection = Object.hasOwn(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections, sectionKey)
    ? MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections[sectionKey]
    : null;
  const customerFacingBoundarySummary = Object.freeze({
    section_key: sectionKey,
    section_id: boundarySection?.section_id ?? "cp174_unknown_sensitive_tail_section",
    unit_id: boundarySection?.unit_id ?? null,
    safe_outcome_code: boundarySection?.safe_outcome_code ?? "MASTER_DATA_PERMISSION_AUDIT_DESCRIPTOR_ONLY",
    summary_only: true,
    descriptor_only: true,
    safe_for_customer_surface: true,
  });
  const serializedCustomerFacingBoundarySummary = JSON.stringify(customerFacingBoundarySummary);

  return freezePermissionAuditSensitiveTailBoundaryResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
    section_key: sectionKey,
    boundary_section: boundarySection,
    source_catalog_refs: Object.freeze([
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_failure_evidence_review_handoff_bridge_catalog_id,
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_permission_audit_binding_id,
    ]),
    customer_facing_boundary_summary: customerFacingBoundarySummary,
    internal_boundary_evidence: Object.freeze({
      source_failure_evidence_review_handoff_bridge_catalog_id:
        MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_failure_evidence_review_handoff_bridge_catalog_id,
      source_permission_audit_binding_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_permission_audit_binding_id,
      emits_hermes_evidence: false,
      executes_hermes_command: false,
      sends_claude_prompt: false,
      executes_claude_review: false,
      evaluates_runtime_permission: false,
      appends_audit_event: false,
      dispatches_review_route: false,
      dispatches_approval_route: false,
      loads_real_client_data: false,
      exposes_customer_surface: false,
      exposes_permission_rule: false,
      exposes_audit_payload: false,
      exposes_runtime_permission_result: false,
      exposes_hermes_command_payload: false,
      exposes_changed_file_diff: false,
    }),
    customer_surface_excludes_internal_refs: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingBoundarySummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingBoundarySummary.includes(value),
    ),
  });
}

export function createMasterDataPermissionAuditSensitiveTailBoundaryCatalog() {
  const sectionKeys = Object.freeze(Object.keys(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections));
  const rows = Object.freeze(sectionKeys.map((sectionKey) => createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({ section_key: sectionKey })));
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_boundary_summary));

  return freezePermissionAuditSensitiveTailBoundaryResult({
    catalog_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
    boundary: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY,
    descriptor_keys: sectionKeys,
    descriptor_rows: rows,
    source_failure_evidence_review_handoff_bridge_catalog_id:
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_failure_evidence_review_handoff_bridge_catalog_id,
    source_permission_audit_binding_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_permission_audit_binding_id,
    all_boundary_sections_declared: sectionKeys.every((key) => rows.some((row) => row.section_key === key && row.boundary_section)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_boundary_evidence.exposes_customer_surface === false &&
        row.internal_boundary_evidence.exposes_permission_rule === false &&
        row.internal_boundary_evidence.exposes_audit_payload === false &&
        row.internal_boundary_evidence.exposes_runtime_permission_result === false &&
        row.internal_boundary_evidence.exposes_hermes_command_payload === false &&
        row.internal_boundary_evidence.exposes_changed_file_diff === false,
    ),
    block_semantics_descriptor_only:
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.block_semantics.evaluates_runtime_permission === false &&
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.block_semantics.appends_audit_event === false,
    hermes_command_matrix_descriptor_only:
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.hermes_command_matrix.executes_hermes_command === false &&
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.hermes_command_matrix.emits_hermes_evidence === false,
    evidence_field_list_customer_safe:
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.evidence_field_list.exposes_internal_only_fields === false,
    changed_file_receipt_summary_only:
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.changed_file_receipt.records_diff_summary_only === true &&
      MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections.changed_file_receipt.embeds_diff_content === false,
    evidence_packet: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.hermes_permission_audit_sensitive_tail_boundary,
    review_packet: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.claude_permission_audit_sensitive_tail_boundary_review,
    closeout_handoff: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP174_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataEvidenceReviewUiReadinessBridgeDescriptor(request = {}) {
  const sectionKey = request.section_key ?? "rp08_fixture_evidence_receipts";
  const bridgeSection = Object.hasOwn(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections, sectionKey)
    ? MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections[sectionKey]
    : null;
  const customerFacingReadinessSummary = Object.freeze({
    section_key: sectionKey,
    section_id: bridgeSection?.section_id ?? "cp175_unknown_evidence_review_ui_readiness_section",
    unit_range: bridgeSection?.unit_range ?? null,
    unit_count: bridgeSection?.unit_count ?? 0,
    summary_only: true,
    descriptor_only: true,
    safe_for_customer_surface: true,
  });
  const serializedCustomerFacingReadinessSummary = JSON.stringify(customerFacingReadinessSummary);

  return freezeEvidenceReviewUiReadinessBridgeResult({
    catalog_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
    section_key: sectionKey,
    bridge_section: bridgeSection,
    source_catalog_refs: Object.freeze([
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_sensitive_tail_boundary_catalog_id,
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_failure_evidence_review_handoff_bridge_catalog_id,
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_binding_id,
    ]),
    customer_facing_readiness_summary: customerFacingReadinessSummary,
    internal_readiness_evidence: Object.freeze({
      source_permission_audit_sensitive_tail_boundary_catalog_id:
        MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_sensitive_tail_boundary_catalog_id,
      source_failure_evidence_review_handoff_bridge_catalog_id:
        MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_failure_evidence_review_handoff_bridge_catalog_id,
      source_permission_audit_binding_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_binding_id,
      emits_hermes_evidence: false,
      executes_hermes_command: false,
      sends_claude_prompt: false,
      executes_claude_review: false,
      evaluates_runtime_permission: false,
      appends_audit_event: false,
      dispatches_review_route: false,
      dispatches_approval_route: false,
      loads_real_client_data: false,
      renders_ui: false,
      mutates_dom: false,
      exposes_customer_surface: false,
      exposes_permission_rule: false,
      exposes_audit_payload: false,
      exposes_runtime_permission_result: false,
      exposes_hermes_command_payload: false,
      exposes_claude_prompt_payload: false,
      exposes_changed_file_diff: false,
      exposes_ui_leak_payload: false,
      exposes_review_payload: false,
    }),
    customer_surface_excludes_internal_refs: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingReadinessSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingReadinessSummary.includes(value),
    ),
  });
}

export function createMasterDataEvidenceReviewUiReadinessBridgeCatalog() {
  const sectionKeys = Object.freeze(Object.keys(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections));
  const rows = Object.freeze(sectionKeys.map((sectionKey) => createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({ section_key: sectionKey })));
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_readiness_summary));
  const sectionUnitTotal = Object.values(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );

  return freezeEvidenceReviewUiReadinessBridgeResult({
    catalog_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
    bridge: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE,
    descriptor_keys: sectionKeys,
    descriptor_rows: rows,
    source_permission_audit_sensitive_tail_boundary_catalog_id:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_sensitive_tail_boundary_catalog_id,
    source_failure_evidence_review_handoff_bridge_catalog_id:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_failure_evidence_review_handoff_bridge_catalog_id,
    source_permission_audit_binding_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_binding_id,
    section_unit_total: sectionUnitTotal,
    all_bridge_sections_declared: sectionKeys.every((key) => rows.some((row) => row.section_key === key && row.bridge_section)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_readiness_evidence.exposes_customer_surface === false &&
        row.internal_readiness_evidence.exposes_permission_rule === false &&
        row.internal_readiness_evidence.exposes_audit_payload === false &&
        row.internal_readiness_evidence.exposes_runtime_permission_result === false &&
        row.internal_readiness_evidence.exposes_hermes_command_payload === false &&
        row.internal_readiness_evidence.exposes_claude_prompt_payload === false &&
        row.internal_readiness_evidence.exposes_changed_file_diff === false &&
        row.internal_readiness_evidence.exposes_ui_leak_payload === false &&
        row.internal_readiness_evidence.exposes_review_payload === false,
    ),
    hermes_packet_descriptor_only:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp08_hermes_evidence_packet.executes_hermes_command === false &&
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp08_hermes_evidence_packet.emits_hermes_evidence === false,
    claude_packet_descriptor_only:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp08_review_closeout_tail.sends_claude_prompt === false &&
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp08_review_closeout_tail.executes_claude_review === false,
    permission_audit_binding_descriptor_only:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp09_permission_audit_binding.evaluates_runtime_permission === false &&
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp09_permission_audit_binding.appends_audit_event === false,
    ui_leak_questions_descriptor_only:
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp09_fixture_review_questions.renders_ui === false &&
      MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections.rp09_fixture_review_questions.exposes_ui_leak_payload === false,
    evidence_packet: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.hermes_evidence_review_ui_readiness_bridge,
    review_packet: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.claude_evidence_review_ui_readiness_bridge_review,
    closeout_handoff: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP175_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataTerminalReviewCloseoutReadinessDescriptor(request = {}) {
  const sectionKey = request.section_key ?? "rp09_test_golden_closeout_tail";
  const terminalSection = Object.hasOwn(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections, sectionKey)
    ? MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections[sectionKey]
    : null;
  const customerFacingTerminalSummary = Object.freeze({
    section_key: sectionKey,
    section_id: terminalSection?.section_id ?? "cp176_unknown_terminal_review_closeout_section",
    unit_range: terminalSection?.unit_range ?? null,
    unit_count: terminalSection?.unit_count ?? 0,
    summary_only: true,
    descriptor_only: true,
    safe_for_customer_surface: true,
  });
  const serializedCustomerFacingTerminalSummary = JSON.stringify(customerFacingTerminalSummary);

  return freezeTerminalReviewCloseoutReadinessResult({
    catalog_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.catalog_id,
    section_key: sectionKey,
    terminal_section: terminalSection,
    source_catalog_refs: Object.freeze([
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_evidence_review_ui_readiness_bridge_catalog_id,
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_sensitive_tail_boundary_catalog_id,
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_binding_id,
    ]),
    customer_facing_terminal_summary: customerFacingTerminalSummary,
    internal_terminal_evidence: Object.freeze({
      source_evidence_review_ui_readiness_bridge_catalog_id:
        MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_evidence_review_ui_readiness_bridge_catalog_id,
      source_permission_audit_sensitive_tail_boundary_catalog_id:
        MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_sensitive_tail_boundary_catalog_id,
      source_permission_audit_binding_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_binding_id,
      emits_hermes_evidence: false,
      executes_hermes_command: false,
      sends_claude_prompt: false,
      executes_claude_review: false,
      evaluates_runtime_permission: false,
      appends_audit_event: false,
      dispatches_review_route: false,
      dispatches_approval_route: false,
      loads_real_client_data: false,
      renders_ui: false,
      mutates_dom: false,
      writes_case_note: false,
      exposes_customer_surface: false,
      exposes_permission_rule: false,
      exposes_audit_payload: false,
      exposes_runtime_permission_result: false,
      exposes_hermes_command_payload: false,
      exposes_claude_prompt_payload: false,
      exposes_changed_file_diff: false,
      exposes_ui_leak_payload: false,
      exposes_review_payload: false,
      exposes_finding_route_payload: false,
      exposes_next_rp_dependency_payload: false,
    }),
    customer_surface_excludes_internal_refs: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.leak_guard.internal_reference_fields.every(
      (field) => !Object.hasOwn(customerFacingTerminalSummary, field),
    ),
    prohibited_output_absent: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.leak_guard.prohibited_outputs.every(
      (value) => !serializedCustomerFacingTerminalSummary.includes(value),
    ),
  });
}

export function createMasterDataTerminalReviewCloseoutReadinessCatalog() {
  const sectionKeys = Object.freeze(Object.keys(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections));
  const rows = Object.freeze(sectionKeys.map((sectionKey) => createMasterDataTerminalReviewCloseoutReadinessDescriptor({ section_key: sectionKey })));
  const customerFacingRows = JSON.stringify(rows.map((row) => row.customer_facing_terminal_summary));
  const sectionUnitTotal = Object.values(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );

  return freezeTerminalReviewCloseoutReadinessResult({
    catalog_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.catalog_id,
    readiness: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS,
    descriptor_keys: sectionKeys,
    descriptor_rows: rows,
    source_evidence_review_ui_readiness_bridge_catalog_id:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_evidence_review_ui_readiness_bridge_catalog_id,
    source_permission_audit_sensitive_tail_boundary_catalog_id:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_sensitive_tail_boundary_catalog_id,
    source_permission_audit_binding_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_binding_id,
    section_unit_total: sectionUnitTotal,
    all_terminal_sections_declared: sectionKeys.every((key) => rows.some((row) => row.section_key === key && row.terminal_section)),
    all_no_write: rows.every(
      (row) =>
        row.writes_product_state === false &&
        row.evaluates_runtime_permission === false &&
        row.appends_audit_event === false &&
        row.executes_api_handler === false &&
        row.renders_ui === false &&
        row.mutates_dom === false &&
        row.executes_ai_retrieval === false &&
        row.emits_hermes_evidence === false &&
        row.executes_hermes_command === false &&
        row.executes_claude_review === false &&
        row.sends_claude_prompt === false &&
        row.dispatches_review_route === false &&
        row.dispatches_approval_route === false &&
        row.executes_retry === false &&
        row.executes_rollback === false &&
        row.acquires_runtime_lock === false &&
        row.writes_case_note === false,
    ),
    all_customer_surfaces_trimmed: rows.every(
      (row) => row.customer_surface_excludes_internal_refs === true && row.prohibited_output_absent === true,
    ),
    all_internal_refs_evidence_only: rows.every(
      (row) =>
        row.internal_terminal_evidence.exposes_customer_surface === false &&
        row.internal_terminal_evidence.exposes_permission_rule === false &&
        row.internal_terminal_evidence.exposes_audit_payload === false &&
        row.internal_terminal_evidence.exposes_runtime_permission_result === false &&
        row.internal_terminal_evidence.exposes_hermes_command_payload === false &&
        row.internal_terminal_evidence.exposes_claude_prompt_payload === false &&
        row.internal_terminal_evidence.exposes_changed_file_diff === false &&
        row.internal_terminal_evidence.exposes_ui_leak_payload === false &&
        row.internal_terminal_evidence.exposes_review_payload === false &&
        row.internal_terminal_evidence.exposes_finding_route_payload === false &&
        row.internal_terminal_evidence.exposes_next_rp_dependency_payload === false,
    ),
    terminal_closeout_descriptor_only:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_test_golden_closeout_tail.sends_claude_prompt === false &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_test_golden_closeout_tail.writes_case_note === false,
    hermes_terminal_questions_descriptor_only:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_hermes_review_questions.executes_hermes_command === false &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_hermes_review_questions.emits_hermes_evidence === false,
    claude_terminal_questions_descriptor_only:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_claude_review_questions.sends_claude_prompt === false &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_claude_review_questions.executes_claude_review === false,
    rp05_handoff_descriptor_only:
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_closeout_handoff_questions.to_pack_id ===
        MASTER_DATA_CP176_PACK_BINDING.next_pack_id &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_closeout_handoff_questions.next_subphase_id ===
        MASTER_DATA_CP176_PACK_BINDING.next_subphase_id &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_closeout_handoff_questions.evaluates_runtime_permission === false &&
      MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections.rp09_closeout_handoff_questions.appends_audit_event === false,
    evidence_packet: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.hermes_terminal_review_closeout_readiness,
    review_packet: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.claude_terminal_review_closeout_readiness_review,
    closeout_handoff: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.closeout_handoff,
    prohibited_output_absent: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.leak_guard.prohibited_outputs.every(
      (value) => !customerFacingRows.includes(value),
    ),
    next_pack_id: MASTER_DATA_CP176_PACK_BINDING.next_pack_id,
  });
}
