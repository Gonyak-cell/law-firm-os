import { randomUUID } from "node:crypto";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
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

const DEFAULT_VAULT_ACCOUNT = registeredAccountPublicRef(highestPrivilegeRegisteredAccount());

export const VAULT_DMS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "vault-dms",
  contract_ref: "contracts/dms-core-contract.json",
  contract_schema_version: "law-firm-os.dms-core-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/vault/documents",
    "POST /api/vault/documents",
    "GET /api/vault/documents/:document_id/download",
    "GET /api/vault/search",
    "GET /api/vault/audit",
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
});

export const VAULT_DMS_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "DmsWorkspace",
    workspace_id: "workspace_rp07_synthetic",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_id: "matter_rp05_synthetic_opening",
    name: "RP07 synthetic vault",
    status: "active",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    owner_user_id: DEFAULT_VAULT_ACCOUNT.user_id,
    registered_account: DEFAULT_VAULT_ACCOUNT,
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
    owner_user_id: DEFAULT_VAULT_ACCOUNT.user_id,
    registered_account_email: DEFAULT_VAULT_ACCOUNT.email,
    registered_account: DEFAULT_VAULT_ACCOUNT,
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
    created_by: DEFAULT_VAULT_ACCOUNT.user_id,
    registered_account: DEFAULT_VAULT_ACCOUNT,
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
    owner_user_id: DEFAULT_VAULT_ACCOUNT.user_id,
  }),
]);

export function createVaultDmsRuntimeContext({
  repository = createDmsRepository({ seedRecords: VAULT_DMS_RUNTIME_SEED }),
  storage = createLocalStorageAdapter({ adapter_id: "vault-api-local" }),
} = {}) {
  return Object.freeze({ repository, storage, seed_ref: "cmp-g5-vault-dms-synthetic" });
}

const DEFAULT_RUNTIME = createVaultDmsRuntimeContext();

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

export function handleVaultDocumentList({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:read",
    resource: { resource_type: "vault_document" },
    repository: runtime.repository,
  });
  if (gated) return gated;
  const serialized = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "DmsDocument" })
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

export function handleVaultDocumentUpload({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
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
  const actorAccount = resolveRegisteredAccount({
    user_id: normalizedBody.actor_id ?? normalizedBody.document?.owner_user_id ?? context?.principal?.user_id,
    email: normalizedBody.actor_email ?? normalizedBody.document?.registered_account_email ?? context?.principal?.email,
  });
  if (!actorAccount) {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const linkedAccount = registeredAccountPublicRef(actorAccount);
  try {
    const uploadBytes = normalizedBody.content_base64
      ? Buffer.from(String(normalizedBody.content_base64), "base64")
      : normalizedBody.content_text ?? "";
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
  } catch {
    return errorResponse(400, requestId, [VAULT_DMS_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleVaultDocumentDownload({ documentId, query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:download",
    resource: { resource_type: "vault_document", resource_id: documentId },
    repository: runtime.repository,
  });
  if (gated) return gated;
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

export function handleVaultSearch({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:search",
    resource: { resource_type: "vault_search" },
    repository: runtime.repository,
  });
  if (gated) return gated;
  const documents = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "DmsDocument" });
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
  appendVaultSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action: "dms:search",
    resource: { resource_type: "vault_search" },
    returnedCount: filtered.results.length,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: filtered.results,
      page_info: {
        query: searchQuery,
        returned_count: filtered.results.length,
        omitted_result_count: filtered.omitted_result_count,
        search_backend: "json_substring_search",
        body_text_indexed: filtered.results.some((item) => item.body_text_indexed === true),
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: filtered.results.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleVaultAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:audit:read",
    resource: { resource_type: "vault_audit" },
    repository: runtime.repository,
  });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.repository.listAudit({ tenant_id: query.tenant_id }),
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
  if (pathname === "/api/vault/audit" && method === "GET") {
    return handleVaultAudit({ query, context, requestId, runtime });
  }
  return errorResponse(404, requestId, [VAULT_DMS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
