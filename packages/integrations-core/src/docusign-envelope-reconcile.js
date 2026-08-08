import { randomUUID } from "node:crypto";
import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import {
  docusignAccountBindingRef,
  docusignFailure,
  docusignInfrastructureFailure,
  docusignNow,
  docusignRequiredText,
  normalizeDocusignPrincipal,
  projectDocusignRequestSafe,
} from "./docusign-envelope-model.js";

const RECONCILIATION_LEASE_MS = 2 * 60 * 1000;

function indexOf(state, tenantId, requestId) {
  return state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
}

export function createDocusignReconciliationExecutor({ repository, connectionResolver, adapter, clock }) {
  const mutate = (tenantId, fn) => repository.transact({ tenant_id: tenantId }, fn);
  const assertLease = (request, token) => {
    if (request.state !== "reconciliation_required" || request.operation_lease?.kind !== "reconcile" || request.operation_lease?.token !== token || Date.parse(request.operation_lease.expires_at) <= Date.parse(docusignNow(clock))) {
      throw docusignInfrastructureFailure("DOCUSIGN_RECONCILIATION_LEASE_LOST");
    }
  };
  async function updateLease(tenantId, requestId, token, update) {
    return mutate(tenantId, (state) => {
      const index = indexOf(state, tenantId, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      assertLease(state.requests[index], token);
      state.requests[index] = update(state.requests[index]);
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
      if (request.requested_by_actor_id !== principal.actor_id) throw docusignFailure("DOCUSIGN_SEND_ACTOR_MISMATCH", "Only the approving actor may reconcile this request", 403);
      if (request.state !== "reconciliation_required") return { claimed: false, request };
      if (request.operation_lease && Date.parse(request.operation_lease.expires_at) > Date.parse(now)) return { claimed: false, request };
      state.requests[index] = {
        ...request,
        attempt_phase: "reconciling",
        operation_lease: { kind: "reconcile", token, acquired_at: now, expires_at: new Date(Date.parse(now) + RECONCILIATION_LEASE_MS).toISOString() },
        last_safe_error_code: null,
        updated_at: now,
      };
      return { claimed: true, token, request: state.requests[index] };
    });
  }

  return async function reconcileRequest(input = {}) {
    const principal = normalizeDocusignPrincipal(input.principal);
    if (input.explicit_human_action !== true) throw docusignFailure("DOCUSIGN_EXPLICIT_RECONCILE_REQUIRED", "Explicit human reconciliation action is required", 400);
    if (typeof adapter?.findByCorrelation !== "function") throw docusignInfrastructureFailure("DOCUSIGN_RECONCILIATION_UNAVAILABLE");
    const requestId = docusignRequiredText(input.request_id, "request_id");
    const claimed = await claim(principal, requestId);
    if (!claimed.claimed) return Object.freeze({ outcome: claimed.request.state === "reconciliation_required" ? "in_progress" : "replayed", request: projectDocusignRequestSafe(claimed.request) });
    let request = claimed.request;
    try {
      const connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: request.tenant_id, connection_id: request.connection_id }));
      if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id || docusignAccountBindingRef(connection) !== request.account_binding_ref) throw docusignFailure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 409);
      await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => fresh);
      const found = await adapter.findByCorrelation({ connection, provider_correlation_ref: request.provider_correlation_ref });
      const envelopeId = docusignRequiredText(found?.envelope_id, "provider envelope_id");
      if (found?.provider_correlation_ref !== request.provider_correlation_ref || (found?.account_id != null && found.account_id !== connection.account_id) || (request.envelope_id != null && request.envelope_id !== envelopeId)) throw docusignFailure("DOCUSIGN_RECONCILIATION_BINDING_INVALID", "Provider correlation did not match the request", 409);
      request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({
        ...fresh,
        envelope_id: envelopeId,
        attempt_phase: "reconciled",
        last_provider_status: found.status == null ? fresh.last_provider_status : docusignRequiredText(found.status, "provider status").toLowerCase(),
        last_safe_error_code: null,
        operation_lease: null,
        updated_at: docusignNow(clock),
      }));
      return Object.freeze({ outcome: "reconciled", request: projectDocusignRequestSafe(request) });
    } catch (error) {
      try {
        request = await updateLease(principal.tenant_id, requestId, claimed.token, (fresh) => ({ ...fresh, operation_lease: null, attempt_phase: "reconciliation_failed", last_safe_error_code: error?.safe_error_code ?? "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS", updated_at: docusignNow(clock) }));
      } catch (leaseError) {
        if (leaseError?.safe_error_code === "DOCUSIGN_RECONCILIATION_LEASE_LOST") throw leaseError;
        throw docusignInfrastructureFailure("DOCUSIGN_RECONCILIATION_UNAVAILABLE");
      }
      if ([400, 401, 403, 404, 409].includes(error?.status)) throw error;
      const unavailable = docusignInfrastructureFailure(error?.safe_error_code ?? "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS");
      unavailable.request = projectDocusignRequestSafe(request);
      throw unavailable;
    }
  };
}
