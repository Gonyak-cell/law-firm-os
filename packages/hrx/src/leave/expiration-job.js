import { randomUUID } from "node:crypto";
import { createLeaveExpirationService } from "./expiration-service.js";

const SYSTEM_ACTOR = "system:leave-expiration";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function tenantIds(input) {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError("tenant_ids must be a non-empty array");
  return [...new Set(input.map((tenantId) => requiredString({ tenant_id: tenantId }, "tenant_id")))].sort();
}

function positiveLimit(value) {
  const limit = value ?? 100;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1_000) throw new TypeError("limit must be an integer from 1 to 1000");
  return limit;
}

function safeErrorCode(error) {
  return typeof error?.safe_error_code === "string" && error.safe_error_code.trim()
    ? error.safe_error_code.trim()
    : "HRX_LEAVE_EXPIRATION_JOB_FAILED";
}

function parseResult(row) {
  try {
    return JSON.parse(row.result_json ?? "{}");
  } catch {
    return {};
  }
}

export async function runLeaveExpirationJob({
  store,
  tenant_ids,
  cursor = null,
  limit,
  as_of,
  timezone = "Asia/Seoul",
  clock = () => new Date().toISOString(),
  retryDelayMs = 60_000,
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
  expirationServiceFactory = (options) => createLeaveExpirationService(options),
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave expiration job requires a transactional store");
  }
  const normalizedTenants = tenantIds(tenant_ids);
  const normalizedCursor = cursor === null || cursor === undefined || cursor === ""
    ? null
    : requiredString({ cursor }, "cursor");
  const normalizedAsOf = requiredString({ as_of }, "as_of");
  const normalizedTimezone = requiredString({ timezone }, "timezone");
  const pageLimit = positiveLimit(limit);
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0) throw new TypeError("retryDelayMs must be a non-negative integer");
  if (typeof expirationServiceFactory !== "function") throw new TypeError("expirationServiceFactory must be a function");

  const remaining = normalizedTenants.filter((tenantId) => !normalizedCursor || tenantId > normalizedCursor);
  const selected = remaining.slice(0, pageLimit);
  const scheduleKey = `${normalizedAsOf}:${normalizedTimezone}`;
  const rows = [];
  let lastCompletedCursor = normalizedCursor;
  let failedTenantId = null;
  let deferredTenantId = null;

  for (const tenantId of selected) {
    const idempotencyKey = `expiration-job:${scheduleKey}`;
    let event = store.query("selectOne", {
      table: "hrx_leave_job_outbox",
      where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
    });
    const now = clock();
    if (!event) {
      event = store.query("insert", {
        table: "hrx_leave_job_outbox",
        row: {
          tenant_id: tenantId,
          job_event_id: idFactory("leave_expiration_job"),
          job_type: "leave_entitlement_expiration",
          schedule_key: scheduleKey,
          payload_json: JSON.stringify({ as_of: normalizedAsOf, timezone: normalizedTimezone }),
          idempotency_key: idempotencyKey,
          state: "pending",
          attempt_count: 0,
          available_at: now,
          cursor_before: lastCompletedCursor,
          cursor_after: null,
          last_error_code: null,
          result_json: "{}",
          completed_at: null,
          created_at: now,
          updated_at: now,
        },
      });
    }

    if (event.state === "completed") {
      lastCompletedCursor = tenantId;
      rows.push(Object.freeze({ tenant_id: tenantId, state: "completed", replayed: true, ...parseResult(event) }));
      continue;
    }
    if (event.available_at > now) {
      deferredTenantId = tenantId;
      rows.push(Object.freeze({ tenant_id: tenantId, state: "deferred", replayed: false, last_error_code: event.last_error_code }));
      break;
    }

    event = store.query("updateOne", {
      table: "hrx_leave_job_outbox",
      where: { tenant_id: tenantId, job_event_id: event.job_event_id },
      patch: { state: "running", attempt_count: Number(event.attempt_count ?? 0) + 1, last_error_code: null, updated_at: now },
    });
    try {
      const service = expirationServiceFactory({ store, clock, idFactory });
      const context = { tenant_id: tenantId, actor_id: SYSTEM_ACTOR, system_job_verified: true };
      const preview = await service.preview(context, { as_of: normalizedAsOf, timezone: normalizedTimezone });
      const executed = await service.execute(context, { preview_id: preview.preview_id });
      const result = Object.freeze({
        preview_id: preview.preview_id,
        snapshot_hash: preview.snapshot_hash,
        candidate_count: preview.totals.candidate_count,
        expiration_minutes: preview.totals.expiration_minutes,
        expired_count: executed.totals.expired_count,
        expired_minutes: executed.totals.expired_minutes,
      });
      const completedAt = clock();
      store.query("updateOne", {
        table: "hrx_leave_job_outbox",
        where: { tenant_id: tenantId, job_event_id: event.job_event_id },
        patch: {
          state: "completed",
          cursor_after: tenantId,
          result_json: JSON.stringify(result),
          completed_at: completedAt,
          updated_at: completedAt,
        },
      });
      lastCompletedCursor = tenantId;
      rows.push(Object.freeze({ tenant_id: tenantId, state: "completed", replayed: executed.replayed === true, ...result }));
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const failedAt = clock();
      const availableAt = new Date(Date.parse(failedAt) + retryDelayMs).toISOString();
      store.query("updateOne", {
        table: "hrx_leave_job_outbox",
        where: { tenant_id: tenantId, job_event_id: event.job_event_id },
        patch: {
          state: "failed",
          cursor_after: null,
          last_error_code: errorCode,
          available_at: availableAt,
          updated_at: failedAt,
        },
      });
      failedTenantId = tenantId;
      rows.push(Object.freeze({ tenant_id: tenantId, state: "failed", replayed: false, last_error_code: errorCode }));
      break;
    }
  }

  const stoppedEarly = failedTenantId !== null || deferredTenantId !== null;
  const hasMore = stoppedEarly || selected.length < remaining.length;
  return Object.freeze({
    job_type: "leave_entitlement_expiration",
    schedule_key: scheduleKey,
    as_of: normalizedAsOf,
    timezone: normalizedTimezone,
    cursor: normalizedCursor,
    last_completed_cursor: lastCompletedCursor,
    next_cursor: hasMore ? lastCompletedCursor : null,
    has_more: hasMore,
    failed_tenant_id: failedTenantId,
    deferred_tenant_id: deferredTenantId,
    processed_count: rows.length,
    completed_count: rows.filter((row) => row.state === "completed").length,
    rows: Object.freeze(rows),
  });
}
