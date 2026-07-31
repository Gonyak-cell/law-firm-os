import { createHash, randomUUID } from "node:crypto";
import { assertHrxStorePort } from "../store/port.js";

const RUN_TRANSITIONS = Object.freeze({
  draft: new Set(["snapshot_ready", "cancelled"]),
  snapshot_ready: new Set(["previewed", "cancelled"]),
  previewed: new Set(["approved", "cancelled"]),
  approved: new Set(["closed"]),
  closed: new Set(),
  cancelled: new Set(),
});

const PERIOD_TRANSITIONS = Object.freeze({ draft: new Set(["open"]), open: new Set(["closed"]), closed: new Set() });
const STATEMENT_TRANSITIONS = Object.freeze({ generated: new Set(["delivered", "revoked"]), delivered: new Set(["viewed", "revoked"]), viewed: new Set(["revoked"]), revoked: new Set() });
const DELIVERY_TRANSITIONS = Object.freeze({ queued: new Set(["delivered", "failed", "revoked"]), delivered: new Set(["viewed", "revoked"]), viewed: new Set(["revoked"]), failed: new Set(["queued", "revoked"]), revoked: new Set() });
const DELIVERY_PROVIDER_EVENT_STATES = new Set(["accepted", "sent", "delivered", "read", "failed"]);
const DELIVERY_PROVIDER_RESULT_RANK = Object.freeze({ queued: 0, sent: 1, delivered: 2, read: 3 });
const DELIVERY_PROVIDER_EVENT_MAX_FUTURE_SKEW_MS = 15 * 60 * 1000;
const DELIVERY_PROVIDER_REPORTED_FAILED = "HRX_PAYROLL_PROVIDER_REPORTED_FAILED";
const PROVIDER_OPERATION_KINDS = new Set(["delivery", "calendar", "payroll", "bank", "filing"]);
const PROVIDER_OPERATION_TERMINAL_STATES = new Set(["succeeded", "failed", "unknown"]);
export const HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED = "HRX_PAYROLL_RECONCILIATION_MANUAL_REQUIRED";
const PAYMENT_BATCH_TRANSITIONS = Object.freeze({ draft: new Set(["approved", "failed"]), approved: new Set(["exported", "failed"]), exported: new Set(["reconciled", "failed"]), reconciled: new Set(), failed: new Set() });
const PAYMENT_ITEM_TRANSITIONS = Object.freeze({ pending: new Set(["exported", "failed"]), exported: new Set(["paid", "failed"]), paid: new Set(), failed: new Set(["paid", "failed"]) });
const FILING_TRANSITIONS = Object.freeze({ draft: new Set(["validated"]), validated: new Set(["submitted"]), submitted: new Set(["accepted", "rejected"]), rejected: new Set(), corrected: new Set(["validated"]), accepted: new Set() });

export const HRX_PAYMENT_RECONCILIATION_RESULT_SCHEMA_VERSION = "law-firm-os.hrx.payroll-payment-reconciliation-result.v1";
export const HRX_PAYROLL_FILING_SOURCE_MANIFEST_SCHEMA_VERSION = "law-firm-os.hrx.payroll-filing-source-manifest.v1";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export function createPayrollFilingSourceManifest(bundle = {}) {
  const results = Array.isArray(bundle.results) ? bundle.results : [];
  const lineItems = Array.isArray(bundle.line_items) ? bundle.line_items : [];
  return Object.freeze({
    schema_version: HRX_PAYROLL_FILING_SOURCE_MANIFEST_SCHEMA_VERSION,
    results: Object.freeze([...results]
      .sort((left, right) => (
        left.employee_id.localeCompare(right.employee_id)
        || left.result_id.localeCompare(right.result_id)
      ))
      .map((result) => Object.freeze({
        employee_id: requiredString(result, "employee_id"),
        source_result_ref: `artifact:payroll-result/${requiredString(result, "result_id")}`,
        source_result_hash: sha256Value(result, "result_hash"),
        input_snapshot_ref: `artifact:payroll-input/${requiredString(result, "input_snapshot_id")}`,
        gross_krw: requiredInteger(result, "gross_krw"),
        deduction_krw: requiredInteger(result, "deduction_krw"),
        net_krw: requiredInteger(result, "net_krw"),
        issue_count: requiredInteger(result, "issue_count", { nonNegative: true }),
        line_items: Object.freeze(lineItems
          .filter((line) => line.result_id === result.result_id)
          .sort((left, right) => left.line_item_id.localeCompare(right.line_item_id))
          .map((line) => {
            const source = {
              source_line_ref: `artifact:payroll-line/${requiredString(line, "line_item_id")}`,
              item_kind: requiredString(line, "item_kind"),
              item_code: requiredString(line, "item_code"),
              formula_code: requiredString(line, "formula_code"),
              rule_version_ref: line.rule_version_id
                ? `artifact:payroll-rule/${requiredString(line, "rule_version_id")}`
                : null,
              amount_krw: requiredInteger(line, "amount_krw"),
              quantity_minutes: line.quantity_minutes ?? null,
              metadata: JSON.parse(line.metadata_json ?? "{}"),
            };
            return Object.freeze({
              ...source,
              source_line_hash: digest(source),
            });
          })),
      }))),
  });
}

export function createPayrollFilingSourceHash(bundle = {}) {
  return digest(createPayrollFilingSourceManifest(bundle));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function safeOpaqueId(input, field, maximumLength = 255) {
  const value = requiredString(input, field);
  if (value.length > maximumLength || !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(value)) {
    throw new TypeError(`${field} must be a safe opaque identifier`);
  }
  return value;
}

function sha256Value(input, field) {
  const value = requiredString(input, field);
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new TypeError(`${field} must be a SHA-256 hex digest`);
  return value.toLowerCase();
}

function isoTimestamp(input, field) {
  const value = requiredString(input, field);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function correctionKey(input) {
  const value = requiredString(input, "correction_key");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)) {
    throw new TypeError("correction_key must be a safe opaque key");
  }
  return value;
}

function normalizeCorrectionAdjustments(inputs, { correction_key: key, previous_run_id: previousRunId } = {}) {
  const rows = inputs.map((input) => {
    const amountKrw = requiredInteger(input, "amount_krw");
    if (amountKrw < 0) {
      throw guardedError(
        "과지급 회수·상계 절차가 없어 음수 정정은 처리할 수 없습니다",
        "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
        409,
      );
    }
    if (amountKrw === 0) {
      throw guardedError("정정 금액은 1원 이상이어야 합니다", "HRX_PAYROLL_ADJUSTMENT_AMOUNT_INVALID", 409);
    }
    const reasonCode = requiredString(input, "reason_code");
    if (reasonCode === "EXCESS_PAYMENT") {
      throw guardedError(
        "과지급 회수·상계 절차가 없어 해당 정정 사유는 지원하지 않습니다",
        "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
        409,
      );
    }
    return {
      adjustment_id: input.adjustment_id,
      employee_id: requiredString(input, "employee_id"),
      reason_code: reasonCode,
      amount_krw: amountKrw,
      taxable: input.taxable !== false,
    };
  }).sort((left, right) => left.employee_id.localeCompare(right.employee_id));
  if (rows.some((row, index) => rows[index - 1]?.employee_id === row.employee_id)) {
    throw new TypeError("each employee may appear once per correction run");
  }
  return rows.map((row, index) => ({
    ...row,
    previous_run_ref: `artifact:payroll-run/${previousRunId}`,
    adjustment_ref: `artifact:payroll-adjustment/${digest({ correction_key: key, employee_id: row.employee_id, index }).slice(0, 32)}`,
  }));
}

function correctionRequestHash(periodId, previousRunId, adjustments) {
  return digest({
    schema_version: "law-firm-os.hrx.payroll-correction-request.v1",
    period_id: periodId,
    previous_run_id: previousRunId,
    adjustments: [...adjustments]
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
      .map((row) => ({
        adjustment_id: row.adjustment_id ?? null,
        employee_id: row.employee_id,
        previous_run_ref: row.previous_run_ref,
        adjustment_ref: row.adjustment_ref,
        reason_code: row.reason_code,
        amount_krw: row.amount_krw,
        taxable: row.taxable === true || row.taxable === 1,
      })),
  });
}

function contextValues(context) {
  return Object.freeze({ tenant_id: requiredString(context, "tenant_id"), actor_id: requiredString(context, "actor_id") });
}

function expectedVersion(input) {
  const value = input?.expected_version;
  if (!Number.isInteger(value) || value < 1) throw new TypeError("expected_version must be a positive integer");
  return value;
}

function requiredInteger(input, field, { nonNegative = false } = {}) {
  const value = input?.[field];
  if (!Number.isInteger(value) || nonNegative && value < 0) throw new TypeError(`${field} must be ${nonNegative ? "a non-negative " : "an "}integer`);
  return value;
}

function requiredSha256(input, field) {
  const value = requiredString(input, field);
  if (!/^[a-f0-9]{64}$/.test(value)) throw new TypeError(`${field} must be a SHA-256 hex digest`);
  return value;
}

function requiredTokenizedRef(input, field) {
  const value = requiredString(input, field);
  if (!/^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/.test(value)) throw new TypeError(`${field} must be a tokenized reference`);
  return value;
}

function guardedError(message, code, status = 400) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function requireRow(store, table, where, label) {
  const row = store.query("selectOne", { table, where });
  if (!row) throw guardedError(`${label} not found`, "HRX_PAYROLL_NOT_FOUND", 404);
  return row;
}

function assertTransition(current, next, transitions, label) {
  if (!transitions[current]?.has(next)) throw guardedError(`${label} state transition is invalid`, "HRX_PAYROLL_STATE_INVALID", 409);
}

function addUtcDay(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function createPayrollRepository({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
  faultInjector = () => {},
} = {}) {
  assertHrxStorePort(store);
  if (typeof store.transaction !== "function") throw new TypeError("payroll repository requires a transactional store");
  if (typeof faultInjector !== "function") throw new TypeError("payroll repository faultInjector must be a function");

  function appendAudit(tx, context, action, objectType, objectId, metadata = {}) {
    const events = tx.query("select", { table: "hrx_audit_events", where: { tenant_id: context.tenant_id } });
    const previousHash = events.at(-1)?.event_hash ?? null;
    const occurredAt = clock();
    const event = {
      tenant_id: context.tenant_id,
      event_id: idFactory("payroll_audit"),
      actor_id: context.actor_id,
      action,
      object_type: objectType,
      object_id: objectId,
      decision: "allow",
      reason: "payroll_repository_mutation",
      source: "hrx-payroll-repository",
      metadata_json: JSON.stringify(stable(metadata)),
      previous_hash: previousHash,
      occurred_at: occurredAt,
    };
    event.event_hash = digest({ ...event, event_hash: undefined });
    return tx.query("insert", { table: "hrx_audit_events", row: event });
  }

  function appendOutbox(tx, context, input) {
    return tx.query("insert", { table: "hrx_payroll_outbox", row: {
      tenant_id: context.tenant_id,
      outbox_event_id: input.outbox_event_id ?? idFactory("payroll_outbox"),
      run_id: requiredString(input, "run_id"),
      event_type: requiredString(input, "event_type"),
      idempotency_key: requiredString(input, "idempotency_key"),
      payload_json: JSON.stringify(stable(input.payload ?? {})),
      created_by_actor_id: context.actor_id,
      created_at: clock(),
    } });
  }

  function auditedInsert(context, table, row, action, objectType, objectId) {
    return store.transaction((tx) => {
      const inserted = tx.query("insert", { table, row });
      appendAudit(tx, context, action, objectType, objectId, { table });
      return Object.freeze(clone(inserted));
    });
  }

  function auditedUpdate(context, table, where, patch, version, action, objectType, objectId, options = {}) {
    return store.transaction((tx) => {
      const updated = tx.query("updateOne", { table, where, expected_version: version, patch });
      if (!updated) throw guardedError(`${objectType} not found`, "HRX_PAYROLL_NOT_FOUND", 404);
      appendAudit(tx, context, action, objectType, objectId, { from_version: version, to_version: patch.state_version });
      if (options.outbox) appendOutbox(tx, context, options.outbox);
      return Object.freeze(clone(updated));
    });
  }

  function createPeriod(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      period_id: input.period_id ?? idFactory("payroll_period"),
      period_code: requiredString(input, "period_code"),
      period_start: requiredString(input, "period_start"),
      period_end: requiredString(input, "period_end"),
      cutoff_at: requiredString(input, "cutoff_at"),
      pay_date: requiredString(input, "pay_date"),
      status: "draft",
      state_version: 1,
      created_by_actor_id: context.actor_id,
      created_at: now,
      updated_at: now,
      closed_at: null,
    };
    return auditedInsert(context, "hrx_payroll_periods", row, "hrx.payroll.period.create", "PayrollPeriod", row.period_id);
  }

  function getPeriod(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", { table: "hrx_payroll_periods", where: { tenant_id: context.tenant_id, period_id: requiredString(input, "period_id") } }));
  }

  function listPeriods(contextInput) {
    const context = contextValues(contextInput);
    return Object.freeze(store.query("select", { table: "hrx_payroll_periods", where: { tenant_id: context.tenant_id } }).sort((a, b) => b.period_start.localeCompare(a.period_start)).map(clone));
  }

  function transitionPeriod(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const periodId = requiredString(input, "period_id");
    const next = requiredString(input, "status");
    const current = requireRow(store, "hrx_payroll_periods", { tenant_id: context.tenant_id, period_id: periodId }, "Payroll period");
    assertTransition(current.status, next, PERIOD_TRANSITIONS, "Payroll period");
    const version = expectedVersion(input);
    const now = clock();
    return auditedUpdate(context, "hrx_payroll_periods", { tenant_id: context.tenant_id, period_id: periodId }, {
      status: next,
      state_version: version + 1,
      updated_at: now,
      closed_at: next === "closed" ? now : null,
    }, version, `hrx.payroll.period.${next}`, "PayrollPeriod", periodId);
  }

  function createRun(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const periodId = requiredString(input, "period_id");
    requireRow(store, "hrx_payroll_periods", { tenant_id: context.tenant_id, period_id: periodId }, "Payroll period");
    const runType = input.run_type ?? "regular";
    const previousRunId = optionalString(input.previous_run_id);
    if (runType === "regular") {
      const duplicate = store.query("selectOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, period_id: periodId, run_type: "regular" } });
      if (duplicate) throw guardedError("Regular payroll run already exists for period", "HRX_PAYROLL_RUN_DUPLICATE", 409);
    } else if (runType === "adjustment") {
      throw guardedError("Adjustment payroll runs must include at least one correction", "HRX_PAYROLL_ADJUSTMENT_EMPTY", 409);
    } else {
      throw new TypeError("run_type must be regular or adjustment");
    }
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      run_id: input.run_id ?? idFactory("payroll_run"),
      period_id: periodId,
      run_type: runType,
      previous_run_id: previousRunId,
      correction_key: null,
      correction_request_hash: null,
      status: "draft",
      snapshot_hash: null,
      result_hash: null,
      filing_source_hash: null,
      prepared_by_actor_id: context.actor_id,
      approved_by_actor_id: null,
      approved_at: null,
      closed_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_runs", row, "hrx.payroll.run.create", "PayrollRun", row.run_id);
  }

  function createAdjustmentRun(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const periodId = requiredString(input, "period_id");
    const previousRunId = requiredString(input, "previous_run_id");
    const runCorrectionKey = correctionKey(input);
    const adjustmentInputs = Array.isArray(input.adjustments) ? input.adjustments : [];
    if (adjustmentInputs.length === 0) throw guardedError("Adjustment payroll runs must include at least one correction", "HRX_PAYROLL_ADJUSTMENT_EMPTY", 409);
    const normalizedAdjustments = normalizeCorrectionAdjustments(adjustmentInputs, {
      correction_key: runCorrectionKey,
      previous_run_id: previousRunId,
    });
    const requestHash = correctionRequestHash(periodId, previousRunId, normalizedAdjustments);
    const replay = store.query("selectOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, correction_key: runCorrectionKey } });
    if (replay) {
      const persistedHash = replay.correction_request_hash ?? correctionRequestHash(
        replay.period_id,
        replay.previous_run_id,
        listAdjustments(context, { run_id: replay.run_id }),
      );
      if (replay.period_id !== periodId || replay.previous_run_id !== previousRunId || replay.run_type !== "adjustment" || persistedHash !== requestHash) {
        throw guardedError("Correction key is already bound to another payroll run", "HRX_PAYROLL_CORRECTION_KEY_CONFLICT", 409);
      }
      return Object.freeze({
        run: Object.freeze({ ...clone(replay), idempotent_replay: true }),
        adjustments: listAdjustments(context, { run_id: replay.run_id }),
        idempotent_replay: true,
      });
    }
    requireRow(store, "hrx_payroll_periods", { tenant_id: context.tenant_id, period_id: periodId }, "Payroll period");
    const previous = requireRow(store, "hrx_payroll_runs", { tenant_id: context.tenant_id, run_id: previousRunId }, "Previous payroll run");
    if (previous.period_id !== periodId || previous.status !== "closed") {
      throw guardedError("Adjustment requires a closed run in the same period", "HRX_PAYROLL_ADJUSTMENT_SOURCE_INVALID", 409);
    }
    const now = clock();
    const runId = input.run_id ?? idFactory("payroll_run");
    const run = {
      tenant_id: context.tenant_id,
      run_id: runId,
      period_id: periodId,
      run_type: "adjustment",
      previous_run_id: previousRunId,
      correction_key: runCorrectionKey,
      correction_request_hash: requestHash,
      status: "draft",
      snapshot_hash: null,
      result_hash: null,
      filing_source_hash: null,
      prepared_by_actor_id: context.actor_id,
      approved_by_actor_id: null,
      approved_at: null,
      closed_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    const adjustmentRows = normalizedAdjustments.map((adjustmentInput) => ({
      tenant_id: context.tenant_id,
      adjustment_id: adjustmentInput.adjustment_id ?? idFactory("payroll_adjustment"),
      run_id: runId,
      employee_id: adjustmentInput.employee_id,
      previous_run_ref: adjustmentInput.previous_run_ref,
      adjustment_ref: adjustmentInput.adjustment_ref,
      reason_code: adjustmentInput.reason_code,
      amount_krw: adjustmentInput.amount_krw,
      taxable: adjustmentInput.taxable ? 1 : 0,
      created_by_actor_id: context.actor_id,
      created_at: now,
    }));
    return store.transaction((tx) => {
      const insertedRun = tx.query("insert", { table: "hrx_payroll_runs", row: run });
      appendAudit(tx, context, "hrx.payroll.run.create", "PayrollRun", runId, { table: "hrx_payroll_runs", correction: true });
      const insertedAdjustments = adjustmentRows.map((row) => {
        const inserted = tx.query("insert", { table: "hrx_payroll_adjustments", row });
        appendAudit(tx, context, "hrx.payroll.adjustment.create", "PayrollAdjustment", row.adjustment_id, { table: "hrx_payroll_adjustments", run_id: runId });
        return Object.freeze(clone(inserted));
      });
      return Object.freeze({
        run: Object.freeze(clone(insertedRun)),
        adjustments: Object.freeze(insertedAdjustments),
        idempotent_replay: false,
      });
    });
  }

  function getRun(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, run_id: requiredString(input, "run_id") } }));
  }

  function listRuns(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.period_id) where.period_id = input.period_id;
    return Object.freeze(store.query("select", { table: "hrx_payroll_runs", where }).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(clone));
  }

  function transitionRun(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const runId = requiredString(input, "run_id");
    const next = requiredString(input, "status");
    const current = requireRow(store, "hrx_payroll_runs", { tenant_id: context.tenant_id, run_id: runId }, "Payroll run");
    assertTransition(current.status, next, RUN_TRANSITIONS, "Payroll run");
    const version = expectedVersion(input);
    const now = clock();
    const patch = { status: next, state_version: version + 1, updated_at: now };
    if (next === "snapshot_ready") patch.snapshot_hash = requiredString(input, "snapshot_hash");
    if (next === "previewed") patch.result_hash = requiredString(input, "result_hash");
    if (next === "approved") {
      if (context.actor_id === current.prepared_by_actor_id) throw guardedError("Payroll preparer cannot self-approve", "HRX_PAYROLL_SELF_APPROVAL", 403);
      patch.approved_by_actor_id = context.actor_id;
      patch.approved_at = now;
    }
    if (next === "closed") {
      patch.closed_at = now;
      patch.filing_source_hash = createPayrollFilingSourceHash(getRunBundle(context, { run_id: runId }));
    }
    let outbox = null;
    if (next === "approved") {
      const receiptHash = requiredSha256(input, "step_up_receipt_hash");
      outbox = {
        run_id: runId,
        event_type: "payroll.approve",
        idempotency_key: `payroll.approve:${receiptHash}`,
        payload: { run_id: runId, step_up_receipt_ref: requiredTokenizedRef(input, "step_up_receipt_ref"), step_up_receipt_hash: receiptHash },
      };
    }
    if (next === "closed") outbox = {
      run_id: runId,
      event_type: "payroll.close",
      idempotency_key: `payroll.close:${runId}`,
      payload: {
        run_id: runId,
        result_hash: current.result_hash,
        filing_source_hash: patch.filing_source_hash,
      },
    };
    return auditedUpdate(context, "hrx_payroll_runs", { tenant_id: context.tenant_id, run_id: runId }, patch, version, `hrx.payroll.run.${next}`, "PayrollRun", runId, { outbox });
  }

  function createProfile(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const employmentType = requiredString(input, "employment_type");
    const defaultUnit = { monthly: "period", hourly: "hour", daily: "day", freelancer: "contract" }[employmentType];
    const row = {
      tenant_id: context.tenant_id,
      payroll_profile_id: input.payroll_profile_id ?? idFactory("payroll_profile"),
      employee_id: requiredString(input, "employee_id"),
      employment_type: employmentType,
      pay_group_code: requiredString(input, "pay_group_code"),
      currency: input.currency ?? "KRW",
      compensation_ref: requiredString(input, "compensation_ref"),
      compensation_unit: input.compensation_unit ?? defaultUnit,
      compensation_quantity: input.compensation_quantity ?? 1,
      withholding_category: optionalString(input.withholding_category),
      deduction_input_json: input.deduction_input ? JSON.stringify(stable(input.deduction_input)) : null,
      custom_deductions_json: JSON.stringify(stable(input.custom_deductions ?? [])),
      notice_assessments_json: JSON.stringify(stable(input.notice_assessments ?? [])),
      effective_from: requiredString(input, "effective_from"),
      effective_to: optionalString(input.effective_to),
      status: input.status ?? "active",
      state_version: 1,
      created_by_actor_id: context.actor_id,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_profiles", row, "hrx.payroll.profile.create", "PayrollProfile", row.payroll_profile_id);
  }

  function updateProfile(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const profileId = requiredString(input, "payroll_profile_id");
    const current = requireRow(store, "hrx_payroll_profiles", { tenant_id: context.tenant_id, payroll_profile_id: profileId }, "Payroll profile");
    const version = expectedVersion(input);
    const patch = {
      employment_type: input.employment_type ?? current.employment_type,
      pay_group_code: input.pay_group_code ?? current.pay_group_code,
      currency: input.currency ?? current.currency,
      compensation_ref: input.compensation_ref ?? current.compensation_ref,
      compensation_unit: input.compensation_unit ?? current.compensation_unit,
      compensation_quantity: input.compensation_quantity ?? current.compensation_quantity,
      withholding_category: Object.hasOwn(input, "withholding_category") ? optionalString(input.withholding_category) : current.withholding_category,
      deduction_input_json: Object.hasOwn(input, "deduction_input") ? (input.deduction_input ? JSON.stringify(stable(input.deduction_input)) : null) : current.deduction_input_json,
      custom_deductions_json: Object.hasOwn(input, "custom_deductions") ? JSON.stringify(stable(input.custom_deductions ?? [])) : current.custom_deductions_json,
      notice_assessments_json: Object.hasOwn(input, "notice_assessments") ? JSON.stringify(stable(input.notice_assessments ?? [])) : current.notice_assessments_json,
      effective_to: Object.hasOwn(input, "effective_to") ? optionalString(input.effective_to) : current.effective_to,
      status: input.status ?? current.status,
      state_version: version + 1,
      updated_at: clock(),
    };
    return auditedUpdate(context, "hrx_payroll_profiles", { tenant_id: context.tenant_id, payroll_profile_id: profileId }, patch, version, "hrx.payroll.profile.update", "PayrollProfile", profileId);
  }

  function listProfiles(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.employee_id) where.employee_id = input.employee_id;
    return Object.freeze(store.query("select", { table: "hrx_payroll_profiles", where }).sort((a, b) => a.employee_id.localeCompare(b.employee_id)).map(clone));
  }

  function createInputSnapshot(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const refs = clone(input.source_refs ?? []);
    const row = {
      tenant_id: context.tenant_id,
      snapshot_id: input.snapshot_id ?? idFactory("payroll_snapshot"),
      run_id: requiredString(input, "run_id"),
      employee_id: requiredString(input, "employee_id"),
      source_refs_json: JSON.stringify(stable(refs)),
      input_json: JSON.stringify(stable(input.input_data ?? {})),
      source_hash: input.source_hash ?? digest(refs),
      payable_minutes: input.payable_minutes ?? 0,
      paid_leave_minutes: input.paid_leave_minutes ?? 0,
      unpaid_leave_minutes: input.unpaid_leave_minutes ?? 0,
      captured_at: input.captured_at ?? clock(),
    };
    return auditedInsert(context, "hrx_payroll_input_snapshots", row, "hrx.payroll.snapshot.create", "PayrollInputSnapshot", row.snapshot_id);
  }

  function createAdjustment(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const runId = requiredString(input, "run_id");
    const run = requireRow(store, "hrx_payroll_runs", { tenant_id: context.tenant_id, run_id: runId }, "Payroll run");
    if (run.run_type !== "adjustment" || run.status !== "draft") throw guardedError("Adjustment input requires a draft adjustment run", "HRX_PAYROLL_ADJUSTMENT_STATE_INVALID", 409);
    const reasonCode = requiredString(input, "reason_code");
    const amountKrw = requiredInteger(input, "amount_krw");
    if (amountKrw < 0) {
      throw guardedError(
        "과지급 회수·상계 절차가 없어 음수 정정은 처리할 수 없습니다",
        "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
        409,
      );
    }
    if (amountKrw === 0) {
      throw guardedError("정정 금액은 1원 이상이어야 합니다", "HRX_PAYROLL_ADJUSTMENT_AMOUNT_INVALID", 409);
    }
    if (reasonCode === "EXCESS_PAYMENT") {
      throw guardedError(
        "과지급 회수·상계 절차가 없어 해당 정정 사유는 지원하지 않습니다",
        "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
        409,
      );
    }
    const row = {
      tenant_id: context.tenant_id,
      adjustment_id: input.adjustment_id ?? idFactory("payroll_adjustment"),
      run_id: runId,
      employee_id: requiredString(input, "employee_id"),
      previous_run_ref: requiredTokenizedRef(input, "previous_run_ref"),
      adjustment_ref: requiredTokenizedRef(input, "adjustment_ref"),
      reason_code: reasonCode,
      amount_krw: amountKrw,
      taxable: input.taxable === true ? 1 : 0,
      created_by_actor_id: context.actor_id,
      created_at: clock(),
    };
    return auditedInsert(context, "hrx_payroll_adjustments", row, "hrx.payroll.adjustment.create", "PayrollAdjustment", row.adjustment_id);
  }

  function listAdjustments(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.run_id) where.run_id = input.run_id;
    if (input.employee_id) where.employee_id = input.employee_id;
    return Object.freeze(store.query("select", { table: "hrx_payroll_adjustments", where }).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((row) => Object.freeze({ ...clone(row), taxable: row.taxable === 1 })));
  }

  function persistRunPreview(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const runId = requiredString(input, "run_id");
    const version = expectedVersion(input);
    const overallHash = requiredSha256(input, "result_hash");
    if (!Array.isArray(input.results) || input.results.length === 0) throw new TypeError("results must be a non-empty array");
    return store.transaction((tx) => {
      const current = tx.query("selectOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, run_id: runId } });
      if (!current) throw guardedError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
      if (current.status !== "snapshot_ready") throw guardedError("Payroll run is not ready for preview", "HRX_PAYROLL_STATE_INVALID", 409);
      if (tx.query("select", { table: "hrx_payroll_employee_results", where: { tenant_id: context.tenant_id, run_id: runId } }).length) throw guardedError("Payroll preview results already exist", "HRX_PAYROLL_PREVIEW_EXISTS", 409);
      const persisted = [];
      for (const resultInput of [...input.results].sort((a, b) => a.employee_id.localeCompare(b.employee_id))) {
        const employeeId = requiredString(resultInput, "employee_id");
        const snapshot = tx.query("selectOne", { table: "hrx_payroll_input_snapshots", where: { tenant_id: context.tenant_id, snapshot_id: requiredString(resultInput, "input_snapshot_id") } });
        if (!snapshot || snapshot.run_id !== runId || snapshot.employee_id !== employeeId) throw guardedError("Payroll result snapshot mismatch", "HRX_PAYROLL_SNAPSHOT_MISMATCH", 409);
        const gross = requiredInteger(resultInput, "gross_krw");
        const deductions = requiredInteger(resultInput, "deduction_krw");
        const net = requiredInteger(resultInput, "net_krw");
        if (gross - deductions !== net) throw new TypeError("payroll result totals are inconsistent");
        const result = tx.query("insert", { table: "hrx_payroll_employee_results", row: {
          tenant_id: context.tenant_id,
          result_id: resultInput.result_id ?? idFactory("payroll_result"),
          run_id: runId,
          employee_id: employeeId,
          input_snapshot_id: snapshot.snapshot_id,
          gross_krw: gross,
          deduction_krw: deductions,
          net_krw: net,
          issue_count: resultInput.issue_count ?? 0,
          result_hash: requiredSha256(resultInput, "result_hash"),
          created_at: clock(),
        } });
        for (const line of resultInput.line_items ?? []) {
          tx.query("insert", { table: "hrx_payroll_line_items", row: {
            tenant_id: context.tenant_id,
            line_item_id: line.line_item_id ?? idFactory("payroll_line"),
            result_id: result.result_id,
            item_kind: requiredString(line, "item_kind"),
            item_code: requiredString(line, "item_code"),
            formula_code: requiredString(line, "formula_code"),
            rule_version_id: optionalString(line.rule_version_id),
            amount_krw: requiredInteger(line, "amount_krw"),
            quantity_minutes: line.quantity_minutes ?? null,
            metadata_json: JSON.stringify(stable(line.metadata ?? {})),
            created_at: clock(),
          } });
        }
        for (const issue of resultInput.issues ?? []) {
          const issueCode = requiredString(issue, "issue_code");
          if (tx.query("selectOne", { table: "hrx_payroll_issues", where: { tenant_id: context.tenant_id, run_id: runId, employee_id: employeeId, issue_code: issueCode } })) continue;
          tx.query("insert", { table: "hrx_payroll_issues", row: {
            tenant_id: context.tenant_id,
            issue_id: issue.issue_id ?? idFactory("payroll_issue"),
            run_id: runId,
            employee_id: employeeId,
            issue_code: issueCode,
            severity: issue.severity ?? "blocker",
            source_ref: requiredTokenizedRef(issue, "source_ref"),
            details_json: JSON.stringify(stable(issue.details ?? {})),
            state: "open",
            resolved_by_actor_id: null,
            resolved_at: null,
            resolution_code: null,
            state_version: 1,
            created_at: clock(),
            updated_at: clock(),
          } });
        }
        appendAudit(tx, context, "hrx.payroll.result.create", "PayrollEmployeeResult", result.result_id, { run_id: runId, issue_count: result.issue_count });
        persisted.push(result);
      }
      const updated = tx.query("updateOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, run_id: runId }, expected_version: version, patch: { status: "previewed", result_hash: overallHash, state_version: version + 1, updated_at: clock() } });
      appendAudit(tx, context, "hrx.payroll.run.previewed", "PayrollRun", runId, { result_hash: overallHash, employee_count: persisted.length });
      appendOutbox(tx, context, { run_id: runId, event_type: "payroll.preview", idempotency_key: `payroll.preview:${runId}:${overallHash}`, payload: { run_id: runId, result_hash: overallHash, employee_count: persisted.length } });
      return Object.freeze({ run: clone(updated), results: Object.freeze(persisted.map(clone)) });
    });
  }

  function createEmployeeResult(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const run = requireRow(store, "hrx_payroll_runs", {
      tenant_id: context.tenant_id,
      run_id: requiredString(input, "run_id"),
    }, "Payroll run");
    if (!["draft", "snapshot_ready"].includes(run.status)) {
      throw guardedError("Payroll results are immutable after preview", "HRX_PAYROLL_RESULT_IMMUTABLE", 409);
    }
    const gross = requiredInteger(input, "gross_krw");
    const deductions = requiredInteger(input, "deduction_krw");
    const net = requiredInteger(input, "net_krw");
    const row = {
      tenant_id: context.tenant_id,
      result_id: input.result_id ?? idFactory("payroll_result"),
      run_id: run.run_id,
      employee_id: requiredString(input, "employee_id"),
      input_snapshot_id: requiredString(input, "input_snapshot_id"),
      gross_krw: gross,
      deduction_krw: deductions,
      net_krw: net,
      issue_count: input.issue_count ?? 0,
      result_hash: input.result_hash ?? digest({ gross_krw: gross, deduction_krw: deductions, net_krw: net, issue_count: input.issue_count ?? 0 }),
      created_at: clock(),
    };
    return auditedInsert(context, "hrx_payroll_employee_results", row, "hrx.payroll.result.create", "PayrollEmployeeResult", row.result_id);
  }

  function createIssue(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      issue_id: input.issue_id ?? idFactory("payroll_issue"),
      run_id: requiredString(input, "run_id"),
      employee_id: optionalString(input.employee_id),
      issue_code: requiredString(input, "issue_code"),
      severity: input.severity ?? "blocker",
      source_ref: requiredString(input, "source_ref"),
      details_json: JSON.stringify(stable(input.details ?? {})),
      state: "open",
      resolved_by_actor_id: null,
      resolved_at: null,
      resolution_code: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_issues", row, "hrx.payroll.issue.create", "PayrollIssue", row.issue_id);
  }

  function listIssues(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.run_id) where.run_id = input.run_id;
    if (input.employee_id) where.employee_id = input.employee_id;
    if (input.state) where.state = input.state;
    return Object.freeze(store.query("select", { table: "hrx_payroll_issues", where }).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(clone));
  }

  function resolveIssue(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const issueId = requiredString(input, "issue_id");
    const current = requireRow(store, "hrx_payroll_issues", { tenant_id: context.tenant_id, issue_id: issueId }, "Payroll issue");
    if (current.state !== "open") throw guardedError("Only open payroll issue can be closed", "HRX_PAYROLL_ISSUE_STATE_INVALID", 409);
    const state = input.state ?? "resolved";
    if (!["resolved", "waived"].includes(state)) throw new TypeError("payroll issue state must be resolved or waived");
    const version = expectedVersion(input);
    const now = clock();
    return auditedUpdate(context, "hrx_payroll_issues", { tenant_id: context.tenant_id, issue_id: issueId }, {
      state,
      resolved_by_actor_id: context.actor_id,
      resolved_at: now,
      resolution_code: requiredString(input, "resolution_code"),
      state_version: version + 1,
      updated_at: now,
    }, version, `hrx.payroll.issue.${state}`, "PayrollIssue", issueId);
  }

  function reopenIssue(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const issueId = requiredString(input, "issue_id");
    const current = requireRow(store, "hrx_payroll_issues", { tenant_id: context.tenant_id, issue_id: issueId }, "Payroll issue");
    if (!["resolved", "waived"].includes(current.state)) throw guardedError("Only closed payroll issue can be reopened", "HRX_PAYROLL_ISSUE_STATE_INVALID", 409);
    const version = expectedVersion(input);
    return auditedUpdate(context, "hrx_payroll_issues", { tenant_id: context.tenant_id, issue_id: issueId }, {
      state: "open",
      resolved_by_actor_id: null,
      resolved_at: null,
      resolution_code: null,
      state_version: version + 1,
      updated_at: clock(),
    }, version, "hrx.payroll.issue.reopen", "PayrollIssue", issueId);
  }

  function addLineItem(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const result = requireRow(store, "hrx_payroll_employee_results", {
      tenant_id: context.tenant_id,
      result_id: requiredString(input, "result_id"),
    }, "Payroll employee result");
    const run = requireRow(store, "hrx_payroll_runs", {
      tenant_id: context.tenant_id,
      run_id: result.run_id,
    }, "Payroll run");
    if (!["draft", "snapshot_ready"].includes(run.status)) {
      throw guardedError("Payroll result lines are immutable after preview", "HRX_PAYROLL_RESULT_IMMUTABLE", 409);
    }
    const row = {
      tenant_id: context.tenant_id,
      line_item_id: input.line_item_id ?? idFactory("payroll_line"),
      result_id: result.result_id,
      item_kind: requiredString(input, "item_kind"),
      item_code: requiredString(input, "item_code"),
      formula_code: requiredString(input, "formula_code"),
      rule_version_id: optionalString(input.rule_version_id),
      amount_krw: requiredInteger(input, "amount_krw"),
      quantity_minutes: input.quantity_minutes ?? null,
      metadata_json: JSON.stringify(stable(input.metadata ?? {})),
      created_at: clock(),
    };
    return auditedInsert(context, "hrx_payroll_line_items", row, "hrx.payroll.line_item.create", "PayrollLineItem", row.line_item_id);
  }

  function createRuleVersion(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      rule_version_id: input.rule_version_id ?? idFactory("payroll_rule"),
      rule_kind: requiredString(input, "rule_kind"),
      version_code: requiredString(input, "version_code"),
      effective_from: requiredString(input, "effective_from"),
      effective_to: optionalString(input.effective_to),
      source_document_hash: requiredString(input, "source_document_hash"),
      rules_json: JSON.stringify(stable(input.rules ?? {})),
      approval_state: "draft",
      created_by_actor_id: context.actor_id,
      legal_reviewed_by_actor_id: null,
      legal_review_ref: null,
      legal_reviewed_at: null,
      reviewed_by_actor_id: null,
      published_by_actor_id: null,
      published_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_rule_versions", row, "hrx.payroll.rule.create", "PayrollRuleVersion", row.rule_version_id);
  }

  function legallyApproveMinimumWageRuleVersion(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const ruleId = requiredString(input, "rule_version_id");
    const current = requireRow(store, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, "Payroll rule");
    if (current.rule_kind !== "minimum_wage" || current.approval_state !== "draft") {
      throw guardedError("Only a draft minimum wage rule can receive legal approval", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID", 409);
    }
    if (context.actor_id === current.created_by_actor_id) {
      throw guardedError("Minimum wage rule author cannot legally approve own rule", "HRX_PAYROLL_SELF_APPROVAL", 403);
    }
    const rules = JSON.parse(current.rules_json);
    if (rules.legal_review_state !== "pending" || rules.legal_review_ref) {
      throw guardedError("Minimum wage rule is not pending legal review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID", 409);
    }
    const version = expectedVersion(input);
    const legalReviewRef = requiredTokenizedRef(input, "legal_review_ref");
    const legalReviewedAt = clock();
    return auditedUpdate(context, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, {
      rules_json: JSON.stringify(stable({
        ...rules,
        legal_review_state: "approved",
        legal_review_ref: legalReviewRef,
      })),
      legal_reviewed_by_actor_id: context.actor_id,
      legal_review_ref: legalReviewRef,
      legal_reviewed_at: legalReviewedAt,
      state_version: version + 1,
      updated_at: legalReviewedAt,
    }, version, "hrx.payroll.minimum_wage.legal_approve", "PayrollRuleVersion", ruleId);
  }

  function reviewRuleVersion(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const ruleId = requiredString(input, "rule_version_id");
    const current = requireRow(store, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, "Payroll rule");
    if (current.approval_state !== "draft") throw guardedError("Only draft payroll rule can be reviewed", "HRX_PAYROLL_RULE_STATE_INVALID", 409);
    if (current.rule_kind === "minimum_wage") {
      const rules = JSON.parse(current.rules_json);
      if (rules.legal_review_state !== "approved" || !rules.legal_review_ref) {
        throw guardedError("Minimum wage rule requires legal approval before payroll review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED", 403);
      }
    }
    if (context.actor_id === current.created_by_actor_id) throw guardedError("Payroll rule author cannot review own rule", "HRX_PAYROLL_SELF_APPROVAL", 403);
    const version = expectedVersion(input);
    return auditedUpdate(context, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, {
      approval_state: "reviewed",
      reviewed_by_actor_id: context.actor_id,
      state_version: version + 1,
      updated_at: clock(),
    }, version, "hrx.payroll.rule.review", "PayrollRuleVersion", ruleId);
  }

  function publishRuleVersion(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const ruleId = requiredString(input, "rule_version_id");
    const current = requireRow(store, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, "Payroll rule");
    if (current.approval_state !== "reviewed") throw guardedError("Only reviewed payroll rule can be published", "HRX_PAYROLL_RULE_STATE_INVALID", 409);
    if (context.actor_id === current.created_by_actor_id) throw guardedError("Payroll rule author cannot publish own rule", "HRX_PAYROLL_SELF_APPROVAL", 403);
    const published = store.query("select", { table: "hrx_payroll_rule_versions", where: { tenant_id: context.tenant_id, rule_kind: current.rule_kind, approval_state: "published" } });
    const sequence = [...published, current].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
    for (let index = 1; index < sequence.length; index += 1) {
      const previous = sequence[index - 1];
      const next = sequence[index];
      if (!previous.effective_to || addUtcDay(previous.effective_to) !== next.effective_from) {
        throw guardedError("Published payroll rule dates must be contiguous and non-overlapping", "HRX_PAYROLL_RULE_COVERAGE_INVALID", 409);
      }
    }
    const version = expectedVersion(input);
    const now = clock();
    return auditedUpdate(context, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, {
      approval_state: "published",
      published_by_actor_id: context.actor_id,
      published_at: now,
      state_version: version + 1,
      updated_at: now,
    }, version, "hrx.payroll.rule.publish", "PayrollRuleVersion", ruleId);
  }

  function listRuleVersions(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.rule_kind) where.rule_kind = input.rule_kind;
    return Object.freeze(store.query("select", { table: "hrx_payroll_rule_versions", where }).sort((a, b) => a.effective_from.localeCompare(b.effective_from)).map(clone));
  }

  function createStatementTemplate(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const schema = clone(input.schema ?? {});
    const row = {
      tenant_id: context.tenant_id,
      template_id: input.template_id ?? idFactory("payroll_statement_template"),
      version_code: requiredString(input, "version_code"),
      template_hash: input.template_hash ?? digest(schema),
      schema_json: JSON.stringify(stable(schema)),
      status: "draft",
      created_by_actor_id: context.actor_id,
      published_by_actor_id: null,
      published_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_statement_templates", row, "hrx.payroll.statement_template.create", "PayrollStatementTemplate", row.template_id);
  }

  function publishStatementTemplate(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const templateId = requiredString(input, "template_id");
    const current = requireRow(store, "hrx_payroll_statement_templates", { tenant_id: context.tenant_id, template_id: templateId }, "Payroll statement template");
    if (current.status !== "draft") throw guardedError("Only draft statement template can be published", "HRX_PAYROLL_TEMPLATE_STATE_INVALID", 409);
    if (context.actor_id === current.created_by_actor_id) throw guardedError("Statement template author cannot publish own template", "HRX_PAYROLL_SELF_APPROVAL", 403);
    const version = expectedVersion(input);
    const now = clock();
    return auditedUpdate(context, "hrx_payroll_statement_templates", { tenant_id: context.tenant_id, template_id: templateId }, {
      status: "published",
      published_by_actor_id: context.actor_id,
      published_at: now,
      state_version: version + 1,
      updated_at: now,
    }, version, "hrx.payroll.statement_template.publish", "PayrollStatementTemplate", templateId);
  }

  function getStatementTemplate(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_statement_templates",
      where: { tenant_id: context.tenant_id, template_id: requiredString(input, "template_id") },
    }));
  }

  function listStatementTemplates(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.status) where.status = input.status;
    return Object.freeze(store.query("select", { table: "hrx_payroll_statement_templates", where })
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(clone));
  }

  function createStatement(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const template = requireRow(store, "hrx_payroll_statement_templates", { tenant_id: context.tenant_id, template_id: requiredString(input, "template_id") }, "Payroll statement template");
    if (template.status !== "published") throw guardedError("Published statement template is required", "HRX_PAYROLL_TEMPLATE_STATE_INVALID", 409);
    const row = {
      tenant_id: context.tenant_id,
      statement_id: input.statement_id ?? idFactory("payroll_statement"),
      run_id: requiredString(input, "run_id"),
      employee_id: requiredString(input, "employee_id"),
      template_id: template.template_id,
      document_ref: requiredString(input, "document_ref"),
      document_hash: requiredString(input, "document_hash"),
      state: "generated",
      state_version: 1,
      generated_at: input.generated_at ?? clock(),
      delivered_at: null,
      viewed_at: null,
      revoked_at: null,
    };
    return auditedInsert(context, "hrx_payroll_statements", row, "hrx.payroll.statement.create", "PayrollStatement", row.statement_id);
  }

  function transitionStatement(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const statementId = requiredString(input, "statement_id");
    const next = requiredString(input, "state");
    const current = requireRow(store, "hrx_payroll_statements", { tenant_id: context.tenant_id, statement_id: statementId }, "Payroll statement");
    assertTransition(current.state, next, STATEMENT_TRANSITIONS, "Payroll statement");
    const version = expectedVersion(input);
    const now = clock();
    const patch = { state: next, state_version: version + 1 };
    if (next === "delivered") patch.delivered_at = now;
    if (next === "viewed") patch.viewed_at = now;
    if (next === "revoked") patch.revoked_at = now;
    return auditedUpdate(context, "hrx_payroll_statements", { tenant_id: context.tenant_id, statement_id: statementId }, patch, version, `hrx.payroll.statement.${next}`, "PayrollStatement", statementId);
  }

  function getStatement(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_statements",
      where: { tenant_id: context.tenant_id, statement_id: requiredString(input, "statement_id") },
    }));
  }

  function listStatements(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["run_id", "employee_id", "state"]) if (input[field]) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_statements", where })
      .sort((left, right) => right.generated_at.localeCompare(left.generated_at))
      .map(clone));
  }

  function createDeliveryReceipt(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      delivery_receipt_id: input.delivery_receipt_id ?? idFactory("payroll_delivery"),
      statement_id: requiredString(input, "statement_id"),
      channel: requiredString(input, "channel"),
      provider_id: null,
      provider_receipt_id: null,
      provider_receipt_ref: null,
      receipt_hash: null,
      state: "queued",
      provider_result_state: "queued",
      safe_error_code: null,
      attempt_count: 0,
      attempt_started_at: null,
      last_attempt_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
      delivered_at: null,
      viewed_at: null,
      failed_at: null,
    };
    return auditedInsert(context, "hrx_payroll_delivery_receipts", row, "hrx.payroll.delivery.queue", "PayrollDeliveryReceipt", row.delivery_receipt_id);
  }

  function transitionDeliveryReceipt(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const receiptId = requiredString(input, "delivery_receipt_id");
    const next = requiredString(input, "state");
    const current = requireRow(store, "hrx_payroll_delivery_receipts", { tenant_id: context.tenant_id, delivery_receipt_id: receiptId }, "Payroll delivery receipt");
    assertTransition(current.state, next, DELIVERY_TRANSITIONS, "Payroll delivery");
    const version = expectedVersion(input);
    const now = clock();
    const providerStatusPoll = input.provider_status_poll === true;
    if (providerStatusPoll && current.attempt_count < 1) {
      throw guardedError("Payroll provider status requires a prior delivery attempt", "HRX_PAYROLL_DELIVERY_STATE_INVALID", 409);
    }
    const nextAttemptCount = current.attempt_count + (providerStatusPoll ? 0 : 1);
    const attemptStartedAt = providerStatusPoll
      ? current.attempt_started_at
      : isoTimestamp({
          attempt_started_at: input.attempt_started_at ?? now,
        }, "attempt_started_at");
    const lastAttemptAt = providerStatusPoll ? current.last_attempt_at : now;
    const patch = { state: next, state_version: version + 1, updated_at: now };
    if (next === "queued") Object.assign(patch, {
      provider_result_state: "queued",
      safe_error_code: null,
      ...(input.attempt_started_at == null
        ? {}
        : { attempt_started_at: isoTimestamp(input, "attempt_started_at") }),
    });
    if (next === "delivered") Object.assign(patch, {
      provider_receipt_ref: requiredString(input, "provider_receipt_ref"),
      receipt_hash: requiredString(input, "receipt_hash"),
      provider_id: safeOpaqueId(input, "provider_id", 128),
      provider_receipt_id: optionalString(input.provider_receipt_id),
      provider_result_state: "delivered",
      safe_error_code: null,
      delivered_at: now,
      attempt_count: nextAttemptCount,
      attempt_started_at: attemptStartedAt,
      last_attempt_at: lastAttemptAt,
    });
    if (next === "viewed") Object.assign(patch, {
      provider_result_state: "read",
      viewed_at: now,
    });
    if (next === "failed") Object.assign(patch, {
      provider_result_state: "failed",
      safe_error_code: requiredString({ safe_error_code: input.safe_error_code ?? "DELIVERY_FAILED" }, "safe_error_code"),
      failed_at: now,
      attempt_count: nextAttemptCount,
      attempt_started_at: attemptStartedAt,
      last_attempt_at: lastAttemptAt,
    });
    if (next === "failed" && input.provider_id != null) {
      patch.provider_id = safeOpaqueId(input, "provider_id", 128);
      patch.provider_receipt_id = optionalString(input.provider_receipt_id);
    }
    return auditedUpdate(context, "hrx_payroll_delivery_receipts", { tenant_id: context.tenant_id, delivery_receipt_id: receiptId }, patch, version, `hrx.payroll.delivery.${next}`, "PayrollDeliveryReceipt", receiptId);
  }

  function recordDeliveryProviderResult(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const receiptId = requiredString(input, "delivery_receipt_id");
    const providerResultState = requiredString(input, "provider_result_state");
    if (!["queued", "sent", "unknown"].includes(providerResultState)) {
      throw new TypeError("provider_result_state must be queued, sent, or unknown");
    }
    const current = requireRow(store, "hrx_payroll_delivery_receipts", {
      tenant_id: context.tenant_id,
      delivery_receipt_id: receiptId,
    }, "Payroll delivery receipt");
    if (current.state !== "queued") {
      throw guardedError("Queued payroll delivery is required", "HRX_PAYROLL_DELIVERY_STATE_INVALID", 409);
    }
    const version = expectedVersion(input);
    const now = clock();
    const providerStatusPoll = input.provider_status_poll === true;
    if (providerStatusPoll && current.attempt_count < 1) {
      throw guardedError("Payroll provider status requires a prior delivery attempt", "HRX_PAYROLL_DELIVERY_STATE_INVALID", 409);
    }
    const patch = {
      provider_result_state: providerResultState,
      safe_error_code: optionalString(input.safe_error_code),
      attempt_count: current.attempt_count + (providerStatusPoll ? 0 : 1),
      attempt_started_at: providerStatusPoll
        ? current.attempt_started_at
        : isoTimestamp({
            attempt_started_at: input.attempt_started_at ?? now,
          }, "attempt_started_at"),
      last_attempt_at: providerStatusPoll ? current.last_attempt_at : now,
      state_version: version + 1,
      updated_at: now,
    };
    if (input.provider_id != null) {
      patch.provider_id = safeOpaqueId(input, "provider_id", 128);
      patch.provider_receipt_id = optionalString(input.provider_receipt_id);
    }
    if (providerResultState === "sent") {
      patch.provider_receipt_ref = requiredString(input, "provider_receipt_ref");
      patch.receipt_hash = requiredString(input, "receipt_hash");
    } else if (input.receipt_hash != null) {
      patch.receipt_hash = requiredString(input, "receipt_hash");
    }
    return auditedUpdate(
      context,
      "hrx_payroll_delivery_receipts",
      { tenant_id: context.tenant_id, delivery_receipt_id: receiptId },
      patch,
      version,
      "hrx.payroll.delivery.provider_result",
      "PayrollDeliveryReceipt",
      receiptId,
    );
  }

  function getDeliveryReceipt(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_delivery_receipts",
      where: { tenant_id: context.tenant_id, delivery_receipt_id: requiredString(input, "delivery_receipt_id") },
    }));
  }

  function listDeliveryReceipts(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["statement_id", "channel", "state"]) if (input[field]) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_delivery_receipts", where })
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map(clone));
  }

  function applyDeliveryProviderEvent(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const providerEventId = safeOpaqueId(input, "provider_event_id");
    const providerId = safeOpaqueId(input, "provider_id", 128);
    const providerReceiptRef = requiredString(input, "provider_receipt_ref");
    const providerEventState = requiredString(input, "provider_event_state").toLowerCase();
    if (!DELIVERY_PROVIDER_EVENT_STATES.has(providerEventState)) {
      throw guardedError("Payroll provider event state is unsupported", "HRX_PAYROLL_PROVIDER_EVENT_STATE_UNKNOWN", 400);
    }
    const targetResultState = providerEventState === "accepted" ? "sent" : providerEventState;
    const payloadHash = sha256Value(input, "payload_hash");
    const eventOccurredAt = isoTimestamp(input, "event_occurred_at");

    return store.transaction((tx) => {
      const existing = tx.query("selectOne", {
        table: "hrx_payroll_statement_provider_events",
        where: { tenant_id: context.tenant_id, provider_event_id: providerEventId },
      });
      if (existing) {
        const sameEvent = existing.provider_id === providerId
          && existing.provider_receipt_ref === providerReceiptRef
          && existing.provider_event_state === providerEventState
          && existing.payload_hash === payloadHash
          && existing.event_occurred_at === eventOccurredAt;
        if (!sameEvent) {
          throw guardedError("Payroll provider event id was reused with different content", "HRX_PAYROLL_PROVIDER_EVENT_CONFLICT", 409);
        }
        const replayReceipt = requireRow(tx, "hrx_payroll_delivery_receipts", {
          tenant_id: context.tenant_id,
          delivery_receipt_id: existing.delivery_receipt_id,
        }, "Payroll delivery receipt");
        const replayStatement = requireRow(tx, "hrx_payroll_statements", {
          tenant_id: context.tenant_id,
          statement_id: existing.statement_id,
        }, "Payroll statement");
        return Object.freeze({
          event: Object.freeze(clone(existing)),
          receipt: Object.freeze(clone(replayReceipt)),
          statement: Object.freeze(clone(replayStatement)),
          replayed: true,
        });
      }

      let receipt = requireRow(tx, "hrx_payroll_delivery_receipts", {
        tenant_id: context.tenant_id,
        provider_receipt_ref: providerReceiptRef,
      }, "Payroll delivery receipt");
      let statement = requireRow(tx, "hrx_payroll_statements", {
        tenant_id: context.tenant_id,
        statement_id: receipt.statement_id,
      }, "Payroll statement");
      if (receipt.provider_id !== providerId) {
        throw guardedError("Payroll provider identity does not match the delivery receipt", "HRX_PAYROLL_PROVIDER_ID_MISMATCH", 403);
      }
      if (receipt.state === "revoked" || statement.state === "revoked") {
        throw guardedError("Revoked payroll delivery cannot accept provider events", "HRX_PAYROLL_DELIVERY_REVOKED", 409);
      }
      const receivedAt = clock();
      if (Date.parse(eventOccurredAt) > Date.parse(receivedAt) + DELIVERY_PROVIDER_EVENT_MAX_FUTURE_SKEW_MS) {
        throw guardedError("Payroll provider event timestamp is too far in the future", "HRX_PAYROLL_PROVIDER_EVENT_TIME_INVALID", 409);
      }
      const currentResultState = receipt.provider_result_state ?? "queued";
      const failureEvent = providerEventState === "failed";
      const currentRank = DELIVERY_PROVIDER_RESULT_RANK[currentResultState];
      const targetRank = DELIVERY_PROVIDER_RESULT_RANK[targetResultState];
      if (failureEvent) {
        if (currentResultState !== "sent" || receipt.state !== "queued") {
          throw guardedError("Payroll provider failure event is out of order", "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER", 409);
        }
      } else {
        if (!Number.isInteger(currentRank)) {
          throw guardedError("Payroll delivery provider state cannot accept callbacks", "HRX_PAYROLL_DELIVERY_STATE_INVALID", 409);
        }
        if (targetRank < currentRank || targetRank > currentRank + 1) {
          throw guardedError("Payroll provider event is out of order", "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER", 409);
        }
      }
      const attemptStartedAt = receipt.attempt_started_at ?? receipt.last_attempt_at;
      if (attemptStartedAt && Date.parse(eventOccurredAt) < Date.parse(attemptStartedAt)) {
        throw guardedError("Payroll provider event predates the delivery attempt", "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER", 409);
      }
      const latestEvent = tx.query("select", {
        table: "hrx_payroll_statement_provider_events",
        where: {
          tenant_id: context.tenant_id,
          delivery_receipt_id: receipt.delivery_receipt_id,
        },
      }).sort((left, right) => right.event_occurred_at.localeCompare(left.event_occurred_at))[0];
      if (latestEvent && Date.parse(eventOccurredAt) < Date.parse(latestEvent.event_occurred_at)) {
        throw guardedError("Payroll provider event timestamp is out of order", "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER", 409);
      }

      if (failureEvent || targetRank > currentRank) {
        const receiptPatch = failureEvent
          ? {
              state: "failed",
              provider_result_state: "failed",
              safe_error_code: DELIVERY_PROVIDER_REPORTED_FAILED,
              failed_at: eventOccurredAt,
              state_version: receipt.state_version + 1,
              updated_at: receivedAt,
            }
          : {
              provider_result_state: targetResultState,
              safe_error_code: null,
              state_version: receipt.state_version + 1,
              updated_at: receivedAt,
            };
        if (!failureEvent && targetResultState === "delivered") Object.assign(receiptPatch, {
          state: "delivered",
          delivered_at: eventOccurredAt,
        });
        if (!failureEvent && targetResultState === "read") Object.assign(receiptPatch, {
          state: "viewed",
          viewed_at: eventOccurredAt,
        });
        receipt = tx.query("updateOne", {
          table: "hrx_payroll_delivery_receipts",
          where: { tenant_id: context.tenant_id, delivery_receipt_id: receipt.delivery_receipt_id },
          expected_version: receipt.state_version,
          patch: receiptPatch,
        });
        if (!receipt) throw guardedError("Payroll delivery receipt not found", "HRX_PAYROLL_NOT_FOUND", 404);

        if (!failureEvent && targetResultState === "delivered" && statement.state === "generated") {
          statement = tx.query("updateOne", {
            table: "hrx_payroll_statements",
            where: { tenant_id: context.tenant_id, statement_id: statement.statement_id },
            expected_version: statement.state_version,
            patch: {
              state: "delivered",
              delivered_at: eventOccurredAt,
              state_version: statement.state_version + 1,
            },
          });
        }
        if (!failureEvent && targetResultState === "read" && statement.state === "delivered") {
          statement = tx.query("updateOne", {
            table: "hrx_payroll_statements",
            where: { tenant_id: context.tenant_id, statement_id: statement.statement_id },
            expected_version: statement.state_version,
            patch: {
              state: "viewed",
              viewed_at: eventOccurredAt,
              state_version: statement.state_version + 1,
            },
          });
        }
      }

      const event = tx.query("insert", {
        table: "hrx_payroll_statement_provider_events",
        row: {
          tenant_id: context.tenant_id,
          provider_event_id: providerEventId,
          delivery_receipt_id: receipt.delivery_receipt_id,
          statement_id: statement.statement_id,
          provider_id: providerId,
          provider_receipt_ref: providerReceiptRef,
          provider_event_state: providerEventState,
          payload_hash: payloadHash,
          event_occurred_at: eventOccurredAt,
          received_at: receivedAt,
        },
      });
      appendAudit(
        tx,
        context,
        `hrx.payroll.delivery.provider_event.${providerEventState}`,
        "PayrollDeliveryReceipt",
        receipt.delivery_receipt_id,
        {
          provider_id: providerId,
          provider_event_id: providerEventId,
          provider_event_state: providerEventState,
          provider_receipt_ref: providerReceiptRef,
          payload_hash: payloadHash,
          raw_payload_included: false,
        },
      );
      return Object.freeze({
        event: Object.freeze(clone(event)),
        receipt: Object.freeze(clone(receipt)),
        statement: Object.freeze(clone(statement)),
        replayed: false,
      });
    });
  }

  function listDeliveryProviderEvents(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["delivery_receipt_id", "statement_id", "provider_id", "provider_receipt_ref"]) {
      if (input[field]) where[field] = input[field];
    }
    return Object.freeze(store.query("select", {
      table: "hrx_payroll_statement_provider_events",
      where,
    }).sort((left, right) => left.received_at.localeCompare(right.received_at)).map(clone));
  }

  function providerOperationScope(input = {}) {
    const providerKind = requiredString(input, "provider_kind");
    if (!PROVIDER_OPERATION_KINDS.has(providerKind)) throw new TypeError("provider_kind is unsupported");
    return Object.freeze({
      provider_kind: providerKind,
      operation: requiredString(input, "operation"),
      idempotency_key: requiredString(input, "idempotency_key"),
      request_hash: requiredSha256(input, "request_hash"),
    });
  }

  function beginProviderOperation(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const scope = providerOperationScope(input);
    const requestedMaximum = requiredInteger({
      maximum_attempts: input.maximum_attempts ?? 3,
    }, "maximum_attempts", { nonNegative: true });
    if (requestedMaximum < 1) throw new TypeError("maximum_attempts must be a positive integer");
    const now = clock();
    return store.transaction((tx) => {
      const current = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: scope.provider_kind,
          idempotency_key: scope.idempotency_key,
        },
      });
      if (current) {
        if (current.operation !== scope.operation || current.request_hash !== scope.request_hash) {
          throw guardedError("Provider idempotency key is bound to another request", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
        }
        if (current.state === "unknown"
          && current.provider_kind === "bank"
          && current.operation === "bulk_transfer_reconcile"
          && current.safe_error_code === HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED) {
          return Object.freeze({
            operation: Object.freeze(clone(current)),
            should_execute: false,
            idempotent_replay: true,
            retrying: false,
          });
        }
        if (["in_progress", "pending", "succeeded"].includes(current.state)) {
          return Object.freeze({
            operation: Object.freeze(clone(current)),
            should_execute: false,
            idempotent_replay: true,
            retrying: false,
          });
        }
        const maximumAttempts = Math.min(Number(current.maximum_attempts), requestedMaximum);
        if (!["failed", "unknown"].includes(current.state) || current.attempt_count >= maximumAttempts) {
          throw guardedError("Provider retry limit exceeded", "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED", 409);
        }
        const patch = {
          state: "in_progress",
          attempt_count: current.attempt_count + 1,
          maximum_attempts: maximumAttempts,
          provider_receipt_id: null,
          provider_receipt_ref: null,
          safe_error_code: null,
          result_payload_json: null,
          result_payload_hash: null,
          provider_response_hash: null,
          state_version: current.state_version + 1,
          updated_at: now,
          last_attempt_at: now,
          completed_at: null,
        };
        const updated = tx.query("updateOne", {
          table: "hrx_payroll_provider_operations",
          where: {
            tenant_id: context.tenant_id,
            provider_operation_id: current.provider_operation_id,
          },
          expected_version: current.state_version,
          patch,
        });
        appendAudit(
          tx,
          context,
          "hrx.payroll.provider_operation.retry",
          "PayrollProviderOperation",
          current.provider_operation_id,
          {
            provider_kind: scope.provider_kind,
            operation: scope.operation,
            attempt_count: updated.attempt_count,
          },
        );
        return Object.freeze({
          operation: Object.freeze(clone(updated)),
          should_execute: true,
          idempotent_replay: false,
          retrying: true,
        });
      }
      const row = {
        tenant_id: context.tenant_id,
        provider_operation_id: input.provider_operation_id ?? idFactory("payroll_provider_operation"),
        ...scope,
        state: "in_progress",
        attempt_count: 1,
        maximum_attempts: requestedMaximum,
        provider_receipt_id: null,
        provider_receipt_ref: null,
        safe_error_code: null,
        result_payload_json: null,
        result_payload_hash: null,
        provider_response_hash: null,
        state_version: 1,
        created_by_actor_id: context.actor_id,
        created_at: now,
        updated_at: now,
        last_attempt_at: now,
        completed_at: null,
      };
      const inserted = tx.query("insert", {
        table: "hrx_payroll_provider_operations",
        row,
      });
      appendAudit(
        tx,
        context,
        "hrx.payroll.provider_operation.begin",
        "PayrollProviderOperation",
        row.provider_operation_id,
        {
          provider_kind: scope.provider_kind,
          operation: scope.operation,
          attempt_count: 1,
        },
      );
      return Object.freeze({
        operation: Object.freeze(clone(inserted)),
        should_execute: true,
        idempotent_replay: false,
        retrying: false,
      });
    });
  }

  function expirePaymentReconciliationClaim(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const idempotencyKey = requiredString(input, "idempotency_key");
    const requestHash = requiredSha256(input, "request_hash");
    const leaseDurationMs = requiredInteger({
      lease_duration_ms: input.lease_duration_ms,
    }, "lease_duration_ms", { nonNegative: true });
    if (leaseDurationMs < 1) throw new TypeError("lease_duration_ms must be a positive integer");
    const now = clock();
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new TypeError("payroll repository clock must return an ISO timestamp");
    return store.transaction((tx) => {
      const current = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: "bank",
          idempotency_key: idempotencyKey,
        },
      });
      if (!current) throw guardedError("Payroll provider operation not found", "HRX_PAYROLL_NOT_FOUND", 404);
      if (current.operation !== "bulk_transfer_reconcile" || current.request_hash !== requestHash) {
        throw guardedError("Provider idempotency key is bound to another request", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      if (current.state !== "in_progress") {
        return Object.freeze({
          operation: Object.freeze(clone(current)),
          expired: false,
          idempotent_replay: true,
        });
      }
      const lastAttemptMs = Date.parse(current.last_attempt_at);
      if (!Number.isFinite(lastAttemptMs)) {
        throw guardedError("Provider operation lease timestamp is invalid", "HRX_PROVIDER_OPERATION_STATE_INVALID", 409);
      }
      if (nowMs < lastAttemptMs + leaseDurationMs) {
        return Object.freeze({
          operation: Object.freeze(clone(current)),
          expired: false,
          idempotent_replay: true,
        });
      }
      const updated = tx.query("updateOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_operation_id: current.provider_operation_id,
        },
        expected_version: current.state_version,
        patch: {
          state: "unknown",
          safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
          state_version: current.state_version + 1,
          updated_at: now,
          completed_at: now,
        },
      });
      appendAudit(
        tx,
        context,
        "hrx.payroll.provider_operation.unknown_reconciliation_required",
        "PayrollProviderOperation",
        current.provider_operation_id,
        {
          provider_kind: current.provider_kind,
          operation: current.operation,
          attempt_count: current.attempt_count,
          idempotency_key: current.idempotency_key,
          request_hash: current.request_hash,
        },
      );
      return Object.freeze({
        operation: Object.freeze(clone(updated)),
        expired: true,
        idempotent_replay: false,
      });
    });
  }

  function beginFilingSubmissionAttempt(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const filingJobId = requiredString(input, "filing_job_id");
    const scope = providerOperationScope(input);
    if (scope.provider_kind !== "filing") throw new TypeError("filing submission requires provider_kind filing");
    const requestedMaximum = requiredInteger({
      maximum_attempts: input.maximum_attempts ?? 3,
    }, "maximum_attempts", { nonNegative: true });
    if (requestedMaximum < 1) throw new TypeError("maximum_attempts must be a positive integer");
    const leaseDurationMs = requiredInteger({
      lease_duration_ms: input.lease_duration_ms ?? 15 * 60 * 1000,
    }, "lease_duration_ms", { nonNegative: true });
    if (leaseDurationMs < 1) throw new TypeError("lease_duration_ms must be a positive integer");
    const now = clock();
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new TypeError("payroll repository clock must return an ISO timestamp");

    return store.transaction((tx) => {
      let job = requireRow(tx, "hrx_payroll_filing_jobs", {
        tenant_id: context.tenant_id,
        filing_job_id: filingJobId,
      }, "Payroll filing job");
      if (job.package_hash !== scope.request_hash
        || scope.operation !== `filing.${job.filing_kind}`
        || scope.idempotency_key !== `${job.filing_job_id}:${job.package_hash}`) {
        throw guardedError("Filing provider request does not match the immutable package", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }

      let operation = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: "filing",
          idempotency_key: scope.idempotency_key,
        },
      });
      if (operation) {
        if (operation.operation !== scope.operation || operation.request_hash !== scope.request_hash) {
          throw guardedError("Provider idempotency key is bound to another request", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
        }
        if (["pending", "succeeded"].includes(operation.state)) {
          return Object.freeze({
            operation: Object.freeze(clone(operation)),
            job: Object.freeze(clone(job)),
            should_execute: false,
            idempotent_replay: true,
            recovered: false,
          });
        }
        if (operation.state === "in_progress") {
          const leaseStartedAt = Date.parse(operation.last_attempt_at);
          const leaseActive = Number.isFinite(leaseStartedAt) && nowMs < leaseStartedAt + leaseDurationMs;
          if (leaseActive) {
            return Object.freeze({
              operation: Object.freeze(clone(operation)),
              job: Object.freeze(clone(job)),
              should_execute: false,
              idempotent_replay: true,
              recovered: false,
            });
          }
          if (job.state !== "submitted"
            || job.provider_submission_key !== scope.idempotency_key
            || Number(job.attempt_count) !== Number(operation.attempt_count)) {
            throw guardedError("Filing submission attempt state is inconsistent", "HRX_PAYROLL_FILING_ATTEMPT_STATE_INVALID", 409);
          }
          operation = tx.query("updateOne", {
            table: "hrx_payroll_provider_operations",
            where: {
              tenant_id: context.tenant_id,
              provider_operation_id: operation.provider_operation_id,
            },
            expected_version: operation.state_version,
            patch: {
              state_version: operation.state_version + 1,
              updated_at: now,
              last_attempt_at: now,
            },
          });
          appendAudit(tx, context, "hrx.payroll.provider_operation.resume", "PayrollProviderOperation", operation.provider_operation_id, {
            provider_kind: "filing",
            operation: scope.operation,
            attempt_count: operation.attempt_count,
          });
          return Object.freeze({
            operation: Object.freeze(clone(operation)),
            job: Object.freeze(clone(job)),
            should_execute: true,
            idempotent_replay: false,
            recovered: true,
          });
        }
        const maximumAttempts = Math.min(Number(operation.maximum_attempts), requestedMaximum);
        if (operation.state !== "unknown" || operation.attempt_count >= maximumAttempts) {
          throw guardedError("Provider retry limit exceeded", "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED", 409);
        }
        if (job.state !== "submitted" || job.provider_submission_key !== scope.idempotency_key) {
          throw guardedError("Submitted payroll filing is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
        }
        const nextAttemptCount = Number(operation.attempt_count) + 1;
        if (Number(job.attempt_count) + 1 !== nextAttemptCount) {
          throw guardedError("Filing provider attempt counter is out of sync", "HRX_PROVIDER_ATTEMPT_COUNT_MISMATCH", 409);
        }
        operation = tx.query("updateOne", {
          table: "hrx_payroll_provider_operations",
          where: {
            tenant_id: context.tenant_id,
            provider_operation_id: operation.provider_operation_id,
          },
          expected_version: operation.state_version,
          patch: {
            state: "in_progress",
            attempt_count: nextAttemptCount,
            maximum_attempts: maximumAttempts,
            provider_receipt_id: null,
            provider_receipt_ref: null,
            safe_error_code: null,
            state_version: operation.state_version + 1,
            updated_at: now,
            last_attempt_at: now,
            completed_at: null,
          },
        });
        job = tx.query("updateOne", {
          table: "hrx_payroll_filing_jobs",
          where: { tenant_id: context.tenant_id, filing_job_id: filingJobId },
          expected_version: job.state_version,
          patch: {
            provider_result_state: "queued",
            safe_error_code: null,
            attempt_count: nextAttemptCount,
            last_attempt_at: now,
            state_version: job.state_version + 1,
            updated_at: now,
          },
        });
        appendAudit(tx, context, "hrx.payroll.provider_operation.retry", "PayrollProviderOperation", operation.provider_operation_id, {
          provider_kind: "filing",
          operation: scope.operation,
          attempt_count: nextAttemptCount,
        });
        appendAudit(tx, context, "hrx.payroll.filing.provider_attempt", "PayrollFilingJob", filingJobId, {
          attempt_count: nextAttemptCount,
          provider_submission_key: scope.idempotency_key,
        });
        return Object.freeze({
          operation: Object.freeze(clone(operation)),
          job: Object.freeze(clone(job)),
          should_execute: true,
          idempotent_replay: false,
          recovered: false,
        });
      }

      if (job.state !== "validated") {
        throw guardedError("Validated payroll filing is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
      }
      operation = tx.query("insert", {
        table: "hrx_payroll_provider_operations",
        row: {
          tenant_id: context.tenant_id,
          provider_operation_id: input.provider_operation_id ?? idFactory("payroll_provider_operation"),
          ...scope,
          state: "in_progress",
          attempt_count: 1,
          maximum_attempts: requestedMaximum,
          provider_receipt_id: null,
          provider_receipt_ref: null,
          safe_error_code: null,
          state_version: 1,
          created_by_actor_id: context.actor_id,
          created_at: now,
          updated_at: now,
          last_attempt_at: now,
          completed_at: null,
        },
      });
      faultInjector("filing_submission.after_operation_begin", Object.freeze({
        filing_job_id: filingJobId,
        provider_operation_id: operation.provider_operation_id,
      }));
      job = tx.query("updateOne", {
        table: "hrx_payroll_filing_jobs",
        where: { tenant_id: context.tenant_id, filing_job_id: filingJobId },
        expected_version: job.state_version,
        patch: {
          state: "submitted",
          submitted_at: now,
          provider_result_state: "queued",
          safe_error_code: null,
          attempt_count: 1,
          provider_submission_key: scope.idempotency_key,
          last_attempt_at: now,
          state_version: job.state_version + 1,
          updated_at: now,
        },
      });
      appendAudit(tx, context, "hrx.payroll.provider_operation.begin", "PayrollProviderOperation", operation.provider_operation_id, {
        provider_kind: "filing",
        operation: scope.operation,
        attempt_count: 1,
      });
      appendAudit(tx, context, "hrx.payroll.filing.submitted", "PayrollFilingJob", filingJobId, {
        provider_submission_key: scope.idempotency_key,
        attempt_count: 1,
      });
      appendOutbox(tx, context, {
        run_id: job.run_id,
        event_type: "payroll.filing.submitted",
        idempotency_key: `${filingJobId}:submitted:${job.state_version}`,
        payload: { filing_job_id: filingJobId, filing_kind: job.filing_kind, state: "submitted" },
      });
      return Object.freeze({
        operation: Object.freeze(clone(operation)),
        job: Object.freeze(clone(job)),
        should_execute: true,
        idempotent_replay: false,
        recovered: false,
      });
    });
  }

  function completeProviderOperation(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const providerKind = requiredString(input, "provider_kind");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const next = requiredString(input, "state");
    if (!["pending", "succeeded", "failed", "unknown"].includes(next)) throw new TypeError("provider operation result state is unsupported");
    const version = expectedVersion(input);
    const providerReceiptId = optionalString(input.provider_receipt_id);
    const providerReceiptRef = optionalString(input.provider_receipt_ref);
    const safeErrorCode = optionalString(input.safe_error_code);
    if (["pending", "succeeded", "failed"].includes(next) && !providerReceiptId) throw new TypeError(`${next} provider operation requires provider_receipt_id`);
    if (next === "succeeded" && !providerReceiptRef) throw new TypeError("succeeded provider operation requires provider_receipt_ref");
    if (next !== "succeeded" && providerReceiptRef) throw new TypeError("only succeeded provider operation may store provider_receipt_ref");
    if (["failed", "unknown"].includes(next) && !safeErrorCode) throw new TypeError(`${next} provider operation requires safe_error_code`);
    if (!["failed", "unknown"].includes(next) && safeErrorCode) throw new TypeError(`${next} provider operation must not store safe_error_code`);
    return store.transaction((tx) => {
      const current = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: providerKind,
          idempotency_key: idempotencyKey,
        },
      });
      if (!current) throw guardedError("Payroll provider operation not found", "HRX_PAYROLL_NOT_FOUND", 404);
      if (PROVIDER_OPERATION_TERMINAL_STATES.has(current.state)) {
        const sameResult = current.state === next
          && current.provider_receipt_id === providerReceiptId
          && current.provider_receipt_ref === providerReceiptRef
          && current.safe_error_code === safeErrorCode;
        if (!sameResult) throw guardedError("Provider operation is already complete", "HRX_PROVIDER_OPERATION_COMPLETE", 409);
        return Object.freeze({ operation: Object.freeze(clone(current)), idempotent_replay: true });
      }
      if (!["in_progress", "pending"].includes(current.state)) throw guardedError("Provider operation state is invalid", "HRX_PROVIDER_OPERATION_STATE_INVALID", 409);
      if (version !== current.state_version) throw guardedError("Provider operation version is stale", "HRX_STATE_VERSION_CONFLICT", 409);
      for (const [field, value] of [["provider_receipt_id", providerReceiptId], ["provider_receipt_ref", providerReceiptRef]]) {
        if (!value) continue;
        const duplicate = tx.query("select", {
          table: "hrx_payroll_provider_operations",
          where: {
            tenant_id: context.tenant_id,
            provider_kind: providerKind,
            [field]: value,
          },
        }).find((row) => row.provider_operation_id !== current.provider_operation_id);
        if (duplicate) throw guardedError("Provider receipt is already bound to another operation", "HRX_PROVIDER_RECEIPT_DUPLICATE", 409);
      }
      const now = clock();
      const patch = {
        state: next,
        provider_receipt_id: providerReceiptId,
        provider_receipt_ref: providerReceiptRef,
        safe_error_code: safeErrorCode,
        state_version: current.state_version + 1,
        updated_at: now,
        completed_at: next === "pending" ? null : now,
      };
      const updated = tx.query("updateOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_operation_id: current.provider_operation_id,
        },
        expected_version: current.state_version,
        patch,
      });
      appendAudit(
        tx,
        context,
        `hrx.payroll.provider_operation.${next}`,
        "PayrollProviderOperation",
        current.provider_operation_id,
        {
          provider_kind: current.provider_kind,
          operation: current.operation,
          attempt_count: current.attempt_count,
        },
      );
      return Object.freeze({ operation: Object.freeze(clone(updated)), idempotent_replay: false });
    });
  }

  function stagePaymentReconciliationResult(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const providerKind = requiredString(input, "provider_kind");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const requestHash = requiredSha256(input, "request_hash");
    const providerResponseHash = requiredSha256(input, "provider_response_hash");
    const resultPayloadHash = requiredSha256(input, "result_payload_hash");
    const providerReceiptId = requiredString(input, "provider_receipt_id");
    const version = expectedVersion(input);
    const payload = clone(input.result_payload);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("result_payload must be an object");
    if (payload.schema_version !== HRX_PAYMENT_RECONCILIATION_RESULT_SCHEMA_VERSION) {
      throw new TypeError("payment reconciliation result schema is unsupported");
    }
    if (digest(payload) !== resultPayloadHash) {
      throw guardedError("Payment reconciliation result hash does not match its payload", "HRX_PAYROLL_PAYMENT_RESULT_HASH_MISMATCH", 409);
    }
    const resultPayloadJson = JSON.stringify(stable(payload));
    return store.transaction((tx) => {
      const current = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: providerKind,
          idempotency_key: idempotencyKey,
        },
      });
      if (!current) throw guardedError("Payroll provider operation not found", "HRX_PAYROLL_NOT_FOUND", 404);
      if (providerKind !== "bank" || current.operation !== "bulk_transfer_reconcile" || current.request_hash !== requestHash) {
        throw guardedError("Provider idempotency key is bound to another request", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      const sameResult = current.provider_receipt_id === providerReceiptId
        && current.result_payload_hash === resultPayloadHash
        && current.provider_response_hash === providerResponseHash;
      if (current.state === "succeeded" || current.state === "pending") {
        if (!sameResult) throw guardedError("Provider result conflicts with the staged reconciliation", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
        return Object.freeze({ operation: Object.freeze(clone(current)), idempotent_replay: true });
      }
      const recoverableUnknown = current.state === "unknown"
        && current.safe_error_code === HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED;
      if (current.state !== "in_progress" && !recoverableUnknown) {
        throw guardedError("Provider operation state is invalid", "HRX_PROVIDER_OPERATION_STATE_INVALID", 409);
      }
      if (version !== current.state_version) throw guardedError("Provider operation version is stale", "HRX_STATE_VERSION_CONFLICT", 409);
      const duplicate = tx.query("select", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: providerKind,
          provider_receipt_id: providerReceiptId,
        },
      }).find((row) => row.provider_operation_id !== current.provider_operation_id);
      if (duplicate) throw guardedError("Provider receipt is already bound to another operation", "HRX_PROVIDER_RECEIPT_DUPLICATE", 409);
      const now = clock();
      const updated = tx.query("updateOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_operation_id: current.provider_operation_id,
        },
        expected_version: current.state_version,
        patch: {
          state: "pending",
          provider_receipt_id: providerReceiptId,
          provider_receipt_ref: null,
          safe_error_code: null,
          result_payload_json: resultPayloadJson,
          result_payload_hash: resultPayloadHash,
          provider_response_hash: providerResponseHash,
          state_version: current.state_version + 1,
          updated_at: now,
          completed_at: null,
        },
      });
      appendAudit(
        tx,
        context,
        "hrx.payroll.provider_operation.pending",
        "PayrollProviderOperation",
        current.provider_operation_id,
        {
          provider_kind: current.provider_kind,
          operation: current.operation,
          attempt_count: current.attempt_count,
          result_payload_hash: resultPayloadHash,
          provider_response_hash: providerResponseHash,
        },
      );
      return Object.freeze({ operation: Object.freeze(clone(updated)), idempotent_replay: false });
    });
  }

  function settlePaymentReconciliation(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const idempotencyKey = requiredString(input, "idempotency_key");
    const requestHash = requiredSha256(input, "request_hash");
    const expectedProviderResponseHash = input.provider_response_hash == null
      ? null
      : requiredSha256(input, "provider_response_hash");
    return store.transaction((tx) => {
      const operation = tx.query("selectOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: "bank",
          idempotency_key: idempotencyKey,
        },
      });
      if (!operation) throw guardedError("Payroll provider operation not found", "HRX_PAYROLL_NOT_FOUND", 404);
      if (operation.operation !== "bulk_transfer_reconcile" || operation.request_hash !== requestHash) {
        throw guardedError("Provider idempotency key is bound to another request", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      if (expectedProviderResponseHash && operation.provider_response_hash !== expectedProviderResponseHash) {
        throw guardedError("Provider result conflicts with the staged reconciliation", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      let payload;
      try {
        payload = JSON.parse(requiredString(operation, "result_payload_json"));
      } catch {
        throw guardedError("Staged payment reconciliation result is invalid", "HRX_PAYROLL_PAYMENT_RESULT_HASH_MISMATCH", 409);
      }
      if (payload.schema_version !== HRX_PAYMENT_RECONCILIATION_RESULT_SCHEMA_VERSION
        || digest(payload) !== requiredSha256(operation, "result_payload_hash")) {
        throw guardedError("Staged payment reconciliation result is invalid", "HRX_PAYROLL_PAYMENT_RESULT_HASH_MISMATCH", 409);
      }
      if (payload.idempotency_key !== idempotencyKey || payload.request_hash !== requestHash) {
        throw guardedError("Staged payment reconciliation scope is invalid", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      const batchId = requiredString(payload, "payment_batch_id");
      const readBundle = () => {
        const batch = tx.query("selectOne", {
          table: "hrx_payroll_payment_batches",
          where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
        });
        if (!batch) throw guardedError("Payroll payment batch not found", "HRX_PAYROLL_NOT_FOUND", 404);
        return Object.freeze({
          batch: Object.freeze(clone(batch)),
          items: Object.freeze(tx.query("select", {
            table: "hrx_payroll_payment_items",
            where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
          }).sort((left, right) => left.employee_id.localeCompare(right.employee_id)).map((row) => Object.freeze(clone(row)))),
        });
      };
      if (operation.state === "succeeded") {
        return Object.freeze({
          ...readBundle(),
          operation: Object.freeze(clone(operation)),
          idempotent_replay: true,
        });
      }
      if (operation.state !== "pending") {
        throw guardedError("Provider operation is not ready to settle", "HRX_PROVIDER_OPERATION_IN_PROGRESS", 409);
      }
      const mode = requiredString(payload, "mode");
      if (!["initial", "retry"].includes(mode)) throw new TypeError("payment reconciliation mode is unsupported");
      const batch = tx.query("selectOne", {
        table: "hrx_payroll_payment_batches",
        where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
      });
      if (!batch) throw guardedError("Payroll payment batch not found", "HRX_PAYROLL_NOT_FOUND", 404);
      const expectedBatchState = mode === "initial" ? "exported" : "reconciled";
      if (batch.state !== expectedBatchState || batch.state_version !== payload.expected_batch_version) {
        throw guardedError("Payroll payment batch changed before reconciliation", "HRX_STATE_VERSION_CONFLICT", 409);
      }
      const stagedItems = Array.isArray(payload.items) ? payload.items : [];
      if (stagedItems.length === 0) throw new TypeError("payment reconciliation items are required");
      const currentItems = tx.query("select", {
        table: "hrx_payroll_payment_items",
        where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
      });
      const expectedItems = mode === "initial"
        ? currentItems
        : currentItems.filter((item) => item.state === "failed");
      const stagedItemIds = new Set(stagedItems.map((item) => requiredString(item, "payment_item_id")));
      if (stagedItemIds.size !== stagedItems.length
        || expectedItems.length !== stagedItems.length
        || expectedItems.some((item) => !stagedItemIds.has(item.payment_item_id))) {
        throw guardedError("Payment reconciliation item scope changed", "HRX_PAYROLL_PAYMENT_RETRY_SCOPE_INVALID", 409);
      }
      const now = clock();
      stagedItems.forEach((staged, index) => {
        const itemId = requiredString(staged, "payment_item_id");
        const current = currentItems.find((item) => item.payment_item_id === itemId);
        if (!current || current.employee_id !== requiredString(staged, "employee_id")) {
          throw guardedError("Payment reconciliation item is outside the batch", "HRX_PAYROLL_PAYMENT_RETRY_SCOPE_INVALID", 409);
        }
        if (current.state !== (mode === "initial" ? "exported" : "failed")
          || current.state_version !== staged.expected_version) {
          throw guardedError("Payroll payment item changed before reconciliation", "HRX_STATE_VERSION_CONFLICT", 409);
        }
        const providerResultState = requiredString(staged, "provider_result_state");
        if (!["succeeded", "failed", "unknown"].includes(providerResultState)) {
          throw new TypeError("payment reconciliation provider_result_state is unsupported");
        }
        const nextState = providerResultState === "succeeded" ? "paid" : "failed";
        const patch = {
          state: nextState,
          provider_receipt_ref: nextState === "paid" ? requiredTokenizedRef(staged, "provider_receipt_ref") : null,
          provider_result_state: providerResultState,
          safe_error_code: providerResultState === "failed"
            ? requiredString(staged, "safe_error_code")
            : optionalString(staged.safe_error_code),
          attempt_count: Number(current.attempt_count ?? 0) + 1,
          last_attempt_at: now,
          state_version: current.state_version + 1,
          updated_at: now,
          paid_at: nextState === "paid" ? now : current.paid_at,
        };
        const updated = tx.query("updateOne", {
          table: "hrx_payroll_payment_items",
          where: { tenant_id: context.tenant_id, payment_item_id: itemId },
          expected_version: current.state_version,
          patch,
        });
        if (!updated) throw guardedError("Payroll payment item not found", "HRX_PAYROLL_NOT_FOUND", 404);
        appendAudit(
          tx,
          context,
          `hrx.payroll.payment_item.${nextState}`,
          "PayrollPaymentItem",
          itemId,
          { from_version: current.state_version, to_version: patch.state_version },
        );
        faultInjector("payment_reconciliation.after_item", Object.freeze({
          item_index: index,
          payment_item_id: itemId,
          payment_batch_id: batchId,
        }));
      });
      let updatedBatch = batch;
      if (mode === "initial") {
        const nextVersion = batch.state_version + 1;
        updatedBatch = tx.query("updateOne", {
          table: "hrx_payroll_payment_batches",
          where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
          expected_version: batch.state_version,
          patch: {
            state: "reconciled",
            provider_receipt_ref: requiredTokenizedRef(payload, "provider_receipt_ref"),
            completed_at: now,
            state_version: nextVersion,
            updated_at: now,
          },
        });
        if (!updatedBatch) throw guardedError("Payroll payment batch not found", "HRX_PAYROLL_NOT_FOUND", 404);
        appendAudit(
          tx,
          context,
          "hrx.payroll.payment_batch.reconciled",
          "PayrollPaymentBatch",
          batchId,
          { from_version: batch.state_version, to_version: nextVersion },
        );
        appendOutbox(tx, context, {
          run_id: batch.run_id,
          event_type: "payroll.payment.reconciled",
          idempotency_key: `${batchId}:reconciled:${nextVersion}`,
          payload: { payment_batch_id: batchId, state: "reconciled" },
        });
      }
      faultInjector("payment_reconciliation.before_complete", Object.freeze({
        payment_batch_id: batchId,
        provider_operation_id: operation.provider_operation_id,
      }));
      const providerReceiptRef = requiredTokenizedRef(payload, "provider_receipt_ref");
      const duplicateReceiptRef = tx.query("select", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_kind: "bank",
          provider_receipt_ref: providerReceiptRef,
        },
      }).find((row) => row.provider_operation_id !== operation.provider_operation_id);
      if (duplicateReceiptRef) throw guardedError("Provider receipt is already bound to another operation", "HRX_PROVIDER_RECEIPT_DUPLICATE", 409);
      const updatedOperation = tx.query("updateOne", {
        table: "hrx_payroll_provider_operations",
        where: {
          tenant_id: context.tenant_id,
          provider_operation_id: operation.provider_operation_id,
        },
        expected_version: operation.state_version,
        patch: {
          state: "succeeded",
          provider_receipt_ref: providerReceiptRef,
          safe_error_code: null,
          state_version: operation.state_version + 1,
          updated_at: now,
          completed_at: now,
        },
      });
      if (!updatedOperation) throw guardedError("Payroll provider operation not found", "HRX_PAYROLL_NOT_FOUND", 404);
      appendAudit(
        tx,
        context,
        "hrx.payroll.provider_operation.succeeded",
        "PayrollProviderOperation",
        operation.provider_operation_id,
        {
          provider_kind: operation.provider_kind,
          operation: operation.operation,
          attempt_count: operation.attempt_count,
        },
      );
      return Object.freeze({
        batch: Object.freeze(clone(updatedBatch)),
        items: Object.freeze(tx.query("select", {
          table: "hrx_payroll_payment_items",
          where: { tenant_id: context.tenant_id, payment_batch_id: batchId },
        }).sort((left, right) => left.employee_id.localeCompare(right.employee_id)).map((row) => Object.freeze(clone(row)))),
        operation: Object.freeze(clone(updatedOperation)),
        idempotent_replay: false,
      });
    });
  }

  function getProviderOperation(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_provider_operations",
      where: {
        tenant_id: context.tenant_id,
        provider_kind: requiredString(input, "provider_kind"),
        idempotency_key: requiredString(input, "idempotency_key"),
      },
    }));
  }

  function listProviderOperations(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["provider_kind", "operation", "idempotency_key", "state"]) {
      if (input[field]) where[field] = input[field];
    }
    return Object.freeze(store.query("select", {
      table: "hrx_payroll_provider_operations",
      where,
    }).sort((left, right) => left.created_at.localeCompare(right.created_at)).map(clone));
  }

  function createPaymentBatch(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      payment_batch_id: input.payment_batch_id ?? idFactory("payroll_payment_batch"),
      run_id: requiredString(input, "run_id"),
      bank_format_code: requiredString(input, "bank_format_code"),
      artifact_ref: null,
      checksum: requiredString(input, "checksum"),
      state: "draft",
      prepared_by_actor_id: context.actor_id,
      approved_by_actor_id: null,
      provider_receipt_ref: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    return auditedInsert(context, "hrx_payroll_payment_batches", row, "hrx.payroll.payment_batch.create", "PayrollPaymentBatch", row.payment_batch_id);
  }

  function addPaymentItem(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      payment_item_id: input.payment_item_id ?? idFactory("payroll_payment_item"),
      payment_batch_id: requiredString(input, "payment_batch_id"),
      employee_id: requiredString(input, "employee_id"),
      tokenized_account_ref: requiredString(input, "tokenized_account_ref"),
      amount_krw: requiredInteger(input, "amount_krw", { nonNegative: true }),
      provider_receipt_ref: null,
      state: "pending",
      provider_result_state: "pending",
      safe_error_code: null,
      attempt_count: 0,
      last_attempt_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
      paid_at: null,
    };
    return auditedInsert(context, "hrx_payroll_payment_items", row, "hrx.payroll.payment_item.create", "PayrollPaymentItem", row.payment_item_id);
  }

  function transitionPaymentBatch(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const batchId = requiredString(input, "payment_batch_id");
    const next = requiredString(input, "state");
    const current = requireRow(store, "hrx_payroll_payment_batches", { tenant_id: context.tenant_id, payment_batch_id: batchId }, "Payroll payment batch");
    assertTransition(current.state, next, PAYMENT_BATCH_TRANSITIONS, "Payroll payment batch");
    const version = expectedVersion(input);
    const now = clock();
    const patch = { state: next, state_version: version + 1, updated_at: now };
    if (next === "approved") {
      if (context.actor_id === current.prepared_by_actor_id) throw guardedError("Payment batch preparer cannot self-approve", "HRX_PAYROLL_SELF_APPROVAL", 403);
      patch.approved_by_actor_id = context.actor_id;
    }
    if (next === "exported") patch.artifact_ref = requiredString(input, "artifact_ref");
    if (next === "reconciled") Object.assign(patch, { provider_receipt_ref: requiredString(input, "provider_receipt_ref"), completed_at: now });
    if (next === "failed") patch.completed_at = now;
    const options = ["exported", "reconciled"].includes(next) ? {
      outbox: {
        run_id: current.run_id,
        event_type: `payroll.payment.${next}`,
        idempotency_key: `${batchId}:${next}:${version + 1}`,
        payload: { payment_batch_id: batchId, state: next },
      },
    } : {};
    return auditedUpdate(context, "hrx_payroll_payment_batches", { tenant_id: context.tenant_id, payment_batch_id: batchId }, patch, version, `hrx.payroll.payment_batch.${next}`, "PayrollPaymentBatch", batchId, options);
  }

  function transitionPaymentItem(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const itemId = requiredString(input, "payment_item_id");
    const next = requiredString(input, "state");
    const current = requireRow(store, "hrx_payroll_payment_items", { tenant_id: context.tenant_id, payment_item_id: itemId }, "Payroll payment item");
    assertTransition(current.state, next, PAYMENT_ITEM_TRANSITIONS, "Payroll payment item");
    const version = expectedVersion(input);
    const now = clock();
    const patch = { state: next, state_version: version + 1, updated_at: now };
    if (next === "paid") Object.assign(patch, {
      provider_receipt_ref: requiredString(input, "provider_receipt_ref"),
      provider_result_state: "succeeded",
      safe_error_code: null,
      attempt_count: Number(current.attempt_count ?? 0) + 1,
      last_attempt_at: now,
      paid_at: now,
    });
    if (next === "failed") Object.assign(patch, {
      provider_receipt_ref: null,
      provider_result_state: input.provider_result_state === "unknown" ? "unknown" : "failed",
      safe_error_code: input.provider_result_state === "unknown"
        ? optionalString(input.safe_error_code)
        : requiredString({ safe_error_code: input.safe_error_code ?? "BANK_ITEM_FAILED" }, "safe_error_code"),
      attempt_count: Number(current.attempt_count ?? 0) + 1,
      last_attempt_at: now,
    });
    return auditedUpdate(context, "hrx_payroll_payment_items", { tenant_id: context.tenant_id, payment_item_id: itemId }, patch, version, `hrx.payroll.payment_item.${next}`, "PayrollPaymentItem", itemId);
  }

  function getPaymentBatch(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_payment_batches",
      where: { tenant_id: context.tenant_id, payment_batch_id: requiredString(input, "payment_batch_id") },
    }));
  }

  function listPaymentBatches(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["run_id", "state", "bank_format_code"]) if (input[field]) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_payment_batches", where })
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(clone));
  }

  function getPaymentItem(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_payment_items",
      where: { tenant_id: context.tenant_id, payment_item_id: requiredString(input, "payment_item_id") },
    }));
  }

  function listPaymentItems(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["payment_batch_id", "employee_id", "state"]) if (input[field]) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_payment_items", where })
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
      .map(clone));
  }

  function createFilingJob(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const runId = requiredString(input, "run_id");
    const filingKind = requiredString(input, "filing_kind");
    const schemaVersion = requiredString(input, "schema_version");
    const packageHash = requiredSha256(input, "package_hash");
    const previousJobRef = optionalString(input.previous_job_ref);
    const run = requireRow(store, "hrx_payroll_runs", {
      tenant_id: context.tenant_id,
      run_id: runId,
    }, "Payroll run");
    if (run.status !== "closed" || !["regular", "adjustment"].includes(run.run_type)) {
      throw guardedError("Closed regular or adjustment payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    }
    if (previousJobRef) {
      const match = /^artifact:payroll-filing\/([A-Za-z0-9][A-Za-z0-9._:-]+)$/.exec(requiredTokenizedRef({ previous_job_ref: previousJobRef }, "previous_job_ref"));
      if (!match) throw new TypeError("previous_job_ref must identify a payroll filing job");
      const previous = requireRow(store, "hrx_payroll_filing_jobs", {
        tenant_id: context.tenant_id,
        filing_job_id: match[1],
      }, "Previous payroll filing job");
      if (previous.state !== "rejected"
        || run.run_type !== "adjustment"
        || run.previous_run_id !== previous.run_id
        || previous.filing_kind !== filingKind
        || previous.schema_version !== schemaVersion) {
        throw guardedError("Payroll filing correction source is invalid", "HRX_PAYROLL_FILING_CORRECTION_SOURCE_INVALID", 409);
      }
      if (previous.package_hash === packageHash) {
        throw guardedError("Payroll filing correction must change the package", "HRX_PAYROLL_FILING_CORRECTION_NO_CHANGE", 409);
      }
    }
    const row = {
      tenant_id: context.tenant_id,
      filing_job_id: input.filing_job_id ?? idFactory("payroll_filing"),
      run_id: runId,
      filing_kind: filingKind,
      schema_version: schemaVersion,
      package_ref: requiredTokenizedRef(input, "package_ref"),
      package_hash: packageHash,
      previous_job_ref: previousJobRef,
      provider_receipt_ref: null,
      state: "draft",
      provider_result_state: "not_submitted",
      safe_error_code: null,
      attempt_count: 0,
      provider_submission_key: null,
      last_attempt_at: null,
      state_version: 1,
      created_by_actor_id: context.actor_id,
      created_at: now,
      updated_at: now,
      submitted_at: null,
      completed_at: null,
    };
    return auditedInsert(context, "hrx_payroll_filing_jobs", row, "hrx.payroll.filing.create", "PayrollFilingJob", row.filing_job_id);
  }

  function transitionFilingJob(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const jobId = requiredString(input, "filing_job_id");
    const next = requiredString(input, "state");
    const current = requireRow(store, "hrx_payroll_filing_jobs", { tenant_id: context.tenant_id, filing_job_id: jobId }, "Payroll filing job");
    assertTransition(current.state, next, FILING_TRANSITIONS, "Payroll filing job");
    const version = expectedVersion(input);
    const now = clock();
    const patch = { state: next, state_version: version + 1, updated_at: now };
    if (next === "submitted") Object.assign(patch, {
      submitted_at: now,
      provider_result_state: "queued",
      safe_error_code: null,
      provider_submission_key: input.provider_submission_key ?? `${jobId}:${current.package_hash}`,
    });
    if (['accepted', 'rejected'].includes(next)) {
      const providerReceiptRef = requiredString(input, "provider_receipt_ref");
      const duplicate = store.query("select", {
        table: "hrx_payroll_filing_jobs",
        where: { tenant_id: context.tenant_id, provider_receipt_ref: providerReceiptRef },
      }).find((row) => row.filing_job_id !== jobId);
      if (duplicate) throw guardedError("Provider filing receipt is already bound to another job", "HRX_PAYROLL_FILING_RECEIPT_DUPLICATE", 409);
      Object.assign(patch, {
        provider_receipt_ref: providerReceiptRef,
        provider_result_state: next === "accepted" ? "accepted" : "failed",
        safe_error_code: next === "accepted"
          ? null
          : requiredString({ safe_error_code: input.safe_error_code ?? "FILING_REJECTED" }, "safe_error_code"),
        completed_at: now,
      });
    }
    if (next === "corrected") Object.assign(patch, {
      provider_result_state: "corrected",
      safe_error_code: null,
    });
    const options = ["submitted", "accepted", "rejected"].includes(next) ? {
      outbox: {
        run_id: current.run_id,
        event_type: `payroll.filing.${next}`,
        idempotency_key: `${jobId}:${next}:${version + 1}`,
        payload: { filing_job_id: jobId, filing_kind: current.filing_kind, state: next },
      },
    } : {};
    return auditedUpdate(context, "hrx_payroll_filing_jobs", { tenant_id: context.tenant_id, filing_job_id: jobId }, patch, version, `hrx.payroll.filing.${next}`, "PayrollFilingJob", jobId, options);
  }

  function recordFilingProviderAttempt(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const jobId = requiredString(input, "filing_job_id");
    const current = requireRow(store, "hrx_payroll_filing_jobs", {
      tenant_id: context.tenant_id,
      filing_job_id: jobId,
    }, "Payroll filing job");
    if (current.state !== "submitted") throw guardedError("Submitted payroll filing is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
    const version = expectedVersion(input);
    const attemptCount = Number(current.attempt_count ?? 0) + 1;
    if (input.attempt_count != null && input.attempt_count !== attemptCount) {
      throw guardedError("Filing provider attempt counter is out of sync", "HRX_PROVIDER_ATTEMPT_COUNT_MISMATCH", 409);
    }
    const now = clock();
    return auditedUpdate(
      context,
      "hrx_payroll_filing_jobs",
      { tenant_id: context.tenant_id, filing_job_id: jobId },
      {
        provider_result_state: "queued",
        safe_error_code: null,
        attempt_count: attemptCount,
        provider_submission_key: input.provider_submission_key ?? current.provider_submission_key ?? `${jobId}:${current.package_hash}`,
        last_attempt_at: now,
        state_version: version + 1,
        updated_at: now,
      },
      version,
      "hrx.payroll.filing.provider_attempt",
      "PayrollFilingJob",
      jobId,
    );
  }

  function getFilingJob(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_filing_jobs",
      where: { tenant_id: context.tenant_id, filing_job_id: requiredString(input, "filing_job_id") },
    }));
  }

  function listFilingJobs(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["run_id", "filing_kind", "state"]) if (input[field]) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_filing_jobs", where })
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(clone));
  }

  function createYearEndCase(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      year_end_case_id: input.year_end_case_id ?? idFactory("payroll_year_end"),
      run_id: requiredString(input, "run_id"),
      employee_id: requiredString(input, "employee_id"),
      tax_year: requiredInteger(input, "tax_year", { nonNegative: true }),
      collection_state: input.collection_state ?? "collecting",
      source_refs_json: JSON.stringify(stable(input.source_refs ?? [])),
      inputs_json: JSON.stringify(stable(input.inputs ?? {})),
      input_hash: requiredSha256(input, "input_hash"),
      result_json: null,
      result_hash: null,
      state: "draft",
      prepared_by_actor_id: context.actor_id,
      reviewed_by_actor_id: null,
      review_receipt_ref: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
      calculated_at: null,
      reviewed_at: null,
    };
    return auditedInsert(context, "hrx_payroll_year_end_cases", row, "hrx.payroll.year_end.create", "PayrollYearEndCase", row.year_end_case_id);
  }

  function updateYearEndCaseInputs(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const caseId = requiredString(input, "year_end_case_id");
    const current = requireRow(store, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, "Payroll year-end case");
    if (current.state !== "draft") throw guardedError("Calculated payroll year-end input is immutable", "HRX_PAYROLL_YEAR_END_INPUT_IMMUTABLE", 409);
    const version = expectedVersion(input);
    return auditedUpdate(context, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, {
      collection_state: input.collection_state ?? current.collection_state,
      source_refs_json: JSON.stringify(stable(input.source_refs ?? JSON.parse(current.source_refs_json))),
      inputs_json: JSON.stringify(stable(input.inputs ?? JSON.parse(current.inputs_json))),
      input_hash: requiredSha256(input, "input_hash"),
      state_version: version + 1,
      updated_at: clock(),
    }, version, "hrx.payroll.year_end.collect", "PayrollYearEndCase", caseId);
  }

  function calculateYearEndCase(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const caseId = requiredString(input, "year_end_case_id");
    const current = requireRow(store, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, "Payroll year-end case");
    if (current.state !== "draft" || current.collection_state !== "complete") throw guardedError("Complete payroll year-end collection is required", "HRX_PAYROLL_YEAR_END_COLLECTION_INCOMPLETE", 409);
    const version = expectedVersion(input);
    return auditedUpdate(context, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, {
      result_json: JSON.stringify(stable(input.result ?? {})),
      result_hash: requiredSha256(input, "result_hash"),
      state: "calculated",
      state_version: version + 1,
      updated_at: clock(),
      calculated_at: clock(),
    }, version, "hrx.payroll.year_end.calculate", "PayrollYearEndCase", caseId);
  }

  function reviewYearEndCase(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const caseId = requiredString(input, "year_end_case_id");
    const current = requireRow(store, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, "Payroll year-end case");
    if (current.state !== "calculated") throw guardedError("Calculated payroll year-end case is required", "HRX_PAYROLL_YEAR_END_STATE_INVALID", 409);
    if (current.prepared_by_actor_id === context.actor_id) throw guardedError("Payroll year-end preparer cannot self-review", "HRX_PAYROLL_SELF_APPROVAL", 403);
    const version = expectedVersion(input);
    return auditedUpdate(context, "hrx_payroll_year_end_cases", { tenant_id: context.tenant_id, year_end_case_id: caseId }, {
      result_json: JSON.stringify(stable(input.result ?? JSON.parse(current.result_json))),
      result_hash: requiredSha256(input, "result_hash"),
      state: "reviewed",
      reviewed_by_actor_id: context.actor_id,
      review_receipt_ref: requiredTokenizedRef(input, "review_receipt_ref"),
      state_version: version + 1,
      updated_at: clock(),
      reviewed_at: clock(),
    }, version, "hrx.payroll.year_end.review", "PayrollYearEndCase", caseId);
  }

  function getYearEndCase(contextInput, input = {}) {
    const context = contextValues(contextInput);
    return clone(store.query("selectOne", {
      table: "hrx_payroll_year_end_cases",
      where: { tenant_id: context.tenant_id, year_end_case_id: requiredString(input, "year_end_case_id") },
    }));
  }

  function listYearEndCases(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    for (const field of ["run_id", "employee_id", "state", "collection_state", "tax_year"]) if (input[field] !== undefined && input[field] !== null) where[field] = input[field];
    return Object.freeze(store.query("select", { table: "hrx_payroll_year_end_cases", where })
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
      .map(clone));
  }

  function getRunBundle(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const runId = requiredString(input, "run_id");
    const run = store.query("selectOne", { table: "hrx_payroll_runs", where: { tenant_id: context.tenant_id, run_id: runId } });
    if (!run) return undefined;
    const snapshots = store.query("select", { table: "hrx_payroll_input_snapshots", where: { tenant_id: context.tenant_id, run_id: runId } });
    const results = store.query("select", { table: "hrx_payroll_employee_results", where: { tenant_id: context.tenant_id, run_id: runId } });
    const issues = store.query("select", { table: "hrx_payroll_issues", where: { tenant_id: context.tenant_id, run_id: runId } });
    const resultIds = new Set(results.map((result) => result.result_id));
    const lineItems = store.query("select", { table: "hrx_payroll_line_items", where: { tenant_id: context.tenant_id } }).filter((line) => resultIds.has(line.result_id));
    return Object.freeze({ run: clone(run), snapshots: Object.freeze(snapshots.map(clone)), results: Object.freeze(results.map(clone)), line_items: Object.freeze(lineItems.map(clone)), issues: Object.freeze(issues.map(clone)) });
  }

  function listAuditEvents(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const rows = store.query("select", { table: "hrx_audit_events", where: { tenant_id: context.tenant_id } });
    return Object.freeze(rows.filter((event) => !input.object_id || event.object_id === input.object_id).map(clone));
  }

  function listOutboxEvents(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const where = { tenant_id: context.tenant_id };
    if (input.run_id) where.run_id = input.run_id;
    return Object.freeze(store.query("select", { table: "hrx_payroll_outbox", where }).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(clone));
  }

  return Object.freeze({
    createPeriod,
    getPeriod,
    listPeriods,
    transitionPeriod,
    createRun,
    createAdjustmentRun,
    getRun,
    listRuns,
    transitionRun,
    createProfile,
    updateProfile,
    listProfiles,
    createInputSnapshot,
    createAdjustment,
    listAdjustments,
    persistRunPreview,
    createEmployeeResult,
    createIssue,
    listIssues,
    resolveIssue,
    reopenIssue,
    addLineItem,
    createRuleVersion,
    legallyApproveMinimumWageRuleVersion,
    reviewRuleVersion,
    publishRuleVersion,
    listRuleVersions,
    createStatementTemplate,
    publishStatementTemplate,
    getStatementTemplate,
    listStatementTemplates,
    createStatement,
    transitionStatement,
    getStatement,
    listStatements,
    createDeliveryReceipt,
    transitionDeliveryReceipt,
    recordDeliveryProviderResult,
    getDeliveryReceipt,
    listDeliveryReceipts,
    applyDeliveryProviderEvent,
    listDeliveryProviderEvents,
    beginProviderOperation,
    expirePaymentReconciliationClaim,
    beginFilingSubmissionAttempt,
    completeProviderOperation,
    stagePaymentReconciliationResult,
    settlePaymentReconciliation,
    getProviderOperation,
    listProviderOperations,
    createPaymentBatch,
    addPaymentItem,
    transitionPaymentBatch,
    transitionPaymentItem,
    getPaymentBatch,
    listPaymentBatches,
    getPaymentItem,
    listPaymentItems,
    createFilingJob,
    transitionFilingJob,
    recordFilingProviderAttempt,
    getFilingJob,
    listFilingJobs,
    createYearEndCase,
    updateYearEndCaseInputs,
    calculateYearEndCase,
    reviewYearEndCase,
    getYearEndCase,
    listYearEndCases,
    getRunBundle,
    listAuditEvents,
    listOutboxEvents,
  });
}

export { digest as createPayrollDataHash };
