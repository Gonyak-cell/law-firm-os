import { createEnterpriseReadinessRepository } from "../../../packages/enterprise/src/enterprise-readiness-repository.js";
import { recordEnterpriseReadinessItem, recordGoNoGoDecision, recordReleaseCandidate } from "../../../packages/enterprise/src/enterprise-readiness-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

const G12_ITEMS = Object.freeze([
  ["CMP-G12-W12-T001", "sso-settings-runtime"],
  ["CMP-G12-W12-T002", "scim-provisioning-skeleton"],
  ["CMP-G12-W12-T003", "mfa-policy-runtime"],
  ["CMP-G12-W12-T004", "tenant-admin-settings"],
  ["CMP-G12-W12-T005", "observability-baseline"],
  ["CMP-G12-W12-T006", "incident-runbook-model"],
  ["CMP-G12-W12-T007", "deployment-run-record"],
  ["CMP-G12-W12-T008", "backup-job-runtime"],
  ["CMP-G12-W12-T009", "restore-drill-automation"],
  ["CMP-G12-W12-T010", "dr-runbook-rto-rpo"],
  ["CMP-G12-W12-T011", "performance-smoke-suite"],
  ["CMP-G12-W12-T012", "security-regression-suite"],
  ["CMP-G12-W12-T013", "migration-dry-run-framework"],
  ["CMP-G12-W12-T014", "duplicate-import-control"],
  ["CMP-G12-W12-T015", "finance-connector-export-review"],
  ["CMP-G12-W12-T016", "compliance-evidence-pack"],
  ["CMP-G12-W12-T017", "privacy-secret-handling-audit"],
  ["CMP-G12-W12-T018", "uat-scenario-pack"],
  ["CMP-G12-W12-T019", "release-candidate-model"],
  ["CMP-G12-W12-T020", "launch-go-no-go-packet"],
  ["CMP-G12-W12-T021", "hypercare-plan"],
  ["CMP-G12-W12-T022", "admin-audit-viewer"],
  ["CMP-G12-W12-T023", "operations-dashboard"],
  ["CMP-G12-W12-T024", "enterprise-api-contracts"],
  ["CMP-G12-W12-T025", "g12-validator"],
  ["CMP-G12-W12-T026", "production-readiness-checklist"],
  ["CMP-G12-W12-T027", "cutover-runbook"],
  ["CMP-G12-W12-T028", "g12-closeout-report"],
]);

export const ENTERPRISE_READINESS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "enterprise-readiness",
  contract_ref: "contracts/enterprise-saas-hardening-contract.json",
  contract_schema_version: "law-firm-os.enterprise-readiness-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/enterprise/readiness",
    "POST /api/enterprise/items",
    "POST /api/enterprise/release-candidates",
    "POST /api/enterprise/go-no-go",
    "GET /api/enterprise/audit",
  ]),
  data_source: "enterprise_readiness_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  go_live_approved: false,
  fail_closed: true,
});

export const ENTERPRISE_READINESS_API_ERROR_CODES = Object.freeze({
  tenant_required: "ENTERPRISE_TENANT_REQUIRED",
  permission_required: "ENTERPRISE_PERMISSION_REQUIRED",
  audit_hint_required: "ENTERPRISE_AUDIT_HINT_REQUIRED",
  validation_error: "ENTERPRISE_API_VALIDATION_ERROR",
  unauthorized_omission: "ENTERPRISE_UNAUTHORIZED_OMISSION",
  review_required: "ENTERPRISE_REVIEW_REQUIRED",
  approval_required: "ENTERPRISE_APPROVAL_REQUIRED",
  not_found: "ENTERPRISE_NOT_FOUND",
});

export const ENTERPRISE_READINESS_RUNTIME_SEED = Object.freeze(
  G12_ITEMS.map(([tuw_id, item_type], index) =>
    Object.freeze({
      model_type: "EnterpriseReadinessItem",
      enterprise_item_id: `enterprise_item_cmp_g12_${String(index + 1).padStart(3, "0")}`,
      tenant_id: "tenant_cmp_g12_synthetic",
      tuw_id,
      item_type,
      control_ref: `enterprise-control-${String(index + 1).padStart(3, "0")}`,
      evidence_refs: Object.freeze([`docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g12-${String(index + 1).padStart(3, "0")}.md`]),
      status: "owner_decision_ready",
      owner_decision_required: true,
      release_gate_required: true,
      production_ready_claim: false,
      go_live_approved: false,
    }),
  ),
);

export function createEnterpriseReadinessRuntimeContext({
  repository = createEnterpriseReadinessRepository({ seedRecords: ENTERPRISE_READINESS_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g12-enterprise-readiness-synthetic" });
}

const DEFAULT_RUNTIME = createEnterpriseReadinessRuntimeContext();

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
      go_live_approved: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.audit_hint_required]);
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
        safe_error_codes: [decision.effect === "review_required" ? ENTERPRISE_READINESS_API_ERROR_CODES.review_required : ENTERPRISE_READINESS_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
        go_live_approved: false,
      },
    };
  }
  return errorResponse(403, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.unauthorized_omission], { audit_hint_ref: query.audit_hint_ref, ui_state: "denied" });
}

function sanitizeEnterpriseItem(record) {
  const { secret_material, customer_payload, raw_payload, ...safe } = record;
  return Object.freeze({
    ...safe,
    secret_material_included: false,
    customer_payload_included: false,
    raw_payload_included: false,
    production_ready_claim: false,
    go_live_approved: false,
  });
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType, item_type: query.item_type }).map(sanitizeEnterpriseItem);
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
      go_live_approved: false,
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
        item: sanitizeEnterpriseItem(result[itemKey]),
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
        go_live_approved: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleEnterpriseAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "enterprise:audit:read", resourceType: "enterprise_audit" });
  if (gated) return gated;
  return { status: 200, body: { request_id: requestId, outcome: "passed", items: runtime.repository.listAudit({ tenant_id: query.tenant_id }), safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, count_leak_prevented: true, production_ready_claim: false, go_live_approved: false } };
}

export async function handleEnterpriseReadinessApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/enterprise/readiness" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "enterprise:readiness:read", resourceType: "enterprise_readiness_item", modelType: "EnterpriseReadinessItem" });
  if (pathname === "/api/enterprise/audit" && method === "GET") return handleEnterpriseAudit({ query, context, requestId, runtime });
  if (pathname === "/api/enterprise/items" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "enterprise:readiness:write", resourceType: "enterprise_readiness_item", tenantId: body?.enterprise_item?.tenant_id ?? body?.tenant_id, itemKey: "enterprise_item", fn: () => recordEnterpriseReadinessItem({ repository: runtime.repository, enterprise_item: body.enterprise_item, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/enterprise/release-candidates" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "enterprise:release_candidate:write", resourceType: "release_candidate", tenantId: body?.release_candidate?.tenant_id ?? body?.tenant_id, itemKey: "release_candidate", fn: () => recordReleaseCandidate({ repository: runtime.repository, release_candidate: body.release_candidate, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  if (pathname === "/api/enterprise/go-no-go" && method === "POST") return writeResponse({ body, context, requestId, runtime, action: "enterprise:go_no_go:write", resourceType: "go_no_go_decision", tenantId: body?.go_no_go?.tenant_id ?? body?.tenant_id, itemKey: "go_no_go", fn: () => recordGoNoGoDecision({ repository: runtime.repository, go_no_go: body.go_no_go, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key }) });
  return errorResponse(404, requestId, [ENTERPRISE_READINESS_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
