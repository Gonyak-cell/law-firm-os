import { createOutlookIntentIdempotencyKey } from "./outlook-editable-action-state.js";

export const OUTLOOK_DOCUMENTS_PATH = "/api/outlook/documents";
export const OUTLOOK_ESIGN_REQUESTS_PATH = "/api/outlook/esign-requests";

const fields = (value) => value.split(",");
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const GENERATOR_VERSION = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,31})?$/u;
const GENERATOR_VERSION_FORBIDDEN = /(?:^|[_:.\/-])(?:access(?:[_-]?token)?|account(?:[_-]?id)?|actor(?:[_-]?id)?|api[_-]?key|audit(?:[_-]?(?:hint|trace)(?:[_-]?ref|[_-]?id)?)?|authority|client[_-]?secret|connection(?:[_-]?id)?|credential|document[_-]?bytes|envelope(?:[_-]?id)?|internal|password|permission(?:[_-]?(?:envelope|ref|id))?|private|provider(?:[_-]?(?:payload|credentials?))?|raw(?:[_-]?(?:body|contact|payload|storage|template))?|refresh[_-]?token|secret|storage(?:[_-]?(?:path|pointer|key))?|tenant(?:[_-]?id)?|token)(?:$|[_:.\/-])/iu;
const SHA = /^[a-f0-9]{64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const CODE = /^[A-Z][A-Z0-9_.:-]{0,127}$/u;
const FORBIDDEN = new Set("actor_id actorId tenant_id tenantId permission_ref audit_hint_ref audit_hint access_token refresh_token token secret password raw_body email_body document_bytes content_base64 attachment_bytes storage_pointer storage_path object_key local_path provider_payload provider_credentials envelope_id account_id base_uri permission_envelope_id audit_trace_id requested_by_actor_id".split(" "));
const TEMPLATE_FIELDS = fields("template_id,template_version,template_hash,label,category,merge_field_count,merge_fields,signer_roles,requires_approval,approval_receipt_present,raw_template_body_included,raw_contact_values_included,production_ready_claim");
const DRAFT_FIELDS = fields("draft_id,matter_id,template_id,template_version,template_hash,input_fingerprint,title,status,safe_excerpt,merge_field_count,signer_role_count,approval_state,publish_state,immutable,raw_body_included,raw_template_body_included,raw_contact_values_included,document_bytes_included,production_ready_claim");
const APPROVAL_FIELDS = fields("approval_request_id,draft_id,matter_id,status,decision,reviewer_role,input_fingerprint,template_id,template_version,template_hash,approval_receipt,reviewer_user_ref_included,owner_approval_ref_included,raw_body_included,raw_contact_values_included,production_ready_claim");
const RECEIPT_FIELDS = fields("receipt_id,approval_request_id,approved_at,input_hash,input_fingerprint,template_hash,receipt_hash,approved_by_ref_included,raw_body_included,raw_contact_values_included");
const ARTIFACT_FIELDS = fields("artifact_id,draft_id,document_id,version_id,file_object_id,filename,mime_type,byte_size,sha256,generator_version,template_id,template_version,template_hash,input_hash,approval_receipt_id,status,immutable,signer_snapshot_count,document_bytes_included,raw_body_included,raw_contact_values_included,raw_storage_path_included");
const ESIGN_FIELDS = fields("request_id,matter_id,document,recipients,state,canonical_document_ref,can_send,can_reconcile,completion_artifacts,production_ready_claim");
const CATALOG_FIELDS = fields("request_id,outcome,matter_id,templates,approval_requests,esign_requests,readiness,safe_error_codes,count_leak_prevented,production_ready_claim");
const APPROVAL_RESPONSE_FIELDS = fields("request_id,outcome,matter_id,draft,approval_request,partial,draft_replayed,approval_replayed,safe_error_codes,count_leak_prevented,production_ready_claim");
const PUBLISH_RESPONSE_FIELDS = fields("request_id,outcome,matter_id,draft,artifact,canonical_document_ref,partial,idempotent_replay,safe_error_codes,count_leak_prevented,production_ready_claim");
const ESIGN_ACTION_FIELDS = fields("request_id,outcome,item,safe_error_codes,production_ready_claim");
const PARTIAL_RESPONSE_STATUSES = new Set([400, 401, 403, 404, 409, 413, 503]);
const DRAFT_STATES = new Set(["draft", "ready_for_review", "approved", "finalized"]);
const APPROVAL_STATES = new Set(["pending_owner_approval", "approved", "rejected"]);
const PUBLISH_STATES = new Set(["owner_blocked", "approved_unpublished", "complete"]);
const ESIGN_STATES = new Set(["draft", "review_required", "approved", "provider_pending", "draft_created", "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided", "reconciliation_required", "provider_blocked"]);
const APPROVAL_SUCCESS_OUTCOMES = new Set(["approval_required", "idempotent_replay"]);
const APPROVAL_PARTIAL_OUTCOMES = new Set(["partial"]);
const PUBLISH_SUCCESS_OUTCOMES = new Set(["created", "idempotent_replay"]);
const PUBLISH_PARTIAL_OUTCOMES = new Set(["reconciliation_required"]);
const SEND_OUTCOMES = new Set(["sent", "in_progress", "replayed"]);
const RECONCILE_OUTCOMES = new Set(["reconciled", "already_converged", "in_progress"]);
const ACTION_OUTCOMES = new Set([...SEND_OUTCOMES, ...RECONCILE_OUTCOMES]);
const SEND_STATES = new Set(["sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided", "provider_blocked"]);
const RECONCILE_STATES = new Set(["draft_created", "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided", "provider_blocked"]);
const SEND_ACTION_STATES = Object.freeze({
  sent: new Set(["sent"]),
  in_progress: new Set(["provider_pending"]),
  replayed: SEND_STATES,
});
const RECONCILE_ACTION_STATES = Object.freeze({
  reconciled: RECONCILE_STATES,
  already_converged: RECONCILE_STATES,
  in_progress: new Set(["reconciliation_required"]),
});
const GENERIC_ACTION_STATES = Object.freeze({
  sent: SEND_ACTION_STATES.sent,
  in_progress: new Set(["provider_pending", "reconciliation_required"]),
  replayed: SEND_STATES,
  reconciled: RECONCILE_STATES,
  already_converged: RECONCILE_STATES,
});

function fail(message = "OUTLOOK_DOCUMENT_CONTRACT_INVALID", code = "OUTLOOK_DOCUMENT_CONTRACT_INVALID") {
  throw Object.assign(new TypeError(message), { safe_error_code: code });
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value, allowed, label) {
  if (!object(value) || Object.keys(value).length !== allowed.length || allowed.some((field) => !Object.hasOwn(value, field))) fail(`${label} fields are incomplete or unsafe`);
}
function only(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((field) => !allowed.includes(field))) fail(`${label} contains unsupported fields`, "OUTLOOK_DOCUMENT_REQUEST_INVALID");
}
function pick(value, allowed) {
  return Object.freeze(Object.fromEntries(allowed.map((field) => [field, value[field]])));
}
function text(value, field, max = 256) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) fail(`${field} is invalid`, "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  return value;
}
function id(value, field) {
  const result = text(value, field);
  if (!ID.test(result)) fail(`${field} is not a safe identifier`, "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  return result;
}
function generatorVersion(value) {
  const result = text(value, "generator_version", 256);
  if (!GENERATOR_VERSION.test(result) || GENERATOR_VERSION_FORBIDDEN.test(result)) fail("generator_version is invalid");
  return result;
}
function digest(value, field) {
  if (typeof value !== "string" || !SHA.test(value)) fail(`${field} is not a SHA-256 digest`);
  return value;
}
function instant(value, field) {
  if (typeof value !== "string" || !ISO.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${field} is not an ISO instant`);
  return value;
}
function safeCodes(value) {
  if (!Array.isArray(value) || value.length > 16 || value.some((code) => typeof code !== "string" || !CODE.test(code))) fail("safe_error_codes are invalid");
  return Object.freeze([...value]);
}
function responseBody(response) {
  if (!object(response)) return response;
  const hasBody = Object.hasOwn(response, "body");
  const hasPayload = Object.hasOwn(response, "payload");
  if (!hasBody && !hasPayload) return response;
  const errorPayload = response instanceof Error && hasPayload && !hasBody;
  if (hasBody && hasPayload || !errorPayload && Object.keys(response).some((key) => !["body", "payload", "status"].includes(key)) || !Number.isSafeInteger(response.status) || response.status < 200 || response.status > 599) fail();
  const body = hasBody ? response.body : response.payload;
  if (response.status > 299 && !(object(body) && ["partial", "reconciliation_required"].includes(body.outcome))) fail();
  return body;
}
function responseStatus(response) {
  return object(response) && (Object.hasOwn(response, "body") || Object.hasOwn(response, "payload")) ? response.status : undefined;
}
function scan(value, seen = new WeakSet()) {
  if (!object(value) && !Array.isArray(value)) return;
  if (seen.has(value)) fail("response evidence is cyclic");
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN.has(key) || (key.endsWith("_included") && child === true) || (key === "production_ready_claim" && child === true)) fail("response evidence is unsafe");
    scan(child, seen);
  }
}
function requestOptions(input, allowed, label) {
  only(input, allowed, label);
  if (allowed.some((field) => !Object.hasOwn(input, field))) fail(`${label} is incomplete`, "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  return input;
}
function mergeData(value) {
  if (!object(value) || Object.keys(value).length > 64 || Object.entries(value).some(([field, item]) => !ID.test(field) || typeof item !== "string" || item !== item.trim() || item.length > 500 || /[\u0000-\u001f\u007f]/u.test(item))) fail("merge_data is invalid", "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  return Object.freeze(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))));
}
function signerRefs(value) {
  if (!Array.isArray(value) || value.length > 32) fail("signer_role_refs is invalid", "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  const seen = new Set();
  return Object.freeze(
    value
      .map((entry) => {
        exact(entry, ["role_id", "party_ref"], "signer_role_ref");
        const role = id(entry.role_id, "role_id");
        if (seen.has(role)) fail("signer_role_refs contains a duplicate role", "OUTLOOK_DOCUMENT_REQUEST_INVALID");
        seen.add(role);
        return Object.freeze({ role_id: role, party_ref: id(entry.party_ref, "party_ref") });
      })
      .sort((left, right) => left.role_id.localeCompare(right.role_id)),
  );
}
function pathFor(matterId) {
  return `${OUTLOOK_DOCUMENTS_PATH}?matter_id=${encodeURIComponent(id(matterId, "matter_id"))}`;
}
function key(value) {
  return text(value, "idempotency_key", 256);
}

export function createOutlookDocumentCatalogRequest(input = {}) {
  requestOptions(input, ["matter_id"], "document catalog request");
  return Object.freeze({ method: "GET", path: pathFor(input.matter_id) });
}
export function createOutlookDocumentTemplatesRequest(input = {}) {
  return createOutlookDocumentCatalogRequest(input);
}
export function createOutlookDocumentApprovalListRequest(input = {}) {
  return createOutlookDocumentCatalogRequest(input);
}
export function createOutlookDocusignRequestListRequest(input = {}) {
  return createOutlookDocumentCatalogRequest(input);
}
export function createOutlookDocumentApprovalRequest(input = {}) {
  const allowed = ["matter_id", "template_id", "template_version", "title", "merge_data", "signer_role_refs", "idempotency_key"];
  requestOptions(input, allowed, "document approval request");
  return Object.freeze({
    method: "POST",
    path: `${OUTLOOK_DOCUMENTS_PATH}/approval-requests`,
    body: Object.freeze({
      matter_id: id(input.matter_id, "matter_id"),
      template_id: id(input.template_id, "template_id"),
      template_version: id(input.template_version, "template_version"),
      title: text(input.title, "title", 240),
      merge_data: mergeData(input.merge_data),
      signer_role_refs: signerRefs(input.signer_role_refs),
      idempotency_key: key(input.idempotency_key),
      explicit_human_action: true,
    }),
  });
}
export async function createOutlookDocumentApprovalIdempotencyKey(input, cryptoImpl = globalThis.crypto) {
  const value = requestOptions(input, ["matter_id", "template_id", "template_version", "template_hash", "title", "merge_data", "signer_role_refs"], "document approval intent");
  return createOutlookIntentIdempotencyKey(
    "outlook-document-approval",
    {
      matter_id: id(value.matter_id, "matter_id"),
      template_id: id(value.template_id, "template_id"),
      template_version: id(value.template_version, "template_version"),
      template_hash: digest(value.template_hash, "template_hash"),
      title: text(value.title, "title", 240),
      merge_data: mergeData(value.merge_data),
      signer_role_refs: signerRefs(value.signer_role_refs),
    },
    cryptoImpl,
  );
}
export function createOutlookDocumentPublishRequest(input = {}) {
  requestOptions(input, ["matter_id", "draft_id", "idempotency_key"], "document publish request");
  const matter = id(input.matter_id, "matter_id");
  const draft = id(input.draft_id, "draft_id");
  return Object.freeze({
    method: "POST",
    path: `${OUTLOOK_DOCUMENTS_PATH}/${encodeURIComponent(draft)}/publish`,
    body: Object.freeze({ matter_id: matter, idempotency_key: key(input.idempotency_key), explicit_human_action: true }),
  });
}
export async function createOutlookDocumentPublishIdempotencyKey(input, cryptoImpl = globalThis.crypto) {
  const value = requestOptions(input, ["matter_id", "draft_id"], "document publish intent");
  return createOutlookIntentIdempotencyKey("outlook-document-publish", { matter_id: id(value.matter_id, "matter_id"), draft_id: id(value.draft_id, "draft_id") }, cryptoImpl);
}
function docusignAction(input, action) {
  requestOptions(input, ["matter_id", "request_id", "idempotency_key"], `DocuSign ${action} request`);
  const matter = id(input.matter_id, "matter_id");
  const request = id(input.request_id, "request_id");
  return Object.freeze({
    method: "POST",
    path: `${OUTLOOK_ESIGN_REQUESTS_PATH}/${encodeURIComponent(request)}/${action}`,
    body: Object.freeze({ matter_id: matter, idempotency_key: key(input.idempotency_key), explicit_human_action: true }),
  });
}
export function createOutlookDocusignSendRequest(input = {}) {
  return docusignAction(input, "send");
}
export function createOutlookDocusignReconcileRequest(input = {}) {
  return docusignAction(input, "reconcile");
}
export async function createOutlookDocusignActionIdempotencyKey(input, cryptoImpl = globalThis.crypto) {
  const value = requestOptions(input, ["matter_id", "request_id", "action", "intent_id"], "DocuSign action intent");
  if (!["send", "reconcile"].includes(value.action)) fail("action is invalid", "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  return createOutlookIntentIdempotencyKey(`outlook-docusign-${value.action}`, { matter_id: id(value.matter_id, "matter_id"), request_id: id(value.request_id, "request_id"), action: value.action, intent_id: id(value.intent_id, "intent_id") }, cryptoImpl);
}

function template(value) {
  exact(value, TEMPLATE_FIELDS, "template");
  if (value.category !== "document" || value.requires_approval !== true || value.approval_receipt_present !== true || value.raw_template_body_included !== false || value.raw_contact_values_included !== false || value.production_ready_claim !== false || !Number.isSafeInteger(value.merge_field_count) || value.merge_field_count < 0 || !Array.isArray(value.merge_fields) || value.merge_field_count !== value.merge_fields.length || value.merge_fields.length > 64) fail();
  const identity = { template_id: id(value.template_id, "template_id"), template_version: id(value.template_version, "template_version"), template_hash: digest(value.template_hash, "template_hash"), label: text(value.label, "label", 240) };
  const mergeFields = value.merge_fields.map((field) => id(field, "merge_field"));
  if (new Set(mergeFields).size !== mergeFields.length || !Array.isArray(value.signer_roles) || value.signer_roles.length > 32) fail();
  const roles = value.signer_roles.map((role) => {
    exact(role, ["role_id", "required"], "signer_role");
    if (typeof role.required !== "boolean") fail();
    return Object.freeze({ role_id: id(role.role_id, "role_id"), required: role.required });
  });
  return pick({ ...value, ...identity, merge_fields: Object.freeze(mergeFields), signer_roles: Object.freeze(roles), category: "document", requires_approval: true, approval_receipt_present: true }, ["template_id", "template_version", "template_hash", "label", "category", "merge_field_count", "merge_fields", "signer_roles", "requires_approval", "approval_receipt_present"]);
}
function receipt(value) {
  if (value === null) return null;
  exact(value, RECEIPT_FIELDS, "approval_receipt");
  if (value.approved_by_ref_included !== false || value.raw_body_included !== false || value.raw_contact_values_included !== false) fail();
  return pick({ receipt_id: id(value.receipt_id, "receipt_id"), approval_request_id: id(value.approval_request_id, "approval_request_id"), approved_at: instant(value.approved_at, "approved_at"), input_hash: digest(value.input_hash, "input_hash"), input_fingerprint: digest(value.input_fingerprint, "input_fingerprint"), template_hash: digest(value.template_hash, "template_hash"), receipt_hash: digest(value.receipt_hash, "receipt_hash") }, ["receipt_id", "approval_request_id", "approved_at", "input_hash", "input_fingerprint", "template_hash", "receipt_hash"]);
}
function draft(value) {
  exact(value, DRAFT_FIELDS, "draft");
  if (!DRAFT_STATES.has(value.status) || !PUBLISH_STATES.has(value.publish_state) || !["approval_required", "approved", "rejected"].includes(value.approval_state) || typeof value.immutable !== "boolean" || value.raw_body_included !== false || value.raw_template_body_included !== false || value.raw_contact_values_included !== false || value.document_bytes_included !== false || value.production_ready_claim !== false || (value.safe_excerpt !== null && (typeof value.safe_excerpt !== "string" || !/^입력 본문 \d+자$/u.test(value.safe_excerpt))) || !Number.isSafeInteger(value.merge_field_count) || value.merge_field_count < 0 || !Number.isSafeInteger(value.signer_role_count) || value.signer_role_count < 0) fail();
  return pick({ ...value, draft_id: id(value.draft_id, "draft_id"), matter_id: id(value.matter_id, "matter_id"), template_id: id(value.template_id, "template_id"), template_version: id(value.template_version, "template_version"), template_hash: digest(value.template_hash, "template_hash"), input_fingerprint: digest(value.input_fingerprint, "input_fingerprint"), title: text(value.title, "title", 240) }, ["draft_id", "matter_id", "template_id", "template_version", "template_hash", "input_fingerprint", "title", "status", "safe_excerpt", "merge_field_count", "signer_role_count", "approval_state", "publish_state", "immutable"]);
}
function approval(value) {
  exact(value, APPROVAL_FIELDS, "approval_request");
  if (!APPROVAL_STATES.has(value.status) || (value.decision !== null && !["approved", "rejected"].includes(value.decision)) || value.reviewer_role !== "owner" || value.reviewer_user_ref_included !== false || value.owner_approval_ref_included !== false || value.raw_body_included !== false || value.raw_contact_values_included !== false || value.production_ready_claim !== false) fail();
  const result = { ...value, approval_request_id: id(value.approval_request_id, "approval_request_id"), draft_id: id(value.draft_id, "draft_id"), matter_id: id(value.matter_id, "matter_id"), input_fingerprint: digest(value.input_fingerprint, "input_fingerprint"), template_id: id(value.template_id, "template_id"), template_version: id(value.template_version, "template_version"), template_hash: digest(value.template_hash, "template_hash"), approval_receipt: receipt(value.approval_receipt) };
  if (result.approval_receipt && (result.approval_receipt.approval_request_id !== result.approval_request_id || result.approval_receipt.input_fingerprint !== result.input_fingerprint || result.approval_receipt.template_hash !== result.template_hash)) fail("approval receipt identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  const stateConsistent = result.status === "pending_owner_approval"
    ? result.decision === null && result.approval_receipt === null
    : result.status === "approved"
      ? result.decision === "approved" && result.approval_receipt !== null
      : result.decision === "rejected" && result.approval_receipt === null;
  if (!stateConsistent) fail("approval status and decision are inconsistent", "OUTLOOK_DOCUMENT_CONTRACT_INVALID");
  return pick(result, ["approval_request_id", "draft_id", "matter_id", "status", "decision", "reviewer_role", "input_fingerprint", "template_id", "template_version", "template_hash", "approval_receipt"]);
}
function artifact(value) {
  if (value === null) return null;
  exact(value, ARTIFACT_FIELDS, "artifact");
  if (value.status !== "finalized" || value.immutable !== true || value.document_bytes_included !== false || value.raw_body_included !== false || value.raw_contact_values_included !== false || value.raw_storage_path_included !== false || !Number.isSafeInteger(value.byte_size) || value.byte_size < 0 || !Number.isSafeInteger(value.signer_snapshot_count) || value.signer_snapshot_count < 0 || /[/\\\u0000-\u001f\u007f]/u.test(value.filename)) fail();
  return pick({ ...value, artifact_id: id(value.artifact_id, "artifact_id"), draft_id: id(value.draft_id, "draft_id"), document_id: id(value.document_id, "document_id"), version_id: id(value.version_id, "version_id"), file_object_id: id(value.file_object_id, "file_object_id"), filename: text(value.filename, "filename", 240), mime_type: text(value.mime_type, "mime_type", 128), sha256: digest(value.sha256, "sha256"), generator_version: generatorVersion(value.generator_version), template_id: id(value.template_id, "template_id"), template_version: id(value.template_version, "template_version"), template_hash: digest(value.template_hash, "template_hash"), input_hash: digest(value.input_hash, "input_hash"), approval_receipt_id: id(value.approval_receipt_id, "approval_receipt_id") }, ["artifact_id", "draft_id", "document_id", "version_id", "file_object_id", "filename", "mime_type", "byte_size", "sha256", "generator_version", "template_id", "template_version", "template_hash", "input_hash", "approval_receipt_id", "status", "immutable", "signer_snapshot_count"]);
}
function completion(value, label) {
  if (value === null) return null;
  exact(value, ["document_id", "version_id", "sha256", "immutable"], label);
  if (value.immutable !== true) fail();
  return Object.freeze({ document_id: id(value.document_id, `${label}.document_id`), version_id: id(value.version_id, `${label}.version_id`), sha256: digest(value.sha256, `${label}.sha256`), immutable: true });
}
function esign(value, matterId) {
  exact(value, ESIGN_FIELDS, "esign_request");
  const matter = id(matterId, "matter_id");
  if (value.matter_id !== matter) fail("eSign Matter identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  exact(value.document, ["document_id", "version_id", "sha256"], "esign.document");
  const document = pick({ document_id: id(value.document.document_id, "document_id"), version_id: id(value.document.version_id, "version_id"), sha256: digest(value.document.sha256, "sha256") }, ["document_id", "version_id", "sha256"]);
  if (!ESIGN_STATES.has(value.state) || typeof value.can_send !== "boolean" || typeof value.can_reconcile !== "boolean" || value.production_ready_claim !== false || value.canonical_document_ref !== `matter://${matter}/documents/${document.document_id}/versions/${document.version_id}`) fail();
  const completions = value.completion_artifacts === null ? null : (exact(value.completion_artifacts, ["signed_pdf", "certificate"], "completion_artifacts"), Object.freeze({ signed_pdf: completion(value.completion_artifacts.signed_pdf, "completion_artifacts.signed_pdf"), certificate: completion(value.completion_artifacts.certificate, "completion_artifacts.certificate") }));
  if (completions?.signed_pdf && completions.certificate && (completions.signed_pdf.document_id === completions.certificate.document_id || completions.signed_pdf.version_id === completions.certificate.version_id)) fail("eSign completion artifacts are not distinct immutable documents");
  const hasCompletionArtifact = completions?.signed_pdf !== null && completions?.signed_pdf !== undefined
    || completions?.certificate !== null && completions?.certificate !== undefined;
  if (value.state === "completed" && (!completions?.signed_pdf || !completions.certificate)) fail("completed eSign request lacks distinct immutable completion artifacts");
  if (value.state !== "completed" && value.state !== "completed_artifacts_pending" && hasCompletionArtifact) fail("eSign completion state is inconsistent");
  if (!Array.isArray(value.recipients) || !value.recipients.length || value.recipients.length > 32) fail();
  const recipients = value.recipients.map((item) => {
    exact(item, ["recipient_ref", "role", "routing_order"], "esign.recipient");
    if (!Number.isSafeInteger(item.routing_order) || item.routing_order < 1) fail();
    return Object.freeze({ recipient_ref: id(item.recipient_ref, "recipient_ref"), role: id(item.role, "role"), routing_order: item.routing_order });
  });
  if (new Set(recipients.map((item) => item.recipient_ref)).size !== recipients.length) fail();
  return Object.freeze({
    request_id: id(value.request_id, "request_id"),
    matter_id: matter,
    document,
    recipients: Object.freeze(recipients),
    state: value.state,
    canonical_document_ref: value.canonical_document_ref,
    can_send: value.can_send,
    can_reconcile: value.can_reconcile,
    completion_artifacts: completions,
  });
}
function sorted(value, parse, name, keyOf, descending = false) {
  if (!Array.isArray(value) || value.length > 50) fail(`${name} list is invalid`);
  const items = value.map(parse);
  for (let index = 1; index < items.length; index += 1) {
    const previous = keyOf(items[index - 1]);
    const current = keyOf(items[index]);
    if (descending ? previous <= current : previous >= current) fail(`${name} list is not stably sorted`);
  }
  return Object.freeze(items);
}
function bindMatter(value, matter) {
  if (value.matter_id !== matter) fail("Matter identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
}
function bindApprovalChain(draftValue, approvalValue) {
  if (!draftValue || !approvalValue) return;
  for (const field of ["matter_id", "draft_id", "template_id", "template_version", "template_hash", "input_fingerprint"]) {
    if (draftValue[field] !== approvalValue[field]) fail(`approval ${field} identity is mismatched`, "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
}
function actionStates(operation, outcome) {
  const table = operation === "send" ? SEND_ACTION_STATES : operation === "reconcile" ? RECONCILE_ACTION_STATES : GENERIC_ACTION_STATES;
  return table[outcome] ?? null;
}
function catalog(value, expectedMatter) {
  exact(value, CATALOG_FIELDS, "document catalog response");
  if (value.outcome !== "passed" || value.count_leak_prevented !== true || value.production_ready_claim !== false || !object(value.readiness) || Object.keys(value.readiness).length !== 3 || value.readiness.authoritative !== true || value.readiness.builder_ready !== true || typeof value.readiness.esign_ready !== "boolean") fail();
  const expected = object(expectedMatter) ? (expectedMatter.matter_id ?? expectedMatter.matterId) : expectedMatter;
  const matter = id(expected, "matter_id");
  if (value.matter_id !== matter) fail("catalog Matter identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  const templates = sorted(value.templates, template, "templates", (item) => `${item.template_id}\u0000${item.template_version}`);
  const approvals = sorted(
    value.approval_requests,
    (entry) => {
      const item = approval(entry);
      bindMatter(item, matter);
      return item;
    },
    "approval_requests",
    (item) => item.approval_request_id,
    true,
  );
  const esigns = sorted(
    value.esign_requests,
    (entry) => esign(entry, matter),
    "esign_requests",
    (item) => item.request_id,
  );
  const codes = safeCodes(value.safe_error_codes);
  if ((value.readiness.esign_ready && codes.length > 0) || (!value.readiness.esign_ready && (!codes.length || esigns.length))) fail("eSign readiness and safe_error_codes are mismatched");
  return pick(
    {
      ...value,
      templates,
      approval_requests: approvals,
      esign_requests: esigns,
      readiness: Object.freeze({ authoritative: true, builder_ready: true, esign_ready: value.readiness.esign_ready }),
      safe_error_codes: codes,
      matter_id: matter,
    },
    CATALOG_FIELDS,
  );
}
export function parseOutlookDocumentCatalogResponse(response, matterId) {
  const status = responseStatus(response);
  if (status !== undefined && status !== 200) fail();
  const body = responseBody(response);
  scan(body);
  return catalog(body, matterId);
}
export function parseOutlookDocumentTemplatesResponse(response, options = {}) {
  const value = parseOutlookDocumentCatalogResponse(response, options.matter_id ?? options.matterId ?? options);
  return value.templates;
}
export function parseOutlookDocumentApprovalListResponse(response, options = {}) {
  const value = parseOutlookDocumentCatalogResponse(response, options.matter_id ?? options.matterId ?? options);
  return value.approval_requests;
}
export function parseOutlookDocusignRequestListResponse(response, options = {}) {
  const value = parseOutlookDocumentCatalogResponse(response, options.matter_id ?? options.matterId ?? options);
  return value.esign_requests;
}
function approvalResponse(value, matter) {
  exact(value, APPROVAL_RESPONSE_FIELDS, "document approval response");
  const success = APPROVAL_SUCCESS_OUTCOMES.has(value.outcome);
  const partialOutcome = APPROVAL_PARTIAL_OUTCOMES.has(value.outcome);
  if ((!success && !partialOutcome) || value.partial !== partialOutcome || value.matter_id !== matter || typeof value.draft_replayed !== "boolean" || typeof value.approval_replayed !== "boolean" || value.count_leak_prevented !== true || value.production_ready_claim !== false) fail();
  const codes = safeCodes(value.safe_error_codes);
  if ((value.partial && !codes.length) || (!value.partial && codes.length)) fail("approval safe_error_codes are inconsistent");
  const item = value.draft === null ? null : draft(value.draft);
  const request = value.approval_request === null ? null : approval(value.approval_request);
  if (item) bindMatter(item, matter);
  if (request) bindMatter(request, matter);
  if (value.partial) {
    if (!item || request || item.status !== "draft" || item.approval_state !== "approval_required" || item.publish_state !== "owner_blocked" || item.immutable || value.approval_replayed) fail("partial approval response is inconsistent", "OUTLOOK_DOCUMENT_CONTRACT_INVALID");
  } else if (!item || !request) {
    fail("complete approval response is missing its draft or approval request", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  if (value.outcome === "approval_required"
    && (value.approval_replayed || ![false, true].includes(value.draft_replayed)
      || !item || !request || item.status !== "ready_for_review" || item.approval_state !== "approval_required"
      || item.publish_state !== "owner_blocked" || item.immutable || request.status !== "pending_owner_approval"
      || request.decision !== null || request.approval_receipt !== null)) {
    fail("approval-required response contains an inconsistent chain", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  if (value.outcome === "idempotent_replay"
    && (!value.draft_replayed || !value.approval_replayed || !item || !request || item.status !== "ready_for_review"
      || item.approval_state !== "approval_required" || item.publish_state !== "owner_blocked" || item.immutable
      || request.status !== "pending_owner_approval" || request.decision !== null || request.approval_receipt !== null)) {
    fail("approval replay response contains an inconsistent chain", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  bindApprovalChain(item, request);
  return pick({ ...value, draft: item, approval_request: request, matter_id: matter, safe_error_codes: codes }, APPROVAL_RESPONSE_FIELDS);
}
export function parseOutlookDocumentApprovalResponse(response, options = {}) {
  const matter = id(options.matter_id ?? options.matterId, "matter_id");
  const status = responseStatus(response);
  const body = responseBody(response);
  scan(body);
  const parsed = approvalResponse(body, matter);
  if (status !== undefined && (parsed.partial ? !PARTIAL_RESPONSE_STATUSES.has(status) : status !== 200)) fail();
  for (const [field, normalize] of [["template_id", (value) => id(value, "template_id")], ["template_version", (value) => id(value, "template_version")], ["title", (value) => text(value, "title", 240)], ["template_hash", (value) => digest(value, "template_hash")], ["input_fingerprint", (value) => digest(value, "input_fingerprint")]]) {
    if (options[field] === undefined) continue;
    const expected = normalize(options[field]);
    if ((parsed.draft && parsed.draft[field] !== expected) || (field !== "title" && parsed.approval_request && parsed.approval_request[field] !== expected)) fail(`approval ${field} identity is mismatched`, "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  if (options.draft_id !== undefined && parsed.draft && parsed.draft.draft_id !== id(options.draft_id, "draft_id")) fail("approval draft identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (options.draft_id !== undefined && parsed.approval_request && parsed.approval_request.draft_id !== id(options.draft_id, "draft_id")) fail("approval draft identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (options.approval_request_id !== undefined && parsed.approval_request && parsed.approval_request.approval_request_id !== id(options.approval_request_id, "approval_request_id")) fail("approval request identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  return parsed;
}
export function parseOutlookDocumentPublishResponse(response, options = {}) {
  const matter = id(options.matter_id ?? options.matterId, "matter_id");
  const expectedDraft = id(options.draft_id ?? options.draftId, "draft_id");
  const status = responseStatus(response);
  const body = responseBody(response);
  scan(body);
  exact(body, PUBLISH_RESPONSE_FIELDS, "document publish response");
  const success = PUBLISH_SUCCESS_OUTCOMES.has(body.outcome);
  const partialOutcome = PUBLISH_PARTIAL_OUTCOMES.has(body.outcome);
  if ((!success && !partialOutcome) || body.partial !== partialOutcome || body.matter_id !== matter || typeof body.idempotent_replay !== "boolean" || body.idempotent_replay !== (body.outcome === "idempotent_replay") || body.count_leak_prevented !== true || body.production_ready_claim !== false) fail();
  const codes = safeCodes(body.safe_error_codes);
  if ((body.partial && !codes.length) || (!body.partial && codes.length)) fail("publish safe_error_codes are inconsistent");
  const outputArtifact = artifact(body.artifact);
  const item = body.draft === null ? null : draft(body.draft);
  if (item && (bindMatter(item, matter), item.draft_id !== expectedDraft)) fail("publish draft identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (outputArtifact && outputArtifact.draft_id !== expectedDraft) fail("publish artifact identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (item && outputArtifact) {
    for (const field of ["template_id", "template_version", "template_hash"]) if (item[field] !== outputArtifact[field]) fail(`publish ${field} identity is mismatched`, "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  if (options.artifact_id !== undefined && outputArtifact && outputArtifact.artifact_id !== id(options.artifact_id, "artifact_id")) fail("publish artifact identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (options.approval_receipt_id !== undefined && outputArtifact && outputArtifact.approval_receipt_id !== id(options.approval_receipt_id, "approval_receipt_id")) fail("publish approval receipt identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  for (const [field, normalize] of [["template_id", (value) => id(value, "template_id")], ["template_version", (value) => id(value, "template_version")], ["template_hash", (value) => digest(value, "template_hash")], ["input_fingerprint", (value) => digest(value, "input_fingerprint")], ["input_hash", (value) => digest(value, "input_hash")]]) {
    if (options[field] === undefined) continue;
    const expected = normalize(options[field]);
    if ((item && ["template_id", "template_version", "template_hash", "input_fingerprint"].includes(field) && item[field] !== expected)
      || (outputArtifact && ["template_id", "template_version", "template_hash", "input_hash"].includes(field) && outputArtifact[field] !== expected)) fail(`publish ${field} identity is mismatched`, "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  }
  if (body.canonical_document_ref !== null && !outputArtifact) fail();
  const canonical = outputArtifact ? `matter://${matter}/documents/${outputArtifact.document_id}/versions/${outputArtifact.version_id}` : null;
  if (body.canonical_document_ref !== canonical || (!body.partial && (!item || !outputArtifact || !canonical || item.status !== "finalized" || item.approval_state !== "approved" || item.publish_state !== "complete" || item.immutable !== true))) fail("canonical document reference is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  if (body.partial && (item || outputArtifact || body.canonical_document_ref !== null || body.idempotent_replay)) fail("partial publish response is inconsistent", "OUTLOOK_DOCUMENT_CONTRACT_INVALID");
  if (!body.partial && ["template_id", "template_version", "template_hash", "input_fingerprint", "input_hash", "approval_receipt_id"].some((field) => options[field] === undefined)) fail("publish expected chain is incomplete", "OUTLOOK_DOCUMENT_REQUEST_INVALID");
  if (status !== undefined && (body.partial ? !PARTIAL_RESPONSE_STATUSES.has(status) : status !== 200)) fail();
  return pick({ ...body, matter_id: matter, draft: item, artifact: outputArtifact, safe_error_codes: codes }, PUBLISH_RESPONSE_FIELDS);
}
function parseDocusignActionResponse(response, options, operation = null) {
  const matter = id(options.matter_id ?? options.matterId, "matter_id");
  const expected = id(options.request_id ?? options.requestId, "request_id");
  const status = responseStatus(response);
  const body = responseBody(response);
  scan(body);
  exact(body, ESIGN_ACTION_FIELDS, "eSign action response");
  const outcomes = operation === "send" ? SEND_OUTCOMES : operation === "reconcile" ? RECONCILE_OUTCOMES : ACTION_OUTCOMES;
  if (!outcomes.has(body.outcome) || body.production_ready_claim !== false) fail();
  const item = esign(body.item, matter);
  if (item.request_id !== expected) fail("eSign request identity is mismatched", "OUTLOOK_DOCUMENT_IDENTITY_CONFLICT");
  const codes = safeCodes(body.safe_error_codes);
  const allowedStates = actionStates(operation, body.outcome);
  if (!allowedStates || !allowedStates.has(item.state)) fail("eSign action state is inconsistent", "OUTLOOK_DOCUMENT_CONTRACT_INVALID");
  if (codes.length !== 0) fail("eSign action safe_error_codes are inconsistent", "OUTLOOK_DOCUMENT_CONTRACT_INVALID");
  if (status !== undefined && (status <= 299 ? status !== (body.outcome === "in_progress" ? 202 : 200) : true)) fail();
  return pick({ ...body, item, safe_error_codes: codes }, ESIGN_ACTION_FIELDS);
}
export function parseOutlookDocusignActionResponse(response, options = {}) {
  return parseDocusignActionResponse(response, options);
}
export function parseOutlookDocusignSendResponse(response, options = {}) {
  return parseDocusignActionResponse(response, options, "send");
}
export function parseOutlookDocusignReconcileResponse(response, options = {}) {
  return parseDocusignActionResponse(response, options, "reconcile");
}
