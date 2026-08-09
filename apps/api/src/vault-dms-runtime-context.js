import { randomUUID } from "node:crypto";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { downloadFileObjectWithAudit } from "../../../packages/dms/src/storage/download-service.js";
import { serializeFileObjectSafe } from "../../../packages/dms/src/file-object-service.js";
import { createSearchIndexEnvelope } from "../../../packages/dms/src/search/indexer.js";
import { upsertVaultSearchIndex } from "../../../packages/dms/src/search/index-repository.js";
import { searchMatterVault } from "../../../packages/dms/src/search/search-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";
import {
  MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByUserId,
  highestPrivilegeRegisteredAccount,
  registeredAccountPublicRef,
  resolveRegisteredAccount,
} from "./matter-vault-account-registry.js";
import { handleVaultPrecedentApiRequest } from "./vault-precedent-runtime-context.js";

const DEFAULT_VAULT_ACCOUNT = registeredAccountPublicRef(highestPrivilegeRegisteredAccount());

export const VAULT_DMS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "vault-dms",
  contract_ref: "contracts/dms-core-contract.json",
  contract_schema_version: "law-firm-os.dms-core-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/vault/documents",
    "POST /api/vault/documents",
    "GET /api/vault/documents/:document_id/download",
    "POST /api/vault/documents/:document_id/privilege-label",
    "POST /api/vault/documents/:document_id/legal-holds",
    "POST /api/vault/documents/:document_id/retention-policies",
    "POST /api/vault/documents/:document_id/delete-check",
    "POST /api/vault/documents/:document_id/permanent-delete",
    "GET /api/vault/search",
    "GET /api/vault/search/preferences",
    "POST /api/vault/search/preferences",
    "GET /api/vault/audit",
    "POST /api/vault/precedent-sources",
    "POST /api/vault/precedent-sources/:source_id/disable",
    "POST /api/vault/precedent-sources/:source_id/unapprove",
    "GET /api/vault/precedents/readiness",
  ]),
  data_source: "vault_dms_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const VAULT_DMS_API_ERROR_CODES = Object.freeze({
  tenant_required: "VAULT_DMS_TENANT_REQUIRED",
  permission_required: "VAULT_DMS_PERMISSION_REQUIRED",
  audit_hint_required: "VAULT_DMS_AUDIT_HINT_REQUIRED",
  validation_error: "VAULT_DMS_API_VALIDATION_ERROR",
  unauthorized_omission: "VAULT_DMS_UNAUTHORIZED_OMISSION",
  review_required: "VAULT_DMS_REVIEW_REQUIRED",
  approval_required: "VAULT_DMS_APPROVAL_REQUIRED",
  not_found: "VAULT_DMS_NOT_FOUND",
  payload_too_large: "VAULT_DMS_PAYLOAD_TOO_LARGE",
});

export function createVaultDmsRuntimeSeed(account = DEFAULT_VAULT_ACCOUNT) {
  if (!account) return Object.freeze([]);
  return Object.freeze([
  Object.freeze({
    model_type: "DmsWorkspace",
    workspace_id: "workspace_rp07_synthetic",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_id: "matter_rp05_synthetic_opening",
    name: "RP07 synthetic vault",
    status: "active",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    owner_user_id: account.user_id,
    registered_account: account,
  }),
  Object.freeze({
    model_type: "DmsDocument",
    document_id: "doc_rp07_synthetic_001",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_id: "matter_rp05_synthetic_opening",
    workspace_id: "workspace_rp07_synthetic",
    title: "Synthetic engagement letter",
    status: "active",
    current_version_id: "version_doc_rp07_synthetic_001_1",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    privilege_label_id: "standard",
    legal_hold_id: null,
    owner_user_id: account.user_id,
    registered_account_email: account.email,
    registered_account: account,
  }),
  Object.freeze({
    model_type: "DmsDocumentVersion",
    version_id: "version_doc_rp07_synthetic_001_1",
    document_id: "doc_rp07_synthetic_001",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_id: "matter_rp05_synthetic_opening",
    version_number: 1,
    status: "current",
    file_object_id: "file_version_doc_rp07_synthetic_001_1",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    sha256: "seed",
    created_by: account.user_id,
    registered_account: account,
  }),
  Object.freeze({
    model_type: "DmsFileObject",
    file_object_id: "file_version_doc_rp07_synthetic_001_1",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_id: "matter_rp05_synthetic_opening",
    storage_pointer_ref: "vault://seed/doc_rp07_synthetic_001",
    sha256: "seed",
    byte_size: 0,
    mime_type: "application/pdf",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    owner_user_id: account.user_id,
  }),
  ]);
}

export const VAULT_DMS_RUNTIME_SEED = createVaultDmsRuntimeSeed();

export function createVaultDmsRuntimeContext({
  repository = createDmsRepository({ seedRecords: VAULT_DMS_RUNTIME_SEED }),
  storage = createLocalStorageAdapter({ adapter_id: "vault-api-local" }),
} = {}) {
  return Object.freeze({ repository, storage, seed_ref: "cmp-g5-vault-dms-synthetic" });
}

const DEFAULT_RUNTIME = createVaultDmsRuntimeContext();
const SEARCH_PREFERENCES_MODEL_TYPE = "VaultSearchPreferences";
const SEARCH_QUERY_LIMIT = 200;
const SEARCH_RECENT_LIMIT = 20;
const SEARCH_SAVED_LIMIT = 50;
const SEARCH_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const SEARCH_PREFERENCE_OPERATIONS = new Set(["remember", "save", "delete_saved", "clear_recent", "share_authorize"]);
const VAULT_DMS_MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const DMS_GOVERNANCE_ACTIONS = Object.freeze({
  "legal-hold": "dms:governance:legal-hold",
  retention: "dms:governance:retention",
  "delete-check": "dms:governance:delete-check",
  "permanent-delete": "dms:governance:permanent-delete",
});

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommonQuery(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [
          decision.effect === "review_required"
            ? VAULT_DMS_API_ERROR_CODES.review_required
            : VAULT_DMS_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [VAULT_DMS_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function appendVaultRouteAudit({ repository, context, query, action, resource, decision } = {}) {
  if (!repository || typeof repository.appendAudit !== "function") return null;
  if (!query?.tenant_id || decision?.effect === "allow") return null;
  return repository.appendAudit({
    event_id: `vault_route_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    action,
    object_type: resource?.resource_type ?? "vault_route",
    object_id: resource?.resource_id ?? resource?.matter_id ?? resource?.resource_type ?? "vault_route",
    decision: ["review_required", "approval_required"].includes(decision?.effect) ? decision.effect : "deny",
    reason: decision?.reason ?? "vault_route_denied",
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref: query.permission_ref ?? null,
      audit_hint_ref: query.audit_hint_ref ?? null,
      matter_id: resource?.matter_id ?? null,
      fail_closed: Boolean(decision?.fail_closed),
      denied_route_audit: true,
      raw_payload_included: false,
      document_bytes_included: false,
      storage_pointer_ref_included: false,
    },
  });
}

function appendVaultSensitiveReadAudit({ repository, context, query, action, resource, returnedCount = null } = {}) {
  if (!repository || typeof repository.appendAudit !== "function" || !query?.tenant_id) return null;
  return repository.appendAudit({
    event_id: `vault_sensitive_read_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    action,
    object_type: resource?.resource_type ?? "vault_sensitive_read",
    object_id: resource?.resource_id ?? resource?.resource_type ?? "vault_sensitive_read",
    decision: "allow",
    reason: "vault_sensitive_read_allowed_after_permission_gate",
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref: query.permission_ref ?? null,
      audit_hint_ref: query.audit_hint_ref ?? null,
      returned_count: returnedCount,
      sensitive_read_audit_required: true,
      raw_payload_included: false,
      raw_text_included: false,
      document_bytes_included: false,
      storage_pointer_ref_included: false,
    },
  });
}

function routeGate({ context, query, requestId, action, resource, repository }) {
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: resource.resource_type,
      resource_id: resource.resource_id,
      matter_id: resource.matter_id ?? null,
    },
    action,
  });
  const response = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (response) appendVaultRouteAudit({ repository, context, query, action, resource, decision });
  return response;
}

function accountForRecord(record) {
  return (
    registeredAccountPublicRef(findRegisteredAccountByUserId(record.owner_user_id)) ??
    record.registered_account ??
    null
  );
}

function serializeAccountLink(record) {
  const account = accountForRecord(record);
  return Object.freeze({
    status: account ? "linked" : "missing",
    registry: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    user_id: account?.user_id ?? record.owner_user_id ?? null,
  });
}

function serializeDocument(record) {
  const account = accountForRecord(record);
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.document_id,
    document_id: record.document_id,
    matter_id: record.matter_id,
    workspace_id: record.workspace_id,
    title: record.title,
    status: record.status,
    current_version_id: record.current_version_id,
    privilege_label_id: record.privilege_label_id ?? null,
    legal_hold_id: record.legal_hold_id ?? null,
    owner_user_id: record.owner_user_id ?? account?.user_id ?? null,
    registered_account_email: account?.email ?? record.registered_account_email ?? null,
    registered_account: account,
    account_linkage: serializeAccountLink(record),
    raw_path_exposed: false,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
  });
}

function isPostgresDmsRuntime(runtime) {
  return runtime?.authority === "postgres-v2"
    && runtime?.upload_runtime?.source_only === false
    && typeof runtime.upload_runtime.finalizeUpload === "function";
}

function serializePostgresDocument(entry = {}) {
  const document = entry.document ?? entry;
  return Object.freeze({
    tenant_id: document.tenant_id,
    resource_id: document.document_id,
    document_id: document.document_id,
    matter_id: document.matter_id,
    workspace_id: document.workspace_id,
    title: document.title,
    status: document.status,
    current_version_id: document.current_version_id,
    privilege_label_id: null,
    legal_hold_id: document.legal_hold_status === "active" ? "active" : null,
    legal_hold_status: document.legal_hold_status ?? "none",
    owner_user_id: entry.version?.created_by ?? null,
    registered_account_email: null,
    registered_account: null,
    account_linkage: Object.freeze({ status: "server_authoritative", registry: "postgres-v2-account-directory" }),
    raw_path_exposed: false,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
  });
}

function postgresDirectoryAccountFromPrincipal(principal = {}) {
  if (principal.directory_source !== "postgres-v2") return null;
  if (!principal.user_id || !principal.email) return null;
  return Object.freeze({
    user_id: principal.user_id,
    email: principal.email,
    display_name: principal.display_name ?? principal.email,
    english_name: principal.display_name ?? principal.email,
    source_title: "postgres-v2-account-directory",
    status: "active",
    production_status: null,
    qa_tenant_scope: null,
    registration_state: "postgres-directory",
    highest_privilege: false,
    privilege_rank: null,
    role_ids: Object.freeze([...(principal.role_ids ?? [])]),
    group_ids: Object.freeze([...(principal.group_ids ?? [])]),
    scopes: Object.freeze([...(principal.scopes ?? [])]),
    tenant_ids: Object.freeze([principal.tenant_id]),
  });
}

function strictUploadBytes(body = {}) {
  let bytes;
  if (body.content_base64 != null) {
    const encoded = String(body.content_base64);
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
      throw Object.assign(new TypeError("content_base64 is invalid"), { safe_error_code: "VAULT_DMS_API_VALIDATION_ERROR", status: 400 });
    }
    if (encoded.length > Math.ceil(VAULT_DMS_MAX_UPLOAD_BYTES / 3) * 4 + 4) {
      throw Object.assign(new TypeError("document upload exceeds the byte limit"), {
        safe_error_code: VAULT_DMS_API_ERROR_CODES.payload_too_large,
        status: 413,
      });
    }
    bytes = Buffer.from(encoded, "base64");
  } else {
    bytes = Buffer.from(String(body.content_text ?? ""), "utf8");
  }
  if (bytes.byteLength > VAULT_DMS_MAX_UPLOAD_BYTES) {
    throw Object.assign(new TypeError("document upload exceeds the byte limit"), {
      safe_error_code: VAULT_DMS_API_ERROR_CODES.payload_too_large,
      status: 413,
    });
  }
  return bytes;
}

function currentFileObjectForDocument({ repository, tenant_id, document_id } = {}) {
  const document = repository.get({ tenant_id, model_type: "DmsDocument", document_id });
  if (!document) return null;
  const version = repository.get({
    tenant_id,
    model_type: "DmsDocumentVersion",
    version_id: document.current_version_id,
  });
  if (!version) return null;
  const fileObject = repository.get({
    tenant_id,
    model_type: "DmsFileObject",
    file_object_id: version.file_object_id,
  });
  if (!fileObject) return null;
  return Object.freeze({ document, version, fileObject });
}

function parseObjectField(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function uploadFileFromBody(body = {}) {
  return body.file ?? body.files?.file ?? body.files?.document ?? body.files?.upload ?? null;
}

function safeIdentifierSegment(value, fallback = "document") {
  const normalized = String(value ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return normalized || fallback;
}

function normalizeUploadDocumentBody(body = {}) {
  const file = uploadFileFromBody(body);
  const document = parseObjectField(body.document);
  const fileName = file?.filename || body.filename || body.title || document.title || "uploaded-document";
  const documentId = document.document_id ?? body.document_id ?? `doc_${safeIdentifierSegment(fileName)}_${randomUUID().slice(0, 8)}`;
  const versionId = document.current_version_id ?? body.current_version_id ?? `version_${safeIdentifierSegment(documentId)}_1`;
  const mimeType = document.mime_type ?? body.mime_type ?? file?.mime_type ?? "application/octet-stream";
  const contentBase64 = body.content_base64 ?? file?.content_base64 ?? null;
  return {
    ...body,
    content_base64: contentBase64,
    content_text: contentBase64 ? undefined : body.content_text,
    mime_type: mimeType,
    idempotency_key: body.idempotency_key ?? `vault-upload:${documentId}:${randomUUID()}`,
    document: {
      ...document,
      document_id: documentId,
      tenant_id: document.tenant_id ?? body.tenant_id ?? MATTER_VAULT_REGISTERED_TENANT_ID,
      matter_id: document.matter_id ?? body.matter_id ?? "matter_rp05_synthetic_opening",
      workspace_id: document.workspace_id ?? body.workspace_id ?? "workspace_rp07_synthetic",
      title: document.title ?? body.title ?? fileName,
      status: document.status ?? body.status ?? "active",
      current_version_id: versionId,
      permission_envelope_id: document.permission_envelope_id ?? body.permission_envelope_id ?? "perm_rp07_vault",
      audit_trace_id: document.audit_trace_id ?? body.audit_trace_id ?? "audit_rp07_vault",
      mime_type: mimeType,
      filename: fileName,
    },
    upload_file: file
      ? {
          filename: fileName,
          mime_type: file.mime_type ?? mimeType,
          byte_size: file.byte_size ?? null,
          content_base64_included: Boolean(file.content_base64),
        }
      : null,
  };
}

export async function handleVaultDocumentList({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const matterId = typeof query.matter_id === "string" && query.matter_id.trim() ? query.matter_id.trim() : null;
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:read",
    resource: { resource_type: "vault_document", matter_id: matterId },
    repository: runtime.repository,
  });
  if (gated) return gated;
  if (isPostgresDmsRuntime(runtime)) {
    const documents = await runtime.upload_runtime.listDocuments({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    });
    const serialized = documents.map(serializePostgresDocument);
    const { allowed } = trimItemsByPermission({
      context,
      items: serialized,
      action: "dms:document:read",
      resourceType: "vault_document",
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: allowed,
        page_info: {
          returned_count: allowed.length,
          omitted_document_count: null,
          registered_account_count: null,
          authority: "postgres-v2",
        },
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: allowed.length === 0 ? "empty" : null,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  const serialized = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "DmsDocument", matter_id: matterId })
    .map(serializeDocument);
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: "dms:document:read",
    resourceType: "vault_document",
  });
  appendVaultSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action: "dms:document:read",
    resource: { resource_type: "vault_document" },
    returnedCount: allowed.length,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: {
        returned_count: allowed.length,
        omitted_document_count: null,
        registered_account_count: allowed.filter((item) => item.account_linkage.status === "linked").length,
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleVaultDocumentUpload({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const normalizedBody = normalizeUploadDocumentBody(body);
  const query = {
    tenant_id: normalizedBody.document?.tenant_id ?? normalizedBody.tenant_id,
    permission_ref: normalizedBody.permission_ref,
    audit_hint_ref: normalizedBody.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:write",
    resource: { resource_type: "vault_document", matter_id: normalizedBody.document?.matter_id },
    repository: runtime.repository,
  });
  if (gated) return gated;
  const actorAccount = isPostgresDmsRuntime(runtime)
    ? postgresDirectoryAccountFromPrincipal(context?.principal)
    : resolveRegisteredAccount({
        user_id: context?.principal?.user_id,
        email: context?.principal?.email,
      });
  if (!actorAccount) {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const linkedAccount = isPostgresDmsRuntime(runtime) ? actorAccount : registeredAccountPublicRef(actorAccount);
  try {
    if (isPostgresDmsRuntime(runtime)) {
      const uploadBytes = strictUploadBytes(normalizedBody);
      const versionId = normalizedBody.document.current_version_id;
      const uploaded = await runtime.upload_runtime.uploadDocument({
        document: {
          ...normalizedBody.document,
          tenant_id: query.tenant_id,
          owner_user_id: linkedAccount.user_id,
          registered_account_email: linkedAccount.email,
        },
        bytes: uploadBytes,
        actor_id: linkedAccount.user_id,
        idempotency_key: normalizedBody.idempotency_key,
        object_id: normalizedBody.object_id ?? `object:${versionId}`,
        session_id: normalizedBody.upload_session_id ?? `dms-upload:${randomUUID()}`,
        version_number: Number(normalizedBody.version_number ?? normalizedBody.document.version_number ?? 1),
        expires_at: normalizedBody.expires_at,
      });
      return {
        status: uploaded.idempotent_replay ? 200 : 201,
        body: {
          request_id: requestId,
          outcome: uploaded.outcome,
          item: serializePostgresDocument(uploaded),
          version: uploaded.version,
          file_object: uploaded.file_object,
          search_index: {
            index_id: null,
            body_text_indexed: false,
            ocr_text_indexed: false,
            ocr_runtime_executed: false,
            ocr_provider: null,
            search_backend: "postgres-metadata",
            raw_text_included: false,
            storage_pointer_ref_included: false,
          },
          audit_event: uploaded.audit_event,
          idempotent_replay: uploaded.idempotent_replay,
          upload_file: normalizedBody.upload_file,
          provider_finalize_before_metadata: true,
          independent_digest_readback: true,
          safe_error_codes: [],
          audit_hint_ref: query.audit_hint_ref,
          production_ready_claim: false,
        },
      };
    }
    const uploadBytes = strictUploadBytes(normalizedBody);
    const result = uploadDocument({
      repository: runtime.repository,
      storage: runtime.storage,
      document: {
        ...normalizedBody.document,
        mime_type: normalizedBody.document?.mime_type ?? normalizedBody.mime_type,
        tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
        owner_user_id: linkedAccount.user_id,
        registered_account_email: linkedAccount.email,
        registered_account: linkedAccount,
      },
      bytes: uploadBytes,
      actor_id: linkedAccount.user_id,
      idempotency_key: normalizedBody.idempotency_key,
    });
    const searchIndex = upsertVaultSearchIndex({
      repository: runtime.repository,
      index_row: createSearchIndexEnvelope({
        document: result.document,
        version: result.version,
        file_object: result.file_object,
        bytes: uploadBytes,
        ocr_text: normalizedBody.ocr_text ?? normalizedBody.ocr?.text ?? normalizedBody.ocr?.pages ?? null,
      }),
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: serializeDocument(result.document),
        version: result.version,
        file_object: serializeFileObjectSafe(result.file_object),
        search_index: {
          index_id: searchIndex.index_id,
          body_text_indexed: searchIndex.body_text_indexed === true,
          ocr_text_indexed: searchIndex.ocr_text_indexed === true,
          ocr_runtime_executed: searchIndex.ocr_runtime_executed === true,
          ocr_provider: searchIndex.ocr_provider ?? null,
          search_backend: searchIndex.search_backend,
          raw_text_included: false,
          storage_pointer_ref_included: false,
        },
        audit_event: result.audit_event,
        idempotent_replay: result.idempotent_replay,
        upload_file: normalizedBody.upload_file,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    const safeCode = error?.safe_error_code === "DMS_SEARCH_INDEX_INPUT_TOO_LARGE"
      ? VAULT_DMS_API_ERROR_CODES.payload_too_large
      : error?.safe_error_code ?? VAULT_DMS_API_ERROR_CODES.validation_error;
    return errorResponse(Number(error?.status) || 400, requestId, [safeCode], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export async function handleVaultDocumentDownload({ documentId, query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:download",
    resource: { resource_type: "vault_document", resource_id: documentId },
    repository: runtime.repository,
  });
  if (gated) return gated;
  if (isPostgresDmsRuntime(runtime)) {
    try {
      const download = await runtime.upload_runtime.downloadDocument({
        tenant_id: query.tenant_id,
        document_id: documentId,
        actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
      });
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "passed",
          item: serializePostgresDocument({ document: download.document, version: download.version }),
          version: download.version,
          file_object: {
            file_object_id: download.file_object.file_object_id,
            sha256: download.file_object.sha256,
            byte_size: Number(download.file_object.byte_size),
            mime_type: download.file_object.content_type,
            status: download.file_object.status,
            raw_path_exposed: false,
            storage_pointer_ref_included: false,
          },
          download: {
            encoding: "base64",
            content_base64: download.bytes.toString("base64"),
            content_sha256: download.sha256,
            sha256: download.sha256,
            byte_size: download.byte_size,
            mime_type: download.mime_type,
            raw_path_exposed: false,
            storage_pointer_ref_included: false,
            independent_digest_readback: true,
          },
          audit_event: { event_id: download.audit_event_id, raw_payload_included: false },
          document_bytes_included: true,
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
          safe_error_codes: [],
          audit_hint_ref: query.audit_hint_ref,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return errorResponse(Number(error?.status) || 400, requestId, [error?.safe_error_code ?? VAULT_DMS_API_ERROR_CODES.validation_error], {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "blocked",
      });
    }
  }
  const current = currentFileObjectForDocument({
    repository: runtime.repository,
    tenant_id: query.tenant_id,
    document_id: documentId,
  });
  if (!current) {
    return errorResponse(404, requestId, [VAULT_DMS_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  try {
    const download = downloadFileObjectWithAudit({
      repository: runtime.repository,
      storage: runtime.storage,
      tenant_id: query.tenant_id,
      file_object_id: current.fileObject.file_object_id,
      actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
      permission_decision_id: requestId,
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        item: serializeDocument(current.document),
        version: current.version,
        file_object: download.file_object,
        download: {
          encoding: "base64",
          content_base64: download.bytes.toString("base64"),
          content_sha256: download.sha256,
          sha256: download.sha256,
          byte_size: download.byte_size,
          mime_type: download.mime_type,
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
        },
        audit_event: download.audit_event,
        document_bytes_included: true,
        raw_path_exposed: false,
        storage_pointer_ref_included: false,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export async function handleVaultDocumentGovernance({ documentId, operation, body = {}, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body.tenant_id,
    permission_ref: body.permission_ref,
    audit_hint_ref: body.audit_hint_ref,
  };
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;
  if (!isPostgresDmsRuntime(runtime)) {
    return errorResponse(409, requestId, ["DMS_POSTGRES_AUTHORITY_REQUIRED"], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const actorId = context?.principal?.user_id ?? context?.principal?.actor_id;
  try {
    const action = DMS_GOVERNANCE_ACTIONS[operation];
    if (!action) return errorResponse(404, requestId, [VAULT_DMS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
    const canonical = await runtime.upload_runtime.getGovernanceAuthorizationResource({
      tenant_id: query.tenant_id,
      document_id: documentId,
      object_id: body.object_id,
    });
    if (body.matter_id != null && String(body.matter_id).trim() !== canonical.matter_id) {
      throw Object.assign(new Error("request matter does not match canonical DMS matter"), {
        status: 409,
        safe_error_code: "DMS_CANONICAL_MATTER_MISMATCH",
      });
    }
    const gated = routeGate({
      context,
      query,
      requestId,
      action,
      resource: { resource_type: "vault_document", resource_id: canonical.document_id, matter_id: canonical.matter_id },
      repository: runtime.repository,
    });
    if (gated) return gated;
    let result;
    if (operation === "legal-hold") {
      result = await runtime.upload_runtime.placeLegalHold({
        tenant_id: query.tenant_id,
        document_id: documentId,
        object_id: body.object_id,
        legal_hold_id: body.legal_hold_id,
        reason: body.reason,
        created_by: actorId,
        expected_matter_id: canonical.matter_id,
      });
    } else if (operation === "retention") {
      result = await runtime.upload_runtime.setRetentionPolicy({
        tenant_id: query.tenant_id,
        document_id: documentId,
        object_id: body.object_id,
        retention_policy_id: body.retention_policy_id,
        retain_until: body.retain_until,
        expected_matter_id: canonical.matter_id,
      });
    } else if (operation === "delete-check") {
      result = await runtime.upload_runtime.assertCommittedObjectDeleteAllowed({
        tenant_id: query.tenant_id,
        document_id: documentId,
        object_id: body.object_id,
        expected_matter_id: canonical.matter_id,
      });
    } else if (operation === "permanent-delete") {
      if (body.approval_receipt != null) throw Object.assign(new Error("permanent-delete approval material is not accepted by the staging probe route"), {
        status: 403,
        safe_error_code: "DMS_PERMANENT_DELETE_APPROVAL_REQUIRED",
      });
      result = await runtime.upload_runtime.requestCommittedObjectDelete({
        tenant_id: query.tenant_id,
        document_id: documentId,
        object_id: body.object_id,
        idempotency_key: body.idempotency_key,
        requested_by: actorId,
        expected_matter_id: canonical.matter_id,
      });
    } else {
      return errorResponse(404, requestId, [VAULT_DMS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
    }
    return {
      status: result.replayed ? 200 : operation === "delete-check" ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.replayed ? "idempotent_replay" : "passed",
        item: result,
        idempotent_replay: result.replayed === true,
        reason_plaintext_included: false,
        approval_material_included: false,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    return errorResponse(Number(error?.status) || 400, requestId, [error?.safe_error_code ?? VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export async function handleVaultSearch({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const matterId = typeof query.matter_id === "string" && query.matter_id.trim() ? query.matter_id.trim() : null;
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:search",
    resource: { resource_type: "vault_search", matter_id: matterId },
    repository: runtime.repository,
  });
  if (gated) return gated;
  if (isPostgresDmsRuntime(runtime)) {
    const searchQuery = typeof query.q === "string" ? query.q : query.query ?? "";
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("ko-KR");
    const dateFrom = typeof query.date_from === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(query.date_from) ? query.date_from : "";
    const dateTo = typeof query.date_to === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(query.date_to) ? query.date_to : "";
    if ((query.current_version && query.current_version !== "current")
      || (query.date_from && !dateFrom)
      || (query.date_to && !dateTo)
      || (dateFrom && dateTo && dateFrom > dateTo)) {
      return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "blocked",
      });
    }
    const entries = await runtime.upload_runtime.listDocuments({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    });
    const serialized = entries.map(serializePostgresDocument);
    const { allowed } = trimItemsByPermission({
      context,
      items: serialized,
      action: "dms:document:read",
      resourceType: "vault_document",
    });
    const allowedIds = new Set(allowed.map((item) => item.document_id));
    const results = entries.filter((entry) => {
      if (!allowedIds.has(entry.document.document_id)) return false;
      const searchable = `${entry.document.title} ${entry.document.document_id} ${entry.document.matter_id}`.toLocaleLowerCase("ko-KR");
      if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
      const updatedDate = entry.document.updated_at.slice(0, 10);
      if (dateFrom && updatedDate < dateFrom) return false;
      if (dateTo && updatedDate > dateTo) return false;
      return true;
    }).map((entry) => Object.freeze({
      document_id: entry.document.document_id,
      version_id: entry.version?.version_id ?? null,
      matter_id: entry.document.matter_id,
      title: entry.document.title,
      indexed_at: entry.document.updated_at,
      body_text_indexed: false,
      ocr_text_indexed: false,
      raw_text_included: false,
      storage_pointer_ref_included: false,
    }));
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: results,
        page_info: {
          query: searchQuery,
          returned_count: results.length,
          omitted_result_count: null,
          current_version_only: true,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          search_backend: "postgres_metadata",
          body_text_indexed: false,
          ocr_index_mode: "disabled",
          ocr_runtime_executed: false,
        },
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: results.length === 0 ? "empty" : null,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  const documents = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "DmsDocument", matter_id: matterId });
  const serialized = documents.map(serializeDocument);
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: "dms:document:read",
    resourceType: "vault_document",
  });
  const allowedDocumentIds = allowed.map((item) => item.document_id);
  const storedRows = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "DmsSearchIndex" });
  const storedByDocumentId = new Map(storedRows.map((row) => [row.document_id, row]));
  const indexRows = documents.map((document) => storedByDocumentId.get(document.document_id) ?? createSearchIndexEnvelope({ document }));
  const searchQuery = typeof query.q === "string" ? query.q : query.query ?? "";
  const filtered = searchMatterVault({
    permission_decision_id: requestId,
    query: searchQuery,
    index_rows: indexRows,
    allowed_document_ids: allowedDocumentIds,
  });
  if (query.current_version && query.current_version !== "current") {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const currentVersionOnly = true;
  const dateFrom = typeof query.date_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date_from) ? query.date_from : "";
  const dateTo = typeof query.date_to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date_to) ? query.date_to : "";
  if ((query.date_from && !dateFrom) || (query.date_to && !dateTo) || (dateFrom && dateTo && dateFrom > dateTo)) {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const currentVersionByDocument = new Map(documents.map((document) => [document.document_id, document.current_version_id]));
  const results = filtered.results.filter((item) => {
    if (currentVersionOnly && currentVersionByDocument.get(item.document_id) !== item.version_id) return false;
    const indexedDate = typeof item.indexed_at === "string" ? item.indexed_at.slice(0, 10) : "";
    if (dateFrom && (!indexedDate || indexedDate < dateFrom)) return false;
    if (dateTo && (!indexedDate || indexedDate > dateTo)) return false;
    return true;
  });
  appendVaultSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action: "dms:search",
    resource: { resource_type: "vault_search" },
    returnedCount: results.length,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: results,
      page_info: {
        query: searchQuery,
        returned_count: results.length,
        omitted_result_count: filtered.omitted_result_count,
        current_version_only: currentVersionOnly,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        search_backend: "json_substring_search",
        body_text_indexed: results.some((item) => item.body_text_indexed === true),
        ocr_index_mode: "caller_supplied_sidecar",
        ocr_runtime_executed: false,
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: results.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function searchPreferenceResourceId(actorId) {
  return `vault_search_preferences:${actorId}`;
}

function normalizeSearchPreferenceFilters(value = {}) {
  const dateFrom = typeof value.date_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date_from) ? value.date_from : null;
  const dateTo = typeof value.date_to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date_to) ? value.date_to : null;
  if (dateFrom && dateTo && dateFrom > dateTo) return null;
  return Object.freeze({
    current_version_only: true,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

function searchPreferenceKey(value) {
  return JSON.stringify([value.query, value.current_version_only, value.date_from, value.date_to]);
}

function normalizeSearchPreferenceRecord(value) {
  if (!value || typeof value.query !== "string" || typeof value.searched_at !== "string") return null;
  const query = value.query.trim().slice(0, SEARCH_QUERY_LIMIT);
  const searchedAt = Date.parse(value.searched_at);
  const filters = normalizeSearchPreferenceFilters(value);
  if (!query || !Number.isFinite(searchedAt) || !filters) return null;
  return Object.freeze({
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim().slice(0, 240) : `${query}:${value.searched_at}`,
    query,
    scope: "documents-ocr",
    searched_at: new Date(searchedAt).toISOString(),
    ...filters,
  });
}

function normalizeSearchPreferenceList(values, { limit, retention = false } = {}) {
  const cutoff = Date.now() - SEARCH_HISTORY_RETENTION_MS;
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map(normalizeSearchPreferenceRecord)
    .filter((item) => item && (!retention || Date.parse(item.searched_at) >= cutoff))
    .filter((item) => {
      const key = searchPreferenceKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function serializeSearchPreferences(record, actorId) {
  return Object.freeze({
    owner_user_id: actorId,
    recent: normalizeSearchPreferenceList(record?.recent, { limit: SEARCH_RECENT_LIMIT, retention: true }),
    saved: normalizeSearchPreferenceList(record?.saved, { limit: SEARCH_SAVED_LIMIT }),
    retention_days: 90,
    result_payloads_persisted: false,
  });
}

function appendSearchPreferenceAudit({ repository, context, query, operation, preferences } = {}) {
  return repository.appendAudit({
    event_id: `search_preferences_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context.principal.user_id,
    action: `search.preferences.${operation}`,
    object_type: "search_preferences",
    object_id: searchPreferenceResourceId(context.principal.user_id),
    decision: "allow",
    reason: "search_preferences_updated_after_permission_gate",
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref: query.permission_ref,
      audit_hint_ref: query.audit_hint_ref,
      recent_count: preferences.recent.length,
      saved_count: preferences.saved.length,
      raw_query_included: false,
      result_payload_included: false,
    },
  });
}

function searchPreferenceMutation(current, body, actorId) {
  const operation = String(body?.operation ?? "");
  if (!SEARCH_PREFERENCE_OPERATIONS.has(operation)) return null;
  const preferences = serializeSearchPreferences(current, actorId);
  if (operation === "clear_recent") return { operation, preferences: { ...preferences, recent: [] } };
  if (operation === "delete_saved") {
    const id = typeof body?.id === "string" ? body.id.trim().slice(0, 240) : "";
    if (!id) return null;
    return { operation, preferences: { ...preferences, saved: preferences.saved.filter((item) => item.id !== id) } };
  }
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, SEARCH_QUERY_LIMIT) : "";
  const filters = normalizeSearchPreferenceFilters(body);
  if (!query || !filters) return null;
  const searchedAt = new Date().toISOString();
  const preference = { query, scope: "documents-ocr", searched_at: searchedAt, ...filters };
  if (operation === "share_authorize") return { operation, preferences };
  if (operation === "remember") {
    return {
      operation,
      preferences: {
        ...preferences,
        recent: [
          { id: `recent:${randomUUID()}`, ...preference },
          ...preferences.recent.filter((item) => searchPreferenceKey(item) !== searchPreferenceKey(preference)),
        ].slice(0, SEARCH_RECENT_LIMIT),
      },
    };
  }
  if (preferences.saved.some((item) => searchPreferenceKey(item) === searchPreferenceKey(preference))) return { operation, preferences };
  return {
    operation,
    preferences: {
      ...preferences,
      saved: [
        { id: `saved:${randomUUID()}`, ...preference },
        ...preferences.saved,
      ].slice(0, SEARCH_SAVED_LIMIT),
    },
  };
}

export function handleVaultSearchPreferences({ method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const requestQuery = { ...(body ?? {}), ...(query ?? {}) };
  const actorId = context?.principal?.user_id;
  if (!actorId) {
    return errorResponse(403, requestId, [VAULT_DMS_API_ERROR_CODES.unauthorized_omission], {
      audit_hint_ref: requestQuery.audit_hint_ref,
      ui_state: "denied",
    });
  }
  const resourceId = searchPreferenceResourceId(actorId);
  const gated = routeGate({
    context,
    query: requestQuery,
    requestId,
    action: method === "POST" ? "dms:search:preferences:write" : "dms:search:preferences:read",
    resource: { resource_type: "search_preferences", resource_id: resourceId },
    repository: runtime.repository,
  });
  if (gated) return gated;

  const current = runtime.repository.get({
    tenant_id: requestQuery.tenant_id,
    model_type: SEARCH_PREFERENCES_MODEL_TYPE,
    resource_id: resourceId,
  });
  if (method === "GET") {
    const preferences = serializeSearchPreferences(current, actorId);
    if (current && (current.recent?.length ?? 0) !== preferences.recent.length) {
      runtime.repository.upsert({ ...current, recent: preferences.recent });
      appendSearchPreferenceAudit({
        repository: runtime.repository,
        context,
        query: requestQuery,
        operation: "retention_pruned",
        preferences,
      });
    }
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        item: preferences,
        safe_error_codes: [],
        audit_hint_ref: requestQuery.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }

  const mutation = searchPreferenceMutation(current, body, actorId);
  if (!mutation) {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: requestQuery.audit_hint_ref,
    });
  }
  runtime.repository.transaction((repository) => {
    const latest = repository.get({
      tenant_id: requestQuery.tenant_id,
      model_type: SEARCH_PREFERENCES_MODEL_TYPE,
      resource_id: resourceId,
    });
    const next = searchPreferenceMutation(latest, body, actorId);
    repository.upsert({
      model_type: SEARCH_PREFERENCES_MODEL_TYPE,
      resource_id: resourceId,
      tenant_id: requestQuery.tenant_id,
      owner_user_id: actorId,
      recent: next.preferences.recent,
      saved: next.preferences.saved,
      retention_days: next.preferences.retention_days,
      result_payloads_persisted: false,
    });
    appendSearchPreferenceAudit({ repository, context, query: requestQuery, operation: next.operation, preferences: next.preferences });
    mutation.preferences = next.preferences;
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: mutation.preferences,
      safe_error_codes: [],
      audit_hint_ref: requestQuery.audit_hint_ref,
      production_ready_claim: false,
    },
  };
}

export async function handleVaultAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const matterId = typeof query.matter_id === "string" && query.matter_id.trim() ? query.matter_id.trim() : null;
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:audit:read",
    resource: { resource_type: "vault_audit", matter_id: matterId },
    repository: runtime.repository,
  });
  if (gated) return gated;
  if (isPostgresDmsRuntime(runtime)) {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: await runtime.upload_runtime.listAuditEvents({ tenant_id: query.tenant_id, matter_id: matterId }),
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const documents = matterId
    ? runtime.repository.list({ tenant_id: query.tenant_id, model_type: "DmsDocument", matter_id: matterId })
    : [];
  const documentIds = new Set(documents.map((document) => document.document_id));
  const events = runtime.repository.listAudit({ tenant_id: query.tenant_id })
    .filter((event) => !matterId
      || event.matter_id === matterId
      || event.metadata?.matter_id === matterId
      || documentIds.has(event.object_id)
      || documentIds.has(event.after?.document_id))
    .map((event) => Object.freeze({ ...event, matter_id: matterId ?? event.matter_id ?? event.metadata?.matter_id ?? null }));
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: events,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      production_ready_claim: false,
    },
  };
}

export async function handleVaultDmsApiRequest({
  pathname,
  method,
  query,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  if (pathname.startsWith("/api/vault/precedent")
      || /^\/api\/vault\/documents\/[^/]+\/privilege-label$/u.test(pathname)) {
    const precedent = await handleVaultPrecedentApiRequest({
      pathname, method, query, body, context, requestId, runtime,
    });
    if (precedent) return precedent;
  }
  const downloadMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/download$/);
  if (downloadMatch && method === "GET") {
    return handleVaultDocumentDownload({
      documentId: decodeURIComponent(downloadMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const governanceMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/(legal-holds|retention-policies|delete-check|permanent-delete)$/u);
  if (governanceMatch && method === "POST") {
    const operation = {
      "legal-holds": "legal-hold",
      "retention-policies": "retention",
      "delete-check": "delete-check",
      "permanent-delete": "permanent-delete",
    }[governanceMatch[2]];
    return handleVaultDocumentGovernance({
      documentId: decodeURIComponent(governanceMatch[1]),
      operation,
      body,
      context,
      requestId,
      runtime,
    });
  }
  if (pathname === "/api/vault/documents" && method === "GET") {
    return handleVaultDocumentList({ query, context, requestId, runtime });
  }
  if (pathname === "/api/vault/documents" && method === "POST") {
    return handleVaultDocumentUpload({ body, context, requestId, runtime });
  }
  if (pathname === "/api/vault/documents/upload" && method === "POST") {
    return handleVaultDocumentUpload({ body, context, requestId, runtime });
  }
  if (pathname === "/api/vault/search" && method === "GET") {
    return handleVaultSearch({ query, context, requestId, runtime });
  }
  if (pathname === "/api/vault/search/preferences" && ["GET", "POST"].includes(method)) {
    return handleVaultSearchPreferences({ method, query, body, context, requestId, runtime });
  }
  if (pathname === "/api/vault/audit" && method === "GET") {
    return handleVaultAudit({ query, context, requestId, runtime });
  }
  return errorResponse(404, requestId, [VAULT_DMS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
