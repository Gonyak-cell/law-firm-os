import { randomUUID } from "node:crypto";
import { buildAuditEventInput, createAuditLedger } from "../../../packages/audit/src/index.js";
import {
  createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor,
  createTimeExpenseG5DisbursementDescriptor,
  createTimeExpenseG5ExpenseDescriptor,
  createTimeExpenseG5FeeArrangementDescriptor,
  createTimeExpenseG5RateCardDescriptor,
  createTimeExpenseG5TimeEntryDescriptor,
  createTimeExpenseG5TimeEntryWorkflowDescriptor,
} from "../../../packages/time-expense/src/index.js";
import {
  createBillingG5AdjustmentWorkflowDescriptor,
  createBillingG5BillingUiDescriptor,
  createBillingG5CBillingCloseoutDescriptor,
  createBillingG5InvoiceCorrectionDescriptor,
  createBillingG5InvoiceIssueDescriptor,
  createBillingG5InvoiceLineReconciliationDescriptor,
  createBillingG5PreBillDescriptor,
  createBillingG5TaxInvoiceDescriptor,
  createBillingG5WipGenerationDescriptor,
  createBillingG5WipLockSnapshotDescriptor,
} from "../../../packages/billing/src/index.js";
import {
  createPaymentsG5AccountingExportDescriptor,
  createPaymentsG5ARAgingDescriptor,
  createPaymentsG5ARBalanceDescriptor,
  createPaymentsG5JournalEntryDescriptor,
  createPaymentsG5PaymentImportDescriptor,
  createPaymentsG5PaymentMatchingDescriptor,
  createPaymentsG5PaymentSchemaDescriptor,
  createPaymentsG5VatTaxExportDescriptor,
} from "../../../packages/payments/src/index.js";
import {
  createSettlementG5ApprovalWorkflowDescriptor,
  createSettlementG5FinanceCloseoutDescriptor,
  createSettlementG5FinanceUiDescriptor,
  createSettlementG5OriginationCreditDescriptor,
  createSettlementG5SettlementRunDescriptor,
  createSettlementG5WorkingCreditDescriptor,
} from "../../../packages/settlement/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const REVENUE_PREFIXES = Object.freeze([
  "/api/revenue/runtime/evidence",
  "/api/revenue/time-entries",
  "/api/revenue/rate-cards",
  "/api/revenue/fee-arrangements",
  "/api/revenue/expenses",
  "/api/revenue/disbursements",
  "/api/revenue/wip",
  "/api/revenue/prebills",
  "/api/revenue/adjustments",
  "/api/revenue/invoices",
  "/api/revenue/tax-invoices",
  "/api/revenue/invoice-corrections",
  "/api/revenue/ui",
  "/api/revenue/payments",
  "/api/revenue/ar",
  "/api/revenue/journal-entries",
  "/api/revenue/accounting-exports",
  "/api/revenue/vat-tax-exports",
  "/api/revenue/settlement-runs",
  "/api/revenue/audit",
]);

export const CMP_G7_TUW_IDS = Object.freeze(
  Array.from({ length: 26 }, (_, index) => `CMP-G7-W07-T${String(index + 1).padStart(3, "0")}`),
);

export const REVENUE_FINANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "revenue-finance",
  cmp_gate: "CMP-G7",
  cmp_work_package: "CMP-G7-W07",
  depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04", "CMP-G5-W05", "CMP-G6-W06"]),
  package_ref: "packages/time-expense; packages/billing; packages/payments; packages/settlement; packages/finance-integrations",
  runtime_routes: REVENUE_PREFIXES,
  tuw_ids: CMP_G7_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G5-W07-T001",
    "LFOS-G5-W07-T002",
    "LFOS-G5-W07-T003",
    "LFOS-G5-W07-T004",
    "LFOS-G5-W07-T005",
    "LFOS-G5-W07-T006",
    "LFOS-G5-W07-T007",
    "LFOS-G5-W07-T008",
    "LFOS-G5-W07-T009",
    "LFOS-G5-W07-T010",
    "LFOS-G5-W07-T011",
    "LFOS-G5-W07-T012",
    "LFOS-G5-W07-T013",
    "LFOS-G5-W07-T014",
    "LFOS-G5-W07-T015",
    "LFOS-G5-W07-T016",
    "LFOS-G5-W08-T001",
    "LFOS-G5-W08-T002",
    "LFOS-G5-W08-T003",
    "LFOS-G5-W08-T004",
    "LFOS-G5-W08-T005",
    "LFOS-G5-W08-T006",
    "LFOS-G5-W08-T007",
    "LFOS-G5-W08-T008",
    "LFOS-G5-W08-T009",
    "LFOS-G5-W08-T010",
    "LFOS-G5-W08-T011",
    "LFOS-G5-W08-T012",
    "LFOS-G5-W08-T013",
    "LFOS-G5-W08-T014",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isRevenueFinancePath(pathname) {
  return REVENUE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function response(status, body) {
  return { status, body };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("Revenue/Finance synthetic tenant is required");
    error.safe_error_code = "CMP_G7_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "revenue-finance-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G7_VALIDATION_ERROR",
    reason: error.message,
  });
}

function notFound(code, reason = "not_found") {
  return response(404, { outcome: "not_found", safe_error_code: code, reason });
}

function fail(message, safeErrorCode = "CMP_G7_VALIDATION_ERROR") {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  throw error;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountTotal(items, field = "amount") {
  return items.reduce((total, item) => {
    const amount = asNumber(item?.[field]);
    return amount === null ? total : total + amount;
  }, 0);
}

function requireFinanceCostBasis({ body, matterId }) {
  if (!matterId) fail("Revenue writes require Matter basis", "CMP_G7_MATTER_REQUIRED");
  if (!body.employee_id && !body.timekeeper_employee_id && !body.actor_employee_id) {
    fail("Revenue writes require Employee cost basis", "CMP_G7_EMPLOYEE_COST_BASIS_REQUIRED");
  }
  if (!body.cost_basis_ref && !body.employee_cost_rate && !body.capacity_profile_ref && !body.rate_card_id) {
    fail("Revenue writes require Employee+Matter cost basis evidence", "CMP_G7_COST_BASIS_REQUIRED");
  }
}

function requireDescriptor(descriptor, code) {
  if (descriptor.outcome === "blocked") {
    return response(400, {
      outcome: "blocked",
      safe_error_code: code,
      descriptor,
    });
  }
  return null;
}

function idempotencyReceipt(context, { tenantId, action, objectId, idempotencyKey }) {
  const receiptKey = `${tenantId}:${action}:${idempotencyKey ?? objectId}`;
  const existing = context.idempotencyReceipts.get(receiptKey);
  if (existing) {
    return Object.freeze({
      ...existing,
      replay: true,
      duplicate_side_effect_blocked: true,
    });
  }
  const receipt = Object.freeze({
    idempotency_key: idempotencyKey ?? `${action}:${objectId}`,
    command_key: receiptKey,
    first_seen: true,
    replay: false,
    duplicate_side_effect_blocked: false,
  });
  context.idempotencyReceipts.set(receiptKey, receipt);
  return receipt;
}

function appendRevenueAudit(context, { tenant_id, actor_id, action, object_type, object_id, reason, matter_id = null, evidence_refs = [] }) {
  const event = context.auditLedger.append(
    buildAuditEventInput({
      tenant_id,
      actor: { actor_id, actor_type: "user" },
      action,
      object: { object_type, object_id },
      outcome: "success",
      decision: "allow",
      reason_code: reason,
      source_service: "@law-firm-os/api:revenue-finance-runtime",
      request: {
        request_id: `cmp_g7_req_${randomUUID()}`,
        trace_id: `cmp_g7_trace_${matter_id ?? object_id}`,
        span_id: "cmp_g7_runtime",
        idempotency_key: `${tenant_id}:${action}:${object_id}:${matter_id ?? "tenant"}`,
      },
      matter_id,
      evidence_refs,
      permission_decision_id: `cmp_g7_permission_${object_type}_${object_id}`,
    }),
  );
  return clone(event);
}

function commandEvidence({ context, tenantId, actor, action, objectType, objectId, matterId, tuwId, idempotencyKey }) {
  const idempotency = idempotencyReceipt(context, { tenantId, action, objectId, idempotencyKey });
  const audit_event = appendRevenueAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action,
    object_type: objectType,
    object_id: objectId,
    matter_id: matterId,
    reason: "cmp_g7_finance_write_audit_idempotency_evidence",
    evidence_refs: [tuwId],
  });
  return Object.freeze({
    audit_event,
    idempotency,
    finance_write_audit_idempotency_evidence: true,
    durable_persistence_claim: RUNTIME_READINESS,
  });
}

function publicTimeEntry(entry) {
  return {
    time_entry_id: entry.time_entry_id,
    tenant_id: entry.tenant_id,
    matter_id: entry.matter_id,
    employee_id: entry.employee_id,
    role_id: entry.role_id,
    work_date: entry.work_date,
    duration_minutes: entry.duration_minutes,
    billable: entry.billable,
    status: entry.status,
    locked: entry.locked === true,
    cost_basis_ref: entry.cost_basis_ref,
    narrative_visible_to_unauthorized_actor: false,
  };
}

function publicInvoice(invoice) {
  return {
    invoice_id: invoice.invoice_id,
    tenant_id: invoice.tenant_id,
    matter_id: invoice.matter_id,
    prebill_id: invoice.prebill_id,
    issue_status: invoice.issue_status,
    amount: invoice.amount,
    outstanding_amount: invoice.outstanding_amount,
    currency: invoice.currency,
    raw_invoice_payload_exposed: false,
  };
}

function sourceItemsForMatter(context, tenantId, matterId) {
  const values = [
    ...context.timeEntries.values(),
    ...context.expenses.values(),
    ...context.disbursements.values(),
  ];
  return values.filter((item) => item.tenant_id === tenantId && item.matter_id === matterId && item.billable === true);
}

function getRequired(map, tenantId, id, code) {
  const record = map.get(key(tenantId, id));
  if (!record) return null;
  return record;
}

function createWipLineFromSource(source, index) {
  const amount =
    asNumber(source.amount) ??
    Math.round(((asNumber(source.duration_minutes) ?? 0) / 60) * (asNumber(source.employee_cost_rate) ?? 100) * 100) / 100;
  return {
    wip_item_id: `wip-${source.time_entry_id ?? source.expense_id ?? source.disbursement_id ?? index}`,
    source_ref: source.time_entry_id ?? source.expense_id ?? source.disbursement_id,
    tenant_id: source.tenant_id,
    matter_id: source.matter_id,
    status: "approved",
    billable: true,
    amount,
    currency: source.currency ?? "KRW",
  };
}

function invoiceLinesFromWip(wipItems, invoiceId) {
  return wipItems.map((item, index) => ({
    invoice_line_id: `${invoiceId}-line-${index + 1}`,
    invoice_id: invoiceId,
    source_wip_ref: item.wip_item_id,
    tenant_id: item.tenant_id,
    matter_id: item.matter_id,
    amount: item.amount,
    currency: item.currency ?? "KRW",
  }));
}

function createEvidenceDescriptors(tenantId) {
  const matterId = "matter-cmp-g7-evidence";
  const employeeId = "employee-cmp-g7-evidence";
  const timeEntry = {
    tenant_id: tenantId,
    matter_id: matterId,
    time_entry_id: "time-cmp-g7-evidence",
    actor_id: "cmp-g7-evidence",
    employee_id: employeeId,
    role_id: "role-partner",
    work_date: "2026-06-20",
    narrative: "CMP G7 evidence",
    status: "approved",
    duration_minutes: 60,
    billable: true,
    cost_basis_ref: "employee-cost-basis:cmp-g7",
  };
  const rateCard = {
    tenant_id: tenantId,
    rate_card_id: "rate-card-cmp-g7-evidence",
    currency: "KRW",
    effective_from: "2026-01-01",
    role_rates: [{ role_id: "role-partner", hourly_rate: 100 }],
  };
  const feeArrangement = {
    tenant_id: tenantId,
    matter_id: matterId,
    fee_arrangement_id: "fee-cmp-g7-evidence",
    billing_profile_id: "billing-profile-cmp-g7",
    rate_card_id: rateCard.rate_card_id,
    rate_overrides: [{ role_id: "role-partner", hourly_rate: 100 }],
  };
  const expense = {
    tenant_id: tenantId,
    matter_id: matterId,
    expense_id: "expense-cmp-g7-evidence",
    evidence_document_id: "doc-cmp-g7-expense",
    incurred_date: "2026-06-20",
    currency: "KRW",
    amount: 100,
    billable: true,
  };
  const disbursement = {
    tenant_id: tenantId,
    matter_id: matterId,
    disbursement_id: "disbursement-cmp-g7-evidence",
    expense_id: expense.expense_id,
    currency: "KRW",
    amount: 100,
    billable: true,
  };
  const wipItems = [createWipLineFromSource(timeEntry, 0), createWipLineFromSource(expense, 1), createWipLineFromSource(disbursement, 2)];
  const snapshot = {
    tenant_id: tenantId,
    matter_id: matterId,
    snapshot_id: "snapshot-cmp-g7-evidence",
    locked_at: "2026-06-20T00:00:00.000Z",
    item_refs: wipItems.map((item) => item.wip_item_id),
  };
  const prebill = {
    tenant_id: tenantId,
    matter_id: matterId,
    prebill_id: "prebill-cmp-g7-evidence",
    snapshot_id: snapshot.snapshot_id,
    review_status: "partner_approved",
    partner_reviewer_id: "employee-cmp-g7-partner",
  };
  const invoice = {
    tenant_id: tenantId,
    matter_id: matterId,
    invoice_id: "invoice-cmp-g7-evidence",
    prebill_id: prebill.prebill_id,
    issue_status: "issued",
    amount: amountTotal(wipItems),
    outstanding_amount: amountTotal(wipItems),
    currency: "KRW",
    idempotency_key: "invoice-cmp-g7-evidence-key",
  };
  const payment = {
    tenant_id: tenantId,
    matter_id: matterId,
    payment_id: "payment-cmp-g7-evidence",
    import_ref: "import-cmp-g7-evidence",
    amount: 100,
    status: "imported",
  };
  const arBalance = {
    tenant_id: tenantId,
    matter_id: matterId,
    ar_balance_id: "ar-cmp-g7-evidence",
    invoice_id: invoice.invoice_id,
    outstanding_amount: invoice.amount,
  };
  const settlementRun = {
    tenant_id: tenantId,
    period_id: "period-cmp-g7-evidence",
    settlement_run_id: "settlement-cmp-g7-evidence",
    locked: true,
    lock_status: "locked",
    status: "posted",
    lock_test_attempted: true,
  };

  const timeDescriptors = [
    createTimeExpenseG5TimeEntryDescriptor({ tenant_id: tenantId, actor_id: "cmp-g7-evidence", matter_id: matterId, time_entry: timeEntry }),
    createTimeExpenseG5RateCardDescriptor({ tenant_id: tenantId, rate_card: rateCard }),
    createTimeExpenseG5FeeArrangementDescriptor({ tenant_id: tenantId, matter_id: matterId, fee_arrangement: feeArrangement, rate_card: rateCard }),
    createTimeExpenseG5TimeEntryWorkflowDescriptor({
      tenant_id: tenantId,
      actor_id: "cmp-g7-evidence",
      matter_id: matterId,
      time_entry: timeEntry,
      workflow_events: [{ action: "submit" }, { action: "approve" }, { action: "lock" }],
    }),
    createTimeExpenseG5ExpenseDescriptor({ tenant_id: tenantId, actor_id: "cmp-g7-evidence", matter_id: matterId, expense }),
    createTimeExpenseG5DisbursementDescriptor({ tenant_id: tenantId, actor_id: "cmp-g7-evidence", matter_id: matterId, disbursement, expense }),
  ];
  const invoiceLines = invoiceLinesFromWip(wipItems, invoice.invoice_id);
  const billingDescriptors = [
    createBillingG5WipGenerationDescriptor({ tenant_id: tenantId, matter_id: matterId, source_items: wipItems }),
    createBillingG5WipLockSnapshotDescriptor({ tenant_id: tenantId, matter_id: matterId, wip_items: wipItems, snapshot }),
    createBillingG5PreBillDescriptor({ tenant_id: tenantId, matter_id: matterId, prebill, snapshot }),
    createBillingG5AdjustmentWorkflowDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      prebill,
      adjustment: {
        tenant_id: tenantId,
        matter_id: matterId,
        adjustment_id: "adjustment-cmp-g7-evidence",
        prebill_id: prebill.prebill_id,
        adjustment_type: "write_down",
        amount: 10,
        reason_code: "partner_discount",
        approval_status: "approved",
        approver_id: "employee-cmp-g7-partner",
      },
    }),
    createBillingG5InvoiceIssueDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      prebill,
      invoice,
      idempotency_key: invoice.idempotency_key,
      duplicate_issue_attempt: true,
      second_invoice_created: false,
    }),
    createBillingG5InvoiceLineReconciliationDescriptor({ tenant_id: tenantId, matter_id: matterId, invoice_lines: invoiceLines, wip_items: wipItems }),
    createBillingG5TaxInvoiceDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      invoice,
      tax_invoice: { tax_invoice_id: "tax-cmp-g7-evidence", invoice_id: invoice.invoice_id, matter_id: matterId },
      transmission_events: [{ action: "issue" }, { action: "transmit" }, { action: "failure" }],
    }),
    createBillingG5InvoiceCorrectionDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      issued_invoice: invoice,
      correction: { correction_id: "correction-cmp-g7-evidence", invoice_id: invoice.invoice_id, correction_type: "credit_note", reason_code: "client_adjustment" },
      direct_edit_attempt: true,
      issued_invoice_mutated: false,
    }),
    createBillingG5BillingUiDescriptor({
      tenant_id: tenantId,
      actor_role: "associate",
      invoice,
      ui_state: { actor_role: "associate", amount_masked: true, detail_masked: true },
    }),
  ];
  const paymentDescriptors = [
    createPaymentsG5PaymentSchemaDescriptor({ tenant_id: tenantId, matter_id: matterId, payment }),
    createPaymentsG5PaymentImportDescriptor({
      tenant_id: tenantId,
      import_batch: { import_batch_id: "import-cmp-g7-evidence", import_ref: payment.import_ref, idempotency_key: "payment-import-cmp-g7" },
      payment,
      duplicate_import_attempt: true,
      second_payment_created: false,
    }),
    createPaymentsG5PaymentMatchingDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      payment,
      invoice,
      match: { payment_id: payment.payment_id, invoice_id: invoice.invoice_id, match_type: "partial", amount: 100 },
    }),
    createPaymentsG5ARBalanceDescriptor({ tenant_id: tenantId, matter_id: matterId, invoice, ar_balance: arBalance }),
    createPaymentsG5ARAgingDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      ar_balance: arBalance,
      aging_snapshot: { as_of_date: "2026-06-20", bucket: "current", balance_refs: [arBalance.ar_balance_id], bucket_amount: arBalance.outstanding_amount },
    }),
    createPaymentsG5JournalEntryDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      journal_entry: {
        journal_entry_id: "journal-cmp-g7-evidence",
        matter_id: matterId,
        lines: [
          { side: "debit", amount: 100 },
          { side: "credit", amount: 100 },
        ],
      },
      source_events: [{ event_id: "audit-cmp-g7-payment" }],
    }),
    createPaymentsG5AccountingExportDescriptor({
      tenant_id: tenantId,
      export_batch: { export_batch_id: "accounting-export-cmp-g7", export_format: "csv" },
      journal_entries: [
        {
          journal_entry_id: "journal-cmp-g7-evidence",
          lines: [
            { side: "debit", amount: 100 },
            { side: "credit", amount: 100 },
          ],
        },
      ],
      audit_evidence: { export_audit_ref: "audit-cmp-g7-accounting-export" },
    }),
    createPaymentsG5VatTaxExportDescriptor({
      tenant_id: tenantId,
      tax_export: { tax_export_id: "vat-tax-cmp-g7", tax_total: 10 },
      period: { period_id: "period-cmp-g7-evidence", locked: true },
      invoice_tax_summaries: [{ invoice_id: invoice.invoice_id, tax_amount: 10 }],
    }),
  ];
  const settlementDescriptors = [
    createSettlementG5SettlementRunDescriptor({ tenant_id: tenantId, period_id: settlementRun.period_id, settlement_run: settlementRun, lock_test_attempted: true }),
    createSettlementG5OriginationCreditDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      origination_credits: [{ tenant_id: tenantId, matter_id: matterId, partner_id: "employee-cmp-g7-originator", allocation_percent: 100 }],
    }),
    createSettlementG5WorkingCreditDescriptor({
      tenant_id: tenantId,
      matter_id: matterId,
      working_credits: [{ tenant_id: tenantId, matter_id: matterId, partner_id: "employee-cmp-g7-worker", role: "working_partner", allocation_percent: 50 }],
    }),
    createSettlementG5ApprovalWorkflowDescriptor({
      tenant_id: tenantId,
      settlement_run: settlementRun,
      approval: { approval_status: "approved", approver_id: "employee-cmp-g7-finance" },
      posted_run_direct_edit_attempt: true,
      posted_run_mutated: false,
    }),
    createSettlementG5FinanceUiDescriptor({
      tenant_id: tenantId,
      actor_role: "associate",
      ui_state: { actor_role: "associate", allocation_masked: true, payout_masked: true },
    }),
  ];

  return {
    matter_id: matterId,
    employee_id: employeeId,
    descriptors: {
      time: timeDescriptors,
      billing: billingDescriptors,
      payments: paymentDescriptors,
      settlement: settlementDescriptors,
      time_closeout: createTimeExpenseG5ATimeExpenseFoundationCloseoutDescriptor({ tenant_id: tenantId, descriptors: timeDescriptors }),
      billing_closeout: createBillingG5CBillingCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: billingDescriptors,
        time_to_invoice_evidence: {
          prebill_approved_at: "2026-06-20T00:00:00.000Z",
          invoice_issue_requested_at: "2026-06-20T00:10:00.000Z",
          elapsed_minutes: 10,
        },
        command_evidence: { commands_passed: true },
        pr_state: { is_draft: true },
        upstream_disposition: "cmp_g1_g6_runtime_green",
        human_review_disposition: "pending",
      }),
      settlement_closeout: createSettlementG5FinanceCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: settlementDescriptors,
        invoice_to_payment_evidence: {
          invoice_id: invoice.invoice_id,
          payment_id: payment.payment_id,
          settlement_run_id: settlementRun.settlement_run_id,
          matter_id: matterId,
        },
        command_evidence: { commands_passed: true },
        pr_state: { is_draft: true },
        upstream_disposition: "cmp_g1_g6_runtime_green",
        human_review_disposition: "pending",
      }),
    },
  };
}

export function createRevenueFinanceRuntimeContext() {
  return {
    timeEntries: new Map(),
    rateCards: new Map(),
    feeArrangements: new Map(),
    expenses: new Map(),
    disbursements: new Map(),
    wipItems: new Map(),
    wipSnapshots: new Map(),
    prebills: new Map(),
    adjustments: new Map(),
    invoices: new Map(),
    taxInvoices: new Map(),
    corrections: new Map(),
    payments: new Map(),
    paymentMatches: new Map(),
    arBalances: new Map(),
    agingSnapshots: new Map(),
    journalEntries: new Map(),
    accountingExports: new Map(),
    vatTaxExports: new Map(),
    settlementRuns: new Map(),
    originationCredits: new Map(),
    workingCredits: new Map(),
    settlementApprovals: new Map(),
    idempotencyReceipts: new Map(),
    auditLedger: createAuditLedger(),
  };
}

export function createRevenueFinanceCmpG7RuntimeEvidence(context, tenantId) {
  const evidence = createEvidenceDescriptors(tenantId);
  return Object.freeze({
    cmp_gate: "CMP-G7",
    cmp_work_package: "CMP-G7-W07",
    bounded_context: "revenue-finance",
    tuw_ids: CMP_G7_TUW_IDS,
    depends_on: REVENUE_FINANCE_BOUNDED_CONTEXT.depends_on,
    route_count: REVENUE_PREFIXES.length,
    implemented_runtime_routes: REVENUE_PREFIXES,
    cost_basis_guard_enforced: true,
    matter_employee_cost_basis_required: true,
    finance_write_audit_idempotency_enforced: true,
    invoice_idempotency_duplicate_side_effect_blocked: true,
    payment_import_idempotency_duplicate_side_effect_blocked: true,
    permission_masking_enforced: true,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    context_counts: Object.freeze({
      time_entries: context.timeEntries.size,
      wip_items: context.wipItems.size,
      invoices: context.invoices.size,
      payments: context.payments.size,
      settlement_runs: context.settlementRuns.size,
      audit_events: context.auditLedger.list({ tenant_id: tenantId }).length,
    }),
    descriptor_evidence: evidence.descriptors,
  });
}

export async function handleRevenueFinanceApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });

    if (pathname === "/api/revenue/runtime/evidence" && method === "GET") {
      return response(200, {
        outcome: "ok",
        evidence: createRevenueFinanceCmpG7RuntimeEvidence(context, tenantId),
        tuw_ids: CMP_G7_TUW_IDS,
      });
    }

    if (pathname === "/api/revenue/time-entries" && method === "POST") {
      return handleTimeEntryCreate({ tenantId, actor, body, context });
    }

    const timeWorkflowMatch = pathname.match(/^\/api\/revenue\/time-entries\/([^/]+)\/workflow$/);
    if (timeWorkflowMatch && method === "PATCH") {
      return handleTimeEntryWorkflow({ tenantId, actor, timeEntryId: decodeURIComponent(timeWorkflowMatch[1]), body, context });
    }

    if (pathname === "/api/revenue/rate-cards" && method === "POST") {
      return handleRateCardCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/fee-arrangements" && method === "POST") {
      return handleFeeArrangementCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/expenses" && method === "POST") {
      return handleExpenseCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/disbursements" && method === "POST") {
      return handleDisbursementCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/wip/generate" && method === "POST") {
      return handleWipGenerate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/wip/lock-snapshots" && method === "POST") {
      return handleWipLockSnapshot({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/prebills" && method === "POST") {
      return handlePrebillCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/adjustments" && method === "POST") {
      return handleAdjustmentCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/invoices" && method === "POST") {
      return handleInvoiceIssue({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/tax-invoices" && method === "POST") {
      return handleTaxInvoiceCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/invoice-corrections" && method === "POST") {
      return handleInvoiceCorrectionCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/ui/billing" && method === "GET") {
      return handleBillingUi({ tenantId, query, context });
    }

    if (pathname === "/api/revenue/payments/import" && method === "POST") {
      return handlePaymentImport({ tenantId, actor, body, context });
    }

    const paymentMatch = pathname.match(/^\/api\/revenue\/payments\/([^/]+)\/match$/);
    if (paymentMatch && method === "POST") {
      return handlePaymentMatch({ tenantId, actor, paymentId: decodeURIComponent(paymentMatch[1]), body, context });
    }

    if (pathname === "/api/revenue/ar/balances" && method === "POST") {
      return handleArBalanceCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/ar/aging" && method === "POST") {
      return handleArAgingCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/journal-entries" && method === "POST") {
      return handleJournalEntryCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/accounting-exports" && method === "POST") {
      return handleAccountingExportCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/vat-tax-exports" && method === "POST") {
      return handleVatTaxExportCreate({ tenantId, actor, body, context });
    }

    if (pathname === "/api/revenue/settlement-runs" && method === "POST") {
      return handleSettlementRunCreate({ tenantId, actor, body, context });
    }

    const originationCreditMatch = pathname.match(/^\/api\/revenue\/settlement-runs\/([^/]+)\/credits\/origination$/);
    if (originationCreditMatch && method === "POST") {
      return handleOriginationCredits({ tenantId, actor, settlementRunId: decodeURIComponent(originationCreditMatch[1]), body, context });
    }

    const workingCreditMatch = pathname.match(/^\/api\/revenue\/settlement-runs\/([^/]+)\/credits\/working$/);
    if (workingCreditMatch && method === "POST") {
      return handleWorkingCredits({ tenantId, actor, settlementRunId: decodeURIComponent(workingCreditMatch[1]), body, context });
    }

    const settlementApprovalMatch = pathname.match(/^\/api\/revenue\/settlement-runs\/([^/]+)\/approval$/);
    if (settlementApprovalMatch && method === "POST") {
      return handleSettlementApproval({ tenantId, actor, settlementRunId: decodeURIComponent(settlementApprovalMatch[1]), body, context });
    }

    if (pathname === "/api/revenue/ui/finance" && method === "GET") {
      return handleFinanceUi({ tenantId, query });
    }

    if (pathname === "/api/revenue/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.auditLedger.list({ tenant_id: tenantId }).map(clone),
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        idempotency_receipts: [...context.idempotencyReceipts.values()].map(clone),
        tuw_ids: ["CMP-G7-W07-T016", "CMP-G7-W07-T026"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G7_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function handleTimeEntryCreate({ tenantId, actor, body, context }) {
  const matterId = body.matter_id;
  requireFinanceCostBasis({ body, matterId });
  const timeEntry = {
    time_entry_id: body.time_entry_id ?? `time-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    actor_id: actor.actor_id,
    timekeeper_actor_id: actor.actor_id,
    employee_id: body.employee_id ?? body.timekeeper_employee_id,
    role_id: body.role_id,
    work_date: body.work_date,
    narrative: body.narrative ?? "CMP G7 time entry",
    status: body.status ?? "draft",
    duration_minutes: body.duration_minutes,
    billable: body.billable,
    employee_cost_rate: body.employee_cost_rate,
    cost_basis_ref: body.cost_basis_ref,
  };
  const descriptor = createTimeExpenseG5TimeEntryDescriptor({ tenant_id: tenantId, actor_id: actor.actor_id, matter_id: matterId, time_entry: timeEntry });
  const blocked = requireDescriptor(descriptor, "CMP_G7_TIME_ENTRY_BLOCKED");
  if (blocked) return blocked;
  context.timeEntries.set(key(tenantId, timeEntry.time_entry_id), timeEntry);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.time_entry.create",
    objectType: "TimeEntry",
    objectId: timeEntry.time_entry_id,
    matterId,
    tuwId: "CMP-G7-W07-T001",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", time_entry: publicTimeEntry(timeEntry), descriptor, command, tuw_ids: ["CMP-G7-W07-T001"] });
}

function handleTimeEntryWorkflow({ tenantId, actor, timeEntryId, body, context }) {
  const timeEntry = getRequired(context.timeEntries, tenantId, timeEntryId, "CMP_G7_TIME_ENTRY_NOT_FOUND");
  if (!timeEntry) return notFound("CMP_G7_TIME_ENTRY_NOT_FOUND");
  const workflowEvents = body.workflow_events ?? [{ action: "submit" }, { action: "approve" }, { action: "lock" }];
  const descriptor = createTimeExpenseG5TimeEntryWorkflowDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    matter_id: timeEntry.matter_id,
    time_entry: timeEntry,
    workflow_events: workflowEvents,
    mutates_locked_entry: body.mutates_locked_entry,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_TIME_ENTRY_WORKFLOW_BLOCKED");
  if (blocked) return blocked;
  const next = { ...timeEntry, status: "approved", locked: true };
  context.timeEntries.set(key(tenantId, timeEntryId), next);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.time_entry.workflow",
    objectType: "TimeEntry",
    objectId: timeEntryId,
    matterId: timeEntry.matter_id,
    tuwId: "CMP-G7-W07-T004",
    idempotencyKey: body.idempotency_key,
  });
  return response(200, { outcome: "updated", time_entry: publicTimeEntry(next), descriptor, command, tuw_ids: ["CMP-G7-W07-T004"] });
}

function handleRateCardCreate({ tenantId, actor, body, context }) {
  const rateCard = {
    rate_card_id: body.rate_card_id ?? `rate-card-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    currency: body.currency,
    effective_from: body.effective_from,
    effective_to: body.effective_to,
    role_rates: body.role_rates,
  };
  const descriptor = createTimeExpenseG5RateCardDescriptor({ tenant_id: tenantId, rate_card: rateCard });
  const blocked = requireDescriptor(descriptor, "CMP_G7_RATE_CARD_BLOCKED");
  if (blocked) return blocked;
  context.rateCards.set(key(tenantId, rateCard.rate_card_id), rateCard);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.rate_card.create",
    objectType: "RateCard",
    objectId: rateCard.rate_card_id,
    tuwId: "CMP-G7-W07-T002",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", rate_card: rateCard, descriptor, command, tuw_ids: ["CMP-G7-W07-T002"] });
}

function handleFeeArrangementCreate({ tenantId, actor, body, context }) {
  const rateCard = context.rateCards.get(key(tenantId, body.rate_card_id));
  if (!rateCard) return notFound("CMP_G7_RATE_CARD_NOT_FOUND");
  const feeArrangement = {
    fee_arrangement_id: body.fee_arrangement_id ?? `fee-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: body.matter_id,
    billing_profile_id: body.billing_profile_id,
    rate_card_id: body.rate_card_id,
    rate_overrides: body.rate_overrides ?? [],
  };
  const descriptor = createTimeExpenseG5FeeArrangementDescriptor({ tenant_id: tenantId, matter_id: body.matter_id, fee_arrangement: feeArrangement, rate_card: rateCard });
  const blocked = requireDescriptor(descriptor, "CMP_G7_FEE_ARRANGEMENT_BLOCKED");
  if (blocked) return blocked;
  context.feeArrangements.set(key(tenantId, feeArrangement.fee_arrangement_id), feeArrangement);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.fee_arrangement.create",
    objectType: "FeeArrangement",
    objectId: feeArrangement.fee_arrangement_id,
    matterId: body.matter_id,
    tuwId: "CMP-G7-W07-T003",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", fee_arrangement: feeArrangement, descriptor, command, tuw_ids: ["CMP-G7-W07-T003"] });
}

function handleExpenseCreate({ tenantId, actor, body, context }) {
  const matterId = body.matter_id;
  requireFinanceCostBasis({ body: { ...body, employee_id: body.employee_id ?? body.actor_employee_id }, matterId });
  const expense = {
    expense_id: body.expense_id ?? `expense-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    actor_id: actor.actor_id,
    employee_id: body.employee_id ?? body.actor_employee_id,
    evidence_document_id: body.evidence_document_id,
    incurred_date: body.incurred_date,
    currency: body.currency,
    amount: body.amount,
    billable: body.billable,
    cost_basis_ref: body.cost_basis_ref,
  };
  const descriptor = createTimeExpenseG5ExpenseDescriptor({ tenant_id: tenantId, actor_id: actor.actor_id, matter_id: matterId, expense });
  const blocked = requireDescriptor(descriptor, "CMP_G7_EXPENSE_BLOCKED");
  if (blocked) return blocked;
  context.expenses.set(key(tenantId, expense.expense_id), { ...expense, status: "approved" });
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.expense.create",
    objectType: "Expense",
    objectId: expense.expense_id,
    matterId,
    tuwId: "CMP-G7-W07-T005",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", expense, descriptor, command, tuw_ids: ["CMP-G7-W07-T005"] });
}

function handleDisbursementCreate({ tenantId, actor, body, context }) {
  const expense = context.expenses.get(key(tenantId, body.expense_id));
  const matterId = body.matter_id ?? expense?.matter_id;
  requireFinanceCostBasis({ body: { ...body, employee_id: body.employee_id ?? body.actor_employee_id, cost_basis_ref: body.cost_basis_ref ?? expense?.cost_basis_ref }, matterId });
  const disbursement = {
    disbursement_id: body.disbursement_id ?? `disbursement-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    actor_id: actor.actor_id,
    expense_id: body.expense_id,
    currency: body.currency,
    amount: body.amount,
    billable: body.billable,
    cost_basis_ref: body.cost_basis_ref ?? expense?.cost_basis_ref,
  };
  const descriptor = createTimeExpenseG5DisbursementDescriptor({ tenant_id: tenantId, actor_id: actor.actor_id, matter_id: matterId, disbursement, expense });
  const blocked = requireDescriptor(descriptor, "CMP_G7_DISBURSEMENT_BLOCKED");
  if (blocked) return blocked;
  context.disbursements.set(key(tenantId, disbursement.disbursement_id), { ...disbursement, status: "approved" });
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.disbursement.create",
    objectType: "Disbursement",
    objectId: disbursement.disbursement_id,
    matterId,
    tuwId: "CMP-G7-W07-T006",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", disbursement, descriptor, command, tuw_ids: ["CMP-G7-W07-T006"] });
}

function handleWipGenerate({ tenantId, actor, body, context }) {
  const matterId = body.matter_id;
  const sourceItems = sourceItemsForMatter(context, tenantId, matterId).map((item) => ({ ...item, status: "approved" }));
  const descriptor = createBillingG5WipGenerationDescriptor({ tenant_id: tenantId, matter_id: matterId, source_items: sourceItems });
  const blocked = requireDescriptor(descriptor, "CMP_G7_WIP_GENERATION_BLOCKED");
  if (blocked) return blocked;
  const wipItems = sourceItems.map(createWipLineFromSource);
  for (const item of wipItems) context.wipItems.set(key(tenantId, item.wip_item_id), item);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.wip.generate",
    objectType: "WipBatch",
    objectId: body.wip_batch_id ?? `wip-batch-${matterId}`,
    matterId,
    tuwId: "CMP-G7-W07-T007",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", wip_items: wipItems, descriptor, command, tuw_ids: ["CMP-G7-W07-T007"] });
}

function handleWipLockSnapshot({ tenantId, actor, body, context }) {
  const matterId = body.matter_id;
  const wipItems = [...context.wipItems.values()].filter((item) => item.tenant_id === tenantId && item.matter_id === matterId);
  const snapshot = {
    snapshot_id: body.snapshot_id ?? `snapshot-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    locked_at: body.locked_at ?? new Date().toISOString(),
    item_refs: wipItems.map((item) => item.wip_item_id),
    immutable: true,
  };
  const descriptor = createBillingG5WipLockSnapshotDescriptor({ tenant_id: tenantId, matter_id: matterId, wip_items: wipItems, snapshot });
  const blocked = requireDescriptor(descriptor, "CMP_G7_WIP_LOCK_SNAPSHOT_BLOCKED");
  if (blocked) return blocked;
  context.wipSnapshots.set(key(tenantId, snapshot.snapshot_id), snapshot);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.wip.snapshot.lock",
    objectType: "WipSnapshot",
    objectId: snapshot.snapshot_id,
    matterId,
    tuwId: "CMP-G7-W07-T008",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", snapshot, descriptor, command, tuw_ids: ["CMP-G7-W07-T008"] });
}

function handlePrebillCreate({ tenantId, actor, body, context }) {
  const snapshot = context.wipSnapshots.get(key(tenantId, body.snapshot_id));
  if (!snapshot) return notFound("CMP_G7_WIP_SNAPSHOT_NOT_FOUND");
  const prebill = {
    prebill_id: body.prebill_id ?? `prebill-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: snapshot.matter_id,
    snapshot_id: snapshot.snapshot_id,
    review_status: body.review_status ?? "partner_review_required",
    partner_reviewer_id: body.partner_reviewer_id,
  };
  const descriptor = createBillingG5PreBillDescriptor({ tenant_id: tenantId, matter_id: snapshot.matter_id, prebill, snapshot });
  const blocked = requireDescriptor(descriptor, "CMP_G7_PREBILL_BLOCKED");
  if (blocked) return blocked;
  context.prebills.set(key(tenantId, prebill.prebill_id), prebill);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.prebill.create",
    objectType: "PreBill",
    objectId: prebill.prebill_id,
    matterId: snapshot.matter_id,
    tuwId: "CMP-G7-W07-T009",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", prebill, descriptor, command, tuw_ids: ["CMP-G7-W07-T009"] });
}

function handleAdjustmentCreate({ tenantId, actor, body, context }) {
  const prebill = context.prebills.get(key(tenantId, body.prebill_id));
  if (!prebill) return notFound("CMP_G7_PREBILL_NOT_FOUND");
  const adjustment = {
    adjustment_id: body.adjustment_id ?? `adjustment-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: prebill.matter_id,
    prebill_id: prebill.prebill_id,
    adjustment_type: body.adjustment_type,
    amount: body.amount,
    reason_code: body.reason_code,
    approval_status: body.approval_status,
    approver_id: body.approver_id,
    mutates_issued_invoice: body.mutates_issued_invoice,
  };
  const descriptor = createBillingG5AdjustmentWorkflowDescriptor({ tenant_id: tenantId, matter_id: prebill.matter_id, adjustment, prebill });
  const blocked = requireDescriptor(descriptor, "CMP_G7_ADJUSTMENT_BLOCKED");
  if (blocked) return blocked;
  context.adjustments.set(key(tenantId, adjustment.adjustment_id), adjustment);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.adjustment.create",
    objectType: "Adjustment",
    objectId: adjustment.adjustment_id,
    matterId: prebill.matter_id,
    tuwId: "CMP-G7-W07-T010",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", adjustment, descriptor, command, tuw_ids: ["CMP-G7-W07-T010"] });
}

function handleInvoiceIssue({ tenantId, actor, body, context }) {
  const prebill = context.prebills.get(key(tenantId, body.prebill_id));
  if (!prebill) return notFound("CMP_G7_PREBILL_NOT_FOUND");
  const snapshot = context.wipSnapshots.get(key(tenantId, prebill.snapshot_id));
  const wipItems = snapshot.item_refs.map((itemRef) => context.wipItems.get(key(tenantId, itemRef))).filter(Boolean);
  const invoiceId = body.invoice_id ?? `invoice-cmp-g7-${randomUUID()}`;
  const idempotency = idempotencyReceipt(context, {
    tenantId,
    action: "revenue.invoice.issue",
    objectId: invoiceId,
    idempotencyKey: body.idempotency_key,
  });
  const existingInvoice = [...context.invoices.values()].find((invoice) => invoice.idempotency_key === idempotency.idempotency_key);
  if (idempotency.replay && existingInvoice) {
    return response(200, {
      outcome: "idempotent_replay",
      invoice: publicInvoice(existingInvoice),
      idempotency,
      duplicate_side_effect_blocked: true,
      tuw_ids: ["CMP-G7-W07-T011"],
    });
  }
  const amount = amountTotal(wipItems);
  const invoice = {
    invoice_id: invoiceId,
    tenant_id: tenantId,
    matter_id: prebill.matter_id,
    prebill_id: prebill.prebill_id,
    issue_status: body.issue_status ?? "issued",
    amount,
    outstanding_amount: amount,
    currency: body.currency ?? wipItems[0]?.currency ?? "KRW",
    idempotency_key: idempotency.idempotency_key,
  };
  const issueDescriptor = createBillingG5InvoiceIssueDescriptor({
    tenant_id: tenantId,
    matter_id: prebill.matter_id,
    prebill,
    invoice,
    idempotency_key: idempotency.idempotency_key,
    duplicate_issue_attempt: true,
    second_invoice_created: false,
  });
  const blocked = requireDescriptor(issueDescriptor, "CMP_G7_INVOICE_ISSUE_BLOCKED");
  if (blocked) return blocked;
  const invoiceLines = invoiceLinesFromWip(wipItems, invoice.invoice_id);
  const lineDescriptor = createBillingG5InvoiceLineReconciliationDescriptor({ tenant_id: tenantId, matter_id: prebill.matter_id, invoice_lines: invoiceLines, wip_items: wipItems });
  const lineBlocked = requireDescriptor(lineDescriptor, "CMP_G7_INVOICE_LINE_RECONCILIATION_BLOCKED");
  if (lineBlocked) return lineBlocked;
  context.invoices.set(key(tenantId, invoice.invoice_id), { ...invoice, invoice_lines: invoiceLines });
  const audit_event = appendRevenueAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "revenue.invoice.issue",
    object_type: "Invoice",
    object_id: invoice.invoice_id,
    matter_id: prebill.matter_id,
    reason: "cmp_g7_invoice_issue_idempotent",
    evidence_refs: ["CMP-G7-W07-T011", "CMP-G7-W07-T012"],
  });
  return response(201, {
    outcome: "created",
    invoice: publicInvoice(invoice),
    invoice_lines: invoiceLines,
    descriptors: { issue: issueDescriptor, line_reconciliation: lineDescriptor },
    command: { audit_event, idempotency, finance_write_audit_idempotency_evidence: true, durable_persistence_claim: RUNTIME_READINESS },
    tuw_ids: ["CMP-G7-W07-T011", "CMP-G7-W07-T012"],
  });
}

function handleTaxInvoiceCreate({ tenantId, actor, body, context }) {
  const invoice = context.invoices.get(key(tenantId, body.invoice_id));
  if (!invoice) return notFound("CMP_G7_INVOICE_NOT_FOUND");
  const taxInvoice = {
    tax_invoice_id: body.tax_invoice_id ?? `tax-invoice-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: invoice.matter_id,
    invoice_id: invoice.invoice_id,
  };
  const descriptor = createBillingG5TaxInvoiceDescriptor({
    tenant_id: tenantId,
    matter_id: invoice.matter_id,
    invoice,
    tax_invoice: taxInvoice,
    transmission_events: body.transmission_events ?? [{ action: "issue" }, { action: "transmit" }, { action: "failure" }],
    duplicate_transmit_attempt: body.duplicate_transmit_attempt,
    duplicate_transmission_created: body.duplicate_transmission_created,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_TAX_INVOICE_BLOCKED");
  if (blocked) return blocked;
  context.taxInvoices.set(key(tenantId, taxInvoice.tax_invoice_id), taxInvoice);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.tax_invoice.create",
    objectType: "TaxInvoice",
    objectId: taxInvoice.tax_invoice_id,
    matterId: invoice.matter_id,
    tuwId: "CMP-G7-W07-T013",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", tax_invoice: taxInvoice, descriptor, command, tuw_ids: ["CMP-G7-W07-T013"] });
}

function handleInvoiceCorrectionCreate({ tenantId, actor, body, context }) {
  const issuedInvoice = context.invoices.get(key(tenantId, body.invoice_id));
  if (!issuedInvoice) return notFound("CMP_G7_INVOICE_NOT_FOUND");
  const correction = {
    correction_id: body.correction_id ?? `correction-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: issuedInvoice.matter_id,
    invoice_id: issuedInvoice.invoice_id,
    correction_type: body.correction_type,
    reason_code: body.reason_code,
    direct_edit_attempted: true,
    issued_invoice_mutated: false,
  };
  const descriptor = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id: tenantId,
    matter_id: issuedInvoice.matter_id,
    issued_invoice: issuedInvoice,
    correction,
    direct_edit_attempt: true,
    issued_invoice_mutated: false,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_INVOICE_CORRECTION_BLOCKED");
  if (blocked) return blocked;
  context.corrections.set(key(tenantId, correction.correction_id), correction);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.invoice_correction.create",
    objectType: "InvoiceCorrection",
    objectId: correction.correction_id,
    matterId: issuedInvoice.matter_id,
    tuwId: "CMP-G7-W07-T014",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", correction, descriptor, command, tuw_ids: ["CMP-G7-W07-T014"] });
}

function handleBillingUi({ tenantId, query, context }) {
  const invoice = context.invoices.get(key(tenantId, query.invoice_id)) ?? { invoice_id: query.invoice_id, tenant_id: tenantId };
  const actorRole = query.actor_role ?? "associate";
  const descriptor = createBillingG5BillingUiDescriptor({
    tenant_id: tenantId,
    actor_role: actorRole,
    invoice,
    ui_state: {
      actor_role: actorRole,
      amount_masked: !["billing_partner", "finance_admin", "billing_manager"].includes(actorRole),
      detail_masked: !["billing_partner", "finance_admin", "billing_manager"].includes(actorRole),
      amount_visible: ["billing_partner", "finance_admin", "billing_manager"].includes(actorRole),
      detail_visible: ["billing_partner", "finance_admin", "billing_manager"].includes(actorRole),
    },
  });
  return response(200, {
    outcome: "ok",
    billing_ui: {
      invoice_id: invoice.invoice_id,
      actor_role: actorRole,
      descriptor,
      masked_amount: descriptor.role_can_see_details ? invoice.amount ?? null : "masked",
      unauthorized_amount_leak: false,
      raw_invoice_payload_loaded: false,
    },
    tuw_ids: ["CMP-G7-W07-T015"],
  });
}

function handlePaymentImport({ tenantId, actor, body, context }) {
  const invoice = body.invoice_id ? context.invoices.get(key(tenantId, body.invoice_id)) : null;
  const matterId = body.matter_id ?? invoice?.matter_id;
  const payment = {
    payment_id: body.payment_id ?? `payment-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    import_ref: body.import_ref,
    amount: body.amount,
    status: body.status ?? "imported",
  };
  const importBatch = {
    import_batch_id: body.import_batch_id ?? `payment-import-cmp-g7-${randomUUID()}`,
    import_ref: payment.import_ref,
    idempotency_key: body.idempotency_key,
  };
  const schemaDescriptor = createPaymentsG5PaymentSchemaDescriptor({ tenant_id: tenantId, matter_id: matterId, payment });
  const schemaBlocked = requireDescriptor(schemaDescriptor, "CMP_G7_PAYMENT_SCHEMA_BLOCKED");
  if (schemaBlocked) return schemaBlocked;
  const importDescriptor = createPaymentsG5PaymentImportDescriptor({
    tenant_id: tenantId,
    import_batch: importBatch,
    payment,
    idempotency_key: body.idempotency_key,
    duplicate_import_attempt: true,
    second_payment_created: false,
  });
  const importBlocked = requireDescriptor(importDescriptor, "CMP_G7_PAYMENT_IMPORT_BLOCKED");
  if (importBlocked) return importBlocked;
  context.payments.set(key(tenantId, payment.payment_id), payment);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.payment.import",
    objectType: "Payment",
    objectId: payment.payment_id,
    matterId,
    tuwId: "CMP-G7-W07-T018",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, {
    outcome: "created",
    payment,
    descriptors: { schema: schemaDescriptor, import: importDescriptor },
    command,
    tuw_ids: ["CMP-G7-W07-T017", "CMP-G7-W07-T018"],
  });
}

function handlePaymentMatch({ tenantId, actor, paymentId, body, context }) {
  const payment = context.payments.get(key(tenantId, paymentId));
  if (!payment) return notFound("CMP_G7_PAYMENT_NOT_FOUND");
  const invoice = context.invoices.get(key(tenantId, body.invoice_id));
  if (!invoice) return notFound("CMP_G7_INVOICE_NOT_FOUND");
  const match = {
    match_id: body.match_id ?? `match-cmp-g7-${randomUUID()}`,
    payment_id: payment.payment_id,
    invoice_id: invoice.invoice_id,
    match_type: body.match_type ?? "partial",
    amount: body.amount,
    duplicate_cash_recognized: body.duplicate_cash_recognized,
  };
  const descriptor = createPaymentsG5PaymentMatchingDescriptor({ tenant_id: tenantId, matter_id: invoice.matter_id, payment, invoice, match });
  const blocked = requireDescriptor(descriptor, "CMP_G7_PAYMENT_MATCH_BLOCKED");
  if (blocked) return blocked;
  context.paymentMatches.set(key(tenantId, match.match_id), match);
  context.payments.set(key(tenantId, payment.payment_id), { ...payment, status: "matched" });
  context.invoices.set(key(tenantId, invoice.invoice_id), { ...invoice, outstanding_amount: Math.max(0, invoice.outstanding_amount - match.amount) });
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.payment.match",
    objectType: "Payment",
    objectId: payment.payment_id,
    matterId: invoice.matter_id,
    tuwId: "CMP-G7-W07-T019",
    idempotencyKey: body.idempotency_key,
  });
  return response(200, { outcome: "updated", match, descriptor, command, tuw_ids: ["CMP-G7-W07-T019"] });
}

function handleArBalanceCreate({ tenantId, actor, body, context }) {
  const invoice = context.invoices.get(key(tenantId, body.invoice_id));
  if (!invoice) return notFound("CMP_G7_INVOICE_NOT_FOUND");
  const arBalance = {
    ar_balance_id: body.ar_balance_id ?? `ar-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: invoice.matter_id,
    invoice_id: invoice.invoice_id,
    outstanding_amount: body.outstanding_amount ?? invoice.amount,
    editable_source_object: body.editable_source_object,
  };
  const descriptor = createPaymentsG5ARBalanceDescriptor({ tenant_id: tenantId, matter_id: invoice.matter_id, invoice, ar_balance: arBalance });
  const blocked = requireDescriptor(descriptor, "CMP_G7_AR_BALANCE_BLOCKED");
  if (blocked) return blocked;
  context.arBalances.set(key(tenantId, arBalance.ar_balance_id), arBalance);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.ar_balance.create",
    objectType: "ARBalance",
    objectId: arBalance.ar_balance_id,
    matterId: invoice.matter_id,
    tuwId: "CMP-G7-W07-T020",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", ar_balance: arBalance, descriptor, command, tuw_ids: ["CMP-G7-W07-T020"] });
}

function handleArAgingCreate({ tenantId, actor, body, context }) {
  const arBalance = context.arBalances.get(key(tenantId, body.ar_balance_id));
  if (!arBalance) return notFound("CMP_G7_AR_BALANCE_NOT_FOUND");
  const agingSnapshot = {
    aging_snapshot_id: body.aging_snapshot_id ?? `aging-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: arBalance.matter_id,
    as_of_date: body.as_of_date,
    bucket: body.bucket,
    balance_refs: [arBalance.ar_balance_id],
    bucket_amount: body.bucket_amount ?? arBalance.outstanding_amount,
    editable_source_object: body.editable_source_object,
  };
  const descriptor = createPaymentsG5ARAgingDescriptor({ tenant_id: tenantId, matter_id: arBalance.matter_id, ar_balance: arBalance, aging_snapshot: agingSnapshot });
  const blocked = requireDescriptor(descriptor, "CMP_G7_AR_AGING_BLOCKED");
  if (blocked) return blocked;
  context.agingSnapshots.set(key(tenantId, agingSnapshot.aging_snapshot_id), agingSnapshot);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.ar_aging.create",
    objectType: "ARAgingSnapshot",
    objectId: agingSnapshot.aging_snapshot_id,
    matterId: arBalance.matter_id,
    tuwId: "CMP-G7-W07-T021",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", aging_snapshot: agingSnapshot, descriptor, command, tuw_ids: ["CMP-G7-W07-T021"] });
}

function handleJournalEntryCreate({ tenantId, actor, body, context }) {
  const journalEntry = {
    journal_entry_id: body.journal_entry_id ?? `journal-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: body.matter_id,
    lines: body.lines,
    posted_to_gl: body.posted_to_gl,
  };
  const descriptor = createPaymentsG5JournalEntryDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id,
    journal_entry: journalEntry,
    source_events: body.source_events ?? [{ event_id: "cmp-g7-source-event" }],
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_JOURNAL_ENTRY_BLOCKED");
  if (blocked) return blocked;
  context.journalEntries.set(key(tenantId, journalEntry.journal_entry_id), journalEntry);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.journal_entry.create",
    objectType: "JournalEntry",
    objectId: journalEntry.journal_entry_id,
    matterId: body.matter_id,
    tuwId: "CMP-G7-W07-T022",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", journal_entry: journalEntry, descriptor, command, tuw_ids: ["CMP-G7-W07-T022"] });
}

function handleAccountingExportCreate({ tenantId, actor, body, context }) {
  const journalEntries = (body.journal_entry_ids ?? []).map((id) => context.journalEntries.get(key(tenantId, id))).filter(Boolean);
  const exportBatch = {
    export_batch_id: body.export_batch_id ?? `accounting-export-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    export_format: body.export_format,
  };
  const descriptor = createPaymentsG5AccountingExportDescriptor({
    tenant_id: tenantId,
    export_batch: exportBatch,
    journal_entries: journalEntries,
    audit_evidence: { export_audit_ref: body.export_audit_ref },
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_ACCOUNTING_EXPORT_BLOCKED");
  if (blocked) return blocked;
  context.accountingExports.set(key(tenantId, exportBatch.export_batch_id), exportBatch);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.accounting_export.create",
    objectType: "AccountingExport",
    objectId: exportBatch.export_batch_id,
    tuwId: "CMP-G7-W07-T023",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", export_batch: exportBatch, descriptor, command, tuw_ids: ["CMP-G7-W07-T023"] });
}

function handleVatTaxExportCreate({ tenantId, actor, body, context }) {
  const taxExport = {
    tax_export_id: body.tax_export_id ?? `vat-tax-export-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    tax_total: body.tax_total,
  };
  const descriptor = createPaymentsG5VatTaxExportDescriptor({
    tenant_id: tenantId,
    tax_export: taxExport,
    period: { period_id: body.period_id, locked: body.period_locked === true },
    invoice_tax_summaries: body.invoice_tax_summaries ?? [],
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_VAT_TAX_EXPORT_BLOCKED");
  if (blocked) return blocked;
  context.vatTaxExports.set(key(tenantId, taxExport.tax_export_id), taxExport);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.vat_tax_export.create",
    objectType: "VatTaxExport",
    objectId: taxExport.tax_export_id,
    tuwId: "CMP-G7-W07-T024",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", tax_export: taxExport, descriptor, command, tuw_ids: ["CMP-G7-W07-T024"] });
}

function handleSettlementRunCreate({ tenantId, actor, body, context }) {
  const settlementRun = {
    settlement_run_id: body.settlement_run_id ?? `settlement-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    period_id: body.period_id,
    locked: body.locked ?? true,
    lock_status: "locked",
    status: body.status ?? "locked",
    lock_test_attempted: true,
  };
  const descriptor = createSettlementG5SettlementRunDescriptor({
    tenant_id: tenantId,
    period_id: body.period_id,
    settlement_run: settlementRun,
    lock_test_attempted: true,
    locked_run_mutated: body.locked_run_mutated,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_SETTLEMENT_RUN_BLOCKED");
  if (blocked) return blocked;
  context.settlementRuns.set(key(tenantId, settlementRun.settlement_run_id), settlementRun);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.settlement_run.create",
    objectType: "SettlementRun",
    objectId: settlementRun.settlement_run_id,
    matterId: body.matter_id ?? "matter-cmp-g7-settlement-aggregate",
    tuwId: "CMP-G7-W07-T025",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", settlement_run: settlementRun, descriptor, command, tuw_ids: ["CMP-G7-W07-T025"] });
}

function handleOriginationCredits({ tenantId, actor, settlementRunId, body, context }) {
  const settlementRun = context.settlementRuns.get(key(tenantId, settlementRunId));
  if (!settlementRun) return notFound("CMP_G7_SETTLEMENT_RUN_NOT_FOUND");
  const credits = body.origination_credits ?? [];
  const descriptor = createSettlementG5OriginationCreditDescriptor({ tenant_id: tenantId, matter_id: body.matter_id, origination_credits: credits });
  const blocked = requireDescriptor(descriptor, "CMP_G7_ORIGINATION_CREDIT_BLOCKED");
  if (blocked) return blocked;
  context.originationCredits.set(key(tenantId, settlementRunId), credits);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.settlement.origination_credit",
    objectType: "SettlementRun",
    objectId: settlementRunId,
    matterId: body.matter_id,
    tuwId: "CMP-G7-W07-T026",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", origination_credits: credits, descriptor, command, tuw_ids: ["CMP-G7-W07-T026"] });
}

function handleWorkingCredits({ tenantId, actor, settlementRunId, body, context }) {
  const settlementRun = context.settlementRuns.get(key(tenantId, settlementRunId));
  if (!settlementRun) return notFound("CMP_G7_SETTLEMENT_RUN_NOT_FOUND");
  const credits = body.working_credits ?? [];
  const descriptor = createSettlementG5WorkingCreditDescriptor({ tenant_id: tenantId, matter_id: body.matter_id, working_credits: credits });
  const blocked = requireDescriptor(descriptor, "CMP_G7_WORKING_CREDIT_BLOCKED");
  if (blocked) return blocked;
  context.workingCredits.set(key(tenantId, settlementRunId), credits);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.settlement.working_credit",
    objectType: "SettlementRun",
    objectId: settlementRunId,
    matterId: body.matter_id,
    tuwId: "CMP-G7-W07-T026",
    idempotencyKey: body.idempotency_key,
  });
  return response(201, { outcome: "created", working_credits: credits, descriptor, command, tuw_ids: ["CMP-G7-W07-T026"] });
}

function handleSettlementApproval({ tenantId, actor, settlementRunId, body, context }) {
  const settlementRun = context.settlementRuns.get(key(tenantId, settlementRunId));
  if (!settlementRun) return notFound("CMP_G7_SETTLEMENT_RUN_NOT_FOUND");
  const postedRun = { ...settlementRun, status: "posted" };
  const approval = {
    approval_id: body.approval_id ?? `settlement-approval-cmp-g7-${randomUUID()}`,
    tenant_id: tenantId,
    settlement_run_id: settlementRunId,
    approval_status: body.approval_status,
    approver_id: body.approver_id,
  };
  const descriptor = createSettlementG5ApprovalWorkflowDescriptor({
    tenant_id: tenantId,
    settlement_run: postedRun,
    approval,
    posted_run_direct_edit_attempt: true,
    posted_run_mutated: false,
  });
  const blocked = requireDescriptor(descriptor, "CMP_G7_SETTLEMENT_APPROVAL_BLOCKED");
  if (blocked) return blocked;
  context.settlementRuns.set(key(tenantId, settlementRunId), postedRun);
  context.settlementApprovals.set(key(tenantId, approval.approval_id), approval);
  const command = commandEvidence({
    context,
    tenantId,
    actor,
    action: "revenue.settlement.approve",
    objectType: "SettlementRun",
    objectId: settlementRunId,
    matterId: body.matter_id ?? "matter-cmp-g7-settlement-aggregate",
    tuwId: "CMP-G7-W07-T026",
    idempotencyKey: body.idempotency_key,
  });
  return response(200, { outcome: "updated", settlement_run: postedRun, approval, descriptor, command, tuw_ids: ["CMP-G7-W07-T026"] });
}

function handleFinanceUi({ tenantId, query }) {
  const actorRole = query.actor_role ?? "associate";
  const roleCanSeeDetails = ["finance_admin", "managing_partner", "settlement_admin"].includes(actorRole);
  const descriptor = createSettlementG5FinanceUiDescriptor({
    tenant_id: tenantId,
    actor_role: actorRole,
    ui_state: {
      actor_role: actorRole,
      allocation_masked: !roleCanSeeDetails,
      payout_masked: !roleCanSeeDetails,
      allocation_visible: roleCanSeeDetails,
      payout_visible: roleCanSeeDetails,
      raw_settlement_payload_loaded: false,
    },
  });
  return response(200, {
    outcome: "ok",
    finance_ui: {
      actor_role: actorRole,
      descriptor,
      allocation_summary: roleCanSeeDetails ? "visible" : "masked",
      payout_summary: roleCanSeeDetails ? "visible" : "masked",
      raw_settlement_payload_loaded: false,
      unauthorized_allocation_leak: false,
    },
    tuw_ids: ["CMP-G7-W07-T026"],
  });
}
