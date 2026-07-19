import { createHash } from "node:crypto";
import { createHrxProviderReceipt } from "../provider-receipt-contract.js";
import { createEncryptedPayrollArtifactVault } from "./document-service.js";
import { createPayrollStepUpReceipt } from "./run-service.js";

const TOKENIZED_REF = /^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

export function createPayrollPaymentService({
  repository,
  accountResolver,
  bankAdapter = createSyntheticPayrollBankAdapter(),
  artifactVault = createEncryptedPayrollArtifactVault({ allowSyntheticSecret: true }),
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository || typeof accountResolver?.resolve !== "function") throw new TypeError("payroll payment service requires repository and accountResolver");

  function requireClosedRun(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw safeError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw safeError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    return bundle;
  }

  function render(context, runId) {
    const bundle = requireClosedRun(context, runId);
    const entries = bundle.results.map((result) => {
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

  function prepare(context, input = {}) {
    const runId = requiredString(input, "run_id");
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
    return Object.freeze({ batch, items: Object.freeze(items), filename: `${current.batch.run_id}-bank-transfer.csv`, mime_type: "text/csv;charset=utf-8", content_base64: rendered.bytes.toString("base64"), checksum: rendered.checksum, production_ready_claim: false });
  }

  function reconcile(context, input = {}) {
    const batchId = requiredString(input, "payment_batch_id");
    const current = bundle(context, batchId);
    if (current.batch.state !== "exported") throw safeError("Exported payment batch is required", "HRX_PAYROLL_PAYMENT_STATE_INVALID", 409);
    const receipt = createHrxProviderReceipt(input.provider_receipt);
    if (receipt.provider_kind !== "bank" || receipt.state !== "succeeded") throw safeError("Successful bank receipt is required", "HRX_PAYROLL_PROVIDER_RECEIPT_REQUIRED", 409);
    const outcomes = new Map((input.items ?? []).map((row) => [row.employee_id, row]));
    const paidTotal = current.items.reduce((sum, item) => {
      const outcome = outcomes.get(item.employee_id);
      if (!outcome || !["paid", "failed"].includes(outcome.state)) throw safeError("Every payment item requires a bank outcome", "HRX_PAYROLL_PAYMENT_RECONCILIATION_INCOMPLETE", 409);
      if (outcome.state === "paid") requiredString(outcome, "provider_receipt_ref");
      return sum + (outcome.state === "paid" ? item.amount_krw : 0);
    }, 0);
    if (!Number.isInteger(input.reported_paid_total_krw) || input.reported_paid_total_krw !== paidTotal) throw safeError("Bank paid total does not reconcile", "HRX_PAYROLL_PAYMENT_TOTAL_MISMATCH", 409);
    const items = current.items.map((item) => {
      const outcome = outcomes.get(item.employee_id);
      return repository.transitionPaymentItem(context, {
        payment_item_id: item.payment_item_id,
        state: outcome.state,
        expected_version: item.state_version,
        ...(outcome.state === "paid" ? { provider_receipt_ref: requiredString(outcome, "provider_receipt_ref") } : {}),
      });
    });
    const batch = repository.transitionPaymentBatch(context, { payment_batch_id: batchId, state: "reconciled", expected_version: current.batch.state_version, provider_receipt_ref: receipt.provider_receipt_ref });
    return Object.freeze({ batch, items: Object.freeze(items), paid_total_krw: paidTotal, failed_count: items.filter((row) => row.state === "failed").length });
  }

  return Object.freeze({ prepare, bundle, approve, exportBatch, reconcile });
}
