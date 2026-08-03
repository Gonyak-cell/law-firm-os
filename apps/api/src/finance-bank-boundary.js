import { importBankTransactionBatch } from "../../../packages/billing/src/bank-transaction-service.js";
import {
  BANK_CLASSIFICATION_CATEGORIES,
  autoClassifyBankTransactions,
  bankEmployeePayrollCategory,
  reviewBankTransactionClassifications,
  summarizeBankTransactionClassifications,
} from "../../../packages/billing/src/bank-classification-service.js";
import { confirmBankReceipt } from "../../../packages/payments/src/payment-service.js";
import {
  listAmicBankClassificationEmployees,
  listBankClassificationClientRecords,
} from "./amic-bank-classification-directory.js";

export {
  BANK_CLASSIFICATION_CATEGORIES,
  listAmicBankClassificationEmployees,
  summarizeBankTransactionClassifications,
};

export function sanitizeBankTransaction(record = {}) {
  const { source_refs, transaction_fingerprint, ...safe } = record;
  return Object.freeze({
    ...safe,
    source_metadata_included: false,
    transaction_fingerprint_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

export function sanitizeBankImportBatch(record = {}) {
  const { source_manifest_hash, source_hashes, ...safe } = record;
  return Object.freeze({
    ...safe,
    source_hashes_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

export function classificationDirectories(runtime = {}, tenantId) {
  const clientRecords = runtime.clientRecords
    ?? listBankClassificationClientRecords(
      runtime.masterDataRepository,
      tenantId,
      runtime.matterRepository,
    );
  return Object.freeze({
    clientRecords,
    employees: runtime.employeeRepository
      ? listAmicBankClassificationEmployees({
          repository: runtime.employeeRepository,
          tenantId,
        })
      : runtime.employees ?? Object.freeze([]),
  });
}

export function sanitizeBankClassification(record = {}, transaction = {}, directories = {}) {
  const { normalized_match_value, ...safeClassification } = record;
  const employee = (directories.employees ?? []).find((candidate) => candidate.employee_id === record.employee_id);
  const client = (directories.clientRecords ?? []).find((candidate) => (
    candidate.model_type === "ClientGroup" && candidate.client_group_id === record.client_group_id
  ));
  const safeTransaction = sanitizeBankTransaction(transaction);
  return Object.freeze({
    ...safeTransaction,
    ...safeClassification,
    category_label: BANK_CLASSIFICATION_CATEGORIES[record.category]?.label ?? record.category_label,
    client_group_label: client?.display_name ?? client?.canonical_display_name ?? null,
    employee_label: employee?.display_name ?? null,
    employee_title: employee?.title ?? null,
    source_metadata_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

/**
 * Finance runtime boundary for bank import. The caller owns authorization and
 * response envelopes; the domain service keeps provenance, transaction,
 * idempotency, audit, and append-only mutation semantics.
 */
export function runFinanceBankImport({ repository, body, actor_id, idempotency_key } = {}) {
  return importBankTransactionBatch({
    repository,
    bank_import_batch: body?.bank_import_batch,
    transactions: body?.transactions,
    actor_id,
    idempotency_key,
  });
}

/**
 * Finance runtime boundary for automatic bank classification. Directories are
 * resolved once per request so Matter-backed clients and HRX employees remain
 * the same source used by the list/options read paths.
 */
export function runFinanceBankClassificationAuto({
  repository,
  runtime,
  tenant_id,
  actor_id,
  idempotency_key,
} = {}) {
  const directories = classificationDirectories(runtime, tenant_id);
  return autoClassifyBankTransactions({
    repository,
    tenant_id,
    client_records: directories.clientRecords,
    employees: directories.employees,
    actor_id,
    idempotency_key,
  });
}

/**
 * Finance runtime boundary for reviewed classification and its explicit bank
 * receipt confirmation. A client receipt creates only an unallocated Payment;
 * revenue remains `none_until_allocated` until a separate allocation workflow.
 */
export function runFinanceBankClassificationReview({
  repository,
  runtime,
  tenant_id,
  decisions = [],
  actor_id,
  idempotency_key,
} = {}) {
  const directories = classificationDirectories(runtime, tenant_id);
  const clientIds = new Set(directories.clientRecords
    .filter((record) => record.model_type === "ClientGroup")
    .map((record) => record.client_group_id));
  const employeeIds = new Set(directories.employees.map((record) => record.employee_id));
  const normalizedDecisions = decisions.map((decision) => {
    if (decision.category === "client_receipt" && !clientIds.has(decision.client_group_id)) {
      throw new TypeError("A registered client is required");
    }
    if (decision.employee_id && !employeeIds.has(decision.employee_id)) {
      throw new TypeError("A registered employee is required");
    }
    const employee = directories.employees.find((record) => record.employee_id === decision.employee_id);
    return {
      ...decision,
      ...(decision.category === "salary_payment"
        ? { payroll_category: employee ? bankEmployeePayrollCategory(employee) : "unclassified" }
        : {}),
    };
  });
  const result = reviewBankTransactionClassifications({
    repository,
    tenant_id,
    decisions: normalizedDecisions,
    actor_id,
    idempotency_key,
  });
  const confirmedPayments = normalizedDecisions
    .filter((decision) => decision.category === "client_receipt")
    .map((decision) => confirmBankReceipt({
      repository,
      bank_transaction_id: decision.bank_transaction_id,
      payment: {
        payment_id: `payment:bank:${decision.bank_transaction_id}`,
        tenant_id,
        client_group_id: decision.client_group_id,
        matter_id: decision.matter_id ?? null,
      },
      actor_id,
      idempotency_key: `${idempotency_key}:payment:${decision.bank_transaction_id}`,
    }).payment);
  return Object.freeze({
    result,
    decisions: Object.freeze(normalizedDecisions),
    confirmedPayments: Object.freeze(confirmedPayments),
  });
}
