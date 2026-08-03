import { randomUUID } from "node:crypto";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { runFinancePostgresCommand } from "../../../packages/billing/src/central-ledger.js";
import {
  BANK_CLASSIFICATION_CATEGORIES,
  summarizeBankTransactionClassifications,
  classificationDirectories,
  listAmicBankClassificationEmployees,
  runFinanceBankClassificationAuto,
  runFinanceBankClassificationReview,
  runFinanceBankImport,
  sanitizeBankClassification,
  sanitizeBankImportBatch,
  sanitizeBankTransaction,
} from "./finance-bank-boundary.js";
import {
  financePaymentMatchMatterIds,
  financePaymentAllocationMatterIds,
  runFinanceBillingDisbursementCreate,
  runFinanceBillingExpenseCreate,
  runFinanceBillingFeeArrangementCreate,
  runFinanceBillingInvoiceIssue,
  runFinanceBillingPaymentAllocationCreate,
  runFinanceBillingPaymentImport,
  runFinanceBillingPaymentMatchCreate,
  runFinanceBillingPreBillApprove,
  runFinanceBillingPreBillCreate,
  runFinanceBillingPreBillReject,
  runFinanceBillingTimeEntryApprove,
  runFinanceBillingTimeEntryCreate,
  runFinanceBillingWipGenerate,
  runFinanceBillingWipSnapshotLock,
} from "./finance-billing-boundary.js";
import {
  drawdownTrustToInvoice,
  receiveTrustDeposit,
  recordTrustRefundLiability,
} from "../../../packages/payments/src/trust-ledger-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";
import { mapPreBillApprovalDomainError } from "./finance-prebill-boundary.js";
import { mapApiHandlerError } from "./api-handler-dispatcher.js";
import {
  runFinanceAccountingCsvExport,
  runFinanceArAgingRead,
  runFinanceAuditRead,
  runFinanceTrustBalanceRead,
  listFinanceAccountingJournalEntries,
} from "./finance-read-export-boundary.js";
import { createFinanceRuntimeRouter } from "./finance-runtime-router.js";

export const FINANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "finance",
  contract_ref: "contracts/finance-runtime-contract.json",
  contract_schema_version: "law-firm-os.finance-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/finance/time-entries",
    "GET /api/finance/bank-transactions",
    "GET /api/finance/bank-classifications",
    "GET /api/finance/bank-classification-options",
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
  matterRepository = null,
  clientRecords = null,
  employees = listAmicBankClassificationEmployees(),
  employeeRepository = null,
} = {}) {
  return Object.freeze({
    repository,
    masterDataRepository,
    matterRepository,
    clientRecords: Array.isArray(clientRecords) ? Object.freeze([...clientRecords]) : null,
    employees: Object.freeze([...(employees ?? [])]),
    employeeRepository,
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
  if (["finance:fee_arrangement:", "finance:wip:", "finance:wip_snapshot:", "finance:prebill:", "finance:invoice:"].some((prefix) => action.startsWith(prefix))) return "finance.billing.write";
  return null;
}

function explicitScopeDecision(context, requiredScope) {
  const scopes = context?.principal?.scopes;
  if (!requiredScope || !Array.isArray(scopes) || scopes.includes(requiredScope)) return null;
  return { effect: "deny", reason: `finance_scope_required:${requiredScope}`, fail_closed: true };
}

function routeGate({ context, query, requestId, action, resourceType, repository, resource = {}, collectionRead = false }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const routeObjectAcl = collectionRead && Array.isArray(context?.object_acl) && resource.resource_id === undefined
    ? context.object_acl.filter((entry) => entry.resource_id === undefined)
    : context?.object_acl;
  const routeContext = routeObjectAcl === context?.object_acl
    ? context
    : { ...context, object_acl: routeObjectAcl };
  const decision = explicitScopeDecision(context, requiredFinanceScope(action)) ?? evaluateRouteDecision({
    context: routeContext,
    resource: { ...resource, tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  const response = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (response) appendFinanceRouteAudit({ repository, context, query, action, resourceType, decision });
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
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
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
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  const directories = classificationDirectories(runtime, query.tenant_id);
  const clients = directories.clientRecords
    .filter((record) => record.model_type === "ClientGroup" && record.status !== "inactive")
    .map((record) => Object.freeze({
      client_group_id: record.client_group_id,
      label: record.display_name ?? record.canonical_display_name ?? record.client_group_id,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "ko"));
  const employees = directories.employees
    .filter((record) => record.status !== "inactive")
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

export function handleFinanceBankClassificationAuto({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_classification:auto";
  const resourceType = "bank_transaction_classification";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const result = runFinanceBankClassificationAuto({
      repository: runtime.repository,
      runtime,
      tenant_id: query.tenant_id,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "classified",
        item: {
          created_count: result.created_count,
          updated_count: result.updated_count,
          protected_manual_count: result.protected_manual_count,
          summary: result.summary,
        },
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        idempotent_replay: result.idempotent_replay,
        raw_source_payload_included: false,
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

export function handleFinanceBankClassificationReview({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const action = "finance:bank_classification:review";
  const resourceType = "bank_transaction_classification";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository });
  if (gated) return gated;
  const roleDenied = partnerApprovalGate({ context, query, requestId, runtime, action, resourceType });
  if (roleDenied) return roleDenied;
  try {
    const bankReview = runFinanceBankClassificationReview({
      repository: runtime.repository,
      runtime,
      tenant_id: query.tenant_id,
      decisions: body.decisions ?? [],
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const { result, confirmedPayments } = bankReview;
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "classified",
        item: {
          created_count: result.created_count,
          updated_count: result.updated_count,
          rule_count: result.rule_count,
          summary: result.summary,
          payment_count: confirmedPayments.length,
          payments: Object.freeze(confirmedPayments.map(sanitizeFinanceItem)),
        },
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        idempotent_replay: result.idempotent_replay,
        raw_source_payload_included: false,
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

export function handleFinanceBankImport({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
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
  if (body?.bank_import_batch?.production_import_approved !== true) {
    return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.approval_required], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "review_required",
    });
  }
  try {
    const result = runFinanceBankImport({
      repository: runtime.repository,
      body,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: sanitizeBankImportBatch(result.bank_import_batch),
        transaction_count: result.transaction_count,
        audit_event: result.audit_event,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        idempotent_replay: result.idempotent_replay,
        raw_source_payload_included: false,
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

function preBillApprovalErrorResponse(error, requestId, auditHintRef) {
  const safeDomainError = mapPreBillApprovalDomainError(error);
  if (safeDomainError) {
    const response = errorResponse(
      safeDomainError.status,
      requestId,
      [safeDomainError.code],
      { audit_hint_ref: auditHintRef, ui_state: "blocked" },
    );
    return {
      ...response,
      body: {
        ...response.body,
        code: safeDomainError.code,
        message: safeDomainError.message,
      },
    };
  }
  const mapped = mapApiHandlerError(error, { requestId });
  const idempotencyConflict = (
    error?.status === 409
    && error?.code === "FINANCE_IDEMPOTENCY_CONFLICT"
    && error?.safe_error_code === "IDEMPOTENCY_CONFLICT"
  );
  if (!idempotencyConflict) return mapped;
  return {
    ...mapped,
    body: {
      ...mapped.body,
      audit_hint_ref: auditHintRef,
      ui_state: "blocked",
      code: "FINANCE_IDEMPOTENCY_CONFLICT",
      message: "idempotency key was already used for a different finance request",
    },
  };
}

export function handleFinanceTimeEntryCreate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.time_entry?.tenant_id ?? body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:time:write", resourceType: "time_entry", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = runFinanceBillingTimeEntryCreate({
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
    const result = runFinanceBillingTimeEntryApprove({
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
    const result = runFinanceBillingExpenseCreate({
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
    const result = runFinanceBillingDisbursementCreate({
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
    const result = runFinanceBillingFeeArrangementCreate({
      repository: runtime.repository,
      fee_arrangement: body.fee_arrangement,
      rate_card: body.rate_card,
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

export function handleFinanceWipGenerate({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const query = { tenant_id: body?.tenant_id, permission_ref: body?.permission_ref, audit_hint_ref: body?.audit_hint_ref };
  const gated = routeGate({ context, query, requestId, action: "finance:wip:write", resourceType: "wip_item", repository: runtime.repository });
  if (gated) return gated;
  try {
    const result = runFinanceBillingWipGenerate({
      repository: runtime.repository,
      tenant_id: body.tenant_id,
      matter_id: body.matter_id,
      rate_card_id: body.rate_card_id,
      fee_arrangement: body.fee_arrangement,
      fee_arrangement_id: body.fee_arrangement_id,
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
    const result = runFinanceBillingWipSnapshotLock({
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
    const result = runFinanceBillingPreBillCreate({
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
    const result = runFinanceBillingPreBillApprove({
      repository: runtime.repository,
      body,
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
      extra: {
        ...(result.adjustment ? { adjustment: sanitizeFinanceItem(result.adjustment) } : {}),
        idempotent_replay: result.idempotent_replay,
      },
    });
  } catch (error) {
    return preBillApprovalErrorResponse(error, requestId, query.audit_hint_ref);
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
    const result = runFinanceBillingPreBillReject({
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
    const result = runFinanceBillingInvoiceIssue({
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
    const result = runFinanceBillingPaymentImport({
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
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  let canonicalMatterIds;
  try {
    canonicalMatterIds = financePaymentMatchMatterIds({
      repository: runtime.repository,
      match: body?.match,
      tenant_id: query.tenant_id,
      rejectContradictory: false,
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  for (const matterId of canonicalMatterIds) {
    const gated = routeGate({
      context,
      query,
      requestId,
      action: "finance:payment_match:write",
      resourceType: "payment_match",
      repository: runtime.repository,
      resource: {
        resource_id: body?.match?.payment_match_id ?? null,
        matter_id: matterId,
      },
    });
    if (gated) return gated;
  }
  if (canonicalMatterIds.length > 1) {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  try {
    const result = runFinanceBillingPaymentMatchCreate({
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
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  let canonicalMatterIds;
  try {
    canonicalMatterIds = financePaymentAllocationMatterIds({
      repository: runtime.repository,
      allocation: body?.allocation,
      tenant_id: query.tenant_id,
      rejectContradictory: false,
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  for (const matterId of canonicalMatterIds) {
    const gated = routeGate({
      context,
      query,
      requestId,
      action: "finance:payment_allocation:write",
      resourceType: "payment_allocation",
      repository: runtime.repository,
      resource: {
        resource_id: body.allocation.payment_allocation_id ?? null,
        matter_id: matterId,
      },
    });
    if (gated) return gated;
  }
  if (canonicalMatterIds.length > 1) {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], { audit_hint_ref: query.audit_hint_ref, ui_state: "blocked" });
  }
  try {
    const result = runFinanceBillingPaymentAllocationCreate({
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
  const action = "finance:trust_ledger:read";
  const resourceType = "trust_balance";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository, collectionRead: true });
  if (gated) return gated;
  const sourceBalances = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "TrustBalance", matter_id: query.matter_id })
    .filter((item) => !query.currency || item.currency === query.currency);
  const { allowed: visibleBalances } = trimItemsByPermission({
    context,
    items: sourceBalances,
    action,
    resourceType,
  });
  const report = runFinanceTrustBalanceRead({
    repository: runtime.repository,
    tenant_id: query.tenant_id,
    matter_id: query.matter_id,
    currency: query.currency,
    sourceRecords: visibleBalances,
  });
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: report.items.length,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: report.items,
      summary: report.summary,
      page_info: { returned_count: report.items.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleFinanceArAging({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const action = "finance:ar:read";
  const resourceType = "ar_aging";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository, collectionRead: true });
  if (gated) return gated;
  const sourceBalances = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "ARBalance" });
  const { allowed: visibleBalances } = trimItemsByPermission({
    context,
    items: sourceBalances,
    action,
    resourceType,
  });
  let report;
  try {
    report = runFinanceArAgingRead({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      actor_id: context.principal.user_id,
      as_of_date: query.as_of_date,
      sourceRecords: visibleBalances,
      sourceRecordCount: sourceBalances.length,
    });
  } catch {
    return errorResponse(400, requestId, [FINANCE_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const { allowed } = trimItemsByPermission({ context, items: report.items, action, resourceType });
  appendFinanceSensitiveReadAudit({
    repository: runtime.repository,
    context,
    query,
    action,
    resourceType,
    returnedCount: allowed.length,
    metadata: { generated_snapshot_when_missing: report.generated_snapshot, visible_source_count: visibleBalances.length },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: allowed,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleFinanceAccountingExportCsv({ query, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  const action = "finance:accounting_export:read";
  const resourceType = "accounting_export";
  const gated = routeGate({ context, query, requestId, action, resourceType, repository: runtime.repository, collectionRead: true });
  if (gated) return gated;
  const sourceEntries = listFinanceAccountingJournalEntries({
    repository: runtime.repository,
    tenant_id: query.tenant_id,
    from_date: query.from_date,
    to_date: query.to_date,
  });
  const { allowed: visibleEntries } = trimItemsByPermission({
    context,
    items: sourceEntries,
    action,
    resourceType: "journal_entry",
  });
  const idempotencyKey = query.idempotency_key
    ?? `api-accounting-export:${query.tenant_id}:${query.from_date ?? "start"}:${query.to_date ?? "end"}`;
  const existingReplay = runtime.repository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  const existingExport = existingReplay?.operation === "accounting_csv_export_create"
    ? existingReplay.response?.accounting_export
    : null;
  const visibleEntryIds = new Set(visibleEntries.map((entry) => entry.journal_entry_id));
  if (existingExport && (!Array.isArray(existingExport.journal_entry_refs)
    || existingExport.journal_entry_refs.some((entryId) => !visibleEntryIds.has(entryId)))) {
    appendFinanceRouteAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      decision: { effect: "deny", reason: "accounting_export_replay_contains_hidden_source", fail_closed: true },
    });
    return errorResponse(403, requestId, [FINANCE_API_ERROR_CODES.unauthorized_omission], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "denied",
    });
  }
  try {
    const result = runFinanceAccountingCsvExport({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      from_date: query.from_date,
      to_date: query.to_date,
      actor_id: context.principal.user_id,
      idempotency_key: idempotencyKey,
      accounting_export_id: query.accounting_export_id,
      journal_entries: visibleEntries,
    });
    const item = result.accounting_export;
    const exportedEntryCount = Array.isArray(item.journal_entry_refs)
      ? item.journal_entry_refs.length
      : visibleEntries.length;
    appendFinanceSensitiveReadAudit({
      repository: runtime.repository,
      context,
      query,
      action,
      resourceType,
      returnedCount: exportedEntryCount,
      metadata: {
        export_content_included_in_audit: false,
        visible_journal_entry_count: exportedEntryCount,
        csv_row_count: item.row_count,
      },
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item,
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
  const gated = routeGate({ context, query, requestId, action: "finance:audit:read", resourceType: "finance_audit", repository: runtime.repository, collectionRead: true });
  if (gated) return gated;
  const report = runFinanceAuditRead({ repository: runtime.repository, tenant_id: query.tenant_id });
  const permissionItems = report.items.map((event) => ({
    ...event,
    resource_id: event.resource_id ?? event.object_id ?? event.event_id,
  }));
  const { allowed } = trimItemsByPermission({
    context,
    items: permissionItems,
    action: "finance:audit:read",
    resourceType: "finance_audit",
  });
  const allowedSet = new Set(allowed);
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: report.items.filter((_event, index) => allowedSet.has(permissionItems[index])),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

const FINANCE_ROUTE_HANDLERS = Object.freeze({
  bankTransactionListResponse,
  bankClassificationListResponse,
  bankClassificationOptionsResponse,
  handleFinanceBankImport,
  handleFinanceBankClassificationAuto,
  handleFinanceBankClassificationReview,
  listResponse: (request, options) => listResponse({ ...request, ...options }),
  handleFinanceTimeEntryCreate,
  handleFinanceTimeEntryApprove,
  handleFinanceExpenseCreate,
  handleFinanceDisbursementCreate,
  handleFinanceFeeArrangementCreate,
  handleFinanceWipGenerate,
  handleFinanceWipSnapshotLock,
  handleFinancePreBillCreate,
  handleFinancePreBillApprove,
  handleFinancePreBillReject,
  handleFinanceInvoiceIssue,
  handleFinancePaymentImport,
  handleFinancePaymentAllocationCreate,
  handleFinancePaymentMatchCreate,
  handleFinanceArAging,
  handleFinanceAccountingExportCsv,
  handleFinanceTrustBalances,
  handleFinanceTrustDepositCreate,
  handleFinanceTrustDrawdownCreate,
  handleFinanceTrustRefundCreate,
  handleFinanceAudit,
});

const FINANCE_RUNTIME_ROUTER = createFinanceRuntimeRouter({
  handlers: FINANCE_ROUTE_HANDLERS,
  notFound: ({ query, requestId }) => errorResponse(404, requestId, [FINANCE_API_ERROR_CODES.not_found], {
    audit_hint_ref: query.audit_hint_ref,
  }),
});

export async function handleFinanceApiRequest({ pathname, method, query, body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
  return FINANCE_RUNTIME_ROUTER({ pathname, method, query, body, context, requestId, runtime });
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
