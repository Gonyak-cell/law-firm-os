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

export function createDocusignSendExecutor({ repository, connectionResolver, artifactReader, recipientResolver, adapter, clock }) {
  const mutate = (tenantId, fn) => repository.transact({ tenant_id: tenantId }, fn);
  async function updateLease(tenantId, requestId, token, update) {
    return mutate(tenantId, (state) => {
      const index = indexOf(state, tenantId, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      const current = state.requests[index];
      if (current.operation_lease?.token !== token) throw docusignInfrastructureFailure("DOCUSIGN_SEND_LEASE_LOST");
      state.requests[index] = update(current);
      return state.requests[index];
    });
  }

  async function claim(principal, requestId) {
    const token = randomUUID();
    const now = docusignNow(clock);
    return mutate(principal.tenant_id, (state) => {
      const index = indexOf(state, principal.tenant_id, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      const request = state.requests[index];
      if (request.requested_by_actor_id !== principal.actor_id) throw docusignFailure("DOCUSIGN_SEND_ACTOR_MISMATCH", "Only the approving actor may send this request", 403);
      if (DOCUSIGN_STABLE_STATES.has(request.state)) return { claimed: false, request };
      if (request.state === "provider_pending") {
        if (request.operation_lease && Date.parse(request.operation_lease.expires_at) > Date.parse(now)) return { claimed: false, request };
        state.requests[index] = { ...request, state: "reconciliation_required", operation_lease: null, last_safe_error_code: "DOCUSIGN_INTERRUPTED_ATTEMPT", updated_at: now };
        return { claimed: false, request: state.requests[index] };
      }
      if (request.state !== "approved") throw docusignFailure("DOCUSIGN_REQUEST_NOT_APPROVED", "DocuSign request is not approved", 409);
      state.requests[index] = {
        ...request, state: "provider_pending", attempt_phase: "creating", last_safe_error_code: null,
        operation_lease: { kind: "send", token, acquired_at: now, expires_at: new Date(Date.parse(now) + SEND_LEASE_MS).toISOString() }, updated_at: now,
      };
      return { claimed: true, token, request: state.requests[index] };
    });
  }

  return async function sendApprovedRequest(input = {}) {
    const principal = normalizeDocusignPrincipal(input.principal);
    if (input.explicit_human_action !== true) throw docusignFailure("DOCUSIGN_EXPLICIT_SEND_REQUIRED", "Explicit human send action is required", 400);
    const requestId = docusignRequiredText(input.request_id, "request_id");
    const claimed = await claim(principal, requestId);
    if (!claimed.claimed) return Object.freeze({ outcome: claimed.request.state === "provider_pending" ? "in_progress" : "replayed", request: projectDocusignRequestSafe(claimed.request) });
    let request = claimed.request;
    let connection;
    let artifactBytes;
    const signers = [];
    try {
      connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: request.tenant_id, connection_id: request.connection_id }));
      if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id) throw docusignFailure("DOCUSIGN_CONNECTION_SCOPE_INVALID", "DocuSign connection scope does not match request", 403);
      if (docusignAccountBindingRef(connection) !== request.account_binding_ref) throw docusignFailure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 409);
      const artifact = await artifactReader({ tenant_id: request.tenant_id, matter_id: request.matter_id, document_id: request.document.document_id, version_id: request.document.version_id });
      artifactBytes = Buffer.isBuffer(artifact?.bytes) ? Buffer.from(artifact.bytes) : Buffer.from(artifact?.bytes ?? []);
      if (createHash("sha256").update(artifactBytes).digest("hex") !== request.document.sha256) throw docusignFailure("DOCUSIGN_DOCUMENT_HASH_CHANGED", "Approved document hash changed", 409);
      for (const recipient of request.recipient_snapshot) {
        const resolved = await recipientResolver({ tenant_id: request.tenant_id, recipient_ref: recipient.recipient_ref, role: recipient.role });
        if (resolved?.tenant_id !== request.tenant_id || resolved?.recipient_ref !== recipient.recipient_ref) throw docusignFailure("DOCUSIGN_RECIPIENT_SCOPE_INVALID", "Recipient does not match server tenant", 403);
        signers.push({ ...recipient, name: resolved.name, email: resolved.email });
      }
    } catch (error) {
      await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, state: "approved", attempt_phase: null, operation_lease: null, last_safe_error_code: error?.safe_error_code ?? "DOCUSIGN_DEPENDENCY_UNAVAILABLE", updated_at: docusignNow(clock) }));
      throw dependencyError(error, error?.safe_error_code ?? "DOCUSIGN_DEPENDENCY_UNAVAILABLE");
    }
    let envelope;
    try {
      envelope = await adapter.createDraft({ connection, document: { ...request.document, bytes: artifactBytes }, signers, anchor_manifest: request.anchor_manifest });
    } catch (error) {
      const classified = providerFailure(error);
      request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, state: classified.state, attempt_phase: "create_failed", operation_lease: null, last_safe_error_code: classified.safe_error_code, updated_at: docusignNow(clock) }));
      if (classified.state === "reconciliation_required") {
        const unavailable = docusignInfrastructureFailure(classified.safe_error_code);
        unavailable.request = projectDocusignRequestSafe(request);
        throw unavailable;
      }
      return Object.freeze({ outcome: "blocked", request: projectDocusignRequestSafe(request), safe_error_code: classified.safe_error_code });
    }
    try {
      request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, envelope_id: docusignRequiredText(envelope?.envelope_id, "provider envelope_id"), attempt_phase: "draft_persisted", updated_at: docusignNow(clock) }));
    } catch {
      throw docusignInfrastructureFailure("DOCUSIGN_CREATE_PERSIST_FAILED");
    }
    request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, attempt_phase: "sending", updated_at: docusignNow(clock) }));
    try {
      await adapter.send({ connection, envelope_id: request.envelope_id });
    } catch (error) {
      const classified = providerFailure(error);
      request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, state: classified.state, attempt_phase: "send_failed", operation_lease: null, last_safe_error_code: classified.safe_error_code, updated_at: docusignNow(clock) }));
      if (classified.state === "reconciliation_required") {
        const unavailable = docusignInfrastructureFailure(classified.safe_error_code);
        unavailable.request = projectDocusignRequestSafe(request);
        throw unavailable;
      }
      return Object.freeze({ outcome: "blocked", request: projectDocusignRequestSafe(request), safe_error_code: classified.safe_error_code });
    }
    request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, state: "sent", attempt_phase: "sent", operation_lease: null, last_provider_status: "sent", updated_at: docusignNow(clock) }));
    return Object.freeze({ outcome: "sent", request: projectDocusignRequestSafe(request) });
  };
}
