import { createHash } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { DOCX_MIME_TYPE, normalizeDocusignConnection } from "./docusign-envelope-adapter.js";

export const DOCUSIGN_OUTBOX_SCHEMA_VERSION = "amic-os.docusign-envelope-outbox.v2";
export const DOCUSIGN_REQUEST_STATES = Object.freeze([
  "draft", "review_required", "approved", "provider_pending", "sent", "delivered",
  "completed_artifacts_pending", "completed", "declined", "voided",
  "reconciliation_required", "provider_blocked",
]);
export const DOCUSIGN_STABLE_STATES = new Set([
  "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided",
  "reconciliation_required", "provider_blocked",
]);
export const DOCUSIGN_INACTIVE_STATES = new Set(["completed", "declined", "voided", "provider_blocked"]);

export const cloneDocusignValue = (value) => value === undefined ? undefined : structuredClone(value);

export function docusignRequiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function docusignRequiredSha256(value, field) {
  const digest = docusignRequiredText(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return digest;
}

export function docusignTimestamp(value, field) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError(`${field} must be an ISO timestamp`);
  return timestamp.toISOString();
}

export function docusignNow(clock) {
  return docusignTimestamp(typeof clock === "function" ? clock() : clock ?? new Date(), "clock");
}

export function docusignFailure(code, message, status = 409, retryable = false) {
  return Object.assign(new Error(message), { safe_error_code: code, status, retryable });
}

export function docusignInfrastructureFailure(code = "DOCUSIGN_DEPENDENCY_UNAVAILABLE") {
  return docusignFailure(code, "DocuSign dependency is unavailable", 503, true);
}

export function docusignHash(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

export function normalizeDocusignPrincipal(input = {}) {
  return Object.freeze({
    tenant_id: docusignRequiredText(input.tenant_id, "principal.tenant_id"),
    actor_id: docusignRequiredText(input.actor_id ?? input.user_id, "principal.actor_id"),
  });
}

export function normalizeDocusignDocument(input = {}) {
  if (input.immutable !== true || input.finalized !== true || input.owner_approved !== true) {
    throw docusignFailure("DOCUSIGN_APPROVED_IMMUTABLE_DOCUMENT_REQUIRED", "Approved immutable document is required", 400);
  }
  if (input.mime_type !== DOCX_MIME_TYPE) throw docusignFailure("DOCUSIGN_DOCX_REQUIRED", "DocuSign source document must be DOCX", 400);
  return Object.freeze({
    artifact_id: docusignRequiredText(input.artifact_id, "document.artifact_id"),
    document_id: docusignRequiredText(input.document_id, "document.document_id"),
    version_id: docusignRequiredText(input.version_id, "document.version_id"),
    sha256: docusignRequiredSha256(input.sha256, "document.sha256"),
    filename: docusignRequiredText(input.filename, "document.filename"),
    mime_type: DOCX_MIME_TYPE,
    workspace_id: docusignRequiredText(input.workspace_id, "document.workspace_id"),
    permission_envelope_id: docusignRequiredText(input.permission_envelope_id, "document.permission_envelope_id"),
    audit_trace_id: docusignRequiredText(input.audit_trace_id, "document.audit_trace_id"),
    template_version: docusignRequiredText(input.template_version, "document.template_version"),
    template_sha256: docusignRequiredSha256(input.template_sha256, "document.template_sha256"),
    input_sha256: docusignRequiredSha256(input.input_sha256, "document.input_sha256"),
    approval_receipt_ref: docusignRequiredText(input.approval_receipt_ref, "document.approval_receipt_ref"),
    immutable: true, finalized: true, owner_approved: true,
  });
}

export function normalizeDocusignRecipient(input = {}, index = 0) {
  const routingOrder = Number(input.routing_order ?? index + 1);
  if (!Number.isSafeInteger(routingOrder) || routingOrder < 1) throw new TypeError("recipient.routing_order must be a positive integer");
  return Object.freeze({
    recipient_ref: docusignRequiredText(input.recipient_ref, "recipient.recipient_ref"),
    role: docusignRequiredText(input.role, "recipient.role"),
    routing_order: routingOrder,
  });
}

export function normalizeDocusignAnchors(input = {}) {
  const anchors = (input.anchors ?? []).map((anchor) => Object.freeze({
    role: docusignRequiredText(anchor?.role, "anchor.role"),
    anchor: docusignRequiredText(anchor?.anchor, "anchor.anchor"),
    x_offset: Number.isFinite(Number(anchor?.x_offset)) ? Number(anchor.x_offset) : 0,
    y_offset: Number.isFinite(Number(anchor?.y_offset)) ? Number(anchor.y_offset) : 0,
  }));
  if (anchors.length === 0) throw new TypeError("anchor_manifest.anchors is required");
  return Object.freeze({ anchors: Object.freeze(anchors) });
}

function normalizeArtifact(input) {
  if (input == null) return null;
  if (input.immutable !== true) throw new TypeError("completion artifact must be immutable");
  return Object.freeze({
    document_id: docusignRequiredText(input.document_id, "artifact.document_id"),
    version_id: docusignRequiredText(input.version_id, "artifact.version_id"),
    sha256: docusignRequiredSha256(input.sha256, "artifact.sha256"),
    immutable: true,
  });
}

function normalizeLease(input) {
  if (input == null) return null;
  return Object.freeze({
    kind: docusignRequiredText(input.kind, "operation_lease.kind"),
    token: docusignRequiredText(input.token, "operation_lease.token"),
    acquired_at: docusignTimestamp(input.acquired_at, "operation_lease.acquired_at"),
    expires_at: docusignTimestamp(input.expires_at, "operation_lease.expires_at"),
  });
}

function normalizeProviderCursor(input) {
  if (input == null) return null;
  const sequence = input.sequence == null ? null : Number(input.sequence);
  if (sequence != null && (!Number.isSafeInteger(sequence) || sequence < 0)) throw new TypeError("provider cursor sequence is invalid");
  return Object.freeze({
    occurred_at: docusignTimestamp(input.occurred_at, "provider_cursor.occurred_at"),
    sequence,
    status: docusignRequiredText(input.status, "provider_cursor.status"),
  });
}

export function normalizeDocusignRequest(input = {}) {
  const state = docusignRequiredText(input.state, "request.state");
  if (!DOCUSIGN_REQUEST_STATES.includes(state)) throw new TypeError("request.state is invalid");
  const recipients = (input.recipient_snapshot ?? []).map(normalizeDocusignRecipient);
  if (recipients.length === 0) throw new TypeError("request.recipient_snapshot is required");
  const artifacts = Object.freeze({
    signed_pdf: normalizeArtifact(input.completion_artifacts?.signed_pdf),
    certificate: normalizeArtifact(input.completion_artifacts?.certificate),
  });
  if (state === "completed" && (!artifacts.signed_pdf || !artifacts.certificate)) throw new TypeError("completed request requires both immutable completion artifacts");
  const payloadSha256 = docusignRequiredSha256(input.payload_sha256, "request.payload_sha256");
  return Object.freeze({
    request_id: docusignRequiredText(input.request_id, "request.request_id"),
    tenant_id: docusignRequiredText(input.tenant_id, "request.tenant_id"),
    matter_id: docusignRequiredText(input.matter_id, "request.matter_id"),
    connection_id: docusignRequiredText(input.connection_id, "request.connection_id"),
    account_binding_ref: docusignRequiredText(input.account_binding_ref, "request.account_binding_ref"),
    document: normalizeDocusignDocument(input.document),
    recipient_snapshot: Object.freeze(recipients),
    anchor_manifest: normalizeDocusignAnchors(input.anchor_manifest),
    idempotency_key: docusignRequiredText(input.idempotency_key, "request.idempotency_key"),
    payload_sha256: payloadSha256,
    active_fingerprint: DOCUSIGN_INACTIVE_STATES.has(state) ? null : payloadSha256,
    provider_correlation_ref: docusignRequiredText(input.provider_correlation_ref, "request.provider_correlation_ref"),
    requested_by_actor_id: docusignRequiredText(input.requested_by_actor_id, "request.requested_by_actor_id"),
    state,
    attempt_phase: input.attempt_phase == null ? null : docusignRequiredText(input.attempt_phase, "request.attempt_phase"),
    envelope_id: input.envelope_id == null ? null : docusignRequiredText(input.envelope_id, "request.envelope_id"),
    last_provider_status: input.last_provider_status == null ? null : docusignRequiredText(input.last_provider_status, "request.last_provider_status"),
    last_safe_error_code: input.last_safe_error_code == null ? null : docusignRequiredText(input.last_safe_error_code, "request.last_safe_error_code"),
    last_poll_at: input.last_poll_at == null ? null : docusignTimestamp(input.last_poll_at, "request.last_poll_at"),
    provider_cursor: normalizeProviderCursor(input.provider_cursor),
    operation_lease: normalizeLease(input.operation_lease),
    completion_artifacts: artifacts,
    event_hashes: Object.freeze([...new Set((input.event_hashes ?? []).map((value) => docusignRequiredSha256(value, "event_hash")))]),
    created_at: docusignTimestamp(input.created_at, "request.created_at"),
    updated_at: docusignTimestamp(input.updated_at, "request.updated_at"),
  });
}

export function normalizeDocusignReceipt(input = {}) {
  return Object.freeze({
    receipt_hash: docusignRequiredSha256(input.receipt_hash, "receipt.receipt_hash"),
    receipt_ref: docusignRequiredText(input.receipt_ref, "receipt.receipt_ref"),
    event_hash: docusignRequiredSha256(input.event_hash, "receipt.event_hash"),
    request_id: docusignRequiredText(input.request_id, "receipt.request_id"),
    tenant_id: docusignRequiredText(input.tenant_id, "receipt.tenant_id"),
    provider_status: docusignRequiredText(input.provider_status, "receipt.provider_status"),
    occurred_at: docusignTimestamp(input.occurred_at, "receipt.occurred_at"),
  });
}

export function normalizeDocusignOutboxState(input) {
  const value = input && typeof input === "object" ? input : {};
  const state = { schema_version: DOCUSIGN_OUTBOX_SCHEMA_VERSION, requests: (value.requests ?? []).map(normalizeDocusignRequest), webhook_receipts: (value.webhook_receipts ?? []).map(normalizeDocusignReceipt) };
  const unique = (items, key, code) => {
    const seen = new Set();
    for (const item of items) { const value = key(item); if (value && seen.has(value)) throw docusignFailure(code, "DocuSign durable identity must be unique"); if (value) seen.add(value); }
  };
  unique(state.requests, (r) => `${r.tenant_id}\0${r.request_id}`, "DOCUSIGN_OUTBOX_DUPLICATE");
  unique(state.requests, (r) => `${r.tenant_id}\0${r.idempotency_key}`, "DOCUSIGN_OUTBOX_DUPLICATE");
  unique(state.requests, (r) => r.active_fingerprint && `${r.tenant_id}\0${r.active_fingerprint}`, "DOCUSIGN_ACTIVE_FINGERPRINT_DUPLICATE");
  unique(state.requests, (r) => r.envelope_id, "DOCUSIGN_ENVELOPE_DUPLICATE");
  unique(state.webhook_receipts, (r) => r.receipt_hash, "DOCUSIGN_WEBHOOK_RECEIPT_DUPLICATE");
  return state;
}

export function docusignAccountBindingRef(input) {
  const connection = normalizeDocusignConnection(input);
  return `docusign-account:${docusignHash({ tenant_id: connection.tenant_id, connection_id: connection.connection_id, account_id: connection.account_id, base_uri: connection.base_uri })}`;
}

export function projectDocusignRequestSafe(input) {
  const request = normalizeDocusignRequest(input);
  return Object.freeze({
    request_id: request.request_id, matter_id: request.matter_id,
    document: Object.freeze({ document_id: request.document.document_id, version_id: request.document.version_id, sha256: request.document.sha256 }),
    recipients: Object.freeze(request.recipient_snapshot.map(({ recipient_ref, role, routing_order }) => Object.freeze({ recipient_ref, role, routing_order }))),
    state: request.state,
    canonical_document_ref: `matter://${request.matter_id}/documents/${request.document.document_id}/versions/${request.document.version_id}`,
    can_send: request.state === "approved", can_reconcile: request.state === "reconciliation_required" && Boolean(request.envelope_id),
    completion_artifacts: request.completion_artifacts, production_ready_claim: false,
  });
}
