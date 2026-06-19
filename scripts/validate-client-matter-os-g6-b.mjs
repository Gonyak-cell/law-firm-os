#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAnalyticsG6ARAgingDashboardDescriptor,
  createAnalyticsG6AnalyticsExportControlDescriptor,
  createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor,
  createAnalyticsG6ClientHealthDashboardDescriptor,
  createAnalyticsG6PracticePnlDashboardDescriptor,
} from "../packages/analytics/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G6-W09-T006", "LFOS-G6-W09-T007", "LFOS-G6-W09-T008", "LFOS-G6-W09-T009", "LFOS-G6-W09-T010"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "49-g6-a-analytics-read-model-foundation-report.md"),
  path.join(ROOT, "50-g6-b-analytics-dashboard-export-closeout-report.md"),
  path.resolve("contracts/analytics-core-contract.json"),
  path.resolve("packages/analytics/src/client-matter-g6.js"),
  path.resolve("packages/analytics/test/client-matter-g6-analytics-dashboard-export-closeout.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-a.mjs"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

const tenant_id = "tenant_g6b_validator";
const actor_id = "actor_g6b_validator";
const client_group_id = "client_group_g6b_validator";
const practice_id = "practice_g6b_validator";
const role_id = "role_finance_partner";

function arRow(overrides = {}) {
  return { tenant_id, matter_id: "matter_ar_g6b_validator", overdue_amount: 1200, bucket: "61-90", ...overrides };
}

function healthRow(overrides = {}) {
  return { tenant_id, client_group_id, health_score: 90, visible_summary: "stable", ...overrides };
}

function pnlRow(overrides = {}) {
  return { tenant_id, practice_id, visible_to_role: role_id, pnl_amount: 5000, ...overrides };
}

function exportRow(overrides = {}) {
  return { tenant_id, read_model_id: "read_model_g6b_validator", masked_client_ref: "client_hash_g6b", amount: 900, ...overrides };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-B validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6aReport = await readText(path.join(ROOT, "49-g6-a-analytics-read-model-foundation-report.md"));
  const report = await readText(path.join(ROOT, "50-g6-b-analytics-dashboard-export-closeout-report.md"));
  const source = await readText(path.resolve("packages/analytics/src/client-matter-g6.js"));
  const indexSource = await readText(path.resolve("packages/analytics/src/index.js"));
  const testSource = await readText(path.resolve("packages/analytics/test/client-matter-g6-analytics-dashboard-export-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const analyticsContract = await readJson(path.resolve("contracts/analytics-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-B TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-B TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-B TUW missing from G6-B report.");
  }

  requireIncludes(plan, "G6-B", "G6_PLAN_DEPENDENCY", "G6-B must build on G6 entry plan evidence.");
  requireIncludes(g6aReport, "G6-A Analytics Read Model Foundation Report", "G6A_DEPENDENCY", "G6-B must depend on G6-A read-model foundation evidence.");
  requireIncludes(riskRegister, "R-009", "R009_DEPENDENCY", "G6-B must preserve analytics source mutation controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-B must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-B Analytics Dashboard Export Closeout Report",
    "This slice does not claim G6 runtime readiness",
    "finance permission",
    "conflict and Matter detail omission",
    "role-based visibility",
    "export audit and masking",
    "read-model-only evidence",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-B report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "ANALYTICS_G6B_TUW_COVERAGE",
    "createAnalyticsG6ARAgingDashboardDescriptor",
    "createAnalyticsG6ClientHealthDashboardDescriptor",
    "createAnalyticsG6PracticePnlDashboardDescriptor",
    "createAnalyticsG6AnalyticsExportControlDescriptor",
    "createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "ANALYTICS_G6B_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-B descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-B descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g6.js", "MISSING_INDEX_EXPORT", "analytics index must export G6 Client-Matter descriptors.");

  for (const marker of [
    "ar_aging_finance_permission_required",
    "ar_aging_source_mutation_blocked",
    "client_health_conflict_matter_detail_omission_required",
    "client_health_conflict_detail_exposure_blocked",
    "practice_pnl_role_visibility_required",
    "practice_pnl_unauthorized_visibility_blocked",
    "analytics_export_audit_masking_required",
    "analytics_export_tenant_scope_required",
    "analytics_export_unmasked_sensitive_data_blocked",
    "analytics_export_source_mutation_blocked",
    "g6_analytics_dashboard_export_closeout_evidence_required",
    "g6_analytics_read_model_foundation_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-B source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6b:validate"] !== "node scripts/validate-client-matter-os-g6-b.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6b:validate.");
  }

  if (
    analyticsContract.program?.program_id !== "RP15" ||
    analyticsContract.program?.descriptor_only !== true ||
    analyticsContract.no_write_attestation?.dispatches_analytics_runtime !== false ||
    analyticsContract.no_write_attestation?.dispatches_matter_pnl_runtime !== false ||
    analyticsContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("ANALYTICS_CONTRACT_BOUNDARY", "RP15 Analytics contract must remain descriptor-only no-runtime evidence.");
  }

  const ar = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id,
    actor_id,
    permissions: ["finance:ar:read"],
    ar_aging_rows: [arRow()],
  });
  const health = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id,
    client_group_id,
    client_health_rows: [healthRow()],
    conflict_detail_omitted: true,
    matter_detail_omitted: true,
  });
  const pnl = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id,
    practice_id,
    role_id,
    permissions: ["analytics:practice-pnl:read"],
    practice_pnl_rows: [pnlRow()],
    role_visibility_tested: true,
  });
  const exportControl = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id,
    actor_id,
    export_id: "export_g6b_validator",
    read_model_refs: [{ read_model_type: "MatterProfitability", read_model_id: "read_model_g6b_validator" }],
    export_rows: [exportRow()],
    audit_receipt: { tenant_id, audit_event_id: "audit_g6b_validator", export_id: "export_g6b_validator" },
    masking_tested: true,
    tenant_scoped: true,
  });
  const closeout = createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor({
    tenant_id,
    descriptors: [ar, health, pnl, exportControl],
    read_model_foundation_closed: true,
  });

  if (ar.outcome !== "review_required" || ar.ar_aging_receipt.finance_permission_tested !== true) {
    addFinding("AR_AGING", "AR aging descriptor must require finance permission evidence.");
  }
  if (health.outcome !== "review_required" || health.client_health_receipt.conflict_detail_omission_tested !== true) {
    addFinding("CLIENT_HEALTH", "Client health descriptor must require conflict and Matter detail omission evidence.");
  }
  if (pnl.outcome !== "review_required" || pnl.practice_pnl_receipt.role_visibility_tested !== true) {
    addFinding("PRACTICE_PNL", "Practice P&L descriptor must require role-based visibility evidence.");
  }
  if (exportControl.outcome !== "review_required" || exportControl.analytics_export_receipt.masking_tested !== true) {
    addFinding("ANALYTICS_EXPORT", "Analytics export descriptor must require audit and masking evidence.");
  }
  if (closeout.outcome !== "review_required" || closeout.tuw_coverage.length !== 5 || closeout.closeout_receipt.runtime_readiness_claim !== "open") {
    addFinding("G6B_CLOSEOUT", "G6-B closeout must summarize five TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-B validation passed.");
console.log("g6b_tuws: LFOS-G6-W09-T006/LFOS-G6-W09-T007/LFOS-G6-W09-T008/LFOS-G6-W09-T009/LFOS-G6-W09-T010");
console.log("ar_aging: finance_permission_required");
console.log("client_health: conflict_matter_detail_omission_required");
console.log("practice_pnl: role_visibility_required");
console.log("analytics_export: audit_masking_tenant_scope_required");
console.log("analytics_closeout: read_model_only_required");
console.log("g6_runtime_readiness_claim: open");
