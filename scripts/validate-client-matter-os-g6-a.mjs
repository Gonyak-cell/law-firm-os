#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAnalyticsG6AReadModelFoundationCloseoutDescriptor,
  createAnalyticsG6AnalyticsEventDescriptor,
  createAnalyticsG6ClientProfitabilityDescriptor,
  createAnalyticsG6MatterProfitabilityDescriptor,
  createAnalyticsG6RealizationMetricDescriptor,
  createAnalyticsG6UtilizationMetricDescriptor,
} from "../packages/analytics/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G6-W09-T001", "LFOS-G6-W09-T002", "LFOS-G6-W09-T003", "LFOS-G6-W09-T004", "LFOS-G6-W09-T005"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "49-g6-a-analytics-read-model-foundation-report.md"),
  path.resolve("contracts/analytics-core-contract.json"),
  path.resolve("packages/analytics/src/client-matter-g6.js"),
  path.resolve("packages/analytics/test/client-matter-g6-analytics-read-model-foundation.test.js"),
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

const tenant_id = "tenant_g6a_validator";
const matter_id = "matter_g6a_validator";
const client_group_id = "client_group_g6a_validator";
const actor_id = "actor_g6a_validator";
const period_id = "period_2026_06";

function eventRequest() {
  return {
    tenant_id,
    matter_id,
    analytics_event: {
      analytics_event_id: "analytics_event_g6a_validator",
      tenant_id,
      matter_id,
      event_type: "invoice_payment_time_joined",
      occurred_at: "2026-06-19T08:00:00Z",
    },
    source_refs: [{ source_type: "invoice", source_id: "invoice_g6a_validator" }],
  };
}

function timeEntry(overrides = {}) {
  return { time_entry_id: "time_g6a_validator", tenant_id, matter_id, actor_id, standard_value: 1000, billable_hours: 5, ...overrides };
}

function invoice(overrides = {}) {
  return { invoice_id: "invoice_g6a_validator", tenant_id, matter_id, invoice_total: 900, ...overrides };
}

function payment(overrides = {}) {
  return { payment_id: "payment_g6a_validator", tenant_id, matter_id, payment_total: 700, ...overrides };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const report = await readText(path.join(ROOT, "49-g6-a-analytics-read-model-foundation-report.md"));
  const source = await readText(path.resolve("packages/analytics/src/client-matter-g6.js"));
  const indexSource = await readText(path.resolve("packages/analytics/src/index.js"));
  const testSource = await readText(path.resolve("packages/analytics/test/client-matter-g6-analytics-read-model-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const analyticsContract = await readJson(path.resolve("contracts/analytics-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-A TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-A TUW missing from G6-A report.");
  }

  requireIncludes(plan, "G6 Analytics AI Portal Entry Plan", "G6_PLAN_DEPENDENCY", "G6-A must build on G6 entry plan evidence.");
  requireIncludes(riskRegister, "R-009", "R009_DEPENDENCY", "G6-A must preserve analytics source mutation controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-A must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-A Analytics Read Model Foundation Report",
    "This slice does not claim G6 runtime readiness",
    "no source mutation",
    "invoice/payment/time join",
    "client group aggregation",
    "capacity denominator",
    "billed versus standard value",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-A report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "ANALYTICS_G6A_TUW_COVERAGE",
    "createAnalyticsG6AnalyticsEventDescriptor",
    "createAnalyticsG6MatterProfitabilityDescriptor",
    "createAnalyticsG6ClientProfitabilityDescriptor",
    "createAnalyticsG6UtilizationMetricDescriptor",
    "createAnalyticsG6RealizationMetricDescriptor",
    "createAnalyticsG6AReadModelFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "ANALYTICS_G6A_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-A descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-A descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g6.js", "MISSING_INDEX_EXPORT", "analytics index must export G6 Client-Matter descriptors.");

  for (const marker of [
    "analytics_event_no_source_mutation_required",
    "analytics_event_source_ref_required",
    "matter_profitability_join_evidence_required",
    "matter_profitability_source_mutation_blocked",
    "client_profitability_client_group_aggregation_required",
    "client_profitability_duplicate_client_identity_blocked",
    "utilization_capacity_denominator_required",
    "utilization_hrx_boundary_blocked",
    "realization_billed_standard_value_required",
    "g6_analytics_read_model_closeout_evidence_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-A source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6a:validate"] !== "node scripts/validate-client-matter-os-g6-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6a:validate.");
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

  const event = createAnalyticsG6AnalyticsEventDescriptor(eventRequest());
  const matter = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id,
    matter_id,
    time_entries: [timeEntry()],
    invoices: [invoice()],
    payments: [payment()],
  });
  const client = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id,
    client_group_id,
    matter_profitability_rows: [{ tenant_id, matter_id, client_group_id, profitability_amount: 100 }],
  });
  const utilization = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id,
    actor_id,
    period_id,
    capacity: { denominator_hours: 10 },
    time_entries: [timeEntry()],
  });
  const realization = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id,
    matter_id,
    billed_items: [{ tenant_id, matter_id, billed_value: 900 }],
    standard_value_items: [timeEntry()],
  });
  const closeout = createAnalyticsG6AReadModelFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [event, matter, client, utilization, realization],
  });

  if (event.outcome !== "review_required" || event.analytics_event_receipt.no_source_mutation_tested !== true) {
    addFinding("ANALYTICS_EVENT", "AnalyticsEvent descriptor must require no source mutation evidence.");
  }
  if (matter.outcome !== "review_required" || matter.matter_profitability_receipt.invoice_payment_time_join_tested !== true) {
    addFinding("MATTER_PROFITABILITY", "MatterProfitability descriptor must require invoice/payment/time join evidence.");
  }
  if (client.outcome !== "review_required" || client.client_profitability_receipt.client_group_aggregation_tested !== true) {
    addFinding("CLIENT_PROFITABILITY", "ClientProfitability descriptor must require client group aggregation evidence.");
  }
  if (utilization.outcome !== "review_required" || utilization.utilization_receipt.capacity_denominator_tested !== true) {
    addFinding("UTILIZATION", "Utilization descriptor must require capacity denominator evidence.");
  }
  if (realization.outcome !== "review_required" || realization.realization_receipt.billed_vs_standard_value_tested !== true) {
    addFinding("REALIZATION", "Realization descriptor must require billed versus standard value evidence.");
  }
  if (closeout.outcome !== "review_required" || closeout.tuw_coverage.length !== 5 || closeout.closeout_receipt.runtime_readiness_claim !== "open") {
    addFinding("G6A_CLOSEOUT", "G6-A closeout must summarize five TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-A validation passed.");
console.log("g6a_tuws: LFOS-G6-W09-T001/LFOS-G6-W09-T002/LFOS-G6-W09-T003/LFOS-G6-W09-T004/LFOS-G6-W09-T005");
console.log("analytics_event: no_source_mutation_required");
console.log("matter_profitability: invoice_payment_time_join_required");
console.log("client_profitability: client_group_aggregation_required");
console.log("utilization: capacity_denominator_required");
console.log("realization: billed_vs_standard_value_required");
console.log("g6_runtime_readiness_claim: open");
