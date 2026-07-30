import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  createRecordDomainDescriptor,
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import { createFinanceRepository, FINANCE_PRIMARY_ID_FIELDS } from "./finance-repository.js";
import { normalizeClientDepositAllocation } from "./client-deposit-allocation-model.js";
import { normalizeFeeCommitment } from "./fee-commitment-model.js";

export const FINANCE_APPEND_ONLY_RECORD_TYPES = Object.freeze([
  "ARAgingSnapshot",
  "BankImportBatch",
  "BankTransaction",
  "BillingAdjustment",
  "InvoiceCorrection",
  "InvoiceLine",
  "JournalEntry",
  "PaymentMatch",
  "SettlementRun",
  "TaxExport",
  "TaxInvoice",
  "TrustLedgerEntry",
  "WipSnapshot",
].sort());

export const FINANCE_MUTABLE_RECORD_TYPES = Object.freeze(
  Object.keys(FINANCE_PRIMARY_ID_FIELDS)
    .filter((recordType) => !FINANCE_APPEND_ONLY_RECORD_TYPES.includes(recordType))
    .sort(),
);

const MONEY_FIELDS = Object.freeze({
  ARAgingSnapshot: ["bucket_current", "bucket_1_30", "bucket_31_60", "bucket_61_90", "bucket_90_plus"],
  ARBalance: ["balance"],
  AccountingExport: ["debit_total", "credit_total"],
  BillingAdjustment: ["amount"],
  BankTransaction: ["amount", "balance_after"],
  BankTransactionClassification: ["amount"],
  ClientDepositAllocation: ["allocated_amount", "reversed_amount"],
  Disbursement: ["amount"],
  Expense: ["amount"],
  FeeArrangement: ["fixed_fee_amount", "upfront_fee_amount", "success_fee_amount", "retainer_amount", "retainer_available_amount"],
  FeeCommitment: ["agreed_amount"],
  Invoice: ["amount_due", "amount_paid", "standard_amount", "retainer_drawdown_total", "trust_drawdown_amount"],
  InvoiceCorrection: ["corrected_amount_due"],
  InvoiceLine: ["amount", "standard_amount", "retainer_drawdown_amount"],
  Payment: ["amount", "applied_amount", "unapplied_amount"],
  PaymentMatch: ["amount", "payment_available_before", "invoice_outstanding_before", "unapplied_amount_after"],
  PreBill: ["total_amount", "standard_amount", "adjustment_total", "retainer_drawdown_total"],
  TrustBalance: ["available_balance", "deposit_total", "drawdown_total", "refund_total", "refund_liability_amount"],
  TrustLedgerEntry: ["amount", "drawdown_amount", "refund_liability_delta"],
  WipItem: ["amount", "standard_amount", "retainer_drawdown_amount"],
  WipSnapshot: ["total_amount", "standard_amount", "retainer_drawdown_total"],
});

function reference(reference_name, target_record_type, target_record_id, options = {}) {
  if (target_record_id === undefined || target_record_id === null || target_record_id === "") return null;
  return {
    reference_name,
    target_domain_id: options.target_domain_id,
    target_record_type,
    target_record_id,
    required: options.required === true,
  };
}

function references(record) {
  const values = [];
  const add = (...args) => {
    const value = reference(...args);
    if (value) values.push(value);
  };
  add("matter", "Matter", record.matter_id, { target_domain_id: "matter" });
  add("billing_client_party", "Party", record.billing_client_party_id, { target_domain_id: "master-data" });
  add("client_group", "ClientGroup", record.client_group_id, {
    target_domain_id: "master-data",
    required: ["ClientDepositAllocation", "FeeCommitment"].includes(record.model_type),
  });
  add("receipt_document", "Document", record.receipt_document_id, { target_domain_id: "dms" });
  add("employee", "Employee", record.employee_id, { target_domain_id: "hrx" });

  if (record.model_type === "FeeArrangement") add("rate_card", "RateCard", record.rate_card_id, { required: true });
  if (record.model_type === "WipItem") {
    const sourceTypes = { TimeEntry: "TimeEntry", Expense: "Expense", Disbursement: "Disbursement" };
    add("source", sourceTypes[record.source_model_type], record.source_id, { required: true });
    add("fee_arrangement", "FeeArrangement", record.fee_arrangement_id);
  }
  if (record.model_type === "WipSnapshot") {
    for (const itemId of record.item_refs ?? []) add("wip_item", "WipItem", itemId, { required: true });
  }
  if (record.model_type === "PreBill") add("wip_snapshot", "WipSnapshot", record.wip_snapshot_id, { required: true });
  if (record.model_type === "BillingAdjustment") add("prebill", "PreBill", record.prebill_id, { required: true });
  if (["Invoice", "InvoiceLine"].includes(record.model_type)) add("prebill", "PreBill", record.prebill_id);
  if (record.model_type === "InvoiceLine") add("invoice", "Invoice", record.invoice_id);
  if (["TaxInvoice", "InvoiceCorrection", "ARBalance"].includes(record.model_type)) {
    add("invoice", "Invoice", record.invoice_id, { required: true });
  }
  if (record.model_type === "PaymentMatch") {
    add("payment", "Payment", record.payment_id, { required: true });
    add("invoice", "Invoice", record.invoice_id, { required: true });
  }
  if (record.model_type === "AccountingExport") {
    for (const journalId of record.journal_entry_refs ?? []) add("journal_entry", "JournalEntry", journalId, { required: true });
  }
  if (record.model_type === "TaxExport") {
    for (const taxInvoiceId of record.tax_invoice_refs ?? []) add("tax_invoice", "TaxInvoice", taxInvoiceId, { required: true });
  }
  if (record.model_type === "TrustLedgerEntry" && record.invoice_id) {
    add("invoice", "Invoice", record.invoice_id, { required: record.entry_type === "drawdown" });
  }
  if (record.model_type === "SettlementRun") {
    for (const paymentMatchId of record.payment_match_refs ?? []) add("payment_match", "PaymentMatch", paymentMatchId, { required: true });
  }
  if (record.model_type === "BankTransaction") {
    add("bank_import_batch", "BankImportBatch", record.bank_import_batch_id, { required: true });
  }
  if (record.model_type === "BankTransactionClassification") {
    add("bank_transaction", "BankTransaction", record.bank_transaction_id, { required: true });
    add("refund_origin_bank_transaction", "BankTransaction", record.refund_of_bank_transaction_id, {
      required: record.category === "refund_reversal",
    });
  }
  if (record.model_type === "FeeCommitment") {
    add("opportunity", "Opportunity", record.opportunity_id, {
      target_domain_id: "crm",
      required: true,
    });
    add("source_fee_arrangement", "FeeArrangement", record.source_fee_arrangement_id, {
      required: true,
    });
  }
  if (record.model_type === "ClientDepositAllocation") {
    add("bank_transaction", "BankTransaction", record.bank_transaction_id, {
      required: true,
    });
    add(
      "bank_transaction_classification",
      "BankTransactionClassification",
      record.bank_transaction_classification_id,
      { required: true },
    );
    add("fee_commitment", "FeeCommitment", record.fee_commitment_id, {
      required: true,
    });
  }
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "Invoice" && record.invoice_number) {
    return `invoice-number:${hashDomainValue(record.invoice_number)}`;
  }
  if (record.model_type === "TaxInvoice" && record.tax_invoice_number) {
    return `tax-invoice-number:${hashDomainValue(record.tax_invoice_number)}`;
  }
  if (record.model_type === "Payment" && record.bank_reference) {
    return `payment-bank-reference:${hashDomainValue(record.bank_reference)}`;
  }
  if (record.model_type === "ARBalance" && record.invoice_id) {
    return `ar-invoice:${hashDomainValue(record.invoice_id)}`;
  }
  if (record.model_type === "TrustBalance" && record.matter_id && record.currency) {
    return `trust-balance:${hashDomainValue({ matter_id: record.matter_id, currency: record.currency })}`;
  }
  if (record.model_type === "BankImportBatch" && record.source_manifest_hash) {
    return `bank-import-manifest:${hashDomainValue(record.source_manifest_hash)}`;
  }
  if (record.model_type === "BankTransaction" && record.transaction_fingerprint) {
    return `bank-transaction:${hashDomainValue(record.transaction_fingerprint)}`;
  }
  return null;
}

export const FINANCE_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "finance",
  resolve_record_id(record) {
    const field = FINANCE_PRIMARY_ID_FIELDS[record.model_type];
    return field ? record[field] : record.resource_id ?? record.id;
  },
  unique_key: uniqueKey,
  append_only: (record) => FINANCE_APPEND_ONLY_RECORD_TYPES.includes(record.model_type),
  references,
  pii_fields: [
    "narrative",
    "bank_reference",
    "billing_client_party_id",
    "employee_id",
    "receipt_document_id",
    "vendor_ref",
    "lines",
    "csv_text",
    "counterparty",
    "memo",
    "reason",
    "source_refs",
  ],
  primary_key_fields: Object.values(FINANCE_PRIMARY_ID_FIELDS),
  unique_rules: [
    "Invoice.invoice_number",
    "TaxInvoice.tax_invoice_number",
    "Payment.bank_reference_hash",
    "ARBalance.invoice_id",
    "TrustBalance.matter_id+currency",
    "BankImportBatch.source_manifest_hash",
    "BankTransaction.transaction_fingerprint",
  ],
  reference_rules: [
    "WipItem.source_id->TimeEntry|Expense|Disbursement",
    "WipSnapshot.item_refs->WipItem",
    "PreBill.wip_snapshot_id->WipSnapshot",
    "Invoice.prebill_id->PreBill",
    "PaymentMatch.payment_id->Payment",
    "PaymentMatch.invoice_id->Invoice",
    "ARBalance.invoice_id->Invoice",
    "TrustLedgerEntry.invoice_id->Invoice",
    "BankTransaction.bank_import_batch_id->BankImportBatch",
    "BankTransactionClassification.bank_transaction_id->BankTransaction",
    "BankTransactionClassification.refund_of_bank_transaction_id->BankTransaction",
    "FeeCommitment.client_group_id->master-data.ClientGroup",
    "FeeCommitment.opportunity_id->crm.Opportunity",
    "FeeCommitment.source_fee_arrangement_id->FeeArrangement",
    "ClientDepositAllocation.client_group_id->master-data.ClientGroup",
    "ClientDepositAllocation.bank_transaction_id->BankTransaction",
    "ClientDepositAllocation.bank_transaction_classification_id->BankTransactionClassification",
    "ClientDepositAllocation.fee_commitment_id->FeeCommitment",
    "*.matter_id->matter.Matter",
    "*.billing_client_party_id->master-data.Party",
  ],
});

function money(value, label) {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number * 100 - Math.round(number * 100)) > 0.000001) {
    throw Object.assign(new TypeError(`${label} must be finite with at most two decimal places`), {
      safe_error_code: "FINANCE_MONEY_INVARIANT_FAILED",
      status: 409,
    });
  }
  return Math.round(number * 100) / 100;
}

function recordsOf(records, recordType) {
  return records.filter((record) => record.model_type === recordType);
}

function indexBy(records, recordType, field) {
  return new Map(recordsOf(records, recordType).map((record) => [record[field], record]));
}

function tenantIndex(records, recordType, field) {
  return new Map(recordsOf(records, recordType).map((record) => [
    `${record.tenant_id}:${record[field]}`,
    record,
  ]));
}

function assertEqualMoney(actual, expected, label) {
  if (Math.abs(money(actual, label) - money(expected, label)) > 0.001) {
    throw Object.assign(new Error(`${label} does not reconcile`), {
      safe_error_code: "FINANCE_RECONCILIATION_FAILED",
      status: 409,
    });
  }
}

function allocationInvariant(message) {
  return Object.assign(new Error(message), {
    safe_error_code: "FINANCE_DEPOSIT_ALLOCATION_INVARIANT_FAILED",
    status: 409,
  });
}

function positiveWholeKrw(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw allocationInvariant(`${label} must be a positive whole KRW amount`);
  }
  return value;
}

function addWholeKrw(left, right, label) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw allocationInvariant(`${label} exceeds the supported KRW range`);
  }
  return total;
}

function addAllocationTotal(totals, key, amount, label) {
  const total = addWholeKrw(totals.get(key) ?? 0, amount, label);
  totals.set(key, total);
  return total;
}

export function reconcileFinanceRecords(records = []) {
  const values = records.map((record) => structuredClone(record));
  let moneyFieldCount = 0;
  let moneyTotal = 0;
  let currencyMismatchCount = 0;
  let timeMinutes = 0;
  for (const record of values) {
    if (record.model_type === "FeeCommitment") normalizeFeeCommitment(record);
    if (record.currency && record.currency !== "KRW") currencyMismatchCount += 1;
    for (const field of MONEY_FIELDS[record.model_type] ?? []) {
      if (record[field] === undefined || record[field] === null) continue;
      moneyTotal = money(moneyTotal + money(record[field], `${record.model_type}.${field}`), "money_total");
      moneyFieldCount += 1;
    }
    if (record.model_type === "TimeEntry") {
      if (!Number.isInteger(record.duration_minutes) || record.duration_minutes <= 0) {
        throw Object.assign(new TypeError("TimeEntry.duration_minutes must be a positive integer"), {
          safe_error_code: "FINANCE_TIME_INVARIANT_FAILED",
          status: 409,
        });
      }
      timeMinutes += record.duration_minutes;
    }
    if (record.model_type === "Invoice" && money(record.amount_paid, "Invoice.amount_paid") > money(record.amount_due, "Invoice.amount_due")) {
      throw Object.assign(new Error("Invoice.amount_paid cannot exceed amount_due"), {
        safe_error_code: "FINANCE_RECONCILIATION_FAILED",
        status: 409,
      });
    }
    if (record.model_type === "JournalEntry") {
      const debit = (record.lines ?? []).reduce((total, line) => total + money(line.debit, "JournalEntry.line.debit"), 0);
      const credit = (record.lines ?? []).reduce((total, line) => total + money(line.credit, "JournalEntry.line.credit"), 0);
      assertEqualMoney(debit, credit, "JournalEntry debit and credit");
    }
  }
  if (currencyMismatchCount > 0) {
    throw Object.assign(new Error("Finance source contains a non-KRW currency"), {
      safe_error_code: "FINANCE_CURRENCY_INVARIANT_FAILED",
      status: 409,
      mismatch_count: currencyMismatchCount,
    });
  }

  const wipItems = indexBy(values, "WipItem", "wip_item_id");
  for (const snapshot of recordsOf(values, "WipSnapshot")) {
    const total = (snapshot.item_refs ?? []).reduce((sum, itemId) => sum + money(wipItems.get(itemId)?.amount, "WipItem.amount"), 0);
    assertEqualMoney(snapshot.total_amount, total, "WipSnapshot.total_amount");
  }

  const invoices = indexBy(values, "Invoice", "invoice_id");
  const prebills = indexBy(values, "PreBill", "prebill_id");
  for (const balance of recordsOf(values, "ARBalance")) {
    const invoice = invoices.get(balance.invoice_id);
    assertEqualMoney(
      balance.balance,
      Math.max(0, money(invoice?.amount_due, "Invoice.amount_due") - money(invoice?.amount_paid, "Invoice.amount_paid")),
      "ARBalance.balance",
    );
  }

  const trustEntries = recordsOf(values, "TrustLedgerEntry");
  for (const balance of recordsOf(values, "TrustBalance")) {
    const entries = trustEntries.filter((entry) => entry.matter_id === balance.matter_id && entry.currency === balance.currency);
    const deposits = entries.filter((entry) => entry.entry_type === "deposit").reduce((sum, entry) => sum + money(entry.amount, "TrustLedgerEntry.amount"), 0);
    const drawdowns = entries.filter((entry) => entry.entry_type === "drawdown").reduce((sum, entry) => sum + money(entry.amount, "TrustLedgerEntry.amount"), 0);
    const refunds = entries.filter((entry) => entry.entry_type === "refund_liability").reduce((sum, entry) => sum + money(entry.amount, "TrustLedgerEntry.amount"), 0);
    assertEqualMoney(balance.deposit_total, deposits, "TrustBalance.deposit_total");
    assertEqualMoney(balance.drawdown_total, drawdowns, "TrustBalance.drawdown_total");
    assertEqualMoney(balance.refund_total, refunds, "TrustBalance.refund_total");
    assertEqualMoney(balance.available_balance, deposits - drawdowns - refunds, "TrustBalance.available_balance");
  }

  const allocations = recordsOf(values, "ClientDepositAllocation");
  const bankTransactions = tenantIndex(
    values,
    "BankTransaction",
    "bank_transaction_id",
  );
  const bankClassifications = tenantIndex(
    values,
    "BankTransactionClassification",
    "bank_transaction_classification_id",
  );
  const feeCommitments = tenantIndex(
    values,
    "FeeCommitment",
    "fee_commitment_id",
  );
  const activeByTransaction = new Map();
  const activeByCommitment = new Map();
  let allocationAmountTotal = 0;
  let reversedAmountTotal = 0;
  for (const rawAllocation of allocations) {
    const allocation = normalizeClientDepositAllocation(rawAllocation);
    const transactionKey =
      `${allocation.tenant_id}:${allocation.bank_transaction_id}`;
    const classificationKey =
      `${allocation.tenant_id}:${allocation.bank_transaction_classification_id}`;
    const commitmentKey =
      `${allocation.tenant_id}:${allocation.fee_commitment_id}`;
    const transaction = bankTransactions.get(transactionKey);
    const classification = bankClassifications.get(classificationKey);
    const commitment = feeCommitments.get(commitmentKey);
    if (!transaction || !classification || !commitment) {
      throw allocationInvariant(
        `ClientDepositAllocation references are incomplete: ${allocation.client_deposit_allocation_id}`,
      );
    }
    const transactionAmount = positiveWholeKrw(
      transaction.amount,
      "BankTransaction.amount",
    );
    const classificationAmount = positiveWholeKrw(
      classification.amount,
      "BankTransactionClassification.amount",
    );
    if (
      transaction.direction !== "inflow"
      || transaction.status !== "posted"
      || transaction.currency !== "KRW"
      || classification.bank_transaction_id !== allocation.bank_transaction_id
      || classification.transaction_direction !== "inflow"
      || classification.currency !== "KRW"
      || classification.category !== "client_receipt"
      || classification.status !== "confirmed"
      || classificationAmount !== transactionAmount
      || classification.client_group_id !== allocation.client_group_id
      || commitment.client_group_id !== allocation.client_group_id
      || commitment.currency !== "KRW"
    ) {
      throw allocationInvariant(
        `ClientDepositAllocation tenant, client, or source does not reconcile: ${allocation.client_deposit_allocation_id}`,
      );
    }
    if (
      commitment.agreed_amount === null
      || positiveWholeKrw(
        commitment.agreed_amount,
        "FeeCommitment.agreed_amount",
      ) < allocation.allocated_amount
      || transactionAmount < allocation.allocated_amount
    ) {
      throw allocationInvariant(
        `ClientDepositAllocation amount exceeds its source or commitment: ${allocation.client_deposit_allocation_id}`,
      );
    }
    const activeAmount = allocation.allocated_amount - allocation.reversed_amount;
    addAllocationTotal(
      activeByTransaction,
      transactionKey,
      activeAmount,
      "active allocation total by BankTransaction",
    );
    addAllocationTotal(
      activeByCommitment,
      commitmentKey,
      activeAmount,
      "active allocation total by FeeCommitment",
    );
    allocationAmountTotal = addWholeKrw(
      allocationAmountTotal,
      allocation.allocated_amount,
      "allocated amount total",
    );
    reversedAmountTotal = addWholeKrw(
      reversedAmountTotal,
      allocation.reversed_amount,
      "reversed amount total",
    );
  }
  for (const [key, activeAmount] of activeByTransaction) {
    const transactionAmount = positiveWholeKrw(
      bankTransactions.get(key)?.amount,
      "BankTransaction.amount",
    );
    if (activeAmount > transactionAmount) {
      throw allocationInvariant(`Active allocations exceed BankTransaction.amount: ${key}`);
    }
  }
  for (const [key, activeAmount] of activeByCommitment) {
    const agreedAmount = feeCommitments.get(key)?.agreed_amount;
    if (
      agreedAmount === null
      || activeAmount > positiveWholeKrw(agreedAmount, "FeeCommitment.agreed_amount")
    ) {
      throw allocationInvariant(`Active allocations exceed FeeCommitment.agreed_amount: ${key}`);
    }
  }

  const summary = {
    record_count: values.length,
    money_field_count: moneyFieldCount,
    money_total_krw: moneyTotal,
    time_minutes: timeMinutes,
    wip_item_count: recordsOf(values, "WipItem").length,
    wip_snapshot_count: recordsOf(values, "WipSnapshot").length,
    invoice_count: invoices.size,
    invoice_prebill_reference_count: recordsOf(values, "Invoice").filter((record) => record.prebill_id).length,
    invoice_prebill_matched_count: recordsOf(values, "Invoice").filter((record) => prebills.has(record.prebill_id)).length,
    invoice_prebill_missing_count: recordsOf(values, "Invoice").filter((record) => record.prebill_id && !prebills.has(record.prebill_id)).length,
    ar_balance_count: recordsOf(values, "ARBalance").length,
    payment_match_count: recordsOf(values, "PaymentMatch").length,
    journal_entry_count: recordsOf(values, "JournalEntry").length,
    trust_ledger_entry_count: trustEntries.length,
    fee_commitment_count: recordsOf(values, "FeeCommitment").length,
    client_deposit_allocation_count: allocations.length,
    client_deposit_allocated_total: allocationAmountTotal,
    client_deposit_reversed_total: reversedAmountTotal,
    client_deposit_active_total: allocationAmountTotal - reversedAmountTotal,
    currency_mismatch_count: 0,
    invariant_passed: true,
  };
  return Object.freeze({ ...summary, invariant_hash: hashDomainValue(summary) });
}

export function createFinanceDomainSnapshot({ repositories, tenant_id } = {}) {
  const result = createRecordRepositoryDomainSnapshot({
    descriptor: FINANCE_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id,
  });
  const reconciliation = reconcileFinanceRecords(result.snapshot.records.map((record) => record.payload));
  return Object.freeze({
    snapshot: result.snapshot,
    inventory: Object.freeze({
      ...result.inventory,
      mutable_record_types: FINANCE_MUTABLE_RECORD_TYPES,
      append_only_record_types: FINANCE_APPEND_ONLY_RECORD_TYPES,
      money_fields: MONEY_FIELDS,
      reconciliation,
    }),
  });
}

export function runFinancePostgresCommand({ ledger, tenant_id, command } = {}) {
  return runRecordRepositoryDomainCommand({
    ledger,
    descriptor: FINANCE_DOMAIN_DESCRIPTOR,
    tenant_id,
    create_repository: createFinanceRepository,
    command: async function commandWithFinanceInvariants(repository) {
      const result = await command(repository);
      createFinanceDomainSnapshot({
        repositories: [{ source_id: "finance-postgres-unit-of-work", repository }],
        tenant_id,
      });
      return result;
    },
  });
}
