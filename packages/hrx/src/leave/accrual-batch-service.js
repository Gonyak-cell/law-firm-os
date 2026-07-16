import { createLeaveAccrualBatchRepository } from "./accrual-batch-repository.js";
import { generateLeaveAccrualBatchPeriods } from "./accrual-period-generator.js";
import { createLeaveAccrualService } from "./accrual-service.js";
import { createXlsxBuffer } from "./xlsx-export.js";

const EXPORT_HEADERS = Object.freeze([
  "배치 ID",
  "모드",
  "기간 키",
  "기간 시작일",
  "기간 종료일",
  "발생일",
  "기간 상태",
  "구성원 ID",
  "구성원",
  "결과",
  "사유 코드",
  "분",
  "신규 원장",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function safeErrorCode(error) {
  return typeof error?.safe_error_code === "string" && error.safe_error_code.trim()
    ? error.safe_error_code.trim()
    : "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_FAILED";
}

function parseResult(run) {
  if (!run) return null;
  try {
    return JSON.parse(run.result_json ?? "{}");
  } catch {
    throw guardedError("Accrual child run result is invalid", "HRX_LEAVE_ACCRUAL_BATCH_CHILD_RESULT_INVALID");
  }
}

function replayExecuteResult(result) {
  if (!result) return null;
  const rows = (result.rows ?? []).map((row) => row.status === "created"
    ? Object.freeze({ ...row, status: "duplicate", reason_code: "already_accrued" })
    : row);
  return Object.freeze({
    ...result,
    rows: Object.freeze(rows),
    counts: Object.freeze({
      ...result.counts,
      duplicates: Number(result.counts?.duplicates ?? 0) + Number(result.counts?.created ?? 0),
      created: 0,
      new_entries: 0,
    }),
  });
}

function ruleConfig(rule) {
  try {
    const config = JSON.parse(rule.rule_json ?? "{}");
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error();
    return config;
  } catch {
    throw guardedError("Accrual rule JSON is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvBuffer(headers, rows) {
  return Buffer.from(`\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`, "utf8");
}

function exportRows(batch) {
  return batch.periods.flatMap((period) => {
    const rows = period.result?.rows ?? [];
    if (rows.length === 0) {
      return [[batch.accrual_batch_id, batch.mode, period.period_key, period.period_start, period.period_end, period.occurred_on, period.status, "", "", "failed", period.error_code ?? "", 0, "아니오"]];
    }
    return rows.map((row) => [
      batch.accrual_batch_id,
      batch.mode,
      period.period_key,
      period.period_start,
      period.period_end,
      period.occurred_on,
      period.status,
      row.employee_id ?? "",
      row.display_name ?? "",
      row.status ?? "",
      row.reason_code ?? row.error_code ?? "",
      Number(row.amount_minutes ?? 0),
      row.status === "created" ? "예" : "아니오",
    ]);
  });
}

export function createLeaveAccrualBatchService({
  store,
  clock = () => new Date().toISOString(),
  idFactory,
  sourceProvider,
  accrualService,
  batchRepository,
  periodGenerator = generateLeaveAccrualBatchPeriods,
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave accrual batch service requires a transactional store");
  }
  const children = accrualService ?? createLeaveAccrualService({ store, clock, idFactory, sourceProvider });
  const batches = batchRepository ?? createLeaveAccrualBatchRepository({ store, clock, idFactory });

  function requireBatch(context, input) {
    const batch = batches.get(context, input);
    if (!batch) throw guardedError("Leave accrual batch not found", "HRX_LEAVE_ACCRUAL_BATCH_NOT_FOUND", 404);
    return batch;
  }

  function hydrate(context, input, { replayed = false } = {}) {
    const batch = requireBatch(context, input);
    const periods = batch.periods.map((period) => {
      const run = period.accrual_run_id && store.query("selectOne", {
        table: "hrx_leave_accrual_runs",
        where: { tenant_id: batch.tenant_id, accrual_run_id: period.accrual_run_id },
      });
      const result = parseResult(run);
      return Object.freeze({ ...period, result: replayed && batch.mode === "execute" ? replayExecuteResult(result) : result });
    });
    const totals = batch.mode === "preview"
      ? periods.reduce((sum, period) => Object.freeze({
        ready: sum.ready + Number(period.result?.counts?.ready ?? 0),
        skipped: sum.skipped + Number(period.result?.counts?.skipped ?? 0),
        errors: sum.errors + Number(period.result?.counts?.errors ?? 0),
        failed_periods: sum.failed_periods + (period.status === "failed" ? 1 : 0),
      }), Object.freeze({ ready: 0, skipped: 0, errors: 0, failed_periods: 0 }))
      : periods.reduce((sum, period) => Object.freeze({
        created: sum.created + Number(period.result?.counts?.created ?? 0),
        duplicates: sum.duplicates + Number(period.result?.counts?.duplicates ?? 0),
        new_entries: sum.new_entries + Number(period.result?.counts?.new_entries ?? 0),
        skipped: sum.skipped + Number(period.result?.counts?.skipped ?? 0),
        errors: sum.errors + Number(period.result?.counts?.errors ?? 0),
        failed_periods: sum.failed_periods + (period.status === "failed" ? 1 : 0),
      }), Object.freeze({ created: 0, duplicates: 0, new_entries: 0, skipped: 0, errors: 0, failed_periods: 0 }));
    return Object.freeze({ ...batch, periods: Object.freeze(periods), totals, replayed });
  }

  function preview(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    const ruleId = requiredString(input, "accrual_rule_id");
    const rule = store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId, accrual_rule_id: ruleId } });
    if (!rule) throw guardedError("Leave accrual rule not found", "HRX_LEAVE_ACCRUAL_RULE_NOT_FOUND", 404);
    const config = ruleConfig(rule);
    const generated = periodGenerator({
      schedule: config.schedule,
      start_date: input.start_date,
      end_date: input.end_date,
      anchor_date: input.anchor_date ?? input.start_date,
      fiscal_year_start: config.fiscal_year_start,
      annual_date: config.annual_date,
    });
    let batch = batches.create(context, {
      accrual_batch_id: input.accrual_batch_id,
      accrual_rule_id: ruleId,
      mode: "preview",
      idempotency_key: requiredString(input, "idempotency_key"),
      periods: generated.periods,
    });
    if (["completed", "completed_with_errors"].includes(batch.status)) return hydrate(context, batch, { replayed: true });
    if (batch.status !== "pending") throw guardedError("Leave accrual batch is already running", "HRX_LEAVE_ACCRUAL_BATCH_IN_PROGRESS");
    batch = batches.markRunning(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version });

    for (const pendingPeriod of batch.periods) {
      batch = batches.markPeriodRunning(context, {
        accrual_batch_id: batch.accrual_batch_id,
        batch_period_id: pendingPeriod.batch_period_id,
        expected_version: pendingPeriod.state_version,
      });
      const runningPeriod = batch.periods.find((period) => period.batch_period_id === pendingPeriod.batch_period_id);
      try {
        const run = children.preview(context, {
          accrual_rule_id: ruleId,
          period_key: runningPeriod.period_key,
          occurred_on: runningPeriod.occurred_on,
        });
        batch = batches.completePeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          accrual_run_id: run.accrual_run_id,
          status: run.status === "completed" ? "completed" : "completed_with_errors",
        });
      } catch (error) {
        batch = batches.failPeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          error_code: safeErrorCode(error),
        });
      }
    }

    const status = batch.periods.every((period) => period.status === "completed") ? "completed" : "completed_with_errors";
    batch = batches.complete(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version, status });
    return hydrate(context, batch);
  }

  function read(context, input) {
    return hydrate(context, input);
  }

  function validatePreview(context, input) {
    const batch = requireBatch(context, input);
    if (batch.mode !== "preview") throw guardedError("Batch is not a preview", "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_INVALID");
    const periods = batch.periods.map((period) => {
      if (!period.accrual_run_id) return Object.freeze({ period_key: period.period_key, preview_run_id: null, is_current: false, error_code: period.error_code ?? "HRX_LEAVE_ACCRUAL_BATCH_CHILD_MISSING" });
      try {
        return children.validatePreview(context, { preview_run_id: period.accrual_run_id });
      } catch (error) {
        return Object.freeze({ period_key: period.period_key, preview_run_id: period.accrual_run_id, is_current: false, error_code: safeErrorCode(error) });
      }
    });
    return Object.freeze({
      accrual_batch_id: batch.accrual_batch_id,
      is_current: periods.every((period) => period.is_current),
      stale_period_count: periods.filter((period) => !period.is_current).length,
      periods: Object.freeze(periods),
    });
  }

  function execute(context, input) {
    if (context?.step_up_verified !== true) throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
    const tenantId = requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    const previewBatchId = requiredString(input, "preview_batch_id");
    const previewBatch = requireBatch(context, { accrual_batch_id: previewBatchId });
    if (previewBatch.mode !== "preview" || !["completed", "completed_with_errors"].includes(previewBatch.status)) {
      throw guardedError("Matching completed preview batch is required", "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_INVALID");
    }
    const prior = store.query("selectOne", { table: "hrx_leave_accrual_batches", where: { tenant_id: tenantId, preview_batch_id: previewBatchId } });
    if (prior) return hydrate(context, prior, { replayed: true });
    const validation = validatePreview(context, { accrual_batch_id: previewBatchId });
    if (!validation.is_current) throw guardedError("Accrual batch source changed after preview", "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_STALE");

    let batch = batches.create(context, {
      accrual_batch_id: input.accrual_batch_id,
      accrual_rule_id: previewBatch.accrual_rule_id,
      mode: "execute",
      preview_batch_id: previewBatchId,
      idempotency_key: requiredString(input, "idempotency_key"),
    });
    if (["completed", "completed_with_errors"].includes(batch.status)) return hydrate(context, batch, { replayed: true });
    if (batch.status !== "pending") throw guardedError("Leave accrual batch is already running", "HRX_LEAVE_ACCRUAL_BATCH_IN_PROGRESS");
    batch = batches.markRunning(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version });

    for (const pendingPeriod of batch.periods) {
      const previewPeriod = previewBatch.periods.find((period) => period.period_key === pendingPeriod.period_key);
      batch = batches.markPeriodRunning(context, { accrual_batch_id: batch.accrual_batch_id, batch_period_id: pendingPeriod.batch_period_id, expected_version: pendingPeriod.state_version });
      const runningPeriod = batch.periods.find((period) => period.batch_period_id === pendingPeriod.batch_period_id);
      try {
        if (!previewPeriod?.accrual_run_id) throw guardedError("Preview child run is missing", "HRX_LEAVE_ACCRUAL_BATCH_CHILD_MISSING");
        const run = children.execute(context, { preview_run_id: previewPeriod.accrual_run_id });
        batch = batches.completePeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          accrual_run_id: run.accrual_run_id,
          status: run.status === "completed" ? "completed" : "completed_with_errors",
        });
      } catch (error) {
        batch = batches.failPeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          error_code: safeErrorCode(error),
        });
      }
    }
    const status = batch.periods.every((period) => period.status === "completed") ? "completed" : "completed_with_errors";
    batch = batches.complete(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version, status });
    return hydrate(context, batch);
  }

  function resume(context, input) {
    requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    let batch = requireBatch(context, input);
    if (batch.mode === "execute" && context?.step_up_verified !== true) throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
    if (batch.status === "completed") return hydrate(context, batch, { replayed: true });
    const retryable = batch.periods.filter((period) => ["pending", "running", "failed"].includes(period.status));
    if (retryable.length === 0) return hydrate(context, batch, { replayed: true });
    if (batch.status !== "running") {
      batch = batches.markRunning(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version });
    }
    const previewBatch = batch.mode === "execute"
      ? requireBatch(context, { accrual_batch_id: batch.preview_batch_id })
      : null;

    for (const retryPeriod of retryable) {
      let runningPeriod = batch.periods.find((period) => period.batch_period_id === retryPeriod.batch_period_id);
      if (runningPeriod.status !== "running") {
        batch = batches.markPeriodRunning(context, { accrual_batch_id: batch.accrual_batch_id, batch_period_id: runningPeriod.batch_period_id, expected_version: runningPeriod.state_version });
        runningPeriod = batch.periods.find((period) => period.batch_period_id === retryPeriod.batch_period_id);
      }
      try {
        const run = batch.mode === "preview"
          ? children.preview(context, { accrual_rule_id: batch.accrual_rule_id, period_key: runningPeriod.period_key, occurred_on: runningPeriod.occurred_on })
          : children.execute(context, { preview_run_id: previewBatch.periods.find((period) => period.period_key === runningPeriod.period_key)?.accrual_run_id });
        batch = batches.completePeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          accrual_run_id: run.accrual_run_id,
          status: run.status === "completed" ? "completed" : "completed_with_errors",
        });
      } catch (error) {
        batch = batches.failPeriod(context, {
          accrual_batch_id: batch.accrual_batch_id,
          batch_period_id: runningPeriod.batch_period_id,
          expected_version: runningPeriod.state_version,
          error_code: safeErrorCode(error),
        });
      }
    }
    const status = batch.periods.every((period) => period.status === "completed") ? "completed" : "completed_with_errors";
    batch = batches.complete(context, { accrual_batch_id: batch.accrual_batch_id, expected_version: batch.state_version, status });
    return hydrate(context, batch);
  }

  function exportReceipt(context, input) {
    const format = String(input?.format ?? "csv").trim().toLowerCase();
    if (!["csv", "xlsx"].includes(format)) throw new TypeError("format must be csv or xlsx");
    const batch = hydrate(context, input);
    const rows = exportRows(batch);
    const buffer = format === "xlsx"
      ? createXlsxBuffer({ headers: EXPORT_HEADERS, rows })
      : csvBuffer(EXPORT_HEADERS, rows);
    const exportTotals = Object.freeze({
      row_count: rows.length,
      amount_minutes: rows.reduce((total, row) => total + Number(row[11] ?? 0), 0),
      new_entries: rows.filter((row) => row[12] === "예").length,
      failed_periods: batch.periods.filter((period) => period.status === "failed").length,
    });
    return Object.freeze({
      format,
      file_name: `leave-accrual-${batch.mode}-${batch.accrual_batch_id}.${format}`,
      mime_type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
      content_base64: buffer.toString("base64"),
      byte_length: buffer.length,
      accrual_batch_id: batch.accrual_batch_id,
      batch_status: batch.status,
      source_version: batch.source_version,
      snapshot_hash: batch.snapshot_hash,
      batch_totals: batch.totals,
      export_totals: exportTotals,
      privacy_boundary: "employee_period_result_only",
    });
  }

  return Object.freeze({ preview, read, validatePreview, execute, resume, exportReceipt });
}
