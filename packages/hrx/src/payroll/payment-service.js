import { createHash } from "node:crypto";
import {
  assertHrxProviderReceiptForOperation,
  createHrxSandboxProviderOperationBoundary,
  summarizeHrxProviderItemOutcomes,
} from "../provider-receipt-contract.js";
import { createEncryptedPayrollArtifactVault } from "./document-service.js";
import {
  HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
  HRX_PAYMENT_RECONCILIATION_RESULT_SCHEMA_VERSION,
} from "./repository.js";
import { createPayrollStepUpReceipt } from "./run-service.js";

const TOKENIZED_REF = /^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/;
export const HRX_PAYMENT_RECONCILIATION_LEASE_MS = 15 * 60 * 1000;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function safeError(message, code, status = 400) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function verifyStepUp(context, batchId, receipt, now) {
  let expected;
  try {
    expected = createPayrollStepUpReceipt(receipt);
  } catch {
    throw safeError("Payment approval step-up receipt is invalid", "HRX_STEP_UP_INVALID", 403);
  }
  if (expected.receipt_hash !== receipt.receipt_hash) throw safeError("Payment approval step-up receipt is invalid", "HRX_STEP_UP_INVALID", 403);
  if (receipt.actor_id !== context.actor_id || receipt.action !== "payroll.payment.approve" || receipt.object_id !== batchId) throw safeError("Payment approval step-up receipt scope is invalid", "HRX_STEP_UP_SCOPE_INVALID", 403);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || Date.parse(receipt.issued_at) > nowMs || Date.parse(receipt.expires_at) <= nowMs) throw safeError("Payment approval step-up receipt expired", "HRX_STEP_UP_EXPIRED", 403);
}

export function createSyntheticPayrollBankAdapter({ format_code = "SYNTHETIC_KR_V1" } = {}) {
  return Object.freeze({
    format_code,
    render({ entries = [] } = {}) {
      const rows = [
        ["bank_code", "account_number", "account_holder", "amount_krw", "employee_ref"],
        ...entries.map((entry) => [entry.bank_code, entry.account_number, entry.account_holder, entry.amount_krw, entry.employee_id]),
      ];
      return Buffer.from(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`, "utf8");
    },
  });
}

export function createPayrollPaymentReconciliationScope({ batch, items = [], mode = "initial" } = {}) {
  const batchId = requiredString(batch, "payment_batch_id");
  const checksum = requiredString(batch, "checksum");
  if (!["initial", "retry"].includes(mode)) throw new TypeError("reconciliation mode is unsupported");
  if (!Array.isArray(items) || items.length === 0) throw new TypeError("reconciliation items must be a non-empty array");
  const itemRefs = items
    .map((item) => {
      const stateVersion = Number(item.state_version);
      const amountKrw = Number(item.amount_krw);
      if (!Number.isInteger(stateVersion) || stateVersion < 1) throw new TypeError("state_version must be a positive integer");
      if (!Number.isInteger(amountKrw) || amountKrw < 0) throw new TypeError("amount_krw must be a non-negative integer");
      return {
        payment_item_id: requiredString(item, "payment_item_id"),
        state_version: stateVersion,
        amount_krw: amountKrw,
      };
    })
    .sort((left, right) => left.payment_item_id.localeCompare(right.payment_item_id));
  const retryDigest = hash(Buffer.from(JSON.stringify(itemRefs.map(({ payment_item_id, state_version }) => ({ payment_item_id, state_version })))));
  return Object.freeze({
    mode,
    idempotency_key: mode === "initial" ? `${batchId}:reconcile` : `${batchId}:retry:${retryDigest}`,
    payload_hash: `sha256:${hash(Buffer.from(JSON.stringify({
      payment_batch_id: batchId,
      checksum,
      mode,
      items: itemRefs,
    })))}`,
    item_ids: Object.freeze(itemRefs.map((item) => item.payment_item_id)),
  });
}

function reconciliationRequestHash(input = {}) {
  const receipt = input.provider_receipt ?? {};
  const items = Array.isArray(input.items)
    ? input.items.map((item) => ({
      employee_id: item?.employee_id ?? null,
      state: item?.state ?? null,
      provider_receipt_ref: item?.provider_receipt_ref ?? null,
      safe_error_code: item?.safe_error_code ?? null,
    })).sort((left, right) => String(left.employee_id).localeCompare(String(right.employee_id)))
    : [];
  return hash(Buffer.from(JSON.stringify(stable({
    provider_receipt: {
      receipt_id: receipt.receipt_id ?? null,
      idempotency_key: receipt.idempotency_key ?? null,
      payload_hash: receipt.payload_hash ?? null,
      state: receipt.state ?? null,
      provider_receipt_ref: receipt.provider_receipt_ref ?? null,
    },
    reported_item_count: input.reported_item_count ?? null,
    reported_paid_total_krw: input.reported_paid_total_krw ?? null,
    items,
  }))));
}

export function createPayrollPaymentService({
  repository,
  accountResolver,
  bankAdapter = createSyntheticPayrollBankAdapter(),
  artifactVault = createEncryptedPayrollArtifactVault({ allowSyntheticSecret: true }),
  providerBoundary = createHrxSandboxProviderOperationBoundary("bank"),
  reconciliationLeaseMs = HRX_PAYMENT_RECONCILIATION_LEASE_MS,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository || typeof accountResolver?.resolve !== "function") throw new TypeError("payroll payment service requires repository and accountResolver");
  if (!Number.isInteger(reconciliationLeaseMs) || reconciliationLeaseMs < 1) {
    throw new TypeError("reconciliationLeaseMs must be a positive integer");
  }

  function requireClosedRun(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw safeError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw safeError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    return bundle;
  }

  function payableResults(bundle) {
    const results = Array.isArray(bundle.results) ? bundle.results : [];
    for (const result of results) {
      const amountKrw = Number(result.net_krw);
      if (!Number.isSafeInteger(amountKrw)) {
        throw safeError("Payroll payment result is invalid", "HRX_PAYROLL_PAYMENT_RESULT_INVALID", 409);
      }
      if (amountKrw < 0) {
        throw safeError(
          "과지급 회수·상계 절차가 없어 음수 지급액은 처리할 수 없습니다",
          "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
          409,
        );
      }
    }
    const payable = results.filter((result) => Number(result.net_krw) > 0);
    if (payable.length === 0) {
      throw safeError("지급할 금액이 없어 지급 준비를 만들지 않았습니다", "HRX_PAYROLL_NO_PAYABLE_ITEMS", 409);
    }
    return payable;
  }

  function render(context, runId) {
    const bundle = requireClosedRun(context, runId);
    const entries = payableResults(bundle).map((result) => {
      const account = accountResolver.resolve({ tenant_id: context.tenant_id, employee_id: result.employee_id });
      if (!account || !TOKENIZED_REF.test(account.tokenized_account_ref ?? "")) throw safeError("Tokenized payment account is required", "HRX_PAYROLL_PAYMENT_ACCOUNT_MISSING", 409);
      for (const field of ["account_number", "bank_code", "account_holder"]) requiredString(account, field);
      return Object.freeze({ employee_id: result.employee_id, amount_krw: result.net_krw, ...account });
    });
    const bytes = bankAdapter.render({ entries });
    return Object.freeze({ bundle, entries: Object.freeze(entries), bytes, checksum: hash(bytes) });
  }

  function bundle(context, batchId) {
    const batch = repository.getPaymentBatch(context, { payment_batch_id: batchId });
    if (!batch) throw safeError("Payment batch not found", "HRX_PAYROLL_PAYMENT_NOT_FOUND", 404);
    return Object.freeze({ batch, items: repository.listPaymentItems(context, { payment_batch_id: batchId }) });
  }

  function reconciliationSummary(current, { idempotentReplay = false } = {}) {
    const paidItems = current.items.filter((item) => item.state === "paid");
    const failedItems = current.items.filter((item) => item.state === "failed" && item.provider_result_state !== "unknown");
    const unknownItems = current.items.filter((item) => item.state === "failed" && item.provider_result_state === "unknown");
    const state = paidItems.length === current.items.length
      ? "succeeded"
      : paidItems.length > 0
        ? "partial_success"
        : failedItems.length === current.items.length
          ? "failed"
          : "unknown";
    return Object.freeze({
      batch: current.batch,
      items: Object.freeze(current.items),
      reconciliation_state: state,
      item_count: current.items.length,
      paid_count: paidItems.length,
      failed_count: failedItems.length,
      unknown_count: unknownItems.length,
      paid_total_krw: paidItems.reduce((sum, item) => sum + item.amount_krw, 0),
      retry_item_ids: Object.freeze([...failedItems, ...unknownItems].map((item) => item.payment_item_id)),
      idempotent_replay: idempotentReplay,
      production_ready_claim: false,
    });
  }

  function checkedOutcomes(targetItems, inputRows) {
    if (!Array.isArray(inputRows) || inputRows.length !== targetItems.length) throw safeError("Every payment item requires one bank outcome", "HRX_PAYROLL_PAYMENT_RECONCILIATION_INCOMPLETE", 409);
    const targetByEmployee = new Map(targetItems.map((item) => [item.employee_id, item]));
    const seen = new Set();
    const rows = inputRows.map((outcome) => {
      const employeeId = requiredString(outcome, "employee_id");
      if (seen.has(employeeId)) throw safeError("Payment outcome is duplicated", "HRX_PAYROLL_PAYMENT_OUTCOME_DUPLICATE", 409);
      seen.add(employeeId);
      if (!targetByEmployee.has(employeeId)) throw safeError("Payment outcome is outside the retry scope", "HRX_PAYROLL_PAYMENT_RETRY_SCOPE_INVALID", 409);
      if (!["paid", "failed", "unknown"].includes(outcome.state)) throw safeError("Payment outcome state is invalid", "HRX_PAYROLL_PAYMENT_RECONCILIATION_INCOMPLETE", 409);
      if (outcome.state === "paid") requiredString(outcome, "provider_receipt_ref");
      if (outcome.state === "failed") requiredString(outcome, "safe_error_code");
      return outcome;
    });
    return new Map(rows.map((row) => [row.employee_id, row]));
  }

  function reconciliationPlan(context, batchId, mode) {
    const current = bundle(context, batchId);
    if (mode === "initial" && current.batch.state !== "exported") {
      throw safeError("Exported payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    }
    if (mode === "retry" && current.batch.state !== "reconciled") {
      throw safeError("Reconciled payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    }
    const targetItems = mode === "initial"
      ? current.items
      : current.items.filter((item) => item.state === "failed");
    if (!targetItems.length) return Object.freeze({ current, target_items: Object.freeze([]), mode });
    if (mode === "retry"
      && targetItems.some((item) => Number(item.attempt_count ?? 0) >= providerBoundary.maximum_attempts)) {
      throw safeError("Provider retry limit exceeded", "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED", 409);
    }
    const scope = createPayrollPaymentReconciliationScope({ batch: current.batch, items: targetItems, mode });
    return Object.freeze({
      current,
      target_items: Object.freeze(targetItems),
      mode,
      scope,
      request_hash: scope.payload_hash.slice("sha256:".length),
    });
  }

  function prepareReconciliationClaim(context, input = {}, { plan: providedPlan = null } = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const mode = input.mode ?? "initial";
    if (!["initial", "retry"].includes(mode)) throw new TypeError("reconciliation mode is unsupported");
    const existingBundle = bundle(context, batchId);
    if (mode === "initial" && existingBundle.batch.state === "reconciled") {
      return Object.freeze({
        status: "completed",
        should_execute: false,
        payment: reconciliationSummary(existingBundle, { idempotentReplay: true }),
      });
    }
    const plan = providedPlan ?? reconciliationPlan(context, batchId, mode);
    if (!plan.target_items.length) {
      return Object.freeze({
        status: "completed",
        should_execute: false,
        payment: reconciliationSummary(plan.current, { idempotentReplay: true }),
      });
    }
    const operation = repository.getProviderOperation(context, {
      provider_kind: "bank",
      idempotency_key: plan.scope.idempotency_key,
    });
    return Object.freeze({
      status: "prepared",
      should_execute: false,
      operation,
      plan,
      lease_duration_ms: reconciliationLeaseMs,
      maximum_attempts: providerBoundary.maximum_attempts,
      provider_request: Object.freeze({
        tenant_id: context.tenant_id,
        operation: "bulk_transfer_reconcile",
        idempotency_key: plan.scope.idempotency_key,
        payload_hash: plan.scope.payload_hash,
        request_hash: plan.request_hash,
        attempt_count: operation?.attempt_count ?? 0,
      }),
    });
  }

  function validateProviderResult(context, plan, input) {
    const attemptCount = Math.max(0, ...plan.target_items.map((item) => Number(item.attempt_count ?? 0))) + 1;
    const receipt = assertHrxProviderReceiptForOperation(input.provider_receipt, {
      boundary: providerBoundary,
      tenant_id: context.tenant_id,
      operation: "bulk_transfer_reconcile",
      idempotency_key: plan.scope.idempotency_key,
      payload_hash: plan.scope.payload_hash,
      attempt_count: attemptCount,
    }).receipt;
    if (receipt.provider_kind !== "bank" || receipt.state !== "succeeded") {
      throw safeError("Successful bank receipt is required", "HRX_PAYROLL_PROVIDER_RECEIPT_REQUIRED", 409);
    }
    if (!Number.isInteger(input.reported_item_count) || input.reported_item_count !== plan.target_items.length) {
      throw safeError("Bank item count does not reconcile", "HRX_PAYROLL_PAYMENT_COUNT_MISMATCH", 409);
    }
    const outcomes = checkedOutcomes(plan.target_items, input.items);
    const paidTotal = plan.target_items.reduce((sum, item) => (
      sum + (outcomes.get(item.employee_id).state === "paid" ? item.amount_krw : 0)
    ), 0);
    if (!Number.isInteger(input.reported_paid_total_krw) || input.reported_paid_total_krw !== paidTotal) {
      throw safeError("Bank paid total does not reconcile", "HRX_PAYROLL_PAYMENT_TOTAL_MISMATCH", 409);
    }
    const providerSummary = summarizeHrxProviderItemOutcomes({
      items: plan.target_items.map((item) => {
        const outcome = outcomes.get(item.employee_id);
        return {
          item_ref: `provider-item:payment/${item.payment_item_id}`,
          state: outcome.state === "paid" ? "succeeded" : outcome.state,
          provider_receipt_ref: outcome.state === "paid" ? outcome.provider_receipt_ref : null,
          safe_error_code: outcome.state === "failed" ? outcome.safe_error_code : null,
        };
      }),
    });
    const resultPayload = {
      schema_version: HRX_PAYMENT_RECONCILIATION_RESULT_SCHEMA_VERSION,
      payment_batch_id: plan.current.batch.payment_batch_id,
      mode: plan.mode,
      idempotency_key: plan.scope.idempotency_key,
      request_hash: plan.request_hash,
      expected_batch_version: plan.current.batch.state_version,
      provider_receipt_ref: receipt.provider_receipt_ref,
      items: plan.target_items.map((item) => {
        const outcome = outcomes.get(item.employee_id);
        return {
          payment_item_id: item.payment_item_id,
          employee_id: item.employee_id,
          expected_version: item.state_version,
          provider_result_state: outcome.state === "paid" ? "succeeded" : outcome.state,
          provider_receipt_ref: outcome.state === "paid" ? outcome.provider_receipt_ref : null,
          safe_error_code: outcome.state === "failed" ? outcome.safe_error_code : null,
        };
      }).sort((left, right) => left.payment_item_id.localeCompare(right.payment_item_id)),
    };
    return Object.freeze({
      receipt,
      provider_summary: providerSummary,
      provider_response_hash: reconciliationRequestHash(input),
      result_payload: Object.freeze(resultPayload),
      result_payload_hash: hash(Buffer.from(JSON.stringify(stable(resultPayload)))),
    });
  }

  function claimReconciliation(context, input = {}, { resumePending = true, plan: providedPlan = null } = {}) {
    const prepared = prepareReconciliationClaim(context, input, { plan: providedPlan });
    if (prepared.status === "completed") return prepared;
    const plan = prepared.plan;
    let begun = repository.beginProviderOperation(context, {
      provider_kind: "bank",
      operation: "bulk_transfer_reconcile",
      idempotency_key: plan.scope.idempotency_key,
      request_hash: plan.request_hash,
      maximum_attempts: providerBoundary.maximum_attempts,
    });
    if (!begun.should_execute && begun.operation.state === "in_progress") {
      const lease = repository.expirePaymentReconciliationClaim(context, {
        idempotency_key: plan.scope.idempotency_key,
        request_hash: plan.request_hash,
        lease_duration_ms: reconciliationLeaseMs,
      });
      begun = Object.freeze({
        ...begun,
        operation: lease.operation,
        should_execute: false,
        idempotent_replay: true,
      });
    }
    const claim = Object.freeze({
      status: begun.should_execute ? "claimed" : begun.operation.state,
      should_execute: begun.should_execute,
      operation: begun.operation,
      plan,
      lease_duration_ms: reconciliationLeaseMs,
      provider_request: Object.freeze({
        tenant_id: context.tenant_id,
        operation: "bulk_transfer_reconcile",
        idempotency_key: plan.scope.idempotency_key,
        payload_hash: plan.scope.payload_hash,
        request_hash: plan.request_hash,
        attempt_count: begun.operation.attempt_count,
      }),
    });
    if (begun.operation.state === "pending" && resumePending) {
      const settled = repository.settlePaymentReconciliation(context, {
        idempotency_key: plan.scope.idempotency_key,
        request_hash: plan.request_hash,
      });
      return Object.freeze({
        status: "completed",
        should_execute: false,
        payment: reconciliationSummary(settled, { idempotentReplay: true }),
      });
    }
    if (begun.operation.state === "succeeded") {
      return Object.freeze({
        status: "completed",
        should_execute: false,
        payment: reconciliationSummary(
          bundle(context, plan.current.batch.payment_batch_id),
          { idempotentReplay: true },
        ),
      });
    }
    return claim;
  }

  function settleReconciliation(context, claim, input, validatedInput = null) {
    if (!claim?.should_execute || claim.status !== "claimed") {
      throw safeError("Bank reconciliation is already in progress", "HRX_PROVIDER_OPERATION_IN_PROGRESS", 409);
    }
    const validated = validatedInput ?? validateProviderResult(context, claim.plan, input);
    const staged = repository.stagePaymentReconciliationResult(context, {
      provider_kind: "bank",
      idempotency_key: claim.plan.scope.idempotency_key,
      request_hash: claim.plan.request_hash,
      provider_receipt_id: validated.receipt.receipt_id,
      provider_response_hash: validated.provider_response_hash,
      result_payload: validated.result_payload,
      result_payload_hash: validated.result_payload_hash,
      expected_version: claim.operation.state_version,
    });
    const settled = repository.settlePaymentReconciliation(context, {
      idempotency_key: claim.plan.scope.idempotency_key,
      request_hash: claim.plan.request_hash,
      provider_response_hash: validated.provider_response_hash,
    });
    return Object.freeze({
      ...reconciliationSummary(settled, { idempotentReplay: staged.idempotent_replay }),
      provider_result_state: validated.provider_summary.overall_state,
      retried_count: claim.plan.mode === "retry" ? claim.plan.target_items.length : 0,
    });
  }

  function validateReconciliationResult(context, claim, input) {
    const recovery = claim?.operation?.state === "unknown"
      && claim.operation.safe_error_code === HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED;
    if (!claim?.plan || (claim.status !== "claimed" && !recovery)) {
      throw safeError("Bank reconciliation claim is required", "HRX_PROVIDER_OPERATION_IN_PROGRESS", 409);
    }
    return validateProviderResult(context, claim.plan, input);
  }

  function recoverReconciliation(context, claim, input, validatedInput = null) {
    if (claim?.operation?.state !== "unknown"
      || claim.operation.safe_error_code !== HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED) {
      throw safeError(
        "Unknown bank result requiring reconciliation is required",
        "HRX_PAYROLL_RECONCILIATION_RECOVERY_STATE_INVALID",
        409,
      );
    }
    return settleReconciliation(context, Object.freeze({
      ...claim,
      status: "claimed",
      should_execute: true,
    }), input, validatedInput);
  }

  function failReconciliation(context, claim, error) {
    if (!claim?.operation || claim.operation.state !== "in_progress") return;
    const current = repository.getProviderOperation(context, {
      provider_kind: "bank",
      idempotency_key: claim.plan.scope.idempotency_key,
    });
    if (!current || current.state !== "in_progress") return;
    repository.completeProviderOperation(context, {
      provider_kind: "bank",
      idempotency_key: claim.plan.scope.idempotency_key,
      state: "unknown",
      safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
      expected_version: current.state_version,
    });
  }

  function reconcileResult(context, current, input, mode) {
    if (mode === "initial" && current.batch.state === "reconciled") {
      if (!input.provider_receipt) return reconciliationSummary(current, { idempotentReplay: true });
      const existing = repository.getProviderOperation(context, {
        provider_kind: "bank",
        idempotency_key: requiredString(input.provider_receipt, "idempotency_key"),
      });
      if (!existing) throw safeError("Payment batch is already reconciled", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
      const providerResponseHash = reconciliationRequestHash(input);
      if (existing.provider_response_hash && existing.provider_response_hash !== providerResponseHash) {
        throw safeError("Provider result conflicts with the staged reconciliation", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      if (existing.state === "succeeded") return reconciliationSummary(current, { idempotentReplay: true });
      if (existing.state === "pending") {
        const settled = repository.settlePaymentReconciliation(context, {
          idempotency_key: existing.idempotency_key,
          request_hash: existing.request_hash,
          provider_response_hash: providerResponseHash,
        });
        return reconciliationSummary(settled, { idempotentReplay: true });
      }
      throw safeError("Bank reconciliation is already in progress", "HRX_PROVIDER_OPERATION_IN_PROGRESS", 409);
    }
    const plan = reconciliationPlan(context, current.batch.payment_batch_id, mode);
    if (!plan.target_items.length) return reconciliationSummary(current, { idempotentReplay: true });
    const validated = validateProviderResult(context, plan, input);
    const claim = claimReconciliation(context, {
      payment_batch_id: current.batch.payment_batch_id,
      mode,
    }, { resumePending: false, plan });
    if (claim.status === "pending") {
      if (claim.operation.provider_response_hash !== validated.provider_response_hash) {
        throw safeError("Provider result conflicts with the staged reconciliation", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT", 409);
      }
      const settled = repository.settlePaymentReconciliation(context, {
        idempotency_key: claim.plan.scope.idempotency_key,
        request_hash: claim.plan.request_hash,
        provider_response_hash: validated.provider_response_hash,
      });
      return Object.freeze({
        ...reconciliationSummary(settled, { idempotentReplay: true }),
        provider_result_state: validated.provider_summary.overall_state,
        retried_count: mode === "retry" ? plan.target_items.length : 0,
      });
    }
    if (!claim.should_execute) {
      if (claim.operation?.state === "unknown"
        && claim.operation.safe_error_code === HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED) {
        return recoverReconciliation(context, claim, input, validated);
      }
      throw safeError("Bank reconciliation is already in progress", "HRX_PROVIDER_OPERATION_IN_PROGRESS", 409);
    }
    return settleReconciliation(context, claim, input, validated);
  }

  function prepare(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const closedRun = requireClosedRun(context, runId);
    payableResults(closedRun);
    const existing = repository.listPaymentBatches(context, { run_id: runId, bank_format_code: bankAdapter.format_code })[0];
    if (existing) return bundle(context, existing.payment_batch_id);
    const rendered = render(context, runId);
    const batch = repository.createPaymentBatch(context, { run_id: runId, bank_format_code: bankAdapter.format_code, checksum: rendered.checksum });
    for (const entry of rendered.entries) {
      repository.addPaymentItem(context, { payment_batch_id: batch.payment_batch_id, employee_id: entry.employee_id, tokenized_account_ref: entry.tokenized_account_ref, amount_krw: entry.amount_krw });
    }
    return bundle(context, batch.payment_batch_id);
  }

  function approve(context, input = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const current = bundle(context, batchId);
    const run = repository.getRun(context, { run_id: current.batch.run_id });
    if (context.actor_id === run.approved_by_actor_id) throw safeError("Payroll approver cannot approve its payment batch", "HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION", 403);
    verifyStepUp(context, batchId, input.step_up_receipt, clock());
    const batch = repository.transitionPaymentBatch(context, { payment_batch_id: batchId, state: "approved", expected_version: input.expected_version ?? current.batch.state_version });
    return Object.freeze({ batch, items: current.items });
  }

  async function exportBatch(context, input = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const current = bundle(context, batchId);
    if (current.batch.state !== "approved") throw safeError("Approved payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    const rendered = render(context, current.batch.run_id);
    if (rendered.checksum !== current.batch.checksum) throw safeError("Payment batch checksum changed", "HRX_PAYROLL_PAYMENT_TAMPERED", 409);
    const artifact = await artifactVault.put({ tenant_id: context.tenant_id, object_id: `payroll/${current.batch.run_id}/payment-${rendered.checksum}.csv`, bytes: rendered.bytes, content_type: "text/csv;charset=utf-8" });
    const batch = repository.transitionPaymentBatch(context, { payment_batch_id: batchId, state: "exported", expected_version: current.batch.state_version, artifact_ref: artifact.document_ref });
    const items = current.items.map((item) => repository.transitionPaymentItem(context, { payment_item_id: item.payment_item_id, state: "exported", expected_version: item.state_version }));
    return Object.freeze({
      batch,
      items: Object.freeze(items),
      artifact_ref: artifact.document_ref,
      artifact_hash: artifact.document_hash,
      byte_size: artifact.byte_size,
      mime_type: artifact.content_type,
      production_ready_claim: false,
    });
  }

  function reconcile(context, input = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const current = bundle(context, batchId);
    if (current.batch.state === "reconciled") {
      if (!input.provider_receipt) return reconciliationSummary(current, { idempotentReplay: true });
      const existing = repository.getProviderOperation(context, {
        provider_kind: "bank",
        idempotency_key: requiredString(input.provider_receipt, "idempotency_key"),
      });
      if (!existing) throw safeError("Payment batch is already reconciled", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
      return reconcileResult(context, current, input, "initial");
    }
    if (current.batch.state !== "exported") throw safeError("Exported payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    return reconcileResult(context, current, input, "initial");
  }

  function retryFailed(context, input = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const current = bundle(context, batchId);
    if (current.batch.state !== "reconciled") throw safeError("Reconciled payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    return reconcileResult(context, current, input, "retry");
  }

  return Object.freeze({
    prepare,
    bundle,
    approve,
    exportBatch,
    reconcile,
    retryFailed,
    reconciliationSummary,
    prepareReconciliationClaim,
    claimReconciliation,
    validateReconciliationResult,
    settleReconciliation,
    recoverReconciliation,
    failReconciliation,
  });
}
