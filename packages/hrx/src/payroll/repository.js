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
const PAYMENT_BATCH_TRANSITIONS = Object.freeze({ draft: new Set(["approved", "failed"]), approved: new Set(["exported", "failed"]), exported: new Set(["reconciled", "failed"]), reconciled: new Set(), failed: new Set() });
const PAYMENT_ITEM_TRANSITIONS = Object.freeze({ pending: new Set(["exported", "failed"]), exported: new Set(["paid", "failed"]), paid: new Set(), failed: new Set() });
const FILING_TRANSITIONS = Object.freeze({ draft: new Set(["validated"]), validated: new Set(["submitted"]), submitted: new Set(["accepted", "rejected"]), rejected: new Set(["corrected"]), corrected: new Set(["validated"]), accepted: new Set() });

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

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
} = {}) {
  assertHrxStorePort(store);
  if (typeof store.transaction !== "function") throw new TypeError("payroll repository requires a transactional store");

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
      const previous = requireRow(store, "hrx_payroll_runs", { tenant_id: context.tenant_id, run_id: requiredString(input, "previous_run_id") }, "Previous payroll run");
      if (previous.period_id !== periodId || previous.status !== "closed") throw guardedError("Adjustment requires a closed run in the same period", "HRX_PAYROLL_ADJUSTMENT_SOURCE_INVALID", 409);
    }
    const now = clock();
    const row = {
      tenant_id: context.tenant_id,
      run_id: input.run_id ?? idFactory("payroll_run"),
      period_id: periodId,
      run_type: runType,
      previous_run_id: previousRunId,
      status: "draft",
      snapshot_hash: null,
      result_hash: null,
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
    if (next === "closed") patch.closed_at = now;
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
    if (next === "closed") outbox = { run_id: runId, event_type: "payroll.close", idempotency_key: `payroll.close:${runId}`, payload: { run_id: runId, result_hash: current.result_hash } };
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
    const row = {
      tenant_id: context.tenant_id,
      adjustment_id: input.adjustment_id ?? idFactory("payroll_adjustment"),
      run_id: runId,
      employee_id: requiredString(input, "employee_id"),
      previous_run_ref: requiredTokenizedRef(input, "previous_run_ref"),
      adjustment_ref: requiredTokenizedRef(input, "adjustment_ref"),
      reason_code: requiredString(input, "reason_code"),
      amount_krw: requiredInteger(input, "amount_krw"),
      taxable: input.taxable === true ? 1 : 0,
      created_by_actor_id: context.actor_id,
      created_at: clock(),
    };
    if (row.amount_krw === 0) throw new TypeError("amount_krw must not be zero");
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
    const gross = requiredInteger(input, "gross_krw");
    const deductions = requiredInteger(input, "deduction_krw");
    const net = requiredInteger(input, "net_krw");
    const row = {
      tenant_id: context.tenant_id,
      result_id: input.result_id ?? idFactory("payroll_result"),
      run_id: requiredString(input, "run_id"),
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
    const row = {
      tenant_id: context.tenant_id,
      line_item_id: input.line_item_id ?? idFactory("payroll_line"),
      result_id: requiredString(input, "result_id"),
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
      reviewed_by_actor_id: null,
      published_by_actor_id: null,
      published_at: null,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    return auditedInsert(context, "hrx_payroll_rule_versions", row, "hrx.payroll.rule.create", "PayrollRuleVersion", row.rule_version_id);
  }

  function reviewRuleVersion(contextInput, input = {}) {
    const context = contextValues(contextInput);
    const ruleId = requiredString(input, "rule_version_id");
    const current = requireRow(store, "hrx_payroll_rule_versions", { tenant_id: context.tenant_id, rule_version_id: ruleId }, "Payroll rule");
    if (current.approval_state !== "draft") throw guardedError("Only draft payroll rule can be reviewed", "HRX_PAYROLL_RULE_STATE_INVALID", 409);
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
      provider_receipt_ref: null,
      receipt_hash: null,
      state: "queued",
      attempt_count: 0,
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
    const patch = { state: next, state_version: version + 1, updated_at: now };
    if (next === "queued") patch.attempt_count = current.attempt_count + 1;
    if (next === "delivered") Object.assign(patch, { provider_receipt_ref: requiredString(input, "provider_receipt_ref"), receipt_hash: requiredString(input, "receipt_hash"), delivered_at: now, attempt_count: current.attempt_count + 1 });
    if (next === "viewed") patch.viewed_at = now;
    if (next === "failed") Object.assign(patch, { failed_at: now, attempt_count: current.attempt_count + 1 });
    return auditedUpdate(context, "hrx_payroll_delivery_receipts", { tenant_id: context.tenant_id, delivery_receipt_id: receiptId }, patch, version, `hrx.payroll.delivery.${next}`, "PayrollDeliveryReceipt", receiptId);
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
    const patch = { state: next, state_version: version + 1, updated_at: clock() };
    if (next === "paid") Object.assign(patch, { provider_receipt_ref: requiredString(input, "provider_receipt_ref"), paid_at: clock() });
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
    const row = {
      tenant_id: context.tenant_id,
      filing_job_id: input.filing_job_id ?? idFactory("payroll_filing"),
      run_id: requiredString(input, "run_id"),
      filing_kind: requiredString(input, "filing_kind"),
      schema_version: requiredString(input, "schema_version"),
      package_ref: requiredString(input, "package_ref"),
      package_hash: requiredString(input, "package_hash"),
      provider_receipt_ref: null,
      state: "draft",
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
    if (next === "submitted") patch.submitted_at = now;
    if (['accepted', 'rejected'].includes(next)) Object.assign(patch, { provider_receipt_ref: requiredString(input, "provider_receipt_ref"), completed_at: now });
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
    getDeliveryReceipt,
    listDeliveryReceipts,
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
