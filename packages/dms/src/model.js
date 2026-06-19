import {
  DMS_CORE_MODEL_DEFINITIONS,
  DMS_LIFECYCLE_STATUSES,
  DMS_REVIEW_STATUSES,
  DMS_SOURCE_POLICIES,
  DMS_VERSION_STATUSES,
  DMS_WORKSPACE_STATUSES,
} from "./registry.js";

function freezeRecord(record) {
  return Object.freeze(record);
}

export function listDmsCoreModelTypes() {
  return Object.freeze(Object.keys(DMS_CORE_MODEL_DEFINITIONS));
}

export function getDmsCoreModelDefinition(modelType) {
  return DMS_CORE_MODEL_DEFINITIONS[modelType] ?? null;
}

export function missingDmsCoreRequiredFields(modelType, input) {
  const definition = getDmsCoreModelDefinition(modelType);
  if (!definition) return ["model_type"];
  return definition.required_fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function assertRequiredFields(modelType, input) {
  const missing = missingDmsCoreRequiredFields(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
}

function assertAllowed(value, allowed, label) {
  if (value && !allowed.includes(value)) throw new Error(`${label} must be one of ${allowed.join(", ")}`);
}

function baseRecord(modelType, input) {
  assertRequiredFields(modelType, input);
  const definition = getDmsCoreModelDefinition(modelType);
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    owner_module: definition.owner_module,
    permission_envelope_id: input.permission_envelope_id,
    audit_trace_id: input.audit_trace_id,
    synthetic_only: input.synthetic_only ?? true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    reads_object_storage: false,
    writes_object_storage: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
  };
}

export function createDmsWorkspace(input) {
  assertAllowed(input.status, DMS_WORKSPACE_STATUSES, "DmsWorkspace status");
  return freezeRecord({
    ...baseRecord("DmsWorkspace", input),
    workspace_id: input.workspace_id,
    name: input.name,
    status: input.status,
    root_folder_id: input.root_folder_id ?? `folder:${input.workspace_id}:root`,
    matter_trace_ref: input.matter_trace_ref ?? `matter:${input.matter_id}`,
    client_visible_by_default: false,
  });
}

export function createDmsFolder(input) {
  assertAllowed(input.status, DMS_LIFECYCLE_STATUSES, "DmsFolder status");
  return freezeRecord({
    ...baseRecord("DmsFolder", input),
    folder_id: input.folder_id,
    workspace_id: input.workspace_id,
    parent_folder_id: input.parent_folder_id ?? null,
    name: input.name,
    status: input.status,
  });
}

export function createDmsDocument(input) {
  assertAllowed(input.status, DMS_LIFECYCLE_STATUSES, "DmsDocument status");
  return freezeRecord({
    ...baseRecord("DmsDocument", input),
    document_id: input.document_id,
    workspace_id: input.workspace_id,
    folder_id: input.folder_id ?? null,
    title: input.title,
    status: input.status,
    current_version_id: input.current_version_id,
    retention_label_id: input.retention_label_id ?? null,
    legal_hold_id: input.legal_hold_id ?? null,
    source_policy: input.source_policy ?? "source_required",
    version_safe_dms: true,
    matter_first_trace_required: true,
    client_visible_candidate: false,
  });
}

export function createDmsDocumentVersion(input) {
  assertAllowed(input.status, DMS_VERSION_STATUSES, "DmsDocumentVersion status");
  return freezeRecord({
    ...baseRecord("DmsDocumentVersion", input),
    version_id: input.version_id,
    document_id: input.document_id,
    version_number: input.version_number,
    status: input.status,
    file_object_id: input.file_object_id,
    created_by: input.created_by ?? "synthetic_fixture",
    created_at: input.created_at ?? "2026-06-10T00:00:00.000Z",
    hash_algorithm: input.hash_algorithm ?? "sha256",
  });
}

export function createDmsFileObject(input) {
  if (typeof input.byte_size !== "number" || input.byte_size < 0) throw new Error("DmsFileObject byte_size must be a non-negative number");
  return freezeRecord({
    ...baseRecord("DmsFileObject", input),
    file_object_id: input.file_object_id,
    storage_pointer_ref: input.storage_pointer_ref,
    sha256: input.sha256,
    byte_size: input.byte_size,
    mime_type: input.mime_type,
    object_storage_runtime_executed: false,
    document_bytes_loaded: false,
  });
}

export function createDmsRendition(input) {
  assertAllowed(input.status, DMS_LIFECYCLE_STATUSES, "DmsRendition status");
  return freezeRecord({
    ...baseRecord("DmsRendition", input),
    rendition_id: input.rendition_id,
    version_id: input.version_id,
    rendition_type: input.rendition_type,
    status: input.status,
    file_object_id: input.file_object_id ?? null,
  });
}

export function createDmsExtractedText(input) {
  assertAllowed(input.status, DMS_REVIEW_STATUSES, "DmsExtractedText status");
  assertAllowed(input.source_policy, DMS_SOURCE_POLICIES, "DmsExtractedText source_policy");
  return freezeRecord({
    ...baseRecord("DmsExtractedText", input),
    extracted_text_id: input.extracted_text_id,
    version_id: input.version_id,
    source_policy: input.source_policy,
    status: input.status,
    text_pointer_ref: input.text_pointer_ref ?? `reserved-extracted-text:${input.version_id}`,
    raw_text_exposed: false,
  });
}

export function createDmsOcrResult(input) {
  assertAllowed(input.status, DMS_REVIEW_STATUSES, "DmsOcrResult status");
  assertAllowed(input.source_policy, DMS_SOURCE_POLICIES, "DmsOcrResult source_policy");
  return freezeRecord({
    ...baseRecord("DmsOcrResult", input),
    ocr_result_id: input.ocr_result_id,
    version_id: input.version_id,
    source_policy: input.source_policy,
    status: input.status,
    ocr_runtime_executed: false,
  });
}

export function createDmsEmailThread(input) {
  assertAllowed(input.status, DMS_LIFECYCLE_STATUSES, "DmsEmailThread status");
  return freezeRecord({
    ...baseRecord("DmsEmailThread", input),
    email_thread_id: input.email_thread_id,
    subject: input.subject,
    status: input.status,
    email_runtime_executed: false,
    reserved_for_rp08: true,
  });
}

export function createDmsDocumentRelation(input) {
  assertAllowed(input.status ?? "under_review", DMS_REVIEW_STATUSES, "DmsDocumentRelation status");
  return freezeRecord({
    ...baseRecord("DmsDocumentRelation", input),
    relation_id: input.relation_id,
    source_document_id: input.source_document_id,
    target_document_id: input.target_document_id,
    relation_type: input.relation_type,
    status: input.status ?? "under_review",
  });
}
