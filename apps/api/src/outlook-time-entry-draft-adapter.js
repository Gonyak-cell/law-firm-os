import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createTimeEntry } from "../../../packages/time-expense/src/time-entry-service.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES = Object.freeze({
  denied: "OUTLOOK_TIME_ENTRY_DRAFT_DENIED",
  idempotency_conflict: "OUTLOOK_TIME_ENTRY_DRAFT_IDEMPOTENCY_CONFLICT",
  invalid: "OUTLOOK_TIME_ENTRY_DRAFT_INVALID",
  matter_not_found: "OUTLOOK_TIME_ENTRY_DRAFT_MATTER_NOT_FOUND",
  persistence_unavailable: "OUTLOOK_TIME_ENTRY_DRAFT_PERSISTENCE_UNAVAILABLE",
  role_required: "OUTLOOK_TIME_ENTRY_DRAFT_ROLE_REQUIRED",
  runtime_unavailable: "OUTLOOK_TIME_ENTRY_DRAFT_RUNTIME_UNAVAILABLE",
  tenant_mismatch: "OUTLOOK_TIME_ENTRY_DRAFT_TENANT_MISMATCH",
});

export const OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH = 500;

const ALLOWED_BODY_FIELDS = Object.freeze([
  "actor_id",
  "audit_hint_ref",
  "billable",
  "conversation_id",
  "duration_minutes",
  "idempotency_key",
  "internet_message_id",
  "item_context_key",
  "matter_id",
  "narrative",
  "source_email_thread_id",
  "tenant_id",
  "work_date",
]);

function draftError(code, message, status) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

function requiredText(value, field, { maxLength = 1024 } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      `${field} is required`,
      400,
    );
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      `${field} is too long`,
      400,
    );
  }
  return text;
}

function optionalText(value, field, { maxLength = 1024 } = {}) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, field, { maxLength });
}

function signedPrincipal(context, requestedTenantId) {
  const principal = context?.principal;
  const tenantId = requiredText(principal?.tenant_id, "principal.tenant_id");
  const actorId = requiredText(principal?.user_id, "principal.user_id");
  if (requestedTenantId !== undefined && requestedTenantId !== null) {
    const requested = requiredText(requestedTenantId, "tenant_id");
    if (requested !== tenantId) {
      throw draftError(
        OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.tenant_mismatch,
        "tenant_id must match the signed session",
        403,
      );
    }
  }
  return Object.freeze({ actor_id: actorId, tenant_id: tenantId });
}

function assertSupportedBody(body) {
  if (
    !body
    || typeof body !== "object"
    || Array.isArray(body)
    || Object.keys(body).some((field) => !ALLOWED_BODY_FIELDS.includes(field))
  ) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "time-entry draft request contains unsupported fields",
      400,
    );
  }
}

function workDate(value) {
  const text = requiredText(value, "work_date", { maxLength: 10 });
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text);
  if (!match) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "work_date must use YYYY-MM-DD",
      400,
    );
  }
  const [, year, month, day] = match.map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() !== month - 1
    || normalized.getUTCDate() !== day
  ) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "work_date must be a real calendar date",
      400,
    );
  }
  return text;
}

function narrative(value) {
  const text = requiredText(value, "narrative", {
    maxLength: OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH,
  });
  if (/\r|\n/u.test(text)) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "narrative must be one line",
      400,
    );
  }
  return text;
}

function durationMinutes(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "duration_minutes must be a positive whole number",
      400,
    );
  }
  return value;
}

function billable(value) {
  if (typeof value !== "boolean") {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
      "billable must be a boolean",
      400,
    );
  }
  return value;
}

function permissionContextFor(context, resourceId) {
  return {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      entry.resource_id === undefined || entry.resource_id === resourceId
    )),
  };
}

function assertAllowed({ context, tenantId, matterId, resourceType, resourceId, action }) {
  const decision = evaluateRouteDecision({
    context: permissionContextFor(context, resourceId),
    resource: {
      tenant_id: tenantId,
      matter_id: matterId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
  });
  if (decision.effect !== "allow") {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied,
      "time-entry draft permission denied",
      403,
    );
  }
}

function financeRole(runtime, principal) {
  const employee = (runtime?.financeRuntime?.employees ?? []).find((candidate) => (
    candidate?.user_id === principal.actor_id
    && (candidate.tenant_id === undefined || candidate.tenant_id === principal.tenant_id)
    && !["inactive", "terminated", "deleted"].includes(
      String(candidate.status ?? candidate.profile_status ?? "active").toLowerCase(),
    )
  ));
  const roleId = [
    employee?.default_time_entry_role_id,
    employee?.finance_role_id,
    employee?.billing_role_id,
    employee?.payroll_category,
  ].find((value) => typeof value === "string" && value.trim() !== "")?.trim();
  if (!roleId) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.role_required,
      "authenticated finance role is not configured",
      422,
    );
  }
  return roleId;
}

function repositories(runtime) {
  const financeRepository = runtime?.financeRuntime?.repository;
  const matterRepository = runtime?.matterRuntime?.repository
    ?? runtime?.financeRuntime?.matterRepository;
  if (
    typeof financeRepository?.getIdempotency !== "function"
    || typeof financeRepository?.transaction !== "function"
    || typeof matterRepository?.get !== "function"
  ) {
    throw draftError(
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.runtime_unavailable,
      "time-entry draft runtime is unavailable",
      503,
    );
  }
  return Object.freeze({ financeRepository, matterRepository });
}

function sourceEmailReference(body) {
  const itemContextKey = requiredText(
    body.item_context_key,
    "item_context_key",
    { maxLength: 2048 },
  );
  return Object.freeze({
    item_context_key: itemContextKey,
    internet_message_id: optionalText(
      body.internet_message_id,
      "internet_message_id",
      { maxLength: 1024 },
    ),
    conversation_id: optionalText(
      body.conversation_id,
      "conversation_id",
      { maxLength: 1024 },
    ),
    source_email_thread_id: optionalText(
      body.source_email_thread_id,
      "source_email_thread_id",
      { maxLength: 256 },
    ),
  });
}

function createdResponse({ requestId, auditHintRef, result }) {
  const timeEntry = result.time_entry;
  return {
    status: result.idempotent_replay ? 200 : 201,
    body: {
      request_id: requestId,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: timeEntry,
      copyable_time_entry_id: timeEntry.time_entry_id,
      audit_event_id: result.audit_event.event_id,
      idempotent_replay: result.idempotent_replay,
      audit_hint_ref: auditHintRef ?? null,
      safe_error_codes: [],
      production_ready_claim: false,
    },
  };
}

function blockedResponse({ error, requestId, auditHintRef }) {
  const knownCode = Object.values(OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES)
    .includes(error?.safe_error_code)
    ? error.safe_error_code
    : error?.safe_error_code === "FINANCE_IDEMPOTENCY_CONFLICT"
      ? OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.idempotency_conflict
      : error instanceof TypeError
        ? OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid
        : OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.persistence_unavailable;
  const status = knownCode === OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.idempotency_conflict
    ? 409
    : Number.isInteger(error?.status)
      ? error.status
      : error instanceof TypeError
        ? 400
        : 503;
  return {
    status,
    body: {
      request_id: requestId,
      outcome: knownCode === OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied ? "denied" : "blocked",
      item: null,
      idempotent_replay: false,
      audit_hint_ref: auditHintRef ?? null,
      safe_error_codes: [knownCode],
      retryable: status === 503,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function createOutlookTimeEntryDraft({ body = {}, context, requestId, runtime } = {}) {
  try {
    assertSupportedBody(body);
    const principal = signedPrincipal(context, body.tenant_id);
    const matterId = requiredText(body.matter_id, "matter_id", { maxLength: 256 });
    const { financeRepository, matterRepository } = repositories(runtime);
    assertAllowed({
      context,
      tenantId: principal.tenant_id,
      matterId,
      resourceType: "matter",
      resourceId: matterId,
      action: "outlook:matter:read",
    });
    assertAllowed({
      context,
      tenantId: principal.tenant_id,
      matterId,
      resourceType: "time_entry",
      resourceId: matterId,
      action: "finance:time:write",
    });
    if (!matterRepository.get({
      tenant_id: principal.tenant_id,
      model_type: "Matter",
      matter_id: matterId,
    })) {
      throw draftError(
        OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.matter_not_found,
        "Matter was not found",
        404,
      );
    }
    const roleId = financeRole(runtime, principal);
    const idempotencyKey = requiredText(
      body.idempotency_key,
      "idempotency_key",
      { maxLength: 256 },
    );
    const sourceEmail = sourceEmailReference(body);
    const timeEntry = Object.freeze({
      time_entry_id: `time_outlook_${hashDomainValue({
        tenant_id: principal.tenant_id,
        idempotency_key: idempotencyKey,
      }).slice(0, 24)}`,
      tenant_id: principal.tenant_id,
      matter_id: matterId,
      role_id: roleId,
      work_date: workDate(body.work_date),
      narrative: narrative(body.narrative),
      duration_minutes: durationMinutes(body.duration_minutes),
      billable: billable(body.billable),
      status: "draft",
      approved_for_wip: false,
      source_ref: `OutlookEmail:${hashDomainValue(sourceEmail)}`,
      source_email_ref: sourceEmail,
    });
    const requestFingerprint = hashDomainValue({
      actor_id: principal.actor_id,
      time_entry: timeEntry,
    });
    const result = createTimeEntry({
      repository: financeRepository,
      time_entry: timeEntry,
      actor_id: principal.actor_id,
      idempotency_key: idempotencyKey,
      request_fingerprint: requestFingerprint,
    });
    return createdResponse({
      requestId,
      auditHintRef: body.audit_hint_ref,
      result,
    });
  } catch (error) {
    return blockedResponse({
      error,
      requestId,
      auditHintRef: body?.audit_hint_ref,
    });
  }
}
