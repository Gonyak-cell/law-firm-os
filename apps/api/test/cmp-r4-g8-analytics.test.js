import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g8_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g8_read&audit_hint_ref=audit_hint_cmp_g8_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g8_analytics", tenant_id: TENANT, role_ids: ["analytics_user"] },
    rules: [{ id: `rule_analytics_${effect}`, effect, action: "*" }],
    object_acl: [],
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

async function signedHeaders(baseUrl) {
  if (!sessionHeaderCache.has(baseUrl)) sessionHeaderCache.set(baseUrl, await apiSessionHeaders(baseUrl));
  return sessionHeaderCache.get(baseUrl);
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await signedHeaders(baseUrl)),
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
