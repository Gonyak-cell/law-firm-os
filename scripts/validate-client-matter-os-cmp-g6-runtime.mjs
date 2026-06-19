#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/crm-intake-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g6-crm-intake-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/08-cmp-g6-crm-intake-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/crm-intake/runtime/evidence",
  "/api/crm-intake/leads",
  "/api/crm-intake/opportunities",
  "/api/crm-intake/activities",
  "/api/crm-intake/proposals",
  "/api/crm-intake/referrals",
  "/api/crm-intake/campaigns",
  "/api/crm-intake/intake-requests",
  "/api/crm-intake/conflict-checks",
  "/api/crm-intake/conflict-hits",
  "/api/crm-intake/waivers",
  "/api/crm-intake/fee-terms",
  "/api/crm-intake/engagements",
  "/api/crm-intake/risk-approvals",
  "/api/crm-intake/clearance-tokens",
  "/api/crm-intake/ui",
  "/api/crm-intake/audit",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G6_TUW_IDS",
  "CRM_INTAKE_CLEARANCE_BOUNDED_CONTEXT",
  "createCrmIntakeRuntimeContext",
  "createCrmIntakeCmpG6RuntimeEvidence",
  "handleCrmIntakeApiRequest",
  "createCrmOpportunityToIntakeCommandDescriptor",
  "createIntakeConflictSearchDescriptor",
  "createIntakeConflictDecisionWorkflowDescriptor",
  "createIntakeEngagementDescriptor",
  "createIntakeClearanceTokenDescriptor",
  "opportunity_to_matter_bypass_blocked",
  "intake_conflict_engagement_clearance_required",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes CRM/Intake clearance before Matter opening",
  "blocks direct Opportunity-to-Matter bypass",
  "allows Opportunity-to-Intake only",
  "conflict snapshot, source-covered search, and reviewer decision",
  "requires waiver, fee terms, engagement approval, and risk audit before clearance token",
  "UI routes mask conflict, finance, waiver, and engagement sensitive details",
  "runtime evidence and audit preserve clearance boundaries",
]);

const CMP_G6_TUWS = Object.freeze(
  Array.from({ length: 22 }, (_, index) => `CMP-G6-W06-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G6 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/crm-intake-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g6-crm-intake-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/08-cmp-g6-crm-intake-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G6_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G6 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G6 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G6 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G6 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G6 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G6 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G6 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["CRM_INTAKE_CLEARANCE_BOUNDED_CONTEXT", "CRM_INTAKE_RUNTIME", "isCrmIntakePath", "handleCrmIntakeApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G6 runtime.", { phrase });
    }
  }

  if (!runtime.includes('depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"])')) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G6 runtime evidence must preserve G1/G2 dependencies.");
  }

  if (!runtime.includes('feeds_runtime_gate: Object.freeze(["CMP-G4-W04"])')) {
    addFinding(findings, "MATTER_FEED_GATE", "CMP-G6 must explicitly feed the CMP-G4 Matter opening gate.");
  }

  for (const phrase of ["Opportunity-to-Matter bypass", "Intake/Conflict/Engagement gate tests", "CRM/Intake clearance", "conflict memo"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G6 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G6 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G6 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g6:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g6:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G6 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G6 runtime validation passed.");
console.log("cmp_g6_tuws: 22/22");
console.log("runtime_routes: crm-intake lead/opportunity/activity/intake/conflict/engagement/clearance/ui/audit");
console.log("behavior_tests: opportunity-to-intake-only/conflict-source-coverage/engagement-clearance/ui-leak-guards");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
