import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import {
  docusignAccountBindingRef,
  projectDocusignRequestSafe,
} from "./docusign-envelope-outbox.js";

export const DOCUSIGN_CONNECT_SIGNATURE_HEADER = "x-docusign-signature-1";
export const DOCUSIGN_MIN_POLL_INTERVAL_MS = 15 * 60 * 1000;

const PROVIDER_STATUS_STATE = Object.freeze({
  created: "provider_pending",
  sent: "sent",
  delivered: "delivered",
  completed: "completed_artifacts_pending",
  declined: "declined",
  voided: "voided",
});

const PROGRESS_RANK = Object.freeze({
  draft: 0,
  review_required: 1,
  approved: 2,
  provider_pending: 3,
  reconciliation_required: 3,
  sent: 4,
  delivered: 5,
  completed_artifacts_pending: 6,
  completed: 7,
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function failure(code, message, status = 409) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function nowIso(clock) {
  const value = typeof clock === "function" ? clock() : clock ?? new Date();
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError("clock must return a valid timestamp");
  return timestamp.toISOString();
}

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

function rawBytes(value) {
  const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value ?? []);
  if (bytes.length === 0) throw failure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is required", 400);
  return bytes;
}

export function verifyDocusignConnectHmac({ raw_body, signature, secret } = {}) {
  const bytes = rawBytes(raw_body);
  const encoded = typeof signature === "string" ? signature.trim() : "";
  if (!/^[A-Za-z0-9+/]{43}=$/u.test(encoded)) {
    throw failure("DOCUSIGN_WEBHOOK_SIGNATURE_INVALID", "DocuSign webhook signature is invalid", 401);
  }
  const supplied = Buffer.from(encoded, "base64");
  const key = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(requiredText(secret, "resolved HMAC secret"));
  const expected = createHmac("sha256", key).update(bytes).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw failure("DOCUSIGN_WEBHOOK_SIGNATURE_INVALID", "DocuSign webhook signature is invalid", 401);
  }
  return true;
}

function parseConnectEvent(rawBody) {
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw failure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is invalid", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw failure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is invalid", 400);
  }
  const summary = payload.data?.envelopeSummary ?? {};
  const status = requiredText(summary.status ?? payload.status ?? payload.event, "provider status")
    .replace(/^envelope-/u, "")
    .toLowerCase();
  const occurredAt = new Date(summary.statusChangedDateTime ?? payload.generatedDateTime ?? payload.createdDateTime);
  if (!Number.isFinite(occurredAt.getTime())) {
    throw failure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook timestamp is invalid", 400);
  }
  const event = Object.freeze({
    account_id: requiredText(payload.data?.accountId ?? payload.accountId, "provider account_id"),
    envelope_id: requiredText(payload.data?.envelopeId ?? payload.envelopeId, "provider envelope_id"),
    status,
    occurred_at: occurredAt.toISOString(),
    provider_event: typeof payload.event === "string" ? payload.event.trim().toLowerCase() : null,
  });
  return Object.freeze({
    ...event,
    event_hash: sha256(Buffer.from(stableJsonStringify(event))),
  });
}

function requestByEnvelope(state, envelopeId) {
  return state.requests.find((request) => request.envelope_id === envelopeId) ?? null;
}

function requestById(state, tenantId, requestId) {
  return state.requests.find((request) => request.tenant_id === tenantId && request.request_id === requestId) ?? null;
}

function replaceCurrentRequest(repository, tenantId, requestId, mutator) {
  const state = repository.loadState();
  const index = state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
  if (index === -1) throw failure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
  state.requests[index] = mutator(clone(state.requests[index]));
  return repository.replaceState(state).requests[index];
}

function applyProviderStatus(request, status, timestamp) {
  const target = PROVIDER_STATUS_STATE[status];
  if (!target || ["completed", "declined", "voided", "provider_blocked"].includes(request.state)) {
    return Object.freeze({ request, changed: false });
  }
  if (["declined", "voided"].includes(target)) {
    return Object.freeze({
      changed: true,
      request: { ...request, state: target, attempt_phase: target, last_provider_status: status, last_safe_error_code: null, updated_at: timestamp },
    });
  }
  const currentRank = PROGRESS_RANK[request.state] ?? -1;
  const targetRank = PROGRESS_RANK[target] ?? -1;
  if (targetRank < currentRank) return Object.freeze({ request, changed: false });
  return Object.freeze({
    changed: target !== request.state || request.last_provider_status !== status,
    request: { ...request, state: target, attempt_phase: target, last_provider_status: status, last_safe_error_code: null, updated_at: timestamp },
  });
}

async function resolveBoundConnection({ request, connectionResolver }) {
  const connection = normalizeDocusignConnection(await connectionResolver({
    tenant_id: request.tenant_id,
    connection_id: request.connection_id,
  }));
  if (connection.tenant_id !== request.tenant_id
      || connection.connection_id !== request.connection_id
      || docusignAccountBindingRef(connection) !== request.account_binding_ref) {
    throw failure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 403);
  }
  return connection;
}

function validateArtifactReceipt(receipt, expectedSha256) {
  if (receipt?.immutable !== true || requiredText(receipt?.sha256, "artifact sha256").toLowerCase() !== expectedSha256) {
    throw failure("DOCUSIGN_COMPLETION_ARTIFACT_NOT_IMMUTABLE", "Completion artifact was not stored immutably", 503);
  }
  return Object.freeze({
    document_id: requiredText(receipt.document_id, "artifact document_id"),
    version_id: requiredText(receipt.version_id, "artifact version_id"),
    sha256: expectedSha256,
    immutable: true,
  });
}

async function completeArtifacts({ repository, request, connection, adapter, artifactStore, clock }) {
  if (request.state === "completed") return Object.freeze({ outcome: "completed", request: projectDocusignRequestSafe(request) });
  if (request.state !== "completed_artifacts_pending") {
    return Object.freeze({ outcome: "ignored", request: projectDocusignRequestSafe(request) });
  }
  const descriptors = [
    { key: "signed_pdf", document_id: "combined", title_suffix: "서명 완료본" },
    { key: "certificate", document_id: "certificate", title_suffix: "서명 인증서" },
  ];
  try {
    let current = request;
    for (const descriptor of descriptors) {
      if (current.completion_artifacts?.[descriptor.key]) continue;
      const bytes = await adapter.downloadDocument({
        connection,
        envelope_id: current.envelope_id,
        document_id: descriptor.document_id,
      });
      const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? []);
      if (buffer.length === 0) throw new Error("DocuSign completion artifact was empty");
      const digest = sha256(buffer);
      const stored = validateArtifactReceipt(await artifactStore.ingest({
        tenant_id: current.tenant_id,
        matter_id: current.matter_id,
        workspace_id: current.document.workspace_id,
        permission_envelope_id: current.document.permission_envelope_id,
        audit_trace_id: current.document.audit_trace_id,
        requested_by_actor_id: current.requested_by_actor_id,
        request_id: current.request_id,
        envelope_id: current.envelope_id,
        kind: descriptor.key,
        title: `${current.document.filename} - ${descriptor.title_suffix}.pdf`,
        mime_type: "application/pdf",
        bytes: buffer,
        sha256: digest,
      }), digest);
      current = replaceCurrentRequest(repository, current.tenant_id, current.request_id, (fresh) => {
        if (["completed", "declined", "voided"].includes(fresh.state)) return fresh;
        return {
          ...fresh,
          state: "completed_artifacts_pending",
          completion_artifacts: { ...fresh.completion_artifacts, [descriptor.key]: stored },
          last_safe_error_code: null,
          updated_at: nowIso(clock),
        };
      });
    }
    current = replaceCurrentRequest(repository, current.tenant_id, current.request_id, (fresh) => {
      if (["declined", "voided"].includes(fresh.state)) return fresh;
      if (!fresh.completion_artifacts?.signed_pdf || !fresh.completion_artifacts?.certificate) return fresh;
      return { ...fresh, state: "completed", attempt_phase: "completed", last_safe_error_code: null, updated_at: nowIso(clock) };
    });
    return Object.freeze({
      outcome: current.state === "completed" ? "completed" : "ignored",
      request: projectDocusignRequestSafe(current),
    });
  } catch {
    const current = replaceCurrentRequest(repository, request.tenant_id, request.request_id, (fresh) => (
      ["completed", "declined", "voided"].includes(fresh.state)
        ? fresh
        : { ...fresh, state: "completed_artifacts_pending", last_safe_error_code: "DOCUSIGN_COMPLETION_ARTIFACT_PENDING", updated_at: nowIso(clock) }
    ));
    return Object.freeze({
      outcome: "artifacts_pending",
      safe_error_code: "DOCUSIGN_COMPLETION_ARTIFACT_PENDING",
      request: projectDocusignRequestSafe(current),
    });
  }
}

export function createDocusignWebhookReceiptStore({ storage } = {}) {
  if (!storage || typeof storage.putObject !== "function" || typeof storage.statObject !== "function") {
    throw new TypeError("protected receipt storage is required");
  }
  return Object.freeze({
    async put({ tenant_id, request_id, bytes, sha256: expectedSha256 } = {}) {
      const buffer = rawBytes(bytes);
      const digest = sha256(buffer);
      if (digest !== requiredText(expectedSha256, "receipt sha256").toLowerCase()) {
        throw failure("DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH", "Webhook receipt hash changed", 503);
      }
      const objectId = `docusign-connect:${requiredText(request_id, "request_id")}:${digest}`;
      const prior = await storage.statObject({ tenant_id, object_id: objectId });
      const receipt = prior ?? await storage.putObject({
        tenant_id,
        object_id: objectId,
        bytes: buffer,
        content_type: "application/json",
      });
      if (receipt?.sha256 !== digest) throw failure("DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH", "Webhook receipt hash changed", 503);
      return Object.freeze({ receipt_ref: `docusign-connect-receipt:${digest}`, sha256: digest, immutable: true });
    },
  });
}

export function createDocusignEnvelopeEventService({
  repository,
  connectionResolver,
  resolveSecret,
  adapter,
  receiptStore,
  artifactStore,
  clock = () => new Date(),
} = {}) {
  if (!repository || typeof repository.loadState !== "function" || typeof repository.replaceState !== "function") {
    throw new TypeError("DocuSign repository is required");
  }
  if (typeof connectionResolver !== "function") throw new TypeError("connectionResolver is required");
  if (typeof resolveSecret !== "function") throw new TypeError("resolveSecret is required");
  if (!adapter || typeof adapter.getStatus !== "function" || typeof adapter.downloadDocument !== "function") {
    throw new TypeError("DocuSign status adapter is required");
  }
  if (!receiptStore || typeof receiptStore.put !== "function") throw new TypeError("protected receiptStore is required");
  if (!artifactStore || typeof artifactStore.ingest !== "function") throw new TypeError("immutable artifactStore is required");

  return Object.freeze({
    async processWebhook({ headers = {}, raw_body } = {}) {
      const bytes = rawBytes(raw_body);
      const event = parseConnectEvent(bytes);
      const initialState = repository.loadState();
      const initialRequest = requestByEnvelope(initialState, event.envelope_id);
      if (!initialRequest) throw failure("DOCUSIGN_WEBHOOK_REJECTED", "DocuSign webhook was rejected", 401);
      const connection = await resolveBoundConnection({ request: initialRequest, connectionResolver });
      if (connection.account_id !== event.account_id || !connection.hmac_secret_ref) {
        throw failure("DOCUSIGN_WEBHOOK_REJECTED", "DocuSign webhook was rejected", 401);
      }
      const hmacSecret = await resolveSecret({
        tenant_id: initialRequest.tenant_id,
        ref: connection.hmac_secret_ref,
        purpose: "docusign_connect_hmac",
      });
      verifyDocusignConnectHmac({
        raw_body: bytes,
        signature: headerValue(headers, DOCUSIGN_CONNECT_SIGNATURE_HEADER),
        secret: hmacSecret,
      });
      const receiptHash = sha256(bytes);
      const receipt = await receiptStore.put({
        tenant_id: initialRequest.tenant_id,
        request_id: initialRequest.request_id,
        envelope_id: initialRequest.envelope_id,
        bytes,
        sha256: receiptHash,
      });
      if (receipt?.immutable !== true || receipt?.sha256 !== receiptHash) {
        throw failure("DOCUSIGN_WEBHOOK_RECEIPT_NOT_IMMUTABLE", "Webhook receipt was not stored immutably", 503);
      }

      const timestamp = nowIso(clock);
      const state = repository.loadState();
      const index = state.requests.findIndex((request) => request.tenant_id === initialRequest.tenant_id
        && request.request_id === initialRequest.request_id);
      if (index === -1) throw failure("DOCUSIGN_WEBHOOK_REJECTED", "DocuSign webhook was rejected", 401);
      const current = state.requests[index];
      const duplicate = current.event_hashes.includes(event.event_hash);
      const projected = duplicate ? { request: current, changed: false } : applyProviderStatus(current, event.status, timestamp);
      state.requests[index] = {
        ...projected.request,
        event_hashes: duplicate ? current.event_hashes : [...current.event_hashes, event.event_hash],
      };
      if (!state.webhook_receipts.some((item) => item.receipt_hash === receiptHash)) {
        state.webhook_receipts.push({
          receipt_hash: receiptHash,
          receipt_ref: requiredText(receipt.receipt_ref, "receipt_ref"),
          event_hash: event.event_hash,
          request_id: current.request_id,
          tenant_id: current.tenant_id,
          provider_status: event.status,
          occurred_at: event.occurred_at,
        });
      }
      const persisted = repository.replaceState(state);
      const request = requestById(persisted, current.tenant_id, current.request_id);
      if (event.status === "completed" && request.state === "completed_artifacts_pending") {
        return completeArtifacts({ repository, request, connection, adapter, artifactStore, clock });
      }
      return Object.freeze({
        outcome: duplicate ? "replayed" : projected.changed ? "processed" : "ignored",
        request: projectDocusignRequestSafe(request),
      });
    },

    async pollRequest({ principal = {}, request_id } = {}) {
      const tenantId = requiredText(principal.tenant_id, "principal.tenant_id");
      requiredText(principal.actor_id ?? principal.user_id, "principal.actor_id");
      const state = repository.loadState();
      let request = requestById(state, tenantId, requiredText(request_id, "request_id"));
      if (!request) throw failure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      if (!request.envelope_id) throw failure("DOCUSIGN_ENVELOPE_NOT_ASSIGNED", "DocuSign envelope is not assigned", 409);
      if (["completed", "declined", "voided", "provider_blocked"].includes(request.state)) {
        return Object.freeze({ outcome: "stable", request: projectDocusignRequestSafe(request) });
      }
      const now = new Date(nowIso(clock));
      if (request.last_poll_at) {
        const nextPoll = new Date(request.last_poll_at).getTime() + DOCUSIGN_MIN_POLL_INTERVAL_MS;
        if (now.getTime() < nextPoll) {
          return Object.freeze({ outcome: "deferred", next_poll_at: new Date(nextPoll).toISOString(), request: projectDocusignRequestSafe(request) });
        }
      }
      const connection = await resolveBoundConnection({ request, connectionResolver });
      request = replaceCurrentRequest(repository, tenantId, request.request_id, (fresh) => ({
        ...fresh,
        last_poll_at: now.toISOString(),
        updated_at: now.toISOString(),
      }));
      let providerStatus;
      try {
        providerStatus = requiredText((await adapter.getStatus({ connection, envelope_id: request.envelope_id }))?.status, "provider status").toLowerCase();
      } catch {
        request = replaceCurrentRequest(repository, tenantId, request.request_id, (fresh) => ({
          ...fresh,
          last_safe_error_code: "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE",
          updated_at: nowIso(clock),
        }));
        return Object.freeze({ outcome: "blocked", safe_error_code: "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE", request: projectDocusignRequestSafe(request) });
      }
      request = replaceCurrentRequest(repository, tenantId, request.request_id, (fresh) => applyProviderStatus(fresh, providerStatus, nowIso(clock)).request);
      if (providerStatus === "completed" && request.state === "completed_artifacts_pending") {
        return completeArtifacts({ repository, request, connection, adapter, artifactStore, clock });
      }
      return Object.freeze({ outcome: "processed", request: projectDocusignRequestSafe(request) });
    },
  });
}
