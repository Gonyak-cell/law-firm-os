#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/party-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g2-party-master-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/04-cmp-g2-party-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/party-master/records",
  "/party-master/parties",
  "/party-master/entities",
  "/party-master/people",
  "/party-master/organizations",
  "/party-master/aliases",
  "/party-master/identifiers",
  "/party-master/client-groups",
  "/party-master/relationships",
  "/party-master/contact-points",
  "/party-master/billing-profiles",
  "/party-master/duplicates/search",
  "/party-master/merge-split",
  "/party-master/audit/events",
  "/party-master/audit/verify",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "fails closed without a G1 permission allow",
  "creates, lists, reads, and updates Party records",
  "aliases and identifiers",
  "without crossing tenant scope",
  "client groups, relationships, contacts, and billing profile",
  "duplicate search and merge-split",
  "audit export and verify remain tenant scoped and permission gated",
]);

const CMP_G2_TUWS = Object.freeze(
  Array.from({ length: 19 }, (_, index) => `CMP-G2-W02-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G2 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/party-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g2-party-master-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/04-cmp-g2-party-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G2_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G2 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G2 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G2 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G2 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G2 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G2 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of [
    "createPartyMasterRuntimeContext",
    "handlePartyMasterApiRequest",
    "PARTY_MASTER_BOUNDED_CONTEXT",
    "isPartyMasterPath",
    "evaluatePermissionControlRequest",
    "appendPartyAudit",
    "validateMasterDataRecord",
    "createMasterDataDuplicateCandidateQueue",
    "createMasterDataPartyMergeSplitWorkflowDescriptor",
  ]) {
    if (!runtime.includes(phrase)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G2 runtime source missing required marker.", { phrase });
    }
  }

  for (const phrase of [
    "PARTY_MASTER_BOUNDED_CONTEXT",
    "PARTY_MASTER_RUNTIME",
    "isPartyMasterPath",
    "handlePartyMasterApiRequest",
  ]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G2 runtime.", { phrase });
    }
  }

  if (!runtime.includes('depends_on: "CMP-G1-W01"') || !report.includes("CMP-G1-W01")) {
    addFinding(findings, "G1_DEPENDENCY", "CMP-G2 runtime evidence must preserve the G1 dependency boundary.");
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G2 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G2 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g2:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g2:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G2 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G2 runtime validation passed.");
console.log("cmp_g2_tuws: 19/19");
console.log("runtime_routes: party-master records/parties/groups/relationships/contact/billing/duplicates/merge/audit");
console.log("behavior_tests: permission-gated/tenant-scoped/write-read-update/duplicate/merge/audit");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
