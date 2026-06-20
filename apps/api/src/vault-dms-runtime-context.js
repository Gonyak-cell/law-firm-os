import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { serializeFileObjectSafe } from "../../../packages/dms/src/file-object-service.js";
import { createSearchIndexEnvelope } from "../../../packages/dms/src/search/indexer.js";
import { filterSearchResultsByAcl } from "../../../packages/dms/src/search/acl-filter.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const VAULT_DMS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "vault-dms",
  contract_ref: "contracts/dms-core-contract.json",
  contract_schema_version: "law-firm-os.dms-core-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/vault/documents",
    "POST /api/vault/documents",
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
    tenant_id: "tenant_rp07_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    name: "RP07 synthetic vault",
    status: "active",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
  }),
  Object.freeze({
    model_type: "DmsDocument",
    document_id: "doc_rp07_synthetic_001",
    tenant_id: "tenant_rp07_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    workspace_id: "workspace_rp07_synthetic",
    title: "Synthetic engagement letter",
    status: "active",
    current_version_id: "version_doc_rp07_synthetic_001_1",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    privilege_label_id: "standard",
    legal_hold_id: null,
  }),
  Object.freeze({
    model_type: "DmsDocumentVersion",
    version_id: "version_doc_rp07_synthetic_001_1",
    document_id: "doc_rp07_synthetic_001",
    tenant_id: "tenant_rp07_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    version_number: 1,
    status: "current",
    file_object_id: "file_version_doc_rp07_synthetic_001_1",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    sha256: "seed",
  }),
  Object.freeze({
    model_type: "DmsFileObject",
    file_object_id: "file_version_doc_rp07_synthetic_001_1",
    tenant_id: "tenant_rp07_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    storage_pointer_ref: "vault://seed/doc_rp07_synthetic_001",
    sha256: "seed",
    byte_size: 0,
    mime_type: "application/pdf",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
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

function routeGate({ context, query, requestId, action, resource }) {
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
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function serializeDocument(record) {
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
    raw_path_exposed: false,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
  });
}

export function handleVaultDocumentList({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:read",
    resource: { resource_type: "vault_document" },
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
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_document_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleVaultDocumentUpload({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.document?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "dms:document:write",
    resource: { resource_type: "vault_document", matter_id: body?.document?.matter_id },
  });
  if (gated) return gated;
  try {
    const result = uploadDocument({
      repository: runtime.repository,
      storage: runtime.storage,
      document: body.document,
      bytes: body.content_text ?? "",
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: serializeDocument(result.document),
        version: result.version,
        file_object: serializeFileObjectSafe(result.file_object),
        audit_event: result.audit_event,
        idempotent_replay: result.idempotent_replay,
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
  });
  if (gated) return gated;
  const documents = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "DmsDocument" });
  const envelopes = documents.map((document) => createSearchIndexEnvelope({ document }));
  const filtered = filterSearchResultsByAcl({
    results: envelopes,
    principal: context.principal,
    object_acl: context.object_acl,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: filtered.results,
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
  if (pathname === "/api/vault/documents" && method === "GET") {
    return handleVaultDocumentList({ query, context, requestId, runtime });
  }
  if (pathname === "/api/vault/documents" && method === "POST") {
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
