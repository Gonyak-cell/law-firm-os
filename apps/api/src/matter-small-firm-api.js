import { createHash } from "node:crypto";
import {
  assertMatterIsoTimestamp,
  createMatterTask,
} from "../../../packages/matter/src/model.js";
import {
  createSmallFirmMatterWorkService,
} from "../../../packages/matter/src/small-firm-work-service.js";
import {
  createMatterFollowUpService,
} from "../../../packages/matter/src/followup-service.js";
import {
  handoffMatter,
  recordMatterMeeting,
} from "../../../packages/matter/src/small-firm-detail-service.js";
import {
  archiveMatter,
  listArchivedMatters,
  restoreArchivedMatter,
} from "../../../packages/matter/src/small-firm-ops-service.js";
import {
  createSmallFirmTimeService,
} from "../../../packages/time-expense/src/weekly-time-service.js";
import {
  createMatterPreBillFromWip,
} from "../../../packages/billing/src/prebill-service.js";
import {
  createDraftInvoiceFromPreBill,
  projectInvoiceLifecycle,
  transitionInvoiceLifecycle,
} from "../../../packages/billing/src/invoice-service.js";
import {
  generateWipFromApprovedItems,
  queryMatterBillingWip,
} from "../../../packages/billing/src/wip-service.js";
import {
  importPayment,
} from "../../../packages/payments/src/payment-service.js";
import {
  applyMatterPayment,
  queryMatterArQueue,
  reconcileMatterArQueue,
  reverseMatterPaymentAllocation,
} from "../../../packages/payments/src/ar-service.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { resolveMatterSmallFirmOpsRoute } from "./matter-small-firm-api-catalog.js";
import {
  readMatterCloseoutBlockers,
  readMatterDetail,
  readMatterFollowUpSavedView,
  readMatterWeeklyOperationsCsv,
} from "./matter-small-firm-detail-report-read-models.js";
import {
  readMatterCalendar,
  readMatterTaskQueue,
  readMatterTodayOperations,
} from "./matter-small-firm-read-models.js";

export { resolveMatterCloseoutBlockers } from "./matter-small-firm-detail-report-read-models.js";

const DEFAULT_TIME_ZONE = "Asia/Seoul";
const FINANCE_SECRET_FIELDS = new Set([
  "bank_reference",
  "credential_material",
  "raw_source_payload",
  "source_hashes",
  "source_manifest_hash",
  "transaction_fingerprint",
]);
const WIP_SOURCE_ID_FIELDS = Object.freeze({
  TimeEntry: "time_entry_id",
  Expense: "expense_id",
  Disbursement: "disbursement_id",
});
const WIP_SOURCE_REF_FIELDS = new Set([
  "model_type",
  "source_id",
  "id",
  "resource_id",
  "tenant_id",
  "matter_id",
  ...Object.values(WIP_SOURCE_ID_FIELDS),
]);
const FINANCE_READ_POLICY_BY_MODEL = Object.freeze({
  TimeEntry: Object.freeze({ action: "finance:time:read", resourceType: "time_entry" }),
  Expense: Object.freeze({ action: "finance:expense:read", resourceType: "expense" }),
  Disbursement: Object.freeze({ action: "finance:disbursement:read", resourceType: "disbursement" }),
  RateCard: Object.freeze({ action: "finance:fee_arrangement:read", resourceType: "rate_card" }),
  FeeArrangement: Object.freeze({ action: "finance:fee_arrangement:read", resourceType: "fee_arrangement" }),
  WipItem: Object.freeze({ action: "finance:wip:read", resourceType: "wip" }),
  WipSnapshot: Object.freeze({ action: "finance:wip:read", resourceType: "wip_snapshot" }),
  PreBill: Object.freeze({ action: "finance:prebill:read", resourceType: "prebill" }),
  BillingAdjustment: Object.freeze({ action: "finance:prebill:read", resourceType: "prebill" }),
  Invoice: Object.freeze({ action: "finance:invoice:read", resourceType: "invoice" }),
  InvoiceLine: Object.freeze({ action: "finance:invoice:read", resourceType: "invoice" }),
  TaxInvoice: Object.freeze({ action: "finance:invoice:read", resourceType: "invoice" }),
  InvoiceCorrection: Object.freeze({ action: "finance:invoice:read", resourceType: "invoice" }),
  Payment: Object.freeze({ action: "finance:payment:read", resourceType: "payment" }),
  PaymentAllocation: Object.freeze({
    action: "finance:payment_allocation:read",
    resourceType: "payment_allocation",
  }),
  PaymentMatch: Object.freeze({ action: "finance:payment_match:read", resourceType: "payment_match" }),
  ARBalance: Object.freeze({ action: "finance:ar:read", resourceType: "ar_aging" }),
  ARAgingSnapshot: Object.freeze({ action: "finance:ar:read", resourceType: "ar_aging" }),
});
const FINANCE_READ_POLICIES = Object.freeze(
  [...new Map(
    Object.values(FINANCE_READ_POLICY_BY_MODEL)
      .map((policy) => [`${policy.action}:${policy.resourceType}`, policy]),
  ).values()],
);

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nowIso(runtime) {
  const value = runtime.now();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("runtime clock must return a valid date");
  return date.toISOString();
}

export function matterBusinessDate(value, timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("clock must return a valid date");
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  } catch {
    throw new TypeError("time_zone must be a valid IANA timezone");
  }
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => ["year", "month", "day"].includes(type))
      .map(({ type, value: part }) => [type, part]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnly(runtime, timeZone = DEFAULT_TIME_ZONE) {
  return matterBusinessDate(nowIso(runtime), timeZone);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value ?? null;
}

function fingerprint(operation, body, actorId) {
  const {
    audit_hint_ref: _auditHintRef,
    permission_ref: _permissionRef,
    request_id: _requestId,
    ...payload
  } = body ?? {};
  return createHash("sha256")
    .update(JSON.stringify(canonical({ operation, actor_id: actorId, payload })))
    .digest("hex");
}

function sanitizeFinanceValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeFinanceValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !FINANCE_SECRET_FIELDS.has(key))
      .map(([key, item]) => [key, sanitizeFinanceValue(item)]),
  );
}

function quickTimeEntryPayload(input = {}) {
  return Object.fromEntries(
    [
      "time_entry_id",
      "matter_id",
      "role_id",
      "work_date",
      "duration_minutes",
      "narrative",
      "billable",
      "currency",
    ]
      .filter((field) => input[field] !== undefined)
      .map((field) => [field, input[field]]),
  );
}

function errorResult(status, requestId, code, auditHintRef, uiState = "error") {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: [code],
      audit_hint_ref: auditHintRef ?? null,
      ui_state: uiState,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function dataResult({
  requestId,
  auditHintRef,
  item,
  items,
  payload = {},
  status = 200,
  uiState,
} = {}) {
  const hasItems = Array.isArray(items);
  const inferredState = hasItems
    ? items.length === 0 ? "empty" : "populated"
    : item == null ? "empty" : "populated";
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "passed",
      ...(hasItems ? { items } : {}),
      ...(item !== undefined ? { item } : {}),
      ...payload,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef ?? null,
      ui_state: uiState ?? inferredState,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function requestScope(query = {}, body = {}) {
  if (query.tenant_id && body.tenant_id && query.tenant_id !== body.tenant_id) {
    throw new TypeError("tenant_id must match between query and body");
  }
  return {
    tenant_id: query.tenant_id ?? body.tenant_id,
    permission_ref: query.permission_ref ?? body.permission_ref,
    audit_hint_ref: query.audit_hint_ref ?? body.audit_hint_ref,
  };
}

function validateScope(scope, requestId) {
  if (!scope.tenant_id) {
    return errorResult(400, requestId, "MATTER_API_TENANT_REQUIRED", scope.audit_hint_ref, "blocked");
  }
  if (!scope.permission_ref) {
    return errorResult(400, requestId, "MATTER_API_PERMISSION_REF_REQUIRED", scope.audit_hint_ref, "blocked");
  }
  if (!scope.audit_hint_ref) {
    return errorResult(400, requestId, "MATTER_API_AUDIT_HINT_REQUIRED", null, "blocked");
  }
  return null;
}

function gate({
  context,
  scope,
  requestId,
  action,
  resourceType,
  resourceId,
  matterId,
} = {}) {
  const invalid = validateScope(scope, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: scope.tenant_id,
      resource_type: resourceType,
      ...(resourceId ? { resource_id: resourceId } : {}),
      ...(matterId ? { matter_id: matterId } : {}),
    },
    action,
  });
  if (decision.effect === "allow") return null;
  if (["review_required", "approval_required"].includes(decision.effect)) {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [decision.effect === "review_required"
          ? "MATTER_API_REVIEW_REQUIRED"
          : "MATTER_API_APPROVAL_REQUIRED"],
        audit_hint_ref: scope.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResult(
    403,
    requestId,
    decision.reason === "cross_tenant_deny"
      ? "MATTER_API_CROSS_TENANT_DENIED"
      : "MATTER_API_UNAUTHORIZED_OMISSION",
    scope.audit_hint_ref,
    "denied",
  );
}

function canReadMatter(context, tenantId, matterId) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: tenantId,
      resource_type: "matter",
      resource_id: matterId,
      matter_id: matterId,
    },
    action: "matter:ops:read",
  }).effect === "allow";
}

function grantedMatterScopes(context, tenantId, matterId) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: tenantId,
      resource_type: "matter",
      resource_id: matterId,
      matter_id: matterId,
    },
    action: "matter:internal",
  }).effect === "allow"
    ? ["matter:internal"]
    : [];
}

function financePermissionContext(context, resourceId) {
  if (!context || !Array.isArray(context.object_acl)) return context;
  return {
    ...context,
    object_acl: context.object_acl.filter(
      (entry) => entry.resource_id === undefined || entry.resource_id === resourceId,
    ),
  };
}

function canAccessFinance(
  context,
  tenantId,
  {
    action = "finance:ar:read",
    resourceType = "matter_finance",
    resourceId,
    matterId,
  } = {},
) {
  return evaluateRouteDecision({
    context: financePermissionContext(context, resourceId),
    resource: {
      tenant_id: tenantId,
      resource_type: resourceType,
      ...(resourceId ? { resource_id: resourceId } : {}),
      ...(matterId ? { matter_id: matterId } : {}),
    },
    action,
  }).effect === "allow";
}

function canAccessFinanceRow(context, tenantId, row, options = {}) {
  const policy = FINANCE_READ_POLICY_BY_MODEL[row?.model_type];
  if (!policy) return false;
  const matterId = row?.matter_id ?? options.matterId ?? null;
  return canAccessFinance(context, tenantId, {
    ...policy,
    matterId,
    resourceId: row?.resource_id ?? options.resourceId,
  });
}

function financeReadRepository({
  runtime,
  context,
  tenantId,
  matterId = null,
  requiredAction = null,
  requiredResourceType = "matter_finance",
} = {}) {
  const allowed = (row) => {
    if (!row || (matterId && row.matter_id && row.matter_id !== matterId)) return false;
    if (!canAccessFinanceRow(context, tenantId, row, { matterId })) return false;
    return !requiredAction || canAccessFinance(context, tenantId, {
      action: requiredAction,
      resourceType: requiredResourceType,
      resourceId: row.resource_id,
      matterId: row.matter_id ?? matterId,
    });
  };
  return Object.freeze({
    list(query = {}) {
      return runtime.financeRepository.list(query).filter(allowed);
    },
    get(ref = {}) {
      const row = runtime.financeRepository.get(ref);
      return allowed(row) ? row : undefined;
    },
  });
}

function canAccessAnyFinanceRead(context, tenantId, matterId = null) {
  return FINANCE_READ_POLICIES.some(({ action, resourceType }) =>
    canAccessFinance(context, tenantId, { action, resourceType, matterId }));
}

function listVisible(runtime, context, tenantId, modelType, matterId = null) {
  return runtime.matterRepository
    .list({
      tenant_id: tenantId,
      model_type: modelType,
      ...(matterId ? { matter_id: matterId } : {}),
    })
    .filter((record) => canReadMatter(context, tenantId, record.matter_id ?? matterId));
}

function weeklyTimeCompleteness(
  runtime,
  tenantId,
  actorIds,
  currentIso = nowIso(runtime),
  {
    repository = runtime.financeRepository,
    timeZone = DEFAULT_TIME_ZONE,
  } = {},
) {
  const service = createSmallFirmTimeService({
    repository,
    now: currentIso,
  });
  return service.listWeeklyTimeCompleteness({
    tenant_id: tenantId,
    actor_ids: actorIds,
    now: currentIso,
    timezone: timeZone,
  });
}

function todayOperations({
  runtime,
  context,
  tenantId,
  timeZone = DEFAULT_TIME_ZONE,
  now,
} = {}) {
  const currentIso = now instanceof Date
    ? assertMatterIsoTimestamp(now.toISOString(), "as_of")
    : assertMatterIsoTimestamp(now ?? nowIso(runtime), "as_of");
  const asOfDate = matterBusinessDate(currentIso, timeZone);
  const tasks = listVisible(runtime, context, tenantId, "MatterTask");
  const followUps = listVisible(runtime, context, tenantId, "MatterFollowUp");
  const financeRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
  });
  const wipRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    requiredAction: "finance:wip:read",
    requiredResourceType: "wip",
  });
  const arRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    requiredAction: "finance:ar:read",
    requiredResourceType: "ar_aging",
  });
  const financeAllowed = canAccessAnyFinanceRead(context, tenantId)
    || financeRepository.list({ tenant_id: tenantId }).length > 0;
  return readMatterTodayOperations({
    tenantId,
    timeZone,
    asOf: currentIso,
    asOfDate,
    tasks,
    followUps,
    financeAllowed,
    financeRepository,
    wipRepository,
    arRepository,
    weeklyTimeCompleteness: (actorIds) => weeklyTimeCompleteness(
      runtime,
      tenantId,
      actorIds,
      currentIso,
      { repository: financeRepository, timeZone },
    ),
  });
}

function matterDetail({ runtime, context, tenantId, matterId, timeZone } = {}) {
  if (!canReadMatter(context, tenantId, matterId)) return null;
  return readMatterDetail({
    matterRepository: runtime.matterRepository,
    financeRepository: financeReadRepository({ runtime, context, tenantId, matterId }),
    canReadMatter: (rowMatterId) => canReadMatter(context, tenantId, rowMatterId),
    tenantId,
    matterId,
    grantedScopes: grantedMatterScopes(context, tenantId, matterId),
    now: nowIso(runtime),
    timeZone: timeZone ?? DEFAULT_TIME_ZONE,
  });
}

function closeoutBlockers({
  runtime,
  context,
  tenantId,
  matterId,
  timeZone = DEFAULT_TIME_ZONE,
} = {}) {
  const financeRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    matterId,
  });
  const arRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    matterId,
    requiredAction: "finance:ar:read",
    requiredResourceType: "ar_aging",
  });
  return readMatterCloseoutBlockers({
    matterRepository: runtime.matterRepository,
    financeRepository,
    arRepository,
    canReadMatter: (rowMatterId) => canReadMatter(context, tenantId, rowMatterId),
    tenantId,
    matterId,
    asOfDate: dateOnly(runtime, timeZone),
  });
}

function resolveWipSourceItems({ repository, tenantId, matterId, body } = {}) {
  if (
    Object.hasOwn(body, "source_items")
    || Object.hasOwn(body, "rate_card")
    || Object.hasOwn(body, "fee_arrangement")
  ) {
    throw new TypeError("WIP generation accepts source_refs and pricing selection IDs only");
  }
  if (!Array.isArray(body.source_refs) || body.source_refs.length === 0) {
    throw new TypeError("source_refs must be a non-empty array");
  }
  return body.source_refs.map((ref, index) => {
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      throw new TypeError(`source_refs[${index}] must be an object`);
    }
    if (Object.keys(ref).some((field) => !WIP_SOURCE_REF_FIELDS.has(field))) {
      throw new TypeError(`source_refs[${index}] contains unsupported fields`);
    }
    const modelType = requiredString(ref.model_type, `source_refs[${index}].model_type`);
    const idField = WIP_SOURCE_ID_FIELDS[modelType];
    if (!idField) throw new TypeError(`source_refs[${index}].model_type is unsupported`);
    if (ref.tenant_id && ref.tenant_id !== tenantId) {
      throw new TypeError(`source_refs[${index}] is outside the tenant scope`);
    }
    if (ref.matter_id && ref.matter_id !== matterId) {
      throw new TypeError(`source_refs[${index}] is outside the Matter scope`);
    }
    const sourceId = requiredString(
      ref.source_id ?? ref[idField] ?? ref.resource_id ?? ref.id,
      `source_refs[${index}].source_id`,
    );
    const item = repository.get({
      tenant_id: tenantId,
      model_type: modelType,
      [idField]: sourceId,
    });
    if (!item) throw new TypeError(`source_refs[${index}] does not resolve in the tenant scope`);
    if (item.tenant_id !== tenantId || item.matter_id !== matterId) {
      throw new TypeError(`source_refs[${index}] is outside the Matter scope`);
    }
    return item;
  });
}

function resolveWipPricing({ repository, tenantId, matterId, body } = {}) {
  const requestedArrangementId = optionalString(body.fee_arrangement_id);
  const arrangements = repository
    .list({ tenant_id: tenantId, matter_id: matterId, model_type: "FeeArrangement" })
    .filter((record) => !requestedArrangementId || record.fee_arrangement_id === requestedArrangementId)
    .filter((record) => record.status !== "inactive");
  if (arrangements.length !== 1) {
    throw new TypeError("exactly one active fee_arrangement_id must resolve in the Matter scope");
  }
  const feeArrangement = arrangements[0];
  const linkedRateCardId = requiredString(feeArrangement.rate_card_id, "fee_arrangement.rate_card_id");
  if (body.rate_card_id && body.rate_card_id !== linkedRateCardId) {
    throw new TypeError("rate_card_id must match the selected fee arrangement");
  }
  const rateCard = repository.get({
    tenant_id: tenantId,
    model_type: "RateCard",
    rate_card_id: linkedRateCardId,
  });
  if (!rateCard || rateCard.tenant_id !== tenantId) {
    throw new TypeError("fee arrangement rate card does not resolve in the tenant scope");
  }
  return { feeArrangement, rateCard };
}

function apiGuardKey(idempotencyKey) {
  return `matter-ops-api:${idempotencyKey}`;
}

function domainKey(operation, idempotencyKey) {
  return `matter-ops-domain:${operation}:${idempotencyKey}`;
}

function replayResult(existing) {
  return {
    ...existing.response,
    body: {
      ...existing.response.body,
      idempotent_replay: true,
    },
  };
}

function executeMutation({
  runtime,
  scope,
  context,
  requestId,
  body,
  operation,
  action = "matter:ops:write",
  resourceType,
  resourceId,
  matterId,
  status = 200,
  sanitizeFinance = false,
  domainIdempotencyOnly = false,
  execute,
} = {}) {
  const gated = gate({
    context,
    scope,
    requestId,
    action,
    resourceType,
    resourceId,
    matterId,
  });
  if (gated) return gated;
  const idempotencyKey = requiredString(body.idempotency_key, "idempotency_key");
  const actorId = requiredString(context?.principal?.user_id, "authenticated actor");
  const requestFingerprint = fingerprint(operation, body, actorId);
  const guardKey = apiGuardKey(idempotencyKey);
  const existing = domainIdempotencyOnly
    ? null
    : runtime.matterRepository.getIdempotency({
        tenant_id: scope.tenant_id,
        idempotency_key: guardKey,
      });
  if (existing) {
    if (existing.request_fingerprint !== requestFingerprint) {
      return errorResult(
        409,
        requestId,
        "MATTER_OPS_IDEMPOTENCY_CONFLICT",
        scope.audit_hint_ref,
        "conflict",
      );
    }
    return replayResult(existing);
  }
  const result = execute({
    actorId,
    idempotencyKey: domainKey(operation, idempotencyKey),
    occurredAt: nowIso(runtime),
  });
  const safeResult = sanitizeFinance ? sanitizeFinanceValue(result) : result;
  const {
    outcome: commandOutcome,
    ...safePayload
  } = safeResult ?? {};
  const item = safeResult?.item
    ?? safeResult?.task
    ?? safeResult?.deadline
    ?? safeResult?.matter
    ?? safeResult?.invoice
    ?? safeResult?.payment
    ?? safeResult?.prebill
    ?? null;
  const response = dataResult({
    requestId,
    auditHintRef: scope.audit_hint_ref,
    item,
    payload: {
      ...safePayload,
      ...(commandOutcome ? { command_outcome: commandOutcome } : {}),
      idempotent_replay: safeResult?.idempotent_replay === true,
      state_idempotent: true,
      ...(sanitizeFinance ? {
        credential_material_included: false,
        bank_reference_included: false,
      } : {}),
    },
    status,
  });
  if (!domainIdempotencyOnly) {
    runtime.matterRepository.recordIdempotency({
      tenant_id: scope.tenant_id,
      idempotency_key: guardKey,
      operation,
      object_type: resourceType,
      object_id: resourceId ?? matterId ?? null,
      actor_id: actorId,
      request_fingerprint: requestFingerprint,
      response,
      created_at: nowIso(runtime),
    });
  }
  return response;
}

function timeBillingItem({ runtime, context, tenantId, query } = {}) {
  const matterId = optionalString(query.matter_id);
  const timeZone = query.time_zone ?? DEFAULT_TIME_ZONE;
  const repository = financeReadRepository({
    runtime,
    context,
    tenantId,
    matterId,
  });
  const wipRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    matterId,
    requiredAction: "finance:wip:read",
    requiredResourceType: "wip",
  });
  const arRepository = financeReadRepository({
    runtime,
    context,
    tenantId,
    matterId,
    requiredAction: "finance:ar:read",
    requiredResourceType: "ar_aging",
  });
  const completeness = weeklyTimeCompleteness(
    runtime,
    tenantId,
    optionalString(query.actor_id) ? [query.actor_id] : undefined,
    query.as_of ?? nowIso(runtime),
    { repository, timeZone },
  );
  const wip = queryMatterBillingWip({
    repository: wipRepository,
    tenant_id: tenantId,
    matter_id: matterId,
    as_of_date: query.as_of_date ?? dateOnly(runtime, timeZone),
  });
  const ar = queryMatterArQueue({
    repository: arRepository,
    tenant_id: tenantId,
    matter_id: matterId,
    as_of_date: query.as_of_date ?? dateOnly(runtime, timeZone),
  });
  const invoices = repository
    .list({
      tenant_id: tenantId,
      model_type: "Invoice",
      ...(query.matter_id ? { matter_id: query.matter_id } : {}),
    })
    .map((invoice) => {
      try {
        return projectInvoiceLifecycle({
          invoice,
          as_of_date: query.as_of_date ?? dateOnly(runtime, timeZone),
        });
      } catch {
        return { ...invoice, lifecycle_error: true };
      }
    });
  const payments = repository.list({
    tenant_id: tenantId,
    model_type: "Payment",
    ...(query.matter_id ? { matter_id: query.matter_id } : {}),
  });
  const paymentAllocations = repository.list({
    tenant_id: tenantId,
    model_type: "PaymentAllocation",
    ...(query.matter_id ? { matter_id: query.matter_id } : {}),
  });
  return sanitizeFinanceValue({
    weekly_time: completeness,
    wip,
    ar,
    invoices,
    payments,
    payment_allocations: paymentAllocations,
    credential_material_included: false,
    bank_reference_included: false,
  });
}

function timeEntryId(entry) {
  return entry?.time_entry_id ?? entry?.resource_id ?? entry?.id ?? null;
}

function timeEntryOwner(entry) {
  return entry?.actor_id
    ?? entry?.timekeeper_actor_id
    ?? entry?.employee_id
    ?? entry?.user_id
    ?? null;
}

function selectedValues(...values) {
  return values.flatMap((value) =>
    value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
}

function validDateKey(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  return value;
}

function addDateKeyDays(value, days) {
  const [year, month, day] = validDateKey(value, "date").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weeklyTimeBounds(runtime, body) {
  const timeZone = body.timezone ?? body.time_zone ?? DEFAULT_TIME_ZONE;
  const week = body.week && typeof body.week === "object" ? body.week : {};
  const requestedStart = body.week_start
    ?? body.weekStart
    ?? week.start
    ?? week.week_start
    ?? (typeof body.week === "string" ? body.week : null);
  let weekStart;
  if (requestedStart) {
    weekStart = validDateKey(requestedStart, "week_start");
  } else {
    const today = dateOnly(runtime, timeZone);
    const [year, month, day] = today.split("-").map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = localDate.getUTCDay();
    localDate.setUTCDate(localDate.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
    weekStart = localDate.toISOString().slice(0, 10);
  }
  const weekEnd = validDateKey(
    body.week_end ?? body.weekEnd ?? week.end ?? week.week_end ?? addDateKeyDays(weekStart, 6),
    "week_end",
  );
  if (weekEnd < weekStart) throw new TypeError("week_end must be on or after week_start");
  return {
    explicit: Boolean(
      body.week_start
      ?? body.week_end
      ?? body.weekStart
      ?? body.weekEnd
      ?? body.week,
    ),
    timeZone,
    weekStart,
    weekEnd,
  };
}

function resolveWeeklyTimeTargets({ runtime, tenantId, body, actorId } = {}) {
  const selectedIds = new Set(
    selectedValues(body.time_entry_ids, body.entry_ids, body.timeEntryIds)
      .map(String)
      .filter(Boolean),
  );
  const selectedOwners = new Set(
    selectedValues(
      body.actor_ids,
      body.timekeeper_actor_ids,
      body.owner_actor_ids,
      body.timekeeper_actor_id,
      body.owner_actor_id,
      body.employee_id,
      body.actor_is_owner === false ? null : actorId,
    )
      .map(String)
      .filter(Boolean),
  );
  const matterIds = new Set(
    selectedValues(body.matter_ids).map(String).filter(Boolean),
  );
  const bounds = weeklyTimeBounds(runtime, body);
  return runtime.financeRepository
    .list({ tenant_id: tenantId, model_type: "TimeEntry" })
    .filter((entry) => {
      const id = timeEntryId(entry);
      if (selectedIds.size > 0 && !selectedIds.has(String(id))) return false;
      if ((selectedIds.size === 0 || bounds.explicit)
        && (entry.work_date < bounds.weekStart || entry.work_date > bounds.weekEnd)) return false;
      if (body.matter_id && entry.matter_id !== body.matter_id) return false;
      if (matterIds.size > 0 && !matterIds.has(entry.matter_id)) return false;
      if (selectedIds.size === 0 && selectedOwners.size > 0
        && !selectedOwners.has(timeEntryOwner(entry))) return false;
      return true;
    });
}

function authorizeWeeklyTimeTargets({
  runtime,
  scope,
  context,
  requestId,
  body,
} = {}) {
  const actorId = requiredString(context?.principal?.user_id, "authenticated actor");
  const items = resolveWeeklyTimeTargets({
    runtime,
    tenantId: scope.tenant_id,
    body,
    actorId,
  });
  for (const item of items) {
    const resourceId = timeEntryId(item);
    const gated = gate({
      context: financePermissionContext(context, resourceId),
      scope,
      requestId,
      action: "finance:time:write",
      resourceType: "time_entry",
      resourceId,
      matterId: item.matter_id,
    });
    if (gated) return { gated, items: [] };
    if (
      timeEntryOwner(item) !== actorId
      && !canAccessFinance(context, scope.tenant_id, {
        action: "finance:time:manage",
        resourceType: "time_entry",
        resourceId,
        matterId: item.matter_id,
      })
    ) {
      return {
        gated: errorResult(
          403,
          requestId,
          "MATTER_OPS_OWNER_OR_MANAGER_REQUIRED",
          scope.audit_hint_ref,
          "denied",
        ),
        items: [],
      };
    }
  }
  return { gated: null, items };
}

function methodNotAllowed(requestId, auditHintRef) {
  return errorResult(405, requestId, "MATTER_OPS_METHOD_NOT_ALLOWED", auditHintRef, "blocked");
}

function notFound(requestId, auditHintRef) {
  return errorResult(404, requestId, "MATTER_OPS_ROUTE_NOT_FOUND", auditHintRef, "blocked");
}

function classifyError(error, { method, requestId, auditHintRef } = {}) {
  if (error?.status === 403) {
    return errorResult(403, requestId, error.safe_error_code ?? "MATTER_OPS_ACCESS_DENIED", auditHintRef, "denied");
  }
  if (
    error?.status === 409
    || error?.code === "LAWOS_IDEMPOTENCY_CONFLICT"
    || String(error?.code ?? "").includes("IDEMPOTENCY_CONFLICT")
  ) {
    return errorResult(409, requestId, error.safe_error_code ?? "MATTER_OPS_IDEMPOTENCY_CONFLICT", auditHintRef, "conflict");
  }
  if (error?.status === 404 || /not found/i.test(String(error?.message ?? ""))) {
    return errorResult(404, requestId, "MATTER_OPS_NOT_FOUND", auditHintRef, "blocked");
  }
  if (error?.status === 422) {
    return errorResult(
      422,
      requestId,
      error.safe_error_code ?? "MATTER_OPS_COMMAND_REJECTED",
      auditHintRef,
      "blocked",
    );
  }
  if (error instanceof TypeError) {
    return errorResult(
      error?.status >= 400 && error.status < 500 ? error.status : 400,
      requestId,
      error.safe_error_code ?? "MATTER_OPS_VALIDATION_ERROR",
      auditHintRef,
      "blocked",
    );
  }
  return errorResult(503, requestId, "MATTER_OPS_RUNTIME_UNAVAILABLE", auditHintRef, "error");
}

function parseMatterSmallFirmRequest({
  pathname,
  method,
  query = {},
  body = {},
  requestId,
} = {}) {
  const auditHintRef = query.audit_hint_ref ?? body.audit_hint_ref;
  return {
    pathname,
    method,
    query,
    body,
    requestId,
    auditHintRef,
    scope: requestScope(query, body),
    route: resolveMatterSmallFirmOpsRoute(pathname),
  };
}

function createMatterSmallFirmServices({ runtime, query = {} } = {}) {
  const work = createSmallFirmMatterWorkService({
    repository: runtime.matterRepository,
    clock: () => nowIso(runtime),
  });
  const followups = createMatterFollowUpService({
    repository: runtime.matterRepository,
    clock: () => nowIso(runtime),
    timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
    createTask: ({ repository, task }) => ({ item: repository.create(createMatterTask(task)) }),
  });
  const time = createSmallFirmTimeService({
    repository: runtime.financeRepository,
    now: nowIso(runtime),
  });
  return Object.freeze({ work, followups, time });
}

export async function handleMatterSmallFirmApiRequest({
  pathname,
  method,
  query = {},
  body = {},
  context,
  requestId,
  runtime,
} = {}) {
  const auditHintRef = query.audit_hint_ref ?? body.audit_hint_ref;
  try {
    const parsed = parseMatterSmallFirmRequest({
      pathname,
      method,
      query,
      body,
      requestId,
    });
    const {
      auditHintRef,
      route,
      scope,
    } = parsed;
    if (!route) {
      return notFound(requestId, auditHintRef);
    }
    if (!route.route.methods.includes(method)) return methodNotAllowed(requestId, auditHintRef);
    const { work, followups, time } = createMatterSmallFirmServices({ runtime, query });

    if (route.route.id === "today") {
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter_operations",
      });
      if (gated) return gated;
      const result = todayOperations({
        runtime,
        context,
        tenantId: scope.tenant_id,
        timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
        now: query.as_of,
      });
      return dataResult({
        requestId,
        auditHintRef,
        item: {
          ...result.operations,
          finance_state: result.finance_state,
        },
      });
    }

    if (route.route.id === "tasks") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "matter:ops:read",
          resourceType: "matter_task",
        });
        if (gated) return gated;
        const result = readMatterTaskQueue({
          listTaskQueue: work.listTaskQueue,
          canReadMatter: (matterId) => canReadMatter(context, scope.tenant_id, matterId),
          tenantId: scope.tenant_id,
          actorId: context?.principal?.user_id,
          view: query.view,
          asOf: query.as_of,
          clock: () => nowIso(runtime),
          timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
          matterId: query.matter_id,
          includeTerminal: query.include_terminal === true
            || query.include_terminal === "true",
        });
        return dataResult({
          requestId,
          auditHintRef,
          items: result.items,
          payload: {
            count: result.count,
            summary: result.summary,
            view: result.view,
            include_terminal: result.include_terminal,
            as_of: result.as_of,
            time_zone: result.time_zone,
          },
        });
      }
      if (method === "POST") {
        const task = body.task ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "matter.task.quick_create",
          resourceType: "matter_task",
          matterId: task.matter_id,
          status: 201,
          execute: ({ actorId, idempotencyKey, occurredAt }) => work.quickCreateTask({
            tenant_id: scope.tenant_id,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            task,
            occurred_at: occurredAt,
            request_id: requestId,
            source_ref: body.source_ref,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "task") {
      const taskId = decodeURIComponent(route.params.task_id);
      const current = runtime.matterRepository.get({
        tenant_id: scope.tenant_id,
        model_type: "MatterTask",
        task_id: taskId,
      });
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.task.transition",
        resourceType: "matter_task",
        resourceId: taskId,
        matterId: current?.matter_id ?? body.matter_id,
        execute: ({ actorId, idempotencyKey, occurredAt }) => work.transitionTask({
          tenant_id: scope.tenant_id,
          task_id: taskId,
          to_status: body.to_status ?? body.status,
          actor_id: actorId,
          reason: body.reason
            ?? body.blocked_reason
            ?? body.blockedReason,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
          request_id: requestId,
          source_ref: body.source_ref,
        }),
      });
    }

    if (route.route.id === "calendar") {
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter_calendar",
      });
      if (gated) return gated;
      const result = readMatterCalendar({
        getWeekSchedule: work.getWeekSchedule,
        canReadMatter: (matterId) => canReadMatter(context, scope.tenant_id, matterId),
        tenantId: scope.tenant_id,
        weekStart: query.week_start,
        timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
        matterId: query.matter_id,
      });
      return dataResult({
        requestId,
        auditHintRef,
        items: result.items,
        payload: {
          count: result.count,
          week_start: result.week_start,
          week_end: result.week_end,
          time_zone: result.time_zone,
        },
      });
    }

    if (route.route.id === "deadlines") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "matter:ops:read",
          resourceType: "matter_deadline",
        });
        if (gated) return gated;
        const result = work.getWeekSchedule({
          tenant_id: scope.tenant_id,
          week_start: query.week_start,
          time_zone: query.time_zone ?? DEFAULT_TIME_ZONE,
          matter_id: query.matter_id,
        });
        const items = result.items.filter((item) =>
          item.source === "calendar"
          && canReadMatter(context, scope.tenant_id, item.matter_id));
        return dataResult({
          requestId,
          auditHintRef,
          items,
          payload: { count: items.length, week_start: result.week_start, week_end: result.week_end },
        });
      }
      if (method === "POST") {
        const deadline = body.deadline ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "matter.deadline.create",
          resourceType: "matter_deadline",
          matterId: deadline.matter_id,
          status: 201,
          execute: ({ actorId, idempotencyKey, occurredAt }) => work.createDeadline({
            tenant_id: scope.tenant_id,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            deadline,
            occurred_at: occurredAt,
            request_id: requestId,
            source_ref: body.source_ref,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "deadlineHistory") {
      const eventId = decodeURIComponent(route.params.deadline_id);
      const deadline = runtime.matterRepository.get({
        tenant_id: scope.tenant_id,
        model_type: "MatterCalendarEvent",
        event_id: eventId,
      });
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter_deadline",
        resourceId: eventId,
        matterId: deadline?.matter_id ?? query.matter_id,
      });
      if (gated) return gated;
      const result = work.listDeadlineHistory({
        tenant_id: scope.tenant_id,
        event_id: eventId,
        matter_id: query.matter_id,
      });
      return dataResult({ requestId, auditHintRef, items: result.items, payload: { count: result.count } });
    }

    if (route.route.id === "deadline") {
      const eventId = decodeURIComponent(route.params.deadline_id);
      const current = runtime.matterRepository.get({
        tenant_id: scope.tenant_id,
        model_type: "MatterCalendarEvent",
        event_id: eventId,
      });
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.deadline.reschedule",
        resourceType: "matter_deadline",
        resourceId: eventId,
        matterId: current?.matter_id ?? body.matter_id,
        execute: ({ actorId, idempotencyKey, occurredAt }) => work.rescheduleDeadline({
          tenant_id: scope.tenant_id,
          event_id: eventId,
          new_starts_at: body.new_starts_at ?? body.starts_at,
          new_ends_at: body.new_ends_at ?? body.ends_at,
          actor_id: actorId,
          reason: body.reason,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
          request_id: requestId,
          source_ref: body.source_ref,
        }),
      });
    }

    if (route.route.id === "matters") {
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter",
      });
      if (gated) return gated;
      const view = query.view ?? query.status ?? "active";
      if (!["active", "all", "archived", "open", "closed"].includes(view)) {
        throw new TypeError("view must be active, all, archived, open, or closed");
      }
      const source = view === "archived"
        ? listArchivedMatters({
            repository: runtime.matterRepository,
            tenant_id: scope.tenant_id,
          })
        : runtime.matterRepository
            .list({ tenant_id: scope.tenant_id, model_type: "Matter" })
            .filter((matter) => view === "all"
              || (view === "active" ? matter.status !== "archived" : matter.status === view));
      const items = source.filter((matter) =>
        canReadMatter(context, scope.tenant_id, matter.matter_id));
      return dataResult({
        requestId,
        auditHintRef,
        items,
        payload: { count: items.length, view },
      });
    }

    if (route.route.id === "matterArchive") {
      const matterId = decodeURIComponent(route.params.matter_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.archive",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
        execute: ({ actorId, idempotencyKey, occurredAt }) => archiveMatter({
          repository: runtime.matterRepository,
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          reason: body.reason,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "matterCloseout") {
      const matterId = decodeURIComponent(route.params.matter_id);
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
      });
      if (gated) return gated;
      const items = closeoutBlockers({
        runtime,
        context,
        tenantId: scope.tenant_id,
        matterId,
        timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
      });
      return dataResult({
        requestId,
        auditHintRef,
        items,
        payload: { count: items.length, can_close: items.length === 0 },
      });
    }

    if (route.route.id === "matterHandoffs") {
      const matterId = decodeURIComponent(route.params.matter_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.handoff",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
        execute: ({ actorId, idempotencyKey, occurredAt }) => handoffMatter({
          repository: runtime.matterRepository,
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          actor_id: actorId,
          new_owner_user_id: body.new_owner_user_id ?? body.owner_user_id,
          ...(Object.hasOwn(body, "new_backup_user_id")
            ? { new_backup_user_id: body.new_backup_user_id }
            : Object.hasOwn(body, "backup_user_id")
              ? { new_backup_user_id: body.backup_user_id }
              : {}),
          note: body.note ?? body.memo,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "matterMeetings") {
      const matterId = decodeURIComponent(route.params.matter_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.meeting.record",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
        status: 201,
        execute: ({ actorId, idempotencyKey }) => recordMatterMeeting({
          repository: runtime.matterRepository,
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          meeting: body.meeting ?? body.item ?? body,
        }),
      });
    }

    if (route.route.id === "matterRestore") {
      const matterId = decodeURIComponent(route.params.matter_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.restore",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
        execute: ({ actorId, idempotencyKey, occurredAt }) => restoreArchivedMatter({
          repository: runtime.matterRepository,
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          target_status: body.target_status,
          reason: body.reason,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "matterDetail") {
      const matterId = decodeURIComponent(route.params.matter_id);
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter",
        resourceId: matterId,
        matterId,
      });
      if (gated) return gated;
      const item = matterDetail({
        runtime,
        context,
        tenantId: scope.tenant_id,
        matterId,
        timeZone: query.time_zone,
      });
      return dataResult({ requestId, auditHintRef, item: sanitizeFinanceValue(item) });
    }

    if (route.route.id === "followups") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "matter:ops:read",
          resourceType: "matter_followup",
        });
        if (gated) return gated;
        const result = readMatterFollowUpSavedView({
          listSavedView: followups.listSavedView,
          canReadMatter: (matterId) => canReadMatter(context, scope.tenant_id, matterId),
          tenantId: scope.tenant_id,
          view: query.view,
          ownerId: query.owner_id,
          matterId: query.matter_id,
          asOf: query.as_of ?? nowIso(runtime),
        });
        return dataResult({
          requestId,
          auditHintRef,
          items: result.items,
          payload: { count: result.count, view: result.view },
        });
      }
      if (method === "POST") {
        const followup = body.followup ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "matter.followup.create",
          resourceType: "matter_followup",
          matterId: body.matter_id ?? followup.matter_id,
          status: 201,
          execute: ({ actorId, idempotencyKey, occurredAt }) => followups.createFollowUp({
            tenant_id: scope.tenant_id,
            matter_id: body.matter_id ?? followup.matter_id,
            followup,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
            occurred_at: occurredAt,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "followupContacts") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "matter:ops:read",
          resourceType: "matter_followup_contact",
          matterId: query.matter_id,
        });
        if (gated) return gated;
        const items = followups.listContacts({
          tenant_id: scope.tenant_id,
          matter_id: query.matter_id,
          client_id: query.client_id,
          viewer: "internal",
        }).filter((item) => canReadMatter(context, scope.tenant_id, item.matter_id));
        return dataResult({ requestId, auditHintRef, items, payload: { count: items.length } });
      }
      if (method === "POST") {
        const contact = body.contact ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "matter.followup.contact.record",
          resourceType: "matter_followup_contact",
          matterId: body.matter_id ?? contact.matter_id,
          status: 201,
          execute: ({ actorId, idempotencyKey, occurredAt }) => followups.recordContact({
            tenant_id: scope.tenant_id,
            matter_id: body.matter_id ?? contact.matter_id,
            client_id: body.client_id ?? contact.client_id,
            contact,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
            occurred_at: occurredAt,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "followupTaskConversion") {
      const followupId = decodeURIComponent(route.params.followup_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.followup.convert_to_task",
        resourceType: "matter_followup",
        resourceId: followupId,
        matterId: body.matter_id,
        execute: ({ actorId, idempotencyKey, occurredAt }) => followups.convertRequestToTask({
          tenant_id: scope.tenant_id,
          matter_id: body.matter_id,
          followup_id: followupId,
          task: body.task,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "followupHandoffs") {
      const followupId = decodeURIComponent(route.params.followup_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.followup.handoff",
        resourceType: "matter_followup",
        resourceId: followupId,
        matterId: body.matter_id,
        execute: ({ actorId, idempotencyKey, occurredAt }) => followups.handoffFollowUp({
          tenant_id: scope.tenant_id,
          matter_id: body.matter_id,
          followup_id: followupId,
          to_owner_id: body.to_owner_id,
          backup_owner_id: body.backup_owner_id,
          reason: body.reason,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "followup") {
      const followupId = decodeURIComponent(route.params.followup_id);
      if (method === "GET") {
        // Check the collection-level operation scope before reading an object. A
        // resource-specific ACL is evaluated only after the tenant-scoped lookup
        // so denied IDs remain count-safe and do not disclose row existence.
        const routeContext = context && Array.isArray(context.object_acl)
          ? {
            ...context,
            object_acl: context.object_acl.filter((entry) =>
              entry.resource_id === undefined && entry.matter_id === undefined),
          }
          : context;
        const routeGated = gate({
          context: routeContext,
          scope,
          requestId,
          action: "matter:ops:read",
          resourceType: "matter_followup",
        });
        if (routeGated) {
          if (routeGated.body?.safe_error_codes?.includes("MATTER_API_CROSS_TENANT_DENIED")) {
            return errorResult(404, requestId, "MATTER_OPS_NOT_FOUND", scope.audit_hint_ref, "empty");
          }
          return routeGated;
        }

        const current = runtime.matterRepository.get({
          tenant_id: scope.tenant_id,
          model_type: "MatterFollowUp",
          resource_id: followupId,
        });
        const matterId = current?.matter_id;
        const matter = matterId
          ? runtime.matterRepository.get({
            tenant_id: scope.tenant_id,
            model_type: "Matter",
            matter_id: matterId,
          })
          : null;
        if (!current || !matter || matter.silent === true || matter.hidden_from_actor === true) {
          return errorResult(404, requestId, "MATTER_OPS_NOT_FOUND", scope.audit_hint_ref, "empty");
        }

        const matterVisible = evaluateRouteDecision({
          context,
          resource: {
            tenant_id: scope.tenant_id,
            resource_type: "matter",
            resource_id: matterId,
            matter_id: matterId,
          },
          action: "matter:ops:read",
        }).effect === "allow";
        const followupVisible = evaluateRouteDecision({
          context,
          resource: {
            tenant_id: scope.tenant_id,
            resource_type: "matter_followup",
            resource_id: followupId,
            matter_id: matterId,
          },
          action: "matter:ops:read",
        }).effect === "allow";
        const requiredScopes = [];
        if (matter.required_scope !== undefined && matter.required_scope !== null) {
          requiredScopes.push(matter.required_scope);
        }
        if (current.required_scope !== undefined && current.required_scope !== null) {
          requiredScopes.push(current.required_scope);
        }
        if (current.entry_kind === "internal_note") requiredScopes.push("matter:internal");
        const requiredScopeVisible = requiredScopes.every((requiredScope) =>
          typeof requiredScope === "string"
            && requiredScope.trim() !== ""
            && evaluateRouteDecision({
              context,
              resource: {
                tenant_id: scope.tenant_id,
                resource_type: "matter",
                resource_id: matterId,
                matter_id: matterId,
              },
              action: requiredScope,
            }).effect === "allow");
        if (!matterVisible || !followupVisible || !requiredScopeVisible) {
          return errorResult(404, requestId, "MATTER_OPS_NOT_FOUND", scope.audit_hint_ref, "empty");
        }

        const item = followups.getFollowUp({
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          followup_id: followupId,
        });
        return dataResult({ requestId, auditHintRef, item });
      }
      if (!["PATCH", "DELETE"].includes(method)) return methodNotAllowed(requestId, auditHintRef);
      const current = runtime.matterRepository.get({
        tenant_id: scope.tenant_id,
        model_type: "MatterFollowUp",
        resource_id: followupId,
      });
      const replay = body.idempotency_key
        ? runtime.matterRepository.getIdempotency({
            tenant_id: scope.tenant_id,
            idempotency_key: apiGuardKey(body.idempotency_key),
          })
        : null;
      const matterId = current?.matter_id
        ?? replay?.response?.body?.item?.matter_id
        ?? body.matter_id;
      if (method === "DELETE") {
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "matter.followup.delete",
          resourceType: "matter_followup",
          resourceId: followupId,
          matterId,
          execute: ({ actorId, idempotencyKey, occurredAt }) => followups.deleteFollowUp({
            tenant_id: scope.tenant_id,
            matter_id: matterId,
            followup_id: followupId,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
            occurred_at: occurredAt,
          }),
        });
      }
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "matter.followup.update",
        resourceType: "matter_followup",
        resourceId: followupId,
        matterId,
        execute: ({ actorId, idempotencyKey, occurredAt }) => followups.updateFollowUp({
          tenant_id: scope.tenant_id,
          matter_id: matterId,
          followup_id: followupId,
          patch: body.patch ?? body.item ?? body,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          occurred_at: occurredAt,
        }),
      });
    }

    if (route.route.id === "timeBilling") {
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter",
        resourceId: query.matter_id,
        matterId: query.matter_id,
      });
      if (gated) return gated;
      const item = timeBillingItem({
        runtime,
        context,
        tenantId: scope.tenant_id,
        query,
      });
      return dataResult({ requestId, auditHintRef, item });
    }

    if (route.route.id === "timeEntries") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "finance:time:read",
          resourceType: "time_entry",
          matterId: query.matter_id,
        });
        if (gated) return gated;
        const repository = financeReadRepository({
          runtime,
          context,
          tenantId: scope.tenant_id,
          matterId: optionalString(query.matter_id),
          requiredAction: "finance:time:read",
          requiredResourceType: "time_entry",
        });
        const items = repository
          .list({
            tenant_id: scope.tenant_id,
            model_type: "TimeEntry",
            ...(query.matter_id ? { matter_id: query.matter_id } : {}),
          })
          .filter((entry) => !query.actor_id || entry.actor_id === query.actor_id);
        return dataResult({ requestId, auditHintRef, items, payload: { count: items.length } });
      }
      if (method === "POST") {
        const entry = body.time_entry ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "finance.time.quick_create",
          action: "finance:time:write",
          resourceType: "time_entry",
          matterId: entry.matter_id,
          status: 201,
          sanitizeFinance: true,
          execute: ({ actorId, idempotencyKey }) => time.createQuickTimeEntry({
            ...quickTimeEntryPayload(entry),
            repository: runtime.financeRepository,
            tenant_id: scope.tenant_id,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    const timeWeekAction = {
      timeWeekSubmit: ["finance.time.week.submit", "submitTimeWeek"],
      timeWeekLock: ["finance.time.week.lock", "lockTimeWeek"],
      timeWeekUnlock: ["finance.time.week.unlock", "unlockTimeWeekWithinGrace"],
    }[route.route.id];
    if (timeWeekAction) {
      const [operation, serviceMethod] = timeWeekAction;
      const authorization = authorizeWeeklyTimeTargets({
        runtime,
        scope,
        context,
        requestId,
        body,
      });
      if (authorization.gated) return authorization.gated;
      const targetIds = authorization.items.map(timeEntryId);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation,
        action: "finance:time:write",
        resourceType: "time_entry_week",
        matterId: body.matter_id,
        sanitizeFinance: true,
        execute: ({ actorId, idempotencyKey, occurredAt }) => time[serviceMethod]({
          ...body,
          time_entry_ids: targetIds,
          entry_ids: [],
          timeEntryIds: [],
          timezone: body.timezone ?? body.time_zone ?? DEFAULT_TIME_ZONE,
          tenant_id: scope.tenant_id,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
          now: occurredAt,
        }),
      });
    }

    if (route.route.id === "wip") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "finance:wip:read",
          resourceType: "wip",
          matterId: query.matter_id,
        });
        if (gated) return gated;
        const repository = financeReadRepository({
          runtime,
          context,
          tenantId: scope.tenant_id,
          matterId: optionalString(query.matter_id),
          requiredAction: "finance:wip:read",
          requiredResourceType: "wip",
        });
        const item = queryMatterBillingWip({
          repository,
          tenant_id: scope.tenant_id,
          matter_id: query.matter_id,
          as_of_date: query.as_of_date
            ?? dateOnly(runtime, query.time_zone ?? DEFAULT_TIME_ZONE),
        });
        return dataResult({ requestId, auditHintRef, item: sanitizeFinanceValue(item) });
      }
      if (method === "POST") {
        const operation = body.action === "prebill" ? "finance.wip.prebill" : "finance.wip.generate";
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation,
          action: "finance:wip:write",
          resourceType: "wip",
          matterId: body.matter_id,
          status: 201,
          sanitizeFinance: true,
          execute: ({ actorId, idempotencyKey }) => {
            if (body.action === "prebill") {
              return createMatterPreBillFromWip({
                repository: runtime.financeRepository,
                tenant_id: scope.tenant_id,
                matter_id: body.matter_id,
                wip_item_ids: body.wip_item_ids,
                wip_snapshot_id: body.wip_snapshot_id,
                prebill: body.prebill,
                actor_id: actorId,
                idempotency_key: idempotencyKey,
              });
            }
            const sourceItems = resolveWipSourceItems({
              repository: runtime.financeRepository,
              tenantId: scope.tenant_id,
              matterId: body.matter_id,
              body,
            });
            const { feeArrangement, rateCard } = resolveWipPricing({
              repository: runtime.financeRepository,
              tenantId: scope.tenant_id,
              matterId: body.matter_id,
              body,
            });
            return generateWipFromApprovedItems({
                repository: runtime.financeRepository,
                tenant_id: scope.tenant_id,
                matter_id: body.matter_id,
                source_items: sourceItems,
                rate_card: rateCard,
                fee_arrangement: feeArrangement,
                fee_arrangement_id: feeArrangement.fee_arrangement_id,
                actor_id: actorId,
                idempotency_key: idempotencyKey,
              });
          },
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "invoices") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "finance:invoice:read",
          resourceType: "invoice",
          matterId: query.matter_id,
        });
        if (gated) return gated;
        const repository = financeReadRepository({
          runtime,
          context,
          tenantId: scope.tenant_id,
          matterId: optionalString(query.matter_id),
          requiredAction: "finance:invoice:read",
          requiredResourceType: "invoice",
        });
        const items = repository
          .list({
            tenant_id: scope.tenant_id,
            model_type: "Invoice",
            ...(query.matter_id ? { matter_id: query.matter_id } : {}),
          })
          .map((invoice) => sanitizeFinanceValue(
            projectInvoiceLifecycle({
              invoice,
              as_of_date: query.as_of_date
                ?? dateOnly(runtime, query.time_zone ?? DEFAULT_TIME_ZONE),
            }),
          ));
        return dataResult({ requestId, auditHintRef, items, payload: { count: items.length } });
      }
      if (method === "POST") {
        const invoice = body.invoice ?? body.item ?? body;
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation: "finance.invoice.draft_create",
          action: "finance:invoice:write",
          resourceType: "invoice",
          matterId: invoice.matter_id,
          status: 201,
          sanitizeFinance: true,
          execute: ({ actorId, idempotencyKey }) => createDraftInvoiceFromPreBill({
            repository: runtime.financeRepository,
            invoice: { ...invoice, tenant_id: scope.tenant_id },
            actor_id: actorId,
            idempotency_key: idempotencyKey,
          }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "invoiceLifecycle") {
      const invoiceId = decodeURIComponent(route.params.invoice_id);
      const invoice = runtime.financeRepository.get({
        tenant_id: scope.tenant_id,
        model_type: "Invoice",
        invoice_id: invoiceId,
      });
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "finance.invoice.lifecycle",
        action: "finance:invoice:write",
        resourceType: "invoice",
        resourceId: invoiceId,
        matterId: invoice?.matter_id ?? body.matter_id,
        sanitizeFinance: true,
        execute: ({ actorId, idempotencyKey, occurredAt }) => transitionInvoiceLifecycle({
          repository: runtime.financeRepository,
          tenant_id: scope.tenant_id,
          invoice_id: invoiceId,
          to_status: body.to_status ?? body.status,
          as_of_date: body.as_of_date,
          transition_at: body.transition_at ?? occurredAt,
          reason_code: body.reason_code,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
        }),
      });
    }

    if (route.route.id === "payments") {
      if (method === "GET") {
        const gated = gate({
          context,
          scope,
          requestId,
          action: "finance:payment:read",
          resourceType: "payment",
          matterId: query.matter_id,
        });
        if (gated) return gated;
        const repository = financeReadRepository({
          runtime,
          context,
          tenantId: scope.tenant_id,
          matterId: optionalString(query.matter_id),
          requiredAction: "finance:payment:read",
          requiredResourceType: "payment",
        });
        const items = repository.list({
          tenant_id: scope.tenant_id,
          model_type: "Payment",
          ...(query.matter_id ? { matter_id: query.matter_id } : {}),
        });
        return dataResult({
          requestId,
          auditHintRef,
          items: sanitizeFinanceValue(items),
          payload: {
            count: items.length,
            credential_material_included: false,
            bank_reference_included: false,
          },
        });
      }
      if (method === "POST") {
        const operation = body.action === "reconcile"
          ? "finance.payment.reconcile"
          : body.action === "apply"
            ? "finance.payment.apply"
            : "finance.payment.import";
        return executeMutation({
          runtime,
          scope,
          context,
          requestId,
          body,
          operation,
          action: "finance:payment:write",
          resourceType: "payment",
          resourceId: body.payment_id ?? body.payment?.payment_id,
          matterId: body.matter_id ?? body.payment?.matter_id,
          status: body.action === "reconcile" ? 200 : 201,
          sanitizeFinance: true,
          execute: ({ actorId, idempotencyKey }) => body.action === "reconcile"
            ? reconcileMatterArQueue({
                repository: runtime.financeRepository,
                tenant_id: scope.tenant_id,
                matter_id: body.matter_id,
                as_of_date: body.as_of_date
                  ?? dateOnly(runtime, body.time_zone ?? DEFAULT_TIME_ZONE),
                actor_id: actorId,
                idempotency_key: idempotencyKey,
              })
            : body.action === "apply"
              ? applyMatterPayment({
                  repository: runtime.financeRepository,
                  tenant_id: scope.tenant_id,
                  matter_id: body.matter_id,
                  payment_id: body.payment_id,
                  invoice_id: body.invoice_id,
                  amount: body.amount,
                  payment_allocation_id: body.payment_allocation_id,
                  as_of_date: body.as_of_date
                    ?? dateOnly(runtime, body.time_zone ?? DEFAULT_TIME_ZONE),
                  actor_id: actorId,
                  idempotency_key: idempotencyKey,
                })
              : importPayment({
                  repository: runtime.financeRepository,
                  payment: { ...(body.payment ?? body.item ?? body), tenant_id: scope.tenant_id },
                  actor_id: actorId,
                  idempotency_key: idempotencyKey,
                }),
        });
      }
      return methodNotAllowed(requestId, auditHintRef);
    }

    if (route.route.id === "paymentAllocationReversal") {
      const paymentId = decodeURIComponent(route.params.payment_id);
      const paymentAllocationId = decodeURIComponent(route.params.payment_allocation_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "finance.payment.allocation.reverse",
        action: "finance:payment_allocation:write",
        resourceType: "payment_allocation",
        resourceId: paymentAllocationId,
        matterId: body.matter_id,
        status: 200,
        sanitizeFinance: true,
        domainIdempotencyOnly: true,
        execute: ({ actorId, idempotencyKey }) => reverseMatterPaymentAllocation({
          repository: runtime.financeRepository,
          tenant_id: scope.tenant_id,
          matter_id: body.matter_id,
          payment_id: paymentId,
          payment_allocation_id: paymentAllocationId,
          reversal_payment_allocation_id: body.reversal_payment_allocation_id,
          reason_code: body.reason,
          as_of_date: body.as_of_date
            ?? dateOnly(runtime, body.time_zone ?? DEFAULT_TIME_ZONE),
          idempotency_as_of_date: body.as_of_date ?? null,
          actor_id: actorId,
          idempotency_key: idempotencyKey,
        }),
      });
    }

    if (route.route.id === "paymentAllocations") {
      const paymentId = decodeURIComponent(route.params.payment_id);
      return executeMutation({
        runtime,
        scope,
        context,
        requestId,
        body,
        operation: "finance.payment.apply",
        action: "finance:payment:write",
        resourceType: "payment",
        resourceId: paymentId,
        matterId: body.matter_id,
        status: 201,
        sanitizeFinance: true,
        execute: ({ actorId, idempotencyKey }) => applyMatterPayment({
          repository: runtime.financeRepository,
          tenant_id: scope.tenant_id,
          matter_id: body.matter_id,
          payment_id: paymentId,
          invoice_id: body.invoice_id,
          amount: body.amount,
          payment_allocation_id: body.payment_allocation_id,
          as_of_date: body.as_of_date
            ?? dateOnly(runtime, body.time_zone ?? DEFAULT_TIME_ZONE),
          actor_id: actorId,
          idempotency_key: idempotencyKey,
        }),
      });
    }

    if (route.route.id === "reportCsv") {
      const gated = gate({
        context,
        scope,
        requestId,
        action: "matter:ops:read",
        resourceType: "matter_operations_report",
      });
      if (gated) return gated;
      const { operations } = todayOperations({
        runtime,
        context,
        tenantId: scope.tenant_id,
        timeZone: query.time_zone ?? DEFAULT_TIME_ZONE,
      });
      const report = readMatterWeeklyOperationsCsv({
        operations,
        includeBom: query.include_bom === "true",
      });
      return {
        status: 200,
        rawBody: report.rawBody,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="matter-weekly-operations.csv"',
          "x-lawos-report-row-count": String(report.rowCount),
        },
      };
    }

    return notFound(requestId, auditHintRef);
  } catch (error) {
    return classifyError(error, { method, requestId, auditHintRef });
  }
}
