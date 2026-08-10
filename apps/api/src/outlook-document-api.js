import { createHash } from "node:crypto";
import { canonicalDraftData } from "../../../packages/matter/src/agreement-input.js";
import { validateBuilderApprovalReceipt } from "../../../packages/matter/src/document-approval-service.js";
import { readApprovedTemplateVersion } from "../../../packages/matter/src/document-template-authority.js";
import { handleDocusignOutlookRead } from "./docusign-api.js";
import { handleMatterApiRequest } from "./matter-runtime-context.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const OUTLOOK_DOCUMENTS_PATH = "/api/outlook/documents";
export const OUTLOOK_DOCUMENT_APPROVAL_REQUESTS_PATH = `${OUTLOOK_DOCUMENTS_PATH}/approval-requests`;
const OUTLOOK_DOCUMENT_PUBLISH_PATH = /^\/api\/outlook\/documents\/([^/]+)\/publish$/u;
const MAX_ITEMS = 50;
const MAX_SOURCE_ITEMS = 1_000;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const GENERATOR_VERSION = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,31})?$/u;
const GENERATOR_VERSION_FORBIDDEN = /(?:^|[_:.\/-])(?:access(?:[_-]?token)?|account(?:[_-]?id)?|actor(?:[_-]?id)?|api[_-]?key|audit(?:[_-]?(?:hint|trace)(?:[_-]?ref|[_-]?id)?)?|authority|client[_-]?secret|connection(?:[_-]?id)?|credential|document[_-]?bytes|envelope(?:[_-]?id)?|internal|password|permission(?:[_-]?(?:envelope|ref|id))?|private|provider(?:[_-]?(?:payload|credentials?))?|raw(?:[_-]?(?:body|contact|payload|storage|template))?|refresh[_-]?token|secret|storage(?:[_-]?(?:path|pointer|key))?|tenant(?:[_-]?id)?|token)(?:$|[_:.\/-])/iu;
const DRAFT_STATUSES = new Set(["draft", "ready_for_review", "approved", "finalized"]);
const APPROVAL_STATES = new Set(["approval_required", "approved", "rejected"]);
const PUBLISH_STATES = new Set(["owner_blocked", "approved_unpublished", "complete"]);
const APPROVAL_STATUSES = new Set(["pending_owner_approval", "approved", "rejected"]);
const ESIGN_STATES = new Set([
  "draft", "review_required", "approved", "provider_pending", "draft_created", "sent", "delivered",
  "completed_artifacts_pending", "completed", "declined", "voided", "reconciliation_required", "provider_blocked",
]);
const DRAFT_IDENTITY_FIELDS = ["matter_id", "draft_id", "template_id", "template_version", "template_hash", "input_fingerprint"];
const DRAFT_CHAIN_FIELDS = [...DRAFT_IDENTITY_FIELDS, "title", "status", "merge_field_count", "signer_role_count", "approval_state", "publish_state", "immutable"];
const RECEIPT_FIELDS = ["receipt_id", "approval_request_id", "approved_at", "input_hash", "input_fingerprint", "template_hash", "receipt_hash"];

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function blocked(status, requestId, safeErrorCodes) {
  return response(status, {
    request_id: requestId,
    outcome: "blocked",
    safe_error_codes: Object.freeze([...safeErrorCodes]),
    count_leak_prevented: true,
    production_ready_claim: false,
  });
}

function requiredText(value, field, max = 256) {
  if (typeof value !== "string" || value !== value.trim() || value === "" || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw Object.assign(new TypeError(`${field} is invalid`), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
  }
  return value;
}

function safeId(value, field, max = 256) {
  const text = requiredText(value, field, max);
  if (!SAFE_ID.test(text)) throw Object.assign(new TypeError(`${field} is invalid`), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
  return text;
}

function safeResponseId(value, field) {
  try {
    return safeId(value, field);
  } catch {
    throw Object.assign(new Error("unsafe document runtime response"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
}

function safeString(value, field, max = 256) {
  try {
    return requiredText(value, field, max);
  } catch {
    throw Object.assign(new Error("unsafe document runtime response"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
}

function safeDigest(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw Object.assign(new Error(`${field} is unsafe`), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return value;
}

function safeGeneratorVersion(value) {
  const version = safeString(value, "generator_version", 161);
  if (!GENERATOR_VERSION.test(version) || GENERATOR_VERSION_FORBIDDEN.test(version)) {
    throw Object.assign(new Error("generator_version is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return version;
}

function safeInstant(value, field) {
  const instant = safeString(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(instant)
    || !Number.isFinite(Date.parse(instant)) || new Date(instant).toISOString() !== instant) {
    throw Object.assign(new Error(`${field} is unsafe`), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return instant;
}

function exactObject(value, fields) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === fields.length
    && fields.every((field) => Object.hasOwn(value, field));
}

function exactQuery(query, queryPairs, fields) {
  if (!exactObject(query, fields)) return false;
  const pairs = queryPairs ?? Object.entries(query);
  return Array.isArray(pairs)
    && pairs.length === fields.length
    && pairs.every(([key], index) => key === fields[index]);
}

function requestError(error, requestId) {
  return blocked(
    [400, 401, 403, 404, 409, 413, 503].includes(error?.status) ? error.status : 400,
    requestId,
    [error?.safe_error_code ?? "OUTLOOK_DOCUMENT_REQUEST_INVALID"],
  );
}

function canonicalCodes(result, fallback) {
  const codes = Array.isArray(result?.body?.safe_error_codes)
    ? result.body.safe_error_codes.filter((code) => typeof code === "string" && /^[A-Z0-9_]+$/u.test(code)).slice(0, 4)
    : [];
  return Object.freeze(codes.length ? codes : [fallback]);
}

function canonicalFailure(result, requestId, fallback) {
  const status = [400, 401, 403, 404, 409, 413, 503].includes(result?.status) ? result.status : 503;
  return blocked(status, requestId, canonicalCodes(result, fallback));
}

function binaryCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertBinding(value, expected, fields) {
  if (fields.some((field) => value?.[field] !== expected?.[field])) {
    throw Object.assign(new Error("document response binding is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return value;
}

function bounded(items, project, key, { descending = false } = {}) {
  if (!Array.isArray(items) || items.length > MAX_SOURCE_ITEMS) {
    throw Object.assign(new Error("document runtime collection is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  const projected = items.map(project);
  const keys = projected.map(key);
  if (new Set(keys).size !== keys.length) {
    throw Object.assign(new Error("document runtime collection identity is duplicated"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  projected.sort((left, right) => (descending ? -1 : 1) * binaryCompare(key(left), key(right)));
  return Object.freeze(projected.slice(0, MAX_ITEMS));
}

function falseFlag(value) {
  if (value !== false) throw Object.assign(new Error("unsafe inclusion flag"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  return false;
}

function safeNumber(value, field, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw Object.assign(new Error(`${field} is unsafe`), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return value;
}

function projectTemplate(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.merge_fields) || !Array.isArray(value.signer_roles)) {
    throw Object.assign(new Error("template response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  if (value.merge_fields.length > 64 || value.signer_roles.length > 32 || value.merge_field_count !== value.merge_fields.length
    || value.category !== "document" || value.requires_approval !== true || value.approval_receipt_present !== true
    || value.production_ready_claim !== false) {
    throw Object.assign(new Error("template response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return Object.freeze({
    template_id: safeResponseId(value.template_id, "template_id"),
    template_version: safeResponseId(value.template_version, "template_version"),
    template_hash: safeDigest(value.template_hash, "template_hash"),
    label: safeString(value.label, "label", 240),
    category: "document",
    merge_field_count: safeNumber(value.merge_field_count, "merge_field_count"),
    merge_fields: Object.freeze(value.merge_fields.map((field) => safeResponseId(field, "merge_field"))),
    signer_roles: Object.freeze(value.signer_roles.map((role) => {
      if (!role || typeof role !== "object" || typeof role.required !== "boolean") {
        throw Object.assign(new Error("signer role response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
      }
      return Object.freeze({ role_id: safeResponseId(role.role_id, "role_id"), required: role.required });
    })),
    requires_approval: true,
    approval_receipt_present: true,
    raw_template_body_included: falseFlag(value.raw_template_body_included),
    raw_contact_values_included: falseFlag(value.raw_contact_values_included),
    production_ready_claim: false,
  });
}

function projectApprovalReceipt(value) {
  if (value == null) return null;
  if (value.approved_by_ref_included !== false || value.raw_body_included !== false || value.raw_contact_values_included !== false) {
    throw Object.assign(new Error("approval receipt response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return Object.freeze({
    receipt_id: safeResponseId(value.receipt_id, "receipt_id"),
    approval_request_id: safeResponseId(value.approval_request_id, "approval_request_id"),
    approved_at: safeInstant(value.approved_at, "approved_at"),
    input_hash: safeDigest(value.input_hash, "input_hash"),
    input_fingerprint: safeDigest(value.input_fingerprint, "input_fingerprint"),
    template_hash: safeDigest(value.template_hash, "template_hash"),
    receipt_hash: safeDigest(value.receipt_hash, "receipt_hash"),
    approved_by_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
  });
}

function projectApproval(value, matterId, draftId = null) {
  if (!value || typeof value !== "object" || value.matter_id !== matterId || (draftId && value.draft_id !== draftId)
    || !APPROVAL_STATUSES.has(value.status) || (value.decision != null && !["approved", "rejected"].includes(value.decision))
    || value.reviewer_role !== "owner" || value.reviewer_user_ref_included !== false
    || value.owner_approval_ref_included !== false || value.raw_body_included !== false
    || value.raw_contact_values_included !== false || value.production_ready_claim !== false) {
    throw Object.assign(new Error("approval response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  const receipt = projectApprovalReceipt(value.approval_receipt);
  const stateConsistent = value.status === "pending_owner_approval"
    ? value.decision == null && receipt == null
    : value.status === "approved"
      ? value.decision === "approved" && receipt != null
      : value.decision === "rejected" && receipt == null;
  if (!stateConsistent) {
    throw Object.assign(new Error("approval state is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  const projected = Object.freeze({
    approval_request_id: safeResponseId(value.approval_request_id, "approval_request_id"),
    draft_id: safeResponseId(value.draft_id, "draft_id"),
    matter_id: safeResponseId(value.matter_id, "matter_id"),
    status: safeResponseId(value.status, "approval_status"),
    decision: value.decision == null ? null : safeResponseId(value.decision, "approval_decision"),
    reviewer_role: "owner",
    input_fingerprint: safeDigest(value.input_fingerprint, "input_fingerprint"),
    template_id: safeResponseId(value.template_id, "template_id"),
    template_version: safeResponseId(value.template_version, "template_version"),
    template_hash: safeDigest(value.template_hash, "template_hash"),
    approval_receipt: receipt,
    reviewer_user_ref_included: false,
    owner_approval_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
  if (receipt) assertBinding(receipt, projected, ["approval_request_id", "input_fingerprint", "template_hash"]);
  return projected;
}

function projectDraft(value, matterId, draftId) {
  if (!value || typeof value !== "object" || value.matter_id !== matterId || value.draft_id !== draftId
    || !DRAFT_STATUSES.has(value.status) || !APPROVAL_STATES.has(value.approval_state) || !PUBLISH_STATES.has(value.publish_state)
    || (value.safe_excerpt != null && !/^입력 본문 \d+자$/u.test(value.safe_excerpt))
    || value.raw_body_included !== false || value.raw_template_body_included !== false
    || value.raw_contact_values_included !== false || value.document_bytes_included !== false
    || value.production_ready_claim !== false || typeof value.immutable !== "boolean") {
    throw Object.assign(new Error("draft response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  return Object.freeze({
    draft_id: safeResponseId(value.draft_id, "draft_id"),
    matter_id: safeResponseId(value.matter_id, "matter_id"),
    template_id: safeResponseId(value.template_id, "template_id"),
    template_version: safeResponseId(value.template_version, "template_version"),
    template_hash: safeDigest(value.template_hash, "template_hash"),
    input_fingerprint: safeDigest(value.input_fingerprint, "input_fingerprint"),
    title: safeString(value.title, "title", 240),
    status: safeResponseId(value.status, "draft_status"),
    safe_excerpt: value.safe_excerpt == null ? null : safeString(value.safe_excerpt, "safe_excerpt", 240),
    merge_field_count: safeNumber(value.merge_field_count, "merge_field_count"),
    signer_role_count: safeNumber(value.signer_role_count, "signer_role_count"),
    approval_state: safeResponseId(value.approval_state, "approval_state"),
    publish_state: safeResponseId(value.publish_state, "publish_state"),
    immutable: value.immutable,
    raw_body_included: false,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

function projectCompletionArtifact(value) {
  if (value == null) return null;
  if (value.immutable !== true) throw Object.assign(new Error("completion artifact is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  return Object.freeze({
    document_id: safeResponseId(value.document_id, "completion_document_id"),
    version_id: safeResponseId(value.version_id, "completion_version_id"),
    sha256: safeDigest(value.sha256, "completion_sha256"),
    immutable: true,
  });
}

function projectDocusignRequest(value, matterId) {
  if (!value || typeof value !== "object" || value.matter_id !== matterId || !value.document
    || !Array.isArray(value.recipients) || value.recipients.length === 0 || value.recipients.length > 32
    || !ESIGN_STATES.has(value.state)
    || typeof value.can_send !== "boolean" || typeof value.can_reconcile !== "boolean"
    || value.production_ready_claim !== false) {
    throw Object.assign(new Error("DocuSign response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID" });
  }
  const documentId = safeResponseId(value.document.document_id, "document_id");
  const versionId = safeResponseId(value.document.version_id, "version_id");
  const canonicalDocumentRef = `matter://${matterId}/documents/${documentId}/versions/${versionId}`;
  if (value.canonical_document_ref !== canonicalDocumentRef) {
    throw Object.assign(new Error("DocuSign canonical reference is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID" });
  }
  if (value.completion_artifacts != null
    && (typeof value.completion_artifacts !== "object" || Array.isArray(value.completion_artifacts))) {
    throw Object.assign(new Error("DocuSign completion response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID" });
  }
  const signedPdf = projectCompletionArtifact(value.completion_artifacts?.signed_pdf);
  const certificate = projectCompletionArtifact(value.completion_artifacts?.certificate);
  const hasCompletionArtifact = signedPdf != null || certificate != null;
  const reusesCompletionDocument = signedPdf && certificate && signedPdf.document_id === certificate.document_id;
  if ((value.state === "completed" && (!signedPdf || !certificate))
    || reusesCompletionDocument
    || (value.state !== "completed" && value.state !== "completed_artifacts_pending" && hasCompletionArtifact)) {
    throw Object.assign(new Error("DocuSign completion state is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID" });
  }
  const completion = value.completion_artifacts == null ? null : Object.freeze({ signed_pdf: signedPdf, certificate });
  return Object.freeze({
    request_id: safeResponseId(value.request_id, "esign_request_id"),
    matter_id: safeResponseId(value.matter_id, "matter_id"),
    document: Object.freeze({ document_id: documentId, version_id: versionId, sha256: safeDigest(value.document.sha256, "document_sha256") }),
    recipients: Object.freeze(value.recipients.map((recipient) => Object.freeze({
      recipient_ref: safeResponseId(recipient.recipient_ref, "recipient_ref"),
      role: safeResponseId(recipient.role, "recipient_role"),
      routing_order: safeNumber(recipient.routing_order, "routing_order", { min: 1 }),
    }))),
    state: safeResponseId(value.state, "esign_state"),
    canonical_document_ref: canonicalDocumentRef,
    can_send: value.can_send,
    can_reconcile: value.can_reconcile,
    completion_artifacts: completion,
    production_ready_claim: false,
  });
}

function projectArtifact(value, draftId) {
  if (value == null) throw Object.assign(new Error("artifact response is required"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  if (value.draft_id !== draftId || value.immutable !== true || value.status !== "finalized"
    || value.document_bytes_included !== false || value.raw_body_included !== false
    || value.raw_contact_values_included !== false || value.raw_storage_path_included !== false) {
    throw Object.assign(new Error("artifact response is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  }
  const filename = safeString(value.filename, "filename", 240);
  if (/[/\\]/u.test(filename)) throw Object.assign(new Error("artifact filename is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
  return Object.freeze({
    artifact_id: safeResponseId(value.artifact_id, "artifact_id"),
    draft_id: safeResponseId(value.draft_id, "draft_id"),
    document_id: safeResponseId(value.document_id, "document_id"),
    version_id: safeResponseId(value.version_id, "version_id"),
    file_object_id: safeResponseId(value.file_object_id, "file_object_id"),
    filename,
    mime_type: safeString(value.mime_type, "mime_type", 128),
    byte_size: safeNumber(value.byte_size, "byte_size"),
    sha256: safeDigest(value.sha256, "sha256"),
    generator_version: safeGeneratorVersion(value.generator_version),
    template_id: safeResponseId(value.template_id, "template_id"),
    template_version: safeResponseId(value.template_version, "template_version"),
    template_hash: safeDigest(value.template_hash, "template_hash"),
    input_hash: safeDigest(value.input_hash, "input_hash"),
    approval_receipt_id: safeResponseId(value.approval_receipt_id, "approval_receipt_id"),
    status: "finalized",
    immutable: true,
    signer_snapshot_count: safeNumber(value.signer_snapshot_count, "signer_snapshot_count"),
    document_bytes_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    raw_storage_path_included: false,
  });
}

function deriveAuthority({ principal, context, matterRuntime, matterId, authorizationChecks }) {
  const tenantId = requiredText(principal?.tenant_id, "principal.tenant_id", 128);
  const actorId = requiredText(principal?.user_id ?? principal?.actor_id, "principal.actor_id", 160);
  if (context?.principal?.tenant_id !== tenantId || (context.principal.user_id ?? context.principal.actor_id) !== actorId) {
    throw Object.assign(new Error("signed principal mismatch"), { status: 403, safe_error_code: "OUTLOOK_DOCUMENT_SESSION_MISMATCH" });
  }
  for (const check of authorizationChecks) {
    const decision = evaluateRouteDecision({
      context,
      action: check.action,
      resource: {
        tenant_id: tenantId,
        resource_type: check.resource_type,
        resource_id: check.resource_id ?? matterId,
        matter_id: matterId,
      },
    });
    if (decision.effect !== "allow") {
      throw Object.assign(new Error("Matter access denied"), { status: 403, safe_error_code: "OUTLOOK_DOCUMENT_MATTER_ACCESS_DENIED" });
    }
  }
  if (!matterRuntime?.repository?.get) {
    throw Object.assign(new Error("Matter runtime is unavailable"), { status: 503, safe_error_code: "OUTLOOK_DOCUMENT_BUILDER_UNAVAILABLE" });
  }
  const matter = matterRuntime.repository.get({ tenant_id: tenantId, model_type: "Matter", matter_id: matterId });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    throw Object.assign(new Error("Matter not found"), { status: 404, safe_error_code: "OUTLOOK_DOCUMENT_MATTER_NOT_FOUND" });
  }
  let permissionRef;
  let auditHintRef;
  try {
    permissionRef = requiredText(matter.permission_envelope_id, "Matter permission authority", 256);
    auditHintRef = requiredText(matter.audit_trace_id, "Matter audit authority", 256);
  } catch {
    throw Object.assign(new Error("Matter authority is unavailable"), {
      status: 503,
      safe_error_code: "OUTLOOK_DOCUMENT_AUTHORITY_UNAVAILABLE",
    });
  }
  return Object.freeze({
    tenant_id: tenantId,
    actor_id: actorId,
    matter_id: matterId,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
  });
}

function matterQuery(authority) {
  return Object.freeze({
    tenant_id: authority.tenant_id,
    permission_ref: authority.permission_ref,
    audit_hint_ref: authority.audit_hint_ref,
  });
}

function matterBody(authority, extra) {
  return Object.freeze({ ...matterQuery(authority), ...extra });
}

function derivedIntent(authority, idempotencyKey) {
  const digest = createHash("sha256")
    .update("outlook-document-intent-v1\0")
    .update(authority.tenant_id)
    .update("\0")
    .update(authority.actor_id)
    .update("\0")
    .update(authority.matter_id)
    .update("\0")
    .update(idempotencyKey)
    .digest("hex");
  return Object.freeze({
    draft_id: `builder_draft_outlook_${digest.slice(0, 32)}`,
    create_key: `outlook.document.create:${digest}`,
    approval_key: `outlook.document.approval:${digest}`,
  });
}

function parseMergeData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 64) {
    throw Object.assign(new TypeError("merge_data is invalid"), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
  }
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    const field = safeId(key, "merge_data field", 128);
    return [field, requiredText(entry, `merge_data.${field}`, 500)];
  })));
}

function parseSignerRoleRefs(value) {
  if (!Array.isArray(value) || value.length > 32) {
    throw Object.assign(new TypeError("signer_role_refs is invalid"), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
  }
  const seen = new Set();
  return Object.freeze(value.map((entry) => {
    if (!exactObject(entry, ["role_id", "party_ref"])) {
      throw Object.assign(new TypeError("signer_role_ref is invalid"), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
    }
    const roleId = safeId(entry.role_id, "role_id", 128);
    if (seen.has(roleId)) throw Object.assign(new TypeError("duplicate signer role"), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
    seen.add(roleId);
    return Object.freeze({ role_id: roleId, party_ref: safeId(entry.party_ref, "party_ref", 256) });
  }));
}

function validateApprovalBody(body) {
  const fields = ["matter_id", "template_id", "template_version", "title", "merge_data", "signer_role_refs", "idempotency_key", "explicit_human_action"];
  if (!exactObject(body, fields) || body.explicit_human_action !== true) {
    throw Object.assign(new TypeError("approval request body is invalid"), {
      safe_error_code: body?.explicit_human_action === false ? "OUTLOOK_DOCUMENT_EXPLICIT_ACTION_REQUIRED" : "OUTLOOK_DOCUMENT_REQUEST_INVALID",
    });
  }
  return Object.freeze({
    matter_id: safeId(body.matter_id, "matter_id", 128),
    template_id: safeId(body.template_id, "template_id", 128),
    template_version: safeId(body.template_version, "template_version", 128),
    title: requiredText(body.title, "title", 240),
    merge_data: parseMergeData(body.merge_data),
    signer_role_refs: parseSignerRoleRefs(body.signer_role_refs),
    idempotency_key: requiredText(body.idempotency_key, "idempotency_key", 200),
  });
}

function validatePublishBody(body) {
  const fields = ["matter_id", "idempotency_key", "explicit_human_action"];
  if (!exactObject(body, fields) || body.explicit_human_action !== true) {
    throw Object.assign(new TypeError("publish request body is invalid"), {
      safe_error_code: body?.explicit_human_action === false ? "OUTLOOK_DOCUMENT_EXPLICIT_ACTION_REQUIRED" : "OUTLOOK_DOCUMENT_REQUEST_INVALID",
    });
  }
  return Object.freeze({
    matter_id: safeId(body.matter_id, "matter_id", 128),
    idempotency_key: requiredText(body.idempotency_key, "idempotency_key", 200),
  });
}

async function readDocuments({ query, queryPairs, body, context, principal, requestId, matterRuntime, docusignRuntime }) {
  if (!exactQuery(query, queryPairs, ["matter_id"]) || !exactObject(body, [])) {
    return blocked(400, requestId, ["OUTLOOK_DOCUMENT_REQUEST_INVALID"]);
  }
  let matterId;
  let authority;
  try {
    matterId = safeId(query.matter_id, "matter_id", 128);
    authority = deriveAuthority({
      principal,
      context,
      matterRuntime,
      matterId,
      authorizationChecks: [
        { action: "matter:builder:templates:read", resource_type: "matter_document_template" },
        { action: "matter:builder:approval:read", resource_type: "matter_builder_approval" },
      ],
    });
  } catch (error) {
    return requestError(error, requestId);
  }
  let templatesResult;
  let approvalsResult;
  try {
    const serverQuery = matterQuery(authority);
    [templatesResult, approvalsResult] = await Promise.all([
      handleMatterApiRequest({ pathname: `/api/matters/${encodeURIComponent(matterId)}/document-templates`, method: "GET", query: serverQuery, context, requestId, runtime: matterRuntime }),
      handleMatterApiRequest({ pathname: `/api/matters/${encodeURIComponent(matterId)}/builder-approval-requests`, method: "GET", query: serverQuery, context, requestId, runtime: matterRuntime }),
    ]);
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_BUILDER_UNAVAILABLE"]);
  }
  if (templatesResult.status !== 200) return canonicalFailure(templatesResult, requestId, "OUTLOOK_DOCUMENT_TEMPLATE_READ_BLOCKED");
  if (approvalsResult.status !== 200) return canonicalFailure(approvalsResult, requestId, "OUTLOOK_DOCUMENT_APPROVAL_READ_BLOCKED");

  let templates;
  let approvals;
  try {
    templates = bounded(templatesResult.body.items, projectTemplate, (item) => `${item.template_id}\0${item.template_version}`);
    approvals = bounded(approvalsResult.body.items, (item) => projectApproval(item, matterId), (item) => item.approval_request_id, { descending: true });
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
  }

  let esignRequests = Object.freeze([]);
  let esignReady = false;
  let esignCode = null;
  let esignResult = null;
  let esignRuntimeReady = true;
  let readinessDeclared = false;
  try {
    readinessDeclared = docusignRuntime != null && Reflect.has(docusignRuntime, "readiness");
  } catch {
    readinessDeclared = true;
    esignRuntimeReady = false;
  }
  if (readinessDeclared && esignRuntimeReady) {
    try {
      const readiness = docusignRuntime.readiness;
      const runtimeReadiness = typeof readiness === "function" ? readiness.call(docusignRuntime) : null;
      esignRuntimeReady = typeof readiness === "function"
        && runtimeReadiness?.status === "ready"
        && runtimeReadiness.authority_state === "ready";
    } catch {
      esignRuntimeReady = false;
    }
  }
  if (!esignRuntimeReady) {
    esignCode = "OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE";
  } else {
    try {
      esignResult = await handleDocusignOutlookRead({
        method: "GET",
        pathname: "/api/outlook/esign-requests",
        query: { matter_id: matterId },
        principal,
        requestId,
        runtime: docusignRuntime,
      });
    } catch (error) {
      if (error?.status === 403) {
        return blocked(403, requestId, [typeof error.safe_error_code === "string" && /^[A-Z0-9_]+$/u.test(error.safe_error_code)
          ? error.safe_error_code
          : "OUTLOOK_DOCUMENT_ESIGN_READ_BLOCKED"]);
      }
      esignCode = "OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE";
    }
  }
  if (esignRuntimeReady && esignResult) {
    if (esignResult.status === 200) {
      try {
        esignRequests = bounded(esignResult.body.items, (item) => projectDocusignRequest(item, matterId), (item) => item.request_id);
        esignReady = true;
      } catch {
        esignCode = "OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID";
      }
    } else if (esignResult.status === 503) {
      esignCode = "OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE";
    } else {
      return canonicalFailure(esignResult, requestId, "OUTLOOK_DOCUMENT_ESIGN_READ_BLOCKED");
    }
  }

  return response(200, {
    request_id: requestId,
    outcome: "passed",
    matter_id: matterId,
    templates,
    approval_requests: approvals,
    esign_requests: esignRequests,
    readiness: Object.freeze({ authoritative: true, builder_ready: true, esign_ready: esignReady }),
    safe_error_codes: Object.freeze(esignCode ? [esignCode] : []),
    count_leak_prevented: true,
    production_ready_claim: false,
  });
}

async function requestApproval({ query, queryPairs, body, context, principal, requestId, matterRuntime }) {
  if (!exactQuery(query, queryPairs, [])) return blocked(400, requestId, ["OUTLOOK_DOCUMENT_REQUEST_INVALID"]);
  let input;
  let authority;
  try {
    input = validateApprovalBody(body);
    authority = deriveAuthority({
      principal,
      context,
      matterRuntime,
      matterId: input.matter_id,
      authorizationChecks: [
        { action: "matter:builder:draft:create", resource_type: "matter_builder_draft" },
        { action: "matter:builder:approval:request", resource_type: "matter_builder_approval" },
      ],
    });
  } catch (error) {
    return requestError(error, requestId);
  }
  const intent = derivedIntent(authority, input.idempotency_key);
  let created;
  try {
    created = await handleMatterApiRequest({
      pathname: `/api/matters/${encodeURIComponent(input.matter_id)}/builder-drafts`,
      method: "POST",
      body: matterBody(authority, {
        idempotency_key: intent.create_key,
        draft: Object.freeze({
          draft_id: intent.draft_id,
          template_id: input.template_id,
          template_version: input.template_version,
          title: input.title,
          merge_data: input.merge_data,
          signer_role_refs: input.signer_role_refs,
        }),
      }),
      context,
      requestId,
      runtime: matterRuntime,
    });
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_BUILDER_UNAVAILABLE"]);
  }
  if (![200, 201].includes(created.status)) return canonicalFailure(created, requestId, "OUTLOOK_DOCUMENT_DRAFT_CREATE_BLOCKED");
  let createdDraft;
  let draftReplayed;
  try {
    draftReplayed = created.body?.outcome === "idempotent_replay";
    if (!["created", "idempotent_replay"].includes(created.body?.outcome)
      || created.body?.idempotent_replay !== draftReplayed) {
      throw Object.assign(new Error("draft-create outcome is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
    createdDraft = projectDraft(created.body.item, input.matter_id, intent.draft_id);
    const approvedTemplate = readApprovedTemplateVersion(matterRuntime.repository, {
      tenant_id: authority.tenant_id,
      template_id: input.template_id,
      template_version: input.template_version,
    });
    const canonicalInput = canonicalDraftData({
      tenantId: authority.tenant_id,
      matterId: input.matter_id,
      draftId: intent.draft_id,
      title: input.title,
      template: approvedTemplate,
      mergeData: input.merge_data,
      signerRoleRefs: input.signer_role_refs,
    });
    assertBinding(createdDraft, {
      matter_id: input.matter_id,
      draft_id: intent.draft_id,
      template_id: input.template_id,
      template_version: input.template_version,
      template_hash: approvedTemplate.template_hash,
      input_fingerprint: canonicalInput.input_fingerprint,
      title: input.title,
      merge_field_count: Object.keys(canonicalInput.merge_data).length,
      signer_role_count: canonicalInput.signer_role_refs.length,
    }, ["matter_id", "draft_id", "template_id", "template_version", "template_hash", "input_fingerprint", "title", "merge_field_count", "signer_role_count"]);
    if (createdDraft.status !== "draft" || createdDraft.approval_state !== "approval_required"
      || createdDraft.publish_state !== "owner_blocked" || createdDraft.immutable) {
      throw Object.assign(new Error("created draft state is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
  }

  let approval;
  try {
    approval = await handleMatterApiRequest({
      pathname: `/api/matters/${encodeURIComponent(input.matter_id)}/builder-drafts/${encodeURIComponent(intent.draft_id)}/approval-requests`,
      method: "POST",
      body: matterBody(authority, { idempotency_key: intent.approval_key }),
      context,
      requestId,
      runtime: matterRuntime,
    });
  } catch {
    return response(503, {
      request_id: requestId,
      outcome: "partial",
      matter_id: input.matter_id,
      draft: createdDraft,
      approval_request: null,
      partial: true,
      draft_replayed: draftReplayed,
      approval_replayed: false,
      safe_error_codes: Object.freeze(["OUTLOOK_DOCUMENT_APPROVAL_UNAVAILABLE"]),
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  }
  if (approval.status !== 200) {
    return response([400, 401, 403, 404, 409, 503].includes(approval.status) ? approval.status : 503, {
      request_id: requestId,
      outcome: "partial",
      matter_id: input.matter_id,
      draft: createdDraft,
      approval_request: null,
      partial: true,
      draft_replayed: draftReplayed,
      approval_replayed: false,
      safe_error_codes: canonicalCodes(approval, "OUTLOOK_DOCUMENT_APPROVAL_BLOCKED"),
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  }
  try {
    const approvalReplayed = approval.body?.outcome === "idempotent_replay";
    if (!["approval_required", "idempotent_replay"].includes(approval.body?.outcome)
      || approval.body?.idempotent_replay !== approvalReplayed || (approvalReplayed && !draftReplayed)) {
      throw Object.assign(new Error("approval outcome is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
    const approvalDraft = projectDraft(approval.body.item, input.matter_id, intent.draft_id);
    const approvalRequest = projectApproval(approval.body.approval_request, input.matter_id, intent.draft_id);
    const responseReceipt = projectApprovalReceipt(approval.body.approval_receipt);
    assertBinding(approvalDraft, createdDraft, DRAFT_IDENTITY_FIELDS);
    assertBinding(approvalRequest, approvalDraft, DRAFT_IDENTITY_FIELDS);
    const authoritativeDraft = matterRuntime.repository.get({
      tenant_id: authority.tenant_id,
      model_type: "MatterBuilderDraft",
      resource_id: intent.draft_id,
    });
    const authoritativeApproval = matterRuntime.repository.get({
      tenant_id: authority.tenant_id,
      model_type: "MatterBuilderApprovalRequest",
      resource_id: approvalRequest.approval_request_id,
    });
    assertBinding(authoritativeDraft, approvalDraft, DRAFT_CHAIN_FIELDS);
    if (approvalDraft.title !== createdDraft.title || approvalDraft.merge_field_count !== createdDraft.merge_field_count
      || approvalDraft.signer_role_count !== createdDraft.signer_role_count
      || approvalDraft.status !== "ready_for_review" || approvalDraft.approval_state !== "approval_required"
      || approvalDraft.publish_state !== "owner_blocked" || approvalDraft.immutable
      || approvalRequest.status !== "pending_owner_approval" || approvalRequest.decision != null
      || approvalRequest.approval_receipt != null || responseReceipt != null
      || authoritativeDraft?.approval_request_id !== approvalRequest.approval_request_id
      || authoritativeDraft?.approval_receipt != null
      || authoritativeApproval?.resource_id !== approvalRequest.approval_request_id
      || authoritativeApproval?.approval_request_id !== approvalRequest.approval_request_id
      || authoritativeApproval?.draft_id !== approvalDraft.draft_id
      || authoritativeApproval?.matter_id !== approvalDraft.matter_id
      || authoritativeApproval?.template_id !== approvalDraft.template_id
      || authoritativeApproval?.template_version !== approvalDraft.template_version
      || authoritativeApproval?.template_hash !== approvalDraft.template_hash
      || authoritativeApproval?.input_fingerprint !== approvalDraft.input_fingerprint
      || authoritativeApproval?.status !== approvalRequest.status
      || (authoritativeApproval?.decision ?? null) !== approvalRequest.decision
      || authoritativeApproval?.reviewer_role !== approvalRequest.reviewer_role
      || authoritativeApproval?.approval_receipt != null) {
      throw Object.assign(new Error("approval response chain is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
    return response(200, {
      request_id: requestId,
      outcome: approval.body.outcome,
      matter_id: input.matter_id,
      draft: approvalDraft,
      approval_request: approvalRequest,
      partial: false,
      draft_replayed: draftReplayed,
      approval_replayed: approvalReplayed,
      safe_error_codes: Object.freeze([]),
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
  }
}

async function publishDocument({ pathname, query, queryPairs, body, context, principal, requestId, matterRuntime }) {
  if (!exactQuery(query, queryPairs, [])) return blocked(400, requestId, ["OUTLOOK_DOCUMENT_REQUEST_INVALID"]);
  let input;
  let draftId;
  let authority;
  try {
    input = validatePublishBody(body);
    const match = pathname.match(OUTLOOK_DOCUMENT_PUBLISH_PATH);
    if (!match) throw Object.assign(new TypeError("publish route is invalid"), { safe_error_code: "OUTLOOK_DOCUMENT_REQUEST_INVALID" });
    draftId = safeId(decodeURIComponent(match[1]), "draft_id", 128);
    authority = deriveAuthority({
      principal,
      context,
      matterRuntime,
      matterId: input.matter_id,
      authorizationChecks: [{ action: "matter:builder:publish", resource_type: "matter_builder_publish", resource_id: draftId }],
    });
  } catch (error) {
    return requestError(error, requestId);
  }
  let published;
  try {
    published = await handleMatterApiRequest({
      pathname: `/api/matters/${encodeURIComponent(input.matter_id)}/builder-drafts/${encodeURIComponent(draftId)}/publish-to-vault`,
      method: "POST",
      body: matterBody(authority, { idempotency_key: input.idempotency_key }),
      context,
      requestId,
      runtime: matterRuntime,
    });
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_BUILDER_UNAVAILABLE"]);
  }
  if (published.status !== 200) {
    const partial = published.body?.ui_state === "reconciliation_required"
      || canonicalCodes(published, "OUTLOOK_DOCUMENT_PUBLISH_BLOCKED").includes("MATTER_PUBLICATION_RECONCILIATION_REQUIRED");
    return response([400, 401, 403, 404, 409, 503].includes(published.status) ? published.status : 503, {
      request_id: requestId,
      outcome: partial ? "reconciliation_required" : "blocked",
      matter_id: input.matter_id,
      draft: null,
      artifact: null,
      canonical_document_ref: null,
      partial,
      idempotent_replay: false,
      safe_error_codes: canonicalCodes(published, "OUTLOOK_DOCUMENT_PUBLISH_BLOCKED"),
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  }
  try {
    const publishedReplayed = published.body?.outcome === "idempotent_replay";
    if (!["created", "idempotent_replay"].includes(published.body?.outcome)
      || published.body?.idempotent_replay !== publishedReplayed) {
      throw Object.assign(new Error("published outcome is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
    const draft = projectDraft(published.body.item, input.matter_id, draftId);
    const artifact = projectArtifact(published.body.artifact, draftId);
    const approvalReceipt = projectApprovalReceipt(published.body.approval_receipt);
    if (artifact) {
      assertBinding(artifact, draft, ["draft_id", "template_id", "template_version", "template_hash"]);
      const authoritativeDraft = matterRuntime.repository.get({
        tenant_id: authority.tenant_id,
        model_type: "MatterBuilderDraft",
        resource_id: draftId,
      });
      const authoritativeApproval = matterRuntime.repository.get({
        tenant_id: authority.tenant_id,
        model_type: "MatterBuilderApprovalRequest",
        resource_id: approvalReceipt?.approval_request_id,
      });
      assertBinding(authoritativeDraft, draft, DRAFT_CHAIN_FIELDS);
      assertBinding(authoritativeApproval, draft, DRAFT_IDENTITY_FIELDS);
      assertBinding(authoritativeDraft?.approval_receipt, approvalReceipt, RECEIPT_FIELDS);
      assertBinding(authoritativeApproval?.approval_receipt, approvalReceipt, RECEIPT_FIELDS);
      if (!approvalReceipt || draft.status !== "finalized" || draft.approval_state !== "approved"
        || draft.publish_state !== "complete" || !draft.immutable
        || authoritativeDraft?.approval_request_id !== approvalReceipt.approval_request_id
        || authoritativeApproval?.resource_id !== approvalReceipt.approval_request_id
        || authoritativeApproval?.approval_request_id !== approvalReceipt.approval_request_id
        || authoritativeApproval?.status !== "approved" || authoritativeApproval?.decision !== "approved"
        || approvalReceipt.input_fingerprint !== draft.input_fingerprint
        || approvalReceipt.template_hash !== draft.template_hash
        || artifact.input_hash !== approvalReceipt.input_hash
        || artifact.approval_receipt_id !== approvalReceipt.receipt_id
        || artifact.signer_snapshot_count !== draft.signer_role_count) {
        throw Object.assign(new Error("published document chain is unsafe"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
      }
      const expectedReceipt = {
        approvalId: approvalReceipt.approval_request_id,
        approvedAt: authoritativeApproval.decision_at,
        approvedByRef: authoritativeApproval.decision_by,
        inputFingerprint: draft.input_fingerprint,
        inputHash: artifact.input_hash,
        receiptId: approvalReceipt.receipt_id,
        templateHash: draft.template_hash,
      };
      validateBuilderApprovalReceipt(authoritativeDraft.approval_receipt, expectedReceipt);
      validateBuilderApprovalReceipt(authoritativeApproval.approval_receipt, expectedReceipt);
    } else if (approvalReceipt) {
      throw Object.assign(new Error("published receipt has no artifact"), { safe_error_code: "OUTLOOK_DOCUMENT_RESPONSE_INVALID" });
    }
    return response(200, {
      request_id: requestId,
      outcome: published.body.outcome,
      matter_id: input.matter_id,
      draft,
      artifact,
      canonical_document_ref: artifact
        ? `matter://${input.matter_id}/documents/${artifact.document_id}/versions/${artifact.version_id}`
        : null,
      partial: false,
      idempotent_replay: publishedReplayed,
      safe_error_codes: Object.freeze([]),
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  } catch {
    return blocked(503, requestId, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
  }
}

export function isOutlookDocumentApiPath(pathname) {
  return pathname === OUTLOOK_DOCUMENTS_PATH
    || pathname === OUTLOOK_DOCUMENT_APPROVAL_REQUESTS_PATH
    || OUTLOOK_DOCUMENT_PUBLISH_PATH.test(pathname);
}

export async function handleOutlookDocumentApiRequest({
  pathname,
  method,
  query = {},
  queryPairs,
  body = {},
  context,
  principal,
  requestId,
  matterRuntime,
  docusignRuntime,
} = {}) {
  const verb = String(method ?? "").toUpperCase();
  if (pathname === OUTLOOK_DOCUMENTS_PATH && verb === "GET") {
    return readDocuments({ query, queryPairs, body, context, principal, requestId, matterRuntime, docusignRuntime });
  }
  if (pathname === OUTLOOK_DOCUMENT_APPROVAL_REQUESTS_PATH && verb === "POST") {
    return requestApproval({ query, queryPairs, body, context, principal, requestId, matterRuntime });
  }
  if (OUTLOOK_DOCUMENT_PUBLISH_PATH.test(pathname) && verb === "POST") {
    return publishDocument({ pathname, query, queryPairs, body, context, principal, requestId, matterRuntime });
  }
  return blocked(isOutlookDocumentApiPath(pathname) ? 405 : 404, requestId, [
    isOutlookDocumentApiPath(pathname) ? "OUTLOOK_DOCUMENT_METHOD_NOT_ALLOWED" : "OUTLOOK_DOCUMENT_ROUTE_NOT_FOUND",
  ]);
}
