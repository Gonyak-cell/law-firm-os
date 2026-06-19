#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/trust-foundation-runtime.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g1-trust-foundation-api.test.js",
  "packages/authz/src/trust-context.js",
  "docs/reorganization/client-matter-os/cmp-v1/03-cmp-g1-trust-foundation-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/permissions/evaluate",
  "/admin/permission-simulator",
  "/permissions/contexts",
  "/admin/policies",
  "/object-acl",
  "/admin/ethical-walls",
  "/admin/legal-holds",
  "/audit/sensitive-read",
  "/audit/events/export",
  "/audit/verify",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "denies over allow",
  "cross-tenant access",
  "stores policies",
  "tenant scoped during evaluation",
  "object ACLs",
  "service principal actors",
  "ethical walls and legal holds",
  "break-glass requires reason",
  "records sensitive reads",
  "verifies tenant-scoped audit chain",
]);

const CMP_G1_TUWS = Object.freeze(
  Array.from({ length: 24 }, (_, index) => `CMP-G1-W01-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G1 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/trust-foundation-runtime.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g1-trust-foundation-api.test.js");
  const trustContext = await readText("packages/authz/src/trust-context.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/03-cmp-g1-trust-foundation-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G1_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G1 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G1 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G1 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G1 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G1 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G1 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of [
    "createTrustFoundationRuntime",
    "handleTrustFoundationApiRequest",
    "TRUST_FOUNDATION_BOUNDED_CONTEXT",
    "isTrustFoundationPath",
    "appendDecisionAudit",
    "recordSensitiveRead",
  ]) {
    if (!runtime.includes(phrase)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G1 runtime source missing required marker.", { phrase });
    }
  }

  for (const phrase of [
    "TRUST_FOUNDATION_BOUNDED_CONTEXT",
    "TRUST_FOUNDATION_RUNTIME",
    "isTrustFoundationPath",
    "handleTrustFoundationApiRequest",
  ]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G1 runtime.", { phrase });
    }
  }

  if (!trustContext.includes('"service_principal"')) {
    addFinding(findings, "SERVICE_PRINCIPAL_ACTOR", "CMP-G1 actor taxonomy must allow service_principal actors.");
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G1 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G1 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g1:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g1:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G1 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G1 runtime validation passed.");
console.log("cmp_g1_tuws: 24/24");
console.log("runtime_routes: permissions/admin/audit");
console.log("behavior_tests: allow/deny/cross-tenant/policy/acl/wall/hold/break-glass/audit");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
