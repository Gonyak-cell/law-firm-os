import { assertNoForbiddenProjection, projectReadinessRecord, redactLcxFullValue } from "./readinessModel.js";

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;
const ISO_DATE_FLOOR = "2000-01-01T00:00:00.000Z";

function safeRef(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const ref = value.trim();
  return SAFE_REF_PATTERN.test(ref) ? ref : fallback;
}

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function safeHash(value) {
  const source = JSON.stringify(redactLcxFullValue(value));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createApprovalRequest(input = {}) {
  return Object.freeze({
    approval_request_id: safeRef(input.approval_request_id, `approval:${safeHash(input).slice(0, 16)}`),
    actor_ref: safeRef(input.actor_ref, "actor:unknown"),
    object_ref: safeRef(input.object_ref, "object:unknown"),
    reason_ref: safeRef(input.reason_ref, "reason:required"),
    approval_scope: safeRef(input.approval_scope, "scope:unspecified"),
    approval_state: "requested",
    owner_receipt_ref: "",
    audit_events: Object.freeze([
      {
        event_ref: `audit:approval-request:${safeHash(input).slice(0, 12)}`,
        action: "approval_requested",
        actor_ref: safeRef(input.actor_ref, "actor:unknown"),
        object_ref: safeRef(input.object_ref, "object:unknown")
      }
    ]),
    owner_approval_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function decideApprovalRequest(request, decision = {}) {
  const action = decision.action;
  if (action === "expire") {
    return Object.freeze({
      ...request,
      approval_state: "expired",
      owner_approval_claim: false,
      audit_events: Object.freeze([...request.audit_events, { event_ref: `audit:approval-expired:${request.approval_request_id}`, action: "approval_expired" }])
    });
  }

  if (action !== "approve" && action !== "reject") {
    return Object.freeze({ ...request, transition_allowed: false, blocked_reason: "unknown_approval_decision" });
  }

  const humanReceipt = safeRef(decision.owner_receipt_ref);
  const decidedBy = safeRef(decision.decided_by_ref);
  if (action === "approve" && (!humanReceipt || !decidedBy || decision.inferred_by === "agent")) {
    return Object.freeze({
      ...request,
      transition_allowed: false,
      blocked_reason: "human_owner_receipt_required",
      owner_approval_claim: false
    });
  }

  return Object.freeze({
    ...request,
    approval_state: action === "approve" ? "approved" : "rejected",
    owner_receipt_ref: action === "approve" ? humanReceipt : "",
    transition_allowed: true,
    owner_approval_claim: action === "approve" ? "receipt_recorded_not_launch_approval" : false,
    audit_events: Object.freeze([
      ...request.audit_events,
      {
        event_ref: `audit:approval-${action}:${request.approval_request_id}`,
        action: `approval_${action}d`,
        actor_ref: decidedBy || "actor:unknown",
        object_ref: request.object_ref
      }
    ])
  });
}

export function projectConnectorReceipt(input = {}) {
  const env = input.environment === "production" ? "production" : "sandbox";
  const expiresAt = typeof input.expires_at === "string" ? input.expires_at : ISO_DATE_FLOOR;
  return Object.freeze(redactLcxFullValue({
    connector_receipt_id: safeRef(input.connector_receipt_id, "receipt:missing"),
    provider_ref: safeRef(input.provider_ref, "provider:unknown"),
    environment: env,
    scopes: Array.isArray(input.scopes) ? input.scopes.map((scope) => safeRef(scope)).filter(Boolean) : [],
    expires_at: expiresAt,
    revoked_at: input.revoked_at ? safeRef(input.revoked_at, "") : "",
    receipt_state: env === "production" && input.production_receipt_ref ? "production_recorded" : input.sandbox_receipt_ref ? "sandbox_recorded" : "missing",
    sandbox_receipt_ref: safeRef(input.sandbox_receipt_ref),
    production_receipt_ref: safeRef(input.production_receipt_ref),
    payload_included: false,
    private_material_included: false,
    provider_production_write_claim: false
  }));
}

export function evaluateProviderReceipt({ receipt, requiredScope, productionRequired = true, now = new Date() } = {}) {
  const projected = projectConnectorReceipt(receipt ?? {});
  if (projected.receipt_state === "missing") return Object.freeze({ allowed: false, reason: "provider_receipt_missing", receipt: projected });
  if (productionRequired && projected.receipt_state !== "production_recorded") {
    return Object.freeze({ allowed: false, reason: "production_provider_receipt_required", receipt: projected });
  }
  if (projected.revoked_at) return Object.freeze({ allowed: false, reason: "provider_receipt_revoked", receipt: projected });
  if (new Date(projected.expires_at).getTime() <= new Date(now).getTime()) {
    return Object.freeze({ allowed: false, reason: "provider_receipt_expired", receipt: projected });
  }
  if (requiredScope && !projected.scopes.includes(requiredScope)) {
    return Object.freeze({ allowed: false, reason: "provider_receipt_scope_missing", receipt: projected });
  }
  return Object.freeze({ allowed: true, reason: "provider_receipt_valid", receipt: projected });
}

export function createExecutionRun(input = {}) {
  const safeInput = redactLcxFullValue(input.safe_input ?? {});
  const projectionSafety = assertNoForbiddenProjection(safeInput);
  return Object.freeze({
    execution_run_id: safeRef(input.execution_run_id, `run:${safeHash(input).slice(0, 16)}`),
    idempotency_key_ref: safeRef(input.idempotency_key_ref, `idem:${safeHash(input).slice(0, 16)}`),
    run_state: "not_started",
    safe_input_hash: safeHash(safeInput),
    safe_input_projection: projectionSafety.valid ? safeInput : projectReadinessRecord({ id: "unsafe-input-blocked" }),
    mutation_count: 0,
    external_mutation_performed: false,
    audit_events: Object.freeze([])
  });
}

export function advanceExecutionRun(run, action = {}, registry = new Map()) {
  if (action.step === "dry_run") {
    return Object.freeze({
      ...run,
      run_state: "dry_run_passed",
      audit_events: Object.freeze([...run.audit_events, { event_ref: `audit:run-dry:${run.execution_run_id}`, action: "dry_run_passed" }])
    });
  }

  if (action.step === "rollback") {
    return Object.freeze({
      ...run,
      run_state: "rolled_back",
      rollback_report: Object.freeze({ safe_error_code: action.safe_error_code ?? "operator_requested_rollback" }),
      audit_events: Object.freeze([...run.audit_events, { event_ref: `audit:run-rollback:${run.execution_run_id}`, action: "run_rolled_back" }])
    });
  }

  if (action.step !== "execute") return Object.freeze({ ...run, transition_allowed: false, blocked_reason: "unknown_run_step" });
  if (registry.has(run.idempotency_key_ref)) {
    return Object.freeze({ ...run, transition_allowed: false, duplicate: true, blocked_reason: "duplicate_idempotency_key" });
  }

  const approvalReady = action.approval?.approval_state === "approved" && Boolean(action.approval?.owner_receipt_ref);
  const providerReady = action.production_provider_required === false
    ? { allowed: true, reason: "provider_not_required" }
    : evaluateProviderReceipt({
        receipt: action.provider_receipt,
        requiredScope: action.required_provider_scope,
        productionRequired: true,
        now: action.now
      });
  if (!approvalReady || !providerReady.allowed || action.allow_synthetic_execute !== true) {
    return Object.freeze({
      ...run,
      run_state: "execute_blocked",
      transition_allowed: false,
      blocked_reason: !approvalReady ? "owner_approval_required" : providerReady.reason,
      audit_events: Object.freeze([...run.audit_events, { event_ref: `audit:run-blocked:${run.execution_run_id}`, action: "execute_blocked" }])
    });
  }

  registry.set(run.idempotency_key_ref, true);
  return Object.freeze({
    ...run,
    run_state: "executed",
    transition_allowed: true,
    mutation_count: 1,
    external_mutation_performed: false,
    audit_events: Object.freeze([...run.audit_events, { event_ref: `audit:run-executed:${run.execution_run_id}`, action: "run_executed_synthetic" }])
  });
}
