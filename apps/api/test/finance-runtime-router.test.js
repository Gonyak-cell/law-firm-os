import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCE_RUNTIME_ROUTE_CATALOG,
  createFinanceRuntimeRouter,
} from "../src/finance-runtime-router.js";
import { handleFinanceApiRequest } from "../src/finance-runtime-context.js";

const goldenRoute = (method, path, handler) => Object.freeze({ method, path, handler });
const GOLDEN_FINANCE_ROUTES = Object.freeze([
  goldenRoute("GET", "/api/finance/bank-transactions", "bankTransactionListResponse"),
  goldenRoute("GET", "/api/finance/bank-classifications", "bankClassificationListResponse"),
  goldenRoute("GET", "/api/finance/bank-classification-options", "bankClassificationOptionsResponse"),
  goldenRoute("POST", "/api/finance/bank-imports", "handleFinanceBankImport"),
  goldenRoute("POST", "/api/finance/bank-classifications/auto", "handleFinanceBankClassificationAuto"),
  goldenRoute("POST", "/api/finance/bank-classifications/review", "handleFinanceBankClassificationReview"),
  goldenRoute("GET", "/api/finance/time-entries", "listResponse"),
  goldenRoute("POST", "/api/finance/time-entries", "handleFinanceTimeEntryCreate"),
  goldenRoute("POST", "/api/finance/time-entries/approve", "handleFinanceTimeEntryApprove"),
  goldenRoute("GET", "/api/finance/expenses", "listResponse"),
  goldenRoute("POST", "/api/finance/expenses", "handleFinanceExpenseCreate"),
  goldenRoute("GET", "/api/finance/disbursements", "listResponse"),
  goldenRoute("POST", "/api/finance/disbursements", "handleFinanceDisbursementCreate"),
  goldenRoute("GET", "/api/finance/fee-arrangements", "listResponse"),
  goldenRoute("POST", "/api/finance/fee-arrangements", "handleFinanceFeeArrangementCreate"),
  goldenRoute("POST", "/api/finance/wip", "handleFinanceWipGenerate"),
  goldenRoute("POST", "/api/finance/wip-snapshots", "handleFinanceWipSnapshotLock"),
  goldenRoute("GET", "/api/finance/prebills", "listResponse"),
  goldenRoute("POST", "/api/finance/prebills", "handleFinancePreBillCreate"),
  goldenRoute("POST", "/api/finance/prebills/approve", "handleFinancePreBillApprove"),
  goldenRoute("POST", "/api/finance/prebills/reject", "handleFinancePreBillReject"),
  goldenRoute("GET", "/api/finance/invoices", "listResponse"),
  goldenRoute("POST", "/api/finance/invoices", "handleFinanceInvoiceIssue"),
  goldenRoute("GET", "/api/finance/payments", "listResponse"),
  goldenRoute("POST", "/api/finance/payments", "handleFinancePaymentImport"),
  goldenRoute("GET", "/api/finance/payment-allocations", "listResponse"),
  goldenRoute("POST", "/api/finance/payment-allocations", "handleFinancePaymentAllocationCreate"),
  goldenRoute("GET", "/api/finance/payment-matches", "listResponse"),
  goldenRoute("POST", "/api/finance/payment-matches", "handleFinancePaymentMatchCreate"),
  goldenRoute("GET", "/api/finance/ar-aging", "handleFinanceArAging"),
  goldenRoute("GET", "/api/finance/accounting-export.csv", "handleFinanceAccountingExportCsv"),
  goldenRoute("GET", "/api/finance/trust-balances", "handleFinanceTrustBalances"),
  goldenRoute("POST", "/api/finance/trust-deposits", "handleFinanceTrustDepositCreate"),
  goldenRoute("POST", "/api/finance/trust-drawdowns", "handleFinanceTrustDrawdownCreate"),
  goldenRoute("POST", "/api/finance/trust-refunds", "handleFinanceTrustRefundCreate"),
  goldenRoute("GET", "/api/finance/audit", "handleFinanceAudit"),
]);

test("RFD-TUW-034 catalog dispatches every Finance method/path exactly once", async () => {
  assert.equal(GOLDEN_FINANCE_ROUTES.length, 36);
  assert.deepEqual(
    FINANCE_RUNTIME_ROUTE_CATALOG.map(({ method, path, handler }) => `${method} ${path} -> ${handler}`),
    GOLDEN_FINANCE_ROUTES.map(({ method, path, handler }) => `${method} ${path} -> ${handler}`),
  );
  assert.ok(Object.isFrozen(FINANCE_RUNTIME_ROUTE_CATALOG));
  assert.ok(FINANCE_RUNTIME_ROUTE_CATALOG.every((entry) => {
    assert.ok(Object.isFrozen(entry));
    if (entry.options !== undefined) assert.ok(Object.isFrozen(entry.options));
    return true;
  }));

  const calls = [];
  const handlers = Object.fromEntries(
    [...new Set(GOLDEN_FINANCE_ROUTES.map(({ handler }) => handler))]
      .map((handlerName) => [handlerName, async (request, options) => {
        calls.push({ handlerName, request, options });
        return {
          status: 200,
          body: {
            handlerName,
            forwarded: {
              pathname: request.pathname,
              method: request.method,
              query: request.query,
              body: request.body,
              context: request.context,
              runtime: request.runtime,
            },
            options,
          },
        };
      }]),
  );
  const router = createFinanceRuntimeRouter({
    handlers,
    notFound: ({ pathname, method }) => ({ status: 404, body: { pathname, method } }),
  });

  const query = Object.freeze({ tenant_id: "tenant_rfd_tuw_034", audit_hint_ref: "audit_rfd_tuw_034" });
  const body = Object.freeze({ tenant_id: query.tenant_id, payload: "forwarded" });
  const context = Object.freeze({ principal: Object.freeze({ user_id: "user_rfd_tuw_034" }) });
  const runtime = Object.freeze({ repository: Object.freeze({ marker: "runtime-forwarded" }) });
  for (const [index, route] of GOLDEN_FINANCE_ROUTES.entries()) {
    const response = await router({
      pathname: route.path,
      method: route.method,
      query,
      body,
      context,
      runtime,
      requestId: `request-${index}`,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.handlerName, route.handler);
    assert.strictEqual(response.body.forwarded.pathname, route.path);
    assert.strictEqual(response.body.forwarded.method, route.method);
    assert.strictEqual(response.body.forwarded.query, query);
    assert.strictEqual(response.body.forwarded.body, body);
    assert.strictEqual(response.body.forwarded.context, context);
    assert.strictEqual(response.body.forwarded.runtime, runtime);
  }
  assert.equal(calls.length, GOLDEN_FINANCE_ROUTES.length);
  assert.deepEqual(calls.map(({ handlerName }) => handlerName), GOLDEN_FINANCE_ROUTES.map(({ handler }) => handler));
});

test("RFD-TUW-034 rejects duplicate definitions and preserves wrong method/path 404 behavior", async () => {
  assert.throws(() => createFinanceRuntimeRouter(GOLDEN_FINANCE_ROUTES), /options must be an object/);
  const duplicate = [
    ...FINANCE_RUNTIME_ROUTE_CATALOG,
    { ...FINANCE_RUNTIME_ROUTE_CATALOG[0], id: "duplicate-route" },
  ];
  assert.throws(() => createFinanceRuntimeRouter({ catalog: duplicate, handlers: {} }), /route definition route is duplicated/);

  let duplicateIdRouter;
  const duplicateIdCatalog = [
    { ...FINANCE_RUNTIME_ROUTE_CATALOG[0], id: "duplicate-id" },
    { ...FINANCE_RUNTIME_ROUTE_CATALOG[1], id: "duplicate-id" },
  ];
  assert.throws(() => {
    duplicateIdRouter = createFinanceRuntimeRouter({
      catalog: duplicateIdCatalog,
      handlers: {
        bankTransactionListResponse: () => ({ status: 200 }),
        bankClassificationListResponse: () => ({ status: 200 }),
      },
    });
  }, /route definition id is duplicated/);
  assert.equal(duplicateIdRouter, undefined);

  const response = await handleFinanceApiRequest({
    pathname: "/api/finance/time-entries",
    method: "PATCH",
    query: {
      tenant_id: "tenant_rfd_tuw_034",
      permission_ref: "permission_rfd_tuw_034",
      audit_hint_ref: "audit_rfd_tuw_034_missing",
    },
    requestId: "request-rfd-tuw-034-missing",
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.safe_error_codes, ["FINANCE_NOT_FOUND"]);
  assert.equal(response.body.audit_hint_ref, "audit_rfd_tuw_034_missing");

  const unknownPath = await handleFinanceApiRequest({
    pathname: "/api/finance/no-such-route",
    method: "GET",
    query: {
      tenant_id: "tenant_rfd_tuw_034",
      permission_ref: "permission_rfd_tuw_034",
      audit_hint_ref: "audit_rfd_tuw_034_unknown",
    },
    requestId: "request-rfd-tuw-034-unknown",
  });
  assert.equal(unknownPath.status, 404);
  assert.deepEqual(unknownPath.body.safe_error_codes, ["FINANCE_NOT_FOUND"]);

  for (const [pathname, method, suffix] of [
    [Symbol("finance-path"), "GET", "symbol-path"],
    ["/api/finance/time-entries", Symbol("finance-method"), "symbol-method"],
    [null, "GET", "null-path"],
    ["/api/finance/time-entries", null, "null-method"],
    [{ toString: () => { throw new Error("path coercion must not run"); } }, "GET", "object-path"],
    ["/api/finance/time-entries", { toString: () => { throw new Error("method coercion must not run"); } }, "object-method"],
  ]) {
    const wrongType = await handleFinanceApiRequest({
      pathname,
      method,
      query: {
        tenant_id: "tenant_rfd_tuw_034",
        permission_ref: "permission_rfd_tuw_034",
        audit_hint_ref: `audit_rfd_tuw_034_${suffix}`,
      },
      requestId: `request-rfd-tuw-034-${suffix}`,
    });
    assert.equal(wrongType.status, 404);
    assert.deepEqual(wrongType.body.safe_error_codes, ["FINANCE_NOT_FOUND"]);
    assert.equal(wrongType.body.audit_hint_ref, `audit_rfd_tuw_034_${suffix}`);
  }
});

test("RFD-TUW-034 compatibility shim retains the default runtime for read handlers", async () => {
  const query = {
    tenant_id: "tenant_cmp_g7_synthetic",
    permission_ref: "permission_rfd_tuw_034_default_runtime",
    audit_hint_ref: "audit_rfd_tuw_034_default_runtime",
  };
  const context = {
    principal: {
      user_id: "user_rfd_tuw_034_default_runtime",
      tenant_id: query.tenant_id,
      role_ids: ["finance_user"],
      scopes: ["finance.time.write", "finance.bank.read"],
    },
    rules: [{ id: "allow_default_runtime_reads", effect: "allow", action: "*" }],
    object_acl: [],
  };
  const timeEntries = await handleFinanceApiRequest({
    pathname: "/api/finance/time-entries",
    method: "GET",
    query,
    context,
    requestId: "request-rfd-tuw-034-default-time",
  });
  assert.equal(timeEntries.status, 200);
  assert.equal(timeEntries.body.outcome, "passed");
  assert.deepEqual(timeEntries.body.safe_error_codes, []);
  assert.equal(timeEntries.body.audit_hint_ref, query.audit_hint_ref);
  assert.ok(Array.isArray(timeEntries.body.items));

  const bankTransactions = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-transactions",
    method: "GET",
    query,
    context,
    requestId: "request-rfd-tuw-034-default-bank",
  });
  assert.equal(bankTransactions.status, 200);
  assert.equal(bankTransactions.body.outcome, "passed");
  assert.deepEqual(bankTransactions.body.safe_error_codes, []);
  assert.equal(bankTransactions.body.audit_hint_ref, query.audit_hint_ref);
  assert.ok(Array.isArray(bankTransactions.body.items));
});

test("RFD-TUW-034 leaves handler rejections observable to the async caller", async () => {
  const router = createFinanceRuntimeRouter({
    catalog: [{
      id: "rejecting",
      method: "GET",
      path: "/api/finance/rejecting",
      handler: "rejecting",
    }],
    handlers: {
      rejecting: async () => {
        throw Object.assign(new Error("internal handler detail"), { code: "RFD034_HANDLER_REJECTED" });
      },
    },
  });
  await assert.rejects(
    router({ pathname: "/api/finance/rejecting", method: "GET" }),
    { code: "RFD034_HANDLER_REJECTED" },
  );
});
