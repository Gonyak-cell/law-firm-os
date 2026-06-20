import { createUiReadinessRepository } from "../../../packages/platform/src/ui-readiness-repository.js";
import { adjudicateUiReadiness, recordCriticalPathRun, recordUiReadinessCheck } from "../../../packages/platform/src/ui-readiness-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

const G11_CHECKS = Object.freeze([
  ["CMP-G11-W11-T001", "home", "final-navigation-ia"],
  ["CMP-G11-W11-T002", "home", "app-router"],
  ["CMP-G11-W11-T003", "home", "api-client-real-fetch"],
  ["CMP-G11-W11-T004", "home", "command-center-home"],
  ["CMP-G11-W11-T005", "clients", "client-list"],
  ["CMP-G11-W11-T006", "clients", "client-dashboard"],
  ["CMP-G11-W11-T007", "clients", "party-profile"],
  ["CMP-G11-W11-T008", "clients", "relationship-graph"],
  ["CMP-G11-W11-T009", "intake", "opportunity-pipeline"],
  ["CMP-G11-W11-T010", "intake", "intake-workspace"],
  ["CMP-G11-W11-T011", "matters", "matter-home"],
  ["CMP-G11-W11-T012", "matters", "matter-opening-wizard"],
  ["CMP-G11-W11-T013", "matters", "matter-staffing-panel"],
  ["CMP-G11-W11-T014", "matters", "task-deadline-board"],
  ["CMP-G11-W11-T015", "matters", "matter-timeline"],
  ["CMP-G11-W11-T016", "people", "people-directory"],
  ["CMP-G11-W11-T017", "people", "employee-profile"],
  ["CMP-G11-W11-T018", "people", "capacity-calendar"],
  ["CMP-G11-W11-T019", "people", "leave-attendance"],
  ["CMP-G11-W11-T020", "people", "onboarding-offboarding"],
  ["CMP-G11-W11-T021", "people", "hr-document-vault"],
  ["CMP-G11-W11-T022", "vault", "matter-vault"],
  ["CMP-G11-W11-T023", "vault", "document-detail"],
  ["CMP-G11-W11-T024", "vault", "version-history"],
  ["CMP-G11-W11-T025", "vault", "email-filing-view"],
  ["CMP-G11-W11-T026", "vault", "secure-link-manager"],
  ["CMP-G11-W11-T027", "portal", "data-room-projection"],
  ["CMP-G11-W11-T028", "vault", "vault-search-rag-evidence"],
  ["CMP-G11-W11-T029", "finance", "time-entry-workspace"],
  ["CMP-G11-W11-T030", "finance", "wip-dashboard"],
  ["CMP-G11-W11-T031", "finance", "prebill-review"],
  ["CMP-G11-W11-T032", "finance", "invoice-detail"],
  ["CMP-G11-W11-T033", "finance", "payment-ar-dashboard"],
  ["CMP-G11-W11-T034", "analytics", "matter-profitability"],
  ["CMP-G11-W11-T035", "analytics", "employee-utilization"],
  ["CMP-G11-W11-T036", "ask", "ai-review-queue"],
  ["CMP-G11-W11-T037", "admin", "audit-timeline"],
  ["CMP-G11-W11-T038", "admin", "user-employee-link-manager"],
  ["CMP-G11-W11-T039", "admin", "vault-connector-settings"],
  ["CMP-G11-W11-T040", "admin", "policy-editor"],
  ["CMP-G11-W11-T041", "admin", "ethical-wall-legal-hold-console"],
  ["CMP-G11-W11-T042", "readiness", "permission-denied-state"],
  ["CMP-G11-W11-T043", "readiness", "review-required-state"],
  ["CMP-G11-W11-T044", "readiness", "security-badges"],
  ["CMP-G11-W11-T045", "readiness", "i18n-glossary-alignment"],
  ["CMP-G11-W11-T046", "readiness", "responsive-a11y-coverage"],
  ["CMP-G11-W11-T047", "readiness", "e2e-critical-paths"],
  ["CMP-G11-W11-T048", "readiness", "g11-validator-closeout"],
]);

export const UI_READINESS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "cmp-ui-readiness",
  contract_ref: "docs/reorganization/client-matter-os/cmp-v1/runtime-readiness-standard.md",
  contract_schema_version: "law-firm-os.cmp-ui-readiness-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/ui/readiness",
    "POST /api/ui/checks",
    "POST /api/ui/critical-path-runs",
    "POST /api/ui/adjudications",
    "GET /api/ui/audit",
  ]),
  data_source: "ui_readiness_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const UI_READINESS_API_ERROR_CODES = Object.freeze({
  tenant_required: "UI_TENANT_REQUIRED",
  permission_required: "UI_PERMISSION_REQUIRED",
  audit_hint_required: "UI_AUDIT_HINT_REQUIRED",
  validation_error: "UI_API_VALIDATION_ERROR",
  unauthorized_omission: "UI_UNAUTHORIZED_OMISSION",
  review_required: "UI_REVIEW_REQUIRED",
  approval_required: "UI_APPROVAL_REQUIRED",
  not_found: "UI_NOT_FOUND",
});

export const UI_READINESS_RUNTIME_SEED = Object.freeze(
  G11_CHECKS.map(([tuw_id, route_id, ui_surface_id], index) =>
    Object.freeze({
      model_type: "UiReadinessCheck",
      ui_check_id: `ui_check_cmp_g11_${String(index + 1).padStart(3, "0")}`,
      tenant_id: "tenant_cmp_g11_synthetic",
      tuw_id,
      route_id,
      ui_surface_id,
      api_backed_surface: true,
      permission_states_covered: true,
      review_states_covered: true,
      responsive_states_covered: true,
      accessibility_checked: true,
      status: "passed",
    }),
  ),
);

export function createUiReadinessRuntimeContext({
  repository = createUiReadinessRepository({ seedRecords: UI_READINESS_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g11-ui-readiness-synthetic" });
}

const DEFAULT_RUNTIME = createUiReadinessRuntimeContext();

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
  if (!query.tenant_id) return errorResponse(400, requestId, [UI_READINESS_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [UI_READINESS_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [UI_READINESS_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function routeGate({ context, query, requestId, action, resourceType }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [decision.effect === "review_required" ? UI_READINESS_API_ERROR_CODES.review_required : UI_READINESS_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [UI_READINESS_API_ERROR_CODES.unauthorized_omission], { audit_hint_ref: query.audit_hint_ref, ui_state: "denied" });
}

function sanitizeUiItem(record) {
  const { raw_payload, screenshot_payload, ...safe } = record;
  return Object.freeze({
    ...safe,
    raw_payload_included: false,
    screenshot_payload_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType, route_id: query.route_id }).map(sanitizeUiItem);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function writeResponse({ body, context, requestId, runtime, action, resourceType, tenantId, fn, itemKey }) {
  const query = { tenant_id: tenantId, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  try {
    const result = fn();
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
        item: sanitizeUiItem(result[itemKey]),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [UI_READINESS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleUiAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "ui:audit:read", resourceType: "ui_audit" });
  if (gated) return gated;
  return { status: 200, body: { request_id: requestId, outcome: "passed", items: runtime.repository.listAudit({ tenant_id: query.tenant_id }), safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, count_leak_prevented: true, production_ready_claim: false } };
}

export async function handleUiReadinessApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/ui/readiness" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "ui:readiness:read", resourceType: "ui_readiness_check", modelType: "UiReadinessCheck" });
  if (pathname === "/api/ui/audit" && method === "GET") return handleUiAudit({ query, context, requestId, runtime });
  if (pathname === "/api/ui/checks" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "ui:readiness:write", resourceType: "ui_readiness_check", tenantId: body?.ui_check?.tenant_id ?? body?.tenant_id, itemKey: "ui_check", fn: () => recordUiReadinessCheck({ repository: runtime.repository, ui_check: body.ui_check, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/ui/critical-path-runs" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "ui:critical_path:write", resourceType: "critical_path_run", tenantId: body?.critical_path_run?.tenant_id ?? body?.tenant_id, itemKey: "critical_path_run", fn: () => recordCriticalPathRun({ repository: runtime.repository, critical_path_run: body.critical_path_run, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/ui/adjudications" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "ui:adjudication:write", resourceType: "ui_adjudication", tenantId: body?.ui_adjudication?.tenant_id ?? body?.tenant_id, itemKey: "ui_adjudication", fn: () => adjudicateUiReadiness({ repository: runtime.repository, ui_adjudication: body.ui_adjudication, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  return errorResponse(404, requestId, [UI_READINESS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
