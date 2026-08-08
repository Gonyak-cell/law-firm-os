import { randomUUID } from "node:crypto";
import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import {
  docusignAccountBindingRef,
  docusignFailure,
  docusignInfrastructureFailure,
  docusignNow,
  docusignRequiredText,
  normalizeDocusignAuditLineage,
  normalizeDocusignPrincipal,
  projectDocusignRequestSafe,
} from "./docusign-envelope-model.js";

const RECONCILIATION_LEASE_MS = 2 * 60 * 1000;
const RECONCILIATION_TIMEOUT_MS = 30 * 1000;
const RECONCILIATION_TIMEOUT_MARGIN_MS = 1 * 1000;
const RECONCILABLE_STATES = new Set(["reconciliation_required", "draft_created", "sent", "delivered", "completed_artifacts_pending"]);
const STATE_RANK = Object.freeze({ approved: 1, provider_pending: 2, reconciliation_required: 2, draft_created: 3, sent: 4, delivered: 5, completed_artifacts_pending: 6, completed: 7, declined: 8, voided: 8, provider_blocked: 9 });
const PROVIDER_STATE = Object.freeze({ created: "draft_created", draft: "draft_created", draft_created: "draft_created", sent: "sent", delivered: "delivered", completed: "completed_artifacts_pending", declined: "declined", voided: "voided" });

function indexOf(state, tenantId, requestId) {
  return state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
}

function nextGeneration(request) {
  const generation = Number(request.operation_lease?.fencing_generation ?? request.provider_operation?.fencing_generation ?? 0);
  return Number.isSafeInteger(generation) && generation >= 0 ? generation + 1 : 1;
}

function providerState(found) {
  const status = docusignRequiredText(found?.status ?? "created", "provider status").toLowerCase();
  const state = PROVIDER_STATE[status];
  if (!state) throw docusignFailure("DOCUSIGN_PROVIDER_STATUS_UNSUPPORTED", "Provider status cannot be reconciled", 409);
  return { status, state };
}

async function callWithDeadline(operation, lease, clock) {
  const remaining = Date.parse(lease.expires_at) - Date.parse(docusignNow(clock)) - RECONCILIATION_TIMEOUT_MARGIN_MS;
  const timeoutMs = Math.max(1, Math.min(RECONCILIATION_TIMEOUT_MS, remaining));
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timer;
  const providerPromise = Promise.resolve().then(() => operation({ signal: controller?.signal, timeout_ms: timeoutMs }));
  providerPromise.catch(() => {});
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => { controller?.abort(); reject(Object.assign(new Error("DocuSign reconciliation deadline exceeded"), { provider_status: 408 })); }, timeoutMs);
  });
  try { return await Promise.race([providerPromise, timeoutPromise]); } finally { clearTimeout(timer); }
}

export function createDocusignReconciliationExecutor({ repository, connectionResolver, adapter, clock }) {
  const mutate = (tenantId, fn) => repository.transact({ tenant_id: tenantId }, fn);
  const assertLease = (request, token, generation) => {
    if (
      !RECONCILABLE_STATES.has(request.state)
      || request.operation_lease?.kind !== "reconcile"
      || request.operation_lease?.token !== token
      || request.operation_lease?.fencing_generation !== generation
      || Date.parse(request.operation_lease.expires_at) <= Date.parse(docusignNow(clock))
    ) throw docusignInfrastructureFailure("DOCUSIGN_RECONCILIATION_LEASE_LOST");
  };
  async function updateLease(tenantId, requestId, token, generation, update) {
    return mutate(tenantId, (state) => {
      const index = indexOf(state, tenantId, requestId);
      if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
      assertLease(state.requests[index], token, generation);
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
      if (!RECONCILABLE_STATES.has(request.state)) return { claimed: false, request };
      if (request.operation_lease && Date.parse(request.operation_lease.expires_at) > Date.parse(now)) return { claimed: false, request };
      const generation = nextGeneration(request);
      state.requests[index] = {
        ...request,
        attempt_phase: "reconciling",
        operation_lease: { kind: "reconcile", token, fencing_generation: generation, acquired_at: now, expires_at: new Date(Date.parse(now) + RECONCILIATION_LEASE_MS).toISOString() },
        last_safe_error_code: null,
        updated_at: now,
      };
      return { claimed: true, token, generation, request: state.requests[index] };
    });
  }

  return async function reconcileRequest(input = {}) {
    const principal = normalizeDocusignPrincipal(input.principal);
    if (input.explicit_human_action !== true) throw docusignFailure("DOCUSIGN_EXPLICIT_RECONCILE_REQUIRED", "Explicit human reconciliation action is required", 400);
    if (typeof adapter?.findByCorrelation !== "function") throw docusignInfrastructureFailure("DOCUSIGN_RECONCILIATION_UNAVAILABLE");
    const requestId = docusignRequiredText(input.request_id, "request_id");
    const claimed = await claim(principal, requestId);
    if (!claimed.claimed) {
      const outcome = claimed.request.state === "reconciliation_required" ? "in_progress" : "already_converged";
      return Object.freeze({ outcome, request: projectDocusignRequestSafe(claimed.request) });
    }
    let request = claimed.request;
    try {
      const connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: request.tenant_id, connection_id: request.connection_id }));
      if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id || docusignAccountBindingRef(connection) !== request.account_binding_ref) throw docusignFailure("DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", 409);
      const correlationRef = request.provider_operation?.correlation_ref ?? request.provider_correlation_ref;
      const found = await callWithDeadline((options) => adapter.findByCorrelation({ connection, provider_correlation_ref: correlationRef, ...options }), request.operation_lease, clock);
      const envelopeId = docusignRequiredText(found?.envelope_id, "provider envelope_id");
      if (found?.provider_correlation_ref !== correlationRef || found?.account_id !== connection.account_id || (found?.tenant_id != null && found.tenant_id !== connection.tenant_id) || (request.envelope_id != null && request.envelope_id !== envelopeId)) {
        throw docusignFailure("DOCUSIGN_RECONCILIATION_BINDING_INVALID", "Provider correlation did not match the request", 409);
      }
      const { status, state: providerTarget } = providerState(found);
      const currentRank = STATE_RANK[request.state] ?? -1;
      const targetRank = STATE_RANK[providerTarget] ?? -1;
      const effectiveState = targetRank < currentRank ? request.state : providerTarget;
      const effectiveStatus = targetRank < currentRank ? (request.last_provider_status ?? status) : status;
      const wasConverged = request.state === effectiveState && request.envelope_id === envelopeId && request.last_provider_status === effectiveStatus;
      request = await updateLease(principal.tenant_id, requestId, claimed.token, claimed.generation, (fresh) => {
        const currentRank = STATE_RANK[fresh.state] ?? -1;
        const targetRank = STATE_RANK[providerTarget] ?? -1;
        const nextState = targetRank < currentRank ? fresh.state : providerTarget;
        const nextStatus = targetRank < currentRank ? (fresh.last_provider_status ?? status) : status;
        const moved = nextState !== fresh.state || fresh.envelope_id !== envelopeId || fresh.last_provider_status !== nextStatus;
        const lineage = moved
          ? normalizeDocusignAuditLineage([...(fresh.audit_lineage ?? []), { event: `provider_reconciled:${status}`, audit_trace_id: fresh.document.audit_trace_id, actor_id: fresh.requested_by_actor_id, occurred_at: docusignNow(clock) }])
          : fresh.audit_lineage;
        return {
          ...fresh,
          state: nextState,
          envelope_id: envelopeId,
          attempt_phase: nextState === "draft_created" ? "ready_to_send" : nextState,
          last_provider_status: nextStatus,
          last_safe_error_code: null,
          operation_lease: null,
          provider_operation: null,
          audit_lineage: lineage,
          updated_at: docusignNow(clock),
        };
      });
      const localState = projectDocusignRequestSafe(request);
      return Object.freeze({ outcome: wasConverged ? "already_converged" : "reconciled", request: localState });
    } catch (error) {
      try {
        request = await updateLease(principal.tenant_id, requestId, claimed.token, claimed.generation, (fresh) => ({
          ...fresh,
          operation_lease: null,
          provider_operation: fresh.provider_operation ? { ...fresh.provider_operation, status: "unknown" } : null,
          attempt_phase: "reconciliation_failed",
          last_safe_error_code: error?.safe_error_code ?? "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS",
          updated_at: docusignNow(clock),
        }));
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
