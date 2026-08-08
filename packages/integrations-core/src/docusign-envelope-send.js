import { createHash, randomUUID } from "node:crypto";
import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import {
  DOCUSIGN_STABLE_STATES,
  docusignAccountBindingRef,
  docusignFailure,
  docusignInfrastructureFailure,
  docusignNow,
  docusignRequiredText,
  normalizeDocusignPrincipal,
  projectDocusignRequestSafe,
} from "./docusign-envelope-model.js";

const SEND_LEASE_MS = 5 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 30 * 1000;
const PROVIDER_TIMEOUT_MARGIN_MS = 1 * 1000;

function indexOf(state, tenantId, requestId) {
  return state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
}

function providerFailure(error) {
  const status = Number(error?.provider_status);
  const deterministic = Number.isInteger(status) && status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status);
  return Object.freeze({
    state: deterministic ? "provider_blocked" : "reconciliation_required",
    safe_error_code: deterministic ? "DOCUSIGN_PROVIDER_REJECTED" : "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS",
  });
}

function dependencyError(error, code) {
  if ([401, 403].includes(error?.status)) return error;
  return docusignInfrastructureFailure(code);
}

function nextGeneration(request) {
  const generation = Number(request.operation_lease?.fencing_generation ?? request.provider_operation?.fencing_generation ?? 0);
  return Number.isSafeInteger(generation) && generation >= 0 ? generation + 1 : 1;
}

function operationIntent(request, kind, generation, now) {
  const leaseExpires = request.operation_lease?.expires_at;
  const deadlineMs = Math.max(Date.parse(now) + 1, Date.parse(leaseExpires ?? now) - PROVIDER_TIMEOUT_MARGIN_MS);
  return {
    kind,
    correlation_ref: request.provider_correlation_ref,
    fencing_generation: generation,
    started_at: now,
    deadline_at: new Date(deadlineMs).toISOString(),
    status: "pending",
  };
}

function actionKey(input) {
  return input.action_idempotency_key == null
    ? null
    : docusignRequiredText(input.action_idempotency_key, "action_idempotency_key");
}

function updateAction(request, action, key, patch) {
  return {
    ...request,
    action_idempotency: (request.action_idempotency ?? []).map((entry) => (
      entry.action === action && entry.key === key ? { ...entry, ...patch } : entry
    )),
  };
}

// DocuSign's callback SDK has no transport AbortSignal contract. This is a
// caller deadline only; a remote completion is recovered by correlation.
async function callWithCallerDeadline(operation, intent, clock) {
  const remaining = Date.parse(intent.deadline_at) - Date.parse(docusignNow(clock));
  const timeoutMs = Math.max(1, Math.min(PROVIDER_TIMEOUT_MS, remaining));
  let timer;
  const providerPromise = Promise.resolve().then(() => operation({ caller_timeout_ms: timeoutMs }));
  // The provider may complete remotely after the local timeout. Its durable correlation
  // intent is intentionally retained for reconciliation; consume late rejections.
  providerPromise.catch(() => {});
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error("DocuSign caller deadline exceeded; provider correlation recovery is required"), { provider_status: 408, provider_timeout: true, caller_timeout: true }));
    }, timeoutMs);
  });
  try {
    return await Promise.race([providerPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export function createDocusignSendExecutor({ repository, connectionResolver, artifactReader, recipientResolver, adapter, clock }) {
  const mutate = (tenantId, fn) => repository.transact({ tenant_id: tenantId }, fn);
  function assertLease(current, token, generation) {
    if (
      current.state !== "provider_pending"
      || current.operation_lease?.kind !== "send"
      || current.operation_lease?.token !== token
      || current.operation_lease?.fencing_generation !== generation
      || Date.parse(current.operation_lease.expires_at) <= Date.parse(docusignNow(clock))
    ) throw docusignInfrastructureFailure("DOCUSIGN_SEND_LEASE_LOST");
  }
  async function updateLease(tenantId, requestId, token, generation, update) {
    return mutate(tenantId, (state) => {
      const index = indexOf(state, tenantId, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      const current = state.requests[index];
      assertLease(current, token, generation);
      state.requests[index] = update(current);
      return state.requests[index];
    });
  }
  async function beginProviderOperation(tenantId, requestId, token, generation, kind) {
    return updateLease(tenantId, requestId, token, generation, (fresh) => {
      const now = docusignNow(clock);
      return { ...fresh, provider_operation: operationIntent(fresh, kind, generation, now), attempt_phase: kind === "create_draft" ? "creating" : "sending", updated_at: now };
    });
  }
  async function releaseProviderFailure(tenantId, requestId, token, generation, classified, phase, actionIdempotencyKey) {
    return updateLease(tenantId, requestId, token, generation, (fresh) => {
      const updated = updateAction(fresh, "send", actionIdempotencyKey, {
        status: classified.state === "reconciliation_required" ? "unknown" : "failed",
        safe_error_code: classified.safe_error_code,
        updated_at: docusignNow(clock),
      });
      return {
        ...updated,
        state: classified.state,
        attempt_phase: phase,
        operation_lease: null,
        provider_operation: fresh.provider_operation ? { ...fresh.provider_operation, status: classified.state === "reconciliation_required" ? "unknown" : "failed" } : null,
        last_safe_error_code: classified.safe_error_code,
        updated_at: docusignNow(clock),
      };
    });
  }

  async function claim(principal, requestId, actionIdempotencyKey) {
    const token = randomUUID();
    const now = docusignNow(clock);
    return mutate(principal.tenant_id, (state) => {
      const index = indexOf(state, principal.tenant_id, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      const request = state.requests[index];
      if (request.requested_by_actor_id !== principal.actor_id) throw docusignFailure("DOCUSIGN_SEND_ACTOR_MISMATCH", "Only the approving actor may send this request", 403);
      const conflicting = state.requests
        .flatMap((item) => item.action_idempotency ?? [])
        .find((entry) => actionIdempotencyKey && entry.key === actionIdempotencyKey
          && (entry.action !== "send" || entry.actor_id !== principal.actor_id || entry.request_id !== requestId));
      if (conflicting) throw docusignFailure("DOCUSIGN_ACTION_IDEMPOTENCY_CONFLICT", "Action idempotency key is bound to a different actor, request, or action", 409);
      const replay = actionIdempotencyKey
        ? (request.action_idempotency ?? []).find((entry) => entry.action === "send" && entry.key === actionIdempotencyKey)
        : null;
      if (replay) {
        if (request.state === "provider_pending"
          && (!request.operation_lease || Date.parse(request.operation_lease.expires_at) <= Date.parse(now))) {
          const recovered = updateAction({ ...request, state: "reconciliation_required", operation_lease: null, last_safe_error_code: "DOCUSIGN_INTERRUPTED_ATTEMPT", updated_at: now }, "send", actionIdempotencyKey, { status: "unknown", safe_error_code: "DOCUSIGN_INTERRUPTED_ATTEMPT", updated_at: now });
          state.requests[index] = recovered;
          return { claimed: false, request: recovered, replayed: true };
        }
        if (request.state === "draft_created" && ["unknown", "failed"].includes(replay.status)) {
          const generation = nextGeneration(request);
          state.requests[index] = {
            ...updateAction(request, "send", actionIdempotencyKey, { status: "in_progress", safe_error_code: null, updated_at: now }),
            state: "provider_pending",
            attempt_phase: "sending",
            last_safe_error_code: null,
            operation_lease: { kind: "send", token, fencing_generation: generation, acquired_at: now, expires_at: new Date(Date.parse(now) + SEND_LEASE_MS).toISOString() },
            updated_at: now,
          };
          return { claimed: true, token, generation, existingDraft: true, request: state.requests[index] };
        }
        return { claimed: false, request, replayed: true };
      }
      if (DOCUSIGN_STABLE_STATES.has(request.state)) return { claimed: false, request };
      if (request.state === "reconciliation_required") return { claimed: false, request };
      if (request.state === "provider_pending") {
        if (request.operation_lease && Date.parse(request.operation_lease.expires_at) > Date.parse(now)) return { claimed: false, request };
        state.requests[index] = { ...request, state: "reconciliation_required", operation_lease: null, last_safe_error_code: "DOCUSIGN_INTERRUPTED_ATTEMPT", updated_at: now };
        return { claimed: false, request: state.requests[index] };
      }
      const existingDraft = request.state === "draft_created" && Boolean(request.envelope_id);
      if (!existingDraft && request.state !== "approved") throw docusignFailure("DOCUSIGN_REQUEST_NOT_APPROVED", "DocuSign request is not approved", 409);
      const generation = nextGeneration(request);
      state.requests[index] = {
        ...request,
        action_idempotency: actionIdempotencyKey
          ? [...(request.action_idempotency ?? []), {
            action: "send", key: actionIdempotencyKey, actor_id: principal.actor_id, request_id: requestId,
            status: "in_progress", safe_error_code: null, created_at: now, updated_at: now,
          }]
          : request.action_idempotency ?? [],
        state: "provider_pending",
        attempt_phase: existingDraft ? "sending" : "creating",
        last_safe_error_code: null,
        operation_lease: { kind: "send", token, fencing_generation: generation, acquired_at: now, expires_at: new Date(Date.parse(now) + SEND_LEASE_MS).toISOString() },
        updated_at: now,
      };
      return { claimed: true, token, generation, existingDraft, request: state.requests[index] };
    });
  }

  return async function sendApprovedRequest(input = {}) {
    const principal = normalizeDocusignPrincipal(input.principal);
    if (input.explicit_human_action !== true) throw docusignFailure("DOCUSIGN_EXPLICIT_SEND_REQUIRED", "Explicit human send action is required", 400);
    const requestId = docusignRequiredText(input.request_id, "request_id");
    const actionIdempotencyKey = actionKey(input);
    const claimed = await claim(principal, requestId, actionIdempotencyKey);
    if (!claimed.claimed) return Object.freeze({ outcome: claimed.request.state === "provider_pending" ? "in_progress" : "replayed", request: projectDocusignRequestSafe(claimed.request) });
    let request = claimed.request;
    let connection;
    let artifactBytes;
    const signers = [];
    try {
      connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: request.tenant_id, connection_id: request.connection_id }));
      if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id) throw docusignFailure("DOCUSIGN_CONNECTION_SCOPE_INVALID", "DocuSign connection scope does not match request", 403);
      if (docusignAccountBindingRef(connection) !== request.account_binding_ref) throw docusignFailure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 409);
      if (!claimed.existingDraft) {
        const artifactBinding = {
          tenant_id: request.tenant_id, matter_id: request.matter_id, workspace_id: request.document.workspace_id,
          artifact_id: request.document.artifact_id, document_id: request.document.document_id,
          version_id: request.document.version_id, sha256: request.document.sha256,
          approval_receipt_ref: request.document.approval_receipt_ref,
          permission_envelope_id: request.document.permission_envelope_id,
          audit_trace_id: request.document.audit_trace_id,
        };
        const artifact = await artifactReader(artifactBinding);
        for (const [field, expected] of Object.entries(artifactBinding)) {
          if (artifact?.[field] !== expected) throw docusignFailure("DOCUSIGN_ARTIFACT_SCOPE_INVALID", "Approved artifact scope does not match request", 403);
        }
        artifactBytes = Buffer.isBuffer(artifact?.bytes) ? Buffer.from(artifact.bytes) : Buffer.from(artifact?.bytes ?? []);
        if (createHash("sha256").update(artifactBytes).digest("hex") !== request.document.sha256) throw docusignFailure("DOCUSIGN_DOCUMENT_HASH_CHANGED", "Approved document hash changed", 409);
        for (const recipient of request.recipient_snapshot) {
          const resolved = await recipientResolver({ tenant_id: request.tenant_id, recipient_ref: recipient.recipient_ref, role: recipient.role });
          if (resolved?.tenant_id !== request.tenant_id || resolved?.recipient_ref !== recipient.recipient_ref) throw docusignFailure("DOCUSIGN_RECIPIENT_SCOPE_INVALID", "Recipient does not match server tenant", 403);
          signers.push({ ...recipient, name: resolved.name, email: resolved.email });
        }
      }
    } catch (error) {
      try {
        await updateLease(principal.tenant_id, requestId, claimed.token, claimed.generation, (fresh) => ({ ...updateAction(fresh, "send", actionIdempotencyKey, { status: "failed", safe_error_code: error?.safe_error_code ?? "DOCUSIGN_DEPENDENCY_UNAVAILABLE", updated_at: docusignNow(clock) }), state: "approved", attempt_phase: null, operation_lease: null, provider_operation: null, last_safe_error_code: error?.safe_error_code ?? "DOCUSIGN_DEPENDENCY_UNAVAILABLE", updated_at: docusignNow(clock) }));
      } catch (leaseError) {
        if (leaseError?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST") throw leaseError;
        throw dependencyError(leaseError, "DOCUSIGN_DEPENDENCY_UNAVAILABLE");
      }
      throw dependencyError(error, error?.safe_error_code ?? "DOCUSIGN_DEPENDENCY_UNAVAILABLE");
    }
    let envelope;
    if (!claimed.existingDraft) {
      try {
        request = await beginProviderOperation(principal.tenant_id, requestId, claimed.token, claimed.generation, "create_draft");
        envelope = await callWithCallerDeadline((options) => adapter.createDraft({ connection, document: { ...request.document, bytes: artifactBytes }, signers, anchor_manifest: request.anchor_manifest, provider_correlation_ref: request.provider_correlation_ref, ...options }), request.provider_operation, clock);
      } catch (error) {
        const classified = providerFailure(error);
        try {
          request = await releaseProviderFailure(principal.tenant_id, requestId, claimed.token, claimed.generation, classified, "create_failed", actionIdempotencyKey);
        } catch (leaseError) {
          if (leaseError?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST") throw leaseError;
          throw docusignInfrastructureFailure("DOCUSIGN_DEPENDENCY_UNAVAILABLE");
        }
        if (classified.state === "reconciliation_required") {
          const unavailable = docusignInfrastructureFailure(classified.safe_error_code);
          unavailable.request = projectDocusignRequestSafe(request);
          throw unavailable;
        }
        return Object.freeze({ outcome: "blocked", request: projectDocusignRequestSafe(request), safe_error_code: classified.safe_error_code });
      }
      try {
        request = await updateLease(principal.tenant_id, requestId, claimed.token, claimed.generation, (fresh) => ({ ...fresh, envelope_id: docusignRequiredText(envelope?.envelope_id, "provider envelope_id"), provider_operation: null, attempt_phase: "draft_persisted", updated_at: docusignNow(clock) }));
      } catch (error) {
        if (error?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST") throw error;
        throw docusignInfrastructureFailure("DOCUSIGN_CREATE_PERSIST_FAILED");
      }
    }
    try {
      request = await beginProviderOperation(principal.tenant_id, requestId, claimed.token, claimed.generation, "send");
      await callWithCallerDeadline((options) => adapter.send({ connection, envelope_id: request.envelope_id, ...options }), request.provider_operation, clock);
    } catch (error) {
      const classified = providerFailure(error);
      try {
        request = await releaseProviderFailure(principal.tenant_id, requestId, claimed.token, claimed.generation, classified, "send_failed", actionIdempotencyKey);
      } catch (leaseError) {
        if (leaseError?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST") throw leaseError;
        throw docusignInfrastructureFailure("DOCUSIGN_DEPENDENCY_UNAVAILABLE");
      }
      if (classified.state === "reconciliation_required") {
        const unavailable = docusignInfrastructureFailure(classified.safe_error_code);
        unavailable.request = projectDocusignRequestSafe(request);
        throw unavailable;
      }
      return Object.freeze({ outcome: "blocked", request: projectDocusignRequestSafe(request), safe_error_code: classified.safe_error_code });
    }
    request = await updateLease(principal.tenant_id, requestId, claimed.token, claimed.generation, (fresh) => ({ ...updateAction(fresh, "send", actionIdempotencyKey, { status: "succeeded", safe_error_code: null, updated_at: docusignNow(clock) }), state: "sent", attempt_phase: "sent", operation_lease: null, provider_operation: null, last_provider_status: "sent", updated_at: docusignNow(clock) }));
    return Object.freeze({ outcome: "sent", request: projectDocusignRequestSafe(request) });
  };
}
