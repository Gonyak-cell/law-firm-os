import { createHash } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { DOCX_MIME_TYPE, normalizeDocusignConnection } from "./docusign-envelope-adapter.js";

export const DOCUSIGN_OUTBOX_SCHEMA_VERSION = "amic-os.docusign-envelope-outbox.v2";
export const DOCUSIGN_REQUEST_STATES = Object.freeze([
  "draft", "review_required", "approved", "provider_pending", "draft_created", "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided", "reconciliation_required", "provider_blocked",
]);
export const DOCUSIGN_STABLE_STATES = new Set([
  "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided", "provider_blocked",
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
    permission_envelope_id: input.permission_envelope_id == null ? null : docusignRequiredText(input.permission_envelope_id, "artifact.permission_envelope_id"),
    audit_trace_id: input.audit_trace_id == null ? null : docusignRequiredText(input.audit_trace_id, "artifact.audit_trace_id"),
    immutable: true,
  });
}

function normalizeLease(input) {
  if (input == null) return null;
  const generation = input.fencing_generation == null ? 0 : Number(input.fencing_generation);
  if (!Number.isSafeInteger(generation) || generation < 0) throw new TypeError("operation_lease.fencing_generation is invalid");
  return Object.freeze({ kind: docusignRequiredText(input.kind, "operation_lease.kind"), token: docusignRequiredText(input.token, "operation_lease.token"), fencing_generation: generation, acquired_at: docusignTimestamp(input.acquired_at, "operation_lease.acquired_at"), expires_at: docusignTimestamp(input.expires_at, "operation_lease.expires_at") });
}

function normalizeProviderOperation(input) {
  if (input == null) return null;
  const fencingGeneration = Number(input.fencing_generation);
  if (!Number.isSafeInteger(fencingGeneration) || fencingGeneration < 1) throw new TypeError("provider_operation.fencing_generation is invalid");
  const status = input.status == null ? "pending" : docusignRequiredText(input.status, "provider_operation.status").toLowerCase();
  if (!["pending", "unknown", "returned", "succeeded", "failed"].includes(status)) throw new TypeError("provider_operation.status is invalid");
  return Object.freeze({ kind: docusignRequiredText(input.kind, "provider_operation.kind"), correlation_ref: docusignRequiredText(input.correlation_ref, "provider_operation.correlation_ref"), fencing_generation: fencingGeneration, started_at: docusignTimestamp(input.started_at, "provider_operation.started_at"), deadline_at: docusignTimestamp(input.deadline_at, "provider_operation.deadline_at"), status });
}

function normalizeCompletionOperation(input) {
  if (input == null) return null;
  const generation = Number(input.fencing_generation);
  if (!Number.isSafeInteger(generation) || generation < 1) throw new TypeError("completion_operation.fencing_generation is invalid");
  const status = input.status == null ? "pending" : docusignRequiredText(input.status, "completion_operation.status").toLowerCase();
  if (!["pending", "unknown"].includes(status)) throw new TypeError("completion_operation.status is invalid");
  return Object.freeze({
    kind: docusignRequiredText(input.kind, "completion_operation.kind"),
    permission_envelope_id: docusignRequiredText(input.permission_envelope_id, "completion_operation.permission_envelope_id"),
    audit_trace_id: docusignRequiredText(input.audit_trace_id, "completion_operation.audit_trace_id"),
    fencing_generation: generation,
    started_at: docusignTimestamp(input.started_at, "completion_operation.started_at"),
    lease_expires_at: input.lease_expires_at == null ? null : docusignTimestamp(input.lease_expires_at, "completion_operation.lease_expires_at"),
    idempotency_key: input.idempotency_key == null ? null : docusignRequiredText(input.idempotency_key, "completion_operation.idempotency_key"),
    object_id: input.object_id == null ? null : docusignRequiredText(input.object_id, "completion_operation.object_id"),
    sha256: input.sha256 == null ? null : docusignRequiredSha256(input.sha256, "completion_operation.sha256"),
    status,
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

function normalizeActionIdempotency(input = []) {
  if (!Array.isArray(input)) throw new TypeError("request.action_idempotency must be an array");
  const seen = new Set();
  return Object.freeze(input.map((entry) => {
    const action = docusignRequiredText(entry?.action, "action_idempotency.action");
    if (!["send", "reconcile"].includes(action)) throw new TypeError("action_idempotency.action is invalid");
    const key = docusignRequiredText(entry?.key, "action_idempotency.key");
    const identity = `${action}\0${key}`;
    if (seen.has(identity)) throw new TypeError("request.action_idempotency contains a duplicate action key");
    seen.add(identity);
    const status = docusignRequiredText(entry?.status ?? "in_progress", "action_idempotency.status");
    if (!["in_progress", "succeeded", "failed", "unknown"].includes(status)) throw new TypeError("action_idempotency.status is invalid");
    return Object.freeze({
      action,
      key,
      actor_id: docusignRequiredText(entry?.actor_id, "action_idempotency.actor_id"),
      request_id: docusignRequiredText(entry?.request_id, "action_idempotency.request_id"),
      status,
      safe_error_code: entry?.safe_error_code == null ? null : docusignRequiredText(entry.safe_error_code, "action_idempotency.safe_error_code"),
      created_at: docusignTimestamp(entry?.created_at, "action_idempotency.created_at"),
      updated_at: docusignTimestamp(entry?.updated_at ?? entry?.created_at, "action_idempotency.updated_at"),
    });
  }));
}

export function normalizeDocusignAuditLineage(input = []) {
  if (!Array.isArray(input)) throw new TypeError("request.audit_lineage must be an array");
  return Object.freeze(input.map((entry) => Object.freeze({
    event: docusignRequiredText(entry?.event, "audit_lineage.event"),
    audit_trace_id: docusignRequiredText(entry?.audit_trace_id, "audit_lineage.audit_trace_id"),
    actor_id: docusignRequiredText(entry?.actor_id, "audit_lineage.actor_id"),
    occurred_at: docusignTimestamp(entry?.occurred_at, "audit_lineage.occurred_at"),
  })));
}

export function normalizeDocusignRequest(input = {}) {
  const state = docusignRequiredText(input.state, "request.state");
  if (!DOCUSIGN_REQUEST_STATES.includes(state)) throw new TypeError("request.state is invalid");
  const envelopeId = input.envelope_id == null ? null : docusignRequiredText(input.envelope_id, "request.envelope_id");
  if (["draft_created", "sent", "delivered", "completed_artifacts_pending", "completed", "declined", "voided"].includes(state) && !envelopeId) {
    throw new TypeError(`${state} request requires a provider envelope`);
  }
  if (state === "approved" && envelopeId) throw new TypeError("approved request cannot already have a provider envelope");
  const recipients = (input.recipient_snapshot ?? []).map(normalizeDocusignRecipient);
  if (recipients.length === 0) throw new TypeError("request.recipient_snapshot is required");
  const document = normalizeDocusignDocument(input.document);
  const auditLineage = normalizeDocusignAuditLineage(input.audit_lineage);
  if (auditLineage.some((entry) => entry.audit_trace_id !== document.audit_trace_id)) throw new TypeError("request.audit_lineage authority does not match document");
  const artifacts = Object.freeze({
    signed_pdf: normalizeArtifact(input.completion_artifacts?.signed_pdf),
    certificate: normalizeArtifact(input.completion_artifacts?.certificate),
  });
  if (state === "completed" && (!artifacts.signed_pdf || !artifacts.certificate)) throw new TypeError("completed request requires both immutable completion artifacts");
  for (const artifact of Object.values(artifacts)) {
    if (artifact && (artifact.permission_envelope_id !== input.document?.permission_envelope_id || artifact.audit_trace_id !== input.document?.audit_trace_id)) {
      throw new TypeError("completion artifact authority binding does not match request document");
    }
  }
  const payloadSha256 = docusignRequiredSha256(input.payload_sha256, "request.payload_sha256");
  return Object.freeze({
    request_id: docusignRequiredText(input.request_id, "request.request_id"),
    tenant_id: docusignRequiredText(input.tenant_id, "request.tenant_id"),
    matter_id: docusignRequiredText(input.matter_id, "request.matter_id"),
    connection_id: docusignRequiredText(input.connection_id, "request.connection_id"),
    account_binding_ref: docusignRequiredText(input.account_binding_ref, "request.account_binding_ref"),
    document,
    recipient_snapshot: Object.freeze(recipients),
    anchor_manifest: normalizeDocusignAnchors(input.anchor_manifest),
    idempotency_key: docusignRequiredText(input.idempotency_key, "request.idempotency_key"),
    payload_sha256: payloadSha256,
    active_fingerprint: DOCUSIGN_INACTIVE_STATES.has(state) ? null : payloadSha256,
    provider_correlation_ref: docusignRequiredText(input.provider_correlation_ref, "request.provider_correlation_ref"),
    requested_by_actor_id: docusignRequiredText(input.requested_by_actor_id, "request.requested_by_actor_id"),
    state,
    attempt_phase: input.attempt_phase == null ? null : docusignRequiredText(input.attempt_phase, "request.attempt_phase"),
    envelope_id: envelopeId,
    last_provider_status: input.last_provider_status == null ? null : docusignRequiredText(input.last_provider_status, "request.last_provider_status"),
    last_safe_error_code: input.last_safe_error_code == null ? null : docusignRequiredText(input.last_safe_error_code, "request.last_safe_error_code"),
    last_poll_at: input.last_poll_at == null ? null : docusignTimestamp(input.last_poll_at, "request.last_poll_at"),
    provider_cursor: normalizeProviderCursor(input.provider_cursor),
    operation_lease: normalizeLease(input.operation_lease),
    provider_operation: normalizeProviderOperation(input.provider_operation),
    action_idempotency: normalizeActionIdempotency(input.action_idempotency),
    completion_operation: normalizeCompletionOperation(input.completion_operation),
    completion_artifacts: artifacts,
    audit_lineage: auditLineage,
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
  if (value.schema_version != null && value.schema_version !== DOCUSIGN_OUTBOX_SCHEMA_VERSION) {
    throw docusignInfrastructureFailure("DOCUSIGN_OUTBOX_SCHEMA_UNSUPPORTED");
  }
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
    can_send: request.state === "approved" || request.state === "draft_created", can_reconcile: ["reconciliation_required", "draft_created", "sent", "delivered", "completed_artifacts_pending"].includes(request.state),
    completion_artifacts: request.completion_artifacts, production_ready_claim: false,
  });
}
