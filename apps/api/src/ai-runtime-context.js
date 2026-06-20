import { createAiGovernanceRepository } from "../../../packages/ai-governance/src/runtime-repository.js";
import { createAiPolicy } from "../../../packages/ai-governance/src/policy-service.js";
import { assertPermissionBeforeAi, createRetrievalRequest } from "../../../packages/ai-governance/src/retrieval-service.js";
import { createPromptLog } from "../../../packages/ai-governance/src/prompt-log-service.js";
import { createAiOutput } from "../../../packages/ai-governance/src/output-service.js";
import { createAiOutputExport } from "../../../packages/ai-governance/src/export-control-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const AI_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "ai-governance",
  contract_ref: "contracts/ai-governance-runtime-contract.json",
  contract_schema_version: "law-firm-os.ai-governance-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "POST /api/ai/policies",
    "POST /api/ai/retrieval",
    "POST /api/ai/outputs",
    "GET /api/ai/review-queue",
    "POST /api/ai/exports",
    "GET /api/ai/audit",
  ]),
  data_source: "ai_governance_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const AI_API_ERROR_CODES = Object.freeze({
  tenant_required: "AI_TENANT_REQUIRED",
  permission_required: "AI_PERMISSION_REQUIRED",
  audit_hint_required: "AI_AUDIT_HINT_REQUIRED",
  validation_error: "AI_API_VALIDATION_ERROR",
  unauthorized_omission: "AI_UNAUTHORIZED_OMISSION",
  review_required: "AI_REVIEW_REQUIRED",
  approval_required: "AI_APPROVAL_REQUIRED",
  not_found: "AI_NOT_FOUND",
});

export const AI_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "AiPolicy",
    ai_policy_id: "ai_policy_cmp_g9_seed",
    tenant_id: "tenant_cmp_g9_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    matter_sensitivity_routes: Object.freeze(["public", "confidential", "privileged"]),
    privilege_label_routes: Object.freeze(["attorney_client", "work_product", "legal_hold"]),
    disable_switch_on: false,
    status: "active",
  }),
  Object.freeze({
    model_type: "HumanReviewTask",
    review_task_id: "review_cmp_g9_seed",
    tenant_id: "tenant_cmp_g9_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    ai_output_id: "ai_output_cmp_g9_seed",
    status: "open",
    reviewer_role: "attorney_reviewer",
  }),
]);

export function createAiRuntimeContext({
  repository = createAiGovernanceRepository({ seedRecords: AI_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g9-ai-governance-synthetic" });
}

const DEFAULT_RUNTIME = createAiRuntimeContext();

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
  if (!query.tenant_id) return errorResponse(400, requestId, [AI_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [AI_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [AI_API_ERROR_CODES.audit_hint_required]);
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
        safe_error_codes: [decision.effect === "review_required" ? AI_API_ERROR_CODES.review_required : AI_API_ERROR_CODES.approval_required],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [AI_API_ERROR_CODES.unauthorized_omission], { audit_hint_ref: query.audit_hint_ref, ui_state: "denied" });
}

function sanitizeAiItem(record) {
  const { raw_prompt, raw_output, raw_payload, source_payload, ...safe } = record;
  return Object.freeze({
    ...safe,
    raw_prompt_included: false,
    raw_output_included: false,
    raw_payload_included: false,
    source_payload_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType }).map(sanitizeAiItem);
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

export function handleAiPolicyCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.policy?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "ai:policy:write", resourceType: "ai_policy" });
  if (gated) return gated;
  try {
    const result = createAiPolicy({ repository: runtime.repository, policy: body.policy, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key });
    return { status: result.idempotent_replay ? 200 : 201, body: { request_id: requestId, outcome: result.idempotent_replay ? "idempotent_replay" : "created", item: sanitizeAiItem(result.ai_policy), audit_event: result.audit_event, safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  } catch {
    return errorResponse(400, requestId, [AI_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAiRetrievalCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.retrieval_request?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "ai:retrieval:write", resourceType: "retrieval_request" });
  if (gated) return gated;
  try {
    const policy = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "AiPolicy", ai_policy_id: body.ai_policy_id ?? "ai_policy_cmp_g9_seed" });
    const permission = assertPermissionBeforeAi({ policy, candidate_docs: body.candidate_docs, authorized_doc_ids: body.authorized_doc_ids });
    const result = createRetrievalRequest({
      repository: runtime.repository,
      retrieval_request: { ...body.retrieval_request, retrieved_doc_ids: permission.retrieved_doc_ids },
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return { status: result.idempotent_replay ? 200 : 201, body: { request_id: requestId, outcome: result.idempotent_replay ? "idempotent_replay" : "created", item: sanitizeAiItem(result.retrieval_request), permission, audit_event: result.audit_event, safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  } catch {
    return errorResponse(400, requestId, [AI_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAiOutputCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.ai_output?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "ai:output:write", resourceType: "ai_output" });
  if (gated) return gated;
  try {
    const prompt = createPromptLog({ repository: runtime.repository, prompt_log: body.prompt_log, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: `${body.idempotency_key}:prompt` });
    const result = createAiOutput({ repository: runtime.repository, ai_output: { ...body.ai_output, prompt_log_id: prompt.prompt_log.prompt_log_id }, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key });
    return { status: result.idempotent_replay ? 200 : 201, body: { request_id: requestId, outcome: result.idempotent_replay ? "idempotent_replay" : "created", item: sanitizeAiItem(result.ai_output), review_task: sanitizeAiItem(result.review_task), audit_event: result.audit_event, safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  } catch {
    return errorResponse(400, requestId, [AI_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAiExportCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.ai_output_export?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "ai:export:write", resourceType: "ai_output_export" });
  if (gated) return gated;
  try {
    const result = createAiOutputExport({ repository: runtime.repository, ai_output_export: body.ai_output_export, actor_id: body.actor_id ?? context.principal.user_id, idempotency_key: body.idempotency_key });
    return { status: result.idempotent_replay ? 200 : 201, body: { request_id: requestId, outcome: result.idempotent_replay ? "idempotent_replay" : "created", item: sanitizeAiItem(result.ai_output_export), audit_event: result.audit_event, safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, production_ready_claim: false } };
  } catch {
    return errorResponse(400, requestId, [AI_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleAiAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "ai:audit:read", resourceType: "ai_audit" });
  if (gated) return gated;
  return { status: 200, body: { request_id: requestId, outcome: "passed", items: runtime.repository.listAudit({ tenant_id: query.tenant_id }), safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, count_leak_prevented: true, production_ready_claim: false } };
}

export async function handleAiApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/ai/policies" && method === "POST") return handleAiPolicyCreate({ body, context, requestId, runtime });
  if (pathname === "/api/ai/retrieval" && method === "POST") return handleAiRetrievalCreate({ body, context, requestId, runtime });
  if (pathname === "/api/ai/outputs" && method === "POST") return handleAiOutputCreate({ body, context, requestId, runtime });
  if (pathname === "/api/ai/review-queue" && method === "GET") return listResponse({ query, context, requestId, runtime, action: "ai:review:read", resourceType: "human_review_task", modelType: "HumanReviewTask" });
  if (pathname === "/api/ai/exports" && method === "POST") return handleAiExportCreate({ body, context, requestId, runtime });
  if (pathname === "/api/ai/audit" && method === "GET") return handleAiAudit({ query, context, requestId, runtime });
  return errorResponse(404, requestId, [AI_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
