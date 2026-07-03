#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b15-finance-kpi-dashboard-proof.json");
const TENANT = "tenant_upl_b15_finance_kpi";
const ACTOR = "user_upl_b15_analytics";
const MATTER = "matter_upl_b15_kpi";
const EMPLOYEE = "employee_upl_b15_kpi";
const PERIOD = "2026-07";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b15_analytics_read&audit_hint_ref=upl_b15_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["analytics_user", "finance_user"] },
    rules: [{ id: `rule_upl_b15_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function postBody(idempotencyKey, extra = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_b15_analytics_write",
    audit_hint_ref: "upl_b15_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    ...extra,
  };
}

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "RateCard",
      rate_card_id: "rate-upl-b15",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
      status: "active",
    },
    {
      model_type: "TimeEntry",
      time_entry_id: "time-upl-b15",
      tenant_id: TENANT,
      matter_id: MATTER,
      employee_id: EMPLOYEE,
      actor_id: EMPLOYEE,
      role_id: "partner",
      period_id: PERIOD,
      duration_minutes: 120,
      capacity_hours: 40,
      billable: true,
      status: "approved",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-upl-b15",
      tenant_id: TENANT,
      matter_id: MATTER,
      amount_due: 150000,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
  ],
});

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const realization = await apiJson(baseUrl, "/api/analytics/realization", {
    method: "POST",
    body: JSON.stringify(postBody("upl-b15-realization", { matter_id: MATTER })),
  });
  const utilization = await apiJson(baseUrl, "/api/analytics/utilization", {
    method: "POST",
    body: JSON.stringify(postBody("upl-b15-utilization", { employee_id: EMPLOYEE, period_id: PERIOD })),
  });
  const refresh = await apiJson(baseUrl, "/api/analytics/refresh", {
    method: "POST",
    body: JSON.stringify(postBody("upl-b15-refresh")),
  });
  const dashboardList = await apiJson(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`);
  const realizationList = await apiJson(baseUrl, `/api/analytics/realization?${BASE_QUERY}`);
  const utilizationList = await apiJson(baseUrl, `/api/analytics/utilization?${BASE_QUERY}`);
  const dashboards = Object.fromEntries((dashboardList.body.items ?? []).map((item) => [item.dashboard_id, item]));

  const checks = [
    {
      id: "realization-route-computes-seeded-value",
      passed:
        realization.status === 201 &&
        realization.body.item?.standard_value === 200000 &&
        realization.body.item?.billed_value === 150000 &&
        realization.body.item?.realization_rate === 0.75,
    },
    {
      id: "utilization-route-computes-seeded-value",
      passed:
        utilization.status === 201 &&
        utilization.body.item?.capacity_hours === 40 &&
        utilization.body.item?.billable_hours === 2 &&
        utilization.body.item?.utilization_rate === 0.05,
    },
    {
      id: "dashboard-refresh-publishes-kpi-cards",
      passed:
        refresh.status === 201 &&
        dashboards["dashboard-realization"]?.metric_value === 75 &&
        dashboards["dashboard-realization"]?.metric_unit === "percent" &&
        dashboards["dashboard-employee-utilization"]?.metric_value === 5 &&
        dashboards["dashboard-employee-utilization"]?.metric_unit === "percent",
    },
    {
      id: "kpi-route-readback-is-safe",
      passed:
        dashboardList.status === 200 &&
        realizationList.status === 200 &&
        utilizationList.status === 200 &&
        realizationList.body.items?.[0]?.source_payload_included === false &&
        utilizationList.body.items?.[0]?.source_payload_included === false &&
        dashboardList.body.production_ready_claim === false,
    },
    {
      id: "caller-source-payload-not-returned",
      passed: !JSON.stringify({ dashboardList, realizationList, utilizationList }).includes("time_entries"),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-b15.finance-kpi-dashboard-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-15",
    route_surface: [
      "POST /api/analytics/realization",
      "POST /api/analytics/utilization",
      "POST /api/analytics/refresh",
      "GET /api/analytics/dashboards",
      "GET /api/analytics/realization",
      "GET /api/analytics/utilization",
    ],
    checks,
    observed: {
      realization: { status: realization.status, item: realization.body.item },
      utilization: { status: utilization.status, item: utilization.body.item },
      refresh: { status: refresh.status, dashboard_ids: refresh.body.items?.map((item) => item.dashboard_id) ?? [] },
      dashboards,
      realization_readback: realizationList.body.items,
      utilization_readback: utilizationList.body.items,
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
