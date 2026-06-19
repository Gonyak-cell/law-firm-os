#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/revenue-finance-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g7-revenue-finance-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/09-cmp-g7-revenue-finance-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/revenue/runtime/evidence",
  "/api/revenue/time-entries",
  "/api/revenue/rate-cards",
  "/api/revenue/fee-arrangements",
  "/api/revenue/expenses",
  "/api/revenue/disbursements",
  "/api/revenue/wip",
  "/api/revenue/prebills",
  "/api/revenue/adjustments",
  "/api/revenue/invoices",
  "/api/revenue/tax-invoices",
  "/api/revenue/invoice-corrections",
  "/api/revenue/ui",
  "/api/revenue/payments",
  "/api/revenue/ar",
  "/api/revenue/journal-entries",
  "/api/revenue/accounting-exports",
  "/api/revenue/vat-tax-exports",
  "/api/revenue/settlement-runs",
  "/api/revenue/audit",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G7_TUW_IDS",
  "REVENUE_FINANCE_BOUNDED_CONTEXT",
  "createRevenueFinanceRuntimeContext",
  "createRevenueFinanceCmpG7RuntimeEvidence",
  "handleRevenueFinanceApiRequest",
  "requireFinanceCostBasis",
  "finance_write_audit_idempotency_evidence",
  "matter_employee_cost_basis_required",
  "invoice_idempotency_duplicate_side_effect_blocked",
  "payment_import_idempotency_duplicate_side_effect_blocked",
  "createTimeExpenseG5TimeEntryDescriptor",
  "createBillingG5InvoiceIssueDescriptor",
  "createPaymentsG5PaymentImportDescriptor",
  "createSettlementG5SettlementRunDescriptor",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes Revenue/Finance after G1-G6",
  "blocks time writes without Employee+Matter cost basis",
  "records time, rate, fee, expense, and disbursement runtime writes with audit/idempotency",
  "generates WIP, immutable PreBill, and idempotent invoice issue with line reconciliation",
  "records tax invoice, correction, and billing UI masking",
  "handles payment import, partial match, AR balance, aging, journal, and exports",
  "records locked settlement run, credits, approval, finance UI masking, evidence, and audit",
]);

const CMP_G7_TUWS = Object.freeze(
  Array.from({ length: 26 }, (_, index) => `CMP-G7-W07-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G7 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/revenue-finance-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g7-revenue-finance-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/09-cmp-g7-revenue-finance-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G7_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G7 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G7 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G7 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G7 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G7 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G7 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G7 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["REVENUE_FINANCE_BOUNDED_CONTEXT", "REVENUE_FINANCE_RUNTIME", "isRevenueFinancePath", "handleRevenueFinanceApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G7 runtime.", { phrase });
    }
  }

  if (
    !runtime.includes(
      'depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04", "CMP-G5-W05", "CMP-G6-W06"])',
    )
  ) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G7 runtime evidence must preserve G1-G6 dependencies.");
  }

  for (const phrase of ["Employee+Matter cost basis", "finance write/audit/idempotency", "WIP", "PreBill", "Settlement"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G7 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G7 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G7 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g7:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g7:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G7 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G7 runtime validation passed.");
console.log("cmp_g7_tuws: 26/26");
console.log("runtime_routes: revenue time/rate/fee/wip/prebill/invoice/payment/ar/export/settlement/ui/audit");
console.log("behavior_tests: employee-matter-cost-basis/idempotent-invoice/payment-import/ar-aging/settlement-lock/ui-mask");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
