#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/matter-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g4-matter-core-api.test.js",
  "apps/web/src/data/matterApiClient.js",
  "docs/reorganization/client-matter-os/cmp-v1/06-cmp-g4-matter-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/matter/runtime/evidence",
  "/api/matter/clearance-tokens",
  "/api/matter/matter-numbers/reservations",
  "/api/matter/opening/transactions",
  "/api/matter/matters",
  "/api/matter/dashboard",
  "/api/matter/audit",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G4_TUW_IDS",
  "MATTER_CORE_BOUNDED_CONTEXT",
  "createMatterRuntimeContext",
  "createMatterCmpG4RuntimeEvidence",
  "handleMatterApiRequest",
  "createIntakeClearanceTokenDescriptor",
  "createMatterG4OpeningRecord",
  "createMatterNumberReservationDescriptor",
  "createMatterOpeningTransactionDescriptor",
  "createMatterMemberPermissionDescriptor",
  "createMatterTaskTransitionDescriptor",
  "createMatterCalendarDeadlineChangeDescriptor",
  "createMatterCriticalDeadlineDualControlDescriptor",
  "createMatterStatusHistoryDescriptor",
  "createMatterClientReportProjectionDescriptor",
  "createMatterClosingChecklistDescriptor",
  "createMatterDashboardUiStateDescriptor",
  "createMatterWikiShellForMatter",
  "createMatterGraphSkeletonForMatter",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "blocks Matter opening without CRM/Intake clearance",
  "direct Opportunity shortcut",
  "clearance-gated Matter with atomic refs",
  "wiki shell, graph skeleton",
  "idempotent replay",
  "staffing role permission",
  "task transition, deadline change, dual control, and immutable status history",
  "client reports and dashboard without privileged or silent Matter leakage",
  "closing checklist blocks WIP",
  "runtime evidence and audit preserve tenant scope",
]);

const CMP_G4_TUWS = Object.freeze(
  Array.from({ length: 23 }, (_, index) => `CMP-G4-W04-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G4 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/matter-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g4-matter-core-api.test.js");
  const uiClient = await readText("apps/web/src/data/matterApiClient.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/06-cmp-g4-matter-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G4_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G4 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G4 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G4 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G4 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G4 report missing required route.", { route });
    }
    if (["/api/matter/clearance-tokens", "/api/matter/matters", "/api/matter/dashboard", "/api/matter/runtime/evidence"].includes(route) && !uiClient.includes(route)) {
      addFinding(findings, "MISSING_UI_CLIENT_ROUTE", "Matter UI client missing CMP-G4 route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G4 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G4 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["MATTER_CORE_BOUNDED_CONTEXT", "MATTER_RUNTIME", "isMatterPath", "handleMatterApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G4 runtime.", { phrase });
    }
  }

  if (!runtime.includes('depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03"])')) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G4 runtime evidence must preserve G1/G2/G3 dependencies.");
  }

  for (const phrase of ["CRM/Intake clearance", "Direct Opportunity-to-Matter shortcut", "ACL, DMS workspace, Billing"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G4 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G4 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G4 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g4:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g4:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G4 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G4 runtime validation passed.");
console.log("cmp_g4_tuws: 23/23");
console.log("runtime_routes: matter clearance/number/opening/team/task/deadline/status/report/closing/dashboard/audit");
console.log("behavior_tests: clearance-required/atomic-opening/idempotency/staffing/deadline-dual-control/visibility/closing");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
