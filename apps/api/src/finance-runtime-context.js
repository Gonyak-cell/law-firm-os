import { randomUUID } from "node:crypto";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { runFinancePostgresCommand } from "../../../packages/billing/src/central-ledger.js";
import { importBankTransactionBatch } from "../../../packages/billing/src/bank-transaction-service.js";
import {
  BANK_CLASSIFICATION_CATEGORIES,
  autoClassifyBankTransactions,
  bankEmployeePayrollCategory,
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
import { importPayment } from "../../../packages/payments/src/payment-service.js";
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
  previewAmicWorkbookBuffer,
} from "../../../packages/import-data/src/index.js";

export const FINANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "finance",
  contract_ref: "contracts/finance-runtime-contract.json",
  contract_schema_version: "law-firm-os.finance-runtime-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/finance/time-entries",
    "GET /api/finance/bank-transactions",
    "GET /api/finance/bank-classifications",
    "GET /api/finance/bank-classification-options",
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
  if (action.startsWith("finance:payment:") || action.startsWith("finance:payment_match:") || action.startsWith("finance:trust_ledger:")) return "finance.payment.write";
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

function routeGate({ context, query, requestId, action, resourceType, repository }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = explicitScopeDecision(context, requiredFinanceScope(action)) ?? evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
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
    const error = new TypeError("XLSX source file is required");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_required;
    throw error;
  }
  const fileName = String(file.filename ?? file.file_name ?? "").trim().split(/[\\/]/u).at(-1);
  const mimeType = String(file.mime_type ?? file.content_type ?? "").trim().toLowerCase();
  if (!fileName.toLowerCase().endsWith(".xlsx")
      || ![
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ].includes(mimeType)) {
    const error = new TypeError("XLSX filename and MIME type are required");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  const encoded = String(file.content_base64 ?? "").trim();
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) {
    const error = new TypeError("XLSX source encoding is invalid");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.toString("base64") !== encoded) {
    const error = new TypeError("XLSX source encoding is invalid");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  if (buffer.length > MAX_AMIC_WORKBOOK_SOURCE_BYTES) {
    const error = new RangeError("XLSX source exceeds the preview byte budget");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_too_large;
    throw error;
  }
  const declaredByteSize = Number(file.byte_size);
  if (Number.isFinite(declaredByteSize) && declaredByteSize !== buffer.length) {
    const error = new TypeError("XLSX declared byte size does not match content");
    error.safe_error_code = FINANCE_API_ERROR_CODES.source_file_invalid;
    throw error;
  }
  return buffer;
}

function classificationDirectories(runtime, tenantId) {
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
    const directories = classificationDirectories(runtime, query.tenant_id);
    const result = autoClassifyBankTransactions({
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      client_records: directories.clientRecords,
      employees: directories.employees,
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
    const directories = classificationDirectories(runtime, query.tenant_id);
    const clientIds = new Set(directories.clientRecords
      .filter((record) => record.model_type === "ClientGroup")
      .map((record) => record.client_group_id));
    const employeeIds = new Set(directories.employees.map((record) => record.employee_id));
    const decisions = (body.decisions ?? []).map((decision) => {
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
      repository: runtime.repository,
      tenant_id: query.tenant_id,
      decisions,
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
          rule_count: result.rule_count,
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
    const result = importBankTransactionBatch({
      repository: runtime.repository,
      bank_import_batch: body.bank_import_batch,
      transactions: body.transactions,
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

export function handleFinanceBankImportPreview({ body, context, requestId, runtime = DEFAULT_RUNTIME } = {}) {
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
    const sourceBuffer = bankImportPreviewFile(body);
    const existingTransactions = runtime.repository.list({
      tenant_id: query.tenant_id,
      model_type: "BankTransaction",
      account_ref: body.account_ref || undefined,
    });
    const preview = previewAmicWorkbookBuffer(sourceBuffer, {
      account_ref: body.account_ref || undefined,
      existing_transactions: existingTransactions,
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
        source_file_name_included: false,
        raw_source_payload_included: false,
        product_records_mutated: false,
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
          account_ref: preview.account_ref,
          counts: preview.counts,
          items: preview.items,
          confirmation_token_included: false,
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
        ? FINANCE_API_ERROR_CODES.source_file_too_large
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
      status: safeErrorCode === FINANCE_API_ERROR_CODES.source_file_too_large ? 413 : 400,
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
        invoice: sanitizeFinanceItem(result.invoice),
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
  if (pathname === "/api/finance/bank-transactions" && method === "GET") {
    return bankTransactionListResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classifications" && method === "GET") {
    return bankClassificationListResponse({ query, context, requestId, runtime });
  }
  if (pathname === "/api/finance/bank-classification-options" && method === "GET") {
    return bankClassificationOptionsResponse({ query, context, requestId, runtime });
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
