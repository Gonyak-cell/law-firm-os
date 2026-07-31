import { randomUUID } from "node:crypto";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { runFinancePostgresCommand } from "../../../packages/billing/src/central-ledger.js";
import { importBankTransactionBatch } from "../../../packages/billing/src/bank-transaction-service.js";
import {
  BANK_CLASSIFICATION_CATEGORIES,
  autoClassifyBankTransactions,
  bankEmployeePayrollCategory,
  bankTransactionClassificationId,
  previewBankTransactionClassifications,
  resolveBankClassificationCommandReplay,
  reviewBankTransactionClassifications,
  summarizeBankTransactionClassifications,
} from "../../../packages/billing/src/bank-classification-service.js";
import { approveTimeEntryForWip, createTimeEntry } from "../../../packages/time-expense/src/time-entry-service.js";
import { createFeeArrangement, findFeeArrangementForMatter } from "../../../packages/time-expense/src/fee-arrangement-service.js";
import { createExpense } from "../../../packages/time-expense/src/expense-service.js";
import { createDisbursement } from "../../../packages/time-expense/src/disbursement-service.js";
import { generateWipFromApprovedItems, lockWipSnapshot } from "../../../packages/billing/src/wip-service.js";
import { approvePreBillWithoutAdjustment, createPreBill, rejectPreBill } from "../../../packages/billing/src/prebill-service.js";
import { createInvoiceFromPreBill } from "../../../packages/billing/src/invoice-service.js";
import {
  createFeeCommitment,
  listFeeCommitments,
  presentFeeCommitment,
  updateFeeCommitment,
} from "../../../packages/billing/src/fee-commitment-service.js";
import {
  autoAllocateConfirmedClientDeposits,
} from "../../../packages/billing/src/client-deposit-allocation-service.js";
import {
  listClientDepositAllocations,
  reallocateClientDeposit,
  synchronizeClientDepositAllocationReversals,
} from "../../../packages/billing/src/client-deposit-reallocation-service.js";
import { buildClientReceivables } from "../../../packages/billing/src/client-receivables-service.js";
import { confirmBankReceipt, importPayment } from "../../../packages/payments/src/payment-service.js";
import { allocatePayment } from "../../../packages/payments/src/payment-allocation-service.js";
import { matchPaymentToInvoice } from "../../../packages/payments/src/matching-service.js";
import { createArAgingSnapshot } from "../../../packages/payments/src/ar-service.js";
import { createAccountingCsvExport } from "../../../packages/payments/src/accounting-export-service.js";
import {
  drawdownTrustToInvoice,
  getTrustBalanceReport,
  receiveTrustDeposit,
  recordTrustRefundLiability,
} from "../../../packages/payments/src/trust-ledger-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";
import {
  listAmicBankClassificationEmployees,
  listBankClassificationClientRecords,
} from "./amic-bank-classification-directory.js";
import {
  MAX_AMIC_WORKBOOK_SOURCE_BYTES,
  MAX_NH_BANK_STATEMENT_PDF_BYTES,
  previewAmicWorkbookBuffer,
  previewNhBankStatementPdfBuffer,
  sha256,
} from "../../../packages/import-data/src/index.js";
import { createBankImportPreviewTokenAuthority } from "./bank-import-preview-token.js";

export const FINANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "finance",
  contract_ref: "contracts/finance-runtime-contract.json",
  contract_schema_version: "law-firm-os.finance-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/finance/time-entries",
    "GET /api/finance/bank-transactions",
    "GET /api/finance/bank-classifications",
    "GET /api/finance/bank-classification-options",
    "GET /api/finance/client-deposits",
    "GET /api/finance/client-deposits/:bank_transaction_id",
    "GET /api/finance/client-receivables",
    "POST /api/finance/bank-imports/preview",
    "POST /api/finance/bank-imports",
    "POST /api/finance/bank-classifications/auto",
    "POST /api/finance/bank-classifications/review",
    "POST /api/finance/time-entries",
    "POST /api/finance/time-entries/approve",
    "GET /api/finance/expenses",
    "POST /api/finance/expenses",
    "GET /api/finance/disbursements",
    "POST /api/finance/disbursements",
    "GET /api/finance/fee-arrangements",
    "POST /api/finance/fee-arrangements",
    "GET /api/finance/fee-commitments",
    "POST /api/finance/fee-commitments",
    "PATCH /api/finance/fee-commitments/:id",
    "GET /api/finance/client-deposit-allocations",
    "POST /api/finance/client-deposit-allocations/reallocate",
    "POST /api/finance/wip",
    "POST /api/finance/wip-snapshots",
    "GET /api/finance/prebills",
    "POST /api/finance/prebills",
    "POST /api/finance/prebills/approve",
    "POST /api/finance/prebills/reject",
    "GET /api/finance/invoices",
    "POST /api/finance/invoices",
    "GET /api/finance/payments",
    "POST /api/finance/payments",
    "GET /api/finance/payment-allocations",
    "POST /api/finance/payment-allocations",
    "GET /api/finance/payment-matches",
    "POST /api/finance/payment-matches",
    "GET /api/finance/ar-aging",
    "GET /api/finance/accounting-export.csv",
    "GET /api/finance/trust-balances",
    "POST /api/finance/trust-deposits",
    "POST /api/finance/trust-drawdowns",
    "POST /api/finance/trust-refunds",
    "GET /api/finance/audit",
  ]),
  data_source: "finance_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const FINANCE_API_ERROR_CODES = Object.freeze({
  tenant_required: "FINANCE_TENANT_REQUIRED",
  permission_required: "FINANCE_PERMISSION_REQUIRED",
  audit_hint_required: "FINANCE_AUDIT_HINT_REQUIRED",
  validation_error: "FINANCE_API_VALIDATION_ERROR",
  unauthorized_omission: "FINANCE_UNAUTHORIZED_OMISSION",
  review_required: "FINANCE_REVIEW_REQUIRED",
  approval_required: "FINANCE_APPROVAL_REQUIRED",
  not_found: "FINANCE_NOT_FOUND",
  source_file_required: "FINANCE_SOURCE_FILE_REQUIRED",
  source_file_invalid: "FINANCE_SOURCE_FILE_INVALID",
  source_file_too_large: "FINANCE_SOURCE_FILE_TOO_LARGE",
  source_file_limit_exceeded: "FINANCE_SOURCE_FILE_LIMIT_EXCEEDED",
  preview_confirmation_required: "FINANCE_PREVIEW_CONFIRMATION_REQUIRED",
  preview_confirmation_invalid: "FINANCE_PREVIEW_CONFIRMATION_INVALID",
  preview_confirmation_expired: "FINANCE_PREVIEW_CONFIRMATION_EXPIRED",
  preview_confirmation_changed: "FINANCE_PREVIEW_CONFIRMATION_CHANGED",
  preview_no_new_transactions: "FINANCE_PREVIEW_NO_NEW_TRANSACTIONS",
  client_transaction_rows_rejected: "FINANCE_CLIENT_TRANSACTION_ROWS_REJECTED",
  idempotency_conflict: "FINANCE_IDEMPOTENCY_CONFLICT",
  classification_version_conflict: "FINANCE_BANK_CLASSIFICATION_VERSION_CONFLICT",
  client_link_invalid: "FINANCE_CLIENT_LINK_INVALID",
  client_receivables_limit_exceeded:
    "FINANCE_CLIENT_RECEIVABLES_LIMIT_EXCEEDED",
  client_receivables_unavailable: "FINANCE_CLIENT_RECEIVABLES_UNAVAILABLE",
});

export const FINANCE_RUNTIME_SEED = Object.freeze([
  Object.freeze({
    model_type: "RateCard",
    rate_card_id: "rate_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    currency: "KRW",
    effective_from: "2026-06-20",
    role_rates: Object.freeze([Object.freeze({ role_id: "partner", hourly_rate: 400000 })]),
    status: "active",
  }),
  Object.freeze({
    model_type: "TimeEntry",
    time_entry_id: "time_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    actor_id: "user_cmp_g7_finance",
    role_id: "partner",
    work_date: "2026-06-20",
    narrative: "Synthetic approved time",
    duration_minutes: 60,
    billable: true,
    status: "approved",
    approved_for_wip: true,
  }),
  Object.freeze({
    model_type: "Invoice",
    invoice_id: "invoice_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    prebill_id: "prebill_cmp_g7_seed",
    billing_client_party_id: "party_cmp_g6_client_001",
    amount_due: 400000,
    amount_paid: 0,
    currency: "KRW",
    issued_at: "2026-04-10T00:00:00.000Z",
    due_date: "2026-05-10",
    status: "issued",
  }),
  Object.freeze({
    model_type: "ARBalance",
    ar_balance_id: "ar_cmp_g7_seed",
    tenant_id: "tenant_cmp_g7_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    invoice_id: "invoice_cmp_g7_seed",
    billing_client_party_id: "party_cmp_g6_client_001",
    due_date: "2026-05-10",
    balance: 400000,
    status: "open",
  }),
]);

export function createFinanceRuntimeContext({
  repository = createFinanceRepository({ seedRecords: FINANCE_RUNTIME_SEED }),
  masterDataRepository = null,
  crmRepository = null,
  matterRepository = null,
  clientRecords = null,
  employees = listAmicBankClassificationEmployees(),
  employeeRepository = null,
  bankImportPreviewTokens = createBankImportPreviewTokenAuthority(),
} = {}) {
  if (typeof bankImportPreviewTokens?.issue !== "function"
      || typeof bankImportPreviewTokens?.verify !== "function") {
    throw new TypeError("bank import preview token authority is required");
  }
  return Object.freeze({
    repository,
    masterDataRepository,
    crmRepository,
    matterRepository,
    clientRecords: Array.isArray(clientRecords) ? Object.freeze([...clientRecords]) : null,
    employees: Object.freeze([...(employees ?? [])]),
    employeeRepository,
    bankImportPreviewTokens,
    seed_ref: "cmp-g7-finance-synthetic",
  });
}

const DEFAULT_RUNTIME = createFinanceRuntimeContext();

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        safe_error_codes: [
          decision.effect === "review_required" ? FINANCE_API_ERROR_CODES.review_required : FINANCE_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function appendFinanceRouteAudit({ repository, context, query, action, resourceType, decision } = {}) {
  if (!repository || typeof repository.appendAudit !== "function") return null;
  if (!query?.tenant_id || decision?.effect === "allow") return null;
  return repository.appendAudit({
    event_id: `finance_route_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    action,
    object_type: resourceType,
    object_id: resourceType,
    decision: ["review_required", "approval_required"].includes(decision?.effect) ? decision.effect : "deny",
    reason: decision?.reason ?? "finance_route_denied",
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref: query.permission_ref ?? null,
      audit_hint_ref: query.audit_hint_ref ?? null,
      fail_closed: Boolean(decision?.fail_closed),
      denied_route_audit: true,
      raw_payload_included: false,
      credential_material_included: false,
    },
  });
}

function appendFinanceSensitiveReadAudit({ repository, context, query, action, resourceType, returnedCount = null, metadata = {} } = {}) {
  if (!repository || typeof repository.appendAudit !== "function" || !query?.tenant_id) return null;
  return repository.appendAudit({
    event_id: `finance_sensitive_read_${randomUUID()}`,
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? context?.principal?.actor_id ?? "unknown_actor",
    action,
    object_type: resourceType,
    object_id: resourceType,
    decision: "allow",
    reason: "finance_sensitive_read_allowed_after_permission_gate",
    occurred_at: new Date().toISOString(),
    metadata: {
      ...metadata,
      permission_ref: query.permission_ref ?? null,
      audit_hint_ref: query.audit_hint_ref ?? null,
      returned_count: returnedCount,
      sensitive_read_audit_required: true,
      raw_payload_included: false,
      credential_material_included: false,
      bank_reference_included: false,
      journal_lines_included: false,
    },
  });
}

function requiredFinanceScope(action = "") {
  if (action.startsWith("finance:bank_import:")) return "finance.bank.import";
  if (action.startsWith("finance:bank_classification:") && !action.endsWith(":read")) return "finance.bank.classify";
  if (action.startsWith("finance:bank_classification:")) return "finance.bank.read";
  if (action.startsWith("finance:bank_transaction:")) return "finance.bank.read";
  if (["finance:time:approve", "finance:prebill:approve", "finance:prebill:reject"].includes(action)) return "finance.approve";
  if (action.startsWith("finance:time:")) return "finance.time.write";
  if (action.startsWith("finance:expense:") || action.startsWith("finance:disbursement:")) return "finance.expense.write";
  if (action.startsWith("finance:payment:") || action.startsWith("finance:payment_allocation:") || action.startsWith("finance:payment_match:") || action.startsWith("finance:trust_ledger:")) return "finance.payment.write";
  if (action.startsWith("finance:accounting_export:")) return "finance.export";
  if (action.startsWith("finance:audit:")) return "finance.audit.read";
  if (action.startsWith("finance:ar:")) return "analytics.finance.read";
  if (action.startsWith("finance:fee_commitment:")) return "finance.fee.write";
  if (action.startsWith("finance:deposit_allocation:")) return "finance.fee.write";
  if (["finance:fee_arrangement:", "finance:wip:", "finance:wip_snapshot:", "finance:prebill:", "finance:invoice:"].some((prefix) => action.startsWith(prefix))) return "finance.billing.write";
  return null;
}

function explicitScopeDecision(context, requiredScope) {
  const scopes = context?.principal?.scopes;
  if (!requiredScope || !Array.isArray(scopes) || scopes.includes(requiredScope)) return null;
  return { effect: "deny", reason: `finance_scope_required:${requiredScope}`, fail_closed: true };
}

function aclResourceId(entry = {}) {
  return entry.resource_id ?? entry.client_group_id ?? null;
}

function collectionPermissionContext(context) {
  if (!context || typeof context !== "object") return context;
  return {
    ...context,
    object_acl: Array.isArray(context.object_acl)
      ? context.object_acl.filter((entry) => aclResourceId(entry) === null)
      : [],
  };
}

function resourcePermissionContext(context, resourceId) {
  if (!context || typeof context !== "object") return context;
  return {
    ...context,
    object_acl: Array.isArray(context.object_acl)
      ? context.object_acl.filter((entry) => {
          const scopedId = aclResourceId(entry);
          return scopedId === null || scopedId === resourceId;
        })
      : [],
  };
}

function routeGate({
  context,
  query,
  requestId,
  action,
  resourceType,
  resourceId = null,
  repository,
}) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const scopedContext = resourceId === null
    ? context
    : resourcePermissionContext(context, resourceId);
  const decision = explicitScopeDecision(scopedContext, requiredFinanceScope(action)) ?? evaluateRouteDecision({
    context: scopedContext,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: resourceType,
      ...(resourceId === null ? {} : { resource_id: resourceId }),
    },
    action,
  });
  const response = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (response) appendFinanceRouteAudit({
    repository,
    context: scopedContext,
    query,
    action,
    resourceType,
    decision,
  });
  return response;
}

function principalHasRole(context, allowedRoles = []) {
  const roles = context?.principal?.role_ids;
  return Array.isArray(roles) && roles.some((role) => allowedRoles.includes(role));
}

function partnerApprovalGate({ context, query, requestId, runtime, action, resourceType }) {
  if (principalHasRole(context, ["partner", "finance_partner", "lawos_partner", "managing_partner", "tenant_owner", "system_super_admin", "admin", "administrator"])) return null;
  appendFinanceRouteAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    decision: { effect: "deny", reason: "finance_partner_role_required", fail_closed: true },
  });
  return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: query.audit_hint_ref,
    ui_state: "denied",
  });
}

function sanitizeFinanceItem(record) {
  const { bank_reference, lines, credential_material, ...safe } = record;
  return Object.freeze({
    ...safe,
    bank_reference_included: false,
    journal_lines_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function sanitizeBankTransaction(record) {
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

function sanitizeBankImportBatch(record) {
  const { source_manifest_hash, source_hashes, ...safe } = record;
  return Object.freeze({
    ...safe,
    source_hashes_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

const CLIENT_DEPOSIT_RECEIPT_BINDINGS = Object.freeze([
  "bank_transaction_id",
  "bank_transaction_classification_id",
  "state_version",
  "client_group_id",
  "refund_of_bank_transaction_id",
  "idempotency_key",
  "request_fingerprint",
]);

const CLIENT_DEPOSIT_SUPPORTED_COMMANDS = Object.freeze([
  Object.freeze({
    command: "auto_classify",
    method: "POST",
    path: "/api/finance/bank-classifications/auto",
    required_body_fields: Object.freeze([
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "bank_transaction_id",
      "expected_state_version",
    ]),
    response_binding_fields: CLIENT_DEPOSIT_RECEIPT_BINDINGS,
  }),
  Object.freeze({
    command: "manual_client_link",
    method: "POST",
    path: "/api/finance/bank-classifications/review",
    required_body_fields: Object.freeze([
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "decisions[].bank_transaction_id",
      "decisions[].category=client_receipt",
      "decisions[].client_group_id",
      "decisions[].expected_state_version",
    ]),
    response_binding_fields: CLIENT_DEPOSIT_RECEIPT_BINDINGS,
  }),
  Object.freeze({
    command: "refund_link",
    method: "POST",
    path: "/api/finance/bank-classifications/review",
    required_body_fields: Object.freeze([
      "tenant_id",
      "permission_ref",
      "audit_hint_ref",
      "idempotency_key",
      "decisions[].bank_transaction_id",
      "decisions[].category=refund_reversal",
      "decisions[].refund_of_bank_transaction_id",
      "decisions[].expected_state_version",
    ]),
    response_binding_fields: CLIENT_DEPOSIT_RECEIPT_BINDINGS,
  }),
]);
const BANK_TRANSACTION_READ_ACTION = "finance:bank_transaction:read";
const BANK_CLASSIFICATION_READ_ACTION =
  "finance:bank_classification:read";
const CLIENT_READ_ACTION = "analytics:client:read";
const CLIENT_RECEIVABLES_READ_ACTION =
  "finance:ar:client_receivables:read";
const CLIENT_RECEIVABLES_RESOURCE_TYPE = "client_receivables";
const EMPLOYEE_READ_ACTION = "hrx.employee.read";

function sourceReferenceFields(transaction = {}) {
  const source = (Array.isArray(transaction.source_refs)
    ? transaction.source_refs
    : []).find((reference) => (
      ["xlsx", "pdf"].includes(reference?.source_type)
      && /^[a-f0-9]{64}$/u.test(String(reference?.source_hash ?? ""))
    ));
  return Object.freeze({
    source_type: source?.source_type ?? null,
    source_file_sha256: source?.source_hash ?? null,
    source_row_number: Number.isSafeInteger(source?.row) && source.row > 0
      ? source.row
      : null,
    source_page_number: Number.isSafeInteger(source?.page) && source.page > 0
      ? source.page
      : null,
    bank_reference_hash: sha256([
      transaction.tenant_id,
      transaction.bank_transaction_id,
      transaction.transaction_fingerprint,
    ].join("|")),
  });
}

function clientDepositCommandsFor(record = {}) {
  return Object.freeze([
    "auto_classify",
    ...(record.transaction_direction === "inflow"
      ? ["manual_client_link"]
      : []),
    ...(record.transaction_direction === "outflow"
      ? ["refund_link"]
      : []),
  ]);
}

function sanitizeClientDeposit(record, transaction, directories) {
  const client = directories.clientRecords.find((candidate) => (
    candidate.model_type === "ClientGroup"
    && candidate.client_group_id === record.client_group_id
  ));
  return Object.freeze({
    model_type: "ClientDeposit",
    resource_id: transaction.bank_transaction_id,
    tenant_id: transaction.tenant_id,
    bank_transaction_id: transaction.bank_transaction_id,
    bank_transaction_classification_id:
      record.bank_transaction_classification_id,
    transaction_date: transaction.date ?? record.transaction_date,
    occurred_at: transaction.occurred_at
      ?? `${transaction.date ?? record.transaction_date}T00:00:00.000Z`,
    transaction_direction: transaction.direction
      ?? record.transaction_direction,
    amount: Number(transaction.amount ?? record.amount),
    currency: transaction.currency ?? record.currency,
    category: record.category,
    category_label:
      BANK_CLASSIFICATION_CATEGORIES[record.category]?.label
      ?? record.category_label,
    primary_type: record.primary_type,
    client_group_id: record.client_group_id ?? null,
    client_group_label:
      client?.display_name
      ?? client?.canonical_display_name
      ?? null,
    status: record.status,
    confidence: record.confidence,
    classification_source: record.classification_source,
    rationale_code: record.rationale_code,
    manual_lock: record.manual_lock === true,
    refund_of_bank_transaction_id:
      record.refund_of_bank_transaction_id ?? null,
    state_version: Number(record.state_version),
    ...sourceReferenceFields(transaction),
    available_commands: clientDepositCommandsFor(record),
    source_metadata_included: false,
    raw_source_payload_included: false,
    raw_account_included: false,
    raw_counterparty_included: false,
    raw_memo_included: false,
    transaction_fingerprint_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function resourceDecision({
  context,
  tenantId,
  resourceType,
  resourceId,
  action,
}) {
  return evaluateRouteDecision({
    context: resourcePermissionContext(context, resourceId),
    resource: {
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
  });
}

function resourceAllowed(input) {
  return resourceDecision(input).effect === "allow";
}

function bankTransactionAllowed(context, tenantId, bankTransactionId) {
  return resourceAllowed({
    context,
    tenantId,
    resourceType: "BankTransaction",
    resourceId: bankTransactionId,
    action: BANK_TRANSACTION_READ_ACTION,
  });
}

function bankClassificationAllowed(
  context,
  tenantId,
  classificationId,
  bankTransactionId,
) {
  const resourceIds = new Set(
    [classificationId, bankTransactionId].filter(Boolean),
  );
  const scopedContext = {
    ...context,
    object_acl: Array.isArray(context?.object_acl)
      ? context.object_acl.filter((entry) => {
          const scopedId = aclResourceId(entry);
          return scopedId === null || resourceIds.has(scopedId);
        })
      : [],
  };
  return evaluateRouteDecision({
    context: scopedContext,
    resource: {
      tenant_id: tenantId,
      resource_type: "BankTransactionClassification",
      resource_id: classificationId ?? bankTransactionId,
    },
    action: BANK_CLASSIFICATION_READ_ACTION,
  }).effect === "allow";
}

function clientGroupAllowed(context, tenantId, clientGroupId) {
  return !clientGroupId || resourceAllowed({
    context,
    tenantId,
    resourceType: "ClientGroup",
    resourceId: clientGroupId,
    action: CLIENT_READ_ACTION,
  });
}

function validateReviewMatter({ runtime, context, tenantId, decision }) {
  if (decision?.matter_id === undefined || decision.matter_id === null) {
    return null;
  }
  const matterId = String(decision.matter_id).trim();
  if (typeof decision.matter_id !== "string" || !matterId || matterId !== decision.matter_id) {
    throw new TypeError("matter_id must be a canonical non-empty string");
  }
  const repository = runtime.matterRepository ?? runtime.repository;
  const matter = repository?.list?.({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  })?.find((record) => record.matter_id === matterId);
  if (!matter) {
    throw classificationCommandError(
      "Matter not found",
      FINANCE_API_ERROR_CODES.client_link_invalid,
      400,
    );
  }
  const matterClientId = matter.client_group_id ?? matter.client_id ?? null;
  if (!matterClientId || matterClientId !== decision.client_group_id) {
    throw classificationCommandError(
      "Matter does not belong to the selected client",
      FINANCE_API_ERROR_CODES.client_link_invalid,
      400,
    );
  }
  const permission = evaluateRouteDecision({
    context: resourcePermissionContext(context, matterId),
    resource: {
      tenant_id: tenantId,
      resource_type: "matter",
      resource_id: matterId,
      matter_id: matterId,
    },
    action: "matter:read",
  });
  if (permission.effect !== "allow") {
    throw Object.assign(new Error("Matter is not authorized for this operation"), {
      safe_error_code: FINANCE_API_ERROR_CODES.unauthorized_omission,
      status: 403,
    });
  }
  return matterId;
}

function employeeAllowed(context, tenantId, employeeId) {
  return !employeeId || resourceAllowed({
    context,
    tenantId,
    resourceType: "Employee",
    resourceId: employeeId,
    action: EMPLOYEE_READ_ACTION,
  });
}

function bankImportPreviewError({ status = 400, requestId, code, auditHintRef }) {
  const response = errorResponse(status, requestId, [code], {
    audit_hint_ref: auditHintRef,
    ui_state: "blocked",
  });
  return {
    ...response,
    body: {
      ...response.body,
      preview: {
        counts: { total: 0, new: 0, duplicate: 0, error: 1 },
        product_records_mutated: false,
        raw_source_payload_included: false,
      },
    },
  };
}

function bankImportPreviewFile(body = {}) {
  const file = body.files?.file ?? body.file;
  if (!file || typeof file !== "object") {
    const error = new TypeError("Bank source file is required");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_required;
    throw error;
  }
  const fileName = String(file.filename ?? file.file_name ?? "").trim().split(/[\\/]/u).at(-1);
  const mimeType = String(file.mime_type ?? file.content_type ?? "").trim().toLowerCase();
  const sourceType = fileName.toLowerCase().endsWith(".xlsx")
    && [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ].includes(mimeType)
    ? "xlsx"
    : fileName.toLowerCase().endsWith(".pdf") && mimeType === "application/pdf"
      ? "pdf"
      : null;
  if (!sourceType) {
    const error = new TypeError("Supported bank source filename and MIME type are required");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  const encoded = String(file.content_base64 ?? "").trim();
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) {
    const error = new TypeError("Bank source encoding is invalid");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.toString("base64") !== encoded) {
    const error = new TypeError("Bank source encoding is invalid");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  const maxBytes = sourceType === "pdf"
    ? MAX_NH_BANK_STATEMENT_PDF_BYTES
    : MAX_AMIC_WORKBOOK_SOURCE_BYTES;
  if (buffer.length > maxBytes) {
    const error = new RangeError("Bank source exceeds the preview byte budget");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_too_large;
    throw error;
  }
  const declaredByteSize = Number(file.byte_size);
  if (Number.isFinite(declaredByteSize) && declaredByteSize !== buffer.length) {
    const error = new TypeError("Bank source declared byte size does not match content");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  return Object.freeze({ buffer, source_type: sourceType });
}

async function createBankImportPreview({ body = {}, runtime, source = bankImportPreviewFile(body) } = {}) {
  const existingTransactions = runtime.repository.list({
    tenant_id: body.tenant_id,
    model_type: "BankTransaction",
    account_ref: body.account_ref || undefined,
  });
  const preview = source.source_type === "pdf"
    ? await previewNhBankStatementPdfBuffer(source.buffer, {
        account_ref: body.account_ref || undefined,
        existing_transactions: existingTransactions,
      })
    : previewAmicWorkbookBuffer(source.buffer, {
        account_ref: body.account_ref || undefined,
        existing_transactions: existingTransactions,
      });
  return Object.freeze({ source, preview });
}

function bankImportActorId(context = {}) {
  return String(context?.principal?.user_id ?? context?.principal?.actor_id ?? "").trim();
}

function bankImportConfirmationError(code, status = 409) {
  const error = new Error(code.toLowerCase());
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function bankImportApproved(body = {}) {
  const value = body.production_import_approved
    ?? body.bank_import_batch?.production_import_approved;
  return value === true || String(value).toLowerCase() === "true";
}

function classificationClientRecords(runtime, tenantId) {
  return Object.freeze((runtime.clientRecords
    ?? listBankClassificationClientRecords(
      runtime.masterDataRepository,
      tenantId,
      runtime.matterRepository,
    )).filter((record) => !record.tenant_id || record.tenant_id === tenantId));
}

function classificationDirectories(runtime, tenantId) {
  return Object.freeze({
    clientRecords: classificationClientRecords(runtime, tenantId),
    employees: runtime.employeeRepository
      ? listAmicBankClassificationEmployees({
          repository: runtime.employeeRepository,
          tenantId,
        })
      : runtime.employees ?? Object.freeze([]),
  });
}

const INACTIVE_CLIENT_STATUSES = new Set(["inactive", "archived", "deleted", "merged", "closed"]);
const CLIENT_RECEIVABLES_READ_LIMITS = Object.freeze({
  client_groups: 500,
  fee_commitments: 5_000,
  bank_transaction_classifications: 5_000,
  bank_transactions: 5_000,
  client_deposit_allocations: 5_000,
  total_finance_rows: 10_000,
});
const CLIENT_RECEIVABLES_ACTIVE_CLIENT_STATUSES = new Set([
  "active",
  "current",
  "open",
]);
const CLIENT_RECEIVABLES_SAFE_BOUNDARY = Object.freeze({
  count_leak_prevented: true,
  permission_prefilter_applied: true,
  unauthorized_count_included: false,
  raw_bank_source_included: false,
  raw_source_payload_included: false,
  source_metadata_included: false,
  raw_account_included: false,
  raw_counterparty_included: false,
  raw_memo_included: false,
  transaction_fingerprint_included: false,
  bank_reference_included: false,
  credential_material_included: false,
  invoice_required: false,
  matter_required: false,
  production_ready_claim: false,
});

function activeClientRecord(record) {
  return !INACTIVE_CLIENT_STATUSES.has(String(record.status ?? "active").trim().toLowerCase());
}

function activeClientReceivablesRecord(record) {
  return CLIENT_RECEIVABLES_ACTIVE_CLIENT_STATUSES.has(
    String(record.status ?? "active").trim().toLowerCase(),
  );
}

function clientReceivablesUnavailableResponse({
  status,
  requestId,
  outcome = "blocked",
  uiState,
  safeErrorCodes,
  auditHintRef,
}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      ui_state: uiState,
      safe_error_codes: safeErrorCodes,
      audit_hint_ref: auditHintRef ?? null,
      ...CLIENT_RECEIVABLES_SAFE_BOUNDARY,
    },
  };
}

function clientReceivablesGateResponse(response) {
  return clientReceivablesUnavailableResponse({
    status: response.status,
    requestId: response.body.request_id,
    outcome: response.body.outcome,
    uiState: response.body.ui_state ?? (
      response.status === 403 ? "denied" : "error"
    ),
    safeErrorCodes: response.body.safe_error_codes,
    auditHintRef: response.body.audit_hint_ref,
  });
}

function safeClientReceivablesClient(record, tenantId) {
  const clientGroupId = typeof record?.client_group_id === "string"
    ? record.client_group_id.trim()
    : "";
  const displayName = typeof (
    record?.display_name ?? record?.canonical_display_name
  ) === "string"
    ? (record.display_name ?? record.canonical_display_name).trim()
    : "";
  if (!clientGroupId || !displayName || record?.tenant_id !== tenantId) {
    throw new TypeError("Authorized ClientGroup is invalid");
  }
  return Object.freeze({
    model_type: "ClientGroup",
    tenant_id: tenantId,
    client_group_id: clientGroupId,
    display_name: displayName,
    status: String(record.status ?? "active").trim().toLowerCase(),
  });
}

function permittedClientReceivablesClients(runtime, tenantId, context) {
  return classificationClientRecords(runtime, tenantId)
    .filter((record) => (
      record.model_type === "ClientGroup"
      && record.tenant_id === tenantId
      && typeof record.client_group_id === "string"
      && record.client_group_id.length > 0
    ))
    .filter((record) => clientGroupAllowed(
      context,
      tenantId,
      record.client_group_id,
    ))
    .filter((record) => activeClientReceivablesRecord(record))
    .map((record) => safeClientReceivablesClient(record, tenantId))
    .sort((left, right) => (
      left.display_name.localeCompare(right.display_name, "ko")
      || left.client_group_id.localeCompare(right.client_group_id, "en")
    ));
}

function clientReceivablesFinanceRows(repository, tenantId, clientIds) {
  const byPermittedClient = (modelType) => repository
    .list({ tenant_id: tenantId, model_type: modelType })
    .filter((record) => clientIds.has(record.client_group_id));
  const bankTransactionClassifications = byPermittedClient(
    "BankTransactionClassification",
  );
  const transactionIds = new Set(
    bankTransactionClassifications
      .map((record) => record.bank_transaction_id)
      .filter((value) => typeof value === "string" && value.trim() !== ""),
  );
  return Object.freeze({
    FeeCommitment: Object.freeze(byPermittedClient("FeeCommitment")),
    BankTransactionClassification: Object.freeze(
      bankTransactionClassifications,
    ),
    BankTransaction: Object.freeze(repository
      .list({ tenant_id: tenantId, model_type: "BankTransaction" })
      .filter((record) => transactionIds.has(record.bank_transaction_id))),
    ClientDepositAllocation: Object.freeze(
      byPermittedClient("ClientDepositAllocation"),
    ),
  });
}

function clientReceivablesRowsWithinLimits(clients, rows) {
  const counts = {
    client_groups: clients.length,
    fee_commitments: rows.FeeCommitment.length,
    bank_transaction_classifications:
      rows.BankTransactionClassification.length,
    bank_transactions: rows.BankTransaction.length,
    client_deposit_allocations: rows.ClientDepositAllocation.length,
  };
  counts.total_finance_rows = Object.values(counts)
    .slice(1)
    .reduce((total, count) => total + count, 0);
  return Object.entries(counts).every(
    ([name, count]) => count <= CLIENT_RECEIVABLES_READ_LIMITS[name],
  );
}

function clientReceivablesReadRepository(rows, tenantId) {
  return Object.freeze({
    list(query = {}) {
      if (query.tenant_id !== tenantId || !Object.hasOwn(rows, query.model_type)) {
        throw new TypeError("Client receivables repository query is not permitted");
      }
      return rows[query.model_type];
    },
  });
}

function sortClientReceivablesAllocations(allocations) {
  return Object.freeze([...allocations].sort((left, right) => (
    left.client_group_id.localeCompare(right.client_group_id, "en")
    || left.fee_commitment_id.localeCompare(right.fee_commitment_id, "en")
    || left.bank_transaction_id.localeCompare(
      right.bank_transaction_id,
      "en",
    )
    || left.client_deposit_allocation_id.localeCompare(
      right.client_deposit_allocation_id,
      "en",
    )
  )));
}

function clientReceivablesFeeCommitments(details, sourceRows) {
  const sourceById = new Map(sourceRows.map((row) => [
    row.fee_commitment_id,
    row,
  ]));
  return Object.freeze(details.map((detail) => {
    const source = sourceById.get(detail.fee_commitment_id);
    if (
      !source
      || !["active", "superseded", "cancelled"].includes(source.status)
      || !Number.isSafeInteger(source.state_version)
      || source.state_version < 1
    ) {
      throw new TypeError("FeeCommitment read metadata is invalid");
    }
    return Object.freeze({
      ...detail,
      status: source.status,
      state_version: source.state_version,
    });
  }));
}

function clientReceivablesResponse({ query, context, requestId, runtime }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) {
    return clientReceivablesUnavailableResponse({
      status: invalid.status,
      requestId,
      uiState: "error",
      safeErrorCodes: invalid.body.safe_error_codes,
      auditHintRef: query?.audit_hint_ref,
    });
  }
  const signedTenantId = typeof context?.principal?.tenant_id === "string"
    ? context.principal.tenant_id.trim()
    : "";
  if (!signedTenantId) {
    return clientReceivablesUnavailableResponse({
      status: 403,
      requestId,
      uiState: "denied",
      safeErrorCodes: [FINANCE_API_ERROR_CODES.unauthorized_omission],
      auditHintRef: query.audit_hint_ref,
    });
  }
  if (query.tenant_id !== signedTenantId) {
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query: { ...query, tenant_id: signedTenantId },
      action: CLIENT_RECEIVABLES_READ_ACTION,
      resourceType: CLIENT_RECEIVABLES_RESOURCE_TYPE,
      decision: {
        effect: "deny",
        reason: "finance_signed_tenant_mismatch",
        fail_closed: true,
      },
    });
    return clientReceivablesUnavailableResponse({
      status: 403,
      requestId,
      uiState: "denied",
      safeErrorCodes: [FINANCE_API_ERROR_CODES.unauthorized_omission],
      auditHintRef: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context: collectionPermissionContext(context),
    query,
    requestId,
    action: CLIENT_RECEIVABLES_READ_ACTION,
    resourceType: CLIENT_RECEIVABLES_RESOURCE_TYPE,
    repository: runtime.repository,
  });
  if (gated) return clientReceivablesGateResponse(gated);

  try {
    const permittedClients = permittedClientReceivablesClients(
      runtime,
      signedTenantId,
      context,
    );
    const clientIds = new Set(
      permittedClients.map((client) => client.client_group_id),
    );
    const rows = clientReceivablesFinanceRows(
      runtime.repository,
      signedTenantId,
      clientIds,
    );
    if (!clientReceivablesRowsWithinLimits(permittedClients, rows)) {
      appendFinanceRouteAudit({
        repository: runtime.repository,
        context,
        query,
        action: CLIENT_RECEIVABLES_READ_ACTION,
        resourceType: CLIENT_RECEIVABLES_RESOURCE_TYPE,
        decision: {
          effect: "review_required",
          reason: FINANCE_API_ERROR_CODES
            .client_receivables_limit_exceeded
            .toLowerCase(),
          fail_closed: true,
        },
      });
      return clientReceivablesUnavailableResponse({
        status: 200,
        requestId,
        outcome: "review_required",
        uiState: "review_required",
        safeErrorCodes: [
          FINANCE_API_ERROR_CODES.client_receivables_limit_exceeded,
        ],
        auditHintRef: query.audit_hint_ref,
      });
    }
    const report = buildClientReceivables({
      repository: clientReceivablesReadRepository(rows, signedTenantId),
      tenant_id: signedTenantId,
      permitted_client_records: permittedClients,
    });
    const details = Object.freeze({
      fee_commitments: clientReceivablesFeeCommitments(
        report.details.fee_commitments,
        rows.FeeCommitment,
      ),
      deposits: report.details.deposits,
      allocations: sortClientReceivablesAllocations(
        report.details.allocations,
      ),
    });
    const clients = Object.freeze(permittedClients.map((client) => (
      Object.freeze({
        client_group_id: client.client_group_id,
        display_name: client.display_name,
      })
    )));
    const empty = (
      details.fee_commitments.length === 0
      && details.deposits.length === 0
      && details.allocations.length === 0
    );
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action: CLIENT_RECEIVABLES_READ_ACTION,
      resourceType: CLIENT_RECEIVABLES_RESOURCE_TYPE,
      returnedCount: (
        clients.length
        + details.fee_commitments.length
        + details.deposits.length
        + details.allocations.length
      ),
      metadata: {
        permission_prefilter_applied: true,
        unauthorized_count_included: false,
        raw_bank_source_included: false,
        raw_source_payload_included: false,
        raw_account_included: false,
        raw_counterparty_included: false,
        raw_memo_included: false,
        transaction_fingerprint_included: false,
        client_name_included_in_audit: false,
        amount_included_in_audit: false,
      },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        ui_state: empty ? "empty" : null,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        basis: report.basis,
        basis_label: report.basis_label,
        currency: report.currency,
        as_of: report.as_of,
        total_receivables: report.total_receivables,
        unknown_amount_count: report.unknown_amount_count,
        total_overpayment: report.total_overpayment,
        unallocated_amount: report.total_overpayment,
        unallocated_amount_basis: "same_as_total_overpayment",
        clients,
        ranking: report.ranking,
        client_summaries: report.client_summaries,
        details,
        reconciliation: report.reconciliation,
        ...CLIENT_RECEIVABLES_SAFE_BOUNDARY,
      },
    };
  } catch {
    try {
      appendFinanceRouteAudit({
        repository: runtime.repository,
        context,
        query,
        action: CLIENT_RECEIVABLES_READ_ACTION,
        resourceType: CLIENT_RECEIVABLES_RESOURCE_TYPE,
        decision: {
          effect: "deny",
          reason: FINANCE_API_ERROR_CODES
            .client_receivables_unavailable
            .toLowerCase(),
          fail_closed: true,
        },
      });
    } catch {}
    return clientReceivablesUnavailableResponse({
      status: 503,
      requestId,
      uiState: "error",
      safeErrorCodes: [
        FINANCE_API_ERROR_CODES.client_receivables_unavailable,
      ],
      auditHintRef: query.audit_hint_ref,
    });
  }
}

function clientDepositEmptyResponse(requestId, auditHintRef) {
  return {
    status: 404,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: null,
      items: [],
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      ui_state: "empty",
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      unauthorized_count_included: false,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function decodeClientDepositCursor(value) {
  if (!value) return null;
  try {
    const cursor = JSON.parse(
      Buffer.from(String(value), "base64url").toString("utf8"),
    );
    if (
      cursor?.version !== 1
      || typeof cursor.occurred_at !== "string"
      || cursor.occurred_at === ""
      || typeof cursor.bank_transaction_id !== "string"
      || cursor.bank_transaction_id === ""
    ) {
      throw new TypeError("Invalid client deposit cursor");
    }
    return cursor;
  } catch {
    throw new TypeError("Invalid client deposit cursor");
  }
}

function encodeClientDepositCursor(item) {
  return Buffer.from(JSON.stringify({
    version: 1,
    occurred_at: item.occurred_at,
    bank_transaction_id: item.bank_transaction_id,
  })).toString("base64url");
}

function clientDepositAfterCursor(item, cursor) {
  if (!cursor) return true;
  return item.occurred_at < cursor.occurred_at
    || (
      item.occurred_at === cursor.occurred_at
      && item.bank_transaction_id < cursor.bank_transaction_id
    );
}

function clientDepositListResponse({ query, context, requestId, runtime }) {
  const action = BANK_TRANSACTION_READ_ACTION;
  const resourceType = "client_deposit";
  const gated = routeGate({
    context: collectionPermissionContext(context),
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  if (
    (query.from && !/^\d{4}-\d{2}-\d{2}$/u.test(query.from))
    || (query.to && !/^\d{4}-\d{2}-\d{2}$/u.test(query.to))
    || (
      query.direction
      && !["inflow", "outflow"].includes(query.direction)
    )
    || (
      query.status
      && !["confirmed", "review_required"].includes(query.status)
    )
    || (
      query.limit !== undefined
      && (
        !Number.isSafeInteger(Number(query.limit))
        || Number(query.limit) < 1
        || Number(query.limit) > 500
      )
    )
  ) {
    return errorResponse(
      400,
      requestId,
      [FINANCE_API_ERROR_CODES.validation_error],
      { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" },
    );
  }
  if (
    query.client_group_id
    && !clientGroupAllowed(context, query.tenant_id, query.client_group_id)
  ) {
    return errorResponse(
      403,
      requestId,
      [FINANCE_API_ERROR_CODES.unauthorized_omission],
      { audit_hint_ref: query.audit_hint_ref, ui_state: "denied" },
    );
  }

  let cursor;
  try {
    cursor = decodeClientDepositCursor(query.cursor);
  } catch {
    return errorResponse(
      400,
      requestId,
      [FINANCE_API_ERROR_CODES.validation_error],
      { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" },
    );
  }
  const directories = Object.freeze({
    clientRecords: classificationClientRecords(runtime, query.tenant_id),
  });
  const candidates = runtime.repository
    .list({
      tenant_id: query.tenant_id,
      model_type: "BankTransactionClassification",
    })
    .filter((record) => bankTransactionAllowed(
      context,
      query.tenant_id,
      record.bank_transaction_id,
    ))
    .filter((record) => bankClassificationAllowed(
      context,
      query.tenant_id,
      record.bank_transaction_classification_id,
      record.bank_transaction_id,
    ))
    .filter((record) => {
      return clientGroupAllowed(
        context,
        query.tenant_id,
        record.client_group_id,
      );
    })
    .filter((record) => (
      record.transaction_direction === "inflow"
      || record.category === "refund_reversal"
    ))
    .filter((record) => !query.from || record.transaction_date >= query.from)
    .filter((record) => !query.to || record.transaction_date <= query.to)
    .filter((record) => (
      !query.direction
      || record.transaction_direction === query.direction
    ))
    .filter((record) => !query.status || record.status === query.status)
    .filter((record) => (
      !query.client_group_id
      || record.client_group_id === query.client_group_id
    ))
    .map((record) => {
      const transaction = runtime.repository.get({
        tenant_id: query.tenant_id,
        model_type: "BankTransaction",
        id: record.bank_transaction_id,
      });
      return transaction
        ? [record, transaction]
        : null;
    })
    .filter(Boolean)
    .map(([record, transaction]) => sanitizeClientDeposit(
      record,
      transaction,
      directories,
    ))
    .sort((left, right) => (
      String(right.occurred_at).localeCompare(String(left.occurred_at))
      || right.bank_transaction_id.localeCompare(left.bank_transaction_id)
    ))
    .filter((item) => clientDepositAfterCursor(item, cursor));
  const limit = Number(query.limit ?? 200);
  const hasMore = candidates.length > limit;
  const items = candidates.slice(0, limit);
  const nextCursor = hasMore
    ? encodeClientDepositCursor(items.at(-1))
    : null;
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: items.length,
    metadata: {
      permission_prefilter_applied: true,
      raw_source_payload_included: false,
      raw_account_included: false,
      raw_counterparty_included: false,
      raw_memo_included: false,
    },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items,
      supported_commands: CLIENT_DEPOSIT_SUPPORTED_COMMANDS,
      page_info: {
        returned_count: items.length,
        omitted_item_count: null,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: items.length === 0 ? "empty" : null,
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      unauthorized_count_included: false,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function clientDepositDetailResponse({
  bankTransactionId,
  query,
  context,
  requestId,
  runtime,
}) {
  const action = BANK_TRANSACTION_READ_ACTION;
  const resourceType = "client_deposit";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    resourceId: bankTransactionId,
    repository: runtime.repository,
  });
  if (gated) return gated;

  const classifications = runtime.repository.list({
    tenant_id: query.tenant_id,
    model_type: "BankTransactionClassification",
    bank_transaction_id: bankTransactionId,
  });
  if (classifications.length !== 1) {
    return clientDepositEmptyResponse(
      requestId,
      query.audit_hint_ref,
    );
  }
  const [classification] = classifications;
  if (
    !bankClassificationAllowed(
      context,
      query.tenant_id,
      classification.bank_transaction_classification_id,
      classification.bank_transaction_id,
    )
  ) {
    return clientDepositEmptyResponse(
      requestId,
      query.audit_hint_ref,
    );
  }
  if (
    classification.transaction_direction !== "inflow"
    && classification.category !== "refund_reversal"
  ) {
    return clientDepositEmptyResponse(
      requestId,
      query.audit_hint_ref,
    );
  }
  if (
    classification.client_group_id
    && !clientGroupAllowed(
      context,
      query.tenant_id,
      classification.client_group_id,
    )
  ) {
    return clientDepositEmptyResponse(
      requestId,
      query.audit_hint_ref,
    );
  }
  const transaction = runtime.repository.get({
    tenant_id: query.tenant_id,
    model_type: "BankTransaction",
    id: bankTransactionId,
  });
  if (!transaction) {
    return clientDepositEmptyResponse(
      requestId,
      query.audit_hint_ref,
    );
  }
  const directories = Object.freeze({
    clientRecords: classificationClientRecords(runtime, query.tenant_id),
  });
  const item = sanitizeClientDeposit(
    classification,
    transaction,
    directories,
  );
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: 1,
    metadata: {
      bank_transaction_id: bankTransactionId,
      permission_prefilter_applied: true,
      raw_source_payload_included: false,
      raw_account_included: false,
      raw_counterparty_included: false,
      raw_memo_included: false,
    },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item,
      supported_commands: CLIENT_DEPOSIT_SUPPORTED_COMMANDS,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: null,
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      unauthorized_count_included: false,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function sanitizeBankClassification(record, transaction, directories) {
  const { normalized_match_value, ...safeClassification } = record;
  const employee = directories.employees.find((candidate) => candidate.employee_id === record.employee_id);
  const client = directories.clientRecords.find((candidate) => (
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

function bankTransactionListResponse({ query, context, requestId, runtime }) {
  const action = "finance:bank_transaction:read";
  const resourceType = "bank_transaction";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const from = query.from ?? null;
  const to = query.to ?? null;
  if (
    (from && !/^\d{4}-\d{2}-\d{2}$/u.test(from))
    || (to && !/^\d{4}-\d{2}-\d{2}$/u.test(to))
    || (query.direction && !["inflow", "outflow"].includes(query.direction))
  ) {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  const limit = Math.min(200, Math.max(1, Number(query.limit ?? 100) || 100));
  const items = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "BankTransaction", account_ref: query.account_ref })
    .filter((record) => !from || record.date >= from)
    .filter((record) => !to || record.date <= to)
    .filter((record) => !query.direction || record.direction === query.direction)
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, limit)
    .map(sanitizeBankTransaction);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: allowed.length,
    metadata: { counterparty_values_included: true, source_metadata_included: false },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function bankClassificationListResponse({ query, context, requestId, runtime }) {
  const action = "finance:bank_classification:read";
  const resourceType = "bank_transaction_classification";
  const gated = routeGate({
    context: collectionPermissionContext(context),
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  const from = query.from ?? null;
  const to = query.to ?? null;
  if (
    (from && !/^\d{4}-\d{2}-\d{2}$/u.test(from))
    || (to && !/^\d{4}-\d{2}-\d{2}$/u.test(to))
    || (query.direction && !["inflow", "outflow"].includes(query.direction))
    || (query.status && !["confirmed", "review_required"].includes(query.status))
    || (query.category && !BANK_CLASSIFICATION_CATEGORIES[query.category])
  ) {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 620) || 620));
  const directories = classificationDirectories(runtime, query.tenant_id);
  const transactions = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "BankTransaction" });
  const transactionsById = new Map(transactions.map((row) => [row.bank_transaction_id, row]));
  const filtered = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "BankTransactionClassification" })
    .filter((record) => bankTransactionAllowed(
      context,
      query.tenant_id,
      record.bank_transaction_id,
    ))
    .filter((record) => bankClassificationAllowed(
      context,
      query.tenant_id,
      record.bank_transaction_classification_id,
      record.bank_transaction_id,
    ))
    .filter((record) => clientGroupAllowed(
      context,
      query.tenant_id,
      record.client_group_id,
    ))
    .filter((record) => employeeAllowed(
      context,
      query.tenant_id,
      record.employee_id,
    ))
    .filter((record) => !from || record.transaction_date >= from)
    .filter((record) => !to || record.transaction_date <= to)
    .filter((record) => !query.direction || record.transaction_direction === query.direction)
    .filter((record) => !query.status || record.status === query.status)
    .filter((record) => !query.category || record.category === query.category)
    .sort((left, right) => {
      const leftAt = transactionsById.get(left.bank_transaction_id)?.occurred_at ?? left.transaction_date;
      const rightAt = transactionsById.get(right.bank_transaction_id)?.occurred_at ?? right.transaction_date;
      return rightAt.localeCompare(leftAt);
    });
  const items = filtered
    .slice(0, limit)
    .map((record) => sanitizeBankClassification(
      record,
      transactionsById.get(record.bank_transaction_id) ?? {},
      directories,
    ));
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: allowed.length,
    metadata: {
      linked_client_values_included: true,
      linked_employee_values_included: true,
      source_metadata_included: false,
    },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      summary: summarizeBankTransactionClassifications(filtered),
      page_info: {
        returned_count: allowed.length,
        total_filtered_count: filtered.length,
        omitted_item_count: Math.max(0, filtered.length - allowed.length),
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: filtered.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function bankClassificationOptionsResponse({ query, context, requestId, runtime }) {
  const action = "finance:bank_classification:options";
  const resourceType = "bank_transaction_classification";
  const gated = routeGate({
    context: collectionPermissionContext(context),
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  const directories = classificationDirectories(runtime, query.tenant_id);
  const clientCandidates = directories.clientRecords
    .filter((record) => record.model_type === "ClientGroup" && activeClientRecord(record))
    .filter((record) => clientGroupAllowed(
      context,
      query.tenant_id,
      record.client_group_id,
    ))
    .map((record) => Object.freeze({
      client_group_id: record.client_group_id,
      label: record.display_name ?? record.canonical_display_name ?? record.client_group_id,
    }))
    .sort((left, right) => (
      left.label.localeCompare(right.label, "ko")
      || left.client_group_id.localeCompare(right.client_group_id)
    ));
  const labelCounts = new Map();
  for (const client of clientCandidates) {
    labelCounts.set(client.label, (labelCounts.get(client.label) ?? 0) + 1);
  }
  const clients = clientCandidates.map((client) => Object.freeze({
    ...client,
    selection_label: labelCounts.get(client.label) > 1
      ? `${client.label} · 고객번호 ${client.client_group_id}`
      : client.label,
  }));
  const employees = directories.employees
    .filter((record) => record.status !== "inactive")
    .filter((record) => employeeAllowed(
      context,
      query.tenant_id,
      record.employee_id,
    ))
    .map((record) => Object.freeze({
      employee_id: record.employee_id,
      label: record.display_name,
      title: record.title ?? null,
      aliases: Object.freeze([...(record.aliases ?? [])]),
    }));
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: {
        categories: Object.freeze(Object.entries(BANK_CLASSIFICATION_CATEGORIES).map(([category, contract]) => Object.freeze({
          category,
          primary_type: contract.primary_type,
          label: contract.label,
        }))),
        clients: Object.freeze(clients),
        employees: Object.freeze(employees),
      },
      items: [],
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function classificationCommandReceipts(result, idempotencyKey) {
  return Object.freeze((result.classifications ?? []).map((classification) => (
    Object.freeze({
      bank_transaction_id: classification.bank_transaction_id,
      bank_transaction_classification_id:
        classification.bank_transaction_classification_id,
      state_version: classification.state_version,
      category: classification.category,
      status: classification.status,
      client_group_id: classification.client_group_id ?? null,
      refund_of_bank_transaction_id:
        classification.refund_of_bank_transaction_id ?? null,
      idempotency_key: result.idempotency_key ?? idempotencyKey,
      request_fingerprint: result.request_fingerprint,
      raw_source_payload_included: false,
      production_ready_claim: false,
    })
  )));
}

function classificationCommandResultAllowed({
  result,
  context,
  tenantId,
  action,
  repository,
}) {
  const receipts = result.classifications ?? [];
  const affectedCount = Number(result.created_count ?? 0)
    + Number(result.updated_count ?? 0)
    + Number(result.protected_manual_count ?? 0);
  if (receipts.length !== affectedCount) return false;
  return receipts.every((receipt) => {
    if (
      !resourceAllowed({
        context,
        tenantId,
        resourceType: "BankTransactionClassification",
        resourceId: receipt.bank_transaction_id,
        action,
      })
      || !bankTransactionAllowed(
        context,
        tenantId,
        receipt.bank_transaction_id,
      )
      || !bankClassificationAllowed(
        context,
        tenantId,
        receipt.bank_transaction_classification_id,
        receipt.bank_transaction_id,
      )
      || !clientGroupAllowed(
        context,
        tenantId,
        receipt.client_group_id,
      )
      || !employeeAllowed(context, tenantId, receipt.employee_id)
    ) {
      return false;
    }
    const originalId = receipt.refund_of_bank_transaction_id;
    if (!originalId) return true;
    if (!bankTransactionAllowed(context, tenantId, originalId)) return false;
    const [original] = repository.list({
      tenant_id: tenantId,
      model_type: "BankTransactionClassification",
      bank_transaction_id: originalId,
    });
    return Boolean(
      original
      && bankClassificationAllowed(
        context,
        tenantId,
        original.bank_transaction_classification_id,
        original.bank_transaction_id,
      ),
    );
  });
}

function classificationCommandResponse({
  result,
  idempotencyKey,
  requestId,
  auditHintRef,
  depositAllocation = null,
  depositAllocationReversal = null,
  confirmedPayments = [],
  review = false,
}) {
  const commandReceipts = classificationCommandReceipts(
    result,
    idempotencyKey,
  );
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: result.idempotent_replay ? "idempotent_replay" : "classified",
      item: {
        created_count: result.created_count,
        updated_count: result.updated_count,
        ...(review
          ? {
              rule_count: result.rule_count,
              payment_count: confirmedPayments.length,
              payments: Object.freeze(
                confirmedPayments.map(sanitizeFinanceItem),
              ),
            }
          : { protected_manual_count: result.protected_manual_count }),
        summary: result.summary,
        command_receipt: commandReceipts.length === 1
          ? commandReceipts[0]
          : null,
      },
      command_receipts: commandReceipts,
      idempotency_key: result.idempotency_key ?? idempotencyKey,
      request_fingerprint: result.request_fingerprint,
      audit_event: result.audit_event,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      idempotent_replay: result.idempotent_replay,
      deposit_allocation: summarizeDepositAllocation(depositAllocation),
      deposit_allocation_reversal:
        summarizeDepositAllocationReversal(depositAllocationReversal),
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function classificationCommandError(message, safeErrorCode, status = 409) {
  return Object.assign(new TypeError(message), {
    safe_error_code: safeErrorCode,
    status,
  });
}

function confirmReviewedBankReceipts({
  decisions,
  repository,
  tenantId,
  actorId,
  idempotencyKey,
}) {
  return decisions
    .filter((decision) => decision.category === "client_receipt")
    .map((decision) => confirmBankReceipt({
      repository,
      bank_transaction_id: decision.bank_transaction_id,
      payment: {
        payment_id: `payment:bank:${decision.bank_transaction_id}`,
        tenant_id: tenantId,
        client_group_id: decision.client_group_id,
        matter_id: decision.matter_id ?? null,
      },
      actor_id: actorId,
      idempotency_key:
        `${idempotencyKey}:payment:${decision.bank_transaction_id}`,
      allow_rebind: true,
    }).payment);
}

function classificationResourceGate({
  context,
  query,
  requestId,
  runtime,
  action,
  resourceId,
  resourceType = "bank_transaction_classification",
}) {
  return routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    resourceId,
    repository: runtime.repository,
  });
}

export function handleFinanceBankClassificationAuto({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_classification:auto";
  const resourceType = "bank_transaction_classification";
  const targetId = body?.bank_transaction_id === undefined
    ? null
    : String(body.bank_transaction_id ?? "").trim();
  if (body?.bank_transaction_id !== undefined && !targetId) {
    return errorResponse(
      400,
      requestId,
      [FINANCE_API_ERROR_CODES.validation_error],
      { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" },
    );
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    resourceId: targetId,
    repository: runtime.repository,
  });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    if (
      targetId !== null
      && (
        !Number.isSafeInteger(body.expected_state_version)
        || body.expected_state_version < 0
      )
    ) {
      throw new TypeError(
        "expected_state_version is required for a targeted automatic classification",
      );
    }
    const replayPayload = {
      bank_transaction_id: targetId,
      expected_state_version: targetId === null
        ? null
        : body.expected_state_version,
    };
    const replay = resolveBankClassificationCommandReplay({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
      action: "bank.transaction.classification.auto",
      payload: replayPayload,
    });
    if (replay) {
      if (!classificationCommandResultAllowed({
        result: replay,
        context,
        tenantId: query.tenant_id,
        action,
        repository: runtime.repository,
      })) {
        return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
      }
      return classificationCommandResponse({
        result: replay,
        idempotencyKey: body.idempotency_key,
        requestId,
        auditHintRef: query.audit_hint_ref,
      });
    }
    const directories = classificationDirectories(runtime, query.tenant_id);
    const transactions = runtime.repository.list({
      tenant_id: query.tenant_id,
      model_type: "BankTransaction",
    }).filter((transaction) => (
      targetId === null || transaction.bank_transaction_id === targetId
    ));
    if (targetId !== null && transactions.length !== 1) {
      throw classificationCommandError(
        "BankTransaction not found",
        FINANCE_API_ERROR_CODES.not_found,
        404,
      );
    }
    const proposals = previewBankTransactionClassifications({
      transactions,
      client_records: directories.clientRecords,
      employees: directories.employees,
      rules: runtime.repository.list({
        tenant_id: query.tenant_id,
        model_type: "BankClassificationRule",
      }),
    }).classifications;
    const proposalByTransactionId = new Map(proposals.map((proposal) => [
      proposal.bank_transaction_id,
      proposal,
    ]));
    const allowedTransactionIds = transactions
      .filter((transaction) => {
        const transactionId = transaction.bank_transaction_id;
        if (
          !bankTransactionAllowed(context, query.tenant_id, transactionId)
          || !resourceAllowed({
            context,
            tenantId: query.tenant_id,
            resourceType: "BankTransactionClassification",
            resourceId: transactionId,
            action,
          })
        ) {
          return false;
        }
        const [existing] = runtime.repository.list({
          tenant_id: query.tenant_id,
          model_type: "BankTransactionClassification",
          bank_transaction_id: transactionId,
        });
        const proposal = proposalByTransactionId.get(transactionId);
        const effective = (
          existing?.manual_lock === true
          || existing?.classification_source === "manual_review"
        )
          ? existing
          : proposal;
        return Boolean(
          effective
          && bankClassificationAllowed(
            context,
            query.tenant_id,
            effective.bank_transaction_classification_id,
            transactionId,
          )
          && clientGroupAllowed(
            context,
            query.tenant_id,
            effective.client_group_id,
          )
          && employeeAllowed(
            context,
            query.tenant_id,
            effective.employee_id,
          ),
        );
      })
      .map((transaction) => transaction.bank_transaction_id);
    if (targetId !== null && allowedTransactionIds.length !== 1) {
      return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
    }
    const {
      result,
      depositAllocation,
      depositAllocationReversal,
    } = mutateWithDepositAllocation({
      repository: runtime.repository,
      tenantId: query.tenant_id,
      actorId: context.principal.user_id,
      idempotencyKey: body.idempotency_key,
      command: () => autoClassifyBankTransactions({
        repository: runtime.repository,
        tenant_id: query.tenant_id,
        client_records: directories.clientRecords,
        employees: directories.employees,
        actor_id: context.principal.user_id,
        idempotency_key: body.idempotency_key,
        bank_transaction_id: targetId,
        expected_state_version: body.expected_state_version,
        bank_transaction_ids: targetId === null
          ? allowedTransactionIds
          : null,
      }),
    });
    if (!classificationCommandResultAllowed({
      result,
      context,
      tenantId: query.tenant_id,
      action,
      repository: runtime.repository,
    })) {
      return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
    }
    return classificationCommandResponse({
      result,
      idempotencyKey: body.idempotency_key,
      requestId,
      auditHintRef: query.audit_hint_ref,
      depositAllocation,
      depositAllocationReversal,
    });
  } catch (error) {
    return errorResponse(error?.status ?? 400, requestId, [
      error?.safe_error_code ?? FINANCE_API_ERROR_CODES.validation_error,
    ], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleFinanceBankClassificationReview({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_classification:review";
  const resourceType = "bank_transaction_classification";
  const gated = routeGate({
    context: collectionPermissionContext(context),
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const submittedDecisions = body?.decisions;
    if (
      !Array.isArray(submittedDecisions)
      || submittedDecisions.length < 1
      || submittedDecisions.length > 500
    ) {
      throw new TypeError("decisions must contain 1 to 500 rows");
    }
    for (const decision of submittedDecisions) {
      const transactionId = String(
        decision?.bank_transaction_id ?? "",
      ).trim();
      if (!transactionId) throw new TypeError("bank_transaction_id is required");
      if (
        !Number.isSafeInteger(decision.expected_state_version)
        || decision.expected_state_version < 0
      ) {
        throw new TypeError(
          "expected_state_version must be a non-negative integer",
        );
      }
      const targetDenied = classificationResourceGate({
        context,
        query,
        requestId,
        runtime,
        action,
        resourceId: transactionId,
      });
      if (targetDenied) return targetDenied;
      if (
        !bankTransactionAllowed(context, query.tenant_id, transactionId)
        || !bankClassificationAllowed(
          context,
          query.tenant_id,
          bankTransactionClassificationId({
            tenant_id: query.tenant_id,
            bank_transaction_id: transactionId,
          }),
          transactionId,
        )
      ) {
        return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
      }
      if (
        decision.category === "client_receipt"
        || (
          decision.category === "refund_reversal"
          && decision.client_group_id !== undefined
        )
      ) {
        const clientGroupId = String(
          decision.client_group_id ?? "",
        ).trim();
        if (!clientGroupId) {
          throw new TypeError("client_group_id is required");
        }
        if (
          !clientGroupAllowed(context, query.tenant_id, clientGroupId)
        ) {
          return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
        }
      }
      validateReviewMatter({
        runtime,
        context,
        tenantId: query.tenant_id,
        decision,
      });
      if (
        decision.employee_id
        && !employeeAllowed(
          context,
          query.tenant_id,
          decision.employee_id,
        )
      ) {
        return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
      }
      if (decision.category === "refund_reversal") {
        const originalId = String(
          decision.refund_of_bank_transaction_id ?? "",
        ).trim();
        if (!originalId) {
          throw new TypeError(
            "refund_of_bank_transaction_id is required",
          );
        }
        const originalDenied = classificationResourceGate({
          context,
          query,
          requestId,
          runtime,
          action,
          resourceId: originalId,
          resourceType: "client_deposit",
        });
        if (originalDenied) return originalDenied;
        if (
          !bankTransactionAllowed(context, query.tenant_id, originalId)
        ) {
          return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
        }
      }
    }
    const replay = resolveBankClassificationCommandReplay({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
      action: "bank.transaction.classification.review",
      payload: { decisions: submittedDecisions },
    });
    if (replay) {
      if (!classificationCommandResultAllowed({
        result: replay,
        context,
        tenantId: query.tenant_id,
        action,
        repository: runtime.repository,
      })) {
        return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
      }
      return classificationCommandResponse({
        result: replay,
        idempotencyKey: body.idempotency_key,
        requestId,
        auditHintRef: query.audit_hint_ref,
        confirmedPayments: confirmReviewedBankReceipts({
          decisions: submittedDecisions,
          repository: runtime.repository,
          tenantId: query.tenant_id,
          actorId: context.principal.user_id,
          idempotencyKey: body.idempotency_key,
        }),
        review: true,
      });
    }
    for (const decision of submittedDecisions) {
      if (decision.category !== "refund_reversal") continue;
      const originalId = String(
        decision.refund_of_bank_transaction_id,
      ).trim();
      const [originalClassification] = runtime.repository.list({
        tenant_id: query.tenant_id,
        model_type: "BankTransactionClassification",
        bank_transaction_id: originalId,
      });
      if (
        !originalClassification
        || !bankClassificationAllowed(
          context,
          query.tenant_id,
          originalClassification.bank_transaction_classification_id,
          originalId,
        )
        || !clientGroupAllowed(
          context,
          query.tenant_id,
          originalClassification.client_group_id,
        )
      ) {
        return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
      }
    }
    const directories = classificationDirectories(runtime, query.tenant_id);
    const clientIds = new Set(directories.clientRecords
      .filter((record) => record.model_type === "ClientGroup" && activeClientRecord(record))
      .map((record) => record.client_group_id));
    const employeeIds = new Set(directories.employees.map((record) => record.employee_id));
    const decisions = submittedDecisions.map((decision) => {
      if (
        ["client_receipt", "refund_reversal"].includes(decision.category)
        && decision.client_group_id
        && !clientIds.has(decision.client_group_id)
      ) {
        throw classificationCommandError(
          "A registered client is required",
          FINANCE_API_ERROR_CODES.client_link_invalid,
        );
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
    const {
      result,
      depositAllocation,
      depositAllocationReversal,
      confirmedPayments,
    } = mutateWithDepositAllocation({
      repository: runtime.repository,
      tenantId: query.tenant_id,
      actorId: context.principal.user_id,
      idempotencyKey: body.idempotency_key,
      command: () => reviewBankTransactionClassifications({
        repository: runtime.repository,
        tenant_id: query.tenant_id,
        decisions,
        actor_id: context.principal.user_id,
        idempotency_key: body.idempotency_key,
        require_expected_state_version: true,
      }),
      afterCommand: () => ({
        confirmedPayments: confirmReviewedBankReceipts({
          decisions,
          repository: runtime.repository,
          tenantId: query.tenant_id,
          actorId: context.principal.user_id,
          idempotencyKey: body.idempotency_key,
        }),
      }),
    });
    if (!classificationCommandResultAllowed({
      result,
      context,
      tenantId: query.tenant_id,
      action,
      repository: runtime.repository,
    })) {
      return clientDepositEmptyResponse(requestId, query.audit_hint_ref);
    }
    return classificationCommandResponse({
      result,
      idempotencyKey: body.idempotency_key,
      requestId,
      auditHintRef: query.audit_hint_ref,
      depositAllocation,
      depositAllocationReversal,
      confirmedPayments,
      review: true,
    });
  } catch (error) {
    return errorResponse(error?.status ?? 400, requestId, [
      error?.safe_error_code ?? FINANCE_API_ERROR_CODES.validation_error,
    ], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

function bankImportSuccessResponse({ result, requestId, auditHintRef, previewId }) {
  return {
    status: result.idempotent_replay ? 200 : 201,
    body: {
      request_id: requestId,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: sanitizeBankImportBatch(result.bank_import_batch),
      transaction_count: result.transaction_count,
      confirmed_preview_id: previewId,
      audit_event: result.audit_event,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      idempotent_replay: result.idempotent_replay,
      confirmation_token_included: false,
      raw_source_payload_included: false,
      production_ready_claim: false,
    },
  };
}

export async function handleFinanceBankImport({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.bank_import_batch?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_import:write";
  const resourceType = "bank_import_batch";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({
    context,
    query,
    requestId,
    runtime,
    action,
    resourceType,
  });
  if (roleDenied) return roleDenied;
  if (!bankImportApproved(body)) {
    return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.approval_required], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "review_required",
    });
  }
  try {
    if (body?.transactions !== undefined || body?.bank_import_batch !== undefined) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.client_transaction_rows_rejected,
        400,
      );
    }
    const confirmationToken = String(body?.preview_confirmation_token ?? "").trim();
    if (!confirmationToken) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_confirmation_required,
        400,
      );
    }
    const actorId = bankImportActorId(context);
    const accountRef = String(body?.account_ref ?? "").trim();
    const idempotencyKey = String(body?.idempotency_key ?? "").trim();
    if (!actorId || !accountRef || !idempotencyKey) {
      throw bankImportConfirmationError(FINANCE_API_ERROR_CODES.validation_error, 400);
    }
    const source = bankImportPreviewFile(body);
    const sourceFileSha256 = sha256(source.buffer);
    const verified = runtime.bankImportPreviewTokens.verify(confirmationToken, {
      tenant_id: query.tenant_id,
      actor_id: actorId,
      account_ref: accountRef,
      source_type: source.source_type,
      source_file_sha256: sourceFileSha256,
    });
    if (!verified.ok && verified.reason !== "bank_import_preview_token_expired") {
      if (verified.reason === "bank_import_preview_token_mismatch") {
        throw bankImportConfirmationError(
          FINANCE_API_ERROR_CODES.preview_confirmation_changed,
          409,
        );
      }
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_confirmation_invalid,
        409,
      );
    }
    if (!verified.payload) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_confirmation_invalid,
        409,
      );
    }
    const replay = runtime.repository.getIdempotency({
      tenant_id: query.tenant_id,
      idempotency_key: idempotencyKey,
    });
    if (replay) {
      const replayFingerprint = replay.request_fingerprint
        ?? replay.response?.bank_import_batch?.source_manifest_hash;
      if (replay.operation !== "bank_transaction_batch_import"
          || replayFingerprint !== verified.payload.preview_manifest_sha256) {
        throw bankImportConfirmationError(FINANCE_API_ERROR_CODES.idempotency_conflict, 409);
      }
      return bankImportSuccessResponse({
        result: { ...replay.response, idempotent_replay: true },
        requestId,
        auditHintRef: query.audit_hint_ref,
        previewId: verified.payload.preview_id,
      });
    }
    if (!verified.ok) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_confirmation_expired,
        410,
      );
    }
    const { preview } = await createBankImportPreview({ body, runtime, source });
    if (verified.payload.preview_manifest_sha256 !== preview.preview_manifest_sha256
        || verified.payload.preview_id !== preview.preview_id) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_confirmation_changed,
        409,
      );
    }
    const newTransactions = preview.transactions.filter(
      (_, index) => preview.items[index]?.status === "new",
    );
    if (newTransactions.length === 0) {
      throw bankImportConfirmationError(
        FINANCE_API_ERROR_CODES.preview_no_new_transactions,
        409,
      );
    }
    const result = importBankTransactionBatch({
      repository: runtime.repository,
      bank_import_batch: {
        bank_import_batch_id: `bank_import_${preview.preview_manifest_sha256.slice(0, 24)}`,
        tenant_id: query.tenant_id,
        source_manifest_hash: preview.preview_manifest_sha256,
        source_file_sha256: preview.source_file_sha256,
        source_type: preview.source_type,
        preview_id: preview.preview_id,
        account_ref: preview.account_ref,
        transaction_count: newTransactions.length,
        overlap_count: preview.counts.duplicate,
        source_count: 1,
        production_import_approved: true,
      },
      transactions: newTransactions,
      actor_id: actorId,
      idempotency_key: idempotencyKey,
      request_fingerprint: preview.preview_manifest_sha256,
    });
    return bankImportSuccessResponse({
      result,
      requestId,
      auditHintRef: query.audit_hint_ref,
      previewId: preview.preview_id,
    });
  } catch (error) {
    const safeErrorCode = error?.safe_error_code ?? FINANCE_API_ERROR_CODES.validation_error;
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: {
        effect: "deny",
        reason: safeErrorCode.toLowerCase(),
        fail_closed: true,
      },
    });
    return errorResponse(error?.status ?? 400, requestId, [safeErrorCode], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export async function handleFinanceBankImportPreview({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_import:preview";
  const resourceType = "bank_import_preview";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;

  try {
    const { preview } = await createBankImportPreview({ body, runtime });
    const confirmation = runtime.bankImportPreviewTokens.issue({
      preview_id: preview.preview_id,
      preview_manifest_sha256: preview.preview_manifest_sha256,
      source_file_sha256: preview.source_file_sha256,
      source_type: preview.source_type,
      account_ref: preview.account_ref,
      tenant_id: query.tenant_id,
      actor_id: bankImportActorId(context),
    });
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      returnedCount: preview.items.length,
      metadata: {
        preview_id: preview.preview_id,
        source_file_sha256: preview.source_file_sha256,
        source_type: preview.source_type,
        source_file_name_included: false,
        raw_source_payload_included: false,
        product_records_mutated: false,
        confirmation_token_included: true,
      },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "preview_ready",
        preview: {
          preview_id: preview.preview_id,
          preview_manifest_sha256: preview.preview_manifest_sha256,
          source_file_sha256: preview.source_file_sha256,
          source_type: preview.source_type,
          account_ref: preview.account_ref,
          counts: preview.counts,
          items: preview.items,
          ...(preview.source_type === "pdf" ? {
            extracted_page_count: preview.extracted_page_count,
            extracted_character_count: preview.extracted_character_count,
          } : {}),
          preview_confirmation_token: confirmation.token,
          confirmation_expires_at: confirmation.expires_at,
          confirmation_token_included: true,
          product_records_mutated: false,
          raw_source_payload_included: false,
        },
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    const safeErrorCode = error?.safe_error_code
      ?? (error instanceof RangeError
        ? FINANCE_API_ERROR_CODES.source_file_limit_exceeded
        : FINANCE_API_ERROR_CODES.source_file_invalid);
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: {
        effect: "deny",
        reason: safeErrorCode.toLowerCase(),
        fail_closed: true,
      },
    });
    return bankImportPreviewError({
      status: [
        FINANCE_API_ERROR_CODES.source_file_too_large,
        FINANCE_API_ERROR_CODES.source_file_limit_exceeded,
      ].includes(safeErrorCode) ? 413 : 400,
      requestId,
      code: safeErrorCode,
      auditHintRef: query.audit_hint_ref,
    });
  }
}

function listResponse({ query, context, requestId, runtime, action, resourceType, modelType }) {
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const items = runtime.repository.list({ tenant_id: query.tenant_id, model_type: modelType }).map(sanitizeFinanceItem);
  const { allowed } = trimItemsByPermission({ context, items, action, resourceType });
  appendFinanceSensitiveReadAudit({ repository: runtime.repository, context, query, action, resourceType, returnedCount: allowed.length });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function feeCommitmentListResponse({ query, context, requestId, runtime }) {
  const action = "finance:fee_commitment:read";
  const resourceType = "fee_commitment";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    const items = listFeeCommitments({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      client_group_id: query.client_group_id ?? null,
      opportunity_id: query.opportunity_id ?? null,
      status: query.status ?? null,
    })
      .map((feeCommitment) => presentFeeCommitment({
        repository: runtime.repository,
        fee_commitment: feeCommitment,
      }))
      .map(sanitizeFinanceItem);
    const { allowed } = trimItemsByPermission({
      context,
      items,
      action,
      resourceType,
    });
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      returnedCount: allowed.length,
      metadata: {
        client_group_filter_applied: Boolean(query.client_group_id),
        opportunity_filter_applied: Boolean(query.opportunity_id),
        raw_payload_included: false,
      },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: allowed,
        page_info: { returned_count: allowed.length, omitted_item_count: null },
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: allowed.length === 0 ? "empty" : null,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

function clientDepositAllocationListResponse({
  query,
  context,
  requestId,
  runtime,
}) {
  const action = "finance:deposit_allocation:read";
  const resourceType = "client_deposit_allocation";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    const items = listClientDepositAllocations({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      client_group_id: query.client_group_id ?? null,
      bank_transaction_id: query.bank_transaction_id ?? null,
      fee_commitment_id: query.fee_commitment_id ?? null,
      status: query.status ?? null,
    }).map(presentClientDepositAllocation);
    const { allowed } = trimItemsByPermission({
      context,
      items,
      action,
      resourceType,
    });
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      returnedCount: allowed.length,
      metadata: {
        client_group_filter_applied: Boolean(query.client_group_id),
        bank_transaction_filter_applied:
          Boolean(query.bank_transaction_id),
        fee_commitment_filter_applied: Boolean(query.fee_commitment_id),
        raw_payload_included: false,
      },
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: allowed,
        page_info: {
          returned_count: allowed.length,
          omitted_item_count: null,
        },
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: allowed.length === 0 ? "empty" : null,
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(
      400,
      requestId,
      [FINANCE_API_ERROR_CODES.validation_error],
      {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "blocked",
      },
    );
  }
}

function itemResponse({ requestId, auditHintRef, outcome, item, auditEvent, status = 201, extra = {} }) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      item: sanitizeFinanceItem(item),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      production_ready_claim: false,
      ...extra,
    },
  };
}

function presentClientDepositAllocation(record) {
  return sanitizeFinanceItem({
    ...record,
    active_amount: record.allocated_amount - record.reversed_amount,
  });
}

function summarizeDepositAllocation(result) {
  if (!result) return null;
  return Object.freeze({
    outcome: result.outcome,
    created_count: result.created_count,
    updated_count: result.updated_count,
    allocated_amount: result.allocated_amount,
    advance_or_overpayment_amount: result.advance_or_overpayment_amount,
  });
}

function summarizeDepositAllocationReversal(result) {
  if (!result) return null;
  return Object.freeze({
    outcome: result.outcome,
    updated_count: result.updated_count,
    linked_refund_amount: result.linked_refund_amount,
    refund_reversed_amount: result.refund_reversed_amount,
    unapplied_refund_amount: result.unapplied_refund_amount,
    inactive_commitment_released_amount:
      result.inactive_commitment_released_amount,
  });
}

function mutateWithDepositAllocation({
  repository,
  tenantId,
  actorId,
  idempotencyKey,
  command,
  afterCommand = null,
}) {
  return repository.transaction(() => {
    const result = command();
    if (result.idempotent_replay) {
      return Object.freeze({
        result,
        depositAllocation: null,
        depositAllocationReversal: null,
      });
    }
    const followUp = typeof afterCommand === "function"
      ? afterCommand({ result })
      : null;
    const depositAllocationReversal =
      synchronizeClientDepositAllocationReversals({
        repository,
        tenant_id: tenantId,
        actor_id: actorId,
        idempotency_key:
          `${idempotencyKey}:client-deposit-allocation-reversal`,
      });
    const depositAllocation = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: tenantId,
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:client-deposit-allocation`,
    });
    return Object.freeze({
      result,
      depositAllocation,
      depositAllocationReversal,
      ...(followUp && typeof followUp === "object" ? followUp : {}),
    });
  });
}

export function handleFinanceTimeEntryCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.time_entry?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:time:write", resourceType: "time_entry", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createTimeEntry({
      repository: runtime.repository,
      time_entry: body.time_entry,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.time_entry,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceTimeEntryApprove({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const action = "finance:time:approve";
  const resourceType = "time_entry";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const result = approveTimeEntryForWip({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      time_entry_id: body.time_entry_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
      item: result.time_entry,
      auditEvent: result.audit_event,
      status: 200,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceExpenseCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.expense?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:expense:write", resourceType: "expense", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createExpense({
      repository: runtime.repository,
      expense: body.expense,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.expense,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceDisbursementCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.disbursement?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:disbursement:write", resourceType: "disbursement", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createDisbursement({
      repository: runtime.repository,
      disbursement: body.disbursement,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.disbursement,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceFeeArrangementCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.fee_arrangement?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:fee_arrangement:write", resourceType: "fee_arrangement", repository: runtime.repository });
  if (gated) return gated;
  try {
    const rateCard = body.rate_card ?? runtime.repository.get({
      tenant_id: body.fee_arrangement.tenant_id,
      model_type: "RateCard",
      rate_card_id: body.fee_arrangement.rate_card_id,
    });
    const result = createFeeArrangement({
      repository: runtime.repository,
      fee_arrangement: body.fee_arrangement,
      rate_card: rateCard,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.fee_arrangement,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceFeeCommitmentCreate({
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const query = {
    tenant_id: body?.fee_commitment?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:fee_commitment:write";
  const resourceType = "fee_commitment";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    const {
      result,
      depositAllocation,
      depositAllocationReversal,
    } = mutateWithDepositAllocation({
      repository: runtime.repository,
      tenantId: query.tenant_id,
      actorId: context.principal.user_id,
      idempotencyKey: body.idempotency_key,
      command: () => createFeeCommitment({
        repository: runtime.repository,
        master_data_repository: runtime.masterDataRepository,
        crm_repository: runtime.crmRepository,
        matter_repository: runtime.matterRepository,
        fee_commitment: body.fee_commitment,
        actor_id: context.principal.user_id,
        idempotency_key: body.idempotency_key,
      }),
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: presentFeeCommitment({
        repository: runtime.repository,
        fee_commitment: result.fee_commitment,
      }),
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        idempotent_replay: result.idempotent_replay,
        deposit_allocation: summarizeDepositAllocation(depositAllocation),
        deposit_allocation_reversal:
          summarizeDepositAllocationReversal(depositAllocationReversal),
      },
    });
  } catch (error) {
    const safeErrorCode = error?.safe_error_code
      ?? FINANCE_API_ERROR_CODES.validation_error;
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: {
        effect: "deny",
        reason: safeErrorCode.toLowerCase(),
        fail_closed: true,
      },
    });
    return errorResponse(error?.status ?? 400, requestId, [safeErrorCode], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleFinanceFeeCommitmentUpdate({
  feeCommitmentId,
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:fee_commitment:update";
  const resourceType = "fee_commitment";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    const {
      result,
      depositAllocation,
      depositAllocationReversal,
    } = mutateWithDepositAllocation({
      repository: runtime.repository,
      tenantId: query.tenant_id,
      actorId: context.principal.user_id,
      idempotencyKey: body.idempotency_key,
      command: () => updateFeeCommitment({
        repository: runtime.repository,
        master_data_repository: runtime.masterDataRepository,
        crm_repository: runtime.crmRepository,
        matter_repository: runtime.matterRepository,
        tenant_id: query.tenant_id,
        fee_commitment_id: feeCommitmentId,
        expected_state_version: body.expected_state_version,
        changes: body.changes,
        reason: body.reason,
        actor_id: context.principal.user_id,
        idempotency_key: body.idempotency_key,
      }),
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
      item: presentFeeCommitment({
        repository: runtime.repository,
        fee_commitment: result.fee_commitment,
      }),
      auditEvent: result.audit_event,
      status: 200,
      extra: {
        idempotent_replay: result.idempotent_replay,
        fee_arrangement_comparison: result.fee_arrangement_comparison,
        deposit_allocation: summarizeDepositAllocation(depositAllocation),
        deposit_allocation_reversal:
          summarizeDepositAllocationReversal(depositAllocationReversal),
      },
    });
  } catch (error) {
    const safeErrorCode = error?.safe_error_code
      ?? FINANCE_API_ERROR_CODES.validation_error;
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: {
        effect: "deny",
        reason: safeErrorCode.toLowerCase(),
        fail_closed: true,
      },
    });
    return errorResponse(error?.status ?? 400, requestId, [safeErrorCode], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleFinanceClientDepositReallocate({
  body,
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:deposit_allocation:reallocate";
  const resourceType = "client_deposit_allocation";
  const gated = routeGate({
    context,
    query,
    requestId,
    action,
    resourceType,
    repository: runtime.repository,
  });
  if (gated) return gated;
  try {
    const result = reallocateClientDeposit({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      bank_transaction_id: body.bank_transaction_id,
      expected_allocations: body.expected_allocations,
      targets: body.targets,
      reason: body.reason,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay
        ? "idempotent_replay"
        : result.outcome,
      item: {
        bank_transaction_id: result.bank_transaction_id,
        active_allocated_amount: result.active_allocated_amount,
        unallocated_amount: result.unallocated_amount,
      },
      auditEvent: result.audit_event,
      status: 200,
      extra: {
        items: result.allocations.map(presentClientDepositAllocation),
        idempotent_replay: result.idempotent_replay,
        raw_source_payload_included: false,
      },
    });
  } catch (error) {
    const safeErrorCode = error?.safe_error_code
      ?? FINANCE_API_ERROR_CODES.validation_error;
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: {
        effect: "deny",
        reason: safeErrorCode.toLowerCase(),
        fail_closed: true,
      },
    });
    return errorResponse(error?.status ?? 400, requestId, [safeErrorCode], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
}

export function handleFinanceWipGenerate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:wip:write", resourceType: "wip_item", repository: runtime.repository });
  if (gated) return gated;
  try {
    const rateCard = runtime.repository.get({ tenant_id: body.tenant_id, model_type: "RateCard", rate_card_id: body.rate_card_id ?? "rate_cmp_g7_seed" });
    const feeArrangement = body.fee_arrangement ?? findFeeArrangementForMatter({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      fee_arrangement_id: body.fee_arrangement_id,
    });
    const result = generateWipFromApprovedItems({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      rate_card: rateCard,
      fee_arrangement: feeArrangement,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.wip_items[0],
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { items: result.wip_items.map(sanitizeFinanceItem), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceWipSnapshotLock({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:wip_snapshot:write", resourceType: "wip_snapshot", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = lockWipSnapshot({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      wip_item_ids: body.wip_item_ids,
      wip_snapshot_id: body.wip_snapshot_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.wip_snapshot,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePreBillCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.prebill?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:prebill:write", resourceType: "prebill", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createPreBill({
      repository: runtime.repository,
      prebill: body.prebill,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.prebill,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePreBillApprove({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const action = "finance:prebill:approve";
  const resourceType = "prebill";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const result = approvePreBillWithoutAdjustment({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      prebill_id: body.prebill_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
      item: result.prebill,
      auditEvent: result.audit_event,
      status: 200,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePreBillReject({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const action = "finance:prebill:reject";
  const resourceType = "prebill";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const result = rejectPreBill({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      prebill_id: body.prebill_id,
      reason_code: body.reason_code,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : result.outcome,
      item: result.prebill,
      auditEvent: result.audit_event,
      status: 200,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceInvoiceIssue({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.invoice?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:invoice:write", resourceType: "invoice", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createInvoiceFromPreBill({
      repository: runtime.repository,
      invoice: body.invoice,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.invoice,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { invoice_lines: result.invoice_lines.map(sanitizeFinanceItem), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePaymentImport({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.payment?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:payment:write", resourceType: "payment", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = importPayment({
      repository: runtime.repository,
      payment: body.payment,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.payment,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePaymentMatchCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.match?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:payment_match:write", resourceType: "payment_match", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = matchPaymentToInvoice({
      repository: runtime.repository,
      match: body.match,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.payment_match,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        payment_allocation: sanitizeFinanceItem(result.payment_allocation),
        invoice: sanitizeFinanceItem(result.invoice),
        payment: sanitizeFinanceItem(result.payment),
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinancePaymentAllocationCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.allocation?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:payment_allocation:write", resourceType: "payment_allocation", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = allocatePayment({
      repository: runtime.repository,
      allocation: body.allocation,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.payment_allocation,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        invoice: result.invoice ? sanitizeFinanceItem(result.invoice) : null,
        payment: sanitizeFinanceItem(result.payment),
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceTrustDepositCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.deposit?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:trust_ledger:write", resourceType: "trust_ledger", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = receiveTrustDeposit({
      repository: runtime.repository,
      deposit: body.deposit,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.trust_ledger_entry,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { trust_balance: sanitizeFinanceItem(result.trust_balance), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceTrustDrawdownCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.drawdown?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:trust_ledger:write", resourceType: "trust_ledger", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = drawdownTrustToInvoice({
      repository: runtime.repository,
      drawdown: body.drawdown,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.trust_ledger_entry,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: {
        invoice: sanitizeFinanceItem(result.invoice),
        trust_balance: sanitizeFinanceItem(result.trust_balance),
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceTrustRefundCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.refund?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:trust_ledger:write", resourceType: "trust_ledger", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = recordTrustRefundLiability({
      repository: runtime.repository,
      refund: body.refund,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return itemResponse({
      requestId,
      auditHintRef: query.audit_hint_ref,
      outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: result.trust_ledger_entry,
      auditEvent: result.audit_event,
      status: result.idempotent_replay ? 200 : 201,
      extra: { trust_balance: sanitizeFinanceItem(result.trust_balance), idempotent_replay: result.idempotent_replay },
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceTrustBalances({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:trust_ledger:read", resourceType: "trust_balance", repository: runtime.repository });
  if (gated) return gated;
  const report = getTrustBalanceReport({
    repository: runtime.repository,
    tenant_id: query.tenant_id,
    matter_id: query.matter_id,
    currency: query.currency,
  });
  const { allowed } = trimItemsByPermission({ context, items: report.items.map(sanitizeFinanceItem), action: "finance:trust_ledger:read", resourceType: "trust_balance" });
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action: "finance:trust_ledger:read",
    resourceType: "trust_balance",
    returnedCount: allowed.length,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      summary: report.summary,
      page_info: { returned_count: allowed.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleFinanceArAging({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:ar:read", resourceType: "ar_aging", repository: runtime.repository });
  if (gated) return gated;
  let snapshots = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "ARAgingSnapshot" });
  if (query.as_of_date) snapshots = snapshots.filter((snapshot) => snapshot.as_of_date === query.as_of_date);
  let generatedSnapshot = false;
  if (snapshots.length === 0) {
    try {
      const created = createArAgingSnapshot({
        repository: runtime.repository,
        tenant_id: query.tenant_id,
        actor_id: context.principal.user_id,
        idempotency_key: `api-ar-aging:${query.tenant_id}:${query.as_of_date ?? "latest"}`,
        ar_aging_snapshot_id: `ar_aging_api_${query.tenant_id}_${query.as_of_date ?? "latest"}`,
        as_of_date: query.as_of_date,
      });
      snapshots = [created.ar_aging_snapshot];
      generatedSnapshot = true;
    } catch {
      return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "blocked",
      });
    }
  }
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action: "finance:ar:read",
    resourceType: "ar_aging",
    returnedCount: snapshots.length,
    metadata: { generated_snapshot_when_missing: generatedSnapshot },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: snapshots.map(sanitizeFinanceItem),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleFinanceAccountingExportCsv({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:accounting_export:read", resourceType: "accounting_export", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = createAccountingCsvExport({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      from_date: query.from_date,
      to_date: query.to_date,
      actor_id: context.principal.user_id,
      idempotency_key: query.idempotency_key ?? `api-accounting-export:${query.tenant_id}:${query.from_date ?? "start"}:${query.to_date ?? "end"}`,
      accounting_export_id: query.accounting_export_id,
    });
    const item = result.accounting_export;
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action: "finance:accounting_export:read",
      resourceType: "accounting_export",
      returnedCount: 1,
      metadata: { export_content_included_in_audit: false },
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: {
          accounting_export_id: item.accounting_export_id,
          tenant_id: item.tenant_id,
          export_format: item.export_format,
          status: item.status,
          from_date: item.from_date,
          to_date: item.to_date,
          csv_text: item.csv_text,
          csv_sha256: item.csv_sha256,
          row_count: item.row_count,
          debit_total: item.debit_total,
          credit_total: item.credit_total,
          balanced: item.balanced,
          bank_reference_included: false,
          credential_material_included: false,
          raw_journal_payload_included: false,
          production_ready_claim: false,
        },
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
}

export function handleFinanceAudit({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const gated = routeGate({ context, query, requestId, action: "finance:audit:read", resourceType: "finance_audit", repository: runtime.repository });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.repository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleFinanceApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const feeCommitmentMatch = /^\/api\/finance\/fee-commitments\/([^/]+)$/u.exec(pathname);
  const clientDepositMatch = /^\/api\/finance\/client-deposits\/([^/]+)$/u.exec(pathname);
  if (pathname === "/api/finance/bank-transactions" && method === "GET") {
    return bankTransactionListResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classifications" && method === "GET") {
    return bankClassificationListResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classification-options" && method === "GET") {
    return bankClassificationOptionsResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/client-receivables" && method === "GET") {
    return clientReceivablesResponse({
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (pathname === "/api/finance/client-deposits" && method === "GET") {
    return clientDepositListResponse({
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (clientDepositMatch && method === "GET") {
    return clientDepositDetailResponse({
      bankTransactionId: decodeURIComponent(clientDepositMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (pathname === "/api/finance/bank-imports/preview" && method === "POST") {
    return handleFinanceBankImportPreview({ body, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-imports" && method === "POST") {
    return handleFinanceBankImport({ body, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classifications/auto" && method === "POST") {
    return handleFinanceBankClassificationAuto({ body, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classifications/review" && method === "POST") {
    return handleFinanceBankClassificationReview({ body, context, requestId, runtime });
  }
  if (pathname === "/api/finance/time-entries" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:time:read", resourceType: "time_entry", modelType: "TimeEntry" });
  }
  if (pathname === "/api/finance/time-entries" && method === "POST") return handleFinanceTimeEntryCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/time-entries/approve" && method === "POST") return handleFinanceTimeEntryApprove({ body, context, requestId, runtime });
  if (pathname === "/api/finance/expenses" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:expense:read", resourceType: "expense", modelType: "Expense" });
  }
  if (pathname === "/api/finance/expenses" && method === "POST") return handleFinanceExpenseCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/disbursements" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:disbursement:read", resourceType: "disbursement", modelType: "Disbursement" });
  }
  if (pathname === "/api/finance/disbursements" && method === "POST") return handleFinanceDisbursementCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/fee-arrangements" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:fee_arrangement:read", resourceType: "fee_arrangement", modelType: "FeeArrangement" });
  }
  if (pathname === "/api/finance/fee-arrangements" && method === "POST") return handleFinanceFeeArrangementCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/fee-commitments" && method === "GET") {
    return feeCommitmentListResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/fee-commitments" && method === "POST") {
    return handleFinanceFeeCommitmentCreate({ body, context, requestId, runtime });
  }
  if (feeCommitmentMatch && method === "PATCH") {
    return handleFinanceFeeCommitmentUpdate({
      feeCommitmentId: feeCommitmentMatch[1],
      body,
      context,
      requestId,
      runtime,
    });
  }
  if (
    pathname === "/api/finance/client-deposit-allocations"
    && method === "GET"
  ) {
    return clientDepositAllocationListResponse({
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (
    pathname === "/api/finance/client-deposit-allocations/reallocate"
    && method === "POST"
  ) {
    return handleFinanceClientDepositReallocate({
      body,
      context,
      requestId,
      runtime,
    });
  }
  if (pathname === "/api/finance/wip" && method === "POST") return handleFinanceWipGenerate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/wip-snapshots" && method === "POST") return handleFinanceWipSnapshotLock({ body, context, requestId, runtime });
  if (pathname === "/api/finance/prebills" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:prebill:read", resourceType: "prebill", modelType: "PreBill" });
  }
  if (pathname === "/api/finance/prebills" && method === "POST") return handleFinancePreBillCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/prebills/approve" && method === "POST") return handleFinancePreBillApprove({ body, context, requestId, runtime });
  if (pathname === "/api/finance/prebills/reject" && method === "POST") return handleFinancePreBillReject({ body, context, requestId, runtime });
  if (pathname === "/api/finance/invoices" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:invoice:read", resourceType: "invoice", modelType: "Invoice" });
  }
  if (pathname === "/api/finance/invoices" && method === "POST") return handleFinanceInvoiceIssue({ body, context, requestId, runtime });
  if (pathname === "/api/finance/payments" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:payment:read", resourceType: "payment", modelType: "Payment" });
  }
  if (pathname === "/api/finance/payments" && method === "POST") return handleFinancePaymentImport({ body, context, requestId, runtime });
  if (pathname === "/api/finance/payment-allocations" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:payment_allocation:read", resourceType: "payment_allocation", modelType: "PaymentAllocation" });
  }
  if (pathname === "/api/finance/payment-allocations" && method === "POST") return handleFinancePaymentAllocationCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/payment-matches" && method === "GET") {
    return listResponse({ query, context, requestId, runtime, action: "finance:payment_match:read", resourceType: "payment_match", modelType: "PaymentMatch" });
  }
  if (pathname === "/api/finance/payment-matches" && method === "POST") return handleFinancePaymentMatchCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/ar-aging" && method === "GET") return handleFinanceArAging({ query, context, requestId, runtime });
  if (pathname === "/api/finance/accounting-export.csv" && method === "GET") return handleFinanceAccountingExportCsv({ query, context, requestId, runtime });
  if (pathname === "/api/finance/trust-balances" && method === "GET") return handleFinanceTrustBalances({ query, context, requestId, runtime });
  if (pathname === "/api/finance/trust-deposits" && method === "POST") return handleFinanceTrustDepositCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/trust-drawdowns" && method === "POST") return handleFinanceTrustDrawdownCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/trust-refunds" && method === "POST") return handleFinanceTrustRefundCreate({ body, context, requestId, runtime });
  if (pathname === "/api/finance/audit" && method === "GET") return handleFinanceAudit({ query, context, requestId, runtime });
  return errorResponse(404, requestId, [FINANCE_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}

function financeRequestTenantId(query, body) {
  if (query?.tenant_id) return query.tenant_id;
  if (body?.tenant_id) return body.tenant_id;
  for (const value of Object.values(body ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && value.tenant_id) return value.tenant_id;
  }
  throw new TypeError("tenant_id is required for the Finance PostgreSQL adapter");
}

export async function handleFinancePostgresApiRequest({ ledger, pathname, method, query, body, context, requestId } = {}) {
  const tenantId = financeRequestTenantId(query, body);
  const command = await runFinancePostgresCommand({
    ledger,
    tenant_id: tenantId,
    command(repository) {
      return handleFinanceApiRequest({
        pathname,
        method,
        query,
        body,
        context,
        requestId,
        runtime: createFinanceRuntimeContext({ repository }),
      });
    },
  });
  return Object.freeze({
    response: command.result,
    persistence: Object.freeze({
      adapter: "finance-postgres-domain-ledger",
      tenant_id: tenantId,
      shadow_equal: command.flush.comparison.equal,
      production_migrated: false,
    }),
  });
}
