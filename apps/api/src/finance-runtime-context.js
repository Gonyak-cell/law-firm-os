import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createTimeEntry } from "../../../packages/time-expense/src/time-entry-service.js";
import { generateWipFromApprovedItems } from "../../../packages/billing/src/wip-service.js";
import { importPayment } from "../../../packages/payments/src/payment-service.js";
import { createArAgingSnapshot } from "../../../packages/payments/src/ar-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const FINANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "finance",
  contract_ref: "contracts/finance-runtime-contract.json",
  contract_schema_version: "law-firm-os.finance-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/finance/time-entries",
    "POST /api/finance/time-entries",
    "POST /api/finance/wip",
    "GET /api/finance/invoices",
    "POST /api/finance/payments",
    "GET /api/finance/ar-aging",
    "GET /api/finance/audit",
  ]),
  data_source: "finance_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const FINANCE_API_ERROR_CODES = Object.freeze({
  tenant_required: "FINANCE_TENANT_REQUIRED",
  permission_required: "FINANCE_PERMISSION_REQUIRED",
  audit_hint_required: "FINANCE_AUDIT_HINT_REQUIRED",
  validation_error: "FINANCE_API_VALIDATION_ERROR",
  unauthorized_omission: "FINANCE_UNAUTHORIZED_OMISSION",
  review_required: "FINANCE_REVIEW_REQUIRED",
  approval_required: "FINANCE_APPROVAL_REQUIRED",
  not_found: "FINANCE_NOT_FOUND",
});

export const FINANCE_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "RateCard",
    rate_card_id: "rate_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    currency: "KRW",
    effective_from: "2026-06-20",
    role_rates: Object.freeze([Object.freeze({ role_id: "partner", hourly_rate: 400000 })]),
    status: "active",
  }),
  Object.freeze({
    model_type: "TimeEntry",
    time_entry_id: "time_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    actor_id: "user_cmp_g7_finance",
    role_id: "partner",
    work_date: "2026-06-20",
    narrative: "Synthetic approved time",
    duration_minutes: 60,
    billable: true,
    status: "approved",
    approved_for_wip: true,
  }),
  Object.freeze({
    model_type: "Invoice",
    invoice_id: "invoice_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    prebill_id: "prebill_cmp_g7_seed",
    billing_client_party_id: "party_cmp_g6_client_001",
    amount_due: 400000,
    amount_paid: 0,
    currency: "KRW",
    status: "issued",
  }),
  Object.freeze({
    model_type: "ARBalance",
    ar_balance_id: "ar_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    invoice_id: "invoice_cmp_g7_seed",
    billing_client_party_id: "party_cmp_g6_client_001",
    balance: 400000,
    status: "open",
  }),
]);

export function createFinanceRuntimeContext({
  repository = createFinanceRepository({ seedRecords: FINANCE_RUNTIME_SEED }),
} = {}) {
  return Object.freeze({ repository, seed_ref: "cmp-g7-finance-synthetic" });
}

const DEFAULT_RUNTIME = createFinanceRuntimeContext();

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
  if (!query.tenant_id) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.audit_hint_required]);
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
          decision.effect === "review_required" ? FINANCE_API_ERROR_CODES.review_required : FINANCE_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function routeGate({ context, query, requestId, action, resourceType }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function sanitizeFinanceItem(record) {
  const { bank_reference, lines, credential_material, ...safe } = record;
  return Object.freeze({
    ...safe,
    bank_reference_included: false,
    journal_lines_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType }).map(sanitizeFinanceItem);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
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
      item: sanitizeFinanceItem(item),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      production_ready_claim: false,
      ...extra,
    },
  };
}

export function handleFinanceTimeEntryCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.time_entry?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:time:write", resourceType: "time_entry" });
  if (gated) return gated;
  try {
    const result = createTimeEntry({
      repository: runtime.repository,
      time_entry: body.time_entry,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.time_entry,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceWipGenerate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:wip:write", resourceType: "wip_item" });
  if (gated) return gated;
  try {
    const rateCard = runtime.repository.get({ tenant_id: body.tenant_id, model_type: "RateCard", rate_card_id: body.rate_card_id ?? "rate_cmp_g7_seed" });
    const result = generateWipFromApprovedItems({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      rate_card: rateCard,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.wip_items[0],
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { items: result.wip_items.map(sanitizeFinanceItem), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePaymentImport({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.payment?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:payment:write", resourceType: "payment" });
  if (gated) return gated;
  try {
    const result = importPayment({
      repository: runtime.repository,
      payment: body.payment,
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.payment,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceArAging({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:ar:read", resourceType: "ar_aging" });
  if (gated) return gated;
  let snapshots = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "ARAgingSnapshot" });
  if (snapshots.length === 0) {
    const created = createArAgingSnapshot({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      actor_id: context.principal.user_id,
      idempotency_key: `api-ar-aging:${query.tenant_id}`,
      ar_aging_snapshot_id: `ar_aging_api_${query.tenant_id}`,
    });
    snapshots = [created.ar_aging_snapshot];
  }
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: snapshots.map(sanitizeFinanceItem),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleFinanceAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:audit:read", resourceType: "finance_audit" });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.repository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleFinanceApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  if (pathname === "/api/finance/time-entries" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:time:read", resourceType: "time_entry", modelType: "TimeEntry" });
  }
  if (pathname === "/api/finance/time-entries" && method === "POST") return handleFinanceTimeEntryCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/wip" && method === "POST") return handleFinanceWipGenerate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/invoices" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:invoice:read", resourceType: "invoice", modelType: "Invoice" });
  }
  if (pathname === "/api/finance/payments" && method === "POST") return handleFinancePaymentImport({ body, context, requestId, runtime });
  if (pathname === "/api/finance/ar-aging" && method === "GET") return handleFinanceArAging({ query, context, requestId, runtime });
  if (pathname === "/api/finance/audit" && method === "GET") return handleFinanceAudit({ query, context, requestId, runtime });
  return errorResponse(404, requestId, [FINANCE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
