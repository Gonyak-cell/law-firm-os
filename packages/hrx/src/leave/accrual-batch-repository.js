import { createHash, randomUUID } from "node:crypto";
import { assertHrxStorePort } from "../store/port.js";

const TERMINAL_STATES = new Set(["completed", "completed_with_errors", "failed"]);
const BATCH_TRANSITIONS = Object.freeze({
  pending: new Set(["running", "failed"]),
  running: new Set(["completed", "completed_with_errors", "failed"]),
  completed: new Set(),
  completed_with_errors: new Set(["running"]),
  failed: new Set(["running"]),
});
const PERIOD_TRANSITIONS = BATCH_TRANSITIONS;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError("optional value must be a string");
  return value.trim() || null;
}

function isoDate(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return normalized;
}

function expectedVersion(value) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError("expected_version must be a positive integer");
  return value;
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizedPeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) throw new TypeError("periods must be a non-empty array");
  const keys = new Set();
  return Object.freeze(periods.map((period, periodIndex) => {
    const periodKey = requiredString(period, "period_key");
    if (keys.has(periodKey)) throw guardedError("period_key must be unique within a batch", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_DUPLICATE");
    keys.add(periodKey);
    const periodStart = isoDate(period.period_start, "period_start");
    const periodEnd = isoDate(period.period_end, "period_end");
    const occurredOn = isoDate(period.occurred_on, "occurred_on");
    if (periodStart > periodEnd) throw guardedError("period_start must not follow period_end", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_RANGE_INVALID");
    if (periodIndex > 0 && periodStart <= periods[periodIndex - 1].period_end) {
      throw guardedError("batch periods must be ordered and non-overlapping", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_OVERLAP");
    }
    return Object.freeze({ period_index: periodIndex, period_key: periodKey, period_start: periodStart, period_end: periodEnd, occurred_on: occurredOn });
  }));
}

function batchView(store, row) {
  if (!row) return undefined;
  const periods = store
    .query("select", { table: "hrx_leave_accrual_batch_periods", where: { tenant_id: row.tenant_id, accrual_batch_id: row.accrual_batch_id } })
    .sort((left, right) => left.period_index - right.period_index)
    .map((period) => Object.freeze(clone(period)));
  return Object.freeze({ ...clone(row), periods: Object.freeze(periods) });
}

function assertTransition(current, next, transitions, entity) {
  if (!transitions[current]?.has(next)) {
    throw guardedError(`${entity} state transition is invalid`, "HRX_LEAVE_ACCRUAL_BATCH_STATE_INVALID");
  }
}

export function createLeaveAccrualBatchRepository({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  assertHrxStorePort(store);
  if (typeof store.transaction !== "function") throw new TypeError("leave accrual batch repository requires a transactional store");

  function get(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const batchId = requiredString(input, "accrual_batch_id");
    return batchView(store, store.query("selectOne", {
      table: "hrx_leave_accrual_batches",
      where: { tenant_id: tenantId, accrual_batch_id: batchId },
    }));
  }

  function requireBatch(context, input) {
    const batch = get(context, input);
    if (!batch) throw guardedError("Leave accrual batch not found", "HRX_LEAVE_ACCRUAL_BATCH_NOT_FOUND", 404);
    return batch;
  }

  function list(context) {
    const tenantId = requiredString(context, "tenant_id");
    return Object.freeze(store
      .query("select", { table: "hrx_leave_accrual_batches", where: { tenant_id: tenantId } })
      .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.accrual_batch_id.localeCompare(right.accrual_batch_id))
      .map((row) => batchView(store, row)));
  }

  function create(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const ruleId = requiredString(input, "accrual_rule_id");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const mode = requiredString(input, "mode");
    if (!["preview", "execute"].includes(mode)) throw new TypeError("mode must be preview or execute");
    const rule = store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId, accrual_rule_id: ruleId } });
    if (!rule) throw guardedError("Leave accrual rule not found", "HRX_LEAVE_ACCRUAL_RULE_NOT_FOUND", 404);

    const previewBatchId = optionalString(input.preview_batch_id);
    let previewBatch;
    if (mode === "preview" && previewBatchId) throw new TypeError("preview mode cannot reference preview_batch_id");
    if (mode === "execute") {
      if (!previewBatchId) throw new TypeError("execute mode requires preview_batch_id");
      previewBatch = requireBatch(context, { accrual_batch_id: previewBatchId });
      if (previewBatch.mode !== "preview" || !["completed", "completed_with_errors"].includes(previewBatch.status) || previewBatch.accrual_rule_id !== ruleId) {
        throw guardedError("Matching completed preview batch is required", "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_INVALID");
      }
    }

    const periods = normalizedPeriods(input.periods ?? previewBatch?.periods);
    if (previewBatch) {
      const previewPeriods = previewBatch.periods.map(({ period_key, period_start, period_end, occurred_on }) => ({ period_key, period_start, period_end, occurred_on }));
      if (hash(periods) !== hash(normalizedPeriods(previewPeriods))) {
        throw guardedError("Execute periods must match the preview batch", "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_MISMATCH");
      }
    }
    const inputHash = hash({ accrual_rule_id: ruleId, mode, preview_batch_id: previewBatchId, periods });
    const existing = store.query("selectOne", { table: "hrx_leave_accrual_batches", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) {
      if (existing.input_hash !== inputHash) throw guardedError("Idempotency key was used with different batch input", "HRX_IDEMPOTENCY_CONFLICT");
      return batchView(store, existing);
    }

    const now = clock();
    const batchId = input.accrual_batch_id ?? idFactory("leave_accrual_batch");
    return store.transaction((tx) => {
      const parent = tx.query("insert", {
        table: "hrx_leave_accrual_batches",
        row: {
          tenant_id: tenantId,
          accrual_batch_id: batchId,
          accrual_rule_id: ruleId,
          mode,
          period_start: periods[0].period_start,
          period_end: periods.at(-1).period_end,
          period_count: periods.length,
          source_version: null,
          input_hash: inputHash,
          snapshot_hash: null,
          preview_batch_id: previewBatchId,
          idempotency_key: idempotencyKey,
          status: "pending",
          error_code: null,
          executed_by: actorId,
          state_version: 1,
          created_at: now,
          updated_at: now,
          completed_at: null,
        },
      });
      for (const period of periods) {
        tx.query("insert", {
          table: "hrx_leave_accrual_batch_periods",
          row: {
            tenant_id: tenantId,
            batch_period_id: idFactory("leave_accrual_batch_period"),
            accrual_batch_id: batchId,
            ...period,
            accrual_run_id: null,
            source_version: null,
            snapshot_hash: null,
            status: "pending",
            error_code: null,
            attempt_count: 0,
            state_version: 1,
            created_at: now,
            updated_at: now,
            completed_at: null,
          },
        });
      }
      return batchView(tx, parent);
    });
  }

  function updateBatch(context, input, nextStatus, errorCode = null) {
    const batch = requireBatch(context, input);
    assertTransition(batch.status, nextStatus, BATCH_TRANSITIONS, "batch");
    const version = expectedVersion(input.expected_version);
    const now = clock();
    let sourceVersion = batch.source_version;
    let snapshotHash = batch.snapshot_hash;
    let completedAt = null;
    if (nextStatus === "running") {
      sourceVersion = null;
      snapshotHash = null;
    }
    if (["completed", "completed_with_errors"].includes(nextStatus)) {
      if (batch.periods.some((period) => !TERMINAL_STATES.has(period.status))) {
        throw guardedError("Every batch period must be terminal before completion", "HRX_LEAVE_ACCRUAL_BATCH_PERIODS_INCOMPLETE");
      }
      const expectedStatus = batch.periods.every((period) => period.status === "completed") ? "completed" : "completed_with_errors";
      if (nextStatus !== expectedStatus) throw guardedError("Batch status does not match child results", "HRX_LEAVE_ACCRUAL_BATCH_RESULT_MISMATCH");
      sourceVersion = hash(batch.periods.map((period) => [period.period_key, period.source_version, period.error_code]));
      snapshotHash = hash(batch.periods.map((period) => [period.period_key, period.snapshot_hash, period.status]));
      completedAt = now;
    }
    if (nextStatus === "failed" && !errorCode) throw new TypeError("error_code is required for failed batch");
    store.query("updateOne", {
      table: "hrx_leave_accrual_batches",
      where: { tenant_id: batch.tenant_id, accrual_batch_id: batch.accrual_batch_id },
      expected_version: version,
      patch: {
        status: nextStatus,
        source_version: sourceVersion,
        snapshot_hash: snapshotHash,
        error_code: nextStatus === "failed" ? errorCode : null,
        state_version: version + 1,
        updated_at: now,
        completed_at: completedAt,
      },
    });
    return requireBatch(context, input);
  }

  function updatePeriod(context, input, nextStatus, { runId = null, errorCode = null } = {}) {
    const batch = requireBatch(context, input);
    const periodId = requiredString(input, "batch_period_id");
    const period = batch.periods.find((row) => row.batch_period_id === periodId);
    if (!period) throw guardedError("Leave accrual batch period not found", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_NOT_FOUND", 404);
    assertTransition(period.status, nextStatus, PERIOD_TRANSITIONS, "batch period");
    const version = expectedVersion(input.expected_version);
    const now = clock();
    let run;
    if (["completed", "completed_with_errors"].includes(nextStatus)) {
      const childRunId = requiredString({ accrual_run_id: runId }, "accrual_run_id");
      run = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: batch.tenant_id, accrual_run_id: childRunId } });
      if (!run || run.mode !== batch.mode || run.accrual_rule_id !== batch.accrual_rule_id || run.period_key !== period.period_key) {
        throw guardedError("Child run does not match the batch period", "HRX_LEAVE_ACCRUAL_BATCH_CHILD_RUN_INVALID");
      }
      if (!["completed", "completed_with_errors"].includes(run.status)) {
        throw guardedError("Child run is not terminal", "HRX_LEAVE_ACCRUAL_BATCH_CHILD_RUN_INVALID");
      }
      const derivedStatus = run.status === "completed" ? "completed" : "completed_with_errors";
      if (nextStatus !== derivedStatus) throw guardedError("Period status does not match child run", "HRX_LEAVE_ACCRUAL_BATCH_RESULT_MISMATCH");
    }
    if (nextStatus === "failed" && !errorCode) throw new TypeError("error_code is required for failed period");
    store.query("updateOne", {
      table: "hrx_leave_accrual_batch_periods",
      where: { tenant_id: batch.tenant_id, batch_period_id: periodId },
      expected_version: version,
      patch: {
        status: nextStatus,
        accrual_run_id: run?.accrual_run_id ?? null,
        source_version: run?.source_version ?? null,
        snapshot_hash: run?.snapshot_hash ?? null,
        error_code: nextStatus === "failed" ? errorCode : null,
        attempt_count: nextStatus === "running" ? Number(period.attempt_count ?? 0) + 1 : Number(period.attempt_count ?? 0),
        state_version: version + 1,
        updated_at: now,
        completed_at: TERMINAL_STATES.has(nextStatus) ? now : null,
      },
    });
    return requireBatch(context, input);
  }

  return Object.freeze({
    create,
    get,
    list,
    markRunning: (context, input) => updateBatch(context, input, "running"),
    complete: (context, input) => {
      const status = requiredString(input, "status");
      if (!["completed", "completed_with_errors"].includes(status)) throw new TypeError("status must be completed or completed_with_errors");
      return updateBatch(context, input, status);
    },
    fail: (context, input) => updateBatch(context, input, "failed", requiredString(input, "error_code")),
    markPeriodRunning: (context, input) => updatePeriod(context, input, "running"),
    completePeriod: (context, input) => {
      const status = requiredString(input, "status");
      if (!["completed", "completed_with_errors"].includes(status)) throw new TypeError("status must be completed or completed_with_errors");
      return updatePeriod(context, input, status, { runId: input.accrual_run_id });
    },
    failPeriod: (context, input) => updatePeriod(context, input, "failed", { errorCode: requiredString(input, "error_code") }),
  });
}
