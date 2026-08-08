import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createTimeEntry } from "../../../packages/time-expense/src/time-entry-service.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { resolveOutlookTimeEntryRole } from "./outlook-time-entry-role-authority.js";

export const OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES = Object.freeze({
  authority_mismatch: "OUTLOOK_TIME_ENTRY_DRAFT_AUTHORITY_MISMATCH",
  denied: "OUTLOOK_TIME_ENTRY_DRAFT_DENIED",
  employee_required: "OUTLOOK_TIME_ENTRY_DRAFT_EMPLOYEE_REQUIRED",
  idempotency_conflict: "OUTLOOK_TIME_ENTRY_DRAFT_IDEMPOTENCY_CONFLICT",
  invalid: "OUTLOOK_TIME_ENTRY_DRAFT_INVALID",
  matter_not_found: "OUTLOOK_TIME_ENTRY_DRAFT_MATTER_NOT_FOUND",
  persistence_unavailable: "OUTLOOK_TIME_ENTRY_DRAFT_PERSISTENCE_UNAVAILABLE",
  role_mismatch: "OUTLOOK_TIME_ENTRY_DRAFT_ROLE_MISMATCH",
  role_required: "OUTLOOK_TIME_ENTRY_DRAFT_ROLE_REQUIRED",
  runtime_unavailable: "OUTLOOK_TIME_ENTRY_DRAFT_RUNTIME_UNAVAILABLE",
  tenant_mismatch: "OUTLOOK_TIME_ENTRY_DRAFT_TENANT_MISMATCH",
});

export const OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH = 500;

const ALLOWED_BODY_FIELDS = new Set([
  "audit_hint_ref", "billable", "duration_minutes", "idempotency_key",
  "item_context_key", "matter_id", "narrative", "tenant_id", "work_date",
]);

function fail(code, message, status) {
  throw Object.assign(new Error(message), { safe_error_code: code, status });
}

function text(value, field, maxLength = 1024) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > maxLength) {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid, `${field} is invalid`, 400);
  }
  return normalized;
}

function principal(context, requestedTenantId) {
  const tenantId = text(context?.principal?.tenant_id, "principal.tenant_id");
  const actorId = text(context?.principal?.user_id, "principal.user_id");
  if (requestedTenantId != null && text(requestedTenantId, "tenant_id") !== tenantId) {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.tenant_mismatch, "tenant mismatch", 403);
  }
  return { tenant_id: tenantId, actor_id: actorId };
}

function workDate(value) {
  const normalized = text(value, "work_date", 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(normalized);
  if (!match) fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid, "invalid work_date", 400);
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== normalized) {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid, "invalid work_date", 400);
  }
  return normalized;
}

function requestValues(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
      || Object.keys(body).some((field) => !ALLOWED_BODY_FIELDS.has(field))) {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid, "unsupported request fields", 400);
  }
  const narrative = text(body.narrative, "narrative", OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH);
  if (/\r|\n/u.test(narrative)
      || !Number.isSafeInteger(body.duration_minutes) || body.duration_minutes <= 0
      || typeof body.billable !== "boolean") {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid, "invalid draft values", 400);
  }
  return {
    matter_id: text(body.matter_id, "matter_id", 256),
    work_date: workDate(body.work_date),
    narrative,
    duration_minutes: body.duration_minutes,
    billable: body.billable,
    item_context_key: text(body.item_context_key, "item_context_key", 2048),
    idempotency_key: text(body.idempotency_key, "idempotency_key", 256),
  };
}

function allow(context, tenantId, matterId, resourceType, action) {
  const decision = evaluateRouteDecision({
    context: {
      ...context,
      object_acl: (context?.object_acl ?? []).filter((entry) => (
        entry.resource_id === undefined || entry.resource_id === matterId
      )),
    },
    resource: {
      tenant_id: tenantId,
      matter_id: matterId,
      resource_type: resourceType,
      resource_id: matterId,
    },
    action,
  });
  if (decision.effect !== "allow") {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied, "permission denied", 403);
  }
}

function repositories(runtime) {
  const finance = runtime?.financeRuntime?.repository;
  const matter = runtime?.matterRuntime?.repository ?? runtime?.financeRuntime?.matterRepository;
  if (![finance?.getIdempotency, finance?.transaction, finance?.list, finance?.get, matter?.get]
    .every((method) => typeof method === "function")) {
    fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.runtime_unavailable, "runtime unavailable", 503);
  }
  return { finance, matter };
}

function success(requestId, result) {
  const record = result.time_entry;
  return {
    status: result.idempotent_replay ? 200 : 201,
    body: {
      request_id: requestId,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: {
        draft_ref: record.time_entry_id,
        status: record.status,
        version: Number.isSafeInteger(record.state_version) ? record.state_version : 1,
      },
      idempotent_replay: result.idempotent_replay,
      safe_error_codes: [],
      production_ready_claim: false,
    },
  };
}

function blocked(error, requestId) {
  const known = Object.values(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES).includes(error?.safe_error_code)
    ? error.safe_error_code
    : error?.safe_error_code === "FINANCE_IDEMPOTENCY_CONFLICT"
      ? OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.idempotency_conflict
      : error instanceof TypeError
        ? OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid
        : OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.persistence_unavailable;
  const status = known === OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.idempotency_conflict
    ? 409
    : Number.isInteger(error?.status) ? error.status : error instanceof TypeError ? 400 : 503;
  return {
    status,
    body: {
      request_id: requestId,
      outcome: known === OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied ? "denied" : "blocked",
      item: null,
      idempotent_replay: false,
      safe_error_codes: [known],
      retryable: status === 503,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function createOutlookTimeEntryDraft({ body = {}, context, requestId, runtime } = {}) {
  try {
    const values = requestValues(body);
    const signed = principal(context, body.tenant_id);
    const { finance, matter } = repositories(runtime);
    allow(context, signed.tenant_id, values.matter_id, "matter", "outlook:matter:read");
    allow(context, signed.tenant_id, values.matter_id, "time_entry", "finance:time:write");
    if (!matter.get({ tenant_id: signed.tenant_id, model_type: "Matter", matter_id: values.matter_id })) {
      fail(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.matter_not_found, "Matter not found", 404);
    }
    const { role_id } = resolveOutlookTimeEntryRole({
      financeRuntime: runtime.financeRuntime,
      tenantId: signed.tenant_id,
      actorId: signed.actor_id,
      matterId: values.matter_id,
      workDate: values.work_date,
      codes: OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES,
    });
    const timeEntry = {
      time_entry_id: `time_outlook_${hashDomainValue({ tenant_id: signed.tenant_id, idempotency_key: values.idempotency_key }).slice(0, 24)}`,
      tenant_id: signed.tenant_id,
      matter_id: values.matter_id,
      role_id,
      work_date: values.work_date,
      narrative: values.narrative,
      duration_minutes: values.duration_minutes,
      billable: values.billable,
      status: "draft",
      approved_for_wip: false,
      source_ref: `OutlookMatter:${hashDomainValue({ tenant_id: signed.tenant_id, matter_id: values.matter_id, item_context_key: values.item_context_key })}`,
    };
    const result = createTimeEntry({
      repository: finance,
      time_entry: timeEntry,
      actor_id: signed.actor_id,
      idempotency_key: values.idempotency_key,
      request_fingerprint: hashDomainValue({ actor_id: signed.actor_id, time_entry: timeEntry }),
    });
    return success(requestId, result);
  } catch (error) {
    return blocked(error, requestId);
  }
}
