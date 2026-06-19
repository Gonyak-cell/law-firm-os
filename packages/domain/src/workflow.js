import { getOwnerModule } from "./ownership.js";
import { assembleCoreDomainServiceIntake } from "./service.js";
import { validateCoreDomainRecord } from "./validators.js";

export const CORE_DOMAIN_WORKFLOW_PACK_BINDING = Object.freeze({
  pack_id: "CP00-096",
  planned_pack_id: "CP00-096",
  risk_class: "B",
  unit_count: 40,
  range: "RP01.P02.M04.S07-RP01.P02.M06.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
});

export const CORE_DOMAIN_WORKFLOW_CONTRACT = Object.freeze({
  pack_id: "CP00-096",
  workflow_id: "core_domain_synthetic_workflow",
  source_unit_range: "RP01.P02.M04.S07-RP01.P02.M06.S06",
  accepts_real_client_data: false,
  writes_product_state: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  persistence_boundary: "synthetic_fixture_only",
  blocked_path_policy: "prechecks are canonicalized through routed->blocked before rollback planning",
  states: Object.freeze(["requested", "normalized", "prechecked", "routed", "completed", "blocked", "rolled_back", "retry_scheduled"]),
});

export const CORE_DOMAIN_WORKFLOW_TRANSITIONS = Object.freeze({
  requested: Object.freeze(["normalized", "blocked"]),
  normalized: Object.freeze(["prechecked", "blocked"]),
  prechecked: Object.freeze(["routed", "blocked"]),
  routed: Object.freeze(["completed", "blocked"]),
  completed: Object.freeze([]),
  blocked: Object.freeze(["rolled_back", "retry_scheduled"]),
  rolled_back: Object.freeze(["retry_scheduled"]),
  retry_scheduled: Object.freeze([]),
});

const ALLOWED_PERSISTENCE_TARGETS = Object.freeze(["none", "synthetic_fixture_store"]);

function freezeWorkflowResult(result) {
  return Object.freeze({
    ...result,
    state_path: Object.freeze(result.state_path ?? []),
    blocked_claims: Object.freeze(result.blocked_claims ?? []),
    validation_errors: Object.freeze(result.validation_errors ?? []),
    rollback_actions: Object.freeze(result.rollback_actions ?? []),
    retry_policy: Object.freeze(result.retry_policy ?? {}),
  });
}

export function assertCoreDomainWorkflowTransition(fromState, toState) {
  const allowed = CORE_DOMAIN_WORKFLOW_TRANSITIONS[fromState];
  if (!allowed) throw new Error(`Unknown core domain workflow state ${fromState}`);
  if (!allowed.includes(toState)) {
    throw new Error(`Invalid core domain workflow transition ${fromState} -> ${toState}`);
  }
  return true;
}

export function createCoreDomainIdempotencyDecision(request, existingKeys = []) {
  const key = request.idempotency_key ?? `${request.tenant_id}:${request.entity_type}:${request.operation}:${request.request_id}`;
  return Object.freeze({
    key,
    duplicate: existingKeys.includes(key),
    replayed: existingKeys.includes(key),
    writes_product_state: false,
  });
}

export function createCoreDomainLockDecision(request, activeLocks = []) {
  const key = `${request.tenant_id}:${request.entity_type}:${request.matter_id ?? "pre-matter"}:${request.operation}`;
  const acquired = !activeLocks.includes(key);
  return Object.freeze({
    key,
    acquired,
    blocked_claim: acquired ? null : "lock_unavailable",
    writes_product_state: false,
  });
}

export function mapCoreDomainWorkflowError(error, stage = "workflow") {
  return Object.freeze({
    stage,
    code: "core_domain_workflow_validation_error",
    message: error instanceof Error ? error.message : String(error),
  });
}

export function createCoreDomainWorkflowRoute(intake, options = {}) {
  const blockedClaims = [];
  if (intake.permission_precheck.effect === "deny") blockedClaims.push("permission_reference_denies_operation");
  if (options.record_validation?.valid === false) blockedClaims.push(...options.record_validation.blocked_claims);
  if (options.lock?.acquired === false) blockedClaims.push(options.lock.blocked_claim);

  const approvalRequired = Boolean(options.approval_required || intake.normalized_request.operation === "archive");
  const reviewRequired = Boolean(options.review_required || options.record_validation?.valid === false);
  const route = blockedClaims.length > 0 ? "blocked" : approvalRequired ? "approval_required" : reviewRequired ? "review_required" : "ready";

  return Object.freeze({
    route,
    review_required: reviewRequired,
    approval_required: approvalRequired,
    blocked_claims: Object.freeze(blockedClaims),
    permission_evaluated: false,
    audit_write_required: false,
  });
}

export function createCoreDomainPersistenceBoundary(snapshot, options = {}) {
  const target = options.persistence_target ?? "synthetic_fixture_store";
  if (!ALLOWED_PERSISTENCE_TARGETS.includes(target)) {
    throw new Error(`Core domain workflow persistence target must be one of ${ALLOWED_PERSISTENCE_TARGETS.join(", ")}`);
  }
  return Object.freeze({
    target,
    persistable: target === "synthetic_fixture_store" && snapshot.route?.route !== "blocked",
    writes_product_state: false,
    creates_database_rows: false,
    snapshot_ref: `${snapshot.intake.normalized_request.request_id}:${snapshot.route.route}`,
  });
}

export function createCoreDomainRollbackPlan(route) {
  if (route.route !== "blocked") return Object.freeze([]);
  return Object.freeze([
    "release_synthetic_lock_if_acquired",
    "discard_synthetic_fixture_snapshot",
    "emit_no_write_blocked_claim",
  ]);
}

export function createCoreDomainRetryPolicy(route, options = {}) {
  const retryableClaims = new Set(["lock_unavailable"]);
  const retryable = route.blocked_claims.some((claim) => retryableClaims.has(claim));
  return Object.freeze({
    retryable,
    max_attempts: retryable ? (options.max_attempts ?? 2) : 0,
    backoff: retryable ? "synthetic_linear" : "none",
  });
}

export function executeCoreDomainWorkflow(input, context = {}) {
  try {
    const intake = assembleCoreDomainServiceIntake(input, context);
    const requestWithIdempotency = Object.freeze({
      ...intake.normalized_request,
      idempotency_key: input.idempotency_key ?? null,
    });
    const recordValidation = context.record
      ? validateCoreDomainRecord(intake.normalized_request.entity_type, context.record, {
          owner_module: context.owner_module ?? getOwnerModule(intake.normalized_request.entity_type),
        })
      : Object.freeze({ valid: true, blocked_claims: Object.freeze([]), errors: Object.freeze([]) });
    const idempotency = createCoreDomainIdempotencyDecision(requestWithIdempotency, context.existing_idempotency_keys ?? []);
    const lock = createCoreDomainLockDecision(intake.normalized_request, context.active_locks ?? []);
    const route = createCoreDomainWorkflowRoute(intake, {
      ...context,
      record_validation: recordValidation,
      lock,
    });
    const persistence = createCoreDomainPersistenceBoundary({ intake, route, record_validation: recordValidation, idempotency, lock }, context);
    const rollbackActions = createCoreDomainRollbackPlan(route);
    const retryPolicy = createCoreDomainRetryPolicy(route, context.retry_policy);
    const blockedClaims = [...route.blocked_claims];
    const validationErrors = [...(recordValidation.errors ?? [])];
    const statePath =
      route.route === "blocked"
        ? ["requested", "normalized", "prechecked", "routed", "blocked", "rolled_back", ...(retryPolicy.retryable ? ["retry_scheduled"] : [])]
        : ["requested", "normalized", "prechecked", "routed", "completed"];

    for (let index = 1; index < statePath.length; index += 1) {
      assertCoreDomainWorkflowTransition(statePath[index - 1], statePath[index]);
    }

    return freezeWorkflowResult({
      workflow_id: CORE_DOMAIN_WORKFLOW_CONTRACT.workflow_id,
      pack_id: CORE_DOMAIN_WORKFLOW_PACK_BINDING.pack_id,
      status: route.route === "blocked" ? "blocked" : idempotency.replayed ? "replayed" : "completed",
      route,
      intake,
      record_validation: recordValidation,
      idempotency,
      lock,
      persistence,
      blocked_claims: blockedClaims,
      validation_errors: validationErrors,
      rollback_actions: rollbackActions,
      retry_policy: retryPolicy,
      state_path: statePath,
      writes_product_state: false,
      evaluates_runtime_permission: false,
      writes_audit_event: false,
    });
  } catch (error) {
    const mapped = mapCoreDomainWorkflowError(error, "workflow_intake");
    const blockedClaim = mapped.message.includes("persistence target") ? "persistence_boundary_violation" : mapped.code;
    return freezeWorkflowResult({
      workflow_id: CORE_DOMAIN_WORKFLOW_CONTRACT.workflow_id,
      pack_id: CORE_DOMAIN_WORKFLOW_PACK_BINDING.pack_id,
      status: "blocked",
      route: Object.freeze({
        route: "blocked",
        review_required: true,
        approval_required: false,
        blocked_claims: Object.freeze([blockedClaim]),
        permission_evaluated: false,
        audit_write_required: false,
      }),
      blocked_claims: [blockedClaim],
      validation_errors: [mapped.message],
      rollback_actions: ["discard_synthetic_fixture_snapshot", "emit_no_write_blocked_claim"],
      retry_policy: { retryable: false, max_attempts: 0, backoff: "none" },
      state_path: ["requested", "blocked", "rolled_back"],
      writes_product_state: false,
      evaluates_runtime_permission: false,
      writes_audit_event: false,
    });
  }
}
