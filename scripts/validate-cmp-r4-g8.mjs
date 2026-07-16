#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/analytics/src/runtime-repository.js",
  "packages/analytics/src/event-contract.js",
  "packages/analytics/src/metrics-service.js",
  "packages/analytics/src/dashboard-service.js",
  "packages/analytics/src/export-control-service.js",
  "packages/analytics/src/refresh-job-service.js",
  "apps/api/src/analytics-runtime-context.js",
  "apps/web/src/components/AnalyticsSurface.jsx",
  "scripts/validate-cmp-r4-g8.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g8-closeout.md",
];
const REQUIRED_TESTS = [
  "packages/analytics/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g8-analytics.test.js",
  "apps/web/test/ui-regression.test.mjs",
];
const REQUIRED_EVIDENCE = Array.from({ length: 14 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g8-${String(index + 1).padStart(3, "0")}.md`,
);
const failures = [];
for (const file of [...REQUIRED_FILES, ...REQUIRED_TESTS, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

function requirePatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

function rejectPatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`forbidden marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/analytics/src/runtime-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /mutates_source_object: false/]);
requirePatterns("packages/analytics/src/event-contract.js", [/recordAnalyticsEvent/, /source_refs are required/, /cannot mutate source/]);
requirePatterns("packages/analytics/src/metrics-service.js", [/createMatterProfitability/, /createClientProfitability/, /createEmployeeUtilization/, /createRealizationMetric/, /client_group_id: resolvedClientGroupId/, /matter_profitability\.client_group_id/]);
requirePatterns("packages/analytics/src/dashboard-service.js", [/createArAgingDashboard/, /createClientHealthDashboard/, /createPracticePnlDashboard/, /createRealizationDashboard/, /createEmployeeUtilizationDashboard/]);
requirePatterns("packages/analytics/src/export-control-service.js", [/createAnalyticsExport/, /permission_ref/, /credential_material_included: false/]);
requirePatterns("packages/analytics/src/refresh-job-service.js", [/refreshAnalyticsReadModels/, /ReadModelRefreshRun/, /selectFinanceRowsForEmployeeUtilization/, /computeKpiDashboardMetrics/]);
requirePatterns("apps/api/src/analytics-runtime-context.js", [/ANALYTICS_BOUNDED_CONTEXT/, /runtime_write_ready: true/, /production_ready_claim: false/, /handleAnalyticsRefresh/, /selectFinanceRowsForMatter/, /handleRealizationCreate/, /handleEmployeeUtilizationCreate/, /client_group_id: body\.client_group_id \?\? financeRows\.client_group_id/, /model_type: "MatterProfitability", client_group_id: body\.client_group_id/]);
requirePatterns("apps/web/src/components/AnalyticsSurface.jsx", [/data-cmp-g8-analytics-runtime/, /fetchAnalyticsDashboards/, /matter_detail_omitted/, /민감한 Matter 상세 내용은 목록에서 숨깁니다/]);
requirePatterns("packages/analytics/test/runtime-services.test.js", [/blocks source mutation/, /refreshAnalyticsReadModels/, /createAnalyticsExport/, /aggregates only matching client group matter rows/]);
requirePatterns("apps/api/test/cmp-r4-g8-analytics.test.js", [/refresh and profitability writes persist across restart/, /export control requires permission/, /api-profit-g8-bodyless/, /api-refresh-g8-b15-kpi/, /different aggregates for different client groups/]);
rejectPatterns("packages/analytics/src/refresh-job-service.js", [/metric_value:\s*(400000|87|32)\b/]);
rejectPatterns("apps/web/src/components/AnalyticsSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G8 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G8 validation passed.");
console.log("g8_runtime_tuws_with_evidence: 14/14");
console.log("remaining_g8_tuw: none");
