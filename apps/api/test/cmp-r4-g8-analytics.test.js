import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { findRegisteredAccountByUserId } from "../src/matter-vault-account-registry.js";
import { resolveLawosUserRoleAssignment } from "../src/lawos-role-registry.js";
import { createAnalyticsRuntimeContext } from "../src/analytics-runtime-context.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g8_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g8_read&audit_hint_ref=audit_hint_cmp_g8_read`;
const SUPER_ADMIN_ACCOUNT = findRegisteredAccountByUserId("user_amic_jwsuh");
const STAFF_ACCOUNT = findRegisteredAccountByUserId("user_amic_sypark");
assert.ok(SUPER_ADMIN_ACCOUNT);
assert.ok(STAFF_ACCOUNT);

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g8_analytics", tenant_id: TENANT, role_ids: ["analytics_user"] },
    rules: [{ id: `rule_analytics_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

function listRepository(records) {
  return {
    list(query = {}) {
      return records.filter((record) =>
        (!query.tenant_id || record.tenant_id === query.tenant_id) &&
        (!query.model_type || record.model_type === query.model_type)
      );
    },
  };
}

function financeReadModelRuntime() {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Invoice", invoice_id: "api-fin-invoice", tenant_id: TENANT, matter_id: "api-fin-matter", billing_client_party_id: "api-fin-party", amount_due: 1000, currency: "KRW", issued_at: "2026-07-01", status: "issued" },
      { model_type: "BillingAdjustment", adjustment_id: "api-fin-credit", tenant_id: TENANT, invoice_id: "api-fin-invoice", adjustment_amount: 100, adjustment_type: "credit", adjusted_at: "2026-07-02", status: "approved" },
      { model_type: "Payment", payment_id: "api-fin-payment", tenant_id: TENANT, matter_id: "api-fin-matter", amount: 700, currency: "KRW", received_at: "2026-07-03", status: "received" },
      { model_type: "PaymentMatch", payment_match_id: "api-fin-match", tenant_id: TENANT, payment_id: "api-fin-payment", invoice_id: "api-fin-invoice", matched_amount: 400, currency: "KRW", matched_at: "2026-07-04", status: "matched" },
      { model_type: "Expense", expense_id: "api-fin-expense", tenant_id: TENANT, matter_id: "api-fin-matter", amount: 200, currency: "KRW", expense_date: "2026-07-05", approved_for_wip: true, status: "approved" },
      { model_type: "Disbursement", disbursement_id: "api-fin-unlinked", tenant_id: TENANT, matter_id: "api-fin-unlinked-matter", amount: 50, currency: "KRW", disbursed_at: "2026-07-06", recoverable: true, status: "approved" },
      { model_type: "BankImportBatch", bank_import_batch_id: "api-bank-batch", tenant_id: TENANT, source_manifest_hash: "a".repeat(64), account_ref: "api-bank-account", transaction_count: 2, status: "reconciled" },
      { model_type: "BankTransaction", bank_transaction_id: "api-bank-in", bank_import_batch_id: "api-bank-batch", tenant_id: TENANT, account_ref: "api-bank-account", transaction_fingerprint: "b".repeat(64), date: "2026-07-27", occurred_at: "2026-07-27T13:38:19+09:00", direction: "inflow", amount: 30000000, balance_after: 63909212, currency: "KRW", classification_state: "unreviewed" },
      { model_type: "BankTransaction", bank_transaction_id: "api-bank-out", bank_import_batch_id: "api-bank-batch", tenant_id: TENANT, account_ref: "api-bank-account", transaction_fingerprint: "c".repeat(64), date: "2026-07-28", occurred_at: "2026-07-28T14:50:03+09:00", direction: "outflow", amount: 280000, balance_after: 29153222, currency: "KRW", classification_state: "unreviewed" },
      { model_type: "BankTransactionClassification", bank_transaction_classification_id: "api-bank-classification-in", tenant_id: TENANT, bank_transaction_id: "api-bank-in", account_ref: "api-bank-account", transaction_date: "2026-07-27", transaction_month: "2026-07", transaction_direction: "inflow", amount: 30000000, currency: "KRW", primary_type: "sales", category: "client_receipt", client_group_id: "api-fin-client", status: "confirmed" },
      { model_type: "BankTransactionClassification", bank_transaction_classification_id: "api-bank-classification-out", tenant_id: TENANT, bank_transaction_id: "api-bank-out", account_ref: "api-bank-account", transaction_date: "2026-07-28", transaction_month: "2026-07", transaction_direction: "outflow", amount: 280000, currency: "KRW", primary_type: "payroll", category: "salary_payment", payroll_category: "staff", employee_id: "api-employee-private", status: "confirmed" },
    ],
  });
  return createAnalyticsRuntimeContext({
    repository: createAnalyticsRepository(),
    financeRepository,
    masterDataRepository: listRepository([
      { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "api-fin-client", display_name: "API 고객" },
      { model_type: "BillingProfile", tenant_id: TENANT, billing_profile_id: "api-fin-profile", client_group_id: "api-fin-client", billing_client_party_id: "api-fin-party" },
    ]),
    matterRepository: listRepository([
      { model_type: "Matter", tenant_id: TENANT, matter_id: "api-fin-matter", billing_client_party_id: "api-fin-party" },
      { model_type: "Matter", tenant_id: TENANT, matter_id: "api-fin-unlinked-matter" },
    ]),
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

const sessionHeaderCache = new Map();

async function signedHeaders(baseUrl, account = null) {
  const key = `${baseUrl}:${account?.user_id ?? "default"}`;
  if (!sessionHeaderCache.has(key)) sessionHeaderCache.set(key, await apiSessionHeaders(baseUrl, account ?? undefined));
  return sessionHeaderCache.get(key);
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await signedHeaders(baseUrl, options.account)),
    ...(options.headers ?? {}),
  };
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[key];
  }
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

test("G8 Analytics API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const analytics = body.bounded_contexts.find((item) => item.bounded_context === "analytics");
    assert.equal(status, 200);
    assert.equal(analytics.runtime_write_ready, true);
    assert.equal(analytics.r5_r6_owner_decision_ready, true);
    assert.equal(analytics.production_ready_claim, false);
  });
});

test("G8 dashboard API is permission gated and omits raw matter detail", async () => {
  await withServer(async (baseUrl) => {
    const refresh = await json(baseUrl, "/api/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-refresh-g8-list",
      }),
    });
    assert.equal(refresh.status, 201);
    const dashboards = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`);
    assert.equal(dashboards.status, 200);
    assert.equal(dashboards.body.items.length, 5);
    const rows = Object.fromEntries(dashboards.body.items.map((item) => [item.dashboard_id, item]));
    assert.equal(rows["dashboard-realization"].metric_value, 87.5);
    assert.equal(rows["dashboard-employee-utilization"].metric_value, 75);
    assert.equal(dashboards.body.items[0].raw_matter_detail_included, false);
    assert.equal(dashboards.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`, {
      noAuth: true,
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext() },
    });
    assert.equal(denied.status, 401);
    assert.ok(denied.body.safe_error_codes.includes("AUTH_SESSION_REQUIRED"));
  });
});

test("WP-FIN-2 finance read APIs reconcile overview, monthly, clients, and unlinked amounts", async () => {
  await withServer(async (baseUrl) => {
    const query = `${BASE_QUERY}&from=2026-07-01&to=2026-07-31`;
    const overview = await json(baseUrl, `/api/analytics/finance/overview?${query}`);
    const monthly = await json(baseUrl, `/api/analytics/finance/monthly?${query}`);
    const clients = await json(baseUrl, `/api/analytics/finance/clients?${query}`);

    assert.equal(overview.status, 200);
    assert.equal(monthly.status, 200);
    assert.equal(clients.status, 200);
    const total = overview.body.item.totals.find((row) => row.currency === "KRW");
    const month = monthly.body.items.find((row) => row.month === "2026-07" && row.currency === "KRW");
    const client = clients.body.items.find((row) => row.client_group_id === "api-fin-client");
    const unlinked = clients.body.items.find((row) => row.client_group_id === null);
    assert.deepEqual(
      { billed: total.billed_amount, collected: total.collected_amount, cost: total.matter_cost },
      { billed: 900, collected: 400, cost: 250 },
    );
    assert.equal(month.billed_amount, total.billed_amount);
    assert.equal(month.collected_amount, total.collected_amount);
    assert.equal(client.billed_amount + unlinked.billed_amount, total.billed_amount);
    assert.equal(client.matter_cost + unlinked.matter_cost, total.matter_cost);
    assert.equal(unlinked.matter_cost, 50);
    assert.equal(overview.body.raw_source_payload_included, false);
    assert.equal(overview.body.credential_material_included, false);
    assert.equal(overview.body.journal_lines_included, false);
    assert.equal(overview.body.production_ready_claim, false);
  }, { analyticsRuntime: financeReadModelRuntime() });
});

test("AMIC cashflow aggregate is available to jwsuh super-admin and omitted for ordinary staff", async () => {
  const assignment = resolveLawosUserRoleAssignment(SUPER_ADMIN_ACCOUNT, { tenantId: TENANT });
  assert.equal(assignment.role_ids.includes("system_super_admin"), true);
  assert.equal(assignment.scopes.includes("analytics.finance.read"), true);
  assert.equal(assignment.scopes.includes("finance.bank.read"), true);
  assert.equal(assignment.scopes.includes("finance.bank.import"), true);

  await withServer(async (baseUrl) => {
    const query = `${BASE_QUERY}&from=2026-07-01&to=2026-07-31`;
    const allowed = await json(baseUrl, `/api/analytics/finance/cashflow?${query}`, { account: SUPER_ADMIN_ACCOUNT });
    assert.equal(allowed.status, 200);
    assert.deepEqual(allowed.body.item.summary, {
      currency: "KRW",
      current_balance: 29153222,
      total_inflow: 30000000,
      total_outflow: 280000,
      net_movement: 29720000,
      transaction_count: 2,
      account_count: 1,
      classification_review_count: 0,
      zero_amount_source_count: 0,
      basis_at: "2026-07-28T14:50:03+09:00",
    });
    assert.deepEqual(allowed.body.item.business_summary, {
      currency: "KRW",
      sales_amount: 30000000,
      operating_expense_amount: 0,
      payroll_payment_amount: 280000,
      non_operating_amount: 0,
      classified_count: 2,
      unclassified_count: 0,
      review_count: 0,
      coverage_percent: 100,
      status: "passed",
      invoice_required: false,
      matter_required: false,
      individual_payroll_values_included: false,
    });
    assert.deepEqual(allowed.body.item.non_payroll_outflow_categories, []);
    assert.equal(JSON.stringify(allowed.body.item).includes("api-employee-private"), false);
    assert.equal(allowed.body.counterparty_values_included, false);
    assert.equal(allowed.body.raw_source_payload_included, false);

    const denied = await json(baseUrl, `/api/analytics/finance/cashflow?${query}`, { account: STAFF_ACCOUNT });
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.items, []);
    assert.equal(denied.body.item, undefined);
    assert.equal(denied.body.count_leak_prevented, true);
  }, { analyticsRuntime: financeReadModelRuntime() });
});

test("WP-FIN-2 finance read APIs fail closed without count leakage", async () => {
  await withServer(async (baseUrl) => {
    const missingTenant = await json(baseUrl, "/api/analytics/finance/overview?permission_ref=perm&audit_hint_ref=audit");
    assert.equal(missingTenant.status, 400);
    assert.equal(missingTenant.body.count_leak_prevented, true);
  }, { analyticsRuntime: financeReadModelRuntime() });

  const deniedSessionAuth = {
    resolvePermissionContextFromHeaders() {
      const context = JSON.parse(permissionContext("deny"));
      return { ok: true, principal: context.principal, context };
    },
  };
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/api/analytics/finance/overview?${BASE_QUERY}`, {
      noAuth: true,
      headers: { authorization: "Bearer test-denied-session" },
    });
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.items, []);
    assert.equal(denied.body.count_leak_prevented, true);
    assert.equal(denied.body.page_info, undefined);
  }, { analyticsRuntime: financeReadModelRuntime(), sessionAuth: deniedSessionAuth });
});

test("WP-FIN-5 finance analytics require an explicit signed-session scope and audit denial", async () => {
  const runtime = financeReadModelRuntime();
  const staff = findRegisteredAccountByUserId("user_amic_sypark");
  assert.ok(staff);
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/api/analytics/finance/overview?${BASE_QUERY}`, { account: staff });
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.items, []);
    assert.equal(denied.body.count_leak_prevented, true);
    const audit = runtime.repository.listAudit({ tenant_id: TENANT });
    assert.equal(audit.at(-1).decision, "deny");
    assert.equal(audit.at(-1).reason, "finance_scope_required:analytics.finance.read");
    assert.equal(audit.at(-1).metadata.raw_payload_included, false);
  }, { analyticsRuntime: runtime });
});

test("G8 dashboard refresh derives metrics from live finance repository writes", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate-api-g8-b08",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 200000 }],
        status: "active",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time-api-g8-b08",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        actor_id: "user_cmp_g8_analytics",
        role_id: "partner",
        duration_minutes: 60,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-api-g8-b08",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        amount_due: 800000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "ARBalance",
        ar_balance_id: "ar-api-g8-b08",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        invoice_id: "invoice-api-g8-b08",
        balance: 800000,
        status: "open",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const payment = await json(baseUrl, "/api/finance/payments", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_finance_write",
        audit_hint_ref: "audit_hint_cmp_g8_finance_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-finance-payment-g8-b08",
        payment: {
          payment_id: "payment-api-g8-b08",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          bank_reference: "bank-api-g8-b08",
          amount: 200000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(payment.status, 201);

    const refresh = await json(baseUrl, "/api/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-refresh-g8-finance-derived",
      }),
    });
    assert.equal(refresh.status, 201);
    const dashboards = Object.fromEntries(refresh.body.items.map((item) => [item.dashboard_id, item]));
    assert.equal(dashboards["dashboard-ar-aging"].metric_value, 800000);
    assert.equal(dashboards["dashboard-client-health"].metric_value, 25);
    assert.equal(dashboards["dashboard-practice-pnl"].metric_value, 600000);
    assert.equal(dashboards["dashboard-ar-aging"].metric_source, "finance_repository");
    assert.equal(dashboards["dashboard-ar-aging"].source_payload_included, false);

    const profitability = await json(baseUrl, "/api/analytics/matter-profitability", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-profit-g8-bodyless",
        matter_id: "matter_rp05_synthetic_opening",
      }),
    });
    assert.equal(profitability.status, 201);
    assert.equal(profitability.body.item.standard_value, 200000);
    assert.equal(profitability.body.item.billed_value, 800000);
    assert.equal(profitability.body.item.collected_value, 200000);
    assert.equal(profitability.body.item.profitability_amount, 0);
    assert.equal(profitability.body.item.source_payload_included, false);
  }, { financeRepository });
});

test("G8 analytics metric routes reject caller-supplied source payloads", async () => {
  await withServer(async (baseUrl) => {
    const attempts = [
      {
        path: "/api/analytics/matter-profitability",
        body: {
          matter_id: "matter_rp05_synthetic_opening",
          time_entries: [{ standard_value: 999999 }],
          invoices: [{ amount_due: 999999 }],
          payments: [{ amount: 999999 }],
        },
      },
      {
        path: "/api/analytics/realization",
        body: {
          matter_id: "matter_rp05_synthetic_opening",
          standard_value: 999999,
          billed_value: 999999,
        },
      },
      {
        path: "/api/analytics/utilization",
        body: {
          employee_id: "employee_api_g8_payload",
          period_id: "2026-07",
          time_entries: [{ duration_minutes: 999999 }],
        },
      },
      {
        path: "/api/analytics/client-profitability",
        body: {
          client_group_id: "client_group_api_g8_payload",
          matter_rows: [{ profitability_amount: 999999 }],
        },
      },
    ];

    for (const [index, attempt] of attempts.entries()) {
      const response = await json(baseUrl, attempt.path, {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g8_write",
          audit_hint_ref: "audit_hint_cmp_g8_write",
          actor_id: "user_cmp_g8_analytics",
          idempotency_key: `api-g8-caller-payload-${index}`,
          ...attempt.body,
        }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(response.body.safe_error_codes, ["ANALYTICS_CALLER_SOURCE_PAYLOAD_REJECTED"]);
      assert.equal(response.body.count_leak_prevented, true);
    }
  });
});

test("G8 client profitability returns different aggregates for different client groups", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "TimeEntry",
        time_entry_id: "time-api-g8-b09-one",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_one",
        client_group_id: "client_group_api_g8_b09_one",
        actor_id: "user_cmp_g8_analytics",
        duration_minutes: 60,
        standard_value: 100000,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-api-g8-b09-one",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_one",
        client_group_id: "client_group_api_g8_b09_one",
        amount_due: 350000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-api-g8-b09-one",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_one",
        client_group_id: "client_group_api_g8_b09_one",
        bank_reference: "bank-api-g8-b09-one",
        amount: 300000,
        currency: "KRW",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time-api-g8-b09-two",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_two",
        client_group_id: "client_group_api_g8_b09_two",
        actor_id: "user_cmp_g8_analytics",
        duration_minutes: 60,
        standard_value: 250000,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-api-g8-b09-two",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_two",
        client_group_id: "client_group_api_g8_b09_two",
        amount_due: 250000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-api-g8-b09-two",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b09_two",
        client_group_id: "client_group_api_g8_b09_two",
        bank_reference: "bank-api-g8-b09-two",
        amount: 100000,
        currency: "KRW",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    for (const matter_id of ["matter_api_g8_b09_one", "matter_api_g8_b09_two"]) {
      const profitability = await json(baseUrl, "/api/analytics/matter-profitability", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g8_write",
          audit_hint_ref: "audit_hint_cmp_g8_write",
          actor_id: "user_cmp_g8_analytics",
          idempotency_key: `api-profit-g8-b09-${matter_id}`,
          matter_id,
        }),
      });
      assert.equal(profitability.status, 201);
      assert.equal(profitability.body.item.client_group_id, `client_group_api_g8_b09_${matter_id.endsWith("one") ? "one" : "two"}`);
    }

    const clientOne = await json(baseUrl, "/api/analytics/client-profitability", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-client-profit-g8-b09-one",
        client_group_id: "client_group_api_g8_b09_one",
      }),
    });
    const clientTwo = await json(baseUrl, "/api/analytics/client-profitability", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-client-profit-g8-b09-two",
        client_group_id: "client_group_api_g8_b09_two",
      }),
    });

    assert.equal(clientOne.status, 201);
    assert.equal(clientOne.body.item.matter_count, 1);
    assert.equal(clientOne.body.item.profitability_amount, 200000);
    assert.equal(clientTwo.status, 201);
    assert.equal(clientTwo.body.item.matter_count, 1);
    assert.equal(clientTwo.body.item.profitability_amount, -150000);
    assert.notEqual(clientOne.body.item.profitability_amount, clientTwo.body.item.profitability_amount);
    assert.equal(clientOne.body.item.matter_level_rows_included, false);
  }, { financeRepository });
});

test("G8 KPI routes create realization and utilization dashboard projections", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate-api-g8-b15",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
        status: "active",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time-api-g8-b15",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b15",
        employee_id: "employee_api_g8_b15",
        actor_id: "employee_api_g8_b15",
        role_id: "partner",
        period_id: "2026-07",
        duration_minutes: 120,
        capacity_hours: 40,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-api-g8-b15",
        tenant_id: TENANT,
        matter_id: "matter_api_g8_b15",
        amount_due: 150000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const realization = await json(baseUrl, "/api/analytics/realization", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-realization-g8-b15",
        matter_id: "matter_api_g8_b15",
      }),
    });
    assert.equal(realization.status, 201);
    assert.equal(realization.body.item.standard_value, 200000);
    assert.equal(realization.body.item.billed_value, 150000);
    assert.equal(realization.body.item.realization_rate, 0.75);
    assert.equal(realization.body.item.source_payload_included, false);

    const utilization = await json(baseUrl, "/api/analytics/utilization", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-utilization-g8-b15",
        employee_id: "employee_api_g8_b15",
        period_id: "2026-07",
      }),
    });
    assert.equal(utilization.status, 201);
    assert.equal(utilization.body.item.capacity_hours, 40);
    assert.equal(utilization.body.item.billable_hours, 2);
    assert.equal(utilization.body.item.utilization_rate, 0.05);
    assert.equal(utilization.body.item.source_payload_included, false);

    const realizationList = await json(baseUrl, `/api/analytics/realization?${BASE_QUERY}`);
    assert.equal(realizationList.status, 200);
    assert.equal(
      realizationList.body.items.some((item) => item.realization_metric_id === "realization:tenant_cmp_g8_synthetic:matter_api_g8_b15"),
      true,
    );

    const utilizationList = await json(baseUrl, `/api/analytics/utilization?${BASE_QUERY}`);
    assert.equal(utilizationList.status, 200);
    assert.equal(
      utilizationList.body.items.some((item) => item.employee_utilization_id === "util:tenant_cmp_g8_synthetic:employee_api_g8_b15:2026-07"),
      true,
    );

    const refresh = await json(baseUrl, "/api/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-refresh-g8-b15-kpi",
      }),
    });
    assert.equal(refresh.status, 201);
    const dashboards = Object.fromEntries(refresh.body.items.map((item) => [item.dashboard_id, item]));
    assert.equal(dashboards["dashboard-realization"].metric_value, 75);
    assert.equal(dashboards["dashboard-realization"].metric_source, "analytics_repository");
    assert.equal(dashboards["dashboard-employee-utilization"].metric_value, 5);
    assert.equal(dashboards["dashboard-employee-utilization"].source_payload_included, false);
  }, { analyticsRepository: createAnalyticsRepository(), financeRepository });
});

test("G8 refresh and profitability writes persist across restart", async () => {
  const analyticsStorePath = join(mkdtempSync(join(tmpdir(), "analytics-api-g8-")), "analytics.json");
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "TimeEntry",
        time_entry_id: "time-api-g8-persist",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        standard_value: 400000,
        billable: true,
        status: "approved",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-api-g8-persist",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        amount_due: 400000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-api-g8-persist",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        amount: 100000,
        currency: "KRW",
      },
    ],
  });
  await withServer(async (baseUrl) => {
    const refresh = await json(baseUrl, "/api/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-refresh-g8-1",
      }),
    });
    assert.equal(refresh.status, 201);
    assert.equal(refresh.body.items.length, 5);
    const dashboardRows = Object.fromEntries(refresh.body.items.map((item) => [item.dashboard_id, item]));
    assert.equal(dashboardRows["dashboard-realization"].metric_value, 87.5);
    assert.equal(dashboardRows["dashboard-employee-utilization"].metric_value, 75);
    assert.equal(refresh.body.items[0].source_payload_included, false);

    const profit = await json(baseUrl, "/api/analytics/matter-profitability", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-profit-g8-1",
        matter_id: "matter_rp05_synthetic_opening",
      }),
    });
    assert.equal(profit.status, 201);
    assert.equal(profit.body.item.profitability_amount, -300000);
  }, { analyticsStorePath, financeRepository });

  await withServer(async (baseUrl) => {
    const dashboards = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`);
    assert.ok(dashboards.body.items.some((item) => item.dashboard_id === "dashboard-practice-pnl"));
    const audit = await json(baseUrl, `/api/analytics/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "analytics.matter_profitability.refresh"));
  }, { analyticsStorePath });
});

test("G8 report audit collection route is not shadowed by report definition route", async () => {
  await withServer(async (baseUrl) => {
    const audit = await json(baseUrl, `/api/reports/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.equal(audit.body.outcome, "passed");
    assert.equal(audit.body.production_ready_claim, false);
    assert.deepEqual(audit.body.safe_error_codes, []);
  });
});

test("G8 export control requires permission and never exposes credential material", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/analytics/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-export-g8-blocked",
        analytics_export: {
          analytics_export_id: "export_cmp_g8_blocked",
          tenant_id: TENANT,
          dashboard_id: "dashboard-ar-aging",
        },
      }),
    });
    assert.equal(blocked.status, 400);

    const created = await json(baseUrl, "/api/analytics/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_export",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-export-g8-1",
        analytics_export: {
          analytics_export_id: "export_cmp_g8_api_001",
          tenant_id: TENANT,
          dashboard_id: "dashboard-ar-aging",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.credential_material_included, false);
    assert.equal(created.body.production_ready_claim, false);
  });
});
