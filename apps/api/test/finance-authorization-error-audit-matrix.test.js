import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceRepository,
} from "../../../packages/billing/src/finance-repository.js";
import {
  FINANCE_API_ERROR_CODES,
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";

const TENANT = "tenant_rfd_tuw_029";
const ACTOR = "actor_rfd_tuw_029";
const MATTER = "matter_rfd_tuw_029";
const CLIENT = "client_rfd_tuw_029";
const COMMON_QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "perm_rfd_tuw_029",
  audit_hint_ref: "audit_rfd_tuw_029",
});

const ALLOW_CONTEXT = Object.freeze({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
  rules: [{ id: "rfd_tuw_029_allow", effect: "allow", action: "*" }],
  object_acl: [],
});

const DENY_CONTEXT = Object.freeze({
  principal: { user_id: "denied_rfd_tuw_029", tenant_id: TENANT, role_ids: ["staff"] },
  rules: [],
  object_acl: [],
});

const STAFF_ALLOW_CONTEXT = Object.freeze({
  principal: { user_id: "staff_rfd_tuw_029", tenant_id: TENANT, role_ids: ["finance_user"] },
  rules: [{ id: "rfd_tuw_029_allow_staff", effect: "allow", action: "*" }],
  object_acl: [],
});

function bankTransaction(id = "bank_matrix_transaction") {
  return {
    model_type: "BankTransaction",
    bank_transaction_id: id,
    tenant_id: TENANT,
    bank_import_batch_id: "bank_matrix_batch_seed",
    account_ref: "rfd-bank-account",
    transaction_fingerprint: "b".repeat(64),
    date: "2026-07-31",
    occurred_at: "2026-07-31T09:00:00.000Z",
    direction: "inflow",
    amount: 100,
    balance_after: 100,
    currency: "KRW",
    classification_scope: "unreviewed",
  };
}

function matrixRepository() {
  return createFinanceRepository({
    seedRecords: [
      bankTransaction(),
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id: "bank_matrix_classification",
        tenant_id: TENANT,
        bank_transaction_id: "bank_matrix_transaction",
        transaction_date: "2026-07-31",
        transaction_direction: "inflow",
        category: "client_receipt",
        status: "review_required",
      },
      {
        model_type: "WipSnapshot",
        wip_snapshot_id: "snapshot_matrix_prebill",
        tenant_id: TENANT,
        matter_id: MATTER,
        immutable_snapshot: true,
        total_amount: 100,
      },
      {
        model_type: "WipSnapshot",
        wip_snapshot_id: "snapshot_matrix_prebill_new",
        tenant_id: TENANT,
        matter_id: MATTER,
        immutable_snapshot: true,
        total_amount: 100,
      },
      {
        model_type: "PreBill",
        prebill_id: "prebill_matrix",
        tenant_id: TENANT,
        matter_id: MATTER,
        wip_snapshot_id: "snapshot_matrix_prebill",
        partner_reviewer_id: ACTOR,
        currency: "KRW",
        status: "partner_review_required",
        total_amount: 100,
        adjustments_total: 0,
        adjustment_total: 0,
      },
      {
        model_type: "Payment",
        payment_id: "payment_matrix",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: CLIENT,
        bank_reference: "bank:payment_matrix",
        amount: 100,
        currency: "KRW",
        status: "imported",
        allocation_status: "unallocated",
        allocated_amount: 0,
        unallocated_amount: 100,
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice_matrix",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: CLIENT,
        amount_due: 100,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal_matrix",
        tenant_id: TENANT,
        matter_id: MATTER,
        source_ref: "matrix-source",
        currency: "KRW",
        posted_at: "2026-07-31T00:00:00.000Z",
        lines: [
          { account: "ar", debit: 100, credit: 0 },
          { account: "revenue", debit: 0, credit: 100 },
        ],
      },
    ],
  });
}

function commonBody(id) {
  return {
    ...COMMON_QUERY,
    idempotency_key: `idempotency_${id}`,
  };
}

function bankImportBody(id = "bank_import_matrix") {
  return {
    ...commonBody(id),
    bank_import_batch: {
      bank_import_batch_id: id,
      tenant_id: TENANT,
      source_manifest_hash: "a".repeat(64),
      account_ref: "rfd-bank-account",
      transaction_count: 1,
      overlap_count: 0,
      source_count: 1,
      production_import_approved: true,
    },
    transactions: [{
      bank_transaction_id: `${id}_transaction`,
      account_ref: "rfd-bank-account",
      transaction_fingerprint: "c".repeat(64),
      date: "2026-07-31",
      occurred_at: "2026-07-31T09:00:00.000Z",
      time_precision: "second",
      direction: "inflow",
      amount: 100,
      balance_after: 100,
      currency: "KRW",
      classification_scope: "unreviewed",
      counterparty: "Unmatched inflow",
    }],
  };
}

function requestFor(id) {
  const body = commonBody(id);
  const query = { ...COMMON_QUERY, idempotency_key: `idempotency_${id}` };
  switch (id) {
    case "bank-read":
      return { pathname: "/api/finance/bank-transactions", method: "GET", query };
    case "bank-classification-read":
      return { pathname: "/api/finance/bank-classifications", method: "GET", query };
    case "bank-options":
      return { pathname: "/api/finance/bank-classification-options", method: "GET", query };
    case "bank-import":
      return { pathname: "/api/finance/bank-imports", method: "POST", body: bankImportBody(id) };
    case "bank-auto":
      return { pathname: "/api/finance/bank-classifications/auto", method: "POST", body };
    case "bank-review":
      return {
        pathname: "/api/finance/bank-classifications/review",
        method: "POST",
        body: {
          ...body,
          decisions: [{
            bank_transaction_id: "bank_matrix_transaction",
            category: "other_inflow",
          }],
        },
      };
    case "prebill-read":
      return { pathname: "/api/finance/prebills", method: "GET", query };
    case "time-read":
      return { pathname: "/api/finance/time-entries", method: "GET", query };
    case "expense-read":
      return { pathname: "/api/finance/expenses", method: "GET", query };
    case "disbursement-read":
      return { pathname: "/api/finance/disbursements", method: "GET", query };
    case "fee-arrangement-read":
      return { pathname: "/api/finance/fee-arrangements", method: "GET", query };
    case "invoice-read":
      return { pathname: "/api/finance/invoices", method: "GET", query };
    case "prebill-create":
      return {
        pathname: "/api/finance/prebills",
        method: "POST",
        body: {
          ...body,
          prebill: {
            prebill_id: "prebill_matrix_new",
            tenant_id: TENANT,
            matter_id: MATTER,
            wip_snapshot_id: "snapshot_matrix_prebill_new",
            partner_reviewer_id: ACTOR,
          },
        },
      };
    case "prebill-approve":
      return { pathname: "/api/finance/prebills/approve", method: "POST", body: { ...body, prebill_id: "prebill_matrix" } };
    case "prebill-reject":
      return {
        pathname: "/api/finance/prebills/reject",
        method: "POST",
        body: { ...body, prebill_id: "prebill_matrix", reason_code: "matrix_reject" },
      };
    case "payment-read":
      return { pathname: "/api/finance/payments", method: "GET", query };
    case "payment-import":
      return {
        pathname: "/api/finance/payments",
        method: "POST",
        body: {
          ...body,
          payment: {
            payment_id: "payment_matrix_new",
            tenant_id: TENANT,
            matter_id: MATTER,
            client_group_id: CLIENT,
            bank_reference: "bank:payment_matrix_new",
            amount: 100,
            currency: "KRW",
            received_at: "2026-07-31",
          },
        },
      };
    case "payment-allocation-read":
      return { pathname: "/api/finance/payment-allocations", method: "GET", query };
    case "payment-allocation":
      return {
        pathname: "/api/finance/payment-allocations",
        method: "POST",
        body: {
          ...body,
          allocation: {
            payment_allocation_id: "allocation_matrix",
            tenant_id: TENANT,
            payment_id: "payment_matrix",
            allocation_type: "direct_fee",
            matter_id: MATTER,
            client_group_id: CLIENT,
            amount: 100,
            currency: "KRW",
          },
        },
      };
    case "payment-match":
      return {
        pathname: "/api/finance/payment-matches",
        method: "POST",
        body: {
          ...body,
          match: {
            payment_match_id: "match_matrix",
            tenant_id: TENANT,
            payment_id: "payment_matrix",
            invoice_id: "invoice_matrix",
            amount: 100,
            matched_at: "2026-07-31",
          },
        },
      };
    case "payment-match-read":
      return { pathname: "/api/finance/payment-matches", method: "GET", query };
    case "trust-read":
      return { pathname: "/api/finance/trust-balances", method: "GET", query: { ...query, matter_id: MATTER, currency: "KRW" } };
    case "trust-deposit":
      return {
        pathname: "/api/finance/trust-deposits",
        method: "POST",
        body: {
          ...body,
          deposit: {
            trust_ledger_entry_id: "trust_matrix_deposit",
            tenant_id: TENANT,
            matter_id: MATTER,
            client_group_id: CLIENT,
            amount: 100,
            currency: "KRW",
          },
        },
      };
    case "trust-drawdown":
      return {
        pathname: "/api/finance/trust-drawdowns",
        method: "POST",
        body: {
          ...body,
          drawdown: {
            trust_ledger_entry_id: "trust_matrix_drawdown",
            tenant_id: TENANT,
            matter_id: MATTER,
            invoice_id: "invoice_matrix",
            amount: 100,
            currency: "KRW",
          },
        },
      };
    case "trust-refund":
      return {
        pathname: "/api/finance/trust-refunds",
        method: "POST",
        body: {
          ...body,
          refund: {
            trust_ledger_entry_id: "trust_matrix_refund",
            tenant_id: TENANT,
            matter_id: MATTER,
            amount: 100,
            currency: "KRW",
          },
      },
      };
    case "ar-read":
      return { pathname: "/api/finance/ar-aging", method: "GET", query };
    case "accounting-export":
      return {
        pathname: "/api/finance/accounting-export.csv",
        method: "GET",
        query: { ...query, from_date: "2026-07-01", to_date: "2026-07-31" },
      };
    case "audit-read":
      return { pathname: "/api/finance/audit", method: "GET", query };
    default:
      throw new Error(`unknown RFD-TUW-029 matrix row: ${id}`);
  }
}

const COMMON_REQUIRED_FIELDS = Object.freeze(["tenant_id", "permission_ref", "audit_hint_ref"]);

function readMatrixRow(id, route, action, resourceType) {
  return {
    id,
    route,
    action,
    resource_type: resourceType,
    required_fields: COMMON_REQUIRED_FIELDS,
    write: false,
  };
}

const FINANCE_ROUTE_MATRIX = Object.freeze([
  readMatrixRow("bank-read", "GET /api/finance/bank-transactions", "finance:bank_transaction:read", "bank_transaction"),
  readMatrixRow("bank-classification-read", "GET /api/finance/bank-classifications", "finance:bank_classification:read", "bank_transaction_classification"),
  { ...readMatrixRow("bank-options", "GET /api/finance/bank-classification-options", "finance:bank_classification:options", "bank_transaction_classification"), partner_required: true },
  {
    id: "bank-import",
    route: "POST /api/finance/bank-imports",
    action: "finance:bank_import:write",
    resource_type: "bank_import_batch",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "bank_import_batch.bank_import_batch_id",
      "bank_import_batch.tenant_id",
      "bank_import_batch.source_manifest_hash",
      "bank_import_batch.account_ref",
      "transactions",
      "transactions[0].bank_transaction_id",
      "transactions[0].account_ref",
      "transactions[0].transaction_fingerprint",
      "transactions[0].date",
      "transactions[0].occurred_at",
      "transactions[0].direction",
      "transactions[0].amount",
      "transactions[0].balance_after",
      "transactions[0].currency",
      "transactions[0].classification_scope",
    ],
    write: true,
    partner_required: true,
    optional_fields: [{
      field: "bank_import_batch.production_import_approved",
      status: 403,
      safe_error_code: FINANCE_API_ERROR_CODES.approval_required,
      writes: false,
      audits: false,
    }],
  },
  {
    id: "bank-auto",
    route: "POST /api/finance/bank-classifications/auto",
    action: "finance:bank_classification:auto",
    resource_type: "bank_transaction_classification",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key"],
    write: true,
    partner_required: true,
  },
  {
    id: "bank-review",
    route: "POST /api/finance/bank-classifications/review",
    action: "finance:bank_classification:review",
    resource_type: "bank_transaction_classification",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "decisions",
      "decisions[0].bank_transaction_id",
      "decisions[0].category",
    ],
    write: true,
    partner_required: true,
  },
  readMatrixRow("prebill-read", "GET /api/finance/prebills", "finance:prebill:read", "prebill"),
  readMatrixRow("time-read", "GET /api/finance/time-entries", "finance:time:read", "time_entry"),
  readMatrixRow("expense-read", "GET /api/finance/expenses", "finance:expense:read", "expense"),
  readMatrixRow("disbursement-read", "GET /api/finance/disbursements", "finance:disbursement:read", "disbursement"),
  readMatrixRow("fee-arrangement-read", "GET /api/finance/fee-arrangements", "finance:fee_arrangement:read", "fee_arrangement"),
  readMatrixRow("invoice-read", "GET /api/finance/invoices", "finance:invoice:read", "invoice"),
  {
    id: "prebill-create",
    route: "POST /api/finance/prebills",
    action: "finance:prebill:write",
    resource_type: "prebill",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "prebill.prebill_id",
      "prebill.tenant_id",
      "prebill.matter_id",
      "prebill.wip_snapshot_id",
      "prebill.partner_reviewer_id",
    ],
    write: true,
  },
  {
    id: "prebill-approve",
    route: "POST /api/finance/prebills/approve",
    action: "finance:prebill:approve",
    resource_type: "prebill",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key", "prebill_id"],
    write: true,
    partner_required: true,
    optional_fields: [{
      field: "adjustment",
      status: 200,
      writes: true,
      audits: true,
    }],
  },
  {
    id: "prebill-reject",
    route: "POST /api/finance/prebills/reject",
    action: "finance:prebill:reject",
    resource_type: "prebill",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key", "prebill_id", "reason_code"],
    write: true,
    partner_required: true,
  },
  readMatrixRow("payment-read", "GET /api/finance/payments", "finance:payment:read", "payment"),
  {
    id: "payment-import",
    route: "POST /api/finance/payments",
    action: "finance:payment:write",
    resource_type: "payment",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "payment.payment_id",
      "payment.tenant_id",
      "payment.bank_reference",
      "payment.amount",
    ],
    write: true,
  },
  {
    id: "payment-allocation",
    route: "POST /api/finance/payment-allocations",
    action: "finance:payment_allocation:write",
    resource_type: "payment_allocation",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "allocation.payment_allocation_id",
      "allocation.tenant_id",
      "allocation.payment_id",
      "allocation.allocation_type",
      "allocation.amount",
    ],
    write: true,
  },
  readMatrixRow("payment-allocation-read", "GET /api/finance/payment-allocations", "finance:payment_allocation:read", "payment_allocation"),
  {
    id: "payment-match",
    route: "POST /api/finance/payment-matches",
    action: "finance:payment_match:write",
    resource_type: "payment_match",
    required_fields: [
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "match.payment_match_id",
      "match.tenant_id",
      "match.payment_id",
      "match.invoice_id",
      "match.amount",
    ],
    write: true,
  },
  readMatrixRow("payment-match-read", "GET /api/finance/payment-matches", "finance:payment_match:read", "payment_match"),
  readMatrixRow("trust-read", "GET /api/finance/trust-balances", "finance:trust_ledger:read", "trust_balance"),
  {
    id: "trust-deposit",
    route: "POST /api/finance/trust-deposits",
    action: "finance:trust_ledger:write",
    resource_type: "trust_ledger",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key", "deposit.tenant_id", "deposit.matter_id", "deposit.amount"],
    write: true,
  },
  {
    id: "trust-drawdown",
    route: "POST /api/finance/trust-drawdowns",
    action: "finance:trust_ledger:write",
    resource_type: "trust_ledger",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key", "drawdown.tenant_id", "drawdown.matter_id", "drawdown.invoice_id", "drawdown.amount"],
    write: true,
  },
  {
    id: "trust-refund",
    route: "POST /api/finance/trust-refunds",
    action: "finance:trust_ledger:write",
    resource_type: "trust_ledger",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref", "idempotency_key", "refund.tenant_id", "refund.matter_id", "refund.amount"],
    write: true,
  },
  readMatrixRow("ar-read", "GET /api/finance/ar-aging", "finance:ar:read", "ar_aging"),
  {
    id: "accounting-export",
    route: "GET /api/finance/accounting-export.csv",
    action: "finance:accounting_export:read",
    resource_type: "accounting_export",
    required_fields: ["tenant_id", "permission_ref", "audit_hint_ref"],
    write: true,
    optional_fields: [
      { field: "from_date", status: 201, writes: true, audits: true },
      { field: "to_date", status: 201, writes: true, audits: true },
      { field: "idempotency_key", status: 201, writes: true, audits: true },
    ],
  },
  readMatrixRow("audit-read", "GET /api/finance/audit", "finance:audit:read", "finance_audit"),
]);

function productSnapshot(repository) {
  const snapshot = repository.snapshot();
  return { records: snapshot.records, idempotency: snapshot.idempotency };
}

function replayComparableBody(body) {
  const { outcome, idempotent_replay, ...stable } = body;
  return JSON.parse(JSON.stringify(stable));
}

function deletePath(root, fieldPath) {
  const segments = fieldPath.replaceAll(/\[(\d+)\]/gu, ".$1").split(".");
  let cursor = root;
  for (const segment of segments.slice(0, -1)) {
    if (!cursor || typeof cursor !== "object") return;
    cursor = cursor[segment];
  }
  if (cursor && typeof cursor === "object") delete cursor[segments.at(-1)];
}

function omitMatrixField(request, field) {
  const root = request.method === "GET" ? request.query : request.body;
  if (field === "tenant_id") {
    if (request.method === "GET") {
      delete request.query.tenant_id;
    } else {
      delete request.body.tenant_id;
      for (const value of Object.values(request.body ?? {})) {
        if (value && typeof value === "object" && !Array.isArray(value)) delete value.tenant_id;
      }
    }
    return;
  }
  if (["permission_ref", "audit_hint_ref", "idempotency_key"].includes(field)) {
    delete root[field];
    return;
  }
  deletePath(root, field);
}

function expectedMissingFieldCode(field) {
  if (field === "tenant_id") return FINANCE_API_ERROR_CODES.tenant_required;
  if (field === "permission_ref") return FINANCE_API_ERROR_CODES.permission_required;
  if (field === "audit_hint_ref") return FINANCE_API_ERROR_CODES.audit_hint_required;
  return FINANCE_API_ERROR_CODES.validation_error;
}

async function callMatrixRow(row, { repository, context, request } = {}) {
  return handleFinanceApiRequest({
    ...request,
    context,
    requestId: `request_${row.id}`,
    runtime: createFinanceRuntimeContext({ repository }),
  });
}

const IDEMPOTENT_REPLAY = Object.freeze({ idempotency_mode: "required", replay_status: 200, replay_audit_delta: 0, replay_marker: true });
const OPTIONAL_IDEMPOTENT_REPLAY = Object.freeze({ idempotency_mode: "optional-default", replay_status: 200, replay_audit_delta: 1, replay_marker: undefined });
const SENSITIVE_INPUT_MARKERS = Object.freeze(["a".repeat(64), "c".repeat(64), "bank:payment_matrix_new"]);
const WRITE_SUCCESS_CONTRACTS = Object.freeze({
  "bank-import": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "bank.transaction.batch.import", audit_object_type: "BankImportBatch" }),
  "bank-auto": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 200, outcome: "classified", audit_action: "bank.transaction.classification.auto", audit_object_type: "BankTransactionClassification" }),
  "bank-review": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 200, outcome: "classified", audit_action: "bank.transaction.classification.review", audit_object_type: "BankTransactionClassification" }),
  "prebill-create": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "prebill.create", audit_object_type: "PreBill" }),
  "prebill-approve": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 200, outcome: "approved", audit_action: "prebill.approve_without_adjustment", audit_object_type: "PreBill" }),
  "prebill-reject": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 200, outcome: "rejected", audit_action: "prebill.reject", audit_object_type: "PreBill" }),
  "payment-import": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "payment.import", audit_object_type: "Payment" }),
  "payment-allocation": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "payment.allocate", audit_object_type: "PaymentAllocation" }),
  "payment-match": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "payment.match", audit_object_type: "PaymentMatch" }),
  "trust-deposit": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "trust_ledger.deposit.receive", audit_object_type: "TrustLedgerEntry" }),
  "trust-drawdown": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "trust_ledger.drawdown.invoice", audit_object_type: "TrustLedgerEntry" }),
  "trust-refund": Object.freeze({ ...IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "trust_ledger.refund_liability.record", audit_object_type: "TrustLedgerEntry" }),
  "accounting-export": Object.freeze({ ...OPTIONAL_IDEMPOTENT_REPLAY, status: 201, outcome: "created", audit_action: "accounting.export.csv.create", audit_object_type: "AccountingExport" }),
});

async function prepareWriteRepository(row) {
  const repository = matrixRepository();
  if (row.id === "trust-drawdown" || row.id === "trust-refund") {
    const depositRow = FINANCE_ROUTE_MATRIX.find((candidate) => candidate.id === "trust-deposit");
    const depositRequest = requestFor("trust-deposit");
    depositRequest.body.idempotency_key = `setup_${row.id}`;
    const deposit = await callMatrixRow(depositRow, {
      repository,
      context: ALLOW_CONTEXT,
      request: depositRequest,
    });
    assert.equal(deposit.status, 201, `${row.id} setup deposit`);
  }
  return repository;
}

function expectedWriteAuditDelta(row, contract) {
  const writeAudit = [[contract.audit_action, contract.audit_object_type]];
  return row.id === "accounting-export"
    ? [...writeAudit, ["finance:accounting_export:read", "accounting_export"]]
    : writeAudit;
}

test("RFD-TUW-029 matrix explicitly covers finance route actions and required fields", () => {
  assert.equal(FINANCE_ROUTE_MATRIX.length, 28);
  for (const row of FINANCE_ROUTE_MATRIX) {
    assert.match(row.route, /^(GET|POST) \/api\/finance\//u);
    assert.match(row.action, /^finance:/u);
    assert.ok(row.resource_type);
    assert.ok(row.required_fields.length >= 3, `${row.id} must declare common required fields`);
    assert.equal(typeof row.write, "boolean");
    const request = requestFor(row.id);
    assert.equal(`${request.method} ${request.pathname}`, row.route);
  }
});

test("RFD-TUW-029 every successful write freezes status, receipt audit, and sensitivity boundaries", async () => {
  const writeRows = FINANCE_ROUTE_MATRIX.filter((row) => row.write);
  assert.deepEqual(new Set(writeRows.map((row) => row.id)), new Set(Object.keys(WRITE_SUCCESS_CONTRACTS)));

  for (const row of writeRows) {
    const contract = WRITE_SUCCESS_CONTRACTS[row.id];
    const repository = await prepareWriteRepository(row);
    const request = requestFor(row.id);
    const before = productSnapshot(repository);
    const beforeAuditCount = repository.listAudit({ tenant_id: TENANT }).length;
    const response = await callMatrixRow(row, {
      repository,
      context: ALLOW_CONTEXT,
      request,
    });

    assert.equal(response.status, contract.status, `${row.route} success status`);
    assert.equal(response.body.outcome, contract.outcome, `${row.route} success outcome`);
    assert.deepEqual(response.body.safe_error_codes, [], `${row.route} success error contract`);
    assert.ok(response.body.audit_event, `${row.route} must expose its durable write audit receipt`);
    assert.equal(response.body.audit_event.action, contract.audit_action, `${row.route} receipt action`);
    assert.equal(response.body.audit_event.object_type, contract.audit_object_type, `${row.route} receipt object type`);
    assert.equal(response.body.audit_event.idempotency_key, request.method === "GET"
      ? request.query.idempotency_key
      : request.body.idempotency_key, `${row.route} receipt idempotency binding`);
    assert.notEqual(response.body.audit_event.metadata?.raw_payload_included, true, `${row.route} audit raw payload leak`);
    assert.notEqual(response.body.audit_event.metadata?.raw_source_payload_included, true, `${row.route} audit source payload leak`);
    assert.notEqual(response.body.audit_event.metadata?.credential_material_included, true, `${row.route} audit credential leak`);
    assert.notEqual(response.body.audit_event.metadata?.bank_reference_included, true, `${row.route} audit bank reference leak`);

    const item = response.body.item;
    if (item) {
      assert.equal(item.bank_reference, undefined, `${row.route} response bank reference leak`);
      assert.equal(item.lines, undefined, `${row.route} response journal lines leak`);
      assert.equal(item.credential_material, undefined, `${row.route} response credential leak`);
      assert.equal(item.source_manifest_hash, undefined, `${row.route} response source hash leak`);
      assert.equal(item.transaction_fingerprint, undefined, `${row.route} response transaction fingerprint leak`);
    }
    const serializedBody = JSON.stringify(response.body);
    for (const marker of SENSITIVE_INPUT_MARKERS) {
      assert.equal(serializedBody.includes(marker), false, `${row.route} response leaked sensitive input marker`);
    }

    const persisted = repository.listAudit({ tenant_id: TENANT });
    assert.deepEqual(
      persisted.slice(beforeAuditCount).map((event) => [event.action, event.object_type]),
      expectedWriteAuditDelta(row, contract),
      `${row.route} exact first-call durable audit delta`,
    );
    const persistedReceipt = persisted.find((event) => event.event_id === response.body.audit_event.event_id);
    assert.ok(persistedReceipt, `${row.route} must persist the response audit receipt`);
    assert.equal(persistedReceipt.action, contract.audit_action, `${row.route} persisted audit action`);
    assert.equal(persistedReceipt.object_type, contract.audit_object_type, `${row.route} persisted audit object type`);
    assert.notDeepEqual(productSnapshot(repository), before, `${row.route} success must commit a product/idempotency change`);
    assert.equal(repository.snapshot().idempotency.length, before.idempotency.length + 1, `${row.route} success must record one idempotency receipt`);
  }
});

test("RFD-TUW-029 declared idempotent writes replay without product or duplicate-receipt mutation", async () => {
  const writeRows = FINANCE_ROUTE_MATRIX.filter((row) => row.write);
  const idempotentRows = writeRows.filter((row) => row.required_fields.includes("idempotency_key") || WRITE_SUCCESS_CONTRACTS[row.id].idempotency_mode === "optional-default");
  assert.equal(idempotentRows.length, writeRows.length, "every write route must declare required or default idempotency");

  for (const row of idempotentRows) {
    const contract = WRITE_SUCCESS_CONTRACTS[row.id];
    const repository = await prepareWriteRepository(row);
    const request = requestFor(row.id);
    const first = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
    assert.equal(first.status, contract.status, `${row.route} first status before replay`);
    const afterFirst = productSnapshot(repository);
    const firstAuditCount = repository.listAudit({ tenant_id: TENANT }).length;

    const replay = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
    assert.equal(replay.status, contract.replay_status, `${row.route} replay status`);
    assert.equal(replay.body.outcome, "idempotent_replay", `${row.route} replay outcome`);
    assert.equal(replay.body.idempotent_replay, contract.replay_marker, `${row.route} replay marker`);
    assert.deepEqual(replayComparableBody(replay.body), replayComparableBody(first.body), `${row.route} replay receipt stability`);
    assert.deepEqual(productSnapshot(repository), afterFirst, `${row.route} replay mutated product/idempotency state`);
    const replayAudits = repository.listAudit({ tenant_id: TENANT });
    assert.equal(replayAudits.length, firstAuditCount + contract.replay_audit_delta, `${row.route} replay audit delta`);
    assert.equal(repository.snapshot().idempotency.length, afterFirst.idempotency.length, `${row.route} replay added an idempotency record`);
    if (contract.replay_audit_delta === 1) {
      const newAudits = replayAudits.slice(firstAuditCount);
      assert.deepEqual(newAudits.map((event) => [event.action, event.decision]), [["finance:accounting_export:read", "allow"]], `${row.route} replay audit exception`);
    }
  }
});

test("RFD-TUW-029 authorization denial is fail-closed, audited, and never mutates product state", async () => {
  for (const row of FINANCE_ROUTE_MATRIX) {
    const repository = matrixRepository();
    const request = requestFor(row.id);
    const before = productSnapshot(repository);
    const response = await callMatrixRow(row, {
      repository,
      context: DENY_CONTEXT,
      request,
    });

    assert.equal(response.status, 403, row.route);
    assert.deepEqual(response.body.safe_error_codes, [FINANCE_API_ERROR_CODES.unauthorized_omission], row.route);
    assert.deepEqual(response.body.items, [], row.route);
    assert.equal(response.body.count_leak_prevented, true, row.route);
    assert.deepEqual(productSnapshot(repository), before, `${row.route} wrote product state after authorization failure`);

    const audits = repository.listAudit({ tenant_id: TENANT });
    assert.equal(audits.length, 1, `${row.route} must append exactly one denial audit`);
    assert.equal(audits[0].action, row.action, row.route);
    assert.equal(audits[0].object_type, row.resource_type, row.route);
    assert.equal(audits[0].decision, "deny", row.route);
    assert.equal(audits[0].metadata.denied_route_audit, true, row.route);
    assert.equal(audits[0].metadata.raw_payload_included, false, row.route);
    assert.equal(audits[0].metadata.credential_material_included, false, row.route);
  }
});

test("RFD-TUW-029 every declared required field is independently fail-closed", async () => {
  for (const row of FINANCE_ROUTE_MATRIX) {
    for (const field of row.required_fields) {
      const repository = matrixRepository();
      const request = requestFor(row.id);
      omitMatrixField(request, field);
      const before = repository.snapshot();
      const response = await callMatrixRow(row, {
        repository,
        context: ALLOW_CONTEXT,
        request,
      });

      assert.equal(response.status, 400, `${row.route} missing ${field}`);
      assert.deepEqual(
        response.body.safe_error_codes,
        [expectedMissingFieldCode(field)],
        `${row.route} missing ${field}`,
      );
      assert.equal(response.body.count_leak_prevented, true, `${row.route} missing ${field}`);
      assert.deepEqual(
        repository.snapshot(),
        before,
        `${row.route} wrote state after required-field validation failure: ${field}`,
      );
      assert.equal(
        repository.listAudit({ tenant_id: TENANT }).length,
        0,
        `${row.route} audited a validation failure: ${field}`,
      );
    }
  }
});

test("RFD-TUW-029 optional fields are explicit and their current behavior is characterized", async () => {
  for (const row of FINANCE_ROUTE_MATRIX.filter((candidate) => candidate.optional_fields?.length)) {
    for (const optional of row.optional_fields) {
      const repository = matrixRepository();
      const request = requestFor(row.id);
      omitMatrixField(request, optional.field);
      const before = productSnapshot(repository);
      const response = await callMatrixRow(row, {
        repository,
        context: ALLOW_CONTEXT,
        request,
      });

      assert.equal(response.status, optional.status, `${row.route} optional ${optional.field}`);
      if (optional.safe_error_code) {
        assert.deepEqual(
          response.body.safe_error_codes,
          [optional.safe_error_code],
          `${row.route} optional ${optional.field}`,
        );
      } else {
        assert.deepEqual(response.body.safe_error_codes, [], `${row.route} optional ${optional.field}`);
      }
      if (optional.writes) {
        assert.notDeepEqual(productSnapshot(repository), before, `${row.route} optional ${optional.field} must write its accepted result`);
      } else {
        assert.deepEqual(productSnapshot(repository), before, `${row.route} optional ${optional.field} must not write`);
      }
      const auditCount = repository.listAudit({ tenant_id: TENANT }).length;
      assert.equal(auditCount > 0, optional.audits, `${row.route} optional ${optional.field} audit contract`);

      if (row.id === "accounting-export") {
        if (optional.field === "from_date") assert.equal(response.body.item.from_date, null);
        if (optional.field === "to_date") assert.equal(response.body.item.to_date, null);
      }
      if (row.id === "bank-import") assert.equal(response.body.ui_state, "review_required");
      if (row.id === "prebill-approve") assert.equal(response.body.outcome, "approved");
    }
  }
});

test("RFD-TUW-029 partner approval denial has a distinct audited reason and no writes", async () => {
  for (const row of FINANCE_ROUTE_MATRIX.filter((candidate) => candidate.partner_required)) {
    const repository = matrixRepository();
    const before = productSnapshot(repository);
    const response = await callMatrixRow(row, {
      repository,
      context: STAFF_ALLOW_CONTEXT,
      request: requestFor(row.id),
    });

    assert.equal(response.status, 403, row.route);
    assert.deepEqual(response.body.safe_error_codes, [FINANCE_API_ERROR_CODES.unauthorized_omission], row.route);
    assert.deepEqual(productSnapshot(repository), before, `${row.route} wrote after partner-role denial`);
    const [audit] = repository.listAudit({ tenant_id: TENANT });
    assert.equal(audit.action, row.action, row.route);
    assert.equal(audit.decision, "deny", row.route);
    assert.equal(audit.reason, "finance_partner_role_required", row.route);
    assert.equal(audit.metadata.raw_payload_included, false, row.route);
  }
});

test("RFD-TUW-029 successful sensitive reads and export carry allow-audit semantics", async () => {
  const repository = matrixRepository();
  const expected = FINANCE_ROUTE_MATRIX.filter((row) => [
    "bank-read",
    "bank-classification-read",
    "prebill-read",
    "time-read",
    "expense-read",
    "disbursement-read",
    "fee-arrangement-read",
    "invoice-read",
    "payment-read",
    "payment-allocation-read",
    "payment-match-read",
    "trust-read",
    "ar-read",
    "accounting-export",
  ].includes(row.id));

  for (const row of expected) {
    const response = await callMatrixRow(row, {
      repository,
      context: ALLOW_CONTEXT,
      request: requestFor(row.id),
    });
    assert.ok([200, 201].includes(response.status), row.route);
    const audit = repository.listAudit({ tenant_id: TENANT }).find(
      (event) => event.action === row.action && event.object_type === row.resource_type && event.decision === "allow",
    );
    assert.ok(audit, `${row.route} must append an allow read audit`);
    assert.equal(audit.reason, "finance_sensitive_read_allowed_after_permission_gate", row.route);
    assert.equal(audit.metadata.sensitive_read_audit_required, true, row.route);
    assert.equal(audit.metadata.raw_payload_included, false, row.route);
    assert.equal(audit.metadata.credential_material_included, false, row.route);
    assert.equal(audit.metadata.bank_reference_included, false, row.route);
    assert.equal(audit.metadata.journal_lines_included, false, row.route);
  }

  const auditRead = await callMatrixRow(
    FINANCE_ROUTE_MATRIX.find((row) => row.id === "audit-read"),
    { repository, context: ALLOW_CONTEXT, request: requestFor("audit-read") },
  );
  assert.equal(auditRead.status, 200);
  assert.ok(auditRead.body.items.some((event) => event.action === "finance:accounting_export:read"));
});

test("RFD-TUW-029 bank import is atomic, idempotent, and keeps unmatched inflows out of revenue", async () => {
  const repository = createFinanceRepository();
  const request = requestFor("bank-import");
  const first = await callMatrixRow(
    FINANCE_ROUTE_MATRIX.find((row) => row.id === "bank-import"),
    { repository, context: ALLOW_CONTEXT, request },
  );
  assert.equal(first.status, 201);
  assert.equal(first.body.item.bank_import_batch_id, "bank-import");
  assert.equal(first.body.transaction_count, 1);
  assert.equal(first.body.item.source_manifest_hash, undefined);
  assert.equal(first.body.raw_source_payload_included, false);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);
  const imported = repository.list({ tenant_id: TENANT, model_type: "BankTransaction" });
  assert.equal(imported.length, 1);
  assert.equal(imported[0].automatic_revenue_recognition_applied, false);

  const afterFirst = repository.snapshot();
  const replay = await callMatrixRow(
    FINANCE_ROUTE_MATRIX.find((row) => row.id === "bank-import"),
    { repository, context: ALLOW_CONTEXT, request },
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(replayComparableBody(replay.body), replayComparableBody(first.body));
  assert.deepEqual(repository.snapshot(), afterFirst);

  const invalidRepository = createFinanceRepository();
  const invalidRequest = requestFor("bank-import");
  invalidRequest.body.idempotency_key = "bank-import-invalid-fingerprint";
  invalidRequest.body.transactions = [
    invalidRequest.body.transactions[0],
    { ...invalidRequest.body.transactions[0], bank_transaction_id: "duplicate_transaction" },
  ];
  invalidRequest.body.bank_import_batch = {
    ...invalidRequest.body.bank_import_batch,
    bank_import_batch_id: "bank-import-invalid",
    transaction_count: 2,
  };
  const beforeInvalid = invalidRepository.snapshot();
  const invalid = await callMatrixRow(
    FINANCE_ROUTE_MATRIX.find((row) => row.id === "bank-import"),
    { repository: invalidRepository, context: ALLOW_CONTEXT, request: invalidRequest },
  );
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.deepEqual(invalidRepository.snapshot(), beforeInvalid);
});

test("RFD-TUW-029 PreBill approval is atomic and idempotent across the API boundary", async () => {
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "PreBill",
      prebill_id: "prebill_atomic_matrix",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot_atomic_matrix",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
      status: "partner_review_required",
      total_amount: 100,
      adjustments_total: 0,
      adjustment_total: 0,
    }],
  });
  const row = FINANCE_ROUTE_MATRIX.find((candidate) => candidate.id === "prebill-approve");
  const request = requestFor("prebill-approve");
  request.body.prebill_id = "prebill_atomic_matrix";
  request.body.idempotency_key = "prebill-approval-atomic";
  const first = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(first.status, 200);
  assert.equal(first.body.outcome, "approved");
  const afterFirst = repository.snapshot();
  const replay = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.idempotent_replay, true);
  assert.deepEqual(replayComparableBody(replay.body), replayComparableBody(first.body));
  assert.deepEqual(repository.snapshot(), afterFirst);

  const invalidRepository = createFinanceRepository({
    seedRecords: [{
      model_type: "PreBill",
      prebill_id: "prebill_invalid_matrix",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot_invalid_matrix",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
      status: "partner_review_required",
      total_amount: 100,
      adjustments_total: 0,
      adjustment_total: 0,
    }],
  });
  const invalidRequest = requestFor("prebill-approve");
  invalidRequest.body.prebill_id = "prebill_invalid_matrix";
  invalidRequest.body.idempotency_key = "prebill-invalid-adjustment";
  invalidRequest.body.adjustment = {
    adjustment_id: "adjustment_invalid_matrix",
    prebill_id: "prebill_invalid_matrix",
    adjustment_type: "write_down",
    amount: 0,
    reason_code: "matrix_invalid",
  };
  const beforeInvalid = invalidRepository.snapshot();
  const invalid = await callMatrixRow(row, { repository: invalidRepository, context: ALLOW_CONTEXT, request: invalidRequest });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.equal(invalid.body.code, FINANCE_API_ERROR_CODES.validation_error);
  assert.equal(invalid.body.message, "adjustment amount must be positive");
  assert.deepEqual(invalidRepository.snapshot(), beforeInvalid);
});

test("RFD-TUW-029 direct receipt remains unmatched until explicit allocation", async () => {
  const repository = createFinanceRepository();
  const row = FINANCE_ROUTE_MATRIX.find((candidate) => candidate.id === "payment-import");
  const request = requestFor("payment-import");
  request.body.payment.payment_id = "payment_direct_receipt_matrix";
  request.body.payment.bank_reference = "bank:direct_receipt_matrix";
  request.body.idempotency_key = "payment-direct-receipt-matrix";
  const received = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(received.status, 201);
  assert.equal(received.body.item.allocation_status, "unallocated");
  assert.equal(received.body.item.unallocated_amount, 100);
  assert.equal(received.body.item.invoice_id, undefined);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);

  const afterReceived = repository.snapshot();
  const replay = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(replayComparableBody(replay.body), replayComparableBody(received.body));
  assert.deepEqual(repository.snapshot(), afterReceived);

  const invalidRequest = requestFor("payment-import");
  invalidRequest.body.payment.payment_id = "payment_invalid_direct_receipt_matrix";
  invalidRequest.body.payment.bank_reference = "bank:invalid_direct_receipt_matrix";
  invalidRequest.body.payment.amount = 0;
  invalidRequest.body.idempotency_key = "payment-invalid-direct-receipt-matrix";
  const beforeInvalid = repository.snapshot();
  const invalid = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request: invalidRequest });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.deepEqual(repository.snapshot(), beforeInvalid);
});

test("RFD-TUW-029 trust deposit protects atomic balance updates and idempotent replay", async () => {
  const repository = createFinanceRepository();
  const row = FINANCE_ROUTE_MATRIX.find((candidate) => candidate.id === "trust-deposit");
  const request = requestFor("trust-deposit");
  request.body.idempotency_key = "trust-deposit-matrix";
  const first = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(first.status, 201);
  assert.equal(first.body.item.entry_type, "deposit");
  assert.equal(first.body.trust_balance.available_balance, 100);
  const afterFirst = repository.snapshot();
  const replay = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(replayComparableBody(replay.body), replayComparableBody(first.body));
  assert.deepEqual(repository.snapshot(), afterFirst);

  const invalidRequest = requestFor("trust-deposit");
  invalidRequest.body.deposit.trust_ledger_entry_id = "trust_invalid_matrix";
  invalidRequest.body.deposit.amount = -1;
  invalidRequest.body.idempotency_key = "trust-invalid-matrix";
  const beforeInvalid = repository.snapshot();
  const invalid = await callMatrixRow(row, { repository, context: ALLOW_CONTEXT, request: invalidRequest });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.deepEqual(repository.snapshot(), beforeInvalid);
});
