import { createHash, randomUUID } from "node:crypto";
import { SYNTHETIC_PAYROLL_FILING_SCHEMAS } from "../../../../../packages/hrx/src/payroll/filing-service.js";
import { createPayrollStepUpReceipt } from "../../../../../packages/hrx/src/payroll/run-service.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../../../../../packages/hrx/src/provider-receipt-contract.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function parseJson(value, fallback) {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeError(error) {
  return response(error?.status ?? 400, {
    outcome: "blocked",
    safe_error_code: error?.safe_error_code ?? "HRX_PAYROLL_RUNTIME_ERROR",
    reason: error?.message ?? "Payroll runtime request failed",
  });
}

function runStatusLabel(status) {
  return ({ draft: "입력 대기", snapshot_ready: "계산 준비", previewed: "검토 중", approved: "승인", closed: "마감", cancelled: "취소" })[status] ?? status;
}

function selfEmployeeId(store, context) {
  const link = store.query("selectOne", { table: "hrx_employee_user_links", where: { tenant_id: context.tenant_id, user_id: context.actor_id } });
  if (!link?.employee_id) {
    const error = new Error("Payroll statement not found");
    error.safe_error_code = "HRX_PAYROLL_STATEMENT_NOT_FOUND";
    error.status = 404;
    throw error;
  }
  return link.employee_id;
}

function paymentBundle(runtime, context, batchId) {
  const value = runtime.paymentService.bundle(context, batchId);
  return Object.freeze({ ...value, production_ready_claim: false });
}

function syntheticBankReceipt(context, batch, now) {
  const payloadHash = createHash("sha256").update(`${batch.payment_batch_id}:${batch.checksum}`).digest("hex");
  return Object.freeze({
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `synthetic-bank-${batch.payment_batch_id}`,
    tenant_id: context.tenant_id,
    provider_kind: "bank",
    provider_id: "lawos-bank-sandbox",
    operation: "bulk_transfer_reconcile",
    idempotency_key: `${batch.payment_batch_id}:reconcile`,
    payload_hash: `sha256:${payloadHash}`,
    state: "succeeded",
    requested_at: now,
    completed_at: now,
    provider_receipt_ref: `provider:sandbox/bank/${batch.payment_batch_id}`,
    error_code: null,
  });
}

function employeeRows(store, context, bundle) {
  const employees = new Map(store.query("select", { table: "hrx_employees", where: { tenant_id: context.tenant_id } })
    .map((row) => [row.employee_id, row]));
  const issues = new Map();
  for (const row of bundle.issues) {
    const values = issues.get(row.employee_id) ?? [];
    values.push({ ...row, details: parseJson(row.details_json, {}) });
    issues.set(row.employee_id, values);
  }
  const snapshots = new Map(bundle.snapshots.map((row) => [row.employee_id, row]));
  const resultByEmployee = new Map(bundle.results.map((row) => [row.employee_id, row]));
  const employeeIds = [...new Set([...snapshots.keys(), ...resultByEmployee.keys(), ...issues.keys()])].filter(Boolean).sort();
  return employeeIds.map((employeeId) => {
    const result = resultByEmployee.get(employeeId);
    const employeeIssues = issues.get(employeeId) ?? [];
    const priorVariance = employeeIssues.find((row) => row.issue_code === "PAYROLL_PRIOR_PERIOD_VARIANCE")?.details?.net_delta_krw ?? 0;
    return Object.freeze({
      employee_id: employeeId,
      result_id: result?.result_id ?? null,
      display_name: employees.get(employeeId)?.display_name ?? employeeId,
      gross_krw: result?.gross_krw ?? 0,
      deduction_krw: result?.deduction_krw ?? 0,
      net_krw: result?.net_krw ?? 0,
      variance_krw: priorVariance,
      issue_count: employeeIssues.filter((row) => row.state === "open").length,
      blocker_count: employeeIssues.filter((row) => row.state === "open" && row.severity === "blocker").length,
      status: result ? "calculated" : "input",
    });
  });
}

function runBundle(runtime, store, context, runId) {
  const bundle = runtime.payrollRepository.getRunBundle(context, { run_id: runId });
  const employees = employeeRows(store, context, bundle);
  const totals = employees.reduce((sum, row) => ({
    gross_krw: sum.gross_krw + row.gross_krw,
    deduction_krw: sum.deduction_krw + row.deduction_krw,
    net_krw: sum.net_krw + row.net_krw,
    issue_count: sum.issue_count + row.issue_count,
  }), { gross_krw: 0, deduction_krw: 0, net_krw: 0, issue_count: 0 });
  return Object.freeze({
    ...bundle,
    snapshots: Object.freeze(bundle.snapshots.map((row) => ({
      snapshot_id: row.snapshot_id,
      run_id: row.run_id,
      employee_id: row.employee_id,
      source_refs: parseJson(row.source_refs_json, []),
      source_hash: row.source_hash,
      payable_minutes: row.payable_minutes,
      paid_leave_minutes: row.paid_leave_minutes,
      unpaid_leave_minutes: row.unpaid_leave_minutes,
      captured_at: row.captured_at,
    }))),
    run: Object.freeze({ ...bundle.run, status_label: runStatusLabel(bundle.run.status) }),
    employees: Object.freeze(employees),
    totals: Object.freeze(totals),
    line_items: Object.freeze(bundle.line_items.map((row) => ({ ...row, metadata: parseJson(row.metadata_json, {}) }))),
    issues: Object.freeze(bundle.issues.map((row) => ({ ...row, details: parseJson(row.details_json, {}) }))),
    adjustments: runtime.payrollRepository.listAdjustments(context, { run_id: runId }),
    statements: runtime.documentService.list(context, { run_id: runId }),
    payment_batches: runtime.payrollRepository.listPaymentBatches(context, { run_id: runId }),
    filings: runtime.filingService.list(context, { run_id: runId }),
    year_end: runtime.yearEndService?.summary(context, { run_id: runId }) ?? null,
  });
}

function workspace(runtime, store, context) {
  const periods = runtime.payrollRepository.listPeriods(context).map((period) => {
    const runs = runtime.payrollRepository.listRuns(context, { period_id: period.period_id }).map((run) => {
      const bundle = runBundle(runtime, store, context, run.run_id);
      return Object.freeze({ ...bundle.run, totals: bundle.totals, employee_count: bundle.employees.length });
    });
    return Object.freeze({ ...period, runs: Object.freeze(runs) });
  });
  return Object.freeze({ periods: Object.freeze(periods), production_ready_claim: false });
}

export function createHrxPayrollRuntimeRoute({ runtime, store, clock = () => new Date().toISOString() } = {}) {
  if (!runtime || !store) return null;
  return Object.freeze({
    async handle(request = {}) {
      try {
        const context = request.context;
        const action = request.params?.action;
        if (request.method === "GET" && action === "list") return response(200, { outcome: "ok", workspace: workspace(runtime, store, context) });
        if (request.method === "GET" && action === "bundle") {
          return response(200, { outcome: "ok", bundle: runBundle(runtime, store, context, requiredString(request.params, "run_id")) });
        }
        if (request.method === "POST" && action === "period-create") {
          let period = runtime.payrollRepository.createPeriod(context, request.body);
          if (request.body.open === true) period = runtime.payrollRepository.transitionPeriod(context, { period_id: period.period_id, status: "open", expected_version: period.state_version });
          return response(201, { outcome: "created", period });
        }
        if (request.method === "POST" && action === "run-create") {
          const run = runtime.payrollRepository.createRun(context, request.body);
          return response(201, { outcome: "created", run });
        }
        if (request.method === "POST" && action === "snapshot") {
          const capture = runtime.inputSnapshotService.capture(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: capture.ready ? "ready" : "review_required", capture, bundle: runBundle(runtime, store, context, capture.run.run_id) });
        }
        if (request.method === "POST" && action === "preview") {
          const runId = requiredString(request.params, "run_id");
          runtime.runService.preview(context, { ...request.body, run_id: runId });
          return response(200, { outcome: "previewed", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "POST" && action === "issue-resolve") {
          const issue = runtime.payrollRepository.resolveIssue(context, {
            ...request.body,
            issue_id: requiredString(request.params, "issue_id"),
            state: request.body.state ?? "resolved",
            resolution_code: request.body.resolution_code ?? "REVIEWED_SOURCE_EVIDENCE",
          });
          return response(200, { outcome: "resolved", issue });
        }
        if (request.method === "POST" && action === "approve") {
          if (context.step_up_verified !== true) {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          const runId = requiredString(request.params, "run_id");
          const now = clock();
          const receipt = createPayrollStepUpReceipt({
            receipt_ref: `artifact:step-up/payroll/${randomUUID()}`,
            actor_id: context.actor_id,
            action: "payroll.approve",
            object_id: runId,
            issued_at: now,
            expires_at: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
          });
          runtime.runService.approve(context, { ...request.body, run_id: runId, step_up_receipt: receipt });
          return response(200, { outcome: "approved", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "POST" && action === "close") {
          const runId = requiredString(request.params, "run_id");
          runtime.runService.close(context, { ...request.body, run_id: runId });
          return response(200, { outcome: "closed", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "GET" && action === "statements-list") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "ok", statements: runtime.documentService.list(context, { run_id: runId }) });
        }
        if (request.method === "POST" && action === "statements-generate") {
          const generated = runtime.documentService.generate(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: "generated", generated });
        }
        if (request.method === "GET" && action === "statement-export") {
          const artifact = runtime.documentService.exportRegister(context, { run_id: requiredString(request.params, "run_id"), format: request.query?.format ?? "csv" });
          return response(200, { outcome: "exported", artifact });
        }
        if (request.method === "POST" && action === "statements-deliver") {
          const delivery = await runtime.documentService.deliver(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: delivery.delivered_count ? "delivered" : "queued", delivery });
        }
        if (request.method === "GET" && action === "statements-self") {
          const employeeId = selfEmployeeId(store, context);
          return response(200, { outcome: "ok", statements: runtime.documentService.selfList(context, { employee_id: employeeId }) });
        }
        if (request.method === "GET" && action === "statement-read") {
          const statement = runtime.documentService.read(context, { employee_id: selfEmployeeId(store, context), statement_id: requiredString(request.params, "statement_id") });
          return response(200, { outcome: "ok", artifact: statement });
        }
        if (request.method === "POST" && action === "statement-revoke") {
          const statement = runtime.documentService.revoke(context, { statement_id: requiredString(request.params, "statement_id") });
          return response(200, { outcome: "revoked", statement });
        }
        if (request.method === "POST" && action === "payment-prepare") {
          const payment = runtime.paymentService.prepare(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: "prepared", payment: Object.freeze({ ...payment, production_ready_claim: false }) });
        }
        if (request.method === "GET" && action === "payment-bundle") {
          return response(200, { outcome: "ok", payment: paymentBundle(runtime, context, requiredString(request.params, "payment_batch_id")) });
        }
        if (request.method === "POST" && action === "payment-approve") {
          if (context.step_up_verified !== true) {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          const batchId = requiredString(request.params, "payment_batch_id");
          const now = clock();
          const receipt = createPayrollStepUpReceipt({ receipt_ref: `artifact:step-up/payroll-payment/${randomUUID()}`, actor_id: context.actor_id, action: "payroll.payment.approve", object_id: batchId, issued_at: now, expires_at: new Date(Date.parse(now) + 5 * 60_000).toISOString() });
          const payment = runtime.paymentService.approve(context, { ...request.body, payment_batch_id: batchId, step_up_receipt: receipt });
          return response(200, { outcome: "approved", payment: Object.freeze({ ...payment, production_ready_claim: false }) });
        }
        if (request.method === "POST" && action === "payment-export") {
          const artifact = runtime.paymentService.exportBatch(context, { ...request.body, payment_batch_id: requiredString(request.params, "payment_batch_id") });
          return response(200, { outcome: "exported", artifact });
        }
        if (request.method === "POST" && action === "payment-reconcile") {
          const batchId = requiredString(request.params, "payment_batch_id");
          const current = runtime.paymentService.bundle(context, batchId);
          const items = current.items.map((item) => ({ employee_id: item.employee_id, state: "paid", provider_receipt_ref: `provider:sandbox/bank/item/${item.payment_item_id}` }));
          const payment = runtime.paymentService.reconcile(context, {
            payment_batch_id: batchId,
            provider_receipt: syntheticBankReceipt(context, current.batch, clock()),
            items,
            reported_paid_total_krw: current.items.reduce((sum, item) => sum + item.amount_krw, 0),
          });
          return response(200, { outcome: "reconciled", payment: Object.freeze({ ...payment, production_ready_claim: false }) });
        }
        if (request.method === "GET" && action === "filing-list") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "ok", filings: runtime.filingService.list(context, { run_id: runId }) });
        }
        if (request.method === "POST" && action === "filing-create") {
          const filingKind = requiredString(request.body, "filing_kind");
          const runId = requiredString(request.params, "run_id");
          const records = filingKind === "year_end" ? runtime.yearEndService.filingRecords(context, { run_id: runId }) : request.body.records;
          const filing = runtime.filingService.createPackage(context, { ...request.body, run_id: runId, ...(records ? { records } : {}), schema_version: request.body.schema_version ?? SYNTHETIC_PAYROLL_FILING_SCHEMAS[filingKind] });
          return response(200, { outcome: "created", filing });
        }
        if (request.method === "POST" && action === "year-end-collect") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "collected", year_end: runtime.yearEndService.collectRun(context, { ...request.body, run_id: runId }) });
        }
        if (request.method === "POST" && action === "year-end-calculate") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "calculated", year_end: runtime.yearEndService.calculateRun(context, { ...request.body, run_id: runId }) });
        }
        if (request.method === "POST" && action === "year-end-review") {
          if (context.step_up_verified !== true) {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          const runId = requiredString(request.params, "run_id");
          const reviewReceiptRef = `artifact:step-up/payroll-year-end/${randomUUID()}`;
          return response(200, { outcome: "reviewed", year_end: runtime.yearEndService.reviewRun(context, { ...request.body, run_id: runId, review_receipt_ref: reviewReceiptRef }) });
        }
        if (request.method === "POST" && action === "filing-validate") {
          const filing = runtime.filingService.validate(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: "validated", filing });
        }
        if (request.method === "POST" && action === "filing-submit") {
          const submission = await runtime.filingService.submit(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: submission.job.state, submission });
        }
        if (request.method === "POST" && action === "filing-correct") {
          const filing = runtime.filingService.correct(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: "corrected", filing });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return safeError(error);
      }
    },
  });
}
