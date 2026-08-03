const FINANCE_API_BASE_PATH = "/api/finance/";
const FINANCE_ROUTE_METHODS = Object.freeze(["GET", "POST"]);

function freezeRouteDefinition({ id, method, path, handler, options = undefined }) {
  return Object.freeze({
    id,
    method,
    path,
    handler,
    ...(options === undefined ? {} : { options: Object.freeze({ ...options }) }),
  });
}

function route(id, method, path, handler, options) {
  return freezeRouteDefinition({ id, method, path, handler, options });
}

// This catalog is the complete Finance method/path dispatch table. Handler
// names are resolved by the runtime composition root so this module stays
// independent of the domain handlers it dispatches.
export const FINANCE_RUNTIME_ROUTE_CATALOG = Object.freeze([
  route("bankTransactionsRead", "GET", "/api/finance/bank-transactions", "bankTransactionListResponse"),
  route("bankClassificationsRead", "GET", "/api/finance/bank-classifications", "bankClassificationListResponse"),
  route("bankClassificationOptionsRead", "GET", "/api/finance/bank-classification-options", "bankClassificationOptionsResponse"),
  route("bankImportsCreate", "POST", "/api/finance/bank-imports", "handleFinanceBankImport"),
  route("bankClassificationsAuto", "POST", "/api/finance/bank-classifications/auto", "handleFinanceBankClassificationAuto"),
  route("bankClassificationsReview", "POST", "/api/finance/bank-classifications/review", "handleFinanceBankClassificationReview"),
  route("timeEntriesRead", "GET", "/api/finance/time-entries", "listResponse", {
    action: "finance:time:read",
    resourceType: "time_entry",
    modelType: "TimeEntry",
  }),
  route("timeEntriesCreate", "POST", "/api/finance/time-entries", "handleFinanceTimeEntryCreate"),
  route("timeEntriesApprove", "POST", "/api/finance/time-entries/approve", "handleFinanceTimeEntryApprove"),
  route("expensesRead", "GET", "/api/finance/expenses", "listResponse", {
    action: "finance:expense:read",
    resourceType: "expense",
    modelType: "Expense",
  }),
  route("expensesCreate", "POST", "/api/finance/expenses", "handleFinanceExpenseCreate"),
  route("disbursementsRead", "GET", "/api/finance/disbursements", "listResponse", {
    action: "finance:disbursement:read",
    resourceType: "disbursement",
    modelType: "Disbursement",
  }),
  route("disbursementsCreate", "POST", "/api/finance/disbursements", "handleFinanceDisbursementCreate"),
  route("feeArrangementsRead", "GET", "/api/finance/fee-arrangements", "listResponse", {
    action: "finance:fee_arrangement:read",
    resourceType: "fee_arrangement",
    modelType: "FeeArrangement",
  }),
  route("feeArrangementsCreate", "POST", "/api/finance/fee-arrangements", "handleFinanceFeeArrangementCreate"),
  route("wipGenerate", "POST", "/api/finance/wip", "handleFinanceWipGenerate"),
  route("wipSnapshotLock", "POST", "/api/finance/wip-snapshots", "handleFinanceWipSnapshotLock"),
  route("prebillsRead", "GET", "/api/finance/prebills", "listResponse", {
    action: "finance:prebill:read",
    resourceType: "prebill",
    modelType: "PreBill",
  }),
  route("prebillsCreate", "POST", "/api/finance/prebills", "handleFinancePreBillCreate"),
  route("prebillsApprove", "POST", "/api/finance/prebills/approve", "handleFinancePreBillApprove"),
  route("prebillsReject", "POST", "/api/finance/prebills/reject", "handleFinancePreBillReject"),
  route("invoicesRead", "GET", "/api/finance/invoices", "listResponse", {
    action: "finance:invoice:read",
    resourceType: "invoice",
    modelType: "Invoice",
  }),
  route("invoicesIssue", "POST", "/api/finance/invoices", "handleFinanceInvoiceIssue"),
  route("paymentsRead", "GET", "/api/finance/payments", "listResponse", {
    action: "finance:payment:read",
    resourceType: "payment",
    modelType: "Payment",
  }),
  route("paymentsImport", "POST", "/api/finance/payments", "handleFinancePaymentImport"),
  route("paymentAllocationsRead", "GET", "/api/finance/payment-allocations", "listResponse", {
    action: "finance:payment_allocation:read",
    resourceType: "payment_allocation",
    modelType: "PaymentAllocation",
  }),
  route("paymentAllocationsCreate", "POST", "/api/finance/payment-allocations", "handleFinancePaymentAllocationCreate"),
  route("paymentMatchesRead", "GET", "/api/finance/payment-matches", "listResponse", {
    action: "finance:payment_match:read",
    resourceType: "payment_match",
    modelType: "PaymentMatch",
  }),
  route("paymentMatchesCreate", "POST", "/api/finance/payment-matches", "handleFinancePaymentMatchCreate"),
  route("arAgingRead", "GET", "/api/finance/ar-aging", "handleFinanceArAging"),
  route("accountingExportRead", "GET", "/api/finance/accounting-export.csv", "handleFinanceAccountingExportCsv"),
  route("trustBalancesRead", "GET", "/api/finance/trust-balances", "handleFinanceTrustBalances"),
  route("trustDepositsCreate", "POST", "/api/finance/trust-deposits", "handleFinanceTrustDepositCreate"),
  route("trustDrawdownsCreate", "POST", "/api/finance/trust-drawdowns", "handleFinanceTrustDrawdownCreate"),
  route("trustRefundsCreate", "POST", "/api/finance/trust-refunds", "handleFinanceTrustRefundCreate"),
  route("auditRead", "GET", "/api/finance/audit", "handleFinanceAudit"),
]);

function validateFinanceRouteCatalog(catalog = FINANCE_RUNTIME_ROUTE_CATALOG) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new TypeError("Finance route catalog must be a non-empty array");
  }
  const ids = new Set();
  const routes = new Set();
  for (const entry of catalog) {
    if (!entry || typeof entry !== "object") throw new TypeError("Finance route definition must be an object");
    if (typeof entry.id !== "string" || !entry.id) throw new TypeError("Finance route definition id is required");
    if (ids.has(entry.id)) throw new TypeError(`Finance route definition id is duplicated: ${entry.id}`);
    ids.add(entry.id);
    if (!FINANCE_ROUTE_METHODS.includes(entry.method)) {
      throw new TypeError(`Finance route definition method is invalid: ${entry.id}`);
    }
    if (typeof entry.path !== "string" || !entry.path.startsWith(FINANCE_API_BASE_PATH) || entry.path.endsWith("/")) {
      throw new TypeError(`Finance route definition path is invalid: ${entry.id}`);
    }
    const routeKey = `${entry.method} ${entry.path}`;
    if (routes.has(routeKey)) throw new TypeError(`Finance route definition route is duplicated: ${routeKey}`);
    routes.add(routeKey);
    if (typeof entry.handler !== "string" && typeof entry.handler !== "function") {
      throw new TypeError(`Finance route definition handler is required: ${entry.id}`);
    }
    if (entry.options !== undefined && (!entry.options || typeof entry.options !== "object" || Array.isArray(entry.options))) {
      throw new TypeError(`Finance route definition options are invalid: ${entry.id}`);
    }
  }
  return Object.freeze({ valid: true, route_count: catalog.length, endpoint_count: catalog.length });
}

validateFinanceRouteCatalog();

function handlerFor(entry, handlers) {
  if (typeof entry.handler === "function") return entry.handler;
  const handler = handlers instanceof Map ? handlers.get(entry.handler) : handlers?.[entry.handler];
  if (typeof handler !== "function") {
    throw new TypeError(`Finance route handler is not callable: ${entry.handler}`);
  }
  return handler;
}

/**
 * Compose the immutable method/path catalog with runtime handlers. The
 * dispatcher intentionally does not catch handler errors: callers retain the
 * existing async rejection behavior and the server's established mapper.
 */
export function createFinanceRuntimeRouter(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Finance router options must be an object");
  }
  const catalog = options.catalog ?? FINANCE_RUNTIME_ROUTE_CATALOG;
  const routeHandlers = options.handlers ?? {};
  validateFinanceRouteCatalog(catalog);
  const compiled = catalog.map((entry) => Object.freeze({
    id: entry.id,
    method: entry.method,
    path: entry.path,
    options: entry.options === undefined ? undefined : Object.freeze({ ...entry.options }),
    handler: handlerFor(entry, routeHandlers),
  }));
  const routeMap = new Map(compiled.map((entry) => [`${entry.method} ${entry.path}`, entry]));
  const missingRoute = typeof options.notFound === "function" ? options.notFound : () => null;
  return async function dispatchFinanceRoute(request = {}) {
    const routeKey = typeof request.method === "string" && typeof request.pathname === "string"
      ? `${request.method} ${request.pathname}`
      : null;
    const entry = routeKey === null ? undefined : routeMap.get(routeKey);
    if (!entry) return missingRoute(request);
    return await entry.handler(request, entry.options);
  };
}
