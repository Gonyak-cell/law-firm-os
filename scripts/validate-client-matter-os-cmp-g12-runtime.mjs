#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/enterprise-readiness-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g12-enterprise-readiness-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/14-cmp-g12-enterprise-readiness-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/enterprise-readiness/runtime/evidence",
  "/admin/tenant-settings",
  "/admin/sso",
  "/admin/scim",
  "/admin/mfa",
  "/ops/metrics",
  "/ops/latency",
  "/ops/incidents",
  "/ops/deployments",
  "/ops/rollback-plans",
  "/ops/drills/backup-restore",
  "/ops/performance-smoke",
  "/ops/security-regression",
  "/ops/permission-negative",
  "/migration/batches",
  "/migration/validate/party",
  "/migration/vault/dry-run",
  "/migration/finance/reconcile",
  "/admin/connectors",
  "/admin/credentials",
  "/integrations/accounting/export",
  "/ops/compliance/evidence-pack",
  "/ops/compliance/control-map",
  "/uat/scenarios",
  "/uat/feedback",
  "/ops/release-candidates",
  "/ops/go-no-go",
  "/ops/production-readiness",
  "/ops/enterprise-closeout",
  "/api/enterprise-readiness/secret-exposure-test",
  "/api/enterprise-readiness/persistence-write-test",
  "/api/enterprise-readiness/go-live-claim-test",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G12_TUW_IDS",
  "ENTERPRISE_READINESS_BOUNDED_CONTEXT",
  "createEnterpriseReadinessRuntimeContext",
  "createEnterpriseReadinessRuntimeEvidence",
  "handleEnterpriseReadinessApiRequest",
  "requireNoForbiddenRuntimeClaim",
  "migration_dry_run_vs_cutover_separation",
  "credential_reference_no_secret_exposure",
  "human_review_before_accounting_export_release_go_no_go",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes enterprise readiness after G11",
  "runtime evidence covers all enterprise readiness TUWs and guardrails",
  "admin IAM observability and operations routes require API context",
  "migration and integration routes preserve dry-run, human-review, and no-secret boundaries",
  "compliance UAT release launch and closeout routes block premature production claims",
  "negative routes block secret exposure persistence writes external calls and R4 claims",
]);

const CMP_G12_TUWS = Object.freeze(
  Array.from({ length: 28 }, (_, index) => `CMP-G12-W12-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G12 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/enterprise-readiness-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g12-enterprise-readiness-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/14-cmp-g12-enterprise-readiness-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G12_TUWS) {
    if (!runtime.includes(tuwId)) addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G12 TUW.", { tuwId });
    if (!report.includes(tuwId)) addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G12 TUW.", { tuwId });
    if (!crosswalk.includes(tuwId)) addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G12 TUW.", { tuwId });
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G12 runtime missing required route.", { route });
    if (!report.includes(route)) addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G12 report missing required route.", { route });
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G12 runtime source missing required marker.", { marker });
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) addFinding(findings, "MISSING_TEST_MARKER", "CMP-G12 API test missing required behavior marker.", { marker });
  }

  for (const phrase of ["ENTERPRISE_READINESS_BOUNDED_CONTEXT", "ENTERPRISE_READINESS_RUNTIME", "isEnterpriseReadinessPath", "handleEnterpriseReadinessApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G12 runtime.", { phrase });
    }
  }

  for (const phrase of ["CMP-G11-W11", "CMP-G10-W10", "CMP-G1-W01"]) {
    if (!runtime.includes(phrase) || !report.includes(phrase)) {
      addFinding(findings, "DEPENDENCY_ORDER", "CMP-G12 must depend on G1-G11 evidence.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G12 runtime evidence must not claim R4 before durable persistence.", { claim });
    }
  }

  if (!pkg.scripts?.["client-matter:cmp-g12:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g12:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G12 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G12 runtime validation passed.");
console.log("cmp_g12_tuws: 28/28");
console.log("runtime_routes: enterprise readiness admin/iam/ops/migration/integration/compliance/uat/release/launch");
console.log("behavior_tests: no-secret/no-write/no-external-call/migration-dry-run/human-review/no-r4");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
