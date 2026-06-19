import {
  createDmsDocument,
  createDmsDocumentRelation,
  createDmsDocumentVersion,
  createDmsEmailThread,
  createDmsExtractedText,
  createDmsFileObject,
  createDmsFolder,
  createDmsOcrResult,
  createDmsRendition,
  createDmsWorkspace,
  getDmsCoreModelDefinition,
  listDmsCoreModelTypes,
} from "./model.js";
import {
  DMS_CORE_CP198_NO_WRITE_ATTESTATION,
  DMS_CORE_CP198_PACK_BINDING,
  DMS_CORE_CP198_REQUIREMENTS,
  DMS_CORE_CP199_NO_WRITE_ATTESTATION,
  DMS_CORE_CP199_PACK_BINDING,
  DMS_CORE_CP199_REQUIREMENTS,
  DMS_CORE_CP200_NO_WRITE_ATTESTATION,
  DMS_CORE_CP200_PACK_BINDING,
  DMS_CORE_CP200_REQUIREMENTS,
  DMS_CORE_CP201_NO_WRITE_ATTESTATION,
  DMS_CORE_CP201_PACK_BINDING,
  DMS_CORE_CP201_REQUIREMENTS,
  DMS_CORE_CP202_NO_WRITE_ATTESTATION,
  DMS_CORE_CP202_PACK_BINDING,
  DMS_CORE_CP202_REQUIREMENTS,
  DMS_CORE_CP203_NO_WRITE_ATTESTATION,
  DMS_CORE_CP203_PACK_BINDING,
  DMS_CORE_CP203_REQUIREMENTS,
  DMS_CORE_CP204_NO_WRITE_ATTESTATION,
  DMS_CORE_CP204_PACK_BINDING,
  DMS_CORE_CP204_REQUIREMENTS,
  DMS_CORE_CP205_NO_WRITE_ATTESTATION,
  DMS_CORE_CP205_PACK_BINDING,
  DMS_CORE_CP205_REQUIREMENTS,
  DMS_CORE_CP206_NO_WRITE_ATTESTATION,
  DMS_CORE_CP206_PACK_BINDING,
  DMS_CORE_CP206_REQUIREMENTS,
  DMS_CORE_CP207_NO_WRITE_ATTESTATION,
  DMS_CORE_CP207_PACK_BINDING,
  DMS_CORE_CP207_REQUIREMENTS,
  DMS_CORE_CP208_NO_WRITE_ATTESTATION,
  DMS_CORE_CP208_PACK_BINDING,
  DMS_CORE_CP208_REQUIREMENTS,
  DMS_CORE_CP209_NO_WRITE_ATTESTATION,
  DMS_CORE_CP209_PACK_BINDING,
  DMS_CORE_CP209_REQUIREMENTS,
  DMS_CORE_CP210_NO_WRITE_ATTESTATION,
  DMS_CORE_CP210_PACK_BINDING,
  DMS_CORE_CP210_REQUIREMENTS,
  DMS_CORE_CP211_NO_WRITE_ATTESTATION,
  DMS_CORE_CP211_PACK_BINDING,
  DMS_CORE_CP211_REQUIREMENTS,
  DMS_CORE_CP212_NO_WRITE_ATTESTATION,
  DMS_CORE_CP212_PACK_BINDING,
  DMS_CORE_CP212_REQUIREMENTS,
  DMS_CORE_CP213_NO_WRITE_ATTESTATION,
  DMS_CORE_CP213_PACK_BINDING,
  DMS_CORE_CP213_REQUIREMENTS,
  DMS_CORE_CP214_NO_WRITE_ATTESTATION,
  DMS_CORE_CP214_PACK_BINDING,
  DMS_CORE_CP214_REQUIREMENTS,
  DMS_CORE_CP215_NO_WRITE_ATTESTATION,
  DMS_CORE_CP215_PACK_BINDING,
  DMS_CORE_CP215_REQUIREMENTS,
  DMS_CORE_CP216_NO_WRITE_ATTESTATION,
  DMS_CORE_CP216_PACK_BINDING,
  DMS_CORE_CP216_REQUIREMENTS,
  DMS_CORE_CP217_NO_WRITE_ATTESTATION,
  DMS_CORE_CP217_PACK_BINDING,
  DMS_CORE_CP217_REQUIREMENTS,
  DMS_CORE_CP218_NO_WRITE_ATTESTATION,
  DMS_CORE_CP218_PACK_BINDING,
  DMS_CORE_CP218_REQUIREMENTS,
  DMS_CORE_CP219_NO_WRITE_ATTESTATION,
  DMS_CORE_CP219_PACK_BINDING,
  DMS_CORE_CP219_REQUIREMENTS,
  DMS_CORE_CP220_NO_WRITE_ATTESTATION,
  DMS_CORE_CP220_PACK_BINDING,
  DMS_CORE_CP220_REQUIREMENTS,
  DMS_CORE_CP221_NO_WRITE_ATTESTATION,
  DMS_CORE_CP221_PACK_BINDING,
  DMS_CORE_CP221_REQUIREMENTS,
  DMS_CORE_CP222_NO_WRITE_ATTESTATION,
  DMS_CORE_CP222_PACK_BINDING,
  DMS_CORE_CP222_REQUIREMENTS,
  DMS_CORE_CP223_NO_WRITE_ATTESTATION,
  DMS_CORE_CP223_PACK_BINDING,
  DMS_CORE_CP223_REQUIREMENTS,
  DMS_CORE_CP224_NO_WRITE_ATTESTATION,
  DMS_CORE_CP224_PACK_BINDING,
  DMS_CORE_CP224_REQUIREMENTS,
  DMS_CORE_CP225_NO_WRITE_ATTESTATION,
  DMS_CORE_CP225_PACK_BINDING,
  DMS_CORE_CP225_REQUIREMENTS,
  DMS_CORE_CP226_NO_WRITE_ATTESTATION,
  DMS_CORE_CP226_PACK_BINDING,
  DMS_CORE_CP226_REQUIREMENTS,
  DMS_CORE_CP227_NO_WRITE_ATTESTATION,
  DMS_CORE_CP227_PACK_BINDING,
  DMS_CORE_CP227_REQUIREMENTS,
  DMS_CORE_CP228_NO_WRITE_ATTESTATION,
  DMS_CORE_CP228_PACK_BINDING,
  DMS_CORE_CP228_REQUIREMENTS,
  DMS_CORE_CP229_NO_WRITE_ATTESTATION,
  DMS_CORE_CP229_PACK_BINDING,
  DMS_CORE_CP229_REQUIREMENTS,
  DMS_CORE_CP230_NO_WRITE_ATTESTATION,
  DMS_CORE_CP230_PACK_BINDING,
  DMS_CORE_CP230_REQUIREMENTS,
  DMS_CORE_CP231_NO_WRITE_ATTESTATION,
  DMS_CORE_CP231_PACK_BINDING,
  DMS_CORE_CP231_REQUIREMENTS,
  DMS_CORE_CP232_NO_WRITE_ATTESTATION,
  DMS_CORE_CP232_PACK_BINDING,
  DMS_CORE_CP232_REQUIREMENTS,
  DMS_CORE_CP233_NO_WRITE_ATTESTATION,
  DMS_CORE_CP233_PACK_BINDING,
  DMS_CORE_CP233_REQUIREMENTS,
  DMS_CORE_CP234_NO_WRITE_ATTESTATION,
  DMS_CORE_CP234_PACK_BINDING,
  DMS_CORE_CP234_REQUIREMENTS,
  DMS_CORE_OPTIONAL_FIELD_REGISTRY,
  DMS_CORE_PROGRAM_CONTRACT,
  DMS_CORE_REFERENCE_RELATIONSHIP_MAP,
  DMS_CORE_REQUIRED_FIELD_REGISTRY,
  DMS_CORE_SERIALIZATION_SHAPE,
  DMS_CORE_STATE_TRANSITION_MAP,
} from "./registry.js";

function freezeResult(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP198_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    executes_ocr: false,
    executes_search_indexing: false,
    executes_email_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    no_write_attestation: DMS_CORE_CP198_NO_WRITE_ATTESTATION,
  });
}

function freezeCp199Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP199_PACK_BINDING.pack_id,
    source_foundation_pack_id: DMS_CORE_CP199_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    executes_state_transition: false,
    dispatches_serialization_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    no_write_attestation: DMS_CORE_CP199_NO_WRITE_ATTESTATION,
  });
}

function freezeCp200Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP200_PACK_BINDING.pack_id,
    source_type_shape_pack_id: DMS_CORE_CP200_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    executes_state_transition: false,
    dispatches_serialization_runtime: false,
    dispatches_permission_runtime: false,
    dispatches_audit_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_permission_envelope_payload: false,
    exposes_audit_trace_payload: false,
    no_write_attestation: DMS_CORE_CP200_NO_WRITE_ATTESTATION,
  });
}

function freezeCp201Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP201_PACK_BINDING.pack_id,
    source_permission_audit_pack_id: DMS_CORE_CP201_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    executes_primary_happy_path_runtime: false,
    executes_secondary_workflow_runtime: false,
    executes_state_transition: false,
    dispatches_permission_runtime: false,
    dispatches_audit_runtime: false,
    persists_idempotency_key: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_permission_envelope_payload: false,
    exposes_audit_trace_payload: false,
    no_write_attestation: DMS_CORE_CP201_NO_WRITE_ATTESTATION,
  });
}

function freezeCp202Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP202_PACK_BINDING.pack_id,
    source_service_contract_pack_id: DMS_CORE_CP202_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_primary_workflow_runtime: false,
    dispatches_secondary_workflow_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_permission_envelope_payload: false,
    exposes_audit_trace_payload: false,
    no_write_attestation: DMS_CORE_CP202_NO_WRITE_ATTESTATION,
  });
}

function freezeCp203Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP203_PACK_BINDING.pack_id,
    source_workflow_pack_id: DMS_CORE_CP203_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_primary_workflow_runtime: false,
    dispatches_secondary_workflow_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_rollback_runtime: false,
    dispatches_retry_runtime: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_permission_envelope_payload: false,
    exposes_audit_trace_payload: false,
    exposes_blocked_claim_detail: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP203_NO_WRITE_ATTESTATION,
  });
}

function freezeCp204Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP204_PACK_BINDING.pack_id,
    source_sensitive_tail_pack_id: DMS_CORE_CP204_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_primary_workflow_runtime: false,
    dispatches_secondary_workflow_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_permission_audit_gate_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP204_NO_WRITE_ATTESTATION,
  });
}

function freezeCp205Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP205_PACK_BINDING.pack_id,
    source_permission_audit_workflow_pack_id: DMS_CORE_CP205_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_permission_audit_gate_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP205_NO_WRITE_ATTESTATION,
  });
}

function freezeCp206Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP206_PACK_BINDING.pack_id,
    source_permission_audit_tail_pack_id: DMS_CORE_CP206_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_permission_audit_gate_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    dispatches_fixture_service_runtime: false,
    executes_review_path_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP206_NO_WRITE_ATTESTATION,
  });
}

function freezeCp207Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP207_PACK_BINDING.pack_id,
    source_synthetic_fixture_service_pack_id: DMS_CORE_CP207_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_permission_audit_gate_runtime: false,
    dispatches_primary_fixture_runtime: false,
    dispatches_secondary_fixture_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    dispatches_fixture_service_runtime: false,
    executes_review_path_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_state_transition_payload: false,
    exposes_idempotency_key_material: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP207_NO_WRITE_ATTESTATION,
  });
}

function freezeCp208Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP208_PACK_BINDING.pack_id,
    source_synthetic_fixture_workflow_pack_id: DMS_CORE_CP208_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_permission_audit_gate_runtime: false,
    dispatches_primary_fixture_runtime: false,
    dispatches_secondary_fixture_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    dispatches_fixture_service_runtime: false,
    executes_review_path_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_state_transition_payload: false,
    exposes_idempotency_key_material: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_blocked_claim_detail: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP208_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreSyntheticFixture(input = {}) {
  const tenantId = input.tenant_id ?? "tenant_rp06_synthetic";
  const matterId = input.matter_id ?? "matter_rp06_synthetic_opening";
  const permissionEnvelopeId = input.permission_envelope_id ?? "perm_rp06_synthetic_dms";
  const auditTraceId = input.audit_trace_id ?? "audit_rp06_synthetic_dms";
  const workspace = createDmsWorkspace({
    workspace_id: "workspace_rp06_synthetic",
    tenant_id: tenantId,
    matter_id: matterId,
    name: "Synthetic Matter Workspace",
    status: "active",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const folder = createDmsFolder({
    folder_id: workspace.root_folder_id,
    tenant_id: tenantId,
    matter_id: matterId,
    workspace_id: workspace.workspace_id,
    name: "Root",
    status: "active",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const fileObject = createDmsFileObject({
    file_object_id: "fileobj_rp06_synthetic_v1",
    tenant_id: tenantId,
    matter_id: matterId,
    storage_pointer_ref: "object-store-ref:reserved-no-read",
    sha256: "0".repeat(64),
    byte_size: 0,
    mime_type: "application/pdf",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const version = createDmsDocumentVersion({
    version_id: "docver_rp06_synthetic_v1",
    document_id: "doc_rp06_synthetic",
    tenant_id: tenantId,
    matter_id: matterId,
    version_number: 1,
    status: "current",
    file_object_id: fileObject.file_object_id,
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const document = createDmsDocument({
    document_id: version.document_id,
    tenant_id: tenantId,
    matter_id: matterId,
    workspace_id: workspace.workspace_id,
    folder_id: folder.folder_id,
    title: "Synthetic Evidence Document",
    status: "active",
    current_version_id: version.version_id,
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const rendition = createDmsRendition({
    rendition_id: "rendition_rp06_synthetic_preview",
    tenant_id: tenantId,
    matter_id: matterId,
    version_id: version.version_id,
    rendition_type: "preview_reserved",
    status: "draft",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const extractedText = createDmsExtractedText({
    extracted_text_id: "text_rp06_synthetic",
    tenant_id: tenantId,
    matter_id: matterId,
    version_id: version.version_id,
    source_policy: "reserved_for_rp07_search",
    status: "not_reviewed",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const ocrResult = createDmsOcrResult({
    ocr_result_id: "ocr_rp06_synthetic",
    tenant_id: tenantId,
    matter_id: matterId,
    version_id: version.version_id,
    source_policy: "reserved_for_rp07_search",
    status: "not_reviewed",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const emailThread = createDmsEmailThread({
    email_thread_id: "email_thread_rp06_reserved",
    tenant_id: tenantId,
    matter_id: matterId,
    subject: "Reserved Email DMS Thread",
    status: "draft",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  const relation = createDmsDocumentRelation({
    relation_id: "docrel_rp06_synthetic",
    tenant_id: tenantId,
    matter_id: matterId,
    source_document_id: document.document_id,
    target_document_id: document.document_id,
    relation_type: "SELF_REFERENCE_FOR_FIXTURE",
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
  });
  return freezeResult({
    fixture_id: "dms-core-cp198-synthetic-fixture",
    workspace,
    folder,
    document,
    version,
    file_object: fileObject,
    rendition,
    extracted_text: extractedText,
    ocr_result: ocrResult,
    email_thread: emailThread,
    relation,
    model_types: listDmsCoreModelTypes(),
    model_count: listDmsCoreModelTypes().length,
  });
}

export function createDmsCoreFoundationDescriptor(input = {}) {
  const fixture = createDmsCoreSyntheticFixture(input);
  return freezeResult({
    descriptor: "DmsCoreFoundationDescriptor",
    program_contract: DMS_CORE_PROGRAM_CONTRACT,
    source_matter_core_pack_id: DMS_CORE_CP198_REQUIREMENTS.source_matter_core_pack_id,
    scope: Object.freeze({
      pack_range: DMS_CORE_CP198_PACK_BINDING.range,
      phase_counts: DMS_CORE_CP198_REQUIREMENTS.phase_counts,
      micro_phase_row_counts: DMS_CORE_CP198_REQUIREMENTS.micro_phase_row_counts,
      micro_title_row_counts: DMS_CORE_CP198_REQUIREMENTS.micro_title_row_counts,
      deliverable_counts: DMS_CORE_CP198_REQUIREMENTS.deliverable_counts,
    }),
    target_file_map: Object.freeze([
      "contracts/dms-core-contract.json",
      "packages/dms/README.md",
      "packages/dms/package.json",
      "packages/dms/src/index.js",
      "packages/dms/src/registry.js",
      "packages/dms/src/model.js",
      "packages/dms/src/service.js",
      "packages/dms/src/validators.js",
      "packages/dms/test/model.test.js",
      "scripts/validate-rp06-dms-core-contract.mjs",
    ]),
    fixture,
    reserved_runtime: DMS_CORE_PROGRAM_CONTRACT.reserved_downstream_runtime,
    permission_baseline: Object.freeze({
      deny_over_allow: true,
      legal_hold_overrides_access: true,
      ethical_wall_ref_required: true,
      object_acl_ref_required: true,
      permission_decision_detail_exposed: false,
    }),
    audit_baseline: Object.freeze({
      audit_trace_id_required: true,
      document_access_audit_reserved: true,
      version_change_audit_reserved: true,
      audit_event_body_exposed: false,
      audit_event_written: false,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-198.dms_core_foundation_model_registry",
      gate: DMS_CORE_CP198_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-198.dms_core_foundation_model_registry",
      gate: DMS_CORE_CP198_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP198_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP198_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP198_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP198_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP198_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P01.M02.S09 onward without treating CP00-198 descriptor fixtures as object-storage, OCR, search, email, or Citation Ledger runtime.",
    }),
  });
}

export function createDmsCoreModelShapeRegistry() {
  const registry = {};
  for (const modelType of listDmsCoreModelTypes()) {
    const definition = getDmsCoreModelDefinition(modelType);
    const primaryId = definition.required_fields.find((field) => field.endsWith("_id")) ?? `${modelType[0].toLowerCase()}${modelType.slice(1)}_id`;
    registry[modelType] = Object.freeze({
      model_type: modelType,
      primary_entity_identifier: primaryId,
      tenant_scope_field: "tenant_id",
      matter_trace_reference: "matter_id",
      lifecycle_status_enum: Object.freeze([...definition.lifecycle_statuses]),
      ownership_metadata: Object.freeze({
        owner_module: definition.owner_module,
        product_module_id: DMS_CORE_PROGRAM_CONTRACT.product_module_id,
        program_id: DMS_CORE_PROGRAM_CONTRACT.program_id,
      }),
      reference_relationships: DMS_CORE_REFERENCE_RELATIONSHIP_MAP[modelType] ?? Object.freeze([]),
      required_fields: definition.required_fields,
      optional_fields: DMS_CORE_OPTIONAL_FIELD_REGISTRY[modelType] ?? Object.freeze([]),
      descriptor_only: true,
    });
  }
  return freezeCp199Result({
    registry_id: "dms-core-cp199-model-shape-registry",
    model_count: listDmsCoreModelTypes().length,
    model_shapes: Object.freeze(registry),
    required_model_shape_fields: DMS_CORE_CP199_REQUIREMENTS.required_model_shape_fields,
  });
}

export function allowedDmsCoreNextStatuses(currentStatus) {
  return Object.freeze([...(DMS_CORE_STATE_TRANSITION_MAP[currentStatus] ?? [])]);
}

export function createDmsCoreStateTransitionDescriptor(record = {}) {
  return freezeCp199Result({
    descriptor: "DmsCoreStateTransitionDescriptor",
    model_type: record.model_type ?? null,
    current_status: record.status ?? record.review_status ?? null,
    allowed_next_statuses: allowedDmsCoreNextStatuses(record.status ?? record.review_status),
    transition_runtime_executed: false,
    transition_requires_downstream_permission_check: true,
  });
}

export function serializeDmsCoreDescriptor(record = {}) {
  const definition = getDmsCoreModelDefinition(record.model_type);
  const shape = createDmsCoreModelShapeRegistry().model_shapes[record.model_type];
  const primaryId = shape ? record[shape.primary_entity_identifier] : null;
  const requiredFieldsPresent = Object.freeze(
    (definition?.required_fields ?? []).filter((field) => record[field] !== undefined && record[field] !== null && record[field] !== ""),
  );
  const optionalFieldsPresent = Object.freeze(
    (DMS_CORE_OPTIONAL_FIELD_REGISTRY[record.model_type] ?? []).filter((field) => record[field] !== undefined && record[field] !== null),
  );
  const referenceRelationships = Object.freeze(
    (DMS_CORE_REFERENCE_RELATIONSHIP_MAP[record.model_type] ?? []).map((field) =>
      Object.freeze({ field, present: record[field] !== undefined && record[field] !== null && record[field] !== "" }),
    ),
  );
  return freezeCp199Result({
    ...DMS_CORE_SERIALIZATION_SHAPE,
    descriptor_ref: record.model_type && primaryId ? `${record.model_type}:${primaryId}` : null,
    model_type: record.model_type ?? null,
    tenant_id: record.tenant_id ?? null,
    matter_id: record.matter_id ?? null,
    status: record.status ?? record.review_status ?? null,
    required_fields_present: requiredFieldsPresent,
    optional_fields_present: optionalFieldsPresent,
    reference_relationships: referenceRelationships,
    allowed_next_statuses: allowedDmsCoreNextStatuses(record.status ?? record.review_status),
    safe_error_codes: Object.freeze([]),
    raw_payload_included: false,
    document_bytes_included: false,
    extracted_text_included: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
  });
}

export function createDmsCoreCp199FixtureModel(input = {}) {
  const foundation = createDmsCoreSyntheticFixture(input);
  const records = Object.freeze([
    foundation.workspace,
    foundation.folder,
    foundation.document,
    foundation.version,
    foundation.file_object,
    foundation.rendition,
    foundation.extracted_text,
    foundation.ocr_result,
    foundation.email_thread,
    foundation.relation,
  ]);
  return freezeCp199Result({
    fixture_id: "dms-core-cp199-type-shape-fixture",
    source_fixture_id: foundation.fixture_id,
    records,
    serialized_records: Object.freeze(records.map((record) => serializeDmsCoreDescriptor(record))),
    state_transition_descriptors: Object.freeze(records.map((record) => createDmsCoreStateTransitionDescriptor(record))),
  });
}

export function createDmsCoreCp199TypeShapeDescriptor(input = {}) {
  const fixture = createDmsCoreCp199FixtureModel(input);
  return freezeCp199Result({
    descriptor: "DmsCoreCp199TypeShapeServiceDescriptor",
    pack_binding: DMS_CORE_CP199_PACK_BINDING,
    model_shape_registry: createDmsCoreModelShapeRegistry(),
    state_transition_map: DMS_CORE_STATE_TRANSITION_MAP,
    serialization_shape: DMS_CORE_SERIALIZATION_SHAPE,
    fixture,
    public_exports: Object.freeze([
      "createDmsCoreModelShapeRegistry",
      "createDmsCoreStateTransitionDescriptor",
      "serializeDmsCoreDescriptor",
      "createDmsCoreCp199FixtureModel",
      "createDmsCoreCp199TypeShapeDescriptor",
    ]),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-199.dms_core_type_shape_service_descriptor",
      gate: DMS_CORE_CP199_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_type_shape_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-199.dms_core_type_shape_service_descriptor",
      gate: DMS_CORE_CP199_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP199_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP199_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP199_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP199_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP199_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P01.M04.S07 onward without treating CP00-199 descriptors as runtime persistence, object storage, OCR, search, email, Citation Ledger, or Loop execution.",
    }),
  });
}

export function createDmsCoreRequiredFieldRegistry() {
  return freezeCp200Result({
    registry_id: "dms-core-cp200-required-field-registry",
    required_fields_by_model: DMS_CORE_REQUIRED_FIELD_REGISTRY,
    binding_fields_required_on_all_models: DMS_CORE_CP200_REQUIREMENTS.required_binding_fields,
    model_count: listDmsCoreModelTypes().length,
  });
}

export function createDmsCorePermissionAuditBindingRegistry() {
  const modelShapes = createDmsCoreModelShapeRegistry().model_shapes;
  const bindings = {};
  for (const modelType of listDmsCoreModelTypes()) {
    const definition = getDmsCoreModelDefinition(modelType);
    const shape = modelShapes[modelType];
    bindings[modelType] = Object.freeze({
      model_type: modelType,
      package_directory_layout: "packages/dms",
      primary_entity_identifier: shape.primary_entity_identifier,
      tenant_scope_field: "tenant_id",
      matter_trace_reference: "matter_id",
      lifecycle_status_enum: Object.freeze([...definition.lifecycle_statuses]),
      ownership_metadata: shape.ownership_metadata,
      required_fields: DMS_CORE_REQUIRED_FIELD_REGISTRY[modelType],
      optional_fields: DMS_CORE_OPTIONAL_FIELD_REGISTRY[modelType] ?? Object.freeze([]),
      reference_relationships: DMS_CORE_REFERENCE_RELATIONSHIP_MAP[modelType] ?? Object.freeze([]),
      permission_binding: Object.freeze({
        envelope_field: "permission_envelope_id",
        envelope_required: definition.required_fields.includes("permission_envelope_id"),
        deny_over_allow: true,
        runtime_permission_evaluated: false,
        permission_decision_detail_exposed: false,
        permission_envelope_payload_exposed: false,
      }),
      audit_binding: Object.freeze({
        trace_field: "audit_trace_id",
        trace_required: definition.required_fields.includes("audit_trace_id"),
        audit_runtime_executed: false,
        audit_event_written: false,
        audit_event_body_exposed: false,
        audit_trace_payload_exposed: false,
      }),
      persistence_boundary: Object.freeze({
        descriptor_only: true,
        creates_database_rows: false,
        writes_product_state: false,
        reads_object_storage: false,
        writes_object_storage: false,
      }),
    });
  }
  return freezeCp200Result({
    registry_id: "dms-core-cp200-permission-audit-binding-registry",
    binding_count: Object.keys(bindings).length,
    bindings: Object.freeze(bindings),
    required_permission_guards: DMS_CORE_CP200_REQUIREMENTS.required_permission_guards,
    required_audit_guards: DMS_CORE_CP200_REQUIREMENTS.required_audit_guards,
  });
}

export function createDmsCoreCp200FixtureModel(input = {}) {
  const fixture = createDmsCoreCp199FixtureModel(input);
  const bindingRegistry = createDmsCorePermissionAuditBindingRegistry();
  const records = Object.freeze(
    fixture.records.map((record) =>
      Object.freeze({
        model_type: record.model_type,
        record_ref: serializeDmsCoreDescriptor(record).descriptor_ref,
        tenant_id: record.tenant_id,
        matter_id: record.matter_id,
        permission_envelope_id_present: Boolean(record.permission_envelope_id),
        audit_trace_id_present: Boolean(record.audit_trace_id),
        permission_binding: bindingRegistry.bindings[record.model_type].permission_binding,
        audit_binding: bindingRegistry.bindings[record.model_type].audit_binding,
        serialized_descriptor: serializeDmsCoreDescriptor(record),
      }),
    ),
  );
  return freezeCp200Result({
    fixture_id: "dms-core-cp200-permission-audit-fixture",
    source_fixture_id: fixture.fixture_id,
    record_count: records.length,
    records,
    invalid_reference_cases: Object.freeze([
      Object.freeze({
        case_id: "missing_permission_envelope_id",
        expected_error: "missing required field permission_envelope_id",
      }),
      Object.freeze({
        case_id: "missing_audit_trace_id",
        expected_error: "missing required field audit_trace_id",
      }),
      Object.freeze({
        case_id: "cross_tenant_reference_blocked_by_descriptor",
        expected_error: "tenant_scope_field drift",
      }),
    ]),
    ownership_drift_cases: Object.freeze([
      Object.freeze({
        case_id: "owner_module_must_remain_legal_workspace_dms",
        expected_error: "owner_module drift",
      }),
    ]),
  });
}

export function createDmsCoreCp200PermissionAuditDescriptor(input = {}) {
  const fixture = createDmsCoreCp200FixtureModel(input);
  return freezeCp200Result({
    descriptor: "DmsCoreCp200PermissionAuditFixtureDescriptor",
    pack_binding: DMS_CORE_CP200_PACK_BINDING,
    required_field_registry: createDmsCoreRequiredFieldRegistry(),
    optional_field_registry: DMS_CORE_OPTIONAL_FIELD_REGISTRY,
    reference_relationship_map: DMS_CORE_REFERENCE_RELATIONSHIP_MAP,
    state_transition_map: DMS_CORE_STATE_TRANSITION_MAP,
    permission_audit_binding_registry: createDmsCorePermissionAuditBindingRegistry(),
    serialization_shape: DMS_CORE_SERIALIZATION_SHAPE,
    fixture,
    public_exports: DMS_CORE_CP200_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-200",
    index_export_check: true,
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-200.dms_core_permission_audit_fixture_binding",
      gate: DMS_CORE_CP200_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_audit_fixture_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-200.dms_core_permission_audit_fixture_binding",
      gate: DMS_CORE_CP200_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP200_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP200_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP200_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP200_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP200_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P01.M06.S05 onward with larger synthetic fixture and test set evidence while keeping persistence, object storage, OCR, search, email, Citation Ledger, and Loop runtime out of scope.",
    }),
  });
}

export function normalizeDmsCoreServiceRequest(input = {}) {
  const operation = input.operation ?? "register_document_descriptor";
  const requestedModelType = input.model_type ?? "DmsDocument";
  const bindingRegistry = createDmsCorePermissionAuditBindingRegistry();
  const binding = bindingRegistry.bindings[requestedModelType] ?? null;
  const tenantId = input.tenant_id ?? "tenant_rp06_synthetic";
  const matterId = input.matter_id ?? "matter_rp06_synthetic_opening";
  const permissionEnvelopeId = input.permission_envelope_id ?? "perm_rp06_synthetic_dms";
  const auditTraceId = input.audit_trace_id ?? "audit_rp06_synthetic_dms";
  return freezeCp201Result({
    request_id: input.request_id ?? `dms-service-request:${operation}:${requestedModelType}`,
    operation,
    model_type: requestedModelType,
    tenant_id: tenantId,
    matter_id: matterId,
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
    idempotency_key: input.idempotency_key ?? `idem:${tenantId}:${operation}:${requestedModelType}`,
    lock_ref: input.lock_ref ?? `lock:${tenantId}:${matterId}:dms:${requestedModelType}`,
    requested_status: input.requested_status ?? "draft",
    target_record_ref: input.target_record_ref ?? null,
    primary_entity_identifier: binding?.primary_entity_identifier ?? null,
    tenant_boundary_precheck: tenantId === "tenant_rp06_synthetic",
    matter_trace_precheck: matterId === "matter_rp06_synthetic_opening",
    permission_precheck: Boolean(permissionEnvelopeId),
    audit_hint_precheck: Boolean(auditTraceId),
    persistence_boundary_closed: true,
    normalized_payload_excludes_raw_content: true,
    raw_payload_included: false,
    document_bytes_included: false,
    extracted_text_included: false,
    permission_decision_detail_included: false,
    audit_event_body_included: false,
  });
}

export function createDmsCoreServiceOutcomeDescriptor(request = {}, outcome = "happy_path_descriptor") {
  const normalized = request.request_id ? request : normalizeDmsCoreServiceRequest(request);
  const allowedOperation = DMS_CORE_CP201_REQUIREMENTS.service_operations.includes(normalized.operation);
  const allowedOutcome = DMS_CORE_CP201_REQUIREMENTS.service_outcomes.includes(outcome);
  const prechecksPass =
    normalized.tenant_boundary_precheck &&
    normalized.matter_trace_precheck &&
    normalized.permission_precheck &&
    normalized.audit_hint_precheck &&
    allowedOperation;
  const route = allowedOutcome ? outcome : "blocked_claim_descriptor";
  return freezeCp201Result({
    outcome_id: `${normalized.request_id}:${route}`,
    request: normalized,
    outcome: route,
    service_entrypoint_contract: "DmsCoreServiceDescriptorContract",
    allowed_operation: allowedOperation,
    prechecks_pass: prechecksPass,
    status_transition_allowed: allowedDmsCoreNextStatuses(normalized.requested_status).length > 0 || normalized.requested_status === "draft",
    idempotency_key_handled_as_descriptor: true,
    lock_acquisition_rule_descriptor: true,
    persistence_boundary: Object.freeze({
      descriptor_only: true,
      creates_database_rows: false,
      writes_product_state: false,
      persists_idempotency_key: false,
      acquires_runtime_lock: false,
    }),
    route: Object.freeze({
      primary_happy_path: route === "happy_path_descriptor" && prechecksPass,
      secondary_workflow_path: route === "review_required_descriptor" || route === "approval_required_descriptor",
      denied_path: route === "denied_path_descriptor",
      review_required: route === "review_required_descriptor",
      approval_required: route === "approval_required_descriptor",
      blocked_claim: route === "blocked_claim_descriptor" || !prechecksPass,
      rollback_descriptor: route === "rollback_descriptor",
      retry_descriptor: route === "retry_descriptor",
    }),
    validation_error_mapping: Object.freeze({
      tenant_boundary_precheck: normalized.tenant_boundary_precheck ? null : "DMS_SERVICE_TENANT_BOUNDARY",
      matter_trace_precheck: normalized.matter_trace_precheck ? null : "DMS_SERVICE_MATTER_TRACE",
      permission_precheck: normalized.permission_precheck ? null : "DMS_SERVICE_PERMISSION_PRECHECK",
      audit_hint_precheck: normalized.audit_hint_precheck ? null : "DMS_SERVICE_AUDIT_HINT",
      operation_supported: allowedOperation ? null : "DMS_SERVICE_UNSUPPORTED_OPERATION",
    }),
  });
}

export function createDmsCoreCp201GoldenCaseSet(input = {}) {
  const happy = normalizeDmsCoreServiceRequest({
    ...input,
    request_id: "dms-cp201-happy-register-document",
    operation: "register_document_descriptor",
    model_type: "DmsDocument",
    requested_status: "draft",
  });
  const denied = normalizeDmsCoreServiceRequest({
    ...input,
    request_id: "dms-cp201-denied-cross-tenant",
    operation: "register_document_descriptor",
    model_type: "DmsDocument",
    tenant_id: "tenant_rp06_other",
  });
  const review = normalizeDmsCoreServiceRequest({
    ...input,
    request_id: "dms-cp201-review-required-version",
    operation: "attach_version_descriptor",
    model_type: "DmsDocumentVersion",
    requested_status: "current",
  });
  const approval = normalizeDmsCoreServiceRequest({
    ...input,
    request_id: "dms-cp201-approval-required-relation",
    operation: "relate_document_descriptor",
    model_type: "DmsDocumentRelation",
    requested_status: "under_review",
  });
  const unsupported = normalizeDmsCoreServiceRequest({
    ...input,
    request_id: "dms-cp201-blocked-unsupported-runtime",
    operation: "download_document_bytes",
    model_type: "DmsFileObject",
  });
  const records = Object.freeze([
    createDmsCoreServiceOutcomeDescriptor(happy, "happy_path_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(denied, "denied_path_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(review, "review_required_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(approval, "approval_required_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(unsupported, "blocked_claim_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(review, "rollback_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(review, "retry_descriptor"),
  ]);
  return freezeCp201Result({
    fixture_id: "dms-core-cp201-service-golden-case-set",
    source_fixture_id: createDmsCoreCp200FixtureModel(input).fixture_id,
    service_operations: DMS_CORE_CP201_REQUIREMENTS.service_operations,
    service_outcomes: DMS_CORE_CP201_REQUIREMENTS.service_outcomes,
    records,
    happy_path_case_id: records[0].outcome_id,
    denied_path_case_id: records[1].outcome_id,
    review_path_case_id: records[2].outcome_id,
    integration_smoke_case: Object.freeze({
      case_id: "dms-cp201-integration-smoke",
      covers_contract_descriptor: true,
      covers_golden_case_set: true,
      covers_no_write_boundaries: true,
      executes_runtime: false,
    }),
  });
}

export function createDmsCoreCp201ServiceContractDescriptor(input = {}) {
  return freezeCp201Result({
    descriptor: "DmsCoreCp201ServiceContractDescriptor",
    pack_binding: DMS_CORE_CP201_PACK_BINDING,
    entrypoint_contract: Object.freeze({
      contract_id: "DmsCoreServiceDescriptorContract",
      package_directory_layout: "packages/dms",
      request_normalization: true,
      tenant_boundary_precheck: true,
      matter_trace_precheck: true,
      permission_precheck: true,
      audit_hint_precheck: true,
      state_transition_enforcement_descriptor: true,
      idempotency_key_handling_descriptor: true,
      lock_acquisition_rule_descriptor: true,
      persistence_boundary_closed: true,
      rollback_behavior_descriptor: true,
      retry_behavior_descriptor: true,
      runtime_execution: false,
    }),
    type_shape_definition: Object.freeze({
      primary_entity_identifier: "document_id",
      tenant_scope_field: "tenant_id",
      matter_trace_reference: "matter_id",
      lifecycle_status_enum: DMS_CORE_STATE_TRANSITION_MAP,
      ownership_metadata: Object.freeze({
        owner_module: DMS_CORE_PROGRAM_CONTRACT.owner_module,
        product_module_id: DMS_CORE_PROGRAM_CONTRACT.product_module_id,
        program_id: DMS_CORE_PROGRAM_CONTRACT.program_id,
      }),
      required_field_registry: DMS_CORE_REQUIRED_FIELD_REGISTRY,
      optional_field_registry: DMS_CORE_OPTIONAL_FIELD_REGISTRY,
      reference_relationship_map: DMS_CORE_REFERENCE_RELATIONSHIP_MAP,
    }),
    normalized_example_request: normalizeDmsCoreServiceRequest(input),
  });
}

export function createDmsCoreCp201ServiceDescriptor(input = {}) {
  const contract = createDmsCoreCp201ServiceContractDescriptor(input);
  const goldenCases = createDmsCoreCp201GoldenCaseSet(input);
  return freezeCp201Result({
    descriptor: "DmsCoreCp201ServiceGoldenCaseDescriptor",
    pack_binding: DMS_CORE_CP201_PACK_BINDING,
    service_contract: contract,
    golden_cases: goldenCases,
    public_exports: DMS_CORE_CP201_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-201",
    index_export_check: true,
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-201.dms_core_service_contract_golden_case_descriptor",
      gate: DMS_CORE_CP201_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_service_contract_golden_case_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-201.dms_core_service_contract_golden_case_descriptor",
      gate: DMS_CORE_CP201_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP201_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP201_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP201_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP201_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP201_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M03.S01 onward with service/domain implementation slices while keeping object storage, OCR, search, email, Citation Ledger, and Loop runtime in their responsible downstream ranges.",
    }),
  });
}

export function createDmsCoreCp202RouteMatrix(input = {}) {
  const baseRequest = normalizeDmsCoreServiceRequest(input);
  const routeRows = Object.freeze([
    createDmsCoreServiceOutcomeDescriptor(baseRequest, "happy_path_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(
      normalizeDmsCoreServiceRequest({
        ...input,
        request_id: "dms-cp202-secondary-review-route",
        operation: "attach_version_descriptor",
        model_type: "DmsDocumentVersion",
        requested_status: "current",
      }),
      "review_required_descriptor",
    ),
    createDmsCoreServiceOutcomeDescriptor(
      normalizeDmsCoreServiceRequest({
        ...input,
        request_id: "dms-cp202-approval-route",
        operation: "relate_document_descriptor",
        model_type: "DmsDocumentRelation",
        requested_status: "under_review",
      }),
      "approval_required_descriptor",
    ),
    createDmsCoreServiceOutcomeDescriptor(
      normalizeDmsCoreServiceRequest({
        ...input,
        request_id: "dms-cp202-denied-tenant-route",
        tenant_id: "tenant_rp06_other",
      }),
      "denied_path_descriptor",
    ),
    createDmsCoreServiceOutcomeDescriptor(
      normalizeDmsCoreServiceRequest({
        ...input,
        request_id: "dms-cp202-blocked-runtime-claim",
        operation: "download_document_bytes",
        model_type: "DmsFileObject",
      }),
      "blocked_claim_descriptor",
    ),
    createDmsCoreServiceOutcomeDescriptor(baseRequest, "rollback_descriptor"),
    createDmsCoreServiceOutcomeDescriptor(baseRequest, "retry_descriptor"),
  ]);
  return freezeCp202Result({
    matrix_id: "dms-core-cp202-primary-secondary-route-matrix",
    source_service_descriptor: createDmsCoreCp201ServiceDescriptor(input).descriptor,
    workflow_paths: DMS_CORE_CP202_REQUIREMENTS.workflow_paths,
    required_routing_guards: DMS_CORE_CP202_REQUIREMENTS.required_routing_guards,
    route_rows: routeRows,
    path_count: DMS_CORE_CP202_REQUIREMENTS.workflow_paths.length,
    customer_safe_errors_only: true,
    validation_error_codes: Object.freeze([
      "DMS_SERVICE_TENANT_BOUNDARY",
      "DMS_SERVICE_MATTER_TRACE",
      "DMS_SERVICE_PERMISSION_PRECHECK",
      "DMS_SERVICE_AUDIT_HINT",
      "DMS_SERVICE_UNSUPPORTED_OPERATION",
    ]),
  });
}

export function createDmsCoreCp202WorkflowCaseSet(input = {}) {
  const routeMatrix = createDmsCoreCp202RouteMatrix(input);
  return freezeCp202Result({
    fixture_id: "dms-core-cp202-workflow-case-set",
    golden_fixture_binding: createDmsCoreCp201GoldenCaseSet(input).fixture_id,
    route_matrix_id: routeMatrix.matrix_id,
    cases: routeMatrix.route_rows,
    unit_tests: Object.freeze([
      "Unit test: happy path",
      "Unit test: denied path",
      "Unit test: review path",
      "Integration smoke case",
    ]),
    integration_smoke_case: Object.freeze({
      case_id: "dms-cp202-integration-smoke",
      covers_primary_slice: true,
      covers_secondary_slice: true,
      covers_route_matrix: true,
      executes_runtime: false,
    }),
  });
}

export function createDmsCoreCp202WorkflowDescriptor(input = {}) {
  const serviceDescriptor = createDmsCoreCp201ServiceDescriptor(input);
  const routeMatrix = createDmsCoreCp202RouteMatrix(input);
  const caseSet = createDmsCoreCp202WorkflowCaseSet(input);
  return freezeCp202Result({
    descriptor: "DmsCoreCp202PrimarySecondaryWorkflowDescriptor",
    pack_binding: DMS_CORE_CP202_PACK_BINDING,
    source_service_contract: serviceDescriptor.service_contract,
    route_matrix: routeMatrix,
    workflow_case_set: caseSet,
    public_exports: DMS_CORE_CP202_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-202",
    index_export_check: true,
    state_transition_enforcement: Object.freeze({
      descriptor_only: true,
      runtime_state_write: false,
      allowed_statuses: DMS_CORE_STATE_TRANSITION_MAP,
    }),
    persistence_boundary: Object.freeze({
      descriptor_only: true,
      writes_product_state: false,
      creates_database_rows: false,
      persists_workflow_attempt: false,
      persists_idempotency_key: false,
      acquires_runtime_lock: false,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-202.dms_core_primary_secondary_workflow_descriptor",
      gate: DMS_CORE_CP202_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_primary_secondary_workflow_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-202.dms_core_primary_secondary_workflow_descriptor",
      gate: DMS_CORE_CP202_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP202_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP202_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP202_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP202_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP202_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M04.S16 onward with sensitive remaining workflow outputs while keeping runtime persistence, object storage, OCR, search, email, Citation Ledger, and Loop execution out of scope.",
    }),
  });
}

export function createDmsCoreCp203SensitiveTailCaseSet(input = {}) {
  const routeMatrix = createDmsCoreCp202RouteMatrix(input);
  const routes = routeMatrix.route_rows;
  const blockedRoute = routes.find((route) => route.outcome === "blocked_claim_descriptor");
  const rollbackRoute = routes.find((route) => route.outcome === "rollback_descriptor");
  const retryRoute = routes.find((route) => route.outcome === "retry_descriptor");
  const happyRoute = routes.find((route) => route.outcome === "happy_path_descriptor");
  const deniedRoute = routes.find((route) => route.outcome === "denied_path_descriptor");
  const reviewRoute = routes.find((route) => route.outcome === "review_required_descriptor");

  return freezeCp203Result({
    fixture_id: "dms-core-cp203-sensitive-workflow-tail-case-set",
    source_route_matrix_id: routeMatrix.matrix_id,
    golden_fixture_binding: "dms-core-cp201-service-golden-case-set",
    sensitive_tail_paths: DMS_CORE_CP203_REQUIREMENTS.sensitive_tail_paths,
    blocked_claim_output: Object.freeze({
      case_id: "dms-cp203-blocked-claim-output",
      source_outcome_id: blockedRoute?.outcome_id ?? null,
      customer_safe_error_code: "DMS_SERVICE_UNSUPPORTED_OPERATION",
      customer_safe_message: "The requested DMS workflow is not available for this descriptor-only stage.",
      details_redacted: true,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      unauthorized_count_included: false,
      raw_payload_included: false,
      dispatches_runtime: false,
    }),
    rollback_behavior: Object.freeze({
      case_id: "dms-cp203-rollback-behavior",
      source_outcome_id: rollbackRoute?.outcome_id ?? null,
      behavior_type: "descriptor_only_rollback",
      rollback_runtime_executed: false,
      state_restored_by_runtime: false,
      internal_state_included: false,
      customer_safe_errors_only: true,
    }),
    retry_behavior: Object.freeze({
      case_id: "dms-cp203-retry-behavior",
      source_outcome_id: retryRoute?.outcome_id ?? null,
      behavior_type: "descriptor_only_retry",
      retry_runtime_executed: false,
      idempotency_key_persisted: false,
      internal_state_included: false,
      customer_safe_errors_only: true,
    }),
    unit_test_cases: Object.freeze([
      Object.freeze({
        title: "Unit test: happy path",
        source_outcome_id: happyRoute?.outcome_id ?? null,
        expected_prechecks_pass: true,
        executes_runtime: false,
      }),
      Object.freeze({
        title: "Unit test: denied path",
        source_outcome_id: deniedRoute?.outcome_id ?? null,
        expected_tenant_boundary_precheck: false,
        executes_runtime: false,
      }),
      Object.freeze({
        title: "Unit test: review path",
        source_outcome_id: reviewRoute?.outcome_id ?? null,
        expected_review_required: true,
        executes_runtime: false,
      }),
    ]),
    integration_smoke_case: Object.freeze({
      case_id: "dms-cp203-sensitive-tail-smoke",
      covers_blocked_claim_output: true,
      covers_rollback_behavior: true,
      covers_retry_behavior: true,
      covers_golden_fixture_binding: true,
      executes_runtime: false,
    }),
  });
}

export function createDmsCoreCp203SensitiveTailDescriptor(input = {}) {
  const workflowDescriptor = createDmsCoreCp202WorkflowDescriptor(input);
  const caseSet = createDmsCoreCp203SensitiveTailCaseSet(input);
  return freezeCp203Result({
    descriptor: "DmsCoreCp203SensitiveWorkflowTailDescriptor",
    pack_binding: DMS_CORE_CP203_PACK_BINDING,
    source_workflow_descriptor: workflowDescriptor.descriptor,
    source_route_matrix_id: caseSet.source_route_matrix_id,
    sensitive_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP203_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-203",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP203_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP203_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-203.dms_core_sensitive_workflow_tail_descriptor",
      gate: DMS_CORE_CP203_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_sensitive_workflow_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-203.dms_core_sensitive_workflow_tail_descriptor",
      gate: DMS_CORE_CP203_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP203_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP203_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP203_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP203_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP203_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M05.S01 onward with the next Risk A DMS slice while preserving descriptor-only boundaries until the responsible downstream packs explicitly open runtime behavior.",
    }),
  });
}

export function createDmsCoreCp204PermissionAuditGateSet(input = {}) {
  const normalized = normalizeDmsCoreServiceRequest(input);
  const routeMatrix = createDmsCoreCp202RouteMatrix(input);
  const happyRoute = routeMatrix.route_rows.find((route) => route.outcome === "happy_path_descriptor");
  const reviewRoute = routeMatrix.route_rows.find((route) => route.outcome === "review_required_descriptor");
  const approvalRoute = routeMatrix.route_rows.find((route) => route.outcome === "approval_required_descriptor");

  return freezeCp204Result({
    gate_set_id: "dms-core-cp204-permission-audit-workflow-gate-set",
    source_sensitive_tail_descriptor: createDmsCoreCp203SensitiveTailDescriptor(input).descriptor,
    source_route_matrix_id: routeMatrix.matrix_id,
    required_permission_audit_guards: DMS_CORE_CP204_REQUIREMENTS.required_permission_audit_guards,
    service_entrypoint_contract: Object.freeze({
      contract_id: "DmsCorePermissionAuditWorkflowBindingContract",
      descriptor_only: true,
      runtime_execution: false,
      permission_runtime_evaluated: false,
      audit_runtime_appended: false,
    }),
    request_normalization: Object.freeze({
      request_id: normalized.request_id,
      tenant_id: normalized.tenant_id,
      matter_id: normalized.matter_id,
      model_type: normalized.model_type,
      operation: normalized.operation,
      normalized_payload_excludes_raw_content: normalized.normalized_payload_excludes_raw_content,
      raw_payload_included: false,
    }),
    tenant_boundary_precheck: Object.freeze({
      descriptor_only: true,
      field: "tenant_id",
      passed: normalized.tenant_boundary_precheck,
      customer_safe_error_code: normalized.tenant_boundary_precheck ? null : "DMS_SERVICE_TENANT_BOUNDARY",
      policy_rule_detail_included: false,
      unauthorized_count_included: false,
    }),
    matter_trace_precheck: Object.freeze({
      descriptor_only: true,
      field: "matter_id",
      passed: normalized.matter_trace_precheck,
      customer_safe_error_code: normalized.matter_trace_precheck ? null : "DMS_SERVICE_MATTER_TRACE",
      matter_payload_included: false,
    }),
    permission_precheck: Object.freeze({
      descriptor_only: true,
      field: "permission_envelope_id",
      passed: normalized.permission_precheck,
      customer_safe_error_code: normalized.permission_precheck ? null : "DMS_SERVICE_PERMISSION_PRECHECK",
      permission_policy_rule_detail_included: false,
      permission_decision_detail_included: false,
      permission_envelope_payload_included: false,
      runtime_permission_evaluated: false,
      writes_permission_decision: false,
    }),
    audit_hint_precheck: Object.freeze({
      descriptor_only: true,
      field: "audit_trace_id",
      passed: normalized.audit_hint_precheck,
      customer_safe_error_code: normalized.audit_hint_precheck ? null : "DMS_SERVICE_AUDIT_HINT",
      audit_hint_detail_included: false,
      audit_event_body_included: false,
      audit_trace_payload_included: false,
      audit_runtime_appended: false,
    }),
    primary_happy_path: Object.freeze({
      source_outcome_id: happyRoute?.outcome_id ?? null,
      prechecks_pass: happyRoute?.prechecks_pass === true,
      permission_gate_passed: normalized.permission_precheck,
      audit_gate_passed: normalized.audit_hint_precheck,
      dispatches_runtime: false,
    }),
    secondary_workflow_path: Object.freeze({
      source_outcome_ids: Object.freeze([reviewRoute?.outcome_id, approvalRoute?.outcome_id].filter(Boolean)),
      review_required_descriptor: Boolean(reviewRoute),
      approval_required_descriptor: Boolean(approvalRoute),
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
      dispatches_runtime: false,
    }),
    state_transition_enforcement: Object.freeze({
      descriptor_only: true,
      runtime_state_write: false,
      allowed_statuses: DMS_CORE_STATE_TRANSITION_MAP,
    }),
    idempotency_key_handling: Object.freeze({
      descriptor_only: true,
      idempotency_key: normalized.idempotency_key,
      persists_idempotency_key: false,
      exposes_key_material: false,
    }),
  });
}

export function createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor(input = {}) {
  const sensitiveTail = createDmsCoreCp203SensitiveTailDescriptor(input);
  const gateSet = createDmsCoreCp204PermissionAuditGateSet(input);
  return freezeCp204Result({
    descriptor: "DmsCoreCp204PermissionAuditWorkflowBindingDescriptor",
    pack_binding: DMS_CORE_CP204_PACK_BINDING,
    source_sensitive_tail_descriptor: sensitiveTail.descriptor,
    permission_audit_gate_set: gateSet,
    public_exports: DMS_CORE_CP204_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-204",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP204_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP204_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-204.dms_core_permission_audit_workflow_binding",
      gate: DMS_CORE_CP204_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_audit_workflow_binding_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-204.dms_core_permission_audit_workflow_binding",
      gate: DMS_CORE_CP204_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP204_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP204_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP204_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP204_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP204_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M05.S11 onward with lock, persistence, validation mapping, review/approval routing, and blocked/failure paths while keeping DMS runtime dispatch, policy evaluation, audit append, object storage, OCR, search, email, Citation Ledger, and Loop execution out of scope.",
    }),
  });
}

export function createDmsCoreCp205PermissionAuditTailCaseSet(input = {}) {
  const gateSet = createDmsCoreCp204PermissionAuditGateSet(input);
  const routeMatrix = createDmsCoreCp202RouteMatrix(input);
  const happyRoute = routeMatrix.route_rows.find((route) => route.outcome === "happy_path_descriptor");
  const deniedRoute = routeMatrix.route_rows.find((route) => route.outcome === "denied_path_descriptor");
  const reviewRoute = routeMatrix.route_rows.find((route) => route.outcome === "review_required_descriptor");
  const approvalRoute = routeMatrix.route_rows.find((route) => route.outcome === "approval_required_descriptor");
  const blockedRoute = routeMatrix.route_rows.find((route) => route.outcome === "blocked_claim_descriptor");

  return freezeCp205Result({
    case_set_id: "dms-core-cp205-permission-audit-tail-case-set",
    source_permission_audit_gate_set_id: gateSet.gate_set_id,
    source_route_matrix_id: routeMatrix.matrix_id,
    required_permission_audit_tail_guards: DMS_CORE_CP205_REQUIREMENTS.required_permission_audit_tail_guards,
    lock_acquisition_rule: Object.freeze({
      descriptor_only: true,
      source_guard: "idempotency_key_handling_descriptor",
      lock_scope: "tenant_matter_document_descriptor",
      runtime_lock_acquired: false,
      lock_token_included: false,
      lock_wait_queue_executed: false,
      customer_safe_errors_only: true,
    }),
    persistence_boundary: Object.freeze({
      descriptor_only: true,
      persistence_scope: "workflow_attempt_descriptor",
      persists_workflow_attempt: false,
      persists_idempotency_key: false,
      creates_database_rows: false,
      updates_database_rows: false,
      persistence_payload_included: false,
      raw_payload_included: false,
    }),
    validation_error_mapping: Object.freeze({
      descriptor_only: true,
      customer_safe_errors_only: true,
      validation_error_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      raw_payload_included: false,
      mappings: Object.freeze([
        Object.freeze({ source: "tenant_boundary_precheck", customer_safe_error_code: "DMS_SERVICE_TENANT_BOUNDARY" }),
        Object.freeze({ source: "matter_trace_precheck", customer_safe_error_code: "DMS_SERVICE_MATTER_TRACE" }),
        Object.freeze({ source: "permission_precheck", customer_safe_error_code: "DMS_SERVICE_PERMISSION_PRECHECK" }),
        Object.freeze({ source: "audit_hint_precheck", customer_safe_error_code: "DMS_SERVICE_AUDIT_HINT" }),
        Object.freeze({ source: "unsupported_operation", customer_safe_error_code: "DMS_SERVICE_UNSUPPORTED_OPERATION" }),
      ]),
    }),
    review_required_routing: Object.freeze({
      descriptor_only: true,
      source_outcome_id: reviewRoute?.outcome_id ?? null,
      review_required: Boolean(reviewRoute),
      read_only_claude_review_packet_only: true,
      dispatches_review_route_runtime: false,
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
    }),
    approval_required_routing: Object.freeze({
      descriptor_only: true,
      source_outcome_id: approvalRoute?.outcome_id ?? null,
      approval_required: Boolean(approvalRoute),
      human_approval_route_required_before_runtime: true,
      dispatches_approval_route_runtime: false,
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
    }),
    blocked_claim_output: Object.freeze({
      descriptor_only: true,
      source_outcome_id: blockedRoute?.outcome_id ?? null,
      customer_safe_error_code: "DMS_SERVICE_UNSUPPORTED_OPERATION",
      details_redacted: true,
      validation_error_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      unauthorized_count_included: false,
      raw_payload_included: false,
      dispatches_runtime: false,
    }),
    rollback_behavior: Object.freeze({
      descriptor_only: true,
      behavior_type: "descriptor_only_permission_audit_rollback",
      rollback_runtime_executed: false,
      state_restored_by_runtime: false,
      lock_release_runtime_executed: false,
      persistence_rollback_payload_included: false,
      internal_state_included: false,
      customer_safe_errors_only: true,
    }),
    retry_behavior: Object.freeze({
      descriptor_only: true,
      behavior_type: "descriptor_only_permission_audit_retry",
      retry_runtime_executed: false,
      retry_backoff_runtime_executed: false,
      idempotency_key_persisted: false,
      lock_reacquire_runtime_executed: false,
      internal_state_included: false,
      customer_safe_errors_only: true,
    }),
    happy_path_unit_descriptor: Object.freeze({
      title: "Unit test: happy path",
      source_outcome_id: happyRoute?.outcome_id ?? null,
      expected_prechecks_pass: true,
      expected_lock_descriptor_only: true,
      expected_persistence_descriptor_only: true,
      executes_runtime: false,
    }),
    denied_path_unit_descriptor: Object.freeze({
      title: "Unit test: denied path",
      source_outcome_id: deniedRoute?.outcome_id ?? null,
      expected_tenant_boundary_precheck: false,
      expected_customer_safe_error_code: "DMS_SERVICE_TENANT_BOUNDARY",
      expected_permission_detail_excluded: true,
      expected_audit_body_excluded: true,
      executes_runtime: false,
    }),
  });
}

export function createDmsCoreCp205PermissionAuditTailDescriptor(input = {}) {
  const permissionAuditWorkflow = createDmsCoreCp204PermissionAuditWorkflowBindingDescriptor(input);
  const caseSet = createDmsCoreCp205PermissionAuditTailCaseSet(input);
  return freezeCp205Result({
    descriptor: "DmsCoreCp205PermissionAuditTailDescriptor",
    pack_binding: DMS_CORE_CP205_PACK_BINDING,
    source_permission_audit_workflow_descriptor: permissionAuditWorkflow.descriptor,
    source_permission_audit_gate_set_id: caseSet.source_permission_audit_gate_set_id,
    permission_audit_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP205_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-205",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP205_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP205_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-205.dms_core_permission_audit_tail_descriptor",
      gate: DMS_CORE_CP205_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_audit_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-205.dms_core_permission_audit_tail_descriptor",
      gate: DMS_CORE_CP205_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP205_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP205_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP205_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP205_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP205_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M05.S21 onward with remaining permission/audit test, smoke, fixture, evidence, and review tail rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

export function createDmsCoreCp206SyntheticFixtureServiceCaseSet(input = {}) {
  const tailCaseSet = createDmsCoreCp205PermissionAuditTailCaseSet(input);
  const syntheticFixture = createDmsCoreSyntheticFixture(input);

  return freezeCp206Result({
    case_set_id: "dms-core-cp206-synthetic-fixture-service-case-set",
    source_permission_audit_tail_case_set_id: tailCaseSet.case_set_id,
    source_fixture_model_count: syntheticFixture.model_count,
    required_synthetic_fixture_service_guards: DMS_CORE_CP206_REQUIREMENTS.required_synthetic_fixture_service_guards,
    review_path_unit_descriptor: Object.freeze({
      title: "Unit test: review path",
      descriptor_only: true,
      source_review_required_routing: tailCaseSet.review_required_routing.source_outcome_id,
      review_required: tailCaseSet.review_required_routing.review_required,
      read_only_claude_review_packet_only: true,
      dispatches_review_route_runtime: false,
      executes_review_path_runtime: false,
      review_payload_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
    }),
    integration_smoke_case_descriptor: Object.freeze({
      title: "Integration smoke case",
      descriptor_only: true,
      smoke_case_id: "dms-core-cp206-synthetic-fixture-smoke",
      invokes_service_entrypoint_runtime: false,
      dispatches_integration_smoke_runtime: false,
      writes_product_state: false,
      creates_database_rows: false,
      reads_object_storage: false,
      writes_object_storage: false,
      validates_review_path_descriptor: true,
      validates_fixture_binding_descriptor: true,
      validates_precheck_descriptors: true,
    }),
    golden_fixture_binding: Object.freeze({
      title: "Golden fixture binding",
      descriptor_only: true,
      fixture_id: syntheticFixture.fixture_id,
      synthetic_only: syntheticFixture.synthetic_only,
      no_real_data: syntheticFixture.no_real_data,
      model_count: syntheticFixture.model_count,
      binds_permission_envelope_descriptor: true,
      binds_audit_trace_descriptor: true,
      real_client_data_loaded: false,
      real_matter_data_loaded: false,
      real_document_data_loaded: false,
      document_bytes_loaded: false,
      extracted_text_loaded: false,
      fixture_payload_included: false,
    }),
    hermes_service_evidence_descriptor: Object.freeze({
      title: "Hermes service evidence",
      descriptor_only: true,
      evidence_packet: "H06.CP00-206.dms_core_synthetic_fixture_service_descriptor",
      gate: DMS_CORE_CP206_PACK_BINDING.hermes_gate,
      no_real_data: true,
      writes_product_state: false,
      dispatches_runtime: false,
      claims_enterprise_trust: false,
      hermes_runtime_embedded_in_product: false,
    }),
    claude_service_review_prompt: Object.freeze({
      title: "Claude service review prompt",
      descriptor_only: true,
      review_packet: "C06.CP00-206.dms_core_synthetic_fixture_service_descriptor",
      gate: DMS_CORE_CP206_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP206_REQUIREMENTS.allowed_claude_tools,
      claude_is_final_approval: false,
      prompt_embeds_full_source_or_diff: false,
      source_mutation_allowed: false,
      enterprise_trust_claim_allowed: false,
    }),
    synthetic_fixture_service_entrypoint_contract: Object.freeze({
      title: "Service entrypoint contract",
      descriptor_only: true,
      service_entrypoint: "createDmsCoreCp206SyntheticFixtureServiceDescriptor",
      runtime_execution: false,
      fixture_service_runtime_dispatched: false,
      permission_runtime_evaluated: false,
      audit_runtime_appended: false,
      object_storage_runtime_executed: false,
    }),
    synthetic_fixture_request_normalization: Object.freeze({
      title: "Request normalization",
      descriptor_only: true,
      raw_payload_included: false,
      normalized_payload_excludes_raw_content: true,
      fixture_payload_included: false,
      document_bytes_included: false,
      extracted_text_included: false,
      customer_safe_errors_only: true,
    }),
    synthetic_fixture_tenant_boundary_precheck: Object.freeze({
      title: "Tenant boundary precheck",
      descriptor_only: true,
      tenant_id: syntheticFixture.workspace.tenant_id,
      passed: true,
      runtime_policy_lookup: false,
      tenant_policy_detail_included: false,
      unauthorized_count_included: false,
    }),
    synthetic_fixture_matter_trace_precheck: Object.freeze({
      title: "Matter trace precheck",
      descriptor_only: true,
      matter_id: syntheticFixture.workspace.matter_id,
      passed: true,
      runtime_matter_lookup: false,
      matter_payload_included: false,
      matter_trace_ref_required: true,
    }),
    synthetic_fixture_permission_precheck: Object.freeze({
      title: "Permission precheck",
      descriptor_only: true,
      permission_envelope_id: syntheticFixture.workspace.permission_envelope_id,
      passed: true,
      runtime_permission_evaluated: false,
      writes_permission_decision: false,
      permission_decision_detail_included: false,
      permission_envelope_payload_included: false,
    }),
  });
}

export function createDmsCoreCp206SyntheticFixtureServiceDescriptor(input = {}) {
  const permissionAuditTail = createDmsCoreCp205PermissionAuditTailDescriptor(input);
  const caseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet(input);
  return freezeCp206Result({
    descriptor: "DmsCoreCp206SyntheticFixtureServiceDescriptor",
    pack_binding: DMS_CORE_CP206_PACK_BINDING,
    source_permission_audit_tail_descriptor: permissionAuditTail.descriptor,
    source_permission_audit_tail_case_set_id: caseSet.source_permission_audit_tail_case_set_id,
    synthetic_fixture_service_case_set: caseSet,
    public_exports: DMS_CORE_CP206_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-206",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP206_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP206_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-206.dms_core_synthetic_fixture_service_descriptor",
      gate: DMS_CORE_CP206_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_synthetic_fixture_service_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-206.dms_core_synthetic_fixture_service_descriptor",
      gate: DMS_CORE_CP206_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP206_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP206_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP206_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP206_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP206_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M06.S06 onward with audit hint precheck, fixture happy/denied paths, state and idempotency fixture descriptors, and closeout rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

export function createDmsCoreCp207SyntheticFixtureWorkflowCaseSet(input = {}) {
  const serviceCaseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet(input);
  const tailCaseSet = createDmsCoreCp205PermissionAuditTailCaseSet(input);

  return freezeCp207Result({
    case_set_id: "dms-core-cp207-synthetic-fixture-workflow-case-set",
    source_synthetic_fixture_service_case_set_id: serviceCaseSet.case_set_id,
    source_permission_audit_tail_case_set_id: tailCaseSet.case_set_id,
    required_synthetic_fixture_workflow_guards: DMS_CORE_CP207_REQUIREMENTS.required_synthetic_fixture_workflow_guards,
    audit_hint_precheck: Object.freeze({
      title: "Audit hint precheck",
      descriptor_only: true,
      audit_trace_id: serviceCaseSet.golden_fixture_binding.fixture_id.replace("fixture", "audit"),
      passed: true,
      runtime_audit_lookup: false,
      audit_hint_detail_included: false,
      audit_event_body_included: false,
      audit_trace_payload_included: false,
      audit_runtime_appended: false,
    }),
    primary_happy_path: Object.freeze({
      title: "Primary happy path",
      descriptor_only: true,
      source_service_entrypoint: serviceCaseSet.synthetic_fixture_service_entrypoint_contract.service_entrypoint,
      prechecks_pass: true,
      permission_gate_passed: true,
      audit_gate_passed: true,
      dispatches_primary_fixture_runtime: false,
      writes_product_state: false,
      creates_database_rows: false,
      reads_object_storage: false,
      writes_object_storage: false,
    }),
    secondary_workflow_path: Object.freeze({
      title: "Secondary workflow path",
      descriptor_only: true,
      review_required_descriptor: true,
      approval_required_descriptor: true,
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
      dispatches_secondary_fixture_runtime: false,
      review_payload_included: false,
      approval_payload_included: false,
    }),
    state_transition_enforcement: Object.freeze({
      title: "State transition enforcement",
      descriptor_only: true,
      source_status: "not_reviewed",
      allowed_next_statuses: Object.freeze(["under_review", "blocked"]),
      runtime_state_write: false,
      writes_state_transition: false,
      state_transition_payload_included: false,
    }),
    idempotency_key_handling: Object.freeze({
      title: "Idempotency key handling",
      descriptor_only: true,
      key_scope: "tenant_matter_fixture_descriptor",
      persists_idempotency_key: false,
      idempotency_key_material_included: false,
      duplicate_runtime_detection_executed: false,
      customer_safe_errors_only: true,
    }),
    lock_acquisition_rule: Object.freeze({
      title: "Lock acquisition rule",
      descriptor_only: true,
      lock_scope: "tenant_matter_fixture_descriptor",
      runtime_lock_acquired: false,
      lock_token_included: false,
      lock_wait_queue_executed: false,
      customer_safe_errors_only: true,
    }),
    persistence_boundary: Object.freeze({
      title: "Persistence boundary",
      descriptor_only: true,
      persistence_scope: "synthetic_fixture_workflow_attempt_descriptor",
      persists_workflow_attempt: false,
      persists_idempotency_key: false,
      creates_database_rows: false,
      updates_database_rows: false,
      persistence_payload_included: false,
      raw_payload_included: false,
    }),
    validation_error_mapping: Object.freeze({
      title: "Validation error mapping",
      descriptor_only: true,
      customer_safe_errors_only: true,
      validation_error_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      raw_payload_included: false,
      mappings: Object.freeze([
        Object.freeze({ source: "audit_hint_precheck", customer_safe_error_code: "DMS_FIXTURE_AUDIT_HINT" }),
        Object.freeze({ source: "state_transition_enforcement", customer_safe_error_code: "DMS_FIXTURE_STATE_TRANSITION" }),
        Object.freeze({ source: "idempotency_key_handling", customer_safe_error_code: "DMS_FIXTURE_IDEMPOTENCY" }),
        Object.freeze({ source: "lock_acquisition_rule", customer_safe_error_code: "DMS_FIXTURE_LOCK_BOUNDARY" }),
        Object.freeze({ source: "persistence_boundary", customer_safe_error_code: "DMS_FIXTURE_PERSISTENCE_BOUNDARY" }),
      ]),
    }),
    review_required_routing: Object.freeze({
      title: "Review-required routing",
      descriptor_only: true,
      source_review_path_descriptor: serviceCaseSet.review_path_unit_descriptor.title,
      review_required: true,
      read_only_claude_review_packet_only: true,
      dispatches_review_route_runtime: false,
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
    }),
    approval_required_routing: Object.freeze({
      title: "Approval-required routing",
      descriptor_only: true,
      approval_required: true,
      human_approval_route_required_before_runtime: true,
      dispatches_approval_route_runtime: false,
      permission_gate_descriptor_only: true,
      audit_gate_descriptor_only: true,
      approval_payload_included: false,
    }),
  });
}

export function createDmsCoreCp207SyntheticFixtureWorkflowDescriptor(input = {}) {
  const serviceDescriptor = createDmsCoreCp206SyntheticFixtureServiceDescriptor(input);
  const caseSet = createDmsCoreCp207SyntheticFixtureWorkflowCaseSet(input);
  return freezeCp207Result({
    descriptor: "DmsCoreCp207SyntheticFixtureWorkflowDescriptor",
    pack_binding: DMS_CORE_CP207_PACK_BINDING,
    source_synthetic_fixture_service_descriptor: serviceDescriptor.descriptor,
    source_synthetic_fixture_service_case_set_id: caseSet.source_synthetic_fixture_service_case_set_id,
    synthetic_fixture_workflow_case_set: caseSet,
    public_exports: DMS_CORE_CP207_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-207",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP207_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP207_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-207.dms_core_synthetic_fixture_workflow_descriptor",
      gate: DMS_CORE_CP207_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_synthetic_fixture_workflow_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-207.dms_core_synthetic_fixture_workflow_descriptor",
      gate: DMS_CORE_CP207_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP207_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP207_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP207_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP207_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP207_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M06.S16 onward with blocked-claim, rollback, retry, happy/denied/review unit descriptors, smoke fixture evidence, Hermes/Claude packets, and closeout rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

export function createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet(input = {}) {
  const workflowCaseSet = createDmsCoreCp207SyntheticFixtureWorkflowCaseSet(input);
  const serviceCaseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet(input);

  return freezeCp208Result({
    case_set_id: "dms-core-cp208-synthetic-fixture-tail-entrypoint-case-set",
    source_synthetic_fixture_workflow_case_set_id: workflowCaseSet.case_set_id,
    source_synthetic_fixture_service_case_set_id: serviceCaseSet.case_set_id,
    required_synthetic_fixture_tail_entrypoint_guards:
      DMS_CORE_CP208_REQUIREMENTS.required_synthetic_fixture_tail_entrypoint_guards,
    blocked_claim_output: Object.freeze({
      title: "Blocked-claim output",
      descriptor_only: true,
      source_state_transition_descriptor: workflowCaseSet.state_transition_enforcement.title,
      blocked_status: "blocked",
      customer_safe_error_code: "DMS_FIXTURE_BLOCKED_CLAIM",
      customer_safe_errors_only: true,
      dispatches_blocked_claim_runtime: false,
      blocked_claim_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      raw_payload_included: false,
    }),
    rollback_behavior: Object.freeze({
      title: "Rollback behavior",
      descriptor_only: true,
      rollback_scope: "synthetic_fixture_tail_descriptor",
      compensates_descriptor_steps_only: true,
      performs_rollback_runtime: false,
      rollback_internal_state_included: false,
      writes_state_transition: false,
      persists_workflow_attempt: false,
      customer_safe_errors_only: true,
    }),
    retry_behavior: Object.freeze({
      title: "Retry behavior",
      descriptor_only: true,
      retry_scope: "synthetic_fixture_tail_descriptor",
      bounded_retry_descriptor: true,
      max_retry_count_descriptor: 3,
      performs_retry_runtime: false,
      retry_internal_state_included: false,
      duplicate_runtime_detection_executed: false,
      customer_safe_errors_only: true,
    }),
    unit_test_happy_path: Object.freeze({
      title: "Unit test: happy path",
      descriptor_only: true,
      source_primary_path_descriptor: workflowCaseSet.primary_happy_path.title,
      expected_outcome: "allowed",
      executes_unit_test_runtime_paths: false,
      writes_product_state: false,
      fixture_payload_included: false,
    }),
    unit_test_denied_path: Object.freeze({
      title: "Unit test: denied path",
      descriptor_only: true,
      expected_outcome: "denied_customer_safe",
      customer_safe_error_code: "DMS_FIXTURE_DENIED",
      executes_unit_test_runtime_paths: false,
      permission_decision_detail_included: false,
      validation_error_detail_included: false,
    }),
    unit_test_review_path: Object.freeze({
      title: "Unit test: review path",
      descriptor_only: true,
      source_review_routing_descriptor: workflowCaseSet.review_required_routing.title,
      expected_outcome: "review_required",
      executes_unit_test_runtime_paths: false,
      dispatches_review_route_runtime: false,
      review_payload_included: false,
    }),
    integration_smoke_case: Object.freeze({
      title: "Integration smoke case",
      descriptor_only: true,
      smoke_scope: "descriptor_chain_cp198_to_cp208",
      source_integration_smoke_descriptor: serviceCaseSet.integration_smoke_case_descriptor.title,
      dispatches_integration_smoke_runtime: false,
      loads_real_fixture_data: false,
      fixture_payload_included: false,
      raw_payload_included: false,
    }),
    service_entrypoint_contract: Object.freeze({
      title: "Service entrypoint contract",
      descriptor_only: true,
      service_entrypoint: "createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor",
      source_service_entrypoint:
        serviceCaseSet.synthetic_fixture_service_entrypoint_contract.service_entrypoint,
      runtime_execution: false,
      fixture_service_runtime_dispatched: false,
      permission_runtime_evaluated: false,
      audit_runtime_appended: false,
      object_storage_runtime_executed: false,
    }),
    request_normalization: Object.freeze({
      title: "Request normalization",
      descriptor_only: true,
      normalized_fields: Object.freeze(["tenant_id", "matter_id", "fixture_id", "request_id"]),
      rejects_unknown_fields: true,
      normalizes_before_prechecks: true,
      runtime_execution: false,
      raw_payload_included: false,
      validation_error_detail_included: false,
    }),
    tenant_boundary_precheck: Object.freeze({
      title: "Tenant boundary precheck",
      descriptor_only: true,
      tenant_scope: "single_tenant_synthetic_fixture",
      passed: true,
      cross_tenant_access_allowed: false,
      runtime_tenant_lookup: false,
      tenant_policy_detail_included: false,
      permission_decision_detail_included: false,
      customer_safe_errors_only: true,
    }),
  });
}

export function createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor(input = {}) {
  const workflowDescriptor = createDmsCoreCp207SyntheticFixtureWorkflowDescriptor(input);
  const caseSet = createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet(input);
  return freezeCp208Result({
    descriptor: "DmsCoreCp208SyntheticFixtureTailEntrypointDescriptor",
    pack_binding: DMS_CORE_CP208_PACK_BINDING,
    source_synthetic_fixture_workflow_descriptor: workflowDescriptor.descriptor,
    source_synthetic_fixture_workflow_case_set_id: caseSet.source_synthetic_fixture_workflow_case_set_id,
    synthetic_fixture_tail_entrypoint_case_set: caseSet,
    public_exports: DMS_CORE_CP208_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-208",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP208_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP208_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-208.dms_core_synthetic_fixture_tail_entrypoint_descriptor",
      gate: DMS_CORE_CP208_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_synthetic_fixture_tail_entrypoint_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-208.dms_core_synthetic_fixture_tail_entrypoint_descriptor",
      gate: DMS_CORE_CP208_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP208_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP208_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP208_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP208_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP208_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M07.S04 onward with golden case set expansion, service contract descriptors, Hermes/Claude packets, and closeout rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp209Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP209_PACK_BINDING.pack_id,
    source_synthetic_fixture_tail_entrypoint_pack_id: DMS_CORE_CP209_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_permission_audit_gate_runtime: false,
    dispatches_primary_fixture_runtime: false,
    dispatches_secondary_fixture_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    dispatches_fixture_service_runtime: false,
    dispatches_golden_case_runtime: false,
    dispatches_hermes_packet_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_review_path_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    executes_state_transition: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_golden_case_payload: false,
    exposes_hermes_packet_body: false,
    exposes_matter_trace_detail: false,
    exposes_permission_decision_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_policy_rule_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_state_transition_payload: false,
    exposes_idempotency_key_material: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_blocked_claim_detail: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP209_NO_WRITE_ATTESTATION,
  });
}

function createDmsCoreCp209CycleCase(title, extra = {}) {
  return Object.freeze({
    title,
    descriptor_only: true,
    runtime_execution: false,
    customer_safe_errors_only: true,
    raw_payload_included: false,
    ...extra,
  });
}

export function createDmsCoreCp209GoldenCaseHermesCycleCaseSet(input = {}) {
  const tailCaseSet = createDmsCoreCp208SyntheticFixtureTailEntrypointCaseSet(input);
  const serviceCaseSet = createDmsCoreCp206SyntheticFixtureServiceCaseSet(input);

  const goldenCaseCycle = Object.freeze({
    cycle_id: "dms-core-cp209-golden-case-cycle",
    micro_phase_id: "RP06.P02.M07",
    micro_title: "Test And Golden Case Set",
    required_cycle_guards: DMS_CORE_CP209_REQUIREMENTS.required_golden_case_cycle_guards,
    matter_trace_precheck: createDmsCoreCp209CycleCase("Matter trace precheck", {
      matter_trace_id: "matter_rp06_synthetic_opening",
      passed: true,
      runtime_matter_lookup: false,
      matter_trace_detail_included: false,
      matter_payload_included: false,
    }),
    permission_precheck: createDmsCoreCp209CycleCase("Permission precheck", {
      passed: true,
      permission_runtime_evaluated: false,
      permission_decision_detail_included: false,
      permission_envelope_payload_included: false,
    }),
    audit_hint_precheck: createDmsCoreCp209CycleCase("Audit hint precheck", {
      passed: true,
      runtime_audit_lookup: false,
      audit_hint_detail_included: false,
      audit_event_body_included: false,
    }),
    primary_happy_path: createDmsCoreCp209CycleCase("Primary happy path", {
      source_entrypoint: tailCaseSet.service_entrypoint_contract.service_entrypoint,
      prechecks_pass: true,
      permission_gate_passed: true,
      audit_gate_passed: true,
      dispatches_golden_case_runtime: false,
      writes_product_state: false,
    }),
    secondary_workflow_path: createDmsCoreCp209CycleCase("Secondary workflow path", {
      review_required_descriptor: true,
      approval_required_descriptor: true,
      dispatches_golden_case_runtime: false,
      review_payload_included: false,
      approval_payload_included: false,
    }),
    state_transition_enforcement: createDmsCoreCp209CycleCase("State transition enforcement", {
      source_status: "not_reviewed",
      allowed_next_statuses: Object.freeze(["under_review", "blocked"]),
      runtime_state_write: false,
      writes_state_transition: false,
      state_transition_payload_included: false,
    }),
    idempotency_key_handling: createDmsCoreCp209CycleCase("Idempotency key handling", {
      key_scope: "tenant_matter_golden_case_descriptor",
      persists_idempotency_key: false,
      idempotency_key_material_included: false,
      duplicate_runtime_detection_executed: false,
    }),
    lock_acquisition_rule: createDmsCoreCp209CycleCase("Lock acquisition rule", {
      lock_scope: "tenant_matter_golden_case_descriptor",
      runtime_lock_acquired: false,
      lock_token_included: false,
      lock_wait_queue_executed: false,
    }),
    persistence_boundary: createDmsCoreCp209CycleCase("Persistence boundary", {
      persistence_scope: "golden_case_attempt_descriptor",
      persists_workflow_attempt: false,
      persists_idempotency_key: false,
      creates_database_rows: false,
      updates_database_rows: false,
      persistence_payload_included: false,
    }),
    validation_error_mapping: createDmsCoreCp209CycleCase("Validation error mapping", {
      validation_error_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      mappings: Object.freeze([
        Object.freeze({ source: "matter_trace_precheck", customer_safe_error_code: "DMS_GOLDEN_MATTER_TRACE" }),
        Object.freeze({ source: "permission_precheck", customer_safe_error_code: "DMS_GOLDEN_PERMISSION" }),
        Object.freeze({ source: "audit_hint_precheck", customer_safe_error_code: "DMS_GOLDEN_AUDIT_HINT" }),
        Object.freeze({ source: "state_transition_enforcement", customer_safe_error_code: "DMS_GOLDEN_STATE_TRANSITION" }),
        Object.freeze({ source: "idempotency_key_handling", customer_safe_error_code: "DMS_GOLDEN_IDEMPOTENCY" }),
        Object.freeze({ source: "lock_acquisition_rule", customer_safe_error_code: "DMS_GOLDEN_LOCK_BOUNDARY" }),
        Object.freeze({ source: "persistence_boundary", customer_safe_error_code: "DMS_GOLDEN_PERSISTENCE_BOUNDARY" }),
      ]),
    }),
    review_required_routing: createDmsCoreCp209CycleCase("Review-required routing", {
      review_required: true,
      read_only_claude_review_packet_only: true,
      dispatches_review_route_runtime: false,
      review_payload_included: false,
    }),
    approval_required_routing: createDmsCoreCp209CycleCase("Approval-required routing", {
      approval_required: true,
      human_approval_route_required_before_runtime: true,
      dispatches_approval_route_runtime: false,
      approval_payload_included: false,
    }),
    blocked_claim_output: createDmsCoreCp209CycleCase("Blocked-claim output", {
      blocked_status: "blocked",
      customer_safe_error_code: "DMS_GOLDEN_BLOCKED_CLAIM",
      dispatches_blocked_claim_runtime: false,
      blocked_claim_detail_included: false,
      permission_decision_detail_included: false,
    }),
    rollback_behavior: createDmsCoreCp209CycleCase("Rollback behavior", {
      rollback_scope: "golden_case_descriptor",
      compensates_descriptor_steps_only: true,
      performs_rollback_runtime: false,
      rollback_internal_state_included: false,
      writes_state_transition: false,
    }),
    retry_behavior: createDmsCoreCp209CycleCase("Retry behavior", {
      retry_scope: "golden_case_descriptor",
      bounded_retry_descriptor: true,
      max_retry_count_descriptor: 3,
      performs_retry_runtime: false,
      retry_internal_state_included: false,
    }),
    unit_test_happy_path: createDmsCoreCp209CycleCase("Unit test: happy path", {
      expected_outcome: "allowed",
      executes_unit_test_runtime_paths: false,
      fixture_payload_included: false,
    }),
    unit_test_denied_path: createDmsCoreCp209CycleCase("Unit test: denied path", {
      expected_outcome: "denied_customer_safe",
      customer_safe_error_code: "DMS_GOLDEN_DENIED",
      executes_unit_test_runtime_paths: false,
      permission_decision_detail_included: false,
    }),
    unit_test_review_path: createDmsCoreCp209CycleCase("Unit test: review path", {
      expected_outcome: "review_required",
      executes_unit_test_runtime_paths: false,
      dispatches_review_route_runtime: false,
      review_payload_included: false,
    }),
    integration_smoke_case: createDmsCoreCp209CycleCase("Integration smoke case", {
      smoke_scope: "descriptor_chain_cp198_to_cp209",
      dispatches_integration_smoke_runtime: false,
      loads_real_fixture_data: false,
      fixture_payload_included: false,
    }),
    golden_fixture_binding: createDmsCoreCp209CycleCase("Golden fixture binding", {
      fixture_id: serviceCaseSet.golden_fixture_binding.fixture_id,
      synthetic_only: true,
      no_real_data: true,
      real_client_data_loaded: false,
      document_bytes_loaded: false,
      fixture_payload_included: false,
      golden_case_payload_included: false,
    }),
    hermes_service_evidence: createDmsCoreCp209CycleCase("Hermes service evidence", {
      evidence_packet: "H06.CP00-209.dms_core_golden_case_cycle",
      receipt_shape: "descriptor_only_golden_case_cycle_no_write",
      emits_hermes_runtime_receipt: false,
      hermes_packet_body_included: false,
    }),
    claude_service_review_prompt: createDmsCoreCp209CycleCase("Claude service review prompt", {
      review_packet: "C06.CP00-209.dms_core_golden_case_cycle",
      read_only: true,
      allowed_tools: DMS_CORE_CP209_REQUIREMENTS.allowed_claude_tools,
      claude_final_approval_claimed: false,
    }),
  });

  const hermesEvidenceCycle = Object.freeze({
    cycle_id: "dms-core-cp209-hermes-evidence-cycle",
    micro_phase_id: "RP06.P02.M08",
    micro_title: "Hermes Evidence Packet",
    required_cycle_guards: DMS_CORE_CP209_REQUIREMENTS.required_hermes_evidence_cycle_guards,
    service_entrypoint_contract: createDmsCoreCp209CycleCase("Service entrypoint contract", {
      service_entrypoint: "createDmsCoreCp209GoldenCaseHermesCycleDescriptor",
      source_service_entrypoint: tailCaseSet.service_entrypoint_contract.service_entrypoint,
      fixture_service_runtime_dispatched: false,
      permission_runtime_evaluated: false,
      audit_runtime_appended: false,
      object_storage_runtime_executed: false,
    }),
    request_normalization: createDmsCoreCp209CycleCase("Request normalization", {
      normalized_fields: Object.freeze(["tenant_id", "matter_id", "fixture_id", "request_id", "evidence_packet_id"]),
      rejects_unknown_fields: true,
      normalizes_before_prechecks: true,
      validation_error_detail_included: false,
    }),
    tenant_boundary_precheck: createDmsCoreCp209CycleCase("Tenant boundary precheck", {
      tenant_scope: "single_tenant_synthetic_fixture",
      passed: true,
      cross_tenant_access_allowed: false,
      runtime_tenant_lookup: false,
      tenant_policy_detail_included: false,
    }),
    matter_trace_precheck: createDmsCoreCp209CycleCase("Matter trace precheck", {
      matter_trace_id: "matter_rp06_synthetic_opening",
      passed: true,
      runtime_matter_lookup: false,
      matter_trace_detail_included: false,
      matter_payload_included: false,
    }),
    permission_precheck: createDmsCoreCp209CycleCase("Permission precheck", {
      passed: true,
      permission_runtime_evaluated: false,
      permission_decision_detail_included: false,
      permission_envelope_payload_included: false,
    }),
    audit_hint_precheck: createDmsCoreCp209CycleCase("Audit hint precheck", {
      passed: true,
      runtime_audit_lookup: false,
      audit_hint_detail_included: false,
      audit_event_body_included: false,
    }),
    primary_happy_path: createDmsCoreCp209CycleCase("Primary happy path", {
      prechecks_pass: true,
      permission_gate_passed: true,
      audit_gate_passed: true,
      dispatches_hermes_packet_runtime: false,
      writes_product_state: false,
    }),
    secondary_workflow_path: createDmsCoreCp209CycleCase("Secondary workflow path", {
      review_required_descriptor: true,
      approval_required_descriptor: true,
      dispatches_hermes_packet_runtime: false,
      review_payload_included: false,
      approval_payload_included: false,
    }),
    state_transition_enforcement: createDmsCoreCp209CycleCase("State transition enforcement", {
      source_status: "not_reviewed",
      allowed_next_statuses: Object.freeze(["under_review", "blocked"]),
      runtime_state_write: false,
      writes_state_transition: false,
      state_transition_payload_included: false,
    }),
    idempotency_key_handling: createDmsCoreCp209CycleCase("Idempotency key handling", {
      key_scope: "tenant_matter_hermes_packet_descriptor",
      persists_idempotency_key: false,
      idempotency_key_material_included: false,
      duplicate_runtime_detection_executed: false,
    }),
    lock_acquisition_rule: createDmsCoreCp209CycleCase("Lock acquisition rule", {
      lock_scope: "tenant_matter_hermes_packet_descriptor",
      runtime_lock_acquired: false,
      lock_token_included: false,
      lock_wait_queue_executed: false,
    }),
    persistence_boundary: createDmsCoreCp209CycleCase("Persistence boundary", {
      persistence_scope: "hermes_packet_attempt_descriptor",
      persists_workflow_attempt: false,
      persists_idempotency_key: false,
      creates_database_rows: false,
      updates_database_rows: false,
      persistence_payload_included: false,
    }),
    validation_error_mapping: createDmsCoreCp209CycleCase("Validation error mapping", {
      validation_error_detail_included: false,
      permission_decision_detail_included: false,
      audit_event_body_included: false,
      mappings: Object.freeze([
        Object.freeze({ source: "tenant_boundary_precheck", customer_safe_error_code: "DMS_HERMES_TENANT_BOUNDARY" }),
        Object.freeze({ source: "matter_trace_precheck", customer_safe_error_code: "DMS_HERMES_MATTER_TRACE" }),
        Object.freeze({ source: "permission_precheck", customer_safe_error_code: "DMS_HERMES_PERMISSION" }),
        Object.freeze({ source: "audit_hint_precheck", customer_safe_error_code: "DMS_HERMES_AUDIT_HINT" }),
        Object.freeze({ source: "state_transition_enforcement", customer_safe_error_code: "DMS_HERMES_STATE_TRANSITION" }),
        Object.freeze({ source: "idempotency_key_handling", customer_safe_error_code: "DMS_HERMES_IDEMPOTENCY" }),
        Object.freeze({ source: "lock_acquisition_rule", customer_safe_error_code: "DMS_HERMES_LOCK_BOUNDARY" }),
        Object.freeze({ source: "persistence_boundary", customer_safe_error_code: "DMS_HERMES_PERSISTENCE_BOUNDARY" }),
      ]),
    }),
    review_required_routing: createDmsCoreCp209CycleCase("Review-required routing", {
      review_required: true,
      read_only_claude_review_packet_only: true,
      dispatches_review_route_runtime: false,
      review_payload_included: false,
    }),
    approval_required_routing: createDmsCoreCp209CycleCase("Approval-required routing", {
      approval_required: true,
      human_approval_route_required_before_runtime: true,
      dispatches_approval_route_runtime: false,
      approval_payload_included: false,
    }),
    blocked_claim_output: createDmsCoreCp209CycleCase("Blocked-claim output", {
      blocked_status: "blocked",
      customer_safe_error_code: "DMS_HERMES_BLOCKED_CLAIM",
      dispatches_blocked_claim_runtime: false,
      blocked_claim_detail_included: false,
      permission_decision_detail_included: false,
    }),
    rollback_behavior: createDmsCoreCp209CycleCase("Rollback behavior", {
      rollback_scope: "hermes_packet_descriptor",
      compensates_descriptor_steps_only: true,
      performs_rollback_runtime: false,
      rollback_internal_state_included: false,
      writes_state_transition: false,
    }),
    retry_behavior: createDmsCoreCp209CycleCase("Retry behavior", {
      retry_scope: "hermes_packet_descriptor",
      bounded_retry_descriptor: true,
      max_retry_count_descriptor: 3,
      performs_retry_runtime: false,
      retry_internal_state_included: false,
    }),
  });

  return freezeCp209Result({
    case_set_id: "dms-core-cp209-golden-case-hermes-cycle-case-set",
    source_synthetic_fixture_tail_entrypoint_case_set_id: tailCaseSet.case_set_id,
    source_synthetic_fixture_service_case_set_id: serviceCaseSet.case_set_id,
    golden_case_cycle: goldenCaseCycle,
    hermes_evidence_cycle: hermesEvidenceCycle,
  });
}

export function createDmsCoreCp209GoldenCaseHermesCycleDescriptor(input = {}) {
  const tailDescriptor = createDmsCoreCp208SyntheticFixtureTailEntrypointDescriptor(input);
  const caseSet = createDmsCoreCp209GoldenCaseHermesCycleCaseSet(input);
  return freezeCp209Result({
    descriptor: "DmsCoreCp209GoldenCaseHermesCycleDescriptor",
    pack_binding: DMS_CORE_CP209_PACK_BINDING,
    source_synthetic_fixture_tail_entrypoint_descriptor: tailDescriptor.descriptor,
    source_golden_case_cycle_id: caseSet.golden_case_cycle.cycle_id,
    source_hermes_evidence_cycle_id: caseSet.hermes_evidence_cycle.cycle_id,
    golden_case_hermes_cycle_case_set: caseSet,
    public_exports: DMS_CORE_CP209_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-209",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP209_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP209_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-209.dms_core_golden_case_hermes_cycle_descriptor",
      gate: DMS_CORE_CP209_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_golden_case_hermes_cycle_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-209.dms_core_golden_case_hermes_cycle_descriptor",
      gate: DMS_CORE_CP209_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP209_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP209_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP209_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP209_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP209_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P02.M08.S19 onward with the remaining Hermes evidence packet rows, Claude review packet rows, and closeout rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp210Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP210_PACK_BINDING.pack_id,
    source_golden_case_hermes_cycle_pack_id: DMS_CORE_CP210_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_golden_case_runtime: false,
    dispatches_hermes_packet_runtime: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_api_response_payload: false,
    exposes_error_taxonomy_internal_detail: false,
    exposes_pagination_cursor_material: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_golden_case_payload: false,
    exposes_hermes_packet_body: false,
    exposes_matter_trace_detail: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_state_transition_payload: false,
    exposes_idempotency_key_material: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_blocked_claim_detail: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP210_NO_WRITE_ATTESTATION,
  });
}

export function dmsCoreCp210RowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const DMS_CORE_CP210_ROW_EXTRAS = Object.freeze({
  service_entrypoint_contract: Object.freeze({ fixture_service_runtime_dispatched: false, permission_runtime_evaluated: false }),
  request_normalization: Object.freeze({ rejects_unknown_fields: true, normalizes_before_prechecks: true }),
  tenant_boundary_precheck: Object.freeze({ passed: true, cross_tenant_access_allowed: false, tenant_policy_detail_included: false }),
  matter_trace_precheck: Object.freeze({ passed: true, runtime_matter_lookup: false, matter_trace_detail_included: false }),
  permission_precheck: Object.freeze({ passed: true, permission_runtime_evaluated: false, permission_decision_detail_included: false }),
  audit_hint_precheck: Object.freeze({ passed: true, runtime_audit_lookup: false, audit_event_body_included: false }),
  primary_happy_path: Object.freeze({ prechecks_pass: true, permission_gate_passed: true, audit_gate_passed: true, writes_product_state: false }),
  secondary_workflow_path: Object.freeze({ review_required_descriptor: true, approval_required_descriptor: true, review_payload_included: false, approval_payload_included: false }),
  state_transition_enforcement: Object.freeze({ writes_state_transition: false, state_transition_payload_included: false }),
  idempotency_key_handling: Object.freeze({ persists_idempotency_key: false, idempotency_key_material_included: false }),
  lock_acquisition_rule: Object.freeze({ runtime_lock_acquired: false, lock_token_included: false }),
  persistence_boundary: Object.freeze({ persists_workflow_attempt: false, persistence_payload_included: false, creates_database_rows: false }),
  validation_error_mapping: Object.freeze({ validation_error_detail_included: false, permission_decision_detail_included: false }),
  review_required_routing: Object.freeze({ review_required: true, read_only_claude_review_packet_only: true, dispatches_review_route_runtime: false }),
  approval_required_routing: Object.freeze({ approval_required: true, human_approval_route_required_before_runtime: true, dispatches_approval_route_runtime: false }),
  blocked_claim_output: Object.freeze({ blocked_status: "blocked", dispatches_blocked_claim_runtime: false, blocked_claim_detail_included: false }),
  rollback_behavior: Object.freeze({ compensates_descriptor_steps_only: true, performs_rollback_runtime: false, rollback_internal_state_included: false }),
  retry_behavior: Object.freeze({ bounded_retry_descriptor: true, max_retry_count_descriptor: 3, performs_retry_runtime: false, retry_internal_state_included: false }),
  unit_test_happy_path: Object.freeze({ expected_outcome: "allowed", executes_unit_test_runtime_paths: false }),
  unit_test_denied_path: Object.freeze({ expected_outcome: "denied_customer_safe", executes_unit_test_runtime_paths: false, permission_decision_detail_included: false }),
  unit_test_review_path: Object.freeze({ expected_outcome: "review_required", executes_unit_test_runtime_paths: false, review_payload_included: false }),
  integration_smoke_case: Object.freeze({ smoke_scope: "descriptor_chain_cp198_to_cp210", dispatches_integration_smoke_runtime: false, fixture_payload_included: false }),
  public_export_map: Object.freeze({ index_export_check: true }),
  request_contract: Object.freeze({ rejects_unknown_fields: true }),
  response_contract: Object.freeze({ api_response_payload_included: false }),
  error_code_taxonomy: Object.freeze({ error_taxonomy_internal_detail_included: false }),
  permission_annotation: Object.freeze({ permission_decision_detail_included: false }),
  audit_annotation: Object.freeze({ audit_event_body_included: false }),
  pagination_or_filtering_contract: Object.freeze({ pagination_cursor_material_included: false }),
  serialization_guard: Object.freeze({ serialization_guard_applied: true }),
  unauthorized_data_omission: Object.freeze({ unauthorized_data_omitted: true }),
  api_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  contract_test: Object.freeze({ executes_unit_test_runtime_paths: false }),
  invalid_request_test: Object.freeze({ expected_outcome: "rejected_customer_safe", executes_unit_test_runtime_paths: false, validation_error_detail_included: false }),
  denied_response_test: Object.freeze({ expected_outcome: "denied_customer_safe", executes_unit_test_runtime_paths: false, permission_decision_detail_included: false }),
  hermes_api_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_interface_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  documentation_example: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-210" }),
  versioning_note: Object.freeze({ schema_version_recorded: true }),
  closeout_handoff: Object.freeze({ handoff_descriptor_only: true }),
  downstream_consumer_note: Object.freeze({ downstream_runtime_opened: false }),
  command_rerun: Object.freeze({ rerunnable_descriptor: true, executes_command_runtime: false }),
  schema_drift_check: Object.freeze({ schema_drift_detected: false }),
  backward_compatibility_check: Object.freeze({ backward_compatible_descriptor: true }),
});

export function createDmsCoreCp210P02CloseoutP03FoundationCaseSet(input = {}) {
  const upstream = createDmsCoreCp209GoldenCaseHermesCycleCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP210_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP210_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP210_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp210Result({
    case_set_id: "dms-core-cp210-p02-closeout-p03-foundation-case-set",
    source_golden_case_hermes_cycle_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp210P02CloseoutP03FoundationDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp209GoldenCaseHermesCycleDescriptor(input);
  const caseSet = createDmsCoreCp210P02CloseoutP03FoundationCaseSet(input);
  return freezeCp210Result({
    descriptor: "DmsCoreCp210P02CloseoutP03FoundationDescriptor",
    pack_binding: DMS_CORE_CP210_PACK_BINDING,
    source_golden_case_hermes_cycle_descriptor: upstreamDescriptor.descriptor,
    p02_closeout_p03_foundation_case_set: caseSet,
    public_exports: DMS_CORE_CP210_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-210",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP210_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP210_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-210.dms_core_p02_closeout_p03_foundation_descriptor",
      gate: DMS_CORE_CP210_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p02_closeout_p03_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-210.dms_core_p02_closeout_p03_foundation_descriptor",
      gate: DMS_CORE_CP210_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP210_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP210_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP210_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP210_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP210_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P03.M06.S01 onward with the P03 synthetic fixture, golden case, Hermes, Claude, closeout rows and the P04 opening rows while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp211Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP211_PACK_BINDING.pack_id,
    source_p02_closeout_p03_foundation_pack_id: DMS_CORE_CP211_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_blocked_claim_runtime: false,
    dispatches_integration_smoke_runtime: false,
    dispatches_golden_case_runtime: false,
    dispatches_hermes_packet_runtime: false,
    dispatches_build_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_api_response_payload: false,
    exposes_error_taxonomy_internal_detail: false,
    exposes_pagination_cursor_material: false,
    exposes_ui_state_payload: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_golden_case_payload: false,
    exposes_hermes_packet_body: false,
    exposes_matter_trace_detail: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_matter_payload: false,
    exposes_audit_event_body: false,
    exposes_audit_trace_payload: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_state_transition_payload: false,
    exposes_idempotency_key_material: false,
    exposes_lock_token: false,
    exposes_persistence_payload: false,
    exposes_blocked_claim_detail: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP211_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP211_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP210_ROW_EXTRAS,
  integration_smoke_case: Object.freeze({ smoke_scope: "descriptor_chain_cp198_to_cp211", dispatches_integration_smoke_runtime: false, fixture_payload_included: false }),
  documentation_example: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-211" }),
  ui_surface_inventory: Object.freeze({ ui_surface_descriptor_only: true }),
  data_dependency_map: Object.freeze({ data_dependency_map_recorded: true, ui_state_payload_included: false }),
  loading_state: Object.freeze({ ui_state: "loading", executes_ui_runtime: false, ui_state_payload_included: false }),
  empty_state: Object.freeze({ ui_state: "empty", executes_ui_runtime: false, ui_state_payload_included: false }),
  denied_state: Object.freeze({ ui_state: "denied_customer_safe", executes_ui_runtime: false, permission_decision_detail_included: false }),
  review_required_state: Object.freeze({ ui_state: "review_required", executes_ui_runtime: false, review_payload_included: false }),
  primary_interaction: Object.freeze({ executes_ui_runtime: false, writes_product_state: false }),
  secondary_interaction: Object.freeze({ executes_ui_runtime: false, writes_product_state: false }),
  permission_badge: Object.freeze({ permission_decision_detail_included: false }),
  audit_hint_display: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  error_message_copy: Object.freeze({ validation_error_detail_included: false }),
  responsive_desktop_layout: Object.freeze({ layout_descriptor_only: true }),
  responsive_mobile_layout: Object.freeze({ layout_descriptor_only: true }),
  keyboard_focus_behavior: Object.freeze({ keyboard_focus_descriptor_only: true }),
  visual_density_check: Object.freeze({ visual_density_descriptor_only: true }),
  synthetic_fixture_binding: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  build_smoke: Object.freeze({ dispatches_build_runtime: false }),
  hermes_ui_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_ui_leak_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false, ui_leak_check_descriptor: true }),
});

export function createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet(input = {}) {
  const upstream = createDmsCoreCp210P02CloseoutP03FoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP211_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP211_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP211_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp211Result({
    case_set_id: "dms-core-cp211-p03-closeout-p04-ui-foundation-case-set",
    source_p02_closeout_p03_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp210P02CloseoutP03FoundationDescriptor(input);
  const caseSet = createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet(input);
  return freezeCp211Result({
    descriptor: "DmsCoreCp211P03CloseoutP04UiFoundationDescriptor",
    pack_binding: DMS_CORE_CP211_PACK_BINDING,
    source_p02_closeout_p03_foundation_descriptor: upstreamDescriptor.descriptor,
    p03_closeout_p04_ui_foundation_case_set: caseSet,
    public_exports: DMS_CORE_CP211_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-211",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP211_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP211_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-211.dms_core_p03_closeout_p04_ui_foundation_descriptor",
      gate: DMS_CORE_CP211_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p03_closeout_p04_ui_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-211.dms_core_p03_closeout_p04_ui_foundation_descriptor",
      gate: DMS_CORE_CP211_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP211_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP211_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP211_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP211_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP211_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P04.M03.S09 onward with the remaining P04 UI primary slice rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp212Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP212_PACK_BINDING.pack_id,
    source_p03_closeout_p04_ui_foundation_pack_id: DMS_CORE_CP212_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_ui_state_payload: false,
    exposes_api_response_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP212_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp212UiPrimarySliceTailCaseSet(input = {}) {
  const upstream = createDmsCoreCp211P03CloseoutP04UiFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP212_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP211_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP212_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp212Result({
    case_set_id: "dms-core-cp212-ui-primary-slice-tail-case-set",
    source_p03_closeout_p04_ui_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp212UiPrimarySliceTailDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp211P03CloseoutP04UiFoundationDescriptor(input);
  const caseSet = createDmsCoreCp212UiPrimarySliceTailCaseSet(input);
  return freezeCp212Result({
    descriptor: "DmsCoreCp212UiPrimarySliceTailDescriptor",
    pack_binding: DMS_CORE_CP212_PACK_BINDING,
    source_p03_closeout_p04_ui_foundation_descriptor: upstreamDescriptor.descriptor,
    ui_primary_slice_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP212_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-212",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP212_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP212_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-212.dms_core_ui_primary_slice_tail_descriptor",
      gate: DMS_CORE_CP212_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_ui_primary_slice_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-212.dms_core_ui_primary_slice_tail_descriptor",
      gate: DMS_CORE_CP212_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP212_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP212_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP212_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP212_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP212_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P04.M03.S19 onward with the remaining P04 primary slice rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp213Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP213_PACK_BINDING.pack_id,
    source_ui_primary_slice_tail_pack_id: DMS_CORE_CP213_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_unauthorized_count: false,
    exposes_state_snapshot_payload: false,
    exposes_ui_state_payload: false,
    exposes_api_response_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP213_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP213_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP211_ROW_EXTRAS,
  state_snapshot: Object.freeze({ snapshot_descriptor_only: true, ui_state_payload_included: false, state_snapshot_payload_included: false }),
  no_unauthorized_count_leak: Object.freeze({ unauthorized_count_included: false, unauthorized_data_omitted: true }),
});

export function createDmsCoreCp213UiSecondarySliceBindingCaseSet(input = {}) {
  const upstream = createDmsCoreCp212UiPrimarySliceTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP213_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP213_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP213_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp213Result({
    case_set_id: "dms-core-cp213-ui-secondary-slice-binding-case-set",
    source_ui_primary_slice_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp213UiSecondarySliceBindingDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp212UiPrimarySliceTailDescriptor(input);
  const caseSet = createDmsCoreCp213UiSecondarySliceBindingCaseSet(input);
  return freezeCp213Result({
    descriptor: "DmsCoreCp213UiSecondarySliceBindingDescriptor",
    pack_binding: DMS_CORE_CP213_PACK_BINDING,
    source_ui_primary_slice_tail_descriptor: upstreamDescriptor.descriptor,
    ui_secondary_slice_binding_case_set: caseSet,
    public_exports: DMS_CORE_CP213_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-213",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP213_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP213_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-213.dms_core_ui_secondary_slice_binding_descriptor",
      gate: DMS_CORE_CP213_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_ui_secondary_slice_binding_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-213.dms_core_ui_secondary_slice_binding_descriptor",
      gate: DMS_CORE_CP213_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP213_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP213_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP213_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP213_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP213_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P04.M05.S15 onward with the remaining P04 permission/audit binding rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp214Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP214_PACK_BINDING.pack_id,
    source_ui_secondary_slice_binding_pack_id: DMS_CORE_CP214_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_unauthorized_count: false,
    exposes_state_snapshot_payload: false,
    exposes_ui_state_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP214_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp214UiBindingTailCaseSet(input = {}) {
  const upstream = createDmsCoreCp213UiSecondarySliceBindingCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP214_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP213_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP214_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp214Result({
    case_set_id: "dms-core-cp214-ui-binding-tail-case-set",
    source_ui_secondary_slice_binding_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp214UiBindingTailDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp213UiSecondarySliceBindingDescriptor(input);
  const caseSet = createDmsCoreCp214UiBindingTailCaseSet(input);
  return freezeCp214Result({
    descriptor: "DmsCoreCp214UiBindingTailDescriptor",
    pack_binding: DMS_CORE_CP214_PACK_BINDING,
    source_ui_secondary_slice_binding_descriptor: upstreamDescriptor.descriptor,
    ui_binding_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP214_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-214",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP214_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP214_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-214.dms_core_ui_binding_tail_descriptor",
      gate: DMS_CORE_CP214_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_ui_binding_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-214.dms_core_ui_binding_tail_descriptor",
      gate: DMS_CORE_CP214_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP214_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP214_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP214_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP214_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP214_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P04.M06.S03 onward with the remaining P04 synthetic fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp215Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP215_PACK_BINDING.pack_id,
    source_ui_binding_tail_pack_id: DMS_CORE_CP215_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_unauthorized_count: false,
    exposes_state_snapshot_payload: false,
    exposes_ui_state_payload: false,
    exposes_ai_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP215_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP215_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP213_ROW_EXTRAS,
  base_tenant_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false, fixture_scope: "tenant" }),
  base_user_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false, fixture_scope: "user" }),
  base_matter_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false, fixture_scope: "matter" }),
  base_document_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false, fixture_scope: "document", document_bytes_loaded: false }),
  primary_golden_case: Object.freeze({ expected_outcome: "allowed", executes_runtime_case: false }),
  secondary_golden_case: Object.freeze({ expected_outcome: "review_or_approval_descriptor", executes_runtime_case: false }),
  review_required_case: Object.freeze({ expected_outcome: "review_required", executes_runtime_case: false, review_payload_included: false }),
  denied_case: Object.freeze({ expected_outcome: "denied_customer_safe", executes_runtime_case: false, permission_decision_detail_included: false }),
  cross_tenant_case: Object.freeze({ expected_outcome: "denied_customer_safe", executes_runtime_case: false, cross_tenant_access_allowed: false, tenant_policy_detail_included: false }),
  missing_context_case: Object.freeze({ expected_outcome: "rejected_customer_safe", executes_runtime_case: false, validation_error_detail_included: false }),
  audit_hint_case: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  security_trimming_case: Object.freeze({ unauthorized_data_omitted: true, trimmed_fields_descriptor_only: true }),
  ai_retrieval_or_analytics_case: Object.freeze({ dispatches_ai_runtime: false, ai_payload_included: false, ai_descriptor_only: true }),
  fixture_manifest: Object.freeze({ fixture_payload_included: false, manifest_descriptor_only: true }),
  golden_test: Object.freeze({ expected_outcome: "allowed", executes_unit_test_runtime_paths: false }),
  failure_test: Object.freeze({ expected_outcome: "denied_customer_safe", executes_unit_test_runtime_paths: false }),
  hermes_fixture_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_missing_test_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  no_real_data_check: Object.freeze({ real_client_data_loaded: false, no_real_data: true }),
});

export function createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet(input = {}) {
  const upstream = createDmsCoreCp214UiBindingTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP215_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP215_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP215_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp215Result({
    case_set_id: "dms-core-cp215-p04-closeout-p05-fixture-foundation-case-set",
    source_ui_binding_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp214UiBindingTailDescriptor(input);
  const caseSet = createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet(input);
  return freezeCp215Result({
    descriptor: "DmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor",
    pack_binding: DMS_CORE_CP215_PACK_BINDING,
    source_ui_binding_tail_descriptor: upstreamDescriptor.descriptor,
    p04_closeout_p05_fixture_foundation_case_set: caseSet,
    public_exports: DMS_CORE_CP215_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-215",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP215_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP215_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-215.dms_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: DMS_CORE_CP215_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p04_closeout_p05_fixture_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-215.dms_core_p04_closeout_p05_fixture_foundation_descriptor",
      gate: DMS_CORE_CP215_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP215_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP215_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP215_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP215_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP215_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P05.M02.S15 onward with the remaining P05 fixture case rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp216Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP216_PACK_BINDING.pack_id,
    source_p04_closeout_p05_fixture_foundation_pack_id: DMS_CORE_CP216_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_replay_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_stable_id_material: false,
    exposes_ai_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP216_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP216_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP215_ROW_EXTRAS,
  stable_id_check: Object.freeze({ stable_ids_descriptor_only: true, id_drift_detected: false, stable_id_material_included: false }),
  replay_command: Object.freeze({ rerunnable_descriptor: true, executes_command_runtime: false, executes_replay_runtime: false }),
});

export function createDmsCoreCp216FixtureCaseSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp215P04CloseoutP05FixtureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP216_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP216_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP216_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp216Result({
    case_set_id: "dms-core-cp216-fixture-case-slice-case-set",
    source_p04_closeout_p05_fixture_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp216FixtureCaseSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp215P04CloseoutP05FixtureFoundationDescriptor(input);
  const caseSet = createDmsCoreCp216FixtureCaseSliceCaseSet(input);
  return freezeCp216Result({
    descriptor: "DmsCoreCp216FixtureCaseSliceDescriptor",
    pack_binding: DMS_CORE_CP216_PACK_BINDING,
    source_p04_closeout_p05_fixture_foundation_descriptor: upstreamDescriptor.descriptor,
    fixture_case_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP216_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-216",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP216_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP216_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-216.dms_core_fixture_case_slice_descriptor",
      gate: DMS_CORE_CP216_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_fixture_case_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-216.dms_core_fixture_case_slice_descriptor",
      gate: DMS_CORE_CP216_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP216_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP216_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP216_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP216_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP216_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P05.M04.S13 onward with the remaining P05 fixture case rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp217Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP217_PACK_BINDING.pack_id,
    source_fixture_case_slice_pack_id: DMS_CORE_CP217_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_build_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    serves_api_response_runtime: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_replay_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_stable_id_material: false,
    exposes_ai_payload: false,
    exposes_review_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP217_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp217FixtureBindingSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp216FixtureCaseSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP217_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP216_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP217_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp217Result({
    case_set_id: "dms-core-cp217-fixture-binding-slice-case-set",
    source_fixture_case_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp217FixtureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp216FixtureCaseSliceDescriptor(input);
  const caseSet = createDmsCoreCp217FixtureBindingSliceCaseSet(input);
  return freezeCp217Result({
    descriptor: "DmsCoreCp217FixtureBindingSliceDescriptor",
    pack_binding: DMS_CORE_CP217_PACK_BINDING,
    source_fixture_case_slice_descriptor: upstreamDescriptor.descriptor,
    fixture_binding_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP217_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-217",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP217_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP217_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-217.dms_core_fixture_binding_slice_descriptor",
      gate: DMS_CORE_CP217_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_fixture_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-217.dms_core_fixture_binding_slice_descriptor",
      gate: DMS_CORE_CP217_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP217_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP217_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP217_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP217_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP217_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P05.M06.S09 onward with the remaining P05 fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp218Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP218_PACK_BINDING.pack_id,
    source_fixture_binding_slice_pack_id: DMS_CORE_CP218_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_replay_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    exposes_ai_payload: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP218_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp218FixtureSetTailCaseSet(input = {}) {
  const upstream = createDmsCoreCp217FixtureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP218_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP216_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP218_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp218Result({
    case_set_id: "dms-core-cp218-fixture-set-tail-case-set",
    source_fixture_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp218FixtureSetTailDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp217FixtureBindingSliceDescriptor(input);
  const caseSet = createDmsCoreCp218FixtureSetTailCaseSet(input);
  return freezeCp218Result({
    descriptor: "DmsCoreCp218FixtureSetTailDescriptor",
    pack_binding: DMS_CORE_CP218_PACK_BINDING,
    source_fixture_binding_slice_descriptor: upstreamDescriptor.descriptor,
    fixture_set_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP218_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-218",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP218_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP218_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-218.dms_core_fixture_set_tail_descriptor",
      gate: DMS_CORE_CP218_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_fixture_set_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-218.dms_core_fixture_set_tail_descriptor",
      gate: DMS_CORE_CP218_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP218_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP218_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP218_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP218_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP218_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P05.M06.S19 onward with the remaining P05 rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp219Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP219_PACK_BINDING.pack_id,
    source_fixture_set_tail_pack_id: DMS_CORE_CP219_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_replay_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    enforces_deny_over_allow_descriptor: true,
    allows_cross_wall_access: false,
    exposes_policy_rule_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_ai_payload: false,
    exposes_fixture_payload: false,
    exposes_stable_id_material: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP219_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP219_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP216_ROW_EXTRAS,
  permission_matrix_row: Object.freeze({ matrix_descriptor_only: true, permission_decision_detail_included: false }),
  view_decision_binding: Object.freeze({ permission_runtime_evaluated: false, permission_decision_detail_included: false }),
  search_decision_binding: Object.freeze({ permission_runtime_evaluated: false, permission_decision_detail_included: false, search_runtime_executed: false }),
  mutation_decision_binding: Object.freeze({ permission_runtime_evaluated: false, writes_product_state: false }),
  export_download_decision_binding: Object.freeze({ permission_runtime_evaluated: false, executes_file_download: false }),
  share_decision_binding: Object.freeze({ permission_runtime_evaluated: false, external_share_executed: false }),
  ai_retrieval_decision_binding: Object.freeze({ permission_runtime_evaluated: false, dispatches_ai_runtime: false }),
  audit_hint_fields: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  matched_rule_capture: Object.freeze({ policy_rule_detail_included: false }),
  deny_over_allow_check: Object.freeze({ deny_over_allow_enforced: true }),
  legal_hold_interaction: Object.freeze({ legal_hold_descriptor_only: true, writes_product_state: false }),
  ethical_wall_interaction: Object.freeze({ ethical_wall_descriptor_only: true, cross_wall_access_allowed: false }),
  object_acl_interaction: Object.freeze({ acl_descriptor_only: true, permission_decision_detail_included: false }),
  review_required_route: Object.freeze({ dispatches_review_route_runtime: false, review_payload_included: false }),
  approval_required_route: Object.freeze({ dispatches_approval_route_runtime: false, human_approval_route_required_before_runtime: true }),
  security_trimming_proof: Object.freeze({ unauthorized_data_omitted: true }),
  audit_event_expectation: Object.freeze({ audit_event_body_included: false, audit_runtime_appended: false }),
  permission_fixture: Object.freeze({ fixture_payload_included: false, permission_envelope_payload_included: false }),
  allowed_test: Object.freeze({ expected_outcome: "allowed", executes_unit_test_runtime_paths: false }),
  denied_test: Object.freeze({ expected_outcome: "denied_customer_safe", executes_unit_test_runtime_paths: false, permission_decision_detail_included: false }),
});

export function createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet(input = {}) {
  const upstream = createDmsCoreCp218FixtureSetTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP219_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP219_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP219_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp219Result({
    case_set_id: "dms-core-cp219-p05-closeout-p06-permission-matrix-case-set",
    source_fixture_set_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp218FixtureSetTailDescriptor(input);
  const caseSet = createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet(input);
  return freezeCp219Result({
    descriptor: "DmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor",
    pack_binding: DMS_CORE_CP219_PACK_BINDING,
    source_fixture_set_tail_descriptor: upstreamDescriptor.descriptor,
    p05_closeout_p06_permission_matrix_case_set: caseSet,
    public_exports: DMS_CORE_CP219_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-219",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP219_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP219_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-219.dms_core_p05_closeout_p06_permission_matrix_descriptor",
      gate: DMS_CORE_CP219_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p05_closeout_p06_permission_matrix_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-219.dms_core_p05_closeout_p06_permission_matrix_descriptor",
      gate: DMS_CORE_CP219_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP219_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP219_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP219_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP219_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP219_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P06.M02.S21 onward with the remaining P06 permission matrix rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp220Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP220_PACK_BINDING.pack_id,
    source_p05_closeout_p06_permission_matrix_pack_id: DMS_CORE_CP220_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_replay_runtime: false,
    executes_file_download: false,
    external_share_executed: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    enforces_deny_over_allow_descriptor: true,
    allows_cross_wall_access: false,
    leak_detected: false,
    exposes_policy_rule_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP220_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP220_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP219_ROW_EXTRAS,
  cross_tenant_test: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false, executes_unit_test_runtime_paths: false }),
  leak_prevention_test: Object.freeze({ leak_detected: false, unauthorized_data_omitted: true, executes_unit_test_runtime_paths: false }),
});

export function createDmsCoreCp220PermissionMatrixSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp219P05CloseoutP06PermissionMatrixCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP220_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP220_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP220_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp220Result({
    case_set_id: "dms-core-cp220-permission-matrix-slice-case-set",
    source_p05_closeout_p06_permission_matrix_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp220PermissionMatrixSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp219P05CloseoutP06PermissionMatrixDescriptor(input);
  const caseSet = createDmsCoreCp220PermissionMatrixSliceCaseSet(input);
  return freezeCp220Result({
    descriptor: "DmsCoreCp220PermissionMatrixSliceDescriptor",
    pack_binding: DMS_CORE_CP220_PACK_BINDING,
    source_p05_closeout_p06_permission_matrix_descriptor: upstreamDescriptor.descriptor,
    permission_matrix_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP220_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-220",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP220_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP220_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-220.dms_core_permission_matrix_slice_descriptor",
      gate: DMS_CORE_CP220_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_matrix_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-220.dms_core_permission_matrix_slice_descriptor",
      gate: DMS_CORE_CP220_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP220_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP220_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP220_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP220_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP220_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P06.M03.S09 onward with the remaining P06 permission matrix slice rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp221Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP221_PACK_BINDING.pack_id,
    source_permission_matrix_slice_pack_id: DMS_CORE_CP221_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_file_download: false,
    external_share_executed: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    enforces_deny_over_allow_descriptor: true,
    allows_cross_wall_access: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_policy_rule_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP221_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP221_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP220_ROW_EXTRAS,
  hermes_security_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  claude_bypass_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false, bypass_check_descriptor: true, permission_bypass_detected: false }),
  human_approval_note: Object.freeze({ human_approval_route_required_before_runtime: true }),
});

export function createDmsCoreCp221PermissionWorkflowSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp220PermissionMatrixSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP221_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP221_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP221_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp221Result({
    case_set_id: "dms-core-cp221-permission-workflow-slice-case-set",
    source_permission_matrix_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp221PermissionWorkflowSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp220PermissionMatrixSliceDescriptor(input);
  const caseSet = createDmsCoreCp221PermissionWorkflowSliceCaseSet(input);
  return freezeCp221Result({
    descriptor: "DmsCoreCp221PermissionWorkflowSliceDescriptor",
    pack_binding: DMS_CORE_CP221_PACK_BINDING,
    source_permission_matrix_slice_descriptor: upstreamDescriptor.descriptor,
    permission_workflow_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP221_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-221",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP221_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP221_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-221.dms_core_permission_workflow_slice_descriptor",
      gate: DMS_CORE_CP221_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_workflow_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-221.dms_core_permission_workflow_slice_descriptor",
      gate: DMS_CORE_CP221_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP221_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP221_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP221_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP221_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP221_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P06.M04.S24 onward with the remaining P06 permission workflow rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp222Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP222_PACK_BINDING.pack_id,
    source_permission_workflow_slice_pack_id: DMS_CORE_CP222_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_file_download: false,
    external_share_executed: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    enforces_deny_over_allow_descriptor: true,
    allows_cross_wall_access: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_policy_rule_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP222_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp222PermissionAuditBindingSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp221PermissionWorkflowSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP222_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP221_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP222_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp222Result({
    case_set_id: "dms-core-cp222-permission-audit-binding-slice-case-set",
    source_permission_workflow_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp222PermissionAuditBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp221PermissionWorkflowSliceDescriptor(input);
  const caseSet = createDmsCoreCp222PermissionAuditBindingSliceCaseSet(input);
  return freezeCp222Result({
    descriptor: "DmsCoreCp222PermissionAuditBindingSliceDescriptor",
    pack_binding: DMS_CORE_CP222_PACK_BINDING,
    source_permission_workflow_slice_descriptor: upstreamDescriptor.descriptor,
    permission_audit_binding_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP222_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-222",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP222_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP222_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-222.dms_core_permission_audit_binding_slice_descriptor",
      gate: DMS_CORE_CP222_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_permission_audit_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-222.dms_core_permission_audit_binding_slice_descriptor",
      gate: DMS_CORE_CP222_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP222_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP222_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP222_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP222_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP222_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P06.M06.S14 onward with the remaining P06 synthetic fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp223Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP223_PACK_BINDING.pack_id,
    source_permission_audit_binding_slice_pack_id: DMS_CORE_CP223_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_file_download: false,
    external_share_executed: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    enforces_deny_over_allow_descriptor: true,
    allows_cross_wall_access: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_failure_internal_state: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    exposes_lock_token: false,
    exposes_blocked_claim_detail: false,
    exposes_policy_rule_detail: false,
    exposes_permission_envelope_payload: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP223_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP223_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP221_ROW_EXTRAS,
  failure_taxonomy: Object.freeze({ failure_taxonomy_descriptor_only: true, validation_error_detail_included: false }),
  missing_tenant_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  missing_actor_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  missing_matter_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  missing_resource_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  unknown_action_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  cross_tenant_failure: Object.freeze({ expected_outcome: "denied_customer_safe", cross_tenant_access_allowed: false, tenant_policy_detail_included: false }),
  permission_denied_failure: Object.freeze({ expected_outcome: "denied_customer_safe", permission_decision_detail_included: false }),
  ambiguous_rule_failure: Object.freeze({ expected_outcome: "denied_customer_safe", deny_over_allow_enforced: true, policy_rule_detail_included: false }),
  stale_reference_failure: Object.freeze({ expected_outcome: "rejected_customer_safe", validation_error_detail_included: false }),
  lock_conflict_failure: Object.freeze({ expected_outcome: "retry_customer_safe", runtime_lock_acquired: false, lock_token_included: false }),
  retry_exhaustion_failure: Object.freeze({ expected_outcome: "failed_customer_safe", performs_retry_runtime: false, retry_internal_state_included: false }),
  rollback_expectation: Object.freeze({ performs_rollback_runtime: false, rollback_internal_state_included: false, compensates_descriptor_steps_only: true }),
  compensation_expectation: Object.freeze({ compensates_descriptor_steps_only: true, performs_rollback_runtime: false }),
  blocked_claim_receipt: Object.freeze({ blocked_claim_detail_included: false, customer_safe_error_code: "DMS_FAILURE_BLOCKED_CLAIM" }),
  failure_fixture: Object.freeze({ fixture_payload_included: false, real_client_data_loaded: false }),
  failure_unit_test: Object.freeze({ executes_unit_test_runtime_paths: false, failure_internal_state_included: false }),
  failure_integration_smoke: Object.freeze({ dispatches_integration_smoke_runtime: false, fixture_payload_included: false }),
  audit_failure_hint: Object.freeze({ audit_hint_detail_included: false, audit_event_body_included: false }),
  hermes_failure_evidence: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
});

export function createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet(input = {}) {
  const upstream = createDmsCoreCp222PermissionAuditBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP223_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP223_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP223_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp223Result({
    case_set_id: "dms-core-cp223-p06-closeout-p07-failure-foundation-case-set",
    source_permission_audit_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp222PermissionAuditBindingSliceDescriptor(input);
  const caseSet = createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet(input);
  return freezeCp223Result({
    descriptor: "DmsCoreCp223P06CloseoutP07FailureFoundationDescriptor",
    pack_binding: DMS_CORE_CP223_PACK_BINDING,
    source_permission_audit_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p06_closeout_p07_failure_foundation_case_set: caseSet,
    public_exports: DMS_CORE_CP223_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-223",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP223_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP223_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-223.dms_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: DMS_CORE_CP223_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p06_closeout_p07_failure_foundation_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-223.dms_core_p06_closeout_p07_failure_foundation_descriptor",
      gate: DMS_CORE_CP223_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP223_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP223_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP223_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP223_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP223_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P07.M02.S13 onward with the remaining P07 failure taxonomy rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp224Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP224_PACK_BINDING.pack_id,
    source_p06_closeout_p07_failure_foundation_pack_id: DMS_CORE_CP224_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    silent_success_detected: false,
    leak_detected: false,
    exposes_failure_internal_state: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    exposes_lock_token: false,
    exposes_blocked_claim_detail: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP224_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP224_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP223_ROW_EXTRAS,
  claude_edge_case_prompt: Object.freeze({ read_only: true, claude_final_approval_claimed: false, edge_case_check_descriptor: true }),
  human_escalation_note: Object.freeze({ human_approval_route_required_before_runtime: true, escalation_descriptor_only: true }),
  no_silent_success_check: Object.freeze({ silent_success_detected: false }),
  no_data_leak_check: Object.freeze({ leak_detected: false, unauthorized_data_omitted: true }),
});

export function createDmsCoreCp224FailureRecoverySliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp223P06CloseoutP07FailureFoundationCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP224_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP224_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP224_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp224Result({
    case_set_id: "dms-core-cp224-failure-recovery-slice-case-set",
    source_p06_closeout_p07_failure_foundation_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp224FailureRecoverySliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp223P06CloseoutP07FailureFoundationDescriptor(input);
  const caseSet = createDmsCoreCp224FailureRecoverySliceCaseSet(input);
  return freezeCp224Result({
    descriptor: "DmsCoreCp224FailureRecoverySliceDescriptor",
    pack_binding: DMS_CORE_CP224_PACK_BINDING,
    source_p06_closeout_p07_failure_foundation_descriptor: upstreamDescriptor.descriptor,
    failure_recovery_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP224_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-224",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP224_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP224_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-224.dms_core_failure_recovery_slice_descriptor",
      gate: DMS_CORE_CP224_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_failure_recovery_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-224.dms_core_failure_recovery_slice_descriptor",
      gate: DMS_CORE_CP224_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP224_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP224_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP224_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP224_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP224_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P07.M04.S06 onward with the remaining P07 failure recovery rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp225Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP225_PACK_BINDING.pack_id,
    source_failure_recovery_slice_pack_id: DMS_CORE_CP225_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    silent_success_detected: false,
    leak_detected: false,
    exposes_failure_internal_state: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    exposes_lock_token: false,
    exposes_blocked_claim_detail: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP225_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp225FailureBindingSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp224FailureRecoverySliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP225_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP224_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP225_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp225Result({
    case_set_id: "dms-core-cp225-failure-binding-slice-case-set",
    source_failure_recovery_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp225FailureBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp224FailureRecoverySliceDescriptor(input);
  const caseSet = createDmsCoreCp225FailureBindingSliceCaseSet(input);
  return freezeCp225Result({
    descriptor: "DmsCoreCp225FailureBindingSliceDescriptor",
    pack_binding: DMS_CORE_CP225_PACK_BINDING,
    source_failure_recovery_slice_descriptor: upstreamDescriptor.descriptor,
    failure_binding_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP225_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-225",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP225_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP225_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-225.dms_core_failure_binding_slice_descriptor",
      gate: DMS_CORE_CP225_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_failure_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-225.dms_core_failure_binding_slice_descriptor",
      gate: DMS_CORE_CP225_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP225_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP225_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP225_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP225_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP225_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P07.M05.S21 onward with the remaining P07 failure binding rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp226Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP226_PACK_BINDING.pack_id,
    source_failure_binding_slice_pack_id: DMS_CORE_CP226_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    silent_success_detected: false,
    leak_detected: false,
    exposes_failure_internal_state: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP226_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp226FailureAuditTailCaseSet(input = {}) {
  const upstream = createDmsCoreCp225FailureBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP226_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP224_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP226_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp226Result({
    case_set_id: "dms-core-cp226-failure-audit-tail-case-set",
    source_failure_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp226FailureAuditTailDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp225FailureBindingSliceDescriptor(input);
  const caseSet = createDmsCoreCp226FailureAuditTailCaseSet(input);
  return freezeCp226Result({
    descriptor: "DmsCoreCp226FailureAuditTailDescriptor",
    pack_binding: DMS_CORE_CP226_PACK_BINDING,
    source_failure_binding_slice_descriptor: upstreamDescriptor.descriptor,
    failure_audit_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP226_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-226",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP226_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP226_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-226.dms_core_failure_audit_tail_descriptor",
      gate: DMS_CORE_CP226_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_failure_audit_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-226.dms_core_failure_audit_tail_descriptor",
      gate: DMS_CORE_CP226_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP226_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP226_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP226_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP226_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP226_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P07.M06.S06 onward with the remaining P07 fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp227Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP227_PACK_BINDING.pack_id,
    source_failure_audit_tail_pack_id: DMS_CORE_CP227_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    dispatches_integration_smoke_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    silent_success_detected: false,
    leak_detected: false,
    regression_detected: false,
    exposes_failure_internal_state: false,
    exposes_rollback_internal_state: false,
    exposes_retry_internal_state: false,
    exposes_lock_token: false,
    exposes_blocked_claim_detail: false,
    exposes_permission_decision_detail: false,
    exposes_tenant_policy_detail: false,
    exposes_audit_event_body: false,
    exposes_audit_hint_detail: false,
    exposes_validation_error_detail: false,
    exposes_fixture_payload: false,
    exposes_hermes_packet_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP227_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP227_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP224_ROW_EXTRAS,
  hermes_command_matrix: Object.freeze({ emits_hermes_runtime_receipt: false, hermes_packet_body_included: false }),
  evidence_field_list: Object.freeze({ evidence_descriptor_only: true }),
  changed_file_receipt: Object.freeze({ hermes_packet_body_included: false }),
  command_result_receipt: Object.freeze({ executes_command_runtime: false, hermes_packet_body_included: false }),
  fixture_summary_receipt: Object.freeze({ fixture_payload_included: false }),
  permission_summary_receipt: Object.freeze({ permission_decision_detail_included: false }),
  audit_summary_receipt: Object.freeze({ audit_event_body_included: false }),
  no_real_data_receipt: Object.freeze({ real_client_data_loaded: false, no_real_data: true }),
  claude_dependency_marker: Object.freeze({ claude_final_approval_claimed: false, read_only: true }),
  human_approval_marker: Object.freeze({ human_approval_route_required_before_runtime: true }),
  pass_semantics: Object.freeze({ verdict_descriptor: "PASS", claude_final_approval_claimed: false }),
  pass_with_findings_semantics: Object.freeze({ verdict_descriptor: "PASS_WITH_FINDINGS", claude_final_approval_claimed: false }),
  block_semantics: Object.freeze({ verdict_descriptor: "BLOCK", blocks_closeout_descriptor: true }),
  evidence_template: Object.freeze({ evidence_descriptor_only: true }),
  validation_command_check: Object.freeze({ executes_command_runtime: false }),
  harness_boundary_note: Object.freeze({ harness_boundary_descriptor_only: true }),
  regression_receipt: Object.freeze({ regression_detected: false }),
  next_gate_readiness: Object.freeze({ next_gate_descriptor_only: true }),
});

export function createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet(input = {}) {
  const upstream = createDmsCoreCp226FailureAuditTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP227_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP227_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP227_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp227Result({
    case_set_id: "dms-core-cp227-p07-closeout-p08-hermes-receipt-case-set",
    source_failure_audit_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp226FailureAuditTailDescriptor(input);
  const caseSet = createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet(input);
  return freezeCp227Result({
    descriptor: "DmsCoreCp227P07CloseoutP08HermesReceiptDescriptor",
    pack_binding: DMS_CORE_CP227_PACK_BINDING,
    source_failure_audit_tail_descriptor: upstreamDescriptor.descriptor,
    p07_closeout_p08_hermes_receipt_case_set: caseSet,
    public_exports: DMS_CORE_CP227_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-227",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP227_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP227_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-227.dms_core_p07_closeout_p08_hermes_receipt_descriptor",
      gate: DMS_CORE_CP227_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p07_closeout_p08_hermes_receipt_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-227.dms_core_p07_closeout_p08_hermes_receipt_descriptor",
      gate: DMS_CORE_CP227_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP227_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP227_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP227_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP227_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP227_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P08.M02.S15 onward with the remaining P08 Hermes receipt rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp228Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP228_PACK_BINDING.pack_id,
    source_p07_closeout_p08_hermes_receipt_pack_id: DMS_CORE_CP228_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_blocked_claim_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP228_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP228_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP227_ROW_EXTRAS,
  documentation_update: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-228" }),
  operator_summary: Object.freeze({ operator_summary_descriptor_only: true, hermes_packet_body_included: false }),
});

export function createDmsCoreCp228HermesReceiptSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp227P07CloseoutP08HermesReceiptCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP228_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP228_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP228_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp228Result({
    case_set_id: "dms-core-cp228-hermes-receipt-slice-case-set",
    source_p07_closeout_p08_hermes_receipt_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp228HermesReceiptSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp227P07CloseoutP08HermesReceiptDescriptor(input);
  const caseSet = createDmsCoreCp228HermesReceiptSliceCaseSet(input);
  return freezeCp228Result({
    descriptor: "DmsCoreCp228HermesReceiptSliceDescriptor",
    pack_binding: DMS_CORE_CP228_PACK_BINDING,
    source_p07_closeout_p08_hermes_receipt_descriptor: upstreamDescriptor.descriptor,
    hermes_receipt_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP228_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-228",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP228_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP228_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-228.dms_core_hermes_receipt_slice_descriptor",
      gate: DMS_CORE_CP228_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_hermes_receipt_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-228.dms_core_hermes_receipt_slice_descriptor",
      gate: DMS_CORE_CP228_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP228_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP228_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP228_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP228_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP228_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P08.M04.S13 onward with the remaining P08 Hermes receipt rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp229Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP229_PACK_BINDING.pack_id,
    source_hermes_receipt_slice_pack_id: DMS_CORE_CP229_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_blocked_claim_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP229_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp229HermesBindingSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp228HermesReceiptSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP229_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP228_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP229_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp229Result({
    case_set_id: "dms-core-cp229-hermes-binding-slice-case-set",
    source_hermes_receipt_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp229HermesBindingSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp228HermesReceiptSliceDescriptor(input);
  const caseSet = createDmsCoreCp229HermesBindingSliceCaseSet(input);
  return freezeCp229Result({
    descriptor: "DmsCoreCp229HermesBindingSliceDescriptor",
    pack_binding: DMS_CORE_CP229_PACK_BINDING,
    source_hermes_receipt_slice_descriptor: upstreamDescriptor.descriptor,
    hermes_binding_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP229_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-229",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP229_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP229_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-229.dms_core_hermes_binding_slice_descriptor",
      gate: DMS_CORE_CP229_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_hermes_binding_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-229.dms_core_hermes_binding_slice_descriptor",
      gate: DMS_CORE_CP229_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP229_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP229_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP229_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP229_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP229_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P08.M06.S09 onward with the remaining P08 Hermes fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp230Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP230_PACK_BINDING.pack_id,
    source_hermes_binding_slice_pack_id: DMS_CORE_CP230_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_fixture_payload: false,
    exposes_blocked_claim_detail: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP230_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP230_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP228_ROW_EXTRAS,
  documentation_update: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-230" }),
  architecture_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  security_review_questions: Object.freeze({ review_questions_descriptor_only: true }),
  permission_bypass_questions: Object.freeze({ permission_bypass_detected: false, review_questions_descriptor_only: true }),
  audit_completeness_questions: Object.freeze({ audit_event_body_included: false, review_questions_descriptor_only: true }),
  missing_test_questions: Object.freeze({ review_questions_descriptor_only: true }),
  ui_leak_questions: Object.freeze({ leak_detected: false, review_questions_descriptor_only: true }),
  downstream_readiness_questions: Object.freeze({ review_questions_descriptor_only: true }),
  risk_register: Object.freeze({ risk_register_descriptor_only: true }),
  severity_taxonomy: Object.freeze({ severity_levels: Object.freeze(["P0", "P1", "P2", "P3"]) }),
  go_no_go_verdict_format: Object.freeze({
    verdict_values: Object.freeze(["PASS", "PASS_WITH_FINDINGS", "BLOCK"]),
    claude_final_approval_claimed: false,
  }),
  finding_routing_map: Object.freeze({ finding_routing_descriptor_only: true }),
  human_approval_summary: Object.freeze({ human_approval_route_required_before_runtime: true }),
  claude_review_packet: Object.freeze({ read_only: true, claude_final_approval_claimed: false }),
  closeout_criteria: Object.freeze({ closeout_criteria_descriptor_only: true }),
  pass_closeout_note: Object.freeze({ verdict_descriptor: "PASS", claude_final_approval_claimed: false }),
  pass_with_findings_closeout_note: Object.freeze({ verdict_descriptor: "PASS_WITH_FINDINGS", claude_final_approval_claimed: false }),
  block_closeout_note: Object.freeze({ verdict_descriptor: "BLOCK", blocks_closeout_descriptor: true }),
  next_rp_dependency: Object.freeze({ next_rp_dependency_descriptor_only: true }),
  command_rerun: Object.freeze({ executes_command_runtime: false }),
});

export function createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet(input = {}) {
  const upstream = createDmsCoreCp229HermesBindingSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP230_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP230_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP230_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp230Result({
    case_set_id: "dms-core-cp230-p08-closeout-p09-review-gate-case-set",
    source_hermes_binding_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp229HermesBindingSliceDescriptor(input);
  const caseSet = createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet(input);
  return freezeCp230Result({
    descriptor: "DmsCoreCp230P08CloseoutP09ReviewGateDescriptor",
    pack_binding: DMS_CORE_CP230_PACK_BINDING,
    source_hermes_binding_slice_descriptor: upstreamDescriptor.descriptor,
    p08_closeout_p09_review_gate_case_set: caseSet,
    public_exports: DMS_CORE_CP230_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-230",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP230_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP230_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-230.dms_core_p08_closeout_p09_review_gate_descriptor",
      gate: DMS_CORE_CP230_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p08_closeout_p09_review_gate_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-230.dms_core_p08_closeout_p09_review_gate_descriptor",
      gate: DMS_CORE_CP230_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP230_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP230_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP230_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP230_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP230_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P09.M03.S11 onward with the remaining P09 review-gate rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp231Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP231_PACK_BINDING.pack_id,
    source_p08_closeout_p09_review_gate_pack_id: DMS_CORE_CP231_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_hermes_packet_body: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP231_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP231_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP230_ROW_EXTRAS,
  documentation_update: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-231" }),
  review_receipt_placeholder: Object.freeze({ review_receipt_descriptor_only: true, hermes_packet_body_included: false }),
  future_correction_slot: Object.freeze({ future_correction_descriptor_only: true }),
});

export function createDmsCoreCp231ReviewGateSliceCaseSet(input = {}) {
  const upstream = createDmsCoreCp230P08CloseoutP09ReviewGateCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP231_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP231_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP231_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp231Result({
    case_set_id: "dms-core-cp231-review-gate-slice-case-set",
    source_p08_closeout_p09_review_gate_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp231ReviewGateSliceDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp230P08CloseoutP09ReviewGateDescriptor(input);
  const caseSet = createDmsCoreCp231ReviewGateSliceCaseSet(input);
  return freezeCp231Result({
    descriptor: "DmsCoreCp231ReviewGateSliceDescriptor",
    pack_binding: DMS_CORE_CP231_PACK_BINDING,
    source_p08_closeout_p09_review_gate_descriptor: upstreamDescriptor.descriptor,
    review_gate_slice_case_set: caseSet,
    public_exports: DMS_CORE_CP231_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-231",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP231_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP231_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-231.dms_core_review_gate_slice_descriptor",
      gate: DMS_CORE_CP231_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_review_gate_slice_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-231.dms_core_review_gate_slice_descriptor",
      gate: DMS_CORE_CP231_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP231_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP231_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP231_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP231_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP231_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P09.M05.S09 onward with the remaining P09 review-gate rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp232Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP232_PACK_BINDING.pack_id,
    source_review_gate_slice_pack_id: DMS_CORE_CP232_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP232_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp232ReviewAuditBindingCaseSet(input = {}) {
  const upstream = createDmsCoreCp231ReviewGateSliceCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP232_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP231_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP232_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp232Result({
    case_set_id: "dms-core-cp232-review-audit-binding-case-set",
    source_review_gate_slice_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp232ReviewAuditBindingDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp231ReviewGateSliceDescriptor(input);
  const caseSet = createDmsCoreCp232ReviewAuditBindingCaseSet(input);
  return freezeCp232Result({
    descriptor: "DmsCoreCp232ReviewAuditBindingDescriptor",
    pack_binding: DMS_CORE_CP232_PACK_BINDING,
    source_review_gate_slice_descriptor: upstreamDescriptor.descriptor,
    review_audit_binding_case_set: caseSet,
    public_exports: DMS_CORE_CP232_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-232",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP232_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP232_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-232.dms_core_review_audit_binding_descriptor",
      gate: DMS_CORE_CP232_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_review_audit_binding_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-232.dms_core_review_audit_binding_descriptor",
      gate: DMS_CORE_CP232_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP232_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP232_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP232_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP232_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP232_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P09.M05.S19 onward with the remaining P09 review-gate rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp233Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP233_PACK_BINDING.pack_id,
    source_review_audit_binding_pack_id: DMS_CORE_CP233_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP233_NO_WRITE_ATTESTATION,
  });
}

export function createDmsCoreCp233ReviewFixtureTailCaseSet(input = {}) {
  const upstream = createDmsCoreCp232ReviewAuditBindingCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP233_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP231_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP233_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp233Result({
    case_set_id: "dms-core-cp233-review-fixture-tail-case-set",
    source_review_audit_binding_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp233ReviewFixtureTailDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp232ReviewAuditBindingDescriptor(input);
  const caseSet = createDmsCoreCp233ReviewFixtureTailCaseSet(input);
  return freezeCp233Result({
    descriptor: "DmsCoreCp233ReviewFixtureTailDescriptor",
    pack_binding: DMS_CORE_CP233_PACK_BINDING,
    source_review_audit_binding_descriptor: upstreamDescriptor.descriptor,
    review_fixture_tail_case_set: caseSet,
    public_exports: DMS_CORE_CP233_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-233",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP233_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP233_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-233.dms_core_review_fixture_tail_descriptor",
      gate: DMS_CORE_CP233_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_review_fixture_tail_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-233.dms_core_review_fixture_tail_descriptor",
      gate: DMS_CORE_CP233_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP233_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP233_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP233_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP233_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP233_PACK_BINDING.next_subphase_id,
      open_scope: "Continue RP06.P09.M06.S07 onward with the remaining P09 fixture rows and downstream micros while preserving descriptor-only DMS boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}

function freezeCp234Result(result) {
  return Object.freeze({
    ...result,
    pack_id: DMS_CORE_CP234_PACK_BINDING.pack_id,
    source_review_fixture_tail_pack_id: DMS_CORE_CP234_PACK_BINDING.upstream_pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    updates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    dispatches_dms_runtime_service: false,
    dispatches_review_route_runtime: false,
    dispatches_approval_route_runtime: false,
    dispatches_ai_runtime: false,
    emits_hermes_runtime_receipt: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    executes_unit_test_runtime_paths: false,
    executes_command_runtime: false,
    evaluates_authorization_policy_runtime: false,
    writes_permission_decision: false,
    appends_audit_trace: false,
    writes_state_transition: false,
    persists_idempotency_key: false,
    persists_workflow_attempt: false,
    acquires_runtime_lock: false,
    performs_rollback_runtime: false,
    performs_retry_runtime: false,
    loads_real_fixture_data: false,
    omits_unauthorized_data: true,
    regression_detected: false,
    leak_detected: false,
    permission_bypass_detected: false,
    exposes_permission_decision_detail: false,
    exposes_audit_event_body: false,
    exposes_hermes_packet_body: false,
    opens_rp07_runtime: false,
    customer_safe_errors_only: true,
    no_write_attestation: DMS_CORE_CP234_NO_WRITE_ATTESTATION,
  });
}

const DMS_CORE_CP234_ROW_EXTRAS = Object.freeze({
  ...DMS_CORE_CP231_ROW_EXTRAS,
  documentation_update: Object.freeze({ documentation_entry: "packages/dms/README.md#cp00-234" }),
});

export function createDmsCoreCp234P09ReviewCloseoutCaseSet(input = {}) {
  const upstream = createDmsCoreCp233ReviewFixtureTailCaseSet(input);
  const sections = {};
  for (const [microId, titles] of Object.entries(DMS_CORE_CP234_REQUIREMENTS.required_section_rows)) {
    const rows = {};
    for (const title of titles) {
      const key = dmsCoreCp210RowKey(title);
      rows[key] = Object.freeze({
        title,
        descriptor_only: true,
        runtime_execution: false,
        customer_safe_errors_only: true,
        raw_payload_included: false,
        section_micro_phase_id: microId,
        ...(DMS_CORE_CP234_ROW_EXTRAS[key] ?? {}),
      });
    }
    sections[microId] = Object.freeze({
      micro_phase_id: microId,
      micro_title: DMS_CORE_CP234_REQUIREMENTS.required_section_micro_titles[microId],
      row_count: titles.length,
      row_keys: Object.freeze(titles.map((title) => dmsCoreCp210RowKey(title))),
      rows: Object.freeze(rows),
    });
  }
  return freezeCp234Result({
    case_set_id: "dms-core-cp234-p09-review-closeout-case-set",
    source_review_fixture_tail_case_set_id: upstream.case_set_id,
    section_count: Object.keys(sections).length,
    sections: Object.freeze(sections),
  });
}

export function createDmsCoreCp234P09ReviewCloseoutDescriptor(input = {}) {
  const upstreamDescriptor = createDmsCoreCp233ReviewFixtureTailDescriptor(input);
  const caseSet = createDmsCoreCp234P09ReviewCloseoutCaseSet(input);
  return freezeCp234Result({
    descriptor: "DmsCoreCp234P09ReviewCloseoutDescriptor",
    pack_binding: DMS_CORE_CP234_PACK_BINDING,
    source_review_fixture_tail_descriptor: upstreamDescriptor.descriptor,
    p09_review_closeout_case_set: caseSet,
    public_exports: DMS_CORE_CP234_REQUIREMENTS.required_public_exports,
    documentation_entry: "packages/dms/README.md#cp00-234",
    index_export_check: true,
    no_leak_guards: DMS_CORE_CP234_REQUIREMENTS.required_no_leak_guards,
    authority_boundary: Object.freeze({
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: DMS_CORE_CP234_PACK_BINDING.next_pack_id,
    }),
    hermes_packet: Object.freeze({
      evidence_packet: "H06.CP00-234.dms_core_p09_review_closeout_descriptor",
      gate: DMS_CORE_CP234_PACK_BINDING.hermes_gate,
      receipt_shape: "descriptor_only_p09_review_closeout_no_write",
    }),
    claude_packet: Object.freeze({
      review_packet: "C06.CP00-234.dms_core_p09_review_closeout_descriptor",
      gate: DMS_CORE_CP234_PACK_BINDING.claude_gate,
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: DMS_CORE_CP234_REQUIREMENTS.allowed_claude_tools,
      invalid_review_blockers: DMS_CORE_CP234_REQUIREMENTS.forbidden_review_evidence,
    }),
    closeout_handoff: Object.freeze({
      from_pack_id: DMS_CORE_CP234_PACK_BINDING.pack_id,
      to_pack_id: DMS_CORE_CP234_PACK_BINDING.next_pack_id,
      next_subphase_id: DMS_CORE_CP234_PACK_BINDING.next_subphase_id,
      open_scope: "RP06.P09 descriptor scope is closed; continue at RP07.P00.M00.S01 through the live queue while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    }),
  });
}
