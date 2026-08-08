const BLOCKED_NORMALIZED_FIELD_NAMES = new Set([
  "apikey",
  "authorization",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "clientsecret",
  "privatekey",
  "password",
  "passwd",
  "cookie",
  "setcookie",
  "rawbytes",
  "filebytes",
  "documentbytes",
  "bytes",
  "binarypayload",
  "payloadsample",
]);

const COMMON_FIELDS = Object.freeze([
  "model_type", "tenant_id", "matter_id", "owner_module", "permission_envelope_id", "audit_trace_id",
  "synthetic_only", "writes_product_state", "evaluates_runtime_permission", "writes_audit_event",
  "creates_database_rows", "reads_object_storage", "writes_object_storage", "exposes_document_bytes",
  "exposes_extracted_text", "resource_id", "created_at", "updated_at",
]);

function fields(...values) {
  return new Set([...COMMON_FIELDS, ...values.flat()]);
}

const DMS_RECORD_FIELDS = Object.freeze({
  DmsWorkspace: fields("workspace_id", "name", "status", "root_folder_id", "matter_trace_ref", "client_visible_by_default", "owner_user_id", "registered_account"),
  DmsFolder: fields("folder_id", "workspace_id", "parent_folder_id", "name", "status"),
  DmsDocument: fields("document_id", "workspace_id", "folder_id", "title", "status", "current_version_id", "retention_label_id", "legal_hold_id", "source_policy", "version_safe_dms", "matter_first_trace_required", "client_visible_candidate", "owner_user_id", "registered_account_email", "registered_account", "account_linkage", "privilege_label_id", "privileged", "confidentiality", "latest_sha256", "mime_type", "filename", "source_email_thread_id", "source_attachment_id"),
  DmsDocumentVersion: fields("version_id", "document_id", "version_number", "status", "file_object_id", "created_by", "hash_algorithm", "sha256", "persisted", "registered_account"),
  DmsFileObject: fields("file_object_id", "object_id", "storage_pointer_ref", "sha256", "byte_size", "mime_type", "object_storage_runtime_executed", "document_bytes_loaded", "vault_object_id", "owner_user_id", "filename", "raw_path_exposed", "bytes_included"),
  DmsRendition: fields("rendition_id", "version_id", "rendition_type", "status", "file_object_id"),
  DmsExtractedText: fields("extracted_text_id", "version_id", "source_policy", "status", "text_pointer_ref", "raw_text_exposed"),
  DmsOcrResult: fields("ocr_result_id", "version_id", "source_policy", "status", "ocr_runtime_executed"),
  DmsEmailThread: fields("email_thread_id", "email_id", "graph_message_id", "internet_message_id", "conversation_id", "subject", "from", "to", "cc", "bcc", "body_ref", "body_preview", "sent_at", "received_at", "mailbox_ref", "account_ref", "attachment_metadata", "filing_user", "filing_time", "filing_mode", "confidentiality", "privilege", "ai_processed", "raw_body_included", "provider_payload_included", "field_contract", "field_contract_count", "status", "message_ids", "filed_document_ids", "credential_material_included", "email_runtime_executed", "reserved_for_rp08"),
  DmsEmailAttachmentMapping: fields("mapping_id", "email_thread_id", "attachment_id", "document_id", "sha256", "raw_bytes_included", "storage_pointer_ref_included"),
  DmsDocumentRelation: fields("relation_id", "source_document_id", "target_document_id", "relation_type", "status"),
  DmsLock: fields("lock_id", "document_id", "actor_id", "status", "checked_out_at"),
  DmsPrivilegeLabel: fields("label_id", "document_id", "privilege_class", "confidentiality", "applied_by"),
  DmsLegalHold: fields("legal_hold_id", "document_id", "object_id", "actor_id", "reason", "reason_hash", "status"),
  DmsRetentionPolicy: fields("retention_policy_id", "document_id", "object_id", "retain_until_epoch_ms", "retain_until", "disposition"),
  DmsRedaction: fields("redaction_id", "document_id", "ranges", "reason", "raw_bytes_exposed"),
  DmsSecureLink: fields("secure_link_id", "document_id", "expires_at", "mfa_required", "watermark_required", "status"),
  DmsSearchIndex: fields("index_id", "document_id", "version_id", "title", "extracted_text_ref", "ocr_result_ref", "privilege_label_id", "indexed_fields", "body_text_indexed", "body_character_count", "ocr_text_indexed", "ocr_character_count", "ocr_runtime_executed", "ocr_provider", "indexed_at", "extractor", "ocr_extractor", "search_backend", "body_searchable_text", "ocr_searchable_text", "searchable_text", "raw_text_included", "storage_pointer_ref_included"),
  DmsRagEvidence: fields("ledger_id", "document_id", "sources", "citation_source_validation"),
  VaultSearchPreferences: fields("owner_user_id", "recent", "saved", "retention_days", "result_payloads_persisted"),
});

function rejection(path) {
  return Object.assign(new Error(`DMS persistence rejected secret or raw-byte value at ${path}`), {
    code: "LAWOS_DMS_PERSISTED_SECRET_REJECTED",
    safe_error_code: "DMS_PERSISTED_SECRET_REJECTED",
    status: 409,
  });
}

function normalizedFieldName(value) {
  return String(value).normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function isBinaryLikeString(value) {
  if (/^data:[^,;]+;base64,/iu.test(value)) return true;
  if (value.length < 128 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})+(?:==|=)?$/u.test(value)) return false;
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.byteLength < 64 || decoded.toString("base64").replace(/=+$/u, "") !== value.replace(/=+$/u, "")) return false;
    let nonText = 0;
    for (const byte of decoded) if (byte < 9 || (byte > 13 && byte < 32) || byte === 127) nonText += 1;
    return nonText / decoded.byteLength > 0.2;
  } catch {
    return false;
  }
}

export function assertNoDmsPersistedSecrets(value, path = "record", seen = new WeakSet()) {
  if (value === null || value === undefined) return;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) throw rejection(path);
  if (typeof value === "string") {
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || isBinaryLikeString(value)) throw rejection(path);
    return;
  }
  if (typeof value !== "object") return;
  if (seen.has(value)) throw rejection(path);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoDmsPersistedSecrets(entry, `${path}[${index}]`, seen));
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (BLOCKED_NORMALIZED_FIELD_NAMES.has(normalizedFieldName(key)) && entry !== null && entry !== undefined) {
        throw rejection(`${path}.${key}`);
      }
      assertNoDmsPersistedSecrets(entry, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

export function projectDmsPersistedRecord(record) {
  const allowed = DMS_RECORD_FIELDS[record?.model_type];
  if (!allowed) return { ...record };
  return Object.fromEntries(Object.entries(record).filter(([key]) => allowed.has(key)));
}
