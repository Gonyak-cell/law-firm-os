#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/analytics-read-model-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g8-analytics-read-model-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/10-cmp-g8-analytics-read-model-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/analytics-read-models/runtime/evidence",
  "/api/analytics-read-models/events",
  "/api/analytics-read-models/matter-profitability",
  "/api/analytics-read-models/client-profitability",
  "/api/analytics-read-models/utilization",
  "/api/analytics-read-models/realization",
  "/api/analytics-read-models/dashboards/ar-aging",
  "/api/analytics-read-models/dashboards/client-health",
  "/api/analytics-read-models/dashboards/practice-pnl",
  "/api/analytics-read-models/exports",
  "/api/analytics-read-models/ui/kpi-console",
  "/api/analytics-read-models/source-mutation-test",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G8_TUW_IDS",
  "ANALYTICS_READ_MODEL_BOUNDED_CONTEXT",
  "createAnalyticsReadModelRuntimeContext",
  "createAnalyticsReadModelCmpG8RuntimeEvidence",
  "handleAnalyticsReadModelApiRequest",
  "requireNoSourceMutation",
  "read_model_only_runtime",
  "source_mutation_negative_tests",
  "source_objects_mutated: false",
  "createAnalyticsG6MatterProfitabilityDescriptor",
  "createAnalyticsG6AnalyticsExportControlDescriptor",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes Analytics read models after G1-G7",
  "blocks source mutation attempts before read-model generation",
  "generates matter, client, utilization, and realization read models without persistence",
  "dashboards enforce finance permission, detail omission, and role visibility",
  "export and KPI console remain projection-only",
  "runtime evidence preserves read-model-only boundary without R4 claim",
]);

const CMP_G8_TUWS = Object.freeze(
  Array.from({ length: 14 }, (_, index) => `CMP-G8-W08-T${String(index + 1).padStart(3, "0")}`),
);

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(file) {
  try {
    await stat(path.resolve(file));
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return readFile(path.resolve(file), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G8 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/analytics-read-model-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g8-analytics-read-model-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/10-cmp-g8-analytics-read-model-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G8_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G8 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G8 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G8 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G8 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G8 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G8 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G8 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["ANALYTICS_READ_MODEL_BOUNDED_CONTEXT", "ANALYTICS_READ_MODEL_RUNTIME", "isAnalyticsReadModelPath", "handleAnalyticsReadModelApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G8 runtime.", { phrase });
    }
  }

  if (
    !runtime.includes('"CMP-G7-W07"') ||
    !runtime.includes('"CMP-G1-W01"') ||
    !runtime.includes('"CMP-G6-W06"')
  ) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G8 runtime evidence must preserve G1-G7 dependencies.");
  }

  for (const phrase of ["read-model-only", "source mutation negative", "no source mutation", "projection-only", "KPI console"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G8 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G8 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G8 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g8:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g8:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G8 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G8 runtime validation passed.");
console.log("cmp_g8_tuws: 14/14");
console.log("runtime_routes: analytics read-models profitability/utilization/realization/dashboards/export/kpi/source-mutation-test");
console.log("behavior_tests: read-model-only/source-mutation-negative/projection-only/export-masking/kpi-console");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
