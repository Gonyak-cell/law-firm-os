#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/hrx-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g3-people-hrx-api.test.js",
  "apps/web/src/people/hrxApiClient.ts",
  "apps/web/src/people/PeopleHome.tsx",
  "docs/reorganization/client-matter-os/cmp-v1/05-cmp-g3-people-hrx-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/hrx/runtime/evidence",
  "/api/hrx/employees",
  "/api/hrx/employment-profiles",
  "/api/hrx/documents",
  "/api/hrx/workload",
  "/api/hrx/compensation/preview",
  "/api/hrx/evaluations/access",
  "/api/hrx/payroll/export-preview",
  "/api/hrx/candidate/portal",
  "/api/hrx/recruiting/pipeline",
  "/api/hrx/analytics",
  "/api/hrx/ai/assistant",
  "/api/hrx/audit",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G3_TUW_IDS",
  "PEOPLE_HRX_BOUNDED_CONTEXT",
  "createHrxCmpG3RuntimeEvidence",
  "maskHrxFields",
  "createPayrollExportPreview",
  "createHrxG7UserEmployeeSeparationDescriptor",
  "createHrxG7EmployeeSchemaDescriptor",
  "createHrxG7WorkloadReadModelDescriptor",
  "createHrxG7HrDocumentGuardrailDescriptor",
  "createHrxG7EvaluationAccessDescriptor",
  "createHrxG7CandidateSeparationDescriptor",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "blocking User identity conflation",
  "EmploymentProfile rows linked to Employee only",
  "metadata only and blocks document bodies",
  "aggregate People capacity without Matter detail",
  "masks compensation",
  "payroll preview never performs payroll calculation",
  "candidate portal and runtime evidence preserve Party and R4 boundaries",
  "audit remains tenant scoped",
]);

const CMP_G3_TUWS = Object.freeze(
  Array.from({ length: 24 }, (_, index) => `CMP-G3-W03-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G3 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/hrx-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g3-people-hrx-api.test.js");
  const uiClient = await readText("apps/web/src/people/hrxApiClient.ts");
  const uiHome = await readText("apps/web/src/people/PeopleHome.tsx");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/05-cmp-g3-people-hrx-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G3_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G3 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G3 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G3 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G3 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G3 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G3 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G3 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of [
    "PEOPLE_HRX_BOUNDED_CONTEXT",
    "HRX_RUNTIME",
    "handleHrxApiRequest",
    '["POST", "PATCH"].includes(req.method)',
  ]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G3 runtime.", { phrase });
    }
  }

  for (const route of ["/api/hrx/employees", "/api/hrx/documents", "/api/hrx/analytics", "/api/hrx/ai/assistant"]) {
    if (!uiClient.includes(route)) {
      addFinding(findings, "MISSING_UI_API_ROUTE", "People UI client missing CMP-G3 runtime route.", { route });
    }
  }

  for (const phrase of ["data-hrx-api-backed", "EmployeeList", "HRDocumentWorkspace", "HRAnalytics", "HRAIAssistant"]) {
    if (!uiHome.includes(phrase)) {
      addFinding(findings, "MISSING_UI_MARKER", "People UI home missing CMP-G3 runtime marker.", { phrase });
    }
  }

  if (!runtime.includes('depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"])')) {
    addFinding(findings, "G1_G2_DEPENDENCY", "CMP-G3 runtime evidence must preserve G1 and G2 dependencies.");
  }

  for (const phrase of ["CMP-G1-W01", "CMP-G2-W02"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_DEPENDENCY", "CMP-G3 report missing dependency boundary.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G3 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G3 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (runtime.includes("crm_party_id") || report.includes("CRM Party identity") === false) {
    addFinding(findings, "PARTY_SEPARATION", "CMP-G3 must preserve candidate and Employee separation from CRM Party.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g3:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g3:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G3 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G3 runtime validation passed.");
console.log("cmp_g3_tuws: 24/24");
console.log("runtime_routes: hrx employees/profiles/documents/workload/compensation/evaluations/payroll/candidate/analytics/ai/audit");
console.log("behavior_tests: user-employee-separation/hr-doc-guardrails/matter-aggregate-only/payroll-preview/candidate-party-separation");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
