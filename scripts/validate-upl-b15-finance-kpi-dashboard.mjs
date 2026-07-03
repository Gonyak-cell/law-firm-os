#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const analyticsRuntime = read("apps/api/src/analytics-runtime-context.js");
const refreshJob = read("packages/analytics/src/refresh-job-service.js");
const apiClient = read("apps/web/src/data/apiClient.js");
const mattersSurface = read("apps/web/src/components/MattersSurface.jsx");
const apiTest = read("apps/api/test/cmp-r4-g8-analytics.test.js");
const uiProofScript = read("scripts/run-lcx-vltui-matter-sections-proof.mjs");
const proofScript = read("scripts/run-upl-b15-finance-kpi-dashboard-proof.mjs");
await assertNodeProofPass("scripts/run-upl-b15-finance-kpi-dashboard-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b15-finance-kpi-dashboard-proof.json"));
const uiProof = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-sections-proof.json"));

assert.match(analyticsRuntime, /GET \/api\/analytics\/realization/);
assert.match(analyticsRuntime, /GET \/api\/analytics\/utilization/);
assert.match(analyticsRuntime, /model_type: "RealizationMetric"/);
assert.match(analyticsRuntime, /model_type: "EmployeeUtilization"/);
assert.match(refreshJob, /dashboard_id: "dashboard-realization"/);
assert.match(refreshJob, /dashboard_id: "dashboard-employee-utilization"/);
assert.match(refreshJob, /computeKpiDashboardMetrics/);
assert.match(apiClient, /export async function fetchAnalyticsRealization/);
assert.match(apiClient, /\/api\/analytics\/realization/);
assert.match(apiClient, /export async function fetchAnalyticsUtilization/);
assert.match(apiClient, /\/api\/analytics\/utilization/);
assert.match(apiClient, /permissionContextFor\(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter"\)/);
assert.match(apiClient, /actorRefForDomain\("matter", ANALYTICS_PRINCIPAL\.user_id\)/);
assert.match(mattersSurface, /data-matter-analytics-kpi-cards="true"/);
assert.match(mattersSurface, /data-matter-analytics-realization-card="true"/);
assert.match(mattersSurface, /data-matter-analytics-utilization-card="true"/);
assert.match(mattersSurface, /fetchAnalyticsRealization/);
assert.match(mattersSurface, /fetchAnalyticsUtilization/);
assert.match(apiTest, /G8 KPI routes create realization and utilization dashboard projections/);
assert.match(apiTest, /dashboard-realization/);
assert.match(apiTest, /dashboard-employee-utilization/);
assert.match(proofScript, /realization-route-computes-seeded-value/);
assert.match(proofScript, /dashboard-refresh-publishes-kpi-cards/);
assert.match(uiProofScript, /analytics-kpi-cards-show-seeded-realization-utilization/);

assert.equal(proof.contract_ref, "UPL-B-15");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);
assert.equal(proof.observed.realization.item.realization_rate, 0.75);
assert.equal(proof.observed.utilization.item.utilization_rate, 0.05);
assert.equal(proof.observed.dashboards["dashboard-realization"].metric_value, 75);
assert.equal(proof.observed.dashboards["dashboard-employee-utilization"].metric_value, 5);

assert.equal(uiProof.verdict, "PASS");
const uiCase = uiProof.cases[0];
assert.equal(uiCase.checks.some((check) => check.id === "analytics-kpi-cards-show-seeded-realization-utilization" && check.passed === true), true);
assert.match(uiCase.analytics_kpi_cards.realization, /87\.5%/);
assert.match(uiCase.analytics_kpi_cards.utilization, /75%/);
assert.equal(uiCase.writes.some((write) => write.kind === "analytics_refresh" && write.audit_hint_ref === "ui_cmp_g8_analytics_probe" && write.actor_id === "user_lcx_vltui_session"), true);

console.log("UPL-B-15 finance KPI dashboard validation passed.");
console.log("proof: artifacts/manual-qa/upl-b15-finance-kpi-dashboard-proof.json");
