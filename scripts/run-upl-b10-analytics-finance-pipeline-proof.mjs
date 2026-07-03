#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b10-analytics-finance-pipeline-proof.json");
const TENANT = "tenant_upl_b10_finance_pipeline";
const ACTOR = "user_upl_b10_analytics";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b10_analytics_read&audit_hint_ref=upl_b10_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["finance_user", "analytics_user"] },
    rules: [{ id: `rule_upl_b10_${effect}`, effect, action: "*" }],
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

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "RateCard",
      rate_card_id: "rate-upl-b10",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 300000 }],
      status: "active",
    },
    {
      model_type: "TimeEntry",
      time_entry_id: "time-upl-b10-matter",
      tenant_id: TENANT,
      matter_id: "matter_upl_b10_pipeline",
      client_group_id: "client_group_upl_b10",
      employee_id: "employee_upl_b10",
      actor_id: "employee_upl_b10",
      role_id: "partner",
      period_id: "2026-07",
      duration_minutes: 120,
      capacity_hours: 40,
      billable: true,
      status: "approved",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-upl-b10",
      tenant_id: TENANT,
      matter_id: "matter_upl_b10_pipeline",
      client_group_id: "client_group_upl_b10",
      amount_due: 900000,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
    {
      model_type: "ARBalance",
      ar_balance_id: "ar-upl-b10",
      tenant_id: TENANT,
      matter_id: "matter_upl_b10_pipeline",
      invoice_id: "invoice-upl-b10",
      balance: 900000,
      status: "open",
    },
    {
      model_type: "Payment",
      payment_id: "payment-upl-b10",
      tenant_id: TENANT,
      matter_id: "matter_upl_b10_pipeline",
      invoice_id: "invoice-upl-b10",
      client_group_id: "client_group_upl_b10",
      amount: 450000,
      currency: "KRW",
    },
  ],
});

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const refresh = await apiJson(baseUrl, "/api/analytics/refresh", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-refresh",
    }),
  });

  const matterProfitability = await apiJson(baseUrl, "/api/analytics/matter-profitability", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-matter-profit",
      matter_id: "matter_upl_b10_pipeline",
    }),
  });

  const realization = await apiJson(baseUrl, "/api/analytics/realization", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-realization",
      matter_id: "matter_upl_b10_pipeline",
    }),
  });

  const utilization = await apiJson(baseUrl, "/api/analytics/utilization", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-utilization",
      employee_id: "employee_upl_b10",
      period_id: "2026-07",
    }),
  });

  const clientProfitability = await apiJson(baseUrl, "/api/analytics/client-profitability", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-client-profit",
      client_group_id: "client_group_upl_b10",
    }),
  });

  const callerPayloadReject = await apiJson(baseUrl, "/api/analytics/matter-profitability", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_b10_analytics_write",
      audit_hint_ref: "upl_b10_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-b10-caller-payload-reject",
      matter_id: "matter_upl_b10_pipeline",
      time_entries: [{ standard_value: 999999 }],
      invoices: [{ amount_due: 999999 }],
      payments: [{ amount: 999999 }],
    }),
  });

  const dashboards = Object.fromEntries((refresh.body.items ?? []).map((item) => [item.dashboard_id, item]));
  const checks = [
    { id: "refresh-uses-finance-repository", passed: refresh.status === 201 && dashboards["dashboard-ar-aging"]?.metric_source === "finance_repository" },
    { id: "refresh-ar-open-balance-from-finance", passed: dashboards["dashboard-ar-aging"]?.metric_value === 900000 },
    { id: "matter-profitability-bodyless", passed: matterProfitability.status === 201 && matterProfitability.body.item?.profitability_amount === -150000 },
    { id: "realization-bodyless", passed: realization.status === 201 && realization.body.item?.realization_rate === 1.5 },
    { id: "utilization-bodyless", passed: utilization.status === 201 && utilization.body.item?.utilization_rate === 0.05 },
    { id: "client-profitability-from-read-model", passed: clientProfitability.status === 201 && clientProfitability.body.item?.matter_count === 1 },
    {
      id: "caller-source-payload-rejected",
      passed: callerPayloadReject.status === 400 && callerPayloadReject.body.safe_error_codes?.includes("ANALYTICS_CALLER_SOURCE_PAYLOAD_REJECTED"),
    },
    { id: "raw-source-payload-not-returned", passed: !JSON.stringify({ refresh, matterProfitability, realization, utilization, clientProfitability }).includes("time_entries") },
  ];

  report = {
    schema_version: "law-firm-os.upl-b10.analytics-finance-pipeline-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-10",
    route_surface: [
      "POST /api/analytics/refresh",
      "POST /api/analytics/matter-profitability",
      "POST /api/analytics/realization",
      "POST /api/analytics/utilization",
      "POST /api/analytics/client-profitability",
    ],
    checks,
    observed: {
      refresh: { status: refresh.status, dashboard_metrics: dashboards },
      matter_profitability: { status: matterProfitability.status, item: matterProfitability.body.item },
      realization: { status: realization.status, item: realization.body.item },
      utilization: { status: utilization.status, item: utilization.body.item },
      client_profitability: { status: clientProfitability.status, item: clientProfitability.body.item },
      caller_payload_reject: { status: callerPayloadReject.status, safe_error_codes: callerPayloadReject.body.safe_error_codes },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
