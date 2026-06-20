import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createLead } from "../../../packages/crm/src/lead-service.js";
import { createOpportunity } from "../../../packages/crm/src/opportunity-service.js";
import { handoffOpportunityToIntake } from "../../../packages/crm/src/intake-handoff-service.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createIntakeRequest } from "../../../packages/intake/src/intake-request-service.js";
import { createConflictCheck } from "../../../packages/intake/src/conflict-check-service.js";
import { issueClearanceToken, validateClearanceToken } from "../../../packages/intake/src/clearance-token-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";
import { matchCrmIntakeRoute } from "./routes/crm.js";

export const CRM_INTAKE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "crm-intake",
  contract_ref: "contracts/crm-intake-runtime-contract.json",
  contract_schema_version: "law-firm-os.crm-intake-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/crm/leads",
    "POST /api/crm/leads",
    "GET /api/crm/opportunities",
    "POST /api/crm/opportunities",
    "POST /api/crm/opportunities/:id/handoff",
    "GET /api/intake/requests",
    "POST /api/intake/requests",
    "POST /api/intake/conflict-checks",
    "POST /api/intake/clearance-tokens",
    "GET /api/intake/audit",
  ]),
  data_source: "crm_intake_runtime_repositories",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const CRM_INTAKE_API_ERROR_CODES = Object.freeze({
  tenant_required: "CRM_INTAKE_TENANT_REQUIRED",
  permission_required: "CRM_INTAKE_PERMISSION_REQUIRED",
  audit_hint_required: "CRM_INTAKE_AUDIT_HINT_REQUIRED",
  validation_error: "CRM_INTAKE_API_VALIDATION_ERROR",
  unauthorized_omission: "CRM_INTAKE_UNAUTHORIZED_OMISSION",
  review_required: "CRM_INTAKE_REVIEW_REQUIRED",
  approval_required: "CRM_INTAKE_APPROVAL_REQUIRED",
  not_found: "CRM_INTAKE_NOT_FOUND",
});

export const CRM_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "Lead",
    lead_id: "lead_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    display_name: "CMP G6 synthetic lead",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
  Object.freeze({
    model_type: "Opportunity",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    party_id: "party_cmp_g6_client_001",
    display_name: "CMP G6 synthetic opportunity",
    stage: "qualified",
    status: "active",
    owner_user_id: "user_cmp_g6_owner",
  }),
]);

export const INTAKE_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "IntakeRequest",
    intake_request_id: "intake_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    requesting_party_id: "party_cmp_g6_client_001",
    party_ids: Object.freeze(["party_cmp_g6_client_001"]),
    status: "open",
    owner_user_id: "user_cmp_g6_owner",
    requested_scope_summary: "Synthetic intake request",
  }),
  Object.freeze({
    model_type: "ConflictCheck",
    conflict_check_id: "conflict_cmp_g6_synthetic_001",
    tenant_id: "tenant_cmp_g6_synthetic",
    intake_request_id: "intake_cmp_g6_synthetic_001",
    party_snapshot: Object.freeze({ party_ids: Object.freeze(["party_cmp_g6_client_001"]), source: "party_master" }),
    snapshot_recorded_at: "2026-06-20T00:00:00.000Z",
    snapshot_hash: "seed-snapshot-hash",
    status: "snapshot_recorded",
    owner_user_id: "user_cmp_g6_owner",
  }),
]);

export function createCrmIntakeRuntimeContext({
  crmRepository = createCrmRuntimeRepository({ seedRecords: CRM_RUNTIME_SEED }),
  intakeRepository = createIntakeRuntimeRepository({ seedRecords: INTAKE_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({
    crmRepository,
    intakeRepository,
    seed_ref: "cmp-g6-crm-intake-synthetic",
    intakeService: Object.freeze({
      createIntakeRequest: ({ request, actor_id, idempotency_key }) =>
        createIntakeRequest({ repository: intakeRepository, request, actor_id, idempotency_key }),
    }),
  });
}

const DEFAULT_RUNTIME = createCrmIntakeRuntimeContext();

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [
          decision.effect === "review_required"
            ? CRM_INTAKE_API_ERROR_CODES.review_required
            : CRM_INTAKE_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [CRM_INTAKE_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function routeGate({ context, query, requestId, policy }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: policy.resource_type,
      resource_id: query.resource_id ?? null,
    },
    action: policy.action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function sanitizeItem(record) {
  const {
    matter_id,
    matter_ref,
    matter_number,
    matter_create_command,
    matter_open_command,
    body,
    raw_query,
    ...safe
  } = record;
  return Object.freeze({
    ...safe,
    direct_matter_reference_included: false,
    raw_conflict_memo_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ requestId, query, context, policy, items }) {
  const serialized = items.map(sanitizeItem);
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: policy.action,
    resourceType: policy.resource_type,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function itemResponse({ requestId, auditHintRef, outcome, item, auditEvent, status = 201, extra = {} }) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      item: sanitizeItem(item),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      production_ready_claim: false,
      ...extra,
    },
  };
}

export function handleCrmLeadList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "Lead" }),
  });
}

export function handleCrmOpportunityList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.crmRepository.list({ tenant_id: query.tenant_id, model_type: "Opportunity" }),
  });
}

export function handleIntakeRequestList({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return listResponse({
    requestId,
    query,
    context,
    policy,
    items: runtime.intakeRepository.list({ tenant_id: query.tenant_id, model_type: "IntakeRequest" }),
  });
}

export function handleCrmLeadCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.lead?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createLead({
      repository: runtime.crmRepository,
      lead: body.lead,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.lead,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleCrmOpportunityCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.opportunity?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createOpportunity({
      repository: runtime.crmRepository,
      opportunity: body.opportunity,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.opportunity,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleOpportunityHandoff({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy, opportunityId } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = handoffOpportunityToIntake({
      crmRepository: runtime.crmRepository,
      intakeService: runtime.intakeService,
      tenant_id: body.tenant_id,
      opportunity_id: opportunityId,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
      intake_request_id: body.intake_request_id,
      requested_scope_summary: body.requested_scope_summary,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.intake_request,
      auditEvent: result.audit_events[1],
      status: result.idempotent_replay ? 200 : 201,
      extra: { opportunity: sanitizeItem(result.opportunity), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleIntakeRequestCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.request?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createIntakeRequest({
      repository: runtime.intakeRepository,
      request: body.request,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.intake_request,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleConflictCheckCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = {
    tenant_id: body?.conflict_check?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = createConflictCheck({
      repository: runtime.intakeRepository,
      conflict_check: body.conflict_check,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.conflict_check,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleClearanceTokenIssue({ body, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const query = { tenant_id: body?.token?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  try {
    const result = issueClearanceToken({
      repository: runtime.intakeRepository,
      token: body.token,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const validation = validateClearanceToken(result.clearance_token, { now: body.now });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.clearance_token,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { validation, idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [CRM_INTAKE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleIntakeAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME, policy } = {}) {
  const gated = routeGate({ context, query, requestId, policy });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.intakeRepository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleCrmIntakeApiRequest({
  pathname,
  method,
  query,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const policy = matchCrmIntakeRoute({ pathname, method });
  if (!policy) return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
  if (pathname === "/api/crm/leads" && method === "GET") return handleCrmLeadList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/leads" && method === "POST") return handleCrmLeadCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/crm/opportunities" && method === "GET") return handleCrmOpportunityList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/crm/opportunities" && method === "POST") return handleCrmOpportunityCreate({ body, context, requestId, runtime, policy });
  if (policy.params?.[0] && method === "POST") {
    return handleOpportunityHandoff({
      body,
      context,
      requestId,
      runtime,
      policy,
      opportunityId: decodeURIComponent(policy.params[0]),
    });
  }
  if (pathname === "/api/intake/requests" && method === "GET") return handleIntakeRequestList({ query, context, requestId, runtime, policy });
  if (pathname === "/api/intake/requests" && method === "POST") return handleIntakeRequestCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/conflict-checks" && method === "POST") return handleConflictCheckCreate({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/clearance-tokens" && method === "POST") return handleClearanceTokenIssue({ body, context, requestId, runtime, policy });
  if (pathname === "/api/intake/audit" && method === "GET") return handleIntakeAudit({ query, context, requestId, runtime, policy });
  return errorResponse(404, requestId, [CRM_INTAKE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
