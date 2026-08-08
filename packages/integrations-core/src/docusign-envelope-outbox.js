import { createHash } from "node:crypto";
import { createDurableJsonStateController, stableJsonStringify } from "../../persistence/src/durable-file.js";
import { DOCX_MIME_TYPE, normalizeDocusignConnection } from "./docusign-envelope-adapter.js";

export const DOCUSIGN_OUTBOX_SCHEMA_VERSION = "amic-os.docusign-envelope-outbox.v1";
export const DOCUSIGN_REQUEST_STATES = Object.freeze([
  "draft",
  "review_required",
  "approved",
  "provider_pending",
  "sent",
  "delivered",
  "completed_artifacts_pending",
  "completed",
  "declined",
  "voided",
  "reconciliation_required",
  "provider_blocked",
]);

const TERMINAL_OR_EXTERNAL_STATES = new Set([
  "sent",
  "delivered",
  "completed_artifacts_pending",
  "completed",
  "declined",
  "voided",
  "reconciliation_required",
  "provider_blocked",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredSha256(value, field) {
  const digest = requiredText(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return digest;
}

function requiredTimestamp(value, field) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError(`${field} must be an ISO timestamp`);
  return timestamp.toISOString();
}

function nowIso(clock) {
  return requiredTimestamp(typeof clock === "function" ? clock() : clock ?? new Date(), "clock");
}

function failure(code, message, status = 409) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

function hashValue(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function normalizePrincipal(input = {}) {
  return Object.freeze({
    tenant_id: requiredText(input.tenant_id, "principal.tenant_id"),
    actor_id: requiredText(input.actor_id ?? input.user_id, "principal.actor_id"),
  });
}

function normalizeDocumentSnapshot(input = {}) {
  if (input.immutable !== true || input.finalized !== true || input.owner_approved !== true) {
    throw failure("DOCUSIGN_APPROVED_IMMUTABLE_DOCUMENT_REQUIRED", "Approved immutable document is required", 400);
  }
  if (input.mime_type !== DOCX_MIME_TYPE) {
    throw failure("DOCUSIGN_DOCX_REQUIRED", "DocuSign source document must be DOCX", 400);
  }
  return Object.freeze({
    document_id: requiredText(input.document_id, "document.document_id"),
    version_id: requiredText(input.version_id, "document.version_id"),
    sha256: requiredSha256(input.sha256, "document.sha256"),
    filename: requiredText(input.filename, "document.filename"),
    mime_type: DOCX_MIME_TYPE,
    workspace_id: requiredText(input.workspace_id, "document.workspace_id"),
    permission_envelope_id: requiredText(input.permission_envelope_id, "document.permission_envelope_id"),
    audit_trace_id: requiredText(input.audit_trace_id, "document.audit_trace_id"),
    template_version: requiredText(input.template_version, "document.template_version"),
    template_sha256: requiredSha256(input.template_sha256, "document.template_sha256"),
    approval_receipt_ref: requiredText(input.approval_receipt_ref, "document.approval_receipt_ref"),
    immutable: true,
    finalized: true,
    owner_approved: true,
  });
}

function normalizeRecipientSnapshot(input = {}, index = 0) {
  const routingOrder = Number(input.routing_order ?? index + 1);
  if (!Number.isSafeInteger(routingOrder) || routingOrder < 1) {
    throw new TypeError("recipient.routing_order must be a positive integer");
  }
  return Object.freeze({
    recipient_ref: requiredText(input.recipient_ref, "recipient.recipient_ref"),
    role: requiredText(input.role, "recipient.role"),
    routing_order: routingOrder,
  });
}

function normalizeAnchorManifest(input = {}) {
  const anchors = (input.anchors ?? []).map((anchor) => Object.freeze({
    role: requiredText(anchor?.role, "anchor.role"),
    anchor: requiredText(anchor?.anchor, "anchor.anchor"),
    x_offset: Number.isFinite(Number(anchor?.x_offset)) ? Number(anchor.x_offset) : 0,
    y_offset: Number.isFinite(Number(anchor?.y_offset)) ? Number(anchor.y_offset) : 0,
  }));
  if (anchors.length === 0) throw new TypeError("anchor_manifest.anchors is required");
  return Object.freeze({ anchors: Object.freeze(anchors) });
}

function normalizeArtifactRef(input) {
  if (input == null) return null;
  if (input.immutable !== true) throw new TypeError("completion artifact must be immutable");
  return Object.freeze({
    document_id: requiredText(input.document_id, "artifact.document_id"),
    version_id: requiredText(input.version_id, "artifact.version_id"),
    sha256: requiredSha256(input.sha256, "artifact.sha256"),
    immutable: true,
  });
}

function normalizeRequest(input = {}) {
  const state = requiredText(input.state, "request.state");
  if (!DOCUSIGN_REQUEST_STATES.includes(state)) throw new TypeError("request.state is invalid");
  const recipientSnapshot = (input.recipient_snapshot ?? []).map(normalizeRecipientSnapshot);
  if (recipientSnapshot.length === 0) throw new TypeError("request.recipient_snapshot is required");
  const eventHashes = [...new Set((input.event_hashes ?? []).map((value) => requiredSha256(value, "event_hash")))];
  const completionArtifacts = Object.freeze({
    signed_pdf: normalizeArtifactRef(input.completion_artifacts?.signed_pdf),
    certificate: normalizeArtifactRef(input.completion_artifacts?.certificate),
  });
  if (state === "completed" && (!completionArtifacts.signed_pdf || !completionArtifacts.certificate)) {
    throw new TypeError("completed request requires both immutable completion artifacts");
  }
  return Object.freeze({
    request_id: requiredText(input.request_id, "request.request_id"),
    tenant_id: requiredText(input.tenant_id, "request.tenant_id"),
    matter_id: requiredText(input.matter_id, "request.matter_id"),
    connection_id: requiredText(input.connection_id, "request.connection_id"),
    account_binding_ref: requiredText(input.account_binding_ref, "request.account_binding_ref"),
    document: normalizeDocumentSnapshot(input.document),
    recipient_snapshot: Object.freeze(recipientSnapshot),
    anchor_manifest: normalizeAnchorManifest(input.anchor_manifest),
    idempotency_key: requiredText(input.idempotency_key, "request.idempotency_key"),
    payload_sha256: requiredSha256(input.payload_sha256, "request.payload_sha256"),
    provider_correlation_ref: requiredText(input.provider_correlation_ref, "request.provider_correlation_ref"),
    requested_by_actor_id: requiredText(input.requested_by_actor_id, "request.requested_by_actor_id"),
    state,
    attempt_phase: input.attempt_phase == null ? null : requiredText(input.attempt_phase, "request.attempt_phase"),
    envelope_id: input.envelope_id == null ? null : requiredText(input.envelope_id, "request.envelope_id"),
    last_provider_status: input.last_provider_status == null ? null : requiredText(input.last_provider_status, "request.last_provider_status"),
    last_safe_error_code: input.last_safe_error_code == null ? null : requiredText(input.last_safe_error_code, "request.last_safe_error_code"),
    last_poll_at: input.last_poll_at == null ? null : requiredTimestamp(input.last_poll_at, "request.last_poll_at"),
    completion_artifacts: completionArtifacts,
    event_hashes: Object.freeze(eventHashes),
    created_at: requiredTimestamp(input.created_at, "request.created_at"),
    updated_at: requiredTimestamp(input.updated_at, "request.updated_at"),
  });
}

function normalizeReceipt(input = {}) {
  return Object.freeze({
    receipt_hash: requiredSha256(input.receipt_hash, "receipt.receipt_hash"),
    receipt_ref: requiredText(input.receipt_ref, "receipt.receipt_ref"),
    event_hash: requiredSha256(input.event_hash, "receipt.event_hash"),
    request_id: requiredText(input.request_id, "receipt.request_id"),
    tenant_id: requiredText(input.tenant_id, "receipt.tenant_id"),
    provider_status: requiredText(input.provider_status, "receipt.provider_status"),
    occurred_at: requiredTimestamp(input.occurred_at, "receipt.occurred_at"),
  });
}

function emptyState() {
  return { schema_version: DOCUSIGN_OUTBOX_SCHEMA_VERSION, requests: [], webhook_receipts: [] };
}

export function normalizeDocusignOutboxState(input) {
  const value = input && typeof input === "object" ? input : emptyState();
  const state = {
    schema_version: DOCUSIGN_OUTBOX_SCHEMA_VERSION,
    requests: (value.requests ?? []).map(normalizeRequest),
    webhook_receipts: (value.webhook_receipts ?? []).map(normalizeReceipt),
  };
  const requestIds = new Set();
  const idempotencyKeys = new Set();
  const envelopeIds = new Set();
  const receiptHashes = new Set();
  for (const request of state.requests) {
    const requestKey = `${request.tenant_id}\0${request.request_id}`;
    const idempotencyKey = `${request.tenant_id}\0${request.idempotency_key}`;
    if (requestIds.has(requestKey) || idempotencyKeys.has(idempotencyKey)) {
      throw failure("DOCUSIGN_OUTBOX_DUPLICATE", "DocuSign request identity must be tenant-unique");
    }
    requestIds.add(requestKey);
    idempotencyKeys.add(idempotencyKey);
    if (request.envelope_id) {
      if (envelopeIds.has(request.envelope_id)) throw failure("DOCUSIGN_ENVELOPE_DUPLICATE", "Envelope ID must be unique");
      envelopeIds.add(request.envelope_id);
    }
  }
  for (const receipt of state.webhook_receipts) {
    if (receiptHashes.has(receipt.receipt_hash)) {
      throw failure("DOCUSIGN_WEBHOOK_RECEIPT_DUPLICATE", "Webhook receipt hash must be unique");
    }
    receiptHashes.add(receipt.receipt_hash);
  }
  return state;
}

export function createDocusignEnvelopeRepository({ filePath, state } = {}) {
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: state ?? emptyState(),
    normalizeValue: normalizeDocusignOutboxState,
  });
  return Object.freeze({
    durable: Boolean(filePath),
    loadState() {
      return clone(filePath ? controller.reload().value : controller.value);
    },
    replaceState(nextState) {
      controller.commit(normalizeDocusignOutboxState(nextState));
      return clone(controller.value);
    },
  });
}

function requestIndex(state, tenantId, requestId) {
  return state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
}

function replaceRequest(repository, request) {
  const state = repository.loadState();
  const index = requestIndex(state, request.tenant_id, request.request_id);
  if (index === -1) throw failure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
  state.requests[index] = normalizeRequest(request);
  return repository.replaceState(state).requests[index];
}

function accountBindingRef(connection) {
  return `docusign-account:${hashValue({
    tenant_id: connection.tenant_id,
    connection_id: connection.connection_id,
    account_id: connection.account_id,
    base_uri: connection.base_uri,
  })}`;
}

function canonicalRequestPayload({ tenant_id, matter_id, connection_id, document, recipients, anchor_manifest }) {
  return Object.freeze({ tenant_id, matter_id, connection_id, document, recipients, anchor_manifest });
}

function providerFailure(error) {
  const status = Number(error?.provider_status);
  const deterministic = Number.isInteger(status) && status >= 400 && status < 500
    && ![408, 409, 425, 429].includes(status);
  return Object.freeze({
    state: deterministic ? "provider_blocked" : "reconciliation_required",
    safe_error_code: deterministic ? "DOCUSIGN_PROVIDER_REJECTED" : "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS",
  });
}

function publicRequest(request) {
  return Object.freeze({
    request_id: request.request_id,
    matter_id: request.matter_id,
    document: Object.freeze({
      document_id: request.document.document_id,
      version_id: request.document.version_id,
      sha256: request.document.sha256,
    }),
    recipients: Object.freeze(request.recipient_snapshot.map((recipient) => Object.freeze({
      recipient_ref: recipient.recipient_ref,
      role: recipient.role,
      routing_order: recipient.routing_order,
    }))),
    state: request.state,
    canonical_document_ref: `matter://${request.matter_id}/documents/${request.document.document_id}/versions/${request.document.version_id}`,
    can_send: request.state === "approved",
    can_reconcile: request.state === "reconciliation_required" && Boolean(request.envelope_id),
    completion_artifacts: request.completion_artifacts,
    production_ready_claim: false,
  });
}

export function createDocusignEnvelopeService({
  repository,
  connectionResolver,
  artifactReader,
  recipientResolver,
  adapter,
  clock = () => new Date(),
} = {}) {
  if (!repository || typeof repository.loadState !== "function" || typeof repository.replaceState !== "function") {
    throw new TypeError("DocuSign repository is required");
  }
  if (typeof connectionResolver !== "function") throw new TypeError("connectionResolver is required");
  if (typeof artifactReader !== "function") throw new TypeError("artifactReader is required");
  if (typeof recipientResolver !== "function") throw new TypeError("recipientResolver is required");
  if (!adapter || typeof adapter.createDraft !== "function" || typeof adapter.send !== "function") {
    throw new TypeError("DocuSign envelope adapter is required");
  }

  const recovered = repository.loadState();
  let recoveryChanged = false;
  recovered.requests = recovered.requests.map((request) => {
    if (request.state === "provider_pending" && ["creating", "draft_persisted", "sending"].includes(request.attempt_phase)) {
      recoveryChanged = true;
      return { ...request, state: "reconciliation_required", last_safe_error_code: "DOCUSIGN_INTERRUPTED_ATTEMPT", updated_at: nowIso(clock) };
    }
    return request;
  });
  if (recoveryChanged) repository.replaceState(recovered);

  async function resolveBoundConnection(request) {
    const connection = normalizeDocusignConnection(await connectionResolver({
      tenant_id: request.tenant_id,
      connection_id: request.connection_id,
    }));
    if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id) {
      throw failure("DOCUSIGN_CONNECTION_SCOPE_INVALID", "DocuSign connection scope does not match request", 403);
    }
    if (accountBindingRef(connection) !== request.account_binding_ref) {
      throw failure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 409);
    }
    return connection;
  }

  return Object.freeze({
    repository,
    async queueApprovedRequest(input = {}) {
      const principal = normalizePrincipal(input.principal);
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      if (principal.tenant_id !== tenantId) throw failure("DOCUSIGN_TENANT_MISMATCH", "Tenant does not match server principal", 403);
      const matterId = requiredText(input.matter_id, "matter_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const document = normalizeDocumentSnapshot(input.document);
      const recipients = Object.freeze((input.recipients ?? []).map(normalizeRecipientSnapshot));
      if (recipients.length === 0) throw new TypeError("recipients are required");
      const roles = new Set(recipients.map((recipient) => recipient.role));
      if (roles.size !== recipients.length) throw new TypeError("recipient roles must be unique");
      const anchorManifest = normalizeAnchorManifest(input.anchor_manifest);
      for (const role of roles) {
        if (!anchorManifest.anchors.some((anchor) => anchor.role === role)) throw new TypeError(`signature anchor is required for role ${role}`);
      }
      const idempotencyKey = requiredText(input.idempotency_key, "idempotency_key");
      const connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: tenantId, connection_id: connectionId }));
      if (connection.tenant_id !== tenantId || connection.connection_id !== connectionId) {
        throw failure("DOCUSIGN_CONNECTION_SCOPE_INVALID", "DocuSign connection scope does not match request", 403);
      }
      const payload = canonicalRequestPayload({
        tenant_id: tenantId,
        matter_id: matterId,
        connection_id: connectionId,
        document,
        recipients,
        anchor_manifest: anchorManifest,
      });
      const payloadSha256 = hashValue(payload);
      const state = repository.loadState();
      const replay = state.requests.find((request) => request.tenant_id === tenantId && request.idempotency_key === idempotencyKey);
      if (replay) {
        if (replay.payload_sha256 !== payloadSha256) throw failure("DOCUSIGN_IDEMPOTENCY_CONFLICT", "Idempotency key payload changed");
        return Object.freeze({ outcome: "replayed", request: publicRequest(replay) });
      }
      const active = state.requests.find((request) => request.tenant_id === tenantId
        && request.payload_sha256 === payloadSha256
        && !["declined", "voided", "provider_blocked"].includes(request.state));
      if (active) return Object.freeze({ outcome: "replayed", request: publicRequest(active) });
      const createdAt = nowIso(clock);
      const requestId = requiredText(input.request_id, "request_id");
      const request = normalizeRequest({
        request_id: requestId,
        tenant_id: tenantId,
        matter_id: matterId,
        connection_id: connectionId,
        account_binding_ref: accountBindingRef(connection),
        document,
        recipient_snapshot: recipients,
        anchor_manifest: anchorManifest,
        idempotency_key: idempotencyKey,
        payload_sha256: payloadSha256,
        provider_correlation_ref: `docusign-correlation:${hashValue({ request_id: requestId, payload_sha256: payloadSha256 })}`,
        requested_by_actor_id: principal.actor_id,
        state: "approved",
        completion_artifacts: {},
        event_hashes: [],
        created_at: createdAt,
        updated_at: createdAt,
      });
      state.requests.push(request);
      repository.replaceState(state);
      return Object.freeze({ outcome: "created", request: publicRequest(request) });
    },
    async sendApprovedRequest(input = {}) {
      const principal = normalizePrincipal(input.principal);
      if (input.explicit_human_action !== true) {
        throw failure("DOCUSIGN_EXPLICIT_SEND_REQUIRED", "Explicit human send action is required", 400);
      }
      const state = repository.loadState();
      const index = requestIndex(state, principal.tenant_id, requiredText(input.request_id, "request_id"));
      if (index === -1) throw failure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      let request = state.requests[index];
      if (request.requested_by_actor_id !== principal.actor_id) {
        throw failure("DOCUSIGN_SEND_ACTOR_MISMATCH", "Only the approving actor may send this request", 403);
      }
      if (TERMINAL_OR_EXTERNAL_STATES.has(request.state)) {
        return Object.freeze({ outcome: "replayed", request: publicRequest(request) });
      }
      if (request.state !== "approved") throw failure("DOCUSIGN_REQUEST_NOT_APPROVED", "DocuSign request is not approved", 409);
      const connection = await resolveBoundConnection(request);
      const artifact = await artifactReader({
        tenant_id: request.tenant_id,
        matter_id: request.matter_id,
        document_id: request.document.document_id,
        version_id: request.document.version_id,
      });
      const artifactBytes = Buffer.isBuffer(artifact?.bytes) ? artifact.bytes : Buffer.from(artifact?.bytes ?? []);
      if (createHash("sha256").update(artifactBytes).digest("hex") !== request.document.sha256) {
        throw failure("DOCUSIGN_DOCUMENT_HASH_CHANGED", "Approved document hash changed", 409);
      }
      const signers = [];
      for (const recipient of request.recipient_snapshot) {
        const resolved = await recipientResolver({
          tenant_id: request.tenant_id,
          recipient_ref: recipient.recipient_ref,
          role: recipient.role,
        });
        if (resolved?.tenant_id !== request.tenant_id || resolved?.recipient_ref !== recipient.recipient_ref) {
          throw failure("DOCUSIGN_RECIPIENT_SCOPE_INVALID", "Recipient does not match server tenant", 403);
        }
        signers.push({ ...recipient, name: resolved.name, email: resolved.email });
      }
      request = replaceRequest(repository, {
        ...request,
        state: "provider_pending",
        attempt_phase: "creating",
        last_safe_error_code: null,
        updated_at: nowIso(clock),
      });
      let envelope;
      try {
        envelope = await adapter.createDraft({
          connection,
          document: { ...request.document, bytes: artifactBytes },
          signers,
          anchor_manifest: request.anchor_manifest,
        });
      } catch (error) {
        const classified = providerFailure(error);
        request = replaceRequest(repository, {
          ...request,
          state: classified.state,
          attempt_phase: "create_failed",
          last_safe_error_code: classified.safe_error_code,
          updated_at: nowIso(clock),
        });
        return Object.freeze({ outcome: "blocked", request: publicRequest(request), safe_error_code: classified.safe_error_code });
      }
      try {
        request = replaceRequest(repository, {
          ...request,
          envelope_id: requiredText(envelope?.envelope_id, "provider envelope_id"),
          attempt_phase: "draft_persisted",
          updated_at: nowIso(clock),
        });
      } catch (error) {
        throw failure("DOCUSIGN_CREATE_PERSIST_FAILED", "Provider draft exists but local persistence failed", 503);
      }
      request = replaceRequest(repository, { ...request, attempt_phase: "sending", updated_at: nowIso(clock) });
      try {
        await adapter.send({ connection, envelope_id: request.envelope_id });
      } catch (error) {
        const classified = providerFailure(error);
        request = replaceRequest(repository, {
          ...request,
          state: classified.state,
          attempt_phase: "send_failed",
          last_safe_error_code: classified.safe_error_code,
          updated_at: nowIso(clock),
        });
        return Object.freeze({ outcome: "blocked", request: publicRequest(request), safe_error_code: classified.safe_error_code });
      }
      request = replaceRequest(repository, {
        ...request,
        state: "sent",
        attempt_phase: "sent",
        last_provider_status: "sent",
        updated_at: nowIso(clock),
      });
      return Object.freeze({ outcome: "sent", request: publicRequest(request) });
    },
    listRequests({ principal, matter_id } = {}) {
      const serverPrincipal = normalizePrincipal(principal);
      const matterId = matter_id == null ? null : requiredText(matter_id, "matter_id");
      return Object.freeze(repository.loadState().requests
        .filter((request) => request.tenant_id === serverPrincipal.tenant_id)
        .filter((request) => !matterId || request.matter_id === matterId)
        .map(publicRequest));
    },
  });
}

export function projectDocusignRequestSafe(request) {
  return publicRequest(normalizeRequest(request));
}

export function docusignAccountBindingRef(connection) {
  return accountBindingRef(normalizeDocusignConnection(connection));
}
