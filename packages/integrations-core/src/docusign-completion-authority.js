import { docusignFailure, docusignRequiredSha256, docusignRequiredText } from "./docusign-envelope-model.js";

const AUTHORITY_FIELDS = Object.freeze([
  "tenant_id",
  "matter_id",
  "workspace_id",
  "request_id",
  "kind",
  "sha256",
  "permission_envelope_id",
  "audit_trace_id",
  "fencing_generation",
  "idempotency_key",
  "object_id",
]);

function authorityError(field) {
  if (field === "permission_envelope_id") return docusignFailure("DOCUSIGN_PERMISSION_AUTHORITY_CHANGED", "DocuSign permission authority changed", 409);
  if (field === "audit_trace_id") return docusignFailure("DOCUSIGN_AUDIT_LINEAGE_CHANGED", "DocuSign audit lineage changed", 409);
  if (field === "fencing_generation") return docusignFailure("DOCUSIGN_COMPLETION_FENCE_LOST", "DocuSign completion fence was lost", 409);
  return docusignFailure("DOCUSIGN_COMPLETION_BINDING_INVALID", "DocuSign completion authority changed", 409);
}

export function normalizeCompletionAuthorityExpectation(input = {}) {
  const expected = {
    tenant_id: docusignRequiredText(input.tenant_id, "completion_authority.tenant_id"),
    matter_id: docusignRequiredText(input.matter_id, "completion_authority.matter_id"),
    workspace_id: docusignRequiredText(input.workspace_id, "completion_authority.workspace_id"),
    request_id: docusignRequiredText(input.request_id, "completion_authority.request_id"),
    kind: docusignRequiredText(input.kind, "completion_authority.kind"),
    sha256: docusignRequiredSha256(input.sha256, "completion_authority.sha256"),
    permission_envelope_id: docusignRequiredText(input.permission_envelope_id, "completion_authority.permission_envelope_id"),
    audit_trace_id: docusignRequiredText(input.audit_trace_id, "completion_authority.audit_trace_id"),
    fencing_generation: Number(input.fencing_generation),
    idempotency_key: input.idempotency_key == null ? null : docusignRequiredText(input.idempotency_key, "completion_authority.idempotency_key"),
    object_id: input.object_id == null ? null : docusignRequiredText(input.object_id, "completion_authority.object_id"),
  };
  if (!Number.isSafeInteger(expected.fencing_generation) || expected.fencing_generation < 1) throw new TypeError("completion_authority.fencing_generation must be positive");
  return Object.freeze(expected);
}

function requestAuthorityValue(request, field) {
  if (field === "matter_id" || field === "request_id" || field === "tenant_id") return request[field];
  if (field === "workspace_id" || field === "permission_envelope_id" || field === "audit_trace_id") {
    return field === "workspace_id" ? request.document?.workspace_id : request.document?.[field];
  }
  if (field === "kind") return request.completion_operation?.kind?.replace(/^ingest:/u, "");
  if (field === "fencing_generation") return request.completion_operation?.fencing_generation;
  if (field === "idempotency_key") return request.completion_operation?.idempotency_key;
  if (field === "object_id") return request.completion_operation?.object_id;
  if (field === "sha256") return request.completion_operation?.sha256;
  return undefined;
}

export function assertCompletionAuthority(expectedInput, request) {
  const expected = normalizeCompletionAuthorityExpectation(expectedInput);
  if (!request || request.tenant_id !== expected.tenant_id || request.request_id !== expected.request_id) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
  for (const field of AUTHORITY_FIELDS) {
    if (requestAuthorityValue(request, field) !== expected[field]) throw authorityError(field);
  }
  return request;
}

export const DOCUSIGN_COMPLETION_AUTHORITY_FIELDS = AUTHORITY_FIELDS;
